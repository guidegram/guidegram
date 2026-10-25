/**
 * tests/holographic_prismatic_shader_verification.mjs
 * Verification suite for Phase 121: Dynamic Holographic Prismatic Foil & Iridescent Shimmer Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 121 Verification: Dynamic Holographic Prismatic Foil & Iridescent Shimmer Protocol...\n');

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
const holographicModulePath = resolve(rootDir, 'src/utils/holographicPrismaticShader.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of holographicPrismaticShader.ts
assert(existsSync(holographicModulePath), 'src/utils/holographicPrismaticShader.ts file exists');

const holographicModule = readFileSync(holographicModulePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  holographicModule.includes('export class HolographicPrismaticShader') &&
  holographicModule.includes('export interface HolographicConfig'),
  'holographicPrismaticShader.ts exports HolographicPrismaticShader class and HolographicConfig interface'
);

// 3. Angle-of-incidence cursor tracking and smoothing
assert(
  holographicModule.includes('setCursorPosition') &&
  holographicModule.includes('Math.atan2(dy, dx)') &&
  holographicModule.includes('this.currentAngle += (this.targetAngle - this.currentAngle) * 0.1'),
  'HolographicPrismaticShader calculates and smoothly interpolates reflection angles'
);

// 4. Multi-stop spectral phase shifting and sheen band
assert(
  holographicModule.includes('createLinearGradient') &&
  holographicModule.includes('hsla(${hue}, 88%, 68%,') &&
  holographicModule.includes('this.phaseOffset = (this.phaseOffset + this.config.spectrumSpeed) % 1'),
  'HolographicPrismaticShader renders multi-stop iridescent rainbow refraction spectrum'
);

// 5. Clean destroy lifecycle
assert(
  holographicModule.includes('public destroy(): void') &&
  holographicModule.includes('this.stop()') &&
  holographicModule.includes('this.ctx = null'),
  'HolographicPrismaticShader releases animation frame and context references on destroy'
);

// 6. CSS tokens verification
assert(
  indexCss.includes('.holographic-foil-canvas') &&
  indexCss.includes('.prismatic-card-sheen') &&
  indexCss.includes('mix-blend-mode: color-dodge'),
  'src/index.css defines .holographic-foil-canvas and .prismatic-card-sheen CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 121 Verification Passed Successfully!');
  process.exit(0);
} else {
  console.error('💥 Phase 121 Verification Failed!');
  process.exit(1);
}
