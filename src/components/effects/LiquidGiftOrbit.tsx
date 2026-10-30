import React, { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { StarGiftItem } from '../../types/telegram'
import { StarGiftVisual } from '../StarGiftVisual'

export interface GiftItem {
  id: string
  name: string
  icon?: string
  symbolName?: string
  color: string
  bgGradient: string
  shadowColor: string
  angle: number
  starGift?: StarGiftItem
}

interface LiquidGiftOrbitProps {
  accountId?: string
  starGifts?: StarGiftItem[]
  gifts?: GiftItem[]
  onSelectGift?: (gift: StarGiftItem) => void
  onOpenModal?: () => void
  children?: React.ReactNode
}

const DEFAULT_COLOR_PALETTES = [
  { center: '#E69C24', edge: '#B45309', shadow: 'rgba(230, 156, 36, 0.65)' }, // Amber / Mustard
  { center: '#06B6D4', edge: '#0284C7', shadow: 'rgba(6, 182, 212, 0.65)' }, // Cyan / Ice
  { center: '#8B5CF6', edge: '#6D28D9', shadow: 'rgba(139, 92, 246, 0.65)' }, // Violet / Lavender
  { center: '#10B981', edge: '#059669', shadow: 'rgba(16, 185, 129, 0.65)' }, // Emerald
  { center: '#EC4899', edge: '#BE185D', shadow: 'rgba(236, 72, 153, 0.65)' }, // Rose / Neon
]

// Fallback symbols if gift does not specify
const FALLBACK_SYMBOLS = ['💊', '💎', '⚡', '⭐', '❤️']

export const LiquidGiftOrbit: React.FC<LiquidGiftOrbitProps> = ({
  accountId = '',
  starGifts,
  gifts,
  onSelectGift,
  onOpenModal,
  children,
}) => {
  const [activeGift, setActiveGift] = useState<GiftItem | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  // Convert real StarGiftItem[] to orbital render items
  const itemsToRender: GiftItem[] = React.useMemo(() => {
    if (starGifts && starGifts.length > 0) {
      const count = Math.min(starGifts.length, 5)
      const slicedGifts = starGifts.slice(0, count)

      return slicedGifts.map((sg, idx) => {
        const fallbackPal = DEFAULT_COLOR_PALETTES[idx % DEFAULT_COLOR_PALETTES.length]
        const center = sg.backdrop?.centerColor || fallbackPal.center
        const edge = sg.backdrop?.edgeColor || fallbackPal.edge
        const shadow = `rgba(${parseInt(edge.slice(1, 3) || '230', 16)}, ${parseInt(
          edge.slice(3, 5) || '156',
          16
        )}, ${parseInt(edge.slice(5, 7) || '36', 16)}, 0.6)`

        // Calculate radial angle distributed around 360 degrees
        const angle = (idx * (360 / count)) - 90

        return {
          id: sg.id || `stargift_${idx}`,
          name: sg.title || (sg.model?.name ? `${sg.model.name}` : `${sg.stars} Stars Gift`),
          symbolName: sg.symbol?.name || FALLBACK_SYMBOLS[idx % FALLBACK_SYMBOLS.length],
          color: center,
          bgGradient: `radial-gradient(circle at 35% 35%, ${center}cc, ${edge}aa 65%, ${edge}55)`,
          shadowColor: shadow,
          angle,
          starGift: sg,
        }
      })
    }

    if (gifts && gifts.length > 0) {
      return gifts
    }

    return []
  }, [starGifts, gifts])

  // Orbital Radius (Rx and Ry for elliptical harmony)
  const radiusX = 104
  const radiusY = 96

  return (
    <div
      className="relative w-72 h-72 mx-auto flex items-center justify-center select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Center Avatar Container */}
      <div className="relative z-10">{children}</div>

      {/* Orbit Track Soft Glow Ring */}
      <div
        className="absolute rounded-full border border-white/5 pointer-events-none"
        style={{
          width: radiusX * 2 + 10,
          height: radiusY * 2 + 10,
          background: 'radial-gradient(circle, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.03) 80%, transparent 100%)',
          boxShadow: '0 0 30px rgba(255,255,255,0.02)',
        }}
      />

      {/* Rotating Orbital Stage */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        animate={{
          rotate: shouldReduceMotion ? 0 : [0, 360],
        }}
        transition={{
          duration: 36,
          repeat: Infinity,
          ease: 'linear',
          ...(isPaused ? { duration: 999999 } : {}),
        }}
      >
        {itemsToRender.map((gift, idx) => {
          const rad = (gift.angle * Math.PI) / 180
          const posX = Math.cos(rad) * radiusX
          const posY = Math.sin(rad) * radiusY

          // Next neighbor in orbit for particle morphism & stream
          const nextIdx = (idx + 1) % itemsToRender.length
          const nextGift = itemsToRender[nextIdx]
          const nextRad = (nextGift.angle * Math.PI) / 180
          const nextPosX = Math.cos(nextRad) * radiusX
          const nextPosY = Math.sin(nextRad) * radiusY

          return (
            <React.Fragment key={gift.id}>
              {/* Morphic Inter-Gift Symbol Particles */}
              {!shouldReduceMotion && itemsToRender.length > 1 && (
                <motion.div
                  className="absolute pointer-events-none z-15 flex items-center justify-center text-[10px]"
                  style={{
                    left: '50%',
                    top: '50%',
                  }}
                  animate={{
                    x: [posX, (posX + nextPosX) / 2 + 10, nextPosX],
                    y: [posY, (posY + nextPosY) / 2 - 12, nextPosY],
                    scale: [0.6, 1.15, 0.2],
                    opacity: [0, 0.85, 0],
                    filter: [
                      `drop-shadow(0 0 6px ${gift.color})`,
                      `drop-shadow(0 0 10px ${nextGift.color})`,
                      `drop-shadow(0 0 4px ${nextGift.color})`,
                    ],
                  }}
                  transition={{
                    duration: 3.2,
                    repeat: Infinity,
                    delay: idx * 0.9,
                    ease: 'easeInOut',
                  }}
                >
                  {/* Morphic Symbol glyph changing into next neighbor */}
                  <motion.span
                    animate={{
                      rotate: [0, 180, 360],
                    }}
                    transition={{
                      duration: 3.2,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    className="select-none"
                  >
                    {gift.symbolName === 'Drug' || gift.symbolName?.includes('💊')
                      ? '💊'
                      : gift.symbolName || '✨'}
                  </motion.span>
                </motion.div>
              )}

              {/* Individual Orbital Bubble Container */}
              <div
                className="absolute pointer-events-auto cursor-pointer group"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(${posX - 27}px, ${posY - 27}px)`,
                }}
                onClick={() => {
                  setActiveGift(gift)
                  if (gift.starGift) {
                    onSelectGift?.(gift.starGift)
                  }
                  onOpenModal?.()
                }}
              >
                {/* Counter-rotation to keep gift always upright */}
                <motion.div
                  animate={{
                    rotate: shouldReduceMotion ? 0 : [0, -360],
                  }}
                  transition={{
                    duration: 36,
                    repeat: Infinity,
                    ease: 'linear',
                    ...(isPaused ? { duration: 999999 } : {}),
                  }}
                  whileHover={{
                    scale: 1.22,
                    zIndex: 50,
                    transition: { type: 'spring', stiffness: 450, damping: 18 },
                  }}
                  whileTap={{ scale: 0.92 }}
                  className="relative flex items-center justify-center"
                >
                  {/* Soft Radiant Glow Backdrop Mesh */}
                  <div
                    className="absolute -inset-2.5 rounded-full blur-md opacity-60 group-hover:opacity-95 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle, ${gift.color}88 0%, ${gift.color}22 65%, transparent 100%)`,
                    }}
                  />

                  {/* Organic Morphic Liquid Jelly Capsule Body */}
                  <motion.div
                    className="w-13.5 h-13.5 rounded-2xl relative flex items-center justify-center backdrop-blur-md transition-all duration-300 overflow-hidden"
                    style={{
                      background: gift.bgGradient,
                      boxShadow: `0 8px 24px -2px ${gift.shadowColor}, inset 0 2px 5px rgba(255, 255, 255, 0.45)`,
                      border: `1px solid rgba(255, 255, 255, 0.45)`,
                    }}
                    animate={{
                      borderRadius: [
                        '52% 48% 58% 42% / 46% 54% 46% 54%',
                        '42% 58% 44% 56% / 58% 42% 58% 42%',
                        '60% 40% 52% 48% / 40% 60% 40% 60%',
                        '50% 50% 44% 56% / 54% 46% 54% 46%',
                        '52% 48% 58% 42% / 46% 54% 46% 54%',
                      ],
                    }}
                    transition={{
                      duration: 6.5 + (idx * 0.4),
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    {/* Glass Glint Highlight */}
                    <div className="absolute top-1 left-2 w-4.5 h-2 rounded-full bg-white/60 blur-[0.6px] -rotate-12 pointer-events-none" />

                    {/* Animated Lottie / 3D Vector Gift Media */}
                    {gift.starGift ? (
                      <StarGiftVisual
                        gift={gift.starGift}
                        accountId={accountId}
                        size="sm"
                        showBackdrop={false}
                        hideBadge={true}
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    ) : (
                      <div className="text-xl filter drop-shadow select-none pointer-events-none">
                        {gift.icon || '🎁'}
                      </div>
                    )}
                  </motion.div>

                  {/* Clean Minimalist Hover Card (No permanent hashtag or name) */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap bg-neutral-900/95 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-sans font-medium text-neutral-100 shadow-xl border border-white/10 z-50 flex items-center gap-1.5">
                    <span>{gift.name}</span>
                    {gift.starGift?.num && (
                      <span className="text-amber-400 font-mono text-[9px] font-bold">
                        #{gift.starGift.num.toLocaleString()}
                      </span>
                    )}
                  </div>
                </motion.div>
              </div>
            </React.Fragment>
          )
        })}
      </motion.div>

      {/* Ripple Feedback On Click */}
      <AnimatePresence>
        {activeGift && (
          <motion.div
            key={activeGift.id + Date.now()}
            className="absolute rounded-full pointer-events-none z-30"
            style={{
              width: 50,
              height: 50,
              border: `2px solid ${activeGift.color}`,
              boxShadow: `0 0 24px ${activeGift.color}`,
            }}
            initial={{ scale: 0.8, opacity: 1 }}
            animate={{ scale: 2.4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            onAnimationComplete={() => setActiveGift(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
