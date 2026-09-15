# 🚀 Guidegram v1.11.1 — Bot Message History & Reply Keyboard Rendering

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Dedicated Proxies, Advanced Group Analytics, and Multi-Chain Community Support.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="150" height="150" />
  <h3>Guidegram v1.11.1</h3>
  <p><strong>Bot Message History Parity • Reply Keyboards Rendering • Session Hardening</strong></p>
</div>

---

## 🌟 Release Highlights

Guidegram v1.11.1 is a targeted stability and feature release optimizing **Telegram Bot Account integration**. This release resolves message history synchronization when operating bot accounts under MTProto restrictions and restores interactive rendering for bot **Reply Keyboards (`replyKeyboardMarkup`)** directly in the chat viewport.

---

## 📦 What's New & Enhancements

### 1. 🤖 Bot Message History Synchronization
- **MTProto Bot History Fallback**: Bypasses Telegram MTProto limitations on `messages.getHistory` for bot accounts by employing direct `messages.getMessages` retrieval coupled with live update tracking.
- **Continuous Message Flow**: Ensures past messages and incoming dialogues load reliably when managing or conversing as a bot account.

### 2. ⌨️ Interactive Bot Reply Keyboards (`replyKeyboardMarkup`)
- **Native Custom Keyboard Layouts**: Restored full UI rendering for custom persistent reply menus sent by bots.
- **One-Click Dispatch**: Clicking reply keyboard options immediately transmits the response to the bot without requiring manual text entry.

### 3. 🛡️ Session Hardening & Account Stability
- **Bot Token Persistence**: Maintained bot token integrity and connection states across restarts.
- **Dialog Cache Reliability**: Preserved dialog list references and last message previews for active bot sessions.

---

## 🐛 Bug Fixes & Stability Improvements
- **Message List Hydration**: Fixed missing dialog message bubbles when logging in via Bot Token.
- **Chat Viewport**: Enhanced keyboard event dispatching and visual state coordination.

---

## 📝 Full Changelog
https://github.com/guidegram/guidegram/compare/v1.11.0...v1.11.1

---

<div align="center">
  <p>Crafted with precision by <strong>DoctorGuidance</strong> & the <strong>Guidegram Team</strong></p>
</div>
