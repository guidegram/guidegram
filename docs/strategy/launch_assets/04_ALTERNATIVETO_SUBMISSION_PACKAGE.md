# Guidegram — AlternativeTo Listing Submission Package & Platform Copy

**Target Platform:** AlternativeTo (`https://alternativeto.net`)  
**Application Name:** Guidegram  
**Canonical Repository:** `https://github.com/guidegram/guidegram`  
**License:** GNU General Public License v3.0 (GPLv3)  
**Document Status:** Production Launch Ready (Zero Placeholders)  
**Publication Date:** September 2026  

---

## 1. Directory Metadata & Classification

| Metadata Field | Platform Value | Technical Specification & Source Verification |
|:---|:---|:---|
| **Application Name** | `Guidegram` | Formally registered in `package.json` (`"name": "guidegram"`) and `electron-builder.json` (`productName: "Guidegram"`). |
| **Website / Homepage URL** | `https://github.com/guidegram/guidegram` | Canonical open-source project repository and release distribution hub. |
| **Source Code Repository URL** | `https://github.com/guidegram/guidegram` | Direct public repository link certifying full FOSS compliance. |
| **License Classification** | `Open Source (GPLv3)` | GNU General Public License v3.0 (`LICENSE` file in repo root; SPDX: `GPL-3.0-or-later`). |
| **Cost / Pricing Model** | `Free / Open Source` | 100% free; zero subscription tiers, zero feature paywalls, and zero advertising relays. |
| **Platforms Supported** | `Windows`, `macOS`, `Linux` | Verified in `electron-builder.json`: Windows (NSIS & Portable `dir`), macOS (`universal dmg`), Linux (`AppImage`). |
| **Portability Classification** | `Yes (Portable App)` | True portable architecture; self-contained in `./data/` adjacent to executable with zero Windows Registry residue. |
| **Primary Category** | `Instant Messaging` / `Communication` | Primary directory classification matching Telegram desktop alternatives. |
| **Secondary Category** | `Privacy Tools` / `Productivity` | Captures power users seeking multi-session management and anti-fingerprinting defenses. |

---

## 2. Short Description / Tagline (Strict Character Limit Verification)

AlternativeTo strictly enforces a maximum length of **150 characters** (including spaces and punctuation) on the short description field. Submissions exceeding 150 characters are automatically rejected by platform validation.

### 2.1 Primary Recommended Short Description (Candidate 1)

```text
Open-source portable Telegram client with unlimited accounts, isolated per-account proxies, hardware anti-fingerprinting, and group analytics.
```

#### Exact Character Count Proof (Candidate 1)
- **Exact String**: `"Open-source portable Telegram client with unlimited accounts, isolated per-account proxies, hardware anti-fingerprinting, and group analytics."`
- **Total Character Count**: **142 characters**
- **Safety Margin Below 150 Limit**: **8 characters remaining**
- **Validation Status**: **STRICT PASS (Optimal for All Directory Indexes)**

#### Mathematical Character Breakdown (Candidate 1)
```text
O p e n - s o u r c e [space]       --> 12 characters (Cumulative: 12)
p o r t a b l e [space]             -->  9 characters (Cumulative: 21)
T e l e g r a m [space]             -->  9 characters (Cumulative: 30)
c l i e n t [space]                 -->  7 characters (Cumulative: 37)
w i t h [space]                     -->  5 characters (Cumulative: 42)
u n l i m i t e d [space]           --> 10 characters (Cumulative: 52)
a c c o u n t s , [space]           --> 10 characters (Cumulative: 62)
i s o l a t e d [space]             -->  9 characters (Cumulative: 71)
p e r - a c c o u n t [space]       --> 12 characters (Cumulative: 83)
p r o x i e s , [space]             -->  9 characters (Cumulative: 92)
h a r d w a r e [space]             -->  9 characters (Cumulative: 101)
a n t i - f i n g e r p r i n t i n g , [space] --> 21 characters (Cumulative: 122)
a n d [space]                       -->  4 characters (Cumulative: 126)
g r o u p [space]                   -->  6 characters (Cumulative: 132)
a n a l y t i c s .                 --> 10 characters (Cumulative: 142)
--------------------------------------------------------------------------------
Total Character Count: 142 <= 150 Ceiling (Delta: -8 characters)
```

---

### 2.2 Secondary Short Description Variant (Candidate 2 — Desktop Focus)

