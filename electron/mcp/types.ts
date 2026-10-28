/**
 * Types and interfaces for Guidegram MCP (Model Context Protocol) Server
 */

export interface McpServerConfig {
  enabled: boolean
  port: number
  token?: string
  allowedChatIds?: string[]
  defaultDownloadDir?: string
  autoStartWithApp?: boolean
}

export interface McpAccountSummary {
  id: string
  phone: string
  firstName: string
  lastName?: string
  username?: string
  status: string
  unreadTotal: number
  isPremium?: boolean
  isBot?: boolean
  isActive: boolean
}

export interface McpDialogSummary {
  chatId: string
  title: string
  unreadCount: number
  isUser: boolean
  isGroup: boolean
  isChannel: boolean
  isBot: boolean
  isMuted?: boolean
  lastMessageText?: string
  lastMessageDate?: number
  lastMessageId?: number
  lastMessageIsOutgoing?: boolean
  username?: string
}

export interface McpMessageSummary {
  id: number
  chatId: string
  senderId?: string
  senderName?: string
  text?: string
  date: number
  isOutgoing: boolean
  mediaType?: string
  mediaFileName?: string
  mediaFileSize?: number
  replyToMsgId?: number
}

export interface McpPeerDetails {
  id: string
  title: string
  type: 'user' | 'group' | 'channel' | 'unknown'
  username?: string
  accessHash?: string
  membersCount?: number
  about?: string
}

export interface McpSharedMediaSummary {
  messageId: number
  mediaType: string
  mediaFileName?: string
  mediaFileSize?: number
  date: number
  senderName?: string
  caption?: string
}

export interface McpDownloadResult {
  success: boolean
  messageId: number
  chatId: string
  filePath: string
  fileSize: number
  fileName: string
  mediaType?: string
  error?: string
}

export type McpEventType = 'new_message' | 'typing' | 'message_edited' | 'reaction' | 'all' | string

export interface McpLiveEvent {
  id: number
  timestamp: number
  type: string
  rawEvent: string
  accountId: string
  chatId: string
  payload: any
  message?: any
  isBurstMerged?: boolean
  mergedCount?: number
  mergedText?: string
}

export interface McpWatcherFilter {
  chatIds?: string[]
  keywords?: string[]
  regex?: string
  mediaTypes?: string[]
  extensions?: string[]
}

export interface McpWatcherCapturedItem {
  cursor: number
  event: McpLiveEvent
  downloadedPath?: string
  capturedAt: number
}

export interface McpWatcher {
  id: string
  name: string
  createdAt: number
  expiresAt: number
  durationSeconds: number
  filter: McpWatcherFilter
  action: 'buffer' | 'auto_download'
  downloadDir?: string
  status: 'active' | 'expired' | 'stopped'
  buffer: McpWatcherCapturedItem[]
  cursorCounter: number
  totalCaptured: number
}

export interface McpWatcherSummary {
  watcherId: string
  name: string
  status: 'active' | 'expired' | 'stopped'
  durationSeconds: number
  createdAt?: number
  expiresAt: number
  totalCaptured?: number
  filter?: McpWatcherFilter
  action?: 'buffer' | 'auto_download'
  bufferSize?: number
}

export interface McpWatcherFeedResult {
  watcherId: string
  items: McpWatcherCapturedItem[]
  totalCaptured: number
  isActive: boolean
  expiresAt: number
}

export interface McpWaiterOptions {
  chatId?: string
  accountId?: string
  eventTypes?: string[]
  timeoutSeconds?: number
  indicateTyping?: boolean
  sinceEventId?: number
  debounceBurstMs?: number
}

