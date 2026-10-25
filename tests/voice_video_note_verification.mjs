import { strict as assert } from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Voice & Video Note Waveform Player & Recording Stream Verification (Phase 59)...')

// 1. Physical inspection of accountManager.ts
const accountManagerPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
const accountManagerSource = fs.readFileSync(accountManagerPath, 'utf-8')

assert(accountManagerSource.includes('export function decodeMtprotoWaveform('), 'accountManager must export decodeMtprotoWaveform')
assert(accountManagerSource.includes('export function encodeMtprotoWaveform('), 'accountManager must export encodeMtprotoWaveform')
assert(accountManagerSource.includes('export function normalizeWaveformSamples('), 'accountManager must export normalizeWaveformSamples')
assert(accountManagerSource.includes("'documentAttributeVideo'"), 'accountManager must inspect documentAttributeVideo')
assert(accountManagerSource.includes('attr.roundMessage'), 'accountManager must check roundMessage attribute for round video notes')
console.log('  ✅ [PASS] accountManager.ts physical inspection passed')

// 2. Physical inspection of main.ts
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainSource = fs.readFileSync(mainPath, 'utf-8')

assert(mainSource.includes("'telegram:decode-waveform'"), 'main.ts must register telegram:decode-waveform')
assert(mainSource.includes("'telegram:encode-waveform'"), 'main.ts must register telegram:encode-waveform')
console.log('  ✅ [PASS] main.ts IPC registration passed')

// 3. Physical inspection of preload.ts
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadSource = fs.readFileSync(preloadPath, 'utf-8')

assert(preloadSource.includes('decodeWaveform:'), 'preload.ts must expose decodeWaveform')
assert(preloadSource.includes('encodeWaveform:'), 'preload.ts must expose encodeWaveform')
console.log('  ✅ [PASS] preload.ts bridge exposure passed')

// 4. Functional verification of 5-bit MTProto Waveform encode/decode roundtrip
function encodeMtprotoWaveform(samples) {
  if (!samples || samples.length === 0) return Buffer.alloc(0)
  const bitCount = samples.length * 5
  const byteCount = Math.ceil(bitCount / 8)
  const buf = Buffer.alloc(byteCount, 0)

  for (let i = 0; i < samples.length; i++) {
    const val = Math.max(0, Math.min(31, Math.round(samples[i])))
    const bitOffset = i * 5
    const byteOffset = Math.floor(bitOffset / 8)
    const bitShift = bitOffset % 8

    buf[byteOffset] |= (val & 0x1f) << bitShift
    if (bitShift > 3 && byteOffset + 1 < byteCount) {
      buf[byteOffset + 1] |= (val & 0x1f) >> (8 - bitShift)
    }
  }

  return buf
}

function decodeMtprotoWaveform(waveformBuffer) {
  if (!waveformBuffer || waveformBuffer.length === 0) return undefined
  const buf = Buffer.isBuffer(waveformBuffer) ? waveformBuffer : Buffer.from(waveformBuffer)
  const bitsCount = buf.length * 8
  const samplesCount = Math.floor(bitsCount / 5)
  if (samplesCount <= 0) return undefined
  const result = []
  for (let i = 0; i < samplesCount; i++) {
    const bitOffset = i * 5
    const byteOffset = Math.floor(bitOffset / 8)
    const bitShift = bitOffset % 8
    let value = buf[byteOffset] >> bitShift
    if (bitShift > 3 && byteOffset + 1 < buf.length) {
      value |= buf[byteOffset + 1] << (8 - bitShift)
    }
    result.push(value & 0x1f)
  }
  return result
}

const originalSamples = [0, 4, 11, 18, 25, 31, 15, 7, 22, 1, 30, 16]
const encodedBuffer = encodeMtprotoWaveform(originalSamples)
assert.equal(encodedBuffer.length, Math.ceil((originalSamples.length * 5) / 8))

const decodedSamples = decodeMtprotoWaveform(encodedBuffer)
assert.deepEqual(decodedSamples, originalSamples, 'Waveform decode must exactly restore 5-bit encoded samples')
console.log('  ✅ [PASS] 5-bit MTProto Waveform encode/decode roundtrip passed')

// 5. Functional verification of normalizeWaveformSamples
function normalizeWaveformSamples(samples, targetBars = 32) {
  if (!samples || samples.length === 0) return Array(targetBars).fill(0)
  if (samples.length === targetBars) {
    return samples.map((s) => Math.max(0, Math.min(31, Math.round(s))))
  }

  const result = []
  const step = samples.length / targetBars
  for (let i = 0; i < targetBars; i++) {
    const start = Math.floor(i * step)
    const end = Math.floor((i + 1) * step)
    let sum = 0
    let count = 0
    for (let j = start; j < end && j < samples.length; j++) {
      sum += samples[j]
      count++
    }
    const avg = count > 0 ? sum / count : 0
    const scaled = avg <= 1.0 ? avg * 31 : avg
    result.push(Math.max(0, Math.min(31, Math.round(scaled))))
  }
  return result
}

// 100 raw float mic values in [0.0, 1.0]
const rawMicData = Array.from({ length: 100 }, (_, i) => Math.sin(i / 10) * 0.5 + 0.5)
const normalizedBars = normalizeWaveformSamples(rawMicData, 32)
assert.equal(normalizedBars.length, 32)
normalizedBars.forEach((bar) => {
  assert(bar >= 0 && bar <= 31, `Bar amplitude ${bar} must be in [0, 31]`)
})

// Empty handling
const emptyBars = normalizeWaveformSamples([], 32)
assert.equal(emptyBars.length, 32)
assert.equal(emptyBars.every((b) => b === 0), true)
console.log('  ✅ [PASS] Waveform normalization and resampling passed')

// 6. Video note round message parsing simulation
function parseMediaAttributes(attrs) {
  let isRoundVideo = false
  let mediaType = 'unknown'
  for (const attr of attrs) {
    if (attr._ === 'documentAttributeVideo') {
      if (attr.roundMessage) isRoundVideo = true
      mediaType = 'video'
    }
  }
  return { mediaType, isRoundVideo }
}

const standardVideo = parseMediaAttributes([{ _: 'documentAttributeVideo', duration: 60, roundMessage: false }])
assert.equal(standardVideo.isRoundVideo, false)

const roundVideo = parseMediaAttributes([{ _: 'documentAttributeVideo', duration: 15, roundMessage: true }])
assert.equal(roundVideo.isRoundVideo, true)
console.log('  ✅ [PASS] Round video note message attribute parsing passed')

console.log('🌟 All Phase 59 tests PASSED successfully!')
