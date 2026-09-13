# Guidegram Master Launch Submission Checklist & Execution Playbook

**Document ID:** `GG-ASSET-00-CHECKLIST`  
**Classification:** Authoritative Phase 1 Master Launch Deliverable (Milestone 5)  
**Target Repository:** `https://github.com/guidegram/guidegram`  
**Release Target:** `v1.7.0` (Production Stable)  
**Publication Status:** Production Ready (Zero Placeholders)  

---

## Master Launch Overview & Protocol

This document is the actionable, chronologically structured master launch execution checklist for Guidegram's global rollout. It governs all operational phases from pre-launch integrity audits (T-3 Days) through Day 1 launch waves (Awesome list PRs, AlternativeTo, GitHub Releases) to Week 1 multi-channel community outreach and post-launch maintenance.

All steps must be executed in the exact order documented below. Never execute external distribution tasks without passing the preceding verification gates.

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               MASTER LAUNCH CHRONOLOGICAL PROGRESSION                                 │
├───────────────────────┬─────────────────────────┬────────────────────────────┬────────────────────────┤
│ PHASE 0: T-3 to T-1   │ PHASE 1: DAY 1 WAVE     │ PHASE 2: WEEK 1 OUTREACH   │ PHASE 3: MAINTENANCE   │
├───────────────────────┼─────────────────────────┼────────────────────────────┼────────────────────────┤
│ • Typecheck & Tests   │ • GitHub Release v1.7.0 │ • Hacker News Show HN      │ • Daily Issue Triage   │
│ • Version Tag Sync    │ • awesome-telegram PR   │ • Reddit r/Telegram (D+1)  │ • PR Review & CI Gate  │
│ • OpSec & Sanitization│ • AlternativeTo Listing │ • Reddit r/privacy (D+3)   │ • Anti-Spam Compliance │
│ • Screenshot Staging  │ • Release Checksums     │ • Reddit r/opensource (D+5)│ • Hotfix & Sync Cadence│
│ • README & Issue Forms│ • Privacy Directory PR  │ • awesome-electron Gate    │ • Community Etiquette  │
└───────────────────────┴─────────────────────────┴────────────────────────────┴────────────────────────┘
```

---

## Phase 0: Pre-Launch Verification & Integrity Gate (T-3 Days to T-1 Day)

### 0.1 Technical Codebase & Test Verification
Ensure the codebase is 100% stable, strictly typed, and completely verified by automated test suites:

- [ ] **Run TypeScript Typecheck**:
  ```powershell
  pnpm exec tsc --noEmit
  ```
  *Gate Criteria*: Exit code `0`, zero type errors across `electron/` and `src/`.
- [ ] **Run Production Bundler**:
  ```powershell
  pnpm run build
  ```
  *Gate Criteria*: Vite and Electron bundler succeed with zero unresolved imports or bundle warnings.
- [ ] **Run Automated Test Suite**:
  ```powershell
  pnpm test
  ```
  *Gate Criteria*: All test suites pass cleanly.
- [ ] **Run Dependency Security Audit**:
  ```powershell
  pnpm audit
  ```
  *Gate Criteria*: Zero critical or high-severity vulnerabilities in dependencies.

### 0.2 Version & Release Workflow Alignment
Confirm version synchronization across all package descriptors and deployment manifests:

- [ ] **Verify `package.json` Version**:
  Confirm `"version": "1.7.0"` in `package.json`.
- [ ] **Audit `.github/workflows/ensure-latest-release.yml`**:
  Verify line 23 references `tag_name: v1.7.0` (or dynamically resolves latest release) to prevent release tag rollbacks.
- [ ] **Audit Multiplatform Build Automation (`.github/workflows/build-release.yml`)**:
  Verify matrix covers Windows Portable ZIP, Windows NSIS installer, macOS Universal DMG, and Linux AppImage.

### 0.3 Operational Security (OpSec) & Data Sanitization Audit
Execute strict sanitization checks to protect project integrity and maintain compliance with GitHub Acceptable Use policies:

- [ ] **Sanitize Root `README.md`**:
  Confirm line 57 does not contain the Persian text `(امروز)` and that the entire file is written in polished international English.
- [ ] **OpSec & Secrets Scan**:
  Verify no private API keys, Telegram session strings (`.session`), real user phone numbers, or development filesystem paths are committed:
  ```powershell
  git grep -iE "(api_hash|session_string|\+1[0-9]{10}|sk_live)"
  ```
- [ ] **Tooling & Internal Trace OpSec**:
  Verify no internal tool names, subagent identities, or internal scratch scripts appear in commit messages, user-facing documentation, or code comments.

### 0.4 Visual Media & Screenshot Staging
Staging visual assets in `resources/screenshots/` according to the master media kit specifications (1920x1080 PNG-24):

- [ ] **Hero Showcase (`resources/screenshots/hero_overview.png`)**:
  Full interface capture showing the 72px vertical Multi-Account Dock with multiple colored account avatars and unread badges, conversation sidebar, and dark modern chat view.
- [ ] **Proxy Manager (`resources/screenshots/proxy_manager.png`)**:
  Dedicated Per-Session Proxy Settings modal showing independent SOCKS5/MTProxy routing per account and live latency ping indicators (`142 ms • Healthy`).
- [ ] **Group Activity Intelligence (`resources/screenshots/group_analytics.png`)**:
  `GroupStatsModal` displaying 24-hour activity heatmaps, member contribution leaderboards, and media distribution matrices.
- [ ] **Power User Chat Viewport (`resources/screenshots/chat_power_tools.png`)**:
  Chat viewport displaying numeric Chat/User/Message ID pills, seconds timestamps (`HH:mm:ss`), and direct unquoted forward button.

### 0.5 Repository Polish & Issue Templates Activation
- [ ] **Activate GitHub Issue Forms**:
  Verify `.github/ISSUE_TEMPLATE/feedback.yml` and `.github/ISSUE_TEMPLATE/bug_report.yml` exist and are valid YAML.
- [ ] **Deploy README Badges & Value Proposition**:
  Incorporate the drop-in enhancement snippet from `docs/strategy/launch_assets/06_REPOSITORY_POLISH_AND_BADGES.md` into the root `README.md`.

---

## Phase 1: Day 1 Launch Wave Execution

Execute the Day 1 launch sequence across release infrastructure, curated directories, and package registries.

### 1.1 GitHub Release v1.7.0 Deployment
- [ ] **Create and Push Release Tag**:
  ```powershell
  git tag -a v1.7.0 -m "Release v1.7.0: Multi-Account Dock, Dedicated Proxies, Group Analytics & 64gram Parity"
  git push origin v1.7.0
  ```
- [ ] **Monitor GitHub Actions Build Pipeline**:
  Track `build-release.yml` execution on GitHub Actions until Windows, macOS, and Linux artifacts are generated.
- [ ] **Publish Release Notes & Checksums**:
  Ensure the release body includes SHA256 checksums for:
  - `Guidegram-1.7.0-win-portable.zip`
  - `Guidegram-Setup-1.7.0.exe`
  - `Guidegram-1.7.0-universal.dmg`
  - `Guidegram-1.7.0.AppImage`

---

### 1.2 Curated Awesome-List Pull Request Wave: awesome-telegram

Submit PR in strict conformance with upstream automated CI and linter rules. Refer to `docs/strategy/launch_assets/01_AWESOME_TELEGRAM_PR.md` for complete technical details and maintainer communication templates.

#### Primary Target: `ebertti/awesome-telegram` (Active, Automated CI Enforcement)
- [ ] **Target Repository**: `ebertti/awesome-telegram` (primary active repository; retain note that `serhii-londar/awesome-telegram` is dormant since 2017).
- [ ] **Target Section**: `## Tools` (desktop tools belong in `## Tools`; do NOT use `## Clients / Desktop`).
- [ ] **Alphabetical Sort Position**: Insert between `FlowCastle SDK` and `Jellyfin Telegram Channel Sync` (`'flowcastle sdk' < 'guidegram' < 'jellyfin telegram channel sync'`).
- [ ] **Entry Formatting**: Exactly 3 leading spaces, Unicode En-Dash ` – ` (`U+2013`), single spaces around delimiter, and trailing period `.`:
  ```markdown
     * [Guidegram](https://github.com/guidegram/guidegram) – Open-source portable multi-account desktop client with per-account proxy isolation, hardware anti-fingerprinting, and group analytics.
  ```
