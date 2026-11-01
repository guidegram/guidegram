import assert from 'node:assert/strict';
import {
  VirtualScrollbarVelocityGovernor,
  SpamRestrictionDialogGovernor,
  ChatDropZoneGovernor,
  TypingLatencyDebounceGovernor,
  TopicAlbumRootGalleryGovernor,
  MediaCaptionEmojiReplacerGovernor,
  MediaEditCaptionPreservationGovernor
} from '../src/services/unigramScrollSpamDropTypingGalleryAndCaptionGovernor.ts';

console.log('🧪 Starting Phase 174 Verification: Unigram Scroll, SpamBot, DropZone, Typing, Gallery & Caption Hardening...');

// -------------------------------------------------------------
// Test 1: VirtualScrollbarVelocityGovernor (Resolves #3300)
// -------------------------------------------------------------
console.log('  Testing #3300: Virtual Scrollbar Dragging & Frame Budget...');
const scrollGov = new VirtualScrollbarVelocityGovernor();

// Drag thumb halfway on a 600px track with 10,000 messages
const scrollRes = scrollGov.calculateVirtualScroll(300, 600, 10000);
assert.equal(scrollRes.thumbPositionFraction, 0.5);
assert.equal(scrollRes.estimatedTargetMessageIndex, 4999);
assert.equal(scrollRes.frameBudgetMs, 16);
assert.equal(scrollRes.isVirtualOffset, true);
console.log('  ✅ #3300 Verified: Virtual scroll calculations maintain smooth 60fps frame budget.');

// -------------------------------------------------------------
// Test 2: SpamRestrictionDialogGovernor (Resolves #3277)
// -------------------------------------------------------------
console.log('  Testing #3277: SpamBot Limitation Modal Interception...');
const spamGov = new SpamRestrictionDialogGovernor();

const floodModal = spamGov.handleRpcError('PEER_FLOOD');
assert.notEqual(floodModal, null);
assert.equal(floodModal.errorCode, 'PEER_FLOOD');
assert.equal(floodModal.appealBotUsername, '@SpamBot');
assert.equal(floodModal.appealDeepLink, 'https://t.me/SpamBot');
assert.equal(floodModal.canSendToContacts, true);
console.log('  ✅ #3277 Verified: PEER_FLOOD limitation dialog with @SpamBot deep link generated.');

// -------------------------------------------------------------
// Test 3: ChatDropZoneGovernor (Resolves #3228)
// -------------------------------------------------------------
console.log('  Testing #3228: Chat DropZone Overlay Modes & File Size Checks...');
const dropGov = new ChatDropZoneGovernor();

// Cursor at y = 150 in an 800px viewport -> Upper half (compressed media)
const upperDrop = dropGov.evaluateDropTarget(150, 800, [
  { name: 'vacation.jpg', size: 1024 * 1024 }
]);
assert.equal(upperDrop.dropMode, 'compressed_media');
assert.equal(upperDrop.isWithinSizeLimit, true);

// Cursor at y = 600 in an 800px viewport -> Lower half (uncompressed document)
const lowerDrop = dropGov.evaluateDropTarget(600, 800, [
  { name: 'database_dump.sql', size: 50 * 1024 * 1024 }
]);
assert.equal(lowerDrop.dropMode, 'uncompressed_document');
assert.equal(lowerDrop.totalSizeBytes, 50 * 1024 * 1024);
console.log('  ✅ #3228 Verified: Drag and drop target zones cleanly partitioned and validated.');

// -------------------------------------------------------------
// Test 4: TypingLatencyDebounceGovernor (Resolves #3166)
// -------------------------------------------------------------
console.log('  Testing #3166: Zero Typing Latency Input with Debounced Heavy Processing...');
const typingGov = new TypingLatencyDebounceGovernor();

const typingState = typingGov.handleKeystroke('Hello @alice check this out');
assert.equal(typingState.immediateText, 'Hello @alice check this out');
assert.equal(typingState.pendingDraftAutosave, true);
assert.equal(typingState.pendingMentionSearch, true);
assert.equal(typingState.debounceTimeoutMs, 150);
assert.equal(typingState.uiFrameBudgetMaintained, true);
console.log('  ✅ #3166 Verified: Keystroke immediately rendered while draft/mention sync debounced.');

// -------------------------------------------------------------
// Test 5: TopicAlbumRootGalleryGovernor (Resolves #2490)
// -------------------------------------------------------------
console.log('  Testing #2490: Forum Topic Shared Media Gallery with Album Root...');
const galleryGov = new TopicAlbumRootGalleryGovernor();

const mockAllMedia = [
  { id: 'm1', threadId: 10, mediaType: 'photo', albumId: 'root_album_42', url: 'u1' },
  { id: 'm2', threadId: 11, mediaType: 'photo', albumId: 'root_album_42', url: 'u2' }, // Second photo in root album
  { id: 'm3', threadId: 10, mediaType: 'video', url: 'u3' },
  { id: 'm4', threadId: 99, mediaType: 'photo', url: 'u4' } // Belongs to different topic
];

const topicMedia = galleryGov.aggregateTopicMedia(10, mockAllMedia, 'root_album_42');
assert.equal(topicMedia.length, 3);
assert.ok(topicMedia.some(m => m.id === 'm1'));
assert.ok(topicMedia.some(m => m.id === 'm2'), 'Photo m2 from root album included in topic gallery');
assert.ok(topicMedia.some(m => m.id === 'm3'));
assert.equal(topicMedia.some(m => m.id === 'm4'), false);
console.log('  ✅ #2490 Verified: Shared media gallery correctly aggregates root album items.');

// -------------------------------------------------------------
// Test 6: MediaCaptionEmojiReplacerGovernor (Resolves #2130)
// -------------------------------------------------------------
console.log('  Testing #2130: Media Caption Emoji Replacement Pipeline...');
const captionGov = new MediaCaptionEmojiReplacerGovernor();

const rawCaption = 'Look at this sunrise :) It is so cool :fire:';
const replaced = captionGov.processCaption(rawCaption, true);
assert.equal(replaced.processedCaption, 'Look at this sunrise 😊 It is so cool 🔥');
assert.equal(replaced.replacedCount, 2);

// When auto-replace is disabled, return raw text unchanged
const disabled = captionGov.processCaption(rawCaption, false);
assert.equal(disabled.processedCaption, rawCaption);
assert.equal(disabled.replacedCount, 0);
console.log('  ✅ #2130 Verified: Media caption emoji replacement adheres to settings.');

// -------------------------------------------------------------
// Test 7: MediaEditCaptionPreservationGovernor (Resolves #1962)
// -------------------------------------------------------------
console.log('  Testing #1962: Message Media Edit Caption Preservation...');
const editGov = new MediaEditCaptionPreservationGovernor();

// User edits a message that originally had text "Comprehensive system breakdown" to attach an infographic
const editPayload = editGov.prepareMediaEdit(
  { id: 'msg_8088', text: 'Comprehensive system breakdown' },
  'doc_file_991'
);

assert.equal(editPayload.messageId, 'msg_8088');
assert.equal(editPayload.preservedCaption, 'Comprehensive system breakdown');
assert.equal(editPayload.captionPreserved, true);
assert.equal(editPayload.newMediaFileId, 'doc_file_991');
console.log('  ✅ #1962 Verified: Original caption automatically preserved when attaching media.');

console.log('\n🎉 ALL 7 UNIGRAM HARDENING TESTS PASSED WITH 100% SUCCESS!');
