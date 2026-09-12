# Guidegram Multi-Channel Distribution Playbook & Platform Submissions

**Document Version**: 1.0.0  
**Status**: Publication-Grade Operational Reference  
**Target Repository**: `https://github.com/guidegram/guidegram`  
**License**: GNU General Public License v3.0 (GPL-3.0)  
**Author**: Guidegram Product & Strategy Core Team  

---

## Executive Summary & Strategic Architecture

Guidegram is an open-source, truly portable desktop client for Telegram engineered with **React 19**, **TypeScript**, **Electron**, and **GramJS** (MTProto 2.0). It is purpose-built to eliminate the critical architectural limitations of the official Telegram Desktop client and existing C++/Qt forks:
1. **Unlimited Multi-Account Dock**: Eliminates the rigid 3-account ceiling (or 6-account Telegram Premium limit) without requiring paid subscriptions.
2. **Dedicated Per-Account Network Isolation**: Bypasses the single global proxy bottleneck by assigning independent SOCKS5, HTTP, or MTProto proxies to individual accounts, neutralizing cross-session correlation and chain-reaction IP bans.
3. **Hardware Anti-Fingerprinting Engine**: Emulates 28+ authentic workstation device profiles (Dell XPS, Lenovo ThinkPad X1 Carbon, MacBook Pro) and randomizes OS build envelopes to protect legitimate operators against automated device-fingerprinting heuristics.
4. **100% Truly Portable Architecture**: All sessions, settings, avatars, and media caches live in a self-contained local `./data/` directory. Zero Windows Registry modifications and zero `%APPDATA%` file sprawl.
5. **Multi-Worker MTProto Media Acceleration**: Uses 4 parallel chunked workers (512KB chunks) to deliver up to 3x throughput on media larger than 2MB.
6. **Native In-App Group Analytics**: Computes 24-hour activity heatmaps, member contribution leaderboards, and message composition metrics directly from client-side history without requiring external bot tokens or admin rights.

### Core Target Personas

```
┌───────────────────────────────────────┬──────────────────────────────────────────┬──────────────────────────────────────────────────┐
│ Target Persona                        │ Core Technical Pain Points               │ Guidegram Core Value Proposition                 │
├───────────────────────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────────────┤
│ 1. Multi-Account Community Managers   │ 3-account limit; global proxy leaks IP   │ Unlimited vertical dock; dedicated proxy per     │
│    & Web3 / DAO Operators             │ across work/personal; risk of chain-ban. │ account with live ping; Ctrl+1..9 hotkeys.       │
├───────────────────────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────────────┤
│ 2. Privacy Advocates & Journalists    │ Static hardware GUID broadcast to DCs;   │ 28+ workstation spoofing profiles; zero registry │
│    & Security Researchers             │ registry traces; unencrypted metadata.   │ footprint; 100% local session keys; Ghost Mode.  │
├───────────────────────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────────────┤
│ 3. Group Admins & Channel Creators    │ Zero desktop analytics; blind to group   │ Built-in member leaderboard, 24h activity        │
│                                       │ activity patterns without shady bots.    │ heatmap, and message type composition metrics.   │
├───────────────────────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────────────┤
│ 4. Open-Source Developers (JS/TS)     │ TDesktop's 500k+ lines of legacy C++/Qt; │ Pure TypeScript + React 19 + Electron stack;     │
│                                       │ days to build; inaccessible to hack on.  │ modular GramJS MTProto engine; rapid prototyping.│
└───────────────────────────────────────┴──────────────────────────────────────────┴──────────────────────────────────────────────────┘
```

### Strategic Distribution Principles

1. **Zero-Spam, High-Value Engagement**: Never engage in mass cold outreach, automated PR bombing, or unsolicited direct messaging. Every communication must lead with technical substance.
2. **Radical Open-Source Transparency**: Always link directly to the source code repository under GPL-3.0. Highlight local session key storage, direct MTProto connections, and reproducible builds.
3. **Problem-First Technical Framing**: Frame Guidegram as a specialized technical solution to architectural bottlenecks (network isolation, hardware fingerprinting, data portability) rather than generic hype.

---

## 1. GitHub Ecosystem Strategy

### 1.1 Curated Awesome Lists Submissions

The curated Awesome list ecosystem (initiated by Sindre Sorhus) is one of the highest-converting, long-term organic discovery channels for open-source developer tooling. All submissions must strictly comply with the **Awesome Manifesto**:
- **Alphabetical Sorting**: Every entry must be placed in strict alphabetical order within its subcategory.
- **Formatting Standards**: Use the exact bullet format and punctuation specified by each repository's style guide.
- **Tone & Length**: Descriptions must be concise, factual, written in third-person, devoid of subjective superlatives ("the best", "revolutionary", "blazing fast"), and terminated with a period.

```
┌───────────────────────────────────┬───────────────────────────────┬───────────────────────────┬──────────────────────────────────────────┐
│ Repository                        │ Section                       │ Branch Name               │ Commit Message                           │
├───────────────────────────────────┼───────────────────────────────┼───────────────────────────┼──────────────────────────────────────────┤
│ ebertti/awesome-telegram          │ ## Clients > ### Desktop      │ feat/add-guidegram-client │ docs(clients): add Guidegram desktop app │
├───────────────────────────────────┼───────────────────────────────┼───────────────────────────┼──────────────────────────────────────────┤
│ serhii-londar/awesome-telegram    │ ## Apps > ### Desktop         │ feat/add-guidegram-app    │ docs(apps): add Guidegram desktop client │
├───────────────────────────────────┼───────────────────────────────┼───────────────────────────┼──────────────────────────────────────────┤
│ agarrharr/awesome-desktop-apps    │ ## Communication > ### Chat   │ add-guidegram             │ Add Guidegram to Communication / Chat    │
└───────────────────────────────────┴───────────────────────────────┴───────────────────────────┴──────────────────────────────────────────┘
```

#### Submission 1: `ebertti/awesome-telegram`

- **Upstream Repository**: `https://github.com/ebertti/awesome-telegram`
- **Target File**: `README.md`
- **Category / Section**: `## Clients` -> `### Desktop`
- **Branch Name**: `feat/add-guidegram-client`
- **Commit Message**: `docs(clients): add Guidegram desktop client`
- **Pull Request Title**: `Add Guidegram to Desktop Clients`

