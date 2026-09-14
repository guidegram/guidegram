import React, { useState, useEffect, useCallback } from 'react'
import {
  X,
  ShieldCheck,
  Search,
  Trash2,
  Edit3,
  UserPlus,
  UserMinus,
  Ban,
  CheckCircle,
  Pin,
  Info,
  RefreshCw,
  Clock,
  ShieldAlert,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { AdminLogItem, AdminLogActionType } from '../types/telegram'
import { Avatar } from './Avatar'
import { useI18n } from '../i18n'
import { isRTL } from '../utils/textUtils'

export interface AdminLogModalProps {
  isOpen: boolean
  accountId: string
  chatId: string
  chatTitle: string
  onClose: () => void
}

type FilterTab = 'all' | 'deletions' | 'edits' | 'members' | 'bans' | 'admins' | 'info'

export const AdminLogModal: React.FC<AdminLogModalProps> = ({
  isOpen,
  accountId,
  chatId,
  chatTitle,
  onClose,
}) => {
  const { t } = useI18n()
  const [events, setEvents] = useState<AdminLogItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [hasMore, setHasMore] = useState(false)

  const fetchLog = useCallback(
    async (query = '') => {
      if (!accountId || !chatId) return
      setIsLoading(true)
      try {
        if (window.guidegram?.getAdminLog) {
          const res = await window.guidegram.getAdminLog(accountId, chatId, query, 50)
          if (res && Array.isArray(res.events)) {
            setEvents(res.events)
            setHasMore(res.hasMore)
          }
        }
      } catch (err) {
        console.warn('[AdminLog] Failed to fetch:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [accountId, chatId]
  )

  useEffect(() => {
    if (isOpen) {
      fetchLog('')
    } else {
      setEvents([])
      setSearchQuery('')
      setActiveTab('all')
    }
  }, [isOpen, fetchLog])

  if (!isOpen) return null

  const filteredEvents = events.filter((ev) => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = ev.userName?.toLowerCase().includes(q)
      const matchTitle = ev.actionTitle?.toLowerCase().includes(q)
      const matchDesc = ev.actionDescription?.toLowerCase().includes(q)
      const matchPrev = ev.prevValue?.toLowerCase().includes(q)
      const matchNew = ev.newValue?.toLowerCase().includes(q)
      if (!matchName && !matchTitle && !matchDesc && !matchPrev && !matchNew) return false
    }

    // Category tab filter
    if (activeTab === 'deletions') return ev.actionType === 'delete_message'
    if (activeTab === 'edits') return ev.actionType === 'edit_message'
    if (activeTab === 'members') return ev.actionType === 'join' || ev.actionType === 'leave' || ev.actionType === 'invite'
    if (activeTab === 'bans') return ev.actionType === 'ban' || ev.actionType === 'unban'
    if (activeTab === 'admins') return ev.actionType === 'admin_change'
    if (activeTab === 'info') return ev.actionType === 'change_info' || ev.actionType === 'pin_message'

    return true
  })

  const getActionBadge = (actionType: AdminLogActionType) => {
    switch (actionType) {
      case 'delete_message':
        return {
          icon: <Trash2 className="w-3.5 h-3.5 text-accent-rose" />,
          bg: 'bg-accent-rose/15 text-accent-rose border-accent-rose/30',
          label: 'Deleted',
        }
      case 'edit_message':
        return {
          icon: <Edit3 className="w-3.5 h-3.5 text-accent-cyan" />,
          bg: 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30',
          label: 'Edited',
        }
      case 'join':
        return {
          icon: <UserPlus className="w-3.5 h-3.5 text-accent-emerald" />,
          bg: 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30',
          label: 'Joined',
        }
      case 'leave':
        return {
          icon: <UserMinus className="w-3.5 h-3.5 text-gray-400" />,
          bg: 'bg-white/10 text-gray-400 border-white/15',
          label: 'Left',
        }
      case 'invite':
        return {
          icon: <UserPlus className="w-3.5 h-3.5 text-primary-400" />,
          bg: 'bg-primary-500/15 text-primary-400 border-primary-500/30',
          label: 'Invited',
        }
      case 'ban':
        return {
          icon: <Ban className="w-3.5 h-3.5 text-rose-400" />,
          bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          label: 'Banned',
        }
      case 'unban':
        return {
          icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          label: 'Unbanned',
        }
      case 'admin_change':
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5 text-accent-amber" />,
          bg: 'bg-accent-amber/15 text-accent-amber border-accent-amber/30',
          label: 'Permissions',
        }
      case 'pin_message':
        return {
          icon: <Pin className="w-3.5 h-3.5 text-accent-violet" />,
          bg: 'bg-accent-violet/15 text-accent-violet border-accent-violet/30',
          label: 'Pinned',
        }
      case 'change_info':
        return {
          icon: <Info className="w-3.5 h-3.5 text-blue-400" />,
          bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
          label: 'Settings',
        }
      default:
        return {
          icon: <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />,
          bg: 'bg-white/10 text-gray-300 border-white/10',
          label: 'Action',
        }
    }
  }

  const formatEventDate = (timestamp: number) => {
    if (!timestamp) return ''
    const d = new Date(timestamp * 1000)
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    const day = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return `${day}, ${hours}:${minutes}`
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-2xl h-[740px] max-h-[92vh] bg-dark-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-dark-850/90 border-b border-white/10 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-amber/20 border border-accent-amber/30 flex items-center justify-center text-accent-amber shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">{t('admin_log.title') || 'Recent Actions'}</h3>
                <span className="text-[11px] font-medium text-gray-400 truncate max-w-[200px]">
                  ({chatTitle})
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {t('admin_log.subtitle') || 'Audit moderation and admin activity'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fetchLog(searchQuery)}
              disabled={isLoading}
              title="Refresh log"
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-accent-amber' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="px-5 py-3 bg-dark-850/50 border-b border-white/5 flex flex-col gap-2.5 shrink-0">
          {/* Search Input */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('admin_log.search') || 'Search events by admin, user, or text...'}
              className="w-full bg-dark-750 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-amber/50 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-gray-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'all', label: t('admin_log.filter_all') || 'All Events' },
              { id: 'deletions', label: t('admin_log.filter_deletions') || 'Deletions' },
              { id: 'edits', label: t('admin_log.filter_edits') || 'Edits' },
              { id: 'members', label: t('admin_log.filter_members') || 'Members' },
              { id: 'bans', label: t('admin_log.filter_bans') || 'Restrictions' },
              { id: 'admins', label: t('admin_log.filter_admins') || 'Admins' },
              { id: 'info', label: t('admin_log.filter_info') || 'Settings' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as FilterTab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-accent-amber/20 text-accent-amber border border-accent-amber/35 shadow-xs'
                    : 'bg-dark-750 hover:bg-dark-700 text-gray-400 hover:text-gray-200 border border-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Events Timeline List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading && events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
              <div className="w-8 h-8 border-2 border-accent-amber border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Loading recent administrative actions...</span>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500 select-none">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-400">
                <ShieldCheck className="w-6 h-6 opacity-60" />
              </div>
              <span className="text-xs font-semibold text-gray-300">
                {t('admin_log.empty') || 'No administrative actions recorded.'}
              </span>
              <span className="text-[11px] text-gray-500 max-w-xs text-center">
                Events like deleted messages, member bans, and permission changes will appear here.
              </span>
            </div>
          ) : (
            filteredEvents.map((ev) => {
              const badge = getActionBadge(ev.actionType)
              const isRtlText = isRTL(ev.actionDescription || ev.actionTitle)

              return (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-2xl bg-dark-850/80 hover:bg-dark-850 border border-white/5 flex flex-col gap-2.5 transition-all shadow-xs"
                >
                  {/* Event Top Bar: Admin user info + badge + timestamp */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        accountId={accountId}
                        peerId={ev.userId}
                        title={ev.userName}
                        initials={(ev.userName || 'U').substring(0, 2).toUpperCase()}
                        avatarUrl={ev.userAvatarUrl}
                        size="sm"
                        className="shrink-0"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white truncate max-w-[220px]">
                          {ev.userName}
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{formatEventDate(ev.date)}</span>
                        </span>
                      </div>
                    </div>

                    <div
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold border shrink-0 ${badge.bg}`}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </div>
                  </div>

                  {/* Action Title & Details */}
                  <div className="pl-9 flex flex-col gap-1">
                    <div className="text-xs font-semibold text-gray-200">{ev.actionTitle}</div>
                    {ev.actionDescription && (
                      <div
                        dir={isRtlText ? 'rtl' : 'ltr'}
                        className={`text-xs text-gray-400 bg-black/25 rounded-xl p-2.5 border border-white/5 whitespace-pre-wrap break-words leading-relaxed select-text ${
                          isRtlText ? 'text-right' : 'text-left'
                        }`}
                      >
                        {ev.actionDescription}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-dark-850/90 border-t border-white/10 flex items-center justify-between shrink-0 select-none text-xs text-gray-400">
          <span>
            {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            {t('common.cancel') || 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminLogModal
