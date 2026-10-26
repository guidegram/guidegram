import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  Rocket,
  Sparkles,
  Check,
  Copy,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Zap,
  Palette,
  Image,
  Smile,
  Mic,
  Crown,
} from 'lucide-react'
import { useI18n } from '../../i18n'
import { copyTextToClipboard } from '../../utils/clipboard'
import type { ChannelBoostStatus } from '../../types/telegram'

export interface ChannelBoostModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  channelId: string
  channelTitle: string
}

export interface BoostPerk {
  level: number
  title: string
  description: string
  icon: React.ReactNode
}

const BOOST_PERKS: BoostPerk[] = [
  {
    level: 1,
    title: '1 Story Daily',
    description: 'Post up to 1 story per day for all subscribers to view.',
    icon: <Sparkles className="w-4 h-4 text-accent-cyan" />,
  },
  {
    level: 2,
    title: 'Custom Wallpaper',
    description: 'Set a distinctive custom background wallpaper for the channel.',
    icon: <Image className="w-4 h-4 text-emerald-400" />,
  },
  {
    level: 3,
    title: 'Channel Cloud Themes',
    description: 'Choose tailored cloud theme colors for channel bubbles and accents.',
    icon: <Palette className="w-4 h-4 text-violet-400" />,
  },
  {
    level: 4,
    title: 'Custom Emoji Status',
    description: 'Display an official custom animated emoji status next to channel name.',
    icon: <Smile className="w-4 h-4 text-amber-400" />,
  },
  {
    level: 5,
    title: 'Extended Story Reactions',
    description: 'Subscribers can react with up to 10 unique custom emojis on stories.',
    icon: <Zap className="w-4 h-4 text-rose-400" />,
  },
  {
    level: 6,
    title: 'Speech-to-Text Recognition',
    description: 'Unlimited voice note and video message transcriptions for subscribers.',
    icon: <Mic className="w-4 h-4 text-blue-400" />,
  },
]

export const ChannelBoostModal: React.FC<ChannelBoostModalProps> = ({
  isOpen,
  onClose,
  accountId,
  channelId,
  channelTitle,
}) => {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [boosting, setBoosting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [boostStatus, setBoostStatus] = useState<ChannelBoostStatus | null>(null)

  useEffect(() => {
    if (!isOpen || !accountId || !channelId) return
    let active = true
    setLoading(true)

    window.guidegram
      ?.getChannelBoostStatus?.(accountId, channelId)
      .then((status) => {
        if (!active) return
        setBoostStatus(status || null)
      })
      .catch((err) => {
        if (!active) return
        console.warn('[ChannelBoostModal] Failed to load boost status:', err)
        setBoostStatus(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [isOpen, accountId, channelId])

  if (!isOpen) return null

  const handleCopyLink = async () => {
    if (!boostStatus?.boostUrl) return
    await copyTextToClipboard(boostStatus.boostUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleApplyBoost = async () => {
    if (boosting) return
    setBoosting(true)
    try {
      if (window.guidegram?.applyChannelBoost) {
        await window.guidegram.applyChannelBoost(accountId, channelId)
      }
      // Re-fetch boost status
      const updated = await window.guidegram?.getChannelBoostStatus?.(accountId, channelId)
      if (updated) {
        setBoostStatus(updated)
      } else {
        setBoostStatus((prev) =>
          prev
            ? {
                ...prev,
                boosts: prev.boosts + 1,
                myBoost: true,
              }
            : null
        )
      }
    } catch (err) {
      console.warn('[ChannelBoostModal] applyChannelBoost error:', err)
    } finally {
      setBoosting(false)
    }
  }

  const currentLevel = boostStatus?.level ?? 0
  const boosts = boostStatus?.boosts ?? 0
  const nextBoosts = boostStatus?.nextLevelBoosts ?? 0
  const progressPercent = nextBoosts > 0 ? Math.min(100, Math.round((boosts / nextBoosts) * 100)) : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative flex flex-col w-full max-w-md bg-dark-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="h-14 px-4 bg-dark-850/90 border-b border-white/10 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-primary-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <Rocket className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white leading-tight">Channel Boosts</span>
              <span className="text-[10px] text-gray-400 truncate max-w-[200px]">{channelTitle}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
              <span className="text-xs">Loading channel boost statistics…</span>
            </div>
          ) : (
            <>
              {/* Level & Progress Hero */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900/30 via-primary-950/40 to-dark-850 border border-violet-500/20 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-white tracking-wide">
                      Level {currentLevel}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-primary-500/20 border border-primary-500/30 text-[10px] font-semibold text-primary-300">
                      Active
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-violet-300">
                    {boosts} / {nextBoosts} boosts
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 rounded-full bg-black/40 overflow-hidden p-0.5 border border-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 via-primary-500 to-accent-cyan shadow-glow"
                  />
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-400">
                  <span>{nextBoosts - boosts} more boosts to Level {currentLevel + 1}</span>
                  <span className="font-mono text-gray-300">{progressPercent}%</span>
                </div>
              </div>

              {/* Action Buttons: Boost & Share Link */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleApplyBoost}
                  disabled={boosting}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-primary-600 hover:from-violet-500 hover:to-primary-500 text-white text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {boosting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Rocket className="w-3.5 h-3.5" />
                  )}
                  <span>Boost Channel</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-accent-emerald" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copied ? 'Link Copied!' : 'Copy Boost Link'}</span>
                </button>
              </div>

              {/* Perks List */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Channel Level Perks
                </span>

                <div className="space-y-1.5">
                  {BOOST_PERKS.map((perk) => {
                    const isUnlocked = currentLevel >= perk.level
                    return (
                      <div
                        key={perk.level}
                        className={`p-2.5 rounded-xl border transition-colors flex items-center gap-3 ${
                          isUnlocked
                            ? 'bg-white/[0.04] border-white/10 text-white'
                            : 'bg-transparent border-white/5 text-gray-500 opacity-60'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isUnlocked ? 'bg-white/10' : 'bg-white/5 text-gray-600'
                          }`}
                        >
                          {perk.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold leading-tight">{perk.title}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/30 font-mono text-gray-400">
                              Lvl {perk.level}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400 block truncate">
                            {perk.description}
                          </span>
                        </div>

                        {isUnlocked ? (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <span className="text-[10px] font-semibold text-gray-600 shrink-0">
                            Locked
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
