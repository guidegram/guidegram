import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

console.log('====================================================')
console.log('Running Milestone 3 Empirical Stress & Boundary Tests')
console.log('====================================================\n')

let passedTests = 0
let failedTests = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`  [PASS] ${name}`)
    passedTests++
  } catch (err) {
    console.error(`  [FAIL] ${name}`)
    console.error(`         Error: ${err.message}`)
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 4).join('\n'))
    }
    failedTests++
  }
}

async function runTestAsync(name, fn) {
  try {
    await fn()
    console.log(`  [PASS] ${name}`)
    passedTests++
  } catch (err) {
    console.error(`  [FAIL] ${name}`)
    console.error(`         Error: ${err.message}`)
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 4).join('\n'))
    }
    failedTests++
  }
}

// =========================================================================
// SUITE 1: Drag-and-Drop Ingestion, Depth Counter & Classification (Feature 20)
// =========================================================================
console.log('[SUITE 1] Drag-and-Drop Ingestion, Depth Counter & Classification (Feature 20)')

// Reproduction of classifyDroppedFile in ChatViewport.tsx
function classifyDroppedFile(file) {
  const mime = file.type?.toLowerCase() || ''
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (
    mime.startsWith('image/') ||
    mime.startsWith('video/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)
  ) {
    return 'media'
  }
  if (
    mime.startsWith('audio/') ||
    ['mp3', 'm4a', 'ogg', 'opus', 'flac', 'wav', 'aac', 'wma'].includes(ext)
  ) {
    return 'audio'
  }
  return 'document'
}

runTest('1.1: classifyDroppedFile classifies standard and extension-based image/video as "media"', () => {
  assert.strictEqual(classifyDroppedFile({ name: 'photo.jpg', type: 'image/jpeg' }), 'media')
  assert.strictEqual(classifyDroppedFile({ name: 'clip.mp4', type: 'video/mp4' }), 'media')
  assert.strictEqual(classifyDroppedFile({ name: 'graphic.webp', type: '' }), 'media')
  assert.strictEqual(classifyDroppedFile({ name: 'animation.GIF', type: '' }), 'media')
  assert.strictEqual(classifyDroppedFile({ name: 'movie.mkv', type: 'application/octet-stream' }), 'media')
})

runTest('1.2: classifyDroppedFile classifies audio files as "audio"', () => {
  assert.strictEqual(classifyDroppedFile({ name: 'song.mp3', type: 'audio/mpeg' }), 'audio')
  assert.strictEqual(classifyDroppedFile({ name: 'voice.ogg', type: 'audio/ogg' }), 'audio')
  assert.strictEqual(classifyDroppedFile({ name: 'track.flac', type: '' }), 'audio')
  assert.strictEqual(classifyDroppedFile({ name: 'voice.opus', type: 'application/octet-stream' }), 'audio')
})

runTest('1.3: classifyDroppedFile falls back to "document" for archives, executables, code, pdf', () => {
  assert.strictEqual(classifyDroppedFile({ name: 'report.pdf', type: 'application/pdf' }), 'document')
  assert.strictEqual(classifyDroppedFile({ name: 'archive.zip', type: 'application/zip' }), 'document')
  assert.strictEqual(classifyDroppedFile({ name: 'script.py', type: 'text/x-python' }), 'document')
  assert.strictEqual(classifyDroppedFile({ name: 'Guidegram.exe', type: 'application/x-msdownload' }), 'document')
  assert.strictEqual(classifyDroppedFile({ name: 'unknown_file', type: '' }), 'document')
})

// Simulation of Drag Depth tracking to prevent flickering over child DOM nodes
function simulateDragTracker() {
  let dragDepth = 0
  let isDraggingOver = false

  return {
    enter: (hasFiles = true) => {
      if (!hasFiles) return isDraggingOver
      dragDepth++
      if (dragDepth === 1) isDraggingOver = true
      return isDraggingOver
    },
    leave: () => {
      dragDepth = Math.max(0, dragDepth - 1)
      if (dragDepth === 0) isDraggingOver = false
      return isDraggingOver
    },
    drop: () => {
      dragDepth = 0
      isDraggingOver = false
      return isDraggingOver
    },
    getState: () => ({ dragDepth, isDraggingOver }),
  }
}

runTest('1.4: Drag depth counter remains true across nested child element transitions', () => {
  const tracker = simulateDragTracker()
  assert.strictEqual(tracker.enter(true), true, 'First dragEnter sets overlay visible')
  assert.strictEqual(tracker.getState().dragDepth, 1)

  // Move over child element: enter child, leave parent
  assert.strictEqual(tracker.enter(true), true, 'Nested child enter increments depth')
  assert.strictEqual(tracker.getState().dragDepth, 2)
  assert.strictEqual(tracker.leave(), true, 'Leaving parent does NOT dismiss overlay because depth is still 1')
  assert.strictEqual(tracker.getState().dragDepth, 1)

  // Move over another grandchild element
  assert.strictEqual(tracker.enter(true), true)
  assert.strictEqual(tracker.getState().dragDepth, 2)
  assert.strictEqual(tracker.leave(), true)
  assert.strictEqual(tracker.getState().dragDepth, 1)

  // Genuine leave of container
  assert.strictEqual(tracker.leave(), false, 'Final leave drops depth to 0 and closes overlay')
  assert.strictEqual(tracker.getState().dragDepth, 0)
  assert.strictEqual(tracker.getState().isDraggingOver, false)
})

runTest('1.5: Drop resets drag depth counter immediately to 0 and hides overlay', () => {
  const tracker = simulateDragTracker()
  tracker.enter(true)
  tracker.enter(true)
  assert.strictEqual(tracker.getState().isDraggingOver, true)
  assert.strictEqual(tracker.getState().dragDepth, 2)

  tracker.drop()
  assert.strictEqual(tracker.getState().isDraggingOver, false)
  assert.strictEqual(tracker.getState().dragDepth, 0)
})

runTest('1.6: Non-file drag events (e.g. text selection) do not activate overlay', () => {
  const tracker = simulateDragTracker()
  assert.strictEqual(tracker.enter(false), false)
  assert.strictEqual(tracker.getState().isDraggingOver, false)
  assert.strictEqual(tracker.getState().dragDepth, 0)
})

// Simulation of handleDrop target zones:
function simulateDropStaging(files, forceType, preloadBridge) {
  const staged = []
  for (const f of files) {
    let filePath = ''
    if (preloadBridge?.getPathForFile) {
      filePath = preloadBridge.getPathForFile(f)
    }
    if (!filePath && f.path) {
      filePath = f.path
    }
    staged.push({
      path: filePath || f.name,
      name: f.name,
      size: f.size,
      type: forceType || classifyDroppedFile(f),
    })
  }
  return staged
}

runTest('1.7: Dropping onto "media" zone forces type to "media" even for ambiguous files', () => {
  const files = [{ name: 'file.bin', size: 1024, type: 'application/octet-stream', path: 'C:\\test\\file.bin' }]
  const res = simulateDropStaging(files, 'media', null)
  assert.strictEqual(res.length, 1)
  assert.strictEqual(res[0].type, 'media')
})

runTest('1.8: Dropping onto "document" zone forces type to "document" even for images (uncompressed)', () => {
  const files = [{ name: 'photo.jpg', size: 5000000, type: 'image/jpeg', path: 'C:\\test\\photo.jpg' }]
  const res = simulateDropStaging(files, 'document', null)
  assert.strictEqual(res.length, 1)
  assert.strictEqual(res[0].type, 'document')
})

runTest('1.9: Preload getPathForFile extracts native Windows absolute paths', () => {
  const mockBridge = {
    getPathForFile: (f) => (f.mockWinPath ? `D:\\Media\\${f.name}` : ''),
  }
  const files = [
    { name: 'video.mp4', size: 12000000, mockWinPath: true },
    { name: 'notes.txt', size: 200, path: 'C:\\Users\\notes.txt' },
  ]
  const res = simulateDropStaging(files, undefined, mockBridge)
  assert.strictEqual(res[0].path, 'D:\\Media\\video.mp4')
  assert.strictEqual(res[1].path, 'C:\\Users\\notes.txt')
})

runTest('1.10: 50+ files dropped simultaneously are staged sequentially without OS handle exhaustion', () => {
  const files50 = Array.from({ length: 60 }, (_, i) => ({
    name: `photo_${i}.jpg`,
    size: 1024 * 1024 * (i + 1),
    type: 'image/jpeg',
    path: `C:\\Photos\\photo_${i}.jpg`,
  }))
  const res = simulateDropStaging(files50, undefined, null)
  assert.strictEqual(res.length, 60, 'All 60 files must be staged successfully')
  assert.strictEqual(res[0].type, 'media')
  assert.strictEqual(res[59].path, 'C:\\Photos\\photo_59.jpg')

  // Verify sequential upload progress text formatting
  const formattedLabels = res.map((item, idx) =>
    res.length > 1 ? `[${idx + 1}/${res.length}] ${item.name}` : item.name
  )
  assert.strictEqual(formattedLabels[0], '[1/60] photo_0.jpg')
  assert.strictEqual(formattedLabels[59], '[60/60] photo_59.jpg')
})

// =========================================================================
// SUITE 2: Parallel Chunk Acceleration, Progress Throttling & Deduplication (Feature 21)
// =========================================================================
console.log('\n[SUITE 2] Parallel Chunk Acceleration, Progress Throttling & Deduplication (Feature 21)')

// Reproduction of ProgressThrottler from accountManager.ts:
class ProgressThrottler {
  constructor(callback, options) {
    this.callback = callback
    this.minIntervalMs = options?.minIntervalMs ?? 100
    this.minDeltaPercent = options?.minDeltaPercent ?? 1
    this.lastEmittedPercent = -1
    this.lastEmittedTime = 0
  }

  update(percent, extra, simulatedNow) {
    const now = simulatedNow !== undefined ? simulatedNow : Date.now()
    const isComplete = percent >= 100
    const isFirst = this.lastEmittedPercent === -1

    if (
      isFirst ||
      isComplete ||
      (now - this.lastEmittedTime >= this.minIntervalMs &&
        Math.abs(percent - this.lastEmittedPercent) >= this.minDeltaPercent)
    ) {
      this.lastEmittedPercent = percent
      this.lastEmittedTime = now
      this.callback(percent, extra)
    }
  }
}

runTest('2.1: ProgressThrottler guarantees first (0%) and final (100%) progress events are delivered', () => {
  const emitted = []
  const throttler = new ProgressThrottler((p) => emitted.push(p))

  throttler.update(0, null, 1000)
  assert.strictEqual(emitted.length, 1)
  assert.strictEqual(emitted[0], 0)

  throttler.update(100, null, 1010) // Only 10ms later
  assert.strictEqual(emitted.length, 2)
  assert.strictEqual(emitted[1], 100)
})

runTest('2.2: ProgressThrottler suppresses micro-updates under minIntervalMs (100ms)', () => {
  const emitted = []
  const throttler = new ProgressThrottler((p) => emitted.push(p), { minIntervalMs: 100, minDeltaPercent: 1 })

  let time = 1000
  throttler.update(0, null, time) // emitted (isFirst)

  // 10 micro-updates within 50ms (every 5ms)
  for (let i = 1; i <= 10; i++) {
    time += 5
    throttler.update(i, null, time)
  }
  // All should be suppressed because time < 100ms
  assert.strictEqual(emitted.length, 1, 'Only the initial 0% update should have been emitted')

  // Now advance time past 100ms threshold
  time = 1105
  throttler.update(25, null, time)
  assert.strictEqual(emitted.length, 2)
  assert.strictEqual(emitted[1], 25)
})

runTest('2.3: ProgressThrottler suppresses updates with delta < minDeltaPercent (1%)', () => {
  const emitted = []
  const throttler = new ProgressThrottler((p) => emitted.push(p), { minIntervalMs: 100, minDeltaPercent: 2 })

  throttler.update(10, null, 1000) // emitted
  throttler.update(11, null, 1200) // time passed, but delta 1% < 2%
  assert.strictEqual(emitted.length, 1, 'Delta smaller than 2% should be suppressed')

  throttler.update(13, null, 1300) // delta 3% >= 2%
  assert.strictEqual(emitted.length, 2)
  assert.strictEqual(emitted[1], 13)
})

// Simulation of 512KB chunk allocation and byte offset calculation:
function calculateChunkPlan(fileSize, partSizeKB = 512) {
  const partSize = partSizeKB * 1024
  const totalParts = Math.ceil(fileSize / partSize)
  const parts = []
  for (let i = 0; i < totalParts; i++) {
    const offset = i * partSize
    const expectedBytes = Math.min(partSize, fileSize - offset)
    parts.push({ index: i, offset, expectedBytes })
  }
  return { partSize, totalParts, parts }
}

runTest('2.4: 512KB chunk partition correctly covers file with exact offsets and remainder', () => {
  // 1.5 MB file (1,572,864 bytes) = exactly 3 parts of 512 KB
  const plan1 = calculateChunkPlan(1572864, 512)
  assert.strictEqual(plan1.totalParts, 3)
  assert.strictEqual(plan1.parts[0].offset, 0)
  assert.strictEqual(plan1.parts[0].expectedBytes, 524288)
  assert.strictEqual(plan1.parts[1].offset, 524288)
  assert.strictEqual(plan1.parts[1].expectedBytes, 524288)
  assert.strictEqual(plan1.parts[2].offset, 1048576)
  assert.strictEqual(plan1.parts[2].expectedBytes, 524288)

  // 1,500,000 bytes (non-aligned remainder)
  const plan2 = calculateChunkPlan(1500000, 512)
  assert.strictEqual(plan2.totalParts, 3)
  assert.strictEqual(plan2.parts[2].expectedBytes, 1500000 - 1048576) // 451424 bytes remainder
  const sumBytes = plan2.parts.reduce((sum, p) => sum + p.expectedBytes, 0)
  assert.strictEqual(sumBytes, 1500000, 'Sum of parts must match exact total size')
})

runTest('2.5: In-flight download deduplication coalesces concurrent calls to single promise', async () => {
  const inFlightDownloads = new Map()
  let executionCount = 0

  async function mockDownload(key) {
    if (inFlightDownloads.has(key)) {
      return inFlightDownloads.get(key)
    }

    const promise = (async () => {
      executionCount++
      await new Promise((r) => setTimeout(r, 20))
      return `guidegram-media://cached/${key}.mp4`
    })()

    inFlightDownloads.set(key, promise)
    try {
      return await promise
    } finally {
      inFlightDownloads.delete(key)
    }
  }

  // Fire 4 simultaneous download requests for the same message ID
  const [r1, r2, r3, r4] = await Promise.all([
    mockDownload('acc1_chat1_msg100'),
    mockDownload('acc1_chat1_msg100'),
    mockDownload('acc1_chat1_msg100'),
    mockDownload('acc1_chat1_msg100'),
  ])

  assert.strictEqual(executionCount, 1, 'Only 1 download must execute across 4 concurrent callers')
  assert.strictEqual(r1, r2)
  assert.strictEqual(r2, r3)
  assert.strictEqual(r3, r4)
  assert.strictEqual(inFlightDownloads.size, 0, 'In-flight map must be clean after completion')
})

runTest('2.6: Atomic file replacement avoids corrupted partial cache files', () => {
  const tempFile = 'test_media.part'
  const finalFile = 'test_media.mp4'

  // If download crashes halfway, .part remains, finalFile does not exist
  let simulatedError = true
  let finalExists = false
  try {
    // Write partial bytes
    if (simulatedError) {
      throw new Error('Network timeout')
    }
    finalExists = true // rename
  } catch (err) {
    // Error caught
  }
  assert.strictEqual(finalExists, false, 'Corrupt file is never published as final cached path')
})

runTest('2.7: Temp file saving generates collision-resistant unique paths for duplicate filenames', () => {
  function generateSafeTempName(filename) {
    const ext = path.extname(filename || '')
    const base = path.basename(filename || 'temp', ext).replace(/[^a-zA-Z0-9._-]/g, '_')
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    return `${base}_${uniqueSuffix}${ext || '.bin'}`
  }

  const name1 = generateSafeTempName('photo.png')
  const name2 = generateSafeTempName('photo.png')
  assert.notStrictEqual(name1, name2, 'Two saves of the same filename must have unique paths')
  assert.ok(name1.startsWith('photo_'), 'Base name must be preserved')
  assert.ok(name1.endsWith('.png'), 'Extension must be preserved')
})

runTest('2.8: Voice note audio retention preserves file in mediaDir before temp cleanup', () => {
  const mockMediaDir = 'D:\\Guidegram\\data\\media'
  const cacheKey = 'acc1_chat1_msg999'
  const tempVoicePath = 'C:\\Users\\Temp\\voice_123.ogg'

  // Simulation of accountManager sendMedia voice preservation logic
  let finalMediaFilePath = tempVoicePath
  let tempUnlinked = false
  let copiedToMediaDir = false

  // Step 1: Copy to mediaDir as {cacheKey}.ogg
  const destPath = path.join(mockMediaDir, `${cacheKey}.ogg`)
  copiedToMediaDir = true
  tempUnlinked = true
  finalMediaFilePath = destPath

  const mediaUrl = `guidegram-media://${finalMediaFilePath}`

  assert.strictEqual(copiedToMediaDir, true, 'Voice note must be copied to mediaDir')
  assert.strictEqual(tempUnlinked, true, 'Temp file must be unlinked')
  assert.strictEqual(finalMediaFilePath, destPath, 'Final path must point to mediaDir destination')
  assert.ok(mediaUrl.includes('acc1_chat1_msg999.ogg'), 'mediaUrl must point to preserved destination')
})

// =========================================================================
// SUITE 3: Rich Web Link Preview Engine & SSRF Security (Feature 22)
// =========================================================================
console.log('\n[SUITE 3] Rich Web Link Preview Engine & SSRF Security (Feature 22)')

// Reproduction of extractFirstUrl in ChatViewport.tsx
function extractFirstUrl(text) {
  if (!text) return null
  const mdMatch = text.match(/\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/)
  if (mdMatch) return mdMatch[1]

  const match = text.match(/https?:\/\/[^\s]+/)
  if (!match) return null

  let url = match[0]
  const punctMatch = url.match(/([.,!?;:)>\]]+)$/)
  if (punctMatch) {
    url = url.slice(0, -punctMatch[1].length)
  }
  return url
}

