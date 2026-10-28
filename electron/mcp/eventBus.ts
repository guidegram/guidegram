import { Logger } from '../telegram/logger'
import type {
  McpLiveEvent,
  McpWatcherFilter,
  McpWatcherCapturedItem,
  McpWatcher,
  McpWatcherSummary,
  McpWatcherFeedResult,
  McpWaiterOptions,
} from './types'

export interface McpWaiter {
  id: string
  chatId?: string
  accountId?: string
  eventTypes: string[]
  timeoutSeconds: number
  indicateTyping: boolean
  sinceEventId?: number
  debounceBurstMs: number
  collectedEvents: McpLiveEvent[]
  isResolved: boolean
  timeoutTimer?: NodeJS.Timeout
  indicateTypingTimer?: NodeJS.Timeout
  burstTimer?: NodeJS.Timeout
  resolve: (result: { timedOut: boolean; events: McpLiveEvent[] }) => void
  reject: (err: any) => void
}

export interface EventQueryOptions {
  sinceEventId?: number
  chatId?: string
  accountId?: string
  types?: string[]
  limit?: number
}

export class McpEventBus {
  private ringBuffer: McpLiveEvent[] = []
  private maxRingBufferSize = 5000
  private maxEventAgeMs = 24 * 60 * 60 * 1000 // 24 hours
  private nextEventId = 1

  private watchers = new Map<string, McpWatcher>()
  private waiters = new Map<string, McpWaiter>()

  private sendTypingCallback?: (accountId: string, chatId: string) => Promise<any>
  private autoDownloadCallback?: (
    accountId: string,
    chatId: string,
    messageId: number,
    downloadDir?: string
  ) => Promise<string | null>

  constructor(options?: { maxBufferSize?: number; maxAgeMs?: number }) {
    if (options?.maxBufferSize) this.maxRingBufferSize = options.maxBufferSize
    if (options?.maxAgeMs) this.maxEventAgeMs = options.maxAgeMs
  }

  public setSendTypingCallback(cb: (accountId: string, chatId: string) => Promise<any>): void {
    this.sendTypingCallback = cb
  }

  public setAutoDownloadCallback(
    cb: (accountId: string, chatId: string, messageId: number, downloadDir?: string) => Promise<string | null>
  ): void {
    this.autoDownloadCallback = cb
  }

  /**
   * Dispatches a raw Telegram MTProto event into the MCP event bus.
   */
  public dispatch(rawEvent: string, payload: any): McpLiveEvent {
    const normalizedType = this.normalizeEventType(rawEvent)
    const accountId = String(payload?.accountId || payload?.message?.accountId || '')
    const chatId = String(payload?.chatId || payload?.message?.chatId || payload?.peerId || '')

    const liveEvent: McpLiveEvent = {
      id: this.nextEventId++,
      timestamp: Date.now(),
      type: normalizedType,
      rawEvent,
      accountId,
      chatId,
      payload,
      message: payload?.message,
    }

    // Add to ring buffer
    this.ringBuffer.push(liveEvent)
    this.enforceBufferLimits()

    // 1. Process Active Watchers
    this.processWatchers(liveEvent)

    // 2. Process Pending Interactive Waiters
    this.processWaiters(liveEvent)

    return liveEvent
  }

  /**
   * Normalizes MTProto event names to clean event types
   */
  private normalizeEventType(rawEvent: string): string {
    switch (rawEvent) {
      case 'telegram:new-message':
        return 'new_message'
      case 'telegram:user-typing':
        return 'typing'
      case 'telegram:message-edited':
        return 'message_edited'
      case 'telegram:reaction-updated':
        return 'reaction'
      case 'telegram:message-deleted':
        return 'message_deleted'
      case 'telegram:read-outbox':
      case 'telegram:read-history':
        return 'read'
      default:
        return rawEvent.replace(/^telegram:/, '')
    }
  }

  private enforceBufferLimits(): void {
    if (this.ringBuffer.length > this.maxRingBufferSize) {
      const dropCount = this.ringBuffer.length - this.maxRingBufferSize
      this.ringBuffer.splice(0, dropCount)
    }

    // Auto-eviction by age: prune oldest events if older than maxEventAgeMs
    const now = Date.now()
    if (this.ringBuffer.length > 0 && now - this.ringBuffer[0].timestamp > this.maxEventAgeMs) {
      const cutoff = now - this.maxEventAgeMs
      const firstValidIdx = this.ringBuffer.findIndex((e) => e.timestamp >= cutoff)
      if (firstValidIdx > 0) {
        this.ringBuffer.splice(0, firstValidIdx)
      } else if (firstValidIdx === -1) {
        this.ringBuffer = []
      }
    }
  }

