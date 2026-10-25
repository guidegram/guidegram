#!/usr/bin/env node

/**
 * Guidegram MCP stdio Bridge
 * Relays standard input/output (stdio JSON-RPC 2.0) from AI hosts (Claude Desktop, Cursor, Antigravity)
 * to the internal Guidegram MCP HTTP server (127.0.0.1:39527).
 */

import http from 'node:http'
import readline from 'node:readline'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const args = process.argv.slice(2)

function getArgValue(flag, defaultValue) {
  const idx = args.indexOf(flag)
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1]
  }
  return defaultValue
}

const MCP_PORT = parseInt(process.env.GUIDEGRAM_MCP_PORT || getArgValue('--port', '39527'), 10)
const MCP_HOST = process.env.GUIDEGRAM_MCP_HOST || getArgValue('--host', '127.0.0.1')
const MCP_TOKEN = process.env.GUIDEGRAM_MCP_TOKEN || getArgValue('--token', '')
const AUTO_SPAWN = !args.includes('--no-spawn')

function logDebug(message) {
  process.stderr.write(`[Guidegram-MCP-Bridge] ${message}\n`)
}

function checkServerHealth(host, port, token) {
  return new Promise((resolve) => {
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const req = http.get(
      {
        host,
        port,
        path: '/health',
        headers,
        timeout: 1500,
      },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(true)
          } else {
            resolve(false)
          }
        })
      }
    )

    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

async function findAndLaunchGuidegramHeadless() {
  logDebug('Guidegram MCP server is not active. Attempting to start Guidegram in headless mode...')

  // 1. Check portable locator JSON
  const appData = process.env.APPDATA || ''
  const locatorPath = path.join(appData, 'Guidegram', 'portable_locator.json')
  let exePath = ''

  if (fs.existsSync(locatorPath)) {
    try {
      const info = JSON.parse(fs.readFileSync(locatorPath, 'utf-8'))
      if (info.executablePath && fs.existsSync(info.executablePath)) {
        exePath = info.executablePath
      }
    } catch {}
  }

  // 1.5 Check relative installation directory (e.g. <app>/resources/scripts/mcp-bridge.mjs)
  if (!exePath) {
    const candidatePaths = [
      path.resolve(__dirname, '../../Guidegram.exe'),
      path.resolve(__dirname, '../Guidegram.exe'),
      path.resolve(__dirname, '../../Guidegram'),
      path.resolve(__dirname, '../Guidegram'),
    ]
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        exePath = p
        break
      }
    }
  }

  // 2. Spawn process if executable found
  if (exePath) {
    logDebug(`Spawning Guidegram executable: ${exePath} --headless`)
    const child = spawn(exePath, ['--headless'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    })
    child.unref()
  } else {
    // 3. Fallback to local dev electron launcher using absolute repoRoot
    const packageJsonPath = path.join(repoRoot, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      logDebug(`Starting Guidegram via npm dev in headless mode from ${repoRoot}...`)
      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
      const child = spawn(npmCmd, ['run', 'dev', '--', '--headless'], {
        cwd: repoRoot,
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        shell: true,
      })
      child.unref()
    } else {
      logDebug('Guidegram executable not found. Please ensure Guidegram desktop app is running.')
    }
  }

  // Wait for server to become responsive (up to 15 seconds)
  const startTime = Date.now()
  while (Date.now() - startTime < 15000) {
    await new Promise((r) => setTimeout(r, 600))
    const isHealthy = await checkServerHealth(MCP_HOST, MCP_PORT, MCP_TOKEN)
    if (isHealthy) {
      logDebug('Guidegram MCP Server is now online.')
      return true
    }
  }

  logDebug('Timed out waiting for Guidegram MCP server to start.')
  return false
}

function sendJsonRpcToMcp(payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload)
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    }
    if (MCP_TOKEN) {
      headers['Authorization'] = `Bearer ${MCP_TOKEN}`
    }

    const req = http.request(
      {
        host: MCP_HOST,
        port: MCP_PORT,
        path: '/mcp',
        method: 'POST',
        headers,
        timeout: 300000, // 300s (5min) timeout for large file downloads / media lists
      },
      (res) => {
        let responseBody = ''
        res.setEncoding('utf-8')
        res.on('data', (chunk) => {
          responseBody += chunk
        })
        res.on('end', () => {
          if (res.statusCode === 204 || !responseBody.trim()) {
            return resolve(null)
          }
          try {
            const parsed = JSON.parse(responseBody)
            resolve(parsed)
          } catch (err) {
            reject(new Error(`Failed to parse MCP server response: ${responseBody}`))
          }
        })
      }
    )

    req.on('error', (err) => {
      reject(err)
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('MCP request timed out after 60 seconds'))
    })

    req.write(postData)
    req.end()
  })
}

async function main() {
  logDebug(`Connecting to Guidegram MCP at http://${MCP_HOST}:${MCP_PORT}...`)

  let isOnline = await checkServerHealth(MCP_HOST, MCP_PORT, MCP_TOKEN)
  if (!isOnline && AUTO_SPAWN) {
    isOnline = await findAndLaunchGuidegramHeadless()
  }

  if (!isOnline) {
    logDebug('Warning: Guidegram is not running. Requests will fail until Guidegram is opened.')
  } else {
    logDebug('Bridge connected successfully.')
  }

  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  })

  rl.on('line', async (line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.toLowerCase().startsWith('content-length:')) return

    let rpcMessage
    try {
      rpcMessage = JSON.parse(trimmed)
    } catch (err) {
      const errResponse = {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: invalid JSON' },
      }
      process.stdout.write(JSON.stringify(errResponse) + '\n')
      return
    }

    try {
      const response = await sendJsonRpcToMcp(rpcMessage)
      if (response) {
        process.stdout.write(JSON.stringify(response) + '\n')
      }
    } catch (err) {
      logDebug(`Error forwarding RPC message: ${err.message}`)
      // Per JSON-RPC 2.0: Never send an error response to a notification (message without id)
      if (rpcMessage?.id !== undefined && rpcMessage?.id !== null) {
        const errResponse = {
          jsonrpc: '2.0',
          id: rpcMessage.id,
          error: {
            code: -32603,
            message: `Guidegram MCP bridge error: ${err.message}`,
          },
        }
        process.stdout.write(JSON.stringify(errResponse) + '\n')
      }
    }
  })

  rl.on('close', () => {
    logDebug('Stdio stream closed. Exiting.')
    process.exit(0)
  })
}

main().catch((err) => {
  logDebug(`Fatal bridge error: ${err.stack || err}`)
  process.exit(1)
})
