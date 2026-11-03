import React, { useState } from 'react'
import {
  X,
  Plus,
  Trash2,
  HelpCircle,
  Award,
  Vote,
  Users,
  Check,
  RefreshCw,
  Clock,
  Bookmark,
  Share2,
  MessageSquare,
  AlertCircle,
  CheckCheck,
  ShieldAlert,
} from 'lucide-react'
import { useI18n } from '../i18n'
import { motion, AnimatePresence } from 'motion/react'

interface CreatePollModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  chatId: string
  onSuccess?: () => void
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isOpen,
  onClose,
  accountId,
  chatId,
  onSuccess,
}) => {
  const { t } = useI18n()
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [isMultipleChoice, setIsMultipleChoice] = useState(false)
  const [isQuiz, setIsQuiz] = useState(false)
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number>(0)
  const [explanation, setExplanation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Layer 232 Poll & Messages Operations (Microphase 037)
  const [activeModalTab, setActiveModalTab] = useState<'create' | 'maintenance'>('create')

  // 1. messages.deletePollAnswer
  const [retractPollMsgId, setRetractPollMsgId] = useState('')
  const [isRetractingPollVote, setIsRetractingPollVote] = useState(false)
  const [retractPollFeedback, setRetractPollFeedback] = useState<string | null>(null)

  // 2. messages.deleteScheduledMessages
  const [scheduledMsgId, setScheduledMsgId] = useState('')
  const [isDeletingScheduled, setIsDeletingScheduled] = useState(false)
  const [deleteScheduledFeedback, setDeleteScheduledFeedback] = useState<string | null>(null)

  // 3. messages.deleteQuickReplyShortcut & deleteQuickReplyMessages
  const [quickReplyShortcutId, setQuickReplyShortcutId] = useState('')
  const [isDeletingQuickReply, setIsDeletingQuickReply] = useState(false)
  const [deleteQuickReplyFeedback, setDeleteQuickReplyFeedback] = useState<string | null>(null)

  // 4. messages.deleteRevokedExportedChatInvites
  const [isDeletingRevokedInvites, setIsDeletingRevokedInvites] = useState(false)
  const [deleteRevokedInvitesFeedback, setDeleteRevokedInvitesFeedback] = useState<string | null>(null)

  // 5. messages.deleteSavedHistory
  const [savedHistoryMaxId, setSavedHistoryMaxId] = useState('')
  const [isDeletingSavedHistory, setIsDeletingSavedHistory] = useState(false)
  const [deleteSavedHistoryFeedback, setDeleteSavedHistoryFeedback] = useState<string | null>(null)

  // 6. messages.deleteTopicHistory
  const [topicTopMsgId, setTopicTopMsgId] = useState('')
  const [isDeletingTopicHistory, setIsDeletingTopicHistory] = useState(false)
  const [deleteTopicHistoryFeedback, setDeleteTopicHistoryFeedback] = useState<string | null>(null)

  const handleRetractPollVote = async (e: React.FormEvent) => {
    e.preventDefault()
    const msgIdNum = Number(retractPollMsgId.trim())
    if (!msgIdNum || !window.guidegram?.deletePollAnswer) return
    setIsRetractingPollVote(true)
    setRetractPollFeedback(null)
    try {
      const res = await window.guidegram.deletePollAnswer(accountId, chatId, msgIdNum)
      if (res) {
        setRetractPollFeedback(`Poll vote retracted on message #${msgIdNum}.`)
        setRetractPollMsgId('')
      } else {
        setRetractPollFeedback('Failed to retract vote. Ensure poll allows vote retraction.')
      }
    } catch (err: any) {
      setRetractPollFeedback(err?.message || 'Error retracting poll vote.')
    } finally {
      setIsRetractingPollVote(false)
    }
  }

  const handleDeleteScheduledMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const msgIdNum = Number(scheduledMsgId.trim())
    if (!msgIdNum || !window.guidegram?.deleteScheduledMessages) return
    setIsDeletingScheduled(true)
    setDeleteScheduledFeedback(null)
    try {
      const res = await window.guidegram.deleteScheduledMessages(accountId, chatId, [msgIdNum])
      if (res) {
        setDeleteScheduledFeedback(`Scheduled message #${msgIdNum} deleted.`)
        setScheduledMsgId('')
      } else {
        setDeleteScheduledFeedback('Failed to delete scheduled message.')
      }
    } catch (err: any) {
      setDeleteScheduledFeedback(err?.message || 'Error deleting scheduled message.')
    } finally {
      setIsDeletingScheduled(false)
    }
  }

  const handleDeleteQuickReplyShortcut = async (e: React.FormEvent) => {
    e.preventDefault()
    const shortcutNum = Number(quickReplyShortcutId.trim())
    if (!shortcutNum || !window.guidegram?.deleteQuickReplyShortcut) return
    setIsDeletingQuickReply(true)
    setDeleteQuickReplyFeedback(null)
    try {
      const res = await window.guidegram.deleteQuickReplyShortcut(accountId, shortcutNum)
      if (res) {
        setDeleteQuickReplyFeedback(`Quick reply shortcut #${shortcutNum} deleted.`)
        setQuickReplyShortcutId('')
      } else {
        setDeleteQuickReplyFeedback('Failed to delete quick reply shortcut.')
      }
    } catch (err: any) {
      setDeleteQuickReplyFeedback(err?.message || 'Error deleting shortcut.')
    } finally {
      setIsDeletingQuickReply(false)
    }
  }

  const handleDeleteRevokedInvites = async () => {
    if (!window.guidegram?.deleteRevokedExportedChatInvites) return
    setIsDeletingRevokedInvites(true)
    setDeleteRevokedInvitesFeedback(null)
    try {
      const res = await window.guidegram.deleteRevokedExportedChatInvites(accountId, chatId)
      if (res) {
        setDeleteRevokedInvitesFeedback('All revoked invite links permanently removed.')
      } else {
        setDeleteRevokedInvitesFeedback('Failed to purge revoked invite links.')
      }
    } catch (err: any) {
      setDeleteRevokedInvitesFeedback(err?.message || 'Error deleting revoked invites.')
    } finally {
      setIsDeletingRevokedInvites(false)
    }
  }

  const handleDeleteSavedHistory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!window.guidegram?.deleteSavedHistory) return
    setIsDeletingSavedHistory(true)
    setDeleteSavedHistoryFeedback(null)
    try {
      const res = await window.guidegram.deleteSavedHistory(accountId, {
        peerId: chatId,
        maxId: Number(savedHistoryMaxId.trim()) || undefined,
      })
      if (res) {
        setDeleteSavedHistoryFeedback('Saved history thread cleared successfully.')
        setSavedHistoryMaxId('')
      } else {
        setDeleteSavedHistoryFeedback('Failed to clear saved history thread.')
      }
    } catch (err: any) {
      setDeleteSavedHistoryFeedback(err?.message || 'Error clearing saved history.')
    } finally {
      setIsDeletingSavedHistory(false)
    }
  }

  const handleDeleteTopicHistory = async (e: React.FormEvent) => {
    e.preventDefault()
    const topMsgIdNum = Number(topicTopMsgId.trim())
    if (!topMsgIdNum || !window.guidegram?.deleteTopicHistory) return
    setIsDeletingTopicHistory(true)
    setDeleteTopicHistoryFeedback(null)
    try {
      const res = await window.guidegram.deleteTopicHistory(accountId, chatId, topMsgIdNum)
      if (res) {
        setDeleteTopicHistoryFeedback(`Topic #${topMsgIdNum} history cleared completely.`)
        setTopicTopMsgId('')
      } else {
        setDeleteTopicHistoryFeedback('Failed to clear topic history.')
      }
    } catch (err: any) {
      setDeleteTopicHistoryFeedback(err?.message || 'Error clearing topic history.')
    } finally {
      setIsDeletingTopicHistory(false)
    }
  }

  if (!isOpen) return null

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, ''])
    }
  }

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return
    const newOpts = options.filter((_, idx) => idx !== index)
    setOptions(newOpts)
    if (correctOptionIndex >= newOpts.length) {
      setCorrectOptionIndex(0)
    }
  }

  const handleOptionChange = (text: string, index: number) => {
    const newOpts = [...options]
    newOpts[index] = text
    setOptions(newOpts)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) {
      setErrorMsg(t('poll.error_empty_question'))
      return
    }

    const validOptions = options.map((o) => o.trim()).filter(Boolean)
    if (validOptions.length < 2) {
      setErrorMsg(t('poll.error_min_options'))
      return
    }

    if (!window.guidegram?.createPoll) return

    setIsSubmitting(true)
    try {
      await window.guidegram.createPoll(accountId, chatId, trimmedQuestion, validOptions, {
        anonymous: isAnonymous,
        multipleChoice: isQuiz ? false : isMultipleChoice,
        quiz: isQuiz,
        correctOptionIndex: isQuiz ? correctOptionIndex : undefined,
        solution: isQuiz && explanation.trim() ? explanation.trim() : undefined,
      })

      onSuccess?.()
      onClose()
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create poll')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md select-none"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 10 }}
        transition={{ type: 'spring', damping: 26, stiffness: 360 }}
        className="relative w-full max-w-lg bg-dark-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-dark-850/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary-500/10 text-primary-400">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-100">{t('poll.create_title')}</h2>
              <p className="text-xs text-gray-400">{t('poll.create_desc')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-dark-900/60 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveModalTab('create')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeModalTab === 'create'
                ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Vote className="w-3.5 h-3.5" />
            <span>Create Poll</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModalTab('maintenance')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeModalTab === 'maintenance'
                ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Poll & History Purge</span>
          </button>
        </div>

        {activeModalTab === 'create' ? (
          /* Form Body */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Question Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-300">{t('poll.question_label')}</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t('poll.question_placeholder')}
              className="w-full px-3.5 py-2 text-xs bg-dark-950/70 border border-white/10 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-all"
              required
            />
          </div>

          {/* Options Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300">{t('poll.options_label')}</label>
              <span className="text-[11px] text-gray-500">{options.length} / 10</span>
            </div>

            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {isQuiz && (
                    <button
                      type="button"
                      onClick={() => setCorrectOptionIndex(idx)}
                      title={t('poll.mark_correct')}
                      className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                        correctOptionIndex === idx
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-gray-600 hover:border-emerald-400 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(e.target.value, idx)}
                    placeholder={`${t('poll.option_placeholder')} ${idx + 1}`}
                    className="flex-1 px-3 py-2 text-xs bg-dark-950/70 border border-white/10 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-all"
                    required
                  />

                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-2 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('poll.add_option')}</span>
              </button>
            )}
          </div>

          {/* Settings Toggles */}
          <div className="space-y-3 pt-3 border-t border-white/10">
            <h4 className="text-xs font-bold text-gray-300">{t('poll.settings_title')}</h4>

            {/* Anonymous */}
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-dark-800/40 border border-white/5 cursor-pointer hover:bg-dark-800/70 transition-all">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-primary-400" />
                <div>
                  <div className="text-xs font-semibold text-gray-200">{t('poll.anonymous')}</div>
                  <div className="text-[10px] text-gray-400">{t('poll.anonymous_desc')}</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded text-primary-500 focus:ring-primary-500/30"
              />
            </label>

            {/* Multiple Choice (only if not quiz) */}
            {!isQuiz && (
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-dark-800/40 border border-white/5 cursor-pointer hover:bg-dark-800/70 transition-all">
                <div className="flex items-center gap-2.5">
                  <Vote className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-xs font-semibold text-gray-200">{t('poll.multiple_choice')}</div>
                    <div className="text-[10px] text-gray-400">{t('poll.multiple_choice_desc')}</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isMultipleChoice}
                  onChange={(e) => setIsMultipleChoice(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-500 focus:ring-primary-500/30"
                />
              </label>
            )}

            {/* Quiz Mode */}
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-dark-800/40 border border-white/5 cursor-pointer hover:bg-dark-800/70 transition-all">
              <div className="flex items-center gap-2.5">
                <Award className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-semibold text-gray-200">{t('poll.quiz')}</div>
                  <div className="text-[10px] text-gray-400">{t('poll.quiz_desc')}</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isQuiz}
                onChange={(e) => {
                  setIsQuiz(e.target.checked)
                  if (e.target.checked) setIsMultipleChoice(false)
                }}
                className="w-4 h-4 rounded text-primary-500 focus:ring-primary-500/30"
              />
            </label>

            {/* Quiz Explanation */}
            {isQuiz && (
              <div className="space-y-1 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{t('poll.explanation_label')}</span>
                </div>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder={t('poll.explanation_placeholder')}
                  rows={2}
                  className="w-full px-3 py-1.5 text-xs bg-dark-950/70 border border-white/10 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-400 transition-all resize-none"
                />
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 active:scale-98 text-white font-bold text-xs transition-all shadow-glow flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('poll.creating')}</span>
                </>
              ) : (
                <span>{t('poll.create_button')}</span>
              )}
            </button>
          </div>
        </form>
        ) : (
          /* Maintenance View (Microphase 037 Layer 232 Ops) */
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
            {/* Section 1: Retract Poll Vote */}
            <form onSubmit={handleRetractPollVote} className="p-3 bg-dark-850/60 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-primary-400 font-bold">
                <Vote className="w-4 h-4" />
                <span>Retract My Poll Vote (messages.deletePollAnswer)</span>
              </div>
              <p className="text-[11px] text-gray-400">Withdraw your recorded vote from an existing poll message in this chat.</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={retractPollMsgId}
                  onChange={(e) => setRetractPollMsgId(e.target.value)}
                  placeholder="Poll Message ID"
                  className="flex-1 px-3 py-1.5 bg-dark-950/70 border border-white/10 rounded-lg text-gray-200 text-xs focus:outline-none focus:border-primary-500"
                  required
                />
                <button
                  type="submit"
                  disabled={isRetractingPollVote}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isRetractingPollVote && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Retract</span>
                </button>
              </div>
              {retractPollFeedback && (
                <div className="p-2 rounded-lg bg-white/5 text-[11px] text-gray-300 border border-white/5 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                  <span>{retractPollFeedback}</span>
                </div>
              )}
            </form>

            {/* Section 2: Delete Scheduled Message */}
            <form onSubmit={handleDeleteScheduledMessage} className="p-3 bg-dark-850/60 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Clock className="w-4 h-4" />
                <span>Cancel Scheduled Message (messages.deleteScheduledMessages)</span>
              </div>
              <p className="text-[11px] text-gray-400">Cancel and remove a pending scheduled message before it gets delivered.</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={scheduledMsgId}
                  onChange={(e) => setScheduledMsgId(e.target.value)}
                  placeholder="Scheduled Msg ID"
                  className="flex-1 px-3 py-1.5 bg-dark-950/70 border border-white/10 rounded-lg text-gray-200 text-xs focus:outline-none focus:border-amber-400"
                  required
                />
                <button
                  type="submit"
                  disabled={isDeletingScheduled}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isDeletingScheduled && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Cancel Msg</span>
                </button>
              </div>
              {deleteScheduledFeedback && (
                <div className="p-2 rounded-lg bg-white/5 text-[11px] text-gray-300 border border-white/5 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{deleteScheduledFeedback}</span>
                </div>
              )}
            </form>

            {/* Section 3: Delete Quick Reply Shortcut */}
            <form onSubmit={handleDeleteQuickReplyShortcut} className="p-3 bg-dark-850/60 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-bold">
                <MessageSquare className="w-4 h-4" />
                <span>Delete Quick Reply Shortcut (messages.deleteQuickReplyShortcut)</span>
              </div>
              <p className="text-[11px] text-gray-400">Permanently remove a quick reply shortcut and all associated template messages.</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={quickReplyShortcutId}
                  onChange={(e) => setQuickReplyShortcutId(e.target.value)}
                  placeholder="Shortcut ID"
                  className="flex-1 px-3 py-1.5 bg-dark-950/70 border border-white/10 rounded-lg text-gray-200 text-xs focus:outline-none focus:border-indigo-400"
                  required
                />
                <button
                  type="submit"
                  disabled={isDeletingQuickReply}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isDeletingQuickReply && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Delete Shortcut</span>
                </button>
              </div>
              {deleteQuickReplyFeedback && (
                <div className="p-2 rounded-lg bg-white/5 text-[11px] text-gray-300 border border-white/5 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{deleteQuickReplyFeedback}</span>
                </div>
              )}
            </form>

            {/* Section 4: Purge Revoked Chat Invites */}
            <div className="p-3 bg-dark-850/60 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Share2 className="w-4 h-4" />
                <span>Purge Revoked Invites (messages.deleteRevokedExportedChatInvites)</span>
              </div>
              <p className="text-[11px] text-gray-400">Clear all revoked and expired invite links created by your account for this chat.</p>
              <button
                type="button"
                onClick={handleDeleteRevokedInvites}
                disabled={isDeletingRevokedInvites}
                className="w-full py-2 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 disabled:opacity-50 text-emerald-200 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {isDeletingRevokedInvites && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>Purge All Revoked Invite Links</span>
              </button>
              {deleteRevokedInvitesFeedback && (
                <div className="p-2 rounded-lg bg-white/5 text-[11px] text-gray-300 border border-white/5 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{deleteRevokedInvitesFeedback}</span>
                </div>
              )}
            </div>

            {/* Section 5: Delete Saved Messages History */}
            <form onSubmit={handleDeleteSavedHistory} className="p-3 bg-dark-850/60 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <Bookmark className="w-4 h-4" />
                <span>Clear Saved History (messages.deleteSavedHistory)</span>
              </div>
              <p className="text-[11px] text-gray-400">Clear saved message history up to a specific maximum message ID.</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={savedHistoryMaxId}
                  onChange={(e) => setSavedHistoryMaxId(e.target.value)}
                  placeholder="Max Msg ID (0 for all)"
                  className="flex-1 px-3 py-1.5 bg-dark-950/70 border border-white/10 rounded-lg text-gray-200 text-xs focus:outline-none focus:border-rose-400"
                  required
                />
                <button
                  type="submit"
                  disabled={isDeletingSavedHistory}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isDeletingSavedHistory && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Clear Saved</span>
                </button>
              </div>
              {deleteSavedHistoryFeedback && (
                <div className="p-2 rounded-lg bg-white/5 text-[11px] text-gray-300 border border-white/5 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{deleteSavedHistoryFeedback}</span>
                </div>
              )}
            </form>

            {/* Section 6: Purge Forum Topic History */}
            <form onSubmit={handleDeleteTopicHistory} className="p-3 bg-dark-850/60 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold">
                <ShieldAlert className="w-4 h-4" />
                <span>Purge Topic History (messages.deleteTopicHistory)</span>
              </div>
              <p className="text-[11px] text-gray-400">Completely purge message history of a forum topic by its root message ID.</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={topicTopMsgId}
                  onChange={(e) => setTopicTopMsgId(e.target.value)}
                  placeholder="Topic Root Msg ID"
                  className="flex-1 px-3 py-1.5 bg-dark-950/70 border border-white/10 rounded-lg text-gray-200 text-xs focus:outline-none focus:border-purple-400"
                  required
                />
                <button
                  type="submit"
                  disabled={isDeletingTopicHistory}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isDeletingTopicHistory && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Purge Topic</span>
                </button>
              </div>
              {deleteTopicHistoryFeedback && (
                <div className="p-2 rounded-lg bg-white/5 text-[11px] text-gray-300 border border-white/5 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>{deleteTopicHistoryFeedback}</span>
                </div>
              )}
            </form>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
export default CreatePollModal
