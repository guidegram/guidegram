import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import type { AccountManager } from '../../telegram/accountManager'
import { resolveAccountId } from './accountTools.js'
import { dispatchMtprotoRpc, ALL_MTPROTO_METHODS } from '../../telegram/mtprotoRegistry.js'
import { safeJsonSerialize } from '../utils/safeJson.js'
import { Logger } from '../../telegram/logger'
import { Long } from '@mtcute/core'

// Blocked destructive MTProto methods
const BLOCKED_DESTRUCTIVE_METHODS = new Set([
  'account.deleteAccount',
  'auth.resetAuthorizations',
  'auth.logOut',
])

interface CompactMethodSchema {
  method: string
  category: string
  action: string
  description: string
  keywords?: string[]
  params: string[]
}

let cachedSchema: CompactMethodSchema[] | null = null

function loadCompactSchema(): CompactMethodSchema[] {
  if (cachedSchema) return cachedSchema

  try {
    const candidates = [
      path.resolve(process.cwd(), 'electron', 'mcp', 'data', 'mtprotoSchemaCompact.json'),
      path.join(__dirname, '..', 'data', 'mtprotoSchemaCompact.json'),
      path.join(__dirname, 'data', 'mtprotoSchemaCompact.json'),
    ]

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8')
        cachedSchema = JSON.parse(raw)
        return cachedSchema!
      }
    }
  } catch (err) {
    Logger.warn('[UniversalRpcTools] Failed to load mtprotoSchemaCompact.json, building runtime fallback:', err)
  }

  // Fallback to ALL_MTPROTO_METHODS in memory
  cachedSchema = ALL_MTPROTO_METHODS.map((m: string) => {
    const parts = m.split('.')
    return {
      method: m,
      category: parts.length > 1 ? parts[0] : 'core',
      action: parts.length > 1 ? parts[1] : parts[0],
      description: `MTProto API method: ${m}`,
      params: ['peer', 'id', 'flags'],
    }
  })

  return cachedSchema
}

function resolveAccount(accountManager: AccountManager, accountId?: string): string {
  return resolveAccountId(accountManager, accountId)
}

/**
 * Recursively coerces user-supplied JSON parameters into MTProto wire objects,
 * including InputPeer / InputChannel / InputUser, Longs, and BigInts.
 */
export async function coerceMtprotoParams(
  accountManager: AccountManager,
  accountId: string,
  params: any
): Promise<any> {
  if (params === null || params === undefined) return params
  if (typeof params !== 'object') return params

  if (Array.isArray(params)) {
    return Promise.all(params.map((item) => coerceMtprotoParams(accountManager, accountId, item)))
  }

  const coerced: Record<string, any> = {}

  for (const [key, val] of Object.entries(params)) {
    if (val === null || val === undefined) {
      coerced[key] = val
      continue
    }

    const lowerKey = key.toLowerCase()

    // 1. Peer / Channel / User coercion
    if (
      (lowerKey === 'peer' || lowerKey === 'channel' || lowerKey === 'frompeer' || lowerKey === 'topeer') &&
      (typeof val === 'string' || typeof val === 'number')
    ) {
      try {
        const resolved = await accountManager.resolveInputPeer(accountId, String(val))
        if (resolved) {
          if (lowerKey === 'channel' && resolved._ === 'inputPeerChannel') {
            coerced[key] = {
              _: 'inputChannel',
              channelId: resolved.channelId,
              accessHash: resolved.accessHash,
            }
          } else {
            coerced[key] = resolved
          }
          continue
        }
      } catch (err) {
        Logger.warn(`[UniversalRpcTools] Peer coercion failed for key '${key}', value '${val}':`, err)
      }
    }

    // 2. Long / BigInt fields
    if (
      (lowerKey === 'accesshash' ||
        lowerKey === 'randomid' ||
        lowerKey === 'hash' ||
        lowerKey.endsWith('id') ||
        lowerKey.endsWith('hash')) &&
      typeof val === 'string' &&
      /^-?\d+$/.test(val)
    ) {
      try {
        coerced[key] = Long.fromString(val)
        continue
      } catch {
        coerced[key] = val
        continue
      }
    }

    // 3. String ending with 'n' indicating BigInt representation
    if (typeof val === 'string' && /^-?\d+n$/.test(val)) {
      try {
        coerced[key] = BigInt(val.slice(0, -1))
        continue
      } catch {
        coerced[key] = val
        continue
      }
    }

    // 4. Recursive object coercion
    if (typeof val === 'object') {
      coerced[key] = await coerceMtprotoParams(accountManager, accountId, val)
    } else {
      coerced[key] = val
    }
  }

  return coerced
}

/**
 * Intercepts large Buffers in the MTProto result (> 1MB) and persists them to disk,
 * returning metadata to prevent JSON-RPC token exhaustion.
 */
