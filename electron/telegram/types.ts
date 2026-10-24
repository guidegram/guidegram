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
  botToken?: string
  photoId?: string
  sessionString?: string
  deviceProfile?: {
    deviceModel: string
    systemVersion: string
    appVersion: string
    systemLangCode?: string
    langCode?: string
  }
}

export type PhoneAuthResult = AccountInfo | { need2fa: true; hint?: string }


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
  readOutboxMaxId?: number
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
  lastMessageId?: number
  lastMessageIsOutgoing?: boolean
  lastMessageRead?: boolean
  lastMessageMediaType?: 'photo' | 'video' | 'document' | 'voice' | 'sticker' | 'round_video' | 'audio'
  lastMessageThumb?: string
  avatarInitials?: string
  avatarUrl?: string
  username?: string
  folderId?: number
  customEmojiStatusId?: string
  isPremium?: boolean
  isForum?: boolean
  isSponsored?: boolean
  isSponsorChannel?: boolean
  accessHash?: string
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
  style?: 'primary' | 'danger' | 'success' | string
  iconCustomEmojiId?: string
  type?: 'default' | 'request_phone' | 'request_location' | 'request_poll' | 'web_app' | string
  _?: string
}

export interface RichTableCell {
  text: string
  isHeader?: boolean
  align?: 'left' | 'center' | 'right'
  valign?: 'top' | 'middle' | 'bottom'
  colspan?: number
  rowspan?: number
}

export interface RichTableRow {
  cells: RichTableCell[]
}

export interface RichTableBlock {
  type: 'table'
  title?: string
  rows: RichTableRow[]
  bordered?: boolean
  striped?: boolean
  compact?: boolean
}

export interface RichDetailsBlock {
  type: 'details'
  title: string
  open?: boolean
  blocks: RichBlock[]
}

export interface RichHeaderBlock {
  type: 'header' | 'subheader'
  text: string
}

export interface RichParagraphBlock {
  type: 'paragraph'
  text: string
}

export interface RichListBlock {
  type: 'list'
  ordered?: boolean
  items: string[]
}

export interface RichDividerBlock {
  type: 'divider'
}

export interface RichBlockquoteBlock {
  type: 'blockquote'
  text: string
  caption?: string
  collapsed?: boolean
}

export type RichBlock =
  | RichTableBlock
  | RichDetailsBlock
  | RichHeaderBlock
  | RichParagraphBlock
  | RichListBlock
  | RichDividerBlock
  | RichBlockquoteBlock

export interface RichMessagePayload {
  rtl?: boolean
  blocks: RichBlock[]
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
  mediaType?: 'photo' | 'video' | 'document' | 'voice' | 'sticker' | 'webpage' | 'audio'
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
  mediaType?: 'photo' | 'video' | 'document' | 'voice' | 'sticker' | 'webpage' | 'poll' | 'paid_media' | 'audio'
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
  mediaType?: 'photo' | 'video' | 'document' | 'voice' | 'sticker' | 'webpage' | 'poll' | 'paid_media' | 'audio'
  mediaTitle?: string
  mediaPerformer?: string
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
    _?: string
    resize?: boolean
    singleUse?: boolean
    selective?: boolean
    persistent?: boolean
    placeholder?: string
  }
  richMessage?: RichMessagePayload
  // Local Anti-Delete & Edit History (64Gram Parity)
  isDeletedLocally?: boolean
  deletedAt?: number
  editDate?: number
  editHistory?: MessageEditRevision[]
  // Telegram Service Messages & Chat Actions
  isService?: boolean
  actionType?: ServiceActionType
  actionData?: ServiceActionData
}

export type ServiceActionType =
  | 'user_left'
  | 'user_removed'
  | 'user_joined'
  | 'user_joined_link'
  | 'user_joined_request'
  | 'users_added'
  | 'chat_created'
  | 'channel_created'
  | 'title_changed'
  | 'photo_changed'
  | 'photo_deleted'
  | 'message_pinned'
  | 'history_cleared'
  | 'contact_joined'
  | 'ttl_changed'
  | 'group_call_started'
  | 'group_call_ended'
  | 'group_call_scheduled'
  | 'topic_created'
  | 'topic_edited'
  | 'score_changed'
  | 'payment_sent'
  | 'custom'
  | 'unknown'

