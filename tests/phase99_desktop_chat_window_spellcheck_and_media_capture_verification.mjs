/**
 * Test Suite: Phase 99 Desktop Chat Window, Spellcheck & Media Capture Verification
 * 
 * Verifies fixes for:
 * - telegramdesktop/tdesktop #96: Missing multi-language spellchecking & custom dictionary
 * - telegramdesktop/tdesktop #1107: Categories / folders in list of chats
 * - telegramdesktop/tdesktop #781: Take photo using Webcam from desktop app
 * - telegramdesktop/tdesktop #2787: Using OpenStreetMap (OSM) instead of proprietary Google Maps
 * - telegramdesktop/tdesktop #2105: Multi-window tear-off / open each chat in separate window
 * - telegramdesktop/tdesktop #16781: Crash on screen sharing during voice/video calls
 * - telegramdesktop/tdesktop #29874: Crash when clicking on unhydrated/corrupt chat in chat list
 */

import assert from 'node:assert';
import { desktopChatWindowSpellcheckAndMediaCaptureGovernor } from '../src/services/desktopChatWindowSpellcheckAndMediaCaptureGovernor.ts';

console.log('🧪 Starting Phase 99 Desktop Chat Window & Spellcheck Verification Suite...');

// 1. Spellchecking & Custom Dictionary
console.log('  Testing spellchecking and dictionary augmentation...');
const text = 'Hello world check telegrm guidegram';
const typos = desktopChatWindowSpellcheckAndMediaCaptureGovernor.checkSpelling(text);
// "telegrm" is misspelled, "guidegram" is in customDictionary
assert.strictEqual(typos.length, 1);
assert.strictEqual(typos[0].word, 'telegrm');
assert.ok(typos[0].suggestions.includes('telegram'));

desktopChatWindowSpellcheckAndMediaCaptureGovernor.addToCustomDictionary('telegrm');
const typosAfterAdd = desktopChatWindowSpellcheckAndMediaCaptureGovernor.checkSpelling(text);
assert.strictEqual(typosAfterAdd.length, 0);
console.log('  ✅ Spellcheck and custom dictionary verified');

// 2. Chat Categories & Filtering
console.log('  Testing chat categories & filtering...');
const sampleChats = [
  { id: '1', type: 'channel', isArchived: false, isMuted: false },
  { id: '2', type: 'group', isArchived: false, isMuted: true },
  { id: '3', type: 'user', isArchived: true, isMuted: false },
  { id: '4', type: 'user', isArchived: false, isMuted: false },
];

const channels = desktopChatWindowSpellcheckAndMediaCaptureGovernor.filterChatsByCategory(sampleChats, 'channels');
assert.strictEqual(channels.length, 1);
assert.strictEqual(channels[0].id, '1');

const direct = desktopChatWindowSpellcheckAndMediaCaptureGovernor.filterChatsByCategory(sampleChats, 'direct');
assert.strictEqual(direct.length, 2);
console.log('  ✅ Chat categories and folder filtering verified');

// 3. Webcam Photo Capture
console.log('  Testing webcam photo snapshot capture...');
const snap = desktopChatWindowSpellcheckAndMediaCaptureGovernor.captureWebcamSnapshot({ width: 1280, height: 720 });
assert.strictEqual(snap.success, true);
assert.ok(snap.frameDataUri?.includes('1280x720'));

const failSnap = desktopChatWindowSpellcheckAndMediaCaptureGovernor.captureWebcamSnapshot({}, true);
assert.strictEqual(failSnap.success, false);
assert.ok(failSnap.error?.includes('HARDWARE_ERROR'));
console.log('  ✅ Webcam capture and hardware error handling verified');

// 4. OpenStreetMap (OSM) Tile Provider
console.log('  Testing OpenStreetMap tile generation...');
const tile = desktopChatWindowSpellcheckAndMediaCaptureGovernor.getOsmTileUrl(35.6892, 51.3890, 12); // Tehran coordinates
assert.ok(tile.tileUrl.startsWith('https://tile.openstreetmap.org/12/'));
assert.strictEqual(tile.attribution, '© OpenStreetMap contributors');
console.log('  ✅ Privacy-preserving OSM tile resolution verified');

// 5. Multi-Window Tear-Off
console.log('  Testing opening chat in separate window...');
const win = desktopChatWindowSpellcheckAndMediaCaptureGovernor.openChatInSeparateWindow('chat_team_1', 'Engineering Team');
assert.strictEqual(win.chatId, 'chat_team_1');
assert.strictEqual(win.title, 'Engineering Team');

const foundWin = desktopChatWindowSpellcheckAndMediaCaptureGovernor.getSeparateWindowForChat('chat_team_1');
assert.strictEqual(foundWin?.windowId, win.windowId);

const closed = desktopChatWindowSpellcheckAndMediaCaptureGovernor.closeSeparateWindow('chat_team_1');
assert.strictEqual(closed, true);
assert.strictEqual(desktopChatWindowSpellcheckAndMediaCaptureGovernor.getSeparateWindowForChat('chat_team_1'), undefined);
console.log('  ✅ Multi-window tear-off lifecycle verified');

// 6. Safe Screen Sharing
console.log('  Testing screen share lifecycle & source handling...');
const share = desktopChatWindowSpellcheckAndMediaCaptureGovernor.startScreenShare('disp_0', 'Entire Screen 1');
assert.strictEqual(share.success, true);
assert.strictEqual(share.stream?.sourceId, 'disp_0');

const stopped = desktopChatWindowSpellcheckAndMediaCaptureGovernor.stopScreenShare('disp_0');
assert.strictEqual(stopped, true);
console.log('  ✅ Safe screen share stream management verified');

// 7. Safe Chat Selection / Crash Prevention
console.log('  Testing safe chat selection on null/corrupt models...');
// Null chat
const nullRes = desktopChatWindowSpellcheckAndMediaCaptureGovernor.selectChatSafely(null);
assert.strictEqual(nullRes.success, false);
assert.strictEqual(nullRes.errorFallbackRendered, true);

// Missing ID
const missingIdRes = desktopChatWindowSpellcheckAndMediaCaptureGovernor.selectChatSafely({ title: 'Corrupt' });
assert.strictEqual(missingIdRes.success, false);
assert.strictEqual(missingIdRes.errorFallbackRendered, true);

// Valid chat
const validRes = desktopChatWindowSpellcheckAndMediaCaptureGovernor.selectChatSafely({ id: 'c_123', title: 'Valid Chat', unreadCount: 5 });
assert.strictEqual(validRes.success, true);
assert.strictEqual(validRes.safeRenderModel?.id, 'c_123');
assert.strictEqual(validRes.safeRenderModel?.unreadCount, 5);
console.log('  ✅ Safe chat selection and crash prevention verified');

console.log('✨ All Phase 99 Verification Tests Passed 100% Successfully!');
