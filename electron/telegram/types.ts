export type ProxyType = 'socks5' | 'http' | 'mtproto'

export interface ProxyConfig {
  id: string
  name: string
  enabled: boolean
  type: ProxyType
  host: string
  port: number
  username?: string
  password?: string
  secret?: string // for MTProto proxy
  pingMs?: number
  lastChecked?: number
  failCount?: number
  channelSource?: string
  isAutoHarvested?: boolean
}

export interface AutoHarvestStatus {
  enabled: boolean
  lastScanTime?: number
  scannedChannels: string[]
  healthyCount: number
  totalHarvested: number
  isScanning: boolean
}

export interface WarpStatus {
  enabled: boolean
  connected: boolean
  clientIp?: string
  endpoint?: string
  pingMs?: number
  port?: number
  bytesSent?: number
  bytesReceived?: number
  error?: string
}

export interface QrTokenPayload {
  url: string
  qrDataUrl: string
  expires: number
}

export type AccountStatus = 'connected' | 'connecting' | 'disconnected' | 'needs_auth'

export interface AccountInfo {
  id: string
  phone: string
  firstName: string
  lastName?: string
  username?: string
  avatarUrl?: string
  status: AccountStatus
  unreadTotal: number
  proxyConfig?: ProxyConfig
  isPremium?: boolean
  isBot?: boolean
  sessionString?: string
  deviceProfile?: {
    deviceModel: string
    systemVersion: string
    appVersion: string
    systemLangCode?: string
    langCode?: string
  }
}

export interface MessageReactionItem {
  emoji: string
  count: number
  chosen?: boolean
  isPaid?: boolean
}

export interface PinnedMessageItem {
  id: number
  text?: string
  senderName?: string
  date?: number
}

export interface UserExtras {
  customEmojiStatusId?: string
  personalChannelId?: string
  personalChannelTitle?: string
  stargiftsCount?: number
  birthday?: string
}

export interface DialogItem {
  id: string
  accountId: string
  title: string
  unreadCount: number
  readInboxMaxId?: number
  unreadMentionsCount?: number
  unreadSendersCount?: number
  isMuted?: boolean
  isUser: boolean
  isGroup: boolean
  isChannel: boolean
  isBroadcast?: boolean
  isBot: boolean
  isPinned: boolean
  isSavedMessages?: boolean
  pinnedMessage?: PinnedMessageItem
  canSendMessages?: boolean
  lastMessageText?: string
  lastMessageDate?: number
  avatarInitials?: string
  avatarUrl?: string
  username?: string
  folderId?: number
  customEmojiStatusId?: string
  isPremium?: boolean
  isForum?: boolean
  isSponsored?: boolean
  isSponsorChannel?: boolean
  draft?: DraftItem
}

export interface DraftItem {
  text: string
  date?: number
  replyToMsgId?: number
}

export interface InlineButton {
  text: string
  url?: string
  data?: string // callback_data
  webAppUrl?: string
  isMiniApp?: boolean
}

export interface WebPagePreview {
  url: string
  siteName?: string
  title?: string
  description?: string
  photoUrl?: string
  image?: string
  domain?: string
  favicon?: string
}

export type LinkPreviewData = WebPagePreview

export interface CustomEmojiPayload {
  format: 'lottie' | 'image' | 'video'
  data?: any // Lottie parsed JSON
  url?: string // image/video stream url
}

export interface ReplyInfo {
  replyToMsgId: number
  senderName?: string
  senderId?: string
  text?: string
  mediaType?: 'photo' | 'video' | 'document' | 'voice' | 'sticker' | 'webpage'
  mediaThumbnailUrl?: string
  isVoice?: boolean
  isSticker?: boolean
  strippedThumb?: string
}

export interface MessageEntityItem {
  type: string // 'bold' | 'italic' | 'code' | 'pre' | 'text_url' | 'url' | 'mention' | 'strike' | 'spoiler' | 'underline' | 'custom_emoji' | 'blockquote'
  offset: number
  length: number
  url?: string
  language?: string
  documentId?: string // for custom emoji
}

export interface MessageEditRevision {
  text: string
  date: number
  entities?: MessageEntityItem[]
  mediaType?: 'photo' | 'video' | 'document' | 'voice' | 'sticker' | 'webpage' | 'poll' | 'paid_media'
  mediaThumbnailUrl?: string
  strippedThumb?: string
}

export interface PollOptionItem {
  text: string
  option: string
  voters?: number
  chosen?: boolean
  correct?: boolean
}

export interface PollItem {
  id: string
  question: string
  answers: PollOptionItem[]
  closed: boolean
  publicVoters: boolean
  multipleChoice: boolean
  quiz: boolean
  totalVoters?: number
  solution?: string
}

