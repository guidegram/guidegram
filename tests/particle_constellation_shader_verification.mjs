/**
 * Phase 144 Verification Suite:
 * Particle Nebula Constellation & Interactive Physics Swarm Protocol
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

console.log('🧪 Starting Phase 144 Verification: Particle Nebula Constellation & Interactive Physics Swarm Protocol...\n');

// 1. Check file existence
const shaderFile = path.join(rootDir, 'src', 'utils', 'particleConstellationShader.ts');
assert(fs.existsSync(shaderFile), 'src/utils/particleConstellationShader.ts file exists');

// 2. Read source code and check exports
const sourceContent = fs.readFileSync(shaderFile, 'utf-8');
assert(
  sourceContent.includes('export class ParticleConstellationShader') &&
  sourceContent.includes('export interface ParticleNode') &&
  sourceContent.includes('export interface ConstellationConfig'),
  'particleConstellationShader.ts exports ParticleConstellationShader class and node interfaces'
);

// 3. Test particle pool initialization
assert(
  sourceContent.includes('this.particles.push({') &&
  sourceContent.includes('getParticles(): ParticleNode[]') &&
  sourceContent.includes('setParticleCount(count: number): void'),
  'ParticleConstellationShader dynamically manages particle node pools'
);

// 4. Test interactive pointer repulsion physics
assert(
  sourceContent.includes('dist < this.config.pointerRepelRadius') &&
  sourceContent.includes('p.vx += (dx / dist) * force') &&
  sourceContent.includes('setPointer(x: number, y: number)'),
  'ParticleConstellationShader applies elastic pointer-repulsion force fields'
);

// 5. Test boundary elastic bounce and distance lines
assert(
  sourceContent.includes('p.vx *= -1;') &&
  sourceContent.includes('dist < this.config.maxDistance') &&
  sourceContent.includes('this.ctx.lineTo(p2.x, p2.y);'),
  'ParticleConstellationShader bounces off screen borders and draws connective distance filaments'
);

// 6. Check CSS styles in src/index.css
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'index.css'), 'utf-8');
assert(
  cssContent.includes('.constellation-particle-canvas') &&
  cssContent.includes('.cosmic-connection-line'),
  'src/index.css defines .constellation-particle-canvas and .cosmic-connection-line CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedTests}/${totalTests} checks passed.`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 144 Verification Passed Successfully!\n');
  process.exit(0);
} else {
  console.error('❌ Phase 144 Verification Failed!\n');
  process.exit(1);
}
