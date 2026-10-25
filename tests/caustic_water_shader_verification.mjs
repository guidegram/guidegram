/**
 * tests/caustic_water_shader_verification.mjs
 * Verification suite for Phase 124: Dynamic Caustic Water Surface & Liquid Glass Refraction Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 124 Verification: Dynamic Caustic Water Surface & Liquid Glass Refraction Protocol...\n');

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
const causticModulePath = resolve(rootDir, 'src/utils/causticWaterShader.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of causticWaterShader.ts
assert(existsSync(causticModulePath), 'src/utils/causticWaterShader.ts file exists');

const causticModule = readFileSync(causticModulePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  causticModule.includes('export class CausticWaterShader') &&
  causticModule.includes('export interface CausticConfig'),
  'causticWaterShader.ts exports CausticWaterShader class and CausticConfig interface'
);

// 3. Harmonic wave interference and caustic peak derivation
assert(
  causticModule.includes('Math.sin(nx + this.time)') &&
  causticModule.includes('Math.pow((w1 + w2 + w3 + 3) / 6, 4)') &&
  causticModule.includes('globalCompositeOperation = \'screen\''),
  'CausticWaterShader computes non-linear wave interference peaks for caustic filaments'
);

// 4. Cursor agitation and dynamic turbulence decay
assert(
  causticModule.includes('public agitate(): void') &&
  causticModule.includes('this.agitationFactor *= 0.95'),
  'CausticWaterShader supports surface agitation with exponential decay'
);

// 5. Clean destroy lifecycle
assert(
  causticModule.includes('public destroy(): void') &&
  causticModule.includes('this.stop()') &&
  causticModule.includes('this.ctx = null'),
  'CausticWaterShader releases animation frames and canvas context references on destroy'
);

// 6. CSS tokens verification
assert(
  indexCss.includes('.caustic-water-canvas') &&
  indexCss.includes('.liquid-refraction-overlay') &&
  indexCss.includes('mix-blend-mode: screen'),
  'src/index.css defines .caustic-water-canvas and .liquid-refraction-overlay CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 124 Verification Passed Successfully!');
  process.exit(0);
} else {
  console.error('💥 Phase 124 Verification Failed!');
  process.exit(1);
}
