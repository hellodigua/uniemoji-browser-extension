import { cp, mkdir, rm } from 'node:fs/promises';

// 构建独立静态官网，仅复制展示所需的现有素材。
const root = new URL('../', import.meta.url);
const output = new URL('dist-site/', root);
await rm(output, { recursive: true, force: true });
await mkdir(new URL('assets/', output), { recursive: true });
for (const file of ['index.html', 'privacy.html', 'style.css']) {
  await cp(new URL(`site/${file}`, root), new URL(file, output));
}
await cp(new URL('assets/whale/ds_01.png', root), new URL('assets/ds_01.png', output));
await cp(new URL('site/icon.png', root), new URL('assets/icon.png', output));
console.log('Website built in dist-site/');