##### Raw Markdown Line (Strict Alphabetical Insertion)
Insert alphabetically among existing desktop clients using the en-dash (`–`) standard:

```markdown
* [Guidegram](https://github.com/guidegram/guidegram) – Open-source portable desktop client with unlimited multi-account, isolated per-account proxies, and group analytics.
```

##### Pull Request Body Template

```markdown
### What does this PR do?
Adds **Guidegram** to the `Clients > Desktop` section.

### Project Summary
- **Repository**: https://github.com/guidegram/guidegram
- **License**: GNU General Public License v3.0 (GPL-3.0)
- **Tech Stack**: Electron, React 19, TypeScript, GramJS (MTProto 2.0)
- **Key Features**: Unlimited multi-account dock, per-account proxy isolation (SOCKS5/HTTP/MTProto), hardware anti-fingerprinting, 100% portable zero-registry storage, and native group analytics.

### Awesome Manifesto Checklist
- [x] Item is added in strict alphabetical order in `## Clients > ### Desktop`.
- [x] Item description is factual, concise, and avoids marketing hype or subjective buzzwords.
- [x] Description ends with a period.
- [x] Link points directly to the active, open-source GitHub repository.
- [x] Project is actively maintained with documented releases.
```

---

#### Submission 2: `serhii-londar/awesome-telegram`

- **Upstream Repository**: `https://github.com/serhii-londar/awesome-telegram`
- **Target File**: `README.md`
- **Category / Section**: `## Apps` -> `### Desktop`
- **Branch Name**: `feat/add-guidegram-app`
- **Commit Message**: `docs(apps): add Guidegram desktop client`
- **Pull Request Title**: `Add Guidegram to Desktop Apps`

##### Raw Markdown Line (Strict Alphabetical Insertion)
Insert alphabetically with dual homepage/source link format:

```markdown
- [Guidegram](https://github.com/guidegram/guidegram) ([Source](https://github.com/guidegram/guidegram)) - Portable multi-account desktop client with per-account proxy isolation and hardware anti-fingerprinting.
```

##### Pull Request Body Template

```markdown
### Description
This pull request adds **Guidegram** to the `Apps > Desktop` category.

### Details
- **Name**: Guidegram
- **URL**: https://github.com/guidegram/guidegram
- **Source**: https://github.com/guidegram/guidegram
- **License**: GPL-3.0
- **Platform**: Windows Portable (x64)

### Verification
- [x] Formatted according to repository conventions: `- [Name](URL) ([Source](SourceURL)) - Description.`
- [x] Alphabetically placed.
- [x] Clear and objective description ending with a period.
```

---

#### Submission 3: `awesome-desktop-apps` (`agarrharr/awesome-desktop-apps` & `stevemao/awesome-desktop-apps`)

- **Upstream Repository**: `https://github.com/agarrharr/awesome-desktop-apps`
- **Target File**: `readme.md`
- **Category / Section**: `## Communication` -> `### Chat`
- **Branch Name**: `add-guidegram`
- **Commit Message**: `Add Guidegram to Communication / Chat`
- **Pull Request Title**: `Add Guidegram to Communication / Chat`

##### Raw Markdown Line

```markdown
- [Guidegram](https://github.com/guidegram/guidegram) - Open-source portable Telegram desktop client built with Electron, React 19, and TypeScript. [![GitHub stars](https://img.shields.io/github/stars/guidegram/guidegram.svg?style=social)](https://github.com/guidegram/guidegram)
```

##### Pull Request Body Template

```markdown
### Overview
Adds Guidegram, an open-source desktop client for Telegram built with Electron and React 19, to the `Communication > Chat` category.

### Attributes
- **Open Source**: Yes (GPL-3.0)
- **Built with Electron**: Yes (Electron 34 + React 19 + TypeScript + Vite)
- **Star Badge**: Included with official Shields.io markup
- **Active Development**: Yes (Precompiled portable releases available)
```

---

#### Special Status Note: `sindresorhus/awesome-electron`

- **Current Repository Status**: The primary `sindresorhus/awesome-electron` repository displays an active banner: `[SUBMISSIONS ARE TEMPORARILY PAUSED BECAUSE I'M TIRED OF REVIEWING LOW-QUALITY STUFF]`.
- **Actionable Protocol**: Do **not** submit pull requests while the pause banner is active, as automated or unsolicited PRs will be closed and may risk maintainer flagging.
- **Monitoring Strategy**: Re-check repository status bi-weekly. Prepare a submission under `Applications > Chat / Communication` once maintainer triage resumes.

---

### 1.2 Ethical GitHub Issue & Discussion Participation

Mass commenting on GitHub issues is an explicit violation of GitHub's Acceptable Use Policy (§ Abuse and Spam) and will result in repository shadowbanning. To engage ethically without triggering spam flags or alienating open-source maintainers, follow this strict protocol:

#### 1. Issue Discovery & Filtering Criteria
Only engage on issues in upstream or peer repositories (`telegramdesktop/tdesktop`, `64gram/64gram`, `kotatogram/kotatogram-desktop`) that satisfy **all four conditions**:
1. **Direct Problem Alignment**: The issue explicitly requests one of Guidegram's solved capabilities:
   - Multi-account expansion beyond the 3-account limit.
   - Dedicated per-account proxy configuration.
   - 100% portable mode without `%APPDATA%` or Windows Registry touches.
   - Built-in desktop group analytics/statistics.
2. **Definitively Closed / Wontfix**: The issue must be **closed** by the repository maintainer as `wontfix`, `not planned`, or `out of scope for official client`. Never participate in an open, actively triaged issue.
3. **Maturity Threshold**: The issue must have been closed for at least **14 days**.
4. **No Prior Guidegram Mention**: No other contributor has commented about Guidegram on that thread.

#### 2. Rules of Engagement & Maintainer Disclosure
- **Technical Answer First**: Explain the underlying architectural reason why the official C++/Qt client does not support the feature (e.g., Qt global network singleton in `lib_net`).
- **Mandatory Affiliation Disclosure**: Explicitly disclose: `(Full disclosure: I am a contributor to Guidegram. Sharing strictly as an open-source reference for those blocked by this limitation.)`
- **Zero Unsolicited Pings**: Never `@mention` maintainers or thread participants.
- **Maximum Velocity**: Strictly limit comments to **1 to 2 issues per week across GitHub**.

