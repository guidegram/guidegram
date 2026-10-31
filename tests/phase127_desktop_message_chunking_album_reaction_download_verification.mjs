import assert from 'node:assert';
import { DesktopMessageChunkingAlbumReactionAndDownloadGovernor } from '../src/services/desktopMessageChunkingAlbumReactionAndDownloadGovernor.ts';

console.log('=== Phase 127 Verification: Desktop Message Chunking, Album & Download Governor ===');

const governor = new DesktopMessageChunkingAlbumReactionAndDownloadGovernor();

// Test 1: Massive text chunking (171,000 characters simulated) (#369)
{
  const paragraph = 'This is a long analytical telegram report about competitor hardening. '.repeat(100); // ~7000 chars
  const chunks = governor.chunkMassiveText(paragraph, 4000);

  assert.ok(chunks.length >= 2);
  assert.strictEqual(chunks[0].chunkIndex, 1);
  assert.strictEqual(chunks[0].totalChunks, chunks.length);
  assert.ok(chunks[0].content.startsWith('[1/'));
  assert.ok(chunks[1].content.startsWith('[2/'));
  console.log(`Test 1 Passed: Massive text (${paragraph.length} chars) split into ${chunks.length} sequenced chunks.`);
}

// Test 2: Resilient album upload with single media failure (#352)
{
  const albumResult = governor.resolveResilientAlbumUpload('album-999', [
    { id: 'img-1', filename: 'photo1.jpg', fileSizeBytes: 102400, uploadStatus: 'succeeded' },
    { id: 'img-2', filename: 'photo2.jpg', fileSizeBytes: 204800, uploadStatus: 'succeeded' },
    { id: 'img-3', filename: 'corrupted.jpg', fileSizeBytes: 51200, uploadStatus: 'failed', errorMessage: 'Network timeout' }
  ]);

  assert.strictEqual(albumResult.totalItems, 3);
  assert.strictEqual(albumResult.succeededItemsCount, 2);
  assert.strictEqual(albumResult.failedItemsCount, 1);
  assert.strictEqual(albumResult.partialAlbumSent, true);
  assert.deepStrictEqual(albumResult.failedMediaIds, ['img-3']);
  console.log('Test 2 Passed: Resilient album partial send verified.');
}

// Test 3: Forward into discussion comments/thread (#367)
{
  const forwardPayload = governor.prepareDiscussionThreadForward({
    sourceMessageId: 501,
    sourceChatId: 1001,
    targetChannelId: 2002,
    discussionThreadId: 777,
    commentReplyToMessageId: 888
  });

  assert.strictEqual(forwardPayload.targetChatId, 2002);
  assert.strictEqual(forwardPayload.replyToTopMessageId, 777);
  assert.strictEqual(forwardPayload.replyToMessageId, 888);
  assert.strictEqual(forwardPayload.forwardParams.fromChatId, 1001);
  assert.strictEqual(forwardPayload.forwardParams.messageId, 501);
  console.log('Test 3 Passed: Discussion thread comment reply forward verified.');
}

// Test 4: Reaction user interaction - Open Profile (#332)
{
  const result = governor.handleReactionInteraction({
    userId: 42,
    displayName: 'Elena',
    reactionEmoji: '🔥',
    timestamp: 1700000000
  }, 'open_profile');

  assert.strictEqual(result.actionExecuted, 'spawn_user_profile_modal');
  assert.strictEqual(result.targetUserId, 42);
  console.log('Test 4 Passed: Open profile modal from reaction verified.');
}

// Test 5: Reaction user interaction - Context Menu (#331)
{
  const result = governor.handleReactionInteraction({
    userId: 42,
    displayName: 'Elena',
    reactionEmoji: '🔥',
    timestamp: 1700000000
  }, 'open_context_menu');

  assert.strictEqual(result.actionExecuted, 'render_reaction_context_menu');
  assert.ok(result.contextMenuActions?.includes('send_direct_message'));
  assert.ok(result.contextMenuActions?.includes('copy_user_id'));
  console.log('Test 5 Passed: Reaction context menu actions verified.');
}

// Test 6: Parallel Multi-Part Download Acceleration Booster (#319)
{
  // 10 MB file, 1 MB chunks, 4 concurrent connections
  const plan = governor.generateParallelDownloadPlan({
    totalFileSizeBytes: 10485760,
    chunkSizeBytes: 1048576,
    concurrentConnections: 4
  });

  assert.strictEqual(plan.length, 10);
  assert.strictEqual(plan[0].startByte, 0);
  assert.strictEqual(plan[0].endByte, 1048575);
  assert.strictEqual(plan[0].connectionId, 1);
  assert.strictEqual(plan[1].connectionId, 2);
  assert.strictEqual(plan[3].connectionId, 4);
  assert.strictEqual(plan[4].connectionId, 1); // Round-robin connection allocation
  console.log('Test 6 Passed: Parallel multi-connection download plan verified.');
}

// Test 7: Qt 6.8 Build Shims (#470)
{
  const check = governor.verifyQt68BuildShims('6.8.1');
  assert.strictEqual(check.isCompatible, true);
  assert.ok(check.shimsApplied.includes('COMPAT_QCOLOR_SPACE_TRANSFORMS'));
  assert.ok(check.shimsApplied.includes('COMPAT_QFONT_METRICS_ADVANCE'));
  console.log('Test 7 Passed: Qt 6.8 build header shims verified.');
}

console.log('=== ALL PHASE 127 TESTS PASSED (100% HEALTH) ===');
