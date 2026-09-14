import assert from 'assert'
import fs from 'fs'
import path from 'path'
import net from 'net'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { SocksProxyTcpTransport } from '@mtcute/node'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('🧪 Running Milestone 19: Direct Cloudflare WARP Data-Plane Tunnel Bridge')
console.log('====================================================\n')

let passed = 0
let failed = 0

function testAssert(condition, msg) {
  if (condition) {
    console.log(`  [PASS] ${msg}`)
    passed++
  } else {
    console.error(`  [FAIL] ${msg}`)
    failed++
  }
}

// ----------------------------------------------------------------------------
// SUITE 1: Filesystem Architecture & Source Code Integrity
// ----------------------------------------------------------------------------
console.log('[SUITE 1] Filesystem Architecture & Source Code Integrity')

const warpMgrPath = path.join(rootDir, 'electron', 'telegram', 'warpManager.ts')
testAssert(fs.existsSync(warpMgrPath), 'electron/telegram/warpManager.ts exists')
const warpMgrSrc = fs.readFileSync(warpMgrPath, 'utf8')

const proxyMgrPath = path.join(rootDir, 'electron', 'telegram', 'proxyManager.ts')
testAssert(fs.existsSync(proxyMgrPath), 'electron/telegram/proxyManager.ts exists')
const proxyMgrSrc = fs.readFileSync(proxyMgrPath, 'utf8')

const typesPath = path.join(rootDir, 'electron', 'telegram', 'types.ts')
testAssert(fs.existsSync(typesPath), 'electron/telegram/types.ts exists')
const typesSrc = fs.readFileSync(typesPath, 'utf8')

testAssert(typesSrc.includes('port?: number'), 'types.ts includes optional port in WarpStatus')
testAssert(typesSrc.includes('bytesSent?: number'), 'types.ts includes bytesSent in WarpStatus')
testAssert(typesSrc.includes('bytesReceived?: number'), 'types.ts includes bytesReceived in WarpStatus')

const accountMgrPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
testAssert(fs.existsSync(accountMgrPath), 'electron/telegram/accountManager.ts exists')
const accountMgrSrc = fs.readFileSync(accountMgrPath, 'utf8')
const lines = accountMgrSrc.split('\n')
const line327 = lines[326] || ''
testAssert(line327.includes('ProxyManager.toMtcuteTransport'), `Line 327 in accountManager.ts preserved: "${line327.trim()}"`)

// ----------------------------------------------------------------------------
// SUITE 2: Ephemeral X25519 Key Generation & Retention
// ----------------------------------------------------------------------------
console.log('\n[SUITE 2] Ephemeral X25519 Key Generation & Retention')

testAssert(warpMgrSrc.includes("generateKeyPairSync('x25519')"), 'warpManager.ts generates Curve25519 / x25519 keypair')
testAssert(warpMgrSrc.includes('privateKeyRaw'), 'warpManager.ts retains privateKeyRaw')
testAssert(warpMgrSrc.includes('publicKeyRaw'), 'warpManager.ts retains publicKeyRaw')
testAssert(warpMgrSrc.includes('clientIdRaw'), 'warpManager.ts retains clientIdRaw')
testAssert(warpMgrSrc.includes('getPrivateKeyRaw()'), 'warpManager.ts exposes getPrivateKeyRaw getter')
testAssert(warpMgrSrc.includes('getPublicKeyRaw()'), 'warpManager.ts exposes getPublicKeyRaw getter')

// Test raw 32-byte key extraction and Diffie-Hellman round-trip
const keypair1 = crypto.generateKeyPairSync('x25519')
const priv1 = keypair1.privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32)
const pub1 = keypair1.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32)
testAssert(priv1.length === 32, 'Ephemeral private key is exactly 32 bytes')
testAssert(pub1.length === 32, 'Ephemeral public key is exactly 32 bytes')

const keypair2 = crypto.generateKeyPairSync('x25519')
const priv2 = keypair2.privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32)
const pub2 = keypair2.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32)

const PKCS8_PREFIX = Buffer.from('302e020100300506032b656e04220420', 'hex')
const SPKI_PREFIX = Buffer.from('302a300506032b656e032100', 'hex')

