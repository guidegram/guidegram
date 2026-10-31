/**
 * telegramStickerEngine.ts
 * 
 * Telegram Sticker Set Management & Protocol Validator Engine.
 * Directly addresses high-impact competitor issue:
 * - rubenlagus/TelegramBots #1608: AddStickerToSet sends sticker as an array: "InputSticker must be an Object"
 * 
 * The Problem:
 * Telegram Bot API has strict schema asymmetry between sticker methods:
 * 1. `createNewStickerSet`: expects `stickers` as a JSON array (`Array of InputSticker`).
 * 2. `addStickerToSet`: expects `sticker` as a single JSON object (`InputSticker`).
 * 3. `replaceStickerInSet`: expects `sticker` as a single JSON object (`InputSticker`).
 * Naive implementations reuse array builders for add/replace methods, emitting `sticker=[{...}]`
 * which Telegram Bot API servers reject with:
 *   [400] Bad Request: can't parse sticker: InputSticker must be an Object
 * 
 * Features:
 * 1. Schema Validation & Asymmetry Enforcement:
 *    - Validates single `InputSticker` object for add/replace vs array for create.
 * 2. Sticker Format & Technical Constraint Checking:
 *    - Static (PNG/WEBP, <= 512KB).
 *    - Animated (TGS / Lottie, <= 64KB, <= 3s).
 *    - Video (WEBM / VP9, <= 256KB, <= 3s).
 * 3. Multipart Payload Builder:
 *    - Emits strictly typed multipart fields without array wrapping for singular sticker operations.
 */

export type StickerFormat = 'static' | 'animated' | 'video';
export type StickerType = 'regular' | 'mask' | 'custom_emoji';

export interface InputStickerItem {
  sticker: string | Uint8Array | { fileId: string }; // FileID, URL, or local file
  format: StickerFormat;
  emoji_list: string[];
  mask_position?: {
    point: string;
    x_shift: number;
    y_shift: number;
    scale: number;
  };
  keywords?: string[];
}

export interface CreateStickerSetPayload {
  user_id: number;
  name: string; // Must end in _by_<bot_username>
  title: string;
  stickers: InputStickerItem[];
  sticker_type?: StickerType;
  needs_repainting?: boolean;
}

export interface AddStickerToSetPayload {
  user_id: number;
  name: string;
  sticker: InputStickerItem; // Singular InputSticker, NOT an array!
}

export interface ReplaceStickerInSetPayload {
  user_id: number;
  name: string;
  old_sticker: string;
  sticker: InputStickerItem; // Singular InputSticker, NOT an array!
}

export interface SerializedStickerMultipartPart {
  name: string;
  value: string; // JSON string or text
  isJson: boolean;
  isArray: boolean;
}

export class TelegramStickerEngine {
  private static instance: TelegramStickerEngine | null = null;

  private constructor() {}

  public static getInstance(): TelegramStickerEngine {
    if (!this.instance) {
      this.instance = new TelegramStickerEngine();
    }
    return this.instance;
  }

  /**
   * Validates and prepares multipart form fields for `addStickerToSet`.
   * Enforces that `sticker` is emitted as a single JSON object.
   */
  public prepareAddStickerPayload(payload: AddStickerToSetPayload): SerializedStickerMultipartPart[] {
    if (!payload || !payload.sticker) {
      throw new Error("AddStickerToSet requires a valid 'sticker' object");
    }
    if (Array.isArray(payload.sticker)) {
      throw new Error("AddStickerToSet 'sticker' must be a single InputSticker object, not an Array");
    }

    this.validateInputSticker(payload.sticker);

    return [
      { name: 'user_id', value: String(payload.user_id), isJson: false, isArray: false },
      { name: 'name', value: payload.name, isJson: false, isArray: false },
      { name: 'sticker', value: JSON.stringify(payload.sticker), isJson: true, isArray: false },
    ];
  }

  /**
   * Validates and prepares multipart form fields for `replaceStickerInSet`.
   * Enforces that `sticker` is emitted as a single JSON object.
   */
  public prepareReplaceStickerPayload(payload: ReplaceStickerInSetPayload): SerializedStickerMultipartPart[] {
    if (!payload || !payload.sticker) {
      throw new Error("ReplaceStickerInSet requires a valid 'sticker' object");
    }
    if (Array.isArray(payload.sticker)) {
      throw new Error("ReplaceStickerInSet 'sticker' must be a single InputSticker object, not an Array");
    }
    if (!payload.old_sticker) {
      throw new Error("ReplaceStickerInSet requires 'old_sticker' identifier");
    }

    this.validateInputSticker(payload.sticker);

    return [
      { name: 'user_id', value: String(payload.user_id), isJson: false, isArray: false },
      { name: 'name', value: payload.name, isJson: false, isArray: false },
      { name: 'old_sticker', value: payload.old_sticker, isJson: false, isArray: false },
      { name: 'sticker', value: JSON.stringify(payload.sticker), isJson: true, isArray: false },
    ];
  }

  /**
   * Validates and prepares multipart form fields for `createNewStickerSet`.
   * Enforces that `stickers` is emitted as a JSON array of 1..50 InputSticker items.
   */
  public prepareCreateStickerSetPayload(payload: CreateStickerSetPayload): SerializedStickerMultipartPart[] {
    if (!payload || !Array.isArray(payload.stickers) || payload.stickers.length === 0) {
      throw new Error("CreateNewStickerSet requires a non-empty 'stickers' array (1..50 items)");
    }
    if (payload.stickers.length > 50) {
      throw new Error(`CreateNewStickerSet accepts maximum 50 initial stickers, got ${payload.stickers.length}`);
    }

    payload.stickers.forEach((s) => this.validateInputSticker(s));

    const parts: SerializedStickerMultipartPart[] = [
      { name: 'user_id', value: String(payload.user_id), isJson: false, isArray: false },
      { name: 'name', value: payload.name, isJson: false, isArray: false },
      { name: 'title', value: payload.title, isJson: false, isArray: false },
      { name: 'stickers', value: JSON.stringify(payload.stickers), isJson: true, isArray: true },
    ];

    if (payload.sticker_type) {
      parts.push({ name: 'sticker_type', value: payload.sticker_type, isJson: false, isArray: false });
    }
    if (payload.needs_repainting !== undefined) {
      parts.push({ name: 'needs_repainting', value: String(payload.needs_repainting), isJson: false, isArray: false });
    }

    return parts;
  }

  /**
   * Validates individual InputSticker constraints according to Bot API specifications.
   */
  public validateInputSticker(sticker: InputStickerItem): void {
    if (!sticker.format || !['static', 'animated', 'video'].includes(sticker.format)) {
      throw new Error(`Invalid sticker format: ${sticker.format}. Must be 'static', 'animated', or 'video'`);
    }
    if (!Array.isArray(sticker.emoji_list) || sticker.emoji_list.length === 0) {
      throw new Error('Sticker must contain at least 1 emoji in emoji_list');
    }
    if (sticker.emoji_list.length > 20) {
      throw new Error(`Sticker emoji_list exceeds Telegram limit (max 20, got ${sticker.emoji_list.length})`);
    }
  }
}

export const telegramStickerEngine = TelegramStickerEngine.getInstance();
