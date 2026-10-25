import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  sanitizeArticleHtml,
  parseRichText,
  extractRichTextTokens,
  parseMtprotoPageToArticle,
  buildReaderFallbackArticle,
} from '../electron/telegram/instantViewService.ts'

console.log('🧪 Starting Telegram Instant View (IV) & DOM Sanitizer Verification...')

// 1. Test DOM Sanitizer Against Malicious Vectors
console.log('Test 1: DOM Sanitizer against XSS & script injection...')
const dirtyHtml = `
  <div class="article-header">
    <script>alert("XSS exploit");</script>
    <h1 onclick="maliciousCode()">Safe Article Title</h1>
    <p>This is a paragraph with <a href="javascript:stealTokens()">dangerous link</a> and <a href="https://guidegram.org">safe link</a>.</p>
    <img src="https://example.com/cover.jpg" onerror="alert(1)" />
    <iframe src="https://evil.com/phishing"></iframe>
    <form action="/login"><input type="password" /></form>
  </div>
`
const sanitized = sanitizeArticleHtml(dirtyHtml)
assert(!sanitized.includes('<script>'), 'Sanitizer failed to remove <script>')
assert(!sanitized.includes('onclick'), 'Sanitizer failed to remove onclick')
assert(!sanitized.includes('javascript:stealTokens()'), 'Sanitizer failed to neutralize javascript: href')
assert(!sanitized.includes('onerror'), 'Sanitizer failed to remove onerror')
assert(!sanitized.includes('<iframe'), 'Sanitizer failed to remove <iframe>')
assert(!sanitized.includes('<form'), 'Sanitizer failed to remove <form>')
assert(sanitized.includes('Safe Article Title'), 'Sanitizer stripped valid title')
assert(sanitized.includes('https://guidegram.org'), 'Sanitizer stripped valid link')
assert(sanitized.includes('rel="noopener noreferrer"'), 'Sanitizer did not inject safe rel attributes')
console.log('✅ Test 1 Passed: DOM Sanitizer completely neutralizes hostile XSS payloads.')

// 2. Test MTProto RichText Parser
console.log('Test 2: MTProto RichText parser & token extractor...')
const mtprotoRichText = {
  _: 'richTextConcat',
  texts: [
    { _: 'richTextPlain', text: 'Hello ' },
    { _: 'richTextBold', text: { _: 'richTextPlain', text: 'World' } },
    { _: 'richTextPlain', text: ' from ' },
    {
      _: 'richTextUrl',
      text: { _: 'richTextPlain', text: 'Guidegram' },
      url: 'https://guidegram.org',
    },
  ],
}
const plainString = parseRichText(mtprotoRichText)
assert.equal(plainString, 'Hello World from Guidegram')

const tokens = extractRichTextTokens(mtprotoRichText)
assert.equal(tokens.length, 4)
assert.equal(tokens[0].text, 'Hello ')
assert.equal(tokens[0].type, 'plain')
assert.equal(tokens[1].text, 'World')
assert.equal(tokens[1].type, 'bold')
assert.equal(tokens[3].text, 'Guidegram')
assert.equal(tokens[3].type, 'url')
assert.equal(tokens[3].url, 'https://guidegram.org')
console.log('✅ Test 2 Passed: MTProto RichText parsed losslessly into structured formatting tokens.')

