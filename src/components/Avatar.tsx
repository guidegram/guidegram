import React, { useState, useEffect } from 'react'

interface AvatarProps {
  peerId?: string
  accountId?: string
  title?: string
  initials?: string
  avatarUrl?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  isChannel?: boolean
  isForum?: boolean
  shape?: 'circle' | 'squircle' | 'droplet'
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
  isChannel,
  isForum,
  shape,
  className = '',
  onClick,
}) => {
  const cacheKey = accountId && peerId ? `${accountId}_${peerId}` : null
  const cachedUrl = cacheKey ? avatarMemoryCache.get(cacheKey) || null : null

  const isPropValid = Boolean(
    avatarUrl &&
      typeof avatarUrl === 'string' &&
      avatarUrl.trim().length > 30 &&
      !avatarUrl.endsWith('base64,')
  )

  const resolvedInitialUrl = isPropValid ? avatarUrl! : cachedUrl

  const [currentUrl, setCurrentUrl] = useState<string | null>(resolvedInitialUrl)
  const [hasError, setHasError] = useState(false)

  // React-recommended pattern: synchronize state during render if identity or avatarUrl prop changes
  const [prevIdentity, setPrevIdentity] = useState<string | null>(cacheKey)
  const [prevAvatarUrlProp, setPrevAvatarUrlProp] = useState<string | undefined>(avatarUrl)
  if (cacheKey !== prevIdentity || avatarUrl !== prevAvatarUrlProp) {
    setPrevIdentity(cacheKey)
    setPrevAvatarUrlProp(avatarUrl)
    if (isPropValid) {
      setCurrentUrl(avatarUrl!)
      if (cacheKey) avatarMemoryCache.set(cacheKey, avatarUrl!)
    } else if (avatarUrl === undefined || avatarUrl === null || avatarUrl === '') {
      if (cacheKey && prevAvatarUrlProp) {
        avatarMemoryCache.delete(cacheKey)
      }
      setCurrentUrl(null)
    } else {
      setCurrentUrl(cachedUrl)
    }
    setHasError(false)
  }

  const isValidUrl =
    Boolean(currentUrl) &&
    typeof currentUrl === 'string' &&
    currentUrl.trim().length > 30 &&
    !currentUrl.endsWith('base64,')

  // Real-time avatar update listener from Telegram MTProto
  useEffect(() => {
    if (!cacheKey || !accountId || !peerId || !window.guidegram?.on) return

    const unsubAvatarUpdated = window.guidegram.on(
      'telegram:user-avatar-updated',
      (payload: { accountId: string; userId: string; avatarUrl?: string }) => {
        if (payload?.accountId === accountId && payload?.userId === peerId) {
          if (payload.avatarUrl) {
            avatarMemoryCache.set(cacheKey, payload.avatarUrl)
            setCurrentUrl(payload.avatarUrl)
            setHasError(false)
          } else {
            avatarMemoryCache.delete(cacheKey)
            setCurrentUrl(null)
          }
        }
      }
    )

    return () => {
      unsubAvatarUpdated?.()
    }
  }, [cacheKey, accountId, peerId])

  useEffect(() => {
    // 1. If avatarUrl prop is already valid and non-empty, use it immediately
    if (isPropValid && avatarUrl) {
      setCurrentUrl(avatarUrl)
      if (cacheKey) avatarMemoryCache.set(cacheKey, avatarUrl)
      setHasError(false)
      return
    }

    // 2. If we already have the full avatar in memory cache, use it immediately
    if (cacheKey && avatarMemoryCache.has(cacheKey)) {
      const cached = avatarMemoryCache.get(cacheKey)!
      if (cached && cached.length > 2000 && !cached.endsWith('base64,')) {
        setCurrentUrl(cached)
        setHasError(false)
        return
      }
    } else if (!cachedUrl) {
      // Identity has no photo in props or cache -> explicitly clear previous avatar
      setCurrentUrl(null)
    }

    // 3. Attempt to fetch profile photo from client if accountId and peerId are available
    if (!accountId || !peerId || !window.guidegram?.getProfilePhoto) {
      return
    }

    let isMounted = true
    window.guidegram
      .getProfilePhoto(accountId, peerId)
      .then((photoDataUrl) => {
        if (!isMounted) return
        if (
          photoDataUrl &&
          typeof photoDataUrl === 'string' &&
          photoDataUrl.length > 50 &&
          !photoDataUrl.endsWith('base64,')
        ) {
          if (cacheKey) avatarMemoryCache.set(cacheKey, photoDataUrl)
          setCurrentUrl(photoDataUrl)
          setHasError(false)
        } else if (!isPropValid) {
          setCurrentUrl(null)
        }
      })
      .catch(() => {
        if (!isMounted) return
        if (!isPropValid) {
          setCurrentUrl(null)
        }
      })

    return () => {
      isMounted = false
    }
  }, [accountId, peerId, avatarUrl, cacheKey, isPropValid, cachedUrl])

  const safeInitials =
    initials ||
    (title.trim().length > 0 ? title.trim().substring(0, 2).toUpperCase() : 'C')

  const resolvedShape: 'circle' | 'squircle' | 'droplet' =
    shape || (isChannel ? 'droplet' : isForum ? 'squircle' : 'circle')

  const dimensionClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-xs',
    lg: 'w-12 h-12 text-sm font-bold',
    xl: 'w-24 h-24 text-2xl font-black shadow-glow',
  }[size]

  let shapeClasses = 'rounded-full border border-white/10'
  if (resolvedShape === 'squircle') {
    const squircleRadius = {
      xs: 'rounded-md',
      sm: 'rounded-lg',
      md: 'rounded-2xl',
      lg: 'rounded-2xl',
      xl: 'rounded-3xl',
    }[size]
    shapeClasses = `${squircleRadius} border border-white/10`
  } else if (resolvedShape === 'droplet') {
    shapeClasses = '[clip-path:url(#guidegram-avatar-droplet)] rounded-none drop-shadow-[0_0_1px_rgba(255,255,255,0.25)]'
  }

  const cursorClass = onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''

  if (isValidUrl && !hasError) {
    return (
      <img
        src={currentUrl!}
        alt=""
        onClick={onClick}
        onError={() => setHasError(true)}
        className={`${dimensionClasses} ${shapeClasses} object-cover shrink-0 select-none ${cursorClass} ${className}`}
      />
    )
  }

  return (
    <div
      onClick={onClick}
      className={`${dimensionClasses} ${shapeClasses} bg-gradient-to-tr from-primary-600 via-primary-500 to-accent-cyan text-white font-bold flex items-center justify-center shrink-0 select-none shadow-sm ${cursorClass} ${className}`}
    >
      <span>{safeInitials}</span>
    </div>
  )
}
