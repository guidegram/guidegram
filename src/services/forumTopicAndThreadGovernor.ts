/**
 * Forum Topics, General Topic Reorder & Message Thread Isolation Governor
 *
 * Hardened against competitor issues:
 * - telegramdesktop/tdesktop #31533: Desktop crashes when a bot deletes the private chat topic that is currently open
 * - telegramdesktop/tdesktop #31451: Bot forums: first slash command from All Messages does not create the new thread
 * - telegramdesktop/tdesktop #31431: Incorrect read status (single checkmark) shown on "General" topic in "All" view
 * - telegramdesktop/tdesktop #31427: Sender avatars missing inside forum topics in Telegram Desktop
 * - TelegramMessenger/Telegram-iOS #2404: Deleted forum topics stay in list after channelDifferenceTooLong
 * - TelegramMessenger/Telegram-iOS #2386: Private bot topics show one check after the bot replies
 * - UnigramDev/Unigram #3220: Notifications cannot be disabled for individual forum topics
 * - AyuGram/AyuGramDesktop #454: Deleted messages disappear from forum topics/threads after switching topics
 */

export interface ForumTopic {
  id: number;
  title: string;
  iconColor: number;
  iconEmojiId?: string;
  isGeneral: boolean;
  isClosed: boolean;
  isHidden: boolean;
  isPinned: boolean;
  unreadCount: number;
  readInboxMaxId: number;
  readOutboxMaxId: number;
  isMuted: boolean;
  mutedUntil?: number;
  lastMessageId: number;
  lastMessageDate: number;
}

export interface TopicMessage {
  id: number;
  topicId: number;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  text: string;
  isOutgoing: boolean;
  isRead: boolean;
  isGhostDeleted?: boolean;
}

