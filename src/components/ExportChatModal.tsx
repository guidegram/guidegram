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
  Image,
  Video,
  Mic,
  File,
  Music,
} from 'lucide-react'
import { DialogItem, ExportChatHistoryOptions } from '../types/telegram'
import { useI18n } from '../i18n'

interface ExportChatModalProps {
  isOpen: boolean
  onClose: () => void
  chat: DialogItem
  accountId: string
}

const MEDIA_TYPES: Array<{ id: 'photo' | 'video' | 'voice' | 'document' | 'audio'; label: string; icon: React.ElementType }> = [
  { id: 'photo', label: 'Photos', icon: Image },
  { id: 'video', label: 'Videos', icon: Video },
  { id: 'voice', label: 'Voice Notes', icon: Mic },
  { id: 'document', label: 'Files', icon: File },
  { id: 'audio', label: 'Music', icon: Music },
]

export const ExportChatModal: React.FC<ExportChatModalProps> = ({
  isOpen,
  onClose,
  chat,
  accountId,
}) => {
  const { t, language } = useI18n()
  const isPersian = language === 'fa'

  const [format, setFormat] = useState<'html' | 'json'>('html')
  const [limit, setLimit] = useState<number>(500)
  const [includeMedia, setIncludeMedia] = useState(true)
  const [selectedTypes, setSelectedTypes] = useState<Array<'text' | 'photo' | 'video' | 'voice' | 'audio' | 'document' | 'sticker'>>([])
  const [fromDateStr, setFromDateStr] = useState<string>('')
  const [toDateStr, setToDateStr] = useState<string>('')
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<{
    success: boolean
    totalMessages: number
    filePath?: string
    error?: string
  } | null>(null)

  if (!isOpen) return null

  const toggleType = (typeId: 'photo' | 'video' | 'voice' | 'document' | 'audio') => {
    setSelectedTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    )
  }

  const handleStartExport = async () => {
    setIsExporting(true)
    setExportResult(null)

    try {
      const fromDate = fromDateStr ? Math.floor(new Date(fromDateStr).getTime() / 1000) : undefined
      const toDate = toDateStr ? Math.floor(new Date(toDateStr).getTime() / 1000) : undefined

      const options: ExportChatHistoryOptions = {
        format,
        limit,
        includeMedia,
        selectedTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
        fromDate,
        toDate,
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
        className="bg-[#17212b] border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-cyan/15 text-accent-cyan flex items-center justify-center">
              <FolderDown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {isPersian ? 'خروجی تاریخچه گفتگو' : 'Export Chat History'}
              </h3>
              <p className="text-[11px] text-gray-400 truncate max-w-[280px]">{chat.title}</p>
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
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Format Selection */}
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-2">
              {isPersian ? 'قالب فایل خروجی' : 'Export Format'}
            </label>
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
                  <span className="text-xs">{isPersian ? 'صفحه وب HTML آفلاین' : 'HTML Web Archive'}</span>
                </div>
                <span className="text-[10px] text-gray-400 font-normal">
                  {isPersian ? 'قابل مشاهده در تمام مرورگرها با ظاهر تلگرام' : 'Human-readable standalone web page with Telegram styling'}
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
                  <span className="text-xs">{isPersian ? 'داده خام JSON' : 'JSON Data'}</span>
                </div>
                <span className="text-[10px] text-gray-400 font-normal">
                  {isPersian ? 'ساختار داده‌ای مناسب برنامه‌نویسی و پردازش' : 'Raw machine-readable structured message objects'}
                </span>
              </button>
            </div>
          </div>

          {/* Message Limit */}
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-2">
              {isPersian ? 'سقف تعداد پیام‌ها' : 'Message Count Limit'}
            </label>
            <div className="flex items-center gap-2">
              {[100, 500, 1000, 3000, 10000].map((amt) => (
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
                  {amt >= 1000 ? `${amt / 1000}k` : amt}
                </button>
              ))}
            </div>
          </div>

          {/* Media Types Filter */}
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-2">
              {isPersian ? 'فیلتر رسانه‌ها (اختیاری)' : 'Media Filters (Optional)'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MEDIA_TYPES.map((m) => {
                const Icon = m.icon
                const active = selectedTypes.includes(m.id)
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleType(m.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? 'bg-accent-cyan/20 border border-accent-cyan/50 text-accent-cyan font-bold'
                        : 'bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date Range Filters */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-gray-400 block mb-1">
                {isPersian ? 'از تاریخ' : 'From Date'}
              </label>
              <input
                type="date"
                value={fromDateStr}
                onChange={(e) => setFromDateStr(e.target.value)}
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-accent-cyan/50"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-400 block mb-1">
                {isPersian ? 'تا تاریخ' : 'To Date'}
              </label>
              <input
                type="date"
                value={toDateStr}
                onChange={(e) => setToDateStr(e.target.value)}
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-accent-cyan/50"
              />
            </div>
          </div>

          {/* Media Metadata Toggle */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">
                {isPersian ? 'شامل متادیتای فایل‌ها' : 'Include Media Metadata'}
              </div>
              <div className="text-[11px] text-gray-400">
                {isPersian ? 'نام فایل، ابعاد، پسوند و حجم رسانه‌ها' : 'File name, duration, size, and mime-type'}
              </div>
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
                    <div className="font-bold">{isPersian ? 'خروجی با موفقیت ذخیره شد!' : 'Chat Export Successful!'}</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      {exportResult.totalMessages} messages
                      {exportResult.filePath ? ` ➔ ${exportResult.filePath}` : ''}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <div className="font-bold">{isPersian ? 'خطا در استخراج' : 'Export Incomplete'}</div>
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
            {isPersian ? 'انصراف' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleStartExport}
            className="px-5 py-2 rounded-xl bg-accent-cyan text-dark-950 font-bold text-xs hover:bg-accent-cyan/90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? (isPersian ? 'در حال خروجی...' : 'Exporting...') : (isPersian ? 'ذخیره و دریافت فایل' : 'Save & Export')}</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
