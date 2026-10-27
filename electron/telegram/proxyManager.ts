import net from 'net'
import { SocksProxyTcpTransport, HttpProxyTcpTransport, MtProxyTcpTransport } from '@mtcute/node'
import { ProxyConfig, AutoHarvestStatus, WarpStatus, ProxyHealthReport } from './types'
import { ProxyHarvester } from './proxyHarvester'
import { WarpManager } from './warpManager'
import { DohResolver } from './dohResolver'

export class ProxyManager {
  /**
   * Measure latency of a proxy in milliseconds
   */
  public static async testProxyPing(proxy: ProxyConfig): Promise<number> {
    if (!proxy || !proxy.host || !proxy.port) return -1
    const host = String(proxy.host).trim()
    const port = Number(proxy.port)
    if (isNaN(port) || port <= 0 || port > 65535) return -1

    return new Promise((resolve) => {
      const startTime = Date.now()
      const socket = new net.Socket()
      let settled = false

      const cleanup = (latency: number) => {
        if (settled) return
        settled = true
        socket.destroy()
        resolve(latency)
      }

      socket.setTimeout(3500)

      socket.connect(port, host, () => {
        const latency = Date.now() - startTime
        cleanup(latency)
      })

      socket.on('error', () => cleanup(-1))
      socket.on('timeout', () => cleanup(-1))
    })
  }

  /**
   * Initialize ProxyHarvester with listeners and client provider
   */
  public static init(onUpdate?: (proxies: ProxyConfig[]) => void, clientGetter?: () => any): void {
    ProxyHarvester.init(onUpdate, clientGetter)
  }

  /**
   * Start 45-minute background proxy auto-harvesting
   */
  public static startAutoHarvest(intervalMs?: number): void {
    ProxyHarvester.startAutoHarvest(intervalMs)
  }

  /**
   * Stop background proxy auto-harvesting
   */
  public static stopAutoHarvest(): void {
    ProxyHarvester.stopAutoHarvest()
  }

  /**
   * Run immediate proxy harvest across all channels
   */
  public static async harvestNow(channels?: string[]): Promise<ProxyConfig[]> {
    return ProxyHarvester.harvestNow(channels)
  }

  /**
   * Get auto-harvest status
   */
  public static getHarvestStatus(): AutoHarvestStatus {
    return ProxyHarvester.getStatus()
  }

  /**
   * Get all currently harvested and cached proxies
   */
  public static getHarvestedProxies(): ProxyConfig[] {
    return ProxyHarvester.getCachedProxies()
  }

  /**
   * Find a distinct healthy proxy not currently used by other accounts
   */
  public static getDistinctProxyForAccount(
    targetAccountId: string,
    currentAccounts: Array<{ id: string; proxyConfig?: ProxyConfig }>
  ): ProxyConfig | null {
    const cached = ProxyHarvester.getCachedProxies()
    const healthy = cached
      .filter((p) => (p.pingMs || -1) > 0)
      .sort((a, b) => (a.pingMs || 9999) - (b.pingMs || 9999))

    if (healthy.length === 0) return null

    const otherAccountProxyKeys = new Set(
      currentAccounts
        .filter((a) => a.id !== targetAccountId && a.proxyConfig?.enabled)
        .map((a) => `${a.proxyConfig?.host}:${a.proxyConfig?.port}`)
    )

    const distinct = healthy.find((p) => !otherAccountProxyKeys.has(`${p.host}:${p.port}`))
    return distinct || healthy[0] || null
  }

  /**
   * Get detailed proxy health report
   */
  public static getDetailedHealth(): ProxyHealthReport {
    return ProxyHarvester.getDetailedHealth()
  }

  /**
   * Distribute healthy harvested proxies across accounts
   */
  public static distributeProxiesToAccounts(accountIds: string[]): Map<string, ProxyConfig | undefined> {
    return ProxyHarvester.distributeProxiesToAccounts(accountIds)
  }

  /**
   * Benchmark latencies of all proxies in parallel and return sorted by latency
   */
  public static async benchmarkProxies(proxies?: ProxyConfig[]): Promise<Array<ProxyConfig & { pingMs: number }>> {
    const list = proxies && proxies.length > 0 ? proxies : ProxyHarvester.getCachedProxies()
    if (!list || list.length === 0) return []

    const results: Array<ProxyConfig & { pingMs: number }> = []
    const chunkSize = 8
    for (let i = 0; i < list.length; i += chunkSize) {
      const chunk = list.slice(i, i + chunkSize)
      const chunkResults = await Promise.all(
        chunk.map(async (p) => {
          try {
            const ping = await this.testProxyPing(p)
            return { ...p, pingMs: ping, lastChecked: Date.now() }
          } catch {
            return { ...p, pingMs: -1, lastChecked: Date.now() }
          }
        })
      )
      results.push(...chunkResults)
    }

    return results.sort((a, b) => {
      if (a.pingMs > 0 && b.pingMs > 0) return a.pingMs - b.pingMs
      if (a.pingMs > 0) return -1
      if (b.pingMs > 0) return 1
      return 0
    })
  }