export class ForumTopicAndThreadGovernor {
  private chatTopics: Map<string, Map<number, ForumTopic>> = new Map();
  private topicMessages: Map<string, Map<number, Map<number, TopicMessage>>> = new Map();
  private senderAvatarCache: Map<string, string> = new Map();

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.chatTopics.clear();
    this.topicMessages.clear();
    this.senderAvatarCache.clear();
  }

  /**
   * Registers or updates a forum topic
   */
  public registerTopic(chatId: string, topic: ForumTopic): void {
    if (!this.chatTopics.has(chatId)) {
      this.chatTopics.set(chatId, new Map());
    }
    this.chatTopics.get(chatId)!.set(topic.id, { ...topic });
  }

  /**
   * Returns all topics for a chat sorted with Pinned first, then by lastMessageDate
   */
  public getTopics(chatId: string): ForumTopic[] {
    const topicsMap = this.chatTopics.get(chatId);
    if (!topicsMap) return [];

    return Array.from(topicsMap.values()).sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.lastMessageDate - a.lastMessageDate;
    });
  }

  /**
   * Safe topic deletion fallback preventing crashes when current topic is deleted (tdesktop #31533)
   */
  public handleTopicDeletion(
    chatId: string,
    deletedTopicId: number,
    currentlyOpenTopicId?: number
  ): { fallbackTopicId: number; safeToClose: boolean } {
    const topicsMap = this.chatTopics.get(chatId);
    if (topicsMap) {
      topicsMap.delete(deletedTopicId);
    }

    const messagesForTopic = this.topicMessages.get(chatId)?.get(deletedTopicId);
    if (messagesForTopic) {
      this.topicMessages.get(chatId)!.delete(deletedTopicId);
    }

    // Default fallback is General Topic (id: 1) or root chat (id: 0)
    let fallbackTopicId = 1;
    if (topicsMap && !topicsMap.has(1)) {
      const remaining = Array.from(topicsMap.keys());
      fallbackTopicId = remaining.length > 0 ? remaining[0] : 0;
    }

    const isCurrentDeleted = currentlyOpenTopicId === deletedTopicId;

    return {
      fallbackTopicId: isCurrentDeleted ? fallbackTopicId : (currentlyOpenTopicId ?? 0),
      safeToClose: isCurrentDeleted
    };
  }

  /**
   * Prunes phantom ghost topics after channelDifferenceTooLong (Telegram-iOS #2404)
   */
  public syncTopicDifference(
    chatId: string,
    remoteActiveTopicIds: number[]
  ): { removedCount: number; remainingCount: number } {
    const topicsMap = this.chatTopics.get(chatId);
    if (!topicsMap) {
      return { removedCount: 0, remainingCount: 0 };
    }

    const remoteSet = new Set(remoteActiveTopicIds);
    let removedCount = 0;

    for (const localId of Array.from(topicsMap.keys())) {
      // General topic (1) is permanent unless channel converted
      if (localId !== 1 && !remoteSet.has(localId)) {
        topicsMap.delete(localId);
        this.topicMessages.get(chatId)?.delete(localId);
        removedCount++;
      }
    }

    return {
      removedCount,
      remainingCount: topicsMap.size
    };
  }

  /**
   * Per-topic mute settings (Unigram #3220)
   */
  public setTopicMute(chatId: string, topicId: number, isMuted: boolean, mutedUntil?: number): boolean {
    const topic = this.chatTopics.get(chatId)?.get(topicId);
    if (!topic) return false;

    topic.isMuted = isMuted;
    topic.mutedUntil = isMuted ? (mutedUntil || Date.now() + 365 * 24 * 3600 * 1000) : undefined;
    return true;
  }

  public isTopicMuted(chatId: string, topicId: number): boolean {
    const topic = this.chatTopics.get(chatId)?.get(topicId);
    if (!topic) return false;
    if (!topic.isMuted) return false;
    if (topic.mutedUntil && Date.now() > topic.mutedUntil) {
      topic.isMuted = false;
      topic.mutedUntil = undefined;
      return false;
    }
    return true;
  }

  /**
   * Topic read state isolation preventing single-check bugs on General (tdesktop #31431 & iOS #2386)
   */
  public updateTopicReadState(
    chatId: string,
    topicId: number,
    maxReadId: number,
    isOutbox: boolean
  ): void {
    const topic = this.chatTopics.get(chatId)?.get(topicId);
    if (!topic) return;

    if (isOutbox) {
      topic.readOutboxMaxId = Math.max(topic.readOutboxMaxId, maxReadId);
      // Mark all outgoing messages up to maxReadId as read (two checks)
      const msgs = this.topicMessages.get(chatId)?.get(topicId);
      if (msgs) {
        for (const msg of msgs.values()) {
          if (msg.isOutgoing && msg.id <= maxReadId) {
            msg.isRead = true;
          }
        }
      }
    } else {
      topic.readInboxMaxId = Math.max(topic.readInboxMaxId, maxReadId);
      topic.unreadCount = Math.max(0, topic.unreadCount - 1);
    }
  }

  /**
   * Caches and resolves sender avatar in forum topic views (tdesktop #31427)
   */
  public registerSenderAvatar(senderId: string, avatarUrl: string): void {
    if (avatarUrl) {
      this.senderAvatarCache.set(senderId, avatarUrl);
    }
  }

  public resolveSenderAvatarInTopic(
    _chatId: string,
    _topicId: number,
    senderId: string,
    fallbackAvatar: string = 'default_avatar.png'
  ): string {
    return this.senderAvatarCache.get(senderId) || fallbackAvatar;
  }

  /**
   * Adds or retains messages in topic, preserving ghost deleted messages (AyuGram #454)
   */
  public addTopicMessage(chatId: string, topicId: number, msg: TopicMessage): void {
    if (!this.topicMessages.has(chatId)) {
      this.topicMessages.set(chatId, new Map());
    }
    const chatMap = this.topicMessages.get(chatId)!;
    if (!chatMap.has(topicId)) {
      chatMap.set(topicId, new Map());
    }
    chatMap.get(topicId)!.set(msg.id, { ...msg });
  }

  public retainTopicDeletedMessage(chatId: string, topicId: number, messageId: number): boolean {
    const msg = this.topicMessages.get(chatId)?.get(topicId)?.get(messageId);
    if (!msg) return false;
    msg.isGhostDeleted = true;
    return true;
  }

  public getTopicMessages(chatId: string, topicId: number): TopicMessage[] {
    const msgsMap = this.topicMessages.get(chatId)?.get(topicId);
    if (!msgsMap) return [];
    return Array.from(msgsMap.values()).sort((a, b) => a.id - b.id);
  }

  /**
   * Handles first slash command from "All Messages" view (tdesktop #31451)
   */
  public handleSlashCommandInAllMessages(
    _chatId: string,
    commandText: string
  ): { createNewThread: boolean; newTopicTitle?: string } {
    const match = commandText.trim().match(/^\/([a-zA-Z0-9_]+)(\s+(.*))?$/);
    if (!match) {
      return { createNewThread: false };
    }

    const commandName = match[1];
    const commandArg = match[3] || '';
    const newTopicTitle = commandArg.trim() || `Thread: /${commandName}`;

    return {
      createNewThread: true,
      newTopicTitle
    };
  }
}

export const forumTopicAndThreadGovernor = new ForumTopicAndThreadGovernor();
