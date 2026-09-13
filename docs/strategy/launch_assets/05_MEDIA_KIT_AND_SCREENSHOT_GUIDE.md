# Guidegram — Master Media Kit & Screenshot Production Guide

**Document Version:** 1.0.0  
**Classification:** Global Launch Media Assets & Visual Branding Standards  
**Target Channels:** AlternativeTo, GitHub Releases, Product Hunt, Softpedia, Tech Forums  
**Canonical Repository:** `https://github.com/guidegram/guidegram`  
**License:** GNU General Public License v3.0 (GPLv3)  
**Status:** Production Ready (Zero Placeholders)  
**Last Updated:** September 2026  

---

## 1. Executive Summary & Brand Identity

The **Guidegram Master Media Kit** establishes the definitive technical guidelines, visual hygiene standards, and UI component capture checklist for launching Guidegram across major software discovery directories (AlternativeTo, Product Hunt, GitHub, and open-source catalogs).

Guidegram's visual positioning is rooted in high-performance power-user software: clean, dense, highly responsive, and architecturally superior to legacy desktop messaging clients. Every promotional asset must showcase authentic, unmanipulated application captures that substantiate Guidegram's core architectural advantages:
- Unlimited multi-account navigation (`AccountDock.tsx`)
- Per-session proxy socket isolation (`ProxySettingsModal.tsx`)
- Zero-bot group activity intelligence (`GroupStatsModal.tsx`)
- Combinatorial hardware anti-fingerprinting (`SettingsModal.tsx` & `deviceProfileManager.ts`)
- 64gram power tooling parity (`ChatViewport.tsx`)
- True portable zero-registry architecture (`./data/`)

---

## 2. Master Technical Specifications

All visual assets distributed across directories and press channels must strictly conform to the following technical parameters:

### 2.1 Display Canvas & Resolution Standards

| Asset Role | Dimensions | Aspect Ratio | Format & Bit Depth | Compression & Color Space | Placement Targets |
|:---|:---|:---:|:---|:---|:---|
| **Master Showcase (Slide 1)** | `1920 x 1080 px` | 16:9 (Full HD) | PNG-24 (RGB) | Lossless / sRGB IEC61966-2.1 | AlternativeTo Primary, GitHub Hero, Softpedia |
| **High-DPI Press Master** | `2560 x 1440 px` | 16:9 (QHD) | PNG-24 (RGB) | Lossless / sRGB IEC61966-2.1 | High-DPI Press Archive, 4K Displays |
| **Web Distribution Carousel** | `1600 x 900 px` | 16:9 | WebP (Lossy) | Quality: 95%, sRGB, Strip Metadata | Fast-Loading Web Carousels, Documentation |
| **Product Hunt Gallery** | `1270 x 760 px` | ~1.67:1 | PNG-24 / WebP | Lossless / Quality: 95% | Product Hunt Media Gallery Slider |
| **Master Application Icon** | `512 x 512 px` | 1:1 (Square) | PNG-32 (RGBA) | Uncompressed / Transparent Alpha | AlternativeTo Avatar, App Store Headers |
| **Windows Multi-Layer Icon**| 16x16 to 256x256 | 1:1 (Square) | ICO (Multi-Layer) | Embedded BMP/PNG sub-layers | Windows Executable & Taskbar Branding |

---

### 2.2 WebP Compression Specifications

When converting master PNG-24 captures for lightweight web delivery and CDN distribution:
- **Encoder:** Google `cwebp` / ImageMagick / Sharp
- **Quality Factor (`-q`):** `95` (retains crystal-clear text sharpness on subpixel-rendered UI fonts)
- **Method (`-m`):** `6` (maximum compression effort for optimal byte size reduction)
- **Sharp YUV (`-sharp_yuv`):** `Enabled` (preserves vibrant contrast on sharp UI borders and colored ping status pills)
- **Color Profile (`-keep_color_profile`):** `Preserve sRGB`
- **Metadata:** Strip EXIF, IPTC, and XMP tags to enforce strict privacy hygiene:
  ```bash
  cwebp -q 95 -m 6 -sharp_yuv input.png -o output.webp
  ```

