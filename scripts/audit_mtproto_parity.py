import json
import re
import os
from collections import defaultdict

def run_audit():
    schema_path = r'C:\Users\ersha\.gemini\config\skills\telegram-mtproto-api\references\tl_schema_latest.json'
    schema = json.load(open(schema_path, encoding='utf-8'))
    functions = schema.get('functions', [])
    constructors = schema.get('constructors', [])

    ns_methods = defaultdict(list)
    for f in functions:
        name = f['name']
        if '.' in name:
            ns, m = name.split('.', 1)
        else:
            ns = 'root'
        ns_methods[ns].append(name)

    # Read accountManager.ts
    am_path = r'electron/telegram/accountManager.ts'
    am_content = open(am_path, encoding='utf-8', errors='ignore').read()

    # Find raw calls: _: 'messages.getHistory'
    raw_calls = set(re.findall(r"_\s*:\s*['\"]([a-zA-Z0-9_\.]+)['\"]", am_content))

    # Also scan other electron and src files for raw calls or mtcute calls
    all_raw_calls = set(raw_calls)
    for root_dir in ['electron', 'src']:
        for root, _, files in os.walk(root_dir):
            for file in files:
                if file.endswith(('.ts', '.tsx')):
                    try:
                        content = open(os.path.join(root, file), encoding='utf-8', errors='ignore').read()
                        matches = re.findall(r"_\s*:\s*['\"]([a-zA-Z0-9_\.]+)['\"]", content)
                        all_raw_calls.update(matches)
                    except:
                        pass

    # Find mtcute high-level imports
    mt_imports = re.findall(r"import\s*\{([^}]+)\}\s*from\s*['\"]@mtcute/core/methods\.js['\"]", am_content)
    mt_methods = set()
    for imp in mt_imports:
        for item in imp.split(','):
            item = item.strip()
            if item:
                orig = item.split(' as ')[0].strip()
                mt_methods.add(orig)

    # Map mtcute high-level methods to their underlying MTProto calls
    mtcute_to_mtproto = {
        'getChatMembers': 'channels.getParticipants',
        'addChatMembers': 'channels.inviteToChannel',
        'kickChatMember': 'channels.editBanned',
        'banChatMember': 'channels.editBanned',
        'unbanChatMember': 'channels.editBanned',
        'restrictChatMember': 'channels.editBanned',
        'editAdminRights': 'channels.editAdmin',
        'editChatMemberRank': 'channels.editAdmin',
        'setChatTitle': 'channels.editTitle',
        'setChatDescription': 'messages.editChatAbout',
        'setSlowMode': 'channels.toggleSlowMode',
        'toggleJoinRequests': 'channels.toggleJoinRequest',
        'getInviteLinkMembers': 'messages.getChatInviteImporters',
        'hideJoinRequest': 'messages.hideChatJoinRequest',
        'hideAllJoinRequests': 'messages.hideAllChatJoinRequests',
        'setChatUsername': 'channels.updateUsername',
        'setChatDefaultPermissions': 'messages.editChatDefaultBannedRights',
        'editMessage': 'messages.editMessage',
        'pinMessage': 'messages.updatePinnedMessage',
        'unpinMessage': 'messages.updatePinnedMessage',
        'setTyping': 'messages.setTyping',
        'sendStory': 'stories.sendStory',
        'sendText': 'messages.sendMessage',
        'sendMedia': 'messages.sendMedia',
        'exportInviteLink': 'messages.exportChatInvite',
        'joinChat': 'messages.importChatInvite',
        'iterDialogs': 'messages.getDialogs',
        'getContacts': 'contacts.getContacts',
    }

    effective_wired = set(all_raw_calls)
    for m in mt_methods:
        if m in mtcute_to_mtproto:
            effective_wired.add(mtcute_to_mtproto[m])

    # Scan for UI Mockups / Fake Shells (e.g. methods or features returning hardcoded arrays or local state)
    # Remaining mockups scheduled for demolition in subsequent phases:
    mockup_features = [
        'Secret Chats (messages.sendEncrypted - End-to-End Encryption Diffie-Hellman)',
        'Fragment Username & Phone Auction / TON DNS bidding',
        'Telegram Passport (secure identity documents)',
        'Sticker Set Creation & Management (stickers.createStickerSet)',
        'Sponsored Messages / Telegram Ad Platform (messages.getSponsoredMessages)',
    ]

    total_funcs = len(functions)
    total_constructors = len(constructors)
    
    results = {
        'total_functions_in_schema': total_funcs,
        'total_constructors_in_schema': total_constructors,
        'total_unique_namespaces': len(ns_methods),
        'namespaces': {},
        'overall_implemented_methods': 0,
        'overall_unimplemented_methods': 0,
        'mockup_features': mockup_features,
    }

    overall_wired_count = 0

    for ns, methods in sorted(ns_methods.items(), key=lambda x: len(x[1]), reverse=True):
        wired = [m for m in methods if m in effective_wired]
        overall_wired_count += len(wired)
        results['namespaces'][ns] = {
            'total_in_schema': len(methods),
            'directly_implemented': len(wired),
            'gap_unimplemented': len(methods) - len(wired),
            'coverage_pct': round((len(wired) / len(methods)) * 100, 1),
            'implemented_list': wired,
        }

    results['overall_implemented_methods'] = overall_wired_count
    results['overall_unimplemented_methods'] = total_funcs - overall_wired_count
    results['overall_coverage_pct'] = round((overall_wired_count / total_funcs) * 100, 1)

    print(json.dumps(results, indent=2))
    with open('mtproto_audit_report.json', 'w', encoding='utf-8') as out:
        json.dump(results, out, indent=2)

if __name__ == '__main__':
    run_audit()
