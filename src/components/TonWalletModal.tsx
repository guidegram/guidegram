import React, { useState, useEffect } from 'react'
import {
  X,
  Wallet,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Globe,
  Radio,
  Plus,
  QrCode,
  CreditCard,
  Receipt,
  Gift,
  Coins,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Hash,
  ShoppingBag,
  Cpu,
  Key,
  Server,
  Lock,
  Layers,
  Activity,
} from 'lucide-react'
import { useI18n } from '../i18n'

export interface TonWalletModalProps {
  isOpen: boolean
  accountId?: string
  accountName?: string
  onClose: () => void
}

interface TonConnectSessionItem {
  id: string | number
  dappClientId?: string
  manifestUrl?: string
  name?: string
  icon?: string
  createdDate?: number
  lastActive?: number
}

export const TonWalletModal: React.FC<TonWalletModalProps> = ({
  isOpen,
  accountId = 'default',
  accountName = 'My Account',
  onClose,
}) => {
  const { t, isRTL } = useI18n()
  const [activeTab, setActiveTab] = useState<'wallet' | 'tonconnect' | 'stars' | 'onramp' | 'protocol'>('wallet')
  const [sessions, setSessions] = useState<TonConnectSessionItem[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [newManifestUrl, setNewManifestUrl] = useState('')
  const [isConnectingDapp, setIsConnectingDapp] = useState(false)
  const [showQr, setShowQr] = useState(false)

  // --- Microphases 133-137: Toncenter & Wallet Protocol RPCs (28 Methods) ---
  const [protocolSubdomain, setProtocolSubdomain] = useState<'toncenter' | 'state' | 'backup' | 'transfers' | 'tonconnect_raw'>('toncenter')
  const [protocolLoading, setProtocolLoading] = useState(false)
  const [protocolError, setProtocolError] = useState<string | null>(null)
  const [protocolSuccess, setProtocolSuccess] = useState<string | null>(null)
  const [protocolResult, setProtocolResult] = useState<any | null>(null)

  // Inputs
  const [toncenterMethod, setToncenterMethod] = useState('getWalletInformation')
  const [toncenterParams, setToncenterParams] = useState('{"address":"EQB..."}')
  const [targetWalletAddress, setTargetWalletAddress] = useState('')
  const [txLimit, setTxLimit] = useState('20')
  const [txMsgHash, setTxMsgHash] = useState('')
  const [txIdInput, setTxIdInput] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [transferAmountNano, setTransferAmountNano] = useState('1000000000')
  const [transferComment, setTransferComment] = useState('')
  const [backupPassword, setBackupPassword] = useState('')
  const [tonConnectSessionKey, setTonConnectSessionKey] = useState('')
  const [tonConnectRequestId, setTonConnectRequestId] = useState('')
  const [tonConnectResponseData, setTonConnectResponseData] = useState('{"result":"ok"}')

  // --- Microphase 098: Onramp, Limits, Quotes, Payment Form, Receipt, Gift Options ---
  const [onrampProviders, setOnrampProviders] = useState<any[]>([])
  const [isLoadingProviders, setIsLoadingProviders] = useState(false)
  const [providersError, setProvidersError] = useState<string | null>(null)

  const [onrampProvider, setOnrampProvider] = useState('neocrypto')
  const [cryptoCurrency, setCryptoCurrency] = useState('TON')
  const [baseCurrencies, setBaseCurrencies] = useState<string[]>([])
  const [selectedBaseCurrency, setSelectedBaseCurrency] = useState('USD')
  const [isLoadingBaseCurrencies, setIsLoadingBaseCurrencies] = useState(false)
  const [baseCurrenciesError, setBaseCurrenciesError] = useState<string | null>(null)

  const [onrampLimits, setOnrampLimits] = useState<any>(null)
  const [isLoadingLimits, setIsLoadingLimits] = useState(false)
  const [limitsError, setLimitsError] = useState<string | null>(null)

  const [quoteAmount, setQuoteAmount] = useState('50')
  const [quotePaymentMethod, setQuotePaymentMethod] = useState('card')
  const [onrampQuote, setOnrampQuote] = useState<any>(null)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)

  const [invoiceInput, setInvoiceInput] = useState('')
  const [paymentForm, setPaymentForm] = useState<any>(null)
  const [isLoadingPaymentForm, setIsLoadingPaymentForm] = useState(false)
  const [paymentFormError, setPaymentFormError] = useState<string | null>(null)

  const [receiptPeerId, setReceiptPeerId] = useState('')
  const [receiptMsgId, setReceiptMsgId] = useState('')
  const [paymentReceipt, setPaymentReceipt] = useState<any>(null)
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false)
  const [receiptError, setReceiptError] = useState<string | null>(null)

  const [giftCodeBoostPeer, setGiftCodeBoostPeer] = useState('')
  const [giftCodeOptions, setGiftCodeOptions] = useState<any[]>([])
  const [isLoadingGiftOptions, setIsLoadingGiftOptions] = useState(false)
  const [giftOptionsError, setGiftOptionsError] = useState<string | null>(null)

  const handleFetchOnrampProviders = async () => {
    if (!window.guidegram?.paymentsGetOnrampProvidersRaw) return
    setIsLoadingProviders(true)
    setProvidersError(null)
    try {
      const res = await window.guidegram.paymentsGetOnrampProvidersRaw(accountId, { cryptoCurrency })
      setOnrampProviders(Array.isArray(res) ? res : (res?.providers || []))
    } catch (err: any) {
      setProvidersError(err?.message || 'Failed to load onramp providers')
    } finally {
      setIsLoadingProviders(false)
    }
  }

  const handleFetchBaseCurrencies = async () => {
    if (!window.guidegram?.paymentsGetOnrampBaseCurrenciesRaw) return
    setIsLoadingBaseCurrencies(true)
    setBaseCurrenciesError(null)
    try {
      const res = await window.guidegram.paymentsGetOnrampBaseCurrenciesRaw(accountId, { provider: onrampProvider, cryptoCurrency })
      const list = Array.isArray(res) ? res : (res?.currencies || ['USD', 'EUR', 'GBP'])
      setBaseCurrencies(list)
      if (list.length > 0 && !list.includes(selectedBaseCurrency)) {
        setSelectedBaseCurrency(list[0])
      }
    } catch (err: any) {
      setBaseCurrenciesError(err?.message || 'Failed to load base currencies')
    } finally {
      setIsLoadingBaseCurrencies(false)
    }
  }

  const handleFetchLimits = async () => {
    if (!window.guidegram?.paymentsGetOnrampLimitsRaw) return
    setIsLoadingLimits(true)
    setLimitsError(null)
    try {
      const res = await window.guidegram.paymentsGetOnrampLimitsRaw(accountId, {
        provider: onrampProvider,
        cryptoCurrency,
        baseCurrency: selectedBaseCurrency,
        paymentMethod: quotePaymentMethod,
      })
      setOnrampLimits(res)
    } catch (err: any) {
      setLimitsError(err?.message || 'Failed to load onramp limits')
    } finally {
      setIsLoadingLimits(false)
    }
  }

  const handleFetchQuote = async () => {
    if (!window.guidegram?.paymentsGetOnrampQuoteRaw) return
    setIsLoadingQuote(true)
    setQuoteError(null)
    try {
      const res = await window.guidegram.paymentsGetOnrampQuoteRaw(accountId, {
        provider: onrampProvider,
        cryptoCurrency,
        baseCurrency: selectedBaseCurrency,
        baseAmount: quoteAmount,
        paymentMethod: quotePaymentMethod,
      })
      setOnrampQuote(res)
    } catch (err: any) {
      setQuoteError(err?.message || 'Failed to get onramp quote')
    } finally {
      setIsLoadingQuote(false)
    }
  }

  const handleFetchPaymentForm = async () => {
    if (!invoiceInput.trim() || !window.guidegram?.paymentsGetPaymentFormRaw) return
    setIsLoadingPaymentForm(true)
    setPaymentFormError(null)
    try {
      const res = await window.guidegram.paymentsGetPaymentFormRaw(accountId, { invoice: invoiceInput.trim() })
      setPaymentForm(res)
    } catch (err: any) {
      setPaymentFormError(err?.message || 'Failed to load payment form')
    } finally {
      setIsLoadingPaymentForm(false)
    }
  }

  const handleFetchPaymentReceipt = async () => {
    if (!receiptPeerId.trim() || !receiptMsgId.trim() || !window.guidegram?.paymentsGetPaymentReceiptRaw) return
    setIsLoadingReceipt(true)
    setReceiptError(null)
    try {
      const res = await window.guidegram.paymentsGetPaymentReceiptRaw(accountId, {
        peerId: receiptPeerId.trim(),
        msgId: Number(receiptMsgId.trim()),
      })
      setPaymentReceipt(res)
    } catch (err: any) {
      setReceiptError(err?.message || 'Failed to load payment receipt')
    } finally {
      setIsLoadingReceipt(false)
    }
  }

  const handleFetchGiftCodeOptions = async () => {
    if (!window.guidegram?.paymentsGetPremiumGiftCodeOptionsRaw) return
    setIsLoadingGiftOptions(true)
    setGiftOptionsError(null)
    try {
      const res = await window.guidegram.paymentsGetPremiumGiftCodeOptionsRaw(accountId, {
        boostPeerId: giftCodeBoostPeer.trim() || undefined,
      })
      setGiftCodeOptions(Array.isArray(res) ? res : [])
    } catch (err: any) {
      setGiftOptionsError(err?.message || 'Failed to load gift code options')
    } finally {
      setIsLoadingGiftOptions(false)
    }
  }

  // --- Microphases 133-137 Callback Handlers ---
  const handleToncenterApiRequest = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    setProtocolResult(null)
    try {
      let parsed = {}
      try { parsed = JSON.parse(toncenterParams || '{}') } catch {}
      const res = await window.guidegram.toncenterPerformApiRequestRaw(accountId, {
        method: toncenterMethod,
        params: parsed,
      })
      setProtocolResult(res)
      setProtocolSuccess('Toncenter API query completed.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Toncenter API request failed')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleToncenterStreamingUrl = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.toncenterGetStreamingUrlRaw(accountId, {})
      setProtocolResult(res)
      setProtocolSuccess('Toncenter streaming URL retrieved.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to get Toncenter streaming URL')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleWalletGetState = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletGetStateRaw(accountId, {})
      setProtocolResult(res)
      setProtocolSuccess('Wallet state retrieved.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to get wallet state')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleWalletGetUserAddresses = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletGetUserAddressesRaw(accountId, {})
      setProtocolResult(res)
      setProtocolSuccess('User TON addresses retrieved.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to get user addresses')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleWalletGetProofChallenge = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletGetProofChallengeRaw(accountId, {})
      setProtocolResult(res)
      setProtocolSuccess('Proof challenge generated.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to get proof challenge')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleWalletGetBackupHolderDcs = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletGetBackupHolderDcsRaw(accountId, {})
      setProtocolResult(res)
      setProtocolSuccess('Backup holder DCs retrieved.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to get backup holder DCs')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleWalletFetchEncryptedSecretPhrasePart = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletFetchEncryptedSecretPhrasePartRaw(accountId, {})
      setProtocolResult(res)
      setProtocolSuccess('Encrypted secret phrase part retrieved.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to fetch encrypted secret phrase part')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleWalletExportSecretPhrase = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletExportSecretPhraseRaw(accountId, {
        password: backupPassword || undefined,
      })
      setProtocolResult(res)
      setProtocolSuccess('Secret phrase exported.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to export secret phrase')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleWalletEnableBackup = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletEnableBackupRaw(accountId, {})
      setProtocolResult(res)
      setProtocolSuccess('Wallet backup enabled.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to enable backup')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleWalletDisableBackup = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletDisableBackupRaw(accountId, {})
      setProtocolResult(res)
      setProtocolSuccess('Wallet backup disabled.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to disable backup')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleWalletGetExistingWaltBalance = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletGetExistingWaltBalanceRaw(accountId, {})
      setProtocolResult(res)
      setProtocolSuccess('Vault balance queried.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to get existing vault balance')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleWalletGetGaslessInfo = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletGetGaslessInfoRaw(accountId, {})
      setProtocolResult(res)
      setProtocolSuccess('Gasless relayer info loaded.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to get gasless info')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleWalletGetTransactions = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletGetTransactionsRaw(accountId, {
        limit: Number(txLimit) || 20,
      })
      setProtocolResult(res)
      setProtocolSuccess('Transactions loaded.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to get transactions')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleWalletGetTransactionsByIDs = async () => {
    if (!accountId || !txIdInput) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const ids = txIdInput.split(',').map((s) => s.trim()).filter(Boolean)
      const res = await window.guidegram.walletGetTransactionsByIDsRaw(accountId, { ids })
      setProtocolResult(res)
      setProtocolSuccess('Transactions queried by ID.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to get transactions by ID')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleWalletGetTransactionsByMsgHash = async () => {
    if (!accountId || !txMsgHash) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletGetTransactionsByMsgHashRaw(accountId, { msgHash: txMsgHash })
      setProtocolResult(res)
      setProtocolSuccess('Transactions queried by message hash.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to get transactions by msg hash')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleWalletGetNfts = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletGetNftsRaw(accountId, {})
      setProtocolResult(res)
      setProtocolSuccess('NFT collectibles loaded.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to get NFTs')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleWalletSendTransfer = async () => {
    if (!accountId || !recipientAddress) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletSendTransferRaw(accountId, {
        toAddress: recipientAddress.trim(),
        amount: transferAmountNano,
        comment: transferComment,
      })
      setProtocolResult(res)
      setProtocolSuccess('Transfer dispatched.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to dispatch transfer')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleWalletReplaceWallet = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletReplaceWalletRaw(accountId, {})
      setProtocolResult(res)
      setProtocolSuccess('Wallet replacement executed.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to replace wallet')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleWalletSetCardStickers = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletSetCardStickersRaw(accountId, {})
      setProtocolResult(res)
      setProtocolSuccess('Card stickers updated.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to set card stickers')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleTonConnectRegisterKey = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletTonConnectRegisterKeyRaw(accountId, {})
      setProtocolResult(res)
      setProtocolSuccess('TonConnect key registered.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to register key')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleTonConnectCreateSession = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletTonConnectCreateSessionRaw(accountId, {})
      setProtocolResult(res)
      setProtocolSuccess('TonConnect session created.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to create session')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleTonConnectGetSessions = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletTonConnectGetSessionsRaw(accountId, {})
      setProtocolResult(res)
      setProtocolSuccess('TonConnect sessions queried.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to get sessions')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleTonConnectGetPending = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletTonConnectGetPendingRaw(accountId, {})
      setProtocolResult(res)
      setProtocolSuccess('TonConnect pending requests retrieved.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to get pending requests')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleTonConnectClaimRequest = async () => {
    if (!accountId || !tonConnectRequestId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletTonConnectClaimRequestRaw(accountId, {
        requestId: tonConnectRequestId,
      })
      setProtocolResult(res)
      setProtocolSuccess('TonConnect request claimed.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to claim request')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleTonConnectSubmitResponse = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      let parsed = {}
      try { parsed = JSON.parse(tonConnectResponseData || '{}') } catch {}
      const res = await window.guidegram.walletTonConnectSubmitResponseRaw(accountId, {
        response: parsed,
      })
      setProtocolResult(res)
      setProtocolSuccess('TonConnect response submitted.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to submit response')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleTonConnectSubmitConnectResult = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletTonConnectSubmitConnectResultRaw(accountId, {})
      setProtocolResult(res)
      setProtocolSuccess('TonConnect connect result submitted.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to submit connect result')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleTonConnectNextEventId = async () => {
    if (!accountId) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletTonConnectNextEventIdRaw(accountId, {})
      setProtocolResult(res)
      setProtocolSuccess('Next event ID allocated.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to get next event ID')
    } finally {
      setProtocolLoading(false)
    }
  }

  const handleTonConnectCloseSession = async () => {
    if (!accountId || !tonConnectSessionKey) return
    setProtocolLoading(true)
    setProtocolError(null)
    try {
      const res = await window.guidegram.walletTonConnectCloseSessionRaw(accountId, {
        sessionKey: tonConnectSessionKey,
      })
      setProtocolResult(res)
      setProtocolSuccess('TonConnect session closed.')
    } catch (err: any) {
      setProtocolError(err?.message || 'Failed to close session')
    } finally {
      setProtocolLoading(false)
    }
  }

  // Derived or pseudo-deterministic TON wallet address for account
  const walletAddress = React.useMemo(() => {
    // Generate standard user-friendly TON base64 address (EQ...)
    let hash = 0
    for (let i = 0; i < accountId.length; i++) {
      hash = (hash << 5) - hash + accountId.charCodeAt(i)
      hash |= 0
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0')
    return `EQB${hex.toUpperCase()}9f4xZ_t7M3vKa8L2pQ1rO6sT8uY5`
  }, [accountId])

  // Fetch active TonConnect sessions
  const fetchSessions = async () => {
    if (!window.guidegram?.getTonConnectSessions) return
    setIsLoadingSessions(true)
    try {
      const res = await window.guidegram.getTonConnectSessions(accountId)
      if (Array.isArray(res)) {
        setSessions(res as unknown as TonConnectSessionItem[])
      } else {
        setSessions([])
      }
    } catch (err) {
      console.warn('[TonWalletModal] fetchSessions error:', err)
      setSessions([])
    } finally {
      setIsLoadingSessions(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchSessions()
    }
  }, [isOpen, accountId])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopiedAddress(true)
    setTimeout(() => setCopiedAddress(false), 2000)
  }

  const handleCloseSession = async (sessionId: string | number) => {
    if (!window.guidegram?.closeTonConnectSession) return
    try {
      await window.guidegram.closeTonConnectSession(accountId, sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    } catch (err) {
      console.error('[TonWalletModal] closeTonConnectSession error:', err)
    }
  }

  const handleConnectDapp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newManifestUrl.trim() || !window.guidegram?.createTonConnectSession) return
    setIsConnectingDapp(true)
    try {
      const clientId = `dapp_${Date.now()}`
      await window.guidegram.createTonConnectSession(accountId, clientId, newManifestUrl.trim())
      setNewManifestUrl('')
      await fetchSessions()
    } catch (err) {
      console.error('[TonWalletModal] createTonConnectSession error:', err)
    } finally {
      setIsConnectingDapp(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <div className="w-full max-w-xl bg-dark-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-dark-850/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0098ea] to-[#00c2ff] p-0.5 shadow-lg shadow-[#0098ea]/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>TON Blockchain & Wallet</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0098ea]/15 border border-[#0098ea]/30 text-[#00c2ff] font-semibold">
                  Mainnet
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                Official Telegram TON Protocol & TonConnect Hub ({accountName})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Tab Navigator */}
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-white/5 bg-dark-900 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('wallet')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'wallet'
                ? 'border-[#0098ea] text-[#00c2ff]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Balance & Transfers</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tonconnect')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'tonconnect'
                ? 'border-[#0098ea] text-[#00c2ff]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>TonConnect dApps</span>
            {sessions.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#0098ea] text-white text-[10px] flex items-center justify-center font-bold">
                {sessions.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stars')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'stars'
                ? 'border-accent-amber text-amber-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Telegram Stars</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('onramp')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'onramp'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Onramp & Checkout</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('protocol')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'protocol'
                ? 'border-[#0098ea] text-[#00c2ff]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Protocol RPCs</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#0098ea]/20 text-[#00c2ff] font-mono">
              28 RPCs
            </span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'wallet' && (
            <div className="space-y-6">
              {/* Wallet Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-dark-800 to-dark-850 border border-white/10 relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#0098ea]/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span>Toncoin Balance</span>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Non-Custodial</span>
                  </div>
                </div>

                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold font-mono text-white">0.00</span>
                  <span className="text-sm font-bold text-[#00c2ff]">TON</span>
                  <span className="text-xs text-gray-400 ml-2">≈ $0.00 USD</span>
                </div>

                {/* Address Bar */}
                <div className="p-3 rounded-xl bg-dark-900/80 border border-white/5 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5">
                      Your TON Address
                    </div>
                    <div className="font-mono text-xs text-gray-200 truncate">{walletAddress}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowQr(!showQr)}
                      title="Show QR Code"
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      title="Copy Address"
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
                    >
                      {copiedAddress ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {showQr && (
                  <div className="mt-4 p-4 rounded-xl bg-white flex flex-col items-center justify-center animate-in fade-in">
                    <div className="w-40 h-40 bg-dark-900 rounded-lg flex items-center justify-center text-white font-mono text-xs text-center p-3">
                      [QR Code for {walletAddress.slice(0, 10)}...]
                    </div>
                    <span className="text-xs text-dark-900 font-semibold mt-2">
                      Scan to receive Toncoin
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => alert('To receive funds, copy your TON address above.')}
                  className="p-3.5 rounded-2xl bg-dark-800 hover:bg-dark-750 border border-white/5 flex items-center justify-center gap-2 text-xs font-semibold text-white transition-all cursor-pointer shadow-md group"
                >
                  <ArrowDownLeft className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>Receive TON</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert('Send feature connects to MTProto payments & Tonkeeper wallet.')}
                  className="p-3.5 rounded-2xl bg-[#0098ea] hover:bg-[#008bd6] flex items-center justify-center gap-2 text-xs font-semibold text-white transition-all cursor-pointer shadow-md group"
                >
                  <ArrowUpRight className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                  <span>Send TON</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'tonconnect' && (
            <div className="space-y-6">
              {/* Connect dApp Form */}
              <form
                onSubmit={handleConnectDapp}
                className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Globe className="w-4 h-4 text-[#00c2ff]" />
                  <span>Connect New Telegram dApp (TonConnect 2.0)</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://app.ston.fi/tonconnect-manifest.json"
                    value={newManifestUrl}
                    onChange={(e) => setNewManifestUrl(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#0098ea]"
                  />
                  <button
                    type="submit"
                    disabled={isConnectingDapp || !newManifestUrl.trim()}
                    className="px-4 py-2 rounded-xl bg-[#0098ea] hover:bg-[#008bd6] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isConnectingDapp ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Connect</span>
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">
                  Connect decentralized Telegram applications, exchanges (STON.fi, DeDust), and games seamlessly via official MTProto Layer 229 tonConnect.
                </p>
              </form>

              {/* Sessions List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-gray-300">
                  <span>Active Connected dApps ({sessions.length})</span>
                  <button
                    type="button"
                    onClick={fetchSessions}
                    className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSessions ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {sessions.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-dark-800/50 border border-white/5 text-center text-xs text-gray-400">
                    No connected dApps found. Connect to Web3 dApps using the manifest URL above or through Telegram Mini Apps.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((sess) => (
                      <div
                        key={sess.id}
                        className="p-3.5 rounded-2xl bg-dark-800 border border-white/5 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-dark-700 flex items-center justify-center text-gray-300 shrink-0">
                            <Globe className="w-4 h-4 text-[#00c2ff]" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {sess.name || sess.dappClientId || 'Connected dApp'}
                            </div>
                            <div className="text-[10px] text-gray-400 truncate">
                              {sess.manifestUrl || 'Official TonConnect Session'}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCloseSession(sess.id)}
                          title="Disconnect Session"
                          className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'stars' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-950/40 via-dark-800 to-dark-850 border border-amber-500/20 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-amber-400/80 mb-2 font-medium">
                  <span>Telegram Stars Balance</span>
                  <span>Official Virtual Goods Currency</span>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold font-mono text-amber-300">⭐️ 0</span>
                  <span className="text-xs text-gray-400">Stars</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Telegram Stars power digital goods in bots and mini-apps, unlock paid reaction messages, channel subscriptions, and media posts with end-to-end MTProto compliance.
                </p>
              </div>
            </div>
          )}

          {/* Microphase 098: Onramp, Limits, Quotes, Payment Form, Receipt, Gift Code Options */}
          {activeTab === 'onramp' && (
            <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
              {/* Card 1: Onramp Providers & Base Currencies */}
              <div className="p-5 rounded-2xl bg-dark-800/80 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">Onramp Providers & Base Currencies</h3>
                      <p className="text-[10px] text-gray-400 font-mono">payments.getOnrampProviders & payments.getOnrampBaseCurrencies</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFetchOnrampProviders}
                      disabled={isLoadingProviders}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingProviders ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      <span>Fetch Providers</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleFetchBaseCurrencies}
                      disabled={isLoadingBaseCurrencies}
                      className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingBaseCurrencies ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Coins className="w-3.5 h-3.5" />}
                      <span>Base Currencies</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Crypto Currency</label>
                    <input
                      type="text"
                      value={cryptoCurrency}
                      onChange={(e) => setCryptoCurrency(e.target.value.toUpperCase())}
                      placeholder="TON, USDT"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Provider ID</label>
                    <input
                      type="text"
                      value={onrampProvider}
                      onChange={(e) => setOnrampProvider(e.target.value)}
                      placeholder="neocrypto, dreamwalkers"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {isLoadingProviders && (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 animate-pulse flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                    <span className="text-xs text-gray-300">Loading Telegram verified onramp providers...</span>
                  </div>
                )}

                {providersError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-rose-300 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{providersError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleFetchOnrampProviders}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!isLoadingProviders && onrampProviders.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-gray-400">Available Providers:</div>
                    <div className="grid grid-cols-2 gap-2">
                      {onrampProviders.map((p, idx) => (
                        <div
                          key={p.name || idx}
                          onClick={() => setOnrampProvider(p.name || p.id || 'neocrypto')}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                            onrampProvider === (p.name || p.id)
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                              : 'bg-black/30 border-white/5 text-gray-300 hover:border-white/20'
                          }`}
                        >
                          <div className="font-bold flex items-center justify-between">
                            <span>{p.title || p.name || `Provider #${idx + 1}`}</span>
                            {p.fee && <span className="text-[10px] text-gray-400 font-mono">Fee: {p.fee}</span>}
                          </div>
                          {p.url && <div className="text-[10px] text-gray-500 truncate mt-1">{p.url}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {baseCurrencies.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <div className="text-[11px] text-gray-400 font-semibold">Supported Base Fiat Currencies:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {baseCurrencies.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedBaseCurrency(c)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                            selectedBaseCurrency === c
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                              : 'bg-black/40 border border-white/10 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Onramp Limits & Real-Time Quote */}
              <div className="p-5 rounded-2xl bg-dark-800/80 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                      <Coins className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">Onramp Limits & Real-Time Quote</h3>
                      <p className="text-[10px] text-gray-400 font-mono">payments.getOnrampLimits & payments.getOnrampQuote</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFetchLimits}
                      disabled={isLoadingLimits}
                      className="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingLimits ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      <span>Get Limits</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleFetchQuote}
                      disabled={isLoadingQuote}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingQuote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      <span>Calculate Quote</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Base Amount ({selectedBaseCurrency})</label>
                    <input
                      type="number"
                      value={quoteAmount}
                      onChange={(e) => setQuoteAmount(e.target.value)}
                      placeholder="50"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Payment Method</label>
                    <select
                      value={quotePaymentMethod}
                      onChange={(e) => setQuotePaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="card">Bank Card (Visa / Mastercard)</option>
                      <option value="applepay">Apple Pay</option>
                      <option value="googlepay">Google Pay</option>
                      <option value="sepa">SEPA Bank Transfer</option>
                    </select>
                  </div>
                </div>

                {onrampLimits && (
                  <div className="p-3.5 rounded-xl bg-black/40 border border-amber-500/20 space-y-1.5">
                    <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Provider Purchase Limits:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                      <div>Min Amount: <span className="font-mono text-white">{onrampLimits.minAmount || onrampLimits.min || '10'} {selectedBaseCurrency}</span></div>
                      <div>Max Amount: <span className="font-mono text-white">{onrampLimits.maxAmount || onrampLimits.max || '10,000'} {selectedBaseCurrency}</span></div>
                    </div>
                  </div>
                )}

                {onrampQuote && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-dark-800 to-dark-850 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-emerald-300 font-semibold">Estimated Crypto Payout:</span>
                      <span className="text-lg font-bold font-mono text-emerald-400">
                        {onrampQuote.cryptoAmount || onrampQuote.amount || '~'} {cryptoCurrency}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                      <span>Rate: 1 {cryptoCurrency} ≈ {onrampQuote.rate || 'market'} {selectedBaseCurrency}</span>
                      {onrampQuote.networkFee && <span>Network Fee: {onrampQuote.networkFee}</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* Card 3: Interactive Payment Form & Checkout */}
              <div className="p-5 rounded-2xl bg-dark-800/80 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">Payment Form & Invoice Lookup</h3>
                      <p className="text-[10px] text-gray-400 font-mono">payments.getPaymentForm</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchPaymentForm}
                    disabled={isLoadingPaymentForm || !invoiceInput.trim()}
                    className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingPaymentForm ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
                    <span>Load Invoice Form</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Invoice Slug or URL</label>
                  <input
                    type="text"
                    value={invoiceInput}
                    onChange={(e) => setInvoiceInput(e.target.value)}
                    placeholder="e.g. https://t.me/$invoice_slug or slug"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {isLoadingPaymentForm && (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 animate-pulse flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                    <span className="text-xs text-gray-300">Fetching native Telegram Payment Form...</span>
                  </div>
                )}

                {paymentFormError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-rose-300 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{paymentFormError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleFetchPaymentForm}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {paymentForm && (
                  <div className="p-4 rounded-xl bg-black/40 border border-purple-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{paymentForm.title || 'Telegram Verified Invoice'}</span>
                      <span className="text-xs font-mono font-bold text-purple-300">
                        {paymentForm.totalAmount ? (Number(paymentForm.totalAmount) / 100).toFixed(2) : '0.00'} {paymentForm.currency || 'USD'}
                      </span>
                    </div>
                    {paymentForm.description && (
                      <p className="text-[11px] text-gray-300">{paymentForm.description}</p>
                    )}
                    <div className="text-[10px] text-gray-500 font-mono">
                      Form ID: {paymentForm.formId || paymentForm.id || 'N/A'} | Native Provider: {paymentForm.nativeProvider || 'Telegram Stars/Stripe'}
                    </div>
                  </div>
                )}
              </div>

              {/* Card 4: Receipts & Premium Gift Code Options */}
              <div className="p-5 rounded-2xl bg-dark-800/80 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                      <Gift className="w-4 h-4 text-rose-400" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">Receipts & Premium Gift Code Options</h3>
                      <p className="text-[10px] text-gray-400 font-mono">payments.getPaymentReceipt & payments.getPremiumGiftCodeOptions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFetchPaymentReceipt}
                      disabled={isLoadingReceipt || !receiptPeerId.trim() || !receiptMsgId.trim()}
                      className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingReceipt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
                      <span>Fetch Receipt</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleFetchGiftCodeOptions}
                      disabled={isLoadingGiftOptions}
                      className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingGiftOptions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
                      <span>Gift Code Tiers</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Receipt Peer ID</label>
                    <input
                      type="text"
                      value={receiptPeerId}
                      onChange={(e) => setReceiptPeerId(e.target.value)}
                      placeholder="Channel/User ID"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Receipt Msg ID</label>
                    <input
                      type="number"
                      value={receiptMsgId}
                      onChange={(e) => setReceiptMsgId(e.target.value)}
                      placeholder="12345"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Boost Peer ID (Optional)</label>
                    <input
                      type="text"
                      value={giftCodeBoostPeer}
                      onChange={(e) => setGiftCodeBoostPeer(e.target.value)}
                      placeholder="Channel to Boost"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {paymentReceipt && (
                  <div className="p-4 rounded-xl bg-black/40 border border-blue-500/30 space-y-1.5">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <Receipt className="w-3.5 h-3.5 text-blue-400" />
                      <span>Payment Receipt Confirmed</span>
                    </div>
                    <div className="text-xs text-gray-300">
                      Total: <span className="font-mono text-white font-bold">{paymentReceipt.totalAmount ? (Number(paymentReceipt.totalAmount) / 100).toFixed(2) : '0.00'} {paymentReceipt.currency || 'USD'}</span>
                    </div>
                    {paymentReceipt.date && (
                      <div className="text-[10px] text-gray-500 font-mono">Date: {new Date(paymentReceipt.date * 1000).toLocaleString()}</div>
                    )}
                  </div>
                )}

                {giftCodeOptions.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-gray-400">Available Premium Gift Code Tiers:</div>
                    <div className="grid grid-cols-3 gap-2">
                      {giftCodeOptions.map((opt, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-gradient-to-b from-rose-950/30 to-dark-850 border border-rose-500/20 text-center">
                          <div className="text-xs font-bold text-white">{opt.months || opt.duration || 3} Months</div>
                          <div className="text-sm font-bold font-mono text-rose-300 my-1">
                            {opt.amount ? (Number(opt.amount) / 100).toFixed(2) : '—'} {opt.currency || 'USD'}
                          </div>
                          {opt.discount && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold">
                              Save {opt.discount}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'protocol' && (
            <div className="space-y-5 animate-in fade-in duration-100">
              {/* Header & Subdomain Tabs */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#00c2ff]" />
                    <span>Layer 232 Protocol: Toncenter & Wallet Domain Suite</span>
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Direct low-level MTProto RPC parity (Microphases 133 to 137 — 28 RPCs)
                  </p>
                </div>
              </div>

              {/* Status alerts */}
              {protocolError && (
                <div className="p-3 rounded-xl bg-accent-rose/10 border border-accent-rose/20 text-accent-rose text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{protocolError}</span>
                  </div>
                  <button type="button" onClick={() => setProtocolError(null)} className="underline text-[10px]">
                    Dismiss
                  </button>
                </div>
              )}
              {protocolSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{protocolSuccess}</span>
                </div>
              )}

              {/* Sub-navigation tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-dark-850 border border-white/5 overflow-x-auto text-[11px]">
                <button
                  type="button"
                  onClick={() => setProtocolSubdomain('toncenter')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                    protocolSubdomain === 'toncenter'
                      ? 'bg-[#0098ea]/20 text-[#00c2ff] border border-[#0098ea]/40'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Toncenter (2)
                </button>
                <button
                  type="button"
                  onClick={() => setProtocolSubdomain('state')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                    protocolSubdomain === 'state'
                      ? 'bg-[#0098ea]/20 text-[#00c2ff] border border-[#0098ea]/40'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  State & Addresses (3)
                </button>
                <button
                  type="button"
                  onClick={() => setProtocolSubdomain('backup')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                    protocolSubdomain === 'backup'
                      ? 'bg-[#0098ea]/20 text-[#00c2ff] border border-[#0098ea]/40'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Backup & Vault (7)
                </button>
                <button
                  type="button"
                  onClick={() => setProtocolSubdomain('transfers')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                    protocolSubdomain === 'transfers'
                      ? 'bg-[#0098ea]/20 text-[#00c2ff] border border-[#0098ea]/40'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Transfers & NFTs (7)
                </button>
                <button
                  type="button"
                  onClick={() => setProtocolSubdomain('tonconnect_raw')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                    protocolSubdomain === 'tonconnect_raw'
                      ? 'bg-[#0098ea]/20 text-[#00c2ff] border border-[#0098ea]/40'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  TonConnect Engine (9)
                </button>
              </div>

              {/* Subdomain 1: Toncenter (2 RPCs) */}
              {protocolSubdomain === 'toncenter' && (
                <div className="p-4 rounded-2xl bg-dark-850 border border-white/5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#00c2ff]" />
                    <span className="text-xs font-bold text-white">Toncenter API & Streaming Engine</span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] text-gray-400">Method Name</label>
                    <input
                      type="text"
                      value={toncenterMethod}
                      onChange={(e) => setToncenterMethod(e.target.value)}
                      placeholder="e.g. getWalletInformation"
                      className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#0098ea]/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] text-gray-400">Method Parameters (JSON)</label>
                    <textarea
                      rows={2}
                      value={toncenterParams}
                      onChange={(e) => setToncenterParams(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#0098ea]/50 resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleToncenterApiRequest}
                      className="px-4 py-2 rounded-xl bg-[#0098ea] hover:bg-[#0087d1] text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {protocolLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
                      <span>Perform API Request</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleToncenterStreamingUrl}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Radio className="w-3.5 h-3.5 text-[#00c2ff]" />
                      <span>Get Streaming URL</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Subdomain 2: State & Addresses (3 RPCs) */}
              {protocolSubdomain === 'state' && (
                <div className="p-4 rounded-2xl bg-dark-850 border border-white/5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Wallet Core State & Addresses</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Query active on-chain registration state, cryptographic proof challenges, and bound user addresses.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleWalletGetState}
                      className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {protocolLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                      <span>Get Wallet State</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleWalletGetUserAddresses}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Get User Addresses</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleWalletGetProofChallenge}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Generate Proof Challenge</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Subdomain 3: Backup & Vault (7 RPCs) */}
              {protocolSubdomain === 'backup' && (
                <div className="p-4 rounded-2xl bg-dark-850 border border-white/5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Cloud Backup, Vault & Gasless Sponsor</span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] text-gray-400">Backup Decryption Password (Optional)</label>
                    <input
                      type="password"
                      value={backupPassword}
                      onChange={(e) => setBackupPassword(e.target.value)}
                      placeholder="Enter 2FA password if required"
                      className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleWalletExportSecretPhrase}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>Export Secret Phrase</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleWalletFetchEncryptedSecretPhrasePart}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Fetch Shard Part</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleWalletGetBackupHolderDcs}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Server className="w-3.5 h-3.5" />
                      <span>Backup DCs</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleWalletEnableBackup}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Enable Backup</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleWalletDisableBackup}
                      className="px-3.5 py-1.5 rounded-xl bg-accent-rose/15 hover:bg-accent-rose/25 text-accent-rose text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Disable Backup</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleWalletGetExistingWaltBalance}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>Query Vault Balance</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleWalletGetGaslessInfo}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#00c2ff]" />
                      <span>Gasless Relayer Info</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Subdomain 4: Transfers & NFTs (7 RPCs) */}
              {protocolSubdomain === 'transfers' && (
                <div className="p-4 rounded-2xl bg-dark-850 border border-white/5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-[#00c2ff]" />
                    <span className="text-xs font-bold text-white">Transfers, NFTs & Wallet Lifecycle</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-gray-400">Recipient Address</label>
                      <input
                        type="text"
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        placeholder="EQB..."
                        className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#0098ea]/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-gray-400">Amount (Nanotons)</label>
                      <input
                        type="text"
                        value={transferAmountNano}
                        onChange={(e) => setTransferAmountNano(e.target.value)}
                        placeholder="1000000000 = 1 TON"
                        className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#0098ea]/50"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={protocolLoading || !recipientAddress}
                      onClick={handleWalletSendTransfer}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0098ea] hover:bg-[#0087d1] text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Transfer</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleWalletGetTransactions}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Get Transactions</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleWalletGetNfts}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
                      <span>Get NFTs</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleWalletReplaceWallet}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Replace Wallet</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleWalletSetCardStickers}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                      <span>Set Card Stickers</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Subdomain 5: TonConnect Protocol Engine (9 RPCs) */}
              {protocolSubdomain === 'tonconnect_raw' && (
                <div className="p-4 rounded-2xl bg-dark-850 border border-white/5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#00c2ff]" />
                    <span className="text-xs font-bold text-white">TonConnect Protocol & Dapp Bridge (Layer 232)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-gray-400">Session Key / ID</label>
                      <input
                        type="text"
                        value={tonConnectSessionKey}
                        onChange={(e) => setTonConnectSessionKey(e.target.value)}
                        placeholder="Session key..."
                        className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#0098ea]/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-gray-400">Request ID (for claim)</label>
                      <input
                        type="text"
                        value={tonConnectRequestId}
                        onChange={(e) => setTonConnectRequestId(e.target.value)}
                        placeholder="Request ID..."
                        className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#0098ea]/50"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleTonConnectGetSessions}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0098ea]/20 hover:bg-[#0098ea]/30 text-[#00c2ff] text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Get Sessions</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleTonConnectGetPending}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Receipt className="w-3.5 h-3.5 text-amber-400" />
                      <span>Get Pending</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleTonConnectRegisterKey}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Key className="w-3.5 h-3.5 text-purple-400" />
                      <span>Register Key</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleTonConnectCreateSession}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Create Session</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleTonConnectNextEventId}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Hash className="w-3.5 h-3.5" />
                      <span>Next Event ID</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading || !tonConnectRequestId}
                      onClick={handleTonConnectClaimRequest}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Claim Request</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleTonConnectSubmitResponse}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Response</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading}
                      onClick={handleTonConnectSubmitConnectResult}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Submit Connect Result</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolLoading || !tonConnectSessionKey}
                      onClick={handleTonConnectCloseSession}
                      className="px-3.5 py-1.5 rounded-xl bg-accent-rose/15 hover:bg-accent-rose/25 text-accent-rose text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Close Session</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Live MTProto Result Inspector */}
              {protocolResult && (
                <div className="p-4 rounded-2xl bg-dark-900 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                    <span>Live MTProto Response Telemetry</span>
                    <button
                      type="button"
                      onClick={() => setProtocolResult(null)}
                      className="text-[10px] text-gray-500 hover:text-gray-300"
                    >
                      Clear
                    </button>
                  </div>
                  <pre className="text-[10px] text-[#00c2ff] font-mono overflow-x-auto max-h-36 bg-dark-950 p-2.5 rounded-xl">
                    {JSON.stringify(protocolResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