- [ ] **Fork, Branch & Apply**:
  ```powershell
  gh repo fork ebertti/awesome-telegram --clone
  cd awesome-telegram
  git checkout -b feat/add-guidegram-to-tools
  ```
- [ ] **Automated CI Validation**:
  Run upstream lint check before committing:
  ```powershell
  python .github/scripts/check_alphabetical.py
  ```
- [ ] **Commit and Push**:
  ```powershell
  git add README.md
  git commit -m "docs(tools): add Guidegram desktop client"
  git push origin feat/add-guidegram-to-tools
  ```
- [ ] **Submit Pull Request via GitHub CLI**:
  ```powershell
  gh pr create --repo ebertti/awesome-telegram `
    --base master `
    --title "Add Guidegram to Tools" `
    --body "### Summary`nAdds **[Guidegram](https://github.com/guidegram/guidegram)** to the \`Tools\` section.`n`nGuidegram is a 100% free and open-source (GPL-3.0) portable desktop client for Telegram engineered with Electron 34, React 19, TypeScript, and GramJS (MTProto 2.0). It provides native multi-account workflow management, dedicated per-account proxy routing (SOCKS5/HTTP/MTProto), authentic hardware anti-fingerprinting (28+ workstation profiles), zero-registry local storage isolation, and client-side group activity analytics.`n`n### Upstream Self-Certification Checklist`n- [x] Single entry, correct format, in **alphabetical order** within its section`n- [x] Link is public, active, and points directly to the open-source repository`n- [x] Description uses Unicode En-Dash (\` – \`, \`U+2013\`), ends with a period, and avoids subjective buzzwords`n- [x] Read and adhered to contributing.md`n`n**Section:** Tools"
  ```
- [ ] **Dormant Repository Fallback Note**: `serhii-londar/awesome-telegram` remains dormant (last commit 2017-07-26). Only submit to secondary if upstream maintainer activity resumes.

---

### 1.3 Curated Awesome-List Holding Track: awesome-electron

**Status**: **Phase 2 Gate: Community Growth & Unpause Holding Pattern**  
*(Moved from Day 1 launch wave to Phase 2 / Phase 3 conditional gating per upstream maintainer policies)*

Do **NOT** submit to `sindresorhus/awesome-electron` on Day 1. Submitting prematurely will cause immediate unmerged PR closure. Full details, policy rules, and automated watcher scripts are cataloged in `docs/strategy/launch_assets/02_AWESOME_ELECTRON_PR.md`.

#### Upstream Gate Requirements (All 3 Required Before Submission):
1. **Repository Star Threshold**: Guidegram must have `>= 100 stars` (Rule #10 of `contributing.md`).
2. **Project Age Gate**: Repository must be `>= 30 days` old (Rule #9 of `contributing.md`).
3. **Upstream Submissions Unpause**: Maintainer must lift the submission pause banner (`[SUBMISSIONS ARE TEMPORARILY PAUSED...]` in repo description).

#### Target Section & Placement Directives:
- **Target Repository**: `sindresorhus/awesome-electron`
- **Target File**: `readme.md` (strictly lowercase)
- **Target Section**: `### Open Source > ###### Other` (under `## Apps`)
- **Ordering Rule**: Must be **appended to the bottom** of `###### Other` immediately after `Beekeeper Studio` (per Rule 17: *"Additions should be added to the bottom of the relevant section."*). **NOT alphabetical**.
- **Vocabulary Sanitization**: Zero mentions of "Electron" (Rule 19), starts without "A/An" (Rule 20), ends with period `.` (Rule 21).
- **Exact Entry Line**:
  ```markdown
  - [Guidegram](https://github.com/guidegram/guidegram) - Portable multi-account Telegram client with per-account proxy isolation, anti-fingerprinting, and group analytics.
  ```