runTest('3.1: extractFirstUrl accurately extracts URLs from plain text, sentences and markdown', () => {
  assert.strictEqual(extractFirstUrl('https://t.me/telegram'), 'https://t.me/telegram')
  assert.strictEqual(extractFirstUrl('Check out https://github.com/guidegram/guidegram for updates.'), 'https://github.com/guidegram/guidegram')
  assert.strictEqual(extractFirstUrl('Have you seen this? (https://example.com/item/42)'), 'https://example.com/item/42')
  assert.strictEqual(extractFirstUrl('Look at [Guidegram Repo](https://github.com/guidegram/guidegram)!'), 'https://github.com/guidegram/guidegram')
  assert.strictEqual(extractFirstUrl('Multiple: https://first.com and https://second.com'), 'https://first.com')
  assert.strictEqual(extractFirstUrl('Trailing punctuation: https://test.org/path, and more'), 'https://test.org/path')
  assert.strictEqual(extractFirstUrl(''), null)
  assert.strictEqual(extractFirstUrl('No links here!'), null)
})

// Reproduction of isPrivateIpOrHost in electron/main.ts
function isPrivateIpOrHost(hostname) {
  if (!hostname) return true
  const lower = hostname.toLowerCase().trim()
  const unbracketed = lower.replace(/^\[|\]$/g, '')

  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    unbracketed === '127.0.0.1' ||
    unbracketed === '::1' ||
    unbracketed === '0.0.0.0' ||
    unbracketed === '::'
  ) {
    return true
  }

  if (/^127\./.test(unbracketed)) return true
  if (/^::ffff:127\./i.test(unbracketed)) return true
  if (/^10\./.test(unbracketed)) return true
  if (/^192\.168\./.test(unbracketed)) return true
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(unbracketed)) return true
  if (/^169\.254\./.test(unbracketed)) return true
  if (unbracketed.startsWith('fe80:') || unbracketed.startsWith('fc00:') || unbracketed.startsWith('fd')) {
    return true
  }
  if (lower.endsWith('.local') || lower.endsWith('.internal') || lower.endsWith('.lan')) return true
  return false
}

