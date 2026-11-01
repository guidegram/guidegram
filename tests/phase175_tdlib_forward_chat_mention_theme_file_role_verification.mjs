import assert from 'node:assert/strict';
import {
  TdlibForwardOptionsGovernor,
  EmptyChatSyncGovernor,
  SupergroupMemberMentionTrieGovernor,
  CloudThemeFallbackGovernor,
  InputFileGeneratedPipeGovernor,
  OfflineWallpaperCacheGovernor,
  SupergroupParticipantRoleGovernor
} from '../src/services/tdlibForwardChatMentionThemeFileAndRoleGovernor.ts';

console.log('🧪 Starting Phase 175 Verification: TDLib Forward, Empty Chat, Mention, Theme, File Pipe & Role Hardening...');

// -------------------------------------------------------------
// Test 1: TdlibForwardOptionsGovernor (Resolves #3736)
// -------------------------------------------------------------
console.log('  Testing #3736: TDLib Forward Options (Send Copy & Remove Caption)...');
const forwardGov = new TdlibForwardOptionsGovernor();

const messages = [
  { id: 101, text: 'Breaking security announcement', caption: 'Confidential leak' }
];

const prepared = forwardGov.prepareForward(messages, 'chat_src', 'chat_dest', {
  sendCopy: true,
  removeCaption: true,
  onlyNewSpreads: false
});

assert.equal(prepared.length, 1);
assert.equal(prepared[0].authorMasked, true, 'Author must be masked when sendCopy is true');
assert.equal(prepared[0].captionStripped, true);
assert.equal(prepared[0].finalCaption, undefined);
console.log('  ✅ #3736 Verified: Forward options correctly mask author and strip caption.');

// -------------------------------------------------------------
// Test 2: EmptyChatSyncGovernor (Resolves #3673)
// -------------------------------------------------------------
console.log('  Testing #3673: Synchronization of Chats with Null lastMessage...');
const chatSyncGov = new EmptyChatSyncGovernor();

const rawChats = [
  { id: 'c_normal', title: 'Work Group', createdAtTimestamp: 1000, lastMessage: { id: 50, date: 5000, text: 'Hi' }, order: 0n },
  { id: 'c_empty', title: 'Brand New Channel', createdAtTimestamp: 4000, lastMessage: null, order: 0n },
  { id: 'c_old', title: 'Old Project', createdAtTimestamp: 500, lastMessage: { id: 10, date: 2000, text: 'Done' }, order: 0n }
];

const synced = chatSyncGov.sortAndSynchronizeChats(rawChats);
assert.equal(synced.length, 3, 'Empty chat must NOT be ignored or dropped');
assert.equal(synced[0].id, 'c_normal'); // date 5000
assert.equal(synced[1].id, 'c_empty');  // createdAt 4000
assert.equal(synced[2].id, 'c_old');    // date 2000
console.log('  ✅ #3673 Verified: Chats with null lastMessage preserved and sorted by creation date.');

// -------------------------------------------------------------
// Test 3: SupergroupMemberMentionTrieGovernor (Resolves #3631)
// -------------------------------------------------------------
console.log('  Testing #3631: Supergroup Member Mentions Fast Prefix Trie...');
const mentionGov = new SupergroupMemberMentionTrieGovernor();

mentionGov.registerMembers([
  { userId: 'u1', username: 'ershad', displayName: 'Dr. Ershad', isBot: false },
  { userId: 'u2', username: 'erfan', displayName: 'Erfan Z', isBot: false },
  { userId: 'u3', username: 'juliet_bot', displayName: 'Juliet AI', isBot: true },
  { userId: 'u4', username: 'sara', displayName: 'Sara Architect', isBot: false }
]);

const prefixSearch = mentionGov.searchMentions('@er', 5);
assert.equal(prefixSearch.length, 2);
assert.equal(prefixSearch[0].username, 'ershad');
assert.equal(prefixSearch[1].username, 'erfan');
console.log('  ✅ #3631 Verified: Supergroup member mentions prefix search working accurately.');

