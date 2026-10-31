/**
 * Channel Subscriber Batch Purge, Link Preview Override & Language Pack Link Governor
 *
 * Hardened against competitor issues:
 * - telegramdesktop/tdesktop #31400: Allow selecting and removing multiple channel subscribers at once
 * - kotatogram/kotatogram-desktop #427: Export channel link with member limit and expiry
 * - kotatogram/kotatogram-desktop #220: Invite link resolution on web and deep link hash parsing
 * - kotatogram/kotatogram-desktop #407: Snooze chats, channels, or groups with auto-unmute
 * - kotatogram/kotatogram-desktop #283: Disable link preview per chat with granular override
 * - TDesktop-x64/tdesktop #69: Quick forward to Saved Messages action for channel messages
 * - morethanwords/tweb #282: Long channel title breaking header layout in web view
 * - morethanwords/tweb #221, Ajaxy/telegram-tt #243: Support installing language packs via link
 */

export interface ChannelInviteLink {
  inviteLink: string;
  creatorId: string;
  expireDate?: number;
  usageLimit?: number;
  usageCount: number;
  requestApproval: boolean;
  isRevoked: boolean;
}

export interface LanguagePack {
  langCode: string;
  title: string;
  stringsCount: number;
  translations: Record<string, string>;
  isCustom: boolean;
}

