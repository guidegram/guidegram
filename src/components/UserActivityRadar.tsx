import React, { useState, useEffect, useId } from 'react'
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
} from 'lucide-react'
import type {
  UserActivityStats,
  ContactChangeEvent,
  UserOnlineStatusType,
} from '../types/telegram'
import { useI18n } from '../i18n'

interface UserActivityRadarProps {
  accountId: string
  userId: string
  userName: string
  avatarUrl?: string
  currentStatus?: UserOnlineStatusType
  lastSeen?: number
}

function formatDurationHuman(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} ثانیه`
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours > 0) {
    return `${hours} ساعت ${remainingMinutes > 0 ? `و ${remainingMinutes} دقیقه` : ''}`
  }
  return `${minutes} دقیقه`
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
}) => {
  const { t } = useI18n()
  const componentInstanceId = useId()
  const [stats, setStats] = useState<UserActivityStats | null>(null)
  const [changes, setChanges] = useState<ContactChangeEvent[]>([])
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isChangesExpanded, setIsChangesExpanded] = useState(false)
  const [isPrivacyHelpOpen, setIsPrivacyHelpOpen] = useState(false)
  const [hoveredHour, setHoveredHour] = useState<number | null>(null)

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

  // Max count for scaling the 24h bar chart
  const maxHourlyCount = Math.max(1, ...(stats?.hourlyDistribution || [1]))

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

  return (
    <div className="space-y-4">
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
                <span>رادار فعالیت و آنلاین</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary-500/20 text-primary-300 border border-primary-500/30 font-mono">
                  Live
                </span>
              </div>
              <div className="text-[10px] text-gray-400">تحلیل رفتاری و حضور مخاطب</div>
            </div>
          </div>

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
            <span>{isTrackingEnabled ? 'ردیابی: روشن' : 'ردیابی: خاموش'}</span>
          </button>
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
              <p className="text-[11px] text-gray-300">
                این مخاطب در تنظیمات تلگرام خود آخرین بازدید را روی «Nobody» یا «مخاطبین من» قرار داده
                است. تلگرام در این حالت مقدار ثانیه‌ای دقیق را به سرور نمی‌فرستد و صرفاً یکی از ۴ وضعیت
                فازی (اخیراً، هفته اخیر، ماه اخیر، یا خیلی وقت پیش) را مخابره می‌کند.
              </p>
              <p className="text-[11px] text-gray-300">
                با این حال، <strong>گایدگرام به محض آنلاین شدن این شخص</strong> و حضور زنده در چت،
                نشست آنلاین او را با ثانیه دقیق در این نمودار ثبت می‌کند!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 24-Hour Visual Activity Bar Chart */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5 font-semibold text-gray-300">
              <TrendingUp className="w-3.5 h-3.5 text-accent-cyan" />
              <span>پراکندگی فعالیت در ۲۴ ساعت شبانه‌روز</span>
            </span>
            <span className="font-mono text-[10px]">
              {hoveredHour !== null
                ? `ساعت ${hoveredHour}:00 تا ${hoveredHour + 1}:00 (${
                    stats?.hourlyDistribution[hoveredHour] || 0
                  } رویداد)`
                : 'برای مشاهده ساعت اشاره کنید'}
            </span>
          </div>

          <div className="h-16 flex items-end gap-1 bg-dark-900/80 p-2 rounded-xl border border-white/5">
            {(stats?.hourlyDistribution || new Array(24).fill(0)).map((val, hour) => {
              const heightPercent = maxHourlyCount > 0 ? Math.max(8, (val / maxHourlyCount) * 100) : 8
              const isHovered = hoveredHour === hour
              const hasActivity = val > 0

              return (
                <div
                  key={hour}
                  onMouseEnter={() => setHoveredHour(hour)}
                  onMouseLeave={() => setHoveredHour(null)}
                  className="flex-1 h-full flex items-end justify-center group relative cursor-pointer"
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25, delay: hour * 0.015 }}
                    className={`w-full rounded-sm transition-all ${
                      hasActivity
                        ? isHovered
                          ? 'bg-accent-cyan shadow-glow'
                          : 'bg-emerald-500/70 group-hover:bg-emerald-400'
                        : 'bg-white/5 group-hover:bg-white/10'
                    }`}
                  />
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between text-[9px] text-gray-500 font-mono px-1">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>
        </div>

        {/* Aggregate Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="p-2.5 rounded-xl bg-dark-900/60 border border-white/5 flex flex-col items-center text-center">
            <span className="text-[10px] text-gray-400 font-medium">آنلاین امروز</span>
            <span className="text-xs font-bold text-emerald-400 mt-1 font-mono">
              {stats?.totalOnlineSecondsToday
                ? formatDurationHuman(stats.totalOnlineSecondsToday)
                : '۰ دقیقه'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/60 border border-white/5 flex flex-col items-center text-center">
            <span className="text-[10px] text-gray-400 font-medium">آنلاین ۷ روز</span>
            <span className="text-xs font-bold text-accent-cyan mt-1 font-mono">
              {stats?.totalOnlineSecondsWeek
                ? formatDurationHuman(stats.totalOnlineSecondsWeek)
                : '۰ دقیقه'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/60 border border-white/5 flex flex-col items-center text-center">
            <span className="text-[10px] text-gray-400 font-medium">نشست‌های امروز</span>
            <span className="text-xs font-bold text-accent-violet mt-1 font-mono">
              {stats?.totalSessionsToday ?? 0} مرتبه
            </span>
          </div>
        </div>

        {/* Recent Sessions List Ribbon */}
        {stats?.sessions && stats.sessions.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-accent-cyan" />
              <span>آخرین بازه‌های آنلاین شدن:</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-1">
              {stats.sessions
                .slice(-5)
                .reverse()
                .map((sess) => (
                  <div
                    key={sess.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-dark-900/50 border border-white/5 text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-gray-300 font-mono">
                        {formatTime(sess.startTime)} الی {formatTime(sess.endTime)}
                      </span>
                      {sess.isApproximate && (
                        <span className="text-[9px] text-gray-500 font-sans">(تخمینی)</span>
                      )}
                    </div>
                    <span className="text-emerald-400 font-semibold font-mono text-[10px]">
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
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 font-mono text-gray-300">
              {changes.length}
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
                          <span className="font-mono text-gray-500">{formatDate(change.timestamp)}</span>
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
