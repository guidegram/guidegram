import React, { useState, useEffect } from 'react'
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
  Heart,
  Link2,
  Loader2,
  Bot,
  History,
  Smartphone,
  Wallet,
} from 'lucide-react'
import { AccountInfo } from '../types/telegram'
import { Avatar } from './Avatar'
import { StarGiftsModal } from './StarGiftsModal'
import { ActiveSessionsModal } from './ActiveSessionsModal'
import { EmojiStatusModal } from './EmojiStatusModal'
import { useI18n } from '../i18n'
import { motion, AnimatePresence } from 'motion/react'
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
  onOpenMcpHub?: () => void
  onOpenSupport?: () => void
  onOpenArchivedChats?: () => void
  onOpenNewGroup?: () => void
  onOpenNewChannel?: () => void
  onOpenContacts?: () => void
  onOpenContactChanges?: () => void
  onOpenCalls?: () => void
  onJoinedChat?: (chatId: string) => void
  archivedUnreadCount?: number
  unreadCountsByAccount?: Record<string, number>
  isNightMode?: boolean
  onToggleNightMode?: () => void
  ghostMode?: boolean
  onToggleGhostMode?: () => void
  onOpenAccountExport?: () => void
  onOpenTonWallet?: () => void
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
  onOpenMcpHub,
  onOpenSupport,
  onOpenArchivedChats,
  onOpenNewGroup,
  onOpenNewChannel,
  onOpenContacts,
  onOpenContactChanges,
  onOpenCalls,
  onJoinedChat,
  archivedUnreadCount = 0,
  unreadCountsByAccount = {},
  isNightMode = true,
  onToggleNightMode,
  ghostMode = false,
  onToggleGhostMode,
  onOpenAccountExport,
  onOpenTonWallet,
}) => {
  const { t, isRTL, formatNumber } = useI18n()
  const [isAccountsExpanded, setIsAccountsExpanded] = useState(true)
  const [isStarGiftsOpen, setIsStarGiftsOpen] = useState(false)
  const [isActiveSessionsOpen, setIsActiveSessionsOpen] = useState(false)
  const [isEmojiStatusOpen, setIsEmojiStatusOpen] = useState(false)
  const [isJoinOpen, setIsJoinOpen] = useState(false)
  const [joinLink, setJoinLink] = useState('')
  const [joinStatus, setJoinStatus] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [appVersion, setAppVersion] = useState<string>('2.1.0')
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<string | null>(null)

  useEffect(() => {
    window.guidegram?.getAppVersion?.().then((v) => {
      if (v) setAppVersion(v)
    })
  }, [])

  if (!isOpen) return null

  const handleJoinByLink = async () => {
    if (!activeAccount || !joinLink.trim() || isJoining) return
    setIsJoining(true)
    setJoinStatus(null)
    try {
      const result = await window.guidegram.joinChatInvite(
        activeAccount.id,
        joinLink.trim()
      )
      if (result.status === 'ok') {
        setJoinStatus('Joined successfully. Opening chat…')
        setJoinLink('')
        if (result.chatId) onJoinedChat?.(result.chatId)
        setTimeout(() => {
          setIsJoinOpen(false)
          onClose()
        }, 600)
      } else if (result.status === 'request_sent') {
        setJoinStatus('Join request sent. An admin must approve it.')
      } else {
        setJoinStatus('This invite requires approval in the official Telegram app.')
      }
    } catch (err: any) {
      setJoinStatus(`Failed to join: ${err?.message || err}`)
    } finally {
      setIsJoining(false)
    }
  }

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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs select-none"
        onClick={onClose}
      />

      {/* Drawer Panel - Spring Slide Physics & Drag-to-Dismiss */}
      <motion.div
        drag="x"
        dragConstraints={{ left: isRTL ? 0 : -320, right: isRTL ? 320 : 0 }}
        dragElastic={{ left: isRTL ? 0.05 : 0.6, right: isRTL ? 0.6 : 0.05 }}
        onDragEnd={(_, info) => {
          const threshold = isRTL
            ? (info.offset.x > 80 || info.velocity.x > 400)
            : (info.offset.x < -80 || info.velocity.x < -400)
          if (threshold) {
            onClose()
          }
        }}
        initial={{ x: isRTL ? 320 : -320 }}
        animate={{ x: 0 }}
        exit={{ x: isRTL ? 320 : -320 }}
        transition={{ type: 'spring', damping: 26, stiffness: 400, mass: 0.8 }}
        className="drawer-pan-rail relative w-72 md:w-80 h-full bg-[#0e1621] border-r border-white/10 shadow-2xl z-10 flex flex-col overflow-hidden text-gray-200"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Profile Card Header */}
        <div
          className="p-4 bg-[#17212b] border-b border-white/5 relative"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
          }}
        >
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
                  key={activeAccount.id}
                  accountId={activeAccount.id}
                  peerId={activeAccount.id}
                  title={fullName}
                  initials={fullName.charAt(0)}
                  avatarUrl={activeAccount.avatarUrl}
                  size="lg"
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
                    title="Set Emoji Status"
                    onClick={() => setIsEmojiStatusOpen(true)}
                    className="text-xs text-accent-cyan hover:underline truncate mt-0.5 cursor-pointer block text-left"
                  >
                    {t('emoji.set')}
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
          <div className="bg-[#17212b] border-b border-white/5 p-2 space-y-1 animate-in fade-in duration-150 max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 shrink-0">
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
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10 drawer-overscroll-elastic">
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

              {/* Join by Invite Link */}
              <button
                type="button"
                onClick={() => {
                  setJoinStatus(null)
                  setIsJoinOpen(true)
                }}
                className="w-full flex items-center gap-4 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer"
              >
                <Link2 className="w-4 h-4 text-gray-400" />
                <span>Join by Link</span>
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

              {/* Contact Changes Timeline */}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenContactChanges?.()
                }}
                className="w-full flex items-center gap-4 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer group"
              >
                <History className="w-4 h-4 text-accent-cyan group-hover:rotate-[-20deg] transition-transform" />
                <div className="flex items-center justify-between flex-1">
                  <span>{t('menu.contact_changes')}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/20 font-bold">NEW</span>
                </div>
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

              {/* Account Export / Transfer */}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenAccountExport?.()
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <Smartphone className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>{t('menu.transfer_backup')}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 font-bold">QR</span>
              </button>

              {/* TON Blockchain & Wallet (wallet/ and gram/ parity) */}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenTonWallet?.()
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <Wallet className="w-4 h-4 text-[#00c2ff] group-hover:scale-110 transition-transform" />
                  <span>{t('menu.ton_wallet')}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#0098ea]/15 text-[#00c2ff] border border-[#0098ea]/30 font-bold">TON</span>
              </button>

              {/* AI & Telegram MCP Hub */}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenMcpHub?.()
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <Bot className="w-4 h-4 text-accent-cyan group-hover:scale-110 transition-transform" />
                  <span>{t('menu.mcp_hub')}</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-300 border border-primary-500/30">
                  MCP
                </span>
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

              {/* Account Export to Mobile */}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenAccountExport?.()
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <Smartphone className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span>{t('menu.transfer_mobile')}</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  QR Sync
                </span>
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

              {/* Support Guidegram */}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenSupport?.()
                }}
                className="w-full flex items-center gap-4 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer group"
              >
                <Heart className="w-4 h-4 text-pink-400 fill-pink-400/20 group-hover:fill-pink-400/50 transition-all group-hover:scale-110" />
                <span className="text-pink-300/90 group-hover:text-pink-300 font-semibold">{t('menu.support_guidegram')}</span>
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

              {/* Support Guidegram (Guest) */}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenSupport?.()
                }}
                className="w-full flex items-center gap-4 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-gray-200 hover:text-white transition-colors text-xs font-medium cursor-pointer group"
              >
                <Heart className="w-4 h-4 text-pink-400 fill-pink-400/20 group-hover:fill-pink-400/50 transition-all group-hover:scale-110" />
                <span className="text-pink-300/90 group-hover:text-pink-300 font-semibold">{t('menu.support_guidegram')}</span>
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

        {/* Drawer Footer with Version Click-to-Check */}
        <div
          onClick={async () => {
            if (checkingUpdate) return
            setCheckingUpdate(true)
            try {
              const res = await window.guidegram?.checkForUpdates?.()
              if (res && res.hasUpdate) {
                setUpdateStatus(`v${res.latestVersion} available!`)
              } else {
                setUpdateStatus('Up to date')
              }
            } catch (_) {
              setUpdateStatus('Check failed')
            } finally {
              setCheckingUpdate(false)
              setTimeout(() => setUpdateStatus(null), 4000)
            }
          }}
          title="Click to check for software updates"
          className="p-3 bg-[#17212b] border-t border-white/5 flex items-center justify-between text-[11px] text-gray-500 hover:bg-white/5 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <span className="group-hover:text-gray-300 transition-colors">Guidegram Desktop</span>
            {checkingUpdate && <Loader2 className="w-3 h-3 text-primary-400 animate-spin" />}
            {updateStatus && (
              <span className="text-[10px] text-emerald-400 font-semibold">{updateStatus}</span>
            )}
          </div>
          <div className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400 group-hover:text-primary-300 group-hover:bg-primary-500/15 border border-transparent group-hover:border-primary-500/30 transition-all">
            v{appVersion}
          </div>
        </div>
      </motion.div>

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

          <EmojiStatusModal
            isOpen={isEmojiStatusOpen}
            onClose={() => setIsEmojiStatusOpen(false)}
            accountId={activeAccount.id}
            isPremium={activeAccount.isPremium}
          />

          {isJoinOpen && (
            <div
              dir={isRTL ? 'rtl' : 'ltr'}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
              onClick={() => !isJoining && setIsJoinOpen(false)}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleJoinByLink()
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl bg-[#17212b] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
              >
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-accent-cyan/15 text-accent-cyan flex items-center justify-center">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Join by Link</div>
                      <div className="text-[11px] text-gray-400">
                        Paste a t.me invite link or @username
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isJoining}
                    onClick={() => setIsJoinOpen(false)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-3">
                  <input
                    autoFocus
                    value={joinLink}
                    onChange={(e) => setJoinLink(e.target.value)}
                    placeholder="https://t.me/+AbCdEfGhIjK or @channel"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1621] border border-white/10 focus:border-accent-cyan/60 focus:outline-none text-xs text-gray-100 placeholder:text-gray-500 font-mono"
                  />

                  {joinStatus && (
                    <div
                      className={`text-[11px] leading-relaxed px-3 py-2 rounded-xl border ${
                        joinStatus.startsWith('Failed')
                          ? 'bg-accent-rose/10 border-accent-rose/25 text-accent-rose'
                          : 'bg-accent-cyan/10 border-accent-cyan/25 text-accent-cyan'
                      }`}
                    >
                      {joinStatus}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!joinLink.trim() || isJoining}
                    className="w-full py-2.5 rounded-xl bg-accent-cyan/20 hover:bg-accent-cyan/30 border border-accent-cyan/30 text-accent-cyan text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Joining…</span>
                      </>
                    ) : (
                      <>
                        <Link2 className="w-4 h-4" />
                        <span>Join Chat</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  )
}
