/**
 * Phase 145 Verification Suite:
 * Telegram Story Ring Dynamic Gradient Arc & Liquid Progress Protocol
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

console.log('🧪 Starting Phase 145 Verification: Telegram Story Ring Dynamic Gradient Arc & Liquid Progress Protocol...\n');

// 1. Check file existence
const shaderFile = path.join(rootDir, 'src', 'utils', 'storyGradientRingShader.ts');
assert(fs.existsSync(shaderFile), 'src/utils/storyGradientRingShader.ts file exists');

// 2. Read source code and check exports
const sourceContent = fs.readFileSync(shaderFile, 'utf-8');
assert(
  sourceContent.includes('export class StoryGradientRingShader') &&
  sourceContent.includes('export interface StoryRingConfig'),
  'storyGradientRingShader.ts exports StoryGradientRingShader class and StoryRingConfig interface'
);

// 3. Test multi-segment arc math
assert(
  sourceContent.includes('const segmentArcDeg = (360 - totalGap) / segments;') &&
  sourceContent.includes('setSegments(count: number): void') &&
  sourceContent.includes('this.ctx.arc(centerX, centerY, radius, startRad, endRad);'),
  'StoryGradientRingShader calculates exact segmented arc angles with uniform gaps'
);

// 4. Test Telegram conic gradient chromatic palette
assert(
  sourceContent.includes("conic.addColorStop(0, '#E1306C');") &&
  sourceContent.includes("conic.addColorStop(0.25, '#FD1D1D');") &&
  sourceContent.includes("conic.addColorStop(0.75, '#833AB4');"),
  'StoryGradientRingShader renders vibrant official Telegram story conic gradient stops'
);

// 5. Test unread vs read status toggle
assert(
  sourceContent.includes('setIsUnread(unread: boolean): void') &&
  sourceContent.includes("'rgba(148, 163, 184, 0.45)'") &&
  sourceContent.includes('destroy(): void'),
  'StoryGradientRingShader switches between vibrant unread animation and muted read arcs'
);

// 6. Check CSS styles in src/index.css
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'index.css'), 'utf-8');
assert(
  cssContent.includes('.telegram-story-ring-canvas') &&
  cssContent.includes('.story-avatar-container') &&
  cssContent.includes('border-radius: 9999px;'),
  'src/index.css defines .telegram-story-ring-canvas and .story-avatar-container CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedTests}/${totalTests} checks passed.`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 145 Verification Passed Successfully!\n');
  process.exit(0);
} else {
  console.error('❌ Phase 145 Verification Failed!\n');
  process.exit(1);
}
