#!/usr/bin/env python3
"""
Perpetual Engine State Machine & Teamwork Swarm Controller
Zero-dependency CLI and utility for managing scoped .perpetual state,
multi-agent teamwork blackboard, consensus gates, and positive feedback loops in Antigravity.
Guarantees complete isolation between different projects and different initiatives within the same project.
"""

import sys
import os
import re
import json
import time
import math
import datetime
import tempfile
import contextlib
import threading
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

BASE_PERPETUAL_DIR = ".perpetual"
DEFAULT_ROLES = ["architect", "auditor", "implementer", "verifier", "scout"]
MANDATORY_VOTING_ROLES = ["architect", "auditor", "verifier"]

def sanitize_scope(name: str) -> str:
    """Sanitize scope string into a safe directory slug."""
    slug = re.sub(r'[^a-zA-Z0-9_\-]+', '-', name.strip().lower()).strip('-_')
    if not re.search(r'[a-zA-Z0-9]', slug):
        return "default"
    return slug

def get_scope_dir(scope: str) -> str:
    """Get absolute or relative path to scope directory."""
    clean_scope = sanitize_scope(scope)
    return os.path.join(BASE_PERPETUAL_DIR, clean_scope)

def get_team_dir(scope: str) -> str:
    """Get path to the team coordination directory for the given scope."""
    return os.path.join(get_scope_dir(scope), "team")

_local_locks = threading.local()

@contextlib.contextmanager
def file_lock(filepath: str, timeout: float = 10.0, retry_delay: float = 0.05):
    """
    Re-entrant cross-platform advisory file lock using atomic .lock file creation.
    Guarantees mutual exclusion across threads and separate OS processes.
    Includes thread-local re-entrancy tracking, stale lock detection (>30s), and timeout protection.
    """
    abs_path = os.path.normcase(os.path.abspath(filepath))
    lock_file = abs_path + ".lock"
    
    if not hasattr(_local_locks, "held"):
        _local_locks.held = {}
        
    if abs_path in _local_locks.held:
        _local_locks.held[abs_path] += 1
        try:
            yield
        finally:
            _local_locks.held[abs_path] -= 1
            if _local_locks.held[abs_path] == 0:
                del _local_locks.held[abs_path]
        return

    end_time = time.time() + timeout
    fd = None
    while True:
        try:
            fd = os.open(lock_file, os.O_CREAT | os.O_EXCL | os.O_RDWR)
            try:
                os.write(fd, str(os.getpid()).encode("utf-8"))
            except Exception:
                pass
            break
        except (FileExistsError, PermissionError):
            try:
                stat = os.stat(lock_file)
                if time.time() - stat.st_mtime > 30.0:
                    try:
                        if fd is not None:
                            os.close(fd)
                    except Exception:
                        pass
                    try:
                        os.remove(lock_file)
                    except OSError:
                        pass
            except OSError:
                pass
            if time.time() > end_time:
                raise TimeoutError(f"Timed out after {timeout}s waiting for lock on {filepath}")
            time.sleep(retry_delay)
            
    _local_locks.held[abs_path] = 1
    try:
        yield
    finally:
        if abs_path in _local_locks.held:
            _local_locks.held[abs_path] -= 1
            if _local_locks.held[abs_path] == 0:
                del _local_locks.held[abs_path]
        if fd is not None:
            try:
                os.close(fd)
            except OSError:
                pass
        try:
            if os.path.exists(lock_file):
                os.remove(lock_file)
        except OSError:
            pass

def atomic_write_json(filepath: str, data: Any) -> None:
    """
    Safely write JSON using atomic file replacement with RFC 8259 strictness
    and Windows file sharing retry backoff.
    """
    dirname = os.path.dirname(filepath)
    if dirname:
        os.makedirs(dirname, exist_ok=True)
    temp_dir = dirname if dirname else "."
    fd, tmp_path = tempfile.mkstemp(dir=temp_dir, prefix="atomic_", suffix=".tmp")
    try:
        with open(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False, allow_nan=False)
            f.flush()
            os.fsync(f.fileno())
        # Exponential backoff retry for transient Windows PermissionError / sharing locks
        max_retries = 25
        for attempt in range(max_retries):
            try:
                os.replace(tmp_path, filepath)
                break
            except (PermissionError, OSError):
                if attempt == max_retries - 1:
                    raise
                time.sleep(0.02 * (attempt + 1))
    except Exception:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        raise

def atomic_write_text(filepath: str, text: str) -> None:
    """
    Safely write text using atomic file replacement with UTF-8 encoding
    and Windows file sharing retry backoff.
    """
    dirname = os.path.dirname(filepath)
    if dirname:
        os.makedirs(dirname, exist_ok=True)
    temp_dir = dirname if dirname else "."
    fd, tmp_path = tempfile.mkstemp(dir=temp_dir, prefix="atomic_txt_", suffix=".tmp")
    try:
        with open(fd, "w", encoding="utf-8") as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        max_retries = 25
        for attempt in range(max_retries):
            try:
                os.replace(tmp_path, filepath)
                break
            except (PermissionError, OSError):
                if attempt == max_retries - 1:
                    raise
                time.sleep(0.02 * (attempt + 1))
    except Exception:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        raise

