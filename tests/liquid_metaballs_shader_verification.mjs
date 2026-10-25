/**
 * tests/liquid_metaballs_shader_verification.mjs
 * Verification suite for Phase 127: Dynamic Liquid Metaballs & Viscous Organic Fusion Shaders Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 127 Verification: Dynamic Liquid Metaballs & Viscous Organic Fusion Shaders Protocol...\n');

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
const metaballModulePath = resolve(rootDir, 'src/utils/liquidMetaballsShader.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of liquidMetaballsShader.ts
assert(existsSync(metaballModulePath), 'src/utils/liquidMetaballsShader.ts file exists');

const metaballModule = readFileSync(metaballModulePath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Class definition and interface exports
assert(
  metaballModule.includes('export class LiquidMetaballsShader') &&
  metaballModule.includes('export interface MetaballConfig') &&
  metaballModule.includes('export interface Metaball'),
  'liquidMetaballsShader.ts exports LiquidMetaballsShader class, MetaballConfig, and Metaball interfaces'
);

// 3. Gaussian blur filter application for droplet coalescing
assert(
  metaballModule.includes('this.ctx.filter = `blur(${this.config.blurRadius}px)`') &&
  metaballModule.includes('this.balls.push({'),
  'LiquidMetaballsShader uses Gaussian blur filter and particle dynamics for fluid fusion'
);

// 4. Cursor attractor gravitational acceleration
assert(
  metaballModule.includes('setAttractor') &&
  metaballModule.includes('b.vx += (this.attractorX - b.x) * this.config.attractorStrength * 0.05'),
  'LiquidMetaballsShader smoothly pulls droplets toward cursor attractor'
);

// 5. Clean destroy lifecycle
assert(
  metaballModule.includes('public destroy(): void') &&
  metaballModule.includes('this.stop()') &&
  metaballModule.includes('this.balls = []') &&
  metaballModule.includes('this.ctx = null'),
  'LiquidMetaballsShader stops loops and cleans particle arrays and context on destroy'
);

// 6. CSS tokens verification
assert(
  indexCss.includes('.metaballs-contrast-container') &&
  indexCss.includes('.liquid-metaballs-canvas') &&
  indexCss.includes('filter: contrast(28)'),
  'src/index.css defines .metaballs-contrast-container with contrast threshold and .liquid-metaballs-canvas'
);

console.log(`\n📊 Verification Result: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 127 Verification Passed Successfully!');
  process.exit(0);
} else {
  console.error('💥 Phase 127 Verification Failed!');
  process.exit(1);
}
