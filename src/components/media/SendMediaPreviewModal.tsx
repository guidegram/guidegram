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
  Plus,
} from 'lucide-react'
import { ImageEditorModal } from './ImageEditorModal'
import { useI18n } from '../../i18n'
import { isRTL } from '../../utils/textUtils'

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
      groupInAlbum?: boolean
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
  const { t, isRTL: isRTLContext } = useI18n()
  const [items, setItems] = useState<SendMediaItem[]>(initialItems)
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  // Default to compressed photo sending like Telegram Desktop parity
  const [compress, setCompress] = useState<boolean>(true)
  // Default to album grouping like Telegram Desktop parity
  const [groupInAlbum, setGroupInAlbum] = useState<boolean>(true)
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
    setGroupInAlbum(true)
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

  // Append new media items with duplicate and limit guards (Telegram maximum 10 items)
  const appendMediaItems = useCallback((newMedia: SendMediaItem[]) => {
    if (newMedia.length === 0) return
    setItems((prev) => {
      const existingPaths = new Set(prev.map((it) => it.path))
      const deduplicated = newMedia.filter((it) => !existingPaths.has(it.path))
      if (deduplicated.length === 0) return prev
      const combined = [...prev, ...deduplicated].slice(0, 10)
      return combined
    })
    setCurrentIndex((prev) => {
      return Math.min(items.length + newMedia.length - 1, 9)
    })
  }, [items.length])

  // Pick more files from disk via openFileDialog (+)
  const handlePickMoreFiles = useCallback(async () => {
    if (!window.guidegram?.openFileDialog) return
    try {
      const res = await window.guidegram.openFileDialog({
        type: 'media',
        allowMultiple: true,
        title: 'Add photos or videos to album',
      })
      if (!res.canceled && res.filePaths.length > 0) {
        const newItems: SendMediaItem[] = res.filePaths.map((fp) => ({
          path: fp,
          name: fp.split(/[\\/]/).pop() || 'media',
          type: 'media',
        }))
        appendMediaItems(newItems)
      }
    } catch (err) {
      console.warn('Failed to pick more files:', err)
    }
  }, [appendMediaItems])

  // Handle Pasting new images directly into the modal (single or multiple)
  const handleModalPaste = useCallback(async (e: React.ClipboardEvent | ClipboardEvent) => {
    const clipboardData = (e as any).clipboardData
    if (!clipboardData) return

    const files = clipboardData.files
    const clipItems = clipboardData.items
    const extracted: SendMediaItem[] = []

    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const isImg = file.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp|gif|heic)$/i.test(file.name)
        const isVid = file.type?.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(file.name)
        if (!isImg && !isVid) continue

        let filePath = ''
        if (window.guidegram?.getPathForFile) {
          try {
            filePath = window.guidegram.getPathForFile(file)
          } catch {}
        }
        if (!filePath) {
          filePath = (file as any).path || ''
        }
        if (!filePath && window.guidegram?.saveTempFile) {
          try {
            const buffer = await file.arrayBuffer()
            const ext = file.type?.split('/')[1] || 'png'
            filePath = await window.guidegram.saveTempFile({
              buffer,
              filename: file.name || `Pasted_Image_${Date.now()}_${i + 1}.${ext}`,
            })
          } catch (err) {
            console.warn('[ModalPaste] Failed to save temp file:', err)
          }
        }
        if (!filePath) {
          filePath = URL.createObjectURL(file)
        }

        if (filePath) {
          extracted.push({
            path: filePath,
            name: file.name || `Pasted_Image_${Date.now()}_${i + 1}.png`,
            size: file.size,
            type: 'media',
          })
        }
      }
    } else if (clipItems && clipItems.length > 0) {
      for (let i = 0; i < clipItems.length; i++) {
        const item = clipItems[i]
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            let filePath = ''
            if (window.guidegram?.saveTempFile) {
              try {
                const buffer = await file.arrayBuffer()
                const ext = file.type.split('/')[1] || 'png'
                filePath = await window.guidegram.saveTempFile({
                  buffer,
                  filename: `Pasted_Image_${Date.now()}_${i + 1}.${ext}`,
                })
              } catch (err) {
                console.warn('[ModalPaste] Failed to save in-memory clipboard image:', err)
              }
            }
            if (!filePath) {
              filePath = URL.createObjectURL(file)
            }
            if (filePath) {
              extracted.push({
                path: filePath,
                name: `Pasted_Image_${Date.now()}_${i + 1}.png`,
                size: file.size,
                type: 'media',
              })
            }
          }
        }
      }
    }

    if (extracted.length > 0) {
      e.preventDefault()
      e.stopPropagation?.()
      appendMediaItems(extracted)
    }
  }, [appendMediaItems])

  // Attach global paste handler when modal is active
  useEffect(() => {
    if (!isOpen || isEditing) return
    const onWindowPaste = (e: ClipboardEvent) => {
      handleModalPaste(e)
    }
    window.addEventListener('paste', onWindowPaste)
    return () => window.removeEventListener('paste', onWindowPaste)
  }, [isOpen, isEditing, handleModalPaste])

  // Drag and drop handler
  const handleDropMedia = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const newItems: SendMediaItem[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        let filePath = ''
        if (window.guidegram?.getPathForFile) {
          try { filePath = window.guidegram.getPathForFile(file) } catch {}
        }
        if (!filePath) filePath = (file as any).path || ''
        if (filePath) {
          newItems.push({
            path: filePath,
            name: file.name,
            size: file.size,
            type: 'media',
          })
        }
      }
      if (newItems.length > 0) {
        appendMediaItems(newItems)
      }
    }
  }, [appendMediaItems])

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
      groupInAlbum,
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
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropMedia}
        onPaste={handleModalPaste}
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
                  title={t('media_preview.crop_edit')}
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
                  title={t('media_preview.rotate_90')}
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
                  title={t('media_preview.spoiler')}
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

            {/* Thumbnail Strip for Multi-Images & Add Photo (+) */}
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

              {/* Add Photo Button (Telegram Desktop Parity - up to 10 album limit) */}
              {items.length < 10 && (
                <button
                  type="button"
                  onClick={handlePickMoreFiles}
                  className="w-14 h-14 rounded-lg border-2 border-dashed border-white/20 hover:border-primary-400 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center text-gray-400 hover:text-white transition-all shrink-0 cursor-pointer group"
                  title="Add photo to album (or paste with Ctrl+V)"
                >
                  <Plus className="w-4 h-4 group-hover:scale-110 transition-transform text-primary-400" />
                  <span className="text-[9px] font-semibold mt-0.5 text-gray-400 group-hover:text-gray-200">Add</span>
                </button>
              )}
            </div>
          </div>

          {/* Telegram Parity Settings: Compression Toggle, Album Grouping & Caption */}
          <div className="px-5 py-3 bg-dark-900/60 border-t border-white/5 space-y-3">
            {/* Telegram Parity: "Group in an album" Toggle (Visible when 2+ items) */}
            {items.length >= 2 && (
              <div
                onClick={() => setGroupInAlbum((prev) => !prev)}
                className="flex items-center justify-between p-3 rounded-xl bg-dark-800/70 border border-white/5 hover:border-white/15 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                      groupInAlbum
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'border border-white/30 bg-white/5 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-primary-400" />
                      <span>Group in an album</span>
                      <span className="text-[10px] text-primary-400 font-normal">
                        ({items.length} items)
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {groupInAlbum
                        ? 'Sends together as a native Telegram gallery with combined grid layout'
                        : 'Sends each photo as a separate individual message'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      groupInAlbum
                        ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                        : 'bg-white/10 text-gray-300 border border-white/20'
                    }`}
                  >
                    {groupInAlbum ? 'Album (Gallery)' : 'Separate'}
                  </span>
                </div>
              </div>
            )}

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
                      {t('media_preview.compressed_hint')}
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
                dir={caption && caption.trim() ? (isRTL(caption) ? 'rtl' : 'ltr') : (isRTLContext ? 'rtl' : 'ltr')}
                style={{
                  direction: caption && caption.trim() ? (isRTL(caption) ? 'rtl' : 'ltr') : (isRTLContext ? 'rtl' : 'ltr'),
                  textAlign: (caption && caption.trim() ? isRTL(caption) : isRTLContext) ? 'right' : 'left',
                }}
                onChange={(e) => setCaption(e.target.value)}
                onKeyDown={handleCaptionKeyDown}
                onPaste={handleModalPaste}
                rows={2}
                placeholder="Add a caption... (Enter to send, Shift+Enter for newline, Ctrl+V to paste more)"
                className="w-full bg-dark-800/90 text-sm text-gray-100 placeholder-gray-500 px-3.5 py-2.5 rounded-xl border border-white/10 outline-none focus:outline-none focus:border-white/20 resize-none transition-all"
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
