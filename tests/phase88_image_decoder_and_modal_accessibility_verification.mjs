import assert from 'node:assert';
import { ImageDecoderAndModalAccessibilityGovernor } from '../src/services/imageDecoderAndModalAccessibilityGovernor.ts';

console.log('🧪 Starting Phase 88 Image Decoder & Modal Accessibility Verification Suite...');

const governor = new ImageDecoderAndModalAccessibilityGovernor();

// 1. Image Format Sniffing & HEIC/HEIF Support (TDesktop #5522)
console.log('  Testing image format detection (HEIC, HEIF, WebP, PNG, JPEG)...');
// HEIC header: [0, 0, 0, 24, 'f', 't', 'y', 'p', 'h', 'e', 'i', 'c']
const heicBytes = [0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63];
assert.strictEqual(governor.detectImageFormat(heicBytes), 'heic');

// PNG header: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]
const pngBytes = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
assert.strictEqual(governor.detectImageFormat(pngBytes), 'png');

// Fallback by extension
assert.strictEqual(governor.detectImageFormat([], 'photo.heif'), 'heif');
assert.strictEqual(governor.detectImageFormat([], 'avatar.webp'), 'webp');
console.log('  ✅ Image format detection verified');

// 2. High-Resolution Photo Sizing (TDesktop #6520)
console.log('  Testing photo dimension calculation (standard, HD 2560, original)...');
const src4k = { width: 3840, height: 2160 };

const hdRes = governor.calculatePhotoDimensions(src4k.width, src4k.height, 'hd_2560');
assert.strictEqual(hdRes.targetWidth, 2560);
assert.strictEqual(hdRes.targetHeight, 1440);

const stdRes = governor.calculatePhotoDimensions(src4k.width, src4k.height, 'standard_1280');
assert.strictEqual(stdRes.targetWidth, 1280);
assert.strictEqual(stdRes.targetHeight, 720);

const origRes = governor.calculatePhotoDimensions(src4k.width, src4k.height, 'uncompressed_original');
assert.strictEqual(origRes.targetWidth, 3840);
assert.strictEqual(origRes.targetHeight, 2160);
console.log('  ✅ Photo dimension calculation verified');

// 3. File Dialog Crash Recovery & Fallback (Kotatogram #213)
console.log('  Testing native file dialog crash recovery & fallback...');
// Simulating native dialog throwing an error/crash
const crashNative = async () => {
  throw new Error('OS native file dialog crashed with segmentation fault');
};
const workingFallback = async () => ['/path/to/recovered_file.jpg'];

const res = await governor.openFileDialogSafely(crashNative, workingFallback);
assert.strictEqual(res.source, 'fallback');
assert.strictEqual(res.files.length, 1);
assert.strictEqual(res.files[0], '/path/to/recovered_file.jpg');
console.log('  ✅ File dialog crash recovery & fallback verified');

// 4. Reactive User Typing Status Formatter (morethanwords #311)
console.log('  Testing typing status formatting...');
assert.strictEqual(governor.formatUserStatus(true, 'typing'), 'typing...');
assert.strictEqual(governor.formatUserStatus(true, 'recording_audio'), 'recording a voice message...');
assert.strictEqual(governor.formatUserStatus(false, 'typing', 30), 'online');
assert.strictEqual(governor.formatUserStatus(false, 'typing', 300), 'last seen 5 minutes ago');
assert.strictEqual(governor.formatUserStatus(false, 'typing', 7200), 'last seen 2 hours ago');
console.log('  ✅ Typing status formatting verified');

// 5. Accessible Download Controls (morethanwords #710)
console.log('  Testing accessible download controls...');
const notDownloaded = governor.getDownloadControlAria('not_downloaded', 'presentation.pdf');
assert.strictEqual(notDownloaded.buttonAction, 'download');
assert.strictEqual(notDownloaded.ariaLabel, 'Download presentation.pdf');

const downloading = governor.getDownloadControlAria('downloading', 'presentation.pdf', 64.2);
assert.strictEqual(downloading.buttonAction, 'pause');
assert.ok(downloading.ariaLabel.includes('64%'));

const downloaded = governor.getDownloadControlAria('downloaded', 'presentation.pdf');
assert.strictEqual(downloaded.buttonAction, 'open');
assert.strictEqual(downloaded.ariaLabel, 'Open presentation.pdf');
console.log('  ✅ Accessible download controls verified');

// 6. Unified Modal Dialog Keyboard Trap (Ajaxy #431)
console.log('  Testing modal keyboard navigation (Enter/Escape)...');
let confirmed = false;
let cancelled = false;

const escRes = governor.handleModalKeyboard('Escape', () => { confirmed = true; }, () => { cancelled = true; });
assert.strictEqual(escRes.handled, true);
assert.strictEqual(escRes.action, 'cancel');
assert.strictEqual(cancelled, true);

const enterRes = governor.handleModalKeyboard('Enter', () => { confirmed = true; }, () => { cancelled = true; });
assert.strictEqual(enterRes.handled, true);
assert.strictEqual(enterRes.action, 'confirm');
assert.strictEqual(confirmed, true);
console.log('  ✅ Modal keyboard navigation verified');

console.log('✨ All Phase 88 Verification Tests Passed 100% Successfully!');
