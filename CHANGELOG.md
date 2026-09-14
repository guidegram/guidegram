# 📜 Guidegram Changelog

All notable changes to the Guidegram desktop client are documented in this file.

---

## [v1.10.0] — Group Voice & Video Calls, Mini Apps Host, Saved Messages 2.0 & Telegram Business (2026-09-14)

### 🌟 What's New & Enhancements
- **📞 Group Voice & Video Calls UI**: Real-time group calls interface with interactive active-speaker visualizer, fluid grid layout for video feeds, microphone/camera controls, and persistent top status bar (`GroupCallBar`).
- **🌐 Telegram Mini Apps (TWA) Host**: Native in-app WebView modal (`MiniAppModal`) and standalone multi-window support for Telegram Mini Apps, fully integrated with MTProto `messages.requestWebView`.
- **💾 Saved Messages 2.0**: Dual-pane source filtering, chat tags navigation, and reactive source drawer (`SavedMessagesBar`) for organizing and finding saved notes and forwarded media.
- **💼 Telegram Business Suite**: Integrated Business management dashboard in Settings with greetings, away hours scheduler, location pin, and custom business chat links.
- **🛡️ Channel & Supergroup Admin Log**: Dedicated Admin Log modal (`AdminLogModal`) with chronological event timeline, filter tabs, and admin action audit history via MTProto `channels.getAdminLog`.
- **📊 Interactive Polls & Quizzes**: Full native support for voting on polls and quizzes, creating multiple-choice polls with anonymous and quiz modes, and viewing solution explanations.
- **⭐ Telegram Stars & Paid Media**: Direct visual rendering for paid media posts and star reactions with custom reaction counter modal (`PaidReactionModal`).
- **☁️ Cloud Drafts Synchronization**: Live synchronization of uncompleted message drafts across MTProto sessions with debounce auto-saving and visual draft indicators in the chat list.
- **🎙️ 5-Bit MTProto Voice Waveform Decoder**: Native unpacking of Telegram's 5-bit compressed audio waveforms, interactive seeking scrubber, and sticky audio player banner.
- **📁 Shared Media Gallery Drawer**: Complete 5-tab gallery drawer (Media, Files, Links, Music, Voice) with infinite scrolling and MTProto filter mapping.
- **🚀 Multi-DC Turbo Download Engine**: High-concurrency parallel downloading across Telegram data centers, optimizing transfer speeds for large files and videos.
- **🔒 Userspace Cloudflare WARP Bridge**: Integrated direct userspace WARP data-plane tunnel with automatic fallback and per-account proxy distribution.
- **📝 Anti-Delete Audit Log & Message Edit History**: Client-side audit tracking for deleted messages and live historical revision inspector for edited messages.
- **⚡ Advanced No-Quote Forwarding & Analytics Export**: Forward messages without quote attribution and export group analytics datasets directly to JSON/CSV.

### 🐛 Bug Fixes & Stability
- **Messages**: Restored and optimized reply context pre-fetching in `getMessages` to eliminate missing quote references.
- **UI & Chat Viewport**: Harmonized blockquote styles, unified group sender avatars, and restored instant blurred media previews.
- **Media Streaming**: Implemented HTTP 206 byte-range slicing in media protocol fallback for smoother seeking.
- **Network Resilience**: Enhanced per-account proxy isolation, dynamic bubble geometry theming, and reconnect exponential backoff.

---

## [v1.9.0] — Rich Reply Previews, Instant Media & Core UI Polish (2026-09-14)

### 🌟 What's New & Enhancements
- **💬 Rich Authentic Reply Banners**: Reply quote banners now render authentic Telegram-style previews with matching peer-colored vertical borders and author names, square media thumbnails, and descriptive badges (`• Voice message` with cyan indicator, `Photo`, `Video`, `Sticker`, `Document`, or exact quote text).
- **⚡ Instant Blurred Media Previews**: Reconstructed JFIF JPEG streams directly from MTProto `photoStrippedSize`, giving photos, videos, and stickers instant blurred previews without waiting for full downloads.
- **🚀 Non-Blocking Performance Architecture**: Converted internal file logger to an asynchronous batching queue and removed render-side download dispatches, eliminating UI freezes, stutter, and frame drops.
- **👥 Group Mention Autocomplete**: Typing `@` in group chats displays an interactive member suggestion popup querying group participants and recent senders. Added `@username` badges in group message headers.
- **🖼️ Full-Resolution HD Profile Viewer**: Avatars in Chat Info and User Profile drawers now fetch HD profile photos (`isBig: true`) on demand and open directly in the full-screen Lightbox.
- **🤖 Bot Inline Keyboards & Dynamic Menus**: Native rendering of bot inline markup keyboards (URLs, callback actions) and permission-filtered bot command menus.