---

### 2.3 Application Icon Asset Matrix

The official Guidegram icon is built from a high-resolution vector source, rendering a bold, geometric **"G"** centered within a squircle container styled with an indigo-to-cyan radial gradient:
- **Canvas Size:** `512 x 512 px`
- **Border Radius:** `112 px` (standard squircle curvature, conforming to modern macOS / Windows Fluent guidelines)
- **Gradient Fill:** `from-[#50a2e9] via-[#3b82f6] to-[#06b6d4]` (45-degree angle)
- **Glyph Typography:** Inter Heavy / System Bold, crisp white `#ffffff`
- **Drop Shadow:** Soft ambient occlusion (`box-shadow: 0 8px 32px rgba(80, 162, 233, 0.35)`)
- **Format:** Transparent PNG-32 (with 8-bit alpha transparency channel)

---

## 3. Native Window Framing & Visual Hygiene Rules

Directory curation teams (especially on AlternativeTo) systematically reject promotional images that employ artificial marketing gimmicks. All submissions must follow these strict framing guidelines:

### 3.1 Raw Native Window Capture (Anti-Mockup Policy)
1. **No Fake 3D Tilts:** Strictly avoid isometric, tilted, or 3D-angled mockups. All screenshots must be direct, frontal orthographic captures.
2. **No Faux Device Frames:** Do NOT wrap captures inside artificial MacBook, Dell XPS, or smartphone hardware frames.
3. **No Heavy Photoshop Shadows:** Do NOT apply artificial drop shadows to the entire canvas. Let the native OS window manager handle framing naturally.
4. **Native Window Chrome:** Include clean, authentic native window borders: the Guidegram custom dark titlebar with native Windows 11 minimize, maximize, and close buttons (`titlebar-no-drag`, `#0b0e14`).
5. **100% OS Display Scaling:** Always capture at 100% DPI (96 DPI on Windows). Avoid 125% or 150% fractional scaling, which causes fractional pixel blurring on thin border dividers (`border-white/5`).

---

### 3.2 Official Color Palette Specifications

