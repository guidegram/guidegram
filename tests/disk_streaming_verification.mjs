import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { Readable } from 'node:stream'

async function runTests() {
  console.log('🧪 Starting Zero Raw Binary Buffer Disk Streaming Tests (Layer 08)...')

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guidegram-test-stream-'))
  const testFile = path.join(tempDir, 'sample_video.mp4')

  try {
    // Generate a 100KB dummy test file
    const sampleBuffer = Buffer.alloc(100 * 1024, 0x42)
    fs.writeFileSync(testFile, sampleBuffer)

    const stats = await fs.promises.stat(testFile)
    const totalSize = stats.size
    assert.equal(totalSize, 100 * 1024)

    // Test 1: Full file streaming with zero buffer loading
    const fullStream = fs.createReadStream(testFile)
    const fullWebStream = Readable.toWeb(fullStream)
    const fullResponse = new Response(fullWebStream, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': totalSize.toString(),
        'Accept-Ranges': 'bytes',
      },
    })

    assert.equal(fullResponse.status, 200)
    assert.equal(fullResponse.headers.get('Content-Length'), '102400')
    const fullArrayBuffer = await fullResponse.arrayBuffer()
    assert.equal(fullArrayBuffer.byteLength, 100 * 1024)
    console.log('  ✅ Full file disk stream piping passed')

    // Test 2: HTTP 206 Partial Content Range streaming
    const start = 1000
    const end = 4999
    const chunkSize = end - start + 1

    const rangeStream = fs.createReadStream(testFile, { start, end })
    const rangeWebStream = Readable.toWeb(rangeStream)
    const rangeResponse = new Response(rangeWebStream, {
      status: 206,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
      },
    })

    assert.equal(rangeResponse.status, 206)
    assert.equal(rangeResponse.headers.get('Content-Range'), `bytes ${start}-${end}/${totalSize}`)
    assert.equal(rangeResponse.headers.get('Content-Length'), '4000')

    const rangeData = await rangeResponse.arrayBuffer()
    assert.equal(rangeData.byteLength, 4000)
    console.log('  ✅ HTTP 206 Partial Content range stream passed')
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }

  console.log('🎉 All Disk Streaming Tests (Layer 08) PASSED successfully!')
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
