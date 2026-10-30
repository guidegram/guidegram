import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  Forward,
  Check,
  EyeOff,
  VolumeX,
  Bookmark,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Edit3,
  Scissors,
  Search,
  Megaphone,
  Users,
  Bot,
} from 'lucide-react'
import { DialogItem, MessageItem, ContactItem } from '../types/telegram'

export interface DirectForwardPayload {
  toChatIds: string[]
  withoutQuote: boolean
  dropMediaCaptions: boolean
  newCaption?: string
  silent: boolean
}

export interface DirectForwardModalProps {
  isOpen: boolean
  message: MessageItem | null
  messages?: MessageItem[]
  dialogs: DialogItem[]
  accountId?: string
  onClose: () => void
  onForward: (
    payloadOrTargetChatIds: DirectForwardPayload | string[],
    withoutQuote?: boolean,
    silent?: boolean,
    extraOptions?: { dropMediaCaptions?: boolean; newCaption?: string }
  ) => Promise<void> | void
}

/**
 * Normalizes Persian and Arabic text for consistent, high-recall search matching.
 * Handles Yeh/Kaf variants, Alef diacritics/hamza, Tatweel, and ZWNJ.
 */
export const normalizeSearchText = (text?: string): string => {
  if (!text) return ''
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // Arabic diacritics / tanween
    .replace(/[يى]/g, 'ی') // Arabic Yeh to Persian Ye
    .replace(/[ك]/g, 'ک') // Arabic Kaf to Persian Ke
    .replace(/[آأإ]/g, 'ا') // Alef variations to plain Alef
    .replace(/[ؤ]/g, 'و') // Waw with hamza
    .replace(/[ئ]/g, 'ی') // Yeh with hamza
    .replace(/[\u200c\u200b\u00ad]/g, '') // Zero-width non-joiner & soft hyphens
    .replace(/[ـ]/g, '') // Tatweel
    .trim()
}

/**
 * Builds a flexible regex that matches Persian/Arabic character variations
 * and optional half-spaces (ZWNJ) between characters.
 */
export const buildFlexibleSearchRegex = (q: string): RegExp | null => {
  const trimmed = q.trim()
  if (!trimmed) return null

  let pattern = ''
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i]
    if (char === 'ی' || char === 'ي' || char === 'ى' || char === 'ئ') {
      pattern += '[یيىئ]'
    } else if (char === 'ک' || char === 'ك') {
      pattern += '[کك]'
    } else if (char === 'ا' || char === 'آ' || char === 'أ' || char === 'إ') {
      pattern += '[اآأإ]'
    } else if (char === 'ه' || char === 'ة') {
      pattern += '[هة]'
    } else if (char === 'و' || char === 'ؤ') {
      pattern += '[وؤ]'
    } else if (/[\s\u200c\u200b\u00ad]/.test(char)) {
      pattern += '[\\s\\u200c\\u200b\\u00ad]*'
    } else {
      pattern += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  try {
    return new RegExp(pattern, 'i')
  } catch {
    return null
  }
}

