/**
 * Guidegram Network Proxy, Deep-Link Protocol & Session Security Governor
 * 
 * Hardened against:
 * - tdesktop #4577 & #17409: HTTP/HTTPS CONNECT proxy tunneling with authentication
 * - tdesktop #16478: Opening t.me and tg:// deep links failing on KDE/Linux desktop
 * - tdesktop #31276: Cloned session token detection across different hardware instances
 * - kotatogram #17: Filtering messages from blocked users in group chat timelines
 * - kotatogram #161: Bookmarking messages with local searchable tags
 */

export interface HttpProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  useTls: boolean;
}

export interface DeepLinkTarget {
  type: 'resolve' | 'join_chat' | 'share_url' | 'unknown';
  domain?: string;
  postId?: number;
  inviteHash?: string;
  rawUrl: string;
}

export interface BookmarkedMessage {
  messageId: number;
  chatId: number;
  text: string;
  tags: string[];
  bookmarkedAtTimestamp: number;
}

export class NetworkProxyAndSecurityGovernor {
  private static bookmarkStore: Map<number, BookmarkedMessage> = new Map();

  /**
   * Formats an RFC 7231 HTTP CONNECT proxy handshake request with optional Proxy-Authorization (tdesktop #4577, #17409).
   */
  public static formatProxyConnectPayload(
    targetHost: string,
    targetPort: number,
    config: HttpProxyConfig
  ): { connectHeaderString: string; isAuthRequired: boolean } {
    const lines: string[] = [
      `CONNECT ${targetHost}:${targetPort} HTTP/1.1`,
      `Host: ${targetHost}:${targetPort}`,
      'Proxy-Connection: Keep-Alive',
      'User-Agent: Guidegram-Desktop'
    ];

    let isAuthRequired = false;
    if (config.username && config.password) {
      isAuthRequired = true;
      const credentials = `${config.username}:${config.password}`;
      // Base64 encoding in cross-platform manner
      const encoded = Buffer.from(credentials).toString('base64');
      lines.push(`Proxy-Authorization: Basic ${encoded}`);
    }

    lines.push('', ''); // Terminating CRLF

    return {
      connectHeaderString: lines.join('\r\n'),
      isAuthRequired
    };
  }

  /**
   * Evaluates HTTP CONNECT status response line (e.g. "HTTP/1.1 200 Connection established").
   */
  public static parseProxyConnectResponse(statusLine: string): { success: boolean; statusCode: number; error?: string } {
    const parts = statusLine.trim().split(/\s+/);
    if (parts.length < 2) {
      return { success: false, statusCode: 0, error: 'Malformed proxy response' };
    }

    const statusCode = parseInt(parts[1], 10);
    if (statusCode === 200) {
      return { success: true, statusCode: 200 };
    }

    if (statusCode === 407) {
      return { success: false, statusCode: 407, error: 'Proxy authentication required' };
    }

    return { success: false, statusCode, error: `Proxy returned HTTP ${statusCode}` };
  }

  /**
   * Robust parser for tg:// and https://t.me/ deep-links on Linux/KDE/Windows (tdesktop #16478).
   */
  public static parseDeepLink(urlStr: string): DeepLinkTarget {
    const cleanUrl = urlStr.trim();

    // Protocol: tg://resolve?domain=username&post=123
    if (cleanUrl.startsWith('tg://')) {
      try {
        const parsed = new URL(cleanUrl);
        if (parsed.hostname === 'resolve') {
          const domain = parsed.searchParams.get('domain') || undefined;
          const postStr = parsed.searchParams.get('post');
          const postId = postStr ? parseInt(postStr, 10) : undefined;
          return { type: 'resolve', domain, postId, rawUrl: cleanUrl };
        }
        if (parsed.hostname === 'join') {
          const inviteHash = parsed.searchParams.get('invite') || undefined;
          return { type: 'join_chat', inviteHash, rawUrl: cleanUrl };
        }
      } catch {
        // Fallback manual regex
      }
    }

    // Web URL: https://t.me/username/123 or https://t.me/+inviteHash
    const webMatch = cleanUrl.match(/^https?:\/\/(?:www\.)?t\.me\/(\+?[a-zA-Z0-9_]+)(?:\/(\d+))?/i);
    if (webMatch) {
      const segment = webMatch[1];
      const postStr = webMatch[2];
      const postId = postStr ? parseInt(postStr, 10) : undefined;

      if (segment.startsWith('+')) {
        return { type: 'join_chat', inviteHash: segment.slice(1), rawUrl: cleanUrl };
      }

      return { type: 'resolve', domain: segment, postId, rawUrl: cleanUrl };
    }

    return { type: 'unknown', rawUrl: cleanUrl };
  }

  /**
   * Generates hardware device fingerprint to detect unauthorized cloned session tokens (tdesktop #31276).
   */
  public static computeDeviceFingerprint(machineId: string, osUsername: string): string {
    const raw = `${machineId}::${osUsername}::guidegram`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return `fp_${Math.abs(hash).toString(16)}`;
  }

  public static isSessionCloned(storedFingerprint: string, currentFingerprint: string): boolean {
    return storedFingerprint !== currentFingerprint;
  }

  /**
   * Filters out messages from blocked user IDs in group chat streams (kotatogram #17).
   */
  public static filterBlockedMessages<T extends { senderUserId: number }>(
    messages: T[],
    blockedUserIds: Set<number>
  ): { visibleMessages: T[]; filteredCount: number } {
    const visibleMessages = messages.filter(m => !blockedUserIds.has(m.senderUserId));
    return {
      visibleMessages,
      filteredCount: messages.length - visibleMessages.length
    };
  }

  /**
   * Bookmarks a message with custom searchable tags (kotatogram #161).
   */
  public static addBookmark(
    messageId: number,
    chatId: number,
    text: string,
    tags: string[] = []
  ): BookmarkedMessage {
    const normalizedTags = tags.map(t => (t.startsWith('#') ? t.toLowerCase() : `#${t.toLowerCase()}`));
    const bookmark: BookmarkedMessage = {
      messageId,
      chatId,
      text,
      tags: normalizedTags,
      bookmarkedAtTimestamp: Date.now()
    };

    this.bookmarkStore.set(messageId, bookmark);
    return bookmark;
  }

  public static searchBookmarksByTag(tag: string): BookmarkedMessage[] {
    const query = tag.startsWith('#') ? tag.toLowerCase() : `#${tag.toLowerCase()}`;
    return Array.from(this.bookmarkStore.values()).filter(b => b.tags.includes(query));
  }
}
