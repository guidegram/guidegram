import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { app, BrowserWindow, dialog } from 'electron'
import { TelegramClient, MemoryStorage } from '@mtcute/node'
import { tl, Long } from '@mtcute/core'
import { convertFromGramjsSession } from '@mtcute/convert'
import QRCode from 'qrcode'
import { SessionStore } from './sessionStore'
import { ProxyManager } from './proxyManager'
import { Logger } from './logger'
import { DeviceProfileManager } from './deviceProfileManager'
import {
  AccountInfo,
  DialogItem,
  MessageItem,
  ForwardOptions,
  ProxyConfig,
  QrTokenPayload,
  InlineButton,
  ChatDetails,
  WebPagePreview,
  ReplyInfo,
  MessageEntityItem,
  PinnedMessageItem,
  MessageReactionItem,
  SendMessageOptions,
  SendMediaOptions,
  BotCallbackResult,
  CustomEmojiPayload,
  ForumTopicItem,
  ContactItem,
  ScheduledMessageItem,
  StarGiftItem,
  ActiveSessionItem,
  TranslatedTextResult,
  CloudFolderItem,
  StickerSetItem,
  StickerItem,
  StoryItemPayload,
  PeerStoriesPayload,
  ChannelBoostStatus,
  TwoFactorStatus,
  MyFullProfile,
  PrivacySecuritySettings,
} from './types'

export interface ClientHolder {
  client?: TelegramClient
  session?: any
  info: AccountInfo
}

interface PendingQrAuth {
  client: TelegramClient
  proxy?: ProxyConfig
  cancelled: boolean
  abortController: AbortController
  wakeUp?: () => void
  profile?: any
}

export class ProgressThrottler {
  private lastEmittedPercent = -1
  private lastEmittedTime = 0
  private minIntervalMs: number
  private minDeltaPercent: number

  constructor(
    private callback: (percent: number, extra?: any) => void,
    options?: { minIntervalMs?: number; minDeltaPercent?: number }
  ) {
    this.minIntervalMs = options?.minIntervalMs ?? 100
    this.minDeltaPercent = options?.minDeltaPercent ?? 1
  }

  public update(percent: number, extra?: any): void {
    const now = Date.now()
    const isComplete = percent >= 100
    const isFirst = this.lastEmittedPercent === -1

    if (
      isFirst ||
      isComplete ||
      (now - this.lastEmittedTime >= this.minIntervalMs &&
        Math.abs(percent - this.lastEmittedPercent) >= this.minDeltaPercent)
    ) {
      this.lastEmittedPercent = percent
      this.lastEmittedTime = now
      this.callback(percent, extra)
    }
  }
}

export function formatEntityName(entity: any, fallback = 'Unknown'): string {
  if (!entity) return fallback
  if (entity.title) return entity.title
  if (entity.displayName) return entity.displayName
  const parts = [entity.firstName, entity.lastName]
    .filter(Boolean)
    .map((s: any) => String(s).trim())
    .filter((s: string) => s.length > 0)
  if (parts.length > 0) return parts.join(' ')
  if (entity.username) return '@' + entity.username.replace(/^@/, '')
  if (entity.phone || entity.phoneNumber) return entity.phone || entity.phoneNumber
  return fallback
}

export function toLong(val: any): Long {
  if (!val) return Long.ZERO
  if (Long.isLong(val)) return val
  if (typeof val === 'bigint') return Long.fromString(val.toString())
  if (typeof val === 'number') return Long.fromNumber(val)
  if (typeof val === 'string') return Long.fromString(val)
  return Long.ZERO
}

export function toRawPeer(peerId: string | number): tl.TypeInputPeer {
  const s = String(peerId).trim()
  if (s === 'self' || s === 'me') return { _: 'inputPeerSelf' }
  const num = parseInt(s, 10)
  if (isNaN(num)) return { _: 'inputPeerSelf' }
  if (s.startsWith('-100')) {
    const channelId = parseInt(s.slice(4), 10)
    return { _: 'inputPeerChannel', channelId, accessHash: Long.ZERO }
  } else if (s.startsWith('-')) {
    const chatId = Math.abs(num)
    return { _: 'inputPeerChat', chatId }
  } else {
    return { _: 'inputPeerUser', userId: num, accessHash: Long.ZERO }
  }
}

export interface ParallelDownloadOptions {
  workers?: number
  partSizeKB?: number
  onProgress?: (percent: number, received: number, total: number) => void
  isCancelled?: () => boolean
}


export async function parallelDownloadDocument(
  client: TelegramClient,
  doc: any,
  destinationPath: string,
  options?: ParallelDownloadOptions
): Promise<void> {
  const throttler = new ProgressThrottler((percent, extra) => {
    options?.onProgress?.(percent, extra?.downloadedBytes ?? 0, extra?.fileSize ?? 0)
  })
  throttler.update(0, { downloadedBytes: 0, fileSize: Number(doc.size || 0) })

  const abortController = new AbortController()
  if (options?.isCancelled) {
    const checkInterval = setInterval(() => {
      if (options.isCancelled?.()) {
        clearInterval(checkInterval)
        abortController.abort()
      }
    }, 200)
    abortController.signal.addEventListener('abort', () => clearInterval(checkInterval))
  }

  await client.downloadToFile(destinationPath, doc, {
    partSize: options?.partSizeKB ? Math.min(512, Math.max(64, Math.floor(options.partSizeKB / 4) * 4)) : 512,
    fileSize: Number(doc.size || 0),
    abortSignal: abortController.signal,
    progressCallback: (downloaded, total) => {
      const percent = total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : 0
      throttler.update(percent, { downloadedBytes: downloaded, fileSize: total })
    },
  })
}

export class AccountManager {
  private store: SessionStore
  private clients = new Map<string, ClientHolder>()
  private pendingAuthClients = new Map<
    string,
    { client: TelegramClient; phoneCodeHash: string; proxy?: ProxyConfig; profile?: any }
  >()
  private pendingQrAuth?: PendingQrAuth
  private onEventCallback?: (event: string, payload: any) => void
  private avatarsDir: string
  private mediaDir: string
  private avatarCache = new Map<string, string>()
  private mediaCache = new Map<string, string>()
  private inFlightDownloads = new Map<string, Promise<string | null>>()
  private activeMediaDownloads = new Map<string, { abort: () => void; isCancelled: () => boolean }>()
  private customEmojiCache = new Map<string, string>()
  private botButtonCache = new Map<string, Buffer>()

  constructor(store: SessionStore, onEvent?: (event: string, payload: any) => void) {
    this.store = store
    this.onEventCallback = onEvent
    this.avatarsDir = path.join(this.store.getDataDirectory(), 'avatars')
    this.mediaDir = path.join(this.store.getDataDirectory(), 'media_cache')
    try {
      if (!fs.existsSync(this.avatarsDir)) fs.mkdirSync(this.avatarsDir, { recursive: true })
      if (!fs.existsSync(this.mediaDir)) fs.mkdirSync(this.mediaDir, { recursive: true })
    } catch (e) {
      Logger.warn('[AccountManager] Cache directories creation warning:', e)
    }

    const config = this.store.getConfig()
    for (const savedAcc of config.accounts) {
      this.clients.set(savedAcc.id, {
        info: {
          ...savedAcc,
          status: 'connecting',
        },
      })
    }
  }

