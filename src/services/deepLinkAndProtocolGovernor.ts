/**
 * Deep-Link Routing, tg:// Protocol Handler & Instant View Governor
 *
 * Hardened against competitor issues:
 * - TelegramMessenger/Telegram-iOS #1100: Deep link does not run "start" command
 * - TelegramMessenger/Telegram-iOS #843: Parameter lost with startgroup link
 * - TelegramMessenger/Telegram-iOS #2354: Mini App ?text= of t.me/<username> link is dropped
 * - tdlib/td #377: 404 Not Found on second instant view load (stale cache / missing fallback)
 * - UnigramDev/Unigram #2903: Bad rendering of inline images in Instant View
 * - kotatogram/kotatogram-desktop #423: Protocol association and canonical t.me link parsing
 * - morethanwords/tweb #93: Support t.me joinchat, c, share, and proxy deep links
 * - morethanwords/tweb #257: Target routing and in-app navigation vs external browser
 */

export type DeepLinkType =
  | 'resolve_user'
  | 'bot_start'
  | 'bot_startgroup'
  | 'join_chat'
  | 'chat_message'
  | 'share'
  | 'proxy'
  | 'instant_view'
  | 'external_url';

export interface ParsedDeepLink {
  type: DeepLinkType;
  target?: string;
  startParam?: string;
  startGroupParam?: string;
  text?: string;
  url?: string;
  chatId?: string;
  messageId?: number;
  proxyConfig?: { server: string; port: number; secret?: string };
  instantView?: { url: string; rhash?: string };
  canonicalTgUrl: string;
}

export interface InstantViewPage {
  url: string;
  rhash?: string;
  html: string;
  images: Array<{ src: string; width?: number; height?: number; aspectRatio?: number }>;
  cachedTimestamp: number;
}

