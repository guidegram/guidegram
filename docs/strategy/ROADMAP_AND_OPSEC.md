# Guidegram 4-Week Execution Roadmap & Operational Security (OpSec) Playbook

**Document Version**: 1.0.0-PROD  
**Classification**: Public Engineering & Launch Strategy  
**Repository**: `https://github.com/guidegram/guidegram`  
**Target Environment**: Windows x64 Portable (`./data` isolated) | Cross-Platform Extensible  
**License**: GNU General Public License v3.0 (GPLv3)  

---

## Executive Summary & Strategic Intent

Guidegram is an open-source, truly portable desktop client for Telegram engineered with **React 19, TypeScript, Vite, Electron, and GramJS/MTCute**. It provides a production-grade, modern alternative to the official C++/Qt Telegram Desktop (TDesktop) by eliminating four critical architectural bottlenecks:
1. **The 3-Account Limit**: Delivers an unlimited multi-account dock with zero-latency switching (`Ctrl+1..9`) and unified unread counters.
2. **Global Proxy Contamination**: Provides isolated per-account network tunnels (SOCKS5, HTTP, MTProto) with live TCP latency monitoring, eliminating IP cross-contamination and chain bans.
3. **Hardware & Registry Fingerprinting**: Emulates 28+ authentic workstation profiles (Dell XPS, ThinkPad X1 Carbon, MacBook Pro) with randomized Windows OS envelopes, leaving zero footprint in the Windows registry and maintaining all state inside a localized `./data` directory.
4. **Desktop Analytics Void**: Features client-side group conversation intelligence (24-hour activity heatmaps, active contributor leaderboards, and media distribution matrices) without requiring external bot tokens or server-side relays.

This document establishes the authoritative **4-Week Strategic Execution Roadmap** and **Operational Security (OpSec) Guardrail System** to govern Guidegram's transition from local development to global multi-channel adoption. It maps out every operational day from Day 1 to Day 28, enforces strict anti-spam compliance across GitHub, Reddit, Hacker News, and Telegram, and provides automated crisis playbooks to protect the project's reputation, developer accounts, and users.

---

## 1. The 4-Phase Strategic Framework

Guidegram's rollout follows a gated four-phase progression designed to build compounding trust, validate security invariants, and mitigate platform anti-abuse triggers:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   4-PHASE STRATEGIC LIFECYCLE                                        │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Pre-Launch Validation & Security Hardening (Days 1–7)                                       │
│ • Zero compilation warnings (`tsc --noEmit`, ESLint clean)                                           │
│ • Binary integrity: SHA256 checksums, GPG commit signing, reproducible build audit                   │
│ • Local portable data isolation verification (`./data/` containment, zero registry touches)          │
│ • VirusTotal zero-day baseline scanning & false-positive triage                                      │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
         │ [Gate Criteria: 0 Type Errors, Clean VirusTotal Baseline, Validated Portable Upgrades]
         ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Soft Launch & Developer Alpha (Days 8–14)                                                   │
│ • Release `v1.0.0-alpha.1` on GitHub Releases with signed standalone portable ZIP                   │
│ • Seeded feedback from 15 trusted Telegram power users and bot developers                            │
│ • Closed alpha resource benchmarking & directory asset staging (AlternativeTo audited at 142 chars)  │
│ • Open discussion monitoring & technical Q&A (strictly zero upstream closed-issue commenting)        │
│ • Initial directory submission to AlternativeTo (compliance with <150 char rules)                    │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
         │ [Gate Criteria: 0 Critical Session Crashes, 50+ Alpha Downloads, AlternativeTo Approval]
         ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Public Multi-Channel Launch & Directory Expansion (Days 15–21)                              │
│ • General Availability (GA) Release: `v1.0.0` Stable                                                 │
│ • Hacker News "Show HN: Guidegram – ..." launch with technical founder first-comment                 │
│ • Reddit 72-hour staggered campaign: r/Telegram (Day 16) ➔ r/privacy (Day 19) ➔ r/opensource (Day 22)│
│ • Technical X/Twitter demo video thread showcasing multi-account dock & proxy isolation              │
│ • Product Hunt listing launch & open-source directory syndication                                    │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
         │ [Gate Criteria: 500+ GitHub Stars, 1,500+ Binary Downloads, Active Community Hub]
         ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: Sustainable Growth, Community Flywheel & Ecosystem Governance (Days 22–28)                  │
│ • Curated Awesome-list PR submissions supported by >300 stars (awesome-telegram, awesome-desktop)   │
│ • Community-led Linux (Flatpak/AppImage) and macOS (Universal) packaging sprints                     │
│ • Launch of community translation initiative (Crowdin / Weblate setup for i18n)                     │
│ • Bi-weekly MTProto security patch cycle and automated upstream layer drift detection                │
│ • Release `v1.0.1` maintenance update addressing early adopter edge cases                            │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Chronological 4-Week Day-by-Day Execution Plan

### Week 1: Pre-Launch Validation & Security Hardening (Days 1 to 7)

#### Day 1: Codebase Audit, Type-Safety Enforcement & Dependency Lockdown
- **Primary Objective**: Eliminate all compilation errors, type inconsistencies, and stale dependencies to ensure deterministic local builds.
- **Concrete Tasks & Tooling**:
  1. Execute full type checking: `pnpm exec tsc --noEmit` across `electron/` and `src/`.
  2. Audit all third-party dependencies in `package.json` for known vulnerabilities using `pnpm audit`.
  3. Ensure `pnpm-lock.yaml` is frozen; enforce `engine-strict=true` in `.npmrc` for Node 20+ and pnpm 9+.
  4. Verify that all 64gram settings flags (`showChatId`, `showMessageId`, `showSeconds`, `quickForwardToSaved`, `alwaysDeleteBoth`, `suppressLinkWarning`, `disableAnimations`) have strict type declarations in `src/types/telegram.d.ts`.
- **Deliverables**:
  - `pnpm exec tsc --noEmit` exits with status `0` (zero errors).
  - Clean `pnpm audit` security log committed to tracking notes.
- **Transition Gate**: Strict zero-error TypeScript build in clean working tree.

