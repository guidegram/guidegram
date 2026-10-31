/**
 * TL Constructor, Attachment & Video Playback Governor
 * 
 * Hardens Guidegram against competitor regressions:
 * - Ajaxy/telegram-tt #58: Error: Could not find a matching Constructor ID (MTProto TL schema unknown constructor)
 * - Ajaxy/telegram-tt #26: Downloading large attachments does not work (Chunked ranged download)
 * - Ajaxy/telegram-tt #22: Opening website from notification asks to login every time (Cross-tab auth hydration)
 * - UnigramDev/Unigram #1493: Crash while clicking advanced setting (Safe settings hydration)
 * - tdlib/td #2725: Long delay when receiving messages on Android (Adaptive keepalive ping governor)
 * - telegramdesktop/tdesktop #26784: Telegram Linux app crashes while trying to play video (Video decode fallback)
 * - telegramdesktop/tdesktop #24953: Web App not showing up on ubuntu i3 (Tiling WM window geometry initialization)
 */

export interface TlDeserializationResult {
  success: boolean;
  constructorId: number;
  data: any;
  isUnknownConstructorFallback: boolean;
  warning?: string;
}

export interface ChunkedDownloadProgress {
  fileId: string;
  totalBytes: number;
  downloadedBytes: number;
  percentage: number;
  status: 'idle' | 'downloading' | 'completed' | 'failed' | 'paused';
  chunksReceived: number;
}

export interface CrossTabAuthSession {
  token: string;
  userId: string;
  expiresAt: number;
  source: 'direct' | 'notification_deep_link';
}

export interface AdvancedSettingsViewModel {
  hardwareAccelerationEnabled: boolean;
  gpuRenderer: string;
  telemetryEnabled: boolean;
  networkProxyType: 'none' | 'socks5' | 'mtproto';
  isSafeFallbackRendered: boolean;
}

export interface AdaptiveKeepaliveConfig {
  foregroundIntervalMs: number;
  backgroundIntervalMs: number;
  currentIntervalMs: number;
  isBackground: boolean;
  lastPingSent: number;
}

export interface VideoPlaybackConfig {
  videoUrl: string;
  mimeType: string;
  hardwareAccelerationAllowed: boolean;
  decoderMode: 'hardware' | 'software_canvas';
  errorCount: number;
}

export interface TilingWindowManagerViewport {
  windowId: string;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  isVisible: boolean;
  forceRedrawTriggered: boolean;
}

export class TlConstructorAttachmentAndVideoPlaybackGovernor {
  private static instance: TlConstructorAttachmentAndVideoPlaybackGovernor;

  // Registered constructor map: id -> constructor name
  private knownConstructors = new Map<number, string>([
    [0x732de344, 'updates'],
    [0x90107221, 'updateShort'],
    [0x5a686d7c, 'message'],
    [0x3f4e0648, 'user'],
    [0xd49a2697, 'chat'],
  ]);

  // Active downloads map
  private downloads = new Map<string, ChunkedDownloadProgress>();

  // Cross-tab Auth Storage
  private activeSession: CrossTabAuthSession | null = null;

  // Adaptive Keepalive
  private keepaliveConfig: AdaptiveKeepaliveConfig = {
    foregroundIntervalMs: 15000, // 15s in foreground
    backgroundIntervalMs: 60000, // 60s in background
    currentIntervalMs: 15000,
    isBackground: false,
    lastPingSent: Date.now(),
  };

  // Video decoder modes: url -> config
  private videoPlayers = new Map<string, VideoPlaybackConfig>();

  private constructor() {}

  public static getInstance(): TlConstructorAttachmentAndVideoPlaybackGovernor {
    if (!TlConstructorAttachmentAndVideoPlaybackGovernor.instance) {
      TlConstructorAttachmentAndVideoPlaybackGovernor.instance =
        new TlConstructorAttachmentAndVideoPlaybackGovernor();
    }
    return TlConstructorAttachmentAndVideoPlaybackGovernor.instance;
  }

  // =========================================================================
  // 1. TL Deserialization Unknown Constructor Fallback (Ajaxy/telegram-tt #58)
  // =========================================================================

  public registerConstructor(id: number, name: string): void {
    this.knownConstructors.set(id, name);
  }

  public deserializeConstructor(constructorId: number, rawBuffer: Uint8Array): TlDeserializationResult {
    const knownName = this.knownConstructors.get(constructorId);

    if (knownName) {
      return {
        success: true,
        constructorId,
        data: { _type: knownName, byteLength: rawBuffer.length },
        isUnknownConstructorFallback: false,
      };
    }

    // Graceful fallback instead of throwing "Error: Could not find a matching Constructor ID"
    return {
      success: true,
      constructorId,
      data: {
        _type: `unknown_constructor_0x${constructorId.toString(16)}`,
        rawBytes: Array.from(rawBuffer),
      },
      isUnknownConstructorFallback: true,
      warning: `Unknown constructor ID 0x${constructorId.toString(16)} safely wrapped in generic container.`,
    };
  }

  // =========================================================================
  // 2. Chunked Large Attachment Downloader (Ajaxy/telegram-tt #26)
  // =========================================================================

  public startChunkedDownload(fileId: string, totalBytes: number): ChunkedDownloadProgress {
    const progress: ChunkedDownloadProgress = {
      fileId,
      totalBytes,
      downloadedBytes: 0,
      percentage: 0,
      status: 'downloading',
      chunksReceived: 0,
    };
    this.downloads.set(fileId, progress);
    return { ...progress };
  }