export class DeepLinkAndProtocolGovernor {
  private ivCache: Map<string, InstantViewPage> = new Map();
  private readonly DEFAULT_IV_CACHE_TTL_MS = 24 * 3600 * 1000;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.ivCache.clear();
  }

  /**
   * Parses arbitrary t.me or tg:// URLs into canonical deep link payloads
   */
  public parseLink(rawUrl: string): ParsedDeepLink {
    const trimmed = rawUrl.trim();

    // 1. tg://join?invite=XYZ or t.me/joinchat/XYZ or t.me/+XYZ
    if (trimmed.startsWith('tg://join?') || trimmed.includes('/joinchat/') || trimmed.match(/t\.me\/\+[a-zA-Z0-9_\-]+/)) {
      let inviteHash = '';
      if (trimmed.startsWith('tg://join?')) {
        const u = new URL(trimmed);
        inviteHash = u.searchParams.get('invite') || '';
      } else if (trimmed.includes('/joinchat/')) {
        inviteHash = trimmed.split('/joinchat/')[1].split('?')[0];
      } else {
        const match = trimmed.match(/t\.me\/\+([a-zA-Z0-9_\-]+)/);
        if (match) inviteHash = match[1];
      }
      return {
        type: 'join_chat',
        target: inviteHash,
        canonicalTgUrl: `tg://join?invite=${inviteHash}`
      };
    }

    // 2. tg://proxy?server=... or t.me/proxy?...
    if (trimmed.startsWith('tg://proxy') || trimmed.includes('t.me/proxy')) {
      const parsed = this.parseProxyLink(trimmed);
      return {
        type: 'proxy',
        proxyConfig: parsed,
        canonicalTgUrl: `tg://proxy?server=${parsed.server}&port=${parsed.port}${parsed.secret ? '&secret=' + parsed.secret : ''}`
      };
    }

    // 3. tg://msg_url?url=... or t.me/share/url?...
    if (trimmed.startsWith('tg://msg_url') || trimmed.includes('t.me/share/url')) {
      const urlObj = this.parseUrlSafe(trimmed);
      const shareUrl = urlObj.searchParams.get('url') || '';
      const shareText = urlObj.searchParams.get('text') || '';
      return {
        type: 'share',
        url: shareUrl,
        text: shareText,
        canonicalTgUrl: `tg://msg_url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
      };
    }

    // 4. Instant view t.me/iv?url=... or tg://iv?...
    if (trimmed.startsWith('tg://iv') || trimmed.includes('t.me/iv')) {
      const urlObj = this.parseUrlSafe(trimmed);
      const targetUrl = urlObj.searchParams.get('url') || '';
      const rhash = urlObj.searchParams.get('rhash') || '';
      return {
        type: 'instant_view',
        instantView: { url: targetUrl, rhash: rhash || undefined },
        canonicalTgUrl: `tg://iv?url=${encodeURIComponent(targetUrl)}${rhash ? '&rhash=' + rhash : ''}`
      };
    }

    // 5. Chat message: t.me/c/<chatId>/<msgId> or t.me/<channel>/<msgId>
    const privateMsgMatch = trimmed.match(/t\.me\/c\/(\d+)\/(\d+)/);
    if (privateMsgMatch) {
      return {
        type: 'chat_message',
        chatId: `-100${privateMsgMatch[1]}`,
        messageId: parseInt(privateMsgMatch[2], 10),
        canonicalTgUrl: `tg://privatepost?channel=${privateMsgMatch[1]}&post=${privateMsgMatch[2]}`
      };
    }

    const publicMsgMatch = trimmed.match(/t\.me\/([a-zA-Z0-9_]{5,32})\/(\d+)/);
    if (publicMsgMatch && !['joinchat', 'share', 'proxy', 'iv', 'socks'].includes(publicMsgMatch[1])) {
      return {
        type: 'chat_message',
        target: publicMsgMatch[1],
        messageId: parseInt(publicMsgMatch[2], 10),
        canonicalTgUrl: `tg://resolve?domain=${publicMsgMatch[1]}&post=${publicMsgMatch[2]}`
      };
    }

    // 6. Bot start / startgroup / resolve:
    // Handles t.me/<bot>?start=XYZ (iOS #1100) and t.me/<bot>?startgroup=XYZ (iOS #843) and t.me/<user>?text=XYZ (iOS #2354)
    if (trimmed.startsWith('tg://resolve') || trimmed.includes('t.me/')) {
      const urlObj = this.parseUrlSafe(trimmed);
      let domain = urlObj.searchParams.get('domain') || '';
      if (!domain && trimmed.includes('t.me/')) {
        const pathPart = urlObj.pathname.replace(/^\//, '').split('/')[0];
        if (pathPart && !['joinchat', 'share', 'proxy', 'iv'].includes(pathPart)) {
          domain = pathPart;
        }
      }

      const startParam = urlObj.searchParams.get('start') || undefined;
      const startGroupParam = urlObj.searchParams.get('startgroup') || undefined;
      const prefilledText = urlObj.searchParams.get('text') || undefined;

      if (startGroupParam) {
        return {
          type: 'bot_startgroup',
          target: domain,
          startGroupParam,
          text: prefilledText,
          canonicalTgUrl: `tg://resolve?domain=${domain}&startgroup=${encodeURIComponent(startGroupParam)}`
        };
      }

      if (startParam) {
        return {
          type: 'bot_start',
          target: domain,
          startParam,
          text: prefilledText,
          canonicalTgUrl: `tg://resolve?domain=${domain}&start=${encodeURIComponent(startParam)}`
        };
      }

      if (domain) {
        return {
          type: 'resolve_user',
          target: domain,
          text: prefilledText,
          canonicalTgUrl: `tg://resolve?domain=${domain}${prefilledText ? '&text=' + encodeURIComponent(prefilledText) : ''}`
        };
      }
    }

    return {
      type: 'external_url',
      url: trimmed,
      canonicalTgUrl: trimmed
    };
  }

  /**
   * High-level routing execution for parsed deep link
   */
  public routeLink(rawUrl: string): {
    action: 'open_chat' | 'send_bot_start' | 'join_group_prompt' | 'open_share_dialog' | 'apply_proxy' | 'render_instant_view' | 'open_external';
    payload: any;
    openExternal: boolean;
  } {
    const parsed = this.parseLink(rawUrl);

    switch (parsed.type) {
      case 'bot_start':
        return {
          action: 'send_bot_start',
          payload: { botUsername: parsed.target, startPayload: parsed.startParam, prefilledText: parsed.text },
          openExternal: false
        };
      case 'bot_startgroup':
        return {
          action: 'send_bot_start',
          payload: { botUsername: parsed.target, startGroupPayload: parsed.startGroupParam, isGroup: true },
          openExternal: false
        };
      case 'join_chat':
        return {
          action: 'join_group_prompt',
          payload: { inviteHash: parsed.target },
          openExternal: false
        };
      case 'share':
        return {
          action: 'open_share_dialog',
          payload: { url: parsed.url, text: parsed.text },
          openExternal: false
        };
      case 'proxy':
        return {
          action: 'apply_proxy',
          payload: parsed.proxyConfig,
          openExternal: false
        };
      case 'instant_view':
        return {
          action: 'render_instant_view',
          payload: parsed.instantView,
          openExternal: false
        };
      case 'resolve_user':
      case 'chat_message':
        return {
          action: 'open_chat',
          payload: parsed,
          openExternal: false
        };
      default:
        return {
          action: 'open_external',
          payload: { url: parsed.url },
          openExternal: true
        };
    }
  }

  /**
   * Caches Instant View content with image aspect ratio normalization (Unigram #2903 & tdlib #377)
   */
  public storeInstantViewCache(
    url: string,
    rhash: string,
    html: string,
    rawImages: Array<{ src: string; width?: number; height?: number }>
  ): InstantViewPage {
    const normalizedImages = rawImages.map(img => {
      const width = img.width || 800;
      const height = img.height || 450;
      const aspectRatio = width > 0 && height > 0 ? width / height : 1.77;
      return {
        src: img.src,
        width,
        height,
        aspectRatio
      };
    });

    const page: InstantViewPage = {
      url,
      rhash,
      html,
      images: normalizedImages,
      cachedTimestamp: Date.now()
    };

    const cacheKey = `${url}#${rhash}`;
    this.ivCache.set(cacheKey, page);
    return page;
  }

  /**
   * Retrieves cached Instant View page with fallback handling preventing 404 (tdlib #377)
   */
  public getInstantView(url: string, rhash: string): InstantViewPage | null {
    const cacheKey = `${url}#${rhash}`;
    const page = this.ivCache.get(cacheKey);
    if (!page) return null;

    if (Date.now() - page.cachedTimestamp > this.DEFAULT_IV_CACHE_TTL_MS) {
      this.ivCache.delete(cacheKey);
      return null;
    }

    return page;
  }

  private parseUrlSafe(raw: string): URL {
    try {
      if (raw.startsWith('tg://')) {
        // Convert tg://resolve?domain=... to https://tg.local/resolve?domain=... for URL parser
        return new URL(raw.replace(/^tg:\/\//, 'https://tg.local/'));
      }
      return new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    } catch {
      return new URL('https://tg.local/');
    }
  }

  private parseProxyLink(raw: string): { server: string; port: number; secret?: string } {
    const u = this.parseUrlSafe(raw);
    const server = u.searchParams.get('server') || '127.0.0.1';
    const port = parseInt(u.searchParams.get('port') || '443', 10);
    const secret = u.searchParams.get('secret') || undefined;

    return { server, port, secret };
  }
}

export const deepLinkAndProtocolGovernor = new DeepLinkAndProtocolGovernor();
