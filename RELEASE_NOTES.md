# 🚀 Guidegram v2.4.2 — Multi-Pinned Messages & Real-Time Sync Edition

> **Private Chat Multi-Pinned Parity & Real-Time Event Architecture** featuring automatic pinned message resolution across all peer types (users, groups, channels), multi-cycle banner cycling, unified drawer modal with live search, mutual two-way pinning default, and live MTProto update synchronization.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="150" height="150" />
  <h3>Guidegram v2.4.2 Multi-Pinned Messages & Real-Time Sync</h3>
  <p><strong>Private Chat Pinned Messages • Multi-Cycle Top Banner • Real-Time MTProto Updates • Pinned Drawer & Unpin Actions • Sender Names & Media Preview</strong></p>
</div>

---

## 🌟 Release v2.4.2 Highlights

1. **Private Chat Pinned Messages Parity (MTProto Layer 229):**
   - **Automatic Multi-Pinned Resolution:** Resolved Telegram MTProto's private chat omission where `userFull` does not expose `pinned_msg_id`. Implemented automatic `messages.search` with `inputMessagesFilterPinned` within `getChatDetails`.
   - **Multi-Cycle Top Banner:** Displays pinned message count badge (`X of Y`), message text snippet or media label (`📷 Photo`, `🎙 Voice message`, `📹 Video`, `📎 Document`), and clickable jump-and-cycle navigation.
   - **Sender Attribution:** Extracts sender names for pinned messages in all chat types directly from returned MTProto entity collections (`res.users` & `res.chats`).

2. **Mutual Two-Way Pinning & Unpin Management:**
   - **Two-Way Pinning by Default:** Sets `bothSides: true` (instead of one-sided local pinning), aligning private chat message pinning with official Telegram Desktop behavior.
   - **Pinned Messages Drawer:** Added live search drawer modal (`All (N)`) with one-click unpin capability directly from the drawer list.
   - **Message Bubble Pin Badges:** Added subtle amber pin indicator to pinned messages in the chat history bubble footer.

3. **Real-Time Update Synchronization:**
   - **Live Updates (`updatePinnedMessages` & `updatePinnedChannelMessages`):** Wired MTProto updates to notify the UI in real time whenever messages are pinned or unpinned from other devices or participants.
   - **Service Message Hook:** Intercepts `actionType: message_pinned` to trigger instant chat details re-sync without requiring a page refresh.

---

# 🚀 Guidegram v2.4.1 — Full-Width Kinetic Header & Zero-Fake MTProto Edition

> **Ergonomic Desktop Parity & Zero-Mock Architecture** featuring full-window kinetic folder tabs header, bidirectional mouse-wheel horizontal rail navigation, 100% purged mock data, deterministic transaction IDs, live MTProto privacy settings, real channel boost telemetry, and wired UI actions.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="150" height="150" />
  <h3>Guidegram v2.4.1 Kinetic Header & Zero-Fake Parity</h3>
  <p><strong>Full-Width Header Rail • Mouse-Wheel Horizontal Scroll • Zero-Fake MTProto • Wired Interactive UI • Official Peer Colors</strong></p>
</div>

---

## 🌟 Release v2.4.1 Highlights

1. **Full-Width Kinetic Tabs & Mouse-Wheel Horizontal Navigation:**
   - **Full-Width Header Rail:** Moved folder tabs from being cramped inside the sidebar to spanning the entire workspace header, providing ample breathing room for all standard and custom cloud folders.
   - **Mouse-Wheel Horizontal Scroll:** Rotating the mouse wheel vertically over the tabs rail smoothly scrolls tabs horizontally, with direction-aware acceleration and seamless RTL/LTR alignment.
   - **Elimination of Vertical Scrollbars:** Added strict `overflow-y: hidden` and custom scrollbar suppression to completely eliminate vertical clipping and unwanted scroll tracks.

