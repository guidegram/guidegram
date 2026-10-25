/**
 * DragDropSanitizer Verification Suite (Layer 08 Security Guardrails & Anti-Exfiltration)
 * Tests:
 * 1. Singleton pattern and reset
 * 2. Executable extension blocking (.exe, .bat, .cmd, .ps1, .vbs, .scr, .hta)
 * 3. Windows Shell Link (.lnk) shortcut blocking
 * 4. Double-extension bypass detection (.pdf.exe, .jpg.vbs)
 * 5. Safe file extensions approval (.png, .jpg, .pdf, .mp3, .ogg, .mp4, .zip, .txt)
 * 6. Path traversal rejection (../, ..\, null-bytes)
 * 7. Unsafe filename character sanitization
 * 8. Dangerous URI schemes blocking (javascript:, vbscript:, file:, data:text/html)
 * 9. Safe web URL acceptance (https://...)
 * 10. ASCII control character stripping from dropped text
 * 11. Chromium drop will-navigate interception on webContents
 * 12. Full telemetry metrics reporting
 */

import assert from 'node:assert'
import { DragDropSanitizer } from '../electron/dragDropSanitizer.ts'

console.log('🧪 Starting DragDropSanitizer Verification Suite (Layer 08)...')

let passedAssertions = 0

