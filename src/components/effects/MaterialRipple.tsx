import React, { useState, useLayoutEffect, useCallback } from 'react'

interface RippleInstance {
  id: number
  x: number
  y: number
  size: number
}

interface MaterialRippleProps {
  color?: string
  duration?: number
}

export const MaterialRipple: React.FC<MaterialRippleProps> = ({
  color = 'rgba(255, 255, 255, 0.25)',
  duration = 600,
}) => {
  const [ripples, setRipples] = useState<RippleInstance[]>([])

  const createRipple = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.currentTarget
      const rect = target.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height) * 2
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2

      const newRipple: RippleInstance = {
        id: Date.now() + Math.random(),
        x,
        y,
        size,
      }

      setRipples((prev) => [...prev, newRipple])

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id))
      }, duration)
    },
    [duration]
  )

  return (
    <div
      onMouseDown={createRipple}
      className="absolute inset-0 overflow-hidden pointer-events-auto rounded-[inherit] z-0"
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full pointer-events-none animate-ripple"
          style={{
            left: `${r.x}px`,
            top: `${r.y}px`,
            width: `${r.size}px`,
            height: `${r.size}px`,
            backgroundColor: color,
            animationDuration: `${duration}ms`,
          }}
        />
      ))}
    </div>
  )
}
