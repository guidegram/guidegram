/**
 * Guidegram Account Profile, Virtual Folders & Smart Scroll Governor
 * 
 * Hardened against:
 * - kotatogram #6: Displaying and copying numeric User ID and DC in profile
 * - kotatogram #475: Automatic virtual "Ungrouped / Without Folder" chat tab
 * - kotatogram #167: Secondary right-click action on scroll-to-bottom button (jump to first unread)
 * - kotatogram #374: Bot token login validation & credential parsing
 * - tdesktop #31345: Shortcut collision resolution based on usage frequency
 */

export interface ProfileIdentityInfo {
  userId: number;
  dataCenterId: number;
  username?: string;
  formattedDisplay: string;
}

export interface BotTokenValidation {
  isValid: boolean;
  botId?: number;
  tokenHash?: string;
  error?: string;
}

export interface ScrollArrowClickResult {
  action: 'scroll_to_latest' | 'jump_to_first_unread';
  targetMessageId?: number;
}

export class AccountProfileAndVirtualFoldersGovernor {
  /**
   * Formats profile identity details with numeric user ID and DC indicator (kotatogram #6).
   */
  public static formatProfileIdentity(userId: number, dcId: number, username?: string): ProfileIdentityInfo {
    const userStr = username ? `@${username}` : 'No username';
    const formattedDisplay = `ID: ${userId} (DC${dcId}) • ${userStr}`;

    return {
      userId,
      dataCenterId: dcId,
      username,
      formattedDisplay
    };
  }

  /**
   * Computes the "Ungrouped" virtual folder containing all active chats
   * that do not belong to any user-defined folder (kotatogram #475).
   */
  public static computeUngroupedChats(
    allChatIds: number[],
    customFolders: Array<{ includedChatIds: number[] }>
  ): number[] {
    const categorizedChatIds = new Set<number>();
    for (const folder of customFolders) {
      for (const id of folder.includedChatIds) {
        categorizedChatIds.add(id);
      }
    }

    return allChatIds.filter(id => !categorizedChatIds.has(id));
  }

  /**
   * Resolves left-click vs right-click action on scroll-to-bottom floating button (kotatogram #167).
   */
  public static resolveScrollArrowAction(
    mouseButton: 'left' | 'right',
    firstUnreadMsgId?: number
  ): ScrollArrowClickResult {
    if (mouseButton === 'right' && firstUnreadMsgId) {
      return {
        action: 'jump_to_first_unread',
        targetMessageId: firstUnreadMsgId
      };
    }

    return {
      action: 'scroll_to_latest'
    };
  }

  /**
   * Validates Telegram Bot API token format: `<bot_id>:<token_hash>` (kotatogram #374).
   */
  public static validateBotToken(token: string): BotTokenValidation {
    const trimmed = token.trim();
    const match = trimmed.match(/^(\d{8,12}):([a-zA-Z0-9_-]{35,50})$/);

    if (!match) {
      return {
        isValid: false,
        error: 'Invalid bot token format. Expected: <bot_id>:<alphanumeric_hash>'
      };
    }

    const botId = parseInt(match[1], 10);
    const tokenHash = match[2];

    return {
      isValid: true,
      botId,
      tokenHash
    };
  }

  /**
   * Resolves shortcut key conflicts, assigning binding to higher priority/frequency command (tdesktop #31345).
   */
  public static resolveShortcutConflict(
    keySignature: string,
    existingCommand: { id: string; usageCount: number },
    newCommand: { id: string; usageCount: number }
  ): { assignedCommandId: string; remappedCommandId: string } {
    if (newCommand.usageCount > existingCommand.usageCount) {
      return {
        assignedCommandId: newCommand.id,
        remappedCommandId: existingCommand.id
      };
    }

    return {
      assignedCommandId: existingCommand.id,
      remappedCommandId: newCommand.id
    };
  }
}
