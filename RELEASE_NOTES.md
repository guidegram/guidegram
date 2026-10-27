# 🚀 Guidegram v2.4.3 — Contact Timeline Radar, Safe Anti-Flood Queue & Mobile Identity Edition

> **Contact Timeline Radar & Online Activity Map Architecture** featuring universal self-exclusion, silent local contact rename masking, tri-state bio deletion audits, anti-flood throttled background queues, visual before/after avatar comparisons, and official Android adaptive launcher icons.

---

### 🌟 Release v2.4.3 Highlights

* 🛰️ **Contact Timeline Radar & Profile Change Auditor:**
  * **Universal Self-Exclusion:** Completely eliminates self-tracking across all 6 MTProto/IPC touchpoints (Saved Messages, live status updates, dialogs hydration, and contact lists).
  * **Silent Phonebook Rename Masking:** Distinguishes local phonebook edits (`isContact: true`) from public profile updates, preventing personal contact renames from generating false timeline events.
  * **Tri-State Bio & Personal Channel Hygiene:** Robust detection of bio clearing and channel removal with initial baseline seeding to eliminate phantom first-time events.

* 🛡️ **Anti-Flood Throttled Background Queue:**
  * **Flood-Wait Immunity:** 3.5s to 5s spaced query engine with a 12-hour per-contact cooldown, preventing Telegram RPC `FLOOD_WAIT` rate limits.
  * **Interaction Range Selector:** Configurable background scan range in Settings (`24h`, `7d`, `30d`, `90d`, `180d` [default], and `All`).
  * **Auto-Audit on Online Event:** Automatically enqueues active contacts for full profile inspection the moment they come online.

* 📊 **Interactive Online Timeline & Activity Map:**
  * **24-Hour Zoomable Ruler:** Smooth horizontal timeline with mouse wheel and button zoom (1x to 4x).
  * **Session Visualization:** Displays exact online minutes with contact avatars, saved names, and status badges.
  * **Per-User Isolation:** Click on any user to instantly view all their historical online sessions on the timeline.
  * **Fullscreen / Maximize View:** Dedicated modal expander for high-density monitoring.

* 🖼️ **Visual Avatar Before/After Comparison:**
  * Stores previous and new avatar thumbnails locally in `ContactChangeRecord`.
  * Renders a side-by-side Before & After comparison widget with click-to-preview enlarged modals.

* 📱 **Official Android Adaptive Launcher Icons & Splash Screens:**
  * Eliminated legacy template Android robot vector files and green grid artifacts.
  * Generated high-resolution adaptive launcher icons (`ic_launcher`, `ic_launcher_round`, `ic_launcher_foreground`) across all screen densities (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`) matching the signature `#39C6A4` brand background.
  * Generated unified dark splash screens (`#0A0D14`) with centered brand emblem.

* 🤖 **Multiplatform Automated CI Pipeline:**
  * Android APK (`Guidegram-Android.apk` with Java 21 & SDK 36 compatibility).
  * Windows Setup Installer & Portable ZIP.
  * macOS Universal DMG (Apple Silicon + Intel).
  * Linux AppImage.

---
*For past release changelogs, please inspect the git commit history.*
