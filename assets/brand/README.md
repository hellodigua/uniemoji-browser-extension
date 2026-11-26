# 品牌图形

`uniemoji-deck-cat.svg` / `uniemoji-deck-cat.png`（1024 × 1024）是当前扩展正式图标的矢量与高清透明源图，采用纯扁平三色阶梯卡叠（太阳黄 `#FFD43B`、品牌玫红 `#EE4567`、晴空蓝 `#3B8BFF`）与闭口 `>ω<` 表情。

`uniemoji-deck-joy.svg` / `uniemoji-deck-joy.png`（1024 × 1024）是同系列的开口珊瑚粉 `>▽<` 备用源图，保留供后续品牌物料或皮肤切换复用，不用于当前扩展图标。

以下为历史留档源图，不用于当前扩展图标：
- `emoji-trio-flat.png`：旧版扁平三表情组合透明源图（1254 × 1254）。
- `system-laugh-cry.png`：系统 😂 透明源图（1024 × 1024），由 macOS Apple Color Emoji 字形渲染。
- `uniemoji-original.png`：三团子高清透明原图（1254 × 1254），供其他品牌物料复用。

扩展使用 `../icons/` 中的 16、32、48、128 像素 PNG。生成时先按 alpha 通道裁去透明留白，再等比例缩放到目标尺寸的透明正方形中，不额外添加内边距，不拉伸或裁切图案。商店图标（`docs/store/assets/icon-128.png`）复用 128 像素版本。

生成后运行 `npm run check` 检查配置与尺寸。

原图不在 manifest 中引用，也不向网页开放访问。制作发布包时排除 `assets/brand/`，保留 `assets/icons/`。