---

#### Verbatim Ethical Issue Comment Templates

##### Scenario A: Multi-Account Limit (>3 Accounts) Closed as Wontfix
*Target*: Issues requesting more than 3 accounts on Telegram Desktop.

```markdown
For context on why this is an architectural constraint in official TDesktop: the Qt client’s internal state machine couples the active window session with a fixed account array index (`Main::Domain`), where expanding beyond 3 accounts requires substantial structural rewrites of the window manager and memory pool.

If you need to operate more than 3 accounts concurrently on desktop without running multiple separate portable directories, we implemented an unlimited session dock in an open-source client:
👉 **Guidegram**: https://github.com/guidegram/guidegram (GPL-3.0, TypeScript/Electron/GramJS).

Each account runs as an isolated MTProto client instance managed via `electron/telegram/accountManager.ts`, allowing instant switching with `Ctrl+1..9` and no artificial account ceilings.

*(Full disclosure: I am a contributor to Guidegram. Sharing strictly as a technical reference for users blocked by this constraint.)*
```

##### Scenario B: Per-Account Proxy Isolation Closed as Wontfix
*Target*: Issues requesting independent proxies per account to prevent IP linking.

```markdown
To clarify the technical blocker in TDesktop: the network layer uses a global connection pool in `lib_net`. All active accounts share the exact same proxy socket configuration, which makes per-account routing difficult without rewriting how DC connections are multiplexed.

If you require dedicated proxies per account to prevent IP cross-contamination and chain-bans, this is natively supported in:
👉 **Guidegram**: https://github.com/guidegram/guidegram (GPL-3.0).

In Guidegram, each account session instantiates an independent GramJS `TelegramClient` coupled with its own dedicated SOCKS5/HTTP/MTProto tunnel configuration and live latency ping monitor (`electron/telegram/proxyManager.ts`).

*(Full disclosure: I am a contributor to Guidegram. Providing this strictly as an open-source reference.)*
```

##### Scenario C: Truly Portable / Zero-Registry Mode Closed as Wontfix
*Target*: Issues requesting complete portability without `%APPDATA%` or Registry writes.

```markdown
While TDesktop offers a portable archive, Chromium webview components, update checks, and URL protocol handlers frequently leave artifacts in `%APPDATA%` and the Windows Registry.

For a 100% self-contained portable implementation:
👉 **Guidegram**: https://github.com/guidegram/guidegram (GPL-3.0).

Guidegram overrides Electron's `userData` path directly at bootstrap to route all storage, LevelDB caches, media binaries, and session tokens into a single local `./data/` folder next to the binary (`electron/main.ts`). It makes zero registry calls and can be run entirely from an encrypted USB flash drive.

*(Full disclosure: I am a contributor to Guidegram. Documenting this here for users seeking fully isolated portable workflows.)*
```

---

## 2. AlternativeTo Directory Submission Package

AlternativeTo is the internet’s primary software recommendation and alternative discovery platform (Domain Rating ~80, ~2.5M monthly visits). Listing Guidegram against Telegram Desktop, 64gram, and Kotatogram captures high-intent users actively searching for replacements.

### 2.1 Complete Submission Form Metadata

- **Application Name**: `Guidegram`
- **Homepage URL**: `https://github.com/guidegram/guidegram`
- **Source Code URL**: `https://github.com/guidegram/guidegram`
- **License**: `Open Source` -> `GNU General Public License v3.0 (GPLv3)`
- **Cost / Pricing Model**: `Free` / `Open Source`
- **Supported Platforms**: `Windows` (Portable Standalone)
- **Primary Category**: `Instant Messaging` / `Communication`
- **Secondary Tags Suite**:
  `telegram-client`, `multi-account`, `portable-app`, `privacy-software`, `proxy-support`, `electron-app`, `react`, `typescript`, `open-source`, `group-management`, `anti-fingerprinting`, `socks5`, `mtproto`, `community-manager`

---

### 2.2 Short Description (Strict Character Limit Verification)

AlternativeTo imposes a strict **150-character maximum** on the short description field. The submission text below has been verified:

```text
Open-source portable Telegram client with unlimited accounts, isolated per-account proxies, hardware anti-fingerprinting, and group analytics.
```

#### Automated Character Verification Proof
- **Exact String**: `"Open-source portable Telegram client with unlimited accounts, isolated per-account proxies, hardware anti-fingerprinting, and group analytics."`
- **Character Count**: **142 characters** (including punctuation and spaces).
- **Status**: **PASS** (Strictly within the 150-character ceiling; 8 characters remaining).

---

### 2.3 Long Description (Structured Markdown)

```markdown
Guidegram is an open-source, truly portable desktop client for Telegram engineered specifically for power users, community administrators, and privacy advocates who require complete multi-session control without compromise.

While official Telegram Desktop limits users to 3 accounts and forces all traffic through a single global proxy, Guidegram provides complete architectural isolation for every identity you manage.

### Key Capabilities

• **Unlimited Multi-Account Dock**: Operate 5, 20, or 50+ Telegram accounts concurrently. Switch between accounts with zero latency using the vertical dock and keyboard shortcuts (`Ctrl+1..9`).
• **Dedicated Per-Account Proxies**: Assign independent SOCKS5, HTTP, or MTProto proxies to individual accounts. Each connection maintains its own socket tunnel and real-time latency ping monitor, preventing IP cross-contamination and chain-bans.
• **Hardware Anti-Fingerprinting Shield**: Emulates 28+ authentic workstation profiles (Dell XPS, Lenovo ThinkPad X1 Carbon, MacBook Pro) and randomizes OS build envelopes per session to neutralize automated device-linking heuristics.
• **100% Truly Portable (Zero Registry Footprint)**: All session credentials, configurations, avatars, and media caches are stored strictly within a single local `./data/` directory. Leaves zero traces in the Windows Registry or `%APPDATA%`.
• **Parallel MTProto Acceleration**: Uses 4 concurrent chunked download workers (512KB buffers) for media larger than 2MB, delivering up to 3x throughput.
• **Native Group Statistics & Activity Heatmaps**: Built-in analytics modal displays active member leaderboards, 24-hour message heatmaps, and media composition metrics without requiring bot tokens or admin rights.
• **Ghost Mode & Stealth Stories**: Read incoming messages without triggering read receipts, view stories anonymously without view logs, and suppress typing indicators.

### Architecture & Security Guarantees
Built with modern technologies: React 19, TypeScript, Electron 34, and GramJS. Connects directly to official Telegram Data Centers (DC1–DC5) via MTProto 2.0 with pure client-side cryptography. Zero intermediary servers, zero cloud relays, and zero telemetry.
```

