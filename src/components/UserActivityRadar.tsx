import React, { useState, useEffect, useId, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Activity,
  Clock,
  Eye,
  EyeOff,
  Calendar,
  Zap,
  TrendingUp,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  History,
  User,
  Sparkles,
  Camera,
  FileText,
  AtSign,
  Radio,
  Check,
  AlertCircle,
  HelpCircle,
  ZoomIn,
  ArrowRight,
  PowerOff,
  Maximize2,
} from 'lucide-react'
import type {
  UserActivityStats,
  ContactChangeEvent,
  UserOnlineStatusType,
  UserActivitySession,
} from '../types/telegram'
import { useI18n } from '../i18n'

interface UserActivityRadarProps {
  accountId: string
  userId: string
  userName: string
  avatarUrl?: string
  currentStatus?: UserOnlineStatusType
  lastSeen?: number
  onOpenFullTimeline?: (userId?: string) => void
}

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

function formatTime(timestamp: number): string {
  const d = new Date(timestamp * 1000)
  return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp * 1000)
  return d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const UserActivityRadar: React.FC<UserActivityRadarProps> = ({
  accountId,
  userId,
  userName,
  avatarUrl,
  currentStatus: propCurrentStatus,
  lastSeen: propLastSeen,
  onOpenFullTimeline,
}) => {
  const { t } = useI18n()
  const componentInstanceId = useId()
  const [stats, setStats] = useState<UserActivityStats | null>(null)
  const [changes, setChanges] = useState<ContactChangeEvent[]>([])
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isChangesExpanded, setIsChangesExpanded] = useState(false)
  const [isPrivacyHelpOpen, setIsPrivacyHelpOpen] = useState(false)
  const [chartMode, setChartMode] = useState<'timeline' | 'distribution'>('timeline')
  
  // Selected day offset: 0 = Today, 1 = Yesterday, 2 = 2 days ago, etc.
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0)
  // Zoomed hour for minute-by-minute breakdown (null = 24h view, 0-23 = minute drilldown)
  const [zoomedHour, setZoomedHour] = useState<number | null>(null)
  const [hoveredHour, setHoveredHour] = useState<number | null>(null)
  const [hoveredMinute, setHoveredMinute] = useState<number | null>(null)

  // Fetch activity stats & change history
  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      if (!window.guidegram) return
      try {
        const [activityStats, changeHistory, tracking] = await Promise.all([
          window.guidegram.getUserActivity?.(accountId, userId),
          window.guidegram.getUserChangeHistory?.(accountId, userId),
          window.guidegram.getUserTracking?.(accountId, userId),
        ])

        if (isMounted) {
          if (activityStats) setStats(activityStats)
          if (changeHistory) setChanges(changeHistory)
          if (tracking !== undefined) setIsTrackingEnabled(tracking)
        }
      } catch (err) {
        console.warn('[UserActivityRadar] Failed to load user activity:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadData()

    // Listen for real-time status changes
    const unsub = window.guidegram?.on?.(
      'telegram:user-status-changed',
      (payload: any) => {
        if (payload?.userId === userId) {
          loadData()
        }
      }
    )

    const unsubChanges = window.guidegram?.on?.(
      'telegram:contact-change-detected',
      (payload: any) => {
        if (payload?.event?.userId === userId) {
          loadData()
        }
      }
    )

    return () => {
      isMounted = false
      unsub?.()
      unsubChanges?.()
    }
  }, [accountId, userId])

  const handleToggleTracking = async () => {
    const next = !isTrackingEnabled
    setIsTrackingEnabled(next)
    try {
      await window.guidegram?.setUserTracking?.(userId, next)
    } catch (err) {
      console.warn('[UserActivityRadar] Failed to update tracking state:', err)
      setIsTrackingEnabled(!next)
    }
  }

  const effectiveStatus = stats?.currentStatus || propCurrentStatus || 'empty'
  const effectiveLastSeen = stats?.lastSeenTimestamp || propLastSeen

  // Time boundaries calculation based on selected day offset
  const { dayStartSec, dayEndSec, isToday, availableDayOffsets } = useMemo(() => {
    const now = Math.floor(Date.now() / 1000)
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - selectedDayOffset)
    const dayStartSec = Math.floor(d.getTime() / 1000)
    const dayEndSec = dayStartSec + 86400

    // Discover which past days have actual sessions
    const offsetsSet = new Set<number>([0, 1]) // Always show Today and Yesterday
    const todayMidnight = new Date().setHours(0, 0, 0, 0) / 1000
    if (stats?.sessions) {
      for (const sess of stats.sessions) {
        const diffDays = Math.floor((todayMidnight - sess.startTime) / 86400)
        if (diffDays >= 0 && diffDays <= 7) {
          offsetsSet.add(diffDays)
        }
      }
    }

    const availableDayOffsets = Array.from(offsetsSet).sort((a, b) => a - b)

    return {
      dayStartSec,
      dayEndSec,
      isToday: selectedDayOffset === 0,
      availableDayOffsets,
    }
  }, [selectedDayOffset, stats?.sessions])

  // Filter sessions relevant to the selected day
  const daySessions = useMemo(() => {
    if (!stats?.sessions) return []
    return stats.sessions.filter(
      (s) => s.endTime >= dayStartSec && s.startTime < dayEndSec
    )
  }, [stats?.sessions, dayStartSec, dayEndSec])

  // Metric sums for the selected day
  const { dayTotalSeconds, dayTotalSessions } = useMemo(() => {
    let secs = 0
    let count = 0
    for (const sess of daySessions) {
      const start = Math.max(sess.startTime, dayStartSec)
      const end = Math.min(sess.endTime, dayEndSec)
      if (end > start) {
        secs += end - start
        count++
      }
    }
    return { dayTotalSeconds: secs, dayTotalSessions: count }
  }, [daySessions, dayStartSec, dayEndSec])

  // Current local time markers
  const nowSec = Math.floor(Date.now() / 1000)
  const currentHour = new Date().getHours()
  const currentMinute = new Date().getMinutes()
  const currentDayProgressPercent = isToday
    ? Math.min(100, Math.max(0, ((nowSec - dayStartSec) / 86400) * 100))
    : null

  // 24-hour breakdown for the selected day
  // Each hour object: { durationSeconds, sessionCount, isAppRunning, isFuture }
  const hourlyData = useMemo(() => {
    const hours = []
    const uptimeIntervals = stats?.appUptimeIntervals || []

    for (let h = 0; h < 24; h++) {
      const hStart = dayStartSec + h * 3600
      const hEnd = hStart + 3600
      const isFuture = isToday && h > currentHour

      let dur = 0
      let sessCount = 0

      // Calculate user active duration in this hour
      for (const s of daySessions) {
        const overlapStart = Math.max(s.startTime, hStart)
        const overlapEnd = Math.min(s.endTime, hEnd)
        if (overlapEnd > overlapStart) {
          dur += overlapEnd - overlapStart
          sessCount++
        }
      }
      dur = Math.min(3600, dur)

      // Determine if Guidegram app was running during this hour
      let isAppRunning = true
      if (uptimeIntervals.length > 0) {
        // App was running if any interval overlaps with this hour
        const hasOverlap = uptimeIntervals.some(
          (iv) => iv.end >= hStart && iv.start <= hEnd
        )
        isAppRunning = hasOverlap
      }

      hours.push({
        hour: h,
        durationSeconds: dur,
        sessionCount: sessCount,
        isAppRunning,
        isFuture,
      })
    }
    return hours
  }, [dayStartSec, daySessions, isToday, currentHour, stats?.appUptimeIntervals])

  // Minute-by-minute breakdown for zoomed hour (60 minutes)
  const minuteData = useMemo(() => {
    if (zoomedHour === null) return []
    const hStart = dayStartSec + zoomedHour * 3600
    const minutes = []
    const uptimeIntervals = stats?.appUptimeIntervals || []

    for (let m = 0; m < 60; m++) {
      const mStart = hStart + m * 60
      const mEnd = mStart + 60
      const isFuture = isToday && zoomedHour === currentHour && m > currentMinute

      let dur = 0
      for (const s of daySessions) {
        const overlapStart = Math.max(s.startTime, mStart)
        const overlapEnd = Math.min(s.endTime, mEnd)
        if (overlapEnd > overlapStart) {
          dur += overlapEnd - overlapStart
        }
      }
      dur = Math.min(60, dur)

      let isAppRunning = true
      if (uptimeIntervals.length > 0) {
        isAppRunning = uptimeIntervals.some(
          (iv) => iv.end >= mStart && iv.start <= mEnd
        )
      }

      minutes.push({
        minute: m,
        durationSeconds: dur,
        isAppRunning,
        isFuture,
      })
    }
    return minutes
  }, [zoomedHour, dayStartSec, daySessions, isToday, currentHour, currentMinute, stats?.appUptimeIntervals])

  const getStatusBadge = () => {
    switch (effectiveStatus) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>هم‌اکنون آنلاین</span>
          </span>
        )
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-dark-800 border border-white/10 text-gray-300 text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-accent-cyan" />
            <span>
              {effectiveLastSeen
                ? `آخرین بازدید: ${formatTime(effectiveLastSeen)}`
                : 'آفلاین'}
            </span>
          </span>
        )
      case 'recently':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-amber/15 border border-accent-amber/30 text-accent-amber text-xs font-medium">
            <EyeOff className="w-3.5 h-3.5" />
            <span>آخرین بازدید اخیراً (مخفی)</span>
          </span>
        )
      case 'within_week':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-violet/15 border border-accent-violet/30 text-accent-violet text-xs font-medium">
            <Calendar className="w-3.5 h-3.5" />
            <span>آخرین بازدید طی یک هفته اخیر</span>
          </span>
        )
      case 'within_month':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-700/30 border border-white/10 text-gray-400 text-xs font-medium">
            <span>آخرین بازدید طی یک ماه اخیر</span>
          </span>
        )
      case 'long_time_ago':
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>خیلی وقت پیش / مسدود</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-dark-800 border border-white/10 text-gray-400 text-xs font-medium">
            <span>نامشخص</span>
          </span>
        )
    }
  }

  const isHiddenStatus = ['recently', 'within_week', 'within_month', 'long_time_ago'].includes(
    effectiveStatus
  )

  const getDayLabel = (offset: number) => {
    if (offset === 0) return 'امروز'
    if (offset === 1) return 'دیروز'
    return `${toPersianDigits(offset)} روز قبل`
  }

  return (
    <div className="space-y-4 font-sans select-none">
      {/* 1. Main Activity Radar Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-dark-850 via-dark-800 to-dark-900 border border-white/10 shadow-lg space-y-4">
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent-cyan/15 text-accent-cyan flex items-center justify-center border border-accent-cyan/25">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-100 flex items-center gap-1.5">
                <span>رادار فعالیت و تایم‌لاین آنلاین</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-300 border border-primary-500/30">
                  زنده
                </span>
              </div>
              <div className="text-[10px] text-gray-400">تحلیل رفتاری و حضور بر حسب ثانیه</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenFullTimeline && (
              <button
                type="button"
                onClick={() => onOpenFullTimeline(userId)}
                title="مشاهده در نقشه و تایم‌لاین بزرگ"
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-accent-cyan/15 hover:bg-accent-cyan/25 text-accent-cyan border border-accent-cyan/30 transition-all cursor-pointer shadow-xs"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>نقشه بزرگ</span>
              </button>
            )}

            {/* Per-User Tracking Toggle */}
            <button
              type="button"
              onClick={handleToggleTracking}
              title={
                isTrackingEnabled
                  ? 'ردیابی این شخص فعال است (کلیک برای غیرفعال‌سازی)'
                  : 'ردیابی این شخص متوقف است (کلیک برای فعال‌سازی)'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                isTrackingEnabled
                  ? 'bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 border-primary-500/40 shadow-xs'
                  : 'bg-dark-800 hover:bg-dark-750 text-gray-400 border-white/10'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isTrackingEnabled ? 'bg-primary-400 animate-pulse' : 'bg-gray-500'
                }`}
              />
              <span>{isTrackingEnabled ? 'روشن' : 'خاموش'}</span>
            </button>
          </div>
        </div>

        {/* Current Status Pill & Privacy Notice */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {getStatusBadge()}

          {isHiddenStatus && (
            <button
              type="button"
              onClick={() => setIsPrivacyHelpOpen((prev) => !prev)}
              className="text-[11px] text-accent-amber hover:text-accent-amber/80 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>چرا ساعت دقیق مشخص نیست؟</span>
            </button>
          )}
        </div>

        {/* Hidden Status Educational Banner */}
        <AnimatePresence>
          {isHiddenStatus && isPrivacyHelpOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-xl bg-accent-amber/10 border border-accent-amber/25 text-xs text-gray-200 space-y-1.5 leading-relaxed"
            >
              <div className="font-bold text-accent-amber flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>حریم خصوصی در پروتکل MTProto تلگرام:</span>
              </div>
              <p className="text-[11px] text-gray-300 leading-normal">
                این مخاطب در تنظیمات تلگرام خود آخرین بازدید را روی «Nobody» یا «مخاطبین من» قرار داده
                است. تلگرام در این حالت مقدار ثانیه‌ای دقیق را به سرور نمی‌فرستد و صرفاً یکی از ۴ وضعیت
                فازی (اخیراً، هفته اخیر، ماه اخیر، یا خیلی وقت پیش) را مخابره می‌کند.
              </p>
              <p className="text-[11px] text-gray-300 leading-normal">
                با این حال، <strong>گایدگرام به محض آنلاین شدن این شخص</strong> و حضور زنده در چت،
                نشست آنلاین او را با ثانیه دقیق در این نمودار ثبت می‌کند!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Day Selector Pills & Timeline Mode */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            {availableDayOffsets.map((offset) => {
              const active = selectedDayOffset === offset
              return (
                <button
                  key={offset}
                  type="button"
                  onClick={() => {
                    setSelectedDayOffset(offset)
                    setZoomedHour(null) // Reset zoom when switching days
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40 shadow-xs'
                      : 'bg-dark-900/60 text-gray-400 hover:text-gray-200 border border-white/5'
                  }`}
                >
                  {getDayLabel(offset)}
                </button>
              )
            })}
          </div>

          {zoomedHour !== null && (
            <button
              type="button"
              onClick={() => setZoomedHour(null)}
              className="flex items-center gap-1 text-[11px] text-accent-cyan hover:text-accent-cyan/80 font-medium px-2 py-0.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/25 cursor-pointer shrink-0"
            >
              <span>بازگشت به ۲۴ ساعت</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Visual Timeline Section: 24-Hour vs. 60-Minute Drilldown */}
        <div className="space-y-2">
          {/* Header & Tooltip Indicator */}
          <div className="flex items-center justify-between text-[11px] text-gray-400 min-h-5">
            <span className="flex items-center gap-1.5 font-semibold text-gray-300">
              <TrendingUp className="w-3.5 h-3.5 text-accent-cyan" />
              <span>
                {zoomedHour !== null
                  ? `بزرگنمایی دقیقه به دقیقه: ساعت ${toPersianDigits(
                      String(zoomedHour).padStart(2, '0')
                    )}:۰۰ تا ${toPersianDigits(
                      String(zoomedHour).padStart(2, '0')
                    )}:۵۹`
                  : `پراکندگی فعالیت در شبانه‌روز (${getDayLabel(selectedDayOffset)})`}
              </span>
            </span>

            <span className="text-[11px] text-accent-cyan font-medium">
              {zoomedHour !== null ? (
                hoveredMinute !== null ? (
                  `دقیقه ${toPersianDigits(
                    String(hoveredMinute).padStart(2, '0')
                  )}: ${formatDurationHuman(
                    minuteData[hoveredMinute]?.durationSeconds || 0
                  )} آنلاین`
                ) : (
                  'روی دقایق اشاره کنید'
                )
              ) : hoveredHour !== null ? (
                `ساعت ${toPersianDigits(hoveredHour)}:۰۰ تا ${toPersianDigits(
                  hoveredHour + 1
                )}:۰۰ (${formatDurationHuman(
                  hourlyData[hoveredHour]?.durationSeconds || 0
                )})`
              ) : (
                'برای زوم و مشاهده دقیقه‌ها روی ساعت کلیک کنید'
              )}
            </span>
          </div>

          {/* Chart Container - strictly LTR for chronological timeline 00:00 -> 23:59 */}
          <div
            dir="ltr"
            className="h-20 flex items-end gap-1 bg-dark-900/90 p-2.5 rounded-xl border border-white/10 relative overflow-hidden"
          >
            {/* Live "Now" Indicator line for Today */}
            {isToday && zoomedHour === null && currentDayProgressPercent !== null && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none flex flex-col items-center"
                style={{ left: `${currentDayProgressPercent}%` }}
              >
                <div className="w-0.5 h-full bg-accent-cyan shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <span className="absolute top-1 text-[8px] bg-accent-cyan text-dark-950 font-bold px-1 rounded-xs -translate-x-1/2">
                  اکنون
                </span>
              </div>
            )}

            {/* 1. Zoomed View (60 Minutes) */}
            {zoomedHour !== null ? (
              minuteData.map((mItem) => {
                const isHovered = hoveredMinute === mItem.minute
                const hasActivity = mItem.durationSeconds > 0
                const heightPercent = mItem.isFuture
                  ? 6
                  : hasActivity
                  ? Math.max(15, Math.round((mItem.durationSeconds / 60) * 100))
                  : 6

                return (
                  <div
                    key={mItem.minute}
                    onMouseEnter={() => setHoveredMinute(mItem.minute)}
                    onMouseLeave={() => setHoveredMinute(null)}
                    title={`دقیقه ${mItem.minute}: ${mItem.durationSeconds} ثانیه آنلاین`}
                    className="flex-1 h-full flex items-end justify-center group relative cursor-pointer"
                  >
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercent}%` }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      className={`w-full rounded-xs transition-all ${
                        mItem.isFuture
                          ? 'border border-dashed border-white/10 bg-transparent'
                          : hasActivity
                          ? isHovered
                            ? 'bg-accent-cyan shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                            : 'bg-gradient-to-t from-emerald-500 to-teal-400 group-hover:from-emerald-400 group-hover:to-cyan-300'
                          : !mItem.isAppRunning
                          ? 'bg-white/10 repeating-linear-gradient opacity-60'
                          : 'bg-white/5 group-hover:bg-white/10'
                      }`}
                    />
                  </div>
                )
              })
            ) : (
              /* 2. 24-Hour View */
              hourlyData.map((hItem) => {
                const isHovered = hoveredHour === hItem.hour
                const hasActivity = hItem.durationSeconds > 0
                // Scaling: 3600s = 100%, 0s = 8% baseline
                const heightPercent = hItem.isFuture
                  ? 8
                  : hasActivity
                  ? Math.max(14, Math.round((hItem.durationSeconds / 3600) * 100))
                  : 8

                return (
                  <div
                    key={hItem.hour}
                    onClick={() => {
                      if (!hItem.isFuture) {
                        setZoomedHour(hItem.hour)
                      }
                    }}
                    onMouseEnter={() => setHoveredHour(hItem.hour)}
                    onMouseLeave={() => setHoveredHour(null)}
                    title={`ساعت ${hItem.hour}:00: ${formatDurationHuman(
                      hItem.durationSeconds
                    )} آنلاین - کلیک برای زوم دقیقه‌ای`}
                    className="flex-1 h-full flex items-end justify-center group relative cursor-pointer"
                  >
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercent}%` }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 25,
                        delay: hItem.hour * 0.012,
                      }}
                      className={`w-full rounded-sm transition-all ${
                        hItem.isFuture
                          ? 'border border-dashed border-white/10 bg-transparent opacity-40'
                          : hasActivity
                          ? isHovered
                            ? 'bg-accent-cyan shadow-[0_0_10px_rgba(34,211,238,0.9)] scale-y-105'
                            : hItem.durationSeconds > 1800
                            ? 'bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-300 shadow-xs'
                            : 'bg-gradient-to-t from-emerald-600/80 to-teal-400/80 group-hover:from-emerald-400 group-hover:to-cyan-300'
                          : !hItem.isAppRunning
                          ? 'bg-white/10 border-t border-dashed border-white/20'
                          : 'bg-white/5 group-hover:bg-white/10'
                      }`}
                    />
                  </div>
                )
              })
            )}
          </div>

          {/* Time Scale Labels (strictly LTR so 00:00 is left and 23:59 is right) */}
          <div
            dir="ltr"
            className="flex items-center justify-between text-[10px] text-gray-400 px-1 font-sans"
          >
            {zoomedHour !== null ? (
              <>
                <span>
                  {toPersianDigits(String(zoomedHour).padStart(2, '0'))}:۰۰
                </span>
                <span>
                  {toPersianDigits(String(zoomedHour).padStart(2, '0'))}:۱۵
                </span>
                <span>
                  {toPersianDigits(String(zoomedHour).padStart(2, '0'))}:۳۰
                </span>
                <span>
                  {toPersianDigits(String(zoomedHour).padStart(2, '0'))}:۴۵
                </span>
                <span>
                  {toPersianDigits(String(zoomedHour).padStart(2, '0'))}:۵۹
                </span>
              </>
            ) : (
              <>
                <span>۰۰:۰۰</span>
                <span>۰۶:۰۰</span>
                <span>۱۲:۰۰</span>
                <span>۱۸:۰۰</span>
                <span>۲۳:۵۹</span>
              </>
            )}
          </div>

          {/* Chart Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-gray-400 pt-1 border-t border-white/5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-emerald-400" />
              <span>فعالیت آنلاین (ارتفاع متناسب با دقیقه)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-white/5 border border-white/10" />
              <span>آفلاین (پلتفرم متصل)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-white/15 border border-dashed border-white/30" />
              <span>پلتفرم قطع / بسته بوده</span>
            </span>
          </div>
        </div>

        {/* Aggregate Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="p-2.5 rounded-xl bg-dark-900/60 border border-white/5 flex flex-col items-center text-center">
            <span className="text-[10px] text-gray-400 font-medium">
              آنلاین {getDayLabel(selectedDayOffset)}
            </span>
            <span className="text-xs font-bold text-emerald-400 mt-1">
              {formatDurationHuman(dayTotalSeconds)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/60 border border-white/5 flex flex-col items-center text-center">
            <span className="text-[10px] text-gray-400 font-medium">آنلاین ۷ روز</span>
            <span className="text-xs font-bold text-accent-cyan mt-1">
              {stats?.totalOnlineSecondsWeek
                ? formatDurationHuman(stats.totalOnlineSecondsWeek)
                : '۰ دقیقه'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/60 border border-white/5 flex flex-col items-center text-center">
            <span className="text-[10px] text-gray-400 font-medium">
              نشست‌های {getDayLabel(selectedDayOffset)}
            </span>
            <span className="text-xs font-bold text-accent-violet mt-1">
              {toPersianDigits(dayTotalSessions)} مرتبه
            </span>
          </div>
        </div>

        {/* Recent Sessions List Ribbon for Selected Day */}
        {daySessions.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-accent-cyan" />
                <span>بازه‌های آنلاین ثبت‌شده ({getDayLabel(selectedDayOffset)}):</span>
              </span>
              <span className="text-gray-500 font-normal">
                {toPersianDigits(daySessions.length)} بازه
              </span>
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-1">
              {daySessions
                .slice(-10)
                .reverse()
                .map((sess) => (
                  <div
                    key={sess.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-dark-900/50 border border-white/5 text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-gray-300">
                        {formatTime(sess.startTime)} الی {formatTime(sess.endTime)}
                      </span>
                      {sess.isApproximate && (
                        <span className="text-[9px] text-gray-500">(تخمینی)</span>
                      )}
                    </div>
                    <span className="text-emerald-400 font-semibold text-[10px]">
                      {formatDurationHuman(sess.durationSeconds)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Profile Changes History Accordion */}
      <div className="p-4 rounded-2xl bg-dark-850/90 border border-white/5 space-y-3">
        <button
          type="button"
          onClick={() => setIsChangesExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs font-bold text-gray-200 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-accent-violet/15 text-accent-violet flex items-center justify-center">
              <History className="w-3.5 h-3.5" />
            </div>
            <span>تاریخچه تغییرات پروفایل این کاربر</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-300">
              {toPersianDigits(changes.length)}
            </span>
          </div>
          {isChangesExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {isChangesExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 pt-2 border-t border-white/5"
            >
              {changes.length === 0 ? (
                <div className="p-4 rounded-xl bg-dark-900/50 text-center text-xs text-gray-400 space-y-1">
                  <Sparkles className="w-5 h-5 mx-auto text-gray-500 opacity-60" />
                  <div>هنوز تغییری (نام، عکس، بیوگرافی یا کانال) برای این کاربر ثبت نشده است.</div>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-1">
                  {changes.map((change) => {
                    return (
                      <div
                        key={change.id}
                        className="p-2.5 rounded-xl bg-dark-900/70 border border-white/5 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between text-[10px] text-gray-400">
                          <span className="font-semibold text-accent-cyan flex items-center gap-1">
                            {change.changeType === 'name_change' && <User className="w-3 h-3" />}
                            {change.changeType === 'username_change' && <AtSign className="w-3 h-3" />}
                            {change.changeType === 'bio_change' && <FileText className="w-3 h-3" />}
                            {change.changeType === 'photo_change' && <Camera className="w-3 h-3" />}
                            {change.changeType === 'photo_delete' && <Camera className="w-3 h-3 text-rose-400" />}
                            {change.changeType === 'personal_channel_change' && <Radio className="w-3 h-3" />}
                            <span>
                              {change.changeType === 'name_change'
                                ? 'تغییر نام'
                                : change.changeType === 'username_change'
                                ? 'تغییر نام‌کاربری'
                                : change.changeType === 'bio_change'
                                ? 'ویرایش بیوگرافی'
                                : change.changeType === 'photo_change'
                                ? 'تعویض عکس پروفایل'
                                : change.changeType === 'photo_delete'
                                ? 'حذف عکس پروفایل'
                                : change.changeType === 'personal_channel_change'
                                ? 'تغییر کانال بیو'
                                : change.title}
                            </span>
                          </span>
                          <span className="text-gray-500">{formatDate(change.timestamp)}</span>
                        </div>

                        {/* Diff display */}
                        <div className="space-y-1 text-[11px] leading-snug">
                          {change.oldValue && (
                            <div className="text-gray-400 flex items-start gap-1.5">
                              <span className="text-rose-400 font-bold shrink-0">قبلی:</span>
                              <span className="line-through text-gray-500 select-text truncate">
                                {change.oldValue}
                              </span>
                            </div>
                          )}
                          {change.newValue && (
                            <div className="text-gray-200 flex items-start gap-1.5">
                              <span className="text-emerald-400 font-bold shrink-0">جدید:</span>
                              <span className="text-emerald-300 font-medium select-text truncate">
                                {change.newValue}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