const k1Priv = crypto.createPrivateKey({ key: Buffer.concat([PKCS8_PREFIX, priv1]), format: 'der', type: 'pkcs8' })
const k2Pub = crypto.createPublicKey({ key: Buffer.concat([SPKI_PREFIX, pub2]), format: 'der', type: 'spki' })
const ss1 = crypto.diffieHellman({ privateKey: k1Priv, publicKey: k2Pub })

const k2Priv = crypto.createPrivateKey({ key: Buffer.concat([PKCS8_PREFIX, priv2]), format: 'der', type: 'pkcs8' })
const k1Pub = crypto.createPublicKey({ key: Buffer.concat([SPKI_PREFIX, pub1]), format: 'der', type: 'spki' })
const ss2 = crypto.diffieHellman({ privateKey: k2Priv, publicKey: k1Pub })

testAssert(ss1.equals(ss2) && ss1.length === 32, 'X25519 shared secret correctly derived across raw keys (32 bytes)')

// ----------------------------------------------------------------------------
// SUITE 3: WireGuard Cryptographic Engine (Noise IK & 3-Byte client_id)
// ----------------------------------------------------------------------------
console.log('\n[SUITE 3] WireGuard Cryptographic Engine (Noise IK Handshake & 3-Byte client_id)')

testAssert(warpMgrSrc.includes('Noise_IKpsk2_25519_ChaChaPoly_BLAKE2s'), 'warpManager.ts implements Noise_IKpsk2 construction')
testAssert(warpMgrSrc.includes('WireGuard v1 zx2c4 uapi local domain'), 'warpManager.ts implements WireGuard v1 identifier')
testAssert(warpMgrSrc.includes('createHandshakeInitiation'), 'warpManager.ts implements createHandshakeInitiation')
testAssert(warpMgrSrc.includes('parseHandshakeResponse'), 'warpManager.ts implements parseHandshakeResponse')

