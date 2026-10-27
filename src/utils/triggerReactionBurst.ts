/**
 * triggerReactionBurst.ts
 * Spawns a lightweight, pooled particle burst when clicking or hovering a reaction emoji.
 * Port of Telegram Desktop's reaction_cell.cpp particle emission physics.
 */

interface ReactionParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  life: number
  maxLife: number
  emoji?: string
  color?: string
}

let sharedCanvas: HTMLCanvasElement | null = null
let sharedCtx: CanvasRenderingContext2D | null = null
const activeParticles: ReactionParticle[] = []
let animationFrameId: number | null = null

function ensureCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null
  if (!sharedCanvas) {
    sharedCanvas = document.createElement('canvas')
    sharedCanvas.className = 'pointer-events-none fixed inset-0 z-[99999]'
    sharedCanvas.width = window.innerWidth
    sharedCanvas.height = window.innerHeight
    document.body.appendChild(sharedCanvas)

    window.addEventListener('resize', () => {
      if (sharedCanvas) {
        sharedCanvas.width = window.innerWidth
        sharedCanvas.height = window.innerHeight
      }
    })
  }

  if (!sharedCtx && sharedCanvas) {
    sharedCtx = sharedCanvas.getContext('2d')
  }

  if (!sharedCanvas || !sharedCtx) return null
  return { canvas: sharedCanvas, ctx: sharedCtx }
}

function loop() {
  if (!sharedCtx || !sharedCanvas) return

  sharedCtx.clearRect(0, 0, sharedCanvas.width, sharedCanvas.height)

  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const p = activeParticles[i]
    p.life++
    if (p.life > p.maxLife) {
      activeParticles.splice(i, 1)
      continue
    }

    p.x += p.vx
    p.y += p.vy
    p.vy += 0.12 // gravity
    p.vx *= 0.98 // air friction
    p.alpha = Math.max(0, 1.0 - p.life / p.maxLife)

    sharedCtx.save()
    sharedCtx.globalAlpha = p.alpha

    if (p.emoji) {
      sharedCtx.font = `${Math.round(p.size)}px sans-serif`
      sharedCtx.fillText(p.emoji, p.x, p.y)
    } else {
      sharedCtx.fillStyle = p.color || '#FBBF24'
      sharedCtx.beginPath()
      sharedCtx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2)
      sharedCtx.fill()
    }

    sharedCtx.restore()
  }

  if (activeParticles.length > 0) {
    animationFrameId = requestAnimationFrame(loop)
  } else {
    animationFrameId = null
    sharedCtx.clearRect(0, 0, sharedCanvas.width, sharedCanvas.height)
  }
}

export function triggerReactionBurst(
  originX: number,
  originY: number,
  emoji: string = '⭐',
  count: number = 18
): void {
  const env = ensureCanvas()
  if (!env) return

  const colors = ['#F59E0B', '#FBBF24', '#34D399', '#60A5FA', '#EC4899', '#A78BFA']

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
    const speed = 2.0 + Math.random() * 4.5

    activeParticles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.0, // slight upward boost
      size: i % 4 === 0 ? 18 : 3 + Math.random() * 4,
      alpha: 1.0,
      life: 0,
      maxLife: 28 + Math.random() * 20,
      emoji: i % 4 === 0 ? emoji : undefined,
      color: colors[Math.floor(Math.random() * colors.length)],
    })
  }

  if (!animationFrameId) {
    animationFrameId = requestAnimationFrame(loop)
  }
}
