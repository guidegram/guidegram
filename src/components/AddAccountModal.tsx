import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  X,
  Phone,
  KeyRound,
  Lock,
  Shield,
  ArrowRight,
  CheckCircle2,
  QrCode,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Smartphone,
  Bot,
} from 'lucide-react'
import clsx from 'clsx'
import { ProxyConfig, AccountInfo, QrTokenPayload } from '../types/telegram'

interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onAccountAdded: (account: AccountInfo) => void
}

function cleanErrorMessage(raw?: string | null): string {
  if (!raw) return ''
  return raw
    .replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/i, '')
    .replace(/^Error:\s*/i, '')
    .trim()
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onAccountAdded,
}) => {
  // Method selection: 'qr' (default) vs 'phone' vs 'bot'
  const [loginMethod, setLoginMethod] = useState<'qr' | 'phone' | 'bot'>('qr')

  // Bot Token states
  const [botToken, setBotToken] = useState('')
  const [botLoading, setBotLoading] = useState(false)
  const [botSuccess, setBotSuccess] = useState(false)

  // QR Flow states
  const [qrState, setQrState] = useState<'loading' | 'qr' | 'scanned' | '2fa' | 'success'>('loading')
  const [qrPayload, setQrPayload] = useState<QrTokenPayload | null>(null)
  const [countdown, setCountdown] = useState<number>(120)
  const [sessionDeadline, setSessionDeadline] = useState<number>(() => Date.now() + 120 * 1000)
  const [qr2FaHint, setQr2FaHint] = useState<string>('')
  const [qrPassword, setQrPassword] = useState<string>('')
  const [loading2Fa, setLoading2Fa] = useState<boolean>(false)

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Phone Flow states
  const [step, setStep] = useState<'phone' | 'code' | '2fa' | 'success'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [phonePassword, setPhonePassword] = useState('')
  const [phone2FaHint, setPhone2FaHint] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)

  // Common error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Per-account proxy state
  const [useProxy, setUseProxy] = useState(false)
  const [proxyType, setProxyType] = useState<'socks5' | 'http' | 'mtproto'>('socks5')
  const [proxyHost, setProxyHost] = useState('')
  const [proxyPort, setProxyPort] = useState(1080)
  const [proxyUser, setProxyUser] = useState('')
  const [proxyPass, setProxyPass] = useState('')

  const getProxyConfig = useCallback((): ProxyConfig | undefined => {
    if (!useProxy || !proxyHost) return undefined
    return {
      id: `proxy_${Date.now()}`,
      name: `${proxyType.toUpperCase()} - ${proxyHost}`,
      enabled: true,
      type: proxyType,
      host: proxyHost.trim(),
      port: Number(proxyPort),
      username: proxyUser ? proxyUser.trim() : undefined,
      password: proxyPass ? proxyPass.trim() : undefined,
    }
  }, [useProxy, proxyHost, proxyPort, proxyType, proxyUser, proxyPass])

  const completedRef = useRef(false)

  const startQr = useCallback(async (customProxy?: ProxyConfig) => {
    setQrState('loading')
    setErrorMessage(null)
    setSessionDeadline(Date.now() + 120 * 1000)
    setCountdown(120)
    try {
      const proxy = customProxy !== undefined ? customProxy : getProxyConfig()
      const payload = await window.guidegram.startQrAuth(proxy)
      if (payload && payload.qrDataUrl) {
        setQrPayload(payload)
        setQrState('qr')
      }
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('reply was never sent') || msg.includes('CANCEL') || msg.includes('disconnected')) {
        // Race condition / aborted previous request; ignore spurious error
        return
      }
      setErrorMessage(msg || 'Failed to initialize QR login. Please check connection or proxy.')
    }
  }, [getProxyConfig])

  const startQrRef = useRef(startQr)
  startQrRef.current = startQr

  const handleSuccess = useCallback(
    (account: AccountInfo) => {
      if (completedRef.current) return
      completedRef.current = true
      setQrState('success')
      setTimeout(() => {
        onAccountAdded(account)
        onClose()
      }, 1200)
    },
    [onAccountAdded, onClose]
  )

  const handleSuccessRef = useRef(handleSuccess)
  handleSuccessRef.current = handleSuccess

  // Lifecycle & IPC Event Subscriptions for QR Login
  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      completedRef.current = false
      setQrState('loading')
      setQrPayload(null)
      setErrorMessage(null)
      setQrPassword('')
      setQr2FaHint('')
      setBotToken('')
      setBotLoading(false)
      setBotSuccess(false)
      setStep('phone')
      setCode('')
      setPhonePassword('')
      setPhone2FaHint('')
      return
    }

    completedRef.current = false

    const unsubToken = window.guidegram.on('telegram:qr-token', (payload: QrTokenPayload) => {
      setQrPayload(payload)
      setQrState('qr')
      setErrorMessage(null)
    })

    const unsubScanned = window.guidegram.on('telegram:qr-scanned', () => {
      setQrState('scanned')
    })

    const unsub2fa = window.guidegram.on('telegram:qr-2fa', ({ hint }: { hint: string }) => {
      setQr2FaHint(hint || '')
      setQrState('2fa')
    })

    const unsubSuccess = window.guidegram.on(
      'telegram:qr-success',
      ({ account }: { account: AccountInfo }) => {
        handleSuccessRef.current(account)
      }
    )

    const unsubError = window.guidegram.on('telegram:qr-error', ({ message }: { message: string }) => {
      setErrorMessage(message)
    })

    if (loginMethod === 'qr') {
      startQrRef.current()
    }

    return () => {
      unsubToken()
      unsubScanned()
      unsub2fa()
      unsubSuccess()
      unsubError()
      window.guidegram.cancelQrAuth().catch(() => {})
    }
  }, [isOpen, loginMethod])

  // 2-minute (120s) countdown timer for QR session
  useEffect(() => {
    if (qrState !== 'qr') return

    const updateTimer = () => {
      const diff = Math.max(0, Math.round((sessionDeadline - Date.now()) / 1000))
      setCountdown(diff)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [qrState, sessionDeadline])

  if (!isOpen) return null

  const handleSwitchTab = async (method: 'qr' | 'phone' | 'bot') => {
    if (method === loginMethod) return
    setErrorMessage(null)
    if (method === 'phone' || method === 'bot') {
      await window.guidegram.cancelQrAuth().catch(() => {})
      setLoginMethod(method)
    } else {
      setQrState('loading')
      setQrPayload(null)
      setQrPassword('')
      setQr2FaHint('')
      setLoginMethod('qr')
    }
  }

  const handleConnectBot = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = botToken.trim()
    if (!token) return

    if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
      setErrorMessage('Invalid bot token format. It must follow the pattern: 123456789:ABCdef...')
      return
    }

    setBotLoading(true)
    setErrorMessage(null)

    try {
      const proxy = getProxyConfig()
      const account = await window.guidegram.loginBot(token, proxy)
      setBotSuccess(true)
      setTimeout(() => {
        onAccountAdded(account)
        onClose()
      }, 1200)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to login with bot token. Check token or proxy settings.')
    } finally {
      setBotLoading(false)
    }
  }

  const handleClose = async () => {
    await window.guidegram.cancelQrAuth().catch(() => {})
    onClose()
  }

  // QR 2FA Password Submission
  const handleSubmitQr2Fa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!qrPassword.trim()) return

    setLoading2Fa(true)
    setErrorMessage(null)

    try {
      const account = await window.guidegram.submitQrPassword(qrPassword.trim())
      handleSuccess(account)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Incorrect 2FA password. Please try again.')
    } finally {
      setLoading2Fa(false)
    }
  }

  // Phone Flow: Step 1 Request Code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return

    setPhoneLoading(true)
    setErrorMessage(null)

    try {
      const proxy = getProxyConfig()
      await window.guidegram.startPhoneAuth(phone.trim(), proxy)
      setStep('code')
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('PHONE_NUMBER_INVALID')) {
        setErrorMessage('Invalid phone number format. Please include country code (e.g. +98...).')
      } else if (msg.includes('PHONE_NUMBER_BANNED')) {
        setErrorMessage('This phone number has been banned by Telegram.')
      } else if (msg.includes('FLOOD_WAIT')) {
        setErrorMessage('Too many requests. Please wait a while before requesting another code.')
      } else {
        setErrorMessage(cleanErrorMessage(msg) || 'Failed to send code. Check phone or proxy settings.')
      }
    } finally {
      setPhoneLoading(false)
    }
  }

  // Phone Flow: Step 2 & 3 Submit Code or Password
  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 'code' && !code.trim()) return
    if (step === '2fa' && !phonePassword.trim()) return

    setPhoneLoading(true)
    setErrorMessage(null)

    try {
      const res = await window.guidegram.completePhoneAuth(
        phone.trim(),
        code.trim(),
        phonePassword.trim() || undefined
      )
      if ('need2fa' in res && res.need2fa) {
        setPhone2FaHint(res.hint || '')
        setStep('2fa')
        setErrorMessage(null)
        return
      }
      setStep('success')
      setTimeout(() => {
        onAccountAdded(res as AccountInfo)
        onClose()
      }, 1200)
    } catch (err: any) {
      const msg = err?.message || ''
      if (
        msg.includes('2FA_REQUIRED') ||
        msg.includes('SESSION_PASSWORD_NEEDED')
      ) {
        setStep('2fa')
        setErrorMessage(null)
      } else if (msg.includes('PASSWORD_HASH_INVALID')) {
        setErrorMessage('Incorrect 2FA password. Please try again.')
      } else if (msg.includes('PHONE_CODE_INVALID')) {
        setErrorMessage('Invalid verification code. Please check and try again.')
      } else if (msg.includes('PHONE_CODE_EXPIRED')) {
        setErrorMessage('The verification code has expired. Please request a new code.')
      } else {
        setErrorMessage(cleanErrorMessage(msg) || 'Invalid code or verification error.')
      }
    } finally {
      setPhoneLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-modal w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150 border border-white/10 bg-dark-900/95">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center border border-primary-500/20">
              {loginMethod === 'qr' ? (
                <QrCode className="w-4 h-4" />
              ) : loginMethod === 'phone' ? (
                <Phone className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>
            <div className="text-sm font-bold text-gray-100">Add Telegram Account</div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: QR Code vs Phone vs Bot Token */}
        <div className="flex p-1 bg-dark-850/80 rounded-2xl border border-white/5 mx-6 mt-4 gap-1">
          <button
            type="button"
            onClick={() => handleSwitchTab('qr')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200',
              loginMethod === 'qr'
                ? 'bg-primary-600 text-white shadow-glow'
                : 'text-gray-400 hover:text-gray-200'
            )}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchTab('phone')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200',
              loginMethod === 'phone'
                ? 'bg-primary-600 text-white shadow-glow'
                : 'text-gray-400 hover:text-gray-200'
            )}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Phone</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchTab('bot')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200',
              loginMethod === 'bot'
                ? 'bg-primary-600 text-white shadow-glow'
                : 'text-gray-400 hover:text-gray-200'
            )}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Bot Token</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-accent-rose/10 border border-accent-rose/20 text-accent-rose text-xs leading-relaxed">
              {cleanErrorMessage(errorMessage)}
            </div>
          )}

          {/* =================== TAB 1: QR CODE AUTH =================== */}
          {loginMethod === 'qr' && (
            <div className="space-y-4">
              {/* QR Code Loading State */}
              {qrState === 'loading' && (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                  {errorMessage ? (
                    <div className="flex flex-col items-center space-y-3">
                      <div className="text-xs text-accent-rose font-medium max-w-xs leading-relaxed">
                        {errorMessage}
                      </div>
                      <button
                        type="button"
                        onClick={() => startQr()}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-glow transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Connection</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <Loader2 className="w-10 h-10 text-primary-400 animate-spin" />
                      <div className="text-xs font-medium text-gray-300">
                        Connecting to Telegram & generating QR Code...
                      </div>
                      <div className="text-[11px] text-gray-500 max-w-xs">
                        If connection takes time, assign a local SOCKS5/HTTP proxy below.
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* QR Code Display State */}
              {qrState === 'qr' && qrPayload && (
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* QR Image Card */}
                  <div className="relative p-3.5 bg-white rounded-2xl shadow-2xl border-2 border-primary-500/20 group">
                    <img
                      src={qrPayload.qrDataUrl}
                      alt="Telegram QR Login"
                      className="w-52 h-52 object-contain select-none transition-all duration-300"
                    />

                    {/* Expiration warning overlay if expired after 2 minutes */}
                    {countdown <= 0 && (
                      <div className="absolute inset-0 bg-dark-900/95 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center p-4 text-center z-10">
                        <div className="w-10 h-10 rounded-full bg-accent-rose/10 text-accent-rose flex items-center justify-center mb-2 border border-accent-rose/20">
                          <RefreshCw className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-200 mb-1">QR Code Expired</span>
                        <span className="text-[11px] text-gray-400 mb-3">2 minutes limit reached</span>
                        <button
                          type="button"
                          onClick={() => startQr()}
                          className="px-3.5 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-glow transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Reload QR Code</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Countdown & Refresh Indicator */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-dark-800 border border-white/10 text-[11px] text-gray-300 font-mono">
                      <div
                        className={clsx(
                          'w-2 h-2 rounded-full',
                          countdown > 20
                            ? 'bg-accent-emerald animate-pulse'
                            : countdown > 0
                            ? 'bg-amber-400 animate-ping'
                            : 'bg-accent-rose'
                        )}
                      />
                      <span>
                        {countdown > 0 ? `Code expires in ${formatTime(countdown)}` : 'Expired'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => startQr()}
                      title="Force refresh QR code (restarts 2-minute timer)"
                      className="p-1 rounded-lg bg-dark-800 border border-white/10 hover:bg-dark-700 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Instruction Steps */}
                  <div className="w-full bg-dark-850/60 border border-white/5 rounded-2xl p-3.5 text-left space-y-2">
                    <div className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5 mb-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-primary-400" />
                      <span>Log in by QR Code:</span>
                    </div>

                    <div className="flex items-start gap-2.5 text-xs text-gray-300">
                      <span className="w-4 h-4 rounded-full bg-primary-600/20 text-primary-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-primary-500/20">
                        1
                      </span>
                      <span>Open <strong>Telegram</strong> on your phone</span>
                    </div>

                    <div className="flex items-start gap-2.5 text-xs text-gray-300">
                      <span className="w-4 h-4 rounded-full bg-primary-600/20 text-primary-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-primary-500/20">
                        2
                      </span>
                      <span>
                        Go to <strong>Settings</strong> &gt; <strong>Devices</strong> &gt;{' '}
                        <strong>Link Desktop Device</strong>
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5 text-xs text-gray-300">
                      <span className="w-4 h-4 rounded-full bg-primary-600/20 text-primary-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-primary-500/20">
                        3
                      </span>
                      <span>Point your phone at this screen to confirm</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Scanned Pending Confirmation State */}
              {qrState === 'scanned' && (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan animate-pulse">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-gray-100">QR Code Scanned!</div>
                  <div className="text-xs text-gray-400 max-w-xs">
                    Please confirm the login on your Telegram mobile app...
                  </div>
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin mt-2" />
                </div>
              )}

              {/* 2FA Password State for QR */}
              {qrState === '2fa' && (
                <form onSubmit={handleSubmitQr2Fa} className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-dark-850 border border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-primary-400">
                      <Lock className="w-4 h-4" />
                      <span className="text-xs font-semibold">Two-Step Verification (2FA)</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      This Telegram account is protected by an additional cloud password.
                    </p>
                    {qr2FaHint && (
                      <div className="text-[11px] text-accent-cyan bg-accent-cyan/10 px-2.5 py-1 rounded-lg border border-accent-cyan/20">
                        Hint: {qr2FaHint}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      2FA Cloud Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        placeholder="Enter your 2FA password"
                        value={qrPassword}
                        onChange={(e) => setQrPassword(e.target.value)}
                        required
                        autoFocus
                        className="w-full bg-dark-800 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setQrPassword('')
                        setQr2FaHint('')
                        setErrorMessage(null)
                        startQr()
                      }}
                      className="px-3 py-2.5 bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white rounded-xl text-xs font-medium border border-white/10 transition-colors flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to QR</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading2Fa || !qrPassword.trim()}
                      className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-glow transition-all flex items-center justify-center gap-2"
                    >
                      {loading2Fa ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying 2FA...</span>
                        </>
                      ) : (
                        <span>Complete Sign In</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Success State */}
              {qrState === 'success' && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-accent-emerald mb-3 animate-bounce" />
                  <div className="text-sm font-bold text-gray-100">Account Linked Successfully!</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Your session is saved portably and ready to use.
                  </div>
                </div>
              )}

              {/* Per-Account Proxy Settings for QR */}
              {qrState !== 'success' && (
                <div className="pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setUseProxy(!useProxy)}
                    className="flex items-center gap-2 text-xs font-medium text-accent-cyan hover:underline"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>{useProxy ? 'Remove dedicated proxy' : '+ Assign dedicated proxy for this account'}</span>
                  </button>

                  {useProxy && (
                    <div className="mt-3 p-3 rounded-2xl bg-dark-850 border border-white/5 space-y-2.5 text-xs">
                      <div className="flex gap-2">
                        <select
                          value={proxyType}
                          onChange={(e) => setProxyType(e.target.value as any)}
                          className="bg-dark-800 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-gray-200"
                        >
                          <option value="socks5">SOCKS5</option>
                          <option value="http">HTTP</option>
                          <option value="mtproto">MTProto</option>
                        </select>

                        <input
                          type="text"
                          placeholder="Host (e.g. 127.0.0.1)"
                          value={proxyHost}
                          onChange={(e) => setProxyHost(e.target.value)}
                          className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200"
                        />

                        <input
                          type="number"
                          placeholder="Port"
                          value={proxyPort}
                          onChange={(e) => setProxyPort(Number(e.target.value))}
                          className="w-20 bg-dark-800 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-gray-200"
                        />
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Username (optional)"
                          value={proxyUser}
                          onChange={(e) => setProxyUser(e.target.value)}
                          className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200"
                        />
                        <input
                          type="password"
                          placeholder="Password (optional)"
                          value={proxyPass}
                          onChange={(e) => setProxyPass(e.target.value)}
                          className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => startQr()}
                        className="w-full py-1.5 bg-dark-700 hover:bg-dark-600 text-gray-200 text-xs rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Apply Proxy &amp; Refresh QR</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =================== TAB 2: PHONE NUMBER AUTH =================== */}
          {loginMethod === 'phone' && (
            <div>
              {step === 'phone' && (
                <form onSubmit={handleRequestCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Phone Number (International format)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        placeholder="+989123456789"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full bg-dark-800 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                      />
                    </div>
                  </div>

                  {/* Per-Account Proxy Settings */}
                  <div className="pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setUseProxy(!useProxy)}
                      className="flex items-center gap-2 text-xs font-medium text-accent-cyan hover:underline"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>{useProxy ? 'Remove dedicated proxy' : '+ Assign dedicated proxy to this account'}</span>
                    </button>

                    {useProxy && (
                      <div className="mt-3 p-3 rounded-2xl bg-dark-850 border border-white/5 space-y-2.5 text-xs">
                        <div className="flex gap-2">
                          <select
                            value={proxyType}
                            onChange={(e) => setProxyType(e.target.value as any)}
                            className="bg-dark-800 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-gray-200"
                          >
                            <option value="socks5">SOCKS5</option>
                            <option value="http">HTTP</option>
                            <option value="mtproto">MTProto</option>
                          </select>

                          <input
                            type="text"
                            placeholder="Host (e.g. 127.0.0.1)"
                            value={proxyHost}
                            onChange={(e) => setProxyHost(e.target.value)}
                            className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200"
                          />

                          <input
                            type="number"
                            placeholder="Port"
                            value={proxyPort}
                            onChange={(e) => setProxyPort(Number(e.target.value))}
                            className="w-20 bg-dark-800 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-gray-200"
                          />
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Username (optional)"
                            value={proxyUser}
                            onChange={(e) => setProxyUser(e.target.value)}
                            className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200"
                          />
                          <input
                            type="password"
                            placeholder="Password (optional)"
                            value={proxyPass}
                            onChange={(e) => setProxyPass(e.target.value)}
                            className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={phoneLoading || !phone.trim()}
                      className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-glow transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>{phoneLoading ? 'Requesting Code...' : 'Send Login Code'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              )}

              {step === 'code' && (
                <form onSubmit={handleSubmitCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Telegram Verification Code (Sent to your active Telegram or SMS)
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="12345"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        required
                        autoFocus
                        className="w-full bg-dark-800 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-gray-100 text-center tracking-widest font-mono text-sm placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('phone')
                        setCode('')
                        setErrorMessage(null)
                      }}
                      className="px-3.5 py-2.5 bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white rounded-xl text-xs font-medium border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      disabled={phoneLoading || !code.trim()}
                      className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-glow transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {phoneLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Sign In</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {step === '2fa' && (
                <form onSubmit={handleSubmitCode} className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-dark-850 border border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-primary-400">
                      <Lock className="w-4 h-4" />
                      <span className="text-xs font-semibold">Two-Step Verification (2FA)</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      This Telegram account is protected by an additional cloud password.
                    </p>
                    {phone2FaHint && (
                      <div className="text-[11px] text-accent-cyan bg-accent-cyan/10 px-2.5 py-1 rounded-lg border border-accent-cyan/20">
                        Hint: {phone2FaHint}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Two-Step Verification Password (2FA)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        placeholder="Enter your 2FA password"
                        value={phonePassword}
                        onChange={(e) => setPhonePassword(e.target.value)}
                        required
                        autoFocus
                        className="w-full bg-dark-800 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('code')
                        setPhonePassword('')
                        setErrorMessage(null)
                      }}
                      className="px-3.5 py-2.5 bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white rounded-xl text-xs font-medium border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      disabled={phoneLoading || !phonePassword.trim()}
                      className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-glow transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {phoneLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying 2FA...</span>
                        </>
                      ) : (
                        <span>Complete Login</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {step === 'success' && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-accent-emerald mb-3 animate-bounce" />
                  <div className="text-sm font-bold text-gray-100">Account Added Successfully!</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Your session is saved portably and ready to use.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================== TAB 3: BOT TOKEN AUTH =================== */}
          {loginMethod === 'bot' && (
            <div>
              {botSuccess ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-accent-emerald mb-3 animate-bounce" />
                  <div className="text-sm font-bold text-gray-100">Bot Connected Successfully!</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Your bot session is authenticated and ready to use.
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConnectBot} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Telegram Bot Token
                    </label>
                    <div className="relative">
                      <Bot className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                        value={botToken}
                        onChange={(e) => setBotToken(e.target.value)}
                        required
                        className="w-full bg-dark-800 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-gray-100 font-mono placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                      Enter the HTTP API token provided by{' '}
                      <span className="text-primary-400 font-medium">@BotFather</span>.
                      The bot will be connected as an active MTProto account.
                    </p>
                  </div>

                  {/* Per-Account Proxy Settings */}
                  <div className="pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setUseProxy(!useProxy)}
                      className="flex items-center gap-2 text-xs font-medium text-accent-cyan hover:underline"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>{useProxy ? 'Remove dedicated proxy' : '+ Assign dedicated proxy to this bot'}</span>
                    </button>

                    {useProxy && (
                      <div className="mt-3 p-3 rounded-2xl bg-dark-850 border border-white/5 space-y-2.5 text-xs">
                        <div className="flex gap-2">
                          <select
                            value={proxyType}
                            onChange={(e) => setProxyType(e.target.value as any)}
                            className="bg-dark-800 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-gray-200"
                          >
                            <option value="socks5">SOCKS5</option>
                            <option value="http">HTTP</option>
                            <option value="mtproto">MTProto</option>
                          </select>

                          <input
                            type="text"
                            placeholder="Host (e.g. 127.0.0.1)"
                            value={proxyHost}
                            onChange={(e) => setProxyHost(e.target.value)}
                            className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200"
                          />

                          <input
                            type="number"
                            placeholder="Port"
                            value={proxyPort}
                            onChange={(e) => setProxyPort(Number(e.target.value))}
                            className="w-20 bg-dark-800 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-gray-200"
                          />
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Username (optional)"
                            value={proxyUser}
                            onChange={(e) => setProxyUser(e.target.value)}
                            className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200"
                          />
                          <input
                            type="password"
                            placeholder="Password (optional)"
                            value={proxyPass}
                            onChange={(e) => setProxyPass(e.target.value)}
                            className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={botLoading || !botToken.trim()}
                      className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-glow transition-all flex items-center justify-center gap-1.5"
                    >
                      {botLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Connecting Bot...</span>
                        </>
                      ) : (
                        <>
                          <span>Connect Bot</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
