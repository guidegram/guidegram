import test from 'node:test'
import assert from 'node:assert/strict'
import { ClipboardGuard } from '../electron/clipboardGuard.ts'

test('ClipboardGuard: Secret detection heuristics', () => {
  // Telegram Bot Token
  const botToken = '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ123456789'
  assert.equal(ClipboardGuard.isSensitiveSecret(botToken), true, 'Should detect bot token')

  // 64-char Hex Auth Key
  const hexKey = 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0'
  assert.equal(ClipboardGuard.isSensitiveSecret(hexKey), true, 'Should detect 64-char hex key')

  // BIP39 Mnemonic Seed (12 words)
  const mnemonic = 'abandon ability able about above absent absorb abstract absurd abuse access accident'
  assert.equal(ClipboardGuard.isSensitiveSecret(mnemonic), true, 'Should detect 12-word BIP39 mnemonic')

  // Normal text / chat messages
  assert.equal(ClipboardGuard.isSensitiveSecret('Hello world! How are you?'), false, 'Normal text is not sensitive')
  assert.equal(ClipboardGuard.isSensitiveSecret('https://t.me/guidegram'), false, 'URL is not sensitive')
  assert.equal(ClipboardGuard.isSensitiveSecret(''), false, 'Empty string is not sensitive')
})

test('ClipboardGuard: Non-sensitive write does not activate auto-clear timer', () => {
  ClipboardGuard.cancelPendingClear()

  let clipboardContent = ''
  const mockClip = {
    writeText: (t) => { clipboardContent = t },
    readText: () => clipboardContent,
    clear: () => { clipboardContent = '' }
  }

  const result = ClipboardGuard.writeText('Just regular message', {}, mockClip)
  assert.equal(result, true)
  assert.equal(clipboardContent, 'Just regular message')
  assert.equal(ClipboardGuard.getRemainingTtlMs(), 0, 'No active timer for non-sensitive text')
})

test('ClipboardGuard: Sensitive text triggers auto-clear timer and wipes clipboard upon expiration', async () => {
  ClipboardGuard.cancelPendingClear()

  let clipboardContent = ''
  const mockClip = {
    writeText: (t) => { clipboardContent = t },
    readText: () => clipboardContent,
    clear: () => { clipboardContent = '' }
  }

  const botToken = '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ123456789'
  // Write with short 100ms TTL for testing
  const result = ClipboardGuard.writeText(botToken, { ttlMs: 100 }, mockClip)
  assert.equal(result, true)
  assert.equal(clipboardContent, botToken)
  assert.ok(ClipboardGuard.getRemainingTtlMs() > 0, 'Timer should be active')

  // Wait for TTL to expire
  await new Promise((resolve) => setTimeout(resolve, 150))

  assert.equal(clipboardContent, '', 'Clipboard should be wiped after TTL expiration')
  assert.equal(ClipboardGuard.getRemainingTtlMs(), 0, 'Timer should be cleared')
})

test('ClipboardGuard: Subsequent copy of different content prevents clearing new clipboard content', async () => {
  ClipboardGuard.cancelPendingClear()

  let clipboardContent = ''
  const mockClip = {
    writeText: (t) => { clipboardContent = t },
    readText: () => clipboardContent,
    clear: () => { clipboardContent = '' }
  }

  const hexKey = 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0'
  ClipboardGuard.writeText(hexKey, { ttlMs: 100 }, mockClip)
  assert.equal(clipboardContent, hexKey)

  // User copies another safe text externally in the meantime
  mockClip.writeText('User copied this recipe afterwards')

  // Wait for the sensitive TTL to expire
  await new Promise((resolve) => setTimeout(resolve, 150))

  // Clipboard should NOT be wiped because content changed
  assert.equal(clipboardContent, 'User copied this recipe afterwards', 'Clipboard content should remain intact')
})

test('ClipboardGuard: cancelPendingClear resets active timer safely', () => {
  ClipboardGuard.cancelPendingClear()

  let clipboardContent = ''
  const mockClip = {
    writeText: (t) => { clipboardContent = t },
    readText: () => clipboardContent,
    clear: () => { clipboardContent = '' }
  }

  ClipboardGuard.writeText('Secret password', { isSensitive: true, ttlMs: 10000 }, mockClip)
  assert.ok(ClipboardGuard.getRemainingTtlMs() > 0)

  ClipboardGuard.cancelPendingClear()
  assert.equal(ClipboardGuard.getRemainingTtlMs(), 0)
})
