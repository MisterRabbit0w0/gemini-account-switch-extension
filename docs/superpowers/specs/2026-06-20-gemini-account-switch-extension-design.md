# Gemini / AI Studio 账号一键切换扩展 — 设计文档

- 日期：2026-06-20
- 状态：设计已确认，待写实现计划
- 目标浏览器：Chrome（Chromium）

## 1. 背景与目标

打开 `gemini.google.com` / `aistudio.google.com` 时，Google 默认以「当前账号」渲染页面；要换账号得手动点头像 → 切换 → 等待，很繁琐。

本扩展提供一个弹窗，列出用户的多个 Google 身份，**一键直接以指定账号打开**这两个站点，跳过手动切换。

**成功标准**：在弹窗里点「某身份 + Gemini/AI Studio」，新标签页直接以该账号登录态打开对应站点，无需任何手动切换操作。

## 2. 关键前提（已与用户确认）

- 用户主要用 **Chrome**。
- 用户的多个 Google 账号 **已同时登录在同一个 Chrome** 里（点头像能看到完整切换列表）。
- 这两个前提使 `authuser` 方案成立。

## 3. 方案选型与取舍

核心原理：给网址加上 `?authuser=<邮箱>` 或 `/u/<序号>/`，让 Google 直接以指定账号渲染页面。

| 方案 | 结论 | 理由 |
|---|---|---|
| **authuser 注入** | ✅ 采用 | 利用「所有账号都在同一 Chrome」的现状，稳定、零风险、不碰 Google 安全机制 |
| Cookie 交换（模拟独立会话） | ❌ 不用 | 与 Google 的安全令牌对抗，极脆弱、易坏，无必要 |
| 容器隔离（Contextual Identities） | ❌ 不用 | Firefox 独有能力，Chrome 没有 |
| 跨 Chrome profile 打开 | ❌ 不可行 | 扩展无法用其它 profile 打开网址，Chrome 无此 API |

## 4. 技术形态

- **Manifest V3** Chrome 扩展。
- 纯 HTML/CSS/JS，**无构建步骤**（轻量、易维护）。
- **权限最小化**：
  - `storage` —— 保存身份列表与偏好。
  - `https://accounts.google.com/*` 主机权限 —— **仅自动检测时需要**，可在用户点「自动检测」时以可选权限（`optional_host_permissions`）方式申请，不强制。
  - 打开网页用 `chrome.tabs.create({url})`，**不需要** `tabs` 权限。
- 字体：原型用 Google Fonts CDN；**正式版需把字体文件打包进扩展**（CSP/离线/性能），中文回退系统字体（PingFang SC / Microsoft YaHei）。

## 5. 模块拆分

| 模块 | 职责 | 依赖 |
|---|---|---|
| **popup**（`popup.html/js/css`） | 渲染身份列表，每行 `[Gemini] [AI Studio]` 两个按钮，点击直达；空列表与跳转设置的引导 | storage、urlBuilder |
| **options/settings**（`settings.html/js/css`） | 自动检测、增删改、改别名、换色、排序、偏好设置 | storage、detector |
| **urlBuilder** | 纯函数 `(site, identity) -> url`，封装 authuser 拼接规则；单一改动点、可单测 | 无 |
| **detector** | 尽力检测已登录账号，返回 `[{email, index, name?}]`；失败即回退手动 | accounts.google.com |
| **storage** | `chrome.storage.local` 读写薄封装 | 无 |

设计原则：每个模块单一职责、接口清晰、可独立理解与测试。`urlBuilder` 与 `storage` 为纯/薄逻辑，便于单测；UI 与数据获取分离。

## 6. 数据模型

```js
// chrome.storage.local
identities: [
  { id, label, email, index, color }   // 别名 + 邮箱/序号（authuser）+ 色标
]
settings: { openIn: "tab" }            // 默认新标签页打开
```

**关键点：列表持久化保存。** 自动检测只在「初次设置」时联网一次；之后一键打开靠已存的 `email`/`index` 拼 URL。**即使将来检测接口失效，一键打开仍照常工作**，仅需手动维护列表。

## 7. 数据流

- **一键打开**：popup 点击 → 取 identity + site → `urlBuilder.build(site, identity)` → `chrome.tabs.create({ url })`（默认新标签）。
- **初次设置**：settings → 点「自动检测」→ detector 拉取已登录账号 → 预填列表 → 用户改别名/换色/微调 → storage 保存。

## 8. 自动检测（detector）

