import { Logger } from '../logger'

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

  public async getBotCommands(holder: RpcClientHolder, scope: any = { _: 'botCommandScopeDefault' }, langCode = ''): Promise<any[]> {
    try {
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

  public async getBotMenuButton(holder: RpcClientHolder, accountId: string, botId: string): Promise<any> {
    try {
      const userId = await this.toInputUser(accountId, botId)
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

  public async getBotInfo(holder: RpcClientHolder, accountId: string, botId?: string, langCode = ''): Promise<any> {
    try {
      const bot = botId ? await this.toInputUser(accountId, botId) : undefined
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
      return false
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
      return null
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

  public async answerWebhookJSONQuery(holder: RpcClientHolder, queryId: bigint, data: any): Promise<boolean> {
    try {
      const dataJson = typeof data === 'string' ? { _: 'dataJSON', data } : { _: 'dataJSON', data: JSON.stringify(data) }
      const res = await holder.client.call({
        _: 'bots.answerWebhookJSONQuery',
        queryId,
        data: dataJson,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] answerWebhookJSONQuery error:', err)
      return false
    }
  }

  public async checkDownloadFileParams(holder: RpcClientHolder, accountId: string, botId: string, fileName: string, url: string): Promise<boolean> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      const res = await holder.client.call({
        _: 'bots.checkDownloadFileParams',
        bot,
        fileName,
        url,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] checkDownloadFileParams error:', err)
      return false
    }
  }

  public async addPreviewMedia(holder: RpcClientHolder, accountId: string, botId: string, media: any, langCode = ''): Promise<any> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      return await holder.client.call({
        _: 'bots.addPreviewMedia',
        bot,
        langCode,
        media,
      })
    } catch (err) {
      Logger.warn('[BotsService] addPreviewMedia error:', err)
      return null
    }
  }

  public async editPreviewMedia(
    holder: RpcClientHolder,
    accountId: string,
    botId: string,
    media: any,
    newMedia: any,
    langCode = ''
  ): Promise<any> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      return await holder.client.call({
        _: 'bots.editPreviewMedia',
        bot,
        langCode,
        media,
        newMedia,
      })
    } catch (err) {
      Logger.warn('[BotsService] editPreviewMedia error:', err)
      return null
    }
  }

  public async deletePreviewMedia(holder: RpcClientHolder, accountId: string, botId: string, media: any, langCode = ''): Promise<boolean> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      const res = await holder.client.call({
        _: 'bots.deletePreviewMedia',
        bot,
        langCode,
        media,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] deletePreviewMedia error:', err)
      return false
    }
  }

  public async getPreviewMedias(holder: RpcClientHolder, accountId: string, botId: string): Promise<any[]> {
    try {
      const bot = await this.toInputUser(accountId, botId)
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

  public async getPreviewInfo(holder: RpcClientHolder, accountId: string, botId: string, langCode = ''): Promise<any> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      return await holder.client.call({
        _: 'bots.getPreviewInfo',
        bot,
        langCode,
      })
    } catch (err) {
      Logger.warn('[BotsService] getPreviewInfo error:', err)
      return null
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

  public async getPopularAppBots(holder: RpcClientHolder, offset = '', limit = 50): Promise<any> {
    try {
      return await holder.client.call({
        _: 'bots.getPopularAppBots',
        offset,
        limit,
      })
    } catch (err) {
      Logger.warn('[BotsService] getPopularAppBots error:', err)
      return null
    }
  }

  public async getBotRecommendations(holder: RpcClientHolder, accountId: string, botId: string): Promise<any[]> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      const res = await holder.client.call({
        _: 'bots.getBotRecommendations',
        bot,
      })
      if (res && Array.isArray(res.users)) return res.users
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

  public async getAdminedBots(holder: RpcClientHolder): Promise<any[]> {
    try {
      const res = await holder.client.call({
        _: 'bots.getAdminedBots',
      })
      if (res && Array.isArray(res.users)) return res.users
      return Array.isArray(res) ? res : []
    } catch (err) {
      Logger.warn('[BotsService] getAdminedBots error:', err)
      return []
    }
  }

  public async createBot(holder: RpcClientHolder, name: string, username: string, viaDeeplink = false, managerId?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'bots.createBot',
        name,
        username,
        viaDeeplink,
        managerId,
      })
    } catch (err) {
      Logger.warn('[BotsService] createBot error:', err)
      return null
    }
  }

  public async exportBotToken(holder: RpcClientHolder, accountId: string, botId: string, revoke = false): Promise<any> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      return await holder.client.call({
        _: 'bots.exportBotToken',
        bot,
        revoke,
      })
    } catch (err) {
      Logger.warn('[BotsService] exportBotToken error:', err)
      return null
    }
  }

  public async checkUsername(holder: RpcClientHolder, username: string): Promise<boolean> {
    try {
      const res = await holder.client.call({
        _: 'bots.checkUsername',
        username,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] checkUsername error:', err)
      return false
    }
  }

  public async addUsername(holder: RpcClientHolder, accountId: string, botId: string, username: string): Promise<boolean> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      const res = await holder.client.call({
        _: 'bots.addUsername',
        bot,
        username,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] addUsername error:', err)
      return false
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

  public async getAccessSettings(holder: RpcClientHolder, accountId: string, botId: string): Promise<any> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      return await holder.client.call({
        _: 'bots.getAccessSettings',
        bot,
      })
    } catch (err) {
      Logger.warn('[BotsService] getAccessSettings error:', err)
      return null
    }
  }

  public async editAccessSettings(
    holder: RpcClientHolder,
    accountId: string,
    botId: string,
    restricted = false,
    addUsers?: string[]
  ): Promise<boolean> {
    try {
      const bot = await this.toInputUser(accountId, botId)
      const inputUsers = addUsers ? await Promise.all(addUsers.map((u) => this.toInputUser(accountId, u))) : undefined
      const res = await holder.client.call({
        _: 'bots.editAccessSettings',
        bot,
        restricted,
        addUsers: inputUsers,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] editAccessSettings error:', err)
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
}
