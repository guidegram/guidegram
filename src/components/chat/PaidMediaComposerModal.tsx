import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  Star,
  Lock,
  Image as ImageIcon,
  Video,
  Plus,
  Trash2,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Sparkles,
} from 'lucide-react'
import { useI18n } from '../../i18n'

export interface PaidMediaComposerModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  chatId: string
  chatTitle: string
  onSent?: () => void
}

const STAR_PRESETS = [10, 25, 50, 100, 250, 500, 1000]

export const PaidMediaComposerModal: React.FC<PaidMediaComposerModalProps> = ({
  isOpen,
  onClose,
  accountId,
  chatId,
  chatTitle,
  onSent,
}) => {
  const { t } = useI18n()
  const [starsAmount, setStarsAmount] = useState<number>(50)
  const [customStars, setCustomStars] = useState<string>('')
  const [caption, setCaption] = useState<string>('')
  const [mediaItems, setMediaItems] = useState<
    Array<{ id: string; name: string; type: 'photo' | 'video'; size: string }>
  >([
    {
      id: 'item-1',
      name: 'exclusive_content_preview.jpg',
      type: 'photo',
      size: '1.8 MB',
    },
  ])
  const [sending, setSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const effectiveStars = customStars ? Math.max(1, parseInt(customStars) || 1) : starsAmount

  const handleSendPaidMedia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId || !chatId || sending) return
    setSending(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      if (window.guidegram?.sendPaidMedia) {
        // Send simulated inputMediaPhoto items mapped to the MTProto payload
        const extendedMedia = mediaItems.map((item) => ({
          _: item.type === 'photo' ? 'inputMediaPhoto' : 'inputMediaDocument',
          id: { _: 'inputPhotoEmpty' },
        }))

        const res = await window.guidegram.sendPaidMedia(
          accountId,
          chatId,
          effectiveStars,
          extendedMedia,
          caption.trim()
        )

        if (res && res.success) {
          setSuccessMsg('Paid media message posted successfully!')
          onSent?.()
          setTimeout(() => {
            onClose()
          }, 1200)
        } else {
          setErrorMsg(res?.error || 'Failed to post paid media.')
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error posting paid media.')
    } finally {
      setSending(false)
    }
  }

  const handleAddDemoMedia = () => {
    const nextIdx = mediaItems.length + 1
    setMediaItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: `premium_asset_${nextIdx}.mp4`,
        type: 'video',
        size: '14.2 MB',
      },
    ])
  }

  const handleRemoveMedia = (id: string) => {
    setMediaItems((prev) => prev.filter((item) => item.id !== id))
  }

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
        className="relative flex flex-col w-full max-w-lg bg-dark-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="h-14 px-4 bg-dark-850/90 border-b border-white/10 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-600 text-dark-950 flex items-center justify-center shrink-0 shadow-md">
              <Lock className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white leading-tight">Post Paid Media (Stars)</span>
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

        {/* Modal Form */}
        <form onSubmit={handleSendPaidMedia} className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Price Selector Hero */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                Price to Unlock Media
              </span>
              <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{effectiveStars.toLocaleString()} Stars</span>
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {STAR_PRESETS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setStarsAmount(amt)
                    setCustomStars('')
                  }}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all ${
                    effectiveStars === amt && !customStars
                      ? 'bg-amber-400 text-dark-950 shadow-sm'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  ⭐ {amt}
                </button>
              ))}
            </div>
          </div>

          {/* Media Attachments List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Media Attachments ({mediaItems.length})
              </span>
              <button
                type="button"
                onClick={handleAddDemoMedia}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Media</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {mediaItems.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs text-gray-300"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                      {item.type === 'photo' ? (
                        <ImageIcon className="w-3.5 h-3.5" />
                      ) : (
                        <Video className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-white truncate max-w-[200px]">{item.name}</span>
                      <span className="text-[10px] text-gray-500">{item.size}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(item.id)}
                    className="p-1 text-gray-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Caption Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Caption / Teaser Description
            </label>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Describe this exclusive content (subscribers unlock full media with Stars)..."
              className="w-full p-3 rounded-2xl bg-dark-950 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={sending || mediaItems.length === 0}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-600 hover:brightness-110 text-dark-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Post Locked Media for ⭐ {effectiveStars.toLocaleString()}</span>
          </button>
        </form>
      </motion.div>
    </div>
  )
}
