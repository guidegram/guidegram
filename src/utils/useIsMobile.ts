import { useState, useEffect } from 'react'

/**
 * Hook to detect whether the user is on a mobile device / narrow viewport.
 * Dynamically reacts to window resize and touch capability.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const isNarrow = window.innerWidth < breakpoint
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    return (hasTouch && isNarrow) || isMobileUA || isNarrow
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isNarrow = window.innerWidth < breakpoint
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile((hasTouch && isNarrow) || isMobileUA || isNarrow)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [breakpoint])

  return isMobile
}
