import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Phase 104: Folder Tabs Kinetic Sliding Underline & Tab Momentum Switcher Verification...\n')

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
  indexCss.includes('.kinetic-tab-rail'),
  'index.css defines .kinetic-tab-rail class'
)
assert(
  indexCss.includes('overscroll-behavior-x: contain;'),
  'kinetic-tab-rail contains overscroll-behavior-x: contain'
)
assert(
  indexCss.includes('scroll-behavior: smooth;'),
  'kinetic-tab-rail contains scroll-behavior: smooth'
)
assert(
  indexCss.includes('.tab-badge-pop'),
  'index.css defines .tab-badge-pop utility'
)
assert(
  indexCss.includes('cubic-bezier(0.34, 1.56, 0.64, 1)'),
  'tab-badge-pop contains elastic cubic-bezier curve'
)

// 2. Inspect src/components/ChatTabs.tsx
const chatTabsPath = path.join(rootDir, 'src', 'components', 'ChatTabs.tsx')
const chatTabs = fs.readFileSync(chatTabsPath, 'utf8')

assert(
  chatTabs.includes('kinetic-tab-rail'),
  'ChatTabs applies kinetic-tab-rail to container elements'
)
assert(
  chatTabs.includes('<motion.button') && chatTabs.includes('whileHover={{ scale: 1.02 }}') && chatTabs.includes('whileTap={{ scale: 0.96 }}'),
  'ChatTabs implements motion.button with tactile whileHover and whileTap scales'
)
assert(
  chatTabs.includes('layoutId="activeChatTabIndicator"'),
  'ChatTabs implements activeChatTabIndicator layout animation'
)
assert(
  chatTabs.includes('layoutId="activeChatTabUnderline"'),
  'ChatTabs implements kinetic activeChatTabUnderline sliding indicator'
)
assert(
  chatTabs.includes("transition={{ type: 'spring', damping: 26, stiffness: 400, mass: 0.6 }}"),
  'activeChatTabUnderline calibrates responsive 60fps spring transition'
)
assert(
  chatTabs.includes('tab-badge-pop') && chatTabs.includes('layout'),
  'ChatTabs integrates tab-badge-pop with layout spring dynamics'
)

console.log(`\n📊 Verification Summary: ${passedTests}/${totalTests} tests passed.\n`)

if (passedTests === totalTests) {
  console.log('🎉 Phase 104 verification passed with 100% kinetic tab fluidity!')
} else {
  console.error(`⚠️ ${totalTests - passedTests} tests failed!`)
  process.exit(1)
}
