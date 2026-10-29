import React, { useState, useEffect, useRef } from 'react'
import lottie from 'lottie-web'
import { Gift } from 'lucide-react'
import { StarGiftItem } from '../types/telegram'

interface StarGiftVisualProps {
  gift: StarGiftItem
  accountId: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showBackdrop?: boolean
  interactive?: boolean
  onClick?: () => void
}

const sizeClasses = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-10 h-10 text-sm',
  md: 'w-14 h-14 text-base',
  lg: 'w-20 h-20 text-xl',
  xl: 'w-28 h-28 text-2xl',
}

const mediaSizeClasses = {
  xs: 'w-5 h-5',
  sm: 'w-7 h-7',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-22 h-22',
}

// Global in-memory cache to prevent re-fetching across re-renders
const mediaCache = new Map<string, { format: 'lottie' | 'video' | 'image'; data?: any; url?: string }>()

export const StarGiftVisual: React.FC<StarGiftVisualProps> = ({
  gift,
  accountId,
  size = 'md',
  className = '',
  showBackdrop = true,
  interactive = false,
  onClick,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const docId = gift.documentId || gift.id

  const [payload, setPayload] = useState<{
    format: 'lottie' | 'video' | 'image'
    data?: any
    url?: string
  } | null>(() => {
    if (gift.lottieData) return { format: 'lottie', data: gift.lottieData }
    if (gift.mediaUrl && gift.mediaFormat) {
      return { format: gift.mediaFormat, url: gift.mediaUrl }
    }
    return mediaCache.get(docId) || null
  })

  const [isLoading, setIsLoading] = useState(!payload && Boolean(gift.documentId))

  // Fetch media if not available
  useEffect(() => {
    if (payload) return
    if (!docId || !accountId) {
      setIsLoading(false)
      return
    }

    if (mediaCache.has(docId)) {
      setPayload(mediaCache.get(docId)!)
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)

    if (window.guidegram?.getStarGiftMedia) {
      window.guidegram
        .getStarGiftMedia(accountId, docId, gift.rawDocument)
        .then((res) => {
          if (!isMounted) return
          if (res) {
            mediaCache.set(docId, res)
            setPayload(res)
          }
          setIsLoading(false)
        })
        .catch((err) => {
          console.warn('[StarGiftVisual] Failed to load star gift media:', err)
          if (isMounted) setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }

    return () => {
      isMounted = false
    }
  }, [accountId, docId, gift.rawDocument, payload])

  // Mount Lottie animation instance
  useEffect(() => {
    if (payload?.format === 'lottie' && payload.data && containerRef.current) {
      const container = containerRef.current
      container.innerHTML = ''
      try {
        const anim = lottie.loadAnimation({
          container,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: payload.data,
        })
        return () => {
          anim.destroy()
        }
      } catch (err) {
        console.warn('[StarGiftVisual] Lottie animation error:', err)
      }
    }
  }, [payload])

  // Determine vibrant backdrop colors from Telegram metadata
  const centerColor = gift.backdrop?.centerColor || '#F59E0B'
  const edgeColor = gift.backdrop?.edgeColor || '#D97706'

  const backdropStyle: React.CSSProperties = showBackdrop
    ? {
        background: `radial-gradient(circle at 35% 30%, ${centerColor}33, ${edgeColor}77)`,
        boxShadow: `0 4px 16px ${edgeColor}44, inset 0 1px 2px rgba(255,255,255,0.35)`,
        borderColor: `${centerColor}55`,
      }
    : {}

  return (
    <div
      onClick={onClick}
      style={backdropStyle}
      className={`relative flex items-center justify-center rounded-2xl overflow-hidden transition-all duration-300 ${
        sizeClasses[size]
      } ${
        showBackdrop
          ? 'backdrop-blur-md border border-white/20'
          : ''
      } ${
        interactive ? 'cursor-pointer hover:scale-110 active:scale-95' : ''
      } ${className}`}
      title={gift.title || `${gift.stars} Stars Gift`}
    >
      {/* Specular curved glass reflection for Telegram Liquid Jelly aesthetic */}
      {showBackdrop && (
        <div className="absolute top-0.5 left-1 right-2 h-1/3 rounded-full bg-gradient-to-b from-white/40 to-transparent pointer-events-none opacity-80" />
      )}

      {/* 1. Lottie Vector Animation */}
      {payload?.format === 'lottie' ? (
        <div
          ref={containerRef}
          className={`${mediaSizeClasses[size]} flex items-center justify-center select-none pointer-events-none drop-shadow-md`}
        />
      ) : payload?.format === 'video' && payload.url ? (
        /* 2. WebM / MP4 Looping Video Sticker */
        <video
          src={payload.url}
          autoPlay
          loop
          muted
          playsInline
          className={`${mediaSizeClasses[size]} object-contain pointer-events-none drop-shadow-md`}
        />
      ) : payload?.format === 'image' && payload.url ? (
        /* 3. WebP / PNG Image */
        <img
          src={payload.url}
          alt={gift.title || 'Star Gift'}
          className={`${mediaSizeClasses[size]} object-contain select-none pointer-events-none drop-shadow-md`}
        />
      ) : isLoading ? (
        /* 4. Glassmorphic Loading State */
        <div className="flex items-center justify-center">
          <div className="w-4 h-4 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
        </div>
      ) : (
        /* 5. Elegant Telegram Star Fallback */
        <div className="flex items-center justify-center text-amber-300">
          <Gift className={`${mediaSizeClasses[size]} p-0.5 drop-shadow-sm`} />
        </div>
      )}

      {/* Collectible Unique Badge (#123) if available */}
      {gift.num !== undefined && size !== 'xs' && (
        <div className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/65 backdrop-blur-xs text-[8px] font-mono font-bold text-amber-300 border border-amber-400/30 leading-tight select-none">
          #{gift.num}
        </div>
      )}
    </div>
  )
}
