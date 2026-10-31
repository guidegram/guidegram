import assert from 'node:assert/strict';
import { WebQuotesArchiveWindowAccessibilityAndForwardGovernor } from '../src/services/webQuotesArchiveWindowAccessibilityAndForwardGovernor.ts';

console.log('🧪 Starting Phase 143: Quotes, Archived Subgroups, Window Lifecycle, Accessibility & Forward Verification...\n');

const governor = new WebQuotesArchiveWindowAccessibilityAndForwardGovernor('darwin');

// ============================================================================
// 1. Ajaxy/telegram-tt#370 - Add quote formatting (Blockquotes, nested & expandable)
// ============================================================================
console.log('👉 Testing Case 1: Quote Formatting (Ajaxy/telegram-tt#370)...');
const markdownText = `Hello world\n> This is a standard quote\n> Second line of quote\nRegular text here\n>! This is an expandable quote`;
const parsed = governor.parseQuoteFormatting(markdownText);

assert.equal(parsed.quotes.length, 2);
assert.equal(parsed.quotes[0].isExpandable, false);
assert.equal(parsed.quotes[0].text, 'This is a standard quote\nSecond line of quote');
assert.equal(parsed.quotes[1].isExpandable, true);
assert.equal(parsed.quotes[1].text, 'This is an expandable quote');
console.log('✅ Case 1 passed: Standard and expandable blockquotes parsed correctly.\n');

// ============================================================================
// 2. Ajaxy/telegram-tt#357 - Archived groups with subgroups broken
// ============================================================================
console.log('👉 Testing Case 2: Archived Groups with Subgroups (Ajaxy/telegram-tt#357)...');
const sampleArchivedGroups = [
  {
    groupId: 1001,
    title: 'Developer Supergroup',
    isForum: true,
    directUnreadCount: 0,
    topics: [
      { topicId: 1, title: 'General', unreadCount: 3 },
      { topicId: 2, title: 'Bugs', unreadCount: 5 },
      { topicId: 3, title: 'Releases', unreadCount: 0 },
    ],
  },
  {
    groupId: 1002,
    title: 'Family Chat',
    isForum: false,
    directUnreadCount: 2,
    topics: [],
  },
];

const aggregation = governor.computeArchivedUnreadAggregation(sampleArchivedGroups);
assert.equal(aggregation.totalArchivedUnreadCount, 10); // 3 + 5 + 2 = 10
assert.equal(aggregation.groupSummaries[0].groupId, 1001);
assert.equal(aggregation.groupSummaries[0].totalUnread, 8);
assert.equal(aggregation.groupSummaries[0].topicCount, 3);
assert.equal(aggregation.groupSummaries[1].totalUnread, 2);
console.log('✅ Case 2 passed: Archived forum topics and subgroups maintain aggregation.\n');

// ============================================================================
// 3. Ajaxy/telegram-tt#330 - Electron MacOS Cmd+W Black Screen Prevention
// ============================================================================
console.log('👉 Testing Case 3: MacOS Cmd+W Window Close Prevention (Ajaxy/telegram-tt#330)...');
const closeResult = governor.handleWindowCloseShortcut();
assert.equal(closeResult.action, 'hide');
assert.equal(closeResult.preventDefault, true);

const winStateHidden = governor.getWindowState();
assert.equal(winStateHidden.isVisible, false);
assert.equal(winStateHidden.isRepaintRequired, true);

// Re-activating window triggers repaint surface recovery
const reactivateResult = governor.handleWindowReactivate();
assert.equal(reactivateResult.repainted, true);
assert.equal(reactivateResult.isVisible, true);
assert.equal(governor.getWindowState().isRepaintRequired, false);
console.log('✅ Case 3 passed: Cmd+W window hide and repaint recovery verified.\n');

// ============================================================================
// 4. Ajaxy/telegram-tt#323 - Improve Accessibility Live Region Announcements
// ============================================================================
console.log('👉 Testing Case 4: Accessibility ARIA Announcements (Ajaxy/telegram-tt#323)...');
const now = 1000000;
const firstAnnouncement = governor.queueIncomingMessageAnnouncement('Engineering', 'Alice', 'Meeting in 5 mins', now);
assert.ok(firstAnnouncement);
assert.equal(firstAnnouncement.message, 'Alice in Engineering: Meeting in 5 mins');

