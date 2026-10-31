/**
 * telegramMessageEditor.ts
 * 
 * Telegram Message Editing Engine & Protocol Validator (Phase 160).
 * Implements authoritative Telegram MTProto (messages.editMessage) & Bot API
 * (editMessageText / editMessageCaption / editMessageMedia) rules:
 * 
 * 1. Target Routing & Invariant Protection:
 *    - Pure text messages -> editMessageText (max 4096 UTF-16 code units).
 *    - Media messages (Photo, Video, Document, Audio) -> editMessageCaption (max 1024 UTF-16 code units).
 *    - Media Replacement -> editMessageMedia (InputMedia with optional caption).
 * 2. 48-Hour Telegram Edit Window:
 *    - Standard private/group messages can only be edited within 48 hours (172,800 seconds).
 *    - Saved Messages and Channel admin messages have unbounded edit windows.
 * 3. Idempotency Guard:
 *    - Detects identical text edits to prevent Telegram RPC error: "MESSAGE_NOT_MODIFIED".
 */

export type TelegramEditMode = 'text' | 'caption' | 'media';

export interface EditableMessageCandidate {
  id: number;
  date: number; // Unix timestamp in seconds
  text?: string;
  mediaType?: string;
  isOutgoing?: boolean;
  isSavedMessages?: boolean;
  isChannel?: boolean;
  canEdit?: boolean;
}

export interface EditValidationResult {
  valid: boolean;
  mode: TelegramEditMode;
  error?: string;
  normalizedText: string;
}

/**
 * Returns the maximum allowed text/caption character count (UTF-16 code units).
 * - Text messages: 4096
 * - Media captions: 1024
 */
export function getMaxAllowedLength(mode: TelegramEditMode): number {
  return mode === 'caption' ? 1024 : 4096;
}

/**
 * Determines whether an existing message requires text edit or caption edit.
 */
export function determineEditMode(
  msg: EditableMessageCandidate,
  hasNewMedia = false
): TelegramEditMode {
  if (hasNewMedia) return 'media';

  const type = (msg.mediaType || '').toLowerCase();
  const isMedia = ['photo', 'video', 'document', 'audio', 'voice', 'round'].includes(type);
  return isMedia ? 'caption' : 'text';
}

/**
 * Validates whether a message is still within Telegram's allowed edit window.
 */
export function canEditMessage(
  msg: EditableMessageCandidate,
  isAdminOrChannel = false,
  currentTimeSec = Math.floor(Date.now() / 1000)
): boolean {
  // If explicitly flagged
  if (msg.canEdit === false) return false;
  if (!msg.isOutgoing && !msg.isChannel && !isAdminOrChannel && !msg.isSavedMessages) {
    return false;
  }

  // Saved Messages and Channels have no 48h limit
  if (msg.isSavedMessages || msg.isChannel || isAdminOrChannel) {
    return true;
  }

  // Telegram 48-hour edit window invariant (48 * 3600 = 172800 seconds)
  const age = currentTimeSec - msg.date;
  return age <= 172800;
}

/**
 * Validates a message edit request before transmitting to Telegram MTProto or Bot API.
 */
export function validateEditRequest(
  originalMsg: EditableMessageCandidate,
  newText: string,
  options?: {
    hasNewMedia?: boolean;
    isAdminOrChannel?: boolean;
    currentTimeSec?: number;
  }
): EditValidationResult {
  const mode = determineEditMode(originalMsg, options?.hasNewMedia);
  const normalized = newText.trim();

  // 1. Check time window
  if (!canEditMessage(originalMsg, options?.isAdminOrChannel, options?.currentTimeSec)) {
    return {
      valid: false,
      mode,
      error: 'Message is older than 48 hours and can no longer be edited in Telegram.',
      normalizedText: normalized
    };
  }

  // 2. Prevent MESSAGE_NOT_MODIFIED
  if (!options?.hasNewMedia && (originalMsg.text || '').trim() === normalized) {
    return {
      valid: false,
      mode,
      error: 'New message text is identical to existing content (MESSAGE_NOT_MODIFIED).',
      normalizedText: normalized
    };
  }

  // 3. Length limits
  const maxLen = getMaxAllowedLength(mode);
  if (normalized.length > maxLen) {
    return {
      valid: false,
      mode,
      error: `${mode === 'caption' ? 'Media caption' : 'Text message'} exceeds Telegram limit of ${maxLen} characters (got ${normalized.length}).`,
      normalizedText: normalized
    };
  }

  return {
    valid: true,
    mode,
    normalizedText: normalized
  };
}
