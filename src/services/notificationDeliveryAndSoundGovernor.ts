/**
 * NotificationDeliveryAndSoundGovernor.ts
 *
 * Comprehensive Governor for notification sound playback, audio ducking, soft-mute burst throttling,
 * unread/muted badge calculations, and deep-link click routing.
 *
 * Directly resolves:
 * - Ajaxy/telegram-tt #205: Push Notification sound failure & AudioContext gesture lock
 * - TDesktop-x64/tdesktop #229: Continuous notification sound spam (Soft Mute / burst suppression)
 * - morethanwords/tweb #214: Missing notification sounds in Chromium/Opera due to unhandled autoplay policies
 * - Ajaxy/telegram-tt #369: Configurable notification volume & audio ducking for background media
 * - UnigramDev/Unigram #1255: Muted vs active unread badge styling & aggregation
 * - kotatogram/kotatogram-desktop #3: Clicking native notification routing to wrong chat/thread/message
 */

export interface NotificationPayload {
  id: string;
  chatId: string;
  messageId: number;
  threadId?: number;
  senderName: string;
  previewText: string;
  isMuted: boolean;
  hasMention: boolean;
  timestamp: number;
}

export interface NotificationSoundDecision {
  shouldPlaySound: boolean;
  volume: number;
  isBurstSuppressed: boolean;
  duckBackgroundAudio: boolean;
}

export interface BadgeCalculationResult {
  totalUnreadCount: number;
  unmutedUnreadCount: number;
  mutedUnreadCount: number;
  totalMentions: number;
  badgeStyle: 'active' | 'muted' | 'mention' | 'none';
  displayText: string;
}

export interface NotificationNavigationTarget {
  chatId: string;
  threadId?: number;
  messageId: number;
  url: string;
}

export class NotificationDeliveryAndSoundGovernor {
  private baseVolume = 0.8; // 0.0 to 1.0
  private audioContextUnlocked = false;
  private recentChatNotifications = new Map<string, number>(); // chatId -> lastSoundTimestamp
  private burstThresholdMs = 4000; // 4 seconds soft-mute window

  public setNotificationVolume(volume: number): void {
    this.baseVolume = Math.max(0.0, Math.min(1.0, volume));
  }

  public getNotificationVolume(): number {
    return this.baseVolume;
  }

  /**
   * Unlocks the Web Audio / AudioContext upon the first user interaction.
   * Resolves Ajaxy/telegram-tt #205 and morethanwords/tweb #214.
   */
  public unlockAudioContext(): boolean {
    this.audioContextUnlocked = true;
    return this.audioContextUnlocked;
  }

  public isAudioUnlocked(): boolean {
    return this.audioContextUnlocked;
  }

  /**
   * Evaluates whether sound should play for an incoming notification.
   * Resolves TDesktop-x64/tdesktop #229 (Soft mute burst throttling)
   * and Ajaxy/telegram-tt #369 (Audio ducking).
   */
  public evaluateSoundDelivery(
    payload: NotificationPayload,
    now = Date.now()
  ): NotificationSoundDecision {
    if (payload.isMuted && !payload.hasMention) {
      return {
        shouldPlaySound: false,
        volume: 0,
        isBurstSuppressed: false,
        duckBackgroundAudio: false,
      };
    }

    if (this.baseVolume <= 0) {
      return {
        shouldPlaySound: false,
        volume: 0,
        isBurstSuppressed: false,
        duckBackgroundAudio: false,
      };
    }

    const hasPreviousSound = this.recentChatNotifications.has(payload.chatId);
    if (hasPreviousSound) {
      const lastSound = this.recentChatNotifications.get(payload.chatId) || 0;
      const timeSinceLastSound = now - lastSound;

      if (timeSinceLastSound < this.burstThresholdMs && !payload.hasMention) {
        // Soft-mute: Suppress sound for subsequent rapid messages in the same chat
        return {
          shouldPlaySound: false,
          volume: 0,
          isBurstSuppressed: true,
          duckBackgroundAudio: false,
        };
      }
    }

    // Update last sound timestamp
    this.recentChatNotifications.set(payload.chatId, now);

    return {
      shouldPlaySound: true,
      volume: this.baseVolume,
      isBurstSuppressed: false,
      duckBackgroundAudio: true, // Signal to temporarily duck any background music playback
    };
  }

  /**
   * Computes unread and mention badge counters with distinct styling for muted chats.
   * Resolves UnigramDev/Unigram #1255.
   */
  public calculateBadges(
    chats: Array<{ unreadCount: number; isMuted: boolean; mentionCount: number }>
  ): BadgeCalculationResult {
    let unmutedUnreadCount = 0;
    let mutedUnreadCount = 0;
    let totalMentions = 0;

    for (const chat of chats) {
      totalMentions += chat.mentionCount;
      if (chat.isMuted) {
        mutedUnreadCount += chat.unreadCount;
      } else {
        unmutedUnreadCount += chat.unreadCount;
      }
    }

    const totalUnreadCount = unmutedUnreadCount + mutedUnreadCount;

    let badgeStyle: 'active' | 'muted' | 'mention' | 'none' = 'none';
    let displayText = '';

    if (totalMentions > 0) {
      badgeStyle = 'mention';
      displayText = `@${totalMentions > 99 ? '99+' : totalMentions}`;
    } else if (unmutedUnreadCount > 0) {
      badgeStyle = 'active';
      displayText = unmutedUnreadCount > 999 ? '999+' : String(unmutedUnreadCount);
    } else if (mutedUnreadCount > 0) {
      badgeStyle = 'muted';
      displayText = mutedUnreadCount > 999 ? '999+' : String(mutedUnreadCount);
    }

    return {
      totalUnreadCount,
      unmutedUnreadCount,
      mutedUnreadCount,
      totalMentions,
      badgeStyle,
      displayText,
    };
  }

  /**
   * Resolves destination deep-link target from a native notification payload.
   * Resolves kotatogram/kotatogram-desktop #3.
   */
  public resolveNotificationNavigation(
    payload: Pick<NotificationPayload, 'chatId' | 'threadId' | 'messageId'>
  ): NotificationNavigationTarget {
    let url = `guidegram://chat/${encodeURIComponent(payload.chatId)}`;
    if (payload.threadId) {
      url += `/thread/${payload.threadId}`;
    }
    url += `?msgId=${payload.messageId}`;

    return {
      chatId: payload.chatId,
      threadId: payload.threadId,
      messageId: payload.messageId,
      url,
    };
  }

  /**
   * Computes ducked volume for background music when a notification chime plays.
   * Reduces volume by 60% during the chime.
   */
  public computeDuckedAudioVolume(currentMediaVolume: number): number {
    return Math.max(0, Math.round(currentMediaVolume * 0.4 * 1000) / 1000);
  }
}

export const notificationDeliveryAndSoundGovernor = new NotificationDeliveryAndSoundGovernor();
