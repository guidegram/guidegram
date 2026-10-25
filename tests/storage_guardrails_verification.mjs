import assert from 'assert'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { StorageGuardrails } from '../electron/storageGuardrails.ts'

console.log('🧪 Starting StorageGuardrails Verification Tests (Layer 08)...')

// Setup sandbox environment
const sandboxDir = path.join(os.tmpdir(), `guidegram_guardrails_test_${Date.now()}`)
const mockUserData = path.join(sandboxDir, 'userData')
const mockTemp = path.join(sandboxDir, 'temp')
const mockDownloads = path.join(sandboxDir, 'downloads')

fs.mkdirSync(mockUserData, { recursive: true })
fs.mkdirSync(mockTemp, { recursive: true })
fs.mkdirSync(mockDownloads, { recursive: true })

StorageGuardrails.setMockRoots({
  userData: mockUserData,
  temp: mockTemp,
  downloads: mockDownloads,
})

try {
  // Test 1: Safe Paths Inside Authorized Bounds
  const safeFileInUserData = path.join(mockUserData, 'media', 'photo_123.jpg')
  assert.strictEqual(
    StorageGuardrails.isPathWithinAuthorizedBounds(safeFileInUserData),
    true,
    'Safe file in userData should be authorized'
  )

  const safeFileInTemp = path.join(mockTemp, 'voice_memo.ogg')
  assert.strictEqual(
    StorageGuardrails.isPathWithinAuthorizedBounds(safeFileInTemp),
    true,
    'Safe file in temp should be authorized'
  )
  console.log('  ✅ Safe authorized path resolution passed')

  // Test 2: Path Traversal Beyond Bounds
  const traversalAttempt = path.join(mockUserData, '..', '..', '..', 'secret.txt')
  assert.strictEqual(
    StorageGuardrails.isPathWithinAuthorizedBounds(traversalAttempt),
    false,
    'Path traversal with .. beyond authorized root must be denied'
  )

  assert.throws(() => {
    StorageGuardrails.assertPathWithinAuthorizedBounds(traversalAttempt)
  }, /outside authorized bounds/, 'assertPathWithinAuthorizedBounds must throw on violation')
  console.log('  ✅ Directory traversal defense passed')

  // Test 3: Null Byte / Poison Injection
  const nullByteAttempt = mockUserData + '/safe.jpg\0../../etc/passwd'
  assert.strictEqual(
    StorageGuardrails.isPathWithinAuthorizedBounds(nullByteAttempt),
    false,
    'Null byte injection must be immediately denied'
  )
  console.log('  ✅ Null byte injection denial passed')

  // Test 4: Critical System Paths Denied
  const winSysPath = 'C:\\Windows\\System32\\cmd.exe'
  const unixSysPath = '/etc/shadow'
  assert.strictEqual(
    StorageGuardrails.isPathWithinAuthorizedBounds(winSysPath),
    false,
    'System paths outside roots must be denied'
  )
  assert.strictEqual(
    StorageGuardrails.isPathWithinAuthorizedBounds(unixSysPath),
    false,
    'Unix system paths must be denied'
  )
  console.log('  ✅ Critical system paths denial passed')

  // Test 5: isSafeDirectoryForSync Evaluation
  const rootDrive = path.parse(process.cwd()).root
  assert.strictEqual(
    StorageGuardrails.isSafeDirectoryForSync(rootDrive),
    false,
    'Root drive should never be allowed as a sync source'
  )

  if (process.platform === 'win32') {
    const winDir = process.env.SystemRoot || 'C:\\Windows'
    assert.strictEqual(
      StorageGuardrails.isSafeDirectoryForSync(winDir),
      false,
      'Windows system directory must not be allowed as sync source'
    )
  }

  const validSyncFolder = path.join(sandboxDir, 'portable_data')
  fs.mkdirSync(validSyncFolder, { recursive: true })
  assert.strictEqual(
    StorageGuardrails.isSafeDirectoryForSync(validSyncFolder),
    true,
    'Valid custom data directory should be permitted for sync'
  )
  console.log('  ✅ Safe sync directory validation passed')

  console.log('🎉 All StorageGuardrails Tests (Layer 08) PASSED successfully!')
} finally {
  // Clean up sandbox
  try {
    fs.rmSync(sandboxDir, { recursive: true, force: true })
  } catch {}
}
