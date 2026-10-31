import assert from 'node:assert/strict';
import { SystemIntegrationAndPresenceGovernor } from '../src/services/systemIntegrationAndPresenceGovernor.ts';

console.log('🧪 Starting Phase 33 System Integration & Presence Verification Suite...');

// 1. Safe 64-Bit Identifier Normalization (tdesktop #17330)
{
  console.log('  Testing 64-bit BigInt identifier parsing & normalization...');
  // 64-bit ID that overflows JavaScript 53-bit MAX_SAFE_INTEGER (9007199254740991)
  const hugeChannelId = '1234567890123456789';
  const norm1 = SystemIntegrationAndPresenceGovernor.normalizePeerId(hugeChannelId);
  assert.strictEqual(norm1.normalizedString, hugeChannelId);
  assert.strictEqual(norm1.is64Bit, true);
  assert.strictEqual(norm1.bigIntValue, 1234567890123456789n);

  // Standard 32-bit ID
  const regularUserId = 12345678;
  const norm2 = SystemIntegrationAndPresenceGovernor.normalizePeerId(regularUserId);
  assert.strictEqual(norm2.is64Bit, false);
  assert.strictEqual(norm2.normalizedString, '12345678');
  console.log('  ✅ 64-bit ID normalization passed');
}

// 2. Online Presence Expiry & Indicator Cache (tdesktop #6410)
{
  console.log('  Testing presence tracking & automatic expiration...');
  const now = 1000000;
  // Mark user online for 5 minutes (300,000 ms)
  SystemIntegrationAndPresenceGovernor.updatePresence('user_100', true, now, 300000);

  // At now + 2 mins -> still online
  assert.strictEqual(
    SystemIntegrationAndPresenceGovernor.isUserCurrentlyOnline('user_100', now + 120000),
    true
  );

  // At now + 6 mins -> expired / offline
  assert.strictEqual(
    SystemIntegrationAndPresenceGovernor.isUserCurrentlyOnline('user_100', now + 360000),
    false
  );
  console.log('  ✅ Presence tracking & expiration passed');
}

// 3. Graceful Non-Blocking OS Shutdown (tdesktop #633)
{
  console.log('  Testing graceful shutdown non-blocking execution...');
  let task1Executed = false;

  SystemIntegrationAndPresenceGovernor.registerShutdownTask({
    name: 'flush-sqlite',
    action: async () => {
      task1Executed = true;
    },
    timeoutMs: 500
  });

  // Hanging task that would normally block shutdown
  SystemIntegrationAndPresenceGovernor.registerShutdownTask({
    name: 'hanging-socket',
    action: async () => {
      await new Promise(r => setTimeout(r, 5000));
    },
    timeoutMs: 100 // Stricter timeout for the hanging task
  });

  const res = await SystemIntegrationAndPresenceGovernor.executeGracefulShutdown(1000);
  assert.strictEqual(task1Executed, true, 'Task 1 must complete');
  assert.strictEqual(res.completedCount, 1);
  assert.strictEqual(res.timedOutCount, 1);
  console.log('  ✅ Graceful shutdown execution passed');
}

// 4. Multilingual Spellcheck Language Switcher (tdesktop #4628)
{
  console.log('  Testing spellcheck language resolution...');
  const langs = SystemIntegrationAndPresenceGovernor.resolveSpellcheckLanguages(['en-US'], 'persian');
  assert.ok(langs.includes('fa'));
  assert.ok(langs.includes('fa-IR'));
  assert.ok(langs.includes('en-US'));
  console.log('  ✅ Spellcheck language resolution passed');
}

console.log('\n🎉 ALL Phase 33 verification checks passed green!');
