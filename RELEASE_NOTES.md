# 🚀 Guidegram v1.10.0 — Group Calls, Mini Apps Host, Saved Messages 2.0 & Telegram Business

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Dedicated Proxies, Advanced Group Analytics, and Multi-Chain Community Support.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="150" height="150" />
  <h3>Guidegram v1.10.0</h3>
  <p><strong>Group Voice & Video Calls • Telegram Mini Apps (TWA) • Saved Messages 2.0 • Telegram Business • Turbo Engine</strong></p>
</div>

---

## 🌟 Release Highlights

Guidegram v1.10.0 is one of our largest milestone releases yet, introducing native **Group Voice & Video Calls** with active speaker visualization, an in-app **Telegram Mini Apps (TWA)** host with standalone window support, **Saved Messages 2.0** with dual-pane source filtering, **Telegram Business** management suite, channel/supergroup **Admin Log**, **Interactive Polls & Quizzes**, **Telegram Stars & Paid Media**, **Cloud Drafts** cross-session sync, **5-bit MTProto voice waveform decoder**, and an ultra-fast **Multi-DC Turbo Download Engine**.

---

## 📦 What's New & Enhancements

### 1. 📞 Group Voice & Video Calls UI
- **Real-Time Active Speaker Visualizer**: Dynamic animated audio wave ripples indicating current active speakers.
- **Fluid Multi-Participant Video Grid**: Adaptive layout rendering screen shares and camera streams.
- **Persistent Header Status Bar**: Floating call bar (`GroupCallBar`) with instant audio toggles, participant counter, and one-click return.

### 2. 🌐 Telegram Mini Apps (TWA) Host
- **In-App Modal & Multi-Window Execution**: Run Telegram Mini Apps seamlessly inside an overlay modal or detach them into independent OS windows.
- **MTProto Protocol Bridge**: Direct integration with `messages.requestWebView` and theme synchronization.

### 3. 💾 Saved Messages 2.0
- **Dual-Pane Source Filtering**: Filter saved messages by original chats, channels, bots, or personal notes with one click.
- **Reaction Tags & Fast Search**: Organize notes with visual emoji reaction tags and dedicated source drawer.

### 4. 💼 Telegram Business Suite
- **Comprehensive Business Hub**: Configure greeting messages, away hours schedules, business location pins, and custom chat links directly in Settings.

### 5. 🛡️ Channel & Supergroup Admin Log
- **Chronological Action Timeline**: Audit recent administrator actions, member kicks/bans, permission modifications, and message edits with event category filters.

### 6. 📊 Interactive Polls & Quizzes
- **Native Voting & Creation**: Full support for single and multiple-choice polls, quiz mode with customizable solution explanations, and real-time result percentages.

### 7. ⭐ Telegram Stars & Paid Media
- **Exclusive Content Unlocks**: Display locked media previews and unlock paid posts using Telegram Stars.
- **Star Reactions Picker**: Send star reactions with custom quantity selection modal.

### 8. ☁️ Cloud Drafts Cross-Session Synchronization
- **Real-Time Input Sync**: Unsent text drafts automatically sync across all MTProto devices with debounce auto-save.
- **Chat List Draft Indicators**: Highlight conversations with active drafts directly in the chat list.

### 9. 🎙️ 5-Bit MTProto Voice Waveform Decoder
- **Authentic Telegram Waveforms**: Unpacks 5-bit compressed audio waveforms for voice messages.
- **Interactive Scrubber & Sticky Player**: Drag-to-seek playback scrubber and top persistent audio player banner.

### 10. 🚀 Turbo Multi-DC Download Engine & Userspace WARP
- **Parallel Multi-Connection Pipeline**: Concurrently fetches chunk streams from optimal Telegram DCs.
- **Direct Cloudflare WARP Data-Plane**: Built-in userspace WARP tunnel for censorship-resistant connectivity.

---

## 🐛 Bug Fixes & Stability Improvements
- **Reply Pre-Fetching**: Restored and accelerated reply message pre-fetching in message loading streams.
- **UI & Layout Consistency**: Unified quote styles, group sender avatars, and blurred thumbnail generation.
- **Streaming Media**: Added HTTP 206 byte-range slicing for smooth seeking in large audio and video files.
- **Network Resilience**: Upgraded per-account proxy routing and reconnect backoff algorithms.

---

## 📝 Full Changelog
https://github.com/guidegram/guidegram/compare/v1.9.0...v1.10.0

---

<div align="center">
  <p>Crafted with precision by <strong>DoctorGuidance</strong> & the <strong>Guidegram Team</strong></p>
</div>
