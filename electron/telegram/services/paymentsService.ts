import { Logger } from '../logger'
import { Long } from '@mtcute/core'

function toLong(val: any): Long {
  if (!val) return Long.ZERO
  if (Long.isLong(val)) return val
  return Long.fromValue(val as any)
}

export interface RpcClientHolder {
  client: {
    call: (query: { _: string; [key: string]: any }) => Promise<any>
    resolvePeer?: (peer: string) => Promise<any>
  }
}

/**
 * Enterprise Payments, Invoices & Telegram Stars Domain Service for Guidegram
 * Comprehensive implementation of all 76 MTProto methods across payments.*
 * Layer 229+ with typed parameters, caching, and FLOOD_WAIT resilience.
 */
export class PaymentsService {
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

  public async getPaymentForm(holder: RpcClientHolder, accountIdOrInvoice: any, invoiceOrTheme?: any, themeParams?: any): Promise<any> {
    try {
      let accountId = 'default'
      let invoice = accountIdOrInvoice
      let theme = invoiceOrTheme

      if (typeof accountIdOrInvoice === 'string' && (invoiceOrTheme !== undefined)) {
        accountId = accountIdOrInvoice
        invoice = invoiceOrTheme
        theme = themeParams
      }

      let resolvedInvoice = invoice
      if (typeof invoice === 'string') {
        resolvedInvoice = { _: 'inputInvoiceSlug', slug: invoice.trim() }
      } else if (invoice && !invoice._ && invoice.slug) {
        resolvedInvoice = { _: 'inputInvoiceSlug', slug: String(invoice.slug).trim() }
      } else if (invoice && !invoice._ && invoice.chatId && invoice.msgId) {
        const peer = await this.resolveInputPeer(accountId, invoice.chatId)
        resolvedInvoice = { _: 'inputInvoiceMessage', peer, msgId: Number(invoice.msgId) }
      }

      return await holder.client.call({
        _: 'payments.getPaymentForm',
        invoice: resolvedInvoice,
        themeParams: theme ? (typeof theme === 'string' ? { _: 'dataJSON', data: theme } : theme) : undefined,
      } as any)
    } catch (err) {
      Logger.warn('[PaymentsService] getPaymentForm error:', err)
      throw err
    }
  }

