/**
 * Guidegram IndexedDB, Session Keepalive & Optimistic Reconciliation Governor
 * 
 * Hardened against competitor issues:
 * - telegram-tt #491: Blank page if valid auth tokens exist but local IndexedDB is empty
 * - telegram-tt #389: Sudden automatic logout due to unrefreshed session tokens
 * - Unigram #547: Cross-device unread notification desync and stale read_max_id rollbacks
 * - tdesktop #31277: Media upload getting stuck in an infinite loading loop
 * - tdesktop #8043: Media failed to save due to read-only target storage permissions
 */

export interface SessionHydrationDecision {
  needsCloudBootstrap: boolean;
  canProceedToApp: boolean;
  action: 'bootstrap_cloud_data' | 'render_normal' | 'redirect_login';
}

export interface MonotonicReadState {
  chatId: string;
  readInboxMaxId: number;
  readOutboxMaxId: number;
  unreadCount: number;
}

export interface PendingUploadState {
  uploadId: string;
  bytesUploaded: number;
  totalBytes: number;
  lastProgressTimestamp: number;
  isStuck: boolean;
  status: 'uploading' | 'stuck_retryable' | 'completed' | 'failed';
}

export class IndexedDbAndOptimisticReconciliationGovernor {
  private static readonly UPLOAD_STALL_TIMEOUT_MS = 45000; // 45s stall timeout
  private static readonly TOKEN_EXPIRY_THRESHOLD_RATIO = 0.75; // Refresh at 75% lifetime

  /**
   * Resolves cold-start state when session cookies are present but IndexedDB is empty (telegram-tt #491).
   */
  public static evaluateSessionHydration(
    hasValidAuthToken: boolean,
    cachedDialogCount: number
  ): SessionHydrationDecision {
    if (!hasValidAuthToken) {
      return {
        needsCloudBootstrap: false,
        canProceedToApp: false,
        action: 'redirect_login'
      };
    }

    if (cachedDialogCount === 0) {
      return {
        needsCloudBootstrap: true,
        canProceedToApp: true,
        action: 'bootstrap_cloud_data'
      };
    }

    return {
      needsCloudBootstrap: false,
      canProceedToApp: true,
      action: 'render_normal'
    };
  }

  /**
   * Evaluates token refresh requirement to prevent unexpected logout (telegram-tt #389).
   */
  public static shouldRefreshToken(
    issuedAtSeconds: number,
    expiresAtSeconds: number,
    nowSeconds: number = Math.floor(Date.now() / 1000)
  ): boolean {
    const totalLifetime = expiresAtSeconds - issuedAtSeconds;
    if (totalLifetime <= 0) return true;

    const elapsed = nowSeconds - issuedAtSeconds;
    const ratio = elapsed / totalLifetime;

    return ratio >= this.TOKEN_EXPIRY_THRESHOLD_RATIO;
  }

  /**
   * Reconciles incoming read state updates across multi-device clients,
   * strictly enforcing monotonic advancement so stale packets cannot un-read chats (Unigram #547).
   */
  public static reconcileMonotonicReadState(
    currentState: MonotonicReadState,
    incomingUpdate: Partial<MonotonicReadState>
  ): MonotonicReadState {
    const nextInboxMax = Math.max(currentState.readInboxMaxId, incomingUpdate.readInboxMaxId ?? 0);
    const nextOutboxMax = Math.max(currentState.readOutboxMaxId, incomingUpdate.readOutboxMaxId ?? 0);

    // If inbox advanced, unread count must never increase as a result
    let nextUnread = incomingUpdate.unreadCount !== undefined
      ? incomingUpdate.unreadCount
      : currentState.unreadCount;

    if (nextInboxMax > currentState.readInboxMaxId && incomingUpdate.unreadCount === undefined) {
      nextUnread = Math.max(0, currentState.unreadCount - (nextInboxMax - currentState.readInboxMaxId));
    }

    return {
      chatId: currentState.chatId,
      readInboxMaxId: nextInboxMax,
      readOutboxMaxId: nextOutboxMax,
      unreadCount: nextUnread
    };
  }

  /**
   * Monitors optimistic upload progress and flags stuck uploads with an actionable retry state (tdesktop #31277).
   */
  public static evaluateUploadProgress(
    upload: PendingUploadState,
    now: number = Date.now()
  ): PendingUploadState {
    if (upload.status === 'completed' || upload.status === 'failed') {
      return { ...upload };
    }

    if (upload.bytesUploaded >= upload.totalBytes && upload.totalBytes > 0) {
      return {
        ...upload,
        isStuck: false,
        status: 'completed'
      };
    }

    const elapsedSinceProgress = now - upload.lastProgressTimestamp;
    const isStuck = elapsedSinceProgress >= this.UPLOAD_STALL_TIMEOUT_MS;

    return {
      ...upload,
      isStuck,
      status: isStuck ? 'stuck_retryable' : 'uploading'
    };
  }

  /**
   * Validates target download directory permissions and returns fallback path if read-only (tdesktop #8043).
   */
  public static resolveSafeDownloadTarget(
    isTargetDirWritable: boolean,
    targetDirPath: string,
    fallbackTempDirPath: string
  ): { resolvedDirPath: string; isUsingFallback: boolean } {
    if (isTargetDirWritable) {
      return {
        resolvedDirPath: targetDirPath,
        isUsingFallback: false
      };
    }

    return {
      resolvedDirPath: fallbackTempDirPath,
      isUsingFallback: true
    };
  }
}
