import type { AccountManager } from '../../telegram/accountManager'
import type { SendableTypingStatus } from '../../telegram/types'
import type { McpDialogSummary, McpMessageSummary } from '../types'
import { getActiveAccountId } from './accountTools.js'
import { Logger } from '../../telegram/logger'

export interface MessagingToolsSecurityConfig {
  allowedChatIds?: string[]
}

function resolveAccount(accountManager: AccountManager, accountId?: string): string {
  const targetId = accountId || getActiveAccountId(accountManager)
  if (!targetId) {
    throw new Error('No Telegram account connected or selected. Use telegram_list_accounts to view available accounts.')
  }
  return targetId
}

function checkChatWhitelist(chatId: string, security?: MessagingToolsSecurityConfig): void {
  if (security?.allowedChatIds && security.allowedChatIds.length > 0) {
    const isAllowed = security.allowedChatIds.some((allowed) => allowed === chatId || allowed.replace(/^-100/, '') === chatId.replace(/^-100/, ''))
    if (!isAllowed) {
      throw new Error(`Chat ID '${chatId}' is not in the allowed MCP whitelist. Configured allowed chats: ${security.allowedChatIds.join(', ')}`)
    }
  }
}

function formatTelegramError(err: any): string {
  if (!err) return 'Unknown error'
  const msg = String(err.message || err)
  if (msg.includes('FLOOD_WAIT_') || msg.includes('FloodWait')) {
    const seconds = msg.match(/\d+/)?.[0] || 'several'
    return `Telegram rate limit hit: FLOOD_WAIT_${seconds}. Telegram requires waiting ${seconds} seconds before repeating this action.`
  }
  if (msg.includes('PEER_ID_INVALID') || msg.includes('CHANNEL_INVALID')) {
    return `Telegram error: Invalid chat or peer ID (${msg}). Make sure the bot or user has interacted with or joined this chat.`
  }
  if (msg.includes('USER_BANNED_IN_CHANNEL') || msg.includes('CHAT_WRITE_FORBIDDEN')) {
    return `Telegram permission error: Sending messages is forbidden or restricted in this chat (${msg}).`
  }
  return msg
}

export async function getDialogsHandler(
  accountManager: AccountManager,
  args: {
    accountId?: string
    limit?: number
    filter?: 'all' | 'unread' | 'users' | 'groups' | 'channels'
    search?: string
  }
): Promise<{ dialogs: McpDialogSummary[]; totalCount: number; accountId: string }> {
  const targetAccountId = resolveAccount(accountManager, args.accountId)
  const limit = Math.min(Math.max(args.limit || 30, 1), 100)

  let dialogs: any[] = []
  try {
    dialogs = await accountManager.getDialogs(targetAccountId, limit)
  } catch (err) {
    Logger.warn(`[MCP] getDialogs live fetch failed for ${targetAccountId}, falling back to cache:`, err)
    dialogs = accountManager.getCachedDialogs(targetAccountId)
  }

  if (!dialogs || dialogs.length === 0) {
    dialogs = accountManager.getCachedDialogs(targetAccountId) || []
  }

  // Filter
  let filtered = dialogs
  if (args.filter === 'unread') {
    filtered = filtered.filter((d) => (d.unreadCount || 0) > 0)
  } else if (args.filter === 'users') {
    filtered = filtered.filter((d) => d.isUser)
  } else if (args.filter === 'groups') {
    filtered = filtered.filter((d) => d.isGroup)
  } else if (args.filter === 'channels') {
    filtered = filtered.filter((d) => d.isChannel)
  }

  if (args.search?.trim()) {
    const q = args.search.trim().toLowerCase()
    filtered = filtered.filter(
      (d) =>
        d.title?.toLowerCase().includes(q) ||
        d.username?.toLowerCase().includes(q) ||
        d.id?.includes(q)
    )
  }

  const summaries: McpDialogSummary[] = filtered.slice(0, limit).map((d) => ({
    chatId: d.id,
    title: d.title || 'Unknown Chat',
    unreadCount: d.unreadCount || 0,
    isUser: !!d.isUser,
    isGroup: !!d.isGroup,
    isChannel: !!d.isChannel,
    isBot: !!d.isBot,
    isMuted: !!d.isMuted,
    lastMessageText: d.lastMessageText || '',
    lastMessageDate: d.lastMessageDate,
    lastMessageId: d.lastMessageId,
    lastMessageIsOutgoing: d.lastMessageIsOutgoing,
    username: d.username,
  }))

  return {
    dialogs: summaries,
    totalCount: summaries.length,
    accountId: targetAccountId,
  }
}

export async function getChatHistoryHandler(
  accountManager: AccountManager,
  args: {
    accountId?: string
    chatId: string
    limit?: number
    offsetId?: number
  }
): Promise<{ messages: McpMessageSummary[]; chatId: string; accountId: string }> {
  const targetAccountId = resolveAccount(accountManager, args.accountId)
  const limit = Math.min(Math.max(args.limit || 20, 1), 100)

  try {
    const rawMessages = await accountManager.getMessages(targetAccountId, args.chatId, limit, args.offsetId)
    const summaries: McpMessageSummary[] = (rawMessages || []).map((m: any) => ({
      id: m.id,
      chatId: args.chatId,
      senderId: m.senderId || (m.from ? String(m.from) : undefined),
      senderName: m.senderName || (m.isOutgoing ? 'You' : undefined),
      text: m.text || '',
      date: m.date || 0,
      isOutgoing: !!m.isOutgoing,
      mediaType: m.mediaType,
      mediaFileName: m.mediaFileName,
      mediaFileSize: m.mediaFileSize,
      replyToMsgId: m.replyToMsgId,
    }))

    return {
      messages: summaries,
      chatId: args.chatId,
      accountId: targetAccountId,
    }
  } catch (err: any) {
    throw new Error(`Failed to get chat history for ${args.chatId}: ${formatTelegramError(err)}`)
  }
}

