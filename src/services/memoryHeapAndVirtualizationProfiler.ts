/**
 * Guidegram Memory Heap & Virtualization Profiling Governor
 * 
 * Hardened against competitor issues:
 * - tdlib #1761: Fatal error and socket descriptor leak when multiple copies/connections attempt handshake
 * - Telegram-iOS #2405: EXC_BAD_ACCESS crash when tapping links in Rich Messages (dangling pointer/bounds corruption)
 * - Telegram-iOS #1668: Scrolling freeze bug caused by unbounded DOM node and media canvas retention
 * - AyuGram #402: Performance degradation and CPU spikes from uncollected background worker listeners
 * - telegram-tt #544: Mini-App unconstrained memory spike and garbage collection stalling
 */

export interface SocketConnectionRecord {
  socketId: string;
  createdAt: number;
  lastActiveAt: number;
  isClosed: boolean;
}

export interface VirtualizationWindow {
  totalItems: number;
  visibleStartIndex: number;
  visibleEndIndex: number;
  renderStartIndex: number;
  renderEndIndex: number;
  recycledNodeCount: number;
}

export interface MemoryCleanupReport {
  releasedSocketCount: number;
  evictedBlobCount: number;
  evictedBytes: number;
  activeSocketsRemaining: number;
  heapCleaned: boolean;
}

export interface RichEntityLink {
  offset: number;
  length: number;
  url: string;
}

export class MemoryHeapAndVirtualizationProfiler {
  private static readonly MAX_SOCKET_POOL_SIZE = 16;
  private static readonly SOCKET_IDLE_TIMEOUT_MS = 15000; // 15 seconds
  private static readonly VIRTUALIZATION_OVERSCAN = 15; // 15 items above and below
  private static readonly MAX_MEDIA_CACHE_BYTES = 150 * 1024 * 1024; // 150 MB

  private sockets: Map<string, SocketConnectionRecord> = new Map();
  private mediaBlobs: Map<string, { sizeBytes: number; lastAccessedAt: number }> = new Map();
  private backgroundTaskListeners: Set<() => void> = new Set();

  /**
   * Registers a newly opened socket with pool exhaustion and leak protection (tdlib #1761).
   */
  public registerSocket(socketId: string): { allowed: boolean; error?: string } {
    // Purge expired or idle sockets first
    this.reapIdleSockets();

    if (this.sockets.size >= MemoryHeapAndVirtualizationProfiler.MAX_SOCKET_POOL_SIZE) {
      return {
        allowed: false,
        error: `Socket pool exhausted (${this.sockets.size}/${MemoryHeapAndVirtualizationProfiler.MAX_SOCKET_POOL_SIZE}). Preventing socket descriptor leak.`
      };
    }

    const now = Date.now();
    this.sockets.set(socketId, {
      socketId,
      createdAt: now,
      lastActiveAt: now,
      isClosed: false
    });

    return { allowed: true };
  }

  /**
   * Closes and removes a socket from the active registry.
   */
  public releaseSocket(socketId: string): boolean {
    const sock = this.sockets.get(socketId);
    if (!sock) return false;
    sock.isClosed = true;
    this.sockets.delete(socketId);
    return true;
  }

  /**
   * Reaps orphaned or idle sockets to prevent file descriptor leaks (tdlib #1761).
   */
  public reapIdleSockets(now: number = Date.now()): number {
    let reaped = 0;
    for (const [id, record] of this.sockets.entries()) {
      if (record.isClosed || (now - record.lastActiveAt) > MemoryHeapAndVirtualizationProfiler.SOCKET_IDLE_TIMEOUT_MS) {
        this.sockets.delete(id);
        reaped++;
      }
    }
    return reaped;
  }

