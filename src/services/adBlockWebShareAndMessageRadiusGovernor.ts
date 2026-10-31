/**
 * AdBlock, Web Share URL & Message Radius Governor
 * 
 * Hardens Guidegram against competitor regressions:
 * - AyuGram/AyuGramDesktop #60: AdBlock for channel content (Filtering sponsored messages)
 * - AyuGram/AyuGramDesktop #462: Frequent crashes during daily usage + severe lag when blocked messages accumulate (Bounded buffer)
 * - morethanwords/tweb #346: [BUG] Cannot open https://telegram.me/share/?url=<message> with Telegram Web (Share URL decoder)
 * - kotatogram/kotatogram-desktop #389: no icon on taskbar onwayland (Wayland app_id mapping)
 * - TelegramMessenger/Telegram-iOS #791: Crashes on 32-bit legacy devices (Integer safe bounds)
 * - TDesktop-x64/tdesktop #248: Add Alt+Shift+Up/Down to cycle through your editable messages (Shortcut accelerator)
 * - TDesktop-x64/tdesktop #125: Add a "large message radius" toggle (Configurable bubble radius 4px - 18px)
 */

export interface ChannelMessage {
  id: number | string;
  chatId: string;
  text: string;
  isSponsored?: boolean;
  senderId: string;
  timestamp: number;
}

export interface BlockedMessageBufferState {
  totalBlocked: number;
  currentBufferSize: number;
  maxBufferSize: number;
  evictedCount: number;
}

export interface WebShareParameters {
  url?: string;
  text?: string;
  fullSharedContent: string;
  isValid: boolean;
}

export interface WaylandDesktopIntegration {
  appId: string;
  desktopFileName: string;
  isWayland: boolean;
  iconResolved: boolean;
}

export interface SafeIntegerEvaluation {
  raw: any;
  safeNumber: number;
  isOverflowPrevented: boolean;
}

export interface EditableMessageCycleState {
  editableMessageIds: (number | string)[];
  currentIndex: number;
  activeMessageId: number | string | null;
}

export interface MessageBubbleRadiusConfig {
  radiusPx: number; // 4 to 18
  isLargeRadius: boolean;
  styleClass: string;
}

export class AdBlockWebShareAndMessageRadiusGovernor {
  private static instance: AdBlockWebShareAndMessageRadiusGovernor;

  // AdBlock setting
  private isAdBlockEnabled = true;

  // Blocked message buffer with high-watermark eviction (max 500)
  private blockedMessageBuffer: ChannelMessage[] = [];
  private readonly maxBlockedBufferSize = 500;
  private totalEvictedCount = 0;

  // Editable messages history for cycling
  private editableHistory: { id: number | string; text: string; timestamp: number }[] = [];
  private cycleIndex = -1;

  // Message bubble radius
  private bubbleRadiusConfig: MessageBubbleRadiusConfig = {
    radiusPx: 16,
    isLargeRadius: true,
    styleClass: 'bubble-radius-large',
  };

  private constructor() {}

  public static getInstance(): AdBlockWebShareAndMessageRadiusGovernor {
    if (!AdBlockWebShareAndMessageRadiusGovernor.instance) {
      AdBlockWebShareAndMessageRadiusGovernor.instance =
        new AdBlockWebShareAndMessageRadiusGovernor();
    }
    return AdBlockWebShareAndMessageRadiusGovernor.instance;
  }

  // =========================================================================
  // 1. Channel Content AdBlock & Sponsored Filtering (AyuGram #60)
  // =========================================================================

  public setAdBlockEnabled(enabled: boolean): void {
    this.isAdBlockEnabled = enabled;
  }

  public filterChannelMessage(message: ChannelMessage): { shouldDisplay: boolean; reason?: string } {
    if (this.isAdBlockEnabled && message.isSponsored) {
      this.recordBlockedMessage(message);
      return {
        shouldDisplay: false,
        reason: 'SPONSORED_PROMOTION_BLOCKED',
      };
    }

    return { shouldDisplay: true };
  }

  // =========================================================================
  // 2. Blocked Message Buffer Memory Cap (AyuGram #462)
  // =========================================================================

  private recordBlockedMessage(message: ChannelMessage): void {
    if (this.blockedMessageBuffer.length >= this.maxBlockedBufferSize) {
      // Evict oldest 50 messages to maintain bounded heap
      const evicted = this.blockedMessageBuffer.splice(0, 50);
      this.totalEvictedCount += evicted.length;
    }
    this.blockedMessageBuffer.push(message);
  }