2. **Zero-Fake MTProto Hardening (Comprehensive 13-Point Audit):**
   - **Stars & Gifts Parity:** Replaced `Math.random()` fallbacks with deterministic transaction IDs across Stars transactions and catalog gifts.
   - **Real Channel Boost Telemetry:** Resolved invalid channel accessHash bugs (`CHANNEL_INVALID`) by integrating live `resolveInputPeer`. Removed synthetic boost counters.
   - **Live Account Privacy:** Replaced dummy privacy response with live MTProto queries (`contacts.getBlocked`, `account.getAuthorizations`, `account.getPassword`, and `account.getPrivacy`).
   - **Clean Subscriptions Empty State:** Purged fictitious subscription tier and mock monetization revenue figures.

3. **Wired Interactive UI & Profile Color Parity:**
   - **Avatar Change Dialog:** Clicking on the profile avatar now triggers the native file selection dialog for photo updates.
   - **Settings & Proxy Shortcuts:** Wired brand dock icon to Settings and connection indicator to Proxy settings.
   - **Official Telegram Peer Color Palette:** Integrated Telegram's 7 official name and folder tag colors.

---

# 🚀 Guidegram v2.4.0 — Universal MCP & Real-Time Radar Edition

> **Next-Generation Telegram Client & AI Agentic Workspace** featuring Universal 2-Tier MCP Server Architecture (859 MTProto Methods), Persian Natural Language & Fuzzy Entity Resolution, Online Activity Radar, Contact Changes Timeline, 3D Orbit Star Gifts Shelf, and Zero-Ghost Read Sync.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="150" height="150" />
  <h3>Guidegram v2.4.0 Universal MCP & Radar</h3>
  <p><strong>Universal 2-Tier MCP Engine • 859 MTProto Layer 229 Methods • Persian NLP & Fuzzy Search • Real-Time Online Radar • 3D Star Gifts Orbit • Bi-Directional Read Sync</strong></p>
</div>

---

## 🌟 Release v2.4.0 Highlights

1. **Universal Guidegram MCP Architecture (2-Tier Hybrid Engine):**
   - **Tier-1 (High-Level Intent Tools):** 21 ergonomic tools including `telegram_search_messages`, `telegram_search_contacts`, `telegram_search_dialogs`, `telegram_resolve_peer`, `telegram_send_media`, `telegram_forward_messages` (with `dropAuthor`), `telegram_send_reaction`, `telegram_manage_message`, and `telegram_create_poll`.
   - **Tier-2 (Dynamic MTProto Invoker):** Unlocks all 859 MTProto Layer 229 methods with dynamic discovery (`telegram_discover_methods`) and automatic parameter coercion (`telegram_invoke_raw_method`) converting strings/numbers to `InputPeer`, `InputChannel`, `InputUser`, and 64-bit `Long` binaries.
   - **Persian Text Normalizer & Fuzzy Matcher (`persianNormalizer.ts`):** Resilient normalization handling Arabic Yeh/Kaf, zero-width spaces, diacritics, honorific titles (e.g. "خانم دکتر غلامی"), and token-based scoring.
   - **Safe BigInt & Buffer Serializer (`safeJson.ts`):** Shields external AI agents (Claude, Cursor, Antigravity) from fatal `TypeError: Do not know how to serialize a BigInt` crashes when receiving raw MTProto responses.
   - **Destructive Command Guard:** Blocks critical account deletion and session revocation methods from accidental prompt execution.

2. **Online Activity Radar & Contact Changes Timeline:**
   - Dedicated Online Radar tracking real-time user transitions, exact last-seen timestamps, and active connection states.
   - Real-time Contact Audit timeline recording profile photo updates, name changes, and username transitions.
   - Comprehensive Guidegram Features settings suite in the settings hub.

3. **Telegram Star Gifts Shelf with 3D Orbit Ring:**
   - Interactive 3D orbital animation showcasing collectible and transferred Telegram Star Gifts.
   - Seamless gifting workflows with instant balance updates.

4. **Hardened Audio & Read Sync Architecture:**
   - Muted notification beep audio leak resolution.
   - Precision bi-directional MTProto read state sync eliminating phantom unread counters across desktop and mobile clients.

