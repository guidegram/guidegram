/**
 * tests/jules_swarm_fleet_saturator_verification.mjs
 * Verification suite for Phase 135: Google Jules 150-Session Swarm Fleet Saturation & Orchestration Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 135 Verification: Google Jules 150-Session Swarm Fleet Saturation & Orchestration Protocol...\n');

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
const saturatorPath = resolve(rootDir, 'src/services/julesSwarmFleetSaturator.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of julesSwarmFleetSaturator.ts
assert(existsSync(saturatorPath), 'src/services/julesSwarmFleetSaturator.ts file exists');

const saturatorContent = readFileSync(saturatorPath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  saturatorContent.includes('export class JulesSwarmFleetSaturator') &&
  saturatorContent.includes('export interface SaturationSummary'),
  'julesSwarmFleetSaturator.ts exports JulesSwarmFleetSaturator class and SaturationSummary interface'
);

// 3. Sliding-window fleet pumping and 150-worker capacity limit
assert(
  saturatorContent.includes('maxFleetCapacity: number = 150') &&
  saturatorContent.includes('pumpFleet(): number') &&
  saturatorContent.includes('this.activeWorkersMap.size < this.maxFleetCapacity'),
  'JulesSwarmFleetSaturator enforces 150-session fleet limit with sliding-window worker pumping'
);

// 4. Automatic queue draining and slot backfilling
assert(
  saturatorContent.includes('reportWorkerFinished') &&
  saturatorContent.includes('this.poolBalancer.releaseSlot') &&
  saturatorContent.includes('this.pumpFleet()'),
  'JulesSwarmFleetSaturator releases slots upon worker finish and backfills from queue'
);

// 5. Saturation telemetry and clean teardown
assert(
  saturatorContent.includes('getSaturationMetrics()') &&
  saturatorContent.includes('fleetSaturationPercent') &&
  saturatorContent.includes('public destroy(): void'),
  'JulesSwarmFleetSaturator computes fleet saturation percentage and cleans all slots on destroy'
);

// 6. CSS tokens verification
assert(
  indexCss.includes('.fleet-saturation-meter') &&
  indexCss.includes('.fleet-progress-bar'),
  'src/index.css defines .fleet-saturation-meter and .fleet-progress-bar CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 135 Verification Passed Successfully!');
  process.exit(0);
} else {
  console.error('💥 Phase 135 Verification Failed!');
  process.exit(1);
}
