/**
 * Guidegram Offline Sync & Rate-Limit Governor Service
 *
 * Hardened against competitor issues:
 * - tdesktop #486: Option to disable cloud draft sync (pure local drafts mode).
 * - tdesktop #378 & #375: Offline cached entity access (members & contacts).
 * - tdesktop #682: TDLib / MTProto 429 FLOOD_WAIT intelligent backoff parser.
 * - tdesktop #512: Local offline read-only channel and group message archive viewer.
 */

export interface DraftSyncPolicy {
  syncDraftsToCloud: boolean;
  localOnlyPeerIds: Set<string | number>;
}

export class LocalDraftPrivacyAndSyncGovernor {
  private syncDraftsToCloud: boolean = true;
  private localOnlyPeerIds: Set<string | number> = new Set();
  private localDrafts: Map<string | number, { text: string; updatedAt: number }> = new Map();

  constructor(syncToCloud: boolean = true) {
    this.syncDraftsToCloud = syncToCloud;
  }

  public setCloudSyncEnabled(enabled: boolean): void {
    this.syncDraftsToCloud = enabled;
  }

  public setPeerLocalOnly(peerId: string | number, localOnly: boolean): void {
    if (localOnly) {
      this.localOnlyPeerIds.add(peerId);
    } else {
      this.localOnlyPeerIds.delete(peerId);
    }
  }

  public shouldSyncDraftToCloud(peerId: string | number): boolean {
    if (!this.syncDraftsToCloud) return false;
    if (this.localOnlyPeerIds.has(peerId)) return false;
    return true;
  }

  public saveLocalDraft(peerId: string | number, text: string): { isCloudSyncPermitted: boolean } {
    this.localDrafts.set(peerId, { text, updatedAt: Date.now() });
    return {
      isCloudSyncPermitted: this.shouldSyncDraftToCloud(peerId),
    };
  }

  public getLocalDraft(peerId: string | number): string | null {
    return this.localDrafts.get(peerId)?.text || null;
  }
}

export interface CachedEntity<T> {
  data: T;
  cachedAt: number;
  peerId: string | number;
}

export class OfflineEntityCacheManager {
  private membersCache: Map<string | number, CachedEntity<any[]>> = new Map();
  private contactsCache: CachedEntity<any[]> | null = null;
  private cacheTtlMs: number;

  constructor(cacheTtlMs: number = 7 * 24 * 3600 * 1000) {
    this.cacheTtlMs = cacheTtlMs;
  }

  public setCachedMembers(peerId: string | number, members: any[]): void {
    this.membersCache.set(peerId, {
      data: members,
      cachedAt: Date.now(),
      peerId,
    });
  }

  public getMembersWithOfflineFallback(
    peerId: string | number,
    isOnline: boolean,
    onlineFetcher?: () => Promise<any[]>
  ): { members: any[]; isOfflineSnapshot: boolean } {
    const cached = this.membersCache.get(peerId);

    if (!isOnline && cached) {
      return { members: cached.data, isOfflineSnapshot: true };
    }

    if (cached) {
      return { members: cached.data, isOfflineSnapshot: false };
    }

    return { members: [], isOfflineSnapshot: !isOnline };
  }

  public setCachedContacts(contacts: any[]): void {
    this.contactsCache = {
      data: contacts,
      cachedAt: Date.now(),
      peerId: 'global_contacts',
    };
  }

  public getContactsWithOfflineFallback(isOnline: boolean): { contacts: any[]; isOfflineSnapshot: boolean } {
    if (!isOnline && this.contactsCache) {
      return { contacts: this.contactsCache.data, isOfflineSnapshot: true };
    }
    return { contacts: this.contactsCache?.data || [], isOfflineSnapshot: false };
  }
}

export interface FloodWaitInfo {
  isRateLimited: boolean;
  retryAfterSec: number;
  unbanTimestamp: number;
  errorReason: string;
}

export class FloodWaitAndRateLimitParser {
  private activeLocks: Map<string, number> = new Map(); // action -> unban timestamp

  /**
   * Parses TDLib or MTProto 429 FLOOD_WAIT error (#682)
   */
  public parseFloodWaitError(errorObj: any): FloodWaitInfo {
    const errorStr = typeof errorObj === 'string' ? errorObj : JSON.stringify(errorObj || {});

    // Regex matching "FLOOD_WAIT_(\d+)" or "retry after (\d+)"
    const matchFloodWait = errorStr.match(/FLOOD_WAIT_(\d+)/i);
    const matchRetryAfter = errorStr.match(/retry after\s*:?\s*(\d+)/i);

    let waitSec = 0;
    if (matchFloodWait && matchFloodWait[1]) {
      waitSec = parseInt(matchFloodWait[1], 10);
    } else if (matchRetryAfter && matchRetryAfter[1]) {
      waitSec = parseInt(matchRetryAfter[1], 10);
    }

    if (waitSec > 0) {
      const unbanTimestamp = Date.now() + waitSec * 1000;
      return {
        isRateLimited: true,
        retryAfterSec: waitSec,
        unbanTimestamp,
        errorReason: `Rate limited for ${waitSec}s`,
      };
    }

    return {
      isRateLimited: false,
      retryAfterSec: 0,
      unbanTimestamp: 0,
      errorReason: '',
    };
  }

  public registerRateLimit(actionKey: string, retryAfterSec: number): void {
    const expiry = Date.now() + retryAfterSec * 1000;
    this.activeLocks.set(actionKey, expiry);
  }

  public isActionBlocked(actionKey: string, now: number = Date.now()): boolean {
    const expiry = this.activeLocks.get(actionKey);
    if (!expiry) return false;

    if (now >= expiry) {
      this.activeLocks.delete(actionKey);
      return false;
    }

    return true;
  }
}

export class LocalOfflineChannelArchiveViewer {
  private archivedChannelMessages: Map<string | number, any[]> = new Map();

  public saveChannelSnapshot(channelId: string | number, messages: any[]): void {
    this.archivedChannelMessages.set(channelId, [...messages]);
  }

  public getChannelArchive(channelId: string | number): {
    available: boolean;
    messages: any[];
    isReadOnly: boolean;
  } {
    const messages = this.archivedChannelMessages.get(channelId);
    if (!messages || messages.length === 0) {
      return { available: false, messages: [], isReadOnly: true };
    }

    return {
      available: true,
      messages: [...messages],
      isReadOnly: true, // Offline archive is strictly read-only (#512)
    };
  }
}
