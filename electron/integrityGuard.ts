import fs from 'node:fs'
import crypto from 'node:crypto'

let Logger: any = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const loggerModule = require('./telegram/logger')
  if (loggerModule?.Logger) Logger = loggerModule.Logger
} catch {
  // Fallback for ESM test runner
}

export interface IntegrityReport {
  isTampered: boolean
  reasons: string[]
  inspectedFlags: string[]
  detectedEnvThreats: string[]
  timestamp: number
}

/**
 * IntegrityGuard (Layer 08 / Anti-Tampering & Execution Integrity)
 * Protects desktop application from binary modification, hostile debugging injection,
 * and NODE_OPTIONS DLL/script side-loading in production environments.
 */
export class IntegrityGuard {
  // Disallowed CLI debugging flags in production
  private static readonly RESTRICTED_DEBUG_FLAGS = [
    '--inspect',
    '--inspect-brk',
    '--inspect-port',
    '--remote-debugging-port',
    '--allow-http-screen-capture',
  ]

  // Hostile environment variables used by desktop malware to hook Node/Electron runtimes
  private static readonly HOSTILE_ENV_VARS = [
    'NODE_OPTIONS',
    'ELECTRON_RUN_AS_NODE',
    'NODE_DEBUG',
  ]

  /**
   * Computes SHA-256 checksum of a file using chunked streaming.
   */
  public static async calculateFileSha256(filePath: string): Promise<string | null> {
    if (!filePath || typeof filePath !== 'string' || !fs.existsSync(filePath)) {
      return null
    }

    return new Promise((resolve) => {
      const hash = crypto.createHash('sha256')
      const stream = fs.createReadStream(filePath)

      stream.on('data', (chunk) => hash.update(chunk))
      stream.on('end', () => resolve(hash.digest('hex').toLowerCase()))
      stream.on('error', (err) => {
        Logger.warn(`[IntegrityGuard] Failed to calculate hash for ${filePath}:`, err)
        resolve(null)
      })
    })
  }

  /**
   * Verifies file integrity against expected SHA-256 using constant-time comparison.
   */
  public static async verifyFileIntegrity(filePath: string, expectedHash: string): Promise<boolean> {
    if (!expectedHash || typeof expectedHash !== 'string') return false
    const actualHash = await this.calculateFileSha256(filePath)
    if (!actualHash) return false

    try {
      const expectedBuf = Buffer.from(expectedHash.trim().toLowerCase(), 'hex')
      const actualBuf = Buffer.from(actualHash.trim().toLowerCase(), 'hex')

      if (expectedBuf.length !== actualBuf.length) return false
      return crypto.timingSafeEqual(expectedBuf, actualBuf)
    } catch {
      return false
    }
  }

  /**
   * Scans runtime environment and startup flags for hostile tampering or debuggers.
   */
  public static detectTamperedEnvironment(isProduction: boolean = false): IntegrityReport {
    const reasons: string[] = []
    const inspectedFlags: string[] = []
    const detectedEnvThreats: string[] = []

    // 1. Check CLI arguments
    const combinedArgs = [...(process.argv || []), ...(process.execArgv || [])]
    for (const arg of combinedArgs) {
      if (typeof arg !== 'string') continue
      const lower = arg.toLowerCase()
      for (const flag of this.RESTRICTED_DEBUG_FLAGS) {
        if (lower.startsWith(flag)) {
          inspectedFlags.push(arg)
          if (isProduction) {
            reasons.push(`Forbidden debugging flag detected in production: ${arg}`)
          }
        }
      }
    }

    // 2. Check Hostile Environment Variables
    for (const envVar of this.HOSTILE_ENV_VARS) {
      const val = process.env[envVar]
      if (val !== undefined && val !== '') {
        detectedEnvThreats.push(`${envVar}=${val}`)
        if (isProduction) {
          reasons.push(`Malicious runtime environment variable detected: ${envVar}`)
        }
      }
    }

    return {
      isTampered: reasons.length > 0,
      reasons,
      inspectedFlags,
      detectedEnvThreats,
      timestamp: Date.now(),
    }
  }

  /**
   * Cleanses process.env of hostile injection variables if detected.
   */
  public static sanitizeEnvironment(): void {
    for (const envVar of this.HOSTILE_ENV_VARS) {
      if (process.env[envVar] !== undefined) {
        Logger.warn(`[IntegrityGuard] Sanitizing hostile env var: ${envVar}`)
        delete process.env[envVar]
      }
    }
  }
}
