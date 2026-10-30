import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  MessageSquare,
  Users,
  Megaphone,
  Clock,
  Check,
  Search,
  Image as ImageIcon,
  Maximize2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'
import { useI18n } from '../i18n'

export interface NotificationHistoryItem {
  id: string
  accountId: string
  chatId: string
  messageId?: number
  senderName: string
  chatTitle?: string
  avatarUrl?: string
  text?: string
  mediaType?: string
  thumbUrl?: string
  photoUrl?: string
  date: number
  isRead: boolean
  isGroup?: boolean
  isChannel?: boolean
  isDeletedLocally?: boolean
}

interface NotificationHistoryDrawerProps {
  isOpen: boolean
  onClose: () => void
  history: NotificationHistoryItem[]
  onSelectNotification: (item: NotificationHistoryItem) => void
  onMarkAllAsRead: () => void
  onClearHistory: () => void
  onDeleteItem: (id: string) => void
  onMarkItemAsRead: (id: string) => void
}

type FilterTab = 'all' | 'unread' | 'private' | 'groups_channels'

// Compact interactive thumbnail for photos in notifications
const NotificationMediaThumbnail: React.FC<{
  item: NotificationHistoryItem
  onOpenPreview: (item: NotificationHistoryItem, url: string) => void
}> = ({ item, onOpenPreview }) => {
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(item.photoUrl || item.thumbUrl)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (item.photoUrl) {
      setPhotoUrl(item.photoUrl)
      return
    }
    if (item.mediaType === 'photo' && item.messageId && window.guidegram?.downloadMedia) {
      let cancelled = false
      setIsLoading(true)
      window.guidegram
        .downloadMedia(item.accountId, item.chatId, item.messageId, false)
        .then((url) => {
          if (!cancelled && url) {
            setPhotoUrl(url)
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setIsLoading(false)
        })
      return () => {
        cancelled = true
      }
    }
  }, [item.accountId, item.chatId, item.messageId, item.photoUrl, item.mediaType])

  const effectiveUrl = photoUrl || item.thumbUrl

  if (!effectiveUrl && item.mediaType !== 'photo') return null

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        if (effectiveUrl) {
          onOpenPreview(item, effectiveUrl)
        }
      }}
      className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/15 bg-black/40 group/photo cursor-pointer shadow-sm hover:border-primary-500/50 transition-all hover:scale-105"
      title="مشاهده تصویر بزرگ (ذخیره‌شده در لوکال)"
    >
      {effectiveUrl ? (
        <img
          src={effectiveUrl}
          alt=""
          className="w-full h-full object-cover rounded-xl transition-transform duration-200 group-hover/photo:scale-110"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-white/5">
          <ImageIcon className="w-4 h-4 text-gray-500" />
        </div>
      )}

      {/* Hover zoom overlay */}
      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
        <Maximize2 className="w-4 h-4 text-white drop-shadow" />
      </div>

      {isLoading && !photoUrl && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="w-3.5 h-3.5 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Anti-delete local shield badge */}
      <div
        className="absolute bottom-0 right-0 p-0.5 rounded-tl bg-black/75 text-emerald-400"
        title="ذخیره‌شده در حافظه لوکال"
      >
        <ShieldCheck className="w-2.5 h-2.5" />
      </div>
    </div>
  )
}