All captured UI views must maintain strict alignment with Guidegram's established dark-mode palette:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                           GUIDEGRAM OFFICIAL COLOR PALETTE SPEC                             │
├────────────────────┬──────────────────┬─────────────────────────────────────────────────────┤
│ Palette Role       │ Hex Code         │ UI Implementation Context                           │
├────────────────────┼──────────────────┼─────────────────────────────────────────────────────┤
│ **Background**     │ `#0b0e14`        │ Primary app background, titlebar, dock backing      │
│ **Surface Card**   │ `#111622`        │ Chat list items, modal surfaces, stat cards         │
│ **Surface Elevated**│ `#182032`       │ Input fields, hover states, active list selections  │
│ **Border Divider** │ `rgba(255,255,255,0.05)` │ Clean hairline dividers and modal borders   │
│ **Primary Blue**   │ `#50a2e9`        │ Brand accent, active buttons, selection rings       │
│ **Accent Cyan**    │ `#06b6d4`        │ Proxy status dots, secondary badges, chart lines    │
│ **Status Emerald** │ `#10b981`        │ Connected accounts, low-latency ping (<150ms)       │
│ **Status Amber**   │ `#f59e0b`        │ Connecting states, medium-latency ping (150-300ms)  │
│ **Status Rose**    │ `#f43f5e`        │ Unread total badges, failed proxy pings, warnings   │
│ **Text Primary**   │ `#f3f4f6`        │ Main message content, modal headers, user titles    │
│ **Text Secondary** │ `#9ca3af`        │ Timestamps, proxy host strings, subtitle captions   │
└────────────────────┴──────────────────┴─────────────────────────────────────────────────────┘
```

---

### 3.3 Typography & Font Antialiasing

- **Font Stack:** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Monospace Stack:** `JetBrains Mono, "Fira Code", Menlo, Monaco, Consolas, monospace` (used for Chat IDs, User IDs, IP addresses, and ping latency pills)
- **Antialiasing:** Force browser/Electron subpixel font smoothing (`-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;`).

---

## 4. Zero-Telemetry Test Data Hygiene Protocol

To maintain complete professional integrity, prevent privacy leaks, and present an appealing, realistic product interface, all screenshots must utilize rigorously sanitized mock test data.

### 4.1 Strict Sanitization Guardrails
- ❌ **NO Real Phone Numbers:** Never display real international phone numbers. Use standardized mock formats: `+1 (555) 019-2834`, `+44 7700 900142`, `+49 151 23456789`.
- ❌ **NO Real Telegram API Hashes or Tokens:** Never expose actual `api_id`, `api_hash`, bot tokens, or MTProxy secret strings. Use realistic masked hashes: `ee82...19b4`, `d41d8cd98f00b204e9800998ecf8427e`.
- ❌ **NO Private Personal Chats:** Never capture real private messages, personal direct messages, or sensitive internal communication.
- ❌ **NO Copyrighted Media:** Use royalty-free avatars from open design libraries (e.g. Unsplash portraits, stylized abstract vector avatars, or DiceBear bots).

---

### 4.2 Standardized Mock Personas for Multi-Account Dock

| Slot | Account Display Name | Mock Phone | Role / Persona Archetype | Connection State | Configured Proxy Type |
|:---:|:---|:---|:---|:---|:---|
| **1** | `Alice Vance` | `+1 (555) 019-2834` | Community Operations Lead | Connected (`emerald`) | SOCKS5 (`127.0.0.1:10808`, 42ms) |
| **2** | `Bob Martinez` | `+44 7700 900142` | Growth & Marketing Strategist | Connected (`emerald`) | SOCKS5 (`us-res.proxy.net:9050`, 68ms) |
| **3** | `Elena Rostova` | `+49 151 23456789` | Security & Privacy Researcher | Connected (`emerald`) | MTProxy (`de-fra.mtproxy.io:443`, 38ms) |
| **4** | `David Chen` | `+65 6789 0123` | Core Node Validator | Connected (`emerald`) | HTTP (`corp-gw.internal:8080`, 115ms) |
| **5** | `Sarah Jenkins` | `+61 491 570 156` | Developer Relations Advocate | Connected (`emerald`) | Direct (No Proxy) |
| **6** | `Marcus Brody` | `+1 (555) 014-9821` | Infrastructure Engineer | Connecting (`amber`) | SOCKS5 (`tor-socks.local:9150`, 210ms) |
| **7** | `Klaus Weber` | `+43 664 1234567` | Ecosystem Fund Lead | Connected (`emerald`) | MTProxy (`ch-zrh.mtproto.net:8443`, 48ms) |
| **8** | `Yuki Tanaka` | `+81 90 1234 5678` | APAC Community Moderator | Connected (`emerald`) | SOCKS5 (`jp-tyo.residential.io:1080`, 85ms) |

---

### 4.3 Standardized Mock Communities for Group Analytics
- **Primary Showcase Group:** `Guidegram Alpha Community` (12,480 members, 1,420 online)
- **Secondary Research Group:** `Decentralized Infrastructure DAO` (8,950 members, 890 online)
- **Topics / Channels:** `#announcements`, `#general-discussion`, `#dev-releases`, `#proxy-support`

---

## 5. Differentiating UI Screenshot Checklist (6 Master Views)

