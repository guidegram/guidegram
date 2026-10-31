import assert from 'node:assert';
import { ContextMenuAndChatListGovernor } from '../src/services/contextMenuAndChatListGovernor.ts';

console.log('🧪 Starting Phase 84 Context Menu & Chat List Sorting Verification Suite...');

const governor = new ContextMenuAndChatListGovernor();

// 1. Safe Context Menu Positioning & Clamping (AyuGram #413)
console.log('  Testing safe context menu positioning & boundary clamping...');
const posNormal = governor.calculateMenuPosition(100, 100, 1920, 1080, 200, 300);
assert.strictEqual(posNormal.x, 100);
assert.strictEqual(posNormal.y, 100);
assert.strictEqual(posNormal.placement, 'bottom-right');

// Overflow right & bottom
const posOverflow = governor.calculateMenuPosition(1900, 1050, 1920, 1080, 200, 300);
assert.strictEqual(posOverflow.placement, 'top-left');
assert.ok(posOverflow.x <= 1920 - 200);
assert.ok(posOverflow.y <= 1080 - 300);
console.log('  ✅ Context menu positioning & clamping verified');

// 2. Chat Area Right-Click Target Resolution (Kotatogram #439, AyuGram #413)
console.log('  Testing right click target resolution in blank area...');
const msgTarget = governor.resolveRightClickTarget(true, 'msg_42', 'chat_99');
assert.strictEqual(msgTarget.targetType, 'message');
assert.strictEqual(msgTarget.targetId, 'msg_42');

const bgTarget = governor.resolveRightClickTarget(false, undefined, 'chat_99');
assert.strictEqual(bgTarget.targetType, 'chat_background');
assert.strictEqual(bgTarget.targetId, 'chat_99');
console.log('  ✅ Chat area right click target resolution verified');

// 3. Message Context Menu Actions & Developer Tools (Kotatogram #274, TDesktop #221)
console.log('  Testing message context menu items & copy ID...');
const msgMenu = governor.generateMessageContextMenu({ id: 'msg_100', authorId: 'user_1', text: 'Hello' }, true);
assert.ok(msgMenu.some(item => item.id === 'copy_id' && item.label.includes('msg_100')));
assert.ok(msgMenu.some(item => item.id === 'view_as_json' && item.icon === 'code-json'));
console.log('  ✅ Message context menu items verified');

// 4. Chat Context Menu & Add to Folder Submenu (Kotatogram #342, #274)
console.log('  Testing chat context menu & Add to Folder submenu...');
const folders = [
  { id: 'work', title: 'Work', containsChat: false },
  { id: 'family', title: 'Family', containsChat: true }
];
const chatMenu = governor.generateChatContextMenu({ id: 'chat_55', title: 'Developers', isPinned: false, isMuted: false }, folders);
const addToFolder = chatMenu.find(item => item.id === 'add_to_folder');
assert.ok(addToFolder);
assert.strictEqual(addToFolder.submenu?.length, 2);
assert.strictEqual(addToFolder.submenu[1].label, '✓ Family');
assert.ok(chatMenu.some(item => item.id === 'copy_chat_id' && item.label.includes('chat_55')));
console.log('  ✅ Chat context menu & submenu verified');

// 5. Pinned Dialogs Limits (Kotatogram #4)
console.log('  Testing pinned dialogs limits for Free, Premium, Power-User...');
assert.strictEqual(governor.canPinChat(4, 'free').allowed, true);
assert.strictEqual(governor.canPinChat(5, 'free').allowed, false);
assert.strictEqual(governor.canPinChat(9, 'premium').allowed, true);
assert.strictEqual(governor.canPinChat(10, 'premium').allowed, false);
assert.strictEqual(governor.canPinChat(50, 'power_user').allowed, true);
console.log('  ✅ Pinned dialogs limits verified');

// 6. Reordering Pinned Chats (morethanwords #443)
console.log('  Testing reordering of pinned chats...');
const testChats = [
  { id: 'c1', title: 'Chat 1', lastMessageDate: 1000, unreadCount: 0, isPinned: true, folderIds: [] },
  { id: 'c2', title: 'Chat 2', lastMessageDate: 2000, unreadCount: 5, isPinned: true, folderIds: [] },
  { id: 'c3', title: 'Chat 3', lastMessageDate: 3000, unreadCount: 2, isPinned: false, folderIds: [] }
];
// Reverse order of pinned chats
const reordered = governor.reorderPinnedChats(testChats, ['c2', 'c1']);
assert.strictEqual(reordered[0].id, 'c2');
assert.strictEqual(reordered[1].id, 'c1');
assert.strictEqual(reordered[2].id, 'c3');
console.log('  ✅ Reordering pinned chats verified');

// 7. Folder Sorting Modes (AyuGram #479)
console.log('  Testing folder sorting modes (unread_first, alphabetical, last_activity)...');
const folderChats = [
  { id: 'a', title: 'Zeta Chat', lastMessageDate: 500, unreadCount: 0, isPinned: false, folderIds: ['f1'] },
  { id: 'b', title: 'Alpha Chat', lastMessageDate: 400, unreadCount: 3, isPinned: false, folderIds: ['f1'] },
  { id: 'c', title: 'Beta Chat', lastMessageDate: 800, unreadCount: 0, isPinned: false, folderIds: ['f1'] }
];

const unreadSorted = governor.sortFolderChats(folderChats, 'unread_first');
assert.strictEqual(unreadSorted[0].id, 'b'); // Unread first

const alphaSorted = governor.sortFolderChats(folderChats, 'alphabetical');
assert.strictEqual(alphaSorted[0].id, 'b'); // Alpha Chat
assert.strictEqual(alphaSorted[1].id, 'c'); // Beta Chat
assert.strictEqual(alphaSorted[2].id, 'a'); // Zeta Chat
console.log('  ✅ Folder sorting modes verified');

// 8. Folder Visibility Toggles (AyuGram #274)
console.log('  Testing folder visibility toggles...');
assert.strictEqual(governor.isFolderVisible('all'), true);
governor.setFolderVisibility('all', false);
assert.strictEqual(governor.isFolderVisible('all'), false);
console.log('  ✅ Folder visibility toggles verified');

console.log('✨ All Phase 84 Verification Tests Passed 100% Successfully!');
