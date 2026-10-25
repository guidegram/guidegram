import { contextBridge, ipcRenderer, webUtils } from 'electron'
import {
  ProxyConfig,
  ForwardOptions,
  AppConfig,
  McpServerConfig,
  QrTokenPayload,
  AccountInfo,
  PhoneAuthResult,
  UpdateInfo,
  ChatDetails,
  MessageItem,
  DialogItem,
  PortableLocatorInfo,
  OpenFileDialogOptions,
  OpenFileDialogResult,
  SendMediaOptions,
  SendMessageOptions,
  WebPagePreview,
  InstantViewArticle,
  DiscussionThreadInfo,
  BotCallbackResult,
  CustomEmojiPayload,
  ForumTopicItem,
  ContactItem,
  CallLogResult,
  ChatStatsResult,
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
  CacheStats,
  MyFullProfile,
  EmojiStatusesResult,
  SetEmojiStatusOptions,
  PrivacySecuritySettings,
  AutoHarvestStatus,
  ProxyHealthReport,
  WarpStatus,
  SharedMediaFilterType,
  SharedMediaResponse,
  DraftItem,
  AdminLogResponse,
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
  ChatMembersResult,
  ChatMembersQuery,
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
  ChatJoinRequestsResult,
  ChatJoinRequestAction,
  ChatJoinRequestResolveResult,
  ChatJoinRequestBulkResolveResult,
  ForumTopicInput,
  ForumTopicMutationResult,
  ForumTopicCreateResult,
  SendableTypingStatus,
} from './telegram/types'