```text
Open-source portable Telegram desktop client with unlimited accounts, per-session proxy isolation, hardware anti-fingerprinting, and group analytics.
```

#### Exact Character Count Proof (Candidate 2)
- **Exact String**: `"Open-source portable Telegram desktop client with unlimited accounts, per-session proxy isolation, hardware anti-fingerprinting, and group analytics."`
- **Total Character Count**: **149 characters**
- **Safety Margin Below 150 Limit**: **1 character remaining**
- **Validation Status**: **STRICT PASS (Maximum Keyword Density for Desktop Searches)**

#### Mathematical Character Breakdown (Candidate 2)
```text
O p e n - s o u r c e [space]       --> 12 characters (Cumulative: 12)
p o r t a b l e [space]             -->  9 characters (Cumulative: 21)
T e l e g r a m [space]             -->  9 characters (Cumulative: 30)
d e s k t o p [space]               -->  8 characters (Cumulative: 38)
c l i e n t [space]                 -->  7 characters (Cumulative: 45)
w i t h [space]                     -->  5 characters (Cumulative: 50)
u n l i m i t e d [space]           --> 10 characters (Cumulative: 60)
a c c o u n t s , [space]           --> 10 characters (Cumulative: 70)
p e r - s e s s i o n [space]       --> 12 characters (Cumulative: 82)
p r o x y [space]                   -->  6 characters (Cumulative: 88)
i s o l a t i o n , [space]         --> 11 characters (Cumulative: 99)
h a r d w a r e [space]             -->  9 characters (Cumulative: 108)
a n t i - f i n g e r p r i n t i n g , [space] --> 21 characters (Cumulative: 129)
a n d [space]                       -->  4 characters (Cumulative: 133)
g r o u p [space]                   -->  6 characters (Cumulative: 139)
a n a l y t i c s .                 --> 10 characters (Cumulative: 149)
--------------------------------------------------------------------------------
Total Character Count: 149 <= 150 Ceiling (Delta: -1 character)
```

---

## 3. Structured Long Overview (Markdown Formatted for AlternativeTo)

The following markdown is formatted specifically for the AlternativeTo application description field:

```markdown
Guidegram is an open-source, truly portable desktop client for Telegram engineered specifically for community managers, power users, growth operators, and privacy advocates who require uncompromising multi-session orchestration, operational security, and client-side intelligence.

While the official Telegram Desktop client restricts users to 3 accounts and funnels all traffic through a single global proxy tunnel, Guidegram establishes complete architectural independence for every identity you operate.

### Key Capabilities

• **Unlimited Multi-Account Dock & Unified Inbox**: Manage 5, 20, or 100+ Telegram accounts concurrently inside a dedicated 72px vertical dock. Switch identities instantly with zero viewport re-render lag using global keyboard shortcuts (`Ctrl+1` through `Ctrl+9`). A centralized Unified Inbox aggregates unread message counters across all accounts in real time, giving community managers comprehensive situational awareness without tedious account switching.

• **Dedicated Per-Session Proxy Isolation**: Assign independent SOCKS5, HTTP, or MTProto proxies to individual accounts. Each identity maintains its own dedicated TCP socket tunnel and real-time latency ping monitor (`ms`). By partitioning network routes per account, Guidegram completely eliminates network-level IP linkage, preventing the catastrophic domino chain-bans common to official TDesktop and traditional C++ forks.

• **Combinatorial Hardware Anti-Fingerprinting**: Emulates 28+ authentic corporate workstation hardware specifications (Dell Latitude/XPS, Lenovo ThinkPad X1 Carbon, HP EliteBook, Apple MacBook Pro, Microsoft Surface) and dynamically randomizes Windows 11/10 Update Build Revision (UBR) envelopes. Each session presents an authentic, distinct cryptographic hardware signature to Telegram's datacenter infrastructure, shielding operators from automated cross-account device correlation.

• **Native In-App Group Activity Intelligence**: Built-in client-side analytics engine evaluates MTProto chat history across custom timeframes (Today, Yesterday, Past 7 Days, Past 30 Days, All Time). View member contribution leaderboards, 24-hour conversation heatmaps, media composition ratios, and bilingual stopword-filtered vocabulary velocity—computed entirely on your local machine with zero third-party bots, zero server data leakage, and zero subscription costs.

• **100% Truly Portable (Zero Registry Footprint)**: All cryptographic session keys, leveldb caches, media binaries, and preferences reside strictly within a local `./data/` directory adjacent to the executable. Leaves zero forensic traces in the Windows Registry or `%APPDATA%`, allowing plug-and-play execution from encrypted USB drives with automated dual-layer safe backup protection.

• **64gram Power Tooling Parity**: Full integration of essential power tools: numeric Chat ID and User ID display with 1-click clipboard copy, message ID inspection, timestamp resolution with seconds (`HH:mm:ss`), direct unquoted forwarding (`drop_author: true`, hotkey `Alt+F`), 1-click forward to Saved Messages, and raw bot callback data inspection.

• **Protocol-Compliant Safe Stealth**: Read messages without sending read receipts, inspect Telegram Stories without appearing in publisher view ledgers, and suppress typing indicators—all while preserving MTProto message sequencing to prevent automated server-side anti-fraud flags (`FLOOD_WAIT` or `PeerFlood`).

• **Parallel Chunked Media Acceleration**: Multi-worker MTProto streaming pipeline utilizes 4 concurrent download workers with 512KB chunk buffers for media larger than 2MB, delivering up to 3x throughput over standard single-stream clients.

### Modern Architecture & Privacy Guarantees

Guidegram departs from monolithic legacy C++/Qt architectures, utilizing a modern, decoupled desktop stack: **React 19**, **TypeScript 5.7**, **Vite 6**, **Electron 34**, and **GramJS** (MTProto 2.0). 

It connects directly to official Telegram Data Centers (DC1–DC5) via client-side cryptographic protocols. All session keys remain strictly encrypted on your local storage. There are zero intermediary cloud relays, zero external telemetry trackers, and zero analytics daemons.
```

