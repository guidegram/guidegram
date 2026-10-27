import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  Search,
  History,
  Users,
  UserCheck,
  UserPlus,
  Bookmark,
  Camera,
  FileText,
  AtSign,
  Radio,
  User,
  Filter,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Maximize2,
  Minimize2,
  Activity,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Clock,
  Eye,
  Check,
  Zap,
} from 'lucide-react'
import type {
  ContactChangeEvent,
  ContactChangeType,
  AccountOnlineTimelineData,
  ContactOnlineSessionItem,
  AccountOnlineTimelineUser,
} from '../types/telegram'
import { Avatar } from './Avatar'
import { useI18n } from '../i18n'

interface ContactChangesModalProps {
  isOpen: boolean
  accountId: string
  onClose: () => void
  onOpenChat?: (chatId: string, initialMeta?: any) => void
  onOpenUserProfile?: (peerId: string, initialDetails?: any) => void
  initialSelectedUserId?: string
  initialTab?: 'timeline_map' | 'profile_changes'
}

type RelationFilterType = 'all' | 'mutual' | 'my_contacts' | 'saved'
type TimelineDayRange = 'today' | 'yesterday' | '48h'

// Convert English digits to Persian digits
function toPersianDigits(num: number | string): string {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  return String(num).replace(/[0-9]/g, (w) => farsiDigits[+w])
}

function formatDurationHuman(seconds: number): string {
  if (seconds < 60) return `${toPersianDigits(Math.max(1, Math.round(seconds)))} ثانیه`
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours > 0) {
    return `${toPersianDigits(hours)} ساعت ${remainingMinutes > 0 ? `و ${toPersianDigits(remainingMinutes)} دقیقه` : ''}`
  }
  return `${toPersianDigits(minutes)} دقیقه`
}

function formatClockTime(timestamp: number): string {
  const d = new Date(timestamp * 1000)
  return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
}

