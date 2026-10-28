import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  X,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  PenTool,
  Sliders,
  Check,
  Undo2,
  Maximize2,
  Sparkles,
} from 'lucide-react'

export interface ImageEditorModalProps {
  isOpen: boolean
  imageSrc: string
  fileName: string
  onClose: () => void
  onSave: (editedFilePath: string, newFileName: string) => void
}

type AspectRatio = 'free' | '1:1' | '4:3' | '16:9' | '9:16'
type EditorTab = 'crop' | 'draw' | 'adjust'

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  isOpen,
  imageSrc,
  fileName,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('crop')
  const [rotation, setRotation] = useState<number>(0)
  const [flipH, setFlipH] = useState<boolean>(false)
  const [flipV, setFlipV] = useState<boolean>(false)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free')

  // Adjustments
  const [brightness, setBrightness] = useState<number>(100)
  const [contrast, setContrast] = useState<number>(100)
  const [saturation, setSaturation] = useState<number>(100)
  const [filterMode, setFilterMode] = useState<'normal' | 'grayscale' | 'sepia' | 'invert'>('normal')

  // Drawing
  const [penColor, setPenColor] = useState<string>('#00b0ff')
  const [brushSize, setBrushSize] = useState<number>(4)
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [drawHistory, setDrawHistory] = useState<ImageData[]>([])

  // Cropping rect in percentage [0..1]
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 1,
    h: 1,
  })

  const [isSaving, setIsSaving] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageObjRef = useRef<HTMLImageElement | null>(null)
  const isDraggingCropRef = useRef<boolean>(false)
  const dragHandleRef = useRef<'move' | 'nw' | 'ne' | 'se' | 'sw' | null>(null)
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; box: typeof cropBox }>({
    mouseX: 0,
    mouseY: 0,
    box: { x: 0, y: 0, w: 1, h: 1 },
  })

  // Load image object
  useEffect(() => {
    if (!isOpen || !imageSrc) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageObjRef.current = img
      setCropBox({ x: 0, y: 0, w: 1, h: 1 })
      setRotation(0)
      setFlipH(false)
      setFlipV(false)
      setBrightness(100)
      setContrast(100)
      setSaturation(100)
      setFilterMode('normal')
      setDrawHistory([])
      renderCanvas()
    }
    img.onerror = () => {
      console.warn('[ImageEditorModal] Failed to load image:', imageSrc)
    }
    img.src = imageSrc
  }, [isOpen, imageSrc])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageObjRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isRotated90or270 = rotation % 180 !== 0
    const baseW = isRotated90or270 ? img.naturalHeight : img.naturalWidth
    const baseH = isRotated90or270 ? img.naturalWidth : img.naturalHeight

    canvas.width = baseW
    canvas.height = baseH

    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Apply color adjustments & CSS filters
    let filterString = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    if (filterMode === 'grayscale') filterString += ' grayscale(100%)'
    if (filterMode === 'sepia') filterString += ' sepia(100%)'
    if (filterMode === 'invert') filterString += ' invert(100%)'
    ctx.filter = filterString

    // Transform coordinate system for Rotation & Flip
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)

    ctx.drawImage(
      img,
      -img.naturalWidth / 2,
      -img.naturalHeight / 2,
      img.naturalWidth,
      img.naturalHeight
    )
    ctx.restore()

    // Restore drawn paths if any
    if (drawHistory.length > 0) {
      const lastState = drawHistory[drawHistory.length - 1]
      if (lastState && lastState.width === canvas.width && lastState.height === canvas.height) {
        ctx.putImageData(lastState, 0, 0)
      }
    }
  }, [rotation, flipH, flipV, brightness, contrast, saturation, filterMode, drawHistory])

  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleFlipHorizontal = () => {
    setFlipH((prev) => !prev)
  }

  const handleFlipVertical = () => {
    setFlipV((prev) => !prev)
  }

  const handleSelectAspectRatio = (ratio: AspectRatio) => {
    setAspectRatio(ratio)
    if (ratio === 'free') {
      setCropBox({ x: 0, y: 0, w: 1, h: 1 })
      return
    }

    let targetRatio = 1
    if (ratio === '1:1') targetRatio = 1
    if (ratio === '4:3') targetRatio = 4 / 3
    if (ratio === '16:9') targetRatio = 16 / 9
    if (ratio === '9:16') targetRatio = 9 / 16

    const canvas = canvasRef.current
    if (!canvas) return

    const canvasRatio = canvas.width / canvas.height
    if (canvasRatio > targetRatio) {
      // Canvas is wider than target
      const newW = (canvas.height * targetRatio) / canvas.width
      setCropBox({
        x: (1 - newW) / 2,
        y: 0,
        w: newW,
        h: 1,
      })
    } else {
      // Canvas is taller than target
      const newH = (canvas.width / targetRatio) / canvas.height
      setCropBox({
        x: 0,
        y: (1 - newH) / 2,
        w: 1,
        h: newH,
      })
    }
  }

  // Drawing mechanics on canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTab !== 'draw') return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Save history before drawing
    try {
      const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height)
      setDrawHistory((prev) => [...prev.slice(-10), currentState])
    } catch {}

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.strokeStyle = penColor
    ctx.lineWidth = brushSize * scaleX
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    setIsDrawing(true)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTab !== 'draw') return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false)
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          try {
            const newState = ctx.getImageData(0, 0, canvas.width, canvas.height)
            setDrawHistory((prev) => [...prev.slice(-10), newState])
          } catch {}
        }
      }
    }
  }

  const handleUndo = () => {
    if (drawHistory.length === 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const newHistory = [...drawHistory]
    const previousState = newHistory.pop()
    setDrawHistory(newHistory)

    if (previousState) {
      ctx.putImageData(previousState, 0, 0)
    } else {
      renderCanvas()
    }
  }

  // Export and Save processed image
  const handleSave = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setIsSaving(true)

    try {
      // Create output canvas applying cropping
      const cropX = Math.round(cropBox.x * canvas.width)
      const cropY = Math.round(cropBox.y * canvas.height)
      const cropW = Math.round(cropBox.w * canvas.width)
      const cropH = Math.round(cropBox.h * canvas.height)

      const outputCanvas = document.createElement('canvas')
      outputCanvas.width = Math.max(1, cropW)
      outputCanvas.height = Math.max(1, cropH)

      const outCtx = outputCanvas.getContext('2d')
      if (outCtx) {
        outCtx.drawImage(
          canvas,
          cropX,
          cropY,
          cropW,
          cropH,
          0,
          0,
          cropW,
          cropH
        )
      }

      // Convert to blob and save as temp file via Guidegram IPC
      const blob = await new Promise<Blob | null>((resolve) =>
        outputCanvas.toBlob(resolve, 'image/jpeg', 0.92)
      )

      if (blob && window.guidegram?.saveTempFile) {
        const arrayBuf = await blob.arrayBuffer()
        const ext = fileName.split('.').pop() || 'jpg'
        const baseName = fileName.replace(/\.[^/.]+$/, '')
        const newName = `${baseName}_edited.${ext}`
        const savedPath = await window.guidegram.saveTempFile({
          buffer: arrayBuf,
          filename: newName,
        })
        onSave(savedPath, newName)
        onClose()
      } else {
        // Fallback for browser mode: data URL
        const dataUrl = outputCanvas.toDataURL('image/jpeg', 0.92)
        onSave(dataUrl, `edited_${fileName}`)
        onClose()
      }
    } catch (err) {
      console.error('[ImageEditor] Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col select-none animate-in fade-in duration-200"
    >
      {/* Header Bar */}
      <header className="h-14 px-6 border-b border-white/10 flex items-center justify-between bg-dark-900/90 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Photo Editor</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400 font-mono">
                {fileName}
              </span>
            </h2>
            <p className="text-[11px] text-gray-400">Telegram Desktop Photo & Canvas Editor Parity</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center bg-dark-800/80 p-1 rounded-xl border border-white/5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('crop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'crop'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Crop className="w-3.5 h-3.5" />
            <span>Crop & Rotate</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('draw')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'draw'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Draw</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('adjust')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'adjust'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Adjust</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Apply & Save</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden p-6 bg-dark-950">
        <div className="relative max-w-full max-h-full flex items-center justify-center">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`max-w-[75vw] max-h-[65vh] object-contain rounded-xl shadow-2xl transition-all ${
              activeTab === 'draw' ? 'cursor-crosshair' : 'cursor-default'
            }`}
          />

          {/* Interactive Crop Overlay Box */}
          {activeTab === 'crop' && (
            <div
              className="absolute pointer-events-none border-2 border-dashed border-primary-400 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
              style={{
                left: `${cropBox.x * 100}%`,
                top: `${cropBox.y * 100}%`,
                width: `${cropBox.w * 100}%`,
                height: `${cropBox.h * 100}%`,
              }}
            >
              {/* Corner indicators */}
              <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-primary-500 rounded-full" />
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-primary-500 rounded-full" />
              <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-primary-500 rounded-full" />
              <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-primary-500 rounded-full" />
            </div>
          )}
        </div>
      </div>

      {/* Tool Dock at Bottom */}
      <footer className="h-20 px-8 border-t border-white/10 bg-dark-900/90 flex items-center justify-center gap-6 shrink-0">
        {activeTab === 'crop' && (
          <div className="flex items-center gap-4 animate-in fade-in">
            {/* Aspect Ratio Options */}
            <div className="flex items-center bg-dark-800 p-1 rounded-xl border border-white/5 text-xs">
              {(['free', '1:1', '4:3', '16:9', '9:16'] as AspectRatio[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleSelectAspectRatio(r)}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    aspectRatio === r
                      ? 'bg-primary-600/40 text-primary-300 border border-primary-500/40'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-white/10" />

            {/* Transform Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRotate}
                title="Rotate 90 degrees clockwise"
                className="p-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white border border-white/5 transition-colors cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleFlipHorizontal}
                title="Flip Horizontal"
                className="p-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white border border-white/5 transition-colors cursor-pointer"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleFlipVertical}
                title="Flip Vertical"
                className="p-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white border border-white/5 transition-colors cursor-pointer"
              >
                <FlipVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'draw' && (
          <div className="flex items-center gap-6 animate-in fade-in">
            {/* Color Palette */}
            <div className="flex items-center gap-2 bg-dark-800 p-1.5 rounded-xl border border-white/5">
              {['#00b0ff', '#ef4444', '#22c55e', '#eab308', '#a855f7', '#ffffff', '#0f172a'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPenColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                    penColor === c ? 'scale-125 border-white shadow-md' : 'border-black/20 hover:scale-110'
                  }`}
                />
              ))}
            </div>

            {/* Brush Size */}
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <span className="font-semibold text-gray-400">Brush:</span>
              <input
                type="range"
                min="1"
                max="24"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-24 accent-primary-500 cursor-pointer"
              />
              <span className="font-mono text-gray-400">{brushSize}px</span>
            </div>

            {/* Undo */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={drawHistory.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-xs font-semibold text-gray-300 hover:text-white border border-white/5 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
          </div>
        )}

        {activeTab === 'adjust' && (
          <div className="flex items-center gap-8 animate-in fade-in text-xs">
            {/* Brightness */}
            <div className="flex items-center gap-2 text-gray-300">
              <span className="font-medium text-gray-400">Brightness:</span>
              <input
                type="range"
                min="40"
                max="180"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-24 accent-primary-500 cursor-pointer"
              />
              <span className="font-mono text-gray-400 w-8">{brightness}%</span>
            </div>

            {/* Contrast */}
            <div className="flex items-center gap-2 text-gray-300">
              <span className="font-medium text-gray-400">Contrast:</span>
              <input
                type="range"
                min="40"
                max="180"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-24 accent-primary-500 cursor-pointer"
              />
              <span className="font-mono text-gray-400 w-8">{contrast}%</span>
            </div>

            {/* Saturation */}
            <div className="flex items-center gap-2 text-gray-300">
              <span className="font-medium text-gray-400">Saturation:</span>
              <input
                type="range"
                min="0"
                max="200"
                value={saturation}
                onChange={(e) => setSaturation(Number(e.target.value))}
                className="w-24 accent-primary-500 cursor-pointer"
              />
              <span className="font-mono text-gray-400 w-8">{saturation}%</span>
            </div>

            {/* Presets */}
            <div className="flex items-center bg-dark-800 p-1 rounded-xl border border-white/5">
              {(['normal', 'grayscale', 'sepia', 'invert'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                    filterMode === mode
                      ? 'bg-primary-600/40 text-primary-300 border border-primary-500/40 font-semibold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        )}
      </footer>
    </div>
  )
}
