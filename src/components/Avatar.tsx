import React, { useState, useEffect } from 'react'

interface AvatarProps {
  peerId?: string
  accountId?: string
  title?: string
  initials?: string
  avatarUrl?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  onClick?: (e: React.MouseEvent<HTMLDivElement | HTMLImageElement>) => void
}

// In-memory module cache to avoid refetching avatars across renders
const avatarMemoryCache = new Map<string, string>()

export const Avatar: React.FC<AvatarProps> = ({
  peerId,
  accountId,
  title = 'Chat',
  initials,
  avatarUrl,
  size = 'md',
  className = '',
  onClick,
}) => {
  const cacheKey = accountId && peerId ? `${accountId}_${peerId}` : null
  const cachedUrl = cacheKey ? avatarMemoryCache.get(cacheKey) : null

  const [currentUrl, setCurrentUrl] = useState<string | null>(avatarUrl || cachedUrl || null)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [avatarUrl, currentUrl])

  useEffect(() => {
    if (avatarUrl) {
      setCurrentUrl(avatarUrl)
      if (cacheKey) avatarMemoryCache.set(cacheKey, avatarUrl)
      return
    }

    if (cachedUrl) {
      setCurrentUrl(cachedUrl)
      return
    }

    if (!accountId || !peerId || !window.guidegram?.getProfilePhoto) {
      return
    }

    let isMounted = true
    window.guidegram
      .getProfilePhoto(accountId, peerId)
      .then((photoDataUrl) => {
        if (!isMounted) return
        if (photoDataUrl) {
          if (cacheKey) avatarMemoryCache.set(cacheKey, photoDataUrl)
          setCurrentUrl(photoDataUrl)
        }
      })
      .catch(() => {
        // Silently fall back to gradient initials
      })

    return () => {
      isMounted = false
    }
  }, [accountId, peerId, avatarUrl, cacheKey, cachedUrl])

  const safeInitials =
    initials ||
    (title.trim().length > 0 ? title.trim().substring(0, 2).toUpperCase() : 'C')

  const sizeClasses = {
    xs: 'w-6 h-6 rounded-lg text-[10px]',
    sm: 'w-8 h-8 rounded-xl text-xs',
    md: 'w-11 h-11 rounded-2xl text-xs',
    lg: 'w-12 h-12 rounded-2xl text-sm font-bold',
    xl: 'w-24 h-24 rounded-3xl text-2xl font-black shadow-glow',
  }[size]

  const cursorClass = onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''

  if (currentUrl && !hasError) {
    return (
      <img
        src={currentUrl}
        alt={title}
        onClick={onClick}
        onError={() => setHasError(true)}
        className={`${sizeClasses} object-cover shrink-0 select-none border border-white/10 ${cursorClass} ${className}`}
      />
    )
  }

  return (
    <div
      onClick={onClick}
      className={`${sizeClasses} bg-gradient-to-tr from-primary-600 via-primary-500 to-accent-cyan text-white font-bold flex items-center justify-center shrink-0 select-none shadow-sm border border-white/10 ${cursorClass} ${className}`}
    >
      <span>{safeInitials}</span>
    </div>
  )
}