export interface ServiceActionData {
  actorName?: string
  actorId?: string
  targetName?: string
  targetId?: string
  title?: string
  period?: number
  duration?: number
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
  isBlocked?: boolean
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
  isAdmin?: boolean
  canManageCalls?: boolean
  canManageTopics?: boolean
  canViewAdminLog?: boolean
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
  isPremium?: boolean
  personalChannelId?: string
  personalChannelTitle?: string
  stargiftsCount?: number
  birthday?: string
  isBroadcast?: boolean
  isSupergroup?: boolean
  isForum?: boolean
  isMuted?: boolean
  availableReactions?: string[]
  canReactWithStars?: boolean
  hasGroupCall?: boolean
  groupCallId?: string
  groupCallAccessHash?: string
  groupCallParticipantsCount?: number
  canManageMembers?: boolean
  canPromoteMembers?: boolean
  canChangeInfo?: boolean
  canSetDescription?: boolean
  canBanMembers?: boolean
  canAddMembers?: boolean
  canSetSlowMode?: boolean
  canManageJoinRequests?: boolean
  canEditPermissions?: boolean
  /** Raw default member restrictions (true = restricted). */
  defaultRestrictions?: ChatRestrictionsPayload
  slowModeSeconds?: number
  joinRequestsEnabled?: boolean
}

export type ChatMemberStatus = 'creator' | 'admin' | 'member' | 'restricted' | 'banned' | 'left'

export type ChatMemberFilter = 'all' | 'admins' | 'restricted' | 'banned' | 'bots' | 'contacts' | 'recent'

export interface ChatAdminRightsPayload {
  changeInfo?: boolean
  postMessages?: boolean
  editMessages?: boolean
  deleteMessages?: boolean
  banUsers?: boolean
  inviteUsers?: boolean
  pinMessages?: boolean
  addAdmins?: boolean
  anonymous?: boolean
  manageCall?: boolean
  other?: boolean
  manageTopics?: boolean
  postStories?: boolean
  editStories?: boolean
  deleteStories?: boolean
  manageDirectMessages?: boolean
  manageRanks?: boolean
  manageLinkedPeers?: boolean
  manageWelcomeMessages?: boolean
}

export interface ChatRestrictionsPayload {
  viewMessages?: boolean
  sendMessages?: boolean
  sendMedia?: boolean
  sendStickers?: boolean
  sendGifs?: boolean
  sendGames?: boolean
  sendInline?: boolean
  embedLinks?: boolean
  sendPolls?: boolean
  changeInfo?: boolean
  inviteUsers?: boolean
  pinMessages?: boolean
  manageTopics?: boolean
  sendPhotos?: boolean
  sendVideos?: boolean
  sendRoundvideos?: boolean
  sendAudios?: boolean
  sendVoices?: boolean
  sendDocs?: boolean
  sendPlain?: boolean
  editRank?: boolean
  sendReactions?: boolean
  manageLinkedPeers?: boolean
  untilDate?: number
}

export interface ChatMemberPayload {
  id: string
  name: string
  username?: string
  phone?: string
  isBot: boolean
  isPremium: boolean
  isSelf: boolean
  isContact: boolean
  isDeleted: boolean
  status: ChatMemberStatus
  rank?: string
  joinedDate?: number
  subscriptionUntilDate?: number
  adminRights?: ChatAdminRightsPayload
  restrictions?: ChatRestrictionsPayload
  avatarUrl?: string
}

export interface ChatMembersResult {
  members: ChatMemberPayload[]
  total: number
}

export interface ChatMembersQuery {
  query?: string
  offset?: number
  limit?: number
  filter?: ChatMemberFilter
}

export interface AddChatMembersResult {
  invitedCount: number
  missing: Array<{
    userId: string
    premiumWouldAllowInvite: boolean
    premiumRequiredForPm: boolean
  }>
}

