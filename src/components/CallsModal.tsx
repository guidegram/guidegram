import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Video,
  RefreshCw,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { CallLogItem } from '../types/telegram'
import { Avatar } from './Avatar'
import { useI18n } from '../i18n'

interface CallsModalProps {
  isOpen: boolean
  onClose: () => void
  accountId?: string
  onSelectPeer: (peerId: string) => void
}

type CallFilter = 'all' | 'missed'

const startOfDay = (date: Date) => {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy.getTime()
}

const formatDuration = (seconds: number) => {
  if (!seconds || seconds <= 0) return ''
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

const getCallSubtitle = (call: CallLogItem) => {
  if (call.isMissed) return 'Missed'
  if (call.reason === 'busy') return 'Busy'
  if (call.reason === 'disconnect') return 'Disconnected'
  if (call.duration > 0) return formatDuration(call.duration)
  if (call.isOutgoing) return 'Cancelled'
  return 'No answer'
}

export const CallsModal: React.FC<CallsModalProps> = ({
  isOpen,
  onClose,
  accountId,
  onSelectPeer,
}) => {
  const { isRTL } = useI18n()
  const [items, setItems] = useState<CallLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<CallFilter>('all')
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!isOpen || !accountId) return
    let mounted = true

    if (reloadToken === 0) setLoading(true)
    else setRefreshing(true)
    setError(null)

    window.guidegram
      ?.getCallLog(accountId, 100, 0, filter === 'missed')
      .then((result) => {
        if (!mounted) return
        setItems(Array.isArray(result?.items) ? result.items : [])
        setTotal(Number(result?.total || 0))
      })
      .catch((err) => {
        if (!mounted) return
        console.error('Failed to load call log:', err)
        setError('Could not load your Telegram call history.')
        setItems([])
        setTotal(0)
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
        setRefreshing(false)
      })

    return () => {
      mounted = false
    }
  }, [isOpen, accountId, filter, reloadToken])

  useEffect(() => {
    if (!isOpen) {
      setFilter('all')
      setItems([])
      setTotal(0)
      setError(null)
    }
  }, [isOpen])

  const groups = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.date - a.date)
    const map = new Map<number, CallLogItem[]>()
    for (const call of sorted) {
      const key = startOfDay(new Date(call.date * 1000))
      const list = map.get(key)
      if (list) list.push(call)
      else map.set(key, [call])
    }
    return Array.from(map.entries()).map(([key, calls]) => ({ day: key, calls }))
  }, [items])

  const formatDayLabel = (day: number) => {
    const now = new Date()
    const target = new Date(day)
    const today = startOfDay(now)
    const yesterday = today - 24 * 60 * 60 * 1000
    if (day === today) return 'Today'
    if (day === yesterday) return 'Yesterday'
    return target.toLocaleDateString(isRTL ? 'fa-IR' : undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="bg-[#17212b] border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[72vh] max-h-[640px] select-none"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Phone className="w-5 h-5 text-accent-cyan" />
            <span className="font-bold text-base text-white">Calls</span>
            <span className="text-xs text-gray-400 font-mono">({total})</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setReloadToken((value) => value + 1)}
              disabled={loading || refreshing}
              title="Refresh call history"
              className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading || refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-3 pt-3 pb-2 border-b border-white/5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-dark-900 text-gray-400 hover:text-white'
            }`}
          >
            All calls
          </button>
          <button
            type="button"
            onClick={() => setFilter('missed')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              filter === 'missed'
                ? 'bg-red-500/90 text-white'
                : 'bg-dark-900 text-gray-400 hover:text-white'
            }`}
          >
            Missed
          </button>
        </div>

        {/* Call list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading call history...</div>
          ) : error ? (
            <div className="p-8 flex flex-col items-center gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <div className="text-xs text-gray-400">{error}</div>
              <button
                type="button"
                onClick={() => setReloadToken((value) => value + 1)}
                className="text-xs font-semibold text-accent-cyan hover:underline cursor-pointer"
              >
                Try again
              </button>
            </div>
          ) : groups.length === 0 ? (
            <div className="p-10 flex flex-col items-center gap-3 text-center">
              <Clock className="w-10 h-10 text-gray-600" />
              <div className="text-sm font-semibold text-gray-300">
                {filter === 'missed' ? 'No missed calls' : 'No calls yet'}
              </div>
              <div className="text-xs text-gray-500 max-w-[240px]">
                Your Telegram call history will appear here automatically.
              </div>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.day}>
                <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-500 bg-dark-900/60 sticky top-0 backdrop-blur-sm">
                  {formatDayLabel(group.day)}
                </div>
                <div className="divide-y divide-white/5">
                  {group.calls.map((call) => {
                    const isMissed = call.isMissed
                    const Icon = isMissed
                      ? PhoneMissed
                      : call.isOutgoing
                        ? PhoneOutgoing
                        : PhoneIncoming
                    const time = new Date(call.date * 1000).toLocaleTimeString(
                      isRTL ? 'fa-IR' : undefined,
                      { hour: '2-digit', minute: '2-digit' }
                    )
                    const subtitle = getCallSubtitle(call)

                    return (
                      <motion.button
                        whileHover={{ scale: 1.01, x: 2 }}
                        whileTap={{ scale: 0.985 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                        key={`${call.peerId}_${call.id}`}
                        type="button"
                        onClick={() => {
                          onClose()
                          onSelectPeer(call.peerId)
                        }}
                        className="w-full text-left rtl:text-right px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <Avatar
                          accountId={accountId}
                          peerId={call.peerId}
                          title={call.title}
                          initials={call.title.charAt(0)}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-sm font-semibold truncate ${
                                isMissed ? 'text-red-400' : 'text-gray-100'
                              }`}
                            >
                              {call.title}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono shrink-0">
                              {time}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-400">
                            <Icon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isMissed
                                  ? 'text-red-400'
                                  : call.isOutgoing
                                    ? 'text-emerald-400'
                                    : 'text-accent-cyan'
                              }`}
                            />
                            {call.isVideo && <Video className="w-3.5 h-3.5 shrink-0" />}
                            <span className="truncate">{subtitle}</span>
                            {call.username && (
                              <span className="text-gray-600 truncate">@{call.username}</span>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-white/5 text-[10px] text-gray-500 text-center">
          Synced from your Telegram call history
        </div>
      </motion.div>
    </div>
  )
}
