import {readFileSync, existsSync, readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url)));
const root = new URL('../', import.meta.url);
for (const entry of manifest.content_scripts) for (const file of [...entry.js, ...entry.css]) assert.ok(existsSync(new URL(file, root)), file);
assert.deepEqual(manifest.permissions, ['storage']);
const sites = ['https://chat.deepseek.com/*', 'https://gemini.google.com/*', 'https://chatgpt.com/*', 'https://www.doubao.com/chat/*', 'https://www.kimi.com/*', 'https://kimi.com/*', 'https://www.qianwen.com/*'];
assert.deepEqual([...manifest.content_scripts[0].matches].sort(), [...sites].sort());
// Chrome permits only /* paths for web-accessible resource match patterns.
const resourceSites = sites.map(site => `${new URL(site).origin}/*`);
for (const entry of manifest.web_accessible_resources) {
  for (const pattern of entry.matches) {
    assert.equal(new URL(pattern).pathname, '/*', `Invalid web-accessible resource match pattern: ${pattern}`);
  }
  assert.deepEqual([...entry.matches].sort(), [...resourceSites].sort());
}
assert.equal(readdirSync(new URL('assets/whale/', root)).filter(f=>f.endsWith('.png')).length,40);
for (const file of ['src/catalog.js','src/sizing.js','src/engine.js','src/content.js','popup/popup.js']) new vm.Script(readFileSync(new URL(file,root),'utf8'));
console.log('Manifest、脚本语法及 40 张素材检查通过');
