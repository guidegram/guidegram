import React, { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { StarGiftItem } from '../../types/telegram'
import { StarGiftVisual } from '../StarGiftVisual'

export interface GiftItem {
  id: string
  name: string
  icon?: string
  color: string
  bgGradient: string
  shadowColor: string
  position: { x: number; y: number }
  delay: number
  scale?: number
  starGift?: StarGiftItem
}

// Preset orbital layout coordinates for 1 to 5 gifts around avatar
const ORBIT_LAYOUTS: Record<number, Array<{ x: number; y: number; delay: number; scale: number }>> = {
  1: [{ x: 70, y: -46, delay: 0, scale: 1.15 }],
  2: [
    { x: -72, y: -44, delay: 0, scale: 1.05 },
    { x: 74, y: 32, delay: 0.8, scale: 1.05 },
  ],
  3: [
    { x: -76, y: -50, delay: 0, scale: 1.0 },
    { x: 80, y: -20, delay: 0.6, scale: 1.05 },
    { x: -24, y: 76, delay: 1.2, scale: 0.95 },
  ],
  4: [
    { x: -78, y: -58, delay: 0, scale: 0.95 },
    { x: 78, y: -54, delay: 0.5, scale: 0.95 },
    { x: 84, y: 36, delay: 1.0, scale: 1.0 },
    { x: -82, y: 38, delay: 1.5, scale: 1.0 },
  ],
  5: [
    { x: -84, y: -72, delay: 0, scale: 0.95 },
    { x: 86, y: -74, delay: 0.6, scale: 0.92 },
    { x: 92, y: 16, delay: 1.2, scale: 1.05 },
    { x: -92, y: 18, delay: 1.8, scale: 1.0 },
    { x: 62, y: 88, delay: 2.4, scale: 0.88 },
  ],
}

const DEFAULT_COLOR_PALETTES = [
  { center: '#EC4899', edge: '#BE185D', shadow: 'rgba(236, 72, 153, 0.55)' }, // Pink/Neon
  { center: '#06B6D4', edge: '#0284C7', shadow: 'rgba(6, 182, 212, 0.55)' }, // Cyan/Blue
  { center: '#F59E0B', edge: '#D97706', shadow: 'rgba(245, 158, 11, 0.55)' }, // Amber/Gold
  { center: '#10B981', edge: '#059669', shadow: 'rgba(16, 185, 129, 0.55)' }, // Emerald
  { center: '#8B5CF6', edge: '#6D28D9', shadow: 'rgba(139, 92, 246, 0.55)' }, // Violet
]

interface LiquidGiftOrbitProps {
  accountId?: string
  starGifts?: StarGiftItem[]
  gifts?: GiftItem[]
  onSelectGift?: (gift: GiftItem | StarGiftItem) => void
  onOpenModal?: () => void
  children?: React.ReactNode
}

export const LiquidGiftOrbit: React.FC<LiquidGiftOrbitProps> = ({
  accountId = '',
  starGifts,
  gifts,
  onSelectGift,
  onOpenModal,
  children,
}) => {
  const [activeGift, setActiveGift] = useState<GiftItem | null>(null)
  const shouldReduceMotion = useReducedMotion()

  // Convert real StarGiftItem[] to orbital render items
  const itemsToRender: GiftItem[] = React.useMemo(() => {
    if (starGifts && starGifts.length > 0) {
      const count = Math.min(starGifts.length, 5)
      const layout = ORBIT_LAYOUTS[count] || ORBIT_LAYOUTS[5]
      const slicedGifts = starGifts.slice(0, count)

      return slicedGifts.map((sg, idx) => {
        const coords = layout[idx % layout.length]
        const fallbackPal = DEFAULT_COLOR_PALETTES[idx % DEFAULT_COLOR_PALETTES.length]
        const center = sg.backdrop?.centerColor || fallbackPal.center
        const edge = sg.backdrop?.edgeColor || fallbackPal.edge
        const shadow = `rgba(${parseInt(edge.slice(1, 3) || '245', 16)}, ${parseInt(
          edge.slice(3, 5) || '158',
          16
        )}, ${parseInt(edge.slice(5, 7) || '11', 16)}, 0.55)`

        return {
          id: sg.id || `stargift_${idx}`,
          name: sg.title || `${sg.stars} Stars Gift`,
          color: center,
          bgGradient: `radial-gradient(circle at 35% 35%, ${center}99, ${edge}77 60%, ${edge}44)`,
          shadowColor: shadow,
          position: { x: coords.x, y: coords.y },
          delay: coords.delay,
          scale: coords.scale,
          starGift: sg,
        }
      })
    }

    if (gifts && gifts.length > 0) {
      return gifts
    }

    return []
  }, [starGifts, gifts])

  return (
    <div className="relative w-64 h-64 mx-auto flex items-center justify-center select-none">
      {/* Center Avatar Container */}
      <div className="relative z-10">{children}</div>

      {/* Floating Organic Liquid Jelly Bubbles */}
      {itemsToRender.map((gift) => (
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
            if (gift.starGift) {
              onSelectGift?.(gift.starGift)
            } else {
              onSelectGift?.(gift)
            }
            onOpenModal?.()
          }}
        >
          {/* Liquid Jelly Blob Body with Organic Morphing */}
          <motion.div
            className="w-13 h-13 relative flex items-center justify-center backdrop-blur-md transition-shadow duration-300"
            style={{
              background: gift.bgGradient,
              boxShadow: `0 8px 24px -4px ${gift.shadowColor}, inset 0 2px 4px rgba(255, 255, 255, 0.45)`,
              border: '1px solid rgba(255, 255, 255, 0.4)',
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
            <div className="absolute top-1 left-2 w-4 h-2 rounded-full bg-white/60 blur-[0.6px] -rotate-12 pointer-events-none" />

            {/* Inner Floating 3D Animated Gift Media */}
            {gift.starGift ? (
              <StarGiftVisual
                gift={gift.starGift}
                accountId={accountId}
                size="sm"
                showBackdrop={false}
                className="w-full h-full object-contain pointer-events-none"
              />
            ) : (
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
            )}

            {/* Collectible Badge for Unique Gifts (#123) */}
            {gift.starGift?.num !== undefined && (
              <div className="absolute -bottom-1 -right-1 px-1 rounded-full bg-dark-950/90 text-[7px] font-mono font-bold text-amber-300 border border-amber-400/40 leading-none">
                #{gift.starGift.num}
              </div>
            )}
          </motion.div>

          {/* Floating Tooltip on Hover */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-semibold text-white shadow-lg border border-white/10 z-50">
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
