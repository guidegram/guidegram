import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import type { AccountManager } from '../../telegram/accountManager'
import type { McpPeerDetails, McpSharedMediaSummary, McpDownloadResult } from '../types'
import { getActiveAccountId } from './accountTools.js'
import { Logger } from '../../telegram/logger'

export interface FileToolsConfig {
  defaultDownloadDir?: string
}

function resolveAccount(accountManager: AccountManager, accountId?: string): string {
  const targetId = accountId || getActiveAccountId(accountManager)
  if (!targetId) {
    throw new Error('No Telegram account connected or selected. Use telegram_list_accounts to view available accounts.')
  }
  return targetId
}

export async function resolvePeerHandler(
  accountManager: AccountManager,
  args: {
    accountId?: string
    target: string
  }
): Promise<{ peer: McpPeerDetails; accountId: string }> {
  const targetAccountId = resolveAccount(accountManager, args.accountId)
  const cleanTarget = args.target.trim()

  try {
    const rawPeer: any = await accountManager.resolvePeer(targetAccountId, cleanTarget)
    if (!rawPeer) {
      throw new Error(`Peer not found for target: '${cleanTarget}'`)
    }

    let peerType: 'user' | 'group' | 'channel' | 'unknown' = 'unknown'
    if (rawPeer.isChannel || rawPeer.type === 'channel') peerType = 'channel'
    else if (rawPeer.isGroup || rawPeer.type === 'group') peerType = 'group'
    else if (rawPeer.isUser || rawPeer.type === 'user') peerType = 'user'

    const details: McpPeerDetails = {
      id: String(rawPeer.id || rawPeer.chatId || ''),
      title: rawPeer.title || rawPeer.firstName || cleanTarget,
      type: peerType,
      username: rawPeer.username,
      accessHash: rawPeer.accessHash ? String(rawPeer.accessHash) : undefined,
      membersCount: rawPeer.membersCount,
      about: rawPeer.about,
    }

    return {
      peer: details,
      accountId: targetAccountId,
    }
  } catch (err: any) {
    throw new Error(`Failed to resolve peer '${cleanTarget}': ${err?.message || err}`)
  }
}

