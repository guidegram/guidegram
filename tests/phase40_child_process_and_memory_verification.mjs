import assert from 'node:assert/strict';
import { ChildProcessAndMemorySandboxGovernor } from '../src/services/childProcessAndMemorySandboxGovernor.ts';

console.log('🧪 Starting Phase 40 Child Process & Memory Sandbox Verification Suite...');

// 1. Windows Exploit Guard & Child Process Mitigations (tdesktop #16627)
{
  console.log('  Testing subprocess spawn options for Windows Exploit Guard compliance...');
  const winOpts = ChildProcessAndMemorySandboxGovernor.getSafeSubprocessOptions(
    'C:\\Program Files\\Guidegram\\updater.exe',
    ['--check'],
    true
  );
  assert.strictEqual(winOpts.detached, false, 'Windows processes must not detach arbitrarily');
  assert.strictEqual(winOpts.windowsHide, true);
  assert.strictEqual(winOpts.isolationLevel, 'strict');

  const linuxOpts = ChildProcessAndMemorySandboxGovernor.getSafeSubprocessOptions(
    '/usr/bin/guidegram-helper',
    ['--sync'],
    false
  );
  assert.strictEqual(linuxOpts.detached, true);
  console.log('  ✅ Subprocess spawn options passed');
}

// 2. Supervised Worker Task Recovery & Isolation (tdesktop #26562)
{
  console.log('  Testing supervised worker task execution & automatic recovery...');
  let attemptCount = 0;
  const flakeyWorkerTask = async () => {
    attemptCount += 1;
    if (attemptCount === 1) {
      throw new Error('Transient worker thread crash');
    }
    return { processedRecords: 100 };
  };

  const res = await ChildProcessAndMemorySandboxGovernor.executeSupervisedWorkerTask(
    'media-indexer',
    flakeyWorkerTask,
    2
  );

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data?.processedRecords, 100);
  assert.strictEqual(res.restartedCount, 1);
  console.log('  ✅ Supervised worker recovery passed');
}

// 3. Story Draft Caching & Expiration Purge (tdesktop #26632)
{
  console.log('  Testing story draft storage & 24h expiration purge...');
  const now = 1000000;
  ChildProcessAndMemorySandboxGovernor.saveStoryDraft(
    'story_1',
    '/tmp/video1.mp4',
    'Morning coffee',
    10 * 1024 * 1024, // 10MB
    now,
    86400000 // 24 hours
  );

  // Purge at now + 12 hours -> nothing expired
  const purge1 = ChildProcessAndMemorySandboxGovernor.purgeExpiredStoryDrafts(now + 43200000);
  assert.strictEqual(purge1.purgedCount, 0);
  assert.strictEqual(purge1.freedBytes, 0);

  // Purge at now + 25 hours -> draft expired & freed 10MB
  const purge2 = ChildProcessAndMemorySandboxGovernor.purgeExpiredStoryDrafts(now + 90000000);
  assert.strictEqual(purge2.purgedCount, 1);
  assert.strictEqual(purge2.freedBytes, 10 * 1024 * 1024);
  console.log('  ✅ Story draft expiration purge passed');
}

// 4. Runtime Capability Sniffing (tdesktop #26116)
{
  console.log('  Testing runtime capability sniffing...');
  const legacyCentos = ChildProcessAndMemorySandboxGovernor.sniffRuntimeCapabilities('linux', '2.17');
  assert.strictEqual(legacyCentos.platformTier, 'legacy_fallback');
  assert.strictEqual(legacyCentos.supportsGpuAcceleration, false);

  const modernLinux = ChildProcessAndMemorySandboxGovernor.sniffRuntimeCapabilities('linux', '2.35');
  assert.strictEqual(modernLinux.platformTier, 'modern');
  assert.strictEqual(modernLinux.supportsGpuAcceleration, true);
  console.log('  ✅ Runtime capability sniffing passed');
}

console.log('\n🎉 ALL Phase 40 verification checks passed green!');
