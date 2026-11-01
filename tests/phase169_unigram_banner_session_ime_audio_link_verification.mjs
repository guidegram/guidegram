import assert from 'node:assert/strict';
import {
  BannerStackManagerGovernor,
  SessionSwitchVisualGovernor,
  ForumTopicAccessibilityGovernor,
  ImeCompositionGovernor,
  BackgroundAudioPersistenceGovernor,
  AlbumReactionTargetingGovernor,
  RichTextLinkPreservationGovernor
} from '../src/services/unigramBannerSessionImeAudioAndLinkGovernor.ts';

console.log('🧪 Starting Phase 169 Verification: Unigram Banner, Session, IME, Audio & Link Hardening...');

// -------------------------------------------------------------
// Test 1: BannerStackManagerGovernor (Resolves #3269)
// -------------------------------------------------------------
console.log('  Testing #3269: Banner Stack Overlap Prevention & Priority Layout...');
const bannerGov = new BannerStackManagerGovernor();

bannerGov.registerBanner({
  id: 'bday_01',
  type: 'birthday',
  priority: 50,
  title: "Wish Alice a Happy Birthday!",
  actionText: 'Send Gift'
});

bannerGov.registerBanner({
  id: 'session_confirm_01',
  type: 'confirm_session',
  priority: 100, // Higher priority!
  title: 'Did you log in from Firefox on macOS?',
  actionText: 'Yes / No'
});

const layout = bannerGov.computeLayout(1);
assert.equal(layout.visibleBanners.length, 1);
assert.equal(layout.visibleBanners[0].id, 'session_confirm_01', 'High priority security session confirm must take precedence');
assert.equal(layout.collapsedCount, 1);
assert.equal(layout.totalHeightPx, 64);
console.log('  ✅ #3269 Verified: Multiple banners prioritized cleanly without visual overlap.');

// -------------------------------------------------------------
// Test 2: SessionSwitchVisualGovernor (Resolves #3267)
// -------------------------------------------------------------
console.log('  Testing #3267: Multi-Account Session Switch Focus Border Cleanup...');
const sessionGov = new SessionSwitchVisualGovernor();

const switchRes = sessionGov.switchSession('account_1', 'account_2');
assert.equal(switchRes.focusRectangleCleared, true);
assert.equal(switchRes.newSessionId, 'account_2');
assert.equal(switchRes.activeContainerId, 'chat_list_container_session_account_2');
console.log('  ✅ #3267 Verified: Session switch purges focus ring and visual borders.');

// -------------------------------------------------------------
// Test 3: ForumTopicAccessibilityGovernor (Resolves #3266)
// -------------------------------------------------------------
console.log('  Testing #3266: Forum Topic Accessibility Label Synthesis...');
const a11yGov = new ForumTopicAccessibilityGovernor();

const labelInForum = a11yGov.generateAccessibleMessageLabel({
  messageId: 'msg_5001',
  senderName: 'Bob',
  text: 'Release 2.4 is live on TestFlight!',
  topicId: 42,
  topicName: 'iOS Beta',
  isGroupViewAsMessages: true
});

assert.ok(labelInForum.fullAriaLabel.includes('Topic: iOS Beta • Bob: Release 2.4 is live on TestFlight!'));
console.log('  ✅ #3266 Verified: Topic names cleanly synthesized in accessibility announcements.');

// -------------------------------------------------------------
// Test 4: ImeCompositionGovernor (Resolves #3236)
// -------------------------------------------------------------
console.log('  Testing #3236: WeChat/Asian IME Language Switch Crash Prevention...');
const imeGov = new ImeCompositionGovernor();

// Simulate IME start
imeGov.handleCompositionStart();
imeGov.handleCompositionUpdate('nihao');

// Attempt background formatting/mutation during IME composition -> Must be safely rejected!
let didMutate = false;
const allowed = imeGov.safeMutateText(() => {
  didMutate = true;
});

assert.equal(allowed, false, 'Mutating text during composition must be blocked');
assert.equal(didMutate, false);
assert.equal(imeGov.getState().preventedCrashes, 1);

