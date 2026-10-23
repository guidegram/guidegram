import { Logger } from '../logger'

export interface RpcClientHolder {
  client: {
    call: (query: { _: string; [key: string]: any }) => Promise<any>
    resolvePeer?: (peer: string) => Promise<any>
  }
}

/**
 * Enterprise Core Messaging, Stories & Media Domain Service for Guidegram
 * Comprehensive implementation of all 294 MTProto methods across messages.* (261) and stories.* (33)
 * Layer 229+ with typed parameters, InputPeer/InputUser resolution, and error handling.
 */
export class MessagingService {
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

  // ==================== MESSAGES METHODS (261) ====================

  public async getMessages(holder: RpcClientHolder, id?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getMessages',
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getMessages error:', err)
      return null
    }
  }

  public async getDialogs(holder: RpcClientHolder, accountId: string, excludePinned?: boolean, folderId?: number, offsetDate?: number, offsetId?: number, offsetPeerId?: string, limit?: number, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getDialogs',
        'exclude_pinned': excludePinned,
        'folder_id': folderId,
        'offset_date': offsetDate,
        'offset_id': offsetId,
        'offset_peer': offsetPeerId ? await this.resolveInputPeer(accountId, offsetPeerId) : undefined,
        'limit': limit,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getDialogs error:', err)
      return null
    }
  }

  public async getHistory(holder: RpcClientHolder, accountId: string, peerId?: string, offsetId?: number, offsetDate?: number, addOffset?: number, limit?: number, maxId?: number, minId?: number, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getHistory',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'offset_id': offsetId,
        'offset_date': offsetDate,
        'add_offset': addOffset,
        'limit': limit,
        'max_id': maxId,
        'min_id': minId,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getHistory error:', err)
      return null
    }
  }

  public async search(holder: RpcClientHolder, accountId: string, peerId?: string, q?: string, fromIdId?: string, savedPeerIdId?: string, savedReaction?: any, topMsgId?: number, filter?: any, minDate?: number, maxDate?: number, offsetId?: number, addOffset?: number, limit?: number, maxId?: number, minId?: number, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.search',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'q': q,
        'from_id': fromIdId ? await this.resolveInputPeer(accountId, fromIdId) : undefined,
        'saved_peer_id': savedPeerIdId ? await this.resolveInputPeer(accountId, savedPeerIdId) : undefined,
        'saved_reaction': savedReaction,
        'top_msg_id': topMsgId,
        'filter': filter,
        'min_date': minDate,
        'max_date': maxDate,
        'offset_id': offsetId,
        'add_offset': addOffset,
        'limit': limit,
        'max_id': maxId,
        'min_id': minId,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.search error:', err)
      return null
    }
  }

  public async readHistory(holder: RpcClientHolder, accountId: string, peerId?: string, maxId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.readHistory',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'max_id': maxId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.readHistory error:', err)
      return null
    }
  }

  public async deleteHistory(holder: RpcClientHolder, accountId: string, justClear?: boolean, revoke?: boolean, peerId?: string, maxId?: number, minDate?: number, maxDate?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.deleteHistory',
        'just_clear': justClear,
        'revoke': revoke,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'max_id': maxId,
        'min_date': minDate,
        'max_date': maxDate,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.deleteHistory error:', err)
      return null
    }
  }

  public async deleteMessages(holder: RpcClientHolder, revoke?: boolean, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.deleteMessages',
        'revoke': revoke,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.deleteMessages error:', err)
      return null
    }
  }

  public async receivedMessages(holder: RpcClientHolder, maxId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.receivedMessages',
        'max_id': maxId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.receivedMessages error:', err)
      return null
    }
  }

  public async setTyping(holder: RpcClientHolder, accountId: string, peerId?: string, topMsgId?: number, action?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.setTyping',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'top_msg_id': topMsgId,
        'action': action,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.setTyping error:', err)
      return null
    }
  }

  public async sendMessage(holder: RpcClientHolder, accountId: string, noWebpage?: boolean, silent?: boolean, background?: boolean, clearDraft?: boolean, noforwards?: boolean, updateStickersetsOrder?: boolean, invertMedia?: boolean, allowPaidFloodskip?: boolean, peerId?: string, replyTo?: any, message?: string, randomId?: bigint | number, replyMarkup?: any, entities?: any, scheduleDate?: number, scheduleRepeatPeriod?: number, sendAsId?: string, quickReplyShortcut?: any, effect?: bigint | number, allowPaidStars?: bigint | number, suggestedPost?: any, richMessage?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.sendMessage',
        'no_webpage': noWebpage,
        'silent': silent,
        'background': background,
        'clear_draft': clearDraft,
        'noforwards': noforwards,
        'update_stickersets_order': updateStickersetsOrder,
        'invert_media': invertMedia,
        'allow_paid_floodskip': allowPaidFloodskip,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'reply_to': replyTo,
        'message': message,
        'random_id': randomId,
        'reply_markup': replyMarkup,
        'entities': entities,
        'schedule_date': scheduleDate,
        'schedule_repeat_period': scheduleRepeatPeriod,
        'send_as': sendAsId ? await this.resolveInputPeer(accountId, sendAsId) : undefined,
        'quick_reply_shortcut': quickReplyShortcut,
        'effect': effect,
        'allow_paid_stars': allowPaidStars,
        'suggested_post': suggestedPost,
        'rich_message': richMessage,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.sendMessage error:', err)
      return null
    }
  }

  public async sendMedia(holder: RpcClientHolder, accountId: string, silent?: boolean, background?: boolean, clearDraft?: boolean, noforwards?: boolean, updateStickersetsOrder?: boolean, invertMedia?: boolean, allowPaidFloodskip?: boolean, peerId?: string, replyTo?: any, media?: any, message?: string, randomId?: bigint | number, replyMarkup?: any, entities?: any, scheduleDate?: number, scheduleRepeatPeriod?: number, sendAsId?: string, quickReplyShortcut?: any, effect?: bigint | number, allowPaidStars?: bigint | number, suggestedPost?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.sendMedia',
        'silent': silent,
        'background': background,
        'clear_draft': clearDraft,
        'noforwards': noforwards,
        'update_stickersets_order': updateStickersetsOrder,
        'invert_media': invertMedia,
        'allow_paid_floodskip': allowPaidFloodskip,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'reply_to': replyTo,
        'media': media,
        'message': message,
        'random_id': randomId,
        'reply_markup': replyMarkup,
        'entities': entities,
        'schedule_date': scheduleDate,
        'schedule_repeat_period': scheduleRepeatPeriod,
        'send_as': sendAsId ? await this.resolveInputPeer(accountId, sendAsId) : undefined,
        'quick_reply_shortcut': quickReplyShortcut,
        'effect': effect,
        'allow_paid_stars': allowPaidStars,
        'suggested_post': suggestedPost,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.sendMedia error:', err)
      return null
    }
  }

  public async forwardMessages(holder: RpcClientHolder, accountId: string, silent?: boolean, background?: boolean, withMyScore?: boolean, dropAuthor?: boolean, dropMediaCaptions?: boolean, noforwards?: boolean, allowPaidFloodskip?: boolean, fromEphemeral?: boolean, fromPeerId?: string, id?: number, randomId?: bigint | number, toPeerId?: string, topMsgId?: number, replyTo?: any, scheduleDate?: number, scheduleRepeatPeriod?: number, sendAsId?: string, quickReplyShortcut?: any, effect?: bigint | number, videoTimestamp?: number, allowPaidStars?: bigint | number, suggestedPost?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.forwardMessages',
        'silent': silent,
        'background': background,
        'with_my_score': withMyScore,
        'drop_author': dropAuthor,
        'drop_media_captions': dropMediaCaptions,
        'noforwards': noforwards,
        'allow_paid_floodskip': allowPaidFloodskip,
        'from_ephemeral': fromEphemeral,
        'from_peer': fromPeerId ? await this.resolveInputPeer(accountId, fromPeerId) : undefined,
        'id': id,
        'random_id': randomId,
        'to_peer': toPeerId ? await this.resolveInputPeer(accountId, toPeerId) : undefined,
        'top_msg_id': topMsgId,
        'reply_to': replyTo,
        'schedule_date': scheduleDate,
        'schedule_repeat_period': scheduleRepeatPeriod,
        'send_as': sendAsId ? await this.resolveInputPeer(accountId, sendAsId) : undefined,
        'quick_reply_shortcut': quickReplyShortcut,
        'effect': effect,
        'video_timestamp': videoTimestamp,
        'allow_paid_stars': allowPaidStars,
        'suggested_post': suggestedPost,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.forwardMessages error:', err)
      return null
    }
  }

  public async reportSpam(holder: RpcClientHolder, accountId: string, peerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.reportSpam',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.reportSpam error:', err)
      return null
    }
  }

  public async getPeerSettings(holder: RpcClientHolder, accountId: string, peerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getPeerSettings',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getPeerSettings error:', err)
      return null
    }
  }

  public async report(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number, option?: any, message?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.report',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
        'option': option,
        'message': message,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.report error:', err)
      return null
    }
  }

  public async getChats(holder: RpcClientHolder, id?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getChats',
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getChats error:', err)
      return null
    }
  }

  public async getFullChat(holder: RpcClientHolder, chatId?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getFullChat',
        'chat_id': chatId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getFullChat error:', err)
      return null
    }
  }

  public async editChatTitle(holder: RpcClientHolder, chatId?: bigint | number, title?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.editChatTitle',
        'chat_id': chatId,
        'title': title,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.editChatTitle error:', err)
      return null
    }
  }

  public async editChatPhoto(holder: RpcClientHolder, chatId?: bigint | number, photo?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.editChatPhoto',
        'chat_id': chatId,
        'photo': photo,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.editChatPhoto error:', err)
      return null
    }
  }

  public async addChatUser(holder: RpcClientHolder, accountId: string, chatId?: bigint | number, userIdId?: string, fwdLimit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.addChatUser',
        'chat_id': chatId,
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
        'fwd_limit': fwdLimit,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.addChatUser error:', err)
      return null
    }
  }

  public async deleteChatUser(holder: RpcClientHolder, accountId: string, revokeHistory?: boolean, chatId?: bigint | number, userIdId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.deleteChatUser',
        'revoke_history': revokeHistory,
        'chat_id': chatId,
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.deleteChatUser error:', err)
      return null
    }
  }

  public async createChat(holder: RpcClientHolder, accountId: string, usersId?: string, title?: string, ttlPeriod?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.createChat',
        'users': usersId ? await this.toInputUser(accountId, usersId) : undefined,
        'title': title,
        'ttl_period': ttlPeriod,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.createChat error:', err)
      return null
    }
  }

  public async getDhConfig(holder: RpcClientHolder, version?: number, randomLength?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getDhConfig',
        'version': version,
        'random_length': randomLength,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getDhConfig error:', err)
      return null
    }
  }

  public async requestEncryption(holder: RpcClientHolder, accountId: string, userIdId?: string, randomId?: number, gA?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.requestEncryption',
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
        'random_id': randomId,
        'g_a': gA,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.requestEncryption error:', err)
      return null
    }
  }

  public async acceptEncryption(holder: RpcClientHolder, peer?: any, gB?: any, keyFingerprint?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.acceptEncryption',
        'peer': peer,
        'g_b': gB,
        'key_fingerprint': keyFingerprint,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.acceptEncryption error:', err)
      return null
    }
  }

  public async discardEncryption(holder: RpcClientHolder, deleteHistory?: boolean, chatId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.discardEncryption',
        'delete_history': deleteHistory,
        'chat_id': chatId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.discardEncryption error:', err)
      return null
    }
  }

  public async setEncryptedTyping(holder: RpcClientHolder, peer?: any, typing?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.setEncryptedTyping',
        'peer': peer,
        'typing': typing,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.setEncryptedTyping error:', err)
      return null
    }
  }

  public async readEncryptedHistory(holder: RpcClientHolder, peer?: any, maxDate?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.readEncryptedHistory',
        'peer': peer,
        'max_date': maxDate,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.readEncryptedHistory error:', err)
      return null
    }
  }

  public async sendEncrypted(holder: RpcClientHolder, silent?: boolean, peer?: any, randomId?: bigint | number, data?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.sendEncrypted',
        'silent': silent,
        'peer': peer,
        'random_id': randomId,
        'data': data,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.sendEncrypted error:', err)
      return null
    }
  }

  public async sendEncryptedFile(holder: RpcClientHolder, silent?: boolean, peer?: any, randomId?: bigint | number, data?: any, file?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.sendEncryptedFile',
        'silent': silent,
        'peer': peer,
        'random_id': randomId,
        'data': data,
        'file': file,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.sendEncryptedFile error:', err)
      return null
    }
  }

  public async sendEncryptedService(holder: RpcClientHolder, peer?: any, randomId?: bigint | number, data?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.sendEncryptedService',
        'peer': peer,
        'random_id': randomId,
        'data': data,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.sendEncryptedService error:', err)
      return null
    }
  }

  public async receivedQueue(holder: RpcClientHolder, maxQts?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.receivedQueue',
        'max_qts': maxQts,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.receivedQueue error:', err)
      return null
    }
  }

  public async reportEncryptedSpam(holder: RpcClientHolder, peer?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.reportEncryptedSpam',
        'peer': peer,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.reportEncryptedSpam error:', err)
      return null
    }
  }

  public async readMessageContents(holder: RpcClientHolder, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.readMessageContents',
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.readMessageContents error:', err)
      return null
    }
  }

  public async getStickers(holder: RpcClientHolder, emoticon?: string, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getStickers',
        'emoticon': emoticon,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getStickers error:', err)
      return null
    }
  }

  public async getAllStickers(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getAllStickers',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getAllStickers error:', err)
      return null
    }
  }

  public async getWebPagePreview(holder: RpcClientHolder, message?: string, entities?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getWebPagePreview',
        'message': message,
        'entities': entities,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getWebPagePreview error:', err)
      return null
    }
  }

  public async exportChatInvite(holder: RpcClientHolder, accountId: string, legacyRevokePermanent?: boolean, requestNeeded?: boolean, peerId?: string, expireDate?: number, usageLimit?: number, title?: string, subscriptionPricing?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.exportChatInvite',
        'legacy_revoke_permanent': legacyRevokePermanent,
        'request_needed': requestNeeded,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'expire_date': expireDate,
        'usage_limit': usageLimit,
        'title': title,
        'subscription_pricing': subscriptionPricing,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.exportChatInvite error:', err)
      return null
    }
  }

  public async checkChatInvite(holder: RpcClientHolder, hash?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.checkChatInvite',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.checkChatInvite error:', err)
      return null
    }
  }

  public async importChatInvite(holder: RpcClientHolder, hash?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.importChatInvite',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.importChatInvite error:', err)
      return null
    }
  }

  public async getStickerSet(holder: RpcClientHolder, stickerset?: any, hash?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getStickerSet',
        'stickerset': stickerset,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getStickerSet error:', err)
      return null
    }
  }

  public async installStickerSet(holder: RpcClientHolder, stickerset?: any, archived?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.installStickerSet',
        'stickerset': stickerset,
        'archived': archived,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.installStickerSet error:', err)
      return null
    }
  }

  public async uninstallStickerSet(holder: RpcClientHolder, stickerset?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.uninstallStickerSet',
        'stickerset': stickerset,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.uninstallStickerSet error:', err)
      return null
    }
  }

  public async startBot(holder: RpcClientHolder, accountId: string, botId?: string, peerId?: string, randomId?: bigint | number, startParam?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.startBot',
        'bot': botId ? await this.toInputUser(accountId, botId) : undefined,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'random_id': randomId,
        'start_param': startParam,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.startBot error:', err)
      return null
    }
  }

  public async getMessagesViews(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number, increment?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getMessagesViews',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
        'increment': increment,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getMessagesViews error:', err)
      return null
    }
  }

  public async editChatAdmin(holder: RpcClientHolder, accountId: string, chatId?: bigint | number, userIdId?: string, isAdmin?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.editChatAdmin',
        'chat_id': chatId,
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
        'is_admin': isAdmin,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.editChatAdmin error:', err)
      return null
    }
  }

  public async migrateChat(holder: RpcClientHolder, chatId?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.migrateChat',
        'chat_id': chatId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.migrateChat error:', err)
      return null
    }
  }

  public async searchGlobal(holder: RpcClientHolder, accountId: string, broadcastsOnly?: boolean, groupsOnly?: boolean, usersOnly?: boolean, folderId?: number, community?: any, q?: string, filter?: any, minDate?: number, maxDate?: number, offsetRate?: number, offsetPeerId?: string, offsetId?: number, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.searchGlobal',
        'broadcasts_only': broadcastsOnly,
        'groups_only': groupsOnly,
        'users_only': usersOnly,
        'folder_id': folderId,
        'community': community,
        'q': q,
        'filter': filter,
        'min_date': minDate,
        'max_date': maxDate,
        'offset_rate': offsetRate,
        'offset_peer': offsetPeerId ? await this.resolveInputPeer(accountId, offsetPeerId) : undefined,
        'offset_id': offsetId,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.searchGlobal error:', err)
      return null
    }
  }

  public async reorderStickerSets(holder: RpcClientHolder, masks?: boolean, emojis?: boolean, order?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.reorderStickerSets',
        'masks': masks,
        'emojis': emojis,
        'order': order,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.reorderStickerSets error:', err)
      return null
    }
  }

  public async getDocumentByHash(holder: RpcClientHolder, sha256?: any, size?: bigint | number, mimeType?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getDocumentByHash',
        'sha256': sha256,
        'size': size,
        'mime_type': mimeType,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getDocumentByHash error:', err)
      return null
    }
  }

  public async getSavedGifs(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getSavedGifs',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getSavedGifs error:', err)
      return null
    }
  }

  public async saveGif(holder: RpcClientHolder, id?: any, unsave?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.saveGif',
        'id': id,
        'unsave': unsave,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.saveGif error:', err)
      return null
    }
  }

  public async getInlineBotResults(holder: RpcClientHolder, accountId: string, botId?: string, peerId?: string, geoPoint?: any, query?: string, offset?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getInlineBotResults',
        'bot': botId ? await this.toInputUser(accountId, botId) : undefined,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'geo_point': geoPoint,
        'query': query,
        'offset': offset,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getInlineBotResults error:', err)
      return null
    }
  }

  public async setInlineBotResults(holder: RpcClientHolder, gallery?: boolean, isPrivate?: boolean, queryId?: bigint | number, results?: any, cacheTime?: number, nextOffset?: string, switchPm?: any, switchWebview?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.setInlineBotResults',
        'gallery': gallery,
        'private': isPrivate,
        'query_id': queryId,
        'results': results,
        'cache_time': cacheTime,
        'next_offset': nextOffset,
        'switch_pm': switchPm,
        'switch_webview': switchWebview,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.setInlineBotResults error:', err)
      return null
    }
  }

  public async sendInlineBotResult(holder: RpcClientHolder, accountId: string, silent?: boolean, background?: boolean, clearDraft?: boolean, hideVia?: boolean, peerId?: string, replyTo?: any, randomId?: bigint | number, queryId?: bigint | number, id?: string, scheduleDate?: number, sendAsId?: string, quickReplyShortcut?: any, allowPaidStars?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.sendInlineBotResult',
        'silent': silent,
        'background': background,
        'clear_draft': clearDraft,
        'hide_via': hideVia,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'reply_to': replyTo,
        'random_id': randomId,
        'query_id': queryId,
        'id': id,
        'schedule_date': scheduleDate,
        'send_as': sendAsId ? await this.resolveInputPeer(accountId, sendAsId) : undefined,
        'quick_reply_shortcut': quickReplyShortcut,
        'allow_paid_stars': allowPaidStars,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.sendInlineBotResult error:', err)
      return null
    }
  }

  public async getMessageEditData(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getMessageEditData',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getMessageEditData error:', err)
      return null
    }
  }

  public async editMessage(holder: RpcClientHolder, accountId: string, noWebpage?: boolean, invertMedia?: boolean, peerId?: string, id?: number, message?: string, media?: any, replyMarkup?: any, entities?: any, scheduleDate?: number, scheduleRepeatPeriod?: number, quickReplyShortcutId?: number, richMessage?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.editMessage',
        'no_webpage': noWebpage,
        'invert_media': invertMedia,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
        'message': message,
        'media': media,
        'reply_markup': replyMarkup,
        'entities': entities,
        'schedule_date': scheduleDate,
        'schedule_repeat_period': scheduleRepeatPeriod,
        'quick_reply_shortcut_id': quickReplyShortcutId,
        'rich_message': richMessage,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.editMessage error:', err)
      return null
    }
  }

  public async editInlineBotMessage(holder: RpcClientHolder, noWebpage?: boolean, invertMedia?: boolean, id?: any, message?: string, media?: any, replyMarkup?: any, entities?: any, richMessage?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.editInlineBotMessage',
        'no_webpage': noWebpage,
        'invert_media': invertMedia,
        'id': id,
        'message': message,
        'media': media,
        'reply_markup': replyMarkup,
        'entities': entities,
        'rich_message': richMessage,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.editInlineBotMessage error:', err)
      return null
    }
  }

  public async getBotCallbackAnswer(holder: RpcClientHolder, accountId: string, game?: boolean, peerId?: string, msgId?: number, data?: any, password?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getBotCallbackAnswer',
        'game': game,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
        'data': data,
        'password': password,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getBotCallbackAnswer error:', err)
      return null
    }
  }

  public async setBotCallbackAnswer(holder: RpcClientHolder, alert?: boolean, queryId?: bigint | number, message?: string, url?: string, cacheTime?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.setBotCallbackAnswer',
        'alert': alert,
        'query_id': queryId,
        'message': message,
        'url': url,
        'cache_time': cacheTime,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.setBotCallbackAnswer error:', err)
      return null
    }
  }

  public async getPeerDialogs(holder: RpcClientHolder, peers?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getPeerDialogs',
        'peers': peers,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getPeerDialogs error:', err)
      return null
    }
  }

  public async saveDraft(holder: RpcClientHolder, accountId: string, noWebpage?: boolean, invertMedia?: boolean, replyTo?: any, peerId?: string, message?: string, entities?: any, media?: any, effect?: bigint | number, suggestedPost?: any, richMessage?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.saveDraft',
        'no_webpage': noWebpage,
        'invert_media': invertMedia,
        'reply_to': replyTo,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'message': message,
        'entities': entities,
        'media': media,
        'effect': effect,
        'suggested_post': suggestedPost,
        'rich_message': richMessage,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.saveDraft error:', err)
      return null
    }
  }

  public async getAllDrafts(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getAllDrafts',
        ...params,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getAllDrafts error:', err)
      return null
    }
  }

  public async getFeaturedStickers(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getFeaturedStickers',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getFeaturedStickers error:', err)
      return null
    }
  }

  public async readFeaturedStickers(holder: RpcClientHolder, id?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.readFeaturedStickers',
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.readFeaturedStickers error:', err)
      return null
    }
  }

  public async getRecentStickers(holder: RpcClientHolder, attached?: boolean, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getRecentStickers',
        'attached': attached,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getRecentStickers error:', err)
      return null
    }
  }

  public async saveRecentSticker(holder: RpcClientHolder, attached?: boolean, id?: any, unsave?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.saveRecentSticker',
        'attached': attached,
        'id': id,
        'unsave': unsave,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.saveRecentSticker error:', err)
      return null
    }
  }

  public async clearRecentStickers(holder: RpcClientHolder, attached?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.clearRecentStickers',
        'attached': attached,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.clearRecentStickers error:', err)
      return null
    }
  }

  public async getArchivedStickers(holder: RpcClientHolder, masks?: boolean, emojis?: boolean, offsetId?: bigint | number, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getArchivedStickers',
        'masks': masks,
        'emojis': emojis,
        'offset_id': offsetId,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getArchivedStickers error:', err)
      return null
    }
  }

  public async getMaskStickers(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getMaskStickers',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getMaskStickers error:', err)
      return null
    }
  }

  public async getAttachedStickers(holder: RpcClientHolder, media?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getAttachedStickers',
        'media': media,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getAttachedStickers error:', err)
      return null
    }
  }

  public async setGameScore(holder: RpcClientHolder, accountId: string, editMessage?: boolean, force?: boolean, peerId?: string, id?: number, userIdId?: string, score?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.setGameScore',
        'edit_message': editMessage,
        'force': force,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
        'score': score,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.setGameScore error:', err)
      return null
    }
  }

  public async setInlineGameScore(holder: RpcClientHolder, accountId: string, editMessage?: boolean, force?: boolean, id?: any, userIdId?: string, score?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.setInlineGameScore',
        'edit_message': editMessage,
        'force': force,
        'id': id,
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
        'score': score,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.setInlineGameScore error:', err)
      return null
    }
  }

  public async getGameHighScores(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number, userIdId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getGameHighScores',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getGameHighScores error:', err)
      return null
    }
  }

  public async getInlineGameHighScores(holder: RpcClientHolder, accountId: string, id?: any, userIdId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getInlineGameHighScores',
        'id': id,
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getInlineGameHighScores error:', err)
      return null
    }
  }

  public async getCommonChats(holder: RpcClientHolder, accountId: string, userIdId?: string, maxId?: bigint | number, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getCommonChats',
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
        'max_id': maxId,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getCommonChats error:', err)
      return null
    }
  }

  public async getWebPage(holder: RpcClientHolder, url?: string, hash?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getWebPage',
        'url': url,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getWebPage error:', err)
      return null
    }
  }

  public async toggleDialogPin(holder: RpcClientHolder, pinned?: boolean, peer?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.toggleDialogPin',
        'pinned': pinned,
        'peer': peer,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.toggleDialogPin error:', err)
      return null
    }
  }

  public async reorderPinnedDialogs(holder: RpcClientHolder, force?: boolean, folderId?: number, order?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.reorderPinnedDialogs',
        'force': force,
        'folder_id': folderId,
        'order': order,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.reorderPinnedDialogs error:', err)
      return null
    }
  }

  public async getPinnedDialogs(holder: RpcClientHolder, folderId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getPinnedDialogs',
        'folder_id': folderId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getPinnedDialogs error:', err)
      return null
    }
  }

  public async setBotShippingResults(holder: RpcClientHolder, queryId?: bigint | number, error?: string, shippingOptions?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.setBotShippingResults',
        'query_id': queryId,
        'error': error,
        'shipping_options': shippingOptions,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.setBotShippingResults error:', err)
      return null
    }
  }

  public async setBotPrecheckoutResults(holder: RpcClientHolder, success?: boolean, queryId?: bigint | number, error?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.setBotPrecheckoutResults',
        'success': success,
        'query_id': queryId,
        'error': error,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.setBotPrecheckoutResults error:', err)
      return null
    }
  }

  public async uploadMedia(holder: RpcClientHolder, accountId: string, businessConnectionId?: string, peerId?: string, media?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.uploadMedia',
        'business_connection_id': businessConnectionId,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'media': media,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.uploadMedia error:', err)
      return null
    }
  }

  public async sendScreenshotNotification(holder: RpcClientHolder, accountId: string, peerId?: string, replyTo?: any, randomId?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.sendScreenshotNotification',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'reply_to': replyTo,
        'random_id': randomId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.sendScreenshotNotification error:', err)
      return null
    }
  }

  public async getFavedStickers(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getFavedStickers',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getFavedStickers error:', err)
      return null
    }
  }

  public async faveSticker(holder: RpcClientHolder, id?: any, unfave?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.faveSticker',
        'id': id,
        'unfave': unfave,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.faveSticker error:', err)
      return null
    }
  }

  public async getUnreadMentions(holder: RpcClientHolder, accountId: string, peerId?: string, topMsgId?: number, offsetId?: number, addOffset?: number, limit?: number, maxId?: number, minId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getUnreadMentions',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'top_msg_id': topMsgId,
        'offset_id': offsetId,
        'add_offset': addOffset,
        'limit': limit,
        'max_id': maxId,
        'min_id': minId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getUnreadMentions error:', err)
      return null
    }
  }

  public async readMentions(holder: RpcClientHolder, accountId: string, peerId?: string, topMsgId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.readMentions',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'top_msg_id': topMsgId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.readMentions error:', err)
      return null
    }
  }

  public async getRecentLocations(holder: RpcClientHolder, accountId: string, peerId?: string, limit?: number, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getRecentLocations',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'limit': limit,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getRecentLocations error:', err)
      return null
    }
  }

  public async sendMultiMedia(holder: RpcClientHolder, accountId: string, silent?: boolean, background?: boolean, clearDraft?: boolean, noforwards?: boolean, updateStickersetsOrder?: boolean, invertMedia?: boolean, allowPaidFloodskip?: boolean, peerId?: string, replyTo?: any, multiMedia?: any, scheduleDate?: number, sendAsId?: string, quickReplyShortcut?: any, effect?: bigint | number, allowPaidStars?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.sendMultiMedia',
        'silent': silent,
        'background': background,
        'clear_draft': clearDraft,
        'noforwards': noforwards,
        'update_stickersets_order': updateStickersetsOrder,
        'invert_media': invertMedia,
        'allow_paid_floodskip': allowPaidFloodskip,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'reply_to': replyTo,
        'multi_media': multiMedia,
        'schedule_date': scheduleDate,
        'send_as': sendAsId ? await this.resolveInputPeer(accountId, sendAsId) : undefined,
        'quick_reply_shortcut': quickReplyShortcut,
        'effect': effect,
        'allow_paid_stars': allowPaidStars,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.sendMultiMedia error:', err)
      return null
    }
  }

  public async uploadEncryptedFile(holder: RpcClientHolder, peer?: any, file?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.uploadEncryptedFile',
        'peer': peer,
        'file': file,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.uploadEncryptedFile error:', err)
      return null
    }
  }

  public async searchStickerSets(holder: RpcClientHolder, excludeFeatured?: boolean, q?: string, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.searchStickerSets',
        'exclude_featured': excludeFeatured,
        'q': q,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.searchStickerSets error:', err)
      return null
    }
  }

  public async getSplitRanges(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getSplitRanges',
        ...params,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getSplitRanges error:', err)
      return null
    }
  }

  public async markDialogUnread(holder: RpcClientHolder, accountId: string, unread?: boolean, parentPeerId?: string, peer?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.markDialogUnread',
        'unread': unread,
        'parent_peer': parentPeerId ? await this.resolveInputPeer(accountId, parentPeerId) : undefined,
        'peer': peer,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.markDialogUnread error:', err)
      return null
    }
  }

  public async getDialogUnreadMarks(holder: RpcClientHolder, accountId: string, parentPeerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getDialogUnreadMarks',
        'parent_peer': parentPeerId ? await this.resolveInputPeer(accountId, parentPeerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getDialogUnreadMarks error:', err)
      return null
    }
  }

  public async clearAllDrafts(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.clearAllDrafts',
        ...params,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.clearAllDrafts error:', err)
      return null
    }
  }

  public async updatePinnedMessage(holder: RpcClientHolder, accountId: string, silent?: boolean, unpin?: boolean, pmOneside?: boolean, peerId?: string, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.updatePinnedMessage',
        'silent': silent,
        'unpin': unpin,
        'pm_oneside': pmOneside,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.updatePinnedMessage error:', err)
      return null
    }
  }

  public async sendVote(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number, options?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.sendVote',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
        'options': options,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.sendVote error:', err)
      return null
    }
  }

  public async getPollResults(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number, pollHash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getPollResults',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
        'poll_hash': pollHash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getPollResults error:', err)
      return null
    }
  }

  public async getOnlines(holder: RpcClientHolder, accountId: string, peerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getOnlines',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getOnlines error:', err)
      return null
    }
  }

  public async editChatAbout(holder: RpcClientHolder, accountId: string, peerId?: string, about?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.editChatAbout',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'about': about,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.editChatAbout error:', err)
      return null
    }
  }

  public async editChatDefaultBannedRights(holder: RpcClientHolder, accountId: string, peerId?: string, bannedRights?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.editChatDefaultBannedRights',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'banned_rights': bannedRights,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.editChatDefaultBannedRights error:', err)
      return null
    }
  }

  public async getEmojiKeywords(holder: RpcClientHolder, langCode?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getEmojiKeywords',
        'lang_code': langCode,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getEmojiKeywords error:', err)
      return null
    }
  }

  public async getEmojiKeywordsDifference(holder: RpcClientHolder, langCode?: string, fromVersion?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getEmojiKeywordsDifference',
        'lang_code': langCode,
        'from_version': fromVersion,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getEmojiKeywordsDifference error:', err)
      return null
    }
  }

  public async getEmojiKeywordsLanguages(holder: RpcClientHolder, langCodes?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getEmojiKeywordsLanguages',
        'lang_codes': langCodes,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getEmojiKeywordsLanguages error:', err)
      return null
    }
  }

  public async getEmojiURL(holder: RpcClientHolder, langCode?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getEmojiURL',
        'lang_code': langCode,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getEmojiURL error:', err)
      return null
    }
  }

  public async getSearchCounters(holder: RpcClientHolder, accountId: string, peerId?: string, savedPeerIdId?: string, topMsgId?: number, filters?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getSearchCounters',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'saved_peer_id': savedPeerIdId ? await this.resolveInputPeer(accountId, savedPeerIdId) : undefined,
        'top_msg_id': topMsgId,
        'filters': filters,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getSearchCounters error:', err)
      return null
    }
  }

  public async requestUrlAuth(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number, buttonId?: number, url?: string, inAppOrigin?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.requestUrlAuth',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
        'button_id': buttonId,
        'url': url,
        'in_app_origin': inAppOrigin,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.requestUrlAuth error:', err)
      return null
    }
  }

  public async acceptUrlAuth(holder: RpcClientHolder, accountId: string, writeAllowed?: boolean, sharePhoneNumber?: boolean, peerId?: string, msgId?: number, buttonId?: number, url?: string, matchCode?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.acceptUrlAuth',
        'write_allowed': writeAllowed,
        'share_phone_number': sharePhoneNumber,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
        'button_id': buttonId,
        'url': url,
        'match_code': matchCode,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.acceptUrlAuth error:', err)
      return null
    }
  }

  public async hidePeerSettingsBar(holder: RpcClientHolder, accountId: string, peerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.hidePeerSettingsBar',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.hidePeerSettingsBar error:', err)
      return null
    }
  }

  public async getScheduledHistory(holder: RpcClientHolder, accountId: string, peerId?: string, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getScheduledHistory',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getScheduledHistory error:', err)
      return null
    }
  }

  public async getScheduledMessages(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getScheduledMessages',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getScheduledMessages error:', err)
      return null
    }
  }

  public async sendScheduledMessages(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.sendScheduledMessages',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.sendScheduledMessages error:', err)
      return null
    }
  }

  public async deleteScheduledMessages(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.deleteScheduledMessages',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.deleteScheduledMessages error:', err)
      return null
    }
  }

  public async getPollVotes(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number, option?: any, offset?: string, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getPollVotes',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
        'option': option,
        'offset': offset,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getPollVotes error:', err)
      return null
    }
  }

  public async toggleStickerSets(holder: RpcClientHolder, uninstall?: boolean, archive?: boolean, unarchive?: boolean, stickersets?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.toggleStickerSets',
        'uninstall': uninstall,
        'archive': archive,
        'unarchive': unarchive,
        'stickersets': stickersets,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.toggleStickerSets error:', err)
      return null
    }
  }

  public async getDialogFilters(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getDialogFilters',
        ...params,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getDialogFilters error:', err)
      return null
    }
  }

  public async getSuggestedDialogFilters(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getSuggestedDialogFilters',
        ...params,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getSuggestedDialogFilters error:', err)
      return null
    }
  }

  public async updateDialogFilter(holder: RpcClientHolder, id?: number, filter?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.updateDialogFilter',
        'id': id,
        'filter': filter,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.updateDialogFilter error:', err)
      return null
    }
  }

  public async updateDialogFiltersOrder(holder: RpcClientHolder, order?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.updateDialogFiltersOrder',
        'order': order,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.updateDialogFiltersOrder error:', err)
      return null
    }
  }

  public async getOldFeaturedStickers(holder: RpcClientHolder, offset?: number, limit?: number, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getOldFeaturedStickers',
        'offset': offset,
        'limit': limit,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getOldFeaturedStickers error:', err)
      return null
    }
  }

  public async getReplies(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number, offsetId?: number, offsetDate?: number, addOffset?: number, limit?: number, maxId?: number, minId?: number, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getReplies',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
        'offset_id': offsetId,
        'offset_date': offsetDate,
        'add_offset': addOffset,
        'limit': limit,
        'max_id': maxId,
        'min_id': minId,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getReplies error:', err)
      return null
    }
  }

  public async getDiscussionMessage(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getDiscussionMessage',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getDiscussionMessage error:', err)
      return null
    }
  }

  public async readDiscussion(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number, readMaxId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.readDiscussion',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
        'read_max_id': readMaxId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.readDiscussion error:', err)
      return null
    }
  }

  public async unpinAllMessages(holder: RpcClientHolder, accountId: string, peerId?: string, topMsgId?: number, savedPeerIdId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.unpinAllMessages',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'top_msg_id': topMsgId,
        'saved_peer_id': savedPeerIdId ? await this.resolveInputPeer(accountId, savedPeerIdId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.unpinAllMessages error:', err)
      return null
    }
  }

  public async deleteChat(holder: RpcClientHolder, chatId?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.deleteChat',
        'chat_id': chatId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.deleteChat error:', err)
      return null
    }
  }

  public async deletePhoneCallHistory(holder: RpcClientHolder, revoke?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.deletePhoneCallHistory',
        'revoke': revoke,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.deletePhoneCallHistory error:', err)
      return null
    }
  }

  public async checkHistoryImport(holder: RpcClientHolder, importHead?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.checkHistoryImport',
        'import_head': importHead,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.checkHistoryImport error:', err)
      return null
    }
  }

  public async initHistoryImport(holder: RpcClientHolder, accountId: string, peerId?: string, file?: any, mediaCount?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.initHistoryImport',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'file': file,
        'media_count': mediaCount,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.initHistoryImport error:', err)
      return null
    }
  }

  public async uploadImportedMedia(holder: RpcClientHolder, accountId: string, peerId?: string, importId?: bigint | number, fileName?: string, media?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.uploadImportedMedia',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'import_id': importId,
        'file_name': fileName,
        'media': media,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.uploadImportedMedia error:', err)
      return null
    }
  }

  public async startHistoryImport(holder: RpcClientHolder, accountId: string, peerId?: string, importId?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.startHistoryImport',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'import_id': importId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.startHistoryImport error:', err)
      return null
    }
  }

  public async getExportedChatInvites(holder: RpcClientHolder, accountId: string, revoked?: boolean, peerId?: string, adminIdId?: string, offsetDate?: number, offsetLink?: string, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getExportedChatInvites',
        'revoked': revoked,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'admin_id': adminIdId ? await this.toInputUser(accountId, adminIdId) : undefined,
        'offset_date': offsetDate,
        'offset_link': offsetLink,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getExportedChatInvites error:', err)
      return null
    }
  }

  public async getExportedChatInvite(holder: RpcClientHolder, accountId: string, peerId?: string, link?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getExportedChatInvite',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'link': link,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getExportedChatInvite error:', err)
      return null
    }
  }

  public async editExportedChatInvite(holder: RpcClientHolder, accountId: string, revoked?: boolean, peerId?: string, link?: string, expireDate?: number, usageLimit?: number, requestNeeded?: boolean, title?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.editExportedChatInvite',
        'revoked': revoked,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'link': link,
        'expire_date': expireDate,
        'usage_limit': usageLimit,
        'request_needed': requestNeeded,
        'title': title,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.editExportedChatInvite error:', err)
      return null
    }
  }

  public async deleteRevokedExportedChatInvites(holder: RpcClientHolder, accountId: string, peerId?: string, adminIdId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.deleteRevokedExportedChatInvites',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'admin_id': adminIdId ? await this.toInputUser(accountId, adminIdId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.deleteRevokedExportedChatInvites error:', err)
      return null
    }
  }

  public async deleteExportedChatInvite(holder: RpcClientHolder, accountId: string, peerId?: string, link?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.deleteExportedChatInvite',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'link': link,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.deleteExportedChatInvite error:', err)
      return null
    }
  }

  public async getAdminsWithInvites(holder: RpcClientHolder, accountId: string, peerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getAdminsWithInvites',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getAdminsWithInvites error:', err)
      return null
    }
  }

  public async getChatInviteImporters(holder: RpcClientHolder, accountId: string, requested?: boolean, subscriptionExpired?: boolean, peerId?: string, link?: string, q?: string, offsetDate?: number, offsetUserId?: string, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getChatInviteImporters',
        'requested': requested,
        'subscription_expired': subscriptionExpired,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'link': link,
        'q': q,
        'offset_date': offsetDate,
        'offset_user': offsetUserId ? await this.toInputUser(accountId, offsetUserId) : undefined,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getChatInviteImporters error:', err)
      return null
    }
  }

  public async setHistoryTTL(holder: RpcClientHolder, accountId: string, peerId?: string, period?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.setHistoryTTL',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'period': period,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.setHistoryTTL error:', err)
      return null
    }
  }

  public async checkHistoryImportPeer(holder: RpcClientHolder, accountId: string, peerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.checkHistoryImportPeer',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.checkHistoryImportPeer error:', err)
      return null
    }
  }

  public async setChatTheme(holder: RpcClientHolder, accountId: string, peerId?: string, theme?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.setChatTheme',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'theme': theme,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.setChatTheme error:', err)
      return null
    }
  }

  public async getMessageReadParticipants(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getMessageReadParticipants',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getMessageReadParticipants error:', err)
      return null
    }
  }

  public async getSearchResultsCalendar(holder: RpcClientHolder, accountId: string, peerId?: string, savedPeerIdId?: string, filter?: any, offsetId?: number, offsetDate?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getSearchResultsCalendar',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'saved_peer_id': savedPeerIdId ? await this.resolveInputPeer(accountId, savedPeerIdId) : undefined,
        'filter': filter,
        'offset_id': offsetId,
        'offset_date': offsetDate,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getSearchResultsCalendar error:', err)
      return null
    }
  }

  public async getSearchResultsPositions(holder: RpcClientHolder, accountId: string, peerId?: string, savedPeerIdId?: string, filter?: any, offsetId?: number, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getSearchResultsPositions',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'saved_peer_id': savedPeerIdId ? await this.resolveInputPeer(accountId, savedPeerIdId) : undefined,
        'filter': filter,
        'offset_id': offsetId,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getSearchResultsPositions error:', err)
      return null
    }
  }

  public async hideChatJoinRequest(holder: RpcClientHolder, accountId: string, approved?: boolean, peerId?: string, userIdId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.hideChatJoinRequest',
        'approved': approved,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.hideChatJoinRequest error:', err)
      return null
    }
  }

  public async hideAllChatJoinRequests(holder: RpcClientHolder, accountId: string, approved?: boolean, peerId?: string, link?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.hideAllChatJoinRequests',
        'approved': approved,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'link': link,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.hideAllChatJoinRequests error:', err)
      return null
    }
  }

  public async toggleNoForwards(holder: RpcClientHolder, accountId: string, peerId?: string, enabled?: boolean, requestMsgId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.toggleNoForwards',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'enabled': enabled,
        'request_msg_id': requestMsgId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.toggleNoForwards error:', err)
      return null
    }
  }

  public async saveDefaultSendAs(holder: RpcClientHolder, accountId: string, peerId?: string, sendAsId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.saveDefaultSendAs',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'send_as': sendAsId ? await this.resolveInputPeer(accountId, sendAsId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.saveDefaultSendAs error:', err)
      return null
    }
  }

  public async sendReaction(holder: RpcClientHolder, accountId: string, big?: boolean, addToRecent?: boolean, peerId?: string, msgId?: number, reaction?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.sendReaction',
        'big': big,
        'add_to_recent': addToRecent,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
        'reaction': reaction,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.sendReaction error:', err)
      return null
    }
  }

  public async getMessagesReactions(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getMessagesReactions',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getMessagesReactions error:', err)
      return null
    }
  }

  public async getMessageReactionsList(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number, reaction?: any, offset?: string, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getMessageReactionsList',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
        'reaction': reaction,
        'offset': offset,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getMessageReactionsList error:', err)
      return null
    }
  }

  public async setChatAvailableReactions(holder: RpcClientHolder, accountId: string, peerId?: string, availableReactions?: any, reactionsLimit?: number, paidEnabled?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.setChatAvailableReactions',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'available_reactions': availableReactions,
        'reactions_limit': reactionsLimit,
        'paid_enabled': paidEnabled,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.setChatAvailableReactions error:', err)
      return null
    }
  }

  public async getAvailableReactions(holder: RpcClientHolder, hash?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getAvailableReactions',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getAvailableReactions error:', err)
      return null
    }
  }

  public async setDefaultReaction(holder: RpcClientHolder, reaction?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.setDefaultReaction',
        'reaction': reaction,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.setDefaultReaction error:', err)
      return null
    }
  }

  public async translateText(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number, text?: any, toLang?: string, tone?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.translateText',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
        'text': text,
        'to_lang': toLang,
        'tone': tone,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.translateText error:', err)
      return null
    }
  }

  public async getUnreadReactions(holder: RpcClientHolder, accountId: string, peerId?: string, topMsgId?: number, savedPeerIdId?: string, offsetId?: number, addOffset?: number, limit?: number, maxId?: number, minId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getUnreadReactions',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'top_msg_id': topMsgId,
        'saved_peer_id': savedPeerIdId ? await this.resolveInputPeer(accountId, savedPeerIdId) : undefined,
        'offset_id': offsetId,
        'add_offset': addOffset,
        'limit': limit,
        'max_id': maxId,
        'min_id': minId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getUnreadReactions error:', err)
      return null
    }
  }

  public async readReactions(holder: RpcClientHolder, accountId: string, peerId?: string, topMsgId?: number, savedPeerIdId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.readReactions',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'top_msg_id': topMsgId,
        'saved_peer_id': savedPeerIdId ? await this.resolveInputPeer(accountId, savedPeerIdId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.readReactions error:', err)
      return null
    }
  }

  public async searchSentMedia(holder: RpcClientHolder, q?: string, filter?: any, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.searchSentMedia',
        'q': q,
        'filter': filter,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.searchSentMedia error:', err)
      return null
    }
  }

  public async getAttachMenuBots(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getAttachMenuBots',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getAttachMenuBots error:', err)
      return null
    }
  }

  public async getAttachMenuBot(holder: RpcClientHolder, accountId: string, botId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getAttachMenuBot',
        'bot': botId ? await this.toInputUser(accountId, botId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getAttachMenuBot error:', err)
      return null
    }
  }

  public async toggleBotInAttachMenu(holder: RpcClientHolder, accountId: string, writeAllowed?: boolean, botId?: string, enabled?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.toggleBotInAttachMenu',
        'write_allowed': writeAllowed,
        'bot': botId ? await this.toInputUser(accountId, botId) : undefined,
        'enabled': enabled,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.toggleBotInAttachMenu error:', err)
      return null
    }
  }

  public async requestWebView(holder: RpcClientHolder, accountId: string, fromBotMenu?: boolean, silent?: boolean, compact?: boolean, fullscreen?: boolean, peerId?: string, botId?: string, url?: string, startParam?: string, themeParams?: any, platform?: string, replyTo?: any, sendAsId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.requestWebView',
        'from_bot_menu': fromBotMenu,
        'silent': silent,
        'compact': compact,
        'fullscreen': fullscreen,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'bot': botId ? await this.toInputUser(accountId, botId) : undefined,
        'url': url,
        'start_param': startParam,
        'theme_params': themeParams,
        'platform': platform,
        'reply_to': replyTo,
        'send_as': sendAsId ? await this.resolveInputPeer(accountId, sendAsId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.requestWebView error:', err)
      return null
    }
  }

  public async prolongWebView(holder: RpcClientHolder, accountId: string, silent?: boolean, peerId?: string, botId?: string, queryId?: bigint | number, replyTo?: any, sendAsId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.prolongWebView',
        'silent': silent,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'bot': botId ? await this.toInputUser(accountId, botId) : undefined,
        'query_id': queryId,
        'reply_to': replyTo,
        'send_as': sendAsId ? await this.resolveInputPeer(accountId, sendAsId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.prolongWebView error:', err)
      return null
    }
  }

  public async requestSimpleWebView(holder: RpcClientHolder, accountId: string, fromSwitchWebview?: boolean, fromSideMenu?: boolean, compact?: boolean, fullscreen?: boolean, botId?: string, url?: string, startParam?: string, themeParams?: any, platform?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.requestSimpleWebView',
        'from_switch_webview': fromSwitchWebview,
        'from_side_menu': fromSideMenu,
        'compact': compact,
        'fullscreen': fullscreen,
        'bot': botId ? await this.toInputUser(accountId, botId) : undefined,
        'url': url,
        'start_param': startParam,
        'theme_params': themeParams,
        'platform': platform,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.requestSimpleWebView error:', err)
      return null
    }
  }

  public async sendWebViewResultMessage(holder: RpcClientHolder, botQueryId?: string, result?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.sendWebViewResultMessage',
        'bot_query_id': botQueryId,
        'result': result,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.sendWebViewResultMessage error:', err)
      return null
    }
  }

  public async sendWebViewData(holder: RpcClientHolder, accountId: string, botId?: string, randomId?: bigint | number, buttonText?: string, data?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.sendWebViewData',
        'bot': botId ? await this.toInputUser(accountId, botId) : undefined,
        'random_id': randomId,
        'button_text': buttonText,
        'data': data,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.sendWebViewData error:', err)
      return null
    }
  }

  public async transcribeAudio(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.transcribeAudio',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.transcribeAudio error:', err)
      return null
    }
  }

  public async rateTranscribedAudio(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number, transcriptionId?: bigint | number, good?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.rateTranscribedAudio',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
        'transcription_id': transcriptionId,
        'good': good,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.rateTranscribedAudio error:', err)
      return null
    }
  }

  public async getCustomEmojiDocuments(holder: RpcClientHolder, documentId?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getCustomEmojiDocuments',
        'document_id': documentId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getCustomEmojiDocuments error:', err)
      return null
    }
  }

  public async getEmojiStickers(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getEmojiStickers',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getEmojiStickers error:', err)
      return null
    }
  }

  public async getFeaturedEmojiStickers(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getFeaturedEmojiStickers',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getFeaturedEmojiStickers error:', err)
      return null
    }
  }

  public async reportReaction(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number, reactionPeerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.reportReaction',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
        'reaction_peer': reactionPeerId ? await this.resolveInputPeer(accountId, reactionPeerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.reportReaction error:', err)
      return null
    }
  }

  public async getTopReactions(holder: RpcClientHolder, limit?: number, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getTopReactions',
        'limit': limit,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getTopReactions error:', err)
      return null
    }
  }

  public async getRecentReactions(holder: RpcClientHolder, limit?: number, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getRecentReactions',
        'limit': limit,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getRecentReactions error:', err)
      return null
    }
  }

  public async clearRecentReactions(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.clearRecentReactions',
        ...params,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.clearRecentReactions error:', err)
      return null
    }
  }

  public async getExtendedMedia(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getExtendedMedia',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getExtendedMedia error:', err)
      return null
    }
  }

  public async setDefaultHistoryTTL(holder: RpcClientHolder, period?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.setDefaultHistoryTTL',
        'period': period,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.setDefaultHistoryTTL error:', err)
      return null
    }
  }

  public async getDefaultHistoryTTL(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getDefaultHistoryTTL',
        ...params,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getDefaultHistoryTTL error:', err)
      return null
    }
  }

  public async sendBotRequestedPeer(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number, webappReqId?: string, buttonId?: number, requestedPeersId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.sendBotRequestedPeer',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
        'webapp_req_id': webappReqId,
        'button_id': buttonId,
        'requested_peers': requestedPeersId ? await this.resolveInputPeer(accountId, requestedPeersId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.sendBotRequestedPeer error:', err)
      return null
    }
  }

  public async getEmojiGroups(holder: RpcClientHolder, hash?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getEmojiGroups',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getEmojiGroups error:', err)
      return null
    }
  }

  public async getEmojiStatusGroups(holder: RpcClientHolder, hash?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getEmojiStatusGroups',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getEmojiStatusGroups error:', err)
      return null
    }
  }

  public async getEmojiProfilePhotoGroups(holder: RpcClientHolder, hash?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getEmojiProfilePhotoGroups',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getEmojiProfilePhotoGroups error:', err)
      return null
    }
  }

  public async searchCustomEmoji(holder: RpcClientHolder, emoticon?: string, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.searchCustomEmoji',
        'emoticon': emoticon,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.searchCustomEmoji error:', err)
      return null
    }
  }

  public async togglePeerTranslations(holder: RpcClientHolder, accountId: string, disabled?: boolean, peerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.togglePeerTranslations',
        'disabled': disabled,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.togglePeerTranslations error:', err)
      return null
    }
  }

  public async getBotApp(holder: RpcClientHolder, app?: any, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getBotApp',
        'app': app,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getBotApp error:', err)
      return null
    }
  }

  public async requestAppWebView(holder: RpcClientHolder, accountId: string, writeAllowed?: boolean, compact?: boolean, fullscreen?: boolean, peerId?: string, app?: any, startParam?: string, themeParams?: any, platform?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.requestAppWebView',
        'write_allowed': writeAllowed,
        'compact': compact,
        'fullscreen': fullscreen,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'app': app,
        'start_param': startParam,
        'theme_params': themeParams,
        'platform': platform,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.requestAppWebView error:', err)
      return null
    }
  }

  public async setChatWallPaper(holder: RpcClientHolder, accountId: string, forBoth?: boolean, revert?: boolean, peerId?: string, wallpaper?: any, settings?: any, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.setChatWallPaper',
        'for_both': forBoth,
        'revert': revert,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'wallpaper': wallpaper,
        'settings': settings,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.setChatWallPaper error:', err)
      return null
    }
  }

  public async searchEmojiStickerSets(holder: RpcClientHolder, excludeFeatured?: boolean, q?: string, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.searchEmojiStickerSets',
        'exclude_featured': excludeFeatured,
        'q': q,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.searchEmojiStickerSets error:', err)
      return null
    }
  }

  public async getSavedDialogs(holder: RpcClientHolder, accountId: string, excludePinned?: boolean, parentPeerId?: string, offsetDate?: number, offsetId?: number, offsetPeerId?: string, limit?: number, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getSavedDialogs',
        'exclude_pinned': excludePinned,
        'parent_peer': parentPeerId ? await this.resolveInputPeer(accountId, parentPeerId) : undefined,
        'offset_date': offsetDate,
        'offset_id': offsetId,
        'offset_peer': offsetPeerId ? await this.resolveInputPeer(accountId, offsetPeerId) : undefined,
        'limit': limit,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getSavedDialogs error:', err)
      return null
    }
  }

  public async getSavedHistory(holder: RpcClientHolder, accountId: string, parentPeerId?: string, peerId?: string, offsetId?: number, offsetDate?: number, addOffset?: number, limit?: number, maxId?: number, minId?: number, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getSavedHistory',
        'parent_peer': parentPeerId ? await this.resolveInputPeer(accountId, parentPeerId) : undefined,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'offset_id': offsetId,
        'offset_date': offsetDate,
        'add_offset': addOffset,
        'limit': limit,
        'max_id': maxId,
        'min_id': minId,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getSavedHistory error:', err)
      return null
    }
  }

  public async deleteSavedHistory(holder: RpcClientHolder, accountId: string, parentPeerId?: string, peerId?: string, maxId?: number, minDate?: number, maxDate?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.deleteSavedHistory',
        'parent_peer': parentPeerId ? await this.resolveInputPeer(accountId, parentPeerId) : undefined,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'max_id': maxId,
        'min_date': minDate,
        'max_date': maxDate,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.deleteSavedHistory error:', err)
      return null
    }
  }

  public async getPinnedSavedDialogs(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getPinnedSavedDialogs',
        ...params,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getPinnedSavedDialogs error:', err)
      return null
    }
  }

  public async toggleSavedDialogPin(holder: RpcClientHolder, pinned?: boolean, peer?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.toggleSavedDialogPin',
        'pinned': pinned,
        'peer': peer,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.toggleSavedDialogPin error:', err)
      return null
    }
  }

  public async reorderPinnedSavedDialogs(holder: RpcClientHolder, force?: boolean, order?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.reorderPinnedSavedDialogs',
        'force': force,
        'order': order,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.reorderPinnedSavedDialogs error:', err)
      return null
    }
  }

  public async getSavedReactionTags(holder: RpcClientHolder, accountId: string, peerId?: string, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getSavedReactionTags',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getSavedReactionTags error:', err)
      return null
    }
  }

  public async updateSavedReactionTag(holder: RpcClientHolder, reaction?: any, title?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.updateSavedReactionTag',
        'reaction': reaction,
        'title': title,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.updateSavedReactionTag error:', err)
      return null
    }
  }

  public async getDefaultTagReactions(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getDefaultTagReactions',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getDefaultTagReactions error:', err)
      return null
    }
  }

  public async getOutboxReadDate(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getOutboxReadDate',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getOutboxReadDate error:', err)
      return null
    }
  }

  public async getQuickReplies(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getQuickReplies',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getQuickReplies error:', err)
      return null
    }
  }

  public async reorderQuickReplies(holder: RpcClientHolder, order?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.reorderQuickReplies',
        'order': order,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.reorderQuickReplies error:', err)
      return null
    }
  }

  public async checkQuickReplyShortcut(holder: RpcClientHolder, shortcut?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.checkQuickReplyShortcut',
        'shortcut': shortcut,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.checkQuickReplyShortcut error:', err)
      return null
    }
  }

  public async editQuickReplyShortcut(holder: RpcClientHolder, shortcutId?: number, shortcut?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.editQuickReplyShortcut',
        'shortcut_id': shortcutId,
        'shortcut': shortcut,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.editQuickReplyShortcut error:', err)
      return null
    }
  }

  public async deleteQuickReplyShortcut(holder: RpcClientHolder, shortcutId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.deleteQuickReplyShortcut',
        'shortcut_id': shortcutId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.deleteQuickReplyShortcut error:', err)
      return null
    }
  }

  public async getQuickReplyMessages(holder: RpcClientHolder, shortcutId?: number, id?: number, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getQuickReplyMessages',
        'shortcut_id': shortcutId,
        'id': id,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getQuickReplyMessages error:', err)
      return null
    }
  }

  public async sendQuickReplyMessages(holder: RpcClientHolder, accountId: string, peerId?: string, shortcutId?: number, id?: number, randomId?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.sendQuickReplyMessages',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'shortcut_id': shortcutId,
        'id': id,
        'random_id': randomId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.sendQuickReplyMessages error:', err)
      return null
    }
  }

  public async deleteQuickReplyMessages(holder: RpcClientHolder, shortcutId?: number, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.deleteQuickReplyMessages',
        'shortcut_id': shortcutId,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.deleteQuickReplyMessages error:', err)
      return null
    }
  }

  public async toggleDialogFilterTags(holder: RpcClientHolder, enabled?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.toggleDialogFilterTags',
        'enabled': enabled,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.toggleDialogFilterTags error:', err)
      return null
    }
  }

  public async getMyStickers(holder: RpcClientHolder, offsetId?: bigint | number, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getMyStickers',
        'offset_id': offsetId,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getMyStickers error:', err)
      return null
    }
  }

  public async getEmojiStickerGroups(holder: RpcClientHolder, hash?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getEmojiStickerGroups',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getEmojiStickerGroups error:', err)
      return null
    }
  }

  public async getAvailableEffects(holder: RpcClientHolder, hash?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getAvailableEffects',
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getAvailableEffects error:', err)
      return null
    }
  }

  public async editFactCheck(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number, text?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.editFactCheck',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
        'text': text,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.editFactCheck error:', err)
      return null
    }
  }

  public async deleteFactCheck(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.deleteFactCheck',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.deleteFactCheck error:', err)
      return null
    }
  }

  public async getFactCheck(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getFactCheck',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getFactCheck error:', err)
      return null
    }
  }

  public async requestMainWebView(holder: RpcClientHolder, accountId: string, compact?: boolean, fullscreen?: boolean, peerId?: string, botId?: string, startParam?: string, themeParams?: any, platform?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.requestMainWebView',
        'compact': compact,
        'fullscreen': fullscreen,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'bot': botId ? await this.toInputUser(accountId, botId) : undefined,
        'start_param': startParam,
        'theme_params': themeParams,
        'platform': platform,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.requestMainWebView error:', err)
      return null
    }
  }

  public async sendPaidReaction(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number, count?: number, randomId?: bigint | number, isPrivate?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.sendPaidReaction',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
        'count': count,
        'random_id': randomId,
        'private': isPrivate,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.sendPaidReaction error:', err)
      return null
    }
  }

  public async togglePaidReactionPrivacy(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number, isPrivate?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.togglePaidReactionPrivacy',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
        'private': isPrivate,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.togglePaidReactionPrivacy error:', err)
      return null
    }
  }

  public async getPaidReactionPrivacy(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getPaidReactionPrivacy',
        ...params,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getPaidReactionPrivacy error:', err)
      return null
    }
  }

  public async viewSponsoredMessage(holder: RpcClientHolder, randomId?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.viewSponsoredMessage',
        'random_id': randomId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.viewSponsoredMessage error:', err)
      return null
    }
  }

  public async clickSponsoredMessage(holder: RpcClientHolder, media?: boolean, fullscreen?: boolean, randomId?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.clickSponsoredMessage',
        'media': media,
        'fullscreen': fullscreen,
        'random_id': randomId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.clickSponsoredMessage error:', err)
      return null
    }
  }

  public async reportSponsoredMessage(holder: RpcClientHolder, randomId?: any, option?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.reportSponsoredMessage',
        'random_id': randomId,
        'option': option,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.reportSponsoredMessage error:', err)
      return null
    }
  }

  public async getSponsoredMessages(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getSponsoredMessages',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getSponsoredMessages error:', err)
      return null
    }
  }

  public async savePreparedInlineMessage(holder: RpcClientHolder, accountId: string, result?: any, userIdId?: string, peerTypes?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.savePreparedInlineMessage',
        'result': result,
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
        'peer_types': peerTypes,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.savePreparedInlineMessage error:', err)
      return null
    }
  }

  public async getPreparedInlineMessage(holder: RpcClientHolder, accountId: string, botId?: string, id?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getPreparedInlineMessage',
        'bot': botId ? await this.toInputUser(accountId, botId) : undefined,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getPreparedInlineMessage error:', err)
      return null
    }
  }

  public async searchStickers(holder: RpcClientHolder, emojis?: boolean, q?: string, emoticon?: string, langCode?: string, offset?: number, limit?: number, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.searchStickers',
        'emojis': emojis,
        'q': q,
        'emoticon': emoticon,
        'lang_code': langCode,
        'offset': offset,
        'limit': limit,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.searchStickers error:', err)
      return null
    }
  }

  public async reportMessagesDelivery(holder: RpcClientHolder, accountId: string, push?: boolean, peerId?: string, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.reportMessagesDelivery',
        'push': push,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.reportMessagesDelivery error:', err)
      return null
    }
  }

  public async getSavedDialogsByID(holder: RpcClientHolder, accountId: string, parentPeerId?: string, idsId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getSavedDialogsByID',
        'parent_peer': parentPeerId ? await this.resolveInputPeer(accountId, parentPeerId) : undefined,
        'ids': idsId ? await this.resolveInputPeer(accountId, idsId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getSavedDialogsByID error:', err)
      return null
    }
  }

  public async readSavedHistory(holder: RpcClientHolder, accountId: string, parentPeerId?: string, peerId?: string, maxId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.readSavedHistory',
        'parent_peer': parentPeerId ? await this.resolveInputPeer(accountId, parentPeerId) : undefined,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'max_id': maxId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.readSavedHistory error:', err)
      return null
    }
  }

  public async toggleTodoCompleted(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number, completed?: number, incompleted?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.toggleTodoCompleted',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
        'completed': completed,
        'incompleted': incompleted,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.toggleTodoCompleted error:', err)
      return null
    }
  }

  public async appendTodoList(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number, list?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.appendTodoList',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
        'list': list,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.appendTodoList error:', err)
      return null
    }
  }

  public async toggleSuggestedPostApproval(holder: RpcClientHolder, accountId: string, reject?: boolean, peerId?: string, msgId?: number, scheduleDate?: number, rejectComment?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.toggleSuggestedPostApproval',
        'reject': reject,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
        'schedule_date': scheduleDate,
        'reject_comment': rejectComment,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.toggleSuggestedPostApproval error:', err)
      return null
    }
  }

  public async getForumTopics(holder: RpcClientHolder, accountId: string, peerId?: string, q?: string, offsetDate?: number, offsetId?: number, offsetTopic?: number, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getForumTopics',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'q': q,
        'offset_date': offsetDate,
        'offset_id': offsetId,
        'offset_topic': offsetTopic,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getForumTopics error:', err)
      return null
    }
  }

  public async getForumTopicsByID(holder: RpcClientHolder, accountId: string, peerId?: string, topics?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getForumTopicsByID',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'topics': topics,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getForumTopicsByID error:', err)
      return null
    }
  }

  public async editForumTopic(holder: RpcClientHolder, accountId: string, peerId?: string, topicId?: number, title?: string, iconEmojiId?: bigint | number, closed?: boolean, hidden?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.editForumTopic',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'topic_id': topicId,
        'title': title,
        'icon_emoji_id': iconEmojiId,
        'closed': closed,
        'hidden': hidden,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.editForumTopic error:', err)
      return null
    }
  }

  public async updatePinnedForumTopic(holder: RpcClientHolder, accountId: string, peerId?: string, topicId?: number, pinned?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.updatePinnedForumTopic',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'topic_id': topicId,
        'pinned': pinned,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.updatePinnedForumTopic error:', err)
      return null
    }
  }

  public async reorderPinnedForumTopics(holder: RpcClientHolder, accountId: string, force?: boolean, peerId?: string, order?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.reorderPinnedForumTopics',
        'force': force,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'order': order,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.reorderPinnedForumTopics error:', err)
      return null
    }
  }

  public async createForumTopic(holder: RpcClientHolder, accountId: string, titleMissing?: boolean, peerId?: string, title?: string, iconColor?: number, iconEmojiId?: bigint | number, randomId?: bigint | number, sendAsId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.createForumTopic',
        'title_missing': titleMissing,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'title': title,
        'icon_color': iconColor,
        'icon_emoji_id': iconEmojiId,
        'random_id': randomId,
        'send_as': sendAsId ? await this.resolveInputPeer(accountId, sendAsId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.createForumTopic error:', err)
      return null
    }
  }

  public async deleteTopicHistory(holder: RpcClientHolder, accountId: string, peerId?: string, topMsgId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.deleteTopicHistory',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'top_msg_id': topMsgId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.deleteTopicHistory error:', err)
      return null
    }
  }

  public async getEmojiGameInfo(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getEmojiGameInfo',
        ...params,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getEmojiGameInfo error:', err)
      return null
    }
  }

  public async summarizeText(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number, toLang?: string, tone?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.summarizeText',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
        'to_lang': toLang,
        'tone': tone,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.summarizeText error:', err)
      return null
    }
  }

  public async editChatCreator(holder: RpcClientHolder, accountId: string, peerId?: string, userIdId?: string, password?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.editChatCreator',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
        'password': password,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.editChatCreator error:', err)
      return null
    }
  }

  public async getFutureChatCreatorAfterLeave(holder: RpcClientHolder, accountId: string, peerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getFutureChatCreatorAfterLeave',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getFutureChatCreatorAfterLeave error:', err)
      return null
    }
  }

  public async editChatParticipantRank(holder: RpcClientHolder, accountId: string, peerId?: string, participantId?: string, rank?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.editChatParticipantRank',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'participant': participantId ? await this.resolveInputPeer(accountId, participantId) : undefined,
        'rank': rank,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.editChatParticipantRank error:', err)
      return null
    }
  }

  public async declineUrlAuth(holder: RpcClientHolder, url?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.declineUrlAuth',
        'url': url,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.declineUrlAuth error:', err)
      return null
    }
  }

  public async checkUrlAuthMatchCode(holder: RpcClientHolder, url?: string, matchCode?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.checkUrlAuthMatchCode',
        'url': url,
        'match_code': matchCode,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.checkUrlAuthMatchCode error:', err)
      return null
    }
  }

  public async composeMessageWithAI(holder: RpcClientHolder, proofread?: boolean, emojify?: boolean, text?: any, translateToLang?: string, tone?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.composeMessageWithAI',
        'proofread': proofread,
        'emojify': emojify,
        'text': text,
        'translate_to_lang': translateToLang,
        'tone': tone,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.composeMessageWithAI error:', err)
      return null
    }
  }

  public async reportReadMetrics(holder: RpcClientHolder, accountId: string, peerId?: string, metrics?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.reportReadMetrics',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'metrics': metrics,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.reportReadMetrics error:', err)
      return null
    }
  }

  public async reportMusicListen(holder: RpcClientHolder, id?: any, listenedDuration?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.reportMusicListen',
        'id': id,
        'listened_duration': listenedDuration,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.reportMusicListen error:', err)
      return null
    }
  }

  public async addPollAnswer(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number, answer?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.addPollAnswer',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
        'answer': answer,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.addPollAnswer error:', err)
      return null
    }
  }

  public async deletePollAnswer(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number, option?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.deletePollAnswer',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
        'option': option,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.deletePollAnswer error:', err)
      return null
    }
  }

  public async getUnreadPollVotes(holder: RpcClientHolder, accountId: string, peerId?: string, topMsgId?: number, offsetId?: number, addOffset?: number, limit?: number, maxId?: number, minId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getUnreadPollVotes',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'top_msg_id': topMsgId,
        'offset_id': offsetId,
        'add_offset': addOffset,
        'limit': limit,
        'max_id': maxId,
        'min_id': minId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getUnreadPollVotes error:', err)
      return null
    }
  }

  public async readPollVotes(holder: RpcClientHolder, accountId: string, peerId?: string, topMsgId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.readPollVotes',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'top_msg_id': topMsgId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.readPollVotes error:', err)
      return null
    }
  }

  public async setBotGuestChatResult(holder: RpcClientHolder, queryId?: bigint | number, result?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.setBotGuestChatResult',
        'query_id': queryId,
        'result': result,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.setBotGuestChatResult error:', err)
      return null
    }
  }

  public async deleteParticipantReactions(holder: RpcClientHolder, accountId: string, peerId?: string, participantId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.deleteParticipantReactions',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'participant': participantId ? await this.resolveInputPeer(accountId, participantId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.deleteParticipantReactions error:', err)
      return null
    }
  }

  public async deleteParticipantReaction(holder: RpcClientHolder, accountId: string, peerId?: string, msgId?: number, participantId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.deleteParticipantReaction',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'msg_id': msgId,
        'participant': participantId ? await this.resolveInputPeer(accountId, participantId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.deleteParticipantReaction error:', err)
      return null
    }
  }

  public async getPersonalChannelHistory(holder: RpcClientHolder, accountId: string, userIdId?: string, limit?: number, maxId?: number, minId?: number, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getPersonalChannelHistory',
        'user_id': userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
        'limit': limit,
        'max_id': maxId,
        'min_id': minId,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getPersonalChannelHistory error:', err)
      return null
    }
  }

  public async getRichMessage(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getRichMessage',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getRichMessage error:', err)
      return null
    }
  }

  public async translateRichMessage(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number, text?: any, toLang?: string, tone?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.translateRichMessage',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
        'text': text,
        'to_lang': toLang,
        'tone': tone,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.translateRichMessage error:', err)
      return null
    }
  }

  public async composeRichMessageWithAI(holder: RpcClientHolder, proofread?: boolean, emojify?: boolean, text?: any, translateToLang?: string, tone?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.composeRichMessageWithAI',
        'proofread': proofread,
        'emojify': emojify,
        'text': text,
        'translate_to_lang': translateToLang,
        'tone': tone,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.composeRichMessageWithAI error:', err)
      return null
    }
  }

  public async requestChatJoinWebView(holder: RpcClientHolder, queryId?: bigint | number, themeParams?: any, platform?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.requestChatJoinWebView',
        'query_id': queryId,
        'theme_params': themeParams,
        'platform': platform,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.requestChatJoinWebView error:', err)
      return null
    }
  }

  public async setShareTheme(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.setShareTheme',
        ...params,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.setShareTheme error:', err)
      return null
    }
  }

  public async getShareThemeBackdrops(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'messages.getShareThemeBackdrops',
        ...params,
      })
    } catch (err) {
      Logger.warn('[MessagingService] messages.getShareThemeBackdrops error:', err)
      return null
    }
  }

  // ==================== STORIES METHODS (33) ====================

  public async stories_canSendStory(holder: RpcClientHolder, accountId: string, peerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.canSendStory',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.canSendStory error:', err)
      return null
    }
  }

  public async stories_sendStory(holder: RpcClientHolder, accountId: string, pinned?: boolean, noforwards?: boolean, fwdModified?: boolean, peerId?: string, media?: any, mediaAreas?: any, caption?: string, entities?: any, privacyRules?: any, randomId?: bigint | number, period?: number, fwdFromIdId?: string, fwdFromStory?: number, albums?: number, music?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.sendStory',
        'pinned': pinned,
        'noforwards': noforwards,
        'fwd_modified': fwdModified,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'media': media,
        'media_areas': mediaAreas,
        'caption': caption,
        'entities': entities,
        'privacy_rules': privacyRules,
        'random_id': randomId,
        'period': period,
        'fwd_from_id': fwdFromIdId ? await this.resolveInputPeer(accountId, fwdFromIdId) : undefined,
        'fwd_from_story': fwdFromStory,
        'albums': albums,
        'music': music,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.sendStory error:', err)
      return null
    }
  }

  public async stories_editStory(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number, media?: any, mediaAreas?: any, caption?: string, entities?: any, privacyRules?: any, music?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.editStory',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
        'media': media,
        'media_areas': mediaAreas,
        'caption': caption,
        'entities': entities,
        'privacy_rules': privacyRules,
        'music': music,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.editStory error:', err)
      return null
    }
  }

  public async stories_deleteStories(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.deleteStories',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.deleteStories error:', err)
      return null
    }
  }

  public async stories_togglePinned(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number, pinned?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.togglePinned',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
        'pinned': pinned,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.togglePinned error:', err)
      return null
    }
  }

  public async stories_getAllStories(holder: RpcClientHolder, next?: boolean, hidden?: boolean, state?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.getAllStories',
        'next': next,
        'hidden': hidden,
        'state': state,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.getAllStories error:', err)
      return null
    }
  }

  public async stories_getPinnedStories(holder: RpcClientHolder, accountId: string, peerId?: string, offsetId?: number, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.getPinnedStories',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'offset_id': offsetId,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.getPinnedStories error:', err)
      return null
    }
  }

  public async stories_getStoriesArchive(holder: RpcClientHolder, accountId: string, peerId?: string, offsetId?: number, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.getStoriesArchive',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'offset_id': offsetId,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.getStoriesArchive error:', err)
      return null
    }
  }

  public async stories_getStoriesByID(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.getStoriesByID',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.getStoriesByID error:', err)
      return null
    }
  }

  public async stories_toggleAllStoriesHidden(holder: RpcClientHolder, hidden?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.toggleAllStoriesHidden',
        'hidden': hidden,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.toggleAllStoriesHidden error:', err)
      return null
    }
  }

  public async stories_readStories(holder: RpcClientHolder, accountId: string, peerId?: string, maxId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.readStories',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'max_id': maxId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.readStories error:', err)
      return null
    }
  }

  public async stories_incrementStoryViews(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.incrementStoryViews',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.incrementStoryViews error:', err)
      return null
    }
  }

  public async stories_getStoryViewsList(holder: RpcClientHolder, accountId: string, justContacts?: boolean, reactionsFirst?: boolean, forwardsFirst?: boolean, peerId?: string, q?: string, id?: number, offset?: string, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.getStoryViewsList',
        'just_contacts': justContacts,
        'reactions_first': reactionsFirst,
        'forwards_first': forwardsFirst,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'q': q,
        'id': id,
        'offset': offset,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.getStoryViewsList error:', err)
      return null
    }
  }

  public async stories_getStoriesViews(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.getStoriesViews',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.getStoriesViews error:', err)
      return null
    }
  }

  public async stories_exportStoryLink(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.exportStoryLink',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.exportStoryLink error:', err)
      return null
    }
  }

  public async stories_report(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number, option?: any, message?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.report',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
        'option': option,
        'message': message,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.report error:', err)
      return null
    }
  }

  public async stories_activateStealthMode(holder: RpcClientHolder, past?: boolean, future?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.activateStealthMode',
        'past': past,
        'future': future,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.activateStealthMode error:', err)
      return null
    }
  }

  public async stories_sendReaction(holder: RpcClientHolder, accountId: string, addToRecent?: boolean, peerId?: string, storyId?: number, reaction?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.sendReaction',
        'add_to_recent': addToRecent,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'story_id': storyId,
        'reaction': reaction,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.sendReaction error:', err)
      return null
    }
  }

  public async stories_getPeerStories(holder: RpcClientHolder, accountId: string, peerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.getPeerStories',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.getPeerStories error:', err)
      return null
    }
  }

  public async stories_getAllReadPeerStories(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.getAllReadPeerStories',
        ...params,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.getAllReadPeerStories error:', err)
      return null
    }
  }

  public async stories_getPeerMaxIDs(holder: RpcClientHolder, accountId: string, idId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.getPeerMaxIDs',
        'id': idId ? await this.resolveInputPeer(accountId, idId) : undefined,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.getPeerMaxIDs error:', err)
      return null
    }
  }

  public async stories_getChatsToSend(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.getChatsToSend',
        ...params,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.getChatsToSend error:', err)
      return null
    }
  }

  public async stories_togglePeerStoriesHidden(holder: RpcClientHolder, accountId: string, peerId?: string, hidden?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.togglePeerStoriesHidden',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'hidden': hidden,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.togglePeerStoriesHidden error:', err)
      return null
    }
  }

  public async stories_getStoryReactionsList(holder: RpcClientHolder, accountId: string, forwardsFirst?: boolean, peerId?: string, id?: number, reaction?: any, offset?: string, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.getStoryReactionsList',
        'forwards_first': forwardsFirst,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
        'reaction': reaction,
        'offset': offset,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.getStoryReactionsList error:', err)
      return null
    }
  }

  public async stories_togglePinnedToTop(holder: RpcClientHolder, accountId: string, peerId?: string, id?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.togglePinnedToTop',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'id': id,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.togglePinnedToTop error:', err)
      return null
    }
  }

  public async stories_searchPosts(holder: RpcClientHolder, accountId: string, hashtag?: string, area?: any, peerId?: string, offset?: string, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.searchPosts',
        'hashtag': hashtag,
        'area': area,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'offset': offset,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.searchPosts error:', err)
      return null
    }
  }

  public async stories_createAlbum(holder: RpcClientHolder, accountId: string, peerId?: string, title?: string, stories?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.createAlbum',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'title': title,
        'stories': stories,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.createAlbum error:', err)
      return null
    }
  }

  public async stories_updateAlbum(holder: RpcClientHolder, accountId: string, peerId?: string, albumId?: number, title?: string, deleteStories?: number, addStories?: number, order?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.updateAlbum',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'album_id': albumId,
        'title': title,
        'delete_stories': deleteStories,
        'add_stories': addStories,
        'order': order,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.updateAlbum error:', err)
      return null
    }
  }

  public async stories_reorderAlbums(holder: RpcClientHolder, accountId: string, peerId?: string, order?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.reorderAlbums',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'order': order,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.reorderAlbums error:', err)
      return null
    }
  }

  public async stories_deleteAlbum(holder: RpcClientHolder, accountId: string, peerId?: string, albumId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.deleteAlbum',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'album_id': albumId,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.deleteAlbum error:', err)
      return null
    }
  }

  public async stories_getAlbums(holder: RpcClientHolder, accountId: string, peerId?: string, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.getAlbums',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'hash': hash,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.getAlbums error:', err)
      return null
    }
  }

  public async stories_getAlbumStories(holder: RpcClientHolder, accountId: string, peerId?: string, albumId?: number, offset?: number, limit?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.getAlbumStories',
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'album_id': albumId,
        'offset': offset,
        'limit': limit,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.getAlbumStories error:', err)
      return null
    }
  }

  public async stories_startLive(holder: RpcClientHolder, accountId: string, pinned?: boolean, noforwards?: boolean, rtmpStream?: boolean, peerId?: string, caption?: string, entities?: any, privacyRules?: any, randomId?: bigint | number, messagesEnabled?: boolean, sendPaidMessagesStars?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'stories.startLive',
        'pinned': pinned,
        'noforwards': noforwards,
        'rtmp_stream': rtmpStream,
        'peer': peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        'caption': caption,
        'entities': entities,
        'privacy_rules': privacyRules,
        'random_id': randomId,
        'messages_enabled': messagesEnabled,
        'send_paid_messages_stars': sendPaidMessagesStars,
      })
    } catch (err) {
      Logger.warn('[MessagingService] stories.startLive error:', err)
      return null
    }
  }
}
