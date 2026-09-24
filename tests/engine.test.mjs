import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mockBrowser} from './browser-mocks.mjs';
const catalog = readFileSync(new URL('../src/catalog.js', import.meta.url),'utf8');
const engine = readFileSync(new URL('../src/engine.js', import.meta.url),'utf8');
function setup(html) {
 const dom = new JSDOM(html, {runScripts:'outside-only'});
 mockBrowser(dom.window);
 dom.window.eval(catalog); dom.window.eval(engine);
 const api=dom.window.UniEmoji;
 const renderer=api.createRenderer(dom.window.document, file=>`chrome-extension://test/assets/whale/${file}`);
 return {dom,document:dom.window.document,api,renderer};
}
test('DeepSeek 仅替换正文，保留代码、链接、用户输入与复制文本',()=>{
 const {document,api,renderer}=setup('<div class="user">用户😊</div><div class="ds-assistant-message-main-content"><p>你好😊，加油💪！</p><code>😊</code><pre>💪</pre><a>😊</a><div contenteditable="true">😊</div></div>');
 const roots=[...document.querySelectorAll(api.selectorFor('chat.deepseek.com'))];
 const before=document.body.textContent;
 renderer.render(roots);
 assert.equal(document.querySelectorAll('[data-uniemoji]').length,2);
 assert.equal(document.body.textContent,before);
 assert.equal(document.querySelector('.user').innerHTML,'用户😊');
 renderer.render(roots);
 assert.equal(document.querySelectorAll('[data-uniemoji]').length,2);
 renderer.restore();
 assert.equal(document.querySelectorAll('[data-uniemoji]').length,0);
 assert.equal(document.body.textContent,before);
});
test('框架使用同一个 Text 节点持续流式写入，不重复或丢失尾部',()=>{
 const {document,renderer}=setup('<p>你好😊</p>');
 const root=document.querySelector('p');
 const original=root.firstChild;
 renderer.render([root]);
 assert.equal(root.firstChild,original);
 original.data='你好😊，加油💪！';
 renderer.render([root]);
 assert.equal(root.textContent,'你好😊，加油💪！');
 assert.equal(document.querySelectorAll('[data-uniemoji]').length,2);
 original.data='新的回复😂';
 renderer.render([root]);
 assert.equal(root.textContent,'新的回复😂');
 assert.equal(document.querySelectorAll('[data-uniemoji]').length,1);
 original.data='还在写😊';
 renderer.restore();
 assert.equal(root.textContent,'还在写😊');
});
test('框架移除或替换原始 Text 节点后清除旧装饰',()=>{
 const {document,renderer}=setup('<p>你好😊</p>');
 const root=document.querySelector('p');
 const original=root.firstChild;
 renderer.render([root]);
 root.removeChild(original);
 root.append(document.createTextNode('重新生成💪'));
 renderer.render([root]);
 assert.equal(root.textContent,'重新生成💪');
 assert.equal(document.querySelectorAll('[data-uniemoji]').length,1);
 root.textContent='重载历史😊';
 renderer.render([root]);
 renderer.render([root],40);
 assert.equal(document.querySelector('[data-uniemoji]').style.width,'40px');
 renderer.restore();
 assert.equal(root.textContent,'重载历史😊');
});
test('Gemini 只处理模型正文，组合 emoji 不拆分，不支持的网站不回退到整页',()=>{
 const {document,api,renderer}=setup('<user-query><p>😊</p></user-query><model-response-content><message-content><div class="markdown">🙂‍↕️ 😵‍💫 👍🏽 🦋 😊</div></message-content></model-response-content>');
 renderer.render([...document.querySelectorAll(api.selectorFor('gemini.google.com'))]);
 assert.equal(document.querySelectorAll('[data-uniemoji]').length,3);
 assert.equal(document.querySelector('user-query').textContent,'😊');
 assert.ok(document.body.textContent.includes('👍🏽 🦋'));
 assert.equal(api.selectorFor('example.com'),null);
});

