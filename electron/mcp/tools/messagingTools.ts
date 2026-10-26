import type { AccountManager } from '../../telegram/accountManager'
import type { SendableTypingStatus } from '../../telegram/types'
import type { McpDialogSummary, McpMessageSummary } from '../types'
import { getActiveAccountId, resolveAccountId } from './accountTools.js'
import { Logger } from '../../telegram/logger'

export interface MessagingToolsSecurityConfig {
  allowedChatIds?: string[]
}

function resolveAccount(accountManager: AccountManager, accountId?: string): string {
  return resolveAccountId(accountManager, accountId)
}

function checkChatWhitelist(chatId: string | number, security?: MessagingToolsSecurityConfig): void {
  if (security?.allowedChatIds && security.allowedChatIds.length > 0) {
    const rawId = String(chatId).trim()
    const isAllowed = security.allowedChatIds.some((allowed) => {
      const trimmed = String(allowed).trim()
      return trimmed === rawId || trimmed.replace(/^-100/, '') === rawId.replace(/^-100/, '')
    })
    if (!isAllowed) {
      throw new Error(`Chat ID '${rawId}' is not in the allowed MCP whitelist. Configured allowed chats: ${security.allowedChatIds.join(', ')}`)
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

export async function sendMediaHandler(
  accountManager: AccountManager,
  args: {
    accountId?: string
    chatId: string
    filePath: string
    mediaType?: 'photo' | 'video' | 'document' | 'audio' | 'voice'
    caption?: string
    silent?: boolean
    replyToMsgId?: number
  },
  security?: MessagingToolsSecurityConfig
): Promise<{ success: boolean; messageId?: number; chatId: string; filePath: string; error?: string }> {
  const targetAccountId = resolveAccount(accountManager, args.accountId)
  checkChatWhitelist(args.chatId, security)

  if (!args.filePath || !args.filePath.trim()) {
    throw new Error('filePath argument is required to send media.')
  }

  try {
    const isVoice = args.mediaType === 'voice'
    const forceDocument = args.mediaType === 'document'

    const res = await accountManager.sendMedia(
      targetAccountId,
      args.chatId,
      args.filePath.trim(),
      {
        caption: args.caption,
        isVoice,
        forceDocument,
        silent: args.silent,
        replyToMsgId: args.replyToMsgId,
      }
    )

    return {
      success: true,
      messageId: res?.id,
      chatId: args.chatId,
      filePath: args.filePath,
    }
  } catch (err: any) {
    Logger.error(`[MCP] sendMediaHandler error:`, err)
    return {
      success: false,
      chatId: args.chatId,
      filePath: args.filePath,
      error: formatTelegramError(err),
    }
  }
}

export async function forwardMessagesHandler(
  accountManager: AccountManager,
  args: {
    accountId?: string
    fromChatId: string
    toChatId: string
    messageIds: number[]
    dropAuthor?: boolean
    silent?: boolean
  },
  security?: MessagingToolsSecurityConfig
): Promise<{ success: boolean; fromChatId: string; toChatId: string; count: number; error?: string }> {
  const targetAccountId = resolveAccount(accountManager, args.accountId)
  checkChatWhitelist(args.toChatId, security)

  if (!args.messageIds || args.messageIds.length === 0) {
    throw new Error('messageIds array cannot be empty.')
  }

  try {
    await accountManager.forwardMessages(
      targetAccountId,
      args.fromChatId,
      args.toChatId,
      args.messageIds,
      {
        withoutQuote: args.dropAuthor ?? false,
        silent: args.silent ?? false,
      }
    )

    return {
      success: true,
      fromChatId: args.fromChatId,
      toChatId: args.toChatId,
      count: args.messageIds.length,
    }
  } catch (err: any) {
    Logger.error(`[MCP] forwardMessagesHandler error:`, err)
    return {
      success: false,
      fromChatId: args.fromChatId,
      toChatId: args.toChatId,
      count: 0,
      error: formatTelegramError(err),
    }
  }
}

export async function sendReactionHandler(
  accountManager: AccountManager,
  args: {
    accountId?: string
    chatId: string
    messageId: number
    reaction: string
    big?: boolean
  }
): Promise<{ success: boolean; chatId: string; messageId: number; reaction: string; error?: string }> {
  const targetAccountId = resolveAccount(accountManager, args.accountId)

  if (!args.reaction || !args.reaction.trim()) {
    throw new Error('Reaction emoji or custom emoji ID cannot be empty.')
  }

  try {
    const success = await accountManager.sendReaction(
      targetAccountId,
      args.chatId,
      args.messageId,
      args.reaction.trim(),
      { big: args.big ?? false }
    )

    return {
      success: Boolean(success),
      chatId: args.chatId,
      messageId: args.messageId,
      reaction: args.reaction,
    }
  } catch (err: any) {
    Logger.error(`[MCP] sendReactionHandler error:`, err)
    return {
      success: false,
      chatId: args.chatId,
      messageId: args.messageId,
      reaction: args.reaction,
      error: formatTelegramError(err),
    }
  }
}

export async function manageMessageHandler(
  accountManager: AccountManager,
  args: {
    accountId?: string
    chatId: string
    messageId: number
    action: 'edit' | 'pin' | 'unpin' | 'delete'
    text?: string
    notify?: boolean
    bothSides?: boolean
  },
  security?: MessagingToolsSecurityConfig
): Promise<{ success: boolean; chatId: string; messageId: number; action: string; error?: string }> {
  const targetAccountId = resolveAccount(accountManager, args.accountId)
  checkChatWhitelist(args.chatId, security)

  try {
    switch (args.action) {
      case 'edit': {
        if (!args.text || !args.text.trim()) {
          throw new Error('text is required for edit action.')
        }
        await accountManager.editMessage(targetAccountId, args.chatId, args.messageId, args.text)
        return { success: true, chatId: args.chatId, messageId: args.messageId, action: 'edit' }
      }
      case 'pin': {
        await accountManager.pinMessage(
          targetAccountId,
          args.chatId,
          args.messageId,
          args.notify ?? true,
          args.bothSides ?? false
        )
        return { success: true, chatId: args.chatId, messageId: args.messageId, action: 'pin' }
      }
      case 'unpin': {
        await accountManager.unpinMessage(targetAccountId, args.chatId, args.messageId)
        return { success: true, chatId: args.chatId, messageId: args.messageId, action: 'unpin' }
      }
      case 'delete': {
        await accountManager.deleteMessages(targetAccountId, args.chatId, [args.messageId], args.bothSides ?? true)
        return { success: true, chatId: args.chatId, messageId: args.messageId, action: 'delete' }
      }
      default:
        throw new Error(`Unsupported action '${args.action}'. Must be 'edit', 'pin', 'unpin', or 'delete'.`)
    }
  } catch (err: any) {
    Logger.error(`[MCP] manageMessageHandler error:`, err)
    return {
      success: false,
      chatId: args.chatId,
      messageId: args.messageId,
      action: args.action,
      error: formatTelegramError(err),
    }
  }
}

export async function createPollHandler(
  accountManager: AccountManager,
  args: {
    accountId?: string
    chatId: string
    question: string
    options: string[]
    isQuiz?: boolean
    correctOptionId?: number
    multipleChoice?: boolean
    isAnonymous?: boolean
  },
  security?: MessagingToolsSecurityConfig
): Promise<{ success: boolean; chatId: string; question: string; error?: string }> {
  const targetAccountId = resolveAccount(accountManager, args.accountId)
  checkChatWhitelist(args.chatId, security)

  if (!args.question?.trim()) {
    throw new Error('question cannot be empty.')
  }
  if (!args.options || args.options.length < 2) {
    throw new Error('A poll requires at least 2 options.')
  }

  try {
    const success = await accountManager.createPoll(
      targetAccountId,
      args.chatId,
      args.question.trim(),
      args.options.map((o) => o.trim()),
      {
        quiz: args.isQuiz ?? false,
        correctOptionIndex: args.correctOptionId,
        multipleChoice: args.multipleChoice ?? false,
        anonymous: args.isAnonymous ?? true,
      }
    )

    return {
      success: Boolean(success),
      chatId: args.chatId,
      question: args.question,
    }
  } catch (err: any) {
    Logger.error(`[MCP] createPollHandler error:`, err)
    return {
      success: false,
      chatId: args.chatId,
      question: args.question,
      error: formatTelegramError(err),
    }
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
  {
    name: 'telegram_send_media',
    description: 'Sends a photo, video, document, voice message, or audio file from local disk to a Telegram chat with optional caption.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Optional Telegram account ID.',
        },
        chatId: {
          type: 'string',
          description: 'Target chat or channel ID.',
        },
        filePath: {
          type: 'string',
          description: 'Absolute local file path to the media file to upload.',
        },
        mediaType: {
          type: 'string',
          enum: ['photo', 'video', 'document', 'audio', 'voice'],
          description: 'Optional media type override.',
        },
        caption: {
          type: 'string',
          description: 'Optional text caption for the media.',
        },
        silent: {
          type: 'boolean',
          description: 'Send silently without sound.',
        },
        replyToMsgId: {
          type: 'number',
          description: 'Optional message ID to reply to.',
        },
      },
      required: ['chatId', 'filePath'],
    },
  },
  {
    name: 'telegram_forward_messages',
    description: 'Forwards one or more messages from one chat to another, with option to hide author (dropAuthor).',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Optional Telegram account ID.',
        },
        fromChatId: {
          type: 'string',
          description: 'Source chat ID where messages currently reside.',
        },
        toChatId: {
          type: 'string',
          description: 'Destination chat ID to forward messages to.',
        },
        messageIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'List of message IDs to forward.',
        },
        dropAuthor: {
          type: 'boolean',
          description: 'If true, forwards without the "Forwarded from" header.',
        },
        silent: {
          type: 'boolean',
          description: 'Send silently without notification sound.',
        },
      },
      required: ['fromChatId', 'toChatId', 'messageIds'],
    },
  },
  {
    name: 'telegram_send_reaction',
    description: 'Sends an emoji or custom emoji reaction to a specific message in a chat or channel.',
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
        messageId: {
          type: 'number',
          description: 'Target message ID to react to.',
        },
        reaction: {
          type: 'string',
          description: 'Emoji reaction (e.g. "👍", "❤️", "🔥") or custom emoji ID.',
        },
        big: {
          type: 'boolean',
          description: 'Send with large animated reaction effect.',
        },
      },
      required: ['chatId', 'messageId', 'reaction'],
    },
  },
  {
    name: 'telegram_manage_message',
    description: 'Performs administrative message actions: edit text, pin message, unpin message, or delete message.',
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
        messageId: {
          type: 'number',
          description: 'Target message ID.',
        },
        action: {
          type: 'string',
          enum: ['edit', 'pin', 'unpin', 'delete'],
          description: 'Action to perform on the message.',
        },
        text: {
          type: 'string',
          description: 'New text for the message (required when action is "edit").',
        },
        notify: {
          type: 'boolean',
          description: 'Notify chat members (for "pin" action, default true).',
        },
        bothSides: {
          type: 'boolean',
          description: 'Pin or delete for both sides in private chats (default true).',
        },
      },
      required: ['chatId', 'messageId', 'action'],
    },
  },
  {
    name: 'telegram_create_poll',
    description: 'Creates a poll or educational quiz in a Telegram group or channel.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Optional Telegram account ID.',
        },
        chatId: {
          type: 'string',
          description: 'Target chat or channel ID.',
        },
        question: {
          type: 'string',
          description: 'Poll question text.',
        },
        options: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of answer options (minimum 2 options).',
        },
        isQuiz: {
          type: 'boolean',
          description: 'True if this is a quiz with a correct answer.',
        },
        correctOptionId: {
          type: 'number',
          description: 'Zero-based index of the correct option for quiz mode.',
        },
        multipleChoice: {
          type: 'boolean',
          description: 'Allow multiple answer options (regular polls only).',
        },
        isAnonymous: {
          type: 'boolean',
          description: 'Whether votes are anonymous (default true).',
        },
      },
      required: ['chatId', 'question', 'options'],
    },
  },
]
