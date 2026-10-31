import assert from 'node:assert';
import { InlineBotAndWebAppGovernor } from '../src/services/inlineBotAndWebAppGovernor.ts';

console.log('🧪 Starting Phase 72 Inline Bot & Mini App Verification Suite...');

const governor = new InlineBotAndWebAppGovernor();

// 1. Test ReplyMarkup removal when reset by bot (Ajaxy #366)
console.log('  Testing inline keyboard removal on bot reset...');
governor.applyReplyMarkup(1001, {
  type: 'inline_keyboard',
  rows: [[{ text: 'Option 1', callbackData: 'cb_1' }]]
});
assert.ok(governor.getActiveMarkup(1001) !== null);

const removalResult = governor.applyReplyMarkup(1001, { type: 'remove_keyboard' });
assert.strictEqual(removalResult.removed, true);
assert.strictEqual(removalResult.activeMarkup, null);
assert.strictEqual(governor.getActiveMarkup(1001), null);
console.log('  ✅ Inline keyboard removal verified');

// 2. Test ForceReply active state tracking (Ajaxy #411)
console.log('  Testing ForceReply state management...');
const forceResult = governor.applyReplyMarkup(1002, {
  type: 'force_reply',
  placeholder: 'Type your reply...'
});
assert.strictEqual(forceResult.forceReplyActive, true);
assert.strictEqual(governor.isForceReplyActiveFor(1002), true);
assert.strictEqual(governor.isForceReplyActiveFor(9999), false);
console.log('  ✅ ForceReply state management verified');

// 3. Test BotCallbackAnswer URL handling (morethanwords #274)
console.log('  Testing BotCallbackAnswer URL processing...');
const urlAnswer = governor.processCallbackAnswer({
  url: 'https://guidegram.org/auth/verify?code=123',
  text: 'Redirecting to login...',
  showAlert: false,
  cacheTime: 60
});
assert.strictEqual(urlAnswer.action, 'open_url');
assert.strictEqual(urlAnswer.targetUrl, 'https://guidegram.org/auth/verify?code=123');
assert.strictEqual(urlAnswer.message, 'Redirecting to login...');

const alertAnswer = governor.processCallbackAnswer({
  text: 'Action not permitted!',
  showAlert: true,
  cacheTime: 0
});
assert.strictEqual(alertAnswer.action, 'alert');
assert.strictEqual(alertAnswer.message, 'Action not permitted!');
console.log('  ✅ BotCallbackAnswer URL processing verified');

// 4. Test InlineQueryResult description preservation (tdesktop #31395)
console.log('  Testing InlineQueryResult description preservation...');
const sanitized = governor.sanitizeInlineQueryResult({
  id: 'query_res_1',
  type: 'article',
  title: 'Guidegram Documentation',
  description: 'Detailed user manual and architectural guides',
  inputMessageContent: { messageText: 'https://guidegram.org/docs', parseMode: 'markdown' }
});
assert.strictEqual(sanitized.description, 'Detailed user manual and architectural guides');
assert.strictEqual(sanitized.title, 'Guidegram Documentation');
console.log('  ✅ InlineQueryResult description preservation verified');

// 5. Test Multi-Row Inline Keyboard grid (> 3 rows supported) (tdlib #336)
console.log('  Testing multi-row inline keyboard grid layout...');
const multiRows = [
  [{ text: 'Button A1', callbackData: 'a1' }, { text: 'Button A2', callbackData: 'a2' }],
  [{ text: 'Button B1', callbackData: 'b1' }],
  [{ text: 'Button C1', callbackData: 'c1' }, { text: 'Button C2', callbackData: 'c2' }],
  [{ text: 'Button D1', callbackData: 'd1' }, { text: 'Button D2', callbackData: 'd2' }],
  [{ text: 'Button E1', callbackData: 'e1' }]
];
const gridResult = governor.validateInlineKeyboardGrid(multiRows);
assert.strictEqual(gridResult.valid, true);
assert.strictEqual(gridResult.rowCount, 5);
assert.strictEqual(gridResult.buttonCount, 8);
console.log('  ✅ Multi-row inline keyboard layout verified');

// 6. Test Mini App launch URL construction with start_param and auth_date (Telegram-iOS #1091 & morethanwords #271)
console.log('  Testing Mini App URL construction and start_param injection...');
const nowTs = 1730385600;
const appLaunch = governor.buildWebAppLaunchUrl({
  botId: 'bot_99',
  botUsername: 'guidegram_bot',
  webAppUrl: 'https://miniapp.guidegram.org/shop',
  startParam: 'ref_campaign_winter2026',
  authDate: nowTs,
  queryId: 'query_abc_xyz'
});

assert.strictEqual(appLaunch.tgWebAppStartParam, 'ref_campaign_winter2026');
assert.ok(appLaunch.launchUrl.includes('tgWebAppStartParam=ref_campaign_winter2026'));
assert.ok(decodeURIComponent(appLaunch.launchUrl).includes('auth_date=1730385600'));
assert.ok(appLaunch.initData.includes('bot_username=guidegram_bot'));
assert.ok(appLaunch.initData.includes('auth_date=1730385600'));
assert.ok(appLaunch.initData.includes('query_id=query_abc_xyz'));
console.log('  ✅ Mini App URL construction and parameter injection verified');

// 7. Test Prepared Mini App media preview entity preservation (Ajaxy #549)
console.log('  Testing prepared Mini App preview entity retention...');
const prepared = governor.formatPreparedMiniAppMessage({
  caption: 'Special Offer: Use coupon SAVE50 for 50% discount!',
  entities: [
    { type: 'bold', offset: 0, length: 14 },
    { type: 'code', offset: 26, length: 6 }
  ],
  mediaType: 'photo',
  mediaUrl: 'https://cdn.guidegram.org/promos/winter.jpg'
});

assert.strictEqual(prepared.mediaPreserved, true);
assert.strictEqual(prepared.finalCaption, 'Special Offer: Use coupon SAVE50 for 50% discount!');
assert.strictEqual(prepared.formattedEntities.length, 2);
assert.strictEqual(prepared.formattedEntities[1].type, 'code');
console.log('  ✅ Prepared Mini App preview entity retention verified');

console.log('✨ All Phase 72 Verification Tests Passed 100% Successfully!');
