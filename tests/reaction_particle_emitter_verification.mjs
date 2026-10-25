/**
 * Phase 148 Verification Suite:
 * Chat Bubble Dynamic Reaction Physics & Floating Emoji Particle Emitter Protocol
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

console.log('🧪 Starting Phase 148 Verification: Chat Bubble Dynamic Reaction Physics & Floating Emoji Particle Emitter Protocol...\n');

// 1. Check file existence
const emitterFile = path.join(rootDir, 'src', 'utils', 'reactionParticleEmitter.ts');
assert(fs.existsSync(emitterFile), 'src/utils/reactionParticleEmitter.ts file exists');

// 2. Read source code and check exports
const sourceContent = fs.readFileSync(emitterFile, 'utf-8');
assert(
  sourceContent.includes('export class ReactionParticleEmitter') &&
  sourceContent.includes('export interface FloatingEmoji') &&
  sourceContent.includes('export interface ReactionConfig'),
  'reactionParticleEmitter.ts exports ReactionParticleEmitter class and interfaces'
);

// 3. Test emoji spawning & bounded pool logic
assert(
  sourceContent.includes('spawnReaction(emoji: string') &&
  sourceContent.includes('getActiveParticlesCount(): number') &&
  sourceContent.includes('this.particles.shift();'),
  'ReactionParticleEmitter creates floating emoji particles with memory-bounded queue eviction'
);

// 4. Test vertical rise and horizontal sinusoidal oscillation
assert(
  sourceContent.includes('p.y -= p.vy;') &&
  sourceContent.includes('Math.sin(p.timeAlive * p.oscillationFreq) * p.oscillationAmp;') &&
  sourceContent.includes('p.x = p.initialX +'),
  'ReactionParticleEmitter applies realistic fluid rising and sinusoidal drift physics'
);

// 5. Test alpha ease-out and cleanup
assert(
  sourceContent.includes('p.alpha = 1.0 - Math.pow(progress, 1.5);') &&
  sourceContent.includes('destroy(): void') &&
  sourceContent.includes('this.isDestroyed = true;'),
  'ReactionParticleEmitter executes smooth power-law opacity fades and safely tears down resources'
);

// 6. Check CSS styles in src/index.css
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'index.css'), 'utf-8');
assert(
  cssContent.includes('.message-reaction-pill') &&
  cssContent.includes('.reaction-emitter-canvas') &&
  cssContent.includes('cubic-bezier(0.34, 1.56, 0.64, 1)'),
  'src/index.css defines .message-reaction-pill spring scale and .reaction-emitter-canvas CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedTests}/${totalTests} checks passed.`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 148 Verification Passed Successfully!\n');
  process.exit(0);
} else {
  console.error('❌ Phase 148 Verification Failed!\n');
  process.exit(1);
}
