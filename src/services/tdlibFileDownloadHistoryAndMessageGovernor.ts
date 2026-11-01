/**
 * TDLib Parallel File Downloader, Chat History Pagination, Channel Latency,
 * Memory GC & Delete Updates Governor
 *
 * Hardens Guidegram against:
 * 1. tdlib/td#1068 & #3470 - Parallel chunked file downloads with Premium bandwidth scaling
 * 2. tdlib/td#1668 - Channel message latency & openChat/closeChat viewport synchronization
 * 3. tdlib/td#702 - getChatHistory fromMessageId offset calculation & pagination gap reconciliation
 * 4. tdlib/td#148 - Message memory deallocation & decrypted buffer garbage collection
 * 5. tdlib/td#692 - Error 400 can't find field "@type" (strict schema sanitization)
 * 6. tdlib/td#464 - UpdateFile event listener subscription & progress broadcasting
 * 7. tdlib/td#366 - updateDeleteMessages local cache invalidation & bulk cleanup
 */

export interface FileDownloadChunk {
  partIndex: number;
  offset: number;
  limit: number;
  isCompleted: boolean;
}

export interface ParallelDownloadPlan {
  totalSize: number;
  isPremium: boolean;
  concurrency: number;
  chunkSize: number;
  chunks: FileDownloadChunk[];
}

export interface ChatHistoryQueryParams {
  '@type': 'getChatHistory';
  chat_id: number;
  from_message_id: number;
  offset: number;
  limit: number;
  only_local: boolean;
}

export interface CachedMessageEntity {
  id: number;
  chatId: number;
  date: number;
  text: string;
  heavyMediaBuffer?: Uint8Array | null;
  waveform?: Uint8Array | null;
}

export interface FileUpdateEvent {
  id: number;
  size: number;
  expected_size: number;
  is_downloading_completed: boolean;
  is_downloading_active: boolean;
  downloaded_prefix_size: number;
}

export class TdlibFileDownloadHistoryAndMessageGovernor {
  private activeOpenChatId: number | null = null;
  private fileProgressListeners: Map<number, (event: { percent: number; isComplete: boolean }) => void> = new Map();

  // =========================================================================
  // 1. Parallel Chunked Downloader with Premium Scaling (tdlib/td#1068, #3470)
  // =========================================================================

  public createParallelDownloadPlan(
    totalSize: number,
    isPremium: boolean
  ): ParallelDownloadPlan {
    // Premium clients: 1MB chunk size & 8 parallel connections
    // Basic clients: 512KB chunk size & 3 parallel connections
    const chunkSize = isPremium ? 1024 * 1024 : 512 * 1024;
    const concurrency = isPremium ? 8 : 3;

    const chunks: FileDownloadChunk[] = [];
    let offset = 0;
    let partIndex = 0;

    while (offset < totalSize) {
      const limit = Math.min(chunkSize, totalSize - offset);
      chunks.push({
        partIndex,
        offset,
        limit,
        isCompleted: false,
      });
      offset += limit;
      partIndex += 1;
    }

    return {
      totalSize,
      isPremium,
      concurrency,
      chunkSize,
      chunks,
    };
  }

  // =========================================================================
  // 2. Channel Latency & OpenChat Viewport Sync (tdlib/td#1668)
  // =========================================================================

  public syncChatViewport(
    targetChatId: number
  ): { previousChatClosed: number | null; activeChatOpened: number } {
    const previous = this.activeOpenChatId;
    this.activeOpenChatId = targetChatId;

    return {
      previousChatClosed: previous !== targetChatId ? previous : null,
      activeChatOpened: targetChatId,
    };
  }

  public getActiveOpenChatId(): number | null {
    return this.activeOpenChatId;
  }

  // =========================================================================
  // 3. getChatHistory Offset Calculation & Gap Reconciliation (tdlib/td#702)
  // =========================================================================

