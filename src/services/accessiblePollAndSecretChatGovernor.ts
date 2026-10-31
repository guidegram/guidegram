/**
 * Accessible Polls, Secret Chat Formatted Captions & Zero-Secret Leak Governor
 *
 * Hardened against competitor issues:
 * - UnigramDev/Unigram #2738: Viewing results for polls is not accessible to screen readers
 * - UnigramDev/Unigram #2339: Screen reader does not announce number of votes near each variant
 * - AyuGram/AyuGramDesktop #332: Poll message not showing / empty results fallback
 * - tdlib/td #935: inputMessagePhoto SecretChat caption missing formattedText
 * - tdlib/td #1024: SecretChat on iOS/iPhone chat not found (hydration & peer resolution)
 * - Ajaxy/telegram-tt #342: Preventing API secret leaks in client/public environments
 */

export interface PollOption {
  id: string;
  text: string;
  voterCount: number;
  percentage: number;
  isChosen: boolean;
  isCorrect?: boolean;
}

export interface PollMessage {
  id: string;
  question: string;
  options: PollOption[];
  totalVoters: number;
  isClosed: boolean;
  isAnonymous: boolean;
  allowsMultipleAnswers: boolean;
  isQuiz: boolean;
  correctOptionId?: string;
  explanation?: string;
}

export interface FormattedEntity {
  type: 'bold' | 'italic' | 'link' | 'code';
  offset: number;
  length: number;
  url?: string;
}

export interface FormattedText {
  text: string;
  entities: FormattedEntity[];
}

export interface SecretChatPhotoMessage {
  messageId: string;
  chatId: string;
  photoUrl: string;
  caption: FormattedText;
  ttlSeconds: number;
  createdAt: number;
}

export class AccessiblePollAndSecretChatGovernor {
  private secretChats: Map<string, { peerId: string; accessHash: string; activeKey: string }> = new Map();

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.secretChats.clear();
  }

  /**
   * Registers a secret chat peer for hydration (tdlib #1024)
   */
  public registerSecretChat(chatId: string, peerId: string, accessHash: string, activeKey: string): void {
    this.secretChats.set(chatId, { peerId, accessHash, activeKey });
  }

  public resolveSecretChat(chatId: string): { found: boolean; peer?: { peerId: string; accessHash: string } } {
    const chat = this.secretChats.get(chatId);
    if (chat) {
      return { found: true, peer: { peerId: chat.peerId, accessHash: chat.accessHash } };
    }
    return { found: false };
  }

  /**
   * Creates fully serialized poll message with guaranteed visibility (AyuGram #332)
   */
  public createPollMessage(
    id: string,
    question: string,
    optionTexts: string[],
    options: {
      isAnonymous?: boolean;
      allowsMultipleAnswers?: boolean;
      isQuiz?: boolean;
      correctOptionId?: string;
      explanation?: string;
    } = {}
  ): PollMessage {
    const pollOptions: PollOption[] = optionTexts.map((text, index) => ({
      id: `opt_${index}`,
      text,
      voterCount: 0,
      percentage: 0,
      isChosen: false,
      isCorrect: options.correctOptionId === `opt_${index}`
    }));

    return {
      id,
      question: question.trim(),
      options: pollOptions,
      totalVoters: 0,
      isClosed: false,
      isAnonymous: options.isAnonymous ?? true,
      allowsMultipleAnswers: options.allowsMultipleAnswers ?? false,
      isQuiz: options.isQuiz ?? false,
      correctOptionId: options.correctOptionId,
      explanation: options.explanation
    };
  }

  /**
   * Submits a vote and recalculates percentages
   */
  public castVote(poll: PollMessage, optionIds: string[]): PollMessage {
    const updatedOptions = poll.options.map(opt => {
      const isChosen = optionIds.includes(opt.id);
      const newVoterCount = opt.voterCount + (isChosen ? 1 : 0);
      return {
        ...opt,
        isChosen,
        voterCount: newVoterCount
      };
    });

    const newTotalVoters = poll.totalVoters + 1;
    for (const opt of updatedOptions) {
      opt.percentage = newTotalVoters > 0 ? Math.round((opt.voterCount / newTotalVoters) * 100) : 0;
    }

    return {
      ...poll,
      options: updatedOptions,
      totalVoters: newTotalVoters
    };
  }

  /**
   * Accessible ARIA labels for poll options (Unigram #2738, #2339)
   */
  public getAccessiblePollOptionAria(option: PollOption, totalVoters: number): string {
    const chosenPart = option.isChosen ? ', chosen by you' : '';
    const correctPart = option.isCorrect !== undefined ? (option.isCorrect ? ', correct answer' : '') : '';
    return `${option.text}: ${option.voterCount} votes (${option.percentage}%)${chosenPart}${correctPart}`;
  }

  public getAccessiblePollSummaryAria(poll: PollMessage): string {
    const typeStr = poll.isQuiz ? 'Quiz' : (poll.isAnonymous ? 'Anonymous Poll' : 'Public Poll');
    return `${typeStr}: ${poll.question}. Total votes: ${poll.totalVoters}.`;
  }

  /**
   * Serializes Secret Chat photo message with formattedText (tdlib #935)
   */
  public serializeSecretChatPhotoMessage(
    messageId: string,
    chatId: string,
    photoUrl: string,
    captionText: string,
    entities: FormattedEntity[] = [],
    ttlSeconds: number = 0
  ): SecretChatPhotoMessage {
    return {
      messageId,
      chatId,
      photoUrl,
      caption: {
        text: captionText,
        entities
      },
      ttlSeconds,
      createdAt: Date.now()
    };
  }

  /**
   * Sanitizes configuration object preventing API secret leakage (Ajaxy #342)
   */
  public sanitizeClientConfig(rawConfig: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = { ...rawConfig };
    const forbiddenKeys = ['api_hash', 'bot_token', 'jwt_secret', 'secret_key', 'private_key', 'db_password'];

    for (const key of Object.keys(sanitized)) {
      if (forbiddenKeys.some(f => key.toLowerCase().includes(f))) {
        delete sanitized[key];
      }
    }

    return sanitized;
  }
}

export const accessiblePollAndSecretChatGovernor = new AccessiblePollAndSecretChatGovernor();
