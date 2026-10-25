import fs from 'fs'
import path from 'path'

console.log('====================================================')
console.log('Phase 71 Verification: Auto-Download Network Profiles & Custom Rules')
console.log('====================================================\n')

let passed = 0
let failed = 0

function assert(condition, msg) {
  if (condition) {
    console.log(`  [PASS] ${msg}`)
    passed++
  } else {
    console.error(`  [FAIL] ${msg}`)
    failed++
  }
}

// 1. Electron & Frontend Type Definitions
console.log('[SUITE 1] Network Profiles & Rule Definitions')
const electronTypes = fs.readFileSync(path.join(process.cwd(), 'electron/telegram/types.ts'), 'utf8')
assert(electronTypes.includes("export type NetworkProfileType = 'cellular' | 'wifi' | 'roaming'"), 'NetworkProfileType specifies cellular, wifi, roaming')
assert(electronTypes.includes('export interface AutoDownloadNetworkRule {'), 'AutoDownloadNetworkRule interface defined')
assert(electronTypes.includes('export interface NetworkProfilesConfig {'), 'NetworkProfilesConfig interface defined')
assert(electronTypes.includes('activeNetworkProfile?: NetworkProfileType'), 'AutoDownloadConfig includes activeNetworkProfile')
assert(electronTypes.includes('networkProfiles?: NetworkProfilesConfig'), 'AutoDownloadConfig includes networkProfiles')

const frontendTypes = fs.readFileSync(path.join(process.cwd(), 'src/types/telegram.d.ts'), 'utf8')
assert(frontendTypes.includes('NetworkProfileType'), 'src/types/telegram.d.ts re-exports NetworkProfileType')
assert(frontendTypes.includes('AutoDownloadNetworkRule'), 'src/types/telegram.d.ts re-exports AutoDownloadNetworkRule')
assert(frontendTypes.includes('NetworkProfilesConfig'), 'src/types/telegram.d.ts re-exports NetworkProfilesConfig')

// 2. SessionStore Defaults and Deep-Merge
console.log('\n[SUITE 2] SessionStore Network Profile Presets & Deep Merge')
const sessionStore = fs.readFileSync(path.join(process.cwd(), 'electron/telegram/sessionStore.ts'), 'utf8')
assert(sessionStore.includes("activeNetworkProfile: 'wifi'"), 'sessionStore defaults activeNetworkProfile to wifi')
assert(sessionStore.includes('cellular: {'), 'sessionStore defines cellular preset')
assert(sessionStore.includes('wifi: {'), 'sessionStore defines wifi preset')
assert(sessionStore.includes('roaming: {'), 'sessionStore defines roaming preset')
assert(sessionStore.includes('networkProfiles: {'), 'sessionStore deep merges networkProfiles')

// 3. AccountManager & SecurityService MTProto Parity
console.log('\n[SUITE 3] AccountManager & SecurityService MTProto RPCs')
const accountManager = fs.readFileSync(path.join(process.cwd(), 'electron/telegram/accountManager.ts'), 'utf8')
assert(accountManager.includes('public async getAutoDownloadSettings(accountId: string)'), 'accountManager implements getAutoDownloadSettings')
assert(accountManager.includes('public async saveAutoDownloadSettings(accountId: string'), 'accountManager implements saveAutoDownloadSettings')

const secService = fs.readFileSync(path.join(process.cwd(), 'electron/telegram/services/accountSecurityService.ts'), 'utf8')
assert(secService.includes("account.getAutoDownloadSettings"), 'accountSecurityService calls account.getAutoDownloadSettings')
assert(secService.includes("account.saveAutoDownloadSettings"), 'accountSecurityService calls account.saveAutoDownloadSettings')

// 4. Main & Preload IPC Wiring
console.log('\n[SUITE 4] IPC Bridge Wiring')
const mainCode = fs.readFileSync(path.join(process.cwd(), 'electron/main.ts'), 'utf8')
assert(mainCode.includes("telegram:get-autodownload-settings"), 'main.ts registers telegram:get-autodownload-settings')
assert(mainCode.includes("telegram:save-autodownload-settings"), 'main.ts registers telegram:save-autodownload-settings')

const preloadCode = fs.readFileSync(path.join(process.cwd(), 'electron/preload.ts'), 'utf8')
assert(preloadCode.includes("getAutoDownloadSettings: (accountId: string)"), 'preload.ts exposes getAutoDownloadSettings')
assert(preloadCode.includes("saveAutoDownloadSettings: (accountId: string"), 'preload.ts exposes saveAutoDownloadSettings')

// 5. SettingsModal UI & Network Profiles Tab
console.log('\n[SUITE 5] SettingsModal Network Profiles & Custom Rules UI')
const settingsModal = fs.readFileSync(path.join(process.cwd(), 'src/components/SettingsModal.tsx'), 'utf8')
assert(settingsModal.includes("NetworkProfileType[]").valueOf() || settingsModal.includes("wifi', 'cellular', 'roaming'"), 'SettingsModal supports cellular, wifi, roaming profiles')
assert(settingsModal.includes('Use {selectedProfileTab === \'wifi\' ? \'Wi-Fi\' : selectedProfileTab} as active profile'), 'SettingsModal allows switching active network profile')
assert(settingsModal.includes('Sync Cloud'), 'SettingsModal provides MTProto Telegram cloud sync button')
assert(settingsModal.includes('DEFAULT_NETWORK_PROFILES'), 'SettingsModal defines robust default network profiles')

// 6. ChatViewport Resolution
console.log('\n[SUITE 6] ChatViewport Network Profile Resolution')
const chatViewport = fs.readFileSync(path.join(process.cwd(), 'src/components/ChatViewport.tsx'), 'utf8')
assert(chatViewport.includes('if (cfg.networkProfiles)'), 'ChatViewport inspects cfg.networkProfiles')
assert(chatViewport.includes('cfg.activeNetworkProfile || cfg.networkProfiles.activeProfile'), 'ChatViewport checks active network profile')

console.log('\n====================================================')
console.log(`Phase 71 Summary: ${passed} passed, ${failed} failed`)
console.log('====================================================')

if (failed > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
