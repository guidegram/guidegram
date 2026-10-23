/**
 * Minimal WebM/Opus -> OGG/Opus remuxer.
 *
 * Chromium's MediaRecorder can only record Opus inside a WebM container. Telegram
 * only treats OGG/Opus (or audio/opus) uploads with a voice attribute as real
 * voice notes; a WebM file is stored as a document. Both containers carry the
 * exact same Opus packets, so we can repackage them without decoding/re-encoding.
 *
 * This parser intentionally supports the subset produced by MediaRecorder:
 *  - EBML header + unknown-size Segment
 *  - Info/TimestampScale, Tracks/TrackEntry (A_OPUS, CodecPrivate=OpusHead)
 *  - unknown-size Clusters containing SimpleBlocks (and basic BlockGroups)
 *  - no lacing, or fixed/Xiph/EBML lacing
 */

interface EbmlVint {
  length: number
  value: number
  unknown: boolean
}

interface EbmlId {
  length: number
  value: number
}

const ID_EBML = 0x1a45dfa3
const ID_SEGMENT = 0x18538067
const ID_INFO = 0x1549a966
const ID_TIMESTAMP_SCALE = 0x2ad7b1
const ID_TRACKS = 0x1654ae6b
const ID_TRACK_ENTRY = 0xae
const ID_TRACK_NUMBER = 0xd7
const ID_TRACK_TYPE = 0x83
const ID_CODEC_ID = 0x86
const ID_CODEC_PRIVATE = 0x63a2
const ID_AUDIO = 0xe1
const ID_CLUSTER = 0x1f43b675
const ID_CLUSTER_TIMESTAMP = 0xe7
const ID_SIMPLE_BLOCK = 0xa3
const ID_BLOCK_GROUP = 0xa0
const ID_BLOCK = 0xa1

const OGG_CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let r = i << 24
    for (let j = 0; j < 8; j++) {
      r = (r & 0x80000000) !== 0 ? ((r << 1) ^ 0x04c11db7) >>> 0 : (r << 1) >>> 0
    }
    table[i] = r >>> 0
  }
  return table
})()

function readVint(bytes: Uint8Array, offset: number, keepMarker = false): EbmlVint | null {
  if (offset < 0 || offset >= bytes.length) return null
  const first = bytes[offset]
  let length = 1
  let mask = 0x80
  while (length <= 8 && (first & mask) === 0) {
    length += 1
    mask >>= 1
  }
  if (length > 8) return null

  let value = keepMarker ? first : first & (mask - 1)
  let allOnes = (first & (mask - 1)) === mask - 1
  for (let i = 1; i < length; i++) {
    const byte = bytes[offset + i]
    if (byte === undefined) return null
    value = value * 256 + byte
    if (byte !== 0xff) allOnes = false
  }
  return { length, value, unknown: allOnes }
}

function readId(bytes: Uint8Array, offset: number): EbmlId | null {
  if (offset < 0 || offset >= bytes.length) return null
  const first = bytes[offset]
  let length = 1
  let mask = 0x80
  while (length <= 4 && (first & mask) === 0) {
    length += 1
    mask >>= 1
  }
  if (length > 4) return null
  let value = 0
  for (let i = 0; i < length; i++) {
    const byte = bytes[offset + i]
    if (byte === undefined) return null
    value = value * 256 + byte
  }
  return { length, value }
}

function readUInt(bytes: Uint8Array, offset: number, length: number): number {
  let value = 0
  for (let i = 0; i < length; i++) value = value * 256 + bytes[offset + i]
  return value
}

function readFloat(bytes: Uint8Array, offset: number, length: number): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset, length)
  if (length === 4) return view.getFloat32(0, false)
  if (length === 8) return view.getFloat64(0, false)
  return 0
}

function isOpusHead(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 19 &&
    bytes[0] === 0x4f &&
    bytes[1] === 0x70 &&
    bytes[2] === 0x75 &&
    bytes[3] === 0x73 &&
    bytes[4] === 0x48 &&
    bytes[5] === 0x65 &&
    bytes[6] === 0x61 &&
    bytes[7] === 0x64
  )
}

