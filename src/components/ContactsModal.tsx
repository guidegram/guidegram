import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  Search,
  UserPlus,
  Phone,
  AtSign,
  Users,
  Star,
  Cake,
  ShieldAlert,
  Check,
  Plus,
  QrCode,
  Download,
  Copy,
  Upload,
  Sparkles,
  Share2,
} from 'lucide-react'
import QRCode from 'qrcode'
import { ContactItem } from '../types/telegram'
import { Avatar } from './Avatar'
import { generateVCard, parseVCard, downloadVCardFile } from '../utils/vcard'
import { copyTextToClipboard } from '../utils/clipboard'

interface ContactsModalProps {
  isOpen: boolean
  onClose: () => void
  accountId?: string
  onSelectContact: (contactId: string) => void
}

type ContactTab = 'all' | 'top' | 'birthdays' | 'add'

export const ContactsModal: React.FC<ContactsModalProps> = ({
  isOpen,
  onClose,
  accountId,
  onSelectContact,
}) => {
  const [activeTab, setActiveTab] = useState<ContactTab>('all')
  const [contacts, setContacts] = useState<ContactItem[]>([])
  const [topPeers, setTopPeers] = useState<any[]>([])
  const [birthdays, setBirthdays] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  // QR Code & vCard Sharing State
  const [selectedQrContact, setSelectedQrContact] = useState<ContactItem | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrCopied, setQrCopied] = useState(false)
  const [qrFormat, setQrFormat] = useState<'vcard' | 'telegram'>('vcard')

  // New Contact Form State
  const [newFirstName, setNewFirstName] = useState('')
  const [newLastName, setNewLastName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newNote, setNewNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [addSuccess, setAddSuccess] = useState(false)
  const [importNotification, setImportNotification] = useState<string | null>(null)

  const loadAll = () => {
    if (!isOpen || !accountId) return
    setLoading(true)

    const pContacts = window.guidegram?.getContacts ? window.guidegram.getContacts(accountId) : Promise.resolve([])
    const pTop = window.guidegram?.getTopPeers ? window.guidegram.getTopPeers(accountId, { correspondents: true }) : Promise.resolve(null)
    const pBirthdays = window.guidegram?.getBirthdays ? window.guidegram.getBirthdays(accountId) : Promise.resolve([])

    Promise.all([pContacts, pTop, pBirthdays])
      .then(([list, top, bdays]) => {
        if (Array.isArray(list)) setContacts(list)
        if (top?.users && Array.isArray(top.users)) setTopPeers(top.users)
        if (Array.isArray(bdays)) setBirthdays(bdays)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadAll()
  }, [isOpen, accountId])

  // Generate QR code whenever selectedQrContact or qrFormat changes
  useEffect(() => {
    if (!selectedQrContact) {
      setQrDataUrl(null)
      return
    }

    let payload = ''
    if (qrFormat === 'telegram' && selectedQrContact.username) {
      payload = `https://t.me/${selectedQrContact.username.replace(/^@/, '')}`
    } else if (qrFormat === 'telegram' && selectedQrContact.phone) {
      payload = `tg://contact?phone=${encodeURIComponent(selectedQrContact.phone)}`
    } else {
      payload = generateVCard({
        firstName: selectedQrContact.firstName,
        lastName: selectedQrContact.lastName,
        phone: selectedQrContact.phone,
        username: selectedQrContact.username,
        note: (selectedQrContact as any).note,
      })
    }

    QRCode.toDataURL(payload, {
      width: 220,
      margin: 1,
      color: {
        dark: '#00F0FF',
        light: '#0c131a',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => {
        console.error('Failed to generate contact QR code:', err)
        setQrDataUrl(null)
      })
  }, [selectedQrContact, qrFormat])

  const handleCopyVCard = async () => {
    if (!selectedQrContact) return
    const vcard = generateVCard({
      firstName: selectedQrContact.firstName,
      lastName: selectedQrContact.lastName,
      phone: selectedQrContact.phone,
      username: selectedQrContact.username,
      note: (selectedQrContact as any).note,
    })
    await copyTextToClipboard(vcard)
    setQrCopied(true)
    setTimeout(() => setQrCopied(false), 2000)
  }

  const handleDownloadVCard = () => {
    if (!selectedQrContact) return
    downloadVCardFile({
      firstName: selectedQrContact.firstName,
      lastName: selectedQrContact.lastName,
      phone: selectedQrContact.phone,
      username: selectedQrContact.username,
      note: (selectedQrContact as any).note,
    })
  }

  const handleImportVcf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        const parsed = parseVCard(text)
        if (parsed.firstName || parsed.fullName) {
          setNewFirstName(parsed.firstName || parsed.fullName)
          if (parsed.lastName) setNewLastName(parsed.lastName)
          if (parsed.phone) setNewPhone(parsed.phone)
          if (parsed.note) setNewNote(parsed.note)
          setActiveTab('add')
          setImportNotification(`Loaded vCard: ${parsed.fullName || parsed.firstName}`)
          setTimeout(() => setImportNotification(null), 3500)
        }
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId || !newFirstName.trim() || !newPhone.trim()) return

    try {
      setIsSubmitting(true)
      if (window.guidegram?.addContact) {
        await window.guidegram.addContact(
          accountId,
          newPhone.replace(/[^0-9+]/g, ''),
          newFirstName.trim(),
          newLastName.trim(),
          newPhone.trim(),
          false,
          newNote.trim() || undefined
        )
      }
      setAddSuccess(true)
      setTimeout(() => {
        setAddSuccess(false)
        setNewFirstName('')
        setNewLastName('')
        setNewPhone('')
        setNewNote('')
        setActiveTab('all')
        loadAll()
      }, 1200)
    } catch (err) {
      console.error('Failed to add contact:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    const name = `${c.firstName} ${c.lastName || ''}`.toLowerCase()
    return (
      name.includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.username && c.username.toLowerCase().includes(q))
    )
  })

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="bg-[#17212b] border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[75vh] max-h-[640px] select-none relative"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-accent-cyan" />
            <span className="font-bold text-base text-white">Contacts & Directory</span>
            <span className="text-xs text-gray-400 font-mono">({contacts.length})</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-white/5 px-3 py-2 gap-1 bg-dark-900/50">
          {[
            { id: 'all' as const, label: `All (${contacts.length})`, icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'top' as const, label: 'Top Peers', icon: <Star className="w-3.5 h-3.5 text-amber-400" /> },
            { id: 'birthdays' as const, label: 'Birthdays', icon: <Cake className="w-3.5 h-3.5 text-rose-400" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isActive ? 'text-accent-cyan font-bold' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeContactTabIndicator"
                    transition={{ type: 'spring', damping: 24, stiffness: 350 }}
                    className="absolute inset-0 bg-primary-500/20 rounded-xl"
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {tab.icon}
                  <span>{tab.label}</span>
                </span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`ml-auto relative px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === 'add' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-gray-400 hover:text-emerald-400'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        {/* Content Area */}
        {activeTab === 'add' ? (
          <form onSubmit={handleAddContact} className="p-5 space-y-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <div className="text-xs font-semibold text-gray-200 uppercase tracking-wider">New Telegram Contact</div>
              <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-cyan/10 hover:bg-accent-cyan/20 text-[11px] text-accent-cyan font-semibold cursor-pointer transition-colors border border-accent-cyan/20">
                <Upload className="w-3.5 h-3.5" />
                <span>Import .vcf</span>
                <input
                  type="file"
                  accept=".vcf,text/vcard"
                  className="hidden"
                  onChange={handleImportVcf}
                />
              </label>
            </div>

            {importNotification && (
              <div className="px-3 py-2 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span className="truncate">{importNotification}</span>
              </div>
            )}

            <div>
              <label className="text-[11px] text-gray-400 mb-1 block">First Name (Required)</label>
              <input
                type="text"
                required
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white focus:outline-none focus:border-accent-cyan"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block">Last Name</label>
              <input
                type="text"
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                placeholder="e.g. Miller"
                className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white focus:outline-none focus:border-accent-cyan"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block">Phone Number (Required)</label>
              <input
                type="tel"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+1 234 567 8900"
                className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-accent-cyan"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block">Private Contact Note (Optional)</label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a private note visible only to you..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white focus:outline-none focus:border-accent-cyan resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || addSuccess}
              className="w-full py-2.5 mt-2 rounded-xl bg-accent-cyan text-dark-950 font-bold text-xs hover:bg-accent-cyan/90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {addSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-950" />
                  <span>Contact Saved to Telegram!</span>
                </>
              ) : isSubmitting ? (
                <span>Adding to Cloud...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Save Contact</span>
                </>
              )}
            </button>
          </form>
        ) : activeTab === 'top' ? (
          <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10">
            {topPeers.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">No top interacting peers yet.</div>
            ) : (
              topPeers.map((user: any) => {
                const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'
                return (
                  <div
                    key={user.id}
                    onClick={() => {
                      onSelectContact(user.id.toString())
                      onClose()
                    }}
                    className="px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar accountId={accountId} peerId={user.id.toString()} title={name} initials={name.charAt(0)} size="md" />
                      <div>
                        <div className="text-sm font-semibold text-gray-100 truncate">{name}</div>
                        {user.username && <div className="text-[11px] text-accent-cyan font-mono">@{user.username}</div>}
                      </div>
                    </div>
                    <span className="text-[10px] bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded-full font-bold">Top Peer</span>
                  </div>
                )
              })
            )}
          </div>
        ) : activeTab === 'birthdays' ? (
          <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10">
            {birthdays.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">No upcoming birthdays found among contacts.</div>
            ) : (
              birthdays.map((b: any, idx) => (
                <div key={idx} className="px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <Cake className="w-5 h-5 text-rose-400" />
                    <div className="text-sm font-semibold text-gray-200">User #{b.userId || idx}</div>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{b.day}/{b.month}</span>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="p-3 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search contacts by name, phone or username..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-dark-900 border border-white/5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-cyan transition-colors"
                />
              </div>
            </div>

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10">
              {loading ? (
                <div className="p-8 text-center text-xs text-gray-400 animate-pulse">Loading cloud contacts...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  {search ? 'No matching contacts found' : 'No contacts available in cloud'}
                </div>
              ) : (
                filtered.map((c) => {
                  const fullName = `${c.firstName} ${c.lastName || ''}`.trim() || 'Contact'
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        onSelectContact(c.id)
                        onClose()
                      }}
                      className="px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          accountId={accountId}
                          peerId={c.id}
                          title={fullName}
                          initials={fullName.charAt(0)}
                          avatarUrl={c.avatarUrl}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-100 truncate group-hover:text-accent-cyan transition-colors">
                            {fullName}
                          </div>
                          <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5 font-mono">
                            {c.phone && <span>{c.phone}</span>}
                            {c.username && <span className="text-accent-cyan">@{c.username}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons: QR code & vCard */}
                      <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          title="Share Contact QR & vCard"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedQrContact(c)
                          }}
                          className="p-2 rounded-xl text-gray-400 hover:text-accent-cyan hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}

        {/* QR Code & vCard Modal Overlay */}
        <AnimatePresence>
          {selectedQrContact && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 12 }}
                className="bg-[#121b22] border border-accent-cyan/30 w-full max-w-xs rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center relative"
              >
                <button
                  type="button"
                  onClick={() => setSelectedQrContact(null)}
                  className="absolute right-3.5 top-3.5 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="mb-3">
                  <Avatar
                    accountId={accountId}
                    peerId={selectedQrContact.id}
                    title={`${selectedQrContact.firstName} ${selectedQrContact.lastName || ''}`}
                    size="lg"
                  />
                </div>

                <h3 className="font-bold text-sm text-white truncate max-w-[200px]">
                  {selectedQrContact.firstName} {selectedQrContact.lastName || ''}
                </h3>
                <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                  {selectedQrContact.phone || (selectedQrContact.username ? `@${selectedQrContact.username}` : 'Contact Card')}
                </p>

                {/* QR Display */}
                <div className="my-4 p-2.5 bg-[#0c131a] rounded-2xl border border-white/10 shadow-inner">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Contact QR Code" className="w-44 h-44 rounded-xl" />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-xs text-gray-500">
                      Generating QR...
                    </div>
                  )}
                </div>

                {/* Format Toggle */}
                <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl text-[11px] mb-4">
                  <button
                    type="button"
                    onClick={() => setQrFormat('vcard')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      qrFormat === 'vcard' ? 'bg-accent-cyan text-dark-950 font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    vCard 4.0
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrFormat('telegram')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      qrFormat === 'telegram' ? 'bg-accent-cyan text-dark-950 font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Telegram Link
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={handleCopyVCard}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {qrCopied ? <Check className="w-3.5 h-3.5 text-accent-cyan" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{qrCopied ? 'Copied!' : 'Copy vCard'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadVCard}
                    className="flex-1 py-2 px-3 rounded-xl bg-accent-cyan text-dark-950 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-accent-cyan/90 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save .vcf</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
