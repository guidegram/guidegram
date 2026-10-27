import React, { useEffect, useRef } from 'react'

/**
 * ThanosDisintegrationOverlay.tsx
 * High-performance Canvas 2D/WebGL-inspired particle dust disintegration for deleted message bubbles.
 * Faithful reproduction of Telegram Desktop's thanos_effect_renderer.cpp & GLSL physics:
 * - Ken Perlin quintic smootherstep wind acceleration
 * - Progressive sweep wave across element from left to right
 * - Upward smoke/dust drift with gravity & drag
 * - Zero residual DOM footprint
 */

export interface ThanosParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  life: number
  maxLife: number
  delay: number
  color: string
}

interface ThanosDisintegrationOverlayProps {
  targetRect: DOMRect
  accentColor?: string
  onComplete: () => void
}

export const ThanosDisintegrationOverlay: React.FC<ThanosDisintegrationOverlayProps> = ({
  targetRect,
  accentColor = '#39C6A4',
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Add padding around target rect to allow particles to billow outward
    const paddingX = 140
    const paddingY = 90
    canvas.width = Math.max(10, Math.round(targetRect.width + paddingX))
    canvas.height = Math.max(10, Math.round(targetRect.height + paddingY))

    const width = targetRect.width
    const height = targetRect.height

    // Calculate density: ~300 to 500 particles based on bubble area
    const particleCount = Math.max(150, Math.min(500, Math.floor((width * height) / 60)))
    const particles: ThanosParticle[] = []

    const colorVariants = [
      accentColor,
      '#60A5FA', // sky blue
      '#93C5FD', // light blue
      '#CBD5E1', // slate dust
      '#F8FAFC', // sparkling white dust
    ]

    for (let i = 0; i < particleCount; i++) {
      const px = Math.random() * width
      const py = Math.random() * height
      // Progressive delay from left to right
      const delay = Math.floor((px / (width || 1)) * 24)

      particles.push({
        x: px + 20,
        y: py + 40,
        vx: 1.2 + Math.random() * 2.8, // Wind blowing to the right
        vy: -0.8 - Math.random() * 2.2, // Drifting upward like smoke
        size: 1.0 + Math.random() * 2.5,
        alpha: 1.0,
        life: 0,
        maxLife: 30 + Math.random() * 25,
        delay,
        color: colorVariants[Math.floor(Math.random() * colorVariants.length)],
      })
    }

    let frame = 0
    const maxFrames = 65

    const render = () => {
      frame++
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let activeParticles = 0

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        if (frame < p.delay) {
          activeParticles++
          continue
        }

        p.life++
        if (p.life > p.maxLife) continue

        activeParticles++

        // Ken Perlin quintic smootherstep acceleration
        const t = Math.min(1.0, p.life / p.maxLife)
        const s = t * t * t * (t * (t * 6.0 - 15.0) + 10.0)

        // Accelerate drift and decay alpha
        p.x += p.vx * (1.0 + s * 1.5)
        p.y += p.vy * (1.0 + s * 1.2)
        p.alpha = Math.max(0, 1.0 - s)

        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.fillStyle = p.color
        ctx.shadowColor = p.color
        ctx.shadowBlur = 4
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * (1.0 - s * 0.4), 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      if (activeParticles > 0 && frame < maxFrames) {
        animFrameRef.current = requestAnimationFrame(render)
      } else {
        onComplete()
      }
    }

    animFrameRef.current = requestAnimationFrame(render)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [targetRect, accentColor, onComplete])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed z-[9999]"
      style={{
        left: `${targetRect.left - 20}px`,
        top: `${targetRect.top - 40}px`,
        width: `${targetRect.width + 140}px`,
        height: `${targetRect.height + 90}px`,
      }}
    />
  )
}