The following checklist details the 6 core promotional captures required for the AlternativeTo listing and global media kit. Each view targets a specific component in the Guidegram codebase that demonstrates a decisive competitive advantage over official TDesktop, 64gram, Kotatogram, and AyuGram.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                           MASTER MEDIA KIT SCREENSHOT ROSTER                                │
├────┬─────────────────────────────┬───────────────────────────┬──────────────────────────────┤
│ #  │ Screenshot Target           │ Primary Component         │ Key Differentiating Elements │
├────┼─────────────────────────────┼───────────────────────────┼──────────────────────────────┤
│ 01 │ Multi-Account Vertical Dock │ `AccountDock.tsx`         │ 72px dock, 8+ accounts,      │
│    │ & Unified Cross-Inbox       │ `UnifiedInbox.tsx`        │ aggregated unread badge.     │
├────┼─────────────────────────────┼───────────────────────────┼──────────────────────────────┤
│ 02 │ Per-Session Dedicated Proxy │ `ProxySettingsModal.tsx`  │ SOCKS5/MTProxy per account,  │
│    │ Isolation Manager           │ `proxyManager.ts`         │ live TCP ping latency tests. │
├────┼─────────────────────────────┼───────────────────────────┼──────────────────────────────┤
│ 03 │ Client-Side Group Activity  │ `GroupStatsModal.tsx`     │ Member leaderboard, 24h      │
│    │ Intelligence Engine         │                           │ heatmap, vocabulary cloud.   │
├────┼─────────────────────────────┼───────────────────────────┼──────────────────────────────┤
│ 04 │ Combinatorial Hardware      │ `SettingsModal.tsx`       │ 28+ PC workstation profiles, │
│    │ Anti-Fingerprinting Shield  │ `deviceProfileManager.ts` │ Windows 11 UBR randomization.│
├────┼─────────────────────────────┼───────────────────────────┼──────────────────────────────┤
│ 05 │ 64gram Power Tooling Chat   │ `ChatViewport.tsx`        │ Chat/User/Msg IDs, seconds   │
│    │ Viewport & Direct Forward   │ `DirectForwardModal.tsx`  │ timestamps, Alt+F forward.   │
├────┼─────────────────────────────┼───────────────────────────┼──────────────────────────────┤
│ 06 │ 100% Portable Local Storage │ Windows Explorer + App    │ Local `./data/` isolation,   │
│    │ & Data Shield Verification  │ `sessionStore.ts`         │ zero registry footprint.     │
└────┴─────────────────────────────┴───────────────────────────┴──────────────────────────────┘
```

---

### Screenshot 1: Multi-Account Vertical Dock & Unified Cross-Inbox

- **File Name:** `01_guidegram_multi_account_dock.png` (and `01_guidegram_multi_account_dock.webp`)
- **Primary Source Component:** `src/components/AccountDock.tsx` (lines 28–145) & `src/components/UnifiedInbox.tsx`
- **Native Resolution:** `1920 x 1080 px` (16:9 Full HD)
- **UI Focal Points & Visual Hierarchy:**
  1. **72px Vertical Navigation Dock (`aside.w-[72px]`):** Positioned flush on the left border, housing 8 visible active account avatars.
  2. **Unified Inbox Icon & Aggregated Unread Badge (`lines 35–51`):** Shows the prominent inbox button with an unread badge (`bg-accent-rose text-white text-[10px] font-bold`) displaying a cumulative unread counter across all accounts (e.g. `14`).
  3. **Active Account Selection Ring (`lines 67–70`):** Highlights the currently focused account (`Alice Vance`) with a glowing blue border (`ring-2 ring-primary-400 ring-offset-2 ring-offset-dark-900 shadow-glow`).
  4. **Connection State Rings (`lines 84–92`):** Emerald dot (`bg-accent-emerald`) on connected accounts; pulsating amber dot (`bg-accent-amber animate-pulse`) on connecting accounts.
  5. **Active Proxy Indicators (`lines 95–99`):** Distinct cyan badge (`bg-accent-cyan ring-1 ring-dark-900`) indicating dedicated proxy assignment.
  6. **Add Account Button (`lines 115–125`):** Clean dashed squircle trigger (`Plus` icon) for adding unlimited concurrent accounts.
- **Authoritative Technical Image Caption:**
  > *"High-density 72px vertical Multi-Account Dock orchestrating unlimited concurrent Telegram sessions with real-time aggregated unified inbox counters, per-account connection status rings, active proxy indicators, and instantaneous zero-re-render keyboard switching (`Ctrl+1..9`). Completely eliminates the official TDesktop 3-account ceiling and replaces cumbersome sliding drawers with instant identity switching."*
- **Verification & Code Mapping:**
  - `src/components/AccountDock.tsx:46-50`: `accounts.reduce((acc, a) => acc + (a.unreadTotal || 0), 0)`
  - `src/components/AccountDock.tsx:56`: `flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center gap-3`

---

### Screenshot 2: Per-Session Dedicated Proxy Isolation Manager

- **File Name:** `02_guidegram_per_session_proxy_manager.png` (and `02_guidegram_per_session_proxy_manager.webp`)
- **Primary Source Component:** `src/components/ProxySettingsModal.tsx` (lines 78–238) & `electron/telegram/proxyManager.ts`
- **Native Resolution:** `1920 x 1080 px` (16:9 Full HD)
- **UI Focal Points & Visual Hierarchy:**
  1. **Modal Header:** Displays *"Proxy Settings — Alice Vance (+1 555-019-2834)"*, demonstrating that network settings are bound to the individual session rather than the global application.
  2. **Configured Proxy Socket Roster (`lines 110–152`):** Lists 3 distinct configured endpoints:
     - Residential SOCKS5: `127.0.0.1:10808`
     - Datacenter MTProxy: `de-fra.mtproxy.io:443` (with secret)
     - Corporate Gateway HTTP: `corp-gw.internal:8080`
  3. **Live TCP Latency Ping Badges (`lines 129–139`):** Color-coded round-trip latency badges:
     - `42ms` in emerald (`text-accent-emerald bg-accent-emerald/10`)
     - `115ms` in emerald (`text-accent-emerald bg-accent-emerald/10`)
     - `210ms` in amber (`text-accent-amber bg-accent-amber/10`)
  4. **Active Latency Refresh Trigger (`lines 141–148`):** `RefreshCw` icon initiating real-time socket ping benchmarks.
  5. **Add Proxy Configuration Form (`lines 156–220`):** Protocol dropdown (`SOCKS5`, `HTTP`, `MTProto`), Host/Port inputs, and optional MTProxy secret field.
- **Authoritative Technical Image Caption:**
  > *"Independent Per-Session Proxy Isolation Manager displaying dedicated SOCKS5, HTTP, and MTProto network transports bound to individual accounts with real-time TCP socket latency benchmarking. Unlike official TDesktop and 64gram where all accounts share one global proxy, Guidegram partitions network sockets, preventing IP cross-contamination and eliminating domino chain-bans."*
- **Verification & Code Mapping:**
  - `src/components/ProxySettingsModal.tsx:131-139`: `p.pingMs < 150 ? 'text-accent-emerald' : 'text-accent-amber'`
  - `electron/telegram/accountManager.ts:252-259`: `ProxyManager.toMtcuteTransport(savedAcc.proxyConfig)`

---

### Screenshot 3: Client-Side Group Activity Intelligence Engine

- **File Name:** `03_guidegram_group_activity_analytics.png` (and `03_guidegram_group_activity_analytics.webp`)
- **Primary Source Component:** `src/components/GroupStatsModal.tsx` (lines 35–100, 260–550)
- **Native Resolution:** `1920 x 1080 px` (16:9 Full HD)
- **UI Focal Points & Visual Hierarchy:**
  1. **Group Header & Context:** Shows *"Analytics — Guidegram Alpha Community (12,480 members)"*.
  2. **Timeframe Selector Pills (`lines 68, 120–145`):** Horizontal filter pills: `Today`, `Yesterday`, `Past 7 Days`, `Past 30 Days`, and `All Time`, with `Past 7 Days` selected.
  3. **Summary KPI Metric Cards (`lines 160–195`):**
     - Total Messages Analyzed: `4,892`
     - Active Senders: `318`
     - Peak Activity Hour: `18:00 UTC (412 msgs)`
     - Media Ratio: `28.4% (Photos / Videos / Files)`
  4. **Active Contributor Leaderboard (`Senders Tab`):** Member ranking displaying avatar, name, message count, and percentage share of conversation:
     - `#1 Alice Vance (Admin)`: 482 msgs (9.8%)
     - `#2 Bob Martinez`: 341 msgs (7.0%)
     - `#3 TechLead_ETH`: 295 msgs (6.0%)
  5. **24-Hour Activity Heatmap Bar Chart (`Hours Tab`):** High-density 24-bar hourly histogram highlighting diurnal traffic peaks.
  6. **Bilingual Stopword-Filtered Vocabulary Cloud (`Words Tab`):** Trending keywords extracted with exclusion of 110+ English/Persian conversational stopwords (`STOPWORDS` set).