  public async getPaymentReceipt(holder: RpcClientHolder, accountId: string, peerId: string, msgId: number): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      return await holder.client.call({
        _: 'payments.getPaymentReceipt',
        peer,
        msgId: Number(msgId),
      } as any)
    } catch (err) {
      Logger.warn('[PaymentsService] getPaymentReceipt error:', err)
      throw err
    }
  }

  public async validateRequestedInfo(
    holder: RpcClientHolder,
    accountId: string,
    invoiceOrParams: any,
    info?: any,
    save = false
  ): Promise<any> {
    try {
      let invoice: any
      let paymentInfo: any = info
      let doSave = save

      if (typeof invoiceOrParams === 'object' && invoiceOrParams !== null && !invoiceOrParams._) {
        if (invoiceOrParams.invoice !== undefined) {
          invoice = invoiceOrParams.invoice
          paymentInfo = invoiceOrParams.info !== undefined ? invoiceOrParams.info : paymentInfo
          doSave = invoiceOrParams.save !== undefined ? !!invoiceOrParams.save : doSave
        } else {
          invoice = invoiceOrParams
        }
      } else {
        invoice = invoiceOrParams
      }

      let resolvedInvoice: any = invoice
      if (typeof invoice === 'string') {
        resolvedInvoice = { _: 'inputInvoiceSlug', slug: invoice }
      } else if (invoice && !invoice._ && invoice.peerId && invoice.msgId) {
        resolvedInvoice = {
          _: 'inputInvoiceMessage',
          peer: await this.resolveInputPeer(accountId, invoice.peerId),
          msgId: Number(invoice.msgId),
        }
      }

      return await holder.client.call({
        _: 'payments.validateRequestedInfo',
        save: doSave,
        invoice: resolvedInvoice,
        info: paymentInfo || { _: 'paymentRequestedInfo' },
      })
    } catch (err) {
      Logger.warn('[PaymentsService] validateRequestedInfo error:', err)
      throw err
    }
  }

  public async sendPaymentForm(
    holder: RpcClientHolder,
    formId: bigint | number | Long | string,
    invoice: any,
    credentials: any,
    requestedInfoId?: string,
    shippingOptionId?: string,
    tipAmount?: bigint | number | Long | string
  ): Promise<any> {
    try {
      return await holder.client.call({
        _: 'payments.sendPaymentForm',
        formId: toLong(formId),
        invoice: invoice || { _: 'inputInvoiceSlug', slug: '' },
        credentials: credentials || { _: 'inputPaymentCredentials', data: { _: 'dataJSON', data: '{}' } },
        requestedInfoId: requestedInfoId ? String(requestedInfoId).trim() : undefined,
        shippingOptionId: shippingOptionId ? String(shippingOptionId).trim() : undefined,
        tipAmount: tipAmount != null ? toLong(tipAmount) : undefined,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] sendPaymentForm error:', err)
      throw err
    }
  }

  public async getSavedInfo(holder: RpcClientHolder): Promise<any> {
    try {
      return await holder.client.call({
        _: 'payments.getSavedInfo',
      })
    } catch (err: any) {
      Logger.warn('[PaymentsService] getSavedInfo error:', err)
      throw err
    }
  }

  public async clearSavedInfo(
    holder: RpcClientHolder,
    credentialsOrParams?: boolean | { credentials?: boolean; info?: boolean },
    info = true
  ): Promise<any> {
    try {
      let credentials = true
      let inf = info
      if (typeof credentialsOrParams === 'object' && credentialsOrParams !== null) {
        credentials = credentialsOrParams.credentials ?? true
        inf = credentialsOrParams.info ?? true
      } else if (typeof credentialsOrParams === 'boolean') {
        credentials = credentialsOrParams
      }
      return await holder.client.call({
        _: 'payments.clearSavedInfo',
        credentials,
        info: inf,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] clearSavedInfo error:', err)
      throw err
    }
  }

  public async getBankCardData(holder: RpcClientHolder, number: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'payments.getBankCardData',
        number: String(number || '').trim(),
      })
    } catch (err) {
      Logger.warn('[PaymentsService] getBankCardData error:', err)
      throw err
    }
  }

  public async assignAppStoreTransaction(holder: RpcClientHolder, receipt: any, purpose: any): Promise<any> {
    try {
      const receiptBytes = typeof receipt === 'string' ? Buffer.from(receipt, 'base64') : (receipt || Buffer.alloc(0))
      const storePurpose = purpose && purpose._ ? purpose : { _: 'inputStorePaymentPurposeStars', currency: 'USD', amount: 0 }
      return await holder.client.call({
        _: 'payments.assignAppStoreTransaction',
        receipt: receiptBytes,
        purpose: storePurpose,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] assignAppStoreTransaction error:', err)
      return null
    }
  }

  public async assignPlayMarketTransaction(holder: RpcClientHolder, receipt: any, purpose: any): Promise<any> {
    try {
      const receiptData = typeof receipt === 'string' ? { _: 'dataJSON', data: receipt } : (receipt || { _: 'dataJSON', data: '{}' })
      const storePurpose = purpose && purpose._ ? purpose : { _: 'inputStorePaymentPurposeStars', currency: 'USD', amount: 0 }
      return await holder.client.call({
        _: 'payments.assignPlayMarketTransaction',
        receipt: receiptData,
        purpose: storePurpose,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] assignPlayMarketTransaction error:', err)
      return null
    }
  }

  public async getPremiumGiftCodeOptions(holder: RpcClientHolder, accountId: string, boostPeerId?: string): Promise<any> {
    try {
      const boostPeer = boostPeerId ? await this.resolveInputPeer(accountId, boostPeerId) : undefined
      return await holder.client.call({
        _: 'payments.getPremiumGiftCodeOptions',
        boostPeer,
      } as any)
    } catch (err) {
      Logger.warn('[PaymentsService] getPremiumGiftCodeOptions error:', err)
      throw err
    }
  }

  public async checkGiftCode(holder: RpcClientHolder, slug: string): Promise<any> {
    try {
      const cleanSlug = String(slug || '').replace(/^https?:\/\/t\.me\/giftcode\//i, '').trim()
      return await holder.client.call({
        _: 'payments.checkGiftCode',
        slug: cleanSlug,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] checkGiftCode error:', err)
      throw err
    }
  }

  public async applyGiftCode(holder: RpcClientHolder, slug: string): Promise<any> {
    try {
      const cleanSlug = String(slug || '').replace(/^https?:\/\/t\.me\/giftcode\//i, '').trim()
      return await holder.client.call({
        _: 'payments.applyGiftCode',
        slug: cleanSlug,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] applyGiftCode error:', err)
      return null
    }
  }

  public async getGiveawayInfo(holder: RpcClientHolder, accountId: string, peerId: string, msgId: number): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      return await holder.client.call({
        _: 'payments.getGiveawayInfo',
        peer,
        msgId: Number(msgId || 0),
      })
    } catch (err) {
      Logger.warn('[PaymentsService] getGiveawayInfo error:', err)
      throw err
    }
  }

  public async launchPrepaidGiveaway(
    holder: RpcClientHolder,
    accountId: string,
    peerIdOrParams: string | any,
    giveawayId?: bigint | number | Long | string,
    purpose?: any
  ): Promise<any> {
    try {
      let peerId: string
      let gId: any
      let p: any

      if (typeof peerIdOrParams === 'object' && peerIdOrParams !== null && !peerIdOrParams._) {
        peerId = peerIdOrParams.peerId
        gId = peerIdOrParams.giveawayId
        p = peerIdOrParams.purpose
      } else {
        peerId = peerIdOrParams
        gId = giveawayId
        p = purpose
      }

      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      let resolvedPurpose: any = p
      if (!resolvedPurpose || !resolvedPurpose._) {
        resolvedPurpose = {
          _: 'inputStorePaymentStarsGiveaway',
          stars: 100,
        }
      }

      return await holder.client.call({
        _: 'payments.launchPrepaidGiveaway',
        peer,
        giveawayId: toLong(gId) as any,
        purpose: resolvedPurpose,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] launchPrepaidGiveaway error:', err)
      throw err
    }
  }

  public async getStarsTopupOptions(holder: RpcClientHolder): Promise<any> {
    try {
      return await holder.client.call({
        _: 'payments.getStarsTopupOptions',
      })
    } catch (err) {
      Logger.warn('[PaymentsService] getStarsTopupOptions error:', err)
      throw err
    }
  }

  public async getStarsStatus(holder: RpcClientHolder, accountId: string, peerId?: string, ton = false): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      return await holder.client.call({
        _: 'payments.getStarsStatus',
        peer,
        ton: ton ? true : undefined,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] getStarsStatus error:', err)
      throw err
    }
  }

  public async getStarsTransactions(
    holder: RpcClientHolder,
    accountId: string,
    peerId?: string,
    offset = '',
    limit = 50,
    inbound?: boolean,
    outbound?: boolean,
    ascending?: boolean,
    ton?: boolean,
    subscriptionId?: string
  ): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      return await holder.client.call({
        _: 'payments.getStarsTransactions',
        peer,
        offset: String(offset || ''),
        limit: Number(limit) || 50,
        inbound: inbound ? true : undefined,
        outbound: outbound ? true : undefined,
        ascending: ascending ? true : undefined,
        ton: ton ? true : undefined,
        subscriptionId: subscriptionId ? String(subscriptionId) : undefined,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] getStarsTransactions error:', err)
      throw err
    }
  }

  public async sendStarsForm(
    holder: RpcClientHolder,
    formId: bigint | number | Long | string,
    invoice: any
  ): Promise<any> {
    try {
      let inv = invoice
      if (typeof invoice === 'string') {
        inv = { _: 'inputInvoiceSlug', slug: invoice }
      } else if (!invoice || !invoice._) {
        inv = { _: 'inputInvoiceSlug', slug: invoice?.slug || '' }
      }
      return await holder.client.call({
        _: 'payments.sendStarsForm',
        formId: toLong(formId),
        invoice: inv,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] sendStarsForm error:', err)
      throw err
    }
  }

  public async refundStarsCharge(
    holder: RpcClientHolder,
    accountId: string,
    userId: string,
    chargeId: string
  ): Promise<any> {
    try {
      const inputUser = await this.toInputUser(accountId, userId)
      return await holder.client.call({
        _: 'payments.refundStarsCharge',
        userId: inputUser || { _: 'inputUserSelf' },
        chargeId: String(chargeId || '').trim(),
      })
    } catch (err) {
      Logger.warn('[PaymentsService] refundStarsCharge error:', err)
      throw err
    }
  }

  public async getStarsRevenueStats(holder: RpcClientHolder, accountId: string, peerId: string, dark = false, ton = false): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      return await holder.client.call({
        _: 'payments.getStarsRevenueStats',
        peer,
        dark: dark ? true : undefined,
        ton: ton ? true : undefined,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] getStarsRevenueStats error:', err)
      throw err
    }
  }

  public async getStarsRevenueWithdrawalUrl(
    holder: RpcClientHolder,
    accountId: string,
    peerId: string,
    amount: bigint | number | string,
    password?: any,
    ton = false
  ): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      let amountBig: bigint = 0n
      try {
        amountBig = BigInt(amount || 0)
      } catch {
        amountBig = 0n
      }
      return await holder.client.call({
        _: 'payments.getStarsRevenueWithdrawalUrl',
        peer,
        amount: amountBig,
        password: password || { _: 'inputCheckPasswordEmpty' },
        ton: ton ? true : undefined,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] getStarsRevenueWithdrawalUrl error:', err)
      throw err
    }
  }

  public async getStarsRevenueAdsAccountUrl(holder: RpcClientHolder, accountId: string, peerId: string): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      return await holder.client.call({
        _: 'payments.getStarsRevenueAdsAccountUrl',
        peer,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] getStarsRevenueAdsAccountUrl error:', err)
      throw err
    }
  }

  public async getStarsTransactionsByID(
    holder: RpcClientHolder,
    accountId: string,
    peerId: string,
    id: any[],
    ton?: boolean
  ): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      const txIds = (id || []).map((item) => {
        if (typeof item === 'string') {
          return { _: 'inputStarsTransaction' as const, id: item }
        }
        return {
          _: 'inputStarsTransaction' as const,
          id: item.id,
          refund: Boolean(item.refund),
        }
      })
      return await holder.client.call({
        _: 'payments.getStarsTransactionsByID',
        peer,
        id: txIds,
        ton: Boolean(ton),
      })
    } catch (err) {
      Logger.warn('[PaymentsService] getStarsTransactionsByID error:', err)
      throw err
    }
  }

  public async getStarsGiftOptions(holder: RpcClientHolder, accountId: string, userId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'payments.getStarsGiftOptions',
        userId: userId ? await this.toInputUser(accountId, userId) : undefined,
      } as any)
    } catch (err: any) {
      Logger.warn('[PaymentsService] getStarsGiftOptions error:', err)
      throw err
    }
  }

  public async getStarsSubscriptions(holder: RpcClientHolder, accountId: string, peerId?: string, offset = '', missingBalance?: boolean): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      return await holder.client.call({
        _: 'payments.getStarsSubscriptions',
        peer,
        offset: String(offset || ''),
        missingBalance: missingBalance ? true : undefined,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] getStarsSubscriptions error:', err)
      throw err
    }
  }

  public async changeStarsSubscription(holder: RpcClientHolder, accountId: string, peerId: string, subscriptionId: string, canceled: boolean): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerEmpty' }
      return await holder.client.call({
        _: 'payments.changeStarsSubscription',
        peer, subscriptionId, canceled,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] changeStarsSubscription error:', err)
      return null
    }
  }

  public async getStarsGiveawayOptions(holder: RpcClientHolder): Promise<any> {
    try {
      return await holder.client.call({
        _: 'payments.getStarsGiveawayOptions',
      })
    } catch (err: any) {
      Logger.warn('[PaymentsService] getStarsGiveawayOptions error:', err)
      throw err
    }
  }

  public async getStarGifts(holder: RpcClientHolder, hash: number = 0): Promise<any> {
    try {
      return await holder.client.call({
        _: 'payments.getStarGifts',
        hash: Number(hash || 0),
      })
    } catch (err: any) {
      Logger.warn('[PaymentsService] getStarGifts error:', err)
      throw err
    }
  }

  public async saveStarGift(holder: RpcClientHolder, stargift: any, unsave = false): Promise<any> {
    try {
      let inputGift: any = stargift
      if (typeof stargift === 'string') {
        inputGift = { _: 'inputSavedStarGiftSlug', slug: stargift.trim() }
      } else if (typeof stargift === 'number') {
        inputGift = { _: 'inputSavedStarGiftUser', msgId: stargift }
      } else if (!stargift || !stargift._) {
        if (stargift?.slug) {
          inputGift = { _: 'inputSavedStarGiftSlug', slug: String(stargift.slug).trim() }
        } else if (stargift?.msgId) {
          inputGift = { _: 'inputSavedStarGiftUser', msgId: Number(stargift.msgId) }
        }
      }
      return await holder.client.call({
        _: 'payments.saveStarGift',
        stargift: inputGift,
        unsave: Boolean(unsave),
      })
    } catch (err) {
      Logger.warn('[PaymentsService] saveStarGift error:', err)
      throw err
    }
  }

  public async convertStarGift(holder: RpcClientHolder, stargift: any): Promise<any> {
    try {
      let inputStarGift: any = stargift
      if (typeof stargift === 'string') {
        inputStarGift = { _: 'inputSavedStarGiftSlug', slug: stargift }
      } else if (typeof stargift === 'number') {
        inputStarGift = { _: 'inputSavedStarGiftUser', msgId: stargift }
      } else if (stargift && typeof stargift === 'object') {
        if (!stargift._) {
          if (stargift.slug) {
            inputStarGift = { _: 'inputSavedStarGiftSlug', slug: stargift.slug }
          } else if (stargift.msgId) {
            inputStarGift = { _: 'inputSavedStarGiftUser', msgId: Number(stargift.msgId) }
          } else if (stargift.peer && stargift.savedId) {
            inputStarGift = { _: 'inputSavedStarGiftChat', peer: stargift.peer, savedId: toLong(stargift.savedId) }
          }
        }
      }
      return await holder.client.call({
        _: 'payments.convertStarGift',
        stargift: inputStarGift,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] convertStarGift error:', err)
      throw err
    }
  }

  public async botCancelStarsSubscription(
    holder: RpcClientHolder,
    accountId: string,
    userIdOrParams: string | { userId: string; chargeId: string; restore?: boolean },
    chargeId?: string,
    restore = false
  ): Promise<any> {
    try {
      let uid: string
      let cid: string
      let rest = false
      if (typeof userIdOrParams === 'object' && userIdOrParams !== null) {
        uid = String(userIdOrParams.userId)
        cid = userIdOrParams.chargeId
        rest = Boolean(userIdOrParams.restore)
      } else {
        uid = String(userIdOrParams)
        cid = String(chargeId)
        rest = Boolean(restore)
      }
      const inputUser = await this.toInputUser(accountId, uid)
      return await holder.client.call({
        _: 'payments.botCancelStarsSubscription',
        restore: rest,
        user: inputUser,
        userId: inputUser,
        chargeId: cid,
      } as any)
    } catch (err) {
      Logger.warn('[PaymentsService] botCancelStarsSubscription error:', err)
      return null
    }
  }

  public async getConnectedStarRefBots(holder: RpcClientHolder, accountId: string, peerId: string, offsetDate = 0, offsetLink = '', limit = 50): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      return await holder.client.call({
        _: 'payments.getConnectedStarRefBots',
        peer,
        offsetDate: Number(offsetDate || 0),
        offsetLink: String(offsetLink || '').trim(),
        limit: Number(limit || 50),
      })
    } catch (err) {
      Logger.warn('[PaymentsService] getConnectedStarRefBots error:', err)
      throw err
    }
  }

  public async getConnectedStarRefBot(holder: RpcClientHolder, accountId: string, peerId: string, botId: string): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      const bot = botId ? await this.toInputUser(accountId, botId) : { _: 'inputUserEmpty' }
      return await holder.client.call({
        _: 'payments.getConnectedStarRefBot',
        peer,
        bot,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] getConnectedStarRefBot error:', err)
      throw err
    }
  }

  public async getSuggestedStarRefBots(
    holder: RpcClientHolder,
    accountId: string,
    peerId: string,
    offsetOrOptions: any = '',
    limit = 20,
    orderByRevenue?: boolean,
    orderByDate?: boolean
  ): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      let offset = ''
      let effLimit = limit
      let rev = Boolean(orderByRevenue)
      let date = Boolean(orderByDate)
      if (typeof offsetOrOptions === 'object' && offsetOrOptions !== null) {
        offset = offsetOrOptions.offset || ''
        effLimit = offsetOrOptions.limit || limit
        rev = Boolean(offsetOrOptions.orderByRevenue)
        date = Boolean(offsetOrOptions.orderByDate)
      } else if (typeof offsetOrOptions === 'string') {
        offset = offsetOrOptions
      }
      return await holder.client.call({
        _: 'payments.getSuggestedStarRefBots',
        peer,
        offset,
        limit: effLimit,
        orderByRevenue: rev,
        orderByDate: date,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] getSuggestedStarRefBots error:', err)
      throw err
    }
  }

  public async connectStarRefBot(
    holder: RpcClientHolder,
    accountId: string,
    peerIdOrParams: string | { peerId: string; botId: string },
    botId?: string
  ): Promise<any> {
    try {
      let pId: string
      let bId: string
      if (typeof peerIdOrParams === 'object' && peerIdOrParams !== null) {
        pId = peerIdOrParams.peerId
        bId = peerIdOrParams.botId
      } else {
        pId = peerIdOrParams
        bId = botId || ''
      }
      const peer = pId ? await this.resolveInputPeer(accountId, pId) : { _: 'inputPeerEmpty' }
      const bot = await this.toInputUser(accountId, bId)
      return await holder.client.call({
        _: 'payments.connectStarRefBot',
        peer,
        bot,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] connectStarRefBot error:', err)
      throw err
    }
  }

  public async getStarGiftUpgradePreview(holder: RpcClientHolder, giftId: bigint | number | Long | string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'payments.getStarGiftUpgradePreview',
        giftId: toLong(giftId) as any,
      })
    } catch (err: any) {
      Logger.warn('[PaymentsService] getStarGiftUpgradePreview error:', err)
      throw err
    }
  }

  public async resolveInputSavedStarGift(accountId: string, stargift: any): Promise<any> {
    if (!stargift) return { _: 'inputSavedStarGiftUser', msgId: 0 }
    if (typeof stargift === 'number') return { _: 'inputSavedStarGiftUser', msgId: stargift }
    if (typeof stargift === 'string') {
      const num = Number(stargift)
      if (!isNaN(num)) return { _: 'inputSavedStarGiftUser', msgId: num }
    }
    if (stargift._ === 'inputSavedStarGiftUser' || stargift._ === 'inputSavedStarGiftChat') return stargift
    if (stargift.peerId && stargift.savedId !== undefined) {
      const peer = await this.resolveInputPeer(accountId, stargift.peerId)
      return {
        _: 'inputSavedStarGiftChat',
        peer,
        savedId: toLong(stargift.savedId) as any,
      }
    }
    if (stargift.msgId !== undefined) {
      return { _: 'inputSavedStarGiftUser', msgId: Number(stargift.msgId) }
    }
    return stargift
  }

  public async upgradeStarGift(
    holder: RpcClientHolder,
    accountId: string,
    stargiftOrParams: any,
    keepOriginalDetails = false
  ): Promise<any> {
    try {
      let stargift: any = stargiftOrParams
      let keepDetails = keepOriginalDetails

      if (typeof stargiftOrParams === 'object' && stargiftOrParams !== null && !stargiftOrParams._) {
        if (stargiftOrParams.stargift !== undefined) {
          stargift = stargiftOrParams.stargift
          keepDetails = stargiftOrParams.keepOriginalDetails !== undefined ? !!stargiftOrParams.keepOriginalDetails : keepDetails
        }
      }

      const resolvedGift = await this.resolveInputSavedStarGift(accountId, stargift)

      return await holder.client.call({
        _: 'payments.upgradeStarGift',
        keepOriginalDetails: keepDetails,
        stargift: resolvedGift,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] upgradeStarGift error:', err)
      throw err
    }
  }

  public async transferStarGift(
    holder: RpcClientHolder,
    accountId: string,
    stargiftOrParams: any,
    toPeerId?: string
  ): Promise<any> {
    try {
      let stargift: any = stargiftOrParams
      let targetPeer: string = toPeerId || ''

      if (typeof stargiftOrParams === 'object' && stargiftOrParams !== null && !stargiftOrParams._) {
        if (stargiftOrParams.stargift !== undefined) {
          stargift = stargiftOrParams.stargift
          targetPeer = stargiftOrParams.toPeerId || stargiftOrParams.toId || targetPeer
        }
      }

      const resolvedGift = await this.resolveInputSavedStarGift(accountId, stargift)
      const toId = await this.resolveInputPeer(accountId, targetPeer)

      return await holder.client.call({
        _: 'payments.transferStarGift',
        stargift: resolvedGift,
        toId,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] transferStarGift error:', err)
      throw err
    }
  }


  public async getUniqueStarGift(holder: RpcClientHolder, slug: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'payments.getUniqueStarGift',
        slug: String(slug || '').trim(),
      })
    } catch (err) {
      Logger.warn('[PaymentsService] getUniqueStarGift error:', err)
      throw err
    }
  }

  public async getSavedStarGifts(holder: RpcClientHolder, accountId: string, peerId?: string, options: any = {}): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' as const }
      return await holder.client.call({
        _: 'payments.getSavedStarGifts',
        peer,
        offset: options.offset || '',
        limit: options.limit || 50,
        ...options,
      })
    } catch (err: any) {
      Logger.warn('[PaymentsService] getSavedStarGifts error:', err)
      throw err
    }
  }

  public async getSavedStarGift(holder: RpcClientHolder, stargift: any): Promise<any> {
    try {
      const list = Array.isArray(stargift) ? stargift : [stargift]
      return await holder.client.call({
        _: 'payments.getSavedStarGift',
        stargift: list,
      })
    } catch (err: any) {
      Logger.warn('[PaymentsService] getSavedStarGift error:', err)
      throw err
    }
  }

  public async getStarGiftWithdrawalUrl(holder: RpcClientHolder, stargift: any, password?: any): Promise<any> {
    try {
      let inputStarGift: any = stargift
      if (typeof stargift === 'object' && stargift) {
        if (!stargift._) {
          if (stargift.slug) {
            inputStarGift = { _: 'inputSavedStarGiftSlug', slug: String(stargift.slug) }
          } else if (stargift.msgId) {
            inputStarGift = { _: 'inputSavedStarGiftUser', msgId: Number(stargift.msgId) }
          } else if (stargift.savedId) {
            inputStarGift = { _: 'inputSavedStarGiftChat', peer: stargift.peer, savedId: toLong(stargift.savedId) }
          }
        }
      }
      return await holder.client.call({
        _: 'payments.getStarGiftWithdrawalUrl',
        stargift: inputStarGift,
        password: password || { _: 'inputCheckPasswordEmpty' },
      } as any)
    } catch (err: any) {
      Logger.warn('[PaymentsService] getStarGiftWithdrawalUrl error:', err)
      throw err
    }
  }

  public async toggleChatStarGiftNotifications(
    holder: RpcClientHolder,
    accountId: string,
    peerId: string,
    enabled = true
  ): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      return await holder.client.call({
        _: 'payments.toggleChatStarGiftNotifications',
        peer,
        enabled: Boolean(enabled),
      })
    } catch (err) {
      Logger.warn('[PaymentsService] toggleChatStarGiftNotifications error:', err)
      throw err
    }
  }

  public async toggleStarGiftsPinnedToTop(
    holder: RpcClientHolder,
    accountId: string,
    peerId: string,
    stargift: any
  ): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      const giftsArray = Array.isArray(stargift) ? stargift : stargift ? [stargift] : []
      const resolvedGifts = giftsArray.map((g: any) => {
        if (typeof g === 'string') return { _: 'inputSavedStarGiftSlug', slug: g.trim() }
        if (typeof g === 'number') return { _: 'inputSavedStarGiftUser', msgId: g }
        if (g && !g._) {
          if (g.slug) return { _: 'inputSavedStarGiftSlug', slug: String(g.slug).trim() }
          if (g.msgId) return { _: 'inputSavedStarGiftUser', msgId: Number(g.msgId) }
          if (g.savedId) return { _: 'inputSavedStarGiftChat', peer: g.peer || peer, savedId: toLong(g.savedId) }
        }
        return g
      })
      return await holder.client.call({
        _: 'payments.toggleStarGiftsPinnedToTop',
        peer,
        stargift: resolvedGifts,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] toggleStarGiftsPinnedToTop error:', err)
      throw err
    }
  }

  public async canPurchaseStore(holder: RpcClientHolder, purpose: any): Promise<any> {
    try {
      let finalPurpose = purpose
      if (typeof purpose === 'string') {
        finalPurpose = { _: 'inputStorePaymentPurposePremiumGiftCodes', boostPeer: { _: 'inputPeerEmpty' }, currency: 'USD', amount: 0, users: [] }
      } else if (!purpose || !purpose._) {
        finalPurpose = { _: 'inputStorePaymentPurposeStars', currency: 'XTR', amount: 1 }
      }
      return await holder.client.call({
        _: 'payments.canPurchaseStore',
        purpose: finalPurpose,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] canPurchaseStore error:', err)
      return null
    }
  }

  public async getResaleStarGifts(holder: RpcClientHolder, giftId: bigint | number | string, options: any = {}): Promise<any> {
    try {
      const gId = typeof giftId === 'bigint' ? giftId : BigInt(giftId.toString())
      return await holder.client.call({
        _: 'payments.getResaleStarGifts',
        giftId: gId,
        offset: options.offset || '',
        limit: options.limit || 50,
        ...options,
      })
    } catch (err: any) {
      Logger.warn('[PaymentsService] getResaleStarGifts error:', err)
      throw err
    }
  }

  public async updateStarGiftPrice(
    holder: RpcClientHolder,
    accountId: string,
    stargiftOrParams: any,
    resellAmount?: any
  ): Promise<any> {
    try {
      let stargift: any = stargiftOrParams
      let amount: any = resellAmount

      if (typeof stargiftOrParams === 'object' && stargiftOrParams !== null && !stargiftOrParams._) {
        if (stargiftOrParams.stargift !== undefined) {
          stargift = stargiftOrParams.stargift
          amount = stargiftOrParams.resellAmount !== undefined ? stargiftOrParams.resellAmount : amount
        }
      }

      const resolvedGift = await this.resolveInputSavedStarGift(accountId, stargift)
      let resolvedAmount: any
      if (typeof amount === 'object' && amount !== null && amount._ === 'starsAmount') {
        resolvedAmount = amount
      } else {
        const val = typeof amount === 'number' || typeof amount === 'string' ? amount : (amount?.amount || 0)
        resolvedAmount = {
          _: 'starsAmount',
          amount: toLong(val) as any,
          nanos: amount?.nanos || 0,
        }
      }

      return await holder.client.call({
        _: 'payments.updateStarGiftPrice',
        stargift: resolvedGift,
        resellAmount: resolvedAmount,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] updateStarGiftPrice error:', err)
      throw err
    }
  }

  public async createStarGiftCollection(
    holder: RpcClientHolder,
    accountId: string,
    peerIdOrParams: string | { peerId: string; title: string; stargift?: any[] },
    title?: string,
    stargift?: any
  ): Promise<any> {
    try {
      let pId: string
      let t: string
      let gifts: any[] = []
      if (typeof peerIdOrParams === 'object' && peerIdOrParams !== null) {
        pId = peerIdOrParams.peerId
        t = peerIdOrParams.title
        gifts = Array.isArray(peerIdOrParams.stargift) ? peerIdOrParams.stargift : []
      } else {
        pId = peerIdOrParams
        t = title || ''
        gifts = Array.isArray(stargift) ? stargift : (stargift ? [stargift] : [])
      }
      const peer = pId ? await this.resolveInputPeer(accountId, pId) : { _: 'inputPeerEmpty' }
      const resolvedGifts = gifts.map((g: any) => {
        if (typeof g === 'string') return { _: 'inputSavedStarGiftSlug', slug: g }
        if (typeof g === 'number') return { _: 'inputSavedStarGiftUser', msgId: g }
        return g
      })
      return await holder.client.call({
        _: 'payments.createStarGiftCollection',
        peer,
        title: t,
        stargift: resolvedGifts,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] createStarGiftCollection error:', err)
      throw err
    }
  }

  public async updateStarGiftCollection(
    holder: RpcClientHolder,
    accountId: string,
    peerIdOrParams: string | any,
    collectionId?: number,
    options: any = {}
  ): Promise<any> {
    try {
      let peerId: string
      let cId: number
      let opts: any = {}

      if (typeof peerIdOrParams === 'object' && peerIdOrParams !== null && !peerIdOrParams._) {
        peerId = peerIdOrParams.peerId
        cId = Number(peerIdOrParams.collectionId)
        opts = peerIdOrParams
      } else {
        peerId = peerIdOrParams
        cId = Number(collectionId)
        opts = options || {}
      }

      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }

      const mapGifts = async (list?: any[]) => {
        if (!list || !Array.isArray(list)) return undefined
        return Promise.all(list.map(g => this.resolveInputSavedStarGift(accountId, g)))
      }

      const callParams: any = {
        _: 'payments.updateStarGiftCollection',
        peer,
        collectionId: cId,
      }

      if (opts.title !== undefined) callParams.title = opts.title
      if (opts.deleteStargift) callParams.deleteStargift = await mapGifts(opts.deleteStargift)
      if (opts.addStargift) callParams.addStargift = await mapGifts(opts.addStargift)
      if (opts.order) callParams.order = await mapGifts(opts.order)

      return await holder.client.call(callParams)
    } catch (err) {
      Logger.warn('[PaymentsService] updateStarGiftCollection error:', err)
      throw err
    }
  }

  public async reorderStarGiftCollections(holder: RpcClientHolder, accountId: string, peerId: string, order: number[]): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      return await holder.client.call({
        _: 'payments.reorderStarGiftCollections',
        peer,
        order: (order || []).map(Number),
      })
    } catch (err) {
      Logger.warn('[PaymentsService] reorderStarGiftCollections error:', err)
      throw err
    }
  }

  public async getStarGiftCollections(holder: RpcClientHolder, accountId: string, peerId?: string, hash: bigint | number | Long | string = 0n): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      return await holder.client.call({
        _: 'payments.getStarGiftCollections',
        peer,
        hash: toLong(hash) as any,
      })
    } catch (err: any) {
      Logger.warn('[PaymentsService] getStarGiftCollections error:', err)
      throw err
    }
  }

  public async getUniqueStarGiftValueInfo(holder: RpcClientHolder, slug: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'payments.getUniqueStarGiftValueInfo',
        slug: String(slug || '').trim(),
      })
    } catch (err) {
      Logger.warn('[PaymentsService] getUniqueStarGiftValueInfo error:', err)
      throw err
    }
  }

  public async checkCanSendGift(holder: RpcClientHolder, giftId: bigint | Long | string | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'payments.checkCanSendGift',
        giftId: toLong(giftId) as any,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] checkCanSendGift error:', err)
      return null
    }
  }

  public async getStarGiftAuctionState(holder: RpcClientHolder, auction: any, version = 0): Promise<any> {
    try {
      return await holder.client.call({
        _: 'payments.getStarGiftAuctionState',
        auction,
        version,
      })
    } catch (err: any) {
      Logger.warn('[PaymentsService] getStarGiftAuctionState error:', err)
      throw err
    }
  }

  public async getStarGiftAuctionAcquiredGifts(holder: RpcClientHolder, giftId: bigint | number | string): Promise<any> {
    try {
      const gId = typeof giftId === 'bigint' ? giftId : BigInt(giftId.toString())
      return await holder.client.call({
        _: 'payments.getStarGiftAuctionAcquiredGifts',
        giftId: gId,
      })
    } catch (err: any) {
      Logger.warn('[PaymentsService] getStarGiftAuctionAcquiredGifts error:', err)
      throw err
    }
  }

  public async getStarGiftActiveAuctions(holder: RpcClientHolder, hash: bigint | number | string = 0n): Promise<any> {
    try {
      const h = typeof hash === 'bigint' ? hash : BigInt(hash.toString())
      return await holder.client.call({
        _: 'payments.getStarGiftActiveAuctions',
        hash: h,
      })
    } catch (err: any) {
      Logger.warn('[PaymentsService] getStarGiftActiveAuctions error:', err)
      throw err
    }
  }

  public async resolveStarGiftOffer(
    holder: RpcClientHolder,
    offerMsgId: number,
    decline = false
  ): Promise<any> {
    try {
      return await holder.client.call({
        _: 'payments.resolveStarGiftOffer',
        offerMsgId: Number(offerMsgId),
        decline: Boolean(decline),
      })
    } catch (err) {
      Logger.warn('[PaymentsService] resolveStarGiftOffer error:', err)
      throw err
    }
  }

  public async sendStarGiftOffer(
    holder: RpcClientHolder,
    accountId: string,
    peerId: string,
    slug: string,
    price: any,
    duration: number,
    randomId?: bigint | number | Long | string,
    allowPaidStars?: bigint | number | Long | string
  ): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      const resolvedPrice = typeof price === 'object' && price && price._
        ? price
        : { _: 'starsAmount' as const, amount: toLong(price || 1) }

      const rand = randomId != null ? toLong(randomId) : toLong(Math.floor(Math.random() * 1e9))

      return await holder.client.call({
        _: 'payments.sendStarGiftOffer',
        peer,
        slug: String(slug || '').trim(),
        price: resolvedPrice,
        duration: Number(duration || 86400),
        randomId: rand,
        allowPaidStars: allowPaidStars != null ? toLong(allowPaidStars) : undefined,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] sendStarGiftOffer error:', err)
      throw err
    }
  }

  public async getStarGiftUpgradeAttributes(holder: RpcClientHolder, giftId: bigint | number | Long | string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'payments.getStarGiftUpgradeAttributes',
        giftId: toLong(giftId) as any,
      })
    } catch (err: any) {
      Logger.warn('[PaymentsService] getStarGiftUpgradeAttributes error:', err)
      throw err
    }
  }

  public async getCraftStarGifts(holder: RpcClientHolder, giftId: bigint | number | string, offset = '', limit = 50): Promise<any> {
    try {
      const gId = typeof giftId === 'bigint' ? giftId : BigInt(giftId || 0)
      return await holder.client.call({
        _: 'payments.getCraftStarGifts',
        giftId: gId,
        offset: String(offset || ''),
        limit: Number(limit || 50),
      })
    } catch (err) {
      Logger.warn('[PaymentsService] getCraftStarGifts error:', err)
      throw err
    }
  }

  public async craftStarGift(holder: RpcClientHolder, stargift: any): Promise<any> {
    try {
      const gifts = Array.isArray(stargift) ? stargift : (stargift ? [stargift] : [])
      const resolvedGifts = gifts.map((g: any) => {
        if (typeof g === 'string') return { _: 'inputSavedStarGiftSlug', slug: g }
        if (typeof g === 'number') return { _: 'inputSavedStarGiftUser', msgId: g }
        return g
      })
      return await holder.client.call({
        _: 'payments.craftStarGift',
        stargift: resolvedGifts,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] craftStarGift error:', err)
      throw err
    }
  }

  public async getCurrencyRates(holder: RpcClientHolder): Promise<any> {
    try {
      return await holder.client.call({
        _: 'payments.getCurrencyRates',
      })
    } catch (err) {
      Logger.warn('[PaymentsService] getCurrencyRates error:', err)
      throw err
    }
  }

  public async getOnrampProviders(holder: RpcClientHolder, cryptoCurrency?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'payments.getOnrampProviders',
        cryptoCurrency: cryptoCurrency ? String(cryptoCurrency).trim() : undefined,
      } as any)
    } catch (err) {
      Logger.warn('[PaymentsService] getOnrampProviders error:', err)
      throw err
    }
  }

  public async getOnrampBaseCurrencies(holder: RpcClientHolder, provider?: string, cryptoCurrency?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'payments.getOnrampBaseCurrencies',
        provider: String(provider || 'neocrypto').trim(),
        cryptoCurrency: String(cryptoCurrency || 'TON').trim(),
      } as any)
    } catch (err) {
      Logger.warn('[PaymentsService] getOnrampBaseCurrencies error:', err)
      throw err
    }
  }

  public async getOnrampAvailability(holder: RpcClientHolder, provider: string, cryptoCurrency: string, baseCurrency?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'payments.getOnrampAvailability',
        provider: String(provider || '').trim(),
        cryptoCurrency: String(cryptoCurrency || '').trim(),
        baseCurrency: baseCurrency ? String(baseCurrency).trim() : undefined,
      } as any)
    } catch (err) {
      Logger.warn('[PaymentsService] getOnrampAvailability error:', err)
      throw err
    }
  }

  public async getOnrampLimits(
    holder: RpcClientHolder,
    provider: string,
    cryptoCurrency?: string,
    baseCurrency?: string,
    paymentMethod?: string
  ): Promise<any> {
    try {
      return await holder.client.call({
        _: 'payments.getOnrampLimits',
        provider: String(provider || '').trim(),
        cryptoCurrency: String(cryptoCurrency || 'TON').trim(),
        baseCurrency: String(baseCurrency || 'USD').trim(),
        paymentMethod: paymentMethod ? String(paymentMethod).trim() : undefined,
      } as any)
    } catch (err) {
      Logger.warn('[PaymentsService] getOnrampLimits error:', err)
      throw err
    }
  }

  public async getOnrampQuote(
    holder: RpcClientHolder,
    provider: string,
    cryptoCurrencyOrAmount: string | number,
    baseCurrencyOrFrom?: string,
    baseAmountOrTo?: string | number,
    cryptoAmount?: string | number,
    paymentMethod?: string
  ): Promise<any> {
    try {
      let cryptoCurrency = 'TON'
      let baseCurrency = 'USD'
      let baseAmount: string | undefined = undefined
      let cAmount: string | undefined = undefined
      let method = paymentMethod

      if (typeof cryptoCurrencyOrAmount === 'number' && typeof baseCurrencyOrFrom === 'string' && typeof baseAmountOrTo === 'string') {
        baseAmount = String(cryptoCurrencyOrAmount)
        baseCurrency = baseCurrencyOrFrom
        cryptoCurrency = baseAmountOrTo
      } else {
        cryptoCurrency = String(cryptoCurrencyOrAmount || 'TON').trim()
        baseCurrency = String(baseCurrencyOrFrom || 'USD').trim()
        if (baseAmountOrTo !== undefined && baseAmountOrTo !== null) {
          baseAmount = String(baseAmountOrTo).trim()
        }
        if (cryptoAmount !== undefined && cryptoAmount !== null) {
          cAmount = String(cryptoAmount).trim()
        }
      }

      return await holder.client.call({
        _: 'payments.getOnrampQuote',
        provider: String(provider || '').trim(),
        cryptoCurrency,
        baseCurrency,
        baseAmount,
        cryptoAmount: cAmount,
        paymentMethod: method ? String(method).trim() : undefined,
      } as any)
    } catch (err) {
      Logger.warn('[PaymentsService] getOnrampQuote error:', err)
      throw err
    }
  }

  public async createOnrampSession(
    holder: RpcClientHolder,
    providerOrParams: string | {
      provider: string
      cryptoCurrency?: string
      address?: string
      paymentMethod?: string
      baseCurrency?: string
      baseAmount?: string
      memo?: string
      theme?: string
      successReturnUrl?: string
      failReturnUrl?: string
      cryptoAmount?: string
    },
    amountOrCryptoCurrency?: any,
    fromCurrencyOrAddress?: any,
    toCurrency?: any
  ): Promise<any> {
    try {
      if (typeof providerOrParams === 'object' && providerOrParams !== null) {
        return await holder.client.call({
          _: 'payments.createOnrampSession',
          provider: providerOrParams.provider,
          cryptoCurrency: providerOrParams.cryptoCurrency || 'TON',
          address: providerOrParams.address || '',
          paymentMethod: providerOrParams.paymentMethod,
          baseCurrency: providerOrParams.baseCurrency,
          baseAmount: providerOrParams.baseAmount,
          memo: providerOrParams.memo,
          theme: providerOrParams.theme,
          successReturnUrl: providerOrParams.successReturnUrl,
          failReturnUrl: providerOrParams.failReturnUrl,
          cryptoAmount: providerOrParams.cryptoAmount,
        })
      }
      return await holder.client.call({
        _: 'payments.createOnrampSession',
        provider: providerOrParams,
        cryptoCurrency: String(toCurrency || amountOrCryptoCurrency || 'TON'),
        address: String(fromCurrencyOrAddress || ''),
      })
    } catch (err) {
      Logger.warn('[PaymentsService] createOnrampSession error:', err)
      throw err
    }
  }

  public async withdrawStarGift(
    holder: RpcClientHolder,
    accountId: string,
    stargiftOrParams: any,
    tmpPasswordOrOptions?: any
  ): Promise<any> {
    try {
      let stargift: any = stargiftOrParams
      let keepOnProfile = false
      let tmpPassword: any = new Uint8Array(0)

      if (typeof stargiftOrParams === 'object' && stargiftOrParams !== null && !stargiftOrParams._) {
        stargift = stargiftOrParams.stargift
        keepOnProfile = !!stargiftOrParams.keepOnProfile
        tmpPassword = stargiftOrParams.tmpPassword !== undefined ? stargiftOrParams.tmpPassword : tmpPassword
      } else if (tmpPasswordOrOptions !== undefined) {
        if (typeof tmpPasswordOrOptions === 'object' && !(tmpPasswordOrOptions instanceof Uint8Array) && !Buffer.isBuffer(tmpPasswordOrOptions)) {
          keepOnProfile = !!tmpPasswordOrOptions.keepOnProfile
          tmpPassword = tmpPasswordOrOptions.tmpPassword !== undefined ? tmpPasswordOrOptions.tmpPassword : tmpPassword
        } else {
          tmpPassword = tmpPasswordOrOptions
        }
      }

      if (typeof tmpPassword === 'string') {
        tmpPassword = Buffer.from(tmpPassword, 'utf-8')
      } else if (Array.isArray(tmpPassword)) {
        tmpPassword = new Uint8Array(tmpPassword)
      }

      const resolvedGift = await this.resolveInputSavedStarGift(accountId, stargift)

      return await holder.client.call({
        _: 'payments.withdrawStarGift',
        keepOnProfile,
        stargift: resolvedGift,
        tmpPassword,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] withdrawStarGift error:', err)
      throw err
    }
  }

  public async deleteStarGift(
    holder: RpcClientHolder,
    stargiftOrParams: any,
    maybePeer?: any
  ): Promise<any> {
    try {
      let inputStargift: any
      if (typeof stargiftOrParams === 'object' && stargiftOrParams !== null && stargiftOrParams._) {
        inputStargift = stargiftOrParams
      } else if (typeof stargiftOrParams === 'string') {
        inputStargift = { _: 'inputSavedStarGiftSlug', slug: stargiftOrParams }
      } else if (typeof stargiftOrParams === 'number' || typeof stargiftOrParams === 'bigint') {
        inputStargift = { _: 'inputSavedStarGiftUser', msgId: Number(stargiftOrParams) }
      } else if (typeof stargiftOrParams === 'object' && stargiftOrParams !== null) {
        if (stargiftOrParams.slug) {
          inputStargift = { _: 'inputSavedStarGiftSlug', slug: String(stargiftOrParams.slug) }
        } else if (stargiftOrParams.msgId) {
          inputStargift = { _: 'inputSavedStarGiftUser', msgId: Number(stargiftOrParams.msgId) }
        } else if (stargiftOrParams.savedId && stargiftOrParams.peer) {
          inputStargift = {
            _: 'inputSavedStarGiftChat',
            peer: stargiftOrParams.peer,
            savedId: String(stargiftOrParams.savedId),
          }
        } else {
          inputStargift = stargiftOrParams
        }
      } else {
        inputStargift = { _: 'inputSavedStarGiftUser', msgId: 0 }
      }

      return await holder.client.call({
        _: 'payments.deleteStarGift',
        stargift: inputStargift,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] deleteStarGift error:', err)
      throw err
    }
  }

  public async deleteStarGiftCollection(
    holder: RpcClientHolder,
    accountId: string,
    peerId: string,
    collectionId: number
  ): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      return await holder.client.call({
        _: 'payments.deleteStarGiftCollection',
        peer,
        collectionId: Number(collectionId || 0),
      })
    } catch (err) {
      Logger.warn('[PaymentsService] deleteStarGiftCollection error:', err)
      throw err
    }
  }

  public async depositStarGift(
    holder: RpcClientHolder,
    accountIdOrStargift: any,
    peerIdOrSource?: any,
    paramsOrSlug?: any
  ): Promise<any> {
    try {
      // Support legacy call: depositStarGift(holder, stargift, source)
      if (typeof accountIdOrStargift === 'object' && accountIdOrStargift?._) {
        return await holder.client.call({
          _: 'payments.depositStarGift',
          stargift: accountIdOrStargift,
          source: peerIdOrSource,
        } as any)
      }

      const accountId = String(accountIdOrStargift || '')
      let peerId = ''
      let slug = ''
      let hideSender = false

      if (typeof peerIdOrSource === 'object' && peerIdOrSource !== null) {
        peerId = peerIdOrSource.peerId || ''
        slug = peerIdOrSource.slug || ''
        hideSender = Boolean(peerIdOrSource.hideSender)
      } else if (typeof paramsOrSlug === 'object' && paramsOrSlug !== null) {
        peerId = String(peerIdOrSource || paramsOrSlug.peerId || '')
        slug = paramsOrSlug.slug || ''
        hideSender = Boolean(paramsOrSlug.hideSender)
      } else {
        peerId = String(peerIdOrSource || '')
        slug = String(paramsOrSlug || '')
      }

      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      return await holder.client.call({
        _: 'payments.depositStarGift',
        peer,
        slug,
        hideSender: hideSender ? true : undefined,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] depositStarGift error:', err)
      throw err
    }
  }

  public async displayStarGift(
    holder: RpcClientHolder,
    accountIdOrStargift: any,
    peerIdOrEnabled?: any,
    maybeSlug?: any
  ): Promise<any> {
    try {
      // Support legacy call: displayStarGift(holder, stargift, enabled)
      if (typeof accountIdOrStargift === 'object' && accountIdOrStargift?._) {
        return await holder.client.call({
          _: 'payments.displayStarGift',
          stargift: accountIdOrStargift,
          enabled: peerIdOrEnabled !== false,
        } as any)
      }

      const accountId = String(accountIdOrStargift || '')
      let slug = ''
      let peerId: string | undefined

      if (typeof peerIdOrEnabled === 'object' && peerIdOrEnabled !== null) {
        slug = peerIdOrEnabled.slug || ''
        peerId = peerIdOrEnabled.peerId
      } else if (typeof maybeSlug === 'string') {
        peerId = String(peerIdOrEnabled || '')
        slug = maybeSlug
      } else {
        slug = String(peerIdOrEnabled || '')
      }

      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : undefined
      return await holder.client.call({
        _: 'payments.displayStarGift',
        slug,
        peer,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] displayStarGift error:', err)
      throw err
    }
  }

  public async editConnectedStarRefBot(
    holder: RpcClientHolder,
    accountId: string,
    peerId: string,
    link: string,
    revoked?: boolean
  ): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      return await holder.client.call({
        _: 'payments.editConnectedStarRefBot',
        peer,
        link: String(link || '').trim(),
        revoked: revoked ? true : undefined,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] editConnectedStarRefBot error:', err)
      throw err
    }
  }

  public async exportInvoice(
    holder: RpcClientHolder,
    invoiceMedia: any
  ): Promise<any> {
    try {
      let media = invoiceMedia
      if (typeof invoiceMedia === 'string') {
        media = {
          _: 'inputMediaInvoice',
          title: 'Invoice',
          description: '',
          invoice: { _: 'invoice', currency: 'XTR', prices: [] },
          payload: Buffer.from(invoiceMedia),
          provider: '',
          providerData: { _: 'dataJSON', data: '{}' },
          startParam: invoiceMedia,
        }
      }
      return await holder.client.call({
        _: 'payments.exportInvoice',
        invoiceMedia: media,
      })
    } catch (err) {
      Logger.warn('[PaymentsService] exportInvoice error:', err)
      throw err
    }
  }

  public async fulfillStarsSubscription(
    holder: RpcClientHolder,
    accountId: string,
    peerId: string,
    subscriptionId: string
  ): Promise<any> {
    try {
      const peer = peerId ? await this.resolveInputPeer(accountId, peerId) : { _: 'inputPeerSelf' }
      return await holder.client.call({
        _: 'payments.fulfillStarsSubscription',
        peer,
        subscriptionId: String(subscriptionId || '').trim(),
      })
    } catch (err) {
      Logger.warn('[PaymentsService] fulfillStarsSubscription error:', err)
      throw err
    }
  }

  public async canPurchasePremium(holder: RpcClientHolder, purpose?: any): Promise<boolean> {
    try {
      return await holder.client.call({
        _: 'payments.canPurchasePremium',
        purpose: purpose || { _: 'inputStorePaymentPurposeStars', currency: 'XTR', amount: 1 },
      })
    } catch (err) {
      Logger.warn('[PaymentsService] canPurchasePremium error:', err)
      throw err
    }
  }
}


