import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Smile, X, Layers, RefreshCw } from 'lucide-react'
import { StickerSetItem, StickerItem } from '../types/telegram'
import lottie from 'lottie-web'

interface StickerPickerDrawerProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  chatId: string
  onSelectSticker: (sticker: StickerItem) => void
}

// Single Sticker Preview with animated Lottie or WebP
const StickerThumbnail: React.FC<{
  accountId: string
  sticker: StickerItem
  onClick: () => void
}> = ({ accountId, sticker, onClick }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    let animItem: any = null
    if (!window.guidegram?.getStickerData) return

    window.guidegram
      .getStickerData(accountId, sticker.id, sticker.accessHash, sticker.fileReferenceHex)
      .then((res: any) => {
        if (!active || !res) return
        if (typeof res === 'string') {
          setDataUrl(res)
        } else if (res.format === 'lottie' && res.data && containerRef.current) {
          try {
            containerRef.current.innerHTML = ''
            animItem = lottie.loadAnimation({
              container: containerRef.current,
              renderer: 'svg',
              loop: true,
              autoplay: true,
              animationData: res.data,
            })
          } catch (_) {}
        } else if (res.url) {
          setDataUrl(res.url)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      if (animItem) {
        animItem.destroy()
      }
    }
  }, [accountId, sticker.id, sticker.accessHash])

  return (
    <motion.button
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 450, damping: 22 }}
      type="button"
      onClick={onClick}
      className="w-16 h-16 sm:w-18 sm:h-18 p-1.5 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer group relative shrink-0"
      title={sticker.emoticon ? `${sticker.emoticon} (Click to send)` : 'Click to send'}
    >
      {sticker.isAnimated ? (
        <div ref={containerRef} className="w-full h-full object-contain pointer-events-none" />
      ) : dataUrl ? (
        <img
          src={dataUrl}
          alt={sticker.emoticon || 'sticker'}
          className="w-full h-full object-contain pointer-events-none group-hover:scale-105 transition-transform"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xl select-none">
          {loading ? (
            <div className="w-4 h-4 rounded-full border-2 border-primary-400 border-t-transparent animate-spin" />
          ) : (
            sticker.emoticon || '⭐'
          )}
        </div>
      )}
      {sticker.emoticon && (
        <span className="absolute bottom-1 right-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 px-1 rounded">
          {sticker.emoticon}
        </span>
      )}
    </motion.button>
  )
}

export const StickerPickerDrawer: React.FC<StickerPickerDrawerProps> = ({
  isOpen,
  onClose,
  accountId,
  onSelectSticker,
}) => {
  const [sets, setSets] = useState<StickerSetItem[]>([])
  const [activeSetId, setActiveSetId] = useState<string | null>(null)
  const [cachedSetDetails, setCachedSetDetails] = useState<Record<string, StickerSetItem>>({})
  const [loadingSets, setLoadingSets] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Load installed sticker packs
  useEffect(() => {
    if (!isOpen || !accountId) return
    setLoadingSets(true)
    if (window.guidegram?.getInstalledStickerSets) {
      window.guidegram
        .getInstalledStickerSets(accountId)
        .then((list) => {
          setSets(list || [])
          if (list && list.length > 0 && !activeSetId) {
            setActiveSetId(list[0].id)
          }
        })
        .catch(() => {})
        .finally(() => setLoadingSets(false))
    }
  }, [isOpen, accountId])

  // Load active pack stickers
  useEffect(() => {
    if (!isOpen || !accountId || !activeSetId) return
    if (cachedSetDetails[activeSetId]) return

    const targetSet = sets.find((s) => s.id === activeSetId)
    if (!targetSet) return

    setLoadingDetails(true)
    if (window.guidegram?.getStickerSet) {
      window.guidegram
        .getStickerSet(accountId, targetSet.id, targetSet.accessHash)
        .then((detailed) => {
          if (detailed) {
            setCachedSetDetails((prev) => ({ ...prev, [activeSetId]: detailed }))
          }
        })
        .catch(() => {})
        .finally(() => setLoadingDetails(false))
    }
  }, [isOpen, accountId, activeSetId, sets])

  if (!isOpen) return null

  const activeSet = sets.find((s) => s.id === activeSetId)
  const activeDetails = activeSetId ? cachedSetDetails[activeSetId] : null
  const currentStickers = activeDetails?.stickers || []

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 16 }}
      transition={{ type: 'spring', damping: 25, stiffness: 380 }}
      className="absolute bottom-16 left-4 z-40 w-80 sm:w-96 max-h-[380px] rounded-2xl bg-dark-900/95 border border-white/10 shadow-2xl backdrop-blur-md flex flex-col overflow-hidden select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between bg-dark-850/80">
        <div className="flex items-center gap-2">
          <Smile className="w-4 h-4 text-accent-cyan" />
          <span className="text-xs font-semibold text-white truncate max-w-[200px]">
            {activeSet?.title || 'Sticker Packs'}
          </span>
          {activeSet && (
            <span className="text-[10px] text-gray-400">({activeSet.count})</span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Stickers Grid */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-4 sm:grid-cols-5 gap-1.5 justify-items-center scrollbar-thin">
        {loadingDetails ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center gap-2 text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin text-accent-cyan" />
            <span className="text-xs">Loading stickers...</span>
          </div>
        ) : currentStickers.length > 0 ? (
          currentStickers.map((stk) => (
            <StickerThumbnail
              key={stk.id}
              accountId={accountId}
              sticker={stk}
              onClick={() => {
                onSelectSticker(stk)
                onClose()
              }}
            />
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-xs text-gray-500">
            {loadingSets ? 'Fetching sticker sets...' : 'No stickers in this pack.'}
          </div>
        )}
      </div>

      {/* Bottom Tabs for Installed Packs */}
      {sets.length > 0 && (
        <div className="p-2 border-t border-white/5 bg-dark-950 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {sets.map((set) => {
            const isSelected = set.id === activeSetId
            const thumbUrl = set.thumbnailUrl || cachedSetDetails[set.id]?.thumbnailUrl || cachedSetDetails[set.id]?.stickers?.[0]?.thumbnailUrl
            return (
              <button
                key={set.id}
                type="button"
                onClick={() => setActiveSetId(set.id)}
                className={`h-9 w-9 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0 overflow-hidden relative border ${
                  isSelected
                    ? 'bg-accent-cyan/20 border-accent-cyan/60 shadow-sm shadow-accent-cyan/20 scale-105'
                    : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                }`}
                title={set.title}
              >
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={set.title}
                    className="w-7 h-7 object-contain rounded"
                    loading="lazy"
                  />
                ) : (
                  <Layers className="w-4 h-4 text-gray-400" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
