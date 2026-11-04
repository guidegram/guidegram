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
  MessageEntityItem,
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
  ExportChatHistoryOptions,
  ExportChatHistoryResult,
  QuickReplyShortcutItem,
  UserActivityStats,
  ContactChangeEvent,
  ContactChangeFilter,
  ActivityLogRetentionPeriod,
  AccountOnlineTimelineData,
  PreparedExportResult,
  ExportedAccountPayload,
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
  openAccountWindow: (accountId: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('window:open-account-window', { accountId }),
  showTitlebarMenu: () => ipcRenderer.invoke('window:show-titlebar-menu'),
  flashWindow: (flag: boolean = true): Promise<boolean> =>
    ipcRenderer.invoke('window:flash', flag),
  focusWindow: (): Promise<boolean> =>
    ipcRenderer.invoke('window:focus'),

  // Desktop Corner Notifications
  syncDesktopNotifications: (payload: {
    notifications: any[]
    position?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left'
    privacyMode?: 'full' | 'hide-text' | 'hide-all'
    quickReplyEnabled?: boolean
  }): Promise<boolean> => ipcRenderer.invoke('notifications:sync', payload),
  dispatchNotificationAction: (action: string, payload: any): Promise<any> =>
    ipcRenderer.invoke('notifications:dispatch-action', { action, payload }),

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
  refreshAccountProfile: (accountId: string): Promise<AccountInfo | null> =>
    ipcRenderer.invoke('telegram:refresh-account-profile', { accountId }),
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
  setAccountProxy: (accountId: string, proxy?: ProxyConfig): Promise<AccountInfo> =>
    ipcRenderer.invoke('telegram:set-account-proxy', { accountId, proxy }),
  prepareAccountExport: (accountIds?: string[]): Promise<PreparedExportResult> =>
    ipcRenderer.invoke('telegram:prepare-account-export', { accountIds }),
  cancelAccountExport: (): Promise<boolean> =>
    ipcRenderer.invoke('telegram:cancel-account-export'),
  decryptAccountExport: (wirePacket: string, pin: string): Promise<ExportedAccountPayload[]> =>
    ipcRenderer.invoke('telegram:decrypt-account-export', { wirePacket, pin }),

  // Dialogs & Messages
  getCachedDialogs: (accountId: string): Promise<DialogItem[]> =>
    ipcRenderer.invoke('telegram:get-cached-dialogs', { accountId }),
  getDialogs: (
    accountId: string,
    limit?: number,
    offsetDate?: number,
    offsetId?: number,
    offsetPeerId?: string
  ): Promise<DialogItem[]> =>
    ipcRenderer.invoke('telegram:get-dialogs', { accountId, limit, offsetDate, offsetId, offsetPeerId }),
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

  // User Activity & Online Status Tracking
  getUserActivity: (accountId: string, userId: string): Promise<UserActivityStats | null> =>
    ipcRenderer.invoke('telegram:get-user-activity', { accountId, userId }),

  getContactChanges: (
    accountId: string,
    filter?: ContactChangeFilter
  ): Promise<ContactChangeEvent[]> =>
    ipcRenderer.invoke('telegram:get-contact-changes', { accountId, filter }),

  getOnlineTimeline: (accountId: string): Promise<AccountOnlineTimelineData> =>
    ipcRenderer.invoke('telegram:get-online-timeline', { accountId }),

  getCommonChats: (
    accountId: string,
    userId: string,
    limit?: number
  ): Promise<Array<{ id: string; title: string; avatarUrl?: string; memberCount?: number; username?: string }>> =>
    ipcRenderer.invoke('telegram:get-common-chats', { accountId, userId, limit }),

  syncContactsAudit: (
    accountId: string
  ): Promise<{ totalContacts: number; newEventsCount: number }> =>
    ipcRenderer.invoke('telegram:sync-contacts-audit', { accountId }),

  getUserChangeHistory: (accountId: string, userId: string): Promise<ContactChangeEvent[]> =>
    ipcRenderer.invoke('telegram:get-user-change-history', { accountId, userId }),

  setUserTracking: (userId: string, enabled: boolean): Promise<boolean> =>
    ipcRenderer.invoke('telegram:set-user-tracking', { userId, enabled }),

  getUserTracking: (accountId: string, userId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:get-user-tracking', { accountId, userId }),

  clearActivityData: (accountId: string, type?: 'all' | 'status' | 'changes'): Promise<boolean> =>
    ipcRenderer.invoke('telegram:clear-activity-data', { accountId, type }),

  getActivityStats: (
    accountId: string
  ): Promise<{
    totalEvents: number
    totalSessions: number
    totalUsersTracked: number
    dataSizeBytes: number
  }> => ipcRenderer.invoke('telegram:get-activity-stats', { accountId }),

  pruneActivityData: (
    accountId: string,
    retentionPeriod?: ActivityLogRetentionPeriod
  ): Promise<{ prunedStatusCount: number; prunedChangesCount: number }> =>
    ipcRenderer.invoke('telegram:prune-activity-data', { accountId, retentionPeriod }),
  sendMedia: (
    accountId: string,
    chatId: string,
    filePath: string,
    options?: SendMediaOptions
  ): Promise<MessageItem> =>
    ipcRenderer.invoke('telegram:send-media', { accountId, chatId, filePath, options }),
  sendMediaGroup: (
    accountId: string,
    chatId: string,
    items: Array<{ filePath: string; caption?: string; forceDocument?: boolean; isSpoiler?: boolean }>,
    options?: SendMediaOptions
  ): Promise<MessageItem[]> =>
    ipcRenderer.invoke('telegram:send-media-group', { accountId, chatId, items, options }),
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
  copyImageToClipboard: (payload: {
    dataUrl?: string
    filePath?: string
  }): Promise<boolean> =>
    ipcRenderer.invoke('system:copy-image-to-clipboard', payload),
  saveImageToFile: (payload: {
    dataUrl?: string
    filePath?: string
    defaultName?: string
  }): Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }> =>
    ipcRenderer.invoke('system:save-image-to-file', payload),
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
  getUserProfilePhotos: (accountId: string, peerId: string): Promise<string[]> =>
    ipcRenderer.invoke('telegram:get-user-profile-photos', { accountId, peerId }),
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
    defaultName?: string,
    promptSaveAs?: boolean
  ): Promise<{ success: boolean; filePath?: string; fileName?: string; canceled?: boolean; error?: string }> =>
    ipcRenderer.invoke('telegram:save-media-to-file', { accountId, chatId, messageId, defaultName, promptSaveAs }),
  showItemInFolder: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('system:show-in-folder', { filePath }),
  showMediaInFolder: (
    accountId: string,
    chatId: string,
    messageId: number
  ): Promise<{ success: boolean; filePath?: string; error?: string }> =>
    ipcRenderer.invoke('telegram:show-media-in-folder', { accountId, chatId, messageId }),
  openMediaFile: (
    accountId: string,
    chatId: string,
    messageId: number
  ): Promise<{ success: boolean; filePath?: string; error?: string }> =>
    ipcRenderer.invoke('telegram:open-media-file', { accountId, chatId, messageId }),
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
  toggleDialogPin: (accountId: string, chatId: string, pinned: boolean): Promise<boolean> =>
    ipcRenderer.invoke('telegram:toggle-dialog-pin', { accountId, chatId, pinned }),
  markDialogUnread: (accountId: string, chatId: string, unread: boolean): Promise<boolean> =>
    ipcRenderer.invoke('telegram:mark-dialog-unread', { accountId, chatId, unread }),
  deleteChatHistory: (accountId: string, chatId: string, revoke = true): Promise<boolean> =>
    ipcRenderer.invoke('telegram:delete-chat-history', { accountId, chatId, revoke }),
  leaveChat: (accountId: string, chatId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:leave-chat', { accountId, chatId }),
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke('system:open-external', { url }),
  getLinkPreview: (url: string, accountId?: string): Promise<WebPagePreview | null> =>
    ipcRenderer.invoke('web:get-link-preview', { url, accountId }),
  getWebPagePreview: (accountId: string, message: string, entities?: any): Promise<WebPagePreview | null> =>
    ipcRenderer.invoke('telegram:get-webpage-preview', { accountId, message, entities }),
  getWebPage: (accountId: string, url: string, hash?: number): Promise<WebPagePreview | null> =>
    ipcRenderer.invoke('telegram:get-webpage', { accountId, url, hash }),
  getInstantView: (accountId: string, url: string, hash?: number): Promise<InstantViewArticle | null> =>
    ipcRenderer.invoke('telegram:get-instant-view', { accountId, url, hash }),
  getDiscussionMessage: (accountId: string, peerId: string, msgId: number): Promise<DiscussionThreadInfo | null> =>
    ipcRenderer.invoke('telegram:get-discussion-message', { accountId, peerId, msgId }),
  setDiscussionGroup: (accountId: string, broadcastId: string, groupId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:set-discussion-group', { accountId, broadcastId, groupId }),

  // Global Telegram Search & Historical Messages
  searchPublicPeers: (accountId: string, query: string): Promise<DialogItem[]> =>
    ipcRenderer.invoke('telegram:search-public-peers', { accountId, query }),
  searchGlobal: (accountId: string, query: string, filterType?: string, limit?: number, minDate?: number, maxDate?: number, chatTypeScope?: string): Promise<MessageItem[]> =>
    ipcRenderer.invoke('telegram:search-global', { accountId, query, filterType, limit, minDate, maxDate, chatTypeScope }),
  searchMessages: (
    accountId: string,
    chatId: string,
    query: string,
    options?: {
      filterType?: string
      savedSourceId?: string
      savedTag?: string
      limit?: number
      offsetId?: number
      minDate?: number
      maxDate?: number
      fromId?: string
    }
  ): Promise<MessageItem[]> =>
    ipcRenderer.invoke('telegram:search-messages', { accountId, chatId, query, options }),
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
  stopLiveLocation: (
    accountId: string,
    chatId: string,
    messageId: number
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:stop-live-location', { accountId, chatId, messageId }),
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
    replyToMsgId?: number,
    entities?: MessageEntityItem[]
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:save-draft', { accountId, chatId, message, replyToMsgId, entities }),
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
  updateBusinessGreetingMessage: (
    accountId: string,
    greeting: { shortcutId: number; noActivityDays?: number } | null
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:update-business-greeting-message', { accountId, greeting }),
  updateBusinessAwayMessage: (
    accountId: string,
    away: { shortcutId: number; offlineOnly?: boolean; schedule?: string } | null
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:update-business-away-message', { accountId, away }),
  createBusinessChatLink: (
    accountId: string,
    link: { message: string; title?: string }
  ): Promise<BusinessChatLink> =>
    ipcRenderer.invoke('telegram:create-business-chat-link', { accountId, link }),
  deleteBusinessChatLink: (accountId: string, slug: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:delete-business-chat-link', { accountId, slug }),
  editBusinessChatLink: (
    accountId: string,
    slug: string,
    link: { message: string; title?: string }
  ): Promise<BusinessChatLink> =>
    ipcRenderer.invoke('telegram:edit-business-chat-link', { accountId, slug, link }),
  getSavedStarGifts: (accountId: string, userId?: string): Promise<StarGiftItem[]> =>
    ipcRenderer.invoke('telegram:get-star-gifts', { accountId, userId }),
  getStarGifts: (accountId: string): Promise<StarGiftItem[]> =>
    ipcRenderer.invoke('telegram:get-star-gift-catalog', { accountId }),
  getStarGiftMedia: (
    accountId: string,
    documentId: string,
    rawDoc?: any
  ): Promise<{ format: 'lottie' | 'video' | 'image'; data?: any; url?: string } | null> =>
    ipcRenderer.invoke('telegram:get-star-gift-media', { accountId, documentId, rawDoc }),
  getStarGiftCollectionTraits: (
    accountId: string,
    slug?: string,
    title?: string
  ): Promise<{
    models: Array<{ name: string; rarityPercent: number; isSelected?: boolean; documentId?: string; iconEmoji?: string }>;
    backdrops: Array<{ name: string; rarityPercent: number; centerColor: string; edgeColor: string; isSelected?: boolean }>;
    symbols: Array<{ name: string; rarityPercent: number; isSelected?: boolean; iconEmoji?: string }>;
  }> =>
    ipcRenderer.invoke('telegram:get-star-gift-collection-traits', { accountId, slug, title }),
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
  togglePaidReactionPrivacy: (
    accountId: string,
    chatId: string,
    messageId: number,
    isPrivate: boolean
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:toggle-paid-reaction-privacy', { accountId, chatId, messageId, isPrivate }),
  sendPaidMedia: (
    accountId: string,
    chatId: string,
    starsAmount: number,
    media: any[],
    caption?: string,
    payload?: string
  ): Promise<{ success: boolean; result?: any; error?: string }> =>
    ipcRenderer.invoke('telegram:send-paid-media', { accountId, chatId, starsAmount, media, caption, payload }),
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
  sendEncryptedFile: (
    accountId: string,
    chatId: number,
    accessHash: string,
    dataHex: string,
    fileInput: {
      id: string | number
      accessHash: string | number
      size?: number
      dcId?: number
      keyFingerprint?: number
      _?: string
    },
    silent = false
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:send-encrypted-file', {
      accountId,
      chatId,
      accessHash,
      dataHex,
      fileInput,
      silent,
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
  exportChatHistory: (
    accountId: string,
    chatId: string,
    options: ExportChatHistoryOptions,
    saveToFile = true
  ): Promise<ExportChatHistoryResult> =>
    ipcRenderer.invoke('telegram:export-chat-history', { accountId, chatId, options, saveToFile }),
  getAutoDownloadSettings: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-autodownload-settings', { accountId }),
  saveAutoDownloadSettings: (accountId: string, low?: boolean, high?: boolean, settings?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:save-autodownload-settings', { accountId, low, high, settings }),
  getSavedRingtones: (accountId: string, hash?: bigint | number): Promise<any> =>
    ipcRenderer.invoke('telegram:get-saved-ringtones', { accountId, hash }),
  saveRingtone: (accountId: string, id: any, unsave?: boolean): Promise<any> =>
    ipcRenderer.invoke('telegram:save-ringtone', { accountId, id, unsave }),
  uploadRingtone: (accountId: string, file: any, fileName?: string, mimeType?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:upload-ringtone', { accountId, file, fileName, mimeType }),

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
  toggleFolderPin: (
    accountId: string,
    folderId: number,
    chatId: string,
    pinned: boolean
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:toggle-folder-pin', { accountId, folderId, chatId, pinned }),
  getFolderPeerDialogs: (
    accountId: string,
    peerIds: string[]
  ): Promise<DialogItem[]> =>
    ipcRenderer.invoke('telegram:get-folder-peer-dialogs', { accountId, peerIds }),
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
  getInstalledEmojiSets: (accountId: string): Promise<StickerSetItem[]> =>
    ipcRenderer.invoke('telegram:get-installed-emojis', { accountId }),
  getRecentStickers: (accountId: string): Promise<StickerItem[]> =>
    ipcRenderer.invoke('telegram:get-recent-stickers', { accountId }),
  getSavedGifs: (accountId: string): Promise<StickerItem[]> =>
    ipcRenderer.invoke('telegram:get-saved-gifs', { accountId }),
  sendSavedGif: (
    accountId: string,
    chatId: string,
    documentId: string,
    accessHash: string,
    fileRef?: string,
    replyToMsgId?: number
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:send-saved-gif', { accountId, chatId, documentId, accessHash, fileRef, replyToMsgId }),
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
  setStoriesPrivacy: (
    accountId: string,
    privacy: 'everyone' | 'contacts' | 'close_friends' | 'selected_contacts' | 'nobody',
    allowedUserIds?: string[]
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:set-stories-privacy', { accountId, privacy, allowedUserIds }),
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
  getStoriesArchive: (
    accountId: string,
    peerId?: string,
    offsetId?: number,
    limit?: number
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-stories-archive', { accountId, peerId, offsetId, limit }),
  getPinnedStories: (
    accountId: string,
    peerId?: string,
    offsetId?: number,
    limit?: number
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-pinned-stories', { accountId, peerId, offsetId, limit }),
  applyChannelBoost: (
    accountId: string,
    channelId: string,
    slots?: number[]
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:apply-channel-boost', { accountId, channelId, slots }),
  getMyBoosts: (accountId: string): Promise<any[]> =>
    ipcRenderer.invoke('telegram:get-my-boosts', { accountId }),
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
  prolongWebView: (
    accountId: string,
    peerId: string,
    botId: string,
    queryId: string | number | bigint,
    silent?: boolean
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:prolong-web-view', { accountId, peerId, botId, queryId, silent }),
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
  sendInlineBotResult: (
    accountId: string,
    peerId: string,
    queryId: string,
    resultId: string,
    options?: {
      replyToMsgId?: number
      silent?: boolean
      clearDraft?: boolean
      hideVia?: boolean
      scheduleDate?: number
    }
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:send-inline-bot-result', {
      accountId,
      peerId,
      queryId,
      resultId,
      options,
    }),
  getGameHighScores: (
    accountId: string,
    peerId: string,
    messageId: number,
    userId?: string
  ): Promise<Record<string, unknown> | null> =>
    ipcRenderer.invoke('telegram:get-game-high-scores', {
      accountId,
      peerId,
      messageId,
      userId,
    }),
  setGameScore: (
    accountId: string,
    peerId: string,
    messageId: number,
    score: number,
    userId?: string,
    force = false,
    editMessage = true
  ): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:set-game-score', {
      accountId,
      peerId,
      messageId,
      score,
      userId,
      force,
      editMessage,
    }),
  setHistoryTTL: (accountId: string, peerId: string, period: number): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:set-history-ttl', { accountId, peerId, period }),
  getDefaultHistoryTTL: (accountId: string): Promise<{ period: number } | null> =>
    ipcRenderer.invoke('telegram:get-default-history-ttl', { accountId }),
  setDefaultHistoryTTL: (accountId: string, period: number): Promise<boolean> =>
    ipcRenderer.invoke('telegram:set-default-history-ttl', { accountId, period }),
  transcribeAudio: (
    accountId: string,
    chatId: string,
    messageId: number
  ): Promise<{ text: string; transcriptionId?: string; isPending?: boolean; trialRemainsNum?: number } | null> =>
    ipcRenderer.invoke('telegram:transcribe-audio', { accountId, chatId, messageId }),
  getQuickReplies: (accountId: string): Promise<QuickReplyShortcutItem[]> =>
    ipcRenderer.invoke('telegram:get-quick-replies', { accountId }),
  sendQuickReplyMessages: (accountId: string, peerId: string, shortcutId: number): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('telegram:send-quick-reply-messages', { accountId, peerId, shortcutId }),
  editQuickReplyShortcut: (accountId: string, shortcutId: number, shortcut: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:edit-quick-reply-shortcut', { accountId, shortcutId, shortcut }),
  deleteQuickReplyShortcut: (accountId: string, shortcutId: number): Promise<boolean> =>
    ipcRenderer.invoke('telegram:delete-quick-reply-shortcut', { accountId, shortcutId }),
  setChatTheme: (accountId: string, chatId: string, emoticon: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:set-chat-theme', { accountId, chatId, emoticon }),
  setChatWallPaper: (accountId: string, chatId: string, wallpaperSlug?: string, forBoth?: boolean): Promise<boolean> =>
    ipcRenderer.invoke('telegram:set-chat-wallpaper', { accountId, chatId, wallpaperSlug, forBoth }),
  getChannelBoostStatus: (accountId: string, channelId: string): Promise<ChannelBoostStatus | null> =>
    ipcRenderer.invoke('telegram:get-channel-boosts', { accountId, channelId }),
  getTwoFactorStatus: (accountId: string): Promise<TwoFactorStatus | null> =>
    ipcRenderer.invoke('telegram:get-two-factor-status', { accountId }),
  accountResetPassword: (
    accountId: string
  ): Promise<{ status: 'ok' | 'wait' | 'failed'; retryDate?: number; untilDate?: number; error?: string }> =>
    ipcRenderer.invoke('telegram:account-reset-password', { accountId }),
  accountDeclinePasswordReset: (accountId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:account-decline-password-reset', { accountId }),
  getMyFullProfile: (accountId: string): Promise<MyFullProfile | null> =>
    ipcRenderer.invoke('telegram:get-my-full-profile', { accountId }),
  getPrivacySettings: (accountId: string): Promise<PrivacySecuritySettings> =>
    ipcRenderer.invoke('telegram:get-privacy-settings', { accountId }),
  getEmojiStatuses: (accountId: string): Promise<EmojiStatusesResult> =>
    ipcRenderer.invoke('telegram:get-emoji-statuses', { accountId }),
  clearRecentEmojiStatuses: (accountId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:clear-recent-emoji-statuses', { accountId }),
  deleteAutoSaveExceptions: (accountId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:delete-autosave-exceptions', { accountId }),
  createTheme: (accountId: string, params: { slug: string; title: string; settings?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:create-theme', { accountId, ...params }),
  deletePasskey: (accountId: string, id: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:delete-passkey', { accountId, id }),
  deleteWebBrowserSettingsExceptions: (accountId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:delete-web-browser-settings-exceptions', { accountId }),
  disablePeerConnectedBot: (accountId: string, peerId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:disable-peer-connected-bot', { accountId, peerId }),
  finishTakeoutSession: (accountId: string, success: boolean = true): Promise<boolean> =>
    ipcRenderer.invoke('telegram:finish-takeout-session', { accountId, success }),
  getAccountTTL: (accountId: string): Promise<number> =>
    ipcRenderer.invoke('telegram:get-account-ttl', { accountId }),
  setAccountTTL: (accountId: string, days: number): Promise<boolean> =>
    ipcRenderer.invoke('telegram:set-account-ttl', { accountId, days }),
  getAutoSaveSettings: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-autosave-settings', { accountId }),
  getAuthorizations: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-authorizations', { accountId }),
  getAuthorizationForm: (
    accountId: string,
    botId: string | number,
    scope: string,
    publicKey: string
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-authorization-form', { accountId, botId, scope, publicKey }),
  getBotBusinessConnection: (accountId: string, connectionId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-bot-business-connection', { accountId, connectionId }),
  getContactSignUpNotification: (accountId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:get-contact-signup-notification', { accountId }),
  getChatThemes: (accountId: string, hash?: number | string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-chat-themes', { accountId, hash }),
  getChannelDefaultEmojiStatuses: (accountId: string, hash?: number | string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-channel-default-emoji-statuses', { accountId, hash }),
  getChannelRestrictedStatusEmojis: (accountId: string, hash?: number | string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-channel-restricted-status-emojis', { accountId, hash }),
  getConnectedBots: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-connected-bots', { accountId }),
  getContentSettings: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-content-settings', { accountId }),
  getGlobalPrivacySettings: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-global-privacy-settings', { accountId }),
  getMultiWallPapers: (accountId: string, wallpapers?: any[]): Promise<any[]> =>
    ipcRenderer.invoke('telegram:get-multi-wallpapers', { accountId, wallpapers }),
  getDefaultBackgroundEmojis: (accountId: string, hash?: number | string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-default-background-emojis', { accountId, hash }),
  getDefaultProfilePhotoEmojis: (accountId: string, hash?: number | string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-default-profile-photo-emojis', { accountId, hash }),
  getDefaultGroupPhotoEmojis: (accountId: string, hash?: number | string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-default-group-photo-emojis', { accountId, hash }),
  getNotifySettings: (
    accountId: string,
    scope: 'users' | 'chats' | 'broadcasts' | string
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-notify-settings', { accountId, scope }),
  getNotifyExceptions: (
    accountId: string,
    compareSound?: boolean,
    compareStories?: boolean
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-notify-exceptions', { accountId, compareSound, compareStories }),
  getPaidMessagesRevenue: (
    accountId: string,
    userId: string | number,
    parentPeerId?: string
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-paid-messages-revenue', { accountId, userId, parentPeerId }),
  getPasskeys: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-passkeys', { accountId }),
  getPasswordSettings: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-password-settings', { accountId }),
  getReactionsNotifySettings: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-reactions-notify-settings', { accountId }),
  getRecentEmojiStatuses: (accountId: string, hash?: number | string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-recent-emoji-statuses', { accountId, hash }),
  getSavedMusicIds: (accountId: string, hash?: number | string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-saved-music-ids', { accountId, hash }),
  getTheme: (accountId: string, format: string, theme: any): Promise<any> =>
    ipcRenderer.invoke('telegram:get-theme', { accountId, format, theme }),
  getThemes: (accountId: string, format?: string, hash?: number | string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-themes', { accountId, format, hash }),
  getTmpPassword: (accountId: string, passwordSRP?: any, period?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:get-tmp-password', { accountId, passwordSRP, period }),
  getUniqueGiftChatThemes: (accountId: string, offset?: string, limit?: number, hash?: number | string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-unique-gift-chat-themes', { accountId, offset, limit, hash }),
  getWallPaper: (accountId: string, wallpaper: any): Promise<any> =>
    ipcRenderer.invoke('telegram:get-wallpaper', { accountId, wallpaper }),
  getWallPapers: (accountId: string, hash?: number | string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-wallpapers', { accountId, hash }),
  getWebAuthorizations: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-web-authorizations', { accountId }),
  getWebBrowserSettings: (accountId: string, hash?: number | string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-web-browser-settings', { accountId, hash }),
  initPasskeyRegistration: (accountId: string, params?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:init-passkey-registration', { accountId, params }),
  initTakeoutSession: (accountId: string, options?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:init-takeout-session', { accountId, options }),
  installTheme: (
    accountId: string,
    dark?: boolean,
    theme?: any,
    format?: string,
    baseTheme?: any
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:install-theme', { accountId, dark, theme, format, baseTheme }),
  installWallPaper: (accountId: string, wallpaper?: any, settings?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:install-wallpaper', { accountId, wallpaper, settings }),
  invalidateSignInCodes: (accountId: string, codes: string[]): Promise<any> =>
    ipcRenderer.invoke('telegram:invalidate-signin-codes', { accountId, codes }),
  registerDevice: (accountId: string, options?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:register-device', { accountId, options }),
  registerPasskey: (accountId: string, credential?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:register-passkey', { accountId, credential }),
  reorderUsernames: (accountId: string, order: string[]): Promise<any> =>
    ipcRenderer.invoke('telegram:reorder-usernames', { accountId, order }),
  reportPeer: (accountId: string, peerId?: string, reason?: any, message?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:report-peer', { accountId, peerId, reason, message }),
  reportProfilePhoto: (accountId: string, peerId?: string, photoId?: any, reason?: any, message?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:report-profile-photo', { accountId, peerId, photoId, reason, message }),
  resendPasswordEmail: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:resend-password-email', { accountId }),
  resetAuthorization: (accountId: string, hash: string | bigint | number): Promise<any> =>
    ipcRenderer.invoke('telegram:reset-authorization', { accountId, hash }),
  resetNotifySettings: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:reset-notify-settings', { accountId }),
  resetPassword: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:reset-password', { accountId }),
  resetWallPapers: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:reset-wallpapers', { accountId }),
  resetWebAuthorization: (accountId: string, hash: string | bigint | number): Promise<any> =>
    ipcRenderer.invoke('telegram:reset-web-authorization', { accountId, hash }),
  resetWebAuthorizations: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:reset-web-authorizations', { accountId }),
  resolveBusinessChatLink: (accountId: string, slug?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:resolve-business-chat-link', { accountId, slug }),
  saveAutoSaveSettings: (
    accountId: string,
    users?: boolean,
    chats?: boolean,
    broadcasts?: boolean,
    peerId?: string,
    settings?: any
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:save-auto-save-settings', { accountId, users, chats, broadcasts, peerId, settings }),
  saveMusic: (accountId: string, unsave?: boolean, id?: any, afterId?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:save-music', { accountId, unsave, id, afterId }),
  saveTheme: (accountId: string, theme?: any, unsave?: boolean): Promise<any> =>
    ipcRenderer.invoke('telegram:save-theme', { accountId, theme, unsave }),
  saveWallPaper: (accountId: string, wallpaper?: any, unsave?: boolean, settings?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:save-wallpaper', { accountId, wallpaper, unsave, settings }),
  sendChangePhoneCode: (accountId: string, phoneNumber?: string, settings?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:send-change-phone-code', { accountId, phoneNumber, settings }),
  sendConfirmPhoneCode: (accountId: string, hash?: string, settings?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:send-confirm-phone-code', { accountId, hash, settings }),
  sendVerifyEmailCode: (accountId: string, purpose?: any, email?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:send-verify-email-code', { accountId, purpose, email }),
  sendVerifyPhoneCode: (accountId: string, phoneNumber?: string, settings?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:send-verify-phone-code', { accountId, phoneNumber, settings }),
  setAuthorizationTTL: (accountId: string, authorizationTtlDays?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:set-authorization-ttl', { accountId, authorizationTtlDays }),
  setContactSignUpNotification: (accountId: string, silent?: boolean): Promise<any> =>
    ipcRenderer.invoke('telegram:set-contact-sign-up-notification', { accountId, silent }),
  setContentSettings: (accountId: string, sensitiveEnabled?: boolean): Promise<any> =>
    ipcRenderer.invoke('telegram:set-content-settings', { accountId, sensitiveEnabled }),
  setGlobalPrivacySettings: (accountId: string, settings?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:set-global-privacy-settings', { accountId, settings }),
  setMainProfileTab: (accountId: string, tab?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:set-main-profile-tab', { accountId, tab }),
  setPrivacy: (accountId: string, key?: any, rules?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:set-privacy', { accountId, key, rules }),
  setReactionsNotifySettings: (accountId: string, settings?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:set-reactions-notify-settings', { accountId, settings }),
  toggleConnectedBotPaused: (accountId: string, peerId?: string, paused?: boolean): Promise<any> =>
    ipcRenderer.invoke('telegram:toggle-connected-bot-paused', { accountId, peerId, paused }),
  toggleNoPaidMessagesException: (
    accountId: string,
    refundCharged?: boolean,
    requirePayment?: boolean,
    parentPeerId?: string,
    userIdId?: string
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:toggle-no-paid-messages-exception', {
      accountId,
      refundCharged,
      requirePayment,
      parentPeerId,
      userIdId,
    }),
  toggleAccountUsername: (accountId: string, username?: string, active?: boolean): Promise<any> =>
    ipcRenderer.invoke('telegram:toggle-account-username', { accountId, username, active }),
  toggleWebBrowserSettingsException: (
    accountId: string,
    deleteException?: boolean,
    openExternalBrowser?: boolean,
    url?: string
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:toggle-web-browser-settings-exception', {
      accountId,
      deleteException,
      openExternalBrowser,
      url,
    }),
  unregisterDevice: (accountId: string, tokenType?: number, token?: string, otherUids?: bigint | number): Promise<any> =>
    ipcRenderer.invoke('telegram:unregister-device', { accountId, tokenType, token, otherUids }),
  updateBirthday: (accountId: string, birthday?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:update-birthday', { accountId, birthday }),
  updateAccountColor: (accountId: string, forProfile?: boolean, color?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:update-color', { accountId, forProfile, color }),
  updateConnectedBot: (
    accountId: string,
    deleted?: boolean,
    rights?: any,
    botId?: string,
    recipients?: any
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:update-connected-bot', { accountId, deleted, rights, botId, recipients }),
  updateDeviceLocked: (accountId: string, period?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:update-device-locked', { accountId, period }),
  updatePasswordSettings: (accountId: string, password?: any, newSettings?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:update-password-settings', { accountId, password, newSettings }),
  updateProfile: (accountId: string, firstName?: string, lastName?: string, about?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:update-profile', { accountId, firstName, lastName, about }),
  updateStatus: (accountId: string, offline?: boolean): Promise<any> =>
    ipcRenderer.invoke('telegram:update-status', { accountId, offline }),
  updateTheme: (
    accountId: string,
    format?: string,
    theme?: any,
    slug?: string,
    title?: string,
    document?: any,
    settings?: any
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:update-theme', { accountId, format, theme, slug, title, document, settings }),
  updateAccountUsername: (accountId: string, username?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:update-account-username', { accountId, username }),
  updateWebBrowserSettings: (
    accountId: string,
    openExternalBrowser?: boolean,
    displayCloseButton?: boolean
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:update-web-browser-settings', { accountId, openExternalBrowser, displayCloseButton }),
  uploadTheme: (
    accountId: string,
    file?: any,
    thumb?: any,
    fileName?: string,
    mimeType?: string
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:upload-theme', { accountId, file, thumb, fileName, mimeType }),
  uploadWallPaper: (
    accountId: string,
    forChat?: boolean,
    file?: any,
    mimeType?: string,
    settings?: any
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:upload-wallpaper', { accountId, forChat, file, mimeType, settings }),
  verifyEmail: (accountId: string, purpose?: any, verification?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:verify-email', { accountId, purpose, verification }),
  verifyPhone: (accountId: string, phoneNumber?: string, phoneCodeHash?: string, phoneCode?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:verify-phone', { accountId, phoneNumber, phoneCodeHash, phoneCode }),
  getUserSavedMusic: (
    accountId: string,
    userId: string,
    offset?: number,
    limit?: number,
    hash?: bigint | number
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-user-saved-music', { accountId, userId, offset, limit, hash }),
  getUserSavedMusicByID: (
    accountId: string,
    userId: string,
    id: any[]
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-user-saved-music-by-id', { accountId, userId, id }),
  getUsers: (accountId: string, userIds: string[]): Promise<any[]> =>
    ipcRenderer.invoke('telegram:get-users', { accountId, userIds }),
  setSecureValueErrors: (accountId: string, userId: string, errors: any[]): Promise<boolean> =>
    ipcRenderer.invoke('telegram:set-secure-value-errors', { accountId, userId, errors }),
  suggestBirthday: (
    accountId: string,
    userId: string,
    day: number,
    month: number,
    year?: number
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:suggest-birthday', { accountId, userId, day, month, year }),
  acceptContact: (accountId: string, userId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:accept-contact', { accountId, userId }),
  blockContact: (accountId: string, peerId: string, myStoriesFrom?: boolean): Promise<boolean> =>
    ipcRenderer.invoke('telegram:block-contact', { accountId, peerId, myStoriesFrom }),
  blockFromReplies: (
    accountId: string,
    msgId: number,
    deleteMessage?: boolean,
    deleteHistory?: boolean,
    reportSpam?: boolean
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:block-from-replies', {
      accountId,
      msgId,
      deleteMessage,
      deleteHistory,
      reportSpam,
    }),
  deleteByPhones: (accountId: string, phones: string[]): Promise<boolean> =>
    ipcRenderer.invoke('telegram:delete-by-phones', { accountId, phones }),
  deleteContacts: (accountId: string, userIds: string[]): Promise<boolean> =>
    ipcRenderer.invoke('telegram:delete-contacts', { accountId, userIds }),
  editCloseFriends: (accountId: string, userIds: (string | number)[]): Promise<boolean> =>
    ipcRenderer.invoke('telegram:edit-close-friends', { accountId, userIds }),
  exportContactToken: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:export-contact-token', { accountId }),
  exportNoPaidMessagesToken: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:export-no-paid-messages-token', { accountId }),
  getContactIDs: (accountId: string, hash?: bigint | number): Promise<number[]> =>
    ipcRenderer.invoke('telegram:get-contact-ids', { accountId, hash }),
  getLocated: (
    accountId: string,
    lat: number,
    long: number,
    background?: boolean,
    selfExpires?: number
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-located', { accountId, lat, long, background, selfExpires }),
  getSavedContacts: (accountId: string): Promise<any[]> =>
    ipcRenderer.invoke('telegram:get-saved-contacts', { accountId }),
  getSponsoredPeers: (accountId: string, query?: string): Promise<any[]> =>
    ipcRenderer.invoke('telegram:get-sponsored-peers', { accountId, query }),
  getContactStatuses: (accountId: string): Promise<any[]> =>
    ipcRenderer.invoke('telegram:get-contact-statuses', { accountId }),
  importContactToken: (accountId: string, token: string): Promise<any> =>
    ipcRenderer.invoke('telegram:import-contact-token', { accountId, token }),
  importNoPaidMessagesToken: (accountId: string, userId: any, token: string): Promise<any> =>
    ipcRenderer.invoke('telegram:import-no-paid-messages-token', { accountId, userId, token }),
  resetSavedContacts: (accountId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:reset-saved-contacts', { accountId }),
  resetTopPeerRating: (accountId: string, category: string, peer: any): Promise<boolean> =>
    ipcRenderer.invoke('telegram:reset-top-peer-rating', { accountId, category, peer }),
  resolvePhone: (accountId: string, phone: string): Promise<any> =>
    ipcRenderer.invoke('telegram:resolve-phone', { accountId, phone }),
  resolveUsername: (accountId: string, username: string, referer?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:resolve-username', { accountId, username, referer }),
  searchContacts: (accountId: string, query: string, limit?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:search-contacts', { accountId, query, limit }),
  setBlocked: (accountId: string, id: any, myStoriesFrom?: boolean): Promise<boolean> =>
    ipcRenderer.invoke('telegram:set-blocked', { accountId, id, myStoriesFrom }),
  toggleTopPeers: (accountId: string, enabled: boolean): Promise<boolean> =>
    ipcRenderer.invoke('telegram:toggle-top-peers', { accountId, enabled }),
  // Layer 232 Messages Suite (Microphase 033)
  addChatUser: (accountId: string, chatId: bigint | number, userId: string, fwdLimit?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:add-chat-user', { accountId, chatId, userId, fwdLimit }),
  checkChatInvite: (accountId: string, hash: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:check-chat-invite', { accountId, hash }),
  acceptUrlAuth: (accountId: string, options: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:accept-url-auth', { accountId, options }),
  checkHistoryImport: (accountId: string, importHead: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:check-history-import', { accountId, importHead }),
  appendTodoList: (accountId: string, peerId: string, msgId: number, list: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:append-todo-list', { accountId, peerId, msgId, list }),
  addPollAnswer: (accountId: string, peerId: string, msgId: number, answer: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:add-poll-answer', { accountId, peerId, msgId, answer }),
  // Layer 232 Messages Suite (Microphase 034)
  checkHistoryImportPeer: (accountId: string, peerId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:check-history-import-peer', { accountId, peerId }),
  checkQuickReplyShortcut: (accountId: string, shortcut: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:messages:check-quick-reply-shortcut', { accountId, shortcut }),
  clearAllDrafts: (accountId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:messages:clear-all-drafts', { accountId }),
  clearRecentReactions: (accountId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:messages:clear-recent-reactions', { accountId }),
  clearRecentStickers: (accountId: string, attached = false): Promise<boolean> =>
    ipcRenderer.invoke('telegram:messages:clear-recent-stickers', { accountId, attached }),
  createChat: (accountId: string, userIds: string[], title: string, ttlPeriod?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:create-chat', { accountId, userIds, title, ttlPeriod }),
  deleteChat: (accountId: string, chatId: bigint | number): Promise<boolean> =>
    ipcRenderer.invoke('telegram:messages:delete-chat', { accountId, chatId }),
  checkUrlAuthMatchCode: (accountId: string, url: string, matchCode: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:check-url-auth-match-code', { accountId, url, matchCode }),
  // Layer 232 Messages Suite (Microphase 035)
  composeMessageWithAI: (accountId: string, options: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:compose-message-with-ai', { accountId, options }),
  composeRichMessageWithAI: (accountId: string, options: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:compose-rich-message-with-ai', { accountId, options }),
  declineUrlAuth: (accountId: string, url: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:decline-url-auth', { accountId, url }),
  deleteChatUser: (accountId: string, chatId: bigint | number, userId: string, revokeHistory?: boolean): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:delete-chat-user', { accountId, chatId, userId, revokeHistory }),
  // Layer 232 Messages Suite (Microphase 036)
  deleteExportedChatInvite: (accountId: string, peerId: string, link: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:delete-exported-chat-invite', { accountId, peerId, link }),
  deleteFactCheck: (accountId: string, peerId: string, msgId: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:delete-fact-check', { accountId, peerId, msgId }),
  deleteParticipantReaction: (accountId: string, peerId: string, msgId: number, participantId?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:delete-participant-reaction', { accountId, peerId, msgId, participantId }),
  deleteParticipantReactions: (accountId: string, peerId: string, participantId?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:delete-participant-reactions', { accountId, peerId, participantId }),
  deletePhoneCallHistory: (accountId: string, revoke = true): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:delete-phone-call-history', { accountId, revoke }),
  // Layer 232 Messages Suite (Microphase 037)
  deletePollAnswer: (accountId: string, peerId: string, msgId: number, option?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:delete-poll-answer', { accountId, peerId, msgId, option }),
  deleteQuickReplyMessages: (accountId: string, shortcutId: number, id?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:delete-quick-reply-messages', { accountId, shortcutId, id }),
  deleteRevokedExportedChatInvites: (accountId: string, peerId: string, adminId?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:delete-revoked-exported-chat-invites', { accountId, peerId, adminId }),
  deleteSavedHistory: (accountId: string, options: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:delete-saved-history', { accountId, options }),
  deleteTopicHistory: (accountId: string, peerId: string, topMsgId: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:delete-topic-history', { accountId, peerId, topMsgId }),
  // Layer 232 Messages Suite (Microphase 038)
  editChatAbout: (accountId: string, peerId: string, about: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:edit-chat-about', { accountId, peerId, about }),
  editChatAdmin: (accountId: string, chatId: bigint | number | string, userId: string, isAdmin: boolean): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:edit-chat-admin', { accountId, chatId, userId, isAdmin }),
  editChatCreator: (accountId: string, peerId: string, userId: string, password?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:edit-chat-creator', { accountId, peerId, userId, password }),
  editChatDefaultBannedRights: (accountId: string, peerId: string, bannedRights: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:edit-chat-default-banned-rights', { accountId, peerId, bannedRights }),
  editChatParticipantRank: (accountId: string, peerId: string, participantId: string, rank: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:edit-chat-participant-rank', { accountId, peerId, participantId, rank }),
  editChatPhoto: (accountId: string, chatId: bigint | number | string, photo?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:edit-chat-photo', { accountId, chatId, photo }),
  // Layer 232 Messages Suite (Microphase 039)
  editChatTitle: (accountId: string, chatId: bigint | number | string, title: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:edit-chat-title', { accountId, chatId, title }),
  editExportedChatInvite: (accountId: string, peerId: string, link: string, options?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:edit-exported-chat-invite', { accountId, peerId, link, options }),
  editFactCheck: (accountId: string, peerId: string, msgId: number, text: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:edit-fact-check', { accountId, peerId, msgId, text }),
  editInlineBotMessage: (accountId: string, options: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:edit-inline-bot-message', { accountId, options }),
  // Layer 232 Messages Suite (Microphase 040)
  faveSticker: (accountId: string, id: any, unfave?: boolean): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:fave-sticker', { accountId, id, unfave }),
  getAdminsWithInvites: (accountId: string, peerId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-admins-with-invites', { accountId, peerId }),
  getArchivedStickers: (accountId: string, options?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-archived-stickers', { accountId, options }),
  getAllStickers: (accountId: string, hash?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-all-stickers', { accountId, hash }),
  // Layer 232 Messages Suite (Microphase 041)
  getAttachMenuBot: (accountId: string, botId?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-attach-menu-bot', { accountId, botId }),
  getAttachMenuBots: (accountId: string, hash?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-attach-menu-bots', { accountId, hash }),
  getAttachedStickers: (accountId: string, media?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-attached-stickers', { accountId, media }),
  getAvailableEffects: (accountId: string, hash?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-available-effects', { accountId, hash }),
  getBotApp: (accountId: string, app?: any, hash?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-bot-app', { accountId, app, hash }),
  getBotCallbackAnswerDirect: (accountId: string, options: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-bot-callback-answer', { accountId, options }),
  // Layer 232 Messages Suite (Microphase 042)
  getChatInviteImporters: (accountId: string, options?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-chat-invite-importers', { accountId, options }),
  getChats: (accountId: string, id?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-chats', { accountId, id }),
  getCustomEmojiDocuments: (accountId: string, documentId: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-custom-emoji-documents', { accountId, documentId }),
  getDefaultTagReactions: (accountId: string, hash?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-default-tag-reactions', { accountId, hash }),
  // Layer 232 Messages Suite (Microphase 043)
  getDialogFiltersRaw: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-dialog-filters', { accountId }),
  getDialogUnreadMarks: (accountId: string, parentPeerId?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-dialog-unread-marks', { accountId, parentPeerId }),
  getDocumentByHash: (accountId: string, sha256?: any, size?: bigint | number, mimeType?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-document-by-hash', { accountId, sha256, size, mimeType }),
  getEmojiGameInfo: (accountId: string, params?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-emoji-game-info', { accountId, params }),
  getEmojiGroups: (accountId: string, hash?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-emoji-groups', { accountId, hash }),
  // Layer 232 Messages Suite (Microphase 044)
  getEmojiKeywords: (accountId: string, langCode?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-emoji-keywords', { accountId, langCode }),
  getEmojiKeywordsDifference: (accountId: string, langCode?: string, fromVersion?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-emoji-keywords-difference', { accountId, langCode, fromVersion }),
  getEmojiKeywordsLanguages: (accountId: string, langCodes?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-emoji-keywords-languages', { accountId, langCodes }),
  getEmojiProfilePhotoGroups: (accountId: string, hash?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-emoji-profile-photo-groups', { accountId, hash }),
  getEmojiStatusGroups: (accountId: string, hash?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-emoji-status-groups', { accountId, hash }),
  getEmojiStickerGroups: (accountId: string, hash?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-emoji-sticker-groups', { accountId, hash }),
  getEmojiStickers: (accountId: string, hash?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-emoji-stickers', { accountId, hash }),
  // Layer 232 Messages Suite (Microphase 045)
  getEmojiURL: (accountId: string, langCode?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-emoji-url', { accountId, langCode }),
  getExportedChatInvite: (accountId: string, peerId?: string, link?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-exported-chat-invite', { accountId, peerId, link }),
  getExportedChatInvites: (accountId: string, params?: { revoked?: boolean; peerId?: string; adminIdId?: string; offsetDate?: number; offsetLink?: string; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-exported-chat-invites', { accountId, ...params }),
  getExtendedMedia: (accountId: string, peerId?: string, id?: number | number[]): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-extended-media', { accountId, peerId, id }),
  getFactCheck: (accountId: string, peerId?: string, msgId?: number | number[]): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-fact-check', { accountId, peerId, msgId }),
  getFavedStickers: (accountId: string, hash?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-faved-stickers', { accountId, hash }),
  getFeaturedEmojiStickers: (accountId: string, hash?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-featured-emoji-stickers', { accountId, hash }),
  // Layer 232 Messages Suite (Microphase 046)
  getFeaturedStickers: (accountId: string, hash?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-featured-stickers', { accountId, hash }),
  getForumTopicsRaw: (accountId: string, params?: { peerId?: string; q?: string; offsetDate?: number; offsetId?: number; offsetTopic?: number; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-forum-topics', { accountId, ...params }),
  getForumTopicsByID: (accountId: string, peerId?: string, topics?: number | number[]): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-forum-topics-by-id', { accountId, peerId, topics }),
  getFullChat: (accountId: string, chatId?: bigint | number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-full-chat', { accountId, chatId }),
  getFutureChatCreatorAfterLeave: (accountId: string, peerId?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-future-chat-creator-after-leave', { accountId, peerId }),
  getGameHighScoresRaw: (accountId: string, peerId?: string, id?: number, userIdId?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-game-high-scores', { accountId, peerId, id, userIdId }),
  getHistoryRaw: (accountId: string, params?: { peerId?: string; offsetId?: number; offsetDate?: number; addOffset?: number; limit?: number; maxId?: number; minId?: number; hash?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-history', { accountId, ...params }),
  // Layer 232 Messages Suite (Microphase 047)
  getInlineBotResultsRaw: (accountId: string, params?: { botId?: string; peerId?: string; geoPoint?: any; query?: string; offset?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-inline-bot-results', { accountId, ...params }),
  getInlineGameHighScores: (accountId: string, id?: any, userIdId?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-inline-game-high-scores', { accountId, id, userIdId }),
  getMaskStickers: (accountId: string, hash?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-mask-stickers', { accountId, hash }),
  getMessageEditData: (accountId: string, peerId?: string, id?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-message-edit-data', { accountId, peerId, id }),
  getMessageReactionsListRaw: (accountId: string, params?: { peerId?: string; id?: number; reaction?: any; offset?: string; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-message-reactions-list', { accountId, ...params }),
  getMessageReadParticipants: (accountId: string, peerId?: string, msgId?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-message-read-participants', { accountId, peerId, msgId }),
  getMessagesRaw: (accountId: string, id?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-messages', { accountId, id }),
  // Layer 232 Messages Suite (Microphase 048)
  getMessagesReactions: (accountId: string, peerId?: string, id?: number | number[]): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-messages-reactions', { accountId, peerId, id }),
  getMessagesViews: (accountId: string, peerId?: string, id?: number | number[], increment?: boolean): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-messages-views', { accountId, peerId, id, increment }),
  getMyStickers: (accountId: string, offsetId?: any, limit?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-my-stickers', { accountId, offsetId, limit }),
  getOldFeaturedStickers: (accountId: string, offset?: number, limit?: number, hash?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-old-featured-stickers', { accountId, offset, limit, hash }),
  getOnlines: (accountId: string, peerId?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-onlines', { accountId, peerId }),
  getOutboxReadDate: (accountId: string, peerId?: string, msgId?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-outbox-read-date', { accountId, peerId, msgId }),
  getPaidReactionPrivacy: (accountId: string, params?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-paid-reaction-privacy', { accountId, params }),
  // Layer 232 Messages Suite (Microphase 049)
  getPeerDialogs: (accountId: string, peers?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-peer-dialogs', { accountId, peers }),
  getPeerSettings: (accountId: string, peerId?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-peer-settings', { accountId, peerId }),
  getPersonalChannelHistory: (accountId: string, params?: { userIdId?: string; limit?: number; maxId?: number; minId?: number; hash?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-personal-channel-history', { accountId, ...params }),
  getPinnedDialogs: (accountId: string, folderId?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-pinned-dialogs', { accountId, folderId }),
  getPinnedSavedDialogs: (accountId: string, params?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-pinned-saved-dialogs', { accountId, params }),
  getPollResults: (accountId: string, peerId?: string, msgId?: number, pollHash?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-poll-results', { accountId, peerId, msgId, pollHash }),
  getPollVotes: (accountId: string, params?: { peerId?: string; id?: number; option?: any; offset?: string; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-poll-votes', { accountId, ...params }),
  // Layer 232 Messages Suite (Microphase 050)
  getPreparedInlineMessage: (accountId: string, botId?: string, id?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-prepared-inline-message', { accountId, botId, id }),
  getQuickRepliesRaw: (accountId: string, hash?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-quick-replies', { accountId, hash }),
  getQuickReplyMessages: (accountId: string, params?: { shortcutId?: number; id?: number | number[]; hash?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-quick-reply-messages', { accountId, ...params }),
  getRecentLocationsRaw: (accountId: string, params?: { peerId?: string; limit?: number; hash?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-recent-locations', { accountId, ...params }),
  getRecentReactions: (accountId: string, limit?: number, hash?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-recent-reactions', { accountId, limit, hash }),
  getRecentStickersRaw: (accountId: string, attached?: boolean, hash?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-recent-stickers', { accountId, attached, hash }),
  getReplies: (accountId: string, params?: { peerId?: string; msgId?: number; offsetId?: number; offsetDate?: number; addOffset?: number; limit?: number; maxId?: number; minId?: number; hash?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-replies', { accountId, ...params }),
  // Layer 232 Messages Suite (Microphase 051)
  getRichMessage: (accountId: string, peerId?: string, id?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-rich-message', { accountId, peerId, id }),
  getSavedDialogsRaw: (accountId: string, params?: { excludePinned?: boolean; parentPeerId?: string; offsetDate?: number; offsetId?: number; offsetPeerId?: string; limit?: number; hash?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-saved-dialogs', { accountId, ...params }),
  getSavedDialogsByID: (accountId: string, parentPeerId?: string, ids?: string | string[]): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-saved-dialogs-by-id', { accountId, parentPeerId, ids }),
  getSavedGifsRaw: (accountId: string, hash?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-saved-gifs', { accountId, hash }),
  getSavedHistory: (accountId: string, params?: { parentPeerId?: string; peerId?: string; offsetId?: number; offsetDate?: number; addOffset?: number; limit?: number; maxId?: number; minId?: number; hash?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-saved-history', { accountId, ...params }),
  getSavedReactionTagsRaw: (accountId: string, peerId?: string, hash?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-saved-reaction-tags', { accountId, peerId, hash }),
  getScheduledHistory: (accountId: string, peerId?: string, hash?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-scheduled-history', { accountId, peerId, hash }),
  // Layer 232 Messages Suite (Microphase 052)
  getScheduledMessagesRaw: (accountId: string, peerId?: string, id?: number | number[]): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-scheduled-messages', { accountId, peerId, id }),
  getSearchCounters: (accountId: string, params?: { peerId?: string; savedPeerIdId?: string; topMsgId?: number; filters?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-search-counters', { accountId, ...params }),
  getSearchResultsCalendar: (accountId: string, params?: { peerId?: string; savedPeerIdId?: string; filter?: any; offsetId?: number; offsetDate?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-search-results-calendar', { accountId, ...params }),
  getSearchResultsPositions: (accountId: string, params?: { peerId?: string; savedPeerIdId?: string; filter?: any; offsetId?: number; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-search-results-positions', { accountId, ...params }),
  getShareThemeBackdrops: (accountId: string, params?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-share-theme-backdrops', { accountId, params }),
  getSplitRanges: (accountId: string, params?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-split-ranges', { accountId, params }),
  getSponsoredMessagesRaw: (accountId: string, peerId: string, msgId?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-sponsored-messages', { accountId, peerId, msgId }),
  // Layer 232 Messages Suite (Microphase 053)
  getStickersRaw: (accountId: string, emoticon?: string, hash?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-stickers', { accountId, emoticon, hash }),
  getStickerSetRaw: (accountId: string, stickerset: any, hash?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-sticker-set', { accountId, stickerset, hash }),
  getSuggestedDialogFiltersRaw: (accountId: string, params?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-suggested-dialog-filters', { accountId, params }),
  getTopReactions: (accountId: string, limit?: number, hash?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-top-reactions', { accountId, limit, hash }),
  getUnreadMentions: (accountId: string, params?: { peerId?: string; topMsgId?: number; offsetId?: number; addOffset?: number; limit?: number; maxId?: number; minId?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-unread-mentions', { accountId, ...params }),
  getUnreadPollVotes: (accountId: string, params?: { peerId?: string; topMsgId?: number; offsetId?: number; addOffset?: number; limit?: number; maxId?: number; minId?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-unread-poll-votes', { accountId, ...params }),
  getUnreadReactions: (accountId: string, params?: { peerId?: string; topMsgId?: number; savedPeerIdId?: string; offsetId?: number; addOffset?: number; limit?: number; maxId?: number; minId?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-unread-reactions', { accountId, ...params }),
  // Layer 232 Messages Suite (Microphase 054)
  getWebPageRaw: (accountId: string, url?: string, hash?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-web-page', { accountId, url, hash }),
  getWebPagePreviewRaw: (accountId: string, message?: string, entities?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:get-web-page-preview', { accountId, message, entities }),
  hideAllChatJoinRequestsRaw: (accountId: string, params?: { approved?: boolean; peerId?: string; link?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:hide-all-chat-join-requests', { accountId, ...params }),
  hideChatJoinRequestRaw: (accountId: string, params?: { approved?: boolean; peerId?: string; userIdId?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:hide-chat-join-request', { accountId, ...params }),
  importChatInvite: (accountId: string, hash: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:import-chat-invite', { accountId, hash }),
  initHistoryImport: (accountId: string, params: { peerId: string; file: any; mediaCount: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:init-history-import', { accountId, ...params }),
  installStickerSetRaw: (accountId: string, stickerset: any, archived?: boolean): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:install-sticker-set', { accountId, stickerset, archived }),
  hidePeerSettingsBar: (accountId: string, peerId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:hide-peer-settings-bar', { accountId, peerId }),
  markDialogUnreadRaw: (accountId: string, params: { unread?: boolean; parentPeerId?: string; peer?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:mark-dialog-unread-raw', { accountId, ...params }),
  migrateChatRaw: (accountId: string, chatId: bigint | number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:migrate-chat', { accountId, chatId }),
  prolongWebViewRaw: (accountId: string, params: { silent?: boolean; peerId?: string; botId?: string; queryId?: any; replyTo?: any; sendAsId?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:prolong-web-view', { accountId, ...params }),
  rateTranscribedAudioRaw: (accountId: string, params: { peerId?: string; msgId?: number; transcriptionId?: any; good?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:rate-transcribed-audio', { accountId, ...params }),
  readDiscussionRaw: (accountId: string, params: { peerId?: string; msgId?: number; readMaxId?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:read-discussion', { accountId, ...params }),
  readEncryptedHistoryRaw: (accountId: string, params: { peer?: any; maxDate?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:read-encrypted-history', { accountId, ...params }),
  readFeaturedStickersRaw: (accountId: string, id: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:read-featured-stickers', { accountId, id }),
  readHistoryRaw: (accountId: string, params: { peerId: string; maxId?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:read-history-raw', { accountId, ...params }),
  readMentionsRaw: (accountId: string, params: { peerId: string; topMsgId?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:read-mentions-raw', { accountId, ...params }),
  readMessageContentsRaw: (accountId: string, id: number[] | number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:read-message-contents-raw', { accountId, id }),
  readPollVotesRaw: (accountId: string, params: { peerId: string; topMsgId?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:read-poll-votes-raw', { accountId, ...params }),
  readReactionsRaw: (accountId: string, params: { peerId: string; topMsgId?: number; savedPeerIdId?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:read-reactions-raw', { accountId, ...params }),
  readSavedHistoryRaw: (accountId: string, params: { parentPeerId: string; peerId: string; maxId?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:read-saved-history-raw', { accountId, ...params }),
  receivedMessagesRaw: (accountId: string, maxId?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:received-messages-raw', { accountId, maxId }),
  receivedQueueRaw: (accountId: string, maxQts?: number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:received-queue-raw', { accountId, maxQts }),
  reorderPinnedDialogsRaw: (accountId: string, params: { force?: boolean; folderId?: number; order?: string[] | any[] }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:reorder-pinned-dialogs-raw', { accountId, ...params }),
  reorderPinnedForumTopicsRaw: (accountId: string, params: { force?: boolean; peerId: string; order?: number[] | number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:reorder-pinned-forum-topics-raw', { accountId, ...params }),
  reorderPinnedSavedDialogsRaw: (accountId: string, params: { force?: boolean; order?: string[] | any[] }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:reorder-pinned-saved-dialogs-raw', { accountId, ...params }),
  reorderQuickRepliesRaw: (accountId: string, order?: number[] | number): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:reorder-quick-replies-raw', { accountId, order }),
  reorderStickerSetsRaw: (accountId: string, params: { masks?: boolean; emojis?: boolean; order?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:reorder-sticker-sets-raw', { accountId, ...params }),
  reportRaw: (accountId: string, params: { peerId: string; id: number[] | number; option?: any; message?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:report-raw', { accountId, ...params }),
  reportEncryptedSpamRaw: (accountId: string, peer: any): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:report-encrypted-spam-raw', { accountId, peer }),
  reportMessagesDeliveryRaw: (accountId: string, params: { push?: boolean; peerId?: string; id?: number[] | number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:report-messages-delivery-raw', { accountId, ...params }),
  reportMusicListenRaw: (accountId: string, params: { id: any; listenedDuration?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:report-music-listen-raw', { accountId, ...params }),
  reportReactionRaw: (accountId: string, params: { peerId: string; id: number; reactionPeerId: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:report-reaction-raw', { accountId, ...params }),
  reportReadMetricsRaw: (accountId: string, params: { peerId: string; metrics?: any[] }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:report-read-metrics-raw', { accountId, ...params }),
  reportSpamRaw: (accountId: string, peerId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:report-spam-raw', { accountId, peerId }),
  reportSponsoredMessageRaw: (accountId: string, params: { randomId: any; option?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:report-sponsored-message-raw', { accountId, ...params }),
  requestAppWebViewRaw: (accountId: string, params: { writeAllowed?: boolean; compact?: boolean; fullscreen?: boolean; peerId?: string; app?: any; startParam?: string; themeParams?: any; platform?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:request-app-web-view-raw', { accountId, ...params }),
  requestChatJoinWebViewRaw: (accountId: string, params: { queryId: bigint | number | string | any; themeParams?: any; platform?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:request-chat-join-web-view-raw', { accountId, ...params }),
  requestEncryptionRaw: (accountId: string, params: { userId: string; randomId?: number; gA?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:request-encryption-raw', { accountId, ...params }),
  requestMainWebViewRaw: (accountId: string, params: { compact?: boolean; fullscreen?: boolean; peerId?: string; botId?: string; startParam?: string; themeParams?: any; platform?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:request-main-web-view-raw', { accountId, ...params }),
  requestSimpleWebViewRaw: (accountId: string, params: { fromSwitchWebview?: boolean; fromSideMenu?: boolean; compact?: boolean; fullscreen?: boolean; botId?: string; url?: string; startParam?: string; themeParams?: any; platform?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:request-simple-web-view-raw', { accountId, ...params }),
  requestUrlAuthRaw: (accountId: string, params: { peerId?: string; msgId?: number; buttonId?: number; url?: string; inAppOrigin?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:request-url-auth-raw', { accountId, ...params }),
  requestWebViewRaw: (accountId: string, params: { fromBotMenu?: boolean; silent?: boolean; compact?: boolean; fullscreen?: boolean; peerId?: string; botId?: string; url?: string; startParam?: string; themeParams?: any; platform?: string; replyTo?: any; sendAsId?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:request-web-view-raw', { accountId, ...params }),
  saveDefaultSendAsRaw: (accountId: string, params: { peerId: string; sendAsId: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:save-default-send-as-raw', { accountId, ...params }),
  saveDraftRaw: (accountId: string, params: { noWebpage?: boolean; invertMedia?: boolean; replyTo?: any; peerId?: string; message?: string; entities?: any; media?: any; effect?: bigint | number | any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:save-draft-raw', { accountId, ...params }),
  saveGifRaw: (accountId: string, params: { id: any; unsave?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:save-gif-raw', { accountId, ...params }),
  savePreparedInlineMessageRaw: (accountId: string, params: { result: any; userId: string; peerTypes?: any[] }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:save-prepared-inline-message-raw', { accountId, ...params }),
  saveRecentStickerRaw: (accountId: string, params: { attached?: boolean; id?: any; unsave?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:save-recent-sticker-raw', { accountId, ...params }),
  searchMessagesRaw: (accountId: string, params: { peerId?: string; q?: string; fromId?: string; savedPeerId?: string; savedReaction?: any; topMsgId?: number; filter?: any; minDate?: number; maxDate?: number; offsetId?: number; addOffset?: number; limit?: number; maxId?: number; minId?: number; hash?: bigint | number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:search-messages-raw', { accountId, ...params }),
  searchCustomEmojiRaw: (accountId: string, params: { emoticon: string; hash?: bigint | number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:search-custom-emoji-raw', { accountId, ...params }),
  searchEmojiStickerSetsRaw: (accountId: string, params: { excludeFeatured?: boolean; q?: string; hash?: bigint | number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:search-emoji-sticker-sets-raw', { accountId, ...params }),
  searchGlobalRaw: (accountId: string, params: { broadcastsOnly?: boolean; groupsOnly?: boolean; usersOnly?: boolean; folderId?: number; community?: any; q?: string; filter?: any; minDate?: number; maxDate?: number; offsetRate?: number; offsetPeerId?: string; offsetId?: number; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:search-global-raw', { accountId, ...params }),
  searchSentMediaRaw: (accountId: string, params: { q?: string; filter?: any; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:search-sent-media-raw', { accountId, ...params }),
  searchStickerSetsRaw: (accountId: string, params: { excludeFeatured?: boolean; q?: string; hash?: bigint | number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:search-sticker-sets-raw', { accountId, ...params }),
  searchStickersRaw: (accountId: string, params: { emojis?: boolean; q?: string; emoticon?: string; langCode?: string[] | string; offset?: number; limit?: number; hash?: bigint | number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:search-stickers-raw', { accountId, ...params }),
  sendBotRequestedPeerRaw: (accountId: string, params: { peerId: string; buttonId: number; requestedPeers: string[] | string; msgId?: number; webappReqId?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:send-bot-requested-peer-raw', { accountId, ...params }),
  sendEncryptedRaw: (accountId: string, params: { silent?: boolean; peer?: any; randomId?: bigint | number; data?: Uint8Array | string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:send-encrypted-raw', { accountId, ...params }),
  sendEncryptedFileRaw: (accountId: string, params: { silent?: boolean; peer?: any; randomId?: bigint | number; data?: Uint8Array | string; file?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:send-encrypted-file-raw', { accountId, ...params }),
  sendEncryptedServiceRaw: (accountId: string, params: { peer?: any; randomId?: bigint | number; data?: Uint8Array | string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:send-encrypted-service-raw', { accountId, ...params }),
  sendInlineBotResultRaw: (accountId: string, params: { silent?: boolean; background?: boolean; clearDraft?: boolean; hideVia?: boolean; peerId?: string; replyTo?: any; randomId?: bigint | number; queryId?: bigint | number; id?: string; scheduleDate?: number; sendAsId?: string; quickReplyShortcut?: any; allowPaidStars?: bigint | number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:send-inline-bot-result-raw', { accountId, ...params }),
  sendMediaRaw: (accountId: string, params: { silent?: boolean; background?: boolean; clearDraft?: boolean; noforwards?: boolean; updateStickersetsOrder?: boolean; invertMedia?: boolean; allowPaidFloodskip?: boolean; peerId?: string; replyTo?: any; media?: any; message?: string; randomId?: bigint | number; replyMarkup?: any; entities?: any; scheduleDate?: number; scheduleRepeatPeriod?: number; sendAsId?: string; quickReplyShortcut?: any; effect?: bigint | number; allowPaidStars?: bigint | number; suggestedPost?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:send-media-raw', { accountId, ...params }),
  sendMessageRaw: (accountId: string, params: { noWebpage?: boolean; silent?: boolean; background?: boolean; clearDraft?: boolean; noforwards?: boolean; updateStickersetsOrder?: boolean; invertMedia?: boolean; allowPaidFloodskip?: boolean; peerId?: string; replyTo?: any; message?: string; randomId?: bigint | number; replyMarkup?: any; entities?: any; scheduleDate?: number; scheduleRepeatPeriod?: number; sendAsId?: string; quickReplyShortcut?: any; effect?: bigint | number; allowPaidStars?: bigint | number; suggestedPost?: any; richMessage?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:send-message-raw', { accountId, ...params }),
  sendMultiMediaRaw: (accountId: string, params: { silent?: boolean; background?: boolean; clearDraft?: boolean; noforwards?: boolean; updateStickersetsOrder?: boolean; invertMedia?: boolean; allowPaidFloodskip?: boolean; peerId?: string; replyTo?: any; multiMedia?: any[]; scheduleDate?: number; sendAsId?: string; quickReplyShortcut?: any; effect?: bigint | number; allowPaidStars?: bigint | number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:send-multi-media-raw', { accountId, ...params }),
  sendPaidReactionRaw: (accountId: string, params: { peerId: string; msgId: number; count: number; randomId?: bigint | number; isPrivate?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:send-paid-reaction-raw', { accountId, ...params }),
  sendQuickReplyMessagesRaw: (accountId: string, params: { peerId: string; shortcutId: number; id?: number | number[]; randomId?: (bigint | number)[] | bigint | number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:send-quick-reply-messages-raw', { accountId, ...params }),
  sendReactionRaw: (accountId: string, params: { big?: boolean; addToRecent?: boolean; peerId: string; msgId: number; reaction?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:send-reaction-raw', { accountId, ...params }),
  sendScheduledMessagesRaw: (accountId: string, params: { peerId: string; id: number | number[] }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:send-scheduled-messages-raw', { accountId, ...params }),
  sendScreenshotNotificationRaw: (accountId: string, params: { peerId: string; replyTo?: any; randomId?: bigint | number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:send-screenshot-notification-raw', { accountId, ...params }),
  sendVoteRaw: (accountId: string, params: { peerId: string; msgId: number; options: (Uint8Array | string)[] | Uint8Array | string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:send-vote-raw', { accountId, ...params }),
  sendWebViewDataRaw: (accountId: string, params: { botId: string; buttonText: string; data: string; randomId?: bigint | number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:send-web-view-data-raw', { accountId, ...params }),
  sendWebViewResultMessageRaw: (accountId: string, params: { botQueryId: string; result?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:send-web-view-result-message-raw', { accountId, ...params }),
  setBotCallbackAnswerRaw: (accountId: string, params: { alert?: boolean; queryId: bigint | number | any; message?: string; url?: string; cacheTime?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:set-bot-callback-answer-raw', { accountId, ...params }),
  setBotGuestChatResultRaw: (accountId: string, params: { queryId: bigint | number | any; result?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:set-bot-guest-chat-result-raw', { accountId, ...params }),
  setBotPrecheckoutResultsRaw: (accountId: string, params: { success?: boolean; queryId: bigint | number | any; error?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:set-bot-precheckout-results-raw', { accountId, ...params }),
  setBotShippingResultsRaw: (accountId: string, params: { queryId: bigint | number | any; error?: string; shippingOptions?: any[] }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:set-bot-shipping-results-raw', { accountId, ...params }),
  setChatAvailableReactionsRaw: (accountId: string, params: { peerId: string; availableReactions?: any; reactionsLimit?: number; paidEnabled?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:set-chat-available-reactions-raw', { accountId, ...params }),
  setChatThemeRaw: (accountId: string, params: { peerId: string; theme?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:set-chat-theme-raw', { accountId, ...params }),
  setChatWallPaperRaw: (accountId: string, params: { forBoth?: boolean; revert?: boolean; peerId: string; wallpaper?: any; settings?: any; id?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:set-chat-wall-paper-raw', { accountId, ...params }),
  setDefaultHistoryTTLRaw: (accountId: string, params: { period: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:set-default-history-ttl-raw', { accountId, ...params }),
  setDefaultReactionRaw: (accountId: string, params: { reaction: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:set-default-reaction-raw', { accountId, ...params }),
  setEncryptedTypingRaw: (accountId: string, params: { peer: any; typing?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:set-encrypted-typing-raw', { accountId, ...params }),
  setGameScoreRaw: (accountId: string, params: { editMessage?: boolean; force?: boolean; peerId: string; id: number; userIdId: string; score: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:set-game-score-raw', { accountId, ...params }),
  setHistoryTTLRaw: (accountId: string, params: { peerId: string; period: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:set-history-ttl-raw', { accountId, ...params }),
  setInlineBotResultsRaw: (accountId: string, params: { gallery?: boolean; isPrivate?: boolean; queryId: bigint | number | any; results?: any[]; cacheTime?: number; nextOffset?: string; switchPm?: any; switchWebview?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:set-inline-bot-results-raw', { accountId, ...params }),
  setInlineGameScoreRaw: (accountId: string, params: { editMessage?: boolean; force?: boolean; id: any; userIdId: string; score: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:set-inline-game-score-raw', { accountId, ...params }),
  setShareThemeRaw: (accountId: string, params: { peerId: string; theme?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:set-share-theme-raw', { accountId, ...params }),
  setTypingRaw: (accountId: string, params: { peerId: string; topMsgId?: number; action?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:set-typing-raw', { accountId, ...params }),
  startBotRaw: (accountId: string, params: { botId: string; peerId?: string; randomId?: bigint | number | any; startParam?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:start-bot-raw', { accountId, ...params }),
  startHistoryImportRaw: (accountId: string, params: { peerId: string; importId: bigint | number | any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:start-history-import-raw', { accountId, ...params }),
  summarizeTextRaw: (accountId: string, params: { peerId: string; id: number; toLang?: string; tone?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:summarize-text-raw', { accountId, ...params }),
  toggleBotInAttachMenuRaw: (accountId: string, params: { writeAllowed?: boolean; botId: string; enabled: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:toggle-bot-in-attach-menu-raw', { accountId, ...params }),
  toggleDialogFilterTagsRaw: (accountId: string, params: { enabled: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:toggle-dialog-filter-tags-raw', { accountId, ...params }),
  toggleDialogPinRaw: (accountId: string, params: { pinned?: boolean; peerId?: string; peer?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:toggle-dialog-pin-raw', { accountId, ...params }),
  toggleNoForwardsRaw: (accountId: string, params: { peerId: string; enabled: boolean; requestMsgId?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:toggle-no-forwards-raw', { accountId, ...params }),
  togglePaidReactionPrivacyRaw: (accountId: string, params: { peerId: string; msgId: number; private?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:toggle-paid-reaction-privacy-raw', { accountId, ...params }),
  togglePeerTranslationsRaw: (accountId: string, params: { disabled?: boolean; peerId: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:toggle-peer-translations-raw', { accountId, ...params }),
  toggleSavedDialogPinRaw: (accountId: string, params: { pinned?: boolean; peerId?: string; peer?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:toggle-saved-dialog-pin-raw', { accountId, ...params }),
  toggleStickerSetsRaw: (accountId: string, params: { uninstall?: boolean; archive?: boolean; unarchive?: boolean; stickersets?: any[] }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:toggle-sticker-sets-raw', { accountId, ...params }),
  toggleSuggestedPostApprovalRaw: (accountId: string, params: { reject?: boolean; peerId: string; msgId: number; scheduleDate?: number; rejectComment?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:toggle-suggested-post-approval-raw', { accountId, ...params }),
  toggleTodoCompletedRaw: (accountId: string, params: { peerId: string; msgId: number; completed?: number[] | number; incompleted?: number[] | number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:toggle-todo-completed-raw', { accountId, ...params }),
  transcribeAudioRaw: (accountId: string, params: { peerId: string; msgId: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:transcribe-audio-raw', { accountId, ...params }),
  translateRichMessageRaw: (accountId: string, params: { peerId?: string; id?: number[] | number; text?: any; toLang?: string; tone?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:translate-rich-message-raw', { accountId, ...params }),
  translateTextRaw: (accountId: string, params: { peerId?: string; id?: number[] | number; text?: any; toLang?: string; tone?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:translate-text-raw', { accountId, ...params }),
  uninstallStickerSetRaw: (accountId: string, params: { stickerset: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:uninstall-sticker-set-raw', { accountId, ...params }),
  unpinAllMessagesRaw: (accountId: string, params: { peerId: string; topMsgId?: number; savedPeerIdId?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:unpin-all-messages-raw', { accountId, ...params }),
  updateDialogFilterRaw: (accountId: string, params: { id: number; filter?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:update-dialog-filter-raw', { accountId, ...params }),
  updateDialogFiltersOrderRaw: (accountId: string, params: { order: number[] | number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:update-dialog-filters-order-raw', { accountId, ...params }),
  updatePinnedForumTopicRaw: (accountId: string, params: { peerId: string; topicId: number; pinned?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:update-pinned-forum-topic-raw', { accountId, ...params }),
  updatePinnedMessageRaw: (accountId: string, params: { silent?: boolean; unpin?: boolean; pmOneside?: boolean; peerId: string; id: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:update-pinned-message-raw', { accountId, ...params }),
  updateSavedReactionTagRaw: (accountId: string, params: { reaction?: any; title?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:update-saved-reaction-tag-raw', { accountId, ...params }),
  uploadEncryptedFileRaw: (accountId: string, params: { peer?: any; file?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:upload-encrypted-file-raw', { accountId, ...params }),
  uploadImportedMediaRaw: (accountId: string, params: { peerId: string; importId: bigint | number | string | any; fileName?: string; media?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:upload-imported-media-raw', { accountId, ...params }),
  uploadMediaRaw: (accountId: string, params: { businessConnectionId?: string; peerId?: string; media?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:upload-media-raw', { accountId, ...params }),
  viewSponsoredMessageRaw: (accountId: string, params: { randomId?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:messages:view-sponsored-message-raw', { accountId, ...params }),
  updatesGetStateRaw: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:updates:get-state-raw', { accountId }),
  updatesGetDifferenceRaw: (accountId: string, params: { pts?: number; ptsLimit?: number; ptsTotalLimit?: number; date?: number; qts?: number; qtsLimit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:updates:get-difference-raw', { accountId, ...params }),
  updatesGetChannelDifferenceRaw: (accountId: string, params: { force?: boolean; channel: any; filter?: any; pts?: number; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:updates:get-channel-difference-raw', { accountId, ...params }),
  photosUpdateProfilePhotoRaw: (accountId: string, params: { fallback?: boolean; botId?: string; id?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:photos:update-profile-photo-raw', { accountId, ...params }),
  photosUploadProfilePhotoRaw: (accountId: string, params: { fallback?: boolean; botId?: string; file?: any; video?: any; videoStartTs?: any; videoEmojiMarkup?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:photos:upload-profile-photo-raw', { accountId, ...params }),
  photosDeletePhotosRaw: (accountId: string, params: { id?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:photos:delete-photos-raw', { accountId, ...params }),
  photosGetUserPhotosRaw: (accountId: string, params: { userId?: string; offset?: number; maxId?: bigint | number | string; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:photos:get-user-photos-raw', { accountId, ...params }),
  photosUploadContactProfilePhotoRaw: (accountId: string, params: { suggest?: boolean; save?: boolean; userId?: string; file?: any; video?: any; videoStartTs?: any; videoEmojiMarkup?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:photos:upload-contact-profile-photo-raw', { accountId, ...params }),
  uploadGetFileRaw: (accountId: string, params: { precise?: boolean; cdnSupported?: boolean; location?: any; offset?: bigint | number | string; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:upload:get-file-raw', { accountId, ...params }),
  uploadSaveBigFilePartRaw: (accountId: string, params: { fileId?: bigint | number | string; filePart?: number; fileTotalParts?: number; bytes?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:upload:save-big-file-part-raw', { accountId, ...params }),
  uploadGetWebFileRaw: (accountId: string, params: { location?: any; offset?: number; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:upload:get-web-file-raw', { accountId, ...params }),
  uploadGetCdnFileRaw: (accountId: string, params: { fileToken?: any; offset?: bigint | number | string; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:upload:get-cdn-file-raw', { accountId, ...params }),
  uploadReuploadCdnFileRaw: (accountId: string, params: { fileToken?: any; requestToken?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:upload:reupload-cdn-file-raw', { accountId, ...params }),
  uploadGetCdnFileHashesRaw: (accountId: string, params: { fileToken?: any; offset?: bigint | number | string }): Promise<any> =>
    ipcRenderer.invoke('telegram:upload:get-cdn-file-hashes-raw', { accountId, ...params }),
  uploadGetFileHashesRaw: (accountId: string, params: { location?: any; offset?: bigint | number | string }): Promise<any> =>
    ipcRenderer.invoke('telegram:upload:get-file-hashes-raw', { accountId, ...params }),
  uploadSaveFilePartRaw: (accountId: string, params: { fileId?: bigint | number | string; filePart?: number; bytes?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:upload:save-file-part-raw', { accountId, ...params }),
  helpAcceptTermsOfServiceRaw: (accountId: string, params: { id?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:help:accept-terms-of-service-raw', { accountId, ...params }),
  helpDismissSuggestionRaw: (accountId: string, params: { peerId?: string; suggestion?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:help:dismiss-suggestion-raw', { accountId, ...params }),
  helpEditUserInfoRaw: (accountId: string, params: { userId?: string; message?: string; entities?: any[] }): Promise<any> =>
    ipcRenderer.invoke('telegram:help:edit-user-info-raw', { accountId, ...params }),
  helpGetAppConfigRaw: (accountId: string, params: { hash?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:help:get-app-config-raw', { accountId, ...params }),
  helpGetAppUpdateRaw: (accountId: string, params: { source?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:help:get-app-update-raw', { accountId, ...params }),
  helpGetCdnConfigRaw: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:help:get-cdn-config-raw', { accountId }),
  helpGetConfigRaw: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:help:get-config-raw', { accountId }),
  helpGetCountriesListRaw: (accountId: string, params: { langCode?: string; hash?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:help:get-countries-list-raw', { accountId, ...params }),
  helpGetDeepLinkInfoRaw: (accountId: string, params: { path?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:help:get-deep-link-info-raw', { accountId, ...params }),
  helpGetInviteTextRaw: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:help:get-invite-text-raw', { accountId }),
  helpGetNearestDcRaw: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:help:get-nearest-dc-raw', { accountId }),
  helpGetPassportConfigRaw: (accountId: string, params: { hash?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:help:get-passport-config-raw', { accountId, ...params }),
  helpGetPeerColorsRaw: (accountId: string, params: { hash?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:help:get-peer-colors-raw', { accountId, ...params }),
  helpGetPeerProfileColorsRaw: (accountId: string, params: { hash?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:help:get-peer-profile-colors-raw', { accountId, ...params }),
  helpGetPremiumPromoRaw: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:help:get-premium-promo-raw', { accountId }),
  helpGetPromoDataRaw: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:help:get-promo-data-raw', { accountId }),
  helpGetRecentMeUrlsRaw: (accountId: string, params: { referer?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:help:get-recent-me-urls-raw', { accountId, ...params }),
  helpGetSupportRaw: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:help:get-support-raw', { accountId }),
  helpGetSupportNameRaw: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:help:get-support-name-raw', { accountId }),
  helpGetTermsOfServiceUpdateRaw: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:help:get-terms-of-service-update-raw', { accountId }),
  helpGetTimezonesListRaw: (accountId: string, params: { hash?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:help:get-timezones-list-raw', { accountId, ...params }),
  helpGetUserInfoRaw: (accountId: string, params: { userId?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:help:get-user-info-raw', { accountId, ...params }),
  helpHidePromoDataRaw: (accountId: string, params: { peerId?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:help:hide-promo-data-raw', { accountId, ...params }),
  helpSaveAppLogRaw: (accountId: string, params: { events?: any[] }): Promise<any> =>
    ipcRenderer.invoke('telegram:help:save-app-log-raw', { accountId, ...params }),
  helpSetBotUpdatesStatusRaw: (accountId: string, params: { pendingUpdatesCount?: number; message?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:help:set-bot-updates-status-raw', { accountId, ...params }),
  channelsCheckSearchPostsFloodRaw: (accountId: string, params: { query?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:check-search-posts-flood-raw', { accountId, ...params }),
  channelsCheckUsernameRaw: (accountId: string, params: { channelId: string; username: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:check-username-raw', { accountId, ...params }),
  channelsConvertToGigagroupRaw: (accountId: string, params: { channelId: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:convert-to-gigagroup-raw', { accountId, ...params }),
  channelsCreateChannelRaw: (accountId: string, params: {
    title: string
    about?: string
    broadcast?: boolean
    megagroup?: boolean
    forImport?: boolean
    forum?: boolean
    ttlPeriod?: number
    address?: string
    geoPoint?: any
  }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:create-channel-raw', { accountId, ...params }),
  channelsDeactivateAllUsernamesRaw: (accountId: string, params: { channelId: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:deactivate-all-usernames-raw', { accountId, ...params }),
  channelsDeleteChannelRaw: (accountId: string, params: { channelId: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:delete-channel-raw', { accountId, ...params }),
  channelsDeleteHistoryRaw: (accountId: string, params: { channelId: string; maxId: number; forEveryone?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:delete-history-raw', { accountId, ...params }),
  channelsDeleteMessagesRaw: (accountId: string, params: { channelId: string; id: number[] }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:delete-messages-raw', { accountId, ...params }),
  channelsDeleteParticipantHistoryRaw: (accountId: string, params: { channelId: string; participantId: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:delete-participant-history-raw', { accountId, ...params }),
  channelsEditAdminRaw: (accountId: string, params: { channelId: string; userId: string; adminRights: any; rank?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:edit-admin-raw', { accountId, ...params }),
  channelsEditBannedRaw: (accountId: string, params: { channelId: string; participantId: string; bannedRights: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:edit-banned-raw', { accountId, ...params }),
  channelsEditLocationRaw: (accountId: string, params: { channelId: string; lat: number; long: number; address: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:edit-location-raw', { accountId, ...params }),
  channelsEditPhotoRaw: (accountId: string, params: { channelId: string; photo: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:edit-photo-raw', { accountId, ...params }),
  channelsEditTitleRaw: (accountId: string, params: { channelId: string; title: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:edit-title-raw', { accountId, ...params }),
  channelsExportMessageLinkRaw: (accountId: string, params: { channelId: string; messageId: number; grouped?: boolean; thread?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:export-message-link-raw', { accountId, ...params }),
  channelsGetAdminLogRaw: (accountId: string, params: { channelId: string; options?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:get-admin-log-raw', { accountId, ...params }),
  channelsGetAdminedPublicChannelsRaw: (accountId: string, options?: any): Promise<any[]> =>
    ipcRenderer.invoke('telegram:channels:get-admined-public-channels-raw', { accountId, ...options }),
  channelsGetChannelRecommendationsRaw: (accountId: string, params?: { channelId?: string }): Promise<any[]> =>
    ipcRenderer.invoke('telegram:channels:get-channel-recommendations-raw', { accountId, ...params }),
  channelsGetChannelsRaw: (accountId: string, params: { channelIds: string[] }): Promise<any[]> =>
    ipcRenderer.invoke('telegram:channels:get-channels-raw', { accountId, ...params }),
  channelsGetFullChannelRaw: (accountId: string, params: { channelId: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:get-full-channel-raw', { accountId, ...params }),
  channelsGetGroupsForDiscussionRaw: (accountId: string): Promise<any[]> =>
    ipcRenderer.invoke('telegram:channels:get-groups-for-discussion-raw', { accountId }),
  channelsGetInactiveChannelsRaw: (accountId: string): Promise<any[]> =>
    ipcRenderer.invoke('telegram:channels:get-inactive-channels-raw', { accountId }),
  channelsGetLeftChannelsRaw: (accountId: string, params?: { offset?: number }): Promise<any[]> =>
    ipcRenderer.invoke('telegram:channels:get-left-channels-raw', { accountId, ...params }),
  channelsGetMessageAuthorRaw: (accountId: string, params: { channelId: string; id: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:get-message-author-raw', { accountId, ...params }),
  channelsGetMessagesRaw: (accountId: string, params: { channelId: string; id: any[] }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:get-messages-raw', { accountId, ...params }),
  channelsGetParticipantRaw: (accountId: string, params: { channelId: string; participantId: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:get-participant-raw', { accountId, ...params }),
  channelsGetParticipantsRaw: (accountId: string, params: { channelId: string; filterName?: string; offset?: number; limit?: number; hash?: bigint }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:get-participants-raw', { accountId, ...params }),
  channelsGetSendAsRaw: (accountId: string, params: { peerId: string }): Promise<any[]> =>
    ipcRenderer.invoke('telegram:channels:get-send-as-raw', { accountId, ...params }),
  channelsInviteToChannelRaw: (accountId: string, params: { channelId: string; userIds: string[] }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:invite-to-channel-raw', { accountId, ...params }),
  channelsJoinChannelRaw: (accountId: string, params: { channelId: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:join-channel-raw', { accountId, ...params }),
  channelsLeaveChannelRaw: (accountId: string, params: { channelId: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:leave-channel-raw', { accountId, ...params }),
  channelsReadHistoryRaw: (accountId: string, params: { channelId: string; maxId: number }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:channels:read-history-raw', { accountId, ...params }),
  channelsReadMessageContentsRaw: (accountId: string, params: { channelId: string; id: number[] }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:channels:read-message-contents-raw', { accountId, ...params }),
  channelsReorderUsernamesRaw: (accountId: string, params: { channelId: string; order: string[] }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:channels:reorder-usernames-raw', { accountId, ...params }),
  channelsReportAntiSpamFalsePositiveRaw: (accountId: string, params: { channelId: string; msgId: number }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:channels:report-anti-spam-false-positive-raw', { accountId, ...params }),
  channelsReportSpamRaw: (accountId: string, params: { channelId: string; participantId: string; id: number[] }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:channels:report-spam-raw', { accountId, ...params }),
  channelsRestrictSponsoredMessagesRaw: (accountId: string, params: { channelId: string; restricted: boolean }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:channels:restrict-sponsored-messages-raw', { accountId, ...params }),
  channelsSearchPostsRaw: (accountId: string, params: { query: string; hashtag?: string; offsetId?: number; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:search-posts-raw', { accountId, ...params }),
  channelsSetBoostsToUnblockRestrictionsRaw: (accountId: string, params: { channelId: string; boosts: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:set-boosts-to-unblock-restrictions-raw', { accountId, ...params }),
  channelsSetDiscussionGroupRaw: (accountId: string, params: { broadcastId: string; groupId: string }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:channels:set-discussion-group-raw', { accountId, ...params }),
  channelsSetEmojiStickersRaw: (accountId: string, params: { channelId: string; stickerset?: any }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:channels:set-emoji-stickers-raw', { accountId, ...params }),
  channelsSetMainProfileTabRaw: (accountId: string, params: { channelId: string; tabName?: string }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:channels:set-main-profile-tab-raw', { accountId, ...params }),
  channelsSetStickersRaw: (accountId: string, params: { channelId: string; stickerset?: any }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:channels:set-stickers-raw', { accountId, ...params }),
  channelsToggleAntiSpamRaw: (accountId: string, params: { channelId: string; enabled: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:toggle-anti-spam-raw', { accountId, ...params }),
  channelsToggleAutotranslationRaw: (accountId: string, params: { channelId: string; enabled: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:toggle-autotranslation-raw', { accountId, ...params }),
  channelsToggleForumRaw: (accountId: string, params: { channelId: string; enabled: boolean; tabs?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:toggle-forum-raw', { accountId, ...params }),
  channelsToggleJoinRequestRaw: (accountId: string, params: { channelId: string; enabled: boolean; applyToInvites?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:toggle-join-request-raw', { accountId, ...params }),
  channelsToggleJoinToSendRaw: (accountId: string, params: { channelId: string; enabled: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:toggle-join-to-send-raw', { accountId, ...params }),
  channelsToggleParticipantsHiddenRaw: (accountId: string, params: { channelId: string; enabled: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:toggle-participants-hidden-raw', { accountId, ...params }),
  channelsTogglePreHistoryHiddenRaw: (accountId: string, params: { channelId: string; enabled: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:toggle-pre-history-hidden-raw', { accountId, ...params }),
  channelsToggleSignaturesRaw: (accountId: string, params: { channelId: string; signaturesEnabled?: boolean; profilesEnabled?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:toggle-signatures-raw', { accountId, ...params }),
  channelsToggleSlowModeRaw: (accountId: string, params: { channelId: string; seconds: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:toggle-slow-mode-raw', { accountId, ...params }),
  channelsToggleUsernameRaw: (accountId: string, params: { channelId: string; username: string; active: boolean }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:channels:toggle-username-raw', { accountId, ...params }),
  channelsToggleViewForumAsMessagesRaw: (accountId: string, params: { channelId: string; enabled: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:toggle-view-forum-as-messages-raw', { accountId, ...params }),
  channelsUpdateColorRaw: (accountId: string, params: { channelId: string; color: number; forProfile?: boolean; backgroundEmojiId?: bigint }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:update-color-raw', { accountId, ...params }),
  channelsUpdateEmojiStatusRaw: (accountId: string, params: { channelId: string; emojiStatus: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:update-emoji-status-raw', { accountId, ...params }),
  channelsUpdatePaidMessagesPriceRaw: (accountId: string, params: { channelId: string; stars: bigint | number | string; broadcastAllowed?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:update-paid-messages-price-raw', { accountId, ...params }),
  channelsUpdateUsernameRaw: (accountId: string, params: { channelId: string; username: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:channels:update-username-raw', { accountId, ...params }),
  botsAddPreviewMediaRaw: (accountId: string, params: { botId: string; media: any; langCode?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:bots:add-preview-media-raw', { accountId, ...params }),
  botsAddUsernameRaw: (accountId: string, params: { botId: string; username: string }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:add-username-raw', { accountId, ...params }),
  botsAllowSendMessageRaw: (accountId: string, params: { botId: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:bots:allow-send-message-raw', { accountId, ...params }),
  botsAnswerWebhookJSONQueryRaw: (accountId: string, params: { queryId: bigint | number | string; data: any }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:answer-webhook-json-query-raw', { accountId, ...params }),
  botsCanSendMessageRaw: (accountId: string, params: { botId: string }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:can-send-message-raw', { accountId, ...params }),
  botsCheckDownloadFileParamsRaw: (accountId: string, params: { botId: string; fileName: string; url: string }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:check-download-file-params-raw', { accountId, ...params }),
  botsCheckUsernameRaw: (accountId: string, params: { username: string; additional?: boolean }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:check-username-raw', { accountId, ...params }),
  botsCreateBotRaw: (accountId: string, params: { viaDeeplink?: boolean; name: string; username: string; managerId?: string | any }): Promise<any> =>
    ipcRenderer.invoke('telegram:bots:create-bot-raw', { accountId, ...params }),
  botsDeletePreviewMediaRaw: (accountId: string, params: { botId: string | any; langCode?: string; media: any[] }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:delete-preview-media-raw', { accountId, ...params }),
  botsEditAccessSettingsRaw: (accountId: string, params: { botId: string | any; restricted?: boolean; addUsers?: (string | any)[] }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:edit-access-settings-raw', { accountId, ...params }),
  botsEditPreviewMediaRaw: (accountId: string, params: { botId: string | any; langCode?: string; media: any; newMedia: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:bots:edit-preview-media-raw', { accountId, ...params }),
  botsExportBotTokenRaw: (accountId: string, params: { botId: string | any; revoke?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:bots:export-bot-token-raw', { accountId, ...params }),
  botsGetAccessSettingsRaw: (accountId: string, params: { botId: string | any }): Promise<any> =>
    ipcRenderer.invoke('telegram:bots:get-access-settings-raw', { accountId, ...params }),
  botsGetAdminedBotsRaw: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:bots:get-admined-bots-raw', { accountId }),
  botsGetBotCommandsRaw: (accountId: string, params?: { scope?: any; langCode?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:bots:get-bot-commands-raw', { accountId, ...params }),
  botsGetBotInfoRaw: (accountId: string, params?: { bot?: string | any; langCode?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:bots:get-bot-info-raw', { accountId, ...params }),
  botsGetBotMenuButtonRaw: (accountId: string, params: { userId: string | any }): Promise<any> =>
    ipcRenderer.invoke('telegram:bots:get-bot-menu-button-raw', { accountId, ...params }),
  botsGetBotRecommendationsRaw: (accountId: string, params: { botId: string | any }): Promise<any> =>
    ipcRenderer.invoke('telegram:bots:get-bot-recommendations-raw', { accountId, ...params }),
  botsGetPopularAppBotsRaw: (accountId: string, params?: { offset?: string; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:bots:get-popular-app-bots-raw', { accountId, ...params }),
  botsGetPreviewInfoRaw: (accountId: string, params: { botId: string | any; langCode?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:bots:get-preview-info-raw', { accountId, ...params }),
  botsGetPreviewMediasRaw: (accountId: string, params: { botId: string | any }): Promise<any> =>
    ipcRenderer.invoke('telegram:bots:get-preview-medias-raw', { accountId, ...params }),
  // Microphase 091 APIs: Bots Domain Suite Part 4 (7 RPCs)
  botsGetRequestedWebViewButtonRaw: (accountId: string, params: { botId: string | any; webappReqId: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:bots:get-requested-web-view-button-raw', { accountId, ...params }),
  botsInvokeWebViewCustomMethodRaw: (accountId: string, params: { botId: string | any; customMethod: string; params: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:bots:invoke-web-view-custom-method-raw', { accountId, ...params }),
  botsRemoveUsernameRaw: (accountId: string, params: { botId: string | any; username: string }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:remove-username-raw', { accountId, ...params }),
  botsReorderPreviewMediasRaw: (accountId: string, params: { botId: string | any; order: any[]; langCode?: string }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:reorder-preview-medias-raw', { accountId, ...params }),
  botsReorderUsernamesRaw: (accountId: string, params: { botId: string | any; order: string[] }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:reorder-usernames-raw', { accountId, ...params }),
  botsRequestWebViewButtonRaw: (accountId: string, params: { botId: string | any; button: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:bots:request-web-view-button-raw', { accountId, ...params }),
  botsResetBotCommandsRaw: (accountId: string, params?: { scope?: any; langCode?: string }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:reset-bot-commands-raw', { accountId, ...params }),
  // Microphase 092: Bots Domain Suite Part 5 (7 RPCs)
  botsSendCustomRequestRaw: (accountId: string, params: { customMethod: string; params?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:bots:send-custom-request-raw', { accountId, ...params }),
  botsSetBotBroadcastDefaultAdminRightsRaw: (accountId: string, params: { adminRights?: any }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:set-bot-broadcast-default-admin-rights-raw', { accountId, ...params }),
  botsSetBotCommandsRaw: (accountId: string, params: { commands: any[]; scope?: any; langCode?: string }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:set-bot-commands-raw', { accountId, ...params }),
  botsSetBotGroupDefaultAdminRightsRaw: (accountId: string, params: { adminRights?: any }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:set-bot-group-default-admin-rights-raw', { accountId, ...params }),
  botsSetBotInfoRaw: (accountId: string, params: { bot?: string | any; botId?: string | any; langCode?: string; name?: string; about?: string; description?: string }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:set-bot-info-raw', { accountId, ...params }),
  botsSetBotMenuButtonRaw: (accountId: string, params: { userId?: string | any; botId?: string | any; button?: any }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:set-bot-menu-button-raw', { accountId, ...params }),
  botsSetCustomVerificationRaw: (accountId: string, params: { botId?: string | any; bot?: string | any; peerId: string; customDescription?: string; enabled?: boolean }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:set-custom-verification-raw', { accountId, ...params }),
  // Microphase 093: Bots Domain Suite Part 6 (5 RPCs)
  botsSetJoinChatResultsRaw: (accountId: string, params: { queryId: bigint | number | string; result: any }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:set-join-chat-results-raw', { accountId, ...params }),
  botsToggleUserEmojiStatusPermissionRaw: (accountId: string, params: { bot?: string | any; botId?: string | any; enabled: boolean }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:toggle-user-emoji-status-permission-raw', { accountId, ...params }),
  botsToggleUsernameRaw: (accountId: string, params: { bot?: string | any; botId?: string | any; username: string; active: boolean }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:toggle-username-raw', { accountId, ...params }),
  botsUpdateStarRefProgramRaw: (accountId: string, params: { bot?: string | any; botId?: string | any; commissionPermille: number; durationMonths?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:bots:update-star-ref-program-raw', { accountId, ...params }),
  botsUpdateUserEmojiStatusRaw: (accountId: string, params: { userId?: string | any; targetUserId?: string | any; emojiStatus: any }): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bots:update-user-emoji-status-raw', { accountId, ...params }),
  // Microphase 094: Payments Domain Suite Part 1 (7 RPCs)
  paymentsApplyGiftCodeRaw: (accountId: string, params: { slug: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:apply-gift-code-raw', { accountId, ...params }),
  paymentsAssignAppStoreTransactionRaw: (accountId: string, params: { receipt: any; purpose?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:assign-app-store-transaction-raw', { accountId, ...params }),
  paymentsAssignPlayMarketTransactionRaw: (accountId: string, params: { receipt: any; purpose?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:assign-play-market-transaction-raw', { accountId, ...params }),
  paymentsBotCancelStarsSubscriptionRaw: (accountId: string, params: { userId: string; chargeId: string; restore?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:bot-cancel-stars-subscription-raw', { accountId, ...params }),
  paymentsCanPurchaseStoreRaw: (accountId: string, params: { purpose?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:can-purchase-store-raw', { accountId, ...params }),
  paymentsChangeStarsSubscriptionRaw: (accountId: string, params: { peerId: string; subscriptionId: string; canceled: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:change-stars-subscription-raw', { accountId, ...params }),
  paymentsCheckCanSendGiftRaw: (accountId: string, params: { giftId: bigint | number | string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:check-can-send-gift-raw', { accountId, ...params }),
  // Microphase 095: Payments Domain Suite Part 2 (7 RPCs)
  paymentsCheckGiftCodeRaw: (accountId: string, params: { slug: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:check-gift-code-raw', { accountId, ...params }),
  paymentsClearSavedInfoRaw: (accountId: string, params?: { credentials?: boolean; info?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:clear-saved-info-raw', { accountId, ...params }),
  paymentsConnectStarRefBotRaw: (accountId: string, params: { peerId: string; botId: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:connect-star-ref-bot-raw', { accountId, ...params }),
  paymentsConvertStarGiftRaw: (accountId: string, params: { stargift: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:convert-star-gift-raw', { accountId, ...params }),
  paymentsCraftStarGiftRaw: (accountId: string, params: { stargift: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:craft-star-gift-raw', { accountId, ...params }),
  paymentsCreateOnrampSessionRaw: (accountId: string, params: any): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:create-onramp-session-raw', { accountId, ...params }),
  paymentsCreateStarGiftCollectionRaw: (accountId: string, params: { peerId: string; title: string; stargift?: any[] }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:create-star-gift-collection-raw', { accountId, ...params }),
  // Microphase 096: Payments Domain Suite Part 3 (7 RPCs)
  paymentsDeleteStarGiftRaw: (accountId: string, params: { stargift: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:delete-star-gift-raw', { accountId, ...params }),
  paymentsDeleteStarGiftCollectionRaw: (accountId: string, params: { peerId: string; collectionId: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:delete-star-gift-collection-raw', { accountId, ...params }),
  paymentsDepositStarGiftRaw: (accountId: string, params: { peerId: string; slug: string; hideSender?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:deposit-star-gift-raw', { accountId, ...params }),
  paymentsDisplayStarGiftRaw: (accountId: string, params: { slug: string; peerId?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:display-star-gift-raw', { accountId, ...params }),
  paymentsEditConnectedStarRefBotRaw: (accountId: string, params: { peerId: string; link: string; revoked?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:edit-connected-star-ref-bot-raw', { accountId, ...params }),
  paymentsExportInvoiceRaw: (accountId: string, params: { invoiceMedia: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:export-invoice-raw', { accountId, ...params }),
  paymentsFulfillStarsSubscriptionRaw: (accountId: string, params: { peerId: string; subscriptionId: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:fulfill-stars-subscription-raw', { accountId, ...params }),
  // Microphase 097: Payments Domain Suite Part 4 (7 RPCs)
  paymentsGetBankCardDataRaw: (accountId: string, params: { number: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-bank-card-data-raw', { accountId, ...params }),
  paymentsGetConnectedStarRefBotRaw: (accountId: string, params: { peerId: string; botId: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-connected-star-ref-bot-raw', { accountId, ...params }),
  paymentsGetConnectedStarRefBotsRaw: (accountId: string, params: { peerId: string; offsetDate?: number; offsetLink?: string; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-connected-star-ref-bots-raw', { accountId, ...params }),
  paymentsGetCraftStarGiftsRaw: (accountId: string, params: { giftId: bigint | number | string; offset?: string; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-craft-star-gifts-raw', { accountId, ...params }),
  paymentsGetCurrencyRatesRaw: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-currency-rates-raw', { accountId }),
  paymentsGetGiveawayInfoRaw: (accountId: string, params: { peerId: string; msgId: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-giveaway-info-raw', { accountId, ...params }),
  paymentsGetOnrampAvailabilityRaw: (accountId: string, params: { provider: string; cryptoCurrency: string; baseCurrency?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-onramp-availability-raw', { accountId, ...params }),
  // Microphase 098: Payments Domain Suite Part 5 (7 RPCs)
  paymentsGetOnrampBaseCurrenciesRaw: (accountId: string, params: { provider: string; cryptoCurrency: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-onramp-base-currencies-raw', { accountId, ...params }),
  paymentsGetOnrampLimitsRaw: (accountId: string, params: { provider: string; cryptoCurrency: string; baseCurrency: string; paymentMethod?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-onramp-limits-raw', { accountId, ...params }),
  paymentsGetOnrampProvidersRaw: (accountId: string, params?: { cryptoCurrency?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-onramp-providers-raw', { accountId, ...params }),
  paymentsGetOnrampQuoteRaw: (accountId: string, params: { provider: string; cryptoCurrency: string; baseCurrency: string; baseAmount?: string; cryptoAmount?: string; paymentMethod?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-onramp-quote-raw', { accountId, ...params }),
  paymentsGetPaymentFormRaw: (accountId: string, params: { invoice: any; themeParams?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-payment-form-raw', { accountId, ...params }),
  paymentsGetPaymentReceiptRaw: (accountId: string, params: { peerId: string; msgId: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-payment-receipt-raw', { accountId, ...params }),
  paymentsGetPremiumGiftCodeOptionsRaw: (accountId: string, params?: { boostPeerId?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-premium-gift-code-options-raw', { accountId, ...params }),
  // Microphase 099: Payments Domain Suite Part 6 (7 RPCs: Resale Gifts, Saved Gifts & Auctions)
  paymentsGetResaleStarGiftsRaw: (accountId: string, params: { giftId: bigint | number | string; offset?: string; limit?: number; [key: string]: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-resale-star-gifts-raw', { accountId, ...params }),
  paymentsGetSavedInfoRaw: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-saved-info-raw', { accountId }),
  paymentsGetSavedStarGiftRaw: (accountId: string, params: { stargift: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-saved-star-gift-raw', { accountId, ...params }),
  paymentsGetSavedStarGiftsRaw: (accountId: string, params?: { peerId?: string; [key: string]: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-saved-star-gifts-raw', { accountId, ...params }),
  paymentsGetStarGiftActiveAuctionsRaw: (accountId: string, params?: { hash?: bigint | number | string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-star-gift-active-auctions-raw', { accountId, ...params }),
  paymentsGetStarGiftAuctionAcquiredGiftsRaw: (accountId: string, params: { giftId: bigint | number | string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-star-gift-auction-acquired-gifts-raw', { accountId, ...params }),
  paymentsGetStarGiftAuctionStateRaw: (accountId: string, params: { auction: any; version?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-star-gift-auction-state-raw', { accountId, ...params }),
  // Microphase 100: Payments Domain Suite Part 7 (7 RPCs: Collections, Upgrades, Withdrawal, Gifts & Giveaways)
  paymentsGetStarGiftCollectionsRaw: (accountId: string, params?: { peerId?: string; hash?: bigint | number | string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-star-gift-collections-raw', { accountId, ...params }),
  paymentsGetStarGiftUpgradeAttributesRaw: (accountId: string, params: { giftId: bigint | number | string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-star-gift-upgrade-attributes-raw', { accountId, ...params }),
  paymentsGetStarGiftUpgradePreviewRaw: (accountId: string, params: { giftId: bigint | number | string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-star-gift-upgrade-preview-raw', { accountId, ...params }),
  paymentsGetStarGiftWithdrawalUrlRaw: (accountId: string, params: { stargift: any; password?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-star-gift-withdrawal-url-raw', { accountId, ...params }),
  paymentsGetStarGiftsRaw: (accountId: string, params?: { hash?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-star-gifts-raw', { accountId, ...params }),
  paymentsGetStarsGiftOptionsRaw: (accountId: string, params?: { userId?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-stars-gift-options-raw', { accountId, ...params }),
  paymentsGetStarsGiveawayOptionsRaw: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-stars-giveaway-options-raw', { accountId }),
  // Microphase 101: Payments Domain Suite Part 8 (7 RPCs: Revenue, Status, Subscriptions, Topup Options & Transactions)
  paymentsGetStarsRevenueAdsAccountUrlRaw: (accountId: string, params: { peerId: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-stars-revenue-ads-account-url-raw', { accountId, ...params }),
  paymentsGetStarsRevenueStatsRaw: (accountId: string, params: { peerId: string; dark?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-stars-revenue-stats-raw', { accountId, ...params }),
  paymentsGetStarsRevenueWithdrawalUrlRaw: (accountId: string, params: { peerId: string; stars?: bigint | number | string; password?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-stars-revenue-withdrawal-url-raw', { accountId, ...params }),
  paymentsGetStarsStatusRaw: (accountId: string, params?: { peerId?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-stars-status-raw', { accountId, ...params }),
  paymentsGetStarsSubscriptionsRaw: (accountId: string, params?: { peerId?: string; offset?: string; missingBalance?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-stars-subscriptions-raw', { accountId, ...params }),
  paymentsGetStarsTopupOptionsRaw: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-stars-topup-options-raw', { accountId }),
  paymentsGetStarsTransactionsRaw: (accountId: string, params?: { peerId?: string; offset?: string; limit?: number; inbound?: boolean; outbound?: boolean; ascending?: boolean; subscriptionId?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-stars-transactions-raw', { accountId, ...params }),
  // Microphase 102: Payments Domain Suite Part 9 (7 RPCs: Transactions By ID, Ref Bots, Unique Gift Info, Prepaid Giveaway, Refund, Reorder Collections)
  paymentsGetStarsTransactionsByIDRaw: (accountId: string, params: { peerId: string; id: string[] }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-stars-transactions-by-id-raw', { accountId, ...params }),
  paymentsGetSuggestedStarRefBotsRaw: (accountId: string, params?: { peerId?: string; offset?: string; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-suggested-star-ref-bots-raw', { accountId, ...params }),
  paymentsGetUniqueStarGiftRaw: (accountId: string, params: { slug: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-unique-star-gift-raw', { accountId, ...params }),
  paymentsGetUniqueStarGiftValueInfoRaw: (accountId: string, params: { slug: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:get-unique-star-gift-value-info-raw', { accountId, ...params }),
  paymentsLaunchPrepaidGiveawayRaw: (accountId: string, params: { peerId: string; giveawayId: bigint | number | string; purpose: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:launch-prepaid-giveaway-raw', { accountId, ...params }),
  paymentsRefundStarsChargeRaw: (accountId: string, params: { userId: string; chargeId: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:refund-stars-charge-raw', { accountId, ...params }),
  paymentsReorderStarGiftCollectionsRaw: (accountId: string, params: { peerId: string; order: number[] }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:reorder-star-gift-collections-raw', { accountId, ...params }),
  // Layer 232 Payments Suite (Microphase 103)
  paymentsResolveStarGiftOfferRaw: (accountId: string, params: { offerMsgId: number; decline?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:resolve-star-gift-offer-raw', { accountId, ...params }),
  paymentsSaveStarGiftRaw: (accountId: string, params: { stargift: any; unsave?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:save-star-gift-raw', { accountId, ...params }),
  paymentsSendPaymentFormRaw: (accountId: string, params: { formId: bigint | number | any; invoice: any; credentials: any; requestedInfoId?: string; shippingOptionId?: string; tipAmount?: bigint | number | any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:send-payment-form-raw', { accountId, ...params }),
  paymentsSendStarGiftOfferRaw: (accountId: string, params: { peerId: string; slug: string; price: any; duration?: number; randomId?: bigint | number | any; allowPaidStars?: bigint | number | any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:send-star-gift-offer-raw', { accountId, ...params }),
  paymentsSendStarsFormRaw: (accountId: string, params: { formId: bigint | number | any; invoice: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:send-stars-form-raw', { accountId, ...params }),
  paymentsToggleChatStarGiftNotificationsRaw: (accountId: string, params: { peerId: string; enabled?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:toggle-chat-star-gift-notifications-raw', { accountId, ...params }),
  paymentsToggleStarGiftsPinnedToTopRaw: (accountId: string, params: { peerId: string; stargift: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:toggle-star-gifts-pinned-to-top-raw', { accountId, ...params }),
  // Layer 232 Payments Suite (Microphase 104)
  paymentsTransferStarGiftRaw: (accountId: string, params: { stargift: any; toPeerId?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:transfer-star-gift-raw', { accountId, ...params }),
  paymentsUpdateStarGiftCollectionRaw: (accountId: string, params: { peerId: string; collectionId: number; title?: string; deleteStargift?: any[]; addStargift?: any[]; order?: any[] }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:update-star-gift-collection-raw', { accountId, ...params }),
  paymentsUpdateStarGiftPriceRaw: (accountId: string, params: { stargift: any; resellAmount?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:update-star-gift-price-raw', { accountId, ...params }),
  paymentsUpgradeStarGiftRaw: (accountId: string, params: { stargift: any; keepOriginalDetails?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:upgrade-star-gift-raw', { accountId, ...params }),
  paymentsValidateRequestedInfoRaw: (accountId: string, params: { invoice: any; info?: any; save?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:validate-requested-info-raw', { accountId, ...params }),
  paymentsWithdrawStarGiftRaw: (accountId: string, params: { stargift: any; keepOnProfile?: boolean; tmpPassword?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:payments:withdraw-star-gift-raw', { accountId, ...params }),
  // Layer 232 Stickers Suite (Microphase 105)
  stickersAddStickerToSetRaw: (accountId: string, params: { stickerset: any; sticker: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:stickers:add-sticker-to-set-raw', { accountId, ...params }),
  stickersChangeStickerRaw: (accountId: string, params: { sticker: any; emoji?: string; maskCoords?: any; keywords?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:stickers:change-sticker-raw', { accountId, ...params }),
  stickersChangeStickerPositionRaw: (accountId: string, params: { sticker: any; position: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:stickers:change-sticker-position-raw', { accountId, ...params }),
  stickersCheckShortNameRaw: (accountId: string, params: { shortName: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:stickers:check-short-name-raw', { accountId, ...params }),
  stickersCreateStickerSetRaw: (accountId: string, params: { masks?: boolean; emojis?: boolean; textColor?: boolean; userId?: string; title: string; shortName: string; thumb?: any; stickers: any[]; software?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:stickers:create-sticker-set-raw', { accountId, ...params }),
  stickersDeleteStickerSetRaw: (accountId: string, params: { stickerset: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:stickers:delete-sticker-set-raw', { accountId, ...params }),
  stickersRemoveStickerFromSetRaw: (accountId: string, params: { sticker: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:stickers:remove-sticker-from-set-raw', { accountId, ...params }),
  // Layer 232 Stickers Suite (Microphase 106)
  stickersRenameStickerSetRaw: (accountId: string, params: { stickerset: any; title: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:stickers:rename-sticker-set-raw', { accountId, ...params }),
  stickersReplaceStickerRaw: (accountId: string, params: { sticker: any; newSticker: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:stickers:replace-sticker-raw', { accountId, ...params }),
  stickersSetStickerSetThumbRaw: (accountId: string, params: { stickerset: any; thumb?: any; thumbDocumentId?: bigint | number }): Promise<any> =>
    ipcRenderer.invoke('telegram:stickers:set-sticker-set-thumb-raw', { accountId, ...params }),
  stickersSuggestShortNameRaw: (accountId: string, params: { title: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:stickers:suggest-short-name-raw', { accountId, ...params }),
  // Layer 232 Phone Suite (Microphase 107)
  phoneAcceptCallRaw: (accountId: string, params: { peer: any; gB?: any; protocol?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:accept-call-raw', { accountId, ...params }),
  phoneCheckGroupCallRaw: (accountId: string, params: { call: any; sources: number[] }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:check-group-call-raw', { accountId, ...params }),
  phoneConfirmCallRaw: (accountId: string, params: { peer: any; gA?: any; keyFingerprint?: bigint | number; protocol?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:confirm-call-raw', { accountId, ...params }),
  phoneCreateConferenceCallRaw: (accountId: string, params: { muted?: boolean; videoStopped?: boolean; join?: boolean; randomId?: number; publicKey?: any; block?: any; params?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:create-conference-call-raw', { accountId, ...params }),
  phoneCreateGroupCallRaw: (accountId: string, params: { rtmpStream?: boolean; peerId?: string; randomId?: number; title?: string; scheduleDate?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:create-group-call-raw', { accountId, ...params }),
  phoneDeclineConferenceCallInviteRaw: (accountId: string, params: { msgId: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:decline-conference-call-invite-raw', { accountId, ...params }),
  phoneDeleteConferenceCallParticipantsRaw: (accountId: string, params: { onlyLeft?: boolean; kick?: boolean; call: any; ids: (bigint | number)[]; block?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:delete-conference-call-participants-raw', { accountId, ...params }),
  // Layer 232 Phone Suite (Microphase 108)
  phoneDeleteGroupCallMessagesRaw: (accountId: string, params: { call: any; messages: number[]; reportSpam?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:delete-group-call-messages-raw', { accountId, ...params }),
  phoneDeleteGroupCallParticipantMessagesRaw: (accountId: string, params: { call: any; participant: any; reportSpam?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:delete-group-call-participant-messages-raw', { accountId, ...params }),
  phoneDiscardCallRaw: (accountId: string, params: { peer: any; duration?: number; reason?: any; connectionId?: bigint | number; video?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:discard-call-raw', { accountId, ...params }),
  phoneDiscardGroupCallRaw: (accountId: string, params: { call: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:discard-group-call-raw', { accountId, ...params }),
  phoneEditGroupCallParticipantRaw: (accountId: string, params: { call: any; participant: any; muted?: boolean; volume?: number; raiseHand?: boolean; videoStopped?: boolean; videoPaused?: boolean; presentationPaused?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:edit-group-call-participant-raw', { accountId, ...params }),
  phoneEditGroupCallTitleRaw: (accountId: string, params: { call: any; title: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:edit-group-call-title-raw', { accountId, ...params }),
  phoneExportGroupCallInviteRaw: (accountId: string, params: { call: any; canSelfUnmute?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:export-group-call-invite-raw', { accountId, ...params }),
  // Layer 232 Phone Suite (Microphase 109)
  phoneGetCallConfigRaw: (accountId: string, params?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:get-call-config-raw', { accountId, ...params }),
  phoneGetGroupCallRaw: (accountId: string, params: { call: any; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:get-group-call-raw', { accountId, ...params }),
  phoneGetGroupCallChainBlocksRaw: (accountId: string, params: { call: any; subChainId?: number; offset?: number; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:get-group-call-chain-blocks-raw', { accountId, ...params }),
  phoneGetGroupCallJoinAsRaw: (accountId: string, params: { peerId?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:get-group-call-join-as-raw', { accountId, ...params }),
  phoneGetGroupCallStarsRaw: (accountId: string, params: { call: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:get-group-call-stars-raw', { accountId, ...params }),
  phoneGetGroupCallStreamChannelsRaw: (accountId: string, params: { call: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:get-group-call-stream-channels-raw', { accountId, ...params }),
  phoneGetGroupCallStreamRtmpUrlRaw: (accountId: string, params: { peerId: string; revoke?: boolean; liveStory?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:get-group-call-stream-rtmp-url-raw', { accountId, ...params }),
  // Layer 232 Phone Suite (Microphase 110)
  phoneGetGroupParticipantsRaw: (accountId: string, params: { call: any; ids?: any[]; sources?: number[]; offset?: string; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:get-group-participants-raw', { accountId, ...params }),
  phoneInviteConferenceCallParticipantRaw: (accountId: string, params: { call: any; userId: any; video?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:invite-conference-call-participant-raw', { accountId, ...params }),
  phoneInviteToGroupCallRaw: (accountId: string, params: { call: any; users: any[] }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:invite-to-group-call-raw', { accountId, ...params }),
  phoneJoinGroupCallRaw: (accountId: string, params: { call: any; joinAs?: any; muted?: boolean; videoStopped?: boolean; inviteHash?: string; publicKey?: any; block?: any; params?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:join-group-call-raw', { accountId, ...params }),
  phoneJoinGroupCallPresentationRaw: (accountId: string, params: { call: any; params?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:join-group-call-presentation-raw', { accountId, ...params }),
  phoneLeaveGroupCallRaw: (accountId: string, params: { call: any; source?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:leave-group-call-raw', { accountId, ...params }),
  phoneLeaveGroupCallPresentationRaw: (accountId: string, params: { call: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:leave-group-call-presentation-raw', { accountId, ...params }),
  // Layer 232 Phone Suite (Microphase 111)
  phoneReceivedCallRaw: (accountId: string, params: { peer: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:received-call-raw', { accountId, ...params }),
  phoneRequestCallRaw: (accountId: string, params: { video?: boolean; userId: any; randomId?: number; gAHash?: any; protocol?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:request-call-raw', { accountId, ...params }),
  phoneSaveCallDebugRaw: (accountId: string, params: { peer: any; debug: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:save-call-debug-raw', { accountId, ...params }),
  phoneSaveCallLogRaw: (accountId: string, params: { peer: any; file: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:save-call-log-raw', { accountId, ...params }),
  phoneSaveDefaultGroupCallJoinAsRaw: (accountId: string, params: { peer: any; joinAs: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:save-default-group-call-join-as-raw', { accountId, ...params }),
  phoneSaveDefaultSendAsRaw: (accountId: string, params: { call: any; sendAs: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:save-default-send-as-raw', { accountId, ...params }),
  phoneSendConferenceCallBroadcastRaw: (accountId: string, params: { call: any; block?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:send-conference-call-broadcast-raw', { accountId, ...params }),
  phoneSendGroupCallEncryptedMessageRaw: (accountId: string, params: { call: any; encryptedMessage: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:send-group-call-encrypted-message-raw', { accountId, ...params }),
  phoneSendGroupCallMessageRaw: (accountId: string, params: { call: any; randomId?: any; message: any; allowPaidStars?: any; sendAs?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:send-group-call-message-raw', { accountId, ...params }),
  phoneSendSignalingDataRaw: (accountId: string, params: { peer: any; data: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:send-signaling-data-raw', { accountId, ...params }),
  phoneSetCallRatingRaw: (accountId: string, params: { peer: any; rating: number; comment?: string; userInitiative?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:set-call-rating-raw', { accountId, ...params }),
  phoneStartScheduledGroupCallRaw: (accountId: string, params: { call: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:start-scheduled-group-call-raw', { accountId, ...params }),
  phoneToggleGroupCallRecordRaw: (accountId: string, params: { call: any; start?: boolean; video?: boolean; title?: string; videoPortrait?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:toggle-group-call-record-raw', { accountId, ...params }),
  phoneToggleGroupCallSettingsRaw: (accountId: string, params: { call: any; resetInviteHash?: boolean; joinMuted?: boolean; messagesEnabled?: boolean; sendPaidMessagesStars?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:toggle-group-call-settings-raw', { accountId, ...params }),
  phoneToggleGroupCallStartSubscriptionRaw: (accountId: string, params: { call: any; subscribed: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:phone:toggle-group-call-start-subscription-raw', { accountId, ...params }),
  langpackGetDifferenceRaw: (accountId: string, params: { langPack?: string; langCode?: string; fromVersion?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:langpack:get-difference-raw', { accountId, ...params }),
  langpackGetLangPackRaw: (accountId: string, params: { langPack?: string; langCode?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:langpack:get-lang-pack-raw', { accountId, ...params }),
  langpackGetLanguageRaw: (accountId: string, params: { langPack?: string; langCode?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:langpack:get-language-raw', { accountId, ...params }),
  langpackGetLanguagesRaw: (accountId: string, params: { langPack?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:langpack:get-languages-raw', { accountId, ...params }),
  langpackGetStringsRaw: (accountId: string, params: { langPack?: string; langCode?: string; keys: string[] }): Promise<any> =>
    ipcRenderer.invoke('telegram:langpack:get-strings-raw', { accountId, ...params }),
  foldersEditPeerFoldersRaw: (accountId: string, params: { folderPeers: Array<{ peer: any; folderId: number }> }): Promise<any> =>
    ipcRenderer.invoke('telegram:folders:edit-peer-folders-raw', { accountId, ...params }),
  statsGetBroadcastStatsRaw: (accountId: string, params: { channel: string; dark?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:stats:get-broadcast-stats-raw', { accountId, ...params }),
  statsGetMegagroupStatsRaw: (accountId: string, params: { channel: string; dark?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:stats:get-megagroup-stats-raw', { accountId, ...params }),
  statsGetMessagePublicForwardsRaw: (accountId: string, params: { channel: string; msgId: number; offset?: string; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:stats:get-message-public-forwards-raw', { accountId, ...params }),
  statsGetMessageStatsRaw: (accountId: string, params: { channel: string; msgId: number; dark?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:stats:get-message-stats-raw', { accountId, ...params }),
  statsGetPollStatsRaw: (accountId: string, params: { peer: string; msgId: number; dark?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:stats:get-poll-stats-raw', { accountId, ...params }),
  statsGetStoryPublicForwardsRaw: (accountId: string, params: { peer: string; id: number; offset?: string; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:stats:get-story-public-forwards-raw', { accountId, ...params }),
  statsGetStoryStatsRaw: (accountId: string, params: { peer: string; id: number; dark?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:stats:get-story-stats-raw', { accountId, ...params }),
  statsLoadAsyncGraphRaw: (accountId: string, params: { token: string; x?: bigint | number | string }): Promise<any> =>
    ipcRenderer.invoke('telegram:stats:load-async-graph-raw', { accountId, ...params }),

  // --- Microphase 118: Chatlists Domain Suite Part 1 ---
  chatlistsCheckChatlistInviteRaw: (accountId: string, params: { slug: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:chatlists:check-chatlist-invite-raw', { accountId, ...params }),
  chatlistsDeleteExportedInviteRaw: (accountId: string, params: { chatlist: any; slug: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:chatlists:delete-exported-invite-raw', { accountId, ...params }),
  chatlistsEditExportedInviteRaw: (accountId: string, params: { chatlist: any; slug: string; title?: string; peers?: string[] | string }): Promise<any> =>
    ipcRenderer.invoke('telegram:chatlists:edit-exported-invite-raw', { accountId, ...params }),
  chatlistsExportChatlistInviteRaw: (accountId: string, params: { chatlist: any; title: string; peers: string[] | string }): Promise<any> =>
    ipcRenderer.invoke('telegram:chatlists:export-chatlist-invite-raw', { accountId, ...params }),
  chatlistsGetChatlistUpdatesRaw: (accountId: string, params: { chatlist: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:chatlists:get-chatlist-updates-raw', { accountId, ...params }),
  chatlistsGetExportedInvitesRaw: (accountId: string, params: { chatlist: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:chatlists:get-exported-invites-raw', { accountId, ...params }),
  chatlistsGetLeaveChatlistSuggestionsRaw: (accountId: string, params: { chatlist: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:chatlists:get-leave-chatlist-suggestions-raw', { accountId, ...params }),

  // --- Microphase 119: Chatlists Domain Suite Part 2 ---
  chatlistsHideChatlistUpdatesRaw: (accountId: string, params: { chatlist: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:chatlists:hide-chatlist-updates-raw', { accountId, ...params }),
  chatlistsJoinChatlistInviteRaw: (accountId: string, params: { slug: string; peers: string[] | string }): Promise<any> =>
    ipcRenderer.invoke('telegram:chatlists:join-chatlist-invite-raw', { accountId, ...params }),
  chatlistsJoinChatlistUpdatesRaw: (accountId: string, params: { chatlist: any; peers: string[] | string }): Promise<any> =>
    ipcRenderer.invoke('telegram:chatlists:join-chatlist-updates-raw', { accountId, ...params }),
  chatlistsLeaveChatlistRaw: (accountId: string, params: { chatlist: any; peers: string[] | string }): Promise<any> =>
    ipcRenderer.invoke('telegram:chatlists:leave-chatlist-raw', { accountId, ...params }),

  // --- Microphase 120: Stories Domain Suite Part 1 ---
  storiesActivateStealthModeRaw: (accountId: string, params: { past?: boolean; future?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:activate-stealth-mode-raw', { accountId, ...params }),
  storiesCanSendStoryRaw: (accountId: string, params: { peerId?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:can-send-story-raw', { accountId, ...params }),
  storiesCreateAlbumRaw: (accountId: string, params: { peerId?: string; title?: string; stories?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:create-album-raw', { accountId, ...params }),
  storiesDeleteAlbumRaw: (accountId: string, params: { peerId?: string; albumId?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:delete-album-raw', { accountId, ...params }),
  storiesDeleteStoriesRaw: (accountId: string, params: { peerId?: string; id?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:delete-stories-raw', { accountId, ...params }),
  storiesEditStoryRaw: (accountId: string, params: { peerId?: string; id?: number; media?: any; mediaAreas?: any; caption?: string; entities?: any; privacyRules?: any; music?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:edit-story-raw', { accountId, ...params }),
  storiesExportStoryLinkRaw: (accountId: string, params: { peerId?: string; id?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:export-story-link-raw', { accountId, ...params }),

  // --- Microphase 121: Stories Domain Suite Part 2 ---
  storiesGetAlbumStoriesRaw: (accountId: string, params: { peerId?: string; albumId?: number; offset?: number; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:get-album-stories-raw', { accountId, ...params }),
  storiesGetAlbumsRaw: (accountId: string, params: { peerId?: string; hash?: bigint | number }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:get-albums-raw', { accountId, ...params }),
  storiesGetAllReadPeerStoriesRaw: (accountId: string, params: any = {}): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:get-all-read-peer-stories-raw', { accountId, ...params }),
  storiesGetAllStoriesRaw: (accountId: string, params: { next?: boolean; hidden?: boolean; state?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:get-all-stories-raw', { accountId, ...params }),
  storiesGetChatsToSendRaw: (accountId: string, params: any = {}): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:get-chats-to-send-raw', { accountId, ...params }),
  storiesGetPeerMaxIDsRaw: (accountId: string, params: { idId?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:get-peer-max-ids-raw', { accountId, ...params }),
  storiesGetPeerStoriesRaw: (accountId: string, params: { peerId?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:get-peer-stories-raw', { accountId, ...params }),

  // --- Microphase 122: Stories Domain Suite Part 3 ---
  storiesGetPinnedStoriesRaw: (accountId: string, params: { peerId?: string; offsetId?: number; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:get-pinned-stories-raw', { accountId, ...params }),
  storiesGetStoriesArchiveRaw: (accountId: string, params: { peerId?: string; offsetId?: number; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:get-stories-archive-raw', { accountId, ...params }),
  storiesGetStoriesByIDRaw: (accountId: string, params: { peerId?: string; id?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:get-stories-by-id-raw', { accountId, ...params }),
  storiesGetStoriesViewsRaw: (accountId: string, params: { peerId?: string; id?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:get-stories-views-raw', { accountId, ...params }),
  storiesGetStoryReactionsListRaw: (accountId: string, params: { forwardsFirst?: boolean; peerId?: string; id?: number; reaction?: any; offset?: string; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:get-story-reactions-list-raw', { accountId, ...params }),
  storiesGetStoryViewsListRaw: (accountId: string, params: { justContacts?: boolean; reactionsFirst?: boolean; forwardsFirst?: boolean; peerId?: string; q?: string; id?: number; offset?: string; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:get-story-views-list-raw', { accountId, ...params }),
  storiesIncrementStoryViewsRaw: (accountId: string, params: { peerId?: string; id?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:increment-story-views-raw', { accountId, ...params }),

  // --- Microphase 123: Stories Domain Suite Part 4 ---
  storiesReadStoriesRaw: (accountId: string, params: { peerId?: string; maxId?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:read-stories-raw', { accountId, ...params }),
  storiesReorderAlbumsRaw: (accountId: string, params: { peerId?: string; order?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:reorder-albums-raw', { accountId, ...params }),
  storiesReportRaw: (accountId: string, params: { peerId?: string; id?: any; option?: any; message?: string }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:report-raw', { accountId, ...params }),
  storiesSearchPostsRaw: (accountId: string, params: { hashtag?: string; area?: any; peerId?: string; offset?: string; limit?: number }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:search-posts-raw', { accountId, ...params }),
  storiesSendReactionRaw: (accountId: string, params: { addToRecent?: boolean; peerId?: string; storyId?: number; reaction?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:send-reaction-raw', { accountId, ...params }),
  storiesSendStoryRaw: (accountId: string, params: any): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:send-story-raw', { accountId, ...params }),
  storiesStartLiveRaw: (accountId: string, params: any): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:start-live-raw', { accountId, ...params }),

  // --- Microphase 124: Stories Domain Suite Part 5 ---
  storiesToggleAllStoriesHiddenRaw: (accountId: string, params: { hidden?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:toggle-all-stories-hidden-raw', { accountId, ...params }),
  storiesTogglePeerStoriesHiddenRaw: (accountId: string, params: { peerId?: string; hidden?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:toggle-peer-stories-hidden-raw', { accountId, ...params }),
  storiesTogglePinnedRaw: (accountId: string, params: { peerId?: string; id?: any; pinned?: boolean }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:toggle-pinned-raw', { accountId, ...params }),
  storiesTogglePinnedToTopRaw: (accountId: string, params: { peerId?: string; id?: any }): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:toggle-pinned-to-top-raw', { accountId, ...params }),
  storiesUpdateAlbumRaw: (accountId: string, params: any): Promise<any> =>
    ipcRenderer.invoke('telegram:stories:update-album-raw', { accountId, ...params }),

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
  getHarvestedProxies: (): Promise<ProxyConfig[]> =>
    ipcRenderer.invoke('proxy:get-harvested-proxies'),
  getDistinctProxy: (accountId: string): Promise<ProxyConfig | null> =>
    ipcRenderer.invoke('proxy:get-distinct-proxy', { accountId }),
  onHarvestedProxiesUpdated: (callback: (data: { proxies: ProxyConfig[] }) => void): (() => void) => {
    const handler = (_event: any, data: { proxies: ProxyConfig[] }) => callback(data)
    ipcRenderer.on('proxy:harvested-updated', handler)
    return () => ipcRenderer.removeListener('proxy:harvested-updated', handler)
  },
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
  benchmarkProxies: (proxies?: ProxyConfig[]): Promise<Array<ProxyConfig & { pingMs: number }>> =>
    ipcRenderer.invoke('proxy:benchmark-proxies', { proxies }),
  rotateAccountProxy: (accountId: string): Promise<ProxyConfig | null> =>
    ipcRenderer.invoke('proxy:rotate-account-proxy', { accountId }),
  parseProxyUrl: (url: string): Promise<ProxyConfig | null> =>
    ipcRenderer.invoke('proxy:parse-url', { url }),
  toShareableProxyUrl: (proxy: ProxyConfig): Promise<string> =>
    ipcRenderer.invoke('proxy:to-shareable-url', { proxy }),
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
