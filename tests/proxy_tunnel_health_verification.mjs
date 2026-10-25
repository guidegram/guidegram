import test from 'node:test'
import assert from 'node:assert/strict'
import { ProxyHarvester } from '../electron/telegram/proxyHarvester.ts'

test('ProxyHarvester: Parse Telegram proxy URLs (tg:// and t.me/)', () => {
  const url1 = 'tg://proxy?server=149.154.167.50&port=443&secret=dd00000000000000000000000000000000'
  const parsed1 = ProxyHarvester.parseProxyUrl(url1, '@testchannel')
  assert.ok(parsed1)
  assert.equal(parsed1.server, '149.154.167.50')
  assert.equal(parsed1.port, 443)
  assert.equal(parsed1.secret, 'dd00000000000000000000000000000000')
  assert.equal(parsed1.source, '@testchannel')

  const url2 = 'https://t.me/proxy?server=proxy.example.com&port=8443&secret=ee11223344'
  const parsed2 = ProxyHarvester.parseProxyUrl(url2, '@webchannel')
  assert.ok(parsed2)
  assert.equal(parsed2.server, 'proxy.example.com')
  assert.equal(parsed2.port, 8443)
  assert.equal(parsed2.secret, 'ee11223344')

  const invalidUrl = 'https://t.me/joinchat/AbcDefGhi'
  assert.equal(ProxyHarvester.parseProxyUrl(invalidUrl, '@channel'), null)
})

test('ProxyHarvester: Universal 3-Layer Parser from message objects', () => {
  const sampleMsg = {
    text: 'Check this new proxy: tg://proxy?server=10.0.0.1&port=1080&secret=secret1',
    entities: [
      {
        url: 'tg://proxy?server=10.0.0.2&port=2080&secret=secret2'
      }
    ],
    replyMarkup: {
      rows: [
        {
          buttons: [
            {
              url: 'tg://proxy?server=10.0.0.3&port=3080&secret=secret3'
            }
          ]
        }
      ]
    }
  }

  const candidates = ProxyHarvester.extractProxiesFromMessage(sampleMsg, '@multiChannel')
  assert.equal(candidates.length, 3, 'Should extract from text regex, entities, and inline buttons')
  assert.equal(candidates[0].server, '10.0.0.2') // from entity
  assert.equal(candidates[1].server, '10.0.0.3') // from button
  assert.equal(candidates[2].server, '10.0.0.1') // from text regex
})

test('ProxyHarvester: Distribute healthy proxies to multiple accounts', () => {
  // Directly simulate cached proxies for testing distribution
  const candidates = [
    { server: '1.1.1.1', port: 443, secret: 's1', source: '@test' },
    { server: '2.2.2.2', port: 443, secret: 's2', source: '@test' }
  ]

  // Clear and populate
  const cachedMap = ProxyHarvester['cachedProxies']
  cachedMap.clear()
  cachedMap.set('auto_1.1.1.1_443', {
    id: 'auto_1.1.1.1_443',
    name: 'P1',
    type: 'mtproto',
    host: '1.1.1.1',
    port: 443,
    enabled: true,
    pingMs: 120
  })
  cachedMap.set('auto_2.2.2.2_443', {
    id: 'auto_2.2.2.2_443',
    name: 'P2',
    type: 'mtproto',
    host: '2.2.2.2',
    port: 443,
    enabled: true,
    pingMs: 85
  })

  const assignments = ProxyHarvester.distributeProxiesToAccounts(['acc_1', 'acc_2', 'acc_3'])
  assert.equal(assignments.size, 3)
  // Sorted by ping: 2.2.2.2 (85ms) is fastest, then 1.1.1.1 (120ms)
  assert.equal(assignments.get('acc_1')?.host, '2.2.2.2')
  assert.equal(assignments.get('acc_2')?.host, '1.1.1.1')
  assert.equal(assignments.get('acc_3')?.host, '2.2.2.2') // round-robin
})

test('ProxyHarvester: Detailed Health Report telemetry (Layer 11)', () => {
  const cachedMap = ProxyHarvester['cachedProxies']
  cachedMap.clear()

  cachedMap.set('p1', { id: 'p1', name: 'P1', type: 'mtproto', host: '1.1.1.1', port: 443, enabled: true, pingMs: 100 })
  cachedMap.set('p2', { id: 'p2', name: 'P2', type: 'mtproto', host: '2.2.2.2', port: 443, enabled: true, pingMs: 200 })
  cachedMap.set('p3', { id: 'p3', name: 'P3', type: 'mtproto', host: '3.3.3.3', port: 443, enabled: false, pingMs: -1 })

  const health = ProxyHarvester.getDetailedHealth()
  assert.equal(health.total, 3)
  assert.equal(health.healthy, 2)
  assert.equal(health.dead, 1)
  assert.equal(health.minLatencyMs, 100)
  assert.equal(health.maxLatencyMs, 200)
  assert.equal(health.avgLatencyMs, 150)
  assert.equal(health.isScanning, false)
})

test('ProxyHarvester: pingProxy returns -1 safely upon connection failure without leaking', async () => {
  // Ping invalid port on local loopback that refuses connection
  const ping = await ProxyHarvester.pingProxy('127.0.0.1', 65432, 200)
  assert.equal(ping, -1, 'Should fail gracefully and return -1')
})
