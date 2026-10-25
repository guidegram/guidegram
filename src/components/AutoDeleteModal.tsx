import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Clock, X, Check, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react'
import { useI18n } from '../i18n'

interface AutoDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  chatId?: string
  chatTitle?: string
  currentPeriod?: number
  onSuccess?: (newPeriod: number) => void
}

const PRESET_PERIODS = [
  { label: 'Off', seconds: 0, description: 'Messages stay forever' },
  { label: '1 Day', seconds: 86400, description: 'Auto-delete after 24 hours' },
  { label: '1 Week', seconds: 604800, description: 'Auto-delete after 7 days' },
  { label: '1 Month', seconds: 2678400, description: 'Auto-delete after 31 days' },
]

export const AutoDeleteModal: React.FC<AutoDeleteModalProps> = ({
  isOpen,
  onClose,
  accountId,
  chatId,
  chatTitle = 'This Chat',
  currentPeriod = 0,
  onSuccess,
}) => {
  const { t, language } = useI18n()
  const isPersian = language === 'fa'
  const [selectedPeriod, setSelectedPeriod] = useState<number>(currentPeriod)
  const [isApplying, setIsApplying] = useState(false)
  const [isGlobalDefault, setIsGlobalDefault] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSelectedPeriod(currentPeriod)
    setError(null)
  }, [isOpen, currentPeriod])

  if (!isOpen) return null

  const handleApply = async () => {
    if (!accountId) return
    setIsApplying(true)
    setError(null)
    try {
      if (isGlobalDefault && window.guidegram?.setDefaultHistoryTTL) {
        await window.guidegram.setDefaultHistoryTTL(accountId, selectedPeriod)
      }
      if (chatId && window.guidegram?.setHistoryTTL) {
        await window.guidegram.setHistoryTTL(accountId, chatId, selectedPeriod)
      }
      onSuccess?.(selectedPeriod)
      onClose()
    } catch (err: any) {
      console.warn('Failed to set history TTL:', err)
      setError(err?.message || 'Failed to update auto-delete timer')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-sm bg-dark-850 border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent-cyan/15 text-accent-cyan flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {isPersian ? 'تایمر حذف خودکار پیام‌ها' : 'Auto-Delete Messages'}
                </h3>
                <p className="text-[11px] text-gray-400 truncate max-w-[220px]">{chatTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <p className="mt-4 text-xs text-gray-300 leading-relaxed">
            {isPersian
              ? 'پیام‌های جدیدی که در این گفتگو ارسال می‌شوند، پس از گذشت زمان تعیین‌شده به‌طور خودکار برای هر دو طرف حذف خواهند شد.'
              : 'New messages sent in this chat will be automatically deleted for everyone after the chosen period.'}
          </p>

          {/* Preset Buttons */}
          <div className="my-5 flex flex-col gap-2">
            {PRESET_PERIODS.map((p) => {
              const isSelected = selectedPeriod === p.seconds
              return (
                <button
                  key={p.seconds}
                  type="button"
                  onClick={() => setSelectedPeriod(p.seconds)}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-accent-cyan/15 border-accent-cyan/50 text-white shadow-sm'
                      : 'bg-dark-900 border-white/5 text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">{p.label}</div>
                    <div className="text-[10px] text-gray-400">{p.description}</div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-accent-cyan shrink-0" />}
                </button>
              )
            })}
          </div>

          {/* Default for all new chats checkbox */}
          <label className="flex items-center gap-2.5 px-1 text-xs text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isGlobalDefault}
              onChange={(e) => setIsGlobalDefault(e.target.checked)}
              className="rounded bg-dark-900 border-white/20 text-accent-cyan focus:ring-0 focus:ring-offset-0"
            />
            <span>{isPersian ? 'تنظیم به عنوان پیش‌فرض تمام گفتگوهای جدید' : 'Set as default for all new chats'}</span>
          </label>

          {error && (
            <div className="mt-3 p-2.5 rounded-xl bg-accent-rose/10 border border-accent-rose/20 text-accent-rose text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Save Button */}
          <div className="mt-5 pt-3 border-t border-white/5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
            >
              {isPersian ? 'انصراف' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={isApplying}
              onClick={handleApply}
              className="flex-1 py-2 rounded-xl bg-primary-500 hover:bg-primary-400 text-white font-bold text-xs transition-all shadow-glow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isApplying ? (
                <span>Saving...</span>
              ) : (
                <span>{isPersian ? 'ذخیره تغییرات' : 'Set Timer'}</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
