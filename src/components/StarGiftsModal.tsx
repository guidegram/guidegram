import React, { useState, useEffect } from 'react'
import { Gift, Sparkles, X, Star, Calendar, User, EyeOff, ShoppingBag, ShieldCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { StarGiftItem } from '../types/telegram'
import { useI18n } from '../i18n'
import { isRTL, formatNumber } from '../utils/textUtils'

interface StarGiftsModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  userName?: string
}

export const StarGiftsModal: React.FC<StarGiftsModalProps> = ({
  isOpen,
  onClose,
  accountId,
  userName,
}) => {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<'saved' | 'catalog'>('saved')
  const [savedGifts, setSavedGifts] = useState<StarGiftItem[]>([])
  const [catalogGifts, setCatalogGifts] = useState<StarGiftItem[]>([])
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [loadingCatalog, setLoadingCatalog] = useState(false)

  // 1. Fetch Saved Gifts
  useEffect(() => {
    if (!isOpen || !accountId) return
    let isMounted = true
    setLoadingSaved(true)

    if (window.guidegram?.getSavedStarGifts) {
      window.guidegram
        .getSavedStarGifts(accountId)
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
  }, [isOpen, accountId])

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

  if (!isOpen) return null

  const totalSavedStars = savedGifts.reduce((acc, g) => acc + (g.stars || 0), 0)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 12 }}
        transition={{ type: 'spring', damping: 26, stiffness: 360 }}
        className="w-full max-w-lg bg-dark-850/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-amber-500/15 via-dark-800 to-amber-600/10 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-glow">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Telegram Star Gifts</h3>
                {activeTab === 'saved' && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{formatNumber(totalSavedStars)} Stars</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {activeTab === 'saved'
                  ? userName ? `Saved Gifts for ${userName}` : 'Gifts received on Telegram'
                  : 'Official Telegram Star Gifts Catalog'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-5 pt-3 pb-0 bg-dark-900/60 border-b border-white/5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'saved'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Profile Shelf ({savedGifts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Gift Catalog</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {activeTab === 'saved' ? (
            loadingSaved ? (
              <div className="flex flex-col items-center justify-center py-12 text-xs text-gray-400 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500/40 border-t-amber-400 animate-spin" />
                <span>Loading saved gifts...</span>
              </div>
            ) : savedGifts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400/80 mb-3">
                  <Gift className="w-8 h-8" />
                </div>
                <div className="text-sm font-bold text-gray-200">No Star Gifts Yet</div>
                <p className="text-xs text-gray-400 max-w-xs mt-1 leading-relaxed">
                  Unique gifts received from friends and channels with Telegram Stars will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedGifts.map((gift, idx) => (
                  <div
                    key={gift.id || idx}
                    className="p-3.5 rounded-2xl bg-dark-800/80 hover:bg-dark-800 border border-white/5 hover:border-amber-500/30 transition-all flex flex-col justify-between gap-2.5 shadow-sm group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                          🎁
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-100">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                            <span>{gift.stars} Stars</span>
                          </div>
                          {gift.convertStars && (
                            <div className="text-[10px] text-gray-400">
                              Convertible: {gift.convertStars} ⭐
                            </div>
                          )}
                        </div>
                      </div>

                      {gift.isSaved && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                          Profile Shelf
                        </span>
                      )}
                    </div>

                    {gift.message && (
                      <div
                        dir={isRTL(gift.message) ? 'rtl' : 'ltr'}
                        className="text-xs text-gray-200 italic bg-black/25 p-2 rounded-xl border border-white/5 leading-snug"
                      >
                        "{gift.message}"
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-white/5">
                      <div className="flex items-center gap-1">
                        {gift.isAnonymous ? (
                          <>
                            <EyeOff className="w-3 h-3 text-gray-500" />
                            <span>Anonymous</span>
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3 text-gray-500" />
                            <span className="truncate max-w-[110px] font-medium text-gray-300">
                              {gift.fromName || 'Friend'}
                            </span>
                          </>
                        )}
                      </div>
                      {gift.date && (
                        <span>{new Date(gift.date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Catalog Tab */
            loadingCatalog ? (
              <div className="flex flex-col items-center justify-center py-12 text-xs text-gray-400 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500/40 border-t-amber-400 animate-spin" />
                <span>Loading gift catalog...</span>
              </div>
            ) : catalogGifts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400/80 mb-3">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div className="text-sm font-bold text-gray-200">Catalog Unavailable</div>
                <p className="text-xs text-gray-400 max-w-xs mt-1 leading-relaxed">
                  No active gifts currently listed by Telegram in this region.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {catalogGifts.map((gift, idx) => (
                  <div
                    key={gift.id || idx}
                    className="p-3.5 rounded-2xl bg-dark-800/80 hover:bg-dark-800 border border-white/5 hover:border-amber-500/30 transition-all flex flex-col justify-between gap-2.5 shadow-sm group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                          ✨
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-100 truncate max-w-[120px]">
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
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>Remaining</span>
                          <span>{formatNumber(gift.availabilityRemains)} / {formatNumber(gift.availabilityTotal)}</span>
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

                    <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-white/5">
                      <span>Convertible: {gift.convertStars || gift.stars} ⭐</span>
                      <span className="text-amber-400 font-medium">MTProto payments</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-dark-900 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {activeTab === 'saved'
                ? 'Telegram MTProto payments.getSavedStarGifts'
                : 'Telegram MTProto payments.getStarGifts'}
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
      </motion.div>
    </motion.div>
  )
}
