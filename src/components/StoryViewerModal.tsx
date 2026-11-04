import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Calendar,
  Sparkles,
  Loader2,
  AlertCircle,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Trash2,
  Share2,
  Pin,
  Check,
  Heart,
  Smile,
  Edit3,
  FolderPlus,
  FolderMinus,
  ShieldAlert,
  Send,
  Layers,
  BookOpen,
} from 'lucide-react'
import { PeerStoriesPayload } from '../types/telegram'
import { motion, AnimatePresence } from 'motion/react'
import { Avatar } from './Avatar'
import { useI18n } from '../i18n'

interface StoryViewerModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  peerId: string
  peerTitle: string
  ghostMode?: boolean
  initialTab?: 'active' | 'pinned' | 'archive'
  initialStoryId?: number
  onDeleted?: () => void
}

const IMAGE_DURATION_MS = 7000

const formatStoryTime = (timestamp?: number): string => {
  if (!timestamp) return ''
  try {
    return new Date(timestamp * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (_) {
    return ''
  }
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  isOpen,
  onClose,
  accountId,
  peerId,
  peerTitle,
  ghostMode = false,
  initialTab = 'active',
  initialStoryId,
  onDeleted,
}) => {
  const { t, language, isRTL } = useI18n()
  const isPersian = language === 'fa' || isRTL
  const [peerStories, setPeerStories] = useState<PeerStoriesPayload | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [isVideo, setIsVideo] = useState(false)
  const [muted, setMuted] = useState(true)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [copyingLink, setCopyingLink] = useState(false)
  const [pinning, setPinning] = useState(false)
  const [pinnedState, setPinnedState] = useState<boolean | undefined>(undefined)
  const [localGhostMode, setLocalGhostMode] = useState(ghostMode)
  const [activeReaction, setActiveReaction] = useState<string | null>(null)
  const [reactionFeedback, setReactionFeedback] = useState<string | null>(null)
  const [storyTab, setStoryTab] = useState<'active' | 'pinned' | 'archive'>(initialTab || 'active')

  // --- Microphase 120: Stories Domain Suite Part 1 States ---
  const [canSendStoryStatus, setCanSendStoryStatus] = useState<boolean | null>(null)
  const [canSendStoryLoading, setCanSendStoryLoading] = useState(false)

  // Stealth Mode State (stories.activateStealthMode)
  const [stealthModalOpen, setStealthModalOpen] = useState(false)
  const [stealthPast, setStealthPast] = useState(true)
  const [stealthFuture, setStealthFuture] = useState(true)
  const [stealthLoading, setStealthLoading] = useState(false)
  const [stealthFeedback, setStealthFeedback] = useState<string | null>(null)

  // Edit Story State (stories.editStory)
  const [editCaptionModalOpen, setEditCaptionModalOpen] = useState(false)
  const [newCaptionText, setNewCaptionText] = useState('')
  const [editingStoryLoading, setEditingStoryLoading] = useState(false)
  const [editStoryFeedback, setEditStoryFeedback] = useState<string | null>(null)

  // Album State (stories.createAlbum & stories.deleteAlbum)
  const [albumModalOpen, setAlbumModalOpen] = useState(false)
  const [albumTitle, setAlbumTitle] = useState('')
  const [albumDeleteId, setAlbumDeleteId] = useState('')
  const [albumLoading, setAlbumLoading] = useState(false)
  const [albumFeedback, setAlbumFeedback] = useState<string | null>(null)

  // --- Microphase 121: Stories Domain Suite Part 2 States ---
  // Albums list & stories (stories.getAlbums & stories.getAlbumStories)
  const [albumsList, setAlbumsList] = useState<any[]>([])
  const [loadingAlbums, setLoadingAlbums] = useState(false)
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null)
  const [selectedAlbumStories, setSelectedAlbumStories] = useState<any[] | null>(null)
  const [loadingAlbumStories, setLoadingAlbumStories] = useState(false)

  // Allowed chats to send stories (stories.getChatsToSend)
  const [chatsToSendModalOpen, setChatsToSendModalOpen] = useState(false)
  const [chatsToSendList, setChatsToSendList] = useState<any[]>([])
  const [loadingChatsToSend, setLoadingChatsToSend] = useState(false)

  // Global all stories feed (stories.getAllStories)
  const [allStoriesFeedOpen, setAllStoriesFeedOpen] = useState(false)
  const [allStoriesFeed, setAllStoriesFeed] = useState<any[]>([])
  const [loadingAllStories, setLoadingAllStories] = useState(false)

  // Peer Max IDs sync (stories.getPeerMaxIDs)
  const [peerMaxId, setPeerMaxId] = useState<number | null>(null)

  useEffect(() => {
    if (initialTab) {
      setStoryTab(initialTab)
    }
  }, [initialTab])

  const videoRef = useRef<HTMLVideoElement>(null)
  const pausedRef = useRef(false)

  const stories = peerStories?.stories || []
  const currentStory = stories[currentIndex]
  const currentStoryId = currentStory?.id
  const isOwnStory = peerId === accountId || Boolean(currentStory?.isOut)

  // MTProto stories.readStories sync (when not in Ghost / Stealth mode)
  useEffect(() => {
    if (!currentStoryId || localGhostMode || !accountId || !peerId) return
    if (window.guidegram?.readStories) {
      window.guidegram.readStories(accountId, peerId, currentStoryId).catch(() => {})
    }
  }, [currentStoryId, localGhostMode, accountId, peerId])

  const handleSendReaction = async (emoticon: string) => {
    if (!currentStoryId || !accountId || !peerId) return
    setActiveReaction(emoticon)
    setReactionFeedback(emoticon)
    setTimeout(() => setReactionFeedback(null), 1500)
    try {
      if (window.guidegram?.sendStoryReaction) {
        await window.guidegram.sendStoryReaction(accountId, peerId, currentStoryId, emoticon)
      }
    } catch (err) {
      console.warn('Failed to send story reaction:', err)
    }
  }

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    if (!isOpen || !accountId || !peerId) return
    let active = true
    setLoading(true)
    setLoadError(null)
    setPeerStories(null)
    setCurrentIndex(0)
    setMediaUrl(null)
    setMediaError(null)
    setMediaLoading(false)
    setIsVideo(false)
    setProgress(0)
    setPaused(false)
    setMuted(true)
    setDeleting(false)
    setDeleteError(null)

    let request: Promise<any> | undefined
    if (storyTab === 'pinned') {
      request = window.guidegram?.getPinnedStories?.(accountId, peerId)
    } else if (storyTab === 'archive') {
      request = window.guidegram?.getStoriesArchive?.(accountId, peerId)
    } else {
      if ((window as any).guidegram?.storiesGetPeerStoriesRaw) {
        request = (window as any).guidegram.storiesGetPeerStoriesRaw(accountId, { peerId })
      } else {
        request = window.guidegram?.getPeerStories?.(accountId, peerId)
      }
    }

    if (!request) {
      setLoadError(t('story_viewer.service_unavailable'))
      setLoading(false)
      return
    }

    request
      .then((data) => {
        if (!active) return
        if (!data) {
          setLoadError(
            storyTab === 'pinned'
              ? t('story_viewer.no_pinned')
              : storyTab === 'archive'
                ? t('story_viewer.no_archived')
                : t('story_viewer.no_active')
          )
          setLoading(false)
          return
        }
        const rawList = Array.isArray(data) ? data : data.stories || []
        const sortedStories = [...rawList].sort((a, b) => a.date - b.date)
        if (sortedStories.length === 0) {
          setLoadError(
            storyTab === 'pinned'
              ? t('story_viewer.no_pinned')
              : storyTab === 'archive'
                ? t('story_viewer.no_archived')
                : t('story_viewer.no_active')
          )
          setLoading(false)
          return
        }
        setPeerStories({
          peer: data.peer || { _: 'peerUser', userId: peerId },
          stories: sortedStories,
        } as any)
        if (initialStoryId) {
          const targetIdx = sortedStories.findIndex((s) => s.id === initialStoryId)
          if (targetIdx >= 0) {
            setCurrentIndex(targetIdx)
          }
        }
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setLoadError(
          storyTab === 'pinned'
            ? t('story_viewer.no_pinned')
            : storyTab === 'archive'
              ? t('story_viewer.no_archived')
              : t('story_viewer.no_active')
        )
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [isOpen, accountId, peerId, storyTab])

  useEffect(() => {
    if (!isOpen || !currentStoryId) {
      setMediaUrl(null)
      setMediaError(null)
      setMediaLoading(false)
      setIsVideo(false)
      return
    }

    let active = true
    setMediaUrl(null)
    setMediaError(null)
    setMediaLoading(true)
    setIsVideo(false)

    const request = window.guidegram?.getStoryMedia?.(accountId, peerId, currentStoryId)
    if (!request) {
      setMediaError('Story media is unavailable.')
      setMediaLoading(false)
      return
    }

    request
      .then((result) => {
        if (!active) return
        if (!result?.mediaUrl) {
          setMediaError(result?.error || 'Unable to load this story media.')
          setMediaLoading(false)
          return
        }
        setMediaUrl(result.mediaUrl)
        setIsVideo(Boolean(result.isVideo))
        setMediaLoading(false)
      })
      .catch((err: any) => {
        if (!active) return
        setMediaError(err?.message || 'Unable to load this story media.')
        setMediaLoading(false)
      })

    return () => {
      active = false
    }
  }, [isOpen, accountId, peerId, currentStoryId])

  useEffect(() => {
    setProgress(0)
    setPaused(false)
  }, [currentStoryId])

  const goNext = useCallback(() => {
    if (currentIndex >= stories.length - 1) {
      onClose()
      return
    }
    setCurrentIndex(currentIndex + 1)
  }, [currentIndex, stories.length, onClose])

  const goPrev = useCallback(() => {
    if (currentIndex <= 0) {
      setProgress(0)
      if (videoRef.current) videoRef.current.currentTime = 0
      return
    }
    setCurrentIndex(currentIndex - 1)
  }, [currentIndex])

  const goNextRef = useRef(goNext)
  useEffect(() => {
    goNextRef.current = goNext
  }, [goNext])

  const handleDeleteStory = useCallback(async () => {
    if (!currentStoryId || deleting) return
    if (!window.confirm(isPersian ? 'آیا از حذف این استوری اطمینان دارید؟' : 'Delete this story? This cannot be undone.')) return

    setDeleting(true)
    setDeleteError(null)
    try {
      let removed = false
      if ((window as any).guidegram?.storiesDeleteStoriesRaw) {
        const rawRes = await (window as any).guidegram.storiesDeleteStoriesRaw(accountId, { peerId, id: [currentStoryId] })
        removed = Boolean(rawRes && !rawRes.error)
      }
      if (!removed && window.guidegram?.deleteStory) {
        removed = await window.guidegram.deleteStory(accountId, currentStoryId, peerId)
      }
      if (!removed) {
        setDeleteError(isPersian ? 'امکان حذف این استوری وجود ندارد' : 'Unable to delete this story.')
        return
      }

      onDeleted?.()

      const refreshed = await window.guidegram.getPeerStories(accountId, peerId)
      const remaining = [...(refreshed?.stories || [])].sort((a, b) => a.date - b.date)
      if (remaining.length === 0) {
        onClose()
        return
      }

      setPeerStories({ ...refreshed!, stories: remaining })
      setCurrentIndex((index) => Math.min(index, remaining.length - 1))
    } catch (err: any) {
      setDeleteError(err?.message || 'Unable to delete this story.')
    } finally {
      setDeleting(false)
    }
  }, [accountId, currentStoryId, deleting, onClose, onDeleted, peerId, isPersian])

  const handleCopyLink = useCallback(async () => {
    if (!currentStoryId || copyingLink) return
    setCopyingLink(true)
    try {
      let link: string | null = null
      if ((window as any).guidegram?.storiesExportStoryLinkRaw) {
        const rawRes = await (window as any).guidegram.storiesExportStoryLinkRaw(accountId, { peerId, id: currentStoryId })
        link = rawRes?.link || (typeof rawRes === 'string' ? rawRes : null)
      }
      if (!link && window.guidegram?.exportStoryLink) {
        link = await window.guidegram.exportStoryLink(accountId, peerId, currentStoryId)
      }
      if (link) {
        await navigator.clipboard.writeText(link)
        setTimeout(() => setCopyingLink(false), 2000)
      } else {
        setCopyingLink(false)
      }
    } catch (_) {
      setCopyingLink(false)
    }
  }, [accountId, peerId, currentStoryId, copyingLink])

  const handleTogglePin = useCallback(async () => {
    if (!currentStoryId || pinning) return
    setPinning(true)
    try {
      const nextPinned = pinnedState !== undefined ? !pinnedState : !currentStory?.isPinned
      await window.guidegram.toggleStoryPinned(accountId, [currentStoryId], nextPinned, peerId)
      setPinnedState(nextPinned)
    } catch (_) {
    } finally {
      setPinning(false)
    }
  }, [accountId, peerId, currentStoryId, pinning, pinnedState, currentStory])

  // Check canSendStory (stories.canSendStory)
  const checkCanSendStory = useCallback(async () => {
    if (!accountId || !peerId) return
    setCanSendStoryLoading(true)
    try {
      if ((window as any).guidegram?.storiesCanSendStoryRaw) {
        const res = await (window as any).guidegram.storiesCanSendStoryRaw(accountId, { peerId })
        setCanSendStoryStatus(res?.can_send ?? (typeof res === 'boolean' ? res : true))
      }
    } catch (_) {
      setCanSendStoryStatus(null)
    } finally {
      setCanSendStoryLoading(false)
    }
  }, [accountId, peerId])

  useEffect(() => {
    if (isOpen) {
      checkCanSendStory()
    }
  }, [isOpen, checkCanSendStory])

  // Activate Telegram Stealth Mode (stories.activateStealthMode)
  const handleActivateStealthMode = useCallback(async () => {
    if (!accountId) return
    setStealthLoading(true)
    setStealthFeedback(null)
    try {
      let res: any = null
      if ((window as any).guidegram?.storiesActivateStealthModeRaw) {
        res = await (window as any).guidegram.storiesActivateStealthModeRaw(accountId, {
          past: stealthPast,
          future: stealthFuture,
        })
      }
      if (res?.error) {
        setStealthFeedback(`خطا: ${res.error}`)
      } else {
        setStealthFeedback(isPersian ? 'حالت روح تلگرام با موفقیت فعال شد' : 'Telegram Stealth Mode activated')
        setLocalGhostMode(true)
        setTimeout(() => setStealthModalOpen(false), 1600)
      }
    } catch (err: any) {
      const msg = err?.message || 'Error activating stealth mode'
      setStealthFeedback(msg.includes('FLOOD_WAIT') ? 'محدودیت زمانی تلگرام (FLOOD_WAIT)' : msg)
    } finally {
      setStealthLoading(false)
    }
  }, [accountId, stealthPast, stealthFuture, isPersian])

  // Open Edit Caption Modal
  const handleOpenEditCaption = useCallback(() => {
    setNewCaptionText(currentStory?.caption || '')
    setEditStoryFeedback(null)
    setEditCaptionModalOpen(true)
    setPaused(true)
  }, [currentStory])

  // Save Edited Story Caption (stories.editStory)
  const handleSaveEditedStory = useCallback(async () => {
    if (!accountId || !peerId || !currentStoryId) return
    setEditingStoryLoading(true)
    setEditStoryFeedback(null)
    try {
      let res: any = null
      if ((window as any).guidegram?.storiesEditStoryRaw) {
        res = await (window as any).guidegram.storiesEditStoryRaw(accountId, {
          peerId,
          id: currentStoryId,
          caption: newCaptionText,
        })
      }
      if (res?.error) {
        setEditStoryFeedback(`خطا: ${res.error}`)
      } else {
        setEditStoryFeedback(isPersian ? 'کپشن با موفقیت به‌روزرسانی شد' : 'Caption updated')
        if (peerStories) {
          const updated = peerStories.stories.map((st) =>
            st.id === currentStoryId ? { ...st, caption: newCaptionText } : st
          )
          setPeerStories({ ...peerStories, stories: updated })
        }
        setTimeout(() => setEditCaptionModalOpen(false), 1400)
      }
    } catch (err: any) {
      setEditStoryFeedback(err?.message || 'Error updating story caption')
    } finally {
      setEditingStoryLoading(false)
    }
  }, [accountId, peerId, currentStoryId, newCaptionText, peerStories, isPersian])

  // Create Album (stories.createAlbum)
  const handleCreateAlbum = useCallback(async () => {
    if (!accountId || !peerId || !albumTitle.trim()) return
    setAlbumLoading(true)
    setAlbumFeedback(null)
    try {
      let res: any = null
      if ((window as any).guidegram?.storiesCreateAlbumRaw) {
        res = await (window as any).guidegram.storiesCreateAlbumRaw(accountId, {
          peerId,
          title: albumTitle.trim(),
          stories: currentStoryId ? [currentStoryId] : undefined,
        })
      }
      if (res?.error) {
        setAlbumFeedback(`خطا: ${res.error}`)
      } else {
        setAlbumFeedback(isPersian ? 'آلبوم استوری با موفقیت ایجاد شد' : 'Story album created')
        setAlbumTitle('')
        setTimeout(() => setAlbumModalOpen(false), 1500)
      }
    } catch (err: any) {
      setAlbumFeedback(err?.message || 'Error creating story album')
    } finally {
      setAlbumLoading(false)
    }
  }, [accountId, peerId, albumTitle, currentStoryId, isPersian])

  // Delete Album (stories.deleteAlbum)
  const handleDeleteAlbum = useCallback(async () => {
    if (!accountId || !peerId || !albumDeleteId.trim()) return
    setAlbumLoading(true)
    setAlbumFeedback(null)
    try {
      let res: any = null
      if ((window as any).guidegram?.storiesDeleteAlbumRaw) {
        res = await (window as any).guidegram.storiesDeleteAlbumRaw(accountId, {
          peerId,
          albumId: parseInt(albumDeleteId.trim(), 10),
        })
      }
      if (res?.error) {
        setAlbumFeedback(`خطا: ${res.error}`)
      } else {
        setAlbumFeedback(isPersian ? 'آلبوم استوری حذف شد' : 'Story album deleted')
        setAlbumDeleteId('')
        setTimeout(() => setAlbumModalOpen(false), 1500)
      }
    } catch (err: any) {
      setAlbumFeedback(err?.message || 'Error deleting story album')
    } finally {
      setAlbumLoading(false)
    }
  }, [accountId, peerId, albumDeleteId, isPersian])

  // --- Microphase 121 Callbacks ---
  // Fetch albums using stories.getAlbums
  const fetchAlbums = useCallback(async () => {
    if (!accountId || !peerId) return
    setLoadingAlbums(true)
    try {
      if ((window as any).guidegram?.storiesGetAlbumsRaw) {
        const res = await (window as any).guidegram.storiesGetAlbumsRaw(accountId, { peerId })
        const rawAlbums = res?.albums || (Array.isArray(res) ? res : [])
        setAlbumsList(rawAlbums)
      }
    } catch (_) {
      setAlbumsList([])
    } finally {
      setLoadingAlbums(false)
    }
  }, [accountId, peerId])

  // Fetch stories of a specific album using stories.getAlbumStories
  const handleLoadAlbumStories = useCallback(async (albumId: number) => {
    if (!accountId || !peerId) return
    setSelectedAlbumId(albumId)
    setLoadingAlbumStories(true)
    try {
      if ((window as any).guidegram?.storiesGetAlbumStoriesRaw) {
        const res = await (window as any).guidegram.storiesGetAlbumStoriesRaw(accountId, { peerId, albumId })
        const stList = res?.stories || (Array.isArray(res) ? res : [])
        setSelectedAlbumStories(stList)
      }
    } catch (_) {
      setSelectedAlbumStories([])
    } finally {
      setLoadingAlbumStories(false)
    }
  }, [accountId, peerId])

  // Fetch chats to send stories using stories.getChatsToSend
  const handleOpenChatsToSend = useCallback(async () => {
    setPaused(true)
    setChatsToSendModalOpen(true)
    if (!accountId) return
    setLoadingChatsToSend(true)
    try {
      if ((window as any).guidegram?.storiesGetChatsToSendRaw) {
        const res = await (window as any).guidegram.storiesGetChatsToSendRaw(accountId)
        const chats = res?.chats || (Array.isArray(res) ? res : [])
        setChatsToSendList(chats)
      }
    } catch (_) {
      setChatsToSendList([])
    } finally {
      setLoadingChatsToSend(false)
    }
  }, [accountId])

  // Sync peer max IDs using stories.getPeerMaxIDs
  const syncPeerMaxIDs = useCallback(async () => {
    if (!accountId || !peerId) return
    try {
      if ((window as any).guidegram?.storiesGetPeerMaxIDsRaw) {
        const res = await (window as any).guidegram.storiesGetPeerMaxIDsRaw(accountId, { idId: peerId })
        if (res?.max_id) {
          setPeerMaxId(res.max_id)
        }
      }
    } catch (_) {}
  }, [accountId, peerId])

  useEffect(() => {
    if (isOpen) {
      syncPeerMaxIDs()
    }
  }, [isOpen, syncPeerMaxIDs])

  // Query global feed using stories.getAllStories
  const handleOpenAllStoriesFeed = useCallback(async () => {
    setPaused(true)
    setAllStoriesFeedOpen(true)
    if (!accountId) return
    setLoadingAllStories(true)
    try {
      if ((window as any).guidegram?.storiesGetAllStoriesRaw) {
        const res = await (window as any).guidegram.storiesGetAllStoriesRaw(accountId, {})
        const list = res?.peer_stories || res?.stories || (Array.isArray(res) ? res : [])
        setAllStoriesFeed(list)
      }
    } catch (_) {
      setAllStoriesFeed([])
    } finally {
      setLoadingAllStories(false)
    }
  }, [accountId])

  // Mark all read peer stories using stories.getAllReadPeerStories
  const handleMarkAllRead = useCallback(async () => {
    if (!accountId) return
    try {
      if ((window as any).guidegram?.storiesGetAllReadPeerStoriesRaw) {
        await (window as any).guidegram.storiesGetAllReadPeerStoriesRaw(accountId)
      }
    } catch (_) {}
  }, [accountId])

  useEffect(() => {
    if (!isOpen || !currentStoryId || !mediaUrl || mediaLoading || isVideo) return
    let frame = 0
    let elapsed = 0
    let last = performance.now()

    const tick = (now: number) => {
      const delta = now - last
      last = now
      if (!pausedRef.current) elapsed += delta
      const nextProgress = Math.min(1, elapsed / IMAGE_DURATION_MS)
      setProgress(nextProgress)
      if (nextProgress >= 1) {
        goNextRef.current()
        return
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isOpen, currentStoryId, mediaUrl, mediaLoading, isVideo])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !isVideo || !mediaUrl) return
    video.muted = muted
    if (paused) {
      video.pause()
    } else {
      video.play().catch(() => {
        // Autoplay can be blocked until a user gesture.
      })
    }
  }, [paused, muted, isVideo, mediaUrl, currentStoryId])

  useEffect(() => {
    if (!isOpen || !currentStoryId || !mediaUrl) return
    if (!ghostMode) {
      const request = window.guidegram?.readStories?.(accountId, peerId, currentStoryId)
      request?.catch(() => {})
    }
  }, [isOpen, ghostMode, accountId, peerId, currentStoryId, mediaUrl])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev()
      } else if (event.key === ' ') {
        event.preventDefault()
        setPaused((value) => !value)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose, goNext, goPrev])

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-0 sm:p-6"
      dir="ltr"
    >
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.2, bottom: 0.7 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 110 || info.velocity.y > 500) {
            onClose()
          }
        }}
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={{ type: 'spring', damping: 26, stiffness: 400, mass: 0.8 }}
        className="story-drag-canvas relative flex h-full w-full flex-col overflow-hidden bg-dark-950 shadow-2xl sm:h-[88vh] sm:max-w-[440px] sm:rounded-2xl sm:border sm:border-white/10"
      >
        {/* Mobile/Desktop Pull-Down Dismissal Indicator */}
        <div className="absolute top-1 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="w-10 h-1 rounded-full bg-white/30 backdrop-blur-sm" />
        </div>

        {/* Progress bars */}
        <div className="absolute left-0 right-0 top-0 z-40 px-3 pt-3">
          <div className="flex gap-1">
            {stories.map((story, index) => (
              <button
                key={story.id}
                type="button"
                aria-label={`Story ${index + 1}`}
                onClick={(event) => {
                  event.stopPropagation()
                  setCurrentIndex(index)
                }}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"
              >
                <div
                  className="h-full rounded-full bg-white story-progress-fluid"
                  style={{
                    width:
                      index < currentIndex
                        ? '100%'
                        : index === currentIndex
                          ? `${progress * 100}%`
                          : '0%',
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="absolute left-0 right-0 top-0 z-30 bg-gradient-to-b from-black/85 via-black/45 to-transparent px-4 pb-8 pt-7">
          <div className="mt-3 flex items-center gap-3">
            <Avatar
              accountId={accountId}
              peerId={peerId}
              title={peerTitle}
              size="sm"
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-white">{peerTitle}</span>
                {canSendStoryStatus !== null && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-semibold border ${
                      canSendStoryStatus
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                    title={canSendStoryStatus ? 'ارسال استوری به این صفحه مجاز است' : 'امکان ارسال استوری محدود است'}
                  >
                    {canSendStoryStatus ? '✓ ارسال مجاز' : '✕ محدود'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-white/65">
                <Calendar className="h-3 w-3" />
                <span>{formatStoryTime(currentStory?.date)}</span>
                {currentStory?.viewsCount !== undefined && (
                  <span className="ml-1">· {currentStory.viewsCount.toLocaleString()} views</span>
                )}
              </div>
            </div>

            {/* Microphase 120 Action Buttons */}
            <button
              type="button"
              onClick={() => {
                setPaused(true)
                setStealthModalOpen(true)
              }}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                localGhostMode
                  ? 'bg-accent-cyan text-black font-bold'
                  : 'bg-black/35 text-white/90 hover:bg-black/60 hover:text-white'
              }`}
              title={isPersian ? 'حالت روح رسمی تلگرام (Stealth Mode)' : 'Telegram Stealth Mode'}
              aria-label="Stealth mode"
            >
              <ShieldAlert className="h-4 w-4" />
            </button>

            {currentStoryId && !loading && (
              <button
                type="button"
                onClick={() => {
                  setPaused(true)
                  setAlbumModalOpen(true)
                  fetchAlbums()
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/35 text-white/90 transition-colors hover:bg-indigo-600/70 hover:text-white"
                title={isPersian ? 'مدیریت آلبوم استوری‌ها (getAlbums)' : 'Story Albums'}
                aria-label="Story albums"
              >
                <FolderPlus className="h-4 w-4" />
              </button>
            )}

            {/* Microphase 121: Send Allowed Chats */}
            <button
              type="button"
              onClick={handleOpenChatsToSend}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/35 text-white/90 transition-colors hover:bg-emerald-600/70 hover:text-white"
              title={isPersian ? 'چت‌های مجاز برای استوری (getChatsToSend)' : 'Chats to send stories'}
              aria-label="Chats to send"
            >
              <Send className="h-4 w-4" />
            </button>

            {/* Microphase 121: Global Stories Feed */}
            <button
              type="button"
              onClick={handleOpenAllStoriesFeed}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/35 text-white/90 transition-colors hover:bg-purple-600/70 hover:text-white"
              title={isPersian ? 'فید عمومی همه استوری‌ها (getAllStories)' : 'All stories feed'}
              aria-label="All stories feed"
            >
              <Layers className="h-4 w-4" />
            </button>

            {isOwnStory && currentStoryId && !loading && (
              <button
                type="button"
                onClick={handleOpenEditCaption}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/35 text-white/90 transition-colors hover:bg-sky-500/70 hover:text-white"
                title={isPersian ? 'ویرایش کپشن استوری' : 'Edit story caption'}
                aria-label="Edit story"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            )}

            {currentStoryId && !loading && (
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/35 text-white/90 transition-colors hover:bg-black/60 hover:text-white"
                title={copyingLink ? 'Copied story link!' : 'Copy official story link'}
                aria-label="Share story link"
              >
                {copyingLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
              </button>
            )}
            {isOwnStory && currentStoryId && !loading && (
              <button
                type="button"
                onClick={handleTogglePin}
                disabled={pinning}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-60 ${
                  (pinnedState ?? currentStory?.isPinned)
                    ? 'bg-primary-500/80 text-white'
                    : 'bg-black/35 text-white/90 hover:bg-black/60 hover:text-white'
                }`}
                title={(pinnedState ?? currentStory?.isPinned) ? 'Unpin story' : 'Pin story to profile'}
                aria-label="Pin story"
              >
                {pinning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pin className="h-4 w-4" />}
              </button>
            )}
            {isOwnStory && currentStoryId && !loading && (
              <button
                type="button"
                onClick={handleDeleteStory}
                disabled={deleting}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/35 text-white/90 transition-colors hover:bg-red-500/70 hover:text-white disabled:cursor-wait disabled:opacity-60"
                title="Delete story"
                aria-label="Delete story"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/35 text-white/90 transition-colors hover:bg-black/60 hover:text-white"
              aria-label="Close stories"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Story Mode Selector Pills */}
          <div className="mt-2.5 flex items-center justify-center">
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full p-0.5 border border-white/10 text-[10px]">
              <button
                type="button"
                onClick={() => setStoryTab('active')}
                className={`px-3 py-0.5 rounded-full font-semibold transition-all cursor-pointer ${
                  storyTab === 'active'
                    ? 'bg-primary-500 text-white shadow'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {t('story_viewer.tab_active')}
              </button>
              <button
                type="button"
                onClick={() => setStoryTab('pinned')}
                className={`px-3 py-0.5 rounded-full font-semibold transition-all cursor-pointer ${
                  storyTab === 'pinned'
                    ? 'bg-primary-500 text-white shadow'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {t('story_viewer.tab_pinned')}
              </button>
              {isOwnStory && (
                <button
                  type="button"
                  onClick={() => setStoryTab('archive')}
                  className={`px-3 py-0.5 rounded-full font-semibold transition-all cursor-pointer ${
                    storyTab === 'archive'
                      ? 'bg-primary-500 text-white shadow'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {t('story_viewer.tab_archive')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Story content */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-white/70">
              <Loader2 className="h-7 w-7 animate-spin text-primary-400" />
              <span className="text-xs">{t('story_viewer.loading')}</span>
            </div>
          )}

          {!loading && loadError && (
            <div className="flex max-w-xs flex-col items-center gap-3 px-6 text-center">
              <AlertCircle className="h-8 w-8 text-amber-400" />
              <p className="text-sm text-white/80">{loadError}</p>
              <div className="flex items-center gap-2 mt-1">
                {storyTab === 'active' ? (
                  <button
                    type="button"
                    onClick={() => setStoryTab('pinned')}
                    className="rounded-full bg-accent-cyan/20 border border-accent-cyan/40 px-3.5 py-1 text-xs font-semibold text-accent-cyan transition-colors hover:bg-accent-cyan/35 cursor-pointer"
                  >
                    {t('story_viewer.check_profile')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStoryTab('active')}
                    className="rounded-full bg-primary-600/30 border border-primary-500/40 px-3.5 py-1 text-xs font-semibold text-primary-300 transition-colors hover:bg-primary-600/50 cursor-pointer"
                  >
                    {t('story_viewer.check_active')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full bg-white/10 px-3.5 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20 cursor-pointer"
                >
                  {t('story_viewer.close')}
                </button>
              </div>
            </div>
          )}

          {!loading && !loadError && stories.length === 0 && (
            <div className="flex max-w-xs flex-col items-center gap-3 px-6 text-center">
              <Sparkles className="h-8 w-8 text-primary-400" />
              <p className="text-sm text-white/80">No active stories.</p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
              >
                Close
              </button>
            </div>
          )}

          {!loading && !loadError && mediaLoading && currentStory && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/45 text-white/75">
              <Loader2 className="h-7 w-7 animate-spin text-white" />
              <span className="text-xs">Loading media…</span>
            </div>
          )}

          {!loading && !loadError && mediaError && !mediaLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/55 px-8 text-center">
              <AlertCircle className="h-8 w-8 text-amber-400" />
              <p className="text-sm text-white/80">{mediaError}</p>
            </div>
          )}

          {!loading && !loadError && mediaUrl && !isVideo && (
            <img
              key={`${currentStoryId}-${mediaUrl}`}
              src={mediaUrl}
              alt={currentStory?.caption || `${peerTitle} story`}
              className="max-h-full max-w-full select-none object-contain"
              draggable={false}
              onError={() => setMediaError('Unable to display this story media.')}
            />
          )}

          {!loading && !loadError && mediaUrl && isVideo && (
            <video
              key={`${currentStoryId}-${mediaUrl}`}
              ref={videoRef}
              src={mediaUrl}
              className="max-h-full max-w-full object-contain"
              autoPlay
              muted={muted}
              playsInline
              onTimeUpdate={(event) => {
                const video = event.currentTarget
                if (video.duration > 0) {
                  setProgress(Math.min(1, video.currentTime / video.duration))
                }
              }}
              onEnded={() => goNextRef.current()}
              onError={() => setMediaError('Unable to play this story video.')}
            />
          )}

          {/* Tap zones: previous / pause / next */}
          {!loading && !loadError && currentStory && (
            <>
              <button
                type="button"
                aria-label="Previous story"
                className="absolute bottom-0 left-0 top-0 z-20 w-[28%] cursor-w-resize focus:outline-none"
                onClick={goPrev}
              />
              <button
                type="button"
                aria-label={paused ? 'Resume story' : 'Pause story'}
                className="absolute bottom-0 left-[28%] right-[28%] top-0 z-20 focus:outline-none"
                onClick={() => setPaused((value) => !value)}
              />
              <button
                type="button"
                aria-label="Next story"
                className="absolute bottom-0 right-0 top-0 z-20 w-[28%] cursor-e-resize focus:outline-none"
                onClick={goNext}
              />
            </>
          )}

          {paused && currentStory && !loading && !loadError && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white shadow-lg">
                <Play className="ml-0.5 h-6 w-6" />
              </div>
            </div>
          )}

          {/* Navigation arrows for desktop */}
          {!loading && !loadError && stories.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous story"
                onClick={goPrev}
                className="absolute left-2 top-1/2 z-30 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/85 transition-colors hover:bg-black/70 hover:text-white sm:flex"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next story"
                onClick={goNext}
                className="absolute right-2 top-1/2 z-30 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/85 transition-colors hover:bg-black/70 hover:text-white sm:flex"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Mute button for video stories */}
          {isVideo && mediaUrl && !mediaLoading && (
            <button
              type="button"
              onClick={() => setMuted((value) => !value)}
              className="absolute bottom-24 right-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white/90 transition-colors hover:bg-black/70 hover:text-white"
              aria-label={muted ? 'Unmute story' : 'Mute story'}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          )}

          {paused && (
            <button
              type="button"
              onClick={() => setPaused(false)}
              className="absolute bottom-24 left-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white/90 transition-colors hover:bg-black/70 hover:text-white"
              aria-label="Resume story"
            >
              <Play className="h-4 w-4" />
            </button>
          )}

          {/* Caption */}
          {currentStory?.caption && !loading && !loadError && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-5 pb-6 pt-14">
              <p className="max-h-24 overflow-hidden whitespace-pre-wrap break-words text-[13px] leading-5 text-white/95" dir="auto">
                {currentStory.caption}
              </p>
            </div>
          )}

          {/* Reaction Float Animation */}
          <AnimatePresence>
            {reactionFeedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 40 }}
                animate={{ opacity: 1, scale: 1.5, y: -60 }}
                exit={{ opacity: 0, scale: 1.8, y: -100 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="pointer-events-none absolute bottom-20 left-1/2 z-40 -translate-x-1/2 text-5xl"
              >
                {reactionFeedback}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Story Quick Reactions Bar */}
          {!isOwnStory && !loading && !loadError && currentStory && (
            <div className="absolute bottom-4 left-4 right-4 z-30 flex items-center justify-between gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
              <div className="flex items-center gap-2">
                {['❤️', '🔥', '👍', '👏', '🎉', '😮'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSendReaction(emoji)
                    }}
                    className={`p-1 rounded-full hover:scale-125 transition-transform text-lg cursor-pointer leading-none ${
                      activeReaction === emoji ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,100,100,0.8)]' : ''
                    }`}
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setLocalGhostMode((prev) => !prev)
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${
                  localGhostMode
                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40'
                    : 'bg-white/10 text-gray-300 hover:text-white'
                }`}
                title={localGhostMode ? 'Ghost mode active' : 'Click to enable ghost mode'}
              >
                <EyeOff className="w-3 h-3" />
                <span>{localGhostMode ? 'Ghost' : 'Normal'}</span>
              </button>
            </div>
          )}

          {/* Ghost mode notice (when own story or bar hidden) */}
          {localGhostMode && isOwnStory && !loading && !loadError && currentStory && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-[10px] font-medium text-white/75">
              <EyeOff className="h-3 w-3" />
              <span>Ghost mode · view not marked as read</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/5 bg-dark-900/80 px-4 py-2 text-[10px] text-gray-500">
          <span className={deleteError ? 'text-red-400' : undefined}>
            {deleteError ||
              (stories.length > 0 ? `${currentIndex + 1} / ${stories.length}` : '0 / 0')}
          </span>
          <span className="flex items-center gap-1">
            <Pause className="h-3 w-3" />
            <span>Space to pause</span>
          </span>
        </div>

        {/* Telegram Stealth Mode Sheet (Microphase 120: stories.activateStealthMode) */}
        <AnimatePresence>
          {stealthModalOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-x-4 top-20 z-50 rounded-2xl border border-white/15 bg-black/90 p-4 backdrop-blur-xl shadow-2xl text-white"
              dir={isPersian ? 'rtl' : 'ltr'}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-accent-cyan" />
                  <span className="text-xs font-bold">
                    {isPersian ? 'حالت روح رسمی تلگرام (Stealth Mode)' : 'Telegram Stealth Mode'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStealthModalOpen(false)}
                  className="rounded-full p-1 text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-[11px] text-gray-300 mb-3 leading-relaxed">
                {isPersian
                  ? 'با فعال‌سازی حالت روح رسمی، بازدیدهای اخیر شما پنهان شده و تا مدت مشخصی بازدیدهای بعدی نیز ثبت نمی‌شود.'
                  : 'Activate official Telegram stealth mode to hide past and upcoming story views.'}
              </p>

              <div className="space-y-2 mb-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={stealthPast}
                    onChange={(e) => setStealthPast(e.target.checked)}
                    className="rounded border-white/20 bg-white/10 text-accent-cyan focus:ring-0"
                  />
                  <span>{isPersian ? 'پنهان‌سازی بازدیدهای ۵ دقیقه گذشته' : 'Hide views from past 5 minutes'}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={stealthFuture}
                    onChange={(e) => setStealthFuture(e.target.checked)}
                    className="rounded border-white/20 bg-white/10 text-accent-cyan focus:ring-0"
                  />
                  <span>{isPersian ? 'پنهان‌سازی بازدیدها برای ۲۵ دقیقه آینده' : 'Hide views for next 25 minutes'}</span>
                </label>
              </div>

              {stealthFeedback && (
                <div
                  className={`text-[11px] p-2 rounded-lg mb-3 ${
                    stealthFeedback.startsWith('خطا') || stealthFeedback.startsWith('Error')
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {stealthFeedback}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStealthModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-xs hover:bg-white/20 transition-colors"
                >
                  {isPersian ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleActivateStealthMode}
                  disabled={stealthLoading || (!stealthPast && !stealthFuture)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent-cyan text-black font-semibold text-xs hover:bg-accent-cyan/90 transition-colors disabled:opacity-50"
                >
                  {stealthLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isPersian ? 'فعال‌سازی حالت روح' : 'Activate'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Story Caption Sheet (Microphase 120: stories.editStory) */}
        <AnimatePresence>
          {editCaptionModalOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-x-4 top-20 z-50 rounded-2xl border border-white/15 bg-black/90 p-4 backdrop-blur-xl shadow-2xl text-white"
              dir={isPersian ? 'rtl' : 'ltr'}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-sky-400" />
                  <span className="text-xs font-bold">
                    {isPersian ? 'ویرایش کپشن استوری' : 'Edit Story Caption'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditCaptionModalOpen(false)}
                  className="rounded-full p-1 text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <textarea
                value={newCaptionText}
                onChange={(e) => setNewCaptionText(e.target.value)}
                placeholder={isPersian ? 'کپشن جدید را وارد کنید...' : 'Enter new caption...'}
                className="w-full h-24 rounded-lg bg-white/10 border border-white/15 p-2.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-sky-400 resize-none mb-3"
              />

              {editStoryFeedback && (
                <div
                  className={`text-[11px] p-2 rounded-lg mb-3 ${
                    editStoryFeedback.startsWith('خطا') || editStoryFeedback.startsWith('Error')
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {editStoryFeedback}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditCaptionModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-xs hover:bg-white/20 transition-colors"
                >
                  {isPersian ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedStory}
                  disabled={editingStoryLoading}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-500 text-white font-semibold text-xs hover:bg-sky-600 transition-colors disabled:opacity-50"
                >
                  {editingStoryLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isPersian ? 'ذخیره تغییرات' : 'Save Changes'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Story Albums Sheet (Microphase 120: stories.createAlbum & stories.deleteAlbum) */}
        <AnimatePresence>
          {albumModalOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-x-4 top-16 z-50 rounded-2xl border border-white/15 bg-black/90 p-4 backdrop-blur-xl shadow-2xl text-white max-h-[80%] overflow-y-auto"
              dir={isPersian ? 'rtl' : 'ltr'}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <FolderPlus className="h-5 w-5 text-indigo-400" />
                  <span className="text-xs font-bold">
                    {isPersian ? 'مدیریت آلبوم‌های استوری' : 'Story Albums Management'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAlbumModalOpen(false)}
                  className="rounded-full p-1 text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Create Album */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 mb-2">
                  <FolderPlus className="h-4 w-4" />
                  <span>{isPersian ? 'ایجاد آلبوم با این استوری' : 'Create Album with this Story'}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={albumTitle}
                    onChange={(e) => setAlbumTitle(e.target.value)}
                    placeholder={isPersian ? 'عنوان آلبوم...' : 'Album title...'}
                    className="flex-1 rounded-lg bg-black/40 border border-white/15 px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={handleCreateAlbum}
                    disabled={albumLoading || !albumTitle.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500 text-white font-semibold text-xs hover:bg-indigo-600 transition-colors disabled:opacity-50"
                  >
                    {albumLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                    <span>{isPersian ? 'ایجاد' : 'Create'}</span>
                  </button>
                </div>
              </div>

              {/* Delete Album */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 mb-2">
                  <FolderMinus className="h-4 w-4" />
                  <span>{isPersian ? 'حذف آلبوم استوری' : 'Delete Story Album'}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={albumDeleteId}
                    onChange={(e) => setAlbumDeleteId(e.target.value)}
                    placeholder={isPersian ? 'شناسه آلبوم (Album ID)...' : 'Album ID...'}
                    className="flex-1 rounded-lg bg-black/40 border border-white/15 px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-400"
                  />
                  <button
                    type="button"
                    onClick={handleDeleteAlbum}
                    disabled={albumLoading || !albumDeleteId.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition-colors disabled:opacity-50"
                  >
                    {albumLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                    <span>{isPersian ? 'حذف' : 'Delete'}</span>
                  </button>
                </div>
              </div>

              {/* Existing Albums List (Microphase 121: stories.getAlbums & stories.getAlbumStories) */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 mb-3">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-300 mb-2">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    <span>{isPersian ? 'آلبوم‌های موجود (stories.getAlbums)' : 'Existing Albums'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={fetchAlbums}
                    className="text-[10px] text-gray-400 hover:text-white"
                  >
                    {isPersian ? 'تازه‌سازی' : 'Refresh'}
                  </button>
                </div>

                {loadingAlbums && (
                  <div className="flex items-center justify-center p-3 text-xs text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    <span>{isPersian ? 'در حال بارگذاری آلبوم‌ها...' : 'Loading albums...'}</span>
                  </div>
                )}

                {!loadingAlbums && albumsList.length === 0 && (
                  <div className="text-center p-2.5 text-[11px] text-gray-400">
                    {isPersian ? 'هیچ آلبومی یافت نشد.' : 'No albums found.'}
                  </div>
                )}

                {!loadingAlbums && albumsList.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {albumsList.map((alb) => (
                      <div
                        key={alb.id || alb.title}
                        className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 hover:border-indigo-500/40 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-white truncate">{alb.title || `Album #${alb.id}`}</div>
                          <div className="text-[10px] text-gray-400">ID: {alb.id} · {alb.stories_count || 0} stories</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLoadAlbumStories(alb.id)}
                          className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/40 text-[10px] font-medium transition-colors"
                        >
                          {isPersian ? 'مشاهده استوری‌ها' : 'View stories'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Album Stories (stories.getAlbumStories) */}
                {selectedAlbumStories !== null && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="text-[11px] font-semibold text-gray-300 mb-1.5">
                      {isPersian ? `استوری‌های آلبوم #${selectedAlbumId} (تعداد: ${selectedAlbumStories.length})` : `Stories in Album #${selectedAlbumId} (${selectedAlbumStories.length})`}
                    </div>
                    {loadingAlbumStories ? (
                      <div className="flex items-center p-2 text-xs text-gray-400">
                        <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                        <span>Loading...</span>
                      </div>
                    ) : selectedAlbumStories.length === 0 ? (
                      <div className="text-[10px] text-gray-400">{isPersian ? 'استوری‌ای در این آلبوم نیست.' : 'No stories in this album.'}</div>
                    ) : (
                      <div className="flex gap-2 overflow-x-auto py-1">
                        {selectedAlbumStories.map((st, idx) => (
                          <div
                            key={st.id || idx}
                            className="shrink-0 px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-[10px] text-gray-300"
                          >
                            Story #{st.id}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {albumFeedback && (
                <div
                  className={`text-[11px] p-2 rounded-lg mb-2 ${
                    albumFeedback.startsWith('خطا') || albumFeedback.startsWith('Error')
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {albumFeedback}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chats To Send Stories Sheet (Microphase 121: stories.getChatsToSend) */}
        <AnimatePresence>
          {chatsToSendModalOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-x-4 top-16 z-50 rounded-2xl border border-white/15 bg-black/90 p-4 backdrop-blur-xl shadow-2xl text-white max-h-[80%] overflow-y-auto"
              dir={isPersian ? 'rtl' : 'ltr'}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-emerald-400" />
                  <span className="text-xs font-bold">
                    {isPersian ? 'چت‌های مجاز برای ارسال استوری (getChatsToSend)' : 'Chats Permitted to Send Stories'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setChatsToSendModalOpen(false)}
                  className="rounded-full p-1 text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {loadingChatsToSend && (
                <div className="flex items-center justify-center p-6 text-xs text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>{isPersian ? 'در حال بررسی مقصدهای مجاز...' : 'Loading permitted chats...'}</span>
                </div>
              )}

              {!loadingChatsToSend && chatsToSendList.length === 0 && (
                <div className="text-center p-6 text-xs text-gray-400">
                  {isPersian ? 'هیچ چت یا کانال مجاز دیگری برای ارسال استوری ثبت نشده است.' : 'No permitted chats found.'}
                </div>
              )}

              {!loadingChatsToSend && chatsToSendList.length > 0 && (
                <div className="space-y-2">
                  {chatsToSendList.map((chat: any) => (
                    <div
                      key={chat.id || chat.title}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-white truncate">{chat.title || `Chat ${chat.id}`}</div>
                        <div className="text-[10px] text-gray-400">ID: {chat.id}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {isPersian ? 'مجاز' : 'Allowed'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Stories Feed Sheet (Microphase 121: stories.getAllStories) */}
        <AnimatePresence>
          {allStoriesFeedOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-x-4 top-16 z-50 rounded-2xl border border-white/15 bg-black/90 p-4 backdrop-blur-xl shadow-2xl text-white max-h-[80%] overflow-y-auto"
              dir={isPersian ? 'rtl' : 'ltr'}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-400" />
                  <span className="text-xs font-bold">
                    {isPersian ? 'فید همه استوری‌ها (getAllStories)' : 'All Stories Global Feed'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAllStoriesFeedOpen(false)}
                  className="rounded-full p-1 text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {loadingAllStories && (
                <div className="flex items-center justify-center p-6 text-xs text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>{isPersian ? 'در حال دریافت فید استوری‌ها...' : 'Loading feed...'}</span>
                </div>
              )}

              {!loadingAllStories && allStoriesFeed.length === 0 && (
                <div className="text-center p-6 text-xs text-gray-400">
                  {isPersian ? 'هیچ استوری فعالی در فید عمومی وجود ندارد.' : 'No stories in feed.'}
                </div>
              )}

              {!loadingAllStories && allStoriesFeed.length > 0 && (
                <div className="space-y-2">
                  {allStoriesFeed.map((item: any, i: number) => (
                    <div
                      key={item.id || i}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-white">
                          Peer: {item.peer?.user_id || item.peer?.channel_id || `User ${i + 1}`}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {item.stories?.length || 1} {isPersian ? 'استوری' : 'stories'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
