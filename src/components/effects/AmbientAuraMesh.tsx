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
  const opacity = intensity === 'vibrant' ? 'opacity-50' : 'opacity-25'

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}>
      {/* Orb 1: Violet / Magenta */}
      <div
        className={`absolute w-72 h-72 rounded-full ${opacity}`}
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.45) 0%, rgba(217, 70, 239, 0.15) 50%, transparent 70%)',
          top: '-15%',
          left: '10%',
        }}
      />

      {/* Orb 2: Electric Cyan / Sky */}
      <div
        className={`absolute w-80 h-80 rounded-full ${opacity}`}
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, rgba(59, 130, 246, 0.15) 55%, transparent 75%)',
          top: '10%',
          right: '-10%',
        }}
      />

      {/* Orb 3: Emerald / Golden Amber accent */}
      <div
        className={`absolute w-64 h-64 rounded-full ${opacity}`}
        style={{
          background: 'radial-gradient(circle, rgba(234, 179, 8, 0.25) 0%, rgba(16, 185, 129, 0.1) 50%, transparent 70%)',
          bottom: '-10%',
          left: '20%',
        }}
      />
    </div>
  )
}
