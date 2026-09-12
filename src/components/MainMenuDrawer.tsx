import React, { useState } from 'react'
import {
  Archive,
  User,
  Users,
  Megaphone,
  Phone,
  Bookmark,
  Settings,
  Moon,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Check,
  ShieldCheck,
  Radio,
  Gift,
  Laptop,
} from 'lucide-react'
import { AccountInfo } from '../types/telegram'
import { Avatar } from './Avatar'
import { StarGiftsModal } from './StarGiftsModal'
import { ActiveSessionsModal } from './ActiveSessionsModal'
import { useI18n } from '../i18n'
import logoImg from '../assets/logo.png'

interface MainMenuDrawerProps {
  isOpen: boolean
  onClose: () => void
  accounts: AccountInfo[]
  activeAccount: AccountInfo | null
  onSelectAccount: (accountId: string) => void
  onOpenAddAccount: () => void
  onOpenSettings: () => void
  onOpenProxyModal: () => void
  onOpenSavedMessages: () => void
  onOpenProfile: () => void
  onOpenArchivedChats?: () => void
  onOpenNewGroup?: () => void
  onOpenNewChannel?: () => void
  onOpenContacts?: () => void
  onOpenCalls?: () => void
  archivedUnreadCount?: number
  unreadCountsByAccount?: Record<string, number>
  isNightMode?: boolean
  onToggleNightMode?: () => void
  ghostMode?: boolean
  onToggleGhostMode?: () => void
}

