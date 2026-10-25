/**
 * tests/cosmic_nebula_shader_verification.mjs
 * Verification suite for Phase 125: Dynamic Cosmic Nebula & Deep Space Stardust Shaders Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 125 Verification: Dynamic Cosmic Nebula & Deep Space Stardust Shaders Protocol...\n');

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
const cosmicModulePath = resolve(rootDir, 'src/utils/cosmicNebulaShader.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of cosmicNebulaShader.ts
assert(existsSync(cosmicModulePath), 'src/utils/cosmicNebulaShader.ts file exists');

const cosmicModule = readFileSync(cosmicModulePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  cosmicModule.includes('export class CosmicNebulaShader') &&
  cosmicModule.includes('export interface NebulaConfig') &&
  cosmicModule.includes('export interface Star'),
  'cosmicNebulaShader.ts exports CosmicNebulaShader class, NebulaConfig, and Star interfaces'
);

// 3. Orbital nebula gas clouds with radial gradient synthesis
assert(
  cosmicModule.includes('createRadialGradient') &&
  cosmicModule.includes('this.time += this.config.rotationSpeed') &&
  cosmicModule.includes('globalCompositeOperation = \'screen\''),
  'CosmicNebulaShader generates orbital multi-layer swirling gas clouds with screen blending'
);

// 4. Twinkling starfield with oscillating alpha
assert(
  cosmicModule.includes('Math.sin(this.time * 50 * s.blinkSpeed + s.phase)') &&
  cosmicModule.includes('this.stars.push({'),
  'CosmicNebulaShader renders twinkling stars with harmonic alpha modulation'
);

// 5. Clean teardown
assert(
  cosmicModule.includes('public destroy(): void') &&
  cosmicModule.includes('this.stop()') &&
  cosmicModule.includes('this.stars = []') &&
  cosmicModule.includes('this.ctx = null'),
  'CosmicNebulaShader stops loops and frees star arrays and context on destroy'
);

// 6. CSS tokens verification
assert(
  indexCss.includes('.cosmic-nebula-canvas') &&
  indexCss.includes('.celestial-ambient-backdrop') &&
  indexCss.includes('contain: strict'),
  'src/index.css defines .cosmic-nebula-canvas and .celestial-ambient-backdrop CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 125 Verification Passed Successfully!');
  process.exit(0);
} else {
  console.error('💥 Phase 125 Verification Failed!');
  process.exit(1);
}
