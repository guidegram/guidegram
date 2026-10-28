import React, { useRef, useState, useLayoutEffect, useEffect } from 'react'
import { motion } from 'motion/react'

export interface SmartContextMenuProps {
  x: number
  y: number
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

/**
 * SmartContextMenu
 * Positions a context menu inside the viewport, automatically flipping upwards
 * if overflowing the bottom edge, and clamping horizontally/vertically so no parts
 * ever disappear underneath the application window or taskbar.
 */
export const SmartContextMenu: React.FC<SmartContextMenuProps> = ({
  x,
  y,
  children,
  className = '',
  onClick,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Safe initial positioning before layout measurement
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: Math.max(10, Math.min(y, typeof window !== 'undefined' ? window.innerHeight - 560 : y)),
    left: Math.max(10, Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 260 : x)),
  })

  const updatePosition = () => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const padding = 12
    const winW = window.innerWidth
    const winH = window.innerHeight

    let newLeft = x
    let newTop = y

    // Horizontal overflow check (Right edge)
    if (newLeft + rect.width > winW - padding) {
      newLeft = winW - rect.width - padding
    }
    // Horizontal overflow check (Left edge)
    if (newLeft < padding) {
      newLeft = padding
    }

    // Vertical overflow check (Bottom edge)
    if (newTop + rect.height > winH - padding) {
      // Flip upwards if there is enough space above the cursor
      const flippedTop = y - rect.height
      if (flippedTop >= padding) {
        newTop = flippedTop
      } else {
        // Otherwise clamp to bottom with padding so internal scroll handles the rest
        newTop = Math.max(padding, winH - rect.height - padding)
      }
    }
    // Vertical overflow check (Top edge)
    if (newTop < padding) {
      newTop = padding
    }

    setCoords({ top: newTop, left: newLeft })
  }

  useLayoutEffect(() => {
    updatePosition()
  }, [x, y])

  // Recalculate if window resizes while context menu is open
  useEffect(() => {
    const handleResize = () => updatePosition()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [x, y])

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.94, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -2 }}
      transition={{ type: 'spring', stiffness: 450, damping: 28, mass: 0.7 }}
      style={{
        top: coords.top,
        left: coords.left,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(e)
      }}
      className={`fixed z-50 min-w-[210px] max-w-[280px] max-h-[calc(100vh-24px)] overflow-y-auto bg-dark-850/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md p-1.5 flex flex-col gap-0.5 select-none text-xs context-menu-spring custom-scrollbar ${className}`}
    >
      {children}
    </motion.div>
  )
}
