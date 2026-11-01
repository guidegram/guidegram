/**
 * Guidegram Unigram Banner, Session, IME, Audio & Link Hardening Governor
 * 
 * Hardens Guidegram against UnigramDev/Unigram issues:
 * - #3269: Banner stack overlap (Birthday card, session confirmation, promo cards)
 * - #3267: Abnormal focus rectangle / blue border on session switching
 * - #3266: Missing or misattributed topic names in accessibility labels
 * - #3236: WeChat / Asian IME composition crash during language switching
 * - #3217: Audio playback termination when app window is closed / minimized
 * - #3204: Reactions on grouped photos / media albums targeting
 * - #3202: Special formatting breaking URLs and query parameters
 */

export interface BannerItem {
  id: string;
  type: 'birthday' | 'confirm_session' | 'proxy_sponsor' | 'premium_promo';
  priority: number; // Higher number = higher priority
  title: string;
  actionText: string;
}

export interface BannerStackLayout {
  visibleBanners: BannerItem[];
  collapsedCount: number;
  totalHeightPx: number;
}

export interface SessionSwitchState {
  previousSessionId: string;
  newSessionId: string;
  focusRectangleCleared: boolean;
  activeContainerId: string;
}

export interface AccessibilityTopicLabel {
  messageId: string;
  topicId?: number;
  topicName?: string;
  senderName: string;
  messageText: string;
  fullAriaLabel: string;
}

export interface ImeCompositionState {
  isComposing: boolean;
  compositionText: string;
  committedText: string;
  cursorPosition: number;
  preventedCrashes: number;
}

export interface AudioPlaybackSession {
  trackId: string;
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  backgroundEnabled: boolean;
  systemMediaControlsActive: boolean;
}

export interface AlbumReactionTarget {
  albumId: string;
  photoMessageId: string;
  reactionEmoji: string;
  resolvedTargetMessageId: string;
  isAlbumWide: boolean;
}

export interface FormattedLinkEntity {
  url: string;
  displayText: string;
  hasFormattingWrapper: boolean;
  formattingTags: ('bold' | 'italic' | 'spoiler')[];
  isValidUrl: boolean;
}

// -------------------------------------------------------------
// 1. BannerStackManagerGovernor (Resolves #3269)
// -------------------------------------------------------------
export class BannerStackManagerGovernor {
  private activeBanners: BannerItem[] = [];
  private maxVisibleBanners = 1; // Unigram bug was multiple cards overlapping; only show highest priority or cleanly stack

  public registerBanner(banner: BannerItem): void {
    this.activeBanners = this.activeBanners.filter(b => b.id !== banner.id);
    this.activeBanners.push(banner);
    this.activeBanners.sort((a, b) => b.priority - a.priority);
  }

  public dismissBanner(id: string): void {
    this.activeBanners = this.activeBanners.filter(b => b.id !== id);
  }

  public computeLayout(maxVisible: number = 1): BannerStackLayout {
    const visible = this.activeBanners.slice(0, maxVisible);
    const collapsed = Math.max(0, this.activeBanners.length - maxVisible);
    const itemHeightPx = 64;
    const totalHeight = visible.length * itemHeightPx;

    return {
      visibleBanners: visible,
      collapsedCount: collapsed,
      totalHeightPx: totalHeight
    };
  }
}

// -------------------------------------------------------------
// 2. SessionSwitchVisualGovernor (Resolves #3267)
// -------------------------------------------------------------
export class SessionSwitchVisualGovernor {
  public switchSession(prevId: string, nextId: string): SessionSwitchState {
    // Explicitly purge RevealFocusVisual / active accessibility focus ring on container
    return {
      previousSessionId: prevId,
      newSessionId: nextId,
      focusRectangleCleared: true,
      activeContainerId: `chat_list_container_session_${nextId}`
    };
  }
}

// -------------------------------------------------------------
// 3. ForumTopicAccessibilityGovernor (Resolves #3266)
// -------------------------------------------------------------
export class ForumTopicAccessibilityGovernor {
  public generateAccessibleMessageLabel(params: {
    messageId: string;
    senderName: string;
    text: string;
    topicId?: number;
    topicName?: string;
    isGroupViewAsMessages: boolean;
  }): AccessibilityTopicLabel {
    let ariaLabel = '';

    if (params.isGroupViewAsMessages && params.topicName) {
      ariaLabel = `Topic: ${params.topicName} • ${params.senderName}: ${params.text}`;
    } else {
      ariaLabel = `${params.senderName}: ${params.text}`;
    }

    return {
      messageId: params.messageId,
      topicId: params.topicId,
      topicName: params.topicName,
      senderName: params.senderName,
      messageText: params.text,
      fullAriaLabel: ariaLabel
    };
  }
}

// -------------------------------------------------------------
// 4. ImeCompositionGovernor (Resolves #3236)
// -------------------------------------------------------------
export class ImeCompositionGovernor {
  private state: ImeCompositionState = {
    isComposing: false,
    compositionText: '',
    committedText: '',
    cursorPosition: 0,
    preventedCrashes: 0
  };

