import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Phase 106: Audio & Voice Message Waveform Scrubbing Elastic Physics Verification...\n')

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
  indexCss.includes('.waveform-bar-elastic'),
  'index.css defines .waveform-bar-elastic class'
)
assert(
  indexCss.includes('cubic-bezier(0.34, 1.56, 0.64, 1)'),
  'waveform-bar-elastic contains elastic cubic-bezier spring curve'
)
assert(
  indexCss.includes('.waveform-track-elastic'),
  'index.css defines .waveform-track-elastic class'
)
assert(
  indexCss.includes('cubic-bezier(0.16, 1, 0.3, 1)'),
  'waveform-track-elastic contains smooth progress fill interpolation curve'
)

// 2. Inspect src/components/ChatViewport.tsx
const chatViewportPath = path.join(rootDir, 'src', 'components', 'ChatViewport.tsx')
const chatViewport = fs.readFileSync(chatViewportPath, 'utf8')

assert(
  chatViewport.includes('waveform-track-elastic'),
  'ChatViewport applies waveform-track-elastic to continuous progress track'
)
assert(
  chatViewport.includes('waveform-bar-elastic'),
  'ChatViewport applies waveform-bar-elastic to individual audio bars'
)
assert(
  chatViewport.includes('group-hover/waveform:scale-y-110'),
  'ChatViewport configures tactile hover scaling on waveform bars'
)
assert(
  chatViewport.includes('shadow-[0_0_4px_rgba(16,185,129,0.35)]'),
  'ChatViewport applies emerald glow shadow on passed waveform segments'
)
assert(
  chatViewport.includes('className="relative flex items-center gap-0.5 h-6 cursor-pointer py-1 group/waveform select-none"'),
  'ChatViewport configures relative container for track positioning and disables text selection'
)

console.log(`\n📊 Verification Summary: ${passedTests}/${totalTests} tests passed.\n`)

if (passedTests === totalTests) {
  console.log('🎉 Phase 106 verification passed with 100% waveform scrubbing elasticity!')
} else {
  console.error(`⚠️ ${totalTests - passedTests} tests failed!`)
  process.exit(1)
}
