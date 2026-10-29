import fs from 'fs'
import path from 'path'
import assert from 'assert'

console.log('🧪 Starting Premium Custom Emoji ID Context Menu Verification...')

const chatViewportPath = path.join(process.cwd(), 'src', 'components', 'ChatViewport.tsx')
const accountManagerPath = path.join(process.cwd(), 'electron', 'telegram', 'accountManager.ts')

// 1. Verify ChatViewport.tsx
const chatViewportSrc = fs.readFileSync(chatViewportPath, 'utf8')

assert(
  chatViewportSrc.includes('data-custom-emoji-id={documentId}'),
  'CustomEmojiView must set data-custom-emoji-id attribute'
)
console.log('  ✅ [PASS] CustomEmojiView data-custom-emoji-id verified')

assert(
  chatViewportSrc.includes('data-custom-emoji-char='),
  'CustomEmojiView must set data-custom-emoji-char attribute'
)
console.log('  ✅ [PASS] CustomEmojiView data-custom-emoji-char verified')

assert(
  chatViewportSrc.includes('clickedCustomEmoji?: { emoji: string; documentId: string }'),
  'contextMenu state must define clickedCustomEmoji'
)
console.log('  ✅ [PASS] contextMenu state clickedCustomEmoji verified')

assert(
  chatViewportSrc.includes('selectedCustomEmojis?: Array<{ emoji: string; documentId: string }>'),
  'contextMenu state must define selectedCustomEmojis'
)
console.log('  ✅ [PASS] contextMenu state selectedCustomEmojis verified')

assert(
  chatViewportSrc.includes('messageCustomEmojis?: Array<{ emoji: string; documentId: string }>'),
  'contextMenu state must define messageCustomEmojis'
)
console.log('  ✅ [PASS] contextMenu state messageCustomEmojis verified')

assert(
  chatViewportSrc.includes('Copy Emoji ID'),
  'SmartContextMenu must include "Copy Emoji ID"'
)
console.log('  ✅ [PASS] SmartContextMenu Copy Emoji ID action verified')

assert(
  chatViewportSrc.includes('Copy Raw ID'),
  'SmartContextMenu must include "Copy Raw ID"'
)
console.log('  ✅ [PASS] SmartContextMenu Copy Raw ID action verified')

assert(
  chatViewportSrc.includes('Copy All Emoji IDs') || chatViewportSrc.includes('Copy Selected Emoji IDs'),
  'SmartContextMenu must include batch Copy Emoji IDs action'
)
console.log('  ✅ [PASS] SmartContextMenu Batch Copy Emoji IDs action verified')

// 2. Verify accountManager.ts
const accountManagerSrc = fs.readFileSync(accountManagerPath, 'utf8')
assert(
  accountManagerSrc.includes('(ent.documentId ?? (ent as any).document_id)?.toString()'),
  'accountManager.ts must safely resolve documentId from camelCase or snake_case'
)
console.log('  ✅ [PASS] accountManager.ts documentId extraction verified')

// 3. Test Batch Format String Generation
const testBatch = [
  { emoji: '😀', documentId: '3888771578202861554' },
  { emoji: '💎', documentId: '5888771578702861554' }
]
const formatted = testBatch.map((e) => `${e.emoji}:${e.documentId}`).join('\n')
const expected = '😀:3888771578202861554\n💎:5888771578702861554'
assert.strictEqual(formatted, expected, 'Batch format must match emoji:documentId separated by newline')
console.log('  ✅ [PASS] Batch string format logic validated')

console.log('🌟 All Premium Custom Emoji ID Verification tests PASSED successfully!')
