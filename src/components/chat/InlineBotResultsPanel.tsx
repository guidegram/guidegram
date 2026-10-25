import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Bot, ExternalLink, Loader2, Play, Sparkles } from 'lucide-react'
import { InlineBotResultsPayload, InlineBotResultItem } from '../../types/telegram'

interface InlineBotResultsPanelProps {
  botUsername: string
  query: string
  resultsPayload: InlineBotResultsPayload | null
  isLoading: boolean
  onSelectResult: (queryId: string, result: InlineBotResultItem) => void
  onSwitchPm?: (startParam: string) => void
  onSwitchWebview?: (url: string) => void
}

export const InlineBotResultsPanel: React.FC<InlineBotResultsPanelProps> = ({
  botUsername,
  query,
  resultsPayload,
  isLoading,
  onSelectResult,
  onSwitchPm,
  onSwitchWebview,
}) => {
  if (!isLoading && (!resultsPayload || resultsPayload.results.length === 0) && !resultsPayload?.switchPm && !resultsPayload?.switchWebview) {
    return null
  }

  const results = resultsPayload?.results || []
  const queryId = resultsPayload?.queryId || ''
  const isGallery = resultsPayload?.gallery || results.some(r => r.type === 'photo' || r.type === 'gif')

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        className="absolute bottom-full left-0 right-0 mb-3 mx-4 max-h-80 bg-dark-850/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl p-2 z-40 overflow-hidden flex flex-col select-none"
      >
        {/* Header Bar */}
        <div className="px-3 py-1.5 border-b border-white/5 flex items-center justify-between text-xs font-semibold text-gray-300">
          <div className="flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-accent-cyan" />
            <span className="text-white font-mono">@{botUsername}</span>
            {query && <span className="text-gray-400 font-normal italic">"{query}"</span>}
          </div>
          {isLoading && (
            <div className="flex items-center gap-1.5 text-accent-cyan text-[11px]">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Searching...</span>
            </div>
          )}
        </div>

        {/* Switch PM or Webview action button */}
        {(resultsPayload?.switchPm || resultsPayload?.switchWebview) && (
          <div className="p-1.5 border-b border-white/5">
            {resultsPayload.switchPm && (
              <button
                type="button"
                onClick={() => onSwitchPm?.(resultsPayload.switchPm!.startParam)}
                className="w-full py-1.5 px-3 rounded-xl bg-accent-cyan/15 hover:bg-accent-cyan/25 text-accent-cyan font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>{resultsPayload.switchPm.text}</span>
              </button>
            )}
            {resultsPayload.switchWebview && (
              <button
                type="button"
                onClick={() => onSwitchWebview?.(resultsPayload.switchWebview!.url)}
                className="w-full py-1.5 px-3 rounded-xl bg-primary-500/15 hover:bg-primary-500/25 text-primary-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                <span>{resultsPayload.switchWebview.text}</span>
              </button>
            )}
          </div>
        )}

        {/* Results List / Grid */}
        <div className="flex-1 overflow-y-auto p-1.5">
          {isGallery ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectResult(queryId, item)}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-dark-900 border border-white/5 hover:border-accent-cyan/50 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  {item.thumb?.url || item.content?.url ? (
                    <img
                      src={item.thumb?.url || item.content?.url}
                      alt={item.title || 'inline result'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-dark-800 text-gray-500 text-xs">
                      {item.type}
                    </div>
                  )}
                  {item.title && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1 text-[10px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.title}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectResult(queryId, item)}
                  className="w-full p-2 rounded-xl bg-dark-900/60 hover:bg-white/5 border border-white/5 hover:border-accent-cyan/30 flex items-center gap-3 transition-colors text-left cursor-pointer group"
                >
                  {item.thumb?.url && (
                    <img
                      src={item.thumb.url}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover shrink-0 bg-dark-800"
                    />
                  )}
                  {item.type === 'game' && !item.thumb?.url && (
                    <div className="w-10 h-10 rounded-lg bg-accent-violet/20 text-accent-violet flex items-center justify-center shrink-0">
                      <Play className="w-5 h-5 fill-current" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-gray-100 group-hover:text-accent-cyan transition-colors truncate">
                      {item.title || item.type}
                    </div>
                    {item.description && (
                      <div className="text-[11px] text-gray-400 line-clamp-2 leading-snug">
                        {item.description}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