### 🐛 Bug Fixes & Stability
- **Scheduled Messages**: Hidden the scheduled messages button in broadcast channels or restricted chats where the current account lacks posting permissions.
- **Unread Message Counter**: Corrected `maxId` handling in MTProto `readHistory` calls and added immediate optimistic zeroing of unread counters upon viewing a conversation.
- **Installer Process Safety**: Added automatic termination of lingering background Guidegram instances in NSIS installer pre-init/un-init hooks, preventing file locks and installer hangs.

---

## [v1.8.0] — High-Performance Engine & Community Support (2026-09-13)

### 🌟 What's New & Enhancements
- **⚡ High-Performance Protocol Engine**: Migrated core client connectivity to a pure TypeScript protocol architecture, improving connection establishment, memory footprint, and media streaming reliability.
- **📊 Progressive Group Analytics Crawler**: Interactive message history crawler with real-time sync progress tracking and responsive timeframe insights.
- **💎 Multi-Chain Community Support**: Integrated community support modal with 1-click address copy and QR codes for TON, USDT, and TRON networks.
- **✨ Interface & Timestamp Polish**: Synchronized real-time message date boundaries, normalized locale time formats, and refined unread sender counts.

### 🐛 Bug Fixes & Stability
- **Chat Viewport**: Corrected real-time date change separators and timestamp normalization during continuous chat sessions.
- **Group Analytics**: Enhanced timeframe selection stability and background batch pagination.
- **Navigation**: Cleaned up unread senders badge display on conversation items for improved readability.
- **Maintenance**: Harmonized documentation, changelog entries, and release packages with user-centric standards.

---

## [v1.7.0] — Seamless Updates & Brand Refresh (2026-09-12)

### 🌟 What's New & Enhancements
- **⚡ Seamless In-App Updates**: Optimized background update workflow with automated verification and smooth restart execution.
- **🎉 "What's New" Celebration Modal**: Interactive welcome dialog greeting users after each update with key feature highlights.
- **🎨 Mint-Teal Brand Palette Alignment**: Harmonized UI color scheme reflecting the official Guidegram mint-teal styling.
- **🔐 Session Connectivity & Channel Sync**: Enhanced QR authentication cycles and reliable broadcast channel mute and alert synchronization.
- **✨ Interface Polish**: Cleaned up navigation drawer menus, refined badge styling, and improved action button contrast.

### 🐛 Bug Fixes & Stability
- **Notifications**: Ensured broadcast channel mute states and notification settings synchronize reliably.
- **Updater**: Improved update state validation and application restart handling.
- **Navigation**: Cleaned up drawer menu hierarchy and eliminated legacy indicators.
- **Maintenance**: Updated official repository references and documentation endpoints.

---

## [v1.6.0] — Multi-Account Dock & Performance Optimization (2026-09-11)

### 🌟 What's New
- **📱 Unlimited Multi-Account Dock**: Fluid vertical account switcher supporting concurrent sessions with dedicated per-account proxies.
- **🔒 Dedicated Proxy Isolation**: Independent network proxy configurations per account supporting SOCKS5, HTTP, and MTProto.
- **⚡ Download Acceleration**: Multi-stream media pipeline for fast video and file transfers.
- **📊 Group Analytics Intelligence**: Embedded engagement statistics, hourly activity trends, and active contributors rankings.

---

## [v1.2.4] — Official Brand Identity & Visual Assets (2026-09-09)

### 🎨 Brand Identity & Visual Overhaul
- **Official Mint-Teal Emblem**: Rolled out the new brand emblem with monogram on mint-teal squircle tile.
- **Alpha Transparency Masking**: Clean transparency eliminating background borders on dark and light system themes.
- **Multi-Resolution Windows Icons**: Crisp, multi-layer icon packaging for taskbar and system tray presence.
- **Unified Brand Assets**: Standardized logo and favicon assets across the entire application interface.

### 🔄 Dynamic Versioning & System Controls
- **Live Version Synchronization**: Connected interface displays directly to runtime application core version.
- **Inline Software Updater**: Direct download action with progress indicators within the Settings page.

---

## [v1.2.3] — Dynamic Version Sync & Inline Updater Controls (2026-09-08)

### 🌟 What's New
- **🔄 Real-Time Version Synchronization**: Real-time runtime version resolution preventing cached version mismatches.
- **📥 Inline Download & Update Action**: Added direct update action button, download progress indicator, and release references in Settings.
- **✅ Clear Up-to-Date Feedback**: Enhanced update status messaging clearly indicating when the client is running the latest release.

