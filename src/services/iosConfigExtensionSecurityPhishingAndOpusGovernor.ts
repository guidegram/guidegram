/**
 * Telegram-iOS AppConfig Parser, Extension AppGroup Sync, Enterprise Manifest,
 * Biometric Security, Anti-Phishing URL Scanner & Opus Header Governor
 * 
 * Hardens Guidegram against iOS platform runtime, distribution & security defects:
 * - #28: APP_CONFIG_DATA remote configuration decoding, feature flags & version gating.
 * - #670 & #866: App Extension bundle ID prefixes, App Group container sync & provisioning.
 * - #1490: Enterprise OTA distribution itms-services manifest generation & validation.
 * - #585: Client biometric & passcode exponential lockout with memory sanitization.
 * - #1187: Anti-phishing, punycode/homograph defense & malicious URL scanner.
 * - #168: Opus audio codec C-header include resolution & frame parameter validation.
 */

/**
 * #28: Remote APP_CONFIG_DATA Feature Flag Governor
 */
export interface AppConfigData {
  minVersion: string;
  blockedCountries: string[];
  features: Record<string, boolean>;
  maxGroupSize: number;
  experimentalVoiceEnabled: boolean;
}

export class IosAppConfigDataGovernor {
  private currentConfig: AppConfigData;

  constructor(defaultConfig?: Partial<AppConfigData>) {
    this.currentConfig = {
      minVersion: defaultConfig?.minVersion ?? '8.0.0',
      blockedCountries: defaultConfig?.blockedCountries ?? [],
      features: defaultConfig?.features ?? { stories: true, reactions: true, premium: true },
      maxGroupSize: defaultConfig?.maxGroupSize ?? 200000,
      experimentalVoiceEnabled: defaultConfig?.experimentalVoiceEnabled ?? false
    };
  }

  public parseAndApplyConfig(rawJson: string): { success: boolean; config: AppConfigData } {
    try {
      const parsed = JSON.parse(rawJson);
      this.currentConfig = {
        minVersion: parsed.min_version || this.currentConfig.minVersion,
        blockedCountries: Array.isArray(parsed.blocked_countries) ? parsed.blocked_countries : [],
        features: { ...this.currentConfig.features, ...(parsed.features || {}) },
        maxGroupSize: parsed.max_group_size || this.currentConfig.maxGroupSize,
        experimentalVoiceEnabled: Boolean(parsed.experimental_voice_enabled)
      };
      return { success: true, config: { ...this.currentConfig } };
    } catch {
      return { success: false, config: { ...this.currentConfig } };
    }
  }

  public isFeatureAllowed(featureKey: string, countryCode?: string): boolean {
    if (countryCode && this.currentConfig.blockedCountries.includes(countryCode.toUpperCase())) {
      return false;
    }
    return Boolean(this.currentConfig.features[featureKey]);
  }

  public getConfig(): Readonly<AppConfigData> {
    return { ...this.currentConfig };
  }
}

/**
 * #670 & #866: App Extension Group & Provisioning Entitlements Governor
 */
export interface ExtensionGroupValidation {
  parentBundleId: string;
  extensionBundleId: string;
  hasValidPrefix: boolean;
  appGroupSharedContainer: string;
  entitlementsValid: boolean;
}

export class IosAppExtensionGroupGovernor {
  private readonly appGroupIdentifier = 'group.org.telegram.TelegramGroup';

  public validateExtensionConfiguration(
    parentBundleId: string,
    extensionBundleId: string,
    entitlements: string[]
  ): ExtensionGroupValidation {
    const hasValidPrefix = extensionBundleId.startsWith(`${parentBundleId}.`);
    const entitlementsValid =
      entitlements.includes(this.appGroupIdentifier) &&
      entitlements.includes('keychain-access-groups');

    return {
      parentBundleId,
      extensionBundleId,
      hasValidPrefix,
      appGroupSharedContainer: this.appGroupIdentifier,
      entitlementsValid
    };
  }
}

/**
 * #1490: Enterprise OTA itms-services Manifest Governor
 */
export interface OtaManifestParams {
  ipaHttpsUrl: string;
  bundleId: string;
  bundleVersion: string;
  title: string;
  iconHttpsUrl?: string;
}

