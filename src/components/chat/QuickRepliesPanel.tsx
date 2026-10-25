import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Zap, Send, Plus, Trash2, Edit2, X, MessageSquare, Check } from 'lucide-react'
import { QuickReplyShortcutItem } from '../../types/telegram'
import { useI18n } from '../../i18n'

interface QuickRepliesPanelProps {
  accountId: string
  peerId: string
  filterQuery?: string
  onSelectShortcut: (shortcut: QuickReplyShortcutItem, sendImmediately: boolean) => void
  onClose: () => void
}

export const QuickRepliesPanel: React.FC<QuickRepliesPanelProps> = ({
  accountId,
  peerId,
  filterQuery = '',
  onSelectShortcut,
  onClose,
}) => {
  const { t, language } = useI18n()
  const isPersian = language === 'fa'
  const [shortcuts, setShortcuts] = useState<QuickReplyShortcutItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        if (window.guidegram?.getQuickReplies) {
          const res = await window.guidegram.getQuickReplies(accountId)
          if (isMounted) {
            setShortcuts(res || [])
          }
        }
      } catch (err) {
        console.warn('Failed to load quick replies:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [accountId])

  const normalizedQuery = filterQuery.replace(/^\//, '').toLowerCase().trim()
  const filteredShortcuts = shortcuts.filter((s) =>
    s.shortcut.toLowerCase().includes(normalizedQuery)
  )

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 max-h-64 bg-dark-850/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden z-40 flex flex-col animate-in fade-in zoom-in-95 duration-100 select-none">
      {/* Header */}
      <div className="px-3.5 py-2 border-b border-white/5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-accent-cyan font-bold">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>{isPersian ? 'پاسخ‌های سریع (میانبرها)' : 'Quick Replies (/shortcuts)'}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Shortcuts List */}
      <div className="p-1.5 overflow-y-auto space-y-1 max-h-52">
        {loading ? (
          <div className="p-3 text-center text-xs text-gray-400">Loading shortcuts...</div>
        ) : filteredShortcuts.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-400 flex flex-col items-center gap-1.5">
            <MessageSquare className="w-5 h-5 text-gray-600" />
            <span>
              {isPersian
                ? 'هیچ میانبری پیدا نشد'
                : normalizedQuery
                ? `No shortcuts matching "/${normalizedQuery}"`
                : 'No quick reply shortcuts set'}
            </span>
          </div>
        ) : (
          filteredShortcuts.map((s) => {
            const previewText = s.messages?.[0]?.text || 'Canned message payload'
            return (
              <div
                key={s.shortcutId}
                className="group flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-all text-left"
              >
                <button
                  type="button"
                  onClick={() => onSelectShortcut(s, false)}
                  className="flex-1 min-w-0 pr-2 cursor-pointer flex flex-col text-left"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-accent-cyan">/{s.shortcut}</span>
                    {s.count && s.count > 1 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[9px] text-gray-400">
                        {s.count} msgs
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-300 truncate max-w-sm mt-0.5">{previewText}</span>
                </button>

                {/* Direct Send button */}
                <button
                  type="button"
                  onClick={() => onSelectShortcut(s, true)}
                  title="Send shortcut immediately"
                  className="p-1.5 rounded-lg bg-primary-600/30 hover:bg-primary-600 text-primary-300 hover:text-white transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
