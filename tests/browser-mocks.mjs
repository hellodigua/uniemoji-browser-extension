// jsdom has no layout or Custom Highlight API. Model these explicitly;
// browser visual checks are still required for actual painting/positioning.
export function mockBrowser(window) {
  // Default to an already loaded local image; loading tests override this.
  window.Image = class { complete = true; naturalWidth = 128; };
  window.CSS = {highlights: new Map()};
  window.Highlight = class extends Set {};
  window.document.body.style.position = 'relative';
  const nativeBounds = window.Element.prototype.getBoundingClientRect;
  window.Element.prototype.getBoundingClientRect = function () {
    return this.hasAttribute('data-uniemoji-layer')
      ? {left:0, top:0, width:1, height:1} : nativeBounds.call(this);
  };
  let parent;
  window.Range.prototype.getClientRects = function () {
    parent = this.startContainer.parentElement;
    return [{left:10, top:10, width:48, height:48}];
  };
  window.document.elementFromPoint = () => parent;
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}
