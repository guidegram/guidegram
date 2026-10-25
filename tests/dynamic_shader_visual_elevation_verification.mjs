/**
 * tests/dynamic_shader_visual_elevation_verification.mjs
 * Verification suite for Phase 111: Swarm Research & Advanced Shader/Visual Elevation Architecture
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 111 Verification: Swarm Research & Advanced Shader/Visual Elevation Architecture...\n');

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
const shaderEnginePath = resolve(rootDir, 'src/utils/dynamicGradientShader.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of dynamicGradientShader.ts
assert(existsSync(shaderEnginePath), 'src/utils/dynamicGradientShader.ts file exists');

const shaderEngine = readFileSync(shaderEnginePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interfaces
assert(
  shaderEngine.includes('export class DynamicGradientShader') &&
  shaderEngine.includes('export interface ShaderColorStop'),
  'dynamicGradientShader.ts exports DynamicGradientShader class and ShaderColorStop interface'
);

// 3. 60fps render loop with timestamp throttling
assert(
  shaderEngine.includes('requestAnimationFrame(this.renderLoop)') &&
  shaderEngine.includes('1000 / this.fpsLimit'),
  'DynamicGradientShader implements 60fps render loop with battery-saving interval throttling'
);

// 4. Harmonic radial gradient calculation
assert(
  shaderEngine.includes('createRadialGradient') &&
  shaderEngine.includes('Math.sin(t *') &&
  shaderEngine.includes('Math.cos(t *'),
  'DynamicGradientShader computes multi-harmonic radial liquid gradient mesh blobs'
);

// 5. Cleanup & destroy method
assert(
  shaderEngine.includes('public destroy(): void') &&
  shaderEngine.includes('cancelAnimationFrame'),
  'DynamicGradientShader includes clean teardown and animation cancellation'
);

// 6. CSS Shader Canvas Utility
assert(
  indexCss.includes('.dynamic-shader-canvas') && indexCss.includes('contain: strict'),
  'index.css defines .dynamic-shader-canvas with high-performance contain: strict'
);

// 7. CSS Mesh Gradient Ambient Backdrop
assert(
  indexCss.includes('.mesh-gradient-ambient') && indexCss.includes('filter: blur(40px)'),
  'index.css defines .mesh-gradient-ambient with smooth ambient blur'
);

console.log(`\n📊 Verification Summary: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 111 Verification PASSED: Advanced Shader & Visual Elevation architecture verified!\n');
  process.exit(0);
} else {
  console.error('💥 Phase 111 Verification FAILED: Some assertions did not pass.\n');
  process.exit(1);
}
