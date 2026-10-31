import assert from 'node:assert/strict';
import { AccountProfileAndVirtualFoldersGovernor } from '../src/services/accountProfileAndVirtualFoldersGovernor.ts';

console.log('🧪 Starting Phase 43 Account Profile & Virtual Folders Verification Suite...');

// 1. Profile User ID & DC Formatter (kotatogram #6)
{
  console.log('  Testing profile identity details formatting...');
  const profile = AccountProfileAndVirtualFoldersGovernor.formatProfileIdentity(777888999, 4, 'durov');
  assert.strictEqual(profile.userId, 777888999);
  assert.strictEqual(profile.dataCenterId, 4);
  assert.strictEqual(profile.formattedDisplay, 'ID: 777888999 (DC4) • @durov');
  console.log('  ✅ Profile identity formatting passed');
}

// 2. Ungrouped Virtual Folder Generation (kotatogram #475)
{
  console.log('  Testing ungrouped virtual folder chat computation...');
  const allChats = [1, 2, 3, 4, 5, 6, 7];
  const customFolders = [
    { includedChatIds: [1, 2] }, // Work
    { includedChatIds: [3, 5] }  // News
  ];

  const ungrouped = AccountProfileAndVirtualFoldersGovernor.computeUngroupedChats(allChats, customFolders);
  // Uncategorized: [4, 6, 7]
  assert.deepStrictEqual(ungrouped, [4, 6, 7]);
  console.log('  ✅ Ungrouped chats computation passed');
}

// 3. Scroll Arrow Left vs Right Click Action (kotatogram #167)
{
  console.log('  Testing scroll-to-bottom secondary right-click action...');
  // Left click -> scrolls to latest
  const leftClick = AccountProfileAndVirtualFoldersGovernor.resolveScrollArrowAction('left', 500);
  assert.strictEqual(leftClick.action, 'scroll_to_latest');

  // Right click with unread message -> jumps to first unread
  const rightClick = AccountProfileAndVirtualFoldersGovernor.resolveScrollArrowAction('right', 500);
  assert.strictEqual(rightClick.action, 'jump_to_first_unread');
  assert.strictEqual(rightClick.targetMessageId, 500);
  console.log('  ✅ Scroll arrow actions passed');
}

// 4. Bot API Token Validation (kotatogram #374)
{
  console.log('  Testing Telegram Bot API token validation...');
  // Valid token
  const valid = AccountProfileAndVirtualFoldersGovernor.validateBotToken(
    '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ_1234567890'
  );
  assert.strictEqual(valid.isValid, true);
  assert.strictEqual(valid.botId, 123456789);
  assert.strictEqual(valid.tokenHash, 'ABCdefGHIjklMNOpqrSTUvwxYZ_1234567890');

  // Invalid token
  const invalid = AccountProfileAndVirtualFoldersGovernor.validateBotToken('corrupt_token_string');
  assert.strictEqual(invalid.isValid, false);
  assert.ok(invalid.error?.includes('Invalid bot token format'));
  console.log('  ✅ Bot token validation passed');
}

// 5. Shortcut Conflict Resolution by Usage Frequency (tdesktop #31345)
{
  console.log('  Testing shortcut conflict resolution...');
  const cmdA = { id: 'mute_chat', usageCount: 150 };
  const cmdB = { id: 'toggle_sidebar', usageCount: 10 };

  const res = AccountProfileAndVirtualFoldersGovernor.resolveShortcutConflict('Ctrl+M', cmdA, cmdB);
  assert.strictEqual(res.assignedCommandId, 'mute_chat');
  assert.strictEqual(res.remappedCommandId, 'toggle_sidebar');
  console.log('  ✅ Shortcut conflict resolution passed');
}

console.log('\n🎉 ALL Phase 43 verification checks passed green!');
