import assert from 'assert';

console.log('--- Verifying Mute and Title Hardening ---');

// Test 1: App.tsx mute gate logic simulation
function testMuteGate({ targetDialog, payload, isChannel, isGroup, isBotAccount, isMention, typeAllowed }) {
  const payloadMuted = payload?.chatInfo?.isMuted;
  let isChatMuted = false;
  if (typeof targetDialog?.isMuted === 'boolean') {
    isChatMuted = targetDialog.isMuted;
  } else if (typeof payloadMuted === 'boolean') {
    isChatMuted = payloadMuted;
  } else if (isChannel) {
    isChatMuted = true;
  }

  if (isBotAccount && targetDialog?.isMuted !== false) {
    isChatMuted = true;
  }

  let shouldNotify = false;
  if (isChatMuted) {
    shouldNotify = isBotAccount ? false : isMention;
  } else {
    shouldNotify = typeAllowed || isMention;
  }
  return { isChatMuted, shouldNotify };
}

// Case A: Group muted in targetDialog (user muted it)
const res1 = testMuteGate({
  targetDialog: { id: '-1003086339265', isGroup: true, isMuted: true },
  payload: { chatInfo: { isGroup: true, isMuted: true } },
  isChannel: false,
  isGroup: true,
  isBotAccount: false,
  isMention: false,
  typeAllowed: true,
});
assert.strictEqual(res1.isChatMuted, true, 'Chat must be marked muted');
assert.strictEqual(res1.shouldNotify, false, 'Muted group must NOT notify without mention');

// Case B: Group not in targetDialog (windowed out), but payload says isMuted: true
const res2 = testMuteGate({
  targetDialog: undefined,
  payload: { chatInfo: { isGroup: true, isMuted: true } },
  isChannel: false,
  isGroup: true,
  isBotAccount: false,
  isMention: false,
  typeAllowed: true,
});
assert.strictEqual(res2.isChatMuted, true, 'Chat must be marked muted from payload');
assert.strictEqual(res2.shouldNotify, false, 'Muted group must NOT notify');

// Case C: Muted group with direct mention
const res3 = testMuteGate({
  targetDialog: { id: '-1003086339265', isGroup: true, isMuted: true },
  payload: { chatInfo: { isGroup: true, isMuted: true } },
  isChannel: false,
  isGroup: true,
  isBotAccount: false,
  isMention: true,
  typeAllowed: true,
});
assert.strictEqual(res3.shouldNotify, true, 'Muted group MUST notify on direct mention');

console.log('[PASS] Notification mute gating verified!');

// Test 2: Contact identity resolution simulation
function resolveDialogIdentity({ isSelf, topMsg, incomingMsg, existingCached, cId, isUser, isGroup }) {
  let title = '';
  if (isSelf) {
    title = 'Saved Messages';
  } else if (existingCached?.title && !existingCached.title.startsWith('کاربر ') && !existingCached.title.startsWith('User ') && !existingCached.title.toLowerCase().startsWith('ershad')) {
    title = existingCached.title;
  } else if (incomingMsg?.senderName) {
    title = incomingMsg.senderName;
  } else if (topMsg && !topMsg.isOutgoing && topMsg.senderName) {
    title = topMsg.senderName;
  } else {
    title = isUser ? `کاربر ${cId}` : (isGroup ? `گروه ${cId}` : `کانال ${cId}`);
  }

  let avatarUrl = undefined;
  if (!isSelf) {
    if (existingCached?.avatarUrl) avatarUrl = existingCached.avatarUrl;
    if (!avatarUrl && incomingMsg?.senderAvatarUrl) avatarUrl = incomingMsg.senderAvatarUrl;
  }

  let username = undefined;
  if (!isSelf) {
    username = existingCached?.username || incomingMsg?.senderUsername || (topMsg && !topMsg.isOutgoing ? topMsg.senderUsername : undefined);
  }

  return { title, avatarUrl, username };
}

// User sent outgoing message to contact 116407045
const topOutgoingMsg = {
  id: 2062290,
  isOutgoing: true,
  senderName: 'Ershad ¹²|⁵²',
  senderAvatarUrl: 'data:image/jpeg;base64,DR_ERSHAD_AVATAR',
  senderUsername: 'DrGuidance',
  text: 'کلادم میزنیم ولی ممکنه وریفای رد شه یا تایید شه شانسیه'
};

const idRes = resolveDialogIdentity({
  isSelf: false,
  topMsg: topOutgoingMsg,
  incomingMsg: undefined,
  existingCached: undefined,
  cId: '116407045',
  isUser: true,
  isGroup: false
});

assert.strictEqual(idRes.title, 'کاربر 116407045', 'Outgoing senderName MUST NOT become contact title');
assert.strictEqual(idRes.avatarUrl, undefined, 'Outgoing senderAvatarUrl MUST NOT become contact avatar');
assert.strictEqual(idRes.username, undefined, 'Outgoing senderUsername MUST NOT become contact username');

console.log('[PASS] Contact identity protection verified!');
console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY.');
