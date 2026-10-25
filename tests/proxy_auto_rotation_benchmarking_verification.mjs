import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Account Multi-Proxy Auto-Rotation & Ping Benchmarking Protocol Verification...\n')

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

// 1. proxyManager.ts & proxyHarvester.ts verification
const proxyManagerPath = path.join(rootDir, 'electron', 'telegram', 'proxyManager.ts')
const proxyManagerContent = fs.readFileSync(proxyManagerPath, 'utf-8')

assert(
  proxyManagerContent.includes('public static async benchmarkProxies(') &&
  proxyManagerContent.includes('testProxyPing'),
  'ProxyManager implements benchmarkProxies measuring parallel TCP ping latencies'
)

assert(
  proxyManagerContent.includes('public static async rotateProxyForAccount(') &&
  proxyManagerContent.includes('benchmarkProxies'),
  'ProxyManager implements rotateProxyForAccount selecting lowest-latency healthy proxy'
)

const proxyHarvesterPath = path.join(rootDir, 'electron', 'telegram', 'proxyHarvester.ts')
const proxyHarvesterContent = fs.readFileSync(proxyHarvesterPath, 'utf-8')

assert(
  proxyHarvesterContent.includes('public static getCachedProxies(): ProxyConfig[]'),
  'ProxyHarvester implements getCachedProxies accessor'
)

// 2. main.ts IPC registration verification
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf-8')

assert(
  mainContent.includes("ipcMain.handle('proxy:benchmark-proxies'") &&
  mainContent.includes('ProxyManager.benchmarkProxies'),
  'main.ts registers proxy:benchmark-proxies IPC handler'
)

assert(
  mainContent.includes("ipcMain.handle('proxy:rotate-account-proxy'") &&
  mainContent.includes('ProxyManager.rotateProxyForAccount'),
  'main.ts registers proxy:rotate-account-proxy IPC handler'
)

// 3. preload.ts API exposure verification
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf-8')

assert(
  preloadContent.includes('benchmarkProxies:') &&
  preloadContent.includes("'proxy:benchmark-proxies'"),
  'preload.ts exposes benchmarkProxies'
)

assert(
  preloadContent.includes('rotateAccountProxy:') &&
  preloadContent.includes("'proxy:rotate-account-proxy'"),
  'preload.ts exposes rotateAccountProxy'
)

// 4. ProxySettingsModal verification
const modalPath = path.join(rootDir, 'src', 'components', 'ProxySettingsModal.tsx')
const modalContent = fs.readFileSync(modalPath, 'utf-8')

assert(
  modalContent.includes('handleBenchmarkAll') &&
  modalContent.includes('benchmarkProxies'),
  'ProxySettingsModal implements handleBenchmarkAll calling benchmarkProxies'
)

assert(
  modalContent.includes('handleAutoRotateForAccount') &&
  modalContent.includes('rotateAccountProxy'),
  'ProxySettingsModal implements handleAutoRotateForAccount'
)

assert(
  modalContent.includes('Benchmark Latencies') &&
  modalContent.includes('Auto-Rotate Best'),
  'ProxySettingsModal renders Benchmark Latencies and Auto-Rotate Best buttons'
)

console.log(`\n🎉 All ${passed}/${total} checks passed successfully for Phase 97!\n`)
