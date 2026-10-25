/**
 * DragDropSanitizer (Layer 08 Security Guardrails & Anti-Exfiltration)
 * 
 * Enforces strict sanitization and validation on all Drag-and-Drop operations:
 * 1. Executable & Script Extension Blocking:
 *    Blocks .exe, .bat, .cmd, .vbs, .ps1, .lnk, .scr, .hta, .cpl, and double extensions (.pdf.exe).
 * 2. Windows Shell Link (.lnk) & Shortcut Payload Protection:
 *    Prevents code execution via argument smuggling in dropped shortcut files.
 * 3. Path Traversal & Injection Shield:
 *    Rejects file paths containing ../, ..\, null bytes (\0, %00), and invalid NTFS control characters.
 * 4. Dangerous URI Scheme Neutralization:
 *    Blocks drag-and-drop of javascript:, vbscript:, and unauthorized file: / data: protocols.
 * 5. Chromium Drop Navigation Interception:
 *    Attaches to Electron webContents to prevent Chromium from navigating away to dropped files.
 * 6. Telemetry & Metrics for Drop Security Auditing.
 */

export interface DroppedFileItem {
  name: string
  path?: string
  size?: number
  type?: string
}

export interface FileSanitizationResult {
  safe: boolean
  sanitizedName: string
  reason?: string
  extension?: string
  isDoubleExtension?: boolean
}

export interface TextSanitizationResult {
  safe: boolean
  sanitizedText: string
  isUrl: boolean
  isDangerousUri: boolean
  warning?: string
}

export interface DragDropTelemetry {
  totalDropsInspected: number
  dangerousFilesBlocked: number
  executableExtensionsBlocked: number
  dangerousUrisBlocked: number
  pathTraversalsBlocked: number
}

export class DragDropSanitizer {
  private static instance: DragDropSanitizer | null = null

  // Known dangerous executable, script, and Windows shell extensions
  public static readonly DANGEROUS_EXTENSIONS = new Set<string>([
    'exe', 'bat', 'cmd', 'vbs', 'vbe', 'js', 'jse', 'wsf', 'wsh',
    'ps1', 'ps1xml', 'ps2', 'psc1', 'psc2', 'scr', 'pif', 'lnk',
    'url', 'inf', 'reg', 'hta', 'cpl', 'msc', 'jar', 'appimage',
    'sh', 'bin', 'com', 'gadget', 'msh', 'msh1', 'msh2', 'mshxml',
    'msh1xml', 'msh2xml'
  ])

  // Dangerous URI schemes that must never be evaluated or navigated on drop
  public static readonly DANGEROUS_SCHEMES = [
    'javascript:',
    'vbscript:',
    'data:text/html',
    'data:text/javascript',
    'file:',
    'about:blank',
    'ms-msdt:',
    'search-ms:',
  ]

  // Telemetry metrics
  private totalDropsInspected: number = 0
  private dangerousFilesBlocked: number = 0
  private executableExtensionsBlocked: number = 0
  private dangerousUrisBlocked: number = 0
  private pathTraversalsBlocked: number = 0

  public static getInstance(): DragDropSanitizer {
    if (!DragDropSanitizer.instance) {
      DragDropSanitizer.instance = new DragDropSanitizer()
    }
    return DragDropSanitizer.instance
  }

  public static resetInstance(): void {
    if (DragDropSanitizer.instance) {
      DragDropSanitizer.instance.reset()
      DragDropSanitizer.instance = null
    }
  }

