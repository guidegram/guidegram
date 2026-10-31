import assert from 'node:assert';
import {
  parseBotCommand,
  shouldBotProcessCommand,
  formatCommandForChat
} from '../src/utils/telegramBotCommandParser.ts';

console.log('🧪 Running Telegram Bot Command Parser & Privacy Mode Router Verification (Phase 162)...');

let passed = 0;

// 1. parseBotCommand basic
const p1 = parseBotCommand('/start');
assert.ok(p1 !== null);
assert.strictEqual(p1.command, 'start');
assert.strictEqual(p1.botUsername, undefined);
assert.strictEqual(p1.args, '');
assert.strictEqual(p1.isTargeted, false);
console.log('✅ Check 1: Basic command parsing passed');
passed++;

// 2. parseBotCommand with username target
const p2 = parseBotCommand('/info@MyBot');
assert.ok(p2 !== null);
assert.strictEqual(p2.command, 'info');
assert.strictEqual(p2.botUsername, 'mybot');
assert.strictEqual(p2.args, '');
assert.strictEqual(p2.isTargeted, true);
console.log('✅ Check 2: Targeted username command parsing passed');
passed++;

// 3. parseBotCommand with arguments
const p3 = parseBotCommand('/search@SearchBot rust programming 2026');
assert.ok(p3 !== null);
assert.strictEqual(p3.command, 'search');
assert.strictEqual(p3.botUsername, 'searchbot');
assert.strictEqual(p3.args, 'rust programming 2026');
console.log('✅ Check 3: Command with parameters parsing passed');
passed++;

// 4. Non-command texts
assert.strictEqual(parseBotCommand('hello /notacommand'), null);
assert.strictEqual(parseBotCommand(''), null);
console.log('✅ Check 4: Non-command inputs rejected');
passed++;

// 5. Privacy Mode Routing in DMs
const pUntargeted = parseBotCommand('/info');
assert.strictEqual(shouldBotProcessCommand(pUntargeted, 'mybot', { isGroupChat: false }), true);

const pOtherTarget = parseBotCommand('/info@otherbot');
assert.strictEqual(shouldBotProcessCommand(pOtherTarget, 'mybot', { isGroupChat: false }), false);
console.log('✅ Check 5: Private chat routing passed');
passed++;

// 6. Privacy Mode Routing in Groups (Core teloxide #978 invariant)
// Targeted to MyBot in group -> Always true
const pMyTarget = parseBotCommand('/info@mybot');
assert.strictEqual(shouldBotProcessCommand(pMyTarget, 'mybot', { isGroupChat: true }), true);

// Untargeted in group, bot was NOT last speaker -> Filtered (false)
assert.strictEqual(shouldBotProcessCommand(pUntargeted, 'mybot', { isGroupChat: true, isLastSpeaker: false }), false);

// Untargeted in group, bot WAS last speaker -> Delivered (true)
assert.strictEqual(shouldBotProcessCommand(pUntargeted, 'mybot', { isGroupChat: true, isLastSpeaker: true }), true);

// Untargeted in group, privacy disabled -> Delivered (true)
assert.strictEqual(shouldBotProcessCommand(pUntargeted, 'mybot', { isGroupChat: true, hasGroupPrivacyDisabled: true }), true);
console.log('✅ Check 6: Group privacy mode routing passed');
passed++;

// 7. formatCommandForChat
assert.strictEqual(formatCommandForChat('start'), '/start');
assert.strictEqual(formatCommandForChat('/help', 'GuidegramBot', false), '/help');
assert.strictEqual(formatCommandForChat('/help', 'GuidegramBot', true), '/help@GuidegramBot');
assert.strictEqual(formatCommandForChat('info', '@Helper_Bot', true), '/info@Helper_Bot');
console.log('✅ Check 7: Command formatting with group targeting passed');
passed++;

console.log(`\n🎉 ALL ${passed}/7 CHECKS PASSED FOR TELEGRAM BOT COMMAND PARSER!`);
