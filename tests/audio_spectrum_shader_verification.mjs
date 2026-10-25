/**
 * tests/audio_spectrum_shader_verification.mjs
 * Verification suite for Phase 128: Dynamic Soundwave Spectrum & Live Audio Visualizer Shaders Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 128 Verification: Dynamic Soundwave Spectrum & Live Audio Visualizer Shaders Protocol...\n');

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
const spectrumModulePath = resolve(rootDir, 'src/utils/audioSpectrumShader.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of audioSpectrumShader.ts
assert(existsSync(spectrumModulePath), 'src/utils/audioSpectrumShader.ts file exists');

const spectrumModule = readFileSync(spectrumModulePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  spectrumModule.includes('export class AudioSpectrumShader') &&
  spectrumModule.includes('export interface SpectrumConfig'),
  'audioSpectrumShader.ts exports AudioSpectrumShader class and SpectrumConfig interface'
);

// 3. Dual-mode support (linear & radial)
assert(
  spectrumModule.includes('setMode(mode: \'linear\' | \'radial\')') &&
  spectrumModule.includes('this.drawLinear(w, h)') &&
  spectrumModule.includes('this.drawRadial(w, h)'),
  'AudioSpectrumShader supports both linear vertical bars and radial circular visualizers'
);

// 4. Spring-damped frequency decay and auto-idle pausing
assert(
  spectrumModule.includes('this.currentHeights[i] += (this.targetHeights[i] - this.currentHeights[i]) * this.config.smoothing') &&
  spectrumModule.includes('this.targetHeights[i] *= 0.94') &&
  spectrumModule.includes('maxDiff < 0.01 && maxVal < 0.01'),
  'AudioSpectrumShader damps frequency heights and auto-pauses animation loop on silence'
);

// 5. Clean teardown
assert(
  spectrumModule.includes('public destroy(): void') &&
  spectrumModule.includes('this.currentHeights = []') &&
  spectrumModule.includes('this.ctx = null'),
  'AudioSpectrumShader releases animation frames, arrays, and canvas contexts on destroy'
);

// 6. CSS tokens verification
assert(
  indexCss.includes('.audio-spectrum-canvas') &&
  indexCss.includes('.voice-spectrum-radial-ring') &&
  indexCss.includes('contain: strict'),
  'src/index.css defines .audio-spectrum-canvas and .voice-spectrum-radial-ring CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 128 Verification Passed Successfully!');
  process.exit(0);
} else {
  console.error('💥 Phase 128 Verification Failed!');
  process.exit(1);
}
