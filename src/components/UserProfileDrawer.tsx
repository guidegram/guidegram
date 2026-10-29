import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  User,
  MessageSquare,
  Search,
  AtSign,
  UserCheck,
  Ban,
  Hash,
  Copy,
  Phone,
  Radio,
  ExternalLink,
  Loader2,
  Users,
  Activity,
} from 'lucide-react'
import type { ChatDetails } from '../types/telegram'
import { Avatar } from './Avatar'
import { UserActivityRadar } from './UserActivityRadar'
import { UserMutualGroupsActivity } from './UserMutualGroupsActivity'
import { CustomEmojiView } from './ChatViewport'
import { copyTextToClipboard } from '../utils/clipboard'
import { isRTL } from '../utils/textUtils'
import { useI18n } from '../i18n'

export interface UserProfileDrawerProps {
  isOpen: boolean
  accountId: string
  peerId: string | null
  initialDetails?: Partial<ChatDetails> | null
  currentChatId?: string | null
  onClose: () => void
  onSelectUserOrChat?: (target: string, targetMsgId?: number) => void
  onSearchFromUser?: (peerId: string, title?: string) => void
  onMentionUser?: (mentionText: string) => void
  onShowToast?: (message: string) => void
}

export const UserProfileDrawer: React.FC<UserProfileDrawerProps> = ({
  isOpen,
  accountId,
  peerId,
  initialDetails,
  currentChatId,
  onClose,
  onSelectUserOrChat,
  onSearchFromUser,
  onMentionUser,
  onShowToast,
}) => {
  const { language, isRTL: contextIsRTL } = useI18n()
  const isPersian = language === 'fa' || contextIsRTL
  const [details, setDetails] = useState<ChatDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [isBlocking, setIsBlocking] = useState(false)
  const [profileTab, setProfileTab] = useState<'activity_radar' | 'mutual_groups'>('mutual_groups')

  useEffect(() => {
    if (initialDetails?.isContact || details?.isContact) {
      setProfileTab('activity_radar')
    } else {
      setProfileTab('mutual_groups')
    }
  }, [initialDetails?.isContact, details?.isContact])

  // Initialize or fetch details when peerId changes
  useEffect(() => {
    if (!isOpen || !peerId || !accountId) {
      setDetails(null)
      return
    }

    // Set initial fallback details immediately
    const fallback: ChatDetails = {
      id: peerId,
      title: initialDetails?.title || 'User',
      username: initialDetails?.username,
      avatarUrl: initialDetails?.avatarUrl,
      isChannel: false,
      isGroup: false,
      isUser: true,
      isBot: initialDetails?.isBot ?? false,
      about: initialDetails?.about,
      phone: initialDetails?.phone,
      verified: initialDetails?.verified,
      isPremium: initialDetails?.isPremium,
      customEmojiStatusId: initialDetails?.customEmojiStatusId,
      personalChannelId: initialDetails?.personalChannelId,
      personalChannelTitle: initialDetails?.personalChannelTitle,
      userStatus: initialDetails?.userStatus,
      isBlocked: initialDetails?.isBlocked,
    }
    setDetails(fallback)

    if (window.guidegram?.getChatDetails) {
      setIsLoading(true)
      window.guidegram
        .getChatDetails(accountId, peerId)
        .then((fresh) => {
          if (fresh) {
            setDetails((prev) => ({
              ...fallback,
              ...prev,
              ...fresh,
              title: fresh.title && fresh.title !== 'Chat' ? fresh.title : fallback.title,
            }))
          }
        })
        .catch((err) => {
          console.warn('[UserProfileDrawer] getChatDetails failed:', err)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [isOpen, accountId, peerId, initialDetails])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !peerId) return null

  const handleCopy = async (text: string, label: string) => {
    await copyTextToClipboard(text)
    onShowToast?.(isPersian ? `${label} کپی شد` : `Copied ${label}`)
  }

  const handleToggleBlock = async () => {
    if (!details || isBlocking || !window.guidegram?.blockUser) return
    const nextBlocked = !details.isBlocked
    setIsBlocking(true)
    try {
      await window.guidegram.blockUser(accountId, peerId, nextBlocked)
      setDetails((prev) => (prev ? { ...prev, isBlocked: nextBlocked } : null))
      onShowToast?.(
        nextBlocked
          ? (isPersian ? 'کاربر مسدود شد' : 'User blocked')
          : (isPersian ? 'کاربر رفع انسداد شد' : 'User unblocked')
      )
    } catch (err: any) {
      onShowToast?.(
        isPersian
          ? `خطا در تغییر وضعیت انسداد: ${err?.message || err}`
          : `Failed to update block status: ${err?.message || err}`
      )
    } finally {
      setIsBlocking(false)
    }
  }

  const [photoGallery, setPhotoGallery] = useState<string[]>([])
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)

  // Carousel keyboard navigation (ArrowLeft / ArrowRight)
  useEffect(() => {
    if (!lightboxUrl || photoGallery.length <= 1) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setActivePhotoIndex((prev) => (prev - 1 + photoGallery.length) % photoGallery.length)
      } else if (e.key === 'ArrowRight') {
        setActivePhotoIndex((prev) => (prev + 1) % photoGallery.length)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxUrl, photoGallery.length])

  const handleOpenPhoto = async () => {
    try {
      // 1. Try fetching all profile photos (active and historical)
      if (window.guidegram?.getUserProfilePhotos) {
        onShowToast?.(isPersian ? 'در حال دریافت عکس‌های پروفایل...' : 'Loading profile photos...')
        const photos = await window.guidegram.getUserProfilePhotos(accountId, peerId)
        if (photos && photos.length > 0) {
          setPhotoGallery(photos)
          setActivePhotoIndex(0)
          setLightboxUrl(photos[0])
          return
        }
      }

      // 2. Fallback to single photo
      if (details?.avatarUrl) {
        setPhotoGallery([details.avatarUrl])
        setActivePhotoIndex(0)
        setLightboxUrl(details.avatarUrl)
      } else if (window.guidegram?.getProfilePhoto) {
        onShowToast?.(isPersian ? 'در حال بارگذاری عکس باکیفیت...' : 'Loading full profile photo...')
        const big = await window.guidegram.getProfilePhoto(accountId, peerId, true)
        if (big) {
          setPhotoGallery([big])
          setActivePhotoIndex(0)
          setLightboxUrl(big)
        } else {
          onShowToast?.(isPersian ? 'عکس پروفایلی یافت نشد' : 'No profile photo found')
        }
      } else {
        onShowToast?.(isPersian ? 'عکس پروفایلی یافت نشد' : 'No profile photo found')
      }
    } catch {
      onShowToast?.(isPersian ? 'خطا در بارگذاری عکس پروفایل' : 'Could not load profile photo')
    }
  }

  const displayTitle = details?.title || initialDetails?.title || 'User'
  const displayUsername = details?.username || initialDetails?.username
  const displayAvatar = details?.avatarUrl || initialDetails?.avatarUrl

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-84 sm:w-96 h-full bg-dark-900 border-l border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 select-none z-10"
      >
        {/* Header */}
        <div className="h-14 px-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-dark-850/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={isPersian ? 'بازگشت' : 'Back'}
            >
              <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
            </button>
            <span className="text-sm font-bold text-gray-100">
              {isPersian ? 'پروفایل کاربر' : 'User Profile'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {isLoading && <Loader2 className="w-4 h-4 text-accent-cyan animate-spin" />}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={isPersian ? 'بستن' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
          {/* Hero Avatar & Identity Card */}
          <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-dark-850/70 border border-white/5 shadow-xs">
            <Avatar
              accountId={accountId}
              peerId={peerId}
              title={displayTitle}
              avatarUrl={displayAvatar}
              size="xl"
              className="mb-3 cursor-pointer hover:opacity-90 transition-opacity ring-2 ring-white/10 hover:ring-accent-cyan/50"
              onClick={handleOpenPhoto}
            />

            <div className="flex items-center justify-center gap-1.5 mb-1 px-2 max-w-full">
              <h3
                dir={isRTL(displayTitle) ? 'rtl' : 'ltr'}
                className="text-base font-bold text-white truncate"
              >
                {displayTitle}
              </h3>
              {details?.customEmojiStatusId ? (
                <CustomEmojiView
                  accountId={accountId}
                  documentId={details.customEmojiStatusId}
                  fallback="⭐"
                  className="inline-block w-5 h-5 align-middle select-none shrink-0"
                />
              ) : details?.isPremium ? (
                <Sparkles className="w-4 h-4 text-accent-cyan fill-accent-cyan shrink-0" />
              ) : null}
              {details?.verified && (
                <span className="text-primary-400 text-xs font-bold" title="Verified">✓</span>
              )}
            </div>

            <div className="text-xs text-gray-400 flex items-center gap-1.5">
              <User className="w-3 h-3 text-accent-cyan" />
              <span>{isPersian ? 'اطلاعات کاربری' : 'Personal Profile'}</span>
            </div>
          </div>

          {/* Quick Action Buttons: Send Message, Search, Mention */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                onClose()
                if (onSelectUserOrChat) {
                  onSelectUserOrChat(displayUsername || peerId)
                }
              }}
              className="p-2.5 rounded-xl bg-primary-600/20 hover:bg-primary-600/35 border border-primary-500/30 text-primary-300 hover:text-white flex flex-col items-center gap-1 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <MessageSquare className="w-4 h-4 text-primary-400" />
              <span className="text-[11px]">{isPersian ? 'گفتگو' : 'Message'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose()
                if (onSearchFromUser) {
                  onSearchFromUser(peerId, displayTitle)
                } else if (onSelectUserOrChat) {
                  onSelectUserOrChat(displayUsername || peerId)
                }
              }}
              className="p-2.5 rounded-xl bg-accent-cyan/15 hover:bg-accent-cyan/30 border border-accent-cyan/30 text-accent-cyan hover:text-white flex flex-col items-center gap-1 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <Search className="w-4 h-4 text-accent-cyan" />
              <span className="text-[11px]">{isPersian ? 'جستجو' : 'Search'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const mention = displayUsername
                  ? `@${displayUsername} `
                  : `${displayTitle} `
                onClose()
                onMentionUser?.(mention)
              }}
              className="p-2.5 rounded-xl bg-accent-violet/15 hover:bg-accent-violet/30 border border-accent-violet/30 text-accent-violet hover:text-white flex flex-col items-center gap-1 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <AtSign className="w-4 h-4 text-accent-violet" />
              <span className="text-[11px]">{isPersian ? 'منشن' : 'Mention'}</span>
            </button>
          </div>

          {/* Block / Unblock User Action */}
          {peerId !== currentChatId && !details?.isBot && (
            <button
              type="button"
              disabled={isBlocking}
              onClick={handleToggleBlock}
              className={`w-full p-3 rounded-2xl border flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                details?.isBlocked
                  ? 'bg-accent-emerald/10 hover:bg-accent-emerald/20 border-accent-emerald/25 text-accent-emerald'
                  : 'bg-accent-rose/10 hover:bg-accent-rose/20 border-accent-rose/25 text-accent-rose'
              } ${isBlocking ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="flex items-center gap-2.5 text-xs font-semibold">
                {details?.isBlocked ? (
                  <UserCheck className="w-4 h-4" />
                ) : (
                  <Ban className="w-4 h-4" />
                )}
                <span>
                  {details?.isBlocked
                    ? (isPersian ? 'رفع مسدودیت کاربر' : 'Unblock User')
                    : (isPersian ? 'مسدود کردن کاربر' : 'Block User')}
                </span>
              </span>
              <span className="text-[10px] opacity-70">
                {details?.isBlocked
                  ? (isPersian ? 'فعال‌سازی مجدد' : 'Restore contact')
                  : (isPersian ? 'قطع دریافت پیام' : 'Stop messages')}
              </span>
            </button>
          )}

          {/* Bio / About */}
          {details?.about && (
            <div className="p-3.5 rounded-2xl bg-dark-850/90 border border-white/5 space-y-1">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {isPersian ? 'بیوگرافی' : 'Bio'}
              </div>
              <p
                dir={isRTL(details.about) ? 'rtl' : 'ltr'}
                className="text-xs text-gray-200 whitespace-pre-wrap select-text leading-relaxed"
              >
                {details.about}
              </p>
            </div>
          )}

          {/* Metadata Cards: User ID, Username, Phone */}
          <div className="space-y-2">
            {/* User ID */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-dark-850/90 border border-white/5">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-accent-cyan shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                    {isPersian ? 'شناسه عددی کاربر' : 'User ID'}
                  </span>
                  <span className="font-mono text-xs text-gray-200">{peerId}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(peerId, isPersian ? 'شناسه کاربری' : 'User ID')}
                title={isPersian ? 'کپی شناسه عددی' : 'Copy User ID'}
                className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Username */}
            {displayUsername && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-dark-850/90 border border-white/5">
                <div className="flex items-center gap-2">
                  <AtSign className="w-4 h-4 text-accent-cyan shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                      {isPersian ? 'نام کاربری' : 'Username'}
                    </span>
                    <span className="text-xs text-gray-200 font-mono">@{displayUsername}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(`@${displayUsername}`, isPersian ? 'نام کاربری' : 'Username')}
                  title={isPersian ? 'کپی نام کاربری' : 'Copy Username'}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Phone Number */}
            {details?.phone && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-dark-850/90 border border-white/5">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-accent-emerald shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                      {isPersian ? 'شماره تماس' : 'Phone'}
                    </span>
                    <span className="text-xs text-gray-200 font-mono">{details.phone}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(details.phone!, isPersian ? 'شماره تماس' : 'Phone')}
                  title={isPersian ? 'کپی شماره' : 'Copy Phone'}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Personal Channel Card */}
          {details?.personalChannelId && (
            <div
              onClick={() => {
                onClose()
                if (onSelectUserOrChat) {
                  onSelectUserOrChat(details.personalChannelId!)
                }
              }}
              className="p-3 rounded-2xl bg-gradient-to-r from-primary-950/40 via-dark-850/90 to-dark-850 border border-primary-500/20 hover:border-primary-500/40 transition-all cursor-pointer space-y-1 group"
            >
              <div className="text-[10px] font-bold text-primary-400 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Radio className="w-3 h-3" />
                  <span>{isPersian ? 'کانال شخصی کاربر' : 'Personal Channel'}</span>
                </span>
                <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
              </div>
              <div className="text-xs font-semibold text-white truncate">
                {details.personalChannelTitle || `Channel #${details.personalChannelId}`}
              </div>
            </div>
          )}

          {/* Activity / Mutual Groups Tabs Switcher */}
          {peerId && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-dark-900 border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setProfileTab('mutual_groups')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    profileTab === 'mutual_groups'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{isPersian ? 'گروه‌های مشترک و فعالیت' : 'Mutual Groups'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab('activity_radar')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    profileTab === 'activity_radar'
                      ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40 shadow-xs'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>{isPersian ? 'رادار آنلاین مخاطب' : 'Online Radar'}</span>
                </button>
              </div>

              {profileTab === 'mutual_groups' ? (
                <UserMutualGroupsActivity
                  accountId={accountId}
                  userId={peerId}
                  userName={displayTitle}
                  currentChatId={currentChatId}
                  onJumpToMessage={(chatId, msgId) => {
                    onClose()
                    onSelectUserOrChat?.(chatId, msgId)
                  }}
                />
              ) : (
                <UserActivityRadar
                  accountId={accountId}
                  userId={peerId}
                  userName={displayTitle}
                  avatarUrl={displayAvatar}
                  currentStatus={details?.userStatus?.status}
                  lastSeen={details?.userStatus?.lastOnline}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Lightbox Modal with Multi-Photo Gallery Support */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setLightboxUrl(null)
              setPhotoGallery([])
            }}
            className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none"
          >
            <div
              className="relative max-w-3xl max-h-[85vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={photoGallery[activePhotoIndex] || lightboxUrl}
                alt={displayTitle}
                className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain border border-white/10"
              />

              {/* Multi-Photo Carousel Navigation */}
              {photoGallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActivePhotoIndex((prev) => (prev - 1 + photoGallery.length) % photoGallery.length)
                    }}
                    className="absolute -left-14 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-dark-900/80 hover:bg-dark-900 text-white/90 hover:text-white transition-all cursor-pointer border border-white/10 shadow-xl"
                    title={isPersian ? 'عکس قبلی' : 'Previous photo'}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActivePhotoIndex((prev) => (prev + 1) % photoGallery.length)
                    }}
                    className="absolute -right-14 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-dark-900/80 hover:bg-dark-900 text-white/90 hover:text-white transition-all cursor-pointer border border-white/10 shadow-xl"
                    title={isPersian ? 'عکس بعدی' : 'Next photo'}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <div className="mt-3 px-3.5 py-1 rounded-full bg-dark-900/90 border border-white/10 text-xs font-mono text-gray-200 shadow-md">
                    {activePhotoIndex + 1} / {photoGallery.length}
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setLightboxUrl(null)
                  setPhotoGallery([])
                }}
                className="absolute top-4 right-4 p-2 rounded-full bg-dark-900/80 hover:bg-dark-900 text-white/80 hover:text-white transition-colors cursor-pointer border border-white/10 shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default UserProfileDrawer
