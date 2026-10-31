import assert from 'node:assert';
import {
  StartupLifecycleCoordinator,
  TopicDraftSynchronizer,
  DiscussionCommentsFallbackManager,
} from '../src/services/startupAndDraftResilienceService.ts';

async function runTests() {
  console.log('[Phase 8 Verification] Starting tests...');

  // --- Test 1: StartupLifecycleCoordinator Stages & Timeouts ---
  const coordinator = new StartupLifecycleCoordinator();
  const executionLog = [];

  coordinator.register({
    id: 'auth_check',
    stage: 'immediate',
    priority: 1,
    action: () => {
      executionLog.push('auth_check');
    },
  });

  coordinator.register({
    id: 'theme_init',
    stage: 'idle',
    priority: 1,
    action: () => {
      executionLog.push('theme_init');
    },
  });

  coordinator.register({
    id: 'slow_task_timeout',
    stage: 'idle',
    priority: 2,
    timeoutMs: 50,
    action: async () => {
      await new Promise(r => setTimeout(r, 150));
    },
  });

  coordinator.register({
    id: 'background_sync',
    stage: 'background',
    priority: 1,
    action: () => {
      executionLog.push('background_sync');
    },
  });

  const immediateRes = await coordinator.runImmediateStage();
  assert.strictEqual(immediateRes.length, 1);
  assert.strictEqual(immediateRes[0].success, true);
  assert.deepStrictEqual(executionLog, ['auth_check']);

  const idleRes = await coordinator.runIdleStage();
  assert.strictEqual(idleRes.length, 2);
  assert.strictEqual(idleRes[0].success, true);
  assert.strictEqual(idleRes[1].success, false, 'Slow task must fail cleanly via timeout');
  assert.match(idleRes[1].error, /timed out/);

  const bgRes = await coordinator.runBackgroundStage();
  assert.strictEqual(bgRes.length, 1);
  assert.strictEqual(bgRes[0].success, true);
  assert.deepStrictEqual(executionLog, ['auth_check', 'theme_init', 'background_sync']);
  console.log('✓ Test 1: StartupLifecycleCoordinator stage separation & timeout passed');

  // --- Test 2: TopicDraftSynchronizer Monotonic Versioning & Ghost Draft Defense (#26236) ---
  const draftSync = new TopicDraftSynchronizer();
  const peerId = -100123456789;
  const topicId = 42;

  // Set initial draft
  const draft1 = draftSync.setDraft(peerId, 'Draft line 1', topicId);
  assert.strictEqual(draft1.text, 'Draft line 1');
  assert.strictEqual(draftSync.getDraft(peerId, topicId)?.text, 'Draft line 1');

  // User clears draft locally at time T1
  const cleared = draftSync.clearDraft(peerId, topicId);
  assert.strictEqual(cleared.isDeleted, true);
  assert.strictEqual(draftSync.getDraft(peerId, topicId), null);

  // Stale incoming cloud draft from an older device (timestamp < cleared.updatedAt)
  const staleReconcile = draftSync.reconcileCloudDraft({
    peerId,
    topicId,
    text: 'Draft line 1 (resurrected)',
    updatedAt: cleared.updatedAt - 1000,
  });
  assert.strictEqual(staleReconcile.accepted, false, 'Stale cloud draft must be rejected');
  assert.strictEqual(draftSync.getDraft(peerId, topicId), null, 'Draft must NOT reappear');

  // Newer incoming cloud draft (timestamp > cleared.updatedAt)
  const freshReconcile = draftSync.reconcileCloudDraft({
    peerId,
    topicId,
    text: 'New draft from mobile',
    updatedAt: cleared.updatedAt + 2000,
  });
  assert.strictEqual(freshReconcile.accepted, true);
  assert.strictEqual(draftSync.getDraft(peerId, topicId)?.text, 'New draft from mobile');

  // Purge zombies
  const purgedCount = draftSync.purgeZombies(0);
  assert.strictEqual(typeof purgedCount, 'number');
  console.log('✓ Test 2: TopicDraftSynchronizer ghost draft defense (#26236) passed');

  // --- Test 3: DiscussionCommentsFallbackManager (#1481) ---
  const fallbackManager = new DiscussionCommentsFallbackManager();
  const channelId = -100987654321;
  const postId = 101;

  // Initial fetch succeeds
  const mockComments = [
    { id: 1, senderId: 555, text: 'Great update!', date: 1700000000 },
    { id: 2, senderId: 666, text: 'Looking forward to this', date: 1700000010 },
  ];

  const firstResult = await fallbackManager.loadCommentsWithFallback(
    channelId,
    postId,
    async () => mockComments
  );
  assert.strictEqual(firstResult.isFromCache, false);
  assert.strictEqual(firstResult.comments.length, 2);

  // Subsequent fetch fails (simulating network drop / MTProto error #1481)
  const fallbackResult = await fallbackManager.loadCommentsWithFallback(
    channelId,
    postId,
    async () => {
      throw new Error('NETWORK_TIMEOUT_MTPROTO');
    }
  );
  assert.strictEqual(fallbackResult.isFromCache, true, 'Must gracefully fall back to cached comments');
  assert.strictEqual(fallbackResult.comments.length, 2);
  assert.strictEqual(fallbackResult.comments[0].text, 'Great update!');

  // Fetch fails when no cache exists
  await assert.rejects(
    async () => {
      await fallbackManager.loadCommentsWithFallback(
        channelId,
        999, // uncached post
        async () => {
          throw new Error('CHANNEL_COMMENTS_UNAVAILABLE');
        }
      );
    },
    /CHANNEL_COMMENTS_UNAVAILABLE/
  );
  console.log('✓ Test 3: DiscussionCommentsFallbackManager cache fallback (#1481) passed');

  console.log('[Phase 8 Verification] ALL VERIFICATION TESTS PASSED!');
}

runTests().catch(err => {
  console.error('[Phase 8 Verification] FAILED:', err);
  process.exit(1);
});
