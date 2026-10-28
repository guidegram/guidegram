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

// In-memory module cache to avoid refetching avatars across renders (only holds crystal-clear HD photos)
const avatarMemoryCache = new Map<string, string>()
// Module-level deduplicator for in-flight photo requests
const pendingAvatarRequests = new Map<string, Promise<string | null>>()

const isHdPhoto = (url?: string | null): boolean => {
  if (!url || typeof url !== 'string') return false
  if (url.endsWith('base64,')) return false
  if (!url.startsWith('data:image/')) return url.length > 20
  return url.length >= 2000
}

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

  const resolvedInitialUrl = isHdPhoto(cachedUrl)
    ? cachedUrl
    : isHdPhoto(avatarUrl)
      ? avatarUrl!
      : (avatarUrl || cachedUrl)

  const [currentUrl, setCurrentUrl] = useState<string | null>(resolvedInitialUrl)
  const [hasError, setHasError] = useState(false)

  // React-recommended pattern: synchronize state during render if identity or avatarUrl prop changes
  const [prevIdentity, setPrevIdentity] = useState<string | null>(cacheKey)
  const [prevAvatarUrlProp, setPrevAvatarUrlProp] = useState<string | undefined>(avatarUrl)
  if (cacheKey !== prevIdentity || avatarUrl !== prevAvatarUrlProp) {
    setPrevIdentity(cacheKey)
    setPrevAvatarUrlProp(avatarUrl)
    if (isHdPhoto(avatarUrl)) {
      setCurrentUrl(avatarUrl!)
      if (cacheKey) avatarMemoryCache.set(cacheKey, avatarUrl!)
    } else if (cachedUrl && isHdPhoto(cachedUrl)) {
      setCurrentUrl(cachedUrl)
    } else if (isPropValid) {
      setCurrentUrl(avatarUrl!) // Progressive thumbnail preview
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
      (payload: { accountId: string; userId?: string; peerId?: string; avatarUrl?: string }) => {
        const targetId = payload?.peerId || payload?.userId
        const cleanTarget = typeof targetId === 'string' ? targetId.replace(/^-100/, '').replace(/^-/, '') : ''
        const cleanPeer = typeof peerId === 'string' ? peerId.replace(/^-100/, '').replace(/^-/, '') : ''
        const isMatch = targetId === peerId || (cleanTarget && cleanPeer && cleanTarget === cleanPeer)

        if (payload?.accountId === accountId && isMatch) {
          if (payload.avatarUrl && isHdPhoto(payload.avatarUrl)) {
            avatarMemoryCache.set(cacheKey, payload.avatarUrl)
            setCurrentUrl(payload.avatarUrl)
            setHasError(false)
          } else if (payload.avatarUrl === '' || payload.avatarUrl === null) {
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
    // 1. If avatarUrl prop is already a crystal-clear HD photo, use and cache it
    if (isHdPhoto(avatarUrl)) {
      setCurrentUrl(avatarUrl!)
      if (cacheKey) avatarMemoryCache.set(cacheKey, avatarUrl!)
      setHasError(false)
      return
    }

    // 2. If we already have the full HD avatar in memory cache, use it immediately
    if (cacheKey && avatarMemoryCache.has(cacheKey)) {
      const cached = avatarMemoryCache.get(cacheKey)!
      if (isHdPhoto(cached)) {
        setCurrentUrl(cached)
        setHasError(false)
        return
      }
    }

    // If we have a progressive thumbnail, display it immediately as placeholder
    if (isPropValid && avatarUrl) {
      setCurrentUrl(avatarUrl)
      setHasError(false)
    } else if (!cachedUrl) {
      setCurrentUrl(null)
    }

    // 3. Attempt to fetch profile photo from client if accountId and peerId are available
    if (!accountId || !peerId || !window.guidegram?.getProfilePhoto) {
      return
    }

    let isMounted = true
    const reqKey = `${accountId}_${peerId}`
    let fetchPromise = pendingAvatarRequests.get(reqKey)
    if (!fetchPromise) {
      fetchPromise = window.guidegram
        .getProfilePhoto(accountId, peerId)
        .catch(() => null)
        .finally(() => {
          pendingAvatarRequests.delete(reqKey)
        })
      pendingAvatarRequests.set(reqKey, fetchPromise)
    }

    fetchPromise.then((photoDataUrl) => {
      if (!isMounted) return
      if (photoDataUrl && isHdPhoto(photoDataUrl)) {
        if (cacheKey) avatarMemoryCache.set(cacheKey, photoDataUrl)
        setCurrentUrl(photoDataUrl)
        setHasError(false)
      } else if (!isPropValid && (!photoDataUrl || photoDataUrl.length < 50)) {
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
