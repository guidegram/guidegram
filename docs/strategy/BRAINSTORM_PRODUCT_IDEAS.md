# 💡 Guidegram Product Discovery & Continuous Ideation Framework
## Multi-Perspective Product Trio Brainstorming (PM, Designer, Engineer)

**Document Version:** 1.0.0  
**Methodology:** Continuous Discovery Habits (Teresa Torres) & Opportunity Solution Tree (OST)  
**Target Platform:** Guidegram Desktop (v1.11.5+)  
**Date:** September 2026  

---

## 🎯 1. Opportunity Context & Strategic Framing

### Product Overview
**Guidegram** is a next-generation, 100% portable desktop Telegram client built on Electron 34, React 19, TypeScript 5.7, and modern MTProto engines. It completely shatters the official 3-account restriction, provides dedicated per-account proxy isolation, local Anti-Delete & Edit History tracking, deep group intelligence, native Telegram Mini Apps hosting, and multi-worker download acceleration.

### Strategic Objective
Capitalize on Guidegram's unique web-runtime agility and multi-account infrastructure to build breakthrough capabilities that monolithic C++ clients (TDesktop, 64gram, AyuGram) cannot architecturally support, turning Guidegram into the definitive productivity operating system for Telegram power users.

### Target Segments
1. **Community Managers & Channel Administrators**: Managing multiple channels, moderating supergroups, tracking engagement, and scheduling content.
2. **Crypto / Web3 Operators & Traders**: Navigating high-frequency alpha groups, executing Mini Apps/TWA games, managing separate burner identities, and monitoring project announcements.
3. **Marketing Agencies & Growth Specialists**: Operating 10–50+ client accounts simultaneously across isolated IP proxies with zero cross-contamination.
4. **Privacy Advocates & Power Users**: Requiring local audit logging (Anti-Delete), stealth presence (Ghost Mode), and complete zero-registry portability.

### Desired Outcomes
- **Outcome 1 (Retention & Stickiness)**: Reduce daily operational context switching by >70% for multi-account operators.
- **Outcome 2 (Unfair Advantage)**: Deliver exclusive features physically impossible in official TDesktop due to its monolithic C++ architecture.
- **Outcome 3 (Reliability & Safety)**: Maintain zero MTProto sequence/anti-fraud violations across all active accounts.

---

## 🧭 2. Ideation from Three Perspectives (15 Concepts)

```
                     ┌──────────────────────────────────────────────┐
                     │          GUIDEGRAM PRODUCT TRIO              │
                     └──────────────────────┬───────────────────────┘
          ┌─────────────────────────────────┼─────────────────────────────────┐
          ▼                                 ▼                                 ▼
┌──────────────────┐              ┌──────────────────┐              ┌──────────────────┐
│ PRODUCT MANAGER  │              │ PRODUCT DESIGNER │              │ SOFTWARE ENGR    │
│ Business Value & │              │ UX, Ergonomics & │              │ Tech Leverage &  │
│ Strategic Impact │              │ Delightful Flow  │              │ Scalable Systems │
└──────────────────┘              └──────────────────┘              └──────────────────┘
```

---

### 👔 Perspective A: Product Manager (Business Value & Strategic Alignment)

#### Idea 1: Unified Multi-Account Omnibox (`Ctrl + K` Cross-Search)
- **Concept**: A single global search dialog (`Ctrl + K`) that queries chats, messages, and contacts across **all active accounts simultaneously** with 1-click jump to the matching account and conversation.
- **Strategic Value**: Eliminates the #1 pain point of multi-account operators: having to manually click through 10+ accounts to find a specific client, message, or link.
- **Target Persona**: Agencies, Community Managers.

#### Idea 2: Scheduled Multi-Channel Broadcast & Post Multiplexer
- **Concept**: A unified post composer that enables drafting a message once and scheduling/publishing it simultaneously across multiple channels and groups owned across different logged-in accounts, complete with anti-flood delay intervals.
- **Strategic Value**: Replaces expensive third-party Telegram marketing bots and web SaaS tools with a free, native, and local client capability.
- **Target Persona**: Marketers, Crypto Founders, Influencers.

