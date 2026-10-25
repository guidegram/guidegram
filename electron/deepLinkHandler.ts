import { z } from 'zod'

let electronApp: any = null
try {
  const electron = require('electron')
  electronApp = electron?.app || null
} catch {
  electronApp = null
}

export interface ParsedDeepLink {
  rawUrl: string
  scheme: 'tg' | 'guidegram'
  action: string
  params: Record<string, string>
}

// Zod Schema for validated DeepLink Actions
export const DeepLinkSchema = z.object({
  scheme: z.enum(['tg', 'guidegram']),
  action: z.enum(['resolve', 'join', 'msg_url', 'msg', 'share', 'settings', 'login', 'proxy', 'socks']),
  params: z.record(z.string(), z.string()),
})

/**
 * DeepLinkHandler (Layer 08 / Principle: Zero Command Injection & Safe Deeplinking)
 * Strictly sanitizes and parses OS protocol links (tg://, guidegram://), defends against
 * Chromium CLI argument injection on Windows, and safely dispatches deep links to the renderer.
 */
export class DeepLinkHandler {
  private static registeredProtocols = ['tg', 'guidegram']

  /**
   * Register default OS protocol clients safely.
   */
  public static registerProtocolClients(): boolean {
    if (!electronApp || typeof electronApp.setAsDefaultProtocolClient !== 'function') {
      return false
    }

    try {
      for (const scheme of this.registeredProtocols) {
        if (process.defaultApp) {
          if (process.argv.length >= 2) {
            electronApp.setAsDefaultProtocolClient(scheme, process.execPath, [
              require('path').resolve(process.argv[1]),
            ])
          }
        } else {
          electronApp.setAsDefaultProtocolClient(scheme)
        }
      }
      return true
    } catch {
      return false
    }
  }

  /**
   * Extracts deep link candidate string from command line arguments (process.argv or second-instance argv).
   */
  public static extractDeepLinkFromArgv(argv: string[]): string | null {
    if (!Array.isArray(argv)) return null

    for (const arg of argv) {
      if (typeof arg !== 'string') continue
      const trimmed = arg.trim()

      // Reject anything that looks like a CLI flag/switch or injection
      if (trimmed.startsWith('-') || trimmed.startsWith('/') && !trimmed.includes('://')) {
        continue
      }

      for (const scheme of this.registeredProtocols) {
        if (trimmed.toLowerCase().startsWith(`${scheme}://`)) {
          return trimmed
        }
      }
    }

    return null
  }

  /**
   * Strictly validates and parses a deep link URL, rejecting injection vectors.
   */
  public static parseAndValidateDeepLink(rawCandidate: string): ParsedDeepLink | null {
    if (!rawCandidate || typeof rawCandidate !== 'string') return null

    const trimmed = rawCandidate.trim()

    // Defense-in-depth: Reject shell metacharacters and CLI argument injection patterns
    if (
      trimmed.includes('\0') ||
      trimmed.includes('\n') ||
      trimmed.includes('\r') ||
      trimmed.includes('"') ||
      trimmed.includes('`') ||
      trimmed.includes('--') ||
      trimmed.includes(';') ||
      trimmed.includes('|') ||
      trimmed.includes('&&')
    ) {
      return null
    }

    try {
      const parsed = new URL(trimmed)
      const scheme = parsed.protocol.replace(':', '').toLowerCase()

      if (scheme !== 'tg' && scheme !== 'guidegram') {
        return null
      }

      // Host or pathname represents the action (e.g. tg://resolve -> host is 'resolve')
      let action = (parsed.hostname || parsed.pathname.replace(/^\/+/, '')).toLowerCase()
      // Normalize aliases
      if (action === 'msg_url') action = 'msg'
      if (action === 'socks') action = 'proxy'

      const params: Record<string, string> = {}
      parsed.searchParams.forEach((val, key) => {
        // Sanitize param values: reject any param with CLI flags or control chars
        if (!key.startsWith('-') && !val.includes('\0')) {
          params[key] = val
        }
      })

      // Validate against strict Zod schema
      const validation = DeepLinkSchema.safeParse({ scheme, action, params })
      if (!validation.success) {
        return null
      }

      return {
        rawUrl: trimmed,
        scheme: validation.data.scheme,
        action: validation.data.action,
        params: validation.data.params,
      }
    } catch {
      return null
    }
  }

  /**
   * Dispatches a sanitized deep link to the renderer window.
   */
  public static dispatchDeepLink(targetWindow: any, parsed: ParsedDeepLink): boolean {
    if (!targetWindow || targetWindow.isDestroyed() || !targetWindow.webContents) {
      return false
    }

    try {
      targetWindow.webContents.send('protocol:deep-link', parsed)
      return true
    } catch {
      return false
    }
  }
}
