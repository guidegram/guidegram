import React, { useState, useEffect } from 'react'
import { Sparkles, Download, X, ArrowUpRight, AlertCircle, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'
import { UpdateInfo, UpdateProgress } from '../types/telegram'
import { useI18n } from '../i18n'

interface UpdateBannerProps {
  updateInfo: UpdateInfo
  onDismiss: () => void
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({ updateInfo, onDismiss }) => {
  const { t, isRTL, formatNumber } = useI18n()
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [progress, setProgress] = useState<UpdateProgress | null>(null)

  const isMandatory = !!updateInfo.isMandatory
  const isSecurity = !!updateInfo.isSecurityUpdate

  useEffect(() => {
    if (!window.guidegram?.on) return
    const cleanup = window.guidegram.on('app:update-progress', (p: UpdateProgress) => {
      setProgress(p)
    })
    return () => {
      cleanup?.()
    }
  }, [])

  const handleUpdate = async () => {
    if (!updateInfo.downloadUrl) {
      if (window.guidegram?.openExternal) {
        window.guidegram.openExternal('https://github.com/guidegram/guidegram/releases/latest')
      }
      return
    }

    setIsUpdating(true)
    setUpdateError(null)

    try {
      if (window.guidegram?.installUpdate) {
        const res = await window.guidegram.installUpdate(
          updateInfo.downloadUrl,
          updateInfo.latestVersion
        )
        if (!res.success) {
          setUpdateError(res.error || 'Failed to apply update.')
          setIsUpdating(false)
        }
      }
    } catch (err: any) {
      setUpdateError(err.message || 'Update failed')
      setIsUpdating(false)
    }
  }

  const formatMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1) + ' MB'

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-50 max-w-sm w-full bg-dark-900/95 rounded-3xl p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-200 select-none border ${
        isMandatory
          ? 'border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/30'
          : 'border-primary-500/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 ${
              isMandatory
                ? 'bg-gradient-to-tr from-amber-600 via-rose-600 to-orange-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                : 'bg-gradient-to-tr from-primary-600 to-accent-cyan shadow-glow'
            }`}
          >
            {isSecurity ? (
              <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
            ) : isMandatory ? (
              <ShieldCheck className="w-5 h-5 text-white" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Guidegram v{updateInfo.latestVersion}</span>
              {isSecurity ? (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 uppercase tracking-wider">
                  {t('update.security_badge')}
                </span>
              ) : isMandatory ? (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 uppercase tracking-wider">
                  {t('update.required_badge')}
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-accent-emerald/20 text-accent-emerald font-semibold border border-accent-emerald/30">
                  {t('update.new_badge')}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
              {isSecurity
                ? t('update.security_patch')
                : isMandatory
                ? t('update.required_upgrade')
                : t('update.available')}
            </p>
          </div>
        </div>

        {!isUpdating && !isMandatory && (
          <button
            type="button"
            onClick={onDismiss}
            title="Dismiss for this session"
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Real-time Download & Extraction Progress */}
      {isUpdating && (
        <div className="mt-3 p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span
              className={`font-semibold flex items-center gap-1.5 ${
                isMandatory ? 'text-amber-300' : 'text-primary-300'
              }`}
            >
              <RefreshCw className="w-3 h-3 animate-spin text-accent-cyan" />
              {progress?.stage === 'extracting'
                ? t('update.extracting')
                : progress?.stage === 'restarting'
                ? t('update.restarting')
                : t('update.downloading', { percent: formatNumber(progress?.percent ?? 0) })}
            </span>
            {progress && progress.totalBytes > 0 && (
              <span className="text-gray-400 font-mono text-[10px]">
                {formatMB(progress.transferredBytes)} / {formatMB(progress.totalBytes)}
              </span>
            )}
          </div>

          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-out ${
                isMandatory
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                  : 'bg-gradient-to-r from-primary-500 to-accent-cyan'
              }`}
              style={{ width: `${progress?.percent ?? 5}%` }}
            />
          </div>

          <p className="text-[10px] text-gray-500">
            {t('update.reopen_note')}
          </p>
        </div>
      )}

      {updateError && (
        <div className="mt-2.5 p-2 rounded-xl bg-accent-rose/10 border border-accent-rose/20 text-[10px] text-accent-rose flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{updateError}</span>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-2 mt-3.5 pt-2.5 border-t border-white/5">
        <button
          type="button"
          onClick={() => {
            if (window.guidegram?.openExternal) {
              window.guidegram.openExternal(
                'https://github.com/guidegram/guidegram/releases/latest'
              )
            }
          }}
          className="text-[11px] font-medium text-gray-400 hover:text-primary-300 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>{t('update.release_notes')}</span>
          <ArrowUpRight className={`w-3 h-3 ${isRTL ? '-scale-x-100' : ''}`} />
        </button>

        <div className="flex items-center gap-2">
          {!isUpdating && !isMandatory && (
            <button
              type="button"
              onClick={onDismiss}
              className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              {t('update.later')}
            </button>
          )}
          <button
            type="button"
            disabled={isUpdating}
            onClick={handleUpdate}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50 text-white flex items-center gap-1.5 transition-all cursor-pointer ${
              isMandatory
                ? 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
                : 'bg-primary-600 hover:bg-primary-500 shadow-glow'
            }`}
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>
                  {progress?.stage === 'restarting'
                    ? t('update.restarting')
                    : progress?.stage === 'extracting'
                    ? t('update.extracting')
                    : progress?.percent !== undefined
                    ? `${formatNumber(progress.percent)}%`
                    : '...'}
                </span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{isMandatory ? t('update.now_required') : t('update.now')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
