import path from 'path'
import fs from 'fs'

let electronApp: any = null
try {
  // Defensive require for testing outside Electron runtime
  const electron = require('electron')
  electronApp = electron?.app || null
} catch {
  electronApp = null
}

export interface StorageRootsConfig {
  userData?: string
  temp?: string
  downloads?: string
  appRoot?: string
  extraAllowed?: string[]
}

/**
 * StorageGuardrails (Layer 08 - Matt Murphy Production Hardening)
 * Strictly enforces directory access boundaries, prevents arbitrary local file inclusion (LFI),
 * symbolic link jailbreaks, and directory traversal via custom protocols and IPC channels.
 */
export class StorageGuardrails {
  private static mockRoots: StorageRootsConfig | null = null

  /**
   * Set mock roots for testing or non-Electron environments
   */
  public static setMockRoots(roots: StorageRootsConfig | null): void {
    this.mockRoots = roots
  }

  /**
   * Returns list of authorized directory roots.
   */
  public static getAuthorizedRoots(): string[] {
    const roots: string[] = []

    if (this.mockRoots) {
      if (this.mockRoots.userData) roots.push(path.resolve(this.mockRoots.userData))
      if (this.mockRoots.temp) roots.push(path.resolve(this.mockRoots.temp))
      if (this.mockRoots.downloads) roots.push(path.resolve(this.mockRoots.downloads))
      if (this.mockRoots.appRoot) roots.push(path.resolve(this.mockRoots.appRoot))
      if (this.mockRoots.extraAllowed) {
        for (const extra of this.mockRoots.extraAllowed) {
          if (extra) roots.push(path.resolve(extra))
        }
      }
      return Array.from(new Set(roots))
    }

    if (electronApp && typeof electronApp.getPath === 'function') {
      try {
        const userData = electronApp.getPath('userData')
        if (userData) roots.push(path.resolve(userData))
      } catch {}

      try {
        const temp = electronApp.getPath('temp')
        if (temp) roots.push(path.resolve(temp))
      } catch {}

      try {
        const downloads = electronApp.getPath('downloads')
        if (downloads) roots.push(path.resolve(downloads))
      } catch {}

      try {
        const appPath = electronApp.getAppPath ? electronApp.getAppPath() : process.cwd()
        if (appPath) roots.push(path.resolve(appPath))
      } catch {}
    } else {
      // Standalone Node / CLI fallback
      roots.push(path.resolve(process.cwd()))
      roots.push(path.resolve(osTempDir()))
    }

    return Array.from(new Set(roots))
  }

  /**
   * Checks whether a given path is safely confined within authorized directory roots.
   */
  public static isPathWithinAuthorizedBounds(targetPath: string, allowedRoots?: string[]): boolean {
    if (!targetPath || typeof targetPath !== 'string') {
      return false
    }

    // Reject null bytes and obvious injection characters
    if (targetPath.includes('\0') || targetPath.includes('%00')) {
      return false
    }

    try {
      // Normalize and resolve absolute target path
      const resolvedTarget = path.resolve(targetPath)

      // Get real path if file exists to detect symlink jailbreaks
      let realTarget = resolvedTarget
      if (fs.existsSync(resolvedTarget)) {
        try {
          realTarget = fs.realpathSync(resolvedTarget)
        } catch {
          realTarget = resolvedTarget
        }
      }

      const activeRoots = allowedRoots && allowedRoots.length > 0 
        ? allowedRoots.map((r) => path.resolve(r))
        : this.getAuthorizedRoots()

      for (const root of activeRoots) {
        // Resolve real root path as well
        let realRoot = root
        if (fs.existsSync(root)) {
          try {
            realRoot = fs.realpathSync(root)
          } catch {
            realRoot = root
          }
        }

        // Must start with root directory boundary
        const relative = path.relative(realRoot, realTarget)
        const isChild = !relative.startsWith('..') && !path.isAbsolute(relative)
        const isEqual = realRoot.toLowerCase() === realTarget.toLowerCase()

        if (isChild || isEqual) {
          return true
        }
      }

      return false
    } catch {
      return false
    }
  }

  /**
   * Asserts path is within authorized bounds, throwing an error if bounds are violated.
   */
  public static assertPathWithinAuthorizedBounds(targetPath: string, allowedRoots?: string[]): string {
    if (!this.isPathWithinAuthorizedBounds(targetPath, allowedRoots)) {
      throw new Error(`[StorageGuardrails] Access Denied: Path '${targetPath}' is outside authorized bounds.`)
    }
    return path.resolve(targetPath)
  }

  /**
   * Validates that a source directory for sync operations is safe and not a critical system root.
   */
  public static isSafeDirectoryForSync(dirPath: string): boolean {
    if (!dirPath || typeof dirPath !== 'string') return false
    const resolved = path.resolve(dirPath)

    // Deny drive roots like C:\ or /
    const root = path.parse(resolved).root
    if (resolved === root) {
      return false
    }

    // Windows sensitive system directories
    if (process.platform === 'win32') {
      const winDir = process.env.SystemRoot || 'C:\\Windows'
      const progFiles = process.env.ProgramFiles || 'C:\\Program Files'
      const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'

      const lower = resolved.toLowerCase()
      if (
        lower.startsWith(winDir.toLowerCase()) ||
        lower.startsWith(progFiles.toLowerCase()) ||
        lower.startsWith(progFilesX86.toLowerCase())
      ) {
        return false
      }
    }

    return fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()
  }
}

function osTempDir(): string {
  try {
    return require('os').tmpdir()
  } catch {
    return '/tmp'
  }
}
