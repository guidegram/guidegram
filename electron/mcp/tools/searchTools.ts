import type { AccountManager } from '../../telegram/accountManager'
import type { McpDialogSummary, McpMessageSummary } from '../types'
import { resolveAccountId } from './accountTools.js'
import { normalizePersian, fuzzyTokenMatch } from '../utils/persianNormalizer.js'
import { Logger } from '../../telegram/logger'
import { Long } from '@mtcute/core'

export interface ContactSearchResult {
  userId: string
  firstName: string
  lastName?: string
  username?: string
  phone?: string
  matchScore?: number
}

function resolveAccount(accountManager: AccountManager, accountId?: string): string {
  return resolveAccountId(accountManager, accountId)
}

/**
 * Searches messages either globally across all chats or within a specific chat.
 * Integrates Persian normalization and MTProto filters.
 */
export async function searchMessagesHandler(
  accountManager: AccountManager,
  args: {
    accountId?: string
    query: string
    chatId?: string
    filterType?: 'all' | 'media' | 'files' | 'links' | 'audio' | 'voice' | 'pinned'
    minDate?: number
    maxDate?: number
    limit?: number
    offsetId?: number
  }
): Promise<{ messages: McpMessageSummary[]; totalCount: number; accountId: string; query: string }> {
  const targetAccountId = resolveAccount(accountManager, args.accountId)
  const query = (args.query || '').trim()
  const limit = Math.min(Math.max(args.limit || 30, 1), 100)

  if (!query && !args.chatId) {
    throw new Error('Search query is required for global message search.')
  }

  const holder = accountManager.getClientHolder(targetAccountId)
  if (!holder?.client) {
    throw new Error(`Telegram account ${targetAccountId} is not connected.`)
  }

  const summaries: McpMessageSummary[] = []

  try {
    if (args.chatId) {
      // Chat-scoped search (messages.search)
      const inputPeer = await accountManager.resolveInputPeer(targetAccountId, args.chatId)

      let mtFilter: any = { _: 'inputMessagesFilterEmpty' }
      const fType = args.filterType?.toLowerCase()
      if (fType === 'media') mtFilter = { _: 'inputMessagesFilterPhotoVideo' }
      else if (fType === 'files') mtFilter = { _: 'inputMessagesFilterDocument' }
      else if (fType === 'links') mtFilter = { _: 'inputMessagesFilterUrl' }
      else if (fType === 'audio') mtFilter = { _: 'inputMessagesFilterMusic' }
      else if (fType === 'voice') mtFilter = { _: 'inputMessagesFilterRoundVoice' }
      else if (fType === 'pinned') mtFilter = { _: 'inputMessagesFilterPinned' }

      const res: any = await holder.client.call({
        _: 'messages.search',
        peer: inputPeer,
        q: query,
        filter: mtFilter,
        minDate: args.minDate || 0,
        maxDate: args.maxDate || 0,
        offsetId: args.offsetId || 0,
        addOffset: 0,
        limit,
        maxId: 0,
        minId: 0,
        hash: Long.ZERO,
      } as any)

      const rawList = Array.isArray(res?.messages) ? res.messages : []
      for (const m of rawList) {
        if (!m || m._ === 'messageEmpty') continue
        summaries.push({
          id: m.id,
          chatId: String(args.chatId),
          senderId: m.fromId ? String(m.fromId.userId || m.fromId.channelId || m.fromId) : undefined,
          senderName: m.out ? 'You' : undefined,
          text: m.message || '',
          date: m.date || 0,
          isOutgoing: Boolean(m.out),
          mediaType: m.media?._,
          replyToMsgId: m.replyTo?.replyToMsgId,
        })
      }
    } else {
      // Global search (messages.searchGlobal via accountManager.searchGlobal)
      const results = await accountManager.searchGlobal(
        targetAccountId,
        query,
        args.filterType || 'all',
        limit,
        args.minDate || 0,
        args.maxDate || 0
      )

      for (const m of results) {
        summaries.push({
          id: m.id,
          chatId: m.chatId,
          senderId: m.senderId ? String(m.senderId) : undefined,
          senderName: m.isOutgoing ? 'You' : m.senderName,
          text: m.text || '',
          date: m.date || 0,
          isOutgoing: Boolean(m.isOutgoing),
          mediaType: m.mediaType,
          mediaFileName: m.mediaFileName,
          mediaFileSize: m.mediaFileSize,
          replyToMsgId: m.replyToMsgId,
        })
      }
    }

    // Sort by relevance if Persian query: items with exact fuzzy match ranked higher
    if (query) {
      summaries.sort((a, b) => {
        const scoreA = fuzzyTokenMatch(query, a.text || '').score
        const scoreB = fuzzyTokenMatch(query, b.text || '').score
        return scoreB - scoreA
      })
    }

    return {
      messages: summaries.slice(0, limit),
      totalCount: summaries.length,
      accountId: targetAccountId,
      query,
    }
  } catch (err: any) {
    Logger.error(`[MCP] searchMessagesHandler error:`, err)
    throw new Error(`Message search failed: ${err?.message || err}`)
  }
}

