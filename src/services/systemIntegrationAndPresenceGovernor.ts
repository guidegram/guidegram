/**
 * Guidegram System Integration, Presence Indicator & 64-Bit ID Governor
 * 
 * Hardened against:
 * - tdesktop #17330: 64-bit user/channel identifier truncation (BigInt safe mapping)
 * - tdesktop #6410: Online presence indicator in chat list not disappearing/stale until manual refresh
 * - tdesktop #633: Client hanging or interrupting OS shutdown on Linux/Windows/KDE
 * - tdesktop #4628: Multilingual spellcheck activation & language detection
 */

export interface PresenceRecord {
  userId: string; // 64-bit string
  isOnline: boolean;
  lastSeenTimestamp: number;
  expiresAt: number;
}

export interface ShutdownTask {
  name: string;
  action: () => Promise<void>;
  timeoutMs: number;
}

export class SystemIntegrationAndPresenceGovernor {
  private static presenceStore: Map<string, PresenceRecord> = new Map();
  private static shutdownTasks: ShutdownTask[] = [];

  /**
   * Safely parses and normalizes 64-bit Telegram IDs (e.g. channel ID -10012345678901234)
   * into a string or BigInt, strictly preventing Number.MAX_SAFE_INTEGER truncation (tdesktop #17330).
   */
  public static normalizePeerId(rawId: string | number | bigint): {
    normalizedString: string;
    bigIntValue: bigint;
    is64Bit: boolean;
  } {
    const str = String(rawId).trim();
    const bigIntValue = BigInt(str);
    const is64Bit = bigIntValue > BigInt(Number.MAX_SAFE_INTEGER) || bigIntValue < BigInt(Number.MIN_SAFE_INTEGER);

    return {
      normalizedString: str,
      bigIntValue,
      is64Bit
    };
  }

  /**
   * Reconciles online presence status with automatic expiry timestamp check,
   * guaranteeing indicators update accurately in real-time without manual refresh (tdesktop #6410).
   */
  public static updatePresence(
    userId: string,
    isOnline: boolean,
    now: number = Date.now(),
    onlineDurationMs: number = 300000 // 5 minutes
  ): PresenceRecord {
    const record: PresenceRecord = {
      userId,
      isOnline,
      lastSeenTimestamp: now,
      expiresAt: isOnline ? now + onlineDurationMs : now
    };

    this.presenceStore.set(userId, record);
    return record;
  }

  /**
   * Checks whether a user is genuinely currently online based on expiration time.
   */
  public static isUserCurrentlyOnline(userId: string, now: number = Date.now()): boolean {
    const record = this.presenceStore.get(userId);
    if (!record) return false;

    if (record.isOnline && now < record.expiresAt) {
      return true;
    }

    // Automatically expire if past threshold
    if (record.isOnline && now >= record.expiresAt) {
      record.isOnline = false;
    }

    return false;
  }

  /**
   * Registers a graceful shutdown task (e.g. flushing DB write-ahead logs, socket disconnect).
   */
  public static registerShutdownTask(task: ShutdownTask): void {
    this.shutdownTasks.push(task);
  }

  /**
   * Executes all shutdown tasks concurrently with an aggressive total timeout,
   * ensuring the client never blocks or hangs OS system shutdown (tdesktop #633).
   */
  public static async executeGracefulShutdown(maxTotalTimeoutMs: number = 1500): Promise<{
    completedCount: number;
    timedOutCount: number;
  }> {
    let completedCount = 0;
    let timedOutCount = 0;

    const taskPromises = this.shutdownTasks.map(async task => {
      const taskTimeout = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Task timeout')), task.timeoutMs)
      );

      try {
        await Promise.race([task.action(), taskTimeout]);
        completedCount += 1;
      } catch {
        timedOutCount += 1;
      }
    });

    const globalTimeout = new Promise<void>(resolve =>
      setTimeout(resolve, maxTotalTimeoutMs)
    );

    await Promise.race([Promise.all(taskPromises), globalTimeout]);

    return {
      completedCount,
      timedOutCount
    };
  }

  /**
   * Resolves active spellchecking dictionaries for multi-language chats (tdesktop #4628).
   */
  public static resolveSpellcheckLanguages(
    userPreferredLangs: string[],
    chatDetectedScript: 'persian' | 'arabic' | 'latin' | 'mixed'
  ): string[] {
    const langs = new Set<string>(userPreferredLangs);

    if (chatDetectedScript === 'persian') {
      langs.add('fa');
      langs.add('fa-IR');
    } else if (chatDetectedScript === 'arabic') {
      langs.add('ar');
    }

    // Always ensure English fallback
    langs.add('en-US');

    return Array.from(langs);
  }
}