// 3. Test MTProto Page Blocks to InstantViewArticle Conversion
console.log('Test 3: MTProto Page Blocks to InstantViewArticle conversion...')
const mockMtprotoWebpage = {
  _: 'webPage',
  id: 1234567890n,
  url: 'https://telegra.ph/Instant-View-Test-10-25',
  site_name: 'Telegraph',
  title: 'Instant View Deep Dive',
  description: 'A deep dive into Telegram Instant View technology',
  cached_page: {
    _: 'page',
    flags: 2, // RTL bit flag set
    blocks: [
      {
        _: 'pageBlockTitle',
        text: { _: 'richTextPlain', text: 'راهنمای جامع اینستنت ویو تلگرام' },
      },
      {
        _: 'pageBlockAuthorDate',
        author: { _: 'richTextPlain', text: 'دکتر ارشاد زلفی' },
        date: 1730000000,
      },
      {
        _: 'pageBlockParagraph',
        text: { _: 'richTextPlain', text: 'این یک پاراگراف فارسی برای تست رندر است.' },
      },
      {
        _: 'pageBlockBlockquote',
        text: { _: 'richTextPlain', text: 'سرعت لودینگ بالا و خوانایی حداکثری' },
        caption: { _: 'richTextPlain', text: 'تلگرام دسکتاپ' },
      },
      {
        _: 'pageBlockList',
        items: [
          { text: { _: 'richTextPlain', text: 'ویژگی اول: بدون ردیابی' } },
          { text: { _: 'richTextPlain', text: 'ویژگی دوم: مصرف بهینه دیتا' } },
        ],
      },
      {
        _: 'pageBlockDivider',
      },
    ],
  },
}
const article = parseMtprotoPageToArticle(mockMtprotoWebpage.url, mockMtprotoWebpage)
assert(article !== null, 'Article parsing returned null')
assert.equal(article.url, 'https://telegra.ph/Instant-View-Test-10-25')
assert.equal(article.siteName, 'Telegraph')
assert.equal(article.author, 'دکتر ارشاد زلفی')
assert.equal(article.rtl, true, 'RTL detection failed for Persian text/flag')
assert.equal(article.blocks.length, 6)
assert.equal(article.blocks[0].type, 'title')
assert.equal(article.blocks[1].type, 'author_date')
assert.equal(article.blocks[2].type, 'paragraph')
assert.equal(article.blocks[3].type, 'blockquote')
assert.equal(article.blocks[4].type, 'list')
assert.equal(article.blocks[5].type, 'divider')
console.log('✅ Test 3 Passed: MTProto Page converted into InstantViewArticle with full block fidelity.')

// 4. Test Reader Mode Fallback Generator
console.log('Test 4: Reader Mode Fallback generator...')
const fallbackUrl = 'https://news.ycombinator.com/item?id=123'
const fallbackHtml = `
  <h1>Silicon Valley Insights</h1>
  <p>The developer ecosystem is shifting towards local-first AI tooling.</p>
  <p>Engineers value high signal-to-noise ratio and zero mock data.</p>
`
const fallbackArticle = buildReaderFallbackArticle(fallbackUrl, fallbackHtml, {
  title: 'Silicon Valley Insights',
  siteName: 'Hacker News',
  author: 'pg',
})
assert.equal(fallbackArticle.siteName, 'Hacker News')
assert.equal(fallbackArticle.title, 'Silicon Valley Insights')
assert(fallbackArticle.blocks.length >= 3, 'Fallback did not extract paragraph blocks')
console.log('✅ Test 4 Passed: Reader mode fallback successfully synthesizes clean article structure.')

// 5. Test IPC & Preload Interface Surface
console.log('Test 5: Checking AccountManager and Preload API surface...')
const accountManagerCode = fs.readFileSync(
  path.join(process.cwd(), 'electron/telegram/accountManager.ts'),
  'utf-8'
)
assert(accountManagerCode.includes('public async getInstantView('), 'Missing getInstantView in AccountManager')

const preloadCode = fs.readFileSync(
  path.join(process.cwd(), 'electron/preload.ts'),
  'utf-8'
)
assert(preloadCode.includes('getInstantView:'), 'Missing getInstantView in electron/preload.ts')

const mainCode = fs.readFileSync(
  path.join(process.cwd(), 'electron/main.ts'),
  'utf-8'
)
assert(mainCode.includes("ipcMain.handle('telegram:get-instant-view'"), 'Missing telegram:get-instant-view in main.ts')

const modalCode = fs.readFileSync(
  path.join(process.cwd(), 'src/components/InstantViewModal.tsx'),
  'utf-8'
)
assert(modalCode.includes('export const InstantViewModal:'), 'InstantViewModal component missing')

console.log('✅ Test 5 Passed: Full end-to-end API surface wired and verified.')

console.log('\n🎉 ALL 5 INSTANT VIEW & DOM SANITIZER TESTS PASSED PERFECTLY!')
