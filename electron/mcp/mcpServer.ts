import http from 'http'
import { URL } from 'url'
import type { AccountManager } from '../telegram/accountManager'
import type { SessionStore } from '../telegram/sessionStore'
import type { McpServerConfig } from './types'
import { Logger } from '../telegram/logger'
import {
  accountToolsDefinitions,
  listAccountsHandler,
  switchActiveAccountHandler,
} from './tools/accountTools.js'
import {
  messagingToolsDefinitions,
  getDialogsHandler,
  getChatHistoryHandler,
  sendTypingHandler,
  sendMessageHandler,
  markAsReadHandler,
  sendMediaHandler,
  forwardMessagesHandler,
  sendReactionHandler,
  manageMessageHandler,
  createPollHandler,
} from './tools/messagingTools.js'
import {
  fileToolsDefinitions,
  resolvePeerHandler,
  listChannelMediaHandler,
  downloadFileHandler,
} from './tools/fileTools.js'
import {
  searchToolsDefinitions,
  searchMessagesHandler,
  searchContactsHandler,
  searchDialogsHandler,
} from './tools/searchTools.js'
import {
  channelToolsDefinitions,
  manageChannelHandler,
} from './tools/channelTools.js'
import {
  universalRpcToolsDefinitions,
  discoverMethodsHandler,
  invokeRawMethodHandler,
} from './tools/universalRpcTools.js'
import { safeJsonStringify } from './utils/safeJson.js'

export class GuidegramMcpServer {
  private server: http.Server | null = null
  private accountManager: AccountManager
  private sessionStore: SessionStore
  private config: McpServerConfig
  private isRunning = false
  private activeConnections = new Set<http.ServerResponse>()

  constructor(
    accountManager: AccountManager,
    sessionStore: SessionStore,
    initialConfig?: Partial<McpServerConfig>
  ) {
    this.accountManager = accountManager
    this.sessionStore = sessionStore

    const savedConfig = this.sessionStore.getConfig()?.mcp
    this.config = {
      enabled: savedConfig?.enabled ?? initialConfig?.enabled ?? true,
      port: savedConfig?.port || initialConfig?.port || 39527,
      token: savedConfig?.token || initialConfig?.token,
      allowedChatIds: savedConfig?.allowedChatIds || initialConfig?.allowedChatIds || [],
      defaultDownloadDir: savedConfig?.defaultDownloadDir || initialConfig?.defaultDownloadDir || '',
      autoStartWithApp: savedConfig?.autoStartWithApp ?? true,
    }
  }

  public getConfig(): McpServerConfig {
    return { ...this.config }
  }

  public updateConfig(newConfig: Partial<McpServerConfig>): void {
    const prevPort = this.config.port
    const prevEnabled = this.config.enabled

    this.config = {
      ...this.config,
      ...newConfig,
    }

    // Persist to session store
    try {
      this.sessionStore.updateConfig({ mcp: this.config })
    } catch (err) {
      Logger.warn('[MCP] Failed to persist MCP config to session store:', err)
    }

    // Restart server if port changed or enabled toggled
    if (this.isRunning && (!this.config.enabled || this.config.port !== prevPort)) {
      this.stop()
      if (this.config.enabled) {
        this.start().catch((err) => Logger.error('[MCP] Failed to restart server on new port:', err))
      }
    } else if (!this.isRunning && this.config.enabled && !prevEnabled) {
      this.start().catch((err) => Logger.error('[MCP] Failed to start server after enabling:', err))
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning || !this.config.enabled) {
      return
    }

    const port = this.config.port || 39527

    return new Promise<void>((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleHttpRequest(req, res).catch((err) => {
          Logger.error('[MCP] Unhandled error in HTTP request:', err)
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Internal Server Error' }))
          }
        })
      })

      this.server.on('error', (err: any) => {
        Logger.error(`[MCP] Server error on port ${port}:`, err)
        this.isRunning = false
        reject(err)
      })

