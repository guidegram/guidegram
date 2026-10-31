import assert from 'node:assert/strict';
import { E2eMessageInteractionAndSecurityGuard } from '../src/services/e2eMessageInteractionAndSecurityGuard.ts';

console.log('🧪 Starting Phase 32 E2E Message Interaction & Security Verification Suite...');

// 1. Preserving Selection on Clipboard Copy (tdesktop #31505)
{
  console.log('  Testing clipboard copy without wiping message selection state...');
  const selectedIds = new Set([10, 12, 15]);
  const messages = [
    { id: 10, senderName: 'Alice', timestampStr: '10:00', text: 'First line' },
    { id: 12, senderName: 'Bob', timestampStr: '10:01', text: 'Second line' },
    { id: 15, senderName: 'Alice', timestampStr: '10:02', text: 'Third line' }
  ];

  let clipboardOutput = '';
  const result = E2eMessageInteractionAndSecurityGuard.copySelectedMessages(
    messages,
    selectedIds,
    (txt) => { clipboardOutput = txt; }
  );

  // Assert selection count is preserved
  assert.strictEqual(result.preservedSelectedCount, 3);
  assert.strictEqual(selectedIds.size, 3, 'Active selection set must not be cleared');
  assert.ok(clipboardOutput.includes('[10:00] Alice:\nFirst line'));
  assert.ok(clipboardOutput.includes('[10:02] Alice:\nThird line'));
  console.log('  ✅ Clipboard copy selection preservation passed');
}

// 2. Bulk Deletion Confirmation & Admin Privileges (tdesktop #31535)
{
  console.log('  Testing bulk delete confirmation guard...');
  // User has NOT confirmed yet -> must trigger confirmation dialog
  const unconfirmed = E2eMessageInteractionAndSecurityGuard.validateBulkDelete({
    targetUserId: 500,
    chatId: -1001234567,
    chatType: 'supergroup',
    callerIsAdmin: true,
    affectedMessageCount: 42,
    hasUserConfirmed: false
  });
  assert.strictEqual(unconfirmed.canProceed, false);
  assert.strictEqual(unconfirmed.requiresConfirmationDialog, true);
  assert.ok(unconfirmed.reason?.includes('42 messages'));

  // Confirmed but not admin in supergroup -> blocked
  const nonAdmin = E2eMessageInteractionAndSecurityGuard.validateBulkDelete({
    targetUserId: 500,
    chatId: -1001234567,
    chatType: 'supergroup',
    callerIsAdmin: false,
    affectedMessageCount: 42,
    hasUserConfirmed: true
  });
  assert.strictEqual(nonAdmin.canProceed, false);
  assert.ok(nonAdmin.reason?.includes('Administrator privileges required'));

  // Confirmed and admin -> allowed
  const valid = E2eMessageInteractionAndSecurityGuard.validateBulkDelete({
    targetUserId: 500,
    chatId: -1001234567,
    chatType: 'supergroup',
    callerIsAdmin: true,
    affectedMessageCount: 42,
    hasUserConfirmed: true
  });
  assert.strictEqual(valid.canProceed, true);
  assert.strictEqual(valid.requiresConfirmationDialog, false);
  console.log('  ✅ Bulk deletion security guard passed');
}

// 3. Humanized MTProto RPC Error Messages (tdesktop #31540)
{
  console.log('  Testing humanized RPC error translation...');
  const errorFa = E2eMessageInteractionAndSecurityGuard.humanizeRpcError('RPC_ERROR: USER_NOT_PARTICIPANT', 'fa');
  assert.ok(errorFa.includes('این کاربر هنوز عضو این گروه یا کانال نیست'));

  const errorEn = E2eMessageInteractionAndSecurityGuard.humanizeRpcError('CHAT_ADMIN_REQUIRED_ERROR', 'en');
  assert.ok(errorEn.includes('You need administrator permissions'));
  console.log('  ✅ RPC error humanization passed');
}

// 4. Pre-Flight Media Upload Validation (tdesktop #1320)
{
  console.log('  Testing pre-flight media upload validation...');
  // Valid PNG header: [0x89, 0x50, 0x4E, 0x47]
  const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
  const validPng = E2eMessageInteractionAndSecurityGuard.validateMediaPreflight(
    pngHeader,
    1920,
    1080,
    500 * 1024 // 500 KB
  );
  assert.strictEqual(validPng.isValid, true);
  assert.strictEqual(validPng.detectedMime, 'image/png');

  // Excessive dimensions (> 10000px)
  const hugeImage = E2eMessageInteractionAndSecurityGuard.validateMediaPreflight(
    pngHeader,
    25000,
    1080,
    500 * 1024
  );
  assert.strictEqual(hugeImage.isValid, false);
  assert.ok(hugeImage.error?.includes('exceed limit'));

  // Empty file (0 bytes)
  const emptyFile = E2eMessageInteractionAndSecurityGuard.validateMediaPreflight(
    pngHeader,
    100,
    100,
    0
  );
  assert.strictEqual(emptyFile.isValid, false);
  console.log('  ✅ Pre-flight media validation passed');
}

console.log('\n🎉 ALL Phase 32 verification checks passed green!');