export const MainMenuDrawer: React.FC<MainMenuDrawerProps> = ({
  isOpen,
  onClose,
  accounts,
  activeAccount,
  onSelectAccount,
  onOpenAddAccount,
  onOpenSettings,
  onOpenProxyModal,
  onOpenSavedMessages,
  onOpenProfile,
  onOpenArchivedChats,
  onOpenNewGroup,
  onOpenNewChannel,
  onOpenContacts,
  onOpenCalls,
  archivedUnreadCount = 0,
  unreadCountsByAccount = {},
  isNightMode = true,
  onToggleNightMode,
  ghostMode = false,
  onToggleGhostMode,
}) => {
  const { t, isRTL, formatNumber } = useI18n()
  const [isAccountsExpanded, setIsAccountsExpanded] = useState(true)
  const [isStarGiftsOpen, setIsStarGiftsOpen] = useState(false)
  const [isActiveSessionsOpen, setIsActiveSessionsOpen] = useState(false)

  if (!isOpen) return null

  const formatBadge = (num?: number): string => {
    if (!num || num <= 0) return ''
    if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`
    return num.toString()
  }

  const fullName = [activeAccount?.firstName, activeAccount?.lastName].filter(Boolean).join(' ') || 'User'

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="fixed inset-0 z-50 flex select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Panel - Official Telegram Desktop Styling */}
      <div className="relative w-72 md:w-80 h-full bg-[#0e1621] border-r border-white/10 shadow-2xl z-10 flex flex-col overflow-hidden animate-in slide-in-from-left duration-200 text-gray-200">
        {/* Profile Card Header */}
        <div className="p-4 bg-[#17212b] border-b border-white/5 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {activeAccount ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <Avatar
                  accountId={activeAccount.id}
                  peerId={activeAccount.id}
                  title={fullName}
                  initials={fullName.charAt(0)}
                  avatarUrl={activeAccount.avatarUrl}
                  size="lg"
                  className="ring-2 ring-accent-cyan/40"
                />
              </div>

              <div className="flex items-center justify-between mt-1">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                    <span>{fullName}</span>
                    {activeAccount.isPremium && (
                      <Sparkles className="w-3.5 h-3.5 text-accent-cyan fill-accent-cyan shrink-0" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      onOpenProfile()
                    }}
                    className="text-xs text-accent-cyan hover:underline truncate mt-0.5 cursor-pointer block text-left"
                  >
                    Set Emoji Status
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAccountsExpanded(!isAccountsExpanded)}
                  className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  title="Switch accounts"
                >
                  {isAccountsExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-300" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-300" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 pr-8 py-1">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-glow flex items-center justify-center border border-accent-cyan/30 bg-dark-900/80 shrink-0">
                <img src={logoImg} alt="Guidegram Logo" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex flex-col">
                <div className="text-sm font-bold text-white tracking-wide truncate flex items-center gap-1.5">
                  <span>Guidegram</span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.2 bg-primary-600/20 text-primary-300 border border-primary-500/30 rounded">
                    Portable
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 font-medium mt-0.5">
                  No account connected
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Account Switcher List (Only when accounts exist and switcher is expanded) */}
        {activeAccount && isAccountsExpanded && accounts.length > 0 && (
          <div className="bg-[#17212b] border-b border-white/5 p-2 space-y-1 animate-in fade-in duration-150">
            {accounts.map((acc) => {
              const isActive = acc.id === activeAccount?.id
              const accName = [acc.firstName, acc.lastName].filter(Boolean).join(' ') || 'Account'
              const badgeCount = unreadCountsByAccount[acc.id] ?? acc.unreadTotal ?? 0
              const badgeStr = formatBadge(badgeCount)

              return (
                <div
                  key={acc.id}
                  onClick={() => {
                    onSelectAccount(acc.id)
                  }}
                  className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                    isActive ? 'bg-primary-600/20 text-white' : 'hover:bg-white/5 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      accountId={acc.id}
                      peerId={acc.id}
                      title={accName}
                      initials={accName.charAt(0)}
                      avatarUrl={acc.avatarUrl}
                      size="sm"
                    />
                    <div className="text-xs font-semibold truncate flex items-center gap-1">
                      <span>{accName}</span>
                      {acc.isPremium && (
                        <Sparkles className="w-3 h-3 text-accent-cyan fill-accent-cyan shrink-0" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {badgeStr && (
                      <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-bold font-mono">
                        {badgeStr}
                      </span>
                    )}
                    {isActive && <Check className="w-4 h-4 text-primary-400" />}
                  </div>
                </div>
              )
            })}

            {/* Add Account Row */}
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenAddAccount()
              }}
              className="w-full p-2 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white flex items-center gap-3 text-xs font-semibold transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-white/10 text-gray-300 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <span>{t('app.add_account')}</span>
            </button>
          </div>
        )}

        {/* Navigation Menu Options */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
          {activeAccount ? (
            <>
              {/* Archived chats */}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenArchivedChats?.()
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <Archive className="w-4 h-4 text-gray-400" />
                  <span>{t('app.archived_chats')}</span>
                </div>
                {archivedUnreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-bold font-mono">
                    {formatNumber(archivedUnreadCount)}
                  </span>
                )}
              </button>

              {/* My Profile */}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenProfile()
                }}
                className="w-full flex items-center gap-4 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer"
              >
                <User className="w-4 h-4 text-gray-400" />
                <span>{t('app.my_profile')}</span>
              </button>

              <div className="my-1 border-t border-white/5" />

              {/* New Group */}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenNewGroup?.()
                }}
                className="w-full flex items-center gap-4 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer"
              >
                <Users className="w-4 h-4 text-gray-400" />
                <span>{t('app.new_group')}</span>
              </button>

              {/* New Channel */}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenNewChannel?.()
                }}
                className="w-full flex items-center gap-4 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer"
              >
                <Megaphone className="w-4 h-4 text-gray-400" />
                <span>{t('app.new_channel')}</span>
              </button>

              {/* Contacts */}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenContacts?.()
                }}
                className="w-full flex items-center gap-4 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer"
              >
                <User className="w-4 h-4 text-gray-400" />
                <span>{t('app.contacts')}</span>
              </button>

              {/* Calls */}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenCalls?.()
                }}
                className="w-full flex items-center gap-4 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer"
              >
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{t('app.calls')}</span>
              </button>

              {/* Saved Messages */}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenSavedMessages()
                }}
                className="w-full flex items-center gap-4 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer"
              >
                <Bookmark className="w-4 h-4 text-gray-400" />
                <span>{t('app.saved_messages')}</span>
              </button>

              {/* Star Gifts Shelf */}
              <button
                type="button"
                onClick={() => setIsStarGiftsOpen(true)}
                className="w-full flex items-center gap-4 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer"
              >
                <Gift className="w-4 h-4 text-purple-400" />
                <span>{t('menu.star_gifts')}</span>
              </button>

              {/* Settings */}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenSettings()
                }}
                className="w-full flex items-center gap-4 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer"
              >
                <Settings className="w-4 h-4 text-gray-400" />
                <span>{t('app.settings')}</span>
              </button>

              {/* Devices & Sessions */}
              <button
                type="button"
                onClick={() => setIsActiveSessionsOpen(true)}
                className="w-full flex items-center gap-4 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer"
              >
                <Laptop className="w-4 h-4 text-emerald-400" />
                <span>{t('menu.devices')}</span>
              </button>

              {/* Proxy Settings */}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenProxyModal()
                }}
                className="w-full flex items-center gap-4 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-gray-400" />
                <span>{t('menu.proxy')}</span>
              </button>

              {/* Ghost Mode Toggle */}
              {onToggleGhostMode && (
                <button
                  type="button"
                  onClick={onToggleGhostMode}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <Radio className={`w-4 h-4 ${ghostMode ? 'text-accent-emerald' : 'text-gray-400'}`} />
                    <span>{t('app.ghost_mode')}</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${ghostMode ? 'bg-accent-emerald animate-pulse' : 'bg-gray-600'}`} />
                </button>
              )}
            </>
          ) : (
            <>
              {/* Logged Out / Guest Options */}
              <div className="p-1 mb-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onOpenAddAccount()
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary-600/30 to-accent-cyan/20 border border-primary-500/30 hover:border-primary-500/50 hover:bg-primary-600/40 text-white transition-all cursor-pointer shadow-sm group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-500/20 text-accent-cyan flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-xs font-bold text-gray-100">{t('menu.connect_account')}</span>
                    <span className="text-[10px] text-gray-400 truncate">{t('menu.connect_account_sub')}</span>
                  </div>
                </button>
              </div>

              {/* Proxy Settings */}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenProxyModal()
                }}
                className="w-full flex items-center gap-4 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-accent-cyan" />
                <span>{t('menu.proxy')}</span>
              </button>

              {/* Settings */}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenSettings()
                }}
                className="w-full flex items-center gap-4 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer"
              >
                <Settings className="w-4 h-4 text-gray-400" />
                <span>{t('app.settings')}</span>
              </button>
            </>
          )}

          <div className="my-1 border-t border-white/5" />

          {/* Night Mode Toggle */}
          <div
            onClick={onToggleNightMode}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <Moon className="w-4 h-4 text-gray-400" />
              <span>{t('app.night_mode')}</span>
            </div>
            <div
              className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                isNightMode ? 'bg-teal-500 justify-end' : 'bg-dark-950 justify-start border border-white/10'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-3 bg-[#17212b] border-t border-white/5 flex items-center justify-between text-[11px] text-gray-500">
          <div>Guidegram Desktop</div>
          <div className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">Portable</div>
        </div>
      </div>

      {activeAccount && (
        <>
          <StarGiftsModal
            isOpen={isStarGiftsOpen}
            onClose={() => setIsStarGiftsOpen(false)}
            accountId={activeAccount.id}
          />

          <ActiveSessionsModal
            isOpen={isActiveSessionsOpen}
            onClose={() => setIsActiveSessionsOpen(false)}
            accountId={activeAccount.id}
          />
        </>
      )}
    </div>
  )
}
