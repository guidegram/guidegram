/**
 * Destructive Bulk Action Guard & Pre-Deletion Quarantine Engine
 * 
 * Provides robust safeguards against catastrophic accidental history loss
 * in group chats and channels (addressing TDesktop #31535).
 * 
 * Protects against immediate execution of irreversible MTProto RPC calls:
 * - channels.deleteParticipantHistory (Delete all messages from a user)
 * - messages.deleteHistory (Clear entire chat history)
 * - channels.deleteChannel (Channel self-destruction)
 * 
 * Invariants:
 * 1. Two-Step Explicit Confirmation Requirement.
 * 2. Pre-Execution Grace Period (Undo countdown timer before wire transmission).
 * 3. Local Audit Snapshotting (Caches local message state before firing delete RPC).
 */

export type DestructiveActionType = 
  | 'DELETE_PARTICIPANT_HISTORY'
  | 'CLEAR_CHAT_HISTORY'
  | 'DELETE_CHANNEL_OR_GROUP'
  | 'PURGE_MEDIA_SELECTION';

export interface DestructiveActionRequest {
  actionId: string;
  type: DestructiveActionType;
  chatId: string;
  targetUserId?: string;
  targetUserName?: string;
  targetMessageCountEstimate?: number;
  initiatedAt: number; // Unix timestamp ms
  gracePeriodMs: number; // Time window before actual wire transmission
  metadata?: Record<string, any>;
}

export interface GuardConfirmationPolicy {
  requiresSeparateDialog: boolean;
  requiresExplicitNameTyping: boolean;
  minGracePeriodMs: number;
  severity: 'low' | 'medium' | 'critical';
}

export interface QueuedDestructiveAction {
  request: DestructiveActionRequest;
  timerHandle?: any;
  resolveHandle?: (val: { status: 'completed' | 'aborted'; error?: string }) => void;
  confirmed: boolean;
  aborted: boolean;
  status: 'pending_confirmation' | 'grace_period' | 'executing' | 'aborted' | 'completed';
}

export class DestructiveBulkActionGuard {
  private static instance: DestructiveBulkActionGuard;
  private queuedActions = new Map<string, QueuedDestructiveAction>();
  private localSnapshotCache = new Map<string, any[]>();

  private constructor() {}

  public static getInstance(): DestructiveBulkActionGuard {
    if (!DestructiveBulkActionGuard.instance) {
      DestructiveBulkActionGuard.instance = new DestructiveBulkActionGuard();
    }
    return DestructiveBulkActionGuard.instance;
  }

  /**
   * Returns safety confirmation policy based on action severity.
   */
  public getPolicy(type: DestructiveActionType): GuardConfirmationPolicy {
    switch (type) {
      case 'DELETE_PARTICIPANT_HISTORY':
        return {
          requiresSeparateDialog: true,
          requiresExplicitNameTyping: false,
          minGracePeriodMs: 5000,
          severity: 'critical',
        };
      case 'DELETE_CHANNEL_OR_GROUP':
        return {
          requiresSeparateDialog: true,
          requiresExplicitNameTyping: true,
          minGracePeriodMs: 7000,
          severity: 'critical',
        };
      case 'CLEAR_CHAT_HISTORY':
        return {
          requiresSeparateDialog: true,
          requiresExplicitNameTyping: false,
          minGracePeriodMs: 5000,
          severity: 'critical',
        };
      case 'PURGE_MEDIA_SELECTION':
      default:
        return {
          requiresSeparateDialog: false,
          requiresExplicitNameTyping: false,
          minGracePeriodMs: 3000,
          severity: 'medium',
        };
    }
  }

  /**
   * Initiates a destructive action workflow with mandatory safety gates.
   */
  public registerAction(
    type: DestructiveActionType,
    chatId: string,
    options?: {
      targetUserId?: string;
      targetUserName?: string;
      targetMessageCountEstimate?: number;
      gracePeriodMs?: number;
      localMessagesToSnapshot?: any[];
    }
  ): DestructiveActionRequest {
    const policy = this.getPolicy(type);
    const actionId = `destruct_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const effectiveGracePeriod = Math.max(policy.minGracePeriodMs, options?.gracePeriodMs || 0);

    const request: DestructiveActionRequest = {
      actionId,
      type,
      chatId,
      targetUserId: options?.targetUserId,
      targetUserName: options?.targetUserName,
      targetMessageCountEstimate: options?.targetMessageCountEstimate,
      initiatedAt: Date.now(),
      gracePeriodMs: effectiveGracePeriod,
    };

    // Capture pre-deletion audit snapshot locally to prevent permanent data loss
    if (options?.localMessagesToSnapshot && options.localMessagesToSnapshot.length > 0) {
      this.localSnapshotCache.set(actionId, [...options.localMessagesToSnapshot]);
    }

    this.queuedActions.set(actionId, {
      request,
      confirmed: false,
      aborted: false,
      status: 'pending_confirmation',
    });

    return request;
  }

  /**
   * Confirms user intent and begins the non-blocking grace countdown.
   * Allows emergency Undo / Cancel before wire transmission.
   */
  public confirmIntent(
    actionId: string,
    onWireExecution: () => Promise<void>
  ): Promise<{ status: 'completed' | 'aborted'; error?: string }> {
    const record = this.queuedActions.get(actionId);
    if (!record) {
      return Promise.reject(new Error(`Destructive action "${actionId}" not found.`));
    }

    record.confirmed = true;
    record.status = 'grace_period';

    return new Promise((resolve) => {
      record.resolveHandle = resolve;
      record.timerHandle = setTimeout(async () => {
        if (record.aborted) {
          resolve({ status: 'aborted' });
          return;
        }

        try {
          record.status = 'executing';
          await onWireExecution();
          record.status = 'completed';
          resolve({ status: 'completed' });
        } catch (err: any) {
          resolve({ status: 'aborted', error: err?.message || 'Execution error' });
        } finally {
          this.queuedActions.delete(actionId);
        }
      }, record.request.gracePeriodMs);
    });
  }

  /**
   * Immediately aborts a pending destructive action during the grace period (Undo).
   */
  public abortAction(actionId: string): boolean {
    const record = this.queuedActions.get(actionId);
    if (!record) return false;

    if (record.status === 'grace_period' || record.status === 'pending_confirmation') {
      if (record.timerHandle) {
        clearTimeout(record.timerHandle);
      }
      record.aborted = true;
      record.status = 'aborted';
      if (record.resolveHandle) {
        record.resolveHandle({ status: 'aborted' });
      }
      this.queuedActions.delete(actionId);
      return true;
    }

    return false; // Action is already executing or completed
  }

  /**
   * Retrieves snapshots preserved before deletion for disaster recovery.
   */
  public getSnapshot(actionId: string): any[] | undefined {
    return this.localSnapshotCache.get(actionId);
  }

  /**
   * Cleans up all records (used in tests).
   */
  public reset(): void {
    for (const record of this.queuedActions.values()) {
      if (record.timerHandle) clearTimeout(record.timerHandle);
    }
    this.queuedActions.clear();
    this.localSnapshotCache.clear();
  }
}

export const destructiveBulkActionGuard = DestructiveBulkActionGuard.getInstance();
