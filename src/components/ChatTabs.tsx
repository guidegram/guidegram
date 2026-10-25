import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MessageSquare, Users, Radio, Bot, BellRing, Layers, CheckCheck, Folder, Archive, ArrowLeft, ArrowRight, Palette } from 'lucide-react'
import { CloudFolderItem } from '../types/telegram'
import { useI18n } from '../i18n'

export type TabCategory = 'all' | 'users' | 'groups' | 'channels' | 'bots' | 'unread' | string

interface ChatTabsProps {
  accountId?: string
  activeTab: TabCategory
  onTabChange: (tab: TabCategory) => void
  unreadCounts: Record<string, number>
  markAllReadEnabled?: boolean
  onMarkAllAsRead?: (category?: TabCategory) => Promise<boolean> | void
  onCloudFoldersLoaded?: (folders: CloudFolderItem[]) => void
  cloudFolders?: CloudFolderItem[]
}

export const TELEGRAM_FOLDER_TAG_COLORS: Record<number, string> = {
  0: '#2481cc',
  1: '#e5a91b',
  2: '#8544e3',
  3: '#4bb34b',
  4: '#e53935',
  5: '#e91e63',
  6: '#00acc1',
}

export const ChatTabs: React.FC<ChatTabsProps> = ({
  accountId,
  activeTab,
  onTabChange,
  unreadCounts,
  markAllReadEnabled = true,
  onMarkAllAsRead,
  onCloudFoldersLoaded,
  cloudFolders: cloudFoldersProp,
}) => {
  const { t, isRTL, formatNumber } = useI18n()
  const [isMarking, setIsMarking] = React.useState(false)
  const [cloudFolders, setCloudFolders] = React.useState<CloudFolderItem[]>([])
  const [tabContextMenu, setTabContextMenu] = React.useState<{
    x: number
    y: number
    tabId: TabCategory
    tabLabel: string
  } | null>(null)

  // Load cloud folders whenever active account changes
  React.useEffect(() => {
    if (!accountId) {
      setCloudFolders([])
      return
    }
    let isMounted = true
    const fetchFolders = () => {
      if (window.guidegram?.getCloudFolders) {
        window.guidegram
          .getCloudFolders(accountId)
          .then((folders) => {
            if (isMounted && Array.isArray(folders) && folders.length > 0) {
              setCloudFolders(folders)
              onCloudFoldersLoaded?.(folders)
            }
          })
          .catch(() => {})
      }
    }

    fetchFolders()
    const timer = setTimeout(fetchFolders, 2500)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [accountId])

  // Close context menu on global click or Escape
  React.useEffect(() => {
    const closeMenu = () => setTabContextMenu(null)
    window.addEventListener('click', closeMenu)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTabContextMenu(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const standardTabs: { id: TabCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: t('tab.all'), icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'users', label: t('tab.personal'), icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'groups', label: t('tab.groups'), icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'channels', label: t('tab.channels'), icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'bots', label: t('tab.bots'), icon: <Bot className="w-3.5 h-3.5" /> },
    { id: 'unread', label: t('tab.unread'), icon: <BellRing className="w-3.5 h-3.5" /> },
    ...(activeTab === 'archived'
      ? [{ id: 'archived', label: t('tab.archived'), icon: <Archive className="w-3.5 h-3.5 text-teal-400" /> }]
      : []),
  ]

  const effectiveFolders = (cloudFoldersProp && cloudFoldersProp.length > 0)
    ? cloudFoldersProp
    : cloudFolders

  const folderTabs: { id: TabCategory; label: string; icon: React.ReactNode; color?: number; folderId?: number }[] = effectiveFolders.map((f) => {
    let titleStr = 'Folder'
    if (typeof f.title === 'string') {
      titleStr = f.title
    } else if (f.title && typeof f.title === 'object') {
      titleStr = (f.title as any).text || 'Folder'
    }
    const tagColor = f.color !== undefined ? TELEGRAM_FOLDER_TAG_COLORS[f.color] : undefined
    return {
      id: `folder:${f.id}`,
      label: titleStr,
      icon: f.emoticon ? (
        <span className="text-xs leading-none">{f.emoticon}</span>
      ) : (
        <Folder
          className="w-3.5 h-3.5"
          style={{ color: tagColor || '#00acc1' }}
        />
      ),
      color: f.color,
      folderId: f.id,
    }
  })

  const allTabs = [...standardTabs, ...folderTabs]

  const totalUnread = unreadCounts.all || 0
  const currentTabUnread = unreadCounts[activeTab] || 0

  const handleMarkTab = async (cat?: TabCategory) => {
    if (!onMarkAllAsRead || isMarking) return
    setIsMarking(true)
    try {
      await onMarkAllAsRead(cat)
    } finally {
      setIsMarking(false)
      setTabContextMenu(null)
    }
  }

  const handleMoveFolder = async (folderId: number, direction: 'left' | 'right') => {
    if (!accountId) return
    const idx = effectiveFolders.findIndex((f) => f.id === folderId)
    if (idx === -1) return
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= effectiveFolders.length) return

    const newFolders = [...effectiveFolders]
    const temp = newFolders[idx]
    newFolders[idx] = newFolders[targetIdx]
    newFolders[targetIdx] = temp

    setCloudFolders(newFolders)
    onCloudFoldersLoaded?.(newFolders)
    setTabContextMenu(null)

    try {
      if (window.guidegram?.updateDialogFiltersOrder) {
        await window.guidegram.updateDialogFiltersOrder(
          accountId,
          newFolders.map((f) => f.id)
        )
      }
    } catch (err) {
      console.warn('Failed to reorder folders:', err)
    }
  }

  const handleSetFolderColor = async (folderId: number, colorIndex: number) => {
    if (!accountId) return
    const target = effectiveFolders.find((f) => f.id === folderId)
    if (!target) return

    const updated = effectiveFolders.map((f) => (f.id === folderId ? { ...f, color: colorIndex } : f))
    setCloudFolders(updated)
    onCloudFoldersLoaded?.(updated)
    setTabContextMenu(null)

    try {
      if (window.guidegram?.updateDialogFilter) {
        await window.guidegram.updateDialogFilter(accountId, folderId, {
          title: target.title,
          emoticon: target.emoticon,
          color: colorIndex,
          pinnedPeers: target.pinnedPeerIds || [],
          includePeers: target.includePeerIds || [],
          excludePeers: target.excludePeerIds || [],
          contacts: target.contacts,
          nonContacts: target.nonContacts,
          groups: target.groups,
          broadcasts: target.broadcasts,
          bots: target.bots,
          excludeMuted: target.excludeMuted,
          excludeRead: target.excludeRead,
          excludeArchived: target.excludeArchived,
        })
      }
    } catch (err) {
      console.warn('Failed to update folder color:', err)
    }
  }

  return (
    <div className="w-full shrink-0 flex items-center gap-1 px-2.5 py-2 border-b border-white/5 overflow-x-auto scrollbar-none titlebar-no-drag relative kinetic-tab-rail">
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-none kinetic-tab-rail">
        {allTabs.map((tab) => {
          const isActive = activeTab === tab.id
          const count = unreadCounts[tab.id] || 0

          return (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              onClick={() => onTabChange(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                setTabContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  tabId: tab.id,
                  tabLabel: tab.label,
                })
              }}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer touch-hit-slop min-h-[36px] ${
                isActive
                  ? 'text-primary-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {isActive && (
                <>
                  <motion.span
                    layoutId="activeChatTabIndicator"
                    transition={{ type: 'spring', damping: 28, stiffness: 420, mass: 0.7 }}
                    className="absolute inset-0 rounded-xl bg-primary-600/20 border border-primary-500/30 shadow-sm"
                  />
                  <motion.span
                    layoutId="activeChatTabUnderline"
                    transition={{ type: 'spring', damping: 26, stiffness: 400, mass: 0.6 }}
                    className="absolute bottom-0 left-2.5 right-2.5 h-[2px] rounded-full bg-primary-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                  />
                </>
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {tab.icon}
                <span>{tab.label}</span>
                {count > 0 && (
                  <motion.span
                    layout
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className={`tab-badge-pop ${isRTL ? 'mr-1' : 'ml-1'} px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-primary-500 text-white' : 'bg-dark-750 text-gray-400'
                    }`}
                  >
                    {formatNumber(count)}
                  </motion.span>
                )}
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* 64Gram Power Feature: Dynamic Mark Read Button */}
      {markAllReadEnabled && onMarkAllAsRead && (totalUnread > 0 || currentTabUnread > 0) && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleMarkTab(activeTab !== 'all' ? activeTab : undefined)}
          disabled={isMarking}
          title={
            activeTab !== 'all'
              ? t('tab.mark_read_title', { label: allTabs.find((t) => t.id === activeTab)?.label || '' })
              : t('tab.mark_all_chats_read')
          }
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-accent-cyan hover:text-white bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/20 transition-all shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCheck className={`w-3.5 h-3.5 ${isMarking ? 'animate-pulse text-gray-400' : ''}`} />
          <span className="text-[11px] hidden sm:inline">
            {isMarking
              ? t('tab.marking')
              : activeTab !== 'all'
              ? t('tab.mark_read', { label: allTabs.find((t) => t.id === activeTab)?.label || '' })
              : t('tab.mark_all_read')}
          </span>
        </motion.button>
      )}

      {/* Tab Context Menu */}
      <AnimatePresence>
        {tabContextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ type: 'spring', damping: 24, stiffness: 350 }}
            dir={isRTL ? 'rtl' : 'ltr'}
            style={{ top: tabContextMenu.y, left: tabContextMenu.x }}
            className="fixed z-50 w-52 bg-dark-850/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md p-1.5 flex flex-col gap-0.5 select-none text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {tabContextMenu.tabId.startsWith('folder:') && (
              <>
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Folder Order & Tags
                </div>
                {(() => {
                  const fId = Number(tabContextMenu.tabId.replace('folder:', ''))
                  const fIdx = effectiveFolders.findIndex((f) => f.id === fId)
                  return (
                    <>
                      {fIdx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMoveFolder(fId, 'left')}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-200 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5 shrink-0 text-accent-cyan" />
                          <span>Move Folder Left</span>
                        </button>
                      )}
                      {fIdx < effectiveFolders.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMoveFolder(fId, 'right')}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-200 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5 shrink-0 text-accent-cyan" />
                          <span>Move Folder Right</span>
                        </button>
                      )}
                      <div className="px-3 py-1.5 flex items-center gap-1.5 border-t border-white/5 my-0.5">
                        <Palette className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <div className="flex items-center gap-1">
                          {Object.entries(TELEGRAM_FOLDER_TAG_COLORS).map(([cIdx, hex]) => (
                            <button
                              key={cIdx}
                              type="button"
                              onClick={() => handleSetFolderColor(fId, Number(cIdx))}
                              className="w-3.5 h-3.5 rounded-full hover:scale-125 transition-transform cursor-pointer border border-white/20"
                              style={{ backgroundColor: hex }}
                              title={`Tag Color ${cIdx}`}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  )
                })()}
                <div className="h-px bg-white/5 my-1" />
              </>
            )}
            <button
              type="button"
              onClick={() => handleMarkTab(tabContextMenu.tabId)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-accent-cyan hover:bg-accent-cyan/15 transition-colors ${isRTL ? 'text-right' : 'text-left'} cursor-pointer`}
            >
              <CheckCheck className="w-3.5 h-3.5 shrink-0" />
              <span>{t('tab.mark_read_title', { label: tabContextMenu.tabLabel })}</span>
            </button>
            <button
              type="button"
              onClick={() => handleMarkTab('all')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors ${isRTL ? 'text-right' : 'text-left'} cursor-pointer`}
            >
              <CheckCheck className="w-3.5 h-3.5 shrink-0" />
              <span>{t('tab.mark_all_chats_read')}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
