/**
 * Web Client Stars Giveaway, Message Editor, Memory LRU Pruning, Context Slices,
 * Thread Routing & Dynamic Chunks Governor
 *
 * Hardens Guidegram web & desktop clients against:
 * 1. Ajaxy/telegram-tt#415 - Offer Custom StarsGiveawayOptions (giveaway validation & constraints)
 * 2. Ajaxy/telegram-tt#413 - Message editor for Telegram (48h edit window vs Saved Messages infinite edit)
 * 3. Ajaxy/telegram-tt#400 - Memory consumption (LRU blob media cache & automatic memory reclamation)
 * 4. Ajaxy/telegram-tt#382 - UseContext performance bottleneck (Selective context slice subscriptions)
 * 5. Ajaxy/telegram-tt#360 - Open chat thread by username (@username/thread/123 route dispatcher)
 * 6. Ajaxy/telegram-tt#429 - Packaged Electron async chunk path normalization (calls.async.ts 404 fix)
 * 7. Ajaxy/telegram-tt#437 - Telegram API ID / API Hash credentials format validator
 */

export interface StarsGiveawayConfig {
  totalStars: number;
  winnersCount: number;
  durationDays: number;
  countries?: string[];
  onlyNewSubscribers?: boolean;
}

export interface StarsGiveawayValidationResult {
  isValid: boolean;
  starsPerWinner: number;
  untilDateTimestamp: number;
  errors: string[];
}

export interface MessageToEdit {
  id: number;
  date: number; // Unix timestamp in seconds
  senderId: number;
  isOutgoing: boolean;
  isSavedMessages: boolean;
  mediaType?: 'photo' | 'video' | 'document' | 'voice' | 'round_video';
}

export interface MessageEditabilityResult {
  canEdit: boolean;
  canEditCaption: boolean;
  remainingEditTimeSeconds: number;
  reason?: string;
}

export interface CachedBlobItem {
  id: string;
  blobUrl: string;
  byteSize: number;
  lastAccessed: number;
}

export interface UsernameThreadRoute {
  isValid: boolean;
  username: string | null;
  threadId: number | null;
  canonicalDeepLink: string | null;
}

export interface ApiCredentialsValidationResult {
  isValid: boolean;
  cleanApiId: number | null;
  cleanApiHash: string | null;
  errors: string[];
}

export class WebGiveawayEditorMemoryAndThreadGovernor {
  private lruCache: Map<string, CachedBlobItem> = new Map();
  private maxLruItems: number = 50;
  private maxTotalBytes: number = 30 * 1024 * 1024; // 30 MB
  private currentTotalBytes: number = 0;
  private revokedBlobUrls: string[] = [];

  // =========================================================================
  // 1. Telegram Stars Giveaway Configuration Validator (Ajaxy/telegram-tt#415)
  // =========================================================================

  public validateStarsGiveawayConfig(
    config: StarsGiveawayConfig,
    currentTimestampSeconds: number = Math.floor(Date.now() / 1000)
  ): StarsGiveawayValidationResult {
    const errors: string[] = [];

    if (!Number.isInteger(config.totalStars) || config.totalStars < 50) {
      errors.push('Total stars must be an integer of at least 50');
    }

    if (!Number.isInteger(config.winnersCount) || config.winnersCount < 1 || config.winnersCount > 100) {
      errors.push('Winners count must be between 1 and 100');
    }

    if (config.totalStars < config.winnersCount * 50) {
      errors.push(`Total stars (${config.totalStars}) must allow at least 50 stars per winner (${config.winnersCount * 50} required)`);
    }

    if (config.durationDays < 1 || config.durationDays > 31) {
      errors.push('Giveaway duration must be between 1 and 31 days');
    }

    if (config.countries) {
      for (const country of config.countries) {
        if (!/^[A-Z]{2}$/.test(country)) {
          errors.push(`Invalid country code: ${country}. Must be ISO 3166-1 alpha-2.`);
        }
      }
    }

    const starsPerWinner = errors.length === 0 ? Math.floor(config.totalStars / config.winnersCount) : 0;
    const untilDateTimestamp = currentTimestampSeconds + config.durationDays * 86400;

    return {
      isValid: errors.length === 0,
      starsPerWinner,
      untilDateTimestamp,
      errors,
    };
  }