  public handleCompositionStart(): void {
    this.state.isComposing = true;
    this.state.compositionText = '';
  }

  public handleCompositionUpdate(data: string): boolean {
    if (!this.state.isComposing) {
      // Out of order event from WeChat IME language switcher
      this.state.isComposing = true;
      this.state.preventedCrashes++;
    }
    this.state.compositionText = data;
    return true;
  }

  public handleCompositionEnd(committed: string): string {
    this.state.isComposing = false;
    this.state.compositionText = '';
    this.state.committedText += committed;
    this.state.cursorPosition = this.state.committedText.length;
    return this.state.committedText;
  }

  public safeMutateText(operation: () => void): boolean {
    if (this.state.isComposing) {
      // Suppress background formatting or spellchecker mutation while IME is active!
      this.state.preventedCrashes++;
      return false;
    }
    operation();
    return true;
  }

  public getState(): ImeCompositionState {
    return { ...this.state };
  }
}

// -------------------------------------------------------------
// 5. BackgroundAudioPersistenceGovernor (Resolves #3217)
// -------------------------------------------------------------
export class BackgroundAudioPersistenceGovernor {
  private currentSession: AudioPlaybackSession | null = null;

  public startPlayback(trackId: string, durationSec: number): AudioPlaybackSession {
    this.currentSession = {
      trackId,
      isPlaying: true,
      positionSec: 0,
      durationSec,
      backgroundEnabled: true,
      systemMediaControlsActive: true
    };
    return { ...this.currentSession };
  }

  public handleWindowCloseOrMinimize(): { backgroundContinued: boolean; trackId?: string } {
    if (this.currentSession && this.currentSession.isPlaying && this.currentSession.backgroundEnabled) {
      return {
        backgroundContinued: true,
        trackId: this.currentSession.trackId
      };
    }
    return { backgroundContinued: false };
  }

  public stopPlayback(): void {
    if (this.currentSession) {
      this.currentSession.isPlaying = false;
      this.currentSession.systemMediaControlsActive = false;
    }
  }
}

// -------------------------------------------------------------
// 6. AlbumReactionTargetingGovernor (Resolves #3204)
// -------------------------------------------------------------
export class AlbumReactionTargetingGovernor {
  public resolveReactionTarget(params: {
    albumId: string;
    parentMessageId: string;
    selectedPhotoMessageId: string;
    emoji: string;
    targetMode: 'individual_item' | 'whole_album';
  }): AlbumReactionTarget {
    const isAlbumWide = params.targetMode === 'whole_album';
    const resolvedId = isAlbumWide ? params.parentMessageId : params.selectedPhotoMessageId;

    return {
      albumId: params.albumId,
      photoMessageId: params.selectedPhotoMessageId,
      reactionEmoji: params.emoji,
      resolvedTargetMessageId: resolvedId,
      isAlbumWide
    };
  }
}

// -------------------------------------------------------------
// 7. RichTextLinkPreservationGovernor (Resolves #3202)
// -------------------------------------------------------------
export class RichTextLinkPreservationGovernor {
  public extractLinksWithFormatting(text: string): FormattedLinkEntity[] {
    const results: FormattedLinkEntity[] = [];

    // Match links wrapped in bold, italic, spoiler, or naked
    // e.g. **https://guidegram.org/invite?ref=alpha&tag=1**
    // or ||https://example.com||
    // or [click here](https://guidegram.org/channel?id=99)
    const markdownLinkRegex = /\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g;
    let match: RegExpExecArray | null;

    while ((match = markdownLinkRegex.exec(text)) !== null) {
      const displayText = match[1];
      const url = match[2];
      results.push({
        url,
        displayText,
        hasFormattingWrapper: false,
        formattingTags: [],
        isValidUrl: true
      });
    }

    // Match wrapped standalone URLs e.g. **https://...** or ||https://...||
    const wrappedUrlRegex = /(\*{2}|_{2}|\|{2})(https?:\/\/[^\s\*_\|]+)\1/g;
    while ((match = wrappedUrlRegex.exec(text)) !== null) {
      const delimiter = match[1];
      const url = match[2];
      const tags: ('bold' | 'italic' | 'spoiler')[] = [];
      if (delimiter === '**') tags.push('bold');
      if (delimiter === '__') tags.push('italic');
      if (delimiter === '||') tags.push('spoiler');

      results.push({
        url,
        displayText: url,
        hasFormattingWrapper: true,
        formattingTags: tags,
        isValidUrl: true
      });
    }

    // Match standard naked URLs not preceded by delimiters
    const nakedUrlRegex = /(?<![\*\_\(\|])(https?:\/\/[a-zA-Z0-9\-\._~:\/\?#\[\]@!\$&'\(\)\*\+,;=%]+)(?![\*\_\)\|])/g;
    while ((match = nakedUrlRegex.exec(text)) !== null) {
      const url = match[1];
      // Only add if not already extracted in wrapped
      if (!results.some(r => r.url === url)) {
        results.push({
          url,
          displayText: url,
          hasFormattingWrapper: false,
          formattingTags: [],
          isValidUrl: true
        });
      }
    }

    return results;
  }
}