export class ChannelSubscriberAndLanguagePackGovernor {
  private channelSubscribers: Map<string, Set<string>> = new Map(); // channelId -> Set of userIds
  private channelInviteLinks: Map<string, ChannelInviteLink[]> = new Map();
  private chatSnoozeMap: Map<string, number> = new Map(); // chatId -> snoozeUntil timestamp
  private perChatLinkPreview: Map<string, 'default' | 'enabled' | 'disabled'> = new Map();
  private installedLanguagePacks: Map<string, LanguagePack> = new Map();
  private activeLangCode: string = 'en';

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.channelSubscribers.clear();
    this.channelInviteLinks.clear();
    this.chatSnoozeMap.clear();
    this.perChatLinkPreview.clear();
    this.installedLanguagePacks.clear();
    this.activeLangCode = 'en';
  }

  /**
   * Channel subscriber management with batch removal (TDesktop #31400)
   */
  public addSubscribers(channelId: string, userIds: string[]): void {
    if (!this.channelSubscribers.has(channelId)) {
      this.channelSubscribers.set(channelId, new Set());
    }
    const set = this.channelSubscribers.get(channelId)!;
    for (const uid of userIds) {
      set.add(uid);
    }
  }

  public getSubscribers(channelId: string): string[] {
    return Array.from(this.channelSubscribers.get(channelId) || []);
  }

  public batchRemoveSubscribers(
    channelId: string,
    targetUserIds: string[]
  ): { removedCount: number; remainingCount: number } {
    const set = this.channelSubscribers.get(channelId);
    if (!set) return { removedCount: 0, remainingCount: 0 };

    let count = 0;
    for (const uid of targetUserIds) {
      if (set.delete(uid)) {
        count++;
      }
    }

    return { removedCount: count, remainingCount: set.size };
  }

  /**
   * Channel invite link generation & parsing (Kotatogram #427, #220)
   */
  public createInviteLink(
    channelId: string,
    creatorId: string,
    options: { expireDate?: number; usageLimit?: number; requestApproval?: boolean } = {}
  ): ChannelInviteLink {
    const hash = Math.random().toString(36).substring(2, 10);
    const inviteLink = `https://t.me/+${hash}`;

    const linkObj: ChannelInviteLink = {
      inviteLink,
      creatorId,
      expireDate: options.expireDate,
      usageLimit: options.usageLimit,
      usageCount: 0,
      requestApproval: options.requestApproval ?? false,
      isRevoked: false
    };

    if (!this.channelInviteLinks.has(channelId)) {
      this.channelInviteLinks.set(channelId, []);
    }
    this.channelInviteLinks.get(channelId)!.push(linkObj);
    return linkObj;
  }

  public parseInviteLink(url: string): { valid: boolean; hash: string } {
    if (!url) return { valid: false, hash: '' };

    // Matches t.me/+hash, t.me/joinchat/hash, tg://join?invite=hash
    const plusMatch = url.match(/(?:t\.me|telegram\.me)\/\+([a-zA-Z0-9_-]+)/);
    if (plusMatch) return { valid: true, hash: plusMatch[1] };

    const joinchatMatch = url.match(/(?:t\.me|telegram\.me)\/joinchat\/([a-zA-Z0-9_-]+)/);
    if (joinchatMatch) return { valid: true, hash: joinchatMatch[1] };

    const tgMatch = url.match(/tg:\/\/join\?invite=([a-zA-Z0-9_-]+)/);
    if (tgMatch) return { valid: true, hash: tgMatch[1] };

    return { valid: false, hash: '' };
  }

  /**
   * Snooze / temporary mute scheduling (Kotatogram #407)
   */
  public snoozeChat(chatId: string, durationMinutes: number, now: number = Date.now()): { snoozeUntil: number } {
    const snoozeUntil = now + durationMinutes * 60_000;
    this.chatSnoozeMap.set(chatId, snoozeUntil);
    return { snoozeUntil };
  }

  public isChatSnoozed(chatId: string, now: number = Date.now()): boolean {
    const until = this.chatSnoozeMap.get(chatId);
    if (!until) return false;
    return now < until;
  }

  /**
   * Per-chat link preview preference (Kotatogram #283)
   */
  public setLinkPreviewOverride(chatId: string, preference: 'default' | 'enabled' | 'disabled'): void {
    this.perChatLinkPreview.set(chatId, preference);
  }

  public shouldShowLinkPreview(chatId: string, globalEnabled: boolean = true): boolean {
    const override = this.perChatLinkPreview.get(chatId) ?? 'default';
    if (override === 'enabled') return true;
    if (override === 'disabled') return false;
    return globalEnabled;
  }

  /**
   * Quick forward to Saved Messages (TDesktop #69)
   */
  public forwardToSavedMessages(
    message: { id: string; text?: string; channelTitle?: string },
    currentUserId: string
  ): { success: boolean; savedChatId: string; forwardedId: string } {
    const savedChatId = `saved_${currentUserId}`;
    const forwardedId = `fwd_${message.id}_${Date.now()}`;
    return {
      success: true,
      savedChatId,
      forwardedId
    };
  }

  /**
   * Language pack installation via link (morethanwords #221, Ajaxy #243)
   */
  public parseLanguagePackLink(link: string): { valid: boolean; langCode: string } {
    if (!link) return { valid: false, langCode: '' };

    const tgMatch = link.match(/tg:\/\/setlanguage\?lang=([a-zA-Z0-9_-]+)/i);
    if (tgMatch) return { valid: true, langCode: tgMatch[1] };

    const webMatch = link.match(/(?:t\.me|telegram\.me)\/setlanguage\/([a-zA-Z0-9_-]+)/i);
    if (webMatch) return { valid: true, langCode: webMatch[1] };

    return { valid: false, langCode: '' };
  }

  public installLanguagePack(
    langCode: string,
    title: string,
    translations: Record<string, string>
  ): { success: boolean; activeLangCode: string } {
    const pack: LanguagePack = {
      langCode,
      title,
      stringsCount: Object.keys(translations).length,
      translations,
      isCustom: true
    };

    this.installedLanguagePacks.set(langCode, pack);
    this.activeLangCode = langCode;
    return { success: true, activeLangCode: langCode };
  }

  public getActiveLanguagePack(): LanguagePack | undefined {
    return this.installedLanguagePacks.get(this.activeLangCode);
  }

  /**
   * Channel header title formatting with truncation & tooltip (morethanwords #282)
   */
  public formatChannelHeaderTitle(
    title: string,
    maxChars: number = 32
  ): { displayTitle: string; fullTitle: string; isTruncated: boolean } {
    if (!title) return { displayTitle: '', fullTitle: '', isTruncated: false };

    if (title.length <= maxChars) {
      return { displayTitle: title, fullTitle: title, isTruncated: false };
    }

    const truncated = title.substring(0, maxChars - 1).trim() + '…';
    return { displayTitle: truncated, fullTitle: title, isTruncated: true };
  }
}

export const channelSubscriberAndLanguagePackGovernor = new ChannelSubscriberAndLanguagePackGovernor();