  /**
   * Query past events from the ring buffer.
   */
  public getEvents(options?: EventQueryOptions): McpLiveEvent[] {
    const { sinceEventId, chatId, accountId, types, limit } = options || {}
    let filtered = this.ringBuffer

    if (sinceEventId !== undefined && sinceEventId >= 0) {
      filtered = filtered.filter((e) => e.id > sinceEventId)
    }

    if (chatId) {
      const targetChat = String(chatId).trim()
      filtered = filtered.filter((e) => this.isChatMatch(e.chatId, targetChat))
    }

    if (accountId) {
      const targetAcc = String(accountId).trim()
      filtered = filtered.filter((e) => e.accountId === targetAcc)
    }

    if (types && types.length > 0 && !types.includes('all')) {
      filtered = filtered.filter((e) => types.includes(e.type))
    }

    if (limit && limit > 0 && filtered.length > limit) {
      filtered = filtered.slice(filtered.length - limit)
    }

    return filtered
  }

  /**
   * Interactive stream waiter: waits for events matching specified parameters.
   */
  public async waitForEvents(options: McpWaiterOptions): Promise<{ timedOut: boolean; events: McpLiveEvent[] }> {
    const {
      chatId,
      accountId,
      eventTypes = ['new_message'],
      timeoutSeconds = 30,
      indicateTyping = false,
      sinceEventId,
      debounceBurstMs = 2500,
    } = options

    const boundedTimeout = Math.min(Math.max(timeoutSeconds, 1), 120)

    // Check if ring buffer already has matching events since sinceEventId
    if (sinceEventId !== undefined && sinceEventId >= 0) {
      const existing = this.getEvents({
        sinceEventId,
        chatId,
        accountId,
        types: eventTypes.includes('all') ? undefined : eventTypes,
      })
      if (existing.length > 0) {
        return { timedOut: false, events: existing }
      }
    }

    return new Promise<{ timedOut: boolean; events: McpLiveEvent[] }>((resolve, reject) => {
      const waiterId = `waiter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const waiter: McpWaiter = {
        id: waiterId,
        chatId: chatId ? String(chatId).trim() : undefined,
        accountId: accountId ? String(accountId).trim() : undefined,
        eventTypes,
        timeoutSeconds: boundedTimeout,
        indicateTyping: Boolean(indicateTyping),
        sinceEventId,
        debounceBurstMs: debounceBurstMs ?? 2500,
        collectedEvents: [],
        isResolved: false,
        resolve,
        reject,
      }

      waiter.timeoutTimer = setTimeout(() => {
        this.resolveWaiter(waiter, true)
      }, boundedTimeout * 1000)

      // Start periodic typing indicator if requested
      if (waiter.indicateTyping && waiter.chatId && this.sendTypingCallback) {
        const targetAcc = waiter.accountId || ''
        const targetChat = waiter.chatId
        this.sendTypingCallback(targetAcc, targetChat).catch(() => {})
        waiter.indicateTypingTimer = setInterval(() => {
          if (!waiter.isResolved && this.sendTypingCallback) {
            this.sendTypingCallback(targetAcc, targetChat).catch(() => {})
          }
        }, 4500)
      }

      this.waiters.set(waiterId, waiter)
    })
  }

  private processWaiters(liveEvent: McpLiveEvent): void {
    const now = Date.now()
    for (const waiter of this.waiters.values()) {
      if (waiter.isResolved) continue

      // Filter account
      if (waiter.accountId && liveEvent.accountId && waiter.accountId !== liveEvent.accountId) {
        continue
      }

      // Filter chat
      if (waiter.chatId && !this.isChatMatch(liveEvent.chatId, waiter.chatId)) {
        continue
      }

      // Filter event types
      const matchesType =
        waiter.eventTypes.includes('all') ||
        waiter.eventTypes.includes(liveEvent.type)

      if (!matchesType) {
        // If user typing occurred while waiting on a new_message burst, extend the burst timer
        if (liveEvent.type === 'typing' && waiter.burstTimer) {
          clearTimeout(waiter.burstTimer)
          waiter.burstTimer = setTimeout(() => {
            this.resolveWaiter(waiter, false)
          }, waiter.debounceBurstMs)
        }
        continue
      }

      // Event matches waiter
      waiter.collectedEvents.push(liveEvent)

      if (liveEvent.type === 'new_message' && waiter.debounceBurstMs > 0) {
        // Reset burst debouncer
        if (waiter.burstTimer) {
          clearTimeout(waiter.burstTimer)
        }
        waiter.burstTimer = setTimeout(() => {
          this.resolveWaiter(waiter, false)
        }, waiter.debounceBurstMs)
      } else if (!waiter.burstTimer) {
        // Immediate resolution for non-burst events or when burst debouncing is disabled
        this.resolveWaiter(waiter, false)
      }
    }
  }

  private resolveWaiter(waiter: McpWaiter, timedOut: boolean): void {
    if (waiter.isResolved) return
    waiter.isResolved = true

    if (waiter.timeoutTimer) clearTimeout(waiter.timeoutTimer)
    if (waiter.indicateTypingTimer) clearInterval(waiter.indicateTypingTimer)
    if (waiter.burstTimer) clearTimeout(waiter.burstTimer)
    this.waiters.delete(waiter.id)

    // Smart merge burst messages if multiple new_message events from same conversation
    if (waiter.collectedEvents.length > 1) {
      const textMsgs = waiter.collectedEvents.filter((e) => e.type === 'new_message' && (e.payload?.message?.text || e.message?.text))
      if (textMsgs.length > 1) {
        const mergedText = textMsgs.map((e) => e.payload?.message?.text || e.message?.text || '').join('\n')
        textMsgs[0].isBurstMerged = true
        textMsgs[0].mergedCount = textMsgs.length
        textMsgs[0].mergedText = mergedText
      }
    }

    waiter.resolve({
      timedOut: timedOut && waiter.collectedEvents.length === 0,
      events: waiter.collectedEvents,
    })
  }

  /**
   * Watcher Registry
   */
  public createWatcher(params: {
    name: string
    durationSeconds?: number
    filter?: McpWatcherFilter
    action?: 'buffer' | 'auto_download'
    downloadDir?: string
  }): McpWatcherSummary {
    const duration = Math.min(Math.max(params.durationSeconds ?? 1800, 1), 7200)
    const now = Date.now()
    const expiresAt = now + duration * 1000
    const watcherId = `watcher_${now}_${Math.random().toString(36).slice(2, 8)}`

    const watcher: McpWatcher = {
      id: watcherId,
      name: params.name || 'Watcher',
      createdAt: now,
      expiresAt,
      durationSeconds: duration,
      filter: params.filter || {},
      action: params.action || 'buffer',
      downloadDir: params.downloadDir,
      status: 'active',
      buffer: [],
      cursorCounter: 0,
      totalCaptured: 0,
    }

    this.watchers.set(watcherId, watcher)

    return {
      watcherId,
      name: watcher.name,
      durationSeconds: watcher.durationSeconds,
      expiresAt,
      status: 'active',
    }
  }

  public getWatcherFeed(
    watcherId: string,
    sinceCursor?: number,
    clearAfterRead: boolean = false
  ): McpWatcherFeedResult {
    const watcher = this.watchers.get(watcherId)
    if (!watcher) {
      throw new Error(`Watcher not found with ID '${watcherId}'`)
    }

    if (Date.now() > watcher.expiresAt && watcher.status === 'active') {
      watcher.status = 'expired'
    }

    let items = watcher.buffer
    if (sinceCursor !== undefined && sinceCursor >= 0) {
      items = items.filter((item) => item.cursor > sinceCursor)
    }

    if (clearAfterRead && items.length > 0) {
      const itemCursors = new Set(items.map((i) => i.cursor))
      watcher.buffer = watcher.buffer.filter((i) => !itemCursors.has(i.cursor))
    }

    return {
      watcherId,
      items,
      totalCaptured: watcher.totalCaptured,
      isActive: watcher.status === 'active' && Date.now() <= watcher.expiresAt,
      expiresAt: watcher.expiresAt,
    }
  }

  public listWatchers(): McpWatcherSummary[] {
    const now = Date.now()
    const list: McpWatcherSummary[] = []
    for (const w of this.watchers.values()) {
      if (now > w.expiresAt && w.status === 'active') {
        w.status = 'expired'
      }
      list.push({
        watcherId: w.id,
        name: w.name,
        status: w.status,
        durationSeconds: w.durationSeconds,
        createdAt: w.createdAt,
        expiresAt: w.expiresAt,
        totalCaptured: w.totalCaptured,
        filter: w.filter,
        action: w.action,
        bufferSize: w.buffer.length,
      })
    }
    return list
  }

  public deleteWatcher(watcherId: string): boolean {
    return this.watchers.delete(watcherId)
  }

  private processWatchers(liveEvent: McpLiveEvent): void {
    const now = Date.now()
    for (const watcher of this.watchers.values()) {
      if (now > watcher.expiresAt) {
        watcher.status = 'expired'
        continue
      }
      if (watcher.status !== 'active') continue

      if (this.matchesWatcherFilter(liveEvent, watcher.filter)) {
        watcher.cursorCounter++
        const capturedItem: McpWatcherCapturedItem = {
          cursor: watcher.cursorCounter,
          event: liveEvent,
          capturedAt: now,
        }
        watcher.buffer.push(capturedItem)
        watcher.totalCaptured++
        if (watcher.buffer.length > 1000) {
          watcher.buffer.shift()
        }

        // Auto download trigger if action is auto_download
        if (watcher.action === 'auto_download' && this.autoDownloadCallback) {
          const msgId = liveEvent.message?.id || liveEvent.payload?.messageId
          if (msgId && liveEvent.chatId) {
            this.autoDownloadCallback(
              liveEvent.accountId,
              liveEvent.chatId,
              msgId,
              watcher.downloadDir
            ).then((downloadedPath) => {
              if (downloadedPath) {
                capturedItem.downloadedPath = downloadedPath
              }
            }).catch((err) => {
              Logger.warn(`[MCP] Auto-download failed for watcher ${watcher.id}:`, err)
            })
          }
        }
      }
    }
  }

  public matchesWatcherFilter(event: McpLiveEvent, filter?: McpWatcherFilter): boolean {
    if (!filter) return true

    // 1. Chat IDs
    if (filter.chatIds && filter.chatIds.length > 0) {
      const evChat = event.chatId
      const matched = filter.chatIds.some((c) => this.isChatMatch(evChat, String(c)))
      if (!matched) return false
    }

    const msg = event.payload?.message || event.payload || {}
    const text = (msg.text || msg.caption || event.payload?.text || '').toString()

    // 2. Keywords
    if (filter.keywords && filter.keywords.length > 0) {
      const lower = text.toLowerCase()
      const matched = filter.keywords.some((kw) => lower.includes(String(kw).toLowerCase().trim()))
      if (!matched) return false
    }

    // 3. Regex
    if (filter.regex && filter.regex.trim()) {
      try {
        const re = new RegExp(filter.regex, 'i')
        if (!re.test(text)) return false
      } catch (err) {
        return false
      }
    }

    // 4. Media Types
    if (filter.mediaTypes && filter.mediaTypes.length > 0) {
      const evMedia = (msg.mediaType || event.payload?.mediaType || '').toString().toLowerCase()
      const matched = filter.mediaTypes.some((mt) => String(mt).toLowerCase().trim() === evMedia)
      if (!matched) return false
    }

    // 5. Extensions
    if (filter.extensions && filter.extensions.length > 0) {
      const fileName = (msg.mediaFileName || msg.fileName || msg.filePath || '').toString().toLowerCase()
      const matched = filter.extensions.some((ext) => {
        const cleanExt = String(ext).replace(/^\./, '').toLowerCase().trim()
        return fileName.endsWith(`.${cleanExt}`)
      })
      if (!matched) return false
    }

    return true
  }

  private isChatMatch(chatId1: string, chatId2: string): boolean {
    if (!chatId1 || !chatId2) return false
    const s1 = String(chatId1).trim()
    const s2 = String(chatId2).trim()
    if (s1 === s2) return true
    const norm1 = s1.replace(/^-100/, '').replace(/^-/, '')
    const norm2 = s2.replace(/^-100/, '').replace(/^-/, '')
    return norm1 === norm2
  }

  /**
   * Reset/clear internal state for testing and teardown.
   */
  public clear(): void {
    for (const w of this.waiters.values()) {
      if (w.timeoutTimer) clearTimeout(w.timeoutTimer)
      if (w.indicateTypingTimer) clearInterval(w.indicateTypingTimer)
      if (w.burstTimer) clearTimeout(w.burstTimer)
    }
    this.waiters.clear()
    this.watchers.clear()
    this.ringBuffer = []
    this.nextEventId = 1
  }
}

export const mcpEventBus = new McpEventBus()
export function getMcpEventBus(): McpEventBus {
  return mcpEventBus
}