for (const [mode, append] of [
 ['appendData', (node, delta) => node.appendData(delta)],
 ['data +=', (node, delta) => { node.data += delta; }],
]) {
 test(`${mode} 多次追加保留原节点、完整内容、选择文本和关闭前未处理内容`, () => {
  const {dom,document,renderer}=setup('<p>你好😊，第一段</p>');
  const root=document.querySelector('p');
  const source=root.firstChild;
  let expected=source.data;
  renderer.render([root]);
  assert.equal(source.data,expected);
  for (const delta of ['，第二段💪','继续😂','普通文字']) {
   append(source,delta);
   expected+=delta;
   renderer.render([root]);
   assert.equal(source.data,expected);
   assert.equal(root.textContent,expected);
   assert.equal(root.firstChild,source);
   assert.equal(root.childNodes.length,1);
   const range=document.createRange();
   range.selectNodeContents(root);
   dom.window.getSelection().removeAllRanges();
   dom.window.getSelection().addRange(range);
   assert.equal(dom.window.getSelection().toString(),expected);
  }
  append(source,'尚未渲染😊');
  renderer.restore();
  assert.equal(root.textContent,expected+'尚未渲染😊');
  assert.equal(document.querySelectorAll('[data-uniemoji]').length,0);
  assert.equal(dom.window.CSS.highlights.get('uniemoji-replaced').size,0);
 });
}
test('视觉覆盖使用容器局部坐标，无布局时保留原 emoji', () => {
 const {dom,document,renderer}=setup('<p>你好😊</p>');
 const root=document.querySelector('p');
 renderer.render([root],32);
 const image=document.querySelector('[data-uniemoji]');
 assert.equal(image.style.left,'18px');
 dom.window.Range.prototype.getClientRects=()=>[{left:50,top:60,width:20,height:24}];
 renderer.reposition();
 assert.equal(image.style.left,'50px');
 assert.equal(image.style.top,'62px');
 assert.equal(image.style.width,'20px');
 dom.window.Range.prototype.getClientRects=()=>[];
 renderer.reposition();
 assert.equal(image.hidden,true);
});
test('不支持高亮 API 时保留原文且不生成装饰', () => {
 const {dom,document,api}=setup('<p>你好😊</p>');
 delete dom.window.Highlight;
 const renderer=api.createRenderer(document, file=>file);
 renderer.render([document.querySelector('p')]);
 assert.equal(document.body.innerHTML,'<p>你好😊</p>');
 assert.equal(document.querySelectorAll('[data-uniemoji]').length,0);
});

test('不同回复共享高亮注册表，清理一条不会影响另一条', () => {
 const {dom,document,api,renderer}=setup('<p>第一条😊</p><p>第二条💪</p>');
 const roots=[...document.querySelectorAll('p')];
 const second=api.createRenderer(document,file=>file);
 renderer.render([roots[0]]);
 second.render([roots[1]]);
 assert.equal(dom.window.CSS.highlights.get('uniemoji-replaced').size,2);
 renderer.restore();
 assert.equal(dom.window.CSS.highlights.get('uniemoji-replaced').size,1);
 assert.equal(document.querySelectorAll('[data-uniemoji]').length,1);
 assert.equal(document.body.textContent,'第一条😊第二条💪');
 second.restore();
 assert.equal(dom.window.CSS.highlights.get('uniemoji-replaced').size,0);
});

