# 🚀 Guidegram v2.5.4 — The Supercharged Performance, Zero-Disk I/O & Master Passcode Edition

> **Milestone Production Release** delivering an architectural resource overhaul: 90%+ disk write reduction, non-blocking async persistence, zero-loop media fault suppression, official Telegram Bot UI parity (Layer 180+ button colors & custom emojis), master passcode lock screen, windowed dialog list rendering, smart context menu actions, and 3-tier Persian NLP search.

---

### 🌟 Release v2.5.4 Highlights

* ⚡ **Supercharged /boost Performance & Zero-Disk I/O Surgery:**
  * **Strict Transition-Only Activity Tracking:** Eliminated 610,000+ duplicate status records by enforcing strict state transition checks (`lastRec.status !== parsed.status`) capped at 50 historical entries per user.
  * **Non-Blocking Asynchronous Persistence:** Replaced synchronous, blocking `fs.writeFileSync` in `activityTrackerService` with asynchronous `fs.promises.writeFile`, dropping disk write rates from 8.2 MB/s to near-zero.
  * **Base64 Disk Bloat Eradication:** Purged all inline Base64 data URLs from `snapshots` and `changes` JSON files on disk, reclaiming over 80% disk space and stopping runaway JSON file expansion.
  * **In-Memory Bot Message Caching:** Replaced synchronous per-message disk writes in `sessionStore` with an in-memory cache and debounced background persistence, eliminating UI frame freezes on high-frequency bot streaming.
  * **Direct O(1) Media Lookups:** Replaced unbounded `fs.readdirSync` across 4,150+ media files (2.55 GB) with direct extension probing (`candidateExts` + `fs.existsSync`), making media checks instantaneous.
  * **Zero-Loop Media Engine & Log Shield:** Added `failedMediaKeys` cache to catch and suppress Telegram 400 `FILE_REFERENCE_EXPIRED` exceptions, completely preventing infinite download retry loops and stopping multi-megabyte `error.log` bloat.
  * **Document Hidden Occlusion Guard:** Paused scheduled tickers and heavy animation loops when the window is hidden (`document.hidden`), eliminating idle background CPU and GPU consumption.

* 🤖 **Official Telegram Bot & UI Parity (Layer 180+):**
  * **Official Button Colors:** Full support for Telegram Layer 180+ bot keyboard button colors (Success Green, Danger Red, Primary Blue) with frosted-glass aesthetic.
  * **Premium Custom Emoji Icons in Buttons:** Render custom Telegram emoji packs directly inside bot reply keyboard buttons and inline keyboards.
  * **Live Reactive Bot Streaming:** Fluid, character-by-character real-time rendering for streaming bot edits, mirroring official Telegram desktop AI bot interactions.
  * **Top-Layer Bot Command Drawer:** Dedicated command menu drawer (`/start`, `/help`, etc.) rendered in the top visual layer with complete RTL support.

* 🔐 **Master Passcode & Anti-Theft Session Protection:**
  * **Instant App Lock Screen:** Secure your chats, active sessions, and local data behind a master passcode with immediate lock action from the titlebar padlock icon.
  * **Configurable Auto-Lock Timers:** Automatic lock screen activation on idle with synchronized Electron main process `passcodeGuard`.
  * **Anti-Theft Session Safeguards:** Prevent unauthorized physical access or background session export without unlocking.

* 🪟 **Windowed Dialog List & Micro-Transitions:**
  * **Windowed Dialog List Rendering:** Initial render capped at 40 chats with incremental +30 windowing on scroll, eliminating DOM layout thrashing on accounts with hundreds of dialogs.
  * **Native Lightweight Transitions:** Replaced heavy Framer Motion wrappers in `DialogListItem` with ultra-light native CSS transforms.
  * **Global Message Render Cap:** Capped global search and cross-chat message rendering to 40 items to prevent V8 heap spikes.

* 🖱️ **Smart Context Menus & File Operations:**
  * **tDesktop Drag-to-Select:** Native drag-to-select for chat message bubbles matching official Telegram Desktop behavior.
  * **Native Shell Actions:** Added "Show in Folder" (`shell.showItemInFolder`), "Open File" (`shell.openPath`), and "Copy Filename" to file and document context menus.
  * **Saved Messages & Media Copy:** Instant right-click photo copying to clipboard and streamlined Saved Messages actions.

* 🖼️ **Multi-Photo Profile Gallery & Custom Emojis:**
  * **Profile Photo Carousel:** Browse the entire profile photo history of any user or channel with interactive navigation arrows and photo counters.
  * **Right-Click "Copy Emoji ID":** Easily copy Telegram Premium custom emoji document IDs directly to clipboard.
  * **MTProto Saved GIFs Dock:** Visual sticker and saved GIF dock with native MTProto hydration.

* 🔍 **Smart 3-Tier Search & Persian NLP:**
  * **Persian NLP Normalization:** Intelligent text search supporting half-spaces (نیم‌فاصله), Arabic/Persian character unification (ی/ک), and diacritic stripping.
  * **Anti-Delete Local Cache & PV Auto-Download:** Instant auto-download of private chat photos with local caching to preserve deleted media.
  * **Granular Audit Tracking Scopes:** User-configurable limits for audit tracking across private chats, groups, and channels.
