/**
 * TDLib WASM WebSocket Transport, VoIP State Machine, HTTP Proxy, Bot Start Tokens,
 * Content Diffs & Avatar Resolution Governor
 *
 * Hardens Guidegram against:
 * 1. tdlib/td#621 - WASM WebSocket MTProto binary transport & DC connection fallback
 * 2. tdlib/td#541 - Profile photo small/big resolution & deterministic initials fallback
 * 3. tdlib/td#176 - HTTP CONNECT proxy with Basic Authentication support
 * 4. tdlib/td#168 - Chat history boundary slicing & top/bottom end-of-chat detection
 * 5. tdlib/td#82 - 1-on-1 VoIP call state machine & 4-emoji verification fingerprinting
 * 6. tdlib/td#2297 - UpdateMessageContent reactive diffing & edit state updates
 * 7. tdlib/td#1298 - Bot /start deep link parameter validation & sendBotStartMessage builder
 */

export interface WasmWebSocketConfig {
  primaryUrl: string;
  fallbackUrls: string[];
  protocols: string[];
  binaryType: 'arraybuffer';
  connectTimeoutMs: number;
}

export interface ProfilePhotoFile {
  id: number;
  local?: {
    path?: string;
    is_downloading_completed?: boolean;
  };
}

export interface ProfilePhotoData {
  small?: ProfilePhotoFile;
  big?: ProfilePhotoFile;
}

export interface ResolvedAvatar {
  hasPhoto: boolean;
  localPath: string | null;
  needsDownload: boolean;
  fileIdToDownload: number | null;
  fallbackInitials: string;
}

export interface HttpProxyPayload {
  '@type': 'addProxy';
  server: string;
  port: number;
  enable: boolean;
  type: {
    '@type': 'proxyTypeHttp';
    username: string;
    password: string;
    http_only: boolean;
  };
}

export interface ChatHistorySliceResult<T> {
  messages: T[];
  count: number;
  isBoundaryReached: boolean;
  direction: 'older' | 'newer';
}

export type VoipCallState =
  | 'callStatePending'
  | 'callStateExchangingKeys'
  | 'callStateReady'
  | 'callStateHangingUp'
  | 'callStateDiscarded';

export interface VoipCallSession {
  callId: number;
  userId: number;
  isOutgoing: boolean;
  state: VoipCallState;
  keyFingerprintEmojis: string[];
  discardReason?: 'missed' | 'declined' | 'disconnected' | 'hung_up';
}

export interface BotStartDeepLink {
  isValid: boolean;
  botUsername: string | null;
  startParameter: string | null;
  rawUrl: string;
  error?: string;
}

export class TdlibVoipWasmProxyAndBotStartGovernor {
  private activeVoipSession: VoipCallSession | null = null;

  // =========================================================================
  // 1. WASM WebSocket MTProto Transport (tdlib/td#621)
  // =========================================================================

  public getWasmWebSocketConfig(dcId: number = 2): WasmWebSocketConfig {
    const dcDomains: Record<number, string> = {
      1: 'pluto.web.telegram.org',
      2: 'venus.web.telegram.org',
      3: 'aurora.web.telegram.org',
      4: 'vesta.web.telegram.org',
      5: 'flora.web.telegram.org',
    };

    const primaryHost = dcDomains[dcId] || 'venus.web.telegram.org';
    const primaryUrl = `wss://${primaryHost}/apiws`;

    const fallbackUrls = Object.values(dcDomains)
      .filter((h) => h !== primaryHost)
      .map((h) => `wss://${h}/apiws`);

    return {
      primaryUrl,
      fallbackUrls,
      protocols: ['binary'],
      binaryType: 'arraybuffer',
      connectTimeoutMs: 10000,
    };
  }

  // =========================================================================
  // 2. Profile Photo Small/Big Resolution & Fallback (tdlib/td#541)
  // =========================================================================

  public resolveProfilePhoto(
    photo: ProfilePhotoData | undefined | null,
    userName: string,
    preferBig: boolean = false
  ): ResolvedAvatar {
    const initials = (userName.trim()[0] || 'U').toUpperCase();

    if (!photo) {
      return {
        hasPhoto: false,
        localPath: null,
        needsDownload: false,
        fileIdToDownload: null,
        fallbackInitials: initials,
      };
    }

    const targetFile = preferBig && photo.big ? photo.big : (photo.small || photo.big);

    if (targetFile) {
      if (targetFile.local && targetFile.local.is_downloading_completed && targetFile.local.path) {
        return {
          hasPhoto: true,
          localPath: targetFile.local.path,
          needsDownload: false,
          fileIdToDownload: null,
          fallbackInitials: initials,
        };
      }

      return {
        hasPhoto: true,
        localPath: null,
        needsDownload: true,
        fileIdToDownload: targetFile.id,
        fallbackInitials: initials,
      };
    }

    return {
      hasPhoto: false,
      localPath: null,
      needsDownload: false,
      fileIdToDownload: null,
      fallbackInitials: initials,
    };
  }

  // =========================================================================
  // 3. HTTP CONNECT Proxy with Basic Authentication (tdlib/td#176)
  // =========================================================================