async function processLargeBuffers(data: any): Promise<any> {
  if (!data || typeof data !== 'object') return data

  if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
    if (data.length > 1024 * 1024) {
      // Larger than 1MB -> write to disk
      let mediaDir = ''
      try {
        mediaDir = path.join(app ? app.getPath('userData') : process.cwd(), 'mcp_media')
      } catch {
        mediaDir = path.resolve(process.cwd(), 'downloads', 'mcp_media')
      }
      if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, { recursive: true })
      }
      const fileName = `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.bin`
      const filePath = path.join(mediaDir, fileName)
      await fs.promises.writeFile(filePath, data)

      return {
        _type: 'LargeMediaBuffer',
        filePath,
        fileSize: data.length,
        note: 'Buffer exceeded 1MB and was automatically saved to local storage.',
      }
    }
    return data
  }

  if (Array.isArray(data)) {
    return Promise.all(data.map(processLargeBuffers))
  }

  const result: Record<string, any> = {}
  for (const [k, v] of Object.entries(data)) {
    result[k] = await processLargeBuffers(v)
  }
  return result
}

/**
 * Searches and discovers MTProto methods from the compact schema by keyword.
 */
export async function discoverMethodsHandler(
  args: {
    query: string
    category?: string
    limit?: number
  }
): Promise<{ methods: CompactMethodSchema[]; totalFound: number; query: string }> {
  const query = (args.query || '').trim().toLowerCase()
  const limit = Math.min(Math.max(args.limit || 20, 1), 100)
  const categoryFilter = args.category?.trim().toLowerCase()

  const schema = loadCompactSchema()

  let matches = schema.filter((item) => {
    if (categoryFilter && item.category.toLowerCase() !== categoryFilter) {
      return false
    }
    if (!query) return true

    if (item.method.toLowerCase().includes(query)) return true
    if (item.action.toLowerCase().includes(query)) return true
    if (item.description.toLowerCase().includes(query)) return true
    if (item.keywords?.some((k) => k.toLowerCase().includes(query))) return true
    return false
  })

  // Rank matches: exact prefix matches first
  matches.sort((a, b) => {
    const aMethod = a.method.toLowerCase()
    const bMethod = b.method.toLowerCase()
    if (aMethod.startsWith(query) && !bMethod.startsWith(query)) return -1
    if (!aMethod.startsWith(query) && bMethod.startsWith(query)) return 1
    return 0
  })

  return {
    methods: matches.slice(0, limit),
    totalFound: matches.length,
    query,
  }
}

/**
 * Invokes any raw Telegram MTProto method dynamically with parameter coercion,
 * destructive method safety guard, and BigInt/Buffer serialization.
 */
export async function invokeRawMethodHandler(
  accountManager: AccountManager,
  args: {
    accountId?: string
    method: string
    params?: Record<string, any>
  }
): Promise<{ success: boolean; method: string; accountId: string; result?: any; error?: string }> {
  const targetAccountId = resolveAccount(accountManager, args.accountId)
  const method = (args.method || '').trim()

  if (!method) {
    throw new Error('MTProto method name is required.')
  }

  // Destructive command safety guard
  if (BLOCKED_DESTRUCTIVE_METHODS.has(method)) {
    throw new Error(
      `Destructive MTProto method '${method}' is blocked by the Guidegram MCP safety guardrails to protect your Telegram account from accidental deletion or session reset.`
    )
  }

  const client = accountManager.getConnectedClient(targetAccountId)
  if (!client) {
    throw new Error(`Telegram account ${targetAccountId} is not connected.`)
  }

  try {
    const coercedParams = await coerceMtprotoParams(accountManager, targetAccountId, args.params || {})
    Logger.info(`[UniversalRpcTools] Invoking raw MTProto method '${method}' for account ${targetAccountId}`)

    const rawResult = await dispatchMtprotoRpc(client, method, coercedParams)
    const processedResult = await processLargeBuffers(rawResult)
    const safeOutput = safeJsonSerialize(processedResult)

    return {
      success: true,
      method,
      accountId: targetAccountId,
      result: safeOutput,
    }
  } catch (err: any) {
    Logger.error(`[UniversalRpcTools] Failed to invoke raw MTProto method '${method}':`, err)
    return {
      success: false,
      method,
      accountId: targetAccountId,
      error: err?.message || String(err),
    }
  }
}

export const universalRpcToolsDefinitions = [
  {
    name: 'telegram_discover_methods',
    description: 'Searches the full MTProto Layer 229 schema (859 native RPC methods) by keyword, method name, or category (e.g. "boost", "story", "reaction", "forum", "payment"). Returns descriptions and expected parameters.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search keyword (e.g. "boost", "poll", "story", "channel", "user", "stars").',
        },
        category: {
          type: 'string',
          description: 'Optional MTProto category filter (e.g. "messages", "channels", "premium", "contacts", "stories").',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of methods to return (default: 20, max: 100).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'telegram_invoke_raw_method',
    description: 'Directly executes any native Telegram MTProto RPC method on the wire. Automatically coerces peer IDs to InputPeer/InputChannel, handles 64-bit Longs/BigInts, protects against destructive operations, and serializes all results safely.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Optional Telegram account ID. If omitted, uses active account.',
        },
        method: {
          type: 'string',
          description: 'The exact MTProto method name (e.g. "premium.getBoostsStatus", "messages.getHistory", "channels.getChannels").',
        },
        params: {
          type: 'object',
          description: 'Parameters to pass to the MTProto RPC method. Peer references (e.g. peer: "@durov" or peer: "-100...") are automatically coerced.',
        },
      },
      required: ['method'],
    },
  },
]
