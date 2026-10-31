/**
 * Inline Bot, Mini App (TWA) & Keyboard Markup Governor
 *
 * Hardened against competitor issues:
 * - Ajaxy/telegram-tt #366: Inline keyboard is not removed after being reset by bot
 * - Ajaxy/telegram-tt #411: Bot forceReply not working / input focus lost
 * - morethanwords/tweb #274: URL field of getBotCallbackAnswer is not processed
 * - telegramdesktop/tdesktop #31395: SendRichMessage overrides InlineQueryResult description
 * - tdlib/td #336: Multi-row inline keyboard limits and grid layout failure
 * - TelegramMessenger/Telegram-iOS #1091: start_param dropped when Mini App opened via direct link
 * - morethanwords/tweb #271: Mini App launch timestamp & initData auth_date injection
 * - Ajaxy/telegram-tt #549: Prepared Mini App media preview drops captions and entities
 */

export interface InlineKeyboardButton {
  text: string;
  callbackData?: string;
  url?: string;
  webAppUrl?: string;
  switchInlineQuery?: string;
  switchInlineCurrentChat?: string;
}

export type InlineKeyboardRow = InlineKeyboardButton[];

export interface ReplyMarkup {
  type: 'inline_keyboard' | 'reply_keyboard' | 'force_reply' | 'remove_keyboard';
  rows?: InlineKeyboardRow[];
  placeholder?: string;
  selective?: boolean;
}

export interface BotCallbackAnswer {
  text?: string;
  showAlert?: boolean;
  url?: string;
  cacheTime?: number;
}

export interface WebAppLaunchParams {
  botId: string;
  botUsername: string;
  webAppUrl: string;
  startParam?: string;
  authDate?: number;
  queryId?: string;
}

export interface PreparedMediaMessage {
  caption?: string;
  entities?: Array<{ type: string; offset: number; length: number; url?: string }>;
  mediaType: 'photo' | 'video' | 'document';
  mediaUrl: string;
}

