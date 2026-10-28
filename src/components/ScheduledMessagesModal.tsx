import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Clock, Send, Trash2, X, FileText, Image, Mic, Edit3, Copy, Check, Sparkles } from 'lucide-react'
import { ScheduledMessageItem } from '../types/telegram'
import { useI18n } from '../i18n'
import { isRTL } from '../utils/textUtils'

interface ScheduledMessagesModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  chatId: string
  chatTitle: string
  onEditMessage?: (text: string) => void
  onScheduledChanged?: () => void
}

export const ScheduledMessagesModal: React.FC<ScheduledMessagesModalProps> = ({
  isOpen,
  onClose,
  accountId,
  chatId,
  chatTitle,
  onEditMessage,
  onScheduledChanged,
}) => {
  const { t } = useI18n()
  const [messages, setMessages] = useState<ScheduledMessageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [now, setNow] = useState<number>(Date.now())

  // Ticker for live countdown display
  useEffect(() => {
    if (!isOpen) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [isOpen])

  const loadScheduled = async () => {
    if (!accountId || !chatId) return
    setLoading(true)
    setActionError(null)
    try {
      if (window.guidegram?.getScheduledMessages) {
        const res = await window.guidegram.getScheduledMessages(accountId, chatId)
        setMessages(res || [])
      }
    } catch (err) {
      console.warn('Failed to load scheduled messages:', err)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadScheduled()
    }
  }, [isOpen, accountId, chatId])

  if (!isOpen) return null

  const handleSendNow = async (messageId: number) => {
    if (processingId !== null) return
    setProcessingId(messageId)
    setActionError(null)
    try {
      if (window.guidegram?.sendScheduledMessageNow) {
        const ok = await window.guidegram.sendScheduledMessageNow(accountId, chatId, messageId)
        if (ok) {
          setMessages((prev) => prev.filter((m) => m.id !== messageId))
          onScheduledChanged?.()
        } else {
          setActionError('Could not send scheduled message now. Please verify connection.')
        }
      }
    } catch (err: any) {
      console.error('Failed to send scheduled message now:', err)
      setActionError(err?.message || 'Failed to send message now.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (messageId: number) => {
    if (processingId !== null) return
    if (!window.confirm('Delete this scheduled message?')) return
    setProcessingId(messageId)
    setActionError(null)
    try {
      if (window.guidegram?.deleteScheduledMessages) {
        const ok = await window.guidegram.deleteScheduledMessages(accountId, chatId, [messageId])
        if (ok) {
          setMessages((prev) => prev.filter((m) => m.id !== messageId))
          onScheduledChanged?.()
        } else {
          setActionError('Failed to delete scheduled message.')
        }
      }
    } catch (err: any) {
      console.error('Failed to delete scheduled message:', err)
      setActionError(err?.message || 'Failed to delete message.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleCopy = (messageId: number, text?: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedId(messageId)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const handleEditInComposer = (text?: string) => {
    if (!text) return
    onEditMessage?.(text)
    onClose()
  }

  const formatScheduleDate = (timestamp: number) => {
    const d = new Date(timestamp)
    return d.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCountdown = (timestamp: number, isWhenOnline?: boolean) => {
    if (isWhenOnline) return 'When online'
    const diff = timestamp - now
    if (diff <= 0) return 'Sending now...'
    const sec = Math.floor(diff / 1000)
    const min = Math.floor(diff / 60000)
    const hr = diff / 3600000

    if (sec < 60) return `in ${sec}s`
    if (min < 60) return `in ${min}m`
    return `in ${hr.toFixed(1)}h`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none animate-in fade-in duration-150">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-dark-850 border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-accent-violet/20 via-dark-800 to-dark-850 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-violet/20 text-accent-violet flex items-center justify-center shadow-glow">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Scheduled Messages</h3>
                <span className="px-2 py-0.5 rounded-full bg-accent-violet/20 border border-accent-violet/30 text-accent-violet text-[10px] font-bold">
                  {messages.length} Pending
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                Scheduled for <span className="text-gray-200 font-medium">{chatTitle}</span>
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

        {/* Action Error Banner */}
        {actionError && (
          <div className="px-5 py-2.5 bg-rose-500/20 border-b border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-white font-bold ml-2">
              ×
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-xs text-gray-400 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-accent-violet/40 border-t-accent-violet animate-spin" />
              <span>Fetching scheduled messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-16 h-16 rounded-3xl bg-accent-violet/10 border border-accent-violet/20 flex items-center justify-center text-accent-violet/80 mb-3">
                <Clock className="w-8 h-8" />
              </div>
              <div className="text-sm font-bold text-gray-200">No Scheduled Messages</div>
              <p className="text-xs text-gray-400 max-w-xs mt-1 leading-relaxed">
                Right-click the Send button in the message composer to schedule messages to be sent at a specific time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ scale: 1.008 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 350 }}
                  className="p-3.5 rounded-2xl bg-dark-800/90 border border-white/5 hover:border-accent-violet/30 transition-all flex flex-col gap-2.5 shadow-sm group"
                >
                  {/* Top Bar with Time & Countdown */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-accent-violet">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatScheduleDate(item.scheduledDate)}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-violet/15 text-accent-violet border border-accent-violet/25">
                        {formatCountdown(item.scheduledDate, item.isWhenOnline)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {item.text && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.id, item.text)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            title="Copy message text"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-accent-emerald" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {onEditMessage && (
                            <button
                              type="button"
                              onClick={() => handleEditInComposer(item.text)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-accent-cyan hover:bg-white/10 transition-colors cursor-pointer"
                              title="Edit text in chat composer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}

                      <button
                        type="button"
                        disabled={processingId === item.id}
                        onClick={() => handleSendNow(item.id)}
                        className="px-2.5 py-1 rounded-lg bg-primary-600/20 hover:bg-primary-600 text-primary-300 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Send this scheduled message now"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send Now</span>
                      </button>

                      <button
                        type="button"
                        disabled={processingId === item.id}
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-accent-rose hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete scheduled message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Message Text Content (Clicking places in composer if editable) */}
                  {item.text && (
                    <div
                      dir={isRTL(item.text) ? 'rtl' : 'ltr'}
                      onClick={() => onEditMessage && handleEditInComposer(item.text)}
                      title={onEditMessage ? 'Click to copy text into chat composer' : undefined}
                      className={`text-xs text-gray-200 bg-black/25 p-2.5 rounded-xl border border-white/5 leading-relaxed break-words ${
                        onEditMessage ? 'hover:border-accent-violet/40 cursor-pointer transition-colors' : ''
                      }`}
                    >
                      {item.text}
                    </div>
                  )}

                  {item.mediaType && (
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 bg-white/5 px-2.5 py-1.5 rounded-xl">
                      {item.mediaType === 'photo' || item.mediaType === 'video' ? (
                        <Image className="w-3.5 h-3.5 text-accent-cyan" />
                      ) : item.mediaType === 'voice' ? (
                        <Mic className="w-3.5 h-3.5 text-primary-400" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span className="capitalize">{item.mediaType} Attachment</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-dark-900 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Sparkles className="w-3 h-3 text-accent-violet" />
            <span>Click message text to edit in chat composer</span>
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
    </div>
  )
}