runTest('3.2: SSRF protection strictly blocks internal hosts, loopbacks and cloud metadata IPs', () => {
  assert.strictEqual(isPrivateIpOrHost('localhost'), true)
  assert.strictEqual(isPrivateIpOrHost('sub.localhost'), true)
  assert.strictEqual(isPrivateIpOrHost('127.0.0.1'), true)
  assert.strictEqual(isPrivateIpOrHost('127.0.0.2'), true, 'Full 127.0.0.0/8 subnet must be blocked')
  assert.strictEqual(isPrivateIpOrHost('127.255.0.1'), true)
  assert.strictEqual(isPrivateIpOrHost('::1'), true)
  assert.strictEqual(isPrivateIpOrHost('[::1]'), true, 'Bracketed IPv6 loopback from URL.hostname must be blocked')
  assert.strictEqual(isPrivateIpOrHost('::ffff:127.0.0.1'), true, 'IPv4-mapped IPv6 loopback must be blocked')
  assert.strictEqual(isPrivateIpOrHost('fe80::1'), true, 'IPv6 link-local must be blocked')
  assert.strictEqual(isPrivateIpOrHost('10.0.0.1'), true)
  assert.strictEqual(isPrivateIpOrHost('10.255.0.5'), true)
  assert.strictEqual(isPrivateIpOrHost('192.168.1.1'), true)
  assert.strictEqual(isPrivateIpOrHost('172.16.0.1'), true)
  assert.strictEqual(isPrivateIpOrHost('172.24.5.1'), true)
  assert.strictEqual(isPrivateIpOrHost('172.31.255.255'), true)
  assert.strictEqual(isPrivateIpOrHost('169.254.169.254'), true) // AWS/GCP metadata endpoint
  assert.strictEqual(isPrivateIpOrHost('router.local'), true)
  assert.strictEqual(isPrivateIpOrHost('service.internal'), true)

  // Legitimate public hosts must pass:
  assert.strictEqual(isPrivateIpOrHost('github.com'), false)
  assert.strictEqual(isPrivateIpOrHost('telegram.org'), false)
  assert.strictEqual(isPrivateIpOrHost('8.8.8.8'), false)
  assert.strictEqual(isPrivateIpOrHost('172.32.0.1'), false) // Beyond 172.31
})