---

### 2.4 Competitive Comparison Matrix vs Alternatives

```
┌───────────────────────────────────┬───────────────────────────┬───────────────────────────┬───────────────────────────┬───────────────────────────┐
│ Feature / Capability              │ Official Telegram Desktop │ 64gram                    │ Kotatogram                │ Guidegram                 │
├───────────────────────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────┤
│ **Account Limit**                 │ Max 3 (6 with Premium)    │ Max 3 (6 with Premium)    │ Max 3 (6 with Premium)    │ **Unlimited (Free)**      │
├───────────────────────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────┤
│ **Proxy Architecture**            │ Single global proxy       │ Single global proxy       │ Single global proxy       │ **Per-account isolated**  │
├───────────────────────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────┤
│ **Hardware Anti-Fingerprinting**  │ Static hardware GUID      │ Static hardware GUID      │ Static hardware GUID      │ **28+ Workstation spoof** │
├───────────────────────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────┤
│ **Portability & Registry Clean**  │ Writes to %APPDATA% & Reg │ Writes to %APPDATA% & Reg │ Writes to %APPDATA% & Reg │ **100% Isolated ./data/** │
├───────────────────────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────┤
│ **Native Group Analytics**        │ None (Requires bots)      │ None (Requires bots)      │ None (Requires bots)      │ **Built-in 24h heatmaps** │
├───────────────────────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────┤
│ **Media Download Engine**         │ Sequential single stream  │ Accelerated chunking      │ Sequential single stream  │ **4-Worker chunked boost**│
├───────────────────────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────┤
│ **Ghost Mode (Stealth Stories)**  │ None                      │ Partial ghost mode        │ Ghost mode                │ **Read & Story stealth**  │
├───────────────────────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────┤
│ **Codebase Architecture**         │ Legacy C++ / Qt (~500k L) │ Forked C++ / Qt           │ Forked C++ / Qt (Stalled) │ **TypeScript + React 19** │
├───────────────────────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────┤
│ **Maintenance & Protocol Layer**  │ Active (Official)         │ Active                    │ Inactive / Stalled (2023) │ **Active (MTProto 2.0)**  │
└───────────────────────────────────┴───────────────────────────┴───────────────────────────┴───────────────────────────┴───────────────────────────┘
```

#### Detailed Positioning Narratives for AlternativeTo Pages

##### 1. Positioning vs Official Telegram Desktop (TDesktop)
- **Why Choose Guidegram**: Official Telegram Desktop forces power users and community managers to run multiple portable directories or purchase Telegram Premium simply to access 6 accounts. Furthermore, routing all accounts through one global proxy leaks your real identity or causes chain-bans across all accounts if one proxy IP is restricted. Guidegram provides complete session sovereignty: unlimited accounts, dedicated proxy tunnels per account, hardware signature spoofing, and built-in group analytics.

##### 2. Positioning vs 64gram
- **Why Choose Guidegram**: 64gram is a capable C++/Qt power fork that introduced custom forwarders and message IDs. However, it inherits TDesktop's core limitation: a shared global proxy for all logged-in accounts. Guidegram isolates network traffic per account, adds 28+ hardware spoofing profiles to prevent device correlation, and provides a built-in group activity analytics engine. Built on TypeScript and React 19, Guidegram is also substantially easier for the web community to inspect and extend.

##### 3. Positioning vs Kotatogram
- **Why Choose Guidegram**: Kotatogram was a pioneer in Telegram desktop customization, but development has largely stalled since 2022–2023, leaving it out-of-sync with modern Telegram features (Star gifts, rich reaction matrices, and protocol updates). Guidegram is actively maintained on modern MTProto 2.0, offering contemporary Telegram capabilities alongside advanced multi-account proxy and anti-fingerprinting features.

---

## 3. Software Directories & Launch Platforms

### 3.1 Product Hunt Launch Blueprint

Product Hunt offers concentrated exposure to early adopters, community managers, indie makers, and tech enthusiasts. Launches must be orchestrated around Product Hunt's **00:01 PST (08:01 UTC)** daily reset.

#### Submission Metadata & Copy
- **Product Name**: `Guidegram`
- **Tagline** (Strictly under 60 characters):
  `Portable multi-account Telegram client with proxy isolation`  
  *(Length: 59 characters — verified)*
- **Primary Category**: `Productivity`, `Developer Tools`, `Privacy`
- **Pricing**: `Free & Open Source (GPLv3)`
- **Website / Download URL**: `https://github.com/guidegram/guidegram`

#### Maker's First Comment (Launch Story)

```markdown
Hey Product Hunt! 👋

I'm thrilled to introduce **Guidegram** — an open-source, truly portable desktop client for Telegram built for community managers, privacy advocates, and power users.

### The Problem We Solved
If you manage multiple Telegram communities, test bots, or separate work from personal communications, you've likely encountered two frustrating barriers in the official desktop app:
1. **The 3-Account Ceiling**: You cannot run more than 3 accounts without paying for Telegram Premium (which still only gives you 6).
2. **The Global Proxy Bottleneck**: All accounts share the exact same proxy IP. If one proxy disconnects or triggers a rate limit, all your accounts face disruption or chain-bans.

### What Guidegram Delivers
We rebuilt the desktop experience from scratch using **React 19**, **TypeScript**, **Electron**, and **GramJS** (MTProto 2.0):
• ⚡ **Unlimited Accounts Dock**: Run 5, 10, or 20+ accounts with instant `Ctrl+1..9` switching.
• 🔒 **Per-Account Proxy Isolation**: Assign dedicated SOCKS5, HTTP, or MTProto proxies to each account with real-time latency ping monitoring.
• 🛡️ **Hardware Anti-Fingerprinting**: Emulates 28+ authentic workstation profiles (Dell XPS, ThinkPad X1, MacBook Pro) per account to prevent device correlation.
• 📁 **100% Truly Portable**: All data lives in a local `./data` folder next to the app. Zero Windows Registry entries, zero `%APPDATA%` sprawl.
• 📊 **In-Chat Group Analytics**: View 24-hour activity heatmaps and member leaderboards right from your desktop.
• 🚀 **Parallel MTProto Acceleration**: 4-worker chunked streaming for up to 3x faster media downloads.

### Open Source & Privacy Guarantees
Guidegram is 100% free and open-source under GPL-3.0. All cryptographic session keys stay strictly on your local machine. There are zero intermediary servers, zero cloud relays, and zero telemetry.

We’d love to get your feedback and feature requests in the comments! 🚀
```

