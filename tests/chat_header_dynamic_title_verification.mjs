import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Phase 105: Chat Header Dynamic Title Transition & Fluid Back-Navigation Verification...\n')

let passedTests = 0
let totalTests = 0

function assert(condition, message) {
  totalTests++
  if (condition) {
    console.log(`✅ PASS: ${message}`)
    passedTests++
  } else {
    console.error(`❌ FAIL: ${message}`)
    process.exitCode = 1
  }
}

// 1. Inspect src/index.css
const indexCssPath = path.join(rootDir, 'src', 'index.css')
const indexCss = fs.readFileSync(indexCssPath, 'utf8')

assert(
  indexCss.includes('.chat-header-fluid'),
  'index.css defines .chat-header-fluid utility'
)
assert(
  indexCss.includes('.typing-pulse-dot'),
  'index.css defines .typing-pulse-dot utility'
)
assert(
  indexCss.includes('@keyframes typingDotPulse'),
  'index.css defines @keyframes typingDotPulse animation'
)

// 2. Inspect src/components/ChatViewport.tsx
const chatViewportPath = path.join(rootDir, 'src', 'components', 'ChatViewport.tsx')
const chatViewport = fs.readFileSync(chatViewportPath, 'utf8')

assert(
  chatViewport.includes('chat-header-fluid'),
  'ChatViewport applies chat-header-fluid to header profile button'
)
assert(
  chatViewport.includes('key={`header-avatar-${chat.id}`}') &&
  chatViewport.includes('transition={{ type: \'spring\', stiffness: 500, damping: 28 }}'),
  'ChatViewport wraps header Avatar in spring animated motion.div'
)
assert(
  chatViewport.includes('<AnimatePresence mode="wait" initial={false}>'),
  'ChatViewport encapsulates header meta in AnimatePresence with wait mode'
)
assert(
  chatViewport.includes('key={`header-meta-${chat.id}`}'),
  'ChatViewport uses keyed meta container for chat switching cross-fade'
)
assert(
  chatViewport.includes('initial={{ opacity: 0, y: 3 }}') &&
  chatViewport.includes('exit={{ opacity: 0, y: -3 }}'),
  'ChatViewport configures subtle y-axis spring cross-fade transitions'
)
assert(
  chatViewport.includes("transition={{ type: 'spring', stiffness: 450, damping: 30, mass: 0.6 }}"),
  'ChatViewport calibrates high-velocity spring parameters for instantaneous title feel'
)
assert(
  chatViewport.includes('typing-pulse-dot'),
  'ChatViewport applies typing-pulse-dot to typing status dots'
)

console.log(`\n📊 Verification Summary: ${passedTests}/${totalTests} tests passed.\n`)

if (passedTests === totalTests) {
  console.log('🎉 Phase 105 verification passed with 100% header fluidity!')
} else {
  console.error(`⚠️ ${totalTests - passedTests} tests failed!`)
  process.exit(1)
}