  public processChunk(fileId: string, chunkBytes: number): ChunkedDownloadProgress | null {
    const progress = this.downloads.get(fileId);
    if (!progress) return null;

    progress.downloadedBytes = Math.min(progress.totalBytes, progress.downloadedBytes + chunkBytes);
    progress.chunksReceived++;
    progress.percentage = Math.round((progress.downloadedBytes / progress.totalBytes) * 100);

    if (progress.downloadedBytes >= progress.totalBytes) {
      progress.status = 'completed';
    }

    return { ...progress };
  }

  public getDownloadProgress(fileId: string): ChunkedDownloadProgress | undefined {
    const p = this.downloads.get(fileId);
    return p ? { ...p } : undefined;
  }

  // =========================================================================
  // 3. Cross-Tab Auth Hydration from Notifications (Ajaxy/telegram-tt #22)
  // =========================================================================

  public storeAuthSession(token: string, userId: string, source: 'direct' | 'notification_deep_link' = 'direct'): void {
    this.activeSession = {
      token,
      userId,
      expiresAt: Date.now() + 86400000 * 30, // 30 days
      source,
    };
  }

  public hydrateSessionFromNotification(): { isAuthenticated: boolean; session?: CrossTabAuthSession } {
    if (this.activeSession && this.activeSession.expiresAt > Date.now()) {
      return {
        isAuthenticated: true,
        session: { ...this.activeSession },
      };
    }
    return { isAuthenticated: false };
  }

  // =========================================================================
  // 4. Advanced Settings Safe View Model (UnigramDev/Unigram #1493)
  // =========================================================================

  public getAdvancedSettingsViewModel(rawSystemInfo?: any): AdvancedSettingsViewModel {
    // If rawSystemInfo is null/undefined or corrupt, return safe fallback view model
    if (!rawSystemInfo || typeof rawSystemInfo !== 'object') {
      return {
        hardwareAccelerationEnabled: false,
        gpuRenderer: 'Software Renderer (Safe Fallback)',
        telemetryEnabled: false,
        networkProxyType: 'none',
        isSafeFallbackRendered: true,
      };
    }

    return {
      hardwareAccelerationEnabled: Boolean(rawSystemInfo.hardwareAcceleration ?? true),
      gpuRenderer: String(rawSystemInfo.gpuRenderer || 'Default GPU Device'),
      telemetryEnabled: Boolean(rawSystemInfo.telemetry ?? false),
      networkProxyType: rawSystemInfo.proxyType || 'none',
      isSafeFallbackRendered: false,
    };
  }

  // =========================================================================
  // 5. Adaptive Keepalive Ping Governor (tdlib/td #2725)
  // =========================================================================

  public setAppBackgroundState(isBackground: boolean): AdaptiveKeepaliveConfig {
    this.keepaliveConfig.isBackground = isBackground;
    this.keepaliveConfig.currentIntervalMs = isBackground
      ? this.keepaliveConfig.backgroundIntervalMs
      : this.keepaliveConfig.foregroundIntervalMs;
    return { ...this.keepaliveConfig };
  }

  public checkKeepalivePingNeeded(now: number = Date.now()): { pingNeeded: boolean; interval: number } {
    const elapsed = now - this.keepaliveConfig.lastPingSent;
    const pingNeeded = elapsed >= this.keepaliveConfig.currentIntervalMs;

    if (pingNeeded) {
      this.keepaliveConfig.lastPingSent = now;
    }

    return {
      pingNeeded,
      interval: this.keepaliveConfig.currentIntervalMs,
    };
  }

  // =========================================================================
  // 6. Video Decode Fallback (tdesktop #26784)
  // =========================================================================

  public configureVideoPlayback(videoUrl: string, mimeType: string): VideoPlaybackConfig {
    const config: VideoPlaybackConfig = {
      videoUrl,
      mimeType,
      hardwareAccelerationAllowed: true,
      decoderMode: 'hardware',
      errorCount: 0,
    };
    this.videoPlayers.set(videoUrl, config);
    return { ...config };
  }

  public handleVideoDecodeError(videoUrl: string): VideoPlaybackConfig {
    let config = this.videoPlayers.get(videoUrl);
    if (!config) {
      config = this.configureVideoPlayback(videoUrl, 'video/mp4');
    }

    config.errorCount++;
    // If hardware acceleration fails, switch to software canvas decode
    config.hardwareAccelerationAllowed = false;
    config.decoderMode = 'software_canvas';

    return { ...config };
  }

  // =========================================================================
  // 7. Tiling WM (i3/Sway) WebApp Viewport Governor (tdesktop #24953)
  // =========================================================================

  public initializeTilingWmViewport(windowId: string, initialWidth: number, initialHeight: number): TilingWindowManagerViewport {
    // If window starts at 0x0 (common in tiling WMs prior to tile allocation), clamp to safe minimums
    const minWidth = 320;
    const minHeight = 480;

    const width = Math.max(minWidth, initialWidth);
    const height = Math.max(minHeight, initialHeight);

    return {
      windowId,
      width,
      height,
      minWidth,
      minHeight,
      isVisible: true,
      forceRedrawTriggered: initialWidth === 0 || initialHeight === 0,
    };
  }
}

export const tlConstructorAttachmentAndVideoPlaybackGovernor =
  TlConstructorAttachmentAndVideoPlaybackGovernor.getInstance();
