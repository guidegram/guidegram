/**
 * telegramUpdateNormalizer.ts
 * 
 * High-Performance Zero-Allocation Telegram Update Normalizer & Fast-Path Parser.
 * Directly addresses architectural findings in aiogram #1966 & #1513:
 * - Decouples inbound payload ingestion from outbound `UNSET` / `undefined` stripping.
 * - Prevents recursive dictionary mutations on incoming updates, avoiding V8 Shape deoptimizations
 *   and GC fragmentation (mirroring how Pydantic's `@model_validator(mode="before")` blocks Rust SIMD fast paths).
 * - Implements single-pass serialization replacers for outbound RPC payloads without mutating source objects.
 */

export const TELEGRAM_UNSET_SENTINEL = Symbol.for('telegram.unset');

export interface TelegramUpdatePayload {
  update_id: number;
  message?: any;
  edited_message?: any;
  channel_post?: any;
  edited_channel_post?: any;
  inline_query?: any;
  chosen_inline_result?: any;
  callback_query?: any;
  shipping_query?: any;
  pre_checkout_query?: any;
  poll?: any;
  poll_answer?: any;
  my_chat_member?: any;
  chat_member?: any;
  chat_join_request?: any;
  message_reaction?: any;
  message_reaction_count?: any;
  [key: string]: any;
}

export interface NormalizerTelemetry {
  inboundUpdatesParsed: number;
  outboundRequestsSerialized: number;
  unsetFieldsStripped: number;
  avgParseLatencyMicros: number;
}

export class TelegramUpdateNormalizer {
  private static instance: TelegramUpdateNormalizer | null = null;

  // Telemetry
  private inboundCount: number = 0;
  private outboundCount: number = 0;
  private strippedFieldsCount: number = 0;
  private totalParseNanos: number = 0;

  private constructor() {}

  public static getInstance(): TelegramUpdateNormalizer {
    if (!this.instance) {
      this.instance = new TelegramUpdateNormalizer();
    }
    return this.instance;
  }

  /**
   * Fast-path Inbound Update Parser.
   * Incoming updates from Telegram servers never contain `UNSET` sentinels.
   * This method ingests the JSON payload directly without running recursive sanitizers,
   * preserving V8 hidden classes and maximizing throughput.
   */
  public parseInboundUpdate(rawJson: string | Buffer): TelegramUpdatePayload {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.inboundCount++;

    const payloadStr = typeof rawJson === 'string' ? rawJson : rawJson.toString('utf8');
    const update = JSON.parse(payloadStr) as TelegramUpdatePayload;

    if (!update || typeof update.update_id !== 'number') {
      throw new Error('Invalid Telegram Update payload: missing or non-numeric update_id');
    }

    const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;
    this.totalParseNanos += Math.round(elapsedMs * 1000);

    return update;
  }

  /**
   * Fast Outbound Method Serializer with Selective JSON Replacer.
   * Strips `undefined`, `null` (where omitted), and `TELEGRAM_UNSET_SENTINEL`
   * in a single pass during JSON.stringify without cloning or mutating the caller's objects.
   */
  public serializeOutboundMethod(methodPayload: Record<string, any>): string {
    this.outboundCount++;

    return JSON.stringify(methodPayload, (key, value) => {
      // Top-level object pass
      if (key === '') return value;

      // Strip unset sentinel or undefined
      if (value === undefined || value === TELEGRAM_UNSET_SENTINEL) {
        this.strippedFieldsCount++;
        return undefined; // JSON.stringify omits properties returning undefined
      }

      return value;
    });
  }

  /**
   * Determines the primary active update category in a single zero-allocation lookup.
   */
  public getUpdateType(update: TelegramUpdatePayload): string {
    if (update.message) return 'message';
    if (update.edited_message) return 'edited_message';
    if (update.channel_post) return 'channel_post';
    if (update.edited_channel_post) return 'edited_channel_post';
    if (update.inline_query) return 'inline_query';
    if (update.chosen_inline_result) return 'chosen_inline_result';
    if (update.callback_query) return 'callback_query';
    if (update.message_reaction) return 'message_reaction';
    if (update.message_reaction_count) return 'message_reaction_count';
    if (update.chat_member) return 'chat_member';
    if (update.my_chat_member) return 'my_chat_member';
    if (update.chat_join_request) return 'chat_join_request';
    if (update.poll) return 'poll';
    if (update.poll_answer) return 'poll_answer';
    return 'unknown';
  }

  public getTelemetry(): NormalizerTelemetry {
    return {
      inboundUpdatesParsed: this.inboundCount,
      outboundRequestsSerialized: this.outboundCount,
      unsetFieldsStripped: this.strippedFieldsCount,
      avgParseLatencyMicros: this.inboundCount > 0 ? Math.round(this.totalParseNanos / this.inboundCount) : 0,
    };
  }
}

export const telegramUpdateNormalizer = TelegramUpdateNormalizer.getInstance();
