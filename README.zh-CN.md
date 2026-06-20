# Gemini / AI Studio 账号一键切换扩展

[English](./README.en.md) | **简体中文**

一个 Chrome 扩展：在弹窗里列出你的多个 Google 身份，**一键直接以指定账号打开** `gemini.google.com` / `aistudio.google.com`，跳过手动点头像切换。

## 原理

利用 Google 自带的多账号机制，在网址后加上 `?authuser=<邮箱>`（或 `/u/<序号>/`），让 Google 直接以指定账号渲染页面。前提：这些账号都已登录在同一个 Chrome 中。

## 安装使用

1. **加载扩展**：打开 Chrome → `chrome://extensions/` → 开启「开发者模式」→ 「加载已解压的扩展」→ 选择 `src/` 目录。
2. **设置身份**：点击扩展图标 → 齿轮或「管理设置」→ 添加你的 Google 账号。
3. **一键切换**：点击扩展图标，在身份卡上点 `Gemini` 或 `AI Studio` 按钮即可。

## 项目结构

```
src/
├── manifest.json          # Chrome MV3 清单
├── popup.html/css/js      # 弹窗页（身份列表 + 一键打开）
├── settings.html/css/js   # 设置页（增删改身份 + 自动检测 + 偏好）
├── lib/
│   ├── urlBuilder.js      # URL 构造（authuser 拼接）
│   ├── colors.js          # 身份色板共享常量
│   ├── storage.js         # chrome.storage.local 封装
│   └── detector.js        # 自动检测已登录 Google 账号
└── icons/                 # 图标资源
    ├── icon.svg           # 扩展图标（SVG 源）
    ├── generate-icons.html # 辅助工具：生成 PNG 图标
    ├── gemini_sparkle.svg # Gemini 官方图标
    └── ai_studio.png     # AI Studio 官方图标
```

## 技术要点

- **Manifest V3** Chrome 扩展，纯 HTML/CSS/JS，无构建步骤
- **权限最小化**：仅 `storage` + `scripting`；检测时按需申请 `google.com` / `accounts.google.com` / `gemini.google.com` 访问权限
- **数据本地化**：身份列表保存在 `chrome.storage.local`，自动检测失效不影响一键打开
- **美学设计**：暗色主题 + acid lime 信号色 + 身份专属色标 + 动画

## 文档

- 设计文档：[`docs/superpowers/specs/2026-06-20-gemini-account-switch-extension-design.md`](docs/superpowers/specs/2026-06-20-gemini-account-switch-extension-design.md)
- UI 设计原型：`mockups/popup.html`、`mockups/settings.html`