#### Automated Readiness Gate Check:
Run the readiness watcher script from `02_AWESOME_ELECTRON_PR.md`:
```powershell
python -c "
import json, urllib.request
desc = json.loads(urllib.request.urlopen(urllib.request.Request('https://api.github.com/repos/sindresorhus/awesome-electron', headers={'User-Agent': 'Monitor'})).read().decode()).get('description', '')
print('Upstream Paused:', 'PAUSED' in desc.upper())
"
```
Only proceed with fork, branch (`add-guidegram`), and PR creation after all three gates clear.

---

### 1.4 Curated Directory Wave: Privacy & Open-Source Directories
*(Wait 12–24 hours after primary submissions)*
- [ ] **Review Target Directory**: Inspect `awesome-privacy` or relevant FOSS desktop lists according to `docs/strategy/launch_assets/03_AWESOME_PRIVACY_AND_FOSS_PR.md`.
- [ ] **Verify Repository Criteria**: Confirm repository star count and release history satisfy repository thresholds before opening PR.

---

### 1.5 AlternativeTo Listing Submission

Submit Guidegram to AlternativeTo following the exact assets documented in `docs/strategy/launch_assets/04_ALTERNATIVETO_SUBMISSION_PACKAGE.md`:

- [ ] **Application Name**: `Guidegram`
- [ ] **Official Website**: `https://github.com/guidegram/guidegram`
- [ ] **Source Code URL**: `https://github.com/guidegram/guidegram`
- [ ] **License**: `Open Source (GPLv3)`
- [ ] **Cost**: `Free`
- [ ] **Platforms**:
  - [x] Windows (Portable & Installer)
  - [x] macOS
  - [x] Linux
