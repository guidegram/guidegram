# Guidegram Internationalization (i18n) & Localization Architecture

**Document ID**: `GG-ARCH-I18N`  
**Phase**: Phase 4 (Day 25)  
**Target Languages**: English (Primary en-US), Persian (fa-IR), Spanish (es-ES), Russian (ru-RU), Arabic (ar-SA)  

---

## 1. Architectural Strategy for React 19 / Vite

To maintain zero runtime bloat and instant startup latency, Guidegram employs a decoupled JSON-based dictionary approach:

```
src/
└── locales/
    ├── en-US.json    # Canonical source strings
    ├── fa-IR.json    # Persian translation (with BiDi/RTL support)
    ├── es-ES.json    # Spanish translation
    ├── ru-RU.json    # Russian translation
    └── ar-SA.json    # Arabic translation (with BiDi/RTL support)
```

---

## 2. Key Translation Domain Schemas

```json
{
  "accounts": {
    "add_account": "Add Account",
    "switch_account": "Switch to {name}",
    "unlimited_dock": "Multi-Account Dock",
    "qr_login_title": "Log in to Telegram by QR Code",
    "qr_login_desc": "Open Telegram on your phone, go to Settings > Devices > Link Desktop Device."
  },
  "proxy": {
    "proxy_settings": "Proxy Settings",
    "add_proxy": "Add Proxy",
    "socks5": "SOCKS5 Proxy",
    "http": "HTTP Proxy",
    "mtproto": "MTProto Proxy",
    "test_ping": "Test Ping",
    "latency_ms": "{ms} ms",
    "isolated_tunnel": "Dedicated Tunnel"
  },
  "analytics": {
    "group_stats": "Group Analytics",
    "active_members": "Active Members Leaderboard",
    "activity_heatmap": "24-Hour Activity Heatmap",
    "timeframe_today": "Today",
    "timeframe_yesterday": "Yesterday",
    "timeframe_7d": "Past 7 Days",
    "timeframe_30d": "Past 30 Days"
  },
  "privacy": {
    "hardware_spoofing": "Hardware Profile Spoofing",
    "zero_registry": "Zero Registry Footprint",
    "disable_animations": "Disable Animations (Save RAM)"
  }
}
```

---

## 3. Right-to-Left (RTL) & BiDi Direction Rules

For languages requiring right-to-left layout direction (Persian, Arabic):
- Guidegram sets `dir="rtl"` dynamically on `document.documentElement`.
- Tailwind CSS directional utility classes (`start-`, `end-`, `ps-`, `pe-`) replace legacy `left-` and `right-` positioning.
- The 72px vertical multi-account dock anchors to the physical left edge as a fixed application rail, while conversation text flow adjusts to right-aligned reading direction.

---

## 4. Community Crowdsourcing (Crowdin / Weblate)

1. Connect the GitHub repository `guidegram/guidegram` to a free Open Source project on Crowdin or Weblate.
2. Configure automatic two-way synchronization:
   - When new strings are added to `src/locales/en-US.json` on `main`, Crowdin automatically imports them.
   - When volunteer translators complete translations with >95% approval, Crowdin automatically opens a localized Pull Request to `main`.
