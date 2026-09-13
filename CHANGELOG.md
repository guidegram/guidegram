# 📜 Guidegram Changelog

All notable changes to the Guidegram desktop client will be documented in this file.

---

## [v1.2.4] — Official Brand Identity & Multi-Resolution Icon Suite (2026-09-09)

### 🎨 Brand Identity & Visual Overhaul
- **Official Mint-Teal Logo**: Rolled out the new brand emblem with supersonic monogram 'G' on mint-teal squircle tile (`#34cca2`).
- **Corner Alpha Transparency**: Clean transparency mask eliminating white square corner boxes on dark and light system themes.
- **Multi-Resolution Windows Icon (`icon.ico`)**: 7-layer embedded ICO (16px to 256px) with unsharp masking for crisp taskbar and system tray presence.
- **Unified Assets**: Standardized `src/assets/logo.png`, `src/assets/icon.png`, `src/assets/icon.ico`, `public/favicon.ico`, and `public/logo.png`.

### 🔄 Dynamic Versioning & System Controls
- **Runtime Version Sync**: Replaced static build-time version displays with live Electron IPC queries (`app:get-version`).
- **Inline Software Updater**: Direct download action with progress bar within the Settings page.

---

## [v1.2.3] — Dynamic Version Sync & Inline Updater Controls

### 🌟 What's New
- **🔄 Dynamic Real-time Version Synchronization**: Connected renderer UI directly to runtime Electron core version via `app:get-version` IPC, completely preventing static bundler cache mismatches.
- **📥 Inline Download & Update Action**: Added direct `Download & Update Now` button, real-time progress bar (download %, extraction stage), and GitHub release links right within the Settings modal.
- **✅ Clear Up-to-Date Status**: Enhanced update status messaging to unambiguously indicate when the running instance is completely up to date.

---

## [v1.2.2] — Telegram Premium Animation, Profile Power & Schema Evolution

### 🌟 What's New
- **✨ Fluid Animated Telegram Premium Custom Emojis**: Native vector Lottie rendering engine (`lottie-web`) with automatic GZIP decompressor for Telegram `.tgs` animated sticker and emoji packs.
- **⭐ Premium Custom Emoji Status**: Direct MTProto document resolution and real-time animated display of emoji status badges beside user names across both the Chat List and Chat Viewport header.
- **👤 Enhanced User Profile Intelligence**: Comprehensive MTProto UserFull entity extraction displaying user's pinned Personal Channel (with 1-click external navigation), received Star Gifts count, and Birthday dates.
- **📥 System Tray Docking & Minimization**: Restores complete system tray integration ("Show hidden icons" area) with zero taskbar clutter upon window minimization.
- **🧠 MTProto Protocol Integration**: Enhanced protocol method mapping and comprehensive schema coverage across all MTProto namespaces.

---

## [v1.2.1] — Updater Resilience & Hotfix Release

### 🌟 What's New
- **🔄 Ultra-Resilient Portable Auto-Updater**: Automated lingering process cleanup, file-lock verification via .NET stream checks, atomic file-by-file extraction, and guaranteed post-update relaunch without session disruption.
- **🏷️ Synchronized Build Versioning**: Unified dynamic application version resolution across TitleBar, Settings, and MainMenuDrawer.
- **🛡️ Process Concurrency Protection**: Fixed Windows process locks preventing in-app update replacement.

---

## [v1.2.0] — Major UX & Media Evolution

### 🌟 What's New
- **🎬 Revamped Video Player & Streaming**: Interactive pause/resume/cancel controls, live accurate percentage/MB progress, playback speed controls, and verified preview thumbnails.
- **🖼️ High-Reliability Media Rendering**: Corrected protocol encoding for Windows local paths, preventing broken image placeholders.
- **✨ Full Premium Custom Emoji Support**: Animated and custom emoji rendering without falling back to basic unicode.
- **🤖 Bot Inline Keyboards & Menu**: Dedicated glass keyboard layout under messages, accurate row/col callback dispatch, and dedicated bot menu actions.
- **🔤 Modern Persian/Arabic & Latin Typography**: Beautiful Vazirmatn font for Persian/Arabic and Open Sans/Segoe UI for Latin text.
- **🔇 Neutral Muted Badges & Senders Count**: Clear muted chat indicators and distinct senders count for unread group messages.
- **📊 Advanced Group Analytics**: 6-tab analytics modal covering active users, peak discussion hours, message volume, keywords, top emojis, and member join history.

