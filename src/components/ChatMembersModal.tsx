import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Bot,
  Check,
  Crown,
  Hash,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  ShieldOff,
  User,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import {
  ChatAdminRightsPayload,
  ChatDetails,
  ChatMemberFilter,
  ChatMemberPayload,
  ChatRestrictionsPayload,
  ContactItem,
} from '../types/telegram'
import { Avatar } from './Avatar'
import { useI18n } from '../i18n'

export interface ChatMembersModalProps {
  isOpen: boolean
  accountId: string
  chatId: string
  chatTitle: string
  details?: ChatDetails | null
  onClose: () => void
  onOpenProfile?: (peerId: string, name: string) => void
  onSearchMessages?: (peerId: string, name: string) => void
  onChanged?: () => void
}

type ModalMode = 'list' | 'add'
type ActionPanel = 'promote' | 'restrict' | 'ban' | 'transferOwnership' | null
type ConfirmAction = 'kick' | 'demote' | 'unban' | null

type RestrictionKey =
  | 'sendMessages'
  | 'sendMedia'
  | 'sendStickers'
  | 'sendPolls'
  | 'embedLinks'
  | 'inviteUsers'
  | 'pinMessages'
  | 'changeInfo'

const RESTRICTION_KEYS: RestrictionKey[] = [
  'sendMessages',
  'sendMedia',
  'sendStickers',
  'sendPolls',
  'embedLinks',
  'inviteUsers',
  'pinMessages',
  'changeInfo',
]

const FILTERS: ChatMemberFilter[] = [
  'all',
  'admins',
  'restricted',
  'banned',
  'bots',
  'contacts',
  'recent',
]

const BAN_DURATIONS = [
  { value: 0, key: 'members.ban_forever' },
  { value: 86400, key: 'members.ban_day' },
  { value: 604800, key: 'members.ban_week' },
  { value: 2592000, key: 'members.ban_month' },
]

const ADMIN_RIGHTS: Array<{ key: keyof ChatAdminRightsPayload; labelKey: string }> = [
  { key: 'changeInfo', labelKey: 'members.rights.change_info' },
  { key: 'deleteMessages', labelKey: 'members.rights.delete_messages' },
  { key: 'banUsers', labelKey: 'members.rights.ban_users' },
  { key: 'inviteUsers', labelKey: 'members.rights.invite_users' },
  { key: 'pinMessages', labelKey: 'members.rights.pin_messages' },
  { key: 'addAdmins', labelKey: 'members.rights.add_admins' },
  { key: 'anonymous', labelKey: 'members.rights.anonymous' },
  { key: 'manageCall', labelKey: 'members.rights.manage_call' },
  { key: 'manageTopics', labelKey: 'members.rights.manage_topics' },
  { key: 'postMessages', labelKey: 'members.rights.post_messages' },
  { key: 'editMessages', labelKey: 'members.rights.edit_messages' },
  { key: 'postStories', labelKey: 'members.rights.post_stories' },
  { key: 'editStories', labelKey: 'members.rights.edit_stories' },
  { key: 'deleteStories', labelKey: 'members.rights.delete_stories' },
]

function memberName(member: ChatMemberPayload): string {
  return member.name || member.username || member.id
}

function buildAllowedRestrictions(member: ChatMemberPayload): Record<RestrictionKey, boolean> {
  const restrictions = member.restrictions
  const result = {} as Record<RestrictionKey, boolean>
  for (const key of RESTRICTION_KEYS) {
    result[key] = restrictions ? restrictions[key] !== true : true
  }
  return result
}

function restrictionsFromAllowed(
  allowed: Record<RestrictionKey, boolean>
): ChatRestrictionsPayload {
  return {
    sendMessages: !allowed.sendMessages,
    sendMedia: !allowed.sendMedia,
    sendStickers: !allowed.sendStickers,
    sendPolls: !allowed.sendPolls,
    embedLinks: !allowed.embedLinks,
    inviteUsers: !allowed.inviteUsers,
    pinMessages: !allowed.pinMessages,
    changeInfo: !allowed.changeInfo,
  }
}

function unrestrictedPayload(): ChatRestrictionsPayload {
  return {
    sendMessages: false,
    sendMedia: false,
    sendStickers: false,
    sendPolls: false,
    embedLinks: false,
    inviteUsers: false,
    pinMessages: false,
    changeInfo: false,
  }
}

function defaultAdminRights(details?: ChatDetails | null): ChatAdminRightsPayload {
  return {
    changeInfo: false,
    postMessages: !!details?.isChannel,
    editMessages: !!details?.isChannel,
    deleteMessages: true,
    banUsers: false,
    inviteUsers: true,
    pinMessages: true,
    addAdmins: false,
    anonymous: false,
    manageCall: false,
    manageTopics: !!details?.isForum,
  }
}