export interface MessageItem {
  id: number
  chatId: string
  accountId: string
  senderId?: string
  senderName?: string
  senderUsername?: string
  senderAvatarUrl?: string
  text: string
  date: number
  isOutgoing: boolean
  isForwarded?: boolean
  forwardFromName?: string
  forwardFromId?: string
  forwardInfo?: {
    fromId?: string
    fromTitle?: string
    date?: number
  }
  replyToMsgId?: number
  replyTo?: ReplyInfo
  isSticker?: boolean
  isVoice?: boolean
  isRoundVideo?: boolean
  voiceWaveform?: number[]
  reactions?: MessageReactionItem[]
  mediaType?: 'photo' | 'video' | 'document' | 'voice' | 'sticker' | 'webpage' | 'poll' | 'paid_media'
  paidMediaStars?: number
  paidMediaCount?: number
  poll?: PollItem
  mediaUrl?: string
  mediaThumbnailUrl?: string
  strippedThumb?: string
  mediaFileName?: string
  mediaFileSize?: number // bytes
  mediaDuration?: number // seconds
  mediaWidth?: number
  mediaHeight?: number
  mediaMimeType?: string
  mediaFilePath?: string
  webPage?: WebPagePreview
  entities?: MessageEntityItem[]
  postAuthor?: string
  senderRank?: string
  ttlSeconds?: number
  isSilent?: boolean
  senderEmojiStatusId?: string
  senderColor?: number
  senderIsPremium?: boolean
  replyMarkup?: {
    rows: InlineButton[][]
  }
  // Local Anti-Delete & Edit History (64Gram Parity)
  isDeletedLocally?: boolean
  deletedAt?: number
  editDate?: number
  editHistory?: MessageEditRevision[]
}

export interface ChatDetails {
  id: string
  title: string
  firstName?: string
  lastName?: string
  phone?: string
  username?: string
  about?: string
  membersCount?: number
  isChannel: boolean
  isGroup: boolean
  isUser: boolean
  isBot: boolean
  avatarUrl?: string
  verified?: boolean
  fake?: boolean
  scam?: boolean
  notificationsEnabled?: boolean
  pinnedMessage?: PinnedMessageItem
  pinnedMessages?: PinnedMessageItem[]
  canSendMessages?: boolean
  canDeleteMessages?: boolean
  isCreator?: boolean
  permissionsMatrix?: {
    sendMessages: boolean
    sendMedia: boolean
    sendStickers: boolean
    sendPolls: boolean
    embedLinks: boolean
    inviteUsers: boolean
    pinMessages: boolean
    changeInfo: boolean
  }
  participants?: Array<{
    id: string
    name: string
    username?: string
    role: 'creator' | 'admin' | 'member'
    customTitle?: string
    avatarUrl?: string
  }>
  botInfo?: {
    isBot: boolean
    privacyMode: boolean
    commands?: Array<{ command: string; description: string }>
    menuButton?: {
      text?: string
      url?: string
    }
  }
  customEmojiStatusId?: string
  personalChannelId?: string
  personalChannelTitle?: string
  stargiftsCount?: number
  birthday?: string
  isBroadcast?: boolean
  isForum?: boolean
  isMuted?: boolean
  availableReactions?: string[]
  canReactWithStars?: boolean
  hasGroupCall?: boolean
  groupCallId?: string
  groupCallAccessHash?: string
  groupCallParticipantsCount?: number
}

export interface ContactItem {
  id: string
  firstName: string
  lastName?: string
  phone?: string
  username?: string
  avatarUrl?: string
}

export interface ForwardOptions {
  silent?: boolean
  withoutQuote?: boolean // Drops original author header
  caption?: string
  newCaption?: string
  dropMediaCaptions?: boolean
}

export type CloseAction = 'ask' | 'minimize' | 'quit'

export interface UpdateProgress {
  percent: number // 0 to 100
  transferredBytes: number
  totalBytes: number
  stage: 'downloading' | 'verifying' | 'extracting' | 'restarting'
}

export interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  releaseNotes?: string
  downloadUrl?: string
  publishedAt?: string
  hasUpdate: boolean
  isMandatory?: boolean
  isSecurityUpdate?: boolean
  severity?: 'critical' | 'normal'
}

export interface AutoDownloadConfig {
  enabled: boolean
  photosInPrivate: boolean
  photosInGroups: boolean
  photosInChannels: boolean
  videosInPrivate: boolean
  videosInGroups: boolean
  videosInChannels: boolean
  filesInPrivate: boolean
  filesInGroups: boolean
  filesInChannels: boolean
  maxPhotoSizeMB: number
  maxVideoSizeMB: number
  maxFileSizeMB: number
}