  /**
   * Auto-rotate proxy for account to lowest-latency healthy proxy
   */
  public static async rotateProxyForAccount(_accountId: string): Promise<ProxyConfig | null> {
    const sorted = await this.benchmarkProxies()
    const best = sorted.find((p) => p.pingMs > 0 && p.pingMs < 3000)
    return best || null
  }

  /**
   * Toggle Cloudflare WARP tunnel
   */
  public static async toggleWarp(enable?: boolean): Promise<WarpStatus> {
    return WarpManager.toggleWarp(enable)
  }

  /**
   * Get Cloudflare WARP status
   */
  public static getWarpStatus(): WarpStatus {
    return WarpManager.getStatus()
  }

  /**
   * Convert ProxyConfig into @mtcute compatible transport
   */
  public static toMtcuteTransport(proxy?: ProxyConfig): any {
    if (!proxy || !proxy.enabled) return undefined

    try {
      if (proxy.type === 'socks5') {
        return new SocksProxyTcpTransport({
          host: proxy.host,
          port: proxy.port,
          user: proxy.username,
          password: proxy.password,
          version: 5,
        })
      } else if (proxy.type === 'http') {
        return new HttpProxyTcpTransport({
          host: proxy.host,
          port: proxy.port,
          user: proxy.username,
          password: proxy.password,
        })
      } else if (proxy.type === 'mtproto' && proxy.secret) {
        return new MtProxyTcpTransport({
          host: proxy.host,
          port: proxy.port,
          secret: proxy.secret,
        })
      }
    } catch (e) {
      console.error('[ProxyManager] Failed to create @mtcute transport:', e)
    }

    // Direct Cloudflare WARP Data-Plane Tunnel Bridge Fallback
    const warpStatus = WarpManager.getStatus()
    if (warpStatus.enabled && warpStatus.connected) {
      const port = WarpManager.getSocksPort ? WarpManager.getSocksPort() : 24080
      return new SocksProxyTcpTransport({
        host: '127.0.0.1',
        port: port || 24080,
        version: 5,
      })
    }

    return undefined
  }

  /**
   * Return a lazy factory function producing an @mtcute transport.
   * This ensures each pooled socket (download/upload/primary) gets an isolated transport.
   */
  public static toMtcuteTransportFactory(proxy?: ProxyConfig): any {
    const warpStatus = WarpManager.getStatus()
    const isWarp = warpStatus.enabled && warpStatus.connected
    if ((!proxy || !proxy.enabled) && !isWarp) {
      return undefined
    }
    return () => this.toMtcuteTransport(proxy)
  }

