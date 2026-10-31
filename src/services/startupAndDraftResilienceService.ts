/**
 * Guidegram Startup & Draft Resilience Service
 *
 * Hardened against competitor issues:
 * - tdesktop #4240: Telegram starts slow / blocks on startup tasks.
 * - tdesktop #3234: Boot auto-start lifecycle and launcher resilience.
 * - tdesktop #26236: Drafts keep reappearing in topic groups on other devices (ghost drafts).
 * - tdesktop #1481: Channel comments refuse to load / fail under network drops.
 */

export type StartupStage = 'immediate' | 'idle' | 'background';

export interface StartupTask {
  id: string;
  stage: StartupStage;
  priority: number; // lower number = higher priority
  action: () => Promise<void> | void;
  timeoutMs?: number;
}

export interface TaskExecutionResult {
  id: string;
  stage: StartupStage;
  durationMs: number;
  success: boolean;
  error?: string;
}

export class StartupLifecycleCoordinator {
  private tasks: StartupTask[] = [];
  private executedResults: TaskExecutionResult[] = [];
  private isStarted = false;

  public register(task: StartupTask): void {
    if (this.isStarted) {
      console.warn(`[StartupCoordinator] Task ${task.id} registered after coordinator start. Scheduling for background.`);
      task.stage = 'background';
    }
    this.tasks.push(task);
  }

  public async runImmediateStage(): Promise<TaskExecutionResult[]> {
    const immediateTasks = this.tasks
      .filter(t => t.stage === 'immediate')
      .sort((a, b) => a.priority - b.priority);

    const results: TaskExecutionResult[] = [];
    for (const task of immediateTasks) {
      const result = await this.executeTask(task);
      results.push(result);
      this.executedResults.push(result);
    }
    return results;
  }

  public async runIdleStage(): Promise<TaskExecutionResult[]> {
    const idleTasks = this.tasks
      .filter(t => t.stage === 'idle')
      .sort((a, b) => a.priority - b.priority);

    const results: TaskExecutionResult[] = [];
    for (const task of idleTasks) {
      const result = await this.executeTask(task);
      results.push(result);
      this.executedResults.push(result);
    }
    return results;
  }

  public async runBackgroundStage(): Promise<TaskExecutionResult[]> {
    const bgTasks = this.tasks
      .filter(t => t.stage === 'background')
      .sort((a, b) => a.priority - b.priority);

    const results: TaskExecutionResult[] = [];
    for (const task of bgTasks) {
      const result = await this.executeTask(task);
      results.push(result);
      this.executedResults.push(result);
    }
    return results;
  }

