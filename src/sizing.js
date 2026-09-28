(() => {
  const api = globalThis.UniEmoji;
  const segmenter = new Intl.Segmenter(undefined, {granularity: 'grapheme'});
  const known = new Set([...api.catalog.map(item => item.emoji), '😄', '🙂']);
  const codepoints = new Set([...known].flatMap(emoji => [...emoji].map(char => char.codePointAt(0))));
  const caches = new WeakMap();
  let nextID = 0;
  const attribute = 'data-uniemoji-sizing';
  // Use the installed emoji font only for supported code points. Ordinary text
  // retains its font and size, and original Text nodes never need to be split.
  api.createSizing = (document, changed) => {
    const view = document.defaultView;
    if (!view.FontFace || !document.fonts || !view.CSSStyleSheet?.prototype.replaceSync || !document.adoptedStyleSheets) {
      return {update() {}, restore() {}, has: () => false};
    }
    let cache = caches.get(document);
    if (!cache) { cache = new Map(); caches.set(document, cache); }
    const sheet = new view.CSSStyleSheet();
    let attached = false;
    const tagged = new Map();
    let targets = new Map();
    let currentSize;
    function release(face) {
      const count = face.listeners.get(changed) - 1;
      if (count) face.listeners.set(changed, count);
      else face.listeners.delete(changed);
      if (--face.users === 0) {
        document.fonts.delete(face.font);
        cache.delete(face.key);
      }
    }
    function acquire(key, range, ratio) {
      let face = cache.get(key);
      if (!face) {
        const name = `UniEmojiSize${++nextID}`;
        const font = new view.FontFace(name,
          'local("Apple Color Emoji"), local("Segoe UI Emoji"), local("Noto Color Emoji"), local("NotoColorEmoji")',
          {unicodeRange: range, sizeAdjust: `${ratio}%`});
        face = {key, name, font, users: 0, listeners: new Map()};
        cache.set(key, face);
        document.fonts.add(font);
        font.load().then(() => {
          for (const listener of [...face.listeners.keys()]) listener();
        }, () => { /* Missing local font: keep the original glyph-sized fallback. */ });
      }
      face.users++;
      face.listeners.set(changed, (face.listeners.get(changed) || 0) + 1);
      return face;
    }
    function untag() {
      for (const [element, {id, previous}] of tagged) {
        if (element.getAttribute(attribute) !== id) continue;
        if (previous === null) element.removeAttribute(attribute);
        else element.setAttribute(attribute, previous);
      }
      tagged.clear();
    }
    function restore() {
      sheet.replaceSync('');
      if (attached) document.adoptedStyleSheets = document.adoptedStyleSheets.filter(value => value !== sheet);
      attached = false;
      untag();
      for (const target of targets.values()) release(target.face);
      targets.clear();
    }
    function update(records, size, force = false) {
      const parents = new Set([...records].map(record => record.node.parentElement));
      if (!force && size === currentSize && parents.size === targets.size &&
          [...parents].every(parent => targets.has(parent) && view.getComputedStyle(parent).fontSize === targets.get(parent).fontSize && targets.get(parent).status === targets.get(parent).face.font.status)) return;
      // Temporarily remove only our rules to read current host typography. This
      // also picks up class/theme changes without overwriting the host's styles.
      sheet.disabled = true;
      const native = new Map();
      for (const parent of parents) {
        for (const element of [parent, ...parent.children]) {
          if (element.hasAttribute('data-uniemoji-layer') || native.has(element)) continue;
          const style = view.getComputedStyle(element);
          native.set(element, {family: style.fontFamily, line: style.lineHeight, fontSize: style.fontSize});
        }
      }
      const next = new Map();
      for (const parent of parents) {
        const style = native.get(parent);
        const px = parseFloat(style.fontSize);
        if (!px) continue;
        // A font works by code point, not grapheme. If an unsupported sequence
        // shares a code point (e.g. 👍🏽), leave that code point's font untouched.
        const safe = new Set(codepoints);
        for (const node of parent.childNodes) {
          if (node.nodeType !== 3) continue;
          for (const {segment} of segmenter.segment(node.data)) {
            if (!known.has(segment)) for (const char of segment) safe.delete(char.codePointAt(0));
          }
        }
        const range = [...safe].map(point => `U+${point.toString(16)}`).join(',');
        if (!range) continue;
        const ratio = size / px * 100;
        const key = `${ratio}:${range}`;
        const previous = targets.get(parent);
        const face = previous?.face.key === key ? previous.face : acquire(key, range, ratio);
        next.set(parent, {...style, safe, face, status: face.font.status});
      }
      for (const [parent, target] of targets) if (next.get(parent)?.face !== target.face) release(target.face);
      targets = next;
      untag();
      const rules = [];
      for (const [element, style] of native) {
        const candidate = targets.get(element);
        const target = candidate?.status === 'loaded' ? candidate : null;
        // Direct children reset inheritance, so links/code and other excluded
        // descendants do not acquire the parent's emoji font or line spacing.
        const id = String(++nextID);
        tagged.set(element, {id, previous: element.getAttribute(attribute)});
        element.setAttribute(attribute, id);
        const family = target ? `"${target.face.name}", ${style.family || 'sans-serif'}` : style.family;
        const line = target ? `${Math.max(parseFloat(style.line) || parseFloat(style.fontSize) * 1.2, size + 4)}px` : style.line;
        rules.push(`[${attribute}="${id}"] {font-family:${family} !important;line-height:${line} !important;}`);
      }
      sheet.replaceSync(rules.join('\n'));
      sheet.disabled = false;
      if (!attached && rules.length) {
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
        attached = true;
      }
      currentSize = size;
    }
    function has(node, emoji) {
      const target = targets.get(node.parentElement);
      return target?.face.font.status === 'loaded' && [...emoji].every(char => target.safe.has(char.codePointAt(0)));
    }
    return {update, restore, has};
  };
})();
