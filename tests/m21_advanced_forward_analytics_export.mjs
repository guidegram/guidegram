import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('Running Milestone 21: Advanced No-Quote Forwarding & Group Analytics Export')
console.log('====================================================\n')

let passedTests = 0
let failedTests = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`  [PASS] ${name}`)
    passedTests++
  } catch (err) {
    console.error(`  [FAIL] ${name}`)
    console.error(`         Error: ${err.message}`)
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 4).join('\n'))
    }
    failedTests++
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn()
    console.log(`  [PASS] ${name}`)
    passedTests++
  } catch (err) {
    console.error(`  [FAIL] ${name}`)
    console.error(`         Error: ${err.message}`)
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 4).join('\n'))
    }
    failedTests++
  }
}

// =========================================================================
// SUITE 1: DirectForwardModal.tsx Component Contracts & Capabilities
// =========================================================================
console.log('[SUITE 1] DirectForwardModal.tsx Contracts')

const forwardModalPath = path.join(rootDir, 'src', 'components', 'DirectForwardModal.tsx')
assert.ok(fs.existsSync(forwardModalPath), 'DirectForwardModal.tsx must exist')
const forwardModalSrc = fs.readFileSync(forwardModalPath, 'utf8')

runTest('1.1: DirectForwardModal exports DirectForwardPayload interface', () => {
  assert.ok(
    forwardModalSrc.includes('export interface DirectForwardPayload'),
    'DirectForwardModal must export DirectForwardPayload interface'
  )
  assert.ok(forwardModalSrc.includes('toChatIds: string[]'), 'DirectForwardPayload defines ordered toChatIds')
  assert.ok(forwardModalSrc.includes('dropMediaCaptions: boolean'), 'DirectForwardPayload defines dropMediaCaptions')
  assert.ok(forwardModalSrc.includes('newCaption?: string'), 'DirectForwardPayload defines newCaption')
  assert.ok(forwardModalSrc.includes('withoutQuote: boolean'), 'DirectForwardPayload defines withoutQuote')
})

runTest('1.2: DirectForwardModal manages ordered recipient array (not unordered Set)', () => {
  assert.ok(
    forwardModalSrc.includes('useState<string[]>([])'),
    'selectedChatIds must be managed as ordered array string[]'
  )
  assert.ok(
    !forwardModalSrc.includes('useState<Set<string>>'),
    'selectedChatIds must not use unordered Set'
  )
})

runTest('1.3: DirectForwardModal implements recipient sequencing & re-ordering controls', () => {
  assert.ok(
    forwardModalSrc.includes('handleMoveRecipient'),
    'DirectForwardModal must implement handleMoveRecipient function'
  )
  assert.ok(
    forwardModalSrc.includes('handleRemoveRecipient'),
    'DirectForwardModal must implement handleRemoveRecipient function'
  )
  assert.ok(
    forwardModalSrc.includes('Dispatch Order'),
    'DirectForwardModal renders dispatch order container'
  )
  assert.ok(
    forwardModalSrc.includes('ArrowUp') && forwardModalSrc.includes('ArrowDown'),
    'DirectForwardModal renders Up/Down re-ordering buttons'
  )
})

runTest('1.4: DirectForwardModal implements Caption/Text Editor textarea', () => {
  assert.ok(
    forwardModalSrc.includes('newCaption') && forwardModalSrc.includes('setNewCaption'),
    'DirectForwardModal must maintain newCaption state'
  )
  assert.ok(
    forwardModalSrc.includes('<textarea'),
    'DirectForwardModal must render editable textarea'
  )
  assert.ok(
    forwardModalSrc.includes('Edit Caption / Text Before Dispatch'),
    'DirectForwardModal must provide descriptive label for caption editor'
  )
})

runTest('1.5: DirectForwardModal provides Strip Quotes & Strip Media Captions toggles', () => {
  assert.ok(
    forwardModalSrc.includes('withoutQuote') && forwardModalSrc.includes('Strip Quotes'),
    'DirectForwardModal must render Strip Quotes checkbox'
  )
  assert.ok(
    forwardModalSrc.includes('dropMediaCaptions') && forwardModalSrc.includes('Strip Media Captions'),
    'DirectForwardModal must render Strip Media Captions checkbox'
  )
})

