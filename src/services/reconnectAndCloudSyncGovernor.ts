/**
 * Guidegram Reconnect, Cloud Sync & Storage Reconciliation Governor
 * 
 * Hardened against:
 * - tdesktop #8068: Reconnect spinner burns 100% CPU on network drop
 * - tdesktop #31445: Pinned chat linked to community unpinned locally on every restart
 * - tdesktop #31461: Wrong message/state for chats with deleted accounts
 * - kotatogram #294: Local folder disappears despite existing in config file
 * - tdesktop #31328: Export data truncated at 10,000 messages
 */

export interface ReconnectState {
  attemptCount: number;
  isConnecting: boolean;
  nextRetryTimestamp: number;
  shouldAnimateSpinner: boolean;
}

export interface PinnedChatEntry {
  chatId: number;
  pinnedOrder: number;
  isCommunityLinked: boolean;
}

export interface EntityInfo {
  id: number;
  isDeleted: boolean;
  name: string;
}

export interface ChatFolderConfig {
  id: number;
  title: string;
  includedChatIds: number[];
}

export class ReconnectAndCloudSyncGovernor {
  /**
   * Calculates CPU-efficient exponential backoff for reconnect attempts,
   * suspending continuous RAF spinner rendering in background to avoid CPU spikes (tdesktop #8068).
   */
  public static calculateReconnectBackoff(
    attempt: number,
    isWindowFocused: boolean,
    now: number = Date.now()
  ): { backoffMs: number; nextRetryTimestamp: number; shouldAnimateSpinner: boolean } {
    // Exponential backoff with jitter: 1s, 2s, 4s, 8s, 16s, capped at 30s
    const baseDelayMs = Math.min(30000, 1000 * Math.pow(2, Math.min(attempt, 5)));
    const jitter = Math.floor(Math.random() * 500);
    const backoffMs = baseDelayMs + jitter;

    // If window is unfocused or in background, pause GPU spinner animations
    const shouldAnimateSpinner = isWindowFocused;

    return {
      backoffMs,
      nextRetryTimestamp: now + backoffMs,
      shouldAnimateSpinner
    };
  }

  /**
   * Reconciles local database pinned chat order with cloud updates,
   * guaranteeing community-linked pinned chats persist across restarts (tdesktop #31445).
   */
  public static reconcilePinnedChats(
    localPins: PinnedChatEntry[],
    cloudPins: PinnedChatEntry[]
  ): PinnedChatEntry[] {
    const pinMap = new Map<number, PinnedChatEntry>();

    // Start with cloud authoritative list
    for (const pin of cloudPins) {
      pinMap.set(pin.chatId, { ...pin });
    }

    // Preserve local community-linked pins if missing from immediate cloud diff
    for (const local of localPins) {
      if (local.isCommunityLinked && !pinMap.has(local.chatId)) {
        pinMap.set(local.chatId, { ...local });
      }
    }

    // Sort by pinnedOrder ascending
    return Array.from(pinMap.values()).sort((a, b) => a.pinnedOrder - b.pinnedOrder);
  }

  /**
   * Resolves deleted user account status, preventing errors and disabling composer (tdesktop #31461).
   */
  public static resolveDeletedAccount(user: { id: number; isDeleted: boolean; firstName?: string }): {
    displayName: string;
    canSendMessages: boolean;
    isDeletedAccount: boolean;
  } {
    if (user.isDeleted) {
      return {
        displayName: 'Deleted Account',
        canSendMessages: false,
        isDeletedAccount: true
      };
    }

    return {
      displayName: user.firstName || 'User',
      canSendMessages: true,
      isDeletedAccount: false
    };
  }

  /**
   * Recovers and sanitizes folder configurations from snapshot storage if config file is corrupted (kotatogram #294).
   */
  public static sanitizeFolderConfig(
    activeFolders: ChatFolderConfig[],
    backupSnapshot: ChatFolderConfig[]
  ): ChatFolderConfig[] {
    if (activeFolders && activeFolders.length > 0) {
      return activeFolders;
    }

    // Restore from backup snapshot if main folder list is empty or wiped
    if (backupSnapshot && backupSnapshot.length > 0) {
      return backupSnapshot.map(f => ({ ...f }));
    }

    // Default "All Chats" folder
    return [{ id: 0, title: 'All Chats', includedChatIds: [] }];
  }

  /**
   * Chunks chat export pagination across date ranges, avoiding hard 10,000 item limits (tdesktop #31328).
   */
  public static partitionExportPagination(
    totalMessages: number,
    pageSize: number = 2000
  ): Array<{ offset: number; limit: number; pageNumber: number }> {
    const pages: Array<{ offset: number; limit: number; pageNumber: number }> = [];
    let offset = 0;
    let pageNumber = 1;

    while (offset < totalMessages) {
      const limit = Math.min(pageSize, totalMessages - offset);
      pages.push({ offset, limit, pageNumber });
      offset += limit;
      pageNumber += 1;
    }

    return pages;
  }
}
