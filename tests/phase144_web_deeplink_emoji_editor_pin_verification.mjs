import assert from 'node:assert/strict';
import { WebMessageDeepLinkEmojiEditorAndPinGovernor } from '../src/services/webMessageDeepLinkEmojiEditorAndPinGovernor.ts';

console.log('🧪 Starting Phase 144: Deep Linking, Emoji Popover, Topic Focus, Editor Mode, Pin Matrix, Time & Username Tests...\n');

const governor = new WebMessageDeepLinkEmojiEditorAndPinGovernor();

// ============================================================================
// 1. Ajaxy/telegram-tt#88 - Message deep linking & scroll anchor
// ============================================================================
console.log('👉 Testing Case 1: Deep Linking & Scroll Anchor (Ajaxy/telegram-tt#88)...');
const privateDeepLink = governor.parseMessageDeepLink('https://t.me/c/123456789/42');
assert.equal(privateDeepLink.valid, true);
assert.equal(privateDeepLink.chatId, '-100123456789');
assert.equal(privateDeepLink.messageId, 42);
assert.equal(privateDeepLink.isPrivateChat, true);

const publicDeepLink = governor.parseMessageDeepLink('https://t.me/tech_news/108');
assert.equal(publicDeepLink.valid, true);
assert.equal(publicDeepLink.chatId, 'tech_news');
assert.equal(publicDeepLink.messageId, 108);

// Scroll target calculation
const renderedIds = [10, 20, 30, 42, 50];
const targetResult = governor.calculateScrollTarget(42, renderedIds, 50);
assert.equal(targetResult.inMemory, true);
assert.equal(targetResult.scrollOffset, 150); // index 3 * 50 = 150
assert.equal(targetResult.needsHistoricalFetch, false);

const missingResult = governor.calculateScrollTarget(999, renderedIds, 50);
assert.equal(missingResult.inMemory, false);
assert.equal(missingResult.needsHistoricalFetch, true);
console.log('✅ Case 1 passed: Message deep links and scroll targeting verified.\n');

// ============================================================================
// 2. Ajaxy/telegram-tt#80 - Emoji menu boundary clamping & dismiss
// ============================================================================
console.log('👉 Testing Case 2: Emoji Popover Boundaries (Ajaxy/telegram-tt#80)...');
const buttonRect = { top: 600, bottom: 640, left: 200, right: 240, width: 40, height: 40 };
const popoverDims = { width: 320, height: 400 };
const viewport = { width: 1024, height: 768 };

const pos = governor.calculateEmojiPopoverPosition(buttonRect, popoverDims, viewport);
assert.equal(pos.placement, 'top');
assert.ok(pos.y >= 8);
assert.ok(pos.x >= 8);

// Outside click detection
const popoverRect = { top: pos.y, bottom: pos.y + 400, left: pos.x, right: pos.x + 320, width: 320, height: 400 };
const outsideClick = governor.shouldDismissEmojiMenu({ x: 50, y: 50 }, popoverRect, buttonRect);
assert.equal(outsideClick, true);

const insideClick = governor.shouldDismissEmojiMenu({ x: pos.x + 50, y: pos.y + 50 }, popoverRect, buttonRect);
assert.equal(insideClick, false);
console.log('✅ Case 2 passed: Emoji popover stays clamped within viewport with outside-click dismiss.\n');

// ============================================================================
// 3. Ajaxy/telegram-tt#531 - Topic focus mode & other chats dimming
// ============================================================================
console.log('👉 Testing Case 3: Topic Focus Mode Dimming (Ajaxy/telegram-tt#531)...');
const allChats = ['chat_1', 'chat_2', 'chat_3'];
// Normal mode (no active topic): all chats 100% opacity
const normalVisuals = governor.getChatListVisualState(allChats, 'chat_1', null, false);
assert.equal(normalVisuals[0].opacity, 1.0);
assert.equal(normalVisuals[1].opacity, 1.0);

// Topic mode active in chat_1 topic 5: other chats dimmed
const topicVisuals = governor.getChatListVisualState(allChats, 'chat_1', 5, true);
assert.equal(topicVisuals[0].isFocused, true);
assert.equal(topicVisuals[0].opacity, 1.0);
assert.equal(topicVisuals[1].isFocused, false);
assert.equal(topicVisuals[1].opacity, 0.42);
assert.equal(topicVisuals[2].opacity, 0.42);
console.log('✅ Case 3 passed: Background chats dim smoothly during forum topic discussions.\n');

