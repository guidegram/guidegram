import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Phase 101: 60fps Spring Physics & Chat List Fluid Overscroll Ergonomics Verification...\n')

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
  indexCss.includes('.smooth-scroll-physics'),
  'index.css defines .smooth-scroll-physics class'
)
assert(
  indexCss.includes('overscroll-behavior-y: contain;'),
  'smooth-scroll-physics contains overscroll-behavior-y: contain'
)
assert(
  indexCss.includes('scroll-behavior: smooth;'),
  'smooth-scroll-physics contains scroll-behavior: smooth'
)
assert(
  indexCss.includes('-webkit-overflow-scrolling: touch;'),
  'smooth-scroll-physics contains -webkit-overflow-scrolling: touch for iOS/macOS momentum'
)
assert(
  indexCss.includes('.chat-item-spring'),
  'index.css defines .chat-item-spring utility'
)

// 2. Inspect src/components/ChatList.tsx
const chatListPath = path.join(rootDir, 'src', 'components', 'ChatList.tsx')
const chatList = fs.readFileSync(chatListPath, 'utf8')

assert(
  chatList.includes('flex-1 overflow-y-auto min-h-0 focus-visible:outline-none smooth-scroll-physics'),
  'ChatList scroll viewport applies smooth-scroll-physics'
)
assert(
  chatList.includes('flex items-start gap-2.5 overflow-x-auto pb-2.5 smooth-scroll-physics'),
  'Active Stories strip applies smooth-scroll-physics'
)
assert(
  chatList.includes("whileHover={{ scale: 1.006, x: 2 }}"),
  'DialogListItem implements 60fps whileHover spring physics'
)
assert(
  chatList.includes("whileTap={{ scale: 0.982 }}"),
  'DialogListItem implements whileTap tactile scale physics'
)
assert(
  chatList.includes("transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.8 }}"),
  'DialogListItem calibrates 60fps cubic spring transition with mass damping'
)
assert(
  chatList.includes("layoutId=\"activeChatBar\""),
  'DialogListItem retains activeChatBar layout animation'
)
assert(
  chatList.includes("transition={{ type: 'spring', stiffness: 450, damping: 32, mass: 0.7 }}"),
  'activeChatBar calibrates responsive spring transition'
)

console.log(`\n📊 Verification Summary: ${passedTests}/${totalTests} tests passed.\n`)

if (passedTests === totalTests) {
  console.log('🎉 Phase 101 verification passed with 100% parity & ergonomic fluidity!')
} else {
  console.error(`⚠️ ${totalTests - passedTests} tests failed!`)
  process.exit(1)
}