export async function sendTypingHandler(
  accountManager: AccountManager,
  args: {
    accountId?: string
    chatId: string
    status?: string
  }
): Promise<{ success: boolean; chatId: string; status: string }> {
  const targetAccountId = resolveAccount(accountManager, args.accountId)
  const status = args.status || 'typing'

  try {
    await accountManager.sendTyping(targetAccountId, args.chatId, status as SendableTypingStatus)
    return { success: true, chatId: args.chatId, status }
  } catch (err: any) {
    Logger.warn(`[MCP] sendTyping warning for chat ${args.chatId}:`, err)
    return { success: false, chatId: args.chatId, status }
  }
}

export async function sendMessageHandler(
  accountManager: AccountManager,
  args: {
    accountId?: string
    chatId: string
    text: string
    replyToMsgId?: number
  },
  security?: MessagingToolsSecurityConfig
): Promise<{ success: boolean; messageId?: number; chatId: string; date?: number; text: string; error?: string }> {
  const targetAccountId = resolveAccount(accountManager, args.accountId)

  if (!args.text || !args.text.trim()) {
    throw new Error('Message text cannot be empty.')
  }

  checkChatWhitelist(args.chatId, security)

  try {
    const res: any = await accountManager.sendMessage(
      targetAccountId,
      args.chatId,
      args.text,
      args.replyToMsgId
    )

    return {
      success: true,
      messageId: res?.id || res?.messageId,
      chatId: args.chatId,
      date: res?.date || Math.floor(Date.now() / 1000),
      text: args.text,
    }
  } catch (err: any) {
    const errorMsg = formatTelegramError(err)
    Logger.error(`[MCP] sendMessage failed to ${args.chatId}:`, err)
    return {
      success: false,
      chatId: args.chatId,
      text: args.text,
      error: errorMsg,
    }
  }
}

export async function markAsReadHandler(
  accountManager: AccountManager,
  args: {
    accountId?: string
    chatId: string
    maxId?: number
  }
): Promise<{ success: boolean; chatId: string; maxId?: number }> {
  const targetAccountId = resolveAccount(accountManager, args.accountId)

  try {
    await accountManager.markAsRead(targetAccountId, args.chatId, args.maxId)
    return { success: true, chatId: args.chatId, maxId: args.maxId }
  } catch (err: any) {
    Logger.warn(`[MCP] markAsRead warning for ${args.chatId}:`, err)
    return { success: false, chatId: args.chatId, maxId: args.maxId }
  }
}

export const messagingToolsDefinitions = [
  {
    name: 'telegram_get_dialogs',
    description: 'Retrieves the list of dialogs/chats for the active or specified Telegram account. Supports filtering by unread messages, chat type (users, groups, channels), or keyword search.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Optional Telegram account ID. If omitted, uses the currently active account.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of chats to return (default: 30, max: 100).',
        },
        filter: {
          type: 'string',
          enum: ['all', 'unread', 'users', 'groups', 'channels'],
          description: 'Filter chats: "unread" for chats with unread messages, "users" for direct chats with customers, "groups" for group chats, "channels" for broadcasts.',
        },
        search: {
          type: 'string',
          description: 'Optional search keyword to match against chat titles or usernames.',
        },
      },
      required: [],
    },
  },
  {
    name: 'telegram_get_chat_history',
    description: 'Fetches recent messages from a specific Telegram chat, including customer text, timestamps, sender details, and attached media metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Optional Telegram account ID. If omitted, uses active account.',
        },
        chatId: {
          type: 'string',
          description: 'The Telegram chat/user/channel ID (e.g. "12345678" or "-1001234567890").',
        },
        limit: {
          type: 'number',
          description: 'Number of recent messages to fetch (default: 20, max: 100).',
        },
        offsetId: {
          type: 'number',
          description: 'Optional message ID to paginate from.',
        },
      },
      required: ['chatId'],
    },
  },
  {
    name: 'telegram_send_typing',
    description: 'Displays a "typing..." or other action status in the specified chat before sending a reply, providing a natural customer experience.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Optional Telegram account ID.',
        },
        chatId: {
          type: 'string',
          description: 'The target chat/user ID.',
        },
        status: {
          type: 'string',
          enum: ['typing', 'upload_photo', 'record_video', 'upload_video', 'record_audio', 'upload_audio', 'upload_document', 'choose_sticker', 'cancel'],
          description: 'The action status to send (default: "typing").',
        },
      },
      required: ['chatId'],
    },
  },
  {
    name: 'telegram_send_message',
    description: 'Sends a text message or customer reply to a Telegram chat, user, or channel. Supports Markdown formatting and replying to a specific message ID.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Optional Telegram account ID. If omitted, uses active account.',
        },
        chatId: {
          type: 'string',
          description: 'Target chat ID or user ID to send the message to.',
        },
        text: {
          type: 'string',
          description: 'The text message content. Markdown syntax (bold, italic, links, code blocks) is supported.',
        },
        replyToMsgId: {
          type: 'number',
          description: 'Optional message ID to reply to directly.',
        },
      },
      required: ['chatId', 'text'],
    },
  },
  {
    name: 'telegram_mark_as_read',
    description: 'Marks incoming messages in a chat as read up to a specified message ID (or all unread messages).',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Optional Telegram account ID.',
        },
        chatId: {
          type: 'string',
          description: 'Target chat ID.',
        },
        maxId: {
          type: 'number',
          description: 'Optional maximum message ID to mark as read. If omitted, marks the entire chat as read.',
        },
      },
      required: ['chatId'],
    },
  },
]