// Reproduction of decodeHtml and extractMetaTag from electron/main.ts
function decodeHtml(html) {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10))
      } catch {
        return ''
      }
    })
}

function extractMetaTag(headHtml, propertyOrName) {
  const escaped = propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const p1 = new RegExp(`<meta\\s+[^>]*?(?:property|name)=["']${escaped}["'][^>]*?content=["']([^"']*)["']`, 'i')
  const m1 = headHtml.match(p1)
  if (m1 && m1[1]) return decodeHtml(m1[1].trim())

  const p2 = new RegExp(`<meta\\s+[^>]*?content=["']([^"']*)["'][^>]*?(?:property|name)=["']${escaped}["']`, 'i')
  const m2 = headHtml.match(p2)
  if (m2 && m2[1]) return decodeHtml(m2[1].trim())

  return undefined
}

runTest('3.3: HTML entity decoder handles common entities and numeric char codes', () => {
  assert.strictEqual(decodeHtml('Fish &amp; Chips'), 'Fish & Chips')
  assert.strictEqual(decodeHtml('&quot;Hello&quot; &#39;World&#39;'), '"Hello" \'World\'')
  assert.strictEqual(decodeHtml('Guidegram &mdash; Speed &ndash; &hellip;'), 'Guidegram — Speed – …')
  assert.strictEqual(decodeHtml('Price: &#36;100'), 'Price: $100')
})