  public buildHttpProxyPayload(
    server: string,
    port: number,
    username: string = '',
    password: string = '',
    httpOnly: boolean = false
  ): HttpProxyPayload {
    if (!server || server.trim().length === 0) {
      throw new Error('Proxy server host cannot be empty');
    }

    if (port <= 0 || port > 65535) {
      throw new Error('Proxy port must be between 1 and 65535');
    }

    return {
      '@type': 'addProxy',
      server: server.trim(),
      port,
      enable: true,
      type: {
        '@type': 'proxyTypeHttp',
        username: username.trim(),
        password: password.trim(),
        http_only: httpOnly,
      },
    };
  }

  // =========================================================================
  // 4. Chat History Boundary Slicing (tdlib/td#168)
  // =========================================================================

  public reconcileChatHistorySlice<T>(
    requestedLimit: number,
    returnedMessages: T[],
    direction: 'older' | 'newer' = 'older'
  ): ChatHistorySliceResult<T> {
    // If returned messages count is less than requested limit, we hit the boundary (top or bottom of chat)
    const isBoundaryReached = returnedMessages.length < requestedLimit;

    return {
      messages: returnedMessages,
      count: returnedMessages.length,
      isBoundaryReached,
      direction,
    };
  }

  // =========================================================================
  // 5. VoIP 1-on-1 Call State Machine & 4-Emoji Verification (tdlib/td#82)
  // =========================================================================

  public initiateVoipCall(callId: number, userId: number, isOutgoing: boolean): VoipCallSession {
    this.activeVoipSession = {
      callId,
      userId,
      isOutgoing,
      state: 'callStatePending',
      keyFingerprintEmojis: [],
    };
    return { ...this.activeVoipSession };
  }

  public transitionVoipState(
    nextState: VoipCallState,
    authKeyBytes?: Uint8Array
  ): VoipCallSession {
    if (!this.activeVoipSession) {
      throw new Error('No active VoIP call session to transition');
    }

    this.activeVoipSession.state = nextState;

    if (nextState === 'callStateReady' && authKeyBytes) {
      this.activeVoipSession.keyFingerprintEmojis = this.generateEmojiFingerprint(authKeyBytes);
    }

    return { ...this.activeVoipSession };
  }

  public discardVoipCall(reason: 'missed' | 'declined' | 'disconnected' | 'hung_up'): VoipCallSession {
    if (!this.activeVoipSession) {
      throw new Error('No active VoIP call session to discard');
    }

    this.activeVoipSession.state = 'callStateDiscarded';
    this.activeVoipSession.discardReason = reason;

    const summary = { ...this.activeVoipSession };
    this.activeVoipSession = null;
    return summary;
  }

  public generateEmojiFingerprint(authKeyBytes: Uint8Array): string[] {
    const emojiTable = [
      '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓',
      '🍒', '🍑', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦',
      '🌽', '🥕', '🥔', '🍠', '🥐', '🍞', '🥖', '🥨',
      '🧀', '🥚', '🍳', '🥞', '🥓', '🥩', '🍗', '🍖',
    ];

    const emojis: string[] = [];
    for (let i = 0; i < 4; i++) {
      const byte = authKeyBytes[i % authKeyBytes.length] || 0;
      emojis.push(emojiTable[byte % emojiTable.length]);
    }

    return emojis;
  }

  // =========================================================================
  // 6. UpdateMessageContent Reactive Diffing (tdlib/td#2297)
  // =========================================================================

  public applyUpdateMessageContent<T extends { id: number; text: string; editDate?: number; isEdited?: boolean }>(
    existingMessage: T,
    newText: string,
    editDate: number = Math.floor(Date.now() / 1000)
  ): T {
    return {
      ...existingMessage,
      text: newText,
      editDate,
      isEdited: true,
    };
  }

  // =========================================================================
  // 7. Bot /start Deep Link Parameter Parser (tdlib/td#1298)
  // =========================================================================

  public parseBotStartDeepLink(rawUrl: string): BotStartDeepLink {
    const cleanUrl = rawUrl.trim();

    // 1. https://t.me/bot_name?start=parameter_123
    const tmeMatch = cleanUrl.match(/t\.me\/([a-zA-Z0-9_]{4,32})\?start=([a-zA-Z0-9_\-]+)/i);
    if (tmeMatch) {
      return {
        isValid: true,
        botUsername: tmeMatch[1],
        startParameter: tmeMatch[2],
        rawUrl: cleanUrl,
      };
    }

    // 2. tg://resolve?domain=bot_name&start=parameter_123
    const tgMatch = cleanUrl.match(/tg:\/\/resolve\?domain=([a-zA-Z0-9_]{4,32})&start=([a-zA-Z0-9_\-]+)/i);
    if (tgMatch) {
      return {
        isValid: true,
        botUsername: tgMatch[1],
        startParameter: tgMatch[2],
        rawUrl: cleanUrl,
      };
    }

    // 3. Simple bot link without start payload: https://t.me/bot_name
    const simpleMatch = cleanUrl.match(/t\.me\/([a-zA-Z0-9_]{4,32})$/i);
    if (simpleMatch) {
      return {
        isValid: true,
        botUsername: simpleMatch[1],
        startParameter: '',
        rawUrl: cleanUrl,
      };
    }

    return {
      isValid: false,
      botUsername: null,
      startParameter: null,
      rawUrl: cleanUrl,
      error: 'Invalid Telegram bot link format',
    };
  }

  public buildSendBotStartQuery(botUserId: number, chatId: number, parameter: string = '') {
    return {
      '@type': 'sendBotStartMessage',
      bot_user_id: botUserId,
      chat_id: chatId,
      parameter,
    };
  }
}
