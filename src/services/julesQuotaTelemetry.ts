/**
 * src/services/julesQuotaTelemetry.ts
 * Google Jules Rolling Quota & 24h Reset Countdown Telemetry Protocol
 * Tracks sliding 24-hour rolling quota windows, countdown timers, and predictive exhaustion warnings.
 * Non-destructive audit, automatic 24h timestamp pruning, and zero memory leaks.
 */

export interface QuotaEntry {
  taskId: string;
  timestamp: number;
}

export interface AccountQuotaTelemetry {
  alias: string;
  dailyLimit: number;
  usedInRolling24h: number;
  remainingSlots: number;
  nextResetInSeconds: number | null;
  earliestResetTimestamp: number | null;
}

export class JulesQuotaTelemetry {
  private static instance: JulesQuotaTelemetry | null = null;
  private executionTimelines: Map<string, QuotaEntry[]> = new Map();
  private defaultDailyLimit: number = 30; // Pro daily limit per account
  private rollingWindowMs: number = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {}

  public static getInstance(): JulesQuotaTelemetry {
    if (!JulesQuotaTelemetry.instance) {
      JulesQuotaTelemetry.instance = new JulesQuotaTelemetry();
    }
    return JulesQuotaTelemetry.instance;
  }

  /**
   * Records a task execution timestamp for an account
   */
  public recordTaskExecution(accountAlias: string, taskId: string, timestamp?: number): void {
    const ts = timestamp || Date.now();
    let entries = this.executionTimelines.get(accountAlias);
    if (!entries) {
      entries = [];
      this.executionTimelines.set(accountAlias, entries);
    }
    entries.push({ taskId, timestamp: ts });
    this.pruneOldEntries(accountAlias);
  }

  /**
   * Prunes entries older than 24 hours from the sliding window
   */
  private pruneOldEntries(accountAlias: string): void {
    const entries = this.executionTimelines.get(accountAlias);
    if (!entries) return;

    const cutoff = Date.now() - this.rollingWindowMs;
    const fresh = entries.filter((e) => e.timestamp >= cutoff);
    this.executionTimelines.set(accountAlias, fresh);
  }

  /**
   * Calculates real-time remaining quota and 24h rolling reset countdown
   */
  public getAccountTelemetry(accountAlias: string, dailyLimit?: number): AccountQuotaTelemetry {
    this.pruneOldEntries(accountAlias);
    const limit = dailyLimit || this.defaultDailyLimit;
    const entries = this.executionTimelines.get(accountAlias) || [];
    const used = entries.length;
    const remaining = Math.max(0, limit - used);

    let nextResetInSeconds: number | null = null;
    let earliestResetTimestamp: number | null = null;

    if (entries.length > 0) {
      // Oldest entry in current window
      const oldest = entries[0];
      earliestResetTimestamp = oldest.timestamp + this.rollingWindowMs;
      const msUntilReset = earliestResetTimestamp - Date.now();
      nextResetInSeconds = Math.max(0, Math.ceil(msUntilReset / 1000));
    }

    return {
      alias: accountAlias,
      dailyLimit: limit,
      usedInRolling24h: used,
      remainingSlots: remaining,
      nextResetInSeconds,
      earliestResetTimestamp,
    };
  }

  public destroy(): void {
    this.executionTimelines.clear();
  }
}
