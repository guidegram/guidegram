import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Sparkles, ShieldCheck, Zap, Shield, Smartphone, ArrowRight, ArrowLeft, X, Minimize2, ExternalLink } from 'lucide-react'
import { useI18n } from '../i18n'

interface WhatsNewModalProps {
  isOpen: boolean
  version: string
  onClose: () => void
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({
  isOpen,
  version,
  onClose,
}) => {
  const { t, isRTL } = useI18n()

  if (!isOpen) return null

  // Version-aware feature resolution:
  // Dynamically showcase the actual highlights of the updated version instead of static fallback items.
  const getVersionFeatures = (ver: string) => {
    const cleanVer = ver.replace(/^v/, '').trim()

    // v2.4.0: Universal Guidegram MCP Architecture, Online Radar, Star Gifts & Persian AI Search
    if (cleanVer.startsWith('2.4') || cleanVer >= '2.4.0') {
      return [
        {
          icon: Sparkles,
          bgColor: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
          title: 'Universal MCP Server & Persian AI Engine',
          desc: '2-tier hybrid architecture with 21 high-level tools, full MTProto Layer 229 parity (859 methods), and fuzzy Persian name/message search.',
        },
        {
          icon: Zap,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          title: 'Online Radar & Contact Audit Timeline',
          desc: 'Track exact user status, live online transitions, contact profile/name change histories, and Star Gifts with 3D orbit visuals.',
        },
        {
          icon: ShieldCheck,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: 'Hardened Media Streaming & Audio Fixes',
          desc: 'Muted audio leak protection, BigInt-safe MCP serialization, and unread counter bi-directional sync across all Telegram sessions.',
        },
      ]
    }

    // v2.2.0: Telegram Parity Attachments, Centered Channels, Clipboard Paste & TitleBar Hub
    if (cleanVer.startsWith('2.2') || cleanVer >= '2.2.0') {
      return [
        {
          icon: Sparkles,
          bgColor: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
          title: 'Telegram Premium Attachment Suite',
          desc: 'Docked popover right above the paperclip with Photos, Documents, Checklists, Articles, Live Location, Polls, and Audio.',
        },
        {
          icon: Zap,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          title: 'Centered Channel Feed & Dynamic Widths',
          desc: 'Channels now center posts beautifully with wide cards, while bot forms expand smoothly without horizontal compression.',
        },
        {
          icon: ShieldCheck,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: 'Clipboard Instant Paste & 60m Auto-Update',
          desc: 'Paste screenshots directly with Ctrl+V, toggle Ghost Mode with a single click, and enjoy hands-free zero-data-loss background updates.',
        },
      ]
    }

    // v2.1.0: Apple & Telegram iOS-Grade 50-Phase Visual & Fluid Motion Architecture
    if (cleanVer.startsWith('2.1') || cleanVer >= '2.1.0') {
      return [
        {
          icon: Sparkles,
          bgColor: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
          title: 'Apple & Telegram Fluid Kinematics',
          desc: '50-phase comprehensive visual evolution with high-fidelity spring physics, shared layout tabs, and ultra-fluid micro-interactions.',
        },
        {
          icon: Zap,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          title: 'Haptic Tactile Micro-Interactions',
          desc: 'Tactile responsive feedback on all action buttons, dialogs, drawers, audio/video players, and unified inbox rows.',
        },
        {
          icon: ShieldCheck,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: 'MTProto Layer 229+ & Zero-Loss Vault',
          desc: 'Complete Telegram protocol coverage with bulletproof session security and instant multi-DC media pipeline.',
        },
      ]
    }

    // v2.0.0: MTProto Layer 229+ Full Parity (859 Methods), Turbo Multi-DC Media Engine, Session Vault
    if (cleanVer.startsWith('2.0') || cleanVer >= '2.0.0') {
      return [
        {
          icon: Zap,
          bgColor: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
          title: 'MTProto Layer 229+ Full Parity',
          desc: 'Complete protocol parity with 859 methods connected across 28 namespaces (Channels, Stories, Payments, Stars, Bots & Security).',
        },
        {
          icon: ShieldCheck,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          title: 'Turbo Multi-DC Media Engine',
          desc: 'Instant full-resolution download pipeline for photos, documents, and videos with native InputFileLocation translation.',
        },
        {
          icon: Sparkles,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: 'Multi-Account Session Vault',
          desc: 'Bulletproof portable deployment with automatic session preservation across all authenticated accounts.',
        },
      ]
    }

    // v1.11.5: Instant Window Restore, Taskbar Parity & Singleton Lock Stabilization
    if (cleanVer.startsWith('1.11.5')) {
      return [
        {
          icon: Minimize2,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          title: t('whatsnew.feat_window_restore_title'),
          desc: t('whatsnew.feat_window_restore_desc'),
        },
        {
          icon: Shield,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: t('whatsnew.feat_singleton_ipc_title'),
          desc: t('whatsnew.feat_singleton_ipc_desc'),
        },
        {
          icon: Smartphone,
          bgColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          title: t('whatsnew.feat_phone_2fa_title'),
          desc: t('whatsnew.feat_phone_2fa_desc'),
        },
      ]
    }

    // v1.11.4: Mobile 2FA resilience, smart tray close intercept & unread sync
    if (cleanVer.startsWith('1.11.4')) {
      return [
        {
          icon: Smartphone,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: t('whatsnew.feat_phone_2fa_title'),
          desc: t('whatsnew.feat_phone_2fa_desc'),
        },
        {
          icon: Minimize2,
          bgColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          title: t('whatsnew.feat_tray_close_title'),
          desc: t('whatsnew.feat_tray_close_desc'),
        },
        {
          icon: Zap,
          bgColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          title: t('whatsnew.feat_unread_sync_title'),
          desc: t('whatsnew.feat_unread_sync_desc'),
        },
      ]
    }

    // v1.11.3: Unread counter parity & MTProto read sync
    if (cleanVer.startsWith('1.11.3')) {
      return [
        {
          icon: Zap,
          bgColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          title: t('whatsnew.feat_unread_sync_title'),
          desc: t('whatsnew.feat_unread_sync_desc'),
        },
        {
          icon: Shield,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          title: t('whatsnew.feat_isolation_title'),
          desc: t('whatsnew.feat_isolation_desc'),
        },
        {
          icon: Smartphone,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: t('whatsnew.feat_login_title'),
          desc: t('whatsnew.feat_login_desc'),
        },
      ]
    }

    // General fallback
    return [
      {
        icon: Smartphone,
        bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        title: t('whatsnew.feat_phone_2fa_title'),
        desc: t('whatsnew.feat_phone_2fa_desc'),
      },
      {
        icon: Minimize2,
        bgColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        title: t('whatsnew.feat_tray_close_title'),
        desc: t('whatsnew.feat_tray_close_desc'),
      },
      {
        icon: Zap,
        bgColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        title: t('whatsnew.feat_unread_sync_title'),
        desc: t('whatsnew.feat_unread_sync_desc'),
      },
    ]
  }

  const features = getVersionFeatures(version)

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative w-full max-w-lg bg-[#0f141c]/95 border border-white/10 rounded-3xl p-6 md:p-7 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden"
      >
        {/* Background glow accents */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-accent-cyan/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-primary-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={onClose}
          className={`absolute top-5 ${isRTL ? 'left-5' : 'right-5'} p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer`}
          title={t('app.close')}
        >
          <X className="w-5 h-5" />
        </motion.button>

        {/* Header Badge & Title */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 via-accent-cyan to-emerald-400 flex items-center justify-center text-white shadow-[0_0_25px_rgba(14,165,233,0.4)] shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {t('whatsnew.title')}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/30">
                v{version}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {t('whatsnew.subtitle')}
            </p>
          </div>
        </div>

        {/* Zero Data Loss Guarantee Banner */}
        <div className="mb-5 p-3 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/20 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-[11.5px] leading-snug">
            <p className="font-semibold text-emerald-300">
              {t('whatsnew.data_safe_title')}
            </p>
            <p className="text-gray-400 mt-0.5 text-[10.5px]">
              {t('whatsnew.data_safe_desc')}
            </p>
          </div>
        </div>

        {/* Features List */}
        <div className="space-y-2.5 mb-6">
          <div className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-1 flex items-center justify-between">
            <span>{t('whatsnew.section_title')}</span>
          </div>

          {features.map((feat, idx) => {
            const Icon = feat.icon
            return (
              <motion.div
                whileHover={{ scale: 1.02, x: 2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                key={idx}
                className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 transition-colors flex items-start gap-3"
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${feat.bgColor}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="text-xs font-semibold text-gray-200">
                      {feat.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Action Button & Release Notes Link */}
        <div className="space-y-2.5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-primary-600 via-primary-500 to-accent-cyan hover:from-primary-500 hover:to-accent-cyan text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(59,130,246,0.35)] hover:shadow-[0_0_35px_rgba(14,165,233,0.5)] transition-all cursor-pointer group"
          >
            <span>{t('whatsnew.action_button')}</span>
            {isRTL ? (
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            ) : (
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            )}
          </motion.button>

          <a
            href={`https://github.com/guidegram/guidegram/releases`}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-1.5 text-[11px] text-gray-400 hover:text-primary-400 transition-colors py-1 cursor-pointer"
          >
            <span>{t('whatsnew.view_release_notes')}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </motion.div>
    </div>
  )
}
