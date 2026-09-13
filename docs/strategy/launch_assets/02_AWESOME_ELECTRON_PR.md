# Turnkey GitHub PR Submission Package: Awesome Electron

**Target Repository**: `sindresorhus/awesome-electron`  
**Repository URL**: `https://github.com/sindresorhus/awesome-electron`  
**Default Branch**: `main`  
**Target File**: `readme.md` (Note: strictly lowercase filename per upstream repository)  
**Package Version**: 1.0.0  
**Target Product**: Guidegram (`https://github.com/guidegram/guidegram`)  
**License**: GNU General Public License v3.0 (GPL-3.0)  
**Execution Timing**: Phase 3 (Triggered upon reaching 100 stars, 30 days repository age, and upstream maintainer lifting submission pause)

---

## 1. Upstream Gate Analysis & Unpause Trigger Strategy

The `sindresorhus/awesome-electron` list is curated under exceptionally rigorous gatekeeping standards. Submitting without satisfying all gate conditions results in immediate, unmerged PR closure.

### 1.1 Gate Condition Analysis

```
+--------------------------------+---------------------------------------+----------------------------------+
| Gate Dimension                 | Upstream Mandate Rule                 | Guidegram Compliance Status      |
+--------------------------------+---------------------------------------+----------------------------------+
| 1. 100-Star Threshold          | "The project repo should have at      | Staged until public repository   |
|                                | least 100 stars" (contributing.md #10)| clears 100 GitHub stars.         |
+--------------------------------+---------------------------------------+----------------------------------+
| 2. 30-Day Project Age          | "Wait at least 30 days before         | Project inception tracked; PR    |
|                                | submitting" (contributing.md #9)      | scheduled >= 30 days post-birth. |
+--------------------------------+---------------------------------------+----------------------------------+
| 3. Submission Pause Status     | Active banner: "[SUBMISSIONS ARE      | Monitored via API watcher. PR    |
|                                | TEMPORARILY PAUSED...]"               | #771 closed unmerged; no PRs now.|
+--------------------------------+---------------------------------------+----------------------------------+
| 4. Repository Polish           | English README, in-repo screenshot,   | 100% verified: English README,   |
|                                | and precompiled binary (rule #13)     | screenshots, Windows x64 binary. |
+--------------------------------+---------------------------------------+----------------------------------+
| 5. Forbidden Vocabulary        | "Don't mention 'Electron'" (#19);     | Sanitized: zero mentions of      |
|                                | "Don't start with 'A' or 'An'" (#20)  | 'Electron'; starts with 'Portable|
+--------------------------------+---------------------------------------+----------------------------------+
| 6. Section & Ordering          | Added to bottom of relevant section   | Appended to bottom of Other      |
|                                | (rule #17); NOT alphabetical.         | (after Beekeeper Studio).        |
+--------------------------------+---------------------------------------+----------------------------------+
```

### 1.2 Automated Unpause Trigger & Readiness Watcher
Execute this standalone Python script periodically to automatically evaluate when all three gates (Pause lifted, 100+ stars, 30+ days age) are cleared:

```python
import json
import urllib.request
from datetime import datetime, timezone

REPO_API = "https://api.github.com/repos/sindresorhus/awesome-electron"
GUIDEGRAM_API = "https://api.github.com/repos/guidegram/guidegram"

def check_readiness():
    headers = {"User-Agent": "Guidegram-Launch-Monitor"}
    
    # 1. Check Upstream Pause Banner
    req_upstream = urllib.request.Request(REPO_API, headers=headers)
    with urllib.request.urlopen(req_upstream) as resp:
        upstream_data = json.loads(resp.read().decode())
    desc = upstream_data.get("description", "")
    paused = "PAUSED" in desc.upper()
    
    # 2. Check Guidegram Star Count and Age
    req_gg = urllib.request.Request(GUIDEGRAM_API, headers=headers)
    with urllib.request.urlopen(req_gg) as resp:
        gg_data = json.loads(resp.read().decode())
    
    stars = gg_data.get("stargazers_count", 0)
    created_at = datetime.fromisoformat(gg_data["created_at"].replace("Z", "+00:00"))
    age_days = (datetime.now(timezone.utc) - created_at).days
    
    print(f"[*] Upstream Submissions Paused: {paused} ('{desc}')")
    print(f"[*] Guidegram Stars: {stars}/100")
    print(f"[*] Guidegram Age: {age_days}/30 days")
    
    if not paused and stars >= 100 and age_days >= 30:
        print("[+] ALL GATES CLEARED! Ready to submit pull request.")
        return True
    else:
        print("[-] Gates pending. Maintain holding pattern.")
        return False

if __name__ == "__main__":
    check_readiness()
```

---

## 2. Target Section & Formatting Directives

### 2.1 Section Hierarchy & Positioning Justification
- **Target File**: `readme.md` (lowercase)
- **Hierarchy Path**:
  ```markdown
  ## Apps
  ### Open Source
  ###### Other
  ```
- **Why `###### Other` (Not `Featured`)?**: The `Featured` category is reserved strictly for industry-defining applications (VS Code, Hyper, WebTorrent, Atom). Third-party specialized clients belong in `### Open Source > ###### Other`.
- **Why Bottom Insertion (Not Alphabetical)?**: Rule 17 of `contributing.md` explicitly states: *"Additions should be added to the bottom of the relevant section."* Alphabetical sorting directly violates maintainer policy.

### 2.2 Preceding Line (Current End of `###### Other`)
Line 118:
```markdown
- [Beekeeper Studio](https://github.com/beekeeper-studio/beekeeper-studio) - Cross-platform SQL editor and database manager.
```

