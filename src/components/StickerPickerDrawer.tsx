import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Smile,
  X,
  Layers,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  CheckCircle2,
  Move,
  Tag,
  Sparkles,
  SlidersHorizontal,
  Search,
  Edit3,
  Image as ImageIcon,
  Repeat,
  Wand2,
} from 'lucide-react'
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
    const api = (window as any).guidegramAPI || (window as any).guidegram
    if (!api?.getStickerData) return

    api
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

  // Microphase 105: Stickers Domain Suite Part 1 States
  const [mode, setMode] = useState<'picker' | 'studio'>('picker')
  const [studioTab, setStudioTab] = useState<'create' | 'manage'>('create')

  // Create Pack States (stickers.createStickerSet & stickers.checkShortName)
  const [createTitle, setCreateTitle] = useState('')
  const [createShortName, setCreateShortName] = useState('')
  const [shortNameStatus, setShortNameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle')
  const [createEmojis, setCreateEmojis] = useState(false)
  const [createMasks, setCreateMasks] = useState(false)
  const [createDocId, setCreateDocId] = useState('')
  const [createEmoji, setCreateEmoji] = useState('⭐')

  // Manage Active Pack States (add, change, position, remove, delete)
  const [addDocId, setAddDocId] = useState('')
  const [addEmoji, setAddEmoji] = useState('⭐')
  const [addKeywords, setAddKeywords] = useState('')

  const [changeDocId, setChangeDocId] = useState('')
  const [changeEmoji, setChangeEmoji] = useState('')
  const [changeKeywords, setChangeKeywords] = useState('')

  const [posDocId, setPosDocId] = useState('')
  const [posIndex, setPosIndex] = useState('0')

  const [removeDocId, setRemoveDocId] = useState('')

  // Microphase 106: Stickers Domain Suite Part 2 States
  const [renameTitle, setRenameTitle] = useState('')
  const [suggestingShortName, setSuggestingShortName] = useState(false)
  const [thumbDocId, setThumbDocId] = useState('')
  const [replaceOldDocId, setReplaceOldDocId] = useState('')
  const [replaceNewDocId, setReplaceNewDocId] = useState('')
  const [replaceEmoji, setReplaceEmoji] = useState('⭐')

  // UI Feedback States
  const [loadingOp, setLoadingOp] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [lastOpResult, setLastOpResult] = useState<any | null>(null)

  const api = (window as any).guidegramAPI || (window as any).guidegram

  // Load installed sticker packs
  const loadInstalledSets = () => {
    if (!accountId) return
    setLoadingSets(true)
    if (api?.getInstalledStickerSets) {
      api
        .getInstalledStickerSets(accountId)
        .then((list: StickerSetItem[]) => {
          setSets(list || [])
          if (list && list.length > 0 && !activeSetId) {
            setActiveSetId(list[0].id)
          }
        })
        .catch(() => {})
        .finally(() => setLoadingSets(false))
    }
  }

  useEffect(() => {
    if (!isOpen || !accountId) return
    loadInstalledSets()
  }, [isOpen, accountId])

  // Load active pack stickers
  useEffect(() => {
    if (!isOpen || !accountId || !activeSetId) return
    if (cachedSetDetails[activeSetId]) return

    const targetSet = sets.find((s) => s.id === activeSetId)
    if (!targetSet) return

    setLoadingDetails(true)
    if (api?.getStickerSet) {
      api
        .getStickerSet(accountId, targetSet.id, targetSet.accessHash)
        .then((detailed: StickerSetItem) => {
          if (detailed) {
            setCachedSetDetails((prev) => ({ ...prev, [activeSetId]: detailed }))
          }
        })
        .catch(() => {})
        .finally(() => setLoadingDetails(false))
    }
  }, [isOpen, accountId, activeSetId, sets])

  // Microphase 105: 1. Check Short Name (stickers.checkShortName)
  const handleCheckShortName = async () => {
    if (!accountId || !createShortName.trim()) {
      setErrorMsg('لطفاً نام کوتاه استیکر را وارد کنید')
      return
    }
    setShortNameStatus('checking')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.stickersCheckShortNameRaw?.(accountId, {
        shortName: createShortName.trim(),
      })
      if (res === true || res?._ === 'boolTrue') {
        setShortNameStatus('available')
        setSuccessMsg(`نام کوتاه "${createShortName}" آزاد و معتبر است.`)
      } else {
        setShortNameStatus('taken')
        setErrorMsg(`نام کوتاه "${createShortName}" قبلاً ثبت شده یا نامعتبر است.`)
      }
    } catch (err: any) {
      console.warn('[StickerPickerDrawer] checkShortName error:', err)
      setShortNameStatus('error')
      setErrorMsg(err?.message || 'خطا در استعلام نام کوتاه استیکر')
    }
  }

  // Microphase 106: 1. Suggest Short Name (stickers.suggestShortName)
  const handleSuggestShortName = async () => {
    if (!accountId || !createTitle.trim()) {
      setErrorMsg('برای پیشنهاد نام کوتاه، لطفاً ابتدا عنوان پَک را وارد کنید')
      return
    }
    setSuggestingShortName(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.stickersSuggestShortNameRaw?.(accountId, {
        title: createTitle.trim(),
      })
      const suggested = res?.shortName || res?.short_name || (typeof res === 'string' ? res : '')
      if (suggested) {
        setCreateShortName(suggested)
        setShortNameStatus('available')
        setSuccessMsg(`نام کوتاه پیشنهادی تلگرام: "${suggested}"`)
      } else {
        setSuccessMsg('نام کوتاهی از سوی تلگرام پیشنهاد نشد؛ نام دستی وارد کنید')
      }
    } catch (err: any) {
      console.warn('[StickerPickerDrawer] suggestShortName error:', err)
      setErrorMsg(err?.message || 'خطا در دریافت نام کوتاه پیشنهادی')
    } finally {
      setSuggestingShortName(false)
    }
  }

  // Microphase 105: 2. Create Sticker Set (stickers.createStickerSet)
  const handleCreateStickerSet = async () => {
    if (!accountId || !createTitle.trim() || !createShortName.trim()) {
      setErrorMsg('عنوان و نام کوتاه پَک الزامی است')
      return
    }
    setLoadingOp('create_set')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      let stickersList: any[] = []
      if (createDocId.trim()) {
        stickersList = [
          {
            document: { id: BigInt(createDocId.trim()) },
            emoji: createEmoji.trim() || '⭐',
          },
        ]
      }
      const res = await api?.stickersCreateStickerSetRaw?.(accountId, {
        title: createTitle.trim(),
        shortName: createShortName.trim(),
        emojis: createEmojis,
        masks: createMasks,
        stickers: stickersList,
      })
      setLastOpResult(res)
      setSuccessMsg(`پَک استیکر "${createTitle}" با موفقیت ایجاد شد (stickers.createStickerSet)`)
      loadInstalledSets()
    } catch (err: any) {
      console.warn('[StickerPickerDrawer] createStickerSet error:', err)
      setErrorMsg(err?.message || 'خطا در ایجاد پَک استیکر')
    } finally {
      setLoadingOp(null)
    }
  }

  // Active target set identifier
  const activeSet = sets.find((s) => s.id === activeSetId)
  const activeSetTarget = activeSet ? { id: activeSet.id, accessHash: activeSet.accessHash } : null

  // Microphase 105: 3. Add Sticker To Set (stickers.addStickerToSet)
  const handleAddSticker = async () => {
    if (!accountId || !activeSetTarget || !addDocId.trim()) {
      setErrorMsg('انتخاب پَک فعال و شناسه سند (Document ID) استیکر الزامی است')
      return
    }
    setLoadingOp('add_sticker')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.stickersAddStickerToSetRaw?.(accountId, {
        stickerset: activeSetTarget,
        sticker: {
          document: { id: BigInt(addDocId.trim()) },
          emoji: addEmoji.trim() || '⭐',
          keywords: addKeywords.trim() || undefined,
        },
      })
      setLastOpResult(res)
      setSuccessMsg('استیکر جدید با موفقیت به پَک اضافه شد (stickers.addStickerToSet)')
      if (activeSetId) {
        setCachedSetDetails((prev) => {
          const next = { ...prev }
          delete next[activeSetId]
          return next
        })
      }
    } catch (err: any) {
      console.warn('[StickerPickerDrawer] addSticker error:', err)
      setErrorMsg(err?.message || 'خطا در افزودن استیکر به پَک')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 105: 4. Change Sticker (stickers.changeSticker)
  const handleChangeSticker = async () => {
    if (!accountId || !changeDocId.trim()) {
      setErrorMsg('شناسه سند استیکر (Document ID) الزامی است')
      return
    }
    setLoadingOp('change_sticker')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.stickersChangeStickerRaw?.(accountId, {
        sticker: { id: BigInt(changeDocId.trim()) },
        emoji: changeEmoji.trim() || undefined,
        keywords: changeKeywords.trim() || undefined,
      })
      setLastOpResult(res)
      setSuccessMsg('مشخصات و ایموجی استیکر بروزرسانی شد (stickers.changeSticker)')
    } catch (err: any) {
      console.warn('[StickerPickerDrawer] changeSticker error:', err)
      setErrorMsg(err?.message || 'خطا در ویرایش استیکر')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 105: 5. Change Sticker Position (stickers.changeStickerPosition)
  const handleChangePosition = async () => {
    if (!accountId || !posDocId.trim()) {
      setErrorMsg('شناسه سند استیکر الزامی است')
      return
    }
    setLoadingOp('change_position')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.stickersChangeStickerPositionRaw?.(accountId, {
        sticker: { id: BigInt(posDocId.trim()) },
        position: Number(posIndex) || 0,
      })
      setLastOpResult(res)
      setSuccessMsg('موقعیت استیکر با موفقیت جابجا شد (stickers.changeStickerPosition)')
    } catch (err: any) {
      console.warn('[StickerPickerDrawer] changePosition error:', err)
      setErrorMsg(err?.message || 'خطا در تغییر موقعیت استیکر')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 105: 6. Remove Sticker From Set (stickers.removeStickerFromSet)
  const handleRemoveSticker = async () => {
    if (!accountId || !removeDocId.trim()) {
      setErrorMsg('شناسه سند استیکر الزامی است')
      return
    }
    setLoadingOp('remove_sticker')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.stickersRemoveStickerFromSetRaw?.(accountId, {
        sticker: { id: BigInt(removeDocId.trim()) },
      })
      setLastOpResult(res)
      setSuccessMsg('استیکر با موفقیت از پَک حذف شد (stickers.removeStickerFromSet)')
      if (activeSetId) {
        setCachedSetDetails((prev) => {
          const next = { ...prev }
          delete next[activeSetId]
          return next
        })
      }
    } catch (err: any) {
      console.warn('[StickerPickerDrawer] removeSticker error:', err)
      setErrorMsg(err?.message || 'خطا در حذف استیکر')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 105: 7. Delete Sticker Set (stickers.deleteStickerSet)
  const handleDeleteStickerSet = async () => {
    if (!accountId || !activeSetTarget) {
      setErrorMsg('پَک استیکری برای حذف انتخاب نشده است')
      return
    }
    setLoadingOp('delete_set')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.stickersDeleteStickerSetRaw?.(accountId, {
        stickerset: activeSetTarget,
      })
      setLastOpResult(res)
      setSuccessMsg(`پَک استیکر "${activeSet?.title}" حذف شد (stickers.deleteStickerSet)`)
      loadInstalledSets()
      setActiveSetId(null)
    } catch (err: any) {
      console.warn('[StickerPickerDrawer] deleteStickerSet error:', err)
      setErrorMsg(err?.message || 'خطا در حذف پَک استیکر')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 106: 2. Rename Sticker Set (stickers.renameStickerSet)
  const handleRenameStickerSet = async () => {
    if (!accountId || !activeSetTarget || !renameTitle.trim()) {
      setErrorMsg('انتخاب پَک فعال و عنوان جدید الزامی است')
      return
    }
    setLoadingOp('rename_set')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.stickersRenameStickerSetRaw?.(accountId, {
        stickerset: activeSetTarget,
        title: renameTitle.trim(),
      })
      setLastOpResult(res)
      setSuccessMsg(`عنوان پَک به "${renameTitle.trim()}" تغییر یافت (stickers.renameStickerSet)`)
      loadInstalledSets()
      setRenameTitle('')
    } catch (err: any) {
      console.warn('[StickerPickerDrawer] renameStickerSet error:', err)
      setErrorMsg(err?.message || 'خطا در تغییر نام پَک استیکر')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 106: 3. Set Sticker Set Thumb (stickers.setStickerSetThumb)
  const handleSetStickerSetThumb = async () => {
    if (!accountId || !activeSetTarget || !thumbDocId.trim()) {
      setErrorMsg('انتخاب پَک فعال و شناسه سند کاور (Doc ID) الزامی است')
      return
    }
    setLoadingOp('set_thumb')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.stickersSetStickerSetThumbRaw?.(accountId, {
        stickerset: activeSetTarget,
        thumb: { id: BigInt(thumbDocId.trim()) },
      })
      setLastOpResult(res)
      setSuccessMsg('کاور/بندانگشتی پَک استیکر با موفقیت بروز شد (stickers.setStickerSetThumb)')
      loadInstalledSets()
      setThumbDocId('')
    } catch (err: any) {
      console.warn('[StickerPickerDrawer] setStickerSetThumb error:', err)
      setErrorMsg(err?.message || 'خطا در تنظیم کاور پَک استیکر')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 106: 4. Replace Sticker (stickers.replaceSticker)
  const handleReplaceSticker = async () => {
    if (!accountId || !replaceOldDocId.trim() || !replaceNewDocId.trim()) {
      setErrorMsg('شناسه استیکر فعلی و استیکر جایگزین هر دو الزامی هستند')
      return
    }
    setLoadingOp('replace_sticker')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.stickersReplaceStickerRaw?.(accountId, {
        sticker: { id: BigInt(replaceOldDocId.trim()) },
        newSticker: {
          document: { id: BigInt(replaceNewDocId.trim()) },
          emoji: replaceEmoji.trim() || '⭐',
        },
      })
      setLastOpResult(res)
      setSuccessMsg('استیکر با موفقیت جایگزین شد (stickers.replaceSticker)')
      if (activeSetId) {
        setCachedSetDetails((prev) => {
          const next = { ...prev }
          delete next[activeSetId]
          return next
        })
      }
      setReplaceOldDocId('')
      setReplaceNewDocId('')
    } catch (err: any) {
      console.warn('[StickerPickerDrawer] replaceSticker error:', err)
      setErrorMsg(err?.message || 'خطا در جایگزینی استیکر')
    } finally {
      setLoadingOp(null)
    }
  }

  if (!isOpen) return null

  const activeDetails = activeSetId ? cachedSetDetails[activeSetId] : null
  const currentStickers = activeDetails?.stickers || []

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 16 }}
      transition={{ type: 'spring', damping: 25, stiffness: 380 }}
      className={`absolute bottom-16 left-4 z-40 rounded-2xl bg-dark-900/95 border border-white/10 shadow-2xl backdrop-blur-md flex flex-col overflow-hidden select-none transition-all duration-200 ${
        mode === 'studio' ? 'w-88 sm:w-[420px] max-h-[460px]' : 'w-80 sm:w-96 max-h-[380px]'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between bg-dark-850/80">
        <div className="flex items-center gap-2 overflow-hidden">
          <Smile className="w-4 h-4 text-accent-cyan shrink-0" />
          <span className="text-xs font-semibold text-white truncate max-w-[130px] sm:max-w-[180px]">
            {mode === 'studio' ? 'استودیو استیکر (M105)' : activeSet?.title || 'Sticker Packs'}
          </span>
          {mode === 'picker' && activeSet && (
            <span className="text-[10px] text-gray-400">({activeSet.count})</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'picker' ? 'studio' : 'picker'))}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
              mode === 'studio'
                ? 'bg-accent-cyan text-black'
                : 'bg-accent-cyan/15 text-accent-cyan hover:bg-accent-cyan/25'
            }`}
            title="استودیو ساخت و مدیریت پَک استیکر"
          >
            <Sparkles className="w-3 h-3" />
            <span>{mode === 'studio' ? 'استیکرها' : 'استودیو پَک'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode A: Normal Picker Shelf */}
      {mode === 'picker' ? (
        <>
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
                const thumbUrl =
                  set.thumbnailUrl ||
                  cachedSetDetails[set.id]?.thumbnailUrl ||
                  cachedSetDetails[set.id]?.stickers?.[0]?.thumbnailUrl
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
        </>
      ) : (
        /* Mode B: Studio & Pack Management View (Microphase 105 - 7 RPCs) */
        <div className="flex-1 overflow-y-auto p-3 space-y-3.5 scrollbar-thin">
          {/* Sub-tabs: Create vs Manage */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5">
            <button
              type="button"
              onClick={() => setStudioTab('create')}
              className={`py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                studioTab === 'create'
                  ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ساخت پَک جدید</span>
            </button>
            <button
              type="button"
              onClick={() => setStudioTab('manage')}
              className={`py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                studioTab === 'manage'
                  ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>مدیریت پَک فعال</span>
            </button>
          </div>

          {/* Feedback Banners */}
          {errorMsg && (
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-[10px] text-rose-400 hover:text-rose-200 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMsg(null)}
                className="text-[10px] text-emerald-400 hover:text-emerald-200 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Sub-tab 1: Create New Sticker Pack */}
          {studioTab === 'create' ? (
            <div className="space-y-3 p-3 rounded-2xl bg-neutral-900/60 border border-white/5">
              <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-accent-cyan" />
                <span>ایجاد بسته استیکر جدید در تلگرام (stickers.createStickerSet)</span>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="عنوان پَک (مثلاً: گربه‌های فان)"
                  className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
                />

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={createShortName}
                    onChange={(e) => {
                      setCreateShortName(e.target.value)
                      setShortNameStatus('idle')
                    }}
                    placeholder="نام کوتاه انگلیسی (Short Name)"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleCheckShortName}
                    disabled={shortNameStatus === 'checking'}
                    className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1"
                    title="بررسی آزادسازی نام کوتاه (stickers.checkShortName)"
                  >
                    {shortNameStatus === 'checking' ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : shortNameStatus === 'available' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Search className="w-3 h-3" />
                    )}
                    <span>استعلام</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSuggestShortName}
                    disabled={suggestingShortName}
                    className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1"
                    title="پیشنهاد خودکار نام کوتاه از روی عنوان (stickers.suggestShortName)"
                  >
                    {suggestingShortName ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wand2 className="w-3 h-3" />
                    )}
                    <span>پیشنهاد</span>
                  </button>
                </div>

                {shortNameStatus === 'available' && (
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>نام کوتاه مجاز و آزاد است.</span>
                  </div>
                )}
                {shortNameStatus === 'taken' && (
                  <div className="text-[10px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>نام کوتاه قبلاً گرفته شده است.</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={createDocId}
                    onChange={(e) => setCreateDocId(e.target.value)}
                    placeholder="شناسه سند استیکر ۱ (Document ID)"
                    className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                  />
                  <input
                    type="text"
                    value={createEmoji}
                    onChange={(e) => setCreateEmoji(e.target.value)}
                    placeholder="ایموجی استیکر ۱"
                    className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none text-center"
                  />
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-1.5 text-[11px] text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createEmojis}
                      onChange={(e) => setCreateEmojis(e.target.checked)}
                      className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0"
                    />
                    <span>ایموجی اختصاصی</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createMasks}
                      onChange={(e) => setCreateMasks(e.target.checked)}
                      className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0"
                    />
                    <span>ماسک</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleCreateStickerSet}
                  disabled={loadingOp === 'create_set'}
                  className="w-full mt-2 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {loadingOp === 'create_set' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>ثبت پَک استیکر در سرور تلگرام</span>
                </button>
              </div>
            </div>
          ) : (
            /* Sub-tab 2: Manage Active Sticker Pack */
            <div className="space-y-3">
              {activeSet ? (
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-accent-cyan" />
                    <span className="font-semibold text-white truncate max-w-[170px]">
                      {activeSet.title}
                    </span>
                    <span className="text-[10px] text-neutral-400">({activeSet.count} استیکر)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteStickerSet}
                    disabled={loadingOp === 'delete_set'}
                    className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    title="حذف کامل این پَک (stickers.deleteStickerSet)"
                  >
                    {loadingOp === 'delete_set' ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    <span>حذف پَک</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-neutral-900/40 text-center text-xs text-neutral-400">
                  ابتدا یک پَک استیکر را از نوار پایینی انتخاب کنید.
                </div>
              )}

              {/* Microphase 106: Rename Sticker Set */}
              <div className="p-3 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-2">
                <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-accent-cyan" />
                  <span>تغییر عنوان پَک استیکر (stickers.renameStickerSet)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={renameTitle}
                    onChange={(e) => setRenameTitle(e.target.value)}
                    placeholder="عنوان جدید پَک..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleRenameStickerSet}
                    disabled={loadingOp === 'rename_set'}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1"
                  >
                    {loadingOp === 'rename_set' ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    <span>ثبت نام</span>
                  </button>
                </div>
              </div>

              {/* Microphase 106: Set Sticker Set Thumbnail */}
              <div className="p-3 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-2">
                <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>تنظیم کاور پَک (stickers.setStickerSetThumb)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={thumbDocId}
                    onChange={(e) => setThumbDocId(e.target.value)}
                    placeholder="شناسه سند کاور (Doc ID)..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSetStickerSetThumb}
                    disabled={loadingOp === 'set_thumb'}
                    className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1"
                  >
                    {loadingOp === 'set_thumb' ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <ImageIcon className="w-3 h-3" />
                    )}
                    <span>ثبت کاور</span>
                  </button>
                </div>
              </div>

              {/* 1. Add Sticker to Set */}
              <div className="p-3 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-2">
                <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>افزودن استیکر (stickers.addStickerToSet)</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={addDocId}
                    onChange={(e) => setAddDocId(e.target.value)}
                    placeholder="شناسه سند (Doc ID)"
                    className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                  />
                  <input
                    type="text"
                    value={addEmoji}
                    onChange={(e) => setAddEmoji(e.target.value)}
                    placeholder="ایموجی"
                    className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none text-center"
                  />
                </div>
                <input
                  type="text"
                  value={addKeywords}
                  onChange={(e) => setAddKeywords(e.target.value)}
                  placeholder="کلمات کلیدی جستجو (اختیاری)"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddSticker}
                  disabled={loadingOp === 'add_sticker'}
                  className="w-full py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {loadingOp === 'add_sticker' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>افزودن به این پَک</span>
                </button>
              </div>

              {/* 2. Change Sticker & Move Position */}
              <div className="p-3 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-2">
                <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>تغییر مشخصات یا موقعیت استیکر</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={changeDocId}
                    onChange={(e) => {
                      setChangeDocId(e.target.value)
                      setPosDocId(e.target.value)
                      setRemoveDocId(e.target.value)
                    }}
                    placeholder="شناسه سند (Doc ID)"
                    className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                  />
                  <input
                    type="text"
                    value={changeEmoji}
                    onChange={(e) => setChangeEmoji(e.target.value)}
                    placeholder="ایموجی جدید"
                    className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none text-center"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleChangeSticker}
                    disabled={loadingOp === 'change_sticker'}
                    className="flex-1 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {loadingOp === 'change_sticker' ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Tag className="w-3 h-3" />
                    )}
                    <span>ویرایش ایموجی (changeSticker)</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="number"
                    value={posIndex}
                    onChange={(e) => setPosIndex(e.target.value)}
                    placeholder="موقعیت (Position)"
                    className="w-24 px-2 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none text-center font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleChangePosition}
                    disabled={loadingOp === 'change_position'}
                    className="flex-1 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {loadingOp === 'change_position' ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Move className="w-3 h-3" />
                    )}
                    <span>انتقال موقعیت (changePosition)</span>
                  </button>
                </div>

                {/* 3. Remove Sticker from Set */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleRemoveSticker}
                    disabled={loadingOp === 'remove_sticker'}
                    className="w-full py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {loadingOp === 'remove_sticker' ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    <span>حذف این استیکر از پَک (removeStickerFromSet)</span>
                  </button>
                </div>
              </div>

              {/* Microphase 106: 4. Replace Sticker (stickers.replaceSticker) */}
              <div className="p-3 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-2">
                <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-purple-400" />
                  <span>جایگزینی مستقیم استیکر (stickers.replaceSticker)</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={replaceOldDocId}
                    onChange={(e) => setReplaceOldDocId(e.target.value)}
                    placeholder="شناسه فعلی (Old Doc ID)"
                    className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                  />
                  <input
                    type="text"
                    value={replaceNewDocId}
                    onChange={(e) => setReplaceNewDocId(e.target.value)}
                    placeholder="شناسه جدید (New Doc ID)"
                    className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={replaceEmoji}
                    onChange={(e) => setReplaceEmoji(e.target.value)}
                    placeholder="ایموجی"
                    className="w-20 px-2 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none text-center"
                  />
                  <button
                    type="button"
                    onClick={handleReplaceSticker}
                    disabled={loadingOp === 'replace_sticker'}
                    className="flex-1 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {loadingOp === 'replace_sticker' ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Repeat className="w-3 h-3" />
                    )}
                    <span>جایگزینی در پَک (replaceSticker)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {lastOpResult && (
            <div className="p-2 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px] text-neutral-400 max-h-20 overflow-y-auto">
              {JSON.stringify(lastOpResult, null, 2)}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