export async function listChannelMediaHandler(
  accountManager: AccountManager,
  args: {
    accountId?: string
    chatId: string
    filterType?: 'document' | 'photo' | 'video' | 'audio' | 'voice' | 'round_video' | 'all'
    limit?: number
    offsetId?: number
    extensionFilter?: string[]
    minSizeBytes?: number
    maxSizeBytes?: number
  }
): Promise<{ items: McpSharedMediaSummary[]; totalCount: number; nextOffsetId: number; hasMore: boolean }> {
  const targetAccountId = resolveAccount(accountManager, args.accountId)
  const limit = Math.min(Math.max(args.limit || 30, 1), 100)
  const reqFilter = args.filterType && args.filterType !== 'all' ? args.filterType : 'document'

  try {
    const result = await accountManager.getSharedMedia(
      targetAccountId,
      args.chatId,
      reqFilter as any,
      limit,
      args.offsetId
    )

    let items: McpSharedMediaSummary[] = (result?.items || []).map((m: any) => ({
      messageId: m.messageId,
      mediaType: m.mediaType,
      mediaFileName: m.mediaFileName,
      mediaFileSize: m.mediaFileSize,
      date: m.date,
      senderName: m.senderName,
      caption: m.caption,
    }))

    // Apply extension filtering if provided (e.g. ['pdf', 'zip'])
    if (args.extensionFilter && args.extensionFilter.length > 0) {
      const normalizedExtensions = args.extensionFilter.map((ext) =>
        ext.toLowerCase().startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`
      )
      items = items.filter((item) => {
        if (!item.mediaFileName) return false
        const ext = path.extname(item.mediaFileName).toLowerCase()
        return normalizedExtensions.includes(ext)
      })
    }

    // Apply file size boundaries
    if (typeof args.minSizeBytes === 'number' && args.minSizeBytes > 0) {
      items = items.filter((item) => (item.mediaFileSize || 0) >= args.minSizeBytes!)
    }
    if (typeof args.maxSizeBytes === 'number' && args.maxSizeBytes > 0) {
      items = items.filter((item) => (item.mediaFileSize || 0) <= args.maxSizeBytes!)
    }

    return {
      items,
      totalCount: result?.totalCount || items.length,
      nextOffsetId: result?.nextOffsetId || 0,
      hasMore: !!result?.hasMore,
    }
  } catch (err: any) {
    throw new Error(`Failed to list shared media for chat ${args.chatId}: ${err?.message || err}`)
  }
}

export async function downloadFileHandler(
  accountManager: AccountManager,
  args: {
    accountId?: string
    chatId: string
    messageId: number
    targetDirectory?: string
    targetFileName?: string
  },
  config?: FileToolsConfig
): Promise<McpDownloadResult> {
  const targetAccountId = resolveAccount(accountManager, args.accountId)

  try {
    // Determine target directory
    let destDir = args.targetDirectory?.trim() || config?.defaultDownloadDir?.trim()
    if (!destDir) {
      try {
        destDir = app?.getPath ? path.join(app.getPath('downloads'), 'Guidegram') : path.resolve(process.cwd(), 'downloads')
      } catch {
        destDir = path.resolve(process.cwd(), 'downloads')
      }
    }

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }

    Logger.info(`[MCP] Starting turbo download for account=${targetAccountId}, chat=${args.chatId}, msg=${args.messageId}`)

    // Download media using accountManager engine
    const mediaUrl = await accountManager.downloadMedia(targetAccountId, args.chatId, args.messageId, false)
    if (!mediaUrl) {
      throw new Error(`Failed to download media for message ${args.messageId}. Message may not contain media or permission is denied.`)
    }

    // Resolve local path from cache or guidegram-media protocol
    let sourcePath = ''
    if (mediaUrl.startsWith('guidegram-media://')) {
      const candidate = decodeURIComponent(mediaUrl.replace(/^guidegram-media:\/\//, ''))
      if (fs.existsSync(candidate) && fs.statSync(candidate).size > 0) {
        sourcePath = candidate
      }
    }

    if (!sourcePath) {
      // Search in accountManager's media directory
      const mediaDir = (accountManager as any).mediaDir
      if (mediaDir && fs.existsSync(mediaDir)) {
        const cacheKey = `${targetAccountId}_${args.chatId}_${args.messageId}`
        const exts = ['.mp4', '.jpg', '.png', '.webp', '.ogg', '.pdf', '.zip', '.bin', '']
        for (const ext of exts) {
          const p1 = path.join(mediaDir, `media_${cacheKey}${ext}`)
          const p2 = path.join(mediaDir, `${cacheKey}${ext}`)
          if (fs.existsSync(p1) && fs.statSync(p1).size > 0) {
            sourcePath = p1
            break
          }
          if (fs.existsSync(p2) && fs.statSync(p2).size > 0) {
            sourcePath = p2
            break
          }
        }
      }
    }

    if (!sourcePath || !fs.existsSync(sourcePath)) {
      throw new Error(`Cached media file not found on disk after download. Result: ${mediaUrl}`)
    }

    // Determine target file name
    const finalFileName = args.targetFileName?.trim() || path.basename(sourcePath)
    const destinationPath = path.join(destDir, finalFileName)

    // Copy to final location
    await fs.promises.copyFile(sourcePath, destinationPath)
    const fileStat = await fs.promises.stat(destinationPath)

    Logger.info(`[MCP] File successfully saved to: ${destinationPath} (${fileStat.size} bytes)`)

    return {
      success: true,
      messageId: args.messageId,
      chatId: args.chatId,
      filePath: destinationPath,
      fileSize: fileStat.size,
      fileName: finalFileName,
    }
  } catch (err: any) {
    Logger.error(`[MCP] downloadFileHandler error:`, err)
    return {
      success: false,
      messageId: args.messageId,
      chatId: args.chatId,
      filePath: '',
      fileSize: 0,
      fileName: args.targetFileName || '',
      error: err?.message || String(err),
    }
  }
}

export const fileToolsDefinitions = [
  {
    name: 'telegram_resolve_peer',
    description: 'Resolves a Telegram username (e.g. "@durov" or "channel_username"), invite link, or numeric ID into a full peer object with chat ID, type (channel/group/user), and title.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Optional Telegram account ID. If omitted, uses active account.',
        },
        target: {
          type: 'string',
          description: 'The username (e.g. "@channelname" or "channelname") or numeric peer ID to resolve.',
        },
      },
      required: ['target'],
    },
  },
  {
    name: 'telegram_list_channel_media',
    description: 'Lists shared documents and media files in a Telegram channel, group, or chat with filtering by media type, file extension (e.g. pdf, zip, mp4), and file size.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Optional Telegram account ID.',
        },
        chatId: {
          type: 'string',
          description: 'Target channel or group chat ID (use telegram_resolve_peer if you only have a @username).',
        },
        filterType: {
          type: 'string',
          enum: ['document', 'photo', 'video', 'audio', 'voice', 'round_video', 'all'],
          description: 'Filter category: "document" (PDFs, ZIPs, files), "video", "photo", "audio", or "all".',
        },
        limit: {
          type: 'number',
          description: 'Maximum items to retrieve (default: 30, max: 100).',
        },
        offsetId: {
          type: 'number',
          description: 'Message ID to paginate from.',
        },
        extensionFilter: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of file extensions to filter by, e.g. ["pdf", "zip", "mp4"].',
        },
        minSizeBytes: {
          type: 'number',
          description: 'Optional minimum file size in bytes.',
        },
        maxSizeBytes: {
          type: 'number',
          description: 'Optional maximum file size in bytes.',
        },
      },
      required: ['chatId'],
    },
  },
  {
    name: 'telegram_download_file',
    description: 'Downloads a file or media from a specific message using Guidegrams high-speed 24-worker parallel turbo engine and saves it to a designated local folder.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Optional Telegram account ID.',
        },
        chatId: {
          type: 'string',
          description: 'The chat/channel ID where the file message is located.',
        },
        messageId: {
          type: 'number',
          description: 'The ID of the message containing the file or media.',
        },
        targetDirectory: {
          type: 'string',
          description: 'Optional absolute destination directory path (e.g. "D:/Downloads/MyChannel"). If omitted, uses Guidegram default downloads path.',
        },
        targetFileName: {
          type: 'string',
          description: 'Optional custom file name for the downloaded file. Defaults to original file name.',
        },
      },
      required: ['chatId', 'messageId'],
    },
  },
]
