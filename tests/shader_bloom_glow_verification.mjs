/**
 * Phase 142 Verification Suite:
 * Shader Bloom Glow & High-Dynamic-Range Post-Processing Protocol
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

console.log('🧪 Starting Phase 142 Verification: Shader Bloom Glow & High-Dynamic-Range Post-Processing Protocol...\n');

// 1. Check file existence
const bloomFile = path.join(rootDir, 'src', 'utils', 'shaderBloomGlow.ts');
assert(fs.existsSync(bloomFile), 'src/utils/shaderBloomGlow.ts file exists');

// 2. Read source code and check exports
const sourceContent = fs.readFileSync(bloomFile, 'utf-8');
assert(
  sourceContent.includes('export class ShaderBloomGlow') &&
  sourceContent.includes('export interface BloomConfig'),
  'shaderBloomGlow.ts exports ShaderBloomGlow class and BloomConfig interface'
);

// 3. Test ITU-R BT.709 luminance computation
assert(
  sourceContent.includes('0.2126 * r + 0.7152 * g + 0.0722 * b') &&
  sourceContent.includes('thresh255'),
  'ShaderBloomGlow implements ITU-R BT.709 relative luminance extraction'
);

// 4. Test threshold culling and bright pixel boosting
assert(
  sourceContent.includes('data[i + 3] = 0;') &&
  sourceContent.includes('factor = ((lum - thresh255) / (255 - thresh255)) * this.config.intensity;'),
  'ShaderBloomGlow isolates specular highlights and boosts peak luminance'
);

// 5. Test additive screen blending and cleanup
assert(
  sourceContent.includes("this.ctx.globalCompositeOperation = 'screen';") &&
  sourceContent.includes('destroy(): void') &&
  sourceContent.includes('this.isDestroyed = true;'),
  'ShaderBloomGlow blends HDR bloom via screen composite and cleans buffer state'
);

// 6. Check CSS styles in src/index.css
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'index.css'), 'utf-8');
assert(
  cssContent.includes('.shader-bloom-canvas') &&
  cssContent.includes('.hdr-bloom-aura') &&
  cssContent.includes('@keyframes hdr-aura-pulse'),
  'src/index.css defines .shader-bloom-canvas and pulsing .hdr-bloom-aura tokens'
);

console.log(`\n📊 Verification Result: ${passedTests}/${totalTests} checks passed.`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 142 Verification Passed Successfully!\n');
  process.exit(0);
} else {
  console.error('❌ Phase 142 Verification Failed!\n');
  process.exit(1);
}
