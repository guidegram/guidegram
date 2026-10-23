import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldQuestion,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { ChatDetails, ChatInviteLink, ChatInviteLinkInput } from '../types/telegram'
import { useI18n } from '../i18n'
import { copyTextToClipboard } from '../utils/clipboard'

export interface ChatInviteLinksModalProps {
  isOpen: boolean
  accountId: string
  chatId: string
  chatTitle: string
  details?: ChatDetails | null
  onClose: () => void
  onInviteLinkChange?: (link: string | null) => void
}

type Tab = 'active' | 'revoked'
type ConfirmState = { type: 'revoke' | 'delete'; link: ChatInviteLink } | null

const stripIpcPrefix = (value: string): string =>
  value
    .replace(/^Error invoking remote method '[^']+':\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim()

const readError = (err: any): string => {
  const raw = typeof err === 'string' ? err : err?.message || String(err || '')
  return stripIpcPrefix(raw) || 'Unknown error'
}

const pad2 = (value: number): string => String(value).padStart(2, '0')

const toInputValue = (unixSeconds?: number): string => {
  if (!unixSeconds) return ''
  const date = new Date(unixSeconds * 1000)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}`
}

const toUnixSeconds = (value: string): number | null => {
  if (!value) return null
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return null
  return Math.floor(time / 1000)
}

export const ChatInviteLinksModal: React.FC<ChatInviteLinksModalProps> = ({
  isOpen,
  accountId,
  chatId,
  chatTitle,
  details,
  onClose,
  onInviteLinkChange,
}) => {
  const { t, language, formatNumber } = useI18n()
  const [tab, setTab] = useState<Tab>('active')
  const [links, setLinks] = useState<ChatInviteLink[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [usageLimit, setUsageLimit] = useState('')
  const [expireAt, setExpireAt] = useState('')
  const [requestNeeded, setRequestNeeded] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [editing, setEditing] = useState<ChatInviteLink | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editUsageLimit, setEditUsageLimit] = useState('')
  const [editExpireAt, setEditExpireAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [busyLink, setBusyLink] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string; detail?: string } | null>(
    null
  )
  const [replacement, setReplacement] = useState<string | null>(null)

  const formatDate = (unixSeconds?: number): string => {
    if (!unixSeconds) return t('invite_links.never')
    try {
      return new Date(unixSeconds * 1000).toLocaleString(language === 'fa' ? 'fa-IR' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    } catch {
      return new Date(unixSeconds * 1000).toLocaleString()
    }
  }

  const fetchLinks = useCallback(
    async (which: Tab) => {
      setLoading(true)
      setLoadError(null)
      try {
        const result = await window.guidegram.getChatInviteLinks(accountId, chatId, {
          revokedOnly: which === 'revoked',
        })
        setLinks(result.links || [])
        setTotal(Number(result.total || 0))
      } catch (err: any) {
        setLinks([])
        setTotal(0)
        setLoadError(readError(err))
      } finally {
        setLoading(false)
      }
    },
    [accountId, chatId]
  )

  useEffect(() => {
    if (!isOpen) return
    setTab('active')
    setLinks([])
    setTotal(0)
    setTitle('')
    setUsageLimit('')
    setExpireAt('')
    setRequestNeeded(false)
    setCreateError(null)
    setEditing(null)
    setEditError(null)
    setConfirm(null)
    setBusyLink(null)
    setFeedback(null)
    setReplacement(null)
    void fetchLinks('active')
  }, [isOpen, accountId, chatId, fetchLinks])

  const switchTab = (next: Tab) => {
    if (next === tab) return
    setTab(next)
    setConfirm(null)
    setEditing(null)
    setFeedback(null)
    setReplacement(null)
    void fetchLinks(next)
  }

  const resetCreateForm = () => {
    setTitle('')
    setUsageLimit('')
    setExpireAt('')
    setRequestNeeded(false)
    setCreateError(null)
  }

  const beginEdit = (link: ChatInviteLink) => {
    setEditing(link)
    setEditTitle(link.title || '')
    setEditUsageLimit(link.usageLimit ? String(link.usageLimit) : '')
    setEditExpireAt(toInputValue(link.expireDate))
    setEditError(null)
    setConfirm(null)
    setFeedback(null)
    setReplacement(null)
  }

  const cancelEdit = () => {
    setEditing(null)
    setEditError(null)
  }

  const notifyReplacement = (next: ChatInviteLink | undefined) => {
    if (next?.link) {
      setReplacement(next.link)
      onInviteLinkChange?.(next.link)
    }
  }

  const handleCopy = async (link: string) => {
    try {
      await copyTextToClipboard(link)
      setFeedback({ type: 'success', text: t('invite_links.copied') })
    } catch (err: any) {
      setFeedback({ type: 'error', text: t('invite_links.error_generic'), detail: readError(err) })
    }
  }

  const handleCreate = async () => {
    setCreateError(null)
    setFeedback(null)
    setReplacement(null)

    const trimmedTitle = title.trim()
    if (trimmedTitle.length > 32) {
      setCreateError(t('invite_links.title_too_long'))
      return
    }

    let parsedUsage: number | null = null
    if (usageLimit.trim()) {
      parsedUsage = Number(usageLimit)
      if (!Number.isInteger(parsedUsage) || parsedUsage <= 0) {
        setCreateError(t('invite_links.invalid_usage'))
        return
      }
    }

    const parsedExpiry = toUnixSeconds(expireAt)
    if (expireAt && (!parsedExpiry || parsedExpiry <= Math.floor(Date.now() / 1000))) {
      setCreateError(t('invite_links.invalid_expiry'))
      return
    }

    setCreating(true)
    try {
      await window.guidegram.createChatInviteLink(accountId, chatId, {
        title: trimmedTitle || undefined,
        usageLimit: parsedUsage,
        expireDate: parsedExpiry,
        requestNeeded: requestNeeded || undefined,
      })
      resetCreateForm()
      setFeedback({ type: 'success', text: t('invite_links.created') })
      if (tab !== 'active') {
        setTab('active')
      }
      await fetchLinks('active')
    } catch (err: any) {
      setCreateError(readError(err))
    } finally {
      setCreating(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    setEditError(null)
    setFeedback(null)
    setReplacement(null)

    const trimmedTitle = editTitle.trim()
    if (trimmedTitle.length > 32) {
      setEditError(t('invite_links.title_too_long'))
      return
    }

    const nextUsage = editUsageLimit.trim() ? Number(editUsageLimit) : null
    if (nextUsage !== null && (!Number.isInteger(nextUsage) || nextUsage <= 0)) {
      setEditError(t('invite_links.invalid_usage'))
      return
    }

    const nextExpiry = toUnixSeconds(editExpireAt)
    if (editExpireAt && (!nextExpiry || nextExpiry <= Math.floor(Date.now() / 1000))) {
      setEditError(t('invite_links.invalid_expiry'))
      return
    }

    const input: ChatInviteLinkInput = {}
    if (trimmedTitle !== (editing.title || '')) input.title = trimmedTitle
    if (nextUsage !== (editing.usageLimit ?? null)) input.usageLimit = nextUsage
    if (nextExpiry !== (editing.expireDate ?? null)) input.expireDate = nextExpiry

    if (Object.keys(input).length === 0) {
      setEditError(t('invite_links.no_changes'))
      return
    }

    setSaving(true)
    try {
      const result = await window.guidegram.editChatInviteLink(accountId, chatId, editing.link, input)
      notifyReplacement(result.replacement)
      setEditing(null)
      setFeedback({ type: 'success', text: t('invite_links.updated') })
      await fetchLinks(tab)
    } catch (err: any) {
      setEditError(readError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmAction = async () => {
    if (!confirm) return
    const { type, link } = confirm
    setBusyLink(link.link)
    setFeedback(null)
    setReplacement(null)
    try {
      if (type === 'revoke') {
        const result = await window.guidegram.revokeChatInviteLink(accountId, chatId, link.link)
        notifyReplacement(result.replacement)
        setFeedback({ type: 'success', text: t('invite_links.revoked') })
      } else {
        await window.guidegram.deleteChatInviteLink(accountId, chatId, link.link)
        setFeedback({ type: 'success', text: t('invite_links.deleted') })
      }
      setConfirm(null)
      await fetchLinks(tab)
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: type === 'revoke' ? t('invite_links.error_revoke') : t('invite_links.error_delete'),
        detail: readError(err),
      })
    } finally {
      setBusyLink(null)
    }
  }

  if (!isOpen) return null

  const canRequireApproval = Boolean(details?.username)
  const minExpiry = toInputValue(Math.floor(Date.now() / 1000) + 60)

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
            <div className="w-10 h-10 rounded-2xl bg-accent-cyan/20 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan shadow-sm shrink-0">
              <Link2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="text-sm font-bold text-white truncate">{t('invite_links.title')}</h3>
              <span className="text-xs text-gray-400 truncate">
                {chatTitle}
                {!loading && (
                  <span className="text-gray-500"> · {formatNumber(total)}</span>
                )}
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
                  <div className="mt-0.5 text-[10px] opacity-80 whitespace-pre-wrap break-all" dir="ltr">
                    {feedback.detail}
                  </div>
                )}
              </div>
            </div>
          )}

          {replacement && (
            <div className="px-3 py-2.5 rounded-xl bg-accent-cyan/10 border border-accent-cyan/25 text-accent-cyan text-xs space-y-1">
              <div className="font-semibold flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                {t('invite_links.replacement')}
              </div>
              <div className="font-mono text-[10px] break-all select-text" dir="ltr">
                {replacement}
              </div>
            </div>
          )}

          {confirm && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-rose-200">
                    {confirm.type === 'revoke'
                      ? t('invite_links.confirm_revoke_title')
                      : t('invite_links.confirm_delete_title')}
                  </div>
                  <div className="mt-1 text-[11px] text-rose-200/75 leading-relaxed">
                    {confirm.type === 'revoke'
                      ? t('invite_links.confirm_revoke_body')
                      : t('invite_links.confirm_delete_body')}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirm(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  {t('invite_links.cancel')}
                </button>
                <button
                  type="button"
                  disabled={busyLink === confirm.link.link}
                  onClick={handleConfirmAction}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                >
                  {busyLink === confirm.link.link ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Ban className="w-3.5 h-3.5" />
                  )}
                  {confirm.type === 'revoke'
                    ? t('invite_links.confirm')
                    : t('invite_links.confirm_delete')}
                </button>
              </div>
            </div>
          )}

          {editing ? (
            <div className="p-3.5 rounded-2xl bg-dark-850/90 border border-white/5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-white">{t('invite_links.edit_title')}</div>
                  <div className="text-[10px] text-gray-500">{t('invite_links.edit_hint')}</div>
                </div>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label={t('invite_links.cancel')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="font-mono text-[10px] text-gray-400 break-all select-text" dir="ltr">
                {editing.link}
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="text-[10px] font-bold text-gray-300">
                    {t('invite_links.title_label')}
                  </label>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {formatNumber(editTitle.length)}/{formatNumber(32)}
                  </span>
                </div>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(event) => {
                    setEditTitle(event.target.value)
                    setEditError(null)
                  }}
                  placeholder={t('invite_links.title_placeholder')}
                  maxLength={32}
                  className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-300 mb-1 block">
                    {t('invite_links.usage_limit_label')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editUsageLimit}
                    onChange={(event) => {
                      setEditUsageLimit(event.target.value)
                      setEditError(null)
                    }}
                    placeholder={t('invite_links.usage_limit_placeholder')}
                    className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-300 mb-1 block">
                    {t('invite_links.expire_label')}
                  </label>
                  <input
                    type="datetime-local"
                    value={editExpireAt}
                    min={minExpiry}
                    onChange={(event) => {
                      setEditExpireAt(event.target.value)
                      setEditError(null)
                    }}
                    className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                    dir="ltr"
                  />
                  <p className="mt-1 text-[10px] text-gray-500">{t('invite_links.expire_hint')}</p>
                </div>
              </div>

              {editError && (
                <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span className="break-words">{editError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  {t('invite_links.cancel')}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 rounded-xl bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/40 text-primary-200 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Edit3 className="w-3.5 h-3.5" />
                  )}
                  {saving ? t('invite_links.saving') : t('invite_links.save')}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-dark-850/90 border border-white/5 space-y-3">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-accent-cyan" />
                  {t('invite_links.create_title')}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">{t('invite_links.create_hint')}</div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="text-[10px] font-bold text-gray-300">
                    {t('invite_links.title_label')}
                  </label>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {formatNumber(title.length)}/{formatNumber(32)}
                  </span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value)
                    setCreateError(null)
                  }}
                  placeholder={t('invite_links.title_placeholder')}
                  maxLength={32}
                  className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-300 mb-1 block">
                    {t('invite_links.usage_limit_label')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={usageLimit}
                    onChange={(event) => {
                      setUsageLimit(event.target.value)
                      setCreateError(null)
                    }}
                    placeholder={t('invite_links.usage_limit_placeholder')}
                    className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                  />
                  <p className="mt-1 text-[10px] text-gray-500">{t('invite_links.usage_limit_hint')}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-300 mb-1 block">
                    {t('invite_links.expire_label')}
                  </label>
                  <input
                    type="datetime-local"
                    value={expireAt}
                    min={minExpiry}
                    onChange={(event) => {
                      setExpireAt(event.target.value)
                      setCreateError(null)
                    }}
                    className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                    dir="ltr"
                  />
                  <p className="mt-1 text-[10px] text-gray-500">{t('invite_links.expire_hint')}</p>
                </div>
              </div>

              {canRequireApproval && (
                <label className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requestNeeded}
                    onChange={(event) => setRequestNeeded(event.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-primary-500 cursor-pointer"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-200">
                      <ShieldQuestion className="w-3.5 h-3.5 text-accent-amber" />
                      {t('invite_links.request_needed_label')}
                    </span>
                    <span className="block mt-0.5 text-[10px] text-gray-500">
                      {t('invite_links.request_needed_hint')}
                    </span>
                  </span>
                </label>
              )}

              {createError && (
                <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span className="break-words">{createError}</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={creating}
                  onClick={handleCreate}
                  className="px-3.5 py-2 rounded-xl bg-accent-cyan/15 hover:bg-accent-cyan/25 border border-accent-cyan/30 text-accent-cyan text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                >
                  {creating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  {creating ? t('invite_links.creating') : t('invite_links.create')}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-dark-850 border border-white/5">
              <button
                type="button"
                onClick={() => switchTab('active')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  tab === 'active'
                    ? 'bg-primary-500/20 text-primary-200'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {t('invite_links.tab_active')}
                {tab === 'active' && !loading ? ` · ${formatNumber(total)}` : ''}
              </button>
              <button
                type="button"
                onClick={() => switchTab('revoked')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  tab === 'revoked'
                    ? 'bg-rose-500/20 text-rose-200'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {t('invite_links.tab_revoked')}
                {tab === 'revoked' && !loading ? ` · ${formatNumber(total)}` : ''}
              </button>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => fetchLinks(tab)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              title={t('invite_links.refresh')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="min-h-[160px] flex flex-col items-center justify-center gap-3 text-gray-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-accent-cyan" />
              {t('invite_links.loading')}
            </div>
          ) : loadError ? (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-bold">{t('invite_links.error_load')}</div>
                <div className="mt-0.5 text-[10px] opacity-80 break-all" dir="ltr">
                  {loadError}
                </div>
              </div>
            </div>
          ) : links.length === 0 ? (
            <div className="min-h-[140px] flex flex-col items-center justify-center gap-2 text-gray-500 text-xs">
              <Link2 className="w-7 h-7 text-gray-600" />
              {tab === 'active' ? t('invite_links.empty_active') : t('invite_links.empty_revoked')}
            </div>
          ) : (
            <div className="space-y-2.5">
              {links.map((link) => {
                const isBusy = busyLink === link.link
                return (
                  <div
                    key={link.link}
                    className="p-3.5 rounded-2xl bg-dark-850/90 border border-white/5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">
                            {link.title || t('invite_links.title')}
                          </span>
                          {link.permanent && (
                            <span className="px-1.5 py-0.5 rounded-md bg-primary-500/15 border border-primary-500/25 text-primary-300 text-[9px] font-bold">
                              {t('invite_links.permanent')}
                            </span>
                          )}
                          {link.revoked && (
                            <span className="px-1.5 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/25 text-rose-300 text-[9px] font-bold">
                              {t('invite_links.revoked_badge')}
                            </span>
                          )}
                          {link.requestNeeded && (
                            <span className="px-1.5 py-0.5 rounded-md bg-accent-amber/15 border border-accent-amber/25 text-accent-amber text-[9px] font-bold">
                              {t('invite_links.request_needed_badge')}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-accent-cyan break-all select-text" dir="ltr">
                          {link.link}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!link.revoked && (
                          <button
                            type="button"
                            onClick={() => handleCopy(link.link)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            title={t('invite_links.copy')}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!link.revoked && (
                          <button
                            type="button"
                            onClick={() => beginEdit(link)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-300 hover:bg-primary-500/10 transition-colors cursor-pointer"
                            title={t('invite_links.edit')}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!link.revoked && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setConfirm({ type: 'revoke', link })
                              setFeedback(null)
                              setReplacement(null)
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                            title={t('invite_links.revoke')}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {link.revoked && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setConfirm({ type: 'delete', link })
                              setFeedback(null)
                              setReplacement(null)
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                            title={t('invite_links.delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isBusy && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {link.usageLimit
                          ? t('invite_links.usage_value', {
                              used: formatNumber(link.usage || 0),
                              limit: formatNumber(link.usageLimit),
                            })
                          : t('invite_links.usage_unlimited', {
                              used: formatNumber(link.usage || 0),
                            })}
                      </span>
                      {(link.requested || 0) > 0 && (
                        <span className="flex items-center gap-1 text-accent-amber">
                          <ShieldQuestion className="w-3 h-3" />
                          {t('invite_links.requested_badge', {
                            count: formatNumber(link.requested || 0),
                          })}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {t('invite_links.expires')}: {formatDate(link.expireDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {t('invite_links.created_at')}: {formatDate(link.date)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