- **Authoritative Technical Image Caption:**
  > *"Zero-bot client-side Group Activity Intelligence Engine analyzing MTProto chat history in real time. Ranks member contribution leaderboards, graphs 24-hour conversation velocity heatmaps, tracks media composition ratios, and extracts bilingual trending vocabulary—all computed entirely on the local client without requiring third-party bot tokens, admin rights, or external server exposure."*
- **Verification & Code Mapping:**
  - `src/components/GroupStatsModal.tsx:39-56`: Bilingual `STOPWORDS` exclusion set
  - `src/components/GroupStatsModal.tsx:36`: `type Timeframe = 'today' | 'yesterday' | 'week' | 'month' | 'all'`

---

### Screenshot 4: Combinatorial Hardware Anti-Fingerprinting Dashboard

- **File Name:** `04_guidegram_hardware_anti_fingerprinting.png` (and `04_guidegram_hardware_anti_fingerprinting.webp`)
- **Primary Source Component:** `src/components/SettingsModal.tsx` (lines 948–974) & `electron/telegram/deviceProfileManager.ts`
- **Native Resolution:** `1920 x 1080 px` (16:9 Full HD)
- **UI Focal Points & Visual Hierarchy:**
  1. **Settings Modal — 'Privacy & Security' Tab:** Clean card-based preferences layout.
  2. **Advanced Hardware Masking Card:**
     - Toggle: *"Randomize Hardware Fingerprint per Account"* (Active `checked` state, glowing cyan accent).
     - Informational Description: *"Simulates authentic corporate workstation specifications and randomizes OS build envelopes per session to prevent Telegram datacenter hardware correlation."*
  3. **Current Active Workstation Identity Preview:**
     - Simulated Workstation Model: `Dell XPS 15 9530`
     - Simulated Operating System: `Windows 11 26100.1742 Pro`
     - App Version Identifier: `Guidegram Desktop 1.7.0`
     - Locale Emulation: `en-US (System: en)`
  4. **Extended Privacy Controls:**
     - Toggle: *"Ghost Mode (Safe Stealth)"* — Delayed read receipts & silent story viewing.
     - Toggle: *"Always Delete for Both Sides"* — Enforces reciprocal message deletion by default.
