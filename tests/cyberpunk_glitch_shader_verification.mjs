/**
 * tests/cyberpunk_glitch_shader_verification.mjs
 * Verification suite for Phase 126: Dynamic Glitch Distortion & Cyberpunk Chromatic Slice Shaders Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 126 Verification: Dynamic Glitch Distortion & Cyberpunk Chromatic Slice Shaders Protocol...\n');

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
const glitchModulePath = resolve(rootDir, 'src/utils/cyberpunkGlitchShader.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of cyberpunkGlitchShader.ts
assert(existsSync(glitchModulePath), 'src/utils/cyberpunkGlitchShader.ts file exists');

const glitchModule = readFileSync(glitchModulePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  glitchModule.includes('export class CyberpunkGlitchShader') &&
  glitchModule.includes('export interface GlitchConfig'),
  'cyberpunkGlitchShader.ts exports CyberpunkGlitchShader class and GlitchConfig interface'
);

// 3. Trigger glitch burst and auto-pausing idle loop
assert(
  glitchModule.includes('public triggerGlitch(durationMs: number = 350): void') &&
  glitchModule.includes('performance.now() > this.glitchEndTime') &&
  glitchModule.includes('this.glitchActive = false'),
  'CyberpunkGlitchShader triggers timed glitch bursts and auto-pauses idle loop'
);

// 4. Horizontal slice remapping and scanline rasterization
assert(
  glitchModule.includes('this.ctx.drawImage(') &&
  glitchModule.includes('this.config.colorSplitOffset') &&
  glitchModule.includes('this.config.scanlineIntensity'),
  'CyberpunkGlitchShader applies horizontal slice displacement, channel shear, and scanline overlay'
);

// 5. Clean teardown
assert(
  glitchModule.includes('public destroy(): void') &&
  glitchModule.includes('this.offscreenCanvas.width = 0') &&
  glitchModule.includes('this.ctx = null'),
  'CyberpunkGlitchShader releases animation frame and canvas contexts on destroy'
);

// 6. CSS tokens verification
assert(
  indexCss.includes('.cyberpunk-glitch-canvas') &&
  indexCss.includes('.scanline-flicker-layer') &&
  indexCss.includes('repeating-linear-gradient'),
  'src/index.css defines .cyberpunk-glitch-canvas and .scanline-flicker-layer CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 126 Verification Passed Successfully!');
  process.exit(0);
} else {
  console.error('💥 Phase 126 Verification Failed!');
  process.exit(1);
}
