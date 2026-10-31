import assert from 'node:assert';
import {
  InlineGifController,
  VoicePlaybackResilienceController,
  ChatContextBadgeManager,
  MediaBlurOverlayManager,
  HiddenChatFolderGovernor,
  ComposerShiftNavigationHandler,
  TranslationLocaleHeuristicGovernor,
  ChatContextVoiceGifAndNavigationGovernor
} from '../src/services/chatContextVoiceGifAndNavigationGovernor.ts';

console.log('--- STARTING PHASE 110 VERIFICATION TEST SUITE ---');

// 1. InlineGifController tests (telegramdesktop/tdesktop#8)
console.log('Test 1: InlineGifController viewport throttling and memory eviction');
const gifCtrl = new InlineGifController(2, 10000); // max 2 active, max 10000 bytes
const g1 = gifCtrl.registerGif({ id: 'gif1', url: 'https://example.com/1.gif', width: 200, height: 200, durationMs: 1000, byteSize: 2000, isInViewport: false });
const g2 = gifCtrl.registerGif({ id: 'gif2', url: 'https://example.com/2.gif', width: 200, height: 200, durationMs: 1000, byteSize: 2000, isInViewport: false });
const g3 = gifCtrl.registerGif({ id: 'gif3', url: 'https://example.com/3.gif', width: 200, height: 200, durationMs: 1000, byteSize: 2000, isInViewport: false });

gifCtrl.setViewportVisibility('gif1', true);
gifCtrl.setViewportVisibility('gif2', true);
gifCtrl.setViewportVisibility('gif3', true);

// Only 2 should be active playing due to maxActiveGifs = 2
assert.strictEqual(gifCtrl.getActivePlayingCount(), 2, 'Should strictly cap active playing GIFs in viewport to 2');
assert.strictEqual(gifCtrl.getGif('gif1')?.isPlaying, true);
assert.strictEqual(gifCtrl.getGif('gif2')?.isPlaying, true);
assert.strictEqual(gifCtrl.getGif('gif3')?.isPlaying, false);

// Now test memory eviction when registering a heavy GIF that pushes over budget
gifCtrl.setViewportVisibility('gif3', false);
gifCtrl.registerGif({ id: 'gif_heavy', url: 'https://example.com/heavy.gif', width: 400, height: 400, durationMs: 2000, byteSize: 6000, isInViewport: true });
// gif3 was not in viewport, so it should be evicted
assert.strictEqual(gifCtrl.getGif('gif3'), undefined, 'Off-screen GIF should be evicted when budget exceeded');

// 2. VoicePlaybackResilienceController tests (telegramdesktop/tdesktop#24178)
console.log('Test 2: VoicePlaybackResilienceController device change and codec fallback');
const voiceCtrl = new VoicePlaybackResilienceController();
voiceCtrl.play('voice_msg_123', 4.5, 48000);
assert.strictEqual(voiceCtrl.getState().playbackStatus, 'playing');

// Change output device mid-play
const deviceSwapped = voiceCtrl.handleDeviceChange('headphones_bt');
assert.strictEqual(deviceSwapped, true, 'Should smoothly handle audio output device change without breaking');
assert.strictEqual(voiceCtrl.getState().outputDeviceId, 'headphones_bt');
assert.strictEqual(voiceCtrl.getState().playbackStatus, 'playing');

// Trigger decode failure -> engage fallback decoder
const recovered = voiceCtrl.handleDecodeFailure();
assert.strictEqual(recovered, true, 'Should recover via fallback decoder on corrupted/unsupported sample rate');
assert.strictEqual(voiceCtrl.getState().codecFallbackActive, true);
assert.strictEqual(voiceCtrl.getState().sampleRate, 44100);

// 3. ChatContextBadgeManager tests (telegramdesktop/tdesktop#2642)
console.log('Test 3: ChatContextBadgeManager privacy boundary and forward validation');
const contextMgr = new ChatContextBadgeManager();
contextMgr.setChatContext({
  chatId: 'work_channel_1',
  context: 'professional',
  preventCrossForward: true,
  watermarkMedia: true,
});
contextMgr.setChatContext({
  chatId: 'friends_group_2',
  context: 'close_friends',
  preventCrossForward: false,
  watermarkMedia: false,
});

const blockedCheck = contextMgr.validateForwardAllowed('work_channel_1', 'friends_group_2');
assert.strictEqual(blockedCheck.allowed, false, 'Should block forwarding across restricted context boundaries');
assert(blockedCheck.reason?.includes('Cross-context forwarding blocked'));

const allowedCheck = contextMgr.validateForwardAllowed('friends_group_2', 'work_channel_1');
assert.strictEqual(allowedCheck.allowed, true, 'Allowed when preventCrossForward is false');

