import { cp, mkdir, rm } from 'node:fs/promises';

// 构建旧官网兼容页，保留已有访问地址。
const root = new URL('../', import.meta.url);
const output = new URL('dist-site/', root);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'privacy.html']) {
  await cp(new URL(`site/${file}`, root), new URL(file, output));
}
console.log('Legacy website pages built in dist-site/');
