import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { app, BrowserWindow, dialog } from 'electron'
import { TelegramClient, MemoryStorage } from '@mtcute/node'
import { tl, Long } from '@mtcute/core'
import { writeStringSession } from '@mtcute/core/utils.js'
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
  SharedMediaFilterType,
  SharedMediaItem,
  SharedMediaResponse,
  PollItem,
  PollOptionItem,
  DraftItem,
  AdminLogItem,
  AdminLogResponse,
  AdminLogActionType,
  BusinessProfile,
  BusinessChatLink,
  BusinessWorkHours,
  BusinessLocation,
  BusinessIntro,
  StarsStatusPayload,
  StarsTransactionItem,
  SavedDialogItem,
  SavedReactionTagItem,
  GroupCallInfo,
  GroupCallParticipantItem,
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
    if (chatId > 2000000000) {
      return { _: 'inputPeerChannel', channelId: chatId, accessHash: Long.ZERO }
    }
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
  abortSignal?: AbortSignal
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
  if (options?.abortSignal) options.abortSignal.addEventListener('abort', () => abortController.abort())
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

const JPEG_HEADER = Buffer.from(
  'ffd8ffe000104a46494600010100000100010000ffdb004300281c1e231e19282321232d2b28303c64413c37373c7b585d4964918099968f808c8aa0b4e6c3a0aad8ad8a8cc8ffcbdaeef5ffffff9bc1fffffffafee6fdfff8ffdb0043012b2d2d3c353c76414176f8a58ca5f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8ffc00011080000000003012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffc4001f0100030101010101010101010000000000000102030405060708090a0bffc400b51100020102040403040705040400010277000102031104052131061241510761711322328108144291a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a434445464748494a535455565758595a62636465666768696a72737475767778797a82838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002110311003f00',
  'hex'
)
const JPEG_FOOTER = Buffer.from([0xff, 0xd9])

export function strippedThumbToDataUrl(bytes: Uint8Array | Buffer): string | null {
  if (!bytes || bytes.length < 3) return null
  try {
    const b = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
    if (b[0] === 0x01) {
      const header = Buffer.from(JPEG_HEADER)
      header[164] = b[1]
      header[166] = b[2]
      return `data:image/jpeg;base64,${Buffer.concat([header, b.subarray(3), JPEG_FOOTER]).toString('base64')}`
    } else if (b[0] === 0xff && b[1] === 0xd8) {
      return `data:image/jpeg;base64,${b.toString('base64')}`
    }
    return null
  } catch (_) {
    return null
  }
}

export function extractStrippedThumb(mediaObj: any): string | undefined {
  if (!mediaObj) return undefined
  if (mediaObj.strippedThumb) return strippedThumbToDataUrl(mediaObj.strippedThumb) || undefined
  if (mediaObj.stripped_thumb) return strippedThumbToDataUrl(mediaObj.stripped_thumb) || undefined
  if (Array.isArray(mediaObj.sizes)) {
    for (const s of mediaObj.sizes) {
      if (s._ === 'photoStrippedSize' && s.bytes) return strippedThumbToDataUrl(s.bytes) || undefined
    }
  }
  if (Array.isArray(mediaObj.thumbs)) {
    for (const t of mediaObj.thumbs) {
      if (t._ === 'photoStrippedSize' && t.bytes) return strippedThumbToDataUrl(t.bytes) || undefined
    }
  }
  if (Array.isArray(mediaObj.videoThumbs)) {
    for (const t of mediaObj.videoThumbs) {
      if (t._ === 'photoStrippedSize' && t.bytes) return strippedThumbToDataUrl(t.bytes) || undefined
    }
  }
  if (mediaObj._ === 'photoStrippedSize' && mediaObj.bytes) return strippedThumbToDataUrl(mediaObj.bytes) || undefined
  return undefined
}

export function decodeMtprotoWaveform(waveformBuffer?: any): number[] | undefined {
  if (!waveformBuffer || waveformBuffer.length === 0) return undefined
  try {
    const buf = Buffer.isBuffer(waveformBuffer) ? waveformBuffer : Buffer.from(waveformBuffer)
    const bitsCount = buf.length * 8
    const samplesCount = Math.floor(bitsCount / 5)
    if (samplesCount <= 0) return undefined
    const result: number[] = []
    for (let i = 0; i < samplesCount; i++) {
      const bitOffset = i * 5
      const byteOffset = Math.floor(bitOffset / 8)
      const bitShift = bitOffset % 8
      let value = buf[byteOffset] >> bitShift
      if (bitShift > 3 && byteOffset + 1 < buf.length) {
        value |= buf[byteOffset + 1] << (8 - bitShift)
      }
      result.push(value & 0x1f)
    }
    return result
  } catch {
    return undefined
  }
}

export function parseMtprotoEntities(rawEntities?: any[]): MessageEntityItem[] | undefined {
  if (!rawEntities || !Array.isArray(rawEntities) || rawEntities.length === 0) return undefined
  const result: MessageEntityItem[] = []
  for (const ent of rawEntities) {
    if (!ent) continue
    const typeStr = (ent._ || '').replace(/^messageEntity/, '').toLowerCase()
    let type = 'unknown'
    if (ent._ === 'messageEntityBold') type = 'bold'
    else if (ent._ === 'messageEntityItalic') type = 'italic'
    else if (ent._ === 'messageEntityCode') type = 'code'
    else if (ent._ === 'messageEntityPre') type = 'pre'
    else if (ent._ === 'messageEntityTextUrl') type = 'text_url'
    else if (ent._ === 'messageEntityUrl') type = 'url'
    else if (ent._ === 'messageEntityMention') type = 'mention'
    else if (ent._ === 'messageEntityMentionName' || ent._ === 'inputMessageEntityMentionName') type = 'mention'
    else if (ent._ === 'messageEntityCustomEmoji') type = 'custom_emoji'
    else if (ent._ === 'messageEntityStrike') type = 'strike'
    else if (ent._ === 'messageEntitySpoiler') type = 'spoiler'
    else if (ent._ === 'messageEntityUnderline') type = 'underline'
    else if (ent._ === 'messageEntityBlockquote') type = 'blockquote'
    else type = typeStr || 'unknown'

    result.push({
      type,
      offset: ent.offset ?? 0,
      length: ent.length ?? 0,
      url: ent.url,
      language: ent.language,
      documentId: ent.documentId?.toString(),
    })
  }
  return result.length > 0 ? result : undefined
}