  /**
   * Parse any proxy string: tg://proxy, tg://socks, https://t.me/proxy, socks5://, http://, or host:port:secret
   */
  public static parseProxyUrlOrText(raw: string, defaultName?: string): ProxyConfig | null {
    if (!raw || typeof raw !== 'string') return null
    const str = raw.trim()

    // 1. tg://proxy, https://t.me/proxy, or telegram.me/proxy (MTProto)
    if (/^(?:tg|https?):\/\/(?:t\.me|telegram\.me|proxy)\/proxy\?/i.test(str) || /^tg:\/\/proxy\?/i.test(str)) {
      try {
        const u = new URL(str.replace(/^tg:\/\/proxy\?/i, 'https://t.me/proxy?'))
        const host = u.searchParams.get('server') || u.searchParams.get('host')
        const port = parseInt(u.searchParams.get('port') || '', 10)
        const secret = u.searchParams.get('secret')
        if (host && port > 0 && port <= 65535 && secret) {
          return {
            id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: defaultName || `MTProto (${host}:${port})`,
            type: 'mtproto',
            host: host.toLowerCase(),
            port,
            secret,
            enabled: true,
          }
        }
      } catch {}
    }

    // 2. tg://socks or t.me/socks (SOCKS5)
    if (/^(?:tg|https?):\/\/(?:t\.me|telegram\.me|socks)\/socks\?/i.test(str) || /^tg:\/\/socks\?/i.test(str)) {
      try {
        const u = new URL(str.replace(/^tg:\/\/socks\?/i, 'https://t.me/socks?'))
        const host = u.searchParams.get('server') || u.searchParams.get('host')
        const port = parseInt(u.searchParams.get('port') || '', 10)
        const user = u.searchParams.get('user') || u.searchParams.get('username') || undefined
        const pass = u.searchParams.get('pass') || u.searchParams.get('password') || undefined
        if (host && port > 0 && port <= 65535) {
          return {
            id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: defaultName || `SOCKS5 (${host}:${port})`,
            type: 'socks5',
            host: host.toLowerCase(),
            port,
            username: user,
            password: pass,
            enabled: true,
          }
        }
      } catch {}
    }

    // 3. socks5://, socks4://, or http:// URL
    if (/^(?:socks5|socks4|http|https):\/\//i.test(str)) {
      try {
        const u = new URL(str)
        const isSocks = u.protocol.startsWith('socks')
        const host = u.hostname
        const port = parseInt(u.port || (isSocks ? '1080' : '8080'), 10)
        const user = u.username ? decodeURIComponent(u.username) : undefined
        const pass = u.password ? decodeURIComponent(u.password) : undefined
        if (host && port > 0 && port <= 65535) {
          return {
            id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: defaultName || `${isSocks ? 'SOCKS5' : 'HTTP'} (${host}:${port})`,
            type: isSocks ? 'socks5' : 'http',
            host: host.toLowerCase(),
            port,
            username: user,
            password: pass,
            enabled: true,
          }
        }
      } catch {}
    }

    // 4. host:port:secret (plain text MTProto commonly shared in channels)
    const mtpMatch = str.match(/^([^:\s\/]+):(\d{2,5}):([a-fA-F0-9]{32,})$/)
    if (mtpMatch) {
      const port = parseInt(mtpMatch[2], 10)
      if (port > 0 && port <= 65535) {
        return {
          id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: defaultName || `MTProto (${mtpMatch[1]}:${port})`,
          type: 'mtproto',
          host: mtpMatch[1].toLowerCase(),
          port,
          secret: mtpMatch[3],
          enabled: true,
        }
      }
    }

    // 5. host:port (plain text SOCKS5)
    const spMatch = str.match(/^([^:\s\/]+):(\d{2,5})$/)
    if (spMatch) {
      const port = parseInt(spMatch[2], 10)
      if (port > 0 && port <= 65535) {
        return {
          id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: defaultName || `SOCKS5 (${spMatch[1]}:${port})`,
          type: 'socks5',
          host: spMatch[1].toLowerCase(),
          port,
          enabled: true,
        }
      }
    }

    return null
  }

  /**
   * Format a ProxyConfig into a standard sharable link (tg://proxy or tg://socks)
   */
  public static toShareableUrl(proxy: ProxyConfig): string {
    if (!proxy) return ''
    if (proxy.type === 'mtproto' && proxy.secret) {
      return `tg://proxy?server=${encodeURIComponent(proxy.host)}&port=${proxy.port}&secret=${encodeURIComponent(proxy.secret)}`
    } else if (proxy.type === 'socks5') {
      const userPart = proxy.username ? `&user=${encodeURIComponent(proxy.username)}` : ''
      const passPart = proxy.password ? `&pass=${encodeURIComponent(proxy.password)}` : ''
      return `tg://socks?server=${encodeURIComponent(proxy.host)}&port=${proxy.port}${userPart}${passPart}`
    } else if (proxy.type === 'http') {
      const auth = proxy.username ? `${encodeURIComponent(proxy.username)}${proxy.password ? `:${encodeURIComponent(proxy.password)}` : ''}@` : ''
      return `http://${auth}${proxy.host}:${proxy.port}`
    }
    return `${proxy.host}:${proxy.port}`
  }

  /**
   * Convert ProxyConfig into GramJS compatible proxy object (legacy fallback)
   */
  public static toGramJsProxy(proxy?: ProxyConfig): any {
    if (!proxy || !proxy.enabled) return undefined

    if (proxy.type === 'socks5') {
      return {
        ip: proxy.host,
        port: proxy.port,
        socksType: 5,
        username: proxy.username,
        password: proxy.password,
      }
    } else if (proxy.type === 'http') {
      return {
        ip: proxy.host,
        port: proxy.port,
        socksType: 5,
        username: proxy.username,
        password: proxy.password,
      }
    } else if (proxy.type === 'mtproto') {
      return {
        ip: proxy.host,
        port: proxy.port,
        secret: proxy.secret,
        MTProxy: true,
      }
    }
    return undefined
  }
}

