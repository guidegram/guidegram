/**
 * Verification Suite for Phase 201:
 * Unigram Fluent Rounded Header, Accessibility Text Scaling, 60fps Anti-Jank GPU,
 * Lateral Shared Media Sidebar, Forum Communities & Email Login Governor
 * 
 * Verifies fixes for:
 * - Unigram #3382, #3484, #435: Fluent Design chat header rounded corners (iOS/macOS style) & Mica backdrop filter.
 * - Unigram #3294: Accessibility text scale factor integration & dynamic font resizer (12px to 28px).
 * - Unigram #3293: 60fps animation anti-jank governor: GPU layer promotion & filter bypass during active scrolling.
 * - Unigram #3397: Lateral shared media / files / links collapsible split-view sidebar.
 * - Unigram #3474: Supergroup forum communities & topic thread list virtualization.
 * - Unigram #3278: Email verification code authentication & OTP login flow.
 */

import assert from 'node:assert/strict';
import {
  FluentChatHeaderRoundedCornerGovernor,
  AccessibilityTextScaleGovernor,
  AnimationJankGpuLayerGovernor,
  LateralSharedMediaSidebarGovernor,
  ForumCommunityTopicVirtualizationGovernor,
  EmailLoginVerificationGovernor
} from '../src/services/unigramFluentHeaderAccessibilityAndForumGovernor.ts';

console.log('🧪 Starting Phase 201 Verification: Unigram Fluent Header, Accessibility & Forums...');

// -------------------------------------------------------------
// Test 1: #3382, #3484, #435 - Fluent Header Rounded Corners & Mica
// -------------------------------------------------------------
console.log('  Testing #3382, #3484, #435: Fluent Header Rounded Corners & Mica Blur...');
const headerGov = new FluentChatHeaderRoundedCornerGovernor();

const styles = headerGov.getChatHeaderStyles(12, true);
assert.equal(styles.borderRadius, '12px');
assert.ok(styles.backdropFilter.includes('blur(20px)'));
assert.ok(styles.border.includes('rgba(255, 255, 255'));
console.log('  ✅ #3382, #3484, #435 Verified: Fluent chat header rounded corners and Mica blur verified.');

// -------------------------------------------------------------
// Test 2: #3294 - Accessibility Text Scaling
// -------------------------------------------------------------
console.log('  Testing #3294: Accessibility Text Scale Factor (1.0x - 2.25x)...');
const scaleGov = new AccessibilityTextScaleGovernor();

// Standard 14px @ 1.0x scale
const standard = scaleGov.calculateEffectiveFontSize(14, 1.0);
assert.equal(standard.effectivePx, 14);

// Scaled 14px @ 1.5x scale -> 21px
const scaled = scaleGov.calculateEffectiveFontSize(14, 1.5);
assert.equal(scaled.effectivePx, 21);

// Extreme high scale -> bounded at 32px
const maxScale = scaleGov.calculateEffectiveFontSize(18, 3.0);
assert.equal(maxScale.effectivePx, 32);
console.log('  ✅ #3294 Verified: Accessibility text scale factor calculation verified.');

// -------------------------------------------------------------
// Test 3: #3293 - 60fps Anti-Jank GPU Layer Promotion
// -------------------------------------------------------------
console.log('  Testing #3293: 60fps Anti-Jank GPU Layer Promotion...');
const jankGov = new AnimationJankGpuLayerGovernor();

// Active scrolling -> promote GPU layer & disable expensive blur
const scrollingProps = jankGov.getOptimizedLayerProps(true, false);
assert.equal(scrollingProps.willChange, 'transform, scroll-position');
assert.equal(scrollingProps.transform, 'translateZ(0)');
assert.equal(scrollingProps.skipBlurFilters, true);

// Idle state -> restore normal composition
const idleProps = jankGov.getOptimizedLayerProps(false, false);
assert.equal(idleProps.willChange, 'auto');
assert.equal(idleProps.skipBlurFilters, false);
console.log('  ✅ #3293 Verified: 60fps GPU layer promotion and anti-jank throttling verified.');

// -------------------------------------------------------------
// Test 4: #3397 - Lateral Shared Media Split-View Sidebar
// -------------------------------------------------------------
console.log('  Testing #3397: Lateral Shared Media Split-View Sidebar...');
const sidebarGov = new LateralSharedMediaSidebarGovernor();

const openState = sidebarGov.configureSidebar(true, 'files');
assert.equal(openState.isOpen, true);
assert.equal(openState.activeTab, 'files');
assert.equal(openState.sidebarWidthPx, 320);

const closedState = sidebarGov.configureSidebar(false);
assert.equal(closedState.isOpen, false);
assert.equal(closedState.sidebarWidthPx, 0);
console.log('  ✅ #3397 Verified: Collapsible lateral shared media sidebar verified.');

// -------------------------------------------------------------
// Test 5: #3474 - Forum Communities & Topic Virtualization
// -------------------------------------------------------------
console.log('  Testing #3474: Forum Communities & Topic Virtualization...');
const forumGov = new ForumCommunityTopicVirtualizationGovernor();

const allTopics = [
  { id: 1, title: 'General', unreadCount: 5, isClosed: false },
  { id: 2, title: 'Announcements', unreadCount: 2, isClosed: true },
  { id: 3, title: 'Support', unreadCount: 0, isClosed: false }
];

const page1 = forumGov.paginateTopics(allTopics, 0, 2);
assert.equal(page1.items.length, 2);
assert.equal(page1.hasMore, true);
assert.equal(page1.totalUnreadCount, 7);

const page2 = forumGov.paginateTopics(allTopics, 2, 2);
assert.equal(page2.items.length, 1);
assert.equal(page2.hasMore, false);
console.log('  ✅ #3474 Verified: Forum community topic pagination & virtualization verified.');

// -------------------------------------------------------------
// Test 6: #3278 - Email Verification Login Flow
// -------------------------------------------------------------
console.log('  Testing #3278: Email Verification Login & Code Flow...');
const emailGov = new EmailLoginVerificationGovernor();

const now = Date.now();
const sendRes = emailGov.sendVerificationCode('user@guidegram.org', now);
assert.equal(sendRes.sent, true);
assert.ok(sendRes.expiresAt > now);

// Correct code within window
assert.equal(emailGov.verifyCode('user@guidegram.org', '123456', now + 1000), true);

// Expired or invalid code
emailGov.sendVerificationCode('user2@guidegram.org', now);
assert.equal(emailGov.verifyCode('user2@guidegram.org', '999999', now + 1000), false);
assert.equal(emailGov.verifyCode('user2@guidegram.org', '123456', now + 6 * 60 * 1000), false); // 6 mins > 5 mins
console.log('  ✅ #3278 Verified: Email verification login and code validation verified.');

console.log('\n🎉 ALL 6 PHASE 201 UNIGRAM VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');
