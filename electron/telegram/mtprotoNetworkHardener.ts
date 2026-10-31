import net from 'net'
import type { ProxyConfig } from './types'

/**
 * MtprotoNetworkHardener (Phase 2: MTProto Handshake, FakeTLS & Network Censorship Hardening)
 * 
 * Directly addresses high-impact competitor issues:
 * - tdesktop #30042: High CPU usage when VPN is disconnected and killswitch is on (instant rejection loop)
 * - tdesktop #30733 (794 reactions): Update fingerprint MTPROTO FakeTLS (Censorship bypass)
 * - tdesktop #16093 (24 reactions): Unresponsive / UI freeze after connecting to network
 * - tdesktop #17316: Proxy reconnect loop forever
 * - tdesktop #2306: Crash / hang during mass socket teardown (VPN switch / airplane mode)
 */

export interface FakeTlsProfile {
  rawSecret: string;
  isFakeTls: boolean;
  domain?: string;
  sanitizedSecret: string;
}

export interface NetworkHardenerTelemetry {
  fakeTlsProcessedCount: number;
  sniSpoofModernizedCount: number;
  socketsSafelyTornDownCount: number;
  proxyRacesConductedCount: number;
  circuitBreakerTripsCount: number;
  instantRejectionClampsCount: number;
}

export class MtprotoNetworkHardener {
  private static instance: MtprotoNetworkHardener | null = null;

  // Curated modern TLS 1.3 SNI domains that evade active DPI filters
  private static readonly RESILIENT_SNI_POOL: string[] = [
    'www.cloudflare.com',
    'gateway.icloud.com',
    'login.microsoftonline.com',
    'aws.amazon.com',
    'edge.microsoft.com',
  ];

  // Telemetry
  private fakeTlsProcessed: number = 0;
  private sniSpoofModernized: number = 0;
  private socketsTornDown: number = 0;
  private proxyRacesConducted: number = 0;
  private circuitBreakerTrips: number = 0;
  private instantRejectionClamps: number = 0;

  private constructor() {}

  public static getInstance(): MtprotoNetworkHardener {
    if (!this.instance) {
      this.instance = new MtprotoNetworkHardener();
    }
    return this.instance;
  }

  /**
   * Parses and modernizes an MTProto FakeTLS secret.
   * Resolves tdesktop #30733 by upgrading obsolete or flagged SNI domains.
   */
  public parseAndHardenFakeTls(rawSecret: string): FakeTlsProfile {
    this.fakeTlsProcessed++;
    if (!rawSecret || typeof rawSecret !== 'string') {
      return { rawSecret: '', isFakeTls: false, sanitizedSecret: rawSecret };
    }

    const clean = rawSecret.trim().toLowerCase();

    // FakeTLS secret format in MTProto: starts with 'ee' + 32-char hex key + optional ascii hex domain
    if (clean.startsWith('ee') && clean.length >= 34) {
      const coreKeyHex = clean.substring(2, 34);
      let domainHex = clean.substring(34);
      let detectedDomain = '';

      if (domainHex.length > 0) {
        try {
          detectedDomain = Buffer.from(domainHex, 'hex').toString('utf8');
        } catch {}
      }

      // Check if domain is empty or flagged as obsolete/blocked
      const isKnownBlockedDomain = !detectedDomain || 
        detectedDomain.includes('google.com') || 
        detectedDomain.includes('yandex.ru') ||
        detectedDomain.includes('mail.ru');

      if (isKnownBlockedDomain) {
        // Upgrade to high-reputation modern TLS 1.3 SNI
        const modernSni = MtprotoNetworkHardener.RESILIENT_SNI_POOL[
          Math.floor(Math.random() * MtprotoNetworkHardener.RESILIENT_SNI_POOL.length)
        ];
        const newDomainHex = Buffer.from(modernSni, 'utf8').toString('hex');
        const upgradedSecret = `ee${coreKeyHex}${newDomainHex}`;

        this.sniSpoofModernized++;
        return {
          rawSecret,
          isFakeTls: true,
          domain: modernSni,
          sanitizedSecret: upgradedSecret,
        };
      }

      return {
        rawSecret,
        isFakeTls: true,
        domain: detectedDomain,
        sanitizedSecret: clean,
      };
    }

    return {
      rawSecret,
      isFakeTls: false,
      sanitizedSecret: clean,
    };
  }

