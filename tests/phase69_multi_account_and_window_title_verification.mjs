import assert from 'node:assert/strict';
import { MultiAccountAndWindowTitleGovernor } from '../src/services/multiAccountAndWindowTitleGovernor.ts';

console.log('🧪 Starting Phase 69 Multi-Account & Window Title Presence Verification Suite...');

const governor = new MultiAccountAndWindowTitleGovernor();

// Setup accounts
governor.updateAccountData({
  accountId: 'acc_personal',
  name: 'Ershad Personal',
  dialogs: [
    { id: 'chat_alice', unreadCount: 2, unreadMentionsCount: 1, isMuted: false },
    { id: 'chat_bob', unreadCount: 5, unreadMentionsCount: 0, isMuted: true }, // Muted
    { id: 'chat_archived_news', unreadCount: 10, isArchived: true, isMuted: false }, // Archived
    { id: 'chat_spammer', unreadCount: 4, isBlocked: true }, // Blocked peer
  ],
});

governor.updateAccountData({
  accountId: 'acc_work',
  name: 'Ershad Work',
  dialogs: [
    { id: 'chat_boss', unreadCount: 3, unreadMentionsCount: 0, isMuted: false },
  ],
});

// 1. Account Switching with Scroll Position Memory (Ajaxy/telegram-tt #477)
console.log('  Testing seamless account switching and scroll memory...');
governor.setActiveAccount('acc_personal');
governor.saveAccountScrollPosition('acc_personal', 450);

const switchRes = governor.setActiveAccount('acc_work');
assert.equal(switchRes.success, true);
assert.equal(switchRes.accountData?.accountId, 'acc_work');
assert.equal(switchRes.previousScrollY, 0);

const switchBack = governor.setActiveAccount('acc_personal');
assert.equal(switchBack.previousScrollY, 450, 'Must remember previous scroll position on account switch');
console.log('  ✅ Seamless account switching verified');

// 2. Unread Counters, Archived Isolation & Blocked Suppression (Unigram #1243 & AyuGram #506)
console.log('  Testing unread counters with archived & blocked suppression...');
const counts = governor.calculateAccountUnreadCounters('acc_personal');
// Alice (2) unmuted unread + 1 mention.
// Bob is muted -> excluded from unread count.
// Archived news (10) -> excluded by default.
// Spammer (4) -> excluded because blocked!
assert.equal(counts.unreadCount, 2, 'Only unmuted non-archived non-blocked chats must count');
assert.equal(counts.mentionCount, 1, 'Mentions must be aggregated');

// When requested to include archived:
const countsWithArchived = governor.calculateAccountUnreadCounters('acc_personal', { includeArchived: true });
assert.equal(countsWithArchived.unreadCount, 12); // 2 + 10
console.log('  ✅ Unread counters, archived isolation & blocked suppression verified');

// 3. Dynamic Window Title Formatting (Unigram #2436 & tdlib #510)
console.log('  Testing dynamic window title presence formatting...');
// Active personal account with 2 unread and 1 mention
const title1 = governor.formatWindowTitle();
assert.equal(title1.title, '(2) [@1] Ershad Personal');
assert.equal(title1.totalUnreadCount, 2);
assert.equal(title1.totalMentionCount, 1);

// Inside an active chat:
const titleInChat = governor.formatWindowTitle('Alice');
assert.equal(titleInChat.title, '(2) [@1] Alice - Ershad Personal');

// Switch to work account (3 unread, 0 mentions):
governor.setActiveAccount('acc_work');
const titleWork = governor.formatWindowTitle();
assert.equal(titleWork.title, '(3) Ershad Work');
console.log('  ✅ Dynamic window title formatting verified');

// 4. Phantom Unread Badge Clearing (TelegramMessenger/Telegram-iOS #2413)
console.log('  Testing phantom unread badge zeroing...');
governor.markAllAsRead('acc_work');
const zeroCounts = governor.calculateAccountUnreadCounters('acc_work');
assert.equal(zeroCounts.unreadCount, 0);
assert.equal(zeroCounts.mentionCount, 0);

const cleanTitle = governor.formatWindowTitle();
assert.equal(cleanTitle.title, 'Ershad Work', 'Title must have zero numeric badges when all read');
console.log('  ✅ Phantom unread badge zeroing verified');

console.log('✨ All Phase 69 Verification Tests Passed 100% Successfully!');