// Rapid consecutive message (100ms later) should throttle to avoid screen-reader speech collision
const burstAnnouncement = governor.queueIncomingMessageAnnouncement('Engineering', 'Bob', 'Got it!', now + 100);
assert.ok(burstAnnouncement);
assert.equal(burstAnnouncement.message, 'New messages in Engineering');
console.log('✅ Case 4 passed: ARIA live regions handle rapid chat bursts gracefully.\n');

// ============================================================================
// 5. Ajaxy/telegram-tt#216 - Forwarding multiple messages order preservation
// ============================================================================
console.log('👉 Testing Case 5: Forward Batch Monotonic Ordering (Ajaxy/telegram-tt#216)...');
const unorderedSelectedMessages = [
  { id: 504, date: 1700000200, text: 'Third message', senderId: 10 },
  { id: 501, date: 1700000050, text: 'First message', senderId: 10 },
  { id: 503, date: 1700000100, text: 'Second message', senderId: 20 },
];

const sequenced = governor.sequenceForwardBatch(unorderedSelectedMessages);
assert.equal(sequenced[0].id, 501);
assert.equal(sequenced[1].id, 503);
assert.equal(sequenced[2].id, 504);
console.log('✅ Case 5 passed: Forwarded messages preserve chronological sequence.\n');

// ============================================================================
// 6. Ajaxy/telegram-tt#408 - Run not on localhost
// ============================================================================
console.log('👉 Testing Case 6: Remote Host Binding & Secure Context (Ajaxy/telegram-tt#408)...');
const localhostConfig = { host: '127.0.0.1', port: 8080, protocol: 'http' };
const localBinding = governor.validateHostBinding(localhostConfig);
assert.equal(localBinding.isLocalhost, true);
assert.equal(localBinding.requiresHttpsForCrypto, false);

const lanConfig = { host: '192.168.1.100', port: 8080, protocol: 'http' };
const lanBinding = governor.validateHostBinding(lanConfig);
assert.equal(lanBinding.isLocalhost, false);
assert.equal(lanBinding.requiresHttpsForCrypto, true);
assert.equal(lanBinding.listenUrl, 'http://192.168.1.100:8080');
console.log('✅ Case 6 passed: Remote LAN binding and HTTPS warning active.\n');

// ============================================================================
// 7. Ajaxy/telegram-tt#97 - Leave owned chat without deleting for members
// ============================================================================
console.log('👉 Testing Case 7: Owned Chat Departure Safeguards (Ajaxy/telegram-tt#97)...');
// Case A: Normal member can leave directly
const memberChat = {
  id: 7001,
  title: 'Public Community',
  isOwner: false,
  memberCount: 500,
  admins: [],
};
const memberEval = governor.evaluateChatDeparture(memberChat);
assert.equal(memberEval.canLeaveDirectly, true);
assert.equal(memberEval.actionRequired, 'none');

// Case B: Owner in populated group requires ownership transfer first
const ownedPopulatedChat = {
  id: 7002,
  title: 'My Startup Team',
  isOwner: true,
  memberCount: 42,
  admins: [
    { id: 2, canBeOwner: true, name: 'Lead Dev' },
    { id: 3, canBeOwner: false, name: 'Moderator Bot' },
  ],
};
const ownerEval = governor.evaluateChatDeparture(ownedPopulatedChat);
assert.equal(ownerEval.canLeaveDirectly, false);
assert.equal(ownerEval.actionRequired, 'transfer_ownership');
assert.equal(ownerEval.eligibleSuccessorAdmins.length, 1);
assert.equal(ownerEval.eligibleSuccessorAdmins[0].name, 'Lead Dev');

// Case C: Owner alone in chat can confirm delete
const soloChat = {
  id: 7003,
  title: 'Solo Channel',
  isOwner: true,
  memberCount: 1,
  admins: [],
};
const soloEval = governor.evaluateChatDeparture(soloChat);
assert.equal(soloEval.canLeaveDirectly, false);
assert.equal(soloEval.actionRequired, 'confirm_delete');
console.log('✅ Case 7 passed: Chat departure guards protect multi-member groups.\n');

console.log('🎉 ALL 7 PHASE 143 HARDENING TESTS PASSED WITH 100% SUCCESS!');
