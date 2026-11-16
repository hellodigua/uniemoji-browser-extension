# 官网维护

纯静态页面，无运行时依赖。首页和隐私政策共享样式，构建时复用扩展内的图片。

本地预览：

```sh
npm run build:site
python3 -m http.server 4173 --directory dist-site
```

打开 http://localhost:4173 。修改后重新运行构建命令。

## GitHub Pages

首次部署前，在仓库 Settings → Pages → Build and deployment 中选择 **GitHub Actions**。
合入 main 后，官网相关变更会自动部署；也可手动运行 Deploy website 工作流。

默认地址（部署成功后生效）：

- 官网：https://hellodigua.github.io/uniemoji-browser-extension/
- 隐私政策：https://hellodigua.github.io/uniemoji-browser-extension/privacy.html

上架 Chrome 应用商店时，分别填入官网和隐私政策地址。商店上架后，把首页的本地安装入口改为真实商店链接；尚未上架前不使用占位商店链接。

今后绑定自定义域名时，继续使用这个站点，并更新商店后台链接。隐私政策须随扩展的数据处理行为同步更新。
