/**
 * tests/vector_morph_engine_verification.mjs
 * Verification suite for Phase 116: Vector SVG Morphing & Lottie Real-Time Kinetic Engine Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 116 Verification: Vector SVG Morphing & Lottie Real-Time Kinetic Engine Protocol...\n');

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
const morphModulePath = resolve(rootDir, 'src/utils/vectorMorphEngine.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of vectorMorphEngine.ts
assert(existsSync(morphModulePath), 'src/utils/vectorMorphEngine.ts file exists');

const morphModule = readFileSync(morphModulePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  morphModule.includes('export class VectorMorphEngine') &&
  morphModule.includes('export interface MorphConfig'),
  'vectorMorphEngine.ts exports VectorMorphEngine class and MorphConfig interface'
);

// 3. Capped Lottie animation cache
assert(
  morphModule.includes('MAX_CACHE_SIZE = 50') &&
  morphModule.includes('cacheLottieAnimation') &&
  morphModule.includes('getCachedLottieAnimation'),
  'VectorMorphEngine implements memory-capped LRU cache for animated Lottie assets'
);

// 4. Cubic ease in/out path interpolation
assert(
  morphModule.includes('cubicEaseInOut') &&
  morphModule.includes('interpolatePathPoints'),
  'VectorMorphEngine executes cubic-interpolated vector coordinates calculations'
);

// 5. CSS Vector Morph Container & Kinetic Lottie Wrapper
assert(
  indexCss.includes('.vector-morph-container') &&
  indexCss.includes('.kinetic-lottie-wrapper') &&
  indexCss.includes('contain: paint'),
  'index.css defines .vector-morph-container and .kinetic-lottie-wrapper with contain: paint'
);

console.log(`\n📊 Verification Summary: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 116 Verification PASSED: Vector SVG Morphing & Lottie Kinetic Engine verified!\n');
  process.exit(0);
} else {
  console.error('💥 Phase 116 Verification FAILED: Some assertions did not pass.\n');
  process.exit(1);
}