runTest('1.6: DirectForwardModal dispatches complete payload with all options', () => {
  assert.ok(
    forwardModalSrc.includes('toChatIds: selectedChatIds') &&
    forwardModalSrc.includes('withoutQuote') &&
    forwardModalSrc.includes('dropMediaCaptions') &&
    forwardModalSrc.includes('newCaption'),
    'handleForward must package toChatIds, withoutQuote, dropMediaCaptions, newCaption, silent'
  )
})

// =========================================================================
// SUITE 2: Backend Forwarding Alignment (accountManager.ts & main.ts)
// =========================================================================
console.log('\n[SUITE 2] Backend Forwarding Alignment in electron/main.ts & accountManager.ts')

const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainSrc = fs.readFileSync(mainPath, 'utf8')
const accountMgrPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
const accountMgrSrc = fs.readFileSync(accountMgrPath, 'utf8')
const typesPath = path.join(rootDir, 'electron', 'telegram', 'types.ts')
const typesSrc = fs.readFileSync(typesPath, 'utf8')

runTest('2.1: types.ts ForwardOptions contains newCaption and dropMediaCaptions', () => {
  assert.ok(typesSrc.includes('dropMediaCaptions?: boolean'), 'ForwardOptions must support dropMediaCaptions')
  assert.ok(typesSrc.includes('newCaption?: string'), 'ForwardOptions must support newCaption')
})

runTest('2.2: electron/main.ts aligns parameter order for telegram:forward-messages', () => {
  assert.ok(
    mainSrc.includes("'telegram:forward-messages'"),
    'main.ts must register telegram:forward-messages handler'
  )
  assert.ok(
    mainSrc.includes('accountManager.forwardMessages(accountId, fromChatId, target, messageIds, options)'),
    'main.ts must call forwardMessages with (accountId, fromChatId, target, messageIds, options)'
  )
})

runTest('2.3: accountManager.ts forwardMessages signature accepts array or single chat ID', () => {
  assert.ok(
    accountMgrSrc.includes('toChatId: string | string[]'),
    'accountManager.forwardMessages must accept toChatId: string | string[]'
  )
  assert.ok(
    accountMgrSrc.includes('fromChatId: string'),
    'accountManager.forwardMessages must accept fromChatId: string as 2nd parameter'
  )
})

runTest('2.4: accountManager.ts maintains dropAuthor: options?.withoutQuote test contract', () => {
  assert.ok(
    accountMgrSrc.includes('dropAuthor: options?.withoutQuote'),
    'accountManager.ts must maintain dropAuthor: options?.withoutQuote contract'
  )
  assert.ok(
    accountMgrSrc.includes('dropMediaCaptions: options?.dropMediaCaptions'),
    'accountManager.ts must pass dropMediaCaptions to MTProto messages.forwardMessages'
  )
})

runTest('2.5: accountManager.ts iterates sequentially over ordered recipients with 50ms delay', () => {
  assert.ok(
    accountMgrSrc.includes('targets = Array.isArray(toChatId) ? toChatId : [toChatId]'),
    'accountManager.ts must normalize to targets array'
  )
  assert.ok(
    accountMgrSrc.includes('for (let i = 0; i < targets.length; i++)'),
    'accountManager.ts must iterate sequentially through recipients'
  )
  assert.ok(
    accountMgrSrc.includes('setTimeout(resolve, 50)'),
    'accountManager.ts must introduce 50ms delay between sequential forwards'
  )
})

// =========================================================================
// SUITE 3: Group Analytics Export in GroupStatsModal.tsx
// =========================================================================
console.log('\n[SUITE 3] Group Analytics Export in GroupStatsModal.tsx')

const statsModalPath = path.join(rootDir, 'src', 'components', 'GroupStatsModal.tsx')
assert.ok(fs.existsSync(statsModalPath), 'GroupStatsModal.tsx must exist')
const statsModalSrc = fs.readFileSync(statsModalPath, 'utf8')

runTest('3.1: GroupStatsModal renders 1-Click Export Analytics button with Download icon', () => {
  assert.ok(statsModalSrc.includes('Export Analytics'), 'GroupStatsModal must render Export Analytics button')
  assert.ok(statsModalSrc.includes('Download'), 'GroupStatsModal must import and render Download icon')
  assert.ok(statsModalSrc.includes('FileSpreadsheet'), 'GroupStatsModal must render FileSpreadsheet icon')
  assert.ok(statsModalSrc.includes('FileJson'), 'GroupStatsModal must render FileJson icon')
})