  public async connectSavedAccount(savedAcc: AccountInfo): Promise<AccountInfo> {
    const config = this.store.getConfig()
    let sessionString = this.store.getSessionString(savedAcc.id)
    if (!sessionString) {
      Logger.warn(`[AccountManager] No session file found on disk for account `)
      const unauthInfo: AccountInfo = { ...savedAcc, status: 'needs_auth' }
      this.clients.set(savedAcc.id, { info: unauthInfo })
      this.onEventCallback?.('telegram:account-updated', { account: unauthInfo })
      return unauthInfo
    }

    // Auto-migrate legacy GramJS string session if detected
    if (sessionString.startsWith('1') && !sessionString.startsWith('1//')) {
      try {
        Logger.info(`[AccountManager] Migrating legacy GramJS session for account ${savedAcc.id}...`)
        sessionString = convertFromGramjsSession(sessionString) as unknown as string
        if (sessionString) this.store.saveSessionString(savedAcc.id, sessionString)
      } catch (convErr: any) {
        Logger.warn(`[AccountManager] Session conversion failed for ${savedAcc.id}:`, convErr)
      }
    }

    const transport = ProxyManager.toMtcuteTransport(savedAcc.proxyConfig)
    const antiFingerprinting = config.antiFingerprinting !== false
    const profile = savedAcc.deviceProfile || DeviceProfileManager.getProfileForAccount(savedAcc.id, antiFingerprinting)

    const client = new TelegramClient({
      apiId: config.apiId,
      apiHash: config.apiHash,
      storage: new MemoryStorage(),
      transport: transport || undefined,
      initConnectionOptions: {
        deviceModel: profile.deviceModel,
        systemVersion: profile.systemVersion,
        appVersion: profile.appVersion,
        systemLangCode: profile.systemLangCode,
        langCode: profile.langCode,
      },
    })

    try {
      if (sessionString) {
        await client.importSession(sessionString)
      }
      Logger.info(`[AccountManager] Connecting account  () [Device: ]...`)
      await client.connect()

      const me: any = await client.getMe().catch(() => null)
      if (me && me.id) {
        const updatedInfo: AccountInfo = {
          id: me.id.toString(),
          phone: me.phoneNumber ? (me.phoneNumber.startsWith('+') ? me.phoneNumber : '+' + me.phoneNumber) : savedAcc.phone,
          firstName: me.firstName || savedAcc.firstName || 'User',
          lastName: me.lastName || savedAcc.lastName,
          username: me.username || savedAcc.username,
          status: 'connected',
          unreadTotal: savedAcc.unreadTotal || 0,
          proxyConfig: savedAcc.proxyConfig,
          isPremium: me.isPremium || false,
          deviceProfile: profile,
        }

        this.clients.set(updatedInfo.id, { client, session: sessionString, info: updatedInfo })
        this.setupEventListeners(updatedInfo.id, client)

        const currentAccounts = this.store.getConfig().accounts.map((a) => (a.id === updatedInfo.id ? updatedInfo : a))
        this.store.updateConfig({ accounts: currentAccounts })

        Logger.info(`[AccountManager] Account  connected successfully!`)
        this.onEventCallback?.('telegram:account-updated', { account: updatedInfo })
        return updatedInfo
      } else {
        Logger.warn(`[AccountManager] Account  is not authorized (session expired).`)
        const unauthInfo: AccountInfo = { ...savedAcc, status: 'needs_auth' }
        this.clients.set(savedAcc.id, { client, session: sessionString, info: unauthInfo })
        this.onEventCallback?.('telegram:account-updated', { account: unauthInfo })
        return unauthInfo
      }
    } catch (err: any) {
      Logger.warn(`[AccountManager] Connection failed for account :, err?.message || err`)
      const disconnectedInfo: AccountInfo = { ...savedAcc, status: 'disconnected' }
      this.clients.set(savedAcc.id, { client, session: sessionString, info: disconnectedInfo })
      this.onEventCallback?.('telegram:account-updated', { account: disconnectedInfo, error: err?.message })
      return disconnectedInfo
    }
  }

  public async reconnectAccount(accountId: string): Promise<AccountInfo> {
    const config = this.store.getConfig()
    const savedAcc = config.accounts.find((a) => a.id === accountId)
    if (!savedAcc) {
      throw new Error(`Account  not found in saved accounts.`)
    }

    const connectingInfo: AccountInfo = { ...savedAcc, status: 'connecting' }
    const existing = this.clients.get(accountId)
    this.clients.set(accountId, { ...existing, info: connectingInfo })
    this.onEventCallback?.('telegram:account-updated', { account: connectingInfo })

    return this.connectSavedAccount(savedAcc)
  }

  public async initialize(): Promise<AccountInfo[]> {
    const config = this.store.getConfig()
    const loadedAccounts: AccountInfo[] = []

    for (const savedAcc of config.accounts) {
      const res = await this.connectSavedAccount(savedAcc)
      loadedAccounts.push(res)
    }

    this.onEventCallback?.('telegram:accounts-loaded', { accounts: loadedAccounts })
    return loadedAccounts
  }


  public async startPhoneAuth(phone: string, proxy?: ProxyConfig): Promise<{ phoneCodeHash: string }> {
    Logger.info(`[AccountManager] Starting phone auth for , proxy=`)
    const config = this.store.getConfig()
    const transport = ProxyManager.toMtcuteTransport(proxy)
    const antiFingerprinting = config.antiFingerprinting !== false
    const profile = DeviceProfileManager.getProfileForAccount(phone, antiFingerprinting)

    const client = new TelegramClient({
      apiId: config.apiId,
      apiHash: config.apiHash,
      storage: new MemoryStorage(),
      transport: transport || undefined,
      initConnectionOptions: {
        deviceModel: profile.deviceModel,
        systemVersion: profile.systemVersion,
        appVersion: profile.appVersion,
        systemLangCode: profile.systemLangCode,
        langCode: profile.langCode,
      },
    })

    try {
      await client.connect()
      Logger.info(`[AccountManager] Connected to Telegram DC for ${phone}. Sending code...`)
      const sentCode: any = await client.sendCode({ phone })
      const phoneCodeHash = sentCode.phoneCodeHash || ''
      Logger.info(`[AccountManager] Code sent to ${phone}, phoneCodeHash: ${phoneCodeHash}`)
      this.pendingAuthClients.set(phone, { client, phoneCodeHash, proxy, profile })
      return { phoneCodeHash }
    } catch (err: any) {
      Logger.error(`[AccountManager] startPhoneAuth failed for ${phone}:`, err)
      try {
        await client.disconnect()
      } catch (_) {}
      throw err
    }
  }

  public async completePhoneAuth(
    phone: string,
    code: string,
    password?: string
  ): Promise<AccountInfo> {
    const pending = this.pendingAuthClients.get(phone)
    if (!pending) {
      throw new Error('No pending authentication found for this phone number.')
    }

    const { client, phoneCodeHash, proxy, profile } = pending
    const config = this.store.getConfig()

    try {
      await client.signIn({
        phone,
        phoneCodeHash,
        phoneCode: code,
      })
    } catch (err: any) {
      const msg = err?.message || ''
      if (
        msg.includes('SESSION_PASSWORD_NEEDED') ||
        err.text === 'SESSION_PASSWORD_NEEDED' ||
        err?.code === 401
      ) {
        if (!password) {
          throw new Error('2FA_REQUIRED')
        }
        await client.checkPassword(password)
      } else {
        throw err
      }
    }

    const me: any = await client.getMe()
    const sessionString = await client.exportSession()
    const accountId = me.id.toString()

    const info: AccountInfo = {
      id: accountId,
      phone: me.phoneNumber ? (me.phoneNumber.startsWith('+') ? me.phoneNumber : '+' + me.phoneNumber) : phone,
      firstName: me.firstName || 'User',
      lastName: me.lastName || undefined,
      username: me.username || undefined,
      status: 'connected',
      unreadTotal: 0,
      proxyConfig: proxy,
      isPremium: me.isPremium || false,
      deviceProfile: profile || DeviceProfileManager.getProfileForAccount(accountId, config.antiFingerprinting !== false),
    }

    this.store.saveSessionString(accountId, sessionString)

    const currentAccounts = config.accounts.filter((a) => a.id !== accountId)
    currentAccounts.push(info)
    this.store.updateConfig({ accounts: currentAccounts })

    this.clients.set(accountId, { client, session: sessionString, info })
    this.pendingAuthClients.delete(phone)
    this.setupEventListeners(accountId, client)

    return info
  }