#### Idea 3: Real-Time Keyword Watchdog & Buyer Lead Radar
- **Concept**: Background scanner monitoring joined public groups and channels across all logged-in accounts for user-defined keywords (e.g., "looking for dev", "recommend CRM", "buy TON") and triggering instant desktop alerts.
- **Strategic Value**: Massive monetization and business development utility; turns Telegram from a passive chat app into an inbound lead generation engine.
- **Target Persona**: Freelancers, Agencies, Sales Professionals.

#### Idea 4: Client-Side Encrypted Multi-Account Cloud Vault
- **Concept**: Optional AES-256-GCM encrypted backup/sync of all session credentials and proxy mappings to Google Drive, WebDAV, or self-hosted S3 with a single master password.
- **Strategic Value**: Solves the fear of data loss for 50+ account rosters while preserving Guidegram's zero-knowledge, zero-telemetry ethos.
- **Target Persona**: Enterprise Workstations, High-Security Operators.

#### Idea 5: Autonomous Smart Auto-Responder & Trigger Rules Engine
- **Concept**: Client-side automation rules (e.g., "If message received from unknown user between 10 PM - 8 AM, reply with Template X; if message contains word 'pricing', forward to Account B").
- **Strategic Value**: Delivers Telegram Business functionality to all accounts (including personal and bot accounts) without requiring Telegram Premium.
- **Target Persona**: Small Business Owners, Customer Support Leads.

---

### 🎨 Perspective B: Product Designer (UX, Ergonomics & User Delight)

#### Idea 6: Dual-Chat Canvas / Split-Screen Multi-Viewport
- **Concept**: A flexible side-by-side or tiled viewport allowing users to view and interact with two conversations simultaneously (e.g., direct chat on left, Saved Messages / Group Stats / reference channel on right).
- **UX Impact**: Eliminates constant back-and-forth clicking when copying information, verifying data, or live-translating between chats.
- **Design Metaphor**: Resizable split pane with subtle drag divider and quick swap handles.

#### Idea 7: Anti-Delete & Edit History Visual Diff Inspector
- **Concept**: An enhanced visual diff modal for preserved deleted and edited messages, displaying green highlights for added text, red strikethrough for deleted text, and an interactive scrubber showing the revision timeline.
- **UX Impact**: Elevates the existing Anti-Delete and Edit History feature from raw text lists to an intuitive forensic timeline.
- **Design Metaphor**: GitHub PR-style unified diff with chronological cards and exact modification timestamps.

#### Idea 8: Dynamic Account Color-Coding & Visual Workspace Badging
- **Concept**: Assign customizable chromatic themes and tag labels to accounts (e.g., Emerald for "Personal", Sapphire for "Agency", Purple for "Crypto Trading", Amber for "Support").
- **UX Impact**: Custom tinting on titlebars, active docks, and message bubbles provides immediate spatial orientation, permanently preventing catastrophic accidental messages sent from the wrong account.
- **Design Metaphor**: Subdued ambient rim lighting matching the active identity.

#### Idea 9: Picture-in-Picture (PiP) Floating Mini App & Video Dock
- **Concept**: A persistent mini floating canvas docked to the bottom corner that continues running a Telegram Mini App (e.g., Web3 tap-to-earn game, DEX swap interface) or playing a video stream while you browse other chats.
- **UX Impact**: Enables seamless multitasking without restarting WebApp sessions or breaking video immersion.
- **Design Metaphor**: Draggable, resizable glassmorphic card with minimize-to-pill control.

#### Idea 10: Message Hover Radial Speed Menu & Quick Gestures
- **Concept**: A subtle radial action wheel or floating hover dock appearing near the cursor on long-hover or right-click: 1-click Quick Forward to Saved, Check Edit History, Direct Forward (No Quote), Translate, and Copy ID.
- **UX Impact**: Reduces physical mouse movement by 80% compared to navigating nested context menus.
- **Design Metaphor**: Circular micro-menu with high-contrast SVG icons and tactile tooltips.

---

### 💻 Perspective C: Software Engineer (Technical Possibilities & Systems Architecture)