export interface ChatSettingsInput {
  title?: string
  description?: string
  slowModeSeconds?: number
  joinRequestsEnabled?: boolean
  /** Enable or disable forum mode in an owned supergroup. */
  isForum?: boolean
  /** Public username (without @); empty string or null removes the public link. */
  username?: string | null
  /** Default member restrictions to set (true = restricted). Unspecified flags keep their current value. */
  defaultRestrictions?: ChatRestrictionsPayload
}

export interface ChatSettingsUpdateResult {
  details: ChatDetails
  errors: string[]
}

export interface ChatInviteLink {
  link: string
  title?: string
  adminId?: string
  date: number
  startDate?: number
  expireDate?: number
  usageLimit?: number
  usage?: number
  requested?: number
  revoked: boolean
  permanent: boolean
  requestNeeded: boolean
}

export interface ChatInviteLinksResult {
  links: ChatInviteLink[]
  total: number
}

export interface ChatInviteLinksQuery {
  /** When true, fetch revoked links instead of active links. */
  revokedOnly?: boolean
  limit?: number
}

export interface ChatInviteLinkInput {
  title?: string
  /** Unix timestamp in seconds. Omit or null for no expiry. */
  expireDate?: number | null
  /** Maximum number of joiners. Omit or null for unlimited. */
  usageLimit?: number | null
  requestNeeded?: boolean
}

export interface ChatInviteLinkMutationResult {
  link?: ChatInviteLink
  replacement?: ChatInviteLink
}

export interface ChatJoinRequestItem {
  userId: string
  name: string
  username?: string
  bio?: string
  date: number
  isBot?: boolean
  isPremium?: boolean
  avatarUrl?: string
}

export interface ChatJoinRequestsResult {
  requests: ChatJoinRequestItem[]
  total: number
}

export type ChatJoinRequestAction = 'approve' | 'decline'

export interface ChatJoinRequestResolveResult {
  userId: string
  action: ChatJoinRequestAction
}

export interface ChatJoinRequestBulkResolveResult {
  action: ChatJoinRequestAction
  count: number
}

export interface ContactItem {
  id: string
  firstName: string
  lastName?: string
  phone?: string
  username?: string
  avatarUrl?: string
}

export type CallDiscardReason = 'missed' | 'busy' | 'hangup' | 'disconnect' | 'unknown'

export interface CallLogItem {
  id: number
  peerId: string
  title: string
  username?: string
  date: number
  duration: number
  isOutgoing: boolean
  isMissed: boolean
  isVideo: boolean
  reason?: CallDiscardReason
}

export interface CallLogResult {
  items: CallLogItem[]
  total: number
}

export interface StatsValuePair {
  current: number
  previous: number
}

export interface ChatStatsPeriod {
  minDate: number
  maxDate: number
}

export interface ChatStatsTopPoster {
  peerId: string
  title: string
  messages: number
  avgChars: number
}

export interface ChatStatsTopAdmin {
  peerId: string
  title: string
  deleted: number
  kicked: number
  banned: number
  reports: number
}

export interface ChatStatsTopInviter {
  peerId: string
  title: string
  invitations: number
}

export interface ChatStatsPayload {
  kind: 'megagroup' | 'broadcast'
  period: ChatStatsPeriod | null
  members?: StatsValuePair
  messages?: StatsValuePair
  viewers?: StatsValuePair
  posters?: StatsValuePair
  followers?: StatsValuePair
  viewsPerPost?: StatsValuePair
  sharesPerPost?: StatsValuePair
  reactionsPerPost?: StatsValuePair
  viewsPerStory?: StatsValuePair
  sharesPerStory?: StatsValuePair
  reactionsPerStory?: StatsValuePair
  enabledNotifications?: { part: number; total: number }
  topPosters: ChatStatsTopPoster[]
  topAdmins: ChatStatsTopAdmin[]
  topInviters: ChatStatsTopInviter[]
}

export type ChatStatsError =
  | 'admin_required'
  | 'not_supergroup'
  | 'not_channel'
  | 'unavailable'
  | 'unknown'

