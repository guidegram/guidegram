# 🚀 Guidegram v1.11.2 — Instant Startup Caching, High-Res Avatars & Typography Polish

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Dedicated Proxies, Advanced Group Analytics, and Multi-Chain Community Support.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="150" height="150" />
  <h3>Guidegram v1.11.2</h3>
  <p><strong>Instant Disk Caching • Crisp High-Res Avatars • Local Typography Assets</strong></p>
</div>

---

## 🌟 Release Highlights

Guidegram v1.11.2 introduces high-performance **instant startup caching** for all dialog lists, eliminates low-resolution profile photo blur with an automated **HD avatar downloader**, bundles **local Persian font assets** with resilient fallback, and optimizes **message list scroll performance**.

---

## 📦 What's New & Enhancements

### 1. ⚡ Instant Disk Dialog Caching
- **Sub-10ms App Startup**: Cached dialog items are read directly from persistent disk storage (`data/cache/dialogs_${accountId}.json`) during initial launch, displaying conversations immediately without waiting for MTProto network round-trips.
- **Background Synchronization**: Live messages, drafts, and incoming updates sync seamlessly in the background without freezing or blocking the user interface.

### 2. 🖼️ Crisp High-Resolution Profile Photos
- **Cache Poisoning Resolution**: Fixed an issue where tiny 20x20 blurred preview thumbnails (`strippedThumb`) were treated as cached avatars, preventing full image retrieval.
- **HD Avatar Downloader**: Downloads crisp 160x160 profile photos (`peer.photo.small`) directly via Telegram MTProto and caches them to disk (`data/avatars/`).
- **Smooth Progressive Transition**: Displays lightweight blurred previews momentarily as placeholders while smoothly swapping in crystal-clear photos once retrieved.

### 3. 🔤 Local Persian Typography & BiDi Fallback
- **Bundled Vazirmatn Fonts**: Integrated local Vazirmatn font assets with automatic CDN caching fallback.
- **Bilingual Typographic Harmony**: Preserves accurate LTR numbers and English segments within Persian conversations.

### 4. 🚀 Scroll & Layout Performance
- **Zero Layout Thrashing**: Streamlined virtualized message viewport measurements for buttery 60fps scrolling.
- **Debounced Audit Persistence**: Minimized disk I/O during heavy message streams.

---

## 📝 Full Changelog
https://github.com/guidegram/guidegram/compare/v1.11.1...v1.11.2

---

<div align="center">
  <p>Crafted with precision by <strong>DoctorGuidance</strong> & the <strong>Guidegram Team</strong></p>
</div>
