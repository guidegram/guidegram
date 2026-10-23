import { contextBridge, ipcRenderer, webUtils } from 'electron'
import {
  ProxyConfig,
  ForwardOptions,
  AppConfig,
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
  copyToClipboard: (text: string): Promise<boolean> =>
    ipcRenderer.invoke('system:copy-to-clipboard', { text }),
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
  getProfilePhoto: (accountId: string, peerId: string, isBig?: boolean): Promise<string | null> =>
    ipcRenderer.invoke('telegram:get-profile-photo', { accountId, peerId, isBig }),
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
  updateChatSettings: (
    accountId: string,
    chatId: string,
    settings: ChatSettingsInput
  ): Promise<ChatSettingsUpdateResult> =>
    ipcRenderer.invoke('telegram:update-chat-settings', { accountId, chatId, settings }),
  resolvePeer: (accountId: string, target: string): Promise<any> =>
    ipcRenderer.invoke('telegram:resolve-peer', { accountId, target }),
  toggleChatNotifications: (accountId: string, chatId: string, mute: boolean): Promise<boolean> =>
    ipcRenderer.invoke('telegram:toggle-chat-notifications', { accountId, chatId, mute }),
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke('system:open-external', { url }),
  getLinkPreview: (url: string): Promise<WebPagePreview | null> =>
    ipcRenderer.invoke('web:get-link-preview', { url }),

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
  createForumTopic: (accountId: string, chatId: string, title: string): Promise<ForumTopicCreateResult> =>
    ipcRenderer.invoke('telegram:create-forum-topic', { accountId, chatId, title }),
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
  sendReaction: (accountId: string, chatId: string, messageId: number, reactionEmoji: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:send-reaction', { accountId, chatId, messageId, reactionEmoji }),
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
  saveDraft: (
    accountId: string,
    chatId: string,
    message: string,
    replyToMsgId?: number
  ): Promise<boolean> =>
    ipcRenderer.invoke('telegram:save-draft', { accountId, chatId, message, replyToMsgId }),
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
  getBotInfo: (accountId: string, botPeerId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-bot-info', { accountId, botPeerId }),
  getBotMenuButton: (accountId: string, botPeerId: string): Promise<any> =>
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
  getCallConfig: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-call-config', { accountId }),
  requestCall: (accountId: string, userId: string, isVideo = false): Promise<any> =>
    ipcRenderer.invoke('telegram:request-call', { accountId, userId, isVideo }),
  acceptCall: (accountId: string, callId: string, accessHash: string, gBHex?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:accept-call', { accountId, callId, accessHash, gBHex }),
  confirmCall: (
    accountId: string,
    callId: string,
    accessHash: string,
    gAHex?: string,
    keyFingerprint?: string
  ): Promise<any> =>
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
  getDhConfig: (accountId: string, version = 0, randomLength = 256): Promise<any> =>
    ipcRenderer.invoke('telegram:get-dh-config', { accountId, version, randomLength }),
  requestEncryption: (accountId: string, userId: string, gAHex?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:request-encryption', { accountId, userId, gAHex }),
  acceptEncryption: (
    accountId: string,
    chatId: number,
    accessHash: string,
    gBHex?: string,
    keyFingerprint?: string
  ): Promise<any> =>
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
  ): Promise<any> =>
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
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:send-encrypted-service', {
      accountId,
      chatId,
      accessHash,
      dataHex,
    }),

  // Telegram Ad Platform & Sponsored Messages
  getSponsoredMessages: (accountId: string, peerId: string, msgId?: number): Promise<any> =>
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
  ): Promise<any> =>
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
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-collectible-info', { accountId, query, type }),

  // TON Center & Blockchain API
  performTonApiRequest: (
    accountId: string,
    endpoint: string,
    isPost = false,
    query?: string,
    payload?: string
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:perform-ton-api-request', {
      accountId,
      endpoint,
      isPost,
      query,
      payload,
    }),
  getTonStreamingUrl: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-ton-streaming-url', { accountId }),

  // Onramp Payments API
  getOnrampProviders: (accountId: string, cryptoCurrency?: string): Promise<any> =>
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
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-onramp-availability', { accountId, provider, cryptoCurrency, baseCurrency }),
  getOnrampLimits: (
    accountId: string,
    provider: string,
    cryptoCurrency: string,
    baseCurrency: string,
    paymentMethod?: string
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-onramp-limits', { accountId, provider, cryptoCurrency, baseCurrency, paymentMethod }),
  getOnrampQuote: (
    accountId: string,
    provider: string,
    cryptoCurrency: string,
    baseCurrency: string,
    baseAmount?: string,
    cryptoAmount?: string,
    paymentMethod?: string
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-onramp-quote', { accountId, provider, cryptoCurrency, baseCurrency, baseAmount, cryptoAmount, paymentMethod }),
  createOnrampSession: (
    accountId: string,
    provider: string,
    cryptoCurrency: string,
    address: string,
    options?: any
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:create-onramp-session', { accountId, provider, cryptoCurrency, address, options }),

  // Telegram Wallet & TonConnect API
  getWalletState: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-wallet-state', { accountId }),
  getWalletUserAddresses: (
    accountId: string,
    userIds: string[],
    addresses: string[],
    force = false
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-wallet-user-addresses', { accountId, userIds, addresses, force }),
  getWalletTransactions: (
    accountId: string,
    offset = '',
    limit = 50,
    inbound = true,
    outbound = true
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-wallet-transactions', { accountId, offset, limit, inbound, outbound }),
  getWalletNfts: (accountId: string, offset = '', limit = 50): Promise<any> =>
    ipcRenderer.invoke('telegram:get-wallet-nfts', { accountId, offset, limit }),
  getTonConnectSessions: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-ton-connect-sessions', { accountId }),
  createTonConnectSession: (accountId: string, dappClientId: string, manifestUrl: string): Promise<any> =>
    ipcRenderer.invoke('telegram:create-ton-connect-session', { accountId, dappClientId, manifestUrl }),
  closeTonConnectSession: (accountId: string, sessionId: string | number, bodyHex?: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:close-ton-connect-session', { accountId, sessionId, bodyHex }),

  // Telegram Passport & Secure Documents API
  getPassportConfig: (accountId: string, hash = 0): Promise<any> =>
    ipcRenderer.invoke('telegram:get-passport-config', { accountId, hash }),
  getAllSecureValues: (accountId: string): Promise<any[]> =>
    ipcRenderer.invoke('telegram:get-all-secure-values', { accountId }),
  getSecureValue: (accountId: string, types: any[]): Promise<any[]> =>
    ipcRenderer.invoke('telegram:get-secure-value', { accountId, types }),
  saveSecureValue: (accountId: string, value: any, secureSecretId: string | number): Promise<any> =>
    ipcRenderer.invoke('telegram:save-secure-value', { accountId, value, secureSecretId }),
  deleteSecureValue: (accountId: string, types: any[]): Promise<boolean> =>
    ipcRenderer.invoke('telegram:delete-secure-value', { accountId, types }),

  // Sticker Creation API
  createStickerSet: (
    accountId: string,
    title: string,
    shortName: string,
    stickers: any[],
    options?: any
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:create-sticker-set', { accountId, title, shortName, stickers, options }),
  addStickerToSet: (accountId: string, stickerset: any, sticker: any): Promise<any> =>
    ipcRenderer.invoke('telegram:add-sticker-to-set', { accountId, stickerset, sticker }),

  // Universal MTProto Layer 229+ RPC Dispatcher (100% Coverage Engine)
  invokeMtprotoRpc: (accountId: string, method: string, params: any = {}): Promise<any> =>
    ipcRenderer.invoke('telegram:invoke-mtproto-rpc', { accountId, method, params }),
  getAllMtprotoMethods: (): Promise<readonly string[]> =>
    ipcRenderer.invoke('telegram:get-all-mtproto-methods'),

  // Contacts & Users Domain API (Phase 1)
  getFullUser: (accountId: string, userId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:get-full-user', { accountId, userId }),
  importContacts: (accountId: string, contacts: any[]): Promise<any> =>
    ipcRenderer.invoke('telegram:import-contacts', { accountId, contacts }),
  addContact: (
    accountId: string,
    userId: string,
    firstName: string,
    lastName = '',
    phone = '',
    addPhonePrivacyException = false,
    note?: string
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:add-contact', { accountId, userId, firstName, lastName, phone, addPhonePrivacyException, note }),
  blockPeer: (accountId: string, peerId: string, myStoriesFrom = false): Promise<boolean> =>
    ipcRenderer.invoke('telegram:block-peer', { accountId, peerId, myStoriesFrom }),
  unblockPeer: (accountId: string, peerId: string, myStoriesFrom = false): Promise<boolean> =>
    ipcRenderer.invoke('telegram:unblock-peer', { accountId, peerId, myStoriesFrom }),
  getBlockedPeers: (accountId: string, offset = 0, limit = 50, myStoriesFrom = false): Promise<any> =>
    ipcRenderer.invoke('telegram:get-blocked-peers', { accountId, offset, limit, myStoriesFrom }),
  getTopPeers: (accountId: string, options?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:get-top-peers', { accountId, options }),
  getBirthdays: (accountId: string): Promise<any[]> =>
    ipcRenderer.invoke('telegram:get-birthdays', { accountId }),
  updateContactNote: (accountId: string, userId: string, note: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:update-contact-note', { accountId, userId, note }),
  getRequirementsToContact: (accountId: string, userIds: string[]): Promise<any[]> =>
    ipcRenderer.invoke('telegram:get-requirements-to-contact', { accountId, userIds }),

  // Channels & Supergroups Administration Domain API (Phase 2)
  channelGetParticipants: (accountId: string, channelId: string, filterName = 'recent', offset = 0, limit = 50): Promise<any> =>
    ipcRenderer.invoke('telegram:channel-get-participants', { accountId, channelId, filterName, offset, limit }),
  channelGetAdminLog: (accountId: string, channelId: string, options?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:channel-get-admin-log', { accountId, channelId, options }),
  channelToggleSlowMode: (accountId: string, channelId: string, seconds: number): Promise<any> =>
    ipcRenderer.invoke('telegram:channel-toggle-slow-mode', { accountId, channelId, seconds }),
  channelToggleJoinRequest: (accountId: string, channelId: string, enabled: boolean): Promise<any> =>
    ipcRenderer.invoke('telegram:channel-toggle-join-request', { accountId, channelId, enabled }),
  channelToggleAntiSpam: (accountId: string, channelId: string, enabled: boolean): Promise<any> =>
    ipcRenderer.invoke('telegram:channel-toggle-anti-spam', { accountId, channelId, enabled }),
  channelToggleForum: (accountId: string, channelId: string, enabled: boolean): Promise<any> =>
    ipcRenderer.invoke('telegram:channel-toggle-forum', { accountId, channelId, enabled }),
  channelGetRecommendations: (accountId: string, channelId?: string): Promise<any[]> =>
    ipcRenderer.invoke('telegram:channel-get-recommendations', { accountId, channelId }),
  channelUpdatePaidMessagesPrice: (accountId: string, channelId: string, stars: bigint): Promise<any> =>
    ipcRenderer.invoke('telegram:channel-update-paid-messages-price', { accountId, channelId, stars }),

  // Bots, Games & WebApps Domain API (Phase 3)
  botGetCommands: (accountId: string, scope?: any, langCode = ''): Promise<any[]> =>
    ipcRenderer.invoke('telegram:bot-get-commands', { accountId, scope, langCode }),
  botSetCommands: (accountId: string, commands: any[], scope?: any, langCode = ''): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bot-set-commands', { accountId, commands, scope, langCode }),
  botGetInfo: (accountId: string, botId?: string, langCode = ''): Promise<any> =>
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
  botGetMenuButton: (accountId: string, botId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:bot-get-menu-button', { accountId, botId }),
  botSetMenuButton: (accountId: string, botId: string, button: any): Promise<boolean> =>
    ipcRenderer.invoke('telegram:bot-set-menu-button', { accountId, botId, button }),
  botGetAdminedBots: (accountId: string): Promise<any[]> =>
    ipcRenderer.invoke('telegram:bot-get-admined-bots', { accountId }),
  botGetPopularApps: (accountId: string, offset = '', limit = 50): Promise<any> =>
    ipcRenderer.invoke('telegram:bot-get-popular-apps', { accountId, offset, limit }),
  botGetRecommendations: (accountId: string, botId: string): Promise<any[]> =>
    ipcRenderer.invoke('telegram:bot-get-recommendations', { accountId, botId }),
  botInvokeWebViewCustomMethod: (
    accountId: string,
    botId: string,
    customMethod: string,
    params: any
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:bot-invoke-webview-custom-method', { accountId, botId, customMethod, params }),

  // Payments, Invoices & Telegram Stars Domain API (Phase 4)
  paymentGetPaymentForm: (accountId: string, invoice: any, themeParams?: any): Promise<any> =>
    ipcRenderer.invoke('telegram:payment-get-payment-form', { accountId, invoice, themeParams }),
  paymentGetStarsStatus: (accountId: string, peerId?: string, ton = false): Promise<any> =>
    ipcRenderer.invoke('telegram:payment-get-stars-status', { accountId, peerId, ton }),
  paymentGetStarsTransactions: (accountId: string, peerId?: string, offset = '', limit = 50, options: any = {}): Promise<any> =>
    ipcRenderer.invoke('telegram:payment-get-stars-transactions', { accountId, peerId, offset, limit, options }),
  paymentGetStarsTopupOptions: (accountId: string): Promise<any[]> =>
    ipcRenderer.invoke('telegram:payment-get-stars-topup-options', { accountId }),
  paymentGetStarGifts: (accountId: string, hash = 0): Promise<any> =>
    ipcRenderer.invoke('telegram:payment-get-star-gifts', { accountId, hash }),
  paymentGetSavedStarGifts: (accountId: string, peerId: string, options: any = {}): Promise<any> =>
    ipcRenderer.invoke('telegram:payment-get-saved-star-gifts', { accountId, peerId, options }),
  paymentGetStarsRevenueStats: (accountId: string, peerId: string, dark = false, ton = false): Promise<any> =>
    ipcRenderer.invoke('telegram:payment-get-stars-revenue-stats', { accountId, peerId, dark, ton }),
  paymentGetConnectedStarRefBots: (accountId: string, peerId: string, offsetDate = 0, offsetLink = '', limit = 50): Promise<any> =>
    ipcRenderer.invoke('telegram:payment-get-connected-star-ref-bots', { accountId, peerId, offsetDate, offsetLink, limit }),
  paymentConnectStarRefBot: (accountId: string, peerId: string, botId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:payment-connect-star-ref-bot', { accountId, peerId, botId }),
  paymentSendStarsForm: (accountId: string, formId: bigint, invoice: any): Promise<any> =>
    ipcRenderer.invoke('telegram:payment-send-stars-form', { accountId, formId, invoice }),

  // Security, Authentication & Account Suite Domain API (Phase 5)
  securityGetNotifySettings: (accountId: string, peerId?: string): Promise<any> =>
    ipcRenderer.invoke('telegram:security-get-notify-settings', { accountId, peerId }),
  securityUpdateNotifySettings: (accountId: string, peerId: string, settings: any): Promise<boolean> =>
    ipcRenderer.invoke('telegram:security-update-notify-settings', { accountId, peerId, settings }),
  securityResetNotifySettings: (accountId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:security-reset-notify-settings', { accountId }),
  securityGetAuthorizations: (accountId: string): Promise<any[]> =>
    ipcRenderer.invoke('telegram:security-get-authorizations', { accountId }),
  securityResetAuthorizations: (accountId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:security-reset-authorizations', { accountId }),
  securityGetPassword: (accountId: string): Promise<any> =>
    ipcRenderer.invoke('telegram:security-get-password', { accountId }),
  securityGetPrivacy: (accountId: string, key: any): Promise<any> =>
    ipcRenderer.invoke('telegram:security-get-privacy', { accountId, key }),
  securitySetPrivacy: (accountId: string, key: any, rules: any[]): Promise<any> =>
    ipcRenderer.invoke('telegram:security-set-privacy', { accountId, key, rules }),
  securityGetWallpapers: (accountId: string, hash = 0n): Promise<any> =>
    ipcRenderer.invoke('telegram:security-get-wallpapers', { accountId, hash }),
  securityUpdatePersonalChannel: (accountId: string, channelId: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:security-update-personal-channel', { accountId, channelId }),
  securityUpdateColor: (accountId: string, color?: number, backgroundEmojiId?: bigint, forProfile = false): Promise<boolean> =>
    ipcRenderer.invoke('telegram:security-update-color', { accountId, color, backgroundEmojiId, forProfile }),

  // MTProto Sessions, Cloud Folders & Translation
  getActiveSessions: (accountId: string): Promise<ActiveSessionItem[]> =>
    ipcRenderer.invoke('telegram:get-active-sessions', { accountId }),
  terminateSession: (accountId: string, hash: string): Promise<boolean> =>
    ipcRenderer.invoke('telegram:terminate-session', { accountId, hash }),
  translateMessage: (accountId: string, chatId: string, messageId: number, toLang?: string): Promise<TranslatedTextResult> =>
    ipcRenderer.invoke('telegram:translate-message', { accountId, chatId, messageId, toLang }),
  getCloudFolders: (accountId: string): Promise<CloudFolderItem[]> =>
    ipcRenderer.invoke('telegram:get-cloud-folders', { accountId }),

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
  ): Promise<{ format: 'lottie' | 'image' | 'video'; url?: string; data?: any } | null> =>
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
  ): Promise<any> =>
    ipcRenderer.invoke('telegram:get-story-views-list', { accountId, storyId, options }),
  checkChatlistInvite: (accountId: string, slug: string): Promise<any> =>
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
  ): Promise<any> =>
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

  // Storage & Cache Management
  getCacheStats: (): Promise<CacheStats> =>
    ipcRenderer.invoke('telegram:get-cache-stats'),
  clearCache: (): Promise<{ clearedBytes: number; clearedFiles: number }> =>
    ipcRenderer.invoke('telegram:clear-cache'),
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

  // Events
  on: (channel: string, callback: (...args: any[]) => void) => {
    const subscription = (_event: any, ...args: any[]) => callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => {
      ipcRenderer.removeListener(channel, subscription)
    }
  },
}

export type GuidegramAPI = typeof guidegramAPI

contextBridge.exposeInMainWorld('guidegram', guidegramAPI)
