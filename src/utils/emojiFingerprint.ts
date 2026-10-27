/**
 * emojiFingerprint.ts
 * Computes official Telegram 4-emoji visual verification key matching iOS, Android, and Desktop clients.
 * Port of Telegram Desktop calls_panel.cpp & calls_encryption_key.cpp.
 */
import { TELEGRAM_CALL_EMOJIS_333 } from './telegramCallEmojis'

export async function deriveOfficialCallEmojiFingerprint(
  authKey: Uint8Array,
  gA: Uint8Array
): Promise<string[]> {
  // 1. fingerprint_hash = SHA256(authKey || gA)
  const combined = new Uint8Array(authKey.length + gA.length)
  combined.set(authKey, 0)
  combined.set(gA, authKey.length)

  let hashBytes: Uint8Array
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', combined)
    hashBytes = new Uint8Array(hashBuffer)
  } else {
    // Fallback for Node test environments
    const nodeCrypto = await import('crypto')
    const hash = nodeCrypto.createHash('sha256').update(combined).digest()
    hashBytes = new Uint8Array(hash)
  }

  // 2. Slice 32 bytes into four 8-byte (64-bit) chunks
  const emojis: string[] = []

  for (let i = 0; i < 4; i++) {
    const byteOffset = i * 8
    // Clear highest bit of first byte
    const highByte = hashBytes[byteOffset] & 0x7f

    // Read 64-bit unsigned BigInt
    let chunkVal = BigInt(highByte) << 56n
    for (let j = 1; j < 8; j++) {
      chunkVal |= BigInt(hashBytes[byteOffset + j]) << BigInt((7 - j) * 8)
    }

    // Modulo 333
    const index = Number(chunkVal % 333n)
    emojis.push(TELEGRAM_CALL_EMOJIS_333[index] || '🔒')
  }

  return emojis
}