  // =========================================================================
  // 2. Message Editability & 48h Window vs Saved Messages (Ajaxy/telegram-tt#413)
  // =========================================================================

  public evaluateMessageEditability(
    message: MessageToEdit,
    currentUserId: number,
    currentTimeSeconds: number = Math.floor(Date.now() / 1000)
  ): MessageEditabilityResult {
    // 1. Can only edit own messages (unless in saved messages where all messages belong to current user)
    if (!message.isSavedMessages && message.senderId !== currentUserId) {
      return {
        canEdit: false,
        canEditCaption: false,
        remainingEditTimeSeconds: 0,
        reason: 'Cannot edit messages sent by other participants',
      };
    }

    // 2. Saved messages has infinite edit window!
    if (message.isSavedMessages) {
      return {
        canEdit: true,
        canEditCaption: true,
        remainingEditTimeSeconds: Infinity,
      };
    }

    // 3. Standard chat: 48 hours = 172,800 seconds
    const editWindow = 172800;
    const elapsed = currentTimeSeconds - message.date;
    const remaining = Math.max(0, editWindow - elapsed);

    if (remaining <= 0) {
      return {
        canEdit: false,
        canEditCaption: false,
        remainingEditTimeSeconds: 0,
        reason: 'Message edit window expired (48 hours maximum)',
      };
    }

    // Voice and video notes cannot have their media modified, only text caption
    const isVoiceOrRound = message.mediaType === 'voice' || message.mediaType === 'round_video';
    const canEditFull = !isVoiceOrRound;

    return {
      canEdit: canEditFull,
      canEditCaption: true,
      remainingEditTimeSeconds: remaining,
    };
  }

  // =========================================================================
  // 3. Memory Consumption & LRU Blob Cache Reclaimer (Ajaxy/telegram-tt#400)
  // =========================================================================

  public cacheMediaBlob(
    id: string,
    blobUrl: string,
    byteSize: number,
    revokeFn?: (url: string) => void
  ) {
    // If item already exists, subtract old size
    if (this.lruCache.has(id)) {
      this.currentTotalBytes -= this.lruCache.get(id)!.byteSize;
      this.lruCache.delete(id);
    }

    // Evict oldest items if exceeding capacity
    while (
      this.lruCache.size >= this.maxLruItems ||
      this.currentTotalBytes + byteSize > this.maxTotalBytes
    ) {
      const oldestKey = this.lruCache.keys().next().value;
      if (!oldestKey) break;
      const evicted = this.lruCache.get(oldestKey)!;
      this.currentTotalBytes -= evicted.byteSize;
      this.lruCache.delete(oldestKey);

      // Reclaim memory
      this.revokedBlobUrls.push(evicted.blobUrl);
      if (revokeFn) {
        revokeFn(evicted.blobUrl);
      }
    }

    this.lruCache.set(id, {
      id,
      blobUrl,
      byteSize,
      lastAccessed: Date.now(),
    });
    this.currentTotalBytes += byteSize;
  }

  public getCachedBlob(id: string): string | null {
    const item = this.lruCache.get(id);
    if (!item) return null;

    // Refresh LRU position
    this.lruCache.delete(id);
    item.lastAccessed = Date.now();
    this.lruCache.set(id, item);
    return item.blobUrl;
  }

  public getRevokedBlobUrls(): string[] {
    return [...this.revokedBlobUrls];
  }

  public getCacheMetrics() {
    return {
      itemCount: this.lruCache.size,
      totalBytes: this.currentTotalBytes,
      maxItems: this.maxLruItems,
      maxBytes: this.maxTotalBytes,
    };
  }

