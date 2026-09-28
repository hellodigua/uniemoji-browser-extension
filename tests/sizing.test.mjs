import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

function setup(t, markup, pending = false) {
  const dom = new JSDOM(`<style>body,p,code,a,strong{font-size:20px;line-height:28px;font-family:sans-serif}code{font-family:monospace}</style>${markup}`, {runScripts:'outside-only'});
  t.after(() => dom.window.close());
  const {window} = dom, {document} = window;
  const created = [];
  window.FontFace = class {
    constructor(name, source, descriptors) {
      Object.assign(this, {name, source, descriptors, status: pending ? 'loading' : 'loaded'});
      this.promise = pending ? new Promise(resolve => { this.finish = () => {this.status='loaded';resolve(this);}; }) : Promise.resolve(this);
      created.push(this);
    }
    load() { return this.promise; }
  };
  Object.defineProperty(document, 'fonts', {value: new Set()});
  // jsdom lacks adopted stylesheets; attach equivalent style nodes in <head>.
  window.CSSStyleSheet = class {
    style = document.createElement('style');
    text = '';
    _disabled = false;
    replaceSync(text) { this.text=text;this.paint(); }
    get disabled() { return this._disabled; }
    set disabled(value) { this._disabled=value;this.paint(); }
    paint() { this.style.textContent=this.disabled ? '' : this.text; }
  };
  let sheets = [];
  Object.defineProperty(document, 'adoptedStyleSheets', {
    get: () => sheets,
    set: next => { for(const sheet of sheets) sheet.style.remove();sheets=next;for(const sheet of sheets) document.head.append(sheet.style); },
  });
  for (const file of ['catalog.js','sizing.js']) window.eval(readFileSync(new URL(`../src/${file}`,import.meta.url),'utf8'));
  let changes = 0;
  const sizing=window.UniEmoji.createSizing(document,()=>changes++);
  const records=()=>[...document.querySelectorAll('p')].flatMap(parent=>[...parent.childNodes].filter(node=>node.nodeType===3&&node.data.includes('😊')).map(node=>({node})));
  return {window,document,sizing,records,created,changes:()=>changes};
}

test('三档排版只缩放 emoji 字体，保留原节点、正文字号及代码/链接的字体', t=>{
  const {window,document,sizing,records,created}=setup(t,'<p>文字😊<code>😊</code><a>😊</a><strong>文字</strong></p>');
  const parent=document.querySelector('p'), source=parent.firstChild;
  const before=parent.innerHTML;
  const children=[...parent.children].map(element=>({element,font:window.getComputedStyle(element).fontFamily,line:window.getComputedStyle(element).lineHeight}));
  for(const size of [24,32,40]) {
    sizing.update(records(),size,true);
    assert.equal(parent.firstChild,source);
    assert.equal(parent.textContent,'文字😊😊😊文字');
    assert.equal(window.getComputedStyle(parent).fontSize,'20px');
    assert.equal(created.at(-1).descriptors.sizeAdjust,`${size/20*100}%`);
    assert.equal(window.getComputedStyle(parent).lineHeight,`${Math.max(28,size+4)}px`);
    for(const {element,font,line} of children) {
      assert.equal(window.getComputedStyle(element).fontFamily,font);
      assert.equal(window.getComputedStyle(element).lineHeight,line);
    }
  }
  sizing.restore();
  assert.equal(parent.innerHTML,before);
  assert.equal(window.getComputedStyle(parent).lineHeight,'28px');
  assert.equal(document.adoptedStyleSheets.length,0);
  assert.equal(document.fonts.size,0);
});

test('未收录的组合表情共享码点时，不破坏原字形', t=>{
  const {document,sizing,records}=setup(t,'<p>😊 👍 👍🏽 🦋 👨‍👩‍👧‍👦</p>');
  sizing.update(records(),40,true);
  const source=document.querySelector('p').firstChild;
  assert.equal(sizing.has(source,'😊'),true);
  assert.equal(sizing.has(source,'👍'),false);
  assert.equal(sizing.has(source,'👍🏽'),false);
  assert.equal(sizing.has(source,'🦋'),false);
  assert.equal(source.data,'😊 👍 👍🏽 🦋 👨‍👩‍👧‍👦');
});

test('字号和宿主样式改变后更新排版，关闭后保留宿主的新样式', t=>{
  const {window,document,sizing,records}=setup(t,'<p>😊</p>');
  const p=document.querySelector('p');
  sizing.update(records(),40,true);
  p.style.fontSize='16px';p.style.color='red';p.style.fontFamily='serif';
  sizing.update(records(),40);
  assert.equal(window.getComputedStyle(p).fontSize,'16px');
  assert.match(window.getComputedStyle(p).fontFamily,/serif/);
  sizing.restore();
  assert.equal(p.style.fontFamily,'serif');
  assert.equal(p.style.fontSize,'16px');
  assert.equal(p.style.color,'red');
});

test('共享字体仍在使用时保留就绪回调，关闭后移除字体且忽略迟到加载',async t=>{
  const {document,sizing,records,created,changes}=setup(t,'<p>一😊</p><p>二😊</p>',true);
  sizing.update(records(),40,true);
  assert.equal(created.length,1);
  document.querySelector('p').remove();
  sizing.update(records(),40,true);
  created[0].finish();await Promise.resolve();
  assert.equal(changes(),1);
  sizing.update(records(),24,true);
  sizing.restore();
  created[1].finish();await Promise.resolve();
  assert.equal(changes(),1);
  assert.equal(document.fonts.size,0);
  assert.equal(document.querySelectorAll('[data-uniemoji-sizing]').length,0);
});


test('本机字体未就绪或不可用时保持原排版', t=>{
  const {window,document,sizing,records,created}=setup(t,'<p>😊</p>',true);
  const p=document.querySelector('p');
  sizing.update(records(),40,true);
  assert.equal(window.getComputedStyle(p).fontFamily,'sans-serif');
  assert.equal(window.getComputedStyle(p).lineHeight,'28px');
  assert.equal(sizing.has(p.firstChild,'😊'),false);
  created[0].status='error';
  sizing.update(records(),40);
  assert.equal(window.getComputedStyle(p).fontFamily,'sans-serif');
  assert.equal(window.getComputedStyle(p).lineHeight,'28px');
  sizing.restore();
});
