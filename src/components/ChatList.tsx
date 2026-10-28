import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Pin, ShieldCheck, ShieldOff, X, Clock, Trash2, Globe, MessageSquare, Radio, Users, User, Archive, RefreshCw, Sparkles, Check, CheckCheck, Plus, Image, Link2, FileText, Music, Mic, Lock, UserCheck, UserX, Calendar, Bot } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { DialogItem, AccountInfo, MessageItem, CloudFolderItem, ActiveStoryPeer } from '../types/telegram'
import { TabCategory } from './ChatTabs'
import { Avatar } from './Avatar'
import { isRTL, formatFileSize, formatDuration } from '../utils/textUtils'
import { CustomEmojiView } from './ChatViewport'
import { useI18n } from '../i18n'

const StoryViewerModal = React.lazy(() => import('./StoryViewerModal').then((m) => ({ default: m.StoryViewerModal })))
const StoryComposerModal = React.lazy(() => import('./StoryComposerModal').then((m) => ({ default: m.StoryComposerModal })))

interface ChatListProps {
  account: AccountInfo | null
  dialogs: DialogItem[]
  activeChatId: string | null
  activeTab: TabCategory
  searchQuery: string
  showChatId?: boolean
  ghostMode?: boolean
  cloudFolders?: CloudFolderItem[]
  isLoadingDialogs?: boolean
  isLoadingMoreDialogs?: boolean
  onSearchChange: (query: string) => void
  onSelectChat: (chatId: string, targetMsgId?: number, provisionalPeer?: Partial<DialogItem>) => void
  onSelectPeer?: (target: string) => void
  onLoadMoreDialogs?: () => void
  onOpenProxyModal?: () => void
}

type SearchFilterCategory =
  | 'all'
  | 'media'
  | 'links'
  | 'files'
  | 'audio'
  | 'voice'
  | 'channels'
  | 'groups'
  | 'private'
  | 'archive'

type SearchScopeCategory = 'all' | 'private' | 'groups' | 'channels' | 'bots'

