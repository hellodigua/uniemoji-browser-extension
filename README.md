# UniEmoji Browser Extension

**Same meanings, any face.**

让 AI 回复中的 emoji 变成生动的表情包。UniEmoji 浏览器扩展会把支持的 emoji 显示为鲸鱼表情，让同一种表达拥有不同的面孔。

早上好 😊 → 早上好 <img src="assets/whale/ds_01.png" width="32" height="32" alt="开心的鲸鱼表情" align="absmiddle">

## 能做什么

- **自动替换**：支持的 AI 回复中，已有的 emoji 会显示为对应表情；没有对应素材的 emoji 保持原样。
- **随时调整**：一键开关，表情尺寸可在 24–64px 之间选择，默认 24px。
- **本地处理**：不上传聊天内容，不修改提示词，不额外调用 AI。

目前内置 40 款鲸鱼表情，仅处理 AI 回复正文，用户消息、代码和链接保持原样。

## 支持的网站

| 平台 | 网页地址 |
| --- | --- |
| DeepSeek | [chat.deepseek.com](https://chat.deepseek.com/) |
| Gemini | [gemini.google.com](https://gemini.google.com/) |
| ChatGPT | [chatgpt.com](https://chatgpt.com/) |
| 豆包 | [doubao.com/chat](https://www.doubao.com/chat/) |

适用于 Chrome、Edge 的网页版聊天，不适用于这些平台的独立桌面 App 或手机 App。

## 安装

目前通过本地加载安装，尚未上架扩展商店。

1. 在本仓库页面点击 **Code → Download ZIP**，下载后解压。
2. 打开浏览器的扩展管理页：Chrome 为 `chrome://extensions`，Edge 为 `edge://extensions`。
3. 开启「开发者模式」，点击「加载已解压的扩展程序」，选择包含 `manifest.json` 的文件夹。
4. **刷新已经打开的聊天网页**，让扩展开始生效。

安装使用无需运行构建或安装 Node.js。请保留解压后的文件夹，浏览器会从这里加载扩展。

## 使用

打开支持的聊天网站，AI 回复中出现已收录的 emoji 时，就会自动显示为鲸鱼表情。

点击浏览器工具栏中的 UniEmoji 图标，可以开关替换、预览效果和调整尺寸。设置自动保存；尺寸按钮支持横向滚动。找不到图标时，可在浏览器的扩展菜单中将 UniEmoji 固定到工具栏。

## 常见问题

**为什么有些表情没有变化？**

目前只替换已收录的 emoji。AI 回复没有 emoji，或该 emoji 尚无对应素材时，内容会保持原样。扩展不会主动让 AI 添加表情。

**重新加载扩展后，为什么还是旧效果？**

重新加载扩展后，还需要刷新已打开的聊天网页。平时切换开关和尺寸无需刷新。

**为什么个别表情没有变成指定大小？**

部分字体环境或组合表情会限制可用尺寸，此时会保留原占位大小，避免破坏文字排版。

遇到其他问题，可以在 [Issues](https://github.com/hellodigua/uniemoji-browser-extension/issues) 中反馈使用的网站、浏览器和复现步骤；截图请遮去私人聊天内容。

## 相关项目与贡献

本扩展是 [UniEmoji](https://github.com/hellodigua/UniEmoji) 的浏览器实现。欢迎提交问题和改进，开发与测试方式见 [开发指南](docs/DEVELOPMENT.md)。

## 许可与素材

原创代码采用 MIT。内置表情图片不属于 MIT 授权范围，来源与使用边界见 [素材说明](ASSETS.md)。
