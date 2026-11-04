import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Hand,
  PhoneOff,
  Users,
  Volume2,
  VolumeX,
  Settings,
  Radio,
  Maximize2,
  Minimize2,
  PhoneCall,
  PhoneIncoming,
  ShieldCheck,
  Check,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Calendar,
  SlidersHorizontal,
  UserX,
} from 'lucide-react'
import { GroupCallInfo, GroupCallParticipantItem } from '../types/telegram'
import { useI18n } from '../i18n'
import { AudioResourceManager, VoiceVisualizerSession } from '../utils/audioResourceManager'

export interface GroupCallModalProps {
  isOpen: boolean
  accountId: string
  chatId: string
  chatTitle: string
  isBroadcast?: boolean
  initialCallId?: string
  initialAccessHash?: string
  onClose: () => void
  onLeaveCall?: () => void
}

export const GroupCallModal: React.FC<GroupCallModalProps> = ({
  isOpen,
  accountId,
  chatId,
  chatTitle,
  isBroadcast,
  initialCallId,
  initialAccessHash,
  onClose,
  onLeaveCall,
}) => {
  const { t } = useI18n()
  const [callInfo, setCallInfo] = useState<GroupCallInfo | null>(null)
  const [participants, setParticipants] = useState<GroupCallParticipantItem[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [hasRaisedHand, setHasRaisedHand] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)

  // Microphase 107: Phone Domain Suite Part 1 States
  const [showPhoneSuite, setShowPhoneSuite] = useState(false)
  const [phoneSuiteTab, setPhoneSuiteTab] = useState<'group_call' | 'p2p_call' | 'conference'>('group_call')

  // 1 & 3: P2P Calls (phone.acceptCall & phone.confirmCall)
  const [p2pCallId, setP2pCallId] = useState('')
  const [p2pAccessHash, setP2pAccessHash] = useState('')
  const [p2pGB, setP2pGB] = useState('')
  const [p2pGA, setP2pGA] = useState('')
  const [p2pFingerprint, setP2pFingerprint] = useState('')

  // 2: Check Group Call (phone.checkGroupCall)
  const [checkSourcesInput, setCheckSourcesInput] = useState('1001, 1002')
  const [checkedSourcesResult, setCheckedSourcesResult] = useState<number[] | null>(null)

  // 5: Create Group Call (phone.createGroupCall)
  const [newCallTitle, setNewCallTitle] = useState('')
  const [newCallRtmp, setNewCallRtmp] = useState(false)
  const [newCallScheduleDate, setNewCallScheduleDate] = useState('')

  // 4, 6, 7: Conference Calls (createConferenceCall, declineConferenceCallInvite, deleteConferenceCallParticipants)
  const [confMuted, setConfMuted] = useState(false)
  const [confVideoStopped, setConfVideoStopped] = useState(false)
  const [confJoin, setConfJoin] = useState(true)
  const [confParamsData, setConfParamsData] = useState('')
  const [declineMsgId, setDeclineMsgId] = useState('')
  const [delConfKick, setDelConfKick] = useState(false)
  const [delConfOnlyLeft, setDelConfOnlyLeft] = useState(false)
  const [delConfParticipantIds, setDelConfParticipantIds] = useState('')

  // UI Feedback States
  const [loadingOp, setLoadingOp] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [lastOpResult, setLastOpResult] = useState<any | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const videoStreamRef = useRef<MediaStream | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const visualizerSessionRef = useRef<VoiceVisualizerSession | null>(null)
  const hasJoinedRef = useRef(false)

  // 1. Duration Timer
  useEffect(() => {
    if (!isOpen) {
      setCallDuration(0)
      return
    }
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isOpen])

  // 2. Fetch Group Call & Auto-Join from Backend
  useEffect(() => {
    if (!isOpen) return
    let isCancelled = false

    const loadCallData = async () => {
      if (window.guidegram?.getGroupCall) {
        try {
          const res = await window.guidegram.getGroupCall(
            accountId,
            chatId,
            initialCallId,
            initialAccessHash
          )
          if (!isCancelled && res) {
            setCallInfo(res.call)
            if (!hasJoinedRef.current && window.guidegram?.joinGroupCall) {
              hasJoinedRef.current = true
              window.guidegram.joinGroupCall(accountId, res.call.id, res.call.accessHash, isMuted).catch(() => {})
            }
            if (res.participants && res.participants.length > 0) {
              setParticipants(res.participants)
              const firstSpeaker = res.participants.find((p) => !p.isMuted) || res.participants[0]
              if (firstSpeaker) setActiveSpeakerId(firstSpeaker.id)
            }
          }
        } catch (err) {
          console.warn('[GroupCall] Fetch failed:', err)
        }
      }
    }

    loadCallData()
    const pollInterval = setInterval(loadCallData, 4000)

    return () => {
      isCancelled = true
      clearInterval(pollInterval)
    }
  }, [isOpen, accountId, chatId, initialCallId, initialAccessHash, isMuted])

  // 3. WebRTC Local Microphone Analyzer
  useEffect(() => {
    if (!isOpen || isMuted) {
      if (visualizerSessionRef.current) {
        visualizerSessionRef.current.stop()
        visualizerSessionRef.current = null
      }
      AudioResourceManager.stopMediaStream(audioStreamRef.current)
      audioStreamRef.current = null
      setAudioLevel(0)
      return
    }

    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => {
        audioStreamRef.current = stream
        visualizerSessionRef.current = AudioResourceManager.createVoiceVisualizer(
          stream,
          (sampled) => {
            let sum = 0
            for (let i = 0; i < sampled.length; i++) sum += sampled[i]
            setAudioLevel(Math.min(100, Math.round(sum / sampled.length)))
          },
          100
        )
      })
      .catch((err) => {
        console.warn('[WebRTC] Microphone access denied:', err)
      })

    return () => {
      if (visualizerSessionRef.current) {
        visualizerSessionRef.current.stop()
        visualizerSessionRef.current = null
      }
      AudioResourceManager.stopMediaStream(audioStreamRef.current)
      audioStreamRef.current = null
    }
  }, [isOpen, isMuted])

  // Cleanup all streams on unmount
  useEffect(() => {
    return () => {
      if (visualizerSessionRef.current) {
        visualizerSessionRef.current.stop()
        visualizerSessionRef.current = null
      }
      AudioResourceManager.stopMediaStream(videoStreamRef.current)
      videoStreamRef.current = null
      AudioResourceManager.stopMediaStream(audioStreamRef.current)
      audioStreamRef.current = null
    }
  }, [])

  // Fallback participants if empty
  const activeParticipants = participants.length > 0
    ? participants
    : [
        {
          id: 'self',
          name: 'You',
          isMuted: isMuted,
          isSelf: true,
          raisedHand: hasRaisedHand,
        },
      ]

  const activeSpeaker = activeParticipants.find((p) => p.id === activeSpeakerId) || activeParticipants[0]

  // Format Duration
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Handle Mute Toggle
  const handleToggleMute = async () => {
    const next = !isMuted
    setIsMuted(next)
    if (callInfo && window.guidegram?.editGroupCallParticipant) {
      window.guidegram.editGroupCallParticipant(
        accountId,
        callInfo.id,
        callInfo.accessHash,
        'self',
        next,
        undefined
      ).catch(() => {})
    }
  }

  // Handle Raise Hand Toggle
  const handleToggleRaiseHand = async () => {
    const next = !hasRaisedHand
    setHasRaisedHand(next)
    if (callInfo && window.guidegram?.editGroupCallParticipant) {
      window.guidegram.editGroupCallParticipant(
        accountId,
        callInfo.id,
        callInfo.accessHash,
        'self',
        undefined,
        next
      ).catch(() => {})
    }
  }

  // Handle Camera Video Toggle
  const handleToggleVideo = async () => {
    if (isVideoOn) {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((t) => t.stop())
        videoStreamRef.current = null
      }
      setIsVideoOn(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
        videoStreamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setIsVideoOn(true)
        setIsScreenSharing(false)
      } catch (err) {
        console.warn('Failed to access camera:', err)
      }
    }
  }

  // Handle Screen Share Toggle
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((t) => t.stop())
        videoStreamRef.current = null
      }
      setIsScreenSharing(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        videoStreamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false)
        }
        setIsScreenSharing(true)
        setIsVideoOn(false)
      } catch (err) {
        console.warn('Failed to access screen share:', err)
      }
    }
  }

  // Handle Leave
  const handleLeave = async () => {
    if (visualizerSessionRef.current) {
      visualizerSessionRef.current.stop()
      visualizerSessionRef.current = null
    }
    AudioResourceManager.stopMediaStream(videoStreamRef.current)
    videoStreamRef.current = null
    AudioResourceManager.stopMediaStream(audioStreamRef.current)
    audioStreamRef.current = null
    if (callInfo && window.guidegram?.leaveGroupCall) {
      window.guidegram.leaveGroupCall(accountId, callInfo.id, callInfo.accessHash).catch(() => {})
    }
    hasJoinedRef.current = false
    if (onLeaveCall) onLeaveCall()
    onClose()
  }

  const api = (window as any).guidegramAPI || (window as any).guidegram

  // Microphase 107: 1. Accept P2P Call (phone.acceptCall)
  const handleAcceptCall = async () => {
    if (!accountId || !p2pCallId.trim() || !p2pAccessHash.trim()) {
      setErrorMsg('شناسه تماس (Call ID) و هش دسترسی (Access Hash) الزامی است')
      return
    }
    setLoadingOp('accept_call')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneAcceptCallRaw?.(accountId, {
        peer: { id: p2pCallId.trim(), accessHash: p2pAccessHash.trim() },
        gB: p2pGB.trim() || undefined,
      })
      setLastOpResult(res)
      setSuccessMsg('تماس با موفقیت پذیرفته شد (phone.acceptCall)')
    } catch (err: any) {
      console.warn('[GroupCallModal] acceptCall error:', err)
      setErrorMsg(err?.message || 'خطا در پذیرش تماس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 107: 2. Check Group Call (phone.checkGroupCall)
  const handleCheckGroupCall = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('شناسه تماس گروهی فعال یافت نشد')
      return
    }
    setLoadingOp('check_group_call')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const sources = checkSourcesInput
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n))
      const res = await api?.phoneCheckGroupCallRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        sources: sources.length > 0 ? sources : [1001],
      })
      setLastOpResult(res)
      setCheckedSourcesResult(Array.isArray(res) ? res : [])
      setSuccessMsg(`سورس‌های صدای تماس گروهی اعتبارسنجی شد (phone.checkGroupCall): ${JSON.stringify(res)}`)
    } catch (err: any) {
      console.warn('[GroupCallModal] checkGroupCall error:', err)
      setErrorMsg(err?.message || 'خطا در بررسی سورس‌های تماس گروهی')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 107: 3. Confirm P2P Call (phone.confirmCall)
  const handleConfirmCall = async () => {
    if (!accountId || !p2pCallId.trim() || !p2pAccessHash.trim()) {
      setErrorMsg('شناسه تماس و هش دسترسی الزامی است')
      return
    }
    setLoadingOp('confirm_call')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneConfirmCallRaw?.(accountId, {
        peer: { id: p2pCallId.trim(), accessHash: p2pAccessHash.trim() },
        gA: p2pGA.trim() || undefined,
        keyFingerprint: p2pFingerprint.trim() || undefined,
      })
      setLastOpResult(res)
      setSuccessMsg('تماس P2P با موفقیت تأیید شد (phone.confirmCall)')
    } catch (err: any) {
      console.warn('[GroupCallModal] confirmCall error:', err)
      setErrorMsg(err?.message || 'خطا در تأیید تماس P2P')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 107: 4. Create Conference Call (phone.createConferenceCall)
  const handleCreateConferenceCall = async () => {
    if (!accountId) return
    setLoadingOp('create_conference')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneCreateConferenceCallRaw?.(accountId, {
        muted: confMuted,
        videoStopped: confVideoStopped,
        join: confJoin,
        params: confParamsData.trim() || undefined,
      })
      setLastOpResult(res)
      setSuccessMsg('کنفرانس صوتی چندنفره با موفقیت ایجاد شد (phone.createConferenceCall)')
    } catch (err: any) {
      console.warn('[GroupCallModal] createConferenceCall error:', err)
      setErrorMsg(err?.message || 'خطا در ایجاد کنفرانس صوتی')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 107: 5. Create Group Call (phone.createGroupCall)
  const handleCreateGroupCall = async () => {
    if (!accountId || !chatId) {
      setErrorMsg('شناسه گفتگو (Chat ID) یافت نشد')
      return
    }
    setLoadingOp('create_group_call')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const scheduleTimestamp = newCallScheduleDate
        ? Math.floor(new Date(newCallScheduleDate).getTime() / 1000)
        : undefined
      const res = await api?.phoneCreateGroupCallRaw?.(accountId, {
        peerId: chatId,
        title: newCallTitle.trim() || undefined,
        rtmpStream: newCallRtmp,
        scheduleDate: scheduleTimestamp,
      })
      setLastOpResult(res)
      setSuccessMsg(`تماس گروهی "${newCallTitle || chatTitle}" با موفقیت ایجاد شد (phone.createGroupCall)`)
    } catch (err: any) {
      console.warn('[GroupCallModal] createGroupCall error:', err)
      setErrorMsg(err?.message || 'خطا در ایجاد تماس گروهی')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 107: 6. Decline Conference Call Invite (phone.declineConferenceCallInvite)
  const handleDeclineConferenceInvite = async () => {
    if (!accountId || !declineMsgId.trim()) {
      setErrorMsg('شناسه پیام دعوت (Message ID) الزامی است')
      return
    }
    setLoadingOp('decline_invite')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneDeclineConferenceCallInviteRaw?.(accountId, {
        msgId: Number(declineMsgId.trim()),
      })
      setLastOpResult(res)
      setSuccessMsg(`دعوت کنفرانس با شناسه پیام ${declineMsgId} رد شد (phone.declineConferenceCallInvite)`)
      setDeclineMsgId('')
    } catch (err: any) {
      console.warn('[GroupCallModal] declineConferenceCallInvite error:', err)
      setErrorMsg(err?.message || 'خطا در رد دعوت کنفرانس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 107: 7. Delete Conference Call Participants (phone.deleteConferenceCallParticipants)
  const handleDeleteConferenceParticipants = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('شناسه تماس کنفرانس یافت نشد')
      return
    }
    setLoadingOp('delete_participants')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const ids = delConfParticipantIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const res = await api?.phoneDeleteConferenceCallParticipantsRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        ids,
        kick: delConfKick,
        onlyLeft: delConfOnlyLeft,
      })
      setLastOpResult(res)
      setSuccessMsg('شرکت‌کنندگان مورد نظر از کنفرانس حذف شدند (phone.deleteConferenceCallParticipants)')
      setDelConfParticipantIds('')
    } catch (err: any) {
      console.warn('[GroupCallModal] deleteConferenceCallParticipants error:', err)
      setErrorMsg(err?.message || 'خطا در حذف شرکت‌کنندگان کنفرانس')
    } finally {
      setLoadingOp(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className={`w-full bg-dark-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 select-none ${
          isFullscreen ? 'w-full h-full rounded-none' : 'max-w-4xl h-[650px]'
        }`}
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4 bg-dark-850/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-glow border border-emerald-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">
                  {callInfo?.title || chatTitle}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{formatTime(callDuration)}</span>
                </span>
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>{activeParticipants.length} {t('group_call.participants')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPhoneSuite(!showPhoneSuite)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                showPhoneSuite
                  ? 'bg-accent-cyan text-black shadow-glow'
                  : 'bg-white/10 text-accent-cyan hover:bg-white/15'
              }`}
              title="پنل پروتکل و امکانات لایه ۲۳۲ تماس (Microphase 107)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>پروتکل MTProto</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="Minimize / Close View"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Microphase 107: Phone Domain Suite Panel */}
        <AnimatePresence>
          {showPhoneSuite && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-white/10 bg-dark-950/95 backdrop-blur-md p-4 overflow-y-auto max-h-[380px] space-y-3 z-30 shrink-0 select-none text-right scrollbar-thin"
              dir="rtl"
            >
              {/* Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-black/40 border border-white/5">
                <button
                  type="button"
                  onClick={() => setPhoneSuiteTab('group_call')}
                  className={`py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    phoneSuiteTab === 'group_call'
                      ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>تماس گروهی</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPhoneSuiteTab('p2p_call')}
                  className={`py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    phoneSuiteTab === 'p2p_call'
                      ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>تماس P2P</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPhoneSuiteTab('conference')}
                  className={`py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    phoneSuiteTab === 'conference'
                      ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>کنفرانس رمزنگاری</span>
                </button>
              </div>

              {/* Banners */}
              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMsg(null)}
                    className="text-xs text-rose-400 hover:text-rose-200 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSuccessMsg(null)}
                    className="text-xs text-emerald-400 hover:text-emerald-200 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Tab 1: Group Call Suite */}
              {phoneSuiteTab === 'group_call' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Create Group Call */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-accent-cyan" />
                      <span>ایجاد یا زمان‌بندی تماس گروهی (phone.createGroupCall)</span>
                    </div>
                    <input
                      type="text"
                      value={newCallTitle}
                      onChange={(e) => setNewCallTitle(e.target.value)}
                      placeholder="عنوان تماس (اختیاری)..."
                      className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="datetime-local"
                        value={newCallScheduleDate}
                        onChange={(e) => setNewCallScheduleDate(e.target.value)}
                        className="flex-1 px-2 py-1 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-300 focus:outline-none"
                        title="تاریخ زمان‌بندی (اختیاری)"
                      />
                      <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newCallRtmp}
                          onChange={(e) => setNewCallRtmp(e.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0"
                        />
                        <span>RTMP Stream</span>
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateGroupCall}
                      disabled={loadingOp === 'create_group_call'}
                      className="w-full py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {loadingOp === 'create_group_call' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Radio className="w-3.5 h-3.5" />
                      )}
                      <span>ایجاد تماس در این گفتگو</span>
                    </button>
                  </div>

                  {/* Check Group Call */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>اعتبارسنجی سورس‌های صدا (phone.checkGroupCall)</span>
                    </div>
                    <input
                      type="text"
                      value={checkSourcesInput}
                      onChange={(e) => setCheckSourcesInput(e.target.value)}
                      placeholder="شناسه سورس‌های صوتی SSRC (مثلاً: 1001, 1002)"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleCheckGroupCall}
                      disabled={loadingOp === 'check_group_call'}
                      className="w-full py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {loadingOp === 'check_group_call' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>بررسی وضعیت استریم و SSRC</span>
                    </button>
                    {checkedSourcesResult && (
                      <div className="text-[10px] text-emerald-400 font-mono">
                        سورس‌های فعال تأییدشده: [{checkedSourcesResult.join(', ')}]
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: P2P Calls Suite */}
              {phoneSuiteTab === 'p2p_call' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Accept Call */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <PhoneIncoming className="w-3.5 h-3.5 text-emerald-400" />
                      <span>پذیرش تماس دوطرفه (phone.acceptCall)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={p2pCallId}
                        onChange={(e) => setP2pCallId(e.target.value)}
                        placeholder="Call ID"
                        className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                      />
                      <input
                        type="text"
                        value={p2pAccessHash}
                        onChange={(e) => setP2pAccessHash(e.target.value)}
                        placeholder="Access Hash"
                        className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                      />
                    </div>
                    <input
                      type="text"
                      value={p2pGB}
                      onChange={(e) => setP2pGB(e.target.value)}
                      placeholder="کلید دیفی-هلمن g_b (هگز، اختیاری)"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAcceptCall}
                      disabled={loadingOp === 'accept_call'}
                      className="w-full py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {loadingOp === 'accept_call' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <PhoneIncoming className="w-3.5 h-3.5" />
                      )}
                      <span>پذیرش تماس (acceptCall)</span>
                    </button>
                  </div>

                  {/* Confirm Call */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-accent-cyan" />
                      <span>تأیید تماس و تبادل کلید (phone.confirmCall)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={p2pGA}
                        onChange={(e) => setP2pGA(e.target.value)}
                        placeholder="کلید g_a (هگز)"
                        className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                      />
                      <input
                        type="text"
                        value={p2pFingerprint}
                        onChange={(e) => setP2pFingerprint(e.target.value)}
                        placeholder="اثرانگشت کلید (Fingerprint)"
                        className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleConfirmCall}
                      disabled={loadingOp === 'confirm_call'}
                      className="w-full py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {loadingOp === 'confirm_call' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      <span>تأیید تماس (confirmCall)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Conference Call Suite */}
              {phoneSuiteTab === 'conference' && (
                <div className="space-y-3">
                  {/* Create Conference */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      <span>ایجاد کنفرانس صوتی چندنفره (phone.createConferenceCall)</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confMuted}
                          onChange={(e) => setConfMuted(e.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-purple-500 focus:ring-0"
                        />
                        <span>Muted</span>
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confVideoStopped}
                          onChange={(e) => setConfVideoStopped(e.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-purple-500 focus:ring-0"
                        />
                        <span>Video Stopped</span>
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confJoin}
                          onChange={(e) => setConfJoin(e.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-purple-500 focus:ring-0"
                        />
                        <span>Auto-Join</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={confParamsData}
                      onChange={(e) => setConfParamsData(e.target.value)}
                      placeholder="پارامترهای JSON وب‌کال (اختیاری)"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleCreateConferenceCall}
                      disabled={loadingOp === 'create_conference'}
                      className="w-full py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {loadingOp === 'create_conference' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Users className="w-3.5 h-3.5" />
                      )}
                      <span>راه‌اندازی کنفرانس صوتی</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Delete Conference Participants */}
                    <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                      <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                        <UserX className="w-3.5 h-3.5 text-rose-400" />
                        <span>حذف اعضا از کنفرانس (phone.deleteConferenceCallParticipants)</span>
                      </div>
                      <input
                        type="text"
                        value={delConfParticipantIds}
                        onChange={(e) => setDelConfParticipantIds(e.target.value)}
                        placeholder="شناسه کاربران (با کاما جدا کنید)"
                        className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                      />
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={delConfKick}
                            onChange={(e) => setDelConfKick(e.target.checked)}
                            className="rounded border-white/20 bg-black/40 text-rose-500 focus:ring-0"
                          />
                          <span>Kick</span>
                        </label>
                        <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={delConfOnlyLeft}
                            onChange={(e) => setDelConfOnlyLeft(e.target.checked)}
                            className="rounded border-white/20 bg-black/40 text-rose-500 focus:ring-0"
                          />
                          <span>Only Left</span>
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={handleDeleteConferenceParticipants}
                        disabled={loadingOp === 'delete_participants'}
                        className="w-full py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {loadingOp === 'delete_participants' ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserX className="w-3.5 h-3.5" />
                        )}
                        <span>حذف از کنفرانس</span>
                      </button>
                    </div>

                    {/* Decline Conference Invite */}
                    <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                      <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>رد دعوت کنفرانس (phone.declineConferenceCallInvite)</span>
                      </div>
                      <input
                        type="text"
                        value={declineMsgId}
                        onChange={(e) => setDeclineMsgId(e.target.value)}
                        placeholder="شناسه پیام دعوت (Message ID)"
                        className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleDeclineConferenceInvite}
                        disabled={loadingOp === 'decline_invite'}
                        className="w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {loadingOp === 'decline_invite' ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>رد دعوت کنفرانس</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* JSON Debug Ledger */}
              {lastOpResult && (
                <div className="p-2 rounded-xl bg-black/50 border border-white/5 font-mono text-[10px] text-neutral-400 max-h-24 overflow-y-auto">
                  {JSON.stringify(lastOpResult, null, 2)}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center Stage & Participants Split View */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden bg-gradient-to-b from-dark-900 to-dark-950">
          {/* Main Stage: Active Speaker or Video Feed */}
          <div className="flex-1 relative flex flex-col items-center justify-center p-8 overflow-hidden">
            {isVideoOn || isScreenSharing ? (
              <div className="w-full h-full relative flex items-center justify-center bg-black/90 rounded-2xl overflow-hidden border border-white/10">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs text-emerald-300">
                  {isVideoOn && <Video className="w-3.5 h-3.5" />}
                  {isScreenSharing && <Monitor className="w-3.5 h-3.5" />}
                  <span>{isScreenSharing ? t('group_call.share_screen') : t('group_call.camera')}</span>
                </div>
              </div>
            ) : (
              <>
                {/* Concentric Audio Ripples */}
                <div className="relative flex items-center justify-center">
                  {!activeSpeaker?.isMuted && (
                    <>
                      <div
                        className="absolute rounded-full bg-emerald-500/10 transition-all duration-150"
                        style={{
                          width: `${14 + (audioLevel > 5 ? (audioLevel / 100) * 10 : 2)}rem`,
                          height: `${14 + (audioLevel > 5 ? (audioLevel / 100) * 10 : 2)}rem`,
                        }}
                      />
                      <div
                        className="absolute rounded-full bg-emerald-500/15 transition-all duration-150"
                        style={{
                          width: `${11 + (audioLevel > 5 ? (audioLevel / 100) * 6 : 1)}rem`,
                          height: `${11 + (audioLevel > 5 ? (audioLevel / 100) * 6 : 1)}rem`,
                        }}
                      />
                    </>
                  )}

                  <div
                    className={`w-32 h-32 rounded-full border-4 flex items-center justify-center text-4xl font-bold transition-all shadow-2xl relative z-10 ${
                      activeSpeaker?.isMuted
                        ? 'border-gray-700 bg-dark-800 text-gray-400'
                        : 'border-emerald-400 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-glow'
                    }`}
                  >
                    {activeSpeaker?.avatarUrl ? (
                      <img
                        src={activeSpeaker.avatarUrl}
                        alt={activeSpeaker.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span>{activeSpeaker?.name.charAt(0).toUpperCase()}</span>
                    )}

                    {/* Hand Raised badge */}
                    {activeSpeaker?.raisedHand && (
                      <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-amber-500 text-dark-950 flex items-center justify-center shadow-glow border-2 border-dark-900 animate-bounce">
                        <Hand className="w-4 h-4 fill-current" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 text-center z-10">
                  <div className="font-bold text-lg text-white">{activeSpeaker?.name}</div>
                  <div className="text-xs text-gray-400 flex items-center justify-center gap-1.5 mt-1">
                    {activeSpeaker?.isMuted ? (
                      <span className="flex items-center gap-1 text-gray-500">
                        <MicOff className="w-3.5 h-3.5" />
                        <span>{t('group_call.listening')}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <Mic className="w-3.5 h-3.5 animate-pulse" />
                        <span>{t('group_call.speaking')}</span>
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right/Side Participants List */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/10 bg-dark-850/60 backdrop-blur-md flex flex-col shrink-0">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between text-xs font-bold text-gray-300">
              <span>{t('group_call.participants')}</span>
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-gray-400 font-mono text-[10px]">
                {activeParticipants.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-none">
              {activeParticipants.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setActiveSpeakerId(p.id)}
                  className={`flex items-center justify-between gap-2.5 p-2 rounded-2xl transition-all cursor-pointer ${
                    activeSpeakerId === p.id
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-white'
                      : 'hover:bg-white/5 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 relative ${
                        p.isMuted
                          ? 'bg-dark-750 text-gray-400'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={p.name} className="w-full h-full rounded-xl object-cover" />
                      ) : (
                        <span>{p.name.charAt(0).toUpperCase()}</span>
                      )}
                      {p.raisedHand && (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-dark-950 flex items-center justify-center text-[8px]">
                          ✋
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-1">
                        <span>{p.name}</span>
                        {p.isSelf && <span className="text-[10px] text-gray-500 font-normal">(You)</span>}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {p.isMuted ? t('group_call.listening') : t('group_call.speaking')}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1">
                    {p.isMuted ? (
                      <MicOff className="w-3.5 h-3.5 text-gray-500" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Floating Media Controls Bar */}
        <div className="px-6 py-4 bg-dark-900 border-t border-white/10 flex items-center justify-center gap-4 shrink-0 shadow-2xl">
          {/* Video Toggle */}
          <button
            type="button"
            onClick={handleToggleVideo}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
              isVideoOn
                ? 'bg-primary-500 text-white shadow-glow'
                : 'bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-white border border-white/10'
            }`}
            title={isVideoOn ? 'Turn Video Off' : 'Turn Video On'}
          >
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Screen Share Toggle */}
          <button
            type="button"
            onClick={handleToggleScreenShare}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
              isScreenSharing
                ? 'bg-accent-cyan text-dark-950 shadow-glow'
                : 'bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-white border border-white/10'
            }`}
            title={isScreenSharing ? t('group_call.stop_sharing') : t('group_call.share_screen')}
          >
            <Monitor className="w-5 h-5" />
          </button>

          {/* Main Huge Mic Toggle Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`px-8 py-4 rounded-3xl font-bold text-sm flex items-center gap-2.5 transition-all cursor-pointer active:scale-95 ${
              isMuted
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 shadow-lg'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-dark-950 shadow-glow'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span>{isMuted ? t('group_call.unmute') : t('group_call.mute')}</span>
          </button>

          {/* Raise Hand Toggle */}
          <button
            type="button"
            onClick={handleToggleRaiseHand}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
              hasRaisedHand
                ? 'bg-amber-500 text-dark-950 shadow-glow animate-bounce'
                : 'bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-white border border-white/10'
            }`}
            title={hasRaisedHand ? t('group_call.hand_raised') : t('group_call.raise_hand')}
          >
            <Hand className="w-5 h-5 fill-current" />
          </button>

          {/* Leave Call (Red) */}
          <button
            type="button"
            onClick={handleLeave}
            className="p-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg hover:shadow-red-500/30 cursor-pointer active:scale-95"
            title={t('group_call.leave')}
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  )
}