- **策略**：尽力而为（best-effort），按钮触发，**始终提供手动兜底**。
- **机制（实现期 spike 确定）**：Chrome 无官方 API 列出全部网页登录账号；候选实现为请求 Google 内部接口 `accounts.google.com/ListAccounts`（或在已打开的 Google 标签页用 content script 抓取账号数据）。属未公开接口，未来可能变动。
- **稳定性缓解**：检测结果落地到 `chrome.storage.local`；检测失效不影响已保存身份的打开功能。检测失败时提示「未能自动识别，请手动添加」并展开手动表单。

## 9. URL 构造（urlBuilder）与首要风险

- 优先使用 `?authuser=<邮箱>`（比序号稳定，序号会随登录顺序变化）；必要时回退 `/u/<序号>/` 路径形式。
- 两站基础地址：`https://gemini.google.com/`、`https://aistudio.google.com/`。
- `urlBuilder` 内按站点封装具体拼接规则，作为唯一改动点。

> ⚠️ **首要风险 / 实现第一步必须做的 spike**：需用用户真实登录态实测 `gemini.google.com` 与 `aistudio.google.com` 是否认 `?authuser=`，以及认**邮箱**还是认**序号**。确定 URL 格式后再写正式代码。若某站点不认，回退为打开基础网址（至少能开，只是默认账号），并告知用户调整。

## 10. UI 设计

设计原型见 `mockups/popup.html` 与 `mockups/settings.html`（可在浏览器直接打开预览），已确认采用。

**美学方向：「身份控制台 / Identity Console」**

- 深墨色工具质感（暗色主题，低眩光）；单一信号色 **acid lime `#CBF24E`** 仅用于品牌/焦点/主操作。
- **每个身份一个专属色点/色条**（coral / sky / lime / amber / violet / teal …），使不同身份一眼可辨——兼顾美观与快速识别。
- 字体：展示 **Bricolage Grotesque**，正文 **Hanken Grotesk**，技术标识（邮箱）**JetBrains Mono**；中文回退系统字体。
- 细节：噪点纹理、顶部辉光、卡片错峰入场动画；`prefers-reduced-motion` 时关闭动画；焦点可见（focus-visible）。

**popup（372px 宽，身份为主布局）**

- 顶部：品牌字标 + 副标「Gemini · AI Studio」+ 齿轮（→ 设置页）。
- 每个身份一张卡：专属色条/色点 + 别名（展示字体）+ 邮箱（等宽字体）+ 两个按钮 `Gemini` / `AI Studio`；hover 时按钮背景染身份专属色。
- 底部：「添加身份 / 管理设置」。
- 空列表时显示引导，指向设置页。

**settings（整页）**

- 编辑式大标题 + 原理说明条（讲清 authuser 机制与本地保存）。
- 醒目「自动检测已登录账号」主按钮（含 loading 态）。
- 可编辑身份行：拖动排序手柄、色块（点击换色）、别名 / 邮箱 / authuser 三字段、删除。
- 「手动添加身份」按钮。
- 偏好区：打开方式分段控件（默认「新标签页」）。
- 底部稳定性说明 + 粘性保存栏。

**官方图标（已获取并本地化，见 `mockups/icons/`）**

- Gemini：官方 sparkle SVG（矢量，官方径向渐变 紫 `#9168C0` → 蓝 `#5684D1` → 青 `#1BA1E3`），文件 `gemini_sparkle.svg`（另存官方彩色 PNG `gemini_color.png` 备用）。
- AI Studio：官方品牌图标 PNG（彩色），文件 `ai_studio.png`。
- 两图标在按钮中**保留官方原色**，不随身份色变化。

## 11. 错误处理

- 检测失败 → 提示并回退手动添加表单。
- 身份列表为空 → popup 显示引导「还没有账号，点这里去设置」。
- 某站点不认 authuser → 回退打开基础网址，并提示用户。
- 字段非法（空别名/空邮箱）→ 设置页保存前校验提示。

## 12. 测试策略

- `urlBuilder` 纯函数 → 单元测试（覆盖邮箱/序号、两站点、回退）。
- `storage` → 轻量单测或在扩展内手动验证读写。
- authuser 真实行为、detector → 在 Chrome 里实测（集成/手动）。

## 13. 范围与 YAGNI

**本期范围**

- 仅 `gemini.google.com`、`aistudio.google.com` 两个站点（不做可自定义站点列表）。
- 默认新标签页打开（偏好预留「新窗口」，可后续启用）。
- Chrome（Chromium）；不实现 Firefox 容器。

**明确不做（YAGNI）**

- Cookie 交换 / 真实会话隔离。
- 跨 Chrome profile 打开。
- 键盘快捷键、账号头像抓取等增强项（可作为后续迭代）。

## 14. 开放问题 / 待实现期确认

1. authuser 实测结果（首要 spike，见 §9）。
2. detector 的具体可用实现（ListAccounts 请求 vs content script 抓取）。
