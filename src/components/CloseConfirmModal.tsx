import React, { useState } from 'react'
import { Minimize2, Power, X, CheckSquare, Square } from 'lucide-react'
import { useI18n } from '../i18n'

interface CloseConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (action: 'minimize' | 'quit', remember: boolean) => void
}

export const CloseConfirmModal: React.FC<CloseConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { t, isRTL } = useI18n()
  const [selectedAction, setSelectedAction] = useState<'minimize' | 'quit'>('minimize')
  const [remember, setRemember] = useState(true)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" dir={isRTL ? 'rtl' : 'ltr'}>
      <div
        className="w-full max-w-md bg-dark-900 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 select-none animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-100">{t('close.title')}</h3>
              <p className="text-[11px] text-gray-400">{t('close.subtitle')}</p>
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

        {/* Action Options */}
        <div className="flex flex-col gap-2.5">
          {/* Option 1: Minimize (Recommended) */}
          <div
            onClick={() => setSelectedAction('minimize')}
            className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
              selectedAction === 'minimize'
                ? 'bg-primary-600/15 border-primary-500/50 shadow-glow'
                : 'bg-dark-850/60 border-white/5 hover:border-white/10'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                selectedAction === 'minimize'
                  ? 'border-primary-400 bg-primary-500'
                  : 'border-gray-500'
              }`}
            >
              {selectedAction === 'minimize' && (
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-100">{t('close.minimize_title')}</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-primary-500/20 text-primary-300 font-semibold rounded-md border border-primary-500/30">
                  {t('close.minimize_badge')}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                {t('close.minimize_desc')}
              </p>
            </div>
            <Minimize2 className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          </div>

          {/* Option 2: Quit completely */}
          <div
            onClick={() => setSelectedAction('quit')}
            className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
              selectedAction === 'quit'
                ? 'bg-accent-rose/15 border-accent-rose/50 shadow-glow'
                : 'bg-dark-850/60 border-white/5 hover:border-white/10'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                selectedAction === 'quit'
                  ? 'border-accent-rose bg-accent-rose'
                  : 'border-gray-500'
              }`}
            >
              {selectedAction === 'quit' && (
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-gray-100">{t('close.quit_title')}</div>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                {t('close.quit_desc')}
              </p>
            </div>
            <Power className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          </div>
        </div>

        {/* Remember choice checkbox */}
        <div
          onClick={() => setRemember(!remember)}
          className="flex items-center gap-2.5 px-1 py-0.5 cursor-pointer text-gray-300 hover:text-white transition-colors"
        >
          {remember ? (
            <CheckSquare className="w-4 h-4 text-primary-400 shrink-0" />
          ) : (
            <Square className="w-4 h-4 text-gray-500 shrink-0" />
          )}
          <span className="text-xs font-medium">
            {t('close.remember')}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            {t('app.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selectedAction, remember)}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white shadow-glow transition-all cursor-pointer"
          >
            {t('close.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
