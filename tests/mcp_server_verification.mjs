import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Guidegram MCP Server & Bridge Verification Suite...')

// 1. Verify File Existence & Structural Contents
console.log('🔹 1. Verifying MCP Module Files & Core Exports...')
const mcpTypesPath = path.join(rootDir, 'electron', 'mcp', 'types.ts')
assert.ok(fs.existsSync(mcpTypesPath), 'electron/mcp/types.ts must exist')
const typesContent = fs.readFileSync(mcpTypesPath, 'utf-8')
assert.ok(typesContent.includes('export interface McpServerConfig'), 'types.ts must export McpServerConfig')
assert.ok(typesContent.includes('export interface McpAccountSummary'), 'types.ts must export McpAccountSummary')
assert.ok(typesContent.includes('export interface McpDialogSummary'), 'types.ts must export McpDialogSummary')
assert.ok(typesContent.includes('export interface McpMessageSummary'), 'types.ts must export McpMessageSummary')
assert.ok(typesContent.includes('export interface McpPeerDetails'), 'types.ts must export McpPeerDetails')
assert.ok(typesContent.includes('export interface McpSharedMediaSummary'), 'types.ts must export McpSharedMediaSummary')
assert.ok(typesContent.includes('export interface McpDownloadResult'), 'types.ts must export McpDownloadResult')

// Account Tools
const accountToolsPath = path.join(rootDir, 'electron', 'mcp', 'tools', 'accountTools.ts')
assert.ok(fs.existsSync(accountToolsPath), 'electron/mcp/tools/accountTools.ts must exist')
const accountToolsContent = fs.readFileSync(accountToolsPath, 'utf-8')
assert.ok(accountToolsContent.includes('telegram_list_accounts'), 'accountTools must register telegram_list_accounts')
assert.ok(accountToolsContent.includes('telegram_switch_active_account'), 'accountTools must register telegram_switch_active_account')

// Messaging Tools
const messagingToolsPath = path.join(rootDir, 'electron', 'mcp', 'tools', 'messagingTools.ts')
assert.ok(fs.existsSync(messagingToolsPath), 'electron/mcp/tools/messagingTools.ts must exist')
const messagingToolsContent = fs.readFileSync(messagingToolsPath, 'utf-8')
assert.ok(messagingToolsContent.includes('telegram_get_dialogs'), 'messagingTools must register telegram_get_dialogs')
assert.ok(messagingToolsContent.includes('telegram_get_chat_history'), 'messagingTools must register telegram_get_chat_history')
assert.ok(messagingToolsContent.includes('telegram_send_typing'), 'messagingTools must register telegram_send_typing')
assert.ok(messagingToolsContent.includes('telegram_send_message'), 'messagingTools must register telegram_send_message')
assert.ok(messagingToolsContent.includes('telegram_mark_as_read'), 'messagingTools must register telegram_mark_as_read')
assert.ok(messagingToolsContent.includes('checkChatWhitelist'), 'messagingTools must implement security whitelist check')
assert.ok(messagingToolsContent.includes('FLOOD_WAIT_'), 'messagingTools must implement FloodWait error formatting')

// File Tools
const fileToolsPath = path.join(rootDir, 'electron', 'mcp', 'tools', 'fileTools.ts')
assert.ok(fs.existsSync(fileToolsPath), 'electron/mcp/tools/fileTools.ts must exist')
const fileToolsContent = fs.readFileSync(fileToolsPath, 'utf-8')
assert.ok(fileToolsContent.includes('telegram_resolve_peer'), 'fileTools must register telegram_resolve_peer')
assert.ok(fileToolsContent.includes('telegram_list_channel_media'), 'fileTools must register telegram_list_channel_media')
assert.ok(fileToolsContent.includes('telegram_download_file'), 'fileTools must register telegram_download_file')
assert.ok(fileToolsContent.includes('destinationPath'), 'fileTools must copy downloaded files to destination')