---

## [v1.1.2] — Icon & Asset Consistency Hotfix

### 🌟 What's New
- **🖼️ Official 3D Metallic Neon Logo Packaging**: Replaced draft placeholder icons with the official 3D metallic neon cyan badge (`src/assets/logo.png`) across all application binaries, executables, metadata, and taskbar icons.
- **Embedded Asset Synchronization**: Updated fallback DataURLs and extraResources configuration.
- **Polished Documentation**: Updated release notes and unified branding footers.

---

## [v1.1.1] — Hotfix & UX Polish

### 🌟 What's New
- **🖼️ Official 3D Neon Logo Everywhere**: Resolved icon discrepancy by using the official 3D metallic neon cyan badge from src/assets/logo.png across System Tray, Taskbar, Window, and Desktop executables.
- **🖼️ System Tray & Taskbar Icon Visibility**:
  - Resolved root-cause path resolution error (
esources/resources) in packaged Windows builds that previously caused Electron to create an empty transparent system tray icon slot.
  - Ensured mainWindow explicitly receives high-resolution NativeImage icon on creation.
  - Fail-safe embedded base64 DataURL fallback for the official Guidegram icon so tray and taskbar icons never appear blank.
  - Added xtraResources mapping in lectron-builder.json guaranteeing icon assets are unpacked on disk.
- **📊 Real-Time Download Progress & Status Feedback for Updates**:
  - Live progress bar displaying current download percentage (0% - 100%).
  - Shows exact downloaded megabytes vs total package size (e.g. 45.2 MB / 94.8 MB).
  - Stage tracking: Downloading update..., Extracting update files..., and Restarting Guidegram....
  - Reassuring guidance indicating user session data remains 100% untouched.

---

## [v1.1.0] — Modern Telegram Desktop Parity & Next-Gen Power Features

### 🌟 What's New
- **⚡ Parallel Chunk Download Acceleration (Up to 3x Faster)**: Multi-worker MTProto pipeline engaging 4 parallel concurrent MTProto workers for large media and videos (> 2MB).
- **🛡️ Advanced Session & Device Profile Isolation**: Enhances workstation environment security with authentic device profile presets per account.
- **📌 Multi-Cycle Pinned Messages & Dedicated Search Drawer**: Cycle smoothly through pinned messages with counter indicators (1 of N) + dedicated searchable pinned messages drawer.
- **📝 Large Text Auto-Splitter & .txt File Converter**: Automatic detection when text exceeds 4,096 characters with 1-click option to send as .txt or split into sequential chunks.
- **🤖 AI Composer Text Assistant**: Contextual AI writing assistant with professional rephrasing, grammar fixes, summarization, and expressive emoji enhancements.
- **🎨 Floating Contextual Formatting Toolbar & Spoilers**: Quick floating toolbar for bold, italic, code, strikethrough, quote, link, and interactive click-to-reveal spoilers (||...||).
- **🔍 In-Chat Search Highlighting & Match Navigation**: In-bubble term highlight with jump navigation and keyboard shortcuts.
- **⏰ Silent Messages & Scheduled Sending Modal**: Send without sound and schedule messages with flexible presets.
- **⚡ 64Gram-Inspired Power Features**: Chat ID & Message ID badges, seconds in message timestamps, quick forward to Saved Messages, group avatars, and inline button inspection.
- **👁️ Ghost Mode & BiDi/RTL Typography**: Suppress read receipts and native Persian/Arabic RTL detection.

---

## [v1.0.0] — Initial Release

- Initial public release of Guidegram portable multi-account desktop Telegram client.
