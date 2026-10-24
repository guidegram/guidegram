import React from 'react'
import { motion } from 'motion/react'

interface AmbientAuraMeshProps {
  className?: string
  intensity?: 'subtle' | 'vibrant'
}

export const AmbientAuraMesh: React.FC<AmbientAuraMeshProps> = ({
  className = '',
  intensity = 'vibrant',
}) => {
  const opacity = intensity === 'vibrant' ? 'opacity-70' : 'opacity-40'

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}>
      {/* Orb 1: Violet / Magenta */}
      <motion.div
        className={`absolute w-72 h-72 rounded-full blur-3xl ${opacity}`}
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.65) 0%, rgba(217, 70, 239, 0.25) 50%, transparent 70%)',
          top: '-15%',
          left: '10%',
        }}
        animate={{
          x: [0, 25, -20, 0],
          y: [0, -20, 15, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Orb 2: Electric Cyan / Sky */}
      <motion.div
        className={`absolute w-80 h-80 rounded-full blur-3xl ${opacity}`}
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.55) 0%, rgba(59, 130, 246, 0.25) 55%, transparent 75%)',
          top: '10%',
          right: '-10%',
        }}
        animate={{
          x: [0, -30, 20, 0],
          y: [0, 25, -15, 0],
          scale: [1, 0.9, 1.2, 1],
        }}
        transition={{
          duration: 11,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Orb 3: Emerald / Golden Amber accent */}
      <motion.div
        className={`absolute w-64 h-64 rounded-full blur-3xl ${opacity}`}
        style={{
          background: 'radial-gradient(circle, rgba(234, 179, 8, 0.35) 0%, rgba(16, 185, 129, 0.2) 50%, transparent 70%)',
          bottom: '-10%',
          left: '20%',
        }}
        animate={{
          x: [0, 20, -15, 0],
          y: [0, -15, 20, 0],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{
          duration: 13,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  )
}
