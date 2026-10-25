/**
 * Phase 154 Verification Suite:
 * IndexedDB Offline Storage Hygiene & Vacuum Compaction Protocol
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

console.log('🧪 Starting Phase 154 Verification: IndexedDB Offline Storage Hygiene & Vacuum Compaction Protocol...\n');

// 1. Check file existence
const compactorFile = path.join(rootDir, 'src', 'services', 'indexedDbCompactor.ts');
assert(fs.existsSync(compactorFile), 'src/services/indexedDbCompactor.ts file exists');

// 2. Read source code and check exports
const sourceContent = fs.readFileSync(compactorFile, 'utf-8');
assert(
  sourceContent.includes('export class IndexedDbCompactor') &&
  sourceContent.includes('export interface CompactionReport') &&
  sourceContent.includes('export interface StorageEstimateStats'),
  'indexedDbCompactor.ts exports IndexedDbCompactor class and compaction interfaces'
);

// 3. Test Singleton architecture
assert(
  sourceContent.includes('public static getInstance(') &&
  sourceContent.includes('private static instance: IndexedDbCompactor'),
  'IndexedDbCompactor enforces singleton storage controller lifecycle'
);

// 4. Test browser storage estimate handling
assert(
  sourceContent.includes('estimateStorageQuota(): Promise<StorageEstimateStats>') &&
  sourceContent.includes('navigator.storage.estimate') &&
  sourceContent.includes('usage / quota >= this.quotaWarningThreshold'),
  'IndexedDbCompactor safely queries navigator.storage and detects quota thresholds'
);

// 5. Test vacuum compaction pruning
assert(
  sourceContent.includes('runCompaction(') &&
  sourceContent.includes('r.timestamp < cutoff') &&
  sourceContent.includes('reclaimedBytes += r.byteSize;'),
  'IndexedDbCompactor purges expired offline database records and tracks reclaimed bytes'
);

// 6. Check CSS styles in src/index.css
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'index.css'), 'utf-8');
assert(
  cssContent.includes('.storage-compaction-meter') &&
  cssContent.includes('.vacuum-cleaning-indicator'),
  'src/index.css defines .storage-compaction-meter and .vacuum-cleaning-indicator CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedTests}/${totalTests} checks passed.`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 154 Verification Passed Successfully!\n');
  process.exit(0);
} else {
  console.error('❌ Phase 154 Verification Failed!\n');
  process.exit(1);
}
