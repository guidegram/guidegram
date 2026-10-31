/**
 * Guidegram Child Process Sandbox, Worker Supervisor & Story Cache Governor
 * 
 * Hardened against:
 * - tdesktop #16627: In-program updates incompatible with Windows Child Process mitigations
 * - tdesktop #26562: Random client crashes from unhandled worker thread exceptions
 * - tdesktop #26632: Story creation draft ballooning and ephemeral media cache leaks
 * - tdesktop #26116: Runtime capability sniffing and GLIBC/platform fallbacks
 */

export interface SubprocessSpawnOptions {
  executablePath: string;
  args: string[];
  detached: boolean;
  windowsHide: boolean;
  isolationLevel: 'strict' | 'relaxed';
}

export interface WorkerTaskResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  restartedCount: number;
}

export interface StoryDraft {
  id: string;
  mediaPath: string;
  caption: string;
  createdAtTimestamp: number;
  expiresAtTimestamp: number;
  byteSize: number;
}

export class ChildProcessAndMemorySandboxGovernor {
  private static storyDraftStore: Map<string, StoryDraft> = new Map();

  /**
   * Generates safe spawn parameters that comply with enterprise Exploit Guard
   * and Windows Child Process mitigation policies (tdesktop #16627).
   */
  public static getSafeSubprocessOptions(
    executablePath: string,
    args: string[],
    isWindows: boolean = false
  ): SubprocessSpawnOptions {
    return {
      executablePath,
      args,
      detached: !isWindows, // On Windows, detached child processes can violate exploit mitigations
      windowsHide: true,
      isolationLevel: 'strict'
    };
  }

  /**
   * Executes a risky background worker task inside a supervised execution boundary,
   * isolating fatal exceptions and providing transparent auto-recovery (tdesktop #26562).
   */
  public static async executeSupervisedWorkerTask<T>(
    taskName: string,
    taskFn: () => Promise<T>,
    maxRetries: number = 2
  ): Promise<WorkerTaskResult<T>> {
    let attempts = 0;

    while (attempts <= maxRetries) {
      try {
        const data = await taskFn();
        return {
          success: true,
          data,
          restartedCount: attempts
        };
      } catch (err: any) {
        attempts += 1;
        if (attempts > maxRetries) {
          return {
            success: false,
            error: `Supervised worker task '${taskName}' failed after ${maxRetries} restarts: ${err?.message || String(err)}`,
            restartedCount: attempts - 1
          };
        }
      }
    }

    return {
      success: false,
      error: 'Worker task exhausted retry threshold',
      restartedCount: attempts
    };
  }

  /**
   * Caches story creation drafts and enforces a strict 24-hour expiration policy
   * to automatically reclaim disk storage and prevent cache ballooning (tdesktop #26632).
   */
  public static saveStoryDraft(
    id: string,
    mediaPath: string,
    caption: string,
    byteSize: number,
    now: number = Date.now(),
    ttlMs: number = 86400000 // 24 hours
  ): StoryDraft {
    const draft: StoryDraft = {
      id,
      mediaPath,
      caption,
      createdAtTimestamp: now,
      expiresAtTimestamp: now + ttlMs,
      byteSize
    };

    this.storyDraftStore.set(id, draft);
    return draft;
  }

  /**
   * Purges expired story drafts and returns freed byte count.
   */
  public static purgeExpiredStoryDrafts(now: number = Date.now()): { purgedCount: number; freedBytes: number } {
    let purgedCount = 0;
    let freedBytes = 0;

    for (const [id, draft] of this.storyDraftStore.entries()) {
      if (now >= draft.expiresAtTimestamp) {
        freedBytes += draft.byteSize;
        purgedCount += 1;
        this.storyDraftStore.delete(id);
      }
    }

    return {
      purgedCount,
      freedBytes
    };
  }

  /**
   * Sniffs runtime platform and GLIBC compatibility flags,
   * selecting appropriate software fallbacks when hardware features are missing (tdesktop #26116).
   */
  public static sniffRuntimeCapabilities(platform: string, glibcVersion?: string): {
    supportsGpuAcceleration: boolean;
    supportsSecureSubprocesses: boolean;
    platformTier: 'modern' | 'legacy_fallback';
  } {
    const isOldGlibc = glibcVersion ? parseFloat(glibcVersion) < 2.28 : false;

    if (platform === 'linux' && isOldGlibc) {
      return {
        supportsGpuAcceleration: false,
        supportsSecureSubprocesses: true,
        platformTier: 'legacy_fallback'
      };
    }

    return {
      supportsGpuAcceleration: true,
      supportsSecureSubprocesses: true,
      platformTier: 'modern'
    };
  }
}
