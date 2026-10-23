import { Logger } from '../logger'

export interface RpcClientHolder {
  client: {
    call: (query: { _: string; [key: string]: any }) => Promise<any>
    resolvePeer?: (peer: string) => Promise<any>
  }
}

export interface InputContactData {
  clientId?: number | string
  phone: string
  firstName: string
  lastName?: string
}

/**
 * Enterprise Contacts & Users Domain Service for Guidegram
 * Comprehensive implementation of all 37 MTProto methods across contacts.* and users.*
 */
export class ContactsService {
  private resolveInputPeer: (accountId: string, peerId: string) => Promise<any>

  constructor(resolveInputPeer: (accountId: string, peerId: string) => Promise<any>) {
    this.resolveInputPeer = resolveInputPeer
  }

  // =========================================================================
  // contacts.* Core Methods
  // =========================================================================

  public async getContacts(holder: RpcClientHolder, hash = 0n): Promise<any> {
    try {
      return await holder.client.call({
        _: 'contacts.getContacts',
        hash: BigInt(hash),
      })
    } catch (err) {
      Logger.warn('[ContactsService] getContacts error:', err)
      return null
    }
  }

  public async getContactIDs(holder: RpcClientHolder, hash = 0n): Promise<number[]> {
    try {
      const res = await holder.client.call({
        _: 'contacts.getContactIDs',
        hash: BigInt(hash),
      })
      return Array.isArray(res) ? res : []
    } catch (err) {
      Logger.warn('[ContactsService] getContactIDs error:', err)
      return []
    }
  }

  public async getStatuses(holder: RpcClientHolder): Promise<any[]> {
    try {
      const res = await holder.client.call({
        _: 'contacts.getStatuses',
      })
      return Array.isArray(res) ? res : []
    } catch (err) {
      Logger.warn('[ContactsService] getStatuses error:', err)
      return []
    }
  }

  public async importContacts(
    holder: RpcClientHolder,
    contacts: InputContactData[]
  ): Promise<any> {
    try {
      const inputContacts = contacts.map((c, idx) => ({
        _: 'inputPhoneContact',
        clientId: BigInt(c.clientId || idx + 1),
        phone: c.phone.replace(/[^0-9+]/g, ''),
        firstName: c.firstName,
        lastName: c.lastName || '',
      }))
      return await holder.client.call({
        _: 'contacts.importContacts',
        contacts: inputContacts,
      })
    } catch (err) {
      Logger.warn('[ContactsService] importContacts error:', err)
      return null
    }
  }

  public async addContact(
    holder: RpcClientHolder,
    accountId: string,
    userId: string,
    firstName: string,
    lastName = '',
    phone = '',
    addPhonePrivacyException = false,
    note?: string
  ): Promise<any> {
    try {
      const peer = await this.resolveInputPeer(accountId, userId)
      const inputUser =
        peer._ === 'inputPeerUser'
          ? { _: 'inputUser', userId: peer.userId, accessHash: peer.accessHash }
          : { _: 'inputUserEmpty' }

      return await holder.client.call({
        _: 'contacts.addContact',
        addPhonePrivacyException: Boolean(addPhonePrivacyException),
        id: inputUser,
        firstName,
        lastName,
        phone,
        note: note ? { _: 'textWithEntities', text: note, entities: [] } : undefined,
      })
    } catch (err) {
      Logger.warn('[ContactsService] addContact error:', err)
      return null
    }
  }

  public async acceptContact(
    holder: RpcClientHolder,
    accountId: string,
    userId: string
  ): Promise<any> {
    try {
      const peer = await this.resolveInputPeer(accountId, userId)
      const inputUser =
        peer._ === 'inputPeerUser'
          ? { _: 'inputUser', userId: peer.userId, accessHash: peer.accessHash }
          : { _: 'inputUserEmpty' }

      return await holder.client.call({
        _: 'contacts.acceptContact',
        id: inputUser,
      })
    } catch (err) {
      Logger.warn('[ContactsService] acceptContact error:', err)
      return null
    }
  }

