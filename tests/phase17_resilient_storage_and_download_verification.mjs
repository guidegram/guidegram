import assert from 'node:assert';
import {
  ChunkedConcurrentDownloadManager,
  SafeDownloadDirectoryGuard,
  PersistentSettingsAndThemeStore,
} from '../src/services/resilientStorageAndDownloadService.ts';

function runTests() {
  console.log('[Phase 17 Verification] Starting tests...');

  // --- Test 1: ChunkedConcurrentDownloadManager (#24700, #231) ---
  const downloadMgr = new ChunkedConcurrentDownloadManager();
  // 100 bytes file with 50 bytes per chunk (2 chunks)
  downloadMgr.initializeDownload(100, 50, 2);

  const pendingInitial = downloadMgr.getPendingChunks();
  assert.strictEqual(pendingInitial.length, 2);
  assert.strictEqual(downloadMgr.getProgress().percent, 0);

  // Complete chunk 0
  const chunk0Data = new Uint8Array(50).fill(1);
  downloadMgr.markChunkComplete(0, chunk0Data);
  assert.strictEqual(downloadMgr.getProgress().percent, 50);
  assert.strictEqual(downloadMgr.getProgress().isComplete, false);

  // Complete chunk 1
  const chunk1Data = new Uint8Array(50).fill(2);
  downloadMgr.markChunkComplete(1, chunk1Data);
  assert.strictEqual(downloadMgr.getProgress().percent, 100);
  assert.strictEqual(downloadMgr.getProgress().isComplete, true);

  // Assemble file
  const fullFile = downloadMgr.assembleFile();
  assert.ok(fullFile !== null);
  assert.strictEqual(fullFile.length, 100);
  assert.strictEqual(fullFile[0], 1);
  assert.strictEqual(fullFile[50], 2);
  console.log('✓ Test 1: ChunkedConcurrentDownloadManager passed');

  // --- Test 2: SafeDownloadDirectoryGuard (#7701, #379) ---
  // Traversal attack
  const sanitizedTraversal = SafeDownloadDirectoryGuard.sanitizeFileName('../../../etc/passwd');
  assert.strictEqual(sanitizedTraversal, 'passwd');

  const sanitizedWindows = SafeDownloadDirectoryGuard.sanitizeFileName('C:\\Windows\\System32\\file.exe');
  assert.strictEqual(sanitizedWindows, 'file.exe');

  // Name collision
  const existingFiles = new Set(['document.pdf', 'document (1).pdf']);
  const nonColliding = SafeDownloadDirectoryGuard.getNonCollidingFileName('document.pdf', existingFiles);
  assert.strictEqual(nonColliding, 'document (2).pdf');
  console.log('✓ Test 2: SafeDownloadDirectoryGuard passed');

  // --- Test 3: PersistentSettingsAndThemeStore (#36, #185) ---
  const store = new PersistentSettingsAndThemeStore({ theme: 'dark', fontSize: 16 });
  assert.strictEqual(store.getSettings().theme, 'dark');
  assert.strictEqual(store.getSettings().fontSize, 16);

  store.updateSetting('theme', 'light');
  store.updateSetting('downloadSpeedBoost', true);

  const json = store.serialize();
  assert.ok(json.includes('"theme": "light"'));

  const newStore = new PersistentSettingsAndThemeStore();
  const success = newStore.deserialize(json);
  assert.strictEqual(success, true);
  assert.strictEqual(newStore.getSettings().theme, 'light');

  // Corrupt JSON fallback
  const corruptSuccess = newStore.deserialize('{ corrupt json ...');
  assert.strictEqual(corruptSuccess, false, 'Corrupt JSON must be caught safely');
  console.log('✓ Test 3: PersistentSettingsAndThemeStore passed');

  console.log('[Phase 17 Verification] ALL VERIFICATION TESTS PASSED!');
}

runTests();
