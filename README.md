# 🌸 AniGallery · 我的动漫收藏馆

一个动漫风格的静态画廊网页,专为 **GitHub Pages** 设计:

- **画廊**:84 张个人收藏图片的瀑布流展示,支持标签筛选、全屏灯箱(方向键 / ESC 操作)
- **推荐角**:基于 [Bangumi 番组计划 API](https://bangumi.github.io/api/) 的动画推荐清单
  - 内置 8 部种子推荐(新番 + 老番),评分/简介/封面在浏览器端**实时拉取**
  - 离线或 API 不可达时自动降级为内置快照,页面永远可用
  - **搜索添加**:输入关键词从 Bangumi 搜索动画,一键加入你的推荐清单(保存在本机 localStorage)
  - 可给每部番写安利感想、可移除任何条目、可按「新番 / 老番」筛选

纯静态 HTML/CSS/JS,无构建步骤。

## 目录结构

```
anime-gallery/
├── index.html          # 页面
├── css/style.css       # 样式(动漫夜樱主题)
├── js/
│   ├── data.js         # 画廊清单 + 推荐种子快照(自动生成)
│   └── app.js          # 交互逻辑
├── assets/gallery/     # 84 张网页尺寸图片(共约 35MB)
├── scripts/gen_data.py # 重新生成 data.js 的脚本
└── seeds.json          # 推荐种子数据
```

## 部署到 GitHub Pages

1. 新建一个 GitHub 仓库(建议名 `anime-gallery`,或 `<用户名>.github.io` 作为主页)。
2. 上传本目录全部内容(注意 `assets/gallery/` 约 35MB,单文件均远小于 100MB,仓库总量远小于 1GB 限额,无需 LFS)。
3. 仓库 **Settings → Pages → Source 选择 `main` 分支、`/(root)` 目录**,保存。
4. 约 1 分钟后访问 `https://<用户名>.github.io/<仓库名>/`。

本地预览:

```sh
cd anime-gallery
python3 -m http.server 8000
# 打开 http://localhost:8000
```

## 自定义

- **改推荐种子**:编辑 `seeds.json`(字段含 `id`(bgm.tv 条目 ID)、`name`、`name_cn`、`date`、`score`、`rank`、`platform`、`summary`、`cover`、`tags`),然后运行 `python3 scripts/gen_data.py` 重新生成 `js/data.js`。
- **换图片**:把新图放入 `assets/gallery/`,按现有格式在 `js/data.js` 的 `window.GALLERY` 里追加条目(`file` / `title` / `tags`)。
- **年份划分**:「新番/老番」按 2020 年为界,可在 `js/app.js` 的 `isNew()` 里调整。

## 关于 Bangumi API

- 页面直接在浏览器调用 `https://api.bgm.tv/v0/*`(该 API 已开启 CORS)。
- 需要你的网络能访问 bgm.tv(国内直连或使用系统代理均可;代理开启时浏览器同样走代理)。
- 搜索接口有频率限制,请勿高频调用;本站已做 8 秒超时与错误提示。

## 许可

页面代码可自由使用;图片版权归原作者所有,仅供个人收藏展示。
数据来自 [Bangumi 番组计划](https://bgm.tv),版权归其所有。
