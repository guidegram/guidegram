import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Trophy, X, Medal, Play, Loader2, Sparkles, RefreshCw } from 'lucide-react'
import { GameHighScoreItem } from '../types/telegram'
import { useI18n } from '../i18n'

interface GameScoreModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  peerId: string
  messageId: number
  gameTitle?: string
}

export const GameScoreModal: React.FC<GameScoreModalProps> = ({
  isOpen,
  onClose,
  accountId,
  peerId,
  messageId,
  gameTitle = 'Telegram Game',
}) => {
  const { t, language } = useI18n()
  const isPersian = language === 'fa'
  const [scores, setScores] = useState<GameHighScoreItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchScores = async () => {
    if (!isOpen || !accountId || !peerId || !messageId) return
    setIsLoading(true)
    try {
      if (window.guidegram?.getGameHighScores) {
        const res: any = await window.guidegram.getGameHighScores(accountId, peerId, messageId)
        if (res?.scores) {
          const list: GameHighScoreItem[] = res.scores.map((s: any, idx: number) => ({
            pos: s.pos || idx + 1,
            userId: String(s.userId || s.user_id),
            score: Number(s.score || 0),
            userName: s.userName || `Player ${s.userId || idx + 1}`,
          }))
          setScores(list)
        }
      }
    } catch (err) {
      console.warn('Failed to fetch game high scores:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchScores()
  }, [isOpen, accountId, peerId, messageId])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-sm bg-dark-850 border border-white/10 rounded-2xl p-5 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-accent-amber/15 text-accent-amber flex items-center justify-center">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{gameTitle}</h3>
                <p className="text-[11px] text-gray-400">
                  {isPersian ? 'جدول برترین امتیازات' : 'High Scores Leaderboard'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={fetchScores}
                disabled={isLoading}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scores List */}
          <div className="my-4 max-h-64 overflow-y-auto flex flex-col gap-1.5">
            {isLoading && scores.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-gray-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-accent-cyan" />
                <span className="text-xs">{isPersian ? 'در حال بارگذاری امتیازها...' : 'Loading scores...'}</span>
              </div>
            ) : scores.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                {isPersian ? 'هنوز امتیازی برای این بازی ثبت نشده است.' : 'No scores recorded yet for this game.'}
              </div>
            ) : (
              scores.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded-xl border ${
                    index === 0
                      ? 'bg-accent-amber/10 border-accent-amber/30 text-accent-amber'
                      : index === 1
                      ? 'bg-gray-400/10 border-gray-400/20 text-gray-200'
                      : index === 2
                      ? 'bg-accent-amber/5 border-accent-amber/20 text-amber-600'
                      : 'bg-dark-900 border-white/5 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 text-center font-bold text-xs">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${item.pos}.`}
                    </span>
                    <span className="text-xs font-semibold truncate">{item.userName}</span>
                  </div>
                  <span className="font-mono font-bold text-xs shrink-0 pl-2">{item.score.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>

          {/* Footer Close */}
          <div className="pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              {isPersian ? 'بستن' : 'Close'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
