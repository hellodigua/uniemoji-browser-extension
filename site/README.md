# 旧官网地址兼容

官网源码已迁至 [UniEmoji 主项目](https://github.com/hellodigua/UniEmoji)，本目录仅保留已有链接的访问入口。

| 旧地址 | 行为 |
| --- | --- |
| `https://hellodigua.github.io/uniemoji-browser-extension/` | 自动跳转至 `https://hellodigua.github.io/UniEmoji/browser-extension.html`，并提供手动链接 |
| `https://hellodigua.github.io/uniemoji-browser-extension/privacy.html` | 保留完整原隐私政策，标明新政策地址 |

新官网首页为 https://hellodigua.github.io/UniEmoji/ ，隐私政策为 https://hellodigua.github.io/UniEmoji/privacy.html 。

请先发布主项目的新页面，再部署本仓库兼容页，最后更新商店后台链接。完整迁移顺序见 [主项目官网维护说明](https://github.com/hellodigua/UniEmoji/blob/main/docs/WEBSITE.md)。

`npm run build:site` 仅构建这两个兼容页面到 `dist-site/`，供现有 Pages 工作流使用。不要停用此仓库的 Pages，否则商店及历史链接会失效。

官网日常开发请在 UniEmoji 主项目运行 `npm run dev`；不再在本仓库维护独立的产品介绍页或官网样式。
