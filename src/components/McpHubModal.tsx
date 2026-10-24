import React, { useState, useEffect } from 'react'
import {
  Bot,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  FolderOpen,
  ArrowRight,
  X,
  Zap,
  Terminal,
  Settings,
  MessageSquare,
  Download,
  ListFilter,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { useI18n } from '../i18n'

interface McpHubModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenSettings?: (tab?: 'mcp') => void
}

type ClientTab = 'claude' | 'cursor' | 'generic'

export const McpHubModal: React.FC<McpHubModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  const { t, isRTL } = useI18n()
  const [activeClient, setActiveClient] = useState<ClientTab>('claude')
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null)
  const [status, setStatus] = useState<{
    isRunning: boolean
    port: number
    enabled: boolean
    activeToolsCount: number
  } | null>(null)
  const [snippets, setSnippets] = useState<{
    claudeDesktop: string
    cursor: string
    sse: string
    bridgePath: string
    port: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch live MCP server status & snippets
  const refreshMcpData = async () => {
    if (!window.guidegram) return
    setIsLoading(true)
    try {
      const [st, sn] = await Promise.all([
        window.guidegram.mcpGetStatus?.(),
        window.guidegram.mcpGetConfigSnippets?.(),
      ])
      if (st) setStatus(st)
      if (sn) setSnippets(sn)
    } catch (err) {
      console.warn('Failed to fetch MCP status in modal:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      refreshMcpData()
    }
  }, [isOpen])

  if (!isOpen) return null

  const copyToClipboard = async (text: string, targetKey: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedTarget(targetKey)
      setTimeout(() => setCopiedTarget(null), 2500)
    } catch (err) {
      console.error('Clipboard copy error:', err)
    }
  }

  const handleToggleMcpServer = async () => {
    if (!window.guidegram || !status) return
    const nextState = !status.enabled
    try {
      await window.guidegram.mcpUpdateConfig?.({ enabled: nextState })
      await refreshMcpData()
    } catch (err) {
      console.error('Failed to toggle MCP server:', err)
    }
  }

  // Sample quick test prompts
  const samplePrompts = [
    {
      id: 'customer_support',
      icon: MessageSquare,
      title: 'پاسخ‌گویی خودکار به مشتریان',
      prompt:
        'پیام‌های خوانده‌نشده اکانت شماره یک من در گایدگرام رو بررسی کن و به مشتریان بگو: «سلام، وقت‌بخیر، پیام شما ثبت شد و همکاران ما تا دقایقی دیگر پاسخگوی شما خواهند بود.»',
      tag: 'پشتیبانی',
    },
    {
      id: 'download_channel',
      icon: Download,
      title: 'دانلود فایل‌های PDF یا اسناد یک کانال',
      prompt:
        'برو توی کانال @xyz و فایل‌های PDF که در یک هفته گذشته ارسال شده رو بررسی کن و موارد با حجم زیر ۵۰ مگابایت رو در پوشه دانلود برام ذخیره کن.',
      tag: 'دانلود خودکار',
    },
    {
      id: 'accounts_summary',
      icon: ListFilter,
      title: 'گزارش و مانیتورینگ اکانت‌ها',
      prompt:
        'لیست تمام اکانت‌های تلگرام من در گایدگرام رو با وضعیت اتصال و تعداد کل پیام‌های خوانده‌نشده نشون بده و بگو کدوم گفتگوها نیاز به رسیدگی فوری دارن.',
      tag: 'گزارش‌گیری',
    },
  ]

  const getClientDetails = () => {
    switch (activeClient) {
      case 'claude':
        return {
          title: 'Claude Desktop',
          path: '%APPDATA%\\Claude\\claude_desktop_config.json',
          guide:
            'فایل کانفیگ بالا را در ویرایشگر باز کنید و قطعه کد زیر را درون فیلد "mcpServers" قرار دهید، سپس Claude Desktop را ری‌استارت کنید.',
          snippet: snippets?.claudeDesktop || '{\n  "mcpServers": {\n    "guidegram": {\n      "command": "node",\n      "args": ["d:/Ershad Zolfi/programming/coding with Gemini/Guidegram/scripts/mcp-bridge.mjs"]\n    }\n  }\n}',
        }
      case 'cursor':
        return {
          title: 'Cursor IDE',
          path: '.cursor/mcp.json (یا Settings > Features > MCP)',
          guide:
            'در پروژه خود فایل .cursor/mcp.json بسازید یا از بخش تنظیمات Cursor به تب MCP بروید و کانفیگ زیر را وارد کنید.',
          snippet: snippets?.cursor || '{\n  "mcpServers": {\n    "guidegram": {\n      "command": "node",\n      "args": ["d:/Ershad Zolfi/programming/coding with Gemini/Guidegram/scripts/mcp-bridge.mjs"]\n    }\n  }\n}',
        }
      case 'generic':
        return {
          title: 'Windsurf / سایر ایجنت‌ها و اسکریپت‌ها',
          path: 'اتصال از طریق Stdio یا SSE پورت 39527',
          guide:
            'می‌توانید مستقیماً اسکریپت mcp-bridge.mjs را از طریق Stdio به هر هاست سازگار با پروتکل MCP متصل نمایید.',
          snippet: snippets?.claudeDesktop || '{\n  "command": "node",\n  "args": ["d:/Ershad Zolfi/programming/coding with Gemini/Guidegram/scripts/mcp-bridge.mjs"]\n}',
        }
    }
  }

  const clientInfo = getClientDetails()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] bg-dark-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-white/10 bg-gradient-to-r from-primary-950/60 via-dark-900 to-accent-cyan/10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary-600 via-accent-cyan to-indigo-600 flex items-center justify-center shadow-glow border border-white/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  هاب هوش مصنوعی و پروتکل MCP
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                کنترل هوشمند تلگرام با Claude Desktop، Cursor و ایجنت‌های هوش مصنوعی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Realtime Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-950/80 border border-white/10 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  status?.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span className="font-semibold text-gray-200">
                {status?.isRunning
                  ? `آنلاین (پورت ${status.port || 39527})`
                  : 'آفلاین'}
              </span>
              <button
                onClick={handleToggleMcpServer}
                title={status?.enabled ? 'خاموش کردن سرور' : 'روشن کردن سرور'}
                className={`ml-1 text-[11px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                  status?.enabled
                    ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                }`}
              >
                {status?.enabled ? 'توقف' : 'فعال‌سازی'}
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Quick 3-Step Guide Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-primary-500/20 text-primary-400 border border-primary-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                ۱
              </div>
              <div>
                <div className="text-xs font-bold text-gray-200">کپی کانفیگ</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  کد آماده اتصال را با یک کلیک کپی کنید.
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 flex items-center justify-center font-bold text-xs shrink-0">
                ۲
              </div>
              <div>
                <div className="text-xs font-bold text-gray-200">Paste و ری‌استارت</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  داخل Claude یا Cursor پیست کرده و یک‌بار ببندید.
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                ۳
              </div>
              <div>
                <div className="text-xs font-bold text-gray-200">کنترل هوشمند</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  دستور پاسخ به مشتری یا دانلود را صادر کنید!
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Client Selector & Copy Code */}
          <div className="p-5 rounded-2xl bg-dark-950/70 border border-white/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary-400" />
                <span className="text-xs font-bold text-gray-200">
                  انتخاب نرم‌افزار هوش مصنوعی شما:
                </span>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 bg-dark-900 p-1 rounded-xl border border-white/5">
                <button
                  onClick={() => setActiveClient('claude')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeClient === 'claude'
                      ? 'bg-primary-600 text-white shadow-glow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Claude Desktop
                </button>
                <button
                  onClick={() => setActiveClient('cursor')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeClient === 'cursor'
                      ? 'bg-accent-cyan/90 text-dark-950 font-bold shadow-glow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Cursor IDE
                </button>
                <button
                  onClick={() => setActiveClient('generic')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeClient === 'generic'
                      ? 'bg-purple-600 text-white shadow-glow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  سایر ایجنت‌ها
                </button>
              </div>
            </div>

            {/* Path Guide */}
            <div className="flex items-center justify-between bg-dark-900/90 px-3.5 py-2.5 rounded-xl border border-white/5 text-xs text-gray-300">
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen className="w-4 h-4 text-accent-cyan shrink-0" />
                <span className="text-gray-400 shrink-0">مسیر فایل تنظیمات:</span>
                <code className="text-accent-cyan font-mono text-[11px] truncate" dir="ltr">
                  {clientInfo.path}
                </code>
              </div>
              <button
                onClick={() => copyToClipboard(clientInfo.path, 'path')}
                title="کپی مسیر فایل"
                className="shrink-0 flex items-center gap-1 text-[11px] text-gray-400 hover:text-white ml-2 transition-colors cursor-pointer"
              >
                {copiedTarget === 'path' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedTarget === 'path' ? 'کپی شد' : 'کپی مسیر'}</span>
              </button>
            </div>

            {/* Code Block with Large Copy Button */}
            <div className="relative group">
              <pre
                dir="ltr"
                className="bg-black/80 text-emerald-400 text-[11px] font-mono p-4 rounded-xl border border-white/10 overflow-x-auto max-h-48 leading-relaxed selection:bg-emerald-500/30 selection:text-white"
              >
                {clientInfo.snippet}
              </pre>

              <button
                onClick={() => copyToClipboard(clientInfo.snippet, 'snippet')}
                className={`absolute top-2.5 right-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg ${
                  copiedTarget === 'snippet'
                    ? 'bg-emerald-500 text-dark-950 scale-105'
                    : 'bg-primary-600 hover:bg-primary-500 text-white'
                }`}
              >
                {copiedTarget === 'snippet' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>کپی شد! ✅</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی کانفیگ آماده (JSON)</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              💡 {clientInfo.guide}
            </p>
          </div>

          {/* Section 2: Ready-to-Use Magic Prompts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-cyan" />
                <h3 className="text-xs font-bold text-gray-200">
                  پرامپت‌های جادویی نمونه (کپی و ارسال به Claude یا Cursor)
                </h3>
              </div>
              <span className="text-[11px] text-gray-400">یک کلیک برای کپی</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {samplePrompts.map((sp) => {
                const IconComponent = sp.icon
                const isCopied = copiedTarget === sp.id
                return (
                  <div
                    key={sp.id}
                    className="p-3.5 rounded-2xl bg-dark-950/60 border border-white/5 hover:border-primary-500/30 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-1.5 rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20">
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] font-semibold text-gray-400 px-1.5 py-0.5 rounded bg-white/5">
                          {sp.tag}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-gray-200 mb-1.5">
                        {sp.title}
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-3 leading-relaxed">
                        {sp.prompt}
                      </p>
                    </div>

                    <button
                      onClick={() => copyToClipboard(sp.prompt, sp.id)}
                      className={`mt-3 w-full py-1.5 px-2.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-500 text-dark-950 font-bold'
                          : 'bg-white/5 hover:bg-primary-500/20 text-gray-300 hover:text-primary-300 border border-white/5 hover:border-primary-500/30'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-dark-950" />
                          <span>پرامپت کپی شد!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>کپی پرامپت</span>
                        </>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-dark-950/80 flex items-center justify-between">
          <button
            onClick={() => {
              onClose()
              onOpenSettings?.('mcp')
            }}
            className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-accent-cyan transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>تنظیمات پیشرفته (وایت‌لیست چت‌ها، پورت و پوشه دانلود)</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  )
}
