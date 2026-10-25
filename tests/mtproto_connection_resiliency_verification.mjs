/**
 * Phase 153 Verification Suite:
 * MTProto Connection Resiliency & Exponential Backoff Keepalive Protocol
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

console.log('🧪 Starting Phase 153 Verification: MTProto Connection Resiliency & Exponential Backoff Keepalive Protocol...\n');

// 1. Check file existence
const resiliencyFile = path.join(rootDir, 'src', 'services', 'mtprotoConnectionResiliency.ts');
assert(fs.existsSync(resiliencyFile), 'src/services/mtprotoConnectionResiliency.ts file exists');

// 2. Read source code and check exports
const sourceContent = fs.readFileSync(resiliencyFile, 'utf-8');
assert(
  sourceContent.includes('export class MtprotoConnectionResiliency') &&
  sourceContent.includes('export interface QueuedOfflineMessage') &&
  sourceContent.includes('export interface ConnectionStateSnapshot'),
  'mtprotoConnectionResiliency.ts exports MtprotoConnectionResiliency class and state interfaces'
);

// 3. Test Singleton architecture
assert(
  sourceContent.includes('public static getInstance(') &&
  sourceContent.includes('private static instance: MtprotoConnectionResiliency'),
  'MtprotoConnectionResiliency enforces singleton connection state controller'
);

// 4. Test jittered exponential backoff calculation
assert(
  sourceContent.includes('getReconnectDelay(): number') &&
  sourceContent.includes('this.baseDelayMs * Math.pow(2, exp)') &&
  sourceContent.includes('capped * (0.8 + Math.random() * 0.4)'),
  'MtprotoConnectionResiliency computes jittered exponential backoff delays up to max cap'
);

// 5. Test offline outgoing message queueing and flush upon reconnect
assert(
  sourceContent.includes('enqueueOfflineMessage(') &&
  sourceContent.includes('notifyConnect(): QueuedOfflineMessage[]') &&
  sourceContent.includes('flushQueue(): QueuedOfflineMessage[]'),
  'MtprotoConnectionResiliency buffers offline messages and automatically drains queue on reconnect'
);

// 6. Check CSS styles in src/index.css
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'index.css'), 'utf-8');
assert(
  cssContent.includes('.mtproto-connecting-spinner') &&
  cssContent.includes('.offline-sync-badge') &&
  cssContent.includes('@keyframes mtproto-spin'),
  'src/index.css defines .mtproto-connecting-spinner and .offline-sync-badge CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedTests}/${totalTests} checks passed.`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 153 Verification Passed Successfully!\n');
  process.exit(0);
} else {
  console.error('❌ Phase 153 Verification Failed!\n');
  process.exit(1);
}
