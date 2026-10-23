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

  public async updates_getState(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'updates.getState',
        ...params,
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
        'pts': pts,
        'pts_limit': ptsLimit,
        'pts_total_limit': ptsTotalLimit,
        'date': date,
        'qts': qts,
        'qts_limit': qtsLimit,
      })
    } catch (err) {
      Logger.warn('[SystemService] updates.getDifference error:', err)
      return null
    }
  }

  public async updates_getChannelDifference(holder: RpcClientHolder, force?: boolean, channel?: any, filter?: any, pts?: number, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'updates.getChannelDifference',
        'force': force,
        'channel': channel,
        'filter': filter,
        'pts': pts,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[SystemService] updates.getChannelDifference error:', err)
      return null
    }
  }

  public async photos_updateProfilePhoto(holder: RpcClientHolder, accountId: string, fallback?: boolean, botId?: string, id?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'photos.updateProfilePhoto',
        'fallback': fallback,
        'bot': botId ? await this.toInputUser(accountId, botId) : undefined,
        'id': id,
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
        'fallback': fallback,
        'bot': botId ? await this.toInputUser(accountId, botId) : undefined,
        'file': file,
        'video': video,
        'video_start_ts': videoStartTs,
        'video_emoji_markup': videoEmojiMarkup,
      })
    } catch (err) {
      Logger.warn('[SystemService] photos.uploadProfilePhoto error:', err)
      return null
    }
  }

  public async photos_deletePhotos(holder: RpcClientHolder, id?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'photos.deletePhotos',
        'id': id,
      })
    } catch (err) {
      Logger.warn('[SystemService] photos.deletePhotos error:', err)
      return null
    }
  }

  public async photos_getUserPhotos(holder: RpcClientHolder, accountId: string, userIdId?: string, offset?: number, maxId?: bigint | number, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'photos.getUserPhotos',
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
        'offset': offset,
        'max_id': maxId,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[SystemService] photos.getUserPhotos error:', err)
      return null
    }
  }

  public async photos_uploadContactProfilePhoto(holder: RpcClientHolder, accountId: string, suggest?: boolean, save?: boolean, userIdId?: string, file?: any, video?: any, videoStartTs?: any, videoEmojiMarkup?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'photos.uploadContactProfilePhoto',
        'suggest': suggest,
        'save': save,
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
        'file': file,
        'video': video,
        'video_start_ts': videoStartTs,
        'video_emoji_markup': videoEmojiMarkup,
      })
    } catch (err) {
      Logger.warn('[SystemService] photos.uploadContactProfilePhoto error:', err)
      return null
    }
  }

  public async upload_saveFilePart(holder: RpcClientHolder, fileId?: bigint | number, filePart?: number, bytes?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'upload.saveFilePart',
        'file_id': fileId,
        'file_part': filePart,
        'bytes': bytes,
      })
    } catch (err) {
      Logger.warn('[SystemService] upload.saveFilePart error:', err)
      return null
    }
  }

  public async upload_getFile(holder: RpcClientHolder, precise?: boolean, cdnSupported?: boolean, location?: any, offset?: bigint | number, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'upload.getFile',
        'precise': precise,
        'cdn_supported': cdnSupported,
        'location': location,
        'offset': offset,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[SystemService] upload.getFile error:', err)
      return null
    }
  }

  public async upload_saveBigFilePart(holder: RpcClientHolder, fileId?: bigint | number, filePart?: number, fileTotalParts?: number, bytes?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'upload.saveBigFilePart',
        'file_id': fileId,
        'file_part': filePart,
        'file_total_parts': fileTotalParts,
        'bytes': bytes,
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
        'location': location,
        'offset': offset,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[SystemService] upload.getWebFile error:', err)
      return null
    }
  }

  public async upload_getCdnFile(holder: RpcClientHolder, fileToken?: any, offset?: bigint | number, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'upload.getCdnFile',
        'file_token': fileToken,
        'offset': offset,
        'limit': limit,
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
        'file_token': fileToken,
        'request_token': requestToken,
      })
    } catch (err) {
      Logger.warn('[SystemService] upload.reuploadCdnFile error:', err)
      return null
    }
  }

  public async upload_getCdnFileHashes(holder: RpcClientHolder, fileToken?: any, offset?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'upload.getCdnFileHashes',
        'file_token': fileToken,
        'offset': offset,
      })
    } catch (err) {
      Logger.warn('[SystemService] upload.getCdnFileHashes error:', err)
      return null
    }
  }

  public async upload_getFileHashes(holder: RpcClientHolder, location?: any, offset?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'upload.getFileHashes',
        'location': location,
        'offset': offset,
      })
    } catch (err) {
      Logger.warn('[SystemService] upload.getFileHashes error:', err)
      return null
    }
  }

  public async help_getConfig(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getConfig',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getConfig error:', err)
      return null
    }
  }

  public async help_getNearestDc(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getNearestDc',
        ...params,
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
        'source': source,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getAppUpdate error:', err)
      return null
    }
  }

  public async help_getInviteText(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getInviteText',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getInviteText error:', err)
      return null
    }
  }

  public async help_getSupport(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getSupport',
        ...params,
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
        'pending_updates_count': pendingUpdatesCount,
        'message': message,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.setBotUpdatesStatus error:', err)
      return null
    }
  }

  public async help_getCdnConfig(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getCdnConfig',
        ...params,
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
        'referer': referer,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getRecentMeUrls error:', err)
      return null
    }
  }

  public async help_getTermsOfServiceUpdate(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getTermsOfServiceUpdate',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getTermsOfServiceUpdate error:', err)
      return null
    }
  }

  public async help_acceptTermsOfService(holder: RpcClientHolder, id?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.acceptTermsOfService',
        'id': id,
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
        'path': path,
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
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getAppConfig error:', err)
      return null
    }
  }

  public async help_saveAppLog(holder: RpcClientHolder, events?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.saveAppLog',
        'events': events,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.saveAppLog error:', err)
      return null
    }
  }

  public async help_getPassportConfig(holder: RpcClientHolder, hash?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getPassportConfig',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getPassportConfig error:', err)
      return null
    }
  }

  public async help_getSupportName(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getSupportName',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getSupportName error:', err)
      return null
    }
  }

  public async help_getUserInfo(holder: RpcClientHolder, accountId: string, userIdId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getUserInfo',
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getUserInfo error:', err)
      return null
    }
  }

  public async help_editUserInfo(holder: RpcClientHolder, accountId: string, userIdId?: string, message?: string, entities?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.editUserInfo',
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
        'message': message,
        'entities': entities,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.editUserInfo error:', err)
      return null
    }
  }

  public async help_getPromoData(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getPromoData',
        ...params,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getPromoData error:', err)
      return null
    }
  }

  public async help_hidePromoData(holder: RpcClientHolder, accountId: string, peerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.hidePromoData',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.hidePromoData error:', err)
      return null
    }
  }

  public async help_dismissSuggestion(holder: RpcClientHolder, accountId: string, peerId?: string, suggestion?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.dismissSuggestion',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'suggestion': suggestion,
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
        'lang_code': langCode,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getCountriesList error:', err)
      return null
    }
  }

  public async help_getPremiumPromo(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'help.getPremiumPromo',
        ...params,
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
        'hash': hash,
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
        'hash': hash,
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
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[SystemService] help.getTimezonesList error:', err)
      return null
    }
  }

  public async stickers_createStickerSet(holder: RpcClientHolder, accountId: string, masks?: boolean, emojis?: boolean, textColor?: boolean, userIdId?: string, title?: string, shortName?: string, thumb?: any, stickers?: any, software?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stickers.createStickerSet',
        'masks': masks,
        'emojis': emojis,
        'text_color': textColor,
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
        'title': title,
        'short_name': shortName,
        'thumb': thumb,
        'stickers': stickers,
        'software': software,
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.createStickerSet error:', err)
      return null
    }
  }

  public async stickers_removeStickerFromSet(holder: RpcClientHolder, sticker?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stickers.removeStickerFromSet',
        'sticker': sticker,
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.removeStickerFromSet error:', err)
      return null
    }
  }

  public async stickers_changeStickerPosition(holder: RpcClientHolder, sticker?: any, position?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stickers.changeStickerPosition',
        'sticker': sticker,
        'position': position,
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.changeStickerPosition error:', err)
      return null
    }
  }

  public async stickers_addStickerToSet(holder: RpcClientHolder, stickerset?: any, sticker?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stickers.addStickerToSet',
        'stickerset': stickerset,
        'sticker': sticker,
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.addStickerToSet error:', err)
      return null
    }
  }

  public async stickers_setStickerSetThumb(holder: RpcClientHolder, stickerset?: any, thumb?: any, thumbDocumentId?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stickers.setStickerSetThumb',
        'stickerset': stickerset,
        'thumb': thumb,
        'thumb_document_id': thumbDocumentId,
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.setStickerSetThumb error:', err)
      return null
    }
  }

  public async stickers_checkShortName(holder: RpcClientHolder, shortName?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stickers.checkShortName',
        'short_name': shortName,
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.checkShortName error:', err)
      return null
    }
  }

  public async stickers_suggestShortName(holder: RpcClientHolder, title?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stickers.suggestShortName',
        'title': title,
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.suggestShortName error:', err)
      return null
    }
  }

  public async stickers_changeSticker(holder: RpcClientHolder, sticker?: any, emoji?: string, maskCoords?: any, keywords?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stickers.changeSticker',
        'sticker': sticker,
        'emoji': emoji,
        'mask_coords': maskCoords,
        'keywords': keywords,
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.changeSticker error:', err)
      return null
    }
  }

  public async stickers_renameStickerSet(holder: RpcClientHolder, stickerset?: any, title?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stickers.renameStickerSet',
        'stickerset': stickerset,
        'title': title,
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.renameStickerSet error:', err)
      return null
    }
  }

  public async stickers_deleteStickerSet(holder: RpcClientHolder, stickerset?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stickers.deleteStickerSet',
        'stickerset': stickerset,
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.deleteStickerSet error:', err)
      return null
    }
  }

  public async stickers_replaceSticker(holder: RpcClientHolder, sticker?: any, newSticker?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stickers.replaceSticker',
        'sticker': sticker,
        'new_sticker': newSticker,
      })
    } catch (err) {
      Logger.warn('[SystemService] stickers.replaceSticker error:', err)
      return null
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
      return null
    }
  }

  public async phone_requestCall(holder: RpcClientHolder, accountId: string, video?: boolean, userIdId?: string, randomId?: number, gAHash?: any, protocol?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.requestCall',
        'video': video,
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
        'random_id': randomId,
        'g_a_hash': gAHash,
        'protocol': protocol,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.requestCall error:', err)
      return null
    }
  }

  public async phone_acceptCall(holder: RpcClientHolder, peer?: any, gB?: any, protocol?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.acceptCall',
        'peer': peer,
        'g_b': gB,
        'protocol': protocol,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.acceptCall error:', err)
      return null
    }
  }

  public async phone_confirmCall(holder: RpcClientHolder, peer?: any, gA?: any, keyFingerprint?: bigint | number, protocol?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.confirmCall',
        'peer': peer,
        'g_a': gA,
        'key_fingerprint': keyFingerprint,
        'protocol': protocol,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.confirmCall error:', err)
      return null
    }
  }

  public async phone_receivedCall(holder: RpcClientHolder, peer?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.receivedCall',
        'peer': peer,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.receivedCall error:', err)
      return null
    }
  }

  public async phone_discardCall(holder: RpcClientHolder, video?: boolean, peer?: any, duration?: number, reason?: any, connectionId?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.discardCall',
        'video': video,
        'peer': peer,
        'duration': duration,
        'reason': reason,
        'connection_id': connectionId,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.discardCall error:', err)
      return null
    }
  }

  public async phone_setCallRating(holder: RpcClientHolder, userInitiative?: boolean, peer?: any, rating?: number, comment?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.setCallRating',
        'user_initiative': userInitiative,
        'peer': peer,
        'rating': rating,
        'comment': comment,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.setCallRating error:', err)
      return null
    }
  }

  public async phone_saveCallDebug(holder: RpcClientHolder, peer?: any, debug?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.saveCallDebug',
        'peer': peer,
        'debug': debug,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.saveCallDebug error:', err)
      return null
    }
  }

  public async phone_sendSignalingData(holder: RpcClientHolder, peer?: any, data?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.sendSignalingData',
        'peer': peer,
        'data': data,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.sendSignalingData error:', err)
      return null
    }
  }

  public async phone_createGroupCall(holder: RpcClientHolder, accountId: string, rtmpStream?: boolean, peerId?: string, randomId?: number, title?: string, scheduleDate?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.createGroupCall',
        'rtmp_stream': rtmpStream,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'random_id': randomId,
        'title': title,
        'schedule_date': scheduleDate,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.createGroupCall error:', err)
      return null
    }
  }

  public async phone_joinGroupCall(holder: RpcClientHolder, accountId: string, muted?: boolean, videoStopped?: boolean, call?: any, joinAsId?: string, inviteHash?: string, publicKey?: any, block?: any, params?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.joinGroupCall',
        'muted': muted,
        'video_stopped': videoStopped,
        'call': call,
        'join_as': joinAsId ? await this.resolveInputPeer(accountId, joinAsId) : undefined,
        'invite_hash': inviteHash,
        'public_key': publicKey,
        'block': block,
        'params': params,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.joinGroupCall error:', err)
      return null
    }
  }

  public async phone_leaveGroupCall(holder: RpcClientHolder, call?: any, source?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.leaveGroupCall',
        'call': call,
        'source': source,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.leaveGroupCall error:', err)
      return null
    }
  }

  public async phone_inviteToGroupCall(holder: RpcClientHolder, accountId: string, call?: any, usersId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.inviteToGroupCall',
        'call': call,
        'users': usersId ? await this.toInputUser(accountId, usersId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.inviteToGroupCall error:', err)
      return null
    }
  }

  public async phone_discardGroupCall(holder: RpcClientHolder, call?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.discardGroupCall',
        'call': call,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.discardGroupCall error:', err)
      return null
    }
  }

  public async phone_toggleGroupCallSettings(holder: RpcClientHolder, resetInviteHash?: boolean, call?: any, joinMuted?: boolean, messagesEnabled?: boolean, sendPaidMessagesStars?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.toggleGroupCallSettings',
        'reset_invite_hash': resetInviteHash,
        'call': call,
        'join_muted': joinMuted,
        'messages_enabled': messagesEnabled,
        'send_paid_messages_stars': sendPaidMessagesStars,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.toggleGroupCallSettings error:', err)
      return null
    }
  }

  public async phone_getGroupCall(holder: RpcClientHolder, call?: any, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.getGroupCall',
        'call': call,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.getGroupCall error:', err)
      return null
    }
  }

  public async phone_getGroupParticipants(holder: RpcClientHolder, accountId: string, call?: any, idsId?: string, sources?: number, offset?: string, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.getGroupParticipants',
        'call': call,
        'ids': idsId ? await this.resolveInputPeer(accountId, idsId) : undefined,
        'sources': sources,
        'offset': offset,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.getGroupParticipants error:', err)
      return null
    }
  }

  public async phone_checkGroupCall(holder: RpcClientHolder, call?: any, sources?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.checkGroupCall',
        'call': call,
        'sources': sources,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.checkGroupCall error:', err)
      return null
    }
  }

  public async phone_toggleGroupCallRecord(holder: RpcClientHolder, start?: boolean, video?: boolean, call?: any, title?: string, videoPortrait?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.toggleGroupCallRecord',
        'start': start,
        'video': video,
        'call': call,
        'title': title,
        'video_portrait': videoPortrait,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.toggleGroupCallRecord error:', err)
      return null
    }
  }

  public async phone_editGroupCallParticipant(holder: RpcClientHolder, accountId: string, call?: any, participantId?: string, muted?: boolean, volume?: number, raiseHand?: boolean, videoStopped?: boolean, videoPaused?: boolean, presentationPaused?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.editGroupCallParticipant',
        'call': call,
        'participant': participantId ? await this.resolveInputPeer(accountId, participantId) : undefined,
        'muted': muted,
        'volume': volume,
        'raise_hand': raiseHand,
        'video_stopped': videoStopped,
        'video_paused': videoPaused,
        'presentation_paused': presentationPaused,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.editGroupCallParticipant error:', err)
      return null
    }
  }

  public async phone_editGroupCallTitle(holder: RpcClientHolder, call?: any, title?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.editGroupCallTitle',
        'call': call,
        'title': title,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.editGroupCallTitle error:', err)
      return null
    }
  }

  public async phone_getGroupCallJoinAs(holder: RpcClientHolder, accountId: string, peerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.getGroupCallJoinAs',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.getGroupCallJoinAs error:', err)
      return null
    }
  }

  public async phone_exportGroupCallInvite(holder: RpcClientHolder, canSelfUnmute?: boolean, call?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.exportGroupCallInvite',
        'can_self_unmute': canSelfUnmute,
        'call': call,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.exportGroupCallInvite error:', err)
      return null
    }
  }

  public async phone_toggleGroupCallStartSubscription(holder: RpcClientHolder, call?: any, subscribed?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.toggleGroupCallStartSubscription',
        'call': call,
        'subscribed': subscribed,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.toggleGroupCallStartSubscription error:', err)
      return null
    }
  }

  public async phone_startScheduledGroupCall(holder: RpcClientHolder, call?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.startScheduledGroupCall',
        'call': call,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.startScheduledGroupCall error:', err)
      return null
    }
  }

  public async phone_saveDefaultGroupCallJoinAs(holder: RpcClientHolder, accountId: string, peerId?: string, joinAsId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.saveDefaultGroupCallJoinAs',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'join_as': joinAsId ? await this.resolveInputPeer(accountId, joinAsId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.saveDefaultGroupCallJoinAs error:', err)
      return null
    }
  }

  public async phone_joinGroupCallPresentation(holder: RpcClientHolder, call?: any, params?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.joinGroupCallPresentation',
        'call': call,
        'params': params,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.joinGroupCallPresentation error:', err)
      return null
    }
  }

  public async phone_leaveGroupCallPresentation(holder: RpcClientHolder, call?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.leaveGroupCallPresentation',
        'call': call,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.leaveGroupCallPresentation error:', err)
      return null
    }
  }

  public async phone_getGroupCallStreamChannels(holder: RpcClientHolder, call?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.getGroupCallStreamChannels',
        'call': call,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.getGroupCallStreamChannels error:', err)
      return null
    }
  }

  public async phone_getGroupCallStreamRtmpUrl(holder: RpcClientHolder, accountId: string, liveStory?: boolean, peerId?: string, revoke?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.getGroupCallStreamRtmpUrl',
        'live_story': liveStory,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'revoke': revoke,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.getGroupCallStreamRtmpUrl error:', err)
      return null
    }
  }

  public async phone_saveCallLog(holder: RpcClientHolder, peer?: any, file?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.saveCallLog',
        'peer': peer,
        'file': file,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.saveCallLog error:', err)
      return null
    }
  }

  public async phone_createConferenceCall(holder: RpcClientHolder, muted?: boolean, videoStopped?: boolean, join?: boolean, randomId?: number, publicKey?: any, block?: any, params?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.createConferenceCall',
        'muted': muted,
        'video_stopped': videoStopped,
        'join': join,
        'random_id': randomId,
        'public_key': publicKey,
        'block': block,
        'params': params,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.createConferenceCall error:', err)
      return null
    }
  }

  public async phone_deleteConferenceCallParticipants(holder: RpcClientHolder, onlyLeft?: boolean, kick?: boolean, call?: any, ids?: bigint | number, block?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.deleteConferenceCallParticipants',
        'only_left': onlyLeft,
        'kick': kick,
        'call': call,
        'ids': ids,
        'block': block,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.deleteConferenceCallParticipants error:', err)
      return null
    }
  }

  public async phone_sendConferenceCallBroadcast(holder: RpcClientHolder, call?: any, block?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.sendConferenceCallBroadcast',
        'call': call,
        'block': block,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.sendConferenceCallBroadcast error:', err)
      return null
    }
  }

  public async phone_inviteConferenceCallParticipant(holder: RpcClientHolder, accountId: string, video?: boolean, call?: any, userIdId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.inviteConferenceCallParticipant',
        'video': video,
        'call': call,
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.inviteConferenceCallParticipant error:', err)
      return null
    }
  }

  public async phone_declineConferenceCallInvite(holder: RpcClientHolder, msgId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.declineConferenceCallInvite',
        'msg_id': msgId,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.declineConferenceCallInvite error:', err)
      return null
    }
  }

  public async phone_getGroupCallChainBlocks(holder: RpcClientHolder, call?: any, subChainId?: number, offset?: number, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.getGroupCallChainBlocks',
        'call': call,
        'sub_chain_id': subChainId,
        'offset': offset,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.getGroupCallChainBlocks error:', err)
      return null
    }
  }

  public async phone_sendGroupCallMessage(holder: RpcClientHolder, accountId: string, call?: any, randomId?: bigint | number, message?: any, allowPaidStars?: bigint | number, sendAsId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.sendGroupCallMessage',
        'call': call,
        'random_id': randomId,
        'message': message,
        'allow_paid_stars': allowPaidStars,
        'send_as': sendAsId ? await this.resolveInputPeer(accountId, sendAsId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.sendGroupCallMessage error:', err)
      return null
    }
  }

  public async phone_sendGroupCallEncryptedMessage(holder: RpcClientHolder, call?: any, encryptedMessage?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.sendGroupCallEncryptedMessage',
        'call': call,
        'encrypted_message': encryptedMessage,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.sendGroupCallEncryptedMessage error:', err)
      return null
    }
  }

  public async phone_deleteGroupCallMessages(holder: RpcClientHolder, reportSpam?: boolean, call?: any, messages?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.deleteGroupCallMessages',
        'report_spam': reportSpam,
        'call': call,
        'messages': messages,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.deleteGroupCallMessages error:', err)
      return null
    }
  }

  public async phone_deleteGroupCallParticipantMessages(holder: RpcClientHolder, accountId: string, reportSpam?: boolean, call?: any, participantId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.deleteGroupCallParticipantMessages',
        'report_spam': reportSpam,
        'call': call,
        'participant': participantId ? await this.resolveInputPeer(accountId, participantId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.deleteGroupCallParticipantMessages error:', err)
      return null
    }
  }

  public async phone_getGroupCallStars(holder: RpcClientHolder, call?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.getGroupCallStars',
        'call': call,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.getGroupCallStars error:', err)
      return null
    }
  }

  public async phone_saveDefaultSendAs(holder: RpcClientHolder, accountId: string, call?: any, sendAsId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'phone.saveDefaultSendAs',
        'call': call,
        'send_as': sendAsId ? await this.resolveInputPeer(accountId, sendAsId) : undefined,
      })
    } catch (err) {
      Logger.warn('[SystemService] phone.saveDefaultSendAs error:', err)
      return null
    }
  }

  public async langpack_getLangPack(holder: RpcClientHolder, langPack?: string, langCode?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'langpack.getLangPack',
        'lang_pack': langPack,
        'lang_code': langCode,
      })
    } catch (err) {
      Logger.warn('[SystemService] langpack.getLangPack error:', err)
      return null
    }
  }

  public async langpack_getStrings(holder: RpcClientHolder, langPack?: string, langCode?: string, keys?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'langpack.getStrings',
        'lang_pack': langPack,
        'lang_code': langCode,
        'keys': keys,
      })
    } catch (err) {
      Logger.warn('[SystemService] langpack.getStrings error:', err)
      return null
    }
  }

  public async langpack_getDifference(holder: RpcClientHolder, langPack?: string, langCode?: string, fromVersion?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'langpack.getDifference',
        'lang_pack': langPack,
        'lang_code': langCode,
        'from_version': fromVersion,
      })
    } catch (err) {
      Logger.warn('[SystemService] langpack.getDifference error:', err)
      return null
    }
  }

  public async langpack_getLanguages(holder: RpcClientHolder, langPack?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'langpack.getLanguages',
        'lang_pack': langPack,
      })
    } catch (err) {
      Logger.warn('[SystemService] langpack.getLanguages error:', err)
      return null
    }
  }

  public async langpack_getLanguage(holder: RpcClientHolder, langPack?: string, langCode?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'langpack.getLanguage',
        'lang_pack': langPack,
        'lang_code': langCode,
      })
    } catch (err) {
      Logger.warn('[SystemService] langpack.getLanguage error:', err)
      return null
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
