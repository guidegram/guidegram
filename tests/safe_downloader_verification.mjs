import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { SafeDownloader } from '../electron/safeDownloader'

async function runTests() {
  console.log('🧪 Starting SafeDownloader & Anti-Path Traversal Tests (Layer 08)...')

  // Test 1: Filename sanitization
  assert.equal(SafeDownloader.sanitizeFilename('../../evil.exe'), 'evil.exe')
  assert.equal(SafeDownloader.sanitizeFilename('..\\..\\windows\\calc.exe'), 'calc.exe')
  assert.equal(SafeDownloader.sanitizeFilename('file:name*?.png'), 'file_name__.png')
  assert.equal(SafeDownloader.sanitizeFilename('evil\0hidden.txt'), 'evilhidden.txt')
  assert.equal(SafeDownloader.sanitizeFilename('CON.txt'), '_CON.txt')
  assert.equal(SafeDownloader.sanitizeFilename('nul.png'), '_nul.png')
  assert.equal(SafeDownloader.sanitizeFilename('   .secret.  '), 'secret')
  assert.equal(SafeDownloader.sanitizeFilename(null), 'file.bin')
  console.log('  ✅ Filename sanitization & character stripping passed')

  // Test 2: Safe path resolution & bounds check
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guidegram-test-down-'))
  try {
    const safeResolved = SafeDownloader.resolveSafePath(tempDir, 'photo.jpg')
    assert.equal(safeResolved, path.join(tempDir, 'photo.jpg'))
    assert.ok(safeResolved.startsWith(path.resolve(tempDir)))

    // Path traversal attempt must be neutralized or thrown
    const traversalAttempt = SafeDownloader.resolveSafePath(tempDir, '../../../../etc/passwd')
    assert.equal(traversalAttempt, path.join(tempDir, 'passwd'))
    assert.ok(traversalAttempt.startsWith(path.resolve(tempDir)))
    console.log('  ✅ Safe path resolution & directory bounds check passed')

    // Test 3: Collision avoidance
    const dummyFile = path.join(tempDir, 'document.pdf')
    fs.writeFileSync(dummyFile, 'content')
    const nonColliding1 = SafeDownloader.getNonCollidingPath(dummyFile)
    assert.equal(nonColliding1, path.join(tempDir, 'document (1).pdf'))

    fs.writeFileSync(nonColliding1, 'content2')
    const nonColliding2 = SafeDownloader.getNonCollidingPath(dummyFile)
    assert.equal(nonColliding2, path.join(tempDir, 'document (2).pdf'))
    console.log('  ✅ Non-colliding path resolution passed')
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }

  // Test 4: Dangerous executable extension detection
  assert.equal(SafeDownloader.isDangerousExtension('virus.exe'), true)
  assert.equal(SafeDownloader.isDangerousExtension('script.bat'), true)
  assert.equal(SafeDownloader.isDangerousExtension('payload.ps1'), true)
  assert.equal(SafeDownloader.isDangerousExtension('macro.vbs'), true)
  assert.equal(SafeDownloader.isDangerousExtension('photo.jpg'), false)
  assert.equal(SafeDownloader.isDangerousExtension('document.pdf'), false)
  assert.equal(SafeDownloader.isDangerousExtension('audio.ogg'), false)
  assert.equal(SafeDownloader.isDangerousExtension('video.mp4'), false)
  console.log('  ✅ Dangerous executable extension classification passed')

  console.log('🎉 All SafeDownloader Tests (Layer 08) PASSED successfully!')
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
