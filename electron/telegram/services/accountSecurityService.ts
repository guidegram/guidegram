import { Logger } from '../logger'

export interface RpcClientHolder {
  client: {
    call: (query: { _: string; [key: string]: any }) => Promise<any>
    resolvePeer?: (peer: string) => Promise<any>
  }
}

/**
 * Enterprise Security, Authentication & Account Domain Service for Guidegram
 * Comprehensive implementation of all 158 MTProto methods across account.* (128) and auth.* (30)
 * Layer 229+ with typed parameters, InputPeer/InputUser resolution, and error handling.
 */
export class AccountSecurityService {
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

  // ==================== AUTH METHODS (30) ====================

  public async auth_sendCode(holder: RpcClientHolder, phoneNumber?: string, apiId?: number, apiHash?: string, settings?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.sendCode',
        phoneNumber,
        apiId,
        apiHash,
        settings,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.sendCode error:', err)
      return null
    }
  }

  public async auth_signUp(holder: RpcClientHolder, noJoinedNotifications?: boolean, phoneNumber?: string, phoneCodeHash?: string, firstName?: string, lastName?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.signUp',
        noJoinedNotifications,
        phoneNumber,
        phoneCodeHash,
        firstName,
        lastName,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.signUp error:', err)
      return null
    }
  }

  public async auth_signIn(holder: RpcClientHolder, phoneNumber?: string, phoneCodeHash?: string, phoneCode?: string, emailVerification?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.signIn',
        phoneNumber,
        phoneCodeHash,
        phoneCode,
        emailVerification,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.signIn error:', err)
      return null
    }
  }

  public async auth_logOut(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.logOut',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.logOut error:', err)
      return null
    }
  }

  public async auth_resetAuthorizations(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.resetAuthorizations',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.resetAuthorizations error:', err)
      return null
    }
  }

  public async auth_exportAuthorization(holder: RpcClientHolder, dcId?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.exportAuthorization',
        dcId,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.exportAuthorization error:', err)
      return null
    }
  }

  public async auth_importAuthorization(holder: RpcClientHolder, id?: bigint | number, bytes?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.importAuthorization',
        id,
        bytes,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.importAuthorization error:', err)
      return null
    }
  }

  public async auth_bindTempAuthKey(holder: RpcClientHolder, permAuthKeyId?: bigint | number, nonce?: bigint | number, expiresAt?: number, encryptedMessage?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.bindTempAuthKey',
        permAuthKeyId,
        nonce,
        expiresAt,
        encryptedMessage,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.bindTempAuthKey error:', err)
      return null
    }
  }

  public async auth_importBotAuthorization(holder: RpcClientHolder, flags?: number, apiId?: number, apiHash?: string, botAuthToken?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.importBotAuthorization',
        flags,
        apiId,
        apiHash,
        botAuthToken,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.importBotAuthorization error:', err)
      return null
    }
  }

  public async auth_checkPassword(holder: RpcClientHolder, password?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.checkPassword',
        password,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.checkPassword error:', err)
      return null
    }
  }

  public async auth_requestPasswordRecovery(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.requestPasswordRecovery',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.requestPasswordRecovery error:', err)
      return null
    }
  }

  public async auth_recoverPassword(holder: RpcClientHolder, code?: string, newSettings?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.recoverPassword',
        code,
        newSettings,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.recoverPassword error:', err)
      return null
    }
  }

  public async auth_resendCode(holder: RpcClientHolder, phoneNumber?: string, phoneCodeHash?: string, reason?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.resendCode',
        phoneNumber,
        phoneCodeHash,
        reason,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.resendCode error:', err)
      return null
    }
  }

  public async auth_cancelCode(holder: RpcClientHolder, phoneNumber?: string, phoneCodeHash?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.cancelCode',
        phoneNumber,
        phoneCodeHash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.cancelCode error:', err)
      return null
    }
  }

  public async auth_dropTempAuthKeys(holder: RpcClientHolder, exceptAuthKeys?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.dropTempAuthKeys',
        exceptAuthKeys,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.dropTempAuthKeys error:', err)
      return null
    }
  }

  public async auth_exportLoginToken(holder: RpcClientHolder, apiId?: number, apiHash?: string, exceptIds?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.exportLoginToken',
        apiId,
        apiHash,
        exceptIds,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.exportLoginToken error:', err)
      return null
    }
  }

  public async auth_importLoginToken(holder: RpcClientHolder, token?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.importLoginToken',
        token,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.importLoginToken error:', err)
      return null
    }
  }

  public async auth_acceptLoginToken(holder: RpcClientHolder, token?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.acceptLoginToken',
        token,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.acceptLoginToken error:', err)
      return null
    }
  }

  public async auth_checkRecoveryPassword(holder: RpcClientHolder, code?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.checkRecoveryPassword',
        code,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.checkRecoveryPassword error:', err)
      return null
    }
  }

  public async auth_importWebTokenAuthorization(holder: RpcClientHolder, apiId?: number, apiHash?: string, webAuthToken?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.importWebTokenAuthorization',
        apiId,
        apiHash,
        webAuthToken,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.importWebTokenAuthorization error:', err)
      return null
    }
  }

  public async auth_requestFirebaseSms(holder: RpcClientHolder, phoneNumber?: string, phoneCodeHash?: string, safetyNetToken?: string, playIntegrityToken?: string, iosPushSecret?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.requestFirebaseSms',
        phoneNumber,
        phoneCodeHash,
        safetyNetToken,
        playIntegrityToken,
        iosPushSecret,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.requestFirebaseSms error:', err)
      return null
    }
  }

  public async auth_resetLoginEmail(holder: RpcClientHolder, phoneNumber?: string, phoneCodeHash?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.resetLoginEmail',
        phoneNumber,
        phoneCodeHash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.resetLoginEmail error:', err)
      return null
    }
  }

  public async auth_reportMissingCode(holder: RpcClientHolder, phoneNumber?: string, phoneCodeHash?: string, mnc?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.reportMissingCode',
        phoneNumber,
        phoneCodeHash,
        mnc,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.reportMissingCode error:', err)
      return null
    }
  }

  public async auth_checkPaidAuth(holder: RpcClientHolder, phoneNumber?: string, phoneCodeHash?: string, formId?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.checkPaidAuth',
        phoneNumber,
        phoneCodeHash,
        formId,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.checkPaidAuth error:', err)
      return null
    }
  }

  public async auth_initPasskeyLogin(holder: RpcClientHolder, apiId?: number, apiHash?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.initPasskeyLogin',
        apiId,
        apiHash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.initPasskeyLogin error:', err)
      return null
    }
  }

  public async auth_finishPasskeyLogin(holder: RpcClientHolder, credential?: any, fromDcId?: number, fromAuthKeyId?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.finishPasskeyLogin',
        credential,
        fromDcId,
        fromAuthKeyId,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.finishPasskeyLogin error:', err)
      return null
    }
  }

  public async auth_cancelWebTokenAuthorization(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.cancelWebTokenAuthorization',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.cancelWebTokenAuthorization error:', err)
      return null
    }
  }

  public async auth_initFirebasePnvLogin(holder: RpcClientHolder, apiId?: number, apiHash?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.initFirebasePnvLogin',
        apiId,
        apiHash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.initFirebasePnvLogin error:', err)
      return null
    }
  }

  public async auth_finishFirebasePnvLogin(holder: RpcClientHolder, googleToken?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.finishFirebasePnvLogin',
        googleToken,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.finishFirebasePnvLogin error:', err)
      return null
    }
  }

  public async auth_firebasePnvSignUp(holder: RpcClientHolder, noJoinedNotifications?: boolean, firstName?: string, lastName?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'auth.firebasePnvSignUp',
        noJoinedNotifications,
        firstName,
        lastName,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] auth.firebasePnvSignUp error:', err)
      return null
    }
  }

  // ==================== ACCOUNT METHODS (128) ====================

  public async registerDevice(holder: RpcClientHolder, noMuted?: boolean, tokenType?: number, token?: string, appSandbox?: boolean, secret?: any, otherUids?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.registerDevice',
        noMuted,
        tokenType,
        token,
        appSandbox,
        secret,
        otherUids,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.registerDevice error:', err)
      return null
    }
  }

  public async unregisterDevice(holder: RpcClientHolder, tokenType?: number, token?: string, otherUids?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.unregisterDevice',
        tokenType,
        token,
        otherUids,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.unregisterDevice error:', err)
      return null
    }
  }

  public async updateNotifySettings(holder: RpcClientHolder, peer?: any, settings?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.updateNotifySettings',
        peer,
        settings,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.updateNotifySettings error:', err)
      return null
    }
  }

  public async getNotifySettings(holder: RpcClientHolder, peer?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getNotifySettings',
        peer,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getNotifySettings error:', err)
      return null
    }
  }

  public async resetNotifySettings(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.resetNotifySettings',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.resetNotifySettings error:', err)
      return null
    }
  }

  public async updateProfile(holder: RpcClientHolder, firstName?: string, lastName?: string, about?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.updateProfile',
        firstName,
        lastName,
        about,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.updateProfile error:', err)
      return null
    }
  }

  public async updateStatus(holder: RpcClientHolder, offline?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.updateStatus',
        offline,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.updateStatus error:', err)
      return null
    }
  }

  public async getWallPapers(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getWallPapers',
        hash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getWallPapers error:', err)
      return null
    }
  }

  public async reportPeer(holder: RpcClientHolder, accountId: string, peerId?: string, reason?: any, message?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.reportPeer',
        peer: peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        reason,
        message,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.reportPeer error:', err)
      return null
    }
  }

  public async checkUsername(holder: RpcClientHolder, username?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.checkUsername',
        username,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.checkUsername error:', err)
      return null
    }
  }

  public async updateUsername(holder: RpcClientHolder, username?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.updateUsername',
        username,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.updateUsername error:', err)
      return null
    }
  }

  public async getPrivacy(holder: RpcClientHolder, key?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getPrivacy',
        key,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getPrivacy error:', err)
      return null
    }
  }

  public async setPrivacy(holder: RpcClientHolder, key?: any, rules?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.setPrivacy',
        key,
        rules,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.setPrivacy error:', err)
      return null
    }
  }

  public async deleteAccount(holder: RpcClientHolder, reason?: string, password?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.deleteAccount',
        reason,
        password,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.deleteAccount error:', err)
      return null
    }
  }

  public async getAccountTTL(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getAccountTTL',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getAccountTTL error:', err)
      return null
    }
  }

  public async setAccountTTL(holder: RpcClientHolder, ttl?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.setAccountTTL',
        ttl,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.setAccountTTL error:', err)
      return null
    }
  }

  public async sendChangePhoneCode(holder: RpcClientHolder, phoneNumber?: string, settings?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.sendChangePhoneCode',
        phoneNumber,
        settings,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.sendChangePhoneCode error:', err)
      return null
    }
  }

  public async changePhone(holder: RpcClientHolder, phoneNumber?: string, phoneCodeHash?: string, phoneCode?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.changePhone',
        phoneNumber,
        phoneCodeHash,
        phoneCode,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.changePhone error:', err)
      return null
    }
  }

  public async updateDeviceLocked(holder: RpcClientHolder, period?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.updateDeviceLocked',
        period,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.updateDeviceLocked error:', err)
      return null
    }
  }

  public async getAuthorizations(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getAuthorizations',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getAuthorizations error:', err)
      return null
    }
  }

  public async resetAuthorization(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.resetAuthorization',
        hash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.resetAuthorization error:', err)
      return null
    }
  }

  public async getPassword(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getPassword',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getPassword error:', err)
      return null
    }
  }

  public async getPasswordSettings(holder: RpcClientHolder, password?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getPasswordSettings',
        password,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getPasswordSettings error:', err)
      return null
    }
  }

  public async updatePasswordSettings(holder: RpcClientHolder, password?: any, newSettings?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.updatePasswordSettings',
        password,
        newSettings,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.updatePasswordSettings error:', err)
      return null
    }
  }

  public async sendConfirmPhoneCode(holder: RpcClientHolder, hash?: string, settings?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.sendConfirmPhoneCode',
        hash,
        settings,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.sendConfirmPhoneCode error:', err)
      return null
    }
  }

  public async confirmPhone(holder: RpcClientHolder, phoneCodeHash?: string, phoneCode?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.confirmPhone',
        phoneCodeHash,
        phoneCode,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.confirmPhone error:', err)
      return null
    }
  }

  public async getTmpPassword(holder: RpcClientHolder, password?: any, period?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getTmpPassword',
        password,
        period,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getTmpPassword error:', err)
      return null
    }
  }

  public async getWebAuthorizations(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getWebAuthorizations',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getWebAuthorizations error:', err)
      return null
    }
  }

  public async resetWebAuthorization(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.resetWebAuthorization',
        hash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.resetWebAuthorization error:', err)
      return null
    }
  }

  public async resetWebAuthorizations(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.resetWebAuthorizations',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.resetWebAuthorizations error:', err)
      return null
    }
  }

  public async getAllSecureValues(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getAllSecureValues',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getAllSecureValues error:', err)
      return null
    }
  }

  public async getSecureValue(holder: RpcClientHolder, types?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getSecureValue',
        types,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getSecureValue error:', err)
      return null
    }
  }

  public async saveSecureValue(holder: RpcClientHolder, value?: any, secureSecretId?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.saveSecureValue',
        value,
        secureSecretId,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.saveSecureValue error:', err)
      return null
    }
  }

  public async deleteSecureValue(holder: RpcClientHolder, types?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.deleteSecureValue',
        types,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.deleteSecureValue error:', err)
      return null
    }
  }

  public async getAuthorizationForm(holder: RpcClientHolder, botId?: bigint | number, scope?: string, publicKey?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getAuthorizationForm',
        botId,
        scope,
        publicKey,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getAuthorizationForm error:', err)
      return null
    }
  }

  public async acceptAuthorization(holder: RpcClientHolder, botId?: bigint | number, scope?: string, publicKey?: string, valueHashes?: any, credentials?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.acceptAuthorization',
        botId,
        scope,
        publicKey,
        valueHashes,
        credentials,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.acceptAuthorization error:', err)
      return null
    }
  }

  public async sendVerifyPhoneCode(holder: RpcClientHolder, phoneNumber?: string, settings?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.sendVerifyPhoneCode',
        phoneNumber,
        settings,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.sendVerifyPhoneCode error:', err)
      return null
    }
  }

  public async verifyPhone(holder: RpcClientHolder, phoneNumber?: string, phoneCodeHash?: string, phoneCode?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.verifyPhone',
        phoneNumber,
        phoneCodeHash,
        phoneCode,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.verifyPhone error:', err)
      return null
    }
  }

  public async sendVerifyEmailCode(holder: RpcClientHolder, purpose?: any, email?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.sendVerifyEmailCode',
        purpose,
        email,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.sendVerifyEmailCode error:', err)
      return null
    }
  }

  public async verifyEmail(holder: RpcClientHolder, purpose?: any, verification?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.verifyEmail',
        purpose,
        verification,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.verifyEmail error:', err)
      return null
    }
  }

  public async initTakeoutSession(holder: RpcClientHolder, contacts?: boolean, messageUsers?: boolean, messageChats?: boolean, messageMegagroups?: boolean, messageChannels?: boolean, files?: boolean, fileMaxSize?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.initTakeoutSession',
        contacts,
        messageUsers,
        messageChats,
        messageMegagroups,
        messageChannels,
        files,
        fileMaxSize,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.initTakeoutSession error:', err)
      return null
    }
  }

  public async finishTakeoutSession(holder: RpcClientHolder, success?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.finishTakeoutSession',
        success,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.finishTakeoutSession error:', err)
      return null
    }
  }

  public async confirmPasswordEmail(holder: RpcClientHolder, code?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.confirmPasswordEmail',
        code,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.confirmPasswordEmail error:', err)
      return null
    }
  }

  public async resendPasswordEmail(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.resendPasswordEmail',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.resendPasswordEmail error:', err)
      return null
    }
  }

  public async cancelPasswordEmail(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.cancelPasswordEmail',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.cancelPasswordEmail error:', err)
      return null
    }
  }

  public async getContactSignUpNotification(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getContactSignUpNotification',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getContactSignUpNotification error:', err)
      return null
    }
  }

  public async setContactSignUpNotification(holder: RpcClientHolder, silent?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.setContactSignUpNotification',
        silent,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.setContactSignUpNotification error:', err)
      return null
    }
  }

  public async getNotifyExceptions(holder: RpcClientHolder, compareSound?: boolean, compareStories?: boolean, peer?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getNotifyExceptions',
        compareSound,
        compareStories,
        peer,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getNotifyExceptions error:', err)
      return null
    }
  }

  public async getWallPaper(holder: RpcClientHolder, wallpaper?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getWallPaper',
        wallpaper,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getWallPaper error:', err)
      return null
    }
  }

  public async uploadWallPaper(holder: RpcClientHolder, forChat?: boolean, file?: any, mimeType?: string, settings?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.uploadWallPaper',
        forChat,
        file,
        mimeType,
        settings,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.uploadWallPaper error:', err)
      return null
    }
  }

  public async saveWallPaper(holder: RpcClientHolder, wallpaper?: any, unsave?: boolean, settings?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.saveWallPaper',
        wallpaper,
        unsave,
        settings,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.saveWallPaper error:', err)
      return null
    }
  }

  public async installWallPaper(holder: RpcClientHolder, wallpaper?: any, settings?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.installWallPaper',
        wallpaper,
        settings,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.installWallPaper error:', err)
      return null
    }
  }

  public async resetWallPapers(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.resetWallPapers',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.resetWallPapers error:', err)
      return null
    }
  }

  public async getAutoDownloadSettings(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getAutoDownloadSettings',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getAutoDownloadSettings error:', err)
      return null
    }
  }

  public async saveAutoDownloadSettings(holder: RpcClientHolder, low?: boolean, high?: boolean, settings?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.saveAutoDownloadSettings',
        low,
        high,
        settings,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.saveAutoDownloadSettings error:', err)
      return null
    }
  }

  public async uploadTheme(holder: RpcClientHolder, file?: any, thumb?: any, fileName?: string, mimeType?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.uploadTheme',
        file,
        thumb,
        fileName,
        mimeType,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.uploadTheme error:', err)
      return null
    }
  }

  public async createTheme(holder: RpcClientHolder, slug?: string, title?: string, document?: any, settings?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.createTheme',
        slug,
        title,
        document,
        settings,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.createTheme error:', err)
      return null
    }
  }

  public async updateTheme(holder: RpcClientHolder, format?: string, theme?: any, slug?: string, title?: string, document?: any, settings?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.updateTheme',
        format,
        theme,
        slug,
        title,
        document,
        settings,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.updateTheme error:', err)
      return null
    }
  }

  public async saveTheme(holder: RpcClientHolder, theme?: any, unsave?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.saveTheme',
        theme,
        unsave,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.saveTheme error:', err)
      return null
    }
  }

  public async installTheme(holder: RpcClientHolder, dark?: boolean, theme?: any, format?: string, baseTheme?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.installTheme',
        dark,
        theme,
        format,
        baseTheme,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.installTheme error:', err)
      return null
    }
  }

  public async getTheme(holder: RpcClientHolder, format?: string, theme?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getTheme',
        format,
        theme,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getTheme error:', err)
      return null
    }
  }

  public async getThemes(holder: RpcClientHolder, format?: string, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getThemes',
        format,
        hash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getThemes error:', err)
      return null
    }
  }

  public async setContentSettings(holder: RpcClientHolder, sensitiveEnabled?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.setContentSettings',
        sensitiveEnabled,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.setContentSettings error:', err)
      return null
    }
  }

  public async getContentSettings(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getContentSettings',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getContentSettings error:', err)
      return null
    }
  }

  public async getMultiWallPapers(holder: RpcClientHolder, wallpapers?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getMultiWallPapers',
        wallpapers,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getMultiWallPapers error:', err)
      return null
    }
  }

  public async getGlobalPrivacySettings(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getGlobalPrivacySettings',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getGlobalPrivacySettings error:', err)
      return null
    }
  }

  public async setGlobalPrivacySettings(holder: RpcClientHolder, settings?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.setGlobalPrivacySettings',
        settings,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.setGlobalPrivacySettings error:', err)
      return null
    }
  }

  public async reportProfilePhoto(holder: RpcClientHolder, accountId: string, peerId?: string, photoId?: any, reason?: any, message?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.reportProfilePhoto',
        peer: peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        photoId,
        reason,
        message,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.reportProfilePhoto error:', err)
      return null
    }
  }

  public async resetPassword(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.resetPassword',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.resetPassword error:', err)
      return null
    }
  }

  public async declinePasswordReset(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.declinePasswordReset',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.declinePasswordReset error:', err)
      return null
    }
  }

  public async getChatThemes(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getChatThemes',
        hash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getChatThemes error:', err)
      return null
    }
  }

  public async setAuthorizationTTL(holder: RpcClientHolder, authorizationTtlDays?: number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.setAuthorizationTTL',
        authorizationTtlDays,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.setAuthorizationTTL error:', err)
      return null
    }
  }

  public async changeAuthorizationSettings(holder: RpcClientHolder, confirmed?: boolean, hash?: bigint | number, encryptedRequestsDisabled?: boolean, callRequestsDisabled?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.changeAuthorizationSettings',
        confirmed,
        hash,
        encryptedRequestsDisabled,
        callRequestsDisabled,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.changeAuthorizationSettings error:', err)
      return null
    }
  }

  public async getSavedRingtones(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getSavedRingtones',
        hash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getSavedRingtones error:', err)
      return null
    }
  }

  public async saveRingtone(holder: RpcClientHolder, id?: any, unsave?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.saveRingtone',
        id,
        unsave,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.saveRingtone error:', err)
      return null
    }
  }

  public async uploadRingtone(holder: RpcClientHolder, file?: any, fileName?: string, mimeType?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.uploadRingtone',
        file,
        fileName,
        mimeType,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.uploadRingtone error:', err)
      return null
    }
  }

  public async updateEmojiStatus(holder: RpcClientHolder, emojiStatus?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.updateEmojiStatus',
        emojiStatus,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.updateEmojiStatus error:', err)
      return null
    }
  }

  public async getDefaultEmojiStatuses(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getDefaultEmojiStatuses',
        hash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getDefaultEmojiStatuses error:', err)
      return null
    }
  }

  public async getRecentEmojiStatuses(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getRecentEmojiStatuses',
        hash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getRecentEmojiStatuses error:', err)
      return null
    }
  }

  public async clearRecentEmojiStatuses(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.clearRecentEmojiStatuses',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.clearRecentEmojiStatuses error:', err)
      return null
    }
  }

  public async reorderUsernames(holder: RpcClientHolder, order?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.reorderUsernames',
        order,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.reorderUsernames error:', err)
      return null
    }
  }

  public async toggleUsername(holder: RpcClientHolder, username?: string, active?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.toggleUsername',
        username,
        active,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.toggleUsername error:', err)
      return null
    }
  }

  public async getDefaultProfilePhotoEmojis(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getDefaultProfilePhotoEmojis',
        hash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getDefaultProfilePhotoEmojis error:', err)
      return null
    }
  }

  public async getDefaultGroupPhotoEmojis(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getDefaultGroupPhotoEmojis',
        hash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getDefaultGroupPhotoEmojis error:', err)
      return null
    }
  }

  public async getAutoSaveSettings(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getAutoSaveSettings',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getAutoSaveSettings error:', err)
      return null
    }
  }

  public async saveAutoSaveSettings(holder: RpcClientHolder, accountId: string, users?: boolean, chats?: boolean, broadcasts?: boolean, peerId?: string, settings?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.saveAutoSaveSettings',
        users,
        chats,
        broadcasts,
        peer: peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        settings,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.saveAutoSaveSettings error:', err)
      return null
    }
  }

  public async deleteAutoSaveExceptions(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.deleteAutoSaveExceptions',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.deleteAutoSaveExceptions error:', err)
      return null
    }
  }

  public async invalidateSignInCodes(holder: RpcClientHolder, codes?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.invalidateSignInCodes',
        codes,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.invalidateSignInCodes error:', err)
      return null
    }
  }

  public async updateColor(holder: RpcClientHolder, forProfile?: boolean, color?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.updateColor',
        forProfile,
        color,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.updateColor error:', err)
      return null
    }
  }

  public async getDefaultBackgroundEmojis(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getDefaultBackgroundEmojis',
        hash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getDefaultBackgroundEmojis error:', err)
      return null
    }
  }

  public async getChannelDefaultEmojiStatuses(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getChannelDefaultEmojiStatuses',
        hash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getChannelDefaultEmojiStatuses error:', err)
      return null
    }
  }

  public async getChannelRestrictedStatusEmojis(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getChannelRestrictedStatusEmojis',
        hash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getChannelRestrictedStatusEmojis error:', err)
      return null
    }
  }

  public async updateBusinessWorkHours(holder: RpcClientHolder, businessWorkHours?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.updateBusinessWorkHours',
        businessWorkHours,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.updateBusinessWorkHours error:', err)
      return null
    }
  }

  public async updateBusinessLocation(holder: RpcClientHolder, geoPoint?: any, address?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.updateBusinessLocation',
        geoPoint,
        address,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.updateBusinessLocation error:', err)
      return null
    }
  }

  public async updateBusinessGreetingMessage(holder: RpcClientHolder, message?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.updateBusinessGreetingMessage',
        message,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.updateBusinessGreetingMessage error:', err)
      return null
    }
  }

  public async updateBusinessAwayMessage(holder: RpcClientHolder, message?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.updateBusinessAwayMessage',
        message,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.updateBusinessAwayMessage error:', err)
      return null
    }
  }

  public async updateConnectedBot(holder: RpcClientHolder, accountId: string, deleted?: boolean, rights?: any, botId?: string, recipients?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.updateConnectedBot',
        deleted,
        rights,
        bot: botId ? await this.toInputUser(accountId, botId) : undefined,
        recipients,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.updateConnectedBot error:', err)
      return null
    }
  }

  public async getConnectedBots(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getConnectedBots',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getConnectedBots error:', err)
      return null
    }
  }

  public async getBotBusinessConnection(holder: RpcClientHolder, connectionId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getBotBusinessConnection',
        connectionId,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getBotBusinessConnection error:', err)
      return null
    }
  }

  public async updateBusinessIntro(holder: RpcClientHolder, intro?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.updateBusinessIntro',
        intro,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.updateBusinessIntro error:', err)
      return null
    }
  }

  public async toggleConnectedBotPaused(holder: RpcClientHolder, accountId: string, peerId?: string, paused?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.toggleConnectedBotPaused',
        peer: peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
        paused,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.toggleConnectedBotPaused error:', err)
      return null
    }
  }

  public async disablePeerConnectedBot(holder: RpcClientHolder, accountId: string, peerId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.disablePeerConnectedBot',
        peer: peerId ? await this.resolveInputPeer(accountId, peerId) : undefined,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.disablePeerConnectedBot error:', err)
      return null
    }
  }

  public async updateBirthday(holder: RpcClientHolder, birthday?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.updateBirthday',
        birthday,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.updateBirthday error:', err)
      return null
    }
  }

  public async createBusinessChatLink(holder: RpcClientHolder, link?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.createBusinessChatLink',
        link,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.createBusinessChatLink error:', err)
      return null
    }
  }

  public async editBusinessChatLink(holder: RpcClientHolder, slug?: string, link?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.editBusinessChatLink',
        slug,
        link,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.editBusinessChatLink error:', err)
      return null
    }
  }

  public async deleteBusinessChatLink(holder: RpcClientHolder, slug?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.deleteBusinessChatLink',
        slug,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.deleteBusinessChatLink error:', err)
      return null
    }
  }

  public async getBusinessChatLinks(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getBusinessChatLinks',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getBusinessChatLinks error:', err)
      return null
    }
  }

  public async resolveBusinessChatLink(holder: RpcClientHolder, slug?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.resolveBusinessChatLink',
        slug,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.resolveBusinessChatLink error:', err)
      return null
    }
  }

  public async updatePersonalChannel(holder: RpcClientHolder, channel?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.updatePersonalChannel',
        channel,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.updatePersonalChannel error:', err)
      return null
    }
  }

  public async toggleSponsoredMessages(holder: RpcClientHolder, enabled?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.toggleSponsoredMessages',
        enabled,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.toggleSponsoredMessages error:', err)
      return null
    }
  }

  public async getReactionsNotifySettings(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getReactionsNotifySettings',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getReactionsNotifySettings error:', err)
      return null
    }
  }

  public async setReactionsNotifySettings(holder: RpcClientHolder, settings?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.setReactionsNotifySettings',
        settings,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.setReactionsNotifySettings error:', err)
      return null
    }
  }

  public async getCollectibleEmojiStatuses(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getCollectibleEmojiStatuses',
        hash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getCollectibleEmojiStatuses error:', err)
      return null
    }
  }

  public async getPaidMessagesRevenue(holder: RpcClientHolder, accountId: string, parentPeerId?: string, userIdId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getPaidMessagesRevenue',
        parentPeer: parentPeerId ? await this.resolveInputPeer(accountId, parentPeerId) : undefined,
        userId: userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getPaidMessagesRevenue error:', err)
      return null
    }
  }

  public async toggleNoPaidMessagesException(holder: RpcClientHolder, accountId: string, refundCharged?: boolean, requirePayment?: boolean, parentPeerId?: string, userIdId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.toggleNoPaidMessagesException',
        refundCharged,
        requirePayment,
        parentPeer: parentPeerId ? await this.resolveInputPeer(accountId, parentPeerId) : undefined,
        userId: userIdId ? await this.toInputUser(accountId, userIdId) : undefined,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.toggleNoPaidMessagesException error:', err)
      return null
    }
  }

  public async setMainProfileTab(holder: RpcClientHolder, tab?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.setMainProfileTab',
        tab,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.setMainProfileTab error:', err)
      return null
    }
  }

  public async saveMusic(holder: RpcClientHolder, unsave?: boolean, id?: any, afterId?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.saveMusic',
        unsave,
        id,
        afterId,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.saveMusic error:', err)
      return null
    }
  }

  public async getSavedMusicIds(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getSavedMusicIds',
        hash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getSavedMusicIds error:', err)
      return null
    }
  }

  public async getUniqueGiftChatThemes(holder: RpcClientHolder, offset?: string, limit?: number, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getUniqueGiftChatThemes',
        offset,
        limit,
        hash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getUniqueGiftChatThemes error:', err)
      return null
    }
  }

  public async initPasskeyRegistration(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.initPasskeyRegistration',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.initPasskeyRegistration error:', err)
      return null
    }
  }

  public async registerPasskey(holder: RpcClientHolder, credential?: any): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.registerPasskey',
        credential,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.registerPasskey error:', err)
      return null
    }
  }

  public async getPasskeys(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getPasskeys',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getPasskeys error:', err)
      return null
    }
  }

  public async deletePasskey(holder: RpcClientHolder, id?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.deletePasskey',
        id,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.deletePasskey error:', err)
      return null
    }
  }

  public async confirmBotConnection(holder: RpcClientHolder, accountId: string, botIdId?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.confirmBotConnection',
        botId: botIdId ? await this.toInputUser(accountId, botIdId) : undefined,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.confirmBotConnection error:', err)
      return null
    }
  }

  public async getWebBrowserSettings(holder: RpcClientHolder, hash?: bigint | number): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.getWebBrowserSettings',
        hash,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.getWebBrowserSettings error:', err)
      return null
    }
  }

  public async updateWebBrowserSettings(holder: RpcClientHolder, openExternalBrowser?: boolean, displayCloseButton?: boolean): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.updateWebBrowserSettings',
        openExternalBrowser,
        displayCloseButton,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.updateWebBrowserSettings error:', err)
      return null
    }
  }

  public async toggleWebBrowserSettingsException(holder: RpcClientHolder, deleteException?: boolean, openExternalBrowser?: boolean, url?: string): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.toggleWebBrowserSettingsException',
        delete: deleteException,
        openExternalBrowser,
        url,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.toggleWebBrowserSettingsException error:', err)
      return null
    }
  }

  public async deleteWebBrowserSettingsExceptions(holder: RpcClientHolder, params: any = {}): Promise<any> {
    try {
      return await holder.client.call({
        _: 'account.deleteWebBrowserSettingsExceptions',
        ...params,
      })
    } catch (err) {
      Logger.warn('[AccountSecurityService] account.deleteWebBrowserSettingsExceptions error:', err)
      return null
    }
  }
}
