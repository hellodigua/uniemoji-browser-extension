(() => {
  const api = globalThis.UniEmoji;
  const excluded = 'pre,code,kbd,samp,script,style,textarea,input,button,a,svg,math,[contenteditable]:not([contenteditable="false"]),[data-uniemoji],[data-uniemoji-layer]';
  const selectors = {
    'chat.deepseek.com': '.ds-assistant-message-main-content',
    'gemini.google.com': 'model-response-content message-content .markdown',
  };
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const byEmoji = new Map(api.catalog.map(item => [item.emoji, item]));
  byEmoji.set('😄', byEmoji.get('😆'));
  byEmoji.set('🙂', byEmoji.get('😊'));
  api.selectorFor = host => selectors[host] || null;
  api.normalizeSettings = (value = {}) => ({
    enabled: value.enabled !== false,
    size: [24, 32, 40].includes(value.size) ? value.size : 32,
  });
  // Share load results across replies; a failed image leaves the glyph visible.
  const imageCaches = new WeakMap();
  function getAsset(document, url) {
    let cache = imageCaches.get(document);
    if (!cache) { cache = new Map(); imageCaches.set(document, cache); }
    if (cache.has(url)) return cache.get(url);
    const image = new document.defaultView.Image();
    const asset = {image, state: 'loading', listeners: new Set()};
    cache.set(url, asset);
    function finish(success) {
      if (asset.state !== 'loading') return;
      asset.state = success && image.naturalWidth > 0 ? 'ready' : 'failed';
      image.onload = image.onerror = null;
      const listeners = [...asset.listeners];
      asset.listeners.clear();
      for (const listener of listeners) listener();
    }
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = url;
    if (image.complete) finish(image.naturalWidth > 0);
    return asset;
  }
  api.preloadImages = (document, assetURL) => {
    for (const item of api.catalog) getAsset(document, assetURL(item.file));
  };
  // One registry per document; each reply removes only its own ranges.
  const registries = new WeakMap();
  api.createRenderer = (document, assetURL) => {
    const view = document.defaultView;
    if (!view.CSS?.highlights || !view.Highlight) {
      return {render() {}, restore() {}, reposition() {}};
    }
    let highlight = registries.get(document);
    if (!highlight) {
      highlight = new view.Highlight();
      registries.set(document, highlight);
      view.CSS.highlights.set('uniemoji-replaced', highlight);
    }
    const records = new Map();
    const layers = new Map();
    function findAnchor(node) {
      for (let element = node.parentElement; element; element = element.parentElement) {
        const style = view.getComputedStyle(element);
        // Use an existing containing block inside the same clipping/scrolling
        // boundary. Never change host styles to manufacture one.
        if ((style.position && style.position !== 'static') ||
            (style.transform && style.transform !== 'none') ||
            (style.perspective && style.perspective !== 'none') ||
            /layout|paint|strict|content/.test(style.contain)) return element;
        if (/(auto|scroll|hidden|clip)/.test(`${style.overflow} ${style.overflowX} ${style.overflowY}`)) return null;
      }
      return null;
    }
    function acquireLayer(anchor) {
      let layer = layers.get(anchor);
      if (!layer) {
        const element = document.createElement('span');
        element.dataset.uniemojiLayer = '';
        element.setAttribute('aria-hidden', 'true');
        anchor.append(element);
        layer = {anchor, element, users: 0};
        layers.set(anchor, layer);
      }
      layer.users++;
      return layer;
    }
    function releaseLayer(layer) {
      if (--layer.users === 0) {
        layer.element.remove();
        layers.delete(layer.anchor);
      }
    }
    let size = 32;
    function clear(record) {
      for (const {range, image, asset, onReady} of record.entries) {
        asset.listeners.delete(onReady);
        highlight.delete(range);
        image.remove();
      }
      releaseLayer(record.layer);
      records.delete(record.node);
    }
    function restore() {
      for (const record of records.values()) clear(record);
    }
    function reposition() {
      for (const record of records.values()) {
        const parent = record.node.parentElement;
        if (!record.node.isConnected || record.node.data !== record.text || parent?.closest(excluded)) {
          clear(record);
          continue;
        }
        const anchor = findAnchor(record.node);
        if (!anchor) { clear(record); continue; }
        if (record.layer.anchor !== anchor) {
          const previous = record.layer;
          record.layer = acquireLayer(anchor);
          for (const {image} of record.entries) record.layer.element.append(image);
          releaseLayer(previous);
        }
        if (record.layer.element.parentElement !== anchor) anchor.append(record.layer.element);
        // The 1px layer measures the local origin and axis-aligned scale,
        // including borders, container scroll offsets and ancestor transforms.
        const origin = record.layer.element.getBoundingClientRect();
        for (const {range, image, asset} of record.entries) {
          highlight.delete(range);
          image.hidden = true;
          if (asset.state !== 'ready') continue;
          const rect = range.getClientRects()[0];
          if (!rect || !rect.width || !rect.height) continue;
          if (!origin.width || !origin.height) continue;
          const width = rect.width / origin.width, height = rect.height / origin.height;
          const side = Math.min(size, width, height);
          image.style.left = `${(rect.left - origin.left) / origin.width + (width - side) / 2}px`;
          image.style.top = `${(rect.top - origin.top) / origin.height + (height - side) / 2}px`;
          image.style.width = `${side}px`;
          image.style.height = `${side}px`;
          image.hidden = false;
          highlight.add(range);
        }
      }
    }
    function render(roots, requestedSize = 32) {
      size = requestedSize;
      for (const record of records.values()) {
        if (!record.node.isConnected || !roots.some(root => root.contains(record.node)) || record.node.parentElement?.closest(excluded) || record.node.data !== record.text) clear(record);
      }
      for (const root of roots) {
        const walker = document.createTreeWalker(root, 4);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (records.has(node) || node.parentElement.closest(excluded)) continue;
          const anchor = findAnchor(node);
          if (!anchor) continue;
          let layer;
          const entries = [];
          for (const {segment, index} of segmenter.segment(node.data)) {
            const item = byEmoji.get(segment);
            if (!item) continue;
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + segment.length);
            const image = document.createElement('span');
            image.dataset.uniemoji = item.key;
            image.setAttribute('aria-hidden', 'true');
            image.hidden = true;
            const url = assetURL(item.file);
            const asset = getAsset(document, url);
            const onReady = () => reposition();
            if (asset.state === 'loading') asset.listeners.add(onReady);
            image.style.backgroundImage = `url("${url}")`;
            // Decoration-only children: the host Text node stays in place.
            layer ||= acquireLayer(anchor);
            layer.element.append(image);
            entries.push({range, image, asset, onReady});
          }
          if (entries.length) records.set(node, {node, text: node.data, entries, layer});
        }
      }
      reposition();
    }
    return {render, restore, reposition};
  };
})();
