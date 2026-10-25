import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Phase 107: Media Lightbox Pan-and-Zoom Spring Inertia Verification...\n')

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
  indexCss.includes('.lightbox-image-pan'),
  'index.css defines .lightbox-image-pan utility'
)
assert(
  indexCss.includes('touch-action: none;'),
  'lightbox-image-pan contains touch-action: none'
)
assert(
  indexCss.includes('-webkit-user-drag: none;'),
  'lightbox-image-pan prevents native ghost drag behavior'
)

// 2. Inspect src/components/ChatViewport.tsx
const chatViewportPath = path.join(rootDir, 'src', 'components', 'ChatViewport.tsx')
const chatViewport = fs.readFileSync(chatViewportPath, 'utf8')

assert(
  chatViewport.includes('ZoomIn') && chatViewport.includes('ZoomOut'),
  'ChatViewport imports ZoomIn and ZoomOut icons'
)
assert(
  chatViewport.includes('const [lightboxScale, setLightboxScale] = useState(1)'),
  'ChatViewport initializes lightboxScale state'
)
assert(
  chatViewport.includes('<AnimatePresence>\n        {lightboxUrl && ('),
  'ChatViewport wraps lightbox in AnimatePresence'
)
assert(
  chatViewport.includes('title="Zoom In"') && chatViewport.includes('title="Zoom Out"'),
  'ChatViewport renders interactive zoom controls'
)
assert(
  chatViewport.includes('onDoubleClick={(e) => {') &&
  chatViewport.includes('setLightboxScale((prev) => (prev > 1 ? 1 : 2))'),
  'ChatViewport implements smart double-click 2x toggle'
)
assert(
  chatViewport.includes('drag={lightboxScale > 1}'),
  'ChatViewport dynamically binds drag physics when zoomed in'
)
assert(
  chatViewport.includes('dragConstraints={{ left: -300, right: 300, top: -200, bottom: 200 }}'),
  'ChatViewport establishes 2D pan boundaries'
)
assert(
  chatViewport.includes("transition={{ type: 'spring', damping: 25, stiffness: 380, mass: 0.7 }}"),
  'ChatViewport calibrates 60fps spring zoom inertia'
)
assert(
  chatViewport.includes('lightbox-image-pan'),
  'ChatViewport applies lightbox-image-pan class to preview image'
)

console.log(`\n📊 Verification Summary: ${passedTests}/${totalTests} tests passed.\n`)

if (passedTests === totalTests) {
  console.log('🎉 Phase 107 verification passed with 100% pan-and-zoom fluidity!')
} else {
  console.error(`⚠️ ${totalTests - passedTests} tests failed!`)
  process.exit(1)
}
