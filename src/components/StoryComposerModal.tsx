import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Forward,
  Globe,
  ImagePlus,
  Loader2,
  Pin,
  Plus,
  RefreshCw,
  Star,
  Users,
  Video,
  X,
} from 'lucide-react'
import { useI18n } from '../i18n'
import type { StoryPrivacy } from '../types/telegram'

interface StoryComposerModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  isPremium?: boolean
  onPosted?: () => void
}

type StoryMediaKind = 'photo' | 'video'

const SUPPORTED_MEDIA = /\.(jpe?g|png|webp|gif|mp4|mov|m4v|webm)$/i
const VIDEO_MEDIA = /\.(mp4|mov|m4v|webm)$/i
const MAX_VIDEO_SECONDS = 60

const toMediaUrl = (filePath: string) =>
  `guidegram-media://local/?path=${encodeURIComponent(filePath)}`

export const StoryComposerModal: React.FC<StoryComposerModalProps> = ({
  isOpen,
  onClose,
  accountId,
  isPremium = false,
  onPosted,
}) => {
  const { t, isRTL, formatNumber } = useI18n()
  const [filePath, setFilePath] = useState<string | null>(null)
  const [mediaKind, setMediaKind] = useState<StoryMediaKind | null>(null)
  const [caption, setCaption] = useState('')
  const [privacy, setPrivacy] = useState<StoryPrivacy>('everyone')
  const [pinned, setPinned] = useState(false)
  const [forbidForwards, setForbidForwards] = useState(false)
  const [period, setPeriod] = useState(86400)
  const [videoMeta, setVideoMeta] = useState<{
    duration: number
    width: number
    height: number
  } | null>(null)
  const [videoMetaLoading, setVideoMetaLoading] = useState(false)
  const [previewError, setPreviewError] = useState(false)
  const [picking, setPicking] = useState(false)
  const [posting, setPosting] = useState(false)
  const [posted, setPosted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setFilePath(null)
    setMediaKind(null)
    setCaption('')
    setPrivacy('everyone')
    setPinned(false)
    setForbidForwards(false)
    setPeriod(86400)
    setVideoMeta(null)
    setVideoMetaLoading(false)
    setPreviewError(false)
    setPicking(false)
    setPosting(false)
    setPosted(false)
    setError(null)
  }, [isOpen])

  const periodOptions = useMemo(
    () =>
      isPremium
        ? [
            { value: 21600, key: 'stories.duration_6h' },
            { value: 43200, key: 'stories.duration_12h' },
            { value: 86400, key: 'stories.duration_24h' },
            { value: 172800, key: 'stories.duration_48h' },
          ]
        : [{ value: 86400, key: 'stories.duration_24h' }],
    [isPremium]
  )

  const videoTooLong = Boolean(
    videoMeta && videoMeta.duration > MAX_VIDEO_SECONDS + 0.5
  )
  const canPost =
    Boolean(filePath && mediaKind) &&
    !posting &&
    !posted &&
    !picking &&
    (mediaKind !== 'video' ||
      (Boolean(videoMeta) && !videoTooLong && !videoMetaLoading))

  const handlePickFile = async () => {
    if (posting) return
    setPicking(true)
    setError(null)
    try {
      const result = await window.guidegram.openFileDialog({
        type: 'media',
        allowMultiple: false,
        title: t('stories.pick_media'),
      })
      if (result?.canceled || !result?.filePaths?.length) return

      const selected = result.filePaths[0]
      if (!SUPPORTED_MEDIA.test(selected)) {
        setError(t('stories.error_unsupported'))
        return
      }

      const kind: StoryMediaKind = VIDEO_MEDIA.test(selected) ? 'video' : 'photo'
      setFilePath(selected)
      setMediaKind(kind)
      setVideoMeta(null)
      setVideoMetaLoading(kind === 'video')
      setPreviewError(false)
      setError(null)
    } catch (err: any) {
      setError(err?.message || t('stories.error_generic'))
    } finally {
      setPicking(false)
    }
  }

  const getErrorMessage = (err: any): string => {
    const raw = String(err?.message || err || '')
    if (raw.includes('STORY_FILE_NOT_FOUND')) return t('stories.error_file_not_found')
    if (raw.includes('STORY_CAPTION_TOO_LONG')) return t('stories.error_caption_too_long')
    if (raw.includes('STORY_VIDEO_METADATA_MISSING')) return t('stories.error_video_meta')
    if (raw.includes('STORY_VIDEO_TOO_LONG')) return t('stories.error_video_too_long')
    if (raw.includes('STORY_PREMIUM_REQUIRED')) return t('stories.error_premium')
    if (raw.includes('STORY_PERIOD_INVALID')) return t('stories.error_period_invalid')
    if (raw.includes('STORY_FILE_TOO_LARGE')) return t('stories.error_too_large')
    if (raw.includes('STORY_MEDIA_INVALID')) return t('stories.error_media_invalid')
    const flood = raw.match(/STORY_FLOOD_WAIT_(\d+)/)
    if (flood) return t('stories.error_flood', { seconds: formatNumber(flood[1]) })
    return t('stories.error_generic')
  }

  const handlePost = async () => {
    if (!canPost || !filePath || !mediaKind) return
    setPosting(true)
    setError(null)
    try {
      const result = await window.guidegram.sendStory(accountId, filePath, {
        caption: caption.trim() || undefined,
        privacy,
        pinned,
        forbidForwards,
        period,
        isVideo: mediaKind === 'video',
        duration: videoMeta?.duration,
        width: videoMeta?.width,
        height: videoMeta?.height,
      })
      if (!result?.id) {
        throw new Error('STORY_SEND_FAILED')
      }
      setPosted(true)
      onPosted?.()
      window.setTimeout(() => onClose(), 1200)
    } catch (err: any) {
      setError(getErrorMessage(err))
    } finally {
      setPosting(false)
    }
  }

  if (!isOpen) return null

  const previewUrl = filePath ? toMediaUrl(filePath) : ''

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-label={t('stories.composer_title')}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={(event) => {
        event.stopPropagation()
        if (!posting) onClose()
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg max-h-[88vh] rounded-2xl bg-[#17212b] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/15 text-primary-400 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{t('stories.composer_title')}</div>
              <div className="text-[11px] text-gray-400">{t('stories.composer_subtitle')}</div>
            </div>
          </div>
          <button
            type="button"
            disabled={posting}
            onClick={onClose}
            aria-label={t('stories.close')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          {!filePath ? (
            <button
              type="button"
              onClick={handlePickFile}
              disabled={picking}
              className="w-full min-h-[190px] rounded-2xl border border-dashed border-white/20 bg-[#0e1621] hover:border-primary-500/50 hover:bg-primary-500/5 transition-colors flex flex-col items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/5 text-gray-300 flex items-center justify-center">
                {picking ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <ImagePlus className="w-6 h-6" />
                )}
              </div>
              <div className="text-sm font-semibold text-white">{t('stories.pick_media')}</div>
              <div className="text-[11px] text-gray-500">{t('stories.media_hint')}</div>
            </button>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10">
              <div className="h-[290px] flex items-center justify-center">
                {mediaKind === 'video' ? (
                  <video
                    key={filePath}
                    src={previewUrl}
                    controls
                    muted
                    playsInline
                    preload="metadata"
                    className="max-h-[290px] max-w-full object-contain"
                    onLoadedMetadata={(event) => {
                      const video = event.currentTarget
                      const duration = Number(video.duration)
                      const width = Number(video.videoWidth)
                      const height = Number(video.videoHeight)
                      if (
                        !Number.isFinite(duration) ||
                        duration <= 0 ||
                        width <= 0 ||
                        height <= 0
                      ) {
                        setVideoMeta(null)
                        setVideoMetaLoading(false)
                        setError(t('stories.error_video_meta'))
                        return
                      }
                      setVideoMeta({ duration, width, height })
                      setVideoMetaLoading(false)
                    }}
                    onError={() => {
                      setPreviewError(true)
                      setVideoMetaLoading(false)
                      setError(t('stories.error_preview'))
                    }}
                  />
                ) : (
                  <img
                    key={filePath}
                    src={previewUrl}
                    alt={t('stories.preview_alt')}
                    className="max-h-[290px] max-w-full object-contain"
                    onError={() => setPreviewError(true)}
                  />
                )}
              </div>

              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                <span className="px-2 py-1 rounded-lg bg-black/65 backdrop-blur text-[10px] font-semibold text-white flex items-center gap-1.5">
                  {mediaKind === 'video' ? (
                    <Video className="w-3 h-3" />
                  ) : (
                    <ImagePlus className="w-3 h-3" />
                  )}
                  {mediaKind === 'video' ? t('stories.video') : t('stories.photo')}
                </span>
                {videoMeta && (
                  <span className="px-2 py-1 rounded-lg bg-black/65 backdrop-blur text-[10px] font-mono text-gray-200">
                    {t('stories.video_meta', {
                      duration: formatNumber(Math.round(videoMeta.duration)),
                      width: formatNumber(videoMeta.width),
                      height: formatNumber(videoMeta.height),
                    })}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handlePickFile}
                disabled={posting || picking}
                className="absolute top-2.5 right-2.5 px-2.5 py-1.5 rounded-lg bg-black/65 hover:bg-black/80 backdrop-blur text-[10px] font-semibold text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {picking ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                {t('stories.change_media')}
              </button>

              {videoMetaLoading && (
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-xs text-white">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('stories.reading_video')}
                  </div>
                </div>
              )}
            </div>
          )}

          {videoTooLong && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-[11px] leading-relaxed text-amber-200">
              {t('stories.error_video_too_long')}
            </div>
          )}

          {previewError && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-[11px] leading-relaxed text-amber-200">
              {t('stories.error_preview')}
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-[#0e1621] p-3.5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-gray-300">
                {t('stories.caption')}
              </label>
              <span className="text-[10px] font-mono text-gray-500">
                {formatNumber(caption.length)}/{formatNumber(2048)}
              </span>
            </div>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value.slice(0, 2048))}
              placeholder={t('stories.caption_placeholder')}
              rows={3}
              disabled={posting || posted}
              className="w-full resize-none bg-transparent text-xs text-white placeholder:text-gray-600 outline-none leading-relaxed"
            />
          </div>

          <div>
            <div className="text-[11px] font-semibold text-gray-300 mb-2">
              {t('stories.privacy')}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: 'everyone', icon: Globe, key: 'stories.privacy_everyone' },
                  { value: 'contacts', icon: Users, key: 'stories.privacy_contacts' },
                  { value: 'close_friends', icon: Star, key: 'stories.privacy_close_friends' },
                ] as Array<{
                  value: StoryPrivacy
                  icon: React.ElementType
                  key: string
                }>
              ).map((option) => {
                const Icon = option.icon
                const active = privacy === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={posting || posted}
                    onClick={() => setPrivacy(option.value)}
                    className={`px-2 py-2.5 rounded-xl border text-[10px] font-semibold flex flex-col items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 ${
                      active
                        ? 'border-primary-500/60 bg-primary-500/15 text-white'
                        : 'border-white/10 bg-white/[0.03] text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-primary-400' : ''}`} />
                    <span className="leading-4 text-center">{t(option.key)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0e1621] divide-y divide-white/5">
            <button
              type="button"
              disabled={posting || posted}
              onClick={() => setPinned((value) => !value)}
              className="w-full px-3.5 py-3 flex items-center justify-between gap-3 cursor-pointer disabled:opacity-60"
            >
              <span className="flex items-center gap-3 min-w-0 text-left">
                <span className="w-8 h-8 rounded-lg bg-white/5 text-gray-300 flex items-center justify-center shrink-0">
                  <Pin className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold text-gray-200">
                    {t('stories.pin')}
                  </span>
                  <span className="block text-[10px] text-gray-500">
                    {t('stories.pin_desc')}
                  </span>
                </span>
              </span>
              <span
                className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                  pinned ? 'bg-primary-500' : 'bg-white/15'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    pinned ? (isRTL ? '-translate-x-4' : 'translate-x-4') : 'translate-x-0'
                  }`}
                />
              </span>
            </button>

            <button
              type="button"
              disabled={posting || posted}
              onClick={() => setForbidForwards((value) => !value)}
              className="w-full px-3.5 py-3 flex items-center justify-between gap-3 cursor-pointer disabled:opacity-60"
            >
              <span className="flex items-center gap-3 min-w-0 text-left">
                <span className="w-8 h-8 rounded-lg bg-white/5 text-gray-300 flex items-center justify-center shrink-0">
                  <Forward className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold text-gray-200">
                    {t('stories.forbid_forwards')}
                  </span>
                  <span className="block text-[10px] text-gray-500">
                    {t('stories.forbid_forwards_desc')}
                  </span>
                </span>
              </span>
              <span
                className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                  forbidForwards ? 'bg-primary-500' : 'bg-white/15'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    forbidForwards
                      ? isRTL
                        ? '-translate-x-4'
                        : 'translate-x-4'
                      : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-gray-300 mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              {t('stories.duration')}
            </div>
            <div className="flex flex-wrap gap-2">
              {periodOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={posting || posted}
                  onClick={() => setPeriod(option.value)}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-60 ${
                    period === option.value
                      ? 'border-primary-500/60 bg-primary-500/15 text-white'
                      : 'border-white/10 bg-white/[0.03] text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {t(option.key)}
                </button>
              ))}
            </div>
            {!isPremium && (
              <div className="mt-2 text-[10px] leading-relaxed text-gray-500">
                {t('stories.premium_duration')}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-2.5 text-[11px] leading-relaxed text-red-200 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {posted && (
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2.5 text-[11px] font-semibold text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {t('stories.posted')}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-white/5 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={posting}
            className="px-4 py-2 rounded-xl border border-white/10 text-[11px] font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handlePost}
            disabled={!canPost}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-accent-cyan text-[11px] font-bold text-white flex items-center gap-2 hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {posting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : posted ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {posting ? t('stories.posting') : t('stories.post')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