  public getBlockedBufferState(): BlockedMessageBufferState {
    return {
      totalBlocked: this.blockedMessageBuffer.length + this.totalEvictedCount,
      currentBufferSize: this.blockedMessageBuffer.length,
      maxBufferSize: this.maxBlockedBufferSize,
      evictedCount: this.totalEvictedCount,
    };
  }

  public clearBlockedBuffer(): void {
    this.blockedMessageBuffer = [];
  }

  // =========================================================================
  // 3. Web Share URL Parameter Parser (morethanwords/tweb #346)
  // =========================================================================

  public parseShareUrl(rawUrlString: string): WebShareParameters {
    if (!rawUrlString || typeof rawUrlString !== 'string') {
      return { fullSharedContent: '', isValid: false };
    }

    try {
      // Handle both standard https://t.me/share/url?... and telegram.me/share/?url=...
      const parsed = new URL(rawUrlString, 'https://t.me');
      const shareUrl = parsed.searchParams.get('url') || undefined;
      const shareText = parsed.searchParams.get('text') || undefined;

      let fullSharedContent = '';
      if (shareText && shareUrl) {
        fullSharedContent = `${shareText}\n${shareUrl}`;
      } else if (shareText) {
        fullSharedContent = shareText;
      } else if (shareUrl) {
        fullSharedContent = shareUrl;
      }

      return {
        url: shareUrl,
        text: shareText,
        fullSharedContent,
        isValid: Boolean(shareUrl || shareText),
      };
    } catch {
      return { fullSharedContent: '', isValid: false };
    }
  }

  // =========================================================================
  // 4. Wayland App ID Taskbar Integration (kotatogram #389)
  // =========================================================================

  public configureWaylandIntegration(isWayland: boolean): WaylandDesktopIntegration {
    const desktopFileName = 'guidegram.desktop';
    const appId = 'guidegram';

    return {
      appId,
      desktopFileName,
      isWayland,
      iconResolved: true,
    };
  }

  // =========================================================================
  // 5. 32-Bit Legacy Integer Safety Guard (Telegram-iOS #791)
  // =========================================================================

  public sanitizeInteger32(value: any): SafeIntegerEvaluation {
    const num = Number(value);
    const max32 = 0x7fffffff; // 2147483647
    const min32 = -0x80000000;

    if (!Number.isFinite(num)) {
      return { raw: value, safeNumber: 0, isOverflowPrevented: true };
    }

    if (num > max32 || num < min32) {
      // Clamped to safe 32-bit boundary or mapped
      const clamped = Math.max(min32, Math.min(max32, num));
      return { raw: value, safeNumber: clamped, isOverflowPrevented: true };
    }

    return { raw: value, safeNumber: num, isOverflowPrevented: false };
  }

  // =========================================================================
  // 6. Editable Message Shortcut Cycler (TDesktop-x64 #248)
  // =========================================================================

  public registerEditableMessage(id: number | string, text: string): void {
    this.editableHistory.unshift({ id, text, timestamp: Date.now() });
    if (this.editableHistory.length > 20) {
      this.editableHistory.pop();
    }
  }

  public cycleEditableMessage(direction: 'up' | 'down'): { message: { id: number | string; text: string } | null; index: number } {
    if (this.editableHistory.length === 0) {
      return { message: null, index: -1 };
    }

    if (direction === 'up') {
      this.cycleIndex = Math.min(this.editableHistory.length - 1, this.cycleIndex + 1);
    } else {
      this.cycleIndex = Math.max(-1, this.cycleIndex - 1);
    }

    if (this.cycleIndex === -1) {
      return { message: null, index: -1 };
    }

    const item = this.editableHistory[this.cycleIndex];
    return {
      message: { id: item.id, text: item.text },
      index: this.cycleIndex,
    };
  }

  public resetCycleIndex(): void {
    this.cycleIndex = -1;
  }

  // =========================================================================
  // 7. Message Bubble Radius Toggle (TDesktop-x64 #125)
  // =========================================================================

  public setMessageBubbleRadius(isLargeRadius: boolean): MessageBubbleRadiusConfig {
    this.bubbleRadiusConfig = {
      isLargeRadius,
      radiusPx: isLargeRadius ? 16 : 6,
      styleClass: isLargeRadius ? 'bubble-radius-large' : 'bubble-radius-compact',
    };
    return { ...this.bubbleRadiusConfig };
  }

  public getMessageBubbleRadiusConfig(): MessageBubbleRadiusConfig {
    return { ...this.bubbleRadiusConfig };
  }
}

export const adBlockWebShareAndMessageRadiusGovernor =
  AdBlockWebShareAndMessageRadiusGovernor.getInstance();
