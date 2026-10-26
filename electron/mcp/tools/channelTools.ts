import type { AccountManager } from '../../telegram/accountManager'
import { resolveAccountId } from './accountTools.js'
import { Logger } from '../../telegram/logger'

function resolveAccount(accountManager: AccountManager, accountId?: string): string {
  return resolveAccountId(accountManager, accountId)
}

export async function manageChannelHandler(
  accountManager: AccountManager,
  args: {
    accountId?: string
    channelId: string
    action: 'get_boosts' | 'apply_boost' | 'get_participants' | 'get_admin_log' | 'create_invite_link'
    slots?: number[]
    filter?: string
    query?: string
    limit?: number
    offset?: number
  }
): Promise<{ success: boolean; channelId: string; action: string; result?: any; error?: string }> {
  const targetAccountId = resolveAccount(accountManager, args.accountId)
  const channelId = String(args.channelId || '').trim()

  if (!channelId) {
    throw new Error('channelId is required for channel management.')
  }

  const holder = accountManager.getClientHolder(targetAccountId)
  if (!holder?.client) {
    throw new Error(`Telegram account ${targetAccountId} is not connected.`)
  }

  try {
    switch (args.action) {
      case 'get_boosts': {
        const boosts = await accountManager.getChannelBoostStatus(targetAccountId, channelId)
        return {
          success: true,
          channelId,
          action: 'get_boosts',
          result: boosts || { level: 0, boosts: 0, currentLevelBoosts: 0 },
        }
      }

      case 'apply_boost': {
        const res = await accountManager.applyChannelBoost(targetAccountId, channelId, args.slots)
        return {
          success: Boolean(res),
          channelId,
          action: 'apply_boost',
          result: res,
        }
      }

      case 'get_participants': {
        const limit = Math.min(Math.max(args.limit || 50, 1), 100)
        const filterName = args.filter || 'recent'
        const participantsRes = await accountManager.channelsService.getParticipants(
          holder as any,
          targetAccountId,
          channelId,
          filterName,
          args.offset || 0,
          limit
        )

        const participants: any[] = []
        const rawUsers = Array.isArray(participantsRes?.users) ? participantsRes.users : []
        const userMap = new Map<string, any>()
        for (const u of rawUsers) {
          userMap.set(String(u.id), u)
        }

        const rawParticipants = Array.isArray(participantsRes?.participants) ? participantsRes.participants : []
        for (const p of rawParticipants) {
          const userId = String(p.userId || p.peer?.userId || '')
          const u = userMap.get(userId)
          participants.push({
            userId,
            firstName: u?.firstName,
            lastName: u?.lastName,
            username: u?.username,
            role: p._ ? p._.replace(/^channelParticipant/, '').toLowerCase() : 'member',
            date: p.date,
          })
        }

        return {
          success: true,
          channelId,
          action: 'get_participants',
          result: {
            count: participantsRes?.count || participants.length,
            participants,
          },
        }
      }

      case 'get_admin_log': {
        const limit = Math.min(Math.max(args.limit || 30, 1), 100)
        const logRes = await accountManager.getAdminLog(
          targetAccountId,
          channelId,
          args.query || '',
          limit
        )

        return {
          success: true,
          channelId,
          action: 'get_admin_log',
          result: logRes || { events: [], hasMore: false },
        }
      }

      case 'create_invite_link': {
        const inviteLink = await accountManager.exportChatInvite(targetAccountId, channelId)
        return {
          success: Boolean(inviteLink),
          channelId,
          action: 'create_invite_link',
          result: { inviteLink },
        }
      }

      default:
        throw new Error(
          `Unsupported channel action '${args.action}'. Must be 'get_boosts', 'apply_boost', 'get_participants', 'get_admin_log', or 'create_invite_link'.`
        )
    }
  } catch (err: any) {
    Logger.error(`[MCP] manageChannelHandler error:`, err)
    return {
      success: false,
      channelId,
      action: args.action,
      error: err?.message || String(err),
    }
  }
}

export const channelToolsDefinitions = [
  {
    name: 'telegram_manage_channel',
    description: 'Manages channel and supergroup administration: inspect boost status & levels, apply Premium boosts, fetch participants, read admin event logs, or create invite links.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Optional Telegram account ID.',
        },
        channelId: {
          type: 'string',
          description: 'Target channel or supergroup ID (e.g. "-1001234567890").',
        },
        action: {
          type: 'string',
          enum: ['get_boosts', 'apply_boost', 'get_participants', 'get_admin_log', 'create_invite_link'],
          description: 'Action to perform on the channel.',
        },
        slots: {
          type: 'array',
          items: { type: 'number' },
          description: 'Optional slot indices to use when applying boosts.',
        },
        filter: {
          type: 'string',
          enum: ['recent', 'admins', 'kicked', 'banned', 'bots', 'contacts'],
          description: 'Participant filter type (for "get_participants" action).',
        },
        query: {
          type: 'string',
          description: 'Search keyword for admin logs or participants.',
        },
        limit: {
          type: 'number',
          description: 'Maximum items to retrieve (default: 50).',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset.',
        },
      },
      required: ['channelId', 'action'],
    },
  },
]