function formatClockTimeWithSeconds(timestamp: number): string {
  const d = new Date(timestamp * 1000)
  return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export const ContactChangesModal: React.FC<ContactChangesModalProps> = ({
  isOpen,
  accountId,
  onClose,
  onOpenChat,
  onOpenUserProfile,
  initialSelectedUserId,
  initialTab = 'timeline_map',
}) => {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<'timeline_map' | 'profile_changes'>(initialTab)
  const [isMaximized, setIsMaximized] = useState(false)

  // Profile Changes History State
  const [events, setEvents] = useState<ContactChangeEvent[]>([])
  const [isEventsLoading, setIsEventsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [relationFilter, setRelationFilter] = useState<RelationFilterType>('all')
  const [typeFilter, setTypeFilter] = useState<ContactChangeType | 'all'>('all')

  // Lightbox preview for photos
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null)

  // Online Timeline State
  const [timelineData, setTimelineData] = useState<AccountOnlineTimelineData | null>(null)
  const [isTimelineLoading, setIsTimelineLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialSelectedUserId || null)
  const [timelineDayRange, setTimelineDayRange] = useState<TimelineDayRange>('today')
  const [zoomLevel, setZoomLevel] = useState<number>(1) // 1x to 4x
  const [timelineSearch, setTimelineSearch] = useState('')
  const [onlyOnlineFilter, setOnlyOnlineFilter] = useState(false)
  const [hoveredSession, setHoveredSession] = useState<ContactOnlineSessionItem | null>(null)

  const timelineContainerRef = useRef<HTMLDivElement>(null)

  // Load Contact Changes
  const fetchChanges = async (forceSync = false) => {
    if (!window.guidegram?.getContactChanges) return
    setIsEventsLoading(true)
    try {
      if (forceSync && window.guidegram?.syncContactsAudit) {
        await window.guidegram.syncContactsAudit(accountId)
      }
      const res = await window.guidegram.getContactChanges(accountId)
      if (res) {
        setEvents(res)
        if (res.length === 0 && !forceSync && window.guidegram?.syncContactsAudit) {
          window.guidegram
            .syncContactsAudit(accountId)
            .then((auditRes) => {
              if (auditRes && auditRes.newEventsCount > 0) {
                window.guidegram.getContactChanges(accountId).then((updated) => {
                  if (updated) setEvents(updated)
                })
              }
            })
            .catch(() => {})
        }
      }
    } catch (err) {
      console.warn('[ContactChangesModal] Failed to fetch contact changes:', err)
    } finally {
      setIsEventsLoading(false)
    }
  }

  // Load Online Timeline Data
  const fetchTimeline = async () => {
    if (!window.guidegram?.getOnlineTimeline) return
    setIsTimelineLoading(true)
    try {
      const data = await window.guidegram.getOnlineTimeline(accountId)
      if (data) {
        setTimelineData(data)
      }
    } catch (err) {
      console.warn('[ContactChangesModal] Failed to fetch online timeline:', err)
    } finally {
      setIsTimelineLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      if (initialSelectedUserId) {
        setSelectedUserId(initialSelectedUserId)
        setActiveTab('timeline_map')
      }
      fetchChanges()
      fetchTimeline()
    }
  }, [isOpen, accountId, initialSelectedUserId])

  // Real-time event listeners
  useEffect(() => {
    const unsubChanges = window.guidegram?.on?.(
      'telegram:contact-change-detected',
      (payload: any) => {
        if (payload?.event) {
          setEvents((prev) => [payload.event, ...prev.filter((e) => e.id !== payload.event.id)])
        }
      }
    )

    const unsubStatus = window.guidegram?.on?.(
      'telegram:user-status-changed',
      () => {
        // Refetch timeline when someone comes online/offline
        fetchTimeline()
      }
    )

    return () => {
      unsubChanges?.()
      unsubStatus?.()
    }
  }, [accountId])

  // =========================================================================
  // Timeline View Calculations
  // =========================================================================

  const nowSec = Math.floor(Date.now() / 1000)
  const todayMidnight = new Date().setHours(0, 0, 0, 0) / 1000
  const yesterdayMidnight = todayMidnight - 86400

  // Calculate view boundaries based on timelineDayRange
  const { viewStartSec, viewEndSec } = useMemo(() => {
    if (timelineDayRange === 'yesterday') {
      return { viewStartSec: yesterdayMidnight, viewEndSec: todayMidnight }
    }
    if (timelineDayRange === '48h') {
      return { viewStartSec: yesterdayMidnight, viewEndSec: nowSec }
    }
    // 'today' default
    return { viewStartSec: todayMidnight, viewEndSec: todayMidnight + 86400 }
  }, [timelineDayRange, todayMidnight, yesterdayMidnight, nowSec])

  const viewDurationSec = Math.max(3600, viewEndSec - viewStartSec)

  // Filter Users List for Timeline
  const filteredUsers = useMemo(() => {
    if (!timelineData?.users) return []
    let list = [...timelineData.users]

    if (onlyOnlineFilter) {
      list = list.filter((u) => u.currentStatus === 'online')
    }

    if (relationFilter === 'mutual') {
      list = list.filter((u) => u.isMutualContact === true)
    } else if (relationFilter === 'my_contacts') {
      list = list.filter((u) => u.isContact === true)
    } else if (relationFilter === 'saved') {
      list = list.filter((u) => !u.isMutualContact && !u.isContact)
    }

    if (timelineSearch.trim()) {
      const q = timelineSearch.trim().toLowerCase()
      list = list.filter(
        (u) =>
          u.userName.toLowerCase().includes(q) ||
          (u.userUsername && u.userUsername.toLowerCase().includes(q)) ||
          u.userId.includes(q)
      )
    }

    return list
  }, [timelineData?.users, onlyOnlineFilter, relationFilter, timelineSearch])

  // Filter Sessions for Timeline
  const filteredSessions = useMemo(() => {
    if (!timelineData?.sessions) return []
    let sessions = timelineData.sessions.filter(
      (s) => s.endTime >= viewStartSec && s.startTime <= viewEndSec
    )

    if (selectedUserId) {
      sessions = sessions.filter((s) => s.userId === selectedUserId)
    } else {
      // If filtering by search/relation, keep only sessions belonging to filtered users
      const validUserIds = new Set(filteredUsers.map((u) => u.userId))
      sessions = sessions.filter((s) => validUserIds.has(s.userId))
    }

    return sessions
  }, [timelineData?.sessions, viewStartSec, viewEndSec, selectedUserId, filteredUsers])

  // Selected User Object (if any)
  const selectedUserObj = useMemo(() => {
    if (!selectedUserId || !timelineData?.users) return null
    return timelineData.users.find((u) => u.userId === selectedUserId) || null
  }, [selectedUserId, timelineData?.users])

  // User's total online in current view
  const selectedUserMetrics = useMemo(() => {
    if (!selectedUserId) return null
    let totalSecs = 0
    let count = 0
    for (const sess of filteredSessions) {
      const overlapStart = Math.max(sess.startTime, viewStartSec)
      const overlapEnd = Math.min(sess.endTime, viewEndSec)
      if (overlapEnd > overlapStart) {
        totalSecs += overlapEnd - overlapStart
        count++
      }
    }
    return { totalSecs, count }
  }, [selectedUserId, filteredSessions, viewStartSec, viewEndSec])

  // Generate Hour Ruler Markers
  const hourMarkers = useMemo(() => {
    const markers = []
    const totalHours = Math.ceil(viewDurationSec / 3600)
    for (let i = 0; i <= totalHours; i++) {
      const markerSec = viewStartSec + i * 3600
      if (markerSec <= viewEndSec) {
        const d = new Date(markerSec * 1000)
        const hourStr = String(d.getHours()).padStart(2, '0')
        const posPercent = ((markerSec - viewStartSec) / viewDurationSec) * 100
        markers.push({
          hourStr: `${hourStr}:۰۰`,
          posPercent,
          markerSec,
        })
      }
    }
    return markers
  }, [viewStartSec, viewEndSec, viewDurationSec])

  // Progress of current moment in today view
  const nowPercent =
    timelineDayRange !== 'yesterday' && nowSec >= viewStartSec && nowSec <= viewEndSec
      ? ((nowSec - viewStartSec) / viewDurationSec) * 100
      : null

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(4, Number((z + 0.5).toFixed(1))))
  const handleZoomOut = () => setZoomLevel((z) => Math.max(1, Number((z - 0.5).toFixed(1))))
  const handleResetZoom = () => setZoomLevel(1)

  // Wheel zoom handler
  const handleTimelineWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault()
      if (e.deltaY < 0) {
        handleZoomIn()
      } else {
        handleZoomOut()
      }
    }
  }

  // =========================================================================
  // Profile Changes Events Filtering
  // =========================================================================

  const filteredEvents = useMemo(() => {
    let result = [...events]

    if (relationFilter === 'mutual') {
      result = result.filter((e) => e.isMutualContact === true)
    } else if (relationFilter === 'my_contacts') {
      result = result.filter((e) => e.isMyContact === true)
    } else if (relationFilter === 'saved') {
      result = result.filter((e) => !e.isMutualContact && !e.isMyContact)
    }

    if (typeFilter !== 'all') {
      if (typeFilter === 'photo_change') {
        result = result.filter(
          (e) => e.changeType === 'photo_change' || e.changeType === 'photo_delete'
        )
      } else {
        result = result.filter((e) => e.changeType === typeFilter)
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (e) =>
          (e.userName && e.userName.toLowerCase().includes(q)) ||
          (e.userUsername && e.userUsername.toLowerCase().includes(q)) ||
          (e.oldValue && e.oldValue.toLowerCase().includes(q)) ||
          (e.newValue && e.newValue.toLowerCase().includes(q)) ||
          (e.title && e.title.toLowerCase().includes(q))
      )
    }

    return result
  }, [events, relationFilter, typeFilter, searchQuery])

  if (!isOpen) return null

  const formatRelativeTime = (timestamp: number) => {
    const diff = nowSec - timestamp
    if (diff < 60) return 'همین چند لحظه پیش'
    if (diff < 3600) return `${toPersianDigits(Math.floor(diff / 60))} دقیقه پیش`
    if (diff < 86400) return `${toPersianDigits(Math.floor(diff / 3600))} ساعت پیش`
    if (diff < 172800) return 'دیروز'
    const days = Math.floor(diff / 86400)
    if (days < 30) return `${toPersianDigits(days)} روز پیش`
    return new Date(timestamp * 1000).toLocaleDateString('fa-IR', {
      month: 'short',
      day: 'numeric',
    })
  }

  const getEventBadge = (type: ContactChangeType) => {
    switch (type) {
      case 'name_change':
        return {
          label: 'تغییر نام',
          icon: <User className="w-3.5 h-3.5" />,
          color: 'bg-primary-500/15 text-primary-300 border-primary-500/30',
        }
      case 'username_change':
        return {
          label: 'تغییر نام کاربری',
          icon: <AtSign className="w-3.5 h-3.5" />,
          color: 'bg-accent-violet/15 text-accent-violet border-accent-violet/30',
        }
      case 'bio_change':
        return {
          label: 'ویرایش بیوگرافی',
          icon: <FileText className="w-3.5 h-3.5" />,
          color: 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30',
        }
      case 'photo_change':
        return {
          label: 'تغییر عکس پروفایل',
          icon: <Camera className="w-3.5 h-3.5" />,
          color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        }
      case 'photo_delete':
        return {
          label: 'حذف عکس پروفایل',
          icon: <Camera className="w-3.5 h-3.5" />,
          color: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        }
      case 'personal_channel_change':
        return {
          label: 'کانال متصل به بیو',
          icon: <Radio className="w-3.5 h-3.5" />,
          color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        }
      default:
        return {
          label: 'تغییر مشخصات',
          icon: <Sparkles className="w-3.5 h-3.5" />,
          color: 'bg-gray-700/20 text-gray-300 border-white/10',
        }
    }
  }

  const activeOnlineUsersCount =
    timelineData?.users?.filter((u) => u.currentStatus === 'online').length || 0

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 360 }}
        className={`glass-modal w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10 bg-dark-900/98 transition-all ${
          isMaximized
            ? 'fixed inset-2 md:inset-4 w-auto h-auto max-w-none max-h-none z-50'
            : 'max-w-5xl h-[88vh] max-h-[820px]'
        }`}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-dark-850/90 shrink-0">
          {/* Tabs Selector & Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center p-1 rounded-2xl bg-dark-900/90 border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('timeline_map')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'timeline_map'
                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>نقشه و تایم‌لاین آنلاین مخاطبان</span>
                {activeOnlineUsersCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('profile_changes')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'profile_changes'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>تغییرات پروفایل مخاطبین</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
                  {events.length}
                </span>
              </button>
            </div>
          </div>

          {/* Window Control Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                fetchChanges(true)
                fetchTimeline()
              }}
              title="اسکن و استعلام زنده"
              className="p-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  isEventsLoading || isTimelineLoading ? 'animate-spin text-accent-cyan' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              title={isMaximized ? 'کوچک‌نمایی پنجره' : 'بزرگ‌نمایی تمام‌صفحه'}
              className="p-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              title="بستن (Esc)"
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Live Online Activity Timeline & Map */}
        {activeTab === 'timeline_map' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Toolbar: Search, Filters, Time Range, Zoom */}
            <div className="p-3.5 bg-dark-850/60 border-b border-white/5 space-y-2.5 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={timelineSearch}
                    onChange={(e) => setTimelineSearch(e.target.value)}
                    placeholder="جستجوی مخاطب در نقشه آنلاین..."
                    className="w-full pl-3 pr-9 py-1.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-cyan transition-colors"
                  />
                  {timelineSearch && (
                    <button
                      type="button"
                      onClick={() => setTimelineSearch('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Day Range Selector */}
                <div className="flex items-center gap-1 p-0.5 rounded-xl bg-dark-900 border border-white/10 text-xs">
                  {[
                    { id: 'today' as TimelineDayRange, label: 'امروز' },
                    { id: 'yesterday' as TimelineDayRange, label: 'دیروز' },
                    { id: '48h' as TimelineDayRange, label: '۴۸ ساعت اخیر' },
                  ].map((dr) => {
                    const active = timelineDayRange === dr.id
                    return (
                      <button
                        key={dr.id}
                        type="button"
                        onClick={() => setTimelineDayRange(dr.id)}
                        className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer text-xs ${
                          active
                            ? 'bg-accent-cyan/20 text-accent-cyan font-bold border border-accent-cyan/40 shadow-xs'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {dr.label}
                      </button>
                    )
                  })}
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-dark-900 border border-white/10">
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    title="بزرگ‌نمایی محور زمان (+)"
                    className="p-1 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono font-bold text-accent-cyan px-1 select-none">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    title="کوچک‌نمایی محور زمان (-)"
                    className="p-1 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  {zoomLevel !== 1 && (
                    <button
                      type="button"
                      onClick={handleResetZoom}
                      title="بازنشانی زوم"
                      className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Relationship & Live Online Filters */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-gray-400 ml-1 flex items-center gap-1">
                    <Filter className="w-3 h-3 text-gray-400" />
                    <span>فیلتر نمایش:</span>
                  </span>

                  {[
                    { id: 'all' as RelationFilterType, label: 'همه افراد' },
                    { id: 'mutual' as RelationFilterType, label: 'مخاطبین دوطرفه' },
                    { id: 'my_contacts' as RelationFilterType, label: 'مخاطبین من' },
                  ].map((rf) => {
                    const active = relationFilter === rf.id
                    return (
                      <button
                        key={rf.id}
                        type="button"
                        onClick={() => setRelationFilter(rf.id)}
                        className={`px-2.5 py-1 rounded-xl text-xs transition-all cursor-pointer font-medium ${
                          active
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'bg-dark-900 text-gray-400 hover:text-gray-200 border border-white/5'
                        }`}
                      >
                        {rf.label}
                      </button>
                    )
                  })}

                  <button
                    type="button"
                    onClick={() => setOnlyOnlineFilter((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-xl text-xs transition-all cursor-pointer font-semibold flex items-center gap-1.5 ${
                      onlyOnlineFilter
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-xs'
                        : 'bg-dark-900 text-gray-400 hover:text-gray-200 border border-white/5'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        onlyOnlineFilter ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
                      }`}
                    />
                    <span>فقط آنلاین‌ها ({activeOnlineUsersCount})</span>
                  </button>
                </div>

                {/* Clear Selected User Filter if Active */}
                {selectedUserId && (
                  <button
                    type="button"
                    onClick={() => setSelectedUserId(null)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-accent-cyan/15 hover:bg-accent-cyan/25 text-accent-cyan border border-accent-cyan/30 transition-all cursor-pointer shadow-xs"
                  >
                    <span>نمایش همه افراد در تایم‌لاین</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Focused User Banner (When a specific user is selected) */}
            {selectedUserObj && (
              <div className="px-5 py-2.5 bg-accent-cyan/10 border-b border-accent-cyan/20 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <Avatar
                    accountId={accountId}
                    peerId={selectedUserObj.userId}
                    title={selectedUserObj.userName}
                    avatarUrl={selectedUserObj.avatarUrl}
                    size="sm"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {selectedUserObj.userName}
                      </span>
                      {selectedUserObj.userUsername && (
                        <span className="text-[11px] text-gray-400">
                          @{selectedUserObj.userUsername}
                        </span>
                      )}
                      {selectedUserObj.currentStatus === 'online' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          <span>آنلاین</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400">
                          آخرین حضور: {selectedUserObj.lastSeen ? formatClockTime(selectedUserObj.lastSeen) : 'نامشخص'}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-300 font-sans mt-0.5">
                      مجموع زمان آنلاین در این بازه:{' '}
                      <strong className="text-accent-cyan font-bold">
                        {formatDurationHuman(selectedUserMetrics?.totalSecs || 0)}
                      </strong>{' '}
                      • تعداد ورود و خروج: {toPersianDigits(selectedUserMetrics?.count || 0)} بار
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenChat && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onOpenChat(selectedUserObj.userId, {
                          id: selectedUserObj.userId,
                          title: selectedUserObj.userName,
                          username: selectedUserObj.userUsername,
                          avatarUrl: selectedUserObj.avatarUrl,
                          isUser: true,
                        })
                      }}
                      className="px-2.5 py-1 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>گفتگو</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Horizontal Contacts Selector Strip */}
            {!selectedUserId && filteredUsers.length > 0 && (
              <div className="px-4 py-2 bg-dark-900/90 border-b border-white/5 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
                <span className="text-[10px] text-gray-400 whitespace-nowrap pl-1">مخاطبان فعال:</span>
                {filteredUsers.slice(0, 30).map((u) => {
                  const isOnline = u.currentStatus === 'online'
                  return (
                    <button
                      key={u.userId}
                      type="button"
                      onClick={() => setSelectedUserId(u.userId)}
                      title={`کلیک برای فیلتر و تمرکز روی تایم‌لاین ${u.userName}`}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-white/5 hover:border-accent-cyan/40 transition-all cursor-pointer whitespace-nowrap shrink-0 group"
                    >
                      <div className="relative">
                        <Avatar
                          accountId={accountId}
                          peerId={u.userId}
                          title={u.userName}
                          avatarUrl={u.avatarUrl}
                          size="xs"
                        />
                        {isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-dark-900 animate-pulse" />
                        )}
                      </div>
                      <span className="text-xs truncate max-w-[100px]">{u.userName}</span>
                      {u.totalOnlineToday > 0 && (
                        <span className="text-[9px] font-mono text-accent-cyan/80 bg-accent-cyan/10 px-1 py-0.2 rounded-xs">
                          {formatDurationHuman(u.totalOnlineToday)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Main Interactive Timeline Canvas */}
            <div
              ref={timelineContainerRef}
              onWheel={handleTimelineWheel}
              className="flex-1 overflow-x-auto overflow-y-auto p-4 select-none relative scrollbar-thin scrollbar-thumb-white/10 flex flex-col justify-between"
            >
              {isTimelineLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                  <RefreshCw className="w-7 h-7 animate-spin text-accent-cyan" />
                  <span className="text-xs">در حال بارگذاری نقشه فعالیت و تایم‌لاین آنلاین...</span>
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-dark-800 border border-white/10 flex items-center justify-center text-gray-500">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-gray-200">
                    نشست آنلاینی در این بازه زمانی ثبت نشده است
                  </div>
                  <p className="text-xs text-gray-400 max-w-sm">
                    گایدگرام حضور و آنلاین شدن مخاطبان را با دقت ثانیه‌ای ثبت می‌کند. به محض آنلاین شدن
                    هر کاربر، بلافاصله کپسول فعالیت او روی این خط زمانی قرار می‌گیرد.
                  </p>
                </div>
              ) : (
                <div
                  dir="ltr"
                  style={{ width: `${zoomLevel * 100}%`, minWidth: '100%' }}
                  className="space-y-6 pt-2 pb-8 transition-[width] duration-200 relative"
                >
                  {/* Time Axis Ruler */}
                  <div className="relative h-8 border-b border-white/15">
                    {hourMarkers.map((hm) => (
                      <div
                        key={hm.markerSec}
                        style={{ left: `${hm.posPercent}%` }}
                        className="absolute top-0 bottom-0 flex flex-col items-center -translate-x-1/2"
                      >
                        <span className="text-[10px] text-gray-400 font-mono select-none font-semibold">
                          {hm.hourStr}
                        </span>
                        <div className="w-px h-2 bg-white/20 mt-1" />
                      </div>
                    ))}

                    {/* Live "Now" Indicator Line */}
                    {nowPercent !== null && (
                      <div
                        style={{ left: `${nowPercent}%` }}
                        className="absolute -top-1 bottom-0 z-30 flex flex-col items-center pointer-events-none -translate-x-1/2"
                      >
                        <span className="text-[9px] bg-accent-cyan text-dark-950 font-bold px-1.5 py-0.2 rounded-xs shadow-md">
                          اکنون ({formatClockTime(nowSec)})
                        </span>
                        <div className="w-0.5 h-full bg-accent-cyan shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
                      </div>
                    )}
                  </div>

                  {/* Sessions Stream Lanes */}
                  <div className="relative min-h-[220px] space-y-3 pt-2">
                    {/* Background Hour Gridlines */}
                    <div className="absolute inset-0 pointer-events-none">
                      {hourMarkers.map((hm) => (
                        <div
                          key={`grid_${hm.markerSec}`}
                          style={{ left: `${hm.posPercent}%` }}
                          className="absolute top-0 bottom-0 w-px border-r border-dashed border-white/5"
                        />
                      ))}
                    </div>

                    {/* Render Sessions Capsules */}
                    {filteredSessions.map((sess) => {
                      const sessStart = Math.max(sess.startTime, viewStartSec)
                      const sessEnd = Math.min(sess.endTime, viewEndSec)
                      if (sessEnd <= sessStart) return null

                      const leftPercent = ((sessStart - viewStartSec) / viewDurationSec) * 100
                      const rawWidthPercent = ((sessEnd - sessStart) / viewDurationSec) * 100
                      // Ensure a minimum clickable interactive width
                      const widthPercent = Math.max(1.2, rawWidthPercent)

                      const isLive = sess.isCurrentSession
                      const isHovered = hoveredSession?.id === sess.id

                      return (
                        <div
                          key={sess.id}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                          }}
                          onMouseEnter={() => setHoveredSession(sess)}
                          onMouseLeave={() => setHoveredSession(null)}
                          onClick={() => setSelectedUserId(sess.userId)}
                          className={`relative h-10 rounded-xl cursor-pointer transition-all flex items-center px-1.5 shadow-md group ${
                            isLive
                              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-accent-cyan ring-2 ring-accent-cyan/80 shadow-[0_0_12px_rgba(34,211,238,0.6)]'
                              : isHovered
                              ? 'bg-gradient-to-r from-emerald-400 to-teal-300 ring-2 ring-white scale-102 z-20 shadow-lg'
                              : 'bg-gradient-to-r from-emerald-600/90 to-teal-500/90 hover:from-emerald-500 hover:to-teal-400 hover:ring-1 hover:ring-white/50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 select-none">
                            <Avatar
                              accountId={accountId}
                              peerId={sess.userId}
                              title={sess.userName}
                              avatarUrl={sess.avatarUrl}
                              size="xs"
                            />
                            <div className="min-w-0 flex items-center gap-1">
                              <span className="text-[11px] font-bold text-dark-950 truncate max-w-[85px] leading-tight">
                                {sess.userName}
                              </span>
                              {isLive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Hover Session Floating Tooltip Card */}
              <AnimatePresence>
                {hoveredSession && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 p-3.5 rounded-2xl bg-dark-850/95 border border-accent-cyan/40 shadow-2xl backdrop-blur-md flex items-center gap-4 text-xs font-sans text-white select-none pointer-events-auto"
                  >
                    <Avatar
                      accountId={accountId}
                      peerId={hoveredSession.userId}
                      title={hoveredSession.userName}
                      avatarUrl={hoveredSession.avatarUrl}
                      size="md"
                    />

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">
                          {hoveredSession.userName}
                        </span>
                        {hoveredSession.userUsername && (
                          <span className="text-gray-400 text-xs">
                            @{hoveredSession.userUsername}
                          </span>
                        )}
                        {hoveredSession.isCurrentSession && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                            هم‌اکنون آنلاین
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-gray-300 mt-1 flex items-center gap-2">
                        <span>
                          زمان نشست: <strong>{formatClockTimeWithSeconds(hoveredSession.startTime)}</strong> تا{' '}
                          <strong>
                            {hoveredSession.isCurrentSession
                              ? 'اکنون'
                              : formatClockTimeWithSeconds(hoveredSession.endTime)}
                          </strong>
                        </span>
                        <span>•</span>
                        <span className="text-accent-cyan font-bold">
                          مدت آنلاین: {formatDurationHuman(hoveredSession.durationSeconds)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pl-2 border-r border-white/10">
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(hoveredSession.userId)}
                        className="px-2.5 py-1.5 rounded-xl bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan font-bold text-xs transition-colors cursor-pointer"
                      >
                        تمرکز روی این کاربر
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Selected User Session List Details (if a single user is focused) */}
            {selectedUserId && filteredSessions.length > 0 && (
              <div className="p-3 bg-dark-850/90 border-t border-white/10 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 shrink-0">
                <div className="text-xs font-bold text-gray-300 mb-2 flex items-center justify-between">
                  <span>جزئیات دقیقه‌های آنلاین این کاربر ({toPersianDigits(filteredSessions.length)} سشن)</span>
                  <span className="text-[10px] text-gray-400">ثبت‌شده در حافظه محلی رادار</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {filteredSessions.map((sess, idx) => (
                    <div
                      key={sess.id}
                      className="p-2.5 rounded-xl bg-dark-900 border border-white/5 flex items-center justify-between text-xs font-sans"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-dark-800 text-gray-400 flex items-center justify-center font-mono text-[10px]">
                          {toPersianDigits(idx + 1)}
                        </span>
                        <div>
                          <div className="text-gray-200 font-semibold">
                            {formatClockTime(sess.startTime)} تا {sess.isCurrentSession ? 'اکنون' : formatClockTime(sess.endTime)}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {new Date(sess.startTime * 1000).toLocaleDateString('fa-IR', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                        </div>
                      </div>
                      <span className="text-accent-cyan font-bold text-[11px]">
                        {formatDurationHuman(sess.durationSeconds)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Profile Changes History */}
        {activeTab === 'profile_changes' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filter Toolbar & Search Bar */}
            <div className="p-4 bg-dark-850/50 border-b border-white/5 space-y-3 shrink-0">
              {/* Search Field */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو بر اساس نام، نام‌کاربری یا متن تغییر..."
                  className="w-full pl-4 pr-10 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-cyan transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Relation Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] text-gray-400 ml-1 flex items-center gap-1">
                  <Users className="w-3 h-3 text-gray-400" />
                  <span>ارتباط:</span>
                </span>

                {[
                  { id: 'all' as RelationFilterType, label: 'همه مخاطبان', icon: Users },
                  { id: 'mutual' as RelationFilterType, label: 'اونایی که شماره منو دارن (دوطرفه)', icon: UserCheck },
                  { id: 'my_contacts' as RelationFilterType, label: 'اونایی که من شمارشونو دارم', icon: UserPlus },
                  { id: 'saved' as RelationFilterType, label: 'سایر چت‌ها / غریبه‌ها', icon: Bookmark },
                ].map((rf) => {
                  const active = relationFilter === rf.id
                  const Icon = rf.icon
                  return (
                    <button
                      key={rf.id}
                      type="button"
                      onClick={() => setRelationFilter(rf.id)}
                      className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                        active
                          ? 'bg-primary-600 text-white shadow-xs'
                          : 'bg-dark-800 text-gray-400 hover:text-gray-200 border border-white/5'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{rf.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Change Type Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] text-gray-400 ml-1 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-gray-400" />
                  <span>نوع رویداد:</span>
                </span>

                {[
                  { id: 'all', label: 'همه رویدادها' },
                  { id: 'photo_change', label: 'تغییر عکس' },
                  { id: 'bio_change', label: 'ویرایش بیوگرافی' },
                  { id: 'personal_channel_change', label: 'کانال متصل به بیو' },
                  { id: 'name_change', label: 'تغییر نام' },
                  { id: 'username_change', label: 'نام‌کاربری' },
                ].map((tf) => {
                  const active = typeFilter === tf.id
                  return (
                    <button
                      key={tf.id}
                      type="button"
                      onClick={() => setTypeFilter(tf.id as any)}
                      className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer text-xs font-medium ${
                        active
                          ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40 shadow-xs'
                          : 'bg-dark-800/80 text-gray-400 hover:text-gray-200 border border-white/5'
                      }`}
                    >
                      <span>{tf.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Timeline Events Feed */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
              {isEventsLoading ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-accent-cyan" />
                  <span className="text-xs">در حال بارگذاری تایم‌لاین تغییرات...</span>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-dark-800 border border-white/10 flex items-center justify-center text-gray-500">
                    <History className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-gray-200">تغییری با این فیلترها ثبت نشده است</div>
                  <p className="text-xs text-gray-400 max-w-sm">
                    به محض اینکه مخاطبی نام، عکس، بیوگرافی یا کانال متصل خود را تغییر دهد یا حذف کند،
                    فوراً در این تایم‌لاین ثبت خواهد شد.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEvents.map((evt) => {
                    const badge = getEventBadge(evt.changeType)
                    const isPhotoEvent =
                      evt.changeType === 'photo_change' || evt.changeType === 'photo_delete'

                    return (
                      <motion.div
                        key={evt.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl bg-dark-850 border border-white/5 hover:border-white/15 transition-all shadow-sm space-y-3 group"
                      >
                        {/* Event Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              accountId={accountId}
                              peerId={evt.userId}
                              title={evt.userName || 'User'}
                              avatarUrl={evt.userAvatarUrl || evt.newPhotoUrl}
                              size="md"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white truncate">
                                  {evt.userName || 'کاربر تلگرام'}
                                </span>
                                {evt.userUsername && (
                                  <span className="text-[11px] text-gray-400 font-normal">
                                    @{evt.userUsername}
                                  </span>
                                )}
                                {evt.isMutualContact && (
                                  <span
                                    title="این شخص شماره شما را دارد (مخاطب دوطرفه)"
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold"
                                  >
                                    <UserCheck className="w-2.5 h-2.5" />
                                    <span>دوطرفه</span>
                                  </span>
                                )}
                                {evt.isMyContact && !evt.isMutualContact && (
                                  <span
                                    title="این شخص در مخاطبان شما ذخیره است"
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary-500/15 border border-primary-500/30 text-primary-300 text-[10px] font-medium"
                                  >
                                    <span>مخاطب من</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                                ID: {evt.userId} • {formatRelativeTime(evt.timestamp)}
                              </div>
                            </div>
                          </div>

                          {/* Event Type Badge */}
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${badge.color}`}
                          >
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                        </div>

                        {/* Photo Comparison Display (Side-by-Side Before & After) */}
                        {isPhotoEvent && (evt.oldPhotoUrl || evt.newPhotoUrl) ? (
                          <div className="p-3 rounded-xl bg-dark-900/90 border border-white/5 space-y-2 text-xs">
                            <div className="flex items-center justify-around gap-4 pt-1">
                              {/* Before Photo */}
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                                  عکس قبلی
                                </span>
                                {evt.oldPhotoUrl ? (
                                  <div
                                    onClick={() => setPreviewPhotoUrl(evt.oldPhotoUrl || null)}
                                    className="w-20 h-20 rounded-2xl overflow-hidden border border-rose-500/30 shadow-md cursor-pointer hover:scale-105 transition-transform"
                                  >
                                    <img
                                      src={evt.oldPhotoUrl}
                                      alt="عکس قبلی"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-20 h-20 rounded-2xl bg-dark-800 border border-white/10 flex items-center justify-center text-gray-500 text-[10px]">
                                    نداشت
                                  </div>
                                )}
                              </div>

                              <ArrowLeft className="w-5 h-5 text-gray-500 shrink-0" />

                              {/* After Photo */}
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                                  {evt.changeType === 'photo_delete' ? 'وضعیت جدید' : 'عکس جدید'}
                                </span>
                                {evt.newPhotoUrl ? (
                                  <div
                                    onClick={() => setPreviewPhotoUrl(evt.newPhotoUrl || null)}
                                    className="w-20 h-20 rounded-2xl overflow-hidden border border-emerald-500/40 shadow-md cursor-pointer hover:scale-105 transition-transform"
                                  >
                                    <img
                                      src={evt.newPhotoUrl}
                                      alt="عکس جدید"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-300 font-bold text-[10px]">
                                    حذف شد
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-center text-[10px] text-gray-400 pt-1">
                              برای مشاهده عکس در اندازه بزرگ کلیک کنید
                            </div>
                          </div>
                        ) : (
                          /* Text Diff Body (Before & After) */
                          <div className="p-3 rounded-xl bg-dark-900/80 border border-white/5 space-y-2 text-xs">
                            <div className="flex items-start gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 shrink-0">
                                مقدار قبلی
                              </span>
                              <span className="text-gray-400 line-through select-text break-words">
                                {evt.oldValue || 'خالی'}
                              </span>
                            </div>

                            <div className="flex items-start gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0">
                                مقدار جدید
                              </span>
                              <span className="text-emerald-300 font-semibold select-text break-words">
                                {evt.newValue || 'حذف شد'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Quick Action Footer Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          {/* Button to view on timeline */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserId(evt.userId)
                              setActiveTab('timeline_map')
                            }}
                            className="px-3 py-1.5 rounded-xl bg-accent-cyan/15 hover:bg-accent-cyan/25 text-accent-cyan border border-accent-cyan/30 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            <span>مشاهده در نقشه آنلاین</span>
                          </button>

                          {onOpenUserProfile && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose()
                                onOpenUserProfile(evt.userId, {
                                  id: evt.userId,
                                  title: evt.userName || evt.title,
                                  username: evt.userUsername,
                                  avatarUrl: evt.newPhotoUrl || evt.userAvatarUrl,
                                  isUser: true,
                                })
                              }}
                              className="px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-white/10 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <User className="w-3.5 h-3.5" />
                              <span>پروفایل</span>
                            </button>
                          )}

                          {onOpenChat && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose()
                                onOpenChat(evt.userId, {
                                  id: evt.userId,
                                  title: evt.userName || evt.title,
                                  username: evt.userUsername,
                                  avatarUrl: evt.newPhotoUrl || evt.userAvatarUrl,
                                  isUser: true,
                                })
                              }}
                              className="px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>باز کردن چت</span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Lightbox Modal for Photo Preview */}
      <AnimatePresence>
        {previewPhotoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewPhotoUrl(null)}
            className="fixed inset-0 z-60 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-lg max-h-[85vh] rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-dark-900"
            >
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-colors cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                src={previewPhotoUrl}
                alt="عکس بزرگنمایی شده"
                className="w-full h-full object-contain max-h-[80vh]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
export default ContactChangesModal
