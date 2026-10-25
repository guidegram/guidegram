import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Palette, Check, X, Sparkles, Image, CheckCheck } from 'lucide-react'
import { useI18n } from '../../i18n'

interface ChatThemeModalProps {
  isOpen: boolean
  chatTitle: string
  currentTheme?: string
  currentWallpaper?: string
  onSelectTheme: (emoticon: string, forBoth: boolean) => Promise<void>
  onClose: () => void
}

export interface ChatThemeOption {
  id: string
  emoticon: string
  name: string
  gradient: string
  bubbleColor: string
}

export const OFFICIAL_CHAT_THEMES: ChatThemeOption[] = [
  { id: 'default', emoticon: '', name: 'Default Dark', gradient: 'from-[#0e1621] to-[#17212b]', bubbleColor: '#2b5278' },
  { id: 'day', emoticon: '☀️', name: 'Daylight', gradient: 'from-[#1e3c72] to-[#2a5298]', bubbleColor: '#3a7bd5' },
  { id: 'night', emoticon: '🌙', name: 'Midnight', gradient: 'from-[#0b0c10] to-[#1f2833]', bubbleColor: '#45a29e' },
  { id: 'violet', emoticon: '🟣', name: 'Neon Violet', gradient: 'from-[#2e0854] to-[#13072b]', bubbleColor: '#8a2be2' },
  { id: 'emerald', emoticon: '🟢', name: 'Emerald', gradient: 'from-[#064e3b] to-[#022c22]', bubbleColor: '#10b981' },
  { id: 'azure', emoticon: '🌊', name: 'Ocean Azure', gradient: 'from-[#0c4a6e] to-[#082f49]', bubbleColor: '#0ea5e9' },
  { id: 'sakura', emoticon: '🌸', name: 'Sakura Pink', gradient: 'from-[#831843] to-[#500724]', bubbleColor: '#ec4899' },
  { id: 'amber', emoticon: '🍁', name: 'Autumn Amber', gradient: 'from-[#78350f] to-[#451a03]', bubbleColor: '#f59e0b' },
  { id: 'diamond', emoticon: '💎', name: 'Arctic Diamond', gradient: 'from-[#164e63] to-[#083344]', bubbleColor: '#06b6d4' },
]

export const ChatThemeModal: React.FC<ChatThemeModalProps> = ({
  isOpen,
  chatTitle,
  currentTheme = '',
  currentWallpaper,
  onSelectTheme,
  onClose,
}) => {
  const { t, language } = useI18n()
  const isPersian = language === 'fa'

  const [selectedEmoticon, setSelectedEmoticon] = useState<string>(currentTheme)
  const [forBoth, setForBoth] = useState(true)
  const [isApplying, setIsApplying] = useState(false)

  if (!isOpen) return null

  const handleApply = async () => {
    setIsApplying(true)
    try {
      await onSelectTheme(selectedEmoticon, forBoth)
      onClose()
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="w-full max-w-md bg-dark-850 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-violet/20 text-accent-violet flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isPersian ? 'تم گفتگو و پس‌زمینه' : 'Chat Theme & Wallpaper'}
              </h3>
              <p className="text-[11px] text-gray-400 truncate max-w-[240px]">{chatTitle}</p>
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

        {/* Themes Grid */}
        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <p className="text-xs text-gray-400">
            {isPersian
              ? 'یک تم رنگی یا پس‌زمینه اختصاصی برای این گفتگو انتخاب کنید:'
              : 'Choose a dedicated color theme or background wallpaper for this conversation:'}
          </p>

          <div className="grid grid-cols-3 gap-2.5">
            {OFFICIAL_CHAT_THEMES.map((theme) => {
              const isSelected = selectedEmoticon === theme.emoticon
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedEmoticon(theme.emoticon)}
                  className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all cursor-pointer relative overflow-hidden group ${
                    isSelected
                      ? 'border-accent-cyan ring-2 ring-accent-cyan/30 scale-102 bg-white/10'
                      : 'border-white/5 bg-white/5 hover:bg-white/8 hover:border-white/15'
                  }`}
                >
                  {/* Theme Gradient Preview */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-lg shadow-inner border border-white/10 relative`}>
                    {theme.emoticon ? (
                      <span>{theme.emoticon}</span>
                    ) : (
                      <Sparkles className="w-4 h-4 text-gray-400" />
                    )}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent-cyan text-dark-950 flex items-center justify-center shadow">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-gray-200 truncate max-w-full">
                    {theme.name}
                  </span>
                </button>
              )
            })}
          </div>

          {/* For Both Users Checkbox */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">
                {isPersian ? 'اعمال برای هر دو مخاطب' : 'Apply for both users'}
              </div>
              <div className="text-[11px] text-gray-400">
                {isPersian ? 'مخاطب مقابل نیز این تم را مشاهده خواهد کرد' : 'Both participants will see the customized theme'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForBoth(!forBoth)}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                forBoth ? 'bg-accent-cyan' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-dark-950 absolute top-0.5 transition-transform ${
                  forBoth ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5 bg-dark-900/40 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            {isPersian ? 'انصراف' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={isApplying}
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-accent-cyan text-dark-950 font-bold text-xs hover:bg-accent-cyan/90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            <span>{isApplying ? (isPersian ? 'در حال اعمال...' : 'Applying...') : (isPersian ? 'اعمال تم گفتگو' : 'Apply Theme')}</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