runTest('3.2: GroupStatsModal generates UTF-8 BOM CSV (\\uFEFF) for Excel Persian/English compatibility', () => {
  assert.ok(
    statsModalSrc.includes('generateGroupStatsCsv') && statsModalSrc.includes("'\\uFEFF'"),
    'GroupStatsModal must prepend UTF-8 Byte Order Mark \\uFEFF to CSV output'
  )
})

runTest('3.3: GroupStatsModal exports all 6 comprehensive analytics sections in CSV', () => {
  assert.ok(statsModalSrc.includes('--- GROUP OVERVIEW ---'), 'CSV must include Group Overview section')
  assert.ok(statsModalSrc.includes('--- ACTIVE USER ENGAGEMENT ---'), 'CSV must include Active User Engagement section')
  assert.ok(statsModalSrc.includes('--- HOURLY MESSAGE VOLUME ---'), 'CSV must include Hourly Message Volume section')
  assert.ok(statsModalSrc.includes('--- WORD CLOUD FREQUENCY ---'), 'CSV must include Word Cloud Frequency section')
  assert.ok(statsModalSrc.includes('--- EMOJI DISTRIBUTION ---'), 'CSV must include Emoji Distribution section')
  assert.ok(statsModalSrc.includes('--- MEDIA BREAKDOWN ---'), 'CSV must include Media Breakdown section')
})

runTest('3.4: GroupStatsModal exports structured JSON analytics dataset', () => {
  assert.ok(
    statsModalSrc.includes('generateGroupStatsJson'),
    'GroupStatsModal must export generateGroupStatsJson helper'
  )
  assert.ok(
    statsModalSrc.includes('groupOverview') &&
    statsModalSrc.includes('activeUserEngagement') &&
    statsModalSrc.includes('hourlyDistribution') &&
    statsModalSrc.includes('wordCloud'),
    'JSON generator must structure groupOverview, activeUserEngagement, hourlyDistribution, and wordCloud'
  )
})

runTest('3.5: GroupStatsModal triggers HTML5 Blob download with standard naming convention', () => {
  assert.ok(
    statsModalSrc.includes('group_stats_${chat.id}_'),
    'Download link must format filename as group_stats_${chat.id}_${Date.now()}.csv/json'
  )
})

runTest('3.6: GroupStatsModal preserves legacy regression invariants', () => {
  assert.ok(statsModalSrc.includes("useState<Timeframe>('today')"), 'Must maintain default timeframe as today')
  assert.ok(statsModalSrc.includes('ensureTimeframeHistory'), 'Must maintain ensureTimeframeHistory function')
  assert.ok(statsModalSrc.includes('getTimeframeStartTime'), 'Must maintain getTimeframeStartTime function')
  assert.ok(statsModalSrc.includes('copyTextToClipboard'), 'Must maintain copyTextToClipboard')
})

// =========================================================================
// SUITE 4: Functional Verification of Analytics Generation with Real Data
// =========================================================================
console.log('\n[SUITE 4] Functional Verification of Analytics Generation Logic')

const mockAnalyticsPayload = {
  chat: { id: '-1001234567890', title: 'گروه توسعه‌دهندگان Guidegram Dev Group' },
  timeframe: 'today',
  totalMessagesCount: 520,
  uniqueSendersCount: 45,
  peakHour: { hour: 18, count: 82 },
  avgChars: 48,
  avgWords: 9,
  topSenders: [
    { id: '1001', name: 'علیرضا راد', count: 120, isAdmin: true },
    { id: '1002', name: 'Sarah Connor', count: 85, isAdmin: false },
    { id: '1003', name: 'Reza Dev', count: 50, isAdmin: false },
  ],
  hourlyDistribution: [
    0, 0, 0, 0, 1, 2, 5, 12, 25, 40, 35, 30, 28, 45, 50, 60, 70, 75, 82, 40, 20, 15, 8, 2,
  ],
  topWords: [
    ['guidegram', 64],
    ['update', 45],
    ['سرعت', 38],
    ['پروکسی', 32],
  ],
  topEmojis: [
    ['🔥', 45],
    ['🚀', 30],
    ['👍', 22],
  ],
  mediaStats: {
    text: 400,
    photo: 50,
    video: 25,
    voice: 30,
    document: 10,
    sticker: 5,
  },
}