function opusPacketSamples(packet: Uint8Array): number {
  if (packet.length < 1) return 0
  const toc = packet[0]
  const config = toc >>> 3
  const code = toc & 0x03

  // Opus frame duration in milliseconds, indexed by TOC config 0..31.
  // 0-11: SILK (NB/MB/WB), 12-15: Hybrid (SWB/FB), 16-31: CELT.
  let frameMs: number
  if (config < 12) {
    frameMs = [10, 20, 40, 60][config & 0x03]
  } else if (config < 16) {
    frameMs = [10, 20][config & 0x01]
  } else {
    frameMs = [2.5, 5, 10, 20][config & 0x03]
  }

  let frames = 1
  if (code === 1 || code === 2) {
    frames = 2
  } else if (code === 3) {
    // Arbitrary frame count: low 6 bits of the next byte. The other two bits
    // signal VBR/padding, which don't affect the number of frames.
    frames = packet.length >= 2 ? packet[1] & 0x3f : 1
    if (frames < 1) frames = 1
  }

  return Math.round(frameMs * 48) * frames
}

function oggCrc32(data: Uint8Array): number {
  let crc = 0
  for (let i = 0; i < data.length; i++) {
    crc = ((crc << 8) ^ OGG_CRC_TABLE[((crc >>> 24) ^ data[i]) & 0xff]) >>> 0
  }
  return crc >>> 0
}

function buildOggPage(
  packets: Uint8Array[],
  granulePosition: number,
  headerType: number,
  serial: number,
  sequence: number
): Uint8Array {
  const segmentTable: number[] = []
  let payloadLength = 0
  for (const packet of packets) {
    let remaining = packet.length
    while (remaining >= 255) {
      segmentTable.push(255)
      remaining -= 255
    }
    segmentTable.push(remaining)
    payloadLength += packet.length
  }
  if (segmentTable.length > 255) {
    throw new Error('OGG page has too many segments')
  }

  const headerLength = 27 + segmentTable.length
  const page = new Uint8Array(headerLength + payloadLength)
  page[0] = 0x4f // O
  page[1] = 0x67 // g
  page[2] = 0x67 // g
  page[3] = 0x53 // S
  page[4] = 0 // version
  page[5] = headerType
  const view = new DataView(page.buffer)
  view.setBigUint64(6, BigInt(Math.max(0, Math.trunc(granulePosition))), true)
  view.setUint32(14, serial >>> 0, true)
  view.setUint32(18, sequence >>> 0, true)
  view.setUint32(22, 0, true) // CRC placeholder
  page[26] = segmentTable.length
  page.set(segmentTable, 27)

  let offset = headerLength
  for (const packet of packets) {
    page.set(packet, offset)
    offset += packet.length
  }

  view.setUint32(22, oggCrc32(page), true)
  return page
}

function buildOpusTags(): Uint8Array {
  const vendor = new TextEncoder().encode('Guidegram')
  const packet = new Uint8Array(8 + 4 + vendor.length + 4)
  packet.set([0x4f, 0x70, 0x75, 0x73, 0x54, 0x61, 0x67, 0x73], 0) // OpusTags
  const view = new DataView(packet.buffer)
  view.setUint32(8, vendor.length, true)
  packet.set(vendor, 12)
  view.setUint32(12 + vendor.length, 0, true)
  return packet
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  let total = 0
  for (const chunk of chunks) total += chunk.length
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

/**
 * Detect whether a buffer is an EBML/WebM file.
 */
export function isWebmBuffer(input: ArrayBuffer | Uint8Array): boolean {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  )
}

/**
 * Repackage a WebM/Opus recording into an OGG/Opus voice note.
 *
 * @throws when the buffer is not a WebM/Opus stream or contains no audio packets.
 */
