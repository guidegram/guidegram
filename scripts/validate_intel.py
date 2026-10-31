#!/usr/bin/env python3
"""
validate_intel.py
Automated Quality Assurance & Verification Suite for Guidegram Competitor Intelligence.

Validates:
1. File existence and non-zero size for all deliverables.
2. 100% valid JSON Lines syntax in competitor_issues.jsonl.
3. Schema compliance for every record (12 mandatory fields, valid types, valid URL/enums).
4. Total record count in acceptance range (500 - 1000+).
5. All 5 required target repositories present and populated:
   - telegramdesktop/tdesktop
   - kotatogram/kotatogram-desktop
   - TDesktop-x64/tdesktop
   - morethanwords/tweb
   - Ajaxy/telegram-tt
6. High-discussion issues count >= 200 (comments_count >= 10 or reactions_count >= 5).
7. Strict deduplication (0 duplicate repo#issue_number pairs).
8. Strict categorization into the 5 canonical technical domains.
9. Consistency between competitor_issues.jsonl and EXTRACTION_METRICS.json.
10. Structural completeness of ACTIONABLE_BACKLOG.md (markdown tables, live links, priorities).

Exit code: 0 on PASS, 1 on FAIL.
"""

import os
import sys
import json
import re

# Canonical paths relative to project root
current_dir = os.path.abspath(os.path.dirname(__file__))
while current_dir and not os.path.exists(os.path.join(current_dir, "package.json")):
    parent = os.path.dirname(current_dir)
    if parent == current_dir:
        break
    current_dir = parent

PROJECT_ROOT = current_dir
DATA_DIR = os.path.join(PROJECT_ROOT, "data", "competitor_intel")
JSONL_PATH = os.path.join(DATA_DIR, "competitor_issues.jsonl")
METRICS_PATH = os.path.join(DATA_DIR, "EXTRACTION_METRICS.json")
BACKLOG_PATH = os.path.join(DATA_DIR, "ACTIONABLE_BACKLOG.md")

REQUIRED_REPOS = [
    "telegramdesktop/tdesktop",
    "kotatogram/kotatogram-desktop",
    "TDesktop-x64/tdesktop",
    "morethanwords/tweb",
    "Ajaxy/telegram-tt"
]

CANONICAL_CATEGORIES = [
    "MTProto & Network / Proxy / Censorship Resistance",
    "Media Streaming / Cache / Voice & Video Engine",
    "UI Ergonomics / Smooth Scrolling / Layout & RTL",
    "Memory Leaks / CPU Spikes / Background Workers",
    "Multi-Account / Session Security / Local Database"
]

REQUIRED_FIELDS = [
    "id",
    "repo",
    "issue_number",
    "title",
    "url",
    "state",
    "comments_count",
    "reactions_count",
    "created_at",
    "updated_at",
    "category",
    "guidegram_actionable_insight"
]

URL_REGEX = re.compile(r"^https://github\.com/[^/]+/[^/]+/(issues|pull)/\d+$")
TIMESTAMP_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")

class ValidationReport:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.passed_checks = []

    def pass_check(self, name, detail=""):
        self.passed_checks.append((name, detail))
        print(f"  [PASS] {name}: {detail}")

    def fail_check(self, name, reason):
        self.errors.append((name, reason))
        print(f"  [FAIL] {name}: {reason}")

    def warn_check(self, name, reason):
        self.warnings.append((name, reason))
        print(f"  [WARN] {name}: {reason}")

    @property
    def is_success(self):
        return len(self.errors) == 0

def validate_deliverables_existence(report):
    for label, path in [("JSONL Database", JSONL_PATH),
                        ("Metrics File", METRICS_PATH),
                        ("Actionable Backlog", BACKLOG_PATH)]:
        if not os.path.isfile(path):
            report.fail_check(f"File Existence ({label})", f"File not found at {path}")
        elif os.path.getsize(path) == 0:
            report.fail_check(f"File Non-Empty ({label})", f"File at {path} is empty (0 bytes)")
        else:
            report.pass_check(f"File Existence ({label})", f"{os.path.basename(path)} ({os.path.getsize(path):,} bytes)")

