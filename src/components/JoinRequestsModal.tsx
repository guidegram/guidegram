import React, { useCallback, useEffect, useState } from 'react'
import {
  Check,
  CheckCheck,
  Clock,
  Loader2,
  Search,
  UserCheck,
  UserX,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import { ChatJoinRequestAction, ChatJoinRequestItem } from '../types/telegram'
import { useI18n } from '../i18n'
import { Avatar } from './Avatar'

export interface JoinRequestsModalProps {
  isOpen: boolean
  accountId: string
  chatId: string
  chatTitle: string
  link?: string
  onClose: () => void
  onResolved?: () => void
}

export const JoinRequestsModal: React.FC<JoinRequestsModalProps> = ({
  isOpen,
  accountId,
  chatId,
  chatTitle,
  link,
  onClose,
  onResolved,
}) => {
  const { t, language } = useI18n()
  const [requests, setRequests] = useState<ChatJoinRequestItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [bulkResolving, setBulkResolving] = useState<ChatJoinRequestAction | null>(null)
  const [confirmBulk, setConfirmBulk] = useState<ChatJoinRequestAction | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchRequests = useCallback(
    async (queryText?: string) => {
      setLoading(true)
      setError(null)
      try {
        const res = await window.guidegram.getChatJoinRequests(accountId, chatId, link, {
          query: queryText ?? search,
          limit: 100,
        })
        setRequests(res.requests || [])
        setTotal(Number(res.total || 0))
      } catch (err: any) {
        setError(err?.message || t('join_requests.error_generic'))
      } finally {
        setLoading(false)
      }
    },
    [accountId, chatId, link, search, t]
  )

  useEffect(() => {
    if (!isOpen) return
    setRequests([])
    setTotal(0)
    setSearch('')
    setResolvingId(null)
    setBulkResolving(null)
    setConfirmBulk(null)
    setFeedback(null)
    void fetchRequests('')
  }, [isOpen, accountId, chatId, link, fetchRequests])

  const handleResolve = async (userId: string, action: ChatJoinRequestAction) => {
    setResolvingId(userId)
    setFeedback(null)
    try {
      await window.guidegram.hideChatJoinRequest(accountId, chatId, userId, action)
      setRequests((prev) => prev.filter((r) => r.userId !== userId))
      setTotal((prev) => Math.max(0, prev - 1))
      setFeedback({
        type: 'success',
        text: action === 'approve' ? t('join_requests.approved_success') : t('join_requests.declined_success'),
      })
      onResolved?.()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || t('join_requests.error_generic'),
      })
    } finally {
      setResolvingId(null)
    }
  }

  const handleBulkResolve = async (action: ChatJoinRequestAction) => {
    setBulkResolving(action)
    setConfirmBulk(null)
    setFeedback(null)
    try {
      await window.guidegram.hideAllChatJoinRequests(accountId, chatId, action, link)
      setRequests([])
      setTotal(0)
      setFeedback({
        type: 'success',
        text: action === 'approve' ? t('join_requests.approved_all_success') : t('join_requests.declined_all_success'),
      })
      onResolved?.()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || t('join_requests.error_generic'),
      })
    } finally {
      setBulkResolving(null)
    }
  }

  const formatDate = (unixSeconds: number): string => {
    try {
      return new Date(unixSeconds * 1000).toLocaleString(language === 'fa' ? 'fa-IR' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    } catch {
      return new Date(unixSeconds * 1000).toLocaleString()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-neutral-100">{t('join_requests.title')}</h3>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
                  {total}
                </span>
              </div>
              <p className="text-xs text-neutral-400 truncate max-w-md">{chatTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Search Bar */}
        <div className="px-6 py-3 border-b border-neutral-800/80 bg-neutral-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                void fetchRequests(e.target.value)
              }}
              placeholder={t('join_requests.search_placeholder')}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-neutral-900/80 border border-neutral-800 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {requests.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                disabled={Boolean(bulkResolving)}
                onClick={() => setConfirmBulk('approve')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{t('join_requests.approve_all')}</span>
              </button>
              <button
                disabled={Boolean(bulkResolving)}
                onClick={() => setConfirmBulk('decline')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{t('join_requests.decline_all')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Confirmation Banner for Bulk Action */}
        {confirmBulk && (
          <div className="px-6 py-3 bg-neutral-800/70 border-b border-neutral-700/60 flex items-center justify-between gap-4">
            <span className="text-xs text-neutral-200">
              {confirmBulk === 'approve'
                ? t('join_requests.confirm_approve_all')
                : t('join_requests.confirm_decline_all')}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void handleBulkResolve(confirmBulk)}
                className={`px-3 py-1 text-xs font-medium rounded-lg text-white ${
                  confirmBulk === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {confirmBulk === 'approve' ? t('join_requests.approve') : t('join_requests.decline')}
              </button>
              <button
                onClick={() => setConfirmBulk(null)}
                className="px-2.5 py-1 text-xs rounded-lg bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`px-6 py-2.5 text-xs border-b ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Body List */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/60 p-2">
          {loading && requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              <span className="text-xs">{t('join_requests.loading')}</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-red-400">{error}</div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400 gap-3">
              <div className="p-4 rounded-2xl bg-neutral-800/40 text-neutral-500">
                <Users className="w-8 h-8" />
              </div>
              <p className="text-xs text-neutral-400">{t('join_requests.empty')}</p>
            </div>
          ) : (
            requests.map((req) => (
              <div
                key={req.userId}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-neutral-800/40 transition-colors gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar
                    avatarUrl={req.avatarUrl}
                    title={req.name}
                    peerId={req.userId}
                    accountId={accountId}
                    size="md"
                    className="flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-neutral-200 truncate">{req.name}</span>
                      {req.isPremium && (
                        <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-300">
                          ⭐️
                        </span>
                      )}
                      {req.isBot && (
                        <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded bg-neutral-700 text-neutral-300">
                          bot
                        </span>
                      )}
                      {req.username && (
                        <span className="text-xs text-neutral-400 truncate">@{req.username}</span>
                      )}
                    </div>
                    {req.bio && (
                      <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1 italic">
                        &quot;{req.bio}&quot;
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-1">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      <span>{formatDate(req.date)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    disabled={resolvingId === req.userId || Boolean(bulkResolving)}
                    onClick={() => void handleResolve(req.userId, 'approve')}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                  >
                    {resolvingId === req.userId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{t('join_requests.approve')}</span>
                  </button>
                  <button
                    disabled={resolvingId === req.userId || Boolean(bulkResolving)}
                    onClick={() => void handleResolve(req.userId, 'decline')}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-xl bg-neutral-800 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>{t('join_requests.decline')}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
export default JoinRequestsModal
