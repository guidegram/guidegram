import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Save,
  Settings,
  ShieldAlert,
  X,
  UserCheck,
  Shield,
  KeyRound,
  Image,
  Lock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { ChatDetails, ChatRestrictionsPayload, ChatSettingsInput } from '../types/telegram'
import { useI18n } from '../i18n'

export interface ChatSettingsModalProps {
  isOpen: boolean
  accountId: string
  chatId: string
  chatTitle: string
  details?: ChatDetails | null
  onClose: () => void
  onUpdated: (details: ChatDetails) => void
}

interface FieldErrors {
  title?: string
  description?: string
  username?: string
  slowMode?: string
  joinRequests?: string
  permissions?: string
  forum?: string
  antiSpam?: string
  general?: string
}

const normalizeUsernameInput = (value: string): string =>
  value
    .trim()
    .replace(/^https?:\/\/(?:www\.)?t\.me\//i, '')
    .replace(/^@/, '')
    .trim()
    .toLowerCase()

const USERNAME_PATTERN = /^[a-z][a-z0-9_]{4,31}$/

const SLOW_MODE_OPTIONS = [
  { value: 0, key: 'chat_settings.slow_mode_off' },
  { value: 10, key: 'chat_settings.slow_mode_10' },
  { value: 30, key: 'chat_settings.slow_mode_30' },
  { value: 60, key: 'chat_settings.slow_mode_60' },
  { value: 300, key: 'chat_settings.slow_mode_300' },
  { value: 900, key: 'chat_settings.slow_mode_900' },
  { value: 3600, key: 'chat_settings.slow_mode_3600' },
]

const PERMISSION_ROWS: Array<{
  key: keyof ChatRestrictionsPayload
  label: string
}> = [
  { key: 'sendMessages', label: 'chat_settings.perm_send_messages' },
  { key: 'sendMedia', label: 'chat_settings.perm_send_media' },
  { key: 'sendStickers', label: 'chat_settings.perm_send_stickers' },
  { key: 'sendPolls', label: 'chat_settings.perm_send_polls' },
  { key: 'embedLinks', label: 'chat_settings.perm_embed_links' },
  { key: 'inviteUsers', label: 'chat_settings.perm_invite_users' },
  { key: 'pinMessages', label: 'chat_settings.perm_pin_messages' },
  { key: 'changeInfo', label: 'chat_settings.perm_change_info' },
]

const Toggle: React.FC<{
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label: string
}> = ({ checked, onChange, disabled, label }) => (
  <motion.button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    whileHover={disabled ? undefined : { scale: 1.05 }}
    whileTap={disabled ? undefined : { scale: 0.95 }}
    onClick={() => onChange(!checked)}
    dir="ltr"
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
      checked
        ? 'bg-primary-500/90 border-primary-400/60'
        : 'bg-white/10 border-white/15'
    } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <motion.span
      layout
      transition={{ type: 'spring', damping: 25, stiffness: 450 }}
      className="inline-block rounded-full bg-white shadow-md"
      style={{
        width: 18,
        height: 18,
        marginLeft: checked ? 22 : 3,
      }}
    />
  </motion.button>
)

