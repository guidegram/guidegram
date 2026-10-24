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
