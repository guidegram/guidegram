import { MediaStreamValidator } from '../electron/mediaStreamValidator.ts'
import fs from 'fs'
import path from 'path'
import os from 'os'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`)
    failed++
    process.exitCode = 1
  } else {
    console.log(`✅ PASS: ${message}`)
    passed++
  }
}

async function runTests() {
  console.log('🧪 Starting Media Stream & Range Header Validation Suite (RFC 9110 / Layer 11)...')
  MediaStreamValidator.resetTelemetry()

  const totalSize = 1000 // 1000 bytes file

  // Test 1: Closed Range (bytes=0-499)
  console.log('\n--- Test 1: Closed Range (bytes=0-499) ---')
  const res1 = MediaStreamValidator.parseRangeHeader('bytes=0-499', totalSize)
  assert(res1.hasRange === true && res1.isSatisfiable === true, 'Closed range parsed successfully')
  assert(res1.bounds.start === 0, 'Start offset is 0')
  assert(res1.bounds.end === 499, 'End offset is 499')
  assert(res1.bounds.chunkSize === 500, 'Chunk size is 500')

  // Test 2: Prefix Range (bytes=500-)
  console.log('\n--- Test 2: Prefix Range (bytes=500-) ---')
  const res2 = MediaStreamValidator.parseRangeHeader('bytes=500-', totalSize)
  assert(res2.hasRange === true && res2.isSatisfiable === true, 'Prefix range parsed successfully')
  assert(res2.bounds.start === 500, 'Start offset is 500')
  assert(res2.bounds.end === 999, 'End offset is 999')
  assert(res2.bounds.chunkSize === 500, 'Chunk size is 500')

  // Test 3: Suffix Range (bytes=-300, meaning last 300 bytes)
  console.log('\n--- Test 3: Suffix Range (bytes=-300) ---')
  const res3 = MediaStreamValidator.parseRangeHeader('bytes=-300', totalSize)
  assert(res3.hasRange === true && res3.isSatisfiable === true, 'Suffix range parsed successfully')
  assert(res3.bounds.start === 700, 'Start offset is 700 (1000 - 300)')
  assert(res3.bounds.end === 999, 'End offset is 999')
  assert(res3.bounds.chunkSize === 300, 'Chunk size is 300')

  // Test 4: Range Out of Bounds (416 Not Satisfiable)
  console.log('\n--- Test 4: Range Out of Bounds (416) ---')
  const res4 = MediaStreamValidator.parseRangeHeader('bytes=1500-2000', totalSize)
  assert(res4.hasRange === true && res4.isSatisfiable === false, 'Out-of-bounds start marked unsatisfiable')
  assert(res4.reason.includes('Range out of bounds'), 'Reason identifies out-of-bounds range')

  // Test 5: Inverted Range (start > end)
  console.log('\n--- Test 5: Inverted Range (start > end) ---')
  const res5 = MediaStreamValidator.parseRangeHeader('bytes=500-200', totalSize)
  assert(res5.hasRange === true && res5.isSatisfiable === false, 'Inverted range marked unsatisfiable')

  // Test 6: Malformed Range Header
  console.log('\n--- Test 6: Malformed Range Format ---')
  const res6 = MediaStreamValidator.parseRangeHeader('bytes=invalid-garbage', totalSize)
  assert(res6.hasRange === true && res6.isSatisfiable === false, 'Malformed range handled safely without crashing')

  // Test 7: Non-range request
  console.log('\n--- Test 7: Non-Range Request ---')
  const res7 = MediaStreamValidator.parseRangeHeader(null, totalSize)
  assert(res7.hasRange === false && res7.isSatisfiable === true, 'Null range header returns hasRange: false')

  // Test 8: MIME Type Resolution
  console.log('\n--- Test 8: MIME Type Resolution ---')
  assert(MediaStreamValidator.getMimeType('video.mp4') === 'video/mp4', '.mp4 maps to video/mp4')
  assert(MediaStreamValidator.getMimeType('audio.opus').includes('audio/ogg'), '.opus maps to audio/ogg with codecs')
  assert(MediaStreamValidator.getMimeType('sticker.tgs') === 'application/x-tgsticker', '.tgs maps to Telegram sticker MIME')
  assert(MediaStreamValidator.getMimeType('photo.webp') === 'image/webp', '.webp maps to image/webp')

  // Test 9: End-to-end Streaming Response Generation
  console.log('\n--- Test 9: End-to-end Streaming Response ---')
  const tempDir = path.join(os.tmpdir(), `guidegram_media_stream_test_${Date.now()}`)
  fs.mkdirSync(tempDir, { recursive: true })
  const testFile = path.join(tempDir, 'sample_video.mp4')
  fs.writeFileSync(testFile, Buffer.alloc(1000, 0x42)) // 1000 bytes

  try {
    // 206 Partial Content Response
    const response206 = await MediaStreamValidator.createMediaResponse(testFile, 'bytes=200-499')
    assert(response206.status === 206, 'Response status is 206 Partial Content')
    assert(response206.headers.get('Content-Range') === 'bytes 200-499/1000', 'Content-Range header matches RFC 9110')
    assert(response206.headers.get('Content-Length') === '300', 'Content-Length header matches 300 bytes')
    assert(response206.headers.get('Content-Type') === 'video/mp4', 'Content-Type header is video/mp4')

    // 416 Range Not Satisfiable Response
    const response416 = await MediaStreamValidator.createMediaResponse(testFile, 'bytes=2000-3000')
    assert(response416.status === 416, 'Response status is 416 Range Not Satisfiable')
    assert(response416.headers.get('Content-Range') === 'bytes */1000', 'Content-Range for 416 format is bytes */totalSize')

    // 200 Full Content Response
    const response200 = await MediaStreamValidator.createMediaResponse(testFile, null)
    assert(response200.status === 200, 'Response status is 200 OK for non-range request')
    assert(response200.headers.get('Content-Length') === '1000', 'Content-Length is 1000 bytes')
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }

  // Test 10: Telemetry
  console.log('\n--- Test 10: Telemetry Auditing ---')
  const telemetry = MediaStreamValidator.getTelemetry()
  assert(telemetry.totalRequests >= 9, 'Recorded total requests')
  assert(telemetry.rangeRequests >= 6, 'Recorded range requests')
  assert(telemetry.unsatisfiableRanges >= 3, 'Recorded unsatisfiable ranges')

  console.log(`\n========================================`)
  console.log(`Summary: Passed: ${passed}, Failed: ${failed}`)
  console.log(`========================================`)
  if (failed > 0) process.exit(1)
}

runTests().catch(err => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