  public async startQrAuth(proxy?: ProxyConfig): Promise<QrTokenPayload> {
    Logger.info(`[AccountManager] Starting QR auth, proxy=`)
    await this.cancelQrAuth()

    const config = this.store.getConfig()
    const transport = ProxyManager.toMtcuteTransport(proxy)
    const antiFingerprinting = config.antiFingerprinting !== false
    const qrSeed = `qr_${Date.now()}_${Math.random()}`
    const profile = DeviceProfileManager.getProfileForAccount(qrSeed, antiFingerprinting)

    const client = new TelegramClient({
      apiId: config.apiId,
      apiHash: config.apiHash,
      storage: new MemoryStorage(),
      transport: transport || undefined,
      initConnectionOptions: {
        deviceModel: profile.deviceModel,
        systemVersion: profile.systemVersion,
        appVersion: profile.appVersion,
        systemLangCode: profile.systemLangCode,
        langCode: profile.langCode,
      },
    })

    const abortController = new AbortController()
    const qrState: PendingQrAuth = {
      client,
      proxy,
      cancelled: false,
      abortController,
      profile,
    }
    this.pendingQrAuth = qrState

    let initialResolve: ((payload: QrTokenPayload) => void) | null = null
    const initialPayloadPromise = new Promise<QrTokenPayload>((resolve) => {
      initialResolve = resolve
    })

    // Start QR flow in background
    client.signInQr({
      abortSignal: abortController.signal,
      onUrlUpdated: async (url, expires) => {
        try {
          const qrDataUrl = await QRCode.toDataURL(url, {
            width: 280,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          })
          const payload: QrTokenPayload = {
            url,
            qrDataUrl,
            expires: Math.floor(expires.getTime() / 1000),
          }
          this.onEventCallback?.('telegram:qr-token', payload)
          if (initialResolve) {
            initialResolve(payload)
            initialResolve = null
          }
        } catch (e) {
          Logger.error('[AccountManager] Failed to generate QR image:', e)
        }
      },
      onQrScanned: () => {
        Logger.info('[AccountManager] QR Code was scanned by phone app!')
        this.onEventCallback?.('telegram:qr-scanned', {})
      },
    }).then(async (user) => {
      if (qrState.cancelled) return
      Logger.info(`[AccountManager] QR login completed successfully for user: `)
      await this.finalizeQrLogin(client, proxy)
    }).catch(async (err: any) => {
      if (qrState.cancelled || abortController.signal.aborted) {
        Logger.info('[AccountManager] QR auth cancelled cleanly.')
        return
      }
      const msg = err?.message || ''
      if (
        msg.includes('SESSION_PASSWORD_NEEDED') ||
        err.text === 'SESSION_PASSWORD_NEEDED' ||
        err?.code === 401
      ) {
        Logger.info('[AccountManager] 2FA required for QR login.')
        let hint = ''
        try {
          const pwd = await client.call({ _: 'account.getPassword' })
          hint = pwd.hint || ''
        } catch (_) {}
        this.onEventCallback?.('telegram:qr-2fa', { hint })
        return
      }
      Logger.error('[AccountManager] signInQr failed:', err)
      this.onEventCallback?.('telegram:qr-error', { message: err?.message || 'QR Login Failed' })
    })

    return initialPayloadPromise
  }

  public async cancelQrAuth(): Promise<void> {
    if (this.pendingQrAuth) {
      Logger.info('[AccountManager] Cancelling active QR auth session...')
      this.pendingQrAuth.cancelled = true
      this.pendingQrAuth.abortController.abort()
      const client = this.pendingQrAuth.client
      this.pendingQrAuth = undefined
      try {
        await client.disconnect()
        Logger.info('[AccountManager] Disconnected QR auth client successfully.')
      } catch (err) {
        Logger.warn('[AccountManager] Disconnect error during cancelQrAuth:', err)
      }
    }
  }

  public async submitQrPassword(password: string): Promise<AccountInfo> {
    if (!this.pendingQrAuth || this.pendingQrAuth.cancelled) {
      throw new Error('No active QR login session in progress.')
    }
    Logger.info('[AccountManager] Submitting 2FA password for QR login...')
    const { client, proxy } = this.pendingQrAuth
    await client.checkPassword(password)
    return this.finalizeQrLogin(client, proxy)
  }

  private async finalizeQrLogin(client: TelegramClient, proxy?: ProxyConfig): Promise<AccountInfo> {
    const config = this.store.getConfig()
    const me: any = await client.getMe()
    const sessionString = await client.exportSession()
    const accountId = me.id.toString()
    const phoneStr = me.phoneNumber ? (me.phoneNumber.startsWith('+') ? me.phoneNumber : '+' + me.phoneNumber) : 'QR User'

    const qrProfile = this.pendingQrAuth?.profile || DeviceProfileManager.getProfileForAccount(accountId, config.antiFingerprinting !== false)

    const info: AccountInfo = {
      id: accountId,
      phone: phoneStr,
      firstName: me.firstName || 'User',
      lastName: me.lastName || undefined,
      username: me.username || undefined,
      status: 'connected',
      unreadTotal: 0,
      proxyConfig: proxy,
      isPremium: me.isPremium || false,
      deviceProfile: qrProfile,
    }

    this.store.saveSessionString(accountId, sessionString)

    const currentAccounts = config.accounts.filter((a) => a.id !== accountId)
    currentAccounts.push(info)
    this.store.updateConfig({ accounts: currentAccounts })

    this.clients.set(accountId, { client, session: sessionString, info })
    this.pendingQrAuth = undefined
    this.setupEventListeners(accountId, client)
    Logger.info(`[AccountManager] finalizeQrLogin completed successfully for account  ()`)
    this.onEventCallback?.('telegram:qr-success', { account: info })

    return info
  }


  public async logoutAccount(accountId: string): Promise<void> {
    const holder = this.clients.get(accountId)
    if (holder?.client) {
      try {
        await holder.client.call({ _: 'auth.logOut' }).catch(() => {})
        await holder.client.disconnect().catch(() => {})
      } catch (_) {}
    }
    this.clients.delete(accountId)
    this.store.removeSession(accountId)
    Logger.info(`[AccountManager] Account ${accountId} logged out successfully.`)
  }

  public async getDialogs(
    accountId: string,
    limit = 100,
    offsetDate = 0,
    offsetId = 0
  ): Promise<DialogItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const dialogs: DialogItem[] = []
      for await (const d of holder.client.iterDialogs({ limit })) {
        const peer = d.peer as any
        const peerId = peer.id.toString()
        const isUser = peer._ === 'user' || typeof peer.firstName === 'string'
        const isBot = Boolean(peer.isBot)
        const isGroup = peer.chatType === 'group' || peer.chatType === 'supergroup' || Boolean(peer.isGroup)
        const isChannel = peer.chatType === 'channel' || (Boolean(peer.isChannel) && !peer.isGroup)
        const isBroadcast = isChannel

        const title = formatEntityName(peer, 'Unknown Chat')
        const unreadCount = d.unreadCount || 0
        const unreadMentionsCount = d.unreadMentionsCount || 0
        const isPinned = d.isPinned || false
        const isMuted = d.isMuted || false

        let lastMessageText = ''
        let lastMessageDate = 0
        if (d.lastMessage) {
          lastMessageText = d.lastMessage.text || ''
          lastMessageDate = d.lastMessage.date ? Math.floor(d.lastMessage.date.getTime() / 1000) : 0
        }

        const initials = title
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)