#### First-Day Launch Schedule (24-Hour Roadmap)

```
┌─────────────────┬─────────────────┬────────────────────────────────────────────────────────────────────────┐
│ Time (PST)      │ Time (UTC)      │ Action Item & Operational Milestone                                    │
├─────────────────┼─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 00:01 PST       │ 08:01 UTC       │ Launch goes live on Product Hunt. Post Maker's Comment immediately.    │
├─────────────────┼─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 00:15 PST       │ 08:15 UTC       │ Publish Announcement in official Telegram channel (`@guidegram_app`).  │
├─────────────────┼─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 01:00 PST       │ 09:00 UTC       │ Post Twitter/X 4-part thread with high-res demo video.                 │
├─────────────────┼─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 05:00 PST       │ 13:00 UTC       │ Submit "Show HN: Guidegram" to Hacker News (peak EU/US morning overlap)│
├─────────────────┼─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 06:00 PST       │ 14:00 UTC       │ Post to `r/opensource` with focus on architecture and contributor call.│
├─────────────────┼─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 08:00–16:00 PST │ 16:00–00:00 UTC │ Monitor comments on Product Hunt, HN, and Reddit; respond within 15 min│
├─────────────────┼─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 23:59 PST       │ 07:59 UTC       │ Day 1 conclusion: Archive feedback, create GitHub issues for top asks. │
└─────────────────┴─────────────────┴────────────────────────────────────────────────────────────────────────┘
```

#### Assets & Media Checklist
- [x] **Logo / App Icon**: 240x240 PNG/SVG, clean contrast on light and dark backgrounds.
- [x] **Product Gallery Images (1270x760 px)**:
  - Slide 1: Main interface with 10+ accounts docked, active chat, and dark theme.
  - Slide 2: Proxy Manager showing dedicated SOCKS5/MTProto configuration per account with live ping badges.
  - Slide 3: Group Analytics modal displaying 24-hour activity heatmap and member leaderboard.
  - Slide 4: Hardware Anti-Fingerprinting selector with authentic device profiles.
  - Slide 5: Portability overview showing self-contained `./data/` folder structure.
- [x] **Teaser Demo (GIF / MP4)**: 15–25 seconds, showing rapid account switching via `Ctrl+1..5`, real-time proxy ping test, and opening group stats.

---

### 3.2 Open-Source & Multi-Platform Software Directories

In addition to web launch platforms, software directories provide high-intent direct download traffic:

1. **Softpedia Windows (Portable Apps)**:
   - Category: `C:\Internet\Chat / Communication`
   - Listing title: `Guidegram Portable`
   - Highlights: 100% clean certification, zero installation required, standalone executable.
2. **MajorGeeks & SnapFiles**:
   - Focus on system administrators and power users needing portable communication utilities.
3. **FossHub & SourceForge**:
   - Provide mirror hosting for release binaries (`Guidegram-Windows-x64-Portable.zip`).
4. **Linux & macOS Ecosystem Roadmap (Call for Community Packagers)**:
   - **Flathub (Flatpak)**: Target manifest `com.github.guidegram.Guidegram` using Electron base runtime.
   - **Arch User Repository (AUR)**: Provide `guidegram-bin` PKGBUILD extracting portable binaries.
   - **Homebrew Cask**: Prepare `guidegram.rb` for future macOS universal builds.

---

## 4. Reddit & Tech Forums Tactical Playbook

### 4.1 Subreddit Blueprints

To succeed on Reddit, each post must strictly respect subreddit-specific rules, focus on educational/architectural value, and adhere to the **9:1 contribution ratio** (9 community contributions for every 1 self-referential post). Never cross-post identical text to multiple subreddits simultaneously; enforce a **72-hour delay between subreddits**.

#### 1. `r/Telegram` (~150k+ Members)
- **Target Flair**: `Client` or `Third-Party`
- **Rule Compliance**: Disclose unofficial status; confirm official Telegram API / MTProto usage; link directly to FOSS repository; zero download paywalls.
- **Title**: `[Open Source] Guidegram: Portable desktop client with unlimited accounts, per-account proxies, and group analytics`

##### Post Copy

```markdown
Hey r/Telegram,

If you manage multiple communities, test bots, or separate work from personal accounts, you've likely hit the 3-account ceiling in Telegram Desktop or dealt with the frustration of having only one global proxy for all active accounts.

We built and open-sourced **Guidegram** to solve these desktop bottlenecks:

**What it does:**
- **Unlimited Accounts**: Bypass the 3-account ceiling without needing Premium. Switch instantly with `Ctrl + 1..9`.
- **Per-Account Proxy Isolation**: Assign different SOCKS5/MTProto proxies to each account. If one proxy disconnects, your other accounts stay online.
- **Hardware Anti-Fingerprinting**: Emulates authentic hardware profiles (Dell XPS, ThinkPad, MacBook Pro) per account to avoid false-positive multi-account spam flags.
- **100% Portable**: No registry changes, no hidden AppData folders. All sessions live in a local `./data` directory next to the binary.
- **In-Chat Group Analytics**: View member activity leaderboards and 24-hour message heatmaps directly in group headers.
- **Media Acceleration**: 4-worker MTProto parallel chunk downloading for fast media transfers.
- **Ghost Mode**: Read messages and view stories without read receipts.

**Security & Architecture:**
- 100% Free & Open Source under GPLv3: https://github.com/guidegram/guidegram
- Built with React 19, TypeScript, Electron, and GramJS (pure client-side MTProto 2.0).
- All credentials and sessions are stored strictly on your local disk. Zero third-party servers or telemetry.
- You can inspect the source code or build it directly from source with `pnpm run build`.

*Disclaimer: Guidegram is an independent open-source project and is not affiliated with or endorsed by Telegram FZ-LLC.*

We'd love to hear your feedback, feature requests, or bug reports on GitHub!
```

