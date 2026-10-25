import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { SecurityGuardrails } from '../electron/securityGuardrails.ts'

test('Phase 25: Electron WebPreferences Lockdown, Sandbox & Permission Guard Verification', async (t) => {
  await t.test('1. Verify getHardenedWebPreferences default security posture', () => {
    const prefs = SecurityGuardrails.getHardenedWebPreferences({
      preload: 'dummy/preload.cjs',
    })

    assert.equal(prefs.preload, 'dummy/preload.cjs')
    assert.equal(prefs.sandbox, true, 'Sandbox must be enabled by default')
    assert.equal(prefs.contextIsolation, true, 'contextIsolation must be strictly true')
    assert.equal(prefs.nodeIntegration, false, 'nodeIntegration must be strictly false')
    assert.equal(prefs.nodeIntegrationInWorker, false, 'nodeIntegrationInWorker must be false')
    assert.equal(prefs.nodeIntegrationInSubFrames, false, 'nodeIntegrationInSubFrames must be false')
    assert.equal(prefs.webSecurity, true, 'webSecurity must be enabled')
    assert.equal(prefs.allowRunningInsecureContent, false, 'allowRunningInsecureContent must be false')
    assert.equal(prefs.navigateOnDragDrop, false, 'navigateOnDragDrop must be false to prevent drop hijacking')
    assert.equal(prefs.plugins, false, 'plugins must be disabled')
    assert.equal(prefs.spellcheck, false, 'spellcheck remote dictionaries must be disabled')
  })

  await t.test('2. Verify isInternalAppOrigin boundary evaluation', () => {
    assert.equal(SecurityGuardrails.isInternalAppOrigin('http://localhost:5173'), true)
    assert.equal(SecurityGuardrails.isInternalAppOrigin('http://127.0.0.1:8080'), true)
    assert.equal(SecurityGuardrails.isInternalAppOrigin('guidegram://open'), true)
    assert.equal(SecurityGuardrails.isInternalAppOrigin('guidegram-media://thumb/123'), true)
    assert.equal(SecurityGuardrails.isInternalAppOrigin('file:///C:/app/index.html'), true)

    // Malicious or unapproved origins must be rejected
    assert.equal(SecurityGuardrails.isInternalAppOrigin('https://evil-site.com'), false)
    assert.equal(SecurityGuardrails.isInternalAppOrigin('javascript:alert(1)'), false)
    assert.equal(SecurityGuardrails.isInternalAppOrigin('data:text/html,hack'), false)
    assert.equal(SecurityGuardrails.isInternalAppOrigin(null), false)
    assert.equal(SecurityGuardrails.isInternalAppOrigin(''), false)
  })

  await t.test('3. Verify Permission Request and Check Lockdown logic', () => {
    let capturedRequestHandler = null
    let capturedCheckHandler = null

    const mockSession = {
      setPermissionRequestHandler: (fn) => { capturedRequestHandler = fn },
      setPermissionCheckHandler: (fn) => { capturedCheckHandler = fn }
    }

    SecurityGuardrails.configurePermissionLockdown(mockSession)
    assert.ok(capturedRequestHandler, 'setPermissionRequestHandler must be registered')
    assert.ok(capturedCheckHandler, 'setPermissionCheckHandler must be registered')

    // Test permission request for notifications from trusted origin
    let granted = null
    capturedRequestHandler(null, 'notifications', (res) => { granted = res }, { requestingUrl: 'http://localhost:5173/app' })
    assert.equal(granted, true, 'Notifications should be allowed for localhost')

    // Test permission request for geolocation from trusted origin (must be blocked)
    capturedRequestHandler(null, 'geolocation', (res) => { granted = res }, { requestingUrl: 'http://localhost:5173/app' })
    assert.equal(granted, false, 'Geolocation must always be denied')

    // Test permission request for media from untrusted external origin (must be blocked)
    capturedRequestHandler(null, 'media', (res) => { granted = res }, { requestingUrl: 'https://external-phishing.com' })
    assert.equal(granted, false, 'Media must be denied for external origins')

    // Test permission check handler
    assert.equal(capturedCheckHandler(null, 'notifications', 'guidegram://main'), true)
    assert.equal(capturedCheckHandler(null, 'midi', 'guidegram://main'), false)
    assert.equal(capturedCheckHandler(null, 'notifications', 'https://attacker.org'), false)
  })

  await t.test('4. Verify will-attach-webview sanitization and lockdown', () => {
    const listeners = {}
    const mockWin = {
      webContents: {
        setWindowOpenHandler: () => {},
        on: (event, fn) => { listeners[event] = fn }
      }
    }

    SecurityGuardrails.attachSecureWindowHandlers(mockWin, true)
    assert.ok(listeners['will-attach-webview'], 'will-attach-webview listener must be registered')

    const injectedPrefs = {
      preload: 'malicious-preload.js',
      preloadURL: 'file:///hack.js',
      nodeIntegration: true,
      sandbox: false,
      contextIsolation: false
    }

    listeners['will-attach-webview']({}, injectedPrefs, { src: 'https://guest.com' })
    assert.equal(injectedPrefs.preload, undefined, 'Preload must be stripped')
    assert.equal(injectedPrefs.preloadURL, undefined, 'preloadURL must be stripped')
    assert.equal(injectedPrefs.nodeIntegration, false, 'nodeIntegration must be forced false')
    assert.equal(injectedPrefs.contextIsolation, true, 'contextIsolation must be forced true')
    assert.equal(injectedPrefs.sandbox, true, 'sandbox must be forced true')
  })

  await t.test('5. Verify electron/main.ts incorporates hardened WebPreferences', () => {
    const mainSource = fs.readFileSync(path.resolve('electron/main.ts'), 'utf-8')
    assert.ok(mainSource.includes('SecurityGuardrails.getHardenedWebPreferences'), 'main.ts must use getHardenedWebPreferences')
    assert.ok(mainSource.includes('SecurityGuardrails.configurePermissionLockdown()'), 'main.ts must call configurePermissionLockdown')
    assert.ok(!mainSource.includes('sandbox: false'), 'main.ts must not have sandbox: false')
  })
})
