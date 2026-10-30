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
  const [activeTab, setActiveTab] = useState<'saved' | 'catalog'>('saved')
  const [savedGifts, setSavedGifts] = useState<StarGiftItem[]>([])
  const [catalogGifts, setCatalogGifts] = useState<StarGiftItem[]>([])
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [loadingCatalog, setLoadingCatalog] = useState(false)

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
              ) : (
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
              )}
            </div>

            {/* Editorial Footer */}
            <div className="p-4 bg-neutral-900 border-t border-white/5 flex items-center justify-between text-xs text-neutral-400">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-[11px]">
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
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
