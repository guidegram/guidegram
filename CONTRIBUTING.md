# Contributing to Guidegram

Thank you for your interest in contributing to Guidegram! Guidegram is an open-source, truly portable desktop client for Telegram built with **React 19, TypeScript, Vite, Electron, and @mtcute**.

---

## 1. Code of Conduct & Core Philosophy

Guidegram is engineered under strict privacy, portability, and performance constraints:
- **Zero Telemetry**: We do not accept PRs that introduce third-party analytics, crash trackers, or telemetry beacons.
- **Pure Portability**: All application state must remain localized within `./data/`. Avoid any Windows registry modification or non-standard `%APPDATA%` writes.
- **English-Only Engineering**: All code, comments, commit messages, PR titles, and issue discussions must be written exclusively in standard professional English.

---

## 2. Development Setup

### Prerequisites
- **Node.js**: >= 20.18.0 LTS
- **pnpm**: >= 9.0.0 (`npm install -g pnpm`)
- **Operating System**: Windows 10/11 x64 (Primary), Linux/macOS (Community Preview)

### Quick Start
```bash
# 1. Clone the repository
git clone https://github.com/guidegram/guidegram.git
cd guidegram

# 2. Install dependencies (enforces strict engine checking)
pnpm install

# 3. Start local development environment with hot-reload
pnpm dev
```

### Build Commands
```bash
# Type check and build web assets
pnpm run build

# Build standalone portable Windows x64 binary
pnpm run build:portable
```

---

## 3. Architecture Overview

```
Guidegram/
├── electron/                   # Electron Main & Preload Process
│   ├── main.ts                 # Application lifecycle & IPC handlers
│   ├── preload.ts              # ContextBridge API exposure
│   └── telegram/               # Core MTProto Client & Session Architecture
│       ├── accountManager.ts   # Multi-account session management (@mtcute)
│       ├── proxyManager.ts     # Per-session SOCKS5/HTTP/MTProto network tunnels
│       ├── deviceProfileManager.ts # 28+ Workstation hardware anti-fingerprinting
│       ├── storage.ts          # Encrypted local storage & configuration
│       └── types.ts            # Canonical data types & IPC interfaces
├── src/                        # React 19 Frontend Renderer
│   ├── components/             # Reusable UI & Modals (GroupStatsModal, ProxyManager, etc.)
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # Frontend ambient declarations (telegram.d.ts)
│   ├── App.tsx                 # Main layout & account dock
│   └── index.css               # Tailwind CSS & design tokens
├── scripts/                    # Verification & packaging automation
└── docs/strategy/              # Launch collateral & strategic playbooks
```

---

## 4. Engineering & TypeScript Standards

1. **Strict Type Safety**:
   - `noImplicitAny` and strict null checks are strictly enforced. Avoid using `any`; define explicit interfaces in `electron/telegram/types.ts` or `src/types/telegram.d.ts`.
2. **Deterministic Verification**:
   - Always run `pnpm exec tsc --noEmit` before committing.
   - Run verification scripts in `scripts/` to validate hardware profile randomization and proxy isolation.
3. **Structured Logging**:
   - Use the internal `Logger` utility (`Logger.info`, `Logger.warn`, `Logger.error`) with structured error details. Never commit raw `console.log` statements in production logic.
4. **Surgical Edits**:
   - Keep Pull Requests focused on a single feature or bug fix. Avoid cosmetic reformatting of unrelated files.

---

## 5. Pull Request Workflow

1. Fork the repository and create a feature branch:
   ```bash
   git checkout -b feat/custom-emoji-picker
   # or
   git checkout -b fix/proxy-timeout-reconnect
   ```
2. Make targeted, clean changes with clear commit messages following Conventional Commits format:
   - `feat(accounts): add quick shortcut for 5th account`
   - `fix(proxy): handle reconnect jitter on network resume`
3. Verify that the build and type checking pass:
   ```bash
   pnpm exec tsc --noEmit
   ```
4. Push your branch to your fork and submit a Pull Request to `main`.
5. Clearly describe the problem, the solution, and verification steps in your PR description.

---

## 6. Licensing

By contributing to Guidegram, you agree that your contributions will be licensed under the **GNU General Public License v3.0 (GPLv3)**.
