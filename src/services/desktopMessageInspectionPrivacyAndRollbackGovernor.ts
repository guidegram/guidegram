/**
 * Message ID Inspector, Protected Content Watermark, Service Action Click Hit-Testing,
 * macOS Dock Badge, Login Flow Poller, Ghost Mode Privacy & Auto-Rollback Governor
 *
 * Hardening against competitor issues:
 * - kotatogram/kotatogram-desktop#357: Show message ID in context menu & copy message ID.
 * - kotatogram/kotatogram-desktop#290: Protected content watermarking and screen recording blackout flag.
 * - kotatogram/kotatogram-desktop#454: Service action message hit-test bounds and click interception.
 * - kotatogram/kotatogram-desktop#316: macOS Dock icon asset resolution and live unread badge counter.
 * - kotatogram/kotatogram-desktop#406: Login session QR code polling and rate limit backoff.
 * - kotatogram/kotatogram-desktop#421: Ghost mode privacy suite (suppress read receipts, hide online, hide typing).
 * - telegramdesktop/tdesktop#29606: Post-update crash detection and automatic binary rollback.
 */

export interface MessageInspectorData {
  messageId: number;
  chatId: string;
  senderId: string;
  date: Date;
  isServiceMessage: boolean;
}

export class MessageIdInspectorManager {
  private isDeveloperModeEnabled = false;

  setDeveloperMode(enabled: boolean): void {
    this.isDeveloperModeEnabled = enabled;
  }

  getContextMenuItems(data: MessageInspectorData): { label: string; action: string; value: string }[] {
    const items = [
      { label: 'Copy Text', action: 'copy_text', value: '' },
      { label: 'Reply', action: 'reply', value: data.messageId.toString() },
    ];

    if (this.isDeveloperModeEnabled) {
      items.push({
        label: `Copy Message ID (#${data.messageId})`,
        action: 'copy_message_id',
        value: data.messageId.toString(),
      });
      items.push({
        label: `Copy Chat ID (${data.chatId})`,
        action: 'copy_chat_id',
        value: data.chatId,
      });
    }

    return items;
  }
}

export class ProtectedContentWatermarkGovernor {
  computeProtectionOverlay(isProtected: boolean, currentUserId: string): {
    screenRecordingBlackout: boolean;
    watermarkText: string;
    overlayCss: string;
  } {
    if (!isProtected) {
      return {
        screenRecordingBlackout: false,
        watermarkText: '',
        overlayCss: 'display: none;',
      };
    }

    return {
      screenRecordingBlackout: true,
      watermarkText: `GUIDEGRAM PROTECTED • UID ${currentUserId}`,
      overlayCss: 'pointer-events: none; opacity: 0.15; user-select: none;',
    };
  }
}

export interface ServiceActionArea {
  actionType: 'user_profile' | 'group_settings' | 'pin_navigation';
  x: number;
  y: number;
  width: number;
  height: number;
  targetId: string;
}

export class ServiceActionHitTestGovernor {
  private actions: ServiceActionArea[] = [];

  registerActionArea(area: ServiceActionArea): void {
    this.actions.push(area);
  }

  clearActionAreas(): void {
    this.actions = [];
  }

  hitTest(clickX: number, clickY: number): ServiceActionArea | null {
    for (const action of this.actions) {
      if (
        clickX >= action.x &&
        clickX <= action.x + action.width &&
        clickY >= action.y &&
        clickY <= action.y + action.height
      ) {
        return action;
      }
    }
    return null;
  }
}

export class MacOsDockBadgeManager {
  private currentUnreadCount = 0;

  setUnreadCount(count: number): { badgeString: string; isBouncing: boolean } {
    this.currentUnreadCount = Math.max(0, count);
    if (this.currentUnreadCount === 0) {
      return { badgeString: '', isBouncing: false };
    }

    const badgeString = this.currentUnreadCount > 9999 ? '9999+' : this.currentUnreadCount.toString();
    return {
      badgeString,
      isBouncing: this.currentUnreadCount > 0,
    };
  }

