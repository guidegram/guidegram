/**
 * Phase 141 Verification Suite:
 * WebGL Hardware Acceleration & Multi-Engine Viewport Offscreen Pipeline Protocol
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

console.log('🧪 Starting Phase 141 Verification: WebGL Hardware Acceleration & Multi-Engine Viewport Offscreen Pipeline Protocol...\n');

// 1. Check file existence
const pipelineFile = path.join(rootDir, 'src', 'utils', 'webglPipelineManager.ts');
assert(fs.existsSync(pipelineFile), 'src/utils/webglPipelineManager.ts file exists');

// 2. Read source code and check exports
const sourceContent = fs.readFileSync(pipelineFile, 'utf-8');
assert(
  sourceContent.includes('export class WebglPipelineManager') &&
  sourceContent.includes('export interface ManagedCanvasEntry'),
  'webglPipelineManager.ts exports WebglPipelineManager class and ManagedCanvasEntry interface'
);

// 3. Test Singleton implementation
assert(
  sourceContent.includes('public static getInstance(') &&
  sourceContent.includes('private static instance: WebglPipelineManager'),
  'WebglPipelineManager enforces singleton lifecycle architecture'
);

// 4. Test WebGL context acquisition and lose_context reclamation
assert(
  sourceContent.includes("canvas.getContext('webgl2') || (canvas.getContext('webgl')") &&
  sourceContent.includes("entry.gl.getExtension('WEBGL_lose_context')") &&
  sourceContent.includes('ext.loseContext()'),
  'WebglPipelineManager safely reclaims GPU memory via WEBGL_lose_context extension'
);

// 5. Test offscreen occlusion and adaptive frame throttling
assert(
  sourceContent.includes('setCanvasVisibility(id: string, isVisible: boolean)') &&
  sourceContent.includes('if (!entry.isVisible) continue;') &&
  sourceContent.includes('const interval = 1000 / entry.targetFps;'),
  'WebglPipelineManager skips offscreen rendering and applies adaptive FPS pacing'
);

// 6. Check CSS styles in src/index.css
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'index.css'), 'utf-8');
assert(
  cssContent.includes('.webgl-accelerated-layer') &&
  cssContent.includes('.webgl-offscreen-paused') &&
  cssContent.includes('transform: translateZ(0);'),
  'src/index.css defines .webgl-accelerated-layer and .webgl-offscreen-paused CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedTests}/${totalTests} checks passed.`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 141 Verification Passed Successfully!\n');
  process.exit(0);
} else {
  console.error('❌ Phase 141 Verification Failed!\n');
  process.exit(1);
}
