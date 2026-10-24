import type { Session, BrowserWindow as BrowserWindowType } from 'electron'
import { Logger } from './telegram/logger'

let electronShell: any = null
let electronSession: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const electron = require('electron')
  if (electron) {
    electronShell = electron.shell
    electronSession = electron.session
  }
} catch {
  // Headless test runner fallback
}

/**
 * SecurityGuardrails (Matt Murphy MM-015)
 * Prevents Clickjacking, unauthorized iframe embedding, window-opener hijacking,
 * and malicious open-redirect attacks in Electron Main process and Mini App WebViews.
 */
export class SecurityGuardrails {
  /**
   * Enforces security headers (X-Frame-Options, CSP frame-ancestors, nosniff)
   * on all network responses to prevent clickjacking and framing attacks.
   */
  public static configureSecurityHeaders(ses?: Session): void {
    const targetSession = ses || (electronSession ? electronSession.defaultSession : null)
    if (!targetSession || !targetSession.webRequest) return

    targetSession.webRequest.onHeadersReceived((details: any, callback: any) => {
      const responseHeaders = { ...details.responseHeaders }

      // Enforce Clickjacking Defenses (MM-015)
      responseHeaders['X-Frame-Options'] = ['SAMEORIGIN']
      responseHeaders['X-Content-Type-Options'] = ['nosniff']
      responseHeaders['Referrer-Policy'] = ['strict-origin-when-cross-origin']

      // Enforce CSP frame-ancestors to prevent malicious iframe hosting
      const existingCsp = responseHeaders['Content-Security-Policy'] || []
      const cspDirectives = Array.isArray(existingCsp) ? existingCsp : [existingCsp]
      const hasFrameAncestors = cspDirectives.some((d: string) => d.includes('frame-ancestors'))

      if (!hasFrameAncestors) {
        responseHeaders['Content-Security-Policy'] = [
          ...cspDirectives,
          "frame-ancestors 'self'",
        ]
      }

      callback({ responseHeaders })
    })

    Logger.info('[SecurityGuardrails] Clickjacking and frame-denial headers configured successfully.')
  }

  /**
   * Verifies if a URL is a safe public web destination.
   * Disallows dangerous local schemes (file:, javascript:, data:, vbscript:).
   */
  public static isSafeUrl(rawUrl: string | null | undefined): boolean {
    if (!rawUrl || typeof rawUrl !== 'string') return false
    try {
      const parsed = new URL(rawUrl)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  /**
   * Hardens window opening and navigation for a BrowserWindow.
   * Intercepts window.open / target=_blank and delegates to external OS browser,
   * while completely denying arbitrary popup creation and frame hijacking.
   */
  public static attachSecureWindowHandlers(
    win: BrowserWindowType | any,
    isAppOriginAllowed = false,
    customShell?: any
  ): void {
    const webContents = win.webContents
    const shellHandler = customShell || electronShell

    // 1. Intercept window.open / target="_blank"
    webContents.setWindowOpenHandler(({ url }: { url: string }) => {
      if (this.isSafeUrl(url)) {
        Logger.info(`[SecurityGuardrails] Opening safe external URL via OS browser: ${url}`)
        if (shellHandler && shellHandler.openExternal) {
          shellHandler.openExternal(url).catch((err: any) => {
            Logger.warn(`[SecurityGuardrails] Failed to open external URL: ${url}`, err)
          })
        }
      } else {
        Logger.warn(`[SecurityGuardrails] Blocked unsafe window.open attempt: ${url}`)
      }
      return { action: 'deny' }
    })

    // 2. Intercept in-page top-level navigations (open redirect defense)
    webContents.on('will-navigate', (event: any, navigationUrl: string) => {
      if (isAppOriginAllowed) {
        try {
          const parsed = new URL(navigationUrl)
          // Allow localhost / 127.0.0.1 or app:// or guidegram://
          if (
            parsed.hostname === 'localhost' ||
            parsed.hostname === '127.0.0.1' ||
            parsed.protocol === 'guidegram:' ||
            parsed.protocol === 'file:'
          ) {
            return
          }
        } catch {
          // parse error, block
        }
      }

      // External navigation: block in-window navigation and delegate to OS browser
      event.preventDefault()
      if (this.isSafeUrl(navigationUrl)) {
        Logger.info(`[SecurityGuardrails] Intercepted navigation, redirecting to OS browser: ${navigationUrl}`)
        if (shellHandler && shellHandler.openExternal) {
          shellHandler.openExternal(navigationUrl).catch((err: any) => {
            Logger.warn(`[SecurityGuardrails] Failed to open external navigation URL: ${navigationUrl}`, err)
          })
        }
      } else {
        Logger.warn(`[SecurityGuardrails] Blocked unsafe navigation attempt: ${navigationUrl}`)
      }
    })
  }
}