// Finish composition
const committed = imeGov.handleCompositionEnd('你好');
assert.equal(committed, '你好');
assert.equal(imeGov.getState().isComposing, false);

// Now mutation is allowed
const allowedAfter = imeGov.safeMutateText(() => {
  didMutate = true;
});
assert.equal(allowedAfter, true);
assert.equal(didMutate, true);
console.log('  ✅ #3236 Verified: IME composition transactional isolation prevents crashes.');

// -------------------------------------------------------------
// Test 5: BackgroundAudioPersistenceGovernor (Resolves #3217)
// -------------------------------------------------------------
console.log('  Testing #3217: Background Audio Persistence on Window Close...');
const audioGov = new BackgroundAudioPersistenceGovernor();

audioGov.startPlayback('podcast_ep_42', 3600);
const closeResult = audioGov.handleWindowCloseOrMinimize();
assert.equal(closeResult.backgroundContinued, true);
assert.equal(closeResult.trackId, 'podcast_ep_42');
console.log('  ✅ #3217 Verified: Audio playback persists in background when window closes.');

// -------------------------------------------------------------
// Test 6: AlbumReactionTargetingGovernor (Resolves #3204)
// -------------------------------------------------------------
console.log('  Testing #3204: Reactions on Grouped Photos / Media Albums...');
const albumGov = new AlbumReactionTargetingGovernor();

const singlePhotoReaction = albumGov.resolveReactionTarget({
  albumId: 'album_900',
  parentMessageId: 'msg_901',
  selectedPhotoMessageId: 'msg_903',
  emoji: '❤️',
  targetMode: 'individual_item'
});
assert.equal(singlePhotoReaction.resolvedTargetMessageId, 'msg_903');
assert.equal(singlePhotoReaction.isAlbumWide, false);

const albumWideReaction = albumGov.resolveReactionTarget({
  albumId: 'album_900',
  parentMessageId: 'msg_901',
  selectedPhotoMessageId: 'msg_903',
  emoji: '🔥',
  targetMode: 'whole_album'
});
assert.equal(albumWideReaction.resolvedTargetMessageId, 'msg_901');
assert.equal(albumWideReaction.isAlbumWide, true);
console.log('  ✅ #3204 Verified: Album vs photo item reaction targeting resolved.');

// -------------------------------------------------------------
// Test 7: RichTextLinkPreservationGovernor (Resolves #3202)
// -------------------------------------------------------------
console.log('  Testing #3202: Link Query Parameters Preservation in Formatted Text...');
const linkGov = new RichTextLinkPreservationGovernor();

const messageWithFormattedLinks = `
Check this announcement: **https://guidegram.org/post?id=123&category=tech#comments**
And secret link: ||https://guidegram.org/secret?token=ABC123XYZ||
Also visit [our main site](https://guidegram.org/portal?source=desktop).
`;

const extracted = linkGov.extractLinksWithFormatting(messageWithFormattedLinks);
assert.equal(extracted.length, 3);

// Verify bold link preserved query params
const boldLink = extracted.find(l => l.url.includes('category=tech'));
assert.notEqual(boldLink, undefined);
assert.equal(boldLink.hasFormattingWrapper, true);
assert.ok(boldLink.formattingTags.includes('bold'));
assert.equal(boldLink.url, 'https://guidegram.org/post?id=123&category=tech#comments');

// Verify spoiler link
const spoilerLink = extracted.find(l => l.url.includes('token=ABC123XYZ'));
assert.notEqual(spoilerLink, undefined);
assert.ok(spoilerLink.formattingTags.includes('spoiler'));

// Verify markdown link
const mdLink = extracted.find(l => l.displayText === 'our main site');
assert.notEqual(mdLink, undefined);
assert.equal(mdLink.url, 'https://guidegram.org/portal?source=desktop');
console.log('  ✅ #3202 Verified: Links with query strings and fragment preserved with rich formatting.');

console.log('\n🎉 ALL 7 UNIGRAM HARDENING TESTS PASSED WITH 100% SUCCESS!');
