<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="128" height="128" />
  <h1>🚀 Guidegram</h1>
  <p><strong>Next-Generation Portable Desktop Telegram Client with Unlimited Multi-Account, Dedicated Per-Account Proxies, Advanced Session Isolation & Deep Group Analytics</strong></p>
</div>

[![GitHub Release](https://img.shields.io/github/v/release/guidegram/guidegram?style=for-the-badge&color=22c55e&logo=github)](https://github.com/guidegram/guidegram/releases/latest)
[![Windows](https://img.shields.io/badge/Platform-Windows%20x64-0078d4?style=for-the-badge&logo=windows)](https://github.com/guidegram/guidegram/releases/latest)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-34.2-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen.svg?style=for-the-badge)](https://github.com/guidegram/guidegram/issues)

> A modern, lightning-fast, ultra-portable desktop client for Telegram engineered to eliminate the 3-account restriction, protect identities with isolated proxies and dedicated environment profiles, accelerate downloads with multi-worker MTProto, and deliver comprehensive group activity intelligence.

---

## 📥 Download Ready-to-Use Release

No installation or developer tools required. Download the portable standalone release for Windows:

👉 **[Download Latest Release (GitHub Releases)](https://github.com/guidegram/guidegram/releases/latest)**

*Download the portable zip or installer from the latest release assets, extract or run `Guidegram.exe` to launch.*

---

## 🌟 Key Features & Advanced Capabilities

### 1. 📱 Unlimited Multi-Account Management (Eliminate the 3-Account Ceiling)
- **Eliminate Account Restrictions**: Completely removes Telegram Desktop's 3-account ceiling. Add 5, 20, 50, or 100+ accounts concurrently without requiring Telegram Premium subscriptions.
- **Fluid Vertical Account Dock**: Sleek desktop dock displaying real-time unread badges, active account avatars, and zero-latency switching.
- **Rapid 3-Second QR Authentication**: Log in in seconds by scanning a QR code with the Telegram mobile app (*Settings > Devices > Link Desktop Device*) or using international phone numbers with full 2FA Cloud Password support.
- **Instant Keyboard Shortcuts**: Press `Ctrl + 1..9` to switch between active identities instantly.

### 2. 🔒 Dedicated & Isolated Proxy Per Account (Network Traffic Isolation)
- **Per-Account Network Isolation**: Assign independent proxies (SOCKS5, HTTP, or MTProto) to individual accounts to completely isolate network traffic and prevent shared IP correlation.
- **Real-Time Ping Latency Monitor**: Live latency tester measures response time and packet health before establishing connection to prevent dropouts.
- **Independent Fallback Handling**: If one proxy encounters latency, other accounts remain unaffected on their dedicated tunnels.

### 3. 🛡️ Advanced Device Profile & Environment Isolation
- **Distinct Environment Presets**: Assigns authentic workstation presets to individual accounts, ensuring clean session isolation across your desktop workstation.
- **28+ Curated Hardware Profiles**: Provides realistic, consistent device profiles mimicking modern enterprise laptops and workstations (Dell XPS, ThinkPad X1 Carbon, Surface Pro, MacBook Pro).
- **Localized Environment Settings**: Customizes platform parameters, build metadata, and language configurations per account profile.

### 4. 💼 100% Truly Portable & Self-Contained Architecture
- **Zero Windows Registry Pollution**: Leaves zero traces in Windows registry and creates zero hidden config files in `%APPDATA%` or `%LOCALAPPDATA%`.
- **Single Directory Footprint**: All session tokens, encryption keys, proxy rosters, and client preferences reside in a local `./data` folder adjacent to the executable.
- **Instant Flash Drive Portability**: Backup, duplicate, or transfer your entire multi-account workstation simply by copying the folder to another PC or USB thumb drive.

### 5. ⚡ Parallel Chunk Download Acceleration (Up to 3x Faster)
- **Multi-Worker MTProto Pipeline**: Unlike official Telegram clients that download media sequentially over a single stream, Guidegram automatically engages **4 parallel concurrent MTProto workers** with chunked 512KB buffers for files and videos larger than 2MB.
- **High-Velocity Media Streaming**: Drastically accelerates video buffering, audio caching, and large document transfers.

### 6. 📊 Deep Group Statistics & Member Activity Intelligence (Exclusive Superpower)
> **Missing in Official Telegram Desktop**: The official desktop client offers zero engagement analytics for group chats. Guidegram fills this major void by embedding a comprehensive, real-time analytics suite accessible right from any group's header (`BarChart3` icon):
- **Active Members Leaderboard**: Real-time ranking of the most active group contributors, detailing exact message counts, percentage contribution to total conversation traffic, and direct user profile cards.
- **Dynamic Timeframe Slicing with MTProto Auto-Sync**: Defaults to **Today** and supports instant one-click switching to **Yesterday**, **Past 7 Days**, and **Past 30 Days**. If loaded memory doesn't yet cover the chosen window, Guidegram automatically queries and paginates MTProto server batches until the boundary timestamp is reached.
- **24-Hour Hourly Activity Heatmap**: Visual bar chart breakdown identifying peak conversation hours to optimize broadcast schedules, product drops, and community engagement.
- **Media & Message Composition Matrix**: Categorized traffic metrics covering Text, Photos, Videos, Voice Notes, Documents, and Stickers.
- **Word & Character Velocity**: Aggregate word count and average message density metrics.

### 7. 👁️ Ghost Mode & Anonymous Stealth Stories Viewer
- **Invisible Reading**: Read incoming direct messages and group chats without sending read receipts (suppresses double checkmarks).
- **Stealth Story Viewer**: View user stories directly from avatar story rings without triggering `stories.readStories` view logs.
- **Typing Status Masking**: Prevents transmitting "typing..." or "recording voice..." presence indicators to peers.

### 8. 📜 Infinite Chat History Scroll & Zero-Jitter Pagination
- **Bidirectional Continuous History**: Scrolling to the top of any chat triggers seamless 50-message chunk retrieval from Telegram's MTProto servers via `offsetId` pagination.
- **Scroll Jump Compensation**: Viewport scroll position is preserved smoothly using exact height delta compensation (`newScrollHeight - prevScrollHeight + prevScrollTop`), allowing users to scroll back seamlessly to the very first message ever sent in a conversation without visual jitter or jumping.

### 9. 🗂️ Deep Dialog Pagination (Full Private Chat Visibility)
- **350-Dialog Extended Depth**: Initial dialog fetch expanded to 350 conversations (up from 150), preventing high-traffic channels and supergroups from burying personal direct messages (PVs).
- **Infinite Sidebar Scrolling**: Scrolling near the bottom of the conversation list automatically fetches older dialog batches using `offsetDate` pagination, with instant deduplication and zero flicker.

### 10. 🚀 Direct Forward Without Quote (Telegraph Style)
- **Clean Message Forwarding**: Re-post messages with original author headers and channel forward credits cleanly stripped (`dropAuthor: true` in MTProto).
- **One-Click Hotkey**: Hover over any message and press `Alt + F` to open the direct forwarding modal instantly.

### 11. 🛡️ Guidegram Data Shield & Installer Safety Architecture
- **In-Place Upgrade Protection**: The NSIS installer (`build/installer.nsh`) permanently disables recursive directory wipes (`RMDir /r $INSTDIR`). Selecting an existing directory updates application binaries only, preserving the `data/` directory (sessions, accounts, settings, caches) completely intact.
- **Dual-Layer Mirrored Safe Backup**: Automatically mirrors all account sessions and configs to an OS-protected location (`%APPDATA%/Guidegram/safe_backup`). If local data is ever removed or damaged, Guidegram auto-restores all accounts and credentials on next launch.
- **Safe Directory Encapsulation**: Non-empty directories without Guidegram binaries are automatically protected by encapsulating installation inside a dedicated folder.

### 12. 🖥️ Complete Official Telegram Desktop Parity
- **Main Menu Drawer**: Complete parity with official Telegram Desktop, featuring high-resolution avatars, full formatted names, @username handles, and direct access navigation.
- **My Profile Drawer**: In-depth personal profile drawer displaying biography, Telegram Star Gifts count, Data Center (DC) identifier, and Telegram Stars wallet balance.
- **Enterprise Settings**: Deep unified configuration modal with media cache purge, custom downloads path, privacy and security toggles, and shortcuts guide.

### 13. ⚡ Advanced Desktop Power Features
- **Show Chat ID & Message ID**: Interactive badges in the header and message footer with 1-click clipboard copy.
- **Message Timestamp with Seconds**: Millisecond-accurate timestamp display (`HH:mm:ss`).
- **Quick Forward to Saved Messages**: Bookmark action on hover + instant `Ctrl + Click` shortcut on any message bubble.
- **Group Sender Avatars**: Distinct visual sender avatars displayed next to messages in supergroups.
- **Bot Inline Button Inspection**: Click or right-click any inline keyboard button to inspect and copy `callback_data`.
- **Mark All Chats As Read**: One-click bulk read button in folder tabs with channel read-pointer advancement.
- **Deep Link Navigation**: Native handling of `tg://user?id=...`, `tg://openmessage`, and `@username` deep links.

### 14. 🛡️ Tiered In-App Update Enforcement & Protocol Safety
- **Automated Update Notification**: Background checks and startup verifications against GitHub Releases.
- **Mandatory Protocol & Security Safeguards**: Major and minor version upgrades along with critical security patches enforce mandatory update banners to guarantee network stability and prevent desynchronization with Telegram MTProto layers.
- **Session Soft Dismissal**: Routine cosmetic patch updates allow temporary dismissal for the active session, resurfacing politely upon restart.

### 15. 🎭 Animated Stickers Drawer (TGS Lottie & WebP)
- **Built-in Sticker Picker**: Sticker drawer (`Smile` button in composer) displaying all installed sticker packs directly from your Telegram cloud profile.
- **Vector Animation Rendering**: Real-time client-side `.tgs` gzip decompression and interactive vector animation rendering via `lottie-web`.
- **Instant MTProto Sending**: Sends using native MTProto `Api.InputDocument` references without re-uploading file bytes.

### 16. 📌 Multi-Cycle Pinned Messages & Dedicated Search Drawer (TDesktop v6.7.8+)
- **Interactive Pinned Banner**: Cycle smoothly through all pinned messages in a channel/group with counter indicators (`1 of N`) and smooth jump animations.
- **Dedicated Pinned Drawer**: One-click button (`All (N)`) opening a searchable drawer listing every pinned post with full-text search filter.

### 17. 📝 Large Text Auto-Splitter & .txt File Converter (TDesktop v6.7.8+)
- Automatically warns users when input exceeds Telegram's 4,096-character text limit.
- Provides 1-click actions to either **Send as .txt File** or **Split into Multiple Chunks** (~4,000 characters each) sequentially.

### 18. 🤖 AI Composer Text Assistant (TDesktop v6.7 & v7.0.9+)
- Integrated AI transformation menu right in the message compose area (`Sparkles` icon):
  - **Make Professional**: Transforms informal wording into polished corporate/business tone.
  - **Fix Grammar & Punctuation**: Cleans up whitespace, capitalization, and punctuation marks.
  - **Summarize Text**: Generates concise summaries from lengthy paragraphs.
  - **Add Expressive Emojis**: Emojifies relevant keywords seamlessly.
  - **Translate Hint**: Instant translation scaffolding.

### 19. 🎨 Floating Contextual Formatting Toolbar & Clickable Spoilers (TDesktop v7.0+)
- Floating formatting bar appears upon text selection: **Bold**, **Italic**, **Code**, **Strikethrough**, **Spoiler**, **Quote**, and **Insert Link**.
- Native interactive spoiler rendering (`||...||`) with click-to-reveal animations.

### 20. 🔍 In-Chat Search Highlighting & Match Navigation (TDesktop v7.1.3+)
- Automatic `<mark>` highlighting of matching search terms inside message bubbles.
- Search bar with match index counter (`X of Y matches`), step-by-step navigation (`ChevronUp` / `ChevronDown`), and keyboard shortcuts (`Enter` / `Shift+Enter` / `Esc`).

### 21. ⏰ Silent Messages & Scheduled Sending Modal (TDesktop v7.0.4 & v6.8.5+)
- Context menu and dropdown on the Send button for **Send Without Sound** (`BellOff`) and **Schedule Message...** (`Clock`).
- Modal with quick time presets (+30m, +2h, Tomorrow 09:00 AM) and custom date-time picker.

### 22. 🌐 In-Chat Live Message Translation & BiDi/RTL Typography
- One-click translation of incoming and outgoing foreign messages directly from the message hover toolbar (`messages.translateText`).
- Full native Persian/Arabic Right-to-Left (RTL) auto-detection and layout alignment across messages, quotes, and inline buttons.

### 23. 📁 Telegram Cloud Chat Folders & Bulk Mark Read
- Automatic bidirectional retrieval of server-side chat folders (`messages.getDialogFilters`).
- Dynamic category tabs in the chat header with instant peer inclusion/exclusion filtering and 1-click Mark All Read.

### 24. 📥 Granular Automatic Media Download & Channel Data Saver
- Complete granular auto-download settings across **Private Chats**, **Groups**, and **Channels** for **Photos**, **Videos**, and **Files**.
- **Channel Data Saver (Enabled by Default)**: Channel photos and high-volume media are configured to manual on-demand loading by default, preventing unexpected network congestion and disk saturation when viewing large channels.
- **On-Demand Loading Cards**: Interactive download button placeholders for media items, allowing you to load only the specific photos and documents you need.

### 25. 🗄️ Storage Usage & Media Cache Management
- **Disk Usage Calculator**: Accurately analyzes media caches and downloaded files on disk, displaying exact byte sizes and file counts.
- **One-Click Cache Purge**: Safely frees disk space by removing cached photos, videos, and temp files while preserving authentication sessions and database history.

### 26. 🔔 Pure Web Audio Synthesizer & Real Notifications
- **Zero-Asset Notification Chime**: Synthesizes smooth Telegram-style harmonic tones using the browser Web Audio API, eliminating missing-file bugs and external audio dependencies.
- **Desktop Toast Support**: Native toast notifications dispatch when the window is blurred or minimized.

### 27. 📂 Custom Downloads Destination & Chat Font Scaling
- **Folder Picker**: Choose any directory on your PC as your primary downloads destination.
- **Save As Prompt**: Optional "Always ask where to save each file" setting for complete manual control.
- **Message Font Size**: Scalable text sizing from 12px to 18px with live in-settings preview.

### 28. 🛡️ Active Sessions & Remote Device Logout + 2FA Security
- View all active desktop and mobile sessions connected to your account with platform icons, IP addresses, country, and app versions (`account.getAuthorizations`).
- Terminate specific unrecognized sessions or wipe all other sessions with one click.
- Two-Step Verification (2FA) Cloud Password protection check (`account.getPassword`).

---

## 🗺️ Vision & Continuous Evolution

> **The Foundation is Solid — The Future is Limitless.**
>
> Guidegram is built on a modular, enterprise-grade architecture engineered for continuous expansion. We have established the solid foundation by bringing the most requested power features of modern desktop clients and Telegram Desktop into a lightweight, ultra-portable client.
>
> Moving forward, Guidegram will progressively evolve beyond standard messaging capabilities with creative, groundbreaking features:
> - **Unified Multi-Account Cross-Search & Omnibox**
> - **Autonomous Smart Message Scheduling & Automated Response Workflows**
> - **Integrated Local AI Assistant for Offline Semantic Message Querying & Thread Analysis**
> - **Advanced Channel Management & Creator Analytics Dashboard**
> - **Granular Privacy & Anti-Surveillance Controls**
>
> Each update expands this core foundation, making Guidegram the most capable, unrestricted Telegram client in the world.

---

## 🛠️ Tech Stack

- **Desktop Shell**: [Electron](https://www.electronjs.org/) configured with localized portable user paths (`userData -> ./data`)
- **Frontend Core**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **UI & Styling**: [Tailwind CSS](https://tailwindcss.com/) with glassmorphic dark theme and [Lucide Icons](https://lucide.dev/)
- **Telegram Engine**: [GramJS](https://github.com/gram-js/gramjs) (pure MTProto 2.0 implementation in TypeScript)
- **Packaging**: [electron-builder](https://www.electron.build/) targeting portable Windows x64 distributions

---

## 📂 Project Structure

```text
Guidegram/
├── data/                    # Portable local data directory (sessions, logs, config)
│   ├── sessions/            # Encrypted Telegram session keys
│   ├── logs/                # guidegram.log runtime diagnostics
│   └── config.json          # Account and proxy configuration
├── electron/
│   ├── main.ts              # Main Electron process, window management, IPC handlers
│   ├── preload.ts           # Secure ContextBridge IPC bridge (CommonJS bundle)
│   └── telegram/
│       ├── accountManager.ts # MTProto client management, QR auth, forwarder
│       ├── sessionStore.ts   # Persistent JSON configuration manager
│       ├── proxyManager.ts   # SOCKS5/MTProto proxy converter and ping tester
│       ├── logger.ts         # Dual file logging system
│       └── types.ts          # TypeScript interfaces and data models
├── src/
│   ├── components/          # React UI components
│   │   ├── AccountDock.tsx      # Vertical account switcher
│   │   ├── AddAccountModal.tsx  # QR code & phone login modal
│   │   ├── ChatList.tsx         # Deep-paginated conversation list with search
│   │   ├── ChatTabs.tsx         # Categorized cloud folder tabs with Mark All Read
│   │   ├── ChatViewport.tsx     # Infinite scroll viewport, message viewer, power actions
│   │   ├── DirectForwardModal.tsx # No-quote forwarding dialog
│   │   ├── GroupStatsModal.tsx  # Exclusive deep group analytics & member intelligence
│   │   ├── MainMenuDrawer.tsx   # TDesktop parity main menu navigation
│   │   ├── MyProfileDrawer.tsx  # Rich profile viewer with Telegram Star Gifts & DC badge
│   │   ├── ContactsModal.tsx    # Telegram contacts viewer & search
│   │   ├── CreateChatModal.tsx  # New channel, group, and secret chat creator
│   │   ├── UpdateBanner.tsx     # Tiered update enforcement banner
│   │   ├── ProxySettingsModal.tsx # Proxy configuration & latency monitor
│   │   ├── SettingsModal.tsx    # Preferences, advanced toggles, log viewer
│   │   ├── UnifiedInbox.tsx     # Consolidated cross-account inbox
│   │   └── WelcomeScreen.tsx    # Onboarding screen
│   ├── App.tsx              # Root application state orchestrator
│   ├── main.tsx             # Application bootstrap with ErrorBoundary
│   └── index.css            # Tailwind styling and custom scrollbars
├── package.json
└── vite.config.ts
```

---

## 💻 Development Setup

### Prerequisites
- Node.js (v20 or newer recommended)
- `pnpm` (or `npm`)

### 1. Clone Repository
```bash
git clone https://github.com/guidegram/guidegram.git
cd guidegram
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Run Development Server
```bash
pnpm dev
```

### 4. Build Portable Executable
```bash
pnpm build:portable
```
The compiled portable application will be output to the `release/win-unpacked` directory.

---

## 🛡️ Security & Responsible Disclosure

- **Local Session Storage**: All authentication credentials and session tokens remain on your local filesystem under `./data/sessions/`. No telemetry or third-party servers are involved.
- **Open MTProto Implementation**: Direct cryptographic connection between your machine and official Telegram MTProto Data Centers (DCs).
- **Custom API Credentials**: Guidegram ships with default Telegram Desktop credentials, but you can configure your own `api_id` and `api_hash` from [my.telegram.org](https://my.telegram.org) in the Preferences panel.
- **Security Policy**: For vulnerability reporting and disclosure guidelines, please read [SECURITY.md](SECURITY.md).

---

## 🤝 Contributing & Community

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on code standards, TypeScript guidelines, and our Pull Request workflow.

For the long-term international launch strategy and competitive benchmarks, explore the [Strategy & Launch Documentation](docs/strategy/INDEX.md).

---

## 📜 License

Licensed under the [GNU General Public License v3.0](LICENSE).
