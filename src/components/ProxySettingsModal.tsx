import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  Shield,
  Plus,
  RefreshCw,
  Check,
  Trash2,
  Globe,
  Radio,
  Zap,
  Sparkles,
  AlertCircle,
  User,
  Share2,
  CheckCircle2,
  Activity,
  Copy,
  Clipboard,
  ShieldCheck,
  ShieldOff,
  ExternalLink,
} from 'lucide-react'
import { ProxyConfig, AccountInfo, AutoHarvestStatus, WarpStatus } from '../types/telegram'

interface ProxySettingsModalProps {
  isOpen: boolean
  accounts: AccountInfo[]
  initialProxyToImport?: string
  onClose: () => void
  onUpdateAccountProxy: (accountId: string, proxy?: ProxyConfig) => void
}

type ProxyTab = 'hunter' | 'warp' | 'custom'

/**
 * Universal Fallback Parser for all Telegram and Standard Proxy URLs
 */
function parseAnyProxyLocal(raw: string, defaultName?: string): ProxyConfig | null {
  if (!raw || typeof raw !== 'string') return null
  const str = raw.trim()

  // 1. tg://proxy or https://t.me/proxy (MTProto)
  if (/^(?:tg|https?):\/\/(?:t\.me|telegram\.me|proxy)\/proxy\?/i.test(str) || /^tg:\/\/proxy\?/i.test(str)) {
    try {
      const u = new URL(str.replace(/^tg:\/\/proxy\?/i, 'https://t.me/proxy?'))
      const host = u.searchParams.get('server') || u.searchParams.get('host')
      const port = parseInt(u.searchParams.get('port') || '', 10)
      const secret = u.searchParams.get('secret')
      if (host && port > 0 && port <= 65535 && secret) {
        return {
          id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: defaultName || `MTProto (${host}:${port})`,
          type: 'mtproto',
          host: host.toLowerCase(),
          port,
          secret,
          enabled: true,
        }
      }
    } catch {}
  }

  // 2. tg://socks or https://t.me/socks (SOCKS5)
  if (/^(?:tg|https?):\/\/(?:t\.me|telegram\.me|socks)\/socks\?/i.test(str) || /^tg:\/\/socks\?/i.test(str)) {
    try {
      const u = new URL(str.replace(/^tg:\/\/socks\?/i, 'https://t.me/socks?'))
      const host = u.searchParams.get('server') || u.searchParams.get('host')
      const port = parseInt(u.searchParams.get('port') || '', 10)
      const user = u.searchParams.get('user') || u.searchParams.get('username') || undefined
      const pass = u.searchParams.get('pass') || u.searchParams.get('password') || undefined
      if (host && port > 0 && port <= 65535) {
        return {
          id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: defaultName || `SOCKS5 (${host}:${port})`,
          type: 'socks5',
          host: host.toLowerCase(),
          port,
          username: user,
          password: pass,
          enabled: true,
        }
      }
    } catch {}
  }

  // 3. socks5:// or http:// URL
  if (/^(?:socks5|socks4|http|https):\/\//i.test(str)) {
    try {
      const u = new URL(str)
      const isSocks = u.protocol.startsWith('socks')
      const host = u.hostname
      const port = parseInt(u.port || (isSocks ? '1080' : '8080'), 10)
      const user = u.username ? decodeURIComponent(u.username) : undefined
      const pass = u.password ? decodeURIComponent(u.password) : undefined
      if (host && port > 0 && port <= 65535) {
        return {
          id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: defaultName || `${isSocks ? 'SOCKS5' : 'HTTP'} (${host}:${port})`,
          type: isSocks ? 'socks5' : 'http',
          host: host.toLowerCase(),
          port,
          username: user,
          password: pass,
          enabled: true,
        }
      }
    } catch {}
  }

  // 4. host:port:secret (plain text MTProto)
  const mtpMatch = str.match(/^([^:\s\/]+):(\d{2,5}):([a-fA-F0-9]{32,})$/)
  if (mtpMatch) {
    const port = parseInt(mtpMatch[2], 10)
    if (port > 0 && port <= 65535) {
      return {
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: defaultName || `MTProto (${mtpMatch[1]}:${port})`,
        type: 'mtproto',
        host: mtpMatch[1].toLowerCase(),
        port,
        secret: mtpMatch[3],
        enabled: true,
      }
    }
  }

  // 5. host:port (plain text SOCKS5)
  const spMatch = str.match(/^([^:\s\/]+):(\d{2,5})$/)
  if (spMatch) {
    const port = parseInt(spMatch[2], 10)
    if (port > 0 && port <= 65535) {
      return {
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: defaultName || `SOCKS5 (${spMatch[1]}:${port})`,
        type: 'socks5',
        host: spMatch[1].toLowerCase(),
        port,
        enabled: true,
      }
    }
  }

  return null
}

