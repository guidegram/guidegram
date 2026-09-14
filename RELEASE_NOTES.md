# 🚀 Guidegram v1.9.0 — Rich Reply Previews, Instant Media & Performance Engine

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Dedicated Proxies, Advanced Group Analytics, and Multi-Chain Community Support.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="150" height="150" />
  <h3>Guidegram v1.9.0</h3>
  <p><strong>Rich Reply Previews • Instant Blurred Thumbnails • Non-Blocking Logger • Member Mentions • Zero Lag</strong></p>
</div>

---

## 🌟 Release Highlights

Guidegram v1.9.0 brings a major visual and performance upgrade: authentic Telegram reply banners with peer-colored borders and names, instant blurred previews for photos and stickers using low-overhead JFIF header reconstruction, complete elimination of UI stutter via an asynchronous non-blocking event-loop logger, group member `@` mention autocomplete, and full-resolution HD user avatar viewing.

---

## 📦 What's New & Enhancements

### 1. 💬 Authentic Rich Reply Banners
- **Peer-Colored Vertical Borders & Names**: Quotes match Telegram's exact 7-color palette mapped to the original author's identity.
- **Square Mini Thumbnails**: Direct visual preview of replied photos, videos, and stickers.
- **Descriptive Media Badges**: Distinguishes voice messages (`• Voice message` with cyan indicator), photos, videos, stickers, and documents instead of generic fallback numbers.

### 2. ⚡ Instant Blurred Media Previews
- **Zero-Wait JFIF Reconstitution**: Re-attaches standard JPEG headers to Telegram's raw `photoStrippedSize` byte buffers, rendering instant previews directly without waiting for full media downloads.
- **On-Demand Loading**: Interactive, clean download placeholders with file size indicators.

### 3. 🚀 Non-Blocking Performance & Zero Freezes
- **Asynchronous Batch Logging**: Replaced synchronous disk file writes with an asynchronous batching queue, keeping the main process responsive during high-volume MTProto traffic.
- **Render-Side Decoupling**: Eliminated synchronous IPC calls inside React render loops, preventing UI frame drops and freezing.

### 4. 👥 Group Mentions & Member Autocomplete
- **Live Autocomplete**: Typing `@` in group chats displays an interactive member suggestion dropdown querying both group participants and recent senders.
- **Sender Usernames**: Displays `@username` handles alongside sender names in group message headers.

### 5. 🖼️ Full-Resolution HD Profile Viewer
- **On-Demand HD Photos**: Added support for fetching full-resolution profile photos (`isBig: true`) for channels, groups, and individual contacts.
- **Lightbox Integration**: Clicking the avatar in Chat Info or User Profile drawers opens the HD photo in full screen.

### 6. 🤖 Bot Inline Keyboards & Dynamic Menus
- **Interactive Action Buttons**: Full support for Telegram bot inline keyboards (URL buttons and callback queries).
- **Permission-Aware Bot Menus**: Dynamic command menu rendering based on bot capability definitions.

---

## 🐛 Bug Fixes & Stability Improvements
- **Scheduled Messages**: Hidden the scheduled messages action button in channels where the user lacks posting rights.
- **Unread Sync**: Corrected `maxId` in MTProto `readHistory` calls and added immediate local counter clearing on chat open.
- **Installer Process Safety**: Added automatic termination of lingering background Guidegram instances in NSIS installer pre-init and un-init hooks to prevent Windows file locking.

---

## 📝 Full Changelog
https://github.com/guidegram/guidegram/compare/v1.8.0...v1.9.0

---

<div align="center">
  <p>Crafted with precision by <strong>DoctorGuidance</strong> & the <strong>Guidegram Team</strong></p>
</div>
