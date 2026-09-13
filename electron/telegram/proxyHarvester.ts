import net from 'net'
import https from 'https'
import { ProxyConfig, AutoHarvestStatus } from './types'
import { Logger } from './logger'

export interface RawProxyCandidate {
  server: string
  port: number
  secret: string
  source: string
}

export class ProxyHarvester {
  public static readonly DEFAULT_CHANNELS = [
    'ProxyMTProto',
    'proxymtprotoir',
    'mineproxy',
    'iMTProto'
  ]

  private static intervalTimer: NodeJS.Timeout | null = null
  private static cachedProxies: Map<string, ProxyConfig> = new Map()
  private static isScanning = false
  private static lastScanTime: number | null = null
  private static onUpdateCallback?: (proxies: ProxyConfig[]) => void
  private static clientGetter?: () => any

  /**
   * Initialize or register update listener and optional client getter
   */
  public static init(onUpdate?: (proxies: ProxyConfig[]) => void, clientGetter?: () => any): void {
    if (onUpdate) {
      this.onUpdateCallback = onUpdate
    }
    if (clientGetter) {
      this.clientGetter = clientGetter
    }
  }

  /**
   * Start 45-minute background auto-harvest cycle
   */
  public static startAutoHarvest(intervalMs: number = 45 * 60 * 1000): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer)
    }

    Logger.info(`[ProxyHarvester] Starting auto-harvest scheduler (every ${intervalMs / 60000} minutes)`)
    // Run initial scan after short delay to allow MTProto connection to establish
    setTimeout(() => {
      this.harvestNow().catch((err) => {
        Logger.warn('[ProxyHarvester] Initial scan error:', err)
      })
    }, 4000)

    this.intervalTimer = setInterval(() => {
      Logger.info('[ProxyHarvester] Running 45-minute scheduled auto-harvest & two-strike cleanup')
      this.harvestNow().catch((err) => {
        Logger.warn('[ProxyHarvester] Scheduled scan error:', err)
      })
    }, intervalMs)
  }

  /**
   * Stop background scheduler
   */
  public static stopAutoHarvest(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer)
      this.intervalTimer = null
      Logger.info('[ProxyHarvester] Auto-harvest scheduler stopped')
    }
  }

  /**
   * Universal 3-Layer Parser: extracts proxy URLs from structured MTProto message objects
   */
  public static extractProxiesFromMessage(msg: any, sourceChannel: string): RawProxyCandidate[] {
    const candidates: RawProxyCandidate[] = []
    const seen = new Set<string>()

    const addCandidate = (urlStr?: string) => {
      if (!urlStr) return
      const parsed = this.parseProxyUrl(urlStr, sourceChannel)
      if (parsed) {
        const key = `${parsed.server}:${parsed.port}`
        if (!seen.has(key)) {
          seen.add(key)
          candidates.push(parsed)
        }
      }
    }

    // 1. Layer 1: Entities (params.url for @mtcute, url for GramJS/raw)
    if (Array.isArray(msg?.entities)) {
      for (const ent of msg.entities) {
        addCandidate(ent.params?.url)
        addCandidate(ent.url)
      }
    }

    // 2. Layer 2: Inline Keyboard Buttons (replyMarkup)
    if (msg?.replyMarkup?.rows) {
      for (const row of msg.replyMarkup.rows) {
        const buttons = row.buttons || row
        if (Array.isArray(buttons)) {
          for (const btn of buttons) {
            addCandidate(btn.url)
          }
        }
      }
    } else if (msg?.raw?.replyMarkup?.rows) {
      for (const row of msg.raw.replyMarkup.rows) {
        const buttons = row.buttons || row
        if (Array.isArray(buttons)) {
          for (const btn of buttons) {
            addCandidate(btn.url)
          }
        }
      }
    }

    // 3. Layer 3: Raw text & caption regex matching
    const fullText = `${msg?.text || ''} ${msg?.caption || ''} ${msg?.message || ''}`
    const regex = /(?:tg:\/\/proxy\?|https?:\/\/(?:t\.me|telegram\.me)\/proxy\?)[^\s<>'"`\)]+/gi
    let match: RegExpExecArray | null
    while ((match = regex.exec(fullText)) !== null) {
      addCandidate(match[0])
    }

    return candidates
  }

  /**
   * Parse a tg://proxy or t.me/proxy URL into a structured proxy candidate
   */
  public static parseProxyUrl(rawUrl: string, source: string): RawProxyCandidate | null {
    try {
      let normalized = rawUrl.trim()
      if (normalized.startsWith('tg://proxy?')) {
        normalized = normalized.replace('tg://proxy?', 'https://t.me/proxy?')
      }

      const url = new URL(normalized)
      const server = url.searchParams.get('server') || url.searchParams.get('host')
      const portStr = url.searchParams.get('port')
      const secret = url.searchParams.get('secret')

      if (!server || !portStr || !secret) {
        return null
      }

      const port = parseInt(portStr, 10)
      if (isNaN(port) || port <= 0 || port > 65535) {
        return null
      }

      return {
        server: server.toLowerCase(),
        port,
        secret,
        source: source.startsWith('@') ? source : `@${source}`
      }
    } catch {
      return null
    }
  }

  /**
   * Scrape public web preview (t.me/s/<channel>) without requiring an active MTProto session
   */
  public static async scrapeWebChannel(channelName: string): Promise<RawProxyCandidate[]> {
    const cleanName = channelName.replace(/^@/, '')
    const url = `https://t.me/s/${cleanName}`

    return new Promise((resolve) => {
      const candidates: RawProxyCandidate[] = []
      const req = https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9,fa;q=0.8'
        },
        timeout: 6000
      }, (res) => {
        let html = ''
        res.on('data', (chunk) => html += chunk)
        res.on('end', () => {
          // Extract href="tg://proxy?..." and href="https://t.me/proxy?..."
          const linkRegex = /href=["']((?:tg:\/\/proxy\?|https?:\/\/(?:t\.me|telegram\.me)\/proxy\?)[^"']+)["']/gi
          let m: RegExpExecArray | null
          const seen = new Set<string>()

          while ((m = linkRegex.exec(html)) !== null) {
            const parsed = this.parseProxyUrl(m[1].replace(/&amp;/g, '&'), cleanName)
            if (parsed) {
              const key = `${parsed.server}:${parsed.port}`
              if (!seen.has(key)) {
                seen.add(key)
                candidates.push(parsed)
              }
            }
          }
          resolve(candidates)
        })
      })

      req.on('error', () => resolve([]))
      req.on('timeout', () => {
        req.destroy()
        resolve([])
      })
    })
  }

  /**
   * Test live TCP socket latency (timeout: 2500ms)
   */
  public static async pingProxy(host: string, port: number, timeoutMs: number = 2500): Promise<number> {
    return new Promise((resolve) => {
      const startTime = Date.now()
      const socket = new net.Socket()

      socket.setTimeout(timeoutMs)

      socket.connect(port, host, () => {
        const latency = Date.now() - startTime
        socket.destroy()
        resolve(latency)
      })

      socket.on('error', () => {
        socket.destroy()
        resolve(-1)
      })

      socket.on('timeout', () => {
        socket.destroy()
        resolve(-1)
      })
    })
  }

  /**
   * Harvest new proxies from all designated channels, test latency, apply Two-Strike rule, and update cache
   */
  public static async harvestNow(channels: string[] = this.DEFAULT_CHANNELS): Promise<ProxyConfig[]> {
    if (this.isScanning) {
      return Array.from(this.cachedProxies.values())
    }

    this.isScanning = true
    Logger.info(`[ProxyHarvester] Starting harvest across channels: ${channels.join(', ')}`)

    try {
      let allCandidates: RawProxyCandidate[] = []
      const activeClient = this.clientGetter ? this.clientGetter() : null

      if (activeClient) {
        Logger.info(`[ProxyHarvester] Fetching proxy channels via active Telegram MTProto client...`)
        for (const ch of channels) {
          try {
            const clean = ch.replace(/^@/, '')
            for await (const msg of activeClient.iterHistory(clean, { limit: 15 })) {
              const cands = this.extractProxiesFromMessage(msg, `@${clean}`)
              allCandidates.push(...cands)
            }
          } catch (chErr) {
            Logger.warn(`[ProxyHarvester] Failed reading channel ${ch} via MTProto:`, chErr)
          }
        }
        Logger.info(`[ProxyHarvester] Extracted ${allCandidates.length} proxy candidates via MTProto`)
      }

      // Fallback: If MTProto wasn't available or yielded 0 candidates, try web scrape
      if (allCandidates.length === 0) {
        Logger.info(`[ProxyHarvester] Attempting fallback web scrape...`)
        const scrapePromises = channels.map((ch) => this.scrapeWebChannel(ch))
        const results = await Promise.all(scrapePromises)
        allCandidates = results.flat()
        Logger.info(`[ProxyHarvester] Extracted ${allCandidates.length} total proxy candidates from web preview`)
      }

      // 2. Add candidates to cache map or update existing entries
      for (const cand of allCandidates) {
        const id = `auto_${cand.server}_${cand.port}`
        if (!this.cachedProxies.has(id)) {
          this.cachedProxies.set(id, {
            id,
            name: `MTProto (${cand.server}:${cand.port})`,
            type: 'mtproto',
            host: cand.server,
            port: cand.port,
            secret: cand.secret,
            enabled: true,
            isAutoHarvested: true,
            channelSource: cand.source,
            failCount: 0
          })
        }
      }

      // 3. Health Check & Two-Strike Eviction: test all cached auto-harvested proxies
      const testEntries = Array.from(this.cachedProxies.values()).filter((p) => p.isAutoHarvested)
      const testPromises = testEntries.map(async (proxy) => {
        const ping = await this.pingProxy(proxy.host, proxy.port)
        const current = this.cachedProxies.get(proxy.id)
        if (!current) return

        if (ping > 0) {
          // Healthy connection
          current.pingMs = ping
          current.lastChecked = Date.now()
          current.failCount = 0
          current.enabled = true
        } else {
          // Unreachable - increment strike count
          current.failCount = (current.failCount || 0) + 1
          current.lastChecked = Date.now()
          current.pingMs = -1

          // Two-Strike rule: purge if failed 2 consecutive scans
          if (current.failCount >= 2) {
            Logger.info(`[ProxyHarvester] Evicting dead proxy (2-strike failure): ${proxy.host}:${proxy.port}`)
            this.cachedProxies.delete(proxy.id)
          }
        }
      })

      await Promise.all(testPromises)

      this.lastScanTime = Date.now()
      const healthyList = Array.from(this.cachedProxies.values())
        .filter((p) => (p.pingMs || -1) > 0)
        .sort((a, b) => (a.pingMs || 9999) - (b.pingMs || 9999))

      Logger.info(`[ProxyHarvester] Harvest complete. ${healthyList.length} healthy proxies available`)

      if (this.onUpdateCallback) {
        this.onUpdateCallback(Array.from(this.cachedProxies.values()))
      }

      return Array.from(this.cachedProxies.values())
    } catch (err) {
      Logger.error('[ProxyHarvester] Error during harvest:', err)
      return Array.from(this.cachedProxies.values())
    } finally {
      this.isScanning = false
    }
  }

  /**
   * Distribute distinct healthy proxies across active accounts
   */
  public static distributeProxiesToAccounts(accountIds: string[]): Map<string, ProxyConfig | undefined> {
    const assignments = new Map<string, ProxyConfig | undefined>()
    const healthy = Array.from(this.cachedProxies.values())
      .filter((p) => (p.pingMs || -1) > 0)
      .sort((a, b) => (a.pingMs || 9999) - (b.pingMs || 9999))

    if (healthy.length === 0) {
      for (const id of accountIds) {
        assignments.set(id, undefined)
      }
      return assignments
    }

    // Allocate round-robin with distinct proxies where possible
    accountIds.forEach((accId, idx) => {
      const assigned = healthy[idx % healthy.length]
      assignments.set(accId, assigned)
    })

    return assignments
  }

  /**
   * Get current harvest telemetry status
   */
  public static getStatus(): AutoHarvestStatus {
    const proxies = Array.from(this.cachedProxies.values())
    const healthyCount = proxies.filter((p) => (p.pingMs || -1) > 0).length

    return {
      enabled: this.intervalTimer !== null,
      lastScanTime: this.lastScanTime || undefined,
      scannedChannels: this.DEFAULT_CHANNELS,
      healthyCount,
      totalHarvested: proxies.length,
      isScanning: this.isScanning
    }
  }

  /**
   * Get all currently cached proxies
   */
  public static getCachedProxies(): ProxyConfig[] {
    return Array.from(this.cachedProxies.values())
  }
}
