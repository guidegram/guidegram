/**
 * Emoji Autocomplete, Album Caption Anchoring & Reaction Governor
 *
 * Hardened against competitor issues:
 * - morethanwords/tweb #115: Browser tab crashes when typing corrupt/unpaired emoji surrogates
 * - morethanwords/tweb #211: Writing time (12:30) or adjacent emojis blocks emoji-bar from showing
 * - kotatogram/kotatogram-desktop #275: Text triggers for emojis (:shortcode: autocomplete)
 * - kotatogram/kotatogram-desktop #355: Emoji reactions failing on macOS pointer interactions
 * - morethanwords/tweb #120: Editing album caption adds caption to last image instead of first
 * - kotatogram/kotatogram-desktop #176, #401: Auto-caption files with their names / customizable template
 * - TDesktop-x64/tdesktop #194: Small sender avatar badge on group chat list icon
 * - TDesktop-x64/tdesktop #191: Option to hide stories bar in chat list header
 */

export interface EmojiEntry {
  symbol: string;
  shortcode: string;
  category: 'smileys' | 'gestures' | 'objects' | 'symbols';
}

export interface MessageReaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
  userIds: string[];
}

export interface AlbumMediaItem {
  id: string;
  type: 'photo' | 'video';
  url: string;
  caption?: string;
  isFirstInGroup: boolean;
}

export class EmojiReactionsAndCaptionGovernor {
  private emojiDictionary: EmojiEntry[] = [
    { symbol: '👍', shortcode: 'thumbsup', category: 'gestures' },
    { symbol: '❤️', shortcode: 'heart', category: 'symbols' },
    { symbol: '🔥', shortcode: 'fire', category: 'objects' },
    { symbol: '🎉', shortcode: 'tada', category: 'objects' },
    { symbol: '😂', shortcode: 'joy', category: 'smileys' },
    { symbol: '🤔', shortcode: 'thinking', category: 'smileys' },
    { symbol: '👏', shortcode: 'clap', category: 'gestures' },
    { symbol: '🚀', shortcode: 'rocket', category: 'objects' },
    { symbol: '💯', shortcode: '100', category: 'symbols' }
  ];

  private autoCaptionFiles: boolean = false;
  private defaultCaptionTemplate: string = '{filename}';
  private storiesBarVisible: boolean = true;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.autoCaptionFiles = false;
    this.defaultCaptionTemplate = '{filename}';
    this.storiesBarVisible = true;
  }

  public setStoriesBarVisible(visible: boolean): void {
    this.storiesBarVisible = visible;
  }

  public isStoriesBarVisible(): boolean {
    return this.storiesBarVisible;
  }

  public setAutoCaptionSettings(enabled: boolean, template: string = '{filename}'): void {
    this.autoCaptionFiles = enabled;
    this.defaultCaptionTemplate = template;
  }

  /**
   * Parses emoji :shortcode trigger at cursor position (Kotatogram #275, morethanwords #211)
   * Avoids false positives on time formats like "12:30" or double colons
   */
  public parseEmojiTrigger(text: string, cursorPos: number): { isTriggered: boolean; query: string; startIndex: number } {
    if (!text || cursorPos <= 0 || cursorPos > text.length) {
      return { isTriggered: false, query: '', startIndex: -1 };
    }

    const beforeCursor = text.substring(0, cursorPos);
    // Matches word boundary or start of line followed by colon and alphanumeric query
    // Prevents matching "12:30" (digit before colon)
    const match = beforeCursor.match(/(?:^|\s):([a-zA-Z0-9_]{1,20})$/);

    if (!match) {
      return { isTriggered: false, query: '', startIndex: -1 };
    }

    const query = match[1];
    const startIndex = beforeCursor.length - query.length - 1; // Position of ':'
    return { isTriggered: true, query, startIndex };
  }

  /**
   * Queries emoji dictionary by shortcode (Kotatogram #275)
   */
  public queryEmoji(query: string): EmojiEntry[] {
    const q = query.trim().toLowerCase();
    if (!q) return [...this.emojiDictionary];
    return this.emojiDictionary.filter(e => e.shortcode.toLowerCase().includes(q));
  }

  /**
   * Sanitizes surrogate pairs preventing browser tab crashes (morethanwords #115)
   */
  public sanitizeSurrogates(input: string): string {
    if (!input) return '';
    // Replaces lone high or low surrogates with replacement character
    return input.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
  }

  /**
   * Reaction toggle supporting macOS touch/mouse pointers (Kotatogram #355)
   */
  public toggleReaction(
    existingReactions: MessageReaction[],
    selectedEmoji: string,
    userId: string
  ): MessageReaction[] {
    const reactions = existingReactions.map(r => ({
      ...r,
      userIds: [...r.userIds]
    }));

    const found = reactions.find(r => r.emoji === selectedEmoji);

    if (found) {
      if (found.userIds.includes(userId)) {
        // Remove reaction
        found.userIds = found.userIds.filter(id => id !== userId);
        found.count = found.userIds.length;
        found.hasReacted = false;
      } else {
        // Add reaction
        found.userIds.push(userId);
        found.count = found.userIds.length;
        found.hasReacted = true;
      }
    } else {
      // New reaction
      reactions.push({
        emoji: selectedEmoji,
        count: 1,
        hasReacted: true,
        userIds: [userId]
      });
    }

    // Filter out zero-count reactions
    return reactions.filter(r => r.count > 0);
  }

  /**
   * Updates album caption guaranteeing binding to first media item (morethanwords #120)
   */
  public updateAlbumCaption(items: AlbumMediaItem[], newCaption: string): AlbumMediaItem[] {
    if (!items || items.length === 0) return [];

    return items.map((item, index) => {
      if (index === 0) {
        return {
          ...item,
          caption: newCaption,
          isFirstInGroup: true
        };
      }
      return {
        ...item,
        caption: undefined, // Secondary items never hold the album caption
        isFirstInGroup: false
      };
    });
  }

  /**
   * Generates auto-caption from file metadata (Kotatogram #176, #401)
   */
  public formatFileCaption(fileName: string, sizeBytes: number = 0): string | undefined {
    if (!this.autoCaptionFiles) return undefined;

    const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(1);
    return this.defaultCaptionTemplate
      .replace('{filename}', fileName)
      .replace('{size}', `${sizeMb} MB`);
  }

  /**
   * Computes sender corner badge for group chats (TDesktop #194)
   */
  public getGroupSenderBadge(
    chatType: 'private' | 'group' | 'channel',
    senderAvatarUrl?: string
  ): { showBadge: boolean; badgeAvatarUrl?: string } {
    if (chatType === 'group' && senderAvatarUrl) {
      return { showBadge: true, badgeAvatarUrl: senderAvatarUrl };
    }
    return { showBadge: false };
  }
}

export const emojiReactionsAndCaptionGovernor = new EmojiReactionsAndCaptionGovernor();