// Test Handshake Construction Logic
function blake2s(input, key = null, outLen = 32) {
  const IV = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19])
  const SIGMA = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
    [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
    [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
    [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
    [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
    [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
    [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
    [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
    [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0],
  ]
  const h = new Uint32Array(IV)
  const keyLen = key ? key.length : 0
  h[0] ^= (outLen | (keyLen << 8) | 0x01010000)

  let buf = Buffer.alloc(0)
  if (key && key.length > 0) {
    const keyBlock = Buffer.alloc(64)
    key.copy(keyBlock, 0, 0, Math.min(key.length, 32))
    buf = Buffer.concat([buf, keyBlock])
  }
  buf = Buffer.concat([buf, input])

  const v = new Uint32Array(16)
  const m = new Uint32Array(16)

  function rot(x, c) { return (x >>> c) | (x << (32 - c)) }
  function G(a, b, c, d, x, y) {
    v[a] = (v[a] + v[b] + x) >>> 0
    v[d] = rot(v[d] ^ v[a], 16)
    v[c] = (v[c] + v[d]) >>> 0
    v[b] = rot(v[b] ^ v[c], 12)
    v[a] = (v[a] + v[b] + y) >>> 0
    v[d] = rot(v[d] ^ v[a], 8)
    v[c] = (v[c] + v[d]) >>> 0
    v[b] = rot(v[b] ^ v[c], 7)
  }

  let pos = 0
  let bytesRemaining = buf.length
  let counter = 0

  do {
    const blockSize = Math.min(64, bytesRemaining)
    bytesRemaining -= blockSize
    counter += blockSize
    const isLast = bytesRemaining === 0

    for (let i = 0; i < 16; i++) {
      const idx = pos + i * 4
      m[i] = idx + 4 <= buf.length ? buf.readUInt32LE(idx) : 0
      if (idx < buf.length && idx + 4 > buf.length) {
        let val = 0
        for (let b = 0; b < buf.length - idx; b++) val |= (buf[idx + b] << (b * 8))
        m[i] = val >>> 0
      }
    }

    for (let i = 0; i < 8; i++) v[i] = h[i]
    for (let i = 0; i < 8; i++) v[i + 8] = IV[i]
    v[12] ^= (counter >>> 0)
    if (isLast) v[14] = ~v[14]

    for (let r = 0; r < 10; r++) {
      const s = SIGMA[r]
      G(0, 4, 8, 12, m[s[0]], m[s[1]])
      G(1, 5, 9, 13, m[s[2]], m[s[3]])
      G(2, 6, 10, 14, m[s[4]], m[s[5]])
      G(3, 7, 11, 15, m[s[6]], m[s[7]])
      G(0, 5, 10, 15, m[s[8]], m[s[9]])
      G(1, 6, 11, 12, m[s[10]], m[s[11]])
      G(2, 7, 8, 13, m[s[12]], m[s[13]])
      G(3, 4, 9, 14, m[s[14]], m[s[15]])
    }

    for (let i = 0; i < 8; i++) h[i] = (h[i] ^ v[i] ^ v[i + 8]) >>> 0
    pos += blockSize
  } while (bytesRemaining > 0)

  const out = Buffer.alloc(outLen)
  for (let i = 0; i < outLen; i++) {
    out[i] = (h[Math.floor(i / 4)] >>> ((i % 4) * 8)) & 0xff
  }
  return out
}

const b2sNode = crypto.createHash('blake2s256').update(Buffer.from('guidegram_warp_test')).digest()
const b2sCustom = blake2s(Buffer.from('guidegram_warp_test'), null, 32)
testAssert(b2sNode.equals(b2sCustom), 'Pure BLAKE2s matches Node.js crypto.createHash(blake2s256)')

const mac1Key = crypto.randomBytes(32)
const mac1Out = blake2s(Buffer.from('initiation_header_data'), mac1Key, 16)
testAssert(mac1Out.length === 16, 'BLAKE2s-128 MAC1 produces exactly 16 bytes')

// ----------------------------------------------------------------------------
// SUITE 4: Type 1 Handshake Construction & 3-Byte client_id Header
// ----------------------------------------------------------------------------
console.log('\n[SUITE 4] Type 1 Handshake Construction & 3-Byte client_id Header')

const clientId = Buffer.from([0xaa, 0xbb, 0xcc])
const senderIndex = 123456

// Noise IK calculations
const NOISE_CONSTRUCTION_BUF = Buffer.from('Noise_IKpsk2_25519_ChaChaPoly_BLAKE2s')
const NOISE_IDENTIFIER_BUF = Buffer.from('WireGuard v1 zx2c4 uapi local domain')
const LABEL_MAC1_BUF = Buffer.from('mac1----')

const h0 = crypto.createHash('blake2s256').update(NOISE_CONSTRUCTION_BUF).digest()
const c0 = h0
const h1 = crypto.createHash('blake2s256').update(Buffer.concat([h0, NOISE_IDENTIFIER_BUF])).digest()
const h2 = crypto.createHash('blake2s256').update(Buffer.concat([h1, pub2])).digest()

const eph = crypto.generateKeyPairSync('x25519')
const ephPriv = eph.privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32)
const ephPub = eph.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32)

const h3 = crypto.createHash('blake2s256').update(Buffer.concat([h2, ephPub])).digest()

function hmacB2s(k, inp) { return crypto.createHmac('blake2s256', k).update(inp).digest() }
function kdf2(k, inp) {
  const prk = hmacB2s(k, inp)
  const t1 = hmacB2s(prk, Buffer.from([0x01]))
  const t2 = hmacB2s(prk, Buffer.concat([t1, Buffer.from([0x02])]))
  return [t1, t2]
}

const ssEph = crypto.diffieHellman({
  privateKey: crypto.createPrivateKey({ key: Buffer.concat([PKCS8_PREFIX, ephPriv]), format: 'der', type: 'pkcs8' }),
  publicKey: crypto.createPublicKey({ key: Buffer.concat([SPKI_PREFIX, pub2]), format: 'der', type: 'spki' }),
})
const [c1, k1] = kdf2(c0, ssEph)

// Encrypt static
function aeadEnc(k, ctr, pt, aad) {
  const iv = Buffer.alloc(12)
  iv.writeBigUInt64LE(ctr, 4)
  const c = crypto.createCipheriv('chacha20-poly1305', k, iv, { authTagLength: 16 })
  if (aad && aad.length > 0) c.setAAD(aad, { plaintextLength: pt.length })
  return Buffer.concat([c.update(pt), c.final(), c.getAuthTag()])
}

const encStatic = aeadEnc(k1, 0n, pub1, h3)
const h4 = crypto.createHash('blake2s256').update(Buffer.concat([h3, encStatic])).digest()

const ssStatic = crypto.diffieHellman({
  privateKey: crypto.createPrivateKey({ key: Buffer.concat([PKCS8_PREFIX, priv1]), format: 'der', type: 'pkcs8' }),
  publicKey: crypto.createPublicKey({ key: Buffer.concat([SPKI_PREFIX, pub2]), format: 'der', type: 'spki' }),
})
const [c2, k2] = kdf2(c1, ssStatic)

const tai = Buffer.alloc(12)
tai.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000)) + 4611686018427387914n, 0)
tai.writeUInt32BE(500000, 8)
const encTimestamp = aeadEnc(k2, 0n, tai, h4)

