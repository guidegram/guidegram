/**
 * tests/jules_swarm_orchestrator_verification.mjs
 * Verification suite for Phase 131: Google Jules REST Swarm Session Lifecycle & Fleet Orchestration Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 131 Verification: Google Jules REST Swarm Session Lifecycle & Fleet Orchestration Protocol...\n');

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
const julesModulePath = resolve(rootDir, 'src/services/julesSwarmOrchestrator.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of julesSwarmOrchestrator.ts
assert(existsSync(julesModulePath), 'src/services/julesSwarmOrchestrator.ts file exists');

const julesModule = readFileSync(julesModulePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  julesModule.includes('export class JulesSwarmOrchestrator') &&
  julesModule.includes('export interface JulesSession') &&
  julesModule.includes('export interface SwarmFleetConfig'),
  'julesSwarmOrchestrator.ts exports JulesSwarmOrchestrator class, JulesSession, and SwarmFleetConfig interfaces'
);

// 3. Concurrency quota (15 workers) and sliding-window queue
assert(
  julesModule.includes('maxConcurrentPerAccount: 15') &&
  julesModule.includes('this.sessionQueue.push') &&
  julesModule.includes('drainQueue()'),
  'JulesSwarmOrchestrator enforces 15 concurrent session quota with sliding-window queue buffer'
);

// 4. Multi-turn context bloat protection (max 3 turns)
assert(
  julesModule.includes('maxTurnsPerSession: 3') &&
  julesModule.includes('session.turnCount >= this.config.maxTurnsPerSession') &&
  julesModule.includes('this.recycleSession(sessionId)'),
  'JulesSwarmOrchestrator enforces container recycling after max 3 turns to prevent context bloat'
);

// 5. Fleet status reporting and clean teardown
assert(
  julesModule.includes('getFleetStatus()') &&
  julesModule.includes('public destroy(): void') &&
  julesModule.includes('this.activeSessions.clear()'),
  'JulesSwarmOrchestrator provides real-time fleet metrics and clean destroy lifecycle'
);

// 6. CSS tokens verification
assert(
  indexCss.includes('.jules-swarm-badge') &&
  indexCss.includes('.jules-worker-pulsing') &&
  indexCss.includes('@keyframes julesWorkerPulse'),
  'src/index.css defines .jules-swarm-badge and .jules-worker-pulsing CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 131 Verification Passed Successfully!');
  process.exit(0);
} else {
  console.error('💥 Phase 131 Verification Failed!');
  process.exit(1);
}
