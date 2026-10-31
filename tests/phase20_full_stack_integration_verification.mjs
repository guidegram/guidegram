import assert from 'node:assert';
import {
  MiniAppViewportExpandManager,
  SpoilerAccessibilityAndRevealGuard,
  AdaptiveHighResImageSelector,
  UserPresenceHeartbeatManager,
} from '../src/services/fullStackIntegrationOrchestrator.ts';

function runTests() {
  console.log('[Phase 20 Verification] Starting tests...');

  // --- Test 1: MiniAppViewportExpandManager (#1302) ---
  const expandMgr = new MiniAppViewportExpandManager();
  assert.strictEqual(expandMgr.getState().isExpanded, false);

  const expanded = expandMgr.expand(900, 420);
  assert.strictEqual(expanded.isExpanded, true);
  assert.strictEqual(expanded.height, 900);
  assert.strictEqual(expanded.width, 420);

  const collapsed = expandMgr.collapse(600);
  assert.strictEqual(collapsed.isExpanded, false);
  assert.strictEqual(collapsed.height, 600);
  console.log('✓ Test 1: MiniAppViewportExpandManager passed');

  // --- Test 2: SpoilerAccessibilityAndRevealGuard (#410) ---
  const spoilerGuard = new SpoilerAccessibilityAndRevealGuard();
  assert.strictEqual(spoilerGuard.isSpoilerRevealed('sp_1'), false);

  // Reveal individual spoiler
  spoilerGuard.revealSpoiler('sp_1');
  assert.strictEqual(spoilerGuard.isSpoilerRevealed('sp_1'), true);
  assert.strictEqual(spoilerGuard.isSpoilerRevealed('sp_2'), false);

  // Global "Reveal All Spoilers" toggle active
  spoilerGuard.setGlobalRevealAll(true);
  assert.strictEqual(spoilerGuard.isSpoilerRevealed('sp_2'), true, 'All spoilers must be revealed when global toggle is ON');
  console.log('✓ Test 2: SpoilerAccessibilityAndRevealGuard passed');

  // --- Test 3: AdaptiveHighResImageSelector (#943, #2206) ---
  const variants = [
    { type: 'thumb_320', width: 320, height: 240, url: '320.jpg' },
    { type: 'standard_800', width: 800, height: 600, url: '800.jpg' },
    { type: 'large_1280', width: 1280, height: 960, url: '1280.jpg' },
    { type: 'ultra_2560', width: 2560, height: 1920, url: '2560.jpg' },
  ];

  // Standard display: 400px container, DPR 1.0 -> needs 400px -> standard_800
  const opt1 = AdaptiveHighResImageSelector.selectOptimalVariant(400, 1.0, variants);
  assert.strictEqual(opt1?.type, 'standard_800');

  // High-DPI display: 1200px container, DPR 2.0 -> needs 2400px -> ultra_2560
  const opt2 = AdaptiveHighResImageSelector.selectOptimalVariant(1200, 2.0, variants);
  assert.strictEqual(opt2?.type, 'ultra_2560', 'High-DPI display must receive 2560px ultra resolution');
  console.log('✓ Test 3: AdaptiveHighResImageSelector passed');

  // --- Test 4: UserPresenceHeartbeatManager (#1117) ---
  const presenceMgr = new UserPresenceHeartbeatManager();
  const t0 = 1000000;
  presenceMgr.recordActivity(t0);

  // 2 minutes later: active
  const resActive = presenceMgr.evaluatePresence(t0 + 2 * 60 * 1000);
  assert.strictEqual(resActive.isOnline, true);
  assert.strictEqual(resActive.status, 'active');

  // 6 minutes later: idle (> 5 minutes threshold)
  const resIdle = presenceMgr.evaluatePresence(t0 + 6 * 60 * 1000);
  assert.strictEqual(resIdle.isOnline, false, 'Heartbeat must drop offline after 5 mins idle (#1117)');
  assert.strictEqual(resIdle.status, 'idle');
  console.log('✓ Test 4: UserPresenceHeartbeatManager passed');

  console.log('[Phase 20 Verification] ALL VERIFICATION TESTS PASSED!');
}

runTests();