  public buildGetChatHistoryQuery(
    chatId: number,
    anchorMessageId: number,
    direction: 'older' | 'newer' | 'around',
    limit: number = 20
  ): ChatHistoryQueryParams {
    let offset = 0;

    if (direction === 'older') {
      // Returns messages older than from_message_id
      offset = 0;
    } else if (direction === 'newer') {
      // Negative offset returns messages newer than from_message_id
      offset = -limit;
    } else if (direction === 'around') {
      // Half newer, half older
      offset = -Math.floor(limit / 2);
    }

    return {
      '@type': 'getChatHistory',
      chat_id: chatId,
      from_message_id: anchorMessageId,
      offset,
      limit,
      only_local: false,
    };
  }

  // =========================================================================
  // 4. Message Memory Deallocation & Decrypted Buffer GC (tdlib/td#148)
  // =========================================================================

  public reclaimOffscreenMessageMemory(
    messages: CachedMessageEntity[],
    visibleRange: { startIndex: number; endIndex: number },
    bufferMargin: number = 50
  ): { reclaimedBytes: number; purgedCount: number } {
    let reclaimedBytes = 0;
    let purgedCount = 0;

    const safeStart = Math.max(0, visibleRange.startIndex - bufferMargin);
    const safeEnd = visibleRange.endIndex + bufferMargin;

    for (let i = 0; i < messages.length; i++) {
      if (i < safeStart || i > safeEnd) {
        const msg = messages[i];
        if (msg.heavyMediaBuffer) {
          reclaimedBytes += msg.heavyMediaBuffer.byteLength;
          msg.heavyMediaBuffer = null;
          purgedCount += 1;
        }
        if (msg.waveform) {
          reclaimedBytes += msg.waveform.byteLength;
          msg.waveform = null;
        }
      }
    }

    return {
      reclaimedBytes,
      purgedCount,
    };
  }

  // =========================================================================
  // 5. Strict @type JSON Injection (tdlib/td#692)
  // =========================================================================

  public sanitizeTdlibQuery(
    rawQuery: Record<string, any>,
    expectedType: string
  ): Record<string, any> {
    const sanitized: Record<string, any> = {
      '@type': expectedType,
    };

    for (const [key, value] of Object.entries(rawQuery)) {
      if (value !== undefined && value !== null) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  // =========================================================================
  // 6. UpdateFile Event Listener Subscription (tdlib/td#464)
  // =========================================================================

  public registerFileProgressListener(
    fileId: number,
    listener: (event: { percent: number; isComplete: boolean }) => void
  ) {
    this.fileProgressListeners.set(fileId, listener);
  }

  public handleUpdateFile(event: FileUpdateEvent): { percent: number; isComplete: boolean } {
    const total = event.expected_size || event.size || 1;
    const downloaded = event.downloaded_prefix_size || (event.is_downloading_completed ? total : 0);
    const percent = Math.min(100, Math.round((downloaded / total) * 100));

    const result = {
      percent,
      isComplete: event.is_downloading_completed,
    };

    const listener = this.fileProgressListeners.get(event.id);
    if (listener) {
      listener(result);
      if (event.is_downloading_completed) {
        this.fileProgressListeners.delete(event.id);
      }
    }

    return result;
  }

  // =========================================================================
  // 7. updateDeleteMessages Cache Invalidation (tdlib/td#366)
  // =========================================================================

  public handleDeleteMessages(
    chatId: number,
    messageIds: number[],
    messageCache: Map<number, CachedMessageEntity>
  ): { deletedCount: number; remainingCount: number } {
    let deletedCount = 0;

    for (const id of messageIds) {
      if (messageCache.has(id)) {
        const msg = messageCache.get(id);
        if (msg && msg.chatId === chatId) {
          messageCache.delete(id);
          deletedCount += 1;
        }
      }
    }

    return {
      deletedCount,
      remainingCount: messageCache.size,
    };
  }
}
