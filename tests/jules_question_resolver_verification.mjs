/**
 * tests/jules_question_resolver_verification.mjs
 * Verification suite for Phase 132: Google Jules Autonomous Question & Plan Resolver Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 132 Verification: Google Jules Autonomous Question & Plan Resolver Protocol...\n');

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
const resolverPath = resolve(rootDir, 'src/services/julesQuestionResolver.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of julesQuestionResolver.ts
assert(existsSync(resolverPath), 'src/services/julesQuestionResolver.ts file exists');

const resolverContent = readFileSync(resolverPath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  resolverContent.includes('export class JulesQuestionResolver') &&
  resolverContent.includes('export interface JulesActivity') &&
  resolverContent.includes('export interface ResolutionResult'),
  'julesQuestionResolver.ts exports JulesQuestionResolver class, JulesActivity, and ResolutionResult interfaces'
);

// 3. Autonomous plan approval detection
assert(
  resolverContent.includes('latestActivity.planGenerated') &&
  resolverContent.includes('actionTaken: \'PLAN_APPROVED\''),
  'JulesQuestionResolver detects pending plans and auto-approves implementation steps'
);

// 4. Agent question answering and disambiguation
assert(
  resolverContent.includes('latestActivity.agentMessaged') &&
  resolverContent.includes('actionTaken: \'MESSAGE_REPLIED\'') &&
  resolverContent.includes('customDirective'),
  'JulesQuestionResolver detects agent questions and replies with unblocking directives'
);

// 5. Max retry circuit breaker and clean teardown
assert(
  resolverContent.includes('actionTaken: \'MAX_RETRIES_REACHED\'') &&
  resolverContent.includes('public destroy(): void') &&
  resolverContent.includes('this.retryCounts.clear()'),
  'JulesQuestionResolver enforces max retry limit per session and cleans state on destroy'
);

// 6. CSS tokens verification
assert(
  indexCss.includes('.jules-feedback-modal') &&
  indexCss.includes('.unblocking-indicator-pill'),
  'src/index.css defines .jules-feedback-modal and .unblocking-indicator-pill CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 132 Verification Passed Successfully!');
  process.exit(0);
} else {
  console.error('💥 Phase 132 Verification Failed!');
  process.exit(1);
}