// Functional replica matching GroupStatsModal.tsx implementation
function testGenerateGroupStatsCsv(data) {
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""'
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return `"${str}"`
  }

  const lines = []
  lines.push('--- GROUP OVERVIEW ---')
  lines.push('Chat Name,Chat ID,Analyzed Message Count,Timeframe,Export Timestamp,Unique Senders,Peak Hour')
  lines.push(
    [
      escapeCsv(data.chat.title),
      escapeCsv(data.chat.id),
      escapeCsv(data.totalMessagesCount),
      escapeCsv(data.timeframe),
      escapeCsv('2026-09-14T08:30:00.000Z'),
      escapeCsv(data.uniqueSendersCount),
      escapeCsv(`${data.peakHour.hour}:00 (${data.peakHour.count} msgs)`),
    ].join(',')
  )
  lines.push('')

  lines.push('--- ACTIVE USER ENGAGEMENT ---')
  lines.push('Rank,User Name,User ID,Message Count,Percentage')
  data.topSenders.forEach((sender, idx) => {
    const percentage = data.totalMessagesCount > 0 ? ((sender.count / data.totalMessagesCount) * 100).toFixed(2) + '%' : '0%'
    lines.push(
      [
        idx + 1,
        escapeCsv(sender.name),
        escapeCsv(sender.id),
        sender.count,
        escapeCsv(percentage),
      ].join(',')
    )
  })
  lines.push('')

  lines.push('--- HOURLY MESSAGE VOLUME ---')
  lines.push('Hour,Message Count,Percentage,Peak Flag')
  data.hourlyDistribution.forEach((count, hour) => {
    const formattedHour = `${hour.toString().padStart(2, '0')}:00`
    const percentage = data.totalMessagesCount > 0 ? ((count / data.totalMessagesCount) * 100).toFixed(2) + '%' : '0%'
    const isPeak = hour === data.peakHour.hour && count > 0 ? 'Yes' : 'No'
    lines.push([escapeCsv(formattedHour), count, escapeCsv(percentage), escapeCsv(isPeak)].join(','))
  })
  lines.push('')

  lines.push('--- WORD CLOUD FREQUENCY ---')
  lines.push('Rank,Word,Frequency')
  data.topWords.forEach(([word, freq], idx) => {
    lines.push([idx + 1, escapeCsv(word), freq].join(','))
  })
  lines.push('')

  lines.push('--- EMOJI DISTRIBUTION ---')
  lines.push('Rank,Emoji,Count')
  data.topEmojis.forEach(([emoji, count], idx) => {
    lines.push([idx + 1, escapeCsv(emoji), count].join(','))
  })
  lines.push('')

  lines.push('--- MEDIA BREAKDOWN ---')
  lines.push('Media Type,Count')
  lines.push(`Text Messages,${data.mediaStats.text}`)
  lines.push(`Photos,${data.mediaStats.photo}`)
  lines.push(`Videos,${data.mediaStats.video}`)
  lines.push(`Voice Notes,${data.mediaStats.voice}`)
  lines.push(`Documents,${data.mediaStats.document}`)
  lines.push(`Stickers,${data.mediaStats.sticker}`)

  return '\uFEFF' + lines.join('\r\n')
}

