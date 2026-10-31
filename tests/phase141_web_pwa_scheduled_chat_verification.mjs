import assert from 'node:assert';
import { WebPwaScheduledChatAndCompatibilityGovernor } from '../src/services/webPwaScheduledChatAndCompatibilityGovernor.ts';

console.log('=== Phase 141 Verification: Web PWA, Scheduled Chat & Compatibility Governor ===');

const governor = new WebPwaScheduledChatAndCompatibilityGovernor();

// Test 1: PWA Manifest with ChromeOS Maskable Adaptive Icons (#159)
{
  const manifest = governor.generatePwaManifest({
    appName: 'Guidegram Web',
    shortName: 'Guidegram',
    themeColor: '#161B22',
    backgroundColor: '#0D1117',
    startUrl: '/'
  });

  assert.strictEqual(manifest.name, 'Guidegram Web');
  assert.strictEqual(manifest.display, 'standalone');
  const icons = manifest.icons;
  assert.ok(icons.some(i => i.purpose === 'maskable' && i.sizes === '512x512'));
  console.log('Test 1 Passed: PWA manifest with ChromeOS maskable icon verified.');
}

// Test 2: Message Length Over-limit Boundary Guard (4096 Limit) (#86)
{
  const normalText = 'This is a normal message.';
  const checkNormal = governor.evaluateMessageLength(normalText, 4096);
  assert.strictEqual(checkNormal.isOverLimit, false);
  assert.strictEqual(checkNormal.remainingChars, 4096 - normalText.length);
  assert.strictEqual(checkNormal.warningNotice, undefined);

  // Massive text exceeding 4096 chars
  const overflowText = 'A'.repeat(4150);
  const checkOverflow = governor.evaluateMessageLength(overflowText, 4096);
  assert.strictEqual(checkOverflow.isOverLimit, true);
  assert.strictEqual(checkOverflow.remainingChars, -54);
  assert.ok(checkOverflow.warningNotice?.includes('exceeds the limit by 54 characters'));
  console.log('Test 2 Passed: 4096 character overflow guard and warning notice verified.');
}

// Test 3: Scheduled Voice/Video Chat Countdown (#72)
{
  const currentSec = 1750000000;
  const chatDetails = {
    chatId: 1001,
    scheduleTimestamp: currentSec + 125, // 2m 5s in future
    title: 'Weekly All-Hands Video Chat',
    isSubscribedForReminder: true
  };

  const countdown = governor.computeScheduledChatCountdown(chatDetails, currentSec);
  assert.strictEqual(countdown.secondsRemaining, 125);
  assert.strictEqual(countdown.formattedCountdown, '2m 5s');
  assert.strictEqual(countdown.isStartingNow, false);
  assert.strictEqual(countdown.canJoinDirectly, true); // Within 5 minutes

  // Chat starting now
  const started = governor.computeScheduledChatCountdown(chatDetails, currentSec + 200);
  assert.strictEqual(started.isStartingNow, true);
  assert.strictEqual(started.formattedCountdown, 'Starting now');
  console.log('Test 3 Passed: Scheduled video chat countdown and join readiness verified.');
}

// Test 4: Browser Capability & Minimum Requirements (#70)
{
  const modernBrowser = governor.evaluateBrowserCapabilities({
    hasWasm: true,
    hasBigInt: true,
    hasCrypto: true,
    hasIdb: true,
    hasWebGl2: true
  });
  assert.strictEqual(modernBrowser.isFullySupported, true);
  assert.strictEqual(modernBrowser.missingFeatures.length, 0);

  const outdatedBrowser = governor.evaluateBrowserCapabilities({
    hasWasm: false,
    hasBigInt: true,
    hasCrypto: true,
    hasIdb: true,
    hasWebGl2: false
  });
  assert.strictEqual(outdatedBrowser.isFullySupported, false);
  assert.ok(outdatedBrowser.missingFeatures.includes('WebAssembly'));
  assert.ok(outdatedBrowser.missingFeatures.includes('WebGL 2.0'));
  console.log('Test 4 Passed: Browser capability inspection verified.');
}

// Test 5: Phone Change Resend Cooldown Management (#112)
{
  const justSent = Date.now() - 20000; // 20s ago
  const cooldownActive = governor.evaluateResendCooldown(justSent, 60);
  assert.strictEqual(cooldownActive.canResend, false);
  assert.ok(cooldownActive.secondsRemaining >= 39 && cooldownActive.secondsRemaining <= 41);

  const expiredCooldown = Date.now() - 70000; // 70s ago
  const cooldownReady = governor.evaluateResendCooldown(expiredCooldown, 60);
  assert.strictEqual(cooldownReady.canResend, true);
  assert.strictEqual(cooldownReady.secondsRemaining, 0);
  console.log('Test 5 Passed: Phone change verification code cooldown manager verified.');
}

// Test 6: Message Near-Limit Warning (Remaining <= 200)
{
  const nearLimitText = 'B'.repeat(3950);
  const checkNear = governor.evaluateMessageLength(nearLimitText, 4096);
  assert.strictEqual(checkNear.isOverLimit, false);
  assert.strictEqual(checkNear.remainingChars, 146);
  assert.strictEqual(checkNear.warningNotice, '146 characters remaining');
  console.log('Test 6 Passed: Near-limit remaining characters badge verified.');
}

// Test 7: Long Countdown Formatting (Hours + Minutes)
{
  const chatFuture = {
    chatId: 2002,
    scheduleTimestamp: 1750007200,
    title: 'Future AMA',
    isSubscribedForReminder: true
  };
  const countFuture = governor.computeScheduledChatCountdown(chatFuture, 1750000000); // 7200s = 2h 0m
  assert.strictEqual(countFuture.formattedCountdown, '2h 0m');
  assert.strictEqual(countFuture.canJoinDirectly, false);
  console.log('Test 7 Passed: Multi-hour scheduled countdown formatting verified.');
}

console.log('=== ALL PHASE 141 TESTS PASSED (100% HEALTH) ===');