export interface ChatStatsResult {
  ok: boolean
  kind?: 'megagroup' | 'broadcast'
  stats?: ChatStatsPayload
  error?: ChatStatsError
  message?: string
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
  // Model Context Protocol (MCP) Server for AI Agents
  mcp?: McpServerConfig
}

export interface McpServerConfig {
  enabled: boolean
  port: number
  token?: string
  allowedChatIds?: string[]
  defaultDownloadDir?: string
  autoStartWithApp?: boolean
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

export interface ForumTopicInput {
  title?: string
  closed?: boolean
  hidden?: boolean
  iconEmojiId?: string | null
}

export interface ForumTopicMutationResult {
  topicId?: number
  topics: ForumTopicItem[]
}

export interface ForumTopicCreateResult extends ForumTopicMutationResult {
  topicId: number
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
  title?: string
  fromId?: string
  fromName?: string
  message?: string
  date: number
  isAnonymous?: boolean
  isNameHidden?: boolean
  isSaved?: boolean
  isLimited?: boolean
  isSoldOut?: boolean
  availabilityRemains?: number
  availabilityTotal?: number
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

export type StoryMediaType = 'photo' | 'video' | 'unsupported'

export interface StoryItemPayload {
  id: number
  date: number
  expireDate: number
  caption?: string
  mediaUrl?: string
  isVideo?: boolean
  /** Actual media kind as reported by Telegram's storyItem. */
  mediaType?: StoryMediaType
  hasPhoto?: boolean
  hasVideo?: boolean
  isPinned?: boolean
  isPublic?: boolean
  isOut?: boolean
  /** Story audience. `selected_contacts` is Telegram's custom contact list mode. */
  privacy?: StoryPrivacy | 'selected_contacts'
  forbidForwards?: boolean
  viewsCount?: number
  forwardsCount?: number
  reactionsCount?: number
  hasViewers?: boolean
}

export interface PeerStoriesPayload {
  peerId: string
  maxReadId?: number
  stories: StoryItemPayload[]
}

export interface StoryMediaResult {
  mediaUrl?: string
  isVideo?: boolean
  mimeType?: string
  error?: string
}

export type StoryPrivacy = 'everyone' | 'contacts' | 'close_friends'

export interface SendStoryOptions {
  caption?: string
  privacy?: StoryPrivacy
  pinned?: boolean
  forbidForwards?: boolean
  /** Story lifetime in seconds. Telegram defaults to 86400 (24 hours). */
  period?: number
  isVideo?: boolean
  duration?: number
  width?: number
  height?: number
}

export interface SendStoryResult {
  id: number
  date: number
  expireDate: number
  isVideo: boolean
}

export interface ActiveStoryPeer {
  peerId: string
  title: string
  username?: string
  maxStoryId: number
  maxReadId?: number
  storyCount: number
  hasUnread: boolean
  isSelf?: boolean
}

export interface ActiveStoriesResult {
  peers: ActiveStoryPeer[]
  totalCount: number
  hasMore: boolean
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

export type EmojiStatusSource = 'default' | 'recent' | 'collectible'

export interface EmojiStatusItem {
  documentId: string
  source: EmojiStatusSource
  collectibleId?: string
  title?: string
  slug?: string
  until?: number
}

export interface EmojiStatusesResult {
  currentDocumentId?: string
  currentCollectibleId?: string
  currentUntil?: number
  default: EmojiStatusItem[]
  recent: EmojiStatusItem[]
  collectible: EmojiStatusItem[]
}

export interface SetEmojiStatusOptions {
  /** Custom emoji document ID. Omit or pass null to clear the status. */
  documentId?: string | null
  /** Required when setting an owned collectible gift as the status. */
  collectibleId?: string
  /** Unix timestamp at which the status should expire. Omit for forever. */
  until?: number
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

export type SendableTypingStatus =
  | 'typing'
  | 'cancel'
  | 'record_video'
  | 'upload_video'
  | 'record_voice'
  | 'upload_voice'
  | 'upload_photo'
  | 'upload_document'
  | 'geo'
  | 'contact'
  | 'game'
  | 'record_round'
  | 'upload_round'
  | 'speak_call'
  | 'history_import'
  | 'sticker'