---

#### 2. `r/privacy` (~1.5M+ Members)
- **Target Flair**: `FOSS Discussion`
- **Rule Compliance**: Strictly complies with Rule 5 (non-commercial FOSS, educational architectural focus, zero marketing hype).
- **Title**: `Mitigating desktop device fingerprinting and cross-account correlation on Telegram: An open-source implementation`

##### Post Copy

```markdown
When running multiple accounts on official Telegram Desktop, the client transmits static hardware identifiers (system build, device model, platform architecture) across all concurrent sessions over a single network interface and global proxy. For users requiring strict identity separation (journalists, researchers, community managers), this presents an immediate cross-account correlation vector.

We developed **Guidegram** as a localized, privacy-first desktop client to address this threat model:

1. **Per-Session Network Partitioning**: Each Telegram session maintains its own dedicated socket connection, allowing separate SOCKS5 or MTProto proxy tunnels per account. An IP drop or trace on one identity cannot be correlated to another.
2. **Combinatorial Hardware Masking**: Replaces static hardware reporting with cryptographically consistent profiles (e.g., Dell XPS 15, ThinkPad X1 Carbon, MacBook Pro) and randomized OS envelopes (Windows UBR builds, language sets).
3. **Zero Registry & Zero Telemetry Architecture**: Standard desktop installers scatter cached media, logs, and registry keys across `%APPDATA%`. Guidegram is strictly self-contained within `./data/`—leaving zero forensic traces in the OS registry upon extraction or deletion.
4. **Cryptographic Direct Connection**: Connects directly from your machine to official Telegram Data Centers using GramJS (MTProto 2.0). No intermediary proxy relays or developer servers are involved.

Source code (GPL-3.0): https://github.com/guidegram/guidegram
Technical audit and code inspection are welcomed.
```

---

#### 3. `r/opensource` (~300k+ Members)
- **Target Flair**: `Project`
- **Title**: `Guidegram: A modern, portable Telegram desktop client built with React 19, TypeScript, Electron & GramJS (GPLv3)`

##### Post Copy

```markdown
Hello r/opensource!

We've released **Guidegram**, an open-source portable desktop client for Telegram designed to provide a modern, highly hackable alternative to the official C++/Qt client.

**Tech Stack:**
- **Desktop Core**: Electron 34 (sandboxed, localized `./data` portable storage)
- **UI Layer**: React 19 + TypeScript + Vite + Tailwind CSS
- **Telegram Protocol**: GramJS (pure MTProto 2.0 implementation in TypeScript)
- **Packaging**: electron-builder (standalone portable Windows x64 binary)

**Key Features:**
- Unlimited multi-account dock with dedicated per-account proxy routing
- Parallel MTProto chunked media downloader (4 concurrent workers)
- Real-time in-chat group analytics (member leaderboards & 24h activity heatmaps)
- Ghost Mode & stealth story viewer

**Call for Contributors:**
We are looking for open-source contributors to help us expand:
- 🐧 Linux packaging (Flatpak, AppImage, AUR)
- 🍏 macOS builds (Intel & Apple Silicon notarization)
- 🌍 Internationalization (i18n translations)

Repository: https://github.com/guidegram/guidegram  
License: GNU General Public License v3.0  
PRs and feedback are warmly welcomed!
```

---

#### 4. `r/selfhosted` (~400k+ Members)
- **Target Flair**: `Discussion` / `App`
- **Angle**: Portable data sovereignty, flash-drive mobility, zero registry trace.
- **Title**: `Guidegram: Portable, self-contained Telegram desktop client with zero registry touches and isolated per-account proxy tunnels`

##### Post Copy Summary
Focus on the complete data isolation of `./data/`, making it portable across air-gapped workstations or encrypted Veracrypt drives without leaving traces on the host operating system.

---

### 4.2 Hacker News (`Show HN`) Blueprint

Hacker News has a sophisticated, technically demanding audience. The submission must link directly to the GitHub repository, maintain strict title formatting (`Show HN: ...`), and provide a comprehensive, humble first comment from the maintainer.

- **Submission Title**: `Show HN: Guidegram – Portable multi-account Telegram client with proxy isolation`
- **Submission URL**: `https://github.com/guidegram/guidegram`
- **Optimal Submission Window**: **Tuesday or Wednesday between 13:00 and 15:00 UTC** (06:00–08:00 PDT), maximizing simultaneous engagement from both European afternoon and US East Coast morning readers.

#### Mandatory Founder's First Comment

```markdown
Hi HN,

I built Guidegram (https://github.com/guidegram/guidegram), an open-source portable desktop client for Telegram that eliminates the 3-account ceiling and isolates network traffic with per-account proxies and hardware anti-fingerprinting.

### Why build this?
The official Telegram Desktop (TDesktop) is an impressive C++/Qt application, but its architecture introduces rigid constraints for power users and community operators:
1. **Account Ceiling**: It caps concurrent logins to 3 accounts (or 6 with Telegram Premium).
2. **Global Network Singleton**: All accounts share a single proxy configuration. If you manage distinct communities or test bot environments, routing all accounts through the same IP creates an immediate correlation vector and leads to chain-reaction rate limits.
3. **No Native Group Analytics**: Administrators cannot see activity heatmaps or contributor rankings without inviting third-party bots.
4. **Development Barrier**: Building TDesktop from source requires compiling a massive C++/Qt/CMake dependency tree with hundreds of megabytes of third-party libraries.

### Architecture & Implementation
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS with Lucide icons.
- **Telegram Protocol**: GramJS, a complete MTProto 2.0 implementation in pure TypeScript. Each account runs as an isolated client instance with dedicated socket parameters.
- **Desktop Shell**: Electron configured with localized portable user paths (`userData` redirected to `./data`). No files are written to `%APPDATA%` or the Windows registry.
- **Media Engine**: A custom 4-worker MTProto parallel download pipeline that splits files >2MB into 512KB chunks, delivering ~3x faster transfers.

### Security & Privacy
- Pure client-side MTProto 2.0 directly to official Telegram DCs (DC1–DC5).
- All session keys and configuration files remain strictly on your local disk in `./data/sessions/`.
- Zero external telemetry, tracking, or developer servers.
- Licensed under GPL-3.0.

Pre-built portable binaries for Windows and full source code are on GitHub: https://github.com/guidegram/guidegram/releases

I'm happy to answer any questions about the MTProto implementation, parallel chunk downloads, or architectural trade-offs!
```

