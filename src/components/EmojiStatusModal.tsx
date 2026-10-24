import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Check, Clock, Loader2, Sparkles, Trash2, X } from 'lucide-react'
import { useI18n } from '../i18n'
import { CustomEmojiView } from './ChatViewport'
import type {
  EmojiStatusItem,
  EmojiStatusSource,
  EmojiStatusesResult,
} from '../types/telegram'

interface EmojiStatusModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  isPremium?: boolean
}

const EMPTY_RESULT: EmojiStatusesResult = {
  default: [],
  recent: [],
  collectible: [],
}

const DURATION_OPTIONS: Array<{ value: number; key: string }> = [
  { value: 0, key: 'emoji.forever' },
  { value: 86400, key: 'emoji.one_day' },
  { value: 604800, key: 'emoji.one_week' },
  { value: 2592000, key: 'emoji.one_month' },
]

export const EmojiStatusModal: React.FC<EmojiStatusModalProps> = ({
  isOpen,
  onClose,
  accountId,
  isPremium = false,
}) => {
  const { t, isRTL } = useI18n()
  const [data, setData] = useState<EmojiStatusesResult>(EMPTY_RESULT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<EmojiStatusSource>('default')
  const [duration, setDuration] = useState(0)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const loadStatuses = async () => {
    if (!accountId) return
    setLoading(true)
    setError(null)
    try {
      const result = await window.guidegram.getEmojiStatuses(accountId)
      setData(result || EMPTY_RESULT)
      if (result?.collectible?.length && !result?.default?.length && !result?.recent?.length) {
        setActiveTab('collectible')
      }
    } catch (err: any) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      setNotice(null)
      setError(null)
      setSavingKey(null)
      return
    }
    setNotice(null)
    setActiveTab('default')
    setDuration(0)
    void loadStatuses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, accountId])

  const currentItem = useMemo(() => {
    if (!data.currentDocumentId) return null
    const all = [...data.collectible, ...data.recent, ...data.default]
    return (
      all.find(
        (item) =>
          item.documentId === data.currentDocumentId &&
          (!data.currentCollectibleId || item.collectibleId === data.currentCollectibleId)
      ) || null
    )
  }, [data])

  const formatError = (err: any): string => {
    const raw = String(err?.message || err || '')
    if (raw.includes('PREMIUM_ACCOUNT_REQUIRED')) {
      return t('emoji.premium_required')
    }
    if (raw.includes('COLLECTIBLE_INVALID')) {
      return t('emoji.collectible_invalid')
    }
    if (raw.includes('DOCUMENT_INVALID')) {
      return t('emoji.document_invalid')
    }
    return raw || t('emoji.generic_error')
  }

  const handleSet = async (item: EmojiStatusItem) => {
    if (!item.documentId || savingKey) return
    const key = item.collectibleId || item.documentId
    setSavingKey(key)
    setError(null)
    setNotice(null)
    try {
      const until = duration > 0 ? Math.floor(Date.now() / 1000) + duration : undefined
      await window.guidegram.setEmojiStatus(accountId, {
        documentId: item.documentId,
        collectibleId: item.collectibleId,
        until,
      })
      setNotice(t('emoji.updated'))
      await loadStatuses()
    } catch (err: any) {
      setError(formatError(err))
    } finally {
      setSavingKey(null)
    }
  }

  const handleClear = async () => {
    if (savingKey) return
    setSavingKey('clear')
    setError(null)
    setNotice(null)
    try {
      await window.guidegram.setEmojiStatus(accountId, { documentId: null })
      setNotice(t('emoji.removed'))
      await loadStatuses()
    } catch (err: any) {
      setError(formatError(err))
    } finally {
      setSavingKey(null)
    }
  }

  if (!isOpen) return null

  const tabs: Array<{ id: EmojiStatusSource; label: string; count: number }> = [
    { id: 'default', label: t('emoji.default'), count: data.default.length },
    { id: 'recent', label: t('emoji.recent'), count: data.recent.length },
    { id: 'collectible', label: t('emoji.collectible'), count: data.collectible.length },
  ]
  const visibleItems =
    activeTab === 'default'
      ? data.default
      : activeTab === 'recent'
        ? data.recent
        : data.collectible

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(event) => {
        event.stopPropagation()
        if (!savingKey) onClose()
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg max-h-[86vh] rounded-3xl bg-[#17212b] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-cyan/15 text-accent-cyan flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{t('emoji.title')}</div>
              <div className="text-[11px] text-gray-400">{t('emoji.subtitle')}</div>
            </div>
          </div>
          <button
            type="button"
            disabled={!!savingKey}
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          {!isPremium && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-[11px] leading-relaxed text-amber-200">
              {t('emoji.premium_hint')}
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-[#0e1621] p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                {data.currentDocumentId ? (
                  <CustomEmojiView
                    accountId={accountId}
                    documentId={data.currentDocumentId}
                    className="w-9 h-9 object-contain"
                  />
                ) : (
                  <Sparkles className="w-5 h-5 text-gray-500" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-gray-300">
                  {t('emoji.current')}
                </div>
                <div className="text-xs text-white truncate">
                  {data.currentDocumentId
                    ? currentItem?.title || t('emoji.active')
                    : t('emoji.none')}
                </div>
                {data.currentUntil && (
                  <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>
                      {t('emoji.until').replace(
                        '{date}',
                        new Date(data.currentUntil * 1000).toLocaleString(
                          isRTL ? 'fa-IR' : undefined
                        )
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {data.currentDocumentId && (
              <button
                type="button"
                disabled={!!savingKey}
                onClick={handleClear}
                className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-accent-rose bg-accent-rose/10 hover:bg-accent-rose/20 border border-accent-rose/20 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingKey === 'clear' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {t('emoji.remove')}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0e1621] border border-white/10">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-accent-cyan/20 text-accent-cyan'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ms-1 opacity-60">({tab.count})</span>
                  )}
                </button>
              ))}
            </div>

            <select
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              className="px-2.5 py-1.5 rounded-lg bg-[#0e1621] border border-white/10 text-[11px] text-gray-300 focus:border-accent-cyan/60 focus:outline-none cursor-pointer"
              title={t('emoji.duration')}
            >
              {DURATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.key)}
                </option>
              ))}
            </select>
          </div>

          {notice && (
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-[11px] text-emerald-200">
              {notice}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-accent-rose/25 bg-accent-rose/10 px-3 py-2 text-[11px] text-accent-rose">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-14 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-accent-cyan" />
              <span className="text-xs">{t('emoji.loading')}</span>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">
              {activeTab === 'collectible'
                ? t('emoji.no_collectibles')
                : t('emoji.empty')}
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {visibleItems.map((item) => {
                const key = item.collectibleId || item.documentId
                const isCurrent =
                  data.currentDocumentId === item.documentId &&
                  (!item.collectibleId ||
                    !data.currentCollectibleId ||
                    item.collectibleId === data.currentCollectibleId)
                const isSaving = savingKey === key
                return (
                  <button
                    key={`${item.source}-${key}`}
                    type="button"
                    disabled={!!savingKey}
                    onClick={() => handleSet(item)}
                    title={item.title || t('emoji.choose')}
                    className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 p-2 transition-colors cursor-pointer disabled:cursor-not-allowed ${
                      isCurrent
                        ? 'border-accent-cyan/60 bg-accent-cyan/10'
                        : 'border-white/10 bg-[#0e1621] hover:bg-white/5 hover:border-white/20'
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 className="w-6 h-6 animate-spin text-accent-cyan" />
                    ) : (
                      <CustomEmojiView
                        accountId={accountId}
                        documentId={item.documentId}
                        className="w-8 h-8 object-contain"
                      />
                    )}
                    {item.title && (
                      <span className="text-[9px] leading-tight text-gray-400 max-w-full truncate">
                        {item.title}
                      </span>
                    )}
                    {isCurrent && !isSaving && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent-cyan text-[#0e1621] flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between shrink-0">
          <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            {t('emoji.footer')}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!!savingKey}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            {t('app.close')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
