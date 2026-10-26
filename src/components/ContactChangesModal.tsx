import React, { useState, useEffect, useMemo } from 'react'
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
  ShieldCheck,
  Calendar,
} from 'lucide-react'
import type {
  ContactChangeEvent,
  ContactChangeType,
  ContactChangeFilter,
} from '../types/telegram'
import { Avatar } from './Avatar'
import { useI18n } from '../i18n'

interface ContactChangesModalProps {
  isOpen: boolean
  accountId: string
  onClose: () => void
  onOpenChat?: (chatId: string) => void
  onOpenUserProfile?: (peerId: string) => void
}

type RelationFilterType = 'all' | 'mutual' | 'my_contacts' | 'saved'

export const ContactChangesModal: React.FC<ContactChangesModalProps> = ({
  isOpen,
  accountId,
  onClose,
  onOpenChat,
  onOpenUserProfile,
}) => {
  const { t } = useI18n()
  const [events, setEvents] = useState<ContactChangeEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [relationFilter, setRelationFilter] = useState<RelationFilterType>('all')
  const [typeFilter, setTypeFilter] = useState<ContactChangeType | 'all'>('all')

  const fetchChanges = async () => {
    if (!window.guidegram?.getContactChanges) return
    setIsLoading(true)
    try {
      const res = await window.guidegram.getContactChanges(accountId)
      if (res) {
        setEvents(res)
      }
    } catch (err) {
      console.warn('[ContactChangesModal] Failed to fetch contact changes:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchChanges()
    }
  }, [isOpen, accountId])

  // Real-time listener for incoming contact changes
  useEffect(() => {
    const unsub = window.guidegram?.on?.(
      'telegram:contact-change-detected',
      (payload: any) => {
        if (payload?.event) {
          setEvents((prev) => [payload.event, ...prev.filter((e) => e.id !== payload.event.id)])
        }
      }
    )
    return () => {
      unsub?.()
    }
  }, [])

  // Filter & Search computation
  const filteredEvents = useMemo(() => {
    let result = [...events]

    // 1. Relation Filter
    if (relationFilter === 'mutual') {
      result = result.filter((e) => e.isMutualContact === true)
    } else if (relationFilter === 'my_contacts') {
      result = result.filter((e) => e.isMyContact === true)
    } else if (relationFilter === 'saved') {
      result = result.filter((e) => !e.isMutualContact && !e.isMyContact)
    }

    // 2. Type Filter
    if (typeFilter !== 'all') {
      if (typeFilter === 'photo_change') {
        result = result.filter((e) => e.changeType === 'photo_change' || e.changeType === 'photo_delete')
      } else {
        result = result.filter((e) => e.changeType === typeFilter)
      }
    }

    // 3. Search query
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
    const now = Math.floor(Date.now() / 1000)
    const diff = now - timestamp
    if (diff < 60) return 'همین چند لحظه پیش'
    if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`
    if (diff < 86400) return `${Math.floor(diff / 3600)} ساعت پیش`
    if (diff < 172800) return 'دیروز'
    const days = Math.floor(diff / 86400)
    if (days < 30) return `${days} روز پیش`
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

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: 'spring', damping: 26, stiffness: 360 }}
        className="glass-modal w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] max-h-[750px] border border-white/10 bg-dark-900/95"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-dark-850/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-cyan/15 text-accent-cyan flex items-center justify-center border border-accent-cyan/30 shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-100 flex items-center gap-2">
                <span>تایم‌لاین تغییرات مخاطبین</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-cyan/20 text-accent-cyan font-mono font-bold border border-accent-cyan/30">
                  {filteredEvents.length} رویداد
                </span>
              </div>
              <div className="text-[11px] text-gray-400">
                تاریخچه زنده تغییرات نام، عکس، بیوگرافی و کانال شخصی مخاطبان
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchChanges}
              title="بارگذاری مجدد"
              className="p-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-accent-cyan' : ''}`} />
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

          {/* Relation Filter Pills (مخاطب دوطرفه، مخاطب من، غریبه) */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] text-gray-400 ml-1 flex items-center gap-1">
              <Users className="w-3 h-3 text-gray-400" />
              <span>ارتباط:</span>
            </span>

            {[
              { id: 'all' as RelationFilterType, label: 'همه مخاطبان', icon: Users },
              { id: 'mutual' as RelationFilterType, label: 'اونایی که شماره منو دارن (دوطرفه)', icon: UserCheck },
              { id: 'my_contacts' as RelationFilterType, label: 'اونایی که من شمارشونو دارم', icon: UserPlus },
              { id: 'saved' as RelationFilterType, label: 'سایر ذخیره‌شده‌ها / غریبه‌ها', icon: Bookmark },
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
                      : 'bg-dark-800 text-gray-400 hover:text-gray-200 border border-white/5 hover:border-white/10'
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
              { id: 'name_change', label: 'تغییر نام' },
              { id: 'photo_change', label: 'تغییر عکس' },
              { id: 'bio_change', label: 'تغییر بیوگرافی' },
              { id: 'personal_channel_change', label: 'کانال شخصی' },
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
                      : 'bg-dark-800/80 text-gray-400 hover:text-gray-200 border border-white/5 hover:border-white/10'
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
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-accent-cyan" />
              <span className="text-xs">در حال بارگذاری تایم‌لاین تغییرات...</span>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-dark-800 border border-white/10 flex items-center justify-center text-gray-500">
                <History className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-gray-200">تغییری با این فیلترها یافت نشد</div>
              <p className="text-xs text-gray-400 max-w-sm">
                به محض اینکه مخاطبی نام، عکس، بیوگرافی یا کانال متصل خود را تغییر دهد یا حذف کند، فوراً
                در این تایم‌لاین ثبت و نمایش داده خواهد شد.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((evt) => {
                const badge = getEventBadge(evt.changeType)
                return (
                  <motion.div
                    key={evt.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-dark-850 border border-white/5 hover:border-white/15 transition-all shadow-sm space-y-3 group"
                  >
                    {/* Event Header: User Avatar & Name + Event Type Pill + Timestamp */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          accountId={accountId}
                          peerId={evt.userId}
                          title={evt.userName || 'User'}
                          avatarUrl={evt.userAvatarUrl}
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

                    {/* Diff Body (قبل و بعد) */}
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

                    {/* Quick Action Footer Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {onOpenUserProfile && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose()
                            onOpenUserProfile(evt.userId)
                          }}
                          className="px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-white/10 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <User className="w-3.5 h-3.5 text-accent-cyan" />
                          <span>مشاهده پروفایل</span>
                        </button>
                      )}

                      {onOpenChat && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose()
                            onOpenChat(evt.userId)
                          }}
                          className="px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>باز کردن گفتگو</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
export default ContactChangesModal