export const DirectForwardModal: React.FC<DirectForwardModalProps> = ({
  isOpen,
  message,
  messages,
  dialogs,
  accountId,
  onClose,
  onForward,
}) => {
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([])
  const [withoutQuote, setWithoutQuote] = useState(true) // Default true (Telegraph direct style)
  const [dropMediaCaptions, setDropMediaCaptions] = useState(false)
  const [newCaption, setNewCaption] = useState('')
  const [silent, setSilent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [contacts, setContacts] = useState<DialogItem[]>([])
  const [serverPeers, setServerPeers] = useState<DialogItem[]>([])
  const [isSearchingServer, setIsSearchingServer] = useState(false)

  const effectiveAccountId = accountId || dialogs[0]?.accountId

  // Load account contacts to enrich the forward list if they are not in recent dialogs
  useEffect(() => {
    if (isOpen && effectiveAccountId && window.guidegram?.getContacts) {
      window.guidegram
        .getContacts(effectiveAccountId)
        .then((cts: ContactItem[]) => {
          if (Array.isArray(cts)) {
            const mappedContacts: DialogItem[] = cts.map((c) => ({
              id: c.id,
              accountId: effectiveAccountId,
              title: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.username || c.phone || 'Contact',
              unreadCount: 0,
              isUser: true,
              isGroup: false,
              isChannel: false,
              isBot: false,
              isPinned: false,
              username: c.username,
              avatarUrl: c.avatarUrl,
              isContact: true,
            }))
            setContacts(mappedContacts)
          }
        })
        .catch(() => {})
    }
  }, [isOpen, effectiveAccountId])

  // Live MTProto server search for peers not cached in local dialogs
  useEffect(() => {
    const q = search.trim().replace(/^@/, '')
    if (!q || q.length < 2 || !effectiveAccountId || !window.guidegram?.searchPublicPeers) {
      setServerPeers([])
      setIsSearchingServer(false)
      return
    }

    let cancelled = false
    setIsSearchingServer(true)
    const timer = setTimeout(() => {
      window.guidegram
        ?.searchPublicPeers(effectiveAccountId, q)
        .then((peers: DialogItem[]) => {
          if (!cancelled && Array.isArray(peers)) {
            setServerPeers(peers)
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setIsSearchingServer(false)
        })
    }, 220)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, effectiveAccountId])

  useEffect(() => {
    if (isOpen && message) {
      setSelectedChatIds([])
      setSearch('')
      setServerPeers([])
      setLoading(false)
      setWithoutQuote(true)
      setDropMediaCaptions(false)
      setSilent(false)
      setNewCaption(message.text || '')
    }
  }, [isOpen, message])

  // Combine dialogs with contacts & live server results so all reachable peers can be searched & forwarded to
  const allDestinations = useMemo(() => {
    const mergedMap = new Map<string, DialogItem>()
    for (const d of dialogs) {
      if (d.id) mergedMap.set(d.id, d)
    }
    for (const c of contacts) {
      if (c.id && !mergedMap.has(c.id)) {
        mergedMap.set(c.id, c)
      }
    }
    for (const s of serverPeers) {
      if (s.id && !mergedMap.has(s.id)) {
        mergedMap.set(s.id, s)
      }
    }
    return Array.from(mergedMap.values())
  }, [dialogs, contacts, serverPeers])

  // Filter according to strict business logic:
  // 1. Saved Messages handled separately
  // 2. Channels: ONLY channels where user is admin, owner (creator) or has send permissions
  // 3. Groups: included
  // 4. PVs: included
  // 5. Bots: included (sorted to the bottom)
  const validDestinations = useMemo(() => {
    return allDestinations.filter((d) => {
      if (d.isSponsored || d.isSponsorChannel) return false
      if (d.id === 'me' || d.isSavedMessages) return false

      const isBroadcast = Boolean(d.isBroadcast ?? (d.isChannel && !d.isGroup))
      if (isBroadcast) {
        const isChannelAdminOrOwner = Boolean(d.isCreator || d.isAdmin || d.canSendMessages)
        if (!isChannelAdminOrOwner) {
          return false
        }
      }
      return true
    })
  }, [allDestinations])

  // Sort: non-bots first (PVs, Groups, Admin Channels), then Bots at the very bottom
  const sortedDestinations = useMemo(() => {
    const nonBots: DialogItem[] = []
    const bots: DialogItem[] = []

    for (const d of validDestinations) {
      if (d.isBot) {
        bots.push(d)
      } else {
        nonBots.push(d)
      }
    }

    return [...nonBots, ...bots]
  }, [validDestinations])

  // High-recall Persian / Arabic / English matching
  const matchesSearch = (d: DialogItem, query: string): boolean => {
    const clean = query.trim().toLowerCase().replace(/^@/, '')
    if (!clean) return true
    const norm = normalizeSearchText(clean)

    const normTitle = normalizeSearchText(d.title || '')
    const normUser = normalizeSearchText((d.username || '').replace(/^@/, ''))
    const rawTitle = (d.title || '').toLowerCase()
    const rawUser = (d.username || '').toLowerCase().replace(/^@/, '')

    if (norm && (normTitle.includes(norm) || normUser.includes(norm))) return true
    if (rawTitle.includes(clean) || rawUser.includes(clean)) return true
    if (d.id && d.id.includes(clean)) return true

    const regex = buildFlexibleSearchRegex(clean)
    if (regex && (regex.test(d.title || '') || regex.test(d.username || ''))) {
      return true
    }

    return false
  }

  const isSavedMessagesMatch = (query: string): boolean => {
    const clean = query.trim().toLowerCase()
    if (!clean) return true
    const norm = normalizeSearchText(clean)
    const terms = [
      'saved',
      'save',
      'saved messages',
      'messages',
      'me',
      'ذخیره',
      'ذخیره شده',
      'پیام های ذخیره',
      'پیام های ذخیره شده',
      'پیامهای ذخیره شده',
      'پیامهای ذخیره‌شده',
      'پیام ذخیره',
      'سیو',
      'سیود',
    ]
    return terms.some((t) => {
      const normT = normalizeSearchText(t)
      return normT.includes(norm) || norm.includes(normT) || t.includes(clean)
    })
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return sortedDestinations
    return sortedDestinations.filter((d) => matchesSearch(d, search))
  }, [sortedDestinations, search])

  const showSavedMessages = isSavedMessagesMatch(search)

  if (!isOpen || !message) return null

  const handleToggleChat = (chatId: string) => {
    setSelectedChatIds((prev) => {
      if (prev.includes(chatId)) {
        return prev.filter((id) => id !== chatId)
      } else {
        return [...prev, chatId]
      }
    })
  }

  const handleMoveRecipient = (index: number, direction: 'up' | 'down') => {
    setSelectedChatIds((prev) => {
      const next = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= next.length) return prev
      const temp = next[index]
      next[index] = next[targetIndex]
      next[targetIndex] = temp
      return next
    })
  }

  const handleRemoveRecipient = (chatId: string) => {
    setSelectedChatIds((prev) => prev.filter((id) => id !== chatId))
  }

  const handleForward = async () => {
    if (selectedChatIds.length === 0) return
    setLoading(true)
    try {
      const trimmedCaption = newCaption.trim()
      const payload: DirectForwardPayload = {
        toChatIds: selectedChatIds,
        withoutQuote,
        dropMediaCaptions,
        newCaption: trimmedCaption.length > 0 ? trimmedCaption : undefined,
        silent,
      }

      if (onForward.length <= 1) {
        await onForward(payload)
      } else {
        await onForward(selectedChatIds, withoutQuote, silent, {
          dropMediaCaptions,
          newCaption: trimmedCaption.length > 0 ? trimmedCaption : undefined,
        })
      }
      onClose()
    } catch (err) {
      console.error('Failed to forward messages:', err)
    } finally {
      setLoading(false)
    }
  }

  const getChatTitle = (chatId: string): string => {
    if (chatId === 'me') return 'Saved Messages'
    const found = allDestinations.find((d) => d.id === chatId)
    return found?.title || `Chat ${chatId}`
  }

  const isCaptionModified = newCaption !== (message.text || '')

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="glass-modal w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-white/10"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-dark-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center border border-primary-500/20 shadow-sm">
              <Forward className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-100">
                {messages && messages.length > 1
                  ? `Forward ${messages.length} Messages`
                  : 'Advanced No-Quote Forwarding'}
              </div>
              <div className="text-[10px] text-gray-400">
                {messages && messages.length > 1
                  ? `${messages.length} messages queued for direct forward`
                  : 'Direct dispatch, caption editor & recipient sequencing'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto space-y-3 p-5">
          {/* Caption & Text Editor */}
          <div className="bg-dark-850/70 border border-white/5 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
              <div className="flex items-center gap-1.5 text-primary-400">
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Caption / Text Before Dispatch</span>
              </div>
              {isCaptionModified && (
                <button
                  type="button"
                  onClick={() => setNewCaption(message.text || '')}
                  className="flex items-center gap-1 text-[11px] text-accent-cyan hover:underline cursor-pointer"
                  title="Revert to original text"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <textarea
              rows={3}
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
              placeholder="Edit caption or accompanying message text..."
              className="w-full bg-dark-900/90 border border-white/10 rounded-xl p-2.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50 resize-none font-sans"
            />
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>{message.mediaType ? `Original Media: ${message.mediaType}` : 'Text Message'}</span>
              <span>{newCaption.length} characters</span>
            </div>
          </div>

          {/* Forwarding Options (Strip Quotes, Strip Captions, Silent) */}
          <div className="bg-dark-900/50 border border-white/5 rounded-2xl p-3 space-y-2">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
              Dispatch & Privacy Options
            </div>

            {/* Strip Quotes / Without Quote */}
            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-primary-500/15 text-primary-400 flex items-center justify-center shrink-0">
                  <EyeOff className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-200">
                    Strip Quotes (No-Quote Forward)
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Removes original author badge, channel link, and attribution header
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={withoutQuote}
                onChange={(e) => setWithoutQuote(e.target.checked)}
                className="w-4 h-4 accent-primary-600 rounded cursor-pointer shrink-0 ml-2"
              />
            </label>

            {/* Strip Media Captions */}
            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-accent-amber/15 text-accent-amber flex items-center justify-center shrink-0">
                  <Scissors className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-200">
                    Strip Media Captions
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Removes embedded caption text from forwarded media files
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={dropMediaCaptions}
                onChange={(e) => setDropMediaCaptions(e.target.checked)}
                className="w-4 h-4 accent-primary-600 rounded cursor-pointer shrink-0 ml-2"
              />
            </label>

            {/* Send Silently */}
            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-accent-cyan/15 text-accent-cyan flex items-center justify-center shrink-0">
                  <VolumeX className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-200">Send Silently</div>
                  <div className="text-[10px] text-gray-400">
                    Recipients receive notification banner without audible sound
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={silent}
                onChange={(e) => setSilent(e.target.checked)}
                className="w-4 h-4 accent-primary-600 rounded cursor-pointer shrink-0 ml-2"
              />
            </label>
          </div>

          {/* Selected Recipients Sequencing List */}
          {selectedChatIds.length > 0 && (
            <div className="bg-dark-850/60 border border-primary-500/20 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-300 px-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                  Dispatch Order ({selectedChatIds.length} recipients)
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedChatIds([])}
                  className="text-[11px] text-accent-cyan hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {selectedChatIds.map((chatId, idx) => (
                  <div
                    key={chatId}
                    className="flex items-center justify-between p-2 rounded-xl bg-dark-900/80 border border-white/5 text-xs text-gray-200"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-primary-600/30 text-primary-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="truncate font-medium">{getChatTitle(chatId)}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => handleMoveRecipient(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up in Dispatch Order"
                        className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveRecipient(idx, 'down')}
                        disabled={idx === selectedChatIds.length - 1}
                        title="Move Down in Dispatch Order"
                        className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(chatId)}
                        title="Remove Recipient"
                        className="p-1 rounded-lg hover:bg-accent-rose/20 text-gray-400 hover:text-accent-rose cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Destination Chat Search & List */}
          <div className="space-y-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                placeholder="جستجو در گفتگوها، مخاطبین و ربات‌ها..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-dark-800 border border-white/5 rounded-xl pl-9 pr-8 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
              />
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
                {isSearchingServer && (
                  <div className="w-3 h-3 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                )}
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
              {showSavedMessages && (
                <div
                  onClick={() => handleToggleChat('me')}
                  className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors text-xs border ${
                    selectedChatIds.includes('me')
                      ? 'bg-primary-600/20 border-primary-500/40 text-white'
                      : 'bg-dark-850/50 hover:bg-dark-800 border-white/5 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-accent-cyan/15 text-accent-cyan flex items-center justify-center shrink-0 border border-accent-cyan/20">
                      <Bookmark className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="truncate font-semibold text-gray-100">Saved Messages</div>
                      <div className="text-[10px] text-gray-400">پیام‌های ذخیره‌شده</div>
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                      selectedChatIds.includes('me')
                        ? 'bg-primary-600 border-primary-500 text-white'
                        : 'border-white/20 bg-dark-900/60'
                    }`}
                  >
                    {selectedChatIds.includes('me') && (
                      <span className="text-[10px] font-bold">
                        {selectedChatIds.indexOf('me') + 1}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {filtered.map((d) => {
                const isSelected = selectedChatIds.includes(d.id)
                const orderIndex = selectedChatIds.indexOf(d.id)
                const isBroadcast = Boolean(d.isBroadcast ?? (d.isChannel && !d.isGroup))
                const isGroup = Boolean(d.isGroup || (d.isChannel && !isBroadcast))
                const isBot = Boolean(d.isBot)
                const isOwner = Boolean(d.isCreator)

                return (
                  <div
                    key={d.id}
                    onClick={() => handleToggleChat(d.id)}
                    className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors text-xs border ${
                      isSelected
                        ? 'bg-primary-600/20 border-primary-500/40 text-white'
                        : 'bg-dark-850/50 hover:bg-dark-800 border-white/5 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-dark-800 text-gray-300 flex items-center justify-center font-bold text-xs shrink-0 border border-white/5 overflow-hidden">
                        {d.avatarUrl ? (
                          <img src={d.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{d.avatarInitials || d.title.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium">{d.title}</span>
                          {isBroadcast && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 flex items-center gap-0.5 shrink-0">
                              <Megaphone className="w-2.5 h-2.5" />
                              <span>{isOwner ? 'مالک' : 'ادمین'}</span>
                            </span>
                          )}
                          {isGroup && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-primary-500/15 text-primary-300 border border-primary-500/30 flex items-center gap-0.5 shrink-0">
                              <Users className="w-2.5 h-2.5" />
                              <span>گروه</span>
                            </span>
                          )}
                          {isBot && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-accent-amber/15 text-accent-amber border border-accent-amber/30 flex items-center gap-0.5 shrink-0">
                              <Bot className="w-2.5 h-2.5" />
                              <span>ربات</span>
                            </span>
                          )}
                        </div>
                        {d.username && (
                          <div className="text-[10px] text-gray-500 truncate">@{d.username}</div>
                        )}
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors shrink-0 ml-2 ${
                        isSelected
                          ? 'bg-primary-600 border-primary-500 text-white'
                          : 'border-white/20 bg-dark-900/60'
                      }`}
                    >
                      {isSelected ? (
                        <span className="text-[10px] font-bold">{orderIndex + 1}</span>
                      ) : null}
                    </div>
                  </div>
                )
              })}

              {filtered.length === 0 && !showSavedMessages && (
                <div className="py-8 text-center text-xs text-gray-500">
                  گفتگویی مطابق با جستجو پیدا نشد
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between gap-2 bg-dark-900/80">
          <div className="text-xs text-gray-400">
            {selectedChatIds.length > 0 ? (
              <span>
                Ordered dispatch to <strong className="text-white">{selectedChatIds.length}</strong>{' '}
                {selectedChatIds.length === 1 ? 'chat' : 'chats'}
              </span>
            ) : (
              <span>Select destination chats</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleForward}
              disabled={selectedChatIds.length === 0 || loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white shadow-glow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Forward className="w-3.5 h-3.5" />
              <span>
                {loading
                  ? 'Forwarding...'
                  : selectedChatIds.length > 1
                  ? `Forward to ${selectedChatIds.length} Chats`
                  : selectedChatIds.length === 1
                  ? 'Forward Now'
                  : 'Select Chats'}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

