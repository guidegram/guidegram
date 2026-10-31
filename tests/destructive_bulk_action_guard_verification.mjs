/**
 * Destructive Bulk Action Guard Verification Suite
 */

import { DestructiveBulkActionGuard } from '../dist-test-destruct/destructiveBulkActionGuard.js';
import assert from 'node:assert';

console.log('--- Starting Destructive Bulk Action Guard Verification ---');

const guard = DestructiveBulkActionGuard.getInstance();

// 1. Policy checks for destructive action types
const policyParticipant = guard.getPolicy('DELETE_PARTICIPANT_HISTORY');
assert.strictEqual(policyParticipant.requiresSeparateDialog, true, 'Participant history delete must require separate dialog');
assert.strictEqual(policyParticipant.severity, 'critical', 'Severity must be critical');
assert.ok(policyParticipant.minGracePeriodMs >= 5000, 'Grace period must be at least 5000ms');

const policyChannel = guard.getPolicy('DELETE_CHANNEL_OR_GROUP');
assert.strictEqual(policyChannel.requiresExplicitNameTyping, true, 'Channel delete must require explicit name confirmation');
console.log('✅ Check 1 Passed: Safety policies properly differentiate critical vs non-critical deletions.');

// 2. Action registration and pre-deletion snapshotting
const mockMessages = [
  { id: 1, text: 'Hello', from: 'Alice' },
  { id: 2, text: 'Important document', from: 'Alice' }
];

const action = guard.registerAction('DELETE_PARTICIPANT_HISTORY', '-1001234567890', {
  targetUserId: '987654',
  targetUserName: 'Alice',
  targetMessageCountEstimate: 2,
  gracePeriodMs: 50, // Shortened for fast testing
  localMessagesToSnapshot: mockMessages
});

assert.ok(action.actionId.startsWith('destruct_'), 'Action ID must be formatted with destruct_ prefix');
const snapshot = guard.getSnapshot(action.actionId);
assert.strictEqual(snapshot?.length, 2, 'Pre-deletion audit snapshot must preserve local messages');
console.log('✅ Check 2 Passed: Pre-deletion snapshot preserves data prior to wire transmission.');

// 3. Grace period emergency abort (Undo workflow)
let wireExecuted = false;
const promiseWithAbort = guard.confirmIntent(action.actionId, async () => {
  wireExecuted = true;
});

// Immediate abort
const abortResult = guard.abortAction(action.actionId);
assert.strictEqual(abortResult, true, 'Abort must succeed during grace period');

const result = await promiseWithAbort;
assert.strictEqual(result.status, 'aborted', 'Result must indicate aborted');
assert.strictEqual(wireExecuted, false, 'Wire execution must NEVER occur if user clicked Undo');
console.log('✅ Check 3 Passed: Emergency Undo stops destructive MTProto RPC execution.');

// 4. Completed execution after grace period
const action2 = guard.registerAction('DELETE_PARTICIPANT_HISTORY', '-1001234567890', {
  targetUserId: '111222',
  targetUserName: 'Bob',
  gracePeriodMs: 40 // Shortened for test
});

let action2Executed = false;
const promiseExecution = guard.confirmIntent(action2.actionId, async () => {
  action2Executed = true;
});

const execResult = await promiseExecution;
assert.strictEqual(execResult.status, 'completed', 'Execution must report completed');
assert.strictEqual(action2Executed, true, 'Wire execution must run when grace period finishes without abort');
console.log('✅ Check 4 Passed: Grace period countdown completes and executes wire action.');

// 5. Aborting non-existent or already completed action returns false
assert.strictEqual(guard.abortAction('non_existent_id'), false, 'Non-existent action returns false');
assert.strictEqual(guard.abortAction(action2.actionId), false, 'Already completed action cannot be aborted');
console.log('✅ Check 5 Passed: State machine invariants prevent aborting completed actions.');

// 6. Reset cleans up all state
guard.reset();
assert.strictEqual(guard.getSnapshot(action.actionId), undefined, 'Reset cleans up local snapshot cache');
console.log('✅ Check 6 Passed: Guard state reset clean.');

console.log('🎉 ALL 6 DESTRUCTIVE BULK ACTION GUARD CHECKS PASSED!');
