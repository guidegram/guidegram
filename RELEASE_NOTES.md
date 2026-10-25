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