function adminRightsFromMember(
  member: ChatMemberPayload,
  details?: ChatDetails | null
): ChatAdminRightsPayload {
  if (!member.adminRights) return defaultAdminRights(details)
  return {
    changeInfo: !!member.adminRights.changeInfo,
    postMessages: !!member.adminRights.postMessages,
    editMessages: !!member.adminRights.editMessages,
    deleteMessages: !!member.adminRights.deleteMessages,
    banUsers: !!member.adminRights.banUsers,
    inviteUsers: !!member.adminRights.inviteUsers,
    pinMessages: !!member.adminRights.pinMessages,
    addAdmins: !!member.adminRights.addAdmins,
    anonymous: !!member.adminRights.anonymous,
    manageCall: !!member.adminRights.manageCall,
    manageTopics: !!member.adminRights.manageTopics,
    other: !!member.adminRights.other,
    postStories: !!member.adminRights.postStories,
    editStories: !!member.adminRights.editStories,
    deleteStories: !!member.adminRights.deleteStories,
    manageDirectMessages: !!member.adminRights.manageDirectMessages,
    manageRanks: !!member.adminRights.manageRanks,
    manageLinkedPeers: !!member.adminRights.manageLinkedPeers,
    manageWelcomeMessages: !!member.adminRights.manageWelcomeMessages,
  }
}

const Toggle: React.FC<{
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label: string
}> = ({ checked, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    dir="ltr"
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
      checked
        ? 'bg-primary-500/90 border-primary-400/60'
        : 'bg-white/10 border-white/15'
    } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className="inline-block rounded-full bg-white shadow transition-transform"
      style={{
        width: 18,
        height: 18,
        transform: checked ? 'translateX(22px)' : 'translateX(3px)',
      }}
    />
  </button>
)