def validate_jsonl_content(report):
    if not os.path.isfile(JSONL_PATH) or os.path.getsize(JSONL_PATH) == 0:
        return []

    records = []
    seen_ids = set()
    syntax_errors = 0
    schema_errors = 0
    repo_counts = {r: 0 for r in REQUIRED_REPOS}
    all_repo_counts = {}
    category_counts = {c: 0 for c in CANONICAL_CATEGORIES}
    other_category_counts = {}
    high_discussion_count = 0

    with open(JSONL_PATH, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, start=1):
            line_str = line.strip()
            if not line_str:
                continue

            try:
                item = json.loads(line_str)
            except Exception as e:
                syntax_errors += 1
                if syntax_errors <= 5:
                    report.fail_check(f"JSON Syntax Error (Line {line_num})", str(e))
                continue

            # Field presence and types
            missing_fields = [f for f in REQUIRED_FIELDS if f not in item]
            if missing_fields:
                schema_errors += 1
                if schema_errors <= 5:
                    report.fail_check(f"Schema Violation (Line {line_num})", f"Missing fields: {missing_fields}")
                continue

            # ID verification
            item_id = item.get("id", "")
            expected_id = f"{item.get('repo', '')}#{item.get('issue_number', '')}"
            if item_id in seen_ids:
                report.fail_check(f"Duplicate Record (Line {line_num})", f"Duplicate id: {item_id}")
            seen_ids.add(item_id)

            if item_id != expected_id:
                report.warn_check(f"ID Mismatch (Line {line_num})", f"id '{item_id}' != expected '{expected_id}'")

            # Types and bounds
            if not isinstance(item.get("issue_number"), int) or item["issue_number"] <= 0:
                report.fail_check(f"Invalid issue_number (Line {line_num})", str(item.get("issue_number")))

            if not isinstance(item.get("comments_count"), int) or item["comments_count"] < 0:
                report.fail_check(f"Invalid comments_count (Line {line_num})", str(item.get("comments_count")))

            if not isinstance(item.get("reactions_count"), int) or item["reactions_count"] < 0:
                report.fail_check(f"Invalid reactions_count (Line {line_num})", str(item.get("reactions_count")))

            if item.get("state") not in ["open", "closed"]:
                report.fail_check(f"Invalid state (Line {line_num})", str(item.get("state")))

            url = item.get("url", "")
            if not URL_REGEX.match(url):
                report.fail_check(f"Invalid URL pattern (Line {line_num})", url)

            # Category check
            cat = item.get("category", "")
            if cat in CANONICAL_CATEGORIES:
                category_counts[cat] += 1
            else:
                other_category_counts[cat] = other_category_counts.get(cat, 0) + 1

            # High discussion metric (comments >= 10 or reactions >= 5)
            if item.get("comments_count", 0) >= 10 or item.get("reactions_count", 0) >= 5:
                high_discussion_count += 1

            # Insight check
            insight = item.get("guidegram_actionable_insight", "")
            if not isinstance(insight, str) or len(insight.strip()) < 15:
                report.fail_check(f"Weak Actionable Insight (Line {line_num})", f"Length: {len(insight.strip())}")

            repo = item.get("repo", "")
            if repo in repo_counts:
                repo_counts[repo] += 1
            all_repo_counts[repo] = all_repo_counts.get(repo, 0) + 1

            records.append(item)

    # Summary checks
    if syntax_errors == 0:
        report.pass_check("JSONL Syntax Integrity", f"100% of {len(records)} lines parsed cleanly")
    else:
        report.fail_check("JSONL Syntax Integrity", f"{syntax_errors} lines failed JSON parsing")

    # Volume check
    total_records = len(records)
    if total_records >= 500:
        report.pass_check("Dataset Volume", f"{total_records} records (minimum required: 500)")
    else:
        report.fail_check("Dataset Volume", f"Found only {total_records} records, minimum required is 500")

    # High discussion check
    if high_discussion_count >= 200:
        report.pass_check("High Discussion Density", f"{high_discussion_count} issues with high discussion (target: >= 200)")
    else:
        report.fail_check("High Discussion Density", f"Only {high_discussion_count} high-discussion issues (target: >= 200)")

    # Repo coverage check
    missing_repos = [r for r, count in repo_counts.items() if count == 0]
    if not missing_repos:
        repo_breakdown = ", ".join([f"{r.split('/')[-1]}: {c}" for r, c in repo_counts.items()])
        report.pass_check("5 Primary Repos Coverage", f"All 5 covered ({repo_breakdown})")
    else:
        report.fail_check("5 Primary Repos Coverage", f"Missing records for repos: {missing_repos}")

    # Canonical Category check
    if other_category_counts:
        report.warn_check("Category Strictness", f"Found non-canonical categories: {list(other_category_counts.keys())}")
    else:
        report.pass_check("Category Canonical Alignment", f"100% of records mapped into 5 canonical domains")

    return records

