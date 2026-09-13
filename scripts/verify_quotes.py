import json, sys
sys.stdout.reconfigure(encoding="utf-8")

DATASET_PATH = r"D:\download\Telegram Desktop\ChatExport_2026-09-13\result.json"

with open(DATASET_PATH, "r", encoding="utf-8") as f:
    messages = json.load(f)["messages"]

msg_dict = {m["id"]: m for m in messages if "id" in m}

def get_full_text(m):
    te = m.get("text_entities")
    if te:
        return "".join(e.get("text", "") if isinstance(e, dict) else str(e) for e in te)
    t = m.get("text")
    if isinstance(t, str) and t:
        return t
    if isinstance(t, list) and t:
        return "".join(e.get("text", "") if isinstance(e, dict) else str(e) for e in t)
    rm = m.get("rich_message")
    if rm and isinstance(rm, dict):
        return "rich_message blocks present"
    if m.get("action"):
        act = m.get("action")
        tit = m.get("title", "")
        return f"Action: {act} ({tit})"
    return ""

quotes_to_check = [
    (1, "Genesis create_channel", "create_channel"),
    (4, "Morishima_Hodaka_TG", "@Morishima_Hodaka_TG Are you the Github user c0re100? And group owner?"),
    (15, "Pinned 15", "Violating ToS feature is not accepted"),
    (1075, "Sai 1075", "Same here. I am having frequent crashes. @tg_x64_chat please help"),
    (1089, "c0re100 1089", "I can't fix it without crash log"),
    (2440, "c0re100 2440", "No, it's against telegram tos."),
    (2768, "user 2768", 'add the "deleted messages anti revoke" feature to your client'),
    (2769, "c0re100 2769", "No and never"),
    (9643, "c0re100 9643", "You should first check if fontmod is working"),
    (10818, "c0re100 10818", "only winmm.dll is allowed"),
    (13330, "Eric 13330", "ApiId: 3722065"),
    (13332, "c0re100 13332", "no useful crash report, may I know how to reproduce?"),
    (15962, "c0re100 15962", "Well, Telegram ToS is not updated, so I don't know raise the account limit is allowed or not lol"),
    (15963, "c0re100 15963", "you can go back to v1.0.34 » add account » upgrade to 1.0.37 as a workaround"),
    (18641, "Unem 18641", "You have to return Forward as copy is much easier than this new stupid method, also return multi forward without grouping all items"),
    (18660, "User 18660", "I can't find the \"forward without quoting\" option anymore"),
    (18661, "c0re100 18661", "4. [Remove] Forward Without Quote, since Multi-Forward now support remove caption or sender name."),
    (19198, "c0re100 19198", "No, cause multi thread download isn't supported. So increase kFileRequestsCount value=useless"),
    (20462, "Release 20462", "v1.0.72 Beta (TDesktop v4.6.5)"),
    (21176, "c0re100 21176", "just tested... official telegram desktop is also affected too. SO it's not 64Gram fault"),
    (33952, "Release 33952", "[Fix] show message seconds"),
    (33979, "Reyansh 33979", "Hello 64gram devs i shifted from ayugram to 64gram but i really miss some great features of ayugram like : Ghost Mode , Messages history(deleted message)"),
    (36450, "Nimueh Auntie 36450", "can we have just ONE day without spammers asking \"why not more accounts\" lol? geeez"),
    (37314, "RV 37314", "Be careful using this application. Very vulnerable to being banned by the TG system. My 9 new TG accounts on this application, all of them suddenly disappeared"),
    (37315, "c0re100 37315", "nice"),
    (41804, "Release 41804", "v1.1.54"),
    (46836, "Js0n 46836", "New pull request: add unlimited accounts"),
    (47720, "Release 47720", "[Fix] chat id, time with seconds, message id"),
    (51100, "quark 51100", "rich_message")
]

print(f"Checking {len(quotes_to_check)} cited quotes against raw data:")
passed = 0
for mid, desc, expected_snippet in quotes_to_check:
    m = msg_dict.get(mid)
    if not m:
        print(f"  [FAIL] Msg {mid} NOT FOUND!")
        continue
    actual_text = get_full_text(m)
    sender = m.get("from") or m.get("actor") or m.get("from_id")
    norm_act = " ".join(actual_text.split()).lower()
    norm_exp = " ".join(expected_snippet.split()).lower()
    match = norm_exp in norm_act
    status = "MATCH" if match else "CHECK"
    if match: passed += 1
    print(f"  [{status}] Msg {mid:5d} ({desc:22s}) by {str(sender)[:20]:20s}")
    if not match:
        print(f"         Expected snippet: {expected_snippet}")
        print(f"         Actual text:     {actual_text[:120]}")

print(f"\nResult: {passed}/{len(quotes_to_check)} quotes confirmed.")
