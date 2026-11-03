import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
  Pin,
  Clock,
  Play,
  Layers,
  Calendar,
  EyeOff,
  Eye,
  Check,
  Music,
  Cake,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
  Send,
} from 'lucide-react'
import type { ChatDetails, StoryItemPayload } from '../types/telegram'
import { Avatar } from './Avatar'
import { UserActivityRadar } from './UserActivityRadar'
import { UserMutualGroupsActivity } from './UserMutualGroupsActivity'
import { CustomEmojiView } from './ChatViewport'
import { StoryViewerModal } from './StoryViewerModal'
import { copyTextToClipboard } from '../utils/clipboard'
import { isRTL } from '../utils/textUtils'
import { estimateAccountAge } from '../utils/telegramAgeEstimator'
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
  const { t, language, isRTL: contextIsRTL, formatNumber } = useI18n()
  const isPersian = language === 'fa' || contextIsRTL
  const [details, setDetails] = useState<ChatDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [isBlocking, setIsBlocking] = useState(false)
  const [profileTab, setProfileTab] = useState<'activity_radar' | 'mutual_groups' | 'saved_music'>('mutual_groups')

  // Layer 232 User Features State
  const [savedMusicList, setSavedMusicList] = useState<any[]>([])
  const [isLoadingMusic, setIsLoadingMusic] = useState(false)
  const [musicError, setMusicError] = useState<string | null>(null)

  const [contactRequirements, setContactRequirements] = useState<any[]>([])

  const [isSuggestBirthdayOpen, setIsSuggestBirthdayOpen] = useState(false)
  const [birthdayDay, setBirthdayDay] = useState<number>(1)
  const [birthdayMonth, setBirthdayMonth] = useState<number>(1)
  const [birthdayYear, setBirthdayYear] = useState<string>('')
  const [isSubmittingBirthday, setIsSubmittingBirthday] = useState(false)

  // Fetch Saved Music (users.getSavedMusic & users.getSavedMusicByID)
  const fetchSavedMusic = useCallback(async () => {
    if (!accountId || !peerId || !window.guidegram?.getUserSavedMusic) return
    setIsLoadingMusic(true)
    setMusicError(null)
    try {
      const res = await window.guidegram.getUserSavedMusic(accountId, peerId, 0, 50)
      if (res && res.documents) {
        setSavedMusicList(Array.isArray(res.documents) ? res.documents : [])
      } else if (Array.isArray(res)) {
        setSavedMusicList(res)
      } else {
        setSavedMusicList([])
      }
    } catch (err: any) {
      console.warn('[UserProfileDrawer] getUserSavedMusic error:', err)
      setMusicError(err?.message || (isPersian ? 'خطا در دریافت موسیقی ذخیره‌شده' : 'Error fetching saved music'))
    } finally {
      setIsLoadingMusic(false)
    }
  }, [accountId, peerId, isPersian])

  // Fetch Contact Requirements (users.getRequirementsToContact)
  useEffect(() => {
    if (!isOpen || !peerId || !accountId || !window.guidegram?.getRequirementsToContact) {
      setContactRequirements([])
      return
    }
    let isMounted = true
    window.guidegram
      .getRequirementsToContact(accountId, [peerId])
      .then((res) => {
        if (isMounted && Array.isArray(res)) {
          setContactRequirements(res)
        }
      })
      .catch((err) => {
        console.warn('[UserProfileDrawer] getRequirementsToContact error:', err)
      })
    return () => {
      isMounted = false
    }
  }, [isOpen, accountId, peerId])

  // Trigger Saved Music when tab changes
  useEffect(() => {
    if (profileTab === 'saved_music' && peerId && accountId) {
      fetchSavedMusic()
    }
  }, [profileTab, peerId, accountId, fetchSavedMusic])

  // Handle Birthday Suggestion (users.suggestBirthday)
  const handleSuggestBirthday = async () => {
    if (!accountId || !peerId || !window.guidegram?.suggestBirthday) return
    setIsSubmittingBirthday(true)
    try {
      const yr = birthdayYear.trim() ? parseInt(birthdayYear.trim(), 10) : undefined
      const ok = await window.guidegram.suggestBirthday(
        accountId,
        peerId,
        birthdayDay,
        birthdayMonth,
        yr
      )
      if (ok) {
        onShowToast?.(
          isPersian
            ? 'پیشنهاد تاریخ تولد با موفقیت برای کاربر ارسال شد'
            : 'Birthday suggestion sent successfully'
        )
        setIsSuggestBirthdayOpen(false)
      } else {
        onShowToast?.(
          isPersian
            ? 'ارسال پیشنهاد تاریخ تولد ناموفق بود'
            : 'Failed to suggest birthday'
        )
      }
    } catch (err: any) {
      onShowToast?.(
        isPersian
          ? `خطا در ارسال پیشنهاد: ${err?.message || String(err)}`
          : `Error suggesting birthday: ${err?.message || String(err)}`
      )
    } finally {
      setIsSubmittingBirthday(false)
    }
  }

  // User Profile & Activity Tracking State
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(true)
  const [isUpdatingTracking, setIsUpdatingTracking] = useState(false)

  useEffect(() => {
    if (!isOpen || !peerId || !accountId) return
    let isMounted = true
    if (window.guidegram?.getUserTracking) {
      window.guidegram
        .getUserTracking(accountId, peerId)
        .then((enabled) => {
          if (isMounted) setIsTrackingEnabled(enabled !== false)
        })
        .catch(() => {})
    }

    const unsub = window.guidegram?.on?.('telegram:user-tracking-changed', (data: any) => {
      if (data?.userId === peerId && isMounted) {
        setIsTrackingEnabled(Boolean(data.enabled))
      }
    })

    return () => {
      isMounted = false
      unsub?.()
    }
  }, [isOpen, peerId, accountId])

  const handleToggleTracking = async () => {
    if (!peerId) return
    const next = !isTrackingEnabled
    setIsUpdatingTracking(true)
    try {
      await window.guidegram?.setUserTracking?.(peerId, next)
      setIsTrackingEnabled(next)
      onShowToast?.(
        next
          ? isPersian
            ? (isPersian ? 'رصد آنلاین و تغییرات پروفایل این کاربر فعال شد' : 'User profile & presence monitoring enabled')
            : 'User monitoring enabled'
          : isPersian
          ? (isPersian ? 'این کاربر با موفقیت از رصد خارج شد' : 'User excluded from monitoring successfully')
          : 'User excluded from monitoring'
      )
    } catch (err) {
      console.warn('[UserProfileDrawer] Failed to toggle tracking:', err)
    } finally {
      setIsUpdatingTracking(false)
    }
  }

  // Estimated Account Creation Date based on ID anchor interpolation
  const estimatedAge = useMemo(() => {
    return estimateAccountAge(peerId, isPersian)
  }, [peerId, isPersian])

  // Story & Pinned Profile Posts State
  const [pinnedStories, setPinnedStories] = useState<StoryItemPayload[]>([])
  const [activeStories, setActiveStories] = useState<StoryItemPayload[]>([])
  const [isLoadingStories, setIsLoadingStories] = useState(false)
  const [selectedStoryViewer, setSelectedStoryViewer] = useState<{
    isOpen: boolean
    tab: 'active' | 'pinned'
    initialStoryId?: number
  } | null>(null)

  // Fetch Pinned Profile Stories (Posts) and Active Stories for this user
  useEffect(() => {
    if (!isOpen || !peerId || !accountId) {
      setPinnedStories([])
      setActiveStories([])
      setIsLoadingStories(false)
      return
    }

    let active = true
    setIsLoadingStories(true)

    const pPinned = window.guidegram?.getPinnedStories
      ? window.guidegram.getPinnedStories(accountId, peerId)
      : Promise.resolve({ count: 0, stories: [] })

    const pActive = window.guidegram?.getPeerStories
      ? window.guidegram.getPeerStories(accountId, peerId)
      : Promise.resolve(null)

    Promise.allSettled([pPinned, pActive])
      .then(([pinnedRes, activeRes]) => {
        if (!active) return
        if (pinnedRes.status === 'fulfilled' && pinnedRes.value) {
          const list = Array.isArray(pinnedRes.value)
            ? pinnedRes.value
            : pinnedRes.value.stories || []
          setPinnedStories(list)
        } else {
          setPinnedStories([])
        }

        if (activeRes.status === 'fulfilled' && activeRes.value) {
          const list = Array.isArray(activeRes.value)
            ? activeRes.value
            : activeRes.value.stories || []
          setActiveStories(list)
        } else {
          setActiveStories([])
        }
      })
      .finally(() => {
        if (active) setIsLoadingStories(false)
      })

    return () => {
      active = false
    }
  }, [isOpen, accountId, peerId])

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
    onShowToast?.(t('user_profile.copied', { label }))
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
          ? t('user_profile.user_blocked')
          : t('user_profile.user_unblocked')
      )
    } catch (err: any) {
      onShowToast?.(
        t('user_profile.block_error', { error: err?.message || String(err) })
      )
    } finally {
      setIsBlocking(false)
    }
  }

  const [photoGallery, setPhotoGallery] = useState<string[]>([])
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)

  // Carousel keyboard navigation (ArrowLeft / ArrowRight)
  useEffect(() => {
    if (!lightboxUrl) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (photoGallery.length <= 1) {
          onShowToast?.(language === 'fa' ? 'تنها همین یک عکس برای این کاربر ثبت شده است' : 'No additional profile photos available')
          return
        }
        if (e.key === 'ArrowLeft') {
          setActivePhotoIndex((prev) => (prev - 1 + photoGallery.length) % photoGallery.length)
        } else if (e.key === 'ArrowRight') {
          setActivePhotoIndex((prev) => (prev + 1) % photoGallery.length)
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxUrl, photoGallery.length, language, onShowToast])

  const handleOpenPhoto = async () => {
    // 1. Immediately open whatever photo we already have (instant zero-latency UX)
    const currentAvatar = details?.avatarUrl || initialDetails?.avatarUrl
    if (currentAvatar) {
      setPhotoGallery([currentAvatar])
      setActivePhotoIndex(0)
      setLightboxUrl(currentAvatar)
    }

    try {
      // 2. Fetch full photo gallery in the background
      if (window.guidegram?.getUserProfilePhotos) {
        onShowToast?.(t('user_profile.loading_photos'))
        const photos = await window.guidegram.getUserProfilePhotos(accountId, peerId)
        if (photos && photos.length > 0) {
          setPhotoGallery(photos)
          setActivePhotoIndex(0)
          setLightboxUrl(photos[0])
          return
        }
      }

      // 3. Fallback to full resolution single photo if needed
      if (!currentAvatar && window.guidegram?.getProfilePhoto) {
        onShowToast?.(t('user_profile.loading_full_photo'))
        const big = await window.guidegram.getProfilePhoto(accountId, peerId, true)
        if (big) {
          setPhotoGallery([big])
          setActivePhotoIndex(0)
          setLightboxUrl(big)
        } else {
          onShowToast?.(t('user_profile.no_photo'))
        }
      } else if (!currentAvatar) {
        onShowToast?.(t('user_profile.no_photo'))
      }
    } catch {
      onShowToast?.(t('user_profile.photo_error'))
    }
  }

  const displayTitle = details?.title || initialDetails?.title || 'User'
  const displayUsername = details?.username || initialDetails?.username
  const displayAvatar = details?.avatarUrl || initialDetails?.avatarUrl
  const hasStories = pinnedStories.length > 0 || activeStories.length > 0

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
              title={t('user_profile.back')}
            >
              <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
            </button>
            <span className="text-sm font-bold text-gray-100">
              {t('user_profile.title')}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {isLoading && <Loader2 className="w-4 h-4 text-accent-cyan animate-spin" />}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={t('user_profile.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
          {/* Hero Avatar & Identity Card */}
          <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-dark-850/70 border border-white/5 shadow-xs">
            <div className="relative mb-3 flex items-center justify-center">
              <div
                className={`rounded-full p-1 transition-all ${
                  hasStories
                    ? 'bg-gradient-to-tr from-accent-cyan via-primary-500 to-accent-rose shadow-lg shadow-primary-500/25 ring-2 ring-white/20'
                    : ''
                }`}
              >
                <Avatar
                  accountId={accountId}
                  peerId={peerId}
                  title={displayTitle}
                  avatarUrl={displayAvatar}
                  size="xl"
                  className="cursor-pointer hover:opacity-90 transition-opacity ring-2 ring-white/10 hover:ring-accent-cyan/50"
                  onClick={() => {
                    if (hasStories) {
                      setSelectedStoryViewer({
                        isOpen: true,
                        tab: pinnedStories.length > 0 ? 'pinned' : 'active',
                        initialStoryId: pinnedStories[0]?.id || activeStories[0]?.id,
                      })
                    } else {
                      handleOpenPhoto()
                    }
                  }}
                />
              </div>
              {hasStories && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedStoryViewer({
                      isOpen: true,
                      tab: pinnedStories.length > 0 ? 'pinned' : 'active',
                      initialStoryId: pinnedStories[0]?.id || activeStories[0]?.id,
                    })
                  }
                  title={t('user_profile.view_stories')}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-gradient-to-tr from-accent-cyan to-primary-600 text-white shadow-md hover:scale-110 transition-transform cursor-pointer border border-white/30"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

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
              <span>{t('user_profile.personal_info')}</span>
            </div>
          </div>

          {/* Quick Action Buttons: Send Message, Search, Mention, Suggest Birthday */}
          <div className="grid grid-cols-4 gap-2">
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
              <span className="text-[11px] truncate">{t('user_profile.action_message')}</span>
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
              <span className="text-[11px] truncate">{t('user_profile.action_search')}</span>
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
              <span className="text-[11px] truncate">{t('user_profile.action_mention')}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSuggestBirthdayOpen(true)}
              className="p-2.5 rounded-xl bg-pink-500/15 hover:bg-pink-500/30 border border-pink-500/30 text-pink-400 hover:text-white flex flex-col items-center gap-1 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title={isPersian ? 'پیشنهاد تاریخ تولد' : 'Suggest Birthday'}
            >
              <Cake className="w-4 h-4 text-pink-400" />
              <span className="text-[11px] truncate">{isPersian ? 'پیشنهاد تولد' : 'Birthday'}</span>
            </button>
          </div>

          {/* Contact Requirements Banner (users.getRequirementsToContact) */}
          {contactRequirements.length > 0 && (
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                {isPersian
                  ? 'ارسال پیام به این کاربر نیازمند اشتراک پرمیوم یا استارز تلگرام است.'
                  : 'Messaging this user requires Telegram Premium or Stars.'}
              </span>
            </div>
          )}

          {/* Profile Stories & Pinned Posts Section */}
          {(hasStories || isLoadingStories) && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-dark-850/95 to-dark-850/70 border border-white/10 shadow-md space-y-3">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-tr from-accent-cyan/20 to-primary-500/20 text-accent-cyan border border-accent-cyan/30">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-100 flex items-center gap-1.5">
                      <span>{t('user_profile.posts_and_stories')}</span>
                    </h4>
                    <span className="text-[10px] text-gray-400">
                      {pinnedStories.length > 0 && t('user_profile.pinned_count', { count: formatNumber(pinnedStories.length) })}
                      {pinnedStories.length > 0 && activeStories.length > 0 && ' · '}
                      {activeStories.length > 0 && t('user_profile.active_count', { count: formatNumber(activeStories.length) })}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedStoryViewer({
                      isOpen: true,
                      tab: pinnedStories.length > 0 ? 'pinned' : 'active',
                      initialStoryId: pinnedStories[0]?.id || activeStories[0]?.id,
                    })
                  }
                  className="px-2.5 py-1 rounded-xl bg-primary-600/25 hover:bg-primary-600/40 border border-primary-500/30 text-primary-300 hover:text-white text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <span>{t('user_profile.view_all')}</span>
                  <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </button>
              </div>

              {/* Stories Thumbnails Carousel */}
              {isLoadingStories ? (
                <div className="flex items-center justify-center py-6 text-gray-400 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent-cyan" />
                  <span className="text-xs">{t('user_profile.loading_posts')}</span>
                </div>
              ) : (
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10 snap-x">
                  {[...pinnedStories, ...activeStories].map((story, idx) => {
                    const isPinned = pinnedStories.some((p) => p.id === story.id)
                    return (
                      <div
                        key={`profile-story-${story.id}-${idx}`}
                        onClick={() =>
                          setSelectedStoryViewer({
                            isOpen: true,
                            tab: isPinned ? 'pinned' : 'active',
                            initialStoryId: story.id,
                          })
                        }
                        className="group relative w-22 h-32 shrink-0 rounded-xl overflow-hidden bg-dark-900 border border-white/10 hover:border-accent-cyan/50 hover:shadow-lg hover:shadow-accent-cyan/15 transition-all cursor-pointer snap-start flex flex-col justify-between p-2 select-none"
                      >
                        {/* Media Thumbnail or Gradient Background */}
                        {story.thumbnailUrl ? (
                          <img
                            src={story.thumbnailUrl}
                            alt={story.caption || 'Story preview'}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-b from-dark-800 via-dark-850 to-dark-950 group-hover:scale-105 transition-transform duration-300" />
                        )}

                        {/* Dark Overlay for Readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40 group-hover:via-black/10 transition-colors" />

                        {/* Top Badges: Pinned Pin or Video Indicator */}
                        <div className="relative z-10 flex items-center justify-between w-full">
                          {isPinned ? (
                            <span
                              className="p-1 rounded-md bg-accent-cyan/80 text-dark-950 backdrop-blur-xs font-bold text-[9px] flex items-center gap-0.5 shadow-xs"
                              title={t('user_profile.pinned_badge')}
                            >
                              <Pin className="w-2.5 h-2.5 fill-current" />
                            </span>
                          ) : (
                            <span
                              className="p-1 rounded-md bg-accent-violet/80 text-white backdrop-blur-xs font-bold text-[9px] flex items-center gap-0.5 shadow-xs"
                              title={t('user_profile.active_badge')}
                            >
                              <Clock className="w-2.5 h-2.5" />
                            </span>
                          )}

                          {story.isVideo && (
                            <span className="p-1 rounded-md bg-black/50 text-white backdrop-blur-xs text-[9px]">
                              <Play className="w-2.5 h-2.5 fill-white" />
                            </span>
                          )}
                        </div>

                        {/* Hover Center Play Button */}
                        <div className="relative z-10 my-auto self-center opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 duration-200">
                          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-lg">
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                          </div>
                        </div>

                        {/* Bottom Caption or Date */}
                        <div className="relative z-10 min-w-0">
                          {story.caption ? (
                            <p className="text-[10px] text-white/90 truncate font-medium">
                              {story.caption}
                            </p>
                          ) : (
                            <span className="text-[9px] text-gray-300 font-mono">
                              {story.date ? new Date(story.date < 1e11 ? story.date * 1000 : story.date).toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US', { month: 'short', day: 'numeric' }) : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

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
                    ? t('user_profile.unblock_btn')
                    : t('user_profile.block_btn')}
                </span>
              </span>
              <span className="text-[10px] opacity-70">
                {details?.isBlocked
                  ? t('user_profile.restore_contact')
                  : t('user_profile.stop_messages')}
              </span>
            </button>
          )}

          {/* Activity & Profile Monitoring Toggle Card */}
          {peerId !== currentChatId && !details?.isBot && peerId !== accountId && (
            <div className="w-full p-3 rounded-2xl bg-dark-850/90 border border-white/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    isTrackingEnabled
                      ? 'bg-accent-cyan/15 text-accent-cyan'
                      : 'bg-rose-500/15 text-rose-400'
                  }`}
                >
                  {isTrackingEnabled ? (
                    <Activity className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-gray-200">
                    {t('user_profile.monitoring_title') || (isPersian ? 'رصد آنلاین و تغییرات پروفایل' : 'Profile & Online Monitoring')}
                  </span>
                  <span className="text-[10px] text-gray-400 truncate">
                    {isTrackingEnabled
                      ? (t('user_profile.monitoring_active') || (isPersian ? 'فعال (تغییرات و نشست‌ها ثبت می‌شوند)' : 'Active (Logging changes & sessions)'))
                      : (t('user_profile.monitoring_excluded') || (isPersian ? 'متوقف شده (خارج از رصد)' : 'Excluded from monitoring'))}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleTracking}
                disabled={isUpdatingTracking}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isTrackingEnabled
                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : 'bg-accent-cyan/15 hover:bg-accent-cyan/25 text-accent-cyan border-accent-cyan/35'
                } ${isUpdatingTracking ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isTrackingEnabled ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>{t('user_profile.btn_exclude') || (isPersian ? 'خروج از رصد' : 'Exclude')}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{t('user_profile.btn_enable') || (isPersian ? 'فعال‌سازی رصد' : 'Enable')}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Bio / About */}
          {details?.about && (
            <div className="p-3.5 rounded-2xl bg-dark-850/90 border border-white/5 space-y-1">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {t('user_profile.bio')}
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
                    {t('user_profile.user_id')}
                  </span>
                  <span className="font-mono text-xs text-gray-200">{peerId}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(peerId, t('user_profile.user_id'))}
                title={t('user_profile.copy_user_id')}
                className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Account Age / Creation Date */}
            {estimatedAge && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-dark-850/90 border border-white/5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-xl ${estimatedAge.isOfficialPeerSettings ? 'bg-accent-emerald/15 text-accent-emerald' : 'bg-accent-violet/15 text-accent-violet'} shrink-0`}>
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                        {t('user_profile.account_created')}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                        estimatedAge.isOfficialPeerSettings
                          ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30'
                          : 'bg-white/10 text-gray-300'
                      }`}>
                        {estimatedAge.isOfficialPeerSettings
                          ? t('user_profile.verified')
                          : t('user_profile.estimated')}
                      </span>
                    </div>
                    <span className="text-xs text-gray-100 font-semibold truncate">
                      {estimatedAge.formattedDate}
                    </span>
                    <span className="text-[10px] text-gray-400 truncate">
                      {estimatedAge.formattedRelative}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Username */}
            {displayUsername && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-dark-850/90 border border-white/5">
                <div className="flex items-center gap-2">
                  <AtSign className="w-4 h-4 text-accent-cyan shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                      {t('user_profile.username')}
                    </span>
                    <span className="text-xs text-gray-200 font-mono">@{displayUsername}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(`@${displayUsername}`, t('user_profile.username'))}
                  title={t('user_profile.copy_username')}
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
                      {t('user_profile.phone')}
                    </span>
                    <span className="text-xs text-gray-200 font-mono">{details.phone}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(details.phone!, t('user_profile.phone'))}
                  title={t('user_profile.copy_phone')}
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
                  <span>{t('user_profile.personal_channel')}</span>
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
                  <span>{t('user_profile.mutual_groups')}</span>
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
                  <span>{t('user_profile.online_radar')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab('saved_music')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    profileTab === 'saved_music'
                      ? 'bg-accent-violet/20 text-accent-violet border border-accent-violet/40 shadow-xs'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>{isPersian ? 'موسیقی‌ها' : 'Music'}</span>
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
              ) : profileTab === 'activity_radar' ? (
                <UserActivityRadar
                  accountId={accountId}
                  userId={peerId}
                  userName={displayTitle}
                  avatarUrl={displayAvatar}
                  currentStatus={details?.userStatus?.status}
                  lastSeen={details?.userStatus?.lastOnline}
                />
              ) : (
                /* Saved Music View with 4-state UI hygiene */
                <div className="space-y-3">
                  {isLoadingMusic ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2.5">
                      <Loader2 className="w-6 h-6 animate-spin text-accent-violet" />
                      <span className="text-xs">{isPersian ? 'در حال واکشی موسیقی‌های ذخیره‌شده...' : 'Loading saved music...'}</span>
                    </div>
                  ) : musicError ? (
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <span className="text-xs text-red-300">{musicError}</span>
                      <button
                        type="button"
                        onClick={fetchSavedMusic}
                        className="px-3 py-1 text-xs rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{isPersian ? 'تلاش مجدد' : 'Retry'}</span>
                      </button>
                    </div>
                  ) : savedMusicList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400 gap-2 rounded-xl bg-dark-900/60 border border-white/5 p-4">
                      <Music className="w-8 h-8 text-gray-500 stroke-[1.5]" />
                      <span className="text-xs font-medium text-gray-300">
                        {isPersian ? 'هیچ قطعه موسیقی ذخیره‌شده‌ای یافت نشد' : 'No saved music found for this user'}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {isPersian ? 'این کاربر لیست موسیقی عمومی ذخیره‌شده ندارد' : 'This user has no publicly accessible saved music'}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-1">
                      {savedMusicList.map((doc: any, idx: number) => {
                        const audioAttr = doc.attributes?.find((a: any) => a._ === 'documentAttributeAudio')
                        const title = audioAttr?.title || `Track #${idx + 1}`
                        const performer = audioAttr?.performer || displayTitle
                        const durationSec = audioAttr?.duration || 0
                        const mins = Math.floor(durationSec / 60)
                        const secs = durationSec % 60
                        const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`

                        return (
                          <div
                            key={doc.id || idx}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-dark-900/70 border border-white/5 hover:border-white/15 transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-accent-violet/15 text-accent-violet flex items-center justify-center shrink-0">
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-gray-200 truncate">{title}</div>
                                <div className="text-[10px] text-gray-400 truncate">{performer}</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-gray-500 shrink-0">{timeStr}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
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
                    title={t('user_profile.prev_photo')}
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
                    title={t('user_profile.next_photo')}
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

      {/* Story & Profile Posts Viewer Modal */}
      {selectedStoryViewer?.isOpen && (
        <StoryViewerModal
          isOpen={selectedStoryViewer.isOpen}
          onClose={() => setSelectedStoryViewer(null)}
          accountId={accountId}
          peerId={peerId}
          peerTitle={displayTitle}
          initialTab={selectedStoryViewer.tab}
          initialStoryId={selectedStoryViewer.initialStoryId}
        />
      )}

      {/* Suggest Birthday Modal (users.suggestBirthday) */}
      <AnimatePresence>
        {isSuggestBirthdayOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none"
            onClick={() => setIsSuggestBirthdayOpen(false)}
          >
            <div
              className="bg-dark-900 border border-white/15 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
                  <Cake className="w-4 h-4" />
                  <span>{isPersian ? 'پیشنهاد تاریخ تولد' : 'Suggest Birthday'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSuggestBirthdayOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                {isPersian
                  ? `می‌توانید تاریخ تولد پیشنهادی خود را برای ${displayTitle} ارسال کنید تا در پروفایل او نمایش داده شود.`
                  : `You can suggest a birthday date for ${displayTitle} to be displayed on their profile.`}
              </p>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold block mb-1">
                    {isPersian ? 'روز' : 'Day'}
                  </label>
                  <select
                    value={birthdayDay}
                    onChange={(e) => setBirthdayDay(Number(e.target.value))}
                    className="w-full bg-dark-800 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-hidden focus:border-pink-500"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold block mb-1">
                    {isPersian ? 'ماه' : 'Month'}
                  </label>
                  <select
                    value={birthdayMonth}
                    onChange={(e) => setBirthdayMonth(Number(e.target.value))}
                    className="w-full bg-dark-800 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-hidden focus:border-pink-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold block mb-1">
                    {isPersian ? 'سال (اختیاری)' : 'Year (opt)'}
                  </label>
                  <input
                    type="number"
                    placeholder="1995"
                    value={birthdayYear}
                    onChange={(e) => setBirthdayYear(e.target.value)}
                    className="w-full bg-dark-800 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-hidden focus:border-pink-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSuggestBirthdayOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {isPersian ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isSubmittingBirthday}
                  onClick={handleSuggestBirthday}
                  className="px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingBirthday ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{isPersian ? 'ارسال پیشنهاد' : 'Send Suggestion'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default UserProfileDrawer
