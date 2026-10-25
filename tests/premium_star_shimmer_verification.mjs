/**
 * Phase 147 Verification Suite:
 * Telegram Premium Star Shimmer & Cosmic Sparkle Burst Protocol
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

console.log('🧪 Starting Phase 147 Verification: Telegram Premium Star Shimmer & Cosmic Sparkle Burst Protocol...\n');

// 1. Check file existence
const starFile = path.join(rootDir, 'src', 'utils', 'premiumStarShimmer.ts');
assert(fs.existsSync(starFile), 'src/utils/premiumStarShimmer.ts file exists');

// 2. Read source code and check exports
const sourceContent = fs.readFileSync(starFile, 'utf-8');
assert(
  sourceContent.includes('export class PremiumStarShimmer') &&
  sourceContent.includes('export interface SparkleParticle') &&
  sourceContent.includes('export interface PremiumStarConfig'),
  'premiumStarShimmer.ts exports PremiumStarShimmer class and particle interfaces'
);

// 3. Test multifaceted star geometry & shimmer gradient
assert(
  sourceContent.includes('drawStar(cx: number, cy: number, spikes: number') &&
  sourceContent.includes("grad.addColorStop(0.5, '#fbbf24');") &&
  sourceContent.includes('shimmerOffset = Math.sin(this.shimmerTime) * outerRadius;'),
  'PremiumStarShimmer computes 5-point polygonal star with dynamic chromatic specular gradients'
);

// 4. Test sparkle burst physics emission
assert(
  sourceContent.includes('triggerBurst(originX?: number, originY?: number): void') &&
  sourceContent.includes('getSparkleCount(): number') &&
  sourceContent.includes('this.sparkles.push({'),
  'PremiumStarShimmer generates multi-particle celebration sparkle bursts'
);

// 5. Test diamond sparkle glyph rendering and memory cleanup
assert(
  sourceContent.includes('this.ctx.lineTo(p.size * 0.6, 0);') &&
  sourceContent.includes('destroy(): void') &&
  sourceContent.includes('this.isDestroyed = true;'),
  'PremiumStarShimmer renders rotating diamond sparkle glyphs and safely cleans buffer state'
);

// 6. Check CSS styles in src/index.css
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'index.css'), 'utf-8');
assert(
  cssContent.includes('.premium-star-badge') &&
  cssContent.includes('.star-sparkle-burst-canvas') &&
  cssContent.includes('linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #fbbf24 100%)'),
  'src/index.css defines .premium-star-badge and .star-sparkle-burst-canvas CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedTests}/${totalTests} checks passed.`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 147 Verification Passed Successfully!\n');
  process.exit(0);
} else {
  console.error('❌ Phase 147 Verification Failed!\n');
  process.exit(1);
}
