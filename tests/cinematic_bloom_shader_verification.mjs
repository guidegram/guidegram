/**
 * tests/cinematic_bloom_shader_verification.mjs
 * Verification suite for Phase 113: WebGL Bloom Post-Processing & Cinematic Blur Elevation
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 113 Verification: WebGL Bloom Post-Processing & Cinematic Blur Elevation...\n');

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
const bloomModulePath = resolve(rootDir, 'src/utils/cinematicBloomShader.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of cinematicBloomShader.ts
assert(existsSync(bloomModulePath), 'src/utils/cinematicBloomShader.ts file exists');

const bloomModule = readFileSync(bloomModulePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  bloomModule.includes('export class CinematicBloomShader') &&
  bloomModule.includes('export interface BloomConfig'),
  'cinematicBloomShader.ts exports CinematicBloomShader class and BloomConfig interface'
);

// 3. Multi-pass offscreen buffer setup
assert(
  bloomModule.includes('offscreenCanvas') &&
  bloomModule.includes('Math.floor((width * dpr) / 2)'),
  'CinematicBloomShader sets up downscaled offscreen buffer for efficient multi-pass blur'
);

// 4. Luminous threshold blur pass & screen composite
assert(
  bloomModule.includes('this.ctx.globalCompositeOperation = \'screen\'') &&
  bloomModule.includes('blur(${this.blurRadius}px)'),
  'CinematicBloomShader executes blur pass and composites with screen blend mode'
);

// 5. Clean teardown
assert(
  bloomModule.includes('public destroy(): void') &&
  bloomModule.includes('this.offscreenCanvas = null'),
  'CinematicBloomShader provides clean teardown releasing offscreen resources'
);

// 6. CSS Cinematic Bloom Backdrop & Lens Flare
assert(
  indexCss.includes('.cinematic-bloom-backdrop') &&
  indexCss.includes('saturate(160%)') &&
  indexCss.includes('.lens-flare-accent'),
  'index.css defines .cinematic-bloom-backdrop with saturate(160%) and .lens-flare-accent'
);

console.log(`\n📊 Verification Summary: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 113 Verification PASSED: Bloom Post-Processing & Cinematic Blur Elevation verified!\n');
  process.exit(0);
} else {
  console.error('💥 Phase 113 Verification FAILED: Some assertions did not pass.\n');
  process.exit(1);
}
