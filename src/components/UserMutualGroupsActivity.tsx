import React, { useState, useEffect } from 'react'
import {
  Users,
  MessageSquare,
  Clock,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  Image,
  Mic,
  Video,
  Hash,
  AlertCircle,
} from 'lucide-react'
import { Avatar } from './Avatar'
import { MessageItem } from '../types/telegram'
import { useI18n } from '../i18n'

interface CommonGroupItem {
  id: string
  title: string
  avatarUrl?: string
  memberCount?: number
  username?: string
}

interface UserMutualGroupsActivityProps {
  accountId: string
  userId: string
  userName: string
  currentChatId?: string | null
  onJumpToMessage: (chatId: string, messageId: number) => void
}

function parseTimestamp(timestamp: number | Date): Date {
  if (timestamp instanceof Date) return timestamp
  const ts = typeof timestamp === 'number' ? (timestamp < 1e11 ? timestamp * 1000 : timestamp) : Date.now()
  return new Date(ts)
}

function formatClockTime(timestamp: number | Date, locale: string): string {
  const d = parseTimestamp(timestamp)
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

function formatDate(timestamp: number | Date, locale: string): string {
  const d = parseTimestamp(timestamp)
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}


export const UserMutualGroupsActivity: React.FC<UserMutualGroupsActivityProps> = ({
  accountId,
  userId,
  userName,
  currentChatId,
  onJumpToMessage,
}) => {
  const { t, formatNumber, language } = useI18n()
  const locale = language === 'fa' ? 'fa-IR' : 'en-US'
  const [groups, setGroups] = useState<CommonGroupItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [groupMessages, setGroupMessages] = useState<Record<string, MessageItem[]>>({})
  const [loadingGroupMsgs, setLoadingGroupMsgs] = useState<Record<string, boolean>>({})
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({})

  // Load common chats from MTProto
  const loadCommonChats = async () => {
    setIsLoading(true)
    try {
      let list: CommonGroupItem[] = []
      if (window.guidegram?.getCommonChats) {
        list = await window.guidegram.getCommonChats(accountId, userId, 50)
      }

      // If current chat is a group and not yet in list, ensure it appears
      if (currentChatId && !list.some((g) => g.id === currentChatId)) {
        if (window.guidegram?.getChatDetails) {
          try {
            const curDetails = await window.guidegram.getChatDetails(accountId, currentChatId)
            if (curDetails && (curDetails.isGroup || curDetails.isChannel)) {
              list.unshift({
                id: currentChatId,
                title: curDetails.title || t('mutual_groups.current_group'),
                avatarUrl: curDetails.avatarUrl,
                memberCount: curDetails.participantsCount,
                username: curDetails.username,
              })
            }
          } catch (_) {}
        }
      }

      setGroups(list)

      // Auto-load messages for the first group or currentChatId
      const primaryGroup = list.find((g) => g.id === currentChatId) || list[0]
      if (primaryGroup) {
        setSelectedGroupId(primaryGroup.id)
        loadMessagesForGroup(primaryGroup.id)
      }
    } catch (err) {
      console.warn('[UserMutualGroupsActivity] Failed to fetch common chats:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (accountId && userId) {
      loadCommonChats()
    }
  }, [accountId, userId, currentChatId])

  // Load user messages in a specific mutual group
  const loadMessagesForGroup = async (groupId: string) => {
    if (groupMessages[groupId] || loadingGroupMsgs[groupId]) return
    if (!window.guidegram?.searchMessages) return

    setLoadingGroupMsgs((prev) => ({ ...prev, [groupId]: true }))
    try {
      const msgs = await window.guidegram.searchMessages(accountId, groupId, '', {
        fromId: userId,
        limit: 25,
      })
      if (msgs) {
        setGroupMessages((prev) => ({ ...prev, [groupId]: msgs }))
        const count = (msgs as any).totalCount !== undefined ? (msgs as any).totalCount : msgs.length
        setMessageCounts((prev) => ({ ...prev, [groupId]: count }))
      }
    } catch (err) {
      console.warn('[UserMutualGroupsActivity] Failed to load messages for group:', groupId, err)
    } finally {
      setLoadingGroupMsgs((prev) => ({ ...prev, [groupId]: false }))
    }
  }

  const handleToggleGroup = (groupId: string) => {
    if (selectedGroupId === groupId) {
      setSelectedGroupId(null)
    } else {
      setSelectedGroupId(groupId)
      loadMessagesForGroup(groupId)
    }
  }

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-dark-850 via-dark-800 to-dark-900 border border-white/10 shadow-lg space-y-3 font-sans select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center border border-primary-500/30">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-100 flex items-center gap-1.5">
              <span>{t('mutual_groups.title')}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary-500/20 text-primary-300 border border-primary-500/30">
                {t('mutual_groups.groups_count', { count: formatNumber(groups.length) })}
              </span>
            </div>
            <div className="text-[10px] text-gray-400">{t('mutual_groups.subtitle')}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadCommonChats}
          title={t('mutual_groups.refresh_title')}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-accent-cyan' : ''}`} />
        </button>
      </div>

      {/* Body Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400 space-y-2">
          <RefreshCw className="w-5 h-5 animate-spin text-accent-cyan" />
          <span className="text-xs">{t('mutual_groups.fetching')}</span>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 text-gray-400">
          <Users className="w-8 h-8 text-gray-600" />
          <div className="text-xs font-semibold text-gray-300">{t('mutual_groups.no_groups_title')}</div>
          <p className="text-[11px] text-gray-500 max-w-xs">
            {t('mutual_groups.no_groups_desc')}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-0.5">
          {groups.map((group) => {
            const isExpanded = selectedGroupId === group.id
            const msgs = groupMessages[group.id] || []
            const isMsgsLoading = loadingGroupMsgs[group.id]
            const count = messageCounts[group.id]

            return (
              <div
                key={group.id}
                className="rounded-xl border border-white/5 bg-dark-900/60 overflow-hidden transition-all"
              >
                {/* Group Header Item */}
                <div
                  onClick={() => handleToggleGroup(group.id)}
                  className="p-2.5 flex items-center justify-between hover:bg-white/[0.03] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      accountId={accountId}
                      peerId={group.id}
                      title={group.title}
                      avatarUrl={group.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-200 truncate flex items-center gap-1.5">
                        <span>{group.title}</span>
                        {group.id === currentChatId && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-accent-cyan/20 text-accent-cyan font-normal">
                            {t('mutual_groups.current_badge')}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2">
                        {group.memberCount && (
                          <span>{t('mutual_groups.members_count', { count: formatNumber(group.memberCount) })}</span>
                        )}
                        {count !== undefined ? (
                          <span className="text-accent-cyan font-medium">
                            {t('mutual_groups.user_messages', { count: formatNumber(count) })}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 text-gray-400">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-accent-cyan" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>

                {/* Expanded Messages List with Jump Buttons */}
                {isExpanded && (
                  <div className="border-t border-white/5 bg-dark-950/60 p-2.5 space-y-2">
                    {isMsgsLoading ? (
                      <div className="flex items-center justify-center py-4 gap-2 text-xs text-gray-400">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent-cyan" />
                        <span>{t('mutual_groups.searching_messages')}</span>
                      </div>
                    ) : msgs.length === 0 ? (
                      <div className="text-center py-3 text-[11px] text-gray-500">
                        {t('mutual_groups.no_messages')}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="text-[10px] text-gray-400 font-semibold px-1 flex items-center justify-between">
                          <span>{t('mutual_groups.latest_messages', { count: formatNumber(msgs.length) })}</span>
                        </div>

                        {msgs.map((m) => {
                          const previewText = m.text || (m.mediaType ? `[${m.mediaType}]` : t('mutual_groups.message_fallback'))
                          const msgDate = m.date ? formatDate(m.date, locale) : ''
                          const msgTime = m.date ? formatClockTime(m.date, locale) : ''

                          return (
                            <div
                              key={m.id}
                              className="p-2 rounded-lg bg-dark-900/90 border border-white/5 hover:border-accent-cyan/30 flex items-center justify-between gap-3 group transition-all"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-gray-200 line-clamp-2 leading-relaxed" dir="auto">
                                  {previewText}
                                </p>
                                <div className="text-[9px] text-gray-500 mt-1 flex items-center gap-2">
                                  <span>{msgDate}</span>
                                  <span>•</span>
                                  <span>{msgTime}</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => onJumpToMessage(group.id, m.id)}
                                title={t('mutual_groups.jump_title')}
                                className="px-2 py-1 rounded-lg bg-primary-600/30 hover:bg-primary-600 text-primary-300 hover:text-white border border-primary-500/40 text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-all cursor-pointer shadow-xs active:scale-95"
                              >
                                <span>{t('mutual_groups.jump_button')}</span>
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
