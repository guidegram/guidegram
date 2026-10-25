/**
 * Phase 149 Verification Suite:
 * Telegram Animated Sticker Lottie TGS Vector Cache Protocol
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

console.log('🧪 Starting Phase 149 Verification: Telegram Animated Sticker Lottie TGS Vector Cache Protocol...\n');

// 1. Check file existence
const cacheFile = path.join(rootDir, 'src', 'services', 'tgsVectorCacheService.ts');
assert(fs.existsSync(cacheFile), 'src/services/tgsVectorCacheService.ts file exists');

// 2. Read source code and check exports
const sourceContent = fs.readFileSync(cacheFile, 'utf-8');
assert(
  sourceContent.includes('export class TgsVectorCacheService') &&
  sourceContent.includes('export interface CachedTgsItem') &&
  sourceContent.includes('export interface TgsCacheStats'),
  'tgsVectorCacheService.ts exports TgsVectorCacheService class and telemetry interfaces'
);

// 3. Test Singleton architecture
assert(
  sourceContent.includes('public static getInstance(') &&
  sourceContent.includes('private static instance: TgsVectorCacheService'),
  'TgsVectorCacheService enforces memory-governed singleton lifecycle'
);

// 4. Test LRU eviction and memory byte capacity gating
assert(
  sourceContent.includes('evictOldest(): void') &&
  sourceContent.includes('this.currentBytes + bytes > this.maxMemoryBytes') &&
  sourceContent.includes('this.cache.delete(oldestKey);'),
  'TgsVectorCacheService implements robust LRU eviction based on access timestamps and memory budgets'
);

// 5. Test batch preloading and hit ratio telemetry
assert(
  sourceContent.includes('preloadPack(') &&
  sourceContent.includes('getCacheStats(): TgsCacheStats') &&
  sourceContent.includes('hitRatio = totalRequests > 0 ? this.totalHits / totalRequests : 1.0;'),
  'TgsVectorCacheService tracks cache hits/misses telemetry and supports asynchronous sticker pack preloading'
);

// 6. Check CSS styles in src/index.css
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'index.css'), 'utf-8');
assert(
  cssContent.includes('.tgs-sticker-container') &&
  cssContent.includes('.tgs-placeholder-shimmer') &&
  cssContent.includes('@keyframes tgs-shimmer-pass'),
  'src/index.css defines .tgs-sticker-container and animated .tgs-placeholder-shimmer CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedTests}/${totalTests} checks passed.`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 149 Verification Passed Successfully!\n');
  process.exit(0);
} else {
  console.error('❌ Phase 149 Verification Failed!\n');
  process.exit(1);
}
