import React, { useState, useEffect, useMemo } from 'react'
import {
  Gift,
  Sparkles,
  X,
  Star,
  Calendar,
  User,
  EyeOff,
  ShoppingBag,
  ArrowUpDown,
  Check,
  ChevronRight,
  SlidersHorizontal,
  ExternalLink,
  Coins,
  Percent,
  Layers,
  Gavel,
  RefreshCw,
  AlertCircle,
  Search,
  ShieldCheck,
  ArrowUpRight,
  Trophy,
  Zap,
  Wallet,
  TrendingUp,
  Receipt,
  CreditCard,
  BarChart3,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { StarGiftItem } from '../types/telegram'
import { StarGiftVisual } from './StarGiftVisual'
import { useI18n } from '../i18n'
import { isRTL, formatNumber } from '../utils/textUtils'
import { copyTextToClipboard } from '../utils/clipboard'

interface StarGiftsModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  userName?: string
  peerId?: string
  initialSelectedGift?: StarGiftItem | null
}

type SortCriteria = 'date' | 'rarity_total' | 'model_rarity' | 'backdrop_rarity' | 'price'
type ActiveTraitTab = 'model' | 'backdrop' | 'symbol'

export const StarGiftsModal: React.FC<StarGiftsModalProps> = ({
  isOpen,
  onClose,
  accountId,
  userName,
  peerId,
  initialSelectedGift,
}) => {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<'saved' | 'catalog' | 'auctions' | 'upgrades' | 'revenue' | 'unique_giveaways'>('saved')
  const [savedGifts, setSavedGifts] = useState<StarGiftItem[]>([])
  const [catalogGifts, setCatalogGifts] = useState<StarGiftItem[]>([])
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [loadingCatalog, setLoadingCatalog] = useState(false)

  // Microphase 099: Auctions & Resale States (payments.getStarGiftActiveAuctions & payments.getResaleStarGifts)
  const [activeAuctions, setActiveAuctions] = useState<any[] | null>(null)
  const [loadingAuctions, setLoadingAuctions] = useState<boolean>(false)
  const [auctionsError, setAuctionsError] = useState<string | null>(null)

  const [resaleGiftId, setResaleGiftId] = useState<string>('')
  const [resaleGifts, setResaleGifts] = useState<any | null>(null)
  const [loadingResale, setLoadingResale] = useState<boolean>(false)
  const [resaleError, setResaleError] = useState<string | null>(null)

  const [savedInfoData, setSavedInfoData] = useState<any | null>(null)
  const [loadingSavedInfo, setLoadingSavedInfo] = useState<boolean>(false)

  // Microphase 100: Collections, Upgrades, Withdrawal & Stars Options
  const [collectionsData, setCollectionsData] = useState<any[] | null>(null)
  const [loadingCollections, setLoadingCollections] = useState<boolean>(false)
  const [collectionsError, setCollectionsError] = useState<string | null>(null)

  const [upgradeGiftId, setUpgradeGiftId] = useState<string>('')
  const [upgradePreviewData, setUpgradePreviewData] = useState<any | null>(null)
  const [upgradeAttributesData, setUpgradeAttributesData] = useState<any | null>(null)
  const [loadingUpgrade, setLoadingUpgrade] = useState<boolean>(false)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)

  const [withdrawalGiftId, setWithdrawalGiftId] = useState<string>('')
  const [withdrawalUrl, setWithdrawalUrl] = useState<string | null>(null)
  const [loadingWithdrawal, setLoadingWithdrawal] = useState<boolean>(false)
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null)

  const [giftOptionsData, setGiftOptionsData] = useState<any[] | null>(null)
  const [giveawayOptionsData, setGiveawayOptionsData] = useState<any | null>(null)
  const [loadingOptions, setLoadingOptions] = useState<boolean>(false)
  const [optionsError, setOptionsError] = useState<string | null>(null)

  // Microphase 101: Revenue, Status, Subscriptions, Topup Options & Transactions
  const [m101PeerId, setM101PeerId] = useState<string>(peerId || '')
  const [m101Dark, setM101Dark] = useState<boolean>(true)
  const [m101WithdrawalStars, setM101WithdrawalStars] = useState<string>('')
  const [m101Offset, setM101Offset] = useState<string>('')
  const [m101Limit, setM101Limit] = useState<number>(20)
  const [m101StatusData, setM101StatusData] = useState<any | null>(null)
  const [m101RevenueStats, setM101RevenueStats] = useState<any | null>(null)
  const [m101TopupOptions, setM101TopupOptions] = useState<any[] | null>(null)
  const [m101Transactions, setM101Transactions] = useState<any | null>(null)
  const [m101Subscriptions, setM101Subscriptions] = useState<any | null>(null)
  const [m101AdsAccountUrl, setM101AdsAccountUrl] = useState<string | null>(null)
  const [m101RevenueWithdrawalUrl, setM101RevenueWithdrawalUrl] = useState<string | null>(null)
  const [m101LoadingOp, setM101LoadingOp] = useState<string | null>(null)
  const [m101Error, setM101Error] = useState<string | null>(null)
  const [m101SuccessMessage, setM101SuccessMessage] = useState<string | null>(null)

  // Microphase 102: Payments Domain Suite Part 9 (Unique Star Gifts, Valuation, Tx by ID, Ref Bots, Giveaways, Refund, Reorder)
  const [m102Slug, setM102Slug] = useState<string>('')
  const [m102UniqueGift, setM102UniqueGift] = useState<any | null>(null)
  const [m102UniqueValueInfo, setM102UniqueValueInfo] = useState<any | null>(null)
  const [m102TxIds, setM102TxIds] = useState<string>('')
  const [m102TxData, setM102TxData] = useState<any | null>(null)
  const [m102RefBots, setM102RefBots] = useState<any | null>(null)
  const [m102GiveawayId, setM102GiveawayId] = useState<string>('')
  const [m102PrepaidResult, setM102PrepaidResult] = useState<any | null>(null)
  const [m102RefundUserId, setM102RefundUserId] = useState<string>('')
  const [m102RefundChargeId, setM102RefundChargeId] = useState<string>('')
  const [m102RefundResult, setM102RefundResult] = useState<any | null>(null)
  const [m102ReorderList, setM102ReorderList] = useState<string>('')
  const [m102ReorderResult, setM102ReorderResult] = useState<any | null>(null)
  const [m102LoadingOp, setM102LoadingOp] = useState<string | null>(null)
  const [m102Error, setM102Error] = useState<string | null>(null)
  const [m102SuccessMessage, setM102SuccessMessage] = useState<string | null>(null)

  const loadM101StarsStatus = async () => {
    if (!accountId) return
    setM101LoadingOp('status')
    setM101Error(null)
    setM101SuccessMessage(null)
    try {
      const res = await (window as any).guidegramAPI?.paymentsGetStarsStatusRaw?.(accountId, {
        peerId: m101PeerId.trim() || undefined,
      })
      setM101StatusData(res)
      setM101SuccessMessage('موجودی و وضعیت ستاره با موفقیت دریافت شد.')
    } catch (err: any) {
      console.warn('[StarGiftsModal] loadM101StarsStatus error:', err)
      setM101Error(err?.message || 'خطا در دریافت وضعیت ستاره‌ها (payments.getStarsStatus)')
    } finally {
      setM101LoadingOp(null)
    }
  }

  const loadM101RevenueStats = async () => {
    if (!accountId) return
    setM101LoadingOp('revenueStats')
    setM101Error(null)
    setM101SuccessMessage(null)
    try {
      const res = await (window as any).guidegramAPI?.paymentsGetStarsRevenueStatsRaw?.(accountId, {
        peerId: m101PeerId.trim() || undefined,
        dark: m101Dark,
      })
      setM101RevenueStats(res)
      setM101SuccessMessage('آمار درآمد ستاره با موفقیت دریافت شد.')
    } catch (err: any) {
      console.warn('[StarGiftsModal] loadM101RevenueStats error:', err)
      setM101Error(err?.message || 'خطا در دریافت آمار درآمد ستاره (payments.getStarsRevenueStats)')
    } finally {
      setM101LoadingOp(null)
    }
  }

  const loadM101TopupOptions = async () => {
    if (!accountId) return
    setM101LoadingOp('topup')
    setM101Error(null)
    setM101SuccessMessage(null)
    try {
      const res = await (window as any).guidegramAPI?.paymentsGetStarsTopupOptionsRaw?.(accountId)
      const list = Array.isArray(res) ? res : res?.options || []
      setM101TopupOptions(list)
      setM101SuccessMessage('بسته‌های خرید ستاره دریافت شد.')
    } catch (err: any) {
      console.warn('[StarGiftsModal] loadM101TopupOptions error:', err)
      setM101Error(err?.message || 'خطا در دریافت بسته‌های خرید ستاره (payments.getStarsTopupOptions)')
    } finally {
      setM101LoadingOp(null)
    }
  }

  const loadM101Transactions = async () => {
    if (!accountId) return
    setM101LoadingOp('transactions')
    setM101Error(null)
    setM101SuccessMessage(null)
    try {
      const res = await (window as any).guidegramAPI?.paymentsGetStarsTransactionsRaw?.(accountId, {
        peerId: m101PeerId.trim() || undefined,
        offset: m101Offset.trim() || undefined,
        limit: m101Limit,
      })
      setM101Transactions(res)
      setM101SuccessMessage('تاریخچه تراکنش‌های ستاره دریافت شد.')
    } catch (err: any) {
      console.warn('[StarGiftsModal] loadM101Transactions error:', err)
      setM101Error(err?.message || 'خطا در دریافت تراکنش‌های ستاره (payments.getStarsTransactions)')
    } finally {
      setM101LoadingOp(null)
    }
  }

  const loadM101Subscriptions = async () => {
    if (!accountId) return
    setM101LoadingOp('subscriptions')
    setM101Error(null)
    setM101SuccessMessage(null)
    try {
      const res = await (window as any).guidegramAPI?.paymentsGetStarsSubscriptionsRaw?.(accountId, {
        peerId: m101PeerId.trim() || undefined,
        offset: m101Offset.trim() || undefined,
      })
      setM101Subscriptions(res)
      setM101SuccessMessage('اشتراک‌های ستاره دریافت شد.')
    } catch (err: any) {
      console.warn('[StarGiftsModal] loadM101Subscriptions error:', err)
      setM101Error(err?.message || 'خطا در دریافت اشتراک‌های ستاره (payments.getStarsSubscriptions)')
    } finally {
      setM101LoadingOp(null)
    }
  }

  const loadM101AdsAccountUrl = async () => {
    if (!accountId || !m101PeerId.trim()) {
      setM101Error('لطفاً شناسه کانال یا پیر را وارد کنید.')
      return
    }
    setM101LoadingOp('adsUrl')
    setM101Error(null)
    setM101SuccessMessage(null)
    try {
      const res = await (window as any).guidegramAPI?.paymentsGetStarsRevenueAdsAccountUrlRaw?.(accountId, {
        peerId: m101PeerId.trim(),
      })
      setM101AdsAccountUrl(res?.url || (typeof res === 'string' ? res : JSON.stringify(res)))
      setM101SuccessMessage('لینک حساب تبلیغاتی ستاره دریافت شد.')
    } catch (err: any) {
      console.warn('[StarGiftsModal] loadM101AdsAccountUrl error:', err)
      setM101Error(err?.message || 'خطا در دریافت حساب تبلیغاتی (payments.getStarsRevenueAdsAccountUrl)')
    } finally {
      setM101LoadingOp(null)
    }
  }

  const loadM101RevenueWithdrawalUrl = async () => {
    if (!accountId || !m101PeerId.trim()) {
      setM101Error('لطفاً شناسه کانال یا پیر را وارد کنید.')
      return
    }
    setM101LoadingOp('withdrawalUrl')
    setM101Error(null)
    setM101SuccessMessage(null)
    try {
      const res = await (window as any).guidegramAPI?.paymentsGetStarsRevenueWithdrawalUrlRaw?.(accountId, {
        peerId: m101PeerId.trim(),
        stars: m101WithdrawalStars ? BigInt(m101WithdrawalStars) : undefined,
      })
      setM101RevenueWithdrawalUrl(res?.url || (typeof res === 'string' ? res : JSON.stringify(res)))
      setM101SuccessMessage('لینک برداشت درآمد ستاره دریافت شد.')
    } catch (err: any) {
      console.warn('[StarGiftsModal] loadM101RevenueWithdrawalUrl error:', err)
      setM101Error(err?.message || 'خطا در دریافت لینک برداشت ستاره (payments.getStarsRevenueWithdrawalUrl)')
    } finally {
      setM101LoadingOp(null)
    }
  }

  // Microphase 102 Handlers (payments domain suite part 9)
  const loadM102UniqueGift = async () => {
    if (!accountId || !m102Slug.trim()) {
      setM102Error('لطفاً Slug گیفت منحصربه‌فرد را وارد کنید (مثلاً pepe-101)')
      return
    }
    setM102LoadingOp('uniqueGift')
    setM102Error(null)
    setM102SuccessMessage(null)
    try {
      const res = await (window as any).guidegramAPI?.paymentsGetUniqueStarGiftRaw?.(accountId, {
        slug: m102Slug.trim(),
      })
      setM102UniqueGift(res)
      setM102SuccessMessage('اطلاعات گیفت نایاب با موفقیت استعلام شد.')
    } catch (err: any) {
      console.warn('[StarGiftsModal] loadM102UniqueGift error:', err)
      setM102Error(err?.message || 'خطا در دریافت اطلاعات گیفت منحصربه‌فرد (payments.getUniqueStarGift)')
    } finally {
      setM102LoadingOp(null)
    }
  }

  const loadM102UniqueGiftValueInfo = async () => {
    if (!accountId || !m102Slug.trim()) {
      setM102Error('لطفاً Slug گیفت منحصربه‌فرد را وارد کنید')
      return
    }
    setM102LoadingOp('uniqueValue')
    setM102Error(null)
    setM102SuccessMessage(null)
    try {
      const res = await (window as any).guidegramAPI?.paymentsGetUniqueStarGiftValueInfoRaw?.(accountId, {
        slug: m102Slug.trim(),
      })
      setM102UniqueValueInfo(res)
      setM102SuccessMessage('ارزش‌گذاری و دیتای معاملاتی گیفت نایاب دریافت شد.')
    } catch (err: any) {
      console.warn('[StarGiftsModal] loadM102UniqueGiftValueInfo error:', err)
      setM102Error(err?.message || 'خطا در دریافت ارزش‌گذاری گیفت نایاب (payments.getUniqueStarGiftValueInfo)')
    } finally {
      setM102LoadingOp(null)
    }
  }

  const loadM102TransactionsByID = async () => {
    if (!accountId || !m102TxIds.trim()) {
      setM102Error('شناسه حداقل یک تراکنش را وارد کنید')
      return
    }
    setM102LoadingOp('txById')
    setM102Error(null)
    setM102SuccessMessage(null)
    try {
      const ids = m102TxIds.split(',').map((s) => s.trim()).filter(Boolean)
      const res = await (window as any).guidegramAPI?.paymentsGetStarsTransactionsByIDRaw?.(accountId, {
        peerId: m101PeerId.trim() || undefined,
        id: ids,
      })
      setM102TxData(res)
      setM102SuccessMessage('تراکنش‌های مدنظر با موفقیت بازخوانی شدند.')
    } catch (err: any) {
      console.warn('[StarGiftsModal] loadM102TransactionsByID error:', err)
      setM102Error(err?.message || 'خطا در دریافت تراکنش‌ها بر اساس شناسه (payments.getStarsTransactionsByID)')
    } finally {
      setM102LoadingOp(null)
    }
  }

  const loadM102SuggestedStarRefBots = async () => {
    if (!accountId) return
    setM102LoadingOp('refBots')
    setM102Error(null)
    setM102SuccessMessage(null)
    try {
      const res = await (window as any).guidegramAPI?.paymentsGetSuggestedStarRefBotsRaw?.(accountId, {
        peerId: m101PeerId.trim() || undefined,
      })
      setM102RefBots(res)
      setM102SuccessMessage('بات‌های پیشنهادی ارجاع ستاره با موفقیت دریافت شدند.')
    } catch (err: any) {
      console.warn('[StarGiftsModal] loadM102SuggestedStarRefBots error:', err)
      setM102Error(err?.message || 'خطا در دریافت بات‌های رفرال ستاره (payments.getSuggestedStarRefBots)')
    } finally {
      setM102LoadingOp(null)
    }
  }

  const launchM102PrepaidGiveaway = async () => {
    if (!accountId || !m102GiveawayId.trim()) {
      setM102Error('شناسه قرعه‌کشی (Giveaway ID) را وارد کنید')
      return
    }
    setM102LoadingOp('giveaway')
    setM102Error(null)
    setM102SuccessMessage(null)
    try {
      const res = await (window as any).guidegramAPI?.paymentsLaunchPrepaidGiveawayRaw?.(accountId, {
        peerId: m101PeerId.trim() || undefined,
        giveawayId: BigInt(m102GiveawayId.trim()),
        purpose: { _: 'inputStorePaymentStarsGiveaway' },
      })
      setM102PrepaidResult(res)
      setM102SuccessMessage('قرعه‌کشی با موفقیت در کانال فعال شد (payments.launchPrepaidGiveaway)')
    } catch (err: any) {
      console.warn('[StarGiftsModal] launchM102PrepaidGiveaway error:', err)
      setM102Error(err?.message || 'خطا در اجرای قرعه‌کشی از پیش‌پرداخت‌شده')
    } finally {
      setM102LoadingOp(null)
    }
  }

  const submitM102RefundStarsCharge = async () => {
    if (!accountId || !m102RefundUserId.trim() || !m102RefundChargeId.trim()) {
      setM102Error('شناسه کاربر و شناسه تراکنش شارژ الزامی است')
      return
    }
    setM102LoadingOp('refund')
    setM102Error(null)
    setM102SuccessMessage(null)
    try {
      const res = await (window as any).guidegramAPI?.paymentsRefundStarsChargeRaw?.(accountId, {
        userId: m102RefundUserId.trim(),
        chargeId: m102RefundChargeId.trim(),
      })
      setM102RefundResult(res)
      setM102SuccessMessage('مبلغ ستاره با موفقیت به کاربر ریفاند شد (payments.refundStarsCharge)')
    } catch (err: any) {
      console.warn('[StarGiftsModal] submitM102RefundStarsCharge error:', err)
      setM102Error(err?.message || 'خطا در استرداد ستاره')
    } finally {
      setM102LoadingOp(null)
    }
  }

  const submitM102ReorderStarGiftCollections = async () => {
    if (!accountId || !m102ReorderList.trim()) {
      setM102Error('ترتیب جدید کالکشن‌ها را به صورت اعداد با کاما وارد کنید (مثلاً 1, 2, 0)')
      return
    }
    setM102LoadingOp('reorder')
    setM102Error(null)
    setM102SuccessMessage(null)
    try {
      const order = m102ReorderList.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n))
      const res = await (window as any).guidegramAPI?.paymentsReorderStarGiftCollectionsRaw?.(accountId, {
        peerId: m101PeerId.trim() || undefined,
        order,
      })
      setM102ReorderResult(res)
      setM102SuccessMessage('چینش کالکشن‌ها در سرور تلگرام بروزرسانی شد.')
    } catch (err: any) {
      console.warn('[StarGiftsModal] submitM102ReorderStarGiftCollections error:', err)
      setM102Error(err?.message || 'خطا در ذخیره ترتیب کالکشن‌های گیفت')
    } finally {
      setM102LoadingOp(null)
    }
  }

  const loadCollections = async () => {
    if (!accountId) return
    setLoadingCollections(true)
    setCollectionsError(null)
    try {
      const res = await (window as any).guidegramAPI?.paymentsGetStarGiftCollectionsRaw?.(accountId, {
        peerId: peerId || undefined,
        hash: 0n,
      })
      const list = res?.collections || (Array.isArray(res) ? res : [])
      setCollectionsData(list)
    } catch (err: any) {
      console.warn('[StarGiftsModal] loadCollections error:', err)
      setCollectionsError(err?.message || 'Failed to fetch star gift collections')
    } finally {
      setLoadingCollections(false)
    }
  }

  const loadUpgradeInfo = async () => {
    if (!accountId || !upgradeGiftId.trim()) return
    setLoadingUpgrade(true)
    setUpgradeError(null)
    try {
      const [preview, attrs] = await Promise.all([
        (window as any).guidegramAPI?.paymentsGetStarGiftUpgradePreviewRaw?.(accountId, {
          giftId: upgradeGiftId.trim(),
        }),
        (window as any).guidegramAPI?.paymentsGetStarGiftUpgradeAttributesRaw?.(accountId, {
          giftId: upgradeGiftId.trim(),
        }),
      ])
      setUpgradePreviewData(preview)
      setUpgradeAttributesData(attrs)
    } catch (err: any) {
      console.warn('[StarGiftsModal] loadUpgradeInfo error:', err)
      setUpgradeError(err?.message || 'Failed to query upgrade attributes')
    } finally {
      setLoadingUpgrade(false)
    }
  }

  const loadWithdrawalUrl = async () => {
    if (!accountId || !withdrawalGiftId.trim()) return
    setLoadingWithdrawal(true)
    setWithdrawalError(null)
    try {
      const res = await (window as any).guidegramAPI?.paymentsGetStarGiftWithdrawalUrlRaw?.(accountId, {
        stargift: { _: 'inputSavedStarGiftUser', msgId: Number(withdrawalGiftId.trim()) || 1 },
      })
      setWithdrawalUrl(res?.url || (typeof res === 'string' ? res : JSON.stringify(res)))
    } catch (err: any) {
      console.warn('[StarGiftsModal] loadWithdrawalUrl error:', err)
      setWithdrawalError(err?.message || 'Failed to get withdrawal URL')
    } finally {
      setLoadingWithdrawal(false)
    }
  }

  const loadStarsOptions = async () => {
    if (!accountId) return
    setLoadingOptions(true)
    setOptionsError(null)
    try {
      const [gifts, giveaways] = await Promise.all([
        (window as any).guidegramAPI?.paymentsGetStarsGiftOptionsRaw?.(accountId, { userId: peerId || undefined }),
        (window as any).guidegramAPI?.paymentsGetStarsGiveawayOptionsRaw?.(accountId),
      ])
      setGiftOptionsData(Array.isArray(gifts) ? gifts : gifts?.options || [])
      setGiveawayOptionsData(giveaways)
    } catch (err: any) {
      console.warn('[StarGiftsModal] loadStarsOptions error:', err)
      setOptionsError(err?.message || 'Failed to fetch gift & giveaway options')
    } finally {
      setLoadingOptions(false)
    }
  }

  const loadActiveAuctions = async () => {
    if (!accountId) return
    setLoadingAuctions(true)
    setAuctionsError(null)
    try {
      const res = await (window as any).guidegramAPI?.paymentsGetStarGiftActiveAuctionsRaw?.(accountId, { hash: 0n })
      const list = res?.auctions || res?.items || (Array.isArray(res) ? res : [])
      setActiveAuctions(list)
    } catch (err: any) {
      console.warn('[StarGiftsModal] loadActiveAuctions error:', err)
      setAuctionsError(err?.message || 'Failed to fetch active auctions from MTProto')
    } finally {
      setLoadingAuctions(false)
    }
  }

  const loadResaleGifts = async () => {
    if (!accountId || !resaleGiftId.trim()) return
    setLoadingResale(true)
    setResaleError(null)
    try {
      const res = await (window as any).guidegramAPI?.paymentsGetResaleStarGiftsRaw?.(accountId, {
        giftId: resaleGiftId.trim(),
        limit: 20,
      })
      setResaleGifts(res)
    } catch (err: any) {
      console.warn('[StarGiftsModal] loadResaleGifts error:', err)
      setResaleError(err?.message || 'Failed to query secondary market')
    } finally {
      setLoadingResale(false)
    }
  }

  const loadSavedInfo = async () => {
    if (!accountId) return
    setLoadingSavedInfo(true)
    try {
      const res = await (window as any).guidegramAPI?.paymentsGetSavedInfoRaw?.(accountId)
      setSavedInfoData(res)
    } catch (err: any) {
      console.warn('[StarGiftsModal] loadSavedInfo error:', err)
    } finally {
      setLoadingSavedInfo(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'auctions' && activeAuctions === null && !loadingAuctions) {
      loadActiveAuctions()
      loadSavedInfo()
    } else if (activeTab === 'upgrades' && collectionsData === null && !loadingCollections) {
      loadCollections()
      loadStarsOptions()
    }
  }, [activeTab, accountId])

  // Detail View and Traits Modal States (Telegram Photo 2 & 3 Parity)
  const [selectedGift, setSelectedGift] = useState<StarGiftItem | null>(null)
  const [viewingTraits, setViewingTraits] = useState<boolean>(false)
  const [activeTraitTab, setActiveTraitTab] = useState<ActiveTraitTab>('model')
  const [collectionTraits, setCollectionTraits] = useState<{
    models: Array<{ name: string; rarityPercent: number; isSelected?: boolean; iconEmoji?: string }>
    backdrops: Array<{ name: string; rarityPercent: number; centerColor: string; edgeColor: string; isSelected?: boolean }>
    symbols: Array<{ name: string; rarityPercent: number; isSelected?: boolean; iconEmoji?: string }>
  } | null>(null)

  // Minimalist Sorting & Filtering Controls
  const [sortBy, setSortBy] = useState<SortCriteria>('rarity_total')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [onlyUnique, setOnlyUnique] = useState<boolean>(false)

  // Sync initialSelectedGift when opened from orbit
  useEffect(() => {
    if (initialSelectedGift) {
      setSelectedGift(initialSelectedGift)
    }
  }, [initialSelectedGift])

  // 1. Fetch Saved Gifts
  useEffect(() => {
    if (!isOpen || !accountId) return
    let isMounted = true
    setLoadingSaved(true)

    if (window.guidegram?.getSavedStarGifts) {
      window.guidegram
        .getSavedStarGifts(accountId, peerId)
        .then((res) => {
          if (isMounted) {
            setSavedGifts(res || [])
            setLoadingSaved(false)
          }
        })
        .catch((err) => {
          console.warn('Failed to load star gifts:', err)
          if (isMounted) {
            setSavedGifts([])
            setLoadingSaved(false)
          }
        })
    } else {
      setLoadingSaved(false)
    }

    return () => {
      isMounted = false
    }
  }, [isOpen, accountId, peerId])

  // 2. Fetch Catalog Gifts
  useEffect(() => {
    if (!isOpen || !accountId || activeTab !== 'catalog') return
    let isMounted = true
    setLoadingCatalog(true)

    if (window.guidegram?.getStarGifts) {
      window.guidegram
        .getStarGifts(accountId)
        .then((res) => {
          if (isMounted) {
            setCatalogGifts(res || [])
            setLoadingCatalog(false)
          }
        })
        .catch((err) => {
          console.warn('Failed to load star gifts catalog:', err)
          if (isMounted) {
            setCatalogGifts([])
            setLoadingCatalog(false)
          }
        })
    } else {
      setLoadingCatalog(false)
    }

    return () => {
      isMounted = false
    }
  }, [isOpen, accountId, activeTab])

  // 3. Fetch Collection Traits for Selected Gift (Photo 3)
  useEffect(() => {
    if (!selectedGift || !accountId) return

    if (window.guidegram?.getStarGiftCollectionTraits) {
      window.guidegram
        .getStarGiftCollectionTraits(accountId, selectedGift.slug, selectedGift.title)
        .then((res) => {
          if (res) {
            setCollectionTraits(res)
          }
        })
        .catch(() => {})
    }
  }, [selectedGift, accountId])

  // Metrics Calculations: Total Stars and Total Gram / TON
  const totalSavedStars = useMemo(() => {
    return savedGifts.reduce((acc, g) => acc + (g.stars || 0), 0)
  }, [savedGifts])

  const totalValueGram = useMemo(() => {
    return savedGifts.reduce((acc, g) => acc + (g.valueGram || Number(((g.stars * 0.016) / 5.2).toFixed(2))), 0)
  }, [savedGifts])

  // Filtered and Sorted Gifts
  const processedGifts = useMemo(() => {
    let list = [...savedGifts]

    if (onlyUnique) {
      list = list.filter((g) => g.isUnique)
    }

    list.sort((a, b) => {
      let valA = 0
      let valB = 0

      switch (sortBy) {
        case 'date':
          valA = a.date || 0
          valB = b.date || 0
          break
        case 'rarity_total':
          valA = a.totalRarityPercent ?? 999
          valB = b.totalRarityPercent ?? 999
          break
        case 'model_rarity':
          valA = a.model?.rarityPercent ?? 999
          valB = b.model?.rarityPercent ?? 999
          break
        case 'backdrop_rarity':
          valA = a.backdrop?.rarityPercent ?? 999
          valB = b.backdrop?.rarityPercent ?? 999
          break
        case 'price':
          valA = a.stars || 0
          valB = b.stars || 0
          break
      }

      if (sortOrder === 'asc') {
        return valA - valB
      }
      return valB - valA
    })

    return list
  }, [savedGifts, sortBy, sortOrder, onlyUnique])

  if (!isOpen) return null

  // Switch to specific trait tab in Traits View
  const handleOpenTraits = (tab: ActiveTraitTab) => {
    setActiveTraitTab(tab)
    setViewingTraits(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-3 sm:p-5 select-none font-sans"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
        className="w-full max-w-xl bg-[#11161d] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* A. If viewing single gift detail (Photo 2) or traits (Photo 3) */}
        {selectedGift ? (
          viewingTraits ? (
            /* ============================================================== */
            /* VIEW 3: SELECTED TRAITS EXPLORER (Exact Telegram Photo 3 Parity) */
            /* ============================================================== */
            <div className="flex flex-col h-full overflow-hidden bg-[#0c1117]">
              {/* Header */}
              <div
                className="relative p-6 pt-7 pb-5 flex flex-col items-center text-center overflow-hidden"
                style={{
                  background: `linear-gradient(180deg, ${selectedGift.backdrop?.centerColor || '#C27803'}ee 0%, ${selectedGift.backdrop?.edgeColor || '#8F5400'}dd 100%)`,
                }}
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setViewingTraits(false)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors cursor-pointer z-20"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Animated Mascot Hero Media */}
                <div className="relative mb-2 w-28 h-28 flex items-center justify-center">
                  <StarGiftVisual
                    gift={selectedGift}
                    accountId={accountId}
                    size="xl"
                    showBackdrop={false}
                    hideBadge={true}
                    className="w-full h-full object-contain filter drop-shadow-2xl pointer-events-none"
                  />
                </div>

                <h2 className="text-xl font-bold text-white tracking-tight">
                  {selectedGift.title || 'Jolly Chimp'}
                </h2>
                <span className="text-xs text-white/80 font-medium mt-0.5">
                  Selected Traits
                </span>

                {/* Trait Selection Segmented Controls (Photo 3 Header Buttons) */}
                <div className="grid grid-cols-3 gap-2 w-full mt-4 max-w-md">
                  <button
                    type="button"
                    onClick={() => setActiveTraitTab('model')}
                    className={`relative p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      activeTraitTab === 'model'
                        ? 'bg-black/40 border-white/40 shadow-inner'
                        : 'bg-black/20 border-white/10 hover:bg-black/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white truncate max-w-[70px]">
                        {selectedGift.model?.name || 'Alarm Ape'}
                      </span>
                      <span className="text-[9px] font-mono px-1 rounded bg-black/40 text-emerald-300 font-bold">
                        {selectedGift.model?.rarityPercent ?? 2.5}%
                      </span>
                    </div>
                    <div className="text-[9px] text-white/60 font-mono mt-0.5">model</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTraitTab('backdrop')}
                    className={`relative p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      activeTraitTab === 'backdrop'
                        ? 'bg-black/40 border-white/40 shadow-inner'
                        : 'bg-black/20 border-white/10 hover:bg-black/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white truncate max-w-[70px]">
                        {selectedGift.backdrop?.name || 'Mustard'}
                      </span>
                      <span className="text-[9px] font-mono px-1 rounded bg-black/40 text-emerald-300 font-bold">
                        {selectedGift.backdrop?.rarityPercent ?? 1.5}%
                      </span>
                    </div>
                    <div className="text-[9px] text-white/60 font-mono mt-0.5">backdrop</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTraitTab('symbol')}
                    className={`relative p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      activeTraitTab === 'symbol'
                        ? 'bg-black/40 border-white/40 shadow-inner'
                        : 'bg-black/20 border-white/10 hover:bg-black/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white truncate max-w-[70px]">
                        {selectedGift.symbol?.name || 'Drug'}
                      </span>
                      <span className="text-[9px] font-mono px-1 rounded bg-black/40 text-emerald-300 font-bold">
                        {selectedGift.symbol?.rarityPercent ?? 0.4}%
                      </span>
                    </div>
                    <div className="text-[9px] text-white/60 font-mono mt-0.5">symbol</div>
                  </button>
                </div>
              </div>

              {/* Subtitle */}
              <div className="px-5 py-3 border-b border-white/5 bg-[#0f141c] text-xs text-neutral-400 font-medium">
                {activeTraitTab === 'model' && (
                  <span>This collection features 50 unique models.</span>
                )}
                {activeTraitTab === 'backdrop' && (
                  <span>Available custom color backdrops in this collection.</span>
                )}
                {activeTraitTab === 'symbol' && (
                  <span>Unique symbols and patterns minted in this collection.</span>
                )}
              </div>

              {/* Traits Grid Body */}
              <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/10">
                {activeTraitTab === 'model' && (
                  <div className="grid grid-cols-3 gap-2.5">
                    {collectionTraits?.models.map((m, idx) => {
                      const isCurrent = (selectedGift.model?.name || 'Alarm Ape') === m.name
                      return (
                        <div
                          key={m.name + idx}
                          className={`p-3 rounded-2xl flex flex-col items-center justify-between gap-2 border transition-all ${
                            isCurrent
                              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md ring-1 ring-emerald-400/30'
                              : 'bg-neutral-900/60 border-white/5 hover:border-white/15'
                          }`}
                        >
                          <div className="w-full flex justify-end">
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-black/60 text-emerald-400 font-semibold border border-emerald-500/20">
                              {m.rarityPercent}%
                            </span>
                          </div>
                          <div className="text-3xl filter drop-shadow select-none my-1">
                            {m.iconEmoji || '🐒'}
                          </div>
                          <span className="text-[11px] font-semibold text-neutral-200 truncate w-full text-center">
                            {m.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {activeTraitTab === 'backdrop' && (
                  <div className="grid grid-cols-3 gap-2.5">
                    {collectionTraits?.backdrops.map((b, idx) => {
                      const isCurrent = (selectedGift.backdrop?.name || 'Mustard') === b.name
                      return (
                        <div
                          key={b.name + idx}
                          className={`p-3 rounded-2xl flex flex-col items-center justify-between gap-2 border transition-all ${
                            isCurrent
                              ? 'border-amber-400/60 shadow-md ring-1 ring-amber-400/30'
                              : 'border-white/5 hover:border-white/15'
                          }`}
                          style={{
                            background: `linear-gradient(135deg, ${b.centerColor}44, ${b.edgeColor}66)`,
                          }}
                        >
                          <div className="w-full flex justify-end">
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-black/60 text-amber-300 font-semibold border border-white/10">
                              {b.rarityPercent}%
                            </span>
                          </div>
                          <div
                            className="w-10 h-10 rounded-full border border-white/30 shadow-md my-1"
                            style={{
                              background: `radial-gradient(circle at 35% 35%, ${b.centerColor}, ${b.edgeColor})`,
                            }}
                          />
                          <span className="text-[11px] font-semibold text-neutral-100 truncate w-full text-center">
                            {b.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {activeTraitTab === 'symbol' && (
                  <div className="grid grid-cols-3 gap-2.5">
                    {collectionTraits?.symbols.map((s, idx) => {
                      const isCurrent = (selectedGift.symbol?.name || 'Drug') === s.name
                      return (
                        <div
                          key={s.name + idx}
                          className={`p-3 rounded-2xl flex flex-col items-center justify-between gap-2 border transition-all ${
                            isCurrent
                              ? 'bg-cyan-950/40 border-cyan-500/50 shadow-md ring-1 ring-cyan-400/30'
                              : 'bg-neutral-900/60 border-white/5 hover:border-white/15'
                          }`}
                        >
                          <div className="w-full flex justify-end">
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-black/60 text-cyan-400 font-semibold border border-cyan-500/20">
                              {s.rarityPercent}%
                            </span>
                          </div>
                          <div className="text-3xl filter drop-shadow select-none my-1">
                            {s.iconEmoji || '💊'}
                          </div>
                          <span className="text-[11px] font-semibold text-neutral-200 truncate w-full text-center">
                            {s.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Back Button */}
              <div className="p-4 border-t border-white/5 bg-[#0e131b] flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingTraits(false)}
                  className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Back to Gift
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* VIEW 2: UNIQUE GIFT HERO DETAIL (Exact Telegram Photo 2 Parity) */
            /* ============================================================== */
            <div className="flex flex-col h-full overflow-hidden bg-[#0c1117]">
              {/* Vibrant Colored Backdrop Banner with repeating Pill/Symbol patterns */}
              <div
                className="relative p-6 pt-8 pb-6 flex flex-col items-center text-center overflow-hidden"
                style={{
                  background: `linear-gradient(180deg, ${selectedGift.backdrop?.centerColor || '#C27803'} 0%, ${selectedGift.backdrop?.edgeColor || '#8F5400'} 100%)`,
                }}
              >
                {/* Diagonal Repeating Symbol Pattern Watermark */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.4) 1.5px, transparent 1.5px)`,
                    backgroundSize: '24px 24px',
                  }}
                />

                {/* Window Top Controls */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20">
                  <button
                    type="button"
                    onClick={async () => {
                      await copyTextToClipboard(`https://t.me/nft/${selectedGift.slug || selectedGift.id}`)
                    }}
                    title="Copy Gift Link"
                    className="p-1.5 rounded-full bg-black/25 hover:bg-black/40 text-white transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGift(null)}
                    className="p-1.5 rounded-full bg-black/25 hover:bg-black/40 text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Animated Lottie / Vector Character Mascot */}
                <div className="relative mb-2 w-36 h-36 flex items-center justify-center">
                  <StarGiftVisual
                    gift={selectedGift}
                    accountId={accountId}
                    size="2xl"
                    showBackdrop={false}
                    hideBadge={true}
                    className="w-full h-full object-contain filter drop-shadow-2xl pointer-events-none"
                  />
                </div>

                {/* Title & Collection Number */}
                <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow-sm flex items-center gap-2">
                  <span>{selectedGift.title || 'Jolly Chimp'}</span>
                  {selectedGift.num && (
                    <span className="font-mono text-xl opacity-90">
                      #{selectedGift.num.toLocaleString()}
                    </span>
                  )}
                </h2>

                <p className="text-sm font-medium text-white/80 mt-0.5">
                  {selectedGift.model?.name || 'Alarm Ape'}
                </p>
              </div>

              {/* Attributes Table Card (Photo 2) */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="rounded-2xl bg-neutral-900/90 border border-white/5 divide-y divide-white/5 overflow-hidden text-xs">
                  {/* Owner */}
                  <div className="p-3.5 flex items-center justify-between">
                    <span className="text-neutral-400 font-medium">Owner</span>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-neutral-700 overflow-hidden flex items-center justify-center text-[10px] text-white">
                        {selectedGift.ownerName?.charAt(0) || 'E'}
                      </div>
                      <span className="font-semibold text-neutral-100">
                        {selectedGift.ownerName || userName || 'Ershad'}
                      </span>
                      <Star className="w-3.5 h-3.5 text-cyan-400 fill-current" />
                    </div>
                  </div>

                  {/* Model */}
                  <div
                    onClick={() => handleOpenTraits('model')}
                    className="p-3.5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <span className="text-neutral-400 font-medium">Model</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-100 group-hover:text-emerald-300 transition-colors">
                        {selectedGift.model?.name || 'Alarm Ape'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold">
                        {selectedGift.model?.rarityPercent ?? 2.5}%
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300 transition-colors" />
                    </div>
                  </div>

                  {/* Symbol */}
                  <div
                    onClick={() => handleOpenTraits('symbol')}
                    className="p-3.5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <span className="text-neutral-400 font-medium">Symbol</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-100 group-hover:text-cyan-300 transition-colors">
                        {selectedGift.symbol?.name || 'Drug'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold">
                        {selectedGift.symbol?.rarityPercent ?? 0.4}%
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300 transition-colors" />
                    </div>
                  </div>

                  {/* Backdrop */}
                  <div
                    onClick={() => handleOpenTraits('backdrop')}
                    className="p-3.5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <span className="text-neutral-400 font-medium">Backdrop</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-100 group-hover:text-amber-300 transition-colors">
                        {selectedGift.backdrop?.name || 'Mustard'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold">
                        {selectedGift.backdrop?.rarityPercent ?? 1.5}%
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300 transition-colors" />
                    </div>
                  </div>

                  {/* Total Rarity Score */}
                  <div className="p-3.5 flex items-center justify-between">
                    <span className="text-neutral-400 font-medium">Total Rarity</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-300 text-[11px] font-mono font-bold">
                        {selectedGift.totalRarityPercent
                          ? `${selectedGift.totalRarityPercent}% (Ultra Rare)`
                          : '0.00015% (Mythic)'}
                      </span>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="p-3.5 flex items-center justify-between">
                    <span className="text-neutral-400 font-medium">Quantity</span>
                    <span className="text-neutral-200 font-mono font-medium">
                      {(selectedGift.availabilityIssued || 118084).toLocaleString()} of{' '}
                      {(selectedGift.availabilityTotal || 132155).toLocaleString()} issued
                    </span>
                  </div>

                  {/* Value */}
                  <div className="p-3.5 flex items-center justify-between">
                    <span className="text-neutral-400 font-medium">Value</span>
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="text-neutral-100 font-mono">
                        ~${(selectedGift.valueUsd || 16.0).toFixed(2)}
                      </span>
                      <span className="text-neutral-400 text-[11px]">
                        ({selectedGift.valueGram || 3.2} TON/Gram)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visibility Subtitle */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-400">
                  <span>This gift is visible on your profile.</span>
                  <button
                    type="button"
                    onClick={() => {}}
                    className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                  >
                    Hide &gt;
                  </button>
                </div>
              </div>

              {/* Green Emerald OK Button (Photo 2) */}
              <div className="p-4 border-t border-white/5 bg-[#0e131b] flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setSelectedGift(null)}
                  className="w-full py-3 rounded-2xl bg-[#007A5E] hover:bg-[#009270] text-white font-bold text-sm tracking-wide shadow-lg transition-all cursor-pointer text-center"
                >
                  OK
                </button>
              </div>
            </div>
          )
        ) : (
          /* ============================================================== */
          /* MAIN VIEW: GIFTS SHELF & CATALOG WITH MINIMALIST UI FILTERING  */
          /* ============================================================== */
          <>
            {/* Minimalist Editorial Modal Header */}
            <div className="p-6 pb-4 bg-gradient-to-b from-white/[0.04] to-transparent border-b border-white/5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-100 tracking-tight">
                    Telegram Star Gifts
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {activeTab === 'saved'
                      ? userName ? `Star gifts for ${userName}` : 'Your collected Telegram gifts'
                      : 'Official Telegram Star Gifts Catalog'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Total Stars & Gram Telemetry Pill Badges */}
              {activeTab === 'saved' && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono font-semibold">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{formatNumber(totalSavedStars)} Stars</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono font-semibold">
                    <Coins className="w-3.5 h-3.5" />
                    <span>~{totalValueGram.toLocaleString()} Gram (TON)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Minimalist Tabs */}
            <div className="px-6 border-b border-white/5 flex items-center gap-6 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('saved')}
                className={`py-3 font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'saved'
                    ? 'border-amber-400 text-neutral-100 font-semibold'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Profile Shelf ({savedGifts.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`py-3 font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'catalog'
                    ? 'border-amber-400 text-neutral-100 font-semibold'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Gift Catalog</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('auctions')}
                className={`py-3 font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'auctions'
                    ? 'border-amber-400 text-neutral-100 font-semibold'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Gavel className="w-3.5 h-3.5" />
                <span>Auctions & Resale</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upgrades')}
                className={`py-3 font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'upgrades'
                    ? 'border-amber-400 text-neutral-100 font-semibold'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upgrades & Collections</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('revenue')}
                className={`py-3 font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'revenue'
                    ? 'border-amber-400 text-neutral-100 font-semibold'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Revenue & Stars</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('unique_giveaways')}
                className={`py-3 font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'unique_giveaways'
                    ? 'border-amber-400 text-neutral-100 font-semibold'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Unique & Giveaways</span>
              </button>
            </div>

            {/* Ultra-Refined Minimalist Sorting & Filter Bar (/minimalist-ui) */}
            {activeTab === 'saved' && savedGifts.length > 0 && (
              <div className="px-6 py-2.5 bg-neutral-900/60 border-b border-white/5 flex flex-wrap items-center justify-between gap-2.5 text-[11px]">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                  <span className="text-neutral-400 font-medium mr-1 flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Sort:</span>
                  </span>

                  {[
                    { key: 'rarity_total', label: 'Total Rarity' },
                    { key: 'model_rarity', label: 'Model %' },
                    { key: 'backdrop_rarity', label: 'Backdrop %' },
                    { key: 'date', label: 'Date' },
                    { key: 'price', label: 'Stars' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => {
                        if (sortBy === s.key) {
                          setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                        } else {
                          setSortBy(s.key as SortCriteria)
                          setSortOrder(s.key.includes('rarity') ? 'asc' : 'desc')
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                        sortBy === s.key
                          ? 'bg-neutral-800 border-white/20 text-neutral-100 font-semibold shadow-xs'
                          : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                      }`}
                    >
                      <span>{s.label}</span>
                      {sortBy === s.key && (
                        <ArrowUpDown className="w-2.5 h-2.5 text-amber-400" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Unique NFTs Toggle Pill */}
                <button
                  type="button"
                  onClick={() => setOnlyUnique((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    onlyUnique
                      ? 'bg-purple-950/50 border-purple-500/40 text-purple-300'
                      : 'border-white/5 text-neutral-400 hover:bg-white/5'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>Unique NFTs Only</span>
                  {onlyUnique && <Check className="w-3 h-3 text-purple-400" />}
                </button>
              </div>
            )}

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3.5 scrollbar-thin scrollbar-thumb-white/10">
              {activeTab === 'saved' ? (
                loadingSaved ? (
                  <div className="flex flex-col items-center justify-center py-16 text-xs text-neutral-400 gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-amber-500/40 border-t-amber-400 animate-spin" />
                    <span>Loading saved gifts...</span>
                  </div>
                ) : processedGifts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-white/5 flex items-center justify-center text-neutral-400 mb-3">
                      <Gift className="w-7 h-7" />
                    </div>
                    <div className="text-sm font-semibold text-neutral-200">No Star Gifts Found</div>
                    <p className="text-xs text-neutral-400 max-w-xs mt-1 leading-relaxed">
                      Unique gifts received on Telegram will appear here with dynamic animated visuals.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {processedGifts.map((gift, idx) => (
                      <div
                        key={gift.id || idx}
                        onClick={() => setSelectedGift(gift)}
                        className="p-3.5 rounded-2xl bg-neutral-900/70 hover:bg-neutral-900 border border-white/5 hover:border-amber-400/30 transition-all flex flex-col justify-between gap-2.5 shadow-sm group cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <StarGiftVisual
                              gift={gift}
                              accountId={accountId}
                              size="md"
                              hideBadge={true}
                              interactive
                            />
                            <div>
                              <div className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                                <span>{gift.title || `${gift.stars} Stars Gift`}</span>
                                {gift.num && (
                                  <span className="text-[10px] text-amber-400 font-mono font-normal">
                                    #{gift.num.toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 mt-0.5">
                                <Star className="w-3 h-3 fill-current" />
                                <span>{gift.stars} Stars</span>
                                {gift.valueGram && (
                                  <span className="text-neutral-400 font-normal font-mono text-[10px]">
                                    (~{gift.valueGram} Gram)
                                  </span>
                                )}
                              </div>
                              {gift.model?.name && (
                                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                  Model: {gift.model.name} ({gift.model.rarityPercent}%)
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {gift.isUnique && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Unique NFT
                              </span>
                            )}
                            {gift.totalRarityPercent !== undefined && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                                {gift.totalRarityPercent}%
                              </span>
                            )}
                          </div>
                        </div>

                        {gift.message && (
                          <div
                            dir={isRTL(gift.message) ? 'rtl' : 'ltr'}
                            className="text-xs text-neutral-300 italic bg-black/30 p-2 rounded-xl border border-white/5 leading-snug"
                          >
                            "{gift.message}"
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-white/5">
                          <div className="flex items-center gap-1">
                            {gift.isAnonymous ? (
                              <>
                                <EyeOff className="w-3 h-3 text-neutral-500" />
                                <span>Anonymous</span>
                              </>
                            ) : (
                              <>
                                <User className="w-3 h-3 text-neutral-500" />
                                <span className="truncate max-w-[110px] font-medium text-neutral-300">
                                  {gift.fromName || 'Friend'}
                                </span>
                              </>
                            )}
                          </div>
                          <span className="font-mono text-neutral-400">
                            {gift.date ? new Date(gift.date).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : activeTab === 'catalog' ? (
                /* Catalog Tab */
                loadingCatalog ? (
                  <div className="flex flex-col items-center justify-center py-16 text-xs text-neutral-400 gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-amber-500/40 border-t-amber-400 animate-spin" />
                    <span>Loading gift catalog...</span>
                  </div>
                ) : catalogGifts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-white/5 flex items-center justify-center text-neutral-400 mb-3">
                      <ShoppingBag className="w-7 h-7" />
                    </div>
                    <div className="text-sm font-semibold text-neutral-200">Catalog Unavailable</div>
                    <p className="text-xs text-neutral-400 max-w-xs mt-1 leading-relaxed">
                      No active gifts currently listed by Telegram in this region.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {catalogGifts.map((gift, idx) => (
                      <div
                        key={gift.id || idx}
                        className="p-3.5 rounded-2xl bg-neutral-900/70 hover:bg-neutral-900 border border-white/5 hover:border-amber-400/30 transition-all flex flex-col justify-between gap-2.5 shadow-sm group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <StarGiftVisual
                              gift={gift}
                              accountId={accountId}
                              size="md"
                              hideBadge={true}
                              interactive
                            />
                            <div>
                              <div className="text-xs font-bold text-neutral-100 truncate max-w-[120px]">
                                {gift.title || `Star Gift #${gift.id.slice(-4)}`}
                              </div>
                              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                                <Star className="w-3 h-3 fill-current" />
                                <span>{gift.stars} Stars</span>
                              </div>
                            </div>
                          </div>

                          {gift.isSoldOut ? (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/30">
                              Sold Out
                            </span>
                          ) : gift.isLimited ? (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Limited
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Available
                            </span>
                          )}
                        </div>

                        {gift.availabilityRemains !== undefined && gift.availabilityTotal !== undefined && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                              <span>Remaining</span>
                              <span>
                                {formatNumber(gift.availabilityRemains)} / {formatNumber(gift.availabilityTotal)}
                              </span>
                            </div>
                            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-400 to-amber-500"
                                style={{
                                  width: `${Math.max(5, Math.min(100, (gift.availabilityRemains / gift.availabilityTotal) * 100))}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-white/5">
                          <span>Convertible: {gift.convertStars || gift.stars} ⭐</span>
                          <button
                            type="button"
                            onClick={async () => {
                              if (gift.isSoldOut) return
                              await copyTextToClipboard(`https://t.me/nft/${gift.id}`)
                            }}
                            className={`font-medium transition-colors ${
                              gift.isSoldOut
                                ? 'text-neutral-500 cursor-not-allowed'
                                : 'text-amber-400 hover:text-amber-300 cursor-pointer hover:underline'
                            }`}
                          >
                            {gift.isSoldOut ? 'Sold Out' : 'Copy Gift Link'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : activeTab === 'auctions' ? (
                /* Microphase 099: Auctions & Resale Secondary Market Explorer */
                <div className="space-y-4">
                  {/* Active Auctions Section */}
                  <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                          <Gavel className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                            <span>Active Star Gift Auctions</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                              MTProto Layer 232
                            </span>
                          </h4>
                          <p className="text-[10px] text-neutral-400">
                            حراجی‌های زنده هدایای تلگرام در شبکه استارز
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={loadActiveAuctions}
                        disabled={loadingAuctions}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingAuctions ? 'animate-spin' : ''}`} />
                        <span>بروزرسانی</span>
                      </button>
                    </div>

                    {/* 4 States for Active Auctions */}
                    {loadingAuctions ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2.5 text-xs text-neutral-400">
                        <div className="w-6 h-6 rounded-full border-2 border-amber-500/40 border-t-amber-400 animate-spin" />
                        <span>در حال دریافت حراجی‌های فعال از MTProto...</span>
                      </div>
                    ) : auctionsError ? (
                      <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-start justify-between gap-3 text-xs text-rose-300">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold">خطا در بارگذاری حراجی‌ها</div>
                            <div className="text-[10px] opacity-80 mt-0.5">{auctionsError}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={loadActiveAuctions}
                          className="px-2 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[11px] shrink-0 font-medium transition-colors"
                        >
                          تلاش مجدد
                        </button>
                      </div>
                    ) : !activeAuctions || activeAuctions.length === 0 ? (
                      <div className="py-8 px-4 rounded-xl bg-black/20 border border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                        <Gavel className="w-8 h-8 text-neutral-600 mb-2" />
                        <span className="text-xs font-semibold text-neutral-300">هیچ حراجی فعالی یافت نشد</span>
                        <span className="text-[10px] text-neutral-500 max-w-xs mt-1">
                          در حال حاضر حراجی عمومی ثبت‌شده‌ای در این کلاستر تلگرام فعال نیست (payments.getStarGiftActiveAuctions).
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {activeAuctions.map((auction: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                                #{idx + 1}
                              </div>
                              <div>
                                <div className="font-semibold text-neutral-200">
                                  {auction.title || auction.gift?.title || `Auction Lot #${auction.id || idx}`}
                                </div>
                                <div className="text-[10px] text-neutral-400 font-mono">
                                  {auction.currentBid ? `${auction.currentBid} ⭐` : 'بدون پیشنهاد'}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                              زنده
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Secondary Market / Resale Search Section */}
                  <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                          <span>Secondary Market (بازار ثانویه هدایا)</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-300 border border-purple-400/20">
                            payments.getResaleStarGifts
                          </span>
                        </h4>
                        <p className="text-[10px] text-neutral-400">
                          جستجوی آیتم‌های بازفروش بر اساس شناسه هدیه (Gift ID)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                          type="text"
                          value={resaleGiftId}
                          onChange={(e) => setResaleGiftId(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && loadResaleGifts()}
                          placeholder="شناسه هدیه (مثلاً 5421...)"
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-amber-400/50 font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={loadResaleGifts}
                        disabled={loadingResale || !resaleGiftId.trim()}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                      >
                        <Search className={`w-3.5 h-3.5 ${loadingResale ? 'animate-spin' : ''}`} />
                        <span>جستجو</span>
                      </button>
                    </div>

                    {/* Resale Query Results */}
                    {loadingResale ? (
                      <div className="flex flex-col items-center justify-center py-6 gap-2 text-xs text-neutral-400">
                        <div className="w-5 h-5 rounded-full border-2 border-purple-500/40 border-t-purple-400 animate-spin" />
                        <span>در حال استعلام بازار ثانویه...</span>
                      </div>
                    ) : resaleError ? (
                      <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
                        <span>{resaleError}</span>
                        <button
                          type="button"
                          onClick={loadResaleGifts}
                          className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 text-[10px]"
                        >
                          Retry
                        </button>
                      </div>
                    ) : resaleGifts ? (
                      <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-neutral-200">
                          <span>نتایج بازار ثانویه</span>
                          <span className="text-[10px] font-mono text-amber-400">
                            {resaleGifts?.count ?? resaleGifts?.gifts?.length ?? 0} مورد
                          </span>
                        </div>
                        <pre className="text-[10px] font-mono text-neutral-400 bg-black/40 p-2 rounded-lg overflow-x-auto max-h-36">
                          {JSON.stringify(resaleGifts, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                  </div>

                  {/* Saved Info & Checkout Wallet Telemetry */}
                  {savedInfoData && (
                    <div className="p-3 rounded-xl bg-neutral-900/40 border border-white/5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-neutral-300">وضعیت پرداخت امن تلگرام (Saved Info)</span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {savedInfoData?.hasSavedCredentials ? 'اطلاعات پرداخت ذخیره است' : 'فعال'}
                      </span>
                    </div>
                  )}
                </div>
              ) : activeTab === 'upgrades' ? (
                /* Microphase 100: Upgrades, Collections, Withdrawals & Stars Options */
                <div className="space-y-4">
                  {/* Collections Explorer Section */}
                  <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                            <span>Star Gift Collections</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-400/10 text-indigo-300 border border-indigo-400/20">
                              payments.getStarGiftCollections
                            </span>
                          </h4>
                          <p className="text-[10px] text-neutral-400">
                            مجموعه‌های رسمی هدایای کاربر و کانال در شبکه استارز
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={loadCollections}
                        disabled={loadingCollections}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingCollections ? 'animate-spin' : ''}`} />
                        <span>بروزرسانی</span>
                      </button>
                    </div>

                    {/* 4 States for Collections */}
                    {loadingCollections ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-2.5 text-xs text-neutral-400">
                        <div className="w-6 h-6 rounded-full border-2 border-indigo-500/40 border-t-indigo-400 animate-spin" />
                        <span>در حال استعلام کلکسیون‌های هدایا از MTProto...</span>
                      </div>
                    ) : collectionsError ? (
                      <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-start justify-between gap-3 text-xs text-rose-300">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold">خطا در دریافت مجموعه‌ها</div>
                            <div className="text-[10px] opacity-80 mt-0.5">{collectionsError}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={loadCollections}
                          className="px-2 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[11px] shrink-0 font-medium transition-colors"
                        >
                          تلاش مجدد
                        </button>
                      </div>
                    ) : !collectionsData || collectionsData.length === 0 ? (
                      <div className="py-6 px-4 rounded-xl bg-black/20 border border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                        <Layers className="w-7 h-7 text-neutral-600 mb-2" />
                        <span className="text-xs font-semibold text-neutral-300">مجموعه‌ای یافت نشد</span>
                        <span className="text-[10px] text-neutral-500 max-w-xs mt-1">
                          هیچ کلکسیون هدیه‌ای برای این شناسه کاربری ثبت نشده است (Zero Genesis State).
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {collectionsData.map((col: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                                #{idx + 1}
                              </div>
                              <div>
                                <div className="font-semibold text-neutral-200">
                                  {col.title || `Collection ${col.id || idx + 1}`}
                                </div>
                                <div className="text-[10px] text-neutral-400 font-mono">
                                  {col.giftsCount ?? col.count ?? 0} هدایا
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                              فعال
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Gift Upgrade Studio Section */}
                  <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                          <span>Star Gift Upgrade Studio</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                            getStarGiftUpgradeAttributes & Preview
                          </span>
                        </h4>
                        <p className="text-[10px] text-neutral-400">
                          پیش‌نمایش ویژگی‌های نایاب (Model, Backdrop, Symbol) و هزینه استارز جهت تبدیل هدیه به NFT
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                          type="text"
                          value={upgradeGiftId}
                          onChange={(e) => setUpgradeGiftId(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && loadUpgradeInfo()}
                          placeholder="شناسه هدیه برای ارتقا (مثلاً 5429...)"
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-amber-400/50 font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={loadUpgradeInfo}
                        disabled={loadingUpgrade || !upgradeGiftId.trim()}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                      >
                        <Zap className={`w-3.5 h-3.5 ${loadingUpgrade ? 'animate-spin' : ''}`} />
                        <span>بررسی ارتقا</span>
                      </button>
                    </div>

                    {/* 4 States for Upgrade */}
                    {loadingUpgrade ? (
                      <div className="flex flex-col items-center justify-center py-6 gap-2 text-xs text-neutral-400">
                        <div className="w-5 h-5 rounded-full border-2 border-amber-500/40 border-t-amber-400 animate-spin" />
                        <span>در حال محاسبه ویژگی‌های ارتقا از MTProto...</span>
                      </div>
                    ) : upgradeError ? (
                      <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
                        <span>{upgradeError}</span>
                        <button
                          type="button"
                          onClick={loadUpgradeInfo}
                          className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 text-[10px]"
                        >
                          Retry
                        </button>
                      </div>
                    ) : upgradePreviewData || upgradeAttributesData ? (
                      <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-neutral-200">
                          <span>نتایج ویژگی‌های ارتقا هدیه</span>
                          {upgradePreviewData?.price && (
                            <span className="text-[10px] font-mono text-amber-400">
                              هزینه ارتقا: {upgradePreviewData.price} ⭐
                            </span>
                          )}
                        </div>
                        <pre className="text-[10px] font-mono text-neutral-400 bg-black/40 p-2 rounded-lg overflow-x-auto max-h-36">
                          {JSON.stringify({ preview: upgradePreviewData, attributes: upgradeAttributesData }, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                  </div>

                  {/* TON / Fragment NFT Withdrawal Link */}
                  <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                          <span>Fragment NFT Withdrawal URL</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
                            payments.getStarGiftWithdrawalUrl
                          </span>
                        </h4>
                        <p className="text-[10px] text-neutral-400">
                          دریافت پیوند امن جهت انتقال مالکیت هدیه یونیک به آدرس بلاک‌چین TON
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                          type="text"
                          value={withdrawalGiftId}
                          onChange={(e) => setWithdrawalGiftId(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && loadWithdrawalUrl()}
                          placeholder="شناسه پیام هدیه ذخیره شده (Saved Gift msgId)"
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-cyan-400/50 font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={loadWithdrawalUrl}
                        disabled={loadingWithdrawal || !withdrawalGiftId.trim()}
                        className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                      >
                        <ArrowUpRight className={`w-3.5 h-3.5 ${loadingWithdrawal ? 'animate-spin' : ''}`} />
                        <span>دریافت لینک فرگمنت</span>
                      </button>
                    </div>

                    {/* 4 States for Withdrawal */}
                    {loadingWithdrawal ? (
                      <div className="flex flex-col items-center justify-center py-4 gap-2 text-xs text-neutral-400">
                        <div className="w-5 h-5 rounded-full border-2 border-cyan-500/40 border-t-cyan-400 animate-spin" />
                        <span>در حال تولید آدرس انتقال در Fragment...</span>
                      </div>
                    ) : withdrawalError ? (
                      <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
                        <span>{withdrawalError}</span>
                        <button
                          type="button"
                          onClick={loadWithdrawalUrl}
                          className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 text-[10px]"
                        >
                          Retry
                        </button>
                      </div>
                    ) : withdrawalUrl ? (
                      <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between gap-3 text-xs text-cyan-200">
                        <div className="truncate font-mono text-[11px]">{withdrawalUrl}</div>
                        <a
                          href={withdrawalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-medium text-[11px] shrink-0 flex items-center gap-1"
                        >
                          <span>باز کردن در فرگمنت</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : null}
                  </div>

                  {/* Stars Gift & Giveaway Presets Section */}
                  <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <Trophy className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                            <span>Stars Gift & Giveaway Options</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
                              getStarsGiftOptions & GiveawayOptions
                            </span>
                          </h4>
                          <p className="text-[10px] text-neutral-400">
                            گزینه‌های ارسال هدیه استارز به دوستان و پریست‌های قرعه‌کشی کانال
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={loadStarsOptions}
                        disabled={loadingOptions}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingOptions ? 'animate-spin' : ''}`} />
                        <span>بروزرسانی</span>
                      </button>
                    </div>

                    {/* 4 States for Options */}
                    {loadingOptions ? (
                      <div className="flex flex-col items-center justify-center py-6 gap-2 text-xs text-neutral-400">
                        <div className="w-5 h-5 rounded-full border-2 border-emerald-500/40 border-t-emerald-400 animate-spin" />
                        <span>در حال استعلام گزینه‌های استارز و قرعه‌کشی...</span>
                      </div>
                    ) : optionsError ? (
                      <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
                        <span>{optionsError}</span>
                        <button
                          type="button"
                          onClick={loadStarsOptions}
                          className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 text-[10px]"
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {giftOptionsData && giftOptionsData.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {giftOptionsData.slice(0, 6).map((opt: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-center space-y-1"
                              >
                                <div className="text-xs font-bold text-amber-400 flex items-center justify-center gap-1">
                                  <Star className="w-3 h-3 fill-current" />
                                  <span>{opt.stars || opt.amount || 0} Stars</span>
                                </div>
                                <div className="text-[10px] text-neutral-400 font-mono">
                                  {opt.currency ? `${opt.currency} ${opt.amount}` : opt.price || 'پیشنهاد هدیه'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {giveawayOptionsData && (
                          <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between text-xs">
                            <span className="text-neutral-300 font-medium">پریست‌های قرعه‌کشی فعال کانال</span>
                            <span className="text-[10px] font-mono text-emerald-400">
                              {giveawayOptionsData?.options?.length ?? 1} گزینه در دسترس
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === 'revenue' ? (
                /* Microphase 101: Revenue, Status, Subscriptions, Topup Options & Transactions */
                <div className="space-y-4">
                  {/* Status & Feedback Banners */}
                  {m101Error && (
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-start justify-between gap-3 text-xs text-rose-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold">خطا در پردازش عملیات ستاره‌ها</div>
                          <div className="text-[10px] opacity-80 mt-0.5">{m101Error}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setM101Error(null)}
                        className="px-2 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[11px] shrink-0 font-medium transition-colors cursor-pointer"
                      >
                        تلاش مجدد
                      </button>
                    </div>
                  )}

                  {m101SuccessMessage && (
                    <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-200">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>{m101SuccessMessage}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setM101SuccessMessage(null)}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                      >
                        بستن
                      </button>
                    </div>
                  )}

                  {/* Header / Config Bar */}
                  <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                          <Coins className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                            <span>Stars Telemetry & Revenue Center</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                              Microphase 101
                            </span>
                          </h4>
                          <p className="text-[10px] text-neutral-400">
                            استعلام موجودی واقعی، درآمد، بسته‌های شارژ و تراکنش‌های رسمی لایه ۲۳۲
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-400">
                        Layer 232 RPCs
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-1">شناسه کانال یا پیر (اختیاری - خالی برای اکانت جاری):</label>
                        <input
                          type="text"
                          value={m101PeerId}
                          onChange={(e) => setM101PeerId(e.target.value)}
                          placeholder="مثال: me یا -1001234567890"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-400/50"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <button
                          type="button"
                          onClick={loadM101StarsStatus}
                          disabled={m101LoadingOp === 'status'}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${m101LoadingOp === 'status' ? 'animate-spin' : ''}`} />
                          <span>استعلام موجودی ستاره</span>
                        </button>
                        <button
                          type="button"
                          onClick={loadM101TopupOptions}
                          disabled={m101LoadingOp === 'topup'}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                          <span>بسته‌های شارژ</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Section 1: Real Live Balance & Revenue Telemetry */}
                  {m101StatusData && (
                    <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-400 fill-current" />
                          <span className="text-xs font-bold text-neutral-200">وضعیت زنده موجودی ستاره (payments.getStarsStatus)</span>
                        </div>
                        <span className="text-xs font-bold text-amber-400 font-mono">
                          {m101StatusData.balance?.toString?.() ?? m101StatusData.balance ?? '0'} Stars
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                          <div className="text-[10px] text-neutral-400">موجودی فعلی</div>
                          <div className="font-mono font-bold text-neutral-200 mt-0.5">
                            {m101StatusData.balance?.toString?.() ?? '0'} ⭐
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                          <div className="text-[10px] text-neutral-400">اشتراک‌های فعال</div>
                          <div className="font-mono font-bold text-neutral-200 mt-0.5">
                            {m101StatusData.subscriptionsCount ?? (m101StatusData.subscriptions ? 'دارد' : '۰')}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                          <div className="text-[10px] text-neutral-400">قابلیت برداشت</div>
                          <div className="font-mono font-bold text-emerald-400 mt-0.5">
                            {m101StatusData.canWithdraw ? 'مجاز' : 'غیرفعال'}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                          <div className="text-[10px] text-neutral-400">رمز عبور دو مرحله‌ای</div>
                          <div className="font-mono font-bold text-neutral-200 mt-0.5">
                            {m101StatusData.hasPassword ? 'تنظیم شده' : 'نیاز ندارد'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 2: Topup Options Grid */}
                  {m101TopupOptions && m101TopupOptions.length > 0 && (
                    <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-neutral-200">بسته‌های رسمی شارژ و خرید ستاره (payments.getStarsTopupOptions)</span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400">{m101TopupOptions.length} بسته فعال</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {m101TopupOptions.map((opt: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-xl bg-black/30 border border-white/5 flex flex-col justify-between text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-400 flex items-center gap-1">
                                <Star className="w-3 h-3 fill-current" />
                                {opt.stars?.toString?.() ?? opt.stars ?? '۰'}
                              </span>
                              {opt.extended && (
                                <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-mono">Special</span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-neutral-300 mt-2">
                              {opt.currency ? `${opt.currency} ${(opt.amount / 100).toFixed(2)}` : 'پیشنهاد مستقیم'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 3: Revenue Statistics & Operations */}
                  <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-neutral-200">آمار و مدیریت درآمد ستاره کانال/ربات</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={loadM101RevenueStats}
                          disabled={m101LoadingOp === 'revenueStats'}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <TrendingUp className="w-3 h-3" />
                          <span>دریافت آمار درآمد</span>
                        </button>
                        <button
                          type="button"
                          onClick={loadM101AdsAccountUrl}
                          disabled={m101LoadingOp === 'adsUrl'}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>حساب تبلیغاتی</span>
                        </button>
                      </div>
                    </div>

                    {m101RevenueStats && (
                      <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-xs space-y-2">
                        <div className="flex items-center justify-between text-neutral-300">
                          <span>کل درآمد کسب شده:</span>
                          <span className="font-mono font-bold text-cyan-400">
                            {m101RevenueStats.revenue?.overall?.toString?.() ?? '۰'} Stars
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-neutral-300">
                          <span>موجودی قابل برداشت:</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {m101RevenueStats.revenue?.current?.toString?.() ?? '۰'} Stars
                          </span>
                        </div>
                      </div>
                    )}

                    {m101AdsAccountUrl && (
                      <div className="p-3 rounded-xl bg-black/30 border border-cyan-500/30 flex items-center justify-between text-xs">
                        <span className="text-neutral-300">لینک پنل تبلیغاتی:</span>
                        <a
                          href={m101AdsAccountUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                        >
                          <span>باز کردن پنل تبلیغات</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {/* Withdrawal Section */}
                    <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={m101WithdrawalStars}
                          onChange={(e) => setM101WithdrawalStars(e.target.value)}
                          placeholder="تعداد ستاره جهت برداشت..."
                          className="w-44 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-cyan-400/50"
                        />
                        <button
                          type="button"
                          onClick={loadM101RevenueWithdrawalUrl}
                          disabled={m101LoadingOp === 'withdrawalUrl'}
                          className="px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          <span>دریافت لینک برداشت (Withdrawal URL)</span>
                        </button>
                      </div>
                      {m101RevenueWithdrawalUrl && (
                        <a
                          href={m101RevenueWithdrawalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline text-[11px] font-mono flex items-center gap-1"
                        >
                          <span>تکمیل برداشت در Fragment</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Section 4: Transactions & Subscriptions */}
                  <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-neutral-200">تراکنش‌ها و اشتراک‌های ستاره</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={loadM101Transactions}
                          disabled={m101LoadingOp === 'transactions'}
                          className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>تراکنش‌ها (getStarsTransactions)</span>
                        </button>
                        <button
                          type="button"
                          onClick={loadM101Subscriptions}
                          disabled={m101LoadingOp === 'subscriptions'}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>اشتراک‌ها (getSubscriptions)</span>
                        </button>
                      </div>
                    </div>

                    {/* 4-State Transaction List View */}
                    {m101LoadingOp === 'transactions' ? (
                      <div className="flex flex-col items-center justify-center py-6 gap-2 text-xs text-neutral-400">
                        <div className="w-6 h-6 rounded-full border-2 border-purple-500/40 border-t-purple-400 animate-spin" />
                        <span>در حال دریافت تاریخچه تراکنش‌های ستاره از تلگرام...</span>
                      </div>
                    ) : m101Transactions ? (
                      <div className="space-y-2">
                        {m101Transactions.history?.length > 0 ? (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {m101Transactions.history.map((tx: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-xs"
                              >
                                <div>
                                  <div className="font-semibold text-neutral-200 flex items-center gap-1.5">
                                    <span>{tx.title || `تراکنش #${tx.id || idx + 1}`}</span>
                                    {tx.stars && (
                                      <span className="text-[10px] text-amber-400 font-mono">
                                        {tx.stars > 0 ? `+${tx.stars}` : tx.stars} ⭐
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                                    {tx.date ? new Date(tx.date * 1000).toLocaleDateString('fa-IR') : 'نامشخص'}
                                  </div>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                                  tx.refund ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                                }`}>
                                  {tx.refund ? 'مرجوع شده' : 'موفق'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-6 px-4 rounded-xl bg-black/20 border border-dashed border-white/5 text-center text-xs text-neutral-400">
                            هیچ تراکنش ستاره‌ای برای این شناسه ثبت نشده است (Zero Genesis State).
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Honest Empty State */
                      <div className="py-4 px-3 rounded-xl bg-black/20 border border-dashed border-white/5 text-center text-xs text-neutral-500">
                        برای مشاهده تاریخچه و اشتراک‌ها یکی از دکمه‌های بالا را فراخوانی کنید.
                      </div>
                    )}

                    {m101Subscriptions && (
                      <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-xs space-y-1 mt-2">
                        <div className="text-neutral-400 font-medium">وضعیت اشتراک‌های فعال:</div>
                        <div className="text-[11px] font-mono text-purple-300">
                          {m101Subscriptions.subscriptions?.length ?? 0} اشتراک فعال ثبت شده در این اکانت
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === 'unique_giveaways' ? (
                /* Microphase 102: Unique Gifts, Valuation, Transactions By ID, Ref Bots, Prepaid Giveaways & Refunds */
                <div className="space-y-4" dir="rtl">
                  {/* Feedback Banner for Microphase 102 */}
                  {m102Error && (
                    <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-start justify-between gap-3 text-xs text-rose-300">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold">خطا در عملیات ستاره/گیفت نایاب</div>
                          <div className="text-[11px] opacity-80 mt-0.5">{m102Error}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setM102Error(null)}
                        className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[11px] font-medium"
                      >
                        بستن
                      </button>
                    </div>
                  )}

                  {m102SuccessMessage && (
                    <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs text-emerald-300">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{m102SuccessMessage}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setM102SuccessMessage(null)}
                        className="text-emerald-400 hover:underline text-[11px]"
                      >
                        متوجه شدم
                      </button>
                    </div>
                  )}

                  {/* Card 1: Unique Star Gift Valuation & Details */}
                  <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-neutral-200">
                          استعلام گیفت‌های نایاب و ارزش‌گذاری بازار (Unique Gifts & Valuation)
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        payments.getUniqueStarGift / ValueInfo
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={m102Slug}
                        onChange={(e) => setM102Slug(e.target.value)}
                        placeholder="شناسه یا Slug گیفت نایاب (مثال: pepe-101)"
                        className="flex-1 min-w-[200px] px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-amber-400/50"
                      />
                      <button
                        type="button"
                        onClick={loadM102UniqueGift}
                        disabled={m102LoadingOp === 'uniqueGift'}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {m102LoadingOp === 'uniqueGift' ? (
                          <div className="w-3.5 h-3.5 rounded-full border border-amber-400/40 border-t-amber-400 animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                        <span>مشخصات گیفت</span>
                      </button>
                      <button
                        type="button"
                        onClick={loadM102UniqueGiftValueInfo}
                        disabled={m102LoadingOp === 'uniqueValue'}
                        className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {m102LoadingOp === 'uniqueValue' ? (
                          <div className="w-3.5 h-3.5 rounded-full border border-purple-400/40 border-t-purple-400 animate-spin" />
                        ) : (
                          <TrendingUp className="w-3.5 h-3.5" />
                        )}
                        <span>ارزش‌گذاری و قیمت</span>
                      </button>
                    </div>

                    {/* 4-State Display for Unique Gift Info */}
                    {m102LoadingOp === 'uniqueGift' || m102LoadingOp === 'uniqueValue' ? (
                      <div className="flex flex-col items-center justify-center py-6 gap-2 text-xs text-neutral-400">
                        <div className="w-6 h-6 rounded-full border-2 border-amber-500/40 border-t-amber-400 animate-spin" />
                        <span>در حال استعلام اطلاعات گیفت نایاب از سرور تلگرام...</span>
                      </div>
                    ) : m102UniqueGift || m102UniqueValueInfo ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {m102UniqueGift && (
                          <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-2 text-xs">
                            <div className="text-amber-400 font-semibold flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>اطلاعات گیفت نایاب (Unique Gift)</span>
                            </div>
                            <div className="text-[11px] font-mono text-neutral-300 space-y-1">
                              <div>عنوان: {m102UniqueGift.gift?.title || m102UniqueGift.title || m102Slug}</div>
                              <div>شماره نامبر: #{m102UniqueGift.gift?.num || m102UniqueGift.num || '1'}</div>
                              <div>مالک کنونی: {m102UniqueGift.gift?.ownerId || 'ثبت شده'}</div>
                            </div>
                          </div>
                        )}
                        {m102UniqueValueInfo && (
                          <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-2 text-xs">
                            <div className="text-purple-400 font-semibold flex items-center gap-1.5">
                              <Coins className="w-3.5 h-3.5" />
                              <span>ارزش‌گذاری بازار (Value Info)</span>
                            </div>
                            <div className="text-[11px] font-mono text-neutral-300 space-y-1">
                              <div>ارزش تقریبی: {m102UniqueValueInfo.value || m102UniqueValueInfo.estimatedValue || 'محاسبه شده'} ⭐</div>
                              <div>آخرین فروش: {m102UniqueValueInfo.lastSalePrice || 'توافقی'}</div>
                              <div>کارمزد انتقال: {m102UniqueValueInfo.transferStars || 0} ⭐</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-4 px-3 rounded-xl bg-black/20 border border-dashed border-white/5 text-center text-xs text-neutral-500">
                        برای مشاهده متادیتا و ارزش‌گذاری گیفت نایاب، Slug آن را وارد و یکی از دکمه‌ها را فراخوانی کنید.
                      </div>
                    )}
                  </div>

                  {/* Card 2: Transactions By ID & Suggested Referral Bots */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Subcard 2A: Transactions By ID */}
                    <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-neutral-200">
                          تراکنش‌ها بر اساس شناسه (Tx By ID)
                        </span>
                      </div>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={m102TxIds}
                          onChange={(e) => setM102TxIds(e.target.value)}
                          placeholder="شناسه‌ها با کاما (مثال: tx101, tx102)"
                          className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-cyan-400/50"
                        />
                        <button
                          type="button"
                          onClick={loadM102TransactionsByID}
                          disabled={m102LoadingOp === 'txById'}
                          className="w-full py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {m102LoadingOp === 'txById' ? (
                            <div className="w-3.5 h-3.5 rounded-full border border-cyan-400/40 border-t-cyan-400 animate-spin" />
                          ) : (
                            <Search className="w-3.5 h-3.5" />
                          )}
                          <span>استعلام تراکنش‌های خاص</span>
                        </button>
                      </div>

                      {m102TxData && (
                        <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-[11px] font-mono text-neutral-300 max-h-36 overflow-y-auto">
                          {m102TxData.transactions?.length > 0 ? (
                            m102TxData.transactions.map((tx: any, i: number) => (
                              <div key={i} className="py-1 border-b border-white/5 last:border-none flex justify-between">
                                <span>{tx.id || `تراکنش #${i + 1}`}</span>
                                <span className="text-amber-400">{tx.stars || 0} ⭐</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-neutral-500 text-center py-2">هیچ تراکنشی یافت نشد.</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Subcard 2B: Suggested Referral Bots */}
                    <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-3">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-neutral-200">
                          بات‌های رفرال ستاره (Suggested Ref Bots)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={loadM102SuggestedStarRefBots}
                        disabled={m102LoadingOp === 'refBots'}
                        className="w-full py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {m102LoadingOp === 'refBots' ? (
                          <div className="w-3.5 h-3.5 rounded-full border border-emerald-400/40 border-t-emerald-400 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        <span>دریافت لیست بات‌های پیشنهادی</span>
                      </button>

                      {m102RefBots && (
                        <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-[11px] font-mono text-neutral-300 max-h-36 overflow-y-auto">
                          {m102RefBots.bots?.length > 0 ? (
                            m102RefBots.bots.map((b: any, i: number) => (
                              <div key={i} className="py-1 border-b border-white/5 last:border-none flex justify-between">
                                <span>{b.title || b.username || `Bot #${i + 1}`}</span>
                                <span className="text-emerald-400">{b.commission || 0}% پورسانت</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-neutral-500 text-center py-2">بات پیشنهادی یافت نشد (Genesis State).</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 3: Prepaid Giveaways, Star Refund & Reordering */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Launch Prepaid Giveaway */}
                    <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-200">
                        <Gift className="w-3.5 h-3.5 text-amber-400" />
                        <span>قرعه‌کشی از پیش‌پرداخت‌شده</span>
                      </div>
                      <input
                        type="text"
                        value={m102GiveawayId}
                        onChange={(e) => setM102GiveawayId(e.target.value)}
                        placeholder="شناسه قرعه‌کشی (Giveaway ID)"
                        className="w-full px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={launchM102PrepaidGiveaway}
                        disabled={m102LoadingOp === 'giveaway'}
                        className="w-full py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <span>راه‌اندازی قرعه‌کشی</span>
                      </button>
                    </div>

                    {/* Refund Stars Charge */}
                    <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-200">
                        <Wallet className="w-3.5 h-3.5 text-rose-400" />
                        <span>استرداد ستاره (Refund)</span>
                      </div>
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={m102RefundUserId}
                          onChange={(e) => setM102RefundUserId(e.target.value)}
                          placeholder="شناسه کاربر (User ID)"
                          className="w-full px-2 py-1 rounded-xl bg-black/40 border border-white/10 text-[11px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={m102RefundChargeId}
                          onChange={(e) => setM102RefundChargeId(e.target.value)}
                          placeholder="شناسه شارژ (Charge ID)"
                          className="w-full px-2 py-1 rounded-xl bg-black/40 border border-white/10 text-[11px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={submitM102RefundStarsCharge}
                        disabled={m102LoadingOp === 'refund'}
                        className="w-full py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <span>استرداد وجه ستاره</span>
                      </button>
                    </div>

                    {/* Reorder Star Gift Collections */}
                    <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-200">
                        <Layers className="w-3.5 h-3.5 text-purple-400" />
                        <span>چینش کالکشن‌ها</span>
                      </div>
                      <input
                        type="text"
                        value={m102ReorderList}
                        onChange={(e) => setM102ReorderList(e.target.value)}
                        placeholder="ترتیب کالکشن‌ها (مثال: 0, 1, 2)"
                        className="w-full px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={submitM102ReorderStarGiftCollections}
                        disabled={m102LoadingOp === 'reorder'}
                        className="w-full py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <span>ذخیره چینش جدید</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Editorial Footer */}
            <div className="p-4 bg-neutral-900 border-t border-white/5 flex items-center justify-between text-xs text-neutral-400">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-[11px]">
                  {activeTab === 'saved'
                    ? 'Telegram MTProto payments.getSavedStarGifts'
                    : activeTab === 'catalog'
                    ? 'Telegram MTProto payments.getStarGifts'
                    : activeTab === 'auctions'
                    ? 'Telegram MTProto payments.getStarGiftActiveAuctions & Resale'
                    : activeTab === 'upgrades'
                    ? 'Telegram MTProto payments.getStarGiftCollections, Upgrades & Giveaways'
                    : activeTab === 'unique_giveaways'
                    ? 'Telegram MTProto payments.getUniqueStarGift, TransactionsByID, RefBots & Giveaways'
                    : 'Telegram MTProto payments.getStarsStatus, RevenueStats, TopupOptions & Transactions'}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
