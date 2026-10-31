import assert from 'node:assert';
import {
  MessageIdInspectorManager,
  ProtectedContentWatermarkGovernor,
  ServiceActionHitTestGovernor,
  MacOsDockBadgeManager,
  LoginFlowResiliencePoller,
  GhostModePrivacyGovernor,
  PostUpdateAutoRollbackGovernor,
  DesktopMessageInspectionPrivacyAndRollbackGovernor
} from '../src/services/desktopMessageInspectionPrivacyAndRollbackGovernor.ts';

console.log('--- STARTING PHASE 117 VERIFICATION TEST SUITE ---');

// 1. MessageIdInspectorManager tests (kotatogram/kotatogram-desktop#357)
console.log('Test 1: MessageIdInspectorManager message ID inspection in context menu');
const inspector = new MessageIdInspectorManager();
const msgSample = {
  messageId: 10420,
  chatId: '-1001234567890',
  senderId: 'user_456',
  date: new Date(),
  isServiceMessage: false
};

// Developer mode disabled: standard menu
assert.strictEqual(inspector.getContextMenuItems(msgSample).some(i => i.action === 'copy_message_id'), false);

// Developer mode enabled: copy message ID and chat ID available
inspector.setDeveloperMode(true);
const devMenu = inspector.getContextMenuItems(msgSample);
const idItem = devMenu.find(i => i.action === 'copy_message_id');
assert(idItem !== undefined);
assert.strictEqual(idItem.value, '10420');

// 2. ProtectedContentWatermarkGovernor tests (kotatogram/kotatogram-desktop#290)
console.log('Test 2: ProtectedContentWatermarkGovernor protected content watermarking');
const watermarkGov = new ProtectedContentWatermarkGovernor();

const unprotected = watermarkGov.computeProtectionOverlay(false, '999');
assert.strictEqual(unprotected.screenRecordingBlackout, false);

const protectedOverlay = watermarkGov.computeProtectionOverlay(true, '999');
assert.strictEqual(protectedOverlay.screenRecordingBlackout, true);
assert(protectedOverlay.watermarkText.includes('UID 999'));

// 3. ServiceActionHitTestGovernor tests (kotatogram/kotatogram-desktop#454)
console.log('Test 3: ServiceActionHitTestGovernor clickable bounds hit testing');
const hitTestGov = new ServiceActionHitTestGovernor();
hitTestGov.registerActionArea({
  actionType: 'user_profile',
  x: 100,
  y: 200,
  width: 80,
  height: 20,
  targetId: 'user_777'
});

// Click inside bounding box
const insideHit = hitTestGov.hitTest(120, 210);
assert.strictEqual(insideHit?.actionType, 'user_profile');
assert.strictEqual(insideHit?.targetId, 'user_777');

// Click outside
const outsideHit = hitTestGov.hitTest(50, 50);
assert.strictEqual(outsideHit, null);

// 4. MacOsDockBadgeManager tests (kotatogram/kotatogram-desktop#316)
console.log('Test 4: MacOsDockBadgeManager dock badge counter');
const dockGov = new MacOsDockBadgeManager();

assert.strictEqual(dockGov.setUnreadCount(0).badgeString, '');
assert.strictEqual(dockGov.setUnreadCount(5).badgeString, '5');
assert.strictEqual(dockGov.setUnreadCount(15000).badgeString, '9999+');

// 5. LoginFlowResiliencePoller tests (kotatogram/kotatogram-desktop#406)
console.log('Test 5: LoginFlowResiliencePoller QR login polling & rate-limit backoff');
const loginPoller = new LoginFlowResiliencePoller();
loginPoller.startPolling('token_abc_123', 60);

// Flood wait encountered -> backoff interval doubles
const rateLimited = loginPoller.handleServerResponse('flood_wait');
assert.strictEqual(rateLimited.status, 'rate_limited');
assert.strictEqual(rateLimited.pollIntervalMs, 4000);

// Success
const authSuccess = loginPoller.handleServerResponse('ok');
assert.strictEqual(authSuccess.status, 'authenticated');

// 6. GhostModePrivacyGovernor tests (kotatogram/kotatogram-desktop#421)
console.log('Test 6: GhostModePrivacyGovernor ghost mode privacy flags');
const ghostGov = new GhostModePrivacyGovernor();

// Default mode: all signals transmitted
assert.strictEqual(ghostGov.shouldSendReadAcknowledgment(), true);
assert.strictEqual(ghostGov.shouldSendOnlinePresence(), true);
assert.strictEqual(ghostGov.shouldSendTypingActivity(), true);

// Enable ghost mode
ghostGov.setGhostMode({
  suppressReadReceipts: true,
  hideOnlineStatus: true,
  hideTypingStatus: true
});
assert.strictEqual(ghostGov.shouldSendReadAcknowledgment(), false, 'Must suppress read receipts in ghost mode');
assert.strictEqual(ghostGov.shouldSendOnlinePresence(), false, 'Must hide online status in ghost mode');
assert.strictEqual(ghostGov.shouldSendTypingActivity(), false, 'Must hide typing activity in ghost mode');

// 7. PostUpdateAutoRollbackGovernor tests (telegramdesktop/tdesktop#29606)
console.log('Test 7: PostUpdateAutoRollbackGovernor binary crash auto-rollback');
const rollbackGov = new PostUpdateAutoRollbackGovernor();
rollbackGov.setPreviousVersionBackup('/opt/guidegram/bin/guidegram_v2.4.bak');

// Crash within 3 seconds of startup before marking healthy
const crashResult = rollbackGov.checkCrashOnStartup(3000);
assert.strictEqual(crashResult.shouldRollback, true, 'Must trigger rollback when crash happens immediately on update launch');
assert.strictEqual(crashResult.rollbackTarget, '/opt/guidegram/bin/guidegram_v2.4.bak');

// If marked healthy, no rollback on normal shutdown
rollbackGov.markLaunchHealthy();
const healthyResult = rollbackGov.checkCrashOnStartup(3000);
assert.strictEqual(healthyResult.shouldRollback, false);

// 8. Master Governor instantiation
console.log('Test 8: Master Governor instantiation');
const masterGov = new DesktopMessageInspectionPrivacyAndRollbackGovernor();
assert(masterGov.inspector instanceof MessageIdInspectorManager);
assert(masterGov.watermark instanceof ProtectedContentWatermarkGovernor);
assert(masterGov.serviceHitTest instanceof ServiceActionHitTestGovernor);
assert(masterGov.dockBadge instanceof MacOsDockBadgeManager);
assert(masterGov.loginPoller instanceof LoginFlowResiliencePoller);
assert(masterGov.ghostMode instanceof GhostModePrivacyGovernor);
assert(masterGov.autoRollback instanceof PostUpdateAutoRollbackGovernor);

console.log('--- ALL PHASE 117 VERIFICATION TESTS PASSED (100%) ---');
