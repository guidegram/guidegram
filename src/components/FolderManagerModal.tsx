import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X, Folder, Plus, Trash2, ArrowUp, ArrowDown, Check, Users, User, Radio, Bot,
  BellOff, CheckCheck, Archive, Sparkles, Palette, Edit2, ShieldAlert, Pin,
  Layers, MessageSquare, FileText, Smile, Dices, Wrench, RefreshCw, AlertCircle, CheckCircle2
} from 'lucide-react'
import { CloudFolderItem } from '../types/telegram'
import { useI18n } from '../i18n'
import { TELEGRAM_FOLDER_TAG_COLORS } from './ChatTabs'

interface FolderManagerModalProps {
  isOpen: boolean
  accountId?: string
  folders: CloudFolderItem[]
  onClose: () => void
  onFoldersUpdated: (folders: CloudFolderItem[]) => void
}

const COMMON_FOLDER_EMOJIS = ['📁', '💼', '🏠', '💬', '📢', '🤖', '⭐', '🔥', '🎯', '🚀', '📌', '⚡']

export const FolderManagerModal: React.FC<FolderManagerModalProps> = ({
  isOpen,
  accountId,
  folders,
  onClose,
  onFoldersUpdated,
}) => {
  const { t, isRTL, formatNumber } = useI18n()
  const [activeTab, setActiveTab] = useState<'folders' | 'maintenance'>('folders')
  const [localFolders, setLocalFolders] = useState<CloudFolderItem[]>(folders)
  const [editingFolder, setEditingFolder] = useState<Partial<CloudFolderItem> | null>(null)
  const [suggestedFilters, setSuggestedFilters] = useState<any[]>([])
  const [isLoadingSuggested, setIsLoadingSuggested] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Microphase 043: Messages Domain Suite Part 11 State
  const [m043FiltersLoading, setM043FiltersLoading] = useState(false)
  const [m043FiltersFeedback, setM043FiltersFeedback] = useState<string | null>(null)
  const [m043FiltersCount, setM043FiltersCount] = useState<number | null>(null)

  const [m043UnreadMarksLoading, setM043UnreadMarksLoading] = useState(false)
  const [m043UnreadMarksFeedback, setM043UnreadMarksFeedback] = useState<string | null>(null)
  const [m043UnreadParentPeer, setM043UnreadParentPeer] = useState('')
  const [m043UnreadMarksCount, setM043UnreadMarksCount] = useState<number | null>(null)

  const [m043DialogsLoading, setM043DialogsLoading] = useState(false)
  const [m043DialogsFeedback, setM043DialogsFeedback] = useState<string | null>(null)
  const [m043DialogsLimit, setM043DialogsLimit] = useState('20')
  const [m043DialogsCount, setM043DialogsCount] = useState<number | null>(null)

  const [m043DiscussionLoading, setM043DiscussionLoading] = useState(false)
  const [m043DiscussionFeedback, setM043DiscussionFeedback] = useState<string | null>(null)
  const [m043DiscussionPeer, setM043DiscussionPeer] = useState('')
  const [m043DiscussionMsgId, setM043DiscussionMsgId] = useState('')
  const [m043DiscussionData, setM043DiscussionData] = useState<any>(null)

  const [m043DocLoading, setM043DocLoading] = useState(false)
  const [m043DocFeedback, setM043DocFeedback] = useState<string | null>(null)
  const [m043DocSha256, setM043DocSha256] = useState('')
  const [m043DocSize, setM043DocSize] = useState('')
  const [m043DocMime, setM043DocMime] = useState('')

  const [m043GameLoading, setM043GameLoading] = useState(false)
  const [m043GameFeedback, setM043GameFeedback] = useState<string | null>(null)
  const [m043GameData, setM043GameData] = useState<any>(null)

  const [m043EmojiGroupsLoading, setM043EmojiGroupsLoading] = useState(false)
  const [m043EmojiGroupsFeedback, setM043EmojiGroupsFeedback] = useState<string | null>(null)
  const [m043EmojiGroupsHash, setM043EmojiGroupsHash] = useState('0')
  const [m043EmojiGroupsCount, setM043EmojiGroupsCount] = useState<number | null>(null)

  // Microphase 115 Folders: folders.editPeerFolders
  const [m115PeerTarget, setM115PeerTarget] = useState('')
  const [m115FolderId, setM115FolderId] = useState('1')
  const [m115Loading, setM115Loading] = useState(false)
  const [m115Feedback, setM115Feedback] = useState<string | null>(null)
  const [m115Success, setM115Success] = useState<boolean | null>(null)

  // Microphase 043 Handlers
  const handleGetDialogFiltersRaw = async () => {
    if (!accountId || !window.guidegram?.getDialogFiltersRaw) return
    setM043FiltersLoading(true)
    setM043FiltersFeedback(null)
    try {
      const res = await window.guidegram.getDialogFiltersRaw(accountId)
      const count = Array.isArray(res) ? res.length : (res?.filters ? res.filters.length : 0)
      setM043FiltersCount(count)
      setM043FiltersFeedback(`Found ${count} dialog filter(s) in MTProto session.`)
    } catch (err: any) {
      setM043FiltersFeedback(err?.message || 'Error querying dialog filters.')
    } finally {
      setM043FiltersLoading(false)
    }
  }

  const handleGetDialogUnreadMarks = async () => {
    if (!accountId || !window.guidegram?.getDialogUnreadMarks) return
    setM043UnreadMarksLoading(true)
    setM043UnreadMarksFeedback(null)
    try {
      const res = await window.guidegram.getDialogUnreadMarks(accountId, m043UnreadParentPeer.trim() || undefined)
      const count = Array.isArray(res) ? res.length : (res?.marks ? res.marks.length : 0)
      setM043UnreadMarksCount(count)
      setM043UnreadMarksFeedback(`Discovered ${count} unread dialog mark(s).`)
    } catch (err: any) {
      setM043UnreadMarksFeedback(err?.message || 'Error querying dialog unread marks.')
    } finally {
      setM043UnreadMarksLoading(false)
    }
  }

  const handleGetDialogsRaw = async () => {
    if (!accountId || !window.guidegram?.getDialogs) return
    setM043DialogsLoading(true)
    setM043DialogsFeedback(null)
    try {
      const limit = Math.max(1, Math.min(100, parseInt(m043DialogsLimit, 10) || 20))
      const res = await window.guidegram.getDialogs(accountId, limit)
      const count = Array.isArray(res) ? res.length : 0
      setM043DialogsCount(count)
      setM043DialogsFeedback(`Fetched ${count} dialog(s) from Telegram cloud.`)
    } catch (err: any) {
      setM043DialogsFeedback(err?.message || 'Error querying MTProto dialogs.')
    } finally {
      setM043DialogsLoading(false)
    }
  }

  const handleGetDiscussionMessage = async () => {
    if (!accountId || !window.guidegram?.getDiscussionMessage || !m043DiscussionPeer.trim() || !m043DiscussionMsgId.trim()) return
    setM043DiscussionLoading(true)
    setM043DiscussionFeedback(null)
    try {
      const msgId = parseInt(m043DiscussionMsgId, 10)
      const res = await window.guidegram.getDiscussionMessage(accountId, m043DiscussionPeer.trim(), msgId)
      setM043DiscussionData(res)
      if (res) {
        setM043DiscussionFeedback(`Discussion thread resolved: top_msg_id=${res.topMsgId ?? 'N/A'}, read_inbox_max_id=${res.readInboxMaxId ?? 'N/A'}`)
      } else {
        setM043DiscussionFeedback('No discussion comments group attached to this post.')
      }
    } catch (err: any) {
      setM043DiscussionFeedback(err?.message || 'Error querying discussion message.')
    } finally {
      setM043DiscussionLoading(false)
    }
  }

  const handleGetDocumentByHash = async () => {
    if (!accountId || !window.guidegram?.getDocumentByHash || !m043DocSha256.trim()) return
    setM043DocLoading(true)
    setM043DocFeedback(null)
    try {
      const sizeVal = m043DocSize.trim() ? BigInt(m043DocSize.trim()) : undefined
      const res = await window.guidegram.getDocumentByHash(accountId, m043DocSha256.trim(), sizeVal, m043DocMime.trim() || undefined)
      if (res && res._ !== 'documentEmpty') {
        setM043DocFeedback(`Document found: ID=${res.id || 'N/A'}, size=${res.size || 'N/A'} bytes`)
      } else {
        setM043DocFeedback('Document not found for given SHA256/size/mime hash.')
      }
    } catch (err: any) {
      setM043DocFeedback(err?.message || 'Error querying document by hash.')
    } finally {
      setM043DocLoading(false)
    }
  }

  const handleGetEmojiGameInfo = async () => {
    if (!accountId || !window.guidegram?.getEmojiGameInfo) return
    setM043GameLoading(true)
    setM043GameFeedback(null)
    try {
      const res = await window.guidegram.getEmojiGameInfo(accountId, {})
      setM043GameData(res)
      setM043GameFeedback(`Emoji game info loaded: ${res ? JSON.stringify(res).slice(0, 80) : 'Available'}`)
    } catch (err: any) {
      setM043GameFeedback(err?.message || 'Error querying emoji game info.')
    } finally {
      setM043GameLoading(false)
    }
  }

  const handleGetEmojiGroups = async () => {
    if (!accountId || !window.guidegram?.getEmojiGroups) return
    setM043EmojiGroupsLoading(true)
    setM043EmojiGroupsFeedback(null)
    try {
      const hashVal = parseInt(m043EmojiGroupsHash, 10) || 0
      const res = await window.guidegram.getEmojiGroups(accountId, hashVal)
      const count = Array.isArray(res?.groups) ? res.groups.length : (Array.isArray(res) ? res.length : 0)
      setM043EmojiGroupsCount(count)
      setM043EmojiGroupsFeedback(`Discovered ${count} emoji category group(s).`)
    } catch (err: any) {
      setM043EmojiGroupsFeedback(err?.message || 'Error querying emoji groups.')
    } finally {
      setM043EmojiGroupsLoading(false)
    }
  }

  // Microphase 115: folders.editPeerFolders Handler
  const handleEditPeerFolders = async () => {
    if (!accountId) return
    if (!m115PeerTarget.trim()) {
      setM115Feedback('Please specify peer username, phone, or ID')
      setM115Success(false)
      return
    }
    setM115Loading(true)
    setM115Feedback(null)
    setM115Success(null)
    try {
      const folderNum = parseInt(m115FolderId.trim() || '0', 10)
      const res = await window.guidegram?.foldersEditPeerFoldersRaw?.(accountId, {
        folderPeers: [
          {
            peer: m115PeerTarget.trim(),
            folderId: isNaN(folderNum) ? 0 : folderNum,
          },
        ],
      })
      if (res) {
        setM115Success(true)
        setM115Feedback(`Peer folder successfully updated (Updates: ${res._ || 'TypeUpdates'})`)
      } else {
        setM115Success(false)
        setM115Feedback('No response received from Telegram server.')
      }
    } catch (err: any) {
      setM115Success(false)
      setM115Feedback(err?.message || 'Error executing folders.editPeerFolders')
    } finally {
      setM115Loading(false)
    }
  }

  useEffect(() => {
    setLocalFolders(folders)
  }, [folders])

  useEffect(() => {
    if (!isOpen || !accountId) return
    if (window.guidegram?.getSuggestedDialogFilters) {
      setIsLoadingSuggested(true)
      window.guidegram
        .getSuggestedDialogFilters(accountId)
        .then((res) => {
          if (Array.isArray(res)) setSuggestedFilters(res)
        })
        .catch(() => {})
        .finally(() => setIsLoadingSuggested(false))
    }
  }, [isOpen, accountId])

  if (!isOpen) return null

  const handleStartCreate = () => {
    // Find next available positive folder id (2 to 255)
    const existingIds = new Set(localFolders.map((f) => f.id))
    let nextId = 2
    while (existingIds.has(nextId) && nextId < 250) {
      nextId++
    }
    setEditingFolder({
      id: nextId,
      title: '',
      emoticon: '📁',
      color: 0,
      contacts: false,
      nonContacts: false,
      groups: false,
      broadcasts: false,
      bots: false,
      excludeMuted: false,
      excludeRead: false,
      excludeArchived: true,
      includePeerIds: [],
      excludePeerIds: [],
      pinnedPeerIds: [],
    })
    setErrorMsg('')
  }

  const handleStartEdit = (f: CloudFolderItem) => {
    setEditingFolder({ ...f })
    setErrorMsg('')
  }

  const handleDeleteFolder = async (folderId: number) => {
    if (!accountId) return
    const confirmed = window.confirm(t('folders.delete_confirm'))
    if (!confirmed) return

    try {
      if (window.guidegram?.updateDialogFilter) {
        await window.guidegram.updateDialogFilter(accountId, folderId, null)
      }
      const updated = localFolders.filter((f) => f.id !== folderId)
      setLocalFolders(updated)
      onFoldersUpdated(updated)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete folder')
    }
  }

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (!accountId) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= localFolders.length) return

    const reordered = [...localFolders]
    const temp = reordered[index]
    reordered[index] = reordered[targetIndex]
    reordered[targetIndex] = temp

    setLocalFolders(reordered)
    onFoldersUpdated(reordered)

    try {
      if (window.guidegram?.updateDialogFiltersOrder) {
        await window.guidegram.updateDialogFiltersOrder(
          accountId,
          reordered.map((f) => f.id)
        )
      }
    } catch (_) {}
  }

  const handleSaveEditing = async () => {
    if (!accountId || !editingFolder) return
    const trimmedTitle = editingFolder.title?.trim()
    if (!trimmedTitle) {
      setErrorMsg(t('folders.name') + ' required')
      return
    }

    setIsSaving(true)
    setErrorMsg('')
    try {
      const folderId = editingFolder.id || 2
      const payload = {
        title: trimmedTitle,
        emoticon: editingFolder.emoticon || '',
        color: editingFolder.color ?? 0,
        contacts: Boolean(editingFolder.contacts),
        nonContacts: Boolean(editingFolder.nonContacts),
        groups: Boolean(editingFolder.groups),
        broadcasts: Boolean(editingFolder.broadcasts),
        bots: Boolean(editingFolder.bots),
        excludeMuted: Boolean(editingFolder.excludeMuted),
        excludeRead: Boolean(editingFolder.excludeRead),
        excludeArchived: Boolean(editingFolder.excludeArchived),
        includePeerIds: editingFolder.includePeerIds || [],
        excludePeerIds: editingFolder.excludePeerIds || [],
        pinnedPeerIds: editingFolder.pinnedPeerIds || [],
      }

      if (window.guidegram?.updateDialogFilter) {
        await window.guidegram.updateDialogFilter(accountId, folderId, payload)
      }

      let updated: CloudFolderItem[]
      const existingIdx = localFolders.findIndex((f) => f.id === folderId)
      const completeFolderItem: CloudFolderItem = {
        id: folderId,
        ...payload,
      }
      if (existingIdx !== -1) {
        updated = [...localFolders]
        updated[existingIdx] = completeFolderItem
      } else {
        updated = [...localFolders, completeFolderItem]
      }

      setLocalFolders(updated)
      onFoldersUpdated(updated)
      setEditingFolder(null)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save folder')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddSuggested = async (suggested: any) => {
    if (!accountId) return
    const f = suggested.filter
    if (!f) return
    const existingIds = new Set(localFolders.map((x) => x.id))
    let nextId = f.id || 2
    while (existingIds.has(nextId) && nextId < 250) {
      nextId++
    }

    const titleStr = typeof f.title === 'string' ? f.title : f.title?.text || suggested.description || 'Folder'
    const newFolder: CloudFolderItem = {
      id: nextId,
      title: titleStr,
      emoticon: f.emoticon || '📁',
      color: f.color ?? 0,
      contacts: Boolean(f.contacts),
      nonContacts: Boolean(f.nonContacts ?? f.non_contacts),
      groups: Boolean(f.groups),
      broadcasts: Boolean(f.broadcasts),
      bots: Boolean(f.bots),
      excludeMuted: Boolean(f.excludeMuted ?? f.exclude_muted),
      excludeRead: Boolean(f.excludeRead ?? f.exclude_read),
      excludeArchived: Boolean(f.excludeArchived ?? f.exclude_archived),
      includePeerIds: [],
      excludePeerIds: [],
      pinnedPeerIds: [],
    }

    try {
      if (window.guidegram?.updateDialogFilter) {
        await window.guidegram.updateDialogFilter(accountId, nextId, newFolder)
      }
      const updated = [...localFolders, newFolder]
      setLocalFolders(updated)
      onFoldersUpdated(updated)
      setSuggestedFilters((prev) => prev.filter((s) => s !== suggested))
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to add suggested folder')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 26, stiffness: 350 }}
        dir={isRTL ? 'rtl' : 'ltr'}
        className="w-full max-w-lg bg-dark-850 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-dark-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-400">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h2 id="folder-modal-title" className="text-sm font-bold text-white">
                {editingFolder ? (editingFolder.id && localFolders.some((x) => x.id === editingFolder.id) ? t('folders.edit') : t('folders.create')) : t('folders.title')}
              </h2>
              <p className="text-[11px] text-gray-400">
                {editingFolder ? t('folders.manage') : t('folders.manage')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={editingFolder ? () => setEditingFolder(null) : onClose}
            className="p-1.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/5 bg-dark-900/40 px-5 pt-1 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('folders')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'folders'
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>{t('folders.title')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('maintenance')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'maintenance'
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>MTProto Layer 232 Suite</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 smooth-scroll-physics">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'folders' ? (
            editingFolder ? (
            /* Editing / Creating Form */
            <div className="space-y-4">
              {/* Folder Name & Emoticon */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  {t('folders.name')}
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative shrink-0">
                    <input
                      type="text"
                      maxLength={2}
                      value={editingFolder.emoticon || ''}
                      onChange={(e) => setEditingFolder({ ...editingFolder, emoticon: e.target.value })}
                      className="w-11 h-10 text-center text-base rounded-xl bg-dark-800 border border-white/10 text-white focus:outline-none focus:border-primary-500 transition-colors"
                      placeholder="📁"
                    />
                  </div>
                  <input
                    type="text"
                    value={editingFolder.title || ''}
                    onChange={(e) => setEditingFolder({ ...editingFolder, title: e.target.value })}
                    placeholder={t('folders.name')}
                    className="flex-1 h-10 px-3 rounded-xl bg-dark-800 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>

                {/* Quick Emoji Picker */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                  {COMMON_FOLDER_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditingFolder({ ...editingFolder, emoticon: emoji })}
                      className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer ${
                        editingFolder.emoticon === emoji
                          ? 'bg-primary-500/20 border border-primary-500 text-white scale-110'
                          : 'bg-dark-800 hover:bg-dark-750 text-gray-300'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tag Color */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  {t('folders.title')} Color
                </label>
                <div className="flex items-center gap-2">
                  {Object.entries(TELEGRAM_FOLDER_TAG_COLORS).map(([cIdxStr, hex]) => {
                    const cIdx = Number(cIdxStr)
                    const isSelected = editingFolder.color === cIdx
                    return (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => setEditingFolder({ ...editingFolder, color: cIdx })}
                        style={{ backgroundColor: hex }}
                        className={`w-6 h-6 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                          isSelected ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-dark-850' : 'hover:scale-110 opacity-80 hover:opacity-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Included Chats Flags */}
              <div className="p-3 rounded-xl bg-dark-800/80 border border-white/5 space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary-400 block">
                  {t('folders.included')}
                </span>

                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-gray-200">{t('folders.types_contacts')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(editingFolder.contacts)}
                    onChange={(e) => setEditingFolder({ ...editingFolder, contacts: e.target.checked })}
                    className="w-4 h-4 rounded text-primary-500 focus:ring-0 bg-dark-700 border-white/10"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-gray-200">{t('folders.types_non_contacts')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(editingFolder.nonContacts)}
                    onChange={(e) => setEditingFolder({ ...editingFolder, nonContacts: e.target.checked })}
                    className="w-4 h-4 rounded text-primary-500 focus:ring-0 bg-dark-700 border-white/10"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-400" />
                    <span className="text-xs text-gray-200">{t('folders.types_groups')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(editingFolder.groups)}
                    onChange={(e) => setEditingFolder({ ...editingFolder, groups: e.target.checked })}
                    className="w-4 h-4 rounded text-primary-500 focus:ring-0 bg-dark-700 border-white/10"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-rose-400" />
                    <span className="text-xs text-gray-200">{t('folders.types_channels')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(editingFolder.broadcasts)}
                    onChange={(e) => setEditingFolder({ ...editingFolder, broadcasts: e.target.checked })}
                    className="w-4 h-4 rounded text-primary-500 focus:ring-0 bg-dark-700 border-white/10"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs text-gray-200">{t('folders.types_bots')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(editingFolder.bots)}
                    onChange={(e) => setEditingFolder({ ...editingFolder, bots: e.target.checked })}
                    className="w-4 h-4 rounded text-primary-500 focus:ring-0 bg-dark-700 border-white/10"
                  />
                </label>
              </div>

              {/* Excluded Chats Flags */}
              <div className="p-3 rounded-xl bg-dark-800/80 border border-white/5 space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 block">
                  {t('folders.excluded')}
                </span>

                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <BellOff className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-200">{t('folders.exclude_muted')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(editingFolder.excludeMuted)}
                    onChange={(e) => setEditingFolder({ ...editingFolder, excludeMuted: e.target.checked })}
                    className="w-4 h-4 rounded text-primary-500 focus:ring-0 bg-dark-700 border-white/10"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <CheckCheck className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-200">{t('folders.exclude_read')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(editingFolder.excludeRead)}
                    onChange={(e) => setEditingFolder({ ...editingFolder, excludeRead: e.target.checked })}
                    className="w-4 h-4 rounded text-primary-500 focus:ring-0 bg-dark-700 border-white/10"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-200">{t('folders.exclude_archived')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(editingFolder.excludeArchived)}
                    onChange={(e) => setEditingFolder({ ...editingFolder, excludeArchived: e.target.checked })}
                    className="w-4 h-4 rounded text-primary-500 focus:ring-0 bg-dark-700 border-white/10"
                  />
                </label>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFolder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditing}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 shadow-md shadow-primary-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? '...' : t('folders.save')}
                </button>
              </div>
            </div>
          ) : (
            /* Folder List View */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">
                  {t('folders.title')} ({formatNumber(localFolders.length)})
                </span>
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 border border-primary-500/30 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('folders.create')}</span>
                </button>
              </div>

              {localFolders.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-dark-800/40 border border-white/5">
                  <Folder className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                  <p className="text-xs text-gray-400 mb-1">{t('app.no_chats')}</p>
                  <p className="text-[11px] text-gray-500">
                    {t('folders.create')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {localFolders.map((f, idx) => {
                    const tagColor = f.color !== undefined ? TELEGRAM_FOLDER_TAG_COLORS[f.color] : '#00acc1'
                    return (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-dark-800/80 border border-white/5 hover:border-white/10 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-white/5"
                            style={{ backgroundColor: `${tagColor}22`, color: tagColor }}
                          >
                            {f.emoticon ? (
                              <span className="text-sm">{f.emoticon}</span>
                            ) : (
                              <Folder className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{f.title}</h4>
                            <p className="text-[10px] text-gray-400 flex items-center gap-2">
                              {f.contacts && <span>{t('folders.types_contacts')}</span>}
                              {f.nonContacts && <span>{t('folders.types_non_contacts')}</span>}
                              {f.groups && <span>{t('folders.types_groups')}</span>}
                              {f.broadcasts && <span>{t('folders.types_channels')}</span>}
                              {f.bots && <span>{t('folders.types_bots')}</span>}
                              {f.pinnedPeerIds && f.pinnedPeerIds.length > 0 && (
                                <span className="text-primary-400 font-medium flex items-center gap-0.5">
                                  <Pin className="w-2.5 h-2.5 fill-current" />
                                  {formatNumber(f.pinnedPeerIds.length)}
                                </span>
                              )}
                              {f.includePeerIds && f.includePeerIds.length > 0 && (
                                <span className="text-accent-cyan font-medium">
                                  +{formatNumber(f.includePeerIds.length)}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Order Buttons */}
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveOrder(idx, 'up')}
                            className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === localFolders.length - 1}
                            onClick={() => handleMoveOrder(idx, 'down')}
                            className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(f)}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                            title={t('folders.edit')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteFolder(f.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title={t('folders.delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Suggested Folders Section */}
              {suggestedFilters.length > 0 && (
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('folders.suggested')}</span>
                  </div>
                  <div className="space-y-1.5">
                    {suggestedFilters.map((s, idx) => {
                      const titleStr = typeof s.filter?.title === 'string' ? s.filter.title : s.filter?.title?.text || s.description || 'Folder'
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-dark-800/40 border border-white/5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{s.filter?.emoticon || '📁'}</span>
                            <div>
                              <span className="text-xs font-medium text-white block">{titleStr}</span>
                              {s.description && (
                                <span className="text-[10px] text-gray-500 block">{s.description}</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddSuggested(s)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/20 transition-all cursor-pointer"
                          >
                            {t('folders.add_folder')}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            )
          ) : (
            /* Maintenance Tab: Layer 232 Messages Suite Part 11 (Microphase 043) */
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-300 text-xs">
                <p className="font-semibold mb-1">Telegram MTProto Layer 232 — Messages Domain Suite Part 11</p>
                <p className="text-[11px] text-gray-400">Direct protocol wiring for dialog filters, unread marks, raw dialogs, discussion messages, document hashes, and emoji game physics.</p>
              </div>

              {/* 1. messages.getDialogFilters */}
              <div className="p-3.5 rounded-xl bg-dark-800/80 border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-400" />
                    <div>
                      <span className="text-xs font-semibold text-white block">Raw Dialog Filters</span>
                      <span className="text-[10px] text-gray-400 font-mono">messages.getDialogFilters</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGetDialogFiltersRaw}
                    disabled={m043FiltersLoading}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {m043FiltersLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                    <span>Query Filters</span>
                  </button>
                </div>
                {m043FiltersFeedback && (
                  <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    m043FiltersCount !== null ? 'bg-sky-500/10 border border-sky-500/20 text-sky-300' : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                  }`}>
                    {m043FiltersCount !== null ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{m043FiltersFeedback}</span>
                  </div>
                )}
              </div>

              {/* 2. messages.getDialogUnreadMarks */}
              <div className="p-3.5 rounded-xl bg-dark-800/80 border border-white/5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-xs font-semibold text-white block">Dialog Unread Marks</span>
                    <span className="text-[10px] text-gray-400 font-mono">messages.getDialogUnreadMarks</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={m043UnreadParentPeer}
                    onChange={(e) => setM043UnreadParentPeer(e.target.value)}
                    placeholder="Parent Peer ID (optional)"
                    className="flex-1 h-8 px-2.5 rounded-lg bg-dark-900 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleGetDialogUnreadMarks}
                    disabled={m043UnreadMarksLoading}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {m043UnreadMarksLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                    <span>Fetch Marks</span>
                  </button>
                </div>
                {m043UnreadMarksFeedback && (
                  <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    m043UnreadMarksCount !== null ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                  }`}>
                    {m043UnreadMarksCount !== null ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{m043UnreadMarksFeedback}</span>
                  </div>
                )}
              </div>

              {/* 3. messages.getDialogs */}
              <div className="p-3.5 rounded-xl bg-dark-800/80 border border-white/5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-violet-400" />
                  <div>
                    <span className="text-xs font-semibold text-white block">Raw MTProto Dialogs</span>
                    <span className="text-[10px] text-gray-400 font-mono">messages.getDialogs</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={m043DialogsLimit}
                    onChange={(e) => setM043DialogsLimit(e.target.value)}
                    placeholder="Limit (1-100)"
                    className="w-28 h-8 px-2.5 rounded-lg bg-dark-900 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-violet-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleGetDialogsRaw}
                    disabled={m043DialogsLoading}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-violet-500 hover:bg-violet-600 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {m043DialogsLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                    <span>Fetch Dialogs</span>
                  </button>
                </div>
                {m043DialogsFeedback && (
                  <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    m043DialogsCount !== null ? 'bg-violet-500/10 border border-violet-500/20 text-violet-300' : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                  }`}>
                    {m043DialogsCount !== null ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{m043DialogsFeedback}</span>
                  </div>
                )}
              </div>

              {/* 4. messages.getDiscussionMessage */}
              <div className="p-3.5 rounded-xl bg-dark-800/80 border border-white/5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-xs font-semibold text-white block">Channel Discussion Message</span>
                    <span className="text-[10px] text-gray-400 font-mono">messages.getDiscussionMessage</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={m043DiscussionPeer}
                    onChange={(e) => setM043DiscussionPeer(e.target.value)}
                    placeholder="Channel Peer ID / Username"
                    className="h-8 px-2.5 rounded-lg bg-dark-900 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <input
                    type="number"
                    value={m043DiscussionMsgId}
                    onChange={(e) => setM043DiscussionMsgId(e.target.value)}
                    placeholder="Post Message ID"
                    className="h-8 px-2.5 rounded-lg bg-dark-900 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleGetDiscussionMessage}
                  disabled={m043DiscussionLoading || !m043DiscussionPeer.trim() || !m043DiscussionMsgId.trim()}
                  className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {m043DiscussionLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Lookup Discussion Thread</span>
                </button>
                {m043DiscussionFeedback && (
                  <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    m043DiscussionData !== null ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                  }`}>
                    {m043DiscussionData !== null ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{m043DiscussionFeedback}</span>
                  </div>
                )}
              </div>

              {/* 5. messages.getDocumentByHash */}
              <div className="p-3.5 rounded-xl bg-dark-800/80 border border-white/5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="text-xs font-semibold text-white block">Document Lookup By Hash</span>
                    <span className="text-[10px] text-gray-400 font-mono">messages.getDocumentByHash</span>
                  </div>
                </div>
                <input
                  type="text"
                  value={m043DocSha256}
                  onChange={(e) => setM043DocSha256(e.target.value)}
                  placeholder="SHA-256 Base64 / Hex"
                  className="w-full h-8 px-2.5 rounded-lg bg-dark-900 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={m043DocSize}
                    onChange={(e) => setM043DocSize(e.target.value)}
                    placeholder="File size (bytes)"
                    className="h-8 px-2.5 rounded-lg bg-dark-900 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <input
                    type="text"
                    value={m043DocMime}
                    onChange={(e) => setM043DocMime(e.target.value)}
                    placeholder="MIME type (e.g. image/png)"
                    className="h-8 px-2.5 rounded-lg bg-dark-900 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleGetDocumentByHash}
                  disabled={m043DocLoading || !m043DocSha256.trim()}
                  className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-cyan-500 hover:bg-cyan-600 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {m043DocLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Find Document By Hash</span>
                </button>
                {m043DocFeedback && (
                  <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    m043DocFeedback.includes('found: ID') ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-300' : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                  }`}>
                    {m043DocFeedback.includes('found: ID') ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{m043DocFeedback}</span>
                  </div>
                )}
              </div>

              {/* 6. messages.getEmojiGameInfo */}
              <div className="p-3.5 rounded-xl bg-dark-800/80 border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dices className="w-4 h-4 text-fuchsia-400" />
                    <div>
                      <span className="text-xs font-semibold text-white block">Emoji Game / Dice Info</span>
                      <span className="text-[10px] text-gray-400 font-mono">messages.getEmojiGameInfo</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGetEmojiGameInfo}
                    disabled={m043GameLoading}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-fuchsia-500 hover:bg-fuchsia-600 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {m043GameLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                    <span>Query Game Info</span>
                  </button>
                </div>
                {m043GameFeedback && (
                  <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    m043GameData !== null ? 'bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300' : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                  }`}>
                    {m043GameData !== null ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{m043GameFeedback}</span>
                  </div>
                )}
              </div>

              {/* 7. messages.getEmojiGroups */}
              <div className="p-3.5 rounded-xl bg-dark-800/80 border border-white/5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Smile className="w-4 h-4 text-yellow-400" />
                  <div>
                    <span className="text-xs font-semibold text-white block">Emoji Category Groups</span>
                    <span className="text-[10px] text-gray-400 font-mono">messages.getEmojiGroups</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={m043EmojiGroupsHash}
                    onChange={(e) => setM043EmojiGroupsHash(e.target.value)}
                    placeholder="Hash (0 for latest)"
                    className="w-32 h-8 px-2.5 rounded-lg bg-dark-900 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-yellow-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleGetEmojiGroups}
                    disabled={m043EmojiGroupsLoading}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-yellow-500 hover:bg-yellow-600 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {m043EmojiGroupsLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                    <span>Query Groups</span>
                  </button>
                </div>
                {m043EmojiGroupsFeedback && (
                  <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    m043EmojiGroupsCount !== null ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-300' : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                  }`}>
                    {m043EmojiGroupsCount !== null ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{m043EmojiGroupsFeedback}</span>
                  </div>
                )}
              </div>

              {/* 8. folders.editPeerFolders (Microphase 115) */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-accent-cyan/10 via-dark-800/80 to-dark-800/80 border border-accent-cyan/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-accent-cyan/20 text-accent-cyan flex items-center justify-center border border-accent-cyan/30">
                      <Folder className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white block">Batch Peer Folder Assignment</span>
                      <span className="text-[10px] text-accent-cyan font-mono">folders.editPeerFolders (Microphase 115)</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30">
                    MTProto 232
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Assign or move any dialog peer directly to a designated cloud folder ID via native MTProto Layer 232 RPC.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={m115PeerTarget}
                    onChange={(e) => setM115PeerTarget(e.target.value)}
                    placeholder="Peer ID / @username / +phone"
                    className="h-8 px-2.5 rounded-lg bg-dark-900 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-accent-cyan font-mono"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={m115FolderId}
                      onChange={(e) => setM115FolderId(e.target.value)}
                      placeholder="Folder ID (0=main, 1=archived, >1=custom)"
                      className="w-24 h-8 px-2.5 rounded-lg bg-dark-900 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-accent-cyan font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleEditPeerFolders}
                      disabled={m115Loading}
                      className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-accent-cyan/90 hover:bg-accent-cyan text-dark-950 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {m115Loading && <RefreshCw className="w-3 h-3 animate-spin text-dark-950" />}
                      <span className="font-bold text-dark-950">Update Folder</span>
                    </button>
                  </div>
                </div>
                {m115Feedback && (
                  <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    m115Success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                  }`}>
                    {m115Success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{m115Feedback}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
