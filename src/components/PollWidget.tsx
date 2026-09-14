import React, { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lock,
  Users,
  Award,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Vote,
} from 'lucide-react'
import { useI18n } from '../i18n'
import type { MessageItem, PollItem, PollOptionItem } from '../types/telegram'
import { formatNumber } from '../utils/textUtils'

interface PollWidgetProps {
  message: MessageItem
  accountId: string
  chatId: string
  onVoteSuccess?: () => void
}

export const PollWidget: React.FC<PollWidgetProps> = ({
  message,
  accountId,
  chatId,
  onVoteSuccess,
}) => {
  const { t } = useI18n()
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const [localVoted, setLocalVoted] = useState(false)

  const poll = message.poll
  if (!poll) return null

  // Has user already voted on server or locally?
  const hasUserVoted = localVoted || poll.answers.some((a) => a.chosen)
  const isClosed = poll.closed
  const canVote = !hasUserVoted && !isClosed
  const totalVoters = poll.totalVoters || 0

  const handleSelectOption = (opt: PollOptionItem) => {
    if (!canVote) return
    if (poll.multipleChoice) {
      setSelectedOptions((prev) =>
        prev.includes(opt.option) ? prev.filter((o) => o !== opt.option) : [...prev, opt.option]
      )
    } else {
      setSelectedOptions([opt.option])
    }
  }

  const handleVoteSubmit = async () => {
    if (selectedOptions.length === 0 || !canVote || isSubmitting) return
    if (!window.guidegram?.sendVote) return

    setIsSubmitting(true)
    try {
      const ok = await window.guidegram.sendVote(accountId, chatId, message.id, selectedOptions)
      if (ok) {
        setLocalVoted(true)
        onVoteSuccess?.()
      }
    } catch (err) {
      console.warn('[PollWidget] Vote failed:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md my-1.5 p-4 rounded-2xl bg-dark-850/80 border border-white/10 shadow-lg select-none backdrop-blur-md">
      {/* Header with question and badges */}
      <div className="space-y-2 mb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-gray-100 leading-snug break-words">
            {poll.question}
          </h3>
          {isClosed && (
            <span className="shrink-0 p-1 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] flex items-center gap-1 font-semibold">
              <Lock className="w-3 h-3" />
              <span>{t('poll.closed')}</span>
            </span>
          )}
        </div>

        {/* Poll Type Badges */}
        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-primary-400" />
            <span>{poll.publicVoters ? t('poll.public') : t('poll.anonymous')}</span>
          </span>
          <span>•</span>
          {poll.quiz ? (
            <span className="flex items-center gap-1 text-amber-400">
              <Award className="w-3 h-3" />
              <span>{t('poll.quiz')}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-cyan-400">
              <Vote className="w-3 h-3" />
              <span>{poll.multipleChoice ? t('poll.multiple_choice') : t('poll.single_choice')}</span>
            </span>
          )}
        </div>
      </div>

      {/* Answers / Options list */}
      <div className="space-y-2">
        {poll.answers.map((ans, idx) => {
          const isChosen = ans.chosen || (localVoted && selectedOptions.includes(ans.option))
          const isSelected = selectedOptions.includes(ans.option)
          const pct = totalVoters > 0 ? Math.round(((ans.voters || 0) / totalVoters) * 100) : 0

          return (
            <div
              key={ans.option || idx}
              onClick={() => canVote && handleSelectOption(ans)}
              className={`relative overflow-hidden rounded-xl border p-3 transition-all ${
                canVote
                  ? 'cursor-pointer hover:border-primary-500/50 hover:bg-white/5 active:scale-[0.99]'
                  : 'cursor-default'
              } ${
                poll.quiz && hasUserVoted
                  ? ans.correct
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : isChosen
                    ? 'border-rose-500/60 bg-rose-500/10'
                    : 'border-white/5 bg-dark-900/50'
                  : isChosen
                  ? 'border-primary-500/70 bg-primary-500/15'
                  : isSelected
                  ? 'border-primary-400 bg-primary-500/10'
                  : 'border-white/5 bg-dark-900/50'
              }`}
            >
              {/* Animated Progress Bar (Visible when voted or closed) */}
              {(hasUserVoted || isClosed) && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 rounded-xl ${
                    poll.quiz
                      ? ans.correct
                        ? 'bg-emerald-500/20'
                        : isChosen
                        ? 'bg-rose-500/20'
                        : 'bg-white/5'
                      : isChosen
                      ? 'bg-primary-500/25'
                      : 'bg-white/5'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              )}

              {/* Option Content */}
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {canVote ? (
                    // Selection indicator (Radio vs Checkbox)
                    <div
                      className={`w-4 h-4 rounded-${
                        poll.multipleChoice ? 'md' : 'full'
                      } border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'border-primary-400 bg-primary-500 text-white'
                          : 'border-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {isSelected && (
                        <span
                          className={`w-1.5 h-1.5 rounded-${
                            poll.multipleChoice ? 'xs' : 'full'
                          } bg-white`}
                        />
                      )}
                    </div>
                  ) : (
                    // Voted / Result icon
                    poll.quiz ? (
                      ans.correct ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : isChosen ? (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-gray-600 shrink-0" />
                      )
                    ) : isChosen ? (
                      <CheckCircle2 className="w-4 h-4 text-primary-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-600 shrink-0" />
                    )
                  )}

                  <span
                    className={`text-xs font-medium leading-relaxed break-words ${
                      isChosen ? 'text-gray-100 font-bold' : 'text-gray-200'
                    }`}
                  >
                    {ans.text}
                  </span>
                </div>

                {/* Percentage & Vote Count (When voted or closed) */}
                {(hasUserVoted || isClosed) && (
                  <div className="shrink-0 flex items-center gap-1.5 text-right font-mono">
                    <span className="text-xs font-bold text-gray-200">{pct}%</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Vote Action Button (When not voted and option selected) */}
      {canVote && selectedOptions.length > 0 && (
        <button
          type="button"
          onClick={handleVoteSubmit}
          disabled={isSubmitting}
          className="w-full mt-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 active:scale-98 text-white font-bold text-xs transition-all shadow-glow flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{t('poll.submitting')}</span>
            </>
          ) : (
            <span>{t('poll.vote')}</span>
          )}
        </button>
      )}

      {/* Quiz Solution / Explanation Drawer */}
      {poll.quiz && poll.solution && hasUserVoted && (
        <div className="mt-3 pt-2.5 border-t border-white/5">
          <button
            type="button"
            onClick={() => setShowSolution(!showSolution)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{t('poll.view_explanation')}</span>
            {showSolution ? (
              <ChevronUp className="w-3.5 h-3.5 ml-auto" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-auto" />
            )}
          </button>
          {showSolution && (
            <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed animate-in fade-in duration-200">
              {poll.solution}
            </div>
          )}
        </div>
      )}

      {/* Footer: Total Voters */}
      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
        <span>
          {formatNumber(totalVoters)} {t('poll.total_votes')}
        </span>
      </div>
    </div>
  )
}
export default PollWidget
