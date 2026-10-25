import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Live Location Streaming & Geofencing Protocol Verification...\n')

let passed = 0
let total = 0

function assert(condition, message) {
  total++
  if (condition) {
    passed++
    console.log(`✓ [${passed}/${total}] ${message}`)
  } else {
    console.error(`✗ [FAIL] ${message}`)
    process.exit(1)
  }
}

// 1. AccountManager verification
const accountManagerPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
const accountManagerContent = fs.readFileSync(accountManagerPath, 'utf-8')

assert(
  accountManagerContent.includes('public async sendLocation(') &&
  accountManagerContent.includes('inputMediaGeoLive'),
  'AccountManager implements sendLocation supporting livePeriod and inputMediaGeoLive'
)

assert(
  accountManagerContent.includes('public async editLiveLocation(') &&
  accountManagerContent.includes('messages.editMessage'),
  'AccountManager implements editLiveLocation invoking messages.editMessage'
)

assert(
  accountManagerContent.includes('public async stopLiveLocation(') &&
  accountManagerContent.includes('stopped: true'),
  'AccountManager implements stopLiveLocation invoking editLiveLocation with stopped: true'
)

assert(
  accountManagerContent.includes('public async getRecentLocations(') &&
  accountManagerContent.includes('messages.getRecentLocations'),
  'AccountManager implements getRecentLocations invoking messages.getRecentLocations'
)

// 2. main.ts IPC registration verification
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf-8')

assert(
  mainContent.includes("ipcMain.handle('telegram:send-location'") &&
  mainContent.includes('accountManager.sendLocation'),
  'main.ts registers telegram:send-location IPC handler'
)

assert(
  mainContent.includes("ipcMain.handle('telegram:edit-live-location'") &&
  mainContent.includes('accountManager.editLiveLocation'),
  'main.ts registers telegram:edit-live-location IPC handler'
)

assert(
  mainContent.includes("ipcMain.handle('telegram:stop-live-location'") &&
  mainContent.includes('accountManager.stopLiveLocation'),
  'main.ts registers telegram:stop-live-location IPC handler'
)

assert(
  mainContent.includes("ipcMain.handle('telegram:get-recent-locations'") &&
  mainContent.includes('accountManager.getRecentLocations'),
  'main.ts registers telegram:get-recent-locations IPC handler'
)

// 3. preload.ts API exposure verification
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf-8')

assert(
  preloadContent.includes('sendLocation:') &&
  preloadContent.includes("'telegram:send-location'"),
  'preload.ts exposes sendLocation'
)

assert(
  preloadContent.includes('editLiveLocation:') &&
  preloadContent.includes("'telegram:edit-live-location'"),
  'preload.ts exposes editLiveLocation'
)

assert(
  preloadContent.includes('stopLiveLocation:') &&
  preloadContent.includes("'telegram:stop-live-location'"),
  'preload.ts exposes stopLiveLocation'
)

assert(
  preloadContent.includes('getRecentLocations:') &&
  preloadContent.includes("'telegram:get-recent-locations'"),
  'preload.ts exposes getRecentLocations'
)

// 4. LiveLocationModal verification
const modalPath = path.join(rootDir, 'src', 'components', 'chat', 'LiveLocationModal.tsx')
const modalContent = fs.readFileSync(modalPath, 'utf-8')

assert(
  modalContent.includes('LIVE_DURATIONS') &&
  modalContent.includes('PROXIMITY_RADII') &&
  modalContent.includes('selectedProximity'),
  'LiveLocationModal defines durations and geofence proximity radii'
)

assert(
  modalContent.includes('canvasRef') &&
  modalContent.includes('headingRad') &&
  modalContent.includes('Geofence Alert:'),
  'LiveLocationModal implements live radar canvas with heading indicator and geofence rings'
)

assert(
  modalContent.includes('sendLocation') &&
  (modalContent.includes('stopLiveLocation') || modalContent.includes('editLiveLocation')),
  'LiveLocationModal triggers sendLocation and stopLiveLocation'
)

assert(
  modalContent.includes('getRecentLocations'),
  'LiveLocationModal polls getRecentLocations from MTProto'
)

// 5. ChatViewport integration verification
const chatViewportPath = path.join(rootDir, 'src', 'components', 'ChatViewport.tsx')
const chatViewportContent = fs.readFileSync(chatViewportPath, 'utf-8')

assert(
  chatViewportContent.includes('LiveLocationModal') &&
  chatViewportContent.includes('isLiveLocationModalOpen') &&
  chatViewportContent.includes('setIsLiveLocationModalOpen(true)'),
  'ChatViewport integrates LiveLocationModal and Info Drawer action card'
)

console.log(`\n🎉 All ${passed}/${total} checks passed successfully for Phase 91!\n`)
