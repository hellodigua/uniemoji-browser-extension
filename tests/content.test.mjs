import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mockBrowser} from './browser-mocks.mjs';

async function setup(t, host, markup) {
  const dom = new JSDOM(markup, {url: `https://${host}/`, runScripts: 'outside-only', pretendToBeVisual:true});
  const {window} = dom;
  mockBrowser(window);
  let resizeCallback;
  window.ResizeObserver = class {
    constructor(callback) { resizeCallback = callback; }
    observe() {} unobserve() {} disconnect() {}
  };
  const observers = [];
  const NativeObserver = window.MutationObserver;
  window.MutationObserver = class extends NativeObserver {
    constructor(callback) { super(callback); observers.push(this); }
  };
  t.after(() => {
    observers.forEach(observer => observer.disconnect());
    dom.window.close();
  });
  let onSettings;
  window.chrome = {
    runtime: {getURL: file => `chrome-extension://test/${file}`},
    storage: {
      local: {get: async () => ({settings: {enabled: true, size: 32}})},
      onChanged: {addListener: callback => { onSettings = callback; }},
    },
  };
  const scans = [];
  const positions = [];
  for (const file of ['catalog.js', 'engine.js', 'content.js']) {
    if (file === 'content.js') {
      const createRenderer = window.UniEmoji.createRenderer;
      window.UniEmoji.createRenderer = (...args) => {
        const renderer = createRenderer(...args);
        const reposition = renderer.reposition;
        renderer.reposition = () => { positions.push(true); return reposition(); };
        const render = renderer.render;
        renderer.render = (roots, size) => { scans.push(...roots); return render(roots, size); };
        return renderer;
      };
    }
    window.eval(readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8'));
  }
  await new Promise(resolve => queueMicrotask(resolve));
  return {window, scans, positions, notifyResize: () => resizeCallback([]), setSettings: settings => onSettings({settings: {newValue: settings}}, 'local')};
}

for (const [host, markup, selector] of [
  ['chat.deepseek.com', '<div class="ds-assistant-message-main-content"><p>开始😊</p></div>', '.ds-assistant-message-main-content'],
  ['gemini.google.com', '<model-response-content><message-content><div class="markdown"><p>开始😊</p></div></message-content></model-response-content>', '.markdown'],
]) {
  test(`${host} 流式覆写和重绘在微任务结束前替换，无延时闪回`, async t => {
    const {window, setSettings} = await setup(t, host, markup);
    const root = window.document.querySelector(selector);
    const p = root.querySelector('p');
    const source = p.firstChild;
    assert.equal(window.document.querySelectorAll('[data-uniemoji]').length, 1);
    for (const text of ['开始😊继续', '开始😊继续加油💪', '开始😊继续加油💪结束😂']) {
      source.data = text;
      // Do not advance timers: the content script must finish in this microtask
      // checkpoint, before a browser is allowed to paint the raw host update.
      await new Promise(resolve => queueMicrotask(resolve));
      assert.equal(root.textContent, text);
      assert.equal(window.document.querySelectorAll('[data-uniemoji]').length, [...text.matchAll(/[😊💪😂]/gu)].length);
    }
    source.appendData('追加😊');
    await new Promise(resolve => queueMicrotask(resolve));
    assert.equal(source.data, '开始😊继续加油💪结束😂追加😊');
    source.data += '继续💪';
    await new Promise(resolve => queueMicrotask(resolve));
    assert.equal(root.textContent, '开始😊继续加油💪结束😂追加😊继续💪');
    assert.equal(root.querySelector('p').childNodes.length, 1);
    root.innerHTML = '<p>重新生成😂</p>';
    await new Promise(resolve => queueMicrotask(resolve));
    assert.equal(window.document.querySelectorAll('[data-uniemoji]').length, 1);
    setSettings({enabled:false, size:32});
    assert.equal(root.textContent, '重新生成😂');
    assert.equal(window.document.querySelectorAll('[data-uniemoji]').length, 0);
    root.querySelector('p').firstChild.data='关闭时😊';
    await new Promise(resolve => queueMicrotask(resolve));
    assert.equal(window.document.querySelectorAll('[data-uniemoji]').length, 0);
    setSettings({enabled:true, size:40});
    assert.equal(window.document.querySelector('[data-uniemoji]').style.width, '40px');
  });
}

for (const host of ['chat.deepseek.com', 'gemini.google.com']) {
  test(`${host} 只扫描变动回复，支持新增、移除和祖先属性变化`, async t => {
    const wrap = text => host === 'chat.deepseek.com'
      ? `<div class="ds-assistant-message-main-content"><p>${text}</p></div>`
      : `<model-response-content><message-content><div class="markdown"><p>${text}</p></div></message-content></model-response-content>`;
    const markup = `<aside>侧栏</aside><main>${Array.from({length:50}, (_, i) => wrap(`历史${i}😊`)).join('')}</main>`;
    const {window, scans} = await setup(t, host, markup);
    const document = window.document;
    const selector = window.UniEmoji.selectorFor(host);
    const roots = [...document.querySelectorAll(selector)];
    const firstDecoration = document.querySelector('[data-uniemoji]');
    scans.length = 0;
    document.querySelector('aside').className = 'opened';
    await new Promise(resolve => queueMicrotask(resolve));
    assert.equal(scans.length, 0);
    roots[49].querySelector('p').firstChild.data = '历史49😊追加💪';
    await new Promise(resolve => queueMicrotask(resolve));
    assert.deepEqual(scans, [roots[49]]);
    assert.equal(document.querySelector('[data-uniemoji]'), firstDecoration);
    assert.equal(roots[49].textContent, '历史49😊追加💪');
    scans.length = 0;
    document.querySelector('main').insertAdjacentHTML('beforeend', wrap('新回复😂'));
    await new Promise(resolve => queueMicrotask(resolve));
    const added = [...document.querySelectorAll(selector)].at(-1);
    assert.deepEqual(scans, [added]);
    assert.equal(document.querySelectorAll('[data-uniemoji]').length, 52);
    roots[0].remove();
    await new Promise(resolve => queueMicrotask(resolve));
    assert.equal(roots[0].textContent, '历史0😊');
    assert.equal(roots[0].querySelectorAll('[data-uniemoji]').length, 0);
    document.querySelector('main').setAttribute('contenteditable', 'true');
    await new Promise(resolve => queueMicrotask(resolve));
    assert.equal(document.querySelectorAll('[data-uniemoji]').length, 0);
    document.querySelector('main').removeAttribute('contenteditable');
    await new Promise(resolve => queueMicrotask(resolve));
    assert.equal(document.querySelectorAll('[data-uniemoji]').length, 51);
  });
}

test('滚动不触发重新定位，装饰样式变化不会形成观察回路',async t=>{
 const {window,scans,positions}=await setup(t,'chat.deepseek.com','<section style="overflow:auto;position:relative"><div class="ds-assistant-message-main-content"><p>你好😊</p></div></section>');
 const frame=()=>new Promise(resolve=>window.requestAnimationFrame(resolve));
 await frame();
 scans.length=0;positions.length=0;
 window.document.querySelector('section').dispatchEvent(new window.Event('scroll',{bubbles:true}));
 window.dispatchEvent(new window.Event('scroll'));
 window.document.querySelector('[data-uniemoji]').style.top='100px';
 await frame();await frame();
 assert.equal(scans.length,0);
 assert.equal(positions.length,0);
});

test('宿主单独移除覆盖层后，观察器恢复图片且不改写正文',async t=>{
 const {window}=await setup(t,'chat.deepseek.com','<article style="position:relative"><div class="ds-assistant-message-main-content"><p>你好😊</p></div></article>');
 const source=window.document.querySelector('p').firstChild;
 window.document.querySelector('[data-uniemoji-layer]').remove();
 await new Promise(resolve=>queueMicrotask(resolve));
 assert.equal(window.document.querySelectorAll('[data-uniemoji-layer]').length,1);
 assert.equal(window.document.querySelector('[data-uniemoji]').hidden,false);
 assert.equal(source.data,'你好😊');
});

for (const host of ['chat.deepseek.com', 'gemini.google.com']) {
  test(`${host} 流式更新不重定位历史回复，共享布局变化仍全量重定位`, async t => {
    const wrap = text => host === 'chat.deepseek.com'
      ? `<div class="ds-assistant-message-main-content"><p>${text}</p></div>`
      : `<model-response-content><message-content><div class="markdown"><p>${text}</p></div></message-content></model-response-content>`;
    const {window, scans, positions, notifyResize} = await setup(t, host,
      `<main>${Array.from({length: 50}, (_, i) => wrap(`历史${i}😊`)).join('')}</main>`);
    const frame = () => new Promise(resolve => window.requestAnimationFrame(resolve));
    await frame(); await frame();
    const roots = [...window.document.querySelectorAll(window.UniEmoji.selectorFor(host))];
    const current = roots.at(-1);
    let geometryReads = 0;
    const getRects = window.Range.prototype.getClientRects;
    window.Range.prototype.getClientRects = function () {
      geometryReads++;
      return getRects.call(this);
    };
    for (const change of [
      () => current.querySelector('p').firstChild.appendData('继续'),
      () => { current.querySelector('p').textContent = '覆盖😊'; },
      () => { current.innerHTML = '<p>重绘😊</p>'; },
    ]) {
      scans.length = 0; positions.length = 0; geometryReads = 0;
      change();
      await frame(); await frame();
      assert.deepEqual(scans, [current]);
      assert.equal(positions.length, 0);
      assert.equal(geometryReads, 1);
      assert.equal(window.document.querySelectorAll('[data-uniemoji]:not([hidden])').length, 50);
    }
    // A shared anchor can move glyphs without changing reply dimensions.
    positions.length = 0;
    window.document.querySelector('main').style.paddingTop = '20px';
    await frame(); await frame();
    assert.equal(positions.length, 50);
    // A size change must align shared anchors before the next paint, and
    // supersede an already queued global layout rather than run it twice.
    positions.length = 0;
    window.dispatchEvent(new window.Event('resize'));
    notifyResize();
    assert.equal(positions.length, 50);
    await frame();
    assert.equal(positions.length, 50);
    // Keep the global viewport fallback as well.
    positions.length = 0;
    window.dispatchEvent(new window.Event('resize'));
    await frame();
    assert.equal(positions.length, 50);
  });
}
