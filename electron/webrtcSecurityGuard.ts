let Logger: any = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const loggerModule = require('./telegram/logger')
  if (loggerModule?.Logger) Logger = loggerModule.Logger
} catch {
  // Fallback for ESM test runner
}

export type P2pCallPrivacySetting = 'nobody' | 'contacts' | 'everybody'

export interface WebrtcPolicyOptions {
  hasActiveProxy?: boolean
  p2pPrivacy?: P2pCallPrivacySetting
  isContact?: boolean
}

/**
 * WebrtcSecurityGuard (Layer 08 / Telegram Calling Guard)
 * Protects against WebRTC IP leakage, proxy bypassing via UDP,
 * and LAN topology enumeration during Telegram peer-to-peer and group calls.
 */
export class WebrtcSecurityGuard {
  private static readonly PRIVATE_IPV4_REGEX = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3})$/
  private static readonly PRIVATE_IPV6_REGEX = /^(f[cd][0-9a-f]{0,2}:|fe80:|::1$)/i

  /**
   * Applies Chromium command-line switches to enforce WebRTC IP handling policy.
   * - 'disable_non_proxied_udp': Ensures WebRTC never leaks outside active proxy tunnels.
   * - 'default_public_interface_only': Strips local private RFC1918 interfaces from candidate gathering.
   */
  public static applyCommandLineSwitches(appInstance?: any, hasProxy = false): string {
    const policy = hasProxy ? 'disable_non_proxied_udp' : 'default_public_interface_only'
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const electron = appInstance || require('electron')
      const app = electron.app || electron
      if (app && app.commandLine && typeof app.commandLine.appendSwitch === 'function') {
        app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', policy)
        Logger.info(`[WebrtcSecurityGuard] Applied force-webrtc-ip-handling-policy: ${policy}`)
      }
    } catch {
      // In headless test environments
    }
    return policy
  }

  /**
   * Evaluates if a given IP address is a private / link-local / loopback address.
   */
  public static isPrivateIp(ip: string): boolean {
    if (!ip || typeof ip !== 'string') return false
    const trimmed = ip.trim()
    return this.PRIVATE_IPV4_REGEX.test(trimmed) || this.PRIVATE_IPV6_REGEX.test(trimmed)
  }

  /**
   * Sanitizes an SDP ICE candidate line, filtering private IPs and enforcing P2P relay restrictions.
   * Returns sanitized candidate string, or null if candidate is rejected.
   */
  public static sanitizeIceCandidate(
    candidateLine: string,
    options: { allowP2p?: boolean; filterPrivateIps?: boolean } = {}
  ): string | null {
    if (!candidateLine || typeof candidateLine !== 'string') return null
    const trimmed = candidateLine.trim()
    if (!trimmed.startsWith('candidate:')) return trimmed

    const parts = trimmed.split(' ')
    if (parts.length < 8) return trimmed

    // parts format: candidate:<foundation> <component> <transport> <priority> <ip> <port> typ <type> ...
    const ip = parts[4]
    const typIndex = parts.indexOf('typ')
    const typ = typIndex !== -1 && typIndex + 1 < parts.length ? parts[typIndex + 1] : ''

    const allowP2p = options.allowP2p ?? true
    const filterPrivate = options.filterPrivateIps ?? true

    // 1. If P2P is disabled, drop host and srflx candidates (only allow relay)
    if (!allowP2p && typ !== 'relay') {
      Logger.debug(`[WebrtcSecurityGuard] Dropping non-relay candidate (${typ}) because P2P calls are disallowed.`)
      return null
    }

    // 2. Filter private LAN and local loopback IPs
    if (filterPrivate && this.isPrivateIp(ip)) {
      Logger.debug(`[WebrtcSecurityGuard] Dropping candidate with private IP: ${ip}`)
      return null
    }

    return trimmed
  }

  /**
   * Generates safe RTCConfiguration based on Telegram P2P calling privacy settings.
   */
  public static getRtcConfiguration(options: WebrtcPolicyOptions = {}): {
    iceTransportPolicy: 'all' | 'relay'
    bundlePolicy: 'max-bundle'
    rtcpMuxPolicy: 'require'
  } {
    const p2pSetting = options.p2pPrivacy || 'contacts'
    const isContact = options.isContact ?? false
    const allowP2p =
      p2pSetting === 'everybody' || (p2pSetting === 'contacts' && isContact)

    return {
      iceTransportPolicy: allowP2p ? 'all' : 'relay',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    }
  }
}
