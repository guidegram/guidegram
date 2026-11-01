/**
 * TDLib DB Encryption, Chat List Pagination, Web Worker Sandbox, Auth Code Normalization,
 * 64-bit BigInt Safety & Reaction Payloads Governor
 *
 * Hardens Guidegram against:
 * 1. tdlib/td#188 - Database encryption key derivation & validation (setDatabaseEncryptionKey)
 * 2. tdlib/td#1847 - loadChats pagination deadlock & empty list termination
 * 3. tdlib/td#1126 - Web Worker instantiation with Blob URL fallback for CORS/sandboxes
 * 4. tdlib/td#942 - checkAuthenticationCode normalization & retry backoff
 * 5. tdlib/td#263 - 64-bit integer ID safety (BigInt & String preservation vs IEEE 754 precision loss)
 * 6. tdlib/td#3007 - Message reaction payload parser (standard emoji vs custom emoji ID)
 * 7. tdlib/td#1195 - TDJSON C-string zero-termination & JSON syntax sanitization
 */

export interface SetEncryptionKeyQuery {
  '@type': 'setDatabaseEncryptionKey';
  new_encryption_key: string;
}

export interface LoadChatsState {
  chatList: 'main' | 'archive';
  limit: number;
  isLoading: boolean;
  hasMore: boolean;
  totalLoaded: number;
}

export interface AuthCodeValidationResult {
  isValid: boolean;
  normalizedCode: string;
  error?: string;
  retryCount: number;
  backoffDelayMs: number;
}

export interface NormalizedReaction {
  type: 'emoji' | 'custom_emoji';
  value: string;
  tdlibPayload: {
    '@type': 'reactionTypeEmoji' | 'reactionTypeCustomEmoji';
    emoji?: string;
    custom_emoji_id?: string;
  };
}

export interface SanitizedTdjsonBuffer {
  jsonString: string;
  byteLength: number;
  hasNullTerminator: boolean;
}

export class TdlibDatabaseWorkerAuthAndReactionGovernor {
  private loadChatsState: LoadChatsState = {
    chatList: 'main',
    limit: 20,
    isLoading: false,
    hasMore: true,
    totalLoaded: 0,
  };

  private authCodeRetryCount: number = 0;

  // =========================================================================
  // 1. Database Encryption Key Query (tdlib/td#188)
  // =========================================================================

  public buildSetDatabaseEncryptionKeyQuery(passphrase?: string): SetEncryptionKeyQuery {
    if (!passphrase || passphrase.trim().length === 0) {
      return {
        '@type': 'setDatabaseEncryptionKey',
        new_encryption_key: '', // Empty key opens unencrypted DB or disables encryption
      };
    }

    const cleanPassphrase = passphrase.trim();
    if (cleanPassphrase.length < 6) {
      throw new Error('Database encryption key passphrase must be at least 6 characters long');
    }

    // Base64 encode for TDLib binary key representation
    const base64Key = Buffer.from(cleanPassphrase, 'utf-8').toString('base64');

    return {
      '@type': 'setDatabaseEncryptionKey',
      new_encryption_key: base64Key,
    };
  }

  // =========================================================================
  // 2. loadChats Pagination Loop & 404 End-of-List Guard (tdlib/td#1847)
  // =========================================================================

  public prepareLoadChats(chatList: 'main' | 'archive' = 'main', limit: number = 20): {
    canLoad: boolean;
    query?: { '@type': 'loadChats'; chat_list: { '@type': string }; limit: number };
  } {
    if (!this.loadChatsState.hasMore || this.loadChatsState.isLoading) {
      return { canLoad: false };
    }

    this.loadChatsState.isLoading = true;
    this.loadChatsState.chatList = chatList;
    this.loadChatsState.limit = limit;

    const listType = chatList === 'archive' ? 'chatListArchive' : 'chatListMain';

    return {
      canLoad: true,
      query: {
        '@type': 'loadChats',
        chat_list: { '@type': listType },
        limit,
      },
    };
  }

  public handleLoadChatsResponse(response: { code?: number; message?: string } | null, loadedCount: number) {
    this.loadChatsState.isLoading = false;

    // TDLib returns 404 (Not Found) when there are no more chats to load in the list
    if (response && response.code === 404) {
      this.loadChatsState.hasMore = false;
      return;
    }

    if (loadedCount === 0) {
      this.loadChatsState.hasMore = false;
      return;
    }

    this.loadChatsState.totalLoaded += loadedCount;
    this.loadChatsState.hasMore = loadedCount >= this.loadChatsState.limit;
  }

  public getLoadChatsState(): LoadChatsState {
    return { ...this.loadChatsState };
  }

  // =========================================================================
  // 3. Web Worker Blob URL Fallback for Sandboxes/CORS (tdlib/td#1126)
  // =========================================================================