def render_dashboard_markdown(scope: str) -> str:
    """Render live mission control dashboard markdown from state and blackboard."""
    clean_s = sanitize_scope(scope)
    scope_dir = get_scope_dir(clean_s)
    team_dir = get_team_dir(clean_s)
    state_file = os.path.join(scope_dir, "state.json")
    bb_file = os.path.join(team_dir, "blackboard.json")

    state = {}
    if os.path.exists(state_file):
        try:
            with open(state_file, "r", encoding="utf-8") as f:
                state = json.load(f)
        except Exception:
            pass

    bb = {}
    if os.path.exists(bb_file):
        try:
            with open(bb_file, "r", encoding="utf-8") as f:
                bb = json.load(f)
        except Exception:
            pass

    goal = state.get("goal", "Autonomous Engineering Optimization")
    status = state.get("status", "running")
    mode = state.get("execution_mode", "teamwork_swarm")
    curr_phase = state.get("current_phase", 1)

    if status == "running":
        status_line = f"🟢 Active & Autonomous (Phase {curr_phase} In Progress)"
    elif "halt" in status:
        status_line = f"🏁 Halted Gracefully (Phase {curr_phase})"
    else:
        status_line = f"🟡 {status.capitalize()} (Phase {curr_phase})"

    budget = state.get("budget", {})
    budget_reason = budget.get("reason") or budget.get("status_note") or f"Type: {budget.get('type', 'infinite')}"

    roles = bb.get("roles", {})
    role_icons = {
        "architect": "🏛️",
        "auditor": "🔍",
        "implementer": "🛠️",
        "verifier": "⚖️",
        "scout": "🔭"
    }

    curr_target = f"phase_{curr_phase}"
    votes = bb.get("votes", {}).get(curr_target, {})
    consensus_info = bb.get("consensus", {})
    consensus_status = consensus_info.get("status", "in_progress")
    approved_by = consensus_info.get("approved_by", [])
    if consensus_status == "passed":
        consensus_text = f"🟢 Unanimous PASS (Approved by: {', '.join(approved_by)})"
    elif consensus_status == "rejected":
        consensus_text = "🔴 REJECTED — Remediation Required"
    elif consensus_status == "revise":
        consensus_text = "🟡 REVISE — Feedback In-Flight"
    else:
        approvals = [r for r in MANDATORY_VOTING_ROLES if votes.get(r, {}).get("vote") == "PASS"]
        consensus_text = f"⏳ In-Progress ({len(approvals)}/{len(MANDATORY_VOTING_ROLES)} PASS)"

    md = []
    md.append("# 🛰️ Perpetual Engine — Live Mission Control\n")
    md.append(f"> **Scope**: `{clean_s}`  ")
    md.append(f"> **Current Status**: {status_line}  ")
    md.append(f"> **Engine Mode**: Teamwork Swarm (Architect, Auditor, Implementer, Verifier, Scout)  ")
    md.append(f"> **Goal**: {goal}  ")
    md.append(f"> **Budget Constraint**: {budget_reason}\n")

    # Roadmap
    md.append("## 🗺️ Live Phase Roadmap")
    for cp in state.get("completed_phases", []):
        p_num = cp.get("phase_number")
        p_tit = re.sub(r"^Phase\s+\d+:\s*", "", cp.get("title", f"Phase {p_num}")).strip()
        md.append(f"- [x] **Phase {p_num}**: {p_tit} *(Completed)*")

    act_phase = state.get("active_phase", {})
    act_title = re.sub(r"^Phase\s+\d+:\s*", "", act_phase.get("title", f"Phase {curr_phase}")).strip()
    if status == "running":
        md.append(f"- [ ] **Phase {curr_phase}**: {act_title} *(IN PROGRESS)*")
    else:
        md.append(f"- [ ] **Phase {curr_phase}**: {act_title}")

    for b_item in state.get("backlog", []):
        m_num = re.match(r"^Phase\s+(\d+):\s*(.*)", b_item)
        if m_num:
            md.append(f"- [ ] **Phase {m_num.group(1)}**: {m_num.group(2).strip()}")
        else:
            md.append(f"- [ ] {b_item.strip()}")
    md.append("")

    # Collaborative Teamwork Status
    md.append("## 👥 Collaborative Teamwork Status")
    for r_key in ["architect", "auditor", "implementer", "verifier", "scout"]:
        r_info = roles.get(r_key, {})
        r_icon = role_icons.get(r_key, "👤")
        r_name = r_info.get("name", r_key.capitalize())
        r_status = r_info.get("status", "ready")
        v = votes.get(r_key, {})
        vote_part = f" [Vote: {v.get('vote')}]" if "vote" in v else ""
        md.append(f"- {r_icon} **{r_name.split('&')[0].strip()}**: {r_status}{vote_part}")
    md.append(f"- 🗳️ **Consensus**: {consensus_text}\n")

    # Live Metrics
    metrics = state.get("metrics", {})
    if metrics:
        md.append("## 📊 Live Metrics & Verified Progress")
        md.append("| Metric | Baseline | Current | Delta | Evaluation |")
        md.append("|---|---|---|---|---|")
        for m_name, m_val in metrics.items():
            val = m_val.get("value")
            base = m_val.get("baseline", "N/A")
            unit = m_val.get("unit", "")
            delta = m_val.get("delta_from_baseline", 0)
            better = m_val.get("better", "higher")

            if delta > 0:
                delta_str = f"+{delta}{unit}"
                status_eval = "🟢 Improved" if better in ("higher", "auto") else "🔴 Degraded"
            elif delta < 0:
                delta_str = f"{delta}{unit}"
                status_eval = "🟢 Improved" if better == "lower" else "🔴 Degraded"
            else:
                delta_str = f"0{unit}"
                status_eval = "⚪ Baseline"
            base_str = f"{base}{unit}" if base != "N/A" else "N/A"
            md.append(f"| {m_name} | {base_str} | {val}{unit} | {delta_str} | {status_eval} |")
        md.append("")

    # Discoveries & Action Ledger
    comp_phases = state.get("completed_phases", [])
    if comp_phases:
        md.append("## 📓 Live Discoveries & Action Ledger")
        for cp in comp_phases[-10:]:
            p_num = cp.get("phase_number")
            p_tit = re.sub(r"^Phase\s+\d+:\s*", "", cp.get("title", "")).strip()
            p_summary = cp.get("summary", "").strip()
            first_summary = p_summary.split("\n")[0] if p_summary else "Completed objectives successfully."
            md.append(f"- **[Phase {p_num}] {p_tit}**: {first_summary}")
        md.append("")

    return "\n".join(md)

def sync_dashboard(scope: str = "default", artifact_target: Optional[str] = None) -> List[str]:
    """
    Synchronize the live mission control dashboard across:
    1. Local workspace mirror: .perpetual/<scope>/perpetual_dashboard.md
    2. IDE Conversation Artifact: <artifact_dir>/perpetual_dashboard.md (if configured or detected)
    Returns list of paths successfully updated.
    """
    clean_s = sanitize_scope(scope)
    scope_dir = get_scope_dir(clean_s)
    state_file = os.path.join(scope_dir, "state.json")

    if not os.path.exists(state_file):
        return []

    md_content = render_dashboard_markdown(clean_s)
    updated_paths = []

    # 1. Local workspace mirror
    local_dash = os.path.join(scope_dir, "perpetual_dashboard.md")
    try:
        atomic_write_text(local_dash, md_content)
        updated_paths.append(local_dash)
    except Exception as e:
        print(f"[DASHBOARD-SYNC] ⚠️ Warning: Failed writing local mirror {local_dash}: {e}", file=sys.stderr)

    # 2. Resolve artifact target path
    target_path = None
    if artifact_target:
        target_path = artifact_target
    else:
        try:
            with open(state_file, "r", encoding="utf-8") as f:
                st = json.load(f)
            target_path = st.get("artifact_dir")
        except Exception:
            pass

    if not target_path:
        target_path = os.environ.get("ANTIGRAVITY_ARTIFACT_DIR") or os.environ.get("ARTIFACT_DIR")

    if target_path:
        try:
            target_path = os.path.abspath(target_path)
            if os.path.isdir(target_path) or not target_path.lower().endswith(".md"):
                os.makedirs(target_path, exist_ok=True)
                target_file = os.path.join(target_path, "perpetual_dashboard.md")
            else:
                os.makedirs(os.path.dirname(target_path), exist_ok=True)
                target_file = target_path

            atomic_write_text(target_file, md_content)
            updated_paths.append(target_file)
        except Exception as e:
            print(f"[DASHBOARD-SYNC] ⚠️ Warning: Failed writing artifact dashboard: {e}", file=sys.stderr)

    if updated_paths:
        print(f"[DASHBOARD-SYNC] ✅ Live dashboard updated: {', '.join(updated_paths)}")
    return updated_paths

def set_artifact_dir(scope: str, artifact_path: str) -> str:
    """Set the artifact directory for this scope and immediately sync the dashboard."""
    clean_s = sanitize_scope(scope)
    scope_dir = get_scope_dir(clean_s)
    state_file = os.path.join(scope_dir, "state.json")
    if not os.path.exists(state_file):
        raise FileNotFoundError(f"State file {state_file} does not exist. Run init first.")

    clean_path = os.path.abspath(artifact_path)
    with file_lock(state_file):
        with open(state_file, "r", encoding="utf-8") as f:
            state = json.load(f)
        state["artifact_dir"] = clean_path
        atomic_write_json(state_file, state)

    sync_dashboard(clean_s, artifact_target=clean_path)
    print(f"[OK] Artifact directory for scope '{clean_s}' set to: {clean_path}")
    return clean_path

