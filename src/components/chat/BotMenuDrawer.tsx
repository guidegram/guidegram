import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  Menu,
  Terminal,
  Bot,
  ExternalLink,
  Sparkles,
  Search,
  X,
  ChevronRight,
  RefreshCw,
  AppWindow,
  SlidersHorizontal,
} from 'lucide-react'
import { DialogItem, ChatDetails } from '../../types/telegram'
import { isRTL } from '../../utils/textUtils'

export interface BotCommandItem {
  command: string
  description: string
}

export type BotMenuButtonType =
  | { type: 'default' }
  | { type: 'commands'; text?: string }
  | { type: 'web_app'; text: string; url: string }
  | { text?: string; url?: string; type?: string }

export interface BotMenuDrawerProps {
  chat: DialogItem
  chatDetails?: ChatDetails | null
  menuButton?: BotMenuButtonType | null
  commands?: BotCommandItem[]
  inputText?: string
  cursorPosition?: number
  isAutocompleteOpen?: boolean
  onSendCommand: (command: string) => void
  onInsertCommand?: (command: string) => void
  onLaunchMiniApp?: (url: string, title?: string) => Promise<void> | void
  disabled?: boolean
  className?: string
}

export interface CommandAutocompleteProps {
  inputText: string
  cursorPosition?: number
  commands: BotCommandItem[]
  isOpen?: boolean
  onSelectCommand: (command: string) => void
  onClose?: () => void
  className?: string
}

/**
 * Command Autocomplete Drawer
 * Triggers on typing "/" in textarea, displaying matching command suggestions
 * with full keyboard navigation (Up / Down / Enter / Tab / Escape).
 */
