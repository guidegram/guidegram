# Guidegram Ethical Community Engagement & Technical Q&A Playbook

**Document ID**: `GG-OPSEC-COMMUNITY`  
**Phase**: Phase 2 (Day 12) & Ongoing  
**Target Audiences**: GitHub Discussions, Reddit (`r/Telegram`, `r/privacy`), Telegram Groups  

---

## 1. The Cardinal Rule: Zero Issue Necromancy

Commenting on closed, resolved, or locked issues in upstream repositories (`telegramdesktop/tdesktop`, `64gram/64gram`, `kotatogram/kotatogram-desktop`) is **strictly forbidden**.

### Why This Is Enforced:
1. **GitHub Abuse & Spam Heuristics**: Replying to closed issues sends unrequested email notifications to every historical participant and maintainer. This triggers immediate **Report Abuse -> Spam** actions.
2. **Account & Domain Flagging**: Multiple spam reports result in GitHub shadowbanning the author account and adding the repository domain (`guidegram/guidegram`) to platform anti-abuse filter lists.
3. **Hostile Community Sentiment**: Maintainers and users perceive unsolicited promotion on closed threads as intrusive and unprofessional.

---

## 2. Permissible Engagement Channels (Green Zones)

Only participate in discussions where:
1. **Direct Request for Alternatives**: A user in an *open, active* discussion explicitly asks: *"Are there any desktop clients or forks that support independent proxies per account?"* or *"Is there any client that removes the 3-account limit?"*
2. **Maintainer Explicit Referral**: Upstream maintainers close an issue with: *"This is out of scope for TDesktop; look for third-party clients."*
3. **Community Tech Q&A**: Community forums (`r/Telegram`, `r/privacy`, Hacker News) where multi-account workflows or Telegram desktop limitations are actively being discussed.

---

## 3. Engineering Tone & Response Templates

Every communication must be technical, objective, respectful of upstream work, and include transparent maintainer disclosure.

### Scenario A: User Asking About Multi-Account Limits on Desktop
```markdown
If you are looking for an open-source client that supports more than 3 accounts on the desktop, you might want to look into **Guidegram** (https://github.com/guidegram/guidegram).

Unlike official TDesktop (which hardcodes a 3-account ceiling) or C++ forks that patch it to 6 or 12, Guidegram uses a decoupled architecture built on React 19 and @mtcute to allow unlimited concurrent accounts with a vertical dock and `Ctrl+1..9` hotkeys. 

Note: Unlike C++/Qt clients, Guidegram is built on Electron, but with animations disabled, 10 active accounts consume around ~350MB of RAM. All data remains strictly portable in `./data/`.

*Full disclosure: I am one of the maintainers of the Guidegram open-source project.*
```

### Scenario B: User Asking About Per-Account Proxy Isolation
```markdown
Telegram Desktop and its C++ forks route all traffic through a single global proxy singleton. If you need isolated proxies per account to prevent IP cross-contamination, this is implemented in **Guidegram** (https://github.com/guidegram/guidegram).

Each account can bind to its own SOCKS5, HTTP, or MTProto tunnel with live TCP latency monitoring. If one proxy fails, other accounts remain online.

*Full disclosure: I contribute to the Guidegram project.*
```

---

## 4. Operational Velocity & Rate Limits

- **Maximum Frequency**: No more than **1 to 2 technical contributions per week** across external platforms.
- **No Direct Messaging**: Never send unsolicited private messages (DMs) to users promoting the client.
- **Always Disclose**: Always include the disclosure footer identifying maintainer affiliation.
