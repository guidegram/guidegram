import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Folder, Plus, Trash2, ArrowUp, ArrowDown, Check, Users, User, Radio, Bot, BellOff, CheckCheck, Archive, Sparkles, Palette, Edit2, ShieldAlert } from 'lucide-react'
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
  const [localFolders, setLocalFolders] = useState<CloudFolderItem[]>(folders)
  const [editingFolder, setEditingFolder] = useState<Partial<CloudFolderItem> | null>(null)
  const [suggestedFilters, setSuggestedFilters] = useState<any[]>([])
  const [isLoadingSuggested, setIsLoadingSuggested] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 smooth-scroll-physics">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {editingFolder ? (
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
          )}
        </div>
      </motion.div>
    </div>
  )
}
