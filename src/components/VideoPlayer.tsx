import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Camera,
  X,
  RotateCcw,
  RotateCw,
  PictureInPicture,
  Download,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { formatDuration } from '../utils/textUtils'

interface VideoPlayerProps {
  src: string
  poster?: string
  fileName?: string
  duration?: number
  onClose?: () => void
  onShowToast?: (message: string) => void
  onDownload?: () => void
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  fileName,
  duration = 0,
  onClose,
  onShowToast,
  onDownload,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(() =>
    typeof duration === 'number' && !isNaN(duration) && isFinite(duration) && duration > 0 ? duration : 0
  )
  const [bufferedPercent, setBufferedPercent] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverPos, setHoverPos] = useState<number>(0)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2]

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => {})
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }, [])

  const seekRelative = useCallback((seconds: number) => {
    const video = videoRef.current
    if (!video) return
    const target = Math.max(0, Math.min(video.currentTime + seconds, video.duration || totalDuration || 0))
    video.currentTime = target
    setCurrentTime(target)
  }, [totalDuration])

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (isMuted) {
      video.muted = false
      video.volume = volume || 1
      setIsMuted(false)
    } else {
      video.muted = true
      setIsMuted(true)
    }
  }, [isMuted, volume])

  const copyCurrentFrame = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 360
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 2D context unavailable')

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ])
          onShowToast?.('Frame copied to clipboard!')
        }
      }, 'image/png')
    } catch (err) {
      onShowToast?.('Failed to capture video frame')
    }
  }, [onShowToast])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration) && isFinite(video.duration) && video.duration > 0) {
        setTotalDuration(video.duration)
      }
      setHasError(false)
    }

    const handleTimeUpdate = () => {
      if (!isNaN(video.currentTime) && isFinite(video.currentTime)) {
        setCurrentTime(video.currentTime)
      }
      if (video.duration && !isNaN(video.duration) && isFinite(video.duration) && video.duration > 0) {
        setTotalDuration(video.duration)
      }
      if (video.buffered.length > 0 && video.duration && isFinite(video.duration) && video.duration > 0) {
        try {
          const bufferedEnd = video.buffered.end(video.buffered.length - 1)
          if (!isNaN(bufferedEnd) && isFinite(bufferedEnd)) {
            setBufferedPercent(Math.min(100, Math.max(0, (bufferedEnd / video.duration) * 100)))
          }
        } catch (_) {}
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    const handleError = () => {
      setHasError(true)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('error', handleError)

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return

      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        seekRelative(5)
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        seekRelative(-5)
      } else if (e.code === 'ArrowUp') {
        e.preventDefault()
        setVolume((v) => {
          const next = Math.min(1, Number((v + 0.1).toFixed(2)))
          if (video) video.volume = next
          return next
        })
      } else if (e.code === 'ArrowDown') {
        e.preventDefault()
        setVolume((v) => {
          const next = Math.max(0, Number((v - 0.1).toFixed(2)))
          if (video) video.volume = next
          return next
        })
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        toggleMute()
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        toggleFullscreen()
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        copyCurrentFrame()
      } else if (e.key === 'd' || e.key === 'D') {
        if (onDownload) {
          e.preventDefault()
          onDownload()
        }
      } else if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {})
        } else if (onClose) {
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('error', handleError)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [togglePlay, seekRelative, toggleMute, toggleFullscreen, copyCurrentFrame, onDownload, onClose])

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const target = Number(e.target.value)
    video.currentTime = target
    setCurrentTime(target)
  }

  const handleSeekMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (!rect.width || isNaN(rect.width) || rect.width <= 0) return
    const pos = (e.clientX - rect.left) / rect.width
    const clampedPos = Math.max(0, Math.min(1, isNaN(pos) ? 0 : pos))
    setHoverPos(e.clientX - rect.left)
    const validTotal = typeof totalDuration === 'number' && isFinite(totalDuration) && totalDuration > 0 ? totalDuration : 0
    setHoverTime(clampedPos * validTotal)
  }

  const handleSeekMouseLeave = () => {
    setHoverTime(null)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const val = Number(e.target.value)
    video.volume = val
    setVolume(val)
    setIsMuted(val === 0)
  }

  const cyclePlaybackSpeed = () => {
    const video = videoRef.current
    if (!video) return
    const currentIndex = speedOptions.indexOf(playbackSpeed)
    const nextSpeed = speedOptions[(currentIndex + 1) % speedOptions.length]
    video.playbackRate = nextSpeed
    setPlaybackSpeed(nextSpeed)
    onShowToast?.(`Playback speed: ${nextSpeed}x`)
  }

  const togglePiP = async () => {
    const video = videoRef.current
    if (!video) return
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await video.requestPictureInPicture()
      }
    } catch {
      onShowToast?.('Picture-in-Picture not supported')
    }
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
  }

  const safeTotal = typeof totalDuration === 'number' && isFinite(totalDuration) && totalDuration > 0 ? totalDuration : 0
  const safeCurrent = typeof currentTime === 'number' && isFinite(currentTime) && currentTime >= 0 ? currentTime : 0
  const playedPercent = safeTotal > 0 ? Math.min(100, Math.max(0, (safeCurrent / safeTotal) * 100)) : 0

  const handleRetryStream = () => {
    setHasError(false)
    const video = videoRef.current
    if (video) {
      video.load()
      video.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative rounded-2xl overflow-hidden bg-black max-w-xl border border-white/10 shadow-2xl group select-none flex flex-col justify-center min-h-[220px]"
    >
      {/* Video stream element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay
        playsInline
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className="w-full max-h-[460px] object-contain cursor-pointer"
      />

      {/* Close button top-right */}
      {onClose && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={onClose}
          className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md transition-colors z-50 cursor-pointer shadow-md border border-white/10"
          title="Close Player (Esc)"
        >
          <X className="w-4 h-4" />
        </motion.button>
      )}

      {/* Video Name Badge top-left */}
      {fileName && (
        <div className="absolute top-2.5 left-2.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-medium text-gray-200 z-30 max-w-[280px] truncate shadow-md border border-white/5">
          {fileName}
        </div>
      )}

      {/* Error state overlay (Full Surgical Isolation - Never overlaps controls) */}
      {hasError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 bg-dark-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center z-40 gap-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-accent-rose/15 border border-accent-rose/30 flex items-center justify-center text-accent-rose shadow-lg mb-0.5">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="text-sm font-semibold text-gray-100 tracking-wide">Unable to stream video</div>
          <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
            The video format or streaming response requires direct local playback or saving to your Guidegram folder.
          </p>

          <div className="flex items-center gap-2.5 mt-2">
            {onDownload && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={onDownload}
                className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-glow transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Save to Downloads</span>
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={handleRetryStream}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer backdrop-blur-md transition-all border border-white/10"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Center Play/Pause indicator overlay when paused */}
      <AnimatePresence>
        {!isPlaying && !hasError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/35 cursor-pointer z-15"
          >
            <motion.div
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.92 }}
              className="w-16 h-16 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-2xl"
            >
              <Play className="w-7 h-7 fill-current ml-1" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Bottom Controls Bar - Hidden Completely When hasError is Active */}
      <AnimatePresence>
        {(showControls || !isPlaying) && !hasError && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col gap-2 z-25"
          >
        {/* Scrubber Seek Bar with Buffered Track & Hover Timestamp Tooltip */}
        <div
          className="relative flex items-center group/scrub py-1 cursor-pointer"
          onMouseMove={handleSeekMouseMove}
          onMouseLeave={handleSeekMouseLeave}
        >
          {/* Hover Time Tooltip */}
          {hoverTime !== null && (
            <div
              style={{ left: `${hoverPos}px` }}
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/85 border border-white/15 text-[10px] font-mono text-white pointer-events-none shadow-lg backdrop-blur-sm"
            >
              {formatDuration(hoverTime)}
            </div>
          )}

          <div className="relative w-full h-1.5 group-hover/scrub:h-2 bg-white/20 rounded-full overflow-hidden transition-all">
            {/* Buffered Track */}
            <div
              style={{ width: `${bufferedPercent}%` }}
              className="absolute top-0 bottom-0 left-0 bg-white/25 rounded-full transition-all duration-200"
            />
            {/* Played Progress Track */}
            <div
              style={{ width: `${playedPercent}%` }}
              className="absolute top-0 bottom-0 left-0 bg-primary-500 rounded-full transition-all duration-75 shadow-glow"
            />
          </div>

          <input
            type="range"
            min={0}
            max={safeTotal || 100}
            step={0.1}
            value={safeCurrent}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Control Buttons Row */}
        <div className="flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-1.5">
            {/* Play/Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-white"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            {/* Rewind 10s */}
            <button
              type="button"
              onClick={() => seekRelative(-10)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-gray-300 hover:text-white flex items-center"
              title="Rewind 10 seconds (←)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold ml-0.5">10</span>
            </button>

            {/* Forward 10s */}
            <button
              type="button"
              onClick={() => seekRelative(10)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-gray-300 hover:text-white flex items-center"
              title="Forward 10 seconds (→)"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold ml-0.5">10</span>
            </button>

            {/* Time Display */}
            <div className="text-[11px] font-mono text-gray-300 ml-1">
              {formatDuration(currentTime)} / {formatDuration(totalDuration)}
            </div>

            {/* Volume */}
            <div className="flex items-center gap-1 group/vol ml-2">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-gray-300 hover:text-white"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-accent-rose" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary-400"
              />
              <span className="text-[10px] font-mono text-gray-400 w-7 text-right">
                {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Speed Toggle */}
            <button
              type="button"
              onClick={cyclePlaybackSpeed}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-mono font-bold transition-colors cursor-pointer"
              title="Playback Speed"
            >
              {playbackSpeed}x
            </button>

            {/* Download Video Button */}
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="p-1.5 rounded-lg bg-primary-600/80 hover:bg-primary-500 text-white transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                title="Download video to computer (D)"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold pr-0.5">Save</span>
              </button>
            )}

            {/* Copy Frame */}
            <button
              type="button"
              onClick={copyCurrentFrame}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Copy Frame to Clipboard (C)"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* PiP */}
            <button
              type="button"
              onClick={togglePiP}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Picture-in-Picture"
            >
              <PictureInPicture className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
