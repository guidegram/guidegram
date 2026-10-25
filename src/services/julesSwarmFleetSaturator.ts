/**
 * src/services/julesSwarmFleetSaturator.ts
 * Google Jules 150-Session Swarm Fleet Saturation & Orchestration Protocol
 * Orchestrates high-concurrency swarms across 10-account pool sustaining up to 140-150 concurrent workers.
 * Sliding-window dispatch, batch injection, saturation metrics telemetry, and zero memory leaks.
 */

import { JulesAccountPoolBalancer } from './julesAccountPoolBalancer';

export interface SaturationSummary {
  totalDispatched: number;
  activeWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  fleetSaturationPercent: number;
}

export class JulesSwarmFleetSaturator {
  private static instance: JulesSwarmFleetSaturator | null = null;
  private poolBalancer: JulesAccountPoolBalancer;
  private maxFleetCapacity: number = 150; // 10 accounts * 15 slots
  private taskQueue: string[] = [];
  private activeWorkersMap: Map<string, { accountAlias: string; startTime: number }> = new Map();
  private completedCount: number = 0;
  private failedCount: number = 0;

  private constructor() {
    this.poolBalancer = JulesAccountPoolBalancer.getInstance();
  }

  public static getInstance(): JulesSwarmFleetSaturator {
    if (!JulesSwarmFleetSaturator.instance) {
      JulesSwarmFleetSaturator.instance = new JulesSwarmFleetSaturator();
    }
    return JulesSwarmFleetSaturator.instance;
  }

  /**
   * Enqueues batch of tasks and triggers fleet saturation
   */
  public enqueueTasks(prompts: string[]): void {
    this.taskQueue.push(...prompts);
    this.pumpFleet();
  }

  /**
   * Dispatches tasks to available slots across healthy accounts until capacity saturated
   */
  public pumpFleet(): number {
    let launchedInCycle = 0;

    while (
      this.taskQueue.length > 0 &&
      this.activeWorkersMap.size < this.maxFleetCapacity
    ) {
      const account = this.poolBalancer.acquireLeastLoadedAccount();
      if (!account) {
        // All accounts saturated or in cooldown
        break;
      }

      const prompt = this.taskQueue.shift()!;
      const workerId = `worker-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      this.activeWorkersMap.set(workerId, {
        accountAlias: account.alias,
        startTime: Date.now(),
      });

      launchedInCycle++;
    }

    return launchedInCycle;
  }

  /**
   * Marks a worker as completed, frees the slot, and pumps the next task
   */
  public reportWorkerFinished(workerId: string, succeeded: boolean = true): void {
    const worker = this.activeWorkersMap.get(workerId);
    if (!worker) return;

    this.poolBalancer.releaseSlot(worker.accountAlias, succeeded);
    this.activeWorkersMap.delete(workerId);

    if (succeeded) {
      this.completedCount++;
    } else {
      this.failedCount++;
    }

    // Immediately backfill slot from queue
    this.pumpFleet();
  }

  public getSaturationMetrics(): SaturationSummary {
    const active = this.activeWorkersMap.size;
    const saturation = this.maxFleetCapacity > 0 ? (active / this.maxFleetCapacity) * 100 : 0;

    return {
      totalDispatched: this.completedCount + this.failedCount + active,
      activeWorkers: active,
      queuedTasks: this.taskQueue.length,
      completedTasks: this.completedCount,
      failedTasks: this.failedCount,
      fleetSaturationPercent: Math.min(100, Math.round(saturation)),
    };
  }

  public destroy(): void {
    this.activeWorkersMap.forEach((worker) => {
      this.poolBalancer.releaseSlot(worker.accountAlias, false);
    });
    this.activeWorkersMap.clear();
    this.taskQueue = [];
    this.completedCount = 0;
    this.failedCount = 0;
  }
}
