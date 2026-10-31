import assert from 'node:assert';
import { WebNavigationSpeakingWaveAndAccessibilityGovernor } from '../src/services/webNavigationSpeakingWaveAndAccessibilityGovernor.ts';

console.log('=== Phase 140 Verification: Navigation Stack, Speaking Wave & Accessibility Governor ===');

const governor = new WebNavigationSpeakingWaveAndAccessibilityGovernor();

// Test 1: Chat Navigation History Stack (Push & Navigate Back) (#354)
{
  let state = {
    backStack: [],
    forwardStack: [],
    currentChatId: null,
    maxHistoryLimit: 50
  };

  state = governor.pushChatVisit(state, 101); // Visit Chat 101
  assert.strictEqual(state.currentChatId, 101);
  assert.strictEqual(state.backStack.length, 0);

  state = governor.pushChatVisit(state, 102); // Visit Chat 102
  assert.strictEqual(state.currentChatId, 102);
  assert.deepStrictEqual(state.backStack, [101]);

  state = governor.pushChatVisit(state, 103); // Visit Chat 103
  assert.strictEqual(state.currentChatId, 103);
  assert.deepStrictEqual(state.backStack, [101, 102]);

  // Navigate Back (should return to 102)
  const back1 = governor.navigateBack(state);
  assert.strictEqual(back1.targetChatId, 102);
  assert.deepStrictEqual(back1.updatedState.backStack, [101]);
  assert.deepStrictEqual(back1.updatedState.forwardStack, [103]);

  // Navigate Back again (should return to 101)
  const back2 = governor.navigateBack(back1.updatedState);
  assert.strictEqual(back2.targetChatId, 101);
  assert.deepStrictEqual(back2.updatedState.backStack, []);
  assert.deepStrictEqual(back2.updatedState.forwardStack, [103, 102]);
  console.log('Test 1 Passed: Chat navigation history back stack verified.');
}

// Test 2: Voice Chat Avatar Speaking Wave Animation (#176)
{
  // Speaking with 75% volume
  const speaking = governor.computeSpeakingWaveAnimation(42, 0.75);
  assert.strictEqual(speaking.isSpeaking, true);
  assert.strictEqual(speaking.volumeLevel, 0.75);
  assert.ok(speaking.waveRadiusScale > 1.3);
  assert.ok(speaking.rippleOpacity > 0.6);
  assert.ok(speaking.waveRgbaColor.includes('rgba(51, 144, 236,'));

  // Silent / Not speaking (volume = 0.02 < 0.05 threshold)
  const silent = governor.computeSpeakingWaveAnimation(42, 0.02);
  assert.strictEqual(silent.isSpeaking, false);
  assert.strictEqual(silent.waveRadiusScale, 1.0);
  assert.strictEqual(silent.rippleOpacity, 0.0);
  console.log('Test 2 Passed: Dynamic speaking wave ripple animation metrics verified.');
}

// Test 3: Basic Group to Supergroup Migration Bridge (#306)
{
  const migration = {
    originalBasicGroupId: -10050,
    migratedToSupergroupId: -1001234567890,
    isMigrated: true
  };

  const redirected = governor.resolveSupergroupBridge(-10050, migration);
  assert.strictEqual(redirected.wasRedirected, true);
  assert.strictEqual(redirected.activeChatId, -1001234567890);
  assert.ok(redirected.infoNotice?.includes('upgraded to a supergroup'));

  const normalGroup = governor.resolveSupergroupBridge(-20060, {
    originalBasicGroupId: -20060,
    migratedToSupergroupId: 0,
    isMigrated: false
  });
  assert.strictEqual(normalGroup.wasRedirected, false);
  assert.strictEqual(normalGroup.activeChatId, -20060);
  console.log('Test 3 Passed: Supergroup migration transparent redirection verified.');
}

// Test 4: Screen Reader ARIA Live Region Announcement (#275)
{
  const announcement = governor.generateAriaLiveAnnouncement({
    senderName: 'Sarah Connor',
    messageText: 'Come with me if you want to live.',
    chatTitle: 'Resistance Squad',
    isDirectMessage: false
  });

  assert.strictEqual(announcement.ariaLiveMode, 'polite');
  assert.ok(announcement.announcementText.includes('Sarah Connor'));
  assert.ok(announcement.announcementText.includes('Resistance Squad'));
  assert.ok(announcement.announcementText.includes('Come with me'));
  console.log('Test 4 Passed: WCAG 2.1 ARIA live region announcement verified.');
}

// Test 5: Mini App Custom Iframe Allow Directives (#295)
{
  const policy = governor.buildMiniAppIframeAllowPolicy(['payment', 'web-share']);
  assert.ok(policy.includes('payment'));
  assert.ok(policy.includes('web-share'));
  assert.ok(policy.includes('fullscreen'));
  assert.ok(policy.includes('camera'));
  console.log('Test 5 Passed: Dynamic Mini App iframe allow policy verified.');
}

// Test 6: Tor .onion Privacy & WebRTC Policy (#226, #174)
{
  const onionConfig = governor.configureTorPrivacyPolicy(true);
  assert.strictEqual(onionConfig.webrtcPolicy, 'disable_public_stun_turn');
  assert.strictEqual(onionConfig.dnsPrefetchControl, 'off');

  const standardConfig = governor.configureTorPrivacyPolicy(false);
  assert.strictEqual(standardConfig.webrtcPolicy, 'standard');
  assert.strictEqual(standardConfig.dnsPrefetchControl, 'on');
  console.log('Test 6 Passed: Tor .onion privacy and WebRTC leak protection verified.');
}

// Test 7: Navigation History No-Op on Identical Current Chat
{
  const state = {
    backStack: [1, 2],
    forwardStack: [],
    currentChatId: 3,
    maxHistoryLimit: 50
  };

  const same = governor.pushChatVisit(state, 3);
  assert.deepStrictEqual(same, state);
  console.log('Test 7 Passed: Navigation stack duplicate visit suppression verified.');
}

console.log('=== ALL PHASE 140 TESTS PASSED (100% HEALTH) ===');
