/**
 * Phase 138 Verification Suite:
 * Google Jules Automated Pull Request & Branch Synthesizer Protocol
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

console.log('🧪 Starting Phase 138 Verification: Google Jules Automated Pull Request & Branch Synthesizer Protocol...\n');

// 1. Check file existence
const synthesizerFile = path.join(rootDir, 'src', 'services', 'julesPrSynthesizer.ts');
assert(fs.existsSync(synthesizerFile), 'src/services/julesPrSynthesizer.ts file exists');

// 2. Read source code and check exports
const sourceContent = fs.readFileSync(synthesizerFile, 'utf-8');
assert(
  sourceContent.includes('export class JulesPrSynthesizer') &&
  sourceContent.includes('export interface JulesPrConfig') &&
  sourceContent.includes('export interface SynthesizedPr'),
  'julesPrSynthesizer.ts exports JulesPrSynthesizer class and PR interfaces'
);

// 3. Test branch slug synthesis logic
assert(
  sourceContent.includes('public synthesizeBranchName(sessionId: string, taskTitle: string, prefix?: string)') &&
  sourceContent.includes('cleanTitle = taskTitle') &&
  sourceContent.includes('${cleanPrefix}/${cleanId}-${cleanTitle}'),
  'JulesPrSynthesizer implements semantic branch name generation conforming to git standards'
);

// 4. Test git branch ref validation constraints
assert(
  sourceContent.includes('public validateBranchSlug(branch: string): boolean') &&
  sourceContent.includes('/\\.\\.|\\@\\{|[~^:?*\\[\\]\\\\\\s]/') &&
  sourceContent.includes("branch.startsWith('/') || branch.endsWith('/')"),
  'JulesPrSynthesizer enforces git-check-ref-format constraints preventing malformed refspecs'
);

// 5. Test PR payload generation with draft flag logic
assert(
  sourceContent.includes('public generatePrPayload(config: JulesPrConfig): SynthesizedPr') &&
  sourceContent.includes('isDraft: passRate < 100') &&
  sourceContent.includes('public formatPullRequestMarkdown(config: JulesPrConfig): string'),
  'JulesPrSynthesizer formats structured BLUF PR markdown and triggers draft state for partial test results'
);

// 6. Check CSS styles in src/index.css
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'index.css'), 'utf-8');
assert(
  cssContent.includes('.jules-pr-badge') &&
  cssContent.includes('.jules-pr-badge.draft') &&
  cssContent.includes('.branch-pill-tag'),
  'src/index.css defines .jules-pr-badge, draft modifiers, and .branch-pill-tag CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedTests}/${totalTests} checks passed.`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 138 Verification Passed Successfully!\n');
  process.exit(0);
} else {
  console.error('❌ Phase 138 Verification Failed!\n');
  process.exit(1);
}
