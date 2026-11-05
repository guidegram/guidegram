# 🚀 Guidegram v2.6.0 — Full Telegram Desktop MTProto Layer 232 Protocol Parity

> **100.0% Protocol Parity:** All 859 MTProto RPC methods across 28 namespaces and 137 microphases implemented and verified against the official Telegram Desktop Layer 232 TL-Schema.

---

### 🌟 What's New in v2.6.0:

* **⚡ Complete Layer 232 MTProto Parity (859/859 RPCs):**
  - **Stories Domain (33/33 RPCs):** Complete story viewing, stealth mode, reactions list, archive retrieval, view incrementing, album reordering, and live broadcasts (`StoryViewerModal.tsx`).
  - **Premium & Boosts (5/5 RPCs):** Peer boost status inspect, boost application, slots allocation, and channel booster directory (`SettingsModal.tsx`).
  - **SMS Jobs Relay (7/7 RPCs):** Distributed SMS gateway eligibility check, job acceptance, finish job reporting, and status tracking (`SettingsModal.tsx`).
  - **Fragment Collectibles (1/1 RPC):** Username & phone number auction/collectible explorer with live TON blockchain links (`SettingsModal.tsx`).
  - **AI Smart Compose (7/7 RPCs):** AI composition tones, message completion drafts, and localized suggestions (`MessageComposer.tsx`).
  - **Communities Hub (9/9 RPCs):** Megagroup & channel federation creation, peer links binding, and participant moderation (`SettingsModal.tsx`).
  - **Ephemeral & Auto-Delete (8/8 RPCs):** Granular self-destruct timers, welcome message management, and ephemeral message lifecycle (`AutoDeleteModal.tsx`).
  - **Toncenter & TON Blockchain (2/2 RPCs):** Low-level TON Center API bridge and real-time streaming endpoint integration (`TonWalletModal.tsx`).
  - **Non-Custodial Wallet & TonConnect (26/26 RPCs):** Seed phrase export/import, DC-encrypted shard backup, gasless relay sponsor, on-chain transactions, NFT collectibles, and full native TonConnect session protocol (`TonWalletModal.tsx`).

* **🛡️ Architecture & Reliability Hardening:**
  - **Zero IPC Collisions:** 1,199 unique IPC channels with zero duplicate registration warnings.
  - **4-State UI Ergonomics:** Every modal supports glass loading (`Loader2`), honest empty states, actionable error retries, and live telemetry data inspectors.
  - **RTL & Dark Theme Polish:** Flawless Persian/Arabic BiDi typography, automatic per-keystroke text direction detection, and sleek dark aesthetic.
  - **Chromium Portable Singleton Lock:** Safe multi-profile and portable session management.

