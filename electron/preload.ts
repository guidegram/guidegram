import { contextBridge, ipcRenderer, webUtils } from 'electron'
import {
  ProxyConfig,
  ForwardOptions,
  AppConfig,
  QrTokenPayload,
  AccountInfo,
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
  CacheStats,
  MyFullProfile,
  PrivacySecuritySettings,
  AutoHarvestStatus,
  WarpStatus,
  SharedMediaFilterType,
  SharedMediaResponse,
  DraftItem,
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
  completePhoneAuth: (phone: string, code: string, password?: string) =>
    ipcRenderer.invoke('telegram:complete-phone-auth', { phone, code, password }),
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
  getDialogs: (
    accountId: string,
    limit?: number,
    offsetDate?: number,
    offsetId?: number
  ): Promise<DialogItem[]> =>
    ipcRenderer.invoke('telegram:get-dialogs', { accountId, limit, offsetDate, offsetId }),
  getContacts: (accountId: string): Promise<ContactItem[]> =>
    ipcRenderer.invoke('telegram:get-contacts', { accountId }),
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
  getSavedStarGifts: (accountId: string, userId?: string): Promise<StarGiftItem[]> =>
    ipcRenderer.invoke('telegram:get-star-gifts', { accountId, userId }),

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
  getPeerStories: (accountId: string, peerId: string): Promise<PeerStoriesPayload | null> =>
    ipcRenderer.invoke('telegram:get-peer-stories', { accountId, peerId }),
  readStories: (accountId: string, peerId: string, maxId: number): Promise<boolean> =>
    ipcRenderer.invoke('telegram:read-stories', { accountId, peerId, maxId }),
  getChannelBoostStatus: (accountId: string, channelId: string): Promise<ChannelBoostStatus | null> =>
    ipcRenderer.invoke('telegram:get-channel-boosts', { accountId, channelId }),
  getTwoFactorStatus: (accountId: string): Promise<TwoFactorStatus | null> =>
    ipcRenderer.invoke('telegram:get-two-factor-status', { accountId }),
  getMyFullProfile: (accountId: string): Promise<MyFullProfile | null> =>
    ipcRenderer.invoke('telegram:get-my-full-profile', { accountId }),
  getPrivacySettings: (accountId: string): Promise<PrivacySecuritySettings> =>
    ipcRenderer.invoke('telegram:get-privacy-settings', { accountId }),
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
