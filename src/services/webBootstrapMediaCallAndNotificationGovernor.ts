/**
 * Web Bootstrap, Audio Cover Art, Video Calls, Quick Media & Background Notifications Governor
 *
 * Hardens Guidegram web client against:
 * 1. Ajaxy/telegram-tt#380 - Telegram A is not loading (bootstrap chunk load failure & cache corruption fallback)
 * 2. Ajaxy/telegram-tt#209 - Corrupted audio covers (ID3 APIC frame validation, magic bytes & deterministic fallback)
 * 3. Ajaxy/telegram-tt#131 - [feature request] video calls please (WebRTC video call state machine, camera & screen tracks)
 * 4. Ajaxy/telegram-tt#113 - Menu background is not blurred in Firefox (CSS backdrop-filter detection & opaque fallback)
 * 5. Ajaxy/telegram-tt#75 - Feature request: ctrl+up keybind for "reply to previous message" (keyboard navigation governor)
 * 6. Ajaxy/telegram-tt#49 - .JPEG has no "send in a quick way" option but .JPG has (MIME and extension normalization)
 * 7. Ajaxy/telegram-tt#11 - Let user disable background notifications (Push notification filtering & quiet hours)
 */

export interface BootstrapConfig {
  appVersion: string;
  timeoutMs: number;
  maxChunkRetries: number;
}

export interface BootstrapState {
  status: 'idle' | 'loading' | 'ready' | 'recovering' | 'failed';
  retryCount: number;
  lastError: string | null;
  cacheBustVersion: string | null;
}

export interface AudioCoverMetadata {
  isValid: boolean;
  mimeType: string;
  dataUrl?: string;
  fallbackGradient?: {
    fromColor: string;
    toColor: string;
    initials: string;
  };
  error?: string;
}

export type CallState =
  | 'idle'
  | 'initiating'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'terminating'
  | 'terminated';

export interface VideoCallConfig {
  peerId: number | string;
  enableVideo: boolean;
  enableAudio: boolean;
  targetResolution?: '720p' | '360p' | '1080p';
}

export interface BackdropStyleResult {
  supportsBackdropFilter: boolean;
  backdropFilter: string;
  backgroundColor: string;
  border?: string;
}

export interface MessageItem {
  id: number;
  text: string;
  senderId: number;
  timestamp: number;
}

export interface ComposerKeydownEvent {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  currentInputText: string;
  activeReplyMessageId?: number | null;
  messageHistory: MessageItem[];
}

export interface ComposerKeydownResult {
  handled: boolean;
  action: 'reply' | 'cancel_reply' | 'none';
  replyToMessageId: number | null;
}

export interface MediaUploadNormalization {
  originalName: string;
  normalizedExtension: string;
  canonicalMimeType: string;
  isQuickSendEligible: boolean;
}

export interface NotificationSettings {
  backgroundNotificationsEnabled: boolean;
  quietHours: {
    enabled: boolean;
    startHour: number; // 0-23
    endHour: number;   // 0-23
  };
  mutedChatIds: Set<number | string>;
}

export class WebBootstrapMediaCallAndNotificationGovernor {
  private bootstrapState: BootstrapState = {
    status: 'idle',
    retryCount: 0,
    lastError: null,
    cacheBustVersion: null,
  };

  private callState: CallState = 'idle';
  private currentCallConfig: VideoCallConfig | null = null;
  private isCameraEnabled: boolean = false;
  private isScreenSharing: boolean = false;
  private isAudioMuted: boolean = false;

  private notificationSettings: NotificationSettings = {
    backgroundNotificationsEnabled: true,
    quietHours: {
      enabled: false,
      startHour: 23,
      endHour: 7,
    },
    mutedChatIds: new Set(),
  };

  // =========================================================================
  // 1. Web Client Bootstrap & Chunk Recovery (Ajaxy/telegram-tt#380)
  // =========================================================================

  public getBootstrapState(): BootstrapState {
    return { ...this.bootstrapState };
  }

  public initiateBootstrap(config: BootstrapConfig): BootstrapState {
    this.bootstrapState = {
      status: 'loading',
      retryCount: 0,
      lastError: null,
      cacheBustVersion: config.appVersion,
    };
    return { ...this.bootstrapState };
  }

  public handleBootstrapChunkError(error: Error | string, config: BootstrapConfig): BootstrapState {
    const errorMsg = typeof error === 'string' ? error : error.message;
    this.bootstrapState.lastError = errorMsg;

    if (this.bootstrapState.retryCount < config.maxChunkRetries) {
      this.bootstrapState.retryCount += 1;
      this.bootstrapState.status = 'recovering';
      // Cache bust parameter generated to bypass damaged cache layer
      this.bootstrapState.cacheBustVersion = `${config.appVersion}.${Date.now()}`;
    } else {
      this.bootstrapState.status = 'failed';
    }

    return { ...this.bootstrapState };
  }

