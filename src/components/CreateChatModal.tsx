import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Users, Megaphone, Check, Search } from 'lucide-react'
import { ContactItem, DialogItem } from '../types/telegram'
import { Avatar } from './Avatar'

interface CreateChatModalProps {
  isOpen: boolean
  mode: 'group' | 'channel'
  onClose: () => void
  accountId?: string
  onChatCreated: (chat: DialogItem) => void
}

export const CreateChatModal: React.FC<CreateChatModalProps> = ({
  isOpen,
  mode,
  onClose,
  accountId,
  onChatCreated,
}) => {
  const [title, setTitle] = useState('')
  const [about, setAbout] = useState('')
  const [isMegagroup, setIsMegagroup] = useState(false)
  const [contacts, setContacts] = useState<ContactItem[]>([])
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setAbout('')
      setSelectedContactIds([])
      setError(null)
      return
    }
    if (mode === 'group' && accountId && window.guidegram?.getContacts) {
      setLoading(true)
      window.guidegram
        .getContacts(accountId)
        .then((list) => {
          if (Array.isArray(list)) setContacts(list)
        })
        .finally(() => setLoading(false))
    }
  }, [isOpen, mode, accountId])

  if (!isOpen) return null

  const handleToggleContact = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !accountId) return
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'group') {
        const chat = await window.guidegram.createGroup(accountId, title.trim(), selectedContactIds)
        if (chat) {
          onChatCreated(chat)
          onClose()
        }
      } else {
        const chat = await window.guidegram.createChannel(
          accountId,
          title.trim(),
          about.trim(),
          isMegagroup
        )
        if (chat) {
          onChatCreated(chat)
          onClose()
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create chat')
    } finally {
      setSubmitting(false)
    }
  }

  const isGroup = mode === 'group'
  const filteredContacts = contacts.filter((c) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    const name = `${c.firstName} ${c.lastName || ''}`.toLowerCase()
    return name.includes(q) || (c.phone && c.phone.includes(q))
  })

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="bg-[#17212b] border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] select-none"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isGroup ? (
              <Users className="w-5 h-5 text-accent-cyan" />
            ) : (
              <Megaphone className="w-5 h-5 text-accent-cyan" />
            )}
            <span className="font-bold text-base text-white">
              {isGroup ? 'New Group' : 'New Channel'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex-1 flex flex-col gap-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-accent-rose/10 border border-accent-rose/20 text-accent-rose text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">
              {isGroup ? 'Group Name' : 'Channel Name'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isGroup ? 'Enter group name...' : 'Enter channel name...'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-white/5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>

          {!isGroup && (
            <>
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="What is this channel about?"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-white/5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors resize-none"
                />
              </div>

              <div
                onClick={() => setIsMegagroup(!isMegagroup)}
                className="p-3 rounded-xl bg-dark-900/60 border border-white/5 flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="text-xs font-semibold text-white">Broadcast Channel vs Supergroup</div>
                  <div className="text-[10px] text-gray-400">
                    {isMegagroup ? 'Supergroup (Members can chat)' : 'Broadcast Channel (Only admins can post)'}
                  </div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                    isMegagroup ? 'bg-primary-600 justify-end' : 'bg-dark-950 justify-start border border-white/10'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </div>
            </>
          )}

          {isGroup && (
            <div className="flex-1 flex flex-col min-h-0">
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Add Members ({selectedContactIds.length} selected)
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-dark-900 border border-white/5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                />
              </div>
              <div className="flex-1 max-h-48 overflow-y-auto divide-y divide-white/5 border border-white/5 rounded-xl">
                {filteredContacts.map((c) => {
                  const isSelected = selectedContactIds.includes(c.id)
                  const fullName = `${c.firstName} ${c.lastName || ''}`.trim()
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleToggleContact(c.id)}
                      className="px-3 py-2 flex items-center justify-between hover:bg-white/5 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          accountId={accountId}
                          peerId={c.id}
                          title={fullName}
                          initials={fullName.charAt(0)}
                          avatarUrl={c.avatarUrl}
                          size="sm"
                        />
                        <div className="text-xs text-gray-200 truncate">{fullName}</div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'border-white/20'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white transition-colors cursor-pointer"
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