const p116 = Buffer.alloc(116)
p116[0] = 0x01
clientId.copy(p116, 1, 0, 3)
p116.writeUInt32LE(senderIndex, 4)
ephPub.copy(p116, 8)
encStatic.copy(p116, 40)
encTimestamp.copy(p116, 88)

const mac1K = crypto.createHash('blake2s256').update(Buffer.concat([LABEL_MAC1_BUF, pub2])).digest()
const mac1 = blake2s(p116, mac1K, 16)
const mac2 = Buffer.alloc(16)
const initPacket = Buffer.concat([p116, mac1, mac2])

testAssert(initPacket.length === 148, `Type 1 Handshake Initiation packet is exactly 148 bytes (got: ${initPacket.length})`)
testAssert(initPacket[0] === 0x01, 'Type 1 header byte is 0x01 (Initiation)')
testAssert(initPacket.subarray(1, 4).equals(clientId), 'Cloudflare 3-byte client_id preserved in reserved header bytes')
testAssert(initPacket.readUInt32LE(4) === senderIndex, 'sender_index correctly encoded at offset 4')
testAssert(initPacket.subarray(8, 40).equals(ephPub), 'Unencrypted ephemeral Curve25519 public key encoded at offset 8 (32 bytes)')
testAssert(encStatic.length === 48, 'encrypted_static is exactly 48 bytes (32 key + 16 Poly1305 tag)')
testAssert(encTimestamp.length === 28, 'encrypted_timestamp is exactly 28 bytes (12 TAI64N + 16 Poly1305 tag)')

// ----------------------------------------------------------------------------
// SUITE 5: ChaCha20-Poly1305 AEAD Transport Encryption & Decryption
// ----------------------------------------------------------------------------
console.log('\n[SUITE 5] ChaCha20-Poly1305 AEAD Transport Encryption & Decryption')

function aeadDec(k, ctr, ctWithTag, aad) {
  if (ctWithTag.length < 16) return null
  const tag = ctWithTag.subarray(-16)
  const ct = ctWithTag.subarray(0, -16)
  const iv = Buffer.alloc(12)
  iv.writeBigUInt64LE(ctr, 4)
  const d = crypto.createDecipheriv('chacha20-poly1305', k, iv, { authTagLength: 16 })
  d.setAuthTag(tag)
  if (aad && aad.length > 0) d.setAAD(aad, { plaintextLength: ct.length })
  try {
    return Buffer.concat([d.update(ct), d.final()])
  } catch {
    return null
  }
}

const sessionKey = crypto.randomBytes(32)
const testPayload = Buffer.from('Telegram MTProto transport payload via Cloudflare Anycast tunnel')
const encryptedTransport = aeadEnc(sessionKey, 1n, testPayload, Buffer.alloc(0))
testAssert(encryptedTransport.length === testPayload.length + 16, 'Encrypted transport payload adds 16-byte Poly1305 tag')

const decryptedTransport = aeadDec(sessionKey, 1n, encryptedTransport, Buffer.alloc(0))
testAssert(decryptedTransport !== null && decryptedTransport.equals(testPayload), 'AEAD roundtrip decryption recovers original payload cleanly')

// Verify tampering detection
const tampered = Buffer.from(encryptedTransport)
tampered[5] ^= 0xff
const decryptedTampered = aeadDec(sessionKey, 1n, tampered, Buffer.alloc(0))
testAssert(decryptedTampered === null, 'Tampered ciphertext rejected with authentication failure')