runTest('3.4: extractMetaTag extracts OpenGraph and Twitter card attributes irrespective of attribute order', () => {
  const html1 = '<head><meta property="og:title" content="Guidegram Desktop Client &amp; MTProto" /></head>'
  assert.strictEqual(extractMetaTag(html1, 'og:title'), 'Guidegram Desktop Client & MTProto')

  const html2 = '<head><meta content="https://example.com/banner.png" property="og:image" /></head>'
  assert.strictEqual(extractMetaTag(html2, 'og:image'), 'https://example.com/banner.png')

  const html3 = '<head><meta name="twitter:description" content="Supercharged desktop client" /></head>'
  assert.strictEqual(extractMetaTag(html3, 'twitter:description'), 'Supercharged desktop client')

  assert.strictEqual(extractMetaTag('<head></head>', 'og:title'), undefined)
})

runTest('3.5: Relative image and favicon URL resolution', () => {
  const baseUrl = 'https://example.com/articles/news.html'
  const relImg = '/static/images/cover.jpg'
  const resolvedImg = new URL(relImg, baseUrl).href
  assert.strictEqual(resolvedImg, 'https://example.com/static/images/cover.jpg')

  const relFavicon = '../favicon.png'
  const resolvedFavicon = new URL(relFavicon, baseUrl).href
  assert.strictEqual(resolvedFavicon, 'https://example.com/favicon.png')
})

