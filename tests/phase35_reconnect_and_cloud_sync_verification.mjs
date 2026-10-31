import assert from 'node:assert/strict';
import { ReconnectAndCloudSyncGovernor } from '../src/services/reconnectAndCloudSyncGovernor.ts';

console.log('🧪 Starting Phase 35 Reconnect & Cloud Sync Verification Suite...');

// 1. CPU-Efficient Reconnect Backoff & Animation Throttling (tdesktop #8068)
{
  console.log('  Testing reconnect backoff & background spinner pause...');
  // Focused window
  const focused = ReconnectAndCloudSyncGovernor.calculateReconnectBackoff(2, true, 1000);
  assert.ok(focused.backoffMs >= 4000 && focused.backoffMs <= 4500);
  assert.strictEqual(focused.shouldAnimateSpinner, true);

  // Background / unfocused window
  const background = ReconnectAndCloudSyncGovernor.calculateReconnectBackoff(2, false, 1000);
  assert.strictEqual(background.shouldAnimateSpinner, false, 'Must pause spinner in background to avoid 100% CPU burn');
  console.log('  ✅ Reconnect backoff passed');
}

// 2. Pinned Chat State Reconciliation (tdesktop #31445)
{
  console.log('  Testing community-linked pinned chat reconciliation...');
  const localPins = [
    { chatId: 101, pinnedOrder: 1, isCommunityLinked: false },
    { chatId: 202, pinnedOrder: 2, isCommunityLinked: true } // Community linked pin
  ];

  // Cloud list only contains chat 101 and a new chat 303
  const cloudPins = [
    { chatId: 101, pinnedOrder: 1, isCommunityLinked: false },
    { chatId: 303, pinnedOrder: 3, isCommunityLinked: false }
  ];

  const merged = ReconnectAndCloudSyncGovernor.reconcilePinnedChats(localPins, cloudPins);
  assert.strictEqual(merged.length, 3);
  assert.ok(merged.some(p => p.chatId === 202), 'Community linked pin 202 must be preserved');
  console.log('  ✅ Pinned chat reconciliation passed');
}

// 3. Deleted Account Entity Resolution (tdesktop #31461)
{
  console.log('  Testing deleted account state resolution...');
  const deletedUser = ReconnectAndCloudSyncGovernor.resolveDeletedAccount({
    id: 999,
    isDeleted: true
  });
  assert.strictEqual(deletedUser.isDeletedAccount, true);
  assert.strictEqual(deletedUser.displayName, 'Deleted Account');
  assert.strictEqual(deletedUser.canSendMessages, false);

  const activeUser = ReconnectAndCloudSyncGovernor.resolveDeletedAccount({
    id: 100,
    isDeleted: false,
    firstName: 'Sara'
  });
  assert.strictEqual(activeUser.isDeletedAccount, false);
  assert.strictEqual(activeUser.displayName, 'Sara');
  assert.strictEqual(activeUser.canSendMessages, true);
  console.log('  ✅ Deleted account resolution passed');
}

// 4. Folder State Restoration from Snapshot (kotatogram #294)
{
  console.log('  Testing folder recovery from backup snapshot...');
  const emptyActive = [];
  const snapshot = [
    { id: 1, title: 'Work', includedChatIds: [10, 20] },
    { id: 2, title: 'Crypto', includedChatIds: [30, 40] }
  ];

  const recovered = ReconnectAndCloudSyncGovernor.sanitizeFolderConfig(emptyActive, snapshot);
  assert.strictEqual(recovered.length, 2);
  assert.strictEqual(recovered[0].title, 'Work');
  console.log('  ✅ Folder recovery passed');
}

// 5. Partitioned Export Pagination beyond 10,000 items (tdesktop #31328)
{
  console.log('  Testing export pagination partitioning...');
  // 25,000 messages export
  const pages = ReconnectAndCloudSyncGovernor.partitionExportPagination(25000, 5000);
  assert.strictEqual(pages.length, 5);
  assert.strictEqual(pages[0].limit, 5000);
  assert.strictEqual(pages[4].offset, 20000);
  console.log('  ✅ Export pagination partitioning passed');
}

console.log('\n🎉 ALL Phase 35 verification checks passed green!');
