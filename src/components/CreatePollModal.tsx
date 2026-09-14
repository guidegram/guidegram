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
} from 'lucide-react'
import { useI18n } from '../i18n'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-dark-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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

        {/* Form Body */}
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
      </div>
    </div>
  )
}
export default CreatePollModal
