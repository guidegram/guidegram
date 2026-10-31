import assert from 'node:assert/strict'
import { CodeSyntaxAndNotificationSilencer } from '../src/services/codeSyntaxAndNotificationSilencer.ts'

console.log('--- [Phase 6: Horizon 1 - Syntax Highlighting & Notification Silencer Verification] ---')

const silencer = CodeSyntaxAndNotificationSilencer.getInstance()

// 1. Test Automatic Code Syntax Highlighting (#250)
console.log('[Test 1] Validating Automatic Code Syntax Highlighting...')
const sampleJs = `
// Initialize database connection
const port = 8080
function connect() {
  return "connected to " + port
}
`
const highlighted = silencer.highlightCode(sampleJs, 'javascript')
assert.ok(highlighted.highlightedHtml.includes('<span class="syntax-keyword">const</span>'), 'Must highlight const keyword')
assert.ok(highlighted.highlightedHtml.includes('<span class="syntax-keyword">function</span>'), 'Must highlight function keyword')
assert.ok(highlighted.highlightedHtml.includes('<span class="syntax-number">8080</span>'), 'Must highlight numeric literal')
assert.ok(highlighted.highlightedHtml.includes('<span class="syntax-string">"connected to "</span>'), 'Must highlight string literal')
assert.ok(highlighted.highlightedHtml.includes('<span class="syntax-comment">// Initialize database connection</span>'), 'Must highlight comment')
assert.equal(silencer.getTelemetry().codeBlocksHighlighted > 0, true, 'Telemetry must count highlighted blocks')
console.log('✅ [Test 1 Passed] Syntax highlighter tokenizes keywords, strings, numbers, and comments.')

// 2. Test Contact Joined Notification Silencer (#964)
console.log('[Test 2] Validating Contact Joined Silencer...')
silencer.setSilenceContactJoined(true)

assert.equal(silencer.shouldSilenceNotification({ actionType: 'contact_registered' }), true, 'Must silence contact_registered service action')
assert.equal(silencer.shouldSilenceNotification({ text: 'علی به تلگرام پیوست!' }), true, 'Must silence Persian contact joined text')
assert.equal(silencer.shouldSilenceNotification({ text: 'Sarah joined Telegram' }), true, 'Must silence English contact joined text')
assert.equal(silencer.shouldSilenceNotification({ text: 'سلام، فایل پروژه را فرستادم' }), false, 'Must NOT silence normal user message')

// Toggle silencer off
silencer.setSilenceContactJoined(false)
assert.equal(silencer.shouldSilenceNotification({ text: 'Sarah joined Telegram' }), false, 'Must not silence when feature is disabled')
console.log('✅ [Test 2 Passed] Contact joined notification silencer correctly filters annoying popups.')

// 3. Test Markdown Blockquotes Parser (#27772)
console.log('[Test 3] Validating Markdown Blockquotes Parser...')
const mdText = `Here is a quote:
> This is a cited blockquote
> with multiple lines
And normal text after.`

const parsedQuotes = silencer.parseMarkdownQuotes(mdText)
assert.ok(parsedQuotes.includes('<blockquote class="guidegram-quote">This is a cited blockquote<br/>with multiple lines</blockquote>'), 'Must wrap > lines in blockquote')
assert.ok(parsedQuotes.includes('And normal text after.'), 'Must retain normal lines')
assert.equal(silencer.getTelemetry().quotesParsed > 0, true, 'Telemetry must count parsed quotes')

console.log('✅ [Test 3 Passed] Markdown blockquotes parser generates compliant blockquote markup.')
console.log('--- ALL PHASE 6 HORIZON 1 VERIFICATION CHECKS PASSED (100% GREEN) ---')