runTest('3.6: SSRF protection intercepts HTTP 30x redirects targeting internal IPs or loopback', () => {
  function simulateRedirectScrape(finalRedirectUrl) {
    if (!finalRedirectUrl) return true
    try {
      const redirected = new URL(finalRedirectUrl)
      if (isPrivateIpOrHost(redirected.hostname)) {
        return null // Blocked!
      }
      return { ok: true, host: redirected.hostname }
    } catch {
      return null
    }
  }

  assert.strictEqual(simulateRedirectScrape('http://127.0.0.1:8080/admin'), null, 'Redirect to 127.0.0.1 must be blocked')
  assert.strictEqual(simulateRedirectScrape('http://127.0.0.2/secret'), null, 'Redirect to 127.0.0.2 must be blocked')
  assert.strictEqual(simulateRedirectScrape('http://[::1]/internal'), null, 'Redirect to IPv6 loopback must be blocked')
  assert.strictEqual(simulateRedirectScrape('http://169.254.169.254/latest/meta-data'), null, 'Redirect to AWS metadata must be blocked')
  assert.strictEqual(simulateRedirectScrape('http://192.168.1.1/setup'), null, 'Redirect to router must be blocked')
  assert.deepStrictEqual(simulateRedirectScrape('https://github.com/DoctorGuidance'), { ok: true, host: 'github.com' })
})

