import assert from 'node:assert/strict';
import { UnigramVoipThemeSoundCameraAndProxyGovernor } from '../src/services/unigramVoipThemeSoundCameraAndProxyGovernor.ts';

console.log('🧪 Starting Phase 166: Unigram VoIP, Theme, Sound, Camera, and Proxy Hardening Test Suite...');

const governor = new UnigramVoipThemeSoundCameraAndProxyGovernor();

// =========================================================================
// Test 1: Unigram #2334 - VoIP Call Answer Crash Protection and Device Fallback
// =========================================================================
console.log('Testing Unigram #2334: VoIP call answer crash protection and fallback device...');
{
  // Primary audio device works normally
  const normalCall = governor.answerVoipCallSafely('call_1', 'peer_user_1', false);
  assert.equal(normalCall.state, 'active');
  assert.equal(normalCall.audioTrackBound, true);
  assert.equal(normalCall.usedFallbackDevice, false);

  // Primary audio device fails -> fallback device safely bound without crash!
  const fallbackCall = governor.answerVoipCallSafely('call_2', 'peer_user_2', true);
  assert.equal(fallbackCall.state, 'active');
  assert.equal(fallbackCall.audioTrackBound, true);
  assert.equal(fallbackCall.usedFallbackDevice, true);
  console.log('✅ Unigram #2334: VoIP call answer crash protection verified.');
}

// =========================================================================
// Test 2: Unigram #1107 - Persistent Theme Settings Migration Across Updates
// =========================================================================
console.log('Testing Unigram #1107: Theme settings persistence and schema migration...');
{
  // Older app version JSON without schemaVersion
  const oldThemeJson = JSON.stringify({ isDark: true, accentColor: '#ff8800' });
  const migrated = governor.migrateAndLoadTheme(oldThemeJson);
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.themeMode, 'dark');
  assert.equal(migrated.accentColorHex, '#ff8800');

  // Corrupt string -> does not crash or reset to default light
  const corrupt = governor.migrateAndLoadTheme('{ corrupted json ...');
  assert.equal(corrupt.themeMode, 'dark'); // Retains previous choice
  console.log('✅ Unigram #1107: Persistent theme migration verified.');
}

// =========================================================================
// Test 3: Unigram #619 - Custom Notification Sound Manager for PC
// =========================================================================
console.log('Testing Unigram #619: Custom PC notification sounds and chat mapping...');
{
  governor.registerCustomSound({
    soundId: 'chime_guitar',
    name: 'Guitar Chime',
    filePath: 'C:/sounds/guitar.wav',
    format: 'wav'
  });

  // Assign sound to specific chat
  const assigned = governor.setChatNotificationSound('chat_family', 'chime_guitar');
  assert.equal(assigned, true);

  const resolved = governor.resolveNotificationSound('chat_family');
  assert.ok(resolved);
  assert.equal(resolved.soundId, 'chime_guitar');
  assert.equal(resolved.format, 'wav');
  console.log('✅ Unigram #619: Custom PC notification sounds verified.');
}

// =========================================================================
// Test 4: Unigram #569 - My People Taskbar Contact Badge Synchronization
// =========================================================================
console.log('Testing Unigram #569: My People pinned contact badge count sync and clear...');
{
  // 3 unread messages for pinned contact
  const count = governor.updateMyPeopleBadge('contact_alice', 3);
  assert.equal(count, 3);

  // User opens chat and reads messages -> badge resets to 0 immediately
  const cleared = governor.markContactChatRead('contact_alice');
  assert.equal(cleared, 0);
  console.log('✅ Unigram #569: My People badge sync verified.');
}

// =========================================================================
// Test 5: Unigram #264 - Keyboard Emoji Picker Shortcuts and Autocomplete
// =========================================================================
console.log('Testing Unigram #264: Keyboard emoji picker trigger and colon autocomplete...');
{
  // Ctrl+Shift+E shortcut
  const shortcutTrigger = governor.handleKeyboardEmojiTrigger({
    key: 'e',
    ctrlKey: true,
    metaKey: false,
    shiftKey: true,
    textBeforeCursor: ''
  });
  assert.equal(shortcutTrigger.shouldOpenPicker, true);

  // Colon autocomplete ":fire"
  const colonTrigger = governor.handleKeyboardEmojiTrigger({
    key: 'e',
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    textBeforeCursor: 'This is great :fire'
  });
  assert.equal(colonTrigger.shouldOpenPicker, true);
  assert.equal(colonTrigger.queryPrompt, 'fire');
  console.log('✅ Unigram #264: Keyboard emoji picker verified.');
}

// =========================================================================
// Test 6: Unigram #3375 - Virtual Camera Detection (OBS/SplitCam)
// =========================================================================
console.log('Testing Unigram #3375: Virtual camera detection for video notes...');
{
  const rawDevices = [
    { deviceId: 'dev_1', label: 'Integrated Webcam HD' },
    { deviceId: 'dev_2', label: 'OBS Virtual Camera' },
    { deviceId: 'dev_3', label: 'SplitCam Video Source' }
  ];

  const processed = governor.filterSupportedVideoDevices(rawDevices);
  assert.equal(processed.length, 3);
  assert.equal(processed[0].isVirtualCamera, false);
  assert.equal(processed[1].isVirtualCamera, true); // OBS Virtual Camera identified
  assert.equal(processed[2].isVirtualCamera, true); // SplitCam identified
  console.log('✅ Unigram #3375: Virtual camera support verified.');
}

// =========================================================================
// Test 7: Unigram #3312 - Persistent Proxy Shield Button Visibility
// =========================================================================
console.log('Testing Unigram #3312: Persistent proxy shield button visibility in header...');
{
  governor.setProxyAlwaysVisible(true);

  // When proxy is disconnected, shield remains visible with 'disconnected' status
  const disconnected = governor.updateProxyState('disconnected');
  assert.equal(disconnected.isVisible, true);
  assert.equal(disconnected.statusIcon, 'disconnected');

  // When connecting
  const connecting = governor.updateProxyState('connecting', 'proxy_london');
  assert.equal(connecting.isVisible, true);
  assert.equal(connecting.statusIcon, 'connecting');

  // When connected
  const connected = governor.updateProxyState('connected', 'proxy_london');
  assert.equal(connected.isVisible, true);
  assert.equal(connected.statusIcon, 'connected');
  assert.equal(connected.activeProxyId, 'proxy_london');
  console.log('✅ Unigram #3312: Persistent proxy shield button verified.');
}

console.log('🎉 Phase 166: All 7 Unigram hardening tests PASSED with 100% precision!');
