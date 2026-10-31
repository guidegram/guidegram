/**
 * Guidegram E2E Message Interaction, Clipboard & Security Guard
 * 
 * Hardened against:
 * - tdesktop #31505: Copying selected messages clears the active selection (regression in 7.3.2)
 * - tdesktop #31535: "Delete All From User" permanently deleting message history without confirmation
 * - tdesktop #31540: Nonsensical raw RPC errors like "USER_NOT_PARTICIPANT" shown to users
 * - tdesktop #1320: Cannot send photos / media due to missing pre-flight dimension and format checks
 */

export interface SelectedMessageItem {
  id: number;
  senderName: string;
  timestampStr: string;
  text: string;
}

export interface BulkDeleteRequest {
  targetUserId: number;
  chatId: number;
  chatType: 'private' | 'group' | 'supergroup' | 'channel';
  callerIsAdmin: boolean;
  affectedMessageCount: number;
  hasUserConfirmed: boolean;
}

export interface MediaPreflightResult {
  isValid: boolean;
  detectedMime: string;
  width?: number;
  height?: number;
  error?: string;
}

export class E2eMessageInteractionAndSecurityGuard {
  /**
   * Copies selected messages to clipboard with structured formatting,
   * STRICTLY preserving the active selection state without clearing it (tdesktop #31505).
   */
  public static copySelectedMessages(
    messages: SelectedMessageItem[],
    currentSelectedIds: Set<number>,
    clipboardWriter?: (text: string) => void
  ): { formattedText: string; preservedSelectedCount: number } {
    if (!messages || messages.length === 0) {
      return { formattedText: '', preservedSelectedCount: currentSelectedIds.size };
    }

    // Sort chronologically
    const sorted = [...messages].sort((a, b) => a.id - b.id);
    const lines = sorted.map(m => `[${m.timestampStr}] ${m.senderName}:\n${m.text}`);
    const formattedText = lines.join('\n\n');

    if (clipboardWriter) {
      clipboardWriter(formattedText);
    }

    // Return the untouched selection count (proving state was preserved)
    return {
      formattedText,
      preservedSelectedCount: currentSelectedIds.size
    };
  }

  /**
   * Enforces security confirmation and administrative privileges for bulk deletion,
   * preventing accidental permanent history loss in private groups (tdesktop #31535).
   */
  public static validateBulkDelete(request: BulkDeleteRequest): {
    canProceed: boolean;
    requiresConfirmationDialog: boolean;
    reason?: string;
  } {
    if (!request.hasUserConfirmed) {
      return {
        canProceed: false,
        requiresConfirmationDialog: true,
        reason: `Are you sure you want to delete ${request.affectedMessageCount} messages from this user? This action cannot be undone.`
      };
    }

    if (request.chatType === 'channel' || request.chatType === 'supergroup') {
      if (!request.callerIsAdmin) {
        return {
          canProceed: false,
          requiresConfirmationDialog: false,
          reason: 'Administrator privileges required to delete messages from other participants'
        };
      }
    }

    return {
      canProceed: true,
      requiresConfirmationDialog: false
    };
  }

  /**
   * Translates cryptic raw Telegram MTProto RPC errors into friendly, human-readable explanations (tdesktop #31540).
   */
  public static humanizeRpcError(rawError: string, language: 'fa' | 'en' = 'fa'): string {
    const errorUpper = (rawError || '').toUpperCase().trim();

    const translationsFa: Record<string, string> = {
      USER_NOT_PARTICIPANT: 'این کاربر هنوز عضو این گروه یا کانال نیست.',
      CHAT_ADMIN_REQUIRED: 'برای انجام این عملیات نیاز به دسترسی مدیریت دارید.',
      PEER_ID_INVALID: 'مخاطب یا گروه مورد نظر یافت نشد یا معتبر نیست.',
      MESSAGE_NOT_MODIFIED: 'پیام تغییری نکرده است.',
      MESSAGE_EMPTY: 'پیام ارسالی نمی‌تواند خالی باشد.',
      MEDIA_EMPTY: 'فایل چندرسانه‌ای خالی یا نامعتبر است.',
      FLOOD_WAIT: 'به دلیل ارسال بیش از حد درخواست، لطفاً چند لحظه صبر کنید.'
    };

    const translationsEn: Record<string, string> = {
      USER_NOT_PARTICIPANT: 'This user is not a participant of this chat.',
      CHAT_ADMIN_REQUIRED: 'You need administrator permissions to perform this action.',
      PEER_ID_INVALID: 'The target user or group is invalid or could not be found.',
      MESSAGE_NOT_MODIFIED: 'The message was not modified.',
      MESSAGE_EMPTY: 'Message content cannot be empty.',
      MEDIA_EMPTY: 'The selected media file is empty or corrupted.',
      FLOOD_WAIT: 'Too many requests. Please wait before trying again.'
    };

    const dict = language === 'fa' ? translationsFa : translationsEn;

    for (const key of Object.keys(dict)) {
      if (errorUpper.includes(key)) {
        return dict[key];
      }
    }

    return language === 'fa'
      ? `خطایی در ارتباط با سرور رخ داد (${rawError})`
      : `An error occurred (${rawError})`;
  }

  /**
   * Pre-flight validation of image dimensions, byte sizes, and MIME headers
   * before initiating MTProto file upload (tdesktop #1320).
   */
  public static validateMediaPreflight(
    headerBytes: Uint8Array,
    width: number,
    height: number,
    byteLength: number,
    maxDimension: number = 10000,
    maxBytes: number = 50 * 1024 * 1024 // 50MB
  ): MediaPreflightResult {
    if (byteLength <= 0 || byteLength > maxBytes) {
      return { isValid: false, detectedMime: 'unknown', error: 'File size exceeds allowed limits or is empty' };
    }

    if (width <= 0 || height <= 0 || width > maxDimension || height > maxDimension) {
      return { isValid: false, detectedMime: 'unknown', error: `Dimensions ${width}x${height} exceed limit (${maxDimension}px)` };
    }

    // Sniff magic bytes
    let detectedMime = 'unknown';
    if (headerBytes.length >= 4) {
      // PNG: 89 50 4E 47
      if (headerBytes[0] === 0x89 && headerBytes[1] === 0x50 && headerBytes[2] === 0x4e && headerBytes[3] === 0x47) {
        detectedMime = 'image/png';
      }
      // JPEG: FF D8 FF
      else if (headerBytes[0] === 0xff && headerBytes[1] === 0xd8 && headerBytes[2] === 0xff) {
        detectedMime = 'image/jpeg';
      }
      // GIF: 47 49 46 38
      else if (headerBytes[0] === 0x47 && headerBytes[1] === 0x49 && headerBytes[2] === 0x46 && headerBytes[3] === 0x38) {
        detectedMime = 'image/gif';
      }
      // WebP: RIFF ... WEBP
      else if (headerBytes[0] === 0x52 && headerBytes[1] === 0x49 && headerBytes[2] === 0x46 && headerBytes[3] === 0x46) {
        detectedMime = 'image/webp';
      }
    }

    if (detectedMime === 'unknown') {
      return { isValid: false, detectedMime: 'unknown', error: 'Unsupported or corrupted image format' };
    }

    return {
      isValid: true,
      detectedMime,
      width,
      height
    };
  }
}
