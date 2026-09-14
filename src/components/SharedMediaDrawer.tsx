import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  Search,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Music,
  Mic,
  Download,
  Copy,
  ExternalLink,
  Play,
  Pause,
  RefreshCw,
  File,
  Check,
} from 'lucide-react'
import { useI18n } from '../i18n'
import type { SharedMediaItem, SharedMediaFilterType, DialogItem } from '../types/telegram'

interface SharedMediaDrawerProps {
  isOpen: boolean
  onClose: () => void
  chat: DialogItem
  onOpenMediaLightbox?: (item: SharedMediaItem) => void
}

const TABS: { id: SharedMediaFilterType; labelKey: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'media', labelKey: 'shared_media.tab_media', icon: ImageIcon },
  { id: 'files', labelKey: 'shared_media.tab_files', icon: FileText },
  { id: 'links', labelKey: 'shared_media.tab_links', icon: LinkIcon },
  { id: 'audio', labelKey: 'shared_media.tab_audio', icon: Music },
  { id: 'voice', labelKey: 'shared_media.tab_voice', icon: Mic },
]

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDuration(sec?: number): string {
  if (!sec || sec <= 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

function formatDate(ts?: number): string {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export const SharedMediaDrawer: React.FC<SharedMediaDrawerProps> = ({
  isOpen,
  onClose,
  chat,
  onOpenMediaLightbox,
}) => {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<SharedMediaFilterType>('media')
  const [itemsByTab, setItemsByTab] = useState<Record<SharedMediaFilterType, SharedMediaItem[]>>({
    media: [],
    files: [],
    links: [],
    audio: [],
    voice: [],
  })
  const [nextOffsetByTab, setNextOffsetByTab] = useState<Record<SharedMediaFilterType, number>>({
    media: 0,
    files: 0,
    links: 0,
    audio: 0,
    voice: 0,
  })
  const [hasMoreByTab, setHasMoreByTab] = useState<Record<SharedMediaFilterType, boolean>>({
    media: true,
    files: true,
    links: true,
    audio: true,
    voice: true,
  })
  const [totalCountByTab, setTotalCountByTab] = useState<Record<SharedMediaFilterType, number>>({
    media: 0,
    files: 0,
    links: 0,
    audio: 0,
    voice: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedLinkId, setCopiedLinkId] = useState<number | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Fetch items for a tab
  const fetchTabItems = useCallback(
    async (tab: SharedMediaFilterType, isLoadMore = false) => {
      if (!chat?.accountId || !chat?.id || !window.guidegram?.getSharedMedia) return

      if (isLoadMore) {
        if (isLoadingMore || !hasMoreByTab[tab]) return
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }

      const offsetId = isLoadMore ? nextOffsetByTab[tab] : 0

      try {
        const res = await window.guidegram.getSharedMedia(chat.accountId, chat.id, tab, 40, offsetId)
        if (res && Array.isArray(res.items)) {
          setItemsByTab((prev) => ({
            ...prev,
            [tab]: isLoadMore ? [...prev[tab], ...res.items] : res.items,
          }))
          setNextOffsetByTab((prev) => ({
            ...prev,
            [tab]: res.nextOffsetId,
          }))
          setHasMoreByTab((prev) => ({
            ...prev,
            [tab]: res.hasMore,
          }))
          if (typeof res.totalCount === 'number') {
            setTotalCountByTab((prev) => ({
              ...prev,
              [tab]: res.totalCount,
            }))
          }
        }
      } catch (err) {
        console.error(`[SharedMediaDrawer] Failed to fetch shared media for ${tab}:`, err)
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [chat?.accountId, chat?.id, hasMoreByTab, isLoadingMore, nextOffsetByTab]
  )

  // Initial fetch when opened or chat changes
  useEffect(() => {
    if (isOpen && chat?.id) {
      setItemsByTab({ media: [], files: [], links: [], audio: [], voice: [] })
      setNextOffsetByTab({ media: 0, files: 0, links: 0, audio: 0, voice: 0 })
      setHasMoreByTab({ media: true, files: true, links: true, audio: true, voice: true })
      setTotalCountByTab({ media: 0, files: 0, links: 0, audio: 0, voice: 0 })
      fetchTabItems(activeTab, false)
    }
  }, [isOpen, chat?.id])

  // When switching tabs, fetch if empty
  useEffect(() => {
    if (isOpen && chat?.id && itemsByTab[activeTab].length === 0 && hasMoreByTab[activeTab]) {
      fetchTabItems(activeTab, false)
    }
  }, [activeTab, isOpen, chat?.id])

  // Scroll listener for pagination
  const handleScroll = () => {
    if (!containerRef.current || isLoadingMore || !hasMoreByTab[activeTab]) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    if (scrollHeight - scrollTop - clientHeight < 200) {
      fetchTabItems(activeTab, true)
    }
  }

  // Copy link
  const handleCopyLink = (item: SharedMediaItem) => {
    const url = item.url
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopiedLinkId(item.id)
    setTimeout(() => setCopiedLinkId(null), 2000)
  }

  // Download media/file
  const handleDownload = async (item: SharedMediaItem) => {
    if (!chat?.accountId || !chat?.id || !window.guidegram?.downloadMedia) return
    setDownloadingId(item.id)
    try {
      await window.guidegram.downloadMedia(chat.accountId, chat.id, item.id, false)
    } catch (err) {
      console.warn('[SharedMediaDrawer] Download error:', err)
    } finally {
      setDownloadingId(null)
    }
  }

  // Toggle audio playback
  const handleToggleAudio = async (item: SharedMediaItem) => {
    if (playingAudioId === item.id) {
      audioRef.current?.pause()
      setPlayingAudioId(null)
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }

    // Try to get local cached file or download
    if (window.guidegram?.downloadMedia) {
      setDownloadingId(item.id)
      const filePath = await window.guidegram.downloadMedia(chat.accountId, chat.id, item.id, false).catch(() => null)
      setDownloadingId(null)
      if (filePath) {
        const audio = new Audio(`file://${filePath}`)
        audioRef.current = audio
        audio.play()
        setPlayingAudioId(item.id)
        audio.onended = () => setPlayingAudioId(null)
      }
    }
  }

  if (!isOpen) return null

  const currentItems = itemsByTab[activeTab] || []
  const filteredItems = searchQuery.trim()
    ? currentItems.filter((i) => {
        const q = searchQuery.toLowerCase()
        return (
          (i.fileName && i.fileName.toLowerCase().includes(q)) ||
          (i.title && i.title.toLowerCase().includes(q)) ||
          (i.description && i.description.toLowerCase().includes(q)) ||
          (i.caption && i.caption.toLowerCase().includes(q)) ||
          (i.performer && i.performer.toLowerCase().includes(q)) ||
          (i.url && i.url.toLowerCase().includes(q))
        )
      })
    : currentItems

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-96 max-w-full h-full bg-dark-900/95 border-l border-white/10 shadow-2xl flex flex-col z-10 backdrop-blur-xl animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3 bg-dark-850/50">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-2 rounded-xl bg-primary-500/10 text-primary-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h2 className="text-sm font-bold text-gray-100">{t('shared_media.title')}</h2>
              <p className="text-xs text-gray-400 truncate">{chat.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Box */}
        <div className="px-4 py-2.5 border-b border-white/5 bg-dark-800/30">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('shared_media.search_placeholder')}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-dark-950/60 border border-white/10 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-gray-500 hover:text-gray-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-2 border-b border-white/10 bg-dark-850/40 overflow-x-auto no-scrollbar select-none">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const count = totalCountByTab[tab.id]
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id)
                  setSearchQuery('')
                }}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-primary-500 text-primary-400 bg-primary-500/10'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t(tab.labelKey)}</span>
                {count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-gray-300">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Content Area */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar"
        >
          {isLoading && filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-primary-400" />
              <span className="text-xs">{t('shared_media.loading')}</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-2.5 text-center px-4">
              <div className="p-3 rounded-2xl bg-white/5 text-gray-400">
                {activeTab === 'media' && <ImageIcon className="w-6 h-6" />}
                {activeTab === 'files' && <FileText className="w-6 h-6" />}
                {activeTab === 'links' && <LinkIcon className="w-6 h-6" />}
                {activeTab === 'audio' && <Music className="w-6 h-6" />}
                {activeTab === 'voice' && <Mic className="w-6 h-6" />}
              </div>
              <p className="text-xs leading-relaxed">{t(`shared_media.empty_${activeTab}`)}</p>
            </div>
          ) : (
            <>
              {/* Media Tab: 3-column photo/video grid */}
              {activeTab === 'media' && (
                <div className="grid grid-cols-3 gap-1.5">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onOpenMediaLightbox?.(item)}
                      className="relative aspect-square rounded-lg overflow-hidden bg-dark-800 border border-white/5 group cursor-pointer hover:border-primary-500/50 transition-all"
                    >
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.caption || 'Media thumbnail'}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                      {item.type === 'video' && (
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] font-mono text-gray-200 flex items-center gap-1">
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>{formatDuration(item.duration)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Files Tab */}
              {activeTab === 'files' && (
                <div className="space-y-1.5">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-dark-850/60 border border-white/5 hover:border-white/10 hover:bg-dark-800/80 transition-all group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                        <File className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-200 truncate" title={item.fileName}>
                          {item.fileName || 'Untitled File'}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                          <span>{formatBytes(item.fileSize)}</span>
                          <span>•</span>
                          <span>{formatDate(item.date)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownload(item)}
                        disabled={downloadingId === item.id}
                        className="p-2 rounded-lg bg-white/5 hover:bg-primary-500/20 text-gray-400 hover:text-primary-300 transition-colors cursor-pointer"
                        title={t('shared_media.download')}
                      >
                        {downloadingId === item.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-primary-400" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Links Tab */}
              {activeTab === 'links' && (
                <div className="space-y-2">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-dark-850/60 border border-white/5 hover:border-white/10 transition-all group space-y-2"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0 border border-purple-500/20 mt-0.5">
                          <LinkIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {item.title && (
                            <h4 className="text-xs font-bold text-gray-200 truncate">{item.title}</h4>
                          )}
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-400 hover:underline truncate block"
                          >
                            {item.url}
                          </a>
                          {item.description && (
                            <p className="text-[11px] text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-gray-500">
                        <span>{formatDate(item.date)}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(item)}
                            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1 cursor-pointer"
                            title={t('shared_media.copy_link')}
                          >
                            {copiedLinkId === item.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-[9px] text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span className="text-[9px]">Copy</span>
                              </>
                            )}
                          </button>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1"
                              title={t('shared_media.open_link')}
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span className="text-[9px]">Open</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Audio Tab */}
              {activeTab === 'audio' && (
                <div className="space-y-1.5">
                  {filteredItems.map((item) => {
                    const isPlaying = playingAudioId === item.id
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-dark-850/60 border border-white/5 hover:border-white/10 transition-all group"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleAudio(item)}
                          className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-glow-emerald"
                        >
                          {downloadingId === item.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                          ) : isPlaying ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-gray-200 truncate">
                            {item.title || item.fileName || 'Audio Track'}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5 truncate">
                            {item.performer && <span className="text-gray-300 font-medium">{item.performer}</span>}
                            {item.performer && <span>•</span>}
                            <span>{formatDuration(item.duration)}</span>
                            <span>•</span>
                            <span>{formatBytes(item.fileSize)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownload(item)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                          title={t('shared_media.download')}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Voice Tab */}
              {activeTab === 'voice' && (
                <div className="space-y-1.5">
                  {filteredItems.map((item) => {
                    const isPlaying = playingAudioId === item.id
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-dark-850/60 border border-white/5 hover:border-white/10 transition-all group"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleAudio(item)}
                          className="w-9 h-9 rounded-full bg-cyan-500/15 text-accent-cyan flex items-center justify-center shrink-0 border border-cyan-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        >
                          {downloadingId === item.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-accent-cyan" />
                          ) : isPlaying ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-200">Voice Message</span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {formatDuration(item.duration)}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {formatDate(item.date)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownload(item)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                          title={t('shared_media.download')}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Loading More Indicator */}
              {isLoadingMore && (
                <div className="flex items-center justify-center py-3 text-gray-400 gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary-400" />
                  <span className="text-[11px]">{t('shared_media.loading')}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
export default SharedMediaDrawer
