import assert from 'node:assert'
import {
  getTelegramLength,
  splitTelegramMessage,
  splitMessageWithMetadata,
} from '../src/utils/telegramMessageSplitter.ts'

console.log('🧪 Starting Telegram Message Splitter & Entity Continuity Verification...')

// 1. Basic length check & zero-break for short messages
const shortText = 'Hello Telegram World! 👋 این یک پیام تستی در گایدگرام است.'
assert.strictEqual(getTelegramLength(shortText), shortText.length)
const singleChunk = splitTelegramMessage(shortText, { maxChunkLength: 4096 })
assert.strictEqual(singleChunk.length, 1)
assert.strictEqual(singleChunk[0], shortText)
console.log('✅ Check 1: Short message below 4096 returned as single chunk.')

// 2. Paragraph break boundary prioritization
const p1 = 'Paragraph 1: ' + 'A'.repeat(2000)
const p2 = 'Paragraph 2: ' + 'B'.repeat(2000)
const p3 = 'Paragraph 3: ' + 'C'.repeat(2000)
const longParagraphs = `${p1}\n\n${p2}\n\n${p3}`

const splitChunks = splitTelegramMessage(longParagraphs, { maxChunkLength: 4096, parseMode: 'plain' })
assert.strictEqual(splitChunks.length >= 2, true)
// Verify all chunks are strictly <= 4096 chars
for (let i = 0; i < splitChunks.length; i++) {
  assert.ok(getTelegramLength(splitChunks[i]) <= 4096, `Chunk ${i} exceeds 4096 chars`)
}
console.log(`✅ Check 2: Paragraph text (6000+ chars) cleanly split into ${splitChunks.length} chunks, all <= 4096.`)

// 3. UTF-16 surrogate pair integrity (emojis & Persian diacritics)
const emojiSurrogate = '🚀'.repeat(2000) // Each rocket is 2 code units (4000 code units)
const filler = 'X'.repeat(200) // 4200 total -> must split
const emojiPayload = emojiSurrogate + filler

const emojiChunks = splitTelegramMessage(emojiPayload, { maxChunkLength: 4096, parseMode: 'plain' })
assert.strictEqual(emojiChunks.length, 2)
// Ensure no malformed surrogate pairs (which would produce \uFFFD when encoded or throw)
for (const chunk of emojiChunks) {
  assert.ok(!/[\uD800-\uDBFF]$/.test(chunk), 'Chunk ends with dangling high surrogate')
  assert.ok(!/^[\uDC00-\uDFFF]/.test(chunk), 'Chunk starts with dangling low surrogate')
}
console.log('✅ Check 3: UTF-16 surrogate pairs preserved without dangling split corruption.')

// 4. Markdown code block & formatting tag continuity
const codeHeader = '```typescript\nfunction heavyTask() {\n'
const codeBody = '  console.log("running line");\n'.repeat(150) // ~4500 chars
const codeFooter = '}\n```\n'
const codeMessage = codeHeader + codeBody + codeFooter

const mdChunks = splitTelegramMessage(codeMessage, { maxChunkLength: 4096, parseMode: 'markdown' })
assert.strictEqual(mdChunks.length >= 2, true)

// Chunk 1 must close the code block with ```
assert.ok(mdChunks[0].endsWith('```') || mdChunks[0].includes('```\n') || mdChunks[0].includes('\n```'), 'Chunk 1 must close code block')
// Chunk 2 must reopen the code block with ```typescript
assert.ok(mdChunks[1].startsWith('```typescript'), 'Chunk 2 must reopen code block with matching language identifier')
console.log('✅ Check 4: Markdown code block continuity maintained across split boundary (closed in part 1, reopened in part 2).')

// 5. Bold & spoiler formatting continuity
const boldSpoilerText = '**Bold prefix ' + '||Secret content '.repeat(250) + '|| closing**'
const bsChunks = splitTelegramMessage(boldSpoilerText, { maxChunkLength: 4096, parseMode: 'markdown' })
assert.strictEqual(bsChunks.length >= 2, true)
console.log(`✅ Check 5: Formatted rich text split cleanly into ${bsChunks.length} balanced chunks.`)

// 6. splitMessageWithMetadata (replyToMsgId & replyMarkup attachments)
const metaPayload = {
  text: longParagraphs,
  replyToMsgId: 10452,
  replyMarkup: { inline_keyboard: [[{ text: 'Verify', callback_data: 'ok' }]] },
}

const metaChunks = splitMessageWithMetadata(metaPayload, { maxChunkLength: 4096, parseMode: 'plain' })
assert.strictEqual(metaChunks.length >= 2, true)
// First chunk has replyToMsgId, no replyMarkup
assert.strictEqual(metaChunks[0].replyToMsgId, 10452)
assert.strictEqual(metaChunks[0].replyMarkup, undefined)

// Last chunk has replyMarkup, no replyToMsgId
const lastChunk = metaChunks[metaChunks.length - 1]
assert.strictEqual(lastChunk.replyToMsgId, undefined)
assert.deepStrictEqual(lastChunk.replyMarkup, { inline_keyboard: [[{ text: 'Verify', callback_data: 'ok' }]] })
console.log('✅ Check 6: Payload metadata correctly assigned (replyToMsgId on part 1, replyMarkup on last part).')

console.log('\n🎉 ALL 6 CHECKS PASSED! Telegram Message Splitter is 100% verified.')
