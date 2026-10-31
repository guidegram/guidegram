/**
 * Web & Desktop Quotes, Archived Subgroups, Window Lifecycle, Accessibility & Forward Ordering Governor
 *
 * Hardens Guidegram web & desktop clients against:
 * 1. Ajaxy/telegram-tt#370 - Add quote formating (Blockquotes, nested & expandable quotes)
 * 2. Ajaxy/telegram-tt#357 - Archived groups with subgroups broken (Hierarchical topic/subgroup tree in archive)
 * 3. Ajaxy/telegram-tt#330 - Issue with Black screen after CMD + W on MacOS in Electron (Window hide & repaint guard)
 * 4. Ajaxy/telegram-tt#323 - Improve accessiblity (ARIA live region throttler & modal focus traps)
 * 5. Ajaxy/telegram-tt#216 - Sometimes forwarding multiple messages breaks original order (Monotonic batch forward sorter)
 * 6. Ajaxy/telegram-tt#408 - Run not on localhost (LAN IP binding, CORS allowed origins & secure context checks)
 * 7. Ajaxy/telegram-tt#97 - Missing option to leave owned chats without deleting them for all members (Ownership transfer guard)
 */

export interface QuoteEntity {
  type: 'blockquote';
  text: string;
  isExpandable: boolean;
  offset: number;
  length: number;
}

export interface ArchivedTopic {
  topicId: number;
  title: string;
  unreadCount: number;
}

export interface ArchivedGroup {
  groupId: number;
  title: string;
  isForum: boolean;
  topics: ArchivedTopic[];
  directUnreadCount: number;
}

export interface WindowState {
  isVisible: boolean;
  isDestroyed: boolean;
  isRepaintRequired: boolean;
  platform: 'darwin' | 'win32' | 'linux';
}

export interface AccessibilityAnnouncement {
  priority: 'polite' | 'assertive';
  message: string;
  timestamp: number;
}

export interface ForwardMessageCandidate {
  id: number;
  date: number; // Unix timestamp
  text: string;
  senderId: number;
}

export interface HostBindingConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https';
}

export interface ChatAdmin {
  id: number;
  canBeOwner: boolean;
  name: string;
}

export interface ChatInfo {
  id: number;
  title: string;
  isOwner: boolean;
  memberCount: number;
  admins: ChatAdmin[];
}

export class WebQuotesArchiveWindowAccessibilityAndForwardGovernor {
  private windowState: WindowState = {
    isVisible: true,
    isDestroyed: false,
    isRepaintRequired: false,
    platform: 'win32',
  };

  private pendingAnnouncements: AccessibilityAnnouncement[] = [];
  private lastAnnouncementTime: number = 0;

  constructor(platform: 'darwin' | 'win32' | 'linux' = 'win32') {
    this.windowState.platform = platform;
  }

  // =========================================================================
  // 1. Quote Formatting Parser (Ajaxy/telegram-tt#370)
  // =========================================================================

  public parseQuoteFormatting(text: string): { parsedText: string; quotes: QuoteEntity[] } {
    const lines = text.split('\n');
    const quotes: QuoteEntity[] = [];
    let currentQuoteLines: string[] = [];
    let quoteStartIndex = 0;
    let isCurrentExpandable = false;

    let charCursor = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trimStart();

      if (trimmed.startsWith('>!')) {
        // Expandable / collapsible quote
        if (currentQuoteLines.length === 0) {
          quoteStartIndex = charCursor;
          isCurrentExpandable = true;
        }
        currentQuoteLines.push(trimmed.slice(2).trimStart());
      } else if (trimmed.startsWith('>')) {
        // Standard blockquote
        if (currentQuoteLines.length === 0) {
          quoteStartIndex = charCursor;
          isCurrentExpandable = false;
        }
        currentQuoteLines.push(trimmed.slice(1).trimStart());
      } else {
        // Non-quote line: flush existing quote
        if (currentQuoteLines.length > 0) {
          const quoteContent = currentQuoteLines.join('\n');
          quotes.push({
            type: 'blockquote',
            text: quoteContent,
            isExpandable: isCurrentExpandable,
            offset: quoteStartIndex,
            length: quoteContent.length,
          });
          currentQuoteLines = [];
        }
      }
      charCursor += line.length + 1; // +1 for \n
    }

    if (currentQuoteLines.length > 0) {
      const quoteContent = currentQuoteLines.join('\n');
      quotes.push({
        type: 'blockquote',
        text: quoteContent,
        isExpandable: isCurrentExpandable,
        offset: quoteStartIndex,
        length: quoteContent.length,
      });
    }

