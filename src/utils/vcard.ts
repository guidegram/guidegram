/**
 * RFC 6350 vCard 4.0 Generation, Parsing & File Export Utility
 * Handles standard Telegram contact card formats, contact URLs, and phone numbers.
 */

export interface ContactCardPayload {
  firstName: string
  lastName?: string
  phone?: string
  username?: string
  note?: string
  org?: string
  email?: string
}

export interface ParsedContactCard {
  firstName: string
  lastName?: string
  fullName: string
  phone?: string
  username?: string
  note?: string
  org?: string
  email?: string
}

/**
 * Escapes text according to RFC 6350 vCard specification
 */
function escapeVCardText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Unescapes RFC 6350 vCard text
 */
function unescapeVCardText(text: string): string {
  return text
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

/**
 * Generates an RFC 6350 vCard 4.0 standard string
 */
export function generateVCard(contact: ContactCardPayload): string {
  const firstName = (contact.firstName || '').trim()
  const lastName = (contact.lastName || '').trim()
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Telegram Contact'

  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:4.0',
    'PRODID:-//Guidegram//Telegram Client v2.1//EN',
    `FN:${escapeVCardText(fullName)}`,
    `N:${escapeVCardText(lastName)};${escapeVCardText(firstName)};;;`,
  ]

  if (contact.phone) {
    const cleanPhone = contact.phone.replace(/[^0-9+]/g, '')
    lines.push(`TEL;TYPE=CELL,VOICE:${cleanPhone}`)
  }

  if (contact.username) {
    const cleanUser = contact.username.replace(/^@/, '').trim()
    lines.push(`URL;TYPE=TELEGRAM:https://t.me/${cleanUser}`)
  }

  if (contact.org) {
    lines.push(`ORG:${escapeVCardText(contact.org)}`)
  }

  if (contact.email) {
    lines.push(`EMAIL;TYPE=INTERNET:${contact.email.trim()}`)
  }

  if (contact.note) {
    lines.push(`NOTE:${escapeVCardText(contact.note)}`)
  }

  lines.push('END:VCARD')
  return lines.join('\r\n') + '\r\n'
}

/**
 * Parses a standard vCard string (vCard 2.1, 3.0, or 4.0)
 */
export function parseVCard(vcardStr: string): ParsedContactCard {
  if (!vcardStr || typeof vcardStr !== 'string') {
    return { firstName: '', fullName: '' }
  }

  // Unfold folded lines (RFC 6350 3.2: lines starting with space or tab continue previous line)
  const unfolded = vcardStr.replace(/\r?\n[ \t]/g, '')
  const rawLines = unfolded.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  let firstName = ''
  let lastName = ''
  let fullName = ''
  let phone = ''
  let username = ''
  let note = ''
  let org = ''
  let email = ''

  for (const line of rawLines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue

    const propHeader = line.slice(0, colonIdx).toUpperCase()
    const rawVal = line.slice(colonIdx + 1)
    const propName = propHeader.split(';')[0].trim()

    switch (propName) {
      case 'FN':
        fullName = unescapeVCardText(rawVal).trim()
        break
      case 'N': {
        const parts = rawVal.split(';').map(unescapeVCardText)
        lastName = parts[0]?.trim() || ''
        firstName = parts[1]?.trim() || ''
        break
      }
      case 'TEL':
        if (!phone) {
          phone = rawVal.trim()
        }
        break
      case 'URL': {
        const val = rawVal.trim()
        const tgMatch = val.match(/(?:t\.me\/|tg:\/\/resolve\?domain=)([a-zA-Z0-9_]+)/i)
        if (tgMatch) {
          username = tgMatch[1]
        }
        break
      }
      case 'NOTE':
        note = unescapeVCardText(rawVal).trim()
        break
      case 'ORG':
        org = unescapeVCardText(rawVal).trim()
        break
      case 'EMAIL':
        if (!email) {
          email = rawVal.trim()
        }
        break
    }
  }

  if (!fullName) {
    fullName = [firstName, lastName].filter(Boolean).join(' ')
  }
  if (!firstName && fullName) {
    const parts = fullName.split(' ')
    firstName = parts[0] || ''
    lastName = parts.slice(1).join(' ') || ''
  }

  return {
    firstName,
    lastName: lastName || undefined,
    fullName,
    phone: phone || undefined,
    username: username || undefined,
    note: note || undefined,
    org: org || undefined,
    email: email || undefined,
  }
}

/**
 * Initiates browser download of a .vcf contact card file
 */
export function downloadVCardFile(contact: ContactCardPayload, filename?: string): void {
  const vcardText = generateVCard(contact)
  const blob = new Blob([vcardText], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const defaultName = filename || `${contact.firstName || 'contact'}_${contact.lastName || 'card'}.vcf`
  const a = document.createElement('a')
  a.href = url
  a.download = defaultName.replace(/[^a-zA-Z0-9._-]/g, '_')
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