      this.server.listen(port, '127.0.0.1', () => {
        this.isRunning = true
        Logger.info(`[MCP] Guidegram MCP Server listening on http://127.0.0.1:${port}`)
        resolve()
      })
    })
  }

  public stop(): void {
    if (!this.isRunning || !this.server) {
      return
    }

    Logger.info('[MCP] Stopping Guidegram MCP Server...')
    for (const res of this.activeConnections) {
      try {
        res.end()
      } catch {}
    }
    this.activeConnections.clear()

    try {
      this.server.close(() => {
        Logger.info('[MCP] Guidegram MCP Server stopped.')
      })
    } catch {}

    this.server = null
    this.isRunning = false
  }

  public getStatus(): { isRunning: boolean; port: number; enabled: boolean; activeToolsCount: number } {
    return {
      isRunning: this.isRunning,
      port: this.config.port,
      enabled: this.config.enabled,
      activeToolsCount: this.getAllToolsDefinitions().length,
    }
  }

  private getAllToolsDefinitions() {
    return [
      ...accountToolsDefinitions,
      ...messagingToolsDefinitions,
      ...fileToolsDefinitions,
      ...searchToolsDefinitions,
      ...channelToolsDefinitions,
      ...universalRpcToolsDefinitions,
    ]
  }

  private async handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // MM-005: Strict CORS Scoping - never use wildcard * on authenticated or local tool endpoints
    const origin = req.headers.origin
    const isAllowedOrigin = origin && (
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
      /^vscode-webview:\/\/[a-z0-9-]+$/.test(origin)
    )

    if (isAllowedOrigin && origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(isAllowedOrigin ? 204 : 403)
      res.end()
      return
    }

    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`)
    const pathname = parsedUrl.pathname

    // Authentication token validation (if token is configured)
    if (this.config.token) {
      const authHeader = req.headers['authorization'] || ''
      const queryToken = parsedUrl.searchParams.get('token')
      const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim()

      if (bearerToken !== this.config.token && queryToken !== this.config.token) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Unauthorized: Invalid MCP token' }))
        return
      }
    }

    // Health / Status endpoint
    if (pathname === '/health' || pathname === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'Guidegram MCP Server',
          version: '2.0.0',
          port: this.config.port,
          isRunning: this.isRunning,
          accountsCount: this.accountManager.getAccounts().length,
        })
      )
      return
    }

    // Server-Sent Events (SSE) support for MCP clients that use SSE transport
    if (pathname === '/sse') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })
      res.write(`event: endpoint\ndata: /mcp\n\n`)

      this.activeConnections.add(res)
      req.on('close', () => {
        this.activeConnections.delete(res)
      })
      return
    }

    // MCP JSON-RPC handler (POST / or POST /mcp)
    if (req.method === 'POST' && (pathname === '/' || pathname === '/mcp')) {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })

      req.on('end', async () => {
        try {
          const payload = JSON.parse(body)
          if (Array.isArray(payload)) {
            // Batch JSON-RPC
            const responses = await Promise.all(payload.map((msg) => this.handleJsonRpcMessage(msg)))
            const filtered = responses.filter(Boolean)
            if (filtered.length === 0) {
              res.writeHead(204)
              res.end()
            } else {
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(safeJsonStringify(filtered))
            }
          } else {
            const response = await this.handleJsonRpcMessage(payload)
            if (response === null || response === undefined) {
              res.writeHead(204)
              res.end()
            } else {
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(safeJsonStringify(response))
            }
          }
        } catch (err: any) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id: null,
              error: { code: -32700, message: `Parse error: ${err?.message || err}` },
            })
          )
        }
      })
      return
    }

    // Default 404
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Endpoint not found' }))
  }

  private async handleJsonRpcMessage(message: any): Promise<any> {
    const { id, method, params } = message || {}

    // Notifications (no id)
    if (id === undefined || id === null) {
      if (method === 'notifications/initialized') {
        Logger.info('[MCP] Client sent notifications/initialized')
      }
      return null
    }

    switch (method) {
      case 'initialize': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {
                listChanged: true,
              },
            },
            serverInfo: {
              name: 'guidegram-mcp',
              version: '2.0.0',
            },
          },
        }
      }

      case 'ping': {
        return {
          jsonrpc: '2.0',
          id,
          result: {},
        }
      }

      case 'tools/list': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: this.getAllToolsDefinitions(),
          },
        }
      }

      case 'tools/call': {
        const toolName = params?.name
        const toolArgs = params?.arguments || {}

        try {
          const callResult = await this.dispatchToolCall(toolName, toolArgs)
          const isError = Boolean(
            callResult &&
            typeof callResult === 'object' &&
            (callResult.success === false || Boolean(callResult.error))
          )
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: typeof callResult === 'string' ? callResult : safeJsonStringify(callResult, 2),
                },
              ],
              isError,
            },
          }
        } catch (err: any) {
          Logger.error(`[MCP] Tool call '${toolName}' failed:`, err)
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `Error executing tool '${toolName}': ${err?.message || String(err)}`,
                },
              ],
              isError: true,
            },
          }
        }
      }

      default: {
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        }
      }
    }
  }

  private async dispatchToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      // Account Tools
      case 'telegram_list_accounts':
        return await listAccountsHandler(this.accountManager)

      case 'telegram_switch_active_account':
        return await switchActiveAccountHandler(this.accountManager, args)

      // Messaging Tools
      case 'telegram_get_dialogs':
        return await getDialogsHandler(this.accountManager, args)

      case 'telegram_get_chat_history':
        return await getChatHistoryHandler(this.accountManager, args)

      case 'telegram_send_typing':
        return await sendTypingHandler(this.accountManager, args)

      case 'telegram_send_message':
        return await sendMessageHandler(this.accountManager, args, {
          allowedChatIds: this.config.allowedChatIds,
        })

      case 'telegram_mark_as_read':
        return await markAsReadHandler(this.accountManager, args)

      case 'telegram_send_media':
        return await sendMediaHandler(this.accountManager, args, {
          allowedChatIds: this.config.allowedChatIds,
        })

      case 'telegram_forward_messages':
        return await forwardMessagesHandler(this.accountManager, args, {
          allowedChatIds: this.config.allowedChatIds,
        })

      case 'telegram_send_reaction':
        return await sendReactionHandler(this.accountManager, args)

      case 'telegram_manage_message':
        return await manageMessageHandler(this.accountManager, args, {
          allowedChatIds: this.config.allowedChatIds,
        })

      case 'telegram_create_poll':
        return await createPollHandler(this.accountManager, args, {
          allowedChatIds: this.config.allowedChatIds,
        })

      // Search Tools
      case 'telegram_search_messages':
        return await searchMessagesHandler(this.accountManager, args)

      case 'telegram_search_contacts':
        return await searchContactsHandler(this.accountManager, args)

      case 'telegram_search_dialogs':
        return await searchDialogsHandler(this.accountManager, args)

      // Channel Tools
      case 'telegram_manage_channel':
        return await manageChannelHandler(this.accountManager, args)

      // Universal Dynamic MTProto Tools
      case 'telegram_discover_methods':
        return await discoverMethodsHandler(args)

      case 'telegram_invoke_raw_method':
        return await invokeRawMethodHandler(this.accountManager, args)

      // File Tools
      case 'telegram_resolve_peer':
        return await resolvePeerHandler(this.accountManager, args)

      case 'telegram_list_channel_media':
        return await listChannelMediaHandler(this.accountManager, args)

      case 'telegram_download_file':
        return await downloadFileHandler(this.accountManager, args, {
          defaultDownloadDir: this.config.defaultDownloadDir,
        })

      default:
        throw new Error(`Unrecognized MCP tool: ${name}`)
    }
  }
}