---

#### Hacker News Skepticism Defense Scripts

Hacker News discussions frequently challenge Electron apps, multi-account legitimacy, and protocol libraries. Use these factual technical rebuttals:

##### Skepticism 1: "Why Electron instead of C++/Qt or Rust?"
> **Rebuttal**: "A valid concern regarding memory overhead. TDesktop's C++ codebase is over 500,000 lines and takes significant time to configure and build, making community UI contributions and rapid feature delivery challenging. We chose React 19 + TypeScript + Electron to create an accessible, modular codebase where developers can easily inspect and build new components.
>
> In terms of resource usage: Guidegram consumes approximately 180MB RAM for 3 idle accounts. To further optimize performance, we included a dedicated 'Disable premium animations' toggle that disables GPU backdrop-filters and cuts idle CPU usage to ~0%. For our target users managing 10+ accounts on modern workstations, the memory trade-off is well worth the socket isolation and UI flexibility."

##### Skepticism 2: "Isn't multi-account support just for spammers?"
> **Rebuttal**: "Legitimate multi-account use cases are widespread and underserved:
> 1. **Community Managers**: Operators who manage multiple community groups (tech projects, DAOs, local clubs) and need distinct operational identities.
> 2. **Developers & QA**: Engineers testing bots, mini-apps, and webhook integrations across staging and production user roles.
> 3. **Privacy & Identity Separation**: Users separating sensitive investigative work or personal communications from professional channels.
>
> The per-account proxy feature ensures these legitimate identities do not cross-contaminate networks or trigger false-positive anti-abuse heuristics."

##### Skepticism 3: "How secure is GramJS compared to official TDLib?"
> **Rebuttal**: "GramJS implements official MTProto 2.0 cryptographic primitives (AES-IGE-256, Diffie-Hellman key exchange, SHA-256 integrity verification) directly in TypeScript. It establishes direct TCP connections to Telegram Data Centers without intermediate hops. TDLib is exceptionally performant, but compiling its C++ binaries across multiple operating systems adds significant build friction. GramJS allows us to maintain a clean, portable TypeScript codebase that is fully auditable in plain text."

---

### 4.3 Twitter / X Tech Community Blueprint

A concise, highly visual 4-tweet thread optimized for developer and tech community engagement:

#### Tweet 1 (The Hook)
```text
Telegram Desktop caps you at 3 accounts and forces all identities through a single global proxy.

So we built Guidegram: an open-source portable desktop client with:
⚡ Unlimited accounts dock (Ctrl+1..9)
🔒 Dedicated proxy per account
🛡️ Hardware anti-fingerprinting
📊 In-chat group analytics

Built with React 19, TypeScript & Electron. 🧵👇
```
*(Media Attachment: 25-second HD screen recording demonstrating rapid account switching, proxy ping indicator, and opening the group stats heatmap).*

#### Tweet 2 (The Architecture)
```text
Under the hood:
• Pure MTProto 2.0 via GramJS (direct DC connection)
• 4 parallel download workers for 3x media throughput
• 100% portable: zero Windows registry touches, all config in ./data
• Emulates 28+ workstation profiles to prevent device correlation

No third-party relays. No telemetry. 100% GPL-3.0.
```

#### Tweet 3 (Exclusive Feature Spotlight)
```text
Exclusive feature: Deep Group Statistics 📊

Click the chart icon in any group header to get instant:
• Active members leaderboard
• 24-hour hourly activity heatmap
• Media vs text composition breakdown

No bot tokens or admin privileges required. All computed client-side from chat history.
```

#### Tweet 4 (Open Source Call to Action)
```text
Guidegram is completely free and open source.

⭐ Star the repo & download the portable Windows release:
https://github.com/guidegram/guidegram

Looking for contributors to help with Linux (Flatpak/AppImage) and macOS packaging!

#OpenSource #TypeScript #React19 #ElectronJS #Telegram #BuildInPublic
```

---

## 5. Telegram Native Community Engagement

Distributing within Telegram developer and power-user groups requires the highest standard of operational discipline. Telegram communities are heavily moderated by automated bot filters (Rose Bot, Combot) and vigilant admins.

### 5.1 Rules of Engagement for Developer Hubs

Target developer groups: `@gramjschat`, `@tgdesktop`, `@twa_dev`, and MTProto discussion chats.

#### 1. Strict Operational Safeguards
- **Zero Cold Direct Messages (DMs)**: Never initiate private messages with group members. Telegram’s automated heuristics flag unsolicited DMs with `PEER_FLOOD`, resulting in immediate account restriction by `@SpamBot`.
- **Zero Unsolicited Link Dropping**: Never paste GitHub links into general chats without prior conversational context. Unsolicited links trigger instant auto-ban by moderation bots.
- **Mandatory Affiliation Disclosure**: Always state your contributor relationship transparently.

#### 2. The "Problem-First" Technical Assistance Technique
Monitor developer groups for specific technical questions where Guidegram’s architecture serves as a genuine, helpful case study:

- *Trigger Scenario 1*: A user asks how to run 10 accounts on PC without keeping 10 separate portable Telegram folders open.
- *Trigger Scenario 2*: A developer asks how to route individual GramJS client instances through separate SOCKS5 proxies in Node.js.
- *Trigger Scenario 3*: A user complains that Telegram Desktop media downloads stall on large files.

##### Response Template (Helpful Technical Assistance)

```text
The official TDesktop client uses a global network singleton, so routing different accounts through distinct proxies natively requires running multiple portable directories.

If you are looking for an architectural reference on how to handle multi-client proxy isolation in TypeScript, take a look at Guidegram (open-source Electron + GramJS):
Each account manages an independent `TelegramClient` instance coupled with its own dedicated SOCKS5/MTProto proxy tunnel. You can review the connection isolation logic in `electron/telegram/accountManager.ts` on GitHub: github.com/guidegram/guidegram.

(Disclosure: I am a contributor to the project.)
```

---

### 5.2 Official Community Infrastructure Setup

To build an authentic, lasting user base without relying on external channels:

