import React, { useState } from 'react'
import { motion } from 'motion/react'
import { Minus, Square, X, Shield, Sparkles, Menu } from 'lucide-react'
import { AccountInfo } from '../types/telegram'
import logoImg from '../assets/logo.png'

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
}

export const TitleBar: React.FC<TitleBarProps> = ({
  activeAccount,
  ghostMode,
  onToggleGhostMode,
  onRequestClose,
  onToggleMainMenu,
  onOpenSavedMessages,
  onOpenMcpHub,
  onCheckUpdate,
  isCheckingUpdate = false,
}) => {
  const [isMax, setIsMax] = useState(false)

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

  return (
    <header className="h-10 bg-dark-950 border-b border-white/5 flex items-center justify-between px-3 select-none titlebar-drag z-50">
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
            <span className="text-gray-300 font-medium">{activeAccount.firstName || 'User'}</span>
            {activeAccount.proxyConfig?.enabled && (
              <span className="text-[10px] text-accent-cyan bg-accent-cyan/10 px-1.5 py-0.2 rounded border border-accent-cyan/20">
                Proxy
              </span>
            )}
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