- **Authoritative Technical Image Caption:**
  > *"Hardware Anti-Fingerprinting & Extended Privacy Dashboard: synthesizes 28+ authentic corporate workstation hardware profiles (Dell Latitude, ThinkPad X1 Carbon, MacBook Pro) and randomizes Windows 11/10 Update Build Revision (UBR) envelopes per session. Prevents Telegram DC server heuristics from linking multiple desktop accounts to a single physical workstation, paired with protocol-compliant stealth controls."*
- **Verification & Code Mapping:**
  - `electron/telegram/deviceProfileManager.ts:16-40`: Dell XPS / Latitude authentic model specifications
  - `electron/telegram/deviceProfileManager.ts:288-295`: Deterministic account seed pairing model with authentic UBR build

---

### Screenshot 5: 64gram Power Tooling Chat Viewport & Direct Forwarding

- **File Name:** `05_guidegram_power_chat_viewport.png` (and `05_guidegram_power_chat_viewport.webp`)
- **Primary Source Component:** `src/components/ChatViewport.tsx` & `src/components/DirectForwardModal.tsx`
- **Native Resolution:** `1920 x 1080 px` (16:9 Full HD)
- **UI Focal Points & Visual Hierarchy:**
  1. **Chat Header Numeric Identifiers (`lines 87–96`):**
     - Numeric Chat ID Pill: `# -1001892837412` with 1-click copy icon.
     - User ID Pill on profile hover: `UID: 781920394`.
  2. **Message List Seconds Timestamps (`line 89`):**
     - Message bubble showing high-precision timestamp: `14:28:45` (instead of standard `14:28`).
  3. **Message ID Hover Badge (`line 88`):**
     - Discrete pill on message bubble corner: `# 48192` with 1-click clipboard copy action.
  4. **Docked Reply Bar (`lines 33–36`):**
     - Docked cleanly above input box, showing replied author name, preview text snippet, and quick-cancel (`X`) button.
  5. **Direct Forward Modal (`Alt+F` trigger):**
     - Active direct forward dialog showing *"Forward without quote (drop_author: true)"* toggle checked and quick-forward to Saved Messages bookmark icon.
  6. **Raw Bot Callback Data Action:**
     - Context menu showing *"Copy Callback Data"* on an inline keyboard button.