  // =========================================================================
  // 4. Context Slice Subscriptions (Ajaxy/telegram-tt#382)
  // =========================================================================

  public filterStateUpdateNotifications<T extends Record<string, any>>(
    prevState: T,
    nextState: T,
    monitoredKeys: (keyof T)[]
  ): { hasChanged: boolean; changedKeys: (keyof T)[] } {
    const changedKeys: (keyof T)[] = [];
    for (const key of monitoredKeys) {
      if (prevState[key] !== nextState[key]) {
        changedKeys.push(key);
      }
    }

    return {
      hasChanged: changedKeys.length > 0,
      changedKeys,
    };
  }

  // =========================================================================
  // 5. Open Chat Thread by Username (Ajaxy/telegram-tt#360)
  // =========================================================================

  public parseUsernameThreadRoute(rawUrlOrPath: string): UsernameThreadRoute {
    const clean = rawUrlOrPath.trim();

    // 1. @username/thread/123 or username/thread/123
    const threadMatch = clean.match(/(?:@|^)([a-zA-Z0-9_]{5,32})\/thread\/(\d+)/i);
    if (threadMatch) {
      return {
        isValid: true,
        username: threadMatch[1],
        threadId: parseInt(threadMatch[2], 10),
        canonicalDeepLink: `tg://resolve?domain=${threadMatch[1]}&thread=${threadMatch[2]}`,
      };
    }

    // 2. https://t.me/username/123 (supergroup topic post)
    const tmeMatch = clean.match(/t\.me\/([a-zA-Z0-9_]{5,32})\/(\d+)/i);
    if (tmeMatch) {
      return {
        isValid: true,
        username: tmeMatch[1],
        threadId: parseInt(tmeMatch[2], 10),
        canonicalDeepLink: `tg://resolve?domain=${tmeMatch[1]}&post=${tmeMatch[2]}`,
      };
    }

    return {
      isValid: false,
      username: null,
      threadId: null,
      canonicalDeepLink: null,
    };
  }

  // =========================================================================
  // 6. Packaged Electron Async Chunk Path Normalization (Ajaxy/telegram-tt#429)
  // =========================================================================

  public resolvePackagedAsyncChunkPath(
    chunkFileName: string,
    isPackaged: boolean,
    appRootPath: string
  ): string {
    const sanitizedFile = chunkFileName.replace(/^\.?\/+/, '');

    if (!isPackaged) {
      return `./${sanitizedFile}`;
    }

    // In packaged Electron production app, normalize to app bundle or ASAR dist directory
    const cleanAppRoot = appRootPath.replace(/\\/g, '/').replace(/\/+$/, '');
    return `file://${cleanAppRoot}/dist/${sanitizedFile}`;
  }

  // =========================================================================
  // 7. Telegram API ID / API Hash Validator (Ajaxy/telegram-tt#437)
  // =========================================================================

  public validateApiCredentials(
    rawApiId: any,
    rawApiHash: any
  ): ApiCredentialsValidationResult {
    const errors: string[] = [];
    let cleanApiId: number | null = null;
    let cleanApiHash: string | null = null;

    // Validate API ID
    const parsedId = typeof rawApiId === 'number' ? rawApiId : parseInt(String(rawApiId).trim(), 10);
    if (isNaN(parsedId) || parsedId < 1000) {
      errors.push('TELEGRAM_API_ID must be a positive integer greater than 1000 obtained from my.telegram.org');
    } else {
      cleanApiId = parsedId;
    }

    // Validate API Hash
    const strHash = String(rawApiHash || '').trim();
    if (!/^[0-9a-fA-F]{32}$/.test(strHash)) {
      errors.push('TELEGRAM_API_HASH must be a 32-character hexadecimal string obtained from my.telegram.org');
    } else {
      cleanApiHash = strHash.toLowerCase();
    }

    return {
      isValid: errors.length === 0,
      cleanApiId,
      cleanApiHash,
      errors,
    };
  }
}
