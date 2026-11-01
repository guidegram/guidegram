/**
 * TDLib Core 2FA Recovery, Auth Key Duplicates, Avatar Downscaling, Keepalive Ping,
 * Push Tokens & UTF-8 Entities Governor
 *
 * Hardens Guidegram against:
 * 1. tdlib/td#3494 - 2FA Password recovery & account lock avoidance (requestAuthenticationPasswordRecovery)
 * 2. tdlib/td#1947 - AUTH_KEY_DROP_DUPLICATE error recovery & clean DH nonce re-generation
 * 3. tdlib/td#1691 - Avatar upload OOM prevention via client-side downscaling and square cropping
 * 4. tdlib/td#1086 - TCP stream termination & MTProto keepalive ping_delay_disconnect timing
 * 5. tdlib/td#549 - Push notification device token registration payload formatting (FCM / APNs / WebPush)
 * 6. tdlib/td#181 - Multi-byte UTF-16 code unit entity offset alignment (Cyrillic, Persian & emoji)
 * 7. tdlib/td#2947 - UPDATE_APP_TO_LOGIN protocol version negotiation & layer requirement handling
 */

export interface TwoFactorState {
  hasRecoveryEmail: boolean;
  emailPattern?: string;
  recoveryCodeLength?: number;
  resetAccountPendingDays?: number;
}

export interface PasswordRecoveryAction {
  action: 'send_recovery_code' | 'start_reset_countdown' | 'enter_password';
  emailPattern?: string;
  resetWaitDays?: number;
}

export interface AuthKeyDropRecoveryResult {
  recovered: boolean;
  newClientNonce: string;
  newServerSalt: string;
  shouldResetLocalAuthKey: boolean;
}

export interface AvatarDownscaleResult {
  cropWidth: number;
  cropHeight: number;
  targetWidth: number;
  targetHeight: number;
  scaleFactor: number;
  estimatedMemoryReductionPct: number;
  quality: number;
}

export interface KeepalivePingStatus {
  pingId: number;
  intervalMs: number;
  disconnectDelaySec: number;
  isSocketHealthy: boolean;
  needsReconnect: boolean;
}

export interface PushTokenPayload {
  '@type': 'registerDevice';
  device_token: {
    '@type': string;
    token: string;
    data?: Record<string, unknown>;
  };
  other_user_ids: number[];
}

export interface TextEntity {
  type: string;
  offset: number; // UTF-16 code units offset
  length: number; // UTF-16 code units length
}

export interface ProtocolLayerCheckResult {
  isUpdateRequired: boolean;
  clientLayer: number;
  minimumRequiredLayer: number;
  downloadUrl: string;
  diagnostic: string;
}

export class TdlibAuthAvatarKeepaliveAndEntityGovernor {
  private currentPingId: number = 1000;
  private lastPingSentAt: number = 0;
  private lastPongReceivedAt: number = 0;

  // =========================================================================
  // 1. 2FA Password Recovery & Account Lock Prevention (tdlib/td#3494)
  // =========================================================================

  public evaluatePasswordRecoveryOption(state: TwoFactorState): PasswordRecoveryAction {
    if (state.hasRecoveryEmail && state.emailPattern) {
      return {
        action: 'send_recovery_code',
        emailPattern: state.emailPattern,
      };
    }

    if (typeof state.resetAccountPendingDays === 'number' && state.resetAccountPendingDays > 0) {
      return {
        action: 'start_reset_countdown',
        resetWaitDays: state.resetAccountPendingDays,
      };
    }

    return {
      action: 'enter_password',
    };
  }

  // =========================================================================
  // 2. AUTH_KEY_DROP_DUPLICATE Handshake Recovery (tdlib/td#1947)
  // =========================================================================

  public handleAuthKeyDuplicateError(): AuthKeyDropRecoveryResult {
    // Generate fresh nonces and clean salt
    const randomHex = (len: number) =>
      Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    return {
      recovered: true,
      newClientNonce: randomHex(32),
      newServerSalt: randomHex(16),
      shouldResetLocalAuthKey: true,
    };
  }

  // =========================================================================
  // 3. Avatar Upload OOM Prevention via Downscaling (tdlib/td#1691)
  // =========================================================================

