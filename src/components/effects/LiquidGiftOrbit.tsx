import React, { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Sparkles } from 'lucide-react'

export interface GiftItem {
  id: string
  name: string
  icon: string // emoji or image
  color: string // dominant color for glow/tint
  bgGradient: string
  shadowColor: string
  position: { x: number; y: number } // relative offset from center in px
  delay: number
  scale?: number
}

const DEFAULT_GIFTS: GiftItem[] = [
  {
    id: 'shades',
    name: 'Cyber Shades',
    icon: '🕶️',
    color: '#ec4899',
    bgGradient: 'radial-gradient(circle at 35% 35%, rgba(244, 114, 182, 0.65), rgba(219, 39, 119, 0.45) 60%, rgba(157, 23, 77, 0.3))',
    shadowColor: 'rgba(236, 72, 153, 0.55)',
    position: { x: -84, y: -72 },
    delay: 0,
    scale: 0.95,
  },
  {
    id: 'cyber-cat',
    name: 'Neon Kitty',
    icon: '🐱',
    color: '#06b6d4',
    bgGradient: 'radial-gradient(circle at 35% 35%, rgba(103, 232, 249, 0.65), rgba(6, 182, 212, 0.45) 60%, rgba(14, 116, 144, 0.3))',
    shadowColor: 'rgba(6, 182, 212, 0.55)',
    position: { x: 86, y: -74 },
    delay: 0.6,
    scale: 0.92,
  },
  {
    id: 'warrior-helm',
    name: 'Golden Spartan',
    icon: '👑',
    color: '#f59e0b',
    bgGradient: 'radial-gradient(circle at 35% 35%, rgba(252, 211, 77, 0.7), rgba(245, 158, 11, 0.5) 60%, rgba(180, 83, 9, 0.35))',
    shadowColor: 'rgba(245, 158, 11, 0.6)',
    position: { x: 92, y: 16 },
    delay: 1.2,
    scale: 1.05,
  },
  {
    id: 'green-frog',
    name: 'Emerald Pepe',
    icon: '🐸',
    color: '#8b5cf6',
    bgGradient: 'radial-gradient(circle at 35% 35%, rgba(196, 181, 253, 0.65), rgba(139, 92, 246, 0.45) 60%, rgba(109, 40, 217, 0.3))',
    shadowColor: 'rgba(139, 92, 246, 0.55)',
    position: { x: -92, y: 18 },
    delay: 1.8,
    scale: 1.0,
  },
  {
    id: 'star-gem',
    name: 'Star Box',
    icon: '💎',
    color: '#38bdf8',
    bgGradient: 'radial-gradient(circle at 35% 35%, rgba(125, 211, 252, 0.7), rgba(56, 189, 248, 0.45) 60%, rgba(3, 105, 161, 0.35))',
    shadowColor: 'rgba(56, 189, 248, 0.6)',
    position: { x: 62, y: 88 },
    delay: 2.4,
    scale: 0.88,
  },
]

interface LiquidGiftOrbitProps {
  gifts?: GiftItem[]
  onSelectGift?: (gift: GiftItem) => void
  children?: React.ReactNode // Center avatar component
}

export const LiquidGiftOrbit: React.FC<LiquidGiftOrbitProps> = ({
  gifts = DEFAULT_GIFTS,
  onSelectGift,
  children,
}) => {
  const [activeGift, setActiveGift] = useState<GiftItem | null>(null)
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="relative w-64 h-64 mx-auto flex items-center justify-center select-none">
      {/* Center Avatar Container */}
      <div className="relative z-10">{children}</div>

      {/* Floating Organic Liquid Bubbles */}
      {gifts.map((gift) => (
        <motion.div
          key={gift.id}
          className="absolute z-20 cursor-pointer group"
          style={{
            left: '50%',
            top: '50%',
            marginLeft: gift.position.x - 26,
            marginTop: gift.position.y - 26,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: gift.scale || 1,
            opacity: 1,
            y: shouldReduceMotion ? 0 : [0, -8, 4, -4, 0],
            x: shouldReduceMotion ? 0 : [0, 5, -3, 2, 0],
          }}
          transition={{
            y: {
              duration: 5.5 + gift.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            },
            x: {
              duration: 6.8 + gift.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            },
            scale: {
              type: 'spring',
              stiffness: 260,
              damping: 20,
              delay: 0.1 * gift.delay,
            },
          }}
          whileHover={{
            scale: (gift.scale || 1) * 1.25,
            zIndex: 40,
            transition: { type: 'spring', stiffness: 400, damping: 15 },
          }}
          whileTap={{
            scale: (gift.scale || 1) * 0.9,
          }}
          onClick={() => {
            setActiveGift(gift)
            onSelectGift?.(gift)
          }}
        >
          {/* Liquid Blob Body */}
          <motion.div
            className="w-14 h-14 relative flex items-center justify-center backdrop-blur-md transition-shadow duration-300"
            style={{
              background: gift.bgGradient,
              boxShadow: `0 8px 24px -4px ${gift.shadowColor}, inset 0 2px 4px rgba(255, 255, 255, 0.45)`,
              border: '1px solid rgba(255, 255, 255, 0.35)',
            }}
            animate={{
              borderRadius: [
                '58% 42% 63% 37% / 44% 56% 44% 56%',
                '40% 60% 45% 55% / 59% 41% 59% 41%',
                '65% 35% 50% 50% / 38% 62% 38% 62%',
                '50% 50% 38% 62% / 55% 45% 55% 45%',
                '58% 42% 63% 37% / 44% 56% 44% 56%',
              ],
            }}
            transition={{
              duration: 7 + gift.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {/* Top Specular Glint (Glass highlight) */}
            <div className="absolute top-1.5 left-2.5 w-4 h-2 rounded-full bg-white/50 blur-[0.6px] -rotate-12 pointer-events-none" />

            {/* Inner Floating 3D Icon / Gift */}
            <motion.div
              className="text-xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] select-none pointer-events-none"
              animate={{
                rotate: [-3, 4, -4, 3, 0],
                y: [-1, 1.5, -1],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {gift.icon}
            </motion.div>
          </motion.div>

          {/* Floating Tooltip on Hover */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-medium text-white shadow-lg border border-white/10 z-50">
            {gift.name}
          </div>
        </motion.div>
      ))}

      {/* Pop Ripple Feedback on Click */}
      <AnimatePresence>
        {activeGift && (
          <motion.div
            key={activeGift.id + Date.now()}
            className="absolute rounded-full pointer-events-none z-30"
            style={{
              left: '50%',
              top: '50%',
              marginLeft: activeGift.position.x - 20,
              marginTop: activeGift.position.y - 20,
              width: 40,
              height: 40,
              border: `2px solid ${activeGift.color}`,
              boxShadow: `0 0 20px ${activeGift.color}`,
            }}
            initial={{ scale: 0.8, opacity: 1 }}
            animate={{ scale: 2.2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            onAnimationComplete={() => setActiveGift(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
