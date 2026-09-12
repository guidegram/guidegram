import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  X,
  QrCode,
  Camera,
  Gift,
  User,
  Phone,
  AtSign,
  Megaphone,
  Bot,
  Palette,
  Calendar,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { AccountInfo, MyFullProfile } from '../types/telegram'
import { Avatar } from './Avatar'
import { copyTextToClipboard } from '../utils/clipboard'
import QRCode from 'qrcode'

interface MyProfileDrawerProps {
  isOpen: boolean
  onClose: () => void
  account: AccountInfo | null
  onOpenChatByUsername?: (username: string) => void
}

export const MyProfileDrawer: React.FC<MyProfileDrawerProps> = ({
  isOpen,
  onClose,
  account,
  onOpenChatByUsername,
}) => {
  const [profile, setProfile] = useState<MyFullProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !account?.id) return
    let isMounted = true
    setLoading(true)

    if (window.guidegram?.getMyFullProfile) {
      window.guidegram
        .getMyFullProfile(account.id)
        .then((res) => {
          if (isMounted && res) {
            setProfile(res)
          }
        })
        .finally(() => {
          if (isMounted) setLoading(false)
        })
    } else {
      setLoading(false)
    }

    return () => {
      isMounted = false
    }
  }, [isOpen, account?.id])

  // Generate QR Code when QR modal is opened
  useEffect(() => {
    if (!showQrModal || !account) return
    const targetLink = account.username
      ? `https://t.me/${account.username}`
      : `tg://user?id=${account.id}`
    QRCode.toDataURL(targetLink, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    }).then(setQrDataUrl)
  }, [showQrModal, account])

  if (!isOpen || !account) return null

  const handleCopy = async (field: string, text: string) => {
    const ok = await copyTextToClipboard(text)
    if (ok) {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    }
  }

  const fullName = [account.firstName, account.lastName].filter(Boolean).join(' ') || 'User'
  const usernameText = profile?.username || account.username
  const phoneText = profile?.phone || account.phone
  const bioText = profile?.bio || 'No bio specified'
  const channelTitle = profile?.personalChannelTitle || (profile?.personalChannelUsername ? `@${profile.personalChannelUsername}` : 'Channel')
  const botUsername = profile?.chatAutomationBot || '@DrGuidanceBot'
  const giftsCount = profile?.stargiftsCount ?? 0

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-80 md:w-96 h-full bg-[#0e1621] border-l border-white/10 shadow-2xl z-10 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 text-gray-200">
        {/* Top App Bar (Header) */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-white/5 bg-[#17212b]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="font-semibold text-base text-white">Info</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Show QR Code"
            >
              <QrCode className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10">
          {/* Avatar & Main Identity Card */}
          <div className="p-6 flex flex-col items-center justify-center bg-[#17212b]">
            <div className="relative group cursor-pointer mb-3">
              <Avatar
                accountId={account.id}
                peerId={account.id}
                title={fullName}
                initials={fullName.charAt(0)}
                avatarUrl={profile?.avatarUrl || account.avatarUrl}
                size="xl"
                className="w-24 h-24 text-3xl shadow-xl ring-2 ring-emerald-500/40"
              />
              <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg border-2 border-[#17212b] group-hover:scale-110 transition-transform">
                <Camera className="w-4 h-4" />
              </div>
            </div>

            <div className="text-lg font-bold text-white flex items-center gap-1.5 text-center">
              <span>{fullName}</span>
              {account.isPremium && (
                <Sparkles className="w-4 h-4 text-accent-cyan fill-accent-cyan" />
              )}
            </div>

            <div className="text-xs text-accent-cyan font-medium mt-0.5">online</div>

            {/* Bio Card with Gifts Counter */}
            <div className="w-full mt-4 p-3 rounded-xl bg-dark-900/60 border border-white/5 flex items-center justify-between">
              <div className="text-xs text-gray-200 leading-relaxed truncate pr-2">
                {bioText}
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold shrink-0">
                <Gift className="w-3.5 h-3.5" />
                <span>{giftsCount}</span>
              </div>
            </div>

            <div className="text-[11px] text-gray-400 text-left w-full mt-2 leading-tight">
              Any details such as age, occupation or city. Example: 23 y.o. designer from San Francisco
            </div>
          </div>

          {/* Account Details Rows */}
          <div className="py-2 bg-[#17212b]">
            {/* Name */}
            <div className="px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4 min-w-0">
                <User className="w-5 h-5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] text-gray-400">Name</div>
                  <div className="text-sm text-gray-100 font-medium truncate">{fullName}</div>
                </div>
              </div>
            </div>

            {/* Phone Number */}
            {phoneText && (
              <div className="px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <Phone className="w-5 h-5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-gray-400">Phone number</div>
                    <div className="text-sm text-gray-100 font-mono font-medium truncate">{phoneText}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('phone', phoneText)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Copy Phone"
                >
                  {copiedField === 'phone' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}

            {/* Username */}
            {usernameText && (
              <div className="px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <AtSign className="w-5 h-5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-gray-400">Username</div>
                    <div className="text-sm text-accent-cyan font-medium truncate">@{usernameText}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('username', `@${usernameText}`)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Copy Username"
                >
                  {copiedField === 'username' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}

            <div className="px-5 py-1 text-[11px] text-gray-400 leading-tight">
              Username lets people contact you on Telegram without needing your phone number.
            </div>
          </div>

          {/* Social, Automation & Personalization Section */}
          <div className="py-2 bg-[#17212b]">
            {/* Personal Channel */}
            <div
              onClick={() => {
                if (profile?.personalChannelUsername && onOpenChatByUsername) {
                  onOpenChatByUsername(profile.personalChannelUsername)
                  onClose()
                }
              }}
              className="px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4 min-w-0">
                <Megaphone className="w-5 h-5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] text-gray-400">Personal channel</div>
                  <div className="text-sm text-accent-cyan font-medium flex items-center gap-1 truncate">
                    <span>❤️</span>
                    <span>{channelTitle}</span>
                  </div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-500" />
            </div>

            {/* Chat Automation Bot */}
            <div className="px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer">
              <div className="flex items-center gap-4 min-w-0">
                <Bot className="w-5 h-5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-400">Chat automation</span>
                    <span className="px-1.5 py-0.2 rounded bg-primary-500/20 text-primary-300 text-[9px] font-bold">
                      NEW
                    </span>
                  </div>
                  <div className="text-sm text-accent-cyan font-medium truncate">{botUsername}</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-500" />
            </div>

            {/* Your Name Color */}
            <div className="px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4 min-w-0">
                <Palette className="w-5 h-5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm text-gray-100 font-medium">Your name color</div>
                  <div className="text-[11px] text-gray-400">Matches official Telegram peer color</div>
                </div>
              </div>
              <div className="flex items-center -space-x-1">
                <div className="w-5 h-5 rounded-full bg-cyan-400 ring-2 ring-[#17212b]" />
                <div className="w-5 h-5 rounded-full bg-teal-500 ring-2 ring-[#17212b]" />
              </div>
            </div>

            {/* Birthday */}
            <div className="px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4 min-w-0">
                <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm text-gray-100 font-medium">Birthday</div>
                  <div className="text-[11px] text-gray-400">{profile?.birthday || 'Not set'}</div>
                </div>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-accent-cyan hover:underline cursor-pointer"
              >
                {profile?.birthday ? 'Edit' : 'Add'}
              </button>
            </div>

            <div className="px-5 py-1 text-[11px] text-gray-400 leading-tight">
              Only your contacts can see your birthday.{' '}
              <span className="text-accent-cyan hover:underline cursor-pointer">Change &gt;</span>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#17212b] border border-white/10 rounded-3xl p-6 max-w-xs w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-150">
            <div className="text-base font-bold text-white mb-1">Telegram QR Code</div>
            <div className="text-xs text-gray-400 mb-4">Scan this code to start a chat</div>

            {qrDataUrl && (
              <div className="p-3 bg-white rounded-2xl shadow-inner mb-4">
                <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 rounded-lg" />
              </div>
            )}

            <div className="text-xs font-semibold text-gray-200 truncate w-full mb-4">
              {usernameText ? `@${usernameText}` : fullName}
            </div>

            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={() => {
                  if (usernameText) {
                    handleCopy('link', `https://t.me/${usernameText}`)
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedField === 'link' ? 'Copied!' : 'Copy Link'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