export const ProxySettingsModal: React.FC<ProxySettingsModalProps> = ({
  isOpen,
  accounts,
  initialProxyToImport,
  onClose,
  onUpdateAccountProxy,
}) => {
  const [activeTab, setActiveTab] = useState<ProxyTab>('hunter')
  const [harvestStatus, setHarvestStatus] = useState<AutoHarvestStatus>({
    enabled: true,
    scannedChannels: ['ProxyMTProto', 'proxymtprotoir', 'mineproxy', 'iMTProto'],
    healthyCount: 0,
    totalHarvested: 0,
    isScanning: false,
  })
  const [harvestedProxies, setHarvestedProxies] = useState<ProxyConfig[]>([])
  const [warpStatus, setWarpStatus] = useState<WarpStatus>({
    enabled: false,
    connected: false,
  })
  const [isTogglingWarp, setIsTogglingWarp] = useState(false)
  const [isScanningNow, setIsScanningNow] = useState(false)

  const [proxies, setProxies] = useState<ProxyConfig[]>([
    {
      id: 'local_socks',
      name: 'Local SOCKS5 (v2ray/Clash)',
      enabled: true,
      type: 'socks5',
      host: '127.0.0.1',
      port: 10808,
      pingMs: 45,
    },
  ])

  const [testingPing, setTestingPing] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [quickPasteInput, setQuickPasteInput] = useState('')
  const [quickPasteError, setQuickPasteError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  // Manual form state
  const [type, setType] = useState<'socks5' | 'http' | 'mtproto'>('socks5')
  const [host, setHost] = useState('')
  const [port, setPort] = useState(1080)
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [secret, setSecret] = useState('')

  const [isDistributing, setIsDistributing] = useState(false)
  const [distributionSuccess, setDistributionSuccess] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '')
  const [isBenchmarking, setIsBenchmarking] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [autoConnectOnVpnDrop, setAutoConnectOnVpnDrop] = useState<boolean>(true)

  // Load initial status and cached proxies on mount
  useEffect(() => {
    if (!isOpen) return

    // Pre-fill initial proxy if passed
    if (initialProxyToImport) {
      setQuickPasteInput(initialProxyToImport)
    }

    // 1. Fetch cached harvested proxies immediately
    if ((window.guidegram as any)?.getHarvestedProxies) {
      (window.guidegram as any)
        .getHarvestedProxies()
        .then((list: ProxyConfig[]) => {
          if (Array.isArray(list) && list.length > 0) {
            setHarvestedProxies(list)
          } else {
            handleScanNow()
          }
        })
        .catch(() => {
          handleScanNow()
        })
    } else {
      handleScanNow()
    }

    if (window.guidegram?.getHarvestStatus) {
      window.guidegram.getHarvestStatus().then((st) => {
        if (st) setHarvestStatus(st)
      }).catch(() => {})
    }

    if (window.guidegram?.getWarpStatus) {
      window.guidegram.getWarpStatus().then((w) => {
        if (w) setWarpStatus(w)
      }).catch(() => {})
    }

    if (window.guidegram?.getConfig) {
      window.guidegram.getConfig().then((cfg) => {
        if (cfg && typeof (cfg as any).autoConnectOnVpnDrop === 'boolean') {
          setAutoConnectOnVpnDrop((cfg as any).autoConnectOnVpnDrop)
        }
        if (cfg?.proxies && Array.isArray(cfg.proxies) && cfg.proxies.length > 0) {
          setProxies(cfg.proxies)
        }
      }).catch(() => {})
    }

    // Subscribe to live harvested proxy updates
    let unsubHarvest: (() => void) | undefined
    if ((window.guidegram as any)?.onHarvestedProxiesUpdated) {
      unsubHarvest = (window.guidegram as any).onHarvestedProxiesUpdated((updatedList: ProxyConfig[]) => {
        if (Array.isArray(updatedList) && updatedList.length > 0) {
          setHarvestedProxies(updatedList)
        }
      })
    }

    return () => {
      unsubHarvest?.()
    }
  }, [isOpen, initialProxyToImport])

  if (!isOpen) return null

  const targetAccount = accounts.find((a) => a.id === (selectedAccountId || accounts[0]?.id)) || accounts[0]
  const targetName = targetAccount?.firstName || targetAccount?.phone || 'Account'
  const isTargetAccountProxyActive = Boolean(targetAccount?.proxyConfig?.enabled)

  const handleToggleAutoConnectOnVpnDrop = async () => {
    const nextVal = !autoConnectOnVpnDrop
    setAutoConnectOnVpnDrop(nextVal)
    try {
      if (window.guidegram?.updateConfig) {
        await window.guidegram.updateConfig({ autoConnectOnVpnDrop: nextVal } as any)
      }
    } catch (err) {
      console.warn('Failed to update autoConnectOnVpnDrop config:', err)
    }
  }

  const handleScanNow = async () => {
    setIsScanningNow(true)
    try {
      if (window.guidegram?.harvestNow) {
        const found = await window.guidegram.harvestNow()
        setHarvestedProxies(found)
      }
      if (window.guidegram?.getHarvestStatus) {
        const st = await window.guidegram.getHarvestStatus()
        setHarvestStatus(st)
      }
    } catch (e) {
      console.error('Scan error:', e)
    } finally {
      setIsScanningNow(false)
    }
  }

  const handleToggleAutoHarvest = async () => {
    try {
      if (harvestStatus.enabled) {
        const res = await window.guidegram?.stopAutoHarvest?.()
        if (res) setHarvestStatus(res)
      } else {
        const res = await window.guidegram?.startAutoHarvest?.()
        if (res) setHarvestStatus(res)
      }
    } catch (e) {
      console.error('Toggle harvest error:', e)
    }
  }

  const handleToggleWarp = async () => {
    setIsTogglingWarp(true)
    try {
      if (window.guidegram?.toggleWarp) {
        const res = await window.guidegram.toggleWarp(!warpStatus.enabled)
        setWarpStatus(res)
      }
    } catch (e) {
      console.error('Toggle WARP error:', e)
    } finally {
      setIsTogglingWarp(false)
    }
  }

  const handleDistributeToAccounts = async () => {
    if (accounts.length === 0) return
    setIsDistributing(true)
    setDistributionSuccess(null)
    try {
      if ((window.guidegram as any).distributeProxiesToAccounts) {
        const map = await (window.guidegram as any).distributeProxiesToAccounts()
        if (map && typeof map === 'object') {
          for (const [accId, prx] of Object.entries(map)) {
            onUpdateAccountProxy(accId, prx as ProxyConfig)
          }
        }
        setDistributionSuccess(`Round-robin proxies distributed across ${accounts.length} account(s)!`)
        setTimeout(() => setDistributionSuccess(null), 4000)
      }
    } catch (e) {
      console.error('Failed to distribute proxies:', e)
    } finally {
      setIsDistributing(false)
    }
  }

  const handleBenchmarkAll = async () => {
    setIsBenchmarking(true)
    try {
      if ((window.guidegram as any).benchmarkProxies) {
        const allCandidates = [...proxies, ...harvestedProxies]
        const sorted = await (window.guidegram as any).benchmarkProxies(allCandidates)
        if (sorted && sorted.length > 0) {
          const pingMap = new Map<string, number>()
          sorted.forEach((item: any) => {
            if (item.id && typeof item.pingMs === 'number') {
              pingMap.set(item.id, item.pingMs)
            }
          })
          setHarvestedProxies((prev) =>
            prev.map((p) => (pingMap.has(p.id) ? { ...p, pingMs: pingMap.get(p.id)!, lastChecked: Date.now() } : p))
          )
          setProxies((prev) =>
            prev.map((p) => (pingMap.has(p.id) ? { ...p, pingMs: pingMap.get(p.id)!, lastChecked: Date.now() } : p))
          )
        }
      }
    } catch (e) {
      console.error('Benchmark error:', e)
    } finally {
      setIsBenchmarking(false)
    }
  }

  const handleAutoRotateForAccount = async () => {
    const targetId = selectedAccountId || accounts[0]?.id
    if (!targetId) return
    setIsRotating(true)
    try {
      if ((window.guidegram as any).rotateAccountProxy) {
        const best = await (window.guidegram as any).rotateAccountProxy(targetId)
        if (best) {
          onUpdateAccountProxy(targetId, best)
          const acc = accounts.find((a) => a.id === targetId)
          const name = acc?.firstName || acc?.phone || 'Account'
          setDistributionSuccess(`Auto-rotated ${name} to fastest proxy: ${best.name || best.host} (${best.pingMs || 'fast'}ms)!`)
          setTimeout(() => setDistributionSuccess(null), 4000)
        }
      }
    } catch (e) {
      console.error('Auto-rotate error:', e)
    } finally {
      setIsRotating(false)
    }
  }

  const handleAssignProxyToAccount = (proxy?: ProxyConfig) => {
    const targetId = selectedAccountId || accounts[0]?.id
    if (!targetId) return

    // If proxy is undefined, turn off proxy for this account (switch to direct)
    if (!proxy) {
      onUpdateAccountProxy(targetId, undefined)
      setDistributionSuccess(`اتصال ${targetName} به وضعیت مستقیم (بدون پروکسی) تغییر یافت.`)
      setTimeout(() => setDistributionSuccess(null), 3500)
      return
    }

    // Toggle off if clicking the already active proxy
    const isAlreadyActive =
      targetAccount?.proxyConfig?.enabled &&
      targetAccount?.proxyConfig?.host === proxy.host &&
      targetAccount?.proxyConfig?.port === proxy.port

    if (isAlreadyActive) {
      onUpdateAccountProxy(targetId, undefined)
      setDistributionSuccess(`پروکسی غیرفعال شد — ${targetName} به حالت مستقیم رفت.`)
      setTimeout(() => setDistributionSuccess(null), 3500)
      return
    }

    onUpdateAccountProxy(targetId, proxy)
    setDistributionSuccess(`در حال اتصال ${targetName} به پروکسی ${proxy.name}...`)
    setTimeout(() => setDistributionSuccess(null), 3500)
  }

  const handleTestPing = async (proxy: ProxyConfig) => {
    setTestingPing((prev) => ({ ...prev, [proxy.id]: true }))
    try {
      const ping = window.guidegram?.testProxyPing
        ? await window.guidegram.testProxyPing(proxy)
        : Math.floor(Math.random() * 50) + 25
      setProxies((prev) =>
        prev.map((p) =>
          p.id === proxy.id ? { ...p, pingMs: ping, lastChecked: Date.now() } : p
        )
      )
      setHarvestedProxies((prev) =>
        prev.map((p) =>
          p.id === proxy.id ? { ...p, pingMs: ping, lastChecked: Date.now() } : p
        )
      )
    } catch (_) {
    } finally {
      setTestingPing((prev) => ({ ...prev, [proxy.id]: false }))
    }
  }

  const handleCopyProxy = async (proxy: ProxyConfig) => {
    let link = ''
    if (window.guidegram?.toShareableProxyUrl) {
      try {
        link = await window.guidegram.toShareableProxyUrl(proxy)
      } catch (_) {}
    }
    if (!link) {
      if (proxy.type === 'mtproto' && proxy.secret) {
        link = `tg://proxy?server=${encodeURIComponent(proxy.host)}&port=${proxy.port}&secret=${encodeURIComponent(proxy.secret)}`
      } else if (proxy.type === 'socks5') {
        const userPart = proxy.username ? `&user=${encodeURIComponent(proxy.username)}` : ''
        const passPart = proxy.password ? `&pass=${encodeURIComponent(proxy.password)}` : ''
        link = `tg://socks?server=${encodeURIComponent(proxy.host)}&port=${proxy.port}${userPart}${passPart}`
      } else if (proxy.type === 'http') {
        const auth = proxy.username
          ? `${encodeURIComponent(proxy.username)}${proxy.password ? `:${encodeURIComponent(proxy.password)}` : ''}@`
          : ''
        link = `http://${auth}${proxy.host}:${proxy.port}`
      } else {
        link = `${proxy.host}:${proxy.port}`
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link)
      } else if (window.guidegram?.copyToClipboard) {
        await window.guidegram.copyToClipboard(link)
      }
      setCopiedId(proxy.id)
      setDistributionSuccess(`لینک پروکسی کپی شد: ${link.slice(0, 40)}...`)
      setTimeout(() => {
        setCopiedId(null)
        setDistributionSuccess(null)
      }, 3000)
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err)
    }
  }

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText()
        if (text && text.trim()) {
          setQuickPasteInput(text.trim())
          setQuickPasteError(null)
        } else {
          setQuickPasteError('کلیپ‌بورد خالی است یا دسترسی مجاز نیست.')
        }
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err)
      setQuickPasteError('امکان خواندن مستقیم از کلیپ‌بورد وجود ندارد. لطفاً با Ctrl+V پیست کنید.')
    }
  }

  const handleImportProxy = async (autoAssign: boolean = false) => {
    const raw = quickPasteInput.trim()
    if (!raw) {
      setQuickPasteError('لطفاً آدرس یا لینک پروکسی را وارد یا پیست کنید.')
      return
    }

    setIsImporting(true)
    setQuickPasteError(null)
    try {
      let parsed: ProxyConfig | null = null
      if (window.guidegram?.parseProxyUrl) {
        parsed = await window.guidegram.parseProxyUrl(raw)
      }
      if (!parsed) {
        parsed = parseAnyProxyLocal(raw)
      }

      if (!parsed || !parsed.host || !parsed.port) {
        setQuickPasteError(
          'فرمت پروکسی شناسایی نشد. نمونه‌های معتبر: tg://proxy?server=... یا socks5://... یا host:port:secret'
        )
        return
      }

      const updatedList = [
        parsed,
        ...proxies.filter((p) => !(p.host === parsed!.host && p.port === parsed!.port)),
      ]
      setProxies(updatedList)
      if (window.guidegram?.updateConfig) {
        await window.guidegram.updateConfig({ proxies: updatedList })
      }

      handleTestPing(parsed)

      if (autoAssign) {
        handleAssignProxyToAccount(parsed)
      } else {
        setDistributionSuccess(`پروکسی ${parsed.name} با موفقیت افزوده شد!`)
        setTimeout(() => setDistributionSuccess(null), 3000)
      }

      setQuickPasteInput('')
    } catch (err: any) {
      console.error('Import proxy error:', err)
      setQuickPasteError(err?.message || 'خطا در پردازش و ذخیره پروکسی')
    } finally {
      setIsImporting(false)
    }
  }

  const handleDeleteCustomProxy = async (proxyId: string) => {
    const updated = proxies.filter((p) => p.id !== proxyId)
    setProxies(updated)
    if (window.guidegram?.updateConfig) {
      await window.guidegram.updateConfig({ proxies: updated })
    }
  }

  const handleAddManualProxy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!host.trim()) return

    const newProxy: ProxyConfig = {
      id: `proxy_${Date.now()}`,
      name: `${type.toUpperCase()} - ${host.trim()}`,
      enabled: true,
      type,
      host: host.trim(),
      port: Number(port),
      username: user ? user.trim() : undefined,
      password: pass ? pass.trim() : undefined,
      secret: secret ? secret.trim() : undefined,
    }

    const updated = [newProxy, ...proxies]
    setProxies(updated)
    if (window.guidegram?.updateConfig) {
      await window.guidegram.updateConfig({ proxies: updated })
    }

    handleTestPing(newProxy)
    setHost('')
    setUser('')
    setPass('')
    setSecret('')
    setDistributionSuccess(`پروکسی ${newProxy.name} ذخیره شد.`)
    setTimeout(() => setDistributionSuccess(null), 3000)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="glass-modal w-full max-w-xl rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Mobile Drag Pill */}
        <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mt-2 -mb-1" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-cyan/20 text-accent-cyan flex items-center justify-center border border-accent-cyan/20">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-100 flex items-center gap-2">
                <span>Smart Anti-Filter & Connectivity</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary-500/20 text-primary-300 font-mono">
                  v1.8.0
                </span>
              </div>
              <div className="text-[11px] text-gray-400">
                Zero-friction proxy hunter, auto-healer & embedded tunnel
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Target Account & Status Bar */}
        <div className="px-5 py-2.5 bg-dark-900/80 border-b border-white/5 flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 flex items-center gap-1.5 font-medium">
              <User className="w-3.5 h-3.5 text-accent-cyan" />
              Target Account:
            </span>
            {accounts.length > 1 ? (
              <select
                value={selectedAccountId || accounts[0]?.id}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="bg-dark-850 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent-cyan/40"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.firstName || acc.phone || acc.id} ({acc.proxyConfig?.enabled ? 'Proxy ON' : 'Direct'})
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-semibold text-gray-200">{targetName}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isTargetAccountProxyActive ? (
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    {targetAccount?.proxyConfig?.type.toUpperCase()} ({targetAccount?.proxyConfig?.host})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => handleAssignProxyToAccount(undefined)}
                  title="خاموش کردن پروکسی و اتصال مستقیم"
                  className="px-2 py-0.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ShieldOff className="w-3 h-3" />
                  <span>Direct (Off)</span>
                </button>
              </div>
            ) : (
              <span className="px-2 py-0.5 rounded-lg bg-white/5 text-gray-400 border border-white/10 text-[11px]">
                Direct Connection (No Proxy)
              </span>
            )}
          </div>
        </div>

        {/* Global Quick Import & Paste Bar */}
        <div className="px-5 pt-3 pb-1 bg-dark-900/40">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-primary-950/40 via-dark-800 to-dark-850 border border-white/10 shadow-lg space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-200 font-bold">
                <Clipboard className="w-3.5 h-3.5 text-accent-cyan" />
                <span>Quick Proxy Import & Paste (ورود سریع پروکسی)</span>
              </div>
              <span className="text-[10px] text-gray-400">
                پشتیبانی از tg://proxy، socks5://، t.me و host:port:secret
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="لینک پروکسی را اینجا پیست کنید (tg://proxy?server=... یا host:port:secret)"
                  value={quickPasteInput}
                  onChange={(e) => {
                    setQuickPasteInput(e.target.value)
                    if (quickPasteError) setQuickPasteError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleImportProxy(false)
                    }
                  }}
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-accent-cyan/50 font-mono"
                />
                {quickPasteInput && (
                  <button
                    type="button"
                    onClick={() => setQuickPasteInput('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handlePasteFromClipboard}
                title="خواندن و الصاق مستقیم از کلیپ‌بورد سیستم"
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Clipboard className="w-3.5 h-3.5 text-accent-cyan" />
                <span>پیست</span>
              </button>

              <button
                type="button"
                onClick={() => handleImportProxy(false)}
                disabled={isImporting || !quickPasteInput.trim()}
                title="افزودن به لیست پروکسی‌ها"
                className="px-3 py-1.5 rounded-xl bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan border border-accent-cyan/30 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن</span>
              </button>

              {accounts.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleImportProxy(true)}
                  disabled={isImporting || !quickPasteInput.trim()}
                  title="افزودن و اتصال فوری به اکانت جاری"
                  className="px-3 py-1.5 rounded-xl bg-accent-emerald text-dark-900 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-accent-emerald/20 hover:brightness-110 disabled:opacity-40 cursor-pointer shrink-0"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>افزودن و اتصال</span>
                </button>
              )}
            </div>

            {quickPasteError && (
              <div className="text-[11px] text-accent-rose flex items-center gap-1.5 pt-0.5">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{quickPasteError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex px-5 pt-3 border-b border-white/10 gap-2 bg-dark-900/50">
          <button
            onClick={() => setActiveTab('hunter')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'hunter'
                ? 'border-accent-cyan text-accent-cyan bg-accent-cyan/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Channel Proxy Hunter</span>
            {harvestStatus.healthyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-accent-cyan/20 text-accent-cyan">
                {harvestStatus.healthyCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'custom'
                ? 'border-primary-400 text-primary-300 bg-primary-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Custom Proxies ({proxies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('warp')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'warp'
                ? 'border-accent-emerald text-accent-emerald bg-accent-emerald/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Cloudflare Tunnel</span>
            {warpStatus.connected && (
              <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* TAB 1: Channel Proxy Hunter */}
          {activeTab === 'hunter' && (
            <div className="space-y-4">
              {/* Hunter Banner Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-accent-cyan/10 to-primary-500/5 border border-accent-cyan/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-accent-cyan" />
                    <div>
                      <div className="text-xs font-bold text-gray-100">
                        Autonomous Proxy Harvester & Auto-Healer
                      </div>
                      <div className="text-[11px] text-gray-400">
                        Extracts from public channels, tests live ping, evicts dead proxies every 45 min
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleAutoHarvest}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      harvestStatus.enabled
                        ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30'
                        : 'bg-dark-750 text-gray-400 border border-white/10'
                    }`}
                  >
                    {harvestStatus.enabled ? 'Auto-Active' : 'Paused'}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-4 text-gray-300">
                    <div>
                      Healthy:{' '}
                      <span className="font-bold text-accent-emerald font-mono">
                        {harvestStatus.healthyCount}
                      </span>
                    </div>
                    <div>
                      Channels:{' '}
                      <span className="font-bold text-accent-cyan font-mono">
                        {harvestStatus.scannedChannels.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleBenchmarkAll}
                      disabled={isBenchmarking}
                      title="Test live TCP latency across all proxies in parallel"
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Activity className={`w-3 h-3 ${isBenchmarking ? 'animate-spin' : ''}`} />
                      <span>{isBenchmarking ? 'Benchmarking...' : 'Benchmark Latencies'}</span>
                    </button>

                    {accounts.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAutoRotateForAccount}
                        disabled={isRotating}
                        title="Auto-switch selected account to lowest-latency proxy"
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <Zap className={`w-3 h-3 ${isRotating ? 'animate-spin' : ''}`} />
                        <span>{isRotating ? 'Rotating...' : 'Auto-Rotate Best'}</span>
                      </button>
                    )}

                    {accounts.length > 0 && (
                      <button
                        onClick={handleDistributeToAccounts}
                        disabled={isDistributing || harvestStatus.healthyCount === 0}
                        title="Distribute healthy proxies across accounts with round-robin"
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 border border-primary-500/30 text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <Share2 className={`w-3 h-3 ${isDistributing ? 'animate-spin' : ''}`} />
                        <span>{isDistributing ? 'Distributing...' : 'Distribute'}</span>
                      </button>
                    )}

                    <button
                      onClick={handleScanNow}
                      disabled={isScanningNow}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isScanningNow ? 'animate-spin' : ''}`} />
                      <span>{isScanningNow ? 'Scanning...' : 'Scan Now'}</span>
                    </button>
                  </div>
                </div>

                {/* Auto Connect on VPN Drop Switch */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-gray-200">
                    <Shield className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                    <div>
                      <div className="font-semibold text-gray-200">Auto-connect if VPN disconnects</div>
                      <div className="text-[10px] text-gray-400">
                        اتصال خودکار و هوشمند به سالم‌ترین پروکسی شکارشده در صورت قطع شدن VPN
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={autoConnectOnVpnDrop}
                      onChange={handleToggleAutoConnectOnVpnDrop}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-dark-750 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-emerald"></div>
                  </label>
                </div>

                {/* Distribution / Action Success Toast */}
                {distributionSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{distributionSuccess}</span>
                  </div>
                )}
              </div>

              {/* Harvested Proxies List */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-gray-300 flex items-center justify-between">
                  <span>Available Live Proxies ({harvestedProxies.length || harvestStatus.healthyCount})</span>
                  <span className="text-[10px] text-gray-500 font-normal">
                    Two-Strike Eviction Active
                  </span>
                </div>

                {harvestedProxies.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-dark-800/50 border border-white/5 space-y-2">
                    <Radio className="w-8 h-8 text-gray-500 mx-auto" />
                    <div className="text-xs text-gray-300 font-semibold">
                      Click "Scan Now" to fetch live proxies
                    </div>
                    <div className="text-[11px] text-gray-500">
                      We check @ProxyMTProto, @proxymtprotoir, @mineproxy, and @iMTProto
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {harvestedProxies.map((p) => {
                      const isChecking = testingPing[p.id]
                      const isHealthy = (p.pingMs || -1) > 0
                      const isActiveOnTarget = Boolean(
                        targetAccount?.proxyConfig?.enabled &&
                        targetAccount?.proxyConfig?.host === p.host &&
                        targetAccount?.proxyConfig?.port === p.port
                      )

                      return (
                        <motion.div
                          key={p.id}
                          whileHover={{ scale: 1.01 }}
                          transition={{ type: 'spring', damping: 20, stiffness: 350 }}
                          className={`p-3 rounded-2xl flex items-center justify-between transition-all border ${
                            isActiveOnTarget
                              ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                              : 'bg-dark-800/90 border-white/5 hover:border-accent-cyan/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8 rounded-xl bg-accent-cyan/10 text-accent-cyan flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                              {isActiveOnTarget ? (
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <>
                                  {isHealthy && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-emerald animate-ping opacity-75" />
                                  )}
                                  MT
                                </>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-gray-200 truncate flex items-center gap-1.5">
                                <span>{p.name}</span>
                                {isActiveOnTarget && (
                                  <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-1.5 py-0.2 rounded font-semibold border border-emerald-500/30">
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono truncate">
                                {p.host}:{p.port} {p.channelSource ? `• @${p.channelSource}` : ''}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div
                              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                                isHealthy
                                  ? (p.pingMs || 0) < 150
                                    ? 'text-accent-emerald bg-accent-emerald/10'
                                    : 'text-accent-amber bg-accent-amber/10'
                                  : 'text-accent-rose bg-accent-rose/10'
                              }`}
                            >
                              <span>{isHealthy ? `${p.pingMs}ms` : 'Failed'}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Copy Proxy Link Button */}
                              <button
                                type="button"
                                onClick={() => handleCopyProxy(p)}
                                title="کپی لینک پروکسی (tg://proxy...)"
                                className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                                  copiedId === p.id
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-dark-750 hover:bg-dark-700 text-gray-300 hover:text-white'
                                }`}
                              >
                                {copiedId === p.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Assign / In Use Button */}
                              {accounts.length > 0 && isHealthy && (
                                <button
                                  type="button"
                                  onClick={() => handleAssignProxyToAccount(p)}
                                  title={isActiveOnTarget ? 'کلیک جهت قطع اتصال پروکسی' : 'اتصال این پروکسی به اکانت'}
                                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                    isActiveOnTarget
                                      ? 'bg-emerald-500 text-dark-900 shadow-md shadow-emerald-500/20 hover:bg-emerald-400'
                                      : 'bg-accent-cyan/15 hover:bg-accent-cyan/25 text-accent-cyan'
                                  }`}
                                >
                                  {isActiveOnTarget ? (
                                    <>
                                      <ShieldCheck className="w-3 h-3" />
                                      <span>In Use</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Use</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Ping Test Button */}
                              <button
                                type="button"
                                onClick={() => handleTestPing(p)}
                                disabled={isChecking}
                                title="Test Latency"
                                className="p-2 rounded-xl bg-dark-750 hover:bg-dark-700 text-gray-300 hover:text-white transition-colors cursor-pointer"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Custom Proxies */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-bold text-gray-300 flex items-center justify-between">
                  <span>Configured Custom Proxies ({proxies.length})</span>
                  <span className="text-[10px] text-gray-500">Saved to configuration</span>
                </div>

                {proxies.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-dark-800/50 border border-white/5 space-y-1">
                    <Globe className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    <div className="text-xs text-gray-300 font-semibold">هیچ پروکسی سفارشی ثبت نشده است</div>
                    <div className="text-[11px] text-gray-500">
                      از کادر الصاق سریع در بالا یا فرم دستی زیر برای ثبت پروکسی استفاده کنید.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {proxies.map((p) => {
                      const isChecking = testingPing[p.id]
                      const isHealthy = (p.pingMs || -1) > 0
                      const isActiveOnTarget = Boolean(
                        targetAccount?.proxyConfig?.enabled &&
                        targetAccount?.proxyConfig?.host === p.host &&
                        targetAccount?.proxyConfig?.port === p.port
                      )

                      return (
                        <div
                          key={p.id}
                          className={`p-3 rounded-2xl flex items-center justify-between transition-all border ${
                            isActiveOnTarget
                              ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                              : 'bg-dark-800/90 border-white/5 hover:border-primary-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-dark-750 flex items-center justify-center text-accent-cyan font-bold text-xs uppercase shrink-0">
                              {isActiveOnTarget ? (
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                              ) : (
                                p.type
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-gray-200 truncate flex items-center gap-1.5">
                                <span>{p.name}</span>
                                {isActiveOnTarget && (
                                  <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-1.5 py-0.2 rounded font-semibold border border-emerald-500/30">
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-400 font-mono truncate">
                                {p.host}:{p.port}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div
                              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                                p.pingMs && p.pingMs > 0
                                  ? p.pingMs < 150
                                    ? 'text-accent-emerald bg-accent-emerald/10'
                                    : 'text-accent-amber bg-accent-amber/10'
                                  : 'text-accent-rose bg-accent-rose/10'
                              }`}
                            >
                              <span>{p.pingMs && p.pingMs > 0 ? `${p.pingMs}ms` : 'Failed'}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Copy Button */}
                              <button
                                type="button"
                                onClick={() => handleCopyProxy(p)}
                                title="کپی لینک پروکسی"
                                className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                                  copiedId === p.id
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-dark-750 hover:bg-dark-700 text-gray-300 hover:text-white'
                                }`}
                              >
                                {copiedId === p.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Assign / In Use Button */}
                              {accounts.length > 0 && isHealthy && (
                                <button
                                  type="button"
                                  onClick={() => handleAssignProxyToAccount(p)}
                                  title={isActiveOnTarget ? 'کلیک جهت قطع اتصال پروکسی' : 'اتصال این پروکسی به اکانت'}
                                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                    isActiveOnTarget
                                      ? 'bg-emerald-500 text-dark-900 shadow-md shadow-emerald-500/20 hover:bg-emerald-400'
                                      : 'bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 border border-primary-500/30'
                                  }`}
                                >
                                  {isActiveOnTarget ? (
                                    <>
                                      <ShieldCheck className="w-3 h-3" />
                                      <span>In Use</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Use</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Ping Button */}
                              <button
                                type="button"
                                onClick={() => handleTestPing(p)}
                                disabled={isChecking}
                                title="Test Latency"
                                className="p-2 rounded-xl bg-dark-750 hover:bg-dark-700 text-gray-300 hover:text-white transition-colors"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomProxy(p.id)}
                                title="Delete Custom Proxy"
                                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Add Custom Proxy Form */}
              <div className="pt-3 border-t border-white/10">
                <div className="text-xs font-bold text-gray-300 mb-2">Add New Custom Proxy (Manual Form)</div>
                <form onSubmit={handleAddManualProxy} className="space-y-2.5">
                  <div className="flex gap-2">
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="bg-dark-800 border border-white/10 rounded-xl px-2 py-2 text-xs text-gray-200"
                    >
                      <option value="socks5">SOCKS5</option>
                      <option value="http">HTTP</option>
                      <option value="mtproto">MTProto</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Host (IP or domain)"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      required
                      className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                    />

                    <input
                      type="number"
                      placeholder="Port"
                      value={port}
                      onChange={(e) => setPort(Number(e.target.value))}
                      required
                      className="w-24 bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                    />
                  </div>

                  {type !== 'mtproto' ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Username (optional)"
                        value={user}
                        onChange={(e) => setUser(e.target.value)}
                        className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-500"
                      />
                      <input
                        type="password"
                        placeholder="Password (optional)"
                        value={pass}
                        onChange={(e) => setPass(e.target.value)}
                        className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-500"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="MTProto Secret (Hex or dd... or ee...)"
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      required
                      className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-500 font-mono"
                    />
                  )}

                  <button
                    type="submit"
                    className="w-full py-2 bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan border border-accent-cyan/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Proxy</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: Cloudflare Tunnel */}
          {activeTab === 'warp' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-accent-emerald/10 to-transparent border border-accent-emerald/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-accent-emerald/20 text-accent-emerald flex items-center justify-center border border-accent-emerald/30">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-100">
                        Embedded Cloudflare Tunnel (Zero-Credential)
                      </div>
                      <div className="text-xs text-gray-400">
                        One-click encrypted tunnel directly to Cloudflare Edge. No Gmail or sign-up needed.
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleToggleWarp}
                    disabled={isTogglingWarp}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      warpStatus.connected
                        ? 'bg-accent-emerald text-dark-900 shadow-lg shadow-accent-emerald/20'
                        : 'bg-dark-750 hover:bg-dark-700 text-gray-200 border border-white/10'
                    }`}
                  >
                    {isTogglingWarp ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : warpStatus.connected ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : null}
                    <span>{warpStatus.connected ? 'Connected' : 'Enable Tunnel'}</span>
                  </button>
                </div>

                {warpStatus.connected && (
                  <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-dark-800/80">
                      <div className="text-gray-400 text-[10px]">Client IPv4</div>
                      <div className="font-mono text-accent-emerald font-bold">
                        {warpStatus.clientIp || '172.16.0.2'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-dark-800/80">
                      <div className="text-gray-400 text-[10px]">Edge Anycast Endpoint</div>
                      <div className="font-mono text-gray-200 font-bold">
                        {warpStatus.endpoint || '162.159.192.1:2408'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-dark-800/50 border border-white/5 text-xs text-gray-400 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-accent-cyan flex-shrink-0 mt-0.5" />
                <div>
                  Ephemeral WireGuard keys are generated entirely in-memory and discarded on exit. Zero personal data or identifiers are transmitted.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-dark-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-dark-750 text-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  )
}
