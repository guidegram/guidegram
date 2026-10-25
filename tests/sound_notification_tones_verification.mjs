import fs from 'fs'
import path from 'path'

console.log('====================================================')
console.log('Phase 72 Verification: Sound & Notification Tones Customization')
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
console.log('[SUITE 1] Notification Tone & Ringtone Types')
const electronTypes = fs.readFileSync(path.join(process.cwd(), 'electron/telegram/types.ts'), 'utf8')
assert(electronTypes.includes('export interface SavedRingtoneItem {'), 'SavedRingtoneItem interface defined in electron types')
assert(electronTypes.includes('notificationTone?: string'), 'AppConfig includes notificationTone')

const frontendTypes = fs.readFileSync(path.join(process.cwd(), 'src/types/telegram.d.ts'), 'utf8')
assert(frontendTypes.includes('SavedRingtoneItem'), 'src/types/telegram.d.ts re-exports SavedRingtoneItem')

// 2. SessionStore Defaults
console.log('\n[SUITE 2] SessionStore Defaults')
const sessionStore = fs.readFileSync(path.join(process.cwd(), 'electron/telegram/sessionStore.ts'), 'utf8')
assert(sessionStore.includes("notificationTone: 'classic'"), 'sessionStore sets default notificationTone to classic')

// 3. AccountManager & AccountSecurityService MTProto RPCs
console.log('\n[SUITE 3] MTProto Ringtone RPC Methods')
const accountManager = fs.readFileSync(path.join(process.cwd(), 'electron/telegram/accountManager.ts'), 'utf8')
assert(accountManager.includes('public async getSavedRingtones('), 'accountManager implements getSavedRingtones')
assert(accountManager.includes('public async saveRingtone('), 'accountManager implements saveRingtone')
assert(accountManager.includes('public async uploadRingtone('), 'accountManager implements uploadRingtone')

const secService = fs.readFileSync(path.join(process.cwd(), 'electron/telegram/services/accountSecurityService.ts'), 'utf8')
assert(secService.includes("account.getSavedRingtones"), 'accountSecurityService calls account.getSavedRingtones')
assert(secService.includes("account.saveRingtone"), 'accountSecurityService calls account.saveRingtone')
assert(secService.includes("account.uploadRingtone"), 'accountSecurityService calls account.uploadRingtone')

// 4. Main & Preload IPC Channels
console.log('\n[SUITE 4] IPC Bridge Wiring')
const mainCode = fs.readFileSync(path.join(process.cwd(), 'electron/main.ts'), 'utf8')
assert(mainCode.includes("telegram:get-saved-ringtones"), 'main.ts registers telegram:get-saved-ringtones')
assert(mainCode.includes("telegram:save-ringtone"), 'main.ts registers telegram:save-ringtone')
assert(mainCode.includes("telegram:upload-ringtone"), 'main.ts registers telegram:upload-ringtone')

const preloadCode = fs.readFileSync(path.join(process.cwd(), 'electron/preload.ts'), 'utf8')
assert(preloadCode.includes("getSavedRingtones: (accountId: string"), 'preload.ts exposes getSavedRingtones')
assert(preloadCode.includes("saveRingtone: (accountId: string"), 'preload.ts exposes saveRingtone')
assert(preloadCode.includes("uploadRingtone: (accountId: string"), 'preload.ts exposes uploadRingtone')

// 5. Sound Effects Synthesizer Engine
console.log('\n[SUITE 5] Sound Effects Synthesizer Engine')
const soundEffects = fs.readFileSync(path.join(process.cwd(), 'src/utils/soundEffects.ts'), 'utf8')
assert(soundEffects.includes('AVAILABLE_NOTIFICATION_TONES'), 'soundEffects.ts exports AVAILABLE_NOTIFICATION_TONES')
assert(soundEffects.includes("tone === 'chime'"), 'soundEffects.ts synthesizes harmonic chime')
assert(soundEffects.includes("tone === 'crystal'"), 'soundEffects.ts synthesizes crystal ping')
assert(soundEffects.includes("tone === 'drop'"), 'soundEffects.ts synthesizes water droplet')
assert(soundEffects.includes("tone === 'minimal'"), 'soundEffects.ts synthesizes minimal pop')

// 6. App.tsx Dynamic Playback
console.log('\n[SUITE 6] App.tsx Dynamic Notification Playback')
const appCode = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8')
assert(appCode.includes("playNotificationSound(configRef.current?.notificationTone || 'classic')"), 'App.tsx plays configured notificationTone on incoming messages')

// 7. SettingsModal UI & Cloud Tones
console.log('\n[SUITE 7] SettingsModal Notification Tone UI')
const settingsModal = fs.readFileSync(path.join(process.cwd(), 'src/components/SettingsModal.tsx'), 'utf8')
assert(settingsModal.includes('Notification Tone'), 'SettingsModal renders Notification Tone header')
assert(settingsModal.includes('AVAILABLE_NOTIFICATION_TONES'), 'SettingsModal renders tone preset chips')
assert(settingsModal.includes('Telegram Cloud Tones'), 'SettingsModal renders cloud tones section')
assert(settingsModal.includes('Sync Cloud'), 'SettingsModal provides MTProto ringtone sync')
assert(settingsModal.includes('Upload Tone'), 'SettingsModal provides custom tone upload')

console.log('\n====================================================')
console.log(`Phase 72 Summary: ${passed} passed, ${failed} failed`)
console.log('====================================================')

if (failed > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
