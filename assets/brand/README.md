# 品牌图形

`emoji-trio-flat.png` 是当前图标的高清透明源图（1254 × 1254），采用前一后两的扁平三表情组合。

`system-laugh-cry.png` 是单独保留的系统 😂 透明源图（1024 × 1024），由 macOS Apple Color Emoji 字形渲染，不用于当前扩展图标。

`uniemoji-original.png` 是单独保留的三团子高清透明原图（1254 × 1254），供其他品牌物料复用，不用于当前扩展图标。

扩展使用 `../icons/` 中的 16、32、48、128 像素 PNG。生成时先按 alpha 通道裁去透明留白，再等比例缩放到目标尺寸的透明正方形中，不额外添加内边距，不拉伸或裁切图案。

生成后运行 `npm run check` 检查配置与尺寸。

原图不在 manifest 中引用，也不向网页开放访问。制作发布包时可排除 `assets/brand/`，保留 `assets/icons/`。
