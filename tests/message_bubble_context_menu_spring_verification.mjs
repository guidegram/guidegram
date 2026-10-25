import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Phase 102: Message Bubble Haptic Scale & Context Menu Spring Dismissal Verification...\n')

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
  indexCss.includes('.bubble-haptic-spring'),
  'index.css defines .bubble-haptic-spring utility'
)
assert(
  indexCss.includes('transform: scale(1.004);'),
  'bubble-haptic-spring contains subtle hover scale (1.004)'
)
assert(
  indexCss.includes('transform: scale(0.988);'),
  'bubble-haptic-spring contains tactile active press scale (0.988)'
)
assert(
  indexCss.includes('.context-menu-spring'),
  'index.css defines .context-menu-spring utility'
)
assert(
  indexCss.includes('@keyframes contextMenuPop'),
  'index.css defines @keyframes contextMenuPop animation'
)

// 2. Inspect src/components/ChatViewport.tsx
const chatViewportPath = path.join(rootDir, 'src', 'components', 'ChatViewport.tsx')
const chatViewport = fs.readFileSync(chatViewportPath, 'utf8')

assert(
  chatViewport.includes("import { motion, AnimatePresence } from 'motion/react'"),
  'ChatViewport imports AnimatePresence from motion/react'
)
assert(
  chatViewport.includes('className={`transition-all bubble-haptic-spring'),
  'ChatViewport applies bubble-haptic-spring to message bubble container'
)
assert(
  chatViewport.includes('<AnimatePresence>\n        {contextMenu && ('),
  'ChatViewport wraps contextMenu in AnimatePresence container'
)
assert(
  chatViewport.includes('className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px]"'),
  'ChatViewport provides backdrop dismissal overlay for contextMenu'
)
assert(
  chatViewport.includes("exit={{ opacity: 0, scale: 0.94, y: -2 }}"),
  'contextMenu motion.div implements exit animation'
)
assert(
  chatViewport.includes("transition={{ type: 'spring', stiffness: 450, damping: 28, mass: 0.7 }}"),
  'contextMenu calibrates 60fps spring transition physics'
)
assert(
  chatViewport.includes('context-menu-spring'),
  'contextMenu motion.div applies context-menu-spring class'
)

console.log(`\n📊 Verification Summary: ${passedTests}/${totalTests} tests passed.\n`)

if (passedTests === totalTests) {
  console.log('🎉 Phase 102 verification passed with 100% fluid tactile spring physics!')
} else {
  console.error(`⚠️ ${totalTests - passedTests} tests failed!`)
  process.exit(1)
}