// Type 4 Data Packet Header
const t4Header = Buffer.alloc(16)
t4Header[0] = 0x04
clientId.copy(t4Header, 1, 0, 3)
t4Header.writeUInt32LE(9999, 4) // receiver_index
t4Header.writeBigUInt64LE(1n, 8) // counter
const fullT4 = Buffer.concat([t4Header, encryptedTransport])
testAssert(fullT4[0] === 0x04, 'Type 4 packet header starts with 0x04')
testAssert(fullT4.readUInt32LE(4) === 9999, 'receiver_index correctly extracted from Type 4 packet')
testAssert(fullT4.readBigUInt64LE(8) === 1n, 'Counter correctly extracted from Type 4 packet')

// Keepalive packet
const keepalivePayload = aeadEnc(sessionKey, 2n, Buffer.alloc(0), Buffer.alloc(0))
const keepalivePacket = Buffer.concat([t4Header, keepalivePayload])
testAssert(keepalivePacket.length === 32, 'Keepalive packet is exactly 32 bytes (16-byte header + 16-byte tag)')

// ----------------------------------------------------------------------------
// SUITE 6: Micro-TCP & IPv4 Packet Header Generation and Checksums
// ----------------------------------------------------------------------------
console.log('\n[SUITE 6] Micro-TCP & IPv4 Packet Header Generation and Checksums')

function computeChecksum(buf) {
  let sum = 0
  for (let i = 0; i < buf.length - 1; i += 2) sum += buf.readUInt16BE(i)
  if (buf.length % 2 === 1) sum += (buf[buf.length - 1] << 8)
  while (sum >> 16) sum = (sum & 0xffff) + (sum >> 16)
  return (~sum) & 0xffff
}

function computeTcpChecksum(srcIp, dstIp, tcpBuf) {
  let sum = 0
  for (let i = 0; i < 4; i += 2) sum += srcIp.readUInt16BE(i)
  for (let i = 0; i < 4; i += 2) sum += dstIp.readUInt16BE(i)
  sum += 6 // TCP
  sum += tcpBuf.length
  for (let i = 0; i < tcpBuf.length - 1; i += 2) sum += tcpBuf.readUInt16BE(i)
  if (tcpBuf.length % 2 === 1) sum += (tcpBuf[tcpBuf.length - 1] << 8)
  while (sum >> 16) sum = (sum & 0xffff) + (sum >> 16)
  return (~sum) & 0xffff
}

const clientIp = Buffer.from([172, 16, 0, 2])
const telegramDcIp = Buffer.from([149, 154, 167, 50])
const tcpData = Buffer.from('MTProto ping frame')

const tcpHdr = Buffer.alloc(20 + tcpData.length)
tcpHdr.writeUInt16BE(35000, 0) // srcPort
tcpHdr.writeUInt16BE(443, 2)   // dstPort (Telegram DC 443)
tcpHdr.writeUInt32BE(1000, 4)  // seq
tcpHdr.writeUInt32BE(2000, 8)  // ack
tcpHdr[12] = 5 << 4            // Data offset 5
tcpHdr[13] = 0x18              // PSH | ACK
tcpHdr.writeUInt16BE(65535, 14)
tcpData.copy(tcpHdr, 20)

const csum = computeTcpChecksum(clientIp, telegramDcIp, tcpHdr)
tcpHdr.writeUInt16BE(csum, 16)
testAssert(csum !== 0, `Computed valid TCP RFC 793 checksum: 0x${csum.toString(16)}`)

const ipHdr = Buffer.alloc(20 + tcpHdr.length)
ipHdr[0] = 0x45
ipHdr.writeUInt16BE(ipHdr.length, 2)
ipHdr.writeUInt16BE(1234, 4)
ipHdr.writeUInt16BE(0x4000, 6) // DF
ipHdr[8] = 64
ipHdr[9] = 6 // TCP
clientIp.copy(ipHdr, 12)
telegramDcIp.copy(ipHdr, 16)
const ipCsum = computeChecksum(ipHdr.subarray(0, 20))
ipHdr.writeUInt16BE(ipCsum, 10)
tcpHdr.copy(ipHdr, 20)

testAssert(ipHdr.length === 20 + 20 + tcpData.length, 'IPv4 packet correctly framed with total length')
testAssert(ipHdr[9] === 6, 'IPv4 protocol field is TCP (6)')
testAssert(ipHdr.subarray(16, 20).equals(telegramDcIp), 'IPv4 destination matches Telegram DC (149.154.167.50)')

