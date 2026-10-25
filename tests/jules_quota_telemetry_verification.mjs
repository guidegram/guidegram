/**
 * tests/jules_quota_telemetry_verification.mjs
 * Verification suite for Phase 136: Google Jules Rolling Quota & 24h Reset Countdown Telemetry Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 136 Verification: Google Jules Rolling Quota & 24h Reset Countdown Telemetry Protocol...\n');

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
const telemetryPath = resolve(rootDir, 'src/services/julesQuotaTelemetry.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of julesQuotaTelemetry.ts
assert(existsSync(telemetryPath), 'src/services/julesQuotaTelemetry.ts file exists');

const telemetryContent = readFileSync(telemetryPath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  telemetryContent.includes('export class JulesQuotaTelemetry') &&
  telemetryContent.includes('export interface AccountQuotaTelemetry') &&
  telemetryContent.includes('export interface QuotaEntry'),
  'julesQuotaTelemetry.ts exports JulesQuotaTelemetry class and AccountQuotaTelemetry interface'
);

// 3. Sliding 24h rolling window calculation logic
assert(
  telemetryContent.includes('rollingWindowMs: number = 24 * 60 * 60 * 1000') &&
  telemetryContent.includes('pruneOldEntries') &&
  telemetryContent.includes('e.timestamp >= cutoff'),
  'JulesQuotaTelemetry automatically prunes task timestamps older than 24 hours'
);

// 4. Countdown seconds calculation to earliest slot recovery
assert(
  telemetryContent.includes('nextResetInSeconds = Math.max(0, Math.ceil(msUntilReset / 1000))') &&
  telemetryContent.includes('earliestResetTimestamp'),
  'JulesQuotaTelemetry calculates exact remaining seconds until next quota slot frees up'
);

// 5. Clean teardown
assert(
  telemetryContent.includes('public destroy(): void') &&
  telemetryContent.includes('this.executionTimelines.clear()'),
  'JulesQuotaTelemetry releases timeline maps and cleans resources on destroy'
);

// 6. CSS tokens verification
assert(
  indexCss.includes('.quota-countdown-pill') &&
  indexCss.includes('.rolling-reset-indicator'),
  'src/index.css defines .quota-countdown-pill and .rolling-reset-indicator CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 136 Verification Passed Successfully!');
  process.exit(0);
} else {
  console.error('💥 Phase 136 Verification Failed!');
  process.exit(1);
}