def ensure_gitignore() -> None:
    """Ensure .perpetual/ directory is ignored in Git repository."""
    gitignore_path = ".gitignore"
    entry = "\n# Perpetual Engine local cache & state\n.perpetual/\n"
    if os.path.exists(gitignore_path):
        with open(gitignore_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        if ".perpetual" not in content:
            with open(gitignore_path, "a", encoding="utf-8") as f:
                f.write(entry)
    else:
        with open(gitignore_path, "w", encoding="utf-8") as f:
            f.write(entry)

def init_workspace(goal: str = "Autonomous Engineering Optimization", scope: str = "default", mode: str = "teamwork_swarm", artifact_dir: Optional[str] = None) -> Dict[str, Any]:
    """Initialize workspace with scoped state machine, dashboard sync, and team coordination structures."""
    scope_dir = get_scope_dir(scope)
    team_dir = get_team_dir(scope)
    os.makedirs(scope_dir, exist_ok=True)
    os.makedirs(team_dir, exist_ok=True)
    os.makedirs(os.path.join(team_dir, "events"), exist_ok=True)
    os.makedirs(os.path.join(scope_dir, "skills_cache"), exist_ok=True)
    ensure_gitignore()
    
    state_file = os.path.join(scope_dir, "state.json")
    journal_file = os.path.join(scope_dir, "findings_journal.md")
    queue_file = os.path.join(scope_dir, "phase_queue.md")
    
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    clean_s = sanitize_scope(scope)
    resolved_artifact_dir = os.path.abspath(artifact_dir) if artifact_dir else (os.environ.get("ANTIGRAVITY_ARTIFACT_DIR") or os.environ.get("ARTIFACT_DIR"))
    
    state = {
        "version": "2.0.0",
        "scope": clean_s,
        "goal": goal,
        "status": "running",
        "current_phase": 1,
        "execution_mode": mode,
        "team_enabled": True,
        "started_at": now_iso,
        "artifact_dir": resolved_artifact_dir,
        "completed_phases": [],
        "active_phase": {
            "phase_number": 1,
            "title": f"Phase 1: Initial Discovery & Baseline Audit for [{goal}]",
            "criteria": ["Identify attack surface / architecture baseline across 6 dimensions", "Log findings in journal"],
            "consensus_reached": False
        },
        "backlog": [
            "Phase 2: Deep Core Inspection & Bottleneck Analysis",
            "Phase 3: Targeted Optimization & Surgical Hardening",
            "Phase 4: Advanced Verification & Adversarial Stress Testing",
            "Phase 5: Architecture Evolution & Regression Suite"
        ],
        "metrics": {},
        "feedback_loop": {
            "evaluations_count": 0,
            "positive_reinforcements": 0,
            "regressions_detected": 0,
            "last_evaluated_at": None
        },
        "budget": {
            "type": "infinite",
            "duration_seconds": None,
            "deadline_iso": None,
            "target_phases": None,
            "started_at": now_iso,
            "can_stop": False,
            "reason": "Infinite perpetual mode active. Must not stop without explicit user stop command."
        }
    }
    
    atomic_write_json(state_file, state)
    
    # Initialize Team Blackboard
    init_team_blackboard(scope=scope, goal=goal)
    
    # Initialize Journal if not existing
    if not os.path.exists(journal_file):
        with open(journal_file, "w", encoding="utf-8") as f:
            f.write(f"# 📓 Perpetual Engine Journal — [{clean_s}]\n\n")
            f.write(f"**Goal**: {goal}\n")
            f.write(f"**Scope**: `{clean_s}`\n")
            f.write(f"**Execution Mode**: `{mode}`\n")
            f.write(f"**Started**: {now_iso}\n\n---\n")
            
    # Initialize Phase Queue if not existing
    if not os.path.exists(queue_file):
        with open(queue_file, "w", encoding="utf-8") as f:
            f.write(f"# 🗺️ Phase Roadmap — [{clean_s}]\n\n")
            f.write(f"- [ ] **Phase 1**: Initial Discovery & Baseline Audit *(IN PROGRESS)*\n")
            for idx, item in enumerate(state["backlog"], start=2):
                clean_item = re.sub(r"^Phase\s+\d+:\s*", "", item)
                f.write(f"- [ ] **Phase {idx}**: {clean_item}\n")
                
    # Initialize live dashboard mirror and artifact
    sync_dashboard(scope=clean_s, artifact_target=resolved_artifact_dir)
    print(f"[OK] Perpetual state & Teamwork Swarm initialized under: {scope_dir}")
    return state

def init_team_blackboard(scope: str = "default", goal: str = "") -> Dict[str, Any]:
    """Initialize or reset the team blackboard for inter-role coordination."""
    team_dir = get_team_dir(scope)
    os.makedirs(team_dir, exist_ok=True)
    os.makedirs(os.path.join(team_dir, "events"), exist_ok=True)
    blackboard_file = os.path.join(team_dir, "blackboard.json")
    
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    roles_def = {
        "architect": {
            "name": "Lead Architect & Orchestrator",
            "description": "Formulates milestones, roadmaps, and coordinates phase handoffs.",
            "status": "ready"
        },
        "auditor": {
            "name": "Red-Team Auditor & Invariant Skeptic",
            "description": "Adversarial review, probes 6 dimensions, hunts edge cases and security risks.",
            "status": "ready"
        },
        "implementer": {
            "name": "Surgical Systems Implementer",
            "description": "Executes minimal, high-precision code modifications.",
            "status": "ready"
        },
        "verifier": {
            "name": "Independent QA & Benchmark Gatekeeper",
            "description": "Executes unit tests, stress benchmarks, and inspects error logs.",
            "status": "ready"
        },
        "scout": {
            "name": "Autonomous Research & Skill Scout",
            "description": "Hunts authoritative RFCs, external documentation, and discovers skills.",
            "status": "ready"
        }
    }
    
    blackboard = {
        "scope": sanitize_scope(scope),
        "goal": goal,
        "updated_at": now_iso,
        "active_role": "architect",
        "roles": roles_def,
        "proposals": [],
        "votes": {},
        "events_count": 0,
        "consensus": {
            "phase": 1,
            "required_roles": MANDATORY_VOTING_ROLES,
            "status": "in_progress",
            "approved_by": [],
            "rejections": []
        }
    }
    
    atomic_write_json(blackboard_file, blackboard)
    return blackboard

def team_post(scope: str, role: str, action: str, summary: str, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Post an action or finding from a role to the shared blackboard and event stream."""
    clean_s = sanitize_scope(scope)
    clean_role = role.strip().lower()
    team_dir = get_team_dir(scope)
    bb_path = os.path.join(team_dir, "blackboard.json")
    
    if not os.path.exists(bb_path):
        init_team_blackboard(scope)
        
    with file_lock(bb_path):
        with open(bb_path, "r", encoding="utf-8") as f:
            bb = json.load(f)
            
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        bb["updated_at"] = now_iso
        bb["active_role"] = clean_role
        bb["events_count"] = bb.get("events_count", 0) + 1
        
        if clean_role in bb.get("roles", {}):
            bb["roles"][clean_role]["status"] = f"active: {action}"
            bb["roles"][clean_role]["last_action_at"] = now_iso
            
        event = {
            "event_id": bb["events_count"],
            "timestamp": now_iso,
            "role": clean_role,
            "action": action,
            "summary": summary,
            "details": details or {}
        }
        
        # Save individual event for deterministic audit replay
        event_path = os.path.join(team_dir, "events", f"event_{bb['events_count']:04d}_{clean_role}.json")
        atomic_write_json(event_path, event)
        atomic_write_json(bb_path, bb)
        
    try:
        sync_dashboard(clean_s)
    except Exception:
        pass
    print(f"[TEAM-POST] [{clean_role.upper()}] {action}: {summary}")
    return event

def team_propose(scope: str, proposal_id: str, title: str, description: str, proposed_by: str = "implementer") -> Dict[str, Any]:
    """Submit an architectural change or phase transition proposal for team review."""
    team_dir = get_team_dir(scope)
    bb_path = os.path.join(team_dir, "blackboard.json")
    if not os.path.exists(bb_path):
        init_team_blackboard(scope)
        
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    proposal = {
        "id": proposal_id,
        "title": title,
        "description": description,
        "proposed_by": proposed_by.lower(),
        "created_at": now_iso,
        "status": "under_review",
        "votes": {}
    }
    
    with file_lock(bb_path):
        with open(bb_path, "r", encoding="utf-8") as f:
            bb = json.load(f)
            
        # Replace existing proposal with same ID or append
        existing = [p for p in bb.get("proposals", []) if p.get("id") != proposal_id]
        existing.append(proposal)
        bb["proposals"] = existing
        bb["updated_at"] = now_iso
        
        # Reset votes for this proposal target
        if "votes" not in bb:
            bb["votes"] = {}
        bb["votes"][proposal_id] = {}
        
        atomic_write_json(bb_path, bb)
        
    team_post(scope, proposed_by, "submit_proposal", f"Proposal '{proposal_id}': {title}")
    return proposal

def team_vote(scope: str, role: str, target: str, vote: str, rationale: str) -> Dict[str, Any]:
    """Cast a role vote (PASS, REVISE, REJECT) with required rationale."""
    clean_role = role.strip().lower()
    vote_upper = vote.strip().upper()
    if vote_upper not in ["PASS", "REVISE", "REJECT"]:
        raise ValueError("Vote must be one of: PASS, REVISE, REJECT")
        
    team_dir = get_team_dir(scope)
    bb_path = os.path.join(team_dir, "blackboard.json")
    if not os.path.exists(bb_path):
        init_team_blackboard(scope)
        
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with file_lock(bb_path):
        with open(bb_path, "r", encoding="utf-8") as f:
            bb = json.load(f)
            
        if "votes" not in bb:
            bb["votes"] = {}
        if target not in bb["votes"]:
            bb["votes"][target] = {}
            
        vote_data = {
            "vote": vote_upper,
            "rationale": rationale,
            "timestamp": now_iso
        }
        bb["votes"][target][clean_role] = vote_data
        bb["updated_at"] = now_iso
        atomic_write_json(bb_path, bb)
        
    team_post(scope, clean_role, "cast_vote", f"Vote on [{target}]: {vote_upper} — {rationale}")
    return vote_data

def team_check_consensus(scope: str, target: Optional[str] = None) -> Tuple[bool, Dict[str, Any]]:
    """
    Check if mandatory voting roles have reached consensus on a target (phase or proposal).
    Consensus requires unanimous PASS from all MANDATORY_VOTING_ROLES.
    """
    clean_s = sanitize_scope(scope)
    scope_dir = get_scope_dir(clean_s)
    team_dir = get_team_dir(clean_s)
    bb_path = os.path.join(team_dir, "blackboard.json")
    state_path = os.path.join(scope_dir, "state.json")
    
    if not os.path.exists(bb_path):
        return False, {"error": "Blackboard not found"}
        
    with file_lock(bb_path):
        with open(bb_path, "r", encoding="utf-8") as f:
            bb = json.load(f)
        
    if not target:
        # Default to current active phase
        if os.path.exists(state_path):
            with open(state_path, "r", encoding="utf-8") as sf:
                st = json.load(sf)
                target = f"phase_{st.get('current_phase', 1)}"
        else:
            target = "phase_1"
            
    votes_for_target = bb.get("votes", {}).get(target, {})
    approved_by = []
    rejections = []
    revisions = []
    missing_roles = []
    
    for r in MANDATORY_VOTING_ROLES:
        if r not in votes_for_target:
            missing_roles.append(r)
        else:
            v_info = votes_for_target[r]
            v_val = v_info.get("vote", "")
            if v_val == "PASS":
                approved_by.append(r)
            elif v_val == "REVISE":
                revisions.append((r, v_info.get("rationale", "")))
            elif v_val == "REJECT":
                rejections.append((r, v_info.get("rationale", "")))
                
    consensus_achieved = (len(missing_roles) == 0 and len(rejections) == 0 and len(revisions) == 0 and len(approved_by) == len(MANDATORY_VOTING_ROLES))
    
    consensus_report = {
        "target": target,
        "consensus_achieved": consensus_achieved,
        "required_roles": MANDATORY_VOTING_ROLES,
        "approved_by": approved_by,
        "missing_roles": missing_roles,
        "revisions_requested": revisions,
        "rejections": rejections
    }
    
    # Update consensus node in blackboard
    bb["consensus"] = {
        "target": target,
        "status": "achieved" if consensus_achieved else "pending",
        "approved_by": approved_by,
        "rejections": [f"{r}: {msg}" for r, msg in rejections + revisions]
    }
    
    # Update proposal status if target matches a proposal
    for prop in bb.get("proposals", []):
        if prop.get("id") == target:
            if consensus_achieved:
                prop["status"] = "approved"
            elif rejections:
                prop["status"] = "rejected"
            elif revisions:
                prop["status"] = "revisions_requested"
                
    atomic_write_json(bb_path, bb)

    # Sync consensus state to state.json if target is active phase
    if os.path.exists(state_path):
        with file_lock(state_path):
            with open(state_path, "r", encoding="utf-8") as sf:
                st = json.load(sf)
            if target == f"phase_{st.get('current_phase', 1)}":
                st["active_phase"]["consensus_reached"] = consensus_achieved
                atomic_write_json(state_path, st)
                
    return consensus_achieved, consensus_report

def record_metric(scope: str, name: str, value: float, unit: str = "", baseline: Optional[float] = None, better: str = "auto") -> Dict[str, Any]:
    """
    Record an empirical metric with baseline and delta calculation for positive feedback loop.
    Enforces finite numeric values (RFC 8259 compliance).
    Supports explicit directionality (better='higher'|'lower'|'auto').
    """
    try:
        val_float = float(value)
    except (ValueError, TypeError):
        raise ValueError(f"Metric value must be a valid number, got: {value}")
        
    if not math.isfinite(val_float):
        raise ValueError(f"Metric value must be a finite number (RFC 8259), got: {value}")
        
    if baseline is not None:
        try:
            base_float = float(baseline)
        except (ValueError, TypeError):
            raise ValueError(f"Metric baseline must be a valid number, got: {baseline}")
        if not math.isfinite(base_float):
            raise ValueError(f"Metric baseline must be a finite number (RFC 8259), got: {baseline}")
    else:
        base_float = None

    clean_better = better.strip().lower()
    if clean_better not in ["higher", "lower", "auto"]:
        raise ValueError("Parameter 'better' must be one of: 'higher', 'lower', 'auto'")
        
    clean_s = sanitize_scope(scope)
    scope_dir = get_scope_dir(clean_s)
    state_path = os.path.join(scope_dir, "state.json")
    
    if not os.path.exists(state_path):
        init_workspace(scope=clean_s)
        
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with file_lock(state_path):
        with open(state_path, "r", encoding="utf-8") as f:
            state = json.load(f)
            
        metrics = state.get("metrics", {})
        existing = metrics.get(name, {})
        base_val = base_float if base_float is not None else existing.get("baseline", val_float)
        prev_val = existing.get("current", val_float)
        delta = val_float - base_val
        step_delta = val_float - prev_val
        
        # Determine optimization direction policy
        resolved_better = clean_better
        if resolved_better == "auto":
            n_lower = name.lower()
            positive_indicators = ["fix", "resolved", "pass", "success", "ratio", "score", "efficiency", "free", "available", "count", "throughput", "rps", "qps"]
            negative_indicators = ["latency", "duration", "error", "churn", "alloc", "leak", "bug", "fail", "cost", "timeout", "regression"]
            if any(term in n_lower for term in positive_indicators):
                resolved_better = "higher"
            elif any(term in n_lower for term in negative_indicators):
                resolved_better = "lower"
            else:
                resolved_better = "higher"
                
        entry = {
            "name": name,
            "value": val_float,
            "unit": unit,
            "baseline": base_val,
            "current": val_float,
            "delta_from_baseline": delta,
            "step_delta": step_delta,
            "better": resolved_better,
            "updated_at": now_iso
        }
        
        metrics[name] = entry
        state["metrics"] = metrics
        atomic_write_json(state_path, state)
        
    try:
        sync_dashboard(clean_s)
    except Exception:
        pass
    print(f"[METRIC] '{name}': {val_float}{unit} (Baseline: {base_val}{unit}, Delta: {delta:+}{unit}, StepDelta: {step_delta:+}{unit}, Policy: {resolved_better})")
    return entry

def evaluate_feedback_loop(scope: str) -> Dict[str, Any]:
    """
    Evaluate the positive feedback loop across tracked metrics and recent phase outcomes.
    Evaluates both overall baseline delta and immediate step delta.
    Flags step regressions even when cumulative delta remains positive.
    """
    clean_s = sanitize_scope(scope)
    scope_dir = get_scope_dir(clean_s)
    state_path = os.path.join(scope_dir, "state.json")
    journal_path = os.path.join(scope_dir, "findings_journal.md")
    
    if not os.path.exists(state_path):
        return {"error": "State not found"}
        
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    with file_lock(state_path):
        with open(state_path, "r", encoding="utf-8") as f:
            state = json.load(f)
            
        metrics = state.get("metrics", {})
        fb = state.get("feedback_loop", {
            "evaluations_count": 0,
            "positive_reinforcements": 0,
            "regressions_detected": 0,
            "last_evaluated_at": None
        })
        
        improvements = []
        regressions = []
        step_regressions = []
        neutral = []
        
        for k, v in metrics.items():
            delta = v.get("delta_from_baseline", 0.0)
            step_delta = v.get("step_delta", 0.0)
            unit = v.get("unit", "")
            better = v.get("better", "higher")
            
            is_improvement = (delta < 0 if better == "lower" else delta > 0)
            is_baseline_regression = (delta > 0 if better == "lower" else delta < 0)
            is_step_regression = (step_delta > 0 if better == "lower" else step_delta < 0)
            
            if is_step_regression:
                step_regressions.append((k, step_delta, unit))
                
            if is_baseline_regression:
                regressions.append((k, delta, unit))
            elif is_improvement:
                improvements.append((k, delta, unit))
            else:
                neutral.append(k)
                
        fb["evaluations_count"] = fb.get("evaluations_count", 0) + 1
        fb["last_evaluated_at"] = now_iso
        
        all_regressions = list(set([r[0] for r in regressions + step_regressions]))
        
        feedback_result = "neutral"
        if all_regressions:
            fb["regressions_detected"] = fb.get("regressions_detected", 0) + 1
            feedback_result = "regression_detected"
            reg_names = ", ".join(all_regressions)
            corrective_item = f"Phase {state['current_phase'] + 1} Fix: Remediate metric regressions in [{reg_names}]"
            if corrective_item not in state.get("backlog", []):
                state["backlog"].insert(0, corrective_item)
        elif improvements:
            fb["positive_reinforcements"] = fb.get("positive_reinforcements", 0) + 1
            feedback_result = "positive_improvement"
        else:
            feedback_result = "neutral"
            
        state["feedback_loop"] = fb
        atomic_write_json(state_path, state)
        
    # Append feedback summary to journal
    if os.path.exists(journal_path):
        with open(journal_path, "a", encoding="utf-8") as jf:
            jf.write(f"\n### 🔄 Feedback Loop Evaluation (Cycle {fb['evaluations_count']})\n")
            jf.write(f"**Timestamp**: {now_iso}\n")
            jf.write(f"**Outcome**: `{feedback_result}`\n")
            if improvements:
                jf.write(f"- 🟢 **Improvements**: " + ", ".join([f"{n} ({d:+}{u})" for n, d, u in improvements]) + "\n")
            if regressions:
                jf.write(f"- 🔴 **Baseline Regressions**: " + ", ".join([f"{n} ({d:+}{u})" for n, d, u in regressions]) + "\n")
            if step_regressions:
                jf.write(f"- ⚠️ **Step Regressions**: " + ", ".join([f"{n} ({d:+}{u})" for n, d, u in step_regressions]) + "\n")
            jf.write("\n")
            
    summary = {
        "status": feedback_result,
        "evaluations_count": fb["evaluations_count"],
        "improvements": improvements,
        "regressions": regressions,
        "step_regressions": step_regressions,
        "neutral": neutral
    }
    print(f"[FEEDBACK-LOOP] Outcome: {feedback_result}. Improvements: {len(improvements)}, Regressions: {len(regressions)}, Step Regressions: {len(step_regressions)}")
    return summary

def parse_duration_string(val_str: str) -> int:
    """Parse duration string into integer seconds (supports 3h, 180m, 10800s, 3 hours, 3 ساعت)."""
    s = str(val_str).strip().lower()
    # Match hours
    m = re.match(r"^(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours|ساعت)?$", s)
    if m and any(unit in s for unit in ["h", "hr", "hour", "ساعت"]):
        return int(float(m.group(1)) * 3600)
    # Match minutes
    m = re.match(r"^(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes|دقیقه)?$", s)
    if m and any(unit in s for unit in ["m", "min", "دقیقه"]):
        return int(float(m.group(1)) * 60)
    # Match seconds
    m = re.match(r"^(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds|ثانیه)?$", s)
    if m:
        return int(float(m.group(1)))
    try:
        return int(float(s))
    except ValueError:
        raise ValueError(f"Cannot parse duration from '{val_str}'")

def parse_deadline_string(val_str: str) -> str:
    """Parse clock time (e.g. '08:00', '8:00', '14:30') or ISO datetime into target ISO datetime."""
    s = str(val_str).strip()
    m = re.match(r"^(\d{1,2}):(\d{2})(?::(\d{2}))?$", s)
    if m:
        now = datetime.datetime.now(datetime.timezone.utc)
        # Convert local time to target
        target_h = int(m.group(1))
        target_m = int(m.group(2))
        target_s = int(m.group(3)) if m.group(3) else 0
        target_dt = now.replace(hour=target_h, minute=target_m, second=target_s, microsecond=0)
        if target_dt <= now:
            target_dt += datetime.timedelta(days=1)
        return target_dt.isoformat()
    return s

def set_budget(scope: str, b_type: str, b_val: Optional[str] = None) -> Dict[str, Any]:
    """Set a termination budget constraint for the perpetual engine."""
    clean_s = sanitize_scope(scope)
    scope_dir = get_scope_dir(clean_s)
    state_file = os.path.join(scope_dir, "state.json")
    if not os.path.exists(state_file):
        raise FileNotFoundError(f"Scope state not found: {state_file}")
        
    b_type = b_type.lower().strip()
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    with file_lock(state_file):
        with open(state_file, "r", encoding="utf-8") as f:
            state = json.load(f)
            
        budget = {
            "type": b_type,
            "started_at": now_iso,
            "duration_seconds": None,
            "deadline_iso": None,
            "target_phases": None,
            "can_stop": False,
            "reason": ""
        }
        
        if b_type == "infinite":
            budget["reason"] = "Infinite perpetual mode active. Must not stop without explicit user stop command."
        elif b_type in ("duration", "time"):
            if not b_val:
                raise ValueError("duration budget requires a value (e.g. 10800, 3h, 180m)")
            dur_secs = parse_duration_string(b_val)
            budget["type"] = "duration"
            budget["duration_seconds"] = dur_secs
            budget["reason"] = f"Duration budget set: {dur_secs}s ({dur_secs // 60}m)."
        elif b_type in ("deadline", "until"):
            if not b_val:
                raise ValueError("deadline budget requires a time string (e.g. 08:00, 2026-09-29T08:00:00)")
            dead_iso = parse_deadline_string(b_val)
            budget["type"] = "deadline"
            budget["deadline_iso"] = dead_iso
            budget["reason"] = f"Deadline budget set until {dead_iso}."
        elif b_type in ("phases", "phase_count"):
            if not b_val:
                raise ValueError("phases budget requires an integer phase count (e.g. 20)")
            p_cnt = int(b_val)
            budget["type"] = "phases"
            budget["target_phases"] = p_cnt
            budget["reason"] = f"Phase budget set: {p_cnt} phases total."
        else:
            raise ValueError(f"Unknown budget type: {b_type}. Supported: infinite, duration, deadline, phases")
            
        state["budget"] = budget
        atomic_write_json(state_file, state)
        
    print(f"[OK] Budget set for scope '{clean_s}': {budget['reason']}")
    return budget

def check_budget(scope: str = "default") -> Tuple[bool, Dict[str, Any]]:
    """
    Check whether the current budget constraint allows stopping.
    Returns: (can_stop: bool, info: dict)
    """
    clean_s = sanitize_scope(scope)
    scope_dir = get_scope_dir(clean_s)
    state_file = os.path.join(scope_dir, "state.json")
    if not os.path.exists(state_file):
        return True, {"can_stop": True, "reason": "State file not found"}
        
    with open(state_file, "r", encoding="utf-8") as f:
        state = json.load(f)
        
    budget = state.get("budget", {
        "type": "infinite",
        "started_at": state.get("started_at")
    })
    b_type = budget.get("type", "infinite")
    now_dt = datetime.datetime.now(datetime.timezone.utc)
    
    # 1. Infinite
    if b_type == "infinite":
        return False, {
            "can_stop": False,
            "type": "infinite",
            "reason": "Infinite perpetual mode active. You are STRICTLY FORBIDDEN from stopping or yielding until the user explicitly sends 'کافیه' or 'stop'. Proactively synthesize next-horizon phases and continue working!"
        }
        
    # 2. Duration
    if b_type == "duration":
        started_str = budget.get("started_at") or state.get("started_at")
        try:
            started_dt = datetime.datetime.fromisoformat(started_str.replace("Z", "+00:00"))
        except Exception:
            started_dt = now_dt
        dur_secs = budget.get("duration_seconds", 0)
        elapsed = (now_dt - started_dt).total_seconds()
        remaining = dur_secs - elapsed
        if remaining > 0:
            rem_m = int(remaining / 60)
            rem_s = int(remaining % 60)
            return False, {
                "can_stop": False,
                "type": "duration",
                "remaining_seconds": int(remaining),
                "remaining_human": f"{rem_m}m {rem_s}s",
                "reason": f"Duration budget still active ({rem_m}m {rem_s}s remaining). You MUST NOT STOP. Even if initial checklist items are finished, immediately synthesize and execute next-horizon evolutionary phases!"
            }
        else:
            return True, {
                "can_stop": True,
                "type": "duration",
                "reason": "Duration budget fulfilled."
            }
            
    # 3. Deadline
    if b_type == "deadline":
        deadline_str = budget.get("deadline_iso")
        try:
            deadline_dt = datetime.datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
        except Exception:
            deadline_dt = now_dt
        if now_dt < deadline_dt:
            rem_secs = (deadline_dt - now_dt).total_seconds()
            rem_m = int(rem_secs / 60)
            return False, {
                "can_stop": False,
                "type": "deadline",
                "remaining_seconds": int(rem_secs),
                "reason": f"Deadline not yet reached ({rem_m} minutes remaining until {deadline_str}). Continuous execution required!"
            }
        else:
            return True, {
                "can_stop": True,
                "type": "deadline",
                "reason": f"Deadline reached ({deadline_str})."
            }
            
    # 4. Phase count
    if b_type == "phases":
        target_phases = budget.get("target_phases", 1)
        completed_count = len(state.get("completed_phases", []))
        if completed_count < target_phases:
            rem_p = target_phases - completed_count
            return False, {
                "can_stop": False,
                "type": "phases",
                "completed": completed_count,
                "target": target_phases,
                "remaining_phases": rem_p,
                "reason": f"Phase budget active: {completed_count}/{target_phases} phases completed ({rem_p} phases remaining). Must advance to next phase immediately!"
            }
        else:
            return True, {
                "can_stop": True,
                "type": "phases",
                "completed": completed_count,
                "target": target_phases,
                "reason": f"Phase budget fulfilled: {completed_count}/{target_phases} completed."
            }
            
    return False, {"can_stop": False, "reason": "Unknown budget type; continuing perpetual execution."}

def git_auto_commit_phase(scope: str, phase_num: int, title: str) -> bool:
    """
    Automatically commit workspace changes to Git at the end of each phase.
    Enforces the Zero Uncommitted Code invariant between perpetual phases.
    """
    try:
        check_git = subprocess.run(["git", "rev-parse", "--is-inside-work-tree"], capture_output=True, text=True, timeout=5)
        if check_git.returncode != 0 or check_git.stdout.strip() != "true":
            return False
            
        status_proc = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True, timeout=10)
        if status_proc.returncode == 0 and status_proc.stdout.strip():
            subprocess.run(["git", "add", "-A"], capture_output=True, text=True, timeout=15)
            clean_title = re.sub(r"^Phase\s+\d+:\s*", "", title).strip()
            commit_msg = f"feat(perpetual): complete phase {phase_num} - {clean_title[:80]}"
            commit_proc = subprocess.run(["git", "commit", "-m", commit_msg], capture_output=True, text=True, timeout=15)
            if commit_proc.returncode == 0:
                print(f"[GIT-AUTO-COMMIT] ✅ Phase {phase_num} automatically committed to Git: '{commit_msg}'")
                return True
            else:
                msg = commit_proc.stderr.strip() or commit_proc.stdout.strip()
                if msg:
                    print(f"[GIT-AUTO-COMMIT] ℹ️ Git commit output: {msg}")
        else:
            print(f"[GIT-AUTO-COMMIT] ℹ️ Working tree clean — no unstaged changes to commit for Phase {phase_num}.")
    except Exception as e:
        print(f"[GIT-AUTO-COMMIT] ⚠️ Notice: Auto-commit skipped: {e}")
    return False

def advance_phase(scope: str = "default", summary_findings: str = "Completed objectives successfully.", next_title: Optional[str] = None, enforce_consensus: bool = True, artifact_dir: Optional[str] = None) -> bool:
    """
    Advance to next phase.
    If enforce_consensus is True and team_enabled, verifies that consensus was achieved before advancing!
    Synchronizes phase_queue.md markdown checkboxes and active markers accurately.
    Ensures backlog is NEVER exhausted as long as budget or infinite perpetual mode is active.
    Automatically regenerates and synchronizes the live dashboard artifact.
    """
    clean_s = sanitize_scope(scope)
    scope_dir = get_scope_dir(clean_s)
    state_file = os.path.join(scope_dir, "state.json")
    journal_file = os.path.join(scope_dir, "findings_journal.md")
    queue_file = os.path.join(scope_dir, "phase_queue.md")
    
    if not os.path.exists(state_file):
        print(f"[ERROR] {state_file} not found for scope '{clean_s}'. Run init first.", file=sys.stderr)
        return False
        
    with file_lock(state_file):
        with open(state_file, "r", encoding="utf-8") as f:
            state = json.load(f)
            
        curr_num = state["current_phase"]
        phase_target = f"phase_{curr_num}"
        
        # Enforce consensus gate if team is enabled
        achieved = True
        approved_by = []
        if enforce_consensus and state.get("team_enabled", False):
            achieved, report = team_check_consensus(clean_s, phase_target)
            if not achieved:
                print(f"[BLOCKED] Phase {curr_num} cannot advance without consensus! Missing/rejected: {report}", file=sys.stderr)
                return False
            approved_by = report.get("approved_by", [])
            
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        state["completed_phases"].append({
            "phase_number": curr_num,
            "title": state["active_phase"].get("title", f"Phase {curr_num}"),
            "completed_at": now_iso,
            "summary": summary_findings,
            "consensus_approved_by": approved_by
        })
        
        # Trigger automatic Git commit for the completed phase
        git_auto_commit_phase(clean_s, curr_num, state["completed_phases"][-1].get("title", ""))
        
        new_num = curr_num + 1
        state["current_phase"] = new_num
        
        # Check budget status
        can_stop, b_info = check_budget(clean_s)
        
        # Next-Horizon Evolutionary Horizons pool to prevent checklist exhaustion
        EVOLUTION_HORIZONS = [
            "Mobile & Touch Ergonomics Audit (Viewport, Hit Slops & Tap Targets)",
            "Frame-Rate & Motion Optimization (60fps Spring Physics & Layout Thrashing Mitigation)",
            "Accessibility & Screen-Reader Hardening (ARIA-Live, WCAG AAA Contrast & Keyboard Navigation)",
            "Memory Footprint & Garbage Collection Profiling (Virtualization & Heap Ergonomics)",
            "Offline State & Resilient Storage (IndexedDB Sync & Optimistic UI Reconciliation)",
            "Automated End-to-End Behavioral Verification (Playwright Interaction Assertions)",
            "Bundle Size & Code Splitting Optimization (Tree-shaking & Dynamic Imports)",
            "Micro-Interaction & Tactile Audio Polish (Sound Design & Haptic Cues)"
        ]
        
        # Handle next_title and backlog replenishment
        existing_backlog = state.get("backlog", [])
        if next_title:
            clean_next = next_title.strip()
            existing_backlog = [item for item in existing_backlog if item.strip() != clean_next and not item.startswith(f"Phase {new_num}:")]
        elif existing_backlog:
            next_title = existing_backlog.pop(0)
        else:
            next_title = f"Phase {new_num}: {EVOLUTION_HORIZONS[0]}"
            
        # Automatically replenish backlog if low so engine NEVER stops
        if len(existing_backlog) < 3 and not can_stop:
            for item in EVOLUTION_HORIZONS:
                horizon_title = f"Phase {new_num + len(existing_backlog) + 1}: {item}"
                clean_kw = item.split("(")[0].strip()
                if not any(clean_kw in b for b in existing_backlog) and clean_kw not in next_title:
                    existing_backlog.append(horizon_title)
                    if len(existing_backlog) >= 5:
                        break
                        
        state["backlog"] = existing_backlog
            
        state["active_phase"] = {
            "phase_number": new_num,
            "title": next_title,
            "criteria": [],
            "consensus_reached": False
        }
        
        if "budget" in state:
            state["budget"]["can_stop"] = can_stop
            state["budget"]["status_note"] = b_info.get("reason", "")
        
        atomic_write_json(state_file, state)
        
    # Update findings journal
    if os.path.exists(journal_file):
        with open(journal_file, "a", encoding="utf-8") as f:
            f.write(f"\n## 📌 Phase {curr_num}: {state['completed_phases'][-1].get('title', '')}\n")
            f.write(f"**Completed At**: {now_iso}\n\n")
            f.write(f"{summary_findings}\n\n---\n")
            
    # Update Phase Queue checkboxes accurately
    if os.path.exists(queue_file):
        with open(queue_file, "r", encoding="utf-8") as qf:
            q_lines = qf.readlines()
            
        new_lines = []
        phase_new_found = False
        
        for line in q_lines:
            # Check off curr_num line
            if re.search(rf"- \[[ x]\]\s*(?:\*\*)?Phase\s+{curr_num}(?:\*\*)?:?", line):
                line = re.sub(rf"- \[[ x]\]\s*(?:\*\*)?Phase\s+{curr_num}(?:\*\*)?:?", f"- [x] **Phase {curr_num}**:", line)
                line = line.replace("*(IN PROGRESS)*", "").strip() + "\n"
            # Remove any stray IN PROGRESS tags
            elif "*(IN PROGRESS)*" in line:
                line = line.replace("*(IN PROGRESS)*", "").rstrip() + "\n"
                
            # If line is the new_num phase, mark it in progress
            if re.search(rf"- \[[ x]\]\s*(?:\*\*)?Phase\s+{new_num}(?:\*\*)?:?", line):
                line = re.sub(rf"- \[[ x]\]\s*(?:\*\*)?Phase\s+{new_num}(?:\*\*)?:?", f"- [ ] **Phase {new_num}**:", line)
                line = line.rstrip() + " *(IN PROGRESS)*\n"
                phase_new_found = True
                
            new_lines.append(line)
            
        if not phase_new_found:
            clean_title = re.sub(rf"^Phase\s+{new_num}:\s*", "", next_title)
            new_lines.append(f"- [ ] **Phase {new_num}**: {clean_title} *(IN PROGRESS)*\n")
            
        with open(queue_file, "w", encoding="utf-8") as qf:
            qf.writelines(new_lines)
            
    # Reset team consensus for new phase
    team_dir = get_team_dir(clean_s)
    bb_path = os.path.join(team_dir, "blackboard.json")
    if os.path.exists(bb_path):
        with file_lock(bb_path):
            with open(bb_path, "r", encoding="utf-8") as bf:
                bb = json.load(bf)
            bb["consensus"] = {
                "phase": new_num,
                "target": f"phase_{new_num}",
                "required_roles": MANDATORY_VOTING_ROLES,
                "status": "in_progress",
                "approved_by": [],
                "rejections": []
            }
            atomic_write_json(bb_path, bb)
            
    team_post(clean_s, "architect", "advance_phase", f"Advanced from Phase {curr_num} to Phase {new_num}: {next_title}")
    try:
        sync_dashboard(clean_s, artifact_target=artifact_dir)
    except Exception:
        pass
    print(f"[OK] Scope '{clean_s}': Completed Phase {curr_num}. Advanced to Phase {new_num}: {next_title}")
    print(f"[BUDGET-STATUS] Can Stop: {can_stop} | Note: {b_info.get('reason')}")
    print("[CRITICAL ANTI-FREEZE MANDATE] You MUST include a tool call (such as 'schedule' watchdog or the next execution command) in this response. DO NOT emit pure conversational text, or the IDE will freeze the session!")
    return True

def halt_engine(scope: str = "default", force: bool = False) -> bool:
    """Gracefully halt engine (blocks unauthorized early stop if budget active unless --force)."""
    clean_s = sanitize_scope(scope)
    scope_dir = get_scope_dir(clean_s)
    state_file = os.path.join(scope_dir, "state.json")
    if not os.path.exists(state_file):
        return True
        
    can_stop, b_info = check_budget(clean_s)
    if not can_stop and not force:
        print(f"[BLOCKED] Cannot halt perpetual engine: User budget is still active!\nReason: {b_info.get('reason')}\nTo override, pass --force.", file=sys.stderr)
        return False
        
    with file_lock(state_file):
        with open(state_file, "r", encoding="utf-8") as f:
            state = json.load(f)
        state["status"] = "halted_gracefully"
        atomic_write_json(state_file, state)
    team_post(clean_s, "architect", "halt_engine", "Perpetual engine halted gracefully upon user request.")
    try:
        sync_dashboard(clean_s)
    except Exception:
        pass
    print(f"[OK] Perpetual engine scope '{clean_s}' set to halted_gracefully.")
    return True

def print_team_status(scope: str = "default") -> None:
    """Print clean summary of team status, blackboard, and metrics."""
    clean_s = sanitize_scope(scope)
    scope_dir = get_scope_dir(clean_s)
    team_dir = get_team_dir(clean_s)
    state_path = os.path.join(scope_dir, "state.json")
    bb_path = os.path.join(team_dir, "blackboard.json")
    
    if not os.path.exists(state_path):
        print(f"[ERROR] Scope '{clean_s}' not initialized.")
        return
        
    if not os.path.exists(bb_path):
        init_team_blackboard(clean_s)
        
    with open(state_path, "r", encoding="utf-8") as sf:
        st = json.load(sf)
    with open(bb_path, "r", encoding="utf-8") as bf:
        bb = json.load(bf)
        
    print("=" * 60)
    print(f"🛰️  PERPETUAL ENGINE TEAM BLACKBOARD — [{clean_s}]")
    print("=" * 60)
    print(f"Goal: {st.get('goal')}")
    print(f"Status: {st.get('status')} | Phase: {st.get('current_phase')}")
    print(f"Active Role: {bb.get('active_role', 'none').upper()}")
    print("-" * 60)
    print("👥 Team Roles:")
    for r_key, r_info in bb.get("roles", {}).items():
        print(f"  • {r_key.upper():<12}: {r_info.get('status', 'idle')} ({r_info.get('name')})")
        
    proposals = bb.get("proposals", [])
    if proposals:
        print("-" * 60)
        print("📜 Active Proposals:")
        for p in proposals:
            p_id = p.get("id")
            p_st = p.get("status", "unknown").upper()
            p_tit = p.get("title", "")
            p_by = p.get("proposed_by", "unknown").upper()
            print(f"  [{p_st:<19}] {p_id} by {p_by}: {p_tit}")
            
    print("-" * 60)
    curr_target = f"phase_{st.get('current_phase', 1)}"
    votes = bb.get("votes", {}).get(curr_target, {})
    print(f"🗳️  Consensus Status for [{curr_target}]:")
    for req in MANDATORY_VOTING_ROLES:
        v = votes.get(req, {})
        v_str = v.get("vote", "PENDING")
        v_rat = f" — {v.get('rationale')}" if "rationale" in v else ""
        print(f"  [{v_str:<7}] {req.upper()}{v_rat}")
        
    metrics = st.get("metrics", {})
    if metrics:
        print("-" * 60)
        print("📊 Tracked Metrics & Feedback Deltas:")
        for m_name, m_val in metrics.items():
            delta = m_val.get("delta_from_baseline", 0)
            u = m_val.get("unit", "")
            better = m_val.get("better", "higher")
            print(f"  • {m_name:<25}: {m_val.get('value')}{u} (Base: {m_val.get('baseline')}{u}, Delta: {delta:+}{u}, Better: {better})")
    print("=" * 60)

if __name__ == "__main__":
    def get_arg_flag(flag: str, default: Optional[str] = None) -> Optional[str]:
        if flag in sys.argv:
            idx = sys.argv.index(flag)
            if idx + 1 < len(sys.argv) and not sys.argv[idx + 1].startswith("--"):
                return sys.argv[idx + 1]
        return default

    if len(sys.argv) < 2:
        print("Usage: perpetual_state.py <command> [args...]")
        print("Commands:")
        print("  init <goal> [scope] [mode] [--artifact-dir <dir>]")
        print("  advance [scope] [summary] [next_title] [--force] [--artifact-dir <dir>]")
        print("  sync-dashboard [scope] [artifact_target]")
        print("  set-artifact-dir <scope> <artifact_dir_path>")
        print("  halt [scope] [--force]")
        print("  set-budget <scope> <duration|deadline|phases|infinite> [value]")
        print("  check-budget [scope]")
        print("  team-post <scope> <role> <action> <summary>")
        print("  team-propose <scope> <prop_id> <title> <description> [proposed_by]")
        print("  team-vote <scope> <role> <target> <PASS|REVISE|REJECT> <rationale>")
        print("  team-consensus <scope> [target]")
        print("  team-status [scope]")
        print("  metric-record <scope> <name> <value> [unit] [baseline] [better: higher|lower|auto]")
        print("  feedback-eval <scope>")
        sys.exit(1)
        
    cmd = sys.argv[1].lower()
    
    if cmd == "init":
        g = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else "Autonomous Engineering Optimization"
        s = sys.argv[3] if len(sys.argv) > 3 and not sys.argv[3].startswith("--") else "default"
        m = sys.argv[4] if len(sys.argv) > 4 and not sys.argv[4].startswith("--") else "teamwork_swarm"
        art_dir = get_arg_flag("--artifact-dir")
        init_workspace(g, s, m, artifact_dir=art_dir)
    elif cmd == "advance":
        s = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else "default"
        sum_f = sys.argv[3] if len(sys.argv) > 3 and not sys.argv[3].startswith("--") else "Completed objectives successfully."
        next_t = sys.argv[4] if len(sys.argv) > 4 and not sys.argv[4].startswith("--") else None
        force = "--force" in sys.argv
        art_dir = get_arg_flag("--artifact-dir")
        ok = advance_phase(s, sum_f, next_t, enforce_consensus=not force, artifact_dir=art_dir)
        sys.exit(0 if ok else 2)
    elif cmd == "sync-dashboard":
        s = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else "default"
        t = sys.argv[3] if len(sys.argv) > 3 and not sys.argv[3].startswith("--") else get_arg_flag("--artifact-dir")
        sync_dashboard(s, artifact_target=t)
    elif cmd == "set-artifact-dir":
        if len(sys.argv) < 4:
            print("Usage: set-artifact-dir <scope> <artifact_dir_path>")
            sys.exit(1)
        s = sys.argv[2]
        p = sys.argv[3]
        set_artifact_dir(s, p)
    elif cmd == "halt":
        s = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else "default"
        force = "--force" in sys.argv
        ok = halt_engine(s, force=force)
        sys.exit(0 if ok else 2)
    elif cmd == "set-budget":
        if len(sys.argv) < 4:
            print("Usage: set-budget <scope> <duration|deadline|phases|infinite> [value]")
            sys.exit(1)
        s = sys.argv[2]
        b_type = sys.argv[3]
        b_val = sys.argv[4] if len(sys.argv) > 4 else None
        set_budget(s, b_type, b_val)
    elif cmd == "check-budget":
        s = sys.argv[2] if len(sys.argv) > 2 else "default"
        can_stop, rep = check_budget(s)
        print(json.dumps(rep, indent=2))
        sys.exit(0 if can_stop else 1)
    elif cmd == "team-post":
        if len(sys.argv) < 6:
            print("Usage: team-post <scope> <role> <action> <summary>")
            sys.exit(1)
        team_post(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])
    elif cmd == "team-propose":
        if len(sys.argv) < 6:
            print("Usage: team-propose <scope> <prop_id> <title> <description> [proposed_by]")
            sys.exit(1)
        p_by = sys.argv[6] if len(sys.argv) > 6 else "implementer"
        team_propose(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], p_by)
    elif cmd == "team-vote":
        if len(sys.argv) < 7:
            print("Usage: team-vote <scope> <role> <target> <PASS|REVISE|REJECT> <rationale>")
            sys.exit(1)
        team_vote(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6])
    elif cmd == "team-consensus":
        s = sys.argv[2] if len(sys.argv) > 2 else "default"
        t = sys.argv[3] if len(sys.argv) > 3 else None
        achieved, rep = team_check_consensus(s, t)
        print(json.dumps(rep, indent=2))
        sys.exit(0 if achieved else 2)
    elif cmd == "team-status":
        s = sys.argv[2] if len(sys.argv) > 2 else "default"
        print_team_status(s)
    elif cmd == "metric-record":
        if len(sys.argv) < 5:
            print("Usage: metric-record <scope> <name> <value> [unit] [baseline] [better: higher|lower|auto]")
            sys.exit(1)
        s = sys.argv[2]
        name = sys.argv[3]
        try:
            val = float(sys.argv[4])
        except ValueError:
            print(f"Error: metric value '{sys.argv[4]}' is not a valid number", file=sys.stderr)
            sys.exit(1)
        unit = sys.argv[5] if len(sys.argv) > 5 else ""
        base = None
        if len(sys.argv) > 6 and sys.argv[6] != "":
            try:
                base = float(sys.argv[6])
            except ValueError:
                print(f"Error: metric baseline '{sys.argv[6]}' is not a valid number", file=sys.stderr)
                sys.exit(1)
        better = sys.argv[7] if len(sys.argv) > 7 else "auto"
        record_metric(s, name, val, unit, base, better)
    elif cmd == "feedback-eval":
        s = sys.argv[2] if len(sys.argv) > 2 else "default"
        evaluate_feedback_loop(s)
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
