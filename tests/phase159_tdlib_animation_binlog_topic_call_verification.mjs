import assert from 'node:assert/strict';
import { TdlibAnimationBinlogTopicAndCallGovernor } from '../src/services/tdlibAnimationBinlogTopicAndCallGovernor.ts';

console.log('🧪 Starting Phase 159: TDLib Animation, Binlog, Topic, and Call Hardening Test Suite...');

const governor = new TdlibAnimationBinlogTopicAndCallGovernor();

// =========================================================================
// Test 1: tdlib/td #3683 - Animation InputFile Validation and Conversion
// =========================================================================
console.log('Testing tdlib/td #3683: Animation InputFile auto-construction and validation...');
{
  // Sub-case A: Missing input file -> Clean error, no crash
  const missingRes = governor.validateAndBuildAnimationPayload({ filePathOrId: '' });
  assert.equal(missingRes.success, false);
  assert.equal(missingRes.error, 'InputFile is not specified');

  // Sub-case B: Local file path string
  const localRes = governor.validateAndBuildAnimationPayload({
    filePathOrId: '/path/to/animation.mp4',
    width: 640,
    height: 480,
    duration: 3
  });
  assert.equal(localRes.success, true);
  assert.equal(localRes.payload.animation._, 'inputFileLocal');
  assert.equal(localRes.payload.animation.path, '/path/to/animation.mp4');
  assert.equal(localRes.payload.width, 640);
  assert.equal(localRes.payload.height, 480);
  assert.equal(localRes.payload.duration, 3);

  // Sub-case C: Remote file ID string
  const remoteRes = governor.validateAndBuildAnimationPayload({ filePathOrId: 'remote_anim_id_999' });
  assert.equal(remoteRes.success, true);
  assert.equal(remoteRes.payload.animation._, 'inputFileRemote');
  assert.equal(remoteRes.payload.animation.id, 'remote_anim_id_999');
  console.log('✅ tdlib/td #3683: Animation InputFile validation verified.');
}

// =========================================================================
// Test 2: tdlib/td #3416 - Binlog Event Stream Validation and Salvage
// =========================================================================
console.log('Testing tdlib/td #3416: Binlog event validation and truncation salvage...');
{
  // Construct a synthetic binlog buffer:
  // Event 1: [0x54, 0x44] (magic), [0x00, 0x01] (id=1), [0x05] (type), [0x00, 0x00, 0x02] (len=2), payload: [0xAA, 0xBB] -> 10 bytes
  // Event 2: [0x54, 0x44] (magic), [0x00, 0x02] (id=2), [0x06] (type), [0x00, 0x00, 0x01] (len=1), payload: [0xCC] -> 9 bytes
  // Corrupted tail: 5 bytes of garbage
  const buffer = new Uint8Array([
    0x54, 0x44, 0x00, 0x01, 0x05, 0x00, 0x00, 0x02, 0xaa, 0xbb,
    0x54, 0x44, 0x00, 0x02, 0x06, 0x00, 0x00, 0x01, 0xcc,
    0xff, 0x00, 0x11, 0x22, 0x33 // 5 corrupted trailing bytes
  ]);

  const salvage = governor.validateAndSalvageBinlog(buffer);
  assert.equal(salvage.validEvents.length, 2);
  assert.equal(salvage.salvagedBytesCount, 19);
  assert.equal(salvage.corruptedBytesTruncated, 5);
  assert.equal(salvage.validEvents[0].eventId, 1);
  assert.equal(salvage.validEvents[1].eventId, 2);
  console.log('✅ tdlib/td #3416: Binlog event stream salvage verified.');
}

// =========================================================================
// Test 3: tdlib/td #3376 - Group Join Event Reconcile & Deduplication
// =========================================================================
console.log('Testing tdlib/td #3376: Unified group join events and duplicate suppression...');
{
  const chatId = '-100445566';
  const userId = 'usr_777';

  // First join update via invite link
  const first = governor.processMemberJoinUpdate(chatId, userId, 'invite_link');
  assert.equal(first.emitted, true);
  assert.equal(first.event.chatId, chatId);
  assert.equal(first.event.joinType, 'invite_link');

  // Secondary duplicate update (e.g. messageChatAddMembers arriving right after)
  const duplicate = governor.processMemberJoinUpdate(chatId, userId, 'added_by_member');
  assert.equal(duplicate.emitted, false);
  console.log('✅ tdlib/td #3376: Group join event deduplication verified.');
}

