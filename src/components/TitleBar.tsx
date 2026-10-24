import React, { useState } from 'react'
import { Minus, Square, X, Shield, Sparkles, Menu } from 'lucide-react'
import { AccountInfo } from '../types/telegram'
import logoImg from '../assets/logo.png'

interface TitleBarProps {
  activeAccount: AccountInfo | null
  ghostMode: boolean
  onRequestClose?: () => void
  onToggleMainMenu?: () => void
  onOpenMcpHub?: () => void
}

export const TitleBar: React.FC<TitleBarProps> = ({
  activeAccount,
  ghostMode,
  onRequestClose,
  onToggleMainMenu,
  onOpenMcpHub,
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
      {/* Left Brand Badge with Hamburger Menu Trigger */}
      <div className="flex items-center gap-2 titlebar-no-drag">
        <button
          type="button"
          onClick={onToggleMainMenu}
          title="Open Main Menu"
          className="flex items-center gap-2 p-1 -ml-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
        >
          <div className="p-1 rounded-lg text-gray-400 group-hover:text-white transition-colors">
            <Menu className="w-4 h-4" />
          </div>
          <div className="w-6 h-6 rounded-lg overflow-hidden shadow-glow flex items-center justify-center border border-primary-400/40">
            <img src={logoImg} alt="Guidegram Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-xs font-bold text-gray-200 group-hover:text-primary-300 tracking-wide transition-colors">Guidegram</span>
        </button>
        <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-primary-600/20 text-primary-300 border border-primary-500/30 rounded-md">
          v{__APP_VERSION__}
        </span>
        <span className="text-[10px] font-medium px-1.5 py-0.2 bg-white/5 text-gray-400 border border-white/10 rounded-md">
          Portable
        </span>

        {/* Active Account Pill */}
        {activeAccount && (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/10 text-xs">
            <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
            <span className="text-gray-300 font-medium">{activeAccount.firstName || 'User'}</span>
            {activeAccount.proxyConfig?.enabled && (
              <span className="text-[10px] text-accent-cyan bg-accent-cyan/10 px-1.5 py-0.2 rounded border border-accent-cyan/20">
                Proxy
              </span>
            )}
          </div>
        )}
      </div>

      {/* Middle Status / Drag Area */}
      <div className="flex-1 h-full flex items-center justify-center titlebar-drag">
        {ghostMode && (
          <div className="flex items-center gap-1.5 text-[11px] text-accent-violet font-semibold bg-accent-violet/10 px-2.5 py-0.5 rounded-full border border-accent-violet/20 titlebar-no-drag">
            <Sparkles className="w-3 h-3" />
            <span>Ghost Mode Active</span>
          </div>
        )}
      </div>

      {/* Right Window Controls */}
      <div className="flex items-center gap-1 titlebar-no-drag">
        {/* AI & Telegram MCP Hub Trigger */}
        <button
          type="button"
          onClick={onOpenMcpHub}
          title="Open AI & Telegram MCP Assistant Hub (Claude / Cursor)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-primary-500/15 via-accent-cyan/15 to-purple-500/15 border border-primary-500/30 hover:border-primary-400 text-xs font-semibold text-primary-200 hover:text-white transition-all shadow-sm hover:shadow-primary-500/20 cursor-pointer mr-2 titlebar-no-drag group"
        >
          <Sparkles className="w-3.5 h-3.5 text-accent-cyan group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline">AI / MCP Hub</span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
        </button>

        <button
          onClick={handleMinimize}
          className="w-8 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleMaximize}
          className="w-8 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          title={isMax ? 'Restore' : 'Maximize'}
        >
          <Square className="w-3 h-3" />
        </button>

        <button
          onClick={handleClose}
          className="w-8 h-7 flex items-center justify-center rounded-lg hover:bg-accent-rose text-gray-400 hover:text-white transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  )
}
