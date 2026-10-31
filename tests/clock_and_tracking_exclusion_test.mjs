import assert from 'node:assert/strict';

// Test the exact regex and logic we implemented in activityTrackerService
function isClockNameChange(oldName, newName) {
  if (!oldName || !newName || oldName === newName) return false;
  const colonRegex = /[:：﹕ː∶]/;
  if (!colonRegex.test(oldName) && !colonRegex.test(newName)) return false;

  const oldChars = Array.from(oldName);
  const newChars = Array.from(newName);

  let start = 0;
  while (start < oldChars.length && start < newChars.length && oldChars[start] === newChars[start]) {
    start++;
  }

  let endOld = oldChars.length - 1;
  let endNew = newChars.length - 1;
  while (endOld >= start && endNew >= start && oldChars[endOld] === newChars[endNew]) {
    endOld--;
    endNew--;
  }

  const diffOldLen = endOld - start + 1;
  const diffNewLen = endNew - start + 1;
  const diffLength = Math.max(diffOldLen, diffNewLen);

  if (diffLength > 16) return false;

  const colonIndices = [];
  for (let i = 0; i < newChars.length; i++) {
    if (colonRegex.test(newChars[i])) {
      colonIndices.push(i);
    }
  }

  let isNearColon = false;
  for (const cIdx of colonIndices) {
    if (Math.abs(start - cIdx) <= 6 || Math.abs(endNew - cIdx) <= 6) {
      isNearColon = true;
      break;
    }
  }
  if (!isNearColon) return false;

  const changedOld = oldChars.slice(start, endOld + 1).join('');
  const changedNew = newChars.slice(start, endNew + 1).join('');
  const digitRegex = /[\d\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\u{1D7CE}-\u{1D7FF}]/u;

  return digitRegex.test(changedOld) || digitRegex.test(changedNew);
}

// Case 1: Mathematical Sans-Serif Bold digits used in user's prompt
// "𝑨𝒄𝒆𝒕𝒂𝒎𝒊𝒏𝒐𝒑𝒉𝒆𝒏 🧧🩸 𝟬𝟯:𝟱𝟮" -> "𝑨𝒄𝒆𝒕𝒂𝒎𝒊𝒏𝒐𝒑𝒉𝒆𝒏 🧧🩸 𝟬𝟯:𝟱٣"
const name1 = "𝑨𝒄𝒆𝒕𝒂𝒎𝒊𝒏𝒐𝒑𝒉𝒆𝒏 🧧🩸 𝟬𝟯:𝟱𝟮";
const name2 = "𝑨𝒄𝒆𝒕𝒂𝒎𝒊𝒏𝒐𝒑𝒉𝒆𝒏 🧧🩸 𝟬𝟯:𝟱𝟯";
assert.equal(isClockNameChange(name1, name2), true, "Mathematical bold digits clock should be detected");

// Case 2: Standard ASCII digits
const name3 = "John Doe 12:45";
const name4 = "John Doe 12:46";
assert.equal(isClockNameChange(name3, name4), true, "Standard clock should be detected");

// Case 3: Persian digits
const name5 = "علی ۱۲:۳۰";
const name6 = "علی ۱۲:۳۱";
assert.equal(isClockNameChange(name5, name6), true, "Persian clock should be detected");

// Case 4: Normal name change (not clock)
const normal1 = "John Doe";
const normal2 = "John Smith";
assert.equal(isClockNameChange(normal1, normal2), false, "Normal name change should not trigger clock detection");

// Case 5: Large text change with colon
const long1 = "My Status: Doing work at home right now";
const long2 = "My Status: Traveling to another country for summer vacation";
assert.equal(isClockNameChange(long1, long2), false, "Long change (>16 chars) should not trigger clock detection");

console.log("All clock name change detection tests passed successfully!");