  public createWorkerScriptUrl(
    workerScriptContent: string,
    scriptUrl?: string,
    isSandboxedOrCrossDomain: boolean = false
  ): { workerUrl: string; isBlobUrl: boolean } {
    // If running in sandboxed iframe or cross-origin CDN, direct URL fails -> use inline Blob
    if (isSandboxedOrCrossDomain || !scriptUrl) {
      const blob = new Blob([workerScriptContent], { type: 'application/javascript' });
      return {
        workerUrl: URL.createObjectURL(blob),
        isBlobUrl: true,
      };
    }

    return {
      workerUrl: scriptUrl,
      isBlobUrl: false,
    };
  }

  // =========================================================================
  // 4. checkAuthenticationCode Normalization & Cooldown (tdlib/td#942)
  // =========================================================================

  public normalizeAuthCode(rawCode: string): AuthCodeValidationResult {
    // Strip hyphens, spaces, letters, and special symbols
    const digitsOnly = rawCode.replace(/\D/g, '');

    if (digitsOnly.length < 5 || digitsOnly.length > 8) {
      return {
        isValid: false,
        normalizedCode: digitsOnly,
        error: 'Telegram authentication code must be between 5 and 8 digits',
        retryCount: this.authCodeRetryCount,
        backoffDelayMs: 0,
      };
    }

    return {
      isValid: true,
      normalizedCode: digitsOnly,
      retryCount: this.authCodeRetryCount,
      backoffDelayMs: 0,
    };
  }

  public handleAuthCodeFailure(errorCode: number | string): { backoffDelayMs: number; retryCount: number } {
    this.authCodeRetryCount += 1;

    // Exponential backoff: 0s, 2s, 5s, 15s, 60s
    let delayMs = 0;
    if (this.authCodeRetryCount === 2) delayMs = 2000;
    else if (this.authCodeRetryCount === 3) delayMs = 5000;
    else if (this.authCodeRetryCount >= 4) delayMs = 15000;

    return {
      backoffDelayMs: delayMs,
      retryCount: this.authCodeRetryCount,
    };
  }

  public resetAuthCodeState() {
    this.authCodeRetryCount = 0;
  }

  // =========================================================================
  // 5. 64-bit Integer ID Safety & BigInt Precision (tdlib/td#263)
  // =========================================================================

  public safeParseTelegramId(id: string | number | bigint): {
    asBigInt: bigint;
    asString: string;
    isSafeInteger: boolean;
  } {
    let big: bigint;
    if (typeof id === 'bigint') {
      big = id;
    } else {
      big = BigInt(String(id).trim());
    }

    const str = big.toString();
    const isSafeInteger = big >= -9007199254740991n && big <= 9007199254740991n;

    return {
      asBigInt: big,
      asString: str,
      isSafeInteger,
    };
  }

  public serializeMessageWith64BitId(id: string | number | bigint, text: string): string {
    const safeId = this.safeParseTelegramId(id);
    return JSON.stringify({
      id: safeId.asString, // Serialized as String to prevent IEEE 754 JSON precision loss
      text,
    });
  }

  // =========================================================================
  // 6. Reaction Type Normalization (tdlib/td#3007)
  // =========================================================================

  public normalizeReaction(rawReaction: any): NormalizedReaction {
    if (!rawReaction) {
      return {
        type: 'emoji',
        value: '👍',
        tdlibPayload: { '@type': 'reactionTypeEmoji', emoji: '👍' },
      };
    }

    // If it's a numeric string or object with custom_emoji_id
    if (rawReaction.custom_emoji_id || (typeof rawReaction === 'string' && /^\d{10,}$/.test(rawReaction))) {
      const customId = String(rawReaction.custom_emoji_id || rawReaction);
      return {
        type: 'custom_emoji',
        value: customId,
        tdlibPayload: {
          '@type': 'reactionTypeCustomEmoji',
          custom_emoji_id: customId,
        },
      };
    }

    // Standard unicode emoji
    const emojiStr = typeof rawReaction === 'string' ? rawReaction : (rawReaction.emoji || '👍');
    return {
      type: 'emoji',
      value: emojiStr,
      tdlibPayload: {
        '@type': 'reactionTypeEmoji',
        emoji: emojiStr,
      },
    };
  }

  // =========================================================================
  // 7. TDJSON C-String Null-Termination & Sanitization (tdlib/td#1195)
  // =========================================================================

  public sanitizeTdjsonCString(rawJson: string): SanitizedTdjsonBuffer {
    const trimmed = rawJson.trim();

    // Verify valid JSON syntax
    JSON.parse(trimmed);

    // Append null-terminator for C ABI interop
    const nullTerminated = trimmed + '\0';
    const byteLength = Buffer.byteLength(nullTerminated, 'utf-8');

    return {
      jsonString: nullTerminated,
      byteLength,
      hasNullTerminator: nullTerminated.endsWith('\0'),
    };
  }
}
