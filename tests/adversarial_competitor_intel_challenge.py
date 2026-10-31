"""
Adversarial Empirical Challenge Suite for Competitor Intelligence Dataset
Target: data/competitor_intel/competitor_issues.jsonl & EXTRACTION_METRICS.json
Agent: teamwork_preview_challenger_m2_1
"""

import json
import re
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from collections import Counter, defaultdict

JSONL_PATH = "data/competitor_intel/competitor_issues.jsonl"
METRICS_PATH = "data/competitor_intel/EXTRACTION_METRICS.json"

REQUIRED_FIELDS = [
    "id",
    "repo",
    "repo_name",
    "platform",
    "issue_number",
    "title",
    "url",
    "state",
    "comments_count",
    "reactions_count",
    "created_at",
    "updated_at",
    "category",
    "priority",
    "flair",
    "guidegram_actionable_insight"
]

CANONICAL_CATEGORIES = {
    "MTProto & Network / Proxy / Censorship Resistance",
    "Media Streaming / Cache / Voice & Video Engine",
    "UI Ergonomics / Smooth Scrolling / Layout & RTL",
    "Memory Leaks / CPU Spikes / Background Workers",
    "Multi-Account / Session Security / Local Database"
}

REQUIRED_REPOS = {
    "telegramdesktop/tdesktop",
    "kotatogram/kotatogram-desktop",
    "TDesktop-x64/tdesktop",
    "morethanwords/tweb",
    "Ajaxy/telegram-tt"
}

ALLOWED_PRIORITIES = {"P0", "P1", "P2"}
ALLOWED_STATES = {"open", "closed"}

ISO_TIMESTAMP_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")