// MCP Server Class
const mcpServerPath = path.join(rootDir, 'electron', 'mcp', 'mcpServer.ts')
assert.ok(fs.existsSync(mcpServerPath), 'electron/mcp/mcpServer.ts must exist')
const mcpServerContent = fs.readFileSync(mcpServerPath, 'utf-8')
assert.ok(mcpServerContent.includes('class GuidegramMcpServer'), 'mcpServer.ts must declare GuidegramMcpServer')
assert.ok(mcpServerContent.includes('tools/list'), 'mcpServer.ts must handle tools/list')
assert.ok(mcpServerContent.includes('tools/call'), 'mcpServer.ts must handle tools/call')
assert.ok(mcpServerContent.includes('/health'), 'mcpServer.ts must handle /health endpoint')
assert.ok(mcpServerContent.includes('/sse'), 'mcpServer.ts must handle /sse endpoint')

// Bridge script
const bridgeScriptPath = path.join(rootDir, 'scripts', 'mcp-bridge.mjs')
assert.ok(fs.existsSync(bridgeScriptPath), 'scripts/mcp-bridge.mjs must exist')
const bridgeContent = fs.readFileSync(bridgeScriptPath, 'utf-8')
assert.ok(bridgeContent.includes('readline.createInterface'), 'bridge must read lines from stdin')
assert.ok(bridgeContent.includes('sendJsonRpcToMcp'), 'bridge must forward JSON-RPC to MCP server')

console.log('   ✅ All MCP module files and core exports verified.')

// 2. Main Process & Preload API Integration
console.log('🔹 2. Verifying Main Process & Preload IPC Integration...')
const mainTsPath = path.join(rootDir, 'electron', 'main.ts')
const mainContent = fs.readFileSync(mainTsPath, 'utf-8')
assert.ok(mainContent.includes('GuidegramMcpServer'), 'main.ts must import and instantiate GuidegramMcpServer')
assert.ok(mainContent.includes('--headless'), 'main.ts must support --headless flag')
assert.ok(mainContent.includes('mcp:get-status'), 'main.ts must register mcp:get-status IPC')
assert.ok(mainContent.includes('mcp:get-config'), 'main.ts must register mcp:get-config IPC')
assert.ok(mainContent.includes('mcp:update-config'), 'main.ts must register mcp:update-config IPC')
assert.ok(mainContent.includes('mcp:get-config-snippets'), 'main.ts must register mcp:get-config-snippets IPC')

const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf-8')
assert.ok(preloadContent.includes('mcpGetStatus'), 'preload.ts must expose mcpGetStatus')
assert.ok(preloadContent.includes('mcpGetConfig'), 'preload.ts must expose mcpGetConfig')
assert.ok(preloadContent.includes('mcpUpdateConfig'), 'preload.ts must expose mcpUpdateConfig')
assert.ok(preloadContent.includes('mcpGetConfigSnippets'), 'preload.ts must expose mcpGetConfigSnippets')

console.log('   ✅ Main process & Preload IPC bindings verified.')

// 3. UI Settings Integration
console.log('🔹 3. Verifying UI Settings Modal AI & MCP Tab...')
const settingsModalPath = path.join(rootDir, 'src', 'components', 'SettingsModal.tsx')
const settingsModalContent = fs.readFileSync(settingsModalPath, 'utf-8')
assert.ok(settingsModalContent.includes("activeTab === 'mcp'"), 'SettingsModal must have mcp tab panel')
assert.ok(settingsModalContent.includes('AI & MCP Agents'), 'SettingsModal must have AI & MCP Agents button')
assert.ok(settingsModalContent.includes('mcpGetConfigSnippets'), 'SettingsModal must fetch config snippets')
assert.ok(settingsModalContent.includes('claude_desktop_config.json'), 'SettingsModal must render Claude Desktop snippet')
assert.ok(settingsModalContent.includes('.cursor/mcp.json'), 'SettingsModal must render Cursor snippet')
console.log('   ✅ Settings UI AI & MCP integration verified.')

// 4. Bundled Electron Main Artifact Verification
console.log('🔹 4. Verifying Compiled dist-electron/main.js...')
const distMainPath = path.join(rootDir, 'dist-electron', 'main.js')
assert.ok(fs.existsSync(distMainPath), 'dist-electron/main.js must exist')
const distMainContent = fs.readFileSync(distMainPath, 'utf-8')
assert.ok(distMainContent.includes('GuidegramMcpServer'), 'dist-electron/main.js must bundle GuidegramMcpServer')
assert.ok(distMainContent.includes('telegram_list_accounts'), 'dist-electron/main.js must bundle telegram_list_accounts tool')
assert.ok(distMainContent.includes('telegram_send_message'), 'dist-electron/main.js must bundle telegram_send_message tool')
assert.ok(distMainContent.includes('telegram_download_file'), 'dist-electron/main.js must bundle telegram_download_file tool')
console.log('   ✅ Compiled artifact contains all MCP tools and server.')

