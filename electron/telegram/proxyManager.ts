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
    let connectHost = proxy.host
    if (!DohResolver.isIpAddress(proxy.host)) {
      try {
        const resolvedIps = await DohResolver.resolve(proxy.host, 'A', 2000)
        if (resolvedIps && resolvedIps.length > 0) {
          connectHost = resolvedIps[0]
        }
      } catch {
        // Fallback to raw hostname
      }
    }

    return new Promise((resolve) => {
      const startTime = Date.now()
      const socket = new net.Socket()

      socket.setTimeout(4000)

      socket.connect(proxy.port, connectHost, () => {
        const latency = Date.now() - startTime
        socket.destroy()
        resolve(latency)
      })

      socket.on('error', () => {
        socket.destroy()
        resolve(-1) // Connection failed
      })

      socket.on('timeout', () => {
        socket.destroy()
        resolve(-1) // Timed out
      })
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

    const benchmarkPromises = list.map(async (p) => {
      try {
        const ping = await this.testProxyPing(p)
        return { ...p, pingMs: ping }
      } catch {
        return { ...p, pingMs: -1 }
      }
    })

    const results = await Promise.all(benchmarkPromises)
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

