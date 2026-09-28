import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
async function setup(t) {
  const dom = new JSDOM(readFileSync(new URL('../popup/index.html',import.meta.url),'utf8'),{runScripts:'outside-only'});
  t.after(()=>dom.window.close());
  const {window}=dom, {document}=window;
  window.matchMedia=()=>({matches:true});
  window.Element.prototype.scrollIntoView=()=>{};
  const writes=[];
  window.chrome={storage:{local:{get:async()=>({}),set:({settings})=>new Promise((resolve,reject)=>writes.push({settings,resolve,reject}))}}};
  window.eval(readFileSync(new URL('../popup/popup.js',import.meta.url),'utf8'));
  await new Promise(resolve=>setImmediate(resolve));
  const select=value=>{
    const input=document.querySelector(`input[value="${value}"]`);
    input.checked=true;input.dispatchEvent(new window.Event('change',{bubbles:true}));
  };
  return {document,writes,select};
}
test('连续切换时不禁用控件，串行保存最后一次选择',async t=>{
  const {document,writes,select}=await setup(t);
  select(28);select(36);select(64);
  assert.equal(document.querySelector('#size').disabled,false);
  assert.equal(document.querySelector('#enabled').disabled,false);
  assert.equal(document.querySelector('#preview').width,64);
  assert.equal(writes.length,1);
  writes[0].resolve();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(writes.length,2);
  assert.equal(writes[1].settings.size,64);
  writes[1].resolve();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(document.querySelector('#status'),null);
});
test('早先保存失败不会覆盖较新的选择',async t=>{
  const {document,writes,select}=await setup(t);
  select(28);select(48);
  writes[0].reject(new Error('failed'));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(document.querySelector('#preview').width,48);
  assert.equal(writes[1].settings.size,48);
  writes[1].resolve();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(document.querySelector('#preview').width,48);
});
test('最终保存失败时恢复最近一次成功保存的值',async t=>{
  const {document,writes,select}=await setup(t);
  select(28);writes[0].resolve();await new Promise(resolve=>setImmediate(resolve));
  select(64);writes[1].reject(new Error('failed'));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(document.querySelector('#preview').width,28);
  assert.equal(document.querySelector('input[name="size"]:checked').value,'28');

});