// -------------------------------------------------------------
// Test 4: CloudThemeFallbackGovernor (Resolves #691)
// -------------------------------------------------------------
console.log('  Testing #691: Missing Cloud Theme Local Fallback...');
const themeGov = new CloudThemeFallbackGovernor();

const catalog = new Map([
  ['custom_nord', { themeId: 'custom_nord', name: 'Nord Frost', isDark: true, accentColor: '#88C0D0', backgroundColor: '#2E3440', isFallback: false }]
]);

// Available theme
const resolvedCustom = themeGov.resolveTheme('custom_nord', catalog);
assert.equal(resolvedCustom.name, 'Nord Frost');
assert.equal(resolvedCustom.isFallback, false);

// Missing theme -> Must provide fallback without throwing error!
const fallbackTheme = themeGov.resolveTheme('unknown_theme_99', catalog);
assert.equal(fallbackTheme.isFallback, true);
assert.equal(fallbackTheme.themeId, 'default_day');
console.log('  ✅ #691 Verified: Missing cloud themes safely resolve to default local palette.');

// -------------------------------------------------------------
// Test 5: InputFileGeneratedPipeGovernor (Resolves #382)
// -------------------------------------------------------------
console.log('  Testing #382: InputFileGenerated Chunked Stream & Timeout Guard...');
const pipeGov = new InputFileGeneratedPipeGovernor();

const pipe = pipeGov.createPipe('gen_pipe_01', '/tmp/input.wav', '/storage/voice.ogg', 1024);
assert.equal(pipe.status, 'generating');

// Write half chunks
pipeGov.writeChunk('gen_pipe_01', 512);
assert.equal(pipe.bytesWritten, 512);
assert.equal(pipe.status, 'generating');

// Complete write
pipeGov.writeChunk('gen_pipe_01', 512);
assert.equal(pipe.bytesWritten, 1024);
assert.equal(pipe.status, 'completed');

// Timeout test on hanging generator
const hangingPipe = pipeGov.createPipe('gen_pipe_02', '/tmp/h.mp4', '/storage/h.mp4', 50000);
const timedOut = pipeGov.handleTimeout('gen_pipe_02');
assert.equal(timedOut, true);
assert.equal(hangingPipe.status, 'timed_out');
console.log('  ✅ #382 Verified: Input file generation chunking and timeout guards validated.');

// -------------------------------------------------------------
// Test 6: OfflineWallpaperCacheGovernor (Resolves #376)
// -------------------------------------------------------------
console.log('  Testing #376: Offline Wallpapers Cached Delivery...');
const wallpaperGov = new OfflineWallpaperCacheGovernor();

// Online request
const onlineWp = wallpaperGov.getWallpapers(true);
assert.equal(onlineWp.length, 3);

// Offline request -> Delivers local offline available wallpapers immediately
const offlineWp = wallpaperGov.getWallpapers(false);
assert.equal(offlineWp.length, 3);
assert.equal(offlineWp[0].isOfflineAvailable, true);
console.log('  ✅ #376 Verified: Offline wallpapers served instantly from local cache.');

// -------------------------------------------------------------
// Test 7: SupergroupParticipantRoleGovernor (Resolves #559)
// -------------------------------------------------------------
console.log('  Testing #559: Supergroup Participant Role & Permissions Resolution...');
const roleGov = new SupergroupParticipantRoleGovernor();

// Assign admin permissions
roleGov.assignRole({
  chatId: 'supergroup_88',
  userId: 'user_admin_01',
  role: 'administrator',
  canPostMessages: true,
  canEditMessages: true,
  canDeleteMessages: true,
  canInviteUsers: true
});

const adminPerms = roleGov.resolvePermissions('supergroup_88', 'user_admin_01');
assert.equal(adminPerms.role, 'administrator');
assert.equal(adminPerms.canDeleteMessages, true);

// Default member
const memberPerms = roleGov.resolvePermissions('supergroup_88', 'user_regular_02');
assert.equal(memberPerms.role, 'member');
assert.equal(memberPerms.canDeleteMessages, false);
console.log('  ✅ #559 Verified: Supergroup participant roles and permissions cleanly resolved.');

console.log('\n🎉 ALL 7 TDLIB HARDENING TESTS PASSED WITH 100% SUCCESS!');
