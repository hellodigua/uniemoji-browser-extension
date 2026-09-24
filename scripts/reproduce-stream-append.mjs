// Standalone reproduction of the known append-style streaming limitation.
// Run: node scripts/reproduce-stream-append.mjs
// Exit 1 means text loss reproduced; this does not prove either live site uses it.
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mockBrowser} from '../tests/browser-mocks.mjs';

let failures = 0;
for (const [name, write] of [
  ['appendData', node => node.appendData('，第二段💪')],
  ['data +=', node => { node.data += '，第二段💪'; }],
  ['full overwrite', node => { node.data = '你好😊，第一段，第二段💪'; }],
]) {
  const dom = new JSDOM('<p>你好😊，第一段</p>', {runScripts:'outside-only'});
  mockBrowser(dom.window);
  for (const file of ['catalog.js', 'engine.js']) {
    dom.window.eval(readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8'));
  }
  const root = dom.window.document.querySelector('p');
  const source = root.firstChild;
  const renderer = dom.window.UniEmoji.createRenderer(dom.window.document, file => file);
  renderer.render([root]);
  write(source);
  renderer.render([root]);
  const expected = '你好😊，第一段，第二段💪';
  const actual = root.textContent;
  renderer.restore();
  const restored = root.textContent;
  const passed = actual === expected && restored === expected;
  if (!passed) failures++;
  console.log(JSON.stringify({mode:name, passed, expected, actual, restored}));
  dom.window.close();
}
process.exitCode = failures ? 1 : 0;