#### Day 2: Portable Filesystem Isolation & Data Loss Prevention Audit
- **Primary Objective**: Validate that Guidegram operates with 100% data portability, zero Windows registry pollution, and robust upgrade survival.
- **Concrete Tasks & Tooling**:
  1. Launch `Guidegram.exe` from a secondary test directory (`D:\Guidegram_Test\`).
  2. Inspect Windows Registry using PowerShell:
     ```powershell
     Get-ItemProperty -Path "HKCU:\Software\Guidegram*" -ErrorAction SilentlyContinue
     Get-ItemProperty -Path "HKLM:\Software\Guidegram*" -ErrorAction SilentlyContinue
     ```
     Confirm zero keys or values are generated.
  3. Verify `%APPDATA%` isolation: ensure no directories named `Guidegram` or `electron` are created outside the explicit mirrored backup (`%APPDATA%/Guidegram/safe_backup`).
  4. Test portable upgrade safety: create mock session files in `./data/sessions/`, run `build_and_release.bat`, and confirm that the build process backs up and restores session files without data loss.
- **Deliverables**:
  - Verified Registry Inspection Log proving 0 keys created.
  - Test session persistence verified across 5 simulated app restarts and unpack upgrades.
- **Transition Gate**: 100% data residency verified within `./data/` folder.

#### Day 3: Hardware Anti-Fingerprinting Matrix & MTProto Profile Validation
- **Primary Objective**: Rigorously test the 28+ hardware spoofing profiles to prevent Telegram server-side correlation across multiple sessions.
- **Concrete Tasks & Tooling**:
  1. Execute unit verification of `electron/telegram/deviceProfileManager.ts`.
  2. Test profile generation across 10 simulated account initializations:
     - Verify device models randomize accurately across Dell XPS 15, ThinkPad X1 Carbon, ASUS ZenBook, MacBook Pro, and Surface Pro.
     - Verify `system_version` reflects genuine Windows 11 builds (26100, 22631) and Windows 10 (19045) with authentic UBR revisions.
     - Verify `app_version` matches the standardized desktop client release string.
  3. Connect 3 distinct test accounts using 3 distinct hardware profiles; inspect MTProto handshake packets via internal debugging logs (`data/logs/guidegram.log`) to confirm distinct client envelopes.
- **Deliverables**:
  - Hardware spoofing validation matrix verifying non-identical parameters across test sessions.
- **Transition Gate**: Zero collision between device signatures across concurrent active test accounts.

#### Day 4: Dedicated Proxy Isolation & TCP Leak Testing
- **Primary Objective**: Verify that accounts bound to separate proxies never leak real IP addresses or cross-contaminate sockets.
- **Concrete Tasks & Tooling**:
  1. Configure Account A with SOCKS5 Proxy 1, Account B with HTTP Proxy 2, and Account C with Direct Connection.
  2. Monitor active network sockets using Sysinternals `TCPView` or PowerShell:
     ```powershell
     Get-NetTCPConnection -OwningProcess (Get-Process Guidegram).Id | Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort, State
     ```
  3. Verify that Account A traffic routes strictly to Proxy 1 endpoint; Account B traffic routes strictly to Proxy 2 endpoint.
  4. Induce network failure on Proxy 1 (kill proxy tunnel): confirm Account A reports disconnected status gracefully without falling back to host network or leaking DNS queries.
  5. Run built-in proxy ping tester (`ProxyManager.testProxyPing`) to verify latency accuracy under unstable connections.
- **Deliverables**:
  - Sockets isolation verification report confirming zero IP leaks on proxy disruption.
- **Transition Gate**: 100% socket encapsulation per account confirmed under load and network failure.

#### Day 5: Binary Packaging, Antivirus Baseline & VirusTotal Submission
- **Primary Objective**: Package standalone portable Windows x64 binary and establish clean reputation with major antivirus vendors.
- **Concrete Tasks & Tooling**:
  1. Run `pnpm run build` followed by `pnpm exec electron-builder --win dir`.
  2. Generate standalone distribution archive: `Guidegram-Windows-x64-Portable.zip`.
  3. Compute cryptographic hashes:
     ```powershell
     Get-FileHash -Algorithm SHA256 .\release\Guidegram-Windows-x64-Portable.zip > SHA256SUMS.txt
     Get-FileHash -Algorithm SHA512 .\release\Guidegram-Windows-x64-Portable.zip > SHA512SUMS.txt
     ```
  4. Submit `Guidegram.exe` to VirusTotal via web UI or API; document scan results across 70+ engines.
  5. If any false positives occur (common in newly packaged Electron binaries using custom protocols), immediately submit whitelist requests to Microsoft Defender Security Intelligence, Malwarebytes, and Avast false-positive portals.
- **Deliverables**:
  - `release/Guidegram-Windows-x64-Portable.zip` packaged.
  - `SHA256SUMS.txt` and `SHA512SUMS.txt` generated.
  - Clean VirusTotal report URL logged (<2 false positives from obscure heuristic engines, 0 from Defender/Kaspersky/Symantec).
- **Transition Gate**: Microsoft Defender scans 100% clean with zero execution blocks.

#### Day 6: Documentation, License & Community Infrastructure Setup
- **Primary Objective**: Establish public community touchpoints, repository documentation, and ethical disclosure policies.
- **Concrete Tasks & Tooling**:
  1. Finalize `README.md` with complete installation guides, architecture overview, feature list, and GPLv3 license badge.
  2. Create `SECURITY.md` defining private vulnerability reporting procedures (via GitHub Security Advisories or PGP email).
  3. Create `CONTRIBUTING.md` outlining TypeScript coding standards, PR workflows, and local development setup (`pnpm dev`).
  4. Set up the official Telegram broadcast channel: `t.me/guidegram_app` for release announcements and hash verification.
  5. Set up the official community discussion supergroup: `t.me/guidegram_chat` with strict anti-spam bot protection (Group Shield / Rose bot with link restrictions for new members).
- **Deliverables**:
  - `SECURITY.md`, `CONTRIBUTING.md`, and updated `README.md` in repository root.
  - Verified active `t.me/guidegram_app` and `t.me/guidegram_chat` channels.
- **Transition Gate**: All legal, security, and community infrastructure live and linked in repository.

#### Day 7: Pre-Launch Freeze & Week 1 Transition Gate Evaluation
- **Primary Objective**: Conduct formal pre-launch sign-off across all core systems before publishing the alpha tag.
- **Concrete Tasks & Tooling**:
  1. Perform clean installation test on a pristine Windows sandbox environment (Windows Sandbox / clean VM).
  2. Test cold boot: launch portable executable, scan QR code, log in, switch theme, toggle 64gram settings, verify persistence in `./data/config.json`.
  3. Verify parallel media download booster: download a 50MB video file; verify 4 concurrent MTProto worker streams in application logs.
  4. Verify group analytics: open a public group with >1,000 members; open analytics modal; confirm 24h heatmap and leaderboard render accurately within 5 seconds.
  5. Hold Go/No-Go decision meeting with maintainer team.
- **Deliverables**:
  - Phase 1 Sign-Off Document signed by core maintainer.
  - Git tag `v1.0.0-alpha.1` created and signed locally.
- **Transition Gate**: 100% pass on all 20 manual QA validation scenarios.

---

### Week 2: Soft Launch & Developer Alpha (Days 8 to 14)

#### Day 8: GitHub Alpha Release Publication & Hash Attestation
- **Primary Objective**: Publish `v1.0.0-alpha.1` on GitHub Releases with signed binaries, checksums, and transparent release notes.
- **Concrete Tasks & Tooling**:
  1. Push Git tag: `git push origin v1.0.0-alpha.1`.
  2. Create GitHub Release draft with title: `Guidegram v1.0.0-alpha.1 (Portable Preview)`.
  3. Attach `Guidegram-Windows-x64-Portable.zip`, `SHA256SUMS.txt`, and source archives.
  4. Include full changelog, installation instructions, known limitations (Windows-only initial build), and custom `api_id`/`api_hash` guidance.
  5. Publish release and post announcement in `t.me/guidegram_app` with SHA256 checksum for binary verification.
- **Deliverables**:
  - Live GitHub Release at `https://github.com/guidegram/guidegram/releases/tag/v1.0.0-alpha.1`.
  - Broadcast post on official Telegram channel with verified download mirror.
- **Transition Gate**: Release downloadable and checksum-verified by external test machines.

#### Day 9: Closed Developer Alpha Testing (15 Power Users Cohort)
- **Primary Objective**: Distribute alpha release to 15 selected Telegram power users, bot developers, and community managers for real-world stress testing.
- **Concrete Tasks & Tooling**:
  1. Onboard 15 testers via direct private invites (friends, existing community contributors who explicitly consented).
  2. Test high-density account configurations: run 10+ active accounts on a single machine for 8 consecutive hours.
  3. Monitor memory consumption: confirm memory usage stays below 350MB total for 10 accounts with animations disabled.
  4. Solicit feedback on proxy responsiveness, QR login flow, direct forward (`Alt+F`), and group analytics accuracy.
  5. Log all reported quirks or edge cases into internal GitHub project board under `alpha-feedback`.
- **Deliverables**:
  - Alpha Feedback Matrix recording tester machine specs, account counts, and bug reports.
- **Transition Gate**: Zero reported session invalidations or MTProto authentication dropouts.

#### Day 10: Closed Alpha Resource Profiling & Directory Asset Staging
- **Primary Objective**: Benchmark memory efficiency, proxy latency, and local storage behavior under multi-account workloads, while staging and verifying directory submission packages locally.
- **Concrete Tasks & Tooling**:
  1. Profile memory footprint with alpha testers operating 5, 10, and 15 active accounts with animations disabled (confirm RAM stays within 350MB–500MB).
  2. Verify local session isolation: confirm each session file in `./data/sessions/` maintains isolated socket state without file descriptor leakage.
  3. Prepare and audit AlternativeTo submission package: verify short description length locally to confirm strict compliance with the <150 character limit (audited at exactly 142 characters).
  4. Pre-stage Git branches and commit messages locally for future curated Awesome-list submissions (`ebertti/awesome-telegram`, `serhii-londar/awesome-telegram`, `agarrharr/awesome-desktop-apps`) in preparation for Phase 4 (post-launch traction >50 stars). Do not submit PRs during closed alpha to prevent premature review rejection.
- **Deliverables**:
  - Alpha Resource Benchmark Sheet confirming memory/socket scaling.
  - Staged, validated metadata packages and screenshots for software directories.
- **Transition Gate**: Memory overhead <50MB per idle account verified; zero session leakage across test identities.

#### Day 11: AlternativeTo Submission Package Deployment
- **Primary Objective**: Submit Guidegram to AlternativeTo.net, the premier consumer and power-user software alternative directory.
- **Concrete Tasks & Tooling**:
  1. Access AlternativeTo submission dashboard using an aged, authenticated user profile.
  2. Populate mandatory metadata fields:
     - Software Name: `Guidegram`
     - URL: `https://github.com/guidegram/guidegram`
     - License: `Open Source` -> `GNU General Public License v3.0 (GPLv3)`
     - Pricing: `Free`
     - Platforms: `Windows` (Portable)
     - Short Description (strictly <150 chars, verified at 142 chars):
       ```text
       Open-source portable Telegram client with unlimited accounts, isolated per-account proxies, hardware anti-fingerprinting, and group analytics.
       ```
     - Long Description: 280-word structured markdown explaining multi-account dock, proxy isolation, hardware anti-fingerprinting, and group stats.
     - Direct Competitor Links: `Telegram Desktop`, `64gram`, `Kotatogram`, `AyuGram`.
  3. Upload 4 high-resolution application screenshots (Account Dock with 5 accounts, Proxy Manager with ping latency, In-Chat Group Analytics heatmap, Settings panel).
  4. Submit for editorial review.
- **Deliverables**:
  - AlternativeTo submission confirmation ticket ID and tracking link.
- **Transition Gate**: Submission accepted into moderator review queue with 0 format errors.

#### Day 12: Community Discussions & Technical Q&A Monitoring (Open Engagement)
- **Primary Objective**: Monitor open community forums and discussions where users actively seek multi-account desktop workflows, while enforcing a strict ban against commenting on closed upstream issues.
- **Concrete Tasks & Tooling**:
  1. **Enforce Zero Issue Necromancy Rule**: Strictly avoid commenting on closed, stale, or `wontfix` issues on `telegramdesktop/tdesktop`, `64gram/64gram`, or upstream forks. Never trigger watch notification storms or risk GitHub AUP abuse flags.
  2. Monitor legitimate, open channels for user questions:
     - Open GitHub Discussions in ecosystem tooling repos that explicitly invite client recommendations.
     - Active threads on `r/Telegram` and `r/opensource` where users discuss proxy routing or desktop multi-account limitations.
     - Guidegram's own repository discussions (`github.com/guidegram/guidegram/discussions`).
  3. When answering on open community forums: provide technically substantive explanations of MTProto session multiplexing, link to open-source code in `electron/telegram/accountManager.ts`, and always include transparent maintainer disclosure in the footer.
  4. Limit external forum replies to maximum 1–2 high-quality contributions per week; zero unsolicited user mentions or naked URLs.
- **Deliverables**:
  - Community discussion log documenting technical Q&A contributions.
  - Zero unsolicited comments posted on closed upstream issue trackers.
- **Transition Gate**: 0 spam flags or moderation disputes across all community touchpoints.

#### Day 13: Alpha Triage & Rapid Hardening Patch (v1.0.0-alpha.2)
- **Primary Objective**: Resolve all feedback, minor UI glitches, and edge-case bug reports identified during the closed alpha testing period.
- **Concrete Tasks & Tooling**:
  1. Triage issues logged in GitHub tracker: prioritize any UI render lag, proxy timeout edge cases, or shortcut conflicts.
  2. Implement fixes:
     - Optimize group analytics modal memory caching for chats with >10,000 fetched messages.
     - Add visual indicator when an account proxy is currently reconnecting.
     - Refine `Alt+F` direct forward modal focus management.
  3. Run full automated test suite and regression build.
  4. Tag and package `v1.0.0-alpha.2` containing stability enhancements.
- **Deliverables**:
  - Closed 100% of alpha bug tickets.
  - Release `v1.0.0-alpha.2` deployed for final regression verification.
- **Transition Gate**: Alpha testers confirm stability of `v1.0.0-alpha.2` with zero regressions.

#### Day 14: Phase 2 Review & Public Launch Readiness Review
- **Primary Objective**: Finalize all public launch assets, schedule launch windows, and verify public communication scripts.
- **Concrete Tasks & Tooling**:
  1. Inspect status of AlternativeTo listing approval.
  2. Prepare 4 short video clips (<30s) demonstrating key features for Twitter/Reddit:
     - Clip A: Adding 5th account via QR code in 3 seconds.
     - Clip B: Switching accounts with `Ctrl+1..5` with zero reload latency.
     - Clip C: Real-time proxy ping latency tester and per-account proxy assignment.
     - Clip D: Opening Group Analytics heatmap and active member leaderboard.
  3. Verify Reddit accounts: ensure posting account is >90 days old with >300 organic comment karma.
  4. Verify Hacker News account: ensure aged account in good standing.
  5. Schedule launch sequence starting Tuesday 08:00 AM EST (optimal tech forum engagement window).
- **Deliverables**:
  - Launch Asset Vault containing recorded MP4 clips, text copy, and verified accounts.
  - Signed Go-Live Authorization for Phase 3.
- **Transition Gate**: Complete launch collateral assembled and validated against OpSec rules.

---

### Week 3: Public Multi-Channel Launch & Directory Expansion (Days 15 to 21)

#### Day 15: General Availability Release (v1.0.0) & Hacker News "Show HN" Launch
- **Primary Objective**: Announce General Availability (GA) of Guidegram `v1.0.0` and launch on Hacker News.
- **Concrete Tasks & Tooling**:
  1. **07:30 EST**: Tag and publish `v1.0.0` Stable on GitHub Releases with comprehensive release notes.
  2. **08:15 EST**: Submit to Hacker News:
     - URL: `https://github.com/guidegram/guidegram`
     - Title: `Show HN: Guidegram – Portable multi-account Telegram client with proxy isolation`
  3. **08:17 EST**: Post mandatory founder first comment detailing:
     - The motivation behind building Guidegram (overcoming TDesktop's C++ Qt rebase bottleneck and 3-account limit).
     - Technical architecture: Electron + React 19 + TypeScript + GramJS MTProto 2.0.
     - Privacy guarantees: 100% portable `./data` storage, zero registry keys, hardware spoofing.
     - Open source invitation for Linux/macOS packagers.
  4. **08:30–18:00 EST**: Maintainer live monitoring of HN comments. Provide prompt, respectful, deep technical answers to questions on Electron memory usage, MTProto encryption integrity, and security models.
  5. **Strict OpSec Rule**: Absolutely zero voting rings, no sharing links on private Telegram channels asking for upvotes, and no internal brigading. Allow organic ranking.
- **Deliverables**:
  - Live `v1.0.0` Release on GitHub.
  - Live Show HN post on Hacker News frontpage/new.
- **Transition Gate**: 50+ organic HN upvotes; 100% of technical inquiries answered professionally.

#### Day 16: Reddit Campaign Wave 1: r/Telegram Launch
- **Primary Objective**: Present Guidegram to the primary Telegram user community on Reddit (`r/Telegram`, 150k+ members).
- **Concrete Tasks & Tooling**:
  1. **09:30 EST**: Post to `r/Telegram` using flair `Third-Party` / `Client`.
  2. Title: `[Open Source] Guidegram: Portable desktop client with native multi-account workflow, per-account proxies, and group analytics`
  3. Post Body: Follow verified non-commercial template highlighting:
     - Problem solved: Native multi-account workflow and session isolation for admins and power users, eliminating single global proxy bottlenecks.
     - Key features: Native multi-account dock, dedicated per-account proxies, hardware anti-fingerprinting, 100% portable `./data/`, in-chat group analytics.
     - Architecture & security: GPLv3, local session storage in `./data/sessions/`, pure client-side MTProto, custom `api_id`/`api_hash` support.
     - Official disclaimer regarding independent third-party status.
  4. Actively engage with community inquiries: address common questions about safety, session storage, and how proxy isolation works under the hood.
- **Deliverables**:
  - Live post on `r/Telegram` with positive community sentiment (>80% upvote ratio).
- **Transition Gate**: Post accepted by moderators with zero removal or auto-flag incidents.

#### Day 17: Twitter / X Technical Demo Thread & Developer Amplification
- **Primary Objective**: Launch 4-part visual demo thread on X/Twitter targeting open-source, TypeScript, and Telegram developer communities.
- **Concrete Tasks & Tooling**:
  1. **10:00 EST**: Post Hook Tweet with high-resolution 25-second video demonstrating multi-account switching and proxy ping indicator.
  2. Post Tweet 2/4: Technical architecture breakdown (React 19, TypeScript, Electron, GramJS, 4-worker MTProto parallel downloader).
  3. Post Tweet 3/4: Showcase of Group Statistics & Activity Heatmap with screenshot.
  4. Post Tweet 4/4: Call for contributors (Linux/macOS packaging) and GitHub repository link.
  5. Tag relevant open-source project tags: `#OpenSource #TypeScript #React19 #ElectronJS #Telegram`.
  6. Retweet from community member accounts organically; pin thread to project profile.
- **Deliverables**:
  - 4-part viral technical thread published and pinned on X/Twitter.
- **Transition Gate**: 5,000+ organic impressions and 50+ GitHub referral clicks.

#### Day 18: Rest Day & OpSec 72-Hour Spacing Buffer (Feedback Triage)
- **Primary Objective**: Enforce mandatory 72-hour operational cooldown on Reddit to satisfy anti-spam heuristics while triaging initial launch issues.
- **Concrete Tasks & Tooling**:
  1. **Zero External Reddit Submissions**: Adhere strictly to the 72-hour spacing rule between subreddits to avoid automated spam filter cross-posting penalties.
  2. Review GitHub issue tracker for incoming bug reports from HN, Reddit, and Twitter adopters.
  3. Triage issues: label as `bug`, `enhancement`, or `documentation`.
  4. Verify serverless download metrics: track GitHub Releases download counts via GitHub API:
     ```bash
     curl -s https://api.github.com/repos/guidegram/guidegram/releases/latest | jq '.assets[] | {name: .name, download_count: .download_count}'
     ```
  5. Welcome new users in `t.me/guidegram_chat` and provide configuration guidance.
- **Deliverables**:
  - Triage log of all reported issues.
  - Verified 72-hour silent window maintained across secondary subreddits.
- **Transition Gate**: All reported high-priority launch bugs reproduced and patched in development branch.

#### Day 19: Reddit Campaign Wave 2: r/privacy Deep-Dive
- **Primary Objective**: Engage privacy advocates and security researchers on `r/privacy` with an educational technical paper on mitigating device fingerprinting.
- **Concrete Tasks & Tooling**:
  1. **10:00 EST** (Exactly 72h after r/Telegram post): Submit to `r/privacy` (1.5M+ members).
  2. Title: `Mitigating desktop device fingerprinting and cross-account correlation on Telegram: An open-source implementation`
  3. Post Focus: Frame as an architectural discussion on threat modeling:
     - Cross-account correlation vectors in standard desktop clients (static hardware identifiers, single network interface).
     - How Guidegram implements per-session network partitioning and combinatorial hardware masking.
     - Why zero registry touch and localized `./data` storage protect against forensic traces on shared/workstation machines.
     - 100% open source under GPLv3 for code auditing.
  4. Engage in comments with privacy purists; provide transparent explanations of MTProto cryptographic guarantees.
- **Deliverables**:
  - Live technical discussion thread on `r/privacy`.
- **Transition Gate**: Zero Rule 5 (commercial self-promotion) warnings; positive reception from privacy community.

#### Day 20: Product Hunt Listing & Software Directory Expansion
- **Primary Objective**: Launch Guidegram on Product Hunt and syndicate to secondary open-source software directories.
- **Concrete Tasks & Tooling**:
  1. **00:01 PST**: Launch Guidegram on Product Hunt:
     - Tagline: "Open-source portable Telegram client with unlimited accounts & proxies"
     - Categories: Open Source, Privacy, Messaging, Productivity.
     - Media: 5 preview screenshots + 30s demonstration video.
     - Maker Comment: Factual story of building Guidegram to empower community managers and power users.
  2. Submit Guidegram to FOSS directories:
     - FOSSHUB (Open Source software repository)
     - Softpedia (Windows Portable Freeware category)
     - SourceForge mirror page setup
  3. Update AlternativeTo listing with `v1.0.0` stable release announcement and direct download links.
- **Deliverables**:
  - Product Hunt campaign active.
  - Submissions completed on Softpedia and FOSSHUB.
- **Transition Gate**: Submissions verified and indexed across directory portals.

#### Day 21: Phase 3 Milestone Review & Traffic Retrospective
- **Primary Objective**: Measure public launch impact across all distribution channels, audit repository health, and evaluate Phase 3 KPIs.
- **Concrete Tasks & Tooling**:
  1. Compile Week 3 metrics dashboard:
     - GitHub Stars: verify target trajectory (>300 stars achieved).
     - GitHub Forks: track community fork count (>25 forks).
     - Binary Downloads: count total portable zip downloads across releases (>1,000 downloads).
     - Telegram Community: count active members in `t.me/guidegram_chat` (>150 members).
  2. Review incoming pull requests: assign reviewers to open-source contributions.
  3. Plan Week 4 community flywheel tasks.
- **Deliverables**:
  - Phase 3 Performance Report summarizing traffic, downloads, and conversion rates.
- **Transition Gate**: Zero critical security vulnerabilities reported; baseline adoption targets satisfied.

---

### Week 4: Sustainable Growth, Community Flywheel & Ecosystem Governance (Days 22 to 28)

#### Day 22: Reddit Campaign Wave 3: r/opensource & Contributor Call
- **Primary Objective**: Present Guidegram to `r/opensource` (300k+ members) focusing on frontend architecture and calling for Linux/macOS packagers.
- **Concrete Tasks & Tooling**:
  1. **10:00 EST**: Submit to `r/opensource`.
  2. Title: `Guidegram: A modern, portable Telegram desktop client built with React 19, TypeScript, Electron & GramJS (GPLv3)`
  3. Post Focus:
     - The "C++ fork trap": why building on React 19 + TypeScript enables rapid desktop iteration compared to 500k lines of Qt/C++.
     - Technical achievements: pure client-side MTProto 2.0, parallel chunked media acceleration, native group analytics.
     - Explicit contributor invitation: looking for maintainers to lead Linux packaging (Flatpak, AppImage, AUR) and macOS notarization.
  4. Welcome incoming open-source contributors on GitHub Discussions.
- **Deliverables**:
  - Live `r/opensource` thread.
  - Active GitHub Discussion thread: "Call for Linux & macOS Maintainers".
- **Transition Gate**: 5+ open-source developers express interest in contributing to cross-platform packaging.

#### Day 23: Community Packaging Sprint: Linux (Flatpak/AppImage) Working Group
- **Primary Objective**: Initialize official Linux packaging pipelines with community contributors to expand Guidegram beyond Windows.
- **Concrete Tasks & Tooling**:
  1. Create `packaging/linux/` directory in repository.
  2. Draft `org.guidegram.Guidegram.json` Flatpak manifest using `electron-builder` Flatpak target.
  3. Draft `AppImage` packaging configuration in `electron-builder.json`:
     ```json
     "linux": {
       "target": ["AppImage", "tar.gz"],
       "category": "Network;Chat;InstantMessaging;",
       "maintainer": "Guidegram Contributors <dev@guidegram.org>"
     }
     ```
  4. Test headless Linux packaging build in Ubuntu 24.04 GitHub Actions runner.
  5. Document Linux portable storage behavior: redirect user data to `~/.config/guidegram/` or portable `./data` adjacent to executable.
- **Deliverables**:
  - Pull Request opened: `feat(packaging): add Linux AppImage and Flatpak configurations`.
- **Transition Gate**: Linux build compiles cleanly in CI without dependency failures.

#### Day 24: Curated Awesome-Lists PR Submissions & i18n Integration
- **Primary Objective**: Submit precise, non-promotional pull requests to top curated GitHub Awesome lists (`ebertti/awesome-telegram`, `serhii-londar/awesome-telegram`, `agarrharr/awesome-desktop-apps`), now backed by demonstrated post-launch traction (>300 stars), satisfying Awesome manifesto repository maturity criteria.
- **Concrete Tasks & Tooling**:
  1. Verify repository maturity gate: confirm GitHub star count >50 (target: >300 stars achieved post-launch) and stable release availability.
  2. Fork `ebertti/awesome-telegram` (5,600+ stars):
     - Edit `README.md` under `## Clients` -> `### Desktop`.
     - Insert in exact alphabetical order:
       ```markdown
       * [Guidegram](https://github.com/guidegram/guidegram) – Open-source portable desktop client with unlimited multi-account, isolated per-account proxies, and group analytics.
       ```
     - Submit PR with title: `Add Guidegram to Desktop Clients`.
  3. Fork `serhii-londar/awesome-telegram`:
     - Edit `README.md` under `## Apps` -> `### Desktop`.
     - Insert in exact alphabetical order:
       ```markdown
       - [Guidegram](https://github.com/guidegram/guidegram) ([Source](https://github.com/guidegram/guidegram)) - Portable multi-account desktop client with per-account proxy isolation and hardware anti-fingerprinting.
       ```
     - Submit PR with title: `Add Guidegram to Desktop Apps`.
  4. Fork `agarrharr/awesome-desktop-apps` (11,000+ stars):
     - Edit `README.md` under `## Communication` -> `### Chat`.
     - Add Guidegram entry with repository and star badge link.
     - Submit PR with title: `Add Guidegram to Communication / Chat`.
  5. Enforce OpSec cadence: limit submissions to 1–2 repositories per 24 hours to prevent automated GitHub rate-limiting.
  6. Deploy `react-i18next` internationalization framework in `src/i18n/` and extract UI strings for English, Persian, Russian, and Spanish.
- **Deliverables**:
  - 3 curated list Pull Requests submitted conforming strictly to upstream formatting guidelines.
  - Working i18n architecture committed to `main` branch.
- **Transition Gate**: Pull requests pass upstream CI format linters; UI dynamically swaps languages without layout breaks.

#### Day 25: Telegram Native Ecosystem Integration & Developer Hub Outreach
- **Primary Objective**: Engage ethically in developer-focused Telegram groups and channels by answering technical questions and providing code references.
- **Concrete Tasks & Tooling**:
  1. Monitor public technical discussions in `@gramjschat`, `@tgdesktop`, and MTProto research channels.
  2. Answer complex technical inquiries regarding:
     - Implementing parallel chunked downloads over MTProto.
     - Handling multi-client socket management without memory leaks.
     - Calculating client-side group analytics using MTProto history pagination.
  3. Share direct permalinks to Guidegram's open-source source files (e.g. `electron/telegram/accountManager.ts`) as educational references.
  4. Maintain 100% adherence to Telegram Native OpSec: zero unsolicited PMs, zero promotional link spamming.
- **Deliverables**:
  - 5 educational developer interactions completed across Telegram developer hubs.
- **Transition Gate**: Zero administrative warnings or bot bans; reputation established as a peer engineering resource.

#### Day 26: First Maintenance & Performance Release (v1.0.1)
- **Primary Objective**: Package and release `v1.0.1` incorporating all initial user bug reports, performance enhancements, and new translations.
- **Concrete Tasks & Tooling**:
  1. Consolidate changes into `CHANGELOG.md` under `## [1.0.1] - 2026-10-08`:
     - Fix: Edge case in QR login timeout handling on high-latency proxies.
     - Perf: 20% reduction in renderer CPU utilization during rapid chat switching.
     - Feat: Initial Russian (`ru`) and Spanish (`es`) community language packs.
     - Feat: Added configurable TCP timeout parameter in Proxy Manager settings.
  2. Run full regression build: `pnpm run build` and `pnpm build:portable`.
  3. Validate binary checksums: verify SHA256 and update `SHA256SUMS.txt`.
  4. Publish `v1.0.1` on GitHub Releases and announce on `t.me/guidegram_app`.
- **Deliverables**:
  - `v1.0.1` live on GitHub Releases and verified in the wild.
- **Transition Gate**: Clean automated upgrade path verified from `v1.0.0` to `v1.0.1` without user session interruption.

#### Day 27: Community Governance & Issue Triaging Automation
- **Primary Objective**: Deploy GitHub issue templates, automated triage workflows, and community governance guidelines for long-term project sustainability.
- **Concrete Tasks & Tooling**:
  1. Deploy `.github/ISSUE_TEMPLATE/`:
     - `bug_report.yml`: structured form requesting OS version, installation mode (portable), proxy type, and reproduction steps.
     - `feature_request.yml`: structured template requiring problem statement and proposed UX.
  2. Deploy `.github/workflows/stale.yml`: automated workflow to mark inactive issues after 45 days.
  3. Deploy GitHub Discussions categories: `General`, `Ideas`, `Q&A`, `Show and Tell`.
  4. Appoint 2 active community contributors from the Telegram chat as community triage moderators.
- **Deliverables**:
  - Standardized issue templates and GitHub Discussions fully operational.
- **Transition Gate**: All incoming issues automatically classified and labeled by GitHub Actions.

#### Day 28: 4-Week Milestone Audit, KPI Retrospective & Phase 5 Roadmap
- **Primary Objective**: Conduct comprehensive audit against all original launch goals, finalize analytics, and publish the 6-month roadmap.
- **Concrete Tasks & Tooling**:
  1. Compile Final 4-Week KPI Report:
     - Total GitHub Stars (Target: 500+ | Actual Audit)
     - Total Portable Downloads (Target: 2,500+ | Actual Audit)
     - Total Active Community Members (Target: 350+ | Actual Audit)
     - Pull Requests merged from external contributors (Target: 5+ | Actual Audit)
  2. Publish "Guidegram: The Next 6 Months" roadmap article on GitHub Discussions:
     - Linux Flatpak/AppImage General Availability.
     - macOS Apple Silicon notarized builds.
     - Custom MTProto Proxy server integration.
     - Local encrypted SQLite vault option for multi-user shared machines.
  3. Formal sign-off and closure of the Initial Launch Campaign.
- **Deliverables**:
  - Completed 4-Week Executive Audit Report.
  - Published 6-Month Roadmap on GitHub Discussions.
- **Transition Gate**: All 4 launch phases completed with verified deliverables and zero operational or security incidents.

---

## 3. Operational Security (OpSec) & Anti-Spam Protocols

To safeguard Guidegram's GitHub repository, maintainer identities, and community reputation from algorithmic blacklisting, shadowbans, or community backlash, the following strict OpSec protocols must be observed across all distribution channels:

### 3.1 GitHub Acceptable Use Policy Compliance & Anti-Abuse Safeguards
GitHub strictly enforces its Acceptable Use Policy (§ Abuse and Spam) to prevent platform manipulation:

1. **Automated Star & Fork Manipulation Prohibition**:
   - **Rule**: Absolutely zero use of automated star bots, exchange networks ("star-for-star"), or incentivized starring services.
   - **Enforcement**: GitHub's abuse detection analyzes graph clustering, account creation timestamps, and commit history. Star rings result in immediate repository de-indexing from GitHub Explore and potential organization suspension.
   - **Protocol**: All stars must be organically earned via technical merit, documentation quality, and community value.

2. **Ethical Pull Request Submissions to Awesome Lists**:
   - **Rule**: Maximum of 1–2 Awesome list PRs per 24 hours.
   - **Formatting Integrity**: Every PR must be crafted manually, strictly sorted alphabetically, and strictly free of marketing superlatives ("best", "revolutionary", "blazing fast").
   - **Checklist Compliance**: Complete every checklist item required by the maintainer. Never submit PRs with empty or generic descriptions.

3. **Upstream Issue Tracker Policy (Strict Zero-Commenting Policy on Upstream Issues)**:
   - **Strict Prohibition**: Strictly avoid commenting on closed, stale, or `wontfix` issues on upstream repositories (`telegramdesktop/tdesktop`, `64gram/64gram`, or other forks). Never engage in "issue necromancy", which generates unwanted notifications to thousands of issue watchers, provokes maintainer spam flags, and violates GitHub's Acceptable Use Policy (§ Abuse and Spam).
   - **Permissible Engagement**: Confine technical outreach exclusively to open, permissionless channels:
     - Open community discussions (GitHub Discussions) where users explicitly solicit multi-account client recommendations.
     - Topical Reddit threads and developer forums (`r/Telegram`, `r/opensource`, Stack Overflow).
     - Guidegram's native repository discussions (`github.com/guidegram/guidegram/discussions`).
   - **Mandatory Disclosure**: Every comment in permitted open channels must provide substantial architectural context first and conclude with transparent disclosure:  
     `*(Full disclosure: I am a contributor to Guidegram. Sharing strictly as an open-source technical reference.)*`

---

### 3.2 Reddit Anti-Spam Heuristics & Shadowban Defense
Reddit employs sophisticated algorithmic filters (AutoModerator, Spam Assassin, Domain Blacklists) combined with aggressive human moderation:

1. **The 9:1 Organic Contribution Rule**:
   - **Rule**: For every 1 post or comment referencing Guidegram, the authoring Reddit account must have at least 9 substantive, high-value comments in unrelated technical or community discussions.
   - **Execution**: Maintain active participation across `r/programming`, `r/typescript`, `r/reactjs`, and `r/privacy` without posting links.

2. **Account Age & Karma Prerequisites**:
   - **Minimum Account Age**: 60 days (prefer 180+ days).
   - **Minimum Comment Karma**: 250+ organic comment karma.
   - **Warning**: New accounts (<30 days or <100 karma) submitting external GitHub links are automatically caught in the `spam-quarantine` filter and hidden from public view without notifying the submitter.

3. **The 72-Hour Spacing Protocol**:
   - **Rule**: Never submit posts to multiple subreddits simultaneously.
   - **Spacing Window**: Enforce a strict minimum of **72 hours** between posts across different subreddits (e.g. Day 16: `r/Telegram` ➔ Day 19: `r/privacy` ➔ Day 22: `r/opensource`).
   - **Penalty for Violation**: Submitting the same link or text across 3+ subreddits within 12 hours triggers an algorithmic global shadowban where all submissions across Reddit become invisible.

4. **Shadowban Verification Procedure**:
   - After every submission, verify visibility in an Incognito/Private browser window without logging into Reddit.
   - Check using `reddit.com/r/ShadowBan/` or submit a test query to verify account status if upvotes or comments remain at exactly 1 after 2 hours.

---

### 3.3 Hacker News Etiquette & Anti-Brigading Protocols
Hacker News (Y Combinator) maintains an uncompromising anti-commercial ethos governed by strict algorithmic and moderator scrutiny:

1. **Zero Voting Rings & Anti-Brigading**:
   - **Rule**: Never share the Hacker News submission URL in Telegram groups, Discord servers, Twitter posts, or private messages asking people to upvote.
   - **Detection Vector**: Hacker News monitors referring URLs (`Referer` header) and account correlation clusters. If 5+ users arrive directly via a Telegram link or from identical IP subnets and immediately upvote, the submission is automatically flagged as `[dead]` or penalized with heavy down-weighting in the ranking algorithm.
   - **Correct Protocol**: Announce that the project has launched, but never provide a direct link to the HN submission with an upvote request. Allow readers to discover and upvote organically if they choose.

2. **"Show HN" Submission Standards**:
   - Title format must strictly adhere to: `Show HN: Guidegram – Portable multi-account Telegram client with proxy isolation`
   - No buzzwords, no all-caps, no emojis in the title.
   - The link must lead directly to the open-source repository or downloadable software, never to a marketing landing page or blog post.

3. **Founder First-Comment Architecture**:
   - The submitter must post a comprehensive, humble, and technically dense comment immediately after submission.
   - Must cover: Why it was built, how it works technically (React 19, TypeScript, GramJS, Electron), architectural trade-offs (Electron RAM vs. Qt compile times), and open questions for the community.

---

### 3.4 Telegram Native OpSec & Ban Prevention
Telegram's anti-spam engine employs aggressive real-time heuristic filters (`PEER_FLOOD`, `@SpamBot`) to protect users from unsolicited marketing:

1. **Strict Prohibition of Cold Direct Messages (DMs)**:
   - **Rule**: Never send unsolicited private messages to members of Telegram groups, developer chats, or channel comment sections.
   - **Consequence**: Receiving even 2–3 "Report Spam" clicks from recipients triggers an immediate automated limitation via `@SpamBot`. The account is stripped of the ability to message non-contacts or start chats.
   - **Protocol**: All engagement must occur in public group contexts in direct response to explicit questions.

2. **Avoiding `PEER_FLOOD` & Unprompted Broadcasts**:
   - **Rule**: Never mass-invite users to `t.me/guidegram_chat`. Group invites must be 100% opt-in via public channel links.
   - **Rate Limiting**: Automated bots and test scripts must strictly observe MTProto rate limits: maximum 1 message per second in groups, maximum 30 messages per minute globally.

3. **Test Account & Infrastructure Isolation**:
   - **Rule**: Development, automated testing, and MTProto packet sniffing must **never** be performed using primary personal phone numbers.
   - **Sanitization**: Dedicated virtual test numbers or isolated secondary SIM cards must be used for staging accounts.
   - **Hardware Separation**: Test accounts must utilize unique hardware profiles in `electron/telegram/deviceProfileManager.ts` and route through dedicated testing proxies to prevent cross-account blacklisting by Telegram DCs.

4. **Maintainer Credential Protection**:
   - **Rule**: Maintainer accounts running public groups must have 2-Step Verification (cloud password) enabled with strong, unique passphrases.
   - Maintainer phone numbers must be hidden (`Settings > Privacy and Security > Phone Number > Nobody`).

---

### 3.5 Crisis Management & Incident Response Playbook

#### Playbook A: Spambot / False Positive Flagging Incident
- **Trigger**: A maintainer account, official channel, or community group is restricted or flagged by `@SpamBot` or user reports.
- **Immediate Response (T+0 to T+2 Hours)**:
  1. Cease all outbound messaging from affected accounts immediately.
  2. Initiate formal appeal via `@SpamBot` in Telegram:
     - Select: `"This is a mistake"` ➔ `"Yes"` ➔ `"No, I'll never do that"` ➔ Provide factual explanation:  
       `"I am an open-source software developer building an independent client using the official Telegram API. I answered a technical question in a public developer group and believe my account was reported mistakenly by an automated filter. I do not send spam or unsolicited messages."`
  3. Send email appeal to `recover@telegram.org` and `abuse@telegram.org` with account phone number and detailed incident log.
  4. Designate secondary backup admin account to maintain communications in `t.me/guidegram_chat`.

#### Playbook B: Security Vulnerability or Session Exposure Disclosure
- **Trigger**: A security researcher or user reports a potential vulnerability (e.g. session token exposure, IPC privilege escalation, proxy leak).
- **Immediate Response (T+0 to T+4 Hours)**:
  1. Acknowledge receipt of the report within 2 hours; request private communication via PGP or GitHub Security Advisory.
  2. Isolate the affected codebase component (e.g. `electron/telegram/sessionStore.ts`, `electron/preload.ts`).
  3. Reproduce the vulnerability in an isolated sandbox environment.
- **Mitigation & Patching (T+4 to T+24 Hours)**:
  4. Develop surgical fix adhering to the minimal-change principle.
  5. Commit patch to a private security branch; execute full regression test suite.
  6. Cut emergency hotfix release: `v1.0.x-security`.
  7. Publish release with transparent CVE / GitHub Security Advisory detailing the threat model, affected versions, and remediation.
  8. Broadcast security advisory to `t.me/guidegram_app` urging immediate update.

#### Playbook C: Antivirus / Windows SmartScreen False Positive
- **Trigger**: Windows Defender SmartScreen blocks `Guidegram.exe` with "Windows protected your PC" or a third-party antivirus flags the portable binary.
- **Immediate Response (T+0 to T+12 Hours)**:
  1. Immediately submit false-positive dispute to Microsoft Defender:
     - Portal: `https://www.microsoft.com/en-us/wdsi/filesubmission`
     - Category: Software Developer / False Positive
     - Attach compiled binary, GitHub release URL, and source code reference.
  2. Submit disputes to secondary vendors:
     - Malwarebytes False Positive Forum / Portal
     - Avast / AVG Whitelist Portal (`https://www.avast.com/false-positive-file-form`)
     - Kaspersky Whitelist Portal
  3. Update GitHub Release notes with a temporary "Security & SmartScreen FAQ":
     - Explain why newly published, unsigned open-source binaries trigger SmartScreen reputation warnings.
     - Provide SHA256 checksums and instructions on verifying hashes via PowerShell:
       ```powershell
       Get-FileHash .\Guidegram.exe -Algorithm SHA256
       ```
     - Explain how users can review the open-source code and build directly from source using `pnpm build:portable`.

#### Playbook D: Upstream MTProto Protocol / Layer Breaking Changes
- **Trigger**: Telegram deploys a breaking MTProto layer update resulting in API errors (`RPC_CALL_FAIL`, schema mismatches, or connection resets).
- **Immediate Response (T+0 to T+24 Hours)**:
  1. Inspect MTProto error payloads in `data/logs/guidegram.log` to identify failed constructor IDs or schema discrepancies.
  2. Query MTProto documentation and upstream GramJS / `@mtcute` repositories for layer bump commits.
  3. Update `@mtcute/core` or GramJS dependencies in `package.json` to the latest upstream layer definition:
     ```bash
     pnpm update @mtcute/core @mtcute/node @mtcute/convert
     ```
  4. If upstream libraries have not yet patched the layer change, implement temporary local polyfill or constructor mapping in `electron/telegram/accountManager.ts`.
  5. Build, verify, and release hotfix `v1.0.x` within 24 hours.

---

## 4. Key Performance Indicators (KPIs) & Milestone Tracking

### 4.1 Quantitative Milestone Metric Targets

The following scorecard defines measurable success criteria across all 4 phases:

```
┌───────────────────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ Metric / Dimension            │ Phase 1 (W1) │ Phase 2 (W2) │ Phase 3 (W3) │ Phase 4 (W4) │
├───────────────────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ **GitHub Stars**              │ N/A (Local)  │ 50+          │ 300+         │ 600+         │
│ **GitHub Forks**              │ N/A          │ 10+          │ 30+          │ 60+          │
│ **External PRs / Issues**     │ 0            │ 5+           │ 25+          │ 50+          │
│ **Portable ZIP Downloads**    │ Internal     │ 100+         │ 1,500+       │ 3,500+       │
│ **Active Telegram Community** │ 5 (Team)     │ 25 (Alpha)   │ 150+         │ 400+         │
│ **AlternativeTo Upvotes**     │ Pending Sub  │ 10+          │ 35+          │ 75+          │
│ **Crash / Session Drop Rate** │ 0% (Sim)     │ <1%          │ <0.5%        │ <0.2%        │
│ **Open Source Contributors**  │ Core Team    │ 2 External   │ 5 External   │ 10 External  │
└───────────────────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

---

### 4.2 Telemetry-Free Privacy-Centric Analytics Methodology

To uphold Guidegram's strict privacy invariants, **no telemetry, tracking SDKs, or background ping servers are embedded in the software**. All metrics are derived exclusively through privacy-preserving external channels:

1. **Binary Download Tracking**:
   - Queried directly via GitHub Releases public API. Tracks total asset downloads without storing client IP addresses:
     ```bash
     curl -s https://api.github.com/repos/guidegram/guidegram/releases | jq '[.[] | .assets[] | {release: .name, downloads: .download_count}]'
     ```

2. **Repository Engagement**:
   - Monitored via GitHub Insights API: unique cloners, repository traffic visitors, and referrer domains (Reddit, Hacker News, AlternativeTo).

3. **Community Retention & Sentiment**:
   - Tracked via active message volume and retention in `t.me/guidegram_chat`.
   - Ratio of bug reports vs. feature requests in GitHub Issues used as a proxy for product stability.

---

### 4.3 Milestone Verification Checklist & Sign-Off Gates

Before declaring any strategic phase complete, the maintainer must verify and sign off on each specific gate criterion:

#### Phase 1: Pre-Launch Validation Sign-Off
- [ ] TypeScript compilation (`pnpm exec tsc --noEmit`) passes with 0 errors.
- [ ] Vite production build (`pnpm run build`) completes cleanly.
- [ ] Windows registry inspection confirms 0 keys created by Guidegram.
- [ ] `%APPDATA%` inspection confirms all user data resides strictly within `./data/`.
- [ ] Simulated in-place upgrade preserves `./data/sessions/` without data loss.
- [ ] VirusTotal scan yields 0 detections across major security vendors.
- [ ] Signed Git tag `v1.0.0-alpha.1` created locally.

#### Phase 2: Soft Launch Sign-Off
- [ ] Release `v1.0.0-alpha.1` live on GitHub Releases with verified SHA256 checksums.
- [ ] 15 alpha testers onboarded with 0 reported session disconnects.
- [ ] Closed alpha resource profiling and directory asset staging completed.
- [ ] AlternativeTo listing submitted with short description <150 characters (142 chars).
- [ ] Zero comments posted on closed upstream issues; open community Q&A monitored.
- [ ] Stability release `v1.0.0-alpha.2` deployed.

#### Phase 3: Public Launch Sign-Off
- [ ] Stable release `v1.0.0` published on GitHub Releases.
- [ ] Hacker News "Show HN" submission posted with detailed founder comment.
- [ ] Reddit Wave 1 (`r/Telegram`) launched; 72-hour spacing window strictly maintained.
- [ ] Reddit Wave 2 (`r/privacy`) launched focusing on hardware anti-fingerprinting.
- [ ] 4-part visual demo thread published on X/Twitter.
- [ ] Product Hunt and FOSS directory listings active.
- [ ] Download count surpasses 1,500 portable zip downloads.

#### Phase 4: Sustainable Growth Sign-Off
- [ ] Pull requests submitted to `awesome-telegram` and `awesome-desktop-apps` backed by >300 stars.
- [ ] Reddit Wave 3 (`r/opensource`) launched calling for Linux/macOS packagers.
- [ ] Linux AppImage / Flatpak packaging pull request opened.
- [ ] `react-i18next` internationalization framework merged with public translation platform.
- [ ] Release `v1.0.1` maintenance patch published and verified.
- [ ] GitHub issue templates and Discussions fully operational.
- [ ] 6-Month forward-looking roadmap published for the community.

---

## 5. Architectural Reference & Verification Scripts

To independently verify the operational readiness, character limits, and build commands documented in this roadmap, run the following PowerShell verification harness:

```powershell
<#
.SYNOPSIS
    Guidegram Strategy & Packaging Verification Harness
.DESCRIPTION
    Verifies character limits, build integrity, and file structure for launch readiness.
#>

Write-Host "=== GUIDERAM LAUNCH INTEGRITY AUDIT ===" -ForegroundColor Cyan

# 1. Verify AlternativeTo Short Description Length (< 150 chars)
$shortDesc = "Open-source portable Telegram client with unlimited accounts, isolated per-account proxies, hardware anti-fingerprinting, and group analytics."
$descLen = $shortDesc.Length
Write-Host "`n[1] Checking AlternativeTo Short Description..." -NoNewline
if ($descLen -lt 150) {
    Write-Host " [PASS] ($descLen/150 chars)" -ForegroundColor Green
} else {
    Write-Host " [FAIL] ($descLen/150 chars - exceeds limit)" -ForegroundColor Red
}

# 2. Verify Roadmap Day Count Completeness
$roadmapPath = Join-Path $PSScriptRoot "ROADMAP_AND_OPSEC.md"
if (Test-Path $roadmapPath) {
    $content = Get-Content $roadmapPath -Raw
    $dayMatches = [regex]::Matches($content, "#### Day \d+:")
    Write-Host "[2] Verifying Chronological Days in Roadmap..." -NoNewline
    if ($dayMatches.Count -eq 28) {
        Write-Host " [PASS] (All 28 Days mapped out: Day 1 to Day 28)" -ForegroundColor Green
    } else {
        Write-Host " [FAIL] (Found $($dayMatches.Count)/28 Days)" -ForegroundColor Red
    }
} else {
    Write-Host "[2] ROADMAP_AND_OPSEC.md not found in script directory." -ForegroundColor Yellow
}

# 3. Verify Local Build Command Availability
Write-Host "[3] Checking Local Toolchain Availability..."
$tools = @("pnpm", "node", "git")
foreach ($t in $tools) {
    $found = Get-Command $t -ErrorAction SilentlyContinue
    if ($found) {
        Write-Host "  - $t : Available ($($found.Source))" -ForegroundColor Green
    } else {
        Write-Host "  - $t : NOT FOUND in PATH" -ForegroundColor Yellow
    }
}

Write-Host "`n=== AUDIT COMPLETE ===" -ForegroundColor Cyan
```

---

*Document compiled and verified under Guidegram Strategy Specifications. Strictly adheres to GNU General Public License v3.0.*
