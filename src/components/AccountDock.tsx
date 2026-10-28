import React, { useState, useEffect } from 'react'
import { Plus, Shield, Inbox, Settings, Bot, Smartphone, Wallet, ExternalLink, Copy, Check } from 'lucide-react'
import { AccountInfo } from '../types/telegram'
import { Avatar } from './Avatar'

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
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    account: AccountInfo
  } | null>(null)
  const [copiedId, setCopiedId] = useState(false)

  useEffect(() => {
    const handleClose = () => {
      setContextMenu(null)
      setCopiedId(false)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null)
        setCopiedId(false)
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
        title="Saved Messages (پیام‌های ذخیره‌شده)"
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
        title="Unified Inbox (All Accounts)"
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
                  setContextMenu({
                    x: e.clientX,
                    y: Math.min(e.clientY, window.innerHeight - 190),
                    account: acc,
                  })
                }}
                title={`${safeFirst} (${acc.isBot ? 'Bot' : acc.phone || 'No phone'})\n• کلیک: سوییچ به اکانت\n• Ctrl + کلیک: باز کردن در پنجره جدید`}
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
                <span
                  title="Bot Account"
                  className="absolute -bottom-0.5 -left-0.5 z-10 w-4 h-4 rounded-full bg-primary-600 text-white ring-2 ring-dark-900 flex items-center justify-center shadow-md pointer-events-none"
                >
                  <Bot className="w-2.5 h-2.5 text-white" />
                </span>
              )}

              {/* Proxy Indicator (Floating outside the avatar circle at top-left) */}
              {acc.proxyConfig?.enabled && (
                <span
                  title={`Proxy: ${(acc.proxyConfig.type || 'SOCKS5').toUpperCase()} (${acc.proxyConfig.host})`}
                  className="absolute -top-0.5 -left-0.5 z-10 w-3 h-3 rounded-full bg-accent-cyan ring-2 ring-dark-900 pointer-events-none"
                />
              )}

              {/* Unread badge per account */}
              {unreadCount > 0 && (
                <span
                  title={`${unreadCount} unread messages`}
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-accent-rose text-white font-bold text-[10px] rounded-full ring-2 ring-dark-900 flex items-center justify-center shadow-md z-20 animate-in zoom-in duration-150 pointer-events-none"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          )
        })}

        {/* Add Account Button */}
        <button
          onClick={onOpenAddAccount}
          title="Add New Account (No limit!)"
          className="w-12 h-12 rounded-full border border-dashed border-white/20 hover:border-primary-500 text-gray-400 hover:text-primary-400 flex items-center justify-center transition-colors bg-dark-850/50 hover:bg-primary-500/10 cursor-pointer shrink-0"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="w-8 h-[1px] bg-white/10 my-1"></div>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-2 pt-2">
        <button
          onClick={onOpenMcpHub}
          title="AI & Telegram MCP Assistant Hub (Claude / Cursor)"
          className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600/20 via-accent-cyan/15 to-purple-600/20 border border-primary-500/40 hover:border-accent-cyan text-accent-cyan hover:text-white flex items-center justify-center transition-all cursor-pointer group shadow-glow"
        >
          <Bot className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>

        <button
          onClick={onOpenProxyModal}
          title="Proxy Settings & Latency"
          className="w-10 h-10 rounded-xl bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-750 flex items-center justify-center transition-colors cursor-pointer"
        >
          <Shield className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenAccountExport}
          title="Transfer Accounts to Mobile (Air-Gap QR Sync)"
          className="w-10 h-10 rounded-xl bg-dark-800 text-cyan-400 hover:text-cyan-300 hover:bg-dark-750 flex items-center justify-center transition-colors cursor-pointer group"
        >
          <Smartphone className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>

        {onOpenTonWallet && (
          <button
            onClick={onOpenTonWallet}
            title="TON Blockchain & Wallet (TonConnect 2.0)"
            className="w-10 h-10 rounded-xl bg-dark-800 text-[#00c2ff] hover:text-white hover:bg-[#0098ea]/30 flex items-center justify-center transition-colors cursor-pointer group"
          >
            <Wallet className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        )}

        <button
          onClick={onOpenSettings}
          title="Settings & Portable Config"
          className="w-10 h-10 rounded-xl bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-750 flex items-center justify-center transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

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
              {contextMenu.account.isBot ? 'ربات تلگرام' : contextMenu.account.phone || contextMenu.account.id}
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
              <span>باز کردن در پنجره جدید</span>
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
            <span>سوییچ به این اکانت</span>
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
              <span>کپی شناسه (ID)</span>
            </span>
            {copiedId && (
              <span className="text-[10px] text-accent-emerald font-bold animate-in fade-in">
                کپی شد!
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
              <span>تنظیمات پروکسی</span>
            </button>
          )}
        </div>
      )}
    </aside>
  )
}
