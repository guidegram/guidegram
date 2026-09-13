import assert from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import ts from 'typescript';

console.log('====================================================');
console.log('Running Day 3 Hardware Anti-Fingerprinting Verification');
console.log('====================================================\n');

const tsSource = fs.readFileSync('electron/telegram/deviceProfileManager.ts', 'utf8');
const jsSource = ts.transpileModule(tsSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

const sandbox = {
  exports: {},
  module: { exports: {} },
  require: (mod) => {
    if (mod === 'os') return { default: os, ...os };
    throw new Error(`Module ${mod} not mocked`);
  },
  console
};

vm.createContext(sandbox);
vm.runInContext(jsSource, sandbox);

const DeviceProfileManager = sandbox.exports.DeviceProfileManager || sandbox.module.exports.DeviceProfileManager;
assert.ok(DeviceProfileManager, 'DeviceProfileManager must be exported');

const testAccounts = [
  'acc_trader_1',
  'acc_trader_2',
  'acc_manager_alpha',
  'acc_manager_beta',
  'acc_dev_primary',
  'acc_dev_secondary',
  'acc_support_lead',
  'acc_marketing_eu',
  'acc_marketing_us',
  'acc_privacy_vault',
  'acc_backup_node',
  'acc_crypto_desk'
];

console.log('[TEST 1] Deterministic profile generation for identical account IDs:');
for (const acc of testAccounts) {
  const p1 = DeviceProfileManager.getProfileForAccount(acc, true);
  const p2 = DeviceProfileManager.getProfileForAccount(acc, true);
  assert.strictEqual(p1.deviceModel, p2.deviceModel, `Device model for ${acc} must be deterministic`);
  assert.strictEqual(p1.systemVersion, p2.systemVersion, `System version for ${acc} must be deterministic`);
}
console.log('  [PASS] All profiles are strictly deterministic.\n');

console.log('[TEST 2] Profile diversity across 12 distinct accounts:');
const seenSignatures = new Set();
for (const acc of testAccounts) {
  const profile = DeviceProfileManager.getProfileForAccount(acc, true);
  const signature = `${profile.deviceModel} | ${profile.systemVersion}`;
  console.log(`  - Account [${acc.padEnd(20)}]: ${signature}`);
  
  assert.ok(profile.deviceModel.length > 3, 'Device model must be realistic');
  assert.ok(profile.systemVersion.includes('Build') || profile.systemVersion.includes('macOS') || profile.systemVersion.includes('Linux'), 'System version must contain OS build string');
  assert.ok(profile.appVersion.length > 0, 'App version must be set');
  assert.ok(profile.systemLangCode.length > 0, 'Language code must be set');
  seenSignatures.add(signature);
}

console.log(`\nUnique hardware signatures generated: ${seenSignatures.size} of ${testAccounts.length}`);
assert.ok(seenSignatures.size >= 8, 'Must achieve high diversity (>= 8 unique profiles for 12 accounts)');
console.log('  [PASS] High-entropy anti-fingerprinting distribution verified.\n');

console.log('[TEST 3] Native fallback behavior when anti-fingerprinting is disabled:');
const native = DeviceProfileManager.getProfileForAccount('acc_native', false);
console.log(`  - Native profile: ${native.deviceModel} | ${native.systemVersion}`);
assert.ok(native.deviceModel.includes('Desktop') || native.deviceModel.includes('PC') || native.deviceModel.includes('Mac'));
console.log('  [PASS] Native fallback operates accurately.\n');

console.log('====================================================');
console.log('ALL HARDWARE PROFILING CHECKS PASSED (Day 3 Complete)');
console.log('====================================================');

