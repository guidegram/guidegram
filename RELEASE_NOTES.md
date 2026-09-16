# 🚀 Guidegram v1.11.5 — Instant Window Restore, Portable Singleton Stabilization & Startup Parity

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Dedicated Proxies, Advanced Group Analytics, and Multi-Chain Community Support.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="150" height="150" />
  <h3>Guidegram v1.11.5</h3>
  <p><strong>Instant Window Restore • Portable Singleton Stabilization • Taskbar Minimization Parity</strong></p>
</div>

---

## 🌟 Release Highlights

Guidegram v1.11.5 resolves critical startup and lifecycle anomalies. It establishes **strict portable `userData` initialization prior to Chromium singleton locking** (eliminating Windows sharing violation error 32), guarantees **instant window foreground activation** with elevation toggles when launching shortcuts while minimized, preserves **taskbar presence upon minimization**, and permanently eliminates **duplicate IPC registration stalls**.

---

## 📦 What's New & Enhancements

### 1. 🪟 Instant Window Foreground Elevation & Multi-Instance Restoration
- **Foreground Priority Promotion**: Implemented priority window activation (`setAlwaysOnTop` momentary promotion) when a second instance or desktop shortcut is launched. This guarantees the application window breaks through Windows focus-stealing prevention and surfaces immediately above all background windows.
- **Taskbar Minimization Parity**: Adjusted the custom titlebar minimize button (`_`) to minimize directly to the Windows Taskbar rather than hiding completely into the system tray, providing seamless one-click restoration.
- **Dual-Action Tray Handling**: Enhanced the System Tray icon to respond to both single clicks and double clicks with infallible window restoration and focus.

### 2. 🔒 Chromium Portable Singleton Lock Stabilization
- **Lifecycle Ordering Fix**: Configured the portable `userData` directory strictly before requesting the Chromium single-instance application lock. This fixes split-directory lock path resolution and completely eradicates `ERROR_SHARING_VIOLATION (error 32)` across portable sessions.
- **Clean Communication Pipe**: Guaranteed reliable inter-process signaling between new shortcut launches and active background instances.

### 3. 🛡️ Duplicate IPC Prevention & Defensive Startup
- **Eliminated Duplicate Handlers**: Removed redundant `'telegram:send-bot-callback'` handler registration, eliminating unhandled startup rejections and headless process stalls.
- **Defensive Error Boundaries**: Wrapped IPC handler setup with defensive try-catch boundaries, ensuring `createWindow()` and `createTray()` execute reliably under all circumstances.
- **Automated IPC Uniqueness Suite**: Added continuous verification test (`tests/ipc_handlers_verification.mjs`) auditing all 115 IPC channels for complete uniqueness.

---

## 📝 Full Changelog
https://github.com/guidegram/guidegram/compare/v1.11.4...v1.11.5

---

<div align="center">
  <p>Crafted with precision by <strong>DoctorGuidance</strong> & the <strong>Guidegram Team</strong></p>
</div>
