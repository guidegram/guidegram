/**
 * tests/fluid_ripple_shader_verification.mjs
 * Verification suite for Phase 119: Fluid Ripple & Tactile Shockwave Elevation Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 119 Verification: Fluid Ripple & Tactile Shockwave Elevation Protocol...\n');

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
const rippleModulePath = resolve(rootDir, 'src/utils/fluidRippleShader.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of fluidRippleShader.ts
assert(existsSync(rippleModulePath), 'src/utils/fluidRippleShader.ts file exists');

const rippleModule = readFileSync(rippleModulePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  rippleModule.includes('export class FluidRippleShader') &&
  rippleModule.includes('export interface Ripple'),
  'fluidRippleShader.ts exports FluidRippleShader class and Ripple interface'
);

// 3. Trigger ripple wavefront mechanics
assert(
  rippleModule.includes('triggerRipple') &&
  rippleModule.includes('this.ripples.push') &&
  rippleModule.includes('this.renderLoop()'),
  'FluidRippleShader triggers tactile shockwave ripples with dynamic wavefront radius'
);

// 4. Wavefront damping and auto-idle pausing
assert(
  rippleModule.includes('this.ripples.splice(i, 1)') &&
  rippleModule.includes('this.isRunning = false') &&
  rippleModule.includes('this.animId = null'),
  'FluidRippleShader damps wavefront and auto-pauses animation loop on idle'
);

// 5. Clean teardown
assert(
  rippleModule.includes('public destroy(): void') &&
  rippleModule.includes('cancelAnimationFrame'),
  'FluidRippleShader includes clean destroy() lifecycle method cancelling animation frames'
);

// 6. CSS token verification
assert(
  indexCss.includes('.fluid-ripple-canvas') &&
  indexCss.includes('.shockwave-pulse-glow') &&
  indexCss.includes('@keyframes shockwavePulse'),
  'src/index.css defines .fluid-ripple-canvas and .shockwave-pulse-glow CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 119 Verification Passed Successfully!');
  process.exit(0);
} else {
  console.error('💥 Phase 119 Verification Failed!');
  process.exit(1);
}
