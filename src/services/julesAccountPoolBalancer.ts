/**
 * src/services/julesAccountPoolBalancer.ts
 * Google Jules Multi-Account Pool & Automated Failover Load Balancer Protocol
 * Manages pool of Google Jules Pro worker accounts with automated failover and least-loaded balancing.
 * Prevents 400 FAILED_PRECONDITION concurrency stalls, isolates exhausted accounts, and guarantees zero downtime.
 */

export interface JulesAccount {
  alias: string;
  email: string;
  activeSlots: number;
  maxSlots: number; // 15
  isHealthy: boolean;
  cooldownUntil: number | null;
  totalTasksCompleted: number;
}

export class JulesAccountPoolBalancer {
  private static instance: JulesAccountPoolBalancer | null = null;
  private accounts: Map<string, JulesAccount> = new Map();
  private maxSlotsPerAccount: number = 15;

  private constructor() {
    this.initDefaultAccounts();
  }

  public static getInstance(): JulesAccountPoolBalancer {
    if (!JulesAccountPoolBalancer.instance) {
      JulesAccountPoolBalancer.instance = new JulesAccountPoolBalancer();
    }
    return JulesAccountPoolBalancer.instance;
  }

  private initDefaultAccounts(): void {
    const defaultAliases = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
    defaultAliases.forEach((alias) => {
      this.accounts.set(alias, {
        alias,
        email: `${alias}@jules.internal`,
        activeSlots: 0,
        maxSlots: this.maxSlotsPerAccount,
        isHealthy: true,
        cooldownUntil: null,
        totalTasksCompleted: 0,
      });
    });
  }

  public registerAccount(alias: string, email: string): void {
    this.accounts.set(alias, {
      alias,
      email,
      activeSlots: 0,
      maxSlots: this.maxSlotsPerAccount,
      isHealthy: true,
      cooldownUntil: null,
      totalTasksCompleted: 0,
    });
  }

  /**
   * Selects least-loaded healthy account with available concurrency slots
   */
  public acquireLeastLoadedAccount(): JulesAccount | null {
    const now = Date.now();
    let bestAccount: JulesAccount | null = null;
    let minLoad = Infinity;

    for (const account of this.accounts.values()) {
      // Check if cooldown expired
      if (account.cooldownUntil && now >= account.cooldownUntil) {
        account.isHealthy = true;
        account.cooldownUntil = null;
      }

      if (account.isHealthy && account.activeSlots < account.maxSlots) {
        if (account.activeSlots < minLoad) {
          minLoad = account.activeSlots;
          bestAccount = account;
        }
      }
    }

    if (bestAccount) {
      bestAccount.activeSlots += 1;
    }

    return bestAccount;
  }

  /**
   * Release an acquired concurrency slot
   */
  public releaseSlot(alias: string, succeeded: boolean = true): void {
    const account = this.accounts.get(alias);
    if (!account) return;

    account.activeSlots = Math.max(0, account.activeSlots - 1);
    if (succeeded) {
      account.totalTasksCompleted += 1;
    }
  }

  /**
   * Report account failure (e.g. 400 FAILED_PRECONDITION quota exhaustion)
   * Triggers automated failover cooldown
   */
  public markAccountExhausted(alias: string, cooldownDurationMs: number = 60000): void {
    const account = this.accounts.get(alias);
    if (!account) return;

    account.isHealthy = false;
    account.cooldownUntil = Date.now() + cooldownDurationMs;
    // Release any stuck slot
    account.activeSlots = Math.max(0, account.activeSlots - 1);
  }

  public getPoolStats(): {
    totalAccounts: number;
    healthyAccounts: number;
    totalActiveSlots: number;
    totalCapacity: number;
  } {
    let healthyCount = 0;
    let activeSlots = 0;
    let totalCap = 0;

    for (const account of this.accounts.values()) {
      if (account.isHealthy) healthyCount++;
      activeSlots += account.activeSlots;
      totalCap += account.maxSlots;
    }

    return {
      totalAccounts: this.accounts.size,
      healthyAccounts: healthyCount,
      totalActiveSlots: activeSlots,
      totalCapacity: totalCap,
    };
  }

  public destroy(): void {
    this.accounts.clear();
  }
}
