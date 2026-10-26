/**
 * Utilities for BiDi / RTL text detection, file size and duration formatting
 */

/**
 * Checks if a string contains Persian, Arabic or RTL scripts
 */
export function isRTL(text?: string | null): boolean {
  if (!text) return false
  // Trim leading non-letter symbols, punctuation, emojis, numbers
  const cleaned = text.trim().replace(/^[\s\d\p{P}\p{S}]+/u, '')
  if (!cleaned) {
    // Check raw text for Arabic/Persian/Hebrew range
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
  }
  const firstCode = cleaned.codePointAt(0) || 0
  // Arabic / Persian Unicode blocks: 0x0600 - 0x08FF, Hebrew: 0x0590 - 0x05FF, Presentation Forms: 0xFB50 - 0xFDFF, 0xFE70 - 0xFEFF
  if (
    (firstCode >= 0x0600 && firstCode <= 0x08ff) ||
    (firstCode >= 0x0590 && firstCode <= 0x05ff) ||
    (firstCode >= 0xfb50 && firstCode <= 0xfdff) ||
    (firstCode >= 0xfe70 && firstCode <= 0xfeff)
  ) {
    return true
  }

  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(cleaned)
}

/**
 * Format bytes into human-readable string (KB, MB, GB)
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)
  return `${size} ${units[i] || 'MB'}`
}

/**
 * Format seconds into mm:ss or hh:mm:ss
 */
export function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00'
  const secs = Math.floor(seconds)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60

  const mStr = m.toString().padStart(2, '0')
  const sStr = s.toString().padStart(2, '0')

  if (h > 0) {
    return `${h}:${mStr}:${sStr}`
  }
  return `${mStr}:${sStr}`
}

/**
 * Format subscriber or member count (e.g. 15400 -> 15.4K)
 */
export function formatNumber(num?: number): string {
  if (!num || isNaN(num)) return '0'
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return num.toLocaleString()
}

export interface FormattedPresence {
  text: string
  isOnline: boolean
}

/**
 * Format user presence status (online, last seen recently, today at, etc.)
 */
export function formatUserStatus(
  statusInfo?: { status: string; lastOnline?: number; nextOffline?: number; byMe?: boolean } | null,
  t?: (key: string, params?: any) => string,
  options?: { isBot?: boolean; isGroup?: boolean; isChannel?: boolean }
): FormattedPresence {
  const translate = t || ((k: string, p?: any) => k)

  if (options?.isBot) {
    return { text: translate('info.bot') || 'Bot', isOnline: false }
  }
  if (options?.isChannel) {
    return { text: translate('info.broadcast_channel') || 'Broadcast Channel', isOnline: false }
  }
  if (options?.isGroup) {
    return { text: translate('info.group_chat') || 'Group Chat', isOnline: false }
  }

  if (!statusInfo || !statusInfo.status || statusInfo.status === 'long_time_ago') {
    return { text: translate('chat.status_long_time_ago') || 'last seen a long time ago', isOnline: false }
  }

  if (statusInfo.status === 'online') {
    if (statusInfo.nextOffline && statusInfo.nextOffline < Date.now()) {
      return { text: translate('chat.status_recently') || 'last seen recently', isOnline: false }
    }
    return { text: translate('chat.online') || 'online', isOnline: true }
  }

  if (statusInfo.status === 'recently') {
    return { text: translate('chat.status_recently') || 'last seen recently', isOnline: false }
  }

  if (statusInfo.status === 'within_week') {
    return { text: translate('chat.status_within_week') || 'last seen within a week', isOnline: false }
  }

  if (statusInfo.status === 'within_month') {
    return { text: translate('chat.status_within_month') || 'last seen within a month', isOnline: false }
  }

  if (statusInfo.status === 'offline' && statusInfo.lastOnline) {
    const d = new Date(statusInfo.lastOnline)
    const now = new Date()
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    const timeStr = `${hours}:${minutes}`

    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()

    if (isToday) {
      return {
        text: translate('chat.status_today_at', { time: timeStr }) || `last seen today at ${timeStr}`,
        isOnline: false,
      }
    }

    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear()

    if (isYesterday) {
      return {
        text: translate('chat.status_yesterday_at', { time: timeStr }) || `last seen yesterday at ${timeStr}`,
        isOnline: false,
      }
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const dateStr = `${d.getDate()} ${months[d.getMonth()]}`
    return {
      text: translate('chat.status_date_at', { date: dateStr, time: timeStr }) || `last seen ${dateStr} at ${timeStr}`,
      isOnline: false,
    }
  }

  return { text: translate('chat.status_recently') || 'last seen recently', isOnline: false }
}
