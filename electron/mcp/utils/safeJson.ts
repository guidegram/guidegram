/**
 * Safe JSON serializer for MCP JSON-RPC protocol.
 * Guarantees zero crashes from BigInt, Long, Buffer, Uint8Array, and circular references.
 */

export function isLong(value: any): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value._isLong === true ||
      (typeof value.low === 'number' && typeof value.high === 'number' && typeof value.unsigned === 'boolean'))
  )
}

export function isBufferOrUint8Array(value: any): boolean {
  if (!value) return false
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return true
  return value instanceof Uint8Array
}

/**
 * Recursively converts non-serializable primitives (BigInt, Long, Buffer, Map, Set, Error)
 * into JSON-compatible values with circular reference guard.
 */
export function safeJsonSerialize(value: any, seen = new WeakSet<object>()): any {
  if (value === null || value === undefined) {
    return value
  }

  // Handle BigInt
  if (typeof value === 'bigint') {
    return value.toString()
  }

  // Handle Primitives
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'symbol') {
    return value.toString()
  }

  if (typeof value === 'function') {
    return `[Function: ${value.name || 'anonymous'}]`
  }

  // Handle Long (mtcute / long.js)
  if (isLong(value)) {
    return value.toString()
  }

  // Handle Date
  if (value instanceof Date) {
    return value.toISOString()
  }

  // Handle Error
  if (value instanceof Error) {
    return {
      _type: 'Error',
      name: value.name,
      message: value.message,
      stack: value.stack,
    }
  }

  // Handle Buffer / Uint8Array
  if (isBufferOrUint8Array(value)) {
    const len = value.length || 0
    if (len <= 64) {
      const hex = Buffer.isBuffer(value)
        ? value.toString('hex')
        : Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('hex')
      return {
        _type: 'Buffer',
        length: len,
        hex,
      }
    }
    const previewBuf = Buffer.isBuffer(value)
      ? value.subarray(0, 32)
      : Buffer.from(value.buffer, value.byteOffset, Math.min(32, len))
    return {
      _type: 'Buffer',
      length: len,
      previewHex: `${previewBuf.toString('hex')}...`,
    }
  }

  // Handle Circular Reference
  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]'
    }
    seen.add(value)
  }

  // Handle Array
  if (Array.isArray(value)) {
    return value.map((item) => safeJsonSerialize(item, seen))
  }

  // Handle Map
  if (value instanceof Map) {
    const obj: Record<string, any> = {}
    for (const [k, v] of value.entries()) {
      obj[String(k)] = safeJsonSerialize(v, seen)
    }
    return obj
  }

  // Handle Set
  if (value instanceof Set) {
    return Array.from(value).map((item) => safeJsonSerialize(item, seen))
  }

  // Handle Plain Object
  const result: Record<string, any> = {}
  for (const key of Object.keys(value)) {
    try {
      result[key] = safeJsonSerialize(value[key], seen)
    } catch {
      result[key] = '[Unserializable]'
    }
  }

  return result
}

/**
 * Safe JSON.stringify drop-in replacement that never throws TypeError on BigInt or circular structures.
 */
export function safeJsonStringify(value: any, space?: number | string): string {
  try {
    const serialized = safeJsonSerialize(value)
    return JSON.stringify(serialized, null, space)
  } catch (err: any) {
    return JSON.stringify({
      error: 'Failed to serialize JSON payload',
      details: err?.message || String(err),
    })
  }
}