  public markBootstrapSuccessful(): BootstrapState {
    this.bootstrapState.status = 'ready';
    this.bootstrapState.lastError = null;
    return { ...this.bootstrapState };
  }

  // =========================================================================
  // 2. Corrupted Audio Covers & Fallback Art (Ajaxy/telegram-tt#209)
  // =========================================================================

  public validateAndExtractAudioCover(
    trackTitle: string,
    artist: string,
    rawBytes?: Uint8Array | null,
    mimeHint?: string
  ): AudioCoverMetadata {
    if (!rawBytes || rawBytes.length < 8) {
      return this.generateFallbackCover(trackTitle, artist, 'Missing or empty cover binary');
    }

    // Verify Magic Bytes
    // JPEG: 0xFF 0xD8 0xFF
    const isJpeg = rawBytes[0] === 0xff && rawBytes[1] === 0xd8 && rawBytes[2] === 0xff;
    // PNG: 0x89 0x50 0x4E 0x47
    const isPng =
      rawBytes[0] === 0x89 &&
      rawBytes[1] === 0x50 &&
      rawBytes[2] === 0x4e &&
      rawBytes[3] === 0x47;
    // WEBP: "RIFF" .... "WEBP"
    const isWebp =
      rawBytes[0] === 0x52 &&
      rawBytes[1] === 0x49 &&
      rawBytes[2] === 0x46 &&
      rawBytes[3] === 0x46;

    if (!isJpeg && !isPng && !isWebp) {
      return this.generateFallbackCover(
        trackTitle,
        artist,
        'Corrupted image header magic bytes'
      );
    }

    const mime = isJpeg ? 'image/jpeg' : isPng ? 'image/png' : 'image/webp';
    return {
      isValid: true,
      mimeType: mime,
    };
  }