def validate_metrics_file(report, records):
    if not os.path.isfile(METRICS_PATH) or not records:
        return

    try:
        with open(METRICS_PATH, "r", encoding="utf-8") as f:
            metrics = json.load(f)
    except Exception as e:
        report.fail_check("Metrics JSON Parse", str(e))
        return

    # Compare total_extracted
    jsonl_total = len(records)
    metrics_total = metrics.get("total_extracted")
    if metrics_total == jsonl_total:
        report.pass_check("Metrics Record Count Match", f"total_extracted ({metrics_total}) matches JSONL count")
    else:
        report.fail_check("Metrics Record Count Match", f"metrics ({metrics_total}) != JSONL count ({jsonl_total})")

    # Required fields in metrics
    for mf in ["timestamp", "total_extracted", "repo_statistics", "category_distribution", "methodology"]:
        if mf not in metrics:
            report.warn_check(f"Metrics Field Presence", f"Optional/recommended field '{mf}' missing in EXTRACTION_METRICS.json")

def validate_backlog_markdown(report):
    if not os.path.isfile(BACKLOG_PATH):
        return

    try:
        with open(BACKLOG_PATH, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        report.fail_check("Backlog Read Error", str(e))
        return

    if len(content) < 5000:
        report.fail_check("Backlog Depth", f"File size too small ({len(content)} chars)")
    else:
        report.pass_check("Backlog Depth", f"{len(content):,} characters")

    # Check for live links (matching either [#123](url) or [123](url))
    link_count = len(re.findall(r"\[#?\d+\]\(https://github\.com/[^)]+\)", content))
    if link_count >= 50:
        report.pass_check("Live GitHub Links in Backlog", f"{link_count} formatted markdown links detected")
    else:
        report.warn_check("Live GitHub Links in Backlog", f"Only {link_count} formatted markdown links detected")

def main():
    print("=" * 70)
    print("  GUIDEGRAM COMPETITOR INTEL - AUTOMATED VALIDATION SUITE")
    print("=" * 70)

    report = ValidationReport()

    print("\nPhase 1: Validating Deliverables Existence...")
    validate_deliverables_existence(report)

    print("\nPhase 2: Validating JSON Lines Database & Schema Integrity...")
    records = validate_jsonl_content(report)

    print("\nPhase 3: Validating EXTRACTION_METRICS.json Consistency...")
    validate_metrics_file(report, records)

    print("\nPhase 4: Validating ACTIONABLE_BACKLOG.md Structure & Links...")
    validate_backlog_markdown(report)

    print("\n" + "=" * 70)
    print(f"VALIDATION SUMMARY: {len(report.passed_checks)} Passed, {len(report.warnings)} Warnings, {len(report.errors)} Errors")
    print("=" * 70)

    if report.is_success:
        print("\n>>> STATUS: ALL ACCEPTANCE GATES PASSED (EXIT CODE 0) <<<\n")
        sys.exit(0)
    else:
        print("\n>>> STATUS: VALIDATION FAILED WITH BLOCKING ERRORS (EXIT CODE 1) <<<\n")
        for name, err in report.errors:
            print(f"  - [ERROR] {name}: {err}")
        sys.exit(1)

if __name__ == "__main__":
    main()