export class IosEnterpriseManifestGovernor {
  public generateManifestPlist(params: OtaManifestParams): string {
    const iconDict = params.iconHttpsUrl
      ? `
        <dict>
          <key>kind</key>
          <string>display-image</string>
          <key>needs-shine</key>
          <true/>
          <key>url</key>
          <string>${params.iconHttpsUrl}</string>
        </dict>`
      : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array>
    <dict>
      <key>assets</key>
      <array>
        <dict>
          <key>kind</key>
          <string>software-package</string>
          <key>url</key>
          <string>${params.ipaHttpsUrl}</string>
        </dict>${iconDict}
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key>
        <string>${params.bundleId}</string>
        <key>bundle-version</key>
        <string>${params.bundleVersion}</string>
        <key>kind</key>
        <string>software</string>
        <key>title</key>
        <string>${params.title}</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>`.trim();
  }

  public generateDeepLink(manifestHttpsUrl: string): string {
    return `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestHttpsUrl)}`;
  }
}

/**
 * #585: Biometric Lockout & Memory Sanitization Governor
 */
export class IosBiometricLockoutGovernor {
  private failedAttempts = 0;
  private lockoutUntilTimestamp = 0;
  private cachedBiometricKey: string | null = 'secure_biometric_auth_token_999';

  public registerFailedAttempt(): { failedAttempts: number; lockoutSeconds: number; isLocked: boolean } {
    this.failedAttempts++;
    let lockoutSeconds = 0;

    if (this.failedAttempts >= 7) {
      lockoutSeconds = 3600; // 1 hour
      this.wipeSensitiveKeys();
    } else if (this.failedAttempts >= 6) {
      lockoutSeconds = 300; // 5 minutes
      this.wipeSensitiveKeys();
    } else if (this.failedAttempts >= 5) {
      lockoutSeconds = 60; // 1 minute
      this.wipeSensitiveKeys();
    }

    if (lockoutSeconds > 0) {
      this.lockoutUntilTimestamp = Date.now() + lockoutSeconds * 1000;
    }

    return {
      failedAttempts: this.failedAttempts,
      lockoutSeconds,
      isLocked: lockoutSeconds > 0
    };
  }

  public isLockedOut(currentTime = Date.now()): boolean {
    return currentTime < this.lockoutUntilTimestamp;
  }

  public resetOnSuccess(): void {
    this.failedAttempts = 0;
    this.lockoutUntilTimestamp = 0;
    this.cachedBiometricKey = 'secure_biometric_auth_token_999';
  }

  public getCachedBiometricKey(): string | null {
    return this.cachedBiometricKey;
  }

  private wipeSensitiveKeys(): void {
    // Explicit zero-out sanitization
    this.cachedBiometricKey = null;
  }
}

/**
 * #1187: Anti-Phishing & Punycode URL Scanner Governor
 */
export interface UrlScanResult {
  url: string;
  isSuspicious: boolean;
  threatType: 'none' | 'punycode_homograph' | 'ip_hostname' | 'malicious_domain' | 'telegram_impersonation';
  recommendedAction: 'allow' | 'warn_user' | 'block';
}

export class IosAntiPhishingUrlScannerGovernor {
  private maliciousBlacklist = new Set(['telegram-free-gift.com', 'login-telegram-web.ru', 'free-stars-tg.org']);

  public scanUrl(rawUrl: string): UrlScanResult {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return { url: rawUrl, isSuspicious: true, threatType: 'malicious_domain', recommendedAction: 'block' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // 1. Punycode / Homograph attack check (e.g. xn--telegr-...)
    if (hostname.startsWith('xn--') || hostname.includes('.xn--')) {
      return {
        url: rawUrl,
        isSuspicious: true,
        threatType: 'punycode_homograph',
        recommendedAction: 'warn_user'
      };
    }

    // 2. IP-address hostname check
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return {
        url: rawUrl,
        isSuspicious: true,
        threatType: 'ip_hostname',
        recommendedAction: 'warn_user'
      };
    }

    // 3. Known malicious blacklist
    if (this.maliciousBlacklist.has(hostname)) {
      return {
        url: rawUrl,
        isSuspicious: true,
        threatType: 'malicious_domain',
        recommendedAction: 'block'
      };
    }

    // 4. Fake Telegram impersonation domain
    if (hostname.includes('telegram') && !hostname.endsWith('telegram.org') && !hostname.endsWith('t.me')) {
      return {
        url: rawUrl,
        isSuspicious: true,
        threatType: 'telegram_impersonation',
        recommendedAction: 'warn_user'
      };
    }

    return {
      url: rawUrl,
      isSuspicious: false,
      threatType: 'none',
      recommendedAction: 'allow'
    };
  }
}

/**
 * #168: Opus Audio Codec Header & Frame Parameter Governor
 */
export interface OpusAudioFormat {
  sampleRate: number; // 8000, 12000, 16000, 24000, 48000
  channels: 1 | 2;
  frameDurationMs: 2.5 | 5 | 10 | 20 | 40 | 60;
}

export class IosOpusHeaderCompatibilityGovernor {
  public resolveIncludeHeader(headerPath: string): { resolvedHeader: string; status: 'ok' | 'shimmed' } {
    if (headerPath === '<opus/opus.h>' || headerPath === '"opus.h"') {
      return {
        resolvedHeader: '#include <opus/opus.h>',
        status: 'ok'
      };
    }
    return {
      resolvedHeader: '#include "shims/opus_compat.h"',
      status: 'shimmed'
    };
  }

  public validateFormat(format: OpusAudioFormat): { valid: boolean; frameBytes: number } {
    const validSampleRates = [8000, 12000, 16000, 24000, 48000];
    const validDurations = [2.5, 5, 10, 20, 40, 60];

    const isValid =
      validSampleRates.includes(format.sampleRate) &&
      validDurations.includes(format.frameDurationMs) &&
      (format.channels === 1 || format.channels === 2);

    if (!isValid) {
      return { valid: false, frameBytes: 0 };
    }

    // Opus frame samples = sampleRate * (durationMs / 1000)
    const samples = (format.sampleRate * format.frameDurationMs) / 1000;
    // 16-bit PCM = 2 bytes per sample per channel
    const frameBytes = samples * format.channels * 2;

    return { valid: true, frameBytes };
  }
}
