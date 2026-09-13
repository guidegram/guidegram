# Guidegram v1.0.0 (General Availability — GA Release)

**Release Tag**: `v1.0.0`  
**Target Platform**: Windows 10/11 x64 Portable | Cross-Platform Ready  
**License**: GNU General Public License v3.0 (GPLv3)  

---

## 🚀 Welcome to Guidegram v1.0.0 General Availability

Today marks the official General Availability release of **Guidegram**, the open-source, truly portable desktop client for Telegram built with **React 19, TypeScript 5.7, Electron 34, and @mtcute**.

Guidegram eliminates the hardcoded 3-account limit of the official desktop client and introduces dedicated network isolation, hardware anti-fingerprinting, and client-side conversation intelligence for power users worldwide.

---

## 🌟 Core Feature Summary

### 1. Unlimited Multi-Account Architecture
- Run unlimited concurrent Telegram identities (5, 20, 50+) with zero Premium fees.
- Permanent 72px left dock with rapid `Ctrl+1..9` hotkey switching.
- Aggregated cross-account unread badge counters.
- 3-second QR code login or international phone number authentication with full 2FA support.

### 2. Dedicated Per-Account Proxy Isolation
- Assign independent SOCKS5, HTTP, or MTProxy configurations per account.
- Eliminates global proxy contamination and chain bans across multiple accounts.
- Integrated TCP ping latency tester displays real-time socket health.

### 3. Workstation Hardware Anti-Fingerprinting
- Deterministically generates 28+ authentic workstation profiles (Dell XPS, ThinkPad X1 Carbon, MacBook Pro, ASUS ZenBook).
- Randomizes Windows 10/11 build numbers and UBR revisions to prevent server-side device correlation.

### 4. 100% Truly Portable Filesystem
- Zero Windows registry pollution (`HKCU`/`HKLM`).
- All configurations, session tokens, and encrypted local SQLite databases remain inside `./data/`.
- Transfer your entire multi-account setup simply by moving the folder.

### 5. Client-Side Group Activity Analytics
- Real-time active member leaderboards and percentage contribution metrics.
- 24-hour hourly activity heatmap identifying peak conversation velocity.
- Media and message composition matrix (text, photos, videos, voice notes, stickers) without external bots.

### 6. 64gram Power Features
- Direct message forwarding without sender attribution (`Alt+F`).
- Always delete for everyone toggle.
- Full custom emoji rendering and animated sticker playback.
- Disable animations toggle reducing memory footprint by ~25%.

---

## 📦 Download & Verification

| Asset | Platform | Architecture | Hash Verification |
|:------|:---------|:-------------|:------------------|
| `Guidegram-v1.0.0-Windows-x64-Portable.zip` | Windows 10/11 | x64 Portable | `release/SHA256SUMS.txt` |
| `Guidegram-Setup-1.0.0.exe` | Windows 10/11 | x64 Installer | `release/SHA256SUMS.txt` |

### Checksum Verification
```powershell
Get-FileHash -Algorithm SHA256 .\Guidegram-v1.0.0-Windows-x64-Portable.zip
```