def run_offline_adversarial_suite():
    print("=" * 80)
    print("PHASE 1: ADVERSARIAL OFFLINE INTEGRITY & SCHEMA TESTING")
    print("=" * 80)

    anomalies = []
    ids_seen = set()
    urls_seen = set()
    repo_counter = Counter()
    category_counter = Counter()
    priority_counter = Counter()
    flair_counter = Counter()
    records = []

    try:
        with open(JSONL_PATH, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except Exception as e:
        print(f"[FATAL] Failed to read {JSONL_PATH}: {e}")
        sys.exit(1)

    print(f"[*] Total lines read: {len(lines)}")

    for line_idx, raw_line in enumerate(lines, 1):
        stripped = raw_line.rstrip("\r\n")
        if not stripped:
            anomalies.append(f"Line {line_idx}: Blank or empty line found")
            continue

        try:
            item = json.loads(stripped)
        except json.JSONDecodeError as jde:
            anomalies.append(f"Line {line_idx}: JSON parse error: {jde}")
            continue

        records.append(item)

        # 1. Missing or extra keys
        for key in REQUIRED_FIELDS:
            if key not in item:
                anomalies.append(f"Line {line_idx}: Missing required field '{key}'")
            elif item[key] is None:
                anomalies.append(f"Line {line_idx}: Null value in field '{key}'")

        # 2. String field whitespace padding & empty checks
        string_fields = ["id", "repo", "repo_name", "platform", "title", "url", "state", "category", "priority", "flair", "guidegram_actionable_insight"]
        for sf in string_fields:
            val = item.get(sf)
            if not isinstance(val, str):
                anomalies.append(f"Line {line_idx}: Field '{sf}' is not string (type={type(val).__name__})")
            else:
                if not val.strip():
                    anomalies.append(f"Line {line_idx}: Field '{sf}' is empty or whitespace-only")
                # Strict whitespace padding anomaly check (leading or trailing whitespace)
                if val != val.strip():
                    anomalies.append(f"Line {line_idx}: Field '{sf}' has leading/trailing whitespace padding: {repr(val)}")
                if sf != "guidegram_actionable_insight":
                    if "\n" in val or "\r" in val:
                        anomalies.append(f"Line {line_idx}: Field '{sf}' contains unescaped newline/carriage return")

        # 3. Numeric field validation
        issue_num = item.get("issue_number")
        if not isinstance(issue_num, int) or isinstance(issue_num, bool):
            anomalies.append(f"Line {line_idx}: 'issue_number' is not integer ({issue_num})")
        elif issue_num <= 0:
            anomalies.append(f"Line {line_idx}: Non-positive 'issue_number': {issue_num}")

        comments_cnt = item.get("comments_count")
        if not isinstance(comments_cnt, int) or isinstance(comments_cnt, bool):
            anomalies.append(f"Line {line_idx}: 'comments_count' is not integer ({comments_cnt})")
        elif comments_cnt < 0:
            anomalies.append(f"Line {line_idx}: Negative 'comments_count': {comments_cnt}")

        reactions_cnt = item.get("reactions_count")
        if not isinstance(reactions_cnt, int) or isinstance(reactions_cnt, bool):
            anomalies.append(f"Line {line_idx}: 'reactions_count' is not integer ({reactions_cnt})")
        elif reactions_cnt < 0:
            anomalies.append(f"Line {line_idx}: Negative 'reactions_count': {reactions_cnt}")

        # 4. ID and URL structure and deduplication
        expected_id = f"{item.get('repo')}#{issue_num}"
        rec_id = item.get("id")
        if rec_id != expected_id:
            anomalies.append(f"Line {line_idx}: ID mismatch: expected '{expected_id}', got '{rec_id}'")

        if rec_id in ids_seen:
            anomalies.append(f"Line {line_idx}: Duplicate ID found: '{rec_id}'")
        else:
            ids_seen.add(rec_id)

        rec_url = item.get("url")
        if rec_url in urls_seen:
            anomalies.append(f"Line {line_idx}: Duplicate URL found: '{rec_url}'")
        else:
            urls_seen.add(rec_url)

        expected_url_prefix_issue = f"https://github.com/{item.get('repo')}/issues/{issue_num}"
        expected_url_prefix_pull = f"https://github.com/{item.get('repo')}/pull/{issue_num}"
        if rec_url != expected_url_prefix_issue and rec_url != expected_url_prefix_pull:
            anomalies.append(f"Line {line_idx}: Anomalous URL pattern '{rec_url}'")

        # 5. Timestamp validation
        created_at = item.get("created_at")
        updated_at = item.get("updated_at")
        created_dt = None
        updated_dt = None

        if isinstance(created_at, str):
            if not ISO_TIMESTAMP_REGEX.match(created_at):
                anomalies.append(f"Line {line_idx}: 'created_at' does not match ISO 8601 UTC regex: '{created_at}'")
            else:
                try:
                    created_dt = datetime.strptime(created_at, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
                    if created_dt.year < 2013 or created_dt.year > 2026:
                        anomalies.append(f"Line {line_idx}: 'created_at' year out of realistic range: {created_dt.year}")
                except Exception as e:
                    anomalies.append(f"Line {line_idx}: 'created_at' datetime parse error: {e}")

        if isinstance(updated_at, str):
            if not ISO_TIMESTAMP_REGEX.match(updated_at):
                anomalies.append(f"Line {line_idx}: 'updated_at' does not match ISO 8601 UTC regex: '{updated_at}'")
            else:
                try:
                    updated_dt = datetime.strptime(updated_at, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
                except Exception as e:
                    anomalies.append(f"Line {line_idx}: 'updated_at' datetime parse error: {e}")

        if created_dt and updated_dt:
            if updated_dt < created_dt:
                anomalies.append(f"Line {line_idx}: 'updated_at' ({updated_at}) precedes 'created_at' ({created_at})")

        # 6. Domain Category, Priority, State
        category = item.get("category")
        if category not in CANONICAL_CATEGORIES:
            anomalies.append(f"Line {line_idx}: Non-canonical category: '{category}'")
        else:
            category_counter[category] += 1

        priority = item.get("priority")
        if priority not in ALLOWED_PRIORITIES:
            anomalies.append(f"Line {line_idx}: Invalid priority: '{priority}'")
        else:
            priority_counter[priority] += 1

        state = item.get("state")
        if state not in ALLOWED_STATES:
            anomalies.append(f"Line {line_idx}: Invalid state: '{state}'")

        # 7. Insight depth check
        insight = item.get("guidegram_actionable_insight", "")
        if len(insight) < 40:
            anomalies.append(f"Line {line_idx}: Short/trivial insight (<40 chars): '{insight}'")
        if "[Root Cause" not in insight or "[Guidegram" not in insight:
            anomalies.append(f"Line {line_idx}: Insight lacks structured [Root Cause / Problem Nature] or [Guidegram Mitigation / Architecture] tags")

        repo_counter[item.get("repo")] += 1
        flair_counter[item.get("flair")] += 1

    print("\n--- OFFLINE AUDIT RESULTS ---")
    print(f"Total valid parsed records: {len(records)}")
    print(f"Unique IDs: {len(ids_seen)}")
    print(f"Unique URLs: {len(urls_seen)}")
    print(f"Total anomalies detected: {len(anomalies)}")

    if anomalies:
        print("[!] Top 20 anomalies:")
        for a in anomalies[:20]:
            print(f"    - {a}")
    else:
        print("[+] 0 schema, whitespace, counter, or deduplication anomalies detected!")

    print("\n--- REPO DISTRIBUTION ---")
    for r, cnt in repo_counter.most_common():
        is_req = " (REQUIRED)" if r in REQUIRED_REPOS else ""
        print(f"  * {r}: {cnt}{is_req}")

    missing_repos = REQUIRED_REPOS - set(repo_counter.keys())
    if missing_repos:
        print(f"[!] CRITICAL: Missing required repos: {missing_repos}")
    else:
        print("[+] All 5 required competitor repos are present.")

    print("\n--- CATEGORY DISTRIBUTION ---")
    for cat, cnt in category_counter.most_common():
        print(f"  * {cat}: {cnt}")

    print("\n--- PRIORITY DISTRIBUTION ---")
    for pr, cnt in priority_counter.items():
        print(f"  * {pr}: {cnt}")

    return records, anomalies

def run_live_http_resolution_suite(records):
    print("\n" + "=" * 80)
    print("PHASE 2: LIVE HTTP RESOLUTION TESTING (SAMPLING 20 URLS)")
    print("=" * 80)

    # We sample 4 per required repo:
    # 1. telegramdesktop/tdesktop (4)
    # 2. kotatogram/kotatogram-desktop (4)
    # 3. TDesktop-x64/tdesktop (64Gram) (4)
    # 4. morethanwords/tweb (4)
    # 5. Ajaxy/telegram-tt (4)
    # Total = 20 URLs.

    repo_samples = defaultdict(list)
    for rec in records:
        r = rec["repo"]
        if r in REQUIRED_REPOS:
            repo_samples[r].append(rec)

    sampled_records = []
    # Strategically pick 2 hot (high comments) and 2 recent per repo (or varied issue numbers)
    for r in REQUIRED_REPOS:
        items = repo_samples[r]
        if not items:
            continue
        # Sort by comments desc
        items_sorted_by_comments = sorted(items, key=lambda x: x["comments_count"], reverse=True)
        # Take 2 top discussed
        top_2 = items_sorted_by_comments[:2]
        # Take 2 lower or recent
        remaining = [x for x in items if x not in top_2]
        other_2 = remaining[:2] if len(remaining) >= 2 else remaining
        sampled_records.extend(top_2 + other_2)

    print(f"[*] Total URLs sampled for live HTTP testing: {len(sampled_records)}")

    http_results = []
    user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

    for idx, rec in enumerate(sampled_records, 1):
        url = rec["url"]
        repo = rec["repo"]
        issue_num = rec["issue_number"]
        expected_title_snippet = rec["title"][:25]

        print(f"\n[{idx}/{len(sampled_records)}] Probing {repo} #{issue_num}: {url}")

        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": user_agent,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            }
        )

        t0 = time.time()
        status_code = None
        final_url = None
        page_title = None
        error_msg = None

        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                status_code = response.getcode()
                final_url = response.geturl()
                elapsed = time.time() - t0
                
                # Read initial chunk to extract <title>
                html_chunk = response.read(65536).decode("utf-8", errors="replace")
                title_match = re.search(r"<title>(.*?)</title>", html_chunk, re.IGNORECASE | re.DOTALL)
                if title_match:
                    page_title = title_match.group(1).strip()
                
                print(f"    Status: {status_code} OK (in {elapsed:.2f}s)")
                print(f"    Resolved URL: {final_url}")
                print(f"    HTML Title: {page_title}")
                
        except urllib.error.HTTPError as he:
            status_code = he.code
            error_msg = f"HTTP Error {he.code}: {he.reason}"
            print(f"    [FAIL] {error_msg}")
        except urllib.error.URLError as ue:
            error_msg = f"URL Error: {ue.reason}"
            print(f"    [FAIL] {error_msg}")
        except Exception as e:
            error_msg = f"Unexpected Error: {e}"
            print(f"    [FAIL] {error_msg}")

        result_entry = {
            "index": idx,
            "repo": repo,
            "issue_number": issue_num,
            "url": url,
            "status_code": status_code,
            "final_url": final_url,
            "page_title": page_title,
            "error": error_msg,
            "title_match": bool(page_title and (str(issue_num) in page_title or repo.split("/")[1] in page_title))
        }
        http_results.append(result_entry)
        time.sleep(0.5)  # Courteous pacing to avoid GitHub IP rate-limiting

    print("\n" + "=" * 80)
    print("PHASE 2 SUMMARY: LIVE HTTP PROBING RESULTS")
    print("=" * 80)

    success_count = sum(1 for r in http_results if r["status_code"] == 200)
    print(f"[*] Total tested: {len(http_results)}")
    print(f"[*] Successful 200 OK: {success_count}/{len(http_results)}")

    failed = [r for r in http_results if r["status_code"] != 200]
    if failed:
        print(f"[!] FAILED URLS ({len(failed)}):")
        for f in failed:
            print(f"    - {f['repo']} #{f['issue_number']}: {f['url']} -> {f['error']}")
    else:
        print("[+] 100% of sampled URLs resolved with HTTP 200 OK without any 404s or broken redirects!")

    # Specifically check 64Gram
    tdesktop_64_results = [r for r in http_results if r["repo"] == "TDesktop-x64/tdesktop"]
    print(f"\n[*] 64Gram (TDesktop-x64/tdesktop) Verification ({len(tdesktop_64_results)} tested):")
    for r in tdesktop_64_results:
        print(f"    * #{r['issue_number']}: HTTP {r['status_code']} | Title: {r['page_title']}")

    return http_results

def main():
    records, anomalies = run_offline_adversarial_suite()
    http_results = run_live_http_resolution_suite(records)

    total_records = len(records)
    total_anomalies = len(anomalies)
    http_success_rate = sum(1 for r in http_results if r["status_code"] == 200) / len(http_results) if http_results else 0

    print("\n" + "=" * 80)
    print("FINAL CHALLENGE VERDICT CALCULATION")
    print("=" * 80)
    print(f"Total dataset records: {total_records}")
    print(f"Total schema/data anomalies: {total_anomalies}")
    print(f"Live HTTP success rate: {http_success_rate * 100:.1f}%")

    if total_records >= 500 and total_anomalies == 0 and http_success_rate == 1.0:
        print("VERDICT: >>> APPROVE <<<")
        sys.exit(0)
    else:
        print("VERDICT: >>> REJECT <<<")
        sys.exit(1)

if __name__ == "__main__":
    main()
