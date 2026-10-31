import assert from 'node:assert';
import {
  TelegramUpdateNormalizer,
  TELEGRAM_UNSET_SENTINEL
} from '../src/utils/telegramUpdateNormalizer.ts';

console.log('Testing TelegramUpdateNormalizer (aiogram #1966 Hardening)...');

const normalizer = TelegramUpdateNormalizer.getInstance();

// 1. Valid inbound update parsing
const rawUpdate = JSON.stringify({
  update_id: 88776655,
  message: {
    message_id: 1234,
    date: 1730000000,
    chat: { id: -1001234567890, type: 'supergroup', title: 'Guidegram Chat' },
    text: 'Hello from high performance parser'
  }
});

const parsed = normalizer.parseInboundUpdate(rawUpdate);
assert.strictEqual(parsed.update_id, 88776655);
assert.strictEqual(parsed.message.text, 'Hello from high performance parser');

// 2. Invalid update handling
assert.throws(() => {
  normalizer.parseInboundUpdate(JSON.stringify({ not_an_update: true }));
}, /missing or non-numeric update_id/);

// 3. Outbound serialization with UNSET and undefined stripping
const sourceMethod = {
  method: 'sendMessage',
  chat_id: -1001234567890,
  text: 'Broadcast message',
  parse_mode: TELEGRAM_UNSET_SENTINEL, // Should be stripped
  reply_to_message_id: undefined, // Should be stripped
  protect_content: true,
  disable_notification: false
};

const serialized = normalizer.serializeOutboundMethod(sourceMethod);
const parsedMethod = JSON.parse(serialized);

assert.strictEqual(parsedMethod.method, 'sendMessage');
assert.strictEqual(parsedMethod.chat_id, -1001234567890);
assert.strictEqual(parsedMethod.text, 'Broadcast message');
assert.strictEqual(parsedMethod.protect_content, true);
assert.strictEqual(parsedMethod.disable_notification, false);
assert.strictEqual('parse_mode' in parsedMethod, false, 'UNSET sentinel must be stripped from serialized JSON');
assert.strictEqual('reply_to_message_id' in parsedMethod, false, 'undefined must be stripped from serialized JSON');

// Verify caller's source object was NOT mutated
assert.strictEqual(sourceMethod.parse_mode, TELEGRAM_UNSET_SENTINEL, 'Source object must remain unmutated');

// 4. Zero-allocation update type detection
assert.strictEqual(normalizer.getUpdateType(parsed), 'message');
assert.strictEqual(normalizer.getUpdateType({ update_id: 1, callback_query: { id: 'cb_1' } }), 'callback_query');
assert.strictEqual(normalizer.getUpdateType({ update_id: 2, message_reaction: { chat: {} } }), 'message_reaction');
assert.strictEqual(normalizer.getUpdateType({ update_id: 3 }), 'unknown');

// 5. Telemetry verification
const telemetry = normalizer.getTelemetry();
assert.ok(telemetry.inboundUpdatesParsed >= 1);
assert.ok(telemetry.outboundRequestsSerialized >= 1);
assert.ok(telemetry.unsetFieldsStripped >= 2);

console.log('ALL 5 TELEGRAM UPDATE NORMALIZER CHECKS PASSED SUCCESSFULLY!');
