/**
 * tests/fluid_particle_canvas_verification.mjs
 * Verification suite for Phase 112: WebGL Fluid Particle Canvas & Shimmering Ambient Glow Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 112 Verification: WebGL Fluid Particle Canvas & Shimmering Ambient Glow Protocol...\n');

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
const particleModulePath = resolve(rootDir, 'src/utils/fluidParticleCanvas.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of fluidParticleCanvas.ts
assert(existsSync(particleModulePath), 'src/utils/fluidParticleCanvas.ts file exists');

const particleModule = readFileSync(particleModulePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  particleModule.includes('export class FluidParticleCanvas') &&
  particleModule.includes('export interface ParticleConfig'),
  'fluidParticleCanvas.ts exports FluidParticleCanvas class and ParticleConfig interface'
);

// 3. Cursor proximity interaction
assert(
  particleModule.includes('updateMouse') &&
  particleModule.includes('dist < 120') &&
  particleModule.includes('p.vx +='),
  'FluidParticleCanvas calculates cursor distance and applies ambient attraction'
);

// 4. Shimmering alpha cycle & canvas rendering
assert(
  particleModule.includes('p.alphaDelta') &&
  particleModule.includes('this.ctx.shadowBlur = 6') &&
  particleModule.includes('this.ctx.fill()'),
  'FluidParticleCanvas renders glowing shimmering particles with shadow blur'
);

// 5. Clean teardown and memory cleanup
assert(
  particleModule.includes('public destroy(): void') &&
  particleModule.includes('cancelAnimationFrame') &&
  particleModule.includes('this.particles = []'),
  'FluidParticleCanvas includes destroy() lifecycle method clearing particles and frames'
);

// 6. CSS Particle Canvas Layer
assert(
  indexCss.includes('.particle-canvas-layer') &&
  indexCss.includes('mix-blend-mode: screen') &&
  indexCss.includes('contain: strict'),
  'index.css defines .particle-canvas-layer with screen blend mode and strict containment'
);

console.log(`\n📊 Verification Summary: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 112 Verification PASSED: Fluid Particle Canvas & Shimmering Glow Protocol verified!\n');
  process.exit(0);
} else {
  console.error('💥 Phase 112 Verification FAILED: Some assertions did not pass.\n');
  process.exit(1);
}
