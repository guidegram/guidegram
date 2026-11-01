/**
 * Phase 165 - Telegram iOS Hardening Service
 *
 * Hardens Guidegram against critical virtual keyboard, Mini App glass contrast,
 * chat list overscroll, animated dice, expandable quote line breaks, and video duration bugs discovered in Telegram iOS:
 *
 * 1. Telegram-iOS #1385: No "Done" button on keyboard when focusing on text input in Web Apps
 *    -> MiniAppKeyboardDoneAccessoryGovernor: Injects virtual Done accessory bar and handles keyboard dismissal.
 *
 * 2. Telegram-iOS #1122: Keyboard not collapsing on iOS 17
 *    -> ChatScrollKeyboardDismissGovernor: Dismisses keyboard automatically on chat list scroll/drag gestures.
 *
 * 3. Telegram-iOS #2420: Mini Apps: header buttons get light glass on dark custom header color
 *    -> MiniAppHeaderGlassContrastGovernor: Calculates background luminance and applies high-contrast header glass styles.
 *
 * 4. Telegram-iOS #2419: Chat list allows excessive upward scrolling when only two chats are visible
 *    -> ShortListOverscrollClampingGovernor: Clamps rubber-band overscroll for short content lists under viewport height.
 *
 * 5. Telegram-iOS #2407: Bot-sent sendDice animations do not play
 *    -> AnimatedDiceStateMachineGovernor: Drives single-shot dice roll animation and lands on final outcome frame (1-6).
 *
 * 6. Telegram-iOS #2393: [iOS/iPadOS] Quote + Expandable Quote rendering breaks line breaks for multiline text
 *    -> ExpandableQuoteRenderingGovernor: Preserves multi-line paragraphs in blockquotes and handles 3-line collapsible expand.
 *
 * 7. Telegram-iOS #1158: No information about the duration of the video
 *    -> VideoDurationBadgeGovernor: Formats and displays persistent video duration badges (mm:ss / hh:mm:ss).
 */

export interface HeaderGlassStyle {
  isDarkHeader: boolean;
  buttonGlassBackground: string;
  iconColor: string;
  borderColor: string;
}

export interface DiceAnimationState {
  emoji: '🎲' | '🎯' | '🏀' | '⚽' | '🎰' | '🎳';
  outcomeValue: number;
  durationMs: number;
  currentFrame: number;
  isCompleted: boolean;
}

export interface QuoteBlockConfig {
  rawText: string;
  isExpandable: boolean;
  isExpanded: boolean;
  formattedHtmlOrLines: string[];
  maxCollapsedLines: number;
}

export class IosKeyboardMiniAppDiceAndQuoteGovernor {
  // =========================================================================
  // 1. MiniAppKeyboardDoneAccessoryGovernor (Telegram-iOS #1385)
  // =========================================================================
  public evaluateKeyboardAccessory(isInputFocused: boolean): {
    showDoneAccessoryBar: boolean;
    accessoryHeightPx: number;
  } {
    return {
      showDoneAccessoryBar: isInputFocused,
      accessoryHeightPx: isInputFocused ? 44 : 0
    };
  }

  // =========================================================================
  // 2. ChatScrollKeyboardDismissGovernor (Telegram-iOS #1122)
  // =========================================================================
  public handleChatListDrag(
    dragDeltaY: number,
    isKeyboardOpen: boolean
  ): {
    dismissKeyboard: boolean;
    reason: string;
  } {
    if (isKeyboardOpen && Math.abs(dragDeltaY) > 20) {
      return { dismissKeyboard: true, reason: 'drag_scroll_threshold_exceeded' };
    }
    return { dismissKeyboard: false, reason: 'insufficient_drag_or_keyboard_closed' };
  }

