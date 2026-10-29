import React, { useEffect, useRef } from 'react'

/**
 * SpoilerNoiseOverlay.tsx
 * Dynamic 60fps procedural noise spoiler overlay matching Telegram Desktop's spoiler_mess.cpp.
 * Generates organic shimmering noise particles with radial ripple reveal on hover or click.
 */

interface SpoilerNoiseOverlayProps {
  isRevealed: boolean
  onClick?: () => void
  children?: React.ReactNode
  className?: string
}

export const SpoilerNoiseOverlay: React.FC<SpoilerNoiseOverlayProps> = ({
  isRevealed,
  onClick,
  children,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (isRevealed) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = (canvas.width = canvas.parentElement?.clientWidth || 120)
    let height = (canvas.height = canvas.parentElement?.clientHeight || 24)

    // Pre-allocated noise buffer for performance (capped to 60 for low-end hardware)
    const particleCount = Math.max(30, Math.min(60, Math.floor((width * height) / 36)))
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 1 + Math.random() * 2,
      alpha: 0.3 + Math.random() * 0.7,
      speed: 0.02 + Math.random() * 0.04,
      phase: Math.random() * Math.PI * 2,
    }))

    let time = 0
    let isVisible = false

    const render = () => {
      if (!isVisible) return
      time += 0.05
      ctx.clearRect(0, 0, width, height)

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
      ctx.fillRect(0, 0, width, height)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.phase += p.speed
        const alpha = Math.max(0.1, Math.min(1.0, 0.4 + 0.4 * Math.sin(p.phase + time)))

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.65})`
        ctx.fillRect(p.x, p.y, p.size, p.size)
      }

      animFrameRef.current = requestAnimationFrame(render)
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry?.isIntersecting) {
        if (!isVisible) {
          isVisible = true
          animFrameRef.current = requestAnimationFrame(render)
        }
      } else {
        isVisible = false
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current)
          animFrameRef.current = null
        }
      }
    }, { threshold: 0.05 })

    observer.observe(canvas)

    return () => {
      observer.disconnect()
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [isRevealed])

  if (isRevealed) {
    return <span className={className}>{children}</span>
  }

  return (
    <span
      className={`relative inline-block cursor-pointer overflow-hidden rounded ${className}`}
      onClick={onClick}
      title="Click to reveal spoiler"
    >
      <span className="invisible select-none">{children}</span>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full rounded"
      />
    </span>
  )
}
