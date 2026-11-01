/**
 * Unigram Video Call Touch Targets, Message Screen Reader Accessibility,
 * Multi-Account Hotkey Switcher & Send Message Error Feedback Governor
 * 
 * Hardens Guidegram against Windows UWP/Unigram accessibility & UX defects:
 * - #2455: Group video call touch target size (48x48px min) & touch gesture isolation.
 * - #2450: Accessible message prefix announcements (Reply, Forward, Pinned).
 * - #2332: Screen reader announcement for audio files, media types & durations.
 * - #2220: Accessible inline keyboard button count & label announcements.
 * - #2113: Chat selection toolbar unlabeled button automation properties.
 * - #2565: Multi-account hotkey switcher (Ctrl+1..9) with instant session swap.
 * - #2915: Actionable error dialog & toast feedback on send message failures.
 */

/**
 * #2455: Video Call Touch Target Size & Touch Gesture Governor
 */
export interface TouchControlTarget {
  id: string;
  label: string;
  width: number;
  height: number;
  effectiveHitArea: { width: number; height: number };
}

export class VideoCallTouchTargetGovernor {
  private readonly minTouchSizePx = 48; // Windows touch guidelines minimum

  public evaluateTouchTarget(id: string, label: string, rawWidth: number, rawHeight: number): TouchControlTarget {
    const effectiveWidth = Math.max(rawWidth, this.minTouchSizePx);
    const effectiveHeight = Math.max(rawHeight, this.minTouchSizePx);

    return {
      id,
      label,
      width: rawWidth,
      height: rawHeight,
      effectiveHitArea: {
        width: effectiveWidth,
        height: effectiveHeight
      }
    };
  }

  public handleTouchHitTest(target: TouchControlTarget, touchX: number, touchY: number): boolean {
    const halfW = target.effectiveHitArea.width / 2;
    const halfH = target.effectiveHitArea.height / 2;
    // Assuming center at (0, 0) for relative hit test
    return Math.abs(touchX) <= halfW && Math.abs(touchY) <= halfH;
  }
}

/**
 * #2450, #2332, #2220: Message Accessibility Announcer Governor
 */
export interface AccessibleMessageMetadata {
  senderName: string;
  text?: string;
  prefix?: { type: 'reply' | 'forward' | 'pinned'; source: string };
  media?: {
    type: 'audio' | 'voice' | 'video' | 'document';
    fileName?: string;
    durationSec?: number;
    sizeBytes?: number;
    mimeType?: string;
  };
  inlineButtons?: string[];
}

export class MessageAccessibilityAnnouncerGovernor {
  public generateFullAnnouncement(msg: AccessibleMessageMetadata): string {
    const segments: string[] = [];

    // 1. Prefix announcement (#2450)
    if (msg.prefix) {
      if (msg.prefix.type === 'reply') {
        segments.push(`In reply to ${msg.prefix.source}`);
      } else if (msg.prefix.type === 'forward') {
        segments.push(`Forwarded from ${msg.prefix.source}`);
      } else if (msg.prefix.type === 'pinned') {
        segments.push('Pinned message');
      }
    }

    // 2. Sender
    segments.push(`From ${msg.senderName}`);

    // 3. Media announcement (#2332)
    if (msg.media) {
      const mediaDesc = this.formatMediaAnnouncement(msg.media);
      segments.push(mediaDesc);
    }

    // 4. Text content
    if (msg.text) {
      segments.push(msg.text);
    }

    // 5. Inline buttons announcement (#2220)
    if (msg.inlineButtons && msg.inlineButtons.length > 0) {
      const btnCount = msg.inlineButtons.length;
      const btnLabels = msg.inlineButtons.map(b => `[${b}]`).join(', ');
      segments.push(`Has ${btnCount} interactive button${btnCount > 1 ? 's' : ''}: ${btnLabels}`);
    }

    return segments.join('. ') + '.';
  }

  private formatMediaAnnouncement(media: NonNullable<AccessibleMessageMetadata['media']>): string {
    let desc = `${media.type.toUpperCase()} file`;
    if (media.durationSec) {
      const mins = Math.floor(media.durationSec / 60);
      const secs = media.durationSec % 60;
      desc += `, duration ${mins} minute${mins !== 1 ? 's' : ''} ${secs} second${secs !== 1 ? 's' : ''}`;
    }
    if (media.sizeBytes) {
      const mb = (media.sizeBytes / (1024 * 1024)).toFixed(1);
      desc += `, size ${mb} MB`;
    }
    if (media.mimeType) {
      desc += `, type ${media.mimeType}`;
    }
    return desc;
  }
}

