# Twitter / X Launch Thread & Demo Video Playbook

**Target Date**: Thursday, Day 17 @ 09:00 AM EST  
**Target Platform**: X / Twitter (`twitter.com`)  
**Media Type**: 4-Part High-Engagement Video & Feature Thread  

---

## Tweet 1: The Hook & Announcement (Primary Post with Video Clip A)

```text
Managing multiple Telegram accounts on desktop is painful:
- Hardcoded 3-account limit
- Shared global proxy (one ban kills all accounts)
- High compilation barrier on C++ forks

We built Guidegram: an open-source, truly portable Telegram client for power users.

Thread 🧵👇
```
- **Attached Media**: `clip_a_dock_and_switching.mp4` (15-second clip showing 8 accounts on vertical dock switching with `Ctrl+1..8` instantaneously).
- **Link**: `https://github.com/guidegram/guidegram`

---

## Tweet 2: Dedicated Per-Account Proxy Isolation (with Video Clip B)

```text
2/ The biggest danger for multi-account operators: IP cross-contamination.

Official Telegram Desktop forces all accounts through one global proxy.

Guidegram isolates network tunnels per session:
✅ SOCKS5, HTTP, MTProxy per account
✅ Live latency ping monitor
✅ Zero chain bans
```
- **Attached Media**: `clip_b_proxy_manager.mp4` (12-second clip showing Proxy Manager, adding a SOCKS5 proxy, running live ping, and assigning to Account 2).

---

## Tweet 3: Zero Registry Footprint & Hardware Spoofing (with Infographic)

```text
3/ Built with privacy and operational security first:

🔒 Zero Windows Registry pollution (0 keys in HKCU/HKLM)
💼 100% portable: all sessions & config stay in ./data/
💻 Emulates 28+ hardware profiles (Dell XPS, ThinkPad, MacBook) with genuine OS build numbers

Run it directly from a USB stick.
```
- **Attached Media**: `infographic_architecture_isolation.png` (Visual diagram comparing TDesktop single-proxy vs Guidegram decoupled per-session architecture).

---

## Tweet 4: Deep In-Chat Group Analytics (with Video Clip C)

```text
4/ Need community intelligence without adding spammy bot tokens?

Guidegram embeds real-time group conversation analytics:
📊 24-hour hourly activity heatmap
🏆 Active member leaderboard & traffic shares
📈 Media distribution breakdown (text/photo/voice)
```
- **Attached Media**: `clip_c_group_analytics.mp4` (10-second clip opening group header `BarChart3` icon and viewing heatmap).

---

## Tweet 5: Call to Action & Open Source Link

```text
5/ Guidegram is 100% free and open-source under GPLv3.

Built with React 19, TypeScript 5.7, Electron, and @mtcute.

⭐ Star the repo on GitHub: https://github.com/guidegram/guidegram
📥 Download the portable Windows release: https://github.com/guidegram/guidegram/releases/latest

Feedback & contributions welcome! 🚀
```
