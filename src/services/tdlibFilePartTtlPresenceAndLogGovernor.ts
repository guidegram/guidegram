/**
 * TDLib File Part Streaming, Empty Photo Fallback, Auto-Delete TTL,
 * Chat ID Translation, Online Presence & Log Rotation Governor
 *
 * Hardens Guidegram against:
 * 1. tdlib/td#550 - readFilePart chunk streaming for in-browser media players
 * 2. tdlib/td#3583 - photoEmpty / photoSizeEmpty handling & graceful placeholder fallback
 * 3. tdlib/td#3768 - Auto-delete message TTL countdown & self-destruct timers
 * 4. tdlib/td#2591 - Chat ID translation (Bot API channel IDs <-> TDLib supergroup IDs <-> basic group IDs)
 * 5. tdlib/td#1260 - Online presence manager (setOption('online')) & idle activity detector
 * 6. tdlib/td#926 - Binary log rotation, verbosity level filtering & log file size limiter
 * 7. tdlib/td#312 - E.164 phone number normalization & anti-spam attempt throttle
 */

export interface ReadFilePartQuery {
  '@type': 'readFilePart';
  file_id: number;
  offset: number;
  count: number;
}

export interface NormalizedPhotoResult {
  isEmpty: boolean;
  fileId: number | null;
  width: number;
  height: number;
  placeholderColor: string;
}

export interface MessageTtlCountdownResult {
  hasTtl: boolean;
  ttlSeconds: number;
  expiresAtTimestamp: number;
  remainingSeconds: number;
  isSelfDestructed: boolean;
  displayCountdown: string;
}

export interface PresenceStateResult {
  isOnline: boolean;
  reason: 'user_active' | 'app_unfocused' | 'user_idle';
  tdlibQuery: {
    '@type': 'setOption';
    name: 'online';
    value: {
      '@type': 'optionValueBoolean';
      value: boolean;
    };
  };
}

export interface LogConfigResult {
  verbosityLevel: number;
  maxLogSizeBytes: number;
  tdlibQuery: {
    '@type': 'setLogStream';
    log_stream: {
      '@type': 'logStreamFile';
      path: string;
      max_file_size: number;
      redirect_stderr: boolean;
    };
  };
}

export interface PhoneValidationResult {
  isValid: boolean;
  e164Phone: string;
  countryCode: string | null;
  error?: string;
  cooldownRemainingMs: number;
}

export class TdlibFilePartTtlPresenceAndLogGovernor {
  private lastPhoneSubmissionTime: number = 0;
  private minPhoneSubmissionIntervalMs: number = 5000;

  // =========================================================================
  // 1. readFilePart Chunk Streaming (tdlib/td#550)
  // =========================================================================

  public buildReadFilePartQuery(fileId: number, offset: number, count: number): ReadFilePartQuery {
    if (offset < 0) {
      throw new Error('Offset must be a non-negative integer');
    }
    if (count <= 0) {
      throw new Error('Count must be greater than zero');
    }

    return {
      '@type': 'readFilePart',
      file_id: fileId,
      offset,
      count,
    };
  }

  public sliceFileChunk(buffer: Uint8Array, offset: number, count: number): Uint8Array {
    const start = Math.min(offset, buffer.byteLength);
    const end = Math.min(start + count, buffer.byteLength);
    return buffer.subarray(start, end);
  }

  // =========================================================================
  // 2. photoEmpty / photoSizeEmpty Graceful Handling (tdlib/td#3583)
  // =========================================================================

  public normalizePhotoObject(photo: any): NormalizedPhotoResult {
    if (
      !photo ||
      photo['@type'] === 'photoEmpty' ||
      !photo.sizes ||
      photo.sizes.length === 0 ||
      photo.id === 0
    ) {
      return {
        isEmpty: true,
        fileId: null,
        width: 0,
        height: 0,
        placeholderColor: '#2b313b',
      };
    }

    const largestSize = photo.sizes[photo.sizes.length - 1];
    if (!largestSize || largestSize['@type'] === 'photoSizeEmpty') {
      return {
        isEmpty: true,
        fileId: null,
        width: 0,
        height: 0,
        placeholderColor: '#2b313b',
      };
    }

    return {
      isEmpty: false,
      fileId: largestSize.photo ? largestSize.photo.id : (largestSize.id || null),
      width: largestSize.width || 0,
      height: largestSize.height || 0,
      placeholderColor: '#1c2127',
    };
  }

  // =========================================================================
  // 3. Auto-Delete TTL Self-Destruct Timer (tdlib/td#3768)
  // =========================================================================

  public calculateMessageTtlCountdown(
    sentDateSeconds: number,
    ttlSeconds: number,
    currentTimeSeconds: number = Math.floor(Date.now() / 1000)
  ): MessageTtlCountdownResult {
    if (!ttlSeconds || ttlSeconds <= 0) {
      return {
        hasTtl: false,
        ttlSeconds: 0,
        expiresAtTimestamp: 0,
        remainingSeconds: Infinity,
        isSelfDestructed: false,
        displayCountdown: 'No TTL',
      };
    }

    const expiresAt = sentDateSeconds + ttlSeconds;
    const remaining = Math.max(0, expiresAt - currentTimeSeconds);
    const isSelfDestructed = remaining <= 0;

    let display = 'Expired';
    if (!isSelfDestructed) {
      if (remaining >= 86400) {
        const days = Math.floor(remaining / 86400);
        display = `${days}d left`;
      } else if (remaining >= 3600) {
        const hours = Math.floor(remaining / 3600);
        const mins = Math.floor((remaining % 3600) / 60);
        display = `${hours}h ${mins}m left`;
      } else if (remaining >= 60) {
        const mins = Math.floor(remaining / 60);
        display = `${mins}m left`;
      } else {
        display = `${remaining}s left`;
      }
    }

    return {
      hasTtl: true,
      ttlSeconds,
      expiresAtTimestamp: expiresAt,
      remainingSeconds: remaining,
      isSelfDestructed,
      displayCountdown: display,
    };
  }

