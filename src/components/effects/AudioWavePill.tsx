import React, { useState } from 'react'
import { motion } from 'motion/react'
import { Music, Volume2, VolumeX } from 'lucide-react'

interface AudioWavePillProps {
  title?: string
  artist?: string
  className?: string
  initialPlaying?: boolean
}

export const AudioWavePill: React.FC<AudioWavePillProps> = ({
  title = "Stayin' Alive",
  artist = 'Bee Gees',
  className = '',
  initialPlaying = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(initialPlaying)

  return (
    <motion.button
      type="button"
      onClick={() => setIsPlaying(!isPlaying)}
      className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 active:bg-white/20 backdrop-blur-xl border border-white/15 text-xs text-white/90 shadow-lg shadow-black/20 transition-colors cursor-pointer select-none group ${className}`}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Equalizer Waveform Bars */}
      <div className="flex items-center gap-[3px] h-3.5 w-4.5 justify-center">
        {[0, 1, 2, 3].map((barIndex) => (
          <motion.span
            key={barIndex}
            className="w-[2.5px] rounded-full bg-gradient-to-t from-cyan-400 to-fuchsia-400"
            animate={
              isPlaying
                ? {
                    height: ['4px', '14px', '6px', '12px', '4px'],
                  }
                : { height: '3px' }
            }
            transition={{
              duration: 0.9 + barIndex * 0.15,
              repeat: isPlaying ? Infinity : 0,
              ease: 'easeInOut',
              delay: barIndex * 0.12,
            }}
          />
        ))}
      </div>

      {/* Song Info */}
      <span className="font-medium tracking-tight text-white flex items-center gap-1.5">
        <span className="truncate max-w-[120px]">{title}</span>
        <span className="text-white/40">-</span>
        <span className="text-white/60 text-[11px] truncate max-w-[90px]">{artist}</span>
      </span>

      {/* Subtle indicator */}
      <div className="text-white/40 group-hover:text-white/70 transition-colors ml-0.5">
        {isPlaying ? (
          <Volume2 className="w-3 h-3 text-cyan-400" />
        ) : (
          <VolumeX className="w-3 h-3" />
        )}
      </div>
    </motion.button>
  )
}
