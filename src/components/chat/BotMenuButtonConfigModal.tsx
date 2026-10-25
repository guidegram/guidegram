import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  Bot,
  Globe,
  List,
  Sparkles,
  Check,
  ExternalLink,
  Loader2,
  Terminal,
  Smartphone,
  Save,
  AlertCircle,
} from 'lucide-react'
import { useI18n } from '../../i18n'

export interface BotMenuButtonConfigModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  botId: string
  botTitle: string
  onSaved?: () => void
}

export const BotMenuButtonConfigModal: React.FC<BotMenuButtonConfigModalProps> = ({
  isOpen,
  onClose,
  accountId,
  botId,
  botTitle,
  onSaved,
}) => {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [selectedType, setSelectedType] = useState<'default' | 'commands' | 'web_app'>('commands')
  const [buttonText, setButtonText] = useState('Open App')
  const [webAppUrl, setWebAppUrl] = useState('')

  // Load existing button configuration
  useEffect(() => {
    if (!isOpen || !accountId || !botId) return
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    if (window.guidegram?.getBotMenuButton) {
      window.guidegram
        .getBotMenuButton(accountId, botId)
        .then((btn: any) => {
          if (btn) {
            if (btn.type === 'web_app') {
              setSelectedType('web_app')
              setButtonText(btn.text || 'Open App')
              setWebAppUrl(btn.url || '')
            } else if (btn.type === 'commands') {
              setSelectedType('commands')
            } else {
              setSelectedType('default')
            }
          }
        })
        .catch((err) => {
          console.warn('[BotMenuButtonConfigModal] getBotMenuButton error:', err)
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [isOpen, accountId, botId])

  if (!isOpen) return null

  // Save updated button
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId || !botId) return
    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      let buttonPayload: Record<string, unknown>
      if (selectedType === 'web_app') {
        if (!webAppUrl.trim()) {
          setErrorMsg('WebApp URL is required for WebApp menu button.')
          setSaving(false)
          return
        }
        buttonPayload = {
          _: 'botMenuButton',
          text: buttonText.trim() || 'Open App',
          url: webAppUrl.trim(),
        }
      } else if (selectedType === 'commands') {
        buttonPayload = {
          _: 'botMenuButtonCommands',
        }
      } else {
        buttonPayload = {
          _: 'botMenuButtonDefault',
        }
      }

      if (window.guidegram?.botSetMenuButton) {
        const success = await window.guidegram.botSetMenuButton(accountId, botId, buttonPayload)
        if (success) {
          setSuccessMsg('Bot Menu Button updated successfully!')
          onSaved?.()
          setTimeout(() => {
            onClose()
          }, 1000)
        } else {
          setErrorMsg('Failed to update bot menu button. Check bot permissions.')
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error saving bot menu button.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative flex flex-col w-full max-w-md bg-dark-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="h-14 px-4 bg-dark-850/90 border-b border-white/10 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white leading-tight">Bot Menu Button Configuration</span>
              <span className="text-[10px] text-gray-400 truncate max-w-[200px]">{botTitle}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              <span>Fetching bot menu button…</span>
            </div>
          ) : (
            <>
              {/* Type Selection */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Persistent Button Mode
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: 'commands',
                      label: 'Commands',
                      desc: 'Shows /commands list',
                      icon: <Terminal className="w-4 h-4" />,
                    },
                    {
                      id: 'web_app',
                      label: 'Mini App',
                      desc: 'Direct WebApp URL',
                      icon: <Smartphone className="w-4 h-4" />,
                    },
                    {
                      id: 'default',
                      label: 'Default',
                      desc: 'Standard behavior',
                      icon: <List className="w-4 h-4" />,
                    },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSelectedType(mode.id as any)}
                      className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all ${
                        selectedType === mode.id
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {mode.icon}
                        {selectedType === mode.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                      <span className="text-xs font-bold text-white">{mode.label}</span>
                      <span className="text-[9px] text-gray-400 leading-tight">{mode.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* WebApp Fields if WebApp selected */}
              {selectedType === 'web_app' && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Button Label
                    </label>
                    <input
                      type="text"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      placeholder="e.g. Open App, Play, Store"
                      className="w-full px-3 py-2 rounded-xl bg-dark-950 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Mini App WebApp URL
                    </label>
                    <input
                      type="url"
                      value={webAppUrl}
                      onChange={(e) => setWebAppUrl(e.target.value)}
                      placeholder="https://app.example.com"
                      className="w-full px-3 py-2 rounded-xl bg-dark-950 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Bot Menu Button</span>
              </button>
            </>
          )}
        </form>
      </motion.div>
    </div>
  )
}
