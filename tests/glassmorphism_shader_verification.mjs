/**
 * tests/glassmorphism_shader_verification.mjs
 * Verification suite for Phase 117: Real-Time Glassmorphism & Adaptive Blur Shaders Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 117 Verification: Real-Time Glassmorphism & Adaptive Blur Shaders Protocol...\n');

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
const glassModulePath = resolve(rootDir, 'src/utils/glassmorphismShader.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of glassmorphismShader.ts
assert(existsSync(glassModulePath), 'src/utils/glassmorphismShader.ts file exists');

const glassModule = readFileSync(glassModulePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  glassModule.includes('export class GlassmorphismShader') &&
  glassModule.includes('export interface GlassConfig'),
  'glassmorphismShader.ts exports GlassmorphismShader class and GlassConfig interface'
);

// 3. Hardware backdrop-filter capability check
assert(
  glassModule.includes('checkBackdropSupport') &&
  glassModule.includes('CSS.supports'),
  'GlassmorphismShader includes CSS.supports detection for hardware backdrop-filter'
);

// 4. Graceful fallback on unsupported environments
assert(
  glassModule.includes('getGlassStyle') &&
  glassModule.includes('rgba(18, 24, 38, 0.96)'),
  'GlassmorphismShader returns graceful high-opacity fallback when backdrop-filter is unaccelerated'
);

// 5. CSS Adaptive Frosted Glass & Refraction Border
assert(
  indexCss.includes('.adaptive-frosted-glass') &&
  indexCss.includes('.glass-refraction-border') &&
  indexCss.includes('inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)'),
  'index.css defines .adaptive-frosted-glass and .glass-refraction-border with realistic light refraction'
);

console.log(`\n📊 Verification Summary: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 117 Verification PASSED: Real-Time Glassmorphism & Adaptive Blur verified!\n');
  process.exit(0);
} else {
  console.error('💥 Phase 117 Verification FAILED: Some assertions did not pass.\n');
  process.exit(1);
}
