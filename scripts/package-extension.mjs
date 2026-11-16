import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// 按运行文件白名单生成发布 ZIP，避免混入开发资料和官网文件。
const root = fileURLToPath(new URL('../', import.meta.url));
execFileSync(process.execPath, [join(root, 'scripts/check.mjs')], { stdio: 'inherit' });
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const context = {};
vm.runInNewContext(readFileSync(join(root, 'src/catalog.js'), 'utf8'), context);
const files = new Set([
  'manifest.json', 'LICENSE', 'ASSETS.md',
  manifest.action.default_popup, 'popup/popup.js', 'popup/popup.css',
  ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon),
  ...manifest.content_scripts.flatMap(entry => [...entry.js, ...entry.css]),
  ...context.UniEmoji.catalog.map(entry => `assets/whale/${entry.file}`),
]);
assert.match(manifest.version, /^\d+(?:\.\d+){0,3}$/);
const outputDir = join(root, 'dist');
mkdirSync(outputDir, { recursive: true });
const temporary = mkdtempSync(join(tmpdir(), 'uniemoji-package-'));
const staging = join(temporary, 'extension');
const archive = join(temporary, 'extension.zip');
const output = join(outputDir, `uniemoji-browser-extension-${manifest.version}.zip`);
try {
  mkdirSync(staging);
  for (const file of files) {
    const source = resolve(root, file);
    assert.ok(source.startsWith(root.endsWith(sep) ? root : root + sep), `Invalid package path: ${file}`);
    assert.ok(lstatSync(source).isFile(), `Missing file or unsupported symlink: ${file}`);
    const target = join(staging, file);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  }
  execFileSync('zip', ['-X', '-q', archive, ...[...files].sort()], { cwd: staging });
  execFileSync('unzip', ['-tq', archive], { stdio: 'inherit' });
  const packedFiles = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).trim().split('\n');
  assert.deepEqual(packedFiles.sort(), [...files].sort(), 'ZIP contents differ from allowlist');
  // 先复制到目标目录再重命名，兼容临时目录与项目处于不同磁盘。
  const pending = `${output}.tmp`;
  try {
    copyFileSync(archive, pending);
    renameSync(pending, output);
  } finally {
    rmSync(pending, { force: true });
  }
  console.log(`\n发布包：${output}\n文件数：${files.size}\n大小：${(statSync(output).size / 1024).toFixed(1)} KiB`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