export const ChatList = React.memo<ChatListProps>(({
  account,
  dialogs,
  activeChatId,
  activeTab,
  searchQuery,
  showChatId = true,
  ghostMode = false,
  cloudFolders,
  isLoadingDialogs = false,
  isLoadingMoreDialogs = false,
  onSearchChange,
  onSelectChat,
  onSelectPeer,
  onLoadMoreDialogs,
  onOpenProxyModal,
}) => {
  const { t, isRTL: isAppRtl, formatNumber } = useI18n()
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [searchFilter, setSearchFilter] = useState<SearchFilterCategory>('all')
  const [searchScope, setSearchScope] = useState<SearchScopeCategory>('all')
  const [globalPeers, setGlobalPeers] = useState<DialogItem[]>([])
  const [serverMyPeers, setServerMyPeers] = useState<DialogItem[]>([])
  const [globalMessages, setGlobalMessages] = useState<MessageItem[]>([])
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false)
  const [searchDateFilter, setSearchDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all')
  const [customDate, setCustomDate] = useState('')
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [viewingStoryPeer, setViewingStoryPeer] = useState<{ id: string; title: string } | null>(null)
  const [isStoryComposerOpen, setIsStoryComposerOpen] = useState(false)
  const [activeStoryPeers, setActiveStoryPeers] = useState<ActiveStoryPeer[]>([])
  const [storyRefreshKey, setStoryRefreshKey] = useState(0)
  const [pvFilter, setPvFilter] = useState<'all' | 'contacts' | 'non_contacts'>('all')

  const dialogsRef = useRef(dialogs)
  useEffect(() => {
    dialogsRef.current = dialogs
  }, [dialogs])

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('guidegram_recent_searches')
      return saved ? JSON.parse(saved) : []
    } catch (_) {
      return []
    }
  })

  const saveRecentSearch = (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    const updated = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8)
    setRecentSearches(updated)
    try {
      localStorage.setItem('guidegram_recent_searches', JSON.stringify(updated))
    } catch (_) {}
  }

  const handleSelectDialog = useCallback(
    (dialogId: string) => {
      if (searchQuery.trim()) saveRecentSearch(searchQuery.trim())
      const found = dialogs.find((d) => d.id === dialogId) || serverMyPeers.find((d) => d.id === dialogId)
      onSelectChat(dialogId, undefined, found)
    },
    [searchQuery, onSelectChat, dialogs, serverMyPeers]
  )

  const clearRecentSearches = () => {
    setRecentSearches([])
    try {
      localStorage.removeItem('guidegram_recent_searches')
    } catch (_) {}
  }

  const handleOpenStory = useCallback((peerId: string, title: string) => {
    setViewingStoryPeer({ id: peerId, title })
  }, [])

  const handleCloseStoryViewer = useCallback(() => {
    const closedPeerId = viewingStoryPeer?.id
    if (closedPeerId && !ghostMode) {
      // Optimistically clear the ring; the refresh below reconciles with the server.
      setActiveStoryPeers((prev) =>
        prev.map((peer) =>
          peer.peerId === closedPeerId ? { ...peer, hasUnread: false } : peer
        )
      )
    }
    setViewingStoryPeer(null)
    window.setTimeout(() => setStoryRefreshKey((key) => key + 1), 700)
  }, [viewingStoryPeer?.id, ghostMode])

  const handleStoryPosted = useCallback(() => {
    setStoryRefreshKey((key) => key + 1)
    // Telegram can take a moment to expose the new story in getAllStories.
    window.setTimeout(() => setStoryRefreshKey((key) => key + 1), 1500)
  }, [])

  // Load active stories for rings and the story strip.
  useEffect(() => {
    let cancelled = false
    setActiveStoryPeers([])

    if (
      !account?.id ||
      account.status !== 'connected' ||
      !window.guidegram?.getAllStories
    ) {
      return
    }

    window.guidegram
      .getAllStories(account.id)
      .then((result) => {
        if (cancelled) return
        setActiveStoryPeers(result?.peers || [])
      })
      .catch((err) => {
        if (cancelled) return
        console.warn('Failed to load active stories:', err)
        setActiveStoryPeers([])
      })

    return () => {
      cancelled = true
    }
  }, [account?.id, account?.status, storyRefreshKey])

  // Filter local dialogs based on active tab & search query
  const cleanQuery = searchQuery.trim().toLowerCase().replace(/^@/, '')
  const filteredDialogs = dialogs.filter((dialog) => {
    // Suppress proxy sponsor channels & promoted dialogs to keep chat list ad-free
    if (dialog.isSponsored || dialog.isSponsorChannel) {
      return false
    }

    if (cleanQuery) {
      const matchTitle = dialog.title.toLowerCase().includes(cleanQuery)
      const matchMsg = dialog.lastMessageText?.toLowerCase().includes(cleanQuery)
      const matchId = dialog.id.includes(cleanQuery)
      const matchUser = dialog.username?.toLowerCase().includes(cleanQuery)
      if (!matchTitle && !matchMsg && !matchId && !matchUser) {
        return false
      }
    }

    const isBroadcast = dialog.isBroadcast ?? (dialog.isChannel && !dialog.isGroup)
    const isGroup = dialog.isGroup || (dialog.isChannel && !isBroadcast)

    if (searchQuery.trim()) {
      // In search mode, apply searchScope / searchFilter category
      if (searchScope === 'channels' && !isBroadcast) return false
      if (searchScope === 'groups' && !isGroup) return false
      if (searchScope === 'private' && (!dialog.isUser || dialog.isBot)) return false
      if (searchScope === 'bots' && !dialog.isBot) return false
      if (searchFilter === 'channels' && !isBroadcast) return false
      if (searchFilter === 'groups' && !isGroup) return false
      if (searchFilter === 'private' && !dialog.isUser) return false
      return true
    }

    const isArchived = dialog.folderId === 1 || (dialog as any).archived === true

    // Archived chats tab filter
    if (activeTab === 'archived') {
      return isArchived
    }

    // Exclude archived chats from regular tabs unless actively searching
    if (!cleanQuery && isArchived) {
      return false
    }

    // Normal tab category match
    if (activeTab === 'users') {
      if (!dialog.isUser || dialog.isBot) return false
      if (pvFilter === 'contacts' && !dialog.isContact) return false
      if (pvFilter === 'non_contacts' && dialog.isContact) return false
    }
    if (activeTab === 'groups' && !isGroup) return false
    if (activeTab === 'channels' && !isBroadcast) return false
    if (activeTab === 'bots' && !dialog.isBot) return false
    if (activeTab === 'unread' && dialog.unreadCount === 0) return false

    // MTProto Cloud Folders match
    if (activeTab.startsWith('folder:')) {
      const folderId = Number(activeTab.replace('folder:', ''))
      const folder = cloudFolders?.find((f) => f.id === folderId)
      if (folder) {
        const peerMatches = (list?: string[], targetId?: string): boolean => {
          if (!list || list.length === 0 || !targetId) return false
          if (list.includes(targetId)) return true
          const cleanTarget = targetId.replace(/^-100/, '').replace(/^-/, '')
          return list.some((id) => id.replace(/^-100/, '').replace(/^-/, '') === cleanTarget)
        }

        if (peerMatches(folder.excludePeerIds, dialog.id)) return false
        if (folder.excludeMuted && dialog.isMuted) return false
        if (folder.excludeRead && dialog.unreadCount === 0) return false
        if (folder.excludeArchived && (dialog.folderId === 1 || (dialog as any).archived)) return false

        const isIncluded = peerMatches(folder.includePeerIds, dialog.id) ||
                           peerMatches(folder.pinnedPeerIds, dialog.id)

        const hasFlags = folder.contacts || folder.nonContacts || folder.groups || folder.broadcasts || folder.bots
        const hasIncludePeers = (folder.includePeerIds && folder.includePeerIds.length > 0) ||
                                (folder.pinnedPeerIds && folder.pinnedPeerIds.length > 0)

        if (hasIncludePeers || hasFlags) {
          let matched = false
          if (isIncluded) {
            matched = true
          }
          if (folder.broadcasts && isBroadcast) {
            matched = true
          }
          if (folder.groups && isGroup) {
            matched = true
          }
          if (folder.bots && dialog.isBot) {
            matched = true
          }
          if (dialog.isUser && !dialog.isBot) {
            if (folder.contacts && folder.nonContacts) {
              matched = true
            } else if (folder.contacts && dialog.isContact) {
              matched = true
            } else if (folder.nonContacts && !dialog.isContact) {
              matched = true
            }
          }
          if (!matched) return false
        }
      }
    }

    return true
  })

  // Seamlessly merge local matching dialogs with server myPeers (full Telegram parity)
  const chatsAndContacts = React.useMemo(() => {
    const map = new Map<string, DialogItem>()
    for (const d of filteredDialogs) {
      map.set(d.id, d)
    }
    for (const p of serverMyPeers) {
      if (!map.has(p.id)) {
        if (searchScope === 'channels' && !p.isChannel) continue
        if (searchScope === 'groups' && !p.isGroup) continue
        if (searchScope === 'private' && (!p.isUser || p.isBot)) continue
        if (searchScope === 'bots' && !p.isBot) continue
        map.set(p.id, p)
      }
    }
    return Array.from(map.values())
  }, [filteredDialogs, serverMyPeers, searchScope])

  const storyPeerMap = new Map(activeStoryPeers.map((peer) => [peer.peerId, peer]))

  // Counts for PV filter toggle
  const userDialogs = React.useMemo(() => {
    return dialogs.filter(
      (d) =>
        d.isUser &&
        !d.isBot &&
        !d.isSponsored &&
        !d.isSponsorChannel &&
        d.folderId !== 1 &&
        !(d as any).archived
    )
  }, [dialogs])

  const contactsCount = React.useMemo(() => {
    return userDialogs.filter((d) => Boolean(d.isContact)).length
  }, [userDialogs])

  const nonContactsCount = React.useMemo(() => {
    return userDialogs.filter((d) => !d.isContact).length
  }, [userDialogs])

  const nonContactsUnread = React.useMemo(() => {
    return userDialogs
      .filter((d) => !d.isContact && d.unreadCount > 0)
      .reduce((acc, d) => acc + d.unreadCount, 0)
  }, [userDialogs])

  // Debounced Telegram MTProto Global Search
  const searchTimeoutRef = useRef<any>(null)
  useEffect(() => {
    if (!searchQuery.trim() || !account?.id) {
      setGlobalPeers([])
      setServerMyPeers([])
      setGlobalMessages([])
      setIsSearchingGlobal(false)
      return
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    setIsSearchingGlobal(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const query = searchQuery.trim()
        let minDate = 0
        const nowSec = Math.floor(Date.now() / 1000)
        if (searchDateFilter === 'today') {
          minDate = nowSec - 24 * 3600
        } else if (searchDateFilter === 'week') {
          minDate = nowSec - 7 * 24 * 3600
        } else if (searchDateFilter === 'month') {
          minDate = nowSec - 30 * 24 * 3600
        } else if (searchDateFilter === 'custom' && customDate) {
          minDate = Math.floor(new Date(customDate).getTime() / 1000)
        }

        const [peersRes, msgsRes] = await Promise.all([
          window.guidegram?.searchPublicPeers?.(account.id, query),
          window.guidegram?.searchGlobal?.(
            account.id,
            query,
            searchFilter === 'all' ? undefined : searchFilter,
            40,
            minDate,
            undefined,
            searchScope === 'all' ? undefined : searchScope
          ),
        ])

        const myPeers = (peersRes || []).filter((p) => p.isMyPeer === true)
        const pubPeers = (peersRes || []).filter((p) => p.isMyPeer !== true)

        // Filter out peers already in local dialogs from the public search results
        const localIds = new Set(dialogsRef.current.map((d) => d.id))
        const uniquePubPeers = pubPeers.filter((p) => !localIds.has(p.id))

        setServerMyPeers(myPeers)
        setGlobalPeers(uniquePubPeers)
        setGlobalMessages(msgsRes || [])
      } catch (err) {
        console.warn('Global search error:', err)
      } finally {
        setIsSearchingGlobal(false)
      }
    }, 350)

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [searchQuery, searchFilter, searchScope, searchDateFilter, customDate, account?.id])

  // Format time (e.g. 14:20 or Yesterday)
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return ''
    const ms = timestamp < 1e11 ? timestamp * 1000 : timestamp
    const date = new Date(ms)
    const now = new Date()
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  // Highlight search snippet in global results
  const highlightSnippet = (text: string, q: string) => {
    if (!q.trim() || !text) return text
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'gi')
    const parts = text.split(regex)
    if (parts.length <= 1) return text
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="bg-primary-500/30 text-accent-cyan rounded px-0.5 font-bold">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  return (
    <div className="w-full flex-1 min-h-0 bg-dark-850 flex flex-col select-none titlebar-no-drag">
      {/* Account Info Bar */}
      {account && (
        <div className="px-3.5 py-2.5 bg-dark-900/60 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Avatar
              key={account.id}
              accountId={account.id}
              peerId={account.id}
              title={account.firstName || 'User'}
              initials={(account.firstName || 'U').charAt(0)}
              avatarUrl={account.avatarUrl}
              size="sm"
            />
            <div className="truncate">
              <div className="text-xs font-bold text-gray-200 truncate flex items-center gap-1.5">
                <span className="truncate">{account.firstName || 'User'} {account.lastName || ''}</span>
                {account.isBot && (
                  <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-primary-500/20 text-primary-300 font-semibold uppercase tracking-wider border border-primary-500/30">
                    BOT
                  </span>
                )}
              </div>
              <div className="text-[11px] text-gray-400 truncate">{account.phone || ''}</div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onOpenProxyModal}
            title={
              account.proxyConfig?.enabled
                ? `پروکسی ${(account.proxyConfig.type || 'SOCKS5').toUpperCase()} فعال است (${account.proxyConfig.host}:${account.proxyConfig.port}) — کلیک برای تنظیمات`
                : 'اتصال مستقیم (بدون پروکسی) — کلیک برای فعال‌سازی پروکسی'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border shrink-0 transition-all cursor-pointer shadow-sm ${
              account.proxyConfig?.enabled
                ? 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30 hover:bg-accent-cyan/25 shadow-accent-cyan/10'
                : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-gray-200'
            }`}
          >
            {account.proxyConfig?.enabled ? (
              <ShieldCheck className="w-3.5 h-3.5 text-accent-cyan" />
            ) : (
              <ShieldOff className="w-3.5 h-3.5 text-gray-400" />
            )}
            <span>{account.proxyConfig?.enabled ? 'Proxy' : 'Direct'}</span>
          </motion.button>
        </div>
      )}

      {/* Search Input with Clear button, Calendar Picker and Recent Searches */}
      <div className="p-2.5 shrink-0 relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            aria-label={t('app.search_placeholder') || 'Search chats, media, and links'}
            placeholder={t('app.search_placeholder')}
            value={searchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                saveRecentSearch(searchQuery.trim())
              } else if (e.key === 'Escape') {
                e.stopPropagation()
                onSearchChange('')
              }
            }}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-dark-800 border border-white/5 rounded-xl pl-9 pr-16 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50 transition-colors"
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                title={t('app.cancel')}
                aria-label={t('app.cancel') || 'Clear search query'}
                className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              title="فیلتر بازه زمانی و تاریخ"
              aria-label="Filter by date"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer relative ${
                searchDateFilter !== 'all'
                  ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/10'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {searchDateFilter !== 'all' && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan absolute top-1 right-1 animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
              )}
            </button>
          </div>
        </div>

        {/* Calendar / Date Filter Popover */}
        {isCalendarOpen && (
          <div className="absolute left-2.5 right-2.5 top-full z-50 mt-1 bg-dark-900 border border-white/10 rounded-2xl shadow-2xl p-3 space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-300 px-1 border-b border-white/5 pb-2">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-accent-cyan" />
                <span>بازه زمانی جستجو</span>
              </span>
              {searchDateFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchDateFilter('all')
                    setCustomDate('')
                    setIsCalendarOpen(false)
                  }}
                  className="text-accent-rose hover:underline text-[10.5px] cursor-pointer"
                >
                  پاک کردن فیلتر
                </button>
              )}
            </div>

            {/* Quick Date Range Indexing Pills */}
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { key: 'all', label: 'Anytime' },
                  { key: 'today', label: '24h' },
                  { key: 'week', label: '7d' },
                  { key: 'month', label: '30d' },
                ] as const
              ).map((df) => (
                <button
                  key={df.key}
                  type="button"
                  onClick={() => {
                    setSearchDateFilter(df.key)
                    setCustomDate('')
                    setIsCalendarOpen(false)
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all text-center cursor-pointer border ${
                    searchDateFilter === df.key && !customDate
                      ? 'bg-accent-cyan/20 text-accent-cyan font-bold border-accent-cyan/40 shadow-sm'
                      : 'bg-dark-800/80 hover:bg-dark-750 text-gray-300 border-white/5'
                  }`}
                >
                  {df.label}
                </button>
              ))}
            </div>

            <div className="pt-1.5 border-t border-white/5">
              <label className="block text-[10.5px] text-gray-400 font-medium mb-1 px-1">
                انتخاب تاریخ مشخص:
              </label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value)
                  if (e.target.value) {
                    setSearchDateFilter('custom')
                  } else {
                    setSearchDateFilter('all')
                  }
                }}
                className="w-full bg-dark-800 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-accent-cyan/50"
              />
            </div>
          </div>
        )}

        {/* Categorized Filter Controls in Search Mode */}
        {searchQuery.trim().length > 0 && (
          <div className="mt-2 space-y-1.5">
            {/* Row 1: Chat Scope Segmented Control (Front & Center, No Hidden Pills) */}
            <div className="flex items-center gap-1 bg-dark-900/80 p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
              {(
                [
                  { key: 'all', label: t('search.all_chats') || 'همه' },
                  { key: 'private', label: t('search.private_chats') || 'مخاطبین', icon: UserCheck },
                  { key: 'groups', label: t('search.group_chats') || 'گروه‌ها', icon: Users },
                  { key: 'channels', label: t('search.channels') || 'کانال‌ها', icon: Radio },
                  { key: 'bots', label: 'ربات‌ها', icon: Bot },
                ] as const
              ).map((scope) => {
                const IconComp = (scope as any).icon
                const isActive = searchScope === scope.key
                return (
                  <button
                    key={scope.key}
                    type="button"
                    onClick={() => setSearchScope(scope.key)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-primary-600 text-white font-bold shadow-sm'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                  >
                    {IconComp && <IconComp className="w-3 h-3 opacity-90" />}
                    <span>{scope.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Row 2: Media and Content Type Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] font-medium text-gray-400 no-scrollbar">
              {(
                [
                  { key: 'all', label: 'همه پیام‌ها' },
                  { key: 'media', label: 'Media', icon: Image },
                  { key: 'links', label: 'Links', icon: Link2 },
                  { key: 'files', label: 'Files', icon: FileText },
                  { key: 'audio', label: 'Music', icon: Music },
                  { key: 'voice', label: 'Voice', icon: Mic },
                ] as const
              ).map((filter) => {
                const IconComp = (filter as any).icon
                const isActive = searchFilter === filter.key
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setSearchFilter(filter.key)}
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer text-[10.5px] ${
                      isActive
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold shadow-sm'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300'
                    }`}
                  >
                    {IconComp && <IconComp className="w-3 h-3 opacity-80" />}
                    <span>{filter.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Active Date Filter Indicator Badge */}
            {searchDateFilter !== 'all' && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {searchDateFilter === 'today'
                      ? '۲۴ ساعت گذشته'
                      : searchDateFilter === 'week'
                      ? '۷ روز گذشته'
                      : searchDateFilter === 'month'
                      ? '۳۰ روز گذشته'
                      : `تاریخ: ${customDate}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchDateFilter('all')
                      setCustomDate('')
                    }}
                    className="hover:text-white cursor-pointer ml-1"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Searches Overlay Popover */}
        {isSearchFocused && !searchQuery && recentSearches.length > 0 && (
          <div className="absolute left-2.5 right-2.5 top-full z-40 mt-1 bg-dark-900 border border-white/10 rounded-2xl shadow-2xl p-2.5 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold px-1">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-primary-400" />
                <span>{t('search.recent')}</span>
              </span>
              <button
                type="button"
                onClick={clearRecentSearches}
                className="text-accent-rose hover:underline text-[10px] cursor-pointer"
              >
                {t('search.clear_all')}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentSearches.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSearchChange(item)}
                  className="px-2.5 py-1 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 text-xs flex items-center gap-1.5 border border-white/5 transition-colors cursor-pointer"
                >
                  <span>{item}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Stories Strip */}
      {!searchQuery.trim() && account?.status === 'connected' && (
        <div className="shrink-0 border-b border-white/5 px-2 pt-2 pb-2">
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {t('stories.title')}
            </span>
            {activeStoryPeers.length > 0 && (
              <span className="text-[10px] font-mono text-gray-500">
                {formatNumber(activeStoryPeers.length)}
              </span>
            )}
          </div>
          <div className="flex items-start gap-2.5 overflow-x-auto pb-2.5 smooth-scroll-physics">
            <button
              type="button"
              onClick={() => setIsStoryComposerOpen(true)}
              title={t('stories.add')}
              aria-label={t('stories.add')}
              className="w-16 shrink-0 flex flex-col items-center gap-1.5 cursor-pointer group"
            >
              <div className="rounded-[14px] p-[2px] bg-gradient-to-tr from-primary-500/60 via-fuchsia-500/45 to-amber-400/45 transition-transform group-hover:scale-[1.03]">
                <div className="rounded-[12px] bg-dark-850 p-[1.5px]">
                  <div className="w-8 h-8 rounded-xl bg-[#0e1621] flex items-center justify-center text-primary-400 group-hover:text-white group-hover:bg-primary-500/20 transition-colors">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <span className="text-[10px] leading-4 text-gray-300 truncate w-full text-center">
                {t('stories.add')}
              </span>
            </button>
            {activeStoryPeers.map((peer) => (
              <button
                key={peer.peerId}
                type="button"
                onClick={() =>
                  handleOpenStory(peer.peerId, peer.isSelf ? t('stories.mine') : peer.title)
                }
                title={
                  peer.hasUnread
                    ? t('stories.new_count', { count: formatNumber(peer.storyCount) })
                    : t('stories.count', { count: formatNumber(peer.storyCount) })
                }
                className="w-16 shrink-0 flex flex-col items-center gap-1.5 cursor-pointer group"
              >
                <div
                  className={`rounded-[14px] p-[2px] transition-transform group-hover:scale-[1.03] ${
                    peer.hasUnread || peer.isSelf
                      ? 'bg-gradient-to-tr from-primary-500 via-fuchsia-500 to-amber-400'
                      : 'bg-white/15'
                  }`}
                >
                  <div className="rounded-[12px] bg-dark-850 p-[1.5px]">
                    <Avatar
                      accountId={account?.id}
                      peerId={peer.peerId}
                      title={peer.title}
                      size="sm"
                    />
                  </div>
                </div>
                <span className="text-[10px] leading-4 text-gray-300 truncate w-full text-center">
                  {peer.isSelf ? t('stories.mine') : peer.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PV Filter Toggle (All / Contacts / Non-Contacts) in Users Tab */}
      {activeTab === 'users' && !searchQuery.trim() && (
        <div className="shrink-0 px-2.5 py-1.5 bg-dark-900/60 backdrop-blur-sm border-b border-white/5 flex items-center justify-between gap-1 select-none">
          <div className="flex items-center gap-1 p-0.5 bg-dark-800/80 rounded-xl border border-white/5 w-full">
            <button
              type="button"
              onClick={() => setPvFilter('all')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer relative ${
                pvFilter === 'all'
                  ? 'text-primary-400 bg-primary-500/15 border border-primary-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>{t('pv.all')}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-dark-750/80 text-gray-400">
                {formatNumber(userDialogs.length)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPvFilter('contacts')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer relative ${
                pvFilter === 'contacts'
                  ? 'text-teal-400 bg-teal-500/15 border border-teal-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>{t('pv.contacts')}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-dark-750/80 text-gray-400">
                {formatNumber(contactsCount)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPvFilter('non_contacts')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer relative ${
                pvFilter === 'non_contacts'
                  ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <UserX className="w-3.5 h-3.5 shrink-0" />
              <span>{t('pv.non_contacts')}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-dark-750/80 text-gray-400">
                {formatNumber(nonContactsCount)}
              </span>
              {nonContactsUnread > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Chat List Viewport */}
      <div
        role="listbox"
        aria-label={t('app.all_chats') || 'Chat Conversations'}
        onScroll={(e) => {
          const el = e.currentTarget
          if (
            !searchQuery.trim() &&
            (el.scrollTop + el.clientHeight >= el.scrollHeight - 500 ||
             el.scrollTop + el.clientHeight >= el.scrollHeight - 180)
          ) {
            onLoadMoreDialogs?.()
          }
        }}
        className="flex-1 overflow-y-auto min-h-0 focus-visible:outline-none smooth-scroll-physics"
      >
        {/* If user is searching and has results */}
        {searchQuery.trim().length > 0 ? (
          <div className="space-y-3 p-1.5">
            {/* 1. Matching Chats & Contacts (Local + Server MyPeers) */}
            {chatsAndContacts.length > 0 && (
              <div>
                <div className="px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-primary-400" />
                    <span>{t('search.all_chats')}</span>
                  </span>
                  <span className="text-[10px] font-normal text-gray-400 font-mono">
                    {formatNumber(chatsAndContacts.length)}
                  </span>
                </div>
                {chatsAndContacts.map((dialog) => (
                  <DialogListItem
                    key={dialog.id}
                    dialog={dialog}
                    isSelected={activeChatId === dialog.id}
                    showChatId={showChatId}
                    formatTime={formatTime}
                    formatNumber={formatNumber}
                    t={t}
                    onSelect={handleSelectDialog}
                    story={storyPeerMap.get(dialog.id)}
                    onOpenStory={handleOpenStory}
                  />
                ))}
              </div>
            )}

            {/* 2. Global Public Channels & Users (Contacts.Search) */}
            {globalPeers.length > 0 && (
              <div>
                <div className="px-3 py-1 text-[11px] font-bold text-accent-cyan uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3 h-3" />
                    <span>{t('search.public_chats')}</span>
                  </span>
                  <span className="text-[10px] font-normal text-gray-400 font-mono">
                    {formatNumber(globalPeers.length)}
                  </span>
                </div>
                {globalPeers.map((peer) => (
                  <div
                    key={`peer-${peer.id}`}
                    onClick={() => {
                      saveRecentSearch(searchQuery.trim())
                      onSelectChat(peer.id, undefined, peer)
                    }}
                    className="p-2.5 rounded-xl hover:bg-dark-800/80 cursor-pointer flex items-center gap-3 transition-colors"
                  >
                    <Avatar
                      accountId={account?.id || ''}
                      peerId={peer.id}
                      title={peer.title}
                      initials={peer.avatarInitials}
                      avatarUrl={peer.avatarUrl}
                      size="md"
                      isChannel={peer.isChannel}
                      isForum={peer.isForum}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-100 truncate">{peer.title}</span>
                        <span className="text-[10px] text-accent-cyan font-mono bg-accent-cyan/10 px-1.5 py-0.2 rounded">
                          {peer.isChannel ? 'Channel' : peer.isGroup ? 'Group' : peer.isBot ? 'Bot' : 'User'}
                        </span>
                      </div>
                      {peer.username && (
                        <div className="text-[11px] text-gray-400 font-mono truncate">@{peer.username}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. Global Messages (SearchGlobal) */}
            {globalMessages.length > 0 && (
              <div>
                <div className="px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3 text-primary-400" />
                    <span>{t('search.global_results')}</span>
                  </span>
                  <span className="text-[10px] font-normal text-gray-400 font-mono">
                    {t('search.messages_found', { count: formatNumber(globalMessages.length) })}
                  </span>
                </div>
                {globalMessages.map((msg) => {
                  const hasMedia = Boolean(msg.mediaType)
                  return (
                    <div
                      key={`gmsg-${msg.chatId}-${msg.id}`}
                      onClick={() => {
                        saveRecentSearch(searchQuery.trim())
                        onSelectChat(msg.chatId, msg.id)
                      }}
                      className="p-2.5 rounded-xl hover:bg-dark-800/80 cursor-pointer transition-colors border-b border-white/5 last:border-0"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-accent-cyan truncate">
                          {msg.chatTitle ? `${msg.chatTitle} • ${msg.senderName}` : msg.senderName}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">{formatTime(msg.date)}</span>
                      </div>

                      {/* Media Badge and Details */}
                      {hasMedia && (
                        <div className="flex items-center gap-1.5 text-[11px] text-primary-300 font-medium mb-1">
                          {msg.mediaType === 'photo' && <Image className="w-3.5 h-3.5 shrink-0 text-cyan-400" />}
                          {msg.mediaType === 'video' && <Image className="w-3.5 h-3.5 shrink-0 text-purple-400" />}
                          {msg.mediaType === 'document' && <FileText className="w-3.5 h-3.5 shrink-0 text-blue-400" />}
                          {msg.mediaType === 'audio' && <Music className="w-3.5 h-3.5 shrink-0 text-amber-400" />}
                          {msg.mediaType === 'voice' && <Mic className="w-3.5 h-3.5 shrink-0 text-emerald-400" />}
                          {msg.mediaType === 'webpage' && <Link2 className="w-3.5 h-3.5 shrink-0 text-cyan-400" />}

                          <span className="truncate">
                            {msg.mediaType === 'voice'
                              ? `Voice (${formatDuration(msg.mediaDuration)})`
                              : msg.mediaType === 'audio'
                              ? `${msg.mediaTitle || msg.mediaFileName || 'Music'} • ${msg.mediaPerformer || formatDuration(msg.mediaDuration)}`
                              : msg.mediaType === 'document'
                              ? `${msg.mediaFileName || 'File'} (${formatFileSize(msg.mediaFileSize)})`
                              : msg.mediaType === 'photo'
                              ? 'Photo'
                              : msg.mediaType === 'video'
                              ? `Video ${msg.mediaDuration ? `(${formatDuration(msg.mediaDuration)})` : ''}`
                              : 'Link'}
                          </span>
                        </div>
                      )}

                      <div className="text-[11px] text-gray-300 line-clamp-2 leading-relaxed">
                        {highlightSnippet(msg.text, searchQuery.trim())}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Empty State when searching */}
            {!isSearchingGlobal && chatsAndContacts.length === 0 && globalPeers.length === 0 && globalMessages.length === 0 && (
              <div className="p-8 text-center text-xs text-gray-400">
                {t('search.no_results', { query: searchQuery })}
              </div>
            )}

            {isSearchingGlobal && (
              <div className="p-4 text-center text-xs text-gray-400 animate-pulse">
                {t('app.search_placeholder')}
              </div>
            )}
          </div>
        ) : isLoadingDialogs && filteredDialogs.length === 0 ? (
          <div className="flex flex-col space-y-1 p-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl animate-pulse">
                <div className="w-12 h-12 rounded-full bg-white/5 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="flex justify-between items-center">
                    <div className="h-3.5 bg-white/10 rounded-md w-28" />
                    <div className="h-2.5 bg-white/5 rounded-md w-10" />
                  </div>
                  <div className="h-3 bg-white/5 rounded-md w-44" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredDialogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-gray-400 gap-2 select-none my-auto">
            <div className="w-12 h-12 rounded-2xl bg-dark-800/80 border border-white/5 flex items-center justify-center text-gray-500 mb-1">
              <MessageSquare className="w-6 h-6 text-gray-400" />
            </div>
            <span className="font-medium text-gray-300">{t('app.no_chats')}</span>
          </div>
        ) : (
          filteredDialogs.map((dialog) => (
            <DialogListItem
              key={dialog.id}
              dialog={dialog}
              isSelected={activeChatId === dialog.id}
              showChatId={showChatId}
              formatTime={formatTime}
              formatNumber={formatNumber}
              t={t}
              onSelect={handleSelectDialog}
              story={storyPeerMap.get(dialog.id)}
              onOpenStory={handleOpenStory}
            />
          ))
        )}

        {isLoadingMoreDialogs && (
          <div className="flex items-center justify-center gap-2 py-3 text-[11px] text-accent-cyan font-medium animate-in fade-in duration-150">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent-cyan" />
            <span>{t('chat.loading_more')}</span>
          </div>
        )}
      </div>

      {viewingStoryPeer && account && (
        <React.Suspense fallback={null}>
          <StoryViewerModal
            isOpen={!!viewingStoryPeer}
            onClose={handleCloseStoryViewer}
            accountId={account.id}
            peerId={viewingStoryPeer.id}
            peerTitle={viewingStoryPeer.title}
            ghostMode={ghostMode}
            onDeleted={handleStoryPosted}
          />
        </React.Suspense>
      )}

      {isStoryComposerOpen && account && (
        <React.Suspense fallback={null}>
          <StoryComposerModal
            isOpen={isStoryComposerOpen}
            onClose={() => setIsStoryComposerOpen(false)}
            accountId={account.id}
            isPremium={Boolean(account.isPremium)}
            onPosted={handleStoryPosted}
          />
        </React.Suspense>
      )}
    </div>
  )
})

const stickerThumbCache = new Map<string, string>()

const StickerMiniThumbnail: React.FC<{ dialog: DialogItem }> = React.memo(({ dialog }) => {
  const initialThumb =
    dialog.lastMessageThumb ||
    (dialog.lastMessageSticker?.id ? stickerThumbCache.get(dialog.lastMessageSticker.id) : undefined)
  const [thumb, setThumb] = useState<string | undefined>(initialThumb)

  useEffect(() => {
    if (dialog.lastMessageThumb) {
      setThumb(dialog.lastMessageThumb)
      if (dialog.lastMessageSticker?.id) {
        stickerThumbCache.set(dialog.lastMessageSticker.id, dialog.lastMessageThumb)
      }
      return
    }

    const st = dialog.lastMessageSticker
    if (!st?.id || !window.guidegram?.getStickerData) return

    const cached = stickerThumbCache.get(st.id)
    if (cached) {
      setThumb(cached)
      return
    }

    let isMounted = true
    window.guidegram
      .getStickerData(dialog.accountId, st.id, st.accessHash, st.fileReferenceHex)
      .then((res: any) => {
        if (!isMounted || !res) return
        const url = res.url || (res.format === 'image' ? res.data : undefined)
        if (url) {
          stickerThumbCache.set(st.id, url)
          setThumb(url)
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [dialog.accountId, dialog.lastMessageThumb, dialog.lastMessageSticker?.id])

  if (thumb) {
    return (
      <img
        src={thumb}
        alt={dialog.lastMessageText || 'Sticker'}
        className="w-5 h-5 object-contain shrink-0 rounded transition-transform group-hover:scale-105"
      />
    )
  }

  return (
    <span
      className="w-5 h-5 flex items-center justify-center text-xs shrink-0 select-none"
      title={dialog.lastMessageText || 'Sticker'}
    >
      {dialog.lastMessageText && /^\p{Emoji}/u.test(dialog.lastMessageText) ? dialog.lastMessageText : '🎨'}
    </span>
  )
})

interface DialogListItemProps {
  dialog: DialogItem
  isSelected: boolean
  showChatId: boolean
  formatTime: (timestamp?: number) => string
  formatNumber: (n: number) => string
  t: (key: string, params?: any) => string
  onSelect: (id: string) => void
  story?: ActiveStoryPeer
  onOpenStory: (peerId: string, title: string) => void
}

export const DialogListItem = React.memo<DialogListItemProps>(
  ({ dialog, isSelected, showChatId, formatTime, formatNumber, t, onSelect, story, onOpenStory }) => {
    return (
      <motion.div
        role="option"
        tabIndex={0}
        aria-selected={isSelected}
        aria-label={`${dialog.title}${dialog.unreadCount ? `, ${dialog.unreadCount} unread` : ''}`}
        onClick={() => onSelect(dialog.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect(dialog.id)
          }
        }}
        whileHover={{ scale: 1.006, x: 2 }}
        whileTap={{ scale: 0.982 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.8 }}
        className={`chat-virtual-item px-3 py-2.5 transition-colors cursor-pointer border-b border-white/5 relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 ${
          isSelected ? 'bg-primary-600/20' : 'hover:bg-dark-800/60'
        }`}
      >
        {/* Active Selection Accent Bar */}
        {isSelected && (
          <motion.div
            layoutId="activeChatBar"
            className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary-400 shadow-glow"
            transition={{ type: 'spring', stiffness: 450, damping: 32, mass: 0.7 }}
          />
        )}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            {story ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onOpenStory(dialog.id, dialog.title)
                }}
                title={
                  story.hasUnread
                    ? t('stories.new_count', { count: formatNumber(story.storyCount) })
                    : t('stories.count', { count: formatNumber(story.storyCount) })
                }
                className={`block rounded-[18px] p-[2px] cursor-pointer transition-transform hover:scale-[1.03] active:scale-95 ${
                  story.hasUnread
                    ? 'bg-gradient-to-tr from-primary-500 via-fuchsia-500 to-amber-400'
                    : 'bg-white/15'
                }`}
              >
                <span className="block rounded-[16px] bg-dark-850 p-[1.5px]">
                  <Avatar
                    accountId={dialog.accountId}
                    peerId={dialog.id}
                    title={dialog.title}
                    initials={dialog.avatarInitials}
                    avatarUrl={dialog.avatarUrl}
                    size="md"
                    isChannel={dialog.isChannel}
                    isForum={dialog.isForum}
                  />
                </span>
              </button>
            ) : (
              <Avatar
                accountId={dialog.accountId}
                peerId={dialog.id}
                title={dialog.title}
                initials={dialog.avatarInitials}
                avatarUrl={dialog.avatarUrl}
                size="md"
                isChannel={dialog.isChannel}
                isForum={dialog.isForum}
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                {dialog.isSecretChat && (
                  <Lock className="w-3 h-3 text-accent-emerald shrink-0" />
                )}
                <span className={`text-xs font-bold truncate ${dialog.isSecretChat ? 'text-accent-emerald' : 'text-gray-100'}`}>
                  {dialog.title}
                </span>
                {dialog.customEmojiStatusId ? (
                  <CustomEmojiView
                    accountId={dialog.accountId}
                    documentId={dialog.customEmojiStatusId}
                    fallback="⭐"
                    className="inline-block w-3.5 h-3.5 object-contain shrink-0"
                  />
                ) : dialog.isPremium ? (
                  <Sparkles className="w-3.5 h-3.5 text-accent-cyan fill-accent-cyan shrink-0" />
                ) : null}
                {dialog.isPinned && (
                  <Pin className="w-3 h-3 text-primary-400 fill-current shrink-0" />
                )}
              </div>
              <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                {formatTime(dialog.lastMessageDate)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-1">
              <div className="text-[11px] text-gray-400 truncate flex-1 leading-snug flex items-center gap-1.5 min-w-0">
                {dialog.draft?.text ? (
                  <>
                    <span className="text-red-400 font-semibold mr-1 shrink-0">{t('chat.draft') || 'Draft:'}</span>
                    <span className="text-gray-300 truncate">{dialog.draft.text}</span>
                  </>
                ) : (
                  <>
                    {dialog.lastMessageIsOutgoing && (
                      <span className="inline-flex items-center shrink-0">
                        {dialog.lastMessageRead ? (
                          <span title="Read"><CheckCheck className="w-3.5 h-3.5 text-accent-cyan" /></span>
                        ) : (
                          <span title="Sent"><Check className="w-3.5 h-3.5 text-gray-400" /></span>
                        )}
                      </span>
                    )}

                    {dialog.lastMessageMediaType === 'sticker' ? (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <StickerMiniThumbnail dialog={dialog} />
                        <span className="truncate font-persian text-gray-400" dir="auto">
                          {t('chat.sticker') || 'Sticker'}
                        </span>
                      </div>
                    ) : (
                      <>
                        {dialog.lastMessageThumb && (
                          <img
                            src={dialog.lastMessageThumb}
                            alt=""
                            className="w-4 h-4 rounded object-cover shrink-0 border border-white/10"
                          />
                        )}

                        <span className="truncate font-persian" dir="auto">
                          {dialog.lastMessageText || '...'}
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {showChatId && (
                  <span
                    title="Telegram Chat ID"
                    className="text-[9px] text-gray-400 font-mono bg-dark-900/60 px-1 py-0.2 rounded border border-white/5 hidden group-hover:inline-block"
                  >
                    #{dialog.id}
                  </span>
                )}
                {dialog.unreadMentionsCount && dialog.unreadMentionsCount > 0 ? (
                  <span
                    title={`${dialog.unreadMentionsCount} unread mentions`}
                    className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-accent-cyan text-dark-950 flex items-center justify-center font-mono shadow-sm"
                  >
                    @{dialog.unreadMentionsCount > 1 ? formatNumber(dialog.unreadMentionsCount) : ''}
                  </span>
                ) : null}
                {dialog.unreadCount > 0 && !dialog.lastMessageIsOutgoing && (
                  <span
                    title={
                      dialog.isMuted
                        ? t('chat.unread_muted', {
                            count: formatNumber(dialog.unreadCount),
                          })
                        : t('chat.unread_messages', {
                            count: formatNumber(dialog.unreadCount),
                          })
                    }
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors flex items-center justify-center min-w-[18px] text-center ${
                      isSelected
                        ? 'bg-white text-dark-900 font-bold'
                        : dialog.isMuted
                        ? 'bg-white/15 text-gray-300 border border-white/5'
                        : 'bg-primary-600 text-white shadow-sm'
                    }`}
                  >
                    <span>{formatNumber(dialog.unreadCount)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  },
  (prev, next) => {
    return (
      prev.isSelected === next.isSelected &&
      prev.showChatId === next.showChatId &&
      prev.dialog.id === next.dialog.id &&
      prev.dialog.unreadCount === next.dialog.unreadCount &&
      prev.dialog.unreadMentionsCount === next.dialog.unreadMentionsCount &&
      prev.dialog.lastMessageDate === next.dialog.lastMessageDate &&
      prev.dialog.lastMessageText === next.dialog.lastMessageText &&
      prev.dialog.lastMessageRead === next.dialog.lastMessageRead &&
      prev.dialog.lastMessageIsOutgoing === next.dialog.lastMessageIsOutgoing &&
      prev.dialog.lastMessageMediaType === next.dialog.lastMessageMediaType &&
      prev.dialog.lastMessageThumb === next.dialog.lastMessageThumb &&
      prev.dialog.lastMessageSticker?.id === next.dialog.lastMessageSticker?.id &&
      prev.dialog.draft?.text === next.dialog.draft?.text &&
      prev.dialog.avatarUrl === next.dialog.avatarUrl &&
      prev.dialog.title === next.dialog.title &&
      prev.dialog.isPinned === next.dialog.isPinned &&
      prev.dialog.isMuted === next.dialog.isMuted &&
      prev.dialog.customEmojiStatusId === next.dialog.customEmojiStatusId &&
      prev.dialog.isPremium === next.dialog.isPremium &&
      prev.onOpenStory === next.onOpenStory &&
      prev.story?.peerId === next.story?.peerId &&
      prev.story?.maxStoryId === next.story?.maxStoryId &&
      prev.story?.storyCount === next.story?.storyCount &&
      prev.story?.hasUnread === next.story?.hasUnread
    )
  }
)
