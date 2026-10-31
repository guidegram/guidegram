/**
 * Global Search, Message Filtering & In-Memory Query Optimizer Governor
 *
 * Hardened against competitor issues:
 * - kotatogram/kotatogram-desktop #338: Hotkey to find in all chats (Ctrl+Shift+F / Cmd+Shift+F)
 * - TelegramMessenger/Telegram-iOS #2314: Quick Search (⌘K / Ctrl+K) switcher
 * - TDesktop-x64/tdesktop #228: Message filtering by sender, media type, date, links
 * - TDesktop-x64/tdesktop #195: Option to disable remote global search (local-only privacy toggle)
 * - TDesktop-x64/tdesktop #213: Drag and drop reordering in filter menu folders
 * - Ajaxy/telegram-tt #453: Search for premium emoji reactions and custom emoji keywords
 * - AyuGram/AyuGramDesktop #452: Filter/toggle to show only online members in group members list
 */

export interface IndexedMessage {
  id: number;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  mediaType?: 'photo' | 'video' | 'document' | 'audio' | 'voice' | 'link' | 'none';
  date: number;
}

export interface SearchFilterOptions {
  query: string;
  chatId?: string;
  senderId?: string;
  mediaType?: 'photo' | 'video' | 'document' | 'audio' | 'voice' | 'link' | 'all';
  startDate?: number;
  endDate?: number;
  localOnly?: boolean;
}

export interface SearchResultItem {
  messageId: number;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  mediaType?: string;
  date: number;
  matchScore: number;
}

export interface ChatFilterFolder {
  id: string;
  title: string;
  orderIndex: number;
  includedChatIds: string[];
}

export interface GroupMemberItem {
  userId: string;
  name: string;
  isOnline: boolean;
  lastSeen: number;
}

export interface ReactionItem {
  emoji: string;
  title: string;
  isPremium: boolean;
  keywords?: string[];
}

export class GlobalSearchAndFilterGovernor {
  private messages: Map<string, IndexedMessage> = new Map();
  private globalSearchEnabled: boolean = true;
  private filterFolders: Map<string, ChatFilterFolder> = new Map();

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.messages.clear();
    this.globalSearchEnabled = true;
    this.filterFolders.clear();
  }

  /**
   * Indexes a message for in-memory sub-millisecond filtering
   */
  public indexMessage(msg: IndexedMessage): void {
    const key = `${msg.chatId}:${msg.id}`;
    this.messages.set(key, { ...msg });
  }

  /**
   * Performs multi-criteria message search & filtering (TDesktop #228 & #195)
   */
  public searchMessages(options: SearchFilterOptions): SearchResultItem[] {
    const normalizedQuery = options.query.toLowerCase().trim();
    const results: SearchResultItem[] = [];

    // Privacy toggle: if global search is disabled and no chatId specified, return empty (TDesktop #195)
    if (!this.globalSearchEnabled && !options.chatId && !options.localOnly) {
      return [];
    }

    for (const msg of this.messages.values()) {
      if (options.chatId && msg.chatId !== options.chatId) continue;
      if (options.senderId && msg.senderId !== options.senderId) continue;

      if (options.mediaType && options.mediaType !== 'all') {
        if (msg.mediaType !== options.mediaType) continue;
      }

      if (options.startDate && msg.date < options.startDate) continue;
      if (options.endDate && msg.date > options.endDate) continue;

      let score = 0;
      if (normalizedQuery.length > 0) {
        const textMatch = msg.text.toLowerCase().indexOf(normalizedQuery);
        const senderMatch = msg.senderName.toLowerCase().indexOf(normalizedQuery);

        if (textMatch === -1 && senderMatch === -1) {
          continue;
        }

        score = textMatch === 0 ? 100 : (textMatch > 0 ? 50 : 20);
      } else {
        score = 10; // Match on filter attributes alone
      }

      results.push({
        messageId: msg.id,
        chatId: msg.chatId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        text: msg.text,
        mediaType: msg.mediaType,
        date: msg.date,
        matchScore: score
      });
    }

    return results.sort((a, b) => b.matchScore - a.matchScore || b.date - a.date);
  }

  /**
   * Privacy setting: Enable or disable global search (TDesktop #195)
   */
  public setGlobalSearchEnabled(enabled: boolean): void {
    this.globalSearchEnabled = enabled;
  }

  public isGlobalSearchEnabled(): boolean {
    return this.globalSearchEnabled;
  }

  /**
   * Reorders chat filter folders after drag-and-drop (TDesktop #213)
   */
  public registerFilterFolder(folder: ChatFilterFolder): void {
    this.filterFolders.set(folder.id, { ...folder });
  }

  public reorderFilterFolders(folderIdsInNewOrder: string[]): ChatFilterFolder[] {
    const reordered: ChatFilterFolder[] = [];
    folderIdsInNewOrder.forEach((id, index) => {
      const folder = this.filterFolders.get(id);
      if (folder) {
        folder.orderIndex = index;
        reordered.push({ ...folder });
      }
    });

    return reordered;
  }

  /**
   * Filters and sorts group members by online status (AyuGram #452)
   */
  public filterMembers(members: GroupMemberItem[], onlyOnline: boolean): GroupMemberItem[] {
    if (!onlyOnline) {
      return [...members].sort((a, b) => {
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        return b.lastSeen - a.lastSeen;
      });
    }

    return members
      .filter(m => m.isOnline)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Searches available emoji reactions including premium ones (Ajaxy #453)
   */
  public searchReactions(query: string, reactions: ReactionItem[]): ReactionItem[] {
    const q = query.toLowerCase().trim();
    if (!q) return [...reactions];

    return reactions.filter(r => {
      if (r.emoji.includes(q)) return true;
      if (r.title.toLowerCase().includes(q)) return true;
      if (r.keywords && r.keywords.some(k => k.toLowerCase().includes(q))) return true;
      return false;
    });
  }

  /**
   * Handles keyboard shortcuts for quick switcher and global search (kotatogram #338 & iOS #2314)
   */
  public handleSearchHotkey(event: {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
  }): { action: 'open_global_search' | 'open_quick_switcher' | 'none' } {
    const isCmdOrCtrl = !!(event.ctrlKey || event.metaKey);
    const keyLower = event.key.toLowerCase();

    // Ctrl+Shift+F or Cmd+Shift+F: Global Search across all chats (kotatogram #338)
    if (isCmdOrCtrl && event.shiftKey && keyLower === 'f') {
      return { action: 'open_global_search' };
    }

    // Ctrl+K or Cmd+K: Quick Switcher / Find (iOS #2314)
    if (isCmdOrCtrl && keyLower === 'k') {
      return { action: 'open_quick_switcher' };
    }

    return { action: 'none' };
  }
}

export const globalSearchAndFilterGovernor = new GlobalSearchAndFilterGovernor();
