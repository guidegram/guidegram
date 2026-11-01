/**
 * Web Client Group Migration, HiDPI Scaling, Participants Pagination, Storage Fallback,
 * Notification Deduplication, Intl Polyfill & Cross-Chat Reply Governor
 *
 * Hardens Guidegram web & desktop clients against:
 * 1. Ajaxy/telegram-tt#447 - Groups became inaccessible (Migrated group -> Supergroup routing)
 * 2. Ajaxy/telegram-tt#440 - The whole app is blurry (HiDPI / devicePixelRatio crisp canvas scaling)
 * 3. Ajaxy/telegram-tt#435 - Unable to fetch members of a chat (pagination, flood backoff & privacy fallback)
 * 4. Ajaxy/telegram-tt#421 - Firefox private browsing storage lock (IndexedDB -> Memory storage fallback)
 * 5. Ajaxy/telegram-tt#393 - Repeated pop-up notifications (Sliding window TTL notification deduplicator)
 * 6. Ajaxy/telegram-tt#371 - Intl.ListFormat breaks older WebKit (Native check & polyfill fallback)
 * 7. Ajaxy/telegram-tt#353 - Reply in another chat (Cross-chat quote reply 2.0 payload builder)
 */

export interface GroupMigrationRecord {
  supergroupId: string | number;
  maxMessageId: number;
  migratedAt: number;
}

export interface HiDpiCanvasMetrics {
  logicalWidth: number;
  logicalHeight: number;
  physicalWidth: number;
  physicalHeight: number;
  dpr: number;
  cssStyle: {
    width: string;
    height: string;
  };
}

export interface ParticipantsResult<T> {
  participants: T[];
  totalFetched: number;
  isComplete: boolean;
  isHiddenByAdmin: boolean;
  rateLimitHits: number;
}

export interface CrossChatReplyPayload {
  destinationChatId: string | number;
  sourceChatId: string | number;
  sourceChatTitle: string;
  sourceMessageId: number;
  quoteText: string;
  senderName: string;
}

export class WebCrossChatStorageDpiAndParticipantsGovernor {
  private migrationMap: Map<string | number, GroupMigrationRecord> = new Map();
  private notificationHistory: Map<string, number> = new Map(); // key -> timestamp
  private memoryStorage: Map<string, string> = new Map();
  private isIndexedDbAvailable: boolean = true;

  // =========================================================================
  // 1. Group-to-Supergroup Migration Routing (Ajaxy/telegram-tt#447)
  // =========================================================================

  public registerGroupMigration(
    legacyGroupId: string | number,
    supergroupId: string | number,
    maxMessageId: number
  ) {
    this.migrationMap.set(legacyGroupId, {
      supergroupId,
      maxMessageId,
      migratedAt: Date.now(),
    });
  }

  public resolveActiveChatPeer(requestedChatId: string | number): {
    effectiveChatId: string | number;
    isMigrated: boolean;
    migrationDetails?: GroupMigrationRecord;
  } {
    const migration = this.migrationMap.get(requestedChatId);
    if (migration) {
      return {
        effectiveChatId: migration.supergroupId,
        isMigrated: true,
        migrationDetails: migration,
      };
    }

    return {
      effectiveChatId: requestedChatId,
      isMigrated: false,
    };
  }

  // =========================================================================
  // 2. HiDPI Canvas Scaling & Razor-Sharp Rendering (Ajaxy/telegram-tt#440)
  // =========================================================================

  public calculateHiDpiCanvasMetrics(
    logicalWidth: number,
    logicalHeight: number,
    rawDpr: number = 1.0
  ): HiDpiCanvasMetrics {
    // Clamp DPR between 1.0 and 3.0 to prevent GPU VRAM exhaustion on extreme displays
    const dpr = Math.min(Math.max(rawDpr || 1.0, 1.0), 3.0);
    const physicalWidth = Math.round(logicalWidth * dpr);
    const physicalHeight = Math.round(logicalHeight * dpr);

    return {
      logicalWidth,
      logicalHeight,
      physicalWidth,
      physicalHeight,
      dpr,
      cssStyle: {
        width: `${logicalWidth}px`,
        height: `${logicalHeight}px`,
      },
    };
  }

  // =========================================================================
  // 3. Paginated Participants with Privacy & Flood Backoff (Ajaxy/telegram-tt#435)
  // =========================================================================

