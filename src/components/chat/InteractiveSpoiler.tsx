import React, { useState, useCallback } from 'react'
import { useI18n } from '../../i18n'

export interface InteractiveSpoilerProps {
  children: React.ReactNode
  className?: string
  title?: string
}

/**
 * Interactive Telegram-grade Spoiler component.
 * - Entire spoiler boundary is preserved as a single atomic region.
 * - Intercepts clicks in capture phase when hidden, preventing nested links or hashtags from firing on initial reveal.
 * - Plays particle/dust dissolve shimmer effect when unveiled.
 * - Once revealed, child links/hashtags/mentions become fully interactive.
 */
export const InteractiveSpoiler: React.FC<InteractiveSpoilerProps> = React.memo(
  ({ children, className = '', title }) => {
    const { t } = useI18n()
    const [revealed, setRevealed] = useState(false)
    const [isBursting, setIsBursting] = useState(false)

    const handleClickCapture = useCallback(
      (e: React.MouseEvent) => {
        if (!revealed) {
          // Stop propagation and prevent default in the capture phase so child hashtags or URLs never receive the reveal click
          e.preventDefault()
          e.stopPropagation()
          setRevealed(true)
          setIsBursting(true)
          setTimeout(() => setIsBursting(false), 550)
        }
      },
      [revealed]
    )

    return (
      <span
        onClickCapture={handleClickCapture}
        title={revealed ? undefined : (title || t('spoiler.click_reveal'))}
        className={`telegram-spoiler inline-block align-baseline rounded px-1 transition-all duration-300 relative select-none ${
          revealed ? 'is-revealed select-text cursor-text' : 'is-hidden cursor-pointer'
        } ${isBursting ? 'is-bursting' : ''} ${className}`}
      >
        {children}
      </span>
    )
  }
)

InteractiveSpoiler.displayName = 'InteractiveSpoiler'
