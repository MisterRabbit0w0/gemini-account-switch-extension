# Gemini / AI Studio Account Quick Switch Extension

**English** | [简体中文](./README.zh-CN.md)

A Chrome extension that lists your multiple Google identities in a popup, allowing you to **open `gemini.google.com` / `aistudio.google.com` directly with a chosen account in one click** — no more manually switching via the avatar menu.

## How It Works

Leverages Google's built-in multi-account mechanism by appending `?authuser=<email>` (or `/u/<index>/`) to the URL, so Google renders the page under the specified account directly. Prerequisite: all accounts must be signed in within the same Chrome browser.

## Installation & Usage

1. **Load the Extension**: Open Chrome → `chrome://extensions/` → Enable "Developer mode" → "Load unpacked" → Select the `src/` directory.
2. **Set Up Identities**: Click the extension icon → gear icon or "Manage Settings" → Add your Google accounts.
3. **Switch in One Click**: Click the extension icon, then hit the `Gemini` or `AI Studio` button on an identity card.

## Project Structure

```
src/
├── manifest.json          # Chrome MV3 manifest
├── popup.html/css/js      # Popup page (identity list + one-click open)
├── settings.html/css/js   # Settings page (CRUD identities + auto-detect + preferences)
├── lib/
│   ├── urlBuilder.js      # URL builder (authuser parameter assembly)
│   ├── colors.js          # Shared identity color palette constants
│   ├── storage.js         # chrome.storage.local wrapper
│   └── detector.js        # Auto-detect signed-in Google accounts
└── icons/                 # Icon assets
    ├── icon.svg           # Extension icon (SVG source)
    ├── generate-icons.html # Helper tool: generate PNG icons
    ├── gemini_sparkle.svg # Gemini official icon
    └── ai_studio.png     # AI Studio official icon
```

## Technical Highlights

- **Manifest V3** Chrome extension — pure HTML/CSS/JS, zero build steps
- **Minimal Permissions**: only `storage` + `scripting`; host permissions for `google.com` / `accounts.google.com` / `gemini.google.com` are requested on demand during detection
- **Local Data Storage**: identity list is stored in `chrome.storage.local`; auto-detection failures do not affect one-click switching
- **Aesthetic Design**: dark theme + acid lime accent color + per-identity color badges + animations

## Documentation

- Design Document: [`docs/superpowers/specs/2026-06-20-gemini-account-switch-extension-design.md`](docs/superpowers/specs/2026-06-20-gemini-account-switch-extension-design.md)
- UI Design Prototypes: `mockups/popup.html`, `mockups/settings.html`
