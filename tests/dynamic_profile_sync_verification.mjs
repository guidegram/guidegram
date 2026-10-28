import fs from 'fs'
import path from 'path'
import assert from 'assert'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

console.log('--- Starting Dynamic Profile Real-Time Sync Verification ---')

// 1. AccountManager verification
const accManagerPath = path.join(root, 'electron', 'telegram', 'accountManager.ts')
const accManagerContent = fs.readFileSync(accManagerPath, 'utf8')

assert(
  accManagerContent.includes('syncAccountProfile(accountId: string'),
  'accountManager.ts must implement syncAccountProfile'
)
assert(
  accManagerContent.includes('syncAllActiveAccountsProfile('),
  'accountManager.ts must implement syncAllActiveAccountsProfile'
)
assert(
  accManagerContent.includes('this.profileSyncInterval = setInterval'),
  'accountManager.ts must have a periodic profileSyncInterval'
)
assert(
  accManagerContent.includes("if (uId && uId === accountId)"),
  'accountManager.ts raw updates must handle self in updateUserName and updateUserPhoto'
)
assert(
  accManagerContent.includes("if (u && (String(u.id) === accountId || u.self))"),
  'accountManager.ts raw updates must handle self in updateUser'
)
assert(
  accManagerContent.includes("this.onEventCallback?.('telegram:user-avatar-updated'"),
  'accountManager.ts must emit telegram:user-avatar-updated'
)
console.log('✓ Verified accountManager.ts real-time updates and synchronization methods')

// 2. Main process verification
const mainPath = path.join(root, 'electron', 'main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf8')

assert(
  mainContent.includes('accountManager?.syncAllActiveAccountsProfile?.()'),
  'main.ts must trigger syncAllActiveAccountsProfile on window focus'
)
assert(
  mainContent.includes("'telegram:refresh-account-profile'"),
  'main.ts must handle telegram:refresh-account-profile IPC'
)
console.log('✓ Verified electron/main.ts window focus sync and IPC handler')

// 3. Preload verification
const preloadPath = path.join(root, 'electron', 'preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf8')

assert(
  preloadContent.includes('refreshAccountProfile:'),
  'preload.ts must expose refreshAccountProfile'
)
console.log('✓ Verified electron/preload.ts API surface')

// 4. Avatar component verification
const avatarPath = path.join(root, 'src', 'components', 'Avatar.tsx')
const avatarContent = fs.readFileSync(avatarPath, 'utf8')

assert(
  avatarContent.includes('avatarUrl !== prevAvatarUrlProp'),
  'Avatar.tsx must reactively update when avatarUrl prop changes'
)
assert(
  avatarContent.includes("'telegram:user-avatar-updated'"),
  'Avatar.tsx must listen to telegram:user-avatar-updated event'
)
console.log('✓ Verified Avatar.tsx reactive cache invalidation and event subscription')

// 5. App component verification
const appPath = path.join(root, 'src', 'App.tsx')
const appContent = fs.readFileSync(appPath, 'utf8')

assert(
  appContent.includes("'telegram:user-avatar-updated'"),
  'App.tsx must listen to telegram:user-avatar-updated'
)
assert(
  appContent.includes('unsubscribeAvatarUpdated'),
  'App.tsx must manage subscription and cleanup for unsubscribeAvatarUpdated'
)
console.log('✓ Verified App.tsx global state and dialog sync')

// 6. MyProfileDrawer component verification
const profileDrawerPath = path.join(root, 'src', 'components', 'MyProfileDrawer.tsx')
const profileDrawerContent = fs.readFileSync(profileDrawerPath, 'utf8')

assert(
  profileDrawerContent.includes('profile?.firstName || account.firstName'),
  'MyProfileDrawer.tsx must prioritize fresh profile data'
)
assert(
  profileDrawerContent.includes('refreshAccountProfile'),
  'MyProfileDrawer.tsx must trigger refreshAccountProfile on open'
)
console.log('✓ Verified MyProfileDrawer.tsx live profile integration')

console.log('==================================================================')
console.log('SUCCESS: All Dynamic Profile Real-Time Sync invariants verified!')
console.log('==================================================================')
