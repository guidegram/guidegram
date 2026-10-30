import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  Image as ImageIcon,
  FileText,
  Crop,
  RotateCw,
  Wand2,
  EyeOff,
  Sparkles,
  Send,
  Trash2,
  Check,
  Layers,
} from 'lucide-react'
import { ImageEditorModal } from './ImageEditorModal'

export interface SendMediaItem {
  path: string
  name: string
  size?: number
  type: 'media' | 'document' | 'audio'
}

export interface SendMediaPreviewModalProps {
  isOpen: boolean
  items: SendMediaItem[]
  initialCaption?: string
  onClose: () => void
  onSend: (
    items: SendMediaItem[],
    options: {
      caption: string
      compress: boolean
      isSpoiler?: boolean
    }
  ) => void
}

function toMediaUrl(filePath: string): string {
  if (!filePath) return ''
  if (
    filePath.startsWith('data:') ||
    filePath.startsWith('blob:') ||
    filePath.startsWith('guidegram-media://')
  ) {
    return filePath
  }
  return `guidegram-media://local/${encodeURIComponent(filePath)}`
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return ''
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export const SendMediaPreviewModal: React.FC<SendMediaPreviewModalProps> = ({
  isOpen,
  items: initialItems,
  initialCaption = '',
  onClose,
  onSend,
}) => {
  const [items, setItems] = useState<SendMediaItem[]>(initialItems)
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  // Default to compressed photo sending like Telegram Desktop parity
  const [compress, setCompress] = useState<boolean>(true)
  const [caption, setCaption] = useState<string>(initialCaption)
  const [isSpoiler, setIsSpoiler] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [isRotating, setIsRotating] = useState<boolean>(false)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Sync when initial items change
  useEffect(() => {
    setItems(initialItems)
    setCurrentIndex(0)
    setCaption(initialCaption)
    setCompress(true)
    setIsSpoiler(false)
    setIsEditing(false)
  }, [initialItems, initialCaption, isOpen])

  // Focus textarea on mount
  useEffect(() => {
    if (isOpen && !isEditing) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus()
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [isOpen, isEditing])

  // Escape to close
  useEffect(() => {
    if (!isOpen || isEditing) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isEditing, onClose])

  const currentItem = items[currentIndex] || items[0]

  // Quick 90-degree clockwise rotation handler
  const handleQuickRotate = useCallback(async () => {
    if (!currentItem || isRotating) return
    setIsRotating(true)
    try {
      const src = toMediaUrl(currentItem.path)
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load image for rotation'))
        img.src = src
      })

      const canvas = document.createElement('canvas')
      canvas.width = img.naturalHeight
      canvas.height = img.naturalWidth
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Failed to get 2d canvas context')

      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((90 * Math.PI) / 180)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.95)
      )

      if (blob && window.guidegram?.saveTempFile) {
        const arrayBuf = await blob.arrayBuffer()
        const ext = currentItem.name.split('.').pop() || 'jpg'
        const baseName = currentItem.name.replace(/\.[^/.]+$/, '')
        const newName = `${baseName}_rot.${ext}`
        const savedPath = await window.guidegram.saveTempFile({
          buffer: arrayBuf,
          filename: newName,
        })
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === currentIndex
              ? { ...it, path: savedPath, name: newName, size: blob.size }
              : it
          )
        )
      } else if (blob) {
        const objUrl = URL.createObjectURL(blob)
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === currentIndex
              ? { ...it, path: objUrl, size: blob.size }
              : it
          )
        )
      }
    } catch (err) {
      console.warn('[SendMediaPreviewModal] Quick rotate failed:', err)
    } finally {
      setIsRotating(false)
    }
  }, [currentItem, currentIndex, isRotating])

  // Remove single item from list
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      onClose()
      return
    }
    const nextItems = items.filter((_, i) => i !== index)
    setItems(nextItems)
    if (currentIndex >= nextItems.length) {
      setCurrentIndex(Math.max(0, nextItems.length - 1))
    }
  }

  // Handle Send action
  const handleSend = () => {
    if (items.length === 0) return
    onSend(items, {
      caption: caption.trim(),
      compress,
      isSpoiler,
    })
  }

  // Handle Enter key in caption input (Shift+Enter for newline)
  const handleCaptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen || items.length === 0) return null

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Send Media Preview"
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className="bg-dark-850 border border-white/10 rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
          {/* Header Bar */}
          <div className="h-14 px-5 border-b border-white/10 flex items-center justify-between bg-dark-900/90 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400">
                {compress ? (
                  <ImageIcon className="w-4 h-4" />
                ) : (
                  <FileText className="w-4 h-4 text-accent-cyan" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{compress ? 'Send Photo' : 'Send File'}</span>
                  {items.length > 1 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/20 border border-primary-500/30 text-primary-300 font-semibold">
                      {items.length} items
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-gray-400">
                  {compress
                    ? 'Default photo compression • Optimized for fast chat delivery'
                    : 'Uncompressed document • Preserves original resolution and data'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Photo Preview Workspace */}
          <div className="relative p-4 flex flex-col items-center bg-dark-950/60">
            <div className="w-full h-[320px] max-h-[46vh] bg-dark-900/90 rounded-xl relative flex items-center justify-center overflow-hidden border border-white/5 group shadow-inner">
              {/* Media Image */}
              <img
                src={toMediaUrl(currentItem.path)}
                alt={currentItem.name}
                className={`max-h-full max-w-full object-contain rounded-lg transition-all duration-300 select-none ${
                  isSpoiler
                    ? 'filter blur-2xl scale-105 opacity-80'
                    : 'filter drop-shadow-md'
                }`}
              />

              {/* Spoiler Overlay Effect */}
              {isSpoiler && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none animate-in fade-in">
                  <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-2 shadow-lg">
                    <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
                  </div>
                  <span className="text-xs font-semibold text-white tracking-wide">
                    Protected with Spoiler
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    Tap to reveal in chat
                  </span>
                </div>
              )}

              {/* Floating Quick Action Overlay (Telegram Desktop Parity) */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 p-1 rounded-xl bg-dark-900/80 backdrop-blur-md border border-white/10 shadow-xl opacity-90 group-hover:opacity-100 transition-opacity">
                {/* Crop & Edit Button */}
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-primary-600 text-gray-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  title="Crop & Edit photo (کراپ، چرخش، نقاشی و فیلترها)"
                >
                  <Crop className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit / Crop</span>
                </button>

                {/* Quick Rotate Button */}
                <button
                  type="button"
                  onClick={handleQuickRotate}
                  disabled={isRotating}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  title="Rotate 90° clockwise (چرخش ۹۰ درجه)"
                >
                  <RotateCw
                    className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`}
                  />
                </button>

                {/* Spoiler Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsSpoiler((prev) => !prev)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isSpoiler
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white'
                  }`}
                  title="Hide with Spoiler (اسپویلر)"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Spoiler</span>
                </button>
              </div>

              {/* Current Item Index indicator if multiple */}
              {items.length > 1 && (
                <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-gray-200 font-mono">
                  {currentIndex + 1} / {items.length}
                </div>
              )}
            </div>

            {/* Thumbnail Strip for Multi-Images */}
            {items.length > 1 && (
              <div className="w-full mt-3 flex items-center gap-2 overflow-x-auto pb-1 px-1">
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 cursor-pointer border-2 transition-all ${
                      idx === currentIndex
                        ? 'border-primary-500 scale-105 shadow-md'
                        : 'border-white/10 opacity-70 hover:opacity-100 hover:border-white/30'
                    }`}
                  >
                    <img
                      src={toMediaUrl(it.path)}
                      alt={it.name}
                      className="w-full h-full object-cover select-none"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveItem(idx)
                      }}
                      className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70 hover:bg-red-500 text-white transition-colors cursor-pointer"
                      title="Remove image"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Telegram Parity Settings: Compression Toggle & Caption */}
          <div className="px-5 py-3 bg-dark-900/60 border-t border-white/5 space-y-3">
            {/* Telegram Parity: "Compress Image" Toggle (Default Checked) */}
            <div
              onClick={() => setCompress((prev) => !prev)}
              className="flex items-center justify-between p-3 rounded-xl bg-dark-800/70 border border-white/5 hover:border-white/15 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                    compress
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'border border-white/30 bg-white/5 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors flex items-center gap-2">
                    <span>Compress image</span>
                    <span className="text-[10px] text-primary-400 font-normal">
                      (حالت فشرده - پیش‌فرض تلگرام)
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {compress
                      ? 'Sends as optimized photo for immediate preview in chat'
                      : 'Sends as uncompressed file keeping original byte-for-byte quality'}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    compress
                      ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                      : 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                  }`}
                >
                  {compress ? 'Photo (Compressed)' : 'File (Original)'}
                </span>
              </div>
            </div>

            {/* Caption Input Field */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                onKeyDown={handleCaptionKeyDown}
                rows={2}
                placeholder="Add a caption... (Enter to send, Shift+Enter for newline)"
                className="w-full bg-dark-800/90 text-sm text-gray-100 placeholder-gray-500 px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/40 resize-none transition-all"
              />
            </div>
          </div>

          {/* Modal Footer Bar */}
          <div className="h-14 px-5 border-t border-white/10 flex items-center justify-between bg-dark-900/90 shrink-0">
            {/* File Info */}
            <div className="flex items-center gap-2 text-xs text-gray-400 truncate max-w-[240px]">
              <span className="truncate font-medium text-gray-300">
                {currentItem.name}
              </span>
              {currentItem.size && (
                <span className="text-[11px] text-gray-400 shrink-0">
                  • {formatBytes(currentItem.size)}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSend}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-primary-600/30 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Editor Modal for In-depth Crop, Draw, Filters & Rotation */}
      {isEditing && currentItem && (
        <ImageEditorModal
          isOpen={isEditing}
          imageSrc={toMediaUrl(currentItem.path)}
          fileName={currentItem.name}
          onClose={() => setIsEditing(false)}
          onSave={(editedPath, newName) => {
            setItems((prev) =>
              prev.map((it, idx) =>
                idx === currentIndex
                  ? { ...it, path: editedPath, name: newName }
                  : it
              )
            )
            setIsEditing(false)
          }}
        />
      )}
    </>
  )
}
