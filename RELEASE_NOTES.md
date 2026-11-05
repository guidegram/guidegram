# 🚀 Guidegram v2.6.1 — Core Chat Parity, Reliable Notifications & System Integration Fixes

> **Maintenance & Reliability Release:** Essential fixes for desktop notification reliability, inline bot keyboards, external link handling on Windows, and streamlined chat pin navigation.

---

### 🌟 What's New & Fixed in v2.6.1:

* **🔔 Private Chat & Peer Notification Reliability:**
  - Resolved private chat notification drop by eliminating sign confusion between raw peer IDs and internal chat keys.
  - Fully wired `toggleChatNotifications` to synchronize mute states bidirectionally with Telegram cloud.

* **🤖 Bot Inline Keyboard & Callback Query Engine:**
  - Fixed inline keyboard callback query dispatch so clicking inline action buttons under bot message bubbles triggers MTProto callbacks instead of inadvertently posting the button text as a chat message.
  - Added support for Copy action buttons and improved fallback peer resolution for bot interactions.

* **🌐 Robust Windows External Link Opening:**
  - Normalizes external URLs and implements multi-tier fallback (Electron `shell.openExternal` → PowerShell `Start-Process` → cmd `start`) to ensure external links open reliably without browser timeouts or silent failures.

* **📌 Streamlined Pinned Message Bar & Jump Navigation:**
  - Redesigned the pinned message bar into a compact, space-efficient single-line banner.
  - Enhanced the scroll-to-message jump behavior for instant smooth navigation to pinned context.
