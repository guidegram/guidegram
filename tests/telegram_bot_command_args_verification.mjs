import { strict as assert } from 'node:assert';
import { 
  tokenizeCommandArgs, 
  parseTypedCommandArgs, 
  parseBotCommand 
} from '../dist-test-cmd/src/utils/telegramBotCommandParser.js';

console.log('🧪 Starting TelegramBotCommandArgs Verification Suite...');

// 1. Tokenizer test
const raw = 'arg1 "second param with spaces" \'third single\' final';
const tokens = tokenizeCommandArgs(raw);
assert.deepStrictEqual(tokens, ['arg1', 'second param with spaces', 'third single', 'final']);
console.log('  ✅ Check 1: Quoted argument tokenization verified');

// 2. Schema parsing: /ban <userId: number> [reason: rest]
const banSchema = [
  { name: 'userId', type: 'number', required: true },
  { name: 'reason', type: 'rest', required: false, default: 'Spam violation' }
];

const banRes = parseTypedCommandArgs('123456 Spammed the group chat severely', banSchema);
assert.strictEqual(banRes.success, true);
assert.strictEqual(banRes.args.userId, 123456);
assert.strictEqual(banRes.args.reason, 'Spammed the group chat severely');
console.log('  ✅ Check 2: Number and trailing Rest arguments verified');

// 3. Infallible String argument (teloxide #1485 parity)
const supportSchema = [
  { name: 'ticketText', type: 'string', required: true }
];
const supportRes = parseTypedCommandArgs('URGENT_INQUIRY', supportSchema);
assert.strictEqual(supportRes.success, true);
assert.strictEqual(supportRes.args.ticketText, 'URGENT_INQUIRY');
console.log('  ✅ Check 3: Infallible String argument verified');

// 4. Boolean type parsing
const configSchema = [
  { name: 'enableLogs', type: 'boolean', required: true },
  { name: 'notifyAdmin', type: 'boolean', required: false, default: true }
];
const configRes = parseTypedCommandArgs('yes false', configSchema);
assert.strictEqual(configRes.success, true);
assert.strictEqual(configRes.args.enableLogs, true);
assert.strictEqual(configRes.args.notifyAdmin, false);
console.log('  ✅ Check 4: Boolean argument parsing verified');

// 5. Invalid number format rejection
const invalidNumRes = parseTypedCommandArgs('not_a_number', [{ name: 'amount', type: 'number', required: true }]);
assert.strictEqual(invalidNumRes.success, false);
assert.ok(invalidNumRes.error.includes('Invalid number format'));
console.log('  ✅ Check 5: Number validation rejection verified');

// 6. Missing required argument
const missingReqRes = parseTypedCommandArgs('', [{ name: 'req', type: 'string', required: true }]);
assert.strictEqual(missingReqRes.success, false);
assert.ok(missingReqRes.error.includes('Missing required argument'));
console.log('  ✅ Check 6: Required argument missing rejection verified');

// 7. Full command integration: /pay@MyBot 100 "donation"
const parsedCmd = parseBotCommand('/pay@MyBot 100 "donation"');
assert.ok(parsedCmd);
assert.strictEqual(parsedCmd.command, 'pay');
assert.strictEqual(parsedCmd.botUsername, 'mybot');

const paySchema = [
  { name: 'amount', type: 'number', required: true },
  { name: 'note', type: 'string', required: false, default: 'General' }
];
const payRes = parseTypedCommandArgs(parsedCmd.args, paySchema);
assert.strictEqual(payRes.success, true);
assert.strictEqual(payRes.args.amount, 100);
assert.strictEqual(payRes.args.note, 'donation');
console.log('  ✅ Check 7: Full command pipeline integration verified');

console.log('🎉 ALL 7 CHECKS PASSED SUCCESSFULLY!');