  public calculateAvatarDownscale(
    originalWidth: number,
    originalHeight: number,
    maxDimension: number = 1280
  ): AvatarDownscaleResult {
    // 1. Center Square Crop dimensions
    const cropSize = Math.min(originalWidth, originalHeight);

    // 2. Target dimensions clamped to maxDimension (e.g. 1280x1280)
    const targetSize = Math.min(cropSize, maxDimension);
    const scaleFactor = targetSize / cropSize;

    // Estimate uncompressed RGBA memory: width * height * 4 bytes
    const originalBytes = originalWidth * originalHeight * 4;
    const scaledBytes = targetSize * targetSize * 4;
    const reductionPct = Math.round(((originalBytes - scaledBytes) / originalBytes) * 100);

    return {
      cropWidth: cropSize,
      cropHeight: cropSize,
      targetWidth: targetSize,
      targetHeight: targetSize,
      scaleFactor,
      estimatedMemoryReductionPct: Math.max(0, reductionPct),
      quality: 0.85,
    };
  }

  // =========================================================================
  // 4. MTProto TCP Keepalive Ping Timing (tdlib/td#1086)
  // =========================================================================

  public prepareKeepalivePing(currentTime: number = Date.now()): KeepalivePingStatus {
    this.currentPingId += 1;
    this.lastPingSentAt = currentTime;

    return {
      pingId: this.currentPingId,
      intervalMs: 45000, // Send ping every 45s
      disconnectDelaySec: 75, // Instruct server to wait 75s before tearing down socket
      isSocketHealthy: true,
      needsReconnect: false,
    };
  }

  public recordPongReceived(currentTime: number = Date.now()) {
    this.lastPongReceivedAt = currentTime;
  }

  public evaluateSocketHealth(currentTime: number = Date.now()): {
    isHealthy: boolean;
    needsReconnect: boolean;
    unansweredPingDurationMs: number;
  } {
    const unansweredDuration = this.lastPingSentAt > this.lastPongReceivedAt
      ? currentTime - this.lastPingSentAt
      : 0;

    // If ping went unanswered for more than 15 seconds, socket is half-open
    const needsReconnect = unansweredDuration > 15000;

    return {
      isHealthy: !needsReconnect,
      needsReconnect,
      unansweredPingDurationMs: unansweredDuration,
    };
  }

  // =========================================================================
  // 5. Push Notification Device Token Payload (tdlib/td#549)
  // =========================================================================

  public buildDevicePushRegistration(
    tokenType: 'fcm' | 'apns' | 'web_push',
    rawToken: string,
    otherUserIds: number[] = []
  ): PushTokenPayload {
    const cleanToken = rawToken.trim();
    if (!cleanToken) {
      throw new Error('Push device token cannot be empty');
    }

    let tdType = 'deviceTokenWebPush';
    if (tokenType === 'fcm') {
      tdType = 'deviceTokenFirebaseCloudMessaging';
    } else if (tokenType === 'apns') {
      tdType = 'deviceTokenApplePush';
    }

    return {
      '@type': 'registerDevice',
      device_token: {
        '@type': tdType,
        token: cleanToken,
      },
      other_user_ids: otherUserIds,
    };
  }

  // =========================================================================
  // 6. UTF-16 Code Unit Entity Offsets (tdlib/td#181)
  // =========================================================================

  public calculateEntityOffsets(
    text: string,
    rawMatches: Array<{ type: string; substring: string }>
  ): TextEntity[] {
    const entities: TextEntity[] = [];

    for (const match of rawMatches) {
      // Index in JavaScript string is natively in UTF-16 code units!
      const utf16Index = text.indexOf(match.substring);
      if (utf16Index !== -1) {
        entities.push({
          type: match.type,
          offset: utf16Index,
          length: match.substring.length,
        });
      }
    }

    return entities;
  }

  public sliceEntityByUtf16(text: string, entity: TextEntity): string {
    return text.substring(entity.offset, entity.offset + entity.length);
  }

  // =========================================================================
  // 7. Protocol Version & UPDATE_APP_TO_LOGIN (tdlib/td#2947)
  // =========================================================================

  public evaluateProtocolLayerRequirement(
    clientLayer: number,
    serverRequiredLayer: number = 160
  ): ProtocolLayerCheckResult {
    const isUpdateRequired = clientLayer < serverRequiredLayer;

    return {
      isUpdateRequired,
      clientLayer,
      minimumRequiredLayer: serverRequiredLayer,
      downloadUrl: 'https://guidegram.org/download',
      diagnostic: isUpdateRequired
        ? `Server rejected handshake: Client layer ${clientLayer} is deprecated. Update to Layer ${serverRequiredLayer}+ required.`
        : `Client layer ${clientLayer} meets server requirements.`,
    };
  }
}
