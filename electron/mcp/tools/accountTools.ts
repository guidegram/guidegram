import type { AccountManager } from '../../telegram/accountManager'
import type { AccountInfo } from '../../telegram/types'
import type { McpAccountSummary } from '../types'

let currentActiveAccountId: string | null = null

export function getActiveAccountId(accountManager: AccountManager): string | null {
  const accounts: AccountInfo[] = accountManager.getAccounts()
  if (accounts.length === 0) return null

  if (currentActiveAccountId && accounts.some((a: AccountInfo) => a.id === currentActiveAccountId && a.status === 'connected')) {
    return currentActiveAccountId
  }

  // Fallback to first connected account, or simply first account
  const connected = accounts.find((a: AccountInfo) => a.status === 'connected')
  currentActiveAccountId = connected ? connected.id : accounts[0].id
  return currentActiveAccountId
}

export function setActiveAccountId(accountId: string): void {
  currentActiveAccountId = accountId
}

export async function listAccountsHandler(
  accountManager: AccountManager
): Promise<{ accounts: McpAccountSummary[]; activeAccountId: string | null }> {
  const accounts: AccountInfo[] = accountManager.getAccounts()
  const activeId = getActiveAccountId(accountManager)

  const mapped: McpAccountSummary[] = accounts.map((acc: AccountInfo) => ({
    id: acc.id,
    phone: acc.phone,
    firstName: acc.firstName,
    lastName: acc.lastName,
    username: acc.username,
    status: acc.status,
    unreadTotal: acc.unreadTotal || 0,
    isPremium: acc.isPremium,
    isBot: acc.isBot,
    isActive: acc.id === activeId,
  }))

  return {
    accounts: mapped,
    activeAccountId: activeId,
  }
}

export async function switchActiveAccountHandler(
  accountManager: AccountManager,
  args: { accountId: string }
): Promise<{ success: boolean; activeAccountId: string; account?: McpAccountSummary; error?: string }> {
  const accounts: AccountInfo[] = accountManager.getAccounts()
  const target = accounts.find((a: AccountInfo) => a.id === args.accountId || a.phone === args.accountId || a.username?.toLowerCase() === args.accountId.toLowerCase().replace(/^@/, ''))

  if (!target) {
    return {
      success: false,
      activeAccountId: currentActiveAccountId || '',
      error: `Account not found with identifier '${args.accountId}'. Available account IDs: ${accounts.map((a: AccountInfo) => a.id).join(', ')}`,
    }
  }

  currentActiveAccountId = target.id
  return {
    success: true,
    activeAccountId: target.id,
    account: {
      id: target.id,
      phone: target.phone,
      firstName: target.firstName,
      lastName: target.lastName,
      username: target.username,
      status: target.status,
      unreadTotal: target.unreadTotal || 0,
      isPremium: target.isPremium,
      isBot: target.isBot,
      isActive: true,
    },
  }
}

export const accountToolsDefinitions = [
  {
    name: 'telegram_list_accounts',
    description: 'Lists all Telegram accounts currently configured and logged into Guidegram, including their connection status, unread count, and which account is currently active.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'telegram_switch_active_account',
    description: 'Switches the currently active Telegram account for subsequent MCP tool operations. You can specify the accountId, phone number, or username.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'The target account ID, phone number, or @username to activate.',
        },
      },
      required: ['accountId'],
    },
  },
]
