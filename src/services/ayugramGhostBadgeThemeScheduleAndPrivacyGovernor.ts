/**
 * Guidegram AyuGram Ghost Badge, Theme, Schedule, Anti-Recall & Privacy Governor
 * 
 * Hardens Guidegram against AyuGramDesktop issues:
 * - #508: Notification count badge desync when reading chats in Ghost Mode
 * - #495: Inability to switch dark/light mode dynamically in sync with OS
 * - #466: Inability to cancel scheduled messages before dispatch
 * - #424: Self-deleted outgoing messages not saved in anti-recall archive
 * - #417: Stale online/offline presence status updating only on interaction
 * - #372: Maintaining local read/unread bookmark history while Ghost Mode is active
 * - #366: Privacy masking to hide original sender name and avatar on forwards
 */

export interface GhostBadgeState {
  serverUnreadCount: number;
  localUnreadCount: number;
  displayedBadge: number;
  ghostModeActive: boolean;
}

export interface SystemThemeState {
  systemPrefersDark: boolean;
  appTheme: 'dark' | 'light';
  isAutoSyncEnabled: boolean;
  activePaletteId: string;
}

export interface ScheduledMessageItem {
  id: string;
  chatId: string;
  text: string;
  sendTimestampMs: number;
  isCancelled: boolean;
}

export interface DeletedMessageArchive {
  messageId: string;
  chatId: string;
  text: string;
  isOutgoing: boolean;
  deletedAtTimestampMs: number;
  retainedInArchive: boolean;
}

export interface UserPresenceState {
  userId: string;
  isOnline: boolean;
  lastSeenTimestampMs: number;
  ttlRemainingSec: number;
  isStale: boolean;
}

export interface GhostBookmark {
  chatId: string;
  lastLocallyReadMessageId: number;
  serverMarkedMessageId: number;
  hasLocalUnreadGap: boolean;
}

export interface ForwardPrivacyPayload {
  originalSenderId: string;
  originalSenderName: string;
  maskSender: boolean;
  sanitizedHeader: string;
  stripCaptions: boolean;
}

// -------------------------------------------------------------
// 1. GhostModeBadgeSyncGovernor (Resolves #508)
// -------------------------------------------------------------
export class GhostModeBadgeSyncGovernor {
  private state: GhostBadgeState = {
    serverUnreadCount: 0,
    localUnreadCount: 0,
    displayedBadge: 0,
    ghostModeActive: false
  };

  public setGhostMode(active: boolean): void {
    this.state.ghostModeActive = active;
    this.updateDisplayedBadge();
  }

  public updateServerUnread(count: number): void {
    this.state.serverUnreadCount = Math.max(0, count);
    this.updateDisplayedBadge();
  }

  public markLocalChatRead(unreadDelta: number): void {
    // In ghost mode, reading a chat decreases local unread without telling server
    this.state.localUnreadCount = Math.max(0, (this.state.localUnreadCount || this.state.serverUnreadCount) - unreadDelta);
    this.updateDisplayedBadge();
  }

  private updateDisplayedBadge(): void {
    if (this.state.ghostModeActive) {
      // Display local unread badge so user sees accurate count of what THEY haven't read locally
      this.state.displayedBadge = this.state.localUnreadCount;
    } else {
      this.state.displayedBadge = this.state.serverUnreadCount;
    }
  }

  public getState(): GhostBadgeState {
    return { ...this.state };
  }
}

// -------------------------------------------------------------
// 2. SystemDarkThemeSyncGovernor (Resolves #495)
// -------------------------------------------------------------
export class SystemDarkThemeSyncGovernor {
  private state: SystemThemeState = {
    systemPrefersDark: false,
    appTheme: 'light',
    isAutoSyncEnabled: true,
    activePaletteId: 'palette_light'
  };

  public handleSystemThemeChange(isDark: boolean): SystemThemeState {
    this.state.systemPrefersDark = isDark;
    if (this.state.isAutoSyncEnabled) {
      this.state.appTheme = isDark ? 'dark' : 'light';
      this.state.activePaletteId = isDark ? 'palette_midnight_dark' : 'palette_day_light';
    }
    return { ...this.state };
  }

  public setAutoSync(enabled: boolean): void {
    this.state.isAutoSyncEnabled = enabled;
  }

  public getState(): SystemThemeState {
    return { ...this.state };
  }
}

// -------------------------------------------------------------
// 3. ScheduledMessageCancelGovernor (Resolves #466)
// -------------------------------------------------------------
export class ScheduledMessageCancelGovernor {
  private queue: Map<string, ScheduledMessageItem> = new Map();

  public scheduleMessage(item: ScheduledMessageItem): void {
    this.queue.set(item.id, { ...item, isCancelled: false });
  }