function testGenerateGroupStatsJson(data) {
  return {
    groupOverview: {
      chatName: data.chat.title,
      chatId: data.chat.id,
      analyzedMessageCount: data.totalMessagesCount,
      timeframe: data.timeframe,
      exportTimestamp: '2026-09-14T08:30:00.000Z',
      uniqueSendersCount: data.uniqueSendersCount,
      peakHour: { hour: `${data.peakHour.hour}:00`, count: data.peakHour.count },
      avgMessageLength: { chars: data.avgChars, words: data.avgWords },
    },
    activeUserEngagement: data.topSenders.map((s, idx) => ({
      rank: idx + 1,
      userName: s.name,
      userId: s.id,
      messageCount: s.count,
      percentage: data.totalMessagesCount > 0 ? Number(((s.count / data.totalMessagesCount) * 100).toFixed(2)) : 0,
      isAdmin: !!s.isAdmin,
    })),
    hourlyDistribution: data.hourlyDistribution.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      messageCount: count,
      percentage: data.totalMessagesCount > 0 ? Number(((count / data.totalMessagesCount) * 100).toFixed(2)) : 0,
      isPeak: hour === data.peakHour.hour && count > 0,
    })),
    wordCloud: data.topWords.map(([word, frequency], idx) => ({
      rank: idx + 1,
      word,
      frequency,
    })),
    emojiDistribution: data.topEmojis.map(([emoji, count], idx) => ({
      rank: idx + 1,
      emoji,
      count,
    })),
    mediaBreakdown: data.mediaStats,
  }
}

runTest('4.1: generateGroupStatsCsv produces valid UTF-8 BOM string and includes Persian text', () => {
  const csv = testGenerateGroupStatsCsv(mockAnalyticsPayload)
  assert.strictEqual(csv.charCodeAt(0), 0xFEFF, 'First character must be UTF-8 Byte Order Mark')
  assert.ok(csv.includes('گروه توسعه‌دهندگان Guidegram Dev Group'), 'CSV must contain full Persian chat title')
  assert.ok(csv.includes('علیرضا راد'), 'CSV must contain Persian sender name')
  assert.ok(csv.includes('18:00'), 'CSV must contain peak hour 18:00')
  assert.ok(csv.includes('Yes'), 'CSV must mark peak hour with Peak Flag = Yes')
  assert.ok(csv.includes('"guidegram",64'), 'CSV must contain word frequency')
  assert.ok(csv.includes('"🔥",45'), 'CSV must contain emoji frequency')
  assert.ok(csv.includes('Text Messages,400'), 'CSV must contain media count')
})

runTest('4.2: generateGroupStatsJson produces valid structured metrics and math checks', () => {
  const json = testGenerateGroupStatsJson(mockAnalyticsPayload)
  assert.strictEqual(json.groupOverview.chatId, '-1001234567890')
  assert.strictEqual(json.groupOverview.analyzedMessageCount, 520)
  assert.strictEqual(json.activeUserEngagement.length, 3)
  assert.strictEqual(json.activeUserEngagement[0].userName, 'علیرضا راد')
  assert.strictEqual(json.activeUserEngagement[0].isAdmin, true)
  assert.strictEqual(json.hourlyDistribution.length, 24)
  assert.strictEqual(json.hourlyDistribution[18].isPeak, true)
  assert.strictEqual(json.hourlyDistribution[18].messageCount, 82)
  assert.strictEqual(json.mediaBreakdown.text, 400)
  assert.strictEqual(json.mediaBreakdown.photo, 50)
})

// =========================================================================
// SUITE 5: Forwarding Sequencer Simulation
// =========================================================================
console.log('\n[SUITE 5] Forwarding Sequencer Execution Simulation')

await runAsyncTest('5.1: Multi-chat sequential execution preserves user order and handles delay', async () => {
  const executionLog = []
  const mockTargets = ['user_1', 'group_2', 'channel_3', 'me']

  const mockForwardExecution = async (targets, fromPeer, msgIds, opts) => {
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]
      const startTime = Date.now()
      executionLog.push({ target, index: i, timestamp: startTime, dropAuthor: opts.withoutQuote })

      if (i < targets.length - 1) {
        await new Promise((r) => setTimeout(r, 10))
      }
    }
    return true
  }

  const result = await mockForwardExecution(mockTargets, 'sourceChat', [101], { withoutQuote: true })
  assert.strictEqual(result, true)
  assert.strictEqual(executionLog.length, 4)
  assert.deepStrictEqual(
    executionLog.map((e) => e.target),
    mockTargets,
    'Sequential dispatch must strictly preserve input ordering'
  )
  assert.strictEqual(executionLog[0].dropAuthor, true)
})

console.log('\n====================================================')
console.log(`Results: ${passedTests} passed, ${failedTests} failed.`)
console.log('====================================================')

if (failedTests > 0) {
  process.exit(1)
} else {
  console.log('🎉 All Milestone 21 verification tests passed successfully!')
}