---

## [v1.2.2] — Telegram Premium Animation & Profile Power (2026-09-08)

### 🌟 What's New
- **✨ Fluid Animated Premium Custom Emojis**: Native vector animation rendering for custom emoji packs and animated stickers.
- **⭐ Premium Custom Emoji Status**: Real-time animated emoji status badges displayed beside user names in chat lists and headers.
- **👤 Enhanced User Profile Intelligence**: View pinned personal channels, received gifts count, and birthday info directly on profile views.
- **📥 System Tray Minimization**: Seamless system tray integration with minimal taskbar clutter upon window minimization.
- **🧠 MTProto Protocol Integration**: Enhanced protocol method coverage and robust connection management.

---

## [v1.2.1] — Updater Resilience & Hotfix Release (2026-09-07)

### 🌟 What's New
- **🔄 Resilient In-App Updater**: Automated background validation and guaranteed post-update relaunch without session disruption.
- **🏷️ Synchronized Build Versioning**: Unified dynamic application version display across TitleBar, Settings, and navigation menus.
- **🛡️ Concurrency Protection**: Prevented application file access conflicts during background updates.

---

## [v1.2.0] — Major UX & Media Evolution (2026-09-06)

### 🌟 What's New
- **🎬 Revamped Video Player & Streaming**: Interactive playback controls, live progress tracking, playback speed controls, and preview thumbnails.
- **🖼️ High-Reliability Media Rendering**: Robust media loading and caching for local and remote images.
- **✨ Full Premium Custom Emoji Support**: Animated and custom emoji rendering across all chats and messages.
- **🤖 Bot Inline Keyboards & Menu**: Dedicated glass keyboard layout under messages with interactive callback dispatch.
- **🔤 Modern Typography**: Refined Vazirmatn font for Persian/Arabic and clean Latin font hierarchy.
- **🔇 Neutral Muted Badges & Senders Count**: Clear muted chat indicators and distinct senders count for unread group messages.
- **📊 Advanced Group Analytics**: 6-tab analytics suite covering active members, peak hours, message volume, keywords, and join history.

---

## [v1.1.2] — Icon & Asset Consistency Hotfix (2026-09-05)

### 🌟 What's New
- **🖼️ High-Resolution Logo Packaging**: Packaged crisp official branding across all application executables, metadata, and taskbar icons.
- **Embedded Asset Synchronization**: Refined asset bundling configuration.
- **Polished Documentation**: Updated release notes and unified brand guidelines.

---

## [v1.1.1] — System Tray & Notification Polish (2026-09-04)

### 🌟 What's New
- **🖼️ System Tray Icon Visibility**: Resolved system tray icon rendering in Windows environments with high-resolution fallback icons.
- **📊 Real-Time Download Progress Feedback**: Live progress bar displaying download percentage and stage tracking during in-app updates.
- **🛡️ Session Safety**: Ensured local account sessions and preferences remain completely untouched during updates.

---

## [v1.1.0] — Desktop Power Features & Productivity Suite (2026-09-03)

### 🌟 What's New
- **⚡ Parallel Download Acceleration**: Multi-stream download engine for large media and videos (> 2MB).
- **🛡️ Advanced Session & Device Profile Isolation**: Distinct workstation environment presets per account for clean multi-session isolation.
- **📌 Multi-Cycle Pinned Messages & Search Drawer**: Cycle through pinned messages with counter indicators and dedicated search drawer.
- **📝 Large Text Auto-Splitter**: Automatic detection when text exceeds character limits with options to send as file or sequential messages.
- **🤖 AI Composer Assistant**: Contextual writing assistant with professional rephrasing, grammar fixes, and summarization.
- **🎨 Floating Contextual Formatting Toolbar**: Quick formatting toolbar for bold, italic, code, strikethrough, quote, link, and spoilers.
- **🔍 In-Chat Search Highlighting**: In-bubble term highlight with jump navigation and keyboard shortcuts.
- **⏰ Silent & Scheduled Messages**: Send without sound and schedule messages with flexible presets.
- **⚡ Power Tools**: Chat ID & Message ID badges, seconds in message timestamps, and quick forward shortcuts.
- **👁️ Ghost Mode & BiDi/RTL Typography**: Optional read receipt suppression and native Persian/Arabic RTL text alignment.

---

## [v1.0.0] — Initial Release (2026-09-01)

- Initial public release of Guidegram portable multi-account desktop Telegram client.