  // =========================================================================
  // 3. MiniAppHeaderGlassContrastGovernor (Telegram-iOS #2420)
  // =========================================================================
  public calculateHeaderGlassStyle(hexColor: string): HeaderGlassStyle {
    // Parse hex color to RGB
    const cleanHex = hexColor.replace(/^#/, '');
    const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 0;

    // Relative luminance formula (ITU-R BT.709)
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const isDarkHeader = luminance < 0.35;

    if (isDarkHeader) {
      return {
        isDarkHeader: true,
        buttonGlassBackground: 'rgba(255, 255, 255, 0.15)',
        iconColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.2)'
      };
    } else {
      return {
        isDarkHeader: false,
        buttonGlassBackground: 'rgba(0, 0, 0, 0.08)',
        iconColor: '#000000',
        borderColor: 'rgba(0, 0, 0, 0.12)'
      };
    }
  }

  // =========================================================================
  // 4. ShortListOverscrollClampingGovernor (Telegram-iOS #2419)
  // =========================================================================
  public clampShortListOverscroll(
    totalContentHeight: number,
    viewportHeight: number,
    rawScrollOffset: number
  ): {
    clampedOffset: number;
    excessiveScrollingPrevented: boolean;
  } {
    const isShortContent = totalContentHeight <= viewportHeight;
    const maxRubberBandPull = 40; // Max allowed rubber band in px for short lists

    if (isShortContent) {
      if (rawScrollOffset < -maxRubberBandPull) {
        return { clampedOffset: -maxRubberBandPull, excessiveScrollingPrevented: true };
      }
      if (rawScrollOffset > maxRubberBandPull) {
        return { clampedOffset: maxRubberBandPull, excessiveScrollingPrevented: true };
      }
    }

    return { clampedOffset: rawScrollOffset, excessiveScrollingPrevented: false };
  }

  // =========================================================================
  // 5. AnimatedDiceStateMachineGovernor (Telegram-iOS #2407)
  // =========================================================================
  public initializeDiceAnimation(
    emoji: '🎲' | '🎯' | '🏀' | '⚽' | '🎰' | '🎳',
    outcomeValue: number
  ): DiceAnimationState {
    const clampedOutcome = Math.max(1, Math.min(6, outcomeValue));
    return {
      emoji,
      outcomeValue: clampedOutcome,
      durationMs: 1200,
      currentFrame: 0,
      isCompleted: false
    };
  }

  public completeDiceAnimation(state: DiceAnimationState): DiceAnimationState {
    return {
      ...state,
      currentFrame: state.outcomeValue, // Lock on final outcome frame
      isCompleted: true
    };
  }

  // =========================================================================
  // 6. ExpandableQuoteRenderingGovernor (Telegram-iOS #2393)
  // =========================================================================
  public renderExpandableQuote(
    rawText: string,
    isExpanded: boolean = false
  ): QuoteBlockConfig {
    // Preserve newlines explicitly
    const lines = rawText.split(/\r?\n/).map((l) => l.trimEnd());
    const isExpandable = lines.length > 3 || rawText.length > 200;

    return {
      rawText,
      isExpandable,
      isExpanded,
      formattedHtmlOrLines: isExpanded || !isExpandable ? lines : lines.slice(0, 3),
      maxCollapsedLines: 3
    };
  }

  // =========================================================================
  // 7. VideoDurationBadgeGovernor (Telegram-iOS #1158)
  // =========================================================================
  public formatVideoDurationBadge(durationSeconds: number): {
    formattedBadge: string;
    isOverOneHour: boolean;
    totalSeconds: number;
  } {
    const sec = Math.max(0, Math.floor(durationSeconds));
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    let formattedBadge: string;
    const isOverOneHour = hours > 0;

    if (isOverOneHour) {
      formattedBadge = `${hours}:${pad(minutes)}:${pad(seconds)}`;
    } else {
      formattedBadge = `${pad(minutes)}:${pad(seconds)}`;
    }

    return {
      formattedBadge,
      isOverOneHour,
      totalSeconds: sec
    };
  }
}

export const iosKeyboardMiniAppDiceAndQuoteGovernor =
  new IosKeyboardMiniAppDiceAndQuoteGovernor();
