import React from 'react'
import { motion } from 'motion/react'
import { Command, X, Navigation, MessageSquare, Settings, Keyboard } from 'lucide-react'
import { useI18n } from '../i18n'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ShortcutItem {
  keys: string[]
  description: string
  category: 'navigation' | 'chat' | 'system'
}

export const KEYBOARD_SHORTCUTS: ShortcutItem[] = [
  // Navigation
  { keys: ['Alt', '↑'], description: 'Navigate to previous chat', category: 'navigation' },
  { keys: ['Alt', '↓'], description: 'Navigate to next chat', category: 'navigation' },
  { keys: ['Alt', '←'], description: 'Previous folder tab', category: 'navigation' },
  { keys: ['Alt', '→'], description: 'Next folder tab', category: 'navigation' },
  { keys: ['Ctrl', '1…9'], description: 'Switch active account', category: 'navigation' },
  { keys: ['Ctrl', 'K'], description: 'Quick search / Jump to chat', category: 'navigation' },

  // Chat Actions
  { keys: ['Ctrl', 'F'], description: 'Search inside active chat', category: 'chat' },
  { keys: ['Esc'], description: 'Close modal, clear reply, or back to chat list', category: 'chat' },
  { keys: ['Ctrl', 'O'], description: 'Attach file or media', category: 'chat' },
  { keys: ['Enter'], description: 'Send message', category: 'chat' },
  { keys: ['Shift', 'Enter'], description: 'New line in composer', category: 'chat' },
  { keys: ['Ctrl', '↑'], description: 'Edit last sent message', category: 'chat' },

  // System & General
  { keys: ['Ctrl', '/'], description: 'Show keyboard shortcuts cheat sheet', category: 'system' },
  { keys: ['F1'], description: 'Help & keyboard shortcuts', category: 'system' },
  { keys: ['Ctrl', 'M'], description: 'Toggle mute for current chat', category: 'system' },
  { keys: ['Ctrl', 'R'], description: 'Refresh current chat / sync history', category: 'system' },
]

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const { t, language } = useI18n()
  const isPersian = language === 'fa'

  if (!isOpen) return null

  const navigationShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.category === 'navigation')
  const chatShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.category === 'chat')
  const systemShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.category === 'system')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="w-full max-w-xl bg-dark-850 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-cyan/15 text-accent-cyan flex items-center justify-center">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isPersian ? 'میانبرهای صفحه کلید (Telegram Desktop)' : 'Keyboard Shortcuts (Telegram Desktop)'}
              </h3>
              <p className="text-[11px] text-gray-400">
                {isPersian ? 'ناوبری سریع، سوئیچ گفتگوها و کنترل بدون ماوس' : 'Power navigation & full keyboard control'}
              </p>
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

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Navigation Section */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-accent-cyan uppercase tracking-wider">
              <Navigation className="w-3.5 h-3.5" />
              <span>{isPersian ? 'ناوبری و جابجایی' : 'Navigation'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {navigationShortcuts.map((s, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-300">{s.description}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {s.keys.map((k, kIdx) => (
                      <kbd key={kIdx} className="px-1.5 py-0.5 rounded-md bg-dark-900 border border-white/15 text-[10px] font-mono font-bold text-accent-cyan shadow-xs">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Actions Section */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-primary-400 uppercase tracking-wider">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{isPersian ? 'عملیات پیام و چت' : 'Chat & Messages'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {chatShortcuts.map((s, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-300">{s.description}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {s.keys.map((k, kIdx) => (
                      <kbd key={kIdx} className="px-1.5 py-0.5 rounded-md bg-dark-900 border border-white/15 text-[10px] font-mono font-bold text-primary-300 shadow-xs">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Section */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-accent-violet uppercase tracking-wider">
              <Settings className="w-3.5 h-3.5" />
              <span>{isPersian ? 'سیستم و راهنما' : 'System & Help'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {systemShortcuts.map((s, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-300">{s.description}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {s.keys.map((k, kIdx) => (
                      <kbd key={kIdx} className="px-1.5 py-0.5 rounded-md bg-dark-900 border border-white/15 text-[10px] font-mono font-bold text-accent-violet shadow-xs">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/5 bg-dark-900/40 flex items-center justify-between text-xs text-gray-500">
          <span>{isPersian ? 'کلید Esc برای بستن پنجره' : 'Press Esc to close'}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-colors cursor-pointer"
          >
            {isPersian ? 'متوجه شدم' : 'Got it'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
