import React from 'react'
import { MessageSquare, Users, Radio, Bot, BellRing, Layers, CheckCheck, Folder, Archive } from 'lucide-react'
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

  const folderTabs: { id: TabCategory; label: string; icon: React.ReactNode }[] = effectiveFolders.map((f) => ({
    id: `folder:${f.id}`,
    label: f.title,
    icon: f.emoticon ? (
      <span className="text-xs leading-none">{f.emoticon}</span>
    ) : (
      <Folder className="w-3.5 h-3.5 text-accent-cyan" />
    ),
  }))

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

  return (
    <div className="w-full shrink-0 flex items-center gap-1 px-2.5 py-2 border-b border-white/5 overflow-x-auto scrollbar-none titlebar-no-drag relative">
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-none">
        {allTabs.map((tab) => {
          const isActive = activeTab === tab.id
          const count = unreadCounts[tab.id] || 0

          return (
            <button
              key={tab.id}
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`${isRTL ? 'mr-1' : 'ml-1'} px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-primary-500 text-white' : 'bg-dark-750 text-gray-400'
                  }`}
                >
                  {formatNumber(count)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 64Gram Power Feature: Dynamic Mark Read Button */}
      {markAllReadEnabled && onMarkAllAsRead && (totalUnread > 0 || currentTabUnread > 0) && (
        <button
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
        </button>
      )}

      {/* Tab Context Menu */}
      {tabContextMenu && (
        <div
          dir={isRTL ? 'rtl' : 'ltr'}
          style={{ top: tabContextMenu.y, left: tabContextMenu.x }}
          className="fixed z-50 w-48 bg-dark-850/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 select-none text-xs"
          onClick={(e) => e.stopPropagation()}
        >
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
        </div>
      )}
    </div>
  )
}
