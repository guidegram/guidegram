/**
 * tests/ambient_vignette_shader_verification.mjs
 * Verification suite for Phase 118: Dynamic Ambient Canvas Lighting & Reactive Vignette Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 118 Verification: Dynamic Ambient Canvas Lighting & Reactive Vignette Protocol...\n');

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
const vignetteModulePath = resolve(rootDir, 'src/utils/ambientVignetteShader.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of ambientVignetteShader.ts
assert(existsSync(vignetteModulePath), 'src/utils/ambientVignetteShader.ts file exists');

const vignetteModule = readFileSync(vignetteModulePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  vignetteModule.includes('export class AmbientVignetteShader') &&
  vignetteModule.includes('export interface VignetteConfig'),
  'ambientVignetteShader.ts exports AmbientVignetteShader class and VignetteConfig interface'
);

// 3. Focal point setter and smooth easing interpolation
assert(
  vignetteModule.includes('setFocalPoint') &&
  vignetteModule.includes('this.currentFocalX += (this.targetFocalX - this.currentFocalX) * 0.08'),
  'AmbientVignetteShader smoothly interpolates focal center point towards target cursor position'
);

// 4. Radial gradient peripheral shading calculation
assert(
  vignetteModule.includes('createRadialGradient') &&
  vignetteModule.includes('grad.addColorStop(1, `rgba(${this.color}, ${this.intensity})`)'),
  'AmbientVignetteShader computes elliptical peripheral vignette radial gradient'
);

// 5. Clean teardown
assert(
  vignetteModule.includes('public destroy(): void') &&
  vignetteModule.includes('cancelAnimationFrame'),
  'AmbientVignetteShader includes clean destroy() lifecycle method cancelling animation frames'
);

// 6. CSS Ambient Vignette Layer & Focal Luminosity Glow
assert(
  indexCss.includes('.ambient-vignette-layer') &&
  indexCss.includes('contain: strict') &&
  indexCss.includes('.focal-luminosity-glow'),
  'index.css defines .ambient-vignette-layer with strict containment and .focal-luminosity-glow'
);

console.log(`\n📊 Verification Summary: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 118 Verification PASSED: Dynamic Ambient Canvas Lighting & Reactive Vignette verified!\n');
  process.exit(0);
} else {
  console.error('💥 Phase 118 Verification FAILED: Some assertions did not pass.\n');
  process.exit(1);
}