  /**
   * Safely and synchronously tears down network sockets without event-loop hangs.
   * Resolves tdesktop #2306 & #16093.
   */
  public safeTeardownSocket(socket: net.Socket | null | undefined): void {
    if (!socket) return;

    try {
      socket.removeAllListeners('data');
      socket.removeAllListeners('drain');
      socket.removeAllListeners('error');
      socket.removeAllListeners('close');
      socket.removeAllListeners('timeout');

      // Unref to ensure event loop is not kept alive during VPN/network drops
      if (typeof socket.unref === 'function') {
        socket.unref();
      }

      if (!socket.destroyed) {
        socket.destroy();
      }
      this.socketsTornDown++;
    } catch {}
  }

  /**
   * Fast parallel proxy racing with 3000ms hard ceiling.
   * Resolves tdesktop #17316 (Proxy reconnect loop forever) by finding the fastest reachable node.
   */
  public async raceFastestProxy(
    proxies: ProxyConfig[],
    pingTester: (proxy: ProxyConfig) => Promise<number>,
    timeoutMs: number = 3000
  ): Promise<ProxyConfig | null> {
    if (!proxies || proxies.length === 0) return null;
    this.proxyRacesConducted++;

    const candidates = proxies.filter((p) => p && p.host && p.port);
    if (candidates.length === 0) return null;

    return new Promise((resolve) => {
      let resolved = false;
      let completedPings = 0;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.circuitBreakerTrips++;
          resolve(null);
        }
      }, timeoutMs);

      for (const proxy of candidates) {
        pingTester(proxy)
          .then((latency) => {
            if (resolved) return;
            if (latency > 0 && latency < timeoutMs) {
              resolved = true;
              clearTimeout(timer);
              resolve({ ...proxy, pingMs: latency, lastChecked: Date.now() });
            } else {
              completedPings++;
              if (completedPings >= candidates.length && !resolved) {
                resolved = true;
                clearTimeout(timer);
                resolve(null);
              }
            }
          })
          .catch(() => {
            completedPings++;
            if (completedPings >= candidates.length && !resolved) {
              resolved = true;
              clearTimeout(timer);
              resolve(null);
            }
          });
      }
    });
  }

  /**
   * Defensive Circuit Breaker for Instant Network Rejections (VPN Killswitch / Firewall rejection spinloop guard).
   * Directly resolves tdesktop #30042 (100% CPU on VPN disconnect with killswitch active).
   *
   * When an OS firewall (e.g. Linux iptables/nftables REJECT, or Windows WFP filter) immediately rejects
   * a TCP socket in microseconds (ECONNREFUSED / WSAECONNREFUSED / EHOSTUNREACH), this method detects
   * the sub-100ms roundtrip rejection and enforces an unconditional minimum clamp delay (e.g. 1500ms + jitter),
   * preventing zero-delay spin loops in userspace event loops.
   */
  public calculateKillswitchGuardedDelay(
    attempt: number,
    connectionElapsedMs: number,
    errorSnippet?: string,
    minClampFloorMs: number = 1500,
    randomFn: () => number = Math.random
  ): { isInstantRejection: boolean; delayMs: number } {
    const isInstant = connectionElapsedMs >= 0 && connectionElapsedMs < 100;
    const isRefusalError = Boolean(
      errorSnippet &&
        (errorSnippet.includes('ECONNREFUSED') ||
          errorSnippet.includes('WSAECONNREFUSED') ||
          errorSnippet.includes('EHOSTUNREACH') ||
          errorSnippet.includes('ENETUNREACH') ||
          errorSnippet.includes('WSAEACCES'))
    );

    if (isInstant || isRefusalError) {
      this.instantRejectionClamps++;
      // Enforce minimum floor + jitter (1500ms - 2250ms) to ensure event loop breathes
      const jitter = Math.floor(randomFn() * 750);
      const safeAttempt = Math.min(attempt, 6);
      const exponentialDelay = minClampFloorMs * Math.pow(1.5, safeAttempt);
      const finalDelay = Math.min(30000, Math.round(exponentialDelay + jitter));

      return {
        isInstantRejection: true,
        delayMs: finalDelay,
      };
    }

    return {
      isInstantRejection: false,
      delayMs: 0,
    };
  }

  public getTelemetry(): NetworkHardenerTelemetry {
    return {
      fakeTlsProcessedCount: this.fakeTlsProcessed,
      sniSpoofModernizedCount: this.sniSpoofModernized,
      socketsSafelyTornDownCount: this.socketsTornDown,
      proxyRacesConductedCount: this.proxyRacesConducted,
      circuitBreakerTripsCount: this.circuitBreakerTrips,
      instantRejectionClampsCount: this.instantRejectionClamps,
    };
  }
}

export const mtprotoNetworkHardener = MtprotoNetworkHardener.getInstance();

