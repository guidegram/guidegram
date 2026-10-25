import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { EphemeralMediaManager } from '../electron/ephemeralMediaManager.ts'

test('EphemeralMediaManager: safeShredAndUnlink overwrites and deletes file', () => {
  const tmpDir = os.tmpdir()
  const testFile = path.join(tmpDir, `ephemeral_shred_${Date.now()}.bin`)
  fs.writeFileSync(testFile, Buffer.from('Super confidential secret voice recording'), 'utf8')
  assert.equal(fs.existsSync(testFile), true)

  const shredded = EphemeralMediaManager.safeShredAndUnlink(testFile)
  assert.equal(shredded, true)
  assert.equal(fs.existsSync(testFile), false, 'File should be removed from disk')
})

test('EphemeralMediaManager: Automatic TTL purge destroys expired media', async () => {
  const tmpDir = os.tmpdir()
  const testFile = path.join(tmpDir, `ephemeral_ttl_${Date.now()}.bin`)
  fs.writeFileSync(testFile, Buffer.from('Expiring in 0.1 seconds'), 'utf8')

  // Register with 0.1s TTL (100ms)
  const token = `token_ttl_${Date.now()}`
  EphemeralMediaManager.registerEphemeralMedia(token, testFile, 0.1, true)
  assert.equal(EphemeralMediaManager.getPendingCount(), 1)
  assert.equal(fs.existsSync(testFile), true)

  // Wait 150ms for TTL expiration
  await new Promise((r) => setTimeout(r, 150))

  assert.equal(fs.existsSync(testFile), false, 'File should be purged after TTL')
  assert.equal(EphemeralMediaManager.getPendingCount(), 0)
})

test('EphemeralMediaManager: markPlayed immediately destroys view-once media', async () => {
  const tmpDir = os.tmpdir()
  const testFile = path.join(tmpDir, `ephemeral_play_${Date.now()}.bin`)
  fs.writeFileSync(testFile, Buffer.from('View once voice note'), 'utf8')

  const token = `token_play_${Date.now()}`
  EphemeralMediaManager.registerEphemeralMedia(token, testFile, 60, true) // 60s TTL
  assert.equal(fs.existsSync(testFile), true)

  // User finished playback
  const played = await EphemeralMediaManager.markPlayed(token, 20)
  assert.equal(played, true)
  assert.equal(fs.existsSync(testFile), false, 'File should be shredded upon playback completion')
  assert.equal(EphemeralMediaManager.getPendingCount(), 0)
})

test('EphemeralMediaManager: clearAll securely purges all registered ephemeral items', () => {
  const tmpDir = os.tmpdir()
  const f1 = path.join(tmpDir, `ephemeral_c1_${Date.now()}.bin`)
  const f2 = path.join(tmpDir, `ephemeral_c2_${Date.now()}.bin`)
  fs.writeFileSync(f1, Buffer.from('One'))
  fs.writeFileSync(f2, Buffer.from('Two'))

  EphemeralMediaManager.registerEphemeralMedia('t1', f1, 100)
  EphemeralMediaManager.registerEphemeralMedia('t2', f2, 100)
  assert.equal(EphemeralMediaManager.getPendingCount(), 2)

  EphemeralMediaManager.clearAll()
  assert.equal(EphemeralMediaManager.getPendingCount(), 0)
  assert.equal(fs.existsSync(f1), false)
  assert.equal(fs.existsSync(f2), false)
})
