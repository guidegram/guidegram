import { Logger } from '../logger'
import { Long } from '@mtcute/core'

export interface RpcClientHolder {
  client: {
    call: (query: { _: string; [key: string]: any }) => Promise<any>
    resolvePeer?: (peer: string) => Promise<any>
  }
}

/**
 * Enterprise Bots, Games & WebApps Domain Service for Guidegram
 * Comprehensive implementation of all 40 MTProto methods across bots.*
 * Layer 229+ with typed parameters, InputUser resolution, and error handling.
 */
export class BotsService {
  private resolveInputPeer: (accountId: string, peerId: string) => Promise<any>

  constructor(resolveInputPeer: (accountId: string, peerId: string) => Promise<any>) {
    this.resolveInputPeer = resolveInputPeer
  }

  private async toInputUser(accountId: string, userId: string): Promise<any> {
    if (!userId || userId === 'self') return { _: 'inputUserSelf' }
    try {
      const peer = await this.resolveInputPeer(accountId, userId)
      if (peer._ === 'inputPeerUser') {
        return { _: 'inputUser', userId: peer.userId, accessHash: peer.accessHash }
      }
      if (peer._ === 'inputPeerSelf') {
        return { _: 'inputUserSelf' }
      }
    } catch {
      // fallback
    }
    return { _: 'inputUser', userId: BigInt(userId), accessHash: 0n }
  }

  public async getBotCommands(holder: RpcClientHolder, scopeOrParams?: any, langCodeParam = ''): Promise<any[]> {
    try {
      let scope: any = { _: 'botCommandScopeDefault' }
      let langCode = ''
      if (scopeOrParams && typeof scopeOrParams === 'object' && ('scope' in scopeOrParams || 'langCode' in scopeOrParams)) {
        scope = scopeOrParams.scope || scope
        langCode = scopeOrParams.langCode || ''
      } else if (scopeOrParams) {
        scope = scopeOrParams
        langCode = langCodeParam || ''
      }
      const res = await holder.client.call({
        _: 'bots.getBotCommands',
        scope,
        langCode,
      })
      return Array.isArray(res) ? res : []
    } catch (err) {
      Logger.warn('[BotsService] getBotCommands error:', err)
      return []
    }
  }