- **Authoritative Technical Image Caption:**
  > *"Full 64gram power-tooling parity within a modern React 19 interface: displays numeric Chat IDs, User IDs, and Message IDs with 1-click clipboard copying, high-precision timestamps with seconds, direct unquoted forwarding (`Alt+F`), and raw bot callback data inspection without legacy C++ compilation overhead."*
- **Verification & Code Mapping:**
  - `src/components/ChatViewport.tsx:87-95`: `showChatId`, `showMessageId`, `showSeconds`, `quickForwardToSaved`
  - `src/components/ChatViewport.tsx:114`: `onOpenDirectForward: (message: MessageItem) => void`

---

### Screenshot 6: True Portable Architecture & Zero-Trace Local Storage

- **File Name:** `06_guidegram_portable_storage_architecture.png` (and `06_guidegram_portable_storage_architecture.webp`)
- **Primary Source Component:** Windows Explorer / File System Layout & `electron/main.ts` (lines 40–52)
- **Native Resolution:** `1920 x 1080 px` (16:9 Full HD)
- **UI Focal Points & Visual Hierarchy:**
  1. **Split-Screen Desktop Layout:**
     - Left: Guidegram active window.
     - Right: Clean Windows File Explorer window showcasing the self-contained portable directory:
       ```text
       D:\Guidegram\
       ├── Guidegram.exe             (Self-contained standalone binary)
       ├── d3dcompiler_47.dll
       ├── ffmpeg.dll
       └── data\                     (100% Isolated Local User Data)
           ├── sessions\             (Encrypted MTProto session auth keys)
           │   ├── acc_1_auth.bin
           │   └── acc_2_auth.bin
           ├── cache\                (LevelDB and media chunk cache)
           ├── settings.json         (Local preferences & proxy configs)
           └── logs\                 (Local sanitized execution logs)
       ```
  2. **Zero-Registry Callout Graphic:**
     - Visual badge or infographic verifying:
       - `Registry Keys Created: 0`
       - `%APPDATA% Residue: 0 bytes`
       - `Dual-Layer Safe Backup: Enabled` (`safe_backup/` fallback protection)