  public async deleteContacts(
    holder: RpcClientHolder,
    accountId: string,
    userIds: string[]
  ): Promise<boolean> {
    try {
      const inputUsers: any[] = []
      for (const uid of userIds) {
        const peer = await this.resolveInputPeer(accountId, uid)
        if (peer._ === 'inputPeerUser') {
          inputUsers.push({ _: 'inputUser', userId: peer.userId, accessHash: peer.accessHash })
        }
      }
      const res = await holder.client.call({
        _: 'contacts.deleteContacts',
        id: inputUsers,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ContactsService] deleteContacts error:', err)
      return false
    }
  }

  public async deleteByPhones(holder: RpcClientHolder, phones: string[]): Promise<boolean> {
    try {
      const res = await holder.client.call({
        _: 'contacts.deleteByPhones',
        phones,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ContactsService] deleteByPhones error:', err)
      return false
    }
  }

  public async block(
    holder: RpcClientHolder,
    accountId: string,
    peerId: string,
    myStoriesFrom = false
  ): Promise<boolean> {
    try {
      const inputPeer = await this.resolveInputPeer(accountId, peerId)
      const res = await holder.client.call({
        _: 'contacts.block',
        myStoriesFrom: Boolean(myStoriesFrom),
        id: inputPeer,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ContactsService] block error:', err)
      return false
    }
  }

  public async unblock(
    holder: RpcClientHolder,
    accountId: string,
    peerId: string,
    myStoriesFrom = false
  ): Promise<boolean> {
    try {
      const inputPeer = await this.resolveInputPeer(accountId, peerId)
      const res = await holder.client.call({
        _: 'contacts.unblock',
        myStoriesFrom: Boolean(myStoriesFrom),
        id: inputPeer,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ContactsService] unblock error:', err)
      return false
    }
  }

  public async getBlocked(
    holder: RpcClientHolder,
    offset = 0,
    limit = 50,
    myStoriesFrom = false
  ): Promise<any> {
    try {
      return await holder.client.call({
        _: 'contacts.getBlocked',
        myStoriesFrom: Boolean(myStoriesFrom),
        offset,
        limit,
      })
    } catch (err) {
      Logger.warn('[ContactsService] getBlocked error:', err)
      return null
    }
  }

  public async setBlocked(
    holder: RpcClientHolder,
    accountId: string,
    peerIds: string[],
    limit = 50,
    myStoriesFrom = false
  ): Promise<boolean> {
    try {
      const inputPeers: any[] = []
      for (const pid of peerIds) {
        inputPeers.push(await this.resolveInputPeer(accountId, pid))
      }
      const res = await holder.client.call({
        _: 'contacts.setBlocked',
        myStoriesFrom: Boolean(myStoriesFrom),
        id: inputPeers,
        limit,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ContactsService] setBlocked error:', err)
      return false
    }
  }

  public async blockFromReplies(
    holder: RpcClientHolder,
    msgId: number,
    deleteMessage = false,
    deleteHistory = false,
    reportSpam = false
  ): Promise<any> {
    try {
      return await holder.client.call({
        _: 'contacts.blockFromReplies',
        msgId,
        deleteMessage: Boolean(deleteMessage),
        deleteHistory: Boolean(deleteHistory),
        reportSpam: Boolean(reportSpam),
      })
    } catch (err) {
      Logger.warn('[ContactsService] blockFromReplies error:', err)
      return null
    }
  }

  public async search(
    holder: RpcClientHolder,
    query: string,
    limit = 50,
    broadcasts = false,
    bots = false
  ): Promise<any> {
    try {
      return await holder.client.call({
        _: 'contacts.search',
        q: query,
        limit,
        broadcasts: Boolean(broadcasts),
        bots: Boolean(bots),
      })
    } catch (err) {
      Logger.warn('[ContactsService] search error:', err)
      return null
    }
  }

  public async resolveUsername(
    holder: RpcClientHolder,
    username: string,
    referer?: string
  ): Promise<any> {
    try {
      return await holder.client.call({
        _: 'contacts.resolveUsername',
        username: username.replace(/^@/, ''),
        referer: referer || undefined,
      })
    } catch (err) {
      Logger.warn('[ContactsService] resolveUsername error:', err)
      return null
    }
  }

  public async resolvePhone(holder: RpcClientHolder, phone: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'contacts.resolvePhone',
        phone: phone.replace(/[^0-9+]/g, ''),
      })
    } catch (err) {
      Logger.warn('[ContactsService] resolvePhone error:', err)
      return null
    }
  }

  public async getTopPeers(
    holder: RpcClientHolder,
    options?: {
      correspondents?: boolean
      botsPm?: boolean
      botsInline?: boolean
      phoneCalls?: boolean
      forwardUsers?: boolean
      forwardChats?: boolean
      groups?: boolean
      channels?: boolean
      offset?: number
      limit?: number
      hash?: bigint
    }
  ): Promise<any> {
    try {
      return await holder.client.call({
        _: 'contacts.getTopPeers',
        correspondents: Boolean(options?.correspondents ?? true),
        botsPm: Boolean(options?.botsPm),
        botsInline: Boolean(options?.botsInline),
        phoneCalls: Boolean(options?.phoneCalls),
        forwardUsers: Boolean(options?.forwardUsers),
        forwardChats: Boolean(options?.forwardChats),
        groups: Boolean(options?.groups),
        channels: Boolean(options?.channels),
        offset: options?.offset || 0,
        limit: options?.limit || 30,
        hash: options?.hash ? BigInt(options.hash) : 0n,
      })
    } catch (err) {
      Logger.warn('[ContactsService] getTopPeers error:', err)
      return null
    }
  }

  public async resetTopPeerRating(
    holder: RpcClientHolder,
    accountId: string,
    categoryName: string,
    peerId: string
  ): Promise<boolean> {
    try {
      const inputPeer = await this.resolveInputPeer(accountId, peerId)
      const res = await holder.client.call({
        _: 'contacts.resetTopPeerRating',
        category: { _: `topPeerCategory${categoryName}` },
        peer: inputPeer,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ContactsService] resetTopPeerRating error:', err)
      return false
    }
  }

  public async toggleTopPeers(holder: RpcClientHolder, enabled: boolean): Promise<boolean> {
    try {
      const res = await holder.client.call({
        _: 'contacts.toggleTopPeers',
        enabled: Boolean(enabled),
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ContactsService] toggleTopPeers error:', err)
      return false
    }
  }

  public async getSaved(holder: RpcClientHolder): Promise<any[]> {
    try {
      const res = await holder.client.call({
        _: 'contacts.getSaved',
      })
      return Array.isArray(res) ? res : []
    } catch (err) {
      Logger.warn('[ContactsService] getSaved error:', err)
      return []
    }
  }

  public async resetSaved(holder: RpcClientHolder): Promise<boolean> {
    try {
      const res = await holder.client.call({
        _: 'contacts.resetSaved',
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ContactsService] resetSaved error:', err)
      return false
    }
  }

  public async getLocated(
    holder: RpcClientHolder,
    latitude: number,
    longitude: number,
    accuracyRadius?: number,
    background = false,
    selfExpires?: number
  ): Promise<any> {
    try {
      return await holder.client.call({
        _: 'contacts.getLocated',
        background: Boolean(background),
        selfExpires: selfExpires ? Number(selfExpires) : undefined,
        geoPoint: {
          _: 'inputGeoPoint',
          lat: latitude,
          long: longitude,
          accuracyRadius: accuracyRadius ? Number(accuracyRadius) : undefined,
        },
      })
    } catch (err) {
      Logger.warn('[ContactsService] getLocated error:', err)
      return null
    }
  }

  public async exportContactToken(holder: RpcClientHolder): Promise<any> {
    try {
      return await holder.client.call({
        _: 'contacts.exportContactToken',
      })
    } catch (err) {
      Logger.warn('[ContactsService] exportContactToken error:', err)
      return null
    }
  }

  public async importContactToken(holder: RpcClientHolder, token: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'contacts.importContactToken',
        token,
      })
    } catch (err) {
      Logger.warn('[ContactsService] importContactToken error:', err)
      return null
    }
  }

  public async editCloseFriends(holder: RpcClientHolder, userIds: (string | number)[]): Promise<boolean> {
    try {
      const res = await holder.client.call({
        _: 'contacts.editCloseFriends',
        id: userIds.map(BigInt),
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ContactsService] editCloseFriends error:', err)
      return false
    }
  }

  public async getBirthdays(holder: RpcClientHolder): Promise<any[]> {
    try {
      const res = await holder.client.call({
        _: 'contacts.getBirthdays',
      })
      return Array.isArray(res) ? res : []
    } catch (err) {
      Logger.warn('[ContactsService] getBirthdays error:', err)
      return []
    }
  }

  public async getSponsoredPeers(holder: RpcClientHolder, query: string): Promise<any[]> {
    try {
      const res = await holder.client.call({
        _: 'contacts.getSponsoredPeers',
        q: query,
      })
      return Array.isArray(res) ? res : []
    } catch (err) {
      Logger.warn('[ContactsService] getSponsoredPeers error:', err)
      return []
    }
  }

  public async updateContactNote(
    holder: RpcClientHolder,
    accountId: string,
    userId: string,
    noteText: string
  ): Promise<boolean> {
    try {
      const peer = await this.resolveInputPeer(accountId, userId)
      const inputUser =
        peer._ === 'inputPeerUser'
          ? { _: 'inputUser', userId: peer.userId, accessHash: peer.accessHash }
          : { _: 'inputUserEmpty' }

      const res = await holder.client.call({
        _: 'contacts.updateContactNote',
        id: inputUser,
        note: { _: 'textWithEntities', text: noteText, entities: [] },
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ContactsService] updateContactNote error:', err)
      return false
    }
  }

  public async exportNoPaidMessagesToken(
    holder: RpcClientHolder,
    revoke = false,
    temporary = false
  ): Promise<any> {
    try {
      return await holder.client.call({
        _: 'contacts.exportNoPaidMessagesToken',
        revoke: Boolean(revoke),
        temporary: Boolean(temporary),
      })
    } catch (err) {
      Logger.warn('[ContactsService] exportNoPaidMessagesToken error:', err)
      return null
    }
  }

  public async importNoPaidMessagesToken(
    holder: RpcClientHolder,
    accountId: string,
    userId: string,
    token: string
  ): Promise<boolean> {
    try {
      const peer = await this.resolveInputPeer(accountId, userId)
      const inputUser =
        peer._ === 'inputPeerUser'
          ? { _: 'inputUser', userId: peer.userId, accessHash: peer.accessHash }
          : { _: 'inputUserEmpty' }

      const res = await holder.client.call({
        _: 'contacts.importNoPaidMessagesToken',
        userId: inputUser,
        token,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ContactsService] importNoPaidMessagesToken error:', err)
      return false
    }
  }

  // =========================================================================
  // users.* Core Methods
  // =========================================================================

  public async getUsers(
    holder: RpcClientHolder,
    accountId: string,
    userIds: string[]
  ): Promise<any[]> {
    try {
      const inputUsers: any[] = []
      for (const uid of userIds) {
        const peer = await this.resolveInputPeer(accountId, uid)
        if (peer._ === 'inputPeerUser') {
          inputUsers.push({ _: 'inputUser', userId: peer.userId, accessHash: peer.accessHash })
        }
      }
      const res = await holder.client.call({
        _: 'users.getUsers',
        id: inputUsers,
      })
      return Array.isArray(res) ? res : []
    } catch (err) {
      Logger.warn('[ContactsService] getUsers error:', err)
      return []
    }
  }

  public async getFullUser(
    holder: RpcClientHolder,
    accountId: string,
    userId: string
  ): Promise<any> {
    try {
      const peer = await this.resolveInputPeer(accountId, userId)
      const inputUser =
        peer._ === 'inputPeerUser'
          ? { _: 'inputUser', userId: peer.userId, accessHash: peer.accessHash }
          : { _: 'inputUserEmpty' }

      return await holder.client.call({
        _: 'users.getFullUser',
        id: inputUser,
      })
    } catch (err) {
      Logger.warn('[ContactsService] getFullUser error:', err)
      return null
    }
  }

  public async getRequirementsToContact(
    holder: RpcClientHolder,
    accountId: string,
    userIds: string[]
  ): Promise<any[]> {
    try {
      const inputUsers: any[] = []
      for (const uid of userIds) {
        const peer = await this.resolveInputPeer(accountId, uid)
        if (peer._ === 'inputPeerUser') {
          inputUsers.push({ _: 'inputUser', userId: peer.userId, accessHash: peer.accessHash })
        }
      }
      const res = await holder.client.call({
        _: 'users.getRequirementsToContact',
        id: inputUsers,
      })
      return Array.isArray(res) ? res : []
    } catch (err) {
      Logger.warn('[ContactsService] getRequirementsToContact error:', err)
      return []
    }
  }

  public async getSavedMusic(
    holder: RpcClientHolder,
    accountId: string,
    userId: string,
    offset = 0,
    limit = 50,
    hash = 0n
  ): Promise<any> {
    try {
      const peer = await this.resolveInputPeer(accountId, userId)
      const inputUser =
        peer._ === 'inputPeerUser'
          ? { _: 'inputUser', userId: peer.userId, accessHash: peer.accessHash }
          : { _: 'inputUserEmpty' }

      return await holder.client.call({
        _: 'users.getSavedMusic',
        id: inputUser,
        offset,
        limit,
        hash: BigInt(hash),
      })
    } catch (err) {
      Logger.warn('[ContactsService] getSavedMusic error:', err)
      return null
    }
  }

  public async getSavedMusicByID(
    holder: RpcClientHolder,
    accountId: string,
    userId: string,
    documents: any[]
  ): Promise<any[]> {
    try {
      const peer = await this.resolveInputPeer(accountId, userId)
      const inputUser =
        peer._ === 'inputPeerUser'
          ? { _: 'inputUser', userId: peer.userId, accessHash: peer.accessHash }
          : { _: 'inputUserEmpty' }

      const res = await holder.client.call({
        _: 'users.getSavedMusicByID',
        id: inputUser,
        documents,
      })
      return Array.isArray(res) ? res : []
    } catch (err) {
      Logger.warn('[ContactsService] getSavedMusicByID error:', err)
      return []
    }
  }

  public async suggestBirthday(
    holder: RpcClientHolder,
    accountId: string,
    userId: string,
    day: number,
    month: number,
    year?: number
  ): Promise<boolean> {
    try {
      const peer = await this.resolveInputPeer(accountId, userId)
      const inputUser =
        peer._ === 'inputPeerUser'
          ? { _: 'inputUser', userId: peer.userId, accessHash: peer.accessHash }
          : { _: 'inputUserEmpty' }

      const res = await holder.client.call({
        _: 'users.suggestBirthday',
        id: inputUser,
        birthday: {
          _: 'birthday',
          day,
          month,
          year: year || undefined,
        },
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ContactsService] suggestBirthday error:', err)
      return false
    }
  }

  public async setSecureValueErrors(
    holder: RpcClientHolder,
    accountId: string,
    userId: string,
    errors: any[]
  ): Promise<boolean> {
    try {
      const peer = await this.resolveInputPeer(accountId, userId)
      const inputUser =
        peer._ === 'inputPeerUser'
          ? { _: 'inputUser', userId: peer.userId, accessHash: peer.accessHash }
          : { _: 'inputUserEmpty' }

      const res = await holder.client.call({
        _: 'users.setSecureValueErrors',
        id: inputUser,
        errors,
      })
      return Boolean(res)
    } catch (err) {
      Logger.warn('[ContactsService] setSecureValueErrors error:', err)
      return false
    }
  }
}
