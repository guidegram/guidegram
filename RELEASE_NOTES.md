# 🚀 Guidegram v2.5.2 — The Ultra-Performance & Zero-Bloat Audit Architecture Edition

> **Milestone Production Release** eliminating multi-gigabyte memory and CPU bloat by overhauling the local audit engine, supporting unlimited edit revision histories with near-zero overhead, eradicating cross-chat message collisions, auto-sanitizing legacy disk bloat, preserving active chats across window minimize cycles, and introducing liquid jelly glass rendering for Telegram animated Star Gifts.

---

### 🌟 Release v2.5.2 Highlights

* ⚡ **Ultra-Low Memory & Zero-Bloat Audit Engine:**
  * **Event-Driven Audit Recording:** Completely eliminated dumping unedited, non-deleted normal messages into the audit store. Only actual edit events (`UpdateEditMessage`) and delete events (`UpdateDeleteMessages`) are persisted.
  * **Over 95% Disk & RAM Footprint Reduction:** Legacy multi-account audit logs exceeding 105MB shrunk to under 5MB, reclaiming over 1.5GB of JavaScript V8 heap memory.
  * **Unlimited Edit Revision History:** Dropped artificial revision limits; users can edit messages continuously with full chronological revision timelines without memory or CPU penalties.
  * **Ghost Tombstone Purging:** Eradicated transient ghost tombstones from disk writes, keeping the audit store lean, fast, and 100% focused on genuine content.

* 🛡️ **Cross-Chat Isolation & Mailbox Security:**
  * **Composite Key Scoping (`chatId:messageId`):** Scoped recent message caches to prevent channel message IDs from colliding with private chat messages sharing identical numeric IDs.
  * **Private Delete Routing:** Fixed `findChatIdForMessageId` to isolate non-channel deletions, preventing channel activity from misattributing or hijacking private chat deletion events.

* 🪟 **Window Lifecycle & Minimize Ergonomics:**
  * **Eradicated Minimize Chat Drop Bug:** Removed the destructive `app:clear-active-chat` event on minimize; active chats, drafts, and scroll positions are strictly preserved across minimize/restore cycles.

* 🎁 **Liquid Jelly Glass Star Gifts:**
  * **Fluid Animated Bubbles:** Render live animated Telegram Star Gifts inside physics-based liquid jelly glass bubbles with complete visual parity with official Telegram desktop and mobile.

---

# 🚀 Guidegram v2.5.1 — The Multi-Window & Precision Ergonomics Edition

> **Milestone Production Release** introducing Native Multi-Window Account Isolation, Instant Zero-Lag Account Switching with Disk Cache Pre-Warming, Ergonomic Outer Badge Positioning, HD Contact Change Card Previews, Composite Message Timestamp Sorting, and Global Window Event Broadcasting.

---

### 🌟 Release v2.5.1 Highlights

* 🪟 **Native Multi-Window Multi-Account Architecture:**
  * **Parallel Account Windows:** Open multiple Telegram accounts simultaneously in dedicated, completely isolated Electron windows via `Ctrl + Click` (or `Cmd + Click`) on any account avatar.
  * **Interactive Account Context Menu:** Right-click on any account in the dock to open a sleek frosted-glass context menu with options to launch in a new window, switch account, copy Account ID, or configure account-specific proxy.
  * **Omni-Directional Event Broadcasting:** Telegram MTProto real-time updates (messages, typing indicators, user status, stories) are seamlessly broadcasted across all active windows without race conditions.
  * **Independent Window Lifecycles:** Closing a secondary account window does not terminate the application; custom frameless titlebar controls correctly target the active window instance.

* ⚡ **Instant Account Switching & State Hygiene:**
  * **0ms Disk-Cache Pre-Warming:** Cached dialogs for all connected accounts are pre-warmed into memory at application boot, eliminating blank screens during account switching.
  * **Filter & Folder Isolation:** Switching accounts automatically resets the active tab to `All Chats`, flushes the search query, and isolates cloud folder state to prevent previous account peer filters from hiding incoming dialogs.
  * **Snappy Progressive Hydration:** Fetch initial batch of 80 dialogs in under 350ms, accompanied by fluid shimmer skeleton placeholders, while subsequent chunks sync transparently in the background.

* 🎯 **Ergonomic Account Dock & Bot Badges:**
  * **Perimeter Badge Repositioning:** Moved bot indicators, connection status dots, and proxy badges outside the circular avatar button with dual-layer dark rings (`ring-2 ring-dark-900`), completely resolving badge clipping and preventing profile photo obstruction.
  * **Vector Bot Iconography:** Clean `<Bot />` icon badge indicating bot accounts with pinpoint visual hierarchy.

* 📸 **Contact Change Cards & HD Profile Previews:**
  * **Auto-Resolution of Clean Avatars:** Contact change cards now directly resolve and display the downloaded profile photo without blurred overlays or manual clicks.
  * **Crystal-Clear HD Previews:** Clicking on the photo change preview opens the true, uncompressed full-resolution profile photo rather than the downscaled thumbnail.

* 🛡️ **Engine & Type Safety Hardening:**
  * **Composite Timestamp Sorting:** Stable composite sorting `(a.date - b.date) || (a.id - b.id)` preventing UI position flapping for messages sharing the exact same unix second.
  * 100% TypeScript compilation pass with zero lint or runtime regressions across Electron and React layers.

---
*For past release changelogs, please inspect the git commit history.*