function pendingImages(window) {
 const images=[];
 window.Image=class {
  complete=false;
  naturalWidth=0;
  constructor(){ images.push(this); }
  succeed(){ this.complete=true; this.naturalWidth=128; this.onload?.(); }
  fail(){ this.complete=true; this.onerror?.(); }
 };
 return images;
}
test('图片等待时不隐藏原 emoji，成功后自动显示，多个回复复用加载结果',()=>{
 const {dom,document,api,renderer}=setup('<p>第一条😊</p><p>第二条😊</p>');
 const images=pendingImages(dom.window);
 const roots=[...document.querySelectorAll('p')];
 const second=api.createRenderer(document,file=>`chrome-extension://test/assets/whale/${file}`);
 renderer.render([roots[0]]);
 second.render([roots[1]]);
 const highlight=dom.window.CSS.highlights.get('uniemoji-replaced');
 assert.equal(images.length,1);
 assert.equal(highlight.size,0);
 assert.ok([...document.querySelectorAll('[data-uniemoji]')].every(image=>image.hidden));
 images[0].succeed();
 assert.equal(highlight.size,2);
 assert.ok([...document.querySelectorAll('[data-uniemoji]')].every(image=>!image.hidden));
 assert.equal(document.body.textContent,'第一条😊第二条😊');
 renderer.restore();second.restore();
 renderer.render([roots[0]]);
 assert.equal(images.length,1);
 assert.equal(highlight.size,1);
});
test('图片失败时保留原 emoji，重复定位也不会隐藏',()=>{
 const {dom,document,renderer}=setup('<p>你好😊</p>');
 const images=pendingImages(dom.window);
 renderer.render([document.querySelector('p')]);
 images[0].fail();
 renderer.reposition();
 renderer.render([document.querySelector('p')]);
 assert.equal(images.length,1);
 assert.equal(dom.window.CSS.highlights.get('uniemoji-replaced').size,0);
 assert.equal(document.querySelector('[data-uniemoji]').hidden,true);
 assert.equal(document.querySelector('p').textContent,'你好😊');
});
test('等待加载期间清理后，迟到的成功事件不会重新创建覆盖图',()=>{
 const {dom,document,renderer}=setup('<p>你好😊</p>');
 const images=pendingImages(dom.window);
 const root=document.querySelector('p');
 renderer.render([root]);
 renderer.restore();
 images[0].succeed();
 assert.equal(document.querySelectorAll('[data-uniemoji]').length,0);
 assert.equal(dom.window.CSS.highlights.get('uniemoji-replaced').size,0);
 assert.equal(root.textContent,'你好😊');
 renderer.render([root]);
 assert.equal(dom.window.CSS.highlights.get('uniemoji-replaced').size,1);
});
test('图片加载期间宿主更新文字，迟到回调不使用失效的 Range',()=>{
 const {dom,document,renderer}=setup('<p>你好😊</p>');
 const images=pendingImages(dom.window);
 const root=document.querySelector('p');
 renderer.render([root]);
 root.firstChild.data='新内容😊';
 images[0].succeed();
 assert.equal(dom.window.CSS.highlights.get('uniemoji-replaced').size,0);
 assert.equal(document.querySelectorAll('[data-uniemoji]').length,0);
 renderer.render([root]);
 assert.equal(dom.window.CSS.highlights.get('uniemoji-replaced').size,1);
 assert.equal(root.textContent,'新内容😊');
});

test('覆盖层挂在滚动边界内已有的定位容器，坐标抵消滚动并支持缩放',()=>{
 const {dom,document,renderer}=setup('<section style="overflow:auto"><article style="position:relative"><p>你好😊</p></article></section>');
 const root=document.querySelector('p');
 const source=root.firstChild;
 renderer.render([root]);
 const layer=document.querySelector('[data-uniemoji-layer]');
 const image=document.querySelector('[data-uniemoji]');
 assert.equal(layer.parentElement,document.querySelector('article'));
 assert.equal(root.firstChild,source);
 assert.equal(root.childNodes.length,1);
 layer.getBoundingClientRect=()=>({left:100,top:200,width:2,height:2});
 dom.window.Range.prototype.getClientRects=()=>[{left:120,top:240,width:40,height:48}];
 renderer.reposition();
 assert.equal(image.style.left,'10px');
 assert.equal(image.style.top,'22px');
 assert.equal(image.style.width,'20px');
 // A scroll moves both viewport rects equally, leaving local coordinates fixed.
 layer.getBoundingClientRect=()=>({left:100,top:50,width:2,height:2});
 dom.window.Range.prototype.getClientRects=()=>[{left:120,top:90,width:40,height:48}];
 renderer.reposition();
 assert.equal(image.style.top,'22px');
 renderer.restore();
 assert.equal(document.querySelector('[data-uniemoji-layer]'),null);
 assert.equal(document.querySelector('article').style.position,'relative');
});
test('不越过未定位的滚动边界，找不到安全容器时保留原 emoji',()=>{
 const {document,renderer}=setup('<section style="overflow:auto"><p>你好😊</p></section>');
 renderer.render([document.querySelector('p')]);
 assert.equal(document.querySelector('[data-uniemoji]'),null);
 assert.equal(document.querySelector('p').textContent,'你好😊');
 assert.equal(document.querySelector('section').style.position,'');
});
test('覆盖层被宿主重绘移除后可重建，关闭时清理整个层',()=>{
 const {document,renderer}=setup('<article style="position:relative"><p>你好😊</p></article>');
 const root=document.querySelector('p');
 renderer.render([root]);
 const layer=document.querySelector('[data-uniemoji-layer]');
 layer.remove();
 renderer.render([root]);
 assert.equal(layer.parentElement,document.querySelector('article'));
 renderer.restore();
 assert.equal(document.querySelector('[data-uniemoji-layer]'),null);
 assert.equal(root.textContent,'你好😊');
});
