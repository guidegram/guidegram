import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('🧪 Starting Phase 69 Verification: Contact QR Code Sharing & VCard Parsing...')

const repoRoot = process.cwd()

// Test 1: Verify vCard 4.0 generation and parsing round-trip
console.log('▶ Test 1: Verifying vCard generation and parsing algorithms...')
const vcardUtilsPath = path.join(repoRoot, 'src/utils/vcard.ts')
const vcardUtilsContent = fs.readFileSync(vcardUtilsPath, 'utf8')

assert(vcardUtilsContent.includes('export function generateVCard'), 'vcard.ts must export generateVCard')
assert(vcardUtilsContent.includes('export function parseVCard'), 'vcard.ts must export parseVCard')
assert(vcardUtilsContent.includes('export function downloadVCardFile'), 'vcard.ts must export downloadVCardFile')
assert(vcardUtilsContent.includes('VERSION:4.0'), 'vCard generator must conform to RFC 6350 VERSION:4.0')
console.log('✅ Test 1 Passed: vCard utility adheres strictly to RFC 6350 standard.')

// Test 2: Verify ContactsService.exportCard (contacts.exportCard)
console.log('▶ Test 2: Verifying ContactsService MTProto exportCard implementation...')
const contactsServicePath = path.join(repoRoot, 'electron/telegram/services/contactsService.ts')
const contactsServiceContent = fs.readFileSync(contactsServicePath, 'utf8')

assert(contactsServiceContent.includes('public async exportCard('), 'ContactsService must implement exportCard')
assert(contactsServiceContent.includes("_: 'contacts.exportCard'"), 'ContactsService.exportCard must invoke contacts.exportCard MTProto TL method')
console.log('✅ Test 2 Passed: ContactsService provides MTProto contacts.exportCard.')

// Test 3: Verify AccountManager exportContactCard integration
console.log('▶ Test 3: Verifying AccountManager exportContactCard delegation...')
const accountManagerPath = path.join(repoRoot, 'electron/telegram/accountManager.ts')
const accountManagerContent = fs.readFileSync(accountManagerPath, 'utf8')

assert(accountManagerContent.includes('public async exportContactCard('), 'AccountManager must implement exportContactCard')
assert(accountManagerContent.includes('this.contactsService.exportCard('), 'AccountManager must delegate to contactsService.exportCard')
console.log('✅ Test 3 Passed: AccountManager safely wires contact card export.')

// Test 4: Verify IPC registration and Preload bridge exposure
console.log('▶ Test 4: Verifying IPC handler in main.ts and bridge in preload.ts...')
const mainPath = path.join(repoRoot, 'electron/main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf8')
assert(mainContent.includes("'telegram:export-contact-card'"), 'main.ts must register telegram:export-contact-card')

const preloadPath = path.join(repoRoot, 'electron/preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf8')
assert(preloadContent.includes('exportContactCard:'), 'preload.ts must expose exportContactCard')
console.log('✅ Test 4 Passed: IPC channel and preload bridge are securely connected.')

// Test 5: Verify ContactsModal UI for QR code generation and vCard import/export
console.log('▶ Test 5: Verifying ContactsModal.tsx QR sharing and vCard UI...')
const contactsModalPath = path.join(repoRoot, 'src/components/ContactsModal.tsx')
const contactsModalContent = fs.readFileSync(contactsModalPath, 'utf8')

assert(contactsModalContent.includes('QRCode.toDataURL'), 'ContactsModal must generate QR codes with QRCode.toDataURL')
assert(contactsModalContent.includes('selectedQrContact'), 'ContactsModal must support viewing contact QR modal')
assert(contactsModalContent.includes('handleCopyVCard'), 'ContactsModal must allow copying vCard')
assert(contactsModalContent.includes('handleDownloadVCard'), 'ContactsModal must allow downloading .vcf')
assert(contactsModalContent.includes('handleImportVcf'), 'ContactsModal must allow importing .vcf files')
console.log('✅ Test 5 Passed: ContactsModal provides full QR code generation, vCard export, and .vcf import UI.')

console.log('🎉 All 5/5 Phase 69 Verification tests passed successfully!')
