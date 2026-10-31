import assert from 'node:assert';
import { Fido2PasskeySelector } from '../src/services/fido2PasskeySelector.ts';

console.log('Testing Fido2PasskeySelector (tdesktop #31547 Guard)...');

const selector = Fido2PasskeySelector.getInstance();

const dummyAuthData = new Uint8Array([1, 2, 3]);
const dummySig = new Uint8Array([4, 5, 6]);

const mockAssertions = [
  {
    index: 0,
    credentialId: 'cred_id_account_primary',
    rawCredentialId: new Uint8Array([10]),
    userHandle: 'user_111111',
    userName: 'DoctorGuidance',
    displayName: 'Ershad Zolfi',
    authenticatorData: dummyAuthData,
    signature: dummySig,
  },
  {
    index: 1,
    credentialId: 'cred_id_account_work',
    rawCredentialId: new Uint8Array([20]),
    userHandle: 'user_222222',
    userName: 'WorkAccount',
    displayName: 'Dr. Zolfi (Work)',
    authenticatorData: dummyAuthData,
    signature: dummySig,
  },
  {
    index: 2,
    credentialId: 'cred_id_account_bot_admin',
    rawCredentialId: new Uint8Array([30]),
    userHandle: 'user_333333',
    userName: 'BotAdmin',
    displayName: 'Admin Persona',
    authenticatorData: dummyAuthData,
    signature: dummySig,
  },
];

// 1. Single resident key auto-selects
const singleResult = selector.resolveAssertion([mockAssertions[0]]);
assert.strictEqual(singleResult.requiresDisambiguation, false);
assert.strictEqual(singleResult.selectedAssertion?.credentialId, 'cred_id_account_primary');

// 2. Multiple resident keys without filter requires disambiguation (Account Picker dialog)
const multiResult = selector.resolveAssertion(mockAssertions);
assert.strictEqual(multiResult.requiresDisambiguation, true, 'Multiple resident keys without allowList must trigger disambiguation');
assert.strictEqual(multiResult.selectedAssertion, null);
assert.strictEqual(multiResult.availableCandidates.length, 3);

// 3. User selects specific index (e.g. index 1)
const pickedResult = selector.resolveAssertion(mockAssertions, undefined, undefined, 1);
assert.strictEqual(pickedResult.requiresDisambiguation, false);
assert.strictEqual(pickedResult.selectedAssertion?.index, 1);
assert.strictEqual(pickedResult.selectedAssertion?.userName, 'WorkAccount');

// 4. AllowCredentials filter matches index 2
const allowListResult = selector.resolveAssertion(mockAssertions, ['cred_id_account_bot_admin']);
assert.strictEqual(allowListResult.requiresDisambiguation, false);
assert.strictEqual(allowListResult.selectedAssertion?.index, 2);
assert.strictEqual(allowListResult.selectedAssertion?.userHandle, 'user_333333');

// 5. TargetUserHandle matches index 1
const userHandleResult = selector.resolveAssertion(mockAssertions, undefined, 'user_222222');
assert.strictEqual(userHandleResult.requiresDisambiguation, false);
assert.strictEqual(userHandleResult.selectedAssertion?.index, 1);

// 6. Verify telemetry
const telemetry = selector.getTelemetry();
assert.ok(telemetry.totalCeremoniesProcessed >= 5);
assert.ok(telemetry.multiResidentDetectedCount >= 4);
assert.ok(telemetry.disambiguationsRequiredCount >= 1);
assert.ok(telemetry.exactAllowListMatchesCount >= 1);

console.log('ALL 6 FIDO2 PASSKEY SELECTOR CHECKS PASSED SUCCESSFULLY!');
