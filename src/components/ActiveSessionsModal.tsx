import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Smartphone,
  Laptop,
  Monitor,
  Shield,
  Globe,
  Trash2,
  X,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Clock,
  Lock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'
import { ActiveSessionItem, TwoFactorStatus } from '../types/telegram'
import { useI18n } from '../i18n'
import { isRTL } from '../utils/textUtils'

interface ActiveSessionsModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
}

export const ActiveSessionsModal: React.FC<ActiveSessionsModalProps> = ({
  isOpen,
  onClose,
  accountId,
}) => {
  const { t } = useI18n()
  const [sessions, setSessions] = useState<ActiveSessionItem[]>([])
  const [twoFactor, setTwoFactor] = useState<TwoFactorStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [terminatingHash, setTerminatingHash] = useState<string | null>(null)
  const [terminatingAll, setTerminatingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const loadSessions = async () => {
    if (!accountId) return
    setLoading(true)
    setError(null)
    try {
      if (window.guidegram?.getActiveSessions) {
        const list = await window.guidegram.getActiveSessions(accountId)
        setSessions(list || [])
      }
      if (window.guidegram?.getTwoFactorStatus) {
        const tf = await window.guidegram.getTwoFactorStatus(accountId)
        setTwoFactor(tf)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && accountId) {
      loadSessions()
    }
  }, [isOpen, accountId])

  if (!isOpen) return null

  const handleTerminateSession = async (hash: string) => {
    if (!confirm(t('confirm_terminate_session') || 'Terminate this session?')) return
    setTerminatingHash(hash)
    setError(null)
    try {
      if (window.guidegram?.terminateSession) {
        await window.guidegram.terminateSession(accountId, hash)
        setSuccessMsg(t('session_terminated') || 'Session terminated successfully')
        setSessions((prev) => prev.filter((s) => s.hash !== hash))
        setTimeout(() => setSuccessMsg(null), 3000)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to terminate session')
    } finally {
      setTerminatingHash(null)
    }
  }

  const handleTerminateAllOthers = async () => {
    if (!confirm(t('confirm_terminate_all') || 'Are you sure you want to terminate all other sessions?')) return
    setTerminatingAll(true)
    setError(null)
    try {
      if (window.guidegram?.terminateSession) {
        await window.guidegram.terminateSession(accountId, 'all')
        setSuccessMsg(t('all_sessions_terminated') || 'All other sessions terminated')
        setSessions((prev) => prev.filter((s) => s.isCurrent))
        setTimeout(() => setSuccessMsg(null), 3000)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to terminate sessions')
    } finally {
      setTerminatingAll(false)
    }
  }

  const currentSession = sessions.find((s) => s.isCurrent)
  const otherSessions = sessions.filter((s) => !s.isCurrent)

  const getDeviceIcon = (platform: string, model: string) => {
    const p = (platform + ' ' + model).toLowerCase()
    if (p.includes('android') || p.includes('ios') || p.includes('iphone') || p.includes('phone')) {
      return <Smartphone className="w-5 h-5 text-blue-400" />
    }
    if (p.includes('mac') || p.includes('laptop') || p.includes('windows') || p.includes('linux')) {
      return <Laptop className="w-5 h-5 text-purple-400" />
    }
    return <Monitor className="w-5 h-5 text-emerald-400" />
  }

  const formatDate = (ms: number) => {
    try {
      return new Date(ms).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="bg-gray-900 border border-gray-800 text-white rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        dir={isRTL(t('active_sessions_title') || '') ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t('active_sessions_title') || 'Active Sessions & Devices'}
              </h2>
              <p className="text-xs text-gray-400">
                {t('active_sessions_subtitle') || 'Manage devices currently connected to your Telegram account'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadSessions}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              title={t('refresh') || 'Refresh'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notifications */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading && sessions.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
              <p className="text-sm">{t('loading_sessions') || 'Fetching active sessions from Telegram...'}</p>
            </div>
          ) : (
            <>
              {/* Two-Step Verification (2FA) Status Card */}
              {twoFactor && (
                <div className="p-4 rounded-xl bg-gray-900/90 border border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        twoFactor.hasPassword
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {twoFactor.hasPassword ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">Two-Step Verification (2FA)</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            twoFactor.hasPassword
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {twoFactor.hasPassword ? 'Protected' : 'Not Set'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {twoFactor.hasPassword
                          ? `Cloud password protected${twoFactor.hasRecovery ? ' • Recovery email configured' : ''}`
                          : 'Set a cloud password in Telegram settings to secure your account'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Session */}
              {currentSession && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {t('current_session') || 'This Device'}
                  </h3>
                  <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/20 to-blue-800/10 border border-blue-500/30 flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
                      {getDeviceIcon(currentSession.platform, currentSession.deviceModel)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">
                          {currentSession.deviceModel}
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>{t('online') || 'Online'}</span>
                        </span>
                      </div>
                      <p className="text-xs text-blue-300/80 mt-0.5">
                        {currentSession.appName} {currentSession.appVersion} • {currentSession.platform} {currentSession.systemVersion}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-gray-500" />
                          {currentSession.ip} {currentSession.country ? `(${currentSession.country})` : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          {formatDate(currentSession.dateActive)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Terminate All Others Action */}
              {otherSessions.length > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t('other_sessions') || 'Other Devices'} ({otherSessions.length})
                  </h3>
                  <button
                    onClick={handleTerminateAllOthers}
                    disabled={terminatingAll}
                    className="text-xs text-red-400 hover:text-red-300 font-medium hover:underline flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {terminatingAll ? (t('terminating') || 'Terminating...') : (t('terminate_all_others') || 'Terminate All Other Sessions')}
                  </button>
                </div>
              )}

              {/* Other Sessions List */}
              {otherSessions.length > 0 ? (
                <div className="space-y-2">
                  {otherSessions.map((session) => (
                    <motion.div
                      whileHover={{ scale: 1.012, x: 2 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      key={session.hash}
                      className="p-3.5 rounded-xl bg-gray-800/40 border border-gray-800 hover:border-gray-700/80 flex items-center gap-3.5 transition-all"
                    >
                      <div className="p-2 rounded-lg bg-gray-800 text-gray-400 shrink-0">
                        {getDeviceIcon(session.platform, session.deviceModel)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-200 truncate">
                          {session.deviceModel}
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {session.appName} {session.appVersion} • {session.platform}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {session.ip} {session.country ? `(${session.country})` : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(session.dateActive)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleTerminateSession(session.hash)}
                        disabled={terminatingHash === session.hash}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                        title={t('terminate_session') || 'Terminate Session'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                !loading && (
                  <div className="py-6 text-center text-xs text-gray-500">
                    {t('no_other_sessions') || 'No other active sessions found.'}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
