# Gemini / AI Studio 账号一键切换扩展

一个 Chrome 扩展：在弹窗里列出你的多个 Google 身份，**一键直接以指定账号打开** `gemini.google.com` / `aistudio.google.com`，跳过手动点头像切换。

## 原理

利用 Google 自带的多账号机制，在网址后加上 `?authuser=<邮箱>`（或 `/u/<序号>/`），让 Google 直接以指定账号渲染页面。前提：这些账号都已登录在同一个 Chrome 中。

## 现状

- 设计文档：[`docs/superpowers/specs/2026-06-20-gemini-account-switch-extension-design.md`](docs/superpowers/specs/2026-06-20-gemini-account-switch-extension-design.md)
- UI 设计原型（可直接用浏览器打开预览）：`mockups/popup.html`、`mockups/settings.html`

实现尚未开始，下一步为编写实现计划。
