import { Logger } from './logger'

/**
 * AccountIsolationGuard (Layer 10 - Multi-Tenancy & Zero Cross-Account Data Leakage)
 * Strictly verifies account tenancy, enforces profile boundaries, and performs total
 * memory and state purge upon account logout or session termination.
 */
export class AccountIsolationGuard {
  /**
   * Asserts valid and safe account ID format, throwing if invalid or path-traversal detected.
   */
  public static assertSafeAccountId(accountId: string): string {
    if (!accountId || typeof accountId !== 'string') {
      throw new Error('[AccountIsolationGuard] Missing or invalid accountId')
    }
    const trimmed = accountId.trim()
    if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
      throw new Error(`[AccountIsolationGuard] Untrusted accountId format: '${accountId}'`)
    }
    return trimmed
  }

  /**
   * Verifies that the requested action is authorized for the designated account tenancy.
   */
  public static isAccountAuthorized(
    targetAccountId: string,
    existingAccountIds: string[]
  ): boolean {
    if (!targetAccountId || !Array.isArray(existingAccountIds)) return false
    const safeId = targetAccountId.trim()
    return existingAccountIds.includes(safeId)
  }

  /**
   * Purges all account-scoped keys from memory Maps (access hashes, caches, active downloads).
   */
  public static purgeAccountCaches(
    accountId: string,
    maps: Array<Map<string, any>>
  ): number {
    const safeId = this.assertSafeAccountId(accountId)
    const prefix = `${safeId}_`
    let purgedCount = 0

    for (const map of maps) {
      if (!map || !(map instanceof Map)) continue
      for (const key of Array.from(map.keys())) {
        if (key.startsWith(prefix) || key === safeId) {
          map.delete(key)
          purgedCount++
        }
      }
    }

    Logger.info(`[AccountIsolationGuard] Purged ${purgedCount} cached items for account ${safeId}`)
    return purgedCount
  }
}