export const CommandAutocompleteDrawer: React.FC<CommandAutocompleteProps> = ({
  inputText,
  cursorPosition,
  commands,
  isOpen: forcedIsOpen,
  onSelectCommand,
  onClose,
  className = '',
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Detect slash query at cursor position or end of text
  const matchResult = useMemo(() => {
    if (!inputText) return null
    const textToCheck =
      typeof cursorPosition === 'number'
        ? inputText.slice(0, cursorPosition)
        : inputText

    const match = textToCheck.match(/(?:^|\s)\/([a-zA-Z0-9_]*)$/)
    if (!match) return null
    return {
      query: match[1].toLowerCase(),
      fullMatch: match[0],
    }
  }, [inputText, cursorPosition])

  // Filter commands matching the query
  const matchingCommands = useMemo(() => {
    if (!matchResult) return []
    const q = matchResult.query
    return commands.filter((c) => {
      const cleanCmd = c.command.replace(/^\//, '').toLowerCase()
      return cleanCmd.includes(q) || c.description.toLowerCase().includes(q)
    })
  }, [matchResult, commands])

  // Determine visibility: forced prop OR active matching query with commands available
  const isVisible =
    forcedIsOpen !== undefined
      ? forcedIsOpen && matchingCommands.length > 0
      : Boolean(matchResult && matchingCommands.length > 0)

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [matchResult?.query])

  // Global keydown listener for Up/Down/Enter/Tab when autocomplete is active
  useEffect(() => {
    if (!isVisible || matchingCommands.length === 0) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) => (prev + 1) % matchingCommands.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) =>
          prev === 0 ? matchingCommands.length - 1 : prev - 1
        )
      } else if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        const selected = matchingCommands[selectedIndex]
        if (selected) {
          const cmdFormatted = selected.command.startsWith('/')
            ? selected.command
            : `/${selected.command}`
          onSelectCommand(cmdFormatted)
        }
      } else if (e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        const selected = matchingCommands[selectedIndex]
        if (selected) {
          const cmdFormatted = selected.command.startsWith('/')
            ? selected.command
            : `/${selected.command}`
          onSelectCommand(cmdFormatted)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isVisible, matchingCommands, selectedIndex, onSelectCommand, onClose])

  if (!isVisible || matchingCommands.length === 0) {
    return null
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`absolute bottom-full left-0 right-0 mb-2 max-h-64 overflow-y-auto bg-dark-850/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md p-1.5 flex flex-col gap-0.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs select-none ${className}`}
    >
      {/* Header info */}
      <div className="px-3 py-1.5 border-b border-white/5 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        <span className="flex items-center gap-1.5">
          <Terminal className="w-3 h-3 text-primary-400" />
          Bot Commands ({matchingCommands.length})
        </span>
        <span className="text-gray-500 font-normal">
          Use ↑↓ to navigate • ↵ / Tab to select
        </span>
      </div>

      {/* Commands List */}
      <div className="flex flex-col gap-0.5 mt-1">
        {matchingCommands.map((item, idx) => {
          const isSelected = idx === selectedIndex
          const cmdName = item.command.startsWith('/')
            ? item.command
            : `/${item.command}`
          const isRtl = isRTL(item.description)

          return (
            <button
              key={cmdName}
              type="button"
              onMouseEnter={() => setSelectedIndex(idx)}
              onClick={() => onSelectCommand(cmdName)}
              className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl transition-all text-left cursor-pointer ${
                isSelected
                  ? 'bg-primary-600/30 text-white border border-primary-500/40 shadow-sm'
                  : 'hover:bg-white/5 text-gray-300 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-bold text-primary-400 text-xs shrink-0">
                  {cmdName}
                </span>
                <span
                  dir={isRtl ? 'rtl' : 'ltr'}
                  className="text-[11px] text-gray-300 truncate"
                >
                  {item.description}
                </span>
              </div>
              <ChevronRight
                className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                  isSelected
                    ? 'text-primary-400 translate-x-0.5'
                    : 'text-gray-600 opacity-0 group-hover:opacity-100'
                }`}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Command Palette Popup Drawer
 * Rendered when clicking the "Menu" button.
 */
interface CommandPaletteModalProps {
  commands: BotCommandItem[]
  botUsername?: string
  isOpen: boolean
  onClose: () => void
  onSelectCommand: (cmd: string) => void
}

const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  commands,
  botUsername,
  isOpen,
  onClose,
  onSelectCommand,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)

  // Filter commands by search
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return commands
    const q = searchQuery.toLowerCase().trim()
    return commands.filter(
      (c) =>
        c.command.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    )
  }, [commands, searchQuery])

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={modalRef}
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-full left-0 mb-2 w-80 max-h-96 overflow-hidden bg-dark-850/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col z-50 animate-in fade-in zoom-in-95 duration-150 select-none text-xs"
    >
      {/* Header */}
      <div className="p-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-gray-100 text-xs">Bot Commands</span>
          {botUsername && (
            <span className="font-mono text-[10px] text-primary-400/80 bg-primary-500/10 px-1.5 py-0.5 rounded-md">
              @{botUsername.replace(/^@/, '')}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Bar if multiple commands */}
      {commands.length > 4 && (
        <div className="p-2 border-b border-white/5 bg-dark-900/40">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search commands..."
              className="w-full bg-dark-800 border border-white/5 rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Commands List */}
      <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1 max-h-72">
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-gray-500 text-xs">
            No commands match "{searchQuery}"
          </div>
        ) : (
          filtered.map((item) => {
            const formattedCmd = item.command.startsWith('/')
              ? item.command
              : `/${item.command}`
            const isRtl = isRTL(item.description)

            return (
              <button
                key={formattedCmd}
                type="button"
                onClick={() => {
                  onSelectCommand(formattedCmd)
                  onClose()
                }}
                className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 active:bg-primary-500/20 text-gray-200 hover:text-white transition-colors cursor-pointer text-left group"
              >
                <span className="font-mono font-bold text-primary-400 group-hover:text-primary-300 text-xs shrink-0">
                  {formattedCmd}
                </span>
                <span
                  dir={isRtl ? 'rtl' : 'ltr'}
                  className="text-[11px] text-gray-400 group-hover:text-gray-200 truncate text-right flex-1"
                >
                  {item.description}
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

/**
 * Main BotMenuDrawer component:
 * 1. Bot "Menu" button rendered on bottom-left of input bar.
 * 2. If botMenuButtonCommands: clicking toggles a clean popup command palette listing /command and descriptions.
 * 3. If botMenuButton: displays custom label (e.g. "Open App", "Play") and WebApp icon; clicking launches Telegram Mini App.
 * 4. If botMenuButtonDefault: falls back to command palette if commands exist.
 * 5. Includes integrated CommandAutocompleteDrawer when typing "/".
 */
export const BotMenuDrawer: React.FC<BotMenuDrawerProps> = ({
  chat,
  chatDetails,
  menuButton,
  commands: explicitCommands,
  inputText = '',
  cursorPosition,
  isAutocompleteOpen,
  onSendCommand,
  onInsertCommand,
  onLaunchMiniApp,
  disabled = false,
  className = '',
}) => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isLaunchingApp, setIsLaunchingApp] = useState(false)

  // Resolve bot commands
  const resolvedCommands = useMemo<BotCommandItem[]>(() => {
    if (explicitCommands && explicitCommands.length > 0) {
      return explicitCommands
    }
    if (chatDetails?.botInfo?.commands && chatDetails.botInfo.commands.length > 0) {
      return chatDetails.botInfo.commands
    }
    return []
  }, [explicitCommands, chatDetails?.botInfo?.commands])

  // Resolve bot menu button configuration
  const resolvedMenuButton = useMemo(() => {
    if (menuButton) return menuButton
    if (chatDetails?.botInfo?.menuButton) {
      return chatDetails.botInfo.menuButton as BotMenuButtonType
    }
    return null
  }, [menuButton, chatDetails?.botInfo?.menuButton])

  // Determine button behavior
  const menuConfig = useMemo(() => {
    const btn = resolvedMenuButton
    const hasCommands = resolvedCommands.length > 0

    // WebApp button: explicit type 'web_app' or has valid url
    if (btn && (btn.type === 'web_app' || (btn as any).url)) {
      const url = (btn as any).url || ''
      const text = (btn as any).text || 'Open App'
      return {
        mode: 'web_app' as const,
        label: text,
        url,
        show: true,
      }
    }

    // Commands button: explicit type 'commands'
    if (btn && btn.type === 'commands') {
      return {
        mode: 'commands' as const,
        label: (btn as any).text || 'Menu',
        url: undefined,
        show: hasCommands,
      }
    }

    // Default button: fallback to command palette if commands exist
    if (hasCommands) {
      return {
        mode: 'commands' as const,
        label: (btn as any)?.text || 'Menu',
        url: undefined,
        show: true,
      }
    }

    // No menu button and no commands: hide
    return {
      mode: 'hidden' as const,
      label: '',
      url: undefined,
      show: false,
    }
  }, [resolvedMenuButton, resolvedCommands])

  // Handle Web App launch via window.guidegram or onLaunchMiniApp
  const handleLaunchWebApp = useCallback(
    async (url?: string, label?: string) => {
      if (!url) return
      setIsLaunchingApp(true)

      try {
        if (onLaunchMiniApp) {
          await onLaunchMiniApp(url, label)
          return
        }

        // Try requestAppWebView or requestWebView
        if (
          typeof window !== 'undefined' &&
          window.guidegram &&
          typeof (window.guidegram as any).requestAppWebView === 'function'
        ) {
          await (window.guidegram as any).requestAppWebView(chat.accountId, chat.id, {
            url,
          })
          return
        }

        if (
          typeof window !== 'undefined' &&
          window.guidegram &&
          typeof window.guidegram.requestWebView === 'function'
        ) {
          const res = await window.guidegram.requestWebView(
            chat.accountId,
            chat.id,
            chat.id,
            url,
            undefined,
            true
          )
          if (res && res.url && typeof window.guidegram.openMiniApp === 'function') {
            await window.guidegram.openMiniApp(res.url, label || chat.title)
            return
          }
        }

        if (
          typeof window !== 'undefined' &&
          window.guidegram &&
          typeof window.guidegram.openMiniApp === 'function'
        ) {
          await window.guidegram.openMiniApp(url, label || chat.title)
          return
        }

        // External fallback
        window.open(url, '_blank', 'noopener,noreferrer')
      } catch (err) {
        console.error('Failed to launch Web App from Bot Menu Button:', err)
      } finally {
        setIsLaunchingApp(false)
      }
    },
    [chat.accountId, chat.id, chat.title, onLaunchMiniApp]
  )

  // Handle Menu Button Click
  const handleMenuButtonClick = () => {
    if (menuConfig.mode === 'web_app' && menuConfig.url) {
      handleLaunchWebApp(menuConfig.url, menuConfig.label)
    } else if (menuConfig.mode === 'commands') {
      setIsCommandPaletteOpen((prev) => !prev)
    }
  }

  // Handle command selection
  const handleSelectCommand = (cmd: string) => {
    if (onInsertCommand) {
      onInsertCommand(cmd)
    } else {
      onSendCommand(cmd)
    }
  }

  const botUsername = chat.username || chatDetails?.username

  return (
    <div className={`relative shrink-0 ${className}`}>
      {/* 1. Slash Command Autocomplete Drawer (Triggered by typing "/") */}
      <CommandAutocompleteDrawer
        inputText={inputText}
        cursorPosition={cursorPosition}
        commands={resolvedCommands}
        isOpen={isAutocompleteOpen}
        onSelectCommand={handleSelectCommand}
        onClose={() => {}}
      />

      {/* 2. Command Palette Popup (Opened by clicking "Menu" button) */}
      <CommandPaletteModal
        commands={resolvedCommands}
        botUsername={botUsername}
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectCommand={handleSelectCommand}
      />

      {/* 3. Bottom-Left Bot Menu Button */}
      {menuConfig.show && (
        <button
          type="button"
          disabled={disabled || isLaunchingApp}
          onClick={handleMenuButtonClick}
          className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 select-none ${
            isCommandPaletteOpen
              ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40 shadow-glow'
              : menuConfig.mode === 'web_app'
              ? 'bg-gradient-to-r from-primary-600/20 to-sky-600/20 hover:from-primary-600/30 hover:to-sky-600/30 text-primary-300 hover:text-white border border-primary-500/30'
              : 'bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-white/5'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={menuConfig.label}
        >
          {isLaunchingApp ? (
            <RefreshCw className="w-4 h-4 animate-spin text-primary-400" />
          ) : menuConfig.mode === 'web_app' ? (
            <AppWindow className="w-4 h-4 text-primary-400" />
          ) : (
            <Bot className="w-4 h-4 text-primary-400" />
          )}

          <span className="font-bold text-xs truncate max-w-[120px]">
            {isLaunchingApp ? 'Launching...' : menuConfig.label}
          </span>
        </button>
      )}
    </div>
  )
}

export default BotMenuDrawer
