import React from 'react'
import { Plus, Shield, Inbox, Settings, Bot } from 'lucide-react'
import { AccountInfo } from '../types/telegram'
import { Avatar } from './Avatar'

interface AccountDockProps {
  accounts: AccountInfo[]
  activeAccountId: string | null
  isUnifiedInboxOpen: boolean
  onSelectAccount: (accountId: string) => void
  onOpenAddAccount: () => void
  onToggleUnifiedInbox: () => void
  onOpenProxyModal: () => void
  onOpenSettings: () => void
  onOpenMcpHub?: () => void
  onOpenSavedMessages?: () => void
  isSavedMessagesActive?: boolean
}

export const AccountDock: React.FC<AccountDockProps> = ({
  accounts,
  activeAccountId,
  isUnifiedInboxOpen,
  onSelectAccount,
  onOpenAddAccount,
  onToggleUnifiedInbox,
  onOpenProxyModal,
  onOpenSettings,
  onOpenMcpHub,
  onOpenSavedMessages,
  isSavedMessagesActive = false,
}) => {
  return (
    <aside className="w-[72px] shrink-0 h-full bg-dark-900 border-r border-white/5 flex flex-col items-center py-3 select-none z-20 titlebar-no-drag">
      {/* Saved Messages Quick Access Button */}
      <button
        type="button"
        onClick={onOpenSavedMessages}
        title="Saved Messages (پیام‌های ذخیره‌شده)"
        aria-label="Saved Messages"
        className={`group relative w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 ${
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
        className={`relative w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-all cursor-pointer ${
          isUnifiedInboxOpen
            ? 'bg-primary-600 text-white shadow-glow'
            : 'bg-dark-800/80 text-gray-400 hover:text-white hover:bg-dark-750'
        }`}
      >
        <Inbox className="w-5 h-5" />
        {/* Total Unread across all accounts badge */}
        {accounts.reduce((acc, a) => acc + (a.unreadTotal || 0), 0) > 0 && (
          <span className="absolute -top-1 -right-1 bg-accent-rose text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-dark-900">
            {accounts.reduce((acc, a) => acc + (a.unreadTotal || 0), 0)}
          </span>
        )}
      </button>

      <div className="w-8 h-[1px] bg-white/10 my-1"></div>

      {/* Account List (Scrollable for 100+ accounts!) */}
      <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center gap-3 py-2 px-1">
        {accounts.map((acc) => {
          const isActive = !isUnifiedInboxOpen && acc.id === activeAccountId
          const safeFirst = acc.firstName || 'User'
          const initials = `${safeFirst.charAt(0)}${acc.lastName ? acc.lastName.charAt(0) : ''}`

          return (
            <div key={acc.id} className="relative group">
              <button
                onClick={() => onSelectAccount(acc.id)}
                title={`${safeFirst} (${acc.isBot ? 'Bot' : acc.phone || 'No phone'})`}
                className={`relative w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-200 cursor-pointer ${
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
                  className="w-full h-full rounded-2xl"
                />

                {/* Status dot */}
                <span
                  className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full ring-2 ring-dark-900 ${
                    acc.status === 'connected'
                      ? 'bg-accent-emerald'
                      : acc.status === 'connecting'
                      ? 'bg-accent-amber animate-pulse'
                      : 'bg-gray-500'
                  }`}
                />

                {/* Bot Indicator */}
                {acc.isBot && (
                  <span
                    title="Bot Account"
                    className="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-primary-600 text-white ring-1 ring-dark-900 flex items-center justify-center text-[9px] leading-none select-none"
                  >
                    🤖
                  </span>
                )}

                {/* Proxy Indicator */}
                {acc.proxyConfig?.enabled && (
                  <span
                    title={`Proxy: ${acc.proxyConfig.type.toUpperCase()} (${acc.proxyConfig.host})`}
                    className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-accent-cyan ring-1 ring-dark-900"
                  />
                )}
              </button>

              {/* Unread badge per account */}
              {acc.unreadTotal > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent-cyan text-dark-950 font-black text-[10px] px-1.5 py-0.2 rounded-full ring-2 ring-dark-900">
                  {acc.unreadTotal}
                </span>
              )}
            </div>
          )
        })}

        {/* Add Account Button */}
        <button
          onClick={onOpenAddAccount}
          title="Add New Account (No limit!)"
          className="w-12 h-12 rounded-2xl border border-dashed border-white/20 hover:border-primary-500 text-gray-400 hover:text-primary-400 flex items-center justify-center transition-colors bg-dark-850/50 hover:bg-primary-500/10 cursor-pointer shrink-0"
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
          onClick={onOpenSettings}
          title="Settings & Portable Config"
          className="w-10 h-10 rounded-xl bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-750 flex items-center justify-center transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  )
}
