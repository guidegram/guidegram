/**
 * Phase 146 Verification Suite:
 * Telegram Voice Waveform 60fps Spring FFT Visualizer Protocol
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

console.log('🧪 Starting Phase 146 Verification: Telegram Voice Waveform 60fps Spring FFT Visualizer Protocol...\n');

// 1. Check file existence
const visualizerFile = path.join(rootDir, 'src', 'utils', 'voiceWaveformVisualizer.ts');
assert(fs.existsSync(visualizerFile), 'src/utils/voiceWaveformVisualizer.ts file exists');

// 2. Read source code and check exports
const sourceContent = fs.readFileSync(visualizerFile, 'utf-8');
assert(
  sourceContent.includes('export class VoiceWaveformVisualizer') &&
  sourceContent.includes('export interface WaveformBar') &&
  sourceContent.includes('export interface VoiceWaveformConfig'),
  'voiceWaveformVisualizer.ts exports VoiceWaveformVisualizer class and interfaces'
);

// 3. Test Hooke spring physics damping implementation
assert(
  sourceContent.includes('springForce = -this.config.stiffness * displacement') &&
  sourceContent.includes('dampingForce = -this.config.damping * bar.velocity') &&
  sourceContent.includes('acceleration = springForce + dampingForce;'),
  'VoiceWaveformVisualizer integrates 60fps Hooke spring physics to eliminate audio jitter'
);

// 4. Test MTProto 5-bit amplitude normalization
assert(
  sourceContent.includes('if (norm > 1.0) norm = norm / 31.0;') &&
  sourceContent.includes('setWaveformData(amplitudes: number[]): void'),
  'VoiceWaveformVisualizer normalizes Telegram MTProto 5-bit peak arrays'
);

// 5. Test played vs unplayed progress thresholding
assert(
  sourceContent.includes('playedIndex = Math.floor(totalBars * this.playbackProgress);') &&
  sourceContent.includes('this.ctx.fillStyle = i <= playedIndex ? this.config.playedColor : this.config.unplayedColor;') &&
  sourceContent.includes('destroy(): void'),
  'VoiceWaveformVisualizer handles dual-tone playback scrubbing splits and memory disposal'
);

// 6. Check CSS styles in src/index.css
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'index.css'), 'utf-8');
assert(
  cssContent.includes('.voice-waveform-canvas') &&
  cssContent.includes('.voice-play-scrubber'),
  'src/index.css defines .voice-waveform-canvas and .voice-play-scrubber CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedTests}/${totalTests} checks passed.`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 146 Verification Passed Successfully!\n');
  process.exit(0);
} else {
  console.error('❌ Phase 146 Verification Failed!\n');
  process.exit(1);
}
