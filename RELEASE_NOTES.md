# 🚀 Guidegram v1.11.3 — Unread Count Parity & Read History Synchronization

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Dedicated Proxies, Advanced Group Analytics, and Multi-Chain Community Support.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="150" height="150" />
  <h3>Guidegram v1.11.3</h3>
  <p><strong>Unread Counter Parity • Outgoing Filtering • MTProto Read Sync</strong></p>
</div>

---

## 🌟 Release Highlights

Guidegram v1.11.3 delivers complete **unread counter parity** with official Telegram clients, eliminates unread badge inflation caused by **outgoing message events**, improves **channel ID normalization** in raw MTProto updates, adds support for **manual dialog read marks**, and guarantees immediate **disk cache synchronization** across app restarts.

---

## 📦 What's New & Enhancements

### 1. 📬 Outgoing Message Filtering in Real-Time Feed
- **Eliminate Unread Count Inflation**: Real-time incoming update listener now explicitly filters out outgoing messages (`isOutgoing: true`), ensuring that messages you send from other Telegram apps never inflate the unread counter in Guidegram.
- **Accurate Bot Dialog Counters**: Solved the issue where rapid back-and-forth conversations with bots caused badge numbers to skyrocket unexpectedly.

### 2. 🔄 Channel ID Normalization in MTProto Updates
- **Strict Supergroup/Channel Matching**: Normalized channel identifiers to always use the `-100` prefix in raw `updateReadChannelInbox` handlers, guaranteeing that read receipts across devices accurately map to channel dialogs.

### 3. 🏷️ Native Dialog Unread Mark Support
- **Multi-Device Parity**: Integrated support for MTProto `updateDialogUnreadMark` events, allowing manual "Mark as read" and "Mark as unread" actions taken on other devices to be reflected instantly.

### 4. 💾 Immediate Disk Cache Synchronization
- **Zero Stale Badges on Restart**: Whenever `markAsRead` is invoked or read history events arrive, the local disk dialogs cache (`dialogs_${accountId}.json`) is updated immediately, preventing old unread badges from reappearing after an app restart.

### 5. ⚡ Responsive Initial Chat View Read Sync
- **No-Scroll Required**: Opening a conversation that is already at the bottom automatically triggers read synchronization without waiting for a manual scroll interaction.

---

## 📝 Full Changelog
https://github.com/guidegram/guidegram/compare/v1.11.2...v1.11.3

---

<div align="center">
  <p>Crafted with precision by <strong>DoctorGuidance</strong> & the <strong>Guidegram Team</strong></p>
</div>
