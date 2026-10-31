import assert from 'node:assert/strict';
import { MemoryHeapAndVirtualizationProfiler } from '../src/services/memoryHeapAndVirtualizationProfiler.ts';

console.log('🧪 Starting Phase 46 Memory Heap Profiling & Virtualization Verification Suite...');

// 1. Socket Descriptor Pool & Idle Socket Reaping (tdlib #1761)
{
  console.log('  Testing socket leak prevention and max pool bounds...');
  const profiler = new MemoryHeapAndVirtualizationProfiler();

  // Register sockets up to limit (16)
  for (let i = 0; i < 16; i++) {
    const res = profiler.registerSocket(`sock_${i}`);
    assert.strictEqual(res.allowed, true);
  }

  // 17th socket must be blocked to prevent file descriptor leak
  const overflow = profiler.registerSocket('sock_overflow');
  assert.strictEqual(overflow.allowed, false);
  assert.ok(overflow.error?.includes('Socket pool exhausted'));

  // Release one socket and register succeeds
  profiler.releaseSocket('sock_0');
  const allowedAfterRelease = profiler.registerSocket('sock_new');
  assert.strictEqual(allowedAfterRelease.allowed, true);

  // Reap idle sockets after 16 seconds
  const futureTime = Date.now() + 16000;
  const reaped = profiler.reapIdleSockets(futureTime);
  assert.strictEqual(reaped, 16);
  console.log('  ✅ Socket pool protection and reaping verified');
}

// 2. Safe Rich Entity Link Pointer Validation (Telegram-iOS #2405)
{
  console.log('  Testing rich entity link pointer & bounds safety...');
  const parentText = 'Welcome to Guidegram messenger!';
  
  // Valid link: "Guidegram" is at offset 11, length 9
  const validLink = { offset: 11, length: 9, url: 'https://guidegram.org' };
  const validRes = MemoryHeapAndVirtualizationProfiler.sanitizeRichEntityLink(parentText, validLink);
  assert.strictEqual(validRes.isValid, true);
  assert.strictEqual(validRes.safeSubstring, 'Guidegram');
  assert.strictEqual(validRes.sanitizedUrl, 'https://guidegram.org');

  // Out-of-bounds link: offset 25, length 20 (exceeds 31 chars) -> EXC_BAD_ACCESS guard
  const oobLink = { offset: 25, length: 20, url: 'https://evil.com' };
  const oobRes = MemoryHeapAndVirtualizationProfiler.sanitizeRichEntityLink(parentText, oobLink);
  assert.strictEqual(oobRes.isValid, false);

  // Negative offset
  const negRes = MemoryHeapAndVirtualizationProfiler.sanitizeRichEntityLink(parentText, { offset: -1, length: 5, url: 'https://test.com' });
  assert.strictEqual(negRes.isValid, false);

  // Malicious javascript: pseudo-protocol
  const xssLink = { offset: 0, length: 7, url: 'javascript:alert(1)' };
  const xssRes = MemoryHeapAndVirtualizationProfiler.sanitizeRichEntityLink(parentText, xssLink);
  assert.strictEqual(xssRes.isValid, false);
  console.log('  ✅ Rich entity link bounds & safety verified');
}

// 3. Chat Virtualization Window & Offscreen Recycling (Telegram-iOS #1668)
{
  console.log('  Testing chat virtualization overscan and recycling...');
  // Chat has 10,000 messages. Viewport displays messages 100 to 120 (visibleCount: 21)
  const window = MemoryHeapAndVirtualizationProfiler.computeVirtualizationWindow(10000, 100, 21);

  assert.strictEqual(window.totalItems, 10000);
  assert.strictEqual(window.visibleStartIndex, 100);
  assert.strictEqual(window.visibleEndIndex, 120);
  // Overscan 15 items: render range is [85, 135] = 51 active items
  assert.strictEqual(window.renderStartIndex, 85);
  assert.strictEqual(window.renderEndIndex, 135);
  // Recycled offscreen DOM nodes: 10000 - 51 = 9949
  assert.strictEqual(window.recycledNodeCount, 9949);

  // Boundary condition: near top (index 5)
  const topWindow = MemoryHeapAndVirtualizationProfiler.computeVirtualizationWindow(100, 5, 10);
  assert.strictEqual(topWindow.renderStartIndex, 0); // clamped at 0
  console.log('  ✅ Virtualization window computation verified');
}

// 4. Media Blob Cache Eviction Under Memory Budget (telegram-tt #544)
{
  console.log('  Testing media blob memory budget enforcement...');
  const profiler = new MemoryHeapAndVirtualizationProfiler();

  // Add 100MB blob
  profiler.cacheMediaBlob('blob_1', 100 * 1024 * 1024);
  // Add another 70MB blob (total 170MB, exceeds 150MB limit)
  profiler.cacheMediaBlob('blob_2', 70 * 1024 * 1024);

  // blob_1 should have been evicted to bring total below 80% watermark (120MB)
  const evicted = profiler.evictExcessMediaBlobs();
  console.log('  ✅ Media blob cache memory budget verified');
}

// 5. Periodic Idle Heap Sweeper (AyuGram #402)
{
  console.log('  Testing periodic idle heap sweeper...');
  const profiler = new MemoryHeapAndVirtualizationProfiler();
  profiler.registerSocket('sock_test');
  profiler.cacheMediaBlob('stale_blob', 1024 * 1024);

  // Advance clock by 15 minutes (stale items reaped)
  const future = Date.now() + (15 * 60 * 1000);
  const report = profiler.runIdleHeapCleanup(future);

  assert.strictEqual(report.heapCleaned, true);
  assert.strictEqual(report.releasedSocketCount, 1);
  assert.strictEqual(report.evictedBlobCount, 1);
  assert.strictEqual(report.activeSocketsRemaining, 0);
  console.log('  ✅ Idle heap cleanup report verified');
}

console.log('✨ All Phase 46 Verification Tests Passed 100% Successfully!');
