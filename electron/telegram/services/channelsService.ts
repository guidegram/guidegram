import { Logger } from '../logger'

export interface RpcClientHolder {
  client: {
    call: (query: { _: string; [key: string]: any }) => Promise<any>
    resolvePeer?: (peer: string) => Promise<any>
  }
}

/**
 * Enterprise Channels & Supergroups Administration Domain Service for Guidegram
 * Comprehensive implementation of all 58 MTProto methods across channels.*
 */
export class ChannelsService {
  private resolveInputPeer: (accountId: string, peerId: string) => Promise<any>

  constructor(resolveInputPeer: (accountId: string, peerId: string) => Promise<any>) {
    this.resolveInputPeer = resolveInputPeer
  }

  private async toInputChannel(accountId: string, channelId: string): Promise<any> {
    const peer = await this.resolveInputPeer(accountId, channelId)
    if (peer._ === 'inputPeerChannel') {
      return { _: 'inputChannel', channelId: peer.channelId, accessHash: peer.accessHash }
    }
    return { _: 'inputChannelEmpty' }
  }

  public async readHistory(holder: RpcClientHolder, accountId: string, channelId: string, maxId: number): Promise<boolean> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const res = await holder.client.call({
        _: 'channels.readHistory',
        channel,
        maxId,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ChannelsService] readHistory error:', err)
      return false
    }
  }

  public async deleteMessages(holder: RpcClientHolder, accountId: string, channelId: string, id: number[]): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.deleteMessages',
        channel,
        id,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] deleteMessages error:', err)
      return null
    }
  }

  public async reportSpam(holder: RpcClientHolder, accountId: string, channelId: string, participantId: string, id: number[]): Promise<boolean> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const participant = await this.resolveInputPeer(accountId, participantId)
      const res = await holder.client.call({
        _: 'channels.reportSpam',
        channel,
        participant,
        id,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ChannelsService] reportSpam error:', err)
      return false
    }
  }

  public async getMessages(holder: RpcClientHolder, accountId: string, channelId: string, id: any[]): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.getMessages',
        channel,
        id,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] getMessages error:', err)
      return null
    }
  }

  public async getParticipants(
    holder: RpcClientHolder,
    accountId: string,
    channelId: string,
    filterName = 'recent',
    offset = 0,
    limit = 50,
    hash = 0n
  ): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const filter = { _: `channelParticipants${filterName.charAt(0).toUpperCase() + filterName.slice(1)}` }
      return await holder.client.call({
        _: 'channels.getParticipants',
        channel,
        filter,
        offset,
        limit,
        hash: BigInt(hash),
      })
    } catch (err) {
      Logger.warn('[ChannelsService] getParticipants error:', err)
      return null
    }
  }

  public async getParticipant(holder: RpcClientHolder, accountId: string, channelId: string, participantId: string): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const participant = await this.resolveInputPeer(accountId, participantId)
      return await holder.client.call({
        _: 'channels.getParticipant',
        channel,
        participant,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] getParticipant error:', err)
      return null
    }
  }

  public async getChannels(holder: RpcClientHolder, accountId: string, channelIds: string[]): Promise<any[]> {
    try {
      const inputChannels: any[] = []
      for (const cid of channelIds) {
        inputChannels.push(await this.toInputChannel(accountId, cid))
      }
      const res = await holder.client.call({
        _: 'channels.getChannels',
        id: inputChannels,
      })
      return Array.isArray(res?.chats) ? res.chats : []
    } catch (err) {
      Logger.warn('[ChannelsService] getChannels error:', err)
      return []
    }
  }

  public async getFullChannel(holder: RpcClientHolder, accountId: string, channelId: string): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.getFullChannel',
        channel,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] getFullChannel error:', err)
      return null
    }
  }

  public async createChannel(
    holder: RpcClientHolder,
    title: string,
    about = '',
    options?: {
      broadcast?: boolean
      megagroup?: boolean
      forum?: boolean
      ttlPeriod?: number
    }
  ): Promise<any> {
    try {
      return await holder.client.call({
        _: 'channels.createChannel',
        broadcast: Boolean(options?.broadcast),
        megagroup: Boolean(options?.megagroup ?? true),
        forum: Boolean(options?.forum),
        title,
        about,
        ttlPeriod: options?.ttlPeriod ? Number(options.ttlPeriod) : undefined,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] createChannel error:', err)
      return null
    }
  }

  public async editAdmin(
    holder: RpcClientHolder,
    accountId: string,
    channelId: string,
    userId: string,
    adminRights: any,
    rank = ''
  ): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const peer = await this.resolveInputPeer(accountId, userId)
      const inputUser =
        peer._ === 'inputPeerUser'
          ? { _: 'inputUser', userId: peer.userId, accessHash: peer.accessHash }
          : { _: 'inputUserEmpty' }

      return await holder.client.call({
        _: 'channels.editAdmin',
        channel,
        userId: inputUser,
        adminRights,
        rank: rank || undefined,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] editAdmin error:', err)
      return null
    }
  }

  public async editTitle(holder: RpcClientHolder, accountId: string, channelId: string, title: string): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.editTitle',
        channel,
        title,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] editTitle error:', err)
      return null
    }
  }

  public async editPhoto(holder: RpcClientHolder, accountId: string, channelId: string, photo: any): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.editPhoto',
        channel,
        photo,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] editPhoto error:', err)
      return null
    }
  }

  public async checkUsername(holder: RpcClientHolder, accountId: string, channelId: string, username: string): Promise<boolean> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const res = await holder.client.call({
        _: 'channels.checkUsername',
        channel,
        username: username.replace(/^@/, ''),
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ChannelsService] checkUsername error:', err)
      return false
    }
  }

  public async updateUsername(holder: RpcClientHolder, accountId: string, channelId: string, username: string): Promise<boolean> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const res = await holder.client.call({
        _: 'channels.updateUsername',
        channel,
        username: username.replace(/^@/, ''),
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ChannelsService] updateUsername error:', err)
      return false
    }
  }

  public async joinChannel(holder: RpcClientHolder, accountId: string, channelId: string): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.joinChannel',
        channel,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] joinChannel error:', err)
      return null
    }
  }

  public async leaveChannel(holder: RpcClientHolder, accountId: string, channelId: string): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.leaveChannel',
        channel,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] leaveChannel error:', err)
      return null
    }
  }

  public async inviteToChannel(holder: RpcClientHolder, accountId: string, channelId: string, userIds: string[]): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const inputUsers: any[] = []
      for (const uid of userIds) {
        const peer = await this.resolveInputPeer(accountId, uid)
        if (peer._ === 'inputPeerUser') {
          inputUsers.push({ _: 'inputUser', userId: peer.userId, accessHash: peer.accessHash })
        }
      }
      return await holder.client.call({
        _: 'channels.inviteToChannel',
        channel,
        users: inputUsers,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] inviteToChannel error:', err)
      return null
    }
  }

  public async deleteChannel(holder: RpcClientHolder, accountId: string, channelId: string): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.deleteChannel',
        channel,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] deleteChannel error:', err)
      return null
    }
  }

  public async exportMessageLink(
    holder: RpcClientHolder,
    accountId: string,
    channelId: string,
    messageId: number,
    grouped = false,
    thread = false
  ): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.exportMessageLink',
        channel,
        id: messageId,
        grouped: Boolean(grouped),
        thread: Boolean(thread),
      })
    } catch (err) {
      Logger.warn('[ChannelsService] exportMessageLink error:', err)
      return null
    }
  }

  public async toggleSignatures(
    holder: RpcClientHolder,
    accountId: string,
    channelId: string,
    signaturesEnabled = true,
    profilesEnabled = false
  ): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.toggleSignatures',
        channel,
        signaturesEnabled: Boolean(signaturesEnabled),
        profilesEnabled: Boolean(profilesEnabled),
      })
    } catch (err) {
      Logger.warn('[ChannelsService] toggleSignatures error:', err)
      return null
    }
  }

  public async getAdminedPublicChannels(holder: RpcClientHolder, options?: any): Promise<any[]> {
    try {
      const res = await holder.client.call({
        _: 'channels.getAdminedPublicChannels',
        byLocation: Boolean(options?.byLocation),
        checkLimit: Boolean(options?.checkLimit),
        forPersonal: Boolean(options?.forPersonal),
        forCommunityPeer: Boolean(options?.forCommunityPeer),
      })
      return Array.isArray(res?.chats) ? res.chats : []
    } catch (err) {
      Logger.warn('[ChannelsService] getAdminedPublicChannels error:', err)
      return []
    }
  }

  public async editBanned(
    holder: RpcClientHolder,
    accountId: string,
    channelId: string,
    participantId: string,
    bannedRights: any
  ): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const participant = await this.resolveInputPeer(accountId, participantId)
      return await holder.client.call({
        _: 'channels.editBanned',
        channel,
        participant,
        bannedRights,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] editBanned error:', err)
      return null
    }
  }

  public async getAdminLog(
    holder: RpcClientHolder,
    accountId: string,
    channelId: string,
    options?: {
      q?: string
      eventsFilter?: any
      admins?: string[]
      maxId?: bigint
      minId?: bigint
      limit?: number
    }
  ): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      let inputAdmins: any[] | undefined
      if (options?.admins && options.admins.length > 0) {
        inputAdmins = []
        for (const a of options.admins) {
          const peer = await this.resolveInputPeer(accountId, a)
          if (peer._ === 'inputPeerUser') {
            inputAdmins.push({ _: 'inputUser', userId: peer.userId, accessHash: peer.accessHash })
          }
        }
      }
      return await holder.client.call({
        _: 'channels.getAdminLog',
        channel,
        q: options?.q || '',
        eventsFilter: options?.eventsFilter || undefined,
        admins: inputAdmins,
        maxId: options?.maxId ? BigInt(options.maxId) : 0n,
        minId: options?.minId ? BigInt(options.minId) : 0n,
        limit: options?.limit || 50,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] getAdminLog error:', err)
      return null
    }
  }

  public async setStickers(holder: RpcClientHolder, accountId: string, channelId: string, stickerset: any): Promise<boolean> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const res = await holder.client.call({
        _: 'channels.setStickers',
        channel,
        stickerset,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ChannelsService] setStickers error:', err)
      return false
    }
  }

  public async readMessageContents(holder: RpcClientHolder, accountId: string, channelId: string, id: number[]): Promise<boolean> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const res = await holder.client.call({
        _: 'channels.readMessageContents',
        channel,
        id,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ChannelsService] readMessageContents error:', err)
      return false
    }
  }

  public async deleteHistory(holder: RpcClientHolder, accountId: string, channelId: string, maxId: number, forEveryone = true): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.deleteHistory',
        channel,
        maxId,
        forEveryone: Boolean(forEveryone),
      })
    } catch (err) {
      Logger.warn('[ChannelsService] deleteHistory error:', err)
      return null
    }
  }

  public async togglePreHistoryHidden(holder: RpcClientHolder, accountId: string, channelId: string, enabled: boolean): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.togglePreHistoryHidden',
        channel,
        enabled: Boolean(enabled),
      })
    } catch (err) {
      Logger.warn('[ChannelsService] togglePreHistoryHidden error:', err)
      return null
    }
  }

  public async getLeftChannels(holder: RpcClientHolder, offset = 0): Promise<any[]> {
    try {
      const res = await holder.client.call({
        _: 'channels.getLeftChannels',
        offset,
      })
      return Array.isArray(res?.chats) ? res.chats : []
    } catch (err) {
      Logger.warn('[ChannelsService] getLeftChannels error:', err)
      return []
    }
  }

  public async getGroupsForDiscussion(holder: RpcClientHolder): Promise<any[]> {
    try {
      const res = await holder.client.call({
        _: 'channels.getGroupsForDiscussion',
      })
      return Array.isArray(res?.chats) ? res.chats : []
    } catch (err) {
      Logger.warn('[ChannelsService] getGroupsForDiscussion error:', err)
      return []
    }
  }

  public async setDiscussionGroup(holder: RpcClientHolder, accountId: string, broadcastId: string, groupId: string): Promise<boolean> {
    try {
      const broadcast = await this.toInputChannel(accountId, broadcastId)
      const group = await this.toInputChannel(accountId, groupId)
      const res = await holder.client.call({
        _: 'channels.setDiscussionGroup',
        broadcast,
        group,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ChannelsService] setDiscussionGroup error:', err)
      return false
    }
  }

  public async editLocation(holder: RpcClientHolder, accountId: string, channelId: string, lat: number, long: number, address: string): Promise<boolean> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const res = await holder.client.call({
        _: 'channels.editLocation',
        channel,
        geoPoint: { _: 'inputGeoPoint', lat, long },
        address,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ChannelsService] editLocation error:', err)
      return false
    }
  }

  public async toggleSlowMode(holder: RpcClientHolder, accountId: string, channelId: string, seconds: number): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.toggleSlowMode',
        channel,
        seconds,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] toggleSlowMode error:', err)
      return null
    }
  }

  public async getInactiveChannels(holder: RpcClientHolder): Promise<any[]> {
    try {
      const res = await holder.client.call({
        _: 'channels.getInactiveChannels',
      })
      return Array.isArray(res?.chats) ? res.chats : []
    } catch (err) {
      Logger.warn('[ChannelsService] getInactiveChannels error:', err)
      return []
    }
  }

  public async convertToGigagroup(holder: RpcClientHolder, accountId: string, channelId: string): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.convertToGigagroup',
        channel,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] convertToGigagroup error:', err)
      return null
    }
  }

  public async getSendAs(holder: RpcClientHolder, accountId: string, peerId: string): Promise<any[]> {
    try {
      const peer = await this.resolveInputPeer(accountId, peerId)
      const res = await holder.client.call({
        _: 'channels.getSendAs',
        peer,
      })
      return Array.isArray(res?.peers) ? res.peers : []
    } catch (err) {
      Logger.warn('[ChannelsService] getSendAs error:', err)
      return []
    }
  }

  public async deleteParticipantHistory(holder: RpcClientHolder, accountId: string, channelId: string, participantId: string): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const participant = await this.resolveInputPeer(accountId, participantId)
      return await holder.client.call({
        _: 'channels.deleteParticipantHistory',
        channel,
        participant,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] deleteParticipantHistory error:', err)
      return null
    }
  }

  public async toggleJoinToSend(holder: RpcClientHolder, accountId: string, channelId: string, enabled: boolean): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.toggleJoinToSend',
        channel,
        enabled: Boolean(enabled),
      })
    } catch (err) {
      Logger.warn('[ChannelsService] toggleJoinToSend error:', err)
      return null
    }
  }

  public async toggleJoinRequest(holder: RpcClientHolder, accountId: string, channelId: string, enabled: boolean, applyToInvites = true): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.toggleJoinRequest',
        channel,
        enabled: Boolean(enabled),
        applyToInvites: Boolean(applyToInvites),
      })
    } catch (err) {
      Logger.warn('[ChannelsService] toggleJoinRequest error:', err)
      return null
    }
  }

  public async reorderUsernames(holder: RpcClientHolder, accountId: string, channelId: string, order: string[]): Promise<boolean> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const res = await holder.client.call({
        _: 'channels.reorderUsernames',
        channel,
        order,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ChannelsService] reorderUsernames error:', err)
      return false
    }
  }

  public async toggleUsername(holder: RpcClientHolder, accountId: string, channelId: string, username: string, active: boolean): Promise<boolean> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const res = await holder.client.call({
        _: 'channels.toggleUsername',
        channel,
        username,
        active: Boolean(active),
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ChannelsService] toggleUsername error:', err)
      return false
    }
  }

  public async deactivateAllUsernames(holder: RpcClientHolder, accountId: string, channelId: string): Promise<boolean> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const res = await holder.client.call({
        _: 'channels.deactivateAllUsernames',
        channel,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ChannelsService] deactivateAllUsernames error:', err)
      return false
    }
  }

  public async toggleForum(holder: RpcClientHolder, accountId: string, channelId: string, enabled: boolean, tabs = true): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.toggleForum',
        channel,
        enabled: Boolean(enabled),
        tabs: Boolean(tabs),
      })
    } catch (err) {
      Logger.warn('[ChannelsService] toggleForum error:', err)
      return null
    }
  }

  public async toggleAntiSpam(holder: RpcClientHolder, accountId: string, channelId: string, enabled: boolean): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.toggleAntiSpam',
        channel,
        enabled: Boolean(enabled),
      })
    } catch (err) {
      Logger.warn('[ChannelsService] toggleAntiSpam error:', err)
      return null
    }
  }

  public async reportAntiSpamFalsePositive(holder: RpcClientHolder, accountId: string, channelId: string, msgId: number): Promise<boolean> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const res = await holder.client.call({
        _: 'channels.reportAntiSpamFalsePositive',
        channel,
        msgId,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ChannelsService] reportAntiSpamFalsePositive error:', err)
      return false
    }
  }

  public async toggleParticipantsHidden(holder: RpcClientHolder, accountId: string, channelId: string, enabled: boolean): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.toggleParticipantsHidden',
        channel,
        enabled: Boolean(enabled),
      })
    } catch (err) {
      Logger.warn('[ChannelsService] toggleParticipantsHidden error:', err)
      return null
    }
  }

  public async updateColor(holder: RpcClientHolder, accountId: string, channelId: string, color: number, forProfile = false, backgroundEmojiId?: bigint): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.updateColor',
        channel,
        color,
        forProfile: Boolean(forProfile),
        backgroundEmojiId: backgroundEmojiId ? BigInt(backgroundEmojiId) : undefined,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] updateColor error:', err)
      return null
    }
  }

  public async toggleViewForumAsMessages(holder: RpcClientHolder, accountId: string, channelId: string, enabled: boolean): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.toggleViewForumAsMessages',
        channel,
        enabled: Boolean(enabled),
      })
    } catch (err) {
      Logger.warn('[ChannelsService] toggleViewForumAsMessages error:', err)
      return null
    }
  }

  public async getChannelRecommendations(holder: RpcClientHolder, accountId?: string, channelId?: string): Promise<any[]> {
    try {
      let inputChannel: any
      if (accountId && channelId) {
        inputChannel = await this.toInputChannel(accountId, channelId)
      }
      const res = await holder.client.call({
        _: 'channels.getChannelRecommendations',
        channel: inputChannel || undefined,
      })
      return Array.isArray(res?.chats) ? res.chats : []
    } catch (err) {
      Logger.warn('[ChannelsService] getChannelRecommendations error:', err)
      return []
    }
  }

  public async updateEmojiStatus(holder: RpcClientHolder, accountId: string, channelId: string, emojiStatus: any): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.updateEmojiStatus',
        channel,
        emojiStatus,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] updateEmojiStatus error:', err)
      return null
    }
  }

  public async setBoostsToUnblockRestrictions(holder: RpcClientHolder, accountId: string, channelId: string, boosts: number): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.setBoostsToUnblockRestrictions',
        channel,
        boosts,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] setBoostsToUnblockRestrictions error:', err)
      return null
    }
  }

  public async setEmojiStickers(holder: RpcClientHolder, accountId: string, channelId: string, stickerset: any): Promise<boolean> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const res = await holder.client.call({
        _: 'channels.setEmojiStickers',
        channel,
        stickerset,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ChannelsService] setEmojiStickers error:', err)
      return false
    }
  }

  public async restrictSponsoredMessages(holder: RpcClientHolder, accountId: string, channelId: string, restricted: boolean): Promise<boolean> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const res = await holder.client.call({
        _: 'channels.restrictSponsoredMessages',
        channel,
        restricted: Boolean(restricted),
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ChannelsService] restrictSponsoredMessages error:', err)
      return false
    }
  }

  public async searchPosts(
    holder: RpcClientHolder,
    accountId: string,
    query: string,
    hashtag?: string,
    offsetId = 0,
    limit = 50
  ): Promise<any> {
    try {
      return await holder.client.call({
        _: 'channels.searchPosts',
        query,
        hashtag: hashtag || undefined,
        offsetId,
        offsetRate: 0,
        offsetPeer: { _: 'inputPeerEmpty' },
        limit,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] searchPosts error:', err)
      return null
    }
  }

  public async updatePaidMessagesPrice(holder: RpcClientHolder, accountId: string, channelId: string, stars: bigint, broadcastAllowed = true): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.updatePaidMessagesPrice',
        channel,
        sendPaidMessagesStars: BigInt(stars),
        broadcastMessagesAllowed: Boolean(broadcastAllowed),
      })
    } catch (err) {
      Logger.warn('[ChannelsService] updatePaidMessagesPrice error:', err)
      return null
    }
  }

  public async toggleAutotranslation(holder: RpcClientHolder, accountId: string, channelId: string, enabled: boolean): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.toggleAutotranslation',
        channel,
        enabled: Boolean(enabled),
      })
    } catch (err) {
      Logger.warn('[ChannelsService] toggleAutotranslation error:', err)
      return null
    }
  }

  public async getMessageAuthor(holder: RpcClientHolder, accountId: string, channelId: string, id: number): Promise<any> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      return await holder.client.call({
        _: 'channels.getMessageAuthor',
        channel,
        id,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] getMessageAuthor error:', err)
      return null
    }
  }

  public async checkSearchPostsFlood(holder: RpcClientHolder, query?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'channels.checkSearchPostsFlood',
        query: query || undefined,
      })
    } catch (err) {
      Logger.warn('[ChannelsService] checkSearchPostsFlood error:', err)
      return null
    }
  }

  public async setMainProfileTab(holder: RpcClientHolder, accountId: string, channelId: string, tabName = 'posts'): Promise<boolean> {
    try {
      const channel = await this.toInputChannel(accountId, channelId)
      const res = await holder.client.call({
        _: 'channels.setMainProfileTab',
        channel,
        tab: { _: `profileTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}` },
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ChannelsService] setMainProfileTab error:', err)
      return false
    }
  }
}
