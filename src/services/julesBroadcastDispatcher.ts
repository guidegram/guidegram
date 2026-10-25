/**
 * Guidegram Master Hardening - Phase 139
 * Google Jules Fleet-Wide Broadcast & Parallel Directive Messaging Protocol
 * 
 * Production-grade parallel directive dispatcher for Google Jules multi-worker swarms.
 * Provides role-based targeting, asynchronous ACK aggregation, rate-limited delivery,
 * and zero-leak worker subscription tracking.
 */

export interface BroadcastDirective {
  id: string;
  command: string;
  payload: Record<string, any>;
  targetRole?: string; // Optional filter: e.g. 'auditor', 'implementer', 'all'
  timestamp: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface WorkerSubscription {
  workerId: string;
  role: string;
  accountEmail: string;
  status: 'idle' | 'busy' | 'offline';
  sendDirective: (directive: BroadcastDirective) => Promise<boolean>;
}

export interface BroadcastDeliveryReport {
  directiveId: string;
  totalTargeted: number;
  acknowledgedCount: number;
  failedCount: number;
  ackRatio: number;
  timestamp: number;
}

export class JulesBroadcastDispatcher {
  private workers: Map<string, WorkerSubscription> = new Map();
  private broadcastHistory: BroadcastDeliveryReport[] = [];
  private maxHistorySize: number = 100;
  private maxConcurrency: number = 10;

  constructor(maxConcurrency: number = 10, maxHistorySize: number = 100) {
    this.maxConcurrency = maxConcurrency;
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Registers a worker in the fleet subscriber pool.
   */
  public registerWorker(subscription: WorkerSubscription): void {
    this.workers.set(subscription.workerId, subscription);
  }

  /**
   * Unregisters a worker from the fleet pool.
   */
  public unregisterWorker(workerId: string): boolean {
    return this.workers.delete(workerId);
  }

  /**
   * Dispatches a directive across all matching workers in parallel chunks.
   */
  public async broadcastDirective(directive: BroadcastDirective): Promise<BroadcastDeliveryReport> {
    const targetWorkers = Array.from(this.workers.values()).filter(w => {
      if (w.status === 'offline') return false;
      if (!directive.targetRole || directive.targetRole === 'all') return true;
      return w.role === directive.targetRole;
    });

    let acknowledgedCount = 0;
    let failedCount = 0;

    // Process in parallel batches bounded by maxConcurrency
    for (let i = 0; i < targetWorkers.length; i += this.maxConcurrency) {
      const batch = targetWorkers.slice(i, i + this.maxConcurrency);
      const promises = batch.map(async w => {
        try {
          const success = await w.sendDirective(directive);
          return success;
        } catch {
          return false;
        }
      });

      const results = await Promise.all(promises);
      for (const res of results) {
        if (res) acknowledgedCount++;
        else failedCount++;
      }
    }

    const total = targetWorkers.length;
    const ackRatio = total > 0 ? acknowledgedCount / total : 1.0;

    const report: BroadcastDeliveryReport = {
      directiveId: directive.id,
      totalTargeted: total,
      acknowledgedCount,
      failedCount,
      ackRatio,
      timestamp: Date.now(),
    };

    this.broadcastHistory.push(report);
    if (this.broadcastHistory.length > this.maxHistorySize) {
      this.broadcastHistory.shift();
    }

    return report;
  }

  /**
   * Returns current active worker count.
   */
  public getWorkerCount(): number {
    return this.workers.size;
  }

  /**
   * Returns summary of all broadcast delivery reports.
   */
  public getBroadcastHistory(): BroadcastDeliveryReport[] {
    return [...this.broadcastHistory];
  }

  /**
   * Cleans all worker listeners and history memory.
   */
  public destroy(): void {
    this.workers.clear();
    this.broadcastHistory = [];
  }
}