export interface AppConfig {
  apiId: number
  apiHash: string
  ghostMode: boolean
  theme: 'dark' | 'oled' | 'light'
  accounts: AccountInfo[]
  proxies: ProxyConfig[]
  // Window & Lifecycle Preferences
  closeAction: CloseAction
  rememberCloseAction: boolean
  // 64Gram Power Features
  showChatId: boolean
  showMessageId: boolean
  showSeconds: boolean
  showSenderAvatar: boolean
  quickForwardToSaved: boolean
  alwaysDeleteBoth: boolean
  keepDeletedMessagesLocally?: boolean
  markAllReadEnabled: boolean
  copyCallbackData: boolean
  disableAnimations?: boolean
  suppressLinkWarning?: boolean
  // Device & Privacy Spoofing
  antiFingerprinting?: boolean
  // Automatic Media & Data Download (Telegram Desktop Parity)
  autoDownload?: AutoDownloadConfig
  // Notifications & Sound
  notificationsEnabled?: boolean
  soundEnabled?: boolean
  // Downloads Management
  downloadsPath?: string
  alwaysAskDownloadPath?: boolean
  // Appearance & Chat Scale
  chatFontSize?: number
  bubbleRadius?: number
  bubblePadding?: number
}

export interface CacheStats {
  totalBytes: number
  formattedSize: string
  filesCount: number
}

export interface OpenFileDialogOptions {
  type?: 'media' | 'document' | 'audio'
  allowMultiple?: boolean
  title?: string
  filters?: Array<{ name: string; extensions: string[] }>
  properties?: Array<'openFile' | 'multiSelections'>
}

export interface OpenFileDialogResult {
  canceled: boolean
  filePaths: string[]
}

export interface SendMessageOptions {
  replyToMsgId?: number
  silent?: boolean
  scheduleDate?: number // unix timestamp in milliseconds
}

export interface SendMediaOptions {
  caption?: string
  replyToMsgId?: number
  isVoice?: boolean
  duration?: number
  forceDocument?: boolean
  uploadId?: string
  silent?: boolean
  scheduleDate?: number // unix timestamp in milliseconds
}

export interface UploadProgressPayload {
  accountId: string
  chatId: string
  uploadId: string
  progress: number
  filePath?: string
}

export interface DownloadProgressPayload {
  accountId: string
  chatId: string
  messageId: number
  progress: number
  bytesReceived: number
  totalBytes: number
}

export interface BotCallbackResult {
  message?: string
  alert?: boolean
  url?: string
}

export interface GlobalSearchResult {
  chats: DialogItem[]
  messages: MessageItem[]
}

export interface PortableLocatorInfo {
  executablePath: string
  dataPath: string
  version: string
  lastSeen: number
}

export interface ForumTopicItem {
  id: number
  title: string
  iconColor?: number
  iconEmojiId?: string
  topMessageId?: number
  readInboxMaxId?: number
  unreadCount?: number
  isClosed?: boolean
  isHidden?: boolean
  isPinned?: boolean
  date?: number
}

export interface ScheduledMessageItem {
  id: number
  text?: string
  date: number
  scheduledDate: number
  isOutgoing: boolean
  mediaType?: string
  replyToMsgId?: number
}

export interface StarGiftItem {
  id: string
  stars: number
  convertStars?: number
  fromId?: string
  fromName?: string
  message?: string
  date: number
  isAnonymous?: boolean
  isNameHidden?: boolean
  isSaved?: boolean
  canExportAt?: number
  transferStars?: number
}

export interface ActiveSessionItem {
  hash: string
  deviceModel: string
  platform: string
  systemVersion: string
  appName: string
  appVersion: string
  dateActive: number
  dateCreated: number
  ip: string
  country: string
  region: string
  isCurrent: boolean
  isOfficialApp?: boolean
  isPasswordPending?: boolean
}

export interface TranslatedTextResult {
  text: string
  toLang: string
}

export interface CloudFolderItem {
  id: number
  title: string
  emoticon?: string
  unreadCount?: number
  includePeerIds: string[]
  excludePeerIds: string[]
  pinnedPeerIds: string[]
  contacts?: boolean
  nonContacts?: boolean
  groups?: boolean
  broadcasts?: boolean
  bots?: boolean
  excludeMuted?: boolean
  excludeRead?: boolean
  excludeArchived?: boolean
}

export interface StickerItem {
  id: string
  accessHash: string
  fileReferenceHex: string
  mimeType: string
  emoticon: string
  isAnimated: boolean
  isVideo: boolean
  width?: number
  height?: number
}

export interface StickerSetItem {
  id: string
  accessHash: string
  title: string
  shortName: string
  count: number
  stickers: StickerItem[]
}

export interface StoryItemPayload {
  id: number
  date: number
  expireDate: number
  caption?: string
  mediaUrl?: string
  isVideo?: boolean
  viewsCount?: number
}

