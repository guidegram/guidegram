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
} from 'lucide-react'
import { PeerStoriesPayload } from '../types/telegram'
import { motion, AnimatePresence } from 'motion/react'
import { Avatar } from './Avatar'

interface StoryViewerModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  peerId: string
  peerTitle: string
  ghostMode?: boolean
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
  onDeleted,
}) => {
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
  const [storyTab, setStoryTab] = useState<'active' | 'pinned' | 'archive'>('active')

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
      request = window.guidegram?.getPeerStories?.(accountId, peerId)
    }

    if (!request) {
      setLoadError('Stories are unavailable.')
      setLoading(false)
      return
    }

    request
      .then((data) => {
        if (!active) return
        if (!data) {
          setLoadError(
            storyTab === 'pinned'
              ? 'No pinned stories found.'
              : storyTab === 'archive'
                ? 'No archived stories found.'
                : 'Unable to load stories for this contact.'
          )
          setLoading(false)
          return
        }
        const rawList = Array.isArray(data) ? data : data.stories || []
        const sortedStories = [...rawList].sort((a, b) => a.date - b.date)
        setPeerStories({
          peer: data.peer || { _: 'peerUser', userId: peerId },
          stories: sortedStories,
        } as any)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setLoadError(
          storyTab === 'pinned'
            ? 'No pinned stories found.'
            : storyTab === 'archive'
              ? 'No archived stories found.'
              : 'Unable to load stories for this contact.'
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
    if (!window.confirm('Delete this story? This cannot be undone.')) return

    setDeleting(true)
    setDeleteError(null)
    try {
      const removed = await window.guidegram.deleteStory(accountId, currentStoryId, peerId)
      if (!removed) {
        setDeleteError('Unable to delete this story.')
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
  }, [accountId, currentStoryId, deleting, onClose, onDeleted, peerId])

  const handleCopyLink = useCallback(async () => {
    if (!currentStoryId || copyingLink) return
    setCopyingLink(true)
    try {
      const link = await window.guidegram.exportStoryLink(accountId, peerId, currentStoryId)
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
              <div className="truncate text-sm font-semibold text-white">{peerTitle}</div>
              <div className="flex items-center gap-1.5 text-[11px] text-white/65">
                <Calendar className="h-3 w-3" />
                <span>{formatStoryTime(currentStory?.date)}</span>
                {currentStory?.viewsCount !== undefined && (
                  <span className="ml-1">· {currentStory.viewsCount.toLocaleString()} views</span>
                )}
              </div>
            </div>
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
          {isOwnStory && (
            <div className="mt-2.5 flex items-center justify-center">
              <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full p-0.5 border border-white/10 text-[10px]">
                <button
                  type="button"
                  onClick={() => setStoryTab('active')}
                  className={`px-3 py-0.5 rounded-full font-semibold transition-all ${
                    storyTab === 'active'
                      ? 'bg-primary-500 text-white shadow'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setStoryTab('pinned')}
                  className={`px-3 py-0.5 rounded-full font-semibold transition-all ${
                    storyTab === 'pinned'
                      ? 'bg-primary-500 text-white shadow'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Pinned
                </button>
                <button
                  type="button"
                  onClick={() => setStoryTab('archive')}
                  className={`px-3 py-0.5 rounded-full font-semibold transition-all ${
                    storyTab === 'archive'
                      ? 'bg-primary-500 text-white shadow'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Archive
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Story content */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-white/70">
              <Loader2 className="h-7 w-7 animate-spin text-primary-400" />
              <span className="text-xs">Loading stories…</span>
            </div>
          )}

          {!loading && loadError && (
            <div className="flex max-w-xs flex-col items-center gap-3 px-6 text-center">
              <AlertCircle className="h-8 w-8 text-amber-400" />
              <p className="text-sm text-white/80">{loadError}</p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
              >
                Close
              </button>
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
      </motion.div>
    </motion.div>
  )
}
