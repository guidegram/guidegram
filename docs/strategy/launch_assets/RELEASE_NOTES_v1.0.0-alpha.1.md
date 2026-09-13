# Guidegram v1.0.0-alpha.1 (Portable Preview)

**Release Tag**: `v1.0.0-alpha.1`  
**Target Platform**: Windows 10/11 x64 Portable  
**License**: GNU General Public License v3.0 (GPLv3)  
**Binary Archive**: `Guidegram-v1.0.0-alpha.1-Windows-x64-Portable.zip`

---

## 🚀 Welcome to the Developer Alpha

We are excited to announce the first developer alpha preview of **Guidegram**, an open-source, truly portable desktop client for Telegram built from the ground up with **React 19, TypeScript 5.7, Electron 34, and @mtcute**.

Guidegram is engineered specifically for power users, traders, developers, and community managers who require advanced multi-session workflows without the structural limitations of the official C++/Qt Telegram Desktop (TDesktop).

---

## 🌟 Key Highlights & Architectural Differentiators

### 1. Unlimited Multi-Account Management
- **Zero Account Restrictions**: Eliminates Telegram Desktop’s 3-account ceiling. Run 5, 10, or 20+ accounts concurrently without requiring Telegram Premium subscriptions.
- **Vertical Dock UX**: Permanent 72px left dock with instant keyboard shortcuts (`Ctrl+1..9`) and aggregated unread badges.
- **Fast QR Login**: Link desktop identities in under 3 seconds using the Telegram mobile app (*Settings > Devices > Link Desktop Device*) or phone number with 2FA support.

### 2. Dedicated Per-Account Proxy Isolation
- **No More Global Proxy Contamination**: Assign independent proxies (SOCKS5, HTTP, or MTProxy) to individual accounts.
- **Zero Chain-Bans**: If one proxy endpoint encounters latency or rate limits, other accounts continue running seamlessly on their dedicated network tunnels.
- **Live Latency Ping**: Real-time TCP ping monitor displays roundtrip latency before connecting.

### 3. Hardware Anti-Fingerprinting (28+ Profiles)
- **Authentic Workstation Emulation**: Simulates genuine enterprise hardware profiles (Dell XPS 15, ThinkPad X1 Carbon, MacBook Pro, ASUS ZenBook) with authentic Windows build revisions and UBR numbers.
- **Server-Side Correlation Defense**: Eliminates cross-session hardware telemetry correlation on Telegram Data Centers.

### 4. 100% Truly Portable Architecture
- **Zero Windows Registry Pollution**: Leaves zero keys in `HKCU` or `HKLM`.
- **Localized Data Directory**: All sessions, configurations, and encrypted caches reside inside `./data/` adjacent to the executable. Run Guidegram directly from a USB drive or secondary partition.

### 5. Client-Side Group Activity Intelligence
- **In-Chat Analytics Modal**: Open any group's header to inspect active contributor leaderboards, 24-hour activity heatmaps, and media distribution matrices without needing external bots or admin privileges.

---

## 📦 Binary Verification & Checksums

Always verify the integrity of your downloaded zip archive before extracting:

| Algorithm | Hash |
|:----------|:-----|
| **SHA-256** | `VERIFIED_AT_BUILD_TIME_IN_SHA256SUMS.txt` |
| **SHA-512** | `VERIFIED_AT_BUILD_TIME_IN_SHA512SUMS.txt` |

### PowerShell Verification
```powershell
Get-FileHash -Algorithm SHA256 .\Guidegram-v1.0.0-alpha.1-Windows-x64-Portable.zip
```

---

## ⚠️ Known Alpha Limitations & Feedback

- This preview is packaged exclusively for **Windows 10/11 x64**. macOS and Linux packaging sprints are scheduled for Phase 4.
- Because this is a fresh open-source release without an expensive EV code-signing certificate, Windows SmartScreen may present an *"Unrecognized app"* warning. Click **More info -> Run anyway**.
- Please report any unexpected session dropouts, proxy reconnection glitches, or UI rendering edge cases using our [GitHub Feedback Issue Form](https://github.com/guidegram/guidegram/issues/new?template=feedback.yml).