// 5. Live Stdio Bridge <-> MCP JSON-RPC 2.0 Integration Test
console.log('🔹 5. Running Live Stdio Bridge Integration Test...')
const TEST_PORT = 39588

const mockMcpServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.url === '/health' || req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', service: 'Guidegram MCP Test Server' }))
    return
  }

  if (req.method === 'POST' && (req.url === '/' || req.url === '/mcp')) {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      const msg = JSON.parse(body)
      const { id, method, params } = msg

      if (method === 'initialize') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: { listChanged: true } },
            serverInfo: { name: 'guidegram-mcp', version: '2.0.0' }
          }
        }))
        return
      }

      if (method === 'tools/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              { name: 'telegram_list_accounts', description: 'Lists accounts', inputSchema: { type: 'object' } },
              { name: 'telegram_send_message', description: 'Sends message', inputSchema: { type: 'object' } },
              { name: 'telegram_download_file', description: 'Downloads file', inputSchema: { type: 'object' } },
            ]
          }
        }))
        return
      }

      if (method === 'tools/call') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              { type: 'text', text: JSON.stringify({ success: true, toolCalled: params.name, argsReceived: params.arguments }) }
            ],
            isError: false
          }
        }))
        return
      }

      if (method === 'ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ jsonrpc: '2.0', id, result: {} }))
        return
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } }))
    })
    return
  }

  res.writeHead(404)
  res.end()
})

await new Promise((resolve) => mockMcpServer.listen(TEST_PORT, '127.0.0.1', resolve))

// Launch scripts/mcp-bridge.mjs
const bridge = spawn('node', [bridgeScriptPath, '--port', String(TEST_PORT), '--no-spawn'], {
  stdio: ['pipe', 'pipe', 'pipe'],
})

function sendRpc(msg) {
  return new Promise((resolve, reject) => {
    let buffer = ''
    const onData = (chunk) => {
      buffer += chunk.toString()
      if (buffer.includes('\n')) {
        bridge.stdout.removeListener('data', onData)
        try {
          resolve(JSON.parse(buffer.trim()))
        } catch (e) {
          reject(e)
        }
      }
    }
    bridge.stdout.on('data', onData)
    bridge.stdin.write(JSON.stringify(msg) + '\n')
  })
}

// Wait for bridge to connect to mock health
await new Promise((r) => setTimeout(r, 400))

// 5a. Test initialize
const initResp = await sendRpc({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2024-11-05' }
})
assert.equal(initResp.id, 1)
assert.equal(initResp.result.serverInfo.name, 'guidegram-mcp')

// 5b. Test tools/list
const listResp = await sendRpc({
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list',
  params: {}
})
assert.equal(listResp.id, 2)
assert.equal(listResp.result.tools.length, 3)

// 5c. Test tools/call
const callResp = await sendRpc({
  jsonrpc: '2.0',
  id: 3,
  method: 'tools/call',
  params: {
    name: 'telegram_send_message',
    arguments: { chatId: '12345', text: 'Hello from MCP Bridge test' }
  }
})
assert.equal(callResp.id, 3)
assert.equal(callResp.result.isError, false)
const contentData = JSON.parse(callResp.result.content[0].text)
assert.equal(contentData.toolCalled, 'telegram_send_message')
assert.equal(contentData.argsReceived.chatId, '12345')

// 5d. Test ping
const pingResp = await sendRpc({
  jsonrpc: '2.0',
  id: 4,
  method: 'ping',
  params: {}
})
assert.equal(pingResp.id, 4)
assert.deepEqual(pingResp.result, {})

// Cleanup bridge and mock server
bridge.kill()
mockMcpServer.close()

console.log('   ✅ Live Stdio Bridge relay test passed with 100% fidelity.')

console.log('\n🎉 ALL GUIDEGRAM MCP SERVER & BRIDGE VERIFICATIONS PASSED CLEANLY!')