  private async executeTask(task: StartupTask): Promise<TaskExecutionResult> {
    const startTime = Date.now();
    const timeout = task.timeoutMs || 3000;

    try {
      await Promise.race([
        Promise.resolve(task.action()),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Task ${task.id} timed out after ${timeout}ms`)), timeout)
        ),
      ]);

      return {
        id: task.id,
        stage: task.stage,
        durationMs: Date.now() - startTime,
        success: true,
      };
    } catch (err: any) {
      return {
        id: task.id,
        stage: task.stage,
        durationMs: Date.now() - startTime,
        success: false,
        error: err?.message || String(err),
      };
    }
  }

  public getResults(): TaskExecutionResult[] {
    return [...this.executedResults];
  }

  public clear(): void {
    this.tasks = [];
    this.executedResults = [];
    this.isStarted = false;
  }
}

export interface TopicDraft {
  peerId: string | number;
  topicId?: number;
  text: string;
  replyToMsgId?: number;
  updatedAt: number;
  isDeleted: boolean;
  version: number;
}

export class TopicDraftSynchronizer {
  private drafts: Map<string, TopicDraft> = new Map();

  private getKey(peerId: string | number, topicId?: number): string {
    return `${peerId}:${topicId ?? 0}`;
  }

  /**
   * Set or update local draft with monotonic timestamp & version bump
   */
  public setDraft(peerId: string | number, text: string, topicId?: number, replyToMsgId?: number): TopicDraft {
    const key = this.getKey(peerId, topicId);
    const existing = this.drafts.get(key);
    const trimmed = text.trim();

    const isDeleted = trimmed.length === 0;
    const version = (existing?.version ?? 0) + 1;
    const now = Date.now();

    const draft: TopicDraft = {
      peerId,
      topicId,
      text: isDeleted ? '' : text,
      replyToMsgId,
      updatedAt: Math.max(now, (existing?.updatedAt ?? 0) + 1),
      isDeleted,
      version,
    };

    this.drafts.set(key, draft);
    return draft;
  }

  /**
   * Clear draft explicitly - marks as deleted with fresh timestamp to kill ghost syncs
   */
  public clearDraft(peerId: string | number, topicId?: number): TopicDraft {
    return this.setDraft(peerId, '', topicId);
  }

  /**
   * Get valid non-deleted draft
   */
  public getDraft(peerId: string | number, topicId?: number): TopicDraft | null {
    const key = this.getKey(peerId, topicId);
    const draft = this.drafts.get(key);
    if (!draft || draft.isDeleted) {
      return null;
    }
    return draft;
  }

  /**
   * Reconcile incoming cloud draft against local state.
   * If local draft was modified or deleted at a newer or equal timestamp, incoming is rejected.
   */
  public reconcileCloudDraft(incoming: {
    peerId: string | number;
    topicId?: number;
    text: string;
    updatedAt: number;
    replyToMsgId?: number;
  }): { accepted: boolean; activeDraft: TopicDraft | null } {
    const key = this.getKey(incoming.peerId, incoming.topicId);
    const local = this.drafts.get(key);

    if (local) {
      // If local state is newer or identical in time, do NOT resurrect stale drafts
      if (local.updatedAt >= incoming.updatedAt) {
        return {
          accepted: false,
          activeDraft: local.isDeleted ? null : local,
        };
      }
    }

    const trimmed = incoming.text.trim();
    const isDeleted = trimmed.length === 0;
    const updatedDraft: TopicDraft = {
      peerId: incoming.peerId,
      topicId: incoming.topicId,
      text: incoming.text,
      replyToMsgId: incoming.replyToMsgId,
      updatedAt: incoming.updatedAt,
      isDeleted,
      version: (local?.version ?? 0) + 1,
    };

    this.drafts.set(key, updatedDraft);
    return {
      accepted: true,
      activeDraft: isDeleted ? null : updatedDraft,
    };
  }

  /**
   * Purge zombie drafts older than maxAgeMs or marked as deleted
   */
  public purgeZombies(maxAgeMs: number = 7 * 24 * 3600 * 1000): number {
    const now = Date.now();
    let purged = 0;
    for (const [key, draft] of this.drafts.entries()) {
      if (draft.isDeleted || (now - draft.updatedAt > maxAgeMs)) {
        this.drafts.delete(key);
        purged++;
      }
    }
    return purged;
  }
}

export interface DiscussionComment {
  id: number;
  senderId: string | number;
  text: string;
  date: number;
}

export interface DiscussionResult {
  comments: DiscussionComment[];
  isFromCache: boolean;
  hasMore: boolean;
}

export class DiscussionCommentsFallbackManager {
  private cache: Map<string, { comments: DiscussionComment[]; cachedAt: number }> = new Map();
  private cacheTtlMs: number;

  constructor(cacheTtlMs: number = 10 * 60 * 1000) {
    this.cacheTtlMs = cacheTtlMs;
  }

  private getKey(channelId: string | number, postId: number): string {
    return `${channelId}:${postId}`;
  }

  public setCache(channelId: string | number, postId: number, comments: DiscussionComment[]): void {
    const key = this.getKey(channelId, postId);
    this.cache.set(key, { comments, cachedAt: Date.now() });
  }

  public getCached(channelId: string | number, postId: number): DiscussionComment[] | null {
    const key = this.getKey(channelId, postId);
    const entry = this.cache.get(key);
    if (!entry) return null;
    return entry.comments;
  }

  /**
   * Resilient comments fetch with local fallback cache and timeout
   */
  public async loadCommentsWithFallback(
    channelId: string | number,
    postId: number,
    fetcher: () => Promise<DiscussionComment[]>,
    timeoutMs: number = 3000
  ): Promise<DiscussionResult> {
    const key = this.getKey(channelId, postId);
    const cached = this.cache.get(key);

    try {
      const fetchPromise = fetcher();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Discussion comments fetch timed out')), timeoutMs)
      );

      const freshComments = await Promise.race([fetchPromise, timeoutPromise]);
      this.cache.set(key, { comments: freshComments, cachedAt: Date.now() });

      return {
        comments: freshComments,
        isFromCache: false,
        hasMore: freshComments.length >= 20,
      };
    } catch (err) {
      if (cached && cached.comments.length > 0) {
        return {
          comments: cached.comments,
          isFromCache: true,
          hasMore: false,
        };
      }
      throw err;
    }
  }

  public clear(): void {
    this.cache.clear();
  }
}
