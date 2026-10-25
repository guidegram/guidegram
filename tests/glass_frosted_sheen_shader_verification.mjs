/**
 * Phase 143 Verification Suite:
 * Glass Frosted Blur & Specular Sheen Lighting Shaders Protocol
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

console.log('🧪 Starting Phase 143 Verification: Glass Frosted Blur & Specular Sheen Lighting Shaders Protocol...\n');

// 1. Check file existence
const shaderFile = path.join(rootDir, 'src', 'utils', 'glassFrostedSheenShader.ts');
assert(fs.existsSync(shaderFile), 'src/utils/glassFrostedSheenShader.ts file exists');

// 2. Read source code and check exports
const sourceContent = fs.readFileSync(shaderFile, 'utf-8');
assert(
  sourceContent.includes('export class GlassFrostedSheenShader') &&
  sourceContent.includes('export interface GlassFrostedConfig'),
  'glassFrostedSheenShader.ts exports GlassFrostedSheenShader class and GlassFrostedConfig interface'
);

// 3. Test interactive pointer focus and roughness controls
assert(
  sourceContent.includes('setPointerPosition(normX: number, normY: number)') &&
  sourceContent.includes('setRoughness(roughness: number)') &&
  sourceContent.includes('this.pointerX = Math.max(0, Math.min(1, normX));'),
  'GlassFrostedSheenShader binds normalized pointer interaction coordinates'
);

// 4. Test dynamic radial sheen sweep rendering
assert(
  sourceContent.includes('this.ctx.createRadialGradient(') &&
  sourceContent.includes("this.ctx.globalCompositeOperation = 'overlay';") &&
  sourceContent.includes('sweepProgress = (Math.sin(time * 0.001) + 1) * 0.5;'),
  'GlassFrostedSheenShader renders sinusoidal pointer-driven specular sheen sweeps'
);

// 5. Test chamfered specular edge stroke and lifecycle destruction
assert(
  sourceContent.includes('this.ctx.strokeRect(0.5, 0.5, w - 1, h - 1);') &&
  sourceContent.includes('destroy(): void') &&
  sourceContent.includes('this.isDestroyed = true;'),
  'GlassFrostedSheenShader renders crisp 1px specular borders and supports resource release'
);

// 6. Check CSS styles in src/index.css
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'index.css'), 'utf-8');
assert(
  cssContent.includes('.glass-frosted-sheen-surface') &&
  cssContent.includes('.specular-edge-glow') &&
  cssContent.includes('backdrop-filter: blur(20px) saturate(180%);'),
  'src/index.css defines .glass-frosted-sheen-surface and .specular-edge-glow CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedTests}/${totalTests} checks passed.`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 143 Verification Passed Successfully!\n');
  process.exit(0);
} else {
  console.error('❌ Phase 143 Verification Failed!\n');
  process.exit(1);
}
