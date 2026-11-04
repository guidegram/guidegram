import React, { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  FolderPlus,
  Layers,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldQuestion,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { ChatDetails, ChatInviteLink, ChatInviteLinkInput } from '../types/telegram'
import { useI18n } from '../i18n'
import { copyTextToClipboard } from '../utils/clipboard'
import { JoinRequestsModal } from './JoinRequestsModal'

export interface ChatInviteLinksModalProps {
  isOpen: boolean
  accountId: string
  chatId: string
  chatTitle: string
  details?: ChatDetails | null
  onClose: () => void
  onInviteLinkChange?: (link: string | null) => void
}

type Tab = 'active' | 'revoked' | 'chatlists' | 'maintenance'
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
  const [selectedJoinRequestLink, setSelectedJoinRequestLink] = useState<string | null>(null)

  // Layer 232 Messages Maintenance (Microphase 036)
  // 1. messages.deleteExportedChatInvite
  const [purgeInviteLink, setPurgeInviteLink] = useState('')
  const [isPurgingInvite, setIsPurgingInvite] = useState(false)
  const [purgeInviteFeedback, setPurgeInviteFeedback] = useState<string | null>(null)

  // 2. messages.deleteFactCheck
  const [factCheckMsgId, setFactCheckMsgId] = useState('')
  const [isDeletingFactCheck, setIsDeletingFactCheck] = useState(false)
  const [deleteFactCheckFeedback, setDeleteFactCheckFeedback] = useState<string | null>(null)

  // 3. messages.deleteParticipantReaction & deleteParticipantReactions
  const [reactionMsgId, setReactionMsgId] = useState('')
  const [reactionParticipantId, setReactionParticipantId] = useState('')
  const [isDeletingReactions, setIsDeletingReactions] = useState(false)
  const [deleteReactionsFeedback, setDeleteReactionsFeedback] = useState<string | null>(null)

  // 4. messages.deletePhoneCallHistory
  const [callHistoryRevoke, setCallHistoryRevoke] = useState(true)
  const [isDeletingCallHistory, setIsDeletingCallHistory] = useState(false)
  const [deleteCallHistoryFeedback, setDeleteCallHistoryFeedback] = useState<string | null>(null)

  // Layer 232 Messages Suite (Microphase 040)
  // 1. messages.exportChatInvite
  const [m040ExportedLink, setM040ExportedLink] = useState<string | null>(null)
  const [isExportingInvite, setIsExportingInvite] = useState(false)
  const [exportInviteFeedback, setExportInviteFeedback] = useState<string | null>(null)

  // 2. messages.faveSticker
  const [m040StickerId, setM040StickerId] = useState('')
  const [m040Unfave, setM040Unfave] = useState(false)
  const [isFavingSticker, setIsFavingSticker] = useState(false)
  const [faveStickerFeedback, setFaveStickerFeedback] = useState<string | null>(null)

  // 3. messages.forwardMessages
  const [m040ForwardToPeer, setM040ForwardToPeer] = useState('')
  const [m040ForwardMsgIds, setM040ForwardMsgIds] = useState('')
  const [isForwardingMessages, setIsForwardingMessages] = useState(false)
  const [forwardFeedback, setForwardFeedback] = useState<string | null>(null)

  // 4. messages.getAdminsWithInvites
  const [m040AdminsCount, setM040AdminsCount] = useState<number | null>(null)
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false)
  const [adminsFeedback, setAdminsFeedback] = useState<string | null>(null)

  // 5. messages.getAllDrafts
  const [m040DraftsCount, setM040DraftsCount] = useState<number | null>(null)
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false)
  const [draftsFeedback, setDraftsFeedback] = useState<string | null>(null)

  // 6. messages.getAllStickers
  const [m040StickersCount, setM040StickersCount] = useState<number | null>(null)
  const [isLoadingStickers, setIsLoadingStickers] = useState(false)
  const [stickersFeedback, setStickersFeedback] = useState<string | null>(null)

  // 7. messages.getArchivedStickers
  const [m040ArchivedCount, setM040ArchivedCount] = useState<number | null>(null)
  const [isLoadingArchived, setIsLoadingArchived] = useState(false)
  const [archivedFeedback, setArchivedFeedback] = useState<string | null>(null)

  // Layer 232 Messages Suite (Microphase 042)
  // 1. messages.getChatInviteImporters
  const [m042ImportersCount, setM042ImportersCount] = useState<number | null>(null)
  const [m042RequestedOnly, setM042RequestedOnly] = useState(false)
  const [isLoadingImporters, setIsLoadingImporters] = useState(false)
  const [importersFeedback, setImportersFeedback] = useState<string | null>(null)

  // 2. messages.getChats
  const [m042ChatsCount, setM042ChatsCount] = useState<number | null>(null)
  const [isLoadingChats, setIsLoadingChats] = useState(false)
  const [chatsFeedback, setChatsFeedback] = useState<string | null>(null)

  // 3. messages.getCommonChats
  const [m042CommonUserId, setM042CommonUserId] = useState('')
  const [m042CommonChatsCount, setM042CommonChatsCount] = useState<number | null>(null)
  const [isLoadingCommonChats, setIsLoadingCommonChats] = useState(false)
  const [commonChatsFeedback, setCommonChatsFeedback] = useState<string | null>(null)

  // 4. messages.getCustomEmojiDocuments
  const [m042EmojiDocId, setM042EmojiDocId] = useState('')
  const [isLoadingEmojiDoc, setIsLoadingEmojiDoc] = useState(false)
  const [emojiDocFeedback, setEmojiDocFeedback] = useState<string | null>(null)

  // 5. messages.getDefaultHistoryTTL
  const [m042HistoryTTL, setM042HistoryTTL] = useState<number | null>(null)
  const [isLoadingTTL, setIsLoadingTTL] = useState(false)
  const [ttlFeedback, setTtlFeedback] = useState<string | null>(null)

  // 6. messages.getDefaultTagReactions
  const [m042TagReactionsCount, setM042TagReactionsCount] = useState<number | null>(null)
  const [isLoadingTagReactions, setIsLoadingTagReactions] = useState(false)
  const [tagReactionsFeedback, setTagReactionsFeedback] = useState<string | null>(null)

  // 7. messages.getDhConfig
  const [m042DhConfigStatus, setM042DhConfigStatus] = useState<string | null>(null)
  const [isLoadingDh, setIsLoadingDh] = useState(false)
  const [dhFeedback, setDhFeedback] = useState<string | null>(null)

  // Microphase 118: Chatlists Domain Suite Part 1
  const [clFolderId, setClFolderId] = useState('1')
  const [clCheckSlug, setClCheckSlug] = useState('')
  const [clCheckResult, setClCheckResult] = useState<any | null>(null)
  const [isCheckingInvite, setIsCheckingInvite] = useState(false)
  const [checkInviteFeedback, setCheckInviteFeedback] = useState<string | null>(null)

  const [clExportTitle, setClExportTitle] = useState('')
  const [clExportPeers, setClExportPeers] = useState('')
  const [isExportingChatlist, setIsExportingChatlist] = useState(false)
  const [exportChatlistFeedback, setExportChatlistFeedback] = useState<string | null>(null)
  const [lastExportedInvite, setLastExportedInvite] = useState<any | null>(null)

  const [clExportedInvites, setClExportedInvites] = useState<any[]>([])
  const [isLoadingExportedInvites, setIsLoadingExportedInvites] = useState(false)
  const [exportedInvitesFeedback, setExportedInvitesFeedback] = useState<string | null>(null)

  const [clEditSlug, setClEditSlug] = useState('')
  const [clEditTitle, setClEditTitle] = useState('')
  const [isEditingExported, setIsEditingExported] = useState(false)
  const [editExportedFeedback, setEditExportedFeedback] = useState<string | null>(null)

  const [isDeletingSlug, setIsDeletingSlug] = useState<string | null>(null)
  const [deleteExportedFeedback, setDeleteExportedFeedback] = useState<string | null>(null)

  const [clUpdates, setClUpdates] = useState<any | null>(null)
  const [isLoadingUpdates, setIsLoadingUpdates] = useState(false)
  const [updatesFeedback, setUpdatesFeedback] = useState<string | null>(null)

  const [clLeaveSuggestions, setClLeaveSuggestions] = useState<any | null>(null)
  const [isLoadingLeaveSuggestions, setIsLoadingLeaveSuggestions] = useState(false)
  const [leaveSuggestionsFeedback, setLeaveSuggestionsFeedback] = useState<string | null>(null)

  // Microphase 119: Chatlists Domain Suite Part 2
  const [clJoinPeers, setClJoinPeers] = useState('')
  const [isJoiningInvite, setIsJoiningInvite] = useState(false)
  const [joinInviteFeedback, setJoinInviteFeedback] = useState<string | null>(null)

  const [clJoinUpdatesPeers, setClJoinUpdatesPeers] = useState('')
  const [isJoiningUpdates, setIsJoiningUpdates] = useState(false)
  const [joinUpdatesFeedback, setJoinUpdatesFeedback] = useState<string | null>(null)

  const [isHidingUpdates, setIsHidingUpdates] = useState(false)
  const [hideUpdatesFeedback, setHideUpdatesFeedback] = useState<string | null>(null)

  const [clLeavePeers, setClLeavePeers] = useState('')
  const [isLeavingChatlist, setIsLeavingChatlist] = useState(false)
  const [leaveChatlistFeedback, setLeaveChatlistFeedback] = useState<string | null>(null)

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
      if (which === 'maintenance' || which === 'chatlists') return
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

  const handlePurgeInviteLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!purgeInviteLink.trim() || !window.guidegram?.deleteExportedChatInvite) return
    setIsPurgingInvite(true)
    setPurgeInviteFeedback(null)
    try {
      const res = await window.guidegram.deleteExportedChatInvite(accountId, chatId, purgeInviteLink.trim())
      if (res) {
        setPurgeInviteFeedback('Invite link permanently deleted from Telegram.')
        setPurgeInviteLink('')
        void fetchLinks('revoked')
      } else {
        setPurgeInviteFeedback('Failed to delete invite link. Verify administrator rights.')
      }
    } catch (err: any) {
      setPurgeInviteFeedback(err?.message || 'Error purging invite link.')
    } finally {
      setIsPurgingInvite(false)
    }
  }

  const handleDeleteFactCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    const msgIdNum = Number(factCheckMsgId.trim())
    if (!msgIdNum || !window.guidegram?.deleteFactCheck) return
    setIsDeletingFactCheck(true)
    setDeleteFactCheckFeedback(null)
    try {
      const res = await window.guidegram.deleteFactCheck(accountId, chatId, msgIdNum)
      if (res) {
        setDeleteFactCheckFeedback(`Fact-check on message #${msgIdNum} removed.`)
        setFactCheckMsgId('')
      } else {
        setDeleteFactCheckFeedback('Could not remove fact-check. Check permissions.')
      }
    } catch (err: any) {
      setDeleteFactCheckFeedback(err?.message || 'Error deleting fact-check.')
    } finally {
      setIsDeletingFactCheck(false)
    }
  }

  const handleDeleteParticipantReactions = async (singleMessage: boolean) => {
    if (!window.guidegram) return
    setIsDeletingReactions(true)
    setDeleteReactionsFeedback(null)
    try {
      if (singleMessage) {
        const msgIdNum = Number(reactionMsgId.trim())
        if (!msgIdNum) {
          setDeleteReactionsFeedback('Enter a valid message ID.')
          setIsDeletingReactions(false)
          return
        }
        const res = await window.guidegram.deleteParticipantReaction(
          accountId,
          chatId,
          msgIdNum,
          reactionParticipantId.trim() || undefined
        )
        if (res) {
          setDeleteReactionsFeedback(`Participant reaction removed from message #${msgIdNum}.`)
        } else {
          setDeleteReactionsFeedback('Failed to remove participant reaction.')
        }
      } else {
        const res = await window.guidegram.deleteParticipantReactions(
          accountId,
          chatId,
          reactionParticipantId.trim() || undefined
        )
        if (res) {
          setDeleteReactionsFeedback('All participant reactions in chat removed.')
        } else {
          setDeleteReactionsFeedback('Failed to remove reactions. Check permissions.')
        }
      }
    } catch (err: any) {
      setDeleteReactionsFeedback(err?.message || 'Error deleting reactions.')
    } finally {
      setIsDeletingReactions(false)
    }
  }

  const handleDeletePhoneCallHistory = async () => {
    if (!window.guidegram?.deletePhoneCallHistory) return
    setIsDeletingCallHistory(true)
    setDeleteCallHistoryFeedback(null)
    try {
      const res = await window.guidegram.deletePhoneCallHistory(accountId, callHistoryRevoke)
      if (res) {
        setDeleteCallHistoryFeedback('Call history successfully wiped from Telegram cloud.')
      } else {
        setDeleteCallHistoryFeedback('Failed to delete call history.')
      }
    } catch (err: any) {
      setDeleteCallHistoryFeedback(err?.message || 'Error deleting call history.')
    } finally {
      setIsDeletingCallHistory(false)
    }
  }

  // Microphase 040 Handlers
  const handleExportPermanentInvite = async () => {
    if (!window.guidegram?.exportChatInvite) return
    setIsExportingInvite(true)
    setExportInviteFeedback(null)
    try {
      const link = await window.guidegram.exportChatInvite(accountId, chatId)
      if (link) {
        setM040ExportedLink(link)
        setExportInviteFeedback('Permanent chat invite link generated successfully.')
      } else {
        setExportInviteFeedback('Failed to generate invite link.')
      }
    } catch (err: any) {
      setExportInviteFeedback(err?.message || 'Error exporting invite link.')
    } finally {
      setIsExportingInvite(false)
    }
  }

  const handleFaveSticker = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!window.guidegram?.faveSticker || !m040StickerId.trim()) return
    setIsFavingSticker(true)
    setFaveStickerFeedback(null)
    try {
      const res = await window.guidegram.faveSticker(accountId, { _: 'inputDocument', id: m040StickerId.trim() }, m040Unfave)
      if (res) {
        setFaveStickerFeedback(m040Unfave ? 'Sticker removed from favorites.' : 'Sticker added to favorites.')
        setM040StickerId('')
      } else {
        setFaveStickerFeedback('Operation failed.')
      }
    } catch (err: any) {
      setFaveStickerFeedback(err?.message || 'Error updating sticker favorites.')
    } finally {
      setIsFavingSticker(false)
    }
  }

  const handleForwardMessages = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!window.guidegram?.forwardMessages || !m040ForwardToPeer.trim() || !m040ForwardMsgIds.trim()) return
    setIsForwardingMessages(true)
    setForwardFeedback(null)
    try {
      const ids = m040ForwardMsgIds.split(',').map((x) => parseInt(x.trim(), 10)).filter((n) => !isNaN(n))
      if (ids.length === 0) {
        setForwardFeedback('Enter at least one valid message ID.')
        setIsForwardingMessages(false)
        return
      }
      await window.guidegram.forwardMessages(accountId, m040ForwardToPeer.trim(), chatId, ids, {})
      setForwardFeedback(`Forwarded ${ids.length} message(s) successfully.`)
      setM040ForwardMsgIds('')
    } catch (err: any) {
      setForwardFeedback(err?.message || 'Error forwarding messages.')
    } finally {
      setIsForwardingMessages(false)
    }
  }

  const handleGetAdminsWithInvites = async () => {
    if (!window.guidegram?.getAdminsWithInvites) return
    setIsLoadingAdmins(true)
    setAdminsFeedback(null)
    try {
      const res = await window.guidegram.getAdminsWithInvites(accountId, chatId)
      const count = Array.isArray(res?.admins) ? res.admins.length : Array.isArray(res) ? res.length : 0
      setM040AdminsCount(count)
      setAdminsFeedback(`Retrieved ${count} administrator(s) with active invites.`)
    } catch (err: any) {
      setAdminsFeedback(err?.message || 'Error fetching admins with invites.')
    } finally {
      setIsLoadingAdmins(false)
    }
  }

  const handleGetAllDrafts = async () => {
    if (!window.guidegram?.getAllDrafts) return
    setIsLoadingDrafts(true)
    setDraftsFeedback(null)
    try {
      const drafts = await window.guidegram.getAllDrafts(accountId)
      const count = drafts && typeof drafts === 'object' ? Object.keys(drafts).length : 0
      setM040DraftsCount(count)
      setDraftsFeedback(`Synchronized ${count} cloud draft(s) across account.`)
    } catch (err: any) {
      setDraftsFeedback(err?.message || 'Error synchronizing drafts.')
    } finally {
      setIsLoadingDrafts(false)
    }
  }

  const handleGetAllStickers = async () => {
    if (!window.guidegram?.getAllStickers) return
    setIsLoadingStickers(true)
    setStickersFeedback(null)
    try {
      const res = await window.guidegram.getAllStickers(accountId)
      const count = Array.isArray(res?.sets) ? res.sets.length : 0
      setM040StickersCount(count)
      setStickersFeedback(`Retrieved ${count} installed sticker set(s).`)
    } catch (err: any) {
      setStickersFeedback(err?.message || 'Error fetching sticker sets.')
    } finally {
      setIsLoadingStickers(false)
    }
  }

  const handleGetArchivedStickers = async () => {
    if (!window.guidegram?.getArchivedStickers) return
    setIsLoadingArchived(true)
    setArchivedFeedback(null)
    try {
      const res = await window.guidegram.getArchivedStickers(accountId, { limit: 50 })
      const count = Array.isArray(res?.sets) ? res.sets.length : Array.isArray(res) ? res.length : 0
      setM040ArchivedCount(count)
      setArchivedFeedback(`Found ${count} archived sticker set(s).`)
    } catch (err: any) {
      setArchivedFeedback(err?.message || 'Error fetching archived stickers.')
    } finally {
      setIsLoadingArchived(false)
    }
  }

  // Microphase 042 Handlers
  const handleGetChatInviteImporters = async () => {
    if (!window.guidegram?.getChatInviteImporters) return
    setIsLoadingImporters(true)
    setImportersFeedback(null)
    try {
      const res = await window.guidegram.getChatInviteImporters(accountId, { peerId: chatId, requested: m042RequestedOnly, limit: 50 })
      const count = Array.isArray(res?.importers) ? res.importers.length : 0
      setM042ImportersCount(count)
      setImportersFeedback(`Found ${count} join importer(s) for this chat.`)
    } catch (err: any) {
      setImportersFeedback(err?.message || 'Error fetching invite importers.')
    } finally {
      setIsLoadingImporters(false)
    }
  }

  const handleGetChats = async () => {
    if (!window.guidegram?.getChats) return
    setIsLoadingChats(true)
    setChatsFeedback(null)
    try {
      const res = await window.guidegram.getChats(accountId, chatId)
      const count = Array.isArray(res?.chats) ? res.chats.length : 0
      setM042ChatsCount(count)
      setChatsFeedback(`Retrieved metadata for ${count} chat(s).`)
    } catch (err: any) {
      setChatsFeedback(err?.message || 'Error fetching chat metadata.')
    } finally {
      setIsLoadingChats(false)
    }
  }

  const handleGetCommonChats = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!window.guidegram?.getCommonChats || !m042CommonUserId.trim()) return
    setIsLoadingCommonChats(true)
    setCommonChatsFeedback(null)
    try {
      const chats = await window.guidegram.getCommonChats(accountId, m042CommonUserId.trim(), 50)
      const count = Array.isArray(chats) ? chats.length : 0
      setM042CommonChatsCount(count)
      setCommonChatsFeedback(`Found ${count} mutual group(s) with user ${m042CommonUserId.trim()}.`)
    } catch (err: any) {
      setCommonChatsFeedback(err?.message || 'Error fetching mutual groups.')
    } finally {
      setIsLoadingCommonChats(false)
    }
  }

  const handleGetCustomEmojiDoc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!window.guidegram?.getCustomEmojiDocuments || !m042EmojiDocId.trim()) return
    setIsLoadingEmojiDoc(true)
    setEmojiDocFeedback(null)
    try {
      const res = await window.guidegram.getCustomEmojiDocuments(accountId, m042EmojiDocId.trim())
      const docs = Array.isArray(res) ? res : Array.isArray(res?.documents) ? res.documents : []
      setEmojiDocFeedback(`Retrieved ${docs.length} custom emoji document specification(s).`)
    } catch (err: any) {
      setEmojiDocFeedback(err?.message || 'Error fetching custom emoji document.')
    } finally {
      setIsLoadingEmojiDoc(false)
    }
  }

  const handleGetDefaultHistoryTTL = async () => {
    if (!window.guidegram?.getDefaultHistoryTTL) return
    setIsLoadingTTL(true)
    setTtlFeedback(null)
    try {
      const ttl = await window.guidegram.getDefaultHistoryTTL(accountId)
      setM042HistoryTTL(ttl?.period ?? 0)
      setTtlFeedback(`Default cloud history auto-delete period: ${ttl?.period ? `${ttl.period}s` : 'Disabled'}.`)
    } catch (err: any) {
      setTtlFeedback(err?.message || 'Error fetching default history TTL.')
    } finally {
      setIsLoadingTTL(false)
    }
  }

  const handleGetDefaultTagReactions = async () => {
    if (!window.guidegram?.getDefaultTagReactions) return
    setIsLoadingTagReactions(true)
    setTagReactionsFeedback(null)
    try {
      const res = await window.guidegram.getDefaultTagReactions(accountId)
      const count = Array.isArray(res?.reactions) ? res.reactions.length : 0
      setM042TagReactionsCount(count)
      setTagReactionsFeedback(`Retrieved ${count} default tag reaction emoji(s).`)
    } catch (err: any) {
      setTagReactionsFeedback(err?.message || 'Error fetching tag reactions.')
    } finally {
      setIsLoadingTagReactions(false)
    }
  }

  const handleGetDhConfig = async () => {
    if (!window.guidegram?.getDhConfig) return
    setIsLoadingDh(true)
    setDhFeedback(null)
    try {
      const res = await window.guidegram.getDhConfig(accountId, 0, 256)
      setM042DhConfigStatus(res ? 'Verified' : 'Unavailable')
      setDhFeedback(res ? 'Diffie-Hellman encryption parameters verified.' : 'DH config not available.')
    } catch (err: any) {
      setDhFeedback(err?.message || 'Error checking Diffie-Hellman configuration.')
    } finally {
      setIsLoadingDh(false)
    }
  }

  // --- Microphase 118: Chatlists Domain Suite Part 1 Handlers ---
  const handleCheckChatlistInvite = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!window.guidegram?.chatlistsCheckChatlistInviteRaw || !clCheckSlug.trim()) return
    setIsCheckingInvite(true)
    setCheckInviteFeedback(null)
    setClCheckResult(null)
    try {
      const cleanSlug = clCheckSlug.replace(/^https?:\/\/t\.me\/addlist\//, '').trim()
      const res = await window.guidegram.chatlistsCheckChatlistInviteRaw(accountId, { slug: cleanSlug })
      setClCheckResult(res)
      const title = res?.title || res?.chatlist?.title || 'پوشه اشتراکی'
      const count = Array.isArray(res?.peers) ? res.peers.length : Array.isArray(res?.chats) ? res.chats.length : 0
      setCheckInviteFeedback(`لینک معتبر است: «${title}» با ${count} گفتگو.`)
    } catch (err: any) {
      setCheckInviteFeedback(err?.message || 'خطا در اعتبارسنجی لینک چت‌لیست.')
    } finally {
      setIsCheckingInvite(false)
    }
  }

  const handleExportChatlistInvite = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!window.guidegram?.chatlistsExportChatlistInviteRaw) return
    setIsExportingChatlist(true)
    setExportChatlistFeedback(null)
    try {
      const folderIdNum = parseInt(clFolderId, 10) || 1
      const peersList = clExportPeers.trim()
        ? clExportPeers.split(',').map((s) => s.trim()).filter(Boolean)
        : [chatId]
      const res = await window.guidegram.chatlistsExportChatlistInviteRaw(accountId, {
        chatlist: folderIdNum,
        title: clExportTitle.trim() || `Shared Folder ${folderIdNum}`,
        peers: peersList,
      })
      setLastExportedInvite(res)
      const link = res?.url || (res?.slug ? `https://t.me/addlist/${res.slug}` : 'صادر شد')
      setExportChatlistFeedback(`لینک اشتراک پوشه با موفقیت ایجاد شد: ${link}`)
      void handleGetExportedInvites()
    } catch (err: any) {
      setExportChatlistFeedback(err?.message || 'خطا در صدور لینک اشتراک پوشه.')
    } finally {
      setIsExportingChatlist(false)
    }
  }

  const handleGetExportedInvites = async () => {
    if (!window.guidegram?.chatlistsGetExportedInvitesRaw) return
    setIsLoadingExportedInvites(true)
    setExportedInvitesFeedback(null)
    try {
      const folderIdNum = parseInt(clFolderId, 10) || 1
      const res = await window.guidegram.chatlistsGetExportedInvitesRaw(accountId, {
        chatlist: folderIdNum,
      })
      const invites = Array.isArray(res?.invites) ? res.invites : Array.isArray(res) ? res : []
      setClExportedInvites(invites)
      setExportedInvitesFeedback(`تعداد ${invites.length} لینک صادر شده برای پوشه ${folderIdNum} دریافت شد.`)
    } catch (err: any) {
      setExportedInvitesFeedback(err?.message || 'خطا در دریافت لینک‌های صادر شده.')
    } finally {
      setIsLoadingExportedInvites(false)
    }
  }

  const handleEditExportedInvite = async (slug: string, newTitle: string) => {
    if (!window.guidegram?.chatlistsEditExportedInviteRaw || !slug) return
    setIsEditingExported(true)
    setEditExportedFeedback(null)
    try {
      const folderIdNum = parseInt(clFolderId, 10) || 1
      await window.guidegram.chatlistsEditExportedInviteRaw(accountId, {
        chatlist: folderIdNum,
        slug,
        title: newTitle.trim(),
      })
      setEditExportedFeedback(`عنوان لینک به «${newTitle.trim()}» به‌روزرسانی شد.`)
      setClEditSlug('')
      setClEditTitle('')
      void handleGetExportedInvites()
    } catch (err: any) {
      setEditExportedFeedback(err?.message || 'خطا در ویرایش عنوان لینک پوشه.')
    } finally {
      setIsEditingExported(false)
    }
  }

  const handleDeleteExportedInvite = async (slug: string) => {
    if (!window.guidegram?.chatlistsDeleteExportedInviteRaw || !slug) return
    setIsDeletingSlug(slug)
    setDeleteExportedFeedback(null)
    try {
      const folderIdNum = parseInt(clFolderId, 10) || 1
      await window.guidegram.chatlistsDeleteExportedInviteRaw(accountId, {
        chatlist: folderIdNum,
        slug,
      })
      setDeleteExportedFeedback(`لینک اشتراک ${slug} حذف شد.`)
      setClExportedInvites((prev) => prev.filter((inv) => (inv.slug || inv.url) !== slug))
    } catch (err: any) {
      setDeleteExportedFeedback(err?.message || 'خطا در حذف لینک پوشه.')
    } finally {
      setIsDeletingSlug(null)
    }
  }

  const handleGetChatlistUpdates = async () => {
    if (!window.guidegram?.chatlistsGetChatlistUpdatesRaw) return
    setIsLoadingUpdates(true)
    setUpdatesFeedback(null)
    try {
      const folderIdNum = parseInt(clFolderId, 10) || 1
      const res = await window.guidegram.chatlistsGetChatlistUpdatesRaw(accountId, {
        chatlist: folderIdNum,
      })
      setClUpdates(res)
      const missing = Array.isArray(res?.missing_peers) ? res.missing_peers.length : 0
      setUpdatesFeedback(missing > 0 ? `تعداد ${missing} گفتگوی جدید به این پوشه اضافه شده است.` : 'هیچ گفتگوی جدیدی برای همگام‌سازی وجود ندارد.')
    } catch (err: any) {
      setUpdatesFeedback(err?.message || 'خطا در استعلام آپدیت‌های چت‌لیست.')
    } finally {
      setIsLoadingUpdates(false)
    }
  }

  const handleGetLeaveChatlistSuggestions = async () => {
    if (!window.guidegram?.chatlistsGetLeaveChatlistSuggestionsRaw) return
    setIsLoadingLeaveSuggestions(true)
    setLeaveSuggestionsFeedback(null)
    try {
      const folderIdNum = parseInt(clFolderId, 10) || 1
      const res = await window.guidegram.chatlistsGetLeaveChatlistSuggestionsRaw(accountId, {
        chatlist: folderIdNum,
      })
      setClLeaveSuggestions(res)
      const count = Array.isArray(res?.peers) ? res.peers.length : Array.isArray(res) ? res.length : 0
      setLeaveSuggestionsFeedback(`تعداد ${count} گفتگو برای ترک هنگام خروج از این پوشه پیشنهاد شد.`)
    } catch (err: any) {
      setLeaveSuggestionsFeedback(err?.message || 'خطا در دریافت پیشنهادهای ترک چت‌لیست.')
    } finally {
      setIsLoadingLeaveSuggestions(false)
    }
  }

  // --- Microphase 119: Chatlists Domain Suite Part 2 Handlers ---
  const handleJoinChatlistInvite = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!window.guidegram?.chatlistsJoinChatlistInviteRaw || !clCheckSlug.trim()) return
    setIsJoiningInvite(true)
    setJoinInviteFeedback(null)
    try {
      const cleanSlug = clCheckSlug.replace(/^https?:\/\/t\.me\/addlist\//, '').trim()
      const peersList = clJoinPeers.trim()
        ? clJoinPeers.split(',').map((s) => s.trim()).filter(Boolean)
        : [chatId]
      const res = await window.guidegram.chatlistsJoinChatlistInviteRaw(accountId, {
        slug: cleanSlug,
        peers: peersList,
      })
      const count = Array.isArray(res?.missing_peers) ? res.missing_peers.length : 0
      setJoinInviteFeedback(count > 0 ? `با موفقیت به پوشه اشتراکی پیوستید (${count} گفتگو در صف تایید).` : 'با موفقیت به تمام گفتگوهای این پوشه اشتراکی ملحق شدید.')
    } catch (err: any) {
      setJoinInviteFeedback(err?.message || 'خطا در عضویت در پوشه اشتراکی.')
    } finally {
      setIsJoiningInvite(false)
    }
  }

  const handleJoinChatlistUpdates = async () => {
    if (!window.guidegram?.chatlistsJoinChatlistUpdatesRaw) return
    setIsJoiningUpdates(true)
    setJoinUpdatesFeedback(null)
    try {
      const folderIdNum = parseInt(clFolderId, 10) || 1
      const peersList = clJoinUpdatesPeers.trim()
        ? clJoinUpdatesPeers.split(',').map((s) => s.trim()).filter(Boolean)
        : [chatId]
      await window.guidegram.chatlistsJoinChatlistUpdatesRaw(accountId, {
        chatlist: folderIdNum,
        peers: peersList,
      })
      setJoinUpdatesFeedback('گفتگوهای جدید با موفقیت به پوشه اضافه شدند.')
      void handleGetChatlistUpdates()
    } catch (err: any) {
      setJoinUpdatesFeedback(err?.message || 'خطا در افزودن آپدیت‌های چت‌لیست.')
    } finally {
      setIsJoiningUpdates(false)
    }
  }

  const handleHideChatlistUpdates = async () => {
    if (!window.guidegram?.chatlistsHideChatlistUpdatesRaw) return
    setIsHidingUpdates(true)
    setHideUpdatesFeedback(null)
    try {
      const folderIdNum = parseInt(clFolderId, 10) || 1
      await window.guidegram.chatlistsHideChatlistUpdatesRaw(accountId, {
        chatlist: folderIdNum,
      })
      setHideUpdatesFeedback('آپدیت‌های معلق این پوشه با موفقیت مخفی شدند.')
      setClUpdates(null)
    } catch (err: any) {
      setHideUpdatesFeedback(err?.message || 'خطا در مخفی‌سازی آپدیت‌های چت‌لیست.')
    } finally {
      setIsHidingUpdates(false)
    }
  }

  const handleLeaveChatlist = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!window.guidegram?.chatlistsLeaveChatlistRaw) return
    setIsLeavingChatlist(true)
    setLeaveChatlistFeedback(null)
    try {
      const folderIdNum = parseInt(clFolderId, 10) || 1
      const peersList = clLeavePeers.trim()
        ? clLeavePeers.split(',').map((s) => s.trim()).filter(Boolean)
        : [chatId]
      await window.guidegram.chatlistsLeaveChatlistRaw(accountId, {
        chatlist: folderIdNum,
        peers: peersList,
      })
      setLeaveChatlistFeedback(`پوشه ${folderIdNum} با موفقیت ترک شد و گفتگوهای تعیین‌شده پاکسازی شدند.`)
    } catch (err: any) {
      setLeaveChatlistFeedback(err?.message || 'خطا در خروج از پوشه اشتراکی.')
    } finally {
      setIsLeavingChatlist(false)
    }
  }

  if (!isOpen) return null

  const canRequireApproval = Boolean(details?.username)
  const minExpiry = toInputValue(Math.floor(Date.now() / 1000) + 60)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative flex flex-col w-full max-w-xl max-h-[92vh] bg-dark-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
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
              <button
                type="button"
                onClick={() => switchTab('maintenance')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  tab === 'maintenance'
                    ? 'bg-amber-500/20 text-amber-200'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Maintenance & Purge
              </button>
              <button
                type="button"
                onClick={() => switchTab('chatlists')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  tab === 'chatlists'
                    ? 'bg-cyan-500/20 text-cyan-200'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>پوشه‌های اشتراکی (Chatlists)</span>
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

          {tab === 'maintenance' ? (
            <div className="space-y-4">
              {/* 1. Permanent Chat Invite Purge (messages.deleteExportedChatInvite) */}
              <form onSubmit={handlePurgeInviteLink} className="p-4 rounded-2xl bg-dark-850/90 border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Permanent Invite Link Purge (deleteExportedChatInvite)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    MTProto Core
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Completely eradicates an active or revoked invite link from Telegram servers, preventing any historical joining.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={purgeInviteLink}
                    onChange={(e) => setPurgeInviteLink(e.target.value)}
                    placeholder="https://t.me/+... or invite hash"
                    className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-400 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isPurgingInvite || !purgeInviteLink.trim()}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isPurgingInvite ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Purge Link</span>
                  </button>
                </div>
                {purgeInviteFeedback && <div className="text-[11px] text-rose-300">{purgeInviteFeedback}</div>}
              </form>

              {/* 2. Fact-Check Deletion (messages.deleteFactCheck) */}
              <form onSubmit={handleDeleteFactCheck} className="p-4 rounded-2xl bg-dark-850/90 border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Remove Fact-Check Note (deleteFactCheck)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Layer 232 News
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Deletes administrator-verified fact-check cards or disclaimers attached to a specific chat message.
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    required
                    value={factCheckMsgId}
                    onChange={(e) => setFactCheckMsgId(e.target.value)}
                    placeholder="Target Message ID (e.g. 42819)"
                    className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isDeletingFactCheck || !factCheckMsgId.trim()}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isDeletingFactCheck ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Delete Fact-Check</span>
                  </button>
                </div>
                {deleteFactCheckFeedback && <div className="text-[11px] text-amber-300">{deleteFactCheckFeedback}</div>}
              </form>

              {/* 3. Participant Reactions Eraser (messages.deleteParticipantReaction & messages.deleteParticipantReactions) */}
              <div className="p-4 rounded-2xl bg-dark-850/90 border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                    <ShieldQuestion className="w-4 h-4 text-cyan-400" />
                    <span>Participant Reactions Moderator (deleteParticipantReactions)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    Spam Defense
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Wipes abusive emoji reactions from a specific message or erases all reactions from a participant across the entire chat.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={reactionParticipantId}
                    onChange={(e) => setReactionParticipantId(e.target.value)}
                    placeholder="Participant ID / Username (Optional)"
                    className="bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  <input
                    type="number"
                    value={reactionMsgId}
                    onChange={(e) => setReactionMsgId(e.target.value)}
                    placeholder="Message ID (for single message)"
                    className="bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDeleteParticipantReactions(true)}
                    disabled={isDeletingReactions || !reactionMsgId.trim()}
                    className="flex-1 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isDeletingReactions ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Delete Msg Reactions</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteParticipantReactions(false)}
                    disabled={isDeletingReactions}
                    className="flex-1 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isDeletingReactions ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Wipe User Reactions (All)</span>
                  </button>
                </div>
                {deleteReactionsFeedback && <div className="text-[11px] text-cyan-300">{deleteReactionsFeedback}</div>}
              </div>

              {/* 4. Phone/Video Call History Destroyer (messages.deletePhoneCallHistory) */}
              <div className="p-4 rounded-2xl bg-dark-850/90 border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Global Call History Purge (deletePhoneCallHistory)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    Privacy Purge
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Permanently deletes all voice and video call logs across your Telegram account.
                </p>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={callHistoryRevoke}
                      onChange={(e) => setCallHistoryRevoke(e.target.checked)}
                      className="rounded border-white/20 text-rose-500 focus:ring-0"
                    />
                    <span>Revoke call history for other participants as well</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleDeletePhoneCallHistory}
                    disabled={isDeletingCallHistory}
                    className="py-1.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isDeletingCallHistory ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Wipe Call Logs</span>
                  </button>
                </div>
                {deleteCallHistoryFeedback && <div className="text-[11px] text-rose-300">{deleteCallHistoryFeedback}</div>}
              </div>

              {/* Microphase 040: Layer 232 Messages Operations Suite */}
              <div className="p-4 rounded-2xl bg-dark-850/90 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary-400">
                    <Link2 className="w-4 h-4 text-primary-400" />
                    <span>Layer 232 Message & Sticker Suite (Microphase 040)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
                    Phase 040 • 7 RPCs
                  </span>
                </div>

                {/* 1. messages.exportChatInvite */}
                <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-300">
                      ۱. صدور لینک دعوت دائمی چت (exportChatInvite)
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">messages.exportChatInvite</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleExportPermanentInvite}
                      disabled={isExportingInvite}
                      className="px-3.5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {isExportingInvite ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>تولید لینک دائمی</span>
                    </button>
                    {m040ExportedLink && (
                      <div className="flex-1 flex items-center justify-between px-3 py-1 bg-dark-900 border border-white/5 rounded-xl text-xs text-primary-300 font-mono">
                        <span className="truncate">{m040ExportedLink}</span>
                        <button
                          type="button"
                          onClick={() => copyTextToClipboard(m040ExportedLink)}
                          className="p-1 hover:text-white"
                          title="کپی لینک"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {exportInviteFeedback && <div className="text-[10px] text-gray-400">{exportInviteFeedback}</div>}
                </div>

                {/* 2. messages.faveSticker */}
                <form onSubmit={handleFaveSticker} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-300">
                      ۲. علاقه‌مندی استیکر (faveSticker)
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">messages.faveSticker</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                    <input
                      type="text"
                      value={m040StickerId}
                      onChange={(e) => setM040StickerId(e.target.value)}
                      placeholder="شناسه استیکر (Document ID)"
                      className="sm:col-span-2 bg-dark-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-400 font-mono"
                    />
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={m040Unfave}
                        onChange={(e) => setM040Unfave(e.target.checked)}
                        className="rounded border-white/20 text-primary-500"
                      />
                      <span>حذف از علاقه‌مندی</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={isFavingSticker || !m040StickerId.trim()}
                    className="w-full py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isFavingSticker ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>اعمال وضعیت استیکر</span>
                  </button>
                  {faveStickerFeedback && <div className="text-[10px] text-gray-400">{faveStickerFeedback}</div>}
                </form>

                {/* 3. messages.forwardMessages */}
                <form onSubmit={handleForwardMessages} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-300">
                      ۳. فوروارد مستقیم پیام‌ها (forwardMessages)
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">messages.forwardMessages</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={m040ForwardToPeer}
                      onChange={(e) => setM040ForwardToPeer(e.target.value)}
                      placeholder="شناسه مقصد (To Peer ID / Username)"
                      className="bg-dark-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-400 font-mono"
                    />
                    <input
                      type="text"
                      value={m040ForwardMsgIds}
                      onChange={(e) => setM040ForwardMsgIds(e.target.value)}
                      placeholder="شناسه‌های پیام (جداشده با کاما: 12, 13)"
                      className="bg-dark-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-400 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isForwardingMessages || !m040ForwardToPeer.trim() || !m040ForwardMsgIds.trim()}
                    className="w-full py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isForwardingMessages ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>فوروارد پیام‌ها</span>
                  </button>
                  {forwardFeedback && <div className="text-[10px] text-gray-400">{forwardFeedback}</div>}
                </form>

                {/* 4, 5, 6, 7: Inspector Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* 4. messages.getAdminsWithInvites */}
                  <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۴. ادمین‌های لینک‌دار (getAdminsWithInvites)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGetAdminsWithInvites}
                      disabled={isLoadingAdmins}
                      className="w-full py-1.5 rounded-xl bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {isLoadingAdmins ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                      <span>استعلام ادمین‌ها {m040AdminsCount !== null ? `(${m040AdminsCount})` : ''}</span>
                    </button>
                    {adminsFeedback && <div className="text-[10px] text-gray-400">{adminsFeedback}</div>}
                  </div>

                  {/* 5. messages.getAllDrafts */}
                  <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۵. همگام‌سازی پیش‌نویس‌ها (getAllDrafts)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGetAllDrafts}
                      disabled={isLoadingDrafts}
                      className="w-full py-1.5 rounded-xl bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {isLoadingDrafts ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Edit3 className="w-3.5 h-3.5" />}
                      <span>بررسی درفت‌ها {m040DraftsCount !== null ? `(${m040DraftsCount})` : ''}</span>
                    </button>
                    {draftsFeedback && <div className="text-[10px] text-gray-400">{draftsFeedback}</div>}
                  </div>

                  {/* 6. messages.getAllStickers */}
                  <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۶. دریافت استیکرها (getAllStickers)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGetAllStickers}
                      disabled={isLoadingStickers}
                      className="w-full py-1.5 rounded-xl bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {isLoadingStickers ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      <span>مجموعه‌های استیکر {m040StickersCount !== null ? `(${m040StickersCount})` : ''}</span>
                    </button>
                    {stickersFeedback && <div className="text-[10px] text-gray-400">{stickersFeedback}</div>}
                  </div>

                  {/* 7. messages.getArchivedStickers */}
                  <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۷. استیکرهای آرشیو (getArchivedStickers)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGetArchivedStickers}
                      disabled={isLoadingArchived}
                      className="w-full py-1.5 rounded-xl bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {isLoadingArchived ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      <span>استیکرهای آرشیو {m040ArchivedCount !== null ? `(${m040ArchivedCount})` : ''}</span>
                    </button>
                    {archivedFeedback && <div className="text-[10px] text-gray-400">{archivedFeedback}</div>}
                  </div>
                </div>
              </div>

              {/* Microphase 042: Layer 232 Chat Importers & Security Suite */}
              <div className="p-4 rounded-2xl bg-dark-850/90 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-accent-cyan">
                    <Users className="w-4 h-4 text-accent-cyan" />
                    <span>Layer 232 Chat Importers & Security Suite (Microphase 042)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                    Phase 042 • 7 RPCs
                  </span>
                </div>

                {/* 1. messages.getChatInviteImporters */}
                <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-300">
                      ۱. افراد پیوسته با لینک دعوت (getChatInviteImporters)
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">messages.getChatInviteImporters</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={m042RequestedOnly}
                        onChange={(e) => setM042RequestedOnly(e.target.checked)}
                        className="rounded border-white/20 text-accent-cyan"
                      />
                      <span>فقط درخواست‌های در انتظار تأیید</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGetChatInviteImporters}
                      disabled={isLoadingImporters}
                      className="px-3.5 py-1.5 rounded-xl bg-accent-cyan/20 hover:bg-accent-cyan/30 border border-accent-cyan/30 text-accent-cyan text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {isLoadingImporters ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                      <span>استعلام واردکنندگان {m042ImportersCount !== null ? `(${m042ImportersCount})` : ''}</span>
                    </button>
                  </div>
                  {importersFeedback && <div className="text-[10px] text-gray-400">{importersFeedback}</div>}
                </div>

                {/* 3. messages.getCommonChats */}
                <form onSubmit={handleGetCommonChats} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-300">
                      ۳. گروه‌های مشترک با کاربر (getCommonChats)
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">messages.getCommonChats</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={m042CommonUserId}
                      onChange={(e) => setM042CommonUserId(e.target.value)}
                      placeholder="شناسه کاربر یا یوزرنیم..."
                      className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-cyan font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isLoadingCommonChats || !m042CommonUserId.trim()}
                      className="px-3.5 py-1.5 rounded-xl bg-accent-cyan/20 hover:bg-accent-cyan/30 border border-accent-cyan/30 text-accent-cyan text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {isLoadingCommonChats ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                      <span>استعلام گروه‌ها {m042CommonChatsCount !== null ? `(${m042CommonChatsCount})` : ''}</span>
                    </button>
                  </div>
                  {commonChatsFeedback && <div className="text-[10px] text-gray-400">{commonChatsFeedback}</div>}
                </form>

                {/* 4. messages.getCustomEmojiDocuments */}
                <form onSubmit={handleGetCustomEmojiDoc} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-300">
                      ۴. استعلام سند کاستوم ایموجی (getCustomEmojiDocuments)
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">messages.getCustomEmojiDocuments</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={m042EmojiDocId}
                      onChange={(e) => setM042EmojiDocId(e.target.value)}
                      placeholder="شناسه سند ایموجی (Document ID)..."
                      className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-cyan font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isLoadingEmojiDoc || !m042EmojiDocId.trim()}
                      className="px-3.5 py-1.5 rounded-xl bg-accent-cyan/20 hover:bg-accent-cyan/30 border border-accent-cyan/30 text-accent-cyan text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {isLoadingEmojiDoc ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>دریافت سند</span>
                    </button>
                  </div>
                  {emojiDocFeedback && <div className="text-[10px] text-gray-400">{emojiDocFeedback}</div>}
                </form>

                {/* 2, 5, 6, 7 Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* 2. messages.getChats */}
                  <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۲. متادیتای چت‌ها (getChats)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGetChats}
                      disabled={isLoadingChats}
                      className="w-full py-1.5 rounded-xl bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {isLoadingChats ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      <span>استعلام چت فعلی {m042ChatsCount !== null ? `(${m042ChatsCount})` : ''}</span>
                    </button>
                    {chatsFeedback && <div className="text-[10px] text-gray-400">{chatsFeedback}</div>}
                  </div>

                  {/* 5. messages.getDefaultHistoryTTL */}
                  <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۵. پیش‌فرض حذف خودکار (getDefaultHistoryTTL)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGetDefaultHistoryTTL}
                      disabled={isLoadingTTL}
                      className="w-full py-1.5 rounded-xl bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {isLoadingTTL ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                      <span>بررسی TTL پیش‌فرض</span>
                    </button>
                    {ttlFeedback && <div className="text-[10px] text-gray-400">{ttlFeedback}</div>}
                  </div>

                  {/* 6. messages.getDefaultTagReactions */}
                  <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۶. تگ‌های واکنش (getDefaultTagReactions)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGetDefaultTagReactions}
                      disabled={isLoadingTagReactions}
                      className="w-full py-1.5 rounded-xl bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {isLoadingTagReactions ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>تگ‌های ری‌اکشن {m042TagReactionsCount !== null ? `(${m042TagReactionsCount})` : ''}</span>
                    </button>
                    {tagReactionsFeedback && <div className="text-[10px] text-gray-400">{tagReactionsFeedback}</div>}
                  </div>

                  {/* 7. messages.getDhConfig */}
                  <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۷. پیکربندی Diffie-Hellman (getDhConfig)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGetDhConfig}
                      disabled={isLoadingDh}
                      className="w-full py-1.5 rounded-xl bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {isLoadingDh ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>بررسی DH Config {m042DhConfigStatus ? `(${m042DhConfigStatus})` : ''}</span>
                    </button>
                    {dhFeedback && <div className="text-[10px] text-gray-400">{dhFeedback}</div>}
                  </div>
                </div>
              </div>
            </div>
          ) : tab === 'chatlists' ? (
            <div className="space-y-4">
              {/* Folder Selector Header */}
              <div className="p-4 rounded-2xl bg-dark-850/90 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                    <FolderPlus className="w-4 h-4 text-cyan-400" />
                    <span>مدیریت پوشه‌های اشتراکی (Chatlists & Share Folders)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    MTProto Layer 232
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  ایجاد، بررسی و مدیریت لینک‌های دعوت به پوشه‌های اشتراکی تلگرام (Shareable Chat Folders).
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <label className="text-[11px] font-medium text-gray-300 shrink-0">شناسه پوشه (Folder ID):</label>
                    <input
                      type="number"
                      min={1}
                      value={clFolderId}
                      onChange={(e) => setClFolderId(e.target.value)}
                      placeholder="Folder ID (مثلاً 1)"
                      className="w-24 bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGetExportedInvites}
                    disabled={isLoadingExportedInvites}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isLoadingExportedInvites ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>استعلام لینک‌های صادر شده</span>
                  </button>
                </div>
                {exportedInvitesFeedback && (
                  <div className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-3 py-1.5">
                    {exportedInvitesFeedback}
                  </div>
                )}
              </div>

              {/* 1. checkChatlistInvite */}
              <form onSubmit={handleCheckChatlistInvite} className="p-4 rounded-2xl bg-dark-850/90 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200 flex items-center gap-2">
                    <Search className="w-4 h-4 text-accent-cyan" />
                    ۱. اعتبارسنجی لینک چت‌لیست (checkChatlistInvite)
                  </span>
                  <span className="text-[9px] text-gray-500 font-mono">chatlists.checkChatlistInvite</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={clCheckSlug}
                    onChange={(e) => setClCheckSlug(e.target.value)}
                    placeholder="https://t.me/addlist/... یا شناسه slug"
                    className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isCheckingInvite || !clCheckSlug.trim()}
                    className="px-3.5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isCheckingInvite ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>بررسی لینک</span>
                  </button>
                </div>
                {checkInviteFeedback && (
                  <div className="text-[11px] text-gray-300 bg-dark-900 border border-white/5 rounded-xl p-2.5 space-y-1">
                    <div className="text-accent-cyan font-medium">{checkInviteFeedback}</div>
                    {clCheckResult && (
                      <div className="text-[10px] font-mono text-gray-400 max-h-24 overflow-y-auto whitespace-pre-wrap">
                        {JSON.stringify(clCheckResult, null, 2)}
                      </div>
                    )}
                  </div>
                )}
              </form>

              {/* 2. exportChatlistInvite */}
              <form onSubmit={handleExportChatlistInvite} className="p-4 rounded-2xl bg-dark-850/90 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200 flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-accent-emerald" />
                    ۲. صدور لینک اشتراک پوشه (exportChatlistInvite)
                  </span>
                  <span className="text-[9px] text-gray-500 font-mono">chatlists.exportChatlistInvite</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={clExportTitle}
                    onChange={(e) => setClExportTitle(e.target.value)}
                    placeholder="عنوان لینک دعوت (مثلاً: چت‌های برتر)"
                    className="bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                  />
                  <input
                    type="text"
                    value={clExportPeers}
                    onChange={(e) => setClExportPeers(e.target.value)}
                    placeholder="شناسه چت‌ها با کاما (خالی = چت فعلی)"
                    className="bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isExportingChatlist}
                  className="w-full py-2 rounded-xl bg-accent-emerald/20 hover:bg-accent-emerald/30 border border-accent-emerald/30 text-accent-emerald text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                >
                  {isExportingChatlist ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>ایجاد و صدور لینک جدید</span>
                </button>
                {exportChatlistFeedback && (
                  <div className="text-[11px] text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/20 rounded-xl p-2.5 flex items-center justify-between">
                    <span className="truncate">{exportChatlistFeedback}</span>
                    {lastExportedInvite?.url && (
                      <button
                        type="button"
                        onClick={() => copyTextToClipboard(lastExportedInvite.url)}
                        className="p-1 hover:text-white"
                        title="کپی لینک"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </form>

              {/* 3. getExportedInvites list & edit & delete */}
              <div className="p-4 rounded-2xl bg-dark-850/90 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    ۳. لینک‌های صادر شده و مدیریت (editExportedInvite & deleteExportedInvite)
                  </span>
                  <span className="text-[9px] text-gray-500 font-mono">chatlists.getExportedInvites</span>
                </div>
                {clExportedInvites.length === 0 ? (
                  <div className="p-4 rounded-xl bg-dark-900/60 border border-white/5 text-center text-xs text-gray-500">
                    لینکی صادر نشده یا هنوز استعلام نگرفته‌اید. برای مشاهده دکمه «استعلام لینک‌های صادر شده» را بزنید.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {clExportedInvites.map((inv: any, idx: number) => {
                      const slug = inv.slug || inv.url?.replace(/^https?:\/\/t\.me\/addlist\//, '') || String(idx)
                      const url = inv.url || `https://t.me/addlist/${slug}`
                      const invTitle = inv.title || `لینک ${idx + 1}`
                      const isEditing = clEditSlug === slug
                      return (
                        <div key={slug} className="p-3 bg-dark-900 rounded-xl border border-white/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-semibold text-white truncate">{invTitle}</span>
                              <span className="text-[10px] text-accent-cyan font-mono truncate">{url}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => copyTextToClipboard(url)}
                                className="p-1.5 hover:text-white text-gray-400 rounded-lg cursor-pointer"
                                title="کپی"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setClEditSlug(isEditing ? '' : slug)
                                  setClEditTitle(invTitle)
                                }}
                                className="p-1.5 hover:text-amber-300 text-gray-400 rounded-lg cursor-pointer"
                                title="ویرایش عنوان"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isDeletingSlug === slug}
                                onClick={() => handleDeleteExportedInvite(slug)}
                                className="p-1.5 hover:text-rose-400 text-gray-400 rounded-lg cursor-pointer disabled:opacity-40"
                                title="حذف لینک"
                              >
                                {isDeletingSlug === slug ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                          {isEditing && (
                            <div className="flex gap-2 pt-1 border-t border-white/5">
                              <input
                                type="text"
                                value={clEditTitle}
                                onChange={(e) => setClEditTitle(e.target.value)}
                                placeholder="عنوان جدید"
                                className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white"
                              />
                              <button
                                type="button"
                                disabled={isEditingExported || !clEditTitle.trim()}
                                onClick={() => handleEditExportedInvite(slug, clEditTitle)}
                                className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-semibold cursor-pointer"
                              >
                                {isEditingExported ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'ذخیره'}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                {editExportedFeedback && <div className="text-[10px] text-amber-300">{editExportedFeedback}</div>}
                {deleteExportedFeedback && <div className="text-[10px] text-rose-300">{deleteExportedFeedback}</div>}
              </div>

              {/* 4. getChatlistUpdates & getLeaveChatlistSuggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-dark-850/90 border border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      ۴. آپدیت‌های پوشه
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">getChatlistUpdates</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGetChatlistUpdates}
                    disabled={isLoadingUpdates}
                    className="w-full py-1.5 rounded-xl bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isLoadingUpdates ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>بررسی تغییرات چت‌ها</span>
                  </button>
                  {updatesFeedback && <div className="text-[10px] text-cyan-300 bg-cyan-500/10 rounded-lg p-2">{updatesFeedback}</div>}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleJoinChatlistUpdates}
                      disabled={isJoiningUpdates}
                      className="flex-1 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                      title="پیوستن به چت‌های جدید اضافه شده به پوشه"
                    >
                      {isJoiningUpdates ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      <span>پیوستن به آپدیت‌ها</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleHideChatlistUpdates}
                      disabled={isHidingUpdates}
                      className="py-1 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 text-[11px] font-semibold cursor-pointer disabled:opacity-40"
                      title="نادیده گرفتن آپدیت‌ها"
                    >
                      {isHidingUpdates ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'مخفی‌سازی'}
                    </button>
                  </div>
                  {joinUpdatesFeedback && <div className="text-[10px] text-accent-emerald">{joinUpdatesFeedback}</div>}
                  {hideUpdatesFeedback && <div className="text-[10px] text-gray-400">{hideUpdatesFeedback}</div>}
                </div>

                <div className="p-4 rounded-2xl bg-dark-850/90 border border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                      <ExternalLink className="w-4 h-4 text-rose-400" />
                      ۵. پیشنهادهای ترک پوشه
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">getLeaveChatlistSuggestions</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGetLeaveChatlistSuggestions}
                    disabled={isLoadingLeaveSuggestions}
                    className="w-full py-1.5 rounded-xl bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isLoadingLeaveSuggestions ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    <span>استعلام چت‌های حذفی</span>
                  </button>
                  {leaveSuggestionsFeedback && <div className="text-[10px] text-rose-300 bg-rose-500/10 rounded-lg p-2">{leaveSuggestionsFeedback}</div>}
                </div>
              </div>

              {/* 5. joinChatlistInvite & leaveChatlist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* joinChatlistInvite */}
                <form onSubmit={handleJoinChatlistInvite} className="p-4 rounded-2xl bg-dark-850/90 border border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-accent-emerald" />
                      ۶. عضویت در پوشه (joinChatlistInvite)
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">joinChatlistInvite</span>
                  </div>
                  <input
                    type="text"
                    value={clJoinPeers}
                    onChange={(e) => setClJoinPeers(e.target.value)}
                    placeholder="شناسه چت‌های انتخابی (خالی = همه)"
                    className="w-full bg-dark-800 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isJoiningInvite || !clCheckSlug.trim()}
                    className="w-full py-1.5 rounded-xl bg-accent-emerald/20 hover:bg-accent-emerald/30 border border-accent-emerald/30 text-accent-emerald text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isJoiningInvite ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>پیوستن به پوشه بررسی‌شده</span>
                  </button>
                  {joinInviteFeedback && <div className="text-[10px] text-accent-emerald bg-accent-emerald/10 rounded-lg p-2">{joinInviteFeedback}</div>}
                </form>

                {/* leaveChatlist */}
                <form onSubmit={handleLeaveChatlist} className="p-4 rounded-2xl bg-dark-850/90 border border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                      <Ban className="w-4 h-4 text-rose-400" />
                      ۷. خروج از پوشه (leaveChatlist)
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">leaveChatlist</span>
                  </div>
                  <input
                    type="text"
                    value={clLeavePeers}
                    onChange={(e) => setClLeavePeers(e.target.value)}
                    placeholder="شناسه چت‌های خروجی (خالی = چت فعلی)"
                    className="w-full bg-dark-800 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-400 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isLeavingChatlist}
                    className="w-full py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isLeavingChatlist ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>ترک قطعی پوشه اشتراکی</span>
                  </button>
                  {leaveChatlistFeedback && <div className="text-[10px] text-rose-300 bg-rose-500/10 rounded-lg p-2">{leaveChatlistFeedback}</div>}
                </form>
              </div>
            </div>
          ) : loading ? (
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
                        <button
                          type="button"
                          onClick={() => setSelectedJoinRequestLink(link.link)}
                          className="flex items-center gap-1 text-accent-amber hover:underline cursor-pointer"
                          title={t('join_requests.title')}
                        >
                          <ShieldQuestion className="w-3 h-3" />
                          {t('invite_links.requested_badge', {
                            count: formatNumber(link.requested || 0),
                          })}
                        </button>
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
      </motion.div>

      {selectedJoinRequestLink !== null && (
        <JoinRequestsModal
          isOpen={true}
          accountId={accountId}
          chatId={chatId}
          chatTitle={chatTitle}
          link={selectedJoinRequestLink || undefined}
          onClose={() => setSelectedJoinRequestLink(null)}
          onResolved={() => void fetchLinks(tab)}
        />
      )}
    </div>
  )
}
