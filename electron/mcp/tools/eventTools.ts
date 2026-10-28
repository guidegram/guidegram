import type { AccountManager } from '../../telegram/accountManager'
import type { McpEventBus } from '../eventBus'
import { resolveAccountId } from './accountTools.js'
import { Logger } from '../../telegram/logger'

export const eventToolsDefinitions = [
  {
    name: 'telegram_wait_for_events',
    description:
      'Waits for real-time live events (new messages, user typing, reactions) on a chat or account. Supports burst message debouncing (aggregating quick consecutive messages) and continuous typing simulation to keep the counterpart informed.',
    inputSchema: {
      type: 'object',
      properties: {
        chatId: {
          type: 'string',
          description:
            'Target chat ID or username (e.g. "123456789" or "-100..."). Strongly recommended for 1:1 interactive dialogs.',
        },
        accountId: {
          type: 'string',
          description: 'Optional account ID, phone, or username. Defaults to active account.',
        },
        eventTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['new_message', 'typing', 'reaction', 'all'],
          },
          description: 'Types of events to listen for. Defaults to ["new_message"].',
        },
        timeoutSeconds: {
          type: 'number',
          description: 'Maximum seconds to wait before returning. Default 30, max 120.',
        },
        indicateTyping: {
          type: 'boolean',
          description: 'If true, automatically sends typing status to the chat periodically while waiting.',
        },
        sinceEventId: {
          type: 'number',
          description:
            'Optional event ID to return unread events that arrived after this ID from the ring buffer without waiting.',
        },
        debounceBurstMs: {
          type: 'number',
          description:
            'Optional merge window in ms for consecutive messages (e.g. 2500ms). Defaults to 2500ms.',
        },
      },
      required: [],
    },
  },
  {
    name: 'telegram_create_watcher',
    description:
      'Creates an asynchronous background watcher that captures matching messages/events into a dedicated ring buffer or automatically downloads media over a specified duration.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Descriptive name for the watcher (e.g., "PDF Invoices Watcher", "Support Alerts").',
        },
        durationSeconds: {
          type: 'number',
          description:
            'Duration in seconds for the watcher to remain active (e.g. 1800 for 30 min, max 7200). Default is 1800.',
        },
        filter: {
          type: 'object',
          description: 'Criteria to filter incoming Telegram events.',
          properties: {
            chatIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of chat IDs to monitor.',
            },
            keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Keywords to match in message text (case-insensitive).',
            },
            regex: {
              type: 'string',
              description: 'Regular expression pattern to test against message text or caption.',
            },
            mediaTypes: {
              type: 'array',
              items: { type: 'string' },
              description: "Media types to match: 'photo', 'video', 'document', 'audio', 'voice', 'sticker'.",
            },
            extensions: {
              type: 'array',
              items: { type: 'string' },
              description: "File extensions to match (e.g. ['pdf', 'zip', 'docx']).",
            },
          },
        },
        action: {
          type: 'string',
          enum: ['buffer', 'auto_download'],
          description:
            "Action to perform on matching events: 'buffer' stores events in feed, 'auto_download' additionally downloads attached files.",
        },
        downloadDir: {
          type: 'string',
          description: 'Optional directory to save downloaded media when action is "auto_download".',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'telegram_get_watcher_feed',
    description: 'Retrieves captured events and downloaded files from an active or recent background watcher.',
    inputSchema: {
      type: 'object',
      properties: {
        watcherId: {
          type: 'string',
          description: 'The unique ID of the watcher returned by telegram_create_watcher.',
        },
        sinceCursor: {
          type: 'number',
          description: 'Optional cursor position to only retrieve items captured after this cursor.',
        },
        clearAfterRead: {
          type: 'boolean',
          description: 'If true, clears the returned items from the watcher buffer after reading.',
        },
      },
      required: ['watcherId'],
    },
  },
  {
    name: 'telegram_list_watchers',
    description: 'Lists all active and recent background event watchers with operational telemetry.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'telegram_delete_watcher',
    description: 'Stops and removes an active or expired background event watcher.',
    inputSchema: {
      type: 'object',
      properties: {
        watcherId: {
          type: 'string',
          description: 'The unique ID of the watcher to delete.',
        },
      },
      required: ['watcherId'],
    },
  },
]

export async function waitForEventsHandler(
  accountManager: AccountManager,
  eventBus: McpEventBus,
  args: any
): Promise<any> {
  let resolvedAccId: string | undefined = undefined
  if (args.accountId) {
    resolvedAccId = resolveAccountId(accountManager, args.accountId)
  }

  const result = await eventBus.waitForEvents({
    chatId: args.chatId ? String(args.chatId).trim() : undefined,
    accountId: resolvedAccId,
    eventTypes: Array.isArray(args.eventTypes) && args.eventTypes.length > 0 ? args.eventTypes : ['new_message'],
    timeoutSeconds: typeof args.timeoutSeconds === 'number' ? args.timeoutSeconds : 30,
    indicateTyping: Boolean(args.indicateTyping),
    sinceEventId: typeof args.sinceEventId === 'number' ? args.sinceEventId : undefined,
    debounceBurstMs: typeof args.debounceBurstMs === 'number' ? args.debounceBurstMs : 2500,
  })

  return result
}

export async function createWatcherHandler(
  eventBus: McpEventBus,
  args: any
): Promise<any> {
  if (!args.name || typeof args.name !== 'string' || !args.name.trim()) {
    throw new Error("Parameter 'name' is required for creating a watcher.")
  }

  const summary = eventBus.createWatcher({
    name: args.name.trim(),
    durationSeconds: typeof args.durationSeconds === 'number' ? args.durationSeconds : 1800,
    filter: args.filter || {},
    action: args.action === 'auto_download' ? 'auto_download' : 'buffer',
    downloadDir: args.downloadDir ? String(args.downloadDir).trim() : undefined,
  })

  return summary
}

export async function getWatcherFeedHandler(
  eventBus: McpEventBus,
  args: any
): Promise<any> {
  if (!args.watcherId || typeof args.watcherId !== 'string') {
    throw new Error("Parameter 'watcherId' is required.")
  }

  return eventBus.getWatcherFeed(
    args.watcherId.trim(),
    typeof args.sinceCursor === 'number' ? args.sinceCursor : undefined,
    Boolean(args.clearAfterRead)
  )
}

export async function listWatchersHandler(
  eventBus: McpEventBus
): Promise<any> {
  const watchers = eventBus.listWatchers()
  return {
    watchers,
    totalCount: watchers.length,
    activeCount: watchers.filter((w) => w.status === 'active').length,
  }
}

export async function deleteWatcherHandler(
  eventBus: McpEventBus,
  args: any
): Promise<any> {
  if (!args.watcherId || typeof args.watcherId !== 'string') {
    throw new Error("Parameter 'watcherId' is required.")
  }

  const success = eventBus.deleteWatcher(args.watcherId.trim())
  return {
    success,
    watcherId: args.watcherId.trim(),
    message: success ? 'Watcher removed successfully' : 'Watcher not found or already deleted',
  }
}
