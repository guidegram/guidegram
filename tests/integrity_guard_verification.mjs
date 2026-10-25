import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { IntegrityGuard } from '../electron/integrityGuard.ts'

test('IntegrityGuard: File SHA-256 checksum calculation and constant-time verification', async () => {
  const tmpDir = os.tmpdir()
  const testFile = path.join(tmpDir, `guidegram_integrity_test_${Date.now()}.txt`)
  const content = 'Guidegram Master Hardening Layer 08 Integrity Verification'
  fs.writeFileSync(testFile, content, 'utf8')

  const expectedHash = crypto.createHash('sha256').update(content).digest('hex')

  try {
    const computedHash = await IntegrityGuard.calculateFileSha256(testFile)
    assert.equal(computedHash, expectedHash)

    const isMatch = await IntegrityGuard.verifyFileIntegrity(testFile, expectedHash)
    assert.equal(isMatch, true, 'Integrity verification should succeed on matching hash')

    const isTampered = await IntegrityGuard.verifyFileIntegrity(testFile, 'a'.repeat(64))
    assert.equal(isTampered, false, 'Integrity verification should fail on mismatched hash')

    const nonExistent = await IntegrityGuard.calculateFileSha256('/tmp/non_existent_file.xyz')
    assert.equal(nonExistent, null, 'Should return null gracefully on missing file')
  } finally {
    try { fs.unlinkSync(testFile) } catch {}
  }
})

test('IntegrityGuard: Detects hostile debugging CLI arguments in production mode', () => {
  const origArgv = [...process.argv]
  try {
    process.argv.push('--remote-debugging-port=9222')
    const report = IntegrityGuard.detectTamperedEnvironment(true)
    assert.equal(report.isTampered, true)
    assert.ok(report.reasons.some((r) => r.includes('--remote-debugging-port')))
    assert.ok(report.inspectedFlags.some((f) => f.includes('--remote-debugging-port')))
  } finally {
    process.argv = origArgv
  }
})

test('IntegrityGuard: Detects and sanitizes hostile NODE_OPTIONS environment variables', () => {
  const origNodeOptions = process.env.NODE_OPTIONS
  try {
    process.env.NODE_OPTIONS = '--require /tmp/malicious_hook.js'
    const report = IntegrityGuard.detectTamperedEnvironment(true)
    assert.equal(report.isTampered, true)
    assert.ok(report.detectedEnvThreats.some((t) => t.includes('NODE_OPTIONS')))

    // Sanitize
    IntegrityGuard.sanitizeEnvironment()
    assert.equal(process.env.NODE_OPTIONS, undefined, 'NODE_OPTIONS should be erased by sanitizer')
  } finally {
    if (origNodeOptions !== undefined) {
      process.env.NODE_OPTIONS = origNodeOptions
    } else {
      delete process.env.NODE_OPTIONS
    }
  }
})

test('IntegrityGuard: Clean environment passes with zero tampering alerts', () => {
  IntegrityGuard.sanitizeEnvironment()
  const report = IntegrityGuard.detectTamperedEnvironment(false)
  assert.equal(report.isTampered, false)
  assert.equal(report.reasons.length, 0)
})