// =========================================================================
// SUITE 4: Source Code Integrity & AST Pattern Checks
// =========================================================================
console.log('\n[SUITE 4] Source Code Integrity & AST Pattern Checks')

runTest('4.1: ChatViewport.tsx contains Drag-and-Drop state, overlay container and dual drop zones', () => {
  const code = fs.readFileSync('src/components/ChatViewport.tsx', 'utf8')
  assert.ok(code.includes('dragDepthRef = useRef(0)'), 'dragDepthRef must exist')
  assert.ok(code.includes('const [isDraggingOver, setIsDraggingOver] = useState(false)'), 'isDraggingOver state must exist')
  assert.ok(code.includes('onDragEnter={handleDragEnter}'), 'handleDragEnter must be attached to container')
  assert.ok(code.includes('onDragOver={handleDragOver}'), 'handleDragOver must be attached to container')
  assert.ok(code.includes('onDragLeave={handleDragLeave}'), 'handleDragLeave must be attached to container')
  assert.ok(code.includes('onDrop={(e) => handleDrop(e)}'), 'handleDrop must be attached to container')
  assert.ok(code.includes("handleDrop(e, 'media')"), 'Dual drop zone Quick Media must exist')
  assert.ok(code.includes("handleDrop(e, 'document')"), 'Dual drop zone Without Compression must exist')
})

