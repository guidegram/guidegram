import assert from 'node:assert/strict';
import { FileTransferAndReliabilityGovernor } from '../src/services/fileTransferAndReliabilityGovernor.ts';

console.log('🧪 Starting Phase 65 File Transfer & Upload/Download Reliability Verification Suite...');

const governor = new FileTransferAndReliabilityGovernor();

// 1. 64-Bit Chunk Offset Calculation for >2GB Files (tdlib/td #1152)
console.log('  Testing 64-bit BigInt chunk offsets for large files...');
// 3GB file = 3 * 1024 * 1024 * 1024 = 3,221,225,472 bytes (> 2^31 - 1)
const largeFileSize = 3221225472n;
const partSize = 524288; // 512KB
const parts = governor.computeFileParts(largeFileSize, partSize);

assert.ok(parts.length > 6000);
// Check first part
assert.equal(parts[0].partNumber, 0);
assert.equal(parts[0].offset, 0n);
assert.equal(parts[0].size, partSize);
assert.equal(parts[0].isFinal, false);

// Check intermediate part beyond 2GB threshold (> 2147483648)
const latePart = parts[5000];
assert.ok(latePart.offset > 2147483648n, 'Offset must cleanly exceed 32-bit signed integer boundary without overflow');

// Check final part
const finalPart = parts[parts.length - 1];
assert.equal(finalPart.isFinal, true);
assert.equal(finalPart.offset + BigInt(finalPart.size), largeFileSize);
console.log('  ✅ 64-bit chunk offsets verified');

// 2. Final Part Padding Trimmer (morethanwords/tweb #350)
console.log('  Testing final part padding trimmer...');
const paddedBuffer = new Uint8Array(512); // Padded to 512 bytes
paddedBuffer.fill(65, 0, 300); // 300 actual bytes
paddedBuffer.fill(0, 300); // 212 zero padding bytes

const trimmed = governor.trimFinalPartPadding(paddedBuffer, 300);
assert.equal(trimmed.byteLength, 300);
assert.equal(trimmed[0], 65);
assert.equal(trimmed[299], 65);
console.log('  ✅ Final part padding trimmer verified');

// 3. Stalled Download Watchdog (tdlib/td #2585)
console.log('  Testing stalled transfer watchdog evaluation...');
const watchdogState = {
  transferId: 'dl_7781',
  lastProgressTimestamp: 1000,
  bytesTransferred: 500000n,
  totalBytes: 2000000n,
  isStalled: false,
};

// 5 seconds after progress -> healthy
const healthyCheck = governor.evaluateTransferStall(watchdogState, 6000);
assert.equal(healthyCheck.isStalled, false);
assert.equal(healthyCheck.shouldRetryChunk, false);

// 20 seconds after progress (poor network hang) -> stalled!
const stalledCheck = governor.evaluateTransferStall(watchdogState, 21000);
assert.equal(stalledCheck.isStalled, true);
assert.equal(stalledCheck.shouldRetryChunk, true);
console.log('  ✅ Stalled transfer watchdog verified');

// 4. Unicode Filename Sanitization (UnigramDev/Unigram #3222)
console.log('  Testing non-Latin Unicode filename sanitization...');
// Tamil text with illegal Windows colon and asterisk: "தமிழ்:ஆவணம்*2026.pdf"
const tamilRaw = 'தமிழ்:ஆவணம்*2026.pdf';
const tamilSanitized = governor.sanitizeFilename(tamilRaw);
assert.equal(tamilSanitized, 'தமிழ்_ஆவணம்_2026.pdf');
assert.ok(tamilSanitized.includes('தமிழ்'), 'Tamil characters must remain intact in NFC form');

// Persian text with illegal slashes and trailing spaces: "  گزارش / مالی \\ نهایی.xlsx  "
const persianRaw = '  گزارش / مالی \\ نهایی.xlsx  ';
const persianSanitized = governor.sanitizeFilename(persianRaw);
assert.equal(persianSanitized, 'گزارش _ مالی _ نهایی.xlsx');
console.log('  ✅ Unicode filename sanitization verified');

// 5. Collision-Free Filename Resolution (UnigramDev/Unigram #3244)
console.log('  Testing collision-free unique filename resolution...');
const existingFiles = new Set(['invoice.pdf', 'invoice (1).pdf', 'photo.jpg']);

const unique1 = governor.resolveCollisionFreeFilename('invoice.pdf', existingFiles);
assert.equal(unique1, 'invoice (2).pdf');

const unique2 = governor.resolveCollisionFreeFilename('document.docx', existingFiles);
assert.equal(unique2, 'document.docx');
console.log('  ✅ Collision-free filename resolution verified');

// 6. Priority Transfer Multiplexing (tdlib/td #385)
console.log('  Testing priority upload multiplexing (stickers vs large file chunks)...');
// Enqueue 2 large file chunks (Priority 2)
governor.enqueueTransfer({
  id: 'chunk_1',
  type: 'file_chunk',
  priority: 2,
  payloadSize: 524288,
  timestamp: 100,
});
governor.enqueueTransfer({
  id: 'chunk_2',
  type: 'file_chunk',
  priority: 2,
  payloadSize: 524288,
  timestamp: 110,
});

// Now user sends a sticker (Priority 0)
governor.enqueueTransfer({
  id: 'sticker_heart',
  type: 'sticker',
  priority: 0,
  payloadSize: 8192,
  timestamp: 120,
});

// Dequeue should yield the sticker FIRST, despite being enqueued later!
const firstOut = governor.dequeueNextTransfer();
assert.equal(firstOut.id, 'sticker_heart');
assert.equal(firstOut.type, 'sticker');

const secondOut = governor.dequeueNextTransfer();
assert.equal(secondOut.id, 'chunk_1');
console.log('  ✅ Priority upload multiplexing verified');

console.log('✨ All Phase 65 Verification Tests Passed 100% Successfully!');