export interface PeerStoriesPayload {
  peerId: string
  maxReadId?: number
  stories: StoryItemPayload[]
}

export interface ChannelBoostStatus {
  level: number
  boosts: number
  currentLevelBoosts: number
  nextLevelBoosts?: number
  boostUrl: string
  myBoost?: boolean
}

export interface TwoFactorStatus {
  hasPassword: boolean
  hasRecovery: boolean
  hint?: string
  emailPattern?: string
}

export interface MyFullProfile {
  id: string
  firstName: string
  lastName?: string
  username?: string
  phone?: string
  bio?: string
  avatarUrl?: string
  isPremium?: boolean
  customEmojiStatusId?: string
  personalChannelId?: string
  personalChannelTitle?: string
  personalChannelUsername?: string
  chatAutomationBot?: string
  stargiftsCount?: number
  birthday?: string
  nameColor?: number
  blockedCount?: number
  activeSessionsCount?: number
  hasTwoStepAuth?: boolean
}

export interface PrivacySecuritySettings {
  twoStepVerification: boolean
  autoDeleteMessages: 'off' | '1d' | '1w' | '1m'
  localPasscode: boolean
  passkeys: boolean
  blockedUsersCount: number
  connectedWebsitesCount: number
  activeSessionsCount: number
  phoneNumberPrivacy: string
  lastSeenPrivacy: string
  profilePhotosPrivacy: string
  forwardedMessagesPrivacy: string
  callsPrivacy: string
  voiceMessagesPrivacy: string
  messagesPrivacy: string
  birthdayPrivacy: string
  giftsPrivacy: string
  bioPrivacy: string
  savedMusicPrivacy: string
  invitesPrivacy: string
}

export type SharedMediaFilterType = 'media' | 'files' | 'links' | 'audio' | 'voice'

export interface SharedMediaItem {
  id: number
  chatId: string
  accountId: string
  date: number
  type: 'photo' | 'video' | 'file' | 'audio' | 'voice' | 'link'
  caption?: string
  text?: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  thumbnailUrl?: string
  url?: string
  title?: string
  description?: string
  performer?: string
  duration?: number
  mediaObj?: any
}

export interface SharedMediaResponse {
  items: SharedMediaItem[]
  totalCount: number
  nextOffsetId: number
  hasMore: boolean
}

export type AdminLogActionType =
  | 'edit_message'
  | 'delete_message'
  | 'join'
  | 'leave'
  | 'invite'
  | 'ban'
  | 'unban'
  | 'admin_change'
  | 'pin_message'
  | 'change_info'
  | 'other'

export interface AdminLogItem {
  id: string
  date: number
  userId: string
  userName: string
  userAvatarUrl?: string
  actionType: AdminLogActionType
  actionTitle: string
  actionDescription?: string
  prevValue?: string
  newValue?: string
}

export interface AdminLogResponse {
  events: AdminLogItem[]
  hasMore: boolean
}

export interface BusinessWorkHoursItem {
  startMinute: number
  endMinute: number
}

export interface BusinessWorkHours {
  timezoneId: string
  weeklyOpen: BusinessWorkHoursItem[]
  openNow?: boolean
}

export interface BusinessLocation {
  address: string
  lat?: number
  long?: number
}

export interface BusinessIntro {
  title: string
  description: string
}

export interface BusinessChatLink {
  link: string
  message: string
  title?: string
  views: number
  slug?: string
}

export interface BusinessProfile {
  workHours?: BusinessWorkHours
  location?: BusinessLocation
  intro?: BusinessIntro
  links: BusinessChatLink[]
}

export interface StarsStatusPayload {
  balance: number
  subscriptions?: any[]
}

export interface StarsTransactionItem {
  id: string
  stars: number
  date: number
  title: string
  description?: string
  isRefund?: boolean
  isPending?: boolean
  isFailed?: boolean
}

export interface SavedDialogItem {
  id: string
  title: string
  username?: string
  avatarUrl?: string
  topMessage?: string
  date?: number
  pinned?: boolean
  unreadCount?: number
  peerType: 'user' | 'chat' | 'channel'
}

export interface SavedReactionTagItem {
  emoji: string
  title?: string
  count: number
}

export interface GroupCallParticipantItem {
  id: string
  name: string
  username?: string
  avatarUrl?: string
  isMuted: boolean
  isSelf?: boolean
  canSelfUnmute?: boolean
  volume?: number
  raisedHand?: boolean
  hasVideo?: boolean
  hasPresentation?: boolean
  justJoined?: boolean
}

export interface GroupCallInfo {
  id: string
  accessHash: string
  title?: string
  participantsCount: number
  canChangeJoinMuted?: boolean
  joinMuted?: boolean
  canStartVideo?: boolean
  rtmpStream?: boolean
  version?: number
  scheduleDate?: number
  recordStartDate?: number
}




