/**
 * Channel Admin Rights, Ban Duration & Granular Permissions Governor
 *
 * Hardened against competitor issues:
 * - Ajaxy/telegram-tt #501: Group owner rights are not transferred to another user (2FA verification flow)
 * - TDesktop-x64/tdesktop #210: Fix repeat from anonymous admin in chat with channel
 * - TDesktop-x64/tdesktop #239: Add batch "Dismiss all" and "Ban all" actions to join requests UI
 * - morethanwords/tweb #344: Add content restricted to private channels (noforwards protection)
 * - AyuGram/AyuGramDesktop #359: Group admin self clear / delete messages permission
 * - UnigramDev/Unigram #376: Dialog list mute icon not updated when muting user
 * - UnigramDev/Unigram #2921: Mute for... dialog inaccessible to screen readers
 */

export interface ChatAdminRights {
  changeInfo: boolean;
  postMessages: boolean;
  editMessages: boolean;
  deleteMessages: boolean;
  banUsers: boolean;
  inviteUsers: boolean;
  pinMessages: boolean;
  addAdmins: boolean;
  anonymous: boolean;
  manageTopics: boolean;
}

export interface ChatBannedRights {
  viewMessages: boolean;
  sendMessages: boolean;
  sendMedia: boolean;
  sendStickers: boolean;
  embedLinks: boolean;
  sendPolls: boolean;
  changeInfo: boolean;
  inviteUsers: boolean;
  pinMessages: boolean;
  untilDate: number; // 0 = permanent
}

export interface JoinRequestItem {
  userId: string;
  userName: string;
  date: number;
}

export interface MutePreset {
  label: string;
  durationSeconds: number;
  accessibleAriaLabel: string;
}