---

# 🚀 Guidegram v2.3.0 — Multiplatform Desktop & Android Edition

> **Next-Generation Telegram Client & AI Workspace** with Native Android Pipeline, Circle/Squircle/Droplet Dynamic Avatars, Instant Saved Messages Brand Trigger, Real-Time Read Sync, and Zero-Ghost Anti-Delete Architecture.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="150" height="150" />
  <h3>Guidegram v2.3.0 Multiplatform</h3>
  <p><strong>Official Android APK Pipeline • Dynamic Vector Avatars • Real-Time MTProto Read Sync • Zero Ghost Messages • 100% Cross-Platform Core</strong></p>
</div>

---

## 🌟 Release v2.3.0 Highlights

1. **Official Android APK CI/CD Pipeline:**
   - Integrated Capacitor cross-platform runtime with native Android project generation (`io.guidegram.app`).
   - GitHub Actions automated multiplatform pipeline building and attaching `Guidegram-Android.apk` alongside desktop installers.

2. **Adaptive Vector Avatar Morphology:**
   - Standard Users, Bots, & Private Chats: Smooth circular frame (`rounded-full`).
   - Topic-Enabled Supergroups (`isForum`): Ergonomic Squircle (`rounded-2xl`).
   - Telegram Channels (`isChannel`): Mathematical SVG Teardrop/Droplet curve with top-center peak contour.

3. **Instant Saved Messages Brand Trigger:**
   - Separated hamburger drawer trigger from the top-left Guidegram "G" brand logo.
   - Clicking the "G" logo opens the active account's Saved Messages cloud storage instantaneously.

4. **Bi-Directional MTProto Read Synchronization:**
   - Fixed unread badge counter for Saved Messages (forced 0).
   - Loose peer identifier matching (`isPeerMatch`) ensuring real-time read history synchronization when reading dialogs on official Telegram clients.

5. **Anti-Delete Ghost Bubble Elimination:**
   - Eliminated dummy placeholder fabrication for uncaptured messages.
   - Live viewport filters ensuring phantom `[Message deleted]` bubbles without original text are never displayed.
   - Full native invocation and type-safe proxying across all Telegram namespaces (859 methods).
   - GramJS and mtcute zero-diff serialization, differential vector parsers, and RPC error synthesizers.
   - Multi-DC intelligent roaming, turbo chunked media streamers, and background cloud draft sync.

3. **Cluster 3 (Phases 101–110): 60fps Spring Physics & Visual Ergonomics**
   - Hooke's law spring physics engine (`F = -k*x - c*v`) driving fluid message lists, drawers, and modal transitions.
   - Interactive touch drag-to-dismiss momentum gestures and 120Hz high-refresh display calibration.
   - Dynamic Telegram Story ring liquid gradient arcs and voice waveform FFT visualizers.
   - Floating reaction particle emitters and cosmic sparkle burst shaders.

4. **Cluster 4 (Phases 111–160): Google Jules Swarm Research & Advanced Shaders**
   - Google Jules REST API client, fleet worker swarms, and parallel directive broadcast dispatchers.
   - Live Git diff streaming with virtual patch engine and automated GitHub PR synthesizers.
   - Hardware-accelerated offscreen WebGL multi-pipeline manager, cinematic bloom glow, and constellation shaders.
   - WebRTC audio/video call pipeline hardener with dynamic Opus bitrate scaling and ICE sanitization.
   - Cryptographic multi-account instant switching (< 50ms) with zero cross-account cache pollution.
   - Dynamic battery saver calibrator with automatic framerate downclocking (120Hz/60Hz -> 30Hz/15Hz).

---

## 🛠️ Automated Multiplatform Releases

Built and signed automatically via GitHub Actions:
- **Windows**: Setup Installer (`.exe`) and Portable Self-Contained Archive (`.zip`)
- **Linux**: Universal AppImage (`.AppImage`) and Debian Package (`.deb`)
- **macOS**: Apple Silicon & Intel DMG (`.dmg`)
