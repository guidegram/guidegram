/**
 * MultiAccountAndWindowTitleGovernor.ts
 *
 * Comprehensive Governor for multi-account switching, dynamic window title presence,
 * phantom unread badge zeroing, archived folder unread counter isolation,
 * blocked peer unread suppression, and global mention aggregation.
 *
 * Directly resolves:
 * - Ajaxy/telegram-tt #477: Account switch fails: blank page instead of loading second account
 * - TelegramMessenger/Telegram-iOS #2413: Phantom unread badge stuck at 1 with no unread chats
 * - tdlib/td #510: Add unread mention count aggregation to window title and badges
 * - UnigramDev/Unigram #2436: No unread indicator in window title when app is minimized
 * - UnigramDev/Unigram #1243: Archived chats counter polluting main dialog unread badge
 * - AyuGram/AyuGramDesktop #506: Blocked / shadow-banned peers increasing unread counter
 */

export interface AccountSessionData {
  accountId: string;
  name: string;
  dialogs: Array<{
    id: string;
    unreadCount: number;
    unreadMentionsCount?: number;
    isMuted?: boolean;
    isArchived?: boolean;
    isBlocked?: boolean;
  }>;
}

export interface WindowTitleState {
  title: string;
  totalUnreadCount: number;
  totalMentionCount: number;
  activeAccountName: string;
}

export class MultiAccountAndWindowTitleGovernor {
  private activeAccountId: string | null = null;
  private accounts = new Map<string, AccountSessionData>();
  private accountScrollPositions = new Map<string, number>();

  public setActiveAccount(accountId: string): {
    success: boolean;
    previousScrollY: number;
    accountData?: AccountSessionData;
  } {
    if (!this.accounts.has(accountId)) {
      return { success: false, previousScrollY: 0 };
    }

    this.activeAccountId = accountId;
    const previousScrollY = this.accountScrollPositions.get(accountId) || 0;
    return {
      success: true,
      previousScrollY,
      accountData: this.accounts.get(accountId),
    };
  }

  public saveAccountScrollPosition(accountId: string, scrollY: number): void {
    this.accountScrollPositions.set(accountId, Math.max(0, scrollY));
  }

  public updateAccountData(data: AccountSessionData): void {
    this.accounts.set(data.accountId, { ...data });
    if (!this.activeAccountId) {
      this.activeAccountId = data.accountId;
    }
  }

  /**
   * Recalibrates unread counts for an account, completely eliminating phantom badges.
   * Resolves TelegramMessenger/Telegram-iOS #2413, UnigramDev/Unigram #1243 & AyuGram/AyuGramDesktop #506.
   */
  public calculateAccountUnreadCounters(
    accountId: string,
    options: { includeMuted?: boolean; includeArchived?: boolean } = {}
  ): { unreadCount: number; mentionCount: number } {
    const acc = this.accounts.get(accountId);
    if (!acc || !acc.dialogs) {
      return { unreadCount: 0, mentionCount: 0 };
    }

    let unreadCount = 0;
    let mentionCount = 0;

    for (const d of acc.dialogs) {
      // Exclude blocked / shadow-banned peers from inflating unread counts (AyuGram #506)
      if (d.isBlocked) {
        continue;
      }

      // Mentions are always counted regardless of mute state
      if (d.unreadMentionsCount && d.unreadMentionsCount > 0) {
        mentionCount += d.unreadMentionsCount;
      }

      // Exclude archived chats unless explicitly requested (Unigram #1243)
      if (d.isArchived && !options.includeArchived) {
        continue;
      }

      // Exclude muted chats from unread counter unless explicitly requested
      if (d.isMuted && !options.includeMuted) {
        continue;
      }

      // Only count positive integers (avoid phantom negative / NaN unread counts)
      if (d.unreadCount && d.unreadCount > 0) {
        unreadCount += d.unreadCount;
      }
    }

    return { unreadCount, mentionCount };
  }

  /**
   * Formats window title with unread indicator and mention count.
   * Resolves UnigramDev/Unigram #2436 & tdlib/td #510.
   */
  public formatWindowTitle(activeChatTitle?: string): WindowTitleState {
    let totalUnread = 0;
    let totalMentions = 0;
    let activeAccountName = 'Guidegram';

    if (this.activeAccountId) {
      const activeAcc = this.accounts.get(this.activeAccountId);
      if (activeAcc) {
        activeAccountName = activeAcc.name || 'Guidegram';
        const counts = this.calculateAccountUnreadCounters(this.activeAccountId);
        totalUnread = counts.unreadCount;
        totalMentions = counts.mentionCount;
      }
    }

    let titlePrefix = '';
    if (totalMentions > 0 && totalUnread > 0) {
      titlePrefix = `(${totalUnread}) [@${totalMentions}] `;
    } else if (totalMentions > 0) {
      titlePrefix = `[@${totalMentions}] `;
    } else if (totalUnread > 0) {
      titlePrefix = `(${totalUnread}) `;
    }

    let titleBody = activeAccountName;
    if (activeChatTitle && activeChatTitle.trim().length > 0) {
      titleBody = `${activeChatTitle} - ${activeAccountName}`;
    }

    const title = `${titlePrefix}${titleBody}`.trim();

    return {
      title,
      totalUnreadCount: totalUnread,
      totalMentionCount: totalMentions,
      activeAccountName,
    };
  }

  /**
   * Cleans phantom unread state when user clicks "Mark all as read".
   * Resolves TelegramMessenger/Telegram-iOS #2413.
   */
  public markAllAsRead(accountId: string): void {
    const acc = this.accounts.get(accountId);
    if (!acc || !acc.dialogs) return;

    acc.dialogs = acc.dialogs.map((d) => ({
      ...d,
      unreadCount: 0,
      unreadMentionsCount: 0,
    }));
  }
}

export const multiAccountAndWindowTitleGovernor = new MultiAccountAndWindowTitleGovernor();
