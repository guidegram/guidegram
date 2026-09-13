# Reddit Multi-Subreddit Staggered Launch Kit

**OpSec Compliance**:
- Minimum 72-hour interval between subreddit posts.
- Adherence to Reddit 9:1 rule (9 organic, helpful contributions per 1 self-promotional link).
- Account age > 90 days with established comment karma.

---

## Post 1: r/Telegram (Day 16 @ 10:00 AM EST)

- **Subreddit**: `r/Telegram`
- **Flair**: `Client / Tool` or `Discussion`
- **Title**: `Guidegram: An open-source desktop client built for unlimited accounts & per-account proxies`

```markdown
Hey r/Telegram,

Like many of you managing multiple community, work, and personal accounts, I’ve constantly hit the 3-account limit on the official Telegram Desktop client. While forks like 64gram helped patch limits, they still share a single global proxy—so if you use a proxy on Account A, Account B and C are forced through it too, often leading to shared IP correlation or rate limits.

Over the past months, we’ve been building **Guidegram** (https://github.com/guidegram/guidegram), a modern open-source desktop client designed specifically around multi-account isolation:

- **Unlimited Accounts**: Add 5, 10, or 20+ accounts with a permanent vertical dock (`Ctrl+1..9` switching). No Premium required.
- **Dedicated Proxies**: Bind independent SOCKS5, HTTP, or MTProxy configs to specific accounts with live ping monitoring.
- **Hardware Anti-Fingerprinting**: Simulates 28+ authentic workstation profiles to avoid server-side correlation.
- **In-Client Group Stats**: View 24h activity heatmaps and top active chatters directly inside group headers without adding bots.
- **100% Portable**: No Windows registry touches; everything lives in `./data/`.

It’s completely open-source (GPLv3). Windows x64 portable builds are live on GitHub, and we’d love to hear feedback from heavy desktop users!
```

---

## Post 2: r/privacy (Day 19 @ 11:00 AM EST)

- **Subreddit**: `r/privacy`
- **Flair**: `Software` or `Open Source`
- **Title**: `Guidegram – Open-source portable Telegram client with zero registry touches, hardware spoofing, and per-session proxy isolation`

```markdown
Hi everyone,

For those who rely on Telegram but want better operational security and telemetry protection on the desktop, we built **Guidegram** (https://github.com/guidegram/guidegram).

Key privacy engineering details:
1. **Zero Windows Registry Footprint**: Unlike standard desktop apps, Guidegram writes zero keys to `HKCU` or `HKLM`. All state, configurations, and encrypted session files are confined to the portable `./data/` folder.
2. **Per-Session Network Encapsulation**: Official Telegram Desktop forces all logged-in accounts through a single global proxy. Guidegram allows assigning dedicated SOCKS5/HTTP/MTProto tunnels per account, preventing IP cross-contamination.
3. **Hardware Anti-Fingerprinting**: Emulates 28+ distinct hardware signatures (Dell XPS, ThinkPad, MacBook) with randomized OS build versions per session to defeat client correlation.
4. **Zero Intermediate Servers**: Connects directly to Telegram MTProto DCs. Zero analytics, crash reporters, or telemetry beacons.
5. **Open Source**: Full source code available under GPLv3.

Would love feedback from privacy-focused engineers and auditors.
```

---

## Post 3: r/opensource (Day 22 @ 09:30 AM EST)

- **Subreddit**: `r/opensource`
- **Flair**: `Release` or `Project`
- **Title**: `Guidegram – A modern, portable Telegram client built with React 19, TypeScript, Electron, and @mtcute (GPLv3)`

```markdown
Hello r/opensource,

We'd like to share **Guidegram** (https://github.com/guidegram/guidegram), a new open-source desktop client for Telegram.

Most existing third-party desktop clients are direct C++ forks of `telegramdesktop/tdesktop`, which creates huge compilation overhead (>60GB toolchain) and constant upstream rebase fatigue.

Guidegram takes a modern web-engineering approach:
- **Stack**: React 19, TypeScript 5.7, Vite 6, Tailwind CSS, Electron 34, and `@mtcute/node`.
- **Developer Experience**: Run `git clone`, `pnpm install`, and `pnpm dev` in under 60 seconds with full Hot Module Replacement.
- **Key Features**: Permanent vertical dock for unlimited accounts, dedicated per-account proxy routing, 28+ workstation profile spoofing, and native group analytics.

Contributions, PRs, and feedback are very welcome!
```