export const NotificationHistoryDrawer: React.FC<NotificationHistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectNotification,
  onMarkAllAsRead,
  onClearHistory,
  onDeleteItem,
  onMarkItemAsRead,
}) => {
  const { isRTL } = useI18n()
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [previewPhotoItem, setPreviewPhotoItem] = useState<{
    item: NotificationHistoryItem
    url: string
  } | null>(null)

  const filteredHistory = useMemo(() => {
    let list = history

    if (activeFilter === 'unread') {
      list = list.filter((item) => !item.isRead)
    } else if (activeFilter === 'private') {
      list = list.filter((item) => !item.isGroup && !item.isChannel)
    } else if (activeFilter === 'groups_channels') {
      list = list.filter((item) => item.isGroup || item.isChannel)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (item) =>
          item.senderName?.toLowerCase().includes(q) ||
          item.chatTitle?.toLowerCase().includes(q) ||
          item.text?.toLowerCase().includes(q)
      )
    }

    return list
  }, [history, activeFilter, searchQuery])

  const unreadCount = useMemo(() => history.filter((i) => !i.isRead).length, [history])

  const formatRelativeTime = (timestamp: number) => {
    const diff = Math.max(0, Date.now() - timestamp)
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return isRTL ? 'همین الان' : 'Just now'
    if (minutes < 60) return isRTL ? `${minutes} دقیقه پیش` : `${minutes}m ago`
    if (hours < 24) return isRTL ? `${hours} ساعت پیش` : `${hours}h ago`
    if (days === 1) return isRTL ? 'دیروز' : 'Yesterday'
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
        />

        {/* Drawer Panel */}
        <motion.aside
          initial={{ x: isRTL ? '-100%' : '100%', opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: isRTL ? '-100%' : '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          dir={isRTL ? 'rtl' : 'ltr'}
          className={`relative z-10 w-full max-w-md h-full bg-dark-900/95 dark:bg-[#0c1017]/95 border-x border-white/10 shadow-2xl flex flex-col backdrop-blur-2xl ${
            isRTL ? 'mr-auto' : 'ml-auto'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="relative p-2 rounded-xl bg-primary-600/20 border border-primary-500/30 text-primary-300">
                <Bell className="w-5 h-5 text-accent-cyan" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent-rose text-[9px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-100">
                  {isRTL ? 'تاریخچه اعلان‌ها' : 'Notification History'}
                </h3>
                <p className="text-[11px] text-gray-400">
                  {isRTL
                    ? `${history.length} اعلان ثبت شده (${unreadCount} خوانده نشده)`
                    : `${history.length} notifications (${unreadCount} unread)`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  title={isRTL ? 'علامت‌گذاری همه به عنوان خوانده‌شده' : 'Mark all as read'}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-accent-cyan hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={onClearHistory}
                  title={isRTL ? 'پاک‌سازی تمام تاریخچه' : 'Clear history'}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-accent-rose hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-4 pt-3 pb-2">
            <div className="relative flex items-center">
              <Search className={`w-3.5 h-3.5 text-gray-400 absolute ${isRTL ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRTL ? 'جستجو در اعلان‌ها...' : 'Search notifications...'}
                className={`w-full bg-white/5 border border-white/10 rounded-xl py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50 transition-colors ${
                  isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className={`absolute p-1 text-gray-400 hover:text-white ${isRTL ? 'left-2.5' : 'right-2.5'}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-4 pb-2 border-b border-white/5 overflow-x-auto scrollbar-none">
            {[
              { id: 'all' as FilterTab, label: isRTL ? 'همه' : 'All', count: history.length },
              { id: 'unread' as FilterTab, label: isRTL ? 'خوانده‌نشده' : 'Unread', count: unreadCount },
              { id: 'private' as FilterTab, label: isRTL ? 'شخصی' : 'Private' },
              { id: 'groups_channels' as FilterTab, label: isRTL ? 'گروه و کانال' : 'Groups' },
            ].map((tab) => {
              const isActive = activeFilter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-primary-600/25 text-primary-300 border border-primary-500/30'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && tab.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-primary-500 text-white' : 'bg-white/10 text-gray-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* List Area */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/5 p-2 space-y-1">
            {filteredHistory.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-gray-500">
                  <Bell className="w-6 h-6 stroke-1" />
                </div>
                <h4 className="text-sm font-semibold text-gray-300">
                  {isRTL ? 'هیچ اعلانی یافت نشد' : 'No notifications'}
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  {isRTL
                    ? 'اعلان‌های جدید به‌صورت خودکار در این تاریخچه ذخیره می‌شوند و می‌توانید آن‌ها را مرور کنید.'
                    : 'New incoming notifications will automatically be recorded here for later review.'}
                </p>
              </div>
            ) : (
              filteredHistory.map((item) => {
                const hasPhoto = item.mediaType === 'photo' || item.thumbUrl || item.photoUrl

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => {
                      onSelectNotification(item)
                      onClose()
                    }}
                    className={`group relative flex items-start gap-3 p-3 rounded-2xl transition-all cursor-pointer border ${
                      item.isRead
                        ? 'bg-transparent hover:bg-white/[0.04] border-transparent'
                        : 'bg-primary-950/20 hover:bg-primary-900/30 border-primary-500/20 shadow-sm'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-600/30 to-accent-cyan/20 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                      {item.avatarUrl ? (
                        <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-primary-300 uppercase">
                          {item.senderName ? item.senderName.charAt(0) : 'G'}
                        </span>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-dark-900 border border-white/10">
                        {item.isChannel ? (
                          <Megaphone className="w-2.5 h-2.5 text-accent-cyan" />
                        ) : item.isGroup ? (
                          <Users className="w-2.5 h-2.5 text-primary-400" />
                        ) : (
                          <MessageSquare className="w-2.5 h-2.5 text-emerald-400" />
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-gray-100 truncate flex items-center gap-1.5">
                          <span>{item.senderName}</span>
                          {item.chatTitle && item.isGroup && (
                            <span className="text-[11px] font-normal text-gray-400 truncate">
                              ({item.chatTitle})
                            </span>
                          )}
                          {item.isDeletedLocally && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent-rose/20 text-accent-rose font-medium border border-accent-rose/30">
                              {isRTL ? 'حذف‌شده' : 'Deleted'}
                            </span>
                          )}
                        </h4>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 shrink-0">
                          <Clock className="w-2.5 h-2.5 text-gray-500" />
                          <span>{formatRelativeTime(item.date)}</span>
                        </span>
                      </div>

                      <div className="text-xs text-gray-300/90 line-clamp-2 mt-1 leading-relaxed break-words font-sans">
                        {item.mediaType === 'photo' ? (
                          <span className="inline-flex items-center gap-1 text-accent-cyan font-medium">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>{item.text || (isRTL ? 'تصویر' : 'Photo')}</span>
                          </span>
                        ) : (
                          item.text || (item.mediaType ? `[${item.mediaType}]` : (isRTL ? 'پیام جدید' : 'New message'))
                        )}
                      </div>
                    </div>

                    {/* Photo Thumbnail if available */}
                    {hasPhoto && (
                      <NotificationMediaThumbnail
                        item={item}
                        onOpenPreview={(it, url) => {
                          setPreviewPhotoItem({ item: it, url })
                        }}
                      />
                    )}

                    {/* Hover / Status actions */}
                    <div className="flex items-center gap-1 shrink-0 self-center">
                      {!item.isRead ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onMarkItemAsRead(item.id)
                          }}
                          title={isRTL ? 'علامت به عنوان خوانده‌شده' : 'Mark as read'}
                          className="p-1 rounded-lg text-primary-400 hover:text-primary-300 hover:bg-primary-500/15 transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-transparent" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteItem(item.id)
                        }}
                        title={isRTL ? 'حذف از تاریخچه' : 'Delete'}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-accent-rose hover:bg-white/5 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </motion.aside>

        {/* Full Photo Lightbox Modal */}
        <AnimatePresence>
          {previewPhotoItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setPreviewPhotoItem(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-2xl w-full bg-dark-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {/* Modal Header */}
                <div className="p-3 border-b border-white/10 flex items-center justify-between gap-3 bg-dark-950/60">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-100">
                        {previewPhotoItem.item.senderName}
                      </h4>
                      <p className="text-[10px] text-gray-400">
                        {isRTL
                          ? 'تصویر در حافظه لوکال دانلود و محافظت شده است (ضد حذف)'
                          : 'Photo downloaded and preserved in local cache (Anti-Delete)'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const it = previewPhotoItem.item
                        setPreviewPhotoItem(null)
                        onSelectNotification(it)
                        onClose()
                      }}
                      className="px-2.5 py-1 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{isRTL ? 'مشاهده در چت' : 'Open in chat'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewPhotoItem(null)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Modal Photo Area */}
                <div className="relative p-2 bg-black/60 flex items-center justify-center min-h-[300px] max-h-[70vh]">
                  <img
                    src={previewPhotoItem.url}
                    alt=""
                    className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl select-none"
                  />
                </div>

                {/* Modal Caption if any */}
                {previewPhotoItem.item.text && (
                  <div className="p-3 bg-dark-950/60 border-t border-white/5 text-xs text-gray-300 leading-relaxed font-sans">
                    {previewPhotoItem.item.text}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  )
}