/**
 * Searches contacts using Persian fuzzy matching on first name, last name,
 * username, and phone number, with fallback to MTProto contacts.search.
 */
export async function searchContactsHandler(
  accountManager: AccountManager,
  args: {
    accountId?: string
    query: string
    limit?: number
  }
): Promise<{ contacts: ContactSearchResult[]; totalCount: number; accountId: string; query: string }> {
  const targetAccountId = resolveAccount(accountManager, args.accountId)
  const query = (args.query || '').trim()
  const limit = Math.min(Math.max(args.limit || 30, 1), 100)

  if (!query) {
    throw new Error('Contact search query cannot be empty.')
  }

  const holder = accountManager.getClientHolder(targetAccountId)
  if (!holder?.client) {
    throw new Error(`Telegram account ${targetAccountId} is not connected.`)
  }

  const matches: ContactSearchResult[] = []

  try {
    // 1. Fetch saved contacts
    const contactsRes: any = await accountManager.contactsService.getContacts(holder as any, 0n)
    const rawUsers: any[] = Array.isArray(contactsRes?.users) ? contactsRes.users : []

    for (const u of rawUsers) {
      if (!u || u._ === 'userEmpty') continue

      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim()
      const username = u.username || ''
      const phone = u.phone || ''

      const nameMatch = fuzzyTokenMatch(query, fullName)
      const userMatch = username.toLowerCase().includes(query.toLowerCase().replace(/^@/, ''))
      const phoneMatch = phone.includes(query.replace(/[^\d]/g, ''))

      if (nameMatch.matched || userMatch || phoneMatch) {
        matches.push({
          userId: String(u.id),
          firstName: u.firstName || '',
          lastName: u.lastName || undefined,
          username: u.username || undefined,
          phone: u.phone ? (u.phone.startsWith('+') ? u.phone : `+${u.phone}`) : undefined,
          matchScore: nameMatch.score,
        })
      }
    }

    // 2. If no local contacts matched and query is long enough, fallback to remote contacts.search
    if (matches.length === 0 && query.length >= 3) {
      const searchRes: any = await accountManager.contactsService.search(holder as any, query, limit)
      const remoteUsers: any[] = Array.isArray(searchRes?.users) ? searchRes.users : []

      for (const u of remoteUsers) {
        if (!u || u._ === 'userEmpty') continue
        matches.push({
          userId: String(u.id),
          firstName: u.firstName || '',
          lastName: u.lastName || undefined,
          username: u.username || undefined,
          phone: u.phone ? (u.phone.startsWith('+') ? u.phone : `+${u.phone}`) : undefined,
          matchScore: 0.8,
        })
      }
    }

    // Sort by match score descending
    matches.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))

    return {
      contacts: matches.slice(0, limit),
      totalCount: matches.length,
      accountId: targetAccountId,
      query,
    }
  } catch (err: any) {
    Logger.error(`[MCP] searchContactsHandler error:`, err)
    throw new Error(`Contact search failed: ${err?.message || err}`)
  }
}

/**
 * Searches dialogs/chats with full Persian title normalization and type filtering.
 */
