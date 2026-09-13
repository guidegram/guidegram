# Guidegram v1.0.0-alpha.2 (Stability & Hardening Patch)

**Release Tag**: `v1.0.0-alpha.2`  
**Target Platform**: Windows 10/11 x64 Portable  
**License**: GNU General Public License v3.0 (GPLv3)  

---

## 🛠️ Enhancements & Bug Fixes in Alpha 2

Following feedback from our 15-member closed alpha testing cohort, `v1.0.0-alpha.2` introduces rapid hardening improvements and UI refinements:

### Key Improvements:
1. **Visual Proxy Reconnection Indicator**: Added a subtle pulsing indicator next to account avatars on the vertical dock when a proxy tunnel is actively reconnecting or experiencing packet timeout.
2. **Account Switching Tooltips**: Added keyboard shortcut tooltips (`Ctrl+1` through `Ctrl+9`) on hover over account avatars to improve shortcut discoverability.
3. **Group Analytics Memory Caching**: Optimized in-memory message aggregation for supergroups with >10,000 fetched messages, reducing heap allocation by 18% during 24-hour heatmap rendering.
4. **Direct Forward Focus Refinement**: Refined keyboard focus in the `Alt+F` direct forward modal to immediately target the search input upon activation.
5. **Session Lock Guard**: Enhanced single-instance mutex handling to prevent accidental simultaneous launches from separate directories touching the same `./data/` folder.

---

## 📦 Binary Verification

| Algorithm | Hash |
|:----------|:-----|
| **SHA-256** | `VERIFIED_AT_BUILD_TIME_IN_SHA256SUMS.txt` |
| **SHA-512** | `VERIFIED_AT_BUILD_TIME_IN_SHA512SUMS.txt` |