  getBadgeCount(): number {
    return this.currentUnreadCount;
  }
}

export interface QrLoginPollState {
  token: string;
  expiresAt: number;
  pollIntervalMs: number;
  status: 'pending' | 'authenticated' | 'expired' | 'rate_limited';
}

export class LoginFlowResiliencePoller {
  private pollState: QrLoginPollState = {
    token: '',
    expiresAt: 0,
    pollIntervalMs: 2000,
    status: 'pending',
  };

  startPolling(token: string, validitySeconds = 120): QrLoginPollState {
    this.pollState = {
      token,
      expiresAt: Date.now() + validitySeconds * 1000,
      pollIntervalMs: 2000,
      status: 'pending',
    };
    return { ...this.pollState };
  }

  handleServerResponse(responseCode: 'wait' | 'ok' | 'flood_wait' | 'expired'): QrLoginPollState {
    if (Date.now() > this.pollState.expiresAt) {
      this.pollState.status = 'expired';
      return { ...this.pollState };
    }

    if (responseCode === 'ok') {
      this.pollState.status = 'authenticated';
      return { ...this.pollState };
    }

    if (responseCode === 'flood_wait') {
      // Exponential backoff to avoid IP throttling
      this.pollState.pollIntervalMs = Math.min(this.pollState.pollIntervalMs * 2, 10000);
      this.pollState.status = 'rate_limited';
      return { ...this.pollState };
    }

    this.pollState.status = 'pending';
    return { ...this.pollState };
  }

  getState(): QrLoginPollState {
    return { ...this.pollState };
  }
}

export interface GhostModeSettings {
  suppressReadReceipts: boolean;
  hideOnlineStatus: boolean;
  hideTypingStatus: boolean;
}

export class GhostModePrivacyGovernor {
  private settings: GhostModeSettings = {
    suppressReadReceipts: false,
    hideOnlineStatus: false,
    hideTypingStatus: false,
  };

  setGhostMode(settings: Partial<GhostModeSettings>): GhostModeSettings {
    this.settings = { ...this.settings, ...settings };
    return { ...this.settings };
  }

  shouldSendReadAcknowledgment(): boolean {
    return !this.settings.suppressReadReceipts;
  }

  shouldSendOnlinePresence(): boolean {
    return !this.settings.hideOnlineStatus;
  }

  shouldSendTypingActivity(): boolean {
    return !this.settings.hideTypingStatus;
  }

  getSettings(): GhostModeSettings {
    return { ...this.settings };
  }
}

export class PostUpdateAutoRollbackGovernor {
  private previousVersionPath: string | null = null;
  private currentVersionStartedAt = Date.now();
  private hasReportedHealthy = false;

  setPreviousVersionBackup(path: string): void {
    this.previousVersionPath = path;
  }

  markLaunchHealthy(): void {
    this.hasReportedHealthy = true;
  }

  checkCrashOnStartup(elapsedSinceStartMs: number): {
    shouldRollback: boolean;
    rollbackTarget?: string;
  } {
    // If crash occurs within 10 seconds of launch and hasn't reported healthy, trigger automatic rollback
    if (!this.hasReportedHealthy && elapsedSinceStartMs < 10000 && this.previousVersionPath) {
      return {
        shouldRollback: true,
        rollbackTarget: this.previousVersionPath,
      };
    }

    return { shouldRollback: false };
  }
}

export class DesktopMessageInspectionPrivacyAndRollbackGovernor {
  public inspector = new MessageIdInspectorManager();
  public watermark = new ProtectedContentWatermarkGovernor();
  public serviceHitTest = new ServiceActionHitTestGovernor();
  public dockBadge = new MacOsDockBadgeManager();
  public loginPoller = new LoginFlowResiliencePoller();
  public ghostMode = new GhostModePrivacyGovernor();
  public autoRollback = new PostUpdateAutoRollbackGovernor();
}
