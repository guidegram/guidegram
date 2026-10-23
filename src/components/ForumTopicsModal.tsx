import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Hash,
  Loader2,
  Lock,
  MessagesSquare,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Trash2,
  Unlock,
  X,
} from 'lucide-react'
import { ForumTopicItem } from '../types/telegram'
import { useI18n } from '../i18n'

export interface ForumTopicsModalProps {
  isOpen: boolean
  accountId: string
  chatId: string
  chatTitle: string
  topics: ForumTopicItem[]
  canManage?: boolean
  onClose: () => void
  onTopicsChange?: (topics: ForumTopicItem[]) => void
  onOpenTopic?: (topicId: number) => void
}

const stripIpcPrefix = (value: string): string =>
  value
    .replace(/^Error invoking remote method '[^']+':\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim()

const readError = (err: any): string => {
  const message = typeof err?.message === 'string' ? err.message : String(err)
  return stripIpcPrefix(message)
}

const utf8Length = (value: string): number => new TextEncoder().encode(value).length

export const ForumTopicsModal: React.FC<ForumTopicsModalProps> = ({
  isOpen,
  accountId,
  chatId,
  chatTitle,
  topics: initialTopics,
  canManage = false,
  onClose,
  onTopicsChange,
  onOpenTopic,
}) => {
  const { t, formatNumber } = useI18n()
  const [topics, setTopics] = useState<ForumTopicItem[]>(initialTopics || [])
  const [loading, setLoading] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ForumTopicItem | null>(null)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
    detail?: string
  } | null>(null)
  const createInputRef = useRef<HTMLInputElement>(null)

  const applyTopics = useCallback(
    (next: ForumTopicItem[]) => {
      setTopics(next)
      onTopicsChange?.(next)
    },
    [onTopicsChange]
  )

  const fetchTopics = useCallback(async () => {
    if (!window.guidegram?.getForumTopics) return
    setLoading(true)
    try {
      const next = await window.guidegram.getForumTopics(accountId, chatId)
      applyTopics(next || [])
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: t('forum_topics.error_load'),
        detail: readError(err),
      })
    } finally {
      setLoading(false)
    }
  }, [accountId, applyTopics, chatId, t])

  useEffect(() => {
    if (!isOpen) return
    setTopics(initialTopics || [])
    setCreateTitle('')
    setCreateError(null)
    setEditingId(null)
    setEditError(null)
    setConfirmDelete(null)
    setFeedback(null)
    void fetchTopics()
    const timer = window.setTimeout(() => createInputRef.current?.focus(), 160)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, accountId, chatId])

  const sortedTopics = useMemo(
    () =>
      [...topics].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
        if (a.id === 1) return -1
        if (b.id === 1) return 1
        return (b.date || b.id) - (a.date || a.id)
      }),
    [topics]
  )

  const topicTitle = (topic: ForumTopicItem): string =>
    topic.id === 1 && topic.title === 'General' ? t('forum_topics.general') : topic.title

  const validateTitle = (value: string): string | null => {
    if (!value.trim()) return t('forum_topics.title_required')
    if (utf8Length(value.trim()) > 128) return t('forum_topics.title_too_long')
    return null
  }

  const handleCreate = async () => {
    if (!canManage || creating) return
    setFeedback(null)
    const validation = validateTitle(createTitle)
    if (validation) {
      setCreateError(validation)
      return
    }

    setCreating(true)
    setCreateError(null)
    try {
      const result = await window.guidegram.createForumTopic(accountId, chatId, createTitle.trim())
      applyTopics(result.topics || [])
      setCreateTitle('')
      setFeedback({ type: 'success', text: t('forum_topics.created') })
      if (!result.topics || result.topics.length === 0) {
        await fetchTopics()
      }
      createInputRef.current?.focus()
    } catch (err: any) {
      setCreateError(readError(err))
    } finally {
      setCreating(false)
    }
  }

  const startRename = (topic: ForumTopicItem) => {
    setEditingId(topic.id)
    setEditTitle(topicTitle(topic))
    setEditError(null)
    setFeedback(null)
    setConfirmDelete(null)
  }

  const handleRename = async (topic: ForumTopicItem) => {
    if (!canManage || busyId) return
    const nextTitle = editTitle.trim()
    if (nextTitle === topic.title.trim()) {
      setEditingId(null)
      return
    }
    const validation = validateTitle(nextTitle)
    if (validation) {
      setEditError(validation)
      return
    }

    setBusyId(`rename-${topic.id}`)
    setEditError(null)
    setFeedback(null)
    try {
      const result = await window.guidegram.editForumTopic(accountId, chatId, topic.id, {
        title: nextTitle,
      })
      applyTopics(result.topics || [])
      setEditingId(null)
      setFeedback({ type: 'success', text: t('forum_topics.renamed') })
    } catch (err: any) {
      setEditError(readError(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleCloseToggle = async (topic: ForumTopicItem) => {
    if (!canManage || busyId) return
    const key = `close-${topic.id}`
    setBusyId(key)
    setFeedback(null)
    setConfirmDelete(null)
    try {
      const result = await window.guidegram.editForumTopic(accountId, chatId, topic.id, {
        closed: !topic.isClosed,
      })
      applyTopics(result.topics || [])
      setFeedback({
        type: 'success',
        text: topic.isClosed ? t('forum_topics.reopened') : t('forum_topics.closed'),
      })
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: t('forum_topics.error_close'),
        detail: readError(err),
      })
    } finally {
      setBusyId(null)
    }
  }

  const handlePinToggle = async (topic: ForumTopicItem) => {
    if (!canManage || busyId) return
    const key = `pin-${topic.id}`
    setBusyId(key)
    setFeedback(null)
    setConfirmDelete(null)
    try {
      const result = await window.guidegram.setForumTopicPinned(
        accountId,
        chatId,
        topic.id,
        !topic.isPinned
      )
      applyTopics(result.topics || [])
      setFeedback({
        type: 'success',
        text: topic.isPinned ? t('forum_topics.unpinned') : t('forum_topics.pinned'),
      })
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: t('forum_topics.error_pin'),
        detail: readError(err),
      })
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete || !canManage || busyId) return
    const topic = confirmDelete
    setBusyId(`delete-${topic.id}`)
    setFeedback(null)
    try {
      const result = await window.guidegram.deleteForumTopic(accountId, chatId, topic.id)
      applyTopics(result.topics || [])
      setConfirmDelete(null)
      setEditingId(null)
      setFeedback({ type: 'success', text: t('forum_topics.deleted') })
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: t('forum_topics.error_delete'),
        detail: readError(err),
      })
      setConfirmDelete(null)
    } finally {
      setBusyId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-xl max-h-[92vh] bg-dark-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 py-4 bg-dark-850/90 border-b border-white/10 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-300 shadow-sm shrink-0">
              <MessagesSquare className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="text-sm font-bold text-white truncate">{t('forum_topics.title')}</h3>
              <span className="text-xs text-gray-400 truncate">
                {chatTitle}
                <span className="text-gray-500">
                  {' '}
                  · {formatNumber(topics.length)} {t('forum_topics.topic')}
                </span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('invite_links.close')}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-start">
          <p className="text-[11px] text-gray-400 leading-relaxed">{t('forum_topics.subtitle')}</p>

          {feedback && (
            <div
              className={`px-3 py-2.5 rounded-xl text-xs flex items-start gap-2 border ${
                feedback.type === 'success'
                  ? 'bg-accent-emerald/10 border-accent-emerald/25 text-accent-emerald'
                  : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 break-words">
                <div className="font-semibold">{feedback.text}</div>
                {feedback.detail && (
                  <div
                    className="mt-0.5 text-[10px] opacity-80 whitespace-pre-wrap break-all"
                    dir="ltr"
                  >
                    {feedback.detail}
                  </div>
                )}
              </div>
            </div>
          )}

          {canManage && (
            <div className="p-3 rounded-2xl bg-dark-850/80 border border-white/5 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  ref={createInputRef}
                  type="text"
                  value={createTitle}
                  onChange={(event) => {
                    setCreateTitle(event.target.value)
                    setCreateError(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void handleCreate()
                    }
                  }}
                  placeholder={t('forum_topics.create_placeholder')}
                  className="flex-1 min-w-0 bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-500/60"
                />
                <button
                  type="button"
                  disabled={creating || !createTitle.trim()}
                  onClick={() => void handleCreate()}
                  className="px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {creating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  {creating ? t('forum_topics.creating') : t('forum_topics.create')}
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 px-0.5">
                {createError ? (
                  <span className="text-[10px] text-rose-300 break-words">{createError}</span>
                ) : (
                  <span className="text-[10px] text-gray-500">
                    {formatNumber(utf8Length(createTitle))} / ۱۲۸
                  </span>
                )}
                <span className="text-[10px] text-gray-500 shrink-0">{t('forum_topics.manage_hint')}</span>
              </div>
            </div>
          )}

          {confirmDelete && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-rose-200">
                    {t('forum_topics.confirm_delete_title')}
                  </div>
                  <div className="mt-1 text-[11px] text-rose-200/75 leading-relaxed">
                    {t('forum_topics.confirm_delete_body')}
                  </div>
                  <div className="mt-1 text-[10px] text-rose-200/60 truncate">
                    {topicTitle(confirmDelete)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  {t('invite_links.cancel')}
                </button>
                <button
                  type="button"
                  disabled={busyId === `delete-${confirmDelete.id}`}
                  onClick={() => void handleDelete()}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                >
                  {busyId === `delete-${confirmDelete.id}` ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  {t('forum_topics.confirm_delete')}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-semibold text-gray-400">
              {loading ? t('invite_links.loading') : `${formatNumber(topics.length)} ${t('forum_topics.topic')}`}
            </div>
            <button
              type="button"
              onClick={() => void fetchTopics()}
              disabled={loading}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
              title={t('invite_links.refresh')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {!loading && sortedTopics.length === 0 && (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-center border border-dashed border-white/10 rounded-2xl">
              <Hash className="w-8 h-8 text-gray-600" />
              <div className="text-xs font-semibold text-gray-300">{t('forum_topics.no_topics')}</div>
              <div className="text-[10px] text-gray-500">{t('forum_topics.empty_hint')}</div>
            </div>
          )}

          <div className="space-y-2">
            {sortedTopics.map((topic) => {
              const isBusy =
                busyId === `pin-${topic.id}` ||
                busyId === `close-${topic.id}` ||
                busyId === `delete-${topic.id}` ||
                busyId === `rename-${topic.id}`
              const isEditing = editingId === topic.id

              return (
                <div
                  key={topic.id}
                  className="rounded-2xl bg-dark-850/80 border border-white/5 px-3 py-2.5 space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                      {topic.isPinned ? (
                        <Pin className="w-4 h-4 text-amber-400" />
                      ) : topic.isClosed ? (
                        <Lock className="w-4 h-4 text-gray-500" />
                      ) : (
                        <Hash className="w-4 h-4 text-primary-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            autoFocus
                            value={editTitle}
                            onChange={(event) => {
                              setEditTitle(event.target.value)
                              setEditError(null)
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                void handleRename(topic)
                              }
                              if (event.key === 'Escape') {
                                setEditingId(null)
                                setEditError(null)
                              }
                            }}
                            className="w-full bg-dark-900 border border-primary-500/40 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                          />
                          {editError && (
                            <div className="text-[10px] text-rose-300 break-words">{editError}</div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white break-words">
                            {topicTitle(topic)}
                          </span>
                          {topic.isPinned && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[9px] font-semibold">
                              {t('forum_topics.pinned_badge')}
                            </span>
                          )}
                          {topic.isClosed && (
                            <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-400 text-[9px] font-semibold">
                              {t('forum_topics.closed_badge')}
                            </span>
                          )}
                          {!!topic.unreadCount && topic.unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-primary-500/15 border border-primary-500/25 text-primary-200 text-[9px] font-semibold">
                              {t('forum_topics.unread_badge', {
                                count: formatNumber(topic.unreadCount),
                              })}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="mt-0.5 text-[10px] text-gray-500 flex items-center gap-2">
                        <span dir="ltr">#{topic.id}</span>
                        {topic.id === 1 && <span>{t('forum_topics.general_subtitle')}</span>}
                      </div>
                    </div>
                    {isBusy && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin shrink-0 mt-1" />}
                  </div>

                  {isEditing ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null)
                          setEditError(null)
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        {t('invite_links.cancel')}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === `rename-${topic.id}`}
                        onClick={() => void handleRename(topic)}
                        className="px-2.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {busyId === `rename-${topic.id}` ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {t('forum_topics.save')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {onOpenTopic && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenTopic(topic.id)
                            onClose()
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-gray-200 text-[10px] font-semibold transition-colors cursor-pointer"
                        >
                          {t('forum_topics.open')}
                        </button>
                      )}
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => void handlePinToggle(topic)}
                            disabled={isBusy}
                            title={topic.isPinned ? t('forum_topics.unpin') : t('forum_topics.pin')}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            {topic.isPinned ? (
                              <PinOff className="w-3.5 h-3.5" />
                            ) : (
                              <Pin className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleCloseToggle(topic)}
                            disabled={isBusy}
                            title={
                              topic.isClosed
                                ? t('forum_topics.reopen_topic')
                                : t('forum_topics.close_topic')
                            }
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            {topic.isClosed ? (
                              <Unlock className="w-3.5 h-3.5" />
                            ) : (
                              <Lock className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => startRename(topic)}
                            disabled={isBusy}
                            title={t('forum_topics.rename')}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {topic.id !== 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDelete(topic)
                                setEditingId(null)
                                setFeedback(null)
                              }}
                              disabled={isBusy}
                              title={t('forum_topics.delete')}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 transition-colors cursor-pointer disabled:opacity-40"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
