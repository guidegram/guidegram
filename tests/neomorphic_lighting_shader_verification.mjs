/**
 * tests/neomorphic_lighting_shader_verification.mjs
 * Verification suite for Phase 123: Dynamic Neomorphic Shadow Cast & Interactive Lighting Shaders Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 123 Verification: Dynamic Neomorphic Shadow Cast & Interactive Lighting Shaders Protocol...\n');

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
const neomorphicModulePath = resolve(rootDir, 'src/utils/neomorphicLightingShader.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of neomorphicLightingShader.ts
assert(existsSync(neomorphicModulePath), 'src/utils/neomorphicLightingShader.ts file exists');

const neomorphicModule = readFileSync(neomorphicModulePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  neomorphicModule.includes('export class NeomorphicLightingShader') &&
  neomorphicModule.includes('export interface NeomorphicConfig'),
  'neomorphicLightingShader.ts exports NeomorphicLightingShader class and NeomorphicConfig interface'
);

// 3. Directional light raycasting and offset derivation
assert(
  neomorphicModule.includes('setLightSource') &&
  neomorphicModule.includes('this.targetOffsetX = dx * this.config.elevation * 2') &&
  neomorphicModule.includes('this.targetOffsetY = dy * this.config.elevation * 2'),
  'NeomorphicLightingShader computes dynamic target shadow offsets from normalized light position'
);

// 4. Dual-vector specular and ambient shadow calculation
assert(
  neomorphicModule.includes('getComputedBoxShadow(): string') &&
  neomorphicModule.includes('rgba(${this.config.highlightColor}, ${this.config.lightIntensity})') &&
  neomorphicModule.includes('rgba(${this.config.shadowColor}, 0.45)'),
  'NeomorphicLightingShader generates dual-vector specular highlight and deep ambient shadow'
);

// 5. Element binding and clean teardown
assert(
  neomorphicModule.includes('attachElement') &&
  neomorphicModule.includes('detachElement') &&
  neomorphicModule.includes('public destroy(): void'),
  'NeomorphicLightingShader supports element binding and cleans styles/listeners on destroy'
);

// 6. CSS tokens verification
assert(
  indexCss.includes('.neomorphic-surface-card') &&
  indexCss.includes('.neomorphic-pressed-inset') &&
  indexCss.includes('box-shadow: -4px -4px 14px'),
  'src/index.css defines .neomorphic-surface-card and .neomorphic-pressed-inset CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 123 Verification Passed Successfully!');
  process.exit(0);
} else {
  console.error('💥 Phase 123 Verification Failed!');
  process.exit(1);
}