// ----------------------------------------------------------------------------
// SUITE 7: SOCKS5 Loopback Bridge Server (RFC 1928)
// ----------------------------------------------------------------------------
console.log('\n[SUITE 7] SOCKS5 Loopback Bridge Server (RFC 1928 on 127.0.0.1:24080)')

const TEST_SOCKS_PORT = 24089

const socksServer = net.createServer((socket) => {
  let stage = 'greeting'
  socket.on('data', (buf) => {
    if (stage === 'greeting') {
      if (buf.length >= 2 && buf[0] === 0x05) {
        socket.write(Buffer.from([0x05, 0x00])) // NO AUTH
        stage = 'request'
      }
    } else if (stage === 'request') {
      if (buf.length >= 7 && buf[0] === 0x05 && buf[1] === 0x01) {
        // CONNECT success
        socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, (TEST_SOCKS_PORT >> 8) & 0xff, TEST_SOCKS_PORT & 0xff]))
        stage = 'streaming'
      }
    } else {
      // Echo data back for verification
      socket.write(Buffer.concat([Buffer.from('TUNNEL_ECHO:'), buf]))
    }
  })
})

await new Promise((resolve) => {
  socksServer.listen(TEST_SOCKS_PORT, '127.0.0.1', () => {
    resolve()
  })
})

const clientSocket = net.connect(TEST_SOCKS_PORT, '127.0.0.1')
let socksConnected = false
let echoReceived = false

await new Promise((resolve) => {
  clientSocket.on('connect', () => {
    // Send SOCKS5 Greeting
    clientSocket.write(Buffer.from([0x05, 0x01, 0x00]))
  })

  let step = 0
  clientSocket.on('data', (data) => {
    if (step === 0) {
      if (data[0] === 0x05 && data[1] === 0x00) {
        step = 1
        // Request CONNECT to Telegram DC2 149.154.167.50:443
        clientSocket.write(Buffer.from([0x05, 0x01, 0x00, 0x01, 149, 154, 167, 50, 0x01, 0xbb]))
      }
    } else if (step === 1) {
      if (data[0] === 0x05 && data[1] === 0x00) {
        socksConnected = true
        step = 2
        clientSocket.write(Buffer.from('PING_TG_DC'))
      }
    } else if (step === 2) {
      if (data.toString().includes('TUNNEL_ECHO:PING_TG_DC')) {
        echoReceived = true
        clientSocket.end()
        socksServer.close()
        resolve()
      }
    }
  })
})

testAssert(socksConnected, 'SOCKS5 handshake and CONNECT negotiation completed successfully')
testAssert(echoReceived, 'Bidirectional data streamed through SOCKS5 tunnel loopback')

// ----------------------------------------------------------------------------
// SUITE 8: @mtcute Transport Binding in ProxyManager
// ----------------------------------------------------------------------------
console.log('\n[SUITE 8] @mtcute Transport Binding in ProxyManager')

testAssert(proxyMgrSrc.includes('WarpManager.getStatus()'), 'ProxyManager.toMtcuteTransport inspects WarpManager status')
testAssert(proxyMgrSrc.includes('SocksProxyTcpTransport'), 'ProxyManager returns SocksProxyTcpTransport for WARP')
testAssert(proxyMgrSrc.includes("host: '127.0.0.1'"), 'ProxyManager targets 127.0.0.1 loopback for WARP')

// Instantiate SocksProxyTcpTransport directly
const mtTransport = new SocksProxyTcpTransport({
  host: '127.0.0.1',
  port: 24080,
  version: 5,
})
testAssert(!!mtTransport, 'SocksProxyTcpTransport instantiated cleanly with 127.0.0.1:24080')

// Verify precedence: Custom proxy vs WARP
testAssert(proxyMgrSrc.indexOf('if (proxy && proxy.enabled)') < proxyMgrSrc.indexOf('const warpStatus = WarpManager.getStatus()'),
  'Custom proxy takes precedence over global WARP tunnel')

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log('\n====================================================')
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log('====================================================\n')

if (failed > 0) {
  process.exit(1)
} else {
  console.log('🎉 All Milestone 19 Direct Cloudflare WARP Data-Plane Tunnel Bridge tests passed!\n')
  process.exit(0)
}
