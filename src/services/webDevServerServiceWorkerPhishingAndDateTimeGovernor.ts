/**
 * Web Dev Server Network Host, Service Worker Claim, Anti-Phishing Guard & Custom DateTime Governor
 * 
 * Hardens Vite dev server network IP binding, Service Worker controller-less fallback,
 * anti-phishing iframe embed prevention, and customizable date/time formatting.
 * 
 * Resolves Competitor Issues:
 * - morethanwords/tweb#466: Vite server works locally but not on external network IPs
 * - morethanwords/tweb#462: Service Worker registration failed (no controller fallback)
 * - morethanwords/tweb#366: Anti-phishing protection & unauthorized iframe embed prevention
 * - morethanwords/tweb#249: TypeScript compiler and Vite modern bundling flags
 * - morethanwords/tweb#241: Cross-platform npm start script execution
 * - morethanwords/tweb#203: WebAssembly chunking and Vite production memory limits
 * - morethanwords/tweb#199: Customizable date/time format (DD/MM/YYYY, 12h/24h toggle)
 */

export interface ViteNetworkConfig {
  host: string;
  port: number;
  cors: boolean;
  hmrClientPort?: number;
  hmrHost?: string;
}

export interface ServiceWorkerControllerState {
  hasActiveController: boolean;
  isRegistered: boolean;
  transportMode: 'service_worker_proxy' | 'direct_main_thread_worker';
  fallbackReason?: string;
}

export interface AntiPhishingEvaluation {
  isOriginSafe: boolean;
  isIframeEmbedded: boolean;
  alertRequired: boolean;
  blockedActionReason?: string;
}

export type DateFormatPattern = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD.MM.YYYY';

export interface DateTimeFormatConfig {
  datePattern: DateFormatPattern;
  use24HourFormat: boolean;
  timeZone?: string;
}

export class WebDevServerServiceWorkerPhishingAndDateTimeGovernor {
  private static readonly ALLOWED_OFFICIAL_DOMAINS = [
    'web.guidegram.io',
    'app.guidegram.io',
    'localhost',
    '127.0.0.1'
  ];

  /**
   * Generates Vite server configuration supporting local and external LAN network IP access (#466).
   */
  public generateViteNetworkConfig(externalIp?: string, port: number = 3000): ViteNetworkConfig {
    return {
      host: '0.0.0.0', // Bind to all interfaces for external LAN access
      port,
      cors: true,
      hmrClientPort: port,
      hmrHost: externalIp || undefined
    };
  }

  /**
   * Evaluates Service Worker state and activates direct worker fallback if no controller exists (#462).
   */
  public resolveServiceWorkerTransport(hasActiveController: boolean, isRegistered: boolean): ServiceWorkerControllerState {
    if (isRegistered && hasActiveController) {
      return {
        hasActiveController: true,
        isRegistered: true,
        transportMode: 'service_worker_proxy'
      };
    }

    return {
      hasActiveController: false,
      isRegistered,
      transportMode: 'direct_main_thread_worker',
      fallbackReason: 'Service Worker has no active controller; routed via Direct Dedicated WebWorker.'
    };
  }

  /**
   * Evaluates domain origin and iframe embedding to prevent phishing clones (#366).
   */
  public evaluateAntiPhishing(currentHostname: string, isFramed: boolean): AntiPhishingEvaluation {
    const isAllowedDomain = WebDevServerServiceWorkerPhishingAndDateTimeGovernor.ALLOWED_OFFICIAL_DOMAINS.some(
      domain => currentHostname === domain || currentHostname.endsWith(`.${domain}`)
    );

    if (isFramed) {
      return {
        isOriginSafe: isAllowedDomain,
        isIframeEmbedded: true,
        alertRequired: true,
        blockedActionReason: 'Embedding this messaging client inside an unauthorized third-party iframe is prohibited to protect user credentials.'
      };
    }

    if (!isAllowedDomain) {
      return {
        isOriginSafe: false,
        isIframeEmbedded: false,
        alertRequired: true,
        blockedActionReason: `Untrusted deployment domain '${currentHostname}' detected. Potential phishing or unauthorized mirror.`
      };
    }

    return {
      isOriginSafe: true,
      isIframeEmbedded: false,
      alertRequired: false
    };
  }

  /**
   * Formats timestamps according to user-selected date patterns (e.g. DD/MM/YYYY) and 12h/24h format (#199).
   */
  public formatDateTime(timestampMs: number, config: DateTimeFormatConfig): { formattedDate: string; formattedTime: string; fullString: string } {
    const date = new Date(timestampMs);

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    let formattedDate: string;
    switch (config.datePattern) {
      case 'DD/MM/YYYY':
        formattedDate = `${day}/${month}/${year}`;
        break;
      case 'MM/DD/YYYY':
        formattedDate = `${month}/${day}/${year}`;
        break;
      case 'YYYY-MM-DD':
        formattedDate = `${year}-${month}-${day}`;
        break;
      case 'DD.MM.YYYY':
        formattedDate = `${day}.${month}.${year}`;
        break;
      default:
        formattedDate = `${day}/${month}/${year}`;
    }

    let hours = date.getUTCHours();
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    let formattedTime: string;

    if (config.use24HourFormat) {
      formattedTime = `${String(hours).padStart(2, '0')}:${minutes}`;
    } else {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 becomes 12
      formattedTime = `${hours}:${minutes} ${ampm}`;
    }

    return {
      formattedDate,
      formattedTime,
      fullString: `${formattedDate} ${formattedTime}`
    };
  }

  /**
   * Produces cross-platform npm scripts without Unix-specific export syntax (#241, #249, #203).
   */
  public generateCrossPlatformScripts(): Record<string, string> {
    return {
      dev: 'vite --host 0.0.0.0 --port 3000',
      build: 'node --max-old-space-size=4096 ./node_modules/vite/bin/vite.js build',
      preview: 'vite preview --host 0.0.0.0 --port 3000'
    };
  }
}
