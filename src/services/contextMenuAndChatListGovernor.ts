/**
 * Context Menu, Right-Click Actions & Chat List Sorting Governor
 *
 * Hardened against competitor issues:
 * - AyuGram/AyuGramDesktop #413: Random crash on right click on message (null safety, boundary clamping)
 * - kotatogram/kotatogram-desktop #439: Bottom area of large chat window cannot be right clicked
 * - kotatogram/kotatogram-desktop #274: Copy ID in right-click context menu strip
 * - kotatogram/kotatogram-desktop #342: Submenu for adding chats to folders directly from context menu
 * - TDesktop-x64/tdesktop #221: Dedicated icons for "View as JSON" developer context action
 * - morethanwords/tweb #443: Drag & reorder pinned chats in chat list
 * - kotatogram/kotatogram-desktop #4: Pinned dialogs count max customization (Free, Premium, Power-User)
 * - AyuGram/AyuGramDesktop #479: Sorting in folders (by activity, unread first, alphabetical)
 * - AyuGram/AyuGramDesktop #274: Option to hide "All chats" folder
 */

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  action: () => void | Promise<void>;
  danger?: boolean;
  disabled?: boolean;
  submenu?: MenuItem[];
}

export interface ContextMenuPosition {
  x: number;
  y: number;
  placement: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export interface ChatItem {
  id: string;
  title: string;
  lastMessageDate: number;
  unreadCount: number;
  isPinned: boolean;
  pinnedIndex?: number;
  folderIds: string[];
}

export interface ChatFolder {
  id: string;
  title: string;
  icon?: string;
  includedChatIds: string[];
  sortMode: 'last_activity' | 'unread_first' | 'alphabetical';
  visible: boolean;
}

export class ContextMenuAndChatListGovernor {
  private folders: Map<string, ChatFolder> = new Map();
  private maxPinnedFree: number = 5;
  private maxPinnedPremium: number = 10;
  private maxPinnedPowerUser: number = 100;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.folders.clear();
    // Default system folders
    this.folders.set('all', {
      id: 'all',
      title: 'All Chats',
      includedChatIds: [],
      sortMode: 'last_activity',
      visible: true
    });
  }

  /**
   * Calculates safe context menu positioning within viewport (AyuGram #413)
   */
  public calculateMenuPosition(
    cursorX: number,
    cursorY: number,
    viewportWidth: number,
    viewportHeight: number,
    menuWidth: number = 220,
    menuHeight: number = 260
  ): ContextMenuPosition {
    let x = cursorX;
    let y = cursorY;
    let placement: ContextMenuPosition['placement'] = 'bottom-right';

    // Horizontal boundary clamping
    if (cursorX + menuWidth > viewportWidth) {
      x = Math.max(8, cursorX - menuWidth);
      placement = 'bottom-left';
    } else {
      x = Math.min(x, viewportWidth - menuWidth - 8);
    }

    // Vertical boundary clamping
    if (cursorY + menuHeight > viewportHeight) {
      y = Math.max(8, cursorY - menuHeight);
      placement = placement === 'bottom-left' ? 'top-left' : 'top-right';
    } else {
      y = Math.min(y, viewportHeight - menuHeight - 8);
    }

    return { x: Math.max(8, x), y: Math.max(8, y), placement };
  }

  /**
   * Handles right click in chat area, including empty space at the bottom (Kotatogram #439, AyuGram #413)
   */
  public resolveRightClickTarget(
    hasMessage: boolean,
    messageId?: string,
    chatId: string = ''
  ): { targetType: 'message' | 'chat_background'; targetId: string } {
    if (hasMessage && messageId) {
      return { targetType: 'message', targetId: messageId };
    }
    // Fall back to chat background context menu instead of failing/ignoring
    return { targetType: 'chat_background', targetId: chatId };
  }

  /**
   * Generates message context menu items (Kotatogram #274, TDesktop #221)
   */
  public generateMessageContextMenu(
    message: { id: string; text?: string; authorId: string },
    isDevMode: boolean = false
  ): MenuItem[] {
    const items: MenuItem[] = [
      { id: 'reply', label: 'Reply', icon: 'reply', action: () => {} },
      { id: 'forward', label: 'Forward', icon: 'forward', action: () => {} },
      { id: 'copy_text', label: 'Copy Text', icon: 'copy', action: () => {} },
      {
        id: 'copy_id',
        label: `Copy Message ID (${message.id})`,
        icon: 'tag',
        action: () => {}
      }
    ];

    if (isDevMode) {
      items.push({
        id: 'view_as_json',
        label: 'View as JSON',
        icon: 'code-json',
        action: () => {}
      });
    }

    items.push({
      id: 'delete',
      label: 'Delete',
      icon: 'trash',
      danger: true,
      action: () => {}
    });

    return items;
  }