---

## 4. Exact Tag & Feature Mapping on AlternativeTo

AlternativeTo uses standardized tags and feature flags to index software and power its recommendation engine. Guidegram must be tagged with the following exact values:

### 4.1 Primary Platform Tags
- `Windows` (Supports Windows 10 and Windows 11 x64)
- `macOS` (Universal binary for Apple Silicon M-series and Intel x64)
- `Linux` (Standalone AppImage and x64 desktop support)
- `Portable App` (Strict local directory isolation in `./data/`; zero registry hooks)

### 4.2 Core Category & Feature Taxonomy
| AlternativeTo Feature Flag | Guidegram Implementation & Architectural Moat |
|:---|:---|
| **Multi-Account** | **Primary Differentiator:** Unlimited concurrent accounts (100+) inside a 72px vertical dock with unified unread counter badge and `Ctrl+1..9` accelerators. Breaks the official 3-account ceiling. |
| **Proxy Support** | **Isolated Per-Account Transports:** Individual SOCKS5, HTTP, and MTProxy configurations per session with live round-trip latency ping benchmarking (`ms`). |
| **Anti-Fingerprinting** | **Hardware Masking:** 28+ authentic workstation profiles (Dell, Lenovo, HP, Apple, Surface) and dynamic Windows 11/10 UBR build randomization per session. |
| **Open Source** | **Certified Copyleft:** 100% open-source under GNU General Public License v3.0 (GPL-3.0). Complete public code auditability. |
| **Portable App** | **Zero OS Footprint:** Self-contained `./data/` runtime directory. Operates without Windows Registry keys, `%APPDATA%` pollution, or administrator installation rights. |
| **Telegram Client** | **Full Protocol Compatibility:** Standalone third-party desktop client communicating directly with Telegram MTProto Data Centers (DC1–DC5). |
| **MTProto** | **Native MTProto 2.0:** Powered by GramJS and `@mtcute`, implementing modern Telegram RPC schemas, chunked media streaming, Stories, and Forum Topics. |
| **Privacy Focused** | **Zero Telemetry & Local Storage:** No intermediary relay servers, zero telemetry SDKs, no tracking analytics, local cryptographic key encryption, and dual-layer backup. |
| **Group Management** | **Client-Side Analytics:** Built-in 24h conversation heatmap, active member leaderboard, media breakdown, and bilingual stopword-filtered vocabulary velocity. |
| **No Telemetry** | **Strict Local Boundary:** Absolute absence of third-party telemetry, crash-reporting daemons, Google Analytics, or remote tracking pings. |
| **Dark Theme** | **Optimized Dark Palette:** Power-user dark aesthetic (slate `#0b0e14`, card `#111622`, accent `#50a2e9`) engineered for OLED efficiency and extended operational sessions. |
| **Keyboard Shortcuts** | **High-Velocity Ergonomics:** Global accelerators for rapid account switching (`Ctrl+1..9`), direct unquoted forwarding (`Alt+F`), and quick folder navigation. |
| **Message Scheduling** | **Native Scheduling View:** Direct access to schedule messages for future dispatch per account without bot requirements. |
| **Ghost Mode** | **Protocol-Compliant Stealth:** Non-intrusive read receipt suppression and silent story viewing without triggering out-of-order MTProto sequence bans. |
| **Electron App** | **Modern Extensible Runtime:** Built on Electron 34, React 19, and TypeScript 5.7, eliminating the multi-hour C++ compilation overhead of legacy forks. |

