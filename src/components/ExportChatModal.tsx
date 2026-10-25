import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  Download,
  FileCode,
  FileText,
  Filter,
  Check,
  AlertCircle,
  FolderDown,
  Calendar,
  Sparkles,
} from 'lucide-react'
import { DialogItem, ExportChatHistoryOptions } from '../types/telegram'

interface ExportChatModalProps {
  isOpen: boolean
  onClose: () => void
  chat: DialogItem
  accountId: string
}

export const ExportChatModal: React.FC<ExportChatModalProps> = ({
  isOpen,
  onClose,
  chat,
  accountId,
}) => {
  const [format, setFormat] = useState<'html' | 'json'>('html')
  const [limit, setLimit] = useState<number>(500)
  const [includeMedia, setIncludeMedia] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<{
    success: boolean
    totalMessages: number
    filePath?: string
    error?: string
  } | null>(null)

  if (!isOpen) return null

  const handleStartExport = async () => {
    setIsExporting(true)
    setExportResult(null)

    try {
      const options: ExportChatHistoryOptions = {
        format,
        limit,
        includeMedia,
      }

      const res = await window.guidegram?.exportChatHistory?.(
        accountId,
        chat.id,
        options,
        true
      )

      if (res && res.success) {
        setExportResult({
          success: true,
          totalMessages: res.totalMessages,
          filePath: res.filePath,
        })
      } else {
        setExportResult({
          success: false,
          totalMessages: 0,
          error: res?.error || 'Export canceled or failed',
        })
      }
    } catch (err: any) {
      setExportResult({
        success: false,
        totalMessages: 0,
        error: err?.message || 'Export failed',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="bg-[#17212b] border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FolderDown className="w-5 h-5 text-accent-cyan" />
            <div>
              <h3 className="font-bold text-sm text-white">Export Chat History</h3>
              <p className="text-[11px] text-gray-400 truncate max-w-[240px]">{chat.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {/* Format Selection */}
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-2">Export Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('html')}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  format === 'html'
                    ? 'border-accent-cyan bg-accent-cyan/10 text-white font-bold'
                    : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className={`w-4 h-4 ${format === 'html' ? 'text-accent-cyan' : 'text-gray-400'}`} />
                  <span className="text-xs">HTML Archive</span>
                </div>
                <span className="text-[10px] text-gray-400 font-normal">
                  Human-readable offline web page with dark theme
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  format === 'json'
                    ? 'border-accent-cyan bg-accent-cyan/10 text-white font-bold'
                    : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileCode className={`w-4 h-4 ${format === 'json' ? 'text-accent-cyan' : 'text-gray-400'}`} />
                  <span className="text-xs">JSON Data</span>
                </div>
                <span className="text-[10px] text-gray-400 font-normal">
                  Raw machine-readable structured message objects
                </span>
              </button>
            </div>
          </div>

          {/* Message Limit */}
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-2">Message Count Limit</label>
            <div className="flex items-center gap-2">
              {[100, 500, 1000, 3000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setLimit(amt)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-mono transition-colors cursor-pointer ${
                    limit === amt
                      ? 'bg-accent-cyan text-dark-950 font-bold'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>

          {/* Media Inclusions */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Include Media Metadata</div>
              <div className="text-[11px] text-gray-400">Include photo, voice, video and document details</div>
            </div>
            <button
              type="button"
              onClick={() => setIncludeMedia(!includeMedia)}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                includeMedia ? 'bg-accent-cyan' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-dark-950 absolute top-0.5 transition-transform ${
                  includeMedia ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Result Feedback */}
          {exportResult && (
            <div
              className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
                exportResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {exportResult.success ? (
                <>
                  <Check className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <div className="font-bold">Chat Export Successful!</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Exported {exportResult.totalMessages} messages
                      {exportResult.filePath ? ` to: ${exportResult.filePath}` : ''}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <div className="font-bold">Export Incomplete</div>
                    <div className="text-[11px] opacity-80 mt-0.5">{exportResult.error}</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="px-5 py-4 border-t border-white/5 bg-dark-900/40 flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleStartExport}
            className="px-5 py-2 rounded-xl bg-accent-cyan text-dark-950 font-bold text-xs hover:bg-accent-cyan/90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting History...' : 'Save & Export'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