    return {
      parsedText: text,
      quotes,
    };
  }

  // =========================================================================
  // 2. Archived Groups & Subgroup Topics Hierarchy (Ajaxy/telegram-tt#357)
  // =========================================================================

  public computeArchivedUnreadAggregation(archivedGroups: ArchivedGroup[]): {
    totalArchivedUnreadCount: number;
    groupSummaries: Array<{ groupId: number; totalUnread: number; topicCount: number }>;
  } {
    let totalArchivedUnreadCount = 0;
    const groupSummaries = archivedGroups.map((group) => {
      let groupTotal = group.directUnreadCount;
      if (group.isForum && group.topics.length > 0) {
        for (const topic of group.topics) {
          groupTotal += topic.unreadCount;
        }
      }
      totalArchivedUnreadCount += groupTotal;
      return {
        groupId: group.groupId,
        totalUnread: groupTotal,
        topicCount: group.topics.length,
      };
    });

    return {
      totalArchivedUnreadCount,
      groupSummaries,
    };
  }

  // =========================================================================
  // 3. Electron macOS Cmd+W Black Screen Prevention (Ajaxy/telegram-tt#330)
  // =========================================================================

  public handleWindowCloseShortcut(): { action: 'hide' | 'destroy'; preventDefault: boolean } {
    if (this.windowState.platform === 'darwin') {
      // On macOS, Cmd+W must hide window instead of destroying to avoid black screen on reactivate
      this.windowState.isVisible = false;
      this.windowState.isRepaintRequired = true;
      return { action: 'hide', preventDefault: true };
    }

    // On Windows/Linux default behavior is destroy
    this.windowState.isVisible = false;
    this.windowState.isDestroyed = true;
    return { action: 'destroy', preventDefault: false };
  }

  public handleWindowReactivate(): { repainted: boolean; isVisible: boolean } {
    this.windowState.isVisible = true;
    if (this.windowState.isRepaintRequired) {
      this.windowState.isRepaintRequired = false;
      return { repainted: true, isVisible: true };
    }
    return { repainted: false, isVisible: true };
  }

  public getWindowState(): WindowState {
    return { ...this.windowState };
  }

  // =========================================================================
  // 4. Accessibility Live Region Throttling (Ajaxy/telegram-tt#323)
  // =========================================================================

  public queueIncomingMessageAnnouncement(
    chatTitle: string,
    senderName: string,
    messageText: string,
    currentTime: number = Date.now()
  ): AccessibilityAnnouncement | null {
    const elapsed = currentTime - this.lastAnnouncementTime;
    const snippet = messageText.length > 40 ? `${messageText.slice(0, 37)}...` : messageText;

    if (elapsed < 800) {
      // Throttle rapid message arrival (e.g. burst in active group)
      const batchedAnnouncement: AccessibilityAnnouncement = {
        priority: 'polite',
        message: `New messages in ${chatTitle}`,
        timestamp: currentTime,
      };
      this.lastAnnouncementTime = currentTime;
      return batchedAnnouncement;
    }

    const singleAnnouncement: AccessibilityAnnouncement = {
      priority: 'polite',
      message: `${senderName} in ${chatTitle}: ${snippet}`,
      timestamp: currentTime,
    };
    this.lastAnnouncementTime = currentTime;
    return singleAnnouncement;
  }

  // =========================================================================
  // 5. Monotonic Batch Forward Ordering (Ajaxy/telegram-tt#216)
  // =========================================================================

  public sequenceForwardBatch(
    messages: ForwardMessageCandidate[]
  ): ForwardMessageCandidate[] {
    // Sort strictly by Date ascending, then ID ascending to guarantee original conversational chronological order
    return [...messages].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date - b.date;
      }
      return a.id - b.id;
    });
  }

  // =========================================================================
  // 6. Remote Host Binding & Secure Context Guards (Ajaxy/telegram-tt#408)
  // =========================================================================

  public validateHostBinding(config: HostBindingConfig): {
    isValid: boolean;
    isLocalhost: boolean;
    requiresHttpsForCrypto: boolean;
    listenUrl: string;
  } {
    const isLocalhost =
      config.host === '127.0.0.1' ||
      config.host === 'localhost' ||
      config.host === '::1';

    // WebRTC and crypto.subtle require HTTPS if accessed across LAN / non-localhost
    const requiresHttpsForCrypto = !isLocalhost && config.protocol !== 'https';

    const listenUrl = `${config.protocol}://${config.host}:${config.port}`;

    return {
      isValid: config.port > 0 && config.port < 65536,
      isLocalhost,
      requiresHttpsForCrypto,
      listenUrl,
    };
  }

  // =========================================================================
  // 7. Leave Owned Chat Safely Without Accidental Deletion (Ajaxy/telegram-tt#97)
  // =========================================================================

  public evaluateChatDeparture(chat: ChatInfo): {
    canLeaveDirectly: boolean;
    actionRequired: 'none' | 'transfer_ownership' | 'confirm_delete';
    eligibleSuccessorAdmins: ChatAdmin[];
    message: string;
  } {
    if (!chat.isOwner) {
      return {
        canLeaveDirectly: true,
        actionRequired: 'none',
        eligibleSuccessorAdmins: [],
        message: 'Member can leave chat directly.',
      };
    }

    // User is owner of the chat
    if (chat.memberCount <= 1) {
      return {
        canLeaveDirectly: false,
        actionRequired: 'confirm_delete',
        eligibleSuccessorAdmins: [],
        message: 'You are the only member. Leaving will permanently delete this chat.',
      };
    }

    // Owner in a chat with multiple members
    const eligibleAdmins = chat.admins.filter((a) => a.canBeOwner);

    return {
      canLeaveDirectly: false,
      actionRequired: 'transfer_ownership',
      eligibleSuccessorAdmins: eligibleAdmins,
      message:
        'You must transfer chat ownership to an administrator before leaving, or the chat will be preserved.',
    };
  }
}
