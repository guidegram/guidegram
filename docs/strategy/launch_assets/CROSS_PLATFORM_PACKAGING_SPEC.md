# Guidegram Cross-Platform Packaging & Distribution Architecture

**Document ID**: `GG-SPEC-PACKAGING`  
**Phase**: Phase 4 (Day 24)  
**Supported Platforms**: Windows x64 Portable (Active), macOS Universal (Target), Linux AppImage / Flatpak (Target)  
**Tooling**: Electron Builder 25, GitHub Actions CI/CD  

---

## 1. Architectural Portability Invariants Across Platforms

To maintain Guidegram’s core value proposition—pure portability with zero host pollution—every platform build must enforce:
1. **Isolated State Directory**: Session files, SQLite caches, and settings must reside inside an explicit `./data/` folder relative to the portable executable on Windows/Linux, or inside an isolated container volume on macOS/Flatpak.
2. **Deterministic Cryptographic Builds**: Every compiled binary artifact must generate SHA-256 and SHA-512 checksums published alongside the release.
3. **No Sentry / No Telemetry**: Absolutely zero proprietary crash-reporting SDKs included in target bundles.

---

## 2. Platform Build Specifications

### 2.1 Windows x64 Portable & NSIS Installer
- **Target**: `win32-x64`
- **Formats**:
  - `dir`: Portable unpacked folder (packaged as `Guidegram-Windows-x64-Portable.zip`)
  - `nsis`: One-click standalone installer (`Guidegram-Setup-x.x.x.exe`)
- **Electron Builder Config (`package.json`)**:
  ```json
  "win": {
    "target": ["nsis", "dir"],
    "icon": "resources/icon.ico",
    "artifactName": "${productName}-${version}-${os}-${arch}.${ext}"
  },
  "nsis": {
    "oneClick": true,
    "perMachine": false,
    "allowToChangeInstallationDirectory": true,
    "deleteAppDataOnUninstall": false
  }
  ```

### 2.2 macOS Universal DMG (Apple Silicon & Intel)
- **Target**: `darwin-universal` (x64 + arm64 lipo slice)
- **Format**: `.dmg` (Drag-to-Applications disk image)
- **Security**: Hardened runtime enabled with entitlements for local audio capture (voice notes) and socket networking.
- **Config**:
  ```json
  "mac": {
    "target": ["dmg"],
    "icon": "resources/icon.icns",
    "category": "public.app-category.social-networking",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "resources/entitlements.mac.plist"
  }
  ```

### 2.3 Linux AppImage & Flatpak
- **Target**: `linux-x64`
- **Format**:
  - `AppImage`: Self-contained portable binary requiring no root permissions.
  - `Flatpak`: Sandboxed desktop packaging for Flathub distribution.
- **Desktop Entry**: Category `Network;InstantMessaging;Chat;`.
- **Config**:
  ```json
  "linux": {
    "target": ["AppImage"],
    "icon": "resources/icon.png",
    "category": "Network"
  }
  ```

---

## 3. Automated Multiplatform CI/CD Pipeline

The cross-platform build is automated via `.github/workflows/build-release.yml` with 3 parallel runners:
- `windows-latest`: Builds NSIS installer and portable ZIP.
- `macos-latest`: Builds universal DMG.
- `ubuntu-latest`: Builds standalone Linux AppImage.