// ============================================================================
// 4. Ajaxy/telegram-tt#526 - Raw markdown editor mode vs WYSIWYG
// ============================================================================
console.log('👉 Testing Case 4: Raw Markdown Editor Opt-out (Ajaxy/telegram-tt#526)...');
const pastedHtml = '<b>Important</b> and <code>console.log()</code>';
const plainText = 'Important and console.log()';

const rawResolved = governor.resolvePastedContent(pastedHtml, plainText, 'raw_markdown');
assert.equal(rawResolved, plainText); // Preserves pristine plaintext in raw markdown mode

const wysiwygResolved = governor.resolvePastedContent(pastedHtml, plainText, 'wysiwyg');
assert.equal(wysiwygResolved, '**Important** and `console.log()`');
console.log('✅ Case 4 passed: Raw markdown opt-out respects plaintext and prevents HTML corruption.\n');

// ============================================================================
// 5. Ajaxy/telegram-tt#524 - Pin message permission matrix
// ============================================================================
console.log('👉 Testing Case 5: Pin Message Permission Matrix (Ajaxy/telegram-tt#524)...');
// Member in supergroup cannot pin
const memberSupergroup = governor.evaluatePinPermission('member', 'supergroup');
assert.equal(memberSupergroup.canPin, false);

// Admin in supergroup with canPinMessages=true can pin
const adminSupergroup = governor.evaluatePinPermission('admin', 'supergroup', { canPinMessages: true });
assert.equal(adminSupergroup.canPin, true);
assert.equal(adminSupergroup.silentNotificationSupported, true);

// Owner always allowed
const ownerChannel = governor.evaluatePinPermission('owner', 'channel');
assert.equal(ownerChannel.canPin, true);

// Direct message always allowed
const directPin = governor.evaluatePinPermission('member', 'direct');
assert.equal(directPin.canPin, true);
console.log('✅ Case 5 passed: Pin message matrix enforces permissions across chat types.\n');

// ============================================================================
// 6. Ajaxy/telegram-tt#506 - 12-hour and 24-hour time preference
// ============================================================================
console.log('👉 Testing Case 6: Time Format Preference & Formatting (Ajaxy/telegram-tt#506)...');
const testDate = new Date(2026, 10, 1, 14, 5); // 14:05

const format12 = governor.formatTime(testDate, '12h');
assert.equal(format12, '2:05 PM');

const format24 = governor.formatTime(testDate, '24h');
assert.equal(format24, '14:05');

const forced12 = governor.resolveTimeFormat('12h');
assert.equal(forced12, '12h');
console.log('✅ Case 6 passed: 12-hour and 24-hour time preferences correctly formatted.\n');

// ============================================================================
// 7. Ajaxy/telegram-tt#503 - Username clearance & format validation
// ============================================================================
console.log('👉 Testing Case 7: Username Clearance & Validation (Ajaxy/telegram-tt#503)...');
// Clearing username with empty string or null
const clearEmpty = governor.validateAndCleanUsername('');
assert.equal(clearEmpty.isValid, true);
assert.equal(clearEmpty.action, 'clear');
assert.equal(clearEmpty.sanitizedUsername, null);

const clearNull = governor.validateAndCleanUsername(null);
assert.equal(clearNull.isValid, true);
assert.equal(clearNull.action, 'clear');

// Valid username
const validSet = governor.validateAndCleanUsername('@guidegram_pro');
assert.equal(validSet.isValid, true);
assert.equal(validSet.action, 'set');
assert.equal(validSet.sanitizedUsername, 'guidegram_pro');

// Invalid username (too short)
const invalidShort = governor.validateAndCleanUsername('abc');
assert.equal(invalidShort.isValid, false);
assert.equal(invalidShort.action, 'invalid');

// Invalid username (consecutive underscores)
const invalidUnderscores = governor.validateAndCleanUsername('user__name');
assert.equal(invalidUnderscores.isValid, false);
console.log('✅ Case 7 passed: Username clearing and validation rules behave reliably.\n');

console.log('🎉 ALL 7 PHASE 144 HARDENING TESTS PASSED WITH 100% SUCCESS!');
