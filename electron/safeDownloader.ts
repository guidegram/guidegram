import path from 'node:path'
import fs from 'node:fs'
import { Logger } from './telegram/logger'

// Windows reserved device names that cannot be used as filenames
const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
])

const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh',
  '.ps1', '.ps1xml', '.ps2', '.ps2xml', '.psc1', '.psc2', '.msh', '.msh1',
  '.msi', '.msp', '.com', '.scr', '.pif', '.hta', '.cpl', '.jar',
])

/**
 * SafeDownloader (Matt Murphy Layer 08 Disk Defense)
 * Strict filename sanitization, anti-path-traversal bounds checking,
 * collision avoidance, and dangerous executable detection.
 */
export class SafeDownloader {
  /**
   * Sanitizes a remote-supplied filename to prevent path traversal and illegal filesystem characters.
   */
  public static sanitizeFilename(raw: string | null | undefined, fallback = 'file.bin'): string {
    if (!raw || typeof raw !== 'string') return fallback

    // 1. Strip null bytes and control characters (ASCII 0-31)
    let clean = raw.replace(/[\x00-\x1F\x7F]/g, '')

    // 2. Strip directory traversal tokens and slashes
    clean = clean.replace(/\\/g, '/').replace(/\.\.+/g, '')
    clean = path.basename(clean)

    // 3. Remove illegal Windows filename characters (< > : " / \ | ? *)
    clean = clean.replace(/[<>:"/\\|?*]/g, '_')

    // 4. Strip leading and trailing periods and whitespace
    clean = clean.trim().replace(/^\.+/, '').replace(/\.+$/, '')

    if (!clean) return fallback

    // 5. Check against Windows reserved device names
    const ext = path.extname(clean)
    const base = path.basename(clean, ext).toUpperCase()
    if (WINDOWS_RESERVED_NAMES.has(base)) {
      clean = `_${clean}`
    }

    // 6. Enforce maximum length limit (255 characters standard)
    if (clean.length > 255) {
      const truncatedBase = path.basename(clean, ext).slice(0, 255 - ext.length)
      clean = `${truncatedBase}${ext}`
    }

    return clean || fallback
  }

  /**
   * Resolves a target destination path strictly within the allowed base directory.
   * Throws an error if any directory traversal breakout is detected.
   */
  public static resolveSafePath(baseDirectory: string, filename: string): string {
    const sanitizedName = this.sanitizeFilename(filename)
    const normalizedBase = path.resolve(baseDirectory)
    const resolvedPath = path.resolve(normalizedBase, sanitizedName)

    // Bounds verification: Must remain inside the normalized base directory
    if (!resolvedPath.startsWith(normalizedBase + path.sep) && resolvedPath !== normalizedBase) {
      Logger.error(`[SafeDownloader] Path traversal attempt detected! Base: ${normalizedBase}, Target: ${resolvedPath}`)
      throw new Error(`Path traversal violation: Target escapes designated storage root`)
    }

    return resolvedPath
  }

  /**
   * Finds a non-colliding filename by appending (1), (2)... if target already exists.
   */
  public static getNonCollidingPath(targetPath: string): string {
    if (!fs.existsSync(targetPath)) return targetPath

    const dir = path.dirname(targetPath)
    const ext = path.extname(targetPath)
    const base = path.basename(targetPath, ext)

    let counter = 1
    let candidate = path.join(dir, `${base} (${counter})${ext}`)
    while (fs.existsSync(candidate)) {
      counter++
      candidate = path.join(dir, `${base} (${counter})${ext}`)
    }
    return candidate
  }

  /**
   * Returns true if the file extension represents a potentially dangerous executable.
   */
  public static isDangerousExtension(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase()
    return DANGEROUS_EXTENSIONS.has(ext)
  }
}