export function remuxWebmOpusToOgg(input: ArrayBuffer | Uint8Array): Uint8Array {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  if (!isWebmBuffer(bytes)) {
    throw new Error('Input is not a WebM file')
  }

  let timestampScale = 1_000_000
  let audioTrackNumber = -1
  let opusHead: Uint8Array | null = null
  const packets: Uint8Array[] = []

  const parseBlockPayload = (start: number, end: number, trackNumber: number): void => {
    const track = readVint(bytes, start)
    if (!track) return
    let cursor = start + track.length
    if (cursor + 3 > end) return
    cursor += 2 // block timecode (relative to cluster)
    const flags = bytes[cursor]
    cursor += 1
    const lacing = (flags >> 1) & 0x03
    const frames: Uint8Array[] = []

    if (lacing === 0) {
      if (end > cursor) frames.push(bytes.subarray(cursor, end))
    } else {
      if (cursor >= end) return
      const frameCount = bytes[cursor] + 1
      cursor += 1
      const sizes: number[] = []
      if (lacing === 2) {
        // Fixed-size lacing.
        const each = Math.floor((end - cursor) / frameCount)
        for (let i = 0; i < frameCount; i++) sizes.push(each)
      } else if (lacing === 1) {
        // Xiph lacing: sizes are sums of 255-terminated bytes.
        for (let i = 0; i < frameCount - 1; i++) {
          let size = 0
          while (cursor < end) {
            const value = bytes[cursor]
            cursor += 1
            size += value
            if (value !== 255) break
          }
          sizes.push(size)
        }
      } else {
        // EBML lacing: first size is a vint, following sizes are signed deltas.
        if (cursor >= end) return
        const first = readVint(bytes, cursor)
        if (!first) return
        cursor += first.length
        sizes.push(first.value)
        for (let i = 1; i < frameCount - 1; i++) {
          const delta = readVint(bytes, cursor)
          if (!delta) return
          cursor += delta.length
          // Signed EBML vint: subtract half the representable range.
          const bias = 2 ** (7 * delta.length - 1) - 1
          const signed = delta.value - bias
          sizes.push(sizes[sizes.length - 1] + signed)
        }
      }
      if (lacing !== 2) {
        const used = sizes.reduce((a, b) => a + b, 0)
        sizes.push(end - cursor - used)
      }
      let pos = cursor
      for (const size of sizes) {
        if (size < 0) return
        frames.push(bytes.subarray(pos, pos + size))
        pos += size
      }
    }

    // Only collect packets from the Opus track.
    if (trackNumber !== audioTrackNumber) return
    for (const frame of frames) {
      if (frame.length > 0) packets.push(frame)
    }
  }

  const parseBlockGroup = (start: number, end: number, trackNumber: number): void => {
    let offset = start
    while (offset < end) {
      const id = readId(bytes, offset)
      if (!id) return
      const size = readVint(bytes, offset + id.length)
      if (!size) return
      const dataStart = offset + id.length + size.length
      const dataEnd = size.unknown ? end : dataStart + size.value
      if (id.value === ID_BLOCK) parseBlockPayload(dataStart, dataEnd, trackNumber)
      offset = dataEnd
    }
  }

  const parseCluster = (start: number, end: number): number => {
    let offset = start
    let clusterTimestamp = 0
    while (offset < end) {
      const id = readId(bytes, offset)
      if (!id) break
      if (id.value === ID_CLUSTER) break // next cluster at the same level
      const size = readVint(bytes, offset + id.length)
      if (!size) break
      const dataStart = offset + id.length + size.length
      const dataEnd = size.unknown ? end : dataStart + size.value
      if (id.value === ID_CLUSTER_TIMESTAMP) {
        clusterTimestamp = readUInt(bytes, dataStart, size.value)
      } else if (id.value === ID_SIMPLE_BLOCK) {
        parseBlockPayload(dataStart, dataEnd, audioTrackNumber)
      } else if (id.value === ID_BLOCK_GROUP) {
        parseBlockGroup(dataStart, dataEnd, audioTrackNumber)
      }
      offset = dataEnd
      if (size.unknown) break
      // `clusterTimestamp` is currently only used to keep the parser honest about
      // the block layout; packet duration comes from the Opus TOC below.
      void clusterTimestamp
    }
    return offset
  }

  const parseTrackEntry = (start: number, end: number): void => {
    let trackNumber = -1
    let trackType = 0
    let codecId = ''
    let codecPrivate: Uint8Array | null = null
    let offset = start
    while (offset < end) {
      const id = readId(bytes, offset)
      if (!id) return
      const size = readVint(bytes, offset + id.length)
      if (!size) return
      const dataStart = offset + id.length + size.length
      const dataEnd = dataStart + size.value
      if (id.value === ID_TRACK_NUMBER) {
        trackNumber = readUInt(bytes, dataStart, size.value)
      } else if (id.value === ID_TRACK_TYPE) {
        trackType = readUInt(bytes, dataStart, size.value)
      } else if (id.value === ID_CODEC_ID) {
        codecId = String.fromCharCode(...bytes.subarray(dataStart, dataEnd))
      } else if (id.value === ID_CODEC_PRIVATE) {
        codecPrivate = bytes.slice(dataStart, dataEnd)
      }
      offset = dataEnd
    }
    if (trackType === 2 && codecId === 'A_OPUS' && codecPrivate) {
      audioTrackNumber = trackNumber
      opusHead = codecPrivate
    }
  }

  const parseTracks = (start: number, end: number): void => {
    let offset = start
    while (offset < end) {
      const id = readId(bytes, offset)
      if (!id) return
      const size = readVint(bytes, offset + id.length)
      if (!size) return
      const dataStart = offset + id.length + size.length
      const dataEnd = dataStart + size.value
      if (id.value === ID_TRACK_ENTRY) parseTrackEntry(dataStart, dataEnd)
      offset = dataEnd
    }
  }

  const parseInfo = (start: number, end: number): void => {
    let offset = start
    while (offset < end) {
      const id = readId(bytes, offset)
      if (!id) return
      const size = readVint(bytes, offset + id.length)
      if (!size) return
      const dataStart = offset + id.length + size.length
      const dataEnd = dataStart + size.value
      if (id.value === ID_TIMESTAMP_SCALE) {
        timestampScale = readUInt(bytes, dataStart, size.value)
      }
      offset = dataEnd
    }
  }

  const parseSegment = (start: number, end: number): void => {
    let offset = start
    while (offset < end) {
      const id = readId(bytes, offset)
      if (!id) break
      const size = readVint(bytes, offset + id.length)
      if (!size) break
      const dataStart = offset + id.length + size.length
      const dataEnd = size.unknown ? end : dataStart + size.value
      if (id.value === ID_INFO) {
        parseInfo(dataStart, dataEnd)
      } else if (id.value === ID_TRACKS) {
        parseTracks(dataStart, dataEnd)
      } else if (id.value === ID_CLUSTER) {
        offset = parseCluster(dataStart, dataEnd)
        continue
      }
      if (size.unknown) break
      offset = dataEnd
    }
  }

  // Locate and parse the Segment element.
  let offset = 0
  while (offset < bytes.length) {
    const id = readId(bytes, offset)
    if (!id) break
    const size = readVint(bytes, offset + id.length)
    if (!size) break
    const dataStart = offset + id.length + size.length
    const dataEnd = size.unknown ? bytes.length : dataStart + size.value
    if (id.value === ID_SEGMENT) {
      parseSegment(dataStart, dataEnd)
      break
    }
    if (size.unknown) break
    offset = dataEnd
  }

  void timestampScale
  if (!opusHead || !isOpusHead(opusHead)) {
    throw new Error('WebM file does not contain an Opus audio track')
  }
  if (packets.length === 0) {
    throw new Error('WebM file contains no Opus audio packets')
  }

  const preSkip = opusHead[10] | (opusHead[11] << 8)
  const serial = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
  const pages: Uint8Array[] = []

  pages.push(buildOggPage([opusHead], 0, 0x02, serial, 0))
  pages.push(buildOggPage([buildOpusTags()], 0, 0x00, serial, 1))

  let samples = 0
  for (let i = 0; i < packets.length; i++) {
    samples += opusPacketSamples(packets[i])
    const granule = samples - preSkip
    const isLast = i === packets.length - 1
    pages.push(buildOggPage([packets[i]], granule, isLast ? 0x04 : 0x00, serial, i + 2))
  }

  return concatChunks(pages)
}
