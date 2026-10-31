import assert from 'node:assert';
import {
  PywalThemePaletteSynchronizer,
  LargeFileUploadChunkingGovernor,
  UniversalBinaryArchitectureGovernor,
  BundledLibraryFallbackResolver,
  FeatureCompatibilityMatrixManager,
  NoiseSuppressionDspGovernor,
  CustomNotificationSoundManager,
  DesktopThemeSoundAndChunkingGovernor
} from '../src/services/desktopThemeSoundAndChunkingGovernor.ts';

console.log('--- STARTING PHASE 120 VERIFICATION TEST SUITE ---');

// 1. PywalThemePaletteSynchronizer tests (kotatogram/kotatogram-desktop#251)
console.log('Test 1: PywalThemePaletteSynchronizer dynamic color palette sync');
const pywal = new PywalThemePaletteSynchronizer();
assert.strictEqual(pywal.getActivePalette(), null);

const pywalJson = JSON.stringify({
  wallpaper: '/home/user/wallpapers/neon_cyber.png',
  special: {
    background: '#0f111a',
    foreground: '#e6e6e6'
  },
  colors: {
    color0: '#000000',
    color4: '#3b82f6',
    color7: '#ffffff'
  }
});

const parsed = pywal.parseAndApplyColors(pywalJson);
assert(parsed !== null);
assert.strictEqual(parsed.background, '#0f111a');
assert.strictEqual(parsed.accent, '#3b82f6');
assert.strictEqual(parsed.wallpaperPath, '/home/user/wallpapers/neon_cyber.png');

// 2. LargeFileUploadChunkingGovernor tests (kotatogram/kotatogram-desktop#247)
console.log('Test 2: LargeFileUploadChunkingGovernor 2GB/4GB boundary validation');
const chunkGov = new LargeFileUploadChunkingGovernor();

// Standard user uploading 1.5GB: allowed
const standard1_5Gb = 1.5 * 1024 * 1024 * 1024;
const plan1 = chunkGov.computeUploadPlan(standard1_5Gb, false);
assert.strictEqual(plan1.allowed, true);
assert(plan1.totalParts > 2000);

// Standard user uploading 3GB: rejected
const standard3Gb = 3.0 * 1024 * 1024 * 1024;
const plan2 = chunkGov.computeUploadPlan(standard3Gb, false);
assert.strictEqual(plan2.allowed, false);
assert(plan2.errorReason?.includes('2GB limit'));

// Premium user uploading 3.5GB: allowed
const plan3 = chunkGov.computeUploadPlan(3.5 * 1024 * 1024 * 1024, true);
assert.strictEqual(plan3.allowed, true);

// 3. UniversalBinaryArchitectureGovernor tests (kotatogram/kotatogram-desktop#278)
console.log('Test 3: UniversalBinaryArchitectureGovernor ARM64 vs x64 execution check');
const archGov = new UniversalBinaryArchitectureGovernor();

const nativeArm = archGov.validateHostArchitecture('arm64', 'arm64');
assert.strictEqual(nativeArm.canExecuteNatively, true);
assert.strictEqual(nativeArm.useRosettaOrEmulation, false);

const rosetta = archGov.validateHostArchitecture('x64', 'arm64');
assert.strictEqual(rosetta.canExecuteNatively, false);
assert.strictEqual(rosetta.useRosettaOrEmulation, true);

// 4. BundledLibraryFallbackResolver tests (kotatogram/kotatogram-desktop#425)
console.log('Test 4: BundledLibraryFallbackResolver dynamic library missing fallback');
const libResolver = new BundledLibraryFallbackResolver();

const sysLib = libResolver.resolveLibrary('libabsl_strings.so', true);
assert.strictEqual(sysLib.source, 'system_shared_object');

const bundledLib = libResolver.resolveLibrary('libabsl_strings.so', false);
assert.strictEqual(bundledLib.loaded, true);
assert.strictEqual(bundledLib.source, 'bundled_internal_runtime');

// 5. FeatureCompatibilityMatrixManager tests (kotatogram/kotatogram-desktop#420)
console.log('Test 5: FeatureCompatibilityMatrixManager layer capability query');
const matrixMgr = new FeatureCompatibilityMatrixManager();

const oldLayer = matrixMgr.getCapabilities(130);
assert.strictEqual(oldLayer.stories, false);
assert.strictEqual(oldLayer.topics, false);

const newLayer = matrixMgr.getCapabilities(165);
assert.strictEqual(newLayer.stories, true);
assert.strictEqual(newLayer.topics, true);
assert.strictEqual(newLayer.customPacks, true);

// 6. NoiseSuppressionDspGovernor tests (kotatogram/kotatogram-desktop#471)
console.log('Test 6: NoiseSuppressionDspGovernor spectral gate noise filter fallback');
const dspGov = new NoiseSuppressionDspGovernor();

// Native rnnoise missing: spectral noise gate applies
const buffer = new Float32Array([0.005, 0.01, 0.45, -0.6, 0.002]);
const res = dspGov.processAudioFrame(buffer);
assert.strictEqual(res.suppressed, true);
assert.strictEqual(res.filterApplied, 'internal_spectral_gate');
// Check that small ambient noise was gated to 0
assert.strictEqual(buffer[0], 0);
assert.strictEqual(buffer[1], 0);
assert(Math.abs(buffer[2] - 0.45) < 0.0001, 'high amplitude voice preserved');

// 7. CustomNotificationSoundManager tests (kotatogram/kotatogram-desktop#305)
console.log('Test 7: CustomNotificationSoundManager per-chat custom sound alerts');
const soundMgr = new CustomNotificationSoundManager();

// Default sound
const defSound = soundMgr.getSoundForChat('chat_alpha');
assert.strictEqual(defSound.soundId, 'default_chime');

// Custom sound
soundMgr.setCustomSound({
  chatId: 'chat_alpha',
  soundId: 'laser_bell',
  soundUrl: '/custom/laser.ogg',
  volumeMultiplier: 0.8
});
const custom = soundMgr.getSoundForChat('chat_alpha');
assert.strictEqual(custom.soundId, 'laser_bell');
assert.strictEqual(custom.volumeMultiplier, 0.8);

// 8. Master Governor instantiation
console.log('Test 8: Master Governor instantiation');
const masterGov = new DesktopThemeSoundAndChunkingGovernor();
assert(masterGov.pywal instanceof PywalThemePaletteSynchronizer);
assert(masterGov.chunking instanceof LargeFileUploadChunkingGovernor);
assert(masterGov.architecture instanceof UniversalBinaryArchitectureGovernor);
assert(masterGov.libraryResolver instanceof BundledLibraryFallbackResolver);
assert(masterGov.featureMatrix instanceof FeatureCompatibilityMatrixManager);
assert(masterGov.noiseDsp instanceof NoiseSuppressionDspGovernor);
assert(masterGov.sounds instanceof CustomNotificationSoundManager);

console.log('--- ALL PHASE 120 VERIFICATION TESTS PASSED (100%) ---');
