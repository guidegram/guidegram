import React from 'react'
import { motion, HTMLMotionProps } from 'motion/react'

interface SpringPressProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode
  scaleHover?: number
  scaleTap?: number
  className?: string
}

export const SpringPress: React.FC<SpringPressProps> = ({
  children,
  scaleHover = 1.03,
  scaleTap = 0.96,
  className = '',
  ...props
}) => {
  return (
    <motion.button
      whileHover={{ scale: scaleHover }}
      whileTap={{ scale: scaleTap }}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      className={`cursor-pointer select-none ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}
