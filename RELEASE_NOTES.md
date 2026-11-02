# 🛡️ Guidegram v2.6.0-rc.3

### 🚀 What's Changed in this Pre-release:
* **Persian/Arabic RTL Typing:** Auto-detects Persian and Arabic text per-keystroke in chat composer, media previews, and forwarding dialogs; resolved CSS inheritance overrides.
* **Minimalist Chat Box (Zero Blue Focus Rectangles):** Completely eradicated Chromium user-agent rectangular blue focus rings (`outline-none`, `ring-0`, `focus-visible:outline-none`) and border highlights for a sleek, distraction-free input area.
* **Chat Context Menu Localization:** Full Persian translations for all chat context menu items (`Open in new window`, `Pin`, `Mute`, `Mark as read`, `Clear history`, etc.) with dynamic BiDi `text-start` alignment.
* **Resilient i18n Fallback Engine:** Hardened translation runtime to seamlessly fallback to human-readable text instead of exposing raw internal keys.
