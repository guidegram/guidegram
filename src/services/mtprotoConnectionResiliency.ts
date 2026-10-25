/**
 * Guidegram Master Hardening - Phase 153
 * MTProto Connection Resiliency & Exponential Backoff Keepalive Protocol
 * 
 * Manages resilient MTProto connection states, jittered exponential backoff reconnects,
 * keepalive heartbeats, and offline outgoing message queue flushing upon reconnection.
 */

export interface QueuedOfflineMessage {
  id: string;
  peerId: string;
  text: string;
  enqueuedAt: number;
  retryAttempts: number;
}

export interface ConnectionStateSnapshot {
  status: 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'OFFLINE';
  consecutiveFailures: number;
  nextRetryDelayMs: number;
  offlineQueueSize: number;
  lastHeartbeat: number;
}

export class MtprotoConnectionResiliency {
  private static instance: MtprotoConnectionResiliency;
  private status: 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'OFFLINE' = 'OFFLINE';
  private consecutiveFailures: number = 0;
  private offlineQueue: QueuedOfflineMessage[] = [];
  private baseDelayMs: number = 1000;
  private maxDelayMs: number = 30000;
  private maxQueueSize: number = 250;
  private lastHeartbeat: number = Date.now();

  private constructor(baseDelayMs: number = 1000, maxDelayMs: number = 30000) {
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
  }

  public static getInstance(baseDelayMs?: number, maxDelayMs?: number): MtprotoConnectionResiliency {
    if (!MtprotoConnectionResiliency.instance) {
      MtprotoConnectionResiliency.instance = new MtprotoConnectionResiliency(baseDelayMs, maxDelayMs);
    }
    return MtprotoConnectionResiliency.instance;
  }

  /**
   * Calculates jittered exponential backoff delay based on failure count.
   */
  public getReconnectDelay(): number {
    const exp = Math.min(6, this.consecutiveFailures);
    const calculated = this.baseDelayMs * Math.pow(2, exp);
    const capped = Math.min(this.maxDelayMs, calculated);
    // Add 20% random jitter to prevent server thundering herds
    const jitter = capped * (0.8 + Math.random() * 0.4);
    return Math.floor(jitter);
  }

  /**
   * Notifies failure and transitions state to RECONNECTING.
   */
  public notifyDisconnect(): number {
    this.consecutiveFailures++;
    this.status = 'RECONNECTING';
    return this.getReconnectDelay();
  }

  /**
   * Notifies successful connection and resets backoff counters.
   */
  public notifyConnect(): QueuedOfflineMessage[] {
    this.status = 'CONNECTED';
    this.consecutiveFailures = 0;
    this.lastHeartbeat = Date.now();
    return this.flushQueue();
  }

  /**
   * Enqueues an outgoing message while offline.
   */
  public enqueueOfflineMessage(msg: Omit<QueuedOfflineMessage, 'enqueuedAt' | 'retryAttempts'>): boolean {
    if (this.offlineQueue.length >= this.maxQueueSize) {
      this.offlineQueue.shift(); // Evict oldest
    }

    this.offlineQueue.push({
      ...msg,
      enqueuedAt: Date.now(),
      retryAttempts: 0,
    });
    return true;
  }

  /**
   * Flushes and drains offline messages queue.
   */
  public flushQueue(): QueuedOfflineMessage[] {
    const toFlush = [...this.offlineQueue];
    this.offlineQueue = [];
    return toFlush;
  }

  /**
   * Updates ping/pong heartbeat timestamp.
   */
  public recordHeartbeat(): void {
    this.lastHeartbeat = Date.now();
  }

  /**
   * Returns connection state snapshot.
   */
  public getSnapshot(): ConnectionStateSnapshot {
    return {
      status: this.status,
      consecutiveFailures: this.consecutiveFailures,
      nextRetryDelayMs: this.getReconnectDelay(),
      offlineQueueSize: this.offlineQueue.length,
      lastHeartbeat: this.lastHeartbeat,
    };
  }

  /**
   * Resets connection state.
   */
  public reset(): void {
    this.status = 'OFFLINE';
    this.consecutiveFailures = 0;
    this.offlineQueue = [];
    this.lastHeartbeat = Date.now();
  }
}