  public cancelScheduledMessage(id: string): { success: boolean; cancelledItem?: ScheduledMessageItem } {
    const item = this.queue.get(id);
    if (!item) {
      return { success: false };
    }

    if (item.sendTimestampMs <= Date.now()) {
      return { success: false }; // Already dispatched
    }

    item.isCancelled = true;
    this.queue.delete(id);
    return { success: true, cancelledItem: item };
  }

  public getPendingMessages(): ScheduledMessageItem[] {
    return Array.from(this.queue.values()).filter(i => !i.isCancelled);
  }
}

// -------------------------------------------------------------
// 4. SelfDeletedOutgoingRecallGovernor (Resolves #424)
// -------------------------------------------------------------
export class SelfDeletedOutgoingRecallGovernor {
  private archive: Map<string, DeletedMessageArchive> = new Map();
  private antiRecallEnabled = true;

  public setAntiRecallEnabled(enabled: boolean): void {
    this.antiRecallEnabled = enabled;
  }

  public interceptDeleteEvent(params: {
    messageId: string;
    chatId: string;
    text: string;
    isOutgoing: boolean;
  }): DeletedMessageArchive {
    const record: DeletedMessageArchive = {
      messageId: params.messageId,
      chatId: params.chatId,
      text: params.text,
      isOutgoing: params.isOutgoing,
      deletedAtTimestampMs: Date.now(),
      // Even if it is user's own outgoing message, retain in local archive if enabled!
      retainedInArchive: this.antiRecallEnabled
    };

    if (record.retainedInArchive) {
      this.archive.set(params.messageId, record);
    }

    return record;
  }

  public getArchivedMessage(messageId: string): DeletedMessageArchive | undefined {
    return this.archive.get(messageId);
  }
}

// -------------------------------------------------------------
// 5. ProactivePresencePollingGovernor (Resolves #417)
// -------------------------------------------------------------
export class ProactivePresencePollingGovernor {
  private presenceMap = new Map<string, UserPresenceState>();
  private readonly defaultTtlSec = 120; // 2 minutes presence TTL

  public recordPresence(userId: string, isOnline: boolean, timestampMs: number = Date.now()): void {
    this.presenceMap.set(userId, {
      userId,
      isOnline,
      lastSeenTimestampMs: timestampMs,
      ttlRemainingSec: this.defaultTtlSec,
      isStale: false
    });
  }

  public evaluatePresence(userId: string, currentTimestampMs: number = Date.now()): UserPresenceState | null {
    const presence = this.presenceMap.get(userId);
    if (!presence) return null;

    const elapsedSec = Math.floor((currentTimestampMs - presence.lastSeenTimestampMs) / 1000);
    const ttlRemaining = Math.max(0, this.defaultTtlSec - elapsedSec);
    const isStale = ttlRemaining === 0;

    return {
      ...presence,
      ttlRemainingSec: ttlRemaining,
      isStale,
      // If TTL expired, user is no longer considered actively online
      isOnline: isStale ? false : presence.isOnline
    };
  }
}

// -------------------------------------------------------------
// 6. GhostUnreadBookmarkGovernor (Resolves #372)
// -------------------------------------------------------------
export class GhostUnreadBookmarkGovernor {
  private bookmarks = new Map<string, GhostBookmark>();

  public trackLocalReading(chatId: string, locallyReadMsgId: number, serverMarkedMsgId: number): GhostBookmark {
    const bookmark: GhostBookmark = {
      chatId,
      lastLocallyReadMessageId: locallyReadMsgId,
      serverMarkedMessageId: serverMarkedMsgId,
      hasLocalUnreadGap: locallyReadMsgId > serverMarkedMsgId
    };
    this.bookmarks.set(chatId, bookmark);
    return bookmark;
  }

  public getBookmark(chatId: string): GhostBookmark | undefined {
    return this.bookmarks.get(chatId);
  }
}

// -------------------------------------------------------------
// 7. ForwardedSenderPrivacyGovernor (Resolves #366)
// -------------------------------------------------------------
export class ForwardedSenderPrivacyGovernor {
  public sanitizeForwardHeader(payload: {
    senderId: string;
    senderName: string;
    hideSender: boolean;
  }): ForwardPrivacyPayload {
    if (payload.hideSender) {
      return {
        originalSenderId: '',
        originalSenderName: '',
        maskSender: true,
        sanitizedHeader: 'Forwarded message',
        stripCaptions: false
      };
    }

    return {
      originalSenderId: payload.senderId,
      originalSenderName: payload.senderName,
      maskSender: false,
      sanitizedHeader: `Forwarded from ${payload.senderName}`,
      stripCaptions: false
    };
  }
}