### 2.3 Proposed Entry
```markdown
- [Guidegram](https://github.com/guidegram/guidegram) - Portable multi-account Telegram client with per-account proxy isolation, anti-fingerprinting, and group analytics.
```

> **Strict Compliance Audit**:
> - Mentions of 'Electron': **0** (Complies with Rule 19).
> - Leading 'A' or 'An': **None** (Starts with 'Portable', complies with Rule 20).
> - Delimiter: ASCII Hyphen surrounded by single spaces ` - ` (Standard for this repo).
> - Punctuation: Ends with a period `.` (Complies with Rule 21).
> - Capitalization: Starts with an uppercase character `P` (Complies with Rule 21).

---

## 3. Exact Unified Git Diff

```diff
diff --git a/readme.md b/readme.md
index 7748809..33d9021 100644
--- a/readme.md
+++ b/readme.md
@@ -118,2 +118,3 @@
 - [Beekeeper Studio](https://github.com/beekeeper-studio/beekeeper-studio) - Cross-platform SQL editor and database manager.
+- [Guidegram](https://github.com/guidegram/guidegram) - Portable multi-account Telegram client with per-account proxy isolation, anti-fingerprinting, and group analytics.
 
```

---

## 4. Complete Turnkey GitHub PR Submission Copy

### Feature Branch Name
```bash
add-guidegram
```

### Git Commit Message
```text
Add Guidegram to Open Source > Other

Add Guidegram (https://github.com/guidegram/guidegram) to Apps > Open Source > Other.
Portable multi-account Telegram client with per-account proxy isolation,
hardware anti-fingerprinting, and native group analytics.
```

### Pull Request Title
```text
Add Guidegram to Open Source Apps
```

### Pull Request Description Body
```markdown
### Overview
Adds **[Guidegram](https://github.com/guidegram/guidegram)** to `Apps > Open Source > Other`.

Guidegram is an open-source, truly portable desktop client for Telegram engineered with Electron 34, React 19, TypeScript, and GramJS (MTProto 2.0). It addresses multi-account desktop bottlenecks by introducing per-account proxy isolation, hardware anti-fingerprinting, zero-registry local storage, and client-side group analytics.

### Upstream Guidelines Self-Certification
- [x] Repository has at least 100 stars: Verified (Current: >= 100 stars).
- [x] Project is at least 30 days old: Verified.
- [x] Description does not mention "Electron": Verified.
- [x] Description does not start with "A" or "An": Verified.
- [x] Description starts with a capital letter and ends with a period: Verified.
- [x] Added to the bottom of `Apps > Open Source > Other`: Verified.
- [x] English README with screenshot and release binaries for at least one OS: Verified (Windows x64 portable executable available under Releases).
- [x] Single entry, correct formatting: `- [Name](URL) - Description.`: Verified.
```

---

## 5. Automated Terminal Workflow (`gh pr create`)

Execute once readiness gates are verified:

```bash
# Step 1: Fork and clone upstream repository
gh repo fork sindresorhus/awesome-electron --clone=true
cd awesome-electron

# Step 2: Create feature branch off main
git checkout -b add-guidegram origin/main

# Step 3: Append Guidegram to the bottom of Apps > Open Source > Other
python -c "
with open('readme.md', 'r', encoding='utf-8') as f:
    lines = f.readlines()

target_idx = -1
for i, line in enumerate(lines):
    if 'Beekeeper Studio' in line:
        target_idx = i + 1
        break

if target_idx != -1:
    new_entry = '- [Guidegram](https://github.com/guidegram/guidegram) - Portable multi-account Telegram client with per-account proxy isolation, anti-fingerprinting, and group analytics.\n'
    lines.insert(target_idx, new_entry)
    with open('readme.md', 'w', encoding='utf-8', newline='\n') as f:
        f.writelines(lines)
    print('Successfully appended Guidegram after Beekeeper Studio')
else:
    raise RuntimeError('Anchor line Beekeeper Studio not found')
"

# Step 4: Commit changes
git add readme.md
git commit -m "Add Guidegram to Open Source > Other

Add Guidegram (https://github.com/guidegram/guidegram) to Apps > Open Source > Other.
Portable multi-account Telegram client with per-account proxy isolation,
hardware anti-fingerprinting, and native group analytics."

# Step 5: Push to personal fork
git push origin add-guidegram

# Step 6: Create Pull Request via GitHub CLI
gh pr create \
  --repo sindresorhus/awesome-electron \
  --base main \
  --head "$(gh api user --jq .login):add-guidegram" \
  --title "Add Guidegram to Open Source Apps" \
  --body "### Overview
Adds **[Guidegram](https://github.com/guidegram/guidegram)** to \`Apps > Open Source > Other\`.

Guidegram is an open-source, truly portable desktop client for Telegram engineered with Electron 34, React 19, TypeScript, and GramJS (MTProto 2.0). It addresses multi-account desktop bottlenecks by introducing per-account proxy isolation, hardware anti-fingerprinting, zero-registry local storage, and client-side group analytics.

### Upstream Guidelines Self-Certification
- [x] Repository has at least 100 stars: Verified.
- [x] Project is at least 30 days old: Verified.
- [x] Description does not mention \"Electron\": Verified.
- [x] Description does not start with \"A\" or \"An\": Verified.
- [x] Description starts with a capital letter and ends with a period: Verified.
- [x] Added to the bottom of \`Apps > Open Source > Other\`: Verified.
- [x] English README with screenshot and release binaries for at least one OS: Verified.
- [x] Single entry, correct formatting: \`- [Name](URL) - Description.\`: Verified."
```
