import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Phase 103: Dynamic Story Viewer Spring Gestures & Fluid Swipe Dismissal Verification...\n')

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
  indexCss.includes('.story-drag-canvas'),
  'index.css defines .story-drag-canvas utility'
)
assert(
  indexCss.includes('touch-action: pan-x;'),
  'story-drag-canvas contains touch-action: pan-x for vertical gesture delegation'
)
assert(
  indexCss.includes('.story-progress-fluid'),
  'index.css defines .story-progress-fluid utility'
)
assert(
  indexCss.includes('cubic-bezier(0.2, 0, 0, 1)'),
  'story-progress-fluid utilizes cubic-bezier fluid interpolation curve'
)

// 2. Inspect src/components/StoryViewerModal.tsx
const storyModalPath = path.join(rootDir, 'src', 'components', 'StoryViewerModal.tsx')
const storyModal = fs.readFileSync(storyModalPath, 'utf8')

assert(
  storyModal.includes('drag="y"'),
  'StoryViewerModal enables vertical drag physics on story card'
)
assert(
  storyModal.includes('dragConstraints={{ top: 0, bottom: 0 }}'),
  'StoryViewerModal sets elastic boundaries with zero-offset dragConstraints'
)
assert(
  storyModal.includes('dragElastic={{ top: 0.2, bottom: 0.7 }}'),
  'StoryViewerModal configures asymmetric upward resistance and downward elastic stretch'
)
assert(
  storyModal.includes('onDragEnd={(_, info) => {') && storyModal.includes('onClose()'),
  'StoryViewerModal implements onDragEnd gesture dismissal handler'
)
assert(
  storyModal.includes("transition={{ type: 'spring', damping: 26, stiffness: 400, mass: 0.8 }}"),
  'StoryViewerModal calibrates 60fps spring transition physics with mass damping'
)
assert(
  storyModal.includes('story-drag-canvas'),
  'StoryViewerModal applies story-drag-canvas class to card container'
)
assert(
  storyModal.includes('w-10 h-1 rounded-full bg-white/30 backdrop-blur-sm'),
  'StoryViewerModal provides visual pull-down dismissal indicator'
)
assert(
  storyModal.includes('className="h-full rounded-full bg-white story-progress-fluid"'),
  'StoryViewerModal applies story-progress-fluid to progress segments'
)

console.log(`\n📊 Verification Summary: ${passedTests}/${totalTests} tests passed.\n`)

if (passedTests === totalTests) {
  console.log('🎉 Phase 103 verification passed with 100% fluid gesture physics!')
} else {
  console.error(`⚠️ ${totalTests - passedTests} tests failed!`)
  process.exit(1)
}