// =========================================================================
// Test 4: tdlib/td #2712 - Forum Topic Message Routing and Closed Topic Guard
// =========================================================================
console.log('Testing tdlib/td #2712: Forum topic routing and closed topic permissions...');
{
  const chatId = '-100990011';
  governor.registerTopic(chatId, {
    topicId: 1,
    name: 'General',
    iconColor: 0x6fb9f0,
    isClosed: false,
    isHidden: false,
    isGeneral: true
  });
  governor.registerTopic(chatId, {
    topicId: 10,
    name: 'Announcements',
    iconColor: 0xffd67e,
    isClosed: true, // Only admin can post
    isHidden: false,
    isGeneral: false
  });

  // Regular user posts to general -> Allowed
  const postGen = governor.routeTopicMessage(chatId, 1, false);
  assert.equal(postGen.canSend, true);
  assert.equal(postGen.effectiveMessageThreadId, 1);

  // Default to general if targetTopicId omitted
  const postDefault = governor.routeTopicMessage(chatId, undefined, false);
  assert.equal(postDefault.canSend, true);
  assert.equal(postDefault.effectiveMessageThreadId, 1);

  // Non-admin posts to closed Announcements -> Blocked with friendly error
  const postClosedBlocked = governor.routeTopicMessage(chatId, 10, false);
  assert.equal(postClosedBlocked.canSend, false);
  assert.ok(postClosedBlocked.error?.includes('is closed'));

  // Admin posts to closed Announcements -> Allowed
  const postClosedAdmin = governor.routeTopicMessage(chatId, 10, true);
  assert.equal(postClosedAdmin.canSend, true);
  assert.equal(postClosedAdmin.effectiveMessageThreadId, 10);
  console.log('✅ tdlib/td #2712: Forum topic routing verified.');
}

// =========================================================================
// Test 5: tdlib/td #610 - VoIP Call Rating and Problem Reporting
// =========================================================================
console.log('Testing tdlib/td #610: VoIP call rating validation and duplicate check...');
{
  // Valid call rating
  const validRating = governor.submitCallRating({
    callId: 'call_abc_123',
    rating: 4,
    comment: 'Good connection',
    problems: ['echo']
  });
  assert.equal(validRating.success, true);
  assert.equal(validRating.ratingAccepted, true);

  // Duplicate rating attempt on same call ID
  const dupRating = governor.submitCallRating({
    callId: 'call_abc_123',
    rating: 5,
    comment: 'Try again',
    problems: []
  });
  assert.equal(dupRating.success, false);
  assert.ok(dupRating.error?.includes('already been rated'));

  // Invalid star rating (e.g. 0 or 6)
  const invalidStar = governor.submitCallRating({
    callId: 'call_xyz_456',
    rating: 6,
    comment: 'Over limit',
    problems: []
  });
  assert.equal(invalidStar.success, false);
  assert.ok(invalidStar.error?.includes('between 1 and 5 stars'));
  console.log('✅ tdlib/td #610: VoIP call rating verified.');
}

// =========================================================================
// Test 6: tdlib/td #381 - Cross-Instance DC Endpoint Sharing
// =========================================================================
console.log('Testing tdlib/td #381: Shared DC endpoints sorting and fast bootstrap...');
{
  governor.shareVerifiedDcEndpoint({
    dcId: 2,
    ip: '149.154.167.50',
    port: 443,
    protocol: 'obf2',
    lastPingMs: 120,
    verifiedAt: Date.now()
  });
  governor.shareVerifiedDcEndpoint({
    dcId: 2,
    ip: '149.154.167.51',
    port: 443,
    protocol: 'tcp',
    lastPingMs: 35, // Fastest
    verifiedAt: Date.now()
  });
  governor.shareVerifiedDcEndpoint({
    dcId: 4,
    ip: '149.154.167.91',
    port: 443,
    protocol: 'tcp',
    lastPingMs: 50,
    verifiedAt: Date.now()
  });

  const dc2Endpoints = governor.getFastestVerifiedEndpoints(2);
  assert.equal(dc2Endpoints.length, 2);
  assert.equal(dc2Endpoints[0].ip, '149.154.167.51'); // Fastest 35ms sorted first
  assert.equal(dc2Endpoints[0].lastPingMs, 35);
  console.log('✅ tdlib/td #381: Cross-instance DC endpoint sharing verified.');
}

// =========================================================================
// Test 7: tdlib/td #374 - Broadcast Channel vs Supergroup Join Semantics
// =========================================================================
console.log('Testing tdlib/td #374: Channel vs supergroup join bubble semantics...');
{
  // Channel join: service bubble suppressed, count incremented silently
  const channelJoin = governor.evaluateJoinBehavior('channel', 1500);
  assert.equal(channelJoin.shouldCreateServiceMessageBubble, false);
  assert.equal(channelJoin.newSubscriberCount, 1501);
  assert.ok(channelJoin.behaviorNote.includes('bubble suppressed'));

  // Supergroup join: service bubble rendered
  const groupJoin = governor.evaluateJoinBehavior('supergroup', 250);
  assert.equal(groupJoin.shouldCreateServiceMessageBubble, true);
  assert.equal(groupJoin.newSubscriberCount, 251);
  console.log('✅ tdlib/td #374: Channel vs supergroup join semantics verified.');
}

console.log('🎉 Phase 159: All 7 TDLib hardening tests PASSED with 100% precision!');
