import React from 'react'
import { motion } from 'motion/react'
import { Hash, Layers, Lock, Pin, Settings2 } from 'lucide-react'
import { ForumTopicItem } from '../types/telegram'
import { isRTL } from '../utils/textUtils'
import { useI18n } from '../i18n'

interface ForumTopicsBarProps {
  topics: ForumTopicItem[]
  activeTopicId: number | null
  onSelectTopic: (topicId: number | null) => void
  canManage?: boolean
  onManage?: () => void
}

export const ForumTopicsBar: React.FC<ForumTopicsBarProps> = ({
  topics,
  activeTopicId,
  onSelectTopic,
  canManage,
  onManage,
}) => {
  const { t, formatNumber } = useI18n()

  if ((!topics || topics.length === 0) && !canManage) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      className="h-10 shrink-0 bg-dark-900/90 border-b border-white/5 px-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none z-10 backdrop-blur-md"
    >
      {topics.length > 0 && (
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => onSelectTopic(null)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
            activeTopicId === null
              ? 'bg-primary-600 text-white shadow-glow'
              : 'bg-dark-800/80 text-gray-400 hover:text-gray-200 hover:bg-dark-750 border border-white/5'
          }`}
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span>{t('forum_topics.all')}</span>
        </motion.button>
      )}

      {topics.map((topic) => {
        const isActive = activeTopicId === topic.id
        const title =
          topic.id === 1 && topic.title === 'General' ? t('forum_topics.general') : topic.title
        const rtl = isRTL(title)
        const badges = [
          topic.isPinned ? t('forum_topics.pinned_badge') : null,
          topic.isClosed ? t('forum_topics.closed_badge') : null,
          topic.unreadCount && topic.unreadCount > 0
            ? t('forum_topics.unread_badge', { count: formatNumber(topic.unreadCount) })
            : null,
        ].filter(Boolean)

        return (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            key={topic.id}
            type="button"
            onClick={() => onSelectTopic(topic.id)}
            dir={rtl ? 'rtl' : 'ltr'}
            title={`${title}${badges.length ? ` • ${badges.join(' • ')}` : ''}`}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium shrink-0 transition-colors cursor-pointer max-w-[200px] truncate ${
              isActive
                ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40 shadow-glow'
                : 'bg-dark-800/80 text-gray-300 hover:text-white hover:bg-dark-750 border border-white/5'
            }`}
          >
            {topic.isPinned ? (
              <Pin className="w-3 h-3 text-amber-400 shrink-0" />
            ) : topic.isClosed ? (
              <Lock className="w-3 h-3 text-gray-500 shrink-0" />
            ) : (
              <Hash className="w-3.5 h-3.5 text-primary-400 shrink-0" />
            )}

            <span className="truncate">{title}</span>

            {topic.unreadCount && topic.unreadCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-primary-500 text-white text-[9px] font-bold shrink-0">
                {formatNumber(topic.unreadCount)}
              </span>
            ) : null}
          </motion.button>
        )
      })}

      {canManage && onManage && (
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={onManage}
          className="ms-auto flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer bg-dark-800/80 text-gray-300 hover:text-white hover:bg-dark-750 border border-white/5"
        >
          <Settings2 className="w-3.5 h-3.5 shrink-0 text-accent-cyan" />
          <span>{t('forum_topics.manage')}</span>
        </motion.button>
      )}
    </motion.div>
  )
}
