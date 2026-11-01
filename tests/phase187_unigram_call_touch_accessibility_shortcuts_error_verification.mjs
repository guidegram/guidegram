/**
 * Verification Suite for Phase 187:
 * Unigram Video Call Touch Targets, Message Screen Reader Accessibility,
 * Multi-Account Hotkey Switcher & Send Message Error Feedback Hardening
 * 
 * Verifies fixes for:
 * - UnigramDev/Unigram #2455: Group video call touch target size & gesture handling
 * - UnigramDev/Unigram #2450: Message prefix accessibility (Reply, Forward, Pinned)
 * - UnigramDev/Unigram #2332: Media, audio duration & file type screen reader announcements
 * - UnigramDev/Unigram #2220: Inline keyboard button count & label announcements
 * - UnigramDev/Unigram #2113: Chat selection toolbar unlabeled button automation properties
 * - UnigramDev/Unigram #2565: Multi-account hotkey switcher (Ctrl+1..9)
 * - UnigramDev/Unigram #2915: Send message error dialog & actionable feedback
 */

import assert from 'node:assert/strict';
import {
  VideoCallTouchTargetGovernor,
  MessageAccessibilityAnnouncerGovernor,
  ChatListSelectionToolbarGovernor,
  MultiAccountKeyboardShortcutGovernor,
  SendMessageErrorFeedbackGovernor
} from '../src/services/unigramCallTouchAccessibilityShortcutsAndErrorGovernor.ts';

console.log('🧪 Starting Phase 187 Verification: Unigram Call Touch, Accessibility & Multi-Account...');

// -------------------------------------------------------------
// Test 1: #2455 - Video Call Touch Target Size & Hit Testing
// -------------------------------------------------------------
console.log('  Testing #2455: Video Call Touch Target Size & Padding...');
const touchGov = new VideoCallTouchTargetGovernor();

// A small 32x32px desktop button must have its effective touch hit area padded to >= 48x48px
const micButton = touchGov.evaluateTouchTarget('btn_mic', 'Mute Microphone', 32, 32);
assert.equal(micButton.effectiveHitArea.width, 48, 'Touch width must be padded to minimum 48px');
assert.equal(micButton.effectiveHitArea.height, 48, 'Touch height must be padded to minimum 48px');

// Hit test at 20px offset (outside 32px raw button, but inside 48px padded touch area)
assert.equal(touchGov.handleTouchHitTest(micButton, 20, 20), true);
// Hit test at 30px offset (outside 48px touch area)
assert.equal(touchGov.handleTouchHitTest(micButton, 30, 30), false);
console.log('  ✅ #2455 Verified: Touch targets padded to 48x48px preventing missed taps in video calls.');

// -------------------------------------------------------------
// Test 2: #2450 - Message Prefix Screen Reader Accessibility
// -------------------------------------------------------------
console.log('  Testing #2450: Message Prefix Accessibility (Reply, Forward, Pinned)...');
const a11yGov = new MessageAccessibilityAnnouncerGovernor();

const replyMsg = a11yGov.generateFullAnnouncement({
  senderName: 'Dr. Ershad',
  text: 'System online',
  prefix: { type: 'reply', source: 'Alice' }
});
assert.ok(replyMsg.includes('In reply to Alice'));
assert.ok(replyMsg.includes('From Dr. Ershad'));
assert.ok(replyMsg.includes('System online'));

const fwdMsg = a11yGov.generateFullAnnouncement({
  senderName: 'Bob',
  prefix: { type: 'forward', source: 'Guidegram Updates' }
});
assert.ok(fwdMsg.includes('Forwarded from Guidegram Updates'));
console.log('  ✅ #2450 Verified: Message prefixes announced to screen readers clearly.');

// -------------------------------------------------------------
// Test 3: #2332 - Media, Audio Duration & File Type Announcement
// -------------------------------------------------------------
console.log('  Testing #2332: Audio Duration & File Type Screen Reader Announcement...');
const audioAnnouncement = a11yGov.generateFullAnnouncement({
  senderName: 'Sarah',
  media: {
    type: 'audio',
    fileName: 'podcast.mp3',
    durationSec: 215, // 3 mins 35 secs
    sizeBytes: 5242880, // 5.0 MB
    mimeType: 'audio/mpeg'
  }
});

