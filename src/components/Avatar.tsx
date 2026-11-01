import React, { useState, useEffect } from 'react'
import { Bookmark } from 'lucide-react'

interface AvatarProps {
  peerId?: string
  accountId?: string
  title?: string
  initials?: string
  avatarUrl?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  isChannel?: boolean
  isForum?: boolean
  isSavedMessages?: boolean
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
  isSavedMessages,
  shape,
  className = '',
  onClick,
}) => {
  const isSaved = Boolean(
    isSavedMessages ||
    title === 'Saved Messages' ||
    title === 'پیام‌های ذخیره‌شده' ||
    peerId === 'self' ||
    peerId === 'me'
  )

  const cacheKey = accountId && peerId ? `${accountId}_${peerId}` : null
  const cachedUrl = cacheKey ? avatarMemoryCache.get(cacheKey) || null : null

  const isPropValid = Boolean(
    avatarUrl &&
      typeof avatarUrl === 'string' &&
      avatarUrl.trim().length > 30 &&
      !avatarUrl.endsWith('base64,')
  )

  // Derived effective avatar URL with negative caching support
  const effectiveUrl = React.useMemo(() => {
    if (cachedUrl && cachedUrl !== 'NO_PHOTO') return cachedUrl
    if (isPropValid) return avatarUrl!
    if (cachedUrl === 'NO_PHOTO') return null
    return null
  }, [cachedUrl, isPropValid, avatarUrl])

  const [currentUrl, setCurrentUrl] = useState<string | null>(effectiveUrl)
  const [hasError, setHasError] = useState(false)

  // Synchronize state when effective URL changes (without setState during render)
  useEffect(() => {
    setCurrentUrl(effectiveUrl)
    setHasError(false)
  }, [effectiveUrl])

  // Lazy fetch full photo only when missing or when requested for large avatar views (lg, xl)
  useEffect(() => {
    if (!accountId || !peerId || !cacheKey || !window.guidegram?.getProfilePhoto) return
    // If already cached (including negative result) or valid prop provided for regular sizes, skip IPC fetch
    if (avatarMemoryCache.has(cacheKey)) return
    if (isPropValid && size !== 'lg' && size !== 'xl') return

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
      if (photoDataUrl && photoDataUrl.length > 30) {
        avatarMemoryCache.set(cacheKey, photoDataUrl)
        setCurrentUrl(photoDataUrl)
        setHasError(false)
      } else {
        // Negative caching: remember that this peer has no photo to prevent infinite fetch storm
        avatarMemoryCache.set(cacheKey, 'NO_PHOTO')
        if (!isPropValid) {
          setCurrentUrl(null)
        }
      }
    })

    return () => {
      isMounted = false
    }
  }, [accountId, peerId, cacheKey, isPropValid, size])

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

  if (isSaved) {
    const iconSizeClasses = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-10 h-10',
    }[size]
    return (
      <div
        onClick={onClick}
        title="Saved Messages"
        className={`${dimensionClasses} ${shapeClasses} bg-gradient-to-tr from-primary-600 via-primary-500 to-accent-cyan text-white flex items-center justify-center shrink-0 select-none shadow-sm ${cursorClass} ${className}`}
      >
        <Bookmark className={`${iconSizeClasses} fill-current text-white`} />
      </div>
    )
  }

  const isValidUrl =
    Boolean(currentUrl) &&
    typeof currentUrl === 'string' &&
    currentUrl.trim().length > 30 &&
    !currentUrl.endsWith('base64,')

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
