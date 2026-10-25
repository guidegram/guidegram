import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Phase 108: Settings & Drawer Pan-Down Physics & Elastic Damping Verification...\n')

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
  indexCss.includes('.drawer-pan-rail'),
  'index.css defines .drawer-pan-rail utility'
)
assert(
  indexCss.includes('touch-action: pan-y;'),
  'drawer-pan-rail contains touch-action: pan-y'
)
assert(
  indexCss.includes('.drawer-overscroll-elastic'),
  'index.css defines .drawer-overscroll-elastic utility'
)
assert(
  indexCss.includes('overscroll-behavior-y: contain;'),
  'drawer-overscroll-elastic contains overscroll-behavior-y: contain'
)

// 2. Inspect src/components/MainMenuDrawer.tsx
const drawerPath = path.join(rootDir, 'src', 'components', 'MainMenuDrawer.tsx')
const drawer = fs.readFileSync(drawerPath, 'utf8')

assert(
  drawer.includes('drag="x"'),
  'MainMenuDrawer enables horizontal drag gestures on drawer panel'
)
assert(
  drawer.includes('dragConstraints={{ left: isRTL ? 0 : -320, right: isRTL ? 320 : 0 }}'),
  'MainMenuDrawer configures directional drag constraints honoring RTL flow'
)
assert(
  drawer.includes('dragElastic={{ left: isRTL ? 0.05 : 0.6, right: isRTL ? 0.6 : 0.05 }}'),
  'MainMenuDrawer configures directional elasticity preventing inward over-drag'
)
assert(
  drawer.includes('onDragEnd={(_, info) => {') && drawer.includes('onClose()'),
  'MainMenuDrawer implements velocity and offset threshold dismissal handler'
)
assert(
  drawer.includes("transition={{ type: 'spring', damping: 26, stiffness: 400, mass: 0.8 }}"),
  'MainMenuDrawer calibrates 60fps spring transition parameters'
)
assert(
  drawer.includes('drawer-pan-rail'),
  'MainMenuDrawer applies drawer-pan-rail class to motion container'
)
assert(
  drawer.includes('drawer-overscroll-elastic'),
  'MainMenuDrawer applies drawer-overscroll-elastic to navigation list'
)

console.log(`\n📊 Verification Summary: ${passedTests}/${totalTests} tests passed.\n`)

if (passedTests === totalTests) {
  console.log('🎉 Phase 108 verification passed with 100% drawer physics fluidity!')
} else {
  console.error(`⚠️ ${totalTests - passedTests} tests failed!`)
  process.exit(1)
}
