import React, { useState } from 'react'
import { motion } from 'motion/react'
import { Minus, Square, X, Sparkles, Menu, Bell, Lock } from 'lucide-react'
import { AccountInfo } from '../types/telegram'
import { useIsMobile } from '../utils/useIsMobile'
import logoImg from '../assets/logo.png'
import { useI18n } from '../i18n'

interface TitleBarProps {
  activeAccount: AccountInfo | null
  ghostMode: boolean
  onToggleGhostMode?: () => void
  onRequestClose?: () => void
  onToggleMainMenu?: () => void
  onOpenSavedMessages?: () => void
  onOpenMcpHub?: () => void
  onCheckUpdate?: () => void
  isCheckingUpdate?: boolean
  isPasscodeSet?: boolean
  onLockApp?: () => void
  onOpenProxyModal?: () => void
  onOpenNotificationHistory?: () => void
  unreadNotificationsCount?: number
}

export const TitleBar: React.FC<TitleBarProps> = ({
  activeAccount,
  ghostMode,
  isPasscodeSet = false,
  onLockApp,
  onToggleGhostMode,
  onRequestClose,
  onToggleMainMenu,
  onOpenSavedMessages,
  onOpenMcpHub,
  onCheckUpdate,
  isCheckingUpdate = false,
  onOpenProxyModal,
  onOpenNotificationHistory,
  unreadNotificationsCount = 0,
}) => {
  const { t } = useI18n()
  const [isMax, setIsMax] = useState(false)
  const isMobile = useIsMobile(768)

  const handleMinimize = () => {
    window.guidegram?.minimizeWindow?.()
  }

  const handleMaximize = async () => {
    if (window.guidegram?.maximizeWindow) {
      const maxState = await window.guidegram.maximizeWindow()
      setIsMax(maxState)
    }
  }

  const handleClose = () => {
    if (onRequestClose) {
      onRequestClose()
    } else {
      window.guidegram?.closeWindow?.()
    }
  }

  // On mobile without active account (Welcome screen), don't render desktop titlebar at all!
  if (isMobile && !activeAccount) {
    return null
  }

  if (isMobile) {
    return (
      <header
        className="bg-dark-950/95 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-3 select-none z-50 transition-all"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.35rem)',
          paddingBottom: '0.4rem',
        }}
      >
        {/* Left: Mobile Navigation Drawer Trigger & Brand */}
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={onToggleMainMenu}
            title="Open Menu"
            className="p-2 -ml-1 rounded-xl text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </motion.button>

          <div
            onClick={onOpenSavedMessages}
            className="flex items-center gap-2 cursor-pointer active:opacity-80 transition-opacity"
          >
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-primary-400/40 shadow-sm flex items-center justify-center">
              <img src={logoImg} alt="Guidegram" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-100 leading-tight">
                {activeAccount?.firstName || 'Guidegram'}
              </span>
              <button
                type="button"
                onClick={onOpenProxyModal}
                className="text-[10px] text-gray-400 hover:text-accent-cyan leading-tight text-left transition-colors cursor-pointer"
              >
                {activeAccount?.proxyConfig?.enabled ? 'Proxy Protected' : 'Online (Direct)'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Actions on mobile (Ghost mode toggle & MCP) */}
        <div className="flex items-center gap-1.5">
          <motion.button
            whileTap={{ scale: 0.94 }}
            type="button"
            onClick={onToggleGhostMode}
            title={ghostMode ? 'Ghost Mode ON' : 'Ghost Mode OFF'}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-semibold transition-all ${
              ghostMode
                ? 'text-accent-violet bg-accent-violet/20 border-accent-violet/40'
                : 'text-gray-400 bg-white/5 border-white/10'
            }`}
          >
            <Sparkles className={`w-3 h-3 ${ghostMode ? 'text-accent-violet animate-pulse' : 'text-gray-500'}`} />
            <span>{ghostMode ? 'Ghost' : 'Ghost Off'}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.94 }}
            type="button"
            onClick={onOpenMcpHub}
            title="AI & MCP Assistant"
            className="p-1.5 rounded-xl bg-primary-600/20 border border-primary-500/30 text-primary-300 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-accent-cyan" />
          </motion.button>

          {onOpenNotificationHistory && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={onOpenNotificationHistory}
              title={t('title_bar.notification_history')}
              className="relative p-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white cursor-pointer"
            >
              <Bell className="w-4 h-4 text-accent-cyan" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-accent-rose text-[9px] font-bold text-white flex items-center justify-center">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </motion.button>
          )}

          {isPasscodeSet && onLockApp && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={onLockApp}
              title={t('title_bar.lock_now')}
              className="p-2 rounded-xl text-gray-300 hover:text-accent-cyan bg-white/5 cursor-pointer"
            >
              <Lock className="w-4 h-4 text-accent-cyan" />
            </motion.button>
          )}
        </div>
      </header>
    )
  }

  return (
    <header
      onContextMenu={(e) => {
        e.preventDefault()
        window.guidegram?.showTitlebarMenu?.()
      }}
      className="h-10 bg-dark-950 border-b border-white/5 flex items-center justify-between px-3 select-none titlebar-drag z-50"
    >
      {/* Left Brand Badge with Hamburger Menu Trigger and Saved Messages Logo */}
      <div className="flex items-center gap-1.5 titlebar-no-drag">
        {/* Hamburger Menu Trigger */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={onToggleMainMenu}
          title="Open Main Menu"
          className="p-1.5 -ml-1 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Menu className="w-4 h-4" />
        </motion.button>

        {/* G Logo Brand Button -> Directly opens Saved Messages */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={onOpenSavedMessages}
          title="Saved Messages (Cloud Storage)"
          className="flex items-center gap-2 p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-lg overflow-hidden shadow-glow flex items-center justify-center border border-primary-400/40">
            <img src={logoImg} alt="Guidegram Logo" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200" />
          </div>
          <span className="text-xs font-bold text-gray-200 group-hover:text-primary-300 tracking-wide transition-colors">Guidegram</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          disabled={isCheckingUpdate}
          onClick={onCheckUpdate}
          title="Click to check for Guidegram updates (GitHub Releases)"
          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-primary-600/20 hover:bg-primary-600/35 text-primary-300 hover:text-white border border-primary-500/30 hover:border-primary-400/50 rounded-md transition-all cursor-pointer shadow-sm disabled:opacity-50"
        >
          {isCheckingUpdate ? (
            <span className="w-2.5 h-2.5 border border-primary-300 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-2.5 h-2.5 text-primary-400" />
          )}
          <span>v{__APP_VERSION__}</span>
        </motion.button>
        <span className="text-[10px] font-medium px-1.5 py-0.2 bg-white/5 text-gray-400 border border-white/10 rounded-md">
          Portable
        </span>

        {/* Active Account Pill with Live Pulse Beacon */}
        {activeAccount && (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/10 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <button
              type="button"
              onClick={onOpenProxyModal}
              title={
                activeAccount.proxyConfig?.enabled
                  ? t('title_bar.proxy_active', {
                      type: (activeAccount.proxyConfig.type || 'SOCKS5').toUpperCase(),
                      host: activeAccount.proxyConfig.host,
                    })
                  : t('title_bar.direct_connection')
              }
              className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-all cursor-pointer ${
                activeAccount.proxyConfig?.enabled
                  ? 'text-accent-cyan bg-accent-cyan/15 border-accent-cyan/30 hover:bg-accent-cyan/25'
                  : 'text-gray-400 bg-white/5 border-white/10 hover:text-gray-200 hover:bg-white/10'
              }`}
            >
              {activeAccount.proxyConfig?.enabled ? 'Proxy' : 'Direct'}
            </button>
          </div>
        )}
      </div>

      {/* Middle Status / Drag Area - Interactive Ghost Mode Toggle */}
      <div className="flex-1 h-full flex items-center justify-center titlebar-drag">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={onToggleGhostMode}
          title={ghostMode ? 'Ghost Mode is ON (Invisible read/typing). Click to turn OFF' : 'Ghost Mode is OFF. Click to turn ON'}
          className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border titlebar-no-drag transition-all cursor-pointer shadow-sm ${
            ghostMode
              ? 'text-accent-violet bg-accent-violet/15 border-accent-violet/30 hover:bg-accent-violet/25 shadow-accent-violet/20'
              : 'text-gray-400 bg-white/5 border-white/10 hover:text-gray-200 hover:bg-white/10'
          }`}
        >
          <Sparkles className={`w-3 h-3 ${ghostMode ? 'text-accent-violet animate-pulse' : 'text-gray-500'}`} />
          <span>{ghostMode ? 'Ghost Mode Active' : 'Ghost Mode Off'}</span>
        </motion.button>
      </div>

      {/* Right Window Controls */}
      <div className="flex items-center gap-1 titlebar-no-drag">
        {/* Notification History Trigger */}
        {onOpenNotificationHistory && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onOpenNotificationHistory}
            title={t('title_bar.notification_history')}
            className="relative p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer mr-1 titlebar-no-drag"
          >
            <Bell className="w-4 h-4 text-gray-300 hover:text-accent-cyan transition-colors" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-accent-rose text-[9px] font-bold text-white flex items-center justify-center shadow-sm">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </motion.button>
        )}

        {isPasscodeSet && onLockApp && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onLockApp}
            title={t('title_bar.lock_now')}
            className="p-1.5 rounded-xl text-gray-400 hover:text-accent-cyan hover:bg-white/10 transition-colors cursor-pointer mr-1 titlebar-no-drag"
          >
            <Lock className="w-4 h-4 text-accent-cyan" />
          </motion.button>
        )}

        {/* AI & Telegram MCP Hub Trigger */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={onOpenMcpHub}
          title="Open AI & Telegram MCP Assistant Hub (Claude / Cursor)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-primary-500/15 via-accent-cyan/15 to-purple-500/15 border border-primary-500/30 hover:border-primary-400 text-xs font-semibold text-primary-200 hover:text-white transition-all shadow-sm hover:shadow-primary-500/20 cursor-pointer mr-2 titlebar-no-drag group"
        >
          <Sparkles className="w-3.5 h-3.5 text-accent-cyan group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline">AI / MCP Hub</span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleMinimize}
          className="w-8 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleMaximize}
          className="w-8 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          title={isMax ? 'Restore' : 'Maximize'}
        >
          <Square className="w-3 h-3" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleClose}
          className="w-8 h-7 flex items-center justify-center rounded-lg hover:bg-accent-rose text-gray-400 hover:text-white transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </header>
  )
}
