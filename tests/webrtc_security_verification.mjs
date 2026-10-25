import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { WebrtcSecurityGuard } from '../electron/webrtcSecurityGuard.ts'

test('Phase 26: WebRTC Media Constraints & IP Leak Prevention Verification', async (t) => {
  await t.test('1. Verify applyCommandLineSwitches policy selection', () => {
    let capturedSwitches = []
    const mockApp = {
      commandLine: {
        appendSwitch: (key, val) => capturedSwitches.push({ key, val })
      }
    }

    const standardPolicy = WebrtcSecurityGuard.applyCommandLineSwitches(mockApp, false)
    assert.equal(standardPolicy, 'default_public_interface_only')
    assert.deepEqual(capturedSwitches[0], {
      key: 'force-webrtc-ip-handling-policy',
      val: 'default_public_interface_only'
    })

    const proxyPolicy = WebrtcSecurityGuard.applyCommandLineSwitches(mockApp, true)
    assert.equal(proxyPolicy, 'disable_non_proxied_udp')
    assert.deepEqual(capturedSwitches[1], {
      key: 'force-webrtc-ip-handling-policy',
      val: 'disable_non_proxied_udp'
    })
  })

  await t.test('2. Verify isPrivateIp detection for RFC1918 and loopback addresses', () => {
    // Private IPv4
    assert.equal(WebrtcSecurityGuard.isPrivateIp('10.0.0.1'), true)
    assert.equal(WebrtcSecurityGuard.isPrivateIp('172.16.0.1'), true)
    assert.equal(WebrtcSecurityGuard.isPrivateIp('172.31.255.255'), true)
    assert.equal(WebrtcSecurityGuard.isPrivateIp('192.168.1.100'), true)
    assert.equal(WebrtcSecurityGuard.isPrivateIp('127.0.0.1'), true)
    assert.equal(WebrtcSecurityGuard.isPrivateIp('169.254.10.5'), true)

    // Private IPv6
    assert.equal(WebrtcSecurityGuard.isPrivateIp('fc00::1'), true)
    assert.equal(WebrtcSecurityGuard.isPrivateIp('fd12:3456:789a::1'), true)
    assert.equal(WebrtcSecurityGuard.isPrivateIp('fe80::abcd'), true)

    // Public IPs
    assert.equal(WebrtcSecurityGuard.isPrivateIp('8.8.8.8'), false)
    assert.equal(WebrtcSecurityGuard.isPrivateIp('149.154.167.50'), false)
    assert.equal(WebrtcSecurityGuard.isPrivateIp('2606:4700:4700::1111'), false)
    assert.equal(WebrtcSecurityGuard.isPrivateIp(''), false)
    assert.equal(WebrtcSecurityGuard.isPrivateIp(null), false)
  })

  await t.test('3. Verify sanitizeIceCandidate filters private IPs and enforces P2P restrictions', () => {
    const privateHost = 'candidate:1 1 UDP 2122260223 192.168.1.50 54321 typ host'
    const publicSrflx = 'candidate:2 1 UDP 1686052607 149.154.167.50 54322 typ srflx raddr 192.168.1.50 rport 54321'
    const publicRelay = 'candidate:3 1 UDP 41885695 149.154.175.100 54323 typ relay raddr 0.0.0.0 rport 0'

    // When private filter is active, private host candidate must be dropped
    assert.equal(WebrtcSecurityGuard.sanitizeIceCandidate(privateHost), null)

    // Public candidates should pass when P2P is allowed
    assert.equal(WebrtcSecurityGuard.sanitizeIceCandidate(publicSrflx, { allowP2p: true }), publicSrflx)
    assert.equal(WebrtcSecurityGuard.sanitizeIceCandidate(publicRelay, { allowP2p: true }), publicRelay)

    // When P2P is disallowed, only relay is kept, srflx is dropped
    assert.equal(WebrtcSecurityGuard.sanitizeIceCandidate(publicSrflx, { allowP2p: false }), null)
    assert.equal(WebrtcSecurityGuard.sanitizeIceCandidate(publicRelay, { allowP2p: false }), publicRelay)
  })

  await t.test('4. Verify getRtcConfiguration adapts to Telegram P2P privacy settings', () => {
    // Nobody: relay only
    const nobodyConf = WebrtcSecurityGuard.getRtcConfiguration({ p2pPrivacy: 'nobody' })
    assert.equal(nobodyConf.iceTransportPolicy, 'relay')

    // Contacts only, non-contact: relay only
    const nonContactConf = WebrtcSecurityGuard.getRtcConfiguration({ p2pPrivacy: 'contacts', isContact: false })
    assert.equal(nonContactConf.iceTransportPolicy, 'relay')

    // Contacts only, verified contact: P2P allowed
    const contactConf = WebrtcSecurityGuard.getRtcConfiguration({ p2pPrivacy: 'contacts', isContact: true })
    assert.equal(contactConf.iceTransportPolicy, 'all')

    // Everybody: P2P allowed
    const everybodyConf = WebrtcSecurityGuard.getRtcConfiguration({ p2pPrivacy: 'everybody' })
    assert.equal(everybodyConf.iceTransportPolicy, 'all')
  })

  await t.test('5. Verify electron/main.ts incorporates WebrtcSecurityGuard', () => {
    const mainSource = fs.readFileSync(path.resolve('electron/main.ts'), 'utf-8')
    assert.ok(mainSource.includes('WebrtcSecurityGuard.applyCommandLineSwitches'), 'main.ts must call applyCommandLineSwitches')
  })
})