- **Authoritative Technical Image Caption:**
  > *"100% Truly Portable, Zero-Registry Architecture: all session keys, leveldb caches, and configurations reside self-contained within `./data/` adjacent to the executable. Leaves zero forensic traces in the Windows Registry or `%APPDATA%`, allowing seamless plug-and-play execution from encrypted USB drives with dual-mirrored backup protection."*
- **Verification & Code Mapping:**
  - `electron/main.ts:42-46`: `const portableDataDir = path.join(path.dirname(app.getPath('exe')), 'data'); app.setPath('userData', portableDataDir)`
  - `build/installer.nsh`: Custom upgrade guardrails preventing recursive directory erasure.

---

## 6. Screenshot Capture Checklist & Pre-Flight Script

To execute the screenshot generation process consistently across releases:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                            PRE-FLIGHT SCREENSHOT CAPTURE CHECKLIST                          │
├────┬───────────────────────────────────────────┬───────────────┬────────────────────────────┤
│ #  │ Capture Action                            │ Verified Spec │ Status                     │
├────┼───────────────────────────────────────────┼───────────────┼────────────────────────────┤
│ 01 │ Set Display Scaling to 100% (96 DPI)      │ No Blur       │ [ ] Ready for Capture      │
│ 02 │ Window Resolution locked to 1920x1080     │ 16:9 Canvas   │ [ ] Verified in Electron   │
│ 03 │ Dark Slate Theme Active (#0b0e14)         │ sRGB Color    │ [ ] Applied in Settings    │
│ 04 │ Load 8 Mock Personas into AccountDock     │ Clean Phones  │ [ ] Loaded via Fixtures    │
│ 05 │ Configure SOCKS5/MTProxy with Ping ms     │ 42ms/115ms    │ [ ] Populated in Modal     │
│ 06 │ Open GroupStats on Mock Alpha Community   │ 7-Day Window  │ [ ] History Populated      │
│ 07 │ Enable Anti-Fingerprinting in Settings    │ Dell XPS 15   │ [ ] Active in Profile Mgr  │
│ 08 │ Capture Master PNG-24 Lossless Images     │ 1920x1080     │ [ ] Captured to Assets Dir │
│ 09 │ Encode WebP 95% with Sharp YUV            │ Lightweight   │ [ ] WebP Dist Ready        │
│ 10 │ Verify Zero Personally Identifiable Data  │ Full Anonymity│ [ ] Formally Certified    │
└────┴───────────────────────────────────────────┴───────────────┴────────────────────────────┘
```

---

## 7. Press & Media Pack Archive Layout

All finalized image assets are archived in the repository for public download and media distribution:

```text
docs/strategy/launch_assets/media_kit/
├── branding/
│   ├── guidegram_icon_512x512.png          (Square app icon with alpha transparency)
│   ├── guidegram_icon_256x256.png
│   ├── guidegram_app_icon.ico              (Multi-layer Windows ICO)
│   └── guidegram_banner_1280x640.png       (GitHub & Twitter release banner)
├── screenshots_png/
│   ├── 01_guidegram_multi_account_dock.png
│   ├── 02_guidegram_per_session_proxy_manager.png
│   ├── 03_guidegram_group_activity_analytics.png
│   ├── 04_guidegram_hardware_anti_fingerprinting.png
│   ├── 05_guidegram_power_chat_viewport.png
│   └── 06_guidegram_portable_storage_architecture.png
└── screenshots_webp/
    ├── 01_guidegram_multi_account_dock.webp
    ├── 02_guidegram_per_session_proxy_manager.webp
    ├── 03_guidegram_group_activity_analytics.webp
    ├── 04_guidegram_hardware_anti_fingerprinting.webp
    ├── 05_guidegram_power_chat_viewport.webp
    └── 06_guidegram_portable_storage_architecture.webp
```

Each image file in the media kit is directly accompanied by the corresponding authoritative technical caption documented in Section 5 of this guide.
