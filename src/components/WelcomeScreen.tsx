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
  Camera,
  Languages,
} from 'lucide-react'
import { useIsMobile } from '../utils/useIsMobile'
import { useI18n } from '../i18n'
import logoImg from '../assets/logo.png'

interface WelcomeScreenProps {
  onOpenAddAccount: () => void
  onOpenProxyModal: () => void
  onOpenAccountImport: () => void
  onOpenSettings?: () => void
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onOpenAddAccount,
  onOpenProxyModal,
  onOpenAccountImport,
  onOpenSettings,
}) => {
  const isMobile = useIsMobile(768)
  const { language, setLanguage, t } = useI18n()
  const isPersian = language === 'fa'

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
          <span>{isMobile ? t('welcome.badge_mobile') : t('welcome.badge_desktop')}</span>
        </div>

        {/* Main Title */}
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-2 sm:mb-3">
          {t('welcome.title')} <span className="bg-gradient-to-r from-primary-400 via-[#4EE0B5] to-primary-300 bg-clip-text text-transparent">Guidegram</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-gray-400 max-w-lg mb-6 sm:mb-8 leading-relaxed px-2">
          {isMobile ? t('welcome.subtitle_mobile') : t('welcome.subtitle_desktop')}
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col items-center justify-center gap-3 w-full max-w-xl mb-8 sm:mb-10 px-2 sm:px-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full">
            {/* Primary Action 1: Transfer from PC via Optical QR Scan */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenAccountImport}
              className="flex-1 px-5 py-3.5 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-glow border border-cyan-400/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-cyan-200" />
              <span>{t('welcome.import_pc_btn')}</span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
            </motion.button>

            {/* Primary Action 2: Connect Telegram Account */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenAddAccount}
              className="flex-1 px-5 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-glow border border-primary-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('welcome.add_account_btn')}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </motion.button>
          </div>

          <div className="flex items-center justify-center gap-2.5 w-full sm:w-auto">
            {/* Proxy Manager */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onOpenProxyModal}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-white/5 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-primary-400" />
              <span>{t('welcome.proxy_btn')}</span>
            </motion.button>

            {/* Language Switcher Button (Clean, useful before login) */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setLanguage(isPersian ? 'en' : 'fa')}
              className="px-3.5 py-2.5 bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-white/5 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title={isPersian ? t('welcome.lang_toggle_title_to_en') : t('welcome.lang_toggle_title_to_fa')}
            >
              <Languages className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('welcome.lang_toggle_btn')}</span>
            </motion.button>

            {/* Desktop-only Settings (hidden on mobile before login) */}
            {!isMobile && onOpenSettings && (
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={onOpenSettings}
                className="p-2.5 bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-white border border-white/5 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </motion.button>
            )}
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
              <h3 className="text-xs font-bold text-gray-100">{t('welcome.feat_unlimited_title')}</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              {t('welcome.feat_unlimited_desc')}
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
              <h3 className="text-xs font-bold text-gray-100">{t('welcome.feat_shield_title')}</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              {t('welcome.feat_shield_desc')}
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
              <h3 className="text-xs font-bold text-gray-100">{t('welcome.feat_intel_title')}</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              {t('welcome.feat_intel_desc')}
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
              <h3 className="text-xs font-bold text-gray-100">{t('welcome.feat_turbo_title')}</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              {t('welcome.feat_turbo_desc')}
            </p>
          </motion.div>
        </div>

        {/* Security Footer Note */}
        <div className="mt-8 flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
          <Lock className="w-3.5 h-3.5 text-primary-400" />
          <span>{t('welcome.encryption_footer')}</span>
        </div>
      </motion.div>
    </div>
  )
}