export class InlineBotAndWebAppGovernor {
  private messageMarkups: Map<number, ReplyMarkup | null> = new Map();
  private activeForceReplyMessageId: number | null = null;
  private pendingCallbackAnswers: Map<string, BotCallbackAnswer> = new Map();

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.messageMarkups.clear();
    this.activeForceReplyMessageId = null;
    this.pendingCallbackAnswers.clear();
  }

  /**
   * Applies or cleans up reply markup for a message (Ajaxy #366 & Ajaxy #411)
   */
  public applyReplyMarkup(messageId: number, markup: ReplyMarkup | null): {
    activeMarkup: ReplyMarkup | null;
    removed: boolean;
    forceReplyActive: boolean;
  } {
    if (!markup || markup.type === 'remove_keyboard') {
      this.messageMarkups.delete(messageId);
      if (this.activeForceReplyMessageId === messageId) {
        this.activeForceReplyMessageId = null;
      }
      return {
        activeMarkup: null,
        removed: true,
        forceReplyActive: false
      };
    }

    this.messageMarkups.set(messageId, markup);

    if (markup.type === 'force_reply') {
      this.activeForceReplyMessageId = messageId;
      return {
        activeMarkup: markup,
        removed: false,
        forceReplyActive: true
      };
    }

    return {
      activeMarkup: markup,
      removed: false,
      forceReplyActive: this.activeForceReplyMessageId === messageId
    };
  }

  public getActiveMarkup(messageId: number): ReplyMarkup | null {
    return this.messageMarkups.get(messageId) || null;
  }

  public isForceReplyActiveFor(messageId: number): boolean {
    return this.activeForceReplyMessageId === messageId;
  }

  /**
   * Processes getBotCallbackAnswer including external URL redirection (morethanwords #274)
   */
  public processCallbackAnswer(answer: BotCallbackAnswer): {
    action: 'alert' | 'toast' | 'open_url';
    targetUrl?: string;
    message?: string;
  } {
    if (answer.url && answer.url.trim().length > 0) {
      return {
        action: 'open_url',
        targetUrl: answer.url.trim(),
        message: answer.text
      };
    }

    if (answer.showAlert) {
      return {
        action: 'alert',
        message: answer.text || 'Bot notification'
      };
    }

    return {
      action: 'toast',
      message: answer.text || 'Action confirmed'
    };
  }

  /**
   * Builds Mini App launch URL with start_param and auth_date injection (Telegram-iOS #1091 & morethanwords #271)
   */
  public buildWebAppLaunchUrl(params: WebAppLaunchParams): {
    launchUrl: string;
    tgWebAppStartParam?: string;
    initData: string;
  } {
    const authDate = params.authDate || Math.floor(Date.now() / 1000);
    const startParam = params.startParam?.trim() || undefined;

    const initDataEntries: string[] = [
      `auth_date=${authDate}`,
      `bot_username=${encodeURIComponent(params.botUsername.replace(/^@/, ''))}`
    ];

    if (params.queryId) {
      initDataEntries.push(`query_id=${encodeURIComponent(params.queryId)}`);
    }

    if (startParam) {
      initDataEntries.push(`start_param=${encodeURIComponent(startParam)}`);
    }

    const initDataString = initDataEntries.join('&');
    const separator = params.webAppUrl.includes('#') ? '&' : '#';
    let finalUrl = `${params.webAppUrl}${separator}tgWebAppData=${encodeURIComponent(initDataString)}`;

    if (startParam) {
      finalUrl += `&tgWebAppStartParam=${encodeURIComponent(startParam)}`;
    }

    return {
      launchUrl: finalUrl,
      tgWebAppStartParam: startParam,
      initData: initDataString
    };
  }

  /**
   * Preserves captions and entities in prepared Mini App media previews (Ajaxy #549)
   */
  public formatPreparedMiniAppMessage(prepared: PreparedMediaMessage): {
    finalCaption: string;
    formattedEntities: Array<{ type: string; offset: number; length: number; url?: string }>;
    mediaPreserved: boolean;
  } {
    const finalCaption = prepared.caption || '';
    const formattedEntities = prepared.entities ? [...prepared.entities] : [];

    return {
      finalCaption,
      formattedEntities,
      mediaPreserved: !!prepared.mediaUrl
    };
  }

  /**
   * Preserves custom InlineQueryResult description without being clobbered by summary (tdesktop #31395)
   */
  public sanitizeInlineQueryResult(result: {
    id: string;
    type: string;
    title: string;
    description?: string;
    inputMessageContent: { messageText: string; parseMode?: string };
  }): {
    id: string;
    type: string;
    title: string;
    description: string;
    inputMessageContent: { messageText: string; parseMode?: string };
  } {
    return {
      id: result.id,
      type: result.type,
      title: result.title,
      description: result.description || result.title,
      inputMessageContent: { ...result.inputMessageContent }
    };
  }

  /**
   * Validates and normalizes multi-row inline keyboard layouts (tdlib #336)
   * Supports arbitrary row counts without truncating beyond 3 rows
   */
  public validateInlineKeyboardGrid(rows: InlineKeyboardRow[]): {
    valid: boolean;
    rowCount: number;
    buttonCount: number;
    normalizedRows: InlineKeyboardRow[];
  } {
    let buttonCount = 0;
    const normalizedRows: InlineKeyboardRow[] = [];

    for (const row of rows) {
      if (!Array.isArray(row) || row.length === 0) continue;
      const validRow: InlineKeyboardButton[] = [];
      for (const btn of row) {
        if (!btn || !btn.text) continue;
        validRow.push({ ...btn });
        buttonCount++;
      }
      if (validRow.length > 0) {
        normalizedRows.push(validRow);
      }
    }

    return {
      valid: normalizedRows.length > 0,
      rowCount: normalizedRows.length,
      buttonCount,
      normalizedRows
    };
  }
}

export const inlineBotAndWebAppGovernor = new InlineBotAndWebAppGovernor();
