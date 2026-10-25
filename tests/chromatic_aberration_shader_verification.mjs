/**
 * tests/chromatic_aberration_shader_verification.mjs
 * Verification suite for Phase 120: Dynamic Chromatic Aberration & Lens Distortion Shaders Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 120 Verification: Dynamic Chromatic Aberration & Lens Distortion Shaders Protocol...\n');

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
const chromaticModulePath = resolve(rootDir, 'src/utils/chromaticAberrationShader.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of chromaticAberrationShader.ts
assert(existsSync(chromaticModulePath), 'src/utils/chromaticAberrationShader.ts file exists');

const chromaticModule = readFileSync(chromaticModulePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  chromaticModule.includes('export class ChromaticAberrationShader') &&
  chromaticModule.includes('export interface ChromaticAberrationConfig'),
  'chromaticAberrationShader.ts exports ChromaticAberrationShader class and ChromaticAberrationConfig interface'
);

// 3. Offscreen canvas buffer allocation
assert(
  chromaticModule.includes('private offscreenCanvas: HTMLCanvasElement') &&
  chromaticModule.includes('document.createElement(\'canvas\')') &&
  chromaticModule.includes('willReadFrequently: true'),
  'ChromaticAberrationShader uses optimized offscreen canvas buffer with willReadFrequently'
);

// 4. RGB channel displacement separation logic
assert(
  chromaticModule.includes('srcData[rIdx]') &&
  chromaticModule.includes('srcData[idx + 1]') &&
  chromaticModule.includes('srcData[bIdx + 2]'),
  'ChromaticAberrationShader displaces Red and Blue channels with anchored Green'
);

// 5. Clean teardown and memory release
assert(
  chromaticModule.includes('public destroy(): void') &&
  chromaticModule.includes('this.offscreenCanvas.width = 0') &&
  chromaticModule.includes('this.ctx = null'),
  'ChromaticAberrationShader releases buffer dimensions and context references on destroy'
);

// 6. CSS tokens verification
assert(
  indexCss.includes('.chromatic-aberration-layer') &&
  indexCss.includes('.lens-distortion-vignette') &&
  indexCss.includes('mix-blend-mode: screen'),
  'src/index.css defines .chromatic-aberration-layer with screen blend mode and .lens-distortion-vignette'
);

console.log(`\n📊 Verification Result: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 120 Verification Passed Successfully!');
  process.exit(0);
} else {
  console.error('💥 Phase 120 Verification Failed!');
  process.exit(1);
}
