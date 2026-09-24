(() => {
  const api = globalThis.UniEmoji;
  const selector = api.selectorFor(location.hostname);
  if (!selector) return;
  // Each reply owns its renderer so updating one reply cannot restore others.
  const renderers = new Map();
  const assetURL = file => chrome.runtime.getURL(`assets/whale/${file}`);
  let settings = api.normalizeSettings();
  let disposed = false;
  const observe = () => observer.observe(document.body, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'contenteditable', 'style', 'hidden']});
  // MutationObserver runs at the microtask checkpoint, before the next paint.
  // A timeout lets the host's raw emoji be painted between streaming chunks.
  const observer = new MutationObserver(refreshChanges);
  // Rendering uses these same load results; warming alone is not readiness.
  api.preloadImages(document, assetURL);
  let layoutFrame = 0;
  function repositionAll() {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = 0;
    if (disposed || !settings.enabled) return;
    for (const renderer of renderers.values()) renderer.reposition();
  }
  function scheduleLayout() {
    if (disposed || layoutFrame || !settings.enabled) return;
    layoutFrame = requestAnimationFrame(repositionAll);
  }
  // ResizeObserver runs after layout, before paint. Do not defer a size change
  // another frame: following replies may share the changed reply's anchor.
  const resizeObserver = new ResizeObserver(repositionAll);
  window.addEventListener('resize', scheduleLayout);
  document.addEventListener('load', scheduleLayout, true);
  function collect(node, roots) {
    const element = node.nodeType === 1 ? node : node.parentElement;
    if (!element?.isConnected) return;
    const closest = element.closest(selector);
    if (closest) roots.add(closest);
    if (node.nodeType === 1) {
      for (const root of element.querySelectorAll(selector)) roots.add(root);
    }
  }
  function update(roots) {
    if (disposed) return;
    observer.disconnect();
    try {
      for (const root of roots) {
        if (!root.isConnected || !root.matches(selector)) continue;
        let renderer = renderers.get(root);
        if (!renderer) {
          renderer = api.createRenderer(document, assetURL);
          renderers.set(root, renderer);
          resizeObserver.observe(root);
        }
        renderer.render([root], settings.size);
      }
    } finally {
      observe();
    }
  }
  function refreshChanges(mutations) {
    if (disposed || !settings.enabled) return;
    // Async image loads and layout callbacks touch only our decorations.
    // Ignore those mutations instead of feeding them back into rendering.
    mutations = mutations.filter(mutation => {
      const element = mutation.target.nodeType === 1 ? mutation.target : mutation.target.parentElement;
      if (element?.closest('[data-uniemoji-layer]')) return false;
      const added = [...mutation.addedNodes];
      return mutation.type !== 'childList' || mutation.removedNodes.length || !added.length ||
        added.some(node => node.nodeType !== 1 || !node.matches('[data-uniemoji-layer]'));
    });
    if (!mutations.length) return;
    const roots = new Set();
    for (const mutation of mutations) {
      // Text updates only dirty their containing reply, never its siblings.
      if (mutation.type === 'characterData') collect(mutation.target, roots);
      else if (mutation.type === 'attributes') collect(mutation.target, roots);
      else {
        const root = mutation.target.closest?.(selector);
        if (root) roots.add(root);
        for (const node of mutation.addedNodes) collect(node, roots);
        // A host redraw may remove our layer while keeping the reply itself.
        if ([...mutation.removedNodes].some(node => node.nodeType === 1 && node.matches('[data-uniemoji-layer]'))) collect(mutation.target, roots);
      }
    }
    observer.disconnect();
    try {
      // Structural/class changes can remove a reply or make it stop matching.
      // This checks root identities only; historical text is not traversed.
      if (mutations.some(mutation => mutation.type !== 'characterData')) {
        for (const [root, renderer] of renderers) {
          if (!root.isConnected || !root.matches(selector)) {
            renderer.restore();
            renderers.delete(root);
            resizeObserver.unobserve(root);
          }
        }
      }
      update(roots);
      // render() already positions changed replies. Streaming text/replacement
      // inside a reply must not also measure every historical emoji. If its
      // size changes, ResizeObserver handles any affected following replies.
      // Host attributes or mutations outside replies can change shared layout
      // without resizing a reply (for example padding on a shared anchor).
      const sharedLayoutChanged = mutations.some(mutation => {
        const element = mutation.target.nodeType === 1 ? mutation.target : mutation.target.parentElement;
        return mutation.type === 'attributes' || !element?.closest(selector);
      });
      if (sharedLayoutChanged) scheduleLayout();
    } finally {
      observe();
    }
  }
  function refresh() {
    if (disposed) return;
    observer.disconnect();
    for (const renderer of renderers.values()) renderer.restore();
    renderers.clear();
    resizeObserver.disconnect();
    if (settings.enabled) update(new Set(document.querySelectorAll(selector)));
    else observe();
  }
  function dispose() {
    disposed = true;
    cancelAnimationFrame(layoutFrame);
    window.removeEventListener('resize', scheduleLayout);
    document.removeEventListener('load', scheduleLayout, true);
    observer.disconnect();
    for (const renderer of renderers.values()) renderer.restore();
    renderers.clear();
    resizeObserver.disconnect();
  }
  // No network access, transcript storage, prompt injection or clipboard writes.
  chrome.storage.local.get('settings').then(result => {
    settings = api.normalizeSettings(result.settings);
    refresh();
  }).catch(dispose);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
      settings = api.normalizeSettings(changes.settings.newValue);
      refresh();
    }
  });
})();
