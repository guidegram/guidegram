import test from 'node:test'
import assert from 'node:assert/strict'
import { DohResolver } from '../electron/telegram/dohResolver.ts'

test('DohResolver: IP Address literal detection', () => {
  assert.equal(DohResolver.isIpAddress('149.154.167.50'), true, 'IPv4 should be recognized')
  assert.equal(DohResolver.isIpAddress('127.0.0.1'), true, 'Localhost IPv4 should be recognized')
  assert.equal(DohResolver.isIpAddress('::1'), true, 'IPv6 localhost should be recognized')
  assert.equal(DohResolver.isIpAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334'), true, 'Full IPv6 should be recognized')
  assert.equal(DohResolver.isIpAddress('telegram.org'), false, 'Hostname should not be literal IP')
  assert.equal(DohResolver.isIpAddress('api.telegram.org'), false, 'Subdomain should not be literal IP')
})

test('DohResolver: Literal IP query bypasses network and returns immediately', async () => {
  DohResolver.clearCache()
  const result = await DohResolver.resolve('149.154.167.50')
  assert.deepEqual(result, ['149.154.167.50'])
  assert.equal(DohResolver.getCacheSize(), 0, 'Literal IP should not occupy cache')
})

test('DohResolver: Resolves hostname via primary DoH provider (Cloudflare) with caching', async () => {
  DohResolver.clearCache()

  let fetchCallCount = 0
  const mockFetch = async (url, options) => {
    fetchCallCount++
    assert.ok(url.includes('1.1.1.1/dns-query'))
    assert.equal(options.headers.accept, 'application/dns-json')

    return {
      ok: true,
      json: async () => ({
        Status: 0,
        Answer: [
          { name: 'telegram.org', type: 1, TTL: 300, data: '149.154.167.99' },
          { name: 'telegram.org', type: 1, TTL: 300, data: '149.154.167.100' }
        ]
      })
    }
  }

  // 1. Initial resolution
  const ips = await DohResolver.resolve('telegram.org', 'A', 2000, mockFetch)
  assert.deepEqual(ips, ['149.154.167.99', '149.154.167.100'])
  assert.equal(fetchCallCount, 1)
  assert.equal(DohResolver.getCacheSize(), 1)

  // 2. Second resolution hits cache
  const cachedIps = await DohResolver.resolve('telegram.org', 'A', 2000, mockFetch)
  assert.deepEqual(cachedIps, ['149.154.167.99', '149.154.167.100'])
  assert.equal(fetchCallCount, 1, 'Should not fetch again due to in-memory TTL cache')
})

test('DohResolver: Failover to secondary provider when primary fails', async () => {
  DohResolver.clearCache()

  const requestedUrls = []
  const mockFetch = async (url) => {
    requestedUrls.push(url)
    if (url.includes('1.1.1.1')) {
      // Cloudflare fails
      return { ok: false, status: 503 }
    }
    if (url.includes('8.8.8.8')) {
      // Google succeeds
      return {
        ok: true,
        json: async () => ({
          Status: 0,
          Answer: [
            { name: 'web.telegram.org', type: 1, TTL: 60, data: '149.154.167.50' }
          ]
        })
      }
    }
    throw new Error('Unexpected URL: ' + url)
  }

  const ips = await DohResolver.resolve('web.telegram.org', 'A', 2000, mockFetch)
  assert.deepEqual(ips, ['149.154.167.50'])
  assert.equal(requestedUrls.length, 2, 'Should have queried primary then secondary')
  assert.ok(requestedUrls[0].includes('1.1.1.1'))
  assert.ok(requestedUrls[1].includes('8.8.8.8'))
})

test('DohResolver: In-flight query deduplication', async () => {
  DohResolver.clearCache()

  let fetchCallCount = 0
  const mockFetch = async () => {
    fetchCallCount++
    // Artificial latency
    await new Promise((r) => setTimeout(r, 50))
    return {
      ok: true,
      json: async () => ({
        Status: 0,
        Answer: [{ name: 't.me', type: 1, TTL: 120, data: '149.154.167.51' }]
      })
    }
  }

  // Fire 3 simultaneous queries
  const [res1, res2, res3] = await Promise.all([
    DohResolver.resolve('t.me', 'A', 2000, mockFetch),
    DohResolver.resolve('t.me', 'A', 2000, mockFetch),
    DohResolver.resolve('t.me', 'A', 2000, mockFetch)
  ])

  assert.deepEqual(res1, ['149.154.167.51'])
  assert.deepEqual(res2, ['149.154.167.51'])
  assert.deepEqual(res3, ['149.154.167.51'])
  assert.equal(fetchCallCount, 1, 'In-flight queries should be deduplicated to a single HTTP request')
})

test('DohResolver: Cache clearing resets state completely', () => {
  DohResolver.clearCache()
  assert.equal(DohResolver.getCacheSize(), 0)
})
