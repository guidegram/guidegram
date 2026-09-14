import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Milestone 15 Verification: Tiered Update Enforcement & Security Updates...')

// 1. Verify types.ts has tiered update fields
const typesTsPath = path.join(rootDir, 'electron', 'telegram', 'types.ts')
assert(fs.existsSync(typesTsPath), 'electron/telegram/types.ts must exist')
const typesContent = fs.readFileSync(typesTsPath, 'utf-8')

assert(
  typesContent.includes('isMandatory?: boolean'),
  'UpdateInfo interface must include isMandatory field'
)
assert(
  typesContent.includes('isSecurityUpdate?: boolean'),
  'UpdateInfo interface must include isSecurityUpdate field'
)
assert(
  typesContent.includes("severity?: 'critical' | 'normal'"),
  'UpdateInfo interface must include severity field'
)
console.log('  ✅ UpdateInfo type definitions verified.')

// 2. Verify updateManager.ts detection logic
const updateManagerTsPath = path.join(rootDir, 'electron', 'telegram', 'updateManager.ts')
assert(fs.existsSync(updateManagerTsPath), 'electron/telegram/updateManager.ts must exist')
const updateManagerContent = fs.readFileSync(updateManagerTsPath, 'utf-8')

assert(
  updateManagerContent.includes('const isMajorBump = latParts[0] > curParts[0]'),
  'updateManager.ts must detect major version bumps'
)
assert(
  updateManagerContent.includes('const isMinorBump = latParts[0] === curParts[0] && latParts[1] > curParts[1]'),
  'updateManager.ts must detect minor version bumps'
)
assert(
  updateManagerContent.includes('hasSecurityKeyword'),
  'updateManager.ts must inspect release body/tag for security keywords'
)
assert(
  updateManagerContent.includes('const isMandatory = hasUpdate && (isMajorBump || isMinorBump || hasSecurityKeyword)'),
  'updateManager.ts must enforce mandatory status on major/minor bumps or security updates'
)
console.log('  ✅ UpdateManager bump and security classification verified.')

// 3. Mathematical & semantic simulation of version check logic
function evaluateUpdate(currentVer, latestVer, releaseBody = '', tagName = '') {
  const curParts = currentVer.split('.').map((n) => parseInt(n, 10) || 0)
  const latParts = latestVer.split('.').map((n) => parseInt(n, 10) || 0)
  
  let hasUpdate = false
  for (let i = 0; i < Math.max(curParts.length, latParts.length); i++) {
    const na = latParts[i] || 0
    const nb = curParts[i] || 0
    if (na > nb) {
      hasUpdate = true
      break
    }
    if (na < nb) {
      hasUpdate = false
      break
    }
  }

  const notesLower = (releaseBody || '').toLowerCase()
  const tagLower = tagName.toLowerCase()
  const hasSecurityKeyword =
    notesLower.includes('security') ||
    notesLower.includes('critical') ||
    notesLower.includes('mandatory') ||
    notesLower.includes('vulnerability') ||
    notesLower.includes('breaking') ||
    tagLower.includes('sec') ||
    tagLower.includes('crit')

  const isMajorBump = latParts[0] > curParts[0]
  const isMinorBump = latParts[0] === curParts[0] && latParts[1] > curParts[1]
  const isMandatory = hasUpdate && (isMajorBump || isMinorBump || hasSecurityKeyword)
  const isSecurityUpdate = hasUpdate && hasSecurityKeyword
  const severity = isMandatory ? 'critical' : 'normal'

  return { hasUpdate, isMandatory, isSecurityUpdate, severity }
}

// Test Case A: Minor version bump (e.g. 1.5.0 -> 1.6.0) -> MUST BE MANDATORY
const minorResult = evaluateUpdate('1.5.0', '1.6.0')
assert.strictEqual(minorResult.hasUpdate, true)
assert.strictEqual(minorResult.isMandatory, true, 'Minor version bumps like 1.6.0 must be mandatory')
assert.strictEqual(minorResult.severity, 'critical')

// Test Case B: Major version bump (e.g. 1.5.0 -> 2.0.0) -> MUST BE MANDATORY
const majorResult = evaluateUpdate('1.5.0', '2.0.0')
assert.strictEqual(majorResult.hasUpdate, true)
assert.strictEqual(majorResult.isMandatory, true, 'Major version bumps must be mandatory')
assert.strictEqual(majorResult.severity, 'critical')

// Test Case C: Pure patch update without security keyword (e.g. 1.5.0 -> 1.5.1) -> SOFT UPDATE (Dismissible for session)
const patchResult = evaluateUpdate('1.5.0', '1.5.1', 'Minor UI adjustments and icon spacing')
assert.strictEqual(patchResult.hasUpdate, true)
assert.strictEqual(patchResult.isMandatory, false, 'Non-security patch updates must allow soft dismissal')
assert.strictEqual(patchResult.severity, 'normal')

// Test Case D: Patch update with security keyword (e.g. 1.5.0 -> 1.5.1 with 'security fix') -> MANDATORY & SECURITY
const secPatchResult = evaluateUpdate('1.5.0', '1.5.1', 'Critical security patch for token encryption')
assert.strictEqual(secPatchResult.hasUpdate, true)
assert.strictEqual(secPatchResult.isMandatory, true, 'Security patches must be mandatory')
assert.strictEqual(secPatchResult.isSecurityUpdate, true)
assert.strictEqual(secPatchResult.severity, 'critical')
console.log('  ✅ Semver evaluation simulations all passed.')

// 4. Verify UpdateBanner.tsx UI enforcement
const bannerTsxPath = path.join(rootDir, 'src', 'components', 'UpdateBanner.tsx')
assert(fs.existsSync(bannerTsxPath), 'src/components/UpdateBanner.tsx must exist')
const bannerContent = fs.readFileSync(bannerTsxPath, 'utf-8')

assert(
  bannerContent.includes('!isUpdating && !isMandatory'),
  'Dismiss button and Later button must be completely hidden when isMandatory is true'
)
assert(
  bannerContent.includes('ShieldAlert') || bannerContent.includes('ShieldCheck'),
  'UpdateBanner must render security/required badge and shield icon'
)
assert(
  bannerContent.includes('update.now_required') || bannerContent.includes('Update Now (Required)'),
  'Update action button must display explicit Required text when mandatory'
)
console.log('  ✅ UpdateBanner UI enforcement and dismiss suppression verified.')

// 5. Verify App.tsx dismissal safety
const appTsxPath = path.join(rootDir, 'src', 'App.tsx')
assert(fs.existsSync(appTsxPath), 'src/App.tsx must exist')
const appContent = fs.readFileSync(appTsxPath, 'utf-8')

assert(
  appContent.includes('!updateInfo.isMandatory'),
  'App.tsx must guard onDismiss so mandatory updates cannot be cleared from state'
)
console.log('  ✅ App.tsx state level dismissal guard verified.')

console.log('🎉 All Milestone 15 checks passed successfully!')