export function parsePollFromMedia(media: any, messageId: number): PollItem | undefined {
  if (!media || media._ !== 'messageMediaPoll') return undefined
  const rawPoll = media.poll
  const rawResults = media.results
  const answers: PollOptionItem[] = []

  const resultsByOption = new Map<string, { voters: number; chosen?: boolean; correct?: boolean }>()
  if (rawResults?.results && Array.isArray(rawResults.results)) {
    for (const r of rawResults.results) {
      const optKey = r.option ? Buffer.from(r.option).toString('hex') : ''
      resultsByOption.set(optKey, {
        voters: r.voters || 0,
        chosen: Boolean(r.chosen),
        correct: Boolean(r.correct),
      })
    }
  }

  if (rawPoll?.answers && Array.isArray(rawPoll.answers)) {
    for (const a of rawPoll.answers) {
      const optKey = a.option ? Buffer.from(a.option).toString('hex') : ''
      const resInfo = resultsByOption.get(optKey)
      const answerText = typeof a.text === 'string' ? a.text : a.text?.text || ''
      answers.push({
        text: answerText,
        option: optKey,
        voters: resInfo?.voters || 0,
        chosen: resInfo?.chosen || false,
        correct: resInfo?.correct || false,
      })
    }
  }

  const questionText =
    typeof rawPoll?.question === 'string'
      ? rawPoll.question
      : rawPoll?.question?.text || ''

  return {
    id: rawPoll?.id?.toString() || messageId.toString(),
    question: questionText,
    answers,
    closed: Boolean(rawPoll?.closed),
    publicVoters: Boolean(rawPoll?.publicVoters),
    multipleChoice: Boolean(rawPoll?.multipleChoice),
    quiz: Boolean(rawPoll?.quiz),
    totalVoters: rawResults?.totalVoters || 0,
    solution: rawResults?.solution || undefined,
  }
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
  private thumbCache = new Map<string, string>()
  private mediaCache = new Map<string, string>()
  private inFlightDownloads = new Map<string, Promise<string | null>>()
  private activeMediaDownloads = new Map<string, { abort: () => void; isCancelled: () => boolean }>()
  private customEmojiCache = new Map<string, CustomEmojiPayload>()
  private botButtonCache = new Map<string, Buffer>()
  private peerPhotos = new Map<string, any>()
  private peerAccessHashes = new Map<string, Long>()
  private topMessageIds = new Map<string, number>()

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
      Logger.warn(`[AccountManager] No session file found on disk for account ${savedAcc.id}`)
      const unauthInfo: AccountInfo = { ...savedAcc, status: 'needs_auth' }
      this.clients.set(savedAcc.id, { info: unauthInfo })
      this.onEventCallback?.('telegram:account-updated', { account: unauthInfo })
      return unauthInfo
    }

    // Auto-migrate legacy GramJS string session if detected
    if (sessionString.startsWith('1') && !sessionString.startsWith('1//')) {
      try {
        Logger.info(`[AccountManager] Migrating legacy GramJS session for account ${savedAcc.id}...`)
        const converted = convertFromGramjsSession(sessionString)
        const serialized = writeStringSession(converted)
        if (serialized) {
          sessionString = serialized
          this.store.saveSessionString(savedAcc.id, sessionString)
          Logger.info(`[AccountManager] Legacy GramJS session migrated to mtcute string for account ${savedAcc.id}`)
        }
      } catch (convErr: any) {
        Logger.warn(`[AccountManager] Session conversion failed for ${savedAcc.id}:`, convErr)
      }
    }

    const transport = ProxyManager.toMtcuteTransport(savedAcc.proxyConfig)
    const antiFingerprinting = config.antiFingerprinting !== false
    const profile = savedAcc.deviceProfile || DeviceProfileManager.getProfileForAccount(savedAcc.id, antiFingerprinting)

    const clientOptions: any = {
      apiId: config.apiId,
      apiHash: config.apiHash,
      storage: new MemoryStorage(),
      connectionCount: (kind: any) => (kind === 'download' ? 8 : (kind === 'upload' ? 8 : 4)),
      initConnectionOptions: {
        deviceModel: profile.deviceModel,
        systemVersion: profile.systemVersion,
        appVersion: profile.appVersion,
        systemLangCode: profile.systemLangCode,
        langCode: profile.langCode,
      },
    }
    if (transport) {
      clientOptions.transport = transport
    }

    const client = new TelegramClient(clientOptions)

    try {
      if (sessionString) {
        await client.importSession(sessionString)
      }
      Logger.info(`[AccountManager] Connecting saved account ${savedAcc.id} (${savedAcc.phone || savedAcc.firstName}) [Device: ${profile.deviceModel}]...`)
      await client.connect()

      const me: any = await client.getMe().catch(() => null)
      if (me && me.id) {
        const isBot = Boolean(me.isBot || (me as any).bot || savedAcc.isBot)
        const updatedInfo: AccountInfo = {
          id: me.id.toString(),
          phone: me.phoneNumber
            ? (me.phoneNumber.startsWith('+') ? me.phoneNumber : '+' + me.phoneNumber)
            : (savedAcc.phone || (me.username ? `@${me.username}` : `Bot ${me.id}`)),
          firstName: me.firstName || savedAcc.firstName || (isBot ? 'Bot' : 'User'),
          lastName: me.lastName || savedAcc.lastName,
          username: me.username || savedAcc.username,
          status: 'connected',
          unreadTotal: savedAcc.unreadTotal || 0,
          proxyConfig: savedAcc.proxyConfig,
          isPremium: me.isPremium || false,
          isBot,
          botToken: savedAcc.botToken,
          deviceProfile: profile,
        }

        this.clients.set(updatedInfo.id, { client, session: sessionString, info: updatedInfo })
        this.setupEventListeners(updatedInfo.id, client)
        try {
          client.startUpdatesLoop()
        } catch (updErr) {
          Logger.warn(`[AccountManager] startUpdatesLoop warning for ${updatedInfo.id}:`, updErr)
        }

        const currentAccounts = this.store.getConfig().accounts.map((a) => (a.id === updatedInfo.id ? updatedInfo : a))
        this.store.updateConfig({ accounts: currentAccounts })

        Logger.info(`[AccountManager] Account ${updatedInfo.id} connected successfully!`)
        this.onEventCallback?.('telegram:account-updated', { account: updatedInfo })
        return updatedInfo
      } else {
        Logger.warn(`[AccountManager] Account ${savedAcc.id} is not authorized (session expired).`)
        const unauthInfo: AccountInfo = { ...savedAcc, status: 'needs_auth' }
        this.clients.set(savedAcc.id, { client, session: sessionString, info: unauthInfo })
        this.onEventCallback?.('telegram:account-updated', { account: unauthInfo })
        return unauthInfo
      }
    } catch (err: any) {
      Logger.warn(`[AccountManager] Connection failed for account ${savedAcc.id}:`, err?.message || err)
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

    const clientOptions: any = {
      apiId: config.apiId,
      apiHash: config.apiHash,
      storage: new MemoryStorage(),
      connectionCount: (kind: any) => (kind === 'download' ? 8 : (kind === 'upload' ? 8 : 4)),
      initConnectionOptions: {
        deviceModel: profile.deviceModel,
        systemVersion: profile.systemVersion,
        appVersion: profile.appVersion,
        systemLangCode: profile.systemLangCode,
        langCode: profile.langCode,
      },
    }
    if (transport) {
      clientOptions.transport = transport
    }

    const client = new TelegramClient(clientOptions)

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
    try {
      client.startUpdatesLoop()
    } catch (_) {}

    return info
  }

  public async startBotAuth(token: string, proxy?: ProxyConfig): Promise<AccountInfo> {
    const cleanToken = (token || '').trim()
    if (!cleanToken) {
      throw new Error('Bot token is required.')
    }
    const botTokenRegex = /^\d+:[A-Za-z0-9_-]+$/
    if (!botTokenRegex.test(cleanToken)) {
      throw new Error('Invalid Bot Token format. It should look like: 123456789:ABCdefGHI...')
    }

    const botIdPrefix = cleanToken.split(':')[0]
    Logger.info(`[AccountManager] Starting bot auth for bot ID prefix: ${botIdPrefix}`)
    const config = this.store.getConfig()
    const transport = ProxyManager.toMtcuteTransport(proxy)
    const antiFingerprinting = config.antiFingerprinting !== false
    const botSeed = `bot_${botIdPrefix}`
    const profile = DeviceProfileManager.getProfileForAccount(botSeed, antiFingerprinting)

    const clientOptions: any = {
      apiId: config.apiId,
      apiHash: config.apiHash,
      storage: new MemoryStorage(),
      connectionCount: (kind: any) => (kind === 'download' ? 8 : (kind === 'upload' ? 8 : 4)),
      initConnectionOptions: {
        deviceModel: profile.deviceModel,
        systemVersion: profile.systemVersion,
        appVersion: profile.appVersion,
        systemLangCode: profile.systemLangCode,
        langCode: profile.langCode,
      },
    }
    if (transport) {
      clientOptions.transport = transport
    }

    const client = new TelegramClient(clientOptions)

    try {
      await client.connect()
      Logger.info(`[AccountManager] Connected to DC. Signing in with bot token...`)
      await client.signInBot(cleanToken)
      Logger.info(`[AccountManager] Bot signed in successfully!`)

      const me: any = await client.getMe()
      const sessionString = await client.exportSession()
      const accountId = me.id.toString()
      const botPhone = me.username ? `@${me.username}` : `Bot ${me.id}`

      const info: AccountInfo = {
        id: accountId,
        phone: botPhone,
        firstName: me.firstName || 'Bot',
        lastName: me.lastName || undefined,
        username: me.username || undefined,
        status: 'connected',
        unreadTotal: 0,
        proxyConfig: proxy,
        isPremium: false,
        isBot: true,
        botToken: cleanToken,
        deviceProfile: profile || DeviceProfileManager.getProfileForAccount(accountId, antiFingerprinting),
      }

      this.store.saveSessionString(accountId, sessionString)

      const currentAccounts = config.accounts.filter((a) => a.id !== accountId)
      currentAccounts.push(info)
      this.store.updateConfig({ accounts: currentAccounts })

      this.clients.set(accountId, { client, session: sessionString, info })
      this.setupEventListeners(accountId, client)
      try {
        client.startUpdatesLoop()
      } catch (_) {}

      Logger.info(`[AccountManager] Bot account ${accountId} (${botPhone}) registered successfully!`)
      this.onEventCallback?.('telegram:account-updated', { account: info })
      return info
    } catch (err: any) {
      Logger.error(`[AccountManager] startBotAuth failed:`, err)
      try {
        await client.disconnect()
      } catch (_) {}
      throw err
    }
  }

  public async startQrAuth(proxy?: ProxyConfig): Promise<QrTokenPayload> {
    Logger.info(`[AccountManager] Starting QR auth, proxy=`)
    await this.cancelQrAuth()

    const config = this.store.getConfig()
    const transport = ProxyManager.toMtcuteTransport(proxy)
    const antiFingerprinting = config.antiFingerprinting !== false
    const qrSeed = `qr_${Date.now()}_${Math.random()}`
    const profile = DeviceProfileManager.getProfileForAccount(qrSeed, antiFingerprinting)

    const clientOptions: any = {
      apiId: config.apiId,
      apiHash: config.apiHash,
      storage: new MemoryStorage(),
      connectionCount: (kind: any) => (kind === 'download' ? 8 : (kind === 'upload' ? 8 : 4)),
      initConnectionOptions: {
        deviceModel: profile.deviceModel,
        systemVersion: profile.systemVersion,
        appVersion: profile.appVersion,
        systemLangCode: profile.systemLangCode,
        langCode: profile.langCode,
      },
    }
    if (transport) {
      clientOptions.transport = transport
    }

    const client = new TelegramClient(clientOptions)

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
    try {
      client.startUpdatesLoop()
    } catch (_) {}
    Logger.info(`[AccountManager] finalizeQrLogin completed successfully for account ${accountId}`)
    this.onEventCallback?.('telegram:qr-success', { account: info })

    return info
  }


  public async logoutAccount(accountId: string): Promise<void> {
    const holder = this.clients.get(accountId)
    if (holder?.client) {
      try {
        try { holder.client.stopUpdatesLoop() } catch (_) {}
        await holder.client.call({ _: 'auth.logOut' }).catch(() => {})
        await holder.client.disconnect().catch(() => {})
      } catch (_) {}
    }
    this.clients.delete(accountId)
    this.store.removeSession(accountId)
    Logger.info(`[AccountManager] Account ${accountId} logged out successfully.`)
  }

  public async resolveInputPeer(accountId: string, peerId: string | number): Promise<tl.TypeInputPeer> {
    const holder = this.clients.get(accountId)
    const s = String(peerId).trim()
    if (s === 'self' || s === 'me') return { _: 'inputPeerSelf' }

    let normalized = s
    if (s.startsWith('-') && !s.startsWith('-100')) {
      const val = Math.abs(Number(s))
      if (val > 2000000000) {
        normalized = `-100${val}`
      }
    } else if (!s.startsWith('-') && !isNaN(Number(s)) && Number(s) > 2000000000) {
      normalized = `-100${s}`
    }

    if (holder?.client) {
      try {
        const num = Number(normalized)
        const target = !isNaN(num) ? num : normalized
        const resolved: any = await holder.client.resolvePeer(target)
        if (resolved) {
          if (resolved.accessHash) {
            this.peerAccessHashes.set(`${accountId}_${s}`, resolved.accessHash)
            this.peerAccessHashes.set(`${accountId}_${normalized}`, resolved.accessHash)
          }
          return resolved
        }
      } catch (_) {}
    }

    const bareId = normalized.replace(/^-100/, '').replace(/^-/, '')
    const cachedHash =
      this.peerAccessHashes.get(`${accountId}_${normalized}`) ||
      this.peerAccessHashes.get(`${accountId}_${s}`) ||
      this.peerAccessHashes.get(`${accountId}_-${bareId}`) ||
      this.peerAccessHashes.get(`${accountId}_${bareId}`)

    if (cachedHash) {
      if (normalized.startsWith('-100')) {
        const channelId = parseInt(normalized.slice(4), 10)
        return { _: 'inputPeerChannel', channelId, accessHash: cachedHash }
      } else if (normalized.startsWith('-')) {
        const chatId = Math.abs(Number(normalized))
        if (chatId > 2000000000) {
          return { _: 'inputPeerChannel', channelId: chatId, accessHash: cachedHash }
        }
        return { _: 'inputPeerChat', chatId }
      } else {
        const userId = parseInt(normalized, 10)
        return { _: 'inputPeerUser', userId, accessHash: cachedHash }
      }
    }

    const raw = toRawPeer(normalized)
    if (raw._ === 'inputPeerChannel' && cachedHash) {
      raw.accessHash = cachedHash
    }
    return raw
  }

  private recordDialogLastMessage(accountId: string, chatId: string, msg: any): void {
    try {
      if (!accountId || !chatId || !msg || !msg.id) return
      const raw = msg.raw || msg
      const text = msg.text || raw.message || ''
      const date = msg.date ? Math.floor(msg.date.getTime() / 1000) : (raw.date || Math.floor(Date.now() / 1000))
      const isOutgoing = Boolean(msg.isOutgoing || raw.out)

      let replyMarkup: { rows: InlineButton[][] } | undefined = undefined
      const rawMarkup = raw.replyMarkup || raw.reply_markup
      if ((rawMarkup?._ === 'replyInlineMarkup' || rawMarkup?._ === 'replyKeyboardMarkup') && Array.isArray(rawMarkup.rows)) {
        const rows: InlineButton[][] = []
        for (let rIdx = 0; rIdx < rawMarkup.rows.length; rIdx++) {
          const row = rawMarkup.rows[rIdx]
          const btnRow: InlineButton[] = []
          if (row?.buttons && Array.isArray(row.buttons)) {
            for (let cIdx = 0; cIdx < row.buttons.length; cIdx++) {
              const b = row.buttons[cIdx]
              if (b._ === 'keyboardButtonUrl') {
                btnRow.push({ text: b.text, url: b.url })
              } else if (b._ === 'keyboardButtonCallback') {
                const b64 = Buffer.from(b.data).toString('base64')
                this.botButtonCache.set(`${chatId}_${msg.id}_${rIdx}_${cIdx}`, Buffer.from(b.data))
                btnRow.push({ text: b.text, data: b64 })
              } else if (b._ === 'keyboardButtonWebView' || b._ === 'keyboardButtonSimpleWebView') {
                btnRow.push({ text: b.text, url: b.url, webAppUrl: b.url, isMiniApp: true })
              } else if (b.text) {
                btnRow.push({ text: b.text })
              }
            }
          }
          if (btnRow.length > 0) rows.push(btnRow)
        }
        if (rows.length > 0) replyMarkup = { rows }
      }

      const item: MessageItem = {
        id: msg.id,
        chatId,
        accountId,
        text,
        date,
        isOutgoing,
        replyMarkup,
      }
      this.store.recordMessage(accountId, chatId, item)
    } catch (e) {
      Logger.warn('[AccountManager] recordDialogLastMessage warning:', e)
    }
  }

  public async getDialogs(
    accountId: string,
    limit = 350,
    offsetDate = 0,
    offsetId = 0
  ): Promise<DialogItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    if (holder.info?.isBot) {
      // Telegram MTProto strictly forbids bots from calling messages.getDialogs (RPC 400 BOT_METHOD_INVALID).
      // Synthesize dialog list for bots from known local audit records & conversation store.
      const audit = this.store.loadAccountAudit(accountId)
      const dialogs: DialogItem[] = []
      const chatIds = Object.keys(audit || {})
      for (const chatId of chatIds) {
        const chatMsgs = audit[chatId] || {}
        const msgIds = Object.keys(chatMsgs).map(Number).sort((a, b) => b - a)
        const lastMsg = msgIds.length > 0 ? chatMsgs[msgIds[0]] : undefined
        dialogs.push({
          id: chatId,
          accountId,
          title: lastMsg?.senderName || `Chat ${chatId}`,
          unreadCount: 0,
          lastMessageText: lastMsg?.text || (lastMsg?.mediaType ? `[${lastMsg.mediaType}]` : ''),
          lastMessageDate: lastMsg?.date || 0,
          isUser: !chatId.startsWith('-'),
          isGroup: chatId.startsWith('-') && !chatId.startsWith('-100'),
          isChannel: chatId.startsWith('-100'),
          isBot: false,
          isPinned: false,
        })
      }
      return dialogs.sort((a, b) => (b.lastMessageDate || 0) - (a.lastMessageDate || 0))
    }

    try {
      const dialogs: DialogItem[] = []
      const seenIds = new Set<string>()

      const iterParams: any = { limit }
      if (offsetDate && offsetDate > 0) {
        iterParams.offset = { date: offsetDate }
      }

      for await (const d of holder.client.iterDialogs(iterParams)) {
        const peer = d.peer as any
        const peerId = peer.id.toString()
        if (seenIds.has(peerId)) continue
        seenIds.add(peerId)

        if (peer.accessHash) {
          this.peerAccessHashes.set(`${accountId}_${peerId}`, peer.accessHash)
        }

        // Cache small photo location for instant avatar download
        if (peer.photo?.small) {
          this.peerPhotos.set(`${accountId}_${peerId}`, peer.photo.small)
        }

        let avatarUrl: string | undefined = undefined
        const avatarCacheKey = `${accountId}_${peerId}`
        // Prioritize full high-res avatar from cache if already downloaded
        if (this.avatarCache.has(avatarCacheKey)) {
          avatarUrl = this.avatarCache.get(avatarCacheKey)
        } else if (peer.photo?.thumb) {
          try {
            avatarUrl = `data:image/jpeg;base64,${Buffer.from(peer.photo.thumb).toString('base64')}`
            // Note: DO NOT set into this.avatarCache so getProfilePhoto can fetch the crystal-clear 160x160 photo
          } catch (_) {}
        } else if (peer.photo?.raw?.strippedThumb) {
          const thumb = strippedThumbToDataUrl(peer.photo.raw.strippedThumb)
          if (thumb) {
            avatarUrl = thumb
            // Note: DO NOT set into this.avatarCache so getProfilePhoto can fetch the crystal-clear 160x160 photo
          }
        }

        const isUser = peer._ === 'user' || typeof peer.firstName === 'string'
        const isBot = Boolean(peer.isBot)
        const isGroup = peer.chatType === 'group' || peer.chatType === 'supergroup' || Boolean(peer.isGroup)
        const isChannel = peer.chatType === 'channel' || (Boolean(peer.isChannel) && !peer.isGroup)
        const isBroadcast = isChannel && !isGroup

        const title = formatEntityName(peer, 'Unknown Chat')
        const unreadCount = d.unreadCount || 0
        const readInboxMaxId = (d.raw as any)?.readInboxMaxId || 0
        const unreadMentionsCount = d.unreadMentionsCount || 0
        const isPinned = Boolean(d.isPinned)

        // Accurate isMuted calculation:
        // 1. Explicit boolean value from mtcute
        // 2. Peer notify settings check (muteUntil in future or silent)
        // 3. Fallback: broadcast channels in Telegram are muted by default
        let isMuted = false
        if (typeof d.isMuted === 'boolean') {
          isMuted = d.isMuted
        } else {
          const rawNotify = (d.raw as any)?.notifySettings
          const muteUntil = rawNotify?.muteUntil
          const silent = rawNotify?.silent
          if (silent || (muteUntil && muteUntil > Date.now() / 1000)) {
            isMuted = true
          } else if (isBroadcast) {
            isMuted = true // Broadcast channels in Telegram are muted by default unless explicitly unmuted
          }
        }

        let lastMessageText = ''
        let lastMessageDate = 0
        if (d.lastMessage) {
          lastMessageText = d.lastMessage.text || ''
          lastMessageDate = d.lastMessage.date ? d.lastMessage.date.getTime() : 0
          if (d.lastMessage.id) {
            this.topMessageIds.set(`${accountId}_${peerId}`, d.lastMessage.id)
            this.recordDialogLastMessage(accountId, peerId, d.lastMessage)
          }
        }

        const initials = title
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)

        let draft: DraftItem | undefined = undefined
        const rawDraft = (d.raw as any)?.draft || (d as any).draft
        if (rawDraft && rawDraft._ === 'draftMessage' && rawDraft.message) {
          draft = {
            text: rawDraft.message,
            date: rawDraft.date ? rawDraft.date * 1000 : undefined,
            replyToMsgId: rawDraft.replyTo?.replyToMsgId || rawDraft.replyToMsgId,
          }
        }

        const item: DialogItem = {
          id: peerId,
          accountId,
          title,
          unreadCount,
          readInboxMaxId,
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
          avatarUrl,
          username: (peer as any).username,
          customEmojiStatusId:
            (peer as any).emojiStatus?.emoji?.toString() ||
            (peer as any).emojiStatus?.raw?.documentId?.toString() ||
            (peer as any).raw?.emojiStatus?.documentId?.toString() ||
            (peer as any).emojiStatus?.documentId?.toString() ||
            undefined,
          isPremium: Boolean((peer as any).isPremium),
          isForum: (peer as any).isForum,
          isSponsored: Boolean((d as any).isSponsored || (d as any).sponsored || (peer as any).isSponsored),
          isSponsorChannel: Boolean((d as any).isSponsored || (d as any).sponsored || (peer as any).isSponsored),
          draft,
        }
        dialogs.push(item)
      }

      // Ensure all chats present in local audit store are exposed as dialogs
      try {
        const audit = this.store.loadAccountAudit(accountId)
        for (const [cId, msgs] of Object.entries(audit)) {
          if (seenIds.has(cId)) continue
          seenIds.add(cId)
          const msgList = Object.values(msgs).sort((a, b) => b.date - a.date)
          const topMsg = msgList[0]
          if (!topMsg) continue

          const isGroup = cId.startsWith('-') && !cId.startsWith('-100')
          const isChannel = cId.startsWith('-100')
          const isUser = !isGroup && !isChannel

          const title = topMsg.senderName || (isUser ? `User ${cId}` : `Chat ${cId}`)
          const initials = title
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)

          dialogs.push({
            id: cId,
            accountId,
            title,
            unreadCount: 0,
            readInboxMaxId: topMsg.id,
            unreadMentionsCount: 0,
            isMuted: false,
            isUser,
            isGroup,
            isChannel,
            isBroadcast: isChannel,
            isBot: false,
            isPinned: false,
            isSavedMessages: false,
            lastMessageText: topMsg.text || '',
            lastMessageDate: topMsg.date ? topMsg.date * 1000 : 0,
            avatarInitials: initials,
            avatarUrl: topMsg.senderAvatarUrl,
            username: topMsg.senderUsername,
          })
        }
      } catch (auditDialogErr) {
        Logger.warn('[AccountManager] Failed to merge audit dialogs:', auditDialogErr)
      }

      // Persist dialogs to disk cache for instant zero-latency startup on next app launch!
      if (!offsetDate || offsetDate === 0) {
        this.store.saveDialogsCache(accountId, dialogs)
        // Background prefetch crystal-clear high-res avatars for top visible dialogs
        this.prefetchAvatars(accountId, dialogs.slice(0, 40))
      }

      return dialogs
    } catch (err: any) {
      Logger.error(`[AccountManager] getDialogs error for ${accountId}:`, err)
      return []
    }
  }

  /**
   * Get cached dialogs from disk (< 10ms read)
   */
  public getCachedDialogs(accountId: string): DialogItem[] {
    return this.store.loadDialogsCache(accountId)
  }

  /**
   * Background prefetch high-resolution avatars for visible chats so they are crystal clear
   */
  private prefetchAvatars(accountId: string, dialogs: DialogItem[]): void {
    setTimeout(async () => {
      for (const d of dialogs) {
        try {
          const baseName = `${accountId}_${d.id}.jpg`
          const avatarFile = path.join(this.avatarsDir, `avatar_${baseName}`)
          if (!fs.existsSync(avatarFile)) {
            await this.getProfilePhoto(accountId, d.id, false).catch(() => {})
          }
        } catch (_) {}
      }
    }, 150)
  }

  public async getContacts(accountId: string): Promise<ContactItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) {
    if (!holder?.client) throw new Error(`Account  is not connected.`)
    }

    try {
      const contacts = await holder.client.getContacts()
      return contacts.map((c: any) => {
        const id = c.id.toString()
        if (c.accessHash) {
          this.peerAccessHashes.set(`${accountId}_${id}`, c.accessHash)
        }
        if (c.photo?.small) {
          this.peerPhotos.set(`${accountId}_${id}`, c.photo.small)
        }
        let avatarUrl: string | undefined = undefined
        const avatarCacheKey = `${accountId}_${id}`
        if (this.avatarCache.has(avatarCacheKey)) {
          avatarUrl = this.avatarCache.get(avatarCacheKey)
        } else if (c.photo?.thumb) {
          try {
            avatarUrl = `data:image/jpeg;base64,${Buffer.from(c.photo.thumb).toString('base64')}`
            this.avatarCache.set(avatarCacheKey, avatarUrl)
          } catch (_) {}
        }
        return {
          id,
          firstName: c.firstName || '',
          lastName: c.lastName || undefined,
          phone: c.phoneNumber || undefined,
          username: c.username || undefined,
          avatarUrl,
        }
      })
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
      const inputPeer = await this.resolveInputPeer(accountId, chatId)

      let res: any
      if (holder.info?.isBot) {
        // Telegram MTProto strictly prohibits bots from invoking messages.getHistory (RPC 400 BOT_METHOD_INVALID).
        // Bots fetch history via messages.getMessages / channels.getMessages using known message IDs or audit store.
        let topId = this.topMessageIds.get(`${accountId}_${chatId}`) || 0
        const auditMsgs = this.store.getAuditLog(accountId, chatId)
        if (auditMsgs.length > 0) {
          const maxAuditId = Math.max(...auditMsgs.map((m) => m.id))
          if (maxAuditId > topId) topId = maxAuditId
        }

        let candidateIds: number[] = []
        if (offsetId && offsetId > 0) {
          const start = Math.max(1, offsetId - limit)
          for (let i = start; i < offsetId; i++) candidateIds.push(i)
        } else if (topId > 0) {
          const start = Math.max(1, topId - limit + 1)
          for (let i = start; i <= topId; i++) candidateIds.push(i)
        } else {
          for (let i = 1; i <= Math.min(50, limit); i++) candidateIds.push(i)
        }

        try {
          if (inputPeer._ === 'inputPeerChannel') {
            res = await holder.client.call({
              _: 'channels.getMessages',
              channel: {
                _: 'inputChannel',
                channelId: inputPeer.channelId,
                accessHash: inputPeer.accessHash || Long.ZERO,
              },
              id: candidateIds.map((id) => ({ _: 'inputMessageID', id })),
            })
          } else {
            res = await holder.client.call({
              _: 'messages.getMessages',
              id: candidateIds.map((id) => ({ _: 'inputMessageID', id })),
            })
          }
        } catch (botFetchErr) {
          Logger.warn(`[AccountManager] Bot messages fetch fallback warning for ${chatId}:`, botFetchErr)
          res = { messages: [], users: [], chats: [] }
        }
      } else {
        res = await holder.client.call({
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
      }

      const rawMessages = res?.messages || []
      const users = new Map<number, any>()
      const chats = new Map<number, any>()
      const rawMsgMap = new Map<number, any>()
      if (res?.users) {
        res.users.forEach((u: any) => {
          users.set(u.id, u)
          if (u.accessHash) this.peerAccessHashes.set(`${accountId}_${u.id}`, u.accessHash)
          const thumb = extractStrippedThumb(u.photo)
          if (thumb) this.thumbCache.set(`${accountId}_${u.id}`, thumb)
        })
      }
      if (res?.chats) {
        res.chats.forEach((c: any) => {
          chats.set(c.id, c)
          const isChan = Boolean(c.broadcast || c.megagroup || c.gigagroup || c._ === 'channel')
          const peerId = isChan ? `-100${c.id}` : `-${c.id}`
          if (c.accessHash) {
            this.peerAccessHashes.set(`${accountId}_${peerId}`, c.accessHash)
            this.peerAccessHashes.set(`${accountId}_-${c.id}`, c.accessHash)
            this.peerAccessHashes.set(`${accountId}_-100${c.id}`, c.accessHash)
            this.peerAccessHashes.set(`${accountId}_${c.id}`, c.accessHash)
          }
          const thumb = extractStrippedThumb(c.photo)
          if (thumb) {
            this.thumbCache.set(`${accountId}_${peerId}`, thumb)
            this.thumbCache.set(`${accountId}_-${c.id}`, thumb)
            this.thumbCache.set(`${accountId}_-100${c.id}`, thumb)
          }
        })
      }
      for (const m of rawMessages) {
        if (m.id) {
          rawMsgMap.set(m.id, m)
          const currTop = this.topMessageIds.get(`${accountId}_${chatId}`) || 0
          if (m.id > currTop) this.topMessageIds.set(`${accountId}_${chatId}`, m.id)
        }
      }

      // Pre-fetch any missing replied messages so snippets and sender names can be resolved accurately
      const missingReplyIds = Array.from(
        new Set<number>(
          rawMessages
            .map((m: any) => m.replyTo?.replyToMsgId)
            .filter((id: any) => typeof id === 'number' && id > 0 && !rawMsgMap.has(id))
        )
      )

      if (missingReplyIds.length > 0) {
        try {
          let extraRes: any
          if (inputPeer._ === 'inputPeerChannel') {
            extraRes = await holder.client.call({
              _: 'channels.getMessages',
              channel: {
                _: 'inputChannel',
                channelId: inputPeer.channelId,
                accessHash: inputPeer.accessHash || Long.ZERO,
              },
              id: missingReplyIds.map((id) => ({ _: 'inputMessageID', id })),
            })
          } else {
            extraRes = await holder.client.call({
              _: 'messages.getMessages',
              id: missingReplyIds.map((id) => ({ _: 'inputMessageID', id })),
            })
          }

          if (extraRes?.users) {
            extraRes.users.forEach((u: any) => {
              users.set(u.id, u)
              if (u.accessHash) this.peerAccessHashes.set(`${accountId}_${u.id}`, u.accessHash)
              const thumb = extractStrippedThumb(u.photo)
              if (thumb) this.thumbCache.set(`${accountId}_${u.id}`, thumb)
            })
          }
          if (extraRes?.chats) {
            extraRes.chats.forEach((c: any) => {
              chats.set(c.id, c)
              if (c.accessHash) this.peerAccessHashes.set(`${accountId}_-${c.id}`, c.accessHash)
              const thumb = extractStrippedThumb(c.photo)
              if (thumb) this.thumbCache.set(`${accountId}_-${c.id}`, thumb)
            })
          }
          if (extraRes?.messages) {
            for (const em of extraRes.messages) {
              if (em && em.id) {
                rawMsgMap.set(em.id, em)
              }
            }
          }
        } catch (e) {
          Logger.warn(`[AccountManager] Failed to fetch missing reply messages for ${chatId}:`, e)
        }
      }

      const items: MessageItem[] = []
      for (const m of rawMessages) {
        if (m._ === 'messageEmpty') continue
        const id = m.id
        const date = m.date || 0
        const isOutgoing = m.out || false
        const text = m.message || ''

        let senderId = ''
        let senderName = ''
        let senderUsername: string | undefined = undefined
        let senderAvatarUrl: string | undefined = undefined
        let senderEmojiStatusId: string | undefined = undefined
        let senderColor: number | undefined = undefined
        let senderIsPremium: boolean | undefined = undefined

        if (m.fromId) {
          if (m.fromId._ === 'peerUser') {
            senderId = m.fromId.userId.toString()
            const senderUser = users.get(m.fromId.userId)
            if (senderUser) {
              senderName = formatEntityName(senderUser)
              senderUsername = senderUser.username
              senderAvatarUrl = this.avatarCache.get(`${accountId}_${senderUser.id}`) || this.thumbCache.get(`${accountId}_${senderUser.id}`) || extractStrippedThumb(senderUser.photo)
              if (senderUser.emojiStatus?.documentId) {
                senderEmojiStatusId = senderUser.emojiStatus.documentId.toString()
              }
              const senderColorVal = senderUser?.color?.color
              senderColor = senderColorVal !== undefined
                ? senderColorVal
                : (senderUser.id ? Math.abs(Number(senderUser.id)) % 7 : undefined)
              senderIsPremium = senderUser.premium === true
            }
          } else if (m.fromId._ === 'peerChannel') {
            senderId = `-${m.fromId.channelId}`
            const c = chats.get(m.fromId.channelId)
            if (c) {
              senderName = formatEntityName(c)
              senderUsername = c.username
              senderAvatarUrl = this.avatarCache.get(`${accountId}_-${c.id}`) || this.thumbCache.get(`${accountId}_-${c.id}`) || extractStrippedThumb(c.photo)
              if (c.color?.color !== undefined) {
                senderColor = c.color.color
              }
            }
          } else if (m.fromId._ === 'peerChat') {
            senderId = `-${m.fromId.chatId}`
            const c = chats.get(m.fromId.chatId)
            if (c) {
              senderName = formatEntityName(c)
              senderAvatarUrl = this.avatarCache.get(`${accountId}_-${c.id}`) || this.thumbCache.get(`${accountId}_-${c.id}`) || extractStrippedThumb(c.photo)
            }
          }
        }

        let mediaType: any = undefined
        let mediaFileName: string | undefined = undefined
        let mediaFileSize: number | undefined = undefined
        let mediaDuration: number | undefined = undefined
        let strippedThumb: string | undefined = undefined
        let isVoice = false
        let isRoundVideo = false
        let isSticker = false
        let voiceWaveform: number[] | undefined = undefined
        let poll: PollItem | undefined = undefined
        let paidMediaStars: number | undefined = undefined
        let paidMediaCount: number | undefined = undefined

        if (m.media) {
          if (m.media._ === 'messageMediaPhoto') {
            mediaType = 'photo'
            strippedThumb = extractStrippedThumb(m.media.photo)
          } else if (m.media._ === 'messageMediaDocument') {
            const doc = m.media.document
            if (doc && doc._ === 'document') {
              mediaFileSize = Number(doc.size || 0)
              mediaType = 'document'
              strippedThumb = extractStrippedThumb(doc)
              if (doc.attributes) {
                for (const attr of doc.attributes) {
                  if (attr._ === 'documentAttributeFilename') mediaFileName = attr.fileName
                  if (attr._ === 'documentAttributeAudio') {
                    mediaDuration = attr.duration
                    if (attr.waveform) {
                      voiceWaveform = decodeMtprotoWaveform(attr.waveform)
                    }
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
          } else if (m.media._ === 'messageMediaPoll') {
            mediaType = 'poll'
            poll = parsePollFromMedia(m.media, id)
          } else if (m.media._ === 'messageMediaPaidMedia') {
            mediaType = 'paid_media'
            paidMediaStars = m.media.starsAmount ? Number(m.media.starsAmount) : 0
            paidMediaCount = Array.isArray(m.media.extendedMedia) ? m.media.extendedMedia.length : 1
          }
        }

        const reactions: MessageReactionItem[] = []
        if (m.reactions?.results) {
          for (const r of m.reactions.results) {
            if (r.reaction?._ === 'reactionEmoji') {
              reactions.push({ emoji: r.reaction.emoticon, count: r.count, chosen: r.chosen || false })
            } else if (r.reaction?._ === 'reactionPaid') {
              reactions.push({ emoji: '⭐️', count: r.count, chosen: r.chosen || false, isPaid: true })
            }
          }
        }

        let replyMarkup: { rows: InlineButton[][] } | undefined = undefined
        const rawMarkup = m.replyMarkup || (m as any).reply_markup
        if ((rawMarkup?._ === 'replyInlineMarkup' || rawMarkup?._ === 'replyKeyboardMarkup') && Array.isArray(rawMarkup.rows)) {
          const rows: InlineButton[][] = []
          for (let rIdx = 0; rIdx < rawMarkup.rows.length; rIdx++) {
            const row = rawMarkup.rows[rIdx]
            const btnRow: InlineButton[] = []
            if (row?.buttons && Array.isArray(row.buttons)) {
              for (let cIdx = 0; cIdx < row.buttons.length; cIdx++) {
                const b = row.buttons[cIdx]
                if (b._ === 'keyboardButtonUrl') {
                  btnRow.push({ text: b.text, url: b.url })
                } else if (b._ === 'keyboardButtonCallback') {
                  const b64 = Buffer.from(b.data).toString('base64')
                  this.botButtonCache.set(`${chatId}_${id}_${rIdx}_${cIdx}`, Buffer.from(b.data))
                  btnRow.push({ text: b.text, data: b64 })
                } else if (b._ === 'keyboardButtonWebView' || b._ === 'keyboardButtonSimpleWebView') {
                  btnRow.push({ text: b.text, url: b.url, webAppUrl: b.url, isMiniApp: true })
                } else if (b.text) {
                  btnRow.push({ text: b.text })
                }
              }
            }
            if (btnRow.length > 0) rows.push(btnRow)
          }
          if (rows.length > 0) {
            replyMarkup = { rows }
          }
        }

        let replyTo: ReplyInfo | undefined = undefined
        if (m.replyTo?.replyToMsgId) {
          const refMsg = rawMsgMap.get(m.replyTo.replyToMsgId)
          if (refMsg) {
            let refSenderName = ''
            let refSenderId = ''
            if (refMsg.fromId) {
              if (refMsg.fromId._ === 'peerUser') {
                refSenderId = refMsg.fromId.userId.toString()
                const u = users.get(refMsg.fromId.userId)
                if (u) refSenderName = formatEntityName(u)
              } else if (refMsg.fromId._ === 'peerChannel') {
                refSenderId = `-${refMsg.fromId.channelId}`
                const c = chats.get(refMsg.fromId.channelId)
                if (c) refSenderName = formatEntityName(c)
              }
            }
            let refMediaType: any = undefined
            let refThumb: string | undefined = undefined
            let refIsVoice = false
            let refIsSticker = false
            if (refMsg.media) {
              if (refMsg.media._ === 'messageMediaPhoto') {
                refMediaType = 'photo'
                refThumb = extractStrippedThumb(refMsg.media.photo)
              } else if (refMsg.media._ === 'messageMediaDocument') {
                refMediaType = 'document'
                refThumb = extractStrippedThumb(refMsg.media.document)
                if (refMsg.media.document?.attributes) {
                  for (const a of refMsg.media.document.attributes) {
                    if (a._ === 'documentAttributeAudio' && a.voice) {
                      refIsVoice = true
                      refMediaType = 'voice'
                    }
                    if (a._ === 'documentAttributeVideo') {
                      refMediaType = 'video'
                    }
                    if (a._ === 'documentAttributeSticker') {
                      refIsSticker = true
                      refMediaType = 'sticker'
                    }
                  }
                }
              }
            }
            replyTo = {
              replyToMsgId: m.replyTo.replyToMsgId,
              senderName: refSenderName || 'Reply',
              senderId: refSenderId,
              text: refMsg.message || m.replyTo.quoteText || '',
              mediaType: refMediaType,
              strippedThumb: refThumb,
              isVoice: refIsVoice,
              isSticker: refIsSticker,
            }
          } else {
            replyTo = {
              replyToMsgId: m.replyTo.replyToMsgId,
              text: m.replyTo.quoteText || '',
              senderName: 'Reply',
            }
          }
        }

        const entities = parseMtprotoEntities(m.entities)

        let isForwarded = Boolean((m as any).fwdFrom)
        let forwardFromName = (m as any).fwdFrom?.fromName
        let forwardFromId: string | undefined = undefined
        const forwardDate = (m as any).fwdFrom?.date ? (m as any).fwdFrom.date * 1000 : undefined
        if ((m as any).fwdFrom?.fromId) {
          const fid = (m as any).fwdFrom.fromId
          if (fid._ === 'peerUser') {
            forwardFromId = fid.userId?.toString()
            const u = users.get(fid.userId)
            if (u && !forwardFromName) forwardFromName = formatEntityName(u)
          } else if (fid._ === 'peerChannel') {
            forwardFromId = `-${fid.channelId}`
            const c = chats.get(fid.channelId)
            if (c && !forwardFromName) forwardFromName = formatEntityName(c)
          } else if (fid._ === 'peerChat') {
            forwardFromId = `-${fid.chatId}`
            const c = chats.get(fid.chatId)
            if (c && !forwardFromName) forwardFromName = formatEntityName(c)
          }
        }
        const forwardInfo = isForwarded ? {
          fromId: forwardFromId,
          fromTitle: forwardFromName,
          date: forwardDate,
        } : undefined

        items.push({
          id,
          chatId,
          accountId,
          senderId,
          senderName,
          senderUsername,
          senderAvatarUrl,
          senderEmojiStatusId,
          senderColor,
          senderIsPremium,
          text,
          date,
          isOutgoing,
          isForwarded,
          forwardFromName,
          forwardFromId,
          forwardInfo,
          mediaType,
          mediaFileName,
          mediaFileSize,
          mediaDuration,
          strippedThumb,
          isVoice,
          voiceWaveform,
          isRoundVideo,
          isSticker,
          poll,
          paidMediaStars,
          paidMediaCount,
          reactions: reactions.length > 0 ? reactions : undefined,
          replyToMsgId: m.replyTo?.replyToMsgId,
          replyTo,
          replyMarkup,
          entities,
        })
      }

      if (items.length > 0) {
        this.store.recordMessages(accountId, chatId, items)
      }
      const keepDeleted = this.store.getConfig().keepDeletedMessagesLocally !== false
      return this.store.mergeAuditLogIntoMessages(accountId, chatId, items, keepDeleted)
    } catch (err: any) {
      Logger.error(`[AccountManager] getMessages error for ${chatId}:`, err)
      const fallback = this.store.getAuditLog(accountId, chatId)
      if (fallback && fallback.length > 0) {
        return fallback
      }
      return []
    }
  }


  public async getProfilePhoto(accountId: string, peerId: string, isBig = false): Promise<string | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null

    const cacheKey = `${accountId}_${peerId}${isBig ? '_big' : ''}`
    if (this.avatarCache.has(cacheKey)) {
      const cached = this.avatarCache.get(cacheKey)!
      // Real downloaded profile photos are full JPEGs (length > 2000 chars base64)
      // Stripped thumbnails are tiny (< 1500 chars). NEVER treat a low-res thumbnail as a finished profile photo!
      if (cached && (!cached.startsWith('data:image/jpeg;base64,') || cached.length > 2000)) {
        return cached
      }
    }

    try {
      const isSelf = peerId === accountId || peerId === 'self' || peerId === 'me'
      const baseName = `${accountId}_${peerId}${isBig ? '_big' : ''}.jpg`
      const candidateFiles = [
        path.join(this.avatarsDir, `avatar_${baseName}`),
        path.join(this.avatarsDir, baseName),
      ]

      for (const p of candidateFiles) {
        if (fs.existsSync(p)) {
          try {
            const stat = fs.statSync(p)
            if (stat.size === 0) {
              fs.unlinkSync(p)
            } else {
              const data = await fs.promises.readFile(p)
              if (data.length > 0) {
                const dataUrl = `data:image/jpeg;base64,${data.toString('base64')}`
                this.avatarCache.set(cacheKey, dataUrl)
                return dataUrl
              }
            }
          } catch {}
        }
      }

      const avatarFile = candidateFiles[0]

      // Check if we have peer photo location cached from iterDialogs (only for other peers, not self)
      let photoLoc = (isBig || isSelf) ? undefined : this.peerPhotos.get(`${accountId}_${peerId}`)

      if (photoLoc) {
        await holder.client.downloadToFile(avatarFile, photoLoc).catch(() => {})
      } else if (isSelf) {
        // Fetch current user's profile photo via inputUserSelf
        const userPhotos: any = await holder.client.call({
          _: 'photos.getUserPhotos',
          userId: { _: 'inputUserSelf' },
          offset: 0,
          maxId: Long.ZERO,
          limit: 1,
        }).catch(() => null)
        const firstPhoto = userPhotos?.photos?.[0]
        if (firstPhoto && firstPhoto._ === 'photo') {
          await holder.client.downloadToFile(avatarFile, firstPhoto).catch(() => {})
        }
      } else {
        const inputPeer = await this.resolveInputPeer(accountId, peerId)
        if (inputPeer._ === 'inputPeerUser') {
          let accessHash = inputPeer.accessHash || Long.ZERO
          if (accessHash.isZero()) {
            const cachedHash = this.peerAccessHashes.get(`${accountId}_${inputPeer.userId}`)
            if (cachedHash) accessHash = cachedHash
          }
          const userPhotos: any = await holder.client.call({
            _: 'photos.getUserPhotos',
            userId: { _: 'inputUser', userId: inputPeer.userId, accessHash },
            offset: 0,
            maxId: Long.ZERO,
            limit: 1,
          }).catch(() => null)
          const firstPhoto = userPhotos?.photos?.[0]
          if (firstPhoto && firstPhoto._ === 'photo') {
            await holder.client.downloadToFile(avatarFile, firstPhoto).catch(() => {})
          }
        } else if (inputPeer._ === 'inputPeerChannel') {
          let accessHash = inputPeer.accessHash || Long.ZERO
          if (accessHash.isZero()) {
            const cachedHash = this.peerAccessHashes.get(`${accountId}_${inputPeer.channelId}`)
            if (cachedHash) accessHash = cachedHash
          }
          const res: any = await holder.client.call({
            _: 'channels.getFullChannel',
            channel: { _: 'inputChannel', channelId: inputPeer.channelId, accessHash },
          }).catch(() => null)
          const photo = res?.fullChat?.chatPhoto
          if (photo && photo._ === 'photo') {
            await holder.client.downloadToFile(avatarFile, photo).catch(() => {})
          }
        }
      }

      if (fs.existsSync(avatarFile)) {
        const stat = fs.statSync(avatarFile)
        if (stat.size === 0) {
          try { fs.unlinkSync(avatarFile) } catch {}
          return null
        }
        const data = await fs.promises.readFile(avatarFile)
        if (data.length > 0) {
          const dataUrl = `data:image/jpeg;base64,${data.toString('base64')}`
          this.avatarCache.set(cacheKey, dataUrl)
          return dataUrl
        }
      }
    } catch (err: any) {
      Logger.warn(`[AccountManager] getProfilePhoto error for ${peerId}:`, err?.message || err)
    }

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
        const candidatePrefixes = [
          `media_${accountId}_${chatId}_${messageId}${thumb ? '_thumb' : ''}`,
          `${accountId}_${chatId}_${messageId}${thumb ? '_thumb' : ''}`,
        ]
        try {
          const files = fs.readdirSync(this.mediaDir)
          for (const prefix of candidatePrefixes) {
            const found = files.find((f) => f.startsWith(prefix))
            if (found) {
              const fullPath = path.join(this.mediaDir, found)
              if (fs.existsSync(fullPath) && fs.statSync(fullPath).size > 0) {
                const dataUrl = `guidegram-media://${fullPath.replace(/\\/g, '/')}`
                this.mediaCache.set(cacheKey, dataUrl)
                return dataUrl
              }
            }
          }
        } catch {}

        const inputPeer = toRawPeer(chatId)
        let res: any
        if (inputPeer._ === 'inputPeerChannel') {
          let accessHash = (inputPeer as any).accessHash || Long.ZERO
          if (accessHash.isZero()) {
            const cachedHash =
              this.peerAccessHashes.get(`${accountId}_${inputPeer.channelId}`) ||
              this.peerAccessHashes.get(`${accountId}_${chatId}`) ||
              this.peerAccessHashes.get(`${accountId}_${chatId.replace(/^-100/, '')}`)
            if (cachedHash) accessHash = cachedHash
          }
          res = await client.call({
            _: 'channels.getMessages',
            channel: {
              _: 'inputChannel',
              channelId: inputPeer.channelId,
              accessHash,
            },
            id: [{ _: 'inputMessageID', id: messageId }],
          })
        } else {
          res = await client.call({
            _: 'messages.getMessages',
            id: [{ _: 'inputMessageID', id: messageId }],
          })
        }

        const msg = res?.messages?.[0]
        if (!msg || !msg.media) return null

        let ext = '.bin'
        if (msg.media._ === 'messageMediaPhoto') {
          ext = '.jpg'
        } else if (msg.media._ === 'messageMediaDocument') {
          const doc = msg.media.document
          const mime = doc?.mimeType || ''
          if (mime.includes('video/mp4') || mime.includes('mp4')) ext = '.mp4'
          else if (mime.includes('webm')) ext = '.webm'
          else if (mime.includes('webp')) ext = '.webp'
          else if (mime.includes('audio/ogg') || mime.includes('ogg')) ext = '.ogg'
          else if (mime.includes('audio/mpeg') || mime.includes('mp3')) ext = '.mp3'
          else if (mime.includes('image/jpeg')) ext = '.jpg'
          else if (mime.includes('image/png')) ext = '.png'
          else if (mime.includes('pdf')) ext = '.pdf'
          else {
            const fnAttr = doc?.attributes?.find((a: any) => a._ === 'documentAttributeFilename')
            if (fnAttr?.fileName) {
              const parsedExt = path.extname(fnAttr.fileName)
              if (parsedExt) ext = parsedExt
            }
          }
        }

        const cachedPath = path.join(this.mediaDir, `media_${accountId}_${chatId}_${messageId}${thumb ? '_thumb' : ''}${ext}`)

        if (!fs.existsSync(cachedPath) || fs.statSync(cachedPath).size === 0) {
          try {
            if (fs.existsSync(cachedPath)) fs.unlinkSync(cachedPath)
          } catch {}

          const location = msg.media.photo || msg.media.document
          if (!location) return null

          const abortController = new AbortController()
          this.activeMediaDownloads.set(cacheKey, {
            abort: () => abortController.abort(),
            isCancelled: () => abortController.signal.aborted,
          })

          const isDocOrVideo =
            msg.media._ === 'messageMediaDocument' &&
            Boolean(msg.media.document && (msg.media.document as any)._ === 'document')
          const docObj = isDocOrVideo ? msg.media.document : null
          const fileSize = docObj ? Number(docObj.size || 0) : 0
          const isTurboParallel = !thumb && isDocOrVideo && fileSize > 10 * 1024 * 1024

          if (isTurboParallel && docObj) {
            await parallelDownloadDocument(client, docObj, cachedPath, {
              partSizeKB: 512,
              workers: 24,
              abortSignal: abortController.signal,
              isCancelled: () => abortController.signal.aborted,
              onProgress: (progress, received, total) => {
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
          } else {
            await client.downloadToFile(cachedPath, location, {
              partSize: 512,
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
          }
          this.activeMediaDownloads.delete(cacheKey)
        }

        if (fs.existsSync(cachedPath)) {
          if (fs.statSync(cachedPath).size === 0) {
            try { fs.unlinkSync(cachedPath) } catch {}
            return null
          }
          const dataUrl = `guidegram-media://${cachedPath.replace(/\\/g, '/')}`
          this.mediaCache.set(cacheKey, dataUrl)
          return dataUrl
        }
        return null
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
        const p1 = path.join(this.mediaDir, `media_${cacheKey}${ext}`)
        const p2 = path.join(this.mediaDir, `${cacheKey}${ext}`)
        if (fs.existsSync(p1) && fs.statSync(p1).size > 0) {
          sourcePath = p1
          break
        }
        if (fs.existsSync(p2) && fs.statSync(p2).size > 0) {
          sourcePath = p2
          break
        }
      }

      if (!sourcePath && mediaUrl.startsWith('guidegram-media://')) {
        const candidate = mediaUrl.replace(/^guidegram-media:\/\//, '')
        if (fs.existsSync(candidate) && fs.statSync(candidate).size > 0) {
          sourcePath = candidate
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
      return this.customEmojiCache.get(documentId)!
    }

    try {
      const emojiDocId = toLong(documentId)
      const res: any = await holder.client.call({
        _: 'messages.getCustomEmojiDocuments',
        documentId: [emojiDocId],
      })

      const doc = res?.[0]
      if (!doc || doc._ !== 'document') return null

      const isLottie = doc.mimeType === 'application/x-tgsticker'
      const isVideo = doc.mimeType === 'video/webm' || doc.mimeType === 'video/mp4'
      const ext = isLottie ? '.tgs' : (isVideo ? '.webm' : '.webp')
      const filePath = path.join(this.mediaDir, `emoji_${documentId}${ext}`)

      if (!fs.existsSync(filePath)) {
        await holder.client.downloadToFile(filePath, doc)
      }

      const streamUrl = `guidegram-media://${filePath.replace(/\\/g, '/')}`

      let payload: CustomEmojiPayload
      if (isLottie) {
        try {
          const raw = await fs.promises.readFile(filePath)
          const decompressed = zlib.gunzipSync(raw)
          const parsedJson = JSON.parse(decompressed.toString('utf-8'))
          payload = { format: 'lottie', data: parsedJson, url: streamUrl }
        } catch (_) {
          payload = { format: 'image', url: streamUrl }
        }
      } else if (isVideo) {
        payload = { format: 'video', url: streamUrl }
      } else {
        payload = { format: 'image', url: streamUrl }
      }

      this.customEmojiCache.set(documentId, payload)
      return payload
    } catch (_) {
      return null
    }
  }

  public async resolvePeer(accountId: string, target: string): Promise<DialogItem> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const clean = target.replace(/^@/, '').trim()
    const isNumeric = /^-?\d+$/.test(clean)

    if (isNumeric) {
      const inputPeer = await this.resolveInputPeer(accountId, clean)
      if (inputPeer._ === 'inputPeerChannel') {
        const res: any = await holder.client.call({
          _: 'channels.getChannels',
          id: [{ _: 'inputChannel', channelId: inputPeer.channelId, accessHash: inputPeer.accessHash || Long.ZERO }],
        }).catch(() => null)
        const c = res?.chats?.[0]
        if (c) {
          const peerId = `-100${c.id}`
          if (c.accessHash) {
            this.peerAccessHashes.set(`${accountId}_${peerId}`, c.accessHash)
            this.peerAccessHashes.set(`${accountId}_-${c.id}`, c.accessHash)
            this.peerAccessHashes.set(`${accountId}_${c.id}`, c.accessHash)
            this.peerAccessHashes.set(`${accountId}_-100${c.id}`, c.accessHash)
          }
          return {
            id: peerId,
            accountId,
            title: c.title || 'Channel',
            unreadCount: 0,
            isUser: false,
            isGroup: !c.broadcast,
            isChannel: !!c.broadcast,
            isBot: false,
            isPinned: false,
            username: c.username,
          }
        }
      } else if (inputPeer._ === 'inputPeerUser') {
        const res: any = await holder.client.call({
          _: 'users.getUsers',
          id: [{ _: 'inputUser', userId: inputPeer.userId, accessHash: inputPeer.accessHash || Long.ZERO }],
        }).catch(() => null)
        const u = res?.[0] || res?.users?.[0]
        if (u) {
          const peerId = u.id.toString()
          if (u.accessHash) {
            this.peerAccessHashes.set(`${accountId}_${peerId}`, u.accessHash)
          }
          return {
            id: peerId,
            accountId,
            title: formatEntityName(u),
            unreadCount: 0,
            isUser: true,
            isGroup: false,
            isChannel: false,
            isBot: !!u.bot,
            isPinned: false,
            username: u.username,
          }
        }
      }
    }

    const res: any = await holder.client.call({
      _: 'contacts.resolveUsername',
      username: clean,
    })

    const peer = res.peer
    const isChan = peer._ === 'peerChannel'
    const peerId =
      peer._ === 'peerUser'
        ? peer.userId.toString()
        : isChan
        ? `-100${peer.channelId}`
        : `-${peer.chatId}`

    const user = res.users?.[0]
    const chat = res.chats?.[0]
    const entity = user || chat
    const title = formatEntityName(entity, clean)

    if (chat?.accessHash) {
      this.peerAccessHashes.set(`${accountId}_${peerId}`, chat.accessHash)
      this.peerAccessHashes.set(`${accountId}_-${chat.id}`, chat.accessHash)
      this.peerAccessHashes.set(`${accountId}_-100${chat.id}`, chat.accessHash)
      this.peerAccessHashes.set(`${accountId}_${chat.id}`, chat.accessHash)
    }
    if (user?.accessHash) {
      this.peerAccessHashes.set(`${accountId}_${user.id}`, user.accessHash)
    }

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
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

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
        const isChan = Boolean(c.broadcast || c.megagroup || c.gigagroup || c._ === 'channel')
        const peerId = isChan ? `-100${c.id}` : `-${c.id}`
        if (c.accessHash) {
          this.peerAccessHashes.set(`${accountId}_${peerId}`, c.accessHash)
          this.peerAccessHashes.set(`${accountId}_-${c.id}`, c.accessHash)
          this.peerAccessHashes.set(`${accountId}_-100${c.id}`, c.accessHash)
          this.peerAccessHashes.set(`${accountId}_${c.id}`, c.accessHash)
        }

        items.push({
          id: peerId,
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
        if (u.accessHash) {
          this.peerAccessHashes.set(`${accountId}_${u.id}`, u.accessHash)
        }
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
        const isChan = m.peerId?._ === 'peerChannel'
        const peerId =
          m.peerId?._ === 'peerUser'
            ? m.peerId.userId.toString()
            : isChan
            ? `-100${m.peerId.channelId}`
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

  public async getSharedMedia(
    accountId: string,
    chatId: string,
    filterType: SharedMediaFilterType = 'media',
    limit = 50,
    offsetId = 0
  ): Promise<SharedMediaResponse> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const inputPeer = await this.resolveInputPeer(accountId, chatId)

      // Map filterType to MTProto messages filter
      let filter: any = { _: 'inputMessagesFilterPhotoVideo' }
      if (filterType === 'files') {
        filter = { _: 'inputMessagesFilterDocument' }
      } else if (filterType === 'links') {
        filter = { _: 'inputMessagesFilterUrl' }
      } else if (filterType === 'audio') {
        filter = { _: 'inputMessagesFilterMusic' }
      } else if (filterType === 'voice') {
        filter = { _: 'inputMessagesFilterRoundVoice' }
      }

      const res: any = await holder.client.call({
        _: 'messages.search',
        peer: inputPeer,
        q: '',
        filter,
        minDate: 0,
        maxDate: 0,
        offsetId: offsetId || 0,
        addOffset: 0,
        limit,
        maxId: 0,
        minId: 0,
        hash: Long.ZERO,
      })

      const rawMessages = Array.isArray(res.messages) ? res.messages : []
      const items: SharedMediaItem[] = []

      for (const m of rawMessages) {
        if (!m || m._ === 'messageEmpty') continue

        let itemType: 'photo' | 'video' | 'file' | 'audio' | 'voice' | 'link' = 'file'
        let thumbnailUrl: string | undefined = undefined
        let fileName: string | undefined = undefined
        let fileSize: number | undefined = undefined
        let mimeType: string | undefined = undefined
        let title: string | undefined = undefined
        let description: string | undefined = undefined
        let performer: string | undefined = undefined
        let duration: number | undefined = undefined
        let mediaUrl: string | undefined = undefined

        const media = m.media

        if (media?._ === 'messageMediaPhoto' && media.photo) {
          itemType = 'photo'
          thumbnailUrl = extractStrippedThumb(media.photo)
        } else if (media?._ === 'messageMediaDocument' && media.document) {
          const doc = media.document
          fileSize = typeof doc.size === 'number' ? doc.size : Number(doc.size || 0)
          mimeType = doc.mimeType || ''
          thumbnailUrl = extractStrippedThumb(doc)

          const attrs = Array.isArray(doc.attributes) ? doc.attributes : []
          for (const a of attrs) {
            if (a._ === 'documentAttributeFilename') {
              fileName = a.fileName
            } else if (a._ === 'documentAttributeVideo') {
              itemType = 'video'
              duration = a.duration
            } else if (a._ === 'documentAttributeAudio') {
              itemType = a.voice ? 'voice' : 'audio'
              duration = a.duration
              title = a.title
              performer = a.performer
            }
          }

          if (itemType === 'file' && !fileName) {
            fileName = `document_${doc.id || m.id}`
          }
        } else if (media?._ === 'messageMediaWebPage' && media.webpage) {
          itemType = 'link'
          const wp = media.webpage
          mediaUrl = wp.url
          title = wp.title
          description = wp.description
          thumbnailUrl = extractStrippedThumb(wp.photo)
        } else if (filterType === 'links') {
          itemType = 'link'
          if (Array.isArray(m.entities)) {
            for (const ent of m.entities) {
              if (ent._ === 'messageEntityTextUrl' && ent.url) {
                mediaUrl = ent.url
                break
              } else if (ent._ === 'messageEntityUrl' && m.message) {
                mediaUrl = m.message.slice(ent.offset, ent.offset + ent.length)
                break
              }
            }
          }
        }

        items.push({
          id: m.id,
          chatId,
          accountId,
          date: m.date || 0,
          type: itemType,
          caption: m.message || undefined,
          text: m.message || undefined,
          fileName,
          fileSize,
          mimeType,
          thumbnailUrl,
          url: mediaUrl,
          title,
          description,
          performer,
          duration,
          mediaObj: media,
        })
      }

      const totalCount = typeof res.count === 'number' ? res.count : items.length
      const lastItem = items[items.length - 1]
      const nextOffsetId = lastItem ? lastItem.id : 0
      const hasMore = items.length >= limit

      return {
        items,
        totalCount,
        nextOffsetId,
        hasMore,
      }
    } catch (err: any) {
      Logger.error(`[AccountManager] getSharedMedia error for chat ${chatId}:`, err)
      return {
        items: [],
        totalCount: 0,
        nextOffsetId: 0,
        hasMore: false,
      }
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
      const inputPeer = await this.resolveInputPeer(accountId, chatId)
      let offsetDateSec = 0
      if (typeof offsetDate === 'number' && offsetDate > 0) {
        offsetDateSec = offsetDate > 1e11 ? Math.floor(offsetDate / 1000) : Math.floor(offsetDate)
      }

      const res: any = await holder.client.call({
        _: 'messages.getHistory',
        peer: inputPeer,
        offsetId: offsetId || 0,
        offsetDate: offsetId > 0 ? 0 : offsetDateSec,
        addOffset: 0,
        limit: Math.min(Math.max(limit, 1), 100),
        maxId: 0,
        minId: 0,
        hash: Long.ZERO,
      })

      const rawMessages = res.messages || []
      const users = new Map<number, any>()
      const chats = new Map<number, any>()
      if (res.users) {
        res.users.forEach((u: any) => {
          users.set(u.id, u)
          if (u.accessHash) this.peerAccessHashes.set(`${accountId}_${u.id}`, u.accessHash)
          const thumb = extractStrippedThumb(u.photo)
          if (thumb) this.thumbCache.set(`${accountId}_${u.id}`, thumb)
        })
      }
      if (res.chats) {
        res.chats.forEach((c: any) => {
          chats.set(c.id, c)
          if (c.accessHash) this.peerAccessHashes.set(`${accountId}_-${c.id}`, c.accessHash)
          const thumb = extractStrippedThumb(c.photo)
          if (thumb) this.thumbCache.set(`${accountId}_-${c.id}`, thumb)
        })
      }

      const items: MessageItem[] = []
      for (const m of rawMessages) {
        if (m._ === 'messageEmpty') continue
        const id = m.id
        const date = m.date ? (m.date < 1e11 ? m.date * 1000 : m.date) : Date.now()
        const isOutgoing = m.out || false
        const text = m.message || ''

        let senderId = ''
        let senderName = ''
        let senderAvatarUrl: string | undefined = undefined
        if (m.fromId) {
          if (m.fromId._ === 'peerUser') {
            senderId = m.fromId.userId.toString()
            const u = users.get(m.fromId.userId)
            if (u) {
              senderName = formatEntityName(u)
              senderAvatarUrl = this.avatarCache.get(`${accountId}_${u.id}`) || this.thumbCache.get(`${accountId}_${u.id}`) || extractStrippedThumb(u.photo)
            }
          } else if (m.fromId._ === 'peerChannel') {
            senderId = `-${m.fromId.channelId}`
            const c = chats.get(m.fromId.channelId)
            if (c) {
              senderName = formatEntityName(c)
              senderAvatarUrl = this.avatarCache.get(`${accountId}_-${c.id}`) || this.thumbCache.get(`${accountId}_-${c.id}`) || extractStrippedThumb(c.photo)
            }
          } else if (m.fromId._ === 'peerChat') {
            senderId = `-${m.fromId.chatId}`
            const c = chats.get(m.fromId.chatId)
            if (c) {
              senderName = formatEntityName(c)
              senderAvatarUrl = this.avatarCache.get(`${accountId}_-${c.id}`) || this.thumbCache.get(`${accountId}_-${c.id}`) || extractStrippedThumb(c.photo)
            }
          }
        }

        let mediaType: any = undefined
        let mediaFileName: string | undefined = undefined
        let mediaFileSize: number | undefined = undefined
        let mediaDuration: number | undefined = undefined
        let isVoice = false
        let isRoundVideo = false
        let isSticker = false
        let voiceWaveform: number[] | undefined = undefined

        let strippedThumb: string | undefined = undefined
        let poll: PollItem | undefined = undefined
        let paidMediaStars: number | undefined = undefined
        let paidMediaCount: number | undefined = undefined

        if (m.media) {
          if (m.media._ === 'messageMediaPhoto') {
            mediaType = 'photo'
            strippedThumb = extractStrippedThumb(m.media.photo)
          } else if (m.media._ === 'messageMediaDocument') {
            const doc = m.media.document
            if (doc && doc._ === 'document') {
              mediaFileSize = Number(doc.size || 0)
              mediaType = 'document'
              strippedThumb = extractStrippedThumb(doc)
              if (doc.attributes) {
                for (const attr of doc.attributes) {
                  if (attr._ === 'documentAttributeFilename') mediaFileName = attr.fileName
                  if (attr._ === 'documentAttributeAudio') {
                    mediaDuration = attr.duration
                    if (attr.waveform) {
                      voiceWaveform = decodeMtprotoWaveform(attr.waveform)
                    }
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
          } else if (m.media._ === 'messageMediaPoll') {
            mediaType = 'poll'
            poll = parsePollFromMedia(m.media, id)
          } else if (m.media._ === 'messageMediaPaidMedia') {
            mediaType = 'paid_media'
            paidMediaStars = m.media.starsAmount ? Number(m.media.starsAmount) : 0
            paidMediaCount = Array.isArray(m.media.extendedMedia) ? m.media.extendedMedia.length : 1
          }
        }

        const entities = parseMtprotoEntities(m.entities)

        items.push({
          id,
          chatId,
          accountId,
          senderId,
          senderName,
          senderAvatarUrl,
          text,
          date,
          isOutgoing,
          mediaType,
          mediaFileName,
          mediaFileSize,
          mediaDuration,
          strippedThumb,
          isVoice,
          voiceWaveform,
          isRoundVideo,
          isSticker,
          poll,
          paidMediaStars,
          paidMediaCount,
          entities,
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
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const inputPeer = await this.resolveInputPeer(accountId, chatId)

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
        let botInfo: any = undefined
        if (res.fullUser?.botInfo) {
          const bi = res.fullUser.botInfo
          let menuBtn: any = undefined
          if (res.fullUser.botMenuButton) {
            const bmb = res.fullUser.botMenuButton
            if (bmb._ === 'botMenuButton' && bmb.text) {
              menuBtn = { text: bmb.text, url: bmb.url }
            } else if (bmb._ === 'botMenuButtonCommands') {
              menuBtn = { text: 'Commands' }
            }
          }
          botInfo = {
            description: bi.description,
            commands: bi.commands?.map((cmd: any) => ({ command: cmd.command, description: cmd.description })),
            menuButton: menuBtn,
          }
        }
        let stargiftsCount: number | undefined = undefined
        let birthday: string | undefined = undefined
        let personalChannelId: string | undefined = undefined
        let personalChannelTitle: string | undefined = undefined

        if (res.fullUser) {
          const fu = res.fullUser
          if (fu.stargiftsCount != null) {
            stargiftsCount = Number(fu.stargiftsCount)
          }
          if (fu.birthday) {
            const b = fu.birthday
            birthday = b.year ? `${b.day}/${b.month}/${b.year}` : `${b.day}/${b.month}`
          }
          if (fu.personalChannelId) {
            personalChannelId = `-100${fu.personalChannelId}`
            if (res.chats && Array.isArray(res.chats)) {
              const ch = res.chats.find((c: any) => c.id?.toString() === fu.personalChannelId?.toString())
              if (ch) personalChannelTitle = ch.title
            }
          }
        }

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
          isPremium: !!u?.premium,
          customEmojiStatusId: u?.emojiStatus?.documentId?.toString(),
          botInfo,
          stargiftsCount,
          birthday,
          personalChannelId,
          personalChannelTitle,
        }
      } else if (inputPeer._ === 'inputPeerChannel') {
        const res: any = await holder.client.call({
          _: 'channels.getFullChannel',
          channel: { _: 'inputChannel', channelId: inputPeer.channelId, accessHash: inputPeer.accessHash },
        })
        const c = res.chats?.[0]
        let availableReactions: string[] | undefined = undefined
        let canReactWithStars = true
        const chatReactions = res.fullChat?.availableReactions
        if (chatReactions) {
          if (chatReactions._ === 'chatReactionsNone' || chatReactions.className === 'ChatReactionsNone') {
            availableReactions = []
            canReactWithStars = false
          } else if (chatReactions.reactions && Array.isArray(chatReactions.reactions)) {
            availableReactions = []
            for (const r of chatReactions.reactions) {
              if (r.emoticon) availableReactions.push(r.emoticon)
            }
          }
          if (chatReactions.allowCustom !== undefined) {
            canReactWithStars = true
          }
        }

        const notifySettings = res.fullChat?.notifySettings
        let isMuted = false
        const nowSec = Math.floor(Date.now() / 1000)
        if (notifySettings) {
          if (notifySettings.silent === true) {
            isMuted = true
          } else if (notifySettings.muteUntil !== undefined && notifySettings.muteUntil !== null) {
            const muteVal = Number(notifySettings.muteUntil)
            if (muteVal > nowSec || muteVal === 2147483647) {
              isMuted = true
            }
          }
        }

        const rawCall = res.fullChat?.call
        const hasGroupCall = Boolean(rawCall && (rawCall._ === 'inputGroupCall' || rawCall.id))
        const groupCallId = hasGroupCall ? rawCall.id?.toString() : undefined
        const groupCallAccessHash = hasGroupCall ? rawCall.accessHash?.toString() : undefined
        const groupCallParticipantsCount = hasGroupCall ? Number(rawCall.participantsCount || 0) : undefined

        const isCreator = Boolean(c?.creator)
        const adminRights = c?.adminRights
        const isAdmin = isCreator || Boolean(adminRights)
        const canManageCalls = isCreator || Boolean(adminRights?.manageCall)
        const canViewAdminLog = isCreator || Boolean(res.fullChat?.canViewAdminLog || adminRights)
        const canPostMessages = c?.broadcast
          ? (isCreator || Boolean(adminRights?.postMessages))
          : !c?.defaultBannedRights?.sendMessages

        details = {
          id: chatId,
          title: c?.title || 'Channel',
          about: res.fullChat?.about,
          membersCount: res.fullChat?.participantsCount,
          isChannel: !!c?.broadcast,
          isBroadcast: !!c?.broadcast,
          isGroup: !c?.broadcast,
          isUser: false,
          isBot: false,
          isMuted,
          availableReactions,
          canReactWithStars,
          verified: !!c?.verified,
          isForum: !!c?.forum,
          hasGroupCall,
          groupCallId,
          groupCallAccessHash,
          groupCallParticipantsCount,
          isCreator,
          isAdmin,
          canManageCalls,
          canViewAdminLog,
          canSendMessages: canPostMessages,
          permissionsMatrix: {
            sendMessages: canPostMessages,
            sendMedia: !c?.defaultBannedRights?.sendMedia,
            sendStickers: !c?.defaultBannedRights?.sendStickers,
            sendPolls: !c?.defaultBannedRights?.sendPolls,
            embedLinks: !c?.defaultBannedRights?.embedLinks,
            inviteUsers: isCreator || Boolean(adminRights?.inviteUsers) || !c?.defaultBannedRights?.inviteUsers,
            pinMessages: isCreator || Boolean(adminRights?.pinMessages) || !c?.defaultBannedRights?.pinMessages,
            changeInfo: isCreator || Boolean(adminRights?.changeInfo) || !c?.defaultBannedRights?.changeInfo,
          },
        }
      } else if (inputPeer._ === 'inputPeerChat') {
        const res: any = await holder.client.call({
          _: 'messages.getFullChat',
          chatId: inputPeer.chatId,
        })
        const c = res.chats?.[0]
        let availableReactions: string[] | undefined = undefined
        let canReactWithStars = true
        const chatReactions = res.fullChat?.availableReactions
        if (chatReactions) {
          if (chatReactions._ === 'chatReactionsNone' || chatReactions.className === 'ChatReactionsNone') {
            availableReactions = []
            canReactWithStars = false
          } else if (chatReactions.reactions && Array.isArray(chatReactions.reactions)) {
            availableReactions = []
            for (const r of chatReactions.reactions) {
              if (r.emoticon) availableReactions.push(r.emoticon)
            }
          }
          if (chatReactions.allowCustom !== undefined) {
            canReactWithStars = true
          }
        }

        const notifySettings = res.fullChat?.notifySettings
        let isMuted = false
        const nowSec = Math.floor(Date.now() / 1000)
        if (notifySettings) {
          if (notifySettings.silent === true) {
            isMuted = true
          } else if (notifySettings.muteUntil !== undefined && notifySettings.muteUntil !== null) {
            const muteVal = Number(notifySettings.muteUntil)
            if (muteVal > nowSec || muteVal === 2147483647) {
              isMuted = true
            }
          }
        }

        const rawGroupCall = res.fullChat?.call
        const hasGroupCall = Boolean(rawGroupCall && (rawGroupCall._ === 'inputGroupCall' || rawGroupCall.id))
        const groupCallId = hasGroupCall ? rawGroupCall.id?.toString() : undefined
        const groupCallAccessHash = hasGroupCall ? rawGroupCall.accessHash?.toString() : undefined
        const groupCallParticipantsCount = hasGroupCall ? Number(rawGroupCall.participantsCount || 0) : undefined

        const isCreator = Boolean(c?.creator)
        const adminRights = c?.adminRights
        const isAdmin = isCreator || Boolean(adminRights)
        const canManageCalls = isCreator || Boolean(adminRights?.manageCall)
        const canViewAdminLog = isCreator || Boolean(adminRights)

        details = {
          id: chatId,
          title: c?.title || 'Group',
          membersCount: res.fullChat?.participants?.participants?.length,
          isGroup: true,
          isChannel: false,
          isUser: false,
          isBot: false,
          isMuted,
          availableReactions,
          canReactWithStars,
          hasGroupCall,
          groupCallId,
          groupCallAccessHash,
          groupCallParticipantsCount,
          isCreator,
          isAdmin,
          canManageCalls,
          canViewAdminLog,
        }
      }
    } catch (err: any) {
      Logger.warn(`[AccountManager] getChatDetails warning for ${chatId}:`, err?.message || err)
    }

    return details
  }

  public async toggleChatNotifications(
    accountId: string,
    chatId: string,
    mute: boolean
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const inputPeer = await this.resolveInputPeer(accountId, chatId)
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

    const inputPeer = await this.resolveInputPeer(accountId, chatId)
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
    const item: MessageItem = {
      id: msgId,
      chatId,
      accountId,
      text,
      date: Math.floor(Date.now() / 1000),
      isOutgoing: true,
    }
    const currTop = this.topMessageIds.get(`${accountId}_${chatId}`) || 0
    if (msgId > currTop) this.topMessageIds.set(`${accountId}_${chatId}`, msgId)
    this.store.recordMessage(accountId, chatId, item)
    return item
  }

  public async sendMedia(
    accountId: string,
    chatId: string,
    filePath: string,
    options?: SendMediaOptions
  ): Promise<MessageItem> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const targetPeer = await this.resolveInputPeer(accountId, chatId)

    let uploaded: any
    if (options?.isVoice) {
      // Ensure voice notes are cached in mediaDir before temporary file cleanup
      const cacheKey = `voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const destPath = path.join(this.mediaDir, `${cacheKey}.ogg`)
      try {
        await fs.promises.copyFile(filePath, destPath)
      } catch (e) {
        Logger.warn('[AccountManager] Failed to cache voice note to mediaDir:', e)
      }

      // Handled with DocumentAttributeAudio voice parameters and 4 upload workers
      uploaded = await holder.client.sendMedia(targetPeer as any, filePath, {
        caption: options?.caption,
        replyTo: options?.replyToMsgId,
        silent: options?.silent,
        schedule: options?.scheduleDate ? Math.floor(options.scheduleDate / 1000) : undefined,
        workers: 4,
      } as any)
    } else {
      uploaded = await holder.client.sendMedia(targetPeer as any, filePath, {
        caption: options?.caption,
        replyTo: options?.replyToMsgId,
        silent: options?.silent,
        schedule: options?.scheduleDate ? Math.floor(options.scheduleDate / 1000) : undefined,
        workers: 4,
      } as any)
    }

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
    toChatId: string | string[],
    messageIds: number[],
    options?: ForwardOptions
  ): Promise<boolean | void> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const targets = Array.isArray(toChatId) ? toChatId : [toChatId]
    if (targets.length === 0) return true

    const fromPeer = await this.resolveInputPeer(accountId, fromChatId)
    const customCaption = options?.newCaption ?? options?.caption

    let firstError: any = null
    let successCount = 0

    for (let i = 0; i < targets.length; i++) {
      const targetId = targets[i]
      try {
        const toPeer = await this.resolveInputPeer(accountId, targetId)
        const randomIds = messageIds.map(() => toLong(Math.floor(Math.random() * 10000000000)))

        await holder.client.call({
          _: 'messages.forwardMessages',
          fromPeer,
          toPeer,
          id: messageIds,
          randomId: randomIds,
          silent: options?.silent,
          dropAuthor: options?.withoutQuote,
          dropMediaCaptions: options?.dropMediaCaptions,
        })

        if (customCaption && customCaption.trim().length > 0) {
          try {
            const sendRandomId = toLong(Math.floor(Math.random() * 10000000000))
            await holder.client.call({
              _: 'messages.sendMessage',
              peer: toPeer,
              message: customCaption.trim(),
              randomId: sendRandomId,
              silent: options?.silent,
            })
          } catch (captionErr) {
            Logger.warn(`[AccountManager] Failed to dispatch custom caption for forward to ${targetId}:`, captionErr)
          }
        }

        successCount++
      } catch (err: any) {
        Logger.error(`[AccountManager] Failed to forward to target ${targetId}:`, err)
        if (!firstError) firstError = err
      }

      if (i < targets.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }

    if (targets.length > 0 && successCount === 0 && firstError) {
      throw firstError
    }

    return true
  }

  public async deleteMessages(
    accountId: string,
    chatId: string,
    messageIds: number[],
    revoke = true
  ): Promise<void> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const inputPeer = await this.resolveInputPeer(accountId, chatId)
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

  public async markAsRead(accountId: string, chatId: string, maxId?: number): Promise<void> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)
    const client = holder.client

    try {
      const inputPeer = await this.resolveInputPeer(accountId, chatId)
      const targetMaxId = typeof maxId === 'number' && maxId > 0 ? maxId : 2147483647

      if (inputPeer._ === 'inputPeerChannel') {
        await client.call({
          _: 'channels.readHistory',
          channel: { _: 'inputChannel', channelId: inputPeer.channelId, accessHash: inputPeer.accessHash },
          maxId: targetMaxId,
        })
      } else {
        await client.call({
          _: 'messages.readHistory',
          peer: inputPeer,
          maxId: targetMaxId,
        })
      }
    } catch (err: any) {
      Logger.warn(`[AccountManager] markAsRead warning for ${chatId}:`, err?.message || err)
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
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const inputPeer = await this.resolveInputPeer(accountId, chatId)
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
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const inputPeer = await this.resolveInputPeer(accountId, chatId)
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
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const inputPeer = await this.resolveInputPeer(accountId, chatId)
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
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const inputPeer = await this.resolveInputPeer(accountId, chatId)
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

  public async sendPaidReaction(
    accountId: string,
    chatId: string,
    messageId: number,
    count = 1,
    isPrivate?: boolean
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const inputPeer = await this.resolveInputPeer(accountId, chatId)
      await holder.client.call({
        _: 'messages.sendPaidReaction',
        peer: inputPeer,
        msgId: messageId,
        count: Math.max(1, count),
        randomId: toLong(Math.floor(Math.random() * 10000000000)),
        private: isPrivate ? { _: 'paidReactionPrivacyAnonymous' } : { _: 'paidReactionPrivacyDefault' },
      })
      return true
    } catch (err: any) {
      Logger.warn('[AccountManager] sendPaidReaction error:', err)
      return false
    }
  }

  public async getStarsStatus(accountId: string): Promise<StarsStatusPayload> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return { balance: 0 }

    try {
      const res: any = await holder.client.call({
        _: 'payments.getStarsStatus',
        peer: { _: 'inputPeerSelf' },
      })

      const balance = res.balance ? Number(res.balance.amount || res.balance) : 0
      return {
        balance,
        subscriptions: Array.isArray(res.subscriptions) ? res.subscriptions : [],
      }
    } catch (err) {
      Logger.warn('[AccountManager] getStarsStatus error:', err)
      return { balance: 0 }
    }
  }

  public async getStarsTransactions(
    accountId: string,
    offset?: string,
    limit = 20
  ): Promise<StarsTransactionItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []

    try {
      const res: any = await holder.client.call({
        _: 'payments.getStarsTransactions',
        peer: { _: 'inputPeerSelf' },
        offset: offset || '',
        limit: Math.min(100, Math.max(1, limit)),
      })

      if (!res || !Array.isArray(res.history)) return []

      return res.history.map((tx: any) => ({
        id: tx.id?.toString() || Math.random().toString(),
        stars: tx.stars ? Number(tx.stars.amount || tx.stars) : 0,
        date: tx.date ? tx.date * 1000 : Date.now(),
        title: tx.title || 'Telegram Stars Transaction',
        description: tx.description,
        isRefund: Boolean(tx.refund),
        isPending: Boolean(tx.pending),
        isFailed: Boolean(tx.failed),
      }))
    } catch (err) {
      Logger.warn('[AccountManager] getStarsTransactions error:', err)
      return []
    }
  }

  public async getSavedDialogs(
    accountId: string,
    limit = 50
  ): Promise<SavedDialogItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []

    try {
      const res: any = await holder.client.call({
        _: 'messages.getSavedDialogs',
        offsetDate: 0,
        offsetId: 0,
        offsetPeer: { _: 'inputPeerEmpty' },
        limit: Math.min(100, Math.max(1, limit)),
        hash: toLong(0),
      })

      if (!res || !Array.isArray(res.dialogs)) {
        return []
      }

      const chatMap = new Map<string, any>()
      const userMap = new Map<string, any>()
      if (Array.isArray(res.chats)) {
        for (const c of res.chats) chatMap.set(c.id?.toString(), c)
      }
      if (Array.isArray(res.users)) {
        for (const u of res.users) userMap.set(u.id?.toString(), u)
      }

      const items: SavedDialogItem[] = []
      for (const d of res.dialogs) {
        let peerId = ''
        let title = 'Saved Chat'
        let username: string | undefined
        let peerType: 'user' | 'chat' | 'channel' = 'user'

        if (d.peer?._ === 'peerUser') {
          peerId = d.peer.userId?.toString()
          peerType = 'user'
          const user = userMap.get(peerId)
          if (user) {
            title = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'User'
            username = user.username
          }
        } else if (d.peer?._ === 'peerChannel') {
          peerId = d.peer.channelId?.toString()
          peerType = 'channel'
          const channel = chatMap.get(peerId)
          if (channel) {
            title = channel.title || 'Channel'
            username = channel.username
          }
        } else if (d.peer?._ === 'peerChat') {
          peerId = d.peer.chatId?.toString()
          peerType = 'chat'
          const chat = chatMap.get(peerId)
          if (chat) {
            title = chat.title || 'Group'
          }
        }

        items.push({
          id: peerId,
          title,
          username,
          pinned: Boolean(d.pinned),
          unreadCount: d.unreadCount || 0,
          topMessage: d.topMessage ? d.topMessage.toString() : undefined,
          peerType,
        })
      }

      return items
    } catch (err) {
      Logger.warn('[AccountManager] getSavedDialogs error:', err)
      return []
    }
  }

  public async getSavedReactionTags(
    accountId: string
  ): Promise<SavedReactionTagItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []

    try {
      const res: any = await holder.client.call({
        _: 'messages.getSavedReactionTags',
        hash: toLong(0),
      })

      if (!res || !Array.isArray(res.tags)) return []

      return res.tags.map((t: any) => {
        let emoji = '⭐️'
        if (t.reaction?._ === 'reactionEmoji') {
          emoji = t.reaction.emoticon
        } else if (t.reaction?._ === 'reactionCustomEmoji') {
          emoji = '🔖'
        }
        return {
          emoji,
          title: t.title,
          count: t.count || 0,
        }
      })
    } catch (err) {
      Logger.warn('[AccountManager] getSavedReactionTags error:', err)
      return []
    }
  }

  public async getGroupCall(
    accountId: string,
    chatId: string,
    callId?: string,
    accessHash?: string
  ): Promise<{ call: GroupCallInfo; participants: GroupCallParticipantItem[] } | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null

    try {
      let activeCallId = callId
      let activeAccessHash = accessHash

      if (!activeCallId || !activeAccessHash) {
        const details = await this.getChatDetails(accountId, chatId)
        if (details?.hasGroupCall && details.groupCallId && details.groupCallAccessHash) {
          activeCallId = details.groupCallId
          activeAccessHash = details.groupCallAccessHash
        }
      }

      if (!activeCallId || !activeAccessHash) {
        return null
      }

      const res: any = await holder.client.call({
        _: 'phone.getGroupCall',
        call: { _: 'inputGroupCall', id: toLong(activeCallId), accessHash: toLong(activeAccessHash) },
        limit: 100,
      })

      if (!res || !res.call) return null

      const c = res.call
      const callInfo: GroupCallInfo = {
        id: c.id?.toString() || activeCallId,
        accessHash: c.accessHash?.toString() || activeAccessHash,
        title: c.title,
        participantsCount: Number(c.participantsCount || res.participants?.length || 0),
        canChangeJoinMuted: Boolean(c.canChangeJoinMuted),
        joinMuted: Boolean(c.joinMuted),
        canStartVideo: Boolean(c.canStartVideo),
        rtmpStream: Boolean(c.rtmpStream),
        version: c.version,
        scheduleDate: c.scheduleDate ? c.scheduleDate * 1000 : undefined,
        recordStartDate: c.recordStartDate ? c.recordStartDate * 1000 : undefined,
      }

      const userMap = new Map<string, any>()
      if (Array.isArray(res.users)) {
        for (const u of res.users) {
          userMap.set(u.id?.toString(), u)
        }
      }

      const participants: GroupCallParticipantItem[] = []
      if (Array.isArray(res.participants)) {
        for (const p of res.participants) {
          let peerId = ''
          if (p.peer?._ === 'peerUser') peerId = p.peer.userId?.toString()
          else if (p.peer?._ === 'peerChannel') peerId = `-${p.peer.channelId}`
          else if (p.peer?._ === 'peerChat') peerId = `-${p.peer.chatId}`

          const u = userMap.get(peerId)
          const name = u ? formatEntityName(u) : (p.about || 'Participant')

          participants.push({
            id: peerId,
            name,
            username: u?.username,
            avatarUrl: this.avatarCache.get(`${accountId}_${peerId}`) || (u?.photo ? extractStrippedThumb(u.photo) : undefined),
            isMuted: Boolean(p.muted),
            isSelf: Boolean(p.self),
            canSelfUnmute: Boolean(p.canSelfUnmute),
            volume: p.volume,
            raisedHand: Boolean(p.raiseHandRating),
            hasVideo: Boolean(p.video),
            hasPresentation: Boolean(p.presentation),
            justJoined: Boolean(p.justJoined),
          })
        }
      }

      return { call: callInfo, participants }
    } catch (err) {
      Logger.warn('[AccountManager] getGroupCall error:', err)
      return null
    }
  }

  public async createGroupCall(
    accountId: string,
    chatId: string,
    title?: string
  ): Promise<GroupCallInfo | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const inputPeer = await this.resolveInputPeer(accountId, chatId)
      const res: any = await holder.client.call({
        _: 'phone.createGroupCall',
        peer: inputPeer,
        randomId: Math.floor(Math.random() * 100000000),
        title: title || 'Group Voice Chat',
      })

      let callObj: any = null
      if (res?.updates) {
        for (const u of res.updates) {
          if (u._ === 'updateGroupCall') callObj = u.call
        }
      }

      if (callObj) {
        return {
          id: callObj.id?.toString(),
          accessHash: callObj.accessHash?.toString(),
          title: callObj.title || title || 'Group Voice Chat',
          participantsCount: Number(callObj.participantsCount || 1),
          canChangeJoinMuted: Boolean(callObj.canChangeJoinMuted),
          joinMuted: Boolean(callObj.joinMuted),
          canStartVideo: Boolean(callObj.canStartVideo),
          rtmpStream: Boolean(callObj.rtmpStream),
        }
      }

      return null
    } catch (err) {
      Logger.warn('[AccountManager] createGroupCall error:', err)
      return null
    }
  }

  public async joinGroupCall(
    accountId: string,
    callId: string,
    accessHash: string,
    muted = false
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      await holder.client.call({
        _: 'phone.joinGroupCall',
        call: { _: 'inputGroupCall', id: toLong(callId), accessHash: toLong(accessHash) },
        joinAs: { _: 'inputPeerSelf' },
        params: { _: 'dataJSON', data: JSON.stringify({ transport: 'webrtc' }) },
        muted,
      })
      return true
    } catch (err) {
      Logger.warn('[AccountManager] joinGroupCall error:', err)
      return false
    }
  }

  public async leaveGroupCall(
    accountId: string,
    callId: string,
    accessHash: string
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      await holder.client.call({
        _: 'phone.leaveGroupCall',
        call: { _: 'inputGroupCall', id: toLong(callId), accessHash: toLong(accessHash) },
        source: 0,
      })
      return true
    } catch (err) {
      Logger.warn('[AccountManager] leaveGroupCall error:', err)
      return false
    }
  }

  public async editGroupCallParticipant(
    accountId: string,
    callId: string,
    accessHash: string,
    participantId: string,
    muted?: boolean,
    raiseHand?: boolean,
    volume?: number
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const participantPeer = await this.resolveInputPeer(accountId, participantId)
      await holder.client.call({
        _: 'phone.editGroupCallParticipant',
        call: { _: 'inputGroupCall', id: toLong(callId), accessHash: toLong(accessHash) },
        participant: participantPeer,
        muted,
        raiseHand,
        volume: volume !== undefined ? Math.max(1, Math.min(20000, volume * 100)) : undefined,
      })
      return true
    } catch (err) {
      Logger.warn('[AccountManager] editGroupCallParticipant error:', err)
      return false
    }
  }

  public async sendVote(
    accountId: string,
    chatId: string,
    messageId: number,
    options: string[]
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const inputPeer = await this.resolveInputPeer(accountId, chatId)
      const optionsBuffers = options.map((opt) =>
        /^[0-9a-fA-F]+$/.test(opt) && opt.length % 2 === 0
          ? Buffer.from(opt, 'hex')
          : Buffer.from(opt, 'utf-8')
      )

      await holder.client.call({
        _: 'messages.sendVote',
        peer: inputPeer,
        msgId: messageId,
        options: optionsBuffers,
      })
      return true
    } catch (err: any) {
      Logger.error(`[AccountManager] sendVote error:`, err)
      return false
    }
  }

  public async createPoll(
    accountId: string,
    chatId: string,
    question: string,
    answers: string[],
    options?: {
      multipleChoice?: boolean
      quiz?: boolean
      correctOptionIndex?: number
      solution?: string
      anonymous?: boolean
    }
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const inputPeer = await this.resolveInputPeer(accountId, chatId)
      const isQuiz = Boolean(options?.quiz)
      const correctOptionIndex = options?.correctOptionIndex ?? (isQuiz ? 0 : undefined)

      await holder.client.call({
        _: 'messages.sendMedia',
        peer: inputPeer,
        media: {
          _: 'inputMediaPoll',
          poll: {
            _: 'poll',
            id: Long.ZERO,
            closed: false,
            publicVoters: !options?.anonymous,
            multipleChoice: Boolean(options?.multipleChoice),
            quiz: isQuiz,
            question: {
              _: 'textWithEntities',
              text: question,
              entities: [],
            },
            answers: answers.map((ans, idx) => ({
              _: 'pollAnswer',
              text: {
                _: 'textWithEntities',
                text: ans,
                entities: [],
              },
              option: Buffer.from([idx]),
            })),
          },
          correctAnswers:
            correctOptionIndex !== undefined ? [Buffer.from([correctOptionIndex])] : undefined,
          solution: options?.solution
            ? {
                _: 'textWithEntities',
                text: options.solution,
                entities: [],
              }
            : undefined,
        } as any,
        message: '',
        randomId: Long.fromBits(
          (Math.random() * 0xffffffff) | 0,
          (Math.random() * 0xffffffff) | 0
        ),
      })

      return true
    } catch (err: any) {
      Logger.error(`[AccountManager] createPoll error:`, err)
      throw err
    }
  }

  public async saveDraft(
    accountId: string,
    chatId: string,
    message: string,
    replyToMsgId?: number
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const inputPeer = await this.resolveInputPeer(accountId, chatId)
      const callParams: any = {
        _: 'messages.saveDraft',
        peer: inputPeer,
        message: message || '',
      }
      if (replyToMsgId) {
        callParams.replyTo = {
          _: 'inputReplyToMessage',
          replyToMsgId,
        }
      }
      await holder.client.call(callParams)
      return true
    } catch (err: any) {
      const msg = String(err?.message || '')
      if (
        msg.includes('CHAT_ADMIN_REQUIRED') ||
        msg.includes('CHANNEL_INVALID') ||
        msg.includes('CHANNEL_PRIVATE') ||
        msg.includes('USER_BANNED_IN_CHANNEL')
      ) {
        Logger.debug(`[AccountManager] saveDraft skipped for read-only peer ${chatId}: ${msg}`)
      } else {
        Logger.warn(`[AccountManager] saveDraft warning:`, err)
      }
      return false
    }
  }

  public async getAllDrafts(accountId: string): Promise<Record<string, DraftItem>> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const res = (await holder.client.call({
        _: 'messages.getAllDrafts',
      })) as any

      const drafts: Record<string, DraftItem> = {}
      const updates = Array.isArray(res?.updates)
        ? res.updates
        : res?._ === 'updates'
        ? res.updates
        : []
      for (const u of updates) {
        if (u?._ === 'updateDraftMessage' && u.draft && u.draft._ === 'draftMessage') {
          let peerId = ''
          if (u.peer?._ === 'peerUser') peerId = u.peer.userId.toString()
          else if (u.peer?._ === 'peerChat') peerId = `-${u.peer.chatId}`
          else if (u.peer?._ === 'peerChannel') peerId = `-${u.peer.channelId}`

          if (peerId && u.draft.message) {
            drafts[peerId] = {
              text: u.draft.message,
              date: u.draft.date ? u.draft.date * 1000 : undefined,
              replyToMsgId: u.draft.replyTo?.replyToMsgId || u.draft.replyToMsgId,
            }
          }
        }
      }
      return drafts
    } catch (err: any) {
      Logger.error(`[AccountManager] getAllDrafts error:`, err)
      return {}
    }
  }

  public async requestWebView(
    accountId: string,
    peerId: string,
    botId: string,
    url?: string,
    startParam?: string,
    fromBotMenu?: boolean
  ): Promise<{ url: string; queryId?: string }> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const inputPeer = await this.resolveInputPeer(accountId, peerId)
      const inputBot = await this.resolveInputPeer(accountId, botId)
      const inputBotUser: tl.TypeInputUser =
        inputBot._ === 'inputPeerUser'
          ? { _: 'inputUser', userId: inputBot.userId, accessHash: inputBot.accessHash }
          : { _: 'inputUserSelf' }

      const themeParams = {
        _: 'dataJSON' as const,
        data: JSON.stringify({
          bg_color: '#0F1117',
          text_color: '#FFFFFF',
          hint_color: '#7E8597',
          link_color: '#6366F1',
          button_color: '#6366F1',
          button_text_color: '#FFFFFF',
          secondary_bg_color: '#181B26',
        }),
      }

      const res: any = await holder.client.call({
        _: 'messages.requestWebView',
        peer: inputPeer,
        bot: inputBotUser,
        url: url || undefined,
        startParam: startParam || undefined,
        fromBotMenu: Boolean(fromBotMenu),
        platform: 'tdesktop',
        themeParams,
      })

      return {
        url: res.url,
        queryId: res.queryId ? res.queryId.toString() : undefined,
      }
    } catch (err: any) {
      Logger.error(`[AccountManager] requestWebView error:`, err)
      throw err
    }
  }

  public async getAdminLog(
    accountId: string,
    channelId: string,
    q = '',
    limit = 50,
    maxId?: string
  ): Promise<AdminLogResponse> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return { events: [], hasMore: false }

    try {
      const inputPeer = await this.resolveInputPeer(accountId, channelId)
      if (inputPeer._ !== 'inputPeerChannel') {
        return { events: [], hasMore: false }
      }

      const inputChannel: tl.TypeInputChannel = {
        _: 'inputChannel',
        channelId: inputPeer.channelId,
        accessHash: inputPeer.accessHash,
      }

      const res: any = await holder.client.call({
        _: 'channels.getAdminLog',
        channel: inputChannel,
        q: q || '',
        maxId: toLong(maxId),
        minId: Long.ZERO,
        limit: Math.min(100, Math.max(1, limit)),
        eventsFilter: undefined,
        admins: undefined,
      })

      if (!res || !Array.isArray(res.events)) {
        return { events: [], hasMore: false }
      }

      const usersMap = new Map<string, any>()
      if (Array.isArray(res.users)) {
        for (const u of res.users) {
          if (u?.id) usersMap.set(u.id.toString(), u)
        }
      }

      const events: AdminLogItem[] = []
      for (const ev of res.events) {
        if (!ev) continue
        const id = ev.id?.toString() || ''
        const date = Number(ev.date || 0)
        const userId = ev.userId?.toString() || ''
        const u = usersMap.get(userId)
        const userName = u ? formatEntityName(u) : `User #${userId}`
        const userAvatarUrl = u?.photo ? extractStrippedThumb(u.photo) : undefined

        let actionType: AdminLogActionType = 'other'
        let actionTitle = 'Admin action'
        let actionDescription: string | undefined = undefined
        let prevValue: string | undefined = undefined
        let newValue: string | undefined = undefined

        const act = ev.action
        if (act) {
          const actType = act._ || ''
          if (actType === 'channelAdminLogEventActionDeleteMessage') {
            actionType = 'delete_message'
            actionTitle = 'Deleted message'
            actionDescription = act.message?.message ? `"${act.message.message}"` : `Message #${act.message?.id || ''}`
          } else if (actType === 'channelAdminLogEventActionEditMessage') {
            actionType = 'edit_message'
            actionTitle = 'Edited message'
            prevValue = act.prevMessage?.message
            newValue = act.newMessage?.message
            actionDescription = `From: "${prevValue || ''}" To: "${newValue || ''}"`
          } else if (actType === 'channelAdminLogEventActionParticipantJoin') {
            actionType = 'join'
            actionTitle = 'Joined via invite link'
          } else if (actType === 'channelAdminLogEventActionParticipantLeave') {
            actionType = 'leave'
            actionTitle = 'Left group/channel'
          } else if (actType === 'channelAdminLogEventActionParticipantInvite') {
            actionType = 'invite'
            actionTitle = 'Invited member'
            const invitedUser = usersMap.get(act.participant?.userId?.toString())
            if (invitedUser) {
              actionDescription = `Invited ${formatEntityName(invitedUser)}`
            }
          } else if (actType === 'channelAdminLogEventActionParticipantToggleBan') {
            const isBanned = act.newParticipant?._ === 'channelParticipantBanned'
            actionType = isBanned ? 'ban' : 'unban'
            actionTitle = isBanned ? 'Banned / Restricted member' : 'Unbanned member'
            const targetUser = usersMap.get(
              act.prevParticipant?.peer?.userId?.toString() || act.newParticipant?.peer?.userId?.toString()
            )
            if (targetUser) {
              actionDescription = `Target: ${formatEntityName(targetUser)}`
            }
          } else if (actType === 'channelAdminLogEventActionParticipantToggleAdmin') {
            actionType = 'admin_change'
            actionTitle = 'Admin permissions changed'
            const targetUser = usersMap.get(
              act.prevParticipant?.userId?.toString() || act.newParticipant?.userId?.toString()
            )
            if (targetUser) {
              actionDescription = `Admin: ${formatEntityName(targetUser)}`
            }
          } else if (actType === 'channelAdminLogEventActionUpdatePinned') {
            actionType = 'pin_message'
            actionTitle = act.message ? 'Pinned message' : 'Unpinned message'
            if (act.message?.message) actionDescription = `"${act.message.message}"`
          } else if (actType === 'channelAdminLogEventActionChangeTitle') {
            actionType = 'change_info'
            actionTitle = 'Changed title'
            prevValue = act.prevValue
            newValue = act.newValue
            actionDescription = `From "${prevValue}" to "${newValue}"`
          } else if (actType === 'channelAdminLogEventActionChangeAbout') {
            actionType = 'change_info'
            actionTitle = 'Changed description'
            prevValue = act.prevValue
            newValue = act.newValue
          } else if (actType === 'channelAdminLogEventActionChangePhoto') {
            actionType = 'change_info'
            actionTitle = 'Changed group/channel photo'
          } else if (actType === 'channelAdminLogEventActionDefaultBannedRights') {
            actionType = 'admin_change'
            actionTitle = 'Changed default member permissions'
          } else {
            actionType = 'other'
            actionTitle = actType.replace(/^channelAdminLogEventAction/, '')
          }
        }

        events.push({
          id,
          date,
          userId,
          userName,
          userAvatarUrl,
          actionType,
          actionTitle,
          actionDescription,
          prevValue,
          newValue,
        })
      }

      return {
        events,
        hasMore: events.length >= limit,
      }
    } catch (err: any) {
      Logger.warn(`[AccountManager] getAdminLog error for ${channelId}:`, err)
      return { events: [], hasMore: false }
    }
  }

  public async getBusinessProfile(accountId: string): Promise<BusinessProfile> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return { links: [] }

    try {
      const fullRes: any = await holder.client.call({
        _: 'users.getFullUser',
        id: { _: 'inputUserSelf' },
      })

      const full = fullRes.fullUser
      let intro: BusinessIntro | undefined
      if (full?.businessIntro) {
        intro = {
          title: full.businessIntro.title || '',
          description: full.businessIntro.description || '',
        }
      }

      let location: BusinessLocation | undefined
      if (full?.businessLocation) {
        location = {
          address: full.businessLocation.address || '',
          lat: full.businessLocation.geoPoint?.lat,
          long: full.businessLocation.geoPoint?.long,
        }
      }

      let workHours: BusinessWorkHours | undefined
      if (full?.businessWorkHours) {
        workHours = {
          timezoneId: full.businessWorkHours.timezoneId || 'UTC',
          openNow: Boolean(full.businessWorkHours.openNow),
          weeklyOpen: Array.isArray(full.businessWorkHours.weeklyOpen)
            ? full.businessWorkHours.weeklyOpen.map((w: any) => ({
                startMinute: w.startMinute,
                endMinute: w.endMinute,
              }))
            : [],
        }
      }

      let links: BusinessChatLink[] = []
      try {
        const linksRes: any = await holder.client.call({
          _: 'account.getBusinessChatLinks',
        })
        if (linksRes && Array.isArray(linksRes.links)) {
          links = linksRes.links.map((l: any) => {
            let slug = ''
            if (typeof l.link === 'string') {
              const parts = l.link.split('/')
              slug = parts[parts.length - 1] || ''
            }
            return {
              link: l.link,
              message: l.message || '',
              title: l.title,
              views: l.views || 0,
              slug,
            }
          })
        }
      } catch (err) {
        Logger.warn('[AccountManager] getBusinessChatLinks error:', err)
      }

      return {
        intro,
        location,
        workHours,
        links,
      }
    } catch (err: any) {
      Logger.error('[AccountManager] getBusinessProfile error:', err)
      return { links: [] }
    }
  }

  public async updateBusinessIntro(
    accountId: string,
    intro: { title: string; description: string } | null
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false

    try {
      await holder.client.call({
        _: 'account.updateBusinessIntro',
        intro: intro
          ? {
              _: 'inputBusinessIntro',
              title: intro.title,
              description: intro.description,
            }
          : undefined,
      })
      return true
    } catch (err) {
      Logger.error('[AccountManager] updateBusinessIntro error:', err)
      return false
    }
  }

  public async updateBusinessWorkHours(
    accountId: string,
    workHours: BusinessWorkHours | null
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false

    try {
      await holder.client.call({
        _: 'account.updateBusinessWorkHours',
        businessWorkHours: workHours
          ? {
              _: 'businessWorkHours',
              timezoneId: workHours.timezoneId,
              weeklyOpen: workHours.weeklyOpen.map((w) => ({
                _: 'businessWeeklyOpen',
                startMinute: w.startMinute,
                endMinute: w.endMinute,
              })),
            }
          : undefined,
      })
      return true
    } catch (err) {
      Logger.error('[AccountManager] updateBusinessWorkHours error:', err)
      return false
    }
  }

  public async updateBusinessLocation(
    accountId: string,
    location: { address: string; lat?: number; long?: number } | null
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false

    try {
      await holder.client.call({
        _: 'account.updateBusinessLocation',
        address: location?.address,
        geoPoint:
          location?.lat !== undefined && location?.long !== undefined
            ? {
                _: 'inputGeoPoint',
                lat: location.lat,
                long: location.long,
              }
            : undefined,
      })
      return true
    } catch (err) {
      Logger.error('[AccountManager] updateBusinessLocation error:', err)
      return false
    }
  }

  public async createBusinessChatLink(
    accountId: string,
    link: { message: string; title?: string }
  ): Promise<BusinessChatLink> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const res: any = await holder.client.call({
        _: 'account.createBusinessChatLink',
        link: {
          _: 'inputBusinessChatLink',
          message: link.message,
          title: link.title || undefined,
        },
      })

      let slug = ''
      if (typeof res.link === 'string') {
        const parts = res.link.split('/')
        slug = parts[parts.length - 1] || ''
      }

      return {
        link: res.link,
        message: res.message || '',
        title: res.title,
        views: res.views || 0,
        slug,
      }
    } catch (err) {
      Logger.error('[AccountManager] createBusinessChatLink error:', err)
      throw err
    }
  }

  public async deleteBusinessChatLink(accountId: string, slug: string): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false

    try {
      await holder.client.call({
        _: 'account.deleteBusinessChatLink',
        slug,
      })
      return true
    } catch (err) {
      Logger.error('[AccountManager] deleteBusinessChatLink error:', err)
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
        .filter((f: any) => f._ === 'dialogFilter' || f._ === 'dialogFilterChatlist')
        .map((f: any) => {
          let folderTitle = ''
          if (typeof f.title === 'string') {
            folderTitle = f.title
          } else if (f.title && typeof f.title === 'object') {
            folderTitle = f.title.text || ''
          }
          return {
            id: f.id,
            title: folderTitle || 'Folder',
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
          }
        })
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

  public getActiveClient(): TelegramClient | null {
    for (const [, holder] of this.clients) {
      if (holder.client && holder.info.status === 'connected') {
        return holder.client
      }
    }
    return null
  }

  private setupEventListeners(accountId: string, client: TelegramClient): void {
    client.onNewMessage.add(async (msg: any) => {
      try {
        const chat = msg.chat as any
        const chatId = chat?.id?.toString() || ''
        if (chat?.photo?.small) {
          this.peerPhotos.set(`${accountId}_${chatId}`, chat.photo.small)
        }

        let mediaType: any = undefined
        let mediaFileName: string | undefined = undefined
        let mediaFileSize: number | undefined = undefined
        let mediaDuration: number | undefined = undefined
        let strippedThumb: string | undefined = undefined
        let isVoice = false
        let isRoundVideo = false
        let isSticker = false
        let voiceWaveform: number[] | undefined = undefined

        if (msg.raw?.media) {
          const rawM = msg.raw.media
          if (rawM._ === 'messageMediaPhoto') {
            mediaType = 'photo'
            strippedThumb = extractStrippedThumb(rawM.photo)
          } else if (rawM._ === 'messageMediaDocument') {
            const doc = rawM.document
            if (doc && doc._ === 'document') {
              mediaFileSize = Number(doc.size || 0)
              mediaType = 'document'
              strippedThumb = extractStrippedThumb(doc)
              if (doc.attributes) {
                for (const attr of doc.attributes) {
                  if (attr._ === 'documentAttributeFilename') mediaFileName = attr.fileName
                  if (attr._ === 'documentAttributeAudio') {
                    mediaDuration = attr.duration
                    if (attr.waveform) {
                      voiceWaveform = decodeMtprotoWaveform(attr.waveform)
                    }
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
          }
        }

        const entities = parseMtprotoEntities(msg.raw?.entities)

        let replyMarkup: { rows: InlineButton[][] } | undefined = undefined
        const rawMarkup = msg.raw?.replyMarkup || msg.raw?.reply_markup
        if ((rawMarkup?._ === 'replyInlineMarkup' || rawMarkup?._ === 'replyKeyboardMarkup') && Array.isArray(rawMarkup.rows)) {
          const rows: InlineButton[][] = []
          for (let rIdx = 0; rIdx < rawMarkup.rows.length; rIdx++) {
            const row = rawMarkup.rows[rIdx]
            const btnRow: InlineButton[] = []
            if (row?.buttons && Array.isArray(row.buttons)) {
              for (let cIdx = 0; cIdx < row.buttons.length; cIdx++) {
                const b = row.buttons[cIdx]
                if (b._ === 'keyboardButtonUrl') {
                  btnRow.push({ text: b.text, url: b.url })
                } else if (b._ === 'keyboardButtonCallback') {
                  const b64 = Buffer.from(b.data).toString('base64')
                  this.botButtonCache.set(`${chatId}_${msg.id}_${rIdx}_${cIdx}`, Buffer.from(b.data))
                  btnRow.push({ text: b.text, data: b64 })
                } else if (b._ === 'keyboardButtonWebView' || b._ === 'keyboardButtonSimpleWebView') {
                  btnRow.push({ text: b.text, url: b.url, webAppUrl: b.url, isMiniApp: true })
                } else if (b.text) {
                  btnRow.push({ text: b.text })
                }
              }
            }
            if (btnRow.length > 0) rows.push(btnRow)
          }
          if (rows.length > 0) replyMarkup = { rows }
        }

        let replyTo: ReplyInfo | undefined = undefined
        if (msg.raw?.replyTo?.replyToMsgId) {
          replyTo = {
            replyToMsgId: msg.raw.replyTo.replyToMsgId,
            text: msg.raw.replyTo.quoteText || '',
            senderName: 'Reply',
          }
        }

        const senderIdStr = msg.sender?.id?.toString()
        if (msg.sender?.photo && senderIdStr) {
          const senderThumb = extractStrippedThumb(msg.sender.photo)
          if (senderThumb) {
            this.thumbCache.set(`${accountId}_${senderIdStr}`, senderThumb)
          }
        }
        const senderAvatarUrl = senderIdStr
          ? this.avatarCache.get(`${accountId}_${senderIdStr}`) || this.thumbCache.get(`${accountId}_${senderIdStr}`) || extractStrippedThumb(msg.sender?.photo)
          : undefined

        const item: MessageItem = {
          id: msg.id,
          chatId,
          accountId,
          text: msg.text || '',
          date: msg.date ? Math.floor(msg.date.getTime() / 1000) : Math.floor(Date.now() / 1000),
          isOutgoing: msg.isOutgoing,
          senderName: msg.sender?.displayName || msg.sender?.title || msg.sender?.firstName || '',
          senderUsername: msg.sender?.username,
          senderId: senderIdStr,
          senderAvatarUrl,
          mediaType,
          mediaFileName,
          mediaFileSize,
          mediaDuration,
          strippedThumb,
          isVoice,
          voiceWaveform,
          isRoundVideo,
          isSticker,
          replyToMsgId: msg.raw?.replyTo?.replyToMsgId,
          replyTo,
          replyMarkup,
          entities,
        }
        const currTop = this.topMessageIds.get(`${accountId}_${chatId}`) || 0
        if (msg.id > currTop) this.topMessageIds.set(`${accountId}_${chatId}`, msg.id)
        this.store.recordMessage(accountId, chatId, item)
        this.onEventCallback?.('telegram:new-message', {
          accountId,
          chatId,
          message: item,
          chatInfo: chat
            ? {
                id: chatId,
                title: formatEntityName(chat, 'Chat'),
                isUser: chat.chatType === 'private' || chat.chatType === 'bot',
                isGroup: chat.chatType === 'group' || chat.chatType === 'supergroup',
                isChannel: chat.chatType === 'channel',
                isBroadcast: chat.chatType === 'channel',
                isBot: chat.chatType === 'bot',
              }
            : undefined,
        })
      } catch (e) {
        Logger.warn('[AccountManager] Error processing new message update:', e)
      }
    })

    client.onEditMessage.add(async (msg: any) => {
      try {
        const chatId = msg.chat?.id?.toString() || ''
        const editDate = msg.editDate
          ? Math.floor(msg.editDate.getTime() / 1000)
          : Math.floor(Date.now() / 1000)
        const entities = parseMtprotoEntities(msg.raw?.entities)

        const updated = this.store.recordMessageEdit(
          accountId,
          chatId,
          msg.id,
          msg.text || '',
          editDate,
          entities
        )

        const item: MessageItem = updated || {
          id: msg.id,
          chatId,
          accountId,
          text: msg.text || '',
          date: msg.date ? Math.floor(msg.date.getTime() / 1000) : Math.floor(Date.now() / 1000),
          editDate,
          isOutgoing: msg.isOutgoing,
          entities,
        }
        this.onEventCallback?.('telegram:message-edited', { accountId, chatId, message: item })
      } catch (e) {
        Logger.warn('[AccountManager] Error processing edit message update:', e)
      }
    })

    client.onDeleteMessage.add(async (update: any) => {
      try {
        const messageIds: number[] = update.messageIds || []
        if (messageIds.length === 0) return

        let chatId = ''
        if (update.channelId) {
          const chStr = update.channelId.toString()
          chatId = chStr.startsWith('-') ? chStr : `-100${chStr}`
        } else {
          chatId = this.store.findChatIdForMessageId(accountId, messageIds[0]) || ''
        }

        const keepDeleted = this.store.getConfig().keepDeletedMessagesLocally !== false
        const now = Math.floor(Date.now() / 1000)

        if (keepDeleted && chatId) {
          this.store.recordMessageDelete(accountId, chatId, messageIds)
        }

        this.onEventCallback?.('telegram:message-deleted', {
          accountId,
          chatId,
          messageIds,
          isDeletedLocally: keepDeleted,
          deletedAt: now,
        })
      } catch (e) {
        Logger.warn('[AccountManager] Error processing delete message update:', e)
      }
    })

    client.onRawUpdate.add((update: any) => {
      try {
        if (update._ === 'updateReadHistoryInbox' || update._ === 'updateReadChannelInbox') {
          const peerId = update.peer?.userId?.toString() || update.peer?.chatId?.toString() || (update.channelId ? `-${update.channelId}` : '')
          this.onEventCallback?.('telegram:read-history', {
            accountId,
            chatId: peerId,
            maxId: update.maxId,
            stillUnreadCount: update.stillUnreadCount,
          })
        }
      } catch (_) {}
    })
  }
}