---

## 5. Differentiating Competitor Alternative Mapping Copy

When submitting Guidegram on AlternativeTo, the platform asks: *"What software is this an alternative to?"* Guidegram must be explicitly linked as an alternative to the four primary desktop clients: **Official Telegram Desktop**, **64gram**, **Kotatogram Desktop**, and **AyuGram Desktop**.

Below is the authoritative, publication-ready comparative copy for each alternative link:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                          ALTERNATIVETO COMPETITOR MAPPING MATRIX                            │
├───────────────────────┬───────────────────────────────────┬─────────────────────────────────┤
│ Competitor Name       │ AlternativeTo Slug / URL          │ Primary Architectural Moat      │
├───────────────────────┼───────────────────────────────────┼─────────────────────────────────┤
│ 1. Telegram Desktop   │ /software/telegram-desktop/       │ Unlimited accounts + per-account│
│    (Official TDesktop)│                                   │ proxy isolation vs 3-acc global.│
├───────────────────────┼───────────────────────────────────┼─────────────────────────────────┤
│ 2. 64gram             │ /software/64gram/                 │ Escapes C++ maintenance trap;   │
│    (TDesktop-64)      │                                   │ adds per-session proxy & spoof. │
├───────────────────────┼───────────────────────────────────┼─────────────────────────────────┤
│ 3. Kotatogram Desktop │ /software/kotatogram-desktop/     │ Modern, actively maintained     │
│                       │                                   │ successor with MTProto 2.0.     │
├───────────────────────┼───────────────────────────────────┼─────────────────────────────────┤
│ 4. AyuGram Desktop    │ /software/ayugram/                │ Heuristic-safe stealth without  │
│                       │                                   │ out-of-order MTProto ban risks. │
└───────────────────────┴───────────────────────────────────┴─────────────────────────────────┘
```

---

### 5.1 Guidegram as an Alternative to Official Telegram Desktop (TDesktop)
**AlternativeTo Link Target:** `/software/telegram-desktop/`  
**Relationship:** Direct Replacement & Power-User Upgrade  

#### Comparative Analysis & Positioning Copy
> **Why Choose Guidegram over Official Telegram Desktop:**  
> The official Telegram Desktop client is engineered as a minimal consumer messenger, imposing rigid architectural constraints that bottleneck professional workflows. TDesktop restricts users to a hardcoded ceiling of **3 accounts** (expandable only to 6 with a paid Telegram Premium subscription) and routes all network traffic through a **single global proxy singleton**. For community administrators, growth teams, and privacy researchers operating multiple accounts, this shared tunnel creates a critical single-point-of-failure: an IP flag or connection dropout on one account instantly compromises all active sessions. Furthermore, switching accounts in TDesktop requires opening a sliding drawer and suffering a complete viewport re-render with zero cross-account notification visibility.
>
> **Guidegram's Decisive Advantages:**  
> 1. **Unlimited Multi-Account Dock (100+ Accounts):** Features a dedicated 72px vertical dock with instant keyboard switching (`Ctrl+1..9`) and a persistent Unified Inbox badge that aggregates unread messages across all configured identities in real time.  
> 2. **Dedicated Per-Session Proxy Isolation:** Every account maintains its own independent SOCKS5, HTTP, or MTProto transport. Egress IP addresses are completely isolated, eliminating network-level IP linkage and protecting operators from domino chain-bans.  
> 3. **Combinatorial Hardware Anti-Fingerprinting:** TDesktop broadcasts a static `"PC 64bit"` identifier and the host OS kernel version across all sessions. Guidegram generates authentic, unique corporate workstation profiles (Dell, Lenovo, HP, MacBook Pro) and randomizes Windows 11/10 build envelopes per session to prevent server-side device correlation.  
> 4. **Native Client-Side Group Analytics:** TDesktop provides zero native conversation metrics, forcing administrators to install untrusted third-party cloud bots. Guidegram analyzes MTProto chat histories locally to deliver member leaderboards, 24-hour activity heatmaps, and vocabulary velocity with zero privacy leakage.

---

### 5.2 Guidegram as an Alternative to 64gram (TDesktop-64)
**AlternativeTo Link Target:** `/software/64gram/`  
**Relationship:** Modern Architectural Successor  

#### Comparative Analysis & Positioning Copy
> **Why Choose Guidegram over 64gram:**  
> 64gram pioneered essential power features for Telegram desktop users, including numeric Chat and User ID inspection, timestamps with seconds resolution, direct unquoted forwarding (`drop_author: true`), and raw bot callback data copying. However, because 64gram is built as a direct downstream C++20/Qt fork of TDesktop, it remains trapped in the **"C++ Fork Maintenance Trap."** The maintainer must dedicate up to 80% of active engineering bandwidth merely resolving complex C++ template conflicts, submodule shifts (`lib_base`, `lib_ui`), and multi-hour compilation cycles (requiring 60–100 GB of build dependencies) whenever upstream Telegram pushes an update.
>
> Consequently, 64gram inherits TDesktop's foundational structural limitations: it is permanently bound to the same 3-account ceiling and single global proxy architecture.
>
> **Guidegram's Decisive Advantages:**  
> 1. **100% 64gram Feature Parity:** Guidegram incorporates every staple 64gram utility—numeric Chat/User/Message IDs with 1-click copying, seconds timestamps (`HH:mm:ss`), direct forwarding (`Alt+F`), 1-click forwarding to Saved Messages, raw callback inspection, and animation toggles.  
> 2. **Escaping the C++ Maintenance Trap:** Built on modern Electron 34, React 19, and TypeScript 5.7, Guidegram decouples the user interface from upstream MTProto transport mechanics. Development environments launch in seconds (`pnpm dev`), welcoming contributions from the global web ecosystem without multi-hour C++ compiler overhead.  
> 3. **Architectural Innovations 64gram Cannot Deliver:** Guidegram adds an unlimited multi-account dock, dedicated per-session proxy isolation, deterministic hardware spoofing, and native client-side group analytics—capabilities that cannot be implemented within 64gram's C++ Qt monolith without re-architecting upstream TDesktop networking from scratch.

---

### 5.3 Guidegram as an Alternative to Kotatogram Desktop
**AlternativeTo Link Target:** `/software/kotatogram-desktop/`  
**Relationship:** Modern Actively Maintained Successor  

#### Comparative Analysis & Positioning Copy
> **Why Choose Guidegram over Kotatogram Desktop:**  
> Kotatogram was widely regarded as one of the most beloved alternative Telegram clients, praised for its rich UI customizability, custom font rendering, compact chat lists, and granular message display settings. However, Kotatogram stands as the quintessential casualty of the C++ fork maintenance crisis: the relentless cadence of upstream Telegram releases and the overwhelming burden of rebasing monolithic Qt submodules forced the solo maintainer to abandon active development. Today, Kotatogram is stagnant—lacking modern Telegram protocol features such as Topics 2.0, Telegram Stories, Star Gifts, and business tools.
>
> **Guidegram's Decisive Advantages:**  
> 1. **Active Maintenance on Modern MTProto 2.0:** Guidegram actively maintains full protocol compatibility with Telegram's latest layer updates, supporting forum topics, stories, custom emoji reactions, and modern media streaming via high-level TypeScript MTProto engines.  
> 2. **Superior Ergonomic & Visual Polish:** Where Kotatogram focused on compact layouts, Guidegram expands ergonomic control with a sleek, high-density 72px vertical dock, customizable dark slate UI, and flexible chat font-size controls.  
> 3. **Next-Generation Power Architecture:** Beyond cosmetic customization, Guidegram equips users with dedicated per-account proxy tunnels, authentic corporate hardware profile emulation, and native client-side conversation analytics—reviving the spirit of Kotatogram's power-user ethos on an architecture built for long-term sustainability.

---

### 5.4 Guidegram as an Alternative to AyuGram Desktop
**AlternativeTo Link Target:** `/software/ayugram/`  
**Relationship:** Heuristic-Safe, Ban-Proof Privacy Alternative  

#### Comparative Analysis & Positioning Copy
> **Why Choose Guidegram over AyuGram Desktop:**  
> AyuGram has attracted users interested in "Ghost Mode" (reading messages without sending read acknowledgments) and message-history preservation. However, AyuGram's approach to ghost mode creates severe account security vulnerabilities. By intercepting incoming updates and naively dropping `messages.readHistory` calls, AyuGram produces uncoordinated MTProto state anomalies. When a user interacts with, replies to, or reacts to a message that the Telegram server records as unread, the client transmits out-of-order sequence flags.
>
> Telegram's server-side fraud detection systems monitor these state transition graphs. Accounts operating uncoordinated ghost modes regularly trigger telemetry flags, resulting in sudden SMS login delivery bans, severe rate limits (`420 FLOOD_WAIT`), `PeerFlood` restrictions, and permanent account terminations during automated ban waves. Furthermore, AyuGram relies on closed pre-compiled binaries in parts of its build, introducing supply-chain trust concerns.
>
> **Guidegram's Decisive Advantages:**  
> 1. **Heuristic-Safe Stealth Operations:** Guidegram implements a protocol-compliant stealth model. It provides selective read receipt delay and silent story viewing (fetching story assets via background media queries without triggering the `stories.readStories` view ledger), while strictly ensuring that outgoing message sequences and reactions maintain valid MTProto state order to protect accounts from behavioral ban waves.  
> 2. **100% Auditable Open-Source Architecture:** Every line of Guidegram's codebase is public and auditable under GNU GPLv3. There are zero closed-source binaries, zero hidden network relays, and zero bundled third-party tracking components.  
> 3. **True Operational Privacy:** While AyuGram is confined to 3 accounts sharing a single global proxy, Guidegram provides true operational defense: 100+ accounts with dedicated per-session SOCKS5/MTProxy routing and authentic hardware profile cloaking.

---

## 6. Actionable Submission Checklist for Maintainers

When creating or claiming the Guidegram listing on `https://alternativeto.net/software/create/`:

