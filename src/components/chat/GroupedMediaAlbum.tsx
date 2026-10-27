import React from 'react'
import type { MessageItem } from '../../types/telegram'
import { computeGroupedMediaLayout, MediaDimensions } from '../../utils/groupedMediaLayout'

interface GroupedMediaAlbumProps {
  messages: MessageItem[]
  containerWidth?: number
  downloadedMedia: Record<string, string>
  onOpenViewer: (msg: MessageItem, url?: string) => void
  onRequestDownload: (msg: MessageItem) => void
}

export const GroupedMediaAlbum: React.FC<GroupedMediaAlbumProps> = ({
  messages,
  containerWidth = 380,
  downloadedMedia,
  onOpenViewer,
  onRequestDownload,
}) => {
  if (messages.length === 0) return null

  const items: MediaDimensions[] = messages.map((m) => ({
    id: m.id,
    width: 800,
    height: 600,
    aspectRatio: 800 / 600,
  }))

  const layoutItems = computeGroupedMediaLayout(items, containerWidth, 380, 4, 14)

  // Calculate total bounding height of the album grid
  const maxBottom = layoutItems.reduce((max, it) => Math.max(max, it.y + it.layoutHeight), 0)

  return (
    <div
      className="relative select-none overflow-hidden rounded-2xl bg-dark-900/40 border border-white/10 mb-2"
      style={{ width: `${containerWidth}px`, height: `${maxBottom}px` }}
    >
      {layoutItems.map((layout, idx) => {
        const msg = messages[idx]
        if (!msg) return null
        const mediaUrl = downloadedMedia[msg.id] || msg.mediaUrl

        if (!mediaUrl) {
          onRequestDownload(msg)
        }

        const borderRadius = `${layout.corners.tl}px ${layout.corners.tr}px ${layout.corners.br}px ${layout.corners.bl}px`

        return (
          <div
            key={msg.id}
            onClick={() => onOpenViewer(msg, mediaUrl)}
            className="absolute cursor-pointer overflow-hidden group bg-dark-800 transition-transform duration-150 hover:brightness-105 active:scale-[0.99]"
            style={{
              left: `${layout.x}px`,
              top: `${layout.y}px`,
              width: `${layout.layoutWidth}px`,
              height: `${layout.layoutHeight}px`,
              borderRadius,
            }}
            title="Click to view full photo"
          >
            {mediaUrl ? (
              <img
                src={mediaUrl}
                alt="Album item"
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-102"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-dark-850 text-gray-500">
                <div className="w-5 h-5 border-2 border-white/20 border-t-accent-cyan rounded-full animate-spin" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
          </div>
        )
      })}
    </div>
  )
}