#### Idea 11: Embedded SQLite Full-Text Search (FTS5) Engine
- **Concept**: An embedded local SQLite database utilizing FTS5 virtual tables with BM25 ranking to index all incoming, cached, and audit-logged messages locally on disk.
- **Technical Advantage**: Sub-5ms search across millions of messages completely offline; eliminates reliance on Telegram server search queries that fail for partial words or unindexed channels.
- **Feasibility**: High (`better-sqlite3` in Electron main process).

#### Idea 12: Distributed MTProto Token-Bucket Rate-Limit & FloodWait Coordinator
- **Concept**: Centralized request scheduler coordinating all active MTProto client instances, calculating rolling burst budgets, and enforcing jittered backoff before server boundaries are hit.
- **Technical Advantage**: Completely eliminates `FLOOD_WAIT` cascade bans when operating 20+ accounts on shared network subnets.
- **Feasibility**: High (pure TypeScript queue in `accountManager.ts`).

#### Idea 13: Zero-Copy IPC & Web Worker Pipeline for Heavy Media
- **Concept**: Offload image decompression, `.tgs` Lottie parsing, and 5-bit waveform unpacking to Background Worker threads using `SharedArrayBuffer` and `OffscreenCanvas`.
- **Technical Advantage**: Guarantees the Electron main renderer maintains a locked 60fps frame rate even during massive media bursts across 50 concurrent accounts.
- **Feasibility**: Medium (modern web standard workers).

#### Idea 14: Headless Local HTTP REST / Webhook Automation Bridge
- **Concept**: An optional local loopback HTTP server (`http://127.0.0.1:8765`) protected by a local bearer token, allowing user scripts (Python/Node/Bash) to send messages, read unread chats, or pull group analytics.
- **Technical Advantage**: Turns Guidegram into a scriptable desktop automation engine without complex TDLib compilation or bot gateway setups.
- **Feasibility**: High (`node:http` in Electron main process).

#### Idea 15: Autonomous Multi-Path Proxy Failover & Health Mesh
- **Concept**: Background daemon running periodic health and latency probes across assigned proxies; automatically falls back to secondary pre-configured tunnels if an IP drops or experiences >1000ms latency without dropping the MTProto TCP session.
- **Technical Advantage**: Unbreakable 24/7 uptime for mission-critical community and marketing accounts.
- **Feasibility**: Medium (enhancement to existing `proxyManager.ts`).

---

## 📊 3. Prioritization Matrix (Top 5 Selection)

Each concept is scored from 1 to 5 across four key dimensions:
- **Strategic Alignment (SA)**: Direct fit with multi-account power user moat.
- **Customer Impact (CI)**: Measurable improvement in user productivity and delight.
- **Feasibility & Effort (FE)**: Technical practicality within the existing architecture (5 = easiest).
- **Differentiation (DF)**: Distance from official TDesktop and C++ forks (5 = unique).

| Rank | Concept | Perspective | SA (1-5) | CI (1-5) | FE (1-5) | DF (1-5) | Total Score (out of 20) |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| 🥇 | **1. Unified Multi-Account Omnibox (`Ctrl+K`)** | PM | 5 | 5 | 4 | 5 | **19/20** |
| 🥈 | **2. Dual-Chat Canvas (Split-Screen Viewport)** | Designer | 5 | 5 | 4 | 5 | **19/20** |
| 🥉 | **3. Visual Diff Inspector for Anti-Delete & Edits** | Designer | 4 | 5 | 5 | 4 | **18/20** |
| 4th | **4. Real-Time Keyword Watchdog & Lead Radar** | PM | 5 | 5 | 3 | 5 | **18/20** |
| 5th | **5. Embedded SQLite FTS5 Local Search Engine** | Engineer | 5 | 4 | 4 | 5 | **18/20** |
| 6th | Dynamic Account Color-Coding & Workspaces | Designer | 4 | 4 | 5 | 4 | **17/20** |
| 7th | Autonomous Multi-Path Proxy Failover Mesh | Engineer | 5 | 4 | 4 | 4 | **17/20** |
| 8th | Distributed MTProto Rate-Limit Coordinator | Engineer | 5 | 4 | 4 | 4 | **17/20** |
| 9th | PiP Floating Mini App & Video Dock | Designer | 4 | 4 | 3 | 4 | **15/20** |
| 10th| Multi-Channel Broadcast Multiplexer | PM | 4 | 4 | 3 | 4 | **15/20** |

---

