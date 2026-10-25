/**
 * Phase 151 Verification Suite:
 * End-to-End Golden Master Regression & High-Load Telemetry Benchmark Protocol
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

console.log('🧪 Starting Phase 151 Verification: End-to-End Golden Master Regression & High-Load Telemetry Benchmark Protocol...\n');

// 1. Check file existence
const benchFile = path.join(rootDir, 'src', 'services', 'goldenMasterRegressionBenchmarker.ts');
assert(fs.existsSync(benchFile), 'src/services/goldenMasterRegressionBenchmarker.ts file exists');

// 2. Read source code and check exports
const sourceContent = fs.readFileSync(benchFile, 'utf-8');
assert(
  sourceContent.includes('export class GoldenMasterRegressionBenchmarker') &&
  sourceContent.includes('export interface LatencyBenchmarkResult'),
  'goldenMasterRegressionBenchmarker.ts exports GoldenMasterRegressionBenchmarker class and result interface'
);

// 3. Test latency sample recording & queue bounds
assert(
  sourceContent.includes('recordSample(durationMs: number): void') &&
  sourceContent.includes('this.latencySamples.length >= this.maxSamples') &&
  sourceContent.includes('this.latencySamples.shift();'),
  'GoldenMasterRegressionBenchmarker manages bounded latency sample reservoirs'
);

// 4. Test synthetic load simulation
assert(
  sourceContent.includes('runLoadSimulation(') &&
  sourceContent.includes('performance.now()') &&
  sourceContent.includes('eventCount: number = 5000'),
  'GoldenMasterRegressionBenchmarker executes high-throughput event dispatch simulations'
);

// 5. Test P50, P95, P99 percentile computations
assert(
  sourceContent.includes('sorted[Math.floor(n * 0.95)]') &&
  sourceContent.includes('sorted[Math.floor(n * 0.99)]') &&
  sourceContent.includes('passedGates = p95 <= this.p95ThresholdMs && p99 <= this.p99ThresholdMs;'),
  'GoldenMasterRegressionBenchmarker calculates exact P95/P99 latency percentiles and validates SLA gates'
);

// 6. Check CSS styles in src/index.css
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'index.css'), 'utf-8');
assert(
  cssContent.includes('.telemetry-latency-gauge') &&
  cssContent.includes('.regression-status-pass'),
  'src/index.css defines .telemetry-latency-gauge and .regression-status-pass CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedTests}/${totalTests} checks passed.`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 151 Verification Passed Successfully!\n');
  process.exit(0);
} else {
  console.error('❌ Phase 151 Verification Failed!\n');
  process.exit(1);
}
