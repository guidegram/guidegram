# Hacker News "Show HN" Launch Package & Defense Kit

**Target Date**: Tuesday, Day 15 @ 08:15 AM EST  
**Target Platform**: Hacker News (`news.ycombinator.com`)  
**Submission Category**: `Show HN`  

---

## 1. Submission Details

- **Title**: `Show HN: Guidegram – Portable multi-account Telegram client with proxy isolation`
- **URL**: `https://github.com/guidegram/guidegram`

---

## 2. Founder's First Comment (Post at 08:17 AM EST)

```markdown
Hi HN,

I’m one of the creators of Guidegram (https://github.com/guidegram/guidegram).

If you manage multiple Telegram accounts for open-source communities, crypto projects, or client operations, you’ve likely bumped into the official desktop client’s hardcoded 3-account ceiling. Furthermore, the official client (TDesktop) and all its C++/Qt downstream forks (like 64gram or Kotatogram) use a global proxy singleton—meaning if you configure a SOCKS5 proxy, every account routes through that single socket. When Telegram rate-limits that IP or the proxy drops, all your accounts go down together.

Existing forks did great work, but maintainers are trapped in an upstream C++ rebase cycle: TDesktop is ~500k lines of C++ with custom Qt submodules, making structural architectural changes (like dynamic per-account socket routing) virtually impossible without breaking upstream sync.

We built Guidegram to explore a different architectural path:
1. **Decoupled Architecture**: We pair a React 19 / TypeScript 5.7 renderer with pure MTProto 2.0 network handling (@mtcute/node) running in dedicated worker contexts.
2. **Unlimited Multi-Account Dock**: Add 5, 10, or 50+ accounts. Permanent 72px left dock with `Ctrl+1..9` keyboard switching and aggregated unread badges.
3. **Per-Account Network Isolation**: Each account can bind to its own SOCKS5, HTTP, or MTProxy tunnel. If one drops, the others are unaffected. Real-time TCP latency pings test connection health.
4. **Hardware Anti-Fingerprinting**: Deterministically emulates 28+ workstation profiles (Dell XPS, ThinkPad X1 Carbon, MacBook Pro) with genuine OS build numbers to prevent server-side correlation.
5. **Zero Registry Footprint**: 100% portable. All sessions, encrypted SQLite caches, and settings live in `./data/`. Run it straight off a flash drive.
6. **In-Client Group Intelligence**: 24h activity heatmaps and active member leaderboards without needing external bots.

The project is fully open source under GPLv3. The initial preview is packaged for Windows x64 Portable, with Linux and macOS builds underway.

I’d love to answer any questions about the MTProto implementation, socket multiplexing, or memory management!
```

---

## 3. Anticipated Skepticism & Battle-Tested Responses

### Q1: "Why Electron instead of C++/Qt? Isn't Electron bloated?"
> **Response**: "That was our primary design consideration. TDesktop's C++ codebase is extraordinarily well-optimized, but its architecture tightly couples the UI state to a singleton account and network manager. Re-architecting TDesktop for dynamic multi-session socket routing would require thousands of invasive changes to upstream C++ files, leading to maintainer burnout (which contributed to Kotatogram's pause). 
> By using Electron with Vite and React 19, we keep the UI responsive, maintain pure portable state inside `./data/`, and run MTProto networking in lightweight Node workers. With animations disabled, 10 active accounts consume ~350MB–450MB of RAM—comparable to running two separate TDesktop instances."

### Q2: "How do you handle security and session storage?"
> **Response**: "Guidegram communicates directly with official Telegram MTProto Data Centers via raw TCP/TLS. There are zero intermediate relay servers, telemetry beacons, or external analytics. Session files and encryption keys are stored strictly in the local `./data/sessions/` folder on your machine. You can also supply your own `api_id` and `api_hash` directly from my.telegram.org in Preferences."

### Q3: "Is this against Telegram's Terms of Service?"
> **Response**: "Telegram provides open APIs and encourages third-party client development (such as Unigram, Nekogram, AyuGram, and TDesktop itself). Guidegram respects all standard MTProto rate limits, implements official flood-wait backoff curves, and does not provide any mass-messaging or spam automation tools."
