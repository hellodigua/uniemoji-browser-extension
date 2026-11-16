# Chrome 应用商店上架资料

适用于 UniEmoji 0.1.1。0.1.0 的商店摘要及描述中的平台名称列表被以关键词堆砌（Yellow Argon）拒审；本稿改为介绍实际功能，适配平台可在官网查看。商店摘要来自 manifest，修正后需要上传新版本 ZIP，再保存下面的详细介绍。

## 商店基本信息

| 字段 | 填写内容 |
| --- | --- |
| 名称 | UniEmoji（来自 manifest） |
| 简短介绍 | 将已适配的 AI 聊天网页回复中的 emoji 显示为鲸鱼表情，支持尺寸调整，仅在本地处理。（来自 manifest） |
| 主要语言 | 中文（简体） |
| 类别建议 | 娱乐（以后台当前提供的分类为准） |
| 官网 | https://hellodigua.github.io/uniemoji-browser-extension/ |
| 支持网址 | https://github.com/hellodigua/uniemoji-browser-extension/issues |
| 隐私政策 | https://hellodigua.github.io/uniemoji-browser-extension/privacy.html |
| 费用 | 扩展免费，无扩展内购买；第三方 AI 平台自身的费用不在此范围 |

## 详细介绍（可直接复制）

```text
让 AI 回复中的 emoji，变成生动的鲸鱼表情。

UniEmoji 将已适配的 AI 聊天网页回复中的 emoji 显示为对应的鲸鱼表情图片，让同一种表达拥有不同的面孔。

Same meanings, any face.

你可以做什么
• 自动显示：内置 40 款鲸鱼表情，替换 AI 回复中已收录的 emoji。
• 自由调整：表情尺寸从 24px 到 64px，默认 24px。
• 随时关闭：点击浏览器工具栏中的 UniEmoji 图标，即可开关替换。

使用方法
安装后刷新已打开的聊天网页。当 AI 回复包含已收录的 emoji 时，UniEmoji 会自动显示对应表情。可以在扩展菜单中将 UniEmoji 固定到工具栏，方便调整设置。

关于隐私
表情识别与显示在浏览器本地完成。扩展会读取 AI 回复正文以识别 emoji，但不上传或持久保存聊天内容。仅在本地保存开关和尺寸设置，不包含广告或统计追踪，不修改提示词，也不额外调用 AI。

使用范围
只处理支持网站的 AI 回复正文；用户消息、代码和链接保持原样。未收录的 emoji 保持原样，扩展不会主动让 AI 添加 emoji。个别字体环境下可能保留原表情尺寸，以避免破坏排版。

仅适用于已适配的桌面聊天网页，不适用于独立桌面 App 或手机 App。支持范围请在官网查看。本扩展为独立项目，与聊天平台不存在官方隶属或背书关系。

官网：https://hellodigua.github.io/uniemoji-browser-extension/
问题反馈：https://github.com/hellodigua/uniemoji-browser-extension/issues
隐私政策：https://hellodigua.github.io/uniemoji-browser-extension/privacy.html
```

## 隐私实践（后台填写）

### 单一用途

```text
在支持的 AI 聊天网页中，将 AI 回复正文里已收录的 emoji 显示为对应的本地鲸鱼表情图片，并允许用户开关替换、调整显示尺寸。
```

### storage 权限理由

```text
使用 chrome.storage.local 在用户当前浏览器中保存表情替换开关和显示尺寸，使设置在重新打开页面后仍然有效。不保存聊天记录，不同步或上传这些设置到服务器。
```

### 网站访问权限理由（后台如显示此项）

```text
内容脚本仅在 DeepSeek、Gemini、ChatGPT、豆包、千问和 Kimi 的指定网页上运行，读取 AI 回复正文中的 emoji，并在原位置显示扩展内置图片。网站访问是提供表情替换功能所必需的。未申请所有网站权限，不读取其他网站或浏览历史，不上传聊天内容。
```

