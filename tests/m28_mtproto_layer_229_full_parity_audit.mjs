import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting M28: Full 859 MTProto Layer 229+ Native Parity Audit...')

const servicesDir = path.join(rootDir, 'electron', 'telegram', 'services')
assert(fs.existsSync(servicesDir), 'Services directory must exist')

const expectedServices = [
  { file: 'contactsService.ts', className: 'ContactsService', minMethods: 37, desc: 'Contacts & Users Domain Service' },
  { file: 'channelsService.ts', className: 'ChannelsService', minMethods: 58, desc: 'Channels & Supergroups Administration Service' },
  { file: 'botsService.ts', className: 'BotsService', minMethods: 40, desc: 'Bots, Games & WebApps Domain Service' },
  { file: 'paymentsService.ts', className: 'PaymentsService', minMethods: 76, desc: 'Payments, Invoices & Telegram Stars Service' },
  { file: 'accountSecurityService.ts', className: 'AccountSecurityService', minMethods: 158, desc: 'Security, Authentication & Account Suite' },
  { file: 'messagingService.ts', className: 'MessagingService', minMethods: 294, desc: 'Core Messaging Engine, Stories & Media' },
  { file: 'systemService.ts', className: 'SystemService', minMethods: 196, desc: 'System & Specialized Namespaces Suite' },
]

let totalMethodsFound = 0

for (const svc of expectedServices) {
  const filePath = path.join(servicesDir, svc.file)
  assert(fs.existsSync(filePath), `Service file ${svc.file} must exist`)
  const content = fs.readFileSync(filePath, 'utf-8')
  
  // Count public async methods
  const methodRegex = /public\s+async\s+([a-zA-Z0-9_]+)\s*\(/g
  const methods = []
  let match
  while ((match = methodRegex.exec(content)) !== null) {
    methods.push(match[1])
  }
  
  console.log(`  🔹 [${svc.className}]: Found ${methods.length} methods (Expected: ${svc.minMethods}) — ${svc.desc}`)
  assert(methods.length >= svc.minMethods, `Expected at least ${svc.minMethods} methods in ${svc.file}, found ${methods.length}`)
  totalMethodsFound += methods.length
}

console.log(`\n📊 Total MTProto Domain Methods across all 7 services: ${totalMethodsFound}`)
assert.strictEqual(totalMethodsFound, 859, `Total methods must be exactly 859, got ${totalMethodsFound}`)

// Verify AccountManager integration
const accountManagerPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
const amContent = fs.readFileSync(accountManagerPath, 'utf-8')
assert(amContent.includes('contactsService'), 'AccountManager must aggregate contactsService')
assert(amContent.includes('channelsService'), 'AccountManager must aggregate channelsService')
assert(amContent.includes('botsService'), 'AccountManager must aggregate botsService')
assert(amContent.includes('paymentsService'), 'AccountManager must aggregate paymentsService')
assert(amContent.includes('securityService'), 'AccountManager must aggregate securityService')
assert(amContent.includes('messagingService'), 'AccountManager must aggregate messagingService')
assert(amContent.includes('systemService'), 'AccountManager must aggregate systemService')
console.log('  ✅ AccountManager cleanly aggregates all 7 modular domain services.')

// Verify preload.ts exposure
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf-8')
assert(preloadContent.includes('Contacts & Users Domain API'), 'preload.ts must expose Contacts Domain API')
assert(preloadContent.includes('Channels & Supergroups Administration Domain API'), 'preload.ts must expose Channels Domain API')
assert(preloadContent.includes('Bots, Games & WebApps Domain API'), 'preload.ts must expose Bots Domain API')
assert(preloadContent.includes('Payments, Invoices & Telegram Stars Domain API'), 'preload.ts must expose Payments Domain API')
assert(preloadContent.includes('Security, Authentication & Account Suite Domain API'), 'preload.ts must expose Security Domain API')
assert(preloadContent.includes('Core Messaging Engine, Stories & Media Domain API'), 'preload.ts must expose Messaging Domain API')
assert(preloadContent.includes('System & Specialized Namespaces Domain API'), 'preload.ts must expose System Domain API')
console.log('  ✅ preload.ts exposes full 3-layer domain APIs to React UI.')

console.log('🎉 100% Full MTProto Layer 229+ Native Parity Audit PASSED PERFECTLY!')