const guidegramAPI = {
  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  requestClose: (): Promise<{ action: 'ask' | 'minimize' | 'quit' }> =>
    ipcRenderer.invoke('window:request-close'),
  confirmClose: (action: 'minimize' | 'quit', remember: boolean): Promise<void> =>
    ipcRenderer.invoke('window:confirm-close', { action, remember }),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // MTProto Engine Status
  getMtprotoStatus: (): Promise<{
    layer: number
    totalMethods: number
    totalNamespaces: number
    status: string
    services: Array<{ name: string; methods: number; desc: string }>
  }> => ipcRenderer.invoke('telegram:get-mtproto-status'),

  // Accounts
  getAccounts: (): Promise<AccountInfo[]> => ipcRenderer.invoke('telegram:get-accounts'),
  startPhoneAuth: (phone: string, proxy?: ProxyConfig) =>
    ipcRenderer.invoke('telegram:start-phone-auth', { phone, proxy }),
  completePhoneAuth: (phone: string, code: string, password?: string): Promise<PhoneAuthResult> =>
    ipcRenderer.invoke('telegram:complete-phone-auth', { phone, code, password }),
  loginBot: (token: string, proxy?: ProxyConfig): Promise<AccountInfo> =>
    ipcRenderer.invoke('telegram:login-bot', { token, proxy }),
  startQrAuth: (proxy?: ProxyConfig): Promise<QrTokenPayload> =>
    ipcRenderer.invoke('telegram:start-qr-auth', { proxy }),
  cancelQrAuth: (): Promise<void> =>
    ipcRenderer.invoke('telegram:cancel-qr-auth'),
  submitQrPassword: (password: string): Promise<AccountInfo> =>
    ipcRenderer.invoke('telegram:submit-qr-password', { password }),
  logoutAccount: (accountId: string) =>
    ipcRenderer.invoke('telegram:logout-account', { accountId }),
  reconnectAccount: (accountId: string): Promise<AccountInfo> =>
    ipcRenderer.invoke('telegram:reconnect-account', { accountId }),

  // Dialogs & Messages
  getCachedDialogs: (accountId: string): Promise<DialogItem[]> =>
    ipcRenderer.invoke('telegram:get-cached-dialogs', { accountId }),
  getDialogs: (
    accountId: string,
    limit?: number,
    offsetDate?: number,
    offsetId?: number
  ): Promise<DialogItem[]> =>
    ipcRenderer.invoke('telegram:get-dialogs', { accountId, limit, offsetDate, offsetId }),
  getContacts: (accountId: string): Promise<ContactItem[]> =>
    ipcRenderer.invoke('telegram:get-contacts', { accountId }),
  getCallLog: (
    accountId: string,
    limit?: number,
    offsetId?: number,
    missedOnly?: boolean
  ): Promise<CallLogResult> =>
    ipcRenderer.invoke('telegram:get-call-log', { accountId, limit, offsetId, missedOnly }),
  getChatStats: (accountId: string, chatId: string): Promise<ChatStatsResult> =>
    ipcRenderer.invoke('telegram:get-chat-stats', { accountId, chatId }),
  getMessages: (
    accountId: string,
    chatId: string,
    limit?: number,
    offsetId?: number,
    addOffset?: number
  ): Promise<MessageItem[]> =>
    ipcRenderer.invoke('telegram:get-messages', { accountId, chatId, limit, offsetId, addOffset }),
  sendMessage: (
    accountId: string,
    chatId: string,
    text: string,
    replyToMsgId?: number,
    options?: SendMessageOptions
  ): Promise<MessageItem> =>
    ipcRenderer.invoke('telegram:send-message', { accountId, chatId, text, replyToMsgId, options }),
  editMessage: (
    accountId: string,
    chatId: string,
    messageId: number,
    text: string
  ): Promise<MessageItem> =>
    ipcRenderer.invoke('telegram:edit-message', { accountId, chatId, messageId, text }),
  pinMessage: (
    accountId: string,
    chatId: string,
    messageId: number,
    notify?: boolean,
    bothSides?: boolean
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:pin-message', { accountId, chatId, messageId, notify, bothSides }),
  unpinMessage: (
    accountId: string,
    chatId: string,
    messageId: number
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:unpin-message', { accountId, chatId, messageId }),
  getPinnedMessages: (
    accountId: string,
    chatId: string,
    limit?: number,
    offsetId?: number
  ): Promise<{ count: number; messages: any[] }> =>
    ipcRenderer.invoke('telegram:get-pinned-messages', { accountId, chatId, limit, offsetId }),
  unpinAllMessages: (
    accountId: string,
    chatId: string,
    topMsgId?: number
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:unpin-all-messages', { accountId, chatId, topMsgId }),
  sendTyping: (
    accountId: string,
    chatId: string,
    status?: SendableTypingStatus
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:send-typing', { accountId, chatId, status }),
  exportChatInvite: (accountId: string, chatId: string): Promise<string | null> =>
    ipcRenderer.invoke('telegram:export-chat-invite', { accountId, chatId }),
  joinChatInvite: (
    accountId: string,
    inviteLink: string
  ): Promise<{ status: 'ok' | 'request_sent' | 'webview'; chatId?: string; title?: string }> =>
    ipcRenderer.invoke('telegram:join-chat-invite', { accountId, inviteLink }),
  getChatInviteLinks: (
    accountId: string,
    chatId: string,
    query?: ChatInviteLinksQuery
  ): Promise<ChatInviteLinksResult> =>
    ipcRenderer.invoke('telegram:get-chat-invite-links', { accountId, chatId, query }),
  createChatInviteLink: (
    accountId: string,
    chatId: string,
    input: ChatInviteLinkInput
  ): Promise<ChatInviteLink> =>
    ipcRenderer.invoke('telegram:create-chat-invite-link', { accountId, chatId, input }),
  editChatInviteLink: (
    accountId: string,
    chatId: string,
    link: string,
    input: ChatInviteLinkInput
  ): Promise<ChatInviteLinkMutationResult> =>
    ipcRenderer.invoke('telegram:edit-chat-invite-link', { accountId, chatId, link, input }),
  revokeChatInviteLink: (
    accountId: string,
    chatId: string,
    link: string
  ): Promise<ChatInviteLinkMutationResult> =>
    ipcRenderer.invoke('telegram:revoke-chat-invite-link', { accountId, chatId, link }),
  deleteChatInviteLink: (accountId: string, chatId: string, link: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:delete-chat-invite-link', { accountId, chatId, link }),
  getChatJoinRequests: (
    accountId: string,
    chatId: string,
    link?: string,
    query?: { query?: string; limit?: number; offsetDate?: number }
  ): Promise<ChatJoinRequestsResult> =>
    ipcRenderer.invoke('telegram:get-chat-join-requests', { accountId, chatId, link, query }),
  hideChatJoinRequest: (
    accountId: string,
    chatId: string,
    userId: string,
    action: ChatJoinRequestAction
  ): Promise<ChatJoinRequestResolveResult> =>
    ipcRenderer.invoke('telegram:hide-chat-join-request', { accountId, chatId, userId, action }),
  hideAllChatJoinRequests: (
    accountId: string,
    chatId: string,
    action: ChatJoinRequestAction,
    link?: string
  ): Promise<ChatJoinRequestBulkResolveResult> =>
    ipcRenderer.invoke('telegram:hide-all-chat-join-requests', { accountId, chatId, action, link }),
  blockUser: (accountId: string, userId: string, blocked: boolean): Promise<boolean> =>
    ipcRenderer.invoke('telegram:block-user', { accountId, userId, blocked }),
  sendMedia: (
    accountId: string,
    chatId: string,
    filePath: string,
    options?: SendMediaOptions
  ): Promise<MessageItem> =>
    ipcRenderer.invoke('telegram:send-media', { accountId, chatId, filePath, options }),
  openFileDialog: (options?: OpenFileDialogOptions): Promise<OpenFileDialogResult> =>
    ipcRenderer.invoke('dialog:open-file', options),
  saveTempFile: (params: { buffer: ArrayBuffer | Uint8Array; filename: string }): Promise<string> =>
    ipcRenderer.invoke('system:save-temp-file', params),
  getPathForFile: (file: File): string => {
    try {
      return webUtils.getPathForFile(file)
    } catch {
      return (file as any).path || ''
    }
  },
  copyToClipboard: (
    text: string,
    options?: { isSensitive?: boolean; ttlMs?: number }
  ): Promise<boolean> =>
    ipcRenderer.invoke('system:copy-to-clipboard', { text, ...options }),
  resolveDoh: (
    hostname: string,
    recordType?: 'A' | 'AAAA'
  ): Promise<string[]> =>
    ipcRenderer.invoke('telegram:resolve-doh', { hostname, recordType }),
  getIntegrityReport: (): Promise<{
    isTampered: boolean
    reasons: string[]
    inspectedFlags: string[]
    detectedEnvThreats: string[]
    timestamp: number
  }> => ipcRenderer.invoke('system:get-integrity-report'),
  getRateLimitMetrics: (): Promise<{
    totalRequests: number
    allowedRequests: number
    throttledRequests: number
    activeBuckets: number
    violationsByMethod: Record<string, number>
  }> => ipcRenderer.invoke('system:get-rate-limit-metrics'),
  getSqliteStatus: (): Promise<{
    journalMode: string
    synchronous: number | string
    busyTimeout: number
    cacheSize: number
    tempStore: number | string
    mmapSize: number
    foreignKeys: boolean
  }> => ipcRenderer.invoke('system:get-sqlite-status'),
  forwardMessages: (
    accountId: string,
    toChatId: string | string[],
    fromChatId: string,
    messageIds: number[],
    options: ForwardOptions
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:forward-messages', {
      accountId,
      toChatId: Array.isArray(toChatId) ? toChatId[0] : toChatId,
      toChatIds: Array.isArray(toChatId) ? toChatId : [toChatId],
      fromChatId,
      messageIds,
      options,
    }),
  markAsRead: (accountId: string, chatId: string, maxId?: number): Promise<void> =>
    ipcRenderer.invoke('telegram:mark-as-read', { accountId, chatId, maxId }),
  markAllAsRead: (accountId: string): Promise<{ success: boolean; count: number }> =>
    ipcRenderer.invoke('telegram:mark-all-as-read', { accountId }),
  deleteMessages: (
    accountId: string,
    chatId: string,
    messageIds: number[],
    revoke?: boolean
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:delete-messages', { accountId, chatId, messageIds, revoke }),
  getProfilePhoto: (accountId: string, peerId: string, isBig?: boolean, forceRefresh?: boolean): Promise<string | null> =>
    ipcRenderer.invoke('telegram:get-profile-photo', { accountId, peerId, isBig, forceRefresh }),
  downloadMedia: (
    accountId: string,
    chatId: string,
    messageId: number,
    thumb?: boolean
  ): Promise<string | null> =>
    ipcRenderer.invoke('telegram:download-media', { accountId, chatId, messageId, thumb }),
  cancelDownloadMedia: (
    accountId: string,
    chatId: string,
    messageId: number
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:cancel-download-media', { accountId, chatId, messageId }),
  sendBotCallbackQuery: (
    accountId: string,
    chatId: string,
    messageId: number,
    data?: string,
    row?: number,
    col?: number
  ): Promise<BotCallbackResult> =>
    ipcRenderer.invoke('telegram:send-bot-callback', { accountId, chatId, messageId, data, row, col }),
  getCustomEmojiUrl: (
    accountId: string,
    documentId: string
  ): Promise<string | null> =>
    ipcRenderer.invoke('telegram:get-custom-emoji', { accountId, documentId }),
  getCustomEmojiData: (
    accountId: string,
    documentId: string
  ): Promise<CustomEmojiPayload | null> =>
    ipcRenderer.invoke('telegram:get-custom-emoji-data', { accountId, documentId }),
  saveMediaToFile: (
    accountId: string,
    chatId: string,
    messageId: number,
    defaultName?: string
  ): Promise<{ success: boolean; filePath?: string; canceled?: boolean }> =>
    ipcRenderer.invoke('telegram:save-media-to-file', { accountId, chatId, messageId, defaultName }),
  getChatDetails: (accountId: string, chatId: string): Promise<ChatDetails> =>
    ipcRenderer.invoke('telegram:get-chat-details', { accountId, chatId }),
  getChatMembers: (
    accountId: string,
    chatId: string,
    options?: ChatMembersQuery
  ): Promise<ChatMembersResult> =>
    ipcRenderer.invoke('telegram:get-chat-members', { accountId, chatId, options }),
  addChatMembers: (
    accountId: string,
    chatId: string,
    userIds: string[]
  ): Promise<AddChatMembersResult> =>
    ipcRenderer.invoke('telegram:add-chat-members', { accountId, chatId, userIds }),
  kickChatMember: (accountId: string, chatId: string, userId: string): Promise<void> =>
    ipcRenderer.invoke('telegram:kick-chat-member', { accountId, chatId, userId }),
  banChatMember: (
    accountId: string,
    chatId: string,
    userId: string,
    untilDate?: number
  ): Promise<void> =>
    ipcRenderer.invoke('telegram:ban-chat-member', { accountId, chatId, userId, untilDate }),
  unbanChatMember: (accountId: string, chatId: string, userId: string): Promise<void> =>
    ipcRenderer.invoke('telegram:unban-chat-member', { accountId, chatId, userId }),
  restrictChatMember: (
    accountId: string,
    chatId: string,
    userId: string,
    restrictions: ChatRestrictionsPayload
  ): Promise<void> =>
    ipcRenderer.invoke('telegram:restrict-chat-member', {
      accountId,
      chatId,
      userId,
      restrictions,
    }),
  promoteChatMember: (
    accountId: string,
    chatId: string,
    userId: string,
    rights: ChatAdminRightsPayload,
    rank?: string
  ): Promise<void> =>
    ipcRenderer.invoke('telegram:promote-chat-member', {
      accountId,
      chatId,
      userId,
      rights,
      rank,
    }),
  setChatMemberRank: (
    accountId: string,
    chatId: string,
    userId: string,
    rank: string | null
  ): Promise<void> =>
    ipcRenderer.invoke('telegram:set-chat-member-rank', { accountId, chatId, userId, rank }),
  demoteChatMember: (
    accountId: string,
    chatId: string,
    userId: string
  ): Promise<void> =>
    ipcRenderer.invoke('telegram:demote-chat-member', { accountId, chatId, userId }),
  transferChatOwnership: (
    accountId: string,
    chatId: string,
    userId: string,
    password?: string
  ): Promise<void> =>
    ipcRenderer.invoke('telegram:transfer-chat-ownership', { accountId, chatId, userId, password }),
  updateChatSettings: (
    accountId: string,
    chatId: string,
    settings: ChatSettingsInput
  ): Promise<ChatSettingsUpdateResult> =>
    ipcRenderer.invoke('telegram:update-chat-settings', { accountId, chatId, settings }),
  resolvePeer: (accountId: string, target: string): Promise<DialogItem | null> =>
    ipcRenderer.invoke('telegram:resolve-peer', { accountId, target }),
  toggleChatNotifications: (accountId: string, chatId: string, mute: boolean): Promise<boolean> =>
    ipcRenderer.invoke('telegram:toggle-chat-notifications', { accountId, chatId, mute }),
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke('system:open-external', { url }),
  getLinkPreview: (url: string): Promise<WebPagePreview | null> =>
    ipcRenderer.invoke('web:get-link-preview', { url }),
  getInstantView: (accountId: string, url: string, hash?: number): Promise<InstantViewArticle | null> =>
    ipcRenderer.invoke('telegram:get-instant-view', { accountId, url, hash }),
  getDiscussionMessage: (accountId: string, peerId: string, msgId: number): Promise<DiscussionThreadInfo | null> =>
    ipcRenderer.invoke('telegram:get-discussion-message', { accountId, peerId, msgId }),
  setDiscussionGroup: (accountId: string, broadcastId: string, groupId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:set-discussion-group', { accountId, broadcastId, groupId }),

  // Global Telegram Search & Historical Messages
  searchPublicPeers: (accountId: string, query: string): Promise<DialogItem[]> =>
    ipcRenderer.invoke('telegram:search-public-peers', { accountId, query }),
  searchGlobal: (accountId: string, query: string, filterType?: string, limit?: number): Promise<MessageItem[]> =>
    ipcRenderer.invoke('telegram:search-global', { accountId, query, filterType, limit }),
  getHistoricalMessages: (accountId: string, chatId: string, limit?: number, offsetDate?: number, offsetId?: number): Promise<MessageItem[]> =>
    ipcRenderer.invoke('telegram:get-historical-messages', { accountId, chatId, limit, offsetDate, offsetId }),

  // Forum Topics, Scheduled Messages, Reactions & Star Gifts
  getForumTopics: (accountId: string, chatId: string): Promise<ForumTopicItem[]> =>
    ipcRenderer.invoke('telegram:get-forum-topics', { accountId, chatId }),
  setChatForumEnabled: (accountId: string, chatId: string, enabled: boolean): Promise<ChatDetails> =>
    ipcRenderer.invoke('telegram:set-chat-forum-enabled', { accountId, chatId, enabled }),
  createForumTopic: (
    accountId: string,
    chatId: string,
    title: string,
    options?: { iconColor?: number; iconEmojiId?: string }
  ): Promise<ForumTopicCreateResult> =>
    ipcRenderer.invoke('telegram:create-forum-topic', { accountId, chatId, title, ...options }),
  editForumTopic: (
    accountId: string,
    chatId: string,
    topicId: number,
    input: ForumTopicInput
  ): Promise<ForumTopicMutationResult> =>
    ipcRenderer.invoke('telegram:edit-forum-topic', { accountId, chatId, topicId, input }),
  setForumTopicPinned: (
    accountId: string,
    chatId: string,
    topicId: number,
    pinned: boolean
  ): Promise<ForumTopicMutationResult> =>
    ipcRenderer.invoke('telegram:set-forum-topic-pinned', { accountId, chatId, topicId, pinned }),
  deleteForumTopic: (accountId: string, chatId: string, topicId: number): Promise<ForumTopicMutationResult> =>
    ipcRenderer.invoke('telegram:delete-forum-topic', { accountId, chatId, topicId }),
  getScheduledMessages: (accountId: string, chatId: string): Promise<ScheduledMessageItem[]> =>
    ipcRenderer.invoke('telegram:get-scheduled-messages', { accountId, chatId }),
  sendScheduledMessageNow: (accountId: string, chatId: string, messageId: number): Promise<boolean> =>
    ipcRenderer.invoke('telegram:send-scheduled-message-now', { accountId, chatId, messageId }),
  deleteScheduledMessages: (accountId: string, chatId: string, messageIds: number[]): Promise<boolean> =>
    ipcRenderer.invoke('telegram:delete-scheduled-messages', { accountId, chatId, messageIds }),
  sendReaction: (
    accountId: string,
    chatId: string,
    messageId: number,
    reaction?: string | { emoji?: string; customEmojiId?: string } | Array<string | { emoji?: string; customEmojiId?: string }>,
    options?: { big?: boolean; addToRecent?: boolean }
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:send-reaction', { accountId, chatId, messageId, reaction, options }),
  getMessageReactionsList: (
    accountId: string,
    chatId: string,
    messageId: number,
    options?: { reaction?: string | { emoji?: string; customEmojiId?: string }; offset?: string; limit?: number }
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-message-reactions-list', { accountId, chatId, messageId, options }),
  getAvailableReactions: (
    accountId: string,
    hash?: number
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-available-reactions', { accountId, hash }),
  sendVote: (accountId: string, chatId: string, messageId: number, options: string[]): Promise<boolean> =>
    ipcRenderer.invoke('telegram:send-vote', { accountId, chatId, messageId, options }),
  createPoll: (
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
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:create-poll', { accountId, chatId, question, answers, options }),
  sendLocation: (
    accountId: string,
    chatId: string,
    params: {
      lat: number
      long: number
      accuracyRadius?: number
      livePeriod?: number
      heading?: number
      proximityNotificationRadius?: number
      replyToMsgId?: number
    }
  ): Promise<{ success: boolean; result?: any; error?: string }> =>
    ipcRenderer.invoke('telegram:send-location', { accountId, chatId, params }),
  editLiveLocation: (
    accountId: string,
    chatId: string,
    messageId: number,
    params: {
      lat?: number
      long?: number
      stopped?: boolean
      heading?: number
      proximityNotificationRadius?: number
    }
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:edit-live-location', { accountId, chatId, messageId, params }),
  getRecentLocations: (
    accountId: string,
    chatId: string,
    limit?: number
  ): Promise<{ count: number; locations: any[] }> =>
    ipcRenderer.invoke('telegram:get-recent-locations', { accountId, chatId, limit }),
  saveDraft: (
    accountId: string,
    chatId: string,
    message: string,
    replyToMsgId?: number
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:save-draft', { accountId, chatId, message, replyToMsgId }),
  clearDraft: (accountId: string, chatId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:clear-draft', { accountId, chatId }),
  getAllDrafts: (accountId: string): Promise<Record<string, DraftItem>> =>
    ipcRenderer.invoke('telegram:get-all-drafts', { accountId }),
  requestWebView: (
    accountId: string,
    peerId: string,
    botId: string,
    url?: string,
    startParam?: string,
    fromBotMenu?: boolean
  ): Promise<{ url: string; queryId?: string }> =>
    ipcRenderer.invoke('telegram:request-web-view', {
      accountId,
      peerId,
      botId,
      url,
      startParam,
      fromBotMenu,
    }),
  openMiniApp: (url: string, title?: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:open-mini-app', { url, title }),
  startBot: (
    accountId: string,
    botPeerId: string,
    startParam?: string
  ): Promise<{ success: boolean; messageId?: number; error?: string }> =>
    ipcRenderer.invoke('telegram:start-bot', { accountId, botPeerId, startParam }),
  getBotInfo: (accountId: string, botPeerId: string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-bot-info', { accountId, botPeerId }),
  getBotMenuButton: (accountId: string, botPeerId: string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-bot-menu-button', { accountId, botPeerId }),
  getAdminLog: (
    accountId: string,
    channelId: string,
    q?: string,
    limit?: number,
    maxId?: string
  ): Promise<AdminLogResponse> =>
    ipcRenderer.invoke('telegram:get-admin-log', {
      accountId,
      channelId,
      q,
      limit,
      maxId,
    }),
  getBusinessProfile: (accountId: string): Promise<BusinessProfile> =>
    ipcRenderer.invoke('telegram:get-business-profile', { accountId }),
  updateBusinessIntro: (
    accountId: string,
    intro: { title: string; description: string } | null
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:update-business-intro', { accountId, intro }),
  updateBusinessWorkHours: (
    accountId: string,
    workHours: BusinessWorkHours | null
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:update-business-work-hours', { accountId, workHours }),
  updateBusinessLocation: (
    accountId: string,
    location: { address: string; lat?: number; long?: number } | null
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:update-business-location', { accountId, location }),
  createBusinessChatLink: (
    accountId: string,
    link: { message: string; title?: string }
  ): Promise<BusinessChatLink> =>
    ipcRenderer.invoke('telegram:create-business-chat-link', { accountId, link }),
  deleteBusinessChatLink: (accountId: string, slug: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:delete-business-chat-link', { accountId, slug }),
  getSavedStarGifts: (accountId: string, userId?: string): Promise<StarGiftItem[]> =>
    ipcRenderer.invoke('telegram:get-star-gifts', { accountId, userId }),
  getStarGifts: (accountId: string): Promise<StarGiftItem[]> =>
    ipcRenderer.invoke('telegram:get-star-gift-catalog', { accountId }),
  convertStarGift: (
    accountId: string,
    stargiftMsgId: number
  ): Promise<{ success: boolean; result?: any; error?: string }> =>
    ipcRenderer.invoke('telegram:convert-star-gift', { accountId, stargiftMsgId }),
  toggleSaveStarGift: (
    accountId: string,
    stargiftMsgId: number,
    unsave: boolean
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('telegram:toggle-save-star-gift', { accountId, stargiftMsgId, unsave }),
  getStarsSubscriptions: (
    accountId: string,
    peerId?: string,
    offset?: string
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-stars-subscriptions', { accountId, peerId, offset }),
  changeStarsSubscription: (
    accountId: string,
    peerId: string,
    subscriptionId: string,
    canceled: boolean
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:change-stars-subscription', { accountId, peerId, subscriptionId, canceled }),
  getGiveawayInfo: (
    accountId: string,
    peerId: string,
    msgId: number
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-giveaway-info', { accountId, peerId, msgId }),
  checkCanSendGift: (
    accountId: string,
    giftId: string | number
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:check-can-send-gift', { accountId, giftId }),
  sendPaidReaction: (
    accountId: string,
    chatId: string,
    messageId: number,
    count: number,
    isPrivate?: boolean
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:send-paid-reaction', { accountId, chatId, messageId, count, isPrivate }),
  getStarsStatus: (accountId: string): Promise<StarsStatusPayload> =>
    ipcRenderer.invoke('telegram:get-stars-status', { accountId }),
  getStarsTransactions: (
    accountId: string,
    offset?: string,
    limit?: number
  ): Promise<StarsTransactionItem[]> =>
    ipcRenderer.invoke('telegram:get-stars-transactions', { accountId, offset, limit }),
  getSavedDialogs: (
    accountId: string,
    limit?: number
  ): Promise<SavedDialogItem[]> =>
    ipcRenderer.invoke('telegram:get-saved-dialogs', { accountId, limit }),
  getSavedReactionTags: (
    accountId: string
  ): Promise<SavedReactionTagItem[]> =>
    ipcRenderer.invoke('telegram:get-saved-reaction-tags', { accountId }),

  // Telegram Group Calls / Live Streams (MTProto phone.*)
  getGroupCall: (
    accountId: string,
    chatId: string,
    callId?: string,
    accessHash?: string
  ): Promise<{ call: GroupCallInfo; participants: GroupCallParticipantItem[] } | null> =>
    ipcRenderer.invoke('telegram:get-group-call', { accountId, chatId, callId, accessHash }),
  createGroupCall: (
    accountId: string,
    chatId: string,
    title?: string
  ): Promise<GroupCallInfo | null> =>
    ipcRenderer.invoke('telegram:create-group-call', { accountId, chatId, title }),
  joinGroupCall: (
    accountId: string,
    callId: string,
    accessHash: string,
    muted?: boolean
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:join-group-call', { accountId, callId, accessHash, muted }),
  leaveGroupCall: (
    accountId: string,
    callId: string,
    accessHash: string
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:leave-group-call', { accountId, callId, accessHash }),
  editGroupCallParticipant: (
    accountId: string,
    callId: string,
    accessHash: string,
    participantId: string,
    muted?: boolean,
    raiseHand?: boolean,
    volume?: number
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:edit-group-call-participant', { accountId, callId, accessHash, participantId, muted, raiseHand, volume }),
  getCallConfig: (accountId: string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-call-config', { accountId }),
  requestCall: (accountId: string, userId: string, isVideo = false): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:request-call', { accountId, userId, isVideo }),
  acceptCall: (accountId: string, callId: string, accessHash: string, gBHex?: string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:accept-call', { accountId, callId, accessHash, gBHex }),
  confirmCall: (
    accountId: string,
    callId: string,
    accessHash: string,
    gAHex?: string,
    keyFingerprint?: string
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:confirm-call', {
      accountId,
      callId,
      accessHash,
      gAHex,
      keyFingerprint,
    }),
  receivedCall: (accountId: string, callId: string, accessHash: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:received-call', { accountId, callId, accessHash }),
  discardCall: (
    accountId: string,
    callId: string,
    accessHash: string,
    duration = 0,
    reason = 'hangup'
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:discard-call', { accountId, callId, accessHash, duration, reason }),
  sendCallSignalingData: (
    accountId: string,
    callId: string,
    accessHash: string,
    dataHex: string
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:send-call-signaling-data', {
      accountId,
      callId,
      accessHash,
      dataHex,
    }),
  inviteToGroupCall: (
    accountId: string,
    callId: string,
    accessHash: string,
    userIds: string[]
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:invite-to-group-call', { accountId, callId, accessHash, userIds }),
  discardGroupCall: (accountId: string, callId: string, accessHash: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:discard-group-call', { accountId, callId, accessHash }),
  exportGroupCallInvite: (
    accountId: string,
    callId: string,
    accessHash: string,
    canSelfUnmute?: boolean
  ): Promise<string | null> =>
    ipcRenderer.invoke('telegram:export-group-call-invite', {
      accountId,
      callId,
      accessHash,
      canSelfUnmute,
    }),

  // End-to-End Secret Chats (MTProto messages.*)
  getDhConfig: (accountId: string, version = 0, randomLength = 256): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-dh-config', { accountId, version, randomLength }),
  requestEncryption: (accountId: string, userId: string, gAHex?: string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:request-encryption', { accountId, userId, gAHex }),
  acceptEncryption: (
    accountId: string,
    chatId: number,
    accessHash: string,
    gBHex?: string,
    keyFingerprint?: string
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:accept-encryption', {
      accountId,
      chatId,
      accessHash,
      gBHex,
      keyFingerprint,
    }),
  discardEncryption: (accountId: string, chatId: number, deleteHistory = true): Promise<boolean> =>
    ipcRenderer.invoke('telegram:discard-encryption', { accountId, chatId, deleteHistory }),
  setEncryptedTyping: (
    accountId: string,
    chatId: number,
    accessHash: string,
    typing = true
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:set-encrypted-typing', { accountId, chatId, accessHash, typing }),
  generateSecretChatDh: (
    primeHex?: string,
    g?: number
  ): Promise<{ privateKeyHex: string; publicKeyHex: string }> =>
    ipcRenderer.invoke('telegram:generate-secret-chat-dh', { primeHex, g }),
  computeSecretChatAuth: (
    privateKeyHex: string,
    peerPublicKeyHex: string,
    primeHex?: string,
    g?: number
  ): Promise<{
    authKeyHex: string
    fingerprint: string
    fingerprintHex: string
    visualFingerprint: {
      hexFormatted: string
      emojis: string[]
      identiconMatrix: boolean[][]
    }
  }> =>
    ipcRenderer.invoke('telegram:compute-secret-chat-auth', {
      privateKeyHex,
      peerPublicKeyHex,
      primeHex,
      g,
    }),
  readEncryptedHistory: (
    accountId: string,
    chatId: number,
    accessHash: string,
    maxDate?: number
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:read-encrypted-history', {
      accountId,
      chatId,
      accessHash,
      maxDate,
    }),
  sendEncrypted: (
    accountId: string,
    chatId: number,
    accessHash: string,
    dataHex: string,
    silent = false
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:send-encrypted', {
      accountId,
      chatId,
      accessHash,
      dataHex,
      silent,
    }),
  sendEncryptedService: (
    accountId: string,
    chatId: number,
    accessHash: string,
    dataHex: string
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:send-encrypted-service', {
      accountId,
      chatId,
      accessHash,
      dataHex,
    }),

  // Telegram Ad Platform & Sponsored Messages
  getSponsoredMessages: (accountId: string, peerId: string, msgId?: number): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-sponsored-messages', { accountId, peerId, msgId }),
  viewSponsoredMessage: (accountId: string, randomIdHex: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:view-sponsored-message', { accountId, randomIdHex }),
  clickSponsoredMessage: (
    accountId: string,
    randomIdHex: string,
    media = false,
    fullscreen = false
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:click-sponsored-message', {
      accountId,
      randomIdHex,
      media,
      fullscreen,
    }),
  reportSponsoredMessage: (
    accountId: string,
    randomIdHex: string,
    optionHex: string
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:report-sponsored-message', {
      accountId,
      randomIdHex,
      optionHex,
    }),
  toggleSponsoredMessages: (accountId: string, enabled: boolean): Promise<boolean> =>
    ipcRenderer.invoke('telegram:toggle-sponsored-messages', { accountId, enabled }),
  restrictSponsoredMessages: (
    accountId: string,
    channelId: string,
    restricted: boolean
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:restrict-sponsored-messages', {
      accountId,
      channelId,
      restricted,
    }),

  // Fragment & Collectibles API
  getCollectibleInfo: (
    accountId: string,
    query: string,
    type: 'username' | 'phone' = 'username'
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-collectible-info', { accountId, query, type }),

  // TON Center & Blockchain API
  performTonApiRequest: (
    accountId: string,
    endpoint: string,
    isPost = false,
    query?: string,
    payload?: string
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:perform-ton-api-request', {
      accountId,
      endpoint,
      isPost,
      query,
      payload,
    }),
  getTonStreamingUrl: (accountId: string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-ton-streaming-url', { accountId }),

  // Onramp Payments API
  getOnrampProviders: (accountId: string, cryptoCurrency?: string): Promise<Array<Record<string, unknown>>> =>
    ipcRenderer.invoke('telegram:get-onramp-providers', { accountId, cryptoCurrency }),
  getOnrampBaseCurrencies: (
    accountId: string,
    provider: string,
    cryptoCurrency: string
  ): Promise<string[]> =>
    ipcRenderer.invoke('telegram:get-onramp-base-currencies', { accountId, provider, cryptoCurrency }),
  getOnrampAvailability: (
    accountId: string,
    provider: string,
    cryptoCurrency: string,
    baseCurrency?: string
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-onramp-availability', { accountId, provider, cryptoCurrency, baseCurrency }),
  getOnrampLimits: (
    accountId: string,
    provider: string,
    cryptoCurrency: string,
    baseCurrency: string,
    paymentMethod?: string
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-onramp-limits', { accountId, provider, cryptoCurrency, baseCurrency, paymentMethod }),
  getOnrampQuote: (
    accountId: string,
    provider: string,
    cryptoCurrency: string,
    baseCurrency: string,
    baseAmount?: string,
    cryptoAmount?: string,
    paymentMethod?: string
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-onramp-quote', { accountId, provider, cryptoCurrency, baseCurrency, baseAmount, cryptoAmount, paymentMethod }),
  createOnrampSession: (
    accountId: string,
    provider: string,
    cryptoCurrency: string,
    address: string,
    options?: Record<string, unknown>
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:create-onramp-session', { accountId, provider, cryptoCurrency, address, options }),

  // Telegram Wallet & TonConnect API
  getWalletState: (accountId: string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-wallet-state', { accountId }),
  getWalletUserAddresses: (
    accountId: string,
    userIds: string[],
    addresses: string[],
    force = false
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-wallet-user-addresses', { accountId, userIds, addresses, force }),
  getWalletTransactions: (
    accountId: string,
    offset = '',
    limit = 50,
    inbound = true,
    outbound = true
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-wallet-transactions', { accountId, offset, limit, inbound, outbound }),
  getWalletNfts: (accountId: string, offset = '', limit = 50): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-wallet-nfts', { accountId, offset, limit }),
  getTonConnectSessions: (accountId: string): Promise<Array<Record<string, unknown>>> =>
    ipcRenderer.invoke('telegram:get-ton-connect-sessions', { accountId }),
  createTonConnectSession: (accountId: string, dappClientId: string, manifestUrl: string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:create-ton-connect-session', { accountId, dappClientId, manifestUrl }),
  closeTonConnectSession: (accountId: string, sessionId: string | number, bodyHex?: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:close-ton-connect-session', { accountId, sessionId, bodyHex }),

  // Telegram Passport & Secure Documents API
  getPassportConfig: (accountId: string, hash = 0): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-passport-config', { accountId, hash }),
  getAllSecureValues: (accountId: string): Promise<Array<Record<string, unknown>>> =>
    ipcRenderer.invoke('telegram:get-all-secure-values', { accountId }),
  getSecureValue: (accountId: string, types: string[]): Promise<Array<Record<string, unknown>>> =>
    ipcRenderer.invoke('telegram:get-secure-value', { accountId, types }),
  saveSecureValue: (accountId: string, value: Record<string, unknown>, secureSecretId: string | number): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:save-secure-value', { accountId, value, secureSecretId }),
  deleteSecureValue: (accountId: string, types: string[]): Promise<boolean> =>
    ipcRenderer.invoke('telegram:delete-secure-value', { accountId, types }),

  // Sticker Creation API
  createStickerSet: (
    accountId: string,
    title: string,
    shortName: string,
    stickers: Array<Record<string, unknown>>,
    options?: Record<string, unknown>
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:create-sticker-set', { accountId, title, shortName, stickers, options }),
  addStickerToSet: (accountId: string, stickerset: string | Record<string, unknown>, sticker: Record<string, unknown>): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:add-sticker-to-set', { accountId, stickerset, sticker }),

  // Universal MTProto Layer 229+ RPC Dispatcher (100% Coverage Engine)
  invokeMtprotoRpc: (accountId: string, method: string, params: Record<string, unknown> = {}): Promise<unknown> =>
    ipcRenderer.invoke('telegram:invoke-mtproto-rpc', { accountId, method, params }),
  getAllMtprotoMethods: (): Promise<readonly string[]> =>
    ipcRenderer.invoke('telegram:get-all-mtproto-methods'),

  // Contacts & Users Domain API (Phase 1)
  getFullUser: (accountId: string, userId: string): Promise<Record<string, unknown> | null> =>
    ipcRenderer.invoke('telegram:get-full-user', { accountId, userId }),
  importContacts: (accountId: string, contacts: Array<Record<string, unknown>>): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:import-contacts', { accountId, contacts }),
  addContact: (
    accountId: string,
    userId: string,
    firstName: string,
    lastName = '',
    phone = '',
    addPhonePrivacyException = false,
    note?: string
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:add-contact', { accountId, userId, firstName, lastName, phone, addPhonePrivacyException, note }),
  blockPeer: (accountId: string, peerId: string, myStoriesFrom = false): Promise<boolean> =>
    ipcRenderer.invoke('telegram:block-peer', { accountId, peerId, myStoriesFrom }),
  unblockPeer: (accountId: string, peerId: string, myStoriesFrom = false): Promise<boolean> =>
    ipcRenderer.invoke('telegram:unblock-peer', { accountId, peerId, myStoriesFrom }),
  getBlockedPeers: (accountId: string, offset = 0, limit = 50, myStoriesFrom = false): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-blocked-peers', { accountId, offset, limit, myStoriesFrom }),
  getTopPeers: (accountId: string, options?: Record<string, unknown>): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-top-peers', { accountId, options }),
  getBirthdays: (accountId: string): Promise<Array<Record<string, unknown>>> =>
    ipcRenderer.invoke('telegram:get-birthdays', { accountId }),
  updateContactNote: (accountId: string, userId: string, note: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:update-contact-note', { accountId, userId, note }),
  getRequirementsToContact: (accountId: string, userIds: string[]): Promise<Array<Record<string, unknown>>> =>
    ipcRenderer.invoke('telegram:get-requirements-to-contact', { accountId, userIds }),
  exportContactCard: (accountId: string): Promise<number[]> =>
    ipcRenderer.invoke('telegram:export-contact-card', { accountId }),

  // Channels & Supergroups Administration Domain API (Phase 2)
  channelGetParticipants: (accountId: string, channelId: string, filterName = 'recent', offset = 0, limit = 50): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:channel-get-participants', { accountId, channelId, filterName, offset, limit }),
  channelGetAdminLog: (accountId: string, channelId: string, options?: Record<string, unknown>): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:channel-get-admin-log', { accountId, channelId, options }),
  channelToggleSlowMode: (accountId: string, channelId: string, seconds: number): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:channel-toggle-slow-mode', { accountId, channelId, seconds }),
  channelToggleJoinRequest: (accountId: string, channelId: string, enabled: boolean): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:channel-toggle-join-request', { accountId, channelId, enabled }),
  channelToggleAntiSpam: (accountId: string, channelId: string, enabled: boolean): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:channel-toggle-anti-spam', { accountId, channelId, enabled }),
  channelToggleForum: (accountId: string, channelId: string, enabled: boolean): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:channel-toggle-forum', { accountId, channelId, enabled }),
  channelGetRecommendations: (accountId: string, channelId?: string): Promise<Array<Record<string, unknown>>> =>
    ipcRenderer.invoke('telegram:channel-get-recommendations', { accountId, channelId }),
  channelUpdatePaidMessagesPrice: (accountId: string, channelId: string, stars: bigint): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:channel-update-paid-messages-price', { accountId, channelId, stars }),

  // Bots, Games & WebApps Domain API (Phase 3)
  botGetCommands: (accountId: string, scope?: Record<string, unknown>, langCode = ''): Promise<Array<Record<string, unknown>>> =>
    ipcRenderer.invoke('telegram:bot-get-commands', { accountId, scope, langCode }),
  botSetCommands: (accountId: string, commands: Array<Record<string, unknown>>, scope?: Record<string, unknown>, langCode = ''): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bot-set-commands', { accountId, commands, scope, langCode }),
  botGetInfo: (accountId: string, botId?: string, langCode = ''): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:bot-get-info', { accountId, botId, langCode }),
  botSetInfo: (
    accountId: string,
    botId?: string,
    langCode = '',
    name?: string,
    about?: string,
    description?: string
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bot-set-info', { accountId, botId, langCode, name, about, description }),
  botGetMenuButton: (accountId: string, botId: string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:bot-get-menu-button', { accountId, botId }),
  botSetMenuButton: (accountId: string, botId: string, button: Record<string, unknown>): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bot-set-menu-button', { accountId, botId, button }),
  botGetAdminedBots: (accountId: string): Promise<Array<Record<string, unknown>>> =>
    ipcRenderer.invoke('telegram:bot-get-admined-bots', { accountId }),
  botGetPopularApps: (accountId: string, offset = '', limit = 50): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:bot-get-popular-apps', { accountId, offset, limit }),
  botGetRecommendations: (accountId: string, botId: string): Promise<Array<Record<string, unknown>>> =>
    ipcRenderer.invoke('telegram:bot-get-recommendations', { accountId, botId }),
  botInvokeWebViewCustomMethod: (
    accountId: string,
    botId: string,
    customMethod: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:bot-invoke-webview-custom-method', { accountId, botId, customMethod, params }),

  // Payments, Invoices & Telegram Stars Domain API (Phase 4)
  paymentGetPaymentForm: (accountId: string, invoice: Record<string, unknown>, themeParams?: Record<string, unknown>): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:payment-get-payment-form', { accountId, invoice, themeParams }),
  paymentGetStarsStatus: (accountId: string, peerId?: string, ton = false): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:payment-get-stars-status', { accountId, peerId, ton }),
  paymentGetStarsTransactions: (accountId: string, peerId?: string, offset = '', limit = 50, options: Record<string, unknown> = {}): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:payment-get-stars-transactions', { accountId, peerId, offset, limit, options }),
  paymentGetStarsTopupOptions: (accountId: string): Promise<Array<Record<string, unknown>>> =>
    ipcRenderer.invoke('telegram:payment-get-stars-topup-options', { accountId }),
  paymentGetStarGifts: (accountId: string, hash = 0): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:payment-get-star-gifts', { accountId, hash }),
  paymentGetSavedStarGifts: (accountId: string, peerId: string, options: Record<string, unknown> = {}): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:payment-get-saved-star-gifts', { accountId, peerId, options }),
  paymentGetStarsRevenueStats: (accountId: string, peerId: string, dark = false, ton = false): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:payment-get-stars-revenue-stats', { accountId, peerId, dark, ton }),
  paymentGetConnectedStarRefBots: (accountId: string, peerId: string, offsetDate = 0, offsetLink = '', limit = 50): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:payment-get-connected-star-ref-bots', { accountId, peerId, offsetDate, offsetLink, limit }),
  paymentConnectStarRefBot: (accountId: string, peerId: string, botId: string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:payment-connect-star-ref-bot', { accountId, peerId, botId }),
  paymentSendStarsForm: (accountId: string, formId: bigint, invoice: Record<string, unknown>): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:payment-send-stars-form', { accountId, formId, invoice }),

  // Security, Authentication & Account Suite Domain API (Phase 5)
  securityGetNotifySettings: (accountId: string, peerId?: string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:security-get-notify-settings', { accountId, peerId }),
  securityUpdateNotifySettings: (accountId: string, peerId: string, settings: Record<string, unknown>): Promise<boolean> =>
    ipcRenderer.invoke('telegram:security-update-notify-settings', { accountId, peerId, settings }),
  securityResetNotifySettings: (accountId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:security-reset-notify-settings', { accountId }),
  securityGetAuthorizations: (accountId: string): Promise<Array<Record<string, unknown>>> =>
    ipcRenderer.invoke('telegram:security-get-authorizations', { accountId }),
  securityResetAuthorizations: (accountId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:security-reset-authorizations', { accountId }),
  securityGetPassword: (accountId: string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:security-get-password', { accountId }),
  securityGetPrivacy: (accountId: string, key: Record<string, unknown> | string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:security-get-privacy', { accountId, key }),
  securitySetPrivacy: (accountId: string, key: Record<string, unknown> | string, rules: Array<Record<string, unknown>>): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:security-set-privacy', { accountId, key, rules }),
  securityGetWallpapers: (accountId: string, hash = 0n): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:security-get-wallpapers', { accountId, hash }),
  securityUpdatePersonalChannel: (accountId: string, channelId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:security-update-personal-channel', { accountId, channelId }),
  securityUpdateColor: (accountId: string, color?: number, backgroundEmojiId?: bigint, forProfile = false): Promise<boolean> =>
    ipcRenderer.invoke('telegram:security-update-color', { accountId, color, backgroundEmojiId, forProfile }),

  // Core Messaging Engine, Stories & Media Domain API (Phase 6)
  messagingGetHistory: (accountId: string, peerId: string, offsetId = 0, offsetDate = 0, addOffset = 0, limit = 50, maxId = 0, minId = 0, hash = 0n): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:messaging-get-history', { accountId, peerId, offsetId, offsetDate, addOffset, limit, maxId, minId, hash }),
  messagingSearchGlobal: (accountId: string, q = '', filter: Record<string, unknown> = { _: 'inputMessagesFilterEmpty' }, minDate = 0, maxDate = 0, offsetRate = 0, offsetId = 0, limit = 50): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:messaging-search-global', { accountId, q, filter, minDate, maxDate, offsetRate, offsetId, limit }),
  messagingSendReaction: (accountId: string, peerId: string, msgId: number, reaction?: Record<string, unknown> | string, big = false, addToRecent = true): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:messaging-send-reaction', { accountId, peerId, msgId, reaction, big, addToRecent }),
  messagingStoriesGetPeerStories: (accountId: string, peerId: string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:messaging-stories-get-peer-stories', { accountId, peerId }),
  messagingStoriesSendStory: (accountId: string, peerId: string, media: Record<string, unknown>, privacyRules: Array<Record<string, unknown>> = [{ _: 'inputPrivacyValueAllowAll' }], caption = ''): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:messaging-stories-send-story', { accountId, peerId, media, privacyRules, caption }),

  // System & Specialized Namespaces Domain API (Phase 7)
  systemGetConfig: (accountId: string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:system-get-config', { accountId }),
  systemGetAppConfig: (accountId: string, hash = 0): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:system-get-app-config', { accountId, hash }),
  systemGetNearestDc: (accountId: string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:system-get-nearest-dc', { accountId }),
  systemPhoneGetCallConfig: (accountId: string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:system-phone-get-call-config', { accountId }),
  systemStatsGetBroadcastStats: (accountId: string, channelId: string, dark = false): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:system-stats-get-broadcast-stats', { accountId, channelId, dark }),
  systemChatlistsGetExportedInvites: (accountId: string, chatlistId: string): Promise<Array<Record<string, unknown>>> =>
    ipcRenderer.invoke('telegram:system-chatlists-get-exported-invites', { accountId, chatlistId }),

  // MTProto Sessions, Cloud Folders & Translation
  getActiveSessions: (accountId: string): Promise<ActiveSessionItem[]> =>
    ipcRenderer.invoke('telegram:get-active-sessions', { accountId }),
  terminateSession: (accountId: string, hash: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:terminate-session', { accountId, hash }),
  translateMessage: (accountId: string, chatId: string, messageId: number, toLang?: string): Promise<TranslatedTextResult> =>
    ipcRenderer.invoke('telegram:translate-message', { accountId, chatId, messageId, toLang }),
  getCloudFolders: (accountId: string): Promise<CloudFolderItem[]> =>
    ipcRenderer.invoke('telegram:get-cloud-folders', { accountId }),
  updateDialogFilter: (
    accountId: string,
    id: number,
    filterData?: any
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:update-dialog-filter', { accountId, id, filterData }),
  updateDialogFiltersOrder: (
    accountId: string,
    order: number[]
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:update-dialog-filters-order', { accountId, order }),
  getSuggestedDialogFilters: (
    accountId: string
  ): Promise<any[]> =>
    ipcRenderer.invoke('telegram:get-suggested-dialog-filters', { accountId }),
  decodeWaveform: (waveform: number[] | Uint8Array): Promise<number[] | undefined> =>
    ipcRenderer.invoke('telegram:decode-waveform', { waveform }),
  encodeWaveform: (samples: number[]): Promise<number[]> =>
    ipcRenderer.invoke('telegram:encode-waveform', { samples }),

  // MTProto Stickers, Stories, Boosts & 2FA
  getInstalledStickerSets: (accountId: string): Promise<StickerSetItem[]> =>
    ipcRenderer.invoke('telegram:get-installed-stickers', { accountId }),
  getStickerSet: (accountId: string, setId: string, accessHash: string): Promise<StickerSetItem | null> =>
    ipcRenderer.invoke('telegram:get-stickerset', { accountId, setId, accessHash }),
  installStickerSet: (
    accountId: string,
    setId: string,
    accessHash: string,
    archived = false
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:install-stickerset', { accountId, setId, accessHash, archived }),
  uninstallStickerSet: (accountId: string, setId: string, accessHash: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:uninstall-stickerset', { accountId, setId, accessHash }),
  checkStickerShortName: (accountId: string, shortName: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:check-sticker-short-name', { accountId, shortName }),
  suggestStickerShortName: (accountId: string, title: string): Promise<string> =>
    ipcRenderer.invoke('telegram:suggest-sticker-short-name', { accountId, title }),
  renameStickerSet: (
    accountId: string,
    setId: string,
    accessHash: string,
    title: string
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:rename-stickerset', { accountId, setId, accessHash, title }),
  deleteStickerSet: (accountId: string, setId: string, accessHash: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:delete-stickerset', { accountId, setId, accessHash }),
  removeStickerFromSet: (
    accountId: string,
    docId: string,
    accessHash: string,
    fileReferenceHex?: string
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:remove-sticker-from-set', {
      accountId,
      docId,
      accessHash,
      fileReferenceHex,
    }),
  changeStickerPosition: (
    accountId: string,
    docId: string,
    accessHash: string,
    position: number,
    fileReferenceHex?: string
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:change-sticker-position', {
      accountId,
      docId,
      accessHash,
      position,
      fileReferenceHex,
    }),
  sendSticker: (
    accountId: string,
    chatId: string,
    documentId: string,
    accessHash: string,
    fileRef?: string,
    replyToMsgId?: number
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:send-sticker', { accountId, chatId, documentId, accessHash, fileRef, replyToMsgId }),
  getStickerData: (
    accountId: string,
    documentId: string,
    accessHash: string,
    fileRef?: string
  ): Promise<{ format: 'lottie' | 'image' | 'video'; url?: string; data?: Record<string, unknown> | ArrayBuffer | string } | null> =>
    ipcRenderer.invoke('telegram:get-sticker-data', { accountId, documentId, accessHash, fileRef }),
  getAllStories: (accountId: string): Promise<ActiveStoriesResult> =>
    ipcRenderer.invoke('telegram:get-all-stories', { accountId }),
  getPeerStories: (accountId: string, peerId: string): Promise<PeerStoriesPayload | null> =>
    ipcRenderer.invoke('telegram:get-peer-stories', { accountId, peerId }),
  getStoryMedia: (
    accountId: string,
    peerId: string,
    storyId: number
  ): Promise<StoryMediaResult> =>
    ipcRenderer.invoke('telegram:get-story-media', { accountId, peerId, storyId }),
  readStories: (accountId: string, peerId: string, maxId: number): Promise<boolean> =>
    ipcRenderer.invoke('telegram:read-stories', { accountId, peerId, maxId }),
  sendStory: (
    accountId: string,
    filePath: string,
    options?: SendStoryOptions
  ): Promise<SendStoryResult> =>
    ipcRenderer.invoke('telegram:send-story', { accountId, filePath, options }),
  deleteStory: (
    accountId: string,
    storyId: number,
    peerId?: string
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:delete-story', { accountId, storyId, peerId }),
  canSendStory: (accountId: string, peerId?: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:can-send-story', { accountId, peerId }),
  exportStoryLink: (accountId: string, peerId: string, storyId: number): Promise<string | null> =>
    ipcRenderer.invoke('telegram:export-story-link', { accountId, peerId, storyId }),
  toggleStoryPinned: (
    accountId: string,
    storyIds: number[],
    pinned: boolean,
    peerId?: string
  ): Promise<number[]> =>
    ipcRenderer.invoke('telegram:toggle-story-pinned', { accountId, storyIds, pinned, peerId }),
  getStoryViewsList: (
    accountId: string,
    storyId: number,
    options?: { offset?: string; limit?: number; peerId?: string }
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-story-views-list', { accountId, storyId, options }),
  activateStoryStealthMode: (
    accountId: string,
    options?: { past?: boolean; future?: boolean }
  ): Promise<{ success: boolean; result?: any; error?: string }> =>
    ipcRenderer.invoke('telegram:activate-story-stealth-mode', { accountId, ...options }),
  sendStoryReaction: (
    accountId: string,
    peerId: string,
    storyId: number,
    reaction: string
  ): Promise<{ success: boolean; result?: any; error?: string }> =>
    ipcRenderer.invoke('telegram:send-story-reaction', { accountId, peerId, storyId, reaction }),
  checkChatlistInvite: (accountId: string, slug: string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:check-chatlist-invite', { accountId, slug }),
  joinChatlistInvite: (accountId: string, slug: string, peerIds: string[]): Promise<boolean> =>
    ipcRenderer.invoke('telegram:join-chatlist-invite', { accountId, slug, peerIds }),
  sendWebViewData: (
    accountId: string,
    botPeerId: string,
    buttonText: string,
    data: string
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:send-web-view-data', { accountId, botPeerId, buttonText, data }),
  getInlineBotResults: (
    accountId: string,
    botUsername: string,
    query: string,
    offset?: string,
    peerId?: string
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-inline-bot-results', {
      accountId,
      botUsername,
      query,
      offset,
      peerId,
    }),
  getChannelBoostStatus: (accountId: string, channelId: string): Promise<ChannelBoostStatus | null> =>
    ipcRenderer.invoke('telegram:get-channel-boosts', { accountId, channelId }),
  getTwoFactorStatus: (accountId: string): Promise<TwoFactorStatus | null> =>
    ipcRenderer.invoke('telegram:get-two-factor-status', { accountId }),
  getMyFullProfile: (accountId: string): Promise<MyFullProfile | null> =>
    ipcRenderer.invoke('telegram:get-my-full-profile', { accountId }),
  getPrivacySettings: (accountId: string): Promise<PrivacySecuritySettings> =>
    ipcRenderer.invoke('telegram:get-privacy-settings', { accountId }),
  getEmojiStatuses: (accountId: string): Promise<EmojiStatusesResult> =>
    ipcRenderer.invoke('telegram:get-emoji-statuses', { accountId }),
  setEmojiStatus: (
    accountId: string,
    options: SetEmojiStatusOptions
  ): Promise<void> =>
    ipcRenderer.invoke('telegram:set-emoji-status', { accountId, ...options }),
  createGroup: (accountId: string, title: string, userIds: string[]): Promise<DialogItem | null> =>
    ipcRenderer.invoke('telegram:create-group', { accountId, title, userIds }),
  createChannel: (accountId: string, title: string, about: string, isMegagroup?: boolean): Promise<DialogItem | null> =>
    ipcRenderer.invoke('telegram:create-channel', { accountId, title, about, isMegagroup }),
  getSharedMedia: (
    accountId: string,
    chatId: string,
    filterType?: SharedMediaFilterType,
    limit?: number,
    offsetId?: number
  ): Promise<SharedMediaResponse> =>
    ipcRenderer.invoke('telegram:get-shared-media', { accountId, chatId, filterType, limit, offsetId }),

  // Proxy & Settings
  testProxyPing: (proxy: ProxyConfig) =>
    ipcRenderer.invoke('telegram:test-proxy-ping', { proxy }),
  startAutoHarvest: (intervalMs?: number): Promise<AutoHarvestStatus> =>
    ipcRenderer.invoke('proxy:start-auto-harvest', { intervalMs }),
  stopAutoHarvest: (): Promise<AutoHarvestStatus> =>
    ipcRenderer.invoke('proxy:stop-auto-harvest'),
  harvestNow: (channels?: string[]): Promise<ProxyConfig[]> =>
    ipcRenderer.invoke('proxy:harvest-now', { channels }),
  distributeProxiesToAccounts: (accountIds?: string[]): Promise<AccountInfo[]> =>
    ipcRenderer.invoke('proxy:distribute-to-accounts', { accountIds }),
  getHarvestStatus: (): Promise<AutoHarvestStatus> =>
    ipcRenderer.invoke('proxy:get-harvest-status'),
  getProxyHealthReport: (): Promise<ProxyHealthReport> =>
    ipcRenderer.invoke('proxy:get-detailed-health'),
  toggleWarp: (enabled?: boolean): Promise<WarpStatus> =>
    ipcRenderer.invoke('proxy:toggle-warp', { enabled }),
  getWarpStatus: (): Promise<WarpStatus> =>
    ipcRenderer.invoke('proxy:get-warp-status'),
  getConfig: () => ipcRenderer.invoke('telegram:get-config'),
  updateConfig: (partial: Partial<AppConfig>) =>
    ipcRenderer.invoke('telegram:update-config', { partial }),
  getPortableDataPath: () => ipcRenderer.invoke('system:get-portable-data-path'),
  getPortableLocator: (): Promise<PortableLocatorInfo | null> =>
    ipcRenderer.invoke('system:get-portable-locator'),
  syncFromPortable: (sourceDataPath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('system:sync-from-portable', { sourceDataPath }),

  // MCP (Model Context Protocol) Server for AI Agents
  mcpGetStatus: (): Promise<{ isRunning: boolean; port: number; enabled: boolean; activeToolsCount: number }> =>
    ipcRenderer.invoke('mcp:get-status'),
  mcpGetConfig: (): Promise<McpServerConfig> =>
    ipcRenderer.invoke('mcp:get-config'),
  mcpUpdateConfig: (config: Partial<McpServerConfig>): Promise<McpServerConfig> =>
    ipcRenderer.invoke('mcp:update-config', { config }),
  mcpGetConfigSnippets: (): Promise<{ claudeDesktop: string; cursor: string; sse: string; bridgePath: string; port: number }> =>
    ipcRenderer.invoke('mcp:get-config-snippets'),

  // Storage & Cache Management
  getCacheStats: (): Promise<CacheStats> =>
    ipcRenderer.invoke('telegram:get-cache-stats'),
  clearCache: (): Promise<{ clearedBytes: number; clearedFiles: number }> =>
    ipcRenderer.invoke('telegram:clear-cache'),
  enforceMediaQuota: (maxBytes?: number): Promise<{
    evictedFiles: number
    freedBytes: number
    remainingBytes: number
    totalFiles: number
  }> => ipcRenderer.invoke('telegram:enforce-media-quota', { maxBytes }),
  markEphemeralPlayed: (token: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:mark-ephemeral-played', { token }),
  registerEphemeralMedia: (
    token: string,
    filePath: string,
    ttlSeconds?: number,
    viewOnce?: boolean
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:register-ephemeral-media', { token, filePath, ttlSeconds, viewOnce }),
  selectDownloadDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke('telegram:select-download-directory'),

  // Software Updates
  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke('app:get-version'),
  checkForUpdates: (): Promise<UpdateInfo | null> =>
    ipcRenderer.invoke('system:check-for-updates'),
  installUpdate: (downloadUrl: string, version?: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('system:install-update', { downloadUrl, version }),

  // Logging & Diagnostics
  getLogs: (maxLines?: number) => ipcRenderer.invoke('system:get-logs', { maxLines }),
  openLogsFolder: () => ipcRenderer.invoke('system:open-logs-folder'),
  logError: (message: string, stack?: string) =>
    ipcRenderer.invoke('system:log-renderer-error', { message, stack }),
  getIpcSecurityTelemetry: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('system:get-ipc-security-telemetry'),
  getAccountVaultTelemetry: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('system:get-account-vault-telemetry'),
  getMediaStreamTelemetry: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('system:get-media-stream-telemetry'),
  getNetworkReconnectTelemetry: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('system:get-network-reconnect-telemetry'),
  getSqliteDeadlockTelemetry: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('system:get-sqlite-deadlock-telemetry'),
  reconnectAllAccounts: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('telegram:reconnect-all-accounts'),
  sanitizeDroppedFile: (file: { name: string; path?: string; size?: number; type?: string }): Promise<{
    safe: boolean
    sanitizedName: string
    reason?: string
    extension?: string
    isDoubleExtension?: boolean
  }> => ipcRenderer.invoke('system:sanitize-dropped-file', file),
  sanitizeDroppedText: (text: string): Promise<{
    safe: boolean
    sanitizedText: string
    isUrl: boolean
    isDangerousUri: boolean
    warning?: string
  }> => ipcRenderer.invoke('system:sanitize-dropped-text', text),
  getDragDropTelemetry: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('system:get-drag-drop-telemetry'),
  getMemoryPressureTelemetry: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('system:get-memory-pressure-telemetry'),
  forceMemoryCleanup: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('system:force-memory-cleanup'),
  getIpcRedactionTelemetry: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('system:get-ipc-redaction-telemetry'),
  redactIpcPayload: (payload: any, options?: Record<string, any>): Promise<any> =>
    ipcRenderer.invoke('system:redact-ipc-payload', payload, options),
  resetIpcRedactionTelemetry: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('system:reset-ipc-redaction-telemetry'),
  getPowerLifecycleTelemetry: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('system:get-power-lifecycle-telemetry'),
  simulatePowerSuspend: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('system:simulate-power-suspend'),
  simulatePowerResume: (sleepDurationMs?: number): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('system:simulate-power-resume', { sleepDurationMs }),
  getMtprotoAuditReport: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:get-mtproto-audit'),

  // Master Local Passcode & Key Derivation (Layer 08 / MM-004)
  passcode: {
    getStatus: (): Promise<{
      isPasscodeSet: boolean
      isLocked: boolean
      autoLockMinutes: number
      failedAttempts: number
      isRateLimited: boolean
      rateLimitedUntilMs: number | null
    }> => ipcRenderer.invoke('passcode:get-status'),
    setPasscode: (
      newPasscode: string,
      currentPasscode?: string
    ): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('passcode:set', { newPasscode, currentPasscode }),
    removePasscode: (currentPasscode: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('passcode:remove', { currentPasscode }),
    unlock: (
      passcode: string
    ): Promise<{
      success: boolean
      error?: string
      remainingAttempts?: number
      lockedUntil?: number
    }> => ipcRenderer.invoke('passcode:unlock', { passcode }),
    lock: (): Promise<boolean> => ipcRenderer.invoke('passcode:lock'),
    setAutoLockMinutes: (minutes: number): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('passcode:set-autolock-minutes', { minutes }),
  },

  // Privacy & Anti-Screen Capture Protection (Layer 08)
  privacy: {
    setContentProtection: (reason: string, enable: boolean): Promise<boolean> =>
      ipcRenderer.invoke('privacy:set-content-protection', { reason, enable }),
    getContentProtectionStatus: (): Promise<{
      isProtected: boolean
      activeReasons: string[]
      platformSupported: boolean
    }> => ipcRenderer.invoke('privacy:get-content-protection-status'),
  },

  // Events
  on: (channel: string, callback: (...args: any[]) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: any[]) => callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => {
      ipcRenderer.removeListener(channel, subscription)
    }
  },
}

export type GuidegramAPI = typeof guidegramAPI

contextBridge.exposeInMainWorld('guidegram', guidegramAPI)