assert.ok(audioAnnouncement.includes('AUDIO file'));
assert.ok(audioAnnouncement.includes('duration 3 minutes 35 seconds'));
assert.ok(audioAnnouncement.includes('size 5.0 MB'));
assert.ok(audioAnnouncement.includes('type audio/mpeg'));
console.log('  ✅ #2332 Verified: Media duration, file size, and MIME types announced to assistive tech.');

// -------------------------------------------------------------
// Test 4: #2220 - Inline Keyboard Button Count Announcement
// -------------------------------------------------------------
console.log('  Testing #2220: Inline Keyboard Button Count Announcement...');
const buttonMsg = a11yGov.generateFullAnnouncement({
  senderName: 'VoteBot',
  text: 'Please cast your vote',
  inlineButtons: ['Approve', 'Reject', 'Abstain']
});

assert.ok(buttonMsg.includes('Has 3 interactive buttons: [Approve], [Reject], [Abstain]'));
console.log('  ✅ #2220 Verified: Screen readers announce inline button counts and labels.');

// -------------------------------------------------------------
// Test 5: #2113 - Chat Selection Toolbar Accessible Labels
// -------------------------------------------------------------
console.log('  Testing #2113: Chat Selection Toolbar Automation Properties...');
const toolbarGov = new ChatListSelectionToolbarGovernor();
const buttons = toolbarGov.getSelectionToolbarButtons();

const clearBtn = buttons.find(b => b.id === 'btn_clear');
assert.ok(clearBtn, 'Clear selection button must exist');
assert.equal(clearBtn?.automationId, 'ChatList_ClearSelectionButton');
assert.equal(clearBtn?.accessibleName, 'Clear selection');
assert.ok(clearBtn?.tooltipText.includes('(Esc)'));
console.log('  ✅ #2113 Verified: Selection toolbar buttons equipped with accessible names and automation IDs.');

// -------------------------------------------------------------
// Test 6: #2565 - Multi-Account Hotkey Switcher (Ctrl+1..9)
// -------------------------------------------------------------
console.log('  Testing #2565: Multi-Account Hotkey Switcher...');
const accountGov = new MultiAccountKeyboardShortcutGovernor();

accountGov.registerAccount({ accountId: 101, phoneNumber: '+989123456789', displayName: 'Work', unreadCount: 3 });
accountGov.registerAccount({ accountId: 102, phoneNumber: '+12025550199', displayName: 'Personal', unreadCount: 0 });

assert.equal(accountGov.getActiveAccount()?.displayName, 'Work');

// Switch to Personal using Ctrl+2
const switchResult = accountGov.handleShortcut('2', true);
assert.equal(switchResult.switched, true);
assert.equal(switchResult.activeAccount?.displayName, 'Personal');
assert.equal(accountGov.getActiveAccount()?.accountId, 102);

// Normal key press without Ctrl should NOT switch
const noCtrl = accountGov.handleShortcut('1', false);
assert.equal(noCtrl.switched, false);
console.log('  ✅ #2565 Verified: Ctrl+1..9 shortcuts switch active account sessions instantaneously.');

// -------------------------------------------------------------
// Test 7: #2915 - Send Message Error Dialog & Feedback
// -------------------------------------------------------------
console.log('  Testing #2915: Send Message Error Dialog Feedback...');
const errorGov = new SendMessageErrorFeedbackGovernor();

// Flood wait error
const floodFeedback = errorGov.parseSendError('FLOOD_WAIT_45');
assert.equal(floodFeedback.showDialog, true);
assert.equal(floodFeedback.dialogTitle, 'Too Many Requests');
assert.equal(floodFeedback.retryCountdownSec, 45);
assert.equal(floodFeedback.actionRequired, 'wait');

// User banned / restricted
const banFeedback = errorGov.parseSendError('USER_BANNED_IN_CHANNEL');
assert.equal(banFeedback.showDialog, true);
assert.equal(banFeedback.dialogTitle, 'Action Not Allowed');
assert.equal(banFeedback.actionRequired, 'contact_admin');
console.log('  ✅ #2915 Verified: Send errors produce actionable dialogs and countdowns instead of silent drops.');

console.log('\n🎉 ALL 7 UNIGRAM HARDENING TESTS PASSED WITH 100% SUCCESS!');
