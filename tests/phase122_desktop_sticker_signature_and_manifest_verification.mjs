import assert from 'node:assert';
import {
  StickerPackAttributionGovernor,
  ExtendedStickerCacheGovernor,
  AdaptiveAppIconManager,
  WingetManifestGenerator,
  AdminSignatureLayoutGovernor,
  ShallowFetchIntegrityManager,
  ResilientArtifactUploadChunker,
  DesktopStickerSignatureAndManifestGovernor
} from '../src/services/desktopStickerSignatureAndManifestGovernor.ts';

console.log('--- STARTING PHASE 122 VERIFICATION TEST SUITE ---');

// 1. StickerPackAttributionGovernor tests (TDesktop-x64/tdesktop#218)
console.log('Test 1: StickerPackAttributionGovernor ownerId validation and attribution');
const attribGov = new StickerPackAttributionGovernor();

const validPack = attribGov.validateAndSanitizePack({
  packId: 'cute_cats',
  title: 'Cute Cats',
  ownerId: 54321,
  stickerCount: 25,
  isOfficial: false
});
assert.strictEqual(validPack.isValid, true);
assert.strictEqual(validPack.attributedOwnerId, 54321);
assert.strictEqual(validPack.displayAuthor, 'User #54321');

const anonPack = attribGov.validateAndSanitizePack({
  packId: 'default_pepe',
  title: 'Pepe',
  ownerId: 0,
  stickerCount: 15,
  isOfficial: true
});
assert.strictEqual(anonPack.attributedOwnerId, 0);
assert(anonPack.displayAuthor.includes('Anonymous'));

// 2. ExtendedStickerCacheGovernor tests (TDesktop-x64/tdesktop#211)
console.log('Test 2: ExtendedStickerCacheGovernor 1000 items cache limit');
const stickerCache = new ExtendedStickerCacheGovernor(5); // small limit for fast test

for (let i = 1; i <= 6; i++) {
  stickerCache.addSticker({ id: `stk_${i}`, emoji: '🔥', url: `https://cdn/stk_${i}.webp`, byteSize: 1024 });
}
assert.strictEqual(stickerCache.getCacheCount(), 5, 'Should strictly enforce cache capacity without unbounded growth');

const defaultGov = new ExtendedStickerCacheGovernor();
assert.strictEqual(defaultGov.getCacheLimit(), 1000, 'Default cache limit must be extended to 1000');

// 3. AdaptiveAppIconManager tests (TDesktop-x64/tdesktop#205)
console.log('Test 3: AdaptiveAppIconManager icon styles switching');
const iconMgr = new AdaptiveAppIconManager();
assert.strictEqual(iconMgr.getIconStyle(), 'default');

const darkIcon = iconMgr.setIconStyle('dark');
assert.strictEqual(darkIcon.style, 'dark');
assert.strictEqual(darkIcon.assetPath, '/assets/icons/app_icon_dark.png');
assert.strictEqual(iconMgr.getIconStyle(), 'dark');

// 4. WingetManifestGenerator tests (TDesktop-x64/tdesktop#204)
console.log('Test 4: WingetManifestGenerator Windows package manager YAML manifest');
const wingetGen = new WingetManifestGenerator();
const manifestYaml = wingetGen.generateYamlManifest({
  packageIdentifier: 'Guidegram.GuidegramDesktop',
  packageVersion: '2.5.0',
  publisher: 'Guidegram Foundation',
  packageUrl: 'https://github.com/guidegram/desktop/releases/download/v2.5.0/guidegram-setup.exe',
  sha256Hex: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
});
assert(manifestYaml.includes('PackageIdentifier: Guidegram.GuidegramDesktop'));
assert(manifestYaml.includes('PackageVersion: 2.5.0'));
assert(manifestYaml.includes('InstallerType: inno'));

// 5. AdminSignatureLayoutGovernor tests (TDesktop-x64/tdesktop#201)
console.log('Test 5: AdminSignatureLayoutGovernor signature width truncation');
const sigGov = new AdminSignatureLayoutGovernor();

// Short signature: no truncation
const shortSig = sigGov.computeSignatureLayout('Admin Alice', 400);
assert.strictEqual(shortSig.isTruncated, false);
assert.strictEqual(shortSig.displayName, 'Admin Alice');

// Very long signature: truncated with ellipsis
const longSig = sigGov.computeSignatureLayout('Chief Executive Managing Director Of Telegram Channel Group', 400);
assert.strictEqual(longSig.isTruncated, true);
assert(longSig.displayName.endsWith('…'));
assert(longSig.computedWidthPx <= 180);

// 6. ShallowFetchIntegrityManager tests (TDesktop-x64/tdesktop#224)
console.log('Test 6: ShallowFetchIntegrityManager CI shallow depth fetch');
const fetchMgr = new ShallowFetchIntegrityManager();

const ciArgs = fetchMgr.computeFetchArgs(true);
assert.strictEqual(ciArgs.fetchDepth, 1);
assert.strictEqual(ciArgs.submoduleRecursive, true);
assert(ciArgs.flags.includes('--depth=1'));

const devArgs = fetchMgr.computeFetchArgs(false, 100);
assert.strictEqual(devArgs.fetchDepth, 100);
assert(devArgs.flags.includes('--depth=100'));

// 7. ResilientArtifactUploadChunker tests (TDesktop-x64/tdesktop#203)
console.log('Test 7: ResilientArtifactUploadChunker artifact chunking & retries');
const chunker = new ResilientArtifactUploadChunker();
const plan = chunker.chunkArtifact(45 * 1024 * 1024, 10 * 1024 * 1024); // 45MB in 10MB chunks
assert.strictEqual(plan.chunkCount, 5);
assert.strictEqual(plan.maxRetriesPerChunk, 3);

// 8. Master Governor instantiation
console.log('Test 8: Master Governor instantiation');
const masterGov = new DesktopStickerSignatureAndManifestGovernor();
assert(masterGov.attribution instanceof StickerPackAttributionGovernor);
assert(masterGov.stickerCache instanceof ExtendedStickerCacheGovernor);
assert(masterGov.appIcon instanceof AdaptiveAppIconManager);
assert(masterGov.winget instanceof WingetManifestGenerator);
assert(masterGov.signatureLayout instanceof AdminSignatureLayoutGovernor);
assert(masterGov.shallowFetch instanceof ShallowFetchIntegrityManager);
assert(masterGov.uploadChunker instanceof ResilientArtifactUploadChunker);

console.log('--- ALL PHASE 122 VERIFICATION TESTS PASSED (100%) ---');