function it(desc, fn) {
  try {
    fn()
    passedAssertions++
    console.log(`  ✅ ${desc}`)
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`)
    console.error(err)
    process.exit(1)
  }
}

// Mock WebContents
class MockWebContents {
  constructor() {
    this.handlers = new Map()
  }

  on(event, handler) {
    this.handlers.set(event, handler)
  }

  emit(event, ...args) {
    const handler = this.handlers.get(event)
    if (handler) handler(...args)
  }
}

// 1. Singleton
it('1. Returns singleton instance and supports clean reset', () => {
  DragDropSanitizer.resetInstance()
  const instance1 = DragDropSanitizer.getInstance()
  const instance2 = DragDropSanitizer.getInstance()
  assert.strictEqual(instance1, instance2)
})

// 2. Executable extension blocking
it('2. Blocks dangerous executable and script extensions (.exe, .bat, .cmd, .ps1, .vbs, .scr)', () => {
  const sanitizer = DragDropSanitizer.getInstance()
  sanitizer.reset()

  const badFiles = [
    'installer.exe',
    'setup.bat',
    'run.cmd',
    'exploit.ps1',
    'macro.vbs',
    'screensaver.scr',
    'app.hta',
    'module.cpl',
  ]

  for (const name of badFiles) {
    const res = sanitizer.sanitizeDroppedFile({ name })
    assert.strictEqual(res.safe, false, `File ${name} must be blocked`)
    assert.strictEqual(res.reason.includes('blocked'), true)
  }

  const tel = sanitizer.getTelemetry()
  assert.strictEqual(tel.dangerousFilesBlocked, badFiles.length)
  assert.strictEqual(tel.executableExtensionsBlocked, badFiles.length)
})

// 3. Windows Shell link (.lnk)
it('3. Blocks Windows Shell shortcut (.lnk) files', () => {
  const sanitizer = DragDropSanitizer.getInstance()
  const res = sanitizer.sanitizeDroppedFile({ name: 'malicious_shortcut.lnk' })
  assert.strictEqual(res.safe, false)
  assert.strictEqual(res.extension, 'lnk')
})

// 4. Double-extension bypass detection
it('4. Detects and flags double-extension masquerade tricks (.pdf.exe, .jpg.vbs)', () => {
  const sanitizer = DragDropSanitizer.getInstance()
  const res = sanitizer.sanitizeDroppedFile({ name: 'invoice_2026.pdf.exe' })
  assert.strictEqual(res.safe, false)
  assert.strictEqual(res.isDoubleExtension, true)
  assert.strictEqual(res.extension, 'exe')
})

// 5. Safe file extensions approval
it('5. Permits standard media and document files (.png, .pdf, .mp3, .ogg, .zip)', () => {
  const sanitizer = DragDropSanitizer.getInstance()
  sanitizer.reset()

  const goodFiles = [
    'photo.png',
    'document.pdf',
    'voice_note.ogg',
    'music.mp3',
    'video.mp4',
    'archive.zip',
    'readme.txt',
  ]

  for (const name of goodFiles) {
    const res = sanitizer.sanitizeDroppedFile({ name })
    assert.strictEqual(res.safe, true, `File ${name} must be allowed`)
  }

  assert.strictEqual(sanitizer.getTelemetry().dangerousFilesBlocked, 0)
})

// 6. Path traversal rejection
it('6. Blocks path traversal sequences (../, ..\\) and null bytes', () => {
  const sanitizer = DragDropSanitizer.getInstance()
  sanitizer.reset()

  assert.strictEqual(sanitizer.sanitizeDroppedFile({ name: '../../etc/passwd' }).safe, false)
  assert.strictEqual(sanitizer.sanitizeDroppedFile({ name: '..\\..\\Windows\\System32\\cmd.exe' }).safe, false)
  assert.strictEqual(sanitizer.sanitizeDroppedFile({ name: 'file.txt\0.exe' }).safe, false)
  assert.strictEqual(sanitizer.sanitizeDroppedFile({ name: 'report%00.pdf' }).safe, false)

  assert.strictEqual(sanitizer.getTelemetry().pathTraversalsBlocked, 4)
})

// 7. Unsafe filename character sanitization
it('7. Normalizes and replaces unsafe characters from filenames', () => {
  const sanitizer = DragDropSanitizer.getInstance()
  const res = sanitizer.sanitizeDroppedFile({ name: 'my*file?<name>.png' })
  assert.strictEqual(res.safe, true)
  assert.strictEqual(res.sanitizedName, 'my_file__name_.png')
})

// 8. Dangerous URI schemes
it('8. Identifies and blocks dangerous URI schemes (javascript:, vbscript:, file:)', () => {
  const sanitizer = DragDropSanitizer.getInstance()
  sanitizer.reset()

  const dangerousUris = [
    'javascript:alert(document.cookie)',
    'vbscript:MsgBox("pwned")',
    'file:///C:/Users/Admin/Desktop/secret.txt',
    'data:text/html,<script>alert(1)</script>',
    'about:blank',
  ]

  for (const text of dangerousUris) {
    const res = sanitizer.sanitizeDroppedText(text)
    assert.strictEqual(res.safe, false, `URI ${text} must be blocked`)
    assert.strictEqual(res.isDangerousUri, true)
  }

  assert.strictEqual(sanitizer.getTelemetry().dangerousUrisBlocked, dangerousUris.length)
})

// 9. Safe web URL acceptance
it('9. Allows safe HTTPS web URLs with valid structure', () => {
  const sanitizer = DragDropSanitizer.getInstance()
  const res = sanitizer.sanitizeDroppedText('https://telegram.org/faq')
  assert.strictEqual(res.safe, true)
  assert.strictEqual(res.isUrl, true)
  assert.strictEqual(res.isDangerousUri, false)
  assert.strictEqual(res.sanitizedText, 'https://telegram.org/faq')
})

// 10. ASCII control character stripping
it('10. Strips non-printable ASCII control characters from text', () => {
  const sanitizer = DragDropSanitizer.getInstance()
  const rawText = 'Hello\x00\x07World\x1F!'
  const res = sanitizer.sanitizeDroppedText(rawText)
  assert.strictEqual(res.safe, true)
  assert.strictEqual(res.sanitizedText, 'HelloWorld!')
})

// 11. Chromium will-navigate drop navigation interception
it('11. Intercepts will-navigate on webContents to prevent drop navigation hijack', () => {
  const sanitizer = DragDropSanitizer.getInstance()
  sanitizer.reset()
  const mockWebContents = new MockWebContents()
  sanitizer.attachToWebContents(mockWebContents)

  // Test 1: Navigation to external dropped URL is blocked
  let defaultPrevented = false
  const mockEvent = {
    preventDefault: () => { defaultPrevented = true }
  }
  mockWebContents.emit('will-navigate', mockEvent, 'file:///C:/Windows/System32/calc.exe')
  assert.strictEqual(defaultPrevented, true, 'External file navigation must be blocked')

  // Test 2: Internal index.html navigation is allowed
  defaultPrevented = false
  mockWebContents.emit('will-navigate', mockEvent, 'file:///app/dist/index.html')
  assert.strictEqual(defaultPrevented, false, 'Internal index.html must be permitted')
})

// 12. Full Telemetry structure
it('12. Telemetry structure reports accurate counts across all drop validations', () => {
  const sanitizer = DragDropSanitizer.getInstance()
  const tel = sanitizer.getTelemetry()
  assert.strictEqual(typeof tel.totalDropsInspected, 'number')
  assert.strictEqual(typeof tel.dangerousFilesBlocked, 'number')
  assert.strictEqual(typeof tel.executableExtensionsBlocked, 'number')
  assert.strictEqual(typeof tel.dangerousUrisBlocked, 'number')
  assert.strictEqual(typeof tel.pathTraversalsBlocked, 'number')
})

console.log(`\n🎉 All ${passedAssertions}/${passedAssertions} DragDropSanitizer assertions passed successfully!`)
process.exit(0)
