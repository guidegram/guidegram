import assert from 'node:assert/strict';
import { ModalHierarchyAndFileDialogGovernor } from '../src/services/modalHierarchyAndFileDialogGovernor.ts';

console.log('🧪 Starting Phase 39 Modal Hierarchy & File Dialog Verification Suite...');

// 1. Z-Index Layer Stacking Context (Ajaxy/telegram-tt #515)
{
  console.log('  Testing modal z-index layer hierarchy...');
  const mediaLayer = ModalHierarchyAndFileDialogGovernor.pushModalLayer('media-view-1', 'media_viewer');
  const deleteModal = ModalHierarchyAndFileDialogGovernor.pushModalLayer('confirm-delete-1', 'dialog');
  const toastLayer = ModalHierarchyAndFileDialogGovernor.pushModalLayer('toast-alert-1', 'toast');

  assert.strictEqual(mediaLayer.zIndex, 500);
  assert.strictEqual(deleteModal.zIndex, 1000);
  assert.strictEqual(toastLayer.zIndex, 2000);
  assert.ok(deleteModal.zIndex > mediaLayer.zIndex, 'Delete modal MUST have higher z-index than media viewer');

  // Pop layer
  const popRes = ModalHierarchyAndFileDialogGovernor.popModalLayer('confirm-delete-1');
  assert.strictEqual(popRes.remainingLayers, 2);
  console.log('  ✅ Modal layer hierarchy passed');
}

// 2. Forward Selection with Deleted Message Purging (kotatogram #306)
{
  console.log('  Testing forward dialog deleted message validation...');
  const liveMessageIds = new Set([101, 103, 105]);
  const candidates = [
    { id: 101, text: 'Hello' },
    { id: 102, text: 'Deleted mid-selection', isDeleted: true }, // deleted
    { id: 103, text: 'World' },
    { id: 999, text: 'Missing' } // missing from live IDs
  ];

  const validation = ModalHierarchyAndFileDialogGovernor.validateForwardSelection(candidates, liveMessageIds);
  assert.strictEqual(validation.canForward, true);
  assert.strictEqual(validation.validMessages.length, 2);
  assert.strictEqual(validation.purgedDeletedCount, 2);
  assert.strictEqual(validation.validMessages[0].id, 101);
  assert.strictEqual(validation.validMessages[1].id, 103);
  console.log('  ✅ Forward selection validation passed');
}

// 3. Drawer Outside Navigation Sequencing (kotatogram #298)
{
  console.log('  Testing drawer dismissal & background conversation sequencing...');
  const nav = ModalHierarchyAndFileDialogGovernor.handleDrawerOutsideNavigation(true, 42);
  assert.strictEqual(nav.shouldDismissDrawer, true);
  assert.strictEqual(nav.shouldNavigateChat, true);
  assert.strictEqual(nav.targetChatId, 42);
  console.log('  ✅ Drawer navigation sequencing passed');
}

// 4. Constant-Time Passcode Verification (morethanwords/tweb #707)
{
  console.log('  Testing passcode verification...');
  const simpleHasher = (str) => `hash_${str}`;
  const correctHash = 'hash_1234';

  // Correct passcode
  const res1 = ModalHierarchyAndFileDialogGovernor.verifyPasscode('1234', correctHash, simpleHasher);
  assert.strictEqual(res1.isUnlocked, true);
  assert.strictEqual(res1.shouldClearInput, true);

  // Wrong passcode
  const res2 = ModalHierarchyAndFileDialogGovernor.verifyPasscode('0000', correctHash, simpleHasher);
  assert.strictEqual(res2.isUnlocked, false);
  assert.strictEqual(res2.attemptsRemaining, 4);
  console.log('  ✅ Passcode verification passed');
}

// 5. Asynchronous Non-Blocking File Dialog (tdesktop #31459)
{
  console.log('  Testing non-blocking file picker execution...');
  const mockPicker = async () => ['/home/user/document.pdf'];
  const res = await ModalHierarchyAndFileDialogGovernor.executeNonBlockingFileDialog(mockPicker);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.files?.[0], '/home/user/document.pdf');
  console.log('  ✅ File picker execution passed');
}

console.log('\n🎉 ALL Phase 39 verification checks passed green!');