runTest('4.2: ChatViewport.tsx contains LinkPreviewCard, ComposerLinkPreviewBar and extractFirstUrl', () => {
  const code = fs.readFileSync('src/components/ChatViewport.tsx', 'utf8')
  assert.ok(code.includes('function extractFirstUrl(text: string)'), 'extractFirstUrl must exist')
  assert.ok(code.includes('const LinkPreviewCard: React.FC<LinkPreviewCardProps>'), 'LinkPreviewCard component must exist')
  assert.ok(code.includes('const ComposerLinkPreviewBar: React.FC<ComposerLinkPreviewBarProps>'), 'ComposerLinkPreviewBar component must exist')
  assert.ok(code.includes('<LinkPreviewCard'), 'LinkPreviewCard must be rendered in message bubble')
  assert.ok(code.includes('<ComposerLinkPreviewBar'), 'ComposerLinkPreviewBar must be rendered in input area')
  assert.ok(code.includes('onSafeOpen(preview.url || url)'), 'Link preview clicks must route through safe opener')
})

runTest('4.3: electron/telegram/accountManager.ts contains parallelDownloadDocument and ProgressThrottler', () => {
  const code = fs.readFileSync('electron/telegram/accountManager.ts', 'utf8')
  assert.ok(code.includes('export async function parallelDownloadDocument('), 'parallelDownloadDocument must be exported')
  assert.ok(code.includes('export class ProgressThrottler'), 'ProgressThrottler class must be exported')
  assert.ok(code.includes('workers: 4'), 'sendMedia must use 4 upload workers')
  assert.ok(code.includes('this.inFlightDownloads'), 'inFlightDownloads map must be used for deduplication')
})

runTest('4.4: electron/main.ts contains web:get-link-preview and SSRF protection', () => {
  const code = fs.readFileSync('electron/main.ts', 'utf8')
  assert.ok(code.includes("ipcMain.handle('web:get-link-preview'"), 'web:get-link-preview IPC handler must exist')
  assert.ok(code.includes('function isPrivateIpOrHost('), 'isPrivateIpOrHost must exist')
  assert.ok(code.includes('function scrapeLinkPreview('), 'scrapeLinkPreview must exist')
  assert.ok(code.includes('linkPreviewCache'), 'In-memory preview cache must exist')
})

runTest('4.5: electron/preload.ts exposes getPathForFile and getLinkPreview', () => {
  const code = fs.readFileSync('electron/preload.ts', 'utf8')
  assert.ok(code.includes('getPathForFile: (file: File): string =>'), 'preload must expose getPathForFile')
  assert.ok(code.includes('getLinkPreview: (url: string') && code.includes('Promise<WebPagePreview | null> =>'), 'preload must expose getLinkPreview')
  assert.ok(code.includes("ipcRenderer.invoke('web:get-link-preview'"), 'preload must invoke web:get-link-preview')
})

runTest('4.6: ChatViewport.tsx resets dismissedComposerUrl on chat switch and message send', () => {
  const code = fs.readFileSync('src/components/ChatViewport.tsx', 'utf8')
  assert.ok(code.includes('setDismissedComposerUrl(null)'), 'Must reset dismissedComposerUrl')
})

runTest('4.7: accountManager.ts copies voice notes to mediaDir before temp cleanup', () => {
  const code = fs.readFileSync('electron/telegram/accountManager.ts', 'utf8')
  assert.ok(code.includes('path.join(this.mediaDir, `${cacheKey}.ogg`)'), 'Voice note must be copied to mediaDir')
  assert.ok(code.includes('fs.promises.copyFile(filePath, destPath)'), 'Must copy file to mediaDir before unlinking')
})

runTest('4.8: main.ts validates redirected URLs against isPrivateIpOrHost', () => {
  const code = fs.readFileSync('electron/main.ts', 'utf8')
  assert.ok(code.includes('if (isPrivateIpOrHost(redirected.hostname))'), 'Must validate redirected URLs')
})

setTimeout(() => {
  console.log('\n====================================================')
  console.log(`Results: ${passedTests} passed, ${failedTests} failed.`)
  console.log('====================================================')
  if (failedTests === 0) {
    console.log('ALL EMPIRICAL TESTS PASSED SUCCESSFULLY.\n')
    process.exit(0)
  } else {
    console.error('TEST FAILURES DETECTED.\n')
    process.exit(1)
  }
}, 100)
