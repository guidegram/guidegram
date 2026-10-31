/**
 * Active Topic Lifecycle Guard Verification Suite
 */

import { ActiveTopicLifecycleGuard } from '../dist-test-topic/activeTopicLifecycleGuard.js';
import assert from 'node:assert';

console.log('--- Starting Active Topic Lifecycle Guard Verification ---');

const guard = ActiveTopicLifecycleGuard.getInstance();

const peerId = 'user_123456789';
const topic1 = { id: 101, peerId, title: 'Support Thread 1' };
const topic2 = { id: 102, peerId, title: 'Feature Requests' };

// 1. Register topics and set active topic
guard.registerTopic(peerId, topic1);
guard.registerTopic(peerId, topic2);

guard.setActiveTopic(peerId, 101);
assert.strictEqual(guard.getActiveTopic(peerId), 101, 'Active topic must be 101');
console.log('✅ Check 1 Passed: Topics registered and active topic set.');

// 2. Deleting an INACTIVE topic does NOT trigger eviction
const inactiveDeletion = guard.handleRemoteTopicDeletion(peerId, 102);
assert.strictEqual(inactiveDeletion.evicted, false, 'Deleting inactive topic 102 should not trigger eviction');
assert.strictEqual(inactiveDeletion.topicDeletedFromRegistry, true, 'Topic 102 must be purged from registry');
assert.strictEqual(guard.getActiveTopic(peerId), 101, 'Active topic 101 must remain active');
console.log('✅ Check 2 Passed: Deleting background topic preserves active topic without eviction.');

// 3. Deleting the ACTIVE topic triggers graceful eviction BEFORE deallocation
let callbackFired = false;
let capturedEviction = null;

const activeDeletion = guard.handleRemoteTopicDeletion(peerId, 101, (res) => {
  callbackFired = true;
  capturedEviction = res;
});

assert.strictEqual(activeDeletion.evicted, true, 'Must report evicted: true');
assert.strictEqual(callbackFired, true, 'Eviction callback must fire');
assert.strictEqual(capturedEviction?.fallbackView, 'chat_root', 'Must fall back to chat_root');
assert.strictEqual(capturedEviction?.previousTopicId, 101, 'Previous topic must be 101');
assert.strictEqual(guard.getActiveTopic(peerId), null, 'Active topic state must be reset to null (root)');
console.log('✅ Check 3 Passed: Deleting active topic triggers graceful eviction and fallback transition.');

// 4. Deleting already non-existent topic returns cleanly without error
const phantomDeletion = guard.handleRemoteTopicDeletion(peerId, 999);
assert.strictEqual(phantomDeletion.evicted, false);
assert.strictEqual(phantomDeletion.topicDeletedFromRegistry, false);
console.log('✅ Check 4 Passed: Idempotent handling for non-existent topic IDs.');

// 5. Reset cleans up internal state
guard.reset();
assert.strictEqual(guard.getActiveTopic(peerId), null, 'Reset clears active topics');
console.log('✅ Check 5 Passed: State reset cleanly.');

console.log('🎉 ALL 5 ACTIVE TOPIC LIFECYCLE GUARD CHECKS PASSED!');