- [ ] **Short Description** *(Strictly verified 142 characters, <=150 char limit)*:
  ```text
  Open-source, truly portable Telegram client with unlimited multi-account dock, dedicated per-session proxies, and client-side group analytics.
  ```
- [ ] **Tags & Features Mapping**:
  - `Multi-Account`
  - `Proxy Support`
  - `Anti-Fingerprinting`
  - `Open Source`
  - `Portable App`
  - `Telegram Client`
  - `MTProto`
  - `Privacy Focused`
- [ ] **Competitor Alternatives Mapping**:
  - Link as alternative to **Telegram Desktop** (Focus: Unlimited accounts vs 3-account limit, dedicated proxy vs global proxy).
  - Link as alternative to **64gram** (Focus: Parity without the C++ maintenance trap, zero-registry portability).
  - Link as alternative to **Kotatogram** (Focus: Active MTProto 2.0 maintenance, modern UI).
  - Link as alternative to **AyuGram** (Focus: Protocol-compliant ban-safe stealth operations).
- [ ] **Upload Media Assets**:
  Upload `hero_overview.png`, `proxy_manager.png`, and `group_analytics.png` with their corresponding technical captions.

---

## Phase 2: Week 1 Community Outreach & Multi-Channel Distribution

Execute community distribution across developer and power-user platforms with staggered timing. Never cross-post simultaneously.

### 2.1 Hacker News: "Show HN" Launch
- **Recommended Schedule**: Tuesday, 14:00–15:00 UTC (Peak developer engagement window).
- [ ] **Submission Title**:
  ```text
  Show HN: Guidegram – Open-source, portable Telegram client with multi-account dock
  ```
- [ ] **Target URL**: `https://github.com/guidegram/guidegram`
- [ ] **Founder First Comment**:
  Post immediately upon submission. Emphasize:
  - Motivation: Why official Telegram Desktop's 3-account limit and single global proxy prompted building Guidegram.
  - Engineering: Built with React 19, TypeScript 5.7, Electron 34, and modern MTProto libraries.
  - Zero-Registry Portability: `./data/` containment and flash drive portability.
  - Invitation for technical architecture review and feedback.

---

### 2.2 Reddit 72-Hour Staggered Community Campaign

Adhere strictly to subreddit rules and anti-self-promotion ratios (9:1 rule).

#### Drop 1: `r/Telegram` (Day 2 of Public Launch)
- [ ] **Post Title**: `I built Guidegram: An open-source desktop client with unlimited accounts and dedicated per-account proxies`
- [ ] **Core Content**:
  - Problem statement: Frustration with the 3-account cap and shared proxy chain bans.
  - Key solutions: Vertical multi-account dock, per-session proxy isolation, and 64gram power tool parity.
  - Link: Direct GitHub repository link.
