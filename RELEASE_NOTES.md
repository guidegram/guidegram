# 🚀 Guidegram v2.4.2 — Multi-Pinned Messages & Real-Time Sync Edition

> **Private Chat Multi-Pinned Parity & Real-Time Event Architecture** featuring automatic pinned message resolution across all peer types, multi-cycle banner cycling, unified drawer modal with live search, mutual two-way pinning default, and multi-message selection.

---

### 🌟 Release v2.4.2 Highlights

* 📌 **Private Chat Pinned Messages Parity (MTProto Layer 229):**
  * **Automatic Resolution:** Automatically fetches and maps pinned messages in private chats via `inputMessagesFilterPinned`.
  * **Multi-Cycle Top Banner:** Shows pinned counter (`X of Y`), snippet / media badge (`📷 Photo`, `🎙 Voice`, `📹 Video`, `📎 Document`), and smooth jump-and-cycle navigation.
  * **Sender Attribution:** Direct sender names from returned MTProto entity collections (`users` & `chats`).

* 🔄 **Mutual Two-Way Pinning & Drawer Modal:**
  * **Two-Way Pinning Default:** Pins for both participants (`bothSides: true`), matching official Telegram Desktop behavior.
  * **Pinned Messages Drawer:** Modal drawer (`All (N)`) with live search and one-click unpin capability.
  * **Subtle Bubble Indicator:** Amber pin indicator badge on pinned bubbles in chat history.

* ⚡ **Multi-Message Selection & Quick Actions:**
  * Interactive hover checkboxes, continuous multi-selection, and fixed bottom action bar for batch forwarding and management.

* 🤖 **Multiplatform Automated CI Pipeline:**
  * Android APK (`Guidegram-Android.apk` with Java 21 & SDK 36 compatibility).
  * Windows Setup Installer & Portable ZIP.
  * macOS Universal DMG (Apple Silicon + Intel).
  * Linux AppImage.

---
*For past release changelogs, please inspect the git commit history.*
