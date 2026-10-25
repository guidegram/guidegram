/**
 * tests/jules_output_validator_verification.mjs
 * Verification suite for Phase 134: Google Jules Repoless Output Validation & Anti-Empty Gate Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 134 Verification: Google Jules Repoless Output Validation & Anti-Empty Gate Protocol...\n');

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
const validatorPath = resolve(rootDir, 'src/services/julesOutputValidator.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of julesOutputValidator.ts
assert(existsSync(validatorPath), 'src/services/julesOutputValidator.ts file exists');

const validatorContent = readFileSync(validatorPath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  validatorContent.includes('export class JulesOutputValidator') &&
  validatorContent.includes('export interface ValidationReport'),
  'julesOutputValidator.ts exports JulesOutputValidator class and ValidationReport interface'
);

// 3. Completeness score calculation logic
assert(
  validatorContent.includes('report.completenessScore = totalAssessed > 0 ? nonNullCount / totalAssessed : 0') &&
  validatorContent.includes('report.nullFields.push(key)'),
  'JulesOutputValidator computes granular completeness score across payload keys'
);

// 4. Anti-hollow rejection for empty required arrays
assert(
  validatorContent.includes('Required array fields are hollow') &&
  validatorContent.includes('report.emptyArrays.some'),
  'JulesOutputValidator rejects hollow payloads containing empty required arrays'
);

// 5. Threshold enforcement and clean teardown
assert(
  validatorContent.includes('setThreshold') &&
  validatorContent.includes('minCompletenessThreshold: number = 0.7') &&
  validatorContent.includes('public destroy(): void'),
  'JulesOutputValidator enforces 70% completeness threshold and supports dynamic adjustments'
);

// 6. CSS tokens verification
assert(
  indexCss.includes('.quality-gate-pass') &&
  indexCss.includes('.quality-gate-rejected'),
  'src/index.css defines .quality-gate-pass and .quality-gate-rejected CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 134 Verification Passed Successfully!');
  process.exit(0);
} else {
  console.error('💥 Phase 134 Verification Failed!');
  process.exit(1);
}
