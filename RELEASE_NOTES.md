# 🚀 Guidegram v2.0.0 — Telegram MTProto Layer 229+ Full Parity, Turbo Multi-DC Media Engine & Interactive Protocol Inspector

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Dedicated Proxies, Advanced Group Analytics, and Multi-Chain Community Support.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="150" height="150" />
  <h3>Guidegram v2.0.0</h3>
  <p><strong>Telegram MTProto Layer 229+ • Turbo Multi-DC Media Engine • Interactive Version Inspector • Zero-Data-Loss Portable Vault</strong></p>
</div>

---

## 🌟 Release Highlights

Guidegram v2.0.0 represents the most significant architectural evolution in Guidegram's history. It establishes **100% native MTProto Layer 229+ TL-Schema parity** across all 28 Telegram namespaces (859 methods), introduces a high-performance **Turbo Multi-DC Media Download Engine** resolving all stuck media transfers, embeds an **Interactive Version Inspector** on version badges for instant update checks, and hardens the **Zero-Data-Loss Portable Vault** protecting multi-account sessions across every update.

---

## 📦 What's New & Enhancements

### 1. ⚡ Complete MTProto Layer 229+ Native Parity (859 Methods Across 28 Namespaces)
- **Direct Namespace Coverage**: Full native invocation of all Telegram MTProto Layer 229+ methods across all 28 namespaces (`account`, `auth`, `bots`, `channels`, `chatlists`, `contacts`, `folders`, `fragment`, `help`, `langpack`, `messages`, `payments`, `phone`, `photos`, `premium`, `stats`, `stickers`, `stories`, `updates`, `users`, and more).
- **Universal Dynamic Dispatch**: Integrated robust schema proxying through `telegram:invoke-raw` and granular client wrappers with zero phantom methods and zero runtime exceptions.
- **100% Pass in Verification Suites**: Passed all 31 end-to-end integration test suites including M1 through M14 compliance benchmarks.

### 2. 🚀 Turbo Multi-DC Media Engine & Zero-Stuck Downloads
- **Universal InputFileLocation Translation**: Replaced fragile URL-based and legacy photo heuristics with robust MTProto `TypeInputFileLocation` extraction for full-size profile pictures, high-res photos, documents, and voice messages.
- **Multi-DC Auto-Routing**: Automatic connection migration and chunk downloading across DC1 through DC5 with fallback chunking, preventing any infinite download spinners.
- **Voice MIME Parity**: Added full `DocumentAttributeAudio` voice flag compliance for ultra-low latency voice and audio notes playback.

### 3. 🔍 Interactive Version Inspector & Click-to-Check
- **One-Click Update Check on Version Badges**: Clicking the version indicator (`v2.0.0`) in either the **Main Menu Drawer** or the **Settings Modal** triggers an immediate, live check against GitHub Releases with real-time spinner feedback.
- **Instant Visual Feedback**: Clearly indicates whether Guidegram is completely up to date or has a new version ready to download.
- **Accelerated 5s Startup Check**: Automated background updater checks for releases 5 seconds after startup and alerts users immediately via the top `UpdateBanner`.

### 4. 🛡️ Hardened Portable Vault & Data Shield
- **Zero-Data-Loss Invariant**: Portable upgrades safely update executable binaries and `resources/app.asar` without touching or resetting user accounts, SQLite databases, session tokens, or proxy configs in `data/`.
- **Chromium Singleton Ordering**: Early `userData` redirection strictly precedes singleton lock acquisition, guaranteeing zero Windows file locking collisions.

---

## 📝 Full Changelog
https://github.com/guidegram/guidegram/compare/v1.11.5...v2.0.0

---

<div align="center">
  <p>Crafted with precision by <strong>DoctorGuidance</strong> & the <strong>Guidegram Team</strong></p>
</div>