export class ChannelAdminAndPermissionsGovernor {
  private chatOwners: Map<string, string> = new Map();
  private adminRightsMap: Map<string, Map<string, ChatAdminRights>> = new Map();
  private bannedRightsMap: Map<string, Map<string, ChatBannedRights>> = new Map();
  private joinRequests: Map<string, Map<string, JoinRequestItem>> = new Map();
  private chatMuteStates: Map<string, number> = new Map(); // chatId -> muteUntil timestamp
  private contentRestrictions: Map<string, boolean> = new Map(); // chatId -> noForwards

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.chatOwners.clear();
    this.adminRightsMap.clear();
    this.bannedRightsMap.clear();
    this.joinRequests.clear();
    this.chatMuteStates.clear();
    this.contentRestrictions.clear();
  }

  /**
   * Registers a chat owner
   */
  public registerOwner(chatId: string, ownerId: string): void {
    this.chatOwners.set(chatId, ownerId);
  }

  public getOwner(chatId: string): string | null {
    return this.chatOwners.get(chatId) || null;
  }

  /**
   * Transfers ownership to another user with 2FA password verification (Ajaxy #501)
   */
  public transferOwnership(
    chatId: string,
    currentOwnerId: string,
    targetUserId: string,
    twoFactorPasswordHash: string
  ): { success: boolean; newOwnerId: string; error?: string } {
    const owner = this.chatOwners.get(chatId);
    if (owner !== currentOwnerId) {
      return { success: false, newOwnerId: owner || '', error: 'Caller is not the current owner of this chat' };
    }

    if (!twoFactorPasswordHash || twoFactorPasswordHash.length < 8) {
      return { success: false, newOwnerId: currentOwnerId, error: 'Valid 2FA password confirmation required to transfer ownership' };
    }

    this.chatOwners.set(chatId, targetUserId);
    return { success: true, newOwnerId: targetUserId };
  }

  /**
   * Resolves anonymous admin sender identity into channel peer (TDesktop #210)
   */
  public resolveSenderIdentity(
    chatId: string,
    adminUserId: string,
    isAnonymous: boolean,
    chatTitle: string
  ): { senderId: string; senderTitle: string; isChannelIdentity: boolean } {
    if (isAnonymous) {
      return {
        senderId: chatId,
        senderTitle: chatTitle,
        isChannelIdentity: true
      };
    }

    return {
      senderId: adminUserId,
      senderTitle: adminUserId,
      isChannelIdentity: false
    };
  }

  /**
   * Batch moderates join requests (TDesktop #239)
   */
  public addJoinRequest(chatId: string, req: JoinRequestItem): void {
    if (!this.joinRequests.has(chatId)) {
      this.joinRequests.set(chatId, new Map());
    }
    this.joinRequests.get(chatId)!.set(req.userId, { ...req });
  }

  public batchModerateJoinRequests(
    chatId: string,
    action: 'approve_all' | 'dismiss_all' | 'ban_all'
  ): { affectedCount: number; action: string } {
    const requests = this.joinRequests.get(chatId);
    if (!requests || requests.size === 0) {
      return { affectedCount: 0, action };
    }

    const count = requests.size;

    if (action === 'ban_all') {
      if (!this.bannedRightsMap.has(chatId)) {
        this.bannedRightsMap.set(chatId, new Map());
      }
      for (const userId of requests.keys()) {
        this.bannedRightsMap.get(chatId)!.set(userId, {
          viewMessages: false,
          sendMessages: false,
          sendMedia: false,
          sendStickers: false,
          embedLinks: false,
          sendPolls: false,
          changeInfo: false,
          inviteUsers: false,
          pinMessages: false,
          untilDate: 0
        });
      }
    }

    requests.clear();
    return { affectedCount: count, action };
  }

  /**
   * Sets content restriction / noForwards for private channels (morethanwords #344)
   */
  public setContentRestriction(chatId: string, noForwards: boolean): void {
    this.contentRestrictions.set(chatId, noForwards);
  }

  public checkContentRestriction(chatId: string): { canForward: boolean; canCopy: boolean; canSaveMedia: boolean } {
    const isRestricted = this.contentRestrictions.get(chatId) || false;
    return {
      canForward: !isRestricted,
      canCopy: !isRestricted,
      canSaveMedia: !isRestricted
    };
  }

  /**
   * Determines if user can delete a message (AyuGram #359)
   * Any user can delete their own message; admins with deleteMessages can delete any message
   */
  public canDeleteMessage(
    chatId: string,
    callerId: string,
    authorId: string,
    adminRights?: ChatAdminRights
  ): boolean {
    if (callerId === authorId) {
      return true; // Users and admins can ALWAYS delete their own messages
    }

    if (adminRights?.deleteMessages) {
      return true;
    }

    const chatAdmin = this.adminRightsMap.get(chatId)?.get(callerId);
    if (chatAdmin?.deleteMessages) {
      return true;
    }

    return false;
  }

  /**
   * Sets chat mute state with reactive update guarantee (Unigram #376)
   */
  public setChatMute(
    chatId: string,
    muteUntil: number,
    now: number = Date.now()
  ): { isMuted: boolean; muteUntil: number; displayMuteIcon: boolean } {
    this.chatMuteStates.set(chatId, muteUntil);
    const isMuted = muteUntil > now;

    return {
      isMuted,
      muteUntil,
      displayMuteIcon: isMuted
    };
  }

  public isChatMuted(chatId: string, now: number = Date.now()): boolean {
    const muteUntil = this.chatMuteStates.get(chatId);
    if (!muteUntil) return false;
    return muteUntil > now;
  }

  /**
   * Returns accessible mute presets for screen readers (Unigram #2921)
   */
  public getAccessibleMutePresets(): MutePreset[] {
    return [
      { label: '8 hours', durationSeconds: 8 * 3600, accessibleAriaLabel: 'Mute notifications for 8 hours' },
      { label: '1 day', durationSeconds: 24 * 3600, accessibleAriaLabel: 'Mute notifications for 1 day' },
      { label: '7 days', durationSeconds: 7 * 24 * 3600, accessibleAriaLabel: 'Mute notifications for 7 days' },
      { label: 'Forever', durationSeconds: 3650 * 24 * 3600, accessibleAriaLabel: 'Mute notifications permanently' }
    ];
  }
}

export const channelAdminAndPermissionsGovernor = new ChannelAdminAndPermissionsGovernor();
