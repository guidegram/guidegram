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
  const h = toPersianDigits(String(d.getHours()).padStart(2, '0'))
  const m = toPersianDigits(String(d.getMinutes()).padStart(2, '0'))
  return `${h}:${m}`
}

function formatClockTimeWithSeconds(timestamp: number): string {
  const d = new Date(timestamp * 1000)
  const h = toPersianDigits(String(d.getHours()).padStart(2, '0'))
  const m = toPersianDigits(String(d.getMinutes()).padStart(2, '0'))
  const s = toPersianDigits(String(d.getSeconds()).padStart(2, '0'))
  return `${h}:${m}:${s}`
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
  const [loadingPreviewHd, setLoadingPreviewHd] = useState(false)

  const handleOpenPhotoPreview = async (userId: string, currentUrl?: string) => {
    if (currentUrl) {
      setPreviewPhotoUrl(currentUrl)
    }
    if (window.guidegram?.getProfilePhoto && accountId && userId) {
      setLoadingPreviewHd(true)
      try {
        const hdUrl = await window.guidegram.getProfilePhoto(accountId, userId, true, false)
        if (hdUrl) {
          setPreviewPhotoUrl(hdUrl)
        }
      } catch (_) {} finally {
        setLoadingPreviewHd(false)
      }
    }
  }

  // Online Timeline State
  const [timelineData, setTimelineData] = useState<AccountOnlineTimelineData | null>(null)
  const [isTimelineLoading, setIsTimelineLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialSelectedUserId || null)
  const [timelineDayRange, setTimelineDayRange] = useState<TimelineDayRange>('today')
  const [zoomLevel, setZoomLevel] = useState<number>(1) // 1x to 4x
  const [timelineSearch, setTimelineSearch] = useState('')
  const [onlyOnlineFilter, setOnlyOnlineFilter] = useState(false)
  const [hoveredSession, setHoveredSession] = useState<ContactOnlineSessionItem | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStartX, setPanStartX] = useState(0)
  const [panScrollLeft, setPanScrollLeft] = useState(0)

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

  // Map sessions per user for Swimlane Gantt
  const userSessionsMap = useMemo(() => {
    const map = new Map<string, ContactOnlineSessionItem[]>()
    for (const sess of filteredSessions) {
      const list = map.get(sess.userId) || []
      list.push(sess)
      map.set(sess.userId, list)
    }
    return map
  }, [filteredSessions])

  // Calculate user total duration in current view
  const userDurationMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const sess of filteredSessions) {
      const s = Math.max(sess.startTime, viewStartSec)
      const e = Math.min(sess.endTime, viewEndSec)
      if (e > s) {
        map.set(sess.userId, (map.get(sess.userId) || 0) + (e - s))
      }
    }
    return map
  }, [filteredSessions, viewStartSec, viewEndSec])

  // Sort users for swimlane: Online now first, then by total time descending, then name
  const sortedSwimlaneUsers = useMemo(() => {
    let users = [...filteredUsers]
    if (selectedUserId) {
      users = users.filter((u) => u.userId === selectedUserId)
    }
    return users.sort((a, b) => {
      const aOnline = a.currentStatus === 'online' ? 1 : 0
      const bOnline = b.currentStatus === 'online' ? 1 : 0
      if (aOnline !== bOnline) return bOnline - aOnline
      const aTime = userDurationMap.get(a.userId) || 0
      const bTime = userDurationMap.get(b.userId) || 0
      if (aTime !== bTime) return bTime - aTime
      return a.userName.localeCompare(b.userName)
    })
  }, [filteredUsers, selectedUserId, userDurationMap])

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

  // Generate Hour Ruler Markers with adaptive spacing & pure Persian digits
  const hourMarkers = useMemo(() => {
    const markers: Array<{
      hourStr: string
      posPercent: number
      markerSec: number
      isMajor: boolean
      showLabel: boolean
    }> = []

    const is48h = viewDurationSec > 86400
    // Adaptive step: at 1x zoom in 24h, step by 2 hours so labels never crowd or collide.
    // When zoomed in (>= 1.4x), show every hour since there is plenty of space.
    let labelStepHours = 2
    if (is48h) {
      labelStepHours = zoomLevel >= 2 ? 2 : zoomLevel >= 1.4 ? 4 : 6
    } else {
      labelStepHours = zoomLevel >= 1.4 ? 1 : 2
    }

    const totalHours = Math.ceil(viewDurationSec / 3600)
    for (let i = 0; i <= totalHours; i++) {
      const markerSec = viewStartSec + i * 3600
      if (markerSec <= viewEndSec) {
        const d = new Date(markerSec * 1000)
        const hourNum = d.getHours()
        const isEndMarker = markerSec === viewEndSec
        const showLabel = isEndMarker ? false : (hourNum % labelStepHours === 0)
        // Clean Persian hour digits: "۲۱", "۲۲", with "۰۰" for midnight
        const hourStr = hourNum === 0 ? '۰۰' : toPersianDigits(hourNum)
        const posPercent = ((markerSec - viewStartSec) / viewDurationSec) * 100

        markers.push({
          hourStr,
          posPercent,
          markerSec,
          isMajor: hourNum % labelStepHours === 0,
          showLabel,
        })
      }
    }
    return markers
  }, [viewStartSec, viewEndSec, viewDurationSec, zoomLevel])

  // Progress of current moment in today view
  const nowPercent =
    timelineDayRange !== 'yesterday' && nowSec >= viewStartSec && nowSec <= viewEndSec
      ? ((nowSec - viewStartSec) / viewDurationSec) * 100
      : null

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(4, Number((z + 0.5).toFixed(1))))
  const handleZoomOut = () => setZoomLevel((z) => Math.max(1, Number((z - 0.5).toFixed(1))))
  const handleResetZoom = () => setZoomLevel(1)

  // Wheel zoom & horizontal pan handler
  const handleTimelineWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault()
      if (e.deltaY < 0) {
        handleZoomIn()
      } else {
        handleZoomOut()
      }
    } else if (timelineContainerRef.current) {
      // Natural horizontal wheel scroll
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault()
        timelineContainerRef.current.scrollLeft += e.deltaY
      }
    }
  }

  // Drag to pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!timelineContainerRef.current) return
    if ((e.target as HTMLElement).closest('button, .interactive-session')) return
    setIsPanning(true)
    setPanStartX(e.clientX)
    setPanScrollLeft(timelineContainerRef.current.scrollLeft)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !timelineContainerRef.current) return
    e.preventDefault()
    const deltaX = e.clientX - panStartX
    timelineContainerRef.current.scrollLeft = panScrollLeft - deltaX
  }

  const handleMouseUp = () => {
    setIsPanning(false)
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

            {/* Main Interactive Swimlane Gantt Canvas */}
            <div
              ref={timelineContainerRef}
              onWheel={handleTimelineWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: isPanning ? 'grabbing' : 'default' }}
              className="flex-1 overflow-x-auto overflow-y-auto select-none relative scrollbar-thin scrollbar-thumb-white/10 flex flex-col justify-between"
            >
              {isTimelineLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2 p-12">
                  <RefreshCw className="w-7 h-7 animate-spin text-accent-cyan" />
                  <span className="text-xs">در حال بارگذاری نقشه فعالیت و تایم‌لاین آنلاین...</span>
                </div>
              ) : sortedSwimlaneUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-dark-800 border border-white/10 flex items-center justify-center text-gray-500">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-gray-200">
                    مخاطب یا نشستی در این بازه زمانی یافت نشد
                  </div>
                  <p className="text-xs text-gray-400 max-w-sm">
                    گایدگرام حضور و آنلاین شدن مخاطبان را با دقت ثانیه‌ای ثبت می‌کند. فیلترها را بررسی کنید
                    یا بازه زمانی را تغییر دهید.
                  </p>
                </div>
              ) : (
                <div
                  dir="ltr"
                  style={{ width: `${Math.max(100, zoomLevel * 100)}%`, minWidth: '950px' }}
                  className="flex flex-col relative transition-[width] duration-200 pb-12"
                >
                  {/* STICKY TOP TIME RULER (Never disappears on vertical scroll!) */}
                  <div className="sticky top-0 z-40 flex items-stretch bg-dark-900/98 backdrop-blur-md border-b border-white/15 h-11 shadow-sm">
                    {/* Fixed Left Header for User Info */}
                    <div className="w-60 shrink-0 sticky left-0 z-50 bg-dark-900 border-r border-white/15 px-3.5 flex items-center justify-between text-xs font-bold text-gray-300 shadow-md font-sans">
                      <span className="flex items-center gap-1.5" dir="rtl">
                        <Users className="w-3.5 h-3.5 text-accent-cyan" />
                        <span>مخاطبان ({toPersianDigits(sortedSwimlaneUsers.length)})</span>
                      </span>
                      {selectedUserId && (
                        <button
                          type="button"
                          onClick={() => setSelectedUserId(null)}
                          className="text-[10px] text-accent-cyan hover:underline cursor-pointer font-normal"
                        >
                          نمایش همه
                        </button>
                      )}
                    </div>

                    {/* Time Ruler Axis */}
                    <div className="flex-1 relative h-full flex items-center overflow-hidden">
                      {hourMarkers.map((hm) => (
                        <div
                          key={hm.markerSec}
                          style={{ left: `${hm.posPercent}%` }}
                          className="absolute top-0 bottom-0 flex flex-col items-center -translate-x-1/2 pointer-events-none"
                        >
                          {hm.showLabel ? (
                            <>
                              <span className="text-[11px] text-gray-300 font-sans font-medium pt-1 select-none">
                                {hm.hourStr}
                              </span>
                              <div className="w-px h-2.5 bg-white/25 mt-auto mb-1" />
                            </>
                          ) : (
                            <div className="w-px h-1.5 bg-white/10 mt-auto mb-1" />
                          )}
                        </div>
                      ))}

                      {/* Live "Now" Indicator Marker */}
                      {nowPercent !== null && (
                        <div
                          style={{ left: `${nowPercent}%` }}
                          className="absolute top-0 bottom-0 z-30 flex flex-col items-center pointer-events-none -translate-x-1/2"
                        >
                          <span className="text-[9px] bg-accent-cyan text-dark-950 font-bold px-1.5 py-0.5 rounded-xs shadow-md font-sans">
                            اکنون ({formatClockTime(nowSec)})
                          </span>
                          <div className="w-0.5 h-full bg-accent-cyan shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SWIMLANE ROWS (One row per user, zero empty vertical gaps!) */}
                  <div className="flex flex-col relative divide-y divide-white/5">
                    {sortedSwimlaneUsers.map((user) => {
                      const sessions = userSessionsMap.get(user.userId) || []
                      const totalSecs = userDurationMap.get(user.userId) || 0
                      const isOnline = user.currentStatus === 'online'
                      const isSelected = selectedUserId === user.userId

                      return (
                        <div
                          key={user.userId}
                          className={`flex items-stretch h-14 group transition-colors relative ${
                            isSelected ? 'bg-accent-cyan/10 ring-1 ring-accent-cyan/30' : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          {/* Sticky Left Column: User Profile Card (Sticky on horizontal scroll!) */}
                          <div
                            onClick={() => setSelectedUserId(isSelected ? null : user.userId)}
                            className="w-60 shrink-0 sticky left-0 z-20 bg-dark-900 group-hover:bg-dark-850 px-3.5 h-full border-r border-white/10 flex items-center gap-2.5 cursor-pointer shadow-sm transition-colors"
                          >
                            <div className="relative shrink-0">
                              <Avatar
                                accountId={accountId}
                                peerId={user.userId}
                                title={user.userName}
                                avatarUrl={user.avatarUrl}
                                size="sm"
                              />
                              {isOnline && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-dark-900 animate-pulse" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1 text-right" dir="rtl">
                              <div
                                className="text-xs font-bold text-gray-200 truncate group-hover:text-white font-sans"
                                title={user.userName}
                              >
                                {user.userName}
                              </div>
                              <div className="text-[10px] flex items-center gap-1.5 mt-0.5 font-sans">
                                {isOnline ? (
                                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                    <span>هم‌اکنون آنلاین</span>
                                  </span>
                                ) : totalSecs > 0 ? (
                                  <span className="text-accent-cyan font-sans font-medium" dir="rtl">
                                    <bdi>{formatDurationHuman(totalSecs)} آنلاین</bdi>
                                  </span>
                                ) : (
                                  <span className="text-gray-500">نشستی ثبت نشده</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right Lane: 24h Timeline for this user */}
                          <div className="flex-1 relative h-full flex items-center overflow-hidden">
                            {/* Horizontal centerline guide rail */}
                            <div className="absolute left-0 right-0 h-[2px] bg-white/[0.04] rounded-full pointer-events-none" />

                            {/* Background Hour Gridlines */}
                            {hourMarkers.map((hm) => (
                              <div
                                key={`grid_${hm.markerSec}`}
                                style={{ left: `${hm.posPercent}%` }}
                                className={`absolute top-0 bottom-0 w-px pointer-events-none ${
                                  hm.showLabel
                                    ? 'border-r border-dashed border-white/[0.07]'
                                    : 'border-r border-dotted border-white/[0.03]'
                                }`}
                              />
                            ))}

                            {/* Live Now Vertical Guideline */}
                            {nowPercent !== null && (
                              <div
                                style={{ left: `${nowPercent}%` }}
                                className="absolute top-0 bottom-0 w-px bg-accent-cyan/30 shadow-[0_0_8px_rgba(34,211,238,0.5)] pointer-events-none -translate-x-1/2"
                              />
                            )}

                            {/* User's Session Bars on this Lane */}
                            {sessions.map((sess) => {
                              const sessStart = Math.max(sess.startTime, viewStartSec)
                              const sessEnd = Math.min(sess.endTime, viewEndSec)
                              if (sessEnd <= sessStart) return null

                              const leftPercent = ((sessStart - viewStartSec) / viewDurationSec) * 100
                              const rawWidthPercent = ((sessEnd - sessStart) / viewDurationSec) * 100
                              // Minimum width so short sessions are sleek and interactive
                              const widthPercent = Math.max(0.4, rawWidthPercent)

                              const isLive = sess.isCurrentSession
                              const isHovered = hoveredSession?.id === sess.id

                              return (
                                <div
                                  key={sess.id}
                                  style={{
                                    left: `${leftPercent}%`,
                                    width: `${widthPercent}%`,
                                    minWidth: '6px',
                                  }}
                                  onMouseEnter={() => setHoveredSession(sess)}
                                  onMouseLeave={() => setHoveredSession(null)}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedUserId(sess.userId)
                                  }}
                                  title={`${sess.userName}: ${formatClockTime(sess.startTime)} تا ${
                                    isLive ? 'اکنون' : formatClockTime(sess.endTime)
                                  } (${formatDurationHuman(sess.durationSeconds)})`}
                                  className={`interactive-session absolute h-2.5 rounded-full cursor-pointer transition-all duration-150 z-10 ${
                                    isLive
                                      ? 'h-3 bg-gradient-to-r from-emerald-400 via-teal-300 to-accent-cyan ring-1 ring-accent-cyan shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse z-20'
                                      : isHovered
                                      ? 'h-3.5 -translate-y-0.5 bg-gradient-to-r from-emerald-300 to-teal-200 ring-2 ring-white shadow-[0_0_12px_rgba(52,211,153,0.8)] z-30'
                                      : 'bg-gradient-to-r from-emerald-500/90 to-teal-400/90 hover:from-emerald-400 hover:to-teal-300 hover:h-3 hover:ring-1 hover:ring-white/70 shadow-[0_0_6px_rgba(16,185,129,0.3)]'
                                  }`}
                                >
                                  {isLive && (
                                    <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent-cyan ring-2 ring-dark-900 shadow-[0_0_8px_#22d3ee] animate-ping" />
                                  )}
                                </div>
                              )
                            })}
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
                    dir="rtl"
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
                          <div className="p-3.5 rounded-2xl bg-dark-900/90 border border-white/5 space-y-2 text-xs">
                            {evt.changeType === 'photo_delete' ? (
                              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
                                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                                  <Camera className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-xs">عکس پروفایل حذف شد</span>
                                  <span className="text-[10px] text-rose-400/80">کاربر تصویر پروفایل خود را حذف کرد</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-4 py-1">
                                {/* Left/Main: New Profile Photo (High Quality) */}
                                <div className="flex items-center gap-3.5">
                                  <div
                                    onClick={() => handleOpenPhotoPreview(evt.userId, evt.newPhotoUrl || evt.userAvatarUrl)}
                                    className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-lg cursor-pointer hover:scale-105 hover:border-emerald-400 transition-all group bg-dark-800 shrink-0"
                                  >
                                    {evt.newPhotoUrl || evt.userAvatarUrl ? (
                                      <img
                                        src={evt.newPhotoUrl || evt.userAvatarUrl}
                                        alt="عکس جدید"
                                        className="w-full h-full object-cover group-hover:brightness-110 transition-all"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                                        بدون عکس
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                                      بزرگنمایی
                                    </div>
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                                        عکس جدید با کیفیت
                                      </span>
                                    </div>
                                    <span className="text-gray-400 text-[11px]">
                                      برای مشاهده سایز کامل و HD کلیک کنید
                                    </span>
                                  </div>
                                </div>

                                {/* Right: Old photo (if recorded and different from new) */}
                                {evt.oldPhotoUrl && evt.oldPhotoUrl !== evt.newPhotoUrl && (
                                  <div className="flex flex-col items-center gap-1 opacity-75 hover:opacity-100 transition-opacity shrink-0">
                                    <span className="text-[9px] text-gray-400">عکس قبلی</span>
                                    <div
                                      onClick={() => handleOpenPhotoPreview(evt.userId, evt.oldPhotoUrl)}
                                      className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shadow cursor-pointer hover:scale-105 transition-transform"
                                    >
                                      <img
                                        src={evt.oldPhotoUrl}
                                        alt="عکس قبلی"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
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
            onClick={() => {
              setPreviewPhotoUrl(null)
              setLoadingPreviewHd(false)
            }}
            className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative min-w-[320px] sm:min-w-[440px] max-w-2xl min-h-[320px] max-h-[85vh] rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-dark-900 flex flex-col items-center justify-center p-4 cursor-default"
            >
              <button
                type="button"
                onClick={() => {
                  setPreviewPhotoUrl(null)
                  setLoadingPreviewHd(false)
                }}
                className="absolute top-4 right-4 p-2.5 rounded-2xl bg-black/70 hover:bg-black/90 text-white border border-white/20 transition-colors cursor-pointer z-20 shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>

              {loadingPreviewHd && (
                <div className="absolute top-4 left-4 px-2.5 py-1 rounded-xl bg-primary-500/20 text-primary-300 border border-primary-500/30 text-[10px] flex items-center gap-1.5 z-20">
                  <div className="w-2.5 h-2.5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                  <span>در حال دریافت کیفیت بالا...</span>
                </div>
              )}

              <img
                src={previewPhotoUrl}
                alt="عکس پروفایل"
                className="max-w-full max-h-[75vh] w-auto h-auto object-contain rounded-2xl shadow-xl select-none"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
export default ContactChangesModal