- [ ] **Step 1: Application Basics**
  - Name: `Guidegram`
  - URL: `https://github.com/guidegram/guidegram`
  - License: Select `Open Source` -> `GNU General Public License v3.0 (GPLv3)`
  - Pricing: Select `Free`
- [ ] **Step 2: Short Description Verification**
  - Paste Candidate 1 (`142 characters`):
    `Open-source portable Telegram client with unlimited accounts, isolated per-account proxies, hardware anti-fingerprinting, and group analytics.`
  - Verify platform counter shows `<= 150` characters.
- [ ] **Step 3: Long Description Insertion**
  - Copy Section 3 markdown directly into the overview description field.
- [ ] **Step 4: Platform Selection**
  - Check `Windows`, `macOS`, `Linux`.
  - Check `Portable` option under Windows.
- [ ] **Step 5: Tags and Categories**
  - Primary Categories: `Instant Messaging`, `Communication`.
  - Add feature tags: `Multi-Account`, `Proxy Support`, `Anti-Fingerprinting`, `Open Source`, `Portable App`, `Telegram Client`, `MTProto`, `Privacy Focused`, `Group Management`, `No Telemetry`, `Dark Theme`, `Keyboard Shortcuts`.
- [ ] **Step 6: Competitor Alternative Links**
  - Add `Telegram Desktop` (`/software/telegram-desktop/`) + paste Section 5.1 copy.
  - Add `64gram` (`/software/64gram/`) + paste Section 5.2 copy.
  - Add `Kotatogram Desktop` (`/software/kotatogram-desktop/`) + paste Section 5.3 copy.
  - Add `AyuGram Desktop` (`/software/ayugram/`) + paste Section 5.4 copy.
- [ ] **Step 7: Media & Screenshots Upload**
  - Upload `512x512` app icon.
  - Upload 6 standard 1920x1080 master screenshots according to `05_MEDIA_KIT_AND_SCREENSHOT_GUIDE.md`.
- [ ] **Step 8: Final Review & Submit**
  - Confirm all URLs point to `github.com/guidegram/guidegram`.
  - Submit listing for AlternativeTo moderator approval.