  public async setBotCommands(holder: RpcClientHolder, commands: any[], scope: any = { _: 'botCommandScopeDefault' }, langCode = ''): Promise<boolean> {
    try {
      const res = await holder.client.call({
        _: 'bots.setBotCommands',
        scope,
        langCode,
        commands,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] setBotCommands error:', err)
      return false
    }
  }

  public async resetBotCommands(holder: RpcClientHolder, scope: any = { _: 'botCommandScopeDefault' }, langCode = ''): Promise<boolean> {
    try {
      const res = await holder.client.call({
        _: 'bots.resetBotCommands',
        scope,
        langCode,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] resetBotCommands error:', err)
      return false
    }
  }

  public async setBotMenuButton(holder: RpcClientHolder, accountId: string, botId: string, button: any): Promise<boolean> {
    try {
      const userId = await this.toInputUser(accountId, botId)
      const res = await holder.client.call({
        _: 'bots.setBotMenuButton',
        userId,
        button,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] setBotMenuButton error:', err)
      return false
    }
  }

  public async getBotMenuButton(holder: RpcClientHolder, accountId: string, paramsOrBotId: { userId: string | any } | string): Promise<any> {
    try {
      const botId = typeof paramsOrBotId === 'object' && paramsOrBotId !== null ? paramsOrBotId.userId : paramsOrBotId
      const userId = typeof botId === 'string' ? await this.toInputUser(accountId, botId) : botId
      return await holder.client.call({
        _: 'bots.getBotMenuButton',
        userId,
      })
    } catch (err) {
      Logger.warn('[BotsService] getBotMenuButton error:', err)
      return null
    }
  }

  public async setBotInfo(
    holder: RpcClientHolder,
    accountId: string,
    botId?: string,
    langCode = '',
    name?: string,
    about?: string,
    description?: string
  ): Promise<boolean> {
    try {
      const bot = botId ? await this.toInputUser(accountId, botId) : undefined
      const res = await holder.client.call({
        _: 'bots.setBotInfo',
        bot,
        langCode,
        name,
        about,
        description,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] setBotInfo error:', err)
      return false
    }
  }

  public async getBotInfo(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrBotId?: { bot?: string | any; langCode?: string } | string,
    langCodeParam = ''
  ): Promise<any> {
    try {
      let bot: any
      let langCode = ''
      if (typeof paramsOrBotId === 'object' && paramsOrBotId !== null) {
        bot = paramsOrBotId.bot ? (typeof paramsOrBotId.bot === 'string' ? await this.toInputUser(accountId, paramsOrBotId.bot) : paramsOrBotId.bot) : undefined
        langCode = paramsOrBotId.langCode || ''
      } else if (typeof paramsOrBotId === 'string') {
        bot = await this.toInputUser(accountId, paramsOrBotId)
        langCode = langCodeParam || ''
      }
      return await holder.client.call({
        _: 'bots.getBotInfo',
        bot,
        langCode,
      })
    } catch (err) {
      Logger.warn('[BotsService] getBotInfo error:', err)
      return null
    }
  }

  public async setBotBroadcastDefaultAdminRights(holder: RpcClientHolder, adminRights: any): Promise<boolean> {
    try {
      const res = await holder.client.call({
        _: 'bots.setBotBroadcastDefaultAdminRights',
        adminRights,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] setBotBroadcastDefaultAdminRights error:', err)
      return false
    }
  }

  public async setBotGroupDefaultAdminRights(holder: RpcClientHolder, adminRights: any): Promise<boolean> {
    try {
      const res = await holder.client.call({
        _: 'bots.setBotGroupDefaultAdminRights',
        adminRights,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] setBotGroupDefaultAdminRights error:', err)
      return false
    }
  }

  public async canSendMessage(holder: RpcClientHolder, accountId: string, botId: string): Promise<boolean> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      const res = await holder.client.call({
        _: 'bots.canSendMessage',
        bot,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] canSendMessage error:', err)
      throw err
    }
  }

  public async allowSendMessage(holder: RpcClientHolder, accountId: string, botId: string): Promise<any> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      return await holder.client.call({
        _: 'bots.allowSendMessage',
        bot,
      })
    } catch (err) {
      Logger.warn('[BotsService] allowSendMessage error:', err)
      throw err
    }
  }

  public async invokeWebViewCustomMethod(
    holder: RpcClientHolder,
    accountId: string,
    botId: string,
    customMethod: string,
    params: any
  ): Promise<any> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      const dataJson = typeof params === 'string' ? { _: 'dataJSON', data: params } : { _: 'dataJSON', data: JSON.stringify(params) }
      return await holder.client.call({
        _: 'bots.invokeWebViewCustomMethod',
        bot,
        customMethod,
        params: dataJson,
      })
    } catch (err) {
      Logger.warn('[BotsService] invokeWebViewCustomMethod error:', err)
      return null
    }
  }

  public async sendCustomRequest(holder: RpcClientHolder, customMethod: string, params: any): Promise<any> {
    try {
      const dataJson = typeof params === 'string' ? { _: 'dataJSON', data: params } : { _: 'dataJSON', data: JSON.stringify(params) }
      return await holder.client.call({
        _: 'bots.sendCustomRequest',
        customMethod,
        params: dataJson,
      })
    } catch (err) {
      Logger.warn('[BotsService] sendCustomRequest error:', err)
      return null
    }
  }

  public async answerWebhookJSONQuery(holder: RpcClientHolder, queryId: bigint | number | Long | string, data: any): Promise<boolean> {
    try {
      const normalizedQueryId = typeof queryId === 'bigint' ? queryId : (Long.isLong(queryId) ? queryId : Long.fromValue(queryId as any))
      const dataJson = typeof data === 'string' ? { _: 'dataJSON', data } : { _: 'dataJSON', data: JSON.stringify(data || {}) }
      const res = await holder.client.call({
        _: 'bots.answerWebhookJSONQuery',
        queryId: normalizedQueryId as any,
        data: dataJson,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] answerWebhookJSONQuery error:', err)
      throw err
    }
  }

  public async checkDownloadFileParams(holder: RpcClientHolder, accountId: string, botId: string, fileName: string, url: string): Promise<boolean> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      const res = await holder.client.call({
        _: 'bots.checkDownloadFileParams',
        bot,
        fileName: String(fileName || '').trim(),
        url: String(url || '').trim(),
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] checkDownloadFileParams error:', err)
      throw err
    }
  }

  public async addPreviewMedia(holder: RpcClientHolder, accountId: string, botId: string, media: any, langCode = ''): Promise<any> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      return await holder.client.call({
        _: 'bots.addPreviewMedia',
        bot,
        langCode: String(langCode || '').trim(),
        media,
      })
    } catch (err) {
      Logger.warn('[BotsService] addPreviewMedia error:', err)
      throw err
    }
  }

  public async getPreviewMedias(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrBotId: { botId: string | any } | string
  ): Promise<any[]> {
    try {
      const botId = typeof paramsOrBotId === 'object' && paramsOrBotId !== null ? paramsOrBotId.botId : paramsOrBotId
      const bot = typeof botId === 'string' ? await this.toInputUser(accountId, botId) : botId
      const res = await holder.client.call({
        _: 'bots.getPreviewMedias',
        bot,
      })
      return Array.isArray(res) ? res : []
    } catch (err) {
      Logger.warn('[BotsService] getPreviewMedias error:', err)
      return []
    }
  }

  public async getPreviewInfo(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrBotId: { botId: string | any; langCode?: string } | string,
    langCodeParam?: string
  ): Promise<any> {
    try {
      let botId: any
      let langCode = ''
      if (typeof paramsOrBotId === 'object' && paramsOrBotId !== null) {
        botId = paramsOrBotId.botId
        langCode = paramsOrBotId.langCode || ''
      } else {
        botId = paramsOrBotId
        langCode = langCodeParam || ''
      }
      const bot = typeof botId === 'string' ? await this.toInputUser(accountId, botId) : botId
      return await holder.client.call({
        _: 'bots.getPreviewInfo',
        bot,
        langCode,
      })
    } catch (err) {
      Logger.warn('[BotsService] getPreviewInfo error:', err)
      throw err
    }
  }

  public async reorderPreviewMedias(holder: RpcClientHolder, accountId: string, botId: string, order: any[], langCode = ''): Promise<boolean> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      const res = await holder.client.call({
        _: 'bots.reorderPreviewMedias',
        bot,
        langCode,
        order,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] reorderPreviewMedias error:', err)
      return false
    }
  }

  public async getPopularAppBots(
    holder: RpcClientHolder,
    paramsOrOffset?: { offset?: string; limit?: number } | string,
    limitParam?: number
  ): Promise<any> {
    try {
      let offset = ''
      let limit = 50
      if (typeof paramsOrOffset === 'object' && paramsOrOffset !== null) {
        offset = paramsOrOffset.offset || ''
        limit = typeof paramsOrOffset.limit === 'number' ? paramsOrOffset.limit : 50
      } else if (typeof paramsOrOffset === 'string') {
        offset = paramsOrOffset
        limit = typeof limitParam === 'number' ? limitParam : 50
      }
      return await holder.client.call({
        _: 'bots.getPopularAppBots',
        offset,
        limit,
      })
    } catch (err) {
      Logger.warn('[BotsService] getPopularAppBots error:', err)
      throw err
    }
  }

  public async getBotRecommendations(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrBotId: { botId: string | any } | string
  ): Promise<any[]> {
    try {
      const botId = typeof paramsOrBotId === 'object' && paramsOrBotId !== null ? paramsOrBotId.botId : paramsOrBotId
      const bot = typeof botId === 'string' ? await this.toInputUser(accountId, botId) : botId
      const res = await holder.client.call({
        _: 'bots.getBotRecommendations',
        bot,
      })
      if (res && Array.isArray((res as any).users)) return (res as any).users
      return Array.isArray(res) ? res : []
    } catch (err) {
      Logger.warn('[BotsService] getBotRecommendations error:', err)
      return []
    }
  }

  public async updateStarRefProgram(
    holder: RpcClientHolder,
    accountId: string,
    botId: string,
    commissionPermille: number,
    durationMonths?: number
  ): Promise<any> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      return await holder.client.call({
        _: 'bots.updateStarRefProgram',
        bot,
        commissionPermille,
        durationMonths,
      })
    } catch (err) {
      Logger.warn('[BotsService] updateStarRefProgram error:', err)
      return null
    }
  }

  public async toggleUserEmojiStatusPermission(holder: RpcClientHolder, accountId: string, botId: string, enabled: boolean): Promise<boolean> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      const res = await holder.client.call({
        _: 'bots.toggleUserEmojiStatusPermission',
        bot,
        enabled,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] toggleUserEmojiStatusPermission error:', err)
      return false
    }
  }

  public async updateUserEmojiStatus(holder: RpcClientHolder, accountId: string, targetUserId: string, emojiStatus: any): Promise<boolean> {
    try {
      const userId = await this.toInputUser(accountId, targetUserId)
      const res = await holder.client.call({
        _: 'bots.updateUserEmojiStatus',
        userId,
        emojiStatus,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] updateUserEmojiStatus error:', err)
      return false
    }
  }

  public async checkUsername(holder: RpcClientHolder, username: string, additional?: boolean): Promise<boolean> {
    try {
      const res = await holder.client.call({
        _: 'bots.checkUsername',
        username: String(username || '').replace(/^@/, '').trim(),
        additional: Boolean(additional),
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] checkUsername error:', err)
      throw err
    }
  }

  public async addUsername(holder: RpcClientHolder, accountId: string, botId: string, username: string): Promise<boolean> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      const res = await holder.client.call({
        _: 'bots.addUsername',
        bot,
        username: String(username || '').replace(/^@/, '').trim(),
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] addUsername error:', err)
      throw err
    }
  }

  public async removeUsername(holder: RpcClientHolder, accountId: string, botId: string, username: string): Promise<boolean> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      const res = await holder.client.call({
        _: 'bots.removeUsername',
        bot,
        username,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] removeUsername error:', err)
      return false
    }
  }

  public async toggleUsername(holder: RpcClientHolder, accountId: string, botId: string, username: string, active: boolean): Promise<boolean> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      const res = await holder.client.call({
        _: 'bots.toggleUsername',
        bot,
        username,
        active,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] toggleUsername error:', err)
      return false
    }
  }

  public async reorderUsernames(holder: RpcClientHolder, accountId: string, botId: string, order: string[]): Promise<boolean> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      const res = await holder.client.call({
        _: 'bots.reorderUsernames',
        bot,
        order,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] reorderUsernames error:', err)
      return false
    }
  }

  public async setCustomVerification(
    holder: RpcClientHolder,
    accountId: string,
    botId: string,
    peerId: string,
    customDescription?: string,
    enabled = true
  ): Promise<boolean> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      const peer = await this.resolveInputPeer(accountId, peerId)
      const res = await holder.client.call({
        _: 'bots.setCustomVerification',
        bot,
        peer,
        customDescription,
        enabled,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] setCustomVerification error:', err)
      return false
    }
  }

  public async getRequestedWebViewButton(holder: RpcClientHolder, accountId: string, botId: string, webappReqId: string): Promise<any> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      return await holder.client.call({
        _: 'bots.getRequestedWebViewButton',
        bot,
        webappReqId,
      })
    } catch (err) {
      Logger.warn('[BotsService] getRequestedWebViewButton error:', err)
      return null
    }
  }

  public async requestWebViewButton(holder: RpcClientHolder, accountId: string, botId: string, button: any): Promise<any> {
    try {
      const userId = await this.toInputUser(accountId, botId)
      return await holder.client.call({
        _: 'bots.requestWebViewButton',
        userId,
        button,
      })
    } catch (err) {
      Logger.warn('[BotsService] requestWebViewButton error:', err)
      return null
    }
  }

  public async setJoinChatResults(holder: RpcClientHolder, queryId: bigint, result: any): Promise<boolean> {
    try {
      const res = await holder.client.call({
        _: 'bots.setJoinChatResults',
        queryId,
        result,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] setJoinChatResults error:', err)
      return false
    }
  }

  public async createBot(
    holder: RpcClientHolder,
    accountId: string,
    params: {
      viaDeeplink?: boolean
      name: string
      username: string
      managerId?: string | any
    }
  ): Promise<any> {
    try {
      const managerUser = params.managerId
        ? (typeof params.managerId === 'string' ? await this.toInputUser(accountId, params.managerId) : params.managerId)
        : { _: 'inputUserSelf' }

      return await holder.client.call({
        _: 'bots.createBot',
        viaDeeplink: params.viaDeeplink ? true : undefined,
        name: params.name,
        username: params.username.replace(/^@/, ''),
        managerId: managerUser,
      })
    } catch (err) {
      Logger.warn('[BotsService] createBot error:', err)
      throw err
    }
  }

  public async deletePreviewMedia(
    holder: RpcClientHolder,
    accountId: string,
    params: {
      botId: string | any
      langCode?: string
      media: any[]
    }
  ): Promise<boolean> {
    try {
      const bot = typeof params.botId === 'string' ? await this.toInputUser(accountId, params.botId) : params.botId
      const mediaList = Array.isArray(params.media) ? params.media : [params.media]
      const res = await holder.client.call({
        _: 'bots.deletePreviewMedia',
        bot,
        langCode: params.langCode || '',
        media: mediaList,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] deletePreviewMedia error:', err)
      throw err
    }
  }

  public async editAccessSettings(
    holder: RpcClientHolder,
    accountId: string,
    params: {
      botId: string | any
      restricted?: boolean
      addUsers?: (string | any)[]
    }
  ): Promise<boolean> {
    try {
      const bot = typeof params.botId === 'string' ? await this.toInputUser(accountId, params.botId) : params.botId
      let resolvedUsers: any[] | undefined
      if (params.addUsers && Array.isArray(params.addUsers)) {
        resolvedUsers = await Promise.all(
          params.addUsers.map(async (u) => (typeof u === 'string' ? await this.toInputUser(accountId, u) : u))
        )
      }
      const res = await holder.client.call({
        _: 'bots.editAccessSettings',
        bot,
        restricted: params.restricted ? true : undefined,
        addUsers: resolvedUsers,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] editAccessSettings error:', err)
      throw err
    }
  }

  public async editPreviewMedia(
    holder: RpcClientHolder,
    accountId: string,
    params: {
      botId: string | any
      langCode?: string
      media: any
      newMedia: any
    }
  ): Promise<any> {
    try {
      const bot = typeof params.botId === 'string' ? await this.toInputUser(accountId, params.botId) : params.botId
      return await holder.client.call({
        _: 'bots.editPreviewMedia',
        bot,
        langCode: params.langCode || '',
        media: params.media,
        newMedia: params.newMedia,
      })
    } catch (err) {
      Logger.warn('[BotsService] editPreviewMedia error:', err)
      throw err
    }
  }

  public async exportBotToken(
    holder: RpcClientHolder,
    accountId: string,
    params: {
      botId: string | any
      revoke?: boolean
    }
  ): Promise<any> {
    try {
      const bot = typeof params.botId === 'string' ? await this.toInputUser(accountId, params.botId) : params.botId
      return await holder.client.call({
        _: 'bots.exportBotToken',
        bot,
        revoke: Boolean(params.revoke),
      })
    } catch (err) {
      Logger.warn('[BotsService] exportBotToken error:', err)
      throw err
    }
  }

  public async getAccessSettings(
    holder: RpcClientHolder,
    accountId: string,
    params: {
      botId: string | any
    }
  ): Promise<any> {
    try {
      const bot = typeof params.botId === 'string' ? await this.toInputUser(accountId, params.botId) : params.botId
      return await holder.client.call({
        _: 'bots.getAccessSettings',
        bot,
      })
    } catch (err) {
      Logger.warn('[BotsService] getAccessSettings error:', err)
      throw err
    }
  }

  public async getAdminedBots(
    holder: RpcClientHolder
  ): Promise<any[]> {
    try {
      const res = await holder.client.call({
        _: 'bots.getAdminedBots',
      })
      if (res && Array.isArray((res as any).users)) return (res as any).users
      return Array.isArray(res) ? res : []
    } catch (err) {
      Logger.warn('[BotsService] getAdminedBots error:', err)
      return []
    }
  }
}