export const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
  isOpen,
  accountId,
  chatId,
  chatTitle,
  details,
  onClose,
  onUpdated,
}) => {
  const { t, formatNumber } = useI18n()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [username, setUsername] = useState('')
  const [slowModeSeconds, setSlowModeSeconds] = useState(0)
  const [joinRequests, setJoinRequests] = useState(false)
  const [isForum, setIsForum] = useState(false)
  const [antiSpam, setAntiSpam] = useState(false)
  const [defaultRestrictions, setDefaultRestrictions] = useState<ChatRestrictionsPayload>({})
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const initializedRef = useRef(false)

  const isChannelLike = Boolean(details?.isChannel || details?.isSupergroup)
  const canEditTitle = Boolean(details?.canChangeInfo || details?.isCreator)
  const canEditDescription = Boolean(details?.canSetDescription)
  const canEditUsername = isChannelLike && Boolean(details?.canChangeInfo || details?.isCreator)
  const canEditSlowMode = Boolean(details?.canSetSlowMode && details?.isSupergroup)
  const canEditJoinRequests = Boolean(details?.canManageJoinRequests)
  const canEditAntiSpam = Boolean(details?.isSupergroup && (details?.canToggleAntiSpam || details?.isCreator))
  const canEditPermissions = Boolean(
    details?.canEditPermissions && details?.isGroup && !details?.isBroadcast
  )
  const canEditForum = Boolean(
    details?.isForum !== undefined &&
      details?.isSupergroup &&
      !details?.isChannel &&
      details?.isCreator
  )
  const canEditAnything =
    canEditTitle ||
    canEditDescription ||
    canEditUsername ||
    canEditSlowMode ||
    canEditJoinRequests ||
    canEditAntiSpam ||
    canEditPermissions ||
    canEditForum
  const normalizedUsername = normalizeUsernameInput(username)
  const canEnableJoinRequests = Boolean(normalizedUsername)

  useEffect(() => {
    if (!isOpen) {
      initializedRef.current = false
      setErrors({})
      setSaved(false)
      return
    }
    if (!details || initializedRef.current) return
    initializedRef.current = true
    setTitle(details.title || '')
    setDescription(details.about || '')
    setUsername(details.username || '')
    setSlowModeSeconds(Number(details.slowModeSeconds || 0))
    setJoinRequests(Boolean(details.joinRequestsEnabled))
    setIsForum(Boolean(details.isForum))
    setAntiSpam(Boolean(details.antiSpamEnabled))
    setDefaultRestrictions({ ...(details.defaultRestrictions || {}) })
    setErrors({})
    setSaved(false)
  }, [isOpen, details])

  const clearFeedback = () => {
    if (saved) setSaved(false)
    if (
      errors.title ||
      errors.description ||
      errors.username ||
      errors.slowMode ||
      errors.joinRequests ||
      errors.permissions ||
      errors.forum ||
      errors.antiSpam ||
      errors.general
    ) {
      setErrors({})
    }
  }

  const parseErrors = (items: string[]): FieldErrors => {
    const next: FieldErrors = {}
    for (const raw of items) {
      const separator = raw.indexOf(':')
      const key = separator >= 0 ? raw.slice(0, separator).trim() : ''
      const message = separator >= 0 ? raw.slice(separator + 1).trim() : raw
      if (key === 'title') next.title = message
      else if (key === 'description') next.description = message
      else if (key === 'username') next.username = message
      else if (key === 'slowMode') next.slowMode = message
      else if (key === 'joinRequests') next.joinRequests = message
      else if (key === 'permissions') next.permissions = message
      else if (key === 'forum') next.forum = message
      else if (key === 'antiSpam') next.antiSpam = message
      else next.general = next.general ? `${next.general}\n${raw}` : raw
    }
    return next
  }

  const handleSave = async () => {
    if (!details || !window.guidegram?.updateChatSettings) return

    const validation: FieldErrors = {}
    if (canEditTitle) {
      const trimmed = title.trim()
      if (!trimmed) validation.title = t('chat_settings.title_required')
      else if (trimmed.length > 255) validation.title = t('chat_settings.title_too_long')
    }
    if (canEditUsername && normalizedUsername && !USERNAME_PATTERN.test(normalizedUsername)) {
      validation.username = t('chat_settings.username_invalid')
    }
    if (canEditJoinRequests && joinRequests && !normalizedUsername) {
      validation.joinRequests = t('chat_settings.join_requests_public_required')
    }
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      setSaved(false)
      return
    }

    const input: ChatSettingsInput = {}
    if (canEditTitle && title.trim() !== details.title) input.title = title.trim()
    if (canEditDescription && description.trim() !== (details.about || '').trim()) {
      input.description = description.trim()
    }
    if (canEditUsername && normalizedUsername !== (details.username || '').toLowerCase()) {
      input.username = normalizedUsername
    }
    if (
      canEditSlowMode &&
      Number(slowModeSeconds) !== Number(details.slowModeSeconds || 0)
    ) {
      input.slowModeSeconds = Number(slowModeSeconds)
    }
    if (canEditJoinRequests && joinRequests !== Boolean(details.joinRequestsEnabled)) {
      input.joinRequestsEnabled = joinRequests
    }
    if (canEditForum && isForum !== Boolean(details.isForum)) {
      input.isForum = isForum
    }
    if (canEditAntiSpam && antiSpam !== Boolean(details.antiSpamEnabled)) {
      input.antiSpamEnabled = antiSpam
    }
    if (canEditPermissions) {
      const permissionChanges: Record<string, boolean> = {}
      let hasPermissionChanges = false
      for (const row of PERMISSION_ROWS) {
        const current = Boolean(details.defaultRestrictions?.[row.key])
        const next = Boolean(defaultRestrictions[row.key])
        if (current !== next) {
          permissionChanges[row.key] = next
          hasPermissionChanges = true
        }
      }
      if (hasPermissionChanges) {
        input.defaultRestrictions = permissionChanges as ChatRestrictionsPayload
      }
    }

    if (Object.keys(input).length === 0) {
      setErrors({ general: t('chat_settings.no_changes') })
      setSaved(false)
      return
    }

    setIsSaving(true)
    setErrors({})
    setSaved(false)
    try {
      const result = await window.guidegram.updateChatSettings(accountId, chatId, input)
      const parsed = parseErrors(result?.errors || [])
      setErrors(parsed)
      if (result?.details) {
        onUpdated(result.details)
        setTitle(result.details.title || '')
        setDescription(result.details.about || '')
        setUsername(result.details.username || '')
        setSlowModeSeconds(Number(result.details.slowModeSeconds || 0))
        setJoinRequests(Boolean(result.details.joinRequestsEnabled))
        setIsForum(Boolean(result.details.isForum))
        setDefaultRestrictions({ ...(result.details.defaultRestrictions || {}) })
      }
      if (
        !parsed.title &&
        !parsed.description &&
        !parsed.username &&
        !parsed.slowMode &&
        !parsed.joinRequests &&
        !parsed.permissions &&
        !parsed.forum &&
        !parsed.general
      ) {
        setSaved(true)
      }
    } catch (err: any) {
      setErrors({ general: err?.message || String(err) })
    } finally {
      setIsSaving(false)
    }
  }

  // Layer 232 Chat Operations Suite (Microphase 038)
  const [activeTab, setActiveTab] = useState<'general' | 'management'>('general')

  // 1. messages.editChatAbout
  const [customAbout, setCustomAbout] = useState('')
  const [isEditingAbout, setIsEditingAbout] = useState(false)
  const [aboutFeedback, setAboutFeedback] = useState<string | null>(null)

  // 2. messages.editChatAdmin
  const [adminUserId, setAdminUserId] = useState('')
  const [adminIsPromote, setAdminIsPromote] = useState(true)
  const [isEditingAdmin, setIsEditingAdmin] = useState(false)
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null)

  // 3. messages.editChatParticipantRank
  const [rankParticipantId, setRankParticipantId] = useState('')
  const [participantRank, setParticipantRank] = useState('')
  const [isEditingRank, setIsEditingRank] = useState(false)
  const [rankFeedback, setRankFeedback] = useState<string | null>(null)

  // 4. messages.editChatDefaultBannedRights
  const [banSendMessages, setBanSendMessages] = useState(false)
  const [banSendMedia, setBanSendMedia] = useState(false)
  const [banSendStickers, setBanSendStickers] = useState(false)
  const [banEmbedLinks, setBanEmbedLinks] = useState(false)
  const [isUpdatingBannedRights, setIsUpdatingBannedRights] = useState(false)
  const [bannedRightsFeedback, setBannedRightsFeedback] = useState<string | null>(null)

  // 5. messages.editChatPhoto
  const [isClearingChatPhoto, setIsClearingChatPhoto] = useState(false)
  const [photoFeedback, setPhotoFeedback] = useState<string | null>(null)

  // 6. messages.editChatCreator
  const [newCreatorUserId, setNewCreatorUserId] = useState('')
  const [isTransferringCreator, setIsTransferringCreator] = useState(false)
  const [transferCreatorFeedback, setTransferCreatorFeedback] = useState<string | null>(null)

  // 7. messages.discardEncryption
  const [discardChatIdInput, setDiscardChatIdInput] = useState('')
  const [isDiscardingEncryption, setIsDiscardingEncryption] = useState(false)
  const [discardEncryptionFeedback, setDiscardEncryptionFeedback] = useState<string | null>(null)

  const handleEditChatAbout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!window.guidegram?.editChatAbout) return
    setIsEditingAbout(true)
    setAboutFeedback(null)
    try {
      const res = await window.guidegram.editChatAbout(accountId, chatId, customAbout.trim())
      if (res) {
        setAboutFeedback('Chat description updated successfully.')
      } else {
        setAboutFeedback('Failed to update chat description.')
      }
    } catch (err: any) {
      setAboutFeedback(err?.message || 'Error updating chat description.')
    } finally {
      setIsEditingAbout(false)
    }
  }

  const handleEditChatAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminUserId.trim() || !window.guidegram?.editChatAdmin) return
    setIsEditingAdmin(true)
    setAdminFeedback(null)
    try {
      const res = await window.guidegram.editChatAdmin(accountId, chatId, adminUserId.trim(), adminIsPromote)
      if (res) {
        setAdminFeedback(`User ${adminUserId} ${adminIsPromote ? 'promoted to admin' : 'demoted'} successfully.`)
        setAdminUserId('')
      } else {
        setAdminFeedback('Failed to modify admin privileges.')
      }
    } catch (err: any) {
      setAdminFeedback(err?.message || 'Error modifying admin privileges.')
    } finally {
      setIsEditingAdmin(false)
    }
  }

  const handleEditChatParticipantRank = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rankParticipantId.trim() || !window.guidegram?.editChatParticipantRank) return
    setIsEditingRank(true)
    setRankFeedback(null)
    try {
      const res = await window.guidegram.editChatParticipantRank(accountId, chatId, rankParticipantId.trim(), participantRank.trim())
      if (res) {
        setRankFeedback(`Custom title "${participantRank.trim()}" assigned successfully.`)
        setRankParticipantId('')
        setParticipantRank('')
      } else {
        setRankFeedback('Failed to assign custom title.')
      }
    } catch (err: any) {
      setRankFeedback(err?.message || 'Error assigning custom title.')
    } finally {
      setIsEditingRank(false)
    }
  }

  const handleEditDefaultBannedRights = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!window.guidegram?.editChatDefaultBannedRights) return
    setIsUpdatingBannedRights(true)
    setBannedRightsFeedback(null)
    try {
      const bannedRights = {
        _: 'chatBannedRights',
        flags: 0,
        view_messages: false,
        send_messages: banSendMessages,
        send_media: banSendMedia,
        send_stickers: banSendStickers,
        send_gifs: banSendStickers,
        send_games: banSendStickers,
        send_inline: banSendStickers,
        embed_links: banEmbedLinks,
        send_polls: false,
        change_info: false,
        invite_users: false,
        pin_messages: false,
        manage_topics: false,
        send_photos: banSendMedia,
        send_videos: banSendMedia,
        send_roundvideos: banSendMedia,
        send_audios: banSendMedia,
        send_voices: banSendMedia,
        send_docs: banSendMedia,
        send_plain: banSendMessages,
        until_date: 0,
      }
      const res = await window.guidegram.editChatDefaultBannedRights(accountId, chatId, bannedRights)
      if (res) {
        setBannedRightsFeedback('Default chat permissions and banned rights updated.')
      } else {
        setBannedRightsFeedback('Failed to update default banned rights.')
      }
    } catch (err: any) {
      setBannedRightsFeedback(err?.message || 'Error updating default banned rights.')
    } finally {
      setIsUpdatingBannedRights(false)
    }
  }

  const handleClearChatPhoto = async () => {
    if (!window.guidegram?.editChatPhoto) return
    setIsClearingChatPhoto(true)
    setPhotoFeedback(null)
    try {
      const res = await window.guidegram.editChatPhoto(accountId, chatId, { _: 'inputChatPhotoEmpty' })
      if (res) {
        setPhotoFeedback('Chat photo removed successfully.')
      } else {
        setPhotoFeedback('Failed to remove chat photo.')
      }
    } catch (err: any) {
      setPhotoFeedback(err?.message || 'Error removing chat photo.')
    } finally {
      setIsClearingChatPhoto(false)
    }
  }

  const handleTransferChatCreator = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCreatorUserId.trim() || !window.guidegram?.editChatCreator) return
    setIsTransferringCreator(true)
    setTransferCreatorFeedback(null)
    try {
      const res = await window.guidegram.editChatCreator(accountId, chatId, newCreatorUserId.trim())
      if (res) {
        setTransferCreatorFeedback(`Chat ownership transferred to ${newCreatorUserId}.`)
        setNewCreatorUserId('')
      } else {
        setTransferCreatorFeedback('Failed to transfer chat ownership. Ensure 2FA password is valid if required.')
      }
    } catch (err: any) {
      setTransferCreatorFeedback(err?.message || 'Error transferring chat ownership.')
    } finally {
      setIsTransferringCreator(false)
    }
  }

  const handleDiscardEncryption = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetChatId = Number(discardChatIdInput.trim() || chatId)
    if (!targetChatId || !window.guidegram?.discardEncryption) return
    setIsDiscardingEncryption(true)
    setDiscardEncryptionFeedback(null)
    try {
      const res = await window.guidegram.discardEncryption(accountId, targetChatId, true)
      if (res) {
        setDiscardEncryptionFeedback(`Encrypted session for chat #${targetChatId} discarded.`)
        setDiscardChatIdInput('')
      } else {
        setDiscardEncryptionFeedback('Failed to discard encrypted session.')
      }
    } catch (err: any) {
      setDiscardEncryptionFeedback(err?.message || 'Error discarding encrypted session.')
    } finally {
      setIsDiscardingEncryption(false)
    }
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
        className="relative flex flex-col w-full max-w-lg max-h-[92vh] bg-dark-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 py-4 bg-dark-850/90 border-b border-white/10 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400 shadow-sm shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                {t('chat_settings.title')}
              </h3>
              <span className="text-xs text-gray-400 truncate">
                {chatTitle}
                {details?.membersCount !== undefined && (
                  <span className="text-gray-500">
                    {' '}
                    ·{' '}
                    {details?.isChannel
                      ? t('chat.subscribers_count', {
                          count: formatNumber(details.membersCount),
                        })
                      : t('chat.members_count', {
                          count: formatNumber(details.membersCount),
                        })}
                  </span>
                )}
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-dark-900/60 p-1.5 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>General Settings</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('management')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'management'
                ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Chat Management & Ops</span>
          </button>
        </div>

        {activeTab === 'general' ? (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {!details ? (
            <div className="min-h-[200px] flex flex-col items-center justify-center gap-3 text-gray-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
              {t('members.loading')}
            </div>
          ) : !canEditAnything ? (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3 text-gray-400">
              <ShieldAlert className="w-5 h-5 text-orange-300 shrink-0" />
              <div className="text-xs leading-relaxed">
                <div className="font-bold text-gray-200">{t('chat_settings.not_admin')}</div>
                <div className="mt-1 text-[11px] text-gray-500">
                  {details.isChannel
                    ? t('chat_settings.channel_hint')
                    : t('chat_settings.group_hint')}
                </div>
              </div>
            </div>
          ) : (
            <>
              {saved && (
                <div className="px-3 py-2.5 rounded-xl bg-accent-emerald/10 border border-accent-emerald/25 text-accent-emerald text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {t('chat_settings.saved')}
                </div>
              )}

              {errors.general && (
                <div className="px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="min-w-0 break-words">
                    <div className="font-semibold">{t('chat_settings.error_generic')}</div>
                    <div className="mt-0.5 text-[10px] text-rose-300/80 whitespace-pre-wrap break-all" dir="ltr">
                      {errors.general}
                    </div>
                  </div>
                </div>
              )}

              {canEditTitle && (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="text-[11px] font-bold text-gray-300">
                      {t('chat_settings.title_label')}
                    </label>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {formatNumber(title.length)}/{formatNumber(255)}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value)
                      clearFeedback()
                    }}
                    placeholder={t('chat_settings.title_placeholder')}
                    maxLength={255}
                    className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                  />
                  {errors.title && (
                    <p className="mt-1.5 text-[10px] text-rose-300">
                      {t('chat_settings.error_title')}{' '}
                      <span className="text-rose-300/70 break-all" dir="ltr">
                        {errors.title}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {!isChannelLike ? (
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] text-gray-500">
                  {t('chat_settings.description_unsupported')}
                </div>
              ) : canEditDescription ? (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="text-[11px] font-bold text-gray-300">
                      {t('chat_settings.description_label')}
                    </label>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {formatNumber(description.length)}/{formatNumber(255)}
                    </span>
                  </div>
                  <textarea
                    value={description}
                    onChange={(event) => {
                      setDescription(event.target.value)
                      clearFeedback()
                    }}
                    placeholder={t('chat_settings.description_placeholder')}
                    maxLength={255}
                    rows={4}
                    className="w-full resize-none bg-dark-800 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                  />
                  {errors.description && (
                    <p className="mt-1.5 text-[10px] text-rose-300">
                      {t('chat_settings.error_description')}{' '}
                      <span className="text-rose-300/70 break-all" dir="ltr">
                        {errors.description}
                      </span>
                    </p>
                  )}
                </div>
              ) : null}

              {isChannelLike && canEditUsername && (
                <div>
                  <label className="text-[11px] font-bold text-gray-300 mb-1.5 block">
                    {t('chat_settings.username_label')}
                  </label>
                  <div
                    className="flex items-center gap-2 bg-dark-800 border border-white/10 rounded-xl px-3 focus-within:border-primary-500/50"
                    dir="ltr"
                  >
                    <span className="text-[11px] text-gray-500 font-mono select-none">t.me/</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(event) => {
                        setUsername(event.target.value)
                        clearFeedback()
                      }}
                      placeholder={t('chat_settings.username_placeholder')}
                      maxLength={32}
                      dir="ltr"
                      spellCheck={false}
                      autoCapitalize="off"
                      autoCorrect="off"
                      className="flex-1 min-w-0 bg-transparent py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                    {normalizedUsername && (
                      <button
                        type="button"
                        onClick={() => {
                          void window.guidegram?.openExternal?.(
                            `https://t.me/${normalizedUsername}`
                          )
                        }}
                        title={t('chat_settings.username_open')}
                        aria-label={t('chat_settings.username_open')}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-300 hover:bg-white/10 transition-colors shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2 mt-1.5">
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      {normalizedUsername
                        ? t('chat_settings.username_hint')
                        : t('chat_settings.username_private_hint')}
                    </p>
                    <span className="text-[10px] text-gray-500 font-mono shrink-0">
                      {formatNumber(normalizedUsername.length)}/{formatNumber(32)}
                    </span>
                  </div>
                  {errors.username && (
                    <p className="mt-1.5 text-[10px] text-rose-300">
                      {t('chat_settings.error_username')}{' '}
                      <span className="text-rose-300/70 break-all" dir="ltr">
                        {errors.username}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {details.isSupergroup && canEditSlowMode && (
                <div>
                  <div className="mb-1.5">
                    <label className="text-[11px] font-bold text-gray-300">
                      {t('chat_settings.slow_mode_label')}
                    </label>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {t('chat_settings.slow_mode_hint')}
                    </p>
                  </div>
                  <select
                    value={slowModeSeconds}
                    onChange={(event) => {
                      setSlowModeSeconds(Number(event.target.value))
                      clearFeedback()
                    }}
                    className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500/50"
                  >
                    {SLOW_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.key)}
                      </option>
                    ))}
                  </select>
                  {errors.slowMode && (
                    <p className="mt-1.5 text-[10px] text-rose-300">
                      {t('chat_settings.error_slow_mode')}{' '}
                      <span className="text-rose-300/70 break-all" dir="ltr">
                        {errors.slowMode}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {canEditForum && (
                <div className="p-3.5 rounded-2xl bg-dark-850/80 border border-white/5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-gray-200">
                      {t('chat_settings.forum_label')}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                      {t('chat_settings.forum_hint')}
                    </p>
                    {errors.forum && (
                      <p className="mt-1.5 text-[10px] text-rose-300">
                        {t('chat_settings.error_forum')}{' '}
                        <span className="text-rose-300/70 break-all" dir="ltr">
                          {errors.forum}
                        </span>
                      </p>
                    )}
                  </div>
                  <Toggle
                    checked={isForum}
                    onChange={(next) => {
                      setIsForum(next)
                      clearFeedback()
                    }}
                    label={t('chat_settings.forum_label')}
                  />
                </div>
              )}

              {canEditAntiSpam && (
                <div className="p-3.5 rounded-2xl bg-dark-850/80 border border-white/5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-gray-200">
                      Aggressive Anti-Spam
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                      Enable Telegram automated aggressive spam filtering for this supergroup
                    </p>
                    {errors.antiSpam && (
                      <p className="mt-1.5 text-[10px] text-rose-300">
                        Error:{' '}
                        <span className="text-rose-300/70 break-all" dir="ltr">
                          {errors.antiSpam}
                        </span>
                      </p>
                    )}
                  </div>
                  <Toggle
                    checked={antiSpam}
                    onChange={(next) => {
                      setAntiSpam(next)
                      clearFeedback()
                    }}
                    label="Aggressive Anti-Spam"
                  />
                </div>
              )}

              {isChannelLike && canEditJoinRequests && (
                <div className="p-3.5 rounded-2xl bg-dark-850/80 border border-white/5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-gray-200">
                      {t('chat_settings.join_requests_label')}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                      {canEnableJoinRequests
                        ? t('chat_settings.join_requests_hint')
                        : t('chat_settings.join_requests_public_required')}
                    </p>
                    {errors.joinRequests && (
                      <p className="mt-1.5 text-[10px] text-rose-300">
                        {t('chat_settings.error_join_requests')}{' '}
                        <span className="text-rose-300/70 break-all" dir="ltr">
                          {errors.joinRequests}
                        </span>
                      </p>
                    )}
                  </div>
                  <Toggle
                    checked={joinRequests}
                    onChange={(next) => {
                      setJoinRequests(next)
                      clearFeedback()
                    }}
                    disabled={!canEnableJoinRequests && !joinRequests}
                    label={t('chat_settings.join_requests_label')}
                  />
                </div>
              )}

              {canEditPermissions && (
                <div className="p-3.5 rounded-2xl bg-dark-850/80 border border-white/5 space-y-3">
                  <div>
                    <div className="text-[11px] font-bold text-gray-200">
                      {t('chat_settings.permissions_label')}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                      {t('chat_settings.permissions_hint')}
                    </p>
                  </div>
                  <div className="divide-y divide-white/5">
                    {PERMISSION_ROWS.map((row) => {
                      const allowed = !defaultRestrictions[row.key]
                      return (
                        <div
                          key={row.key}
                          className="flex items-center justify-between gap-3 py-2 text-start"
                        >
                          <span className="text-[11px] text-gray-300">{t(row.label)}</span>
                          <Toggle
                            checked={allowed}
                            onChange={(next) => {
                              setDefaultRestrictions((prev) => ({
                                ...prev,
                                [row.key]: !next,
                              }))
                              clearFeedback()
                            }}
                            label={t(row.label)}
                          />
                        </div>
                      )
                    })}
                  </div>
                  {errors.permissions && (
                    <p className="text-[10px] text-rose-300">
                      {t('chat_settings.error_permissions')}{' '}
                      <span className="text-rose-300/70 break-all" dir="ltr">
                        {errors.permissions}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {!canEditTitle && !canEditDescription && !canEditUsername && !canEditSlowMode && !canEditJoinRequests && !canEditPermissions && !canEditForum && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3 text-gray-400">
                  <ShieldAlert className="w-5 h-5 text-orange-300 shrink-0" />
                  <div className="text-xs leading-relaxed">{t('chat_settings.not_admin')}</div>
                </div>
              )}
            </>
          )}
        </div>
        ) : (
          /* Management View (Microphase 038 Layer 232 Ops) */
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar text-xs">
            {/* Section 1: Edit Chat Description (messages.editChatAbout) */}
            <form onSubmit={handleEditChatAbout} className="p-3.5 bg-dark-850/60 rounded-2xl border border-white/5 space-y-2.5">
              <div className="flex items-center gap-2 text-primary-400 font-bold">
                <Settings className="w-4 h-4" />
                <span>Chat Description (messages.editChatAbout)</span>
              </div>
              <p className="text-[11px] text-gray-400">Directly modify the public description/about text of this chat or channel.</p>
              <textarea
                value={customAbout}
                onChange={(e) => setCustomAbout(e.target.value)}
                placeholder="Enter new description / about..."
                rows={2}
                className="w-full px-3 py-2 bg-dark-950/70 border border-white/10 rounded-xl text-gray-200 text-xs focus:outline-none focus:border-primary-500 resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isEditingAbout}
                  className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isEditingAbout && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Description</span>
                </button>
              </div>
              {aboutFeedback && (
                <div className="p-2.5 rounded-xl bg-white/5 text-[11px] text-gray-300 border border-white/5 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-primary-400 shrink-0" />
                  <span>{aboutFeedback}</span>
                </div>
              )}
            </form>

            {/* Section 2: Edit Chat Admin (messages.editChatAdmin) */}
            <form onSubmit={handleEditChatAdmin} className="p-3.5 bg-dark-850/60 rounded-2xl border border-white/5 space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-400 font-bold">
                <Shield className="w-4 h-4" />
                <span>Admin Privileges (messages.editChatAdmin)</span>
              </div>
              <p className="text-[11px] text-gray-400">Promote or demote an administrator in standard chats.</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={adminUserId}
                  onChange={(e) => setAdminUserId(e.target.value)}
                  placeholder="User ID or @username"
                  className="flex-1 px-3 py-1.5 bg-dark-950/70 border border-white/10 rounded-xl text-gray-200 text-xs focus:outline-none focus:border-indigo-400"
                  required
                />
                <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminIsPromote}
                    onChange={(e) => setAdminIsPromote(e.target.checked)}
                    className="rounded text-indigo-500"
                  />
                  <span>Admin</span>
                </label>
                <button
                  type="submit"
                  disabled={isEditingAdmin}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isEditingAdmin && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Apply</span>
                </button>
              </div>
              {adminFeedback && (
                <div className="p-2.5 rounded-xl bg-white/5 text-[11px] text-gray-300 border border-white/5 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>{adminFeedback}</span>
                </div>
              )}
            </form>

            {/* Section 3: Custom Title / Rank (messages.editChatParticipantRank) */}
            <form onSubmit={handleEditChatParticipantRank} className="p-3.5 bg-dark-850/60 rounded-2xl border border-white/5 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <UserCheck className="w-4 h-4" />
                <span>Participant Custom Title (messages.editChatParticipantRank)</span>
              </div>
              <p className="text-[11px] text-gray-400">Assign a personalized custom title or badge rank to a member in this group.</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={rankParticipantId}
                  onChange={(e) => setRankParticipantId(e.target.value)}
                  placeholder="Member User ID"
                  className="px-3 py-1.5 bg-dark-950/70 border border-white/10 rounded-xl text-gray-200 text-xs focus:outline-none focus:border-amber-400"
                  required
                />
                <input
                  type="text"
                  value={participantRank}
                  onChange={(e) => setParticipantRank(e.target.value)}
                  placeholder="Custom Title (e.g. Officer)"
                  className="px-3 py-1.5 bg-dark-950/70 border border-white/10 rounded-xl text-gray-200 text-xs focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isEditingRank}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isEditingRank && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Set Title</span>
                </button>
              </div>
              {rankFeedback && (
                <div className="p-2.5 rounded-xl bg-white/5 text-[11px] text-gray-300 border border-white/5 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{rankFeedback}</span>
                </div>
              )}
            </form>

            {/* Section 4: Chat Default Banned Rights (messages.editChatDefaultBannedRights) */}
            <form onSubmit={handleEditDefaultBannedRights} className="p-3.5 bg-dark-850/60 rounded-2xl border border-white/5 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <ShieldAlert className="w-4 h-4" />
                <span>Chat-Wide Banned Rights (messages.editChatDefaultBannedRights)</span>
              </div>
              <p className="text-[11px] text-gray-400">Configure global restrictions enforced by default for non-admin members.</p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-dark-900/50 border border-white/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={banSendMessages}
                    onChange={(e) => setBanSendMessages(e.target.checked)}
                    className="rounded text-rose-500"
                  />
                  <span>Restrict Messages</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-dark-900/50 border border-white/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={banSendMedia}
                    onChange={(e) => setBanSendMedia(e.target.checked)}
                    className="rounded text-rose-500"
                  />
                  <span>Restrict Media</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-dark-900/50 border border-white/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={banSendStickers}
                    onChange={(e) => setBanSendStickers(e.target.checked)}
                    className="rounded text-rose-500"
                  />
                  <span>Restrict Stickers</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-dark-900/50 border border-white/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={banEmbedLinks}
                    onChange={(e) => setBanEmbedLinks(e.target.checked)}
                    className="rounded text-rose-500"
                  />
                  <span>Restrict Link Previews</span>
                </label>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingBannedRights}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isUpdatingBannedRights && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Rights</span>
                </button>
              </div>
              {bannedRightsFeedback && (
                <div className="p-2.5 rounded-xl bg-white/5 text-[11px] text-gray-300 border border-white/5 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{bannedRightsFeedback}</span>
                </div>
              )}
            </form>

            {/* Section 5: Remove Chat Photo (messages.editChatPhoto) */}
            <div className="p-3.5 bg-dark-850/60 rounded-2xl border border-white/5 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Image className="w-4 h-4" />
                <span>Chat Photo Management (messages.editChatPhoto)</span>
              </div>
              <p className="text-[11px] text-gray-400">Purge and remove the current chat profile avatar.</p>
              <button
                type="button"
                onClick={handleClearChatPhoto}
                disabled={isClearingChatPhoto}
                className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 disabled:opacity-50 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {isClearingChatPhoto && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Remove Chat Avatar Photo</span>
              </button>
              {photoFeedback && (
                <div className="p-2.5 rounded-xl bg-white/5 text-[11px] text-gray-300 border border-white/5 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{photoFeedback}</span>
                </div>
              )}
            </div>

            {/* Section 6: Transfer Chat Ownership (messages.editChatCreator) */}
            <form onSubmit={handleTransferChatCreator} className="p-3.5 bg-dark-850/60 rounded-2xl border border-white/5 space-y-2.5">
              <div className="flex items-center gap-2 text-purple-400 font-bold">
                <KeyRound className="w-4 h-4" />
                <span>Transfer Chat Ownership (messages.editChatCreator)</span>
              </div>
              <p className="text-[11px] text-gray-400">Transfer root ownership of this chat to another trusted administrator.</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCreatorUserId}
                  onChange={(e) => setNewCreatorUserId(e.target.value)}
                  placeholder="New Owner User ID"
                  className="flex-1 px-3 py-1.5 bg-dark-950/70 border border-white/10 rounded-xl text-gray-200 text-xs focus:outline-none focus:border-purple-400"
                  required
                />
                <button
                  type="submit"
                  disabled={isTransferringCreator}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isTransferringCreator && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Transfer</span>
                </button>
              </div>
              {transferCreatorFeedback && (
                <div className="p-2.5 rounded-xl bg-white/5 text-[11px] text-gray-300 border border-white/5 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>{transferCreatorFeedback}</span>
                </div>
              )}
            </form>

            {/* Section 7: Discard Secret Chat Encryption (messages.discardEncryption) */}
            <form onSubmit={handleDiscardEncryption} className="p-3.5 bg-dark-850/60 rounded-2xl border border-white/5 space-y-2.5">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <Lock className="w-4 h-4" />
                <span>Discard Encrypted Chat (messages.discardEncryption)</span>
              </div>
              <p className="text-[11px] text-gray-400">Permanently terminate and discard secret encrypted chat sessions.</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={discardChatIdInput}
                  onChange={(e) => setDiscardChatIdInput(e.target.value)}
                  placeholder={`Secret Chat ID (default: ${chatId})`}
                  className="flex-1 px-3 py-1.5 bg-dark-950/70 border border-white/10 rounded-xl text-gray-200 text-xs focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={isDiscardingEncryption}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isDiscardingEncryption && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Discard</span>
                </button>
              </div>
              {discardEncryptionFeedback && (
                <div className="p-2.5 rounded-xl bg-white/5 text-[11px] text-gray-300 border border-white/5 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{discardEncryptionFeedback}</span>
                </div>
              )}
            </form>
          </div>
        )}

        <div className="px-5 py-3 bg-dark-850/90 border-t border-white/10 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-colors disabled:opacity-40"
          >
            {t('chat_settings.close')}
          </button>
          {activeTab === 'general' && (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || !details || !canEditAnything}
              className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 transition-colors"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? t('chat_settings.saving') : t('chat_settings.save')}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
