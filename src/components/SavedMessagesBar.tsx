import React, { useState, useEffect, useMemo } from 'react'
import {
  Search,
  X,
  Bookmark,
  Filter,
  Image as ImageIcon,
  FileText,
  Link2,
  Mic,
  Tag,
  Users,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { MessageItem, SavedDialogItem, SavedReactionTagItem } from '../types/telegram'
import { useI18n } from '../i18n'

export interface SavedMessagesBarProps {
  accountId: string
  messages: MessageItem[]
  selectedSourceId: string | null
  onSelectSource: (sourceId: string | null) => void
  selectedTag: string | null
  onSelectTag: (tag: string | null) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  mediaFilter: 'all' | 'media' | 'files' | 'links' | 'voice'
  onMediaFilterChange: (f: 'all' | 'media' | 'files' | 'links' | 'voice') => void
  totalCount: number
  filteredCount: number
}

export const SavedMessagesBar: React.FC<SavedMessagesBarProps> = ({
  accountId,
  messages,
  selectedSourceId,
  onSelectSource,
  selectedTag,
  onSelectTag,
  searchQuery,
  onSearchChange,
  mediaFilter,
  onMediaFilterChange,
  totalCount,
  filteredCount,
}) => {
  const { t } = useI18n()
  const [remoteSources, setRemoteSources] = useState<SavedDialogItem[]>([])
  const [remoteTags, setRemoteTags] = useState<SavedReactionTagItem[]>([])
  const [activeTab, setActiveTab] = useState<'sources' | 'tags'>('sources')

  // 1. Fetch remote saved dialogs and reaction tags
  useEffect(() => {
    let cancelled = false

    if (window.guidegram?.getSavedDialogs) {
      window.guidegram.getSavedDialogs(accountId).then((dialogs) => {
        if (!cancelled && dialogs && dialogs.length > 0) {
          setRemoteSources(dialogs)
        }
      }).catch(() => {})
    }

    if (window.guidegram?.getSavedReactionTags) {
      window.guidegram.getSavedReactionTags(accountId).then((tags) => {
        if (!cancelled && tags && tags.length > 0) {
          setRemoteTags(tags)
        }
      }).catch(() => {})
    }

    return () => {
      cancelled = true
    }
  }, [accountId])

  // 2. Aggregate local forward sources from loaded saved messages
  const aggregatedSources = useMemo(() => {
    const sourceMap = new Map<string, { id: string; title: string; count: number }>()

    // Merge remote sources first
    for (const r of remoteSources) {
      sourceMap.set(r.id, {
        id: r.id,
        title: r.title,
        count: 0,
      })
    }

    // Tally messages forwarded from sources
    for (const msg of messages) {
      if (msg.forwardInfo?.fromId && msg.forwardInfo?.fromTitle) {
        const key = msg.forwardInfo.fromId
        const existing = sourceMap.get(key)
        if (existing) {
          existing.count += 1
        } else {
          sourceMap.set(key, {
            id: key,
            title: msg.forwardInfo.fromTitle,
            count: 1,
          })
        }
      }
    }

    return Array.from(sourceMap.values()).filter((s) => s.count > 0 || remoteSources.some((r) => r.id === s.id))
  }, [remoteSources, messages])

  // 3. Aggregate reaction tags from loaded messages + remote
  const aggregatedTags = useMemo(() => {
    const tagMap = new Map<string, { emoji: string; count: number; title?: string }>()

    for (const r of remoteTags) {
      tagMap.set(r.emoji, {
        emoji: r.emoji,
        count: r.count,
        title: r.title,
      })
    }

    for (const msg of messages) {
      if (msg.reactions && Array.isArray(msg.reactions)) {
        for (const rx of msg.reactions) {
          const existing = tagMap.get(rx.emoji)
          if (existing) {
            if (remoteTags.length === 0) existing.count += rx.count || 1
          } else {
            tagMap.set(rx.emoji, {
              emoji: rx.emoji,
              count: rx.count || 1,
            })
          }
        }
      }
    }

    return Array.from(tagMap.values())
  }, [remoteTags, messages])

  const hasActiveFilters = Boolean(
    selectedSourceId || selectedTag || searchQuery.trim() || mediaFilter !== 'all'
  )

  const clearAllFilters = () => {
    onSelectSource(null)
    onSelectTag(null)
    onSearchChange('')
    onMediaFilterChange('all')
  }

  return (
    <div className="bg-dark-850/95 backdrop-blur-md border-b border-white/10 px-4 py-2.5 transition-all text-xs select-none">
      {/* Top Search & Media Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2.5">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('saved_messages.search')}
            className="w-full bg-dark-900/80 border border-white/10 rounded-xl pl-8 pr-8 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Media Type Filter Chips */}
        <div className="flex items-center gap-1 bg-dark-900/60 p-1 rounded-xl border border-white/5 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => onMediaFilterChange('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              mediaFilter === 'all'
                ? 'bg-primary-500 text-white shadow-xs'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {t('saved_messages.filter_all')}
          </button>
          <button
            type="button"
            onClick={() => onMediaFilterChange('media')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              mediaFilter === 'media'
                ? 'bg-primary-500 text-white shadow-xs'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ImageIcon className="w-3 h-3" />
            <span>{t('saved_messages.filter_media')}</span>
          </button>
          <button
            type="button"
            onClick={() => onMediaFilterChange('files')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              mediaFilter === 'files'
                ? 'bg-primary-500 text-white shadow-xs'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>{t('saved_messages.filter_files')}</span>
          </button>
          <button
            type="button"
            onClick={() => onMediaFilterChange('links')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              mediaFilter === 'links'
                ? 'bg-primary-500 text-white shadow-xs'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Link2 className="w-3 h-3" />
            <span>{t('saved_messages.filter_links')}</span>
          </button>
          <button
            type="button"
            onClick={() => onMediaFilterChange('voice')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              mediaFilter === 'voice'
                ? 'bg-primary-500 text-white shadow-xs'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Mic className="w-3 h-3" />
            <span>{t('saved_messages.filter_voice')}</span>
          </button>
        </div>

        {/* Count & Reset */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400">
            {t('saved_messages.showing_count', {
              count: filteredCount.toString(),
              total: totalCount.toString(),
            })}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[11px] font-medium transition-all cursor-pointer"
              title={t('saved_messages.clear_filters')}
            >
              <X className="w-3 h-3" />
              <span>{t('saved_messages.clear_filters')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs: Sources vs Tags */}
      <div className="flex items-center gap-3 border-t border-white/5 pt-2">
        <div className="flex items-center gap-1 bg-dark-900/40 p-0.5 rounded-lg border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
              activeTab === 'sources'
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>{t('saved_messages.sources')}</span>
            {aggregatedSources.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-primary-500/30 text-primary-300">
                {aggregatedSources.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tags')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
              activeTab === 'tags'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Tag className="w-3 h-3" />
            <span>{t('saved_messages.tags')}</span>
            {aggregatedTags.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/30 text-amber-300">
                {aggregatedTags.length}
              </span>
            )}
          </button>
        </div>

        {/* Scrollable list of Sources or Tags */}
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {activeTab === 'sources' ? (
            <>
              <button
                type="button"
                onClick={() => onSelectSource(null)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 cursor-pointer ${
                  selectedSourceId === null
                    ? 'bg-primary-500/30 border border-primary-400/50 text-primary-200 shadow-glow'
                    : 'bg-dark-900/60 border border-white/5 text-gray-300 hover:bg-dark-750'
                }`}
              >
                <Bookmark className="w-3 h-3 text-primary-400" />
                <span>{t('saved_messages.all')}</span>
              </button>

              {aggregatedSources.map((source) => {
                const isSelected = selectedSourceId === source.id
                return (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => onSelectSource(isSelected ? null : source.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-primary-500/30 border border-primary-400 text-white shadow-glow'
                        : 'bg-dark-900/60 border border-white/5 text-gray-300 hover:bg-dark-750 hover:text-white'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-primary-500/20 text-primary-300 flex items-center justify-center text-[10px] font-bold">
                      {source.title.charAt(0).toUpperCase()}
                    </span>
                    <span className="max-w-[120px] truncate">{source.title}</span>
                    {source.count > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-black/40 text-gray-400 font-mono">
                        {source.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onSelectTag(null)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 cursor-pointer ${
                  selectedTag === null
                    ? 'bg-amber-500/30 border border-amber-400/50 text-amber-200 shadow-glow'
                    : 'bg-dark-900/60 border border-white/5 text-gray-300 hover:bg-dark-750'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{t('saved_messages.all')}</span>
              </button>

              {aggregatedTags.map((tag) => {
                const isSelected = selectedTag === tag.emoji
                return (
                  <button
                    key={tag.emoji}
                    type="button"
                    onClick={() => onSelectTag(isSelected ? null : tag.emoji)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/30 border border-amber-400 text-amber-100 shadow-glow'
                        : 'bg-dark-900/60 border border-white/5 text-gray-300 hover:bg-dark-750 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">{tag.emoji}</span>
                    {tag.title && <span>{tag.title}</span>}
                    {tag.count > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-black/40 text-amber-300/80 font-mono">
                        {tag.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