1. **Official Announcement Channel (`t.me/guidegram_app`)**:
   - Purpose: Release changelogs, new version announcements, precompiled binary download mirrors, and security advisories.
   - Posting cadence: Only on releases or major milestones (1–2 posts per month to minimize mute rates).
2. **Community Discussion Group (`t.me/guidegram_chat`)**:
   - Linked directly to `@guidegram_app` as the discussion group.
   - Purpose: User support, bug triage, proxy configuration assistance, and feature ideation.
   - Moderation: Configure a standard anti-spam bot (e.g., Shieldy or Rose) to auto-delete join/leave messages and require CAPTCHA verification for new members.

---

## 6. Operational Security (OpSec) & Anti-Spam Guardrails

### 6.1 Multi-Platform Risk Matrix & Algorithmic Guardrails

```
┌────────────────────────┬──────────────────────────────────────────┬───────────────────────────────────────────────────────┐
│ Platform               │ Risk / Algorithmic Trigger               │ Operational Guardrail & Mitigation Protocol           │
├────────────────────────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ **GitHub**             │ Automated/mass PRs to Awesome lists;     │ Max 1–2 PR submissions per 24 hours; customize every  │
│                        │ repetitive comments across issues.       │ PR body; only engage on closed/wontfix issues (>14d); │
│                        │ *Risk: Repository flag or shadowban.*    │ explicit maintainer disclosure; zero user pings.      │
├────────────────────────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ **Reddit**             │ Cross-posting identical text to >1 sub;  │ Enforce 72-hour delay between subreddits; use aged    │
│                        │ young account (<30d, <100 karma) posting.│ account (>60d, >200 comment karma); maintain 9:1 karma│
│                        │ *Risk: Silent AutoMod deletion/shadowban*│ ratio; customize angle per community culture.         │
├────────────────────────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ **Hacker News**        │ Coordinated upvoting / upvote rings;     │ Zero voting rings; post organically; title strictly   │
│                        │ marketing hype in submission title.      │ formatted ("Show HN: Guidegram – ..."); maintainer    │
│                        │ *Risk: Algorithmic [dead] / penalty flag*│ provides immediate, technically deep first comment.   │
├────────────────────────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ **AlternativeTo**      │ Exceeding 150-character short limit;     │ Strict 142-char short description; strictly objective │
│                        │ missing open-source license info.        │ feature matrix; verified running app screenshots.     │
│                        │ *Risk: Moderation rejection / delays.*   │                                                       │
├────────────────────────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ **Telegram**           │ Cold direct messages to group members;   │ Zero cold DMs; only respond to explicit technical     │
│                        │ posting unprompted links in developer hub│ inquiries; direct links to official channel hub only. │
│                        │ *Risk: PEER_FLOOD ban by @SpamBot.*      │                                                       │
└────────────────────────┴──────────────────────────────────────────┴───────────────────────────────────────────────────────┘
```

---

### 6.2 4-Week Chronological Execution Timeline

```
┌──────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Phase    │ Action Items & Operational Deliverables                                                                          │
├──────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ **Week 1**│ **Pre-Launch Directory Submissions & Foundation Setup**                                                          │
│          │ • Submit AlternativeTo listing using the verified 142-character description and GPLv3 metadata.                 │
│          │ • Create official Telegram broadcast channel (`@guidegram_app`) and support group (`@guidegram_chat`).           │
│          │ • Prepare Product Hunt visual gallery (5 HD screenshots + 20s teaser demo GIF).                                  │
│          │ • Ensure GitHub Releases page has precompiled Windows portable ZIP with checksums (`SHA256SUMS.txt`).           │
├──────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ **Week 2**│ **Curated Lists & Ethical GitHub Engagement**                                                                    │
│          │ • Submit PR to `ebertti/awesome-telegram` (Day 1).                                                                │
│          │ • Submit PR to `serhii-londar/awesome-telegram` (Day 3).                                                         │
│          │ • Submit PR to `agarrharr/awesome-desktop-apps` (Day 5).                                                          │
│          │ • Monitor closed/wontfix issues on TDesktop and provide ethical, technical disclosure comments (max 1–2/week).  │
├──────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ **Week 3**│ **Public Launch & Staggered Forum Rollout**                                                                      │
│          │ • Tuesday 08:01 UTC: Product Hunt Launch + Maker's Comment.                                                      │
│          │ • Tuesday 09:00 UTC: Twitter/X 4-part thread broadcast.                                                          │
│          │ • Wednesday 13:30 UTC: Hacker News "Show HN: Guidegram" submission + Founder's deep comment.                     │
│          │ • Thursday: Submit to `r/opensource` with focus on React 19/GramJS architecture and Linux/macOS packagers.       │
│          │ • Sunday (72h later): Submit to `r/Telegram` highlighting multi-account and proxy isolation features.             │
├──────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ **Week 4**│ **Privacy Deep-Dive & Community Expansion**                                                                      │
│          │ • Post to `r/privacy` focusing on hardware spoofing and local `./data/` zero-registry forensics.                 │
│          │ • Review community PRs, issues, and packaging requests on GitHub.                                               │
│          │ • Publish first community roadmap update on `@guidegram_app`.                                                    │
│          │ • Initiate Linux Flatpak and Arch Linux AUR package definitions with community contributors.                     │
└──────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Verification & Operational Compliance Checklist

Before executing any phase of this distribution playbook, verify all items against this checklist:

- [x] **AlternativeTo Character Count**: Short description is **142 characters**, strictly under the 150-character ceiling.
- [x] **Awesome Manifesto Compliance**: All three curated list entries are sorted alphabetically, formatted with correct dashes/bullets, end with a period, and contain no subjective superlatives.
- [x] **License Alignment**: All templates accurately declare GNU General Public License v3.0 (GPL-3.0).
- [x] **Technical Stack Accuracy**: All materials accurately specify Electron, React 19, TypeScript, Vite, and GramJS (MTProto 2.0).
- [x] **Ethical Issue Participation**: Strict safeguards requiring closed/wontfix issues (>14 days), maintainer disclosure, and zero unsolicited pings.
- [x] **Skepticism Defenses**: Complete technical rebuttals provided for Electron RAM usage, multi-account legitimacy, and GramJS security.
- [x] **OpSec Cadence**: Staggered schedule enforcing 72-hour subreddit cooldowns and 9:1 karma contribution ratios.
