# Guidegram Closed Alpha Tester Onboarding & Verification Guide

**Cohort Size**: 15 Selected Telegram Power Users, Community Managers & Bot Developers  
**Phase**: Phase 2 (Days 8 to 14)  
**Target Build**: `v1.0.0-alpha.1` Portable  

---

## 🎯 Purpose of Closed Alpha Testing

You have been invited to participate in the private developer alpha of **Guidegram**. Our goal during this 7-day testing window is to rigorously validate multi-account density, per-session proxy encapsulation, and memory efficiency under heavy real-world workloads before public launch.

---

## 📋 Recommended Test Scenarios

### Scenario 1: Multi-Account Density & Fast Switching
1. Link **3 to 10 distinct Telegram accounts** using QR code authentication (`Ctrl+N` or Add Account button).
2. Switch between accounts rapidly using `Ctrl+1`, `Ctrl+2`, ..., `Ctrl+9`.
3. **Verify**: Does switching feel instantaneous (< 50ms)? Do unread badges reflect the correct counts across all active profiles?

### Scenario 2: Dedicated Proxy Isolation & Disconnect Behavior
1. In Preferences (`Ctrl+,`), open the **Proxy Manager**.
2. Add at least two distinct proxy servers (SOCKS5 or HTTP).
3. Assign **Proxy A** to Account 1 and **Proxy B** to Account 2. Leave Account 3 on Direct Connection.
4. Run the in-app **Latency Ping Tester** and verify response times.
5. Intentionally disconnect Proxy A (e.g. stop proxy server or use invalid credentials):
   - **Verify**: Does Account 1 show disconnected status gracefully without freezing the app?
   - **Verify**: Do Accounts 2 and 3 remain fully connected without dropping?

### Scenario 3: Memory Footprint & Resource Scaling
1. Open Windows Task Manager (`Ctrl+Shift+Esc`).
2. Locate `Guidegram.exe` process group with 5+ active accounts loaded.
3. Toggle `Disable Animations` in Preferences (`64gram Power Features`).
4. **Target**: Total memory usage should remain below **350MB–450MB** even under multi-account operation.

### Scenario 4: In-Chat Group Analytics Modal
1. Open any public group chat with >500 members.
2. Click the `BarChart3` analytics icon in the group header.
3. Switch timeframes from **Today** to **Yesterday** and **Past 7 Days**.
4. **Verify**: Does the 24-hour activity heatmap render smoothly? Does the member leaderboard accurately rank active chatters?

---

## 🐛 How to Submit Alpha Feedback

Please log any bugs, quirks, or suggestions directly to our private feedback tracker:
- **GitHub Issue Form**: [Submit Feedback](https://github.com/guidegram/guidegram/issues/new?template=feedback.yml)
- **Direct Discussion Channel**: `t.me/guidegram_chat` (Private Alpha Topic)

When reporting issues, please include:
1. Number of accounts connected.
2. Proxy types in use (SOCKS5, HTTP, Direct).
3. Windows version (e.g., Windows 11 Build 22631).
4. Sanitized logs from `./data/logs/guidegram.log` (if applicable).