  /**
   * Sanitizes and validates a dropped file item.
   */
  public sanitizeDroppedFile(file: DroppedFileItem | null | undefined): FileSanitizationResult {
    this.totalDropsInspected++

    if (!file || typeof file.name !== 'string') {
      this.dangerousFilesBlocked++
      return { safe: false, sanitizedName: '', reason: 'Empty or invalid file payload' }
    }

    const rawName = file.name.trim()

    // 1. Detect Path Traversal or Null-Byte Injection
    if (
      rawName.includes('..') ||
      rawName.includes('/') ||
      rawName.includes('\\') ||
      rawName.includes('\0') ||
      rawName.includes('%00')
    ) {
      this.dangerousFilesBlocked++
      this.pathTraversalsBlocked++
      return { safe: false, sanitizedName: '', reason: 'Path traversal or null byte injection detected' }
    }

    // 2. Extract and inspect extension
    const parts = rawName.split('.').filter(Boolean)
    if (parts.length === 0) {
      return { safe: true, sanitizedName: rawName, extension: '' }
    }

    const finalExt = parts[parts.length - 1].toLowerCase()

    // Check if the file has a double extension (e.g. invoice.pdf.exe)
    let isDoubleExtension = false
    if (parts.length >= 3) {
      const secondToLast = parts[parts.length - 2].toLowerCase()
      if (['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'txt'].includes(secondToLast)) {
        isDoubleExtension = true
      }
    }

    if (DragDropSanitizer.DANGEROUS_EXTENSIONS.has(finalExt)) {
      this.dangerousFilesBlocked++
      this.executableExtensionsBlocked++
      return {
        safe: false,
        sanitizedName: rawName,
        extension: finalExt,
        isDoubleExtension,
        reason: `Executable or dangerous file extension blocked: .${finalExt}`,
      }
    }

    // Strip unsafe characters from filename (preserve letters, digits, dots, hyphens, underscores, spaces)
    const sanitizedName = rawName.replace(/[^a-zA-Z0-9.\-_ ()]/g, '_')

    return {
      safe: true,
      sanitizedName,
      extension: finalExt,
      isDoubleExtension,
    }
  }

  /**
   * Sanitizes dropped plain text or URI string.
   */
  public sanitizeDroppedText(text: string | null | undefined): TextSanitizationResult {
    this.totalDropsInspected++

    if (!text || typeof text !== 'string') {
      return { safe: true, sanitizedText: '', isUrl: false, isDangerousUri: false }
    }

    const trimmed = text.trim()
    const lower = trimmed.toLowerCase()

    // Check dangerous URI schemes
    for (const scheme of DragDropSanitizer.DANGEROUS_SCHEMES) {
      if (lower.startsWith(scheme)) {
        this.dangerousUrisBlocked++
        return {
          safe: false,
          sanitizedText: '',
          isUrl: true,
          isDangerousUri: true,
          warning: `Dangerous URI scheme blocked: ${scheme}`,
        }
      }
    }

    const isUrl = /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(trimmed)

    // Strip non-printable ASCII control characters (0x00 to 0x1F except tab and newline)
    const sanitizedText = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

    return {
      safe: true,
      sanitizedText,
      isUrl,
      isDangerousUri: false,
    }
  }

  /**
   * Attaches drop navigation guard to Electron webContents.
   * Prevents Chromium from navigating away to dropped local files or external links.
   */
  public attachToWebContents(webContents: any): void {
    if (!webContents || typeof webContents.on !== 'function') return

    webContents.on('will-navigate', (event: any, url: string) => {
      if (!url) return
      const lower = url.toLowerCase()

      // Allow internal app navigation
      if (
        lower.startsWith('file://') &&
        (lower.includes('/dist/index.html') || lower.includes('/dist-electron/'))
      ) {
        return
      }

      if (lower.startsWith('http://localhost') || lower.startsWith('https://localhost')) {
        return
      }

      // Block all unexpected dropped URL navigations
      event.preventDefault()
      this.dangerousUrisBlocked++
    })
  }

  public getTelemetry(): DragDropTelemetry {
    return {
      totalDropsInspected: this.totalDropsInspected,
      dangerousFilesBlocked: this.dangerousFilesBlocked,
      executableExtensionsBlocked: this.executableExtensionsBlocked,
      dangerousUrisBlocked: this.dangerousUrisBlocked,
      pathTraversalsBlocked: this.pathTraversalsBlocked,
    }
  }

  public reset(): void {
    this.totalDropsInspected = 0
    this.dangerousFilesBlocked = 0
    this.executableExtensionsBlocked = 0
    this.dangerousUrisBlocked = 0
    this.pathTraversalsBlocked = 0
  }
}

export const dragDropSanitizer = DragDropSanitizer.getInstance()
