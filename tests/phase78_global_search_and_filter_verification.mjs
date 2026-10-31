import assert from 'node:assert';
import { GlobalSearchAndFilterGovernor } from '../src/services/globalSearchAndFilterGovernor.ts';

console.log('🧪 Starting Phase 78 Global Search & Filter Verification Suite...');

const governor = new GlobalSearchAndFilterGovernor();

// 1. Index sample messages
governor.indexMessage({
  id: 1,
  chatId: 'chat_1',
  senderId: 'user_arash',
  senderName: 'Arash',
  text: 'Hey everyone, check this project link: https://guidegram.org',
  mediaType: 'link',
  date: 1000
});

governor.indexMessage({
  id: 2,
  chatId: 'chat_1',
  senderId: 'user_sara',
  senderName: 'Sara',
  text: 'Here is the photo of the new office',
  mediaType: 'photo',
  date: 2000
});

governor.indexMessage({
  id: 3,
  chatId: 'chat_2',
  senderId: 'user_omid',
  senderName: 'Omid',
  text: 'Secret project files attached',
  mediaType: 'document',
  date: 3000
});

// 2. Test multi-criteria search (TDesktop #228)
console.log('  Testing multi-criteria message search & filtering...');
const linkResults = governor.searchMessages({
  query: '',
  mediaType: 'link'
});
assert.strictEqual(linkResults.length, 1);
assert.strictEqual(linkResults[0].messageId, 1);

const queryResults = governor.searchMessages({
  query: 'photo',
  chatId: 'chat_1'
});
assert.strictEqual(queryResults.length, 1);
assert.strictEqual(queryResults[0].senderName, 'Sara');
console.log('  ✅ Multi-criteria search verified');

// 3. Test Global Search Privacy Toggle (TDesktop #195)
console.log('  Testing global search privacy toggle...');
assert.strictEqual(governor.isGlobalSearchEnabled(), true);

// Disable global search
governor.setGlobalSearchEnabled(false);
const globalDisabled = governor.searchMessages({ query: 'files' });
assert.strictEqual(globalDisabled.length, 0); // Returns empty when global search is disabled

// Local search within chat still works
const localSearch = governor.searchMessages({ query: 'files', chatId: 'chat_2' });
assert.strictEqual(localSearch.length, 1);
assert.strictEqual(localSearch[0].messageId, 3);
console.log('  ✅ Global search privacy toggle verified');

// 4. Test Hotkey navigation (kotatogram #338 & iOS #2314)
console.log('  Testing search hotkeys...');
const hotkey1 = governor.handleSearchHotkey({ key: 'F', ctrlKey: true, shiftKey: true });
assert.strictEqual(hotkey1.action, 'open_global_search');

const hotkey2 = governor.handleSearchHotkey({ key: 'k', metaKey: true });
assert.strictEqual(hotkey2.action, 'open_quick_switcher');

const hotkey3 = governor.handleSearchHotkey({ key: 'a' });
assert.strictEqual(hotkey3.action, 'none');
console.log('  ✅ Search hotkeys verified');

// 5. Test Filter Folder Reordering (TDesktop #213)
console.log('  Testing filter folder drag & drop reordering...');
governor.registerFilterFolder({ id: 'folder_work', title: 'Work', orderIndex: 0, includedChatIds: ['chat_1'] });
governor.registerFilterFolder({ id: 'folder_personal', title: 'Personal', orderIndex: 1, includedChatIds: ['chat_2'] });
governor.registerFilterFolder({ id: 'folder_crypto', title: 'Crypto', orderIndex: 2, includedChatIds: [] });

const reordered = governor.reorderFilterFolders(['folder_crypto', 'folder_work', 'folder_personal']);
assert.strictEqual(reordered[0].id, 'folder_crypto');
assert.strictEqual(reordered[0].orderIndex, 0);
assert.strictEqual(reordered[1].id, 'folder_work');
assert.strictEqual(reordered[1].orderIndex, 1);
assert.strictEqual(reordered[2].id, 'folder_personal');
assert.strictEqual(reordered[2].orderIndex, 2);
console.log('  ✅ Filter folder reordering verified');

// 6. Test Group Member Online Filter (AyuGram #452)
console.log('  Testing group member online filter...');
const members = [
  { userId: 'u1', name: 'Zahra', isOnline: false, lastSeen: 100 },
  { userId: 'u2', name: 'Ali', isOnline: true, lastSeen: 500 },
  { userId: 'u3', name: 'Bahram', isOnline: true, lastSeen: 400 },
  { userId: 'u4', name: 'Dara', isOnline: false, lastSeen: 200 }
];

const onlineOnly = governor.filterMembers(members, true);
assert.strictEqual(onlineOnly.length, 2);
assert.strictEqual(onlineOnly[0].name, 'Ali');
assert.strictEqual(onlineOnly[1].name, 'Bahram');

const allMembers = governor.filterMembers(members, false);
assert.strictEqual(allMembers[0].isOnline, true);
assert.strictEqual(allMembers[allMembers.length - 1].isOnline, false);
console.log('  ✅ Group member online filter verified');

// 7. Test Emoji Reaction Search (Ajaxy #453)
console.log('  Testing emoji reaction search...');
const reactions = [
  { emoji: '🔥', title: 'Fire', isPremium: false, keywords: ['hot', 'lit'] },
  { emoji: '❤️', title: 'Heart', isPremium: false, keywords: ['love'] },
  { emoji: '🎉', title: 'Party Popper', isPremium: false, keywords: ['celebrate'] },
  { emoji: '⭐', title: 'Glowing Star', isPremium: true, keywords: ['premium', 'gold'] }
];

const fireSearch = governor.searchReactions('lit', reactions);
assert.strictEqual(fireSearch.length, 1);
assert.strictEqual(fireSearch[0].emoji, '🔥');

const premSearch = governor.searchReactions('gold', reactions);
assert.strictEqual(premSearch.length, 1);
assert.strictEqual(premSearch[0].isPremium, true);
assert.strictEqual(premSearch[0].emoji, '⭐');
console.log('  ✅ Emoji reaction search verified');

console.log('✨ All Phase 78 Verification Tests Passed 100% Successfully!');
