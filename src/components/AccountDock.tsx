import React, { useState, useEffect } from 'react'
import { Plus, Shield, Inbox, Settings, Bot, Smartphone, Wallet, ExternalLink, Copy, Check } from 'lucide-react'
import { AccountInfo } from '../types/telegram'
import { Avatar } from './Avatar'
import { useI18n } from '../i18n'

interface AccountDockProps {
  accounts: AccountInfo[]
  activeAccountId: string | null
  unreadCountsByAccount?: Record<string, number>
  isUnifiedInboxOpen: boolean
  onSelectAccount: (accountId: string) => void
  onOpenAddAccount: () => void
  onToggleUnifiedInbox: () => void
  onOpenProxyModal: () => void
  onOpenSettings: () => void
  onOpenMcpHub?: () => void
  onOpenSavedMessages?: () => void
  isSavedMessagesActive?: boolean
  onOpenAccountExport?: () => void
  onOpenTonWallet?: () => void
}

export const AccountDock: React.FC<AccountDockProps> = ({
  accounts,
  activeAccountId,
  unreadCountsByAccount = {},
  isUnifiedInboxOpen,
  onSelectAccount,
  onOpenAddAccount,
  onToggleUnifiedInbox,
  onOpenProxyModal,
  onOpenSettings,
  onOpenMcpHub,
  onOpenSavedMessages,
  isSavedMessagesActive = false,
  onOpenAccountExport,
  onOpenTonWallet,
}) => {
  const { t } = useI18n()
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    account: AccountInfo
  } | null>(null)
  const [copiedId, setCopiedId] = useState(false)
  const [isToolsHubOpen, setIsToolsHubOpen] = useState(false)
  const [hoveredTooltip, setHoveredTooltip] = useState<{
    y: number
    title: string
    subtitle?: string
    badge?: string
    hotkey?: string
  } | null>(null)

  const showTooltip = (
    el: HTMLElement,
    info: { title: string; subtitle?: string; badge?: string; hotkey?: string }
  ) => {
    const rect = el.getBoundingClientRect()
    setHoveredTooltip({
      y: rect.top + rect.height / 2,
      ...info,
    })
  }

  const hideTooltip = () => setHoveredTooltip(null)

  useEffect(() => {
    const handleClose = () => {
      setContextMenu(null)
      setCopiedId(false)
      setHoveredTooltip(null)
      setIsToolsHubOpen(false)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null)
        setCopiedId(false)
        setHoveredTooltip(null)
        setIsToolsHubOpen(false)
      }
    }
    window.addEventListener('click', handleClose)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('click', handleClose)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <aside className="w-[72px] shrink-0 h-full bg-dark-900 border-r border-white/5 flex flex-col items-center py-3 select-none z-20 titlebar-no-drag">
      {/* Saved Messages Quick Access Button */}
      <button
        type="button"
        onClick={onOpenSavedMessages}
        onMouseEnter={(e) =>
          showTooltip(e.currentTarget, {
            title: t('account_dock.saved_messages_title'),
            subtitle: t('account_dock.saved_messages_subtitle'),
          })
        }
        onMouseLeave={hideTooltip}
        aria-label="Saved Messages"
        className={`group relative w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 ${
          isSavedMessagesActive
            ? 'bg-gradient-to-tr from-cyan-500 via-primary-500 to-blue-600 text-white shadow-glow ring-2 ring-primary-400 ring-offset-2 ring-offset-dark-900'
            : 'bg-gradient-to-tr from-cyan-600/90 via-primary-600/90 to-blue-600/90 hover:from-cyan-500 hover:via-primary-500 hover:to-blue-500 text-white shadow-md hover:shadow-glow border border-white/10 hover:border-white/20'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 text-white transition-transform duration-200 group-hover:scale-110 drop-shadow-md"
        >
          <path
            d="M6.5 4.5C6.5 3.39543 7.39543 2.5 8.5 2.5H15.5C16.6046 2.5 17.5 3.39543 17.5 4.5V20.8402C17.5 21.6212 16.6074 22.0673 15.9806 21.6001L12.4194 18.9472C12.1718 18.7627 11.8282 18.7627 11.5806 18.9472L8.01943 21.6001C7.39263 22.0673 6.5 21.6212 6.5 20.8402V4.5Z"
            fill="currentColor"
          />
        </svg>

        {isSavedMessagesActive && (
          <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-white shadow-sm ring-1 ring-cyan-400" />
        )}
      </button>

      {/* Unified Inbox Button */}
      <button
        onClick={onToggleUnifiedInbox}
        onMouseEnter={(e) =>
          showTooltip(e.currentTarget, {
            title: t('account_dock.unified_inbox_title'),
            subtitle: t('account_dock.unified_inbox_subtitle'),
          })
        }
        onMouseLeave={hideTooltip}
        className={`relative w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all cursor-pointer ${
          isUnifiedInboxOpen
            ? 'bg-primary-600 text-white shadow-glow'
            : 'bg-dark-800/80 text-gray-400 hover:text-white hover:bg-dark-750'
        }`}
      >
        <Inbox className="w-5 h-5" />
        {/* Total Unread across all accounts badge */}
        {(() => {
          const totalUnread = accounts.reduce(
            (sum, a) => sum + (unreadCountsByAccount[a.id] ?? a.unreadTotal ?? 0),
            0
          )
          if (totalUnread <= 0) return null
          return (
            <span className="absolute -top-1 -right-1 bg-accent-rose text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-dark-900 shadow-md">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )
        })()}
      </button>

      <div className="w-8 h-[1px] bg-white/10 my-1"></div>

      {/* Account List (Scrollable for 100+ accounts!) */}
      <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center gap-3 py-2 px-1">
        {accounts.map((acc) => {
          const isActive = !isUnifiedInboxOpen && acc.id === activeAccountId
          const safeFirst = acc.firstName || 'User'
          const initials = `${safeFirst.charAt(0)}${acc.lastName ? acc.lastName.charAt(0) : ''}`
          const unreadCount = unreadCountsByAccount[acc.id] ?? acc.unreadTotal ?? 0

          return (
            <div key={acc.id} className="relative group">
              <button
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    e.preventDefault()
                    window.guidegram?.openAccountWindow?.(acc.id)
                    return
                  }
                  onSelectAccount(acc.id)
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  hideTooltip()
                  setContextMenu({
                    x: e.clientX,
                    y: Math.min(e.clientY, window.innerHeight - 190),
                    account: acc,
                  })
                }}
                onMouseEnter={(e) =>
                  showTooltip(e.currentTarget, {
                    title: `${safeFirst}${acc.lastName ? ` ${acc.lastName}` : ''}`,
                    subtitle: acc.isBot
                      ? t('account_dock.telegram_bot')
                      : acc.phone || (acc.username ? `@${acc.username}` : `ID: ${acc.id}`),
                    badge: acc.isBot ? 'Bot' : undefined,
                    hotkey: t('account_dock.hotkey_new_window'),
                  })
                }
                onMouseLeave={hideTooltip}
                className={`relative w-12 h-12 rounded-full flex items-center justify-center overflow-hidden transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'ring-2 ring-primary-400 ring-offset-2 ring-offset-dark-900 shadow-glow'
                    : 'hover:opacity-90 border border-white/5'
                }`}
              >
                <Avatar
                  accountId={acc.id}
                  peerId={acc.id}
                  title={safeFirst}
                  initials={initials}
                  avatarUrl={acc.avatarUrl}
                  size="lg"
                  shape="circle"
                  className="w-full h-full rounded-full"
                />
              </button>

              {/* Status dot (Positioned outside the avatar circle!) */}
              <span
                className={`absolute bottom-0 right-0 z-10 w-3.5 h-3.5 rounded-full ring-2 ring-dark-900 pointer-events-none ${
                  acc.status === 'connected'
                    ? 'bg-accent-emerald'
                    : acc.status === 'connecting'
                    ? 'bg-accent-amber animate-pulse'
                    : 'bg-gray-500'
                }`}
              />

              {/* Bot Indicator (Outside the circle, at bottom-left corner with Bot icon) */}
              {acc.isBot && (
                <span className="absolute -bottom-0.5 -left-0.5 z-10 w-4 h-4 rounded-full bg-primary-600 text-white ring-2 ring-dark-900 flex items-center justify-center shadow-md pointer-events-none">
                  <Bot className="w-2.5 h-2.5 text-white" />
                </span>
              )}

              {/* Proxy Indicator (Floating outside the avatar circle at top-left) */}
              {acc.proxyConfig?.enabled && (
                <span className="absolute -top-0.5 -left-0.5 z-10 w-3 h-3 rounded-full bg-accent-cyan ring-2 ring-dark-900 pointer-events-none" />
              )}

              {/* Unread badge per account */}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-accent-rose text-white font-bold text-[10px] rounded-full ring-2 ring-dark-900 flex items-center justify-center shadow-md z-20 animate-in zoom-in duration-150 pointer-events-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          )
        })}

        {/* Add Account Button */}
        <button
          onClick={onOpenAddAccount}
          onMouseEnter={(e) =>
            showTooltip(e.currentTarget, {
              title: t('account_dock.add_account_title'),
              subtitle: t('account_dock.add_account_subtitle'),
            })
          }
          onMouseLeave={hideTooltip}
          className="w-12 h-12 rounded-full border border-dashed border-white/20 hover:border-primary-500 text-gray-400 hover:text-primary-400 flex items-center justify-center transition-colors bg-dark-850/50 hover:bg-primary-500/10 cursor-pointer shrink-0"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="w-8 h-[1px] bg-white/10 my-1"></div>

      {/* Bottom Actions - Space-Saving Ergonomic Hub */}
      <div className="flex flex-col items-center gap-2 pt-2 pb-1 mt-auto">
        {/* Advanced Tools Hub Trigger */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsToolsHubOpen((prev) => !prev)
            hideTooltip()
          }}
          onMouseEnter={(e) => {
            if (!isToolsHubOpen) {
              showTooltip(e.currentTarget, {
                title: t('account_dock.tools_hub_title'),
                subtitle: t('account_dock.tools_hub_subtitle'),
                badge: 'Hub',
              })
            }
          }}
          onMouseLeave={hideTooltip}
          aria-label="Advanced Tools Hub"
          className={`group relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
            isToolsHubOpen
              ? 'bg-gradient-to-tr from-cyan-500/25 via-primary-500/20 to-purple-600/30 border border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.45)] scale-105'
              : 'bg-dark-800/90 hover:bg-dark-750 border border-white/10 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.25)]'
          }`}
        >
          {/* Animated Quantum / Cyber Kinetic SVG Icon */}
          <svg
            viewBox="0 0 28 28"
            className="w-5 h-5 transition-transform duration-500 transform group-hover:scale-110"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="toolsHubGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00F2FE" />
                <stop offset="50%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#818CF8" />
              </linearGradient>
              <linearGradient id="toolsHubGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#C084FC" />
                <stop offset="50%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
              <filter id="toolsHubGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Ambient slow rotating constellation ring */}
            <g className="hub-orbit-anim origin-center">
              {/* Dashed orbit track */}
              <circle
                cx="14"
                cy="14"
                r="9.5"
                stroke="url(#toolsHubGrad1)"
                strokeWidth="1.2"
                strokeDasharray="3.5 2.5"
                className="opacity-50 group-hover:opacity-95 transition-opacity duration-300"
              />

              {/* 4 Kinetic satellite nodes */}
              <circle
                cx="14"
                cy="4.5"
                r="1.75"
                fill="#00F2FE"
                className="transition-transform duration-300 group-hover:scale-125"
                filter="url(#toolsHubGlow)"
              />
              <circle
                cx="23.5"
                cy="14"
                r="1.75"
                fill="#818CF8"
                className="transition-transform duration-300 group-hover:scale-125"
                filter="url(#toolsHubGlow)"
              />
              <circle
                cx="14"
                cy="23.5"
                r="1.75"
                fill="#C084FC"
                className="transition-transform duration-300 group-hover:scale-125"
                filter="url(#toolsHubGlow)"
              />
              <circle
                cx="4.5"
                cy="14"
                r="1.75"
                fill="#38BDF8"
                className="transition-transform duration-300 group-hover:scale-125"
                filter="url(#toolsHubGlow)"
              />
            </g>

            {/* Counter-rotating morphing diamond in center */}
            <g className="transition-transform duration-700 ease-out origin-center group-hover:-rotate-45">
              <rect
                x="9.5"
                y="9.5"
                width="9"
                height="9"
                rx="2"
                transform="rotate(45 14 14)"
                stroke="url(#toolsHubGrad2)"
                strokeWidth="1.4"
                className="opacity-75 group-hover:opacity-100 transition-all duration-300 fill-cyan-500/10 group-hover:fill-purple-500/30"
              />
            </g>

            {/* Center glowing quantum core */}
            <circle
              cx="14"
              cy="14"
              r="2.2"
              fill="url(#toolsHubGrad1)"
              className="hub-glow-anim transition-transform duration-300 group-hover:scale-135 origin-center"
              filter="url(#toolsHubGlow)"
            />
            <circle
              cx="14"
              cy="14"
              r="1"
              fill="#FFFFFF"
              className="transition-transform duration-200 group-hover:scale-125 origin-center"
            />
          </svg>
        </button>

        {/* Quick Settings Button */}
        <button
          onClick={onOpenSettings}
          onMouseEnter={(e) =>
            showTooltip(e.currentTarget, {
              title: t('account_dock.settings_title'),
              subtitle: t('account_dock.settings_subtitle'),
            })
          }
          onMouseLeave={hideTooltip}
          className="w-10 h-10 rounded-xl bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-750 flex items-center justify-center transition-colors cursor-pointer group"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
        </button>
      </div>

      {/* Tools Hub Flyout Menu */}
      {isToolsHubOpen && (
        <div
          style={{ left: '80px', bottom: '16px' }}
          className="fixed z-[999] min-w-[275px] max-w-[315px] bg-dark-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-white/10 mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-xs font-bold text-gray-100">{t('account_dock.tools_hub_header')}</span>
            </div>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary-500/20 text-cyan-300 border border-primary-500/30">
              HUB
            </span>
          </div>

          {/* Item 1: MCP AI Hub */}
          <button
            type="button"
            onClick={() => {
              onOpenMcpHub?.()
              setIsToolsHubOpen(false)
            }}
            className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white/10 transition-colors text-right group cursor-pointer border border-transparent hover:border-cyan-500/30"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 group-hover:text-white transition-all shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-200 group-hover:text-cyan-300 transition-colors">
                  {t('account_dock.mcp_hub_title')}
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                  AI
                </span>
              </div>
              <div className="text-[10px] text-gray-400 truncate">
                {t('account_dock.mcp_hub_desc')}
              </div>
            </div>
          </button>

          {/* Item 2: Proxy */}
          <button
            type="button"
            onClick={() => {
              onOpenProxyModal()
              setIsToolsHubOpen(false)
            }}
            className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white/10 transition-colors text-right group cursor-pointer border border-transparent hover:border-emerald-500/30"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 group-hover:text-white transition-all shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-200 group-hover:text-emerald-300 transition-colors">
                  {t('account_dock.proxy_settings_title')}
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                  MTProto
                </span>
              </div>
              <div className="text-[10px] text-gray-400 truncate">
                {t('account_dock.proxy_settings_desc')}
              </div>
            </div>
          </button>

          {/* Item 3: TON Wallet */}
          {onOpenTonWallet && (
            <button
              type="button"
              onClick={() => {
                onOpenTonWallet()
                setIsToolsHubOpen(false)
              }}
              className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white/10 transition-colors text-right group cursor-pointer border border-transparent hover:border-[#00c2ff]/30"
            >
              <div className="w-9 h-9 rounded-xl bg-[#0098ea]/15 border border-[#00c2ff]/30 flex items-center justify-center text-[#00c2ff] group-hover:scale-105 group-hover:text-white transition-all shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-200 group-hover:text-[#00c2ff] transition-colors">
                    {t('account_dock.ton_wallet_title')}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#0098ea]/20 text-[#00c2ff]">
                    Web3
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 truncate">
                  {t('account_dock.ton_wallet_desc')}
                </div>
              </div>
            </button>
          )}

          {/* Item 4: Air-Gap Mobile Export */}
          {onOpenAccountExport && (
            <button
              type="button"
              onClick={() => {
                onOpenAccountExport()
                setIsToolsHubOpen(false)
              }}
              className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white/10 transition-colors text-right group cursor-pointer border border-transparent hover:border-cyan-500/30"
            >
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 group-hover:text-white transition-all shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-200 group-hover:text-cyan-300 transition-colors">
                    {t('account_dock.airgap_export_title')}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                    Air-Gap
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 truncate">
                  {t('account_dock.airgap_export_desc')}
                </div>
              </div>
            </button>
          )}

          {/* Divider & Settings inside Hub */}
          <div className="border-t border-white/5 my-0.5" />
          <button
            type="button"
            onClick={() => {
              onOpenSettings()
              setIsToolsHubOpen(false)
            }}
            className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white/10 transition-colors text-right group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:rotate-45 transition-all shrink-0">
              <Settings className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors">
                {t('account_dock.settings_title')}
              </span>
              <div className="text-[10px] text-gray-500 truncate">
                {t('account_dock.settings_subtitle')}
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Floating In-DOM Tooltip (Zero Native Win32 Z-Order Glitches) */}
      {hoveredTooltip && !contextMenu && (
        <div
          style={{ top: `${hoveredTooltip.y}px`, left: '80px' }}
          className="fixed z-[998] -translate-y-1/2 pointer-events-none px-3 py-2 rounded-xl bg-dark-900/95 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col gap-0.5 min-w-[150px] max-w-[280px] animate-in fade-in zoom-in-95 duration-100 select-none"
        >
          <div className="flex items-center gap-2 justify-between">
            <span className="text-xs font-bold text-gray-100 truncate">{hoveredTooltip.title}</span>
            {hoveredTooltip.badge && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-primary-600/80 text-white rounded">
                {hoveredTooltip.badge}
              </span>
            )}
          </div>
          {hoveredTooltip.subtitle && (
            <span className="text-[11px] text-gray-400 font-mono truncate">{hoveredTooltip.subtitle}</span>
          )}
          {hoveredTooltip.hotkey && (
            <div className="text-[10px] text-accent-cyan/90 border-t border-white/5 pt-1 mt-0.5 flex items-center gap-1">
              <span>💡</span>
              <span>{hoveredTooltip.hotkey}</span>
            </div>
          )}
        </div>
      )}

      {/* Account Right-Click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x + 12}px` }}
          className="fixed z-[999] min-w-[210px] bg-dark-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-white/5 mb-1">
            <div className="text-xs font-bold text-gray-200 truncate">
              {contextMenu.account.firstName} {contextMenu.account.lastName || ''}
            </div>
            <div className="text-[10px] text-gray-400 font-mono truncate">
              {contextMenu.account.isBot ? t('account_dock.telegram_bot') : contextMenu.account.phone || contextMenu.account.id}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              window.guidegram?.openAccountWindow?.(contextMenu.account.id)
              setContextMenu(null)
            }}
            className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer text-left"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-accent-cyan" />
              <span>{t('account_dock.open_new_window')}</span>
            </span>
            <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
              Ctrl+Click
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectAccount(contextMenu.account.id)
              setContextMenu(null)
            }}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer text-left"
          >
            <Check className="w-3.5 h-3.5 text-accent-emerald" />
            <span>{t('account_dock.switch_account')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(contextMenu.account.id)
              setCopiedId(true)
              setTimeout(() => {
                setContextMenu(null)
                setCopiedId(false)
              }, 600)
            }}
            className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer text-left"
          >
            <span className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-gray-400" />
              <span>{t('account_dock.copy_id')}</span>
            </span>
            {copiedId && (
              <span className="text-[10px] text-accent-emerald font-bold animate-in fade-in">
                {t('account_dock.copied')}
              </span>
            )}
          </button>

          {contextMenu.account.proxyConfig && (
            <button
              type="button"
              onClick={() => {
                onOpenProxyModal()
                setContextMenu(null)
              }}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer text-left border-t border-white/5 mt-0.5 pt-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-accent-amber" />
              <span>{t('account_dock.proxy_settings')}</span>
            </button>
          )}
        </div>
      )}
    </aside>
  )
}