export async function searchDialogsHandler(
  accountManager: AccountManager,
  args: {
    accountId?: string
    query: string
    limit?: number
    filter?: 'all' | 'unread' | 'users' | 'groups' | 'channels'
  }
): Promise<{ dialogs: McpDialogSummary[]; totalCount: number; accountId: string; query: string }> {
  const targetAccountId = resolveAccount(accountManager, args.accountId)
  const query = (args.query || '').trim()
  const limit = Math.min(Math.max(args.limit || 30, 1), 100)

  let dialogs: any[] = []
  try {
    dialogs = await accountManager.getDialogs(targetAccountId, 350)
  } catch (err) {
    Logger.warn(`[MCP] searchDialogs live fetch failed, falling back to cache:`, err)
    dialogs = accountManager.getCachedDialogs(targetAccountId) || []
  }

  if (!dialogs || dialogs.length === 0) {
    dialogs = accountManager.getCachedDialogs(targetAccountId) || []
  }

  // Filter by category
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

  // Fuzzy match on title, username, and last message text
  const scoredDialogs: { dialog: any; score: number }[] = []

  for (const d of filtered) {
    const title = d.title || ''
    const username = d.username || ''
    const lastMsg = d.lastMessageText || ''

    if (!query) {
      scoredDialogs.push({ dialog: d, score: 1.0 })
      continue
    }

    const titleMatch = fuzzyTokenMatch(query, title)
    const userMatch = username.toLowerCase().includes(query.toLowerCase().replace(/^@/, ''))
    const lastMsgMatch = fuzzyTokenMatch(query, lastMsg)

    if (titleMatch.matched || userMatch || lastMsgMatch.matched) {
      const bestScore = Math.max(
        titleMatch.score,
        userMatch ? 0.9 : 0,
        lastMsgMatch.score * 0.7
      )
      scoredDialogs.push({ dialog: d, score: bestScore })
    }
  }

  scoredDialogs.sort((a, b) => b.score - a.score)

  const summaries: McpDialogSummary[] = scoredDialogs.slice(0, limit).map(({ dialog: d }) => ({
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
    query,
  }
}

export const searchToolsDefinitions = [
  {
    name: 'telegram_search_messages',
    description: 'Searches Telegram messages globally or within a specific chat with Persian text normalization, date boundaries, and media filter.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Optional Telegram account ID. If omitted, uses active account.',
        },
        query: {
          type: 'string',
          description: 'The search query or keyword (e.g. "کشیک نمازی", "صورتحساب").',
        },
        chatId: {
          type: 'string',
          description: 'Optional chat ID to narrow search scope within a specific chat.',
        },
        filterType: {
          type: 'string',
          enum: ['all', 'media', 'files', 'links', 'audio', 'voice', 'pinned'],
          description: 'Optional filter for message content type.',
        },
        minDate: {
          type: 'number',
          description: 'Optional minimum Unix timestamp.',
        },
        maxDate: {
          type: 'number',
          description: 'Optional maximum Unix timestamp.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of messages to return (default: 30, max: 100).',
        },
        offsetId: {
          type: 'number',
          description: 'Optional message ID offset for pagination.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'telegram_search_contacts',
    description: 'Searches contacts in the address book with Persian normalization, fuzzy token matching, and fallback to Telegram directory search.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Optional Telegram account ID.',
        },
        query: {
          type: 'string',
          description: 'Contact name, phone number, or username to search for (e.g. "خانم دکتر غلامی", "+98912...").',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of contacts to return (default: 30, max: 100).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'telegram_search_dialogs',
    description: 'Searches chats and dialogs by title or username with Persian normalization, fuzzy token matching, and category filters.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Optional Telegram account ID.',
        },
        query: {
          type: 'string',
          description: 'Chat title or username search query.',
        },
        filter: {
          type: 'string',
          enum: ['all', 'unread', 'users', 'groups', 'channels'],
          description: 'Filter chats by type.',
        },
        limit: {
          type: 'number',
          description: 'Maximum chats to return (default: 30, max: 100).',
        },
      },
      required: ['query'],
    },
  },
]