export const ChatMembersModal: React.FC<ChatMembersModalProps> = ({
  isOpen,
  accountId,
  chatId,
  chatTitle,
  details,
  onClose,
  onOpenProfile,
  onSearchMessages,
  onChanged,
}) => {
  const { t, language, formatNumber } = useI18n()
  const [mode, setMode] = useState<ModalMode>('list')
  const [filter, setFilter] = useState<ChatMemberFilter>('all')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [members, setMembers] = useState<ChatMemberPayload[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [actionPanel, setActionPanel] = useState<ActionPanel>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [rights, setRights] = useState<ChatAdminRightsPayload>(defaultAdminRights(details))
  const [rank, setRank] = useState('')
  const [allowed, setAllowed] = useState<Record<RestrictionKey, boolean>>(
    buildAllowedRestrictions({} as ChatMemberPayload)
  )
  const [banDuration, setBanDuration] = useState(0)
  const [transferPassword, setTransferPassword] = useState('')

  const [contacts, setContacts] = useState<ContactItem[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactsError, setContactsError] = useState<string | null>(null)
  const [addSearch, setAddSearch] = useState('')
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])
  const [addNotice, setAddNotice] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const requestSeq = useRef(0)
  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedId) || null,
    [members, selectedId]
  )

  const canManage = Boolean(details?.canManageMembers)
  const canPromote = Boolean(details?.canPromoteMembers)
  const canBan = Boolean(details?.canBanMembers)
  const canAdd = Boolean(details?.canAddMembers)

  const displayTotal = useMemo(() => {
    if (filter === 'all' && !searchQuery.trim()) {
      return Math.max(total, Number(details?.membersCount || 0))
    }
    return total
  }, [details?.membersCount, filter, searchQuery, total])

  const chatTotal = useMemo(
    () =>
      Math.max(
        Number(details?.membersCount || 0),
        filter === 'all' && !searchQuery.trim() ? total : 0,
      ),
    [details?.membersCount, filter, searchQuery, total],
  )

  const resetState = useCallback(() => {
    setMode('list')
    setFilter('all')
    setSearchInput('')
    setSearchQuery('')
    setMembers([])
    setTotal(0)
    setSelectedId(null)
    setNotice(null)
    setActionError(null)
    setBusy(null)
    setActionPanel(null)
    setConfirmAction(null)
    setRights(defaultAdminRights(details))
    setRank('')
    setAllowed(buildAllowedRestrictions({} as ChatMemberPayload))
    setBanDuration(0)
    setContacts([])
    setContactsLoading(false)
    setContactsError(null)
    setAddSearch('')
    setSelectedContactIds([])
    setAddNotice(null)
    setAddError(null)
    setIsAdding(false)
  }, [details])

  useEffect(() => {
    if (!isOpen) {
      resetState()
      return
    }
    resetState()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, accountId, chatId])

  useEffect(() => {
    if (!isOpen || mode !== 'list') return
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [isOpen, mode, searchInput])

  const loadMembers = useCallback(async () => {
    if (!isOpen || !accountId || !chatId || !window.guidegram?.getChatMembers) return
    const seq = ++requestSeq.current
    setIsLoading(true)
    setError(null)
    try {
      const result = await window.guidegram.getChatMembers(accountId, chatId, {
        query: searchQuery,
        filter,
        limit: 200,
        offset: 0,
      })
      if (seq !== requestSeq.current) return
      const nextMembers = (result?.members || []).map((member) => ({
        ...member,
        id: String(member.id),
      }))
      setMembers(nextMembers)
      setTotal(Number(result?.total || nextMembers.length))
      setSelectedId((current) => {
        if (current && nextMembers.some((member) => member.id === current)) return current
        return nextMembers[0]?.id || null
      })
    } catch (err: any) {
      if (seq !== requestSeq.current) return
      setMembers([])
      setTotal(0)
      setError(err?.message || String(err))
    } finally {
      if (seq === requestSeq.current) setIsLoading(false)
    }
  }, [accountId, chatId, filter, isOpen, searchQuery])

  useEffect(() => {
    if (!isOpen || mode !== 'list') return
    void loadMembers()
  }, [isOpen, mode, loadMembers])

  useEffect(() => {
    if (!selectedMember) return
    setRights(adminRightsFromMember(selectedMember, details))
    setRank(selectedMember.rank || '')
    setAllowed(buildAllowedRestrictions(selectedMember))
    setActionPanel(null)
    setConfirmAction(null)
    setActionError(null)
    setBanDuration(0)
  }, [selectedMember, details])

  const formatDate = (seconds?: number) => {
    if (!seconds) return ''
    try {
      return new Intl.DateTimeFormat(language === 'fa' ? 'fa-IR' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(seconds * 1000))
    } catch {
      return String(seconds)
    }
  }

  const roleLabel = (member: ChatMemberPayload) => {
    switch (member.status) {
      case 'creator':
        return t('members.role.creator')
      case 'admin':
        return member.rank || t('members.role.admin')
      case 'restricted':
        return t('members.role.restricted')
      case 'banned':
        return t('members.role.banned')
      case 'left':
        return t('members.role.left')
      default:
        return member.isBot ? t('members.role.bot') : t('members.role.member')
    }
  }

  const roleBadgeClass = (member: ChatMemberPayload) => {
    switch (member.status) {
      case 'creator':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      case 'admin':
        return 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30'
      case 'restricted':
        return 'bg-orange-500/15 text-orange-300 border-orange-500/30'
      case 'banned':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30'
      default:
        return member.isBot
          ? 'bg-accent-violet/15 text-accent-violet border-accent-violet/30'
          : 'bg-white/5 text-gray-400 border-white/10'
    }
  }

  const runMemberAction = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key)
    setActionError(null)
    try {
      await action()
      setNotice(t('members.action_success'))
      setActionPanel(null)
      setConfirmAction(null)
      await loadMembers()
      onChanged?.()
    } catch (err: any) {
      setActionError(
        t('members.action_error', {
          error: err?.message || String(err),
        })
      )
    } finally {
      setBusy(null)
    }
  }

  const handlePromote = async () => {
    if (!selectedMember) return
    await runMemberAction('promote', () =>
      window.guidegram.promoteChatMember(
        accountId,
        chatId,
        selectedMember.id,
        rights,
        rank.trim() || undefined
      )
    )
  }

  const handleDemote = async () => {
    if (!selectedMember) return
    await runMemberAction('demote', () =>
      window.guidegram.demoteChatMember(accountId, chatId, selectedMember.id)
    )
  }

  const handleTransferOwnership = async () => {
    if (!selectedMember) return
    await runMemberAction('transferOwnership', async () => {
      await window.guidegram.transferChatOwnership(
        accountId,
        chatId,
        selectedMember.id,
        transferPassword.trim() || undefined
      )
      setTransferPassword('')
      setActionPanel(null)
      setNotice('Group ownership transferred successfully.')
    })
  }

  const handleRestrict = async () => {
    if (!selectedMember) return
    await runMemberAction('restrict', () =>
      window.guidegram.restrictChatMember(
        accountId,
        chatId,
        selectedMember.id,
        restrictionsFromAllowed(allowed)
      )
    )
  }

  const handleUnrestrict = async () => {
    if (!selectedMember) return
    await runMemberAction('unrestrict', () =>
      window.guidegram.restrictChatMember(
        accountId,
        chatId,
        selectedMember.id,
        unrestrictedPayload()
      )
    )
  }

  const handleBan = async () => {
    if (!selectedMember) return
    const untilDate =
      banDuration > 0 ? Math.floor(Date.now() / 1000) + banDuration : undefined
    await runMemberAction('ban', () =>
      window.guidegram.banChatMember(accountId, chatId, selectedMember.id, untilDate)
    )
  }

  const handleUnban = async () => {
    if (!selectedMember) return
    await runMemberAction('unban', () =>
      window.guidegram.unbanChatMember(accountId, chatId, selectedMember.id)
    )
  }

  const handleKick = async () => {
    if (!selectedMember) return
    await runMemberAction('kick', () =>
      window.guidegram.kickChatMember(accountId, chatId, selectedMember.id)
    )
  }

  const copyId = async (member: ChatMemberPayload) => {
    try {
      await navigator.clipboard.writeText(member.id)
      setNotice(t('members.copied'))
    } catch {
      setActionError(t('members.action_error', { error: 'Clipboard unavailable' }))
    }
  }

  const loadContacts = useCallback(async () => {
    if (!accountId || !window.guidegram?.getContacts) return
    setContactsLoading(true)
    setContactsError(null)
    try {
      const list = await window.guidegram.getContacts(accountId)
      setContacts((list || []).map((contact) => ({ ...contact, id: String(contact.id) })))
    } catch (err: any) {
      setContactsError(err?.message || String(err))
    } finally {
      setContactsLoading(false)
    }
  }, [accountId])

  const openAddMode = () => {
    setMode('add')
    setAddSearch('')
    setSelectedContactIds([])
    setAddNotice(null)
    setAddError(null)
    void loadContacts()
  }

  const toggleContact = (id: string) => {
    setSelectedContactIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  const handleAddMembers = async () => {
    if (!selectedContactIds.length) {
      setAddError(t('members.add_none'))
      return
    }
    setIsAdding(true)
    setAddError(null)
    try {
      const result = await window.guidegram.addChatMembers(accountId, chatId, selectedContactIds)
      const invited = Number(result?.invitedCount || 0)
      const missing = Number(result?.missing?.length || 0)
      let message = t('members.add_success', { count: formatNumber(invited) })
      if (missing > 0) {
        message += ` ${t('members.add_skipped', { count: formatNumber(missing) })}`
      }
      setAddNotice(message)
      setSelectedContactIds([])
      onChanged?.()
      if (invited > 0) {
        setNotice(message)
        setMode('list')
        setFilter('all')
        setSearchInput('')
        setSearchQuery('')
      }
    } catch (err: any) {
      setAddError(t('members.action_error', { error: err?.message || String(err) }))
    } finally {
      setIsAdding(false)
    }
  }

  const filteredContacts = useMemo(() => {
    const query = addSearch.trim().toLowerCase()
    if (!query) return contacts
    return contacts.filter((contact) => {
      const name = `${contact.firstName || ''} ${contact.lastName || ''}`.toLowerCase()
      return (
        name.includes(query) ||
        (contact.username || '').toLowerCase().includes(query) ||
        (contact.phone || '').includes(query) ||
        contact.id.includes(query)
      )
    })
  }, [addSearch, contacts])

  if (!isOpen) return null

  const selectedIsSelf = Boolean(selectedMember?.isSelf)
  const selectedIsCreator = selectedMember?.status === 'creator'
  const selectedIsAdmin = selectedMember?.status === 'admin'
  const selectedIsBanned = selectedMember?.status === 'banned'
  const selectedIsRestricted = selectedMember?.status === 'restricted'
  const manageable = canManage && selectedMember && !selectedIsSelf && !selectedIsCreator

  const confirmText = (() => {
    if (!selectedMember) return ''
    const name = memberName(selectedMember)
    if (confirmAction === 'kick') return t('members.confirm_kick', { name })
    if (confirmAction === 'demote') return t('members.confirm_demote', { name })
    if (confirmAction === 'unban') return t('members.confirm_unban', { name })
    return ''
  })()

  const executeConfirm = () => {
    if (confirmAction === 'kick') void handleKick()
    else if (confirmAction === 'demote') void handleDemote()
    else if (confirmAction === 'unban') void handleUnban()
  }

  if (!isOpen) return null

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
        className="relative flex flex-col w-full max-w-4xl h-[760px] max-h-[92vh] bg-dark-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 py-4 bg-dark-850/90 border-b border-white/10 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400 shadow-sm shrink-0">
              {mode === 'add' ? <UserPlus className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-sm font-bold text-white truncate">
                  {mode === 'add' ? t('members.add_title') : t('members.title')}
                </h3>
                <span className="text-[11px] font-medium text-gray-400 truncate max-w-[220px]">
                  ({chatTitle})
                </span>
              </div>
              <span className="text-xs text-gray-400 truncate">
                {mode === 'add'
                  ? t('members.add_title')
                  : details?.isChannel
                    ? t('chat.subscribers_count', { count: formatNumber(chatTotal) })
                    : t('chat.members_count', { count: formatNumber(chatTotal) })}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('chat_settings.close')}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {mode === 'add' ? (
          <>
            <div className="px-5 py-3 bg-dark-850/50 border-b border-white/5 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMode('list')}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label={t('members.back')}
              >
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              </button>
              <div className="flex items-center gap-2 flex-1 min-w-0 bg-dark-800 border border-white/10 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={addSearch}
                  onChange={(event) => setAddSearch(event.target.value)}
                  placeholder={t('members.add_search')}
                  className="flex-1 min-w-0 bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
                />
              </div>
            </div>

            {addNotice && (
              <div className="mx-5 mt-3 px-3 py-2 rounded-xl bg-accent-emerald/10 border border-accent-emerald/25 text-accent-emerald text-xs shrink-0">
                {addNotice}
              </div>
            )}
            {addError && (
              <div className="mx-5 mt-3 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs shrink-0">
                {addError}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
              {contactsLoading ? (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center gap-3 text-gray-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
                  {t('members.loading')}
                </div>
              ) : contactsError ? (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center gap-3 text-center">
                  <AlertTriangle className="w-8 h-8 text-rose-400" />
                  <p className="text-xs text-rose-300">{contactsError}</p>
                  <button
                    type="button"
                    onClick={() => void loadContacts()}
                    className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/15"
                  >
                    {t('members.retry')}
                  </button>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center gap-2 text-gray-500 text-xs">
                  <User className="w-8 h-8 opacity-50" />
                  {t('members.no_contacts')}
                </div>
              ) : (
                filteredContacts.map((contact) => {
                  const checked = selectedContactIds.includes(contact.id)
                  const name =
                    `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.id
                  return (
                    <button
                      type="button"
                      key={contact.id}
                      onClick={() => toggleContact(contact.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-colors ${
                        checked
                          ? 'bg-primary-500/15 border-primary-500/40'
                          : 'bg-dark-850/70 border-white/5 hover:bg-dark-800'
                      }`}
                    >
                      <Avatar
                        accountId={accountId}
                        peerId={contact.id}
                        title={name}
                        avatarUrl={contact.avatarUrl}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-100 truncate">{name}</div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {contact.username ? `@${contact.username}` : contact.phone || contact.id}
                        </div>
                      </div>
                      <span
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          checked
                            ? 'bg-primary-500 border-primary-400 text-white'
                            : 'border-white/20 text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            <div className="px-5 py-3 bg-dark-850/90 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-gray-400">
                {t('members.add_selected', {
                  count: formatNumber(selectedContactIds.length),
                })}
              </span>
              <button
                type="button"
                onClick={() => void handleAddMembers()}
                disabled={isAdding || !selectedContactIds.length}
                className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 transition-colors"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {t('members.add_action')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-5 py-3 bg-dark-850/50 border-b border-white/5 flex flex-col gap-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0 bg-dark-800 border border-white/10 rounded-xl px-3 py-2">
                  <Search className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder={t('members.search_placeholder')}
                    className="flex-1 min-w-0 bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput('')}
                      className="p-0.5 rounded-md text-gray-500 hover:text-white"
                      aria-label={t('chat_settings.close')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void loadMembers()}
                  disabled={isLoading}
                  title={t('members.refresh')}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary-400' : ''}`} />
                </button>
                {canAdd && (
                  <button
                    type="button"
                    onClick={openAddMode}
                    className="px-3 py-2 rounded-xl bg-primary-500 hover:bg-primary-400 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('members.add')}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                {FILTERS.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setFilter(item)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap border transition-colors ${
                      filter === item
                        ? 'bg-primary-500/20 text-primary-300 border-primary-500/40'
                        : 'bg-transparent text-gray-400 border-transparent hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {t(`members.filter.${item}`)}
                  </button>
                ))}
              </div>
            </div>

            {notice && (
              <div className="mx-5 mt-3 px-3 py-2 rounded-xl bg-accent-emerald/10 border border-accent-emerald/25 text-accent-emerald text-xs shrink-0 flex items-center justify-between gap-2">
                <span>{notice}</span>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="text-accent-emerald/70 hover:text-accent-emerald"
                  aria-label={t('chat_settings.close')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex-1 min-h-0 flex flex-col md:flex-row">
              <div className="flex-1 min-h-0 flex flex-col border-b md:border-b-0 md:border-e border-white/5">
                <div className="flex-1 overflow-y-auto">
                  {isLoading ? (
                    <div className="h-full min-h-[220px] flex flex-col items-center justify-center gap-3 text-gray-400 text-xs">
                      <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
                      {t('members.loading')}
                    </div>
                  ) : error ? (
                    <div className="h-full min-h-[220px] flex flex-col items-center justify-center gap-3 px-6 text-center">
                      <AlertTriangle className="w-8 h-8 text-rose-400" />
                      <p className="text-xs text-rose-300">{t('members.error')}</p>
                      <p className="text-[10px] text-gray-500 break-all" dir="ltr">
                        {error}
                      </p>
                      <button
                        type="button"
                        onClick={() => void loadMembers()}
                        className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/15"
                      >
                        {t('members.retry')}
                      </button>
                    </div>
                  ) : members.length === 0 ? (
                    <div className="h-full min-h-[220px] flex flex-col items-center justify-center gap-2 px-6 text-center text-gray-500 text-xs">
                      <Users className="w-8 h-8 opacity-50" />
                      {searchQuery || filter !== 'all' ? t('members.filter_empty') : t('members.empty')}
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {members.map((member) => {
                        const name = memberName(member)
                        const isSelected = member.id === selectedId
                        return (
                          <motion.button
                            type="button"
                            key={member.id}
                            whileHover={{ scale: 1.006, x: 2 }}
                            whileTap={{ scale: 0.995 }}
                            transition={{ type: 'spring', damping: 24, stiffness: 400 }}
                            onClick={() => setSelectedId(member.id)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                              isSelected ? 'bg-primary-500/10' : 'hover:bg-white/5'
                            }`}
                          >
                            <Avatar
                              accountId={accountId}
                              peerId={member.id}
                              title={name}
                              avatarUrl={member.avatarUrl}
                              size="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-xs font-semibold text-gray-100 truncate">
                                  {name}
                                </span>
                                {member.isSelf && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary-500/15 text-primary-300 border border-primary-500/30 shrink-0">
                                    {t('members.you')}
                                  </span>
                                )}
                                {member.isBot && <Bot className="w-3 h-3 text-accent-violet shrink-0" />}
                                {member.status === 'creator' && (
                                  <Crown className="w-3 h-3 text-amber-300 shrink-0" />
                                )}
                                {member.status === 'banned' && (
                                  <Ban className="w-3 h-3 text-rose-400 shrink-0" />
                                )}
                              </div>
                              <div className="text-[10px] text-gray-400 truncate">
                                {member.username ? `@${member.username}` : member.phone || member.id}
                              </div>
                            </div>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${roleBadgeClass(
                                member
                              )}`}
                            >
                              {roleLabel(member)}
                            </span>
                          </motion.button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="px-4 py-2 border-t border-white/5 bg-dark-850/60 text-[10px] text-gray-500 shrink-0">
                  {t('members.showing', {
                    shown: formatNumber(members.length),
                    total: formatNumber(displayTotal),
                  })}
                </div>
              </div>

              <div className="w-full md:w-80 shrink-0 min-h-0 overflow-y-auto bg-dark-850/40">
                {selectedMember ? (
                  <div className="p-4 space-y-4">
                    <div className="flex flex-col items-center text-center gap-2">
                      <Avatar
                        accountId={accountId}
                        peerId={selectedMember.id}
                        title={memberName(selectedMember)}
                        avatarUrl={selectedMember.avatarUrl}
                        size="lg"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white break-words">
                          {memberName(selectedMember)}
                        </div>
                        {selectedMember.username && (
                          <div className="text-[11px] text-gray-400 truncate">
                            @{selectedMember.username}
                          </div>
                        )}
                        {selectedMember.phone && (
                          <div className="text-[10px] text-gray-500" dir="ltr">
                            {selectedMember.phone}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${roleBadgeClass(
                            selectedMember
                          )}`}
                        >
                          {roleLabel(selectedMember)}
                        </span>
                        {selectedMember.isBot && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-violet/15 text-accent-violet border border-accent-violet/30">
                            {t('members.role.bot')}
                          </span>
                        )}
                        {selectedMember.isContact && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                            {t('members.contact')}
                          </span>
                        )}
                        {selectedMember.isPremium && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Premium
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => void copyId(selectedMember)}
                        className="px-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-semibold flex items-center justify-center gap-1 border border-white/5 transition-colors"
                      >
                        <Hash className="w-3 h-3 text-accent-cyan" />
                        {t('members.copy_id')}
                      </button>
                      {onOpenProfile && !selectedMember.isSelf && (
                        <button
                          type="button"
                          onClick={() => onOpenProfile(selectedMember.id, memberName(selectedMember))}
                          className="px-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-semibold flex items-center justify-center gap-1 border border-white/5 transition-colors"
                        >
                          <User className="w-3 h-3 text-primary-400" />
                          {t('members.open_profile')}
                        </button>
                      )}
                      {onSearchMessages && (
                        <button
                          type="button"
                          onClick={() =>
                            onSearchMessages(selectedMember.id, memberName(selectedMember))
                          }
                          className="px-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-semibold flex items-center justify-center gap-1 border border-white/5 transition-colors"
                        >
                          <Search className="w-3 h-3 text-accent-cyan" />
                          {t('members.search_messages')}
                        </button>
                      )}
                      {selectedMember.isSelf && (
                        <div className="px-2 py-1.5 rounded-xl bg-white/5 text-gray-500 text-[10px] flex items-center justify-center">
                          {t('members.self_action_disabled')}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 text-[10px] text-gray-400">
                      {selectedMember.joinedDate && (
                        <div className="flex items-center justify-between gap-2">
                          <span>{t('members.joined')}</span>
                          <span className="text-gray-300">{formatDate(selectedMember.joinedDate)}</span>
                        </div>
                      )}
                      {selectedMember.subscriptionUntilDate && (
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            {t('members.subscription_until', {
                              date: formatDate(selectedMember.subscriptionUntilDate),
                            })}
                          </span>
                        </div>
                      )}
                      {selectedMember.status === 'creator' && (
                        <div className="flex items-center gap-1.5 text-amber-300/80">
                          <Crown className="w-3 h-3" />
                          {t('members.owner_note')}
                        </div>
                      )}
                      {selectedIsAdmin && (
                        <div className="flex items-center gap-1.5 text-accent-cyan/80">
                          <ShieldCheck className="w-3 h-3" />
                          {t('members.admin_note')}
                        </div>
                      )}
                      {selectedMember.isBot && (
                        <div className="flex items-center gap-1.5 text-accent-violet/80">
                          <Bot className="w-3 h-3" />
                          {t('members.bot_note')}
                        </div>
                      )}
                    </div>

                    {actionError && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[10px] break-words">
                        {actionError}
                      </div>
                    )}

                    {!canManage ? (
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[10px]">
                        {t('members.only_admins')}
                      </div>
                    ) : selectedIsSelf ? (
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[10px]">
                        {t('members.self_action_disabled')}
                      </div>
                    ) : selectedIsCreator ? null : (
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          {t('members.actions')}
                        </div>

                        {confirmAction ? (
                          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-2">
                            <p className="text-[11px] text-rose-200">{confirmText}</p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={executeConfirm}
                                disabled={Boolean(busy)}
                                className="flex-1 px-2 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white text-[10px] font-bold"
                              >
                                {t('members.confirm')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmAction(null)}
                                disabled={Boolean(busy)}
                                className="flex-1 px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-gray-200 text-[10px] font-semibold"
                              >
                                {t('members.cancel')}
                              </button>
                            </div>
                          </div>
                        ) : actionPanel === 'promote' ? (
                          <div className="p-2.5 rounded-xl bg-accent-cyan/10 border border-accent-cyan/25 space-y-2">
                            <div>
                              <div className="text-[11px] font-bold text-accent-cyan">
                                {t('members.promote_title')}
                              </div>
                              <div className="text-[9px] text-gray-400">
                                {t('members.promote_hint')}
                              </div>
                            </div>
                            <div className="space-y-1">
                              {ADMIN_RIGHTS.filter((option) => {
                                if (option.key === 'manageTopics') return Boolean(details?.isForum)
                                if (option.key === 'postMessages' || option.key === 'editMessages') {
                                  return Boolean(details?.isChannel)
                                }
                                return true
                              }).map((option) => (
                                <label
                                  key={option.key}
                                  className="flex items-center justify-between gap-2 px-1.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer"
                                >
                                  <span className="text-[10px] text-gray-300">{t(option.labelKey)}</span>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(rights[option.key])}
                                    onChange={(event) =>
                                      setRights((current) => ({
                                        ...current,
                                        [option.key]: event.target.checked,
                                      }))
                                    }
                                    className="accent-cyan-500 w-3.5 h-3.5"
                                  />
                                </label>
                              ))}
                            </div>
                            <input
                              type="text"
                              value={rank}
                              onChange={(event) => setRank(event.target.value)}
                              placeholder={t('members.rank_placeholder')}
                              maxLength={16}
                              className="w-full bg-dark-900 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white placeholder-gray-500 focus:outline-none focus:border-accent-cyan/50"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void handlePromote()}
                                disabled={Boolean(busy)}
                                className="flex-1 px-2 py-1.5 rounded-lg bg-accent-cyan hover:bg-cyan-400 disabled:opacity-40 text-dark-950 text-[10px] font-bold flex items-center justify-center gap-1"
                              >
                                {busy === 'promote' ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <ShieldCheck className="w-3 h-3" />
                                )}
                                {t('members.promote_apply')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setActionPanel(null)}
                                disabled={Boolean(busy)}
                                className="px-2 py-1.5 rounded-lg bg-white/10 text-gray-200 text-[10px] font-semibold"
                              >
                                {t('members.cancel')}
                              </button>
                            </div>
                          </div>
                        ) : actionPanel === 'restrict' ? (
                          <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/25 space-y-2">
                            <div>
                              <div className="text-[11px] font-bold text-orange-300">
                                {t('members.restrict_title')}
                              </div>
                              <div className="text-[9px] text-gray-400">
                                {t('members.restrict_hint')}
                              </div>
                            </div>
                            <div className="space-y-1">
                              {RESTRICTION_KEYS.map((key) => (
                                <div
                                  key={key}
                                  className="flex items-center justify-between gap-2 px-1.5 py-1 rounded-lg hover:bg-white/5"
                                >
                                  <span className="text-[10px] text-gray-300">
                                    {t(`members.allow.${key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}`)}
                                  </span>
                                  <Toggle
                                    checked={allowed[key]}
                                    onChange={(next) =>
                                      setAllowed((current) => ({ ...current, [key]: next }))
                                    }
                                    label={t(
                                      `members.allow.${key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}`
                                    )}
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void handleRestrict()}
                                disabled={Boolean(busy)}
                                className="flex-1 px-2 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-dark-950 text-[10px] font-bold flex items-center justify-center gap-1"
                              >
                                {busy === 'restrict' ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <ShieldOff className="w-3 h-3" />
                                )}
                                {t('members.restrict_apply')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setActionPanel(null)}
                                disabled={Boolean(busy)}
                                className="px-2 py-1.5 rounded-lg bg-white/10 text-gray-200 text-[10px] font-semibold"
                              >
                                {t('members.cancel')}
                              </button>
                            </div>
                          </div>
                        ) : actionPanel === 'ban' ? (
                          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-2">
                            <div>
                              <div className="text-[11px] font-bold text-rose-300">
                                {t('members.ban_title')}
                              </div>
                              <div className="text-[9px] text-gray-400">{t('members.ban_hint')}</div>
                            </div>
                            <select
                              value={banDuration}
                              onChange={(event) => setBanDuration(Number(event.target.value))}
                              className="w-full bg-dark-900 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-rose-500/50"
                            >
                              {BAN_DURATIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {t(option.key)}
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void handleBan()}
                                disabled={Boolean(busy)}
                                className="flex-1 px-2 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white text-[10px] font-bold flex items-center justify-center gap-1"
                              >
                                {busy === 'ban' ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Ban className="w-3 h-3" />
                                )}
                                {t('members.ban_apply')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setActionPanel(null)}
                                disabled={Boolean(busy)}
                                className="px-2 py-1.5 rounded-lg bg-white/10 text-gray-200 text-[10px] font-semibold"
                              >
                                {t('members.cancel')}
                              </button>
                            </div>
                          </div>
                        ) : actionPanel === 'transferOwnership' ? (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                            <div>
                              <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                                <Crown className="w-3.5 h-3.5" />
                                Transfer Group Ownership
                              </div>
                              <div className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">
                                Transfer full creator rights of this group to {memberName(selectedMember)}. This action is irreversible. Enter your 2FA password if enabled.
                              </div>
                            </div>
                            <input
                              type="password"
                              value={transferPassword}
                              onChange={(e) => setTransferPassword(e.target.value)}
                              placeholder="2FA Password (if enabled)"
                              className="w-full bg-dark-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/50"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void handleTransferOwnership()}
                                disabled={Boolean(busy)}
                                className="flex-1 px-2 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-dark-950 text-[10px] font-bold flex items-center justify-center gap-1"
                              >
                                {busy === 'transferOwnership' ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Crown className="w-3 h-3" />
                                )}
                                Confirm Transfer
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActionPanel(null)
                                  setTransferPassword('')
                                }}
                                disabled={Boolean(busy)}
                                className="px-2 py-1.5 rounded-lg bg-white/10 text-gray-200 text-[10px] font-semibold"
                              >
                                {t('members.cancel')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {canPromote && (
                              <div className="space-y-1.5">
                                <button
                                  type="button"
                                  onClick={() => setActionPanel('promote')}
                                  disabled={Boolean(busy)}
                                  className="w-full px-2.5 py-2 rounded-xl bg-accent-cyan/15 hover:bg-accent-cyan/25 border border-accent-cyan/30 text-accent-cyan text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  {selectedIsAdmin ? t('members.promote') : t('members.promote')}
                                </button>
                                {selectedIsAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmAction('demote')}
                                    disabled={Boolean(busy)}
                                    className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                  >
                                    <Shield className="w-3 h-3" />
                                    {t('members.demote')}
                                  </button>
                                )}
                              </div>
                            )}

                            {details?.isCreator && (
                              <button
                                type="button"
                                onClick={() => setActionPanel('transferOwnership')}
                                disabled={Boolean(busy)}
                                className="w-full px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Crown className="w-3 h-3" />
                                Transfer Ownership
                              </button>
                            )}

                            {canBan && (
                              <div className="space-y-1.5">
                                <button
                                  type="button"
                                  onClick={() => setActionPanel('restrict')}
                                  disabled={Boolean(busy)}
                                  className="w-full px-2.5 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/25 text-orange-300 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                >
                                  <ShieldOff className="w-3.5 h-3.5" />
                                  {t('members.restrict')}
                                </button>
                                {selectedIsRestricted && (
                                  <button
                                    type="button"
                                    onClick={() => void handleUnrestrict()}
                                    disabled={Boolean(busy)}
                                    className="w-full px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                  >
                                    {busy === 'unrestrict' ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                    )}
                                    {t('members.unrestrict')}
                                  </button>
                                )}
                                {selectedIsBanned ? (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmAction('unban')}
                                    disabled={Boolean(busy)}
                                    className="w-full px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    {t('members.unban')}
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setActionPanel('ban')}
                                      disabled={Boolean(busy)}
                                      className="w-full px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                      {t('members.ban')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmAction('kick')}
                                      disabled={Boolean(busy)}
                                      className="w-full px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                      <UserMinus className="w-3.5 h-3.5" />
                                      {t('members.kick')}
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full min-h-[220px] flex flex-col items-center justify-center gap-2 px-6 text-center text-gray-500 text-xs">
                    <Users className="w-8 h-8 opacity-50" />
                    {t('members.select_member')}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
