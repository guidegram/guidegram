import React, { useState, useEffect } from 'react'
import { X, Shield, Plus, RefreshCw, Check, Trash2, Globe, Radio, Zap, Sparkles, AlertCircle, User, Share2, Layers, CheckCircle2 } from 'lucide-react'
import { ProxyConfig, AccountInfo, AutoHarvestStatus, WarpStatus } from '../types/telegram'

interface ProxySettingsModalProps {
  isOpen: boolean
  accounts: AccountInfo[]
  onClose: () => void
  onUpdateAccountProxy: (accountId: string, proxy?: ProxyConfig) => void
}

type ProxyTab = 'hunter' | 'warp' | 'custom'

export const ProxySettingsModal: React.FC<ProxySettingsModalProps> = ({
  isOpen,
  accounts,
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
  const [type, setType] = useState<'socks5' | 'http' | 'mtproto'>('socks5')
  const [host, setHost] = useState('')
  const [port, setPort] = useState(1080)
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [secret, setSecret] = useState('')

  // Load initial status on mount
  useEffect(() => {
    if (!isOpen) return

    if (window.guidegram.getHarvestStatus) {
      window.guidegram.getHarvestStatus().then((st) => {
        if (st) setHarvestStatus(st)
      })
    }

    if (window.guidegram.getWarpStatus) {
      window.guidegram.getWarpStatus().then((w) => {
        if (w) setWarpStatus(w)
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleScanNow = async () => {
    setIsScanningNow(true)
    try {
      if (window.guidegram.harvestNow) {
        const found = await window.guidegram.harvestNow()
        setHarvestedProxies(found)
      }
      if (window.guidegram.getHarvestStatus) {
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
        const res = await window.guidegram.stopAutoHarvest()
        setHarvestStatus(res)
      } else {
        const res = await window.guidegram.startAutoHarvest()
        setHarvestStatus(res)
      }
    } catch (e) {
      console.error('Toggle harvest error:', e)
    }
  }

  const handleToggleWarp = async () => {
    setIsTogglingWarp(true)
    try {
      if (window.guidegram.toggleWarp) {
        const res = await window.guidegram.toggleWarp(!warpStatus.enabled)
        setWarpStatus(res)
      }
    } catch (e) {
      console.error('Toggle WARP error:', e)
    } finally {
      setIsTogglingWarp(false)
    }
  }

  const [isDistributing, setIsDistributing] = useState(false)
  const [distributionSuccess, setDistributionSuccess] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '')

  const handleDistributeToAccounts = async () => {
    if (accounts.length === 0) return
    setIsDistributing(true)
    setDistributionSuccess(null)
    try {
      if ((window.guidegram as any).distributeProxiesToAccounts) {
        await (window.guidegram as any).distributeProxiesToAccounts()
        setDistributionSuccess(`Round-robin proxies distributed across ${accounts.length} account(s)!`)
        setTimeout(() => setDistributionSuccess(null), 4000)
      }
    } catch (e) {
      console.error('Failed to distribute proxies:', e)
    } finally {
      setIsDistributing(false)
    }
  }

  const handleAssignProxyToAccount = (proxy: ProxyConfig) => {
    const targetId = selectedAccountId || accounts[0]?.id
    if (!targetId) return
    onUpdateAccountProxy(targetId, proxy)
    const acc = accounts.find((a) => a.id === targetId)
    const name = acc?.firstName || acc?.phone || 'Account'
    setDistributionSuccess(`Assigned ${proxy.name} to ${name}!`)
    setTimeout(() => setDistributionSuccess(null), 3000)
  }

  const handleTestPing = async (proxy: ProxyConfig) => {
    setTestingPing((prev) => ({ ...prev, [proxy.id]: true }))
    try {
      const ping = await window.guidegram.testProxyPing(proxy)
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
    } finally {
      setTestingPing((prev) => ({ ...prev, [proxy.id]: false }))
    }
  }

  const handleAddProxy = (e: React.FormEvent) => {
    e.preventDefault()
    if (!host.trim()) return

    const newProxy: ProxyConfig = {
      id: `proxy_${Date.now()}`,
      name: `${type.toUpperCase()} - ${host}`,
      enabled: true,
      type,
      host: host.trim(),
      port: Number(port),
      username: user ? user.trim() : undefined,
      password: pass ? pass.trim() : undefined,
      secret: secret ? secret.trim() : undefined,
    }

    setProxies([...proxies, newProxy])
    setHost('')
    setUser('')
    setPass('')
    setSecret('')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-modal w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">
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

          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'custom'
                ? 'border-primary-400 text-primary-300 bg-primary-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Custom Proxies</span>
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
                      Scanned Channels:{' '}
                      <span className="font-bold text-accent-cyan font-mono">
                        {harvestStatus.scannedChannels.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {accounts.length > 0 && (
                      <button
                        onClick={handleDistributeToAccounts}
                        disabled={isDistributing || harvestStatus.healthyCount === 0}
                        title="Distribute healthy proxies across accounts with round-robin"
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 border border-primary-500/30 text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <Share2 className={`w-3 h-3 ${isDistributing ? 'animate-spin' : ''}`} />
                        <span>{isDistributing ? 'Distributing...' : 'Distribute to Accounts'}</span>
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

                {/* Account Binding Bar */}
                {accounts.length > 1 && (
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
                    <span className="text-gray-400 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-accent-cyan" />
                      Target Account:
                    </span>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="bg-dark-850 border border-white/10 rounded-xl px-2 py-1 text-xs text-gray-200 focus:outline-none"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.firstName || acc.phone || acc.id} ({acc.proxyConfig?.enabled ? 'Proxy ON' : 'Direct'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Distribution Success Toast */}
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
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {harvestedProxies.map((p) => {
                      const isChecking = testingPing[p.id]
                      const isHealthy = (p.pingMs || -1) > 0

                      return (
                        <div
                          key={p.id}
                          className="p-3 bg-dark-800/90 border border-white/5 rounded-2xl flex items-center justify-between hover:border-accent-cyan/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-accent-cyan/10 text-accent-cyan flex items-center justify-center font-bold text-[10px] uppercase">
                              MT
                            </div>
                            <div>
                              <div className="text-xs font-bold text-gray-200">{p.name}</div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                {p.host}:{p.port} {p.channelSource ? `• @${p.channelSource}` : ''}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
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
                              {accounts.length > 0 && isHealthy && (
                                <button
                                  onClick={() => handleAssignProxyToAccount(p)}
                                  title="Assign this proxy to target account"
                                  className="px-2.5 py-1.5 rounded-xl bg-accent-cyan/15 hover:bg-accent-cyan/25 text-accent-cyan text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Use</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleTestPing(p)}
                                disabled={isChecking}
                                title="Test Latency"
                                className="p-2 rounded-xl bg-dark-750 hover:bg-dark-700 text-gray-300 hover:text-white transition-colors cursor-pointer"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Cloudflare Tunnel */}
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

          {/* TAB 3: Custom Proxies */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-bold text-gray-300">Configured Custom Proxies</div>
                {proxies.map((p) => {
                  const isChecking = testingPing[p.id]

                  return (
                    <div
                      key={p.id}
                      className="p-3 bg-dark-800/90 border border-white/5 rounded-2xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-dark-750 flex items-center justify-center text-accent-cyan font-bold text-xs uppercase">
                          {p.type}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-200">{p.name}</div>
                          <div className="text-[11px] text-gray-400 font-mono">
                            {p.host}:{p.port}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
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

                        <button
                          onClick={() => handleTestPing(p)}
                          disabled={isChecking}
                          title="Test Latency"
                          className="p-2 rounded-xl bg-dark-750 hover:bg-dark-700 text-gray-300 hover:text-white transition-colors"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Add Custom Proxy Form */}
              <div className="pt-3 border-t border-white/10">
                <div className="text-xs font-bold text-gray-300 mb-2">Add New Custom Proxy</div>
                <form onSubmit={handleAddProxy} className="space-y-2.5">
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
                      placeholder="MTProto Secret (Hex or dd...)"
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-500 font-mono"
                    />
                  )}

                  <button
                    type="submit"
                    className="w-full py-2 bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan border border-accent-cyan/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Proxy</span>
                  </button>
                </form>
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
      </div>
    </div>
  )
}