  /**
   * Generates chat context menu with "Add to folder" submenu (Kotatogram #274, #342)
   */
  public generateChatContextMenu(
    chat: { id: string; title: string; isPinned: boolean; isMuted: boolean },
    availableFolders: Array<{ id: string; title: string; containsChat: boolean }>
  ): MenuItem[] {
    const folderSubmenu: MenuItem[] = availableFolders
      .filter(f => f.id !== 'all')
      .map(folder => ({
        id: `folder_${folder.id}`,
        label: folder.containsChat ? `✓ ${folder.title}` : folder.title,
        action: () => {}
      }));

    const items: MenuItem[] = [
      {
        id: 'pin',
        label: chat.isPinned ? 'Unpin' : 'Pin to top',
        icon: 'pin',
        action: () => {}
      },
      {
        id: 'mute',
        label: chat.isMuted ? 'Unmute' : 'Mute notifications',
        icon: 'bell',
        action: () => {}
      },
      {
        id: 'add_to_folder',
        label: 'Add to Folder',
        icon: 'folder-plus',
        submenu: folderSubmenu,
        action: () => {}
      },
      {
        id: 'copy_chat_id',
        label: `Copy Chat ID (${chat.id})`,
        icon: 'tag',
        action: () => {}
      },
      {
        id: 'clear_history',
        label: 'Clear History',
        icon: 'eraser',
        danger: true,
        action: () => {}
      }
    ];

    return items;
  }

  /**
   * Pinned dialogs limit validation (Kotatogram #4)
   */
  public canPinChat(
    currentPinnedCount: number,
    tier: 'free' | 'premium' | 'power_user' = 'free'
  ): { allowed: boolean; maxAllowed: number; currentCount: number } {
    let max = this.maxPinnedFree;
    if (tier === 'premium') max = this.maxPinnedPremium;
    if (tier === 'power_user') max = this.maxPinnedPowerUser;

    return {
      allowed: currentPinnedCount < max,
      maxAllowed: max,
      currentCount: currentPinnedCount
    };
  }

  /**
   * Reorders pinned chats (morethanwords #443)
   */
  public reorderPinnedChats(
    chats: ChatItem[],
    orderedPinnedIds: string[]
  ): ChatItem[] {
    const pinnedMap = new Map<string, number>();
    orderedPinnedIds.forEach((id, index) => pinnedMap.set(id, index));

    return [...chats].sort((a, b) => {
      const aIsPinned = pinnedMap.has(a.id);
      const bIsPinned = pinnedMap.has(b.id);

      if (aIsPinned && bIsPinned) {
        return pinnedMap.get(a.id)! - pinnedMap.get(b.id)!;
      }
      if (aIsPinned) return -1;
      if (bIsPinned) return 1;

      // Regular sort by date descending
      return b.lastMessageDate - a.lastMessageDate;
    });
  }

  /**
   * Sorts chats inside a folder (AyuGram #479)
   */
  public sortFolderChats(
    chats: ChatItem[],
    sortMode: 'last_activity' | 'unread_first' | 'alphabetical'
  ): ChatItem[] {
    const copy = [...chats];

    // Pinned always stay at top
    const pinned = copy.filter(c => c.isPinned);
    const unpinned = copy.filter(c => !c.isPinned);

    if (sortMode === 'unread_first') {
      unpinned.sort((a, b) => {
        if ((b.unreadCount > 0) !== (a.unreadCount > 0)) {
          return b.unreadCount > 0 ? 1 : -1;
        }
        return b.lastMessageDate - a.lastMessageDate;
      });
    } else if (sortMode === 'alphabetical') {
      unpinned.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      // default: last_activity
      unpinned.sort((a, b) => b.lastMessageDate - a.lastMessageDate);
    }

    return [...pinned, ...unpinned];
  }

  /**
   * Toggles folder visibility, including standard "All chats" folder (AyuGram #274)
   */
  public setFolderVisibility(folderId: string, visible: boolean): boolean {
    const folder = this.folders.get(folderId);
    if (!folder) return false;
    folder.visible = visible;
    return true;
  }

  public isFolderVisible(folderId: string): boolean {
    return this.folders.get(folderId)?.visible ?? true;
  }
}

export const contextMenuAndChatListGovernor = new ContextMenuAndChatListGovernor();
