# Security Policy

## Supported Versions

Guidegram is committed to providing rapid security updates and transparent disclosure. Only the latest release on the primary branch is actively maintained with security patches.

| Version | Supported          | Security Maintenance Tier |
|:--------|:-------------------|:--------------------------|
| 1.8.x   | :white_check_mark: | Active GA Support         |
| 1.0.x   | :white_check_mark: | Long-Term Portable Tier   |
| < 1.0.0 | :x:                | Deprecated Alpha/Beta     |

---

## Architectural Security Invariants

Guidegram is built under zero-trust, privacy-first engineering constraints:

1. **Zero Centralized Telemetry**: Guidegram contains zero analytics trackers, error telemetry beacons (e.g., Sentry, Bugsnag), or external telemetry relays. All network requests route strictly to official Telegram MTProto data centers or user-defined proxy endpoints.
2. **Local Data Isolation**: All session credentials, encrypted local SQLite caches, and application configurations are strictly confined to the portable `./data/` root directory. Guidegram leaves zero footprint in the Windows Registry (`HKCU`/`HKLM`) and does not write to `%APPDATA%` without explicit user configuration.
3. **Per-Session Network Isolation**: SOCKS5, HTTP, and MTProto proxy configurations are bound to individual session sockets. Failure or disconnection of a proxy will terminate that session's network pipe without falling back to unencrypted host interfaces.
4. **Hardware Anti-Fingerprinting**: Workstation hardware profiles (Dell XPS, ThinkPad X1 Carbon, MacBook Pro) and Windows build revisions are randomized deterministically per account to prevent Telegram server-side correlation and chain bans.

---

## Reporting a Vulnerability

We take the security of Guidegram and our users' Telegram accounts extremely seriously. If you discover a security vulnerability, please report it responsibly:

### 1. Private Security Advisory (Preferred)
Submit a confidential disclosure through GitHub Security Advisories:
- Navigate to the repository's **Security** tab.
- Click **Report a vulnerability**.
- Provide a detailed description, reproduction steps, and proof-of-concept (PoC).

### 2. Direct Maintainer Communication
If you cannot use GitHub Security Advisories, send an email to:
- **Security Contact**: `security@guidegram.org` (or maintainer direct channel)
- **PGP Encryption**: Encrypt sensitive payloads using the project maintainer's public key (available upon request).

### Response Time & SLAs
- **Initial Acknowledgment**: Within 24 hours of receipt.
- **Triage & Severity Assessment**: Within 48 hours.
- **Patch Development & Release**: Within 7 business days for Critical/High severity issues; within 14 days for Medium/Low severity issues.

---

## Scope & Exclusions

### In Scope
- Memory safety or remote code execution (RCE) in Electron renderer or preload bridge.
- MTProto session credential exposure, key leakage, or improper secret storage in `./data/`.
- Cross-session contamination (e.g., messages or credentials leaking between account contexts).
- Proxy bypass vulnerabilities leading to real IP disclosure.
- Server-Side Request Forgery (SSRF) in link preview or media fetching engines.

### Out of Scope
- Attacks requiring physical access to an unlocked, compromised host machine.
- Theoretical vulnerabilities without demonstrable real-world impact.
- Rate-limiting (FLOOD_WAIT) imposed by official Telegram servers.
- Denial of Service (DoS) requiring massive local CPU exhaustion through user-crafted malicious local databases.

---

## Security Hall of Fame

We gratefully acknowledge security researchers and contributors who responsibly disclose vulnerabilities. Valid findings will be credited in release notes and on our official recognition board.
