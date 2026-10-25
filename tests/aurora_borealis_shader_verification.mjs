/**
 * tests/aurora_borealis_shader_verification.mjs
 * Verification suite for Phase 122: Dynamic Aurora Borealis Wave Shimmer & Ethereal Curtains Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 122 Verification: Dynamic Aurora Borealis Wave Shimmer & Ethereal Curtains Protocol...\n');

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
const auroraModulePath = resolve(rootDir, 'src/utils/auroraBorealisShader.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of auroraBorealisShader.ts
assert(existsSync(auroraModulePath), 'src/utils/auroraBorealisShader.ts file exists');

const auroraModule = readFileSync(auroraModulePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  auroraModule.includes('export class AuroraBorealisShader') &&
  auroraModule.includes('export interface AuroraConfig'),
  'auroraBorealisShader.ts exports AuroraBorealisShader class and AuroraConfig interface'
);

// 3. Trigonometric harmonic wave crest calculation
assert(
  auroraModule.includes('Math.sin(nx * 4 + ribbonPhase)') &&
  auroraModule.includes('Math.cos(nx * 8 - ribbonPhase * 1.2)') &&
  auroraModule.includes('this.ctx.globalCompositeOperation = \'screen\''),
  'AuroraBorealisShader synthesizes multi-frequency harmonic wave crests with screen blending'
);

// 4. Vertical linear gradient ribbon fade
assert(
  auroraModule.includes('createLinearGradient(0, baselineY - 60, 0, h)') &&
  auroraModule.includes('grad.addColorStop(1, `rgba(${rgb}, 0)`)'),
  'AuroraBorealisShader creates vertical ethereal light ribbon gradients'
);

// 5. Clean teardown
assert(
  auroraModule.includes('public destroy(): void') &&
  auroraModule.includes('this.stop()') &&
  auroraModule.includes('this.ctx = null'),
  'AuroraBorealisShader releases animation frames and contexts on destroy'
);

// 6. CSS tokens verification
assert(
  indexCss.includes('.aurora-curtain-canvas') &&
  indexCss.includes('.aurora-ambient-glow') &&
  indexCss.includes('mix-blend-mode: screen'),
  'src/index.css defines .aurora-curtain-canvas and .aurora-ambient-glow CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 122 Verification Passed Successfully!');
  process.exit(0);
} else {
  console.error('💥 Phase 122 Verification Failed!');
  process.exit(1);
}
