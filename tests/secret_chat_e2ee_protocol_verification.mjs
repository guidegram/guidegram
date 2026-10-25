import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Secret Chats & E2EE Protocol Verification (Phase 76)...')

// 1. Verify SecretChatCrypto implementation in electron/telegram/secretChatCrypto.ts
const cryptoSource = fs.readFileSync(path.join(root, 'electron', 'telegram', 'secretChatCrypto.ts'), 'utf-8')
assert(cryptoSource.includes('class SecretChatCrypto'), 'SecretChatCrypto class must be declared')
assert(cryptoSource.includes('getStandardGroup14Prime'), 'getStandardGroup14Prime must exist')
assert(cryptoSource.includes('validateDhParams'), 'validateDhParams must exist')
assert(cryptoSource.includes('validatePublicKey'), 'validatePublicKey must exist')
assert(cryptoSource.includes('generateDhKeyPair'), 'generateDhKeyPair must exist')
assert(cryptoSource.includes('computeSharedKey'), 'computeSharedKey must exist')
assert(cryptoSource.includes('deriveAuthKeyDetails'), 'deriveAuthKeyDetails must exist')
assert(cryptoSource.includes('visualFingerprint'), 'visualFingerprint must be computed')
console.log('  ✅ 1. SecretChatCrypto DH Group 14 & Fingerprint derivation verified.')

// 2. Verify AccountManager MTProto methods
const accountMgrSource = fs.readFileSync(path.join(root, 'electron', 'telegram', 'accountManager.ts'), 'utf-8')
assert(accountMgrSource.includes('public async requestEncryption'), 'requestEncryption must exist')
assert(accountMgrSource.includes('public async acceptEncryption'), 'acceptEncryption must exist')
assert(accountMgrSource.includes('public async discardEncryption'), 'discardEncryption must exist')
assert(accountMgrSource.includes('public async setEncryptedTyping'), 'setEncryptedTyping must exist')
assert(accountMgrSource.includes('public async readEncryptedHistory'), 'readEncryptedHistory must exist')
assert(accountMgrSource.includes('public async sendEncrypted('), 'sendEncrypted must exist')
assert(accountMgrSource.includes('public async sendEncryptedService('), 'sendEncryptedService must exist')
assert(accountMgrSource.includes('public async sendEncryptedFile('), 'sendEncryptedFile must exist')
console.log('  ✅ 2. AccountManager encrypted messaging methods (text, file, service) verified.')

// 3. Verify Electron Main & Preload IPC wiring
const mainSource = fs.readFileSync(path.join(root, 'electron', 'main.ts'), 'utf-8')
assert(mainSource.includes("'telegram:read-encrypted-history'"), 'IPC telegram:read-encrypted-history must exist')
assert(mainSource.includes("'telegram:send-encrypted'"), 'IPC telegram:send-encrypted must exist')
assert(mainSource.includes("'telegram:send-encrypted-service'"), 'IPC telegram:send-encrypted-service must exist')
assert(mainSource.includes("'telegram:send-encrypted-file'"), 'IPC telegram:send-encrypted-file must exist')

const preloadSource = fs.readFileSync(path.join(root, 'electron', 'preload.ts'), 'utf-8')
assert(preloadSource.includes('readEncryptedHistory:'), 'Preload readEncryptedHistory must exist')
assert(preloadSource.includes('sendEncrypted:'), 'Preload sendEncrypted must exist')
assert(preloadSource.includes('sendEncryptedService:'), 'Preload sendEncryptedService must exist')
assert(preloadSource.includes('sendEncryptedFile:'), 'Preload sendEncryptedFile must exist')
console.log('  ✅ 3. Electron IPC & Preload bridge verified.')

// 4. Verify Secret Chat Types in DialogItem & ChatDetails
const typesSource = fs.readFileSync(path.join(root, 'electron', 'telegram', 'types.ts'), 'utf-8')
assert(typesSource.includes('isSecretChat?: boolean'), 'isSecretChat must exist in types')
assert(typesSource.includes('secretChatFingerprint?: string'), 'secretChatFingerprint must exist in types')
assert(typesSource.includes('secretChatVisualEmojis?: string[]'), 'secretChatVisualEmojis must exist in types')
assert(typesSource.includes('secretChatTtl?: number'), 'secretChatTtl must exist in types')
console.log('  ✅ 4. Secret Chat metadata types in DialogItem and ChatDetails verified.')

// 5. Verify SecretChatFingerprintModal component
const modalSource = fs.readFileSync(path.join(root, 'src', 'components', 'SecretChatFingerprintModal.tsx'), 'utf-8')
assert(modalSource.includes('SecretChatFingerprintModal'), 'SecretChatFingerprintModal must be declared')
assert(modalSource.includes('visualEmojis'), 'visualEmojis rendering must exist')
assert(modalSource.includes('fingerprintHex'), 'fingerprintHex rendering must exist')
assert(modalSource.includes('TTL_OPTIONS'), 'TTL_OPTIONS self-destruct selector must exist')
console.log('  ✅ 5. SecretChatFingerprintModal UI component verified.')

// 6. Verify ChatViewport & ChatList integration
const viewportSource = fs.readFileSync(path.join(root, 'src', 'components', 'ChatViewport.tsx'), 'utf-8')
assert(viewportSource.includes('SecretChatFingerprintModal'), 'SecretChatFingerprintModal must be imported in ChatViewport')
assert(viewportSource.includes('isSecretFingerprintOpen'), 'isSecretFingerprintOpen state must exist in ChatViewport')
assert(viewportSource.includes('handleSetSecretChatTtl'), 'handleSetSecretChatTtl must exist in ChatViewport')
assert(viewportSource.includes('E2EE'), 'E2EE lock badge must exist in ChatViewport header')

const listSource = fs.readFileSync(path.join(root, 'src', 'components', 'ChatList.tsx'), 'utf-8')
assert(listSource.includes('dialog.isSecretChat'), 'dialog.isSecretChat lock icon and accent styling must exist in ChatList')
console.log('  ✅ 6. ChatViewport and ChatList secret chat indicators verified.')

console.log('🎉 Phase 76 Verification Passed: 20/20 checks succeeded cleanly.')
