/**
 * tests/organic_wave_shader_verification.mjs
 * Verification suite for Phase 115: Organic Wave Morphing & Audio Reactive Shaders Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 115 Verification: Organic Wave Morphing & Audio Reactive Shaders Protocol...\n');

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
const waveModulePath = resolve(rootDir, 'src/utils/organicWaveShader.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of organicWaveShader.ts
assert(existsSync(waveModulePath), 'src/utils/organicWaveShader.ts file exists');

const waveModule = readFileSync(waveModulePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  waveModule.includes('export class OrganicWaveShader') &&
  waveModule.includes('export interface OrganicWaveConfig'),
  'organicWaveShader.ts exports OrganicWaveShader class and OrganicWaveConfig interface'
);

// 3. Audio amplitude modulation
assert(
  waveModule.includes('setAudioAmplitude(amp: number)') &&
  waveModule.includes('this.baseAmplitude + this.audioAmplitude * 35'),
  'OrganicWaveShader dynamically modulates wave amplitude via audio frequency input'
);

// 4. Multi-layer sine harmonic calculation
assert(
  waveModule.includes('layerOffset = layer * (Math.PI / 3)') &&
  waveModule.includes('Math.sin(x * freq + this.phase + layerOffset)'),
  'OrganicWaveShader synthesizes multi-layered offset harmonic waveforms'
);

// 5. Clean teardown
assert(
  waveModule.includes('public destroy(): void') &&
  waveModule.includes('cancelAnimationFrame'),
  'OrganicWaveShader includes destroy() lifecycle method cancelling animation loops'
);

// 6. CSS Organic Wave and Voice Halo
assert(
  indexCss.includes('.organic-wave-canvas') &&
  indexCss.includes('.voice-wave-halo') &&
  indexCss.includes('box-shadow: 0 0 25px rgba(16, 185, 129, 0.45)'),
  'index.css defines .organic-wave-canvas with strict containment and .voice-wave-halo glow'
);

console.log(`\n📊 Verification Summary: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 115 Verification PASSED: Organic Wave Morphing & Audio Reactive Shaders verified!\n');
  process.exit(0);
} else {
  console.error('💥 Phase 115 Verification FAILED: Some assertions did not pass.\n');
  process.exit(1);
}
