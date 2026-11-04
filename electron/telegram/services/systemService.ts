import { Logger } from '../logger'

export interface RpcClientHolder {
  client: {
    call: (query: { _: string; [key: string]: any }) => Promise<any>
    resolvePeer?: (peer: string) => Promise<any>
  }
}

/**
 * Enterprise System & Specialized Namespaces Domain Service for Guidegram
 * Comprehensive implementation of all 215 specialized MTProto methods:
 * phone, wallet, help, stats, chatlists, stickers, upload, communities, ephemeral,
 * smsjobs, aicompose, premium, photos, langpack, updates, toncenter, fragment, folders, root.
 * Layer 229+ with typed parameters, InputPeer/InputUser resolution, and error handling.
 */
export class SystemService {
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

  private async toInputChannel(accountId: string, channelId: string): Promise<any> {
    if (!channelId) return { _: 'inputChannelEmpty' }
    try {
      const peer = await this.resolveInputPeer(accountId, channelId)
      if (peer._ === 'inputPeerChannel') {
        return { _: 'inputChannel', channelId: peer.channelId, accessHash: peer.accessHash }
      }
    } catch {
      // fallback
    }
    return { _: 'inputChannel', channelId: BigInt(channelId), accessHash: 0n }
  }

  public async root_invokeAfterMsg(holder: RpcClientHolder, msgId?: bigint | number, query?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'invokeAfterMsg',
        'msg_id': msgId,
        'query': query,
      })
    } catch (err) {
      Logger.warn('[SystemService] invokeAfterMsg error:', err)
      return null
    }
  }

  public async root_invokeAfterMsgs(holder: RpcClientHolder, msgIds?: bigint | number, query?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'invokeAfterMsgs',
        'msg_ids': msgIds,
        'query': query,
      })
    } catch (err) {
      Logger.warn('[SystemService] invokeAfterMsgs error:', err)
      return null
    }
  }

  public async root_initConnection(holder: RpcClientHolder, apiId?: number, deviceModel?: string, systemVersion?: string, appVersion?: string, systemLangCode?: string, langPack?: string, langCode?: string, proxy?: any, params?: any, query?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'initConnection',
        'api_id': apiId,
        'device_model': deviceModel,
        'system_version': systemVersion,
        'app_version': appVersion,
        'system_lang_code': systemLangCode,
        'lang_pack': langPack,
        'lang_code': langCode,
        'proxy': proxy,
        'params': params,
        'query': query,
      })
    } catch (err) {
      Logger.warn('[SystemService] initConnection error:', err)
      return null
    }
  }

  public async root_invokeWithLayer(holder: RpcClientHolder, layer?: number, query?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'invokeWithLayer',
        'layer': layer,
        'query': query,
      })
    } catch (err) {
      Logger.warn('[SystemService] invokeWithLayer error:', err)
      return null
    }
  }

  public async root_invokeWithoutUpdates(holder: RpcClientHolder, query?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'invokeWithoutUpdates',
        'query': query,
      })
    } catch (err) {
      Logger.warn('[SystemService] invokeWithoutUpdates error:', err)
      return null
    }
  }

  public async root_invokeWithMessagesRange(holder: RpcClientHolder, range?: any, query?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'invokeWithMessagesRange',
        'range': range,
        'query': query,
      })
    } catch (err) {
      Logger.warn('[SystemService] invokeWithMessagesRange error:', err)
      return null
    }
  }

  public async root_invokeWithTakeout(holder: RpcClientHolder, takeoutId?: bigint | number, query?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'invokeWithTakeout',
        'takeout_id': takeoutId,
        'query': query,
      })
    } catch (err) {
      Logger.warn('[SystemService] invokeWithTakeout error:', err)
      return null
    }
  }

  public async root_invokeWithBusinessConnection(holder: RpcClientHolder, connectionId?: string, query?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'invokeWithBusinessConnection',
        'connection_id': connectionId,
        'query': query,
      })
    } catch (err) {
      Logger.warn('[SystemService] invokeWithBusinessConnection error:', err)
      return null
    }
  }

  public async root_invokeWithGooglePlayIntegrity(holder: RpcClientHolder, nonce?: string, token?: string, query?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'invokeWithGooglePlayIntegrity',
        'nonce': nonce,
        'token': token,
        'query': query,
      })
    } catch (err) {
      Logger.warn('[SystemService] invokeWithGooglePlayIntegrity error:', err)
      return null
    }
  }

  public async root_invokeWithApnsSecret(holder: RpcClientHolder, nonce?: string, secret?: string, query?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'invokeWithApnsSecret',
        'nonce': nonce,
        'secret': secret,
        'query': query,
      })
    } catch (err) {
      Logger.warn('[SystemService] invokeWithApnsSecret error:', err)
      return null
    }
  }

  public async root_invokeWithReCaptcha(holder: RpcClientHolder, token?: string, query?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'invokeWithReCaptcha',
        'token': token,
        'query': query,
      })
    } catch (err) {
      Logger.warn('[SystemService] invokeWithReCaptcha error:', err)
      return null
    }
  }

  public async updates_getState(holder: RpcClientHolder): Promise<any> {
    try {
      return await holder.client.call({
        _: 'updates.getState',
      })
    } catch (err) {
      Logger.warn('[SystemService] updates.getState error:', err)
      return null
    }
  }

  public async updates_getDifference(holder: RpcClientHolder, pts?: number, ptsLimit?: number, ptsTotalLimit?: number, date?: number, qts?: number, qtsLimit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'updates.getDifference',
        pts: pts ?? 1,
        ptsLimit: ptsLimit || undefined,
        ptsTotalLimit: ptsTotalLimit || undefined,
        date: date || Math.floor(Date.now() / 1000),
        qts: qts ?? 1,
        qtsLimit: qtsLimit || undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] updates.getDifference error:', err)
      return null
    }
  }

  public async updates_getChannelDifference(holder: RpcClientHolder, accountId: string, force?: boolean, channel?: any, filter?: any, pts?: number, limit?: number): Promise<any> {
    try {
      let chanObj: any
      if (typeof channel === 'string' || typeof channel === 'number' || typeof channel === 'bigint') {
        chanObj = await this.toInputChannel(accountId, String(channel))
      } else {
        chanObj = channel || { _: 'inputChannelEmpty' }
      }
      return await holder.client.call({
        _: 'updates.getChannelDifference',
        force: force || undefined,
        channel: chanObj,
        filter: filter || { _: 'channelMessagesFilterEmpty' },
        pts: pts ?? 1,
        limit: limit ?? 100,
      })
    } catch (err) {
      Logger.warn('[SystemService] updates.getChannelDifference error:', err)
      return null
    }
  }

  public async photos_updateProfilePhoto(holder: RpcClientHolder, accountId: string, fallback?: boolean, botId?: string, id?: any): Promise<any> {
    try {
      let photoObj = id
      if (typeof id === 'string' || typeof id === 'number' || typeof id === 'bigint') {
        photoObj = {
          _: 'inputPhoto',
          id: BigInt(id),
          accessHash: 0n,
          fileReference: new Uint8Array(),
        }
      }
      return await holder.client.call({
        _: 'photos.updateProfilePhoto',
        fallback: fallback || undefined,
        bot: botId ? await this.toInputUser(accountId, botId) : undefined,
        id: photoObj || { _: 'inputPhotoEmpty' },
      })
    } catch (err) {
      Logger.warn('[SystemService] photos.updateProfilePhoto error:', err)
      return null
    }
  }

  public async photos_uploadProfilePhoto(holder: RpcClientHolder, accountId: string, fallback?: boolean, botId?: string, file?: any, video?: any, videoStartTs?: any, videoEmojiMarkup?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'photos.uploadProfilePhoto',
        fallback: fallback || undefined,
        bot: botId ? await this.toInputUser(accountId, botId) : undefined,
        file: file || undefined,
        video: video || undefined,
        videoStartTs: videoStartTs || undefined,
        videoEmojiMarkup: videoEmojiMarkup || undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] photos.uploadProfilePhoto error:', err)
      return null
    }
  }

  public async photos_deletePhotos(holder: RpcClientHolder, id?: any): Promise<any> {
    try {
      const rawList = Array.isArray(id) ? id : [id]
      const inputPhotos = rawList.map((item: any) => {
        if (typeof item === 'object' && item && item._) return item
        return {
          _: 'inputPhoto',
          id: BigInt(item || 0),
          accessHash: 0n,
          fileReference: new Uint8Array(),
        }
      })
      return await holder.client.call({
        _: 'photos.deletePhotos',
        id: inputPhotos,
      })
    } catch (err) {
      Logger.warn('[SystemService] photos.deletePhotos error:', err)
      return null
    }
  }

  public async photos_getUserPhotos(holder: RpcClientHolder, accountId: string, userIdId?: string, offset?: number, maxId?: bigint | number | string, limit?: number): Promise<any> {
    try {
      const targetUser = userIdId ? await this.toInputUser(accountId, userIdId) : { _: 'inputUserSelf' }
      return await holder.client.call({
        _: 'photos.getUserPhotos',
        userId: targetUser,
        offset: offset ?? 0,
        maxId: maxId ? BigInt(maxId) : 0n,
        limit: limit ?? 20,
      })
    } catch (err) {
      Logger.warn('[SystemService] photos.getUserPhotos error:', err)
      return null
    }
  }

  public async photos_uploadContactProfilePhoto(holder: RpcClientHolder, accountId: string, suggest?: boolean, save?: boolean, userIdId?: string, file?: any, video?: any, videoStartTs?: any, videoEmojiMarkup?: any): Promise<any> {
    try {
      const targetUser = userIdId ? await this.toInputUser(accountId, userIdId) : { _: 'inputUserSelf' }
      return await holder.client.call({
        _: 'photos.uploadContactProfilePhoto',
        suggest: suggest || undefined,
        save: save || undefined,
        userId: targetUser,
        file: file || undefined,
        video: video || undefined,
        videoStartTs: videoStartTs || undefined,
        videoEmojiMarkup: videoEmojiMarkup || undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] photos.uploadContactProfilePhoto error:', err)
      return null
    }
  }

  public async upload_saveFilePart(holder: RpcClientHolder, fileId?: bigint | number | string, filePart?: number, bytes?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'upload.saveFilePart',
        fileId: fileId ? BigInt(fileId) : 0n,
        filePart: filePart ?? 0,
        bytes: this.toUint8Array(bytes),
      })
    } catch (err) {
      Logger.warn('[SystemService] upload.saveFilePart error:', err)
      return null
    }
  }

  private toUint8Array(data: any): Uint8Array {
    if (data instanceof Uint8Array) return data
    if (Buffer.isBuffer(data)) return new Uint8Array(data)
    if (typeof data === 'string') {
      if (/^[0-9a-fA-F]+$/.test(data) && data.length % 2 === 0) {
        return new Uint8Array(Buffer.from(data, 'hex'))
      }
      return new Uint8Array(Buffer.from(data, 'utf-8'))
    }
    return new Uint8Array()
  }

  public async upload_getFile(holder: RpcClientHolder, precise?: boolean, cdnSupported?: boolean, location?: any, offset?: bigint | number | string, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'upload.getFile',
        precise: precise || undefined,
        cdnSupported: cdnSupported || undefined,
        location: location || { _: 'inputDocumentFileLocation', id: 0n, accessHash: 0n, fileReference: new Uint8Array(), thumbSize: '' },
        offset: offset ? BigInt(offset) : 0n,
        limit: limit ?? 1048576,
      })
    } catch (err) {
      Logger.warn('[SystemService] upload.getFile error:', err)
      return null
    }
  }

  public async upload_saveBigFilePart(holder: RpcClientHolder, fileId?: bigint | number | string, filePart?: number, fileTotalParts?: number, bytes?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'upload.saveBigFilePart',
        fileId: fileId ? BigInt(fileId) : 0n,
        filePart: filePart ?? 0,
        fileTotalParts: fileTotalParts ?? 1,
        bytes: this.toUint8Array(bytes),
      })
    } catch (err) {
      Logger.warn('[SystemService] upload.saveBigFilePart error:', err)
      return null
    }
  }

  public async upload_getWebFile(holder: RpcClientHolder, location?: any, offset?: number, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'upload.getWebFile',
        location: location || { _: 'inputWebFileLocation', url: '', accessHash: 0n },
        offset: offset ?? 0,
        limit: limit ?? 131072,
      })
    } catch (err) {
      Logger.warn('[SystemService] upload.getWebFile error:', err)
      return null
    }
  }

  public async upload_getCdnFile(holder: RpcClientHolder, fileToken?: any, offset?: bigint | number | string, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'upload.getCdnFile',
        fileToken: this.toUint8Array(fileToken),
        offset: offset ? BigInt(offset) : 0n,
        limit: limit ?? 1048576,
      })
    } catch (err) {
      Logger.warn('[SystemService] upload.getCdnFile error:', err)
      return null
    }
  }

  public async upload_reuploadCdnFile(holder: RpcClientHolder, fileToken?: any, requestToken?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'upload.reuploadCdnFile',
        fileToken: this.toUint8Array(fileToken),
        requestToken: this.toUint8Array(requestToken),
      })
    } catch (err) {
      Logger.warn('[SystemService] upload.reuploadCdnFile error:', err)
      return null
    }
  }

  public async upload_getCdnFileHashes(holder: RpcClientHolder, fileToken?: any, offset?: bigint | number | string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'upload.getCdnFileHashes',
        fileToken: this.toUint8Array(fileToken),
        offset: offset ? BigInt(offset) : 0n,
      })
    } catch (err) {
      Logger.warn('[SystemService] upload.getCdnFileHashes error:', err)
      return null
    }
  }

  public async upload_getFileHashes(holder: RpcClientHolder, location?: any, offset?: bigint | number | string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'upload.getFileHashes',
        location: location || { _: 'inputDocumentFileLocation', id: 0n, accessHash: 0n, fileReference: new Uint8Array(), thumbSize: '' },
        offset: offset ? BigInt(offset) : 0n,
      })
    } catch (err) {
      Logger.warn('[SystemService] upload.getFileHashes error:', err)
      return null
    }
  }

  public async help_getConfig(holder: RpcClientHolder): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getConfig',
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getConfig error:', err)
      return null
    }
  }

  public async help_getNearestDc(holder: RpcClientHolder): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getNearestDc',
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getNearestDc error:', err)
      return null
    }
  }

  public async help_getAppUpdate(holder: RpcClientHolder, source?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getAppUpdate',
        source: source || 'android',
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getAppUpdate error:', err)
      return null
    }
  }

  public async help_getInviteText(holder: RpcClientHolder): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getInviteText',
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getInviteText error:', err)
      return null
    }
  }

  public async help_getSupport(holder: RpcClientHolder): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getSupport',
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getSupport error:', err)
      return null
    }
  }

  public async help_setBotUpdatesStatus(holder: RpcClientHolder, pendingUpdatesCount?: number, message?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.setBotUpdatesStatus',
        pendingUpdatesCount: pendingUpdatesCount ?? 0,
        message: message || '',
      })
    } catch (err) {
      Logger.warn('[SystemService] help.setBotUpdatesStatus error:', err)
      return null
    }
  }

  public async help_getCdnConfig(holder: RpcClientHolder): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getCdnConfig',
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getCdnConfig error:', err)
      return null
    }
  }

  public async help_getRecentMeUrls(holder: RpcClientHolder, referer?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getRecentMeUrls',
        referer: referer || '',
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getRecentMeUrls error:', err)
      return null
    }
  }

  public async help_getTermsOfServiceUpdate(holder: RpcClientHolder): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getTermsOfServiceUpdate',
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getTermsOfServiceUpdate error:', err)
      return null
    }
  }

  public async help_acceptTermsOfService(holder: RpcClientHolder, id?: any): Promise<any> {
    try {
      const dataJson = typeof id === 'string' ? { _: 'dataJSON', data: id } : (id || { _: 'dataJSON', data: '{}' })
      return await holder.client.call({
        _: 'help.acceptTermsOfService',
        id: dataJson,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.acceptTermsOfService error:', err)
      return null
    }
  }

  public async help_getDeepLinkInfo(holder: RpcClientHolder, path?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getDeepLinkInfo',
        path: path || '',
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getDeepLinkInfo error:', err)
      return null
    }
  }

  public async help_getAppConfig(holder: RpcClientHolder, hash?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getAppConfig',
        hash: hash ?? 0,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getAppConfig error:', err)
      return null
    }
  }

  public async help_getPassportConfig(holder: RpcClientHolder, hash?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getPassportConfig',
        hash: hash ?? 0,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getPassportConfig error:', err)
      return null
    }
  }

  public async help_getSupportName(holder: RpcClientHolder): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getSupportName',
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getSupportName error:', err)
      return null
    }
  }

  public async help_getUserInfo(holder: RpcClientHolder, accountId: string, userId?: string): Promise<any> {
    try {
      const inputUser = userId ? await this.toInputUser(accountId, userId) : { _: 'inputUserSelf' as const }
      return await holder.client.call({
        _: 'help.getUserInfo',
        userId: inputUser,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getUserInfo error:', err)
      return null
    }
  }

  public async help_editUserInfo(holder: RpcClientHolder, accountId: string, userId?: string, message?: string, entities?: any[]): Promise<any> {
    try {
      const inputUser = userId ? await this.toInputUser(accountId, userId) : { _: 'inputUserSelf' }
      return await holder.client.call({
        _: 'help.editUserInfo',
        userId: inputUser,
        message: message || '',
        entities: Array.isArray(entities) ? entities : [],
      })
    } catch (err) {
      Logger.warn('[SystemService] help.editUserInfo error:', err)
      return null
    }
  }

  public async help_getPromoData(holder: RpcClientHolder): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getPromoData',
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getPromoData error:', err)
      return null
    }
  }

  public async help_hidePromoData(holder: RpcClientHolder, accountId: string, peerId?: string): Promise<any> {
    try {
      const inputPeer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' as const }
      return await holder.client.call({
        _: 'help.hidePromoData',
        peer: inputPeer,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.hidePromoData error:', err)
      return null
    }
  }

  public async help_saveAppLog(holder: RpcClientHolder, events?: any[]): Promise<any> {
    try {
      const formattedEvents = Array.isArray(events) && events.length > 0
        ? events.map(ev => ({
            _: 'inputAppEvent' as const,
            time: ev.time ?? Date.now() / 1000,
            type: ev.type || 'app_event',
            peer: BigInt(ev.peer || 0),
            data: typeof ev.data === 'object' && ev.data?._ ? ev.data : { _: 'jsonString' as const, value: typeof ev.data === 'string' ? ev.data : JSON.stringify(ev.data || {}) },
          }))
        : [
            {
              _: 'inputAppEvent' as const,
              time: Date.now() / 1000,
              type: 'guidegram_ping',
              peer: BigInt(0),
              data: { _: 'jsonString' as const, value: '{"status":"ok"}' },
            },
          ]

      return await holder.client.call({
        _: 'help.saveAppLog',
        events: formattedEvents,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.saveAppLog error:', err)
      return null
    }
  }

  public async help_dismissSuggestion(holder: RpcClientHolder, accountId: string, peerId?: string, suggestion?: string): Promise<any> {
    try {
      const inputPeer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      return await holder.client.call({
        _: 'help.dismissSuggestion',
        peer: inputPeer,
        suggestion: suggestion || '',
      })
    } catch (err) {
      Logger.warn('[SystemService] help.dismissSuggestion error:', err)
      return null
    }
  }

  public async help_getCountriesList(holder: RpcClientHolder, langCode?: string, hash?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getCountriesList',
        langCode: langCode || 'en',
        hash: hash ?? 0,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getCountriesList error:', err)
      return null
    }
  }

  public async help_getPremiumPromo(holder: RpcClientHolder): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getPremiumPromo',
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getPremiumPromo error:', err)
      return null
    }
  }

  public async help_getPeerColors(holder: RpcClientHolder, hash?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getPeerColors',
        hash: hash ?? 0,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getPeerColors error:', err)
      return null
    }
  }

  public async help_getPeerProfileColors(holder: RpcClientHolder, hash?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getPeerProfileColors',
        hash: hash ?? 0,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getPeerProfileColors error:', err)
      return null
    }
  }

  public async help_getTimezonesList(holder: RpcClientHolder, hash?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getTimezonesList',
        hash: hash ?? 0,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getTimezonesList error:', err)
      return null
    }
  }

  private toInputStickerSet(stickerset: any): any {
    if (!stickerset) return { _: 'inputStickerSetEmpty' }
    if (typeof stickerset === 'object' && stickerset._) return stickerset
    if (typeof stickerset === 'string') {
      return { _: 'inputStickerSetShortName', shortName: stickerset }
    }
    if (typeof stickerset === 'object') {
      if (stickerset.shortName) {
        return { _: 'inputStickerSetShortName', shortName: stickerset.shortName }
      }
      if (stickerset.id) {
        return {
          _: 'inputStickerSetID',
          id: BigInt(stickerset.id),
          accessHash: BigInt(stickerset.accessHash || 0),
        }
      }
    }
    return { _: 'inputStickerSetEmpty' }
  }

  private toInputDocument(doc: any): any {
    if (!doc) return { _: 'inputDocumentEmpty' }
    if (typeof doc === 'object' && doc._) return doc
    if (typeof doc === 'object' && doc.id) {
      let fileRef: any = doc.fileReference
      if (typeof fileRef === 'string') {
        fileRef = Buffer.from(fileRef, 'hex')
      } else if (!fileRef) {
        fileRef = new Uint8Array(0)
      }
      return {
        _: 'inputDocument',
        id: BigInt(doc.id),
        accessHash: BigInt(doc.accessHash || 0),
        fileReference: fileRef,
      }
    }
    return { _: 'inputDocumentEmpty' }
  }

  private toInputGroupCall(call: any): any {
    if (!call) return { _: 'inputGroupCall', id: 0n, access_hash: 0n }
    if (typeof call === 'object' && call._) return call
    if (typeof call === 'object' && call.id) {
      return {
        _: 'inputGroupCall',
        id: BigInt(call.id),
        access_hash: BigInt(call.accessHash || call.access_hash || 0),
      }
    }
    if (typeof call === 'string' || typeof call === 'number' || typeof call === 'bigint') {
      return {
        _: 'inputGroupCall',
        id: BigInt(call),
        access_hash: 0n,
      }
    }
    return { _: 'inputGroupCall', id: 0n, access_hash: 0n }
  }

  private toInputPhoneCall(call: any): any {
    if (!call) return { _: 'inputPhoneCall', id: 0n, access_hash: 0n }
    if (typeof call === 'object' && call._) return call
    if (typeof call === 'object' && call.id) {
      return {
        _: 'inputPhoneCall',
        id: BigInt(call.id),
        access_hash: BigInt(call.accessHash || call.access_hash || 0),
      }
    }
    if (typeof call === 'string' || typeof call === 'number' || typeof call === 'bigint') {
      return {
        _: 'inputPhoneCall',
        id: BigInt(call),
        access_hash: 0n,
      }
    }
    return { _: 'inputPhoneCall', id: 0n, access_hash: 0n }
  }

  public async stickers_createStickerSet(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrMasks?: any,
    emojis?: boolean,
    textColor?: boolean,
    userId?: string,
    title?: string,
    shortName?: string,
    thumb?: any,
    stickers?: any,
    software?: string
  ): Promise<any> {
    try {
      let p: any = {}
      if (typeof paramsOrMasks === 'object' && paramsOrMasks !== null && !paramsOrMasks._) {
        p = paramsOrMasks
      } else {
        p = {
          masks: paramsOrMasks,
          emojis,
          textColor,
          userId,
          title,
          shortName,
          thumb,
          stickers,
          software,
        }
      }

      const inputUser = p.userId ? await this.toInputUser(accountId, p.userId) : { _: 'inputUserSelf' }
      let resolvedStickers: any[] = []
      if (Array.isArray(p.stickers)) {
        resolvedStickers = p.stickers.map((s: any) => {
          if (s && s._ === 'inputStickerSetItem') return s
          return {
            _: 'inputStickerSetItem',
            document: this.toInputDocument(s.document || s),
            emoji: s.emoji || s.emoticon || '⭐',
            maskCoords: s.maskCoords,
            keywords: s.keywords,
          }
        })
      }

      return await holder.client.call({
        _: 'stickers.createStickerSet',
        masks: !!p.masks,
        emojis: !!p.emojis,
        textColor: !!p.textColor,
        userId: inputUser,
        title: p.title || 'Untitled Stickers',
        shortName: p.shortName,
        thumb: p.thumb ? this.toInputDocument(p.thumb) : undefined,
        stickers: resolvedStickers,
        software: p.software || 'Guidegram',
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.createStickerSet error:', err)
      throw err
    }
  }

  public async stickers_removeStickerFromSet(holder: RpcClientHolder, stickerOrParams?: any): Promise<any> {
    try {
      const sticker = (typeof stickerOrParams === 'object' && stickerOrParams !== null && stickerOrParams.sticker !== undefined)
        ? stickerOrParams.sticker
        : stickerOrParams
      return await holder.client.call({
        _: 'stickers.removeStickerFromSet',
        sticker: this.toInputDocument(sticker),
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.removeStickerFromSet error:', err)
      throw err
    }
  }

  public async stickers_changeStickerPosition(holder: RpcClientHolder, stickerOrParams?: any, position?: number): Promise<any> {
    try {
      let stk: any = stickerOrParams
      let pos: number = position ?? 0
      if (typeof stickerOrParams === 'object' && stickerOrParams !== null && !stickerOrParams._ && stickerOrParams.sticker !== undefined) {
        stk = stickerOrParams.sticker
        pos = Number(stickerOrParams.position ?? 0)
      }
      return await holder.client.call({
        _: 'stickers.changeStickerPosition',
        sticker: this.toInputDocument(stk),
        position: pos,
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.changeStickerPosition error:', err)
      throw err
    }
  }

  public async stickers_addStickerToSet(holder: RpcClientHolder, stickersetOrParams?: any, sticker?: any): Promise<any> {
    try {
      let set: any = stickersetOrParams
      let item: any = sticker
      if (typeof stickersetOrParams === 'object' && stickersetOrParams !== null && !stickersetOrParams._ && stickersetOrParams.stickerset !== undefined) {
        set = stickersetOrParams.stickerset
        item = stickersetOrParams.sticker
      }

      let resolvedItem: any = item
      if (item && item._ !== 'inputStickerSetItem') {
        resolvedItem = {
          _: 'inputStickerSetItem',
          document: this.toInputDocument(item.document || item),
          emoji: item.emoji || item.emoticon || '⭐',
          maskCoords: item.maskCoords,
          keywords: item.keywords,
        }
      }

      return await holder.client.call({
        _: 'stickers.addStickerToSet',
        stickerset: this.toInputStickerSet(set),
        sticker: resolvedItem,
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.addStickerToSet error:', err)
      throw err
    }
  }

  public async stickers_setStickerSetThumb(
    holder: RpcClientHolder,
    stickersetOrParams?: any,
    thumb?: any,
    thumbDocumentId?: bigint | number
  ): Promise<any> {
    try {
      let set: any = stickersetOrParams
      let th: any = thumb
      let docId: any = thumbDocumentId
      if (typeof stickersetOrParams === 'object' && stickersetOrParams !== null && !stickersetOrParams._ && stickersetOrParams.stickerset !== undefined) {
        set = stickersetOrParams.stickerset
        th = stickersetOrParams.thumb
        docId = stickersetOrParams.thumbDocumentId ?? stickersetOrParams.thumb_document_id
      }
      return await holder.client.call({
        _: 'stickers.setStickerSetThumb',
        stickerset: this.toInputStickerSet(set),
        thumb: th ? this.toInputDocument(th) : undefined,
        thumb_document_id: docId !== undefined ? BigInt(docId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.setStickerSetThumb error:', err)
      throw err
    }
  }

  public async stickers_checkShortName(holder: RpcClientHolder, shortNameOrParams?: any): Promise<any> {
    try {
      const name = (typeof shortNameOrParams === 'object' && shortNameOrParams !== null && shortNameOrParams.shortName !== undefined)
        ? shortNameOrParams.shortName
        : shortNameOrParams
      return await holder.client.call({
        _: 'stickers.checkShortName',
        shortName: String(name || '').trim(),
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.checkShortName error:', err)
      throw err
    }
  }

  public async stickers_suggestShortName(holder: RpcClientHolder, titleOrParams?: any): Promise<any> {
    try {
      const title = (typeof titleOrParams === 'object' && titleOrParams !== null && titleOrParams.title !== undefined)
        ? titleOrParams.title
        : titleOrParams
      return await holder.client.call({
        _: 'stickers.suggestShortName',
        title: String(title || ''),
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.suggestShortName error:', err)
      throw err
    }
  }

  public async stickers_changeSticker(
    holder: RpcClientHolder,
    stickerOrParams?: any,
    emoji?: string,
    maskCoords?: any,
    keywords?: string
  ): Promise<any> {
    try {
      let stk: any = stickerOrParams
      let em: string = emoji || ''
      let mc: any = maskCoords
      let kw: string = keywords || ''
      if (typeof stickerOrParams === 'object' && stickerOrParams !== null && !stickerOrParams._ && stickerOrParams.sticker !== undefined) {
        stk = stickerOrParams.sticker
        em = stickerOrParams.emoji || ''
        mc = stickerOrParams.maskCoords
        kw = stickerOrParams.keywords || ''
      }
      return await holder.client.call({
        _: 'stickers.changeSticker',
        sticker: this.toInputDocument(stk),
        emoji: em || undefined,
        maskCoords: mc || undefined,
        keywords: kw || undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.changeSticker error:', err)
      throw err
    }
  }

  public async stickers_renameStickerSet(holder: RpcClientHolder, stickersetOrParams?: any, title?: string): Promise<any> {
    try {
      let set: any = stickersetOrParams
      let ttl: string = title || ''
      if (typeof stickersetOrParams === 'object' && stickersetOrParams !== null && !stickersetOrParams._ && stickersetOrParams.stickerset !== undefined) {
        set = stickersetOrParams.stickerset
        ttl = stickersetOrParams.title || ''
      }
      return await holder.client.call({
        _: 'stickers.renameStickerSet',
        stickerset: this.toInputStickerSet(set),
        title: ttl,
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.renameStickerSet error:', err)
      throw err
    }
  }

  public async stickers_deleteStickerSet(holder: RpcClientHolder, stickersetOrParams?: any): Promise<any> {
    try {
      const set = (typeof stickersetOrParams === 'object' && stickersetOrParams !== null && stickersetOrParams.stickerset !== undefined)
        ? stickersetOrParams.stickerset
        : stickersetOrParams
      return await holder.client.call({
        _: 'stickers.deleteStickerSet',
        stickerset: this.toInputStickerSet(set),
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.deleteStickerSet error:', err)
      throw err
    }
  }

  public async stickers_replaceSticker(holder: RpcClientHolder, stickerOrParams?: any, newSticker?: any): Promise<any> {
    try {
      let stk: any = stickerOrParams
      let nStk: any = newSticker
      if (typeof stickerOrParams === 'object' && stickerOrParams !== null && !stickerOrParams._ && stickerOrParams.sticker !== undefined) {
        stk = stickerOrParams.sticker
        nStk = stickerOrParams.newSticker ?? stickerOrParams.new_sticker
      }

      let resolvedItem: any = nStk
      if (nStk && nStk._ !== 'inputStickerSetItem') {
        resolvedItem = {
          _: 'inputStickerSetItem',
          document: this.toInputDocument(nStk.document || nStk),
          emoji: nStk.emoji || nStk.emoticon || '⭐',
          maskCoords: nStk.maskCoords,
          keywords: nStk.keywords,
        }
      }

      return await holder.client.call({
        _: 'stickers.replaceSticker',
        sticker: this.toInputDocument(stk),
        new_sticker: resolvedItem,
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.replaceSticker error:', err)
      throw err
    }
  }

  public async phone_getCallConfig(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.getCallConfig',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.getCallConfig error:', err)
      throw err
    }
  }

  public async phone_requestCall(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrVideo?: any,
    userIdId?: string,
    randomId?: number,
    gAHash?: any,
    protocol?: any
  ): Promise<any> {
    try {
      let p: any = {}
      if (typeof paramsOrVideo === 'object' && paramsOrVideo !== null && !paramsOrVideo._) {
        p = paramsOrVideo
      } else {
        p = {
          video: paramsOrVideo,
          userId: userIdId,
          randomId,
          gAHash,
          protocol,
        }
      }
      const targetUser = p.userId ?? p.user_id
      const resolvedUser = targetUser ? await this.toInputUser(accountId, targetUser) : undefined
      const resolvedRandomId = p.randomId ?? p.random_id ?? Math.floor(Math.random() * 0x7fffffff)
      const rawHash = p.gAHash ?? p.g_a_hash
      const resolvedHash = typeof rawHash === 'string'
        ? Buffer.from(rawHash, 'hex')
        : (rawHash || new Uint8Array(32))
      const resolvedProtocol = p.protocol || {
        _: 'phoneCallProtocol',
        min_layer: 93,
        max_layer: 93,
        udp_p2p: true,
        udp_reflector: true,
        library_versions: ['1.0.0'],
      }
      return await holder.client.call({
        _: 'phone.requestCall',
        video: !!p.video,
        user_id: resolvedUser,
        random_id: resolvedRandomId,
        g_a_hash: resolvedHash,
        protocol: resolvedProtocol,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.requestCall error:', err)
      throw err
    }
  }

  public async phone_acceptCall(holder: RpcClientHolder, peerOrParams?: any, gB?: any, protocol?: any): Promise<any> {
    try {
      let peer = peerOrParams
      let b = gB
      let prot = protocol
      if (typeof peerOrParams === 'object' && peerOrParams !== null && !peerOrParams._ && peerOrParams.peer !== undefined) {
        peer = peerOrParams.peer
        b = peerOrParams.gB ?? peerOrParams.g_b
        prot = peerOrParams.protocol
      }
      return await holder.client.call({
        _: 'phone.acceptCall',
        peer: this.toInputPhoneCall(peer),
        g_b: typeof b === 'string' ? Buffer.from(b, 'hex') : (b || new Uint8Array(0)),
        protocol: prot || { _: 'phoneCallProtocol', min_layer: 93, max_layer: 93, udp_p2p: true, udp_reflector: true, library_versions: ['1.0.0'] },
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.acceptCall error:', err)
      throw err
    }
  }

  public async phone_confirmCall(
    holder: RpcClientHolder,
    peerOrParams?: any,
    gA?: any,
    keyFingerprint?: bigint | number,
    protocol?: any
  ): Promise<any> {
    try {
      let peer = peerOrParams
      let a = gA
      let fp = keyFingerprint
      let prot = protocol
      if (typeof peerOrParams === 'object' && peerOrParams !== null && !peerOrParams._ && peerOrParams.peer !== undefined) {
        peer = peerOrParams.peer
        a = peerOrParams.gA ?? peerOrParams.g_a
        fp = peerOrParams.keyFingerprint ?? peerOrParams.key_fingerprint
        prot = peerOrParams.protocol
      }
      return await holder.client.call({
        _: 'phone.confirmCall',
        peer: this.toInputPhoneCall(peer),
        g_a: typeof a === 'string' ? Buffer.from(a, 'hex') : (a || new Uint8Array(0)),
        key_fingerprint: fp !== undefined ? BigInt(fp) : 0n,
        protocol: prot || { _: 'phoneCallProtocol', min_layer: 93, max_layer: 93, udp_p2p: true, udp_reflector: true, library_versions: ['1.0.0'] },
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.confirmCall error:', err)
      throw err
    }
  }

  public async phone_receivedCall(holder: RpcClientHolder, peerOrParams?: any): Promise<any> {
    try {
      const peer = (typeof peerOrParams === 'object' && peerOrParams !== null && !peerOrParams._ && peerOrParams.peer !== undefined)
        ? peerOrParams.peer
        : peerOrParams
      return await holder.client.call({
        _: 'phone.receivedCall',
        peer: this.toInputPhoneCall(peer),
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.receivedCall error:', err)
      throw err
    }
  }

  public async phone_discardCall(
    holder: RpcClientHolder,
    paramsOrVideo?: any,
    peer?: any,
    duration?: number,
    reason?: any,
    connectionId?: bigint | number
  ): Promise<any> {
    try {
      let p: any = {}
      if (typeof paramsOrVideo === 'object' && paramsOrVideo !== null && !paramsOrVideo._) {
        p = paramsOrVideo
      } else {
        p = {
          video: paramsOrVideo,
          peer,
          duration,
          reason,
          connectionId,
        }
      }

      let resolvedReason = p.reason || { _: 'phoneCallDiscardReasonHangup' }
      if (typeof resolvedReason === 'string') {
        const lower = resolvedReason.toLowerCase()
        if (lower === 'busy') resolvedReason = { _: 'phoneCallDiscardReasonBusy' }
        else if (lower === 'missed') resolvedReason = { _: 'phoneCallDiscardReasonMissed' }
        else if (lower === 'disconnect') resolvedReason = { _: 'phoneCallDiscardReasonDisconnect' }
        else resolvedReason = { _: 'phoneCallDiscardReasonHangup' }
      }

      return await holder.client.call({
        _: 'phone.discardCall',
        video: !!p.video,
        peer: this.toInputPhoneCall(p.peer),
        duration: Number(p.duration || 0),
        reason: resolvedReason,
        connection_id: p.connectionId !== undefined ? BigInt(p.connectionId) : 0n,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.discardCall error:', err)
      throw err
    }
  }

  public async phone_setCallRating(
    holder: RpcClientHolder,
    paramsOrInitiative?: any,
    peer?: any,
    rating?: number,
    comment?: string
  ): Promise<any> {
    try {
      let p: any = {}
      if (typeof paramsOrInitiative === 'object' && paramsOrInitiative !== null && !paramsOrInitiative._ && paramsOrInitiative.peer !== undefined) {
        p = paramsOrInitiative
      } else {
        p = {
          userInitiative: paramsOrInitiative,
          peer,
          rating,
          comment,
        }
      }
      return await holder.client.call({
        _: 'phone.setCallRating',
        user_initiative: p.userInitiative !== undefined ? !!p.userInitiative : undefined,
        peer: this.toInputPhoneCall(p.peer),
        rating: Number(p.rating || 5),
        comment: String(p.comment || ''),
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.setCallRating error:', err)
      throw err
    }
  }

  public async phone_saveCallDebug(holder: RpcClientHolder, peerOrParams?: any, debug?: any): Promise<any> {
    try {
      let peer = peerOrParams
      let dbg = debug
      if (typeof peerOrParams === 'object' && peerOrParams !== null && !peerOrParams._ && peerOrParams.peer !== undefined) {
        peer = peerOrParams.peer
        dbg = peerOrParams.debug
      }
      let dataJSON = dbg
      if (typeof dbg === 'string') {
        dataJSON = { _: 'dataJSON', data: dbg }
      } else if (typeof dbg === 'object' && dbg !== null && !dbg._) {
        dataJSON = { _: 'dataJSON', data: JSON.stringify(dbg) }
      } else if (!dbg) {
        dataJSON = { _: 'dataJSON', data: '{}' }
      }
      return await holder.client.call({
        _: 'phone.saveCallDebug',
        peer: this.toInputPhoneCall(peer),
        debug: dataJSON,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.saveCallDebug error:', err)
      throw err
    }
  }

  public async phone_sendSignalingData(holder: RpcClientHolder, peerOrParams?: any, data?: any): Promise<any> {
    try {
      let peer = peerOrParams
      let d = data
      if (typeof peerOrParams === 'object' && peerOrParams !== null && !peerOrParams._ && peerOrParams.peer !== undefined) {
        peer = peerOrParams.peer
        d = peerOrParams.data
      }
      let resolvedData = d
      if (typeof d === 'string') {
        resolvedData = Buffer.from(d, 'hex')
      } else if (!d) {
        resolvedData = new Uint8Array(0)
      }
      return await holder.client.call({
        _: 'phone.sendSignalingData',
        peer: this.toInputPhoneCall(peer),
        data: resolvedData,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.sendSignalingData error:', err)
      throw err
    }
  }

  public async phone_createGroupCall(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrRtmp?: any,
    peerId?: string,
    randomId?: number,
    title?: string,
    scheduleDate?: number
  ): Promise<any> {
    try {
      let p: any = {}
      if (typeof paramsOrRtmp === 'object' && paramsOrRtmp !== null && !paramsOrRtmp._) {
        p = paramsOrRtmp
      } else {
        p = {
          rtmpStream: paramsOrRtmp,
          peerId,
          randomId,
          title,
          scheduleDate,
        }
      }
      const peer = p.peerId || p.peer_id || p.peer
      return await holder.client.call({
        _: 'phone.createGroupCall',
        rtmp_stream: !!(p.rtmpStream ?? p.rtmp_stream),
        peer: peer ? await this.resolveInputPeer(accountId, peer) : undefined,
        random_id: p.randomId ?? p.random_id ?? Math.floor(Math.random() * 0x7fffffff),
        title: p.title || '',
        schedule_date: p.scheduleDate ?? p.schedule_date,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.createGroupCall error:', err)
      throw err
    }
  }

  public async phone_joinGroupCall(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrMuted?: any,
    videoStopped?: boolean,
    call?: any,
    joinAsId?: string,
    inviteHash?: string,
    publicKey?: any,
    block?: any,
    params?: any
  ): Promise<any> {
    try {
      let p: any = {}
      if (typeof paramsOrMuted === 'object' && paramsOrMuted !== null && !paramsOrMuted._ && (paramsOrMuted.call !== undefined || paramsOrMuted.joinAs !== undefined || paramsOrMuted.join_as !== undefined)) {
        p = paramsOrMuted
      } else {
        p = {
          muted: paramsOrMuted,
          videoStopped,
          call,
          joinAs: joinAsId,
          inviteHash,
          publicKey,
          block,
          params,
        }
      }
      const joinAsPeer = p.joinAs ?? p.join_as
      const resolvedJoinAs = joinAsPeer
        ? await this.resolveInputPeer(accountId, joinAsPeer)
        : { _: 'inputPeerSelf' }

      let dataParams = p.params
      if (typeof dataParams === 'string') {
        dataParams = { _: 'dataJSON', data: dataParams }
      } else if (typeof dataParams === 'object' && dataParams !== null && !dataParams._) {
        dataParams = { _: 'dataJSON', data: JSON.stringify(dataParams) }
      } else if (!dataParams) {
        dataParams = { _: 'dataJSON', data: JSON.stringify({ transport: 'webrtc' }) }
      }

      return await holder.client.call({
        _: 'phone.joinGroupCall',
        muted: p.muted !== undefined ? !!p.muted : undefined,
        video_stopped: p.videoStopped !== undefined ? !!p.videoStopped : (p.video_stopped !== undefined ? !!p.video_stopped : undefined),
        call: this.toInputGroupCall(p.call),
        join_as: resolvedJoinAs,
        invite_hash: p.inviteHash ?? p.invite_hash,
        public_key: p.publicKey ?? p.public_key,
        block: p.block,
        params: dataParams,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.joinGroupCall error:', err)
      throw err
    }
  }

  public async phone_leaveGroupCall(holder: RpcClientHolder, callOrParams?: any, source?: number): Promise<any> {
    try {
      let p: any = {}
      if (typeof callOrParams === 'object' && callOrParams !== null && !callOrParams._ && callOrParams.call !== undefined) {
        p = callOrParams
      } else {
        p = {
          call: callOrParams,
          source,
        }
      }
      return await holder.client.call({
        _: 'phone.leaveGroupCall',
        call: this.toInputGroupCall(p.call),
        source: Number(p.source || 0),
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.leaveGroupCall error:', err)
      throw err
    }
  }

  public async phone_inviteToGroupCall(holder: RpcClientHolder, accountId: string, paramsOrCall?: any, users?: any): Promise<any> {
    try {
      let p: any = {}
      if (typeof paramsOrCall === 'object' && paramsOrCall !== null && !paramsOrCall._ && paramsOrCall.call !== undefined) {
        p = paramsOrCall
      } else {
        p = {
          call: paramsOrCall,
          users,
        }
      }
      let resolvedUsers: any[] = []
      const uList = p.users ?? p.userIds ?? p.user_ids
      if (Array.isArray(uList)) {
        resolvedUsers = await Promise.all(uList.map((u: any) => this.toInputUser(accountId, u)))
      } else if (uList !== undefined && uList !== null) {
        resolvedUsers = [await this.toInputUser(accountId, uList)]
      }
      return await holder.client.call({
        _: 'phone.inviteToGroupCall',
        call: this.toInputGroupCall(p.call),
        users: resolvedUsers,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.inviteToGroupCall error:', err)
      throw err
    }
  }

  public async phone_discardGroupCall(holder: RpcClientHolder, callOrParams?: any): Promise<any> {
    try {
      const call = (typeof callOrParams === 'object' && callOrParams !== null && !callOrParams._ && callOrParams.call !== undefined)
        ? callOrParams.call
        : callOrParams
      return await holder.client.call({
        _: 'phone.discardGroupCall',
        call: this.toInputGroupCall(call),
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.discardGroupCall error:', err)
      throw err
    }
  }


  public async phone_getGroupCall(holder: RpcClientHolder, callOrParams?: any, limit?: number): Promise<any> {
    try {
      let call = callOrParams
      let lim = limit ?? 100
      if (typeof callOrParams === 'object' && callOrParams !== null && !callOrParams._ && callOrParams.call !== undefined) {
        call = callOrParams.call
        lim = callOrParams.limit ?? 100
      }
      return await holder.client.call({
        _: 'phone.getGroupCall',
        call: this.toInputGroupCall(call),
        limit: Number(lim || 100),
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.getGroupCall error:', err)
      throw err
    }
  }

  public async phone_getGroupParticipants(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrCallbackOrCall?: any,
    ids?: any,
    sources?: any,
    offset?: string,
    limit?: number
  ): Promise<any> {
    try {
      let p: any = {}
      if (typeof paramsOrCallbackOrCall === 'object' && paramsOrCallbackOrCall !== null && !paramsOrCallbackOrCall._ && paramsOrCallbackOrCall.call !== undefined) {
        p = paramsOrCallbackOrCall
      } else {
        p = {
          call: paramsOrCallbackOrCall,
          ids,
          sources,
          offset,
          limit,
        }
      }
      let resolvedIds: any[] = []
      if (Array.isArray(p.ids)) {
        resolvedIds = await Promise.all(p.ids.map((id: any) => this.resolveInputPeer(accountId, id)))
      } else if (p.ids !== undefined && p.ids !== null && p.ids !== '') {
        resolvedIds = [await this.resolveInputPeer(accountId, p.ids)]
      }
      let resolvedSources: number[] = []
      if (Array.isArray(p.sources)) {
        resolvedSources = p.sources.map(Number)
      } else if (typeof p.sources === 'number') {
        resolvedSources = [p.sources]
      }
      return await holder.client.call({
        _: 'phone.getGroupParticipants',
        call: this.toInputGroupCall(p.call),
        ids: resolvedIds,
        sources: resolvedSources,
        offset: String(p.offset || ''),
        limit: Number(p.limit || 100),
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.getGroupParticipants error:', err)
      throw err
    }
  }

  public async phone_checkGroupCall(holder: RpcClientHolder, callOrParams?: any, sources?: any): Promise<any> {
    try {
      let call = callOrParams
      let src = sources
      if (typeof callOrParams === 'object' && callOrParams !== null && !callOrParams._ && callOrParams.call !== undefined) {
        call = callOrParams.call
        src = callOrParams.sources
      }
      let resolvedSources: number[] = []
      if (Array.isArray(src)) {
        resolvedSources = src.map(Number)
      } else if (typeof src === 'number') {
        resolvedSources = [src]
      }
      return await holder.client.call({
        _: 'phone.checkGroupCall',
        call: this.toInputGroupCall(call),
        sources: resolvedSources,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.checkGroupCall error:', err)
      throw err
    }
  }

  public async phone_toggleGroupCallRecord(
    holder: RpcClientHolder,
    paramsOrStart?: any,
    video?: boolean,
    call?: any,
    title?: string,
    videoPortrait?: boolean
  ): Promise<any> {
    try {
      let p: any = {}
      if (typeof paramsOrStart === 'object' && paramsOrStart !== null && !paramsOrStart._ && paramsOrStart.call !== undefined) {
        p = paramsOrStart
      } else {
        p = {
          start: paramsOrStart,
          video,
          call,
          title,
          videoPortrait,
        }
      }
      return await holder.client.call({
        _: 'phone.toggleGroupCallRecord',
        start: p.start !== undefined ? !!p.start : undefined,
        video: p.video !== undefined ? !!p.video : undefined,
        call: this.toInputGroupCall(p.call),
        title: p.title !== undefined ? String(p.title) : undefined,
        video_portrait: p.videoPortrait !== undefined || p.video_portrait !== undefined ? !!(p.videoPortrait ?? p.video_portrait) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.toggleGroupCallRecord error:', err)
      throw err
    }
  }

  public async phone_toggleGroupCallSettings(
    holder: RpcClientHolder,
    callOrParams?: any,
    resetInviteHash?: boolean,
    joinMuted?: boolean,
    messagesEnabled?: boolean,
    sendPaidMessagesStars?: bigint | number
  ): Promise<any> {
    try {
      let p: any = {}
      if (typeof callOrParams === 'object' && callOrParams !== null && !callOrParams._ && callOrParams.call !== undefined) {
        p = callOrParams
      } else {
        p = {
          call: callOrParams,
          resetInviteHash,
          joinMuted,
          messagesEnabled,
          sendPaidMessagesStars,
        }
      }
      const rawStars = p.sendPaidMessagesStars ?? p.send_paid_messages_stars
      return await holder.client.call({
        _: 'phone.toggleGroupCallSettings',
        reset_invite_hash: p.resetInviteHash !== undefined || p.reset_invite_hash !== undefined ? !!(p.resetInviteHash ?? p.reset_invite_hash) : undefined,
        call: this.toInputGroupCall(p.call),
        join_muted: p.joinMuted !== undefined || p.join_muted !== undefined ? !!(p.joinMuted ?? p.join_muted) : undefined,
        messages_enabled: p.messagesEnabled !== undefined || p.messages_enabled !== undefined ? !!(p.messagesEnabled ?? p.messages_enabled) : undefined,
        send_paid_messages_stars: rawStars !== undefined ? BigInt(rawStars) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.toggleGroupCallSettings error:', err)
      throw err
    }
  }

  public async phone_deleteGroupCallMessages(
    holder: RpcClientHolder,
    callOrParams?: any,
    messages?: any,
    reportSpam?: boolean
  ): Promise<any> {
    try {
      let call = callOrParams
      let msgs = messages
      let spam = reportSpam
      if (typeof callOrParams === 'object' && callOrParams !== null && !callOrParams._ && callOrParams.call !== undefined) {
        call = callOrParams.call
        msgs = callOrParams.messages
        spam = callOrParams.reportSpam ?? callOrParams.report_spam
      }
      let resolvedMsgs: number[] = []
      if (Array.isArray(msgs)) {
        resolvedMsgs = msgs.map(Number)
      } else if (msgs !== undefined) {
        resolvedMsgs = [Number(msgs)]
      }
      return await holder.client.call({
        _: 'phone.deleteGroupCallMessages',
        report_spam: !!spam,
        call: this.toInputGroupCall(call),
        messages: resolvedMsgs,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.deleteGroupCallMessages error:', err)
      throw err
    }
  }

  public async phone_deleteGroupCallParticipantMessages(
    holder: RpcClientHolder,
    accountId: string,
    callOrParams?: any,
    participantId?: any,
    reportSpam?: boolean
  ): Promise<any> {
    try {
      let call = callOrParams
      let part = participantId
      let spam = reportSpam
      if (typeof callOrParams === 'object' && callOrParams !== null && !callOrParams._ && (callOrParams.call !== undefined || callOrParams.participant !== undefined)) {
        call = callOrParams.call
        part = callOrParams.participant ?? callOrParams.participantId
        spam = callOrParams.reportSpam ?? callOrParams.report_spam
      }
      return await holder.client.call({
        _: 'phone.deleteGroupCallParticipantMessages',
        report_spam: !!spam,
        call: this.toInputGroupCall(call),
        participant: await this.resolveInputPeer(accountId, part),
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.deleteGroupCallParticipantMessages error:', err)
      throw err
    }
  }

  public async phone_editGroupCallParticipant(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrCall?: any,
    participantId?: any,
    muted?: boolean,
    volume?: number,
    raiseHand?: boolean,
    videoStopped?: boolean,
    videoPaused?: boolean,
    presentationPaused?: boolean
  ): Promise<any> {
    try {
      let p: any = {}
      if (typeof paramsOrCall === 'object' && paramsOrCall !== null && !paramsOrCall._ && (paramsOrCall.call !== undefined || paramsOrCall.participant !== undefined)) {
        p = paramsOrCall
      } else {
        p = {
          call: paramsOrCall,
          participant: participantId,
          muted,
          volume,
          raiseHand,
          videoStopped,
          videoPaused,
          presentationPaused,
        }
      }
      const part = p.participant ?? p.participantId ?? p.peer
      return await holder.client.call({
        _: 'phone.editGroupCallParticipant',
        call: this.toInputGroupCall(p.call),
        participant: await this.resolveInputPeer(accountId, part),
        muted: p.muted !== undefined ? !!p.muted : undefined,
        volume: p.volume !== undefined ? Number(p.volume) : undefined,
        raise_hand: p.raiseHand !== undefined ? !!p.raiseHand : (p.raise_hand !== undefined ? !!p.raise_hand : undefined),
        video_stopped: p.videoStopped !== undefined ? !!p.videoStopped : (p.video_stopped !== undefined ? !!p.video_stopped : undefined),
        video_paused: p.videoPaused !== undefined ? !!p.videoPaused : (p.video_paused !== undefined ? !!p.video_paused : undefined),
        presentation_paused: p.presentationPaused !== undefined ? !!p.presentationPaused : (p.presentation_paused !== undefined ? !!p.presentation_paused : undefined),
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.editGroupCallParticipant error:', err)
      throw err
    }
  }

  public async phone_editGroupCallTitle(holder: RpcClientHolder, callOrParams?: any, title?: string): Promise<any> {
    try {
      let call = callOrParams
      let t = title
      if (typeof callOrParams === 'object' && callOrParams !== null && !callOrParams._ && callOrParams.call !== undefined) {
        call = callOrParams.call
        t = callOrParams.title
      }
      return await holder.client.call({
        _: 'phone.editGroupCallTitle',
        call: this.toInputGroupCall(call),
        title: String(t || ''),
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.editGroupCallTitle error:', err)
      throw err
    }
  }

  public async phone_getGroupCallJoinAs(holder: RpcClientHolder, accountId: string, peerOrParams?: any): Promise<any> {
    try {
      const peerId = (typeof peerOrParams === 'object' && peerOrParams !== null && !peerOrParams._ && (peerOrParams.peer !== undefined || peerOrParams.peerId !== undefined))
        ? (peerOrParams.peer ?? peerOrParams.peerId)
        : peerOrParams
      return await holder.client.call({
        _: 'phone.getGroupCallJoinAs',
        peer: peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' },
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.getGroupCallJoinAs error:', err)
      throw err
    }
  }

  public async phone_getGroupCallChainBlocks(
    holder: RpcClientHolder,
    paramsOrCallbackOrCall?: any,
    subChainId?: number,
    offset?: number,
    limit?: number
  ): Promise<any> {
    try {
      let p: any = {}
      if (typeof paramsOrCallbackOrCall === 'object' && paramsOrCallbackOrCall !== null && !paramsOrCallbackOrCall._ && paramsOrCallbackOrCall.call !== undefined) {
        p = paramsOrCallbackOrCall
      } else {
        p = {
          call: paramsOrCallbackOrCall,
          subChainId,
          offset,
          limit,
        }
      }
      return await holder.client.call({
        _: 'phone.getGroupCallChainBlocks',
        call: this.toInputGroupCall(p.call),
        sub_chain_id: Number(p.subChainId ?? p.sub_chain_id ?? 0),
        offset: Number(p.offset || 0),
        limit: Number(p.limit || 100),
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.getGroupCallChainBlocks error:', err)
      throw err
    }
  }

  public async phone_getGroupCallStreamChannels(holder: RpcClientHolder, callOrParams?: any): Promise<any> {
    try {
      const call = (typeof callOrParams === 'object' && callOrParams !== null && !callOrParams._ && callOrParams.call !== undefined)
        ? callOrParams.call
        : callOrParams
      return await holder.client.call({
        _: 'phone.getGroupCallStreamChannels',
        call: this.toInputGroupCall(call),
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.getGroupCallStreamChannels error:', err)
      throw err
    }
  }

  public async phone_getGroupCallStreamRtmpUrl(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrPeer?: any,
    revoke?: boolean,
    liveStory?: boolean
  ): Promise<any> {
    try {
      let p: any = {}
      if (typeof paramsOrPeer === 'object' && paramsOrPeer !== null && !paramsOrPeer._ && (paramsOrPeer.peer !== undefined || paramsOrPeer.peerId !== undefined)) {
        p = paramsOrPeer
      } else {
        p = {
          peer: paramsOrPeer,
          revoke,
          liveStory,
        }
      }
      const peerId = p.peer ?? p.peerId
      return await holder.client.call({
        _: 'phone.getGroupCallStreamRtmpUrl',
        live_story: !!(p.liveStory ?? p.live_story),
        peer: await this.resolveInputPeer(accountId, peerId),
        revoke: !!p.revoke,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.getGroupCallStreamRtmpUrl error:', err)
      throw err
    }
  }

  public async phone_exportGroupCallInvite(holder: RpcClientHolder, paramsOrCanSelfUnmute?: any, call?: any): Promise<any> {
    try {
      let canSelfUnmute = false
      let c = call
      if (typeof paramsOrCanSelfUnmute === 'object' && paramsOrCanSelfUnmute !== null && !paramsOrCanSelfUnmute._ && paramsOrCanSelfUnmute.call !== undefined) {
        canSelfUnmute = !!(paramsOrCanSelfUnmute.canSelfUnmute ?? paramsOrCanSelfUnmute.can_self_unmute)
        c = paramsOrCanSelfUnmute.call
      } else {
        canSelfUnmute = !!paramsOrCanSelfUnmute
      }
      return await holder.client.call({
        _: 'phone.exportGroupCallInvite',
        can_self_unmute: canSelfUnmute,
        call: this.toInputGroupCall(c),
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.exportGroupCallInvite error:', err)
      throw err
    }
  }

  public async phone_toggleGroupCallStartSubscription(
    holder: RpcClientHolder,
    callOrParams?: any,
    subscribedParam?: boolean
  ): Promise<any> {
    try {
      let call = callOrParams
      let subscribed = subscribedParam
      if (typeof callOrParams === 'object' && callOrParams !== null && !callOrParams._ && callOrParams.call !== undefined) {
        call = callOrParams.call
        subscribed = callOrParams.subscribed ?? subscribed
      }
      return await holder.client.call({
        _: 'phone.toggleGroupCallStartSubscription',
        call: this.toInputGroupCall(call),
        subscribed: !!subscribed,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.toggleGroupCallStartSubscription error:', err)
      throw err
    }
  }

  public async phone_startScheduledGroupCall(holder: RpcClientHolder, callOrParams?: any): Promise<any> {
    try {
      const call = (typeof callOrParams === 'object' && callOrParams !== null && !callOrParams._ && callOrParams.call !== undefined)
        ? callOrParams.call
        : callOrParams
      return await holder.client.call({
        _: 'phone.startScheduledGroupCall',
        call: this.toInputGroupCall(call),
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.startScheduledGroupCall error:', err)
      throw err
    }
  }

  public async phone_saveDefaultGroupCallJoinAs(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrPeer?: any,
    joinAsId?: string
  ): Promise<any> {
    try {
      let peer = paramsOrPeer
      let joinAs = joinAsId
      if (typeof paramsOrPeer === 'object' && paramsOrPeer !== null && !paramsOrPeer._ && paramsOrPeer.peer !== undefined) {
        peer = paramsOrPeer.peer
        joinAs = paramsOrPeer.joinAs ?? paramsOrPeer.join_as
      }
      return await holder.client.call({
        _: 'phone.saveDefaultGroupCallJoinAs',
        peer: peer ? await this.resolveInputPeer(accountId, String(peer)) : { _: 'inputPeerSelf' },
        join_as: joinAs ? await this.resolveInputPeer(accountId, String(joinAs)) : { _: 'inputPeerSelf' },
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.saveDefaultGroupCallJoinAs error:', err)
      throw err
    }
  }

  public async phone_joinGroupCallPresentation(holder: RpcClientHolder, callOrParams?: any, params?: any): Promise<any> {
    try {
      let p: any = {}
      if (typeof callOrParams === 'object' && callOrParams !== null && !callOrParams._ && callOrParams.call !== undefined) {
        p = callOrParams
      } else {
        p = {
          call: callOrParams,
          params,
        }
      }
      let dataParams = p.params
      if (typeof dataParams === 'string') {
        dataParams = { _: 'dataJSON', data: dataParams }
      } else if (typeof dataParams === 'object' && dataParams !== null && !dataParams._) {
        dataParams = { _: 'dataJSON', data: JSON.stringify(dataParams) }
      } else if (!dataParams) {
        dataParams = { _: 'dataJSON', data: JSON.stringify({ transport: 'webrtc' }) }
      }
      return await holder.client.call({
        _: 'phone.joinGroupCallPresentation',
        call: this.toInputGroupCall(p.call),
        params: dataParams,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.joinGroupCallPresentation error:', err)
      throw err
    }
  }

  public async phone_leaveGroupCallPresentation(holder: RpcClientHolder, callOrParams?: any): Promise<any> {
    try {
      const call = (typeof callOrParams === 'object' && callOrParams !== null && !callOrParams._ && callOrParams.call !== undefined)
        ? callOrParams.call
        : callOrParams
      return await holder.client.call({
        _: 'phone.leaveGroupCallPresentation',
        call: this.toInputGroupCall(call),
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.leaveGroupCallPresentation error:', err)
      throw err
    }
  }

  public async phone_saveCallLog(holder: RpcClientHolder, peerOrParams?: any, file?: any): Promise<any> {
    try {
      let peer = peerOrParams
      let f = file
      if (typeof peerOrParams === 'object' && peerOrParams !== null && !peerOrParams._ && peerOrParams.peer !== undefined) {
        peer = peerOrParams.peer
        f = peerOrParams.file
      }
      let resolvedFile = f
      if (f && !f._) {
        resolvedFile = {
          _: 'inputFile',
          id: f.id !== undefined ? BigInt(f.id) : 0n,
          parts: Number(f.parts || 1),
          name: String(f.name || 'call_log.txt'),
          md5_checksum: String(f.md5Checksum || f.md5_checksum || ''),
        }
      }
      return await holder.client.call({
        _: 'phone.saveCallLog',
        peer: this.toInputPhoneCall(peer),
        file: resolvedFile,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.saveCallLog error:', err)
      throw err
    }
  }

  public async phone_createConferenceCall(
    holder: RpcClientHolder,
    paramsOrMuted?: any,
    videoStopped?: boolean,
    join?: boolean,
    randomId?: number,
    publicKey?: any,
    block?: any,
    params?: any
  ): Promise<any> {
    try {
      let p: any = {}
      if (typeof paramsOrMuted === 'object' && paramsOrMuted !== null && !paramsOrMuted._) {
        p = paramsOrMuted
      } else {
        p = {
          muted: paramsOrMuted,
          videoStopped,
          join,
          randomId,
          publicKey,
          block,
          params,
        }
      }
      return await holder.client.call({
        _: 'phone.createConferenceCall',
        muted: !!p.muted,
        video_stopped: !!p.videoStopped || !!p.video_stopped,
        join: !!p.join,
        random_id: p.randomId ?? p.random_id ?? Math.floor(Math.random() * 0x7fffffff),
        public_key: p.publicKey || p.public_key,
        block: p.block,
        params: p.params ? (typeof p.params === 'string' ? { _: 'dataJSON', data: p.params } : p.params) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.createConferenceCall error:', err)
      throw err
    }
  }

  public async phone_deleteConferenceCallParticipants(
    holder: RpcClientHolder,
    paramsOrOnlyLeft?: any,
    kick?: boolean,
    call?: any,
    ids?: any,
    block?: any
  ): Promise<any> {
    try {
      let p: any = {}
      if (typeof paramsOrOnlyLeft === 'object' && paramsOrOnlyLeft !== null && !paramsOrOnlyLeft._) {
        p = paramsOrOnlyLeft
      } else {
        p = {
          onlyLeft: paramsOrOnlyLeft,
          kick,
          call,
          ids,
          block,
        }
      }
      let resolvedIds: bigint[] = []
      if (Array.isArray(p.ids)) {
        resolvedIds = p.ids.map((id: any) => BigInt(id))
      } else if (p.ids !== undefined) {
        resolvedIds = [BigInt(p.ids)]
      }
      return await holder.client.call({
        _: 'phone.deleteConferenceCallParticipants',
        only_left: !!(p.onlyLeft ?? p.only_left),
        kick: !!p.kick,
        call: this.toInputGroupCall(p.call),
        ids: resolvedIds,
        block: p.block,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.deleteConferenceCallParticipants error:', err)
      throw err
    }
  }

  public async phone_sendConferenceCallBroadcast(holder: RpcClientHolder, callOrParams?: any, block?: any): Promise<any> {
    try {
      let call = callOrParams
      let blk = block
      if (typeof callOrParams === 'object' && callOrParams !== null && !callOrParams._ && callOrParams.call !== undefined) {
        call = callOrParams.call
        blk = callOrParams.block
      }
      let resolvedBlock = blk
      if (typeof blk === 'string') {
        resolvedBlock = Buffer.from(blk, 'hex')
      } else if (!blk) {
        resolvedBlock = new Uint8Array(0)
      }
      return await holder.client.call({
        _: 'phone.sendConferenceCallBroadcast',
        call: this.toInputGroupCall(call),
        block: resolvedBlock,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.sendConferenceCallBroadcast error:', err)
      throw err
    }
  }

  public async phone_inviteConferenceCallParticipant(
    holder: RpcClientHolder,
    accountId: string,
    paramsOrVideo?: any,
    call?: any,
    userIdId?: string
  ): Promise<any> {
    try {
      let p: any = {}
      if (typeof paramsOrVideo === 'object' && paramsOrVideo !== null && !paramsOrVideo._ && (paramsOrVideo.call !== undefined || paramsOrVideo.userId !== undefined || paramsOrVideo.user_id !== undefined)) {
        p = paramsOrVideo
      } else {
        p = {
          video: paramsOrVideo,
          call,
          userId: userIdId,
        }
      }
      const u = p.userId ?? p.user_id ?? p.user
      return await holder.client.call({
        _: 'phone.inviteConferenceCallParticipant',
        video: p.video !== undefined ? !!p.video : undefined,
        call: this.toInputGroupCall(p.call),
        user_id: await this.toInputUser(accountId, u),
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.inviteConferenceCallParticipant error:', err)
      throw err
    }
  }

  public async phone_declineConferenceCallInvite(holder: RpcClientHolder, msgIdOrParams?: any): Promise<any> {
    try {
      const msgId = (typeof msgIdOrParams === 'object' && msgIdOrParams !== null && msgIdOrParams.msgId !== undefined)
        ? msgIdOrParams.msgId
        : (typeof msgIdOrParams === 'object' && msgIdOrParams !== null && msgIdOrParams.msg_id !== undefined ? msgIdOrParams.msg_id : msgIdOrParams)
      return await holder.client.call({
        _: 'phone.declineConferenceCallInvite',
        msg_id: Number(msgId || 0),
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.declineConferenceCallInvite error:', err)
      throw err
    }
  }

  public async phone_sendGroupCallMessage(
    holder: RpcClientHolder,
    accountId: string,
    callOrParams?: any,
    randomId?: bigint | number | string,
    message?: any,
    allowPaidStars?: bigint | number | string,
    sendAsId?: string
  ): Promise<any> {
    try {
      let call = callOrParams
      let rid = randomId
      let msg = message
      let stars = allowPaidStars
      let sendAs = sendAsId

      if (typeof callOrParams === 'object' && callOrParams !== null && !callOrParams._ && callOrParams.call !== undefined) {
        call = callOrParams.call
        rid = callOrParams.randomId ?? callOrParams.random_id ?? rid
        msg = callOrParams.message ?? msg
        stars = callOrParams.allowPaidStars ?? callOrParams.allow_paid_stars ?? stars
        sendAs = callOrParams.sendAs ?? callOrParams.send_as ?? sendAs
      }

      const formattedRandomId = (rid !== undefined && rid !== null && rid !== 0 && rid !== '0')
        ? BigInt(rid)
        : BigInt(Math.floor(Math.random() * 1e15) + 1)

      let formattedMessage: any = msg
      if (typeof msg === 'string') {
        formattedMessage = {
          _: 'textWithEntities',
          text: msg,
          entities: [],
        }
      } else if (!msg || typeof msg !== 'object') {
        formattedMessage = {
          _: 'textWithEntities',
          text: '',
          entities: [],
        }
      }

      return await holder.client.call({
        _: 'phone.sendGroupCallMessage',
        call: this.toInputGroupCall(call),
        random_id: formattedRandomId,
        message: formattedMessage,
        allow_paid_stars: (stars !== undefined && stars !== null) ? BigInt(stars) : undefined,
        send_as: sendAs ? await this.resolveInputPeer(accountId, String(sendAs)) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.sendGroupCallMessage error:', err)
      throw err
    }
  }

  public async phone_sendGroupCallEncryptedMessage(
    holder: RpcClientHolder,
    callOrParams?: any,
    encryptedMessage?: any
  ): Promise<any> {
    try {
      let call = callOrParams
      let data = encryptedMessage
      if (typeof callOrParams === 'object' && callOrParams !== null && !callOrParams._ && callOrParams.call !== undefined) {
        call = callOrParams.call
        data = callOrParams.encryptedMessage ?? callOrParams.encrypted_message ?? data
      }

      let payload: Uint8Array
      if (data instanceof Uint8Array) {
        payload = data
      } else if (typeof data === 'string') {
        if (/^[0-9a-fA-F]+$/.test(data) && data.length % 2 === 0) {
          payload = Buffer.from(data, 'hex')
        } else {
          payload = Buffer.from(data, 'utf-8')
        }
      } else if (Array.isArray(data)) {
        payload = new Uint8Array(data)
      } else {
        payload = new Uint8Array(0)
      }

      return await holder.client.call({
        _: 'phone.sendGroupCallEncryptedMessage',
        call: this.toInputGroupCall(call),
        encrypted_message: payload,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.sendGroupCallEncryptedMessage error:', err)
      throw err
    }
  }



  public async phone_getGroupCallStars(holder: RpcClientHolder, callOrParams?: any): Promise<any> {
    try {
      const call = (typeof callOrParams === 'object' && callOrParams !== null && !callOrParams._ && callOrParams.call !== undefined)
        ? callOrParams.call
        : callOrParams
      return await holder.client.call({
        _: 'phone.getGroupCallStars',
        call: this.toInputGroupCall(call),
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.getGroupCallStars error:', err)
      throw err
    }
  }

  public async phone_saveDefaultSendAs(
    holder: RpcClientHolder,
    accountId: string,
    callOrParams?: any,
    sendAsId?: string
  ): Promise<any> {
    try {
      let call = callOrParams
      let sendAs = sendAsId
      if (typeof callOrParams === 'object' && callOrParams !== null && !callOrParams._ && callOrParams.call !== undefined) {
        call = callOrParams.call
        sendAs = callOrParams.sendAs ?? callOrParams.send_as
      }
      return await holder.client.call({
        _: 'phone.saveDefaultSendAs',
        call: this.toInputGroupCall(call),
        send_as: sendAs ? await this.resolveInputPeer(accountId, String(sendAs)) : { _: 'inputPeerSelf' },
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.saveDefaultSendAs error:', err)
      throw err
    }
  }

  public async langpack_getLangPack(holder: RpcClientHolder, langPackOrParams?: any, langCodeParam?: string): Promise<any> {
    try {
      let langPack = 'tdesktop'
      let langCode = 'fa'
      if (typeof langPackOrParams === 'object' && langPackOrParams !== null && !langPackOrParams._) {
        langPack = langPackOrParams.langPack ?? langPackOrParams.lang_pack ?? langPack
        langCode = langPackOrParams.langCode ?? langPackOrParams.lang_code ?? langCode
      } else {
        if (langPackOrParams) langPack = String(langPackOrParams)
        if (langCodeParam) langCode = String(langCodeParam)
      }
      return await holder.client.call({
        _: 'langpack.getLangPack',
        lang_pack: langPack,
        lang_code: langCode,
      })
    } catch (err) {
      Logger.warn('[SystemService] langpack.getLangPack error:', err)
      throw err
    }
  }

  public async langpack_getStrings(holder: RpcClientHolder, langPackOrParams?: any, langCodeParam?: string, keysParam?: string[] | string): Promise<any> {
    try {
      let langPack = 'tdesktop'
      let langCode = 'fa'
      let keys: string[] = []
      if (typeof langPackOrParams === 'object' && langPackOrParams !== null && !langPackOrParams._ && (langPackOrParams.keys !== undefined || langPackOrParams.langCode !== undefined || langPackOrParams.lang_code !== undefined)) {
        langPack = langPackOrParams.langPack ?? langPackOrParams.lang_pack ?? langPack
        langCode = langPackOrParams.langCode ?? langPackOrParams.lang_code ?? langCode
        const rawKeys = langPackOrParams.keys
        keys = Array.isArray(rawKeys) ? rawKeys.map(String) : (typeof rawKeys === 'string' ? [rawKeys] : [])
      } else {
        if (langPackOrParams) langPack = String(langPackOrParams)
        if (langCodeParam) langCode = String(langCodeParam)
        if (Array.isArray(keysParam)) keys = keysParam.map(String)
        else if (typeof keysParam === 'string') keys = [keysParam]
      }
      return await holder.client.call({
        _: 'langpack.getStrings',
        lang_pack: langPack,
        lang_code: langCode,
        keys: keys,
      })
    } catch (err) {
      Logger.warn('[SystemService] langpack.getStrings error:', err)
      throw err
    }
  }

  public async langpack_getDifference(holder: RpcClientHolder, langPackOrParams?: any, langCodeParam?: string, fromVersionParam?: number): Promise<any> {
    try {
      let langPack = 'tdesktop'
      let langCode = 'fa'
      let fromVersion = 0
      if (typeof langPackOrParams === 'object' && langPackOrParams !== null && !langPackOrParams._) {
        langPack = langPackOrParams.langPack ?? langPackOrParams.lang_pack ?? langPack
        langCode = langPackOrParams.langCode ?? langPackOrParams.lang_code ?? langCode
        fromVersion = Number(langPackOrParams.fromVersion ?? langPackOrParams.from_version ?? fromVersion)
      } else {
        if (langPackOrParams) langPack = String(langPackOrParams)
        if (langCodeParam) langCode = String(langCodeParam)
        if (fromVersionParam !== undefined) fromVersion = Number(fromVersionParam)
      }
      return await holder.client.call({
        _: 'langpack.getDifference',
        lang_pack: langPack,
        lang_code: langCode,
        from_version: fromVersion,
      })
    } catch (err) {
      Logger.warn('[SystemService] langpack.getDifference error:', err)
      throw err
    }
  }

  public async langpack_getLanguages(holder: RpcClientHolder, langPackOrParams?: any): Promise<any> {
    try {
      let langPack = 'tdesktop'
      if (typeof langPackOrParams === 'object' && langPackOrParams !== null && !langPackOrParams._ && (langPackOrParams.langPack !== undefined || langPackOrParams.lang_pack !== undefined)) {
        langPack = langPackOrParams.langPack ?? langPackOrParams.lang_pack ?? langPack
      } else if (typeof langPackOrParams === 'string' && langPackOrParams.trim()) {
        langPack = langPackOrParams.trim()
      }
      return await holder.client.call({
        _: 'langpack.getLanguages',
        lang_pack: langPack,
      })
    } catch (err) {
      Logger.warn('[SystemService] langpack.getLanguages error:', err)
      throw err
    }
  }

  public async langpack_getLanguage(holder: RpcClientHolder, langPackOrParams?: any, langCodeParam?: string): Promise<any> {
    try {
      let langPack = 'tdesktop'
      let langCode = 'fa'
      if (typeof langPackOrParams === 'object' && langPackOrParams !== null && !langPackOrParams._) {
        langPack = langPackOrParams.langPack ?? langPackOrParams.lang_pack ?? langPack
        langCode = langPackOrParams.langCode ?? langPackOrParams.lang_code ?? langCode
      } else {
        if (langPackOrParams) langPack = String(langPackOrParams)
        if (langCodeParam) langCode = String(langCodeParam)
      }
      return await holder.client.call({
        _: 'langpack.getLanguage',
        lang_pack: langPack,
        lang_code: langCode,
      })
    } catch (err) {
      Logger.warn('[SystemService] langpack.getLanguage error:', err)
      throw err
    }
  }

  public async folders_editPeerFolders(holder: RpcClientHolder, folderPeers?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'folders.editPeerFolders',
        'folder_peers': folderPeers,
      })
    } catch (err) {
      Logger.warn('[SystemService] folders.editPeerFolders error:', err)
      return null
    }
  }

  public async stats_getBroadcastStats(holder: RpcClientHolder, dark?: boolean, channel?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stats.getBroadcastStats',
        'dark': dark,
        'channel': channel,
      })
    } catch (err) {
      Logger.warn('[SystemService] stats.getBroadcastStats error:', err)
      return null
    }
  }

  public async stats_loadAsyncGraph(holder: RpcClientHolder, token?: string, x?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stats.loadAsyncGraph',
        'token': token,
        'x': x,
      })
    } catch (err) {
      Logger.warn('[SystemService] stats.loadAsyncGraph error:', err)
      return null
    }
  }

  public async stats_getMegagroupStats(holder: RpcClientHolder, dark?: boolean, channel?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stats.getMegagroupStats',
        'dark': dark,
        'channel': channel,
      })
    } catch (err) {
      Logger.warn('[SystemService] stats.getMegagroupStats error:', err)
      return null
    }
  }

  public async stats_getMessagePublicForwards(holder: RpcClientHolder, channel?: any, msgId?: number, offset?: string, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stats.getMessagePublicForwards',
        'channel': channel,
        'msg_id': msgId,
        'offset': offset,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[SystemService] stats.getMessagePublicForwards error:', err)
      return null
    }
  }

  public async stats_getMessageStats(holder: RpcClientHolder, dark?: boolean, channel?: any, msgId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stats.getMessageStats',
        'dark': dark,
        'channel': channel,
        'msg_id': msgId,
      })
    } catch (err) {
      Logger.warn('[SystemService] stats.getMessageStats error:', err)
      return null
    }
  }

  public async stats_getStoryStats(holder: RpcClientHolder, accountId: string, dark?: boolean, peerId?: string, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stats.getStoryStats',
        'dark': dark,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[SystemService] stats.getStoryStats error:', err)
      return null
    }
  }

  public async stats_getStoryPublicForwards(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number, offset?: string, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stats.getStoryPublicForwards',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
        'offset': offset,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[SystemService] stats.getStoryPublicForwards error:', err)
      return null
    }
  }

  public async stats_getPollStats(holder: RpcClientHolder, accountId: string, dark?: boolean, peerId?: string, msgId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stats.getPollStats',
        'dark': dark,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
      })
    } catch (err) {
      Logger.warn('[SystemService] stats.getPollStats error:', err)
      return null
    }
  }

  public async chatlists_exportChatlistInvite(holder: RpcClientHolder, accountId: string, chatlist?: any, title?: string, peersId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'chatlists.exportChatlistInvite',
        'chatlist': chatlist,
        'title': title,
        'peers': peersId ? await this.resolveInputPeer(accountId, peersId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] chatlists.exportChatlistInvite error:', err)
      return null
    }
  }

  public async chatlists_deleteExportedInvite(holder: RpcClientHolder, chatlist?: any, slug?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'chatlists.deleteExportedInvite',
        'chatlist': chatlist,
        'slug': slug,
      })
    } catch (err) {
      Logger.warn('[SystemService] chatlists.deleteExportedInvite error:', err)
      return null
    }
  }

  public async chatlists_editExportedInvite(holder: RpcClientHolder, accountId: string, chatlist?: any, slug?: string, title?: string, peersId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'chatlists.editExportedInvite',
        'chatlist': chatlist,
        'slug': slug,
        'title': title,
        'peers': peersId ? await this.resolveInputPeer(accountId, peersId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] chatlists.editExportedInvite error:', err)
      return null
    }
  }

  public async chatlists_getExportedInvites(holder: RpcClientHolder, chatlist?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'chatlists.getExportedInvites',
        'chatlist': chatlist,
      })
    } catch (err) {
      Logger.warn('[SystemService] chatlists.getExportedInvites error:', err)
      return null
    }
  }

  public async chatlists_checkChatlistInvite(holder: RpcClientHolder, slug?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'chatlists.checkChatlistInvite',
        'slug': slug,
      })
    } catch (err) {
      Logger.warn('[SystemService] chatlists.checkChatlistInvite error:', err)
      return null
    }
  }

  public async chatlists_joinChatlistInvite(holder: RpcClientHolder, accountId: string, slug?: string, peersId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'chatlists.joinChatlistInvite',
        'slug': slug,
        'peers': peersId ? await this.resolveInputPeer(accountId, peersId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] chatlists.joinChatlistInvite error:', err)
      return null
    }
  }

  public async chatlists_getChatlistUpdates(holder: RpcClientHolder, chatlist?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'chatlists.getChatlistUpdates',
        'chatlist': chatlist,
      })
    } catch (err) {
      Logger.warn('[SystemService] chatlists.getChatlistUpdates error:', err)
      return null
    }
  }

  public async chatlists_joinChatlistUpdates(holder: RpcClientHolder, accountId: string, chatlist?: any, peersId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'chatlists.joinChatlistUpdates',
        'chatlist': chatlist,
        'peers': peersId ? await this.resolveInputPeer(accountId, peersId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] chatlists.joinChatlistUpdates error:', err)
      return null
    }
  }

  public async chatlists_hideChatlistUpdates(holder: RpcClientHolder, chatlist?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'chatlists.hideChatlistUpdates',
        'chatlist': chatlist,
      })
    } catch (err) {
      Logger.warn('[SystemService] chatlists.hideChatlistUpdates error:', err)
      return null
    }
  }

  public async chatlists_getLeaveChatlistSuggestions(holder: RpcClientHolder, chatlist?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'chatlists.getLeaveChatlistSuggestions',
        'chatlist': chatlist,
      })
    } catch (err) {
      Logger.warn('[SystemService] chatlists.getLeaveChatlistSuggestions error:', err)
      return null
    }
  }

  public async chatlists_leaveChatlist(holder: RpcClientHolder, accountId: string, chatlist?: any, peersId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'chatlists.leaveChatlist',
        'chatlist': chatlist,
        'peers': peersId ? await this.resolveInputPeer(accountId, peersId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] chatlists.leaveChatlist error:', err)
      return null
    }
  }

  public async premium_getBoostsList(holder: RpcClientHolder, accountId: string, gifts?: boolean, peerId?: string, offset?: string, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'premium.getBoostsList',
        'gifts': gifts,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'offset': offset,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[SystemService] premium.getBoostsList error:', err)
      return null
    }
  }

  public async premium_getMyBoosts(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'premium.getMyBoosts',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] premium.getMyBoosts error:', err)
      return null
    }
  }

  public async premium_applyBoost(holder: RpcClientHolder, accountId: string, slots?: number, peerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'premium.applyBoost',
        'slots': slots,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] premium.applyBoost error:', err)
      return null
    }
  }

  public async premium_getBoostsStatus(holder: RpcClientHolder, accountId: string, peerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'premium.getBoostsStatus',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] premium.getBoostsStatus error:', err)
      return null
    }
  }

  public async premium_getUserBoosts(holder: RpcClientHolder, accountId: string, peerId?: string, userIdId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'premium.getUserBoosts',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] premium.getUserBoosts error:', err)
      return null
    }
  }

  public async smsjobs_isEligibleToJoin(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'smsjobs.isEligibleToJoin',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] smsjobs.isEligibleToJoin error:', err)
      return null
    }
  }

  public async smsjobs_join(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'smsjobs.join',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] smsjobs.join error:', err)
      return null
    }
  }

  public async smsjobs_leave(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'smsjobs.leave',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] smsjobs.leave error:', err)
      return null
    }
  }

  public async smsjobs_updateSettings(holder: RpcClientHolder, allowInternational?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'smsjobs.updateSettings',
        'allow_international': allowInternational,
      })
    } catch (err) {
      Logger.warn('[SystemService] smsjobs.updateSettings error:', err)
      return null
    }
  }

  public async smsjobs_getStatus(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'smsjobs.getStatus',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] smsjobs.getStatus error:', err)
      return null
    }
  }

  public async smsjobs_getSmsJob(holder: RpcClientHolder, jobId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'smsjobs.getSmsJob',
        'job_id': jobId,
      })
    } catch (err) {
      Logger.warn('[SystemService] smsjobs.getSmsJob error:', err)
      return null
    }
  }

  public async smsjobs_finishJob(holder: RpcClientHolder, jobId?: string, error?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'smsjobs.finishJob',
        'job_id': jobId,
        'error': error,
      })
    } catch (err) {
      Logger.warn('[SystemService] smsjobs.finishJob error:', err)
      return null
    }
  }

  public async fragment_getCollectibleInfo(holder: RpcClientHolder, collectible?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'fragment.getCollectibleInfo',
        'collectible': collectible,
      })
    } catch (err) {
      Logger.warn('[SystemService] fragment.getCollectibleInfo error:', err)
      return null
    }
  }

  public async aicompose_createTone(holder: RpcClientHolder, displayAuthor?: boolean, emojiId?: bigint | number, title?: string, prompt?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'aicompose.createTone',
        'display_author': displayAuthor,
        'emoji_id': emojiId,
        'title': title,
        'prompt': prompt,
      })
    } catch (err) {
      Logger.warn('[SystemService] aicompose.createTone error:', err)
      return null
    }
  }

  public async aicompose_updateTone(holder: RpcClientHolder, tone?: any, displayAuthor?: boolean, emojiId?: bigint | number, title?: string, prompt?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'aicompose.updateTone',
        'tone': tone,
        'display_author': displayAuthor,
        'emoji_id': emojiId,
        'title': title,
        'prompt': prompt,
      })
    } catch (err) {
      Logger.warn('[SystemService] aicompose.updateTone error:', err)
      return null
    }
  }

  public async aicompose_saveTone(holder: RpcClientHolder, tone?: any, unsave?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'aicompose.saveTone',
        'tone': tone,
        'unsave': unsave,
      })
    } catch (err) {
      Logger.warn('[SystemService] aicompose.saveTone error:', err)
      return null
    }
  }

  public async aicompose_deleteTone(holder: RpcClientHolder, tone?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'aicompose.deleteTone',
        'tone': tone,
      })
    } catch (err) {
      Logger.warn('[SystemService] aicompose.deleteTone error:', err)
      return null
    }
  }

  public async aicompose_getTone(holder: RpcClientHolder, tone?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'aicompose.getTone',
        'tone': tone,
      })
    } catch (err) {
      Logger.warn('[SystemService] aicompose.getTone error:', err)
      return null
    }
  }

  public async aicompose_getTones(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'aicompose.getTones',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[SystemService] aicompose.getTones error:', err)
      return null
    }
  }

  public async aicompose_getToneExample(holder: RpcClientHolder, tone?: any, num?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'aicompose.getToneExample',
        'tone': tone,
        'num': num,
      })
    } catch (err) {
      Logger.warn('[SystemService] aicompose.getToneExample error:', err)
      return null
    }
  }

  public async communities_create(holder: RpcClientHolder, accountId: string, hidden?: boolean, title?: string, about?: string, peerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'communities.create',
        'hidden': hidden,
        'title': title,
        'about': about,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] communities.create error:', err)
      return null
    }
  }

  public async communities_togglePeerLink(holder: RpcClientHolder, accountId: string, visible?: boolean, hidden?: boolean, deleted?: boolean, community?: any, peerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'communities.togglePeerLink',
        'visible': visible,
        'hidden': hidden,
        'deleted': deleted,
        'community': community,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] communities.togglePeerLink error:', err)
      return null
    }
  }

  public async communities_getJoinedCommunities(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'communities.getJoinedCommunities',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] communities.getJoinedCommunities error:', err)
      return null
    }
  }

  public async communities_toggleCommunityCollapsedInDialogs(holder: RpcClientHolder, collapsed?: boolean, community?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'communities.toggleCommunityCollapsedInDialogs',
        'collapsed': collapsed,
        'community': community,
      })
    } catch (err) {
      Logger.warn('[SystemService] communities.toggleCommunityCollapsedInDialogs error:', err)
      return null
    }
  }

  public async communities_getPeerLinkRequests(holder: RpcClientHolder, community?: any, offset?: string, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'communities.getPeerLinkRequests',
        'community': community,
        'offset': offset,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[SystemService] communities.getPeerLinkRequests error:', err)
      return null
    }
  }

  public async communities_togglePeerLinkRequestApproval(holder: RpcClientHolder, accountId: string, reject?: boolean, community?: any, peerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'communities.togglePeerLinkRequestApproval',
        'reject': reject,
        'community': community,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] communities.togglePeerLinkRequestApproval error:', err)
      return null
    }
  }

  public async communities_toggleAllPeerLinkRequestApproval(holder: RpcClientHolder, reject?: boolean, community?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'communities.toggleAllPeerLinkRequestApproval',
        'reject': reject,
        'community': community,
      })
    } catch (err) {
      Logger.warn('[SystemService] communities.toggleAllPeerLinkRequestApproval error:', err)
      return null
    }
  }

  public async communities_toggleParticipantBanned(holder: RpcClientHolder, accountId: string, unban?: boolean, community?: any, participantId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'communities.toggleParticipantBanned',
        'unban': unban,
        'community': community,
        'participant': participantId ? await this.resolveInputPeer(accountId, participantId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] communities.toggleParticipantBanned error:', err)
      return null
    }
  }

  public async communities_getParticipantJoinedChats(holder: RpcClientHolder, accountId: string, community?: any, participantId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'communities.getParticipantJoinedChats',
        'community': community,
        'participant': participantId ? await this.resolveInputPeer(accountId, participantId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] communities.getParticipantJoinedChats error:', err)
      return null
    }
  }

  public async ephemeral_sendMessage(holder: RpcClientHolder, accountId: string, invertMedia?: boolean, welcome?: boolean, anchor?: boolean, noforwards?: boolean, peerId?: string, receiverIdId?: string, queryId?: bigint | number, message?: string, entities?: any, media?: any, replyMarkup?: any, richMessage?: any, randomId?: bigint | number, replyTo?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'ephemeral.sendMessage',
        'invert_media': invertMedia,
        'welcome': welcome,
        'anchor': anchor,
        'noforwards': noforwards,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'receiver_id': receiverIdId ? await this.toInputUser(accountId, receiverIdId) : undefined,
        'query_id': queryId,
        'message': message,
        'entities': entities,
        'media': media,
        'reply_markup': replyMarkup,
        'rich_message': richMessage,
        'random_id': randomId,
        'reply_to': replyTo,
      })
    } catch (err) {
      Logger.warn('[SystemService] ephemeral.sendMessage error:', err)
      return null
    }
  }

  public async ephemeral_deleteMessage(holder: RpcClientHolder, accountId: string, peerId?: string, receiverIdId?: string, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'ephemeral.deleteMessage',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'receiver_id': receiverIdId ? await this.toInputUser(accountId, receiverIdId) : undefined,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[SystemService] ephemeral.deleteMessage error:', err)
      return null
    }
  }

  public async ephemeral_reportMessage(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number, option?: any, message?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'ephemeral.reportMessage',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
        'option': option,
        'message': message,
      })
    } catch (err) {
      Logger.warn('[SystemService] ephemeral.reportMessage error:', err)
      return null
    }
  }

  public async ephemeral_getCallbackAnswer(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number, data?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'ephemeral.getCallbackAnswer',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
        'data': data,
      })
    } catch (err) {
      Logger.warn('[SystemService] ephemeral.getCallbackAnswer error:', err)
      return null
    }
  }

  public async ephemeral_editMessage(holder: RpcClientHolder, accountId: string, invertMedia?: boolean, welcome?: boolean, peerId?: string, receiverIdId?: string, id?: number, message?: string, media?: any, entities?: any, replyMarkup?: any, richMessage?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'ephemeral.editMessage',
        'invert_media': invertMedia,
        'welcome': welcome,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'receiver_id': receiverIdId ? await this.toInputUser(accountId, receiverIdId) : undefined,
        'id': id,
        'message': message,
        'media': media,
        'entities': entities,
        'reply_markup': replyMarkup,
        'rich_message': richMessage,
      })
    } catch (err) {
      Logger.warn('[SystemService] ephemeral.editMessage error:', err)
      return null
    }
  }

  public async ephemeral_deleteWelcomeMessage(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'ephemeral.deleteWelcomeMessage',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[SystemService] ephemeral.deleteWelcomeMessage error:', err)
      return null
    }
  }

  public async ephemeral_deleteAllWelcomeMessages(holder: RpcClientHolder, accountId: string, peerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'ephemeral.deleteAllWelcomeMessages',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] ephemeral.deleteAllWelcomeMessages error:', err)
      return null
    }
  }

  public async ephemeral_getWelcomeMessages(holder: RpcClientHolder, accountId: string, peerId?: string, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'ephemeral.getWelcomeMessages',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[SystemService] ephemeral.getWelcomeMessages error:', err)
      return null
    }
  }

  public async toncenter_performApiRequest(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'toncenter.performApiRequest',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] toncenter.performApiRequest error:', err)
      return null
    }
  }

  public async toncenter_getStreamingUrl(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'toncenter.getStreamingUrl',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] toncenter.getStreamingUrl error:', err)
      return null
    }
  }

  public async wallet_getState(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.getState',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.getState error:', err)
      return null
    }
  }

  public async wallet_getUserAddresses(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.getUserAddresses',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.getUserAddresses error:', err)
      return null
    }
  }

  public async wallet_getTransactions(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.getTransactions',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.getTransactions error:', err)
      return null
    }
  }

  public async wallet_getTransactionsByIDs(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.getTransactionsByIDs',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.getTransactionsByIDs error:', err)
      return null
    }
  }

  public async wallet_getTransactionsByMsgHash(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.getTransactionsByMsgHash',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.getTransactionsByMsgHash error:', err)
      return null
    }
  }

  public async wallet_exportSecretPhrase(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.exportSecretPhrase',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.exportSecretPhrase error:', err)
      return null
    }
  }

  public async wallet_fetchEncryptedSecretPhrasePart(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.fetchEncryptedSecretPhrasePart',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.fetchEncryptedSecretPhrasePart error:', err)
      return null
    }
  }

  public async wallet_replaceWallet(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.replaceWallet',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.replaceWallet error:', err)
      return null
    }
  }

  public async wallet_disableBackup(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.disableBackup',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.disableBackup error:', err)
      return null
    }
  }

  public async wallet_getBackupHolderDcs(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.getBackupHolderDcs',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.getBackupHolderDcs error:', err)
      return null
    }
  }

  public async wallet_enableBackup(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.enableBackup',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.enableBackup error:', err)
      return null
    }
  }

  public async wallet_getProofChallenge(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.getProofChallenge',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.getProofChallenge error:', err)
      return null
    }
  }

  public async wallet_sendTransfer(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.sendTransfer',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.sendTransfer error:', err)
      return null
    }
  }

  public async wallet_getGaslessInfo(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.getGaslessInfo',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.getGaslessInfo error:', err)
      return null
    }
  }

  public async wallet_getExistingWaltBalance(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.getExistingWaltBalance',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.getExistingWaltBalance error:', err)
      return null
    }
  }

  public async wallet_getNfts(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.getNfts',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.getNfts error:', err)
      return null
    }
  }

  public async wallet_tonConnectCreateSession(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.tonConnectCreateSession',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.tonConnectCreateSession error:', err)
      return null
    }
  }

  public async wallet_tonConnectRegisterKey(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.tonConnectRegisterKey',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.tonConnectRegisterKey error:', err)
      return null
    }
  }

  public async wallet_tonConnectSubmitConnectResult(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.tonConnectSubmitConnectResult',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.tonConnectSubmitConnectResult error:', err)
      return null
    }
  }

  public async wallet_tonConnectGetPending(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.tonConnectGetPending',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.tonConnectGetPending error:', err)
      return null
    }
  }

  public async wallet_tonConnectClaimRequest(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.tonConnectClaimRequest',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.tonConnectClaimRequest error:', err)
      return null
    }
  }

  public async wallet_tonConnectSubmitResponse(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.tonConnectSubmitResponse',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.tonConnectSubmitResponse error:', err)
      return null
    }
  }

  public async wallet_tonConnectNextEventId(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.tonConnectNextEventId',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.tonConnectNextEventId error:', err)
      return null
    }
  }

  public async wallet_tonConnectCloseSession(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.tonConnectCloseSession',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.tonConnectCloseSession error:', err)
      return null
    }
  }

  public async wallet_tonConnectGetSessions(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.tonConnectGetSessions',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.tonConnectGetSessions error:', err)
      return null
    }
  }

  public async wallet_setCardStickers(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'wallet.setCardStickers',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] wallet.setCardStickers error:', err)
      return null
    }
  }
}
