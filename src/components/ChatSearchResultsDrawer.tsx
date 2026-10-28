import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  Search,
  RefreshCw,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  Music,
  Mic,
  Video,
} from 'lucide-react'
import { useI18n } from '../i18n'
import type { MessageItem, DialogItem } from '../types/telegram'
import { Avatar } from './Avatar'

interface ChatSearchResultsDrawerProps {
  isOpen: boolean
  onClose: () => void
  chat: DialogItem
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  results: MessageItem[]
  totalCount?: number
  isLoading: boolean
  activeMessageId?: number
  onSelectMessage: (messageId: number) => void
}

function formatResultTime(timestamp?: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp < 1e11 ? timestamp * 1000 : timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff < 7) {
    return date.toLocaleDateString([], { weekday: 'short' })
  }
  return date.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' })
}

function highlightSnippet(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)
  if (parts.length <= 1) return text

  return parts.map((part, idx) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <span
        key={idx}
        className="text-accent-cyan font-bold bg-accent-cyan/15 px-1 py-0.5 rounded shadow-xs"
      >
        {part}
      </span>
    ) : (
      part
    )
  )
}

function getMediaDescription(msg: MessageItem): { icon: React.FC<{ className?: string }>; label: string } | null {
  if (msg.mediaType === 'photo') return { icon: ImageIcon, label: 'Photo' }
  if (msg.mediaType === 'video' || msg.isRoundVideo) return { icon: Video, label: 'Video' }
  if (msg.mediaType === 'document') return { icon: FileText, label: msg.mediaFileName || 'File' }
  if (msg.mediaType === 'voice' || msg.isVoice) return { icon: Mic, label: 'Voice Message' }
  if (msg.mediaType === 'audio') return { icon: Music, label: msg.mediaTitle || 'Audio' }
  return null
}

export const ChatSearchResultsDrawer: React.FC<ChatSearchResultsDrawerProps> = ({
  isOpen,
  onClose,
  chat,
  searchQuery,
  onSearchQueryChange,
  results,
  totalCount,
  isLoading,
  activeMessageId,
  onSelectMessage,
}) => {
  const { t, formatNumber, isRTL } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [isOpen])

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

  const displayCount = typeof totalCount === 'number' && totalCount > 0 ? totalCount : results.length

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 flex pointer-events-auto">
          {/* Subtle Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: isRTL ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: isRTL ? '-100%' : '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-96 max-w-full h-full bg-dark-900/95 border-l border-white/10 shadow-2xl flex flex-col z-10 backdrop-blur-xl select-none"
          >
            {/* Header */}
            <div className="p-3.5 border-b border-white/10 flex items-center justify-between gap-2.5 bg-dark-850/80">
              <div className="flex items-center gap-2 overflow-hidden flex-1">
                <div className="p-2 rounded-xl bg-primary-500/15 text-primary-400 shrink-0 shadow-glow">
                  <Search className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <h2 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                    <span>{t('search.this_chat') || 'This Chat'}</span>
                    {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary-400" />}
                  </h2>
                  <p className="text-[11px] text-gray-400 font-mono">
                    {isLoading
                      ? t('search.searching_chat') || 'Searching messages...'
                      : searchQuery.trim()
                      ? t('search.messages_found', { count: formatNumber(displayCount) })
                      : chat.title}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-white/10 transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* In-Drawer Search Input */}
            <div className="px-3.5 py-2.5 border-b border-white/5 bg-dark-800/40">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder="Search in this conversation..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-dark-950/70 border border-white/10 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/30 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchQueryChange('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Results Content */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
              {isLoading && results.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-56 text-gray-400 gap-3 text-center px-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 text-primary-400 flex items-center justify-center shadow-glow">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  </div>
                  <span className="text-xs font-medium text-gray-300">
                    {t('search.searching_chat') || 'Searching Telegram server...'}
                  </span>
                </div>
              ) : !searchQuery.trim() ? (
                <div className="flex flex-col items-center justify-center h-56 text-gray-500 gap-2 text-center px-4">
                  <Search className="w-8 h-8 opacity-40 mb-1" />
                  <span className="text-xs">Type a keyword to search this chat history</span>
                </div>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-56 text-gray-400 gap-2 text-center px-6">
                  <div className="w-12 h-12 rounded-2xl bg-dark-800 border border-white/5 flex items-center justify-center text-gray-500 mb-1">
                    <MessageSquare className="w-6 h-6 text-gray-400" />
                  </div>
                  <span className="text-sm font-semibold text-gray-200">
                    {t('search.no_results', { query: searchQuery })}
                  </span>
                </div>
              ) : (
                results.map((msg) => {
                  const isCurrent = activeMessageId === msg.id
                  const media = getMediaDescription(msg)
                  return (
                    <button
                      key={msg.id}
                      type="button"
                      onClick={() => onSelectMessage(msg.id)}
                      className={`w-full p-3 flex items-start gap-3 text-left transition-colors cursor-pointer group ${
                        isCurrent
                          ? 'bg-primary-500/15 border-l-2 border-primary-400'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      {/* Sender Avatar */}
                      <div className="shrink-0 pt-0.5">
                        <Avatar
                          peerId={msg.senderId || ''}
                          accountId={chat.accountId}
                          title={msg.senderName || 'User'}
                          avatarUrl={msg.senderAvatarUrl}
                          size="md"
                        />
                      </div>

                      {/* Message Summary */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-bold text-gray-100 truncate group-hover:text-primary-300 transition-colors">
                            {msg.senderName || 'Telegram User'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono shrink-0">
                            {formatResultTime(msg.date)}
                          </span>
                        </div>

                        {msg.text ? (
                          <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed break-words">
                            {highlightSnippet(msg.text, searchQuery)}
                          </p>
                        ) : media ? (
                          <div className="flex items-center gap-1.5 text-xs text-primary-400 font-medium">
                            <media.icon className="w-3.5 h-3.5" />
                            <span className="truncate">{media.label}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 italic">Empty message</span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
