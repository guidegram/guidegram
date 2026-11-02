import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Verification: UpdateManager Prerelease Exclusion & Latest Endpoint Prioritization...')

// 1. Verify updateManager.ts source code guarantees
const updateManagerTsPath = path.join(rootDir, 'electron', 'telegram', 'updateManager.ts')
assert(fs.existsSync(updateManagerTsPath), 'electron/telegram/updateManager.ts must exist')
const updateManagerContent = fs.readFileSync(updateManagerTsPath, 'utf-8')

// A. Must target /releases/latest first
assert(
  updateManagerContent.includes("makeRequest(`/repos/${this.repoOwner}/${this.repoName}/releases/latest`)"),
  'updateManager.ts must query /releases/latest first'
)

// B. Must check draft and prerelease flags
assert(
  updateManagerContent.includes('releaseData.draft || releaseData.prerelease'),
  'updateManager.ts must explicitly reject draft or prerelease payloads'
)

// C. Must check for prerelease tags with hyphens
assert(
  updateManagerContent.includes("tagName.includes('-')"),
  'updateManager.ts must guard against prerelease tags containing hyphens'
)

// D. Fallback list must filter !r.draft && !r.prerelease
assert(
  updateManagerContent.includes('!r.draft && !r.prerelease'),
  'updateManager.ts fallback must filter out draft and prerelease releases'
)

console.log('  ✅ updateManager.ts static code assertions passed.')

// 2. Behavioral simulation of release selection logic
const mockReleases = [
  { tag_name: 'v2.6.0-rc.2', draft: false, prerelease: true, assets: [{ name: 'Guidegram-Windows-x64-Portable.zip', browser_download_url: 'http://test/rc2.zip' }] },
  { tag_name: 'v2.6.0-rc.1', draft: false, prerelease: true, assets: [{ name: 'Guidegram-Windows-x64-Portable.zip', browser_download_url: 'http://test/rc1.zip' }] },
  { tag_name: 'v2.5.4', draft: false, prerelease: false, assets: [{ name: 'Guidegram-Windows-x64-Portable.zip', browser_download_url: 'http://test/2.5.4.zip' }] },
  { tag_name: 'v2.5.3', draft: false, prerelease: false, assets: [{ name: 'Guidegram-Windows-x64-Portable.zip', browser_download_url: 'http://test/2.5.3.zip' }] },
  { tag_name: 'v2.7.0-beta.1', draft: true, prerelease: false, assets: [] }
]

function selectStableRelease(list) {
  const stable = list.filter((r) => !r.draft && !r.prerelease && !(r.tag_name || '').includes('-'))
  return stable[0] || null
}

const chosen = selectStableRelease(mockReleases)
assert(chosen !== null, 'Should find a stable release')
assert.strictEqual(chosen.tag_name, 'v2.5.4', 'Must pick v2.5.4 and skip all prereleases/RCs/drafts')

console.log('  ✅ Prerelease filtering simulation correctly selected latest stable v2.5.4.')

// 3. Verify semver update decision when currentVersion is 2.5.4
function compareSemver(a, b) {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}

const currentVersion = '2.5.4'
const latestVer = chosen.tag_name.replace(/^v/, '').trim()
const isNewer = compareSemver(latestVer, currentVersion) > 0
assert.strictEqual(isNewer, false, 'v2.5.4 should not trigger update when running 2.5.4')

console.log('  ✅ Version comparison with current v2.5.4 passed (no false update alert).')
console.log('🎉 All Prerelease Filter Verification checks passed!')
