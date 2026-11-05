import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Clock,
  X,
  Check,
  Sparkles,
  AlertCircle,
  Loader2,
  Trash2,
  Send,
  Edit3,
  AlertTriangle,
  RefreshCw,
  Flame,
  MessageSquare
} from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState<'timer' | 'ephemeral'>('timer')

  // Auto-delete timer state
  const [selectedPeriod, setSelectedPeriod] = useState<number>(currentPeriod)
  const [isApplying, setIsApplying] = useState(false)
  const [isGlobalDefault, setIsGlobalDefault] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Ephemeral domain state (Layer 232)
  const [ephemeralTargetPeer, setEphemeralTargetPeer] = useState<string>(chatId || '')
  const [ephemeralText, setEphemeralText] = useState('')
  const [isWelcome, setIsWelcome] = useState(false)
  const [isNoForwards, setIsNoForwards] = useState(true)
  const [targetMsgId, setTargetMsgId] = useState<string>('')
  const [editMsgText, setEditMsgText] = useState('')
  const [reportReason, setReportReason] = useState('Spam or abusive ephemeral content')
  const [welcomeMessages, setWelcomeMessages] = useState<any[] | null>(null)
  const [isFetchingWelcome, setIsFetchingWelcome] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [actionResult, setActionResult] = useState<any | null>(null)

  useEffect(() => {
    setSelectedPeriod(currentPeriod)
    setError(null)
    setSuccessMsg(null)
    setEphemeralTargetPeer(chatId || '')
  }, [isOpen, currentPeriod, chatId])

  if (!isOpen) return null

  const handleApplyTimer = async () => {
    if (!accountId) return
    setIsApplying(true)
    setError(null)
    setSuccessMsg(null)
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

  // Ephemeral Domain Callbacks
  const handleFetchWelcomeMessages = async () => {
    if (!accountId) return
    setIsFetchingWelcome(true)
    setError(null)
    try {
      const res = await window.guidegram.ephemeralGetWelcomeMessagesRaw(accountId, {
        peerId: ephemeralTargetPeer || chatId,
      })
      if (res && Array.isArray(res.messages)) {
        setWelcomeMessages(res.messages)
      } else if (res && Array.isArray(res)) {
        setWelcomeMessages(res)
      } else {
        setWelcomeMessages([])
      }
      setSuccessMsg(isPersian ? 'پیام‌های خوش‌آمد موقت دریافت شدند.' : 'Ephemeral welcome messages fetched.')
    } catch (err: any) {
      console.warn('Failed to fetch welcome messages:', err)
      setError(err?.message || 'Failed to fetch welcome messages')
    } finally {
      setIsFetchingWelcome(false)
    }
  }

  const handleDeleteAllWelcomeMessages = async () => {
    if (!accountId) return
    setIsActionLoading(true)
    setError(null)
    try {
      await window.guidegram.ephemeralDeleteAllWelcomeMessagesRaw(accountId, {
        peerId: ephemeralTargetPeer || chatId,
      })
      setWelcomeMessages([])
      setSuccessMsg(isPersian ? 'تمام پیام‌های خوش‌آمد موقت حذف شدند.' : 'All ephemeral welcome messages deleted.')
    } catch (err: any) {
      console.warn('Failed to delete all welcome messages:', err)
      setError(err?.message || 'Failed to delete welcome messages')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDeleteWelcomeMessage = async (msgId: number) => {
    if (!accountId) return
    setIsActionLoading(true)
    setError(null)
    try {
      await window.guidegram.ephemeralDeleteWelcomeMessageRaw(accountId, {
        peerId: ephemeralTargetPeer || chatId,
        id: msgId,
      })
      setWelcomeMessages((prev) => prev?.filter((m) => m?.id !== msgId) || [])
      setSuccessMsg(isPersian ? `پیام خوش‌آمد #${msgId} حذف شد.` : `Welcome message #${msgId} deleted.`)
    } catch (err: any) {
      console.warn('Failed to delete welcome message:', err)
      setError(err?.message || 'Failed to delete welcome message')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleSendEphemeralMessage = async () => {
    if (!accountId || !ephemeralText.trim()) return
    setIsActionLoading(true)
    setError(null)
    setActionResult(null)
    try {
      const res = await window.guidegram.ephemeralSendMessageRaw(accountId, {
        peerId: ephemeralTargetPeer || chatId,
        message: ephemeralText.trim(),
        welcome: isWelcome,
        noforwards: isNoForwards,
      })
      setActionResult(res)
      setEphemeralText('')
      setSuccessMsg(isPersian ? 'پیام موقت با موفقیت ارسال شد.' : 'Ephemeral message dispatched successfully.')
    } catch (err: any) {
      console.warn('Failed to send ephemeral message:', err)
      setError(err?.message || 'Failed to send ephemeral message')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleEditEphemeralMessage = async () => {
    const id = parseInt(targetMsgId, 10)
    if (!accountId || isNaN(id) || !editMsgText.trim()) return
    setIsActionLoading(true)
    setError(null)
    try {
      const res = await window.guidegram.ephemeralEditMessageRaw(accountId, {
        peerId: ephemeralTargetPeer || chatId,
        id,
        message: editMsgText.trim(),
      })
      setActionResult(res)
      setEditMsgText('')
      setSuccessMsg(isPersian ? `پیام موقت #${id} ویرایش شد.` : `Ephemeral message #${id} edited.`)
    } catch (err: any) {
      console.warn('Failed to edit ephemeral message:', err)
      setError(err?.message || 'Failed to edit ephemeral message')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDeleteEphemeralMessage = async () => {
    const id = parseInt(targetMsgId, 10)
    if (!accountId || isNaN(id)) return
    setIsActionLoading(true)
    setError(null)
    try {
      await window.guidegram.ephemeralDeleteMessageRaw(accountId, {
        peerId: ephemeralTargetPeer || chatId,
        id,
      })
      setSuccessMsg(isPersian ? `پیام موقت #${id} حذف شد.` : `Ephemeral message #${id} deleted.`)
    } catch (err: any) {
      console.warn('Failed to delete ephemeral message:', err)
      setError(err?.message || 'Failed to delete ephemeral message')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleReportEphemeralMessage = async () => {
    const id = parseInt(targetMsgId, 10)
    if (!accountId || isNaN(id)) return
    setIsActionLoading(true)
    setError(null)
    try {
      await window.guidegram.ephemeralReportMessageRaw(accountId, {
        peerId: ephemeralTargetPeer || chatId,
        id,
        message: reportReason,
      })
      setSuccessMsg(isPersian ? `گزارش تخلف پیام #${id} ثبت شد.` : `Report for ephemeral message #${id} submitted.`)
    } catch (err: any) {
      console.warn('Failed to report ephemeral message:', err)
      setError(err?.message || 'Failed to report ephemeral message')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleGetCallbackAnswer = async () => {
    const id = parseInt(targetMsgId, 10)
    if (!accountId || isNaN(id)) return
    setIsActionLoading(true)
    setError(null)
    try {
      const res = await window.guidegram.ephemeralGetCallbackAnswerRaw(accountId, {
        peerId: ephemeralTargetPeer || chatId,
        id,
      })
      setActionResult(res)
      setSuccessMsg(isPersian ? 'پاسخ کال‌بک دریافت شد.' : 'Callback answer retrieved.')
    } catch (err: any) {
      console.warn('Failed to get callback answer:', err)
      setError(err?.message || 'Failed to get callback answer')
    } finally {
      setIsActionLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg max-h-[90vh] bg-dark-850 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent-cyan/15 text-accent-cyan flex items-center justify-center">
                {activeTab === 'timer' ? <Clock className="w-4 h-4" /> : <Flame className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{activeTab === 'timer' ? t('auto_delete.title') : 'Ephemeral & Welcome Messages'}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan font-mono font-normal">
                    Layer 232
                  </span>
                </h3>
                <p className="text-[11px] text-gray-400 truncate max-w-[260px]">{chatTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 p-1 rounded-xl bg-dark-900 border border-white/5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('timer')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'timer'
                  ? 'bg-accent-cyan/15 text-accent-cyan shadow-sm border border-accent-cyan/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t('auto_delete.title')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ephemeral')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'ephemeral'
                  ? 'bg-accent-cyan/15 text-accent-cyan shadow-sm border border-accent-cyan/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Ephemeral RPCs</span>
            </button>
          </div>

          {/* Status Banners */}
          {error && (
            <div className="mt-3 p-2.5 rounded-xl bg-accent-rose/10 border border-accent-rose/20 text-accent-rose text-xs flex items-center gap-2 shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-[11px]">{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-[10px] underline hover:opacity-80"
              >
                Dismiss
              </button>
            </div>
          )}
          {successMsg && (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 shrink-0">
              <Check className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-[11px]">{successMsg}</span>
            </div>
          )}

          {/* Scrollable Tab Content */}
          <div className="flex-1 overflow-y-auto pr-1 my-4 space-y-4 text-xs text-gray-300">
            {activeTab === 'timer' ? (
              <div className="space-y-4">
                <p className="text-xs text-gray-300 leading-relaxed">
                  {t('auto_delete.desc')}
                </p>

                {/* Preset Buttons */}
                <div className="flex flex-col gap-2">
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
                  <span>{t('auto_delete.default_for_new')}</span>
                </label>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Target Peer Identifier */}
                <div className="p-3.5 rounded-xl bg-dark-900/60 border border-white/5 space-y-2">
                  <label className="text-[11px] font-semibold text-gray-300">
                    Target Peer ID / Username
                  </label>
                  <input
                    type="text"
                    value={ephemeralTargetPeer}
                    onChange={(e) => setEphemeralTargetPeer(e.target.value)}
                    placeholder="e.g. 12345678 or @username"
                    className="w-full px-3 py-1.5 rounded-lg bg-dark-800 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-cyan/50 font-mono"
                  />
                </div>

                {/* Section 1: Ephemeral Welcome Messages */}
                <div className="p-3.5 rounded-xl bg-dark-900/60 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent-cyan" />
                      <span className="text-xs font-bold text-white">Welcome Messages Suite</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isFetchingWelcome}
                        onClick={handleFetchWelcomeMessages}
                        className="px-2 py-1 rounded-lg bg-accent-cyan/15 hover:bg-accent-cyan/25 text-accent-cyan text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                      >
                        {isFetchingWelcome ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        <span>Fetch</span>
                      </button>
                      <button
                        type="button"
                        disabled={isActionLoading || !welcomeMessages || welcomeMessages.length === 0}
                        onClick={handleDeleteAllWelcomeMessages}
                        className="px-2 py-1 rounded-lg bg-accent-rose/15 hover:bg-accent-rose/25 text-accent-rose text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete All</span>
                      </button>
                    </div>
                  </div>

                  {/* List / Empty State */}
                  {isFetchingWelcome ? (
                    <div className="py-6 flex flex-col items-center justify-center gap-2 text-gray-400">
                      <Loader2 className="w-5 h-5 animate-spin text-accent-cyan" />
                      <span className="text-[11px]">Loading welcome messages via MTProto...</span>
                    </div>
                  ) : welcomeMessages === null ? (
                    <div className="py-4 text-center text-gray-500 text-[11px]">
                      Click "Fetch" to query active welcome messages for this peer.
                    </div>
                  ) : welcomeMessages.length === 0 ? (
                    <div className="py-4 text-center text-gray-400 text-[11px] bg-dark-800/40 rounded-lg border border-dashed border-white/5">
                      No ephemeral welcome messages configured for this peer.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {welcomeMessages.map((msg: any, idx: number) => (
                        <div
                          key={msg?.id || idx}
                          className="p-2 rounded-lg bg-dark-800 border border-white/5 flex items-center justify-between text-[11px]"
                        >
                          <div className="truncate max-w-[260px]">
                            <span className="font-mono text-accent-cyan mr-1.5">#{msg?.id}</span>
                            <span className="text-gray-300">{msg?.message || 'Media / Sticker Welcome'}</span>
                          </div>
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleDeleteWelcomeMessage(msg?.id)}
                            className="p-1 rounded text-gray-400 hover:text-accent-rose transition-colors cursor-pointer"
                            title="Delete this welcome message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 2: Send Ephemeral Message */}
                <div className="p-3.5 rounded-xl bg-dark-900/60 border border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Send Ephemeral Message</span>
                  </div>
                  <textarea
                    rows={2}
                    value={ephemeralText}
                    onChange={(e) => setEphemeralText(e.target.value)}
                    placeholder="Compose temporary ephemeral text..."
                    className="w-full px-3 py-2 rounded-lg bg-dark-800 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-cyan/50 resize-none"
                  />
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isWelcome}
                          onChange={(e) => setIsWelcome(e.target.checked)}
                          className="rounded bg-dark-800 border-white/20 text-accent-cyan focus:ring-0"
                        />
                        <span>Welcome Msg</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isNoForwards}
                          onChange={(e) => setIsNoForwards(e.target.checked)}
                          className="rounded bg-dark-800 border-white/20 text-accent-cyan focus:ring-0"
                        />
                        <span>No Forwards</span>
                      </label>
                    </div>
                    <button
                      type="button"
                      disabled={isActionLoading || !ephemeralText.trim()}
                      onClick={handleSendEphemeralMessage}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      <span>Dispatch</span>
                    </button>
                  </div>
                </div>

                {/* Section 3: Manage Ephemeral Message (Edit, Delete, Report, Callback) */}
                <div className="p-3.5 rounded-xl bg-dark-900/60 border border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Message Operations (Edit / Delete / Report)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400">Target Message ID</label>
                      <input
                        type="number"
                        value={targetMsgId}
                        onChange={(e) => setTargetMsgId(e.target.value)}
                        placeholder="e.g. 1024"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-dark-800 border border-white/10 text-xs text-white font-mono placeholder-gray-500 focus:outline-none focus:border-accent-cyan/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400">New Text (for edit)</label>
                      <input
                        type="text"
                        value={editMsgText}
                        onChange={(e) => setEditMsgText(e.target.value)}
                        placeholder="Updated text..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-dark-800 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-cyan/50"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isActionLoading || !targetMsgId || !editMsgText.trim()}
                      onClick={handleEditEphemeralMessage}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit Msg</span>
                    </button>
                    <button
                      type="button"
                      disabled={isActionLoading || !targetMsgId}
                      onClick={handleDeleteEphemeralMessage}
                      className="px-2.5 py-1 rounded-lg bg-accent-rose/15 hover:bg-accent-rose/25 text-accent-rose text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete Msg</span>
                    </button>
                    <button
                      type="button"
                      disabled={isActionLoading || !targetMsgId}
                      onClick={handleReportEphemeralMessage}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>Report</span>
                    </button>
                    <button
                      type="button"
                      disabled={isActionLoading || !targetMsgId}
                      onClick={handleGetCallbackAnswer}
                      className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Callback Answer</span>
                    </button>
                  </div>
                </div>

                {/* Action Result Inspector */}
                {actionResult && (
                  <div className="p-3 rounded-xl bg-dark-900 border border-white/5 space-y-1.5">
                    <div className="text-[10px] text-gray-400 font-mono">Last MTProto Result:</div>
                    <pre className="text-[10px] text-accent-cyan font-mono overflow-x-auto max-h-24 bg-dark-950 p-2 rounded">
                      {JSON.stringify(actionResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Save Button (Only active on timer tab) */}
          {activeTab === 'timer' && (
            <div className="pt-3 border-t border-white/5 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
              >
                {t('auto_delete.cancel')}
              </button>
              <button
                type="button"
                disabled={isApplying}
                onClick={handleApplyTimer}
                className="flex-1 py-2 rounded-xl bg-primary-500 hover:bg-primary-400 text-white font-bold text-xs transition-all shadow-glow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isApplying ? (
                  <span>Saving...</span>
                ) : (
                  <span>{t('auto_delete.set_timer')}</span>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
