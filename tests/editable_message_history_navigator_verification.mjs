/**
 * Editable Message History Navigator Verification Suite (Shift + Up/Down)
 */

import { EditableMessageHistoryNavigator } from '../src/utils/telegramMessageEditor.ts';
import assert from 'node:assert';

console.log('--- Starting Editable Message History Navigator Verification ---');

const now = 1700000000;
const messages = [
  // Old message (> 48h): date is now - 200,000s -> Not editable
  { id: 101, date: now - 200000, text: 'Very old message', isOutgoing: true },
  // Incoming message -> Not editable
  { id: 102, date: now - 1000, text: 'Hello from friend', isOutgoing: false },
  // Editable message 1 (older)
  { id: 103, date: now - 500, text: 'First editable sentence', isOutgoing: true },
  // Editable message 2 (newer)
  { id: 104, date: now - 100, text: 'Second editable sentence', isOutgoing: true },
  // Editable message 3 (latest)
  { id: 105, date: now - 10, text: 'Third (latest) editable sentence', isOutgoing: true },
];

const navigator = new EditableMessageHistoryNavigator({ currentTimeSec: now });
navigator.loadMessages(messages, 'My current composer draft');

// 1. Check candidate filtering (only id 105, 104, 103 should be editable)
assert.strictEqual(navigator.getCandidateCount(), 3, 'Must filter down to 3 editable outgoing messages within 48h');
console.log('✅ Check 1 Passed: Filtered strictly to eligible editable messages.');

// 2. Initial state must be draft
const state0 = navigator.getState();
assert.strictEqual(state0.isEditing, false);
assert.strictEqual(state0.textToDisplay, 'My current composer draft');
assert.strictEqual(state0.isInitialDraft, true);
console.log('✅ Check 2 Passed: Initial state correctly reflects composer draft.');

// 3. First Shift+Up navigates to latest editable message (id 105)
const state1 = navigator.navigateOlder();
assert.strictEqual(state1.isEditing, true);
assert.strictEqual(state1.currentIndex, 0);
assert.strictEqual(state1.currentMessage?.id, 105);
assert.strictEqual(state1.textToDisplay, 'Third (latest) editable sentence');
console.log('✅ Check 3 Passed: First Shift+Up navigates to latest editable message.');

// 4. Second Shift+Up navigates to older message (id 104)
const state2 = navigator.navigateOlder();
assert.strictEqual(state2.currentIndex, 1);
assert.strictEqual(state2.currentMessage?.id, 104);
assert.strictEqual(state2.textToDisplay, 'Second editable sentence');
console.log('✅ Check 4 Passed: Second Shift+Up traverses deeper into history (id 104).');

// 5. Third Shift+Up navigates to oldest editable message (id 103)
const state3 = navigator.navigateOlder();
assert.strictEqual(state3.currentIndex, 2);
assert.strictEqual(state3.currentMessage?.id, 103);
assert.strictEqual(state3.textToDisplay, 'First editable sentence');

// Fourth Shift+Up stays at the oldest message boundary (clamped)
const stateBoundary = navigator.navigateOlder();
assert.strictEqual(stateBoundary.currentIndex, 2);
assert.strictEqual(stateBoundary.currentMessage?.id, 103);
console.log('✅ Check 5 Passed: History traversal clamps at oldest editable message.');

// 6. Shift+Down moves back towards newer messages
const stateBack = navigator.navigateNewer();
assert.strictEqual(stateBack.currentIndex, 1);
assert.strictEqual(stateBack.currentMessage?.id, 104);

const stateBackToLatest = navigator.navigateNewer();
assert.strictEqual(stateBackToLatest.currentIndex, 0);
assert.strictEqual(stateBackToLatest.currentMessage?.id, 105);
console.log('✅ Check 6 Passed: Shift+Down moves forward through history.');

// 7. Shift+Down from latest message restores initial draft and exits edit mode
const stateRestored = navigator.navigateNewer();
assert.strictEqual(stateRestored.isEditing, false);
assert.strictEqual(stateRestored.currentIndex, -1);
assert.strictEqual(stateRestored.textToDisplay, 'My current composer draft');
assert.strictEqual(stateRestored.isInitialDraft, true);
console.log('✅ Check 7 Passed: Exiting history cleanly restores original composer draft.');

console.log('🎉 ALL 7 EDITABLE MESSAGE HISTORY NAVIGATOR CHECKS PASSED!');
