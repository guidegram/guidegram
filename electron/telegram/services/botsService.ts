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

  public async setBotCommands(
    holder: RpcClientHolder,
    commandsOrParams: { commands: any[]; scope?: any; langCode?: string } | any[],
    scopeParam: any = { _: 'botCommandScopeDefault' },
    langCodeParam = ''
  ): Promise<boolean> {
    try {
      let commands: any[] = []
      let scope: any = { _: 'botCommandScopeDefault' }
      let langCode = ''

      if (commandsOrParams && typeof commandsOrParams === 'object' && !Array.isArray(commandsOrParams)) {
        commands = Array.isArray(commandsOrParams.commands) ? commandsOrParams.commands : []
        scope = commandsOrParams.scope || scope
        langCode = commandsOrParams.langCode || ''
      } else if (Array.isArray(commandsOrParams)) {
        commands = commandsOrParams
        scope = scopeParam || scope
        langCode = langCodeParam || ''
      }

      const formattedCommands = commands.map((c) => ({
        _: 'botCommand',
        command: typeof c === 'string' ? c.replace(/^\//, '') : (c.command || '').replace(/^\//, ''),
        description: typeof c === 'string' ? c : (c.description || ''),
      }))

      const res = await holder.client.call({
        _: 'bots.setBotCommands',
        scope,
        langCode,
        commands: formattedCommands,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] setBotCommands error:', err)
      throw err
    }
  }

  public async resetBotCommands(holder: RpcClientHolder, scopeOrParams?: any, langCodeParam = ''): Promise<boolean> {
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

  public async setBotMenuButton(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrBotId: { userId?: string | any; botId?: string | any; button?: any } | string,
    buttonParam?: any
  ): Promise<boolean> {
    try {
      let botId: any
      let button: any

      if (typeof paramsOrBotId === 'object' && paramsOrBotId !== null) {
        botId = paramsOrBotId.userId || paramsOrBotId.botId
        button = paramsOrBotId.button || { _: 'botMenuButtonDefault' }
      } else {
        botId = paramsOrBotId
        button = buttonParam || { _: 'botMenuButtonDefault' }
      }

      const userId = botId ? (typeof botId === 'string' ? await this.toInputUser(accountId, botId) : botId) : { _: 'inputUserSelf' }
      const res = await holder.client.call({
        _: 'bots.setBotMenuButton',
        userId,
        button,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] setBotMenuButton error:', err)
      throw err
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
    paramsOrBotId?: { bot?: string | any; botId?: string | any; langCode?: string; name?: string; about?: string; description?: string } | string,
    langCodeParam = '',
    nameParam?: string,
    aboutParam?: string,
    descriptionParam?: string
  ): Promise<boolean> {
    try {
      let bot: any
      let langCode = ''
      let name: string | undefined
      let about: string | undefined
      let description: string | undefined

      if (typeof paramsOrBotId === 'object' && paramsOrBotId !== null) {
        const rawBot = paramsOrBotId.bot || paramsOrBotId.botId
        bot = rawBot ? (typeof rawBot === 'string' ? await this.toInputUser(accountId, rawBot) : rawBot) : undefined
        langCode = paramsOrBotId.langCode || ''
        name = paramsOrBotId.name
        about = paramsOrBotId.about
        description = paramsOrBotId.description
      } else if (typeof paramsOrBotId === 'string') {
        bot = await this.toInputUser(accountId, paramsOrBotId)
        langCode = langCodeParam || ''
        name = nameParam
        about = aboutParam
        description = descriptionParam
      }

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
      throw err
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

  public async setBotBroadcastDefaultAdminRights(
    holder: RpcClientHolder,
    paramsOrRights: { adminRights?: any } | any
  ): Promise<boolean> {
    try {
      const adminRights = (typeof paramsOrRights === 'object' && paramsOrRights !== null && 'adminRights' in paramsOrRights)
        ? paramsOrRights.adminRights
        : paramsOrRights

      const rightsObj = adminRights?._ ? adminRights : {
        _: 'chatAdminRights',
        changeInfo: Boolean(adminRights?.changeInfo),
        postMessages: Boolean(adminRights?.postMessages),
        editMessages: Boolean(adminRights?.editMessages),
        deleteMessages: Boolean(adminRights?.deleteMessages),
        banUsers: Boolean(adminRights?.banUsers),
        inviteUsers: Boolean(adminRights?.inviteUsers),
        pinMessages: Boolean(adminRights?.pinMessages),
        addAdmins: Boolean(adminRights?.addAdmins),
        anonymous: Boolean(adminRights?.anonymous),
        manageCall: Boolean(adminRights?.manageCall),
        other: Boolean(adminRights?.other),
        manageTopics: Boolean(adminRights?.manageTopics),
        postStories: Boolean(adminRights?.postStories),
        editStories: Boolean(adminRights?.editStories),
        deleteStories: Boolean(adminRights?.deleteStories),
      }

      const res = await holder.client.call({
        _: 'bots.setBotBroadcastDefaultAdminRights',
        adminRights: rightsObj,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] setBotBroadcastDefaultAdminRights error:', err)
      throw err
    }
  }

  public async setBotGroupDefaultAdminRights(
    holder: RpcClientHolder,
    paramsOrRights: { adminRights?: any } | any
  ): Promise<boolean> {
    try {
      const adminRights = (typeof paramsOrRights === 'object' && paramsOrRights !== null && 'adminRights' in paramsOrRights)
        ? paramsOrRights.adminRights
        : paramsOrRights

      const rightsObj = adminRights?._ ? adminRights : {
        _: 'chatAdminRights',
        changeInfo: Boolean(adminRights?.changeInfo),
        postMessages: Boolean(adminRights?.postMessages),
        editMessages: Boolean(adminRights?.editMessages),
        deleteMessages: Boolean(adminRights?.deleteMessages),
        banUsers: Boolean(adminRights?.banUsers),
        inviteUsers: Boolean(adminRights?.inviteUsers),
        pinMessages: Boolean(adminRights?.pinMessages),
        addAdmins: Boolean(adminRights?.addAdmins),
        anonymous: Boolean(adminRights?.anonymous),
        manageCall: Boolean(adminRights?.manageCall),
        other: Boolean(adminRights?.other),
        manageTopics: Boolean(adminRights?.manageTopics),
        postStories: Boolean(adminRights?.postStories),
        editStories: Boolean(adminRights?.editStories),
        deleteStories: Boolean(adminRights?.deleteStories),
      }

      const res = await holder.client.call({
        _: 'bots.setBotGroupDefaultAdminRights',
        adminRights: rightsObj,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] setBotGroupDefaultAdminRights error:', err)
      throw err
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
    paramsOrBotId: { botId: string | any; customMethod: string; params: any } | string,
    customMethodParam?: string,
    paramsParam?: any
  ): Promise<any> {
    try {
      let botId: any
      let customMethod = ''
      let methodParams: any
      if (typeof paramsOrBotId === 'object' && paramsOrBotId !== null) {
        botId = paramsOrBotId.botId
        customMethod = paramsOrBotId.customMethod
        methodParams = paramsOrBotId.params
      } else {
        botId = paramsOrBotId
        customMethod = customMethodParam || ''
        methodParams = paramsParam
      }
      const bot = typeof botId === 'string' ? await this.toInputUser(accountId, botId) : botId
      const dataJson = typeof methodParams === 'string'
        ? { _: 'dataJSON', data: methodParams }
        : { _: 'dataJSON', data: JSON.stringify(methodParams || {}) }
      return await holder.client.call({
        _: 'bots.invokeWebViewCustomMethod',
        bot,
        customMethod,
        params: dataJson,
      })
    } catch (err) {
      Logger.warn('[BotsService] invokeWebViewCustomMethod error:', err)
      throw err
    }
  }

  public async sendCustomRequest(
    holder: RpcClientHolder,
    paramsOrCustomMethod: { customMethod: string; params?: any } | string,
    paramsArg?: any
  ): Promise<any> {
    try {
      let customMethod = ''
      let rawParams: any
      if (typeof paramsOrCustomMethod === 'object' && paramsOrCustomMethod !== null) {
        customMethod = paramsOrCustomMethod.customMethod
        rawParams = paramsOrCustomMethod.params
      } else {
        customMethod = paramsOrCustomMethod
        rawParams = paramsArg
      }
      const dataJson = typeof rawParams === 'string'
        ? { _: 'dataJSON', data: rawParams }
        : { _: 'dataJSON', data: JSON.stringify(rawParams ?? {}) }

      return await holder.client.call({
        _: 'bots.sendCustomRequest',
        customMethod,
        params: dataJson,
      })
    } catch (err) {
      Logger.warn('[BotsService] sendCustomRequest error:', err)
      throw err
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

  public async reorderPreviewMedias(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrBotId: { botId: string | any; order: any[]; langCode?: string } | string,
    orderParam?: any[],
    langCodeParam = ''
  ): Promise<boolean> {
    try {
      let botId: any
      let order: any[] = []
      let langCode = ''
      if (typeof paramsOrBotId === 'object' && paramsOrBotId !== null) {
        botId = paramsOrBotId.botId
        order = Array.isArray(paramsOrBotId.order) ? paramsOrBotId.order : []
        langCode = paramsOrBotId.langCode || ''
      } else {
        botId = paramsOrBotId
        order = Array.isArray(orderParam) ? orderParam : []
        langCode = langCodeParam || ''
      }
      const bot = typeof botId === 'string' ? await this.toInputUser(accountId, botId) : botId
      const res = await holder.client.call({
        _: 'bots.reorderPreviewMedias',
        bot,
        langCode,
        order,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] reorderPreviewMedias error:', err)
      throw err
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
    paramsOrBotId: { bot?: string | any; botId?: string | any; commissionPermille: number; durationMonths?: number } | string,
    commissionPermilleArg?: number,
    durationMonthsArg?: number
  ): Promise<any> {
    try {
      let botId: any
      let commissionPermille = 0
      let durationMonths: number | undefined
      if (typeof paramsOrBotId === 'object' && paramsOrBotId !== null) {
        botId = paramsOrBotId.bot || paramsOrBotId.botId
        commissionPermille = paramsOrBotId.commissionPermille
        durationMonths = paramsOrBotId.durationMonths
      } else {
        botId = paramsOrBotId
        commissionPermille = commissionPermilleArg ?? 0
        durationMonths = durationMonthsArg
      }
      const bot = typeof botId === 'string' ? await this.toInputUser(accountId, botId) : botId
      return await holder.client.call({
        _: 'bots.updateStarRefProgram',
        bot,
        commissionPermille,
        durationMonths,
      })
    } catch (err) {
      Logger.warn('[BotsService] updateStarRefProgram error:', err)
      throw err
    }
  }

  public async toggleUserEmojiStatusPermission(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrBotId: { bot?: string | any; botId?: string | any; enabled: boolean } | string,
    enabledArg = true
  ): Promise<boolean> {
    try {
      let botId: any
      let enabled = true
      if (typeof paramsOrBotId === 'object' && paramsOrBotId !== null) {
        botId = paramsOrBotId.bot || paramsOrBotId.botId
        enabled = paramsOrBotId.enabled ?? true
      } else {
        botId = paramsOrBotId
        enabled = enabledArg
      }
      const bot = typeof botId === 'string' ? await this.toInputUser(accountId, botId) : botId
      const res = await holder.client.call({
        _: 'bots.toggleUserEmojiStatusPermission',
        bot,
        enabled,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] toggleUserEmojiStatusPermission error:', err)
      throw err
    }
  }

  public async updateUserEmojiStatus(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrUserId: { userId?: string | any; targetUserId?: string | any; emojiStatus: any } | string,
    emojiStatusArg?: any
  ): Promise<boolean> {
    try {
      let rawUserId: any
      let rawEmojiStatus: any
      if (typeof paramsOrUserId === 'object' && paramsOrUserId !== null) {
        rawUserId = paramsOrUserId.userId || paramsOrUserId.targetUserId
        rawEmojiStatus = paramsOrUserId.emojiStatus
      } else {
        rawUserId = paramsOrUserId
        rawEmojiStatus = emojiStatusArg
      }
      const userId = typeof rawUserId === 'string' ? await this.toInputUser(accountId, rawUserId) : rawUserId

      let emojiStatus: any = rawEmojiStatus
      if (!rawEmojiStatus) {
        emojiStatus = { _: 'emojiStatusEmpty' }
      } else if (typeof rawEmojiStatus === 'string' || typeof rawEmojiStatus === 'number' || typeof rawEmojiStatus === 'bigint') {
        const docId = typeof rawEmojiStatus === 'string'
          ? Long.fromString(rawEmojiStatus)
          : typeof rawEmojiStatus === 'bigint'
          ? Long.fromString(rawEmojiStatus.toString())
          : Long.fromNumber(rawEmojiStatus)
        emojiStatus = {
          _: 'emojiStatus',
          documentId: docId,
        }
      } else if (typeof rawEmojiStatus === 'object' && !rawEmojiStatus._) {
        if (rawEmojiStatus.documentId) {
          const docId = typeof rawEmojiStatus.documentId === 'string'
            ? Long.fromString(rawEmojiStatus.documentId)
            : typeof rawEmojiStatus.documentId === 'bigint'
            ? Long.fromString(rawEmojiStatus.documentId.toString())
            : typeof rawEmojiStatus.documentId === 'number'
            ? Long.fromNumber(rawEmojiStatus.documentId)
            : rawEmojiStatus.documentId
          emojiStatus = {
            _: 'emojiStatus',
            documentId: docId,
            until: rawEmojiStatus.until,
          }
        } else {
          emojiStatus = { _: 'emojiStatusEmpty' }
        }
      }

      const res = await holder.client.call({
        _: 'bots.updateUserEmojiStatus',
        userId,
        emojiStatus,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] updateUserEmojiStatus error:', err)
      throw err
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

  public async removeUsername(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrBotId: { botId: string | any; username: string } | string,
    usernameParam?: string
  ): Promise<boolean> {
    try {
      let botId: any
      let username = ''
      if (typeof paramsOrBotId === 'object' && paramsOrBotId !== null) {
        botId = paramsOrBotId.botId
        username = paramsOrBotId.username
      } else {
        botId = paramsOrBotId
        username = usernameParam || ''
      }
      const bot = typeof botId === 'string' ? await this.toInputUser(accountId, botId) : botId
      const res = await holder.client.call({
        _: 'bots.removeUsername',
        bot,
        username,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] removeUsername error:', err)
      throw err
    }
  }

  public async toggleUsername(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrBotId: { bot?: string | any; botId?: string | any; username: string; active: boolean } | string,
    usernameArg?: string,
    activeArg = true
  ): Promise<boolean> {
    try {
      let botId: any
      let username = ''
      let active = true
      if (typeof paramsOrBotId === 'object' && paramsOrBotId !== null) {
        botId = paramsOrBotId.bot || paramsOrBotId.botId
        username = paramsOrBotId.username
        active = paramsOrBotId.active ?? true
      } else {
        botId = paramsOrBotId
        username = usernameArg || ''
        active = activeArg
      }
      const bot = typeof botId === 'string' ? await this.toInputUser(accountId, botId) : botId
      const cleanUsername = String(username || '').replace(/^@/, '').trim()
      const res = await holder.client.call({
        _: 'bots.toggleUsername',
        bot,
        username: cleanUsername,
        active,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] toggleUsername error:', err)
      throw err
    }
  }

  public async reorderUsernames(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrBotId: { botId: string | any; order: string[] } | string,
    orderParam?: string[]
  ): Promise<boolean> {
    try {
      let botId: any
      let order: string[] = []
      if (typeof paramsOrBotId === 'object' && paramsOrBotId !== null) {
        botId = paramsOrBotId.botId
        order = Array.isArray(paramsOrBotId.order) ? paramsOrBotId.order : []
      } else {
        botId = paramsOrBotId
        order = Array.isArray(orderParam) ? orderParam : []
      }
      const bot = typeof botId === 'string' ? await this.toInputUser(accountId, botId) : botId
      const res = await holder.client.call({
        _: 'bots.reorderUsernames',
        bot,
        order,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] reorderUsernames error:', err)
      throw err
    }
  }

  public async setCustomVerification(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrBotId: { botId?: string | any; bot?: string | any; peerId: string; customDescription?: string; enabled?: boolean } | string,
    peerIdParam?: string,
    customDescriptionParam?: string,
    enabledParam = true
  ): Promise<boolean> {
    try {
      let botId: any
      let peerId = ''
      let customDescription: string | undefined
      let enabled = true

      if (typeof paramsOrBotId === 'object' && paramsOrBotId !== null) {
        botId = paramsOrBotId.botId || paramsOrBotId.bot
        peerId = paramsOrBotId.peerId
        customDescription = paramsOrBotId.customDescription
        enabled = paramsOrBotId.enabled ?? true
      } else {
        botId = paramsOrBotId
        peerId = peerIdParam || ''
        customDescription = customDescriptionParam
        enabled = enabledParam
      }

      const bot = typeof botId === 'string' ? await this.toInputUser(accountId, botId) : botId
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
      throw err
    }
  }

  public async getRequestedWebViewButton(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrBotId: { botId: string | any; webappReqId: string } | string,
    webappReqIdParam?: string
  ): Promise<any> {
    try {
      let botId: any
      let webappReqId = ''
      if (typeof paramsOrBotId === 'object' && paramsOrBotId !== null) {
        botId = paramsOrBotId.botId
        webappReqId = paramsOrBotId.webappReqId
      } else {
        botId = paramsOrBotId
        webappReqId = webappReqIdParam || ''
      }
      const bot = typeof botId === 'string' ? await this.toInputUser(accountId, botId) : botId
      return await holder.client.call({
        _: 'bots.getRequestedWebViewButton',
        bot,
        webappReqId,
      })
    } catch (err) {
      Logger.warn('[BotsService] getRequestedWebViewButton error:', err)
      throw err
    }
  }

  public async requestWebViewButton(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrBotId: { botId: string | any; button: any } | string,
    buttonParam?: any
  ): Promise<any> {
    try {
      let botId: any
      let button: any
      if (typeof paramsOrBotId === 'object' && paramsOrBotId !== null) {
        botId = paramsOrBotId.botId
        button = paramsOrBotId.button
      } else {
        botId = paramsOrBotId
        button = buttonParam
      }
      const userId = typeof botId === 'string' ? await this.toInputUser(accountId, botId) : botId
      return await holder.client.call({
        _: 'bots.requestWebViewButton',
        userId,
        button,
      })
    } catch (err) {
      Logger.warn('[BotsService] requestWebViewButton error:', err)
      throw err
    }
  }

  public async setJoinChatResults(
    holder: RpcClientHolder,
    paramsOrQueryId: { queryId: bigint | number | Long | string; result: any } | bigint | number | Long | string,
    resultArg?: any
  ): Promise<boolean> {
    try {
      let rawQueryId: any
      let rawResult: any
      if (typeof paramsOrQueryId === 'object' && paramsOrQueryId !== null && 'queryId' in paramsOrQueryId) {
        rawQueryId = paramsOrQueryId.queryId
        rawResult = paramsOrQueryId.result
      } else {
        rawQueryId = paramsOrQueryId
        rawResult = resultArg
      }

      const queryId = typeof rawQueryId === 'string'
        ? Long.fromString(rawQueryId)
        : typeof rawQueryId === 'bigint'
        ? Long.fromString(rawQueryId.toString())
        : typeof rawQueryId === 'number'
        ? Long.fromNumber(rawQueryId)
        : rawQueryId

      let result: any = rawResult
      if (typeof rawResult === 'string') {
        if (rawResult === 'approved') result = { _: 'joinChatBotResultApproved' }
        else if (rawResult === 'declined') result = { _: 'joinChatBotResultDeclined' }
        else if (rawResult === 'queued') result = { _: 'joinChatBotResultQueued' }
        else if (rawResult.startsWith('http://') || rawResult.startsWith('https://')) {
          result = { _: 'joinChatBotResultWebView', url: rawResult }
        } else {
          result = { _: 'joinChatBotResultApproved' }
        }
      } else if (rawResult && typeof rawResult === 'object') {
        if (!rawResult._) {
          if (rawResult.approved) result = { _: 'joinChatBotResultApproved' }
          else if (rawResult.declined) result = { _: 'joinChatBotResultDeclined' }
          else if (rawResult.queued) result = { _: 'joinChatBotResultQueued' }
          else if (rawResult.url) result = { _: 'joinChatBotResultWebView', url: rawResult.url }
          else result = { _: 'joinChatBotResultApproved' }
        }
      }

      const res = await holder.client.call({
        _: 'bots.setJoinChatResults',
        queryId,
        result,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[BotsService] setJoinChatResults error:', err)
      throw err
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