## 🏆 4. Deep-Dive Specification for the Top 5 Prioritized Ideas

### 🥇 1. Unified Multi-Account Omnibox (`Ctrl + K`)
- **One-Sentence Description**: A unified keyboard-driven spotlight search querying chats, contacts, and unread messages across all logged-in accounts simultaneously with zero-latency switching.
- **Why Selected (Rationale)**: Solves the single most severe workflow bottleneck of multi-account operation. In official TDesktop, finding which account received a message requires manual tab clicking. The Omnibox turns 10 clicks into 1 shortcut (`Ctrl + K`).
- **Key Assumptions to Validate**:
  - *Assumption 1*: Users regularly remember contact names or keywords better than which specific account holds the conversation.
  - *Assumption 2*: Querying in-memory dialog caches across 50 accounts can execute in <15ms without UI hitching.

---

### 🥈 2. Dual-Chat Canvas (Split-Screen Viewport)
- **One-Sentence Description**: A resizable dual-pane chat layout allowing users to view, monitor, and interact with two conversations side-by-side simultaneously.
- **Why Selected (Rationale)**: Community managers and traders constantly cross-reference news channels against private chat discussions or drafts. TDesktop forces window alt-tabbing or single-view switching. A native split view is a game-changer for desktop productivity.
- **Key Assumptions to Validate**:
  - *Assumption 1*: Desktop displays (1080p, 1440p, 4K) have sufficient horizontal real estate to comfortably render two ~450px chat columns.
  - *Assumption 2*: Maintaining two independent message virtualizers does not exceed Electron memory budgets.

---

### 🥉 3. Visual Diff Inspector for Anti-Delete & Message Edit History
- **One-Sentence Description**: An intuitive forensic revision modal displaying color-coded side-by-side or unified diffs for edited and deleted messages.
- **Why Selected (Rationale)**: Guidegram already implements the backend audit engine (`SessionStore.audit_logs`) and basic revision lists. Upgrading this to a rich visual diff provides immense satisfaction and clear legal/evidentiary value for users tracking deleted or edited texts.
- **Key Assumptions to Validate**:
  - *Assumption 1*: Users value seeing exact character and word delta highlights rather than just plain before/after strings.
  - *Assumption 2*: Diff computation on short text snippets takes negligible client CPU (<1ms per message).

---

### 4️⃣ 4. Real-Time Keyword Watchdog & Buyer Lead Radar
- **One-Sentence Description**: A background keyword scanner across all joined public channels and groups that triggers instant notifications when high-intent words are detected.
- **Why Selected (Rationale)**: Gives business users, developers, and crypto investors an automated "radar" operating 24/7 without needing to pay for third-party scraping services or risk account bans through external userbots.
- **Key Assumptions to Validate**:
  - *Assumption 1*: Users have clear intent keywords (e.g., job postings, token launches, brand mentions) that they actively want to monitor.
  - *Assumption 2*: Filtering message update events client-side incurs minimal battery and CPU consumption.

---

### 5️⃣ 5. Embedded SQLite FTS5 Local Search & Offline Vault
- **One-Sentence Description**: An embedded SQLite database with FTS5 virtual tables providing sub-5ms full-text keyword and regex search across your entire multi-account message archive completely offline.
- **Why Selected (Rationale)**: Telegram's native search often misses messages due to server-side rate limits, lack of partial matching, or connection drops. An offline full-text search engine transforms Guidegram into an impenetrable personal knowledge base.
- **Key Assumptions to Validate**:
  - *Assumption 1*: Users maintain sufficient local disk space for SQLite database files (~50–200MB per account).
  - *Assumption 2*: SQLite FTS5 writes can be debounced during heavy live chats without locking the disk thread.

---

## 🚀 5. Immediate Next Steps & Execution Sequence

1. **Sprint 1**: Implement **Visual Diff Inspector for Anti-Delete & Message Edit History** (Fastest ROI, builds on existing Milestone 18 audit log architecture).
2. **Sprint 2**: Implement **Unified Multi-Account Omnibox (`Ctrl + K`)** (Massive user delight, highest total discovery score).
3. **Sprint 3**: Prototype **Dual-Chat Canvas (Split-Screen Viewport)** for widescreen desktop environments.
