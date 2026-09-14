import React, { useState, useEffect } from 'react'
import { Star, X, Shield, Sparkles, Check, Flame } from 'lucide-react'
import { useI18n } from '../i18n'
import { formatNumber } from '../utils/textUtils'

interface PaidReactionModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  chatId: string
  messageId: number
  onSuccess?: () => void
}

const PRESET_AMOUNTS = [1, 5, 10, 25, 50, 100, 250, 500]

export const PaidReactionModal: React.FC<PaidReactionModalProps> = ({
  isOpen,
  onClose,
  accountId,
  chatId,
  messageId,
  onSuccess,
}) => {
  const { t, language } = useI18n()
  const isPersian = language === 'fa'

  const [balance, setBalance] = useState<number>(0)
  const [selectedCount, setSelectedCount] = useState<number>(10)
  const [customCount, setCustomCount] = useState<string>('')
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false)
  const [isSending, setIsSending] = useState<boolean>(false)
  const [sentSuccess, setSentSuccess] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !accountId) return
    setError(null)
    setSentSuccess(false)
    if (window.guidegram?.getStarsStatus) {
      window.guidegram
        .getStarsStatus(accountId)
        .then((res) => {
          setBalance(res?.balance || 0)
        })
        .catch(() => {})
    }
  }, [isOpen, accountId])

  if (!isOpen) return null

  const effectiveCount = customCount ? Math.max(1, parseInt(customCount) || 1) : selectedCount

  const handleSend = async () => {
    if (!accountId || !chatId || !messageId || isSending) return
    setIsSending(true)
    setError(null)

    try {
      const ok = await window.guidegram.sendPaidReaction(
        accountId,
        chatId,
        messageId,
        effectiveCount,
        isAnonymous
      )
      if (ok) {
        setSentSuccess(true)
        onSuccess?.()
        setTimeout(() => {
          onClose()
        }, 1200)
      } else {
        setError(t('stars.reaction_failed') || 'Failed to send Star Reaction')
      }
    } catch (err: any) {
      setError(err?.message || 'Error sending reaction')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-dark-850 border border-amber-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-amber-500/20 via-dark-800 to-amber-600/15 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/25 text-amber-400 flex items-center justify-center shadow-glow">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{t('stars.send_reaction_title')}</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </h3>
              <div className="text-[11px] text-amber-300 font-semibold flex items-center gap-1">
                <span>{t('stars.balance')}:</span>
                <span className="font-mono">{formatNumber(balance)} ⭐️</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {sentSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-center animate-in zoom-in">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-glow">
                <Check className="w-8 h-8" />
              </div>
              <div className="text-sm font-bold text-white">{t('stars.reaction_sent')}</div>
              <div className="text-xs text-amber-300 font-semibold">
                +{effectiveCount} ⭐️ {t('stars.stars_awarded')}
              </div>
            </div>
          ) : (
            <>
              {/* Preset Grid */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-2">
                  {t('stars.select_amount')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_AMOUNTS.map((amt) => {
                    const isSelected = !customCount && selectedCount === amt
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setSelectedCount(amt)
                          setCustomCount('')
                        }}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-dark-950 border-amber-400 shadow-glow'
                            : 'bg-dark-900 text-gray-200 border-white/10 hover:bg-dark-750 hover:border-amber-500/30'
                        }`}
                      >
                        <span className="flex items-center gap-0.5">
                          <span>{amt}</span>
                          <Star className="w-2.5 h-2.5 fill-current" />
                        </span>
                        {amt >= 50 && (
                          <span className="text-[9px] uppercase tracking-wider text-amber-300">
                            <Flame className="w-2.5 h-2.5 inline" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Custom Amount Input */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1.5">
                  {t('stars.custom_amount')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={2500}
                    value={customCount}
                    onChange={(e) => setCustomCount(e.target.value)}
                    placeholder={String(selectedCount)}
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-dark-900 border border-white/10 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-amber-400">⭐️</span>
                </div>
              </div>

              {/* Anonymous Checkbox */}
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-dark-900/70 border border-white/5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-white/10 text-amber-500 focus:ring-0 w-3.5 h-3.5 bg-dark-800"
                />
                <Shield className="w-3.5 h-3.5 text-gray-400" />
                <div className="text-[11px] text-gray-300">
                  <div className="font-semibold">{t('stars.send_anonymously')}</div>
                  <div className="text-gray-500 text-[10px]">{t('stars.anonymous_desc')}</div>
                </div>
              </label>

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
                  {error}
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                disabled={isSending}
                onClick={handleSend}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-dark-950 font-bold text-xs shadow-glow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSending ? (
                  <div className="w-4 h-4 rounded-full border-2 border-dark-950 border-t-transparent animate-spin" />
                ) : (
                  <>
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {t('stars.send_button')} ({effectiveCount} ⭐️)
                    </span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