  // =========================================================================
  // 4. Chat ID Translator: Bot API <-> TDLib (tdlib/td#2591)
  // =========================================================================

  public convertChatId(
    rawId: number | string,
    targetFormat: 'bot_api_channel_id' | 'tdlib_supergroup_id' | 'tdlib_chat_id'
  ): number | string {
    const str = String(rawId).trim();
    const isChannelOrSupergroup = str.startsWith('-100');
    const isBasicGroup = str.startsWith('-') && !isChannelOrSupergroup;

    // Extract bare positive ID
    let barePositiveId = str;
    if (isChannelOrSupergroup) {
      barePositiveId = str.substring(4);
    } else if (isBasicGroup) {
      barePositiveId = str.substring(1);
    }

    if (targetFormat === 'tdlib_supergroup_id') {
      return parseInt(barePositiveId, 10);
    }

    if (targetFormat === 'bot_api_channel_id' || targetFormat === 'tdlib_chat_id') {
      if (isChannelOrSupergroup) {
        return str; // Already -100...
      }
      if (isBasicGroup) {
        return parseInt(str, 10); // Standard basic group -123
      }
      // If it was raw positive supergroup ID (e.g. 1234567890) -> prefix with -100
      return `-100${barePositiveId}`;
    }

    return rawId;
  }

  // =========================================================================
  // 5. Online Presence Manager & Idle Tracking (tdlib/td#1260)
  // =========================================================================

  public updatePresenceState(
    isAppFocused: boolean,
    lastUserActivityTimestampMs: number,
    currentTimeMs: number = Date.now(),
    idleThresholdMs: number = 60000
  ): PresenceStateResult {
    let isOnline = false;
    let reason: 'user_active' | 'app_unfocused' | 'user_idle' = 'user_active';

    if (!isAppFocused) {
      isOnline = false;
      reason = 'app_unfocused';
    } else if (currentTimeMs - lastUserActivityTimestampMs > idleThresholdMs) {
      isOnline = false;
      reason = 'user_idle';
    } else {
      isOnline = true;
      reason = 'user_active';
    }

    return {
      isOnline,
      reason,
      tdlibQuery: {
        '@type': 'setOption',
        name: 'online',
        value: {
          '@type': 'optionValueBoolean',
          value: isOnline,
        },
      },
    };
  }

  // =========================================================================
  // 6. Log Management & Size Limiter (tdlib/td#926)
  // =========================================================================

  public configureLogManagement(
    verbosityLevel: number = 1,
    maxLogSizeBytes: number = 10 * 1024 * 1024,
    logFilePath: string = 'tdlib.log'
  ): LogConfigResult {
    // Clamp verbosity between 0 (Fatal only) and 5 (Verbose debug)
    const clampedVerbosity = Math.min(Math.max(verbosityLevel, 0), 5);

    return {
      verbosityLevel: clampedVerbosity,
      maxLogSizeBytes,
      tdlibQuery: {
        '@type': 'setLogStream',
        log_stream: {
          '@type': 'logStreamFile',
          path: logFilePath,
          max_file_size: maxLogSizeBytes,
          redirect_stderr: false,
        },
      },
    };
  }

  // =========================================================================
  // 7. E.164 Phone Normalization & Anti-Spam Throttle (tdlib/td#312)
  // =========================================================================

  public normalizePhoneNumber(
    rawPhone: string,
    currentTimeMs: number = Date.now()
  ): PhoneValidationResult {
    const elapsed = currentTimeMs - this.lastPhoneSubmissionTime;
    const cooldownRemaining = Math.max(0, this.minPhoneSubmissionIntervalMs - elapsed);

    if (cooldownRemaining > 0) {
      return {
        isValid: false,
        e164Phone: '',
        countryCode: null,
        error: `Submission rate limited. Please wait ${Math.ceil(cooldownRemaining / 1000)} seconds before retrying to prevent Telegram phone bans.`,
        cooldownRemainingMs: cooldownRemaining,
      };
    }

    // Strip formatting characters except leading plus
    const digitsOnly = rawPhone.replace(/[^\d+]/g, '');
    let e164 = digitsOnly.startsWith('+') ? digitsOnly : `+${digitsOnly}`;

    if (e164.length < 8 || e164.length > 16) {
      return {
        isValid: false,
        e164Phone: e164,
        countryCode: null,
        error: 'Phone number must be between 7 and 15 digits according to E.164 standard.',
        cooldownRemainingMs: 0,
      };
    }

    this.lastPhoneSubmissionTime = currentTimeMs;

    return {
      isValid: true,
      e164Phone: e164,
      countryCode: e164.slice(1, 4),
      cooldownRemainingMs: 0,
    };
  }
}