// 4. MediaBlurOverlayManager tests (telegramdesktop/tdesktop#25061)
console.log('Test 4: MediaBlurOverlayManager aspect ratio backdrop and spoiler blur');
const blurMgr = new MediaBlurOverlayManager();
const backdropResult = blurMgr.computeBackdropRender({
  containerWidth: 400,
  containerHeight: 400, // 1:1
  mediaWidth: 800,
  mediaHeight: 400, // 2:1 (wide deviation)
  isSpoiler: false,
  spoilerRevealed: false,
});
assert.strictEqual(backdropResult.useBlurBackdrop, true, 'Should use blur backdrop for mismatched aspect ratio');
assert.strictEqual(backdropResult.fitMode, 'contain');
assert.strictEqual(backdropResult.blurRadiusPx, 24);

const spoilerResult = blurMgr.computeBackdropRender({
  containerWidth: 400,
  containerHeight: 400,
  mediaWidth: 400,
  mediaHeight: 400,
  isSpoiler: true,
  spoilerRevealed: false,
});
assert.strictEqual(spoilerResult.spoilerActive, true);
assert.strictEqual(spoilerResult.blurRadiusPx, 32);

// 5. HiddenChatFolderGovernor tests (telegramdesktop/tdesktop#678)
console.log('Test 5: HiddenChatFolderGovernor stealth chat isolation');
const hiddenGov = new HiddenChatFolderGovernor();
hiddenGov.setPin('1234');
hiddenGov.hideChat('secret_chat_99');

const allChats = ['public_chat_1', 'secret_chat_99', 'work_chat_2'];
assert.deepStrictEqual(hiddenGov.getVisibleChats(allChats), ['public_chat_1', 'work_chat_2']);
assert.strictEqual(hiddenGov.shouldMaskNotification('secret_chat_99'), true);

// Unlock with wrong PIN
assert.strictEqual(hiddenGov.unlock('0000'), false);
// Unlock with correct PIN
assert.strictEqual(hiddenGov.unlock('1234'), true);
assert.deepStrictEqual(hiddenGov.getVisibleChats(allChats), allChats);
assert.strictEqual(hiddenGov.shouldMaskNotification('secret_chat_99'), false);

// 6. ComposerShiftNavigationHandler tests (telegramdesktop/tdesktop#31546)
console.log('Test 6: ComposerShiftNavigationHandler Shift+Up selection vs Edit Previous');
const compNav = new ComposerShiftNavigationHandler();

// Empty text + Up without Shift -> edit previous message
const editPrev = compNav.handleKeyDown({
  key: 'ArrowUp',
  shiftKey: false,
  ctrlKey: false,
  altKey: false,
  currentText: '',
  selectionStart: 0,
  selectionEnd: 0,
});
assert.strictEqual(editPrev.action, 'edit_previous_message');

// Shift + Up with text -> select text upwards, NEVER edit previous message
const shiftUp = compNav.handleKeyDown({
  key: 'ArrowUp',
  shiftKey: true,
  ctrlKey: false,
  altKey: false,
  currentText: 'Hello world from the composer!',
  selectionStart: 25,
  selectionEnd: 25,
});
assert.strictEqual(shiftUp.action, 'select_text');
assert.strictEqual(shiftUp.newSelectionStart, 5);
assert.strictEqual(shiftUp.newSelectionEnd, 25);

// 7. TranslationLocaleHeuristicGovernor tests (telegramdesktop/tdesktop#31484)
console.log('Test 7: TranslationLocaleHeuristicGovernor language detection fallback');
const transGov = new TranslationLocaleHeuristicGovernor('cs'); // Czech UI

// Low confidence / exotic candidate (e.g. Bambara bm with confidence 0.3)
const lowConfResult = transGov.resolveTargetTranslationLanguage({
  detectedLanguage: 'bm',
  confidence: 0.3,
});
assert.strictEqual(lowConfResult.isReliable, false);
assert.strictEqual(lowConfResult.sourceLang, 'auto');
assert.strictEqual(lowConfResult.targetLang, 'cs'); // Fallback to Czech app UI locale!

// High confidence English text -> target should be Czech UI locale
const highConfResult = transGov.resolveTargetTranslationLanguage({
  detectedLanguage: 'en',
  confidence: 0.95,
});
assert.strictEqual(highConfResult.isReliable, true);
assert.strictEqual(highConfResult.sourceLang, 'en');
assert.strictEqual(highConfResult.targetLang, 'cs');

// 8. Overall Governor instantiation
console.log('Test 8: Master Governor instantiation');
const masterGov = new ChatContextVoiceGifAndNavigationGovernor();
assert(masterGov.gifController instanceof InlineGifController);
assert(masterGov.voiceController instanceof VoicePlaybackResilienceController);
assert(masterGov.contextManager instanceof ChatContextBadgeManager);
assert(masterGov.blurManager instanceof MediaBlurOverlayManager);
assert(masterGov.hiddenFolder instanceof HiddenChatFolderGovernor);
assert(masterGov.composerNav instanceof ComposerShiftNavigationHandler);
assert(masterGov.translationGovernor instanceof TranslationLocaleHeuristicGovernor);

console.log('--- ALL PHASE 110 VERIFICATION TESTS PASSED (100%) ---');
