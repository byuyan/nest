# 郑宇彬的小窝 · NEST

一间自己搭的电子小窝。全屏蓝莓壁纸、翻页时钟、实时合成的环境音、一个真能留言的信箱。

线上：<https://byuyan.github.io/nest/>

## 结构

```
index.html            唯一页面
assets/css/site.css   全部样式（无框架）
assets/js/site.js     全部逻辑（无依赖）
assets/img/           三张壁纸 + 圆头像
```

没有构建步骤，没有 npm，双击 `start-preview.bat` 或在目录下跑 `python -m http.server 4175` 就能本地预览。

## 页面里有什么

- **全屏壁纸**：三张蓝莓微距，切换有 1 秒交叉淡入，选择存在浏览器本地。
- **翻页时钟**：6 张牌，上下半片分别旋转，秒针真的会“翻”。
- **名片**：头像、名字、一句话签名、文章 / 留言 / 壁纸三个数字。
- **唱片机**：两条实时合成的环境音（夜晚垫音、清晨雾气声），用 Web Audio 现场生成，没有音频文件，也就没有版权问题。
- **信箱**：留言真实存在本仓库的 GitHub Issues 里，读留言不需要登录，写留言会跳到 GitHub 的新建 issue 页。
- **最近的脚印**：拉取 `byuyan/byuyan.github.io` 的真实提交记录。
- **设置抽屉**：壁纸、24 小时制、显示秒、毛玻璃浓度、进页面是否出声。
- **小窝助手**：右下角那颗 AI，是规则问答，答不上的会引导你去留言。

## 怎么改

- **换壁纸**：把图片放进 `assets/img/`，改 `site.js` 顶部的 `WALLS` 数组。
- **换名字、签名、数字**：直接改 `index.html`，搜“郑宇彬 / 在数据与叙事之间”。
- **换音乐**：`site.js` 里的 `TRACKS` 换成你的歌，并把 `startAudio()` 改成播放 `<audio>` 里的真实 mp3。
- **换留言仓库**：`site.js` 里的 `REPO` 改成你的 GitHub 仓库名即可。

## 已知边界

留言需要 GitHub 账号登录一次才能发（GitHub 的公开接口不允许匿名写）。想让人人免登录留言，需要接一个后端，比如 Supabase、Cloudflare Workers 或 Firebase，代码里换掉 `loadGuest()` 与 `openWrite()` 两处即可。

页面内容里的邮箱 `hello@example.com` 是占位，换成你自己的。
