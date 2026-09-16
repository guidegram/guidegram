/**
 * Telegram deep link and web link parsing utilities
 */

export interface ParsedTelegramLink {
  isTelegram: boolean
  type?: 'peer' | 'private_channel' | 'invite' | 'proxy' | 'other'
  target?: string // Username (e.g. 'durov') or Channel Peer ID (e.g. '-1001234567890')
  messageId?: number
  inviteHash?: string
  rawUrl: string
}

const RESERVED_PATHS = new Set([
  'share',
  'addstickers',
  'addemoji',
  'addtheme',
  'setlanguage',
  'invoice',
  'iv',
  'socks',
  'proxy',
  'login',
  'm',
  'boost',
])

export function parseTelegramUrl(rawUrl: string): ParsedTelegramLink {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isTelegram: false, rawUrl: '' }
  }

  let url = rawUrl.trim()
  // Strip trailing punctuation often attached from sentence ends
  url = url.replace(/([.,!?;:)>\]]+)$/, '')

  // 1. tg:// deep links
  if (url.startsWith('tg://')) {
    try {
      const parseable = url.replace('tg://', 'https://tg.internal/')
      const tgUrl = new URL(parseable)
      const host = tgUrl.pathname.replace(/^\/+/, '').split('/')[0] || ''
      const params = tgUrl.searchParams

      if (host === 'resolve') {
        const domain = params.get('domain')
        const post = params.get('post')
        if (domain) {
          return {
            isTelegram: true,
            type: 'peer',
            target: domain.replace(/^@/, ''),
            messageId: post ? parseInt(post, 10) : undefined,
            rawUrl,
          }
        }
      } else if (host === 'join') {
        const invite = params.get('invite')
        if (invite) {
          return {
            isTelegram: true,
            type: 'invite',
            inviteHash: invite,
            rawUrl,
          }
        }
      } else if (host === 'proxy' || host === 'socks') {
        return {
          isTelegram: true,
          type: 'proxy',
          rawUrl,
        }
      }
    } catch {
      // Fallback regex for tg:// URLs
      const tgResolveMatch = url.match(/^tg:\/\/resolve\?(?:.*&)?domain=([a-zA-Z0-9_]+)(?:.*&post=([0-9]+))?/)
      if (tgResolveMatch) {
        return {
          isTelegram: true,
          type: 'peer',
          target: tgResolveMatch[1],
          messageId: tgResolveMatch[2] ? parseInt(tgResolveMatch[2], 10) : undefined,
          rawUrl,
        }
      }
      const tgJoinMatch = url.match(/^tg:\/\/join\?(?:.*&)?invite=([a-zA-Z0-9_-]+)/)
      if (tgJoinMatch) {
        return {
          isTelegram: true,
          type: 'invite',
          inviteHash: tgJoinMatch[1],
          rawUrl,
        }
      }
    }
    return { isTelegram: true, type: 'other', rawUrl }
  }

  // 2. Web links: t.me, telegram.me, telegram.dog
  const tgDomainMatch = url.match(/^(?:https?:\/\/)?(?:www\.)?(t\.me|telegram\.me|telegram\.dog)\/(.+)$/i)
  if (!tgDomainMatch) {
    return { isTelegram: false, rawUrl }
  }

  const pathAndQuery = tgDomainMatch[2]
  const path = pathAndQuery.split('?')[0].replace(/^\/+|\/+$/g, '')
  const segments = path.split('/')

  // A. Private channel link: t.me/c/1234567890/123
  if (segments[0] === 'c' && segments[1]) {
    const rawChanId = segments[1]
    const msgId = segments[2] ? parseInt(segments[2], 10) : undefined
    return {
      isTelegram: true,
      type: 'private_channel',
      target: `-100${rawChanId.replace(/^-100/, '')}`,
      messageId: msgId && !isNaN(msgId) ? msgId : undefined,
      rawUrl,
    }
  }

  // B. Invite links: t.me/+hash or t.me/joinchat/hash
  if (segments[0].startsWith('+')) {
    return {
      isTelegram: true,
      type: 'invite',
      inviteHash: segments[0].slice(1),
      rawUrl,
    }
  }
  if (segments[0] === 'joinchat' && segments[1]) {
    return {
      isTelegram: true,
      type: 'invite',
      inviteHash: segments[1],
      rawUrl,
    }
  }

  // C. Preview link: t.me/s/username/123
  if (segments[0] === 's' && segments[1]) {
    const username = segments[1]
    const msgId = segments[2] ? parseInt(segments[2], 10) : undefined
    return {
      isTelegram: true,
      type: 'peer',
      target: username,
      messageId: msgId && !isNaN(msgId) ? msgId : undefined,
      rawUrl,
    }
  }

  // D. Reserved paths on t.me
  if (RESERVED_PATHS.has(segments[0].toLowerCase())) {
    return { isTelegram: true, type: 'other', rawUrl }
  }

  // E. Standard username: t.me/username or t.me/username/123
  if (segments[0] && /^[a-zA-Z0-9_]{3,32}$/.test(segments[0])) {
    const username = segments[0]
    const msgId = segments[1] ? parseInt(segments[1], 10) : undefined
    return {
      isTelegram: true,
      type: 'peer',
      target: username,
      messageId: msgId && !isNaN(msgId) ? msgId : undefined,
      rawUrl,
    }
  }

  return { isTelegram: true, type: 'other', rawUrl }
}
