import net from 'net'
import { SocksProxyTcpTransport, HttpProxyTcpTransport, MtProxyTcpTransport } from '@mtcute/node'
import { ProxyConfig } from './types'

export class ProxyManager {
  /**
   * Measure latency of a proxy in milliseconds
   */
  public static async testProxyPing(proxy: ProxyConfig): Promise<number> {
    return new Promise((resolve) => {
      const startTime = Date.now()
      const socket = new net.Socket()

      socket.setTimeout(4000)

      socket.connect(proxy.port, proxy.host, () => {
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
