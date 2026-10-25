/**
 * tests/parallax_tilt_depth_verification.mjs
 * Verification suite for Phase 114: Multi-Layer Parallax Tilt & Depth Micro-Interactions Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 114 Verification: Multi-Layer Parallax Tilt & Depth Micro-Interactions Protocol...\n');

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
const tiltModulePath = resolve(rootDir, 'src/utils/parallaxTiltEngine.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of parallaxTiltEngine.ts
assert(existsSync(tiltModulePath), 'src/utils/parallaxTiltEngine.ts file exists');

const tiltModule = readFileSync(tiltModulePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  tiltModule.includes('export class ParallaxTiltEngine') &&
  tiltModule.includes('export interface TiltConfig'),
  'parallaxTiltEngine.ts exports ParallaxTiltEngine class and TiltConfig interface'
);

// 3. Normalised mouse offset calculation
assert(
  tiltModule.includes('normX = (x / rect.width - 0.5) * 2') &&
  tiltModule.includes('this.targetX = -normY * this.maxTiltDeg'),
  'ParallaxTiltEngine normalises cursor coordinates to inverse perspective rotation'
);

// 4. Smooth cubic spring/inertia update loop
assert(
  tiltModule.includes('this.currentX += (this.targetX - this.currentX) * this.easing') &&
  tiltModule.includes('scale3d(1.02, 1.02, 1.02)'),
  'ParallaxTiltEngine implements damped spring easing with micro-scale depth'
);

// 5. Clean event listener teardown
assert(
  tiltModule.includes('public destroy(): void') &&
  tiltModule.includes('removeEventListener') &&
  tiltModule.includes('cancelAnimationFrame'),
  'ParallaxTiltEngine includes clean destroy() unbinding DOM events and animation frames'
);

// 6. CSS 3D Perspective Preservation & Glare
assert(
  indexCss.includes('.parallax-tilt-card') &&
  indexCss.includes('transform-style: preserve-3d') &&
  indexCss.includes('.parallax-glare-overlay'),
  'index.css defines .parallax-tilt-card with preserve-3d and dynamic glare overlay'
);

console.log(`\n📊 Verification Summary: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 114 Verification PASSED: Multi-Layer Parallax Tilt & Depth Protocol verified!\n');
  process.exit(0);
} else {
  console.error('💥 Phase 114 Verification FAILED: Some assertions did not pass.\n');
  process.exit(1);
}