        const item: DialogItem = {
          id: peerId,
          accountId,
          title,
          unreadCount,
          unreadMentionsCount,
          isMuted,
          isUser,
          isGroup,
          isChannel,
          isBroadcast,
          isBot,
          isPinned,
          isSavedMessages: isUser && peerId === accountId,
          lastMessageText,
          lastMessageDate,
          avatarInitials: initials,
          username: (peer as any).username,
          customEmojiStatusId: (peer as any).emojiStatus?.emojiId?.toString(),
          isPremium: (peer as any).isPremium,
          isForum: (peer as any).isForum,
        }
        dialogs.push(item)
      }

      return dialogs
    } catch (err: any) {
      Logger.error(`[AccountManager] getDialogs error for :, err`)
      return []
    }
  }

  public async getContacts(accountId: string): Promise<ContactItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) {
    if (!holder?.client) throw new Error(`Account  is not connected.`)
    }

    try {
      const contacts = await holder.client.getContacts()
      return contacts.map((c: any) => ({
        id: c.id.toString(),
        firstName: c.firstName || '',
        lastName: c.lastName || undefined,
        phone: c.phoneNumber || undefined,
        username: c.username || undefined,
      }))
    } catch (err: any) {
      Logger.error(`[AccountManager] getContacts error for :, err`)
      return []
    }
  }

  public async getMessages(
    accountId: string,
    chatId: string,
    limit = 50,
    offsetId = 0,
    addOffset = 0
  ): Promise<MessageItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const inputPeer = toRawPeer(chatId)
      const res: any = await holder.client.call({
        _: 'messages.getHistory',
        peer: inputPeer,
        offsetId: offsetId || 0,
        offsetDate: 0,
        addOffset: addOffset || 0,
        limit,
        maxId: 0,
        minId: 0,
        hash: Long.ZERO,
      })

      const rawMessages = res.messages || []
      const users = new Map<number, any>()
      const chats = new Map<number, any>()
      if (res.users) res.users.forEach((u: any) => users.set(u.id, u))
      if (res.chats) res.chats.forEach((c: any) => chats.set(c.id, c))

      const items: MessageItem[] = []
      for (const m of rawMessages) {
        if (m._ === 'messageEmpty') continue
        const id = m.id
        const date = m.date || 0
        const isOutgoing = m.out || false
        const text = m.message || ''

        let senderId = ''
        let senderName = ''
        if (m.fromId) {
          if (m.fromId._ === 'peerUser') {
            senderId = m.fromId.userId.toString()
            const u = users.get(m.fromId.userId)
            if (u) senderName = formatEntityName(u)
          } else if (m.fromId._ === 'peerChannel') {
            senderId = `-${m.fromId.channelId}`
            const c = chats.get(m.fromId.channelId)
            if (c) senderName = formatEntityName(c)
          } else if (m.fromId._ === 'peerChat') {
            senderId = `-${m.fromId.chatId}`
            const c = chats.get(m.fromId.chatId)
            if (c) senderName = formatEntityName(c)
          }
        }

        let mediaType: any = undefined
        let mediaFileName: string | undefined = undefined
        let mediaFileSize: number | undefined = undefined
        let mediaDuration: number | undefined = undefined
        let isVoice = false
        let isRoundVideo = false
        let isSticker = false

        if (m.media) {
          if (m.media._ === 'messageMediaPhoto') {
            mediaType = 'photo'
          } else if (m.media._ === 'messageMediaDocument') {
            const doc = m.media.document
            if (doc && doc._ === 'document') {
              mediaFileSize = Number(doc.size || 0)
              mediaType = 'document'
              if (doc.attributes) {
                for (const attr of doc.attributes) {
                  if (attr._ === 'documentAttributeFilename') mediaFileName = attr.fileName
                  if (attr._ === 'documentAttributeAudio') {
                    mediaDuration = attr.duration
                    if (attr.voice) {
                      isVoice = true
                      mediaType = 'voice'
                    }
                  }
                  if (attr._ === 'documentAttributeVideo') {
                    mediaDuration = attr.duration
                    if (attr.roundMessage) isRoundVideo = true
                    mediaType = 'video'
                  }
                  if (attr._ === 'documentAttributeSticker') {
                    isSticker = true
                    mediaType = 'sticker'
                  }
                }
              }
            }
          } else if (m.media._ === 'messageMediaWebPage') {
            mediaType = 'webpage'
          }
        }

        const reactions: MessageReactionItem[] = []
        if (m.reactions?.results) {
          for (const r of m.reactions.results) {
            if (r.reaction?._ === 'reactionEmoji') {
              reactions.push({ emoji: r.reaction.emoticon, count: r.count, chosen: r.chosen || false })
            }
          }
        }

        const replyMarkup: any = undefined
        if (m.replyMarkup?._ === 'replyInlineMarkup') {
          const rows: InlineButton[][] = []
          for (const row of m.replyMarkup.rows) {
            const btnRow: InlineButton[] = []
            for (const b of row.buttons) {
              if (b._ === 'keyboardButtonUrl') {
                btnRow.push({ text: b.text, url: b.url })
              } else if (b._ === 'keyboardButtonCallback') {
                btnRow.push({ text: b.text, data: Buffer.from(b.data).toString('base64') })
              }
            }
            if (btnRow.length > 0) rows.push(btnRow)
          }
        }

        items.push({
          id,
          chatId,
          accountId,
          senderId,
          senderName,
          text,
          date,
          isOutgoing,
          mediaType,
          mediaFileName,
          mediaFileSize,
          mediaDuration,
          isVoice,
          isRoundVideo,
          isSticker,
          reactions: reactions.length > 0 ? reactions : undefined,
          replyToMsgId: m.replyTo?.replyToMsgId,
        })
      }

      return items
    } catch (err: any) {
      Logger.error(`[AccountManager] getMessages error for :, err`)
      return []
    }
  }


  public async getProfilePhoto(accountId: string, peerId: string): Promise<string | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null

    const cacheKey = `${accountId}_${peerId}`
    if (this.avatarCache.has(cacheKey)) {
      return this.avatarCache.get(cacheKey)!
    }

    try {
      const avatarFile = path.join(this.avatarsDir, `avatar_${accountId}_${peerId}.jpg`)
      if (fs.existsSync(avatarFile)) {
        const data = await fs.promises.readFile(avatarFile)
        const dataUrl = `data:image/jpeg;base64,${data.toString('base64')}`
        this.avatarCache.set(cacheKey, dataUrl)
        return dataUrl
      }

      const inputPeer = toRawPeer(peerId)
      let photoLoc: any = null

      if (inputPeer._ === 'inputPeerUser') {
        const res: any = await holder.client.call({
          _: 'users.getFullUser',
          id: { _: 'inputUser', userId: inputPeer.userId, accessHash: inputPeer.accessHash },
        }).catch(() => null)
        photoLoc = res?.fullUser?.profilePhoto
      } else if (inputPeer._ === 'inputPeerChannel') {
        const res: any = await holder.client.call({
          _: 'channels.getFullChannel',
          channel: { _: 'inputChannel', channelId: inputPeer.channelId, accessHash: inputPeer.accessHash },
        }).catch(() => null)
        photoLoc = res?.fullChat?.chatPhoto
      }

      if (photoLoc) {
        await holder.client.downloadToFile(avatarFile, photoLoc).catch(() => {})
        if (fs.existsSync(avatarFile)) {
          const data = await fs.promises.readFile(avatarFile)
          const dataUrl = `data:image/jpeg;base64,${data.toString('base64')}`
          this.avatarCache.set(cacheKey, dataUrl)
          return dataUrl
        }
      }
    } catch (_) {}

    return null
  }

  public async downloadMedia(
    accountId: string,
    chatId: string,
    messageId: number,
    thumb = false
  ): Promise<string | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    const client = holder.client

    const cacheKey = `${accountId}_${chatId}_${messageId}${thumb ? '_thumb' : ''}`
    if (this.mediaCache.has(cacheKey)) return this.mediaCache.get(cacheKey)!

    if (this.inFlightDownloads.has(cacheKey)) {
      return this.inFlightDownloads.get(cacheKey)!
    }

    const downloadPromise = (async () => {
      try {
        const inputPeer = toRawPeer(chatId)
        const res: any = await client.call({
          _: 'messages.getMessages',
          id: [{ _: 'inputMessageID', id: messageId }],
        })

        const msg = res?.messages?.[0]
        if (!msg || !msg.media) return null

        const ext = msg.media._ === 'messageMediaPhoto' ? '.jpg' : '.bin'
        const cachedPath = path.join(this.mediaDir, `media_${accountId}_${chatId}_${messageId}${ext}`)

        if (!fs.existsSync(cachedPath)) {
          const location = msg.media.photo || msg.media.document
          if (!location) return null

          const abortController = new AbortController()
          this.activeMediaDownloads.set(cacheKey, {
            abort: () => abortController.abort(),
            isCancelled: () => abortController.signal.aborted,
          })

          await client.downloadToFile(cachedPath, location, {
            abortSignal: abortController.signal,
            progressCallback: (received, total) => {
              const progress = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0
              this.onEventCallback?.('telegram:download-progress', {
                accountId,
                chatId,
                messageId,
                progress,
                bytesReceived: received,
                totalBytes: total,
              })
            },
          })
          this.activeMediaDownloads.delete(cacheKey)
        }

        const dataUrl = `guidegram-media://${cachedPath.replace(/\\/g, '/')}`
        this.mediaCache.set(cacheKey, dataUrl)
        return dataUrl
      } catch (err) {
        this.activeMediaDownloads.delete(cacheKey)
        Logger.error('[AccountManager] downloadMedia error:', err)
        return null
      } finally {
        this.inFlightDownloads.delete(cacheKey)
      }
    })()

    this.inFlightDownloads.set(cacheKey, downloadPromise)
    return downloadPromise
  }

  public async cancelDownloadMedia(
    accountId: string,
    chatId: string,
    messageId: number
  ): Promise<boolean> {
    const cacheKey = `${accountId}_${chatId}_${messageId}`
    const active = this.activeMediaDownloads.get(cacheKey)
    if (active) {
      active.abort()
      this.activeMediaDownloads.delete(cacheKey)
      return true
    }
    return false
  }

  public async saveMediaToFile(
    win: BrowserWindow | null,
    accountId: string,
    chatId: string,
    messageId: number,
    defaultName?: string
  ): Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return { success: false, error: 'Account not connected' }

    try {
      const mediaUrl = await this.downloadMedia(accountId, chatId, messageId, false)
      if (!mediaUrl) return { success: false, error: 'Failed to download media' }

      const cacheKey = `${accountId}_${chatId}_${messageId}`
      let sourcePath = ''
      const exts = ['.mp4', '.jpg', '.png', '.webp', '.ogg', '.pdf', '.bin', '']
      for (const ext of exts) {
        const p = path.join(this.mediaDir, `media_${cacheKey}${ext}`)
        if (fs.existsSync(p)) {
          sourcePath = p
          break
        }
      }

      if (!sourcePath || !fs.existsSync(sourcePath)) {
        return { success: false, error: 'Cached file not found' }
      }

      const safeDefaultName = defaultName || path.basename(sourcePath)
      const downloadsFolder = app.getPath('downloads')
      const targetDefault = path.join(downloadsFolder, safeDefaultName)

      if (win) {
        const res = await dialog.showSaveDialog(win, {
          title: 'Save Media to Computer',
          defaultPath: targetDefault,
        })
        if (res.canceled || !res.filePath) {
          return { success: false, canceled: true }
        }
        await fs.promises.copyFile(sourcePath, res.filePath)
        return { success: true, filePath: res.filePath }
      } else {
        await fs.promises.copyFile(sourcePath, targetDefault)
        return { success: true, filePath: targetDefault }
      }
    } catch (err: any) {
      Logger.error('[AccountManager] saveMediaToFile error:', err)
      return { success: false, error: err?.message || 'Download failed' }
    }
  }

  public async sendBotCallbackQuery(
    accountId: string,
    chatId: string,
    messageId: number,
    data?: string,
    row?: number,
    col?: number
  ): Promise<BotCallbackResult> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const inputPeer = toRawPeer(chatId)
      let bufferData: Buffer | undefined = undefined
      if (typeof row === 'number' && typeof col === 'number') {
        bufferData = this.botButtonCache.get(`${chatId}_${messageId}_${row}_${col}`)
      }
      if (!bufferData && data) {
        try {
          bufferData = Buffer.from(data, 'base64')
        } catch (_) {
          bufferData = Buffer.from(data, 'utf-8')
        }
      }
      const res: any = await holder.client.call({
        _: 'messages.getBotCallbackAnswer',
        peer: inputPeer,
        msgId: messageId,
        data: bufferData,
      })

      return {
        message: res.message,
        alert: res.alert,
        url: res.url,
      }
    } catch (err: any) {
      Logger.error('[AccountManager] sendBotCallbackQuery error:', err)
      throw err
    }
  }


  public async getCustomEmojiUrl(accountId: string, documentId: string): Promise<string | null> {
    const data = await this.getCustomEmojiData(accountId, documentId)
    return data?.url || null
  }

  public async getCustomEmojiData(
    accountId: string,
    documentId: string
  ): Promise<CustomEmojiPayload | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null

    if (this.customEmojiCache.has(documentId)) {
      const url = this.customEmojiCache.get(documentId)!
      return { format: 'image', url }
    }

    try {
      const emojiDocId = toLong(documentId)
      const res: any = await holder.client.call({
        _: 'messages.getCustomEmojiDocuments',
        documentId: [emojiDocId],
      })

      const doc = res?.[0]
      if (!doc || doc._ !== 'document') return null

      const ext = doc.mimeType === 'application/x-tgsticker' ? '.tgs' : '.webm'
      const filePath = path.join(this.mediaDir, `emoji_${documentId}${ext}`)

      if (!fs.existsSync(filePath)) {
        await holder.client.downloadToFile(filePath, doc)
      }

      const streamUrl = `guidegram-media://${filePath.replace(/\\/g, '/')}`
      this.customEmojiCache.set(documentId, streamUrl)

      if (ext === '.tgs') {
        const raw = await fs.promises.readFile(filePath)
        const decompressed = zlib.gunzipSync(raw)
        const parsedJson = JSON.parse(decompressed.toString('utf-8'))
        return { format: 'lottie', data: parsedJson, url: streamUrl }
      }

      return { format: ext === '.webm' ? 'video' : 'image', url: streamUrl }
    } catch (_) {
      return null
    }
  }

  public async resolvePeer(accountId: string, target: string): Promise<DialogItem> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account  is not connected.`)

    const clean = target.replace(/^@/, '').trim()
    const res: any = await holder.client.call({
      _: 'contacts.resolveUsername',
      username: clean,
    })

    const peer = res.peer
    const peerId =
      peer._ === 'peerUser'
        ? peer.userId.toString()
        : peer._ === 'peerChannel'
        ? `-${peer.channelId}`
        : `-${peer.chatId}`

    const user = res.users?.[0]
    const chat = res.chats?.[0]
    const entity = user || chat
    const title = formatEntityName(entity, clean)

    return {
      id: peerId,
      accountId,
      title,
      unreadCount: 0,
      isUser: peer._ === 'peerUser',
      isGroup: peer._ === 'peerChat' || (chat && !chat.broadcast),
      isChannel: peer._ === 'peerChannel' && !!chat?.broadcast,
      isBot: !!user?.bot,
      isPinned: false,
    }
  }

  public async searchPublicPeers(accountId: string, query: string): Promise<DialogItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account  is not connected.`)

    try {
      const res: any = await holder.client.call({
        _: 'contacts.search',
        q: query,
        limit: 20,
      })

      const items: DialogItem[] = []
      const chats = res.chats || []
      const users = res.users || []

      for (const c of chats) {
        items.push({
          id: `-${c.id}`,
          accountId,
          title: c.title || 'Channel',
          unreadCount: 0,
          isUser: false,
          isGroup: !c.broadcast,
          isChannel: !!c.broadcast,
          isBot: false,
          isPinned: false,
          username: c.username,
        })
      }

      for (const u of users) {
        items.push({
          id: u.id.toString(),
          accountId,
          title: formatEntityName(u),
          unreadCount: 0,
          isUser: true,
          isGroup: false,
          isChannel: false,
          isBot: !!u.bot,
          isPinned: false,
          username: u.username,
        })
      }

      return items
    } catch (err) {
      Logger.error('[AccountManager] searchPublicPeers error:', err)
      return []
    }
  }

  public async searchGlobal(
    accountId: string,
    query: string,
    filterType = 'all',
    limit = 40
  ): Promise<MessageItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account  is not connected.`)

    try {
      const res: any = await holder.client.call({
        _: 'messages.searchGlobal',
        q: query,
        filter: { _: 'inputMessagesFilterEmpty' },
        minDate: 0,
        maxDate: 0,
        offsetRate: 0,
        offsetPeer: { _: 'inputPeerEmpty' },
        offsetId: 0,
        limit,
      })

      const items: MessageItem[] = []
      for (const m of res.messages || []) {
        if (m._ === 'messageEmpty') continue
        const peerId =
          m.peerId?._ === 'peerUser'
            ? m.peerId.userId.toString()
            : m.peerId?._ === 'peerChannel'
            ? `-${m.peerId.channelId}`
            : m.peerId?._ === 'peerChat'
            ? `-${m.peerId.chatId}`
            : ''

        items.push({
          id: m.id,
          chatId: peerId,
          accountId,
          text: m.message || '',
          date: m.date || 0,
          isOutgoing: m.out || false,
        })
      }
      return items
    } catch (err) {
      Logger.error('[AccountManager] searchGlobal error:', err)
      return []
    }
  }

  public async getHistoricalMessages(
    accountId: string,
    chatId: string,
    limit = 100,
    offsetDate?: number,
    offsetId = 0
  ): Promise<MessageItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const inputPeer = toRawPeer(chatId)
      let offsetDateSec = 0
      if (typeof offsetDate === 'number' && offsetDate > 0) {
        offsetDateSec = offsetDate > 1e11 ? Math.floor(offsetDate / 1000) : Math.floor(offsetDate)
      }

      const res: any = await holder.client.call({
        _: 'messages.getHistory',
        peer: inputPeer,
        offsetId: offsetId || 0,
        offsetDate: offsetDateSec,
        addOffset: 0,
        limit: Math.min(Math.max(limit, 1), 100),
        maxId: 0,
        minId: 0,
        hash: Long.ZERO,
      })

      const rawMessages = res.messages || []
      const users = new Map<number, any>()
      const chats = new Map<number, any>()
      if (res.users) res.users.forEach((u: any) => users.set(u.id, u))
      if (res.chats) res.chats.forEach((c: any) => chats.set(c.id, c))

      const items: MessageItem[] = []
      for (const m of rawMessages) {
        if (m._ === 'messageEmpty') continue
        const id = m.id
        const date = m.date ? (m.date < 1e11 ? m.date * 1000 : m.date) : Date.now()
        const isOutgoing = m.out || false
        const text = m.message || ''

        let senderId = ''
        let senderName = ''
        if (m.fromId) {
          if (m.fromId._ === 'peerUser') {
            senderId = m.fromId.userId.toString()
            const u = users.get(m.fromId.userId)
            if (u) senderName = formatEntityName(u)
          } else if (m.fromId._ === 'peerChannel') {
            senderId = `-${m.fromId.channelId}`
            const c = chats.get(m.fromId.channelId)
            if (c) senderName = formatEntityName(c)
          } else if (m.fromId._ === 'peerChat') {
            senderId = `-${m.fromId.chatId}`
            const c = chats.get(m.fromId.chatId)
            if (c) senderName = formatEntityName(c)
          }
        }

        let mediaType: any = undefined
        let mediaFileName: string | undefined = undefined
        let mediaFileSize: number | undefined = undefined
        let mediaDuration: number | undefined = undefined
        let isVoice = false
        let isRoundVideo = false
        let isSticker = false

        if (m.media) {
          if (m.media._ === 'messageMediaPhoto') {
            mediaType = 'photo'
          } else if (m.media._ === 'messageMediaDocument') {
            const doc = m.media.document
            if (doc && doc._ === 'document') {
              mediaFileSize = Number(doc.size || 0)
              mediaType = 'document'
              if (doc.attributes) {
                for (const attr of doc.attributes) {
                  if (attr._ === 'documentAttributeFilename') mediaFileName = attr.fileName
                  if (attr._ === 'documentAttributeAudio') {
                    mediaDuration = attr.duration
                    if (attr.voice) {
                      isVoice = true
                      mediaType = 'voice'
                    }
                  }
                  if (attr._ === 'documentAttributeVideo') {
                    mediaDuration = attr.duration
                    if (attr.roundMessage) isRoundVideo = true
                    mediaType = 'video'
                  }
                  if (attr._ === 'documentAttributeSticker') {
                    isSticker = true
                    mediaType = 'sticker'
                  }
                }
              }
            }
          } else if (m.media._ === 'messageMediaWebPage') {
            mediaType = 'webpage'
          }
        }

        items.push({
          id,
          chatId,
          accountId,
          senderId,
          senderName,
          text,
          date,
          isOutgoing,
          mediaType,
          mediaFileName,
          mediaFileSize,
          mediaDuration,
          isVoice,
          isRoundVideo,
          isSticker,
        })
      }

      return items
    } catch (err) {
      Logger.error('[AccountManager] getHistoricalMessages error:', err)
      return []
    }
  }


  public async getChatDetails(accountId: string, chatId: string): Promise<ChatDetails> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account  is not connected.`)

    const inputPeer = toRawPeer(chatId)
    let details: ChatDetails = {
      id: chatId,
      title: 'Chat',
      isChannel: false,
      isGroup: false,
      isUser: false,
      isBot: false,
    }

    try {
      if (inputPeer._ === 'inputPeerUser') {
        const res: any = await holder.client.call({
          _: 'users.getFullUser',
          id: { _: 'inputUser', userId: inputPeer.userId, accessHash: inputPeer.accessHash },
        })
        const u = res.users?.[0]
        details = {
          id: chatId,
          title: formatEntityName(u),
          firstName: u?.firstName,
          lastName: u?.lastName,
          username: u?.username,
          phone: u?.phone,
          about: res.fullUser?.about,
          isUser: true,
          isGroup: false,
          isChannel: false,
          isBot: !!u?.bot,
          verified: !!u?.verified,
          customEmojiStatusId: u?.emojiStatus?.documentId?.toString(),
        }
      } else if (inputPeer._ === 'inputPeerChannel') {
        const res: any = await holder.client.call({
          _: 'channels.getFullChannel',
          channel: { _: 'inputChannel', channelId: inputPeer.channelId, accessHash: inputPeer.accessHash },
        })
        const c = res.chats?.[0]
        details = {
          id: chatId,
          title: c?.title || 'Channel',
          about: res.fullChat?.about,
          membersCount: res.fullChat?.participantsCount,
          isChannel: !!c?.broadcast,
          isGroup: !c?.broadcast,
          isUser: false,
          isBot: false,
          verified: !!c?.verified,
          isForum: !!c?.forum,
        }
      } else if (inputPeer._ === 'inputPeerChat') {
        const res: any = await holder.client.call({
          _: 'messages.getFullChat',
          chatId: inputPeer.chatId,
        })
        const c = res.chats?.[0]
        details = {
          id: chatId,
          title: c?.title || 'Group',
          membersCount: res.fullChat?.participants?.participants?.length,
          isGroup: true,
          isChannel: false,
          isUser: false,
          isBot: false,
        }
      }
    } catch (err) {
      Logger.error('[AccountManager] getChatDetails error:', err)
    }

    return details
  }

  public async toggleChatNotifications(
    accountId: string,
    chatId: string,
    mute: boolean
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account  is not connected.`)

    try {
      const inputPeer = toRawPeer(chatId)
      await holder.client.call({
        _: 'account.updateNotifySettings',
        peer: { _: 'inputNotifyPeer', peer: inputPeer },
        settings: {
          _: 'inputPeerNotifySettings',
          muteUntil: mute ? 2147483647 : 0,
        },
      })
      return true
    } catch (err) {
      Logger.error('[AccountManager] toggleChatNotifications error:', err)
      return false
    }
  }

  public async sendMessage(
    accountId: string,
    chatId: string,
    text: string,
    replyToMsgId?: number,
    options?: SendMessageOptions
  ): Promise<MessageItem> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const inputPeer = toRawPeer(chatId)
    const randomId = toLong(Math.floor(Math.random() * 10000000000))
    const actualReplyTo = options?.replyToMsgId ?? replyToMsgId

    const res: any = await holder.client.call({
      _: 'messages.sendMessage',
      peer: inputPeer,
      message: text,
      randomId,
      replyTo: actualReplyTo
        ? { _: 'inputReplyToMessage', replyToMsgId: actualReplyTo }
        : undefined,
      silent: options?.silent,
      scheduleDate: options?.scheduleDate ? Math.floor(options.scheduleDate / 1000) : undefined,
    })

    const msgId = res.id || res.updates?.[0]?.id || Math.floor(Date.now() / 1000)
    return {
      id: msgId,
      chatId,
      accountId,
      text,
      date: Math.floor(Date.now() / 1000),
      isOutgoing: true,
    }
  }

  public async sendMedia(
    accountId: string,
    chatId: string,
    filePath: string,
    options?: SendMediaOptions
  ): Promise<MessageItem> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const uploaded = await holder.client.sendMedia(chatId, filePath, {
      caption: options?.caption,
      replyTo: options?.replyToMsgId,
      silent: options?.silent,
      schedule: options?.scheduleDate ? Math.floor(options.scheduleDate / 1000) : undefined,
    })

    return {
      id: uploaded.id,
      chatId,
      accountId,
      text: options?.caption || '',
      date: Math.floor(Date.now() / 1000),
      isOutgoing: true,
      mediaType: 'document',
    }
  }

  public async forwardMessages(
    accountId: string,
    fromChatId: string,
    toChatId: string,
    messageIds: number[],
    options?: ForwardOptions
  ): Promise<void> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account  is not connected.`)

    const fromPeer = toRawPeer(fromChatId)
    const toPeer = toRawPeer(toChatId)
    const randomIds = messageIds.map(() => toLong(Math.floor(Math.random() * 10000000000)))

    await holder.client.call({
      _: 'messages.forwardMessages',
      fromPeer,
      toPeer,
      id: messageIds,
      randomId: randomIds,
      silent: options?.silent,
      dropAuthor: options?.withoutQuote,
    })
  }

  public async deleteMessages(
    accountId: string,
    chatId: string,
    messageIds: number[],
    revoke = true
  ): Promise<void> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account  is not connected.`)

    const inputPeer = toRawPeer(chatId)
    if (inputPeer._ === 'inputPeerChannel') {
      await holder.client.call({
        _: 'channels.deleteMessages',
        channel: { _: 'inputChannel', channelId: inputPeer.channelId, accessHash: inputPeer.accessHash },
        id: messageIds,
      })
    } else {
      await holder.client.call({
        _: 'messages.deleteMessages',
        id: messageIds,
        revoke,
      })
    }
  }

  public async markAllAsRead(accountId: string): Promise<{ success: boolean; count: number }> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account  is not connected.`)

    try {
      let count = 0
      for await (const d of holder.client.iterDialogs({ limit: 50 })) {
        if (d.unreadCount && d.unreadCount > 0) {
          await this.markAsRead(accountId, d.peer.id.toString()).catch(() => {})
          count++
        }
      }
      return { success: true, count }
    } catch (err: any) {
      return { success: false, count: 0 }
    }
  }

  public async markAsRead(accountId: string, chatId: string): Promise<void> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account  is not connected.`)

    const inputPeer = toRawPeer(chatId)
    if (inputPeer._ === 'inputPeerChannel') {
      await holder.client.call({
        _: 'channels.readHistory',
        channel: { _: 'inputChannel', channelId: inputPeer.channelId, accessHash: inputPeer.accessHash },
        maxId: 0,
      })
    } else {
      await holder.client.call({
        _: 'messages.readHistory',
        peer: inputPeer,
        maxId: 0,
      })
    }
  }


  public async getForumTopics(accountId: string, chatId: string): Promise<ForumTopicItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const inputPeer = toRawPeer(chatId)
      if (inputPeer._ !== 'inputPeerChannel') return []

      const res: any = await holder.client.call({
        _: 'messages.getForumTopics',
        peer: inputPeer,
        offsetDate: 0,
        offsetId: 0,
        offsetTopic: 0,
        limit: 100,
      })

      return (res.topics || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        iconColor: t.iconColor,
        unreadCount: t.unreadCount,
        isPinned: t.pinned,
        isClosed: t.closed,
      }))
    } catch (_) {
      return []
    }
  }

  public async getScheduledMessages(
    accountId: string,
    chatId: string
  ): Promise<ScheduledMessageItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account  is not connected.`)

    try {
      const inputPeer = toRawPeer(chatId)
      const res: any = await holder.client.call({
        _: 'messages.getScheduledHistory',
        peer: inputPeer,
        hash: Long.ZERO,
      })

      return (res.messages || []).map((m: any) => ({
        id: m.id,
        text: m.message,
        date: m.date,
        scheduledDate: m.date * 1000,
        isOutgoing: m.out,
      }))
    } catch (_) {
      return []
    }
  }

  public async sendScheduledMessageNow(
    accountId: string,
    chatId: string,
    messageId: number
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account  is not connected.`)

    try {
      const inputPeer = toRawPeer(chatId)
      await holder.client.call({
        _: 'messages.sendScheduledMessages',
        peer: inputPeer,
        id: [messageId],
      })
      return true
    } catch (_) {
      return false
    }
  }

  public async deleteScheduledMessages(
    accountId: string,
    chatId: string,
    messageIds: number[]
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account  is not connected.`)

    try {
      const inputPeer = toRawPeer(chatId)
      await holder.client.call({
        _: 'messages.deleteScheduledMessages',
        peer: inputPeer,
        id: messageIds,
      })
      return true
    } catch (_) {
      return false
    }
  }

  public async sendReaction(
    accountId: string,
    chatId: string,
    messageId: number,
    reactionEmoji: string
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account  is not connected.`)

    try {
      const inputPeer = toRawPeer(chatId)
      await holder.client.call({
        _: 'messages.sendReaction',
        peer: inputPeer,
        msgId: messageId,
        reaction: reactionEmoji ? [{ _: 'reactionEmoji', emoticon: reactionEmoji }] : [],
      })
      return true
    } catch (_) {
      return false
    }
  }

  public async getSavedStarGifts(accountId: string, userId?: string): Promise<StarGiftItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []

    try {
      const targetUser = userId ? toRawPeer(userId) : { _: 'inputUserSelf' as const }
      const res: any = await holder.client.call({
        _: 'payments.getSavedStarGifts',
        peer: targetUser as any,
        offset: '',
        limit: 50,
      })

      return (res.gifts || []).map((g: any) => ({
        id: g.gift?.id?.toString() || Math.random().toString(),
        stars: g.gift?.stars || 0,
        date: g.date || 0,
        message: g.message?.text,
        isSaved: g.saved,
      }))
    } catch (_) {
      return []
    }
  }

  public async getActiveSessions(accountId: string): Promise<ActiveSessionItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []

    try {
      const res: any = await holder.client.call({ _: 'account.getAuthorizations' })
      return (res.authorizations || []).map((a: any) => ({
        hash: a.hash?.toString() || '',
        deviceModel: a.deviceModel || 'Unknown',
        platform: a.platform || 'Unknown',
        systemVersion: a.systemVersion || '',
        appName: a.appName || 'Telegram App',
        appVersion: a.appVersion || '',
        dateActive: a.dateActive || 0,
        dateCreated: a.dateCreated || 0,
        ip: a.ip || '',
        country: a.country || '',
        region: a.region || '',
        isCurrent: a.current || false,
      }))
    } catch (_) {
      return []
    }
  }

  public async terminateSession(accountId: string, hash: string): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false

    try {
      await holder.client.call({
        _: 'account.resetAuthorization',
        hash: toLong(hash),
      })
      return true
    } catch (_) {
      return false
    }
  }

  public async translateMessage(
    accountId: string,
    chatId: string,
    messageId: number,
    toLang: string
  ): Promise<TranslatedTextResult> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account  is not connected.`)

    const inputPeer = toRawPeer(chatId)
    const res: any = await holder.client.call({
      _: 'messages.translateText',
      peer: inputPeer,
      id: [messageId],
      toLang,
    })

    const text = res.result?.[0]?.text || ''
    return { text, toLang }
  }

  public async getCloudFolders(accountId: string): Promise<CloudFolderItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []

    try {
      const res: any = await holder.client.call({ _: 'messages.getDialogFilters' })
      const filters = res.filters || []
      return filters
        .filter((f: any) => f._ === 'dialogFilter')
        .map((f: any) => ({
          id: f.id,
          title: f.title,
          emoticon: f.emoticon,
          includePeerIds: (f.includePeers || []).map((p: any) => p.userId?.toString() || p.channelId?.toString() || p.chatId?.toString() || ''),
          excludePeerIds: (f.excludePeers || []).map((p: any) => p.userId?.toString() || p.channelId?.toString() || p.chatId?.toString() || ''),
          pinnedPeerIds: (f.pinnedPeers || []).map((p: any) => p.userId?.toString() || p.channelId?.toString() || p.chatId?.toString() || ''),
          contacts: f.contacts,
          nonContacts: f.nonContacts,
          groups: f.groups,
          broadcasts: f.broadcasts,
          bots: f.bots,
          excludeMuted: f.excludeMuted,
          excludeRead: f.excludeRead,
          excludeArchived: f.excludeArchived,
        }))
    } catch (_) {
      return []
    }
  }


  public async getInstalledStickerSets(accountId: string): Promise<StickerSetItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []

    try {
      const res: any = await holder.client.call({
        _: 'messages.getAllStickers',
        hash: Long.ZERO,
      })

      return (res.sets || []).map((s: any) => ({
        id: s.id?.toString(),
        accessHash: s.accessHash?.toString(),
        title: s.title,
        shortName: s.shortName,
        count: s.count,
        stickers: [],
      }))
    } catch (_) {
      return []
    }
  }

  public async getStickerSet(
    accountId: string,
    setId: string,
    accessHash: string
  ): Promise<StickerSetItem | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null

    try {
      const res: any = await holder.client.call({
        _: 'messages.getStickerSet',
        stickerset: {
          _: 'inputStickerSetID',
          id: toLong(setId),
          accessHash: toLong(accessHash),
        },
        hash: 0,
      })

      const set = res.set
      const docs = res.documents || []

      const stickers: StickerItem[] = docs.map((d: any) => {
        let emoticon = ''
        if (d.attributes) {
          for (const attr of d.attributes) {
            if (attr._ === 'documentAttributeSticker') emoticon = attr.alt || ''
          }
        }
        return {
          id: d.id?.toString(),
          accessHash: d.accessHash?.toString(),
          fileReferenceHex: Buffer.from(d.fileReference || []).toString('hex'),
          mimeType: d.mimeType,
          emoticon,
          isAnimated: d.mimeType === 'application/x-tgsticker',
          isVideo: d.mimeType === 'video/webm',
        }
      })

      return {
        id: set.id?.toString(),
        accessHash: set.accessHash?.toString(),
        title: set.title,
        shortName: set.shortName,
        count: set.count,
        stickers,
      }
    } catch (_) {
      return null
    }
  }

  public async sendSticker(
    accountId: string,
    chatId: string,
    stickerId: string,
    accessHash: string,
    fileReferenceHex: string,
    replyToMsgId?: number
  ): Promise<MessageItem> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const inputPeer = toRawPeer(chatId)
    const randomId = toLong(Math.floor(Math.random() * 10000000000))

    const res: any = await holder.client.call({
      _: 'messages.sendMedia',
      peer: inputPeer,
      replyTo: replyToMsgId ? { _: 'inputReplyToMessage', replyToMsgId } : undefined,
      media: {
        _: 'inputMediaDocument',
        id: {
          _: 'inputDocument',
          id: toLong(stickerId),
          accessHash: toLong(accessHash),
          fileReference: Buffer.from(fileReferenceHex, 'hex'),
        },
      },
      message: '',
      randomId,
    })

    const msgId = res.id || res.updates?.[0]?.id || Math.floor(Date.now() / 1000)
    return {
      id: msgId,
      chatId,
      accountId,
      text: '',
      date: Math.floor(Date.now() / 1000),
      isOutgoing: true,
      isSticker: true,
    }
  }

  public async getStickerData(
    accountId: string,
    stickerId: string,
    accessHash: string,
    fileReferenceHex: string
  ): Promise<string | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null

    const cachedFile = path.join(this.mediaDir, `sticker_${stickerId}.bin`)
    if (fs.existsSync(cachedFile)) {
      return `guidegram-media://${cachedFile.replace(/\\/g, '/')}`
    }

    try {
      await holder.client.downloadToFile(cachedFile, {
        _: 'inputDocumentFileLocation',
        id: toLong(stickerId),
        accessHash: toLong(accessHash),
        fileReference: Buffer.from(fileReferenceHex, 'hex'),
        thumbSize: '',
      } as any)

      return `guidegram-media://${cachedFile.replace(/\\/g, '/')}`
    } catch (_) {
      return null
    }
  }

  public async getPeerStories(accountId: string, peerId: string): Promise<PeerStoriesPayload | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null

    try {
      const inputPeer = toRawPeer(peerId)
      const res: any = await holder.client.call({
        _: 'stories.getPeerStories',
        peer: inputPeer,
      })

      const stories = (res.stories?.stories || []).map((s: any) => ({
        id: s.id,
        date: s.date,
        expireDate: s.expireDate,
        caption: s.caption,
        viewsCount: s.views?.viewsCount,
      }))

      return {
        peerId,
        maxReadId: res.stories?.maxReadId,
        stories,
      }
    } catch (_) {
      return null
    }
  }

  public async readStories(accountId: string, peerId: string, maxId: number): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false

    try {
      const inputPeer = toRawPeer(peerId)
      await holder.client.call({
        _: 'stories.readStories',
        peer: inputPeer,
        maxId,
      })
      return true
    } catch (_) {
      return false
    }
  }

  public async getChannelBoostStatus(
    accountId: string,
    channelId: string
  ): Promise<ChannelBoostStatus | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null

    try {
      const inputPeer = toRawPeer(channelId)
      if (inputPeer._ !== 'inputPeerChannel') return null

      const res: any = await holder.client.call({
        _: 'premium.getBoostsStatus',
        peer: inputPeer,
      })

      return {
        level: res.level || 0,
        boosts: res.boosts || 0,
        currentLevelBoosts: res.currentLevelBoosts || 0,
        nextLevelBoosts: res.nextLevelBoosts,
        boostUrl: res.boostUrl || `https://t.me/boost?c=${channelId.replace(/^-100/, '')}`,
        myBoost: res.myBoost,
      }
    } catch (_) {
      return null
    }
  }

  public async getTwoFactorStatus(accountId: string): Promise<TwoFactorStatus | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null

    try {
      const res: any = await holder.client.call({ _: 'account.getPassword' })
      return {
        hasPassword: res.hasPassword || false,
        hasRecovery: res.hasRecovery || false,
        hint: res.hint,
        emailPattern: res.emailUnconfirmedPattern,
      }
    } catch (_) {
      return null
    }
  }

  public async getMyFullProfile(accountId: string): Promise<MyFullProfile | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null

    try {
      const me: any = await holder.client.getMe()
      const res: any = await holder.client.call({
        _: 'users.getFullUser',
        id: { _: 'inputUserSelf' },
      })

      const u = res.users?.[0] || me
      const full = res.fullUser

      return {
        id: me.id.toString(),
        firstName: u.firstName || '',
        lastName: u.lastName,
        username: u.username,
        phone: u.phone || u.phoneNumber,
        bio: full?.about,
        isPremium: u.premium || u.isPremium,
        customEmojiStatusId: u.emojiStatus?.documentId?.toString(),
        hasTwoStepAuth: full?.hasScheduled,
      }
    } catch (_) {
      return null
    }
  }

  public async getPrivacySettings(accountId: string): Promise<PrivacySecuritySettings> {
    return {
      twoStepVerification: true,
      autoDeleteMessages: 'off',
      localPasscode: false,
      passkeys: false,
      blockedUsersCount: 0,
      connectedWebsitesCount: 0,
      activeSessionsCount: 1,
      phoneNumberPrivacy: 'contacts',
      lastSeenPrivacy: 'everybody',
      profilePhotosPrivacy: 'everybody',
      forwardedMessagesPrivacy: 'everybody',
      callsPrivacy: 'everybody',
      voiceMessagesPrivacy: 'everybody',
      messagesPrivacy: 'everybody',
      birthdayPrivacy: 'everybody',
      giftsPrivacy: 'everybody',
      bioPrivacy: 'everybody',
      savedMusicPrivacy: 'everybody',
      invitesPrivacy: 'everybody',
    }
  }

  public async createGroup(
    accountId: string,
    title: string,
    userIds: string[]
  ): Promise<DialogItem | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account  is not connected.`)

    try {
      const inputUsers = userIds.map((id) => toRawPeer(id)).filter((p) => p._ === 'inputPeerUser')
      const res: any = await holder.client.call({
        _: 'messages.createChat',
        title,
        users: inputUsers as any,
      })

      const chat = res.chats?.[0]
      if (!chat) return null

      return {
        id: `-${chat.id}`,
        accountId,
        title: chat.title || title,
        unreadCount: 0,
        isUser: false,
        isGroup: true,
        isChannel: false,
        isBot: false,
        isPinned: false,
      }
    } catch (err) {
      Logger.error('[AccountManager] createGroup error:', err)
      return null
    }
  }

  public async createChannel(
    accountId: string,
    title: string,
    about: string,
    isMegagroup = false
  ): Promise<DialogItem | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const res: any = await holder.client.call({
        _: 'channels.createChannel',
        title,
        about,
        megagroup: isMegagroup,
        broadcast: !isMegagroup,
      })

      const chat = res.chats?.[0]
      if (!chat) return null

      return {
        id: `-${chat.id}`,
        accountId,
        title: chat.title || title,
        unreadCount: 0,
        isUser: false,
        isGroup: isMegagroup,
        isChannel: !isMegagroup,
        isBot: false,
        isPinned: false,
      }
    } catch (err) {
      Logger.error('[AccountManager] createChannel error:', err)
      return null
    }
  }

  public getAccounts(): AccountInfo[] {
    const accounts: AccountInfo[] = []
    for (const [, holder] of this.clients) {
      accounts.push(holder.info)
    }
    return accounts
  }

  private setupEventListeners(accountId: string, client: TelegramClient): void {
    client.onNewMessage.add(async (msg: any) => {
      try {
        const chatId = msg.chat?.id?.toString() || ''
        const item: MessageItem = {
          id: msg.id,
          chatId,
          accountId,
          text: msg.text || '',
          date: msg.date ? Math.floor(msg.date.getTime() / 1000) : Math.floor(Date.now() / 1000),
          isOutgoing: msg.isOutgoing,
        }
        this.onEventCallback?.('telegram:new-message', { accountId, chatId, message: item })
      } catch (e) {
        Logger.warn('[AccountManager] Error processing new message update:', e)
      }
    })

    client.onEditMessage.add(async (msg: any) => {
      try {
        const chatId = msg.chat?.id?.toString() || ''
        const item: MessageItem = {
          id: msg.id,
          chatId,
          accountId,
          text: msg.text || '',
          date: msg.date ? Math.floor(msg.date.getTime() / 1000) : Math.floor(Date.now() / 1000),
          isOutgoing: msg.isOutgoing,
        }
        this.onEventCallback?.('telegram:message-edited', { accountId, chatId, message: item })
      } catch (e) {
        Logger.warn('[AccountManager] Error processing edit message update:', e)
      }
    })

    client.onDeleteMessage.add(async (update: any) => {
      try {
        const chatId = update.chat?.id?.toString() || ''
        const messageIds = update.messageIds || []
        this.onEventCallback?.('telegram:message-deleted', { accountId, chatId, messageIds })
      } catch (e) {
        Logger.warn('[AccountManager] Error processing delete message update:', e)
      }
    })
  }
}

