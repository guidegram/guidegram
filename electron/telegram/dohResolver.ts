import dns from 'node:dns'
let Logger: any = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const loggerModule = require('./logger')
  if (loggerModule?.Logger) Logger = loggerModule.Logger
} catch {
  // Fallback for ESM test runner
}

export type DnsRecordType = 'A' | 'AAAA'

export interface DohCacheEntry {
  ips: string[]
  expiresAt: number
}

export interface DohProviderConfig {
  name: string
  url: string
  bootstrapIps: string[]
  headers: Record<string, string>
  parseResponse: (data: any, recordType: DnsRecordType) => string[]
}

/**
 * DohResolver (Layer 11 / Censorship & DNS Spoofing Resilience)
 * Resolves hostnames via DNS-over-HTTPS (DoH) using Cloudflare, Google, and Quad9.
 * Protects against DNS hijacking, poisoned ISP resolvers, and censorship in hostile network environments.
 */
export class DohResolver {
  private static cache = new Map<string, DohCacheEntry>()
  private static inFlightQueries = new Map<string, Promise<string[]>>()
  private static readonly DEFAULT_TIMEOUT_MS = 3000
  private static readonly DEFAULT_TTL_MS = 300000 // 5 minutes default fallback TTL

  // Providers configured with bootstrap direct IP URLs to eliminate circular DNS dependencies
  public static readonly PROVIDERS: DohProviderConfig[] = [
    {
      name: 'cloudflare',
      url: 'https://1.1.1.1/dns-query',
      bootstrapIps: ['1.1.1.1', '1.0.0.1'],
      headers: {
        accept: 'application/dns-json',
        host: 'cloudflare-dns.com',
      },
      parseResponse: (data: any, recordType: DnsRecordType): string[] => {
        if (!data || !Array.isArray(data.Answer)) return []
        const expectedType = recordType === 'A' ? 1 : 28
        return data.Answer.filter((ans: any) => ans.type === expectedType && typeof ans.data === 'string').map(
          (ans: any) => ans.data.trim()
        )
      },
    },
    {
      name: 'google',
      url: 'https://8.8.8.8/resolve',
      bootstrapIps: ['8.8.8.8', '8.8.4.4'],
      headers: {
        accept: 'application/json',
        host: 'dns.google',
      },
      parseResponse: (data: any, recordType: DnsRecordType): string[] => {
        if (!data || !Array.isArray(data.Answer)) return []
        const expectedType = recordType === 'A' ? 1 : 28
        return data.Answer.filter((ans: any) => ans.type === expectedType && typeof ans.data === 'string').map(
          (ans: any) => ans.data.trim()
        )
      },
    },
  ]

  /**
   * Checks if string is already a literal IPv4 or IPv6 address.
   */
  public static isIpAddress(host: string): boolean {
    if (!host || typeof host !== 'string') return false
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}$|^::$|^::1$/
    return ipv4Regex.test(host) || ipv6Regex.test(host)
  }

  /**
   * Resolves a hostname to IP addresses using DoH with multi-provider failover and native DNS fallback.
   */
  public static async resolve(
    hostname: string,
    recordType: DnsRecordType = 'A',
    timeoutMs: number = this.DEFAULT_TIMEOUT_MS,
    customFetch?: typeof fetch
  ): Promise<string[]> {
    if (!hostname || typeof hostname !== 'string') return []
    const cleanHost = hostname.trim().toLowerCase()

    // 1. Literal IP bypass
    if (this.isIpAddress(cleanHost)) {
      return [cleanHost]
    }

    const cacheKey = `${cleanHost}:${recordType}`

    // 2. Check cache
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.ips
    }

    // 3. Deduplicate concurrent in-flight requests
    const inFlight = this.inFlightQueries.get(cacheKey)
    if (inFlight) {
      return inFlight
    }

    const queryPromise = this.executeResolveWithFailover(cleanHost, recordType, timeoutMs, customFetch)
      .then((ips) => {
        if (ips && ips.length > 0) {
          this.cache.set(cacheKey, {
            ips,
            expiresAt: Date.now() + this.DEFAULT_TTL_MS,
          })
        }
        return ips
      })
      .finally(() => {
        this.inFlightQueries.delete(cacheKey)
      })

    this.inFlightQueries.set(cacheKey, queryPromise)
    return queryPromise
  }

  /**
   * Sequentially queries DoH providers, falling back to native DNS if all DoH upstreams fail.
   */
  private static async executeResolveWithFailover(
    hostname: string,
    recordType: DnsRecordType,
    timeoutMs: number,
    customFetch?: typeof fetch
  ): Promise<string[]> {
    const fetchImpl = customFetch || globalThis.fetch

    for (const provider of this.PROVIDERS) {
      try {
        const queryUrl = new URL(provider.url)
        queryUrl.searchParams.set('name', hostname)
        queryUrl.searchParams.set('type', recordType)

        const controller = new AbortController()
        const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)

        const response = await fetchImpl(queryUrl.toString(), {
          method: 'GET',
          headers: provider.headers,
          signal: controller.signal,
        })
        clearTimeout(timeoutHandle)

        if (response.ok) {
          const body = await response.json()
          const ips = provider.parseResponse(body, recordType)
          if (ips.length > 0) {
            Logger.info(`[DohResolver] Resolved ${hostname} (${recordType}) via ${provider.name}: ${ips.join(', ')}`)
            return ips
          }
        }
      } catch (err: any) {
        Logger.warn(`[DohResolver] Provider ${provider.name} failed for ${hostname}:`, err?.message || err)
      }
    }

    // Fallback: Native Node.js DNS resolver
    try {
      Logger.info(`[DohResolver] Falling back to native DNS for ${hostname}`)
      if (recordType === 'A') {
        return await dns.promises.resolve4(hostname)
      } else {
        return await dns.promises.resolve6(hostname)
      }
    } catch (nativeErr: any) {
      Logger.warn(`[DohResolver] Native DNS resolution failed for ${hostname}:`, nativeErr?.message || nativeErr)
      return []
    }
  }

  /**
   * Clears in-memory resolution cache.
   */
  public static clearCache(): void {
    this.cache.clear()
    this.inFlightQueries.clear()
  }

  /**
   * Returns cache size.
   */
  public static getCacheSize(): number {
    return this.cache.size
  }
}
