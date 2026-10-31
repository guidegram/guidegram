import assert from 'node:assert/strict';
import { MultiAccountSessionIsolationGovernor } from '../src/services/multiAccountSessionIsolationGovernor.ts';

console.log('🧪 Starting Phase 50 Multi-Account Session Isolation & Stealth Vault Verification Suite...');

// 1. Multi-Account Registration & Sandbox Isolation (kotatogram #11)
{
  console.log('  Testing account registration and sandbox directories...');
  const governor = new MultiAccountSessionIsolationGovernor();

  const acc1 = governor.registerAccount('acc_work', 1001, '+989121112233', 'Ershad Work');
  assert.strictEqual(acc1.success, true);
  assert.strictEqual(acc1.profile?.storageDir, 'user_sessions/acc_acc_work_1001');

  const acc2 = governor.registerAccount('acc_personal', 2002, '+14155552671', 'Ershad Personal');
  assert.strictEqual(acc2.success, true);
  assert.strictEqual(acc2.profile?.storageDir, 'user_sessions/acc_acc_personal_2002');
  console.log('  ✅ Account sandbox isolation verified');
}

// 2. Account Reordering (kotatogram #284)
{
  console.log('  Testing account reordering in switcher list...');
  const governor = new MultiAccountSessionIsolationGovernor();
  governor.registerAccount('acc_1', 1, '+14155550001', 'Acc 1');
  governor.registerAccount('acc_2', 2, '+14155550002', 'Acc 2');

  const reordered = governor.reorderAccounts(['acc_2', 'acc_1']);
  assert.strictEqual(reordered, true);

  const visible = governor.getVisibleAccounts();
  assert.strictEqual(visible[0].accountId, 'acc_2');
  assert.strictEqual(visible[1].accountId, 'acc_1');
  console.log('  ✅ Account reordering verified');
}

// 3. Stealth Vault Accounts with Passcode Protection (kotatogram #361)
{
  console.log('  Testing stealth account hiding and passcode unlock...');
  const governor = new MultiAccountSessionIsolationGovernor();
  governor.registerAccount('public_acc', 11, '+14155550011', 'Public Account');
  governor.registerAccount('stealth_acc', 22, '+14155550022', 'Secret Vault', true, 'hash_secret_passcode_99');

  // Without unlock: stealth account is completely hidden
  const visibleNormally = governor.getVisibleAccounts();
  assert.strictEqual(visibleNormally.length, 1);
  assert.strictEqual(visibleNormally[0].accountId, 'public_acc');

  // Wrong passcode fails
  const wrongUnlock = governor.unlockStealthAccount('stealth_acc', 'wrong_passcode');
  assert.strictEqual(wrongUnlock, false);

  // Correct passcode succeeds
  const correctUnlock = governor.unlockStealthAccount('stealth_acc', 'hash_secret_passcode_99');
  assert.strictEqual(correctUnlock, true);

  // Once unlocked: stealth account appears in list
  const visibleWithUnlock = governor.getVisibleAccounts(new Set(['stealth_acc']));
  assert.strictEqual(visibleWithUnlock.length, 2);
  console.log('  ✅ Stealth account hiding & passcode unlock verified');
}

// 4. ITU-T E.164 Phone Number Sanitizer (kotatogram #404)
{
  console.log('  Testing international phone sanitization...');
  // Valid Iranian phone with spaces and dashes
  const iran = MultiAccountSessionIsolationGovernor.sanitizeE164Phone('  +98 912-345-6789  ');
  assert.strictEqual(iran.isValid, true);
  assert.strictEqual(iran.formattedE164, '+989123456789');

  // Valid US phone with 00 prefix
  const us = MultiAccountSessionIsolationGovernor.sanitizeE164Phone('001 (415) 555-2671');
  assert.strictEqual(us.isValid, true);
  assert.strictEqual(us.formattedE164, '+14155552671');

  // Invalid: too short or non-digits
  const invalid = MultiAccountSessionIsolationGovernor.sanitizeE164Phone('12345');
  assert.strictEqual(invalid.isValid, false);
  console.log('  ✅ E.164 phone sanitization verified');
}

// 5. Auth Code Delivery Channel Failover (tdesktop #26626)
{
  console.log('  Testing auth code delivery channel timeline...');
  // 10s: app_push active, cannot request SMS yet
  const stage1 = MultiAccountSessionIsolationGovernor.calculateAuthCodeDeliveryFallback(10);
  assert.strictEqual(stage1.currentChannel, 'app_push');
  assert.strictEqual(stage1.canRequestSms, false);
  assert.strictEqual(stage1.secondsRemainingToFallback, 50);

  // 70s: SMS available
  const stage2 = MultiAccountSessionIsolationGovernor.calculateAuthCodeDeliveryFallback(70);
  assert.strictEqual(stage2.currentChannel, 'sms');
  assert.strictEqual(stage2.canRequestSms, true);
  assert.strictEqual(stage2.canRequestCall, false);

  // 200s: Phone call available
  const stage3 = MultiAccountSessionIsolationGovernor.calculateAuthCodeDeliveryFallback(200);
  assert.strictEqual(stage3.currentChannel, 'phone_call');
  assert.strictEqual(stage3.canRequestCall, true);
  console.log('  ✅ Auth code fallback timeline verified');
}

// 6. Private Draft Encryption and Decryption (kotatogram #442)
{
  console.log('  Testing draft encryption & decryption...');
  const draft = 'Highly sensitive secret draft message for confidential chat.';
  const key = 'secure_account_master_encryption_key_2026';

  const encrypted = MultiAccountSessionIsolationGovernor.encryptDraft(draft, key);
  assert.notStrictEqual(encrypted, draft);

  const decrypted = MultiAccountSessionIsolationGovernor.decryptDraft(encrypted, key);
  assert.strictEqual(decrypted, draft);
  console.log('  ✅ Private draft encryption verified');
}

console.log('✨ All Phase 50 Verification Tests Passed 100% Successfully!');