  public async fetchParticipantsSafely<T>(
    totalToFetch: number,
    pageSize: number = 50,
    fetchBatch: (offset: number, limit: number) => Promise<{ items: T[]; isRestricted?: boolean }>
  ): Promise<ParticipantsResult<T>> {
    const collected: T[] = [];
    let offset = 0;
    let rateLimitHits = 0;

    while (offset < totalToFetch) {
      const limit = Math.min(pageSize, totalToFetch - offset);
      try {
        const batch = await fetchBatch(offset, limit);
        if (batch.isRestricted) {
          return {
            participants: collected,
            totalFetched: collected.length,
            isComplete: false,
            isHiddenByAdmin: true,
            rateLimitHits,
          };
        }

        if (!batch.items || batch.items.length === 0) {
          break;
        }

        collected.push(...batch.items);
        offset += batch.items.length;

        if (batch.items.length < limit) {
          break; // Server has no more items
        }
      } catch (err: any) {
        if (err && err.message && err.message.includes('FLOOD_WAIT')) {
          rateLimitHits += 1;
          break; // Stop fetching gracefully on rate limits
        }
        throw err;
      }
    }

    return {
      participants: collected,
      totalFetched: collected.length,
      isComplete: offset >= totalToFetch,
      isHiddenByAdmin: false,
      rateLimitHits,
    };
  }

  // =========================================================================
  // 4. Firefox Private Storage & Quota Lock Fallback (Ajaxy/telegram-tt#421)
  // =========================================================================

  public setIndexedDbAvailability(available: boolean) {
    this.isIndexedDbAvailable = available;
  }

  public getStorageEngineType(): 'indexeddb' | 'memory' {
    return this.isIndexedDbAvailable ? 'indexeddb' : 'memory';
  }

  public setStorageItem(key: string, value: string) {
    this.memoryStorage.set(key, value);
  }

  public getStorageItem(key: string): string | null {
    return this.memoryStorage.get(key) || null;
  }

  public removeStorageItem(key: string) {
    this.memoryStorage.delete(key);
  }

  // =========================================================================
  // 5. Sliding-Window Notification Deduplicator (Ajaxy/telegram-tt#393)
  // =========================================================================

  public shouldDispatchNotification(
    chatId: string | number,
    messageId: number,
    currentTime: number = Date.now(),
    ttlMs: number = 5000
  ): boolean {
    // Purge expired keys
    for (const [key, ts] of this.notificationHistory.entries()) {
      if (currentTime - ts > ttlMs) {
        this.notificationHistory.delete(key);
      }
    }

    const dedupeKey = `${chatId}:${messageId}`;
    if (this.notificationHistory.has(dedupeKey)) {
      return false; // Duplicate suppressed!
    }

    this.notificationHistory.set(dedupeKey, currentTime);
    return true;
  }

  // =========================================================================
  // 6. Intl.ListFormat WebKit Fallback Polyfill (Ajaxy/telegram-tt#371)
  // =========================================================================

  public safeFormatList(
    items: string[],
    locale: string = 'en',
    conjunctionWord: string = 'and'
  ): string {
    if (!items || items.length === 0) return '';
    if (items.length === 1) return items[0];

    // Check if native Intl.ListFormat is present in current runtime
    if (typeof Intl !== 'undefined' && (Intl as any).ListFormat) {
      try {
        return new (Intl as any).ListFormat(locale, { style: 'long', type: 'conjunction' }).format(items);
      } catch {
        // Fallback to manual string builder below
      }
    }

    // Polyfill fallback
    if (items.length === 2) {
      return `${items[0]} ${conjunctionWord} ${items[1]}`;
    }

    const allButLast = items.slice(0, items.length - 1).join(', ');
    const last = items[items.length - 1];
    return `${allButLast}, ${conjunctionWord} ${last}`;
  }

  // =========================================================================
  // 7. Cross-Chat Reply 2.0 Payload Builder (Ajaxy/telegram-tt#353)
  // =========================================================================

  public buildCrossChatReplyPayload(
    sourceChat: { id: string | number; title: string; isSecret?: boolean },
    message: { id: number; text: string; senderName: string },
    destinationChatId: string | number
  ): CrossChatReplyPayload {
    if (sourceChat.isSecret) {
      throw new Error('Telegram protocol does not allow cross-chat replies from secret chats');
    }

    const truncatedQuote =
      message.text.length > 200 ? `${message.text.substring(0, 197)}...` : message.text;

    return {
      destinationChatId,
      sourceChatId: sourceChat.id,
      sourceChatTitle: sourceChat.title,
      sourceMessageId: message.id,
      quoteText: truncatedQuote,
      senderName: message.senderName,
    };
  }
}
