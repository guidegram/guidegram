import json
import os
import sys
from datetime import datetime
from collections import Counter, defaultdict
import statistics

# Force UTF-8 output
sys.stdout.reconfigure(encoding="utf-8")

DATASET_PATH = r"D:\download\Telegram Desktop\ChatExport_2026-09-13\result.json"

def extract_message_text(m: dict) -> str:
    te = m.get("text_entities")
    if te:
        return "".join(e.get("text", "") if isinstance(e, dict) else str(e) for e in te).strip()
    t = m.get("text")
    if isinstance(t, str):
        return t.strip()
    if isinstance(t, list):
        return "".join(e.get("text", "") if isinstance(e, dict) else str(e) for e in t).strip()
    rm = m.get("rich_message")
    if rm and isinstance(rm, dict):
        text_buf = []
        for block in rm.get("blocks", []):
            if isinstance(block, dict):
                for sub in block.get("content", []):
                    if isinstance(sub, str): text_buf.append(sub)
                    elif isinstance(sub, dict) and "text" in sub: text_buf.append(sub["text"])
        return " ".join(text_buf).strip()
    return ""

def main():
    print("=" * 80)
    print("EMPIRICAL ORACLE: 64GRAM COMMUNITY INSIGHTS VERIFICATION")
    print("=" * 80)

    if not os.path.exists(DATASET_PATH):
        print(f"FATAL: Dataset not found at {DATASET_PATH}")
        sys.exit(1)

    file_size_bytes = os.path.getsize(DATASET_PATH)
    file_size_mb_dec = file_size_bytes / 1_000_000
    file_size_mib = file_size_bytes / (1024 * 1024)
    print(f"[1] Dataset File Metadata:")
    print(f"    - Exact bytes on disk: {file_size_bytes:,}")
    print(f"    - Decimal MB:          {file_size_mb_dec:.4f} MB")
    print(f"    - Report claim:        19,565,777 bytes (19.565 MB decimal / 18.66 MiB binary) [MATCH: {file_size_bytes == 19565777}]")

    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"\n[2] Root Container Attributes:")
    chat_name = data.get("name")
    chat_type = data.get("type")
    chat_id = data.get("id")
    messages = data.get("messages", [])
    total_messages = len(messages)
    print(f"    - name:           {chat_name} (expected: '64Gram Chat') [MATCH: {chat_name == '64Gram Chat'}]")
    print(f"    - type:           {chat_type} (expected: 'public_supergroup') [MATCH: {chat_type == 'public_supergroup'}]")
    print(f"    - id:             {chat_id} (expected: 1241321702) [MATCH: {chat_id == 1241321702}]")
    print(f"    - total messages: {total_messages:,} (expected: 39,897) [MATCH: {total_messages == 39897}]")

    # 3. Message types
    type_counts = Counter(m.get("type") for m in messages)
    print(f"\n[3] Message Type Distribution:")
    for t, c in type_counts.items():
        print(f"    - {t}: {c:,} ({c/total_messages*100:.2f}%)")
    print(f"    - Regular user messages: {type_counts['message']:,} (expected: 38,904) [MATCH: {type_counts['message'] == 38904}]")
    print(f"    - Service messages:      {type_counts['service']:,} (expected: 993) [MATCH: {type_counts['service'] == 993}]")

    regular_msgs = [m for m in messages if m.get("type") == "message"]
    service_msgs = [m for m in messages if m.get("type") == "service"]

    # 4. Chronological integrity
    print(f"\n[4] Chronological & Temporal Integrity:")
    first_msg = messages[0]
    last_msg = messages[-1]
    print(f"    - First event raw: id={first_msg.get('id')}, date='{first_msg.get('date')}', date_unixtime='{first_msg.get('date_unixtime')}'")
    print(f"      Report claimed: 2020-10-14T23:17:42 (Unix: 1602731862) [MATCH: {first_msg.get('date_unixtime') == '1602731862'}]")
    print(f"    - Last event raw:  id={last_msg.get('id')}, date='{last_msg.get('date')}', date_unixtime='{last_msg.get('date_unixtime')}'")
    print(f"      Report claimed: 2026-09-13T14:02:11 (Unix: 1789322531) [MATCH: {last_msg.get('date_unixtime') == '1789322531'}]")

    monotonic = True
    for i in range(len(messages) - 1):
        t1 = int(messages[i].get("date_unixtime", 0))
        t2 = int(messages[i+1].get("date_unixtime", 0))
        if t1 > t2:
            monotonic = False
            break
    print(f"    - Chronological monotonicity check: {'PASSED (0 violations)' if monotonic else 'FAILED'}")

    months = sorted(list(set(m.get("date", "")[:7] for m in messages if m.get("date"))))
    print(f"    - Total active distinct months: {len(months)} (expected: 72) [MATCH: {len(months) == 72}]")
    print(f"    - Continuous monthly span:      {months[0]} to {months[-1]}")

    # 5. Service action breakdown
    print(f"\n[5] Service Actions Breakdown (total service: {len(service_msgs)}):")
    service_actions = Counter(m.get("action") for m in service_msgs)
    for act, cnt in service_actions.most_common():
        print(f"    - {act:<22}: {cnt:>4} ({cnt/len(service_msgs)*100:6.2f}%)")

    # 6. Yearly message distribution & peak months
    print(f"\n[6] Yearly & Monthly Distribution:")
    year_counts = Counter(m.get("date", "")[:4] for m in messages if m.get("date"))
    for yr in sorted(year_counts.keys()):
        print(f"    - {yr}: {year_counts[yr]:,}")

    month_counts = Counter(m.get("date", "")[:7] for m in messages if m.get("date"))
    print(f"    - Top 5 peak months:")
    for ym, cnt in month_counts.most_common(5):
        print(f"      * {ym}: {cnt:,}")

    # 7. Edit latency metrics
    edited_msgs = [m for m in regular_msgs if m.get("edited_unixtime")]
    edit_delays = []
    over_24h = 0
    for m in edited_msgs:
        send_time = int(m.get("date_unixtime", 0))
        edit_time = int(m.get("edited_unixtime", 0))
        diff = edit_time - send_time
        if diff >= 0:
            edit_delays.append(diff)
            if diff > 86400:
                over_24h += 1
    median_delay = statistics.median(edit_delays) if edit_delays else 0
    pct_over_24h = (over_24h / len(edited_msgs) * 100) if edited_msgs else 0
    print(f"\n[7] Edit Metrics:")
    print(f"    - Edited messages count: {len(edited_msgs):,} ({len(edited_msgs)/len(regular_msgs)*100:.2f}%) (expected: 6,492 / 16.7%) [MATCH: {len(edited_msgs) == 6492}]")
    print(f"    - Median edit delay:     {median_delay} seconds (expected: 60) [MATCH: {median_delay == 60.0}]")
    print(f"    - Edits > 24h:           {over_24h:,} ({pct_over_24h:.2f}%) (expected: ~5.0%) [MATCH: {round(pct_over_24h, 1) == 5.0}]")

    # 8. Actor demographics
    print(f"\n[8] Actor Demographics:")
    all_actors = set()
    named_actors = set()
    anonymous_actors = set()
    anon_msgs_count = 0
    actor_msg_counts = Counter()

    for m in regular_msgs:
        fid = m.get("from_id")
        fname = m.get("from")
        all_actors.add(fid)
        actor_msg_counts[fid] += 1
        if fname:
            named_actors.add(fid)
        else:
            anonymous_actors.add(fid)
            anon_msgs_count += 1

    print(f"    - Unique actors (regular msgs): {len(all_actors):,} (expected: 1,602) [MATCH: {len(all_actors) == 1602}]")
    print(f"    - Named actors:                 {len(named_actors):,} (expected: 1,215) [MATCH: {len(named_actors) == 1215}]")
    print(f"    - Anonymous/restricted actors:   {len(anonymous_actors):,} (expected: 387) [MATCH: {len(anonymous_actors) == 387}]")
    print(f"    - Anonymous msgs count:         {anon_msgs_count:,} ({anon_msgs_count/len(regular_msgs)*100:.2f}%) (expected: 4,735 / 12.2%) [MATCH: {anon_msgs_count == 4735}]")

    # Stakeholder checks
    dev_id = "channel1241321702"
    dev_msgs = [m for m in messages if m.get("from_id") == dev_id]
    dev_authored = [m for m in dev_msgs if m.get("author") == "dev"]
    all_authored = [m for m in messages if m.get("author") is not None]
    
    # replies to regular messages
    msg_dict = {m.get("id"): m for m in messages if "id" in m}
    dev_replies_to_regular = [m for m in dev_msgs if m.get("reply_to_message_id") in msg_dict and msg_dict[m.get("reply_to_message_id")].get("type") == "message"]
    print(f"    - Maintainer ({dev_id}):")
    print(f"      * Total msgs:                     {len(dev_msgs):,} (expected: 2,077) [MATCH: {len(dev_msgs) == 2077}]")
    print(f"      * 'author': 'dev' count:          {len(dev_authored):,} (expected: 1,770) [MATCH: {len(dev_authored) == 1770}]")
    print(f"      * Total msgs with any author tag: {len(all_authored):,} (expected: 1,770) [MATCH: {len(all_authored) == 1770}]")
    print(f"      * Dialogue replies to user msgs:  {len(dev_replies_to_regular):,} (expected: 934) [MATCH: {len(dev_replies_to_regular) == 934}]")

    rel_id = "channel1214115386"
    rel_msgs = [m for m in messages if m.get("from_id") == rel_id]
    rel_replies = [m for m in rel_msgs if m.get("reply_to_message_id")]
    rel_texts = [extract_message_text(m) for m in rel_msgs]
    non_empty_rel = [t for t in rel_texts if t]
    avg_rel_len = sum(len(t) for t in non_empty_rel) / len(non_empty_rel) if non_empty_rel else 0
    print(f"    - Release Channel ({rel_id}):")
    print(f"      * Total msgs:                     {len(rel_msgs):,} (expected: 1,117) [MATCH: {len(rel_msgs) == 1117}]")
    print(f"      * Outgoing replies count:         {len(rel_replies):,} (expected: 0) [MATCH: {len(rel_replies) == 0}]")
    print(f"      * Avg length of non-empty posts:  {avg_rel_len:.1f} chars (reported: 108.7) [MATCH: {round(avg_rel_len, 1) == 108.7}]")

    # 9. Diagnostic attachment forensics
    print(f"\n[9] Diagnostic Attachments & File Extensions:")
    fn_exts = Counter()
    for m in messages:
        fn = m.get("file_name")
        if fn and isinstance(fn, str):
            ext = os.path.splitext(fn)[1].lower()
            fn_exts[ext] += 1

    target_exts = [
        (".webp", 912), (".zip", 538), (".mp4", 450), (".tgs", 417),
        (".webm", 365), (".exe", 261), (".dmg", 190), (".telegramcrash", 61),
        (".dmp", 47), (".txt", 13)
    ]
    for te, exp in target_exts:
        actual = fn_exts[te]
        print(f"    - {te:15s}: actual={actual:4d} | expected={exp:4d} | match={'YES' if actual==exp else 'NO'}")

    pcap_by_fn = fn_exts.get(".pcap", 0)
    pcap_by_mime = sum(1 for m in messages if m.get("mime_type") == "application/vnd.tcpdump.pcap")
    print(f"    - .pcap (filename): actual={pcap_by_fn:4d} | reported=   0 | match={'YES' if pcap_by_fn==0 else 'NO'}")
    print(f"    - .pcap (MIME type):actual={pcap_by_mime:4d} | reported=  46 | [NOTE: 46 of the 47 .dmp files have this MIME type; reconciled in report]")

    # 10. Text polymorphism & Entity checks
    print(f"\n[10] Text Structure Polymorphism:")
    text_str_cnt = sum(1 for m in regular_msgs if isinstance(m.get("text"), str))
    text_list_cnt = sum(1 for m in regular_msgs if isinstance(m.get("text"), list))
    text_entities_cnt = sum(1 for m in regular_msgs if "text_entities" in m)
    rich_msg_cnt = sum(1 for m in regular_msgs if "rich_message" in m)
    print(f"    - 'text' as str:          {text_str_cnt:,} (expected: 35,006) [MATCH: {text_str_cnt == 35006}]")
    print(f"    - 'text' as list:         {text_list_cnt:,} (expected: 3,897) [MATCH: {text_list_cnt == 3897}]")
    print(f"    - 'text_entities' present:{text_entities_cnt:,} (expected: 38,903) [MATCH: {text_entities_cnt == 38903}]")
    print(f"    - 'rich_message' present: {rich_msg_cnt:,} (expected: 1) [MATCH: {rich_msg_cnt == 1}]")

    # 11. Reaction totals & emoji counts
    print(f"\n[11] Community Reactions:")
    total_rx_count = 0
    msgs_with_rx = 0
    emoji_counter = Counter()

    for m in messages:
        rx_list = m.get("reactions")
        if rx_list and isinstance(rx_list, list):
            msgs_with_rx += 1
            for rx in rx_list:
                emoji = rx.get("emoji")
                count = rx.get("count", 0)
                emoji_counter[emoji] += count
                total_rx_count += count

    print(f"    - Total reactions:         {total_rx_count:,} (expected: 16,551) [MATCH: {total_rx_count == 16551}]")
    print(f"    - Messages with reactions: {msgs_with_rx:,} (expected: 3,921) [MATCH: {msgs_with_rx == 3921}]")
    
    claimed_emojis = [
        ("👍", 4388, "👍"), ("❤️", 3241, "❤"), ("🔥", 1451, "🔥"), ("unknown", 1298, None),
        ("😁", 742, "😁"), ("😭", 737, "😭"), ("🤣", 422, "🤣"), ("🥰", 396, "🥰"),
        ("💯", 333, "💯"), ("🫡", 274, "🫡"), ("😢", 273, "😢"), ("👎", 172, "👎")
    ]
    print(f"    - Emoji Verification:")
    for label, exp, key in claimed_emojis:
        act = emoji_counter.get(key, 0)
        print(f"      * {label:8s}: actual={act:5d} | expected={exp:5d} | match={'YES' if act==exp else 'NO'}")

    print("\n" + "=" * 80)
    print("ORACLE EXECUTION COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    main()
