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
  Trash2,
  UserCheck,
  Shield,
  Loader2,
  Wrench,
  AlertCircle,
  MessageSquare,
  MapPin,
  Compass,
  Navigation,
  KeyRound,
  Link2,
  Radio,
  RefreshCw,
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

type ContactTab = 'all' | 'close_friends' | 'nearby' | 'top' | 'birthdays' | 'tools' | 'add'

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
  const [addPhonePrivacyException, setAddPhonePrivacyException] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [addSuccess, setAddSuccess] = useState(false)
  const [importNotification, setImportNotification] = useState<string | null>(null)

  // Layer 232 Contacts States (Microphase 028)
  const [closeFriends, setCloseFriends] = useState<string[]>([])
  const [isUpdatingCloseFriends, setIsUpdatingCloseFriends] = useState(false)

  const [phonesToDelete, setPhonesToDelete] = useState('')
  const [isDeletingPhones, setIsDeletingPhones] = useState(false)
  const [deletePhonesSuccess, setDeletePhonesSuccess] = useState<string | null>(null)

  const [replyMsgId, setReplyMsgId] = useState('')
  const [replyDeleteMessage, setReplyDeleteMessage] = useState(true)
  const [replyDeleteHistory, setReplyDeleteHistory] = useState(false)
  const [replyReportSpam, setReplyReportSpam] = useState(false)
  const [isBlockingReplies, setIsBlockingReplies] = useState(false)
  const [blockRepliesSuccess, setBlockRepliesSuccess] = useState<string | null>(null)

  // Layer 232 Contacts States (Microphase 029)
  // Nearby / contacts.getLocated
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([])
  const [nearbyChats, setNearbyChats] = useState<any[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyError, setNearbyError] = useState<string | null>(null)
  const [nearbyLat, setNearbyLat] = useState<number>(35.6892)
  const [nearbyLong, setNearbyLong] = useState<number>(51.3890)
  const [isLocatingCoords, setIsLocatingCoords] = useState(false)
  const [nearbySearched, setNearbySearched] = useState(false)

  // Tokens / contacts.exportContactToken & exportNoPaidMessagesToken
  const [contactToken, setContactToken] = useState<{ url: string; expires: number } | null>(null)
  const [isExportingContactToken, setIsExportingContactToken] = useState(false)
  const [noPaidToken, setNoPaidToken] = useState<{ url: string; expires: number } | null>(null)
  const [isExportingNoPaidToken, setIsExportingNoPaidToken] = useState(false)
  const [tokenCopiedMessage, setTokenCopiedMessage] = useState<string | null>(null)

  // Contact IDs / contacts.getContactIDs
  const [cloudContactIDs, setCloudContactIDs] = useState<Array<string | number> | null>(null)
  const [isLoadingContactIDs, setIsLoadingContactIDs] = useState(false)

  // Layer 232 Contacts States (Microphase 030)
  // contacts.getStatuses
  const [contactStatuses, setContactStatuses] = useState<Map<string, any>>(new Map())

  // contacts.getSaved
  const [savedContactsList, setSavedContactsList] = useState<any[]>([])
  const [isLoadingSavedContacts, setIsLoadingSavedContacts] = useState(false)

  // contacts.getSponsoredPeers
  const [sponsoredPeers, setSponsoredPeers] = useState<any[]>([])
  const [sponsoredQuery, setSponsoredQuery] = useState('')
  const [isLoadingSponsored, setIsLoadingSponsored] = useState(false)
  const [sponsoredSearched, setSponsoredSearched] = useState(false)

  // contacts.importContactToken
  const [importTokenInput, setImportTokenInput] = useState('')
  const [isImportingToken, setIsImportingToken] = useState(false)
  const [importTokenResult, setImportTokenResult] = useState<string | null>(null)
  const [importTokenError, setImportTokenError] = useState<string | null>(null)

  // contacts.importNoPaidMessagesToken
  const [noPaidUserIdInput, setNoPaidUserIdInput] = useState('')
  const [noPaidTokenInput, setNoPaidTokenInput] = useState('')
  const [isImportingNoPaidToken, setIsImportingNoPaidToken] = useState(false)
  const [importNoPaidResult, setImportNoPaidResult] = useState<string | null>(null)
  const [importNoPaidError, setImportNoPaidError] = useState<string | null>(null)

  const loadAll = () => {
    if (!isOpen || !accountId) return
    setLoading(true)

    const pContacts = window.guidegram?.getContacts ? window.guidegram.getContacts(accountId) : Promise.resolve([])
    const pTop = window.guidegram?.getTopPeers ? window.guidegram.getTopPeers(accountId, { correspondents: true }) : Promise.resolve(null)
    const pBirthdays = window.guidegram?.getBirthdays ? window.guidegram.getBirthdays(accountId) : Promise.resolve([])
    const pStatuses = window.guidegram?.getContactStatuses ? window.guidegram.getContactStatuses(accountId) : Promise.resolve([])

    Promise.all([pContacts, pTop, pBirthdays, pStatuses])
      .then(([list, top, bdays, statuses]) => {
        if (Array.isArray(list)) setContacts(list)
        if (top?.users && Array.isArray(top.users)) setTopPeers(top.users)
        if (Array.isArray(bdays)) setBirthdays(bdays)
        if (Array.isArray(statuses)) {
          const sMap = new Map<string, any>()
          for (const s of statuses) {
            if (s.userId) sMap.set(s.userId.toString(), s)
          }
          setContactStatuses(sMap)
        }
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
          addPhonePrivacyException,
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
        setAddPhonePrivacyException(false)
        setActiveTab('all')
        loadAll()
      }, 1200)
    } catch (err) {
      console.error('Failed to add contact:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleCloseFriend = async (userId: string) => {
    if (!accountId || !window.guidegram?.editCloseFriends) return
    const nextList = closeFriends.includes(userId)
      ? closeFriends.filter((id) => id !== userId)
      : [...closeFriends, userId]

    setIsUpdatingCloseFriends(true)
    try {
      const ok = await window.guidegram.editCloseFriends(accountId, nextList)
      if (ok) {
        setCloseFriends(nextList)
      }
    } catch (err) {
      console.warn('Failed to edit close friends:', err)
    } finally {
      setIsUpdatingCloseFriends(false)
    }
  }

  const handleAcceptContact = async (userId: string) => {
    if (!accountId || !window.guidegram?.acceptContact) return
    try {
      await window.guidegram.acceptContact(accountId, userId)
      loadAll()
    } catch (err) {
      console.warn('Failed to accept contact:', err)
    }
  }

  const handleDeleteContact = async (userId: string) => {
    if (!accountId || !window.guidegram?.deleteContacts) return
    try {
      const ok = await window.guidegram.deleteContacts(accountId, [userId])
      if (ok) {
        setContacts((prev) => prev.filter((c) => c.id !== userId))
      }
    } catch (err) {
      console.warn('Failed to delete contact:', err)
    }
  }

  const handleBlockContact = async (userId: string, myStoriesFrom = false) => {
    if (!accountId || !window.guidegram?.blockContact) return
    try {
      await window.guidegram.blockContact(accountId, userId, myStoriesFrom)
      loadAll()
    } catch (err) {
      console.warn('Failed to block contact:', err)
    }
  }

  const handleDeleteByPhones = async () => {
    if (!accountId || !phonesToDelete.trim() || !window.guidegram?.deleteByPhones) return
    const phoneList = phonesToDelete
      .split(/[\n,]+/)
      .map((p) => p.trim())
      .filter(Boolean)
    if (phoneList.length === 0) return

    setIsDeletingPhones(true)
    try {
      const ok = await window.guidegram.deleteByPhones(accountId, phoneList)
      if (ok) {
        setDeletePhonesSuccess(`Deleted ${phoneList.length} phone numbers from cloud.`)
        setPhonesToDelete('')
        loadAll()
        setTimeout(() => setDeletePhonesSuccess(null), 3000)
      }
    } catch (err) {
      console.warn('Failed to delete contacts by phones:', err)
    } finally {
      setIsDeletingPhones(false)
    }
  }

  const handleBlockFromReplies = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId || !replyMsgId.trim() || !window.guidegram?.blockFromReplies) return
    const msgIdNum = parseInt(replyMsgId.trim(), 10)
    if (isNaN(msgIdNum)) return

    setIsBlockingReplies(true)
    try {
      const res = await window.guidegram.blockFromReplies(
        accountId,
        msgIdNum,
        replyDeleteMessage,
        replyDeleteHistory,
        replyReportSpam
      )
      if (res) {
        setBlockRepliesSuccess(`User blocked from replies for msg #${msgIdNum}`)
        setReplyMsgId('')
        setTimeout(() => setBlockRepliesSuccess(null), 3500)
      }
    } catch (err) {
      console.warn('Failed to block from replies:', err)
    } finally {
      setIsBlockingReplies(false)
    }
  }

  // Microphase 029 Handlers
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setNearbyError('Geolocation is not supported by your environment.')
      return
    }
    setIsLocatingCoords(true)
    setNearbyError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNearbyLat(parseFloat(pos.coords.latitude.toFixed(6)))
        setNearbyLong(parseFloat(pos.coords.longitude.toFixed(6)))
        setIsLocatingCoords(false)
      },
      (err) => {
        console.warn('Geolocation lookup failed:', err)
        setNearbyError('Could not auto-detect GPS coordinates. Please specify manually.')
        setIsLocatingCoords(false)
      },
      { timeout: 8000 }
    )
  }

  const handleFetchNearby = async () => {
    if (!accountId || !window.guidegram?.getLocated) return
    setNearbyLoading(true)
    setNearbyError(null)
    setNearbySearched(true)
    try {
      const res = await window.guidegram.getLocated(accountId, nearbyLat, nearbyLong, false, 3600)
      if (res) {
        const users = res.users || []
        const chats = res.chats || []
        setNearbyUsers(Array.isArray(users) ? users : [])
        setNearbyChats(Array.isArray(chats) ? chats : [])
      }
    } catch (err: any) {
      console.error('Failed to get located peers:', err)
      setNearbyError(err?.message || 'Failed to fetch nearby peers from Telegram')
    } finally {
      setNearbyLoading(false)
    }
  }

  const handleExportContactToken = async () => {
    if (!accountId || !window.guidegram?.exportContactToken) return
    setIsExportingContactToken(true)
    try {
      const res = await window.guidegram.exportContactToken(accountId)
      if (res?.url) {
        setContactToken(res)
      }
    } catch (err: any) {
      console.warn('Failed to export contact token:', err)
    } finally {
      setIsExportingContactToken(false)
    }
  }

  const handleExportNoPaidMessagesToken = async () => {
    if (!accountId || !window.guidegram?.exportNoPaidMessagesToken) return
    setIsExportingNoPaidToken(true)
    try {
      const res = await window.guidegram.exportNoPaidMessagesToken(accountId)
      if (res?.url) {
        setNoPaidToken(res)
      }
    } catch (err: any) {
      console.warn('Failed to export no-paid messages token:', err)
    } finally {
      setIsExportingNoPaidToken(false)
    }
  }

  const handleFetchContactIDs = async () => {
    if (!accountId || !window.guidegram?.getContactIDs) return
    setIsLoadingContactIDs(true)
    try {
      const ids = await window.guidegram.getContactIDs(accountId)
      if (Array.isArray(ids)) {
        setCloudContactIDs(ids)
      }
    } catch (err: any) {
      console.warn('Failed to fetch contact IDs:', err)
    } finally {
      setIsLoadingContactIDs(false)
    }
  }

  const handleCopyToken = async (text: string, label: string) => {
    await copyTextToClipboard(text)
    setTokenCopiedMessage(`${label} copied to clipboard!`)
    setTimeout(() => setTokenCopiedMessage(null), 3000)
  }

  // Microphase 030 Handlers
  const handleImportContactToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId || !importTokenInput.trim() || !window.guidegram?.importContactToken) return
    setIsImportingToken(true)
    setImportTokenResult(null)
    setImportTokenError(null)
    try {
      const cleanToken = importTokenInput.trim().replace(/^https:\/\/t\.me\/contact\//, '')
      const res = await window.guidegram.importContactToken(accountId, cleanToken)
      if (res) {
        setImportTokenResult('Contact imported successfully via MTProto token!')
        setImportTokenInput('')
        loadAll()
        setTimeout(() => setImportTokenResult(null), 4000)
      } else {
        setImportTokenError('Invalid or expired contact token.')
      }
    } catch (err: any) {
      console.warn('Failed to import contact token:', err)
      setImportTokenError(err?.message || 'Failed to import contact token')
    } finally {
      setIsImportingToken(false)
    }
  }

  const handleImportNoPaidMessagesToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId || !noPaidUserIdInput.trim() || !noPaidTokenInput.trim() || !window.guidegram?.importNoPaidMessagesToken) return
    setIsImportingNoPaidToken(true)
    setImportNoPaidResult(null)
    setImportNoPaidError(null)
    try {
      const res = await window.guidegram.importNoPaidMessagesToken(
        accountId,
        noPaidUserIdInput.trim(),
        noPaidTokenInput.trim()
      )
      if (res) {
        setImportNoPaidResult('Free messaging pass applied! You can now send free messages to this user.')
        setNoPaidUserIdInput('')
        setNoPaidTokenInput('')
        setTimeout(() => setImportNoPaidResult(null), 4000)
      } else {
        setImportNoPaidError('Could not apply token. Check user ID and token validity.')
      }
    } catch (err: any) {
      console.warn('Failed to import no-paid messages token:', err)
      setImportNoPaidError(err?.message || 'Failed to import free-messaging pass token')
    } finally {
      setIsImportingNoPaidToken(false)
    }
  }

  const handleFetchSponsoredPeers = async () => {
    if (!accountId || !window.guidegram?.getSponsoredPeers) return
    setIsLoadingSponsored(true)
    setSponsoredSearched(true)
    try {
      const peers = await window.guidegram.getSponsoredPeers(accountId, sponsoredQuery.trim())
      setSponsoredPeers(Array.isArray(peers) ? peers : [])
    } catch (err: any) {
      console.warn('Failed to get sponsored peers:', err)
    } finally {
      setIsLoadingSponsored(false)
    }
  }

  const handleFetchSavedContacts = async () => {
    if (!accountId || !window.guidegram?.getSavedContacts) return
    setIsLoadingSavedContacts(true)
    try {
      const list = await window.guidegram.getSavedContacts(accountId)
      setSavedContactsList(Array.isArray(list) ? list : [])
    } catch (err: any) {
      console.warn('Failed to fetch saved contacts:', err)
    } finally {
      setIsLoadingSavedContacts(false)
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
        <div className="flex items-center border-b border-white/5 px-3 py-2 gap-1 bg-dark-900/50 overflow-x-auto scrollbar-none">
          {[
            { id: 'all' as const, label: `All (${contacts.length})`, icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'close_friends' as const, label: `Close Friends (${closeFriends.length})`, icon: <Star className="w-3.5 h-3.5 text-emerald-400" /> },
            { id: 'nearby' as const, label: 'Nearby', icon: <MapPin className="w-3.5 h-3.5 text-cyan-400" /> },
            { id: 'top' as const, label: 'Top', icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" /> },
            { id: 'birthdays' as const, label: 'Birthdays', icon: <Cake className="w-3.5 h-3.5 text-rose-400" /> },
            { id: 'tools' as const, label: 'Tools', icon: <Wrench className="w-3.5 h-3.5 text-purple-400" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
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
            className={`ml-auto relative px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer shrink-0 ${
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

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="phonePrivacyException"
                checked={addPhonePrivacyException}
                onChange={(e) => setAddPhonePrivacyException(e.target.checked)}
                className="w-4 h-4 rounded bg-dark-900 border border-white/20 text-accent-cyan focus:ring-0 cursor-pointer"
              />
              <label htmlFor="phonePrivacyException" className="text-[11px] text-gray-300 cursor-pointer select-none">
                Share My Phone with Contact (Privacy Exception)
              </label>
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

            {/* Import via Temporary Contact Token (contacts.importContactToken) */}
            <div className="pt-4 border-t border-white/5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-200 uppercase tracking-wider">
                <Link2 className="w-3.5 h-3.5 text-accent-cyan" />
                <span>Or Add via Contact Token / Link</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Paste a temporary contact link (https://t.me/contact/...) or token to add someone without needing their phone number.
              </p>
              {importTokenResult && (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-3.5 h-3.5" />
                  <span>{importTokenResult}</span>
                </div>
              )}
              {importTokenError && (
                <div className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{importTokenError}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={importTokenInput}
                  onChange={(e) => setImportTokenInput(e.target.value)}
                  placeholder="https://t.me/contact/... or raw token"
                  className="flex-1 px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-accent-cyan"
                />
                <button
                  type="button"
                  onClick={handleImportContactToken}
                  disabled={isImportingToken || !importTokenInput.trim()}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                >
                  {isImportingToken ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-accent-cyan" />}
                  <span>Import</span>
                </button>
              </div>
            </div>
          </form>
        ) : activeTab === 'close_friends' ? (
          <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10">
            {contacts.filter((c) => closeFriends.includes(c.id)).length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                <Star className="w-8 h-8 text-emerald-400/50 mx-auto" />
                <div className="font-semibold text-gray-300">No Close Friends Added Yet</div>
                <div className="text-[11px] text-gray-500">
                  Star contacts in the "All" tab to manage your close friends list for stories & privacy.
                </div>
              </div>
            ) : (
              contacts
                .filter((c) => closeFriends.includes(c.id))
                .map((c) => {
                  const fullName = `${c.firstName} ${c.lastName || ''}`.trim() || 'Contact'
                  return (
                    <div
                      key={`close-${c.id}`}
                      className="px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
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
                          <div className="text-sm font-semibold text-gray-100 truncate flex items-center gap-1.5">
                            <span>{fullName}</span>
                            <span className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                              <Star className="w-3 h-3 fill-emerald-400" />
                            </span>
                          </div>
                          {c.username && <div className="text-[11px] text-accent-cyan font-mono">@{c.username}</div>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleCloseFriend(c.id)}
                        disabled={isUpdatingCloseFriends}
                        title="Remove from Close Friends"
                        className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>Remove</span>
                      </button>
                    </div>
                  )
                })
            )}
          </div>
        ) : activeTab === 'nearby' ? (
          <div className="flex-1 overflow-y-auto flex flex-col p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
            {/* Coordinates / Radar Control */}
            <div className="bg-dark-900/60 p-3.5 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                  <Compass className="w-4 h-4 text-accent-cyan" />
                  <span>Geographic Radar (MTProto contacts.getLocated)</span>
                </div>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLocatingCoords}
                  title="Detect coordinates from device"
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-gray-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {isLocatingCoords ? <Loader2 className="w-3 h-3 animate-spin text-accent-cyan" /> : <Navigation className="w-3 h-3 text-accent-cyan" />}
                  <span>GPS Auto-Detect</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={nearbyLat}
                    onChange={(e) => setNearbyLat(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-dark-950 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-accent-cyan"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={nearbyLong}
                    onChange={(e) => setNearbyLong(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-dark-950 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-accent-cyan"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleFetchNearby}
                disabled={nearbyLoading}
                className="w-full py-2 rounded-xl bg-accent-cyan/20 hover:bg-accent-cyan/30 border border-accent-cyan/30 text-accent-cyan font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40"
              >
                {nearbyLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                <span>Scan for Nearby Peers & Groups</span>
              </button>
            </div>

            {/* 4-State UI for Nearby */}
            {nearbyLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3 text-center">
                <Loader2 className="w-8 h-8 text-accent-cyan animate-spin" />
                <div className="text-xs font-semibold text-gray-300">Scanning local MTProto frequencies...</div>
                <div className="text-[11px] text-gray-500">Querying contacts.getLocated with Layer 232 peer Located specs.</div>
              </div>
            ) : nearbyError ? (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>Scan Failed</span>
                </div>
                <div className="text-[11px] text-rose-200/80">{nearbyError}</div>
                <button
                  type="button"
                  onClick={handleFetchNearby}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Retry Scan
                </button>
              </div>
            ) : !nearbySearched ? (
              <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                <MapPin className="w-8 h-8 text-cyan-400/40 mx-auto" />
                <div className="font-semibold text-gray-300">Discover Nearby Telegram Users & Groups</div>
                <div className="text-[11px] text-gray-500 max-w-xs mx-auto">
                  Click scan to discover Telegram users and local community channels located around your coordinates.
                </div>
              </div>
            ) : nearbyUsers.length === 0 && nearbyChats.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                <Compass className="w-8 h-8 text-gray-600 mx-auto" />
                <div className="font-semibold text-gray-300">No Nearby Peers Detected</div>
                <div className="text-[11px] text-gray-500">
                  No public users or geo-located supergroups were found at coordinates ({nearbyLat}, {nearbyLong}).
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {nearbyUsers.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                      Nearby People ({nearbyUsers.length})
                    </div>
                    <div className="divide-y divide-white/5 rounded-2xl bg-dark-900/40 border border-white/5 overflow-hidden">
                      {nearbyUsers.map((u: any) => {
                        const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Nearby User'
                        return (
                          <div
                            key={u.id}
                            onClick={() => {
                              onSelectContact(u.id.toString())
                              onClose()
                            }}
                            className="px-3.5 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar accountId={accountId} peerId={u.id.toString()} title={name} initials={name.charAt(0)} size="sm" />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-gray-200 truncate">{name}</div>
                                {u.username && <div className="text-[10px] text-accent-cyan font-mono">@{u.username}</div>}
                              </div>
                            </div>
                            <span className="text-[10px] bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded-full font-medium">
                              Nearby
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {nearbyChats.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                      Nearby Channels & Groups ({nearbyChats.length})
                    </div>
                    <div className="divide-y divide-white/5 rounded-2xl bg-dark-900/40 border border-white/5 overflow-hidden">
                      {nearbyChats.map((c: any) => {
                        const title = c.title || 'Nearby Group'
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              onSelectContact(c.id.toString())
                              onClose()
                            }}
                            className="px-3.5 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar accountId={accountId} peerId={c.id.toString()} title={title} initials={title.charAt(0)} size="sm" />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-gray-200 truncate">{title}</div>
                                {c.username && <div className="text-[10px] text-accent-cyan font-mono">@{c.username}</div>}
                              </div>
                            </div>
                            <span className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full font-medium">
                              Local Group
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'tools' ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
            {/* Delete By Phones Section (contacts.deleteByPhones) */}
            <div className="space-y-3 bg-dark-900/60 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-200 uppercase tracking-wider">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Bulk Delete by Phone Numbers</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Remove contacts from your Telegram account in bulk by entering phone numbers.
              </p>
              <textarea
                value={phonesToDelete}
                onChange={(e) => setPhonesToDelete(e.target.value)}
                placeholder="+1234567890, +989123456789 (comma or line separated)"
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-dark-950 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-rose-400 resize-none"
              />
              {deletePhonesSuccess && (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-3.5 h-3.5" />
                  <span>{deletePhonesSuccess}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleDeleteByPhones}
                disabled={isDeletingPhones || !phonesToDelete.trim()}
                className="w-full py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40"
              >
                {isDeletingPhones ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete Numbers from Cloud</span>
              </button>
            </div>

            {/* Block from Replies Section (contacts.blockFromReplies) */}
            <form onSubmit={handleBlockFromReplies} className="space-y-3 bg-dark-900/60 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-200 uppercase tracking-wider">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Block Sender from Replies</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Block a spammer from comment sections and replies by their discussion Message ID.
              </p>
              <input
                type="number"
                required
                value={replyMsgId}
                onChange={(e) => setReplyMsgId(e.target.value)}
                placeholder="Discussion Message ID (e.g. 10452)"
                className="w-full px-3 py-2 rounded-xl bg-dark-950 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
              />
              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replyDeleteMessage}
                    onChange={(e) => setReplyDeleteMessage(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-dark-900 border border-white/20"
                  />
                  <span>Delete message</span>
                </label>
                <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replyDeleteHistory}
                    onChange={(e) => setReplyDeleteHistory(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-dark-900 border border-white/20"
                  />
                  <span>Delete all user messages</span>
                </label>
                <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replyReportSpam}
                    onChange={(e) => setReplyReportSpam(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-dark-900 border border-white/20"
                  />
                  <span>Report spam to Telegram</span>
                </label>
              </div>
              {blockRepliesSuccess && (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-3.5 h-3.5" />
                  <span>{blockRepliesSuccess}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={isBlockingReplies || !replyMsgId.trim()}
                className="w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40"
              >
                {isBlockingReplies ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                <span>Block from Replies</span>
              </button>
            </form>

            {/* Export Contact Tokens (contacts.exportContactToken & contacts.exportNoPaidMessagesToken) */}
            <div className="space-y-3 bg-dark-900/60 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-200 uppercase tracking-wider">
                <KeyRound className="w-4 h-4 text-accent-cyan" />
                <span>Contact Sharing & Free-Chat Tokens</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Generate temporary MTProto tokens to share your contact safely or allow peers to message you free of stars fee.
              </p>

              {tokenCopiedMessage && (
                <div className="px-3 py-1.5 rounded-lg bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan text-xs flex items-center gap-2">
                  <Check className="w-3.5 h-3.5" />
                  <span>{tokenCopiedMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExportContactToken}
                  disabled={isExportingContactToken}
                  className="py-2 px-3 rounded-xl bg-accent-cyan/15 hover:bg-accent-cyan/25 border border-accent-cyan/30 text-accent-cyan font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                >
                  {isExportingContactToken ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                  <span>Export Contact Link</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportNoPaidMessagesToken}
                  disabled={isExportingNoPaidToken}
                  className="py-2 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                >
                  {isExportingNoPaidToken ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>No-Paid Pass Token</span>
                </button>
              </div>

              {contactToken && (
                <div className="p-3 rounded-xl bg-dark-950 border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span className="font-semibold text-accent-cyan">Contact Token URL</span>
                    <span>Expires in {Math.max(0, Math.round((contactToken.expires * 1000 - Date.now()) / 60000))}m</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={contactToken.url}
                      className="w-full px-2 py-1 bg-transparent text-xs text-gray-200 font-mono truncate focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyToken(contactToken.url, 'Contact link')}
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {noPaidToken && (
                <div className="p-3 rounded-xl bg-dark-950 border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span className="font-semibold text-purple-300">Free Messages Pass Link</span>
                    <span>Expires in {Math.max(0, Math.round((noPaidToken.expires * 1000 - Date.now()) / 60000))}m</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={noPaidToken.url}
                      className="w-full px-2 py-1 bg-transparent text-xs text-gray-200 font-mono truncate focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyToken(noPaidToken.url, 'No-paid pass')}
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cloud Contact IDs Telemetry (contacts.getContactIDs) */}
            <div className="space-y-3 bg-dark-900/60 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-200 uppercase tracking-wider">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Cloud Contact IDs Telemetry</span>
                </div>
                <button
                  type="button"
                  onClick={handleFetchContactIDs}
                  disabled={isLoadingContactIDs}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-gray-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {isLoadingContactIDs ? <Loader2 className="w-3 h-3 animate-spin text-emerald-400" /> : <RefreshCw className="w-3 h-3 text-emerald-400" />}
                  <span>Query Cloud IDs</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-400">
                Directly fetches the raw binary contact ID array stored on Telegram core data centers for this account.
              </p>
              {cloudContactIDs !== null && (
                <div className="p-3 rounded-xl bg-dark-950 border border-white/10 space-y-1">
                  <div className="text-[11px] text-emerald-300 font-semibold">
                    Total Cloud Contacts: {cloudContactIDs.length} IDs
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono truncate">
                    IDs: {cloudContactIDs.slice(0, 10).join(', ')}{cloudContactIDs.length > 10 ? '...' : ''}
                  </div>
                </div>
              )}
            </div>

            {/* Redeem Free-Chat Pass Token (contacts.importNoPaidMessagesToken) */}
            <form onSubmit={handleImportNoPaidMessagesToken} className="space-y-3 bg-dark-900/60 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-200 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Redeem Free-Messaging Pass Token</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Apply a received No-Paid token to bypass stars fee when starting a conversation with a specific contact.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={noPaidUserIdInput}
                  onChange={(e) => setNoPaidUserIdInput(e.target.value)}
                  placeholder="Target User ID or Phone"
                  className="px-2.5 py-1.5 rounded-xl bg-dark-950 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-purple-400"
                />
                <input
                  type="text"
                  required
                  value={noPaidTokenInput}
                  onChange={(e) => setNoPaidTokenInput(e.target.value)}
                  placeholder="Paste Token / URL"
                  className="px-2.5 py-1.5 rounded-xl bg-dark-950 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-purple-400"
                />
              </div>
              {importNoPaidResult && (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-3.5 h-3.5" />
                  <span>{importNoPaidResult}</span>
                </div>
              )}
              {importNoPaidError && (
                <div className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{importNoPaidError}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={isImportingNoPaidToken || !noPaidUserIdInput.trim() || !noPaidTokenInput.trim()}
                className="w-full py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40"
              >
                {isImportingNoPaidToken ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Apply Free Pass Token</span>
              </button>
            </form>

            {/* Sponsored Peers / Channels Discovery (contacts.getSponsoredPeers) */}
            <div className="space-y-3 bg-dark-900/60 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-200 uppercase tracking-wider">
                  <AtSign className="w-4 h-4 text-accent-cyan" />
                  <span>Sponsored Channels Discovery</span>
                </div>
                <button
                  type="button"
                  onClick={handleFetchSponsoredPeers}
                  disabled={isLoadingSponsored}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-gray-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {isLoadingSponsored ? <Loader2 className="w-3 h-3 animate-spin text-accent-cyan" /> : <RefreshCw className="w-3 h-3 text-accent-cyan" />}
                  <span>Discover</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-400">
                Queries official sponsored telegram peers and channels recommended for contacts directory.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={sponsoredQuery}
                  onChange={(e) => setSponsoredQuery(e.target.value)}
                  placeholder="Optional search keyword (e.g. news, crypto)"
                  className="flex-1 px-2.5 py-1.5 rounded-xl bg-dark-950 border border-white/10 text-xs text-white focus:outline-none focus:border-accent-cyan"
                />
              </div>
              {isLoadingSponsored ? (
                <div className="p-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent-cyan" />
                  <span>Querying sponsored channels...</span>
                </div>
              ) : sponsoredSearched && sponsoredPeers.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-500 bg-dark-950/50 rounded-xl">
                  No sponsored peers found for this query.
                </div>
              ) : sponsoredPeers.length > 0 ? (
                <div className="divide-y divide-white/5 rounded-xl bg-dark-950 border border-white/5 overflow-hidden max-h-40 overflow-y-auto">
                  {sponsoredPeers.map((p: any, idx) => {
                    const title = p.title || p.username || `Sponsored #${idx}`
                    return (
                      <div key={idx} className="px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="text-xs text-gray-200 truncate">{title}</div>
                        <span className="text-[9px] bg-accent-cyan/15 text-accent-cyan px-1.5 py-0.5 rounded font-bold">
                          SPONSORED
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>

            {/* Cloud Saved Contacts Cache (contacts.getSaved) */}
            <div className="space-y-3 bg-dark-900/60 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-200 uppercase tracking-wider">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Cloud Saved Contacts Cache</span>
                </div>
                <button
                  type="button"
                  onClick={handleFetchSavedContacts}
                  disabled={isLoadingSavedContacts}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-gray-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {isLoadingSavedContacts ? <Loader2 className="w-3 h-3 animate-spin text-emerald-400" /> : <RefreshCw className="w-3 h-3 text-emerald-400" />}
                  <span>Inspect Saved</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-400">
                Audits the raw list of saved address book entries stored in your account's cloud cache.
              </p>
              {savedContactsList.length > 0 && (
                <div className="p-3 rounded-xl bg-dark-950 border border-white/10 space-y-1 max-h-36 overflow-y-auto">
                  <div className="text-[11px] text-emerald-300 font-semibold mb-1">
                    Cached Entries ({savedContactsList.length}):
                  </div>
                  {savedContactsList.map((sc: any, idx) => (
                    <div key={idx} className="text-[10px] text-gray-300 flex items-center justify-between py-0.5">
                      <span className="font-mono">{sc.phone || `#${idx}`}</span>
                      <span className="text-gray-400">{sc.firstName} {sc.lastName || ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
                  const isClose = closeFriends.includes(c.id)
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
                          <div className="text-sm font-semibold text-gray-100 truncate group-hover:text-accent-cyan transition-colors flex items-center gap-1.5">
                            <span>{fullName}</span>
                            {isClose && (
                              <span className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400" title="Close Friend">
                                <Star className="w-3 h-3 fill-emerald-400" />
                              </span>
                            )}
                            {(() => {
                              const st = contactStatuses.get(c.id)
                              const isOnline = st?.status?._ === 'userStatusOnline' || st?._ === 'userStatusOnline'
                              return isOnline ? (
                                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  <span>online</span>
                                </span>
                              ) : null
                            })()}
                          </div>
                          <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5 font-mono">
                            {c.phone && <span>{c.phone}</span>}
                            {c.username && <span className="text-accent-cyan">@{c.username}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons: Close friend toggle, Accept, Block, Delete, QR code */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          title={isClose ? 'Remove from Close Friends' : 'Add to Close Friends'}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleCloseFriend(c.id)
                          }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isClose ? 'text-emerald-400 bg-emerald-500/15' : 'text-gray-400 hover:text-emerald-400 hover:bg-white/5'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isClose ? 'fill-emerald-400' : ''}`} />
                        </button>

                        <button
                          type="button"
                          title="Accept Contact"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAcceptContact(c.id)
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-accent-cyan hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          title="Block Contact"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleBlockContact(c.id, true)
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          title="Delete Contact"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteContact(c.id)
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          title="Share Contact QR & vCard"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedQrContact(c)
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-accent-cyan hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
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
