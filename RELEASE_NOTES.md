# 🚀 Guidegram v1.11.4 — Mobile 2FA Resilience, Smart System Tray & Dynamic What's New

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Dedicated Proxies, Advanced Group Analytics, and Multi-Chain Community Support.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="150" height="150" />
  <h3>Guidegram v1.11.4</h3>
  <p><strong>Mobile 2FA Resilience • Smart System Tray Intercept • Dynamic What's New Experience</strong></p>
</div>

---

## 🌟 Release Highlights

Guidegram v1.11.4 delivers complete resilience for **mobile phone authentication** with two-factor authentication (2FA) cloud hints, overhauls **window lifecycle and system tray minimization** so the application never abruptly terminates when closed, and upgrades the post-update celebration into a **dynamic, version-aware release showcase** with direct links to full release documentation.

---

## 📦 What's New & Enhancements

### 1. 📱 Resilient Phone Authentication & Cloud 2FA Flow
- **Seamless 2FA State Transition**: Fixed an issue where accounts with Two-Step Verification failed to advance to the password entry screen during phone login due to rigid IPC error string matching.
- **Structured 2FA Protocol**: Replaced raw string error throwing with a typed `{ need2fa: true, hint: string }` response payload, guaranteeing that cloud password hints display clearly.
- **Bidirectional Step Navigation**: Added intuitive "Back" buttons in both the SMS verification code step and the 2FA password step, allowing effortless phone number corrections or step reversals.
- **Sanitized Error Messaging**: Implemented an automated message sanitizer that strips verbose internal Electron IPC prefixes, showing friendly, actionable diagnostics for invalid codes, expired sessions, or network timeouts.

### 2. 🪟 Smart System Tray & Close-to-Tray Overhaul
- **Native Close Event Interception**: Added an interceptor on `mainWindow.on('close')` to capture all window termination triggers (including the title bar close button `X`, taskbar thumbnail close, and `Alt+F4`), preventing process destruction and cleanly hiding the window to the System Tray.
- **Explicit Exit Separation**: Cleanly separated background minimization from genuine termination using a dedicated `isQuitting` lifecycle flag, ensuring a full exit only occurs when selected via the tray menu or the confirmation dialog.
- **Instant Auto-Save for Preferences**: Clicking "Minimize", "Quit", or "Ask every time" in Settings immediately persists the preference to disk without requiring manual confirmation.
- **Enhanced Multi-Instance Restoration**: Clicking the desktop or taskbar shortcut while Guidegram is minimized to the tray instantly restores and focuses the active window.

### 3. ✨ Dynamic, Version-Aware What's New Showcase
- **Version-Specific Highlights**: Completely eliminated static legacy cards from the post-update modal. The modal now dynamically evaluates the newly installed version and highlights the exact features and capabilities introduced in that release.
- **GitHub Release Link Integration**: Added a direct link to the official GitHub release notes within the modal, allowing users to inspect the full changelog and technical notes with a single click.

---

## 📝 Full Changelog
https://github.com/guidegram/guidegram/compare/v1.11.3...v1.11.4

---

<div align="center">
  <p>Crafted with precision by <strong>DoctorGuidance</strong> & the <strong>Guidegram Team</strong></p>
</div>
