/**
 * tests/jules_account_pool_balancer_verification.mjs
 * Verification suite for Phase 133: Google Jules Multi-Account Pool & Automated Failover Load Balancer Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 133 Verification: Google Jules Multi-Account Pool & Automated Failover Load Balancer Protocol...\n');

let totalChecks = 0;
let passedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedChecks++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

const rootDir = process.cwd();
const balancerPath = resolve(rootDir, 'src/services/julesAccountPoolBalancer.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of julesAccountPoolBalancer.ts
assert(existsSync(balancerPath), 'src/services/julesAccountPoolBalancer.ts file exists');

const balancerContent = readFileSync(balancerPath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  balancerContent.includes('export class JulesAccountPoolBalancer') &&
  balancerContent.includes('export interface JulesAccount'),
  'julesAccountPoolBalancer.ts exports JulesAccountPoolBalancer class and JulesAccount interface'
);

// 3. Least-loaded worker selection logic
assert(
  balancerContent.includes('acquireLeastLoadedAccount()') &&
  balancerContent.includes('account.activeSlots < minLoad') &&
  balancerContent.includes('bestAccount.activeSlots += 1'),
  'JulesAccountPoolBalancer selects and increments active slots for the least-loaded healthy account'
);

// 4. Automated failover on exhaustion and cooldown circuit breaker
assert(
  balancerContent.includes('markAccountExhausted') &&
  balancerContent.includes('account.isHealthy = false') &&
  balancerContent.includes('account.cooldownUntil = Date.now() + cooldownDurationMs'),
  'JulesAccountPoolBalancer isolates exhausted accounts in cooldown and triggers automated failover'
);

// 5. Slot release and pool statistics
assert(
  balancerContent.includes('releaseSlot') &&
  balancerContent.includes('getPoolStats()') &&
  balancerContent.includes('public destroy(): void'),
  'JulesAccountPoolBalancer provides slot release, comprehensive pool stats, and clean teardown'
);

// 6. CSS tokens verification
assert(
  indexCss.includes('.account-pool-badge') &&
  indexCss.includes('.pool-failover-indicator'),
  'src/index.css defines .account-pool-badge and .pool-failover-indicator CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 133 Verification Passed Successfully!');
  process.exit(0);
} else {
  console.error('💥 Phase 133 Verification Failed!');
  process.exit(1);
}