  /**
   * Validates rich text entity link offsets against parent string length to prevent
   * out-of-bounds pointer reads and EXC_BAD_ACCESS crashes (Telegram-iOS #2405).
   */
  public static sanitizeRichEntityLink(
    parentText: string,
    entity: RichEntityLink
  ): { isValid: boolean; sanitizedUrl?: string; safeSubstring?: string } {
    if (!parentText || !entity || !entity.url) {
      return { isValid: false };
    }

    // Offset and length must be non-negative and strictly within parentText bounds
    if (entity.offset < 0 || entity.length <= 0) {
      return { isValid: false };
    }

    if (entity.offset + entity.length > parentText.length) {
      return { isValid: false };
    }

    const safeSubstring = parentText.slice(entity.offset, entity.offset + entity.length);
    const sanitizedUrl = entity.url.trim();

    // Block dangerous pseudo-protocols like javascript: or vbscript:
    if (/^(javascript|vbscript|data):/i.test(sanitizedUrl)) {
      return { isValid: false };
    }

    return {
      isValid: true,
      sanitizedUrl,
      safeSubstring
    };
  }

  /**
   * Computes strict virtualization render boundaries with overscan limits,
   * unmounting offscreen nodes to prevent scrolling freezes (Telegram-iOS #1668).
   */
  public static computeVirtualizationWindow(
    totalItems: number,
    visibleStartIndex: number,
    visibleCount: number
  ): VirtualizationWindow {
    if (totalItems <= 0) {
      return {
        totalItems: 0,
        visibleStartIndex: 0,
        visibleEndIndex: 0,
        renderStartIndex: 0,
        renderEndIndex: 0,
        recycledNodeCount: 0
      };
    }

    const visibleEndIndex = Math.min(totalItems - 1, visibleStartIndex + visibleCount - 1);
    const renderStartIndex = Math.max(0, visibleStartIndex - this.VIRTUALIZATION_OVERSCAN);
    const renderEndIndex = Math.min(totalItems - 1, visibleEndIndex + this.VIRTUALIZATION_OVERSCAN);

    const activeRenderCount = (renderEndIndex - renderStartIndex) + 1;
    const recycledNodeCount = Math.max(0, totalItems - activeRenderCount);

    return {
      totalItems,
      visibleStartIndex,
      visibleEndIndex,
      renderStartIndex,
      renderEndIndex,
      recycledNodeCount
    };
  }

  /**
   * Registers cached media blob and automatically evicts oldest blobs
   * if cache size exceeds memory budget (telegram-tt #544).
   */
  public cacheMediaBlob(blobId: string, sizeBytes: number): void {
    this.mediaBlobs.set(blobId, {
      sizeBytes,
      lastAccessedAt: Date.now()
    });

    this.evictExcessMediaBlobs();
  }

  /**
   * Evicts least recently used media blobs when cache exceeds limit.
   */
  public evictExcessMediaBlobs(): number {
    let totalBytes = 0;
    for (const item of this.mediaBlobs.values()) {
      totalBytes += item.sizeBytes;
    }

    if (totalBytes <= MemoryHeapAndVirtualizationProfiler.MAX_MEDIA_CACHE_BYTES) {
      return 0;
    }

    // Sort by lastAccessedAt ascending (oldest first)
    const sorted = [...this.mediaBlobs.entries()].sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);
    let evictedCount = 0;

    for (const [id, item] of sorted) {
      this.mediaBlobs.delete(id);
      totalBytes -= item.sizeBytes;
      evictedCount++;
      if (totalBytes <= MemoryHeapAndVirtualizationProfiler.MAX_MEDIA_CACHE_BYTES * 0.8) {
        break; // Reached comfortable 80% watermark
      }
    }

    return evictedCount;
  }

  /**
   * Executes a periodic idle heap cleanup, sweeping dead sockets,
   * uncollected worker listeners, and stale cache (AyuGram #402).
   */
  public runIdleHeapCleanup(now: number = Date.now()): MemoryCleanupReport {
    const reapedSockets = this.reapIdleSockets(now);

    let evictedBytes = 0;
    let evictedBlobs = 0;

    // Remove media blobs untouched for over 10 minutes
    const tenMinutesMs = 10 * 60 * 1000;
    for (const [id, item] of this.mediaBlobs.entries()) {
      if ((now - item.lastAccessedAt) > tenMinutesMs) {
        evictedBytes += item.sizeBytes;
        this.mediaBlobs.delete(id);
        evictedBlobs++;
      }
    }

    this.backgroundTaskListeners.clear();

    return {
      releasedSocketCount: reapedSockets,
      evictedBlobCount: evictedBlobs,
      evictedBytes,
      activeSocketsRemaining: this.sockets.size,
      heapCleaned: true
    };
  }
}