/**
 * #2113: Chat Selection Toolbar Accessible Labels Governor
 */
export interface ToolbarButton {
  id: string;
  automationId: string;
  accessibleName: string;
  tooltipText: string;
}

export class ChatListSelectionToolbarGovernor {
  public getSelectionToolbarButtons(): ToolbarButton[] {
    return [
      {
        id: 'btn_clear',
        automationId: 'ChatList_ClearSelectionButton',
        accessibleName: 'Clear selection',
        tooltipText: 'Deselect all selected chats (Esc)'
      },
      {
        id: 'btn_mark_read',
        automationId: 'ChatList_MarkAsReadButton',
        accessibleName: 'Mark selected chats as read',
        tooltipText: 'Mark all selected chats as read'
      },
      {
        id: 'btn_delete',
        automationId: 'ChatList_DeleteSelectedButton',
        accessibleName: 'Delete selected chats',
        tooltipText: 'Delete or leave selected chats'
      }
    ];
  }
}

/**
 * #2565: Multi-Account Keyboard Shortcut Governor
 */
export interface AccountSession {
  accountId: number;
  phoneNumber: string;
  displayName: string;
  unreadCount: number;
}

export class MultiAccountKeyboardShortcutGovernor {
  private accounts: AccountSession[] = [];
  private activeAccountId: number | null = null;

  public registerAccount(acc: AccountSession): void {
    this.accounts.push(acc);
    if (this.activeAccountId === null) {
      this.activeAccountId = acc.accountId;
    }
  }

  public handleShortcut(key: string, ctrlKey: boolean): { switched: boolean; activeAccount: AccountSession | null } {
    if (!ctrlKey) {
      return { switched: false, activeAccount: this.getActiveAccount() };
    }

    const index = parseInt(key, 10);
    if (!isNaN(index) && index >= 1 && index <= this.accounts.length) {
      const target = this.accounts[index - 1];
      this.activeAccountId = target.accountId;
      return { switched: true, activeAccount: target };
    }

    return { switched: false, activeAccount: this.getActiveAccount() };
  }

  public getActiveAccount(): AccountSession | null {
    return this.accounts.find(a => a.accountId === this.activeAccountId) || null;
  }
}

/**
 * #2915: Send Message Error Feedback & Dialog Governor
 */
export interface SendErrorFeedback {
  showDialog: boolean;
  dialogTitle: string;
  dialogMessage: string;
  retryCountdownSec: number | null;
  actionRequired: 'wait' | 'contact_admin' | 'none';
}

export class SendMessageErrorFeedbackGovernor {
  public parseSendError(errorCode: string): SendErrorFeedback {
    if (errorCode.startsWith('FLOOD_WAIT_')) {
      const sec = parseInt(errorCode.replace('FLOOD_WAIT_', ''), 10) || 30;
      return {
        showDialog: true,
        dialogTitle: 'Too Many Requests',
        dialogMessage: `Please wait ${sec} seconds before sending another message.`,
        retryCountdownSec: sec,
        actionRequired: 'wait'
      };
    }

    if (errorCode === 'USER_BANNED_IN_CHANNEL' || errorCode === 'CHAT_RESTRICTED') {
      return {
        showDialog: true,
        dialogTitle: 'Action Not Allowed',
        dialogMessage: 'You are restricted from sending messages in this chat or channel.',
        retryCountdownSec: null,
        actionRequired: 'contact_admin'
      };
    }

    if (errorCode === 'PEER_FLOOD') {
      return {
        showDialog: true,
        dialogTitle: 'Account Restricted',
        dialogMessage: 'You can only message mutually saved contacts due to temporary spam protection.',
        retryCountdownSec: null,
        actionRequired: 'wait'
      };
    }

    return {
      showDialog: true,
      dialogTitle: 'Message Not Sent',
      dialogMessage: `Could not send message (${errorCode}). Please check your connection.`,
      retryCountdownSec: null,
      actionRequired: 'none'
    };
  }
}