网站范围以 manifest 的 content_scripts.matches 为准；没有额外的 host_permissions、tabs、history 或 cookies 权限。web_accessible_resources 仅向指定网站开放包内表情 PNG。

### 远程代码

选择 **否，不使用远程代码**。

```text
全部 JavaScript、CSS 和表情图片随扩展打包。扩展不加载或执行远程脚本、远程 WebAssembly 或服务器下发的代码。
```

### 数据使用

不能仅因“没有服务器”就填写“不处理任何用户数据”。Google 明确要求披露本地处理。按当前实现应披露 **网站内容（Website content）** 和 **个人通讯（Personal communications）**：AI 回复既是网页正文，也是对话内容，扩展会在本地读取以识别 emoji。不要把“本地读取”描述为“上传聊天记录”，也不要把未处理的数据类别全部勾选。

补充说明可使用：

```text
本扩展仅在本地读取支持网站的 AI 回复正文，识别 emoji 并显示本地表情图片。聊天内容不会发送给开发者或第三方，也不会被持久保存。仅保存本地开关和尺寸设置。数据不用于广告、统计、出售、模型训练、信用评估或与表情替换无关的用途。
```

当前实现符合以下用途声明，可以据实确认：不出售或为无关目的转移数据；不为与扩展单一用途无关的目的使用数据；不用于判断信用或贷款资格。商店披露需与已上线隐私政策保持一致。

## 审核人员测试说明

```text
UniEmoji 不需要注册扩展账号，也没有付费解锁。第三方 AI 网站可能需要审核人员使用自己的账号登录；本扩展不提供、收集或管理这些账号。

1. 安装扩展，打开 https://chat.deepseek.com/ 或其他支持的平台，刷新网页。
2. 开启新对话，请 AI 回复：“早上好 😊，一起加油 💪！”（不包含代码块）。
3. 已收录的 emoji 应显示为鲸鱼表情，其他文字保持原样。
4. 点击 UniEmoji 工具栏图标，将表情尺寸从 24px 改为 40px，观察尺寸变化。
5. 关闭“启用表情替换”，应恢复原始 emoji；重新开启后再次替换。
6. 复制回复，文本中的原始 emoji 应保留。

所有处理在本地完成，没有后端服务或额外 AI API 调用。部分字体环境下尺寸会保留原占位大小。
```

## 图片资料

- `assets/icon-128.png`：128×128 PNG 商店图标，复用扩展当前图标。
- `assets/screenshot-01.jpg`：1280×800，使用生产渲染代码展示示例对话；图中标明功能演示，不冒充真实平台截图。
- `assets/screenshot-02.jpg`：1280×800，展示实际弹窗界面；预览页仅模拟本地存储 API，不改写弹窗功能。
- `preview.html`：截图源页面，演示文本不含用户私人对话。

复现截图：在仓库根目录运行 `python3 -m http.server 4188 --bind 127.0.0.1`，以 1280×800 视口分别打开 `/docs/store/preview.html` 和 `/docs/store/preview.html?settings`，等待图片及字体加载完成后截图。

官网不等于扩展截图。当前仅准备必需图标和截图；宣传小图、横幅与视频不阻塞首次提交。后续可用真实平台的新建演示对话截图替换功能演示图。

## 上传前仍需在后台确认

- 开发者账号、联系邮箱、账号验证及分发地区；不在仓库中记录私人账号信息。
- 按后台实际分类解释复核数据使用选项。
- 用发布 ZIP 解压后的目录进行真实浏览器安装验收。本轮资料准备不代表商店审核通过。

## 官方依据

- [商店字段与图片要求](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [图片规范](https://developer.chrome.com/docs/webstore/images)
- [隐私字段与权限理由](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [本地数据处理也需披露](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Yellow Argon：关键词堆砌及整改说明](https://developer.chrome.com/docs/webstore/troubleshooting#keyword-stuffing)

官方页面存在旧搜索摘要将宣传小图标为必需的情况；本次以打开后的当前正文为准：必需的是商店图标和至少一张截图。
