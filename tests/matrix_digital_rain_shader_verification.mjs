/**
 * tests/matrix_digital_rain_shader_verification.mjs
 * Verification suite for Phase 129: Dynamic Matrix Digital Rain & Cryptographic Glyph Stream Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 129 Verification: Dynamic Matrix Digital Rain & Cryptographic Glyph Stream Protocol...\n');

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
const matrixModulePath = resolve(rootDir, 'src/utils/matrixDigitalRainShader.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of matrixDigitalRainShader.ts
assert(existsSync(matrixModulePath), 'src/utils/matrixDigitalRainShader.ts file exists');

const matrixModule = readFileSync(matrixModulePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  matrixModule.includes('export class MatrixDigitalRainShader') &&
  matrixModule.includes('export interface MatrixRainConfig'),
  'matrixDigitalRainShader.ts exports MatrixDigitalRainShader class and MatrixRainConfig interface'
);

// 3. Phosphor trail persistence and glyph mutation
assert(
  matrixModule.includes('rgba(11, 15, 25, 0.12)') &&
  matrixModule.includes('this.config.glyphs') &&
  matrixModule.includes('this.ctx.fillText(text, x, y)'),
  'MatrixDigitalRainShader implements translucent fade trails and random glyph generation'
);

// 4. Leading phosphor highlight and column reset
assert(
  matrixModule.includes('this.ctx.fillStyle = `rgb(${this.config.leadColor})`') &&
  matrixModule.includes('if (y > h && Math.random() > 0.975)'),
  'MatrixDigitalRainShader draws luminous lead characters with random column resets'
);

// 5. Clean teardown
assert(
  matrixModule.includes('public destroy(): void') &&
  matrixModule.includes('this.stop()') &&
  matrixModule.includes('this.drops = []') &&
  matrixModule.includes('this.ctx = null'),
  'MatrixDigitalRainShader cleans drops arrays, animation frames, and context on destroy'
);

// 6. CSS tokens verification
assert(
  indexCss.includes('.matrix-rain-canvas') &&
  indexCss.includes('.matrix-terminal-glow') &&
  indexCss.includes('contain: strict'),
  'src/index.css defines .matrix-rain-canvas and .matrix-terminal-glow CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 129 Verification Passed Successfully!');
  process.exit(0);
} else {
  console.error('💥 Phase 129 Verification Failed!');
  process.exit(1);
}
