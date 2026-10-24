import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { app, BrowserWindow, dialog } from 'electron'
import { TelegramClient, MemoryStorage } from '@mtcute/node'
import { tl, Long, InputMedia } from '@mtcute/core'
import {
  getChatMembers as mtcuteGetChatMembers,
  addChatMembers as mtcuteAddChatMembers,
  kickChatMember as mtcuteKickChatMember,
  banChatMember as mtcuteBanChatMember,
  unbanChatMember as mtcuteUnbanChatMember,
  restrictChatMember as mtcuteRestrictChatMember,
  editAdminRights as mtcuteEditAdminRights,
  editChatMemberRank as mtcuteEditChatMemberRank,
  setChatTitle as mtcuteSetChatTitle,
  setChatDescription as mtcuteSetChatDescription,
  setSlowMode as mtcuteSetSlowMode,
  toggleJoinRequests as mtcuteToggleJoinRequests,
  getInviteLinkMembers as mtcuteGetInviteLinkMembers,
  hideJoinRequest as mtcuteHideJoinRequest,
  hideAllJoinRequests as mtcuteHideAllJoinRequests,
  setChatUsername as mtcuteSetChatUsername,
  setChatDefaultPermissions as mtcuteSetChatDefaultPermissions,
  editMessage as mtcuteEditMessage,
  pinMessage as mtcutePinMessage,
  unpinMessage as mtcuteUnpinMessage,
  setTyping as mtcuteSetTyping,
} from '@mtcute/core/methods.js'
import { writeStringSession } from '@mtcute/core/utils.js'
import { convertFromGramjsSession } from '@mtcute/convert'
import QRCode from 'qrcode'
import { SessionStore } from './sessionStore'
import { ProxyManager } from './proxyManager'
import { Logger } from './logger'
import { DeviceProfileManager } from './deviceProfileManager'
import { dispatchMtprotoRpc, ALL_MTPROTO_METHODS } from './mtprotoRegistry'
import { ContactsService } from './services/contactsService'
import { ChannelsService } from './services/channelsService'
import { BotsService } from './services/botsService'
import { PaymentsService } from './services/paymentsService'
import { AccountSecurityService } from './services/accountSecurityService'
import { MessagingService } from './services/messagingService'
import { SystemService } from './services/systemService'
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
  ForumTopicInput,
  ForumTopicMutationResult,
  ForumTopicCreateResult,
  ContactItem,
  CallLogItem,
  CallLogResult,
  CallDiscardReason,
  ChatStatsResult,
  ChatStatsPayload,
  StatsValuePair,
  ChatStatsTopPoster,
  ChatStatsTopAdmin,
  ChatStatsTopInviter,
  ScheduledMessageItem,
  StarGiftItem,
  ActiveSessionItem,
  TranslatedTextResult,
  CloudFolderItem,
  StickerSetItem,
  StickerItem,
  StoryItemPayload,
  PeerStoriesPayload,
  StoryMediaResult,
  SendStoryOptions,
  SendStoryResult,
  ActiveStoryPeer,
  ActiveStoriesResult,
  ChannelBoostStatus,
  TwoFactorStatus,
  MyFullProfile,
  EmojiStatusItem,
  EmojiStatusSource,
  EmojiStatusesResult,
  SetEmojiStatusOptions,
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
  ServiceActionType,
  ServiceActionData,
  RichMessagePayload,
  RichBlock,
  RichTableBlock,
  RichTableCell,
  RichTableRow,
  RichDetailsBlock,
  ChatMemberPayload,
  ChatMembersResult,
  ChatMembersQuery,
  ChatMemberFilter,
  AddChatMembersResult,
  ChatAdminRightsPayload,
  ChatRestrictionsPayload,
  ChatSettingsInput,
  ChatSettingsUpdateResult,
  ChatInviteLink,
  ChatInviteLinksResult,
  ChatInviteLinksQuery,
  ChatInviteLinkInput,
  ChatInviteLinkMutationResult,
  ChatJoinRequestItem,
  ChatJoinRequestsResult,
  ChatJoinRequestAction,
  ChatJoinRequestResolveResult,
  ChatJoinRequestBulkResolveResult,
  SendableTypingStatus,
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

  const targetLocation =
    doc && doc._ === 'document' && doc.id && doc.accessHash
      ? {
          _: 'inputDocumentFileLocation',
          id: doc.id,
          accessHash: doc.accessHash,
          fileReference: doc.fileReference || Buffer.alloc(0),
          thumbSize: '',
        }
      : doc

  await client.downloadToFile(destinationPath, targetLocation as any, {
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

export function extractRichText(rt: any): string {
  if (!rt) return ''
  if (typeof rt === 'string') return rt
  if (Array.isArray(rt)) return rt.map(extractRichText).join('')
  if (rt._ === 'textPlain' || rt.type === 'textPlain') return rt.text || ''
  if (rt._ === 'textBold' || rt.type === 'textBold') return extractRichText(rt.text)
  if (rt._ === 'textItalic' || rt.type === 'textItalic') return extractRichText(rt.text)
  if (rt._ === 'textUnderline' || rt.type === 'textUnderline') return extractRichText(rt.text)
  if (rt._ === 'textStrike' || rt.type === 'textStrike') return extractRichText(rt.text)
  if (rt._ === 'textFixed' || rt.type === 'textFixed') return extractRichText(rt.text)
  if (rt._ === 'textUrl' || rt.type === 'textUrl') return extractRichText(rt.text)
  if (rt._ === 'textConcat' || rt.type === 'textConcat') {
    return Array.isArray(rt.texts) ? rt.texts.map(extractRichText).join('') : ''
  }
  if (rt.text) return extractRichText(rt.text)
  return ''
}

export function parsePageBlock(b: any): RichBlock | null {
  if (!b) return null
  const type = b._ || b.type
  if (type === 'pageBlockTable') {
    const title = extractRichText(b.title)
    const rows: RichTableRow[] = []
    if (Array.isArray(b.rows)) {
      for (const r of b.rows) {
        const cells: RichTableCell[] = []
        if (Array.isArray(r.cells)) {
          for (const c of r.cells) {
            cells.push({
              text: extractRichText(c.text),
              isHeader: Boolean(c.header),
              align: c.align_center || c.alignCenter ? 'center' : (c.align_right || c.alignRight ? 'right' : 'left'),
              valign: c.val_top || c.valTop ? 'top' : (c.val_middle || c.valMiddle ? 'middle' : 'bottom'),
              colspan: c.colspan || 1,
              rowspan: c.rowspan || 1,
            })
          }
        }
        rows.push({ cells })
      }
    }
    return {
      type: 'table',
      title: title || undefined,
      rows,
      bordered: Boolean(b.bordered),
      striped: Boolean(b.striped),
    }
  }
  if (type === 'pageBlockDetails') {
    const title = extractRichText(b.title)
    const subBlocks: RichBlock[] = []
    if (Array.isArray(b.blocks)) {
      for (const sb of b.blocks) {
        const parsed = parsePageBlock(sb)
        if (parsed) subBlocks.push(parsed)
      }
    }
    return {
      type: 'details',
      title: title || 'Details',
      open: Boolean(b.open),
      blocks: subBlocks,
    }
  }
  if (type === 'pageBlockHeader') {
    return { type: 'header', text: extractRichText(b.text) }
  }
  if (type === 'pageBlockSubheader') {
    return { type: 'subheader', text: extractRichText(b.text) }
  }
  if (type === 'pageBlockParagraph') {
    return { type: 'paragraph', text: extractRichText(b.text) }
  }
  if (type === 'pageBlockDivider') {
    return { type: 'divider' }
  }
  if (type === 'pageBlockBlockquote' || type === 'pageBlockPullquote') {
    return {
      type: 'blockquote',
      text: extractRichText(b.text),
      caption: extractRichText(b.caption) || undefined,
    }
  }
  if (type === 'pageBlockList') {
    const items: string[] = []
    if (Array.isArray(b.items)) {
      for (const item of b.items) {
        items.push(extractRichText(item.text || item))
      }
    }
    return {
      type: 'list',
      ordered: Boolean(b.ordered),
      items,
    }
  }
  return null
}

export function extractRichMessagePayload(m: any): RichMessagePayload | undefined {
  if (!m) return undefined
  const rawBlocks =
    m.richMessage?.blocks ||
    m.rich_message?.blocks ||
    m.media?.webpage?.cachedPage?.blocks ||
    m.media?.webpage?.cached_page?.blocks ||
    m.media?.webPage?.cachedPage?.blocks ||
    (m as any).cachedPage?.blocks

  if (Array.isArray(rawBlocks) && rawBlocks.length > 0) {
    const blocks: RichBlock[] = []
    for (const rb of rawBlocks) {
      const parsed = parsePageBlock(rb)
      if (parsed) blocks.push(parsed)
    }
    if (blocks.length > 0) {
      return { blocks, rtl: true }
    }
  }
  return undefined
}

export function parseMarkdownTable(text: string): RichTableBlock | null {
  if (!text || !text.includes('|')) return null
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const tableLines = lines.filter((l) => l.startsWith('|') && l.endsWith('|'))
  if (tableLines.length < 2) return null

  const rows: RichTableRow[] = []
  let hasSeparator = false

  for (let i = 0; i < tableLines.length; i++) {
    const line = tableLines[i]
    if (/^\|(\s*:?-+:?\s*\|)+$/.test(line)) {
      hasSeparator = true
      continue
    }

    const rawCells = line.slice(1, -1).split('|')
    const isFirstRow = rows.length === 0
    const cells: RichTableCell[] = rawCells.map((c) => ({
      text: c.trim(),
      isHeader: isFirstRow && hasSeparator,
      align: 'center',
    }))
    rows.push({ cells })
  }

  if (hasSeparator && rows.length > 0) {
    rows[0].cells.forEach((c) => (c.isHeader = true))
  }

  if (rows.length >= 2) {
    return {
      type: 'table',
      rows,
      bordered: true,
      striped: true,
    }
  }
  return null
}

export function parseMessageAction(
  rawAction: any,
  fromId: any,
  usersMap?: Map<number, any>,
  chatsMap?: Map<number, any>,
  fallbackActorName?: string
): { text: string; actionType: ServiceActionType; actionData: ServiceActionData } {
  if (!rawAction) {
    return { text: '', actionType: 'unknown', actionData: {} }
  }

  const actType = rawAction._ || rawAction.type || ''
  const resolveUserName = (userId: any): string => {
    if (!userId) return 'User'
    const numId = typeof userId === 'number' ? userId : parseInt(String(userId), 10)
    if (usersMap && !isNaN(numId) && usersMap.has(numId)) {
      return formatEntityName(usersMap.get(numId))
    }
    return 'User'
  }

  const fromUserId =
    fromId?._ === 'peerUser'
      ? fromId.userId
      : fromId?.userId
      ? fromId.userId
      : typeof fromId === 'number'
      ? fromId
      : undefined
  const actorIdStr = fromUserId !== undefined ? String(fromUserId) : undefined
  const actorName = fallbackActorName || (fromUserId ? resolveUserName(fromUserId) : 'User')

  // 1. User left / removed
  if (
    actType === 'messageActionChatDeleteUser' ||
    actType === 'user_left' ||
    actType === 'user_removed'
  ) {
    const rawTargetId = rawAction.userId ?? rawAction.user_id ?? rawAction.user
    const targetIdStr = rawTargetId !== undefined ? String(rawTargetId) : undefined
    const isSelfLeft =
      actType === 'user_left' ||
      !targetIdStr ||
      !actorIdStr ||
      targetIdStr === actorIdStr

    if (isSelfLeft) {
      const name = fallbackActorName || (targetIdStr ? resolveUserName(targetIdStr) : actorName)
      return {
        text: `${name} left the group`,
        actionType: 'user_left',
        actionData: {
          actorName: name,
          actorId: targetIdStr || actorIdStr,
          targetName: name,
          targetId: targetIdStr || actorIdStr,
        },
      }
    } else {
      const targetName = resolveUserName(rawTargetId)
      return {
        text: `${actorName} removed ${targetName}`,
        actionType: 'user_removed',
        actionData: {
          actorName,
          actorId: actorIdStr,
          targetName,
          targetId: targetIdStr,
        },
      }
    }
  }

  // 2. User added / joined
  if (
    actType === 'messageActionChatAddUser' ||
    actType === 'users_added' ||
    actType === 'user_joined'
  ) {
    const rawUsers: any[] = Array.isArray(rawAction.users)
      ? rawAction.users
      : rawAction.user
      ? [rawAction.user]
      : []
    const userNames = rawUsers
      .map((u) => resolveUserName(u))
      .filter((n) => n && n !== 'User')
    const targetNames =
      userNames.length > 0 ? userNames.join(', ') : 'member'

    if (rawUsers.length === 1 && String(rawUsers[0]) === actorIdStr) {
      return {
        text: `${actorName} joined the group`,
        actionType: 'user_joined',
        actionData: { actorName, targetName: actorName, targetId: actorIdStr },
      }
    }
    return {
      text: `${actorName} added ${targetNames}`,
      actionType: 'users_added',
      actionData: { actorName, actorId: actorIdStr, targetName: targetNames },
    }
  }

  // 3. Joined via link
  if (actType === 'messageActionChatJoinedByLink' || actType === 'user_joined_link') {
    return {
      text: `${actorName} joined the group via invite link`,
      actionType: 'user_joined_link',
      actionData: { actorName, actorId: actorIdStr },
    }
  }

  // 4. Joined via request
  if (
    actType === 'messageActionChatJoinedByRequest' ||
    actType === 'user_joined_approved' ||
    actType === 'user_joined_request'
  ) {
    return {
      text: `${actorName} joined the group via request`,
      actionType: 'user_joined_request',
      actionData: { actorName, actorId: actorIdStr },
    }
  }

  // 5. Chat / Channel created
  if (actType === 'messageActionChatCreate' || actType === 'chat_created') {
    const title = rawAction.title || 'Group'
    return {
      text: `${actorName} created the group "${title}"`,
      actionType: 'chat_created',
      actionData: { actorName, actorId: actorIdStr, title },
    }
  }
  if (actType === 'messageActionChannelCreate' || actType === 'channel_created') {
    const title = rawAction.title || 'Channel'
    return {
      text: `${actorName} created the channel "${title}"`,
      actionType: 'channel_created',
      actionData: { actorName, actorId: actorIdStr, title },
    }
  }

  // 6. Title changed
  if (actType === 'messageActionChatEditTitle' || actType === 'title_changed') {
    const title = rawAction.title || ''
    return {
      text: `${actorName} changed group name to "${title}"`,
      actionType: 'title_changed',
      actionData: { actorName, actorId: actorIdStr, title },
    }
  }

  // 7. Photo changed
  if (actType === 'messageActionChatEditPhoto' || actType === 'photo_changed') {
    return {
      text: `${actorName} updated group photo`,
      actionType: 'photo_changed',
      actionData: { actorName, actorId: actorIdStr },
    }
  }

  // 8. Photo deleted
  if (actType === 'messageActionChatDeletePhoto' || actType === 'photo_deleted') {
    return {
      text: `${actorName} removed group photo`,
      actionType: 'photo_deleted',
      actionData: { actorName, actorId: actorIdStr },
    }
  }

  // 9. Message pinned
  if (actType === 'messageActionPinMessage' || actType === 'message_pinned') {
    return {
      text: `${actorName} pinned a message`,
      actionType: 'message_pinned',
      actionData: { actorName, actorId: actorIdStr },
    }
  }

  // 10. History cleared
  if (actType === 'messageActionHistoryClear' || actType === 'history_cleared') {
    return {
      text: 'Chat history was cleared',
      actionType: 'history_cleared',
      actionData: {},
    }
  }

  // 11. Contact joined Telegram
  if (actType === 'messageActionContactSignUp' || actType === 'contact_joined') {
    return {
      text: `${actorName} joined Telegram!`,
      actionType: 'contact_joined',
      actionData: { actorName, actorId: actorIdStr },
    }
  }

  // 12. TTL changed
  if (actType === 'messageActionSetMessagesTTL' || actType === 'ttl_changed') {
    const period = Number(rawAction.period || 0)
    return {
      text: `${actorName} set auto-delete timer`,
      actionType: 'ttl_changed',
      actionData: { actorName, actorId: actorIdStr, period },
    }
  }

  // 13. Group call
  if (
    actType === 'messageActionGroupCall' ||
    actType === 'group_call_started' ||
    actType === 'group_call_ended'
  ) {
    const duration = rawAction.duration ? Number(rawAction.duration) : undefined
    const isEnded = Boolean(duration) || actType === 'group_call_ended'
    return {
      text: isEnded
        ? duration
          ? `Voice chat ended (${duration}s)`
          : 'Voice chat ended'
        : `${actorName} started a voice chat`,
      actionType: isEnded ? 'group_call_ended' : 'group_call_started',
      actionData: { actorName, actorId: actorIdStr, duration },
    }
  }

  // 14. Forum topic created / edited
  if (actType === 'messageActionTopicCreate' || actType === 'topic_created') {
    const title = rawAction.title || ''
    return {
      text: `${actorName} created topic "${title}"`,
      actionType: 'topic_created',
      actionData: { actorName, actorId: actorIdStr, title },
    }
  }
  if (actType === 'messageActionTopicEdit' || actType === 'topic_edited') {
    const title = rawAction.title || ''
    return {
      text: `${actorName} edited topic "${title}"`,
      actionType: 'topic_edited',
      actionData: { actorName, actorId: actorIdStr, title },
    }
  }

  // 15. Custom or other action
  if (actType === 'messageActionCustomAction' || actType === 'custom') {
    const msgText = rawAction.message || rawAction.action || 'Action'
    return {
      text: msgText,
      actionType: 'custom',
      actionData: { actorName, title: msgText },
    }
  }

  return {
    text: `${actorName} performed an action`,
    actionType: 'unknown',
    actionData: { actorName, actorId: actorIdStr },
  }
}

export class AccountManager {
  private store: SessionStore
  private clients = new Map<string, ClientHolder>()
  private pendingAuthClients = new Map<
    string,
    { client: TelegramClient; phoneCodeHash: string; proxy?: ProxyConfig; profile?: any; is2faNeeded?: boolean }
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
  private peerBigPhotos = new Map<string, any>()
  private peerAccessHashes = new Map<string, Long>()
  private topMessageIds = new Map<string, number>()
  public readonly contactsService: ContactsService
  public readonly channelsService: ChannelsService
  public readonly botsService: BotsService
  public readonly paymentsService: PaymentsService
  public readonly securityService: AccountSecurityService
  public readonly messagingService: MessagingService
  public readonly systemService: SystemService

  constructor(store: SessionStore, onEvent?: (event: string, payload: any) => void) {
    this.store = store
    this.onEventCallback = onEvent
    this.contactsService = new ContactsService((accountId, peerId) => this.resolveInputPeer(accountId, peerId))
    this.channelsService = new ChannelsService((accountId, peerId) => this.resolveInputPeer(accountId, peerId))
    this.botsService = new BotsService((accountId, peerId) => this.resolveInputPeer(accountId, peerId))
    this.paymentsService = new PaymentsService((accountId, peerId) => this.resolveInputPeer(accountId, peerId))
    this.securityService = new AccountSecurityService((accountId, peerId) => this.resolveInputPeer(accountId, peerId))
    this.messagingService = new MessagingService((accountId, peerId) => this.resolveInputPeer(accountId, peerId))
    this.systemService = new SystemService((accountId, peerId) => this.resolveInputPeer(accountId, peerId))
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
        const accountId = me.id.toString()
        let avatarUrl = savedAcc.avatarUrl

        if (me.photo) {
          if (me.photo.small) this.peerPhotos.set(`${accountId}_${accountId}`, me.photo.small)
          if (me.photo.big) this.peerBigPhotos.set(`${accountId}_${accountId}`, me.photo.big)
          if (!avatarUrl) {
            if (me.photo.thumb) {
              avatarUrl = `data:image/jpeg;base64,${Buffer.from(me.photo.thumb).toString('base64')}`
            } else if ((me.raw?.photo as any)?.strippedThumb) {
              avatarUrl = strippedThumbToDataUrl((me.raw.photo as any).strippedThumb) || undefined
            }
          }
        }

        const updatedInfo: AccountInfo = {
          id: accountId,
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
          avatarUrl,
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

        // Proactively ensure profile photo is downloaded to disk in background
        if (me.photo || isBot) {
          this.getProfilePhoto(accountId, accountId).then((fullPhoto) => {
            if (fullPhoto && fullPhoto !== updatedInfo.avatarUrl) {
              updatedInfo.avatarUrl = fullPhoto
              const accs = this.store.getConfig().accounts.map((a) => (a.id === accountId ? { ...a, avatarUrl: fullPhoto } : a))
              this.store.updateConfig({ accounts: accs })
              this.onEventCallback?.('telegram:account-updated', { account: updatedInfo })
            }
          }).catch(() => {})
        }

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
    Logger.info(`[AccountManager] Starting phone auth for ${phone}, proxy=${proxy?.type || 'none'}`)
    
    // Clean up any existing pending auth for this phone
    const existing = this.pendingAuthClients.get(phone)
    if (existing) {
      try {
        await existing.client.disconnect()
      } catch (_) {}
      this.pendingAuthClients.delete(phone)
    }

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
      this.pendingAuthClients.set(phone, { client, phoneCodeHash, proxy, profile, is2faNeeded: false })
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
  ): Promise<AccountInfo | { need2fa: true; hint?: string }> {
    const pending = this.pendingAuthClients.get(phone)
    if (!pending) {
      throw new Error('No pending authentication found for this phone number.')
    }

    const { client, phoneCodeHash, proxy, profile } = pending
    const config = this.store.getConfig()

    try {
      if (pending.is2faNeeded) {
        if (!password) {
          let hint = ''
          try {
            const pwd = await client.call({ _: 'account.getPassword' })
            hint = pwd.hint || ''
          } catch (_) {}
          return { need2fa: true, hint }
        }
        await client.checkPassword(password)
      } else {
        await client.signIn({
          phone,
          phoneCodeHash,
          phoneCode: code,
        })
      }
    } catch (err: any) {
      const msg = err?.message || ''
      if (
        msg.includes('SESSION_PASSWORD_NEEDED') ||
        err.text === 'SESSION_PASSWORD_NEEDED' ||
        err?.code === 401
      ) {
        pending.is2faNeeded = true
        if (!password) {
          let hint = ''
          try {
            const pwd = await client.call({ _: 'account.getPassword' })
            hint = pwd.hint || ''
          } catch (_) {}
          return { need2fa: true, hint }
        }
        await client.checkPassword(password)
      } else {
        throw err
      }
    }

    const me: any = await client.getMe()
    const sessionString = await client.exportSession()
    const accountId = me.id.toString()

    let avatarUrl: string | undefined = undefined
    if (me.photo) {
      if (me.photo.small) this.peerPhotos.set(`${accountId}_${accountId}`, me.photo.small)
      if (me.photo.big) this.peerBigPhotos.set(`${accountId}_${accountId}`, me.photo.big)
      if (me.photo.thumb) {
        avatarUrl = `data:image/jpeg;base64,${Buffer.from(me.photo.thumb).toString('base64')}`
      } else if ((me.raw?.photo as any)?.strippedThumb) {
        avatarUrl = strippedThumbToDataUrl((me.raw.photo as any).strippedThumb) || undefined
      }
    }

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
      avatarUrl,
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

    if (me.photo) {
      this.getProfilePhoto(accountId, accountId).then((fullPhoto) => {
        if (fullPhoto && fullPhoto !== info.avatarUrl) {
          info.avatarUrl = fullPhoto
          const accs = this.store.getConfig().accounts.map((a) => (a.id === accountId ? { ...a, avatarUrl: fullPhoto } : a))
          this.store.updateConfig({ accounts: accs })
          this.onEventCallback?.('telegram:account-updated', { account: info })
        }
      }).catch(() => {})
    }

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

      let avatarUrl: string | undefined = undefined
      if (me.photo) {
        if (me.photo.small) this.peerPhotos.set(`${accountId}_${accountId}`, me.photo.small)
        if (me.photo.big) this.peerBigPhotos.set(`${accountId}_${accountId}`, me.photo.big)
        if (me.photo.thumb) {
          avatarUrl = `data:image/jpeg;base64,${Buffer.from(me.photo.thumb).toString('base64')}`
        } else if ((me.raw?.photo as any)?.strippedThumb) {
          avatarUrl = strippedThumbToDataUrl((me.raw.photo as any).strippedThumb) || undefined
        }
      }

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
        avatarUrl,
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

      // Proactively fetch and cache bot profile photo in background
      this.getProfilePhoto(accountId, accountId).then((fullPhoto) => {
        if (fullPhoto && fullPhoto !== info.avatarUrl) {
          info.avatarUrl = fullPhoto
          const accs = this.store.getConfig().accounts.map((a) => (a.id === accountId ? { ...a, avatarUrl: fullPhoto } : a))
          this.store.updateConfig({ accounts: accs })
          this.onEventCallback?.('telegram:account-updated', { account: info })
        }
      }).catch(() => {})

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

    let avatarUrl: string | undefined = undefined
    if (me.photo) {
      if (me.photo.small) this.peerPhotos.set(`${accountId}_${accountId}`, me.photo.small)
      if (me.photo.big) this.peerBigPhotos.set(`${accountId}_${accountId}`, me.photo.big)
      if (me.photo.thumb) {
        avatarUrl = `data:image/jpeg;base64,${Buffer.from(me.photo.thumb).toString('base64')}`
      } else if ((me.raw?.photo as any)?.strippedThumb) {
        avatarUrl = strippedThumbToDataUrl((me.raw.photo as any).strippedThumb) || undefined
      }
    }

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
      avatarUrl,
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

    if (me.photo) {
      this.getProfilePhoto(accountId, accountId).then((fullPhoto) => {
        if (fullPhoto && fullPhoto !== info.avatarUrl) {
          info.avatarUrl = fullPhoto
          const accs = this.store.getConfig().accounts.map((a) => (a.id === accountId ? { ...a, avatarUrl: fullPhoto } : a))
          this.store.updateConfig({ accounts: accs })
          this.onEventCallback?.('telegram:account-updated', { account: info })
        }
      }).catch(() => {})
    }
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
    if (s === 'self' || s === 'me' || (holder?.info && s === holder.info.id)) return { _: 'inputPeerSelf' }

    let normalized = s
    if (s.startsWith('-') && !s.startsWith('-100')) {
      const val = Math.abs(Number(s))
      if (val > 2000000000) {
        normalized = `-100${val}`
      }
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
    let cachedHash =
      this.peerAccessHashes.get(`${accountId}_${normalized}`) ||
      this.peerAccessHashes.get(`${accountId}_${s}`) ||
      this.peerAccessHashes.get(`${accountId}_-${bareId}`) ||
      this.peerAccessHashes.get(`${accountId}_${bareId}`)

    if (!cachedHash) {
      const cachedDialogs = this.store.loadDialogsCache(accountId)
      const found = cachedDialogs.find((d) => d.id === s || d.id === normalized || d.id.endsWith(bareId))
      if (found && found.accessHash) {
        try {
          cachedHash = Long.fromString(found.accessHash)
          this.peerAccessHashes.set(`${accountId}_${normalized}`, cachedHash)
          this.peerAccessHashes.set(`${accountId}_${s}`, cachedHash)
        } catch (_) {}
      }
    }

    // Basic group chat (inputPeerChat) does not require any accessHash
    if (normalized.startsWith('-') && !normalized.startsWith('-100')) {
      const chatId = Math.abs(Number(normalized))
      if (chatId <= 2000000000) {
        return { _: 'inputPeerChat', chatId }
      }
    }

    if (cachedHash) {
      if (normalized.startsWith('-100')) {
        const channelId = parseInt(normalized.slice(4), 10)
        return { _: 'inputPeerChannel', channelId, accessHash: cachedHash }
      } else if (normalized.startsWith('-')) {
        const chatId = Math.abs(Number(normalized))
        return { _: 'inputPeerChannel', channelId: chatId, accessHash: cachedHash }
      } else {
        const userId = parseInt(normalized, 10)
        return { _: 'inputPeerUser', userId, accessHash: cachedHash }
      }
    }

    // If still missing accessHash for channel or user, attempt fetching entity info from MTProto
    if (holder?.client) {
      if (normalized.startsWith('-100') || (normalized.startsWith('-') && Math.abs(Number(normalized)) > 2000000000)) {
        const channelId = normalized.startsWith('-100')
          ? parseInt(normalized.slice(4), 10)
          : Math.abs(Number(normalized))
        try {
          const res: any = await holder.client.call({
            _: 'channels.getChannels',
            id: [{ _: 'inputChannel', channelId, accessHash: Long.ZERO }],
          }).catch(() => null)
          const ch = res?.chats?.[0]
          if (ch?.accessHash) {
            this.peerAccessHashes.set(`${accountId}_${normalized}`, ch.accessHash)
            this.peerAccessHashes.set(`${accountId}_${s}`, ch.accessHash)
            return { _: 'inputPeerChannel', channelId, accessHash: ch.accessHash }
          }
        } catch (_) {}
      } else if (!normalized.startsWith('-')) {
        const userId = parseInt(normalized, 10)
        if (!isNaN(userId) && userId > 0) {
          try {
            const res: any = await holder.client.call({
              _: 'users.getUsers',
              id: [{ _: 'inputUser', userId, accessHash: Long.ZERO }],
            }).catch(() => null)
            const u = res?.[0]
            if (u?.accessHash) {
              this.peerAccessHashes.set(`${accountId}_${normalized}`, u.accessHash)
              this.peerAccessHashes.set(`${accountId}_${s}`, u.accessHash)
              return { _: 'inputPeerUser', userId, accessHash: u.accessHash }
            }
          } catch (_) {}
        }
      }
    }

    const raw = toRawPeer(normalized)
    return raw
  }

  private recordDialogLastMessage(accountId: string, chatId: string, msg: any): void {
    try {
      if (!accountId || !chatId || !msg || !msg.id) return
      const raw = msg.raw || msg
      let text = msg.text || raw.message || ''
      const date = msg.date ? Math.floor(msg.date.getTime() / 1000) : (raw.date || Math.floor(Date.now() / 1000))
      const isOutgoing = Boolean(msg.isOutgoing || raw.out)

      const isService = raw._ === 'messageService' || Boolean(msg.action)
      let actionType: ServiceActionType | undefined = undefined
      let actionData: ServiceActionData | undefined = undefined

      if (isService) {
        const actionObj = raw.action || msg.action
        if (actionObj) {
          const parsed = parseMessageAction(
            actionObj,
            raw.fromId,
            undefined,
            undefined,
            msg.sender?.displayName || msg.sender?.title || msg.sender?.firstName
          )
          text = parsed.text
          actionType = parsed.actionType
          actionData = parsed.actionData
        }
      }

      let replyMarkup: MessageItem['replyMarkup'] = undefined
      const rawMarkup = raw.replyMarkup || raw.reply_markup
      if (rawMarkup?._ === 'replyKeyboardHide') {
        replyMarkup = { rows: [], _: 'replyKeyboardHide' }
      } else if ((rawMarkup?._ === 'replyInlineMarkup' || rawMarkup?._ === 'replyKeyboardMarkup') && Array.isArray(rawMarkup.rows)) {
        const rows: InlineButton[][] = []
        for (let rIdx = 0; rIdx < rawMarkup.rows.length; rIdx++) {
          const row = rawMarkup.rows[rIdx]
          const btnRow: InlineButton[] = []
          if (row?.buttons && Array.isArray(row.buttons)) {
            for (let cIdx = 0; cIdx < row.buttons.length; cIdx++) {
              const b = row.buttons[cIdx]
              let btnStyle: 'primary' | 'danger' | 'success' | undefined = undefined
              const rawStyle = b.style || (b as any).theme || (b as any).color
              if (rawStyle) {
                const sName = typeof rawStyle === 'string' ? rawStyle : (rawStyle._ || rawStyle.type || '')
                if (/success|green/i.test(sName)) btnStyle = 'success'
                else if (/danger|red/i.test(sName)) btnStyle = 'danger'
                else if (/primary|blue/i.test(sName)) btnStyle = 'primary'
              }
              const iconCustomEmojiId = b.iconCustomEmojiId
                ? String(b.iconCustomEmojiId)
                : ((b as any).icon_custom_emoji_id ? String((b as any).icon_custom_emoji_id) : undefined)

              if (b._ === 'keyboardButtonRequestPhone') {
                btnRow.push({ text: b.text, type: 'request_phone', _: 'keyboardButtonRequestPhone', style: btnStyle, iconCustomEmojiId })
              } else if (b._ === 'keyboardButtonRequestGeoLocation') {
                btnRow.push({ text: b.text, type: 'request_location', _: 'keyboardButtonRequestGeoLocation', style: btnStyle, iconCustomEmojiId })
              } else if (b._ === 'keyboardButtonRequestPoll') {
                btnRow.push({ text: b.text, type: 'request_poll', _: 'keyboardButtonRequestPoll', style: btnStyle, iconCustomEmojiId })
              } else if (b._ === 'keyboardButtonUrl') {
                btnRow.push({ text: b.text, url: b.url, _: 'keyboardButtonUrl', style: btnStyle, iconCustomEmojiId })
              } else if (b._ === 'keyboardButtonCallback') {
                const b64 = Buffer.from(b.data).toString('base64')
                this.botButtonCache.set(`${chatId}_${msg.id}_${rIdx}_${cIdx}`, Buffer.from(b.data))
                btnRow.push({ text: b.text, data: b64, _: 'keyboardButtonCallback', style: btnStyle, iconCustomEmojiId })
              } else if (b._ === 'keyboardButtonWebView' || b._ === 'keyboardButtonSimpleWebView') {
                btnRow.push({ text: b.text, url: b.url, webAppUrl: b.url, isMiniApp: true, _: b._, style: btnStyle, iconCustomEmojiId })
              } else if (b.text) {
                btnRow.push({ text: b.text, _: b._ || 'keyboardButton', style: btnStyle, iconCustomEmojiId })
              }
            }
          }
          if (btnRow.length > 0) rows.push(btnRow)
        }
        if (rows.length > 0 || rawMarkup._ === 'replyKeyboardMarkup') {
          replyMarkup = {
            rows,
            _: rawMarkup._,
            resize: Boolean(rawMarkup.resize || rawMarkup.resize_keyboard),
            singleUse: Boolean(rawMarkup.single_use || rawMarkup.one_time_keyboard),
            selective: Boolean(rawMarkup.selective),
            persistent: Boolean(rawMarkup.persistent),
            placeholder: rawMarkup.placeholder,
          }
        }
      }

      const item: MessageItem = {
        id: msg.id,
        chatId,
        accountId,
        text,
        date,
        isOutgoing,
        replyMarkup,
        isService,
        actionType,
        actionData,
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
          const bareId = peerId.replace(/^-100/, '').replace(/^-/, '')
          this.peerAccessHashes.set(`${accountId}_${bareId}`, peer.accessHash)
          this.peerAccessHashes.set(`${accountId}_-${bareId}`, peer.accessHash)
          this.peerAccessHashes.set(`${accountId}_-100${bareId}`, peer.accessHash)
        }

        // Cache small and big photo locations for instant avatar download
        if (peer.photo?.small) {
          this.peerPhotos.set(`${accountId}_${peerId}`, peer.photo.small)
        }
        if (peer.photo?.big) {
          this.peerBigPhotos.set(`${accountId}_${peerId}`, peer.photo.big)
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
        const readInboxMaxId = (d.raw as any)?.readInboxMaxId || 0
        const readOutboxMaxId = (d.raw as any)?.readOutboxMaxId || 0
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
        let lastMessageId: number | undefined = undefined
        let lastMessageIsOutgoing = false
        let lastMessageRead = false
        let lastMessageMediaType: 'photo' | 'video' | 'document' | 'voice' | 'sticker' | 'round_video' | undefined = undefined
        let lastMessageThumb: string | undefined = undefined

        if (d.lastMessage) {
          lastMessageId = d.lastMessage.id
          lastMessageDate = d.lastMessage.date ? d.lastMessage.date.getTime() : 0
          lastMessageIsOutgoing = Boolean(d.lastMessage.isOutgoing || (d.lastMessage.raw as any)?.out)
          lastMessageRead = lastMessageIsOutgoing ? (d.lastMessage.id <= readOutboxMaxId) : true

          const rawMedia = (d.lastMessage.raw as any)?.media
          if (rawMedia) {
            if (rawMedia._ === 'messageMediaPhoto') {
              lastMessageMediaType = 'photo'
              lastMessageThumb = extractStrippedThumb(rawMedia.photo || rawMedia)
            } else if (rawMedia._ === 'messageMediaDocument') {
              const doc = rawMedia.document
              if (doc && doc._ === 'document') {
                lastMessageThumb = extractStrippedThumb(doc)
                if (doc.attributes) {
                  for (const attr of doc.attributes) {
                    if (attr._ === 'documentAttributeSticker') {
                      lastMessageMediaType = 'sticker'
                      if (attr.alt) {
                        lastMessageText = attr.alt
                      }
                    } else if (attr._ === 'documentAttributeVideo') {
                      lastMessageMediaType = attr.roundMessage ? 'round_video' : 'video'
                    } else if (attr._ === 'documentAttributeAudio') {
                      lastMessageMediaType = attr.voice ? 'voice' : 'document'
                    }
                  }
                }
                if (!lastMessageMediaType) lastMessageMediaType = 'document'
              }
            }
          }

          if (d.lastMessage.text) {
            lastMessageText = d.lastMessage.text
          } else if (!lastMessageText && lastMessageMediaType) {
            if (lastMessageMediaType === 'photo') lastMessageText = '[Photo]'
            else if (lastMessageMediaType === 'sticker') lastMessageText = '[Sticker]'
            else if (lastMessageMediaType === 'video') lastMessageText = '[Video]'
            else if (lastMessageMediaType === 'voice') lastMessageText = '[Voice message]'
            else if (lastMessageMediaType === 'round_video') lastMessageText = '[Video message]'
            else if (lastMessageMediaType === 'document') lastMessageText = '[File]'
          } else if (!lastMessageText) {
            const rawLast = (d.lastMessage as any).raw || d.lastMessage
            const act = (rawLast as any).action || (d.lastMessage as any).action
            if (act) {
              const parsed = parseMessageAction(
                act,
                (rawLast as any).fromId,
                undefined,
                undefined,
                (d.lastMessage as any).sender?.displayName ||
                  (d.lastMessage as any).sender?.title ||
                  (d.lastMessage as any).sender?.firstName
              )
              lastMessageText = parsed.text
            }
          }

          if (d.lastMessage.id) {
            this.topMessageIds.set(`${accountId}_${peerId}`, d.lastMessage.id)
            this.recordDialogLastMessage(accountId, peerId, d.lastMessage)
          }
        }

        // In Telegram, unread badge is strictly for incoming messages the current user hasn't read.
        // If the last message was sent by the current user, any server unread_count is peer's unread or desync.
        const isManuallyUnread = Boolean((d.raw as any)?.unreadMark)
        const unreadCount = isManuallyUnread
          ? Math.max(1, d.unreadCount || 1)
          : (lastMessageIsOutgoing ? 0 : (d.unreadCount || 0))

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
          readOutboxMaxId,
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
          lastMessageId,
          lastMessageIsOutgoing,
          lastMessageRead,
          lastMessageMediaType,
          lastMessageThumb,
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
          accessHash: peer.accessHash ? peer.accessHash.toString() : undefined,
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
    const cached = this.store.loadDialogsCache(accountId)
    for (const d of cached) {
      if (d.accessHash) {
        try {
          const hash = Long.fromString(d.accessHash)
          this.peerAccessHashes.set(`${accountId}_${d.id}`, hash)
          const bareId = d.id.replace(/^-100/, '').replace(/^-/, '')
          this.peerAccessHashes.set(`${accountId}_${bareId}`, hash)
          this.peerAccessHashes.set(`${accountId}_-${bareId}`, hash)
          this.peerAccessHashes.set(`${accountId}_-100${bareId}`, hash)
        } catch (_) {}
      }
    }
    return cached
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
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

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
      Logger.error(`[AccountManager] getContacts error for ${accountId}:`, err)
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
          if (u.photo?._ === 'userProfilePhoto' && u.photo.photoId) {
            const accessHash = u.accessHash || this.peerAccessHashes.get(`${accountId}_${u.id}`) || Long.ZERO
            const loc = {
              _: 'inputPeerPhotoFileLocation',
              peer: { _: 'inputPeerUser', userId: u.id, accessHash },
              photoId: u.photo.photoId,
              big: false,
            }
            this.peerPhotos.set(`${accountId}_${u.id}`, loc)
          }
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
              if (u.photo?._ === 'userProfilePhoto' && u.photo.photoId) {
                const accessHash = u.accessHash || this.peerAccessHashes.get(`${accountId}_${u.id}`) || Long.ZERO
                const loc = {
                  _: 'inputPeerPhotoFileLocation',
                  peer: { _: 'inputPeerUser', userId: u.id, accessHash },
                  photoId: u.photo.photoId,
                  big: false,
                }
                this.peerPhotos.set(`${accountId}_${u.id}`, loc)
              }
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
        let text = m.message || ''

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
        const isService = m._ === 'messageService'
        let actionType: ServiceActionType | undefined = undefined
        let actionData: ServiceActionData | undefined = undefined

        if (isService && m.action) {
          const parsed = parseMessageAction(m.action, m.fromId, users, chats, senderName)
          text = parsed.text
          actionType = parsed.actionType
          actionData = parsed.actionData
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

        let replyMarkup: MessageItem['replyMarkup'] = undefined
        const rawMarkup = m.replyMarkup || (m as any).reply_markup
        if (rawMarkup?._ === 'replyKeyboardHide') {
          replyMarkup = { rows: [], _: 'replyKeyboardHide' }
        } else if ((rawMarkup?._ === 'replyInlineMarkup' || rawMarkup?._ === 'replyKeyboardMarkup') && Array.isArray(rawMarkup.rows)) {
          const rows: InlineButton[][] = []
          for (let rIdx = 0; rIdx < rawMarkup.rows.length; rIdx++) {
            const row = rawMarkup.rows[rIdx]
            const btnRow: InlineButton[] = []
            if (row?.buttons && Array.isArray(row.buttons)) {
              for (let cIdx = 0; cIdx < row.buttons.length; cIdx++) {
                const b = row.buttons[cIdx]
                let btnStyle: 'primary' | 'danger' | 'success' | undefined = undefined
                const rawStyle = b.style || (b as any).theme || (b as any).color
                if (rawStyle) {
                  const sName = typeof rawStyle === 'string' ? rawStyle : (rawStyle._ || rawStyle.type || '')
                  if (/success|green/i.test(sName)) btnStyle = 'success'
                  else if (/danger|red/i.test(sName)) btnStyle = 'danger'
                  else if (/primary|blue/i.test(sName)) btnStyle = 'primary'
                }
                const iconCustomEmojiId = b.iconCustomEmojiId
                  ? String(b.iconCustomEmojiId)
                  : ((b as any).icon_custom_emoji_id ? String((b as any).icon_custom_emoji_id) : undefined)

                if (b._ === 'keyboardButtonRequestPhone') {
                  btnRow.push({ text: b.text, type: 'request_phone', _: 'keyboardButtonRequestPhone', style: btnStyle, iconCustomEmojiId })
                } else if (b._ === 'keyboardButtonRequestGeoLocation') {
                  btnRow.push({ text: b.text, type: 'request_location', _: 'keyboardButtonRequestGeoLocation', style: btnStyle, iconCustomEmojiId })
                } else if (b._ === 'keyboardButtonRequestPoll') {
                  btnRow.push({ text: b.text, type: 'request_poll', _: 'keyboardButtonRequestPoll', style: btnStyle, iconCustomEmojiId })
                } else if (b._ === 'keyboardButtonUrl') {
                  btnRow.push({ text: b.text, url: b.url, _: 'keyboardButtonUrl', style: btnStyle, iconCustomEmojiId })
                } else if (b._ === 'keyboardButtonCallback') {
                  const b64 = Buffer.from(b.data).toString('base64')
                  this.botButtonCache.set(`${chatId}_${id}_${rIdx}_${cIdx}`, Buffer.from(b.data))
                  btnRow.push({ text: b.text, data: b64, _: 'keyboardButtonCallback', style: btnStyle, iconCustomEmojiId })
                } else if (b._ === 'keyboardButtonWebView' || b._ === 'keyboardButtonSimpleWebView') {
                  btnRow.push({ text: b.text, url: b.url, webAppUrl: b.url, isMiniApp: true, _: b._, style: btnStyle, iconCustomEmojiId })
                } else if (b.text) {
                  btnRow.push({ text: b.text, _: b._ || 'keyboardButton', style: btnStyle, iconCustomEmojiId })
                }
              }
            }
            if (btnRow.length > 0) rows.push(btnRow)
          }
          if (rows.length > 0 || rawMarkup._ === 'replyKeyboardMarkup') {
            replyMarkup = {
              rows,
              _: rawMarkup._,
              resize: Boolean(rawMarkup.resize || rawMarkup.resize_keyboard),
              singleUse: Boolean(rawMarkup.single_use || rawMarkup.one_time_keyboard),
              selective: Boolean(rawMarkup.selective),
              persistent: Boolean(rawMarkup.persistent),
              placeholder: rawMarkup.placeholder,
            }
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

        const richMsgPayload = extractRichMessagePayload(m)
        let richMessage = richMsgPayload
        if (!richMessage && text) {
          const parsedTable = parseMarkdownTable(text)
          if (parsedTable) {
            richMessage = { blocks: [parsedTable], rtl: true }
          }
        }

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
          richMessage,
          entities,
          isService,
          actionType,
          actionData,
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

      // Check if we have photo location cached
      let photoLoc = isBig
        ? this.peerBigPhotos.get(`${accountId}_${peerId}`) || this.peerPhotos.get(`${accountId}_${peerId}`)
        : this.peerPhotos.get(`${accountId}_${peerId}`)

      if (photoLoc) {
        await holder.client.downloadToFile(avatarFile, photoLoc).catch(() => {})
      }

      if (!fs.existsSync(avatarFile) && isSelf) {
        // 1. Check getMe() for self user/bot photo
        const me: any = await holder.client.getMe().catch(() => null)
        if (me?.photo) {
          if (me.photo.small) this.peerPhotos.set(`${accountId}_${peerId}`, me.photo.small)
          if (me.photo.big) this.peerBigPhotos.set(`${accountId}_${peerId}`, me.photo.big)
          const targetLoc = isBig ? (me.photo.big || me.photo.small) : (me.photo.small || me.photo.big)
          if (targetLoc) {
            await holder.client.downloadToFile(avatarFile, targetLoc).catch(() => {})
          }
        }

        // 2. If not downloaded and NOT a bot, try photos.getUserPhotos (bots will error with BOT_METHOD_INVALID)
        if (!fs.existsSync(avatarFile) && !holder.info.isBot) {
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
        }

        // 3. If still not downloaded (works for bots and users), fetch full user profile photo
        if (!fs.existsSync(avatarFile)) {
          const fullRes: any = await holder.client.call({
            _: 'users.getFullUser',
            id: { _: 'inputUserSelf' },
          }).catch(() => null)
          const photo = fullRes?.fullUser?.profilePhoto || fullRes?.fullUser?.profile_photo || fullRes?.fullUser?.fallbackPhoto
          if (photo && (photo._ === 'photo' || (photo as any).sizes)) {
            await holder.client.downloadToFile(avatarFile, photo).catch(() => {})
          }
        }
      } else if (!fs.existsSync(avatarFile) && !isSelf) {
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
          if (!fs.existsSync(avatarFile)) {
            const fullRes: any = await holder.client.call({
              _: 'users.getFullUser',
              id: { _: 'inputUser', userId: inputPeer.userId, accessHash },
            }).catch(() => null)
            const photo = fullRes?.fullUser?.profilePhoto || fullRes?.fullUser?.profile_photo || fullRes?.fullUser?.fallbackPhoto
            if (photo && (photo._ === 'photo' || (photo as any).sizes)) {
              await holder.client.downloadToFile(avatarFile, photo).catch(() => {})
            }
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

      // Fast fallback to cached thumbnail if full photo is unavailable
      const thumb = this.thumbCache.get(`${accountId}_${peerId}`)
      if (thumb) {
        return thumb
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

        const inputPeer = await this.resolveInputPeer(accountId, chatId)
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
        let fileLocation: tl.TypeInputFileLocation | null = null
        let mediaFileSize = 0
        let isDocOrVideo = false
        let docObj: any = null

        if (msg.media._ === 'messageMediaPhoto' && msg.media.photo && (msg.media.photo as any)._ === 'photo') {
          const photo = msg.media.photo as any
          ext = '.jpg'
          let targetThumbSize = 'm'
          let targetFullSize = 'y'
          if (Array.isArray(photo.sizes) && photo.sizes.length > 0) {
            const thumbCandidate =
              photo.sizes.find((s: any) => s.type === 'm') ||
              photo.sizes.find((s: any) => s.type === 's') ||
              photo.sizes[0]
            if (thumbCandidate?.type) targetThumbSize = thumbCandidate.type

            const progressive = photo.sizes.filter(
              (s: any) => s._ === 'photoSize' || s._ === 'photoSizeProgressive'
            )
            if (progressive.length > 0) {
              const largest = progressive.reduce(
                (max: any, cur: any) =>
                  ((cur.size || (cur.w * cur.h) || 0) > (max.size || (max.w * max.h) || 0) ? cur : max),
                progressive[0]
              )
              if (largest?.type) targetFullSize = largest.type
            } else {
              const lastSize = photo.sizes[photo.sizes.length - 1]
              if (lastSize?.type) targetFullSize = lastSize.type
            }
          }

          fileLocation = {
            _: 'inputPhotoFileLocation',
            id: photo.id,
            accessHash: photo.accessHash,
            fileReference: photo.fileReference || Buffer.alloc(0),
            thumbSize: thumb ? targetThumbSize : targetFullSize,
          }
        } else if (msg.media._ === 'messageMediaDocument' && msg.media.document && (msg.media.document as any)._ === 'document') {
          const doc = msg.media.document as any
          docObj = doc
          mediaFileSize = Number(doc.size || 0)
          isDocOrVideo = true
          const mime = doc.mimeType || ''
          if (mime.includes('video/mp4') || mime.includes('mp4')) ext = '.mp4'
          else if (mime.includes('webm')) ext = '.webm'
          else if (mime.includes('webp')) ext = '.webp'
          else if (mime.includes('audio/ogg') || mime.includes('ogg')) ext = '.ogg'
          else if (mime.includes('audio/mpeg') || mime.includes('mp3')) ext = '.mp3'
          else if (mime.includes('image/jpeg')) ext = '.jpg'
          else if (mime.includes('image/png')) ext = '.png'
          else if (mime.includes('pdf')) ext = '.pdf'
          else {
            const fnAttr = doc.attributes?.find((a: any) => a._ === 'documentAttributeFilename')
            if (fnAttr?.fileName) {
              const parsedExt = path.extname(fnAttr.fileName)
              if (parsedExt) ext = parsedExt
            }
          }

          let docThumbSize = ''
          if (thumb && Array.isArray(doc.thumbs) && doc.thumbs.length > 0) {
            const t = doc.thumbs.find((x: any) => x.type === 'm') || doc.thumbs[0]
            if (t?.type) docThumbSize = t.type
          }

          fileLocation = {
            _: 'inputDocumentFileLocation',
            id: doc.id,
            accessHash: doc.accessHash,
            fileReference: doc.fileReference || Buffer.alloc(0),
            thumbSize: docThumbSize,
          }
        }

        if (!fileLocation) {
          const rawLoc = msg.media.photo || msg.media.document
          if (!rawLoc) return null
          fileLocation = rawLoc
        }
        if (!fileLocation) return null

        const cachedPath = path.join(this.mediaDir, `media_${accountId}_${chatId}_${messageId}${thumb ? '_thumb' : ''}${ext}`)

        if (!fs.existsSync(cachedPath) || fs.statSync(cachedPath).size === 0) {
          try {
            if (fs.existsSync(cachedPath)) fs.unlinkSync(cachedPath)
          } catch {}

          const abortController = new AbortController()
          this.activeMediaDownloads.set(cacheKey, {
            abort: () => abortController.abort(),
            isCancelled: () => abortController.signal.aborted,
          })

          const isTurboParallel = !thumb && isDocOrVideo && mediaFileSize > 10 * 1024 * 1024

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
            await client.downloadToFile(cachedPath, fileLocation as any, {
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

  public getMtprotoStatus(): {
    layer: number
    totalMethods: number
    totalNamespaces: number
    status: string
    services: Array<{ name: string; methods: number; desc: string }>
  } {
    return {
      layer: 229,
      totalMethods: 859,
      totalNamespaces: 28,
      status: '100% Full Parity (All 859 Layer 229+ Methods Connected)',
      services: [
        { name: 'MessagingService', methods: 294, desc: 'Core Messaging Engine, Stories & Media' },
        { name: 'SystemService', methods: 196, desc: 'System & Specialized Namespaces Suite' },
        { name: 'AccountSecurityService', methods: 158, desc: 'Security, Authentication & Account Suite' },
        { name: 'PaymentsService', methods: 76, desc: 'Payments, Invoices & Telegram Stars Service' },
        { name: 'ChannelsService', methods: 58, desc: 'Channels & Supergroups Administration Service' },
        { name: 'BotsService', methods: 40, desc: 'Bots, Games & WebApps Domain Service' },
        { name: 'ContactsService', methods: 37, desc: 'Contacts & Users Domain Service' },
      ],
    }
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

  public async startBot(
    accountId: string,
    botPeerId: string,
    startParam?: string
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const inputPeer = await this.resolveInputPeer(accountId, botPeerId)
      let inputUser: any
      if (inputPeer._ === 'inputPeerUser') {
        inputUser = { _: 'inputUser', userId: inputPeer.userId, accessHash: inputPeer.accessHash || Long.ZERO }
      } else {
        const cleanId = botPeerId.replace(/^-/, '')
        const cachedHash = this.peerAccessHashes.get(`${accountId}_${cleanId}`) || Long.ZERO
        inputUser = { _: 'inputUser', userId: toLong(cleanId), accessHash: cachedHash }
      }

      const randomId = toLong(Math.floor(Math.random() * 10000000000))
      const res: any = await holder.client.call({
        _: 'messages.startBot',
        bot: inputUser,
        peer: inputPeer,
        randomId,
        startParam: (startParam || '').trim(),
      })

      let msgId: number | undefined = undefined
      if (res && Array.isArray(res.updates)) {
        for (const u of res.updates) {
          if (u?.message?.id) {
            msgId = u.message.id
            break
          } else if (u?.id && typeof u.id === 'number') {
            msgId = u.id
          }
        }
      }

      return { success: true, messageId: msgId }
    } catch (err: any) {
      Logger.warn(`[AccountManager] messages.startBot failed for ${botPeerId}, trying fallback:`, err?.message || err)
      try {
        const fallbackText = startParam ? `/start ${startParam}` : '/start'
        const sent = await this.sendMessage(accountId, botPeerId, fallbackText)
        return { success: true, messageId: sent.id }
      } catch (fallbackErr: any) {
        return { success: false, error: err?.message || fallbackErr?.message || 'Failed to start bot' }
      }
    }
  }

  public async getBotInfo(accountId: string, botPeerId: string): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null

    try {
      const inputPeer = await this.resolveInputPeer(accountId, botPeerId)
      let inputUser: any
      if (inputPeer._ === 'inputPeerUser') {
        inputUser = { _: 'inputUser', userId: inputPeer.userId, accessHash: inputPeer.accessHash || Long.ZERO }
      } else {
        const cleanId = botPeerId.replace(/^-/, '')
        const cachedHash = this.peerAccessHashes.get(`${accountId}_${cleanId}`) || Long.ZERO
        inputUser = { _: 'inputUser', userId: toLong(cleanId), accessHash: cachedHash }
      }

      const res: any = await holder.client.call({
        _: 'bots.getBotInfo',
        bot: inputUser,
        langCode: '',
      })

      return res
    } catch (err) {
      Logger.warn(`[AccountManager] getBotInfo failed for ${botPeerId}:`, err)
      return null
    }
  }

  public async getBotMenuButton(accountId: string, botPeerId: string): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return { type: 'default' }

    try {
      const inputPeer = await this.resolveInputPeer(accountId, botPeerId)
      let inputUser: any
      if (inputPeer._ === 'inputPeerUser') {
        inputUser = { _: 'inputUser', userId: inputPeer.userId, accessHash: inputPeer.accessHash || Long.ZERO }
      } else {
        const cleanId = botPeerId.replace(/^-/, '')
        const cachedHash = this.peerAccessHashes.get(`${accountId}_${cleanId}`) || Long.ZERO
        inputUser = { _: 'inputUser', userId: toLong(cleanId), accessHash: cachedHash }
      }

      const res: any = await holder.client.call({
        _: 'bots.getBotMenuButton',
        userId: inputUser,
      })

      if (res?._ === 'botMenuButtonCommands') {
        return { type: 'commands', text: 'Commands' }
      } else if (res?._ === 'botMenuButton' && res.text) {
        return { type: 'web_app', text: res.text, url: res.url }
      } else {
        return { type: 'default' }
      }
    } catch (err) {
      Logger.warn(`[AccountManager] getBotMenuButton failed for ${botPeerId}:`, err)
      return { type: 'default' }
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
        let text = m.message || ''

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

        const isService = m._ === 'messageService'
        let actionType: ServiceActionType | undefined = undefined
        let actionData: ServiceActionData | undefined = undefined

        if (isService && m.action) {
          const parsed = parseMessageAction(m.action, m.fromId, users, chats, senderName)
          text = parsed.text
          actionType = parsed.actionType
          actionData = parsed.actionData
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
          isService,
          actionType,
          actionData,
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
        if (res.fullUser?.botInfo || u?.bot) {
          const bi = res.fullUser?.botInfo || {}
          let menuBtn: any = undefined
          const rawMb = bi.menuButton || bi.menu_button || res.fullUser?.botMenuButton
          if (rawMb) {
            if (rawMb._ === 'botMenuButton' && rawMb.text) {
              menuBtn = { type: 'web_app', text: rawMb.text, url: rawMb.url }
            } else if (rawMb._ === 'botMenuButtonCommands') {
              menuBtn = { type: 'commands', text: 'Commands' }
            } else {
              menuBtn = { type: 'default' }
            }
          } else if (u?.bot) {
            menuBtn = await this.getBotMenuButton(accountId, chatId).catch(() => ({ type: 'default' }))
          }

          let descPhotoUrl: string | undefined = undefined
          const rawPhoto = bi.descriptionPhoto || bi.description_photo
          if (rawPhoto) {
            const thumb = extractStrippedThumb(rawPhoto)
            if (thumb) descPhotoUrl = thumb
          }

          let descDocUrl: string | undefined = undefined
          const rawDoc = bi.descriptionDocument || bi.description_document
          if (rawDoc) {
            const thumb = extractStrippedThumb(rawDoc)
            if (thumb) descDocUrl = thumb
          }

          botInfo = {
            userId: chatId,
            description: bi.description || res.fullUser?.about,
            descriptionPhoto: descPhotoUrl ? { url: descPhotoUrl } : undefined,
            descriptionDocument: descDocUrl ? { url: descDocUrl } : undefined,
            commands: bi.commands?.map((cmd: any) => ({ command: cmd.command, description: cmd.description })) || [],
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
          isBlocked: !!res.fullUser?.blocked,
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
        const isSupergroup = !c?.broadcast
        const canManageCalls = isCreator || Boolean(adminRights?.manageCall)
        const canManageTopics = isCreator || Boolean(adminRights?.manageTopics)
        const canViewAdminLog = isCreator || Boolean(res.fullChat?.canViewAdminLog || adminRights)
        const canChangeInfo = isCreator || Boolean(adminRights?.changeInfo)
        const canBanMembers = isCreator || Boolean(adminRights?.banUsers)
        const canAddMembers = isCreator || Boolean(adminRights?.inviteUsers)
        const canPromoteMembers = isCreator || Boolean(adminRights?.addAdmins)
        const canManageMembers = isCreator || Boolean(
          adminRights?.banUsers || adminRights?.inviteUsers || adminRights?.addAdmins || adminRights?.other
        )
        const canPostMessages = c?.broadcast
          ? (isCreator || Boolean(adminRights?.postMessages))
          : !c?.defaultBannedRights?.sendMessages

        details = {
          id: chatId,
          title: c?.title || 'Channel',
          username: c?.username || undefined,
          about: res.fullChat?.about,
          membersCount: res.fullChat?.participantsCount,
          isChannel: !!c?.broadcast,
          isBroadcast: !!c?.broadcast,
          isGroup: isSupergroup,
          isSupergroup,
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
          canManageTopics,
          canViewAdminLog,
          canManageMembers,
          canPromoteMembers,
          canChangeInfo,
          canSetDescription: canChangeInfo,
          canBanMembers,
          canAddMembers,
          canSetSlowMode: isSupergroup && canChangeInfo,
          canManageJoinRequests: isCreator || Boolean(adminRights?.inviteUsers || adminRights?.banUsers),
          canEditPermissions: isCreator || Boolean(adminRights?.banUsers),
          defaultRestrictions: this.mapChatRestrictions(c?.defaultBannedRights),
          slowModeSeconds: isSupergroup ? Number(res.fullChat?.slowmodeSeconds || 0) : 0,
          joinRequestsEnabled: Boolean(res.fullChat?.joinRequest),
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
        const canManageTopics = false
        const canViewAdminLog = isCreator || Boolean(adminRights)
        const canChangeInfo = isCreator || Boolean(adminRights?.changeInfo)
        const canBanMembers = isCreator || Boolean(adminRights?.banUsers)
        const canAddMembers = isCreator || Boolean(adminRights?.inviteUsers)
        const canSendMessages = !c?.defaultBannedRights?.sendMessages

        details = {
          id: chatId,
          title: c?.title || 'Group',
          membersCount: res.fullChat?.participants?.participants?.length,
          isGroup: true,
          isChannel: false,
          isSupergroup: false,
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
          canManageTopics,
          canViewAdminLog,
          canManageMembers: canBanMembers || canAddMembers,
          canPromoteMembers: false,
          canChangeInfo,
          canSetDescription: false,
          canBanMembers,
          canAddMembers,
          canSetSlowMode: false,
          canManageJoinRequests: false,
          canEditPermissions: isCreator || Boolean(adminRights?.banUsers),
          defaultRestrictions: this.mapChatRestrictions(c?.defaultBannedRights),
          slowModeSeconds: 0,
          joinRequestsEnabled: false,
          canSendMessages,
          permissionsMatrix: {
            sendMessages: canSendMessages,
            sendMedia: !c?.defaultBannedRights?.sendMedia,
            sendStickers: !c?.defaultBannedRights?.sendStickers,
            sendPolls: !c?.defaultBannedRights?.sendPolls,
            embedLinks: !c?.defaultBannedRights?.embedLinks,
            inviteUsers: isCreator || Boolean(adminRights?.inviteUsers) || !c?.defaultBannedRights?.inviteUsers,
            pinMessages: isCreator || Boolean(adminRights?.pinMessages) || !c?.defaultBannedRights?.pinMessages,
            changeInfo: isCreator || Boolean(adminRights?.changeInfo) || !c?.defaultBannedRights?.changeInfo,
          },
        }
      }
    } catch (err: any) {
      Logger.warn(`[AccountManager] getChatDetails warning for ${chatId}:`, err?.message || err)
    }

    return details
  }

  private mapChatAdminRights(raw: any): ChatAdminRightsPayload | undefined {
    if (!raw) return undefined
    return {
      changeInfo: !!raw.changeInfo,
      postMessages: !!raw.postMessages,
      editMessages: !!raw.editMessages,
      deleteMessages: !!raw.deleteMessages,
      banUsers: !!raw.banUsers,
      inviteUsers: !!raw.inviteUsers,
      pinMessages: !!raw.pinMessages,
      addAdmins: !!raw.addAdmins,
      anonymous: !!raw.anonymous,
      manageCall: !!raw.manageCall,
      other: !!raw.other,
      manageTopics: !!raw.manageTopics,
      postStories: !!raw.postStories,
      editStories: !!raw.editStories,
      deleteStories: !!raw.deleteStories,
      manageDirectMessages: !!raw.manageDirectMessages,
      manageRanks: !!raw.manageRanks,
      manageLinkedPeers: !!raw.manageLinkedPeers,
      manageWelcomeMessages: !!raw.manageWelcomeMessages,
    }
  }

  private mapChatRestrictions(raw: any): ChatRestrictionsPayload | undefined {
    if (!raw) return undefined
    const untilDate = Number(raw.untilDate || 0)
    return {
      viewMessages: !!raw.viewMessages,
      sendMessages: !!raw.sendMessages,
      sendMedia: !!raw.sendMedia,
      sendStickers: !!raw.sendStickers,
      sendGifs: !!raw.sendGifs,
      sendGames: !!raw.sendGames,
      sendInline: !!raw.sendInline,
      embedLinks: !!raw.embedLinks,
      sendPolls: !!raw.sendPolls,
      changeInfo: !!raw.changeInfo,
      inviteUsers: !!raw.inviteUsers,
      pinMessages: !!raw.pinMessages,
      manageTopics: !!raw.manageTopics,
      sendPhotos: !!raw.sendPhotos,
      sendVideos: !!raw.sendVideos,
      sendRoundvideos: !!raw.sendRoundvideos,
      sendAudios: !!raw.sendAudios,
      sendVoices: !!raw.sendVoices,
      sendDocs: !!raw.sendDocs,
      sendPlain: !!raw.sendPlain,
      editRank: !!raw.editRank,
      sendReactions: !!raw.sendReactions,
      manageLinkedPeers: !!raw.manageLinkedPeers,
      untilDate: untilDate > 0 ? untilDate : undefined,
    }
  }

  private serializeChatMember(accountId: string, member: any): ChatMemberPayload {
    const user = member.user
    const id = String(user.id)
    const raw = (user as any).raw || {}

    if (raw.accessHash) {
      this.peerAccessHashes.set(`${accountId}_${id}`, raw.accessHash)
    }

    let avatarUrl: string | undefined = undefined
    try {
      const photo = user.photo
      if (photo?.small) {
        this.peerPhotos.set(`${accountId}_${id}`, photo.small)
      }
      const cacheKey = `${accountId}_${id}`
      if (this.avatarCache.has(cacheKey)) {
        avatarUrl = this.avatarCache.get(cacheKey)
      } else if (photo?.thumb) {
        avatarUrl = `data:image/jpeg;base64,${Buffer.from(photo.thumb).toString('base64')}`
        this.avatarCache.set(cacheKey, avatarUrl)
      }
    } catch (_) {}

    const joinedDate = member.joinedDate
    const subscriptionUntilDate = member.subscriptionUntilDate
    const permissions = member.permissions
    const restrictions = member.restrictions

    return {
      id,
      name: user.displayName || formatEntityName(raw) || id,
      username: user.username || undefined,
      phone: user.phoneNumber || undefined,
      isBot: !!user.isBot,
      isPremium: !!user.isPremium,
      isSelf: !!user.isSelf,
      isContact: !!user.isContact,
      isDeleted: !!user.isDeleted,
      status: (member.status || 'member') as ChatMemberPayload['status'],
      rank: member.title || undefined,
      joinedDate: joinedDate ? Math.floor(new Date(joinedDate).getTime() / 1000) : undefined,
      subscriptionUntilDate: subscriptionUntilDate
        ? Math.floor(new Date(subscriptionUntilDate).getTime() / 1000)
        : undefined,
      adminRights: permissions ? this.mapChatAdminRights(permissions) : undefined,
      restrictions: restrictions ? this.mapChatRestrictions(restrictions.raw) : undefined,
      avatarUrl,
    }
  }

  public async getChatMembers(
    accountId: string,
    chatId: string,
    options?: ChatMembersQuery
  ): Promise<ChatMembersResult> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const inputPeer = await this.resolveInputPeer(accountId, chatId)
    const limit = Math.min(200, Math.max(1, Number(options?.limit || 200)))
    const offset = Math.max(0, Number(options?.offset || 0))
    const filter: ChatMemberFilter = options?.filter || 'all'
    const query = (options?.query || '').trim()

    const result: any = await mtcuteGetChatMembers(holder.client, inputPeer, {
      query,
      offset,
      limit,
      type: filter,
    })

    const members: ChatMemberPayload[] = []
    for (const member of result) {
      try {
        members.push(this.serializeChatMember(accountId, member))
      } catch (err: any) {
        Logger.warn(`[AccountManager] Failed to serialize chat member:`, err?.message || err)
      }
    }

    return {
      members,
      total: Number(result.total ?? members.length),
    }
  }

  public async addChatMembers(
    accountId: string,
    chatId: string,
    userIds: string[]
  ): Promise<AddChatMembersResult> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const uniqueIds = Array.from(
      new Set((userIds || []).map((id) => String(id).trim()).filter(Boolean))
    )
    if (!uniqueIds.length) throw new Error('No users selected.')

    const users: tl.TypeInputPeer[] = []
    for (const userId of uniqueIds) {
      const userPeer = await this.resolveInputPeer(accountId, userId)
      if (userPeer._ !== 'inputPeerUser') {
        throw new Error(`User ${userId} was not found.`)
      }
      users.push(userPeer)
    }

    const chatPeer = await this.resolveInputPeer(accountId, chatId)
    const missing: any[] = await mtcuteAddChatMembers(holder.client, chatPeer, users, {
      forwardCount: 0,
    })

    return {
      invitedCount: Math.max(0, users.length - missing.length),
      missing: (missing || []).map((item: any) => ({
        userId: String(item.userId),
        premiumWouldAllowInvite: !!item.premiumWouldAllowInvite,
        premiumRequiredForPm: !!item.premiumRequiredForPm,
      })),
    }
  }

  private async resolveParticipantPeer(accountId: string, userId: string): Promise<tl.TypeInputPeer> {
    const peer = await this.resolveInputPeer(accountId, userId)
    if (peer._ !== 'inputPeerUser') throw new Error(`User ${userId} was not found.`)
    return peer
  }

  public async kickChatMember(accountId: string, chatId: string, userId: string): Promise<void> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)
    const chatPeer = await this.resolveInputPeer(accountId, chatId)
    const userPeer = await this.resolveParticipantPeer(accountId, userId)
    await mtcuteKickChatMember(holder.client, { chatId: chatPeer, userId: userPeer })
  }

  public async banChatMember(
    accountId: string,
    chatId: string,
    userId: string,
    untilDate?: number
  ): Promise<void> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)
    const chatPeer = await this.resolveInputPeer(accountId, chatId)
    const userPeer = await this.resolveParticipantPeer(accountId, userId)
    const until = untilDate && untilDate > 0 ? new Date(untilDate * 1000) : undefined
    await mtcuteBanChatMember(holder.client, { chatId: chatPeer, participantId: userPeer, untilDate: until })
  }

  public async unbanChatMember(accountId: string, chatId: string, userId: string): Promise<void> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)
    const chatPeer = await this.resolveInputPeer(accountId, chatId)
    const userPeer = await this.resolveParticipantPeer(accountId, userId)
    await mtcuteUnbanChatMember(holder.client, { chatId: chatPeer, participantId: userPeer })
  }

  public async restrictChatMember(
    accountId: string,
    chatId: string,
    userId: string,
    restrictions: ChatRestrictionsPayload
  ): Promise<void> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const rawRestrictions: Record<string, boolean> = {}
    for (const [key, value] of Object.entries(restrictions || {})) {
      if (key === 'untilDate' || key === '_') continue
      if (value !== undefined) rawRestrictions[key] = !!value
    }

    const chatPeer = await this.resolveInputPeer(accountId, chatId)
    const userPeer = await this.resolveParticipantPeer(accountId, userId)
    const until =
      restrictions?.untilDate && restrictions.untilDate > 0
        ? new Date(restrictions.untilDate * 1000)
        : undefined

    await mtcuteRestrictChatMember(holder.client, {
      chatId: chatPeer,
      userId: userPeer,
      restrictions: rawRestrictions,
      until,
    })
  }

  public async promoteChatMember(
    accountId: string,
    chatId: string,
    userId: string,
    rights: ChatAdminRightsPayload,
    rank?: string
  ): Promise<void> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const rawRights: Record<string, boolean> = {}
    for (const [key, value] of Object.entries(rights || {})) {
      if (key === '_') continue
      if (value !== undefined) rawRights[key] = !!value
    }

    const chatPeer = await this.resolveInputPeer(accountId, chatId)
    const userPeer = await this.resolveParticipantPeer(accountId, userId)
    await mtcuteEditAdminRights(holder.client, {
      chatId: chatPeer,
      userId: userPeer,
      rights: rawRights,
      rank: rank?.trim() || undefined,
    })
  }

  public async setChatMemberRank(
    accountId: string,
    chatId: string,
    userId: string,
    rank: string | null
  ): Promise<void> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)
    const chatPeer = await this.resolveInputPeer(accountId, chatId)
    const userPeer = await this.resolveParticipantPeer(accountId, userId)
    await mtcuteEditChatMemberRank(holder.client, {
      chatId: chatPeer,
      participantId: userPeer,
      rank: rank?.trim() || null,
    })
  }

  public async updateChatSettings(
    accountId: string,
    chatId: string,
    input: ChatSettingsInput
  ): Promise<ChatSettingsUpdateResult> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const details = await this.getChatDetails(accountId, chatId)
    const chatPeer = await this.resolveInputPeer(accountId, chatId)
    const errors: string[] = []
    const isChannelLike = details.isChannel || details.isSupergroup
    let effectiveUsername = (details.username || '').toLowerCase()

    if (input.title !== undefined) {
      const title = input.title.trim()
      if (!title) {
        errors.push('title: Title cannot be empty.')
      } else if (title.length > 255) {
        errors.push('title: Title is too long (max 255 characters).')
      } else if (title !== details.title) {
        try {
          await mtcuteSetChatTitle(holder.client, chatPeer, title)
        } catch (err: any) {
          errors.push(`title: ${err?.message || err}`)
        }
      }
    }

    if (input.description !== undefined) {
      if (!isChannelLike) {
        errors.push('description: Legacy groups do not support a description.')
      } else if (input.description.trim() !== (details.about || '').trim()) {
        try {
          await mtcuteSetChatDescription(holder.client, chatPeer, input.description.trim())
        } catch (err: any) {
          errors.push(`description: ${err?.message || err}`)
        }
      }
    }

    if (input.username !== undefined) {
      const rawUsername = String(input.username ?? '').trim()
      const normalized = rawUsername
        .replace(/^https?:\/\/(?:www\.)?t\.me\//i, '')
        .replace(/^@/, '')
        .trim()
        .toLowerCase()

      if (!isChannelLike) {
        errors.push('username: Public links are only available for channels and supergroups.')
      } else if (normalized && !/^[a-z][a-z0-9_]{4,31}$/.test(normalized)) {
        errors.push(
          'username: Username must be 5-32 characters, start with a letter, and contain only letters, numbers, and underscores.'
        )
      } else if (normalized !== (details.username || '').toLowerCase()) {
        try {
          await mtcuteSetChatUsername(holder.client, chatPeer, normalized || null)
          effectiveUsername = normalized
        } catch (err: any) {
          errors.push(`username: ${err?.message || err}`)
        }
      }
    }

    if (input.slowModeSeconds !== undefined) {
      const validValues = [0, 10, 30, 60, 300, 900, 3600]
      if (!isChannelLike) {
        errors.push('slowMode: Slow mode is only available in supergroups.')
      } else if (!details.isSupergroup) {
        errors.push('slowMode: Slow mode is not available in channels.')
      } else if (!validValues.includes(Number(input.slowModeSeconds))) {
        errors.push('slowMode: Invalid slow mode value.')
      } else if (Number(input.slowModeSeconds) !== Number(details.slowModeSeconds || 0)) {
        try {
          await mtcuteSetSlowMode(holder.client, chatPeer, Number(input.slowModeSeconds))
        } catch (err: any) {
          errors.push(`slowMode: ${err?.message || err}`)
        }
      }
    }

    if (input.joinRequestsEnabled !== undefined) {
      if (!isChannelLike) {
        errors.push('joinRequests: Join requests are not available in legacy groups.')
      } else if (Boolean(input.joinRequestsEnabled) && !effectiveUsername) {
        errors.push('joinRequests: Join requests require a public group. Set a public link first.')
      } else if (Boolean(input.joinRequestsEnabled) !== Boolean(details.joinRequestsEnabled)) {
        try {
          await mtcuteToggleJoinRequests(holder.client, chatPeer, Boolean(input.joinRequestsEnabled))
        } catch (err: any) {
          errors.push(`joinRequests: ${err?.message || err}`)
        }
      }
    }

    if (input.isForum !== undefined) {
      if (!details.isSupergroup || details.isChannel) {
        errors.push('forum: Forum mode is only available in supergroups.')
      } else if (!details.isCreator) {
        errors.push('forum: Only the group creator can change forum mode.')
      } else if (Boolean(input.isForum) !== Boolean(details.isForum)) {
        try {
          await this.setChatForumEnabled(accountId, chatId, Boolean(input.isForum))
        } catch (err: any) {
          errors.push(`forum: ${err?.message || err}`)
        }
      }
    }

    if (input.defaultRestrictions !== undefined) {
      if (!details.isGroup || details.isBroadcast) {
        errors.push('permissions: Default permissions are only available for groups.')
      } else if (!details.canEditPermissions) {
        errors.push('permissions: You do not have permission to change default permissions.')
      } else {
        try {
          const keys = [
            'viewMessages',
            'sendMessages',
            'sendMedia',
            'sendStickers',
            'sendGifs',
            'sendGames',
            'sendInline',
            'embedLinks',
            'sendPolls',
            'changeInfo',
            'inviteUsers',
            'pinMessages',
            'manageTopics',
            'sendPhotos',
            'sendVideos',
            'sendRoundvideos',
            'sendAudios',
            'sendVoices',
            'sendDocs',
            'sendPlain',
            'editRank',
            'sendReactions',
            'manageLinkedPeers',
          ] as const

          const current: Record<string, boolean> = {}
          const next: Record<string, boolean> = {}
          for (const key of keys) {
            current[key] = Boolean(details.defaultRestrictions?.[key])
            next[key] = current[key]
          }

          for (const key of keys) {
            const value = input.defaultRestrictions[key]
            if (value !== undefined) next[key] = Boolean(value)
          }

          // Telegram treats sendMedia/sendStickers as aggregate flags. Keep their
          // concrete sub-flags in sync so a later "allow" actually clears them.
          if (input.defaultRestrictions.sendMedia !== undefined) {
            const restricted = Boolean(input.defaultRestrictions.sendMedia)
            next.sendMedia = restricted
            for (const key of [
              'sendPhotos',
              'sendVideos',
              'sendRoundvideos',
              'sendAudios',
              'sendVoices',
              'sendDocs',
            ] as const) {
              next[key] = restricted
            }
          }
          if (input.defaultRestrictions.sendStickers !== undefined) {
            const restricted = Boolean(input.defaultRestrictions.sendStickers)
            next.sendStickers = restricted
            next.sendGifs = restricted
          }

          const changed = keys.some((key) => next[key] !== current[key])
          const merged: Record<string, boolean> = {}
          for (const key of keys) {
            if (next[key]) merged[key] = true
          }

          if (changed) {
            await mtcuteSetChatDefaultPermissions(holder.client, chatPeer, merged as any)
          }
        } catch (err: any) {
          errors.push(`permissions: ${err?.message || err}`)
        }
      }
    }

    return {
      details: await this.getChatDetails(accountId, chatId),
      errors,
    }
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
    const actualReplyTo = options?.replyToMsgId ?? replyToMsgId

    let msgId: number = Math.floor(Date.now() / 1000)
    let itemDate = Math.floor(Date.now() / 1000)

    try {
      // First attempt using mtcute's high-level sendText (automatically handles entities, drafts, schedule)
      const sentMsg: any = await holder.client.sendText(inputPeer as any, text, {
        replyTo: actualReplyTo,
        silent: options?.silent,
        schedule: options?.scheduleDate ? new Date(options.scheduleDate) : undefined,
      })
      if (sentMsg?.id) {
        msgId = sentMsg.id
        if (sentMsg.date) itemDate = Math.floor(sentMsg.date.getTime() / 1000)
      }
    } catch (sendErr: any) {
      Logger.warn(`[AccountManager] client.sendText fallback to messages.sendMessage for ${chatId}:`, sendErr?.message || sendErr)
      const randomId = toLong(Math.floor(Math.random() * 10000000000))
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

      if (res) {
        if (typeof res.id === 'number') {
          msgId = res.id
        } else if (Array.isArray(res.updates)) {
          const updMsg = res.updates.find((u: any) => u?.message?.id || u?.id)
          if (updMsg) {
            msgId = updMsg.message?.id || updMsg.id
          }
        }
      }
    }

    const item: MessageItem = {
      id: msgId,
      chatId,
      accountId,
      text,
      date: itemDate,
      isOutgoing: true,
      replyToMsgId: actualReplyTo,
    }
    const currTop = this.topMessageIds.get(`${accountId}_${chatId}`) || 0
    if (msgId > currTop) this.topMessageIds.set(`${accountId}_${chatId}`, msgId)
    this.store.recordMessage(accountId, chatId, item)
    return item
  }

  public async editMessage(
    accountId: string,
    chatId: string,
    messageId: number,
    text: string
  ): Promise<MessageItem> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const inputPeer = await this.resolveInputPeer(accountId, chatId)
    let edited: any = null

    try {
      edited = await holder.client.editMessage({
        chatId: inputPeer as any,
        message: messageId,
        text,
      })
    } catch (err: any) {
      Logger.warn(
        `[AccountManager] editMessage high-level failed for ${chatId}/${messageId}, using raw TL:`,
        err?.message || err
      )
      edited = await holder.client.call({
        _: 'messages.editMessage',
        peer: inputPeer,
        id: messageId,
        message: text,
      } as any)
    }

    const editDate = edited?.editDate
      ? Math.floor(edited.editDate.getTime() / 1000)
      : Math.floor(Date.now() / 1000)
    const entities = parseMtprotoEntities(edited?.raw?.entities)

    const stored = this.store.recordMessageEdit(
      accountId,
      chatId,
      messageId,
      edited?.text ?? text,
      editDate,
      entities
    )

    return stored || {
      id: messageId,
      chatId,
      accountId,
      text: edited?.text ?? text,
      date: edited?.date ? Math.floor(edited.date.getTime() / 1000) : Math.floor(Date.now() / 1000),
      editDate,
      isOutgoing: edited?.isOutgoing ?? true,
      entities,
    }
  }

  public async pinMessage(
    accountId: string,
    chatId: string,
    messageId: number,
    notify = true,
    bothSides = false
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const inputPeer = await this.resolveInputPeer(accountId, chatId)
    try {
      await holder.client.pinMessage({
        chatId: inputPeer as any,
        message: messageId,
        notify,
        bothSides,
      })
      return true
    } catch (err: any) {
      Logger.warn(`[AccountManager] pinMessage high-level failed for ${chatId}/${messageId}, using raw TL:`, err?.message || err)
      await holder.client.call({
        _: 'messages.updatePinnedMessage',
        peer: inputPeer,
        id: messageId,
        silent: !notify,
        pmOneside: !bothSides,
      } as any)
      return true
    }
  }

  public async unpinMessage(
    accountId: string,
    chatId: string,
    messageId: number
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const inputPeer = await this.resolveInputPeer(accountId, chatId)
    try {
      await holder.client.unpinMessage({
        chatId: inputPeer as any,
        message: messageId,
      })
      return true
    } catch (err: any) {
      Logger.warn(`[AccountManager] unpinMessage high-level failed for ${chatId}/${messageId}, using raw TL:`, err?.message || err)
      await holder.client.call({
        _: 'messages.updatePinnedMessage',
        peer: inputPeer,
        id: messageId,
        unpin: true,
      } as any)
      return true
    }
  }

  public async sendTyping(
    accountId: string,
    chatId: string,
    status: SendableTypingStatus = 'typing'
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false

    try {
      const inputPeer = await this.resolveInputPeer(accountId, chatId)
      await holder.client.sendTyping(inputPeer as any, status)
      return true
    } catch (err: any) {
      Logger.warn(`[AccountManager] sendTyping failed for ${chatId}:`, err?.message || err)
      return false
    }
  }

  public async exportChatInvite(accountId: string, chatId: string): Promise<string | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const inputPeer = await this.resolveInputPeer(accountId, chatId)
    try {
      const link = await holder.client.exportInviteLink(inputPeer as any)
      return link.link || null
    } catch (err: any) {
      Logger.warn(`[AccountManager] exportChatInvite high-level failed for ${chatId}, using raw TL:`, err?.message || err)
      const res: any = await holder.client.call({
        _: 'messages.exportChatInvite',
        peer: inputPeer,
      } as any)
      return res?.link || null
    }
  }

  private mapExportedInvite(raw: any): ChatInviteLink {
    return {
      link: raw.link,
      title: raw.title || undefined,
      adminId: raw.adminId != null ? String(raw.adminId) : undefined,
      date: Number(raw.date || 0),
      startDate: raw.startDate != null ? Number(raw.startDate) : undefined,
      expireDate: raw.expireDate != null ? Number(raw.expireDate) : undefined,
      usageLimit: raw.usageLimit != null ? Number(raw.usageLimit) : undefined,
      usage: raw.usage != null ? Number(raw.usage) : undefined,
      requested: raw.requested != null ? Number(raw.requested) : undefined,
      revoked: Boolean(raw.revoked),
      permanent: Boolean(raw.permanent),
      requestNeeded: Boolean(raw.requestNeeded),
    }
  }

  public async getChatInviteLinks(
    accountId: string,
    chatId: string,
    query?: ChatInviteLinksQuery
  ): Promise<ChatInviteLinksResult> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const inputPeer = await this.resolveInputPeer(accountId, chatId)
    const limit = Math.min(Math.max(Number(query?.limit || 100), 1), 100)
    const res: any = await holder.client.call({
      _: 'messages.getExportedChatInvites',
      peer: inputPeer,
      adminId: { _: 'inputUserSelf' },
      limit,
      revoked: query?.revokedOnly ? true : undefined,
    } as any)

    const links = (res?.invites || [])
      .filter((invite: any) => invite?._ === 'chatInviteExported')
      .map((invite: any) => this.mapExportedInvite(invite))

    return {
      links,
      total: Number(res?.count ?? links.length),
    }
  }

  public async createChatInviteLink(
    accountId: string,
    chatId: string,
    input: ChatInviteLinkInput
  ): Promise<ChatInviteLink> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const title = input.title?.trim() || undefined
    if (title && title.length > 32) {
      throw new Error('Invite link title is too long (max 32 characters).')
    }
    if (
      input.usageLimit != null &&
      (!Number.isFinite(Number(input.usageLimit)) || Number(input.usageLimit) < 0)
    ) {
      throw new Error('Usage limit must be a non-negative number.')
    }
    if (input.expireDate != null && Number(input.expireDate) <= Math.floor(Date.now() / 1000)) {
      throw new Error('Expiry date must be in the future.')
    }

    const inputPeer = await this.resolveInputPeer(accountId, chatId)
    const usageLimit = Number(input.usageLimit)
    const res: any = await holder.client.call({
      _: 'messages.exportChatInvite',
      peer: inputPeer,
      title,
      expireDate: input.expireDate ? Number(input.expireDate) : undefined,
      usageLimit: usageLimit > 0 ? usageLimit : undefined,
      requestNeeded: input.requestNeeded ? true : undefined,
    } as any)

    if (res?._ !== 'chatInviteExported') {
      throw new Error('Telegram returned an unexpected invite link response.')
    }
    return this.mapExportedInvite(res)
  }

  public async editChatInviteLink(
    accountId: string,
    chatId: string,
    link: string,
    input: ChatInviteLinkInput
  ): Promise<ChatInviteLinkMutationResult> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    if (input.title !== undefined && input.title.trim().length > 32) {
      throw new Error('Invite link title is too long (max 32 characters).')
    }
    if (
      input.usageLimit != null &&
      (!Number.isFinite(Number(input.usageLimit)) || Number(input.usageLimit) < 0)
    ) {
      throw new Error('Usage limit must be a non-negative number.')
    }
    if (input.expireDate != null && Number(input.expireDate) <= Math.floor(Date.now() / 1000)) {
      throw new Error('Expiry date must be in the future.')
    }

    const inputPeer = await this.resolveInputPeer(accountId, chatId)
    const res: any = await holder.client.call({
      _: 'messages.editExportedChatInvite',
      peer: inputPeer,
      link,
      title: input.title !== undefined ? input.title.trim() : undefined,
      expireDate: input.expireDate !== undefined ? Number(input.expireDate) || 0 : undefined,
      usageLimit: input.usageLimit !== undefined ? Number(input.usageLimit) || 0 : undefined,
      requestNeeded: input.requestNeeded !== undefined ? Boolean(input.requestNeeded) : undefined,
    } as any)

    if (res?._ === 'messages.exportedChatInviteReplaced') {
      return {
        link: res.invite ? this.mapExportedInvite(res.invite) : undefined,
        replacement: res.newInvite ? this.mapExportedInvite(res.newInvite) : undefined,
      }
    }
    if (res?._ === 'messages.exportedChatInvite') {
      return { link: res.invite ? this.mapExportedInvite(res.invite) : undefined }
    }
    if (res?._ === 'chatInviteExported') {
      return { link: this.mapExportedInvite(res) }
    }
    throw new Error('Telegram returned an unexpected invite link response.')
  }

  public async revokeChatInviteLink(
    accountId: string,
    chatId: string,
    link: string
  ): Promise<ChatInviteLinkMutationResult> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const inputPeer = await this.resolveInputPeer(accountId, chatId)
    const res: any = await holder.client.call({
      _: 'messages.editExportedChatInvite',
      peer: inputPeer,
      link,
      revoked: true,
    } as any)

    if (res?._ === 'messages.exportedChatInviteReplaced') {
      return {
        link: res.invite ? this.mapExportedInvite(res.invite) : undefined,
        replacement: res.newInvite ? this.mapExportedInvite(res.newInvite) : undefined,
      }
    }
    if (res?._ === 'messages.exportedChatInvite') {
      return { link: res.invite ? this.mapExportedInvite(res.invite) : undefined }
    }
    if (res?._ === 'chatInviteExported') {
      return { link: this.mapExportedInvite(res) }
    }
    return {}
  }

  public async deleteChatInviteLink(
    accountId: string,
    chatId: string,
    link: string
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const inputPeer = await this.resolveInputPeer(accountId, chatId)
    const res: any = await holder.client.call({
      _: 'messages.deleteExportedChatInvite',
      peer: inputPeer,
      link,
    } as any)
    return Boolean(res)
  }

  private serializeJoinRequestItem(accountId: string, member: any): ChatJoinRequestItem {
    const user = member.user
    const id = String(user.id)
    const raw = (user as any).raw || {}

    if (raw.accessHash) {
      this.peerAccessHashes.set(`${accountId}_${id}`, raw.accessHash)
    }

    let avatarUrl: string | undefined = undefined
    try {
      const photo = user.photo
      if (photo?.small) {
        this.peerPhotos.set(`${accountId}_${id}`, photo.small)
      }
      const cacheKey = `${accountId}_${id}`
      if (this.avatarCache.has(cacheKey)) {
        avatarUrl = this.avatarCache.get(cacheKey)
      } else if (photo?.thumb) {
        avatarUrl = `data:image/jpeg;base64,${Buffer.from(photo.thumb).toString('base64')}`
        this.avatarCache.set(cacheKey, avatarUrl)
      }
    } catch (_) {}

    const dateUnix =
      member.date instanceof Date
        ? Math.floor(member.date.getTime() / 1000)
        : Number(member.date) || Math.floor(Date.now() / 1000)

    return {
      userId: id,
      name: user.displayName || (typeof user.firstName === 'string' ? `${user.firstName} ${user.lastName || ''}`.trim() : id),
      username: user.username || undefined,
      bio: member.bio || undefined,
      date: dateUnix,
      isBot: Boolean(user.isBot),
      isPremium: Boolean(user.isPremium),
      avatarUrl,
    }
  }

  public async getChatJoinRequests(
    accountId: string,
    chatId: string,
    link?: string,
    query?: { query?: string; limit?: number; offsetDate?: number }
  ): Promise<ChatJoinRequestsResult> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const inputPeer = await this.resolveInputPeer(accountId, chatId)
    const limit = Math.min(Math.max(Number(query?.limit || 50), 1), 100)

    const result: any = await mtcuteGetInviteLinkMembers(holder.client, inputPeer, {
      link: link || undefined,
      requested: true,
      limit,
      requestedSearch: query?.query?.trim() || undefined,
      offsetDate: query?.offsetDate ? new Date(query.offsetDate * 1000) : undefined,
    })

    const requests: ChatJoinRequestItem[] = []
    for (const member of result) {
      try {
        requests.push(this.serializeJoinRequestItem(accountId, member))
      } catch (err: any) {
        Logger.warn('[AccountManager] Failed to serialize join request:', err?.message || err)
      }
    }

    return {
      requests,
      total: Number(result.total ?? requests.length),
    }
  }

  public async hideChatJoinRequest(
    accountId: string,
    chatId: string,
    userId: string,
    action: ChatJoinRequestAction
  ): Promise<ChatJoinRequestResolveResult> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const chatPeer = await this.resolveInputPeer(accountId, chatId)
    const userPeer = await this.resolveInputPeer(accountId, userId)

    await mtcuteHideJoinRequest(holder.client, {
      chatId: chatPeer,
      user: userPeer,
      action,
    })

    return {
      userId,
      action,
    }
  }

  public async hideAllChatJoinRequests(
    accountId: string,
    chatId: string,
    action: ChatJoinRequestAction,
    link?: string
  ): Promise<ChatJoinRequestBulkResolveResult> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const chatPeer = await this.resolveInputPeer(accountId, chatId)

    const res: any = await mtcuteHideAllJoinRequests(holder.client, {
      chatId: chatPeer,
      action,
      link: link || undefined,
    })

    return {
      action,
      count: Number(res?.count ?? 0),
    }
  }

  public async joinChatInvite(
    accountId: string,
    inviteLink: string
  ): Promise<{ status: 'ok' | 'request_sent' | 'webview'; chatId?: string; title?: string }> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const normalizedLink = inviteLink.trim()
    const inviteMatch = normalizedLink.match(
      /^(?:https?:\/\/)?(?:www\.)?t(?:elegram)?\.(?:org|me|dog)\/(?:joinchat\/|\+)([\w-]+)/i
    )
    const inviteHash = inviteMatch?.[1]
    const canonicalLink = inviteHash ? `https://t.me/+${inviteHash}` : normalizedLink

    const toResult = (chat: any) => ({
      status: 'ok' as const,
      chatId: chat?.id != null ? String(chat.id) : undefined,
      title: chat?.title || chat?.displayName || chat?.name,
    })

    // `messages.importChatInvite` throws USER_ALREADY_PARTICIPANT for chats we
    // are already in. Detect that up-front and return the existing chat instead.
    if (inviteHash) {
      try {
        const invite: any = await holder.client.call({
          _: 'messages.checkChatInvite',
          hash: inviteHash,
        } as any)
        if (invite?._ === 'chatInviteAlready') {
          try {
            const chat: any = await holder.client.getChat(canonicalLink as any)
            return toResult(chat)
          } catch {
            return toResult(invite.chat)
          }
        }
      } catch (err: any) {
        // Expired/invalid links should surface the canonical error from joinChat.
        Logger.warn(`[AccountManager] checkChatInvite failed for ${inviteHash}:`, err?.message || err)
      }
    }

    try {
      const result = await holder.client.joinChat(canonicalLink as any)
      if (result.status === 'ok') {
        return toResult((result as any).chat)
      }
      if (result.status === 'request_sent') return { status: 'request_sent' }
      return { status: 'webview' }
    } catch (err: any) {
      // Race between the pre-check and the join: resolve the chat and return it.
      if (inviteHash && /USER_ALREADY_PARTICIPANT/.test(String(err?.message || ''))) {
        try {
          const chat: any = await holder.client.getChat(canonicalLink as any)
          return toResult(chat)
        } catch (resolveErr: any) {
          Logger.warn(
            `[AccountManager] failed to resolve already-joined invite ${inviteHash}:`,
            resolveErr?.message || resolveErr
          )
        }
      }
      throw err
    }
  }

  public async blockUser(accountId: string, userId: string, blocked: boolean): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const inputPeer = await this.resolveInputPeer(accountId, userId)
    await holder.client.call({
      _: blocked ? 'contacts.block' : 'contacts.unblock',
      id: inputPeer,
    } as any)
    return true
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

    if (options?.isVoice) {
      // Ensure voice notes are cached in mediaDir before temporary file cleanup
      const cacheKey = `voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const destPath = path.join(this.mediaDir, `${cacheKey}.ogg`)
      try {
        await fs.promises.copyFile(filePath, destPath)
      } catch (e) {
        Logger.warn('[AccountManager] Failed to cache voice note to mediaDir:', e)
      }
    }

    // mtcute treats every plain string as a Telegram file ID. Local paths must
    // be prefixed with `file:` so they are uploaded from disk instead.
    const mediaFile = /^(file:|https?:\/\/)/.test(filePath) ? filePath : `file:${filePath}`
    const media: any = {
      type: options?.isVoice ? 'voice' : options?.forceDocument ? 'document' : 'auto',
      file: mediaFile,
    }
    if (options?.isVoice) {
      media.duration = options.duration ?? 0
      // Force the container MIME so mtcute does not sniff a WebM fallback and
      // Telegram keeps the upload classified as a voice note (DocumentAttributeAudio voice flag parity).
      media.fileMime = 'audio/ogg'
      media.fileName = path.basename(filePath)
    }

    const uploaded = await holder.client.sendMedia(targetPeer as any, media, {
      caption: options?.caption,
      replyTo: options?.replyToMsgId,
      silent: options?.silent,
      schedule: options?.scheduleDate ? Math.floor(options.scheduleDate / 1000) : undefined,
      workers: 4,
    } as any)

    let mediaFileSize: number | undefined
    try {
      mediaFileSize = (await fs.promises.stat(filePath)).size
    } catch {
      mediaFileSize = undefined
    }

    return {
      id: uploaded.id,
      chatId,
      accountId,
      text: options?.caption || '',
      date: Math.floor(Date.now() / 1000),
      isOutgoing: true,
      mediaType: options?.isVoice ? 'voice' : options?.forceDocument ? 'document' : 'photo',
      isVoice: options?.isVoice,
      mediaFileName: path.basename(filePath),
      mediaFileSize,
      mediaDuration: options?.duration,
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

      // Immediately update local dialogs cache so that next launch/render has zero unread
      try {
        const cached = this.store.loadDialogsCache(accountId)
        if (cached && cached.length > 0) {
          let changed = false
          const next = cached.map((d) => {
            if (d.id === chatId && (d.unreadCount || 0) > 0) {
              changed = true
              return { ...d, unreadCount: 0, readInboxMaxId: targetMaxId }
            }
            return d
          })
          if (changed) {
            this.store.saveDialogsCache(accountId, next)
          }
        }
      } catch (_) {}
    } catch (err: any) {
      Logger.warn(`[AccountManager] markAsRead warning for ${chatId}:`, err?.message || err)
    }
  }


  public async getForumTopics(accountId: string, chatId: string): Promise<ForumTopicItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    try {
      const inputPeer = await this.resolveInputPeer(accountId, chatId)
      if (inputPeer._ !== 'inputPeerChannel') return []

      const res: any = await holder.client.call({
        _: 'messages.getForumTopics',
        peer: inputPeer,
        offsetDate: 0,
        offsetId: 0,
        offsetTopic: 0,
        limit: 100,
      })

      return (res.topics || [])
        .filter((t: any) => t && t._ !== 'forumTopicDeleted')
        .map((t: any) => ({
          id: Number(t.id),
          title: t.title || (Number(t.id) === 1 ? 'General' : `Topic ${t.id}`),
          iconColor: t.iconColor ?? undefined,
          iconEmojiId: t.iconEmojiId && !t.iconEmojiId.isZero?.() ? String(t.iconEmojiId) : undefined,
          topMessageId: Number(t.topMessage || t.id) || undefined,
          readInboxMaxId: t.readInboxMaxId ? Number(t.readInboxMaxId) : undefined,
          unreadCount: Number(t.unreadCount || 0),
          isClosed: !!t.closed,
          isHidden: !!t.hidden,
          isPinned: !!t.pinned,
          date: t.date,
        }))
    } catch (_) {
      return []
    }
  }

  public async setChatForumEnabled(
    accountId: string,
    chatId: string,
    enabled: boolean
  ): Promise<ChatDetails> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const inputPeer = await this.resolveInputPeer(accountId, chatId)
    if (inputPeer._ !== 'inputPeerChannel') {
      throw new Error('Forum mode is only available in supergroups.')
    }

    await holder.client.call({
      _: 'channels.toggleForum',
      channel: {
        _: 'inputChannel',
        channelId: inputPeer.channelId,
        accessHash: inputPeer.accessHash,
      },
      enabled,
      tabs: false,
    })

    return this.getChatDetails(accountId, chatId)
  }

  private async resolveForumPeer(accountId: string, chatId: string) {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)

    const inputPeer = await this.resolveInputPeer(accountId, chatId)
    if (inputPeer._ !== 'inputPeerChannel') {
      throw new Error('Forum topics are only available in supergroups.')
    }

    return { holder, inputPeer }
  }

  /**
   * Telegram can briefly return stale forum topic metadata immediately after a
   * mutation (the mutation response and a subsequent getForumTopics request may
   * be served by different replicas). Poll until the requested change is
   * visible, then return the refreshed list.
   */
  private async getForumTopicsUntil(
    accountId: string,
    chatId: string,
    predicate: (topics: ForumTopicItem[]) => boolean,
    attempts = 6,
    delayMs = 250
  ): Promise<ForumTopicItem[]> {
    let topics = await this.getForumTopics(accountId, chatId)
    for (let attempt = 0; attempt < attempts; attempt++) {
      if (predicate(topics)) return topics
      await new Promise((resolve) => setTimeout(resolve, delayMs))
      topics = await this.getForumTopics(accountId, chatId)
    }
    return topics
  }

  private normalizeForumTopicTitle(title: string): string {
    const trimmed = title.trim()
    if (!trimmed) throw new Error('Topic title cannot be empty.')
    if (Buffer.byteLength(trimmed, 'utf8') > 128) {
      throw new Error('Topic title is too long (max 128 UTF-8 bytes).')
    }
    return trimmed
  }

  public async createForumTopic(
    accountId: string,
    chatId: string,
    title: string
  ): Promise<ForumTopicCreateResult> {
    const { holder, inputPeer } = await this.resolveForumPeer(accountId, chatId)
    const normalizedTitle = this.normalizeForumTopicTitle(title)

    const res: any = await holder.client!.call({
      _: 'messages.createForumTopic',
      peer: inputPeer,
      title: normalizedTitle,
      iconColor: 0x6fb9f0,
      randomId: Long.fromString(
        `${Date.now()}${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`
      ),
    })

    let topicId: number | undefined
    for (const update of res.updates || []) {
      const msg = update?.message
      if (msg?.action?._ === 'messageActionTopicCreate') {
        topicId = Number(msg.id)
      }
    }

    const topics = await this.getForumTopics(accountId, chatId)
    if (!topicId) {
      const match = topics
        .filter((topic) => topic.title === normalizedTitle)
        .sort((a, b) => (b.date || 0) - (a.date || 0))[0]
      topicId = match?.id
    }

    if (!topicId) {
      throw new Error('Topic was created but its ID could not be resolved.')
    }

    return { topicId, topics }
  }

  public async editForumTopic(
    accountId: string,
    chatId: string,
    topicId: number,
    input: ForumTopicInput
  ): Promise<ForumTopicMutationResult> {
    const { holder, inputPeer } = await this.resolveForumPeer(accountId, chatId)
    if (!Number.isInteger(topicId) || topicId <= 0) {
      throw new Error('Invalid topic ID.')
    }

    const hasTitle = input.title !== undefined
    const hasClosed = input.closed !== undefined
    const hasHidden = input.hidden !== undefined
    const hasIcon = input.iconEmojiId !== undefined

    if (!hasTitle && !hasClosed && !hasHidden && !hasIcon) {
      throw new Error('No changes to save.')
    }
    if (hasClosed && (hasTitle || hasHidden || hasIcon)) {
      throw new Error('Close/reopen must be saved separately from other topic changes.')
    }

    const request: any = {
      _: 'messages.editForumTopic',
      peer: inputPeer,
      topicId,
    }

    if (hasTitle) request.title = this.normalizeForumTopicTitle(input.title || '')
    if (hasClosed) request.closed = Boolean(input.closed)
    if (hasHidden) request.hidden = Boolean(input.hidden)
    if (hasIcon) {
      request.iconEmojiId = input.iconEmojiId ? Long.fromString(input.iconEmojiId) : Long.ZERO
    }

    await holder.client!.call(request)

    const topics = await this.getForumTopicsUntil(accountId, chatId, (list) => {
      const topic = list.find((item) => item.id === topicId)
      if (!topic) return false
      if (hasTitle && topic.title !== request.title) return false
      if (hasClosed && topic.isClosed !== Boolean(input.closed)) return false
      if (hasHidden && topic.isHidden !== Boolean(input.hidden)) return false
      if (hasIcon) {
        const expected = input.iconEmojiId ? String(input.iconEmojiId) : undefined
        if ((topic.iconEmojiId || undefined) !== expected) return false
      }
      return true
    })

    return { topicId, topics }
  }

  public async setForumTopicPinned(
    accountId: string,
    chatId: string,
    topicId: number,
    pinned: boolean
  ): Promise<ForumTopicMutationResult> {
    const { holder, inputPeer } = await this.resolveForumPeer(accountId, chatId)
    if (!Number.isInteger(topicId) || topicId <= 0) {
      throw new Error('Invalid topic ID.')
    }

    await holder.client!.call({
      _: 'messages.updatePinnedForumTopic',
      peer: inputPeer,
      topicId,
      pinned,
    })

    const topics = await this.getForumTopicsUntil(accountId, chatId, (list) => {
      const topic = list.find((item) => item.id === topicId)
      return Boolean(topic && topic.isPinned === pinned)
    })

    return { topicId, topics }
  }

  public async deleteForumTopic(
    accountId: string,
    chatId: string,
    topicId: number
  ): Promise<ForumTopicMutationResult> {
    const { holder, inputPeer } = await this.resolveForumPeer(accountId, chatId)
    if (!Number.isInteger(topicId) || topicId <= 0) {
      throw new Error('Invalid topic ID.')
    }
    if (topicId === 1) {
      throw new Error('The General topic cannot be deleted.')
    }

    await holder.client!.call({
      _: 'messages.deleteTopicHistory',
      peer: inputPeer,
      topMsgId: topicId,
    })

    const topics = await this.getForumTopicsUntil(accountId, chatId, (list) =>
      list.every((topic) => topic.id !== topicId)
    )

    return { topicId, topics }
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

  /**
   * Real Telegram phone-call log.
   *
   * Telegram does not expose a dedicated "get call log" method; official
   * clients search messages globally with `inputMessagesFilterPhoneCalls`.
   * Call events are service messages with `messageActionPhoneCall`.
   */
  public async getCallLog(
    accountId: string,
    limit = 50,
    offsetId = 0,
    missedOnly = false
  ): Promise<CallLogResult> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return { items: [], total: 0 }

    try {
      const res: any = await holder.client.call({
        _: 'messages.search',
        peer: { _: 'inputPeerEmpty' },
        q: '',
        filter: missedOnly
          ? { _: 'inputMessagesFilterPhoneCalls', missed: true }
          : { _: 'inputMessagesFilterPhoneCalls' },
        minDate: 0,
        maxDate: 0,
        offsetId: offsetId || 0,
        addOffset: 0,
        limit: Math.max(1, Math.min(100, limit)),
        maxId: 0,
        minId: 0,
        hash: Long.ZERO,
      })

      const users = new Map<string, any>()
      for (const user of res.users || []) {
        if (user?._ === 'user') users.set(String(user.id), user)
      }

      const reasonFromRaw = (raw?: string): CallDiscardReason => {
        switch (raw) {
          case 'phoneCallDiscardReasonMissed':
            return 'missed'
          case 'phoneCallDiscardReasonBusy':
            return 'busy'
          case 'phoneCallDiscardReasonHangup':
            return 'hangup'
          case 'phoneCallDiscardReasonDisconnect':
            return 'disconnect'
          default:
            return 'unknown'
        }
      }

      const items: CallLogItem[] = []
      for (const message of Array.isArray(res.messages) ? res.messages : []) {
        if (!message || message._ === 'messageEmpty') continue
        if (message.action?._ !== 'messageActionPhoneCall') continue

        const peerRaw = message.peerId
        let peerId = ''
        if (peerRaw?._ === 'peerUser') peerId = String(peerRaw.userId)
        else if (peerRaw?._ === 'peerChat') peerId = `-${peerRaw.chatId}`
        else if (peerRaw?._ === 'peerChannel') peerId = `-100${peerRaw.channelId}`
        else continue

        const user = peerRaw?._ === 'peerUser' ? users.get(String(peerRaw.userId)) : undefined
        const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
        const title = fullName || (user?.username ? `@${user.username}` : peerId)
        const reason = reasonFromRaw(message.action.reason?._)

        items.push({
          id: message.id,
          peerId,
          title,
          username: user?.username || undefined,
          date: message.date || 0,
          duration: Number(message.action.duration || 0),
          isOutgoing: Boolean(message.out),
          // Incoming unanswered calls are "missed"; outgoing unanswered calls are "cancelled".
          isMissed: !message.out && reason === 'missed',
          isVideo: Boolean(message.action.video),
          reason,
        })
      }

      return { items, total: Number(res.count ?? items.length) }
    } catch (err: any) {
      Logger.warn(`[AccountManager] getCallLog failed for ${accountId}:`, err?.message || err)
      return { items: [], total: 0 }
    }
  }

  /**
   * Real Telegram statistics for a supergroup or broadcast channel.
   *
   * Uses the official `stats.getMegagroupStats` / `stats.getBroadcastStats`
   * methods. Statistics require admin rights; callers should keep the local
   * crawl as a fallback when `ok` is false.
   */
  public async getChatStats(accountId: string, chatId: string): Promise<ChatStatsResult> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) {
      return { ok: false, error: 'unavailable', message: 'Telegram client is not connected.' }
    }

    try {
      const peer = await this.resolveInputPeer(accountId, chatId)
      if (peer._ !== 'inputPeerChannel') {
        return {
          ok: false,
          error: 'not_supergroup',
          message: 'Official statistics are only available for supergroups and channels.',
        }
      }

      // Resolve the access hash/marked ID from the AccountManager cache and
      // inspect the raw channel to distinguish a broadcast channel from a
      // supergroup. Passing the string chatId directly to mtcute would be
      // interpreted as a username.
      const inputChannel: any = {
        _: 'inputChannel',
        channelId: peer.channelId,
        accessHash: peer.accessHash,
      }
      const channelRes: any = await holder.client.call({
        _: 'channels.getChannels',
        id: [inputChannel],
      })
      const channel: any = channelRes?.chats?.[0]
      const kind: 'megagroup' | 'broadcast' = channel?.broadcast ? 'broadcast' : 'megagroup'

      const res: any = await holder.client.call(
        kind === 'broadcast'
          ? { _: 'stats.getBroadcastStats', channel: inputChannel }
          : { _: 'stats.getMegagroupStats', channel: inputChannel }
      )

      const pair = (value: any): StatsValuePair | undefined => {
        if (!value) return undefined
        return {
          current: Number(value.current || 0),
          previous: Number(value.previous || 0),
        }
      }

      const users = new Map<string, any>()
      for (const user of res.users || []) {
        if (user?._ === 'user') users.set(String(user.id), user)
      }
      const displayName = (userId: any) => {
        const user = users.get(String(userId))
        return formatEntityName(user, String(userId))
      }

      const topPosters: ChatStatsTopPoster[] = (res.topPosters || []).map((item: any) => ({
        peerId: String(item.userId),
        title: displayName(item.userId),
        messages: Number(item.messages || 0),
        avgChars: Number(item.avgChars || 0),
      }))
      const topAdmins: ChatStatsTopAdmin[] = (res.topAdmins || []).map((item: any) => ({
        peerId: String(item.userId),
        title: displayName(item.userId),
        deleted: Number(item.deleted || 0),
        kicked: Number(item.kicked || 0),
        banned: Number(item.banned || 0),
        reports: Number(item.reports || 0),
      }))
      const topInviters: ChatStatsTopInviter[] = (res.topInviters || []).map((item: any) => ({
        peerId: String(item.userId),
        title: displayName(item.userId),
        invitations: Number(item.invitations || 0),
      }))

      const stats: ChatStatsPayload = {
        kind,
        period: res.period
          ? {
              minDate: Number(res.period.minDate || 0),
              maxDate: Number(res.period.maxDate || 0),
            }
          : null,
        members: pair(res.members),
        messages: pair(res.messages),
        viewers: pair(res.viewers),
        posters: pair(res.posters),
        followers: pair(res.followers),
        viewsPerPost: pair(res.viewsPerPost),
        sharesPerPost: pair(res.sharesPerPost),
        reactionsPerPost: pair(res.reactionsPerPost),
        viewsPerStory: pair(res.viewsPerStory),
        sharesPerStory: pair(res.sharesPerStory),
        reactionsPerStory: pair(res.reactionsPerStory),
        enabledNotifications: res.enabledNotifications
          ? {
              part: Number(res.enabledNotifications.part || 0),
              total: Number(res.enabledNotifications.total || 0),
            }
          : undefined,
        topPosters,
        topAdmins,
        topInviters,
      }

      return { ok: true, kind, stats }
    } catch (err: any) {
      const msg = String(err?.message || err || '')
      if (msg.includes('CHAT_ADMIN_REQUIRED')) {
        return {
          ok: false,
          error: 'admin_required',
          message:
            'Telegram did not return statistics. This usually happens when the chat is too small or inactive, or your account does not have admin rights.',
        }
      }
      if (msg.includes('MEGAGROUP_REQUIRED')) {
        return {
          ok: false,
          error: 'not_supergroup',
          message: 'This chat is not a supergroup.',
        }
      }
      if (msg.includes('BROADCAST_REQUIRED')) {
        return {
          ok: false,
          error: 'not_channel',
          message: 'This chat is not a broadcast channel.',
        }
      }
      if (msg.includes('CHANNEL_INVALID') || msg.includes('CHANNEL_PRIVATE')) {
        return {
          ok: false,
          error: 'unavailable',
          message: 'This chat is not available for statistics.',
        }
      }
      Logger.warn(`[AccountManager] getChatStats failed for ${accountId}/${chatId}:`, msg)
      return { ok: false, error: 'unknown', message: msg || 'Failed to load Telegram statistics.' }
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

  public async getCallConfig(accountId: string): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)
    try {
      const res: any = await holder.client.call({
        _: 'phone.getCallConfig',
      } as any)
      return res?.data ? JSON.parse(res.data) : res
    } catch (err) {
      Logger.warn('[AccountManager] getCallConfig error:', err)
      return null
    }
  }

  public async requestCall(
    accountId: string,
    userId: string,
    isVideo = false
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)
    try {
      const targetUser: any = await this.resolveInputPeer(accountId, userId)
      const inputUser =
        targetUser._ === 'inputPeerUser'
          ? { _: 'inputUser', userId: targetUser.userId, accessHash: targetUser.accessHash }
          : { _: 'inputUserSelf' }

      const randomId = Math.floor(Math.random() * 2147483647)
      const fakeDhBytes = Buffer.alloc(32, 1)

      const res: any = await holder.client.call({
        _: 'phone.requestCall',
        video: Boolean(isVideo),
        userId: inputUser,
        randomId,
        gAHash: fakeDhBytes,
        protocol: {
          _: 'phoneCallProtocol',
          udpP2p: true,
          udpReflector: true,
          minLayer: 65,
          maxLayer: 92,
          libraryVersions: ['3.0.0'],
        },
      } as any)
      return res
    } catch (err: any) {
      Logger.warn('[AccountManager] requestCall error:', err?.message || err)
      throw err
    }
  }

  public async acceptCall(
    accountId: string,
    callId: string,
    accessHash: string,
    gBHex?: string
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)
    try {
      const gB = gBHex ? Buffer.from(gBHex, 'hex') : Buffer.alloc(32, 2)
      const res: any = await holder.client.call({
        _: 'phone.acceptCall',
        peer: {
          _: 'inputPhoneCall',
          id: toLong(callId),
          accessHash: toLong(accessHash),
        },
        gB,
        protocol: {
          _: 'phoneCallProtocol',
          udpP2p: true,
          udpReflector: true,
          minLayer: 65,
          maxLayer: 92,
          libraryVersions: ['3.0.0'],
        },
      } as any)
      return res
    } catch (err: any) {
      Logger.warn('[AccountManager] acceptCall error:', err?.message || err)
      throw err
    }
  }

  public async confirmCall(
    accountId: string,
    callId: string,
    accessHash: string,
    gAHex?: string,
    keyFingerprint?: string
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)
    try {
      const gA = gAHex ? Buffer.from(gAHex, 'hex') : Buffer.alloc(32, 1)
      const res: any = await holder.client.call({
        _: 'phone.confirmCall',
        peer: {
          _: 'inputPhoneCall',
          id: toLong(callId),
          accessHash: toLong(accessHash),
        },
        gA,
        keyFingerprint: toLong(keyFingerprint || '123456789'),
        protocol: {
          _: 'phoneCallProtocol',
          udpP2p: true,
          udpReflector: true,
          minLayer: 65,
          maxLayer: 92,
          libraryVersions: ['3.0.0'],
        },
      } as any)
      return res
    } catch (err: any) {
      Logger.warn('[AccountManager] confirmCall error:', err?.message || err)
      throw err
    }
  }

  public async receivedCall(
    accountId: string,
    callId: string,
    accessHash: string
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const res: any = await holder.client.call({
        _: 'phone.receivedCall',
        peer: {
          _: 'inputPhoneCall',
          id: toLong(callId),
          accessHash: toLong(accessHash),
        },
      } as any)
      return Boolean(res)
    } catch (err) {
      Logger.warn('[AccountManager] receivedCall error:', err)
      return false
    }
  }

  public async discardCall(
    accountId: string,
    callId: string,
    accessHash: string,
    duration = 0,
    reason = 'hangup'
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const reasonObj =
        reason === 'missed'
          ? { _: 'phoneCallDiscardReasonMissed' }
          : reason === 'busy'
            ? { _: 'phoneCallDiscardReasonBusy' }
            : reason === 'disconnect'
              ? { _: 'phoneCallDiscardReasonDisconnect' }
              : { _: 'phoneCallDiscardReasonHangup' }

      const res: any = await holder.client.call({
        _: 'phone.discardCall',
        peer: {
          _: 'inputPhoneCall',
          id: toLong(callId),
          accessHash: toLong(accessHash),
        },
        duration: Math.max(0, duration),
        reason: reasonObj,
        connectionId: toLong(0),
      } as any)
      return Boolean(res)
    } catch (err) {
      Logger.warn('[AccountManager] discardCall error:', err)
      return false
    }
  }

  public async sendCallSignalingData(
    accountId: string,
    callId: string,
    accessHash: string,
    dataHex: string
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const data = Buffer.from(dataHex, 'hex')
      const res: any = await holder.client.call({
        _: 'phone.sendSignalingData',
        peer: {
          _: 'inputPhoneCall',
          id: toLong(callId),
          accessHash: toLong(accessHash),
        },
        data,
      } as any)
      return Boolean(res)
    } catch (err) {
      Logger.warn('[AccountManager] sendCallSignalingData error:', err)
      return false
    }
  }

  public async inviteToGroupCall(
    accountId: string,
    callId: string,
    accessHash: string,
    userIds: string[]
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const users = await Promise.all(
        userIds.map(async (uid) => {
          const peer: any = await this.resolveInputPeer(accountId, uid)
          return peer._ === 'inputPeerUser'
            ? { _: 'inputUser', userId: peer.userId, accessHash: peer.accessHash }
            : { _: 'inputUserSelf' }
        })
      )
      const res: any = await holder.client.call({
        _: 'phone.inviteToGroupCall',
        call: { _: 'inputGroupCall', id: toLong(callId), accessHash: toLong(accessHash) },
        users,
      } as any)
      return Boolean(res)
    } catch (err) {
      Logger.warn('[AccountManager] inviteToGroupCall error:', err)
      return false
    }
  }

  public async discardGroupCall(
    accountId: string,
    callId: string,
    accessHash: string
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const res: any = await holder.client.call({
        _: 'phone.discardGroupCall',
        call: { _: 'inputGroupCall', id: toLong(callId), accessHash: toLong(accessHash) },
      } as any)
      return Boolean(res)
    } catch (err) {
      Logger.warn('[AccountManager] discardGroupCall error:', err)
      return false
    }
  }

  public async exportGroupCallInvite(
    accountId: string,
    callId: string,
    accessHash: string,
    canSelfUnmute?: boolean
  ): Promise<string | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const res: any = await holder.client.call({
        _: 'phone.exportGroupCallInvite',
        call: { _: 'inputGroupCall', id: toLong(callId), accessHash: toLong(accessHash) },
        canSelfUnmute: Boolean(canSelfUnmute),
      } as any)
      return res?.link || null
    } catch (err) {
      Logger.warn('[AccountManager] exportGroupCallInvite error:', err)
      return null
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

  public async getDhConfig(
    accountId: string,
    version = 0,
    randomLength = 256
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)
    try {
      const res: any = await holder.client.call({
        _: 'messages.getDhConfig',
        version,
        randomLength,
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] getDhConfig error:', err)
      return null
    }
  }

  public async requestEncryption(
    accountId: string,
    userId: string,
    gAHex?: string
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)
    try {
      const targetUser: any = await this.resolveInputPeer(accountId, userId)
      const inputUser =
        targetUser._ === 'inputPeerUser'
          ? { _: 'inputUser', userId: targetUser.userId, accessHash: targetUser.accessHash }
          : { _: 'inputUserSelf' }

      const randomId = Math.floor(Math.random() * 2147483647)
      const gA = gAHex ? Buffer.from(gAHex, 'hex') : Buffer.alloc(256, 3)

      const res: any = await holder.client.call({
        _: 'messages.requestEncryption',
        userId: inputUser,
        randomId,
        gA,
      } as any)
      return res
    } catch (err: any) {
      Logger.warn('[AccountManager] requestEncryption error:', err?.message || err)
      throw err
    }
  }

  public async acceptEncryption(
    accountId: string,
    chatId: number,
    accessHash: string,
    gBHex?: string,
    keyFingerprint?: string
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)
    try {
      const gB = gBHex ? Buffer.from(gBHex, 'hex') : Buffer.alloc(256, 4)
      const res: any = await holder.client.call({
        _: 'messages.acceptEncryption',
        peer: {
          _: 'inputEncryptedChat',
          chatId: Number(chatId),
          accessHash: toLong(accessHash),
        },
        gB,
        keyFingerprint: toLong(keyFingerprint || '987654321'),
      } as any)
      return res
    } catch (err: any) {
      Logger.warn('[AccountManager] acceptEncryption error:', err?.message || err)
      throw err
    }
  }

  public async discardEncryption(
    accountId: string,
    chatId: number,
    deleteHistory = true
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const res: any = await holder.client.call({
        _: 'messages.discardEncryption',
        chatId: Number(chatId),
        deleteHistory: Boolean(deleteHistory),
      } as any)
      return Boolean(res)
    } catch (err) {
      Logger.warn('[AccountManager] discardEncryption error:', err)
      return false
    }
  }

  public async setEncryptedTyping(
    accountId: string,
    chatId: number,
    accessHash: string,
    typing = true
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const res: any = await holder.client.call({
        _: 'messages.setEncryptedTyping',
        peer: {
          _: 'inputEncryptedChat',
          chatId: Number(chatId),
          accessHash: toLong(accessHash),
        },
        typing: Boolean(typing),
      } as any)
      return Boolean(res)
    } catch (err) {
      Logger.warn('[AccountManager] setEncryptedTyping error:', err)
      return false
    }
  }

  public async readEncryptedHistory(
    accountId: string,
    chatId: number,
    accessHash: string,
    maxDate = Math.floor(Date.now() / 1000)
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const res: any = await holder.client.call({
        _: 'messages.readEncryptedHistory',
        peer: {
          _: 'inputEncryptedChat',
          chatId: Number(chatId),
          accessHash: toLong(accessHash),
        },
        maxDate,
      } as any)
      return Boolean(res)
    } catch (err) {
      Logger.warn('[AccountManager] readEncryptedHistory error:', err)
      return false
    }
  }

  public async sendEncrypted(
    accountId: string,
    chatId: number,
    accessHash: string,
    dataHex: string,
    silent = false
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)
    try {
      const data = Buffer.from(dataHex, 'hex')
      const randomId = toLong(Math.floor(Math.random() * 10000000000))
      const res: any = await holder.client.call({
        _: 'messages.sendEncrypted',
        peer: {
          _: 'inputEncryptedChat',
          chatId: Number(chatId),
          accessHash: toLong(accessHash),
        },
        randomId,
        data,
        silent: Boolean(silent),
      } as any)
      return res
    } catch (err: any) {
      Logger.warn('[AccountManager] sendEncrypted error:', err?.message || err)
      throw err
    }
  }

  public async sendEncryptedService(
    accountId: string,
    chatId: number,
    accessHash: string,
    dataHex: string
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)
    try {
      const data = Buffer.from(dataHex, 'hex')
      const randomId = toLong(Math.floor(Math.random() * 10000000000))
      const res: any = await holder.client.call({
        _: 'messages.sendEncryptedService',
        peer: {
          _: 'inputEncryptedChat',
          chatId: Number(chatId),
          accessHash: toLong(accessHash),
        },
        randomId,
        data,
      } as any)
      return res
    } catch (err: any) {
      Logger.warn('[AccountManager] sendEncryptedService error:', err?.message || err)
      throw err
    }
  }

  public async getSponsoredMessages(
    accountId: string,
    peerId: string,
    msgId?: number
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const inputPeer = await this.resolveInputPeer(accountId, peerId)
      const res: any = await holder.client.call({
        _: 'messages.getSponsoredMessages',
        peer: inputPeer,
        msgId: msgId ? Number(msgId) : undefined,
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] getSponsoredMessages error:', err)
      return null
    }
  }

  public async viewSponsoredMessage(
    accountId: string,
    randomIdHex: string
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const randomId = Buffer.from(randomIdHex, 'hex')
      const res: any = await holder.client.call({
        _: 'messages.viewSponsoredMessage',
        randomId,
      } as any)
      return Boolean(res)
    } catch (err) {
      Logger.warn('[AccountManager] viewSponsoredMessage error:', err)
      return false
    }
  }

  public async clickSponsoredMessage(
    accountId: string,
    randomIdHex: string,
    media = false,
    fullscreen = false
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const randomId = Buffer.from(randomIdHex, 'hex')
      const res: any = await holder.client.call({
        _: 'messages.clickSponsoredMessage',
        randomId,
        media: Boolean(media),
        fullscreen: Boolean(fullscreen),
      } as any)
      return Boolean(res)
    } catch (err) {
      Logger.warn('[AccountManager] clickSponsoredMessage error:', err)
      return false
    }
  }

  public async reportSponsoredMessage(
    accountId: string,
    randomIdHex: string,
    optionHex: string
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const randomId = Buffer.from(randomIdHex, 'hex')
      const option = Buffer.from(optionHex, 'hex')
      const res: any = await holder.client.call({
        _: 'messages.reportSponsoredMessage',
        randomId,
        option,
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] reportSponsoredMessage error:', err)
      return null
    }
  }

  public async toggleSponsoredMessages(
    accountId: string,
    enabled: boolean
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const res: any = await holder.client.call({
        _: 'account.toggleSponsoredMessages',
        enabled: Boolean(enabled),
      } as any)
      return Boolean(res)
    } catch (err) {
      Logger.warn('[AccountManager] toggleSponsoredMessages error:', err)
      return false
    }
  }

  public async restrictSponsoredMessages(
    accountId: string,
    channelId: string,
    restricted: boolean
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const targetChannel: any = await this.resolveInputPeer(accountId, channelId)
      const inputChannel =
        targetChannel._ === 'inputPeerChannel'
          ? { _: 'inputChannel', channelId: targetChannel.channelId, accessHash: targetChannel.accessHash }
          : { _: 'inputChannelEmpty' }
      const res: any = await holder.client.call({
        _: 'channels.restrictSponsoredMessages',
        channel: inputChannel,
        restricted: Boolean(restricted),
      } as any)
      return Boolean(res)
    } catch (err) {
      Logger.warn('[AccountManager] restrictSponsoredMessages error:', err)
      return false
    }
  }

  // --- Fragment & Collectibles Engine ---
  public async getCollectibleInfo(
    accountId: string,
    query: string,
    type: 'username' | 'phone' = 'username'
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const collectible =
        type === 'phone'
          ? { _: 'inputCollectiblePhone', phone: query }
          : { _: 'inputCollectibleUsername', username: query.replace(/^@/, '') }
      const res: any = await holder.client.call({
        _: 'fragment.getCollectibleInfo',
        collectible,
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] getCollectibleInfo error:', err)
      return null
    }
  }

  // --- TON Center & Blockchain Engine ---
  public async performTonApiRequest(
    accountId: string,
    endpoint: string,
    isPost = false,
    query?: string,
    payload?: string
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const res: any = await holder.client.call({
        _: 'toncenter.performApiRequest',
        endpoint,
        post: Boolean(isPost),
        query: query || undefined,
        payload: payload || undefined,
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] performTonApiRequest error:', err)
      return null
    }
  }

  public async getTonStreamingUrl(accountId: string): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const res: any = await holder.client.call({
        _: 'toncenter.getStreamingUrl',
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] getTonStreamingUrl error:', err)
      return null
    }
  }

  // --- Onramp Crypto Payments Engine ---
  public async getOnrampProviders(
    accountId: string,
    cryptoCurrency?: string
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []
    try {
      const res: any = await holder.client.call({
        _: 'payments.getOnrampProviders',
        cryptoCurrency: cryptoCurrency || undefined,
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] getOnrampProviders error:', err)
      return []
    }
  }

  public async getOnrampBaseCurrencies(
    accountId: string,
    provider: string,
    cryptoCurrency: string
  ): Promise<string[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []
    try {
      const res: any = await holder.client.call({
        _: 'payments.getOnrampBaseCurrencies',
        provider,
        cryptoCurrency,
      } as any)
      return Array.isArray(res) ? res : []
    } catch (err) {
      Logger.warn('[AccountManager] getOnrampBaseCurrencies error:', err)
      return []
    }
  }

  public async getOnrampAvailability(
    accountId: string,
    provider: string,
    cryptoCurrency: string,
    baseCurrency?: string
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const res: any = await holder.client.call({
        _: 'payments.getOnrampAvailability',
        provider,
        cryptoCurrency,
        baseCurrency: baseCurrency || undefined,
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] getOnrampAvailability error:', err)
      return null
    }
  }

  public async getOnrampLimits(
    accountId: string,
    provider: string,
    cryptoCurrency: string,
    baseCurrency: string,
    paymentMethod?: string
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const res: any = await holder.client.call({
        _: 'payments.getOnrampLimits',
        provider,
        cryptoCurrency,
        baseCurrency,
        paymentMethod: paymentMethod || undefined,
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] getOnrampLimits error:', err)
      return null
    }
  }

  public async getOnrampQuote(
    accountId: string,
    provider: string,
    cryptoCurrency: string,
    baseCurrency: string,
    baseAmount?: string,
    cryptoAmount?: string,
    paymentMethod?: string
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const res: any = await holder.client.call({
        _: 'payments.getOnrampQuote',
        provider,
        cryptoCurrency,
        baseCurrency,
        baseAmount: baseAmount || undefined,
        cryptoAmount: cryptoAmount || undefined,
        paymentMethod: paymentMethod || undefined,
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] getOnrampQuote error:', err)
      return null
    }
  }

  public async createOnrampSession(
    accountId: string,
    provider: string,
    cryptoCurrency: string,
    address: string,
    options?: {
      paymentMethod?: string
      baseCurrency?: string
      baseAmount?: string
      cryptoAmount?: string
      memo?: string
      theme?: string
      successReturnUrl?: string
      failReturnUrl?: string
    }
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const res: any = await holder.client.call({
        _: 'payments.createOnrampSession',
        provider,
        cryptoCurrency,
        address,
        paymentMethod: options?.paymentMethod || undefined,
        baseCurrency: options?.baseCurrency || undefined,
        baseAmount: options?.baseAmount || undefined,
        cryptoAmount: options?.cryptoAmount || undefined,
        memo: options?.memo || undefined,
        theme: options?.theme || undefined,
        successReturnUrl: options?.successReturnUrl || undefined,
        failReturnUrl: options?.failReturnUrl || undefined,
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] createOnrampSession error:', err)
      return null
    }
  }

  // --- Telegram Wallet & TonConnect Engine ---
  public async getWalletState(accountId: string): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const res: any = await holder.client.call({
        _: 'wallet.getState',
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] getWalletState error:', err)
      return null
    }
  }

  public async getWalletUserAddresses(
    accountId: string,
    userIds: string[],
    addresses: string[],
    force = false
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const inputUsers: any[] = []
      for (const uid of userIds) {
        const p: any = await this.resolveInputPeer(accountId, uid)
        if (p._ === 'inputPeerUser') {
          inputUsers.push({ _: 'inputUser', userId: p.userId, accessHash: p.accessHash })
        }
      }
      const res: any = await holder.client.call({
        _: 'wallet.getUserAddresses',
        force: Boolean(force),
        id: inputUsers,
        addresses,
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] getWalletUserAddresses error:', err)
      return null
    }
  }

  public async getWalletTransactions(
    accountId: string,
    offset = '',
    limit = 50,
    inbound = true,
    outbound = true
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const res: any = await holder.client.call({
        _: 'wallet.getTransactions',
        offset,
        limit,
        inbound: Boolean(inbound),
        outbound: Boolean(outbound),
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] getWalletTransactions error:', err)
      return null
    }
  }

  public async getWalletNfts(
    accountId: string,
    offset = '',
    limit = 50
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const res: any = await holder.client.call({
        _: 'wallet.getNfts',
        offset,
        limit,
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] getWalletNfts error:', err)
      return null
    }
  }

  public async getTonConnectSessions(accountId: string): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const res: any = await holder.client.call({
        _: 'wallet.tonConnectGetSessions',
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] getTonConnectSessions error:', err)
      return null
    }
  }

  public async createTonConnectSession(
    accountId: string,
    dappClientId: string,
    manifestUrl: string
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const res: any = await holder.client.call({
        _: 'wallet.tonConnectCreateSession',
        dappClientId,
        manifestUrl,
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] createTonConnectSession error:', err)
      return null
    }
  }

  public async closeTonConnectSession(
    accountId: string,
    sessionId: string | number,
    bodyHex?: string
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const res: any = await holder.client.call({
        _: 'wallet.tonConnectCloseSession',
        sessionId: BigInt(sessionId),
        body: bodyHex ? Buffer.from(bodyHex, 'hex') : undefined,
      } as any)
      return Boolean(res)
    } catch (err) {
      Logger.warn('[AccountManager] closeTonConnectSession error:', err)
      return false
    }
  }

  // --- Telegram Passport & Secure Identity Documents Engine ---
  public async getPassportConfig(accountId: string, hash = 0): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const res: any = await holder.client.call({
        _: 'help.getPassportConfig',
        hash,
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] getPassportConfig error:', err)
      return null
    }
  }

  public async getAllSecureValues(accountId: string): Promise<any[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []
    try {
      const res: any = await holder.client.call({
        _: 'account.getAllSecureValues',
      } as any)
      return Array.isArray(res) ? res : []
    } catch (err) {
      Logger.warn('[AccountManager] getAllSecureValues error:', err)
      return []
    }
  }

  public async getSecureValue(accountId: string, types: any[]): Promise<any[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []
    try {
      const res: any = await holder.client.call({
        _: 'account.getSecureValue',
        types,
      } as any)
      return Array.isArray(res) ? res : []
    } catch (err) {
      Logger.warn('[AccountManager] getSecureValue error:', err)
      return []
    }
  }

  public async saveSecureValue(
    accountId: string,
    value: any,
    secureSecretId: string | number
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const res: any = await holder.client.call({
        _: 'account.saveSecureValue',
        value,
        secureSecretId: BigInt(secureSecretId),
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] saveSecureValue error:', err)
      return null
    }
  }

  public async deleteSecureValue(accountId: string, types: any[]): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const res: any = await holder.client.call({
        _: 'account.deleteSecureValue',
        types,
      } as any)
      return Boolean(res)
    } catch (err) {
      Logger.warn('[AccountManager] deleteSecureValue error:', err)
      return false
    }
  }

  // --- Sticker Set Creation & Management ---
  public async createStickerSet(
    accountId: string,
    title: string,
    shortName: string,
    stickers: any[],
    options?: {
      masks?: boolean
      emojis?: boolean
      textColor?: boolean
      thumb?: any
      software?: string
    }
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const self = await holder.client.getMe()
      const userId: any = {
        _: 'inputUser',
        userId: self.raw.id,
        accessHash: self.raw.accessHash || 0n,
      }
      const res: any = await holder.client.call({
        _: 'stickers.createStickerSet',
        masks: Boolean(options?.masks),
        emojis: Boolean(options?.emojis),
        textColor: Boolean(options?.textColor),
        userId,
        title,
        shortName,
        thumb: options?.thumb || undefined,
        stickers,
        software: options?.software || 'Guidegram Studio',
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] createStickerSet error:', err)
      return null
    }
  }

  public async addStickerToSet(
    accountId: string,
    stickerset: any,
    sticker: any
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const res: any = await holder.client.call({
        _: 'stickers.addStickerToSet',
        stickerset,
        sticker,
      } as any)
      return res
    } catch (err) {
      Logger.warn('[AccountManager] addStickerToSet error:', err)
      return null
    }
  }

  public pruneExpiredCache(maxAgeDays = 14): { removedFiles: number; freedBytes: number } {
    return this.store.pruneExpiredCache(maxAgeDays)
  }

  /**
   * Universal MTProto Layer 229+ RPC Dispatcher (100% Protocol Parity Engine)
   * Dispatches any of the 859 official MTProto functions directly to the connected client.
   */
  public async invokeMtprotoRpc(
    accountId: string,
    method: string,
    params: any = {}
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error(`Account ${accountId} is not connected.`)
    try {
      return await dispatchMtprotoRpc(holder.client, method, params)
    } catch (err) {
      Logger.warn(`[AccountManager] invokeMtprotoRpc error (${method}):`, err)
      throw err
    }
  }

  public getAllMtprotoMethods(): readonly string[] {
    return ALL_MTPROTO_METHODS
  }

  // --- Contacts & Users Domain Engine (Phase 1) ---
  public async getFullUser(accountId: string, userId: string): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.contactsService.getFullUser(holder as any, accountId, userId)
  }

  public async importContacts(accountId: string, contacts: any[]): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.contactsService.importContacts(holder as any, contacts)
  }

  public async addContact(
    accountId: string,
    userId: string,
    firstName: string,
    lastName = '',
    phone = '',
    addPhonePrivacyException = false,
    note?: string
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.contactsService.addContact(holder as any, accountId, userId, firstName, lastName, phone, addPhonePrivacyException, note)
  }

  public async blockPeer(accountId: string, peerId: string, myStoriesFrom = false): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    return this.contactsService.block(holder as any, accountId, peerId, myStoriesFrom)
  }

  public async unblockPeer(accountId: string, peerId: string, myStoriesFrom = false): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    return this.contactsService.unblock(holder as any, accountId, peerId, myStoriesFrom)
  }

  public async getBlockedPeers(accountId: string, offset = 0, limit = 50, myStoriesFrom = false): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.contactsService.getBlocked(holder as any, offset, limit, myStoriesFrom)
  }

  public async getTopPeers(accountId: string, options?: any): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.contactsService.getTopPeers(holder as any, options)
  }

  public async getBirthdays(accountId: string): Promise<any[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []
    return this.contactsService.getBirthdays(holder as any)
  }

  public async updateContactNote(accountId: string, userId: string, note: string): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    return this.contactsService.updateContactNote(holder as any, accountId, userId, note)
  }

  public async getRequirementsToContact(accountId: string, userIds: string[]): Promise<any[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []
    return this.contactsService.getRequirementsToContact(holder as any, accountId, userIds)
  }

  // --- Channels & Supergroups Administration Domain Engine (Phase 2) ---
  public getChannelsService(): ChannelsService {
    return this.channelsService
  }

  public async channelGetParticipants(accountId: string, channelId: string, filterName = 'recent', offset = 0, limit = 50): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.channelsService.getParticipants(holder as any, accountId, channelId, filterName, offset, limit)
  }

  public async channelGetAdminLog(accountId: string, channelId: string, options?: any): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.channelsService.getAdminLog(holder as any, accountId, channelId, options)
  }

  public async channelToggleSlowMode(accountId: string, channelId: string, seconds: number): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.channelsService.toggleSlowMode(holder as any, accountId, channelId, seconds)
  }

  public async channelToggleJoinRequest(accountId: string, channelId: string, enabled: boolean): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.channelsService.toggleJoinRequest(holder as any, accountId, channelId, enabled)
  }

  public async channelToggleAntiSpam(accountId: string, channelId: string, enabled: boolean): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.channelsService.toggleAntiSpam(holder as any, accountId, channelId, enabled)
  }

  public async channelToggleForum(accountId: string, channelId: string, enabled: boolean): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.channelsService.toggleForum(holder as any, accountId, channelId, enabled)
  }

  public async channelGetRecommendations(accountId: string, channelId?: string): Promise<any[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []
    return this.channelsService.getChannelRecommendations(holder as any, accountId, channelId)
  }

  public async channelUpdatePaidMessagesPrice(accountId: string, channelId: string, stars: bigint): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.channelsService.updatePaidMessagesPrice(holder as any, accountId, channelId, stars)
  }

  // --- Bots, Games & WebApps Domain Engine (Phase 3) ---
  public getBotsService(): BotsService {
    return this.botsService
  }

  public async botGetCommands(accountId: string, scope?: any, langCode = ''): Promise<any[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []
    return this.botsService.getBotCommands(holder as any, scope, langCode)
  }

  public async botSetCommands(accountId: string, commands: any[], scope?: any, langCode = ''): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    return this.botsService.setBotCommands(holder as any, commands, scope, langCode)
  }

  public async botGetInfo(accountId: string, botId?: string, langCode = ''): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.botsService.getBotInfo(holder as any, accountId, botId, langCode)
  }

  public async botSetInfo(
    accountId: string,
    botId?: string,
    langCode = '',
    name?: string,
    about?: string,
    description?: string
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    return this.botsService.setBotInfo(holder as any, accountId, botId, langCode, name, about, description)
  }

  public async botGetMenuButton(accountId: string, botId: string): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.botsService.getBotMenuButton(holder as any, accountId, botId)
  }

  public async botSetMenuButton(accountId: string, botId: string, button: any): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    return this.botsService.setBotMenuButton(holder as any, accountId, botId, button)
  }

  public async botGetAdminedBots(accountId: string): Promise<any[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []
    return this.botsService.getAdminedBots(holder as any)
  }

  public async botGetPopularApps(accountId: string, offset = '', limit = 50): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.botsService.getPopularAppBots(holder as any, offset, limit)
  }

  public async botGetRecommendations(accountId: string, botId: string): Promise<any[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []
    return this.botsService.getBotRecommendations(holder as any, accountId, botId)
  }

  public async botInvokeWebViewCustomMethod(
    accountId: string,
    botId: string,
    customMethod: string,
    params: any
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.botsService.invokeWebViewCustomMethod(holder as any, accountId, botId, customMethod, params)
  }

  // --- Payments, Invoices & Telegram Stars Domain Engine (Phase 4) ---
  public getPaymentsService(): PaymentsService {
    return this.paymentsService
  }

  public async paymentGetPaymentForm(accountId: string, invoice: any, themeParams?: any): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.paymentsService.getPaymentForm(holder as any, invoice, themeParams)
  }

  public async paymentGetStarsStatus(accountId: string, peerId?: string, ton = false): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.paymentsService.getStarsStatus(holder as any, accountId, peerId, ton)
  }

  public async paymentGetStarsTransactions(accountId: string, peerId?: string, offset = '', limit = 50, options: any = {}): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.paymentsService.getStarsTransactions(
      holder as any,
      accountId,
      peerId,
      offset,
      limit,
      options.inbound,
      options.outbound,
      options.ascending,
      options.ton,
      options.subscriptionId
    )
  }

  public async paymentGetStarsTopupOptions(accountId: string): Promise<any[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []
    const res = await this.paymentsService.getStarsTopupOptions(holder as any)
    return Array.isArray(res) ? res : []
  }

  public async paymentGetStarGifts(accountId: string, hash = 0): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.paymentsService.getStarGifts(holder as any, hash)
  }

  public async paymentGetSavedStarGifts(accountId: string, peerId: string, options: any = {}): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.paymentsService.getSavedStarGifts(holder as any, accountId, peerId, options)
  }

  public async paymentGetStarsRevenueStats(accountId: string, peerId: string, dark = false, ton = false): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.paymentsService.getStarsRevenueStats(holder as any, accountId, peerId, dark, ton)
  }

  public async paymentGetConnectedStarRefBots(accountId: string, peerId: string, offsetDate = 0, offsetLink = '', limit = 50): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.paymentsService.getConnectedStarRefBots(holder as any, accountId, peerId, offsetDate, offsetLink, limit)
  }

  public async paymentConnectStarRefBot(accountId: string, peerId: string, botId: string): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.paymentsService.connectStarRefBot(holder as any, accountId, peerId, botId)
  }

  public async paymentSendStarsForm(accountId: string, formId: bigint, invoice: any): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.paymentsService.sendStarsForm(holder as any, formId, invoice)
  }

  // --- Security, Authentication & Account Suite Domain Engine (Phase 5) ---
  public getSecurityService(): AccountSecurityService {
    return this.securityService
  }

  public async securityGetNotifySettings(accountId: string, peerId?: string): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : undefined
    return this.securityService.getNotifySettings(holder as any, peer)
  }

  public async securityUpdateNotifySettings(accountId: string, peerId: string, settings: any): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    const peer = await this.resolveInputPeer(accountId, peerId)
    const res = await this.securityService.updateNotifySettings(holder as any, peer, settings)
    return Boolean(res)
  }

  public async securityResetNotifySettings(accountId: string): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    const res = await this.securityService.resetNotifySettings(holder as any)
    return Boolean(res)
  }

  public async securityGetAuthorizations(accountId: string): Promise<any[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []
    const res = await this.securityService.getAuthorizations(holder as any)
    if (res && Array.isArray(res.authorizations)) return res.authorizations
    return Array.isArray(res) ? res : []
  }

  public async securityResetAuthorizations(accountId: string): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    const res = await this.securityService.auth_resetAuthorizations(holder as any)
    return Boolean(res)
  }

  public async securityGetPassword(accountId: string): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.securityService.getPassword(holder as any)
  }

  public async securityGetPrivacy(accountId: string, key: any): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.securityService.getPrivacy(holder as any, key)
  }

  public async securitySetPrivacy(accountId: string, key: any, rules: any[]): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.securityService.setPrivacy(holder as any, key, rules)
  }

  public async securityGetWallpapers(accountId: string, hash = 0n): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.securityService.getWallPapers(holder as any, hash)
  }

  public async securityUpdatePersonalChannel(accountId: string, channelId: string): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    const channel = await this.resolveInputPeer(accountId, channelId)
    const res = await this.securityService.updatePersonalChannel(holder as any, channel)
    return Boolean(res)
  }

  public async securityUpdateColor(accountId: string, color?: number, backgroundEmojiId?: bigint, forProfile = false): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    const res = await this.securityService.updateColor(holder as any, forProfile, color)
    return Boolean(res)
  }

  // --- Core Messaging Engine, Stories & Media Domain Engine (Phase 6) ---
  public getMessagingService(): MessagingService {
    return this.messagingService
  }

  public async messagingGetHistory(accountId: string, peerId: string, offsetId = 0, offsetDate = 0, addOffset = 0, limit = 50, maxId = 0, minId = 0, hash = 0n): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.messagingService.getHistory(holder as any, accountId, peerId, offsetId, offsetDate, addOffset, limit, maxId, minId, hash)
  }

  public async messagingSearchGlobal(accountId: string, q = '', filter: any = { _: 'inputMessagesFilterEmpty' }, minDate = 0, maxDate = 0, offsetRate = 0, offsetId = 0, limit = 50): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.messagingService.searchGlobal(holder as any, accountId, undefined, undefined, undefined, undefined, undefined, q, filter, minDate, maxDate, offsetRate, undefined, offsetId, limit)
  }

  public async messagingSendReaction(accountId: string, peerId: string, msgId: number, reaction?: any, big = false, addToRecent = true): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.messagingService.sendReaction(holder as any, accountId, big, addToRecent, peerId, msgId, reaction)
  }

  public async messagingStoriesGetPeerStories(accountId: string, peerId: string): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.messagingService.stories_getPeerStories(holder as any, accountId, peerId)
  }

  public async messagingStoriesSendStory(accountId: string, peerId: string, media: any, privacyRules: any[] = [{ _: 'inputPrivacyValueAllowAll' }], caption = ''): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.messagingService.stories_sendStory(holder as any, accountId, undefined, undefined, undefined, peerId, media, undefined, caption, undefined, privacyRules)
  }

  // --- System & Specialized Namespaces Domain Engine (Phase 7) ---
  public getSystemService(): SystemService {
    return this.systemService
  }

  public async systemGetConfig(accountId: string): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.systemService.help_getConfig(holder as any)
  }

  public async systemGetAppConfig(accountId: string, hash = 0): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.systemService.help_getAppConfig(holder as any, hash)
  }

  public async systemGetNearestDc(accountId: string): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.systemService.help_getNearestDc(holder as any)
  }

  public async systemPhoneGetCallConfig(accountId: string): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.systemService.phone_getCallConfig(holder as any)
  }

  public async systemStatsGetBroadcastStats(accountId: string, channelId: string, dark = false): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    const channel = await this.resolveInputPeer(accountId, channelId)
    return this.systemService.stats_getBroadcastStats(holder as any, dark, channel)
  }

  public async systemChatlistsGetExportedInvites(accountId: string, chatlistId: string): Promise<any[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []
    const chatlist = { _: 'inputChatlistDialogFilter', filterId: Number(chatlistId) || 0 }
    const res = await this.systemService.chatlists_getExportedInvites(holder as any, chatlist)
    if (res && Array.isArray(res.invites)) return res.invites
    return Array.isArray(res) ? res : []
  }

  public async systemStickersGetStickerSet(accountId: string, stickerset: any, hash = 0): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    return this.systemService.stickers_renameStickerSet(holder as any, stickerset, '')
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

      const usersMap = new Map<string, any>()
      if (Array.isArray(res.users)) {
        for (const u of res.users) {
          usersMap.set(u.id?.toString(), u)
        }
      }

      return (res.gifts || []).map((g: any) => {
        let fromId = ''
        if (g.fromId?._ === 'peerUser') fromId = g.fromId.userId?.toString()
        else if (g.fromId?._ === 'peerChannel') fromId = `-${g.fromId.channelId}`
        else if (g.fromId?._ === 'peerChat') fromId = `-${g.fromId.chatId}`

        const fromUser = usersMap.get(fromId)
        const fromName = fromUser ? formatEntityName(fromUser) : undefined

        return {
          id: g.gift?.id?.toString() || Math.random().toString(),
          stars: Number(g.gift?.stars || 0),
          convertStars: Number(g.convertStars || 0),
          title: g.gift?.title,
          fromId,
          fromName,
          date: g.date ? g.date * 1000 : 0,
          message: g.message?.text,
          isAnonymous: Boolean(g.nameHidden),
          isSaved: Boolean(g.saved),
          canExportAt: g.canExportAt ? g.canExportAt * 1000 : undefined,
          transferStars: g.transferStars ? Number(g.transferStars) : undefined,
        }
      })
    } catch (err: any) {
      Logger.warn('[AccountManager] getSavedStarGifts error:', err?.message || err)
      return []
    }
  }

  public async getStarGifts(accountId: string): Promise<StarGiftItem[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []

    try {
      const res: any = await holder.client.call({
        _: 'payments.getStarGifts',
        hash: 0,
      })

      return (res.gifts || []).map((g: any) => ({
        id: g.id?.toString() || Math.random().toString(),
        stars: Number(g.stars || 0),
        convertStars: Number(g.convertStars || 0),
        title: g.title,
        date: 0,
        isLimited: Boolean(g.limited),
        isSoldOut: Boolean(g.soldOut),
        availabilityRemains: g.availabilityRemains,
        availabilityTotal: g.availabilityTotal,
      }))
    } catch (err: any) {
      Logger.warn('[AccountManager] getStarGifts error:', err?.message || err)
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

  public async installStickerSet(
    accountId: string,
    setId: string,
    accessHash: string,
    archived = false
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const res: any = await holder.client.call({
        _: 'messages.installStickerSet',
        stickerset: {
          _: 'inputStickerSetID',
          id: toLong(setId),
          accessHash: toLong(accessHash),
        },
        archived: Boolean(archived),
      } as any)
      return Boolean(res)
    } catch (err: any) {
      Logger.warn(`[AccountManager] installStickerSet error:`, err?.message || err)
      return false
    }
  }

  public async uninstallStickerSet(
    accountId: string,
    setId: string,
    accessHash: string
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const res: any = await holder.client.call({
        _: 'messages.uninstallStickerSet',
        stickerset: {
          _: 'inputStickerSetID',
          id: toLong(setId),
          accessHash: toLong(accessHash),
        },
      } as any)
      return Boolean(res)
    } catch (err: any) {
      Logger.warn(`[AccountManager] uninstallStickerSet error:`, err?.message || err)
      return false
    }
  }

  public async checkStickerShortName(
    accountId: string,
    shortName: string
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const res: any = await holder.client.call({
        _: 'stickers.checkShortName',
        short_name: shortName.trim(),
      } as any)
      return Boolean(res)
    } catch (err: any) {
      Logger.warn(`[AccountManager] checkStickerShortName error:`, err?.message || err)
      return false
    }
  }

  public async suggestStickerShortName(
    accountId: string,
    title: string
  ): Promise<string> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return ''
    try {
      const res: any = await holder.client.call({
        _: 'stickers.suggestShortName',
        title: title.trim(),
      } as any)
      return res?.shortName || ''
    } catch (err: any) {
      Logger.warn(`[AccountManager] suggestStickerShortName error:`, err?.message || err)
      return ''
    }
  }

  public async renameStickerSet(
    accountId: string,
    setId: string,
    accessHash: string,
    title: string
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const res: any = await holder.client.call({
        _: 'stickers.renameStickerSet',
        stickerset: {
          _: 'inputStickerSetID',
          id: toLong(setId),
          accessHash: toLong(accessHash),
        },
        title: title.trim(),
      } as any)
      return Boolean(res)
    } catch (err: any) {
      Logger.warn(`[AccountManager] renameStickerSet error:`, err?.message || err)
      return false
    }
  }

  public async deleteStickerSet(
    accountId: string,
    setId: string,
    accessHash: string
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const res: any = await holder.client.call({
        _: 'stickers.deleteStickerSet',
        stickerset: {
          _: 'inputStickerSetID',
          id: toLong(setId),
          accessHash: toLong(accessHash),
        },
      } as any)
      return Boolean(res)
    } catch (err: any) {
      Logger.warn(`[AccountManager] deleteStickerSet error:`, err?.message || err)
      return false
    }
  }

  public async removeStickerFromSet(
    accountId: string,
    docId: string,
    accessHash: string,
    fileReferenceHex?: string
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const fileRef = fileReferenceHex ? Buffer.from(fileReferenceHex, 'hex') : Buffer.alloc(0)
      const res: any = await holder.client.call({
        _: 'stickers.removeStickerFromSet',
        sticker: {
          _: 'inputDocument',
          id: toLong(docId),
          accessHash: toLong(accessHash),
          fileReference: fileRef,
        },
      } as any)
      return Boolean(res)
    } catch (err: any) {
      Logger.warn(`[AccountManager] removeStickerFromSet error:`, err?.message || err)
      return false
    }
  }

  public async changeStickerPosition(
    accountId: string,
    docId: string,
    accessHash: string,
    position: number,
    fileReferenceHex?: string
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const fileRef = fileReferenceHex ? Buffer.from(fileReferenceHex, 'hex') : Buffer.alloc(0)
      const res: any = await holder.client.call({
        _: 'stickers.changeStickerPosition',
        sticker: {
          _: 'inputDocument',
          id: toLong(docId),
          accessHash: toLong(accessHash),
          fileReference: fileRef,
        },
        position: Math.max(0, position),
      } as any)
      return Boolean(res)
    } catch (err: any) {
      Logger.warn(`[AccountManager] changeStickerPosition error:`, err?.message || err)
      return false
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

    const inputPeer = await this.resolveInputPeer(accountId, chatId)
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

  public async getAllStories(accountId: string): Promise<ActiveStoriesResult> {
    const empty: ActiveStoriesResult = { peers: [], totalCount: 0, hasMore: false }
    const holder = this.clients.get(accountId)
    if (!holder?.client) return empty

    try {
      const collected = new Map<string, ActiveStoryPeer>()
      let state: string | undefined
      let next = false
      let hasMore = false

      // The initial response is normally enough for the story rings, but follow
      // Telegram's pagination protocol for accounts that follow many peers.
      for (let page = 0; page < 5; page++) {
        const request: any = { _: 'stories.getAllStories' }
        if (next && state) {
          request.next = true
          request.state = state
        }

        const res: any = await holder.client.call(request)
        state = res.state || state
        hasMore = Boolean(res.hasMore)

        const users = new Map<string, any>(
          (res.users || []).map((user: any) => [String(user.id), user])
        )
        const chats = new Map<string, any>(
          (res.chats || []).map((chat: any) => [String(chat.id), chat])
        )

        for (const peerStories of res.peerStories || []) {
          const rawPeer = peerStories?.peer
          if (!rawPeer) continue

          let peerId = ''
          let entityId = ''
          let isSelf = false

          if (rawPeer._ === 'peerUser') {
            entityId = String(rawPeer.userId)
            peerId = entityId
          } else if (rawPeer._ === 'peerChat') {
            entityId = String(rawPeer.chatId)
            peerId = `-${entityId}`
          } else if (rawPeer._ === 'peerChannel') {
            entityId = String(rawPeer.channelId)
            peerId = `-100${entityId}`
          } else if (rawPeer._ === 'peerSelf') {
            entityId = String(holder.info.id)
            peerId = entityId
            isSelf = true
          } else {
            continue
          }

          // Telegram normally returns our own stories as peerSelf, but some
          // layers/accounts return peerUser with our own ID instead.
          if (rawPeer._ === 'peerUser' && entityId === String(holder.info.id)) {
            isSelf = true
          }

          const stories = (peerStories.stories || []).filter(
            (story: any) => story?._ === 'storyItem'
          )
          if (stories.length === 0) continue

          const entity = users.get(entityId) || chats.get(entityId)
          const fullName = entity
            ? [entity.firstName, entity.lastName].filter(Boolean).join(' ')
            : ''
          const selfName = [holder.info.firstName, holder.info.lastName]
            .filter(Boolean)
            .join(' ')
          const title =
            (isSelf ? selfName || entity?.title : fullName || entity?.title) ||
            entity?.username ||
            (isSelf ? 'My Story' : `Story ${peerId}`)

          const storyIds = stories.map((story: any) => Number(story.id) || 0)
          const maxStoryId = Math.max(...storyIds)
          const maxReadId =
            peerStories.maxReadId !== undefined
              ? Number(peerStories.maxReadId)
              : undefined
          const hasUnread = isSelf
            ? false
            : maxReadId === undefined || storyIds.some((id: number) => id > maxReadId)

          collected.set(peerId, {
            peerId,
            title,
            username: entity?.username || (isSelf ? holder.info.username : undefined),
            maxStoryId,
            maxReadId,
            storyCount: stories.length,
            hasUnread,
            isSelf,
          })
        }

        if (!hasMore || !state) break
        next = true
      }

      // Keep the server's ordering within each bucket: own stories first,
      // then peers with unseen stories, then fully-read peers.
      const peers = [...collected.values()]
      const bucket = (peer: ActiveStoryPeer) => (peer.isSelf ? 0 : peer.hasUnread ? 1 : 2)
      peers.sort((a, b) => bucket(a) - bucket(b))

      return {
        peers,
        totalCount: peers.length,
        hasMore,
      }
    } catch (err: any) {
      Logger.warn(`[AccountManager] getAllStories error for ${accountId}:`, err?.message || err)
      return empty
    }
  }

  public async getPeerStories(accountId: string, peerId: string): Promise<PeerStoriesPayload | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null

    try {
      const inputPeer = await this.resolveInputPeer(accountId, peerId)
      const res: any = await holder.client.call({
        _: 'stories.getPeerStories',
        peer: inputPeer,
      })

      const stories = (res.stories?.stories || [])
        .filter((s: any) => s?._ === 'storyItem')
        .map((s: any) => {
          const media = s.media
          const mediaIsPhoto = media?._ === 'messageMediaPhoto' && Boolean(media.photo)
          const mediaIsVideo =
            media?._ === 'messageMediaDocument' &&
            Boolean(media.document) &&
            ((Array.isArray(media.document.attributes) &&
              media.document.attributes.some(
                (a: any) =>
                  a?._ === 'documentAttributeVideo' ||
                  a?._ === 'documentAttributeAnimated'
              )) ||
              /^video\//i.test(media.document.mimeType || ''))

          const privacy: StoryItemPayload['privacy'] = s.closeFriends
            ? 'close_friends'
            : s.contacts
              ? 'contacts'
              : s.selectedContacts
                ? 'selected_contacts'
                : s.public
                  ? 'everyone'
                  : undefined

          return {
            id: s.id,
            date: s.date,
            expireDate: s.expireDate,
            caption: s.caption || undefined,
            isVideo: mediaIsVideo,
            mediaType: mediaIsPhoto ? 'photo' : mediaIsVideo ? 'video' : 'unsupported',
            hasPhoto: mediaIsPhoto,
            hasVideo: mediaIsVideo,
            isPinned: Boolean(s.pinned),
            isPublic: Boolean(s.public),
            isOut: Boolean(s.out),
            privacy,
            forbidForwards: Boolean(s.noforwards),
            viewsCount: s.views?.viewsCount,
            forwardsCount: s.views?.forwardsCount,
            reactionsCount: s.views?.reactionsCount,
            hasViewers: Boolean(s.views?.hasViewers),
          } satisfies StoryItemPayload
        })

      return {
        peerId,
        maxReadId: res.stories?.maxReadId,
        stories,
      }
    } catch (err: any) {
      Logger.warn(`[AccountManager] getPeerStories error for ${peerId}:`, err?.message || err)
      return null
    }
  }

  public async getStoryMedia(
    accountId: string,
    peerId: string,
    storyId: number
  ): Promise<StoryMediaResult> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return { error: 'Account is not connected.' }

    try {
      const inputPeer = await this.resolveInputPeer(accountId, peerId)
      const res: any = await holder.client.call({
        _: 'stories.getStoriesByID',
        peer: inputPeer,
        id: [storyId],
      })

      const story = (res?.stories || []).find(
        (s: any) => s?._ === 'storyItem' && Number(s.id) === Number(storyId)
      )
      const media = story?.media
      if (!media || media._ === 'messageMediaEmpty') {
        return { error: 'This story has no downloadable media.' }
      }

      let mediaLocation: any = null
      let mediaDcId: number | undefined
      let mediaFileSize: number | undefined
      let mimeType = ''
      let ext = '.bin'
      let isVideo = false

      if (media._ === 'messageMediaPhoto' && media.photo) {
        const photo = media.photo
        const photoSizes = Array.isArray(photo.sizes) ? photo.sizes : []
        let bestSize: any = null
        let bestArea = -1

        for (const size of photoSizes) {
          if (size?._ === 'photoStrippedSize' || size?._ === 'photoCachedSize') continue
          const area = Number(size?.w || 0) * Number(size?.h || 0)
          if (area > bestArea) {
            bestArea = area
            bestSize = size
          }
        }

        if (!photo.id || !photo.accessHash) {
          return { error: 'This story photo has no download location.' }
        }

        const progressiveSizes = Array.isArray(bestSize?.sizes) ? bestSize.sizes : []
        mediaFileSize = Number(
          progressiveSizes.length > 0
            ? progressiveSizes[progressiveSizes.length - 1]
            : bestSize?.size || 0
        ) || undefined
        mediaDcId = photo.dcId ? Number(photo.dcId) : undefined

        mediaLocation = {
          _: 'inputPhotoFileLocation',
          id: photo.id,
          accessHash: photo.accessHash,
          fileReference: photo.fileReference || Buffer.alloc(0),
          thumbSize: bestSize?.type || 'y',
        }
        mimeType = 'image/jpeg'
        ext = '.jpg'
      } else if (media._ === 'messageMediaDocument' && media.document) {
        const doc = media.document
        const hasVideoAttribute =
          Array.isArray(doc.attributes) &&
          doc.attributes.some(
            (a: any) =>
              a?._ === 'documentAttributeVideo' || a?._ === 'documentAttributeAnimated'
          )
        isVideo = hasVideoAttribute || /^video\//i.test(doc.mimeType || '')
        mimeType = doc.mimeType || ''

        if (!doc.id || !doc.accessHash) {
          return { error: 'This story document has no download location.' }
        }

        mediaLocation = {
          _: 'inputDocumentFileLocation',
          id: doc.id,
          accessHash: doc.accessHash,
          fileReference: doc.fileReference || Buffer.alloc(0),
          thumbSize: '',
        }
        mediaDcId = doc.dcId ? Number(doc.dcId) : undefined
        mediaFileSize = Number(doc.size || 0) || undefined

        if (/^video\/mp4/i.test(mimeType)) ext = '.mp4'
        else if (/^video\/webm/i.test(mimeType)) ext = '.webm'
        else if (/^video\//i.test(mimeType)) ext = '.video'
        else if (/^image\/jpe?g/i.test(mimeType)) ext = '.jpg'
        else if (/^image\/png/i.test(mimeType)) ext = '.png'
        else if (/^image\/webp/i.test(mimeType)) ext = '.webp'
        else if (/^image\/gif/i.test(mimeType)) ext = '.gif'
        else if (/^image\//i.test(mimeType)) ext = '.img'
        else ext = '.bin'
      } else {
        return { error: 'Unsupported story media type.' }
      }

      const safePeer = String(peerId).replace(/[^a-zA-Z0-9_-]/g, '_')
      const cachePrefix = `story_${accountId}_${safePeer}_${Number(storyId)}`
      let cachedFile: string | null = null

      try {
        const existing = fs
          .readdirSync(this.mediaDir)
          .find((f) => f.startsWith(`${cachePrefix}.`))
        if (existing) {
          const existingPath = path.join(this.mediaDir, existing)
          if (fs.statSync(existingPath).size > 0) {
            cachedFile = existingPath
          } else {
            try {
              fs.unlinkSync(existingPath)
            } catch (_) {}

            // Proceed to a fresh download instead of reusing an empty cache entry.
          }
        }
      } catch (_) {
        // media dir may not exist yet
      }

      if (!cachedFile) {
        cachedFile = path.join(this.mediaDir, `${cachePrefix}${ext}`)
        await holder.client.downloadToFile(cachedFile, mediaLocation, {
          partSize: 512,
          dcId: mediaDcId,
          fileSize: mediaFileSize,
        } as any)
      }

      if (!fs.existsSync(cachedFile) || fs.statSync(cachedFile).size === 0) {
        return { error: 'Story media download failed.' }
      }

      return {
        mediaUrl: `guidegram-media://${cachedFile.replace(/\\/g, '/')}`,
        isVideo,
        mimeType: mimeType || undefined,
      }
    } catch (err: any) {
      Logger.warn(
        `[AccountManager] getStoryMedia error for ${peerId}/${storyId}:`,
        err?.message || err
      )
      return { error: err?.message || 'Failed to load story media.' }
    }
  }

  public async readStories(accountId: string, peerId: string, maxId: number): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false

    try {
      const inputPeer = await this.resolveInputPeer(accountId, peerId)
      await holder.client.call({
        _: 'stories.readStories',
        peer: inputPeer,
        maxId,
      })
      return true
    } catch (err: any) {
      Logger.warn(`[AccountManager] readStories error for ${peerId}:`, err?.message || err)
      return false
    }
  }

  public async sendStory(
    accountId: string,
    filePath: string,
    options?: SendStoryOptions
  ): Promise<SendStoryResult> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) throw new Error('Account is not connected.')

    let fileStat: fs.Stats
    try {
      fileStat = await fs.promises.stat(filePath)
    } catch (_) {
      throw new Error('STORY_FILE_NOT_FOUND')
    }
    if (!fileStat.isFile() || fileStat.size <= 0) {
      throw new Error('STORY_FILE_NOT_FOUND')
    }

    const caption = options?.caption?.trim() || ''
    if (caption.length > 2048) throw new Error('STORY_CAPTION_TOO_LONG')

    const extension = path.extname(filePath).toLowerCase()
    const videoExtensions = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi'])
    const isVideo = options?.isVideo ?? videoExtensions.has(extension)

    let media: any
    if (isVideo) {
      const duration = Math.round(Number(options?.duration) || 0)
      const width = Math.round(Number(options?.width) || 0)
      const height = Math.round(Number(options?.height) || 0)
      if (duration <= 0 || width <= 0 || height <= 0) {
        throw new Error('STORY_VIDEO_METADATA_MISSING')
      }

      media = InputMedia.video(`file:${filePath}`, {
        duration,
        width,
        height,
        supportsStreaming: true,
      })
    } else {
      media = InputMedia.photo(`file:${filePath}`)
    }

    const privacyRules =
      options?.privacy === 'contacts'
        ? [{ _: 'inputPrivacyValueAllowContacts' }]
        : options?.privacy === 'close_friends'
          ? [{ _: 'inputPrivacyValueAllowCloseFriends' }]
          : [{ _: 'inputPrivacyValueAllowAll' }]

    const period = Math.round(Number(options?.period) || 86400)

    try {
      const story: any = await holder.client.sendStory({
        media,
        caption: caption || undefined,
        privacyRules: privacyRules as any,
        pinned: Boolean(options?.pinned),
        forbidForwards: Boolean(options?.forbidForwards),
        period,
      })

      const raw = story?.raw || {}
      const date = Number(raw.date) || Math.floor(Date.now() / 1000)
      return {
        id: Number(raw.id) || 0,
        date,
        expireDate: Number(raw.expireDate) || date + period,
        isVideo: Boolean(isVideo),
      }
    } catch (err: any) {
      const message = String(err?.message || err || '')
      const upper = message.toUpperCase()

      Logger.warn(`[AccountManager] sendStory error:`, message)

      if (upper.includes('PREMIUM_ACCOUNT_REQUIRED')) {
        throw new Error('STORY_PREMIUM_REQUIRED')
      }
      const floodMatch = upper.match(/FLOOD_WAIT_(\d+)/)
      if (floodMatch) {
        throw new Error(`STORY_FLOOD_WAIT_${floodMatch[1]}`)
      }
      if (upper.includes('STORY_VIDEO_TOO_LONG') || upper.includes('VIDEO_TOO_LONG')) {
        throw new Error('STORY_VIDEO_TOO_LONG')
      }
      if (upper.includes('STORY_PERIOD_INVALID') || upper.includes('PERIOD_INVALID')) {
        throw new Error('STORY_PERIOD_INVALID')
      }
      if (upper.includes('FILE_TOO_LARGE') || upper.includes('FILE_PART_TOO_BIG')) {
        throw new Error('STORY_FILE_TOO_LARGE')
      }
      if (
        upper.includes('PHOTO_EXT_INVALID') ||
        upper.includes('VIDEO_FILE_INVALID') ||
        upper.includes('MEDIA_FILE_INVALID') ||
        upper.includes('MEDIA_EMPTY') ||
        upper.includes('FILE_PART_')
      ) {
        throw new Error('STORY_MEDIA_INVALID')
      }

      throw err
    }
  }

  public async deleteStory(
    accountId: string,
    storyId: number,
    peerId?: string
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false

    try {
      const targetPeer =
        !peerId || peerId === accountId || peerId === String(holder.info.id)
          ? { _: 'inputPeerSelf' }
          : await this.resolveInputPeer(accountId, peerId)

      await holder.client.call({
        _: 'stories.deleteStories',
        peer: targetPeer,
        id: [Number(storyId)],
      } as any)

      // Remove cached copies so a deleted story cannot reappear from disk.
      try {
        const suffix = `_${Number(storyId)}.`
        for (const file of fs.readdirSync(this.mediaDir)) {
          if (file.startsWith(`story_${accountId}_`) && file.includes(suffix)) {
            try {
              fs.unlinkSync(path.join(this.mediaDir, file))
            } catch (_) {}
          }
        }
      } catch (_) {
        // media cache may not exist
      }

      return true
    } catch (err: any) {
      Logger.warn(
        `[AccountManager] deleteStory error for ${peerId || 'self'}/${storyId}:`,
        err?.message || err
      )
      return false
    }
  }

  public async canSendStory(accountId: string, peerId?: string): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const targetPeer =
        !peerId || peerId === 'self' || peerId === accountId
          ? { _: 'inputPeerSelf' }
          : await this.resolveInputPeer(accountId, peerId)
      const res: any = await holder.client.call({
        _: 'stories.canSendStory',
        peer: targetPeer,
      } as any)
      return Boolean(res)
    } catch (err: any) {
      Logger.warn(`[AccountManager] canSendStory error:`, err?.message || err)
      return false
    }
  }

  public async exportStoryLink(
    accountId: string,
    peerId: string,
    storyId: number
  ): Promise<string | null> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const targetPeer =
        !peerId || peerId === 'self' || peerId === accountId
          ? { _: 'inputPeerSelf' }
          : await this.resolveInputPeer(accountId, peerId)
      const res: any = await holder.client.call({
        _: 'stories.exportStoryLink',
        peer: targetPeer,
        id: Number(storyId),
      } as any)
      return res?.link || null
    } catch (err: any) {
      Logger.warn(`[AccountManager] exportStoryLink error:`, err?.message || err)
      return null
    }
  }

  public async toggleStoryPinned(
    accountId: string,
    storyIds: number[],
    pinned: boolean,
    peerId?: string
  ): Promise<number[]> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return []
    try {
      const targetPeer =
        !peerId || peerId === 'self' || peerId === accountId
          ? { _: 'inputPeerSelf' }
          : await this.resolveInputPeer(accountId, peerId)
      const res: any = await holder.client.call({
        _: 'stories.togglePinned',
        peer: targetPeer,
        id: storyIds.map(Number),
        pinned: Boolean(pinned),
      } as any)
      return Array.isArray(res) ? res.map(Number) : []
    } catch (err: any) {
      Logger.warn(`[AccountManager] toggleStoryPinned error:`, err?.message || err)
      return []
    }
  }

  public async getStoryViewsList(
    accountId: string,
    storyId: number,
    options?: { offset?: string; limit?: number; peerId?: string }
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const targetPeer =
        !options?.peerId || options.peerId === 'self' || options.peerId === accountId
          ? { _: 'inputPeerSelf' }
          : await this.resolveInputPeer(accountId, options.peerId)
      const res: any = await holder.client.call({
        _: 'stories.getStoryViewsList',
        peer: targetPeer,
        id: Number(storyId),
        offset: options?.offset || '',
        limit: options?.limit || 50,
      } as any)
      return res
    } catch (err: any) {
      Logger.warn(`[AccountManager] getStoryViewsList error:`, err?.message || err)
      return null
    }
  }

  public async checkChatlistInvite(accountId: string, slug: string): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const cleanSlug = slug.replace(/^https?:\/\/t\.me\/addlist\//, '').trim()
      const res: any = await holder.client.call({
        _: 'chatlists.checkChatlistInvite',
        slug: cleanSlug,
      } as any)
      return res
    } catch (err: any) {
      Logger.warn(`[AccountManager] checkChatlistInvite error:`, err?.message || err)
      return null
    }
  }

  public async joinChatlistInvite(
    accountId: string,
    slug: string,
    peerIds: string[]
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const cleanSlug = slug.replace(/^https?:\/\/t\.me\/addlist\//, '').trim()
      const peers = await Promise.all(peerIds.map((id) => this.resolveInputPeer(accountId, id)))
      const res: any = await holder.client.call({
        _: 'chatlists.joinChatlistInvite',
        slug: cleanSlug,
        peers,
      } as any)
      return Boolean(res)
    } catch (err: any) {
      Logger.warn(`[AccountManager] joinChatlistInvite error:`, err?.message || err)
      return false
    }
  }

  public async sendWebViewData(
    accountId: string,
    botPeerId: string,
    buttonText: string,
    data: string
  ): Promise<boolean> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return false
    try {
      const inputPeer: any = await this.resolveInputPeer(accountId, botPeerId)
      const botUser =
        inputPeer._ === 'inputPeerUser'
          ? { _: 'inputUser', userId: inputPeer.userId, accessHash: inputPeer.accessHash }
          : { _: 'inputUserSelf' }
      const randomId = Math.floor(Math.random() * 1000000000)
      const res: any = await holder.client.call({
        _: 'messages.sendWebViewData',
        bot: botUser,
        random_id: randomId,
        button_text: buttonText,
        data,
      } as any)
      return Boolean(res)
    } catch (err: any) {
      Logger.warn(`[AccountManager] sendWebViewData error:`, err?.message || err)
      return false
    }
  }

  public async getInlineBotResults(
    accountId: string,
    botUsername: string,
    query: string,
    offset?: string,
    peerId?: string
  ): Promise<any> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return null
    try {
      const botPeer: any = await this.resolveInputPeer(accountId, botUsername)
      const botUser =
        botPeer._ === 'inputPeerUser'
          ? { _: 'inputUser', userId: botPeer.userId, accessHash: botPeer.accessHash }
          : { _: 'inputUserSelf' }
      const targetPeer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      const res: any = await holder.client.call({
        _: 'messages.getInlineBotResults',
        bot: botUser,
        peer: targetPeer,
        query: query || '',
        offset: offset || '',
      } as any)
      return res
    } catch (err: any) {
      Logger.warn(`[AccountManager] getInlineBotResults error:`, err?.message || err)
      return null
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

  public async getEmojiStatuses(accountId: string): Promise<EmojiStatusesResult> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) {
      throw new Error('Telegram client is not connected.')
    }

    const mapStatuses = (res: any, source: EmojiStatusSource): EmojiStatusItem[] => {
      if (res?._ !== 'account.emojiStatuses' || !Array.isArray(res.statuses)) return []
      const items: EmojiStatusItem[] = []
      for (const status of res.statuses) {
        if (status?._ === 'emojiStatusCollectible') {
          if (!status.documentId) continue
          items.push({
            documentId: String(status.documentId),
            source,
            collectibleId: status.collectibleId ? String(status.collectibleId) : undefined,
            title: status.title || undefined,
            slug: status.slug || undefined,
            until: status.until || undefined,
          })
        } else if (status?._ === 'emojiStatus' && status.documentId) {
          items.push({
            documentId: String(status.documentId),
            source,
            until: status.until || undefined,
          })
        }
      }
      return items
    }

    const [defaults, recent, collectible, fullUser] = await Promise.all([
      holder.client.call({
        _: 'account.getDefaultEmojiStatuses',
        hash: toLong(0),
      }),
      holder.client.call({
        _: 'account.getRecentEmojiStatuses',
        hash: toLong(0),
      }),
      holder.client.call({
        _: 'account.getCollectibleEmojiStatuses',
        hash: toLong(0),
      }),
      holder.client.call({
        _: 'users.getFullUser',
        id: { _: 'inputUserSelf' },
      }).catch(() => null),
    ])

    const current: any =
      (fullUser as any)?.users?.[0]?.emojiStatus || null
    const isCollectible = current?._ === 'emojiStatusCollectible'

    return {
      currentDocumentId: current?.documentId ? String(current.documentId) : undefined,
      currentCollectibleId: isCollectible && current?.collectibleId
        ? String(current.collectibleId)
        : undefined,
      currentUntil: current?.until || undefined,
      default: mapStatuses(defaults, 'default'),
      recent: mapStatuses(recent, 'recent'),
      collectible: mapStatuses(collectible, 'collectible'),
    }
  }

  public async setEmojiStatus(
    accountId: string,
    options: SetEmojiStatusOptions
  ): Promise<void> {
    const holder = this.clients.get(accountId)
    if (!holder?.client) {
      throw new Error('Telegram client is not connected.')
    }

    let emojiStatus: any = { _: 'emojiStatusEmpty' }
    if (options.documentId) {
      if (options.collectibleId) {
        emojiStatus = {
          _: 'inputEmojiStatusCollectible',
          collectibleId: toLong(options.collectibleId),
          ...(options.until ? { until: options.until } : {}),
        }
      } else {
        emojiStatus = {
          _: 'emojiStatus',
          documentId: toLong(options.documentId),
          ...(options.until ? { until: options.until } : {}),
        }
      }
    }

    await holder.client.call({
      _: 'account.updateEmojiStatus',
      emojiStatus,
    })
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
        if (chat?.photo?.big) {
          this.peerBigPhotos.set(`${accountId}_${chatId}`, chat.photo.big)
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

        let replyMarkup: MessageItem['replyMarkup'] = undefined
        const rawMarkup = msg.raw?.replyMarkup || msg.raw?.reply_markup
        if (rawMarkup?._ === 'replyKeyboardHide') {
          replyMarkup = { rows: [], _: 'replyKeyboardHide' }
        } else if ((rawMarkup?._ === 'replyInlineMarkup' || rawMarkup?._ === 'replyKeyboardMarkup') && Array.isArray(rawMarkup.rows)) {
          const rows: InlineButton[][] = []
          for (let rIdx = 0; rIdx < rawMarkup.rows.length; rIdx++) {
            const row = rawMarkup.rows[rIdx]
            const btnRow: InlineButton[] = []
            if (row?.buttons && Array.isArray(row.buttons)) {
              for (let cIdx = 0; cIdx < row.buttons.length; cIdx++) {
                const b = row.buttons[cIdx]
                let btnStyle: 'primary' | 'danger' | 'success' | undefined = undefined
                const rawStyle = b.style || (b as any).theme || (b as any).color
                if (rawStyle) {
                  const sName = typeof rawStyle === 'string' ? rawStyle : (rawStyle._ || rawStyle.type || '')
                  if (/success|green/i.test(sName)) btnStyle = 'success'
                  else if (/danger|red/i.test(sName)) btnStyle = 'danger'
                  else if (/primary|blue/i.test(sName)) btnStyle = 'primary'
                }
                const iconCustomEmojiId = b.iconCustomEmojiId
                  ? String(b.iconCustomEmojiId)
                  : ((b as any).icon_custom_emoji_id ? String((b as any).icon_custom_emoji_id) : undefined)

                if (b._ === 'keyboardButtonRequestPhone') {
                  btnRow.push({ text: b.text, type: 'request_phone', _: 'keyboardButtonRequestPhone', style: btnStyle, iconCustomEmojiId })
                } else if (b._ === 'keyboardButtonRequestGeoLocation') {
                  btnRow.push({ text: b.text, type: 'request_location', _: 'keyboardButtonRequestGeoLocation', style: btnStyle, iconCustomEmojiId })
                } else if (b._ === 'keyboardButtonRequestPoll') {
                  btnRow.push({ text: b.text, type: 'request_poll', _: 'keyboardButtonRequestPoll', style: btnStyle, iconCustomEmojiId })
                } else if (b._ === 'keyboardButtonUrl') {
                  btnRow.push({ text: b.text, url: b.url, _: 'keyboardButtonUrl', style: btnStyle, iconCustomEmojiId })
                } else if (b._ === 'keyboardButtonCallback') {
                  const b64 = Buffer.from(b.data).toString('base64')
                  this.botButtonCache.set(`${chatId}_${msg.id}_${rIdx}_${cIdx}`, Buffer.from(b.data))
                  btnRow.push({ text: b.text, data: b64, _: 'keyboardButtonCallback', style: btnStyle, iconCustomEmojiId })
                } else if (b._ === 'keyboardButtonWebView' || b._ === 'keyboardButtonSimpleWebView') {
                  btnRow.push({ text: b.text, url: b.url, webAppUrl: b.url, isMiniApp: true, _: b._, style: btnStyle, iconCustomEmojiId })
                } else if (b.text) {
                  btnRow.push({ text: b.text, _: b._ || 'keyboardButton', style: btnStyle, iconCustomEmojiId })
                }
              }
            }
            if (btnRow.length > 0) rows.push(btnRow)
          }
          if (rows.length > 0 || rawMarkup._ === 'replyKeyboardMarkup') {
            replyMarkup = {
              rows,
              _: rawMarkup._,
              resize: Boolean(rawMarkup.resize || rawMarkup.resize_keyboard),
              singleUse: Boolean(rawMarkup.single_use || rawMarkup.one_time_keyboard),
              selective: Boolean(rawMarkup.selective),
              persistent: Boolean(rawMarkup.persistent),
              placeholder: rawMarkup.placeholder,
            }
          }
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
          if (msg.sender.photo.small) {
            this.peerPhotos.set(`${accountId}_${senderIdStr}`, msg.sender.photo.small)
          } else if (msg.sender.photo._ === 'userProfilePhoto' && msg.sender.photo.photoId) {
            const accessHash = msg.sender.accessHash || this.peerAccessHashes.get(`${accountId}_${senderIdStr}`) || Long.ZERO
            this.peerPhotos.set(`${accountId}_${senderIdStr}`, {
              _: 'inputPeerPhotoFileLocation',
              peer: { _: 'inputPeerUser', userId: msg.sender.id, accessHash },
              photoId: msg.sender.photo.photoId,
              big: false,
            })
          }
        }
        const senderAvatarUrl = senderIdStr
          ? this.avatarCache.get(`${accountId}_${senderIdStr}`) || this.thumbCache.get(`${accountId}_${senderIdStr}`) || extractStrippedThumb(msg.sender?.photo)
          : undefined
        const senderName = msg.sender?.displayName || msg.sender?.title || msg.sender?.firstName || ''

        const isService = msg.raw?._ === 'messageService' || Boolean(msg.action)
        let text = msg.text || ''
        let actionType: ServiceActionType | undefined = undefined
        let actionData: ServiceActionData | undefined = undefined

        if (isService) {
          const rawAction = msg.raw?.action || msg.action
          if (rawAction) {
            const parsed = parseMessageAction(rawAction, msg.raw?.fromId, undefined, undefined, senderName)
            text = parsed.text
            actionType = parsed.actionType
            actionData = parsed.actionData
          }
        }

        const richMsgPayload = extractRichMessagePayload(msg.raw || msg)
        let richMessage = richMsgPayload
        if (!richMessage && text) {
          const parsedTable = parseMarkdownTable(text)
          if (parsedTable) {
            richMessage = { blocks: [parsedTable], rtl: true }
          }
        }

        const item: MessageItem = {
          id: msg.id,
          chatId,
          accountId,
          text,
          date: msg.date ? Math.floor(msg.date.getTime() / 1000) : Math.floor(Date.now() / 1000),
          isOutgoing: msg.isOutgoing,
          senderName,
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
          richMessage,
          entities,
          isService,
          actionType,
          actionData,
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

    client.onUserTyping.add((update: any) => {
      try {
        const chatId = update.chatId != null ? String(update.chatId) : ''
        if (!chatId) return
        this.onEventCallback?.('telegram:user-typing', {
          accountId,
          chatId,
          userId: String(update.userId),
          status: update.status,
          threadId: update.threadId ?? null,
        })
      } catch (e) {
        Logger.warn('[AccountManager] Error processing user typing update:', e)
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
        if (
          update._ === 'updateReadHistoryInbox' ||
          update._ === 'updateReadChannelInbox' ||
          update._ === 'updateDialogUnreadMark'
        ) {
          let peerId = ''
          const peer = update.peer?.peer || update.peer
          if (peer) {
            if (peer.userId) {
              peerId = peer.userId.toString()
            } else if (peer.chatId) {
              peerId = `-${peer.chatId}`
            } else if (peer.channelId) {
              const chStr = peer.channelId.toString()
              peerId = chStr.startsWith('-100') ? chStr : (chStr.startsWith('-') ? `-100${chStr.slice(1)}` : `-100${chStr}`)
            }
          } else if (update.channelId) {
            const chStr = update.channelId.toString()
            peerId = chStr.startsWith('-100') ? chStr : (chStr.startsWith('-') ? `-100${chStr.slice(1)}` : `-100${chStr}`)
          }

          if (peerId) {
            const stillUnreadCount =
              update._ === 'updateDialogUnreadMark'
                ? (update.unread ? 1 : 0)
                : update.stillUnreadCount

            this.onEventCallback?.('telegram:read-history', {
              accountId,
              chatId: peerId,
              maxId: update.maxId,
              stillUnreadCount,
            })

            // Immediately synchronize local dialogs cache so that next launch/render has correct count
            try {
              const cached = this.store.loadDialogsCache(accountId)
              if (cached && cached.length > 0) {
                let changed = false
                const next = cached.map((d) => {
                  if (d.id === peerId) {
                    const nextCount = typeof stillUnreadCount === 'number' ? stillUnreadCount : 0
                    if (d.unreadCount !== nextCount) {
                      changed = true
                      return {
                        ...d,
                        unreadCount: nextCount,
                        readInboxMaxId: update.maxId ? Math.max(d.readInboxMaxId || 0, update.maxId) : d.readInboxMaxId,
                      }
                    }
                  }
                  return d
                })
                if (changed) {
                  this.store.saveDialogsCache(accountId, next)
                }
              }
            } catch (_) {}
          }
        } else if (
          update._ === 'updateReadHistoryOutbox' ||
          update._ === 'updateReadChannelOutbox'
        ) {
          let peerId = ''
          const peer = update.peer?.peer || update.peer
          if (peer) {
            if (peer.userId) {
              peerId = peer.userId.toString()
            } else if (peer.chatId) {
              peerId = `-${peer.chatId}`
            } else if (peer.channelId) {
              const chStr = peer.channelId.toString()
              peerId = chStr.startsWith('-100') ? chStr : (chStr.startsWith('-') ? `-100${chStr.slice(1)}` : `-100${chStr}`)
            }
          } else if (update.channelId) {
            const chStr = update.channelId.toString()
            peerId = chStr.startsWith('-100') ? chStr : (chStr.startsWith('-') ? `-100${chStr.slice(1)}` : `-100${chStr}`)
          }

          if (peerId) {
            this.onEventCallback?.('telegram:read-outbox', {
              accountId,
              chatId: peerId,
              maxId: update.maxId,
            })

            try {
              const cached = this.store.loadDialogsCache(accountId)
              if (cached && cached.length > 0) {
                let changed = false
                const next = cached.map((d) => {
                  if (d.id === peerId) {
                    changed = true
                    return {
                      ...d,
                      readOutboxMaxId: Math.max(d.readOutboxMaxId || 0, update.maxId || 0),
                      lastMessageRead: d.lastMessageId ? d.lastMessageId <= (update.maxId || 0) : true,
                    }
                  }
                  return d
                })
                if (changed) {
                  this.store.saveDialogsCache(accountId, next)
                }
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    })
  }
}

