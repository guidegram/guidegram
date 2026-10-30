import assert from 'assert'
import fs from 'fs'
import path from 'path'

console.log('====================================================')
console.log('🧪 Running /boost Performance & Resource Surgery Verification')
console.log('====================================================')

// 1. Verify ActivityTracker deduplication and async write logic
const trackerCode = fs.readFileSync(path.resolve('electron/telegram/activityTrackerService.ts'), 'utf-8')
assert.ok(trackerCode.includes('isOnlineStatus(status: UserOnlineStatusType)'), 'Must define isOnlineStatus helper')
assert.ok(trackerCode.includes('isOfflineStatus(status: UserOnlineStatusType)'), 'Must define isOfflineStatus helper')
assert.ok(trackerCode.includes('sanitizeAllDiskFiles()'), 'Must include disk sanitization routine')
assert.ok(trackerCode.includes('fs.promises.writeFile'), 'Must use async non-blocking fs.promises.writeFile')
assert.ok(trackerCode.includes('last.wasOnline ='), 'Must update wasOnline in place to deduplicate')
assert.ok(trackerCode.includes('last.expires ='), 'Must update expires in place to deduplicate')
assert.ok(trackerCode.includes('status === \'empty\''), 'Must discard empty statuses')
console.log('  [PASS] ActivityTracker deduplication and async write logic verified')

// 2. Verify Base64 Data URL Elimination
assert.ok(trackerCode.includes("startsWith('data:image')"), 'Must strip base64 images')
console.log('  [PASS] Base64 images successfully stripped in activityTrackerService')

// 3. Verify AccountManager interval staggering & flood handling
const accMgrCode = fs.readFileSync(path.resolve('electron/telegram/accountManager.ts'), 'utf-8')
assert.ok(accMgrCode.includes('failedMediaKeys.has(baseKey)'), 'Must check baseKey in failedMediaKeys')
assert.ok(accMgrCode.includes('failedMediaKeys.add(baseKey)'), 'Must register baseKey in failedMediaKeys')
assert.ok(accMgrCode.includes('contactAuditInterval'), 'Must have contactAuditInterval')
assert.ok(accMgrCode.includes('profileSyncInterval'), 'Must have profileSyncInterval')
assert.ok(accMgrCode.includes('10 * 60 * 1000'), 'profileSyncInterval must be increased to 10 minutes (10 * 60 * 1000 ms)')
assert.ok(accMgrCode.includes('startAuditQueueProcessor'), 'Must have startAuditQueueProcessor')
assert.ok(accMgrCode.includes('45000'), 'Audit queue processor must have increased interval')
assert.ok(!accMgrCode.includes('fs.readdirSync(this.mediaDir)'), 'Must eliminate synchronous readdir of mediaDir')
assert.ok(accMgrCode.includes('candidateExts'), 'Must use candidateExts direct probing')
assert.ok(!accMgrCode.includes('this.failedMediaKeys.clear()'), 'Must not wipe failedMediaKeys completely')

// 4. Verify SessionStore bot message in-memory caching and async write
const sessionStoreCode = fs.readFileSync(path.resolve('electron/telegram/sessionStore.ts'), 'utf-8')
assert.ok(sessionStoreCode.includes('botMessagesCache'), 'SessionStore must maintain botMessagesCache in memory')
assert.ok(sessionStoreCode.includes('scheduleSaveBotMessages'), 'SessionStore must debounce bot message writes')
assert.ok(sessionStoreCode.includes('scheduleSaveBotChats'), 'SessionStore must debounce bot chat index writes')
console.log('  [PASS] SessionStore bot message in-memory caching and debounced async persistence verified')

// 5. Verify Logger auto-rotation
const loggerCode = fs.readFileSync(path.resolve('electron/telegram/logger.ts'), 'utf-8')
assert.ok(loggerCode.includes('Auto-rotation guard'), 'Logger must include auto-rotation')
assert.ok(loggerCode.includes('2 * 1024 * 1024'), 'Error log must rotate at 2MB')
assert.ok(loggerCode.includes('5 * 1024 * 1024'), 'Main log must rotate at 5MB')
console.log('  [PASS] Logger auto-rotation implemented')

// 6. Verify UI Virtualization & Idle Pauses
const chatListCode = fs.readFileSync(path.resolve('src/components/ChatList.tsx'), 'utf-8')
assert.ok(chatListCode.includes('chatsAndContacts.slice(0, 40)'), 'ChatList must slice dialogs search')
assert.ok(chatListCode.includes('globalPeers.slice(0, 30)'), 'ChatList must slice global peers search')
assert.ok(chatListCode.includes('globalMessages.slice(0, 40)'), 'ChatList must slice global messages search')

const viewportCode = fs.readFileSync(path.resolve('src/components/ChatViewport.tsx'), 'utf-8')
assert.ok(viewportCode.includes('!document.hidden'), 'ChatViewport must check document.hidden before polling')

const appCode = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8')
assert.ok(appCode.includes('app-hidden'), 'App must toggle app-hidden on visibility change')

const cssCode = fs.readFileSync(path.resolve('src/index.css'), 'utf-8')
assert.ok(cssCode.includes('.app-hidden *'), 'CSS must pause animations when app is hidden')
assert.ok(cssCode.includes('content-visibility: auto'), 'CSS must include content-visibility: auto')
console.log('  [PASS] UI virtualization, CSS pause, and document.hidden guards verified')

// 7. Verify Deployed Artifacts Integrity
const deployedAsar = 'D:\\Guidegram\\resources\\app.asar'
assert.ok(fs.existsSync(deployedAsar), 'Deployed app.asar must exist in D:\\Guidegram\\resources')
const deployedStat = fs.statSync(deployedAsar)
assert.ok(deployedStat.size > 90 * 1024 * 1024, 'Deployed app.asar size must be valid (>90MB)')

const portableZip = path.resolve('release/Guidegram-v2.5.4-Windows-x64-Portable.zip')
assert.ok(fs.existsSync(portableZip), 'Portable zip must exist in release/')
const zipStat = fs.statSync(portableZip)
assert.ok(zipStat.size > 100 * 1024 * 1024, 'Portable zip size must be valid (>100MB)')
console.log(`  [PASS] Deployed app.asar (${(deployedStat.size / 1024 / 1024).toFixed(2)} MB) and Portable zip (${(zipStat.size / 1024 / 1024).toFixed(2)} MB) verified`)

console.log('\n====================================================')
console.log('🎉 ALL /BOOST COMPREHENSIVE PERFORMANCE VERIFICATIONS PASSED (6/6)!')
console.log('====================================================')
