import React, { useState, useEffect } from 'react'
import {
  X,
  Forward,
  Check,
  EyeOff,
  VolumeX,
  Bookmark,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Edit3,
  Scissors,
} from 'lucide-react'
import { DialogItem, MessageItem } from '../types/telegram'

export interface DirectForwardPayload {
  toChatIds: string[]
  withoutQuote: boolean
  dropMediaCaptions: boolean
  newCaption?: string
  silent: boolean
}

export interface DirectForwardModalProps {
  isOpen: boolean
  message: MessageItem | null
  dialogs: DialogItem[]
  onClose: () => void
  onForward: (
    payloadOrTargetChatIds: DirectForwardPayload | string[],
    withoutQuote?: boolean,
    silent?: boolean,
    extraOptions?: { dropMediaCaptions?: boolean; newCaption?: string }
  ) => Promise<void> | void
}

export const DirectForwardModal: React.FC<DirectForwardModalProps> = ({
  isOpen,
  message,
  dialogs,
  onClose,
  onForward,
}) => {
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([])
  const [withoutQuote, setWithoutQuote] = useState(true) // Default true (Telegraph direct style)
  const [dropMediaCaptions, setDropMediaCaptions] = useState(false)
  const [newCaption, setNewCaption] = useState('')
  const [silent, setSilent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (isOpen && message) {
      setSelectedChatIds([])
      setSearch('')
      setLoading(false)
      setWithoutQuote(true)
      setDropMediaCaptions(false)
      setSilent(false)
      setNewCaption(message.text || '')
    }
  }, [isOpen, message])

  if (!isOpen || !message) return null

  const handleToggleChat = (chatId: string) => {
    setSelectedChatIds((prev) => {
      if (prev.includes(chatId)) {
        return prev.filter((id) => id !== chatId)
      } else {
        return [...prev, chatId]
      }
    })
  }

  const handleMoveRecipient = (index: number, direction: 'up' | 'down') => {
    setSelectedChatIds((prev) => {
      const next = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= next.length) return prev
      const temp = next[index]
      next[index] = next[targetIndex]
      next[targetIndex] = temp
      return next
    })
  }

  const handleRemoveRecipient = (chatId: string) => {
    setSelectedChatIds((prev) => prev.filter((id) => id !== chatId))
  }

  const handleForward = async () => {
    if (selectedChatIds.length === 0) return
    setLoading(true)
    try {
      const trimmedCaption = newCaption.trim()
      const payload: DirectForwardPayload = {
        toChatIds: selectedChatIds,
        withoutQuote,
        dropMediaCaptions,
        newCaption: trimmedCaption.length > 0 ? trimmedCaption : undefined,
        silent,
      }

      if (onForward.length <= 1) {
        await onForward(payload)
      } else {
        await onForward(selectedChatIds, withoutQuote, silent, {
          dropMediaCaptions,
          newCaption: trimmedCaption.length > 0 ? trimmedCaption : undefined,
        })
      }
      onClose()
    } catch (err) {
      console.error('Failed to forward messages:', err)
    } finally {
      setLoading(false)
    }
  }

  const getChatTitle = (chatId: string): string => {
    if (chatId === 'me') return 'Saved Messages'
    const found = dialogs.find((d) => d.id === chatId)
    return found?.title || `Chat ${chatId}`
  }

  const filtered = dialogs.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  )

  const isCaptionModified = newCaption !== (message.text || '')

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-modal w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 border border-white/10">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-dark-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center border border-primary-500/20 shadow-sm">
              <Forward className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-100">Advanced No-Quote Forwarding</div>
              <div className="text-[10px] text-gray-400">Direct dispatch, caption editor & recipient sequencing</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto space-y-3 p-5">
          {/* Caption & Text Editor */}
          <div className="bg-dark-850/70 border border-white/5 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
              <div className="flex items-center gap-1.5 text-primary-400">
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Caption / Text Before Dispatch</span>
              </div>
              {isCaptionModified && (
                <button
                  type="button"
                  onClick={() => setNewCaption(message.text || '')}
                  className="flex items-center gap-1 text-[11px] text-accent-cyan hover:underline cursor-pointer"
                  title="Revert to original text"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <textarea
              rows={3}
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
              placeholder="Edit caption or accompanying message text..."
              className="w-full bg-dark-900/90 border border-white/10 rounded-xl p-2.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50 resize-none font-sans"
            />
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>{message.mediaType ? `Original Media: ${message.mediaType}` : 'Text Message'}</span>
              <span>{newCaption.length} characters</span>
            </div>
          </div>

          {/* Forwarding Options (Strip Quotes, Strip Captions, Silent) */}
          <div className="bg-dark-900/50 border border-white/5 rounded-2xl p-3 space-y-2">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
              Dispatch & Privacy Options
            </div>

            {/* Strip Quotes / Without Quote */}
            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-primary-500/15 text-primary-400 flex items-center justify-center shrink-0">
                  <EyeOff className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-200">
                    Strip Quotes (No-Quote Forward)
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Removes original author badge, channel link, and attribution header
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={withoutQuote}
                onChange={(e) => setWithoutQuote(e.target.checked)}
                className="w-4 h-4 accent-primary-600 rounded cursor-pointer shrink-0 ml-2"
              />
            </label>

            {/* Strip Media Captions */}
            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-accent-amber/15 text-accent-amber flex items-center justify-center shrink-0">
                  <Scissors className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-200">
                    Strip Media Captions
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Removes embedded caption text from forwarded media files
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={dropMediaCaptions}
                onChange={(e) => setDropMediaCaptions(e.target.checked)}
                className="w-4 h-4 accent-primary-600 rounded cursor-pointer shrink-0 ml-2"
              />
            </label>

            {/* Send Silently */}
            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-accent-cyan/15 text-accent-cyan flex items-center justify-center shrink-0">
                  <VolumeX className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-200">Send Silently</div>
                  <div className="text-[10px] text-gray-400">
                    Recipients receive notification banner without audible sound
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={silent}
                onChange={(e) => setSilent(e.target.checked)}
                className="w-4 h-4 accent-primary-600 rounded cursor-pointer shrink-0 ml-2"
              />
            </label>
          </div>

          {/* Selected Recipients Sequencing List */}
          {selectedChatIds.length > 0 && (
            <div className="bg-dark-850/60 border border-primary-500/20 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-300 px-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                  Dispatch Order ({selectedChatIds.length} recipients)
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedChatIds([])}
                  className="text-[11px] text-accent-cyan hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {selectedChatIds.map((chatId, idx) => (
                  <div
                    key={chatId}
                    className="flex items-center justify-between p-2 rounded-xl bg-dark-900/80 border border-white/5 text-xs text-gray-200"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-primary-600/30 text-primary-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="truncate font-medium">{getChatTitle(chatId)}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => handleMoveRecipient(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up in Dispatch Order"
                        className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveRecipient(idx, 'down')}
                        disabled={idx === selectedChatIds.length - 1}
                        title="Move Down in Dispatch Order"
                        className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(chatId)}
                        title="Remove Recipient"
                        className="p-1 rounded-lg hover:bg-accent-rose/20 text-gray-400 hover:text-accent-rose cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Destination Chat Search & List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                placeholder="Search destination chats..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-dark-800 border border-white/5 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
              />
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {(!search || 'saved messages'.includes(search.toLowerCase())) && (
                <div
                  onClick={() => handleToggleChat('me')}
                  className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors text-xs border ${
                    selectedChatIds.includes('me')
                      ? 'bg-primary-600/20 border-primary-500/40 text-white'
                      : 'bg-dark-850/50 hover:bg-dark-800 border-white/5 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-accent-cyan/15 text-accent-cyan flex items-center justify-center shrink-0">
                      <Bookmark className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate font-medium">Saved Messages</span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                      selectedChatIds.includes('me')
                        ? 'bg-primary-600 border-primary-500 text-white'
                        : 'border-white/20 bg-dark-900/60'
                    }`}
                  >
                    {selectedChatIds.includes('me') && (
                      <span className="text-[10px] font-bold">
                        {selectedChatIds.indexOf('me') + 1}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {filtered.map((d) => {
                const isSelected = selectedChatIds.includes(d.id)
                const orderIndex = selectedChatIds.indexOf(d.id)
                return (
                  <div
                    key={d.id}
                    onClick={() => handleToggleChat(d.id)}
                    className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors text-xs border ${
                      isSelected
                        ? 'bg-primary-600/20 border-primary-500/40 text-white'
                        : 'bg-dark-850/50 hover:bg-dark-800 border-white/5 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-dark-800 text-gray-400 flex items-center justify-center font-bold text-[11px] shrink-0 border border-white/5">
                        {d.avatarInitials || d.title.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{d.title}</div>
                        {d.username && (
                          <div className="text-[10px] text-gray-500 truncate">@{d.username}</div>
                        )}
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                        isSelected
                          ? 'bg-primary-600 border-primary-500 text-white'
                          : 'border-white/20 bg-dark-900/60'
                      }`}
                    >
                      {isSelected ? (
                        <span className="text-[10px] font-bold">{orderIndex + 1}</span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between gap-2 bg-dark-900/80">
          <div className="text-xs text-gray-400">
            {selectedChatIds.length > 0 ? (
              <span>
                Ordered dispatch to <strong className="text-white">{selectedChatIds.length}</strong>{' '}
                {selectedChatIds.length === 1 ? 'chat' : 'chats'}
              </span>
            ) : (
              <span>Select destination chats</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleForward}
              disabled={selectedChatIds.length === 0 || loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white shadow-glow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Forward className="w-3.5 h-3.5" />
              <span>
                {loading
                  ? 'Forwarding...'
                  : selectedChatIds.length > 1
                  ? `Forward to ${selectedChatIds.length} Chats`
                  : selectedChatIds.length === 1
                  ? 'Forward Now'
                  : 'Select Chats'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
