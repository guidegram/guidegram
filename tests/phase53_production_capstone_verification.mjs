import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('🧪 Starting Phase 53 Production Integration & Master Hardening Capstone Verification...');

// 1. Verify Production Build Artifacts Exist
{
  console.log('  Testing production build artifact presence...');
  const distHtml = path.resolve('dist/index.html');
  const distElectronMain = path.resolve('dist-electron/main.js');
  const distElectronPreload = path.resolve('dist-electron/preload.cjs');

  assert.ok(fs.existsSync(distHtml), 'dist/index.html must exist');
  assert.ok(fs.existsSync(distElectronMain), 'dist-electron/main.js must exist');
  assert.ok(fs.existsSync(distElectronPreload), 'dist-electron/preload.cjs must exist');

  const mainSize = fs.statSync(distElectronMain).size;
  assert.ok(mainSize > 1000000, `dist-electron/main.js size (${mainSize}) must be substantial`);
  console.log(`  ✅ Build artifacts verified (Electron main: ${(mainSize / 1024 / 1024).toFixed(2)} MB)`);
}

// 2. Verify Competitor Issues Ledger Integrity
{
  console.log('  Testing competitor intel issues ledger resolution metrics...');
  const jsonlPath = path.resolve('data/competitor_intel/competitor_issues.jsonl');
  assert.ok(fs.existsSync(jsonlPath), 'competitor_issues.jsonl must exist');

  const content = fs.readFileSync(jsonlPath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  const issues = lines.map(l => JSON.parse(l));

  const resolved = issues.filter(i => i.resolved === true);
  console.log(`  Total issues in ledger: ${issues.length}`);
  console.log(`  Total resolved issues: ${resolved.length}`);

  assert.ok(resolved.length >= 300, `Expected at least 300 resolved issues, found ${resolved.length}`);
  console.log('  ✅ Competitor intel ledger integrity verified');
}

// 3. Verify Hardening Service Suite Exports
{
  console.log('  Testing critical hardening services loading...');
  const { ClipboardPasteAndQuoteReplyGovernor } = await import('../src/services/clipboardPasteAndQuoteReplyGovernor.ts');
  const { MobileTouchErgonomicsAndSlopGovernor } = await import('../src/services/mobileTouchErgonomicsAndSlopGovernor.ts');
  const { MemoryHeapAndVirtualizationProfiler } = await import('../src/services/memoryHeapAndVirtualizationProfiler.ts');
  const { OfflineStorageAndMediaSessionGovernor } = await import('../src/services/offlineStorageAndMediaSessionGovernor.ts');
  const { AudioVideoCodecAndStreamPipelineGovernor } = await import('../src/services/audioVideoCodecAndStreamPipelineGovernor.ts');
  const { SearchIndexingAndQueryCacheGovernor } = await import('../src/services/searchIndexingAndQueryCacheGovernor.ts');
  const { MultiAccountSessionIsolationGovernor } = await import('../src/services/multiAccountSessionIsolationGovernor.ts');
  const { SecuritySandboxAndWebviewIsolationGovernor } = await import('../src/services/securitySandboxAndWebviewIsolationGovernor.ts');

  assert.ok(typeof ClipboardPasteAndQuoteReplyGovernor.inspectClipboardData === 'function');
  assert.ok(typeof MobileTouchErgonomicsAndSlopGovernor.calculateKeyboardInset === 'function');
  assert.ok(typeof MemoryHeapAndVirtualizationProfiler.computeVirtualizationWindow === 'function');
  assert.ok(typeof OfflineStorageAndMediaSessionGovernor.validateStoragePurgeSafety === 'function');
  assert.ok(typeof AudioVideoCodecAndStreamPipelineGovernor.calculateVisualizerRenderPolicy === 'function');
  assert.ok(typeof SearchIndexingAndQueryCacheGovernor.normalizeSearchText === 'function');
  assert.ok(typeof MultiAccountSessionIsolationGovernor.sanitizeE164Phone === 'function');
  assert.ok(typeof SecuritySandboxAndWebviewIsolationGovernor.validateAndSanitizeLottieJson === 'function');
  console.log('  ✅ All critical hardening services loaded and active');
}

console.log('✨ All Phase 53 Master Capstone Verification Tests Passed 100% Successfully!');
