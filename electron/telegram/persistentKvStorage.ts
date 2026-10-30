import fs from 'fs'
import path from 'path'
import { MemoryStorage } from '@mtcute/core'
import { Logger } from './logger'

/**
 * Persistent KV Storage for mtcute UpdatesStateService
 * Ensures updates_pts, updates_qts, updates_date, updates_seq, and channel PTS
 * survive across application restarts, enabling full Telegram-native offline catch-up (updates.getDifference).
 */
export class PersistentKvStorage extends MemoryStorage {
  private filePath: string
  private saveTimer: NodeJS.Timeout | null = null

  constructor(filePath: string) {
    super()
    this.filePath = filePath
    this.loadFromDisk()

    const origSet = this.kv.set.bind(this.kv)
    const origDelete = this.kv.delete.bind(this.kv)
    const origDeleteAll = this.kv.deleteAll.bind(this.kv)

    this.kv.set = (key: string, value: Uint8Array) => {
      origSet(key, value)
      this.scheduleSave()
    }

    this.kv.delete = (key: string) => {
      origDelete(key)
      this.scheduleSave()
    }

    this.kv.deleteAll = () => {
      origDeleteAll()
      this.scheduleSave()
    }

    try {
      process.on('beforeExit', () => this.flush())
      process.on('exit', () => this.flush())
    } catch (_) {}
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8')
        const data = JSON.parse(raw)
        if (data && typeof data === 'object') {
          for (const [k, v] of Object.entries(data)) {
            if (typeof v === 'string') {
              this.kv.set(k, new Uint8Array(Buffer.from(v, 'base64')))
            }
          }
        }
      }
    } catch (err) {
      Logger.warn(`[PersistentKvStorage] Failed to load updates state from ${this.filePath}:`, err)
    }
  }

  private scheduleSave(): void {
    if (this.saveTimer) return
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      this.flush()
    }, 500)
  }

  public flush(): void {
    try {
      const stateMap = (this.kv as any).state as Map<string, Uint8Array>
      if (!stateMap) return
      const obj: Record<string, string> = {}
      for (const [k, v] of stateMap.entries()) {
        obj[k] = Buffer.from(v).toString('base64')
      }
      const dir = path.dirname(this.filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.filePath, JSON.stringify(obj), 'utf-8')
    } catch (err) {
      Logger.warn(`[PersistentKvStorage] Failed to flush updates state to ${this.filePath}:`, err)
    }
  }
}