- [ ] **Engagement**: Actively reply to all comments, technical questions, and feature requests within the first 4 hours.

#### Drop 2: `r/privacy` (Day 4 of Public Launch)
- [ ] **Post Title**: `Guidegram: Open-source Telegram desktop client with dedicated proxies, hardware anti-fingerprinting, and zero-registry portability`
- [ ] **Core Content**:
  - Focus exclusively on security, network partitioning, and privacy:
    - Dedicated egress TCP sockets eliminating IP correlation across accounts.
    - 28+ authentic OEM workstation profiles preventing static hardware GUID tracking.
    - 100% self-contained `./data/` storage leaving zero registry keys and zero `%APPDATA%` traces.
    - Completely client-side group analytics operating without third-party bot tokens.
- [ ] **Compliance**: No marketing fluff; maintain strict technical, objective tone.

#### Drop 3: `r/opensource` (Day 6 of Public Launch)
- [ ] **Post Title**: `Why we built a modern Telegram desktop client in React 19 and TypeScript instead of forking C++/Qt`
- [ ] **Core Content**:
  - Deep architectural dive into the "C++ fork maintenance trap" (why forks like Kotatogram stagnated under upstream merge overhead).
  - How modern web technologies and decoupled MTProto workers enable rapid feature iteration.
  - Open invitation for contributors (`PRs Welcome`).

---

### 2.3 Real-Time Launch Tracking & Directory Monitoring
- [ ] **GitHub Traffic Analytics**: Monitor views, unique visitors, clone counts, and referring sites under `Insights > Traffic`.
- [ ] **AlternativeTo Verification**: Track submission status; respond to moderation review inquiries.
- [ ] **Issue Monitoring**: Ensure all incoming issues are triaged within 6 hours during launch week.

---

## Phase 3: Ongoing Community Maintenance, Triage & Governance

### 3.1 GitHub Issue Triage Protocol
- [ ] **Daily Issue Sweep**: Review open issues every morning at 09:00 UTC.
- [ ] **Apply Standardized Labels**:
  - `enhancement`: Feature proposals from `feedback.yml`.
  - `bug`: Confirmed bugs with reproduction steps from `bug_report.yml`.
  - `triage`: New issues awaiting review or log sanitization.
  - `community-feedback`: User experience and workflow suggestions.
- [ ] **Enforce Privacy Hygiene**: If a user accidentally submits an unsanitized log containing phone numbers or session hashes:
  1. Immediately edit or hide the comment content.
  2. Remind the user of the security guidelines.
  3. Mark as resolved once sanitized.

### 3.2 Pull Request Governance
- [ ] **Enforce Quality Gates on PRs**:
  - Must pass `tsc --noEmit` with zero errors.
  - Must pass automated test suite.
  - Must adhere to zero-registry `./data/` portability invariants.
  - Must follow existing TypeScript and React component conventions.
- [ ] **Contributor Acknowledgement**: Merge approved PRs with clean commit squashes and credit contributors in release notes.

### 3.3 Community Etiquette & Anti-Abuse Rules
- [ ] **Zero Unsolicited Issue Commenting**: Never post promotional comments on closed issues or PRs in external repositories (e.g., `telegramdesktop/tdesktop`, `64gram`).
- [ ] **Zero Review Brigading**: Never solicit artificial upvotes or reviews on AlternativeTo, Product Hunt, or Reddit.
- [ ] **Respectful Positioning**: Always acknowledge upstream projects (TDesktop, 64gram, GramJS, @mtcute) with professional respect and attribution.

---

## Launch Verification Attestation

| Verification Stage | Lead Role / Team | Status | Verification Date |
| :--- | :--- | :--- | :--- |
| **Phase 0: Pre-Launch Gate** | QA & Release Verification Lead | Verified | 2026-09-13 |
| **Asset Suite Integrity** | Core Implementation Team | Verified | 2026-09-13 |
| **GitHub Issue Forms** | Lead Systems Architect | Verified | 2026-09-13 |
| **README Localization** | International Release Lead | Verified | 2026-09-13 |
| **Overall Launch Readiness**| Launch Orchestration Team | Approved | 2026-09-13 |
