import assert from 'node:assert';
import { Web2FAWebShareAndSpatialAudioGovernor } from '../src/services/web2FAWebShareAndSpatialAudioGovernor.ts';

console.log('=== Phase 138 Verification: Web 2FA Recovery, Web Share & Spatial Audio Governor ===');

const governor = new Web2FAWebShareAndSpatialAudioGovernor();

// Test 1: 2FA Cloud Password Email Recovery (#194)
{
  const canRecover = governor.initiate2FaEmailRecovery({
    hasRecoveryEmail: true,
    emailPatternMasked: 'er***@gmail.com',
    recoveryCodeRequested: true
  });

  assert.strictEqual(canRecover.canRecoverViaEmail, true);
  assert.strictEqual(canRecover.actionRequired, 'enter_email_code');
  assert.ok(canRecover.maskedEmailNotice?.includes('er***@gmail.com'));

  const pendingReset = governor.initiate2FaEmailRecovery({
    hasRecoveryEmail: false,
    recoveryCodeRequested: false,
    pendingResetDaysRemaining: 7
  });
  assert.strictEqual(pendingReset.canRecoverViaEmail, false);
  assert.strictEqual(pendingReset.actionRequired, 'wait_pending_reset');
  console.log('Test 1 Passed: 2FA cloud password recovery flow verified.');
}

// Test 2: Native Web Share API Execution (#122)
{
  const nativeResult = governor.executeWebShare({
    title: 'Check out Guidegram',
    url: 'https://guidegram.io'
  }, true);

  assert.strictEqual(nativeResult.strategyUsed, 'navigator_share');
  assert.strictEqual(nativeResult.isSuccess, true);
  assert.ok(nativeResult.sharedPayloadText.includes('https://guidegram.io'));
  console.log('Test 2 Passed: Native Web Share API execution verified.');
}

// Test 3: Web Share API Clipboard Fallback (#122)
{
  const fallbackResult = governor.executeWebShare({
    title: 'Interesting Post',
    text: 'Read this article'
  }, false);

  assert.strictEqual(fallbackResult.strategyUsed, 'clipboard_fallback');
  assert.strictEqual(fallbackResult.isSuccess, true);
  assert.ok(fallbackResult.sharedPayloadText.includes('Read this article'));
  console.log('Test 3 Passed: Web Share clipboard fallback verified.');
}

// Test 4: Meta Quest VR Controller Debounce & Accidental Tap (#728)
{
  // Very fast trigger tap in Quest 3 VR browser (250ms)
  const vrTapAnalysis = governor.evaluateVoiceRecordQuality(250, -20, true);
  assert.strictEqual(vrTapAnalysis.canSendVoiceNote, false);
  assert.ok(vrTapAnalysis.rejectionReason?.includes('Voice recording too short'));

  // Sustained hold in Quest 3 (1200ms) with audible voice
  const vrValidAnalysis = governor.evaluateVoiceRecordQuality(1200, -18, true);
  assert.strictEqual(vrValidAnalysis.canSendVoiceNote, true);
  assert.strictEqual(vrValidAnalysis.isSilentVoiceNote, false);
  console.log('Test 4 Passed: Meta Quest VR controller trigger debounce verified.');
}

// Test 5: Microphone Silence Detection Guard (#727)
{
  // Audio recorded for 2 seconds but mic was dead/silent (-60 dB)
  const silentAnalysis = governor.evaluateVoiceRecordQuality(2000, -60, false);
  assert.strictEqual(silentAnalysis.canSendVoiceNote, false);
  assert.strictEqual(silentAnalysis.isSilentVoiceNote, true);
  assert.ok(silentAnalysis.rejectionReason?.includes('Silent audio detected'));
  console.log('Test 5 Passed: Microphone silence rejection guard verified.');
}

// Test 6: Storage Corruption & Self-Healing (#152, #141)
{
  const corrupted = governor.evaluateStorageHealth(true, false);
  assert.strictEqual(corrupted.needsReset, true);
  assert.strictEqual(corrupted.action, 'purge_corrupted_cache_and_reload');

  const healthy = governor.evaluateStorageHealth(false, false);
  assert.strictEqual(healthy.needsReset, false);
  assert.strictEqual(healthy.action, 'none');
  console.log('Test 6 Passed: Storage corruption self-healing verified.');
}

// Test 7: Normal Desktop Voice Recording (700ms, -15 dB)
{
  const desktopVoice = governor.evaluateVoiceRecordQuality(700, -15, false);
  assert.strictEqual(desktopVoice.canSendVoiceNote, true);
  assert.strictEqual(desktopVoice.isSilentVoiceNote, false);
  console.log('Test 7 Passed: Standard voice recording validation verified.');
}

console.log('=== ALL PHASE 138 TESTS PASSED (100% HEALTH) ===');
