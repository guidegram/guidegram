import React, { useState, useEffect, useRef } from 'react'
import { Search, Pin, ShieldCheck, X, Clock, Trash2, Globe, MessageSquare, Radio, Users, User, Archive, RefreshCw } from 'lucide-react'
import { DialogItem, AccountInfo, MessageItem, CloudFolderItem } from '../types/telegram'
import { TabCategory } from './ChatTabs'
import { Avatar } from './Avatar'
import { isRTL } from '../utils/textUtils'
import { CustomEmojiView } from './ChatViewport'
import { StoryViewerModal } from './StoryViewerModal'
import { useI18n } from '../i18n'

interface ChatListProps {
  account: AccountInfo | null
  dialogs: DialogItem[]
  activeChatId: string | null
  activeTab: TabCategory
  searchQuery: string
  showChatId?: boolean
  ghostMode?: boolean
  cloudFolders?: CloudFolderItem[]
  isLoadingMoreDialogs?: boolean
  onSearchChange: (query: string) => void
  onSelectChat: (chatId: string) => void
  onSelectPeer?: (target: string) => void
  onLoadMoreDialogs?: () => void
}

type SearchFilterCategory = 'all' | 'channels' | 'groups' | 'private' | 'archive'

export const ChatList: React.FC<ChatListProps> = ({
  account,
  dialogs,
  activeChatId,
  activeTab,
  searchQuery,
  showChatId = true,
  ghostMode = false,
  cloudFolders,
  isLoadingMoreDialogs = false,
  onSearchChange,
  onSelectChat,
  onSelectPeer,
  onLoadMoreDialogs,
}) => {
  const { t, isRTL: isAppRtl, formatNumber, formatSendersCount } = useI18n()
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [searchFilter, setSearchFilter] = useState<SearchFilterCategory>('all')
  const [globalPeers, setGlobalPeers] = useState<DialogItem[]>([])
  const [globalMessages, setGlobalMessages] = useState<MessageItem[]>([])
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false)
  const [viewingStoryPeer, setViewingStoryPeer] = useState<{ id: string; title: string } | null>(null)

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

  const clearRecentSearches = () => {
    setRecentSearches([])
    try {
      localStorage.removeItem('guidegram_recent_searches')
    } catch (_) {}
  }

  // Filter local dialogs based on active tab & search query
  const cleanQuery = searchQuery.trim().toLowerCase().replace(/^@/, '')
  const filteredDialogs = dialogs.filter((dialog) => {
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
      // In search mode, apply search filter category
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
    if (activeTab === 'users' && !dialog.isUser) return false
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
          if ((folder.contacts || folder.nonContacts) && dialog.isUser && !dialog.isBot) {
            matched = true
          }
          if (!matched) return false
        }
      }
    }

    return true
  })

  // Debounced Telegram MTProto Global Search
  const searchTimeoutRef = useRef<any>(null)
  useEffect(() => {
    if (!searchQuery.trim() || !account?.id) {
      setGlobalPeers([])
      setGlobalMessages([])
      setIsSearchingGlobal(false)
      return
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    setIsSearchingGlobal(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const query = searchQuery.trim()
        const [peersRes, msgsRes] = await Promise.all([
          window.guidegram?.searchPublicPeers?.(account.id, query),
          window.guidegram?.searchGlobal?.(
            account.id,
            query,
            searchFilter === 'all' ? undefined : searchFilter
          ),
        ])

        // Filter out peers already in local dialogs
        const existingIds = new Set(dialogs.map((d) => d.id))
        const uniquePeers = (peersRes || []).filter((p) => !existingIds.has(p.id))

        setGlobalPeers(uniquePeers)
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
  }, [searchQuery, searchFilter, account?.id, dialogs])

  // Format time (e.g. 14:20 or Yesterday)
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
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
              accountId={account.id}
              peerId={account.id}
              title={account.firstName || 'User'}
              initials={(account.firstName || 'U').charAt(0)}
              avatarUrl={account.avatarUrl}
              size="sm"
            />
            <div className="truncate">
              <div className="text-xs font-bold text-gray-200 truncate">
                {account.firstName || 'User'} {account.lastName || ''}
              </div>
              <div className="text-[11px] text-gray-400 truncate">{account.phone || ''}</div>
            </div>
          </div>

          {account.proxyConfig?.enabled && (
            <div
              title={`Protected by ${account.proxyConfig.type.toUpperCase()} Proxy`}
              className="flex items-center gap-1 bg-accent-cyan/10 text-accent-cyan px-2 py-0.5 rounded-lg text-[10px] font-semibold border border-accent-cyan/20 shrink-0"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Proxy</span>
            </div>
          )}
        </div>
      )}

      {/* Search Input with Clear button and Recent Searches */}
      <div className="p-2.5 shrink-0 relative">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
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
            className="w-full bg-dark-800 border border-white/5 rounded-xl pl-9 pr-8 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50 transition-colors"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              title={t('app.cancel')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Global Search Filter Pills (Telegram Desktop style) */}
        {searchQuery.trim().length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 text-[11px] font-medium text-gray-400">
            {(
              [
                { key: 'all', label: t('search.all_chats') },
                { key: 'channels', label: t('search.channels') },
                { key: 'groups', label: t('search.group_chats') },
                { key: 'private', label: t('search.private_chats') },
                { key: 'archive', label: t('search.archive') },
              ] as const
            ).map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setSearchFilter(filter.key)}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  searchFilter === filter.key
                    ? 'bg-primary-600/90 text-white font-semibold'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                {filter.label}
              </button>
            ))}
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

      {/* Chat List Viewport */}
      <div
        onScroll={(e) => {
          const el = e.currentTarget
          if (
            !searchQuery.trim() &&
            el.scrollTop + el.clientHeight >= el.scrollHeight - 180
          ) {
            onLoadMoreDialogs?.()
          }
        }}
        className="flex-1 overflow-y-auto min-h-0"
      >
        {/* If user is searching and has results */}
        {searchQuery.trim().length > 0 ? (
          <div className="space-y-3 p-1.5">
            {/* 1. Matching Local Chats */}
            {filteredDialogs.length > 0 && (
              <div>
                <div className="px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {t('search.all_chats')}
                </div>
                {filteredDialogs.map((dialog) => renderDialogItem(dialog))}
              </div>
            )}

            {/* 2. Global Public Channels & Users (Contacts.Search) */}
            {globalPeers.length > 0 && (
              <div>
                <div className="px-3 py-1 text-[11px] font-bold text-accent-cyan uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3 h-3" />
                  <span>{t('search.public_chats')}</span>
                </div>
                {globalPeers.map((peer) => (
                  <div
                    key={`peer-${peer.id}`}
                    onClick={() => {
                      saveRecentSearch(searchQuery.trim())
                      if (onSelectPeer && peer.username) {
                        onSelectPeer(peer.username)
                      } else {
                        onSelectChat(peer.id)
                      }
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
                {globalMessages.map((msg) => (
                  <div
                    key={`gmsg-${msg.chatId}-${msg.id}`}
                    onClick={() => {
                      saveRecentSearch(searchQuery.trim())
                      onSelectChat(msg.chatId)
                    }}
                    className="p-2.5 rounded-xl hover:bg-dark-800/80 cursor-pointer transition-colors border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-accent-cyan truncate">{msg.senderName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{formatTime(msg.date)}</span>
                    </div>
                    <div className="text-[11px] text-gray-300 line-clamp-2 leading-relaxed">
                      {highlightSnippet(msg.text, searchQuery.trim())}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State when searching */}
            {!isSearchingGlobal && filteredDialogs.length === 0 && globalPeers.length === 0 && globalMessages.length === 0 && (
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
        ) : filteredDialogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">{t('app.no_chats')}</div>
        ) : (
          filteredDialogs.map((dialog) => renderDialogItem(dialog))
        )}

        {isLoadingMoreDialogs && (
          <div className="flex items-center justify-center gap-2 py-3 text-[11px] text-accent-cyan font-medium animate-in fade-in duration-150">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent-cyan" />
            <span>{t('chat.loading_more')}</span>
          </div>
        )}
      </div>

      {viewingStoryPeer && account && (
        <StoryViewerModal
          isOpen={!!viewingStoryPeer}
          onClose={() => setViewingStoryPeer(null)}
          accountId={account.id}
          peerId={viewingStoryPeer.id}
          peerTitle={viewingStoryPeer.title}
          ghostMode={ghostMode}
        />
      )}
    </div>
  )

  function renderDialogItem(dialog: DialogItem) {
    const isSelected = activeChatId === dialog.id

    return (
      <div
        key={dialog.id}
        onClick={() => {
          if (searchQuery.trim()) saveRecentSearch(searchQuery.trim())
          onSelectChat(dialog.id)
        }}
        className={`px-3 py-2.5 transition-colors cursor-pointer border-b border-white/5 relative group ${
          isSelected ? 'bg-primary-600/20' : 'hover:bg-dark-800/60'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`relative shrink-0 ${
              dialog.isUser && !dialog.isBot
                ? 'p-0.5 rounded-full ring-2 ring-primary-500/70 hover:ring-accent-violet transition-all cursor-pointer'
                : ''
            }`}
            onClick={(e) => {
              if (dialog.isUser && !dialog.isBot) {
                e.stopPropagation()
                setViewingStoryPeer({ id: dialog.id, title: dialog.title })
              }
            }}
            title={dialog.isUser && !dialog.isBot ? 'View Stories (Stealth Mode)' : undefined}
          >
            <Avatar
              accountId={dialog.accountId}
              peerId={dialog.id}
              title={dialog.title}
              initials={dialog.avatarInitials}
              avatarUrl={dialog.avatarUrl}
              size="md"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                <span className="text-xs font-bold text-gray-100 truncate">{dialog.title}</span>
                {dialog.customEmojiStatusId && (
                  <CustomEmojiView
                    accountId={dialog.accountId}
                    documentId={dialog.customEmojiStatusId}
                    className="inline-block w-3.5 h-3.5 object-contain shrink-0"
                  />
                )}
                {dialog.isPinned && (
                  <Pin className="w-3 h-3 text-primary-400 fill-current shrink-0" />
                )}
              </div>
              <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                {formatTime(dialog.lastMessageDate)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-1">
              <div className="text-[11px] text-gray-400 truncate flex-1 leading-snug">
                {dialog.lastMessageText || '...'}
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
                {dialog.unreadCount > 0 && (
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
      </div>
    )
  }
}
