import React from 'react'
import { motion } from 'motion/react'
import {
  Plus,
  Shield,
  Sparkles,
  Layers,
  Settings,
  ArrowRight,
  ShieldCheck,
  BarChart2,
  Zap,
  Lock,
} from 'lucide-react'
import { useIsMobile } from '../utils/useIsMobile'
import logoImg from '../assets/logo.png'

interface WelcomeScreenProps {
  onOpenAddAccount: () => void
  onOpenProxyModal: () => void
  onOpenSettings: () => void
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onOpenAddAccount,
  onOpenProxyModal,
  onOpenSettings,
}) => {
  const isMobile = useIsMobile(768)

  return (
    <div
      className="flex-1 bg-dark-950 flex flex-col items-center justify-start sm:justify-center p-4 sm:p-8 relative overflow-y-auto select-none titlebar-no-drag"
      style={{
        paddingTop: isMobile
          ? 'calc(env(safe-area-inset-top, 0px) + 2rem)'
          : '2rem',
        paddingBottom: isMobile
          ? 'calc(env(safe-area-inset-bottom, 0px) + 2.5rem)'
          : '2rem',
      }}
    >
      {/* Static Ambient Radial Glows (Zero GPU / Composite Repaint Overhead) */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[320px] rounded-full pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.45) 0%, rgba(99, 102, 241, 0.15) 50%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-10 right-10 w-[280px] h-[280px] rounded-full pointer-events-none opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, transparent 70%)',
        }}
      />

      {/* Hero Container */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="max-w-2xl w-full text-center relative z-10 flex flex-col items-center"
      >
        {/* Floating Glowing Logo Badge */}
        <motion.div
          animate={{
            y: [-4, 4, -4],
            rotate: [-1, 1, -1],
          }}
          transition={{
            repeat: Infinity,
            duration: 5,
            ease: 'easeInOut',
          }}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden shadow-glow mb-5 border border-primary-400/40 relative cursor-pointer group shrink-0"
        >
          <img
            src={logoImg}
            alt="Guidegram Logo"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        </motion.div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary-600/15 border border-primary-500/30 text-primary-300 text-xs font-semibold mb-3 sm:mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-primary-400 animate-pulse" />
          <span>{isMobile ? 'Mobile Edition • Multi-Account' : 'Portable Edition • Unlimited Multi-Account'}</span>
        </div>

        {/* Main Title */}
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-2 sm:mb-3">
          Welcome to <span className="bg-gradient-to-r from-primary-400 via-[#4EE0B5] to-primary-300 bg-clip-text text-transparent">Guidegram</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-gray-400 max-w-lg mb-6 sm:mb-8 leading-relaxed px-2">
          {isMobile
            ? 'The ultimate Telegram client built for power users. Manage unlimited accounts concurrently with dedicated per-account proxies, deep group analytics, and high-speed downloads.'
            : 'The ultimate desktop Telegram client built for power users. Manage dozens or hundreds of accounts concurrently with dedicated per-account proxies, deep group analytics, and multi-worker downloads.'}
        </p>

        {/* Primary CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto mb-8 sm:mb-10 px-2 sm:px-0">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onOpenAddAccount}
            className="px-6 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-bold text-sm rounded-2xl shadow-glow border border-primary-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Telegram Account</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </motion.button>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onOpenProxyModal}
              className="flex-1 sm:flex-none px-4 py-3.5 bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-white/5 font-semibold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Shield className="w-4 h-4 text-primary-400" />
              <span>Proxy Manager</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={onOpenSettings}
              className="p-3.5 bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-white border border-white/5 rounded-2xl transition-all cursor-pointer flex items-center justify-center"
              title="Preferences & API"
            >
              <Settings className="w-5 h-5 sm:w-4 sm:h-4" />
            </motion.button>
          </div>
        </div>

        {/* Bento Grid - 4 Killer Feature Cards with Spring Hover Lift */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
          {/* Card 1 */}
          <motion.div
            whileHover={{ scale: 1.025, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="p-4 rounded-2xl bg-dark-900/80 border border-white/5 hover:border-primary-500/30 transition-colors"
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-primary-600/15 text-primary-400 border border-primary-500/25">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-gray-100">Unlimited Multi-Account</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              Run 10, 50, or 100+ accounts concurrently without paying for Telegram Premium.
            </p>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            whileHover={{ scale: 1.025, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="p-4 rounded-2xl bg-dark-900/80 border border-white/5 hover:border-accent-cyan/20 transition-colors"
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-gray-100">Anti-Ban Hardware Shield</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              Dedicated per-account proxies coupled with cryptographic hardware fingerprint masking.
            </p>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            whileHover={{ scale: 1.025, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="p-4 rounded-2xl bg-dark-900/80 border border-white/5 hover:border-accent-violet/20 transition-colors"
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-accent-violet/10 text-accent-violet border border-accent-violet/20">
                <BarChart2 className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-gray-100">Deep Group Intelligence</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              Real-time active member leaderboards, 24-hour heatmaps, and message analytics.
            </p>
          </motion.div>

          {/* Card 4 */}
          <motion.div
            whileHover={{ scale: 1.025, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="p-4 rounded-2xl bg-dark-900/80 border border-white/5 hover:border-primary-500/20 transition-colors"
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-primary-600/10 text-primary-400 border border-primary-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-gray-100">Turbo Parallel Downloads</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              Up to 3x faster media streaming and large file transfers via 4 concurrent MTProto workers.
            </p>
          </motion.div>
        </div>

        {/* Security Footer Note */}
        <div className="mt-8 flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
          <Lock className="w-3.5 h-3.5 text-primary-400" />
          <span>Local MTProto 2.0 Encryption • Your sessions never leave your local computer</span>
        </div>
      </motion.div>
    </div>
  )
}
