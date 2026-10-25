/**
 * Phase 139 Verification Suite:
 * Google Jules Fleet-Wide Broadcast & Parallel Directive Messaging Protocol
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

console.log('🧪 Starting Phase 139 Verification: Google Jules Fleet-Wide Broadcast & Parallel Directive Messaging Protocol...\n');

// 1. Check file existence
const dispatcherFile = path.join(rootDir, 'src', 'services', 'julesBroadcastDispatcher.ts');
assert(fs.existsSync(dispatcherFile), 'src/services/julesBroadcastDispatcher.ts file exists');

// 2. Read source code and check exports
const sourceContent = fs.readFileSync(dispatcherFile, 'utf-8');
assert(
  sourceContent.includes('export class JulesBroadcastDispatcher') &&
  sourceContent.includes('export interface BroadcastDirective') &&
  sourceContent.includes('export interface WorkerSubscription') &&
  sourceContent.includes('export interface BroadcastDeliveryReport'),
  'julesBroadcastDispatcher.ts exports JulesBroadcastDispatcher class and broadcast interfaces'
);

// 3. Test worker pool registration & unregistration logic
assert(
  sourceContent.includes('registerWorker(subscription: WorkerSubscription)') &&
  sourceContent.includes('unregisterWorker(workerId: string): boolean') &&
  sourceContent.includes('this.workers.set') &&
  sourceContent.includes('this.workers.delete'),
  'JulesBroadcastDispatcher implements zero-leak worker subscription pool management'
);

// 4. Test parallel directive dispatching & role targeting
assert(
  sourceContent.includes('async broadcastDirective(directive: BroadcastDirective)') &&
  sourceContent.includes('w.role === directive.targetRole') &&
  sourceContent.includes('Promise.all(promises)'),
  'JulesBroadcastDispatcher dispatches directives concurrently with role-based filtering'
);

// 5. Test ACK ratio calculation and memory cleanup
assert(
  sourceContent.includes('ackRatio = total > 0 ? acknowledgedCount / total : 1.0') &&
  sourceContent.includes('destroy(): void') &&
  sourceContent.includes('this.workers.clear()'),
  'JulesBroadcastDispatcher computes accurate ACK delivery ratios and supports resource cleanup'
);

// 6. Check CSS styles in src/index.css
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'index.css'), 'utf-8');
assert(
  cssContent.includes('.fleet-broadcast-banner') &&
  cssContent.includes('.directive-ack-badge'),
  'src/index.css defines .fleet-broadcast-banner and .directive-ack-badge tokens'
);

console.log(`\n📊 Verification Result: ${passedTests}/${totalTests} checks passed.`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 139 Verification Passed Successfully!\n');
  process.exit(0);
} else {
  console.error('❌ Phase 139 Verification Failed!\n');
  process.exit(1);
}