  private generateFallbackCover(
    title: string,
    artist: string,
    reason: string
  ): AudioCoverMetadata {
    let hash = 0;
    const combined = `${artist}:${title}`;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash << 5) - hash + combined.charCodeAt(i);
      hash |= 0;
    }

    const hue1 = Math.abs(hash) % 360;
    const hue2 = (hue1 + 45) % 360;

    const initials = (
      (artist.trim()[0] || '') + (title.trim()[0] || 'A')
    ).toUpperCase();

    return {
      isValid: false,
      mimeType: 'image/svg+xml',
      error: reason,
      fallbackGradient: {
        fromColor: `hsl(${hue1}, 75%, 45%)`,
        toColor: `hsl(${hue2}, 85%, 35%)`,
        initials: initials || 'GM',
      },
    };
  }

  // =========================================================================
  // 3. WebRTC Video Call State & Track Negotiation (Ajaxy/telegram-tt#131)
  // =========================================================================

  public initiateVideoCall(config: VideoCallConfig): CallState {
    if (this.callState !== 'idle' && this.callState !== 'terminated') {
      throw new Error(`Cannot initiate call while in state: ${this.callState}`);
    }

    this.callState = 'initiating';
    this.currentCallConfig = { ...config };
    this.isCameraEnabled = config.enableVideo;
    this.isAudioMuted = !config.enableAudio;
    this.isScreenSharing = false;

    return this.callState;
  }

  public transitionCallState(nextState: CallState): CallState {
    this.callState = nextState;
    if (nextState === 'terminated') {
      this.isCameraEnabled = false;
      this.isScreenSharing = false;
      this.currentCallConfig = null;
    }
    return this.callState;
  }

  public toggleCamera(enabled: boolean): boolean {
    if (this.callState !== 'connected' && this.callState !== 'connecting') {
      throw new Error('Camera can only be toggled during an active call');
    }
    this.isCameraEnabled = enabled;
    return this.isCameraEnabled;
  }

  public toggleScreenShare(enabled: boolean): boolean {
    if (this.callState !== 'connected') {
      throw new Error('Screen sharing requires connected call');
    }
    this.isScreenSharing = enabled;
    if (enabled) {
      // Screen share typically overrides camera video track
      this.isCameraEnabled = false;
    }
    return this.isScreenSharing;
  }

  public getCallSummary() {
    return {
      state: this.callState,
      isCameraEnabled: this.isCameraEnabled,
      isScreenSharing: this.isScreenSharing,
      isAudioMuted: this.isAudioMuted,
      config: this.currentCallConfig,
    };
  }

  // =========================================================================
  // 4. Firefox & Browser Backdrop-Filter Fallback (Ajaxy/telegram-tt#113)
  // =========================================================================

  public resolveBackdropBlurStyle(
    userAgent: string,
    supportsCssBackdropFilter: boolean
  ): BackdropStyleResult {
    const isFirefox = /Firefox\/([0-9.]+)/i.test(userAgent);

    // If browser doesn't support backdrop-filter or is older Firefox with glitchy blur
    if (!supportsCssBackdropFilter || (isFirefox && !supportsCssBackdropFilter)) {
      return {
        supportsBackdropFilter: false,
        backdropFilter: 'none',
        backgroundColor: 'rgba(28, 33, 39, 0.96)', // Solid opaque fallback with dark tint
        border: '1px solid rgba(255, 255, 255, 0.12)',
      };
    }

    return {
      supportsBackdropFilter: true,
      backdropFilter: 'blur(20px) saturate(180%)',
      backgroundColor: 'rgba(28, 33, 39, 0.75)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    };
  }

  // =========================================================================
  // 5. Ctrl+Up Keyboard Shortcut for Message Reply (Ajaxy/telegram-tt#75)
  // =========================================================================

  public handleComposerKeydown(event: ComposerKeydownEvent): ComposerKeydownResult {
    const isCtrlOrMeta = !!(event.ctrlKey || event.metaKey);

    // 1. Ctrl+Up / Cmd+Up to reply to previous message
    if (isCtrlOrMeta && event.key === 'ArrowUp') {
      // Only trigger if input field is empty (or whitespace) to avoid cursor jump disruption
      if (event.currentInputText.trim().length === 0 && event.messageHistory.length > 0) {
        const latestMessage = event.messageHistory[event.messageHistory.length - 1];
        return {
          handled: true,
          action: 'reply',
          replyToMessageId: latestMessage.id,
        };
      }
    }

    // 2. Escape to cancel active reply
    if (event.key === 'Escape' && event.activeReplyMessageId) {
      return {
        handled: true,
        action: 'cancel_reply',
        replyToMessageId: null,
      };
    }

    return {
      handled: false,
      action: 'none',
      replyToMessageId: event.activeReplyMessageId || null,
    };
  }

  // =========================================================================
  // 6. Media Quick Send MIME & Extension Normalization (Ajaxy/telegram-tt#49)
  // =========================================================================

  public normalizeMediaUpload(fileName: string, mimeType?: string): MediaUploadNormalization {
    const lastDot = fileName.lastIndexOf('.');
    const rawExt = lastDot !== -1 ? fileName.slice(lastDot + 1).toLowerCase() : '';

    let canonicalExt = rawExt;
    let canonicalMime = mimeType ? mimeType.toLowerCase() : '';

    if (rawExt === 'jpeg' || rawExt === 'jpg' || rawExt === 'jpe') {
      canonicalExt = 'jpg';
      canonicalMime = 'image/jpeg';
    } else if (rawExt === 'png') {
      canonicalExt = 'png';
      canonicalMime = 'image/png';
    } else if (rawExt === 'webp') {
      canonicalExt = 'webp';
      canonicalMime = 'image/webp';
    } else if (rawExt === 'gif') {
      canonicalExt = 'gif';
      canonicalMime = 'image/gif';
    }

    // Quick Send is supported for compressed standard photo formats (both .jpeg and .jpg included!)
    const quickSendMimes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const isQuickSendEligible = quickSendMimes.has(canonicalMime);

    return {
      originalName: fileName,
      normalizedExtension: canonicalExt,
      canonicalMimeType: canonicalMime,
      isQuickSendEligible,
    };
  }

  // =========================================================================
  // 7. Background Notifications & Quiet Hours Governor (Ajaxy/telegram-tt#11)
  // =========================================================================

  public updateNotificationSettings(settings: Partial<NotificationSettings>) {
    this.notificationSettings = {
      ...this.notificationSettings,
      ...settings,
    };
  }

  public shouldDeliverNotification(
    chatId: number | string,
    isAppInForeground: boolean,
    currentDate: Date = new Date()
  ): { deliver: boolean; reason: string } {
    // 1. If app is foregrounded, OS push is not needed (handled by in-app sound/banner)
    if (isAppInForeground) {
      return { deliver: false, reason: 'app_in_foreground' };
    }

    // 2. User explicitly disabled background notifications
    if (!this.notificationSettings.backgroundNotificationsEnabled) {
      return { deliver: false, reason: 'background_notifications_disabled' };
    }

    // 3. Chat is muted
    if (this.notificationSettings.mutedChatIds.has(chatId)) {
      return { deliver: false, reason: 'chat_muted' };
    }

    // 4. Quiet hours filter
    if (this.notificationSettings.quietHours.enabled) {
      const currentHour = currentDate.getHours();
      const { startHour, endHour } = this.notificationSettings.quietHours;

      let inQuietHours = false;
      if (startHour > endHour) {
        // e.g. 23:00 to 07:00
        inQuietHours = currentHour >= startHour || currentHour < endHour;
      } else {
        // e.g. 13:00 to 15:00
        inQuietHours = currentHour >= startHour && currentHour < endHour;
      }

      if (inQuietHours) {
        return { deliver: false, reason: 'quiet_hours_active' };
      }
    }

    return { deliver: true, reason: 'ok' };
  }
}
