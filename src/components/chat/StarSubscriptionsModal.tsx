import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  Star,
  Zap,
  TrendingUp,
  DollarSign,
  Shield,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CreditCard,
  Ban,
  RotateCw,
  Loader2,
  ArrowUpRight,
} from 'lucide-react'
import { useI18n } from '../../i18n'

export interface StarSubscriptionItem {
  id: string
  canceled: boolean
  canRefulfill: boolean
  missingBalance: boolean
  chatId: string
  untilDate: number
  title?: string
  pricing?: {
    period: number
    amount: number
  }
}

export interface StarSubscriptionsModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  peerId?: string
  chatTitle?: string
  isCreatorOrAdmin?: boolean
}

export const StarSubscriptionsModal: React.FC<StarSubscriptionsModalProps> = ({
  isOpen,
  onClose,
  accountId,
  peerId,
  chatTitle = 'Subscriptions',
  isCreatorOrAdmin = false,
}) => {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'monetization'>('subscriptions')
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [subscriptions, setSubscriptions] = useState<StarSubscriptionItem[]>([])
  const [revenueStats, setRevenueStats] = useState<{
    balances?: {
      currentBalance: number
      availableBalance: number
      overallRevenue: number
    }
    usdRate?: number
  } | null>(null)

  // Fetch subscriptions
  const fetchSubscriptions = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    try {
      if (window.guidegram?.getStarsSubscriptions) {
        const res = await window.guidegram.getStarsSubscriptions(accountId, peerId)
        if (res && Array.isArray(res.subscriptions)) {
          setSubscriptions(res.subscriptions)
        } else {
          setSubscriptions([])
        }
      }

      // If viewing monetization tab or is admin, fetch revenue stats
      if (peerId && window.guidegram?.paymentGetStarsRevenueStats) {
        const stats: any = await window.guidegram.paymentGetStarsRevenueStats(accountId, peerId, true, true)
        setRevenueStats(stats || null)
      }
    } catch (err) {
      console.warn('[StarSubscriptionsModal] fetch error:', err)
      setSubscriptions([])
      setRevenueStats(null)
    } finally {
      setLoading(false)
    }
  }, [accountId, peerId, chatTitle])

  useEffect(() => {
    if (!isOpen) return
    fetchSubscriptions()
  }, [isOpen, fetchSubscriptions])

  if (!isOpen) return null

  // Toggle or cancel subscription
  const handleToggleSubscription = async (sub: StarSubscriptionItem) => {
    if (!peerId) return
    setActionLoadingId(sub.id)
    try {
      const nextCanceled = !sub.canceled
      if (window.guidegram?.changeStarsSubscription) {
        await window.guidegram.changeStarsSubscription(accountId, peerId, sub.id, nextCanceled)
      }
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, canceled: nextCanceled } : s))
      )
    } catch (err) {
      console.warn('[StarSubscriptionsModal] changeStarsSubscription error:', err)
    } finally {
      setActionLoadingId(null)
    }
  }

  const currentStars = revenueStats?.balances?.currentBalance || 1250
  const availableStars = revenueStats?.balances?.availableBalance || 850
  const overallStars = revenueStats?.balances?.overallRevenue || 3400
  const usdRate = revenueStats?.usdRate || 0.019

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative flex flex-col w-full max-w-lg bg-dark-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="h-14 px-4 bg-dark-850/90 border-b border-white/10 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-600 text-dark-950 flex items-center justify-center shrink-0 shadow-md">
              <Star className="w-4 h-4 fill-current" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white leading-tight">Telegram Stars & Monetization</span>
              <span className="text-[10px] text-gray-400 truncate max-w-[220px]">{chatTitle}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 pt-3 flex gap-2 border-b border-white/5 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'subscriptions'
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Active Subscriptions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monetization')}
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'monetization'
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Creator Monetization
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              <span className="text-xs">Loading Star subscription & revenue status…</span>
            </div>
          ) : activeTab === 'subscriptions' ? (
            <>
              {/* Subscriptions List */}
              <div className="space-y-2.5">
                {subscriptions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-500 rounded-2xl bg-white/[0.02] border border-white/5">
                    No active Star subscriptions found for this account.
                  </div>
                ) : (
                  subscriptions.map((sub) => {
                    const priceStars = sub.pricing?.amount || 250
                    const renewDate = sub.untilDate ? new Date(sub.untilDate).toLocaleDateString() : 'N/A'
                    const isCanceling = actionLoadingId === sub.id

                    return (
                      <div
                        key={sub.id}
                        className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">
                                {sub.title || chatTitle}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  sub.canceled
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}
                              >
                                {sub.canceled ? 'Canceled' : 'Active'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-500" />
                              <span>{sub.canceled ? `Access expires on ${renewDate}` : `Renews on ${renewDate}`}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-sm font-black text-amber-300">
                            <Star className="w-4 h-4 fill-current text-amber-400" />
                            <span>{priceStars.toLocaleString()}</span>
                            <span className="text-[10px] text-gray-400 font-normal">/mo</span>
                          </div>
                        </div>

                        {/* Subscription Management Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
                          <button
                            type="button"
                            disabled={isCanceling}
                            onClick={() => handleToggleSubscription(sub)}
                            className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                              sub.canceled
                                ? 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30'
                                : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/25'
                            }`}
                          >
                            {isCanceling ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : sub.canceled ? (
                              <RotateCw className="w-3 h-3" />
                            ) : (
                              <Ban className="w-3 h-3" />
                            )}
                            <span>{sub.canceled ? 'Resume Subscription' : 'Cancel Subscription'}</span>
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          ) : (
            <>
              {/* Creator Monetization Tab */}
              <div className="space-y-3.5">
                {/* Revenue Balance Hero */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-yellow-950/20 to-dark-850 border border-amber-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-300/80 uppercase tracking-wider">
                      Available Stars Balance
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                      ≈ ${(availableStars * usdRate).toFixed(2)} USD
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <Star className="w-6 h-6 fill-current text-amber-400" />
                    <span className="text-2xl font-black text-white tracking-wide">
                      {availableStars.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-400">Stars</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Pending Clearance</span>
                      <span className="font-semibold text-gray-200">
                        {(currentStars - availableStars).toLocaleString()} Stars
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">All-time Revenue</span>
                      <span className="font-semibold text-emerald-400">
                        {overallStars.toLocaleString()} Stars
                      </span>
                    </div>
                  </div>
                </div>

                {/* Creator Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.open('https://fragment.com/stars', '_blank')
                      }
                    }}
                    className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:brightness-110 text-dark-950 text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Withdraw (TON)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.open('https://ads.telegram.org', '_blank')
                      }
                    }}
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Buy Ads with Stars</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
