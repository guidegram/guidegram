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
  Link,
  Edit3,
  MessageSquare,
  Share2,
  Copy,
  Star,
  Server,
  Layers,
  Key,
  ExternalLink,
  UserPlus,
  MonitorUp,
  PhoneOutgoing,
  Bug,
  FileText,
  SendHorizontal,
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

  // Microphase 108: Phone Domain Suite Part 2 States
  // 1 & 2: Delete Call Messages
  const [delCallMessagesInput, setDelCallMessagesInput] = useState('')
  const [delCallMessagesSpam, setDelCallMessagesSpam] = useState(false)
  const [delPartMsgPeer, setDelPartMsgPeer] = useState('')
  const [delPartMsgSpam, setDelPartMsgSpam] = useState(false)

  // 3: Discard P2P Call
  const [discardP2pDuration, setDiscardP2pDuration] = useState('0')
  const [discardP2pReason, setDiscardP2pReason] = useState<'hangup' | 'busy' | 'missed' | 'disconnect'>('hangup')
  const [discardP2pVideo, setDiscardP2pVideo] = useState(false)

  // 4: Edit Group Call Title
  const [editCallTitleInput, setEditCallTitleInput] = useState('')

  // 5: Edit Group Call Participant
  const [editPartPeerId, setEditPartPeerId] = useState('')
  const [editPartMuted, setEditPartMuted] = useState(false)
  const [editPartVolume, setEditPartVolume] = useState(100)
  const [editPartRaiseHand, setEditPartRaiseHand] = useState(false)
  const [editPartVideoStopped, setEditPartVideoStopped] = useState(false)

  // 6: Export Group Call Invite
  const [exportCanSelfUnmute, setExportCanSelfUnmute] = useState(true)
  const [exportedInviteLink, setExportedInviteLink] = useState<string | null>(null)

  // Microphase 109: Phone Domain Suite Part 3 States
  const [callConfigData, setCallConfigData] = useState<any | null>(null)
  const [fetchedCallDetails, setFetchedCallDetails] = useState<any | null>(null)
  const [chainSubChainId, setChainSubChainId] = useState('0')
  const [chainBlocksResult, setChainBlocksResult] = useState<any | null>(null)
  const [joinAsPeersResult, setJoinAsPeersResult] = useState<any[] | null>(null)
  const [groupCallStarsResult, setGroupCallStarsResult] = useState<any | null>(null)
  const [streamChannelsResult, setStreamChannelsResult] = useState<any[] | null>(null)
  const [rtmpRevoke, setRtmpRevoke] = useState(false)
  const [rtmpLiveStory, setRtmpLiveStory] = useState(false)
  const [rtmpStreamInfo, setRtmpStreamInfo] = useState<{ url?: string; key?: string } | null>(null)

  // Microphase 110: Phone Domain Suite Part 4 States
  // 1: phone.getGroupParticipants
  const [partOffset, setPartOffset] = useState('')
  const [partSourcesInput, setPartSourcesInput] = useState('')
  const [partPeersInput, setPartPeersInput] = useState('')
  const [fetchedGroupParticipants, setFetchedGroupParticipants] = useState<any | null>(null)

  // 2: phone.inviteConferenceCallParticipant
  const [confInviteUser, setConfInviteUser] = useState('')
  const [confInviteVideo, setConfInviteVideo] = useState(false)

  // 3: phone.inviteToGroupCall
  const [inviteGroupCallUsers, setInviteGroupCallUsers] = useState('')

  // 4: phone.joinGroupCall
  const [customJoinMuted, setCustomJoinMuted] = useState(false)
  const [customJoinVideoStopped, setCustomJoinVideoStopped] = useState(false)
  const [customJoinAs, setCustomJoinAs] = useState('')
  const [customJoinInviteHash, setCustomJoinInviteHash] = useState('')

  // 5 & 7: phone.joinGroupCallPresentation & leaveGroupCallPresentation
  const [presentationDataPayload, setPresentationDataPayload] = useState('')
  const [isJoinedPresentation, setIsJoinedPresentation] = useState(false)

  // 6: phone.leaveGroupCall
  const [leaveCallSourceId, setLeaveCallSourceId] = useState('0')

  // Microphase 111: Phone Domain Suite Part 5 States
  // 1 & 2: phone.receivedCall & phone.requestCall
  const [requestCallUserId, setRequestCallUserId] = useState('')
  const [requestCallVideo, setRequestCallVideo] = useState(false)
  const [requestCallGAHash, setRequestCallGAHash] = useState('')
  // 3 & 4: phone.saveCallDebug & phone.saveCallLog
  const [callDebugPayload, setCallDebugPayload] = useState('{"connection":"p2p","loss":0}')
  const [callLogFileName, setCallLogFileName] = useState('call_diagnostics.log')
  // 5 & 6: phone.saveDefaultGroupCallJoinAs & phone.saveDefaultSendAs
  const [defaultJoinAsPeer, setDefaultJoinAsPeer] = useState('')
  const [defaultSendAsPeer, setDefaultSendAsPeer] = useState('')
  // 7: phone.sendConferenceCallBroadcast
  const [confBroadcastBlock, setConfBroadcastBlock] = useState('01020304')

  // Microphase 112: Phone Domain Suite Part 6 States
  // 1: phone.startScheduledGroupCall
  const [scheduledStartCallId, setScheduledStartCallId] = useState('')
  // 2: phone.toggleGroupCallRecord
  const [recordStart, setRecordStart] = useState(true)
  const [recordVideo, setRecordVideo] = useState(false)
  const [recordPortrait, setRecordPortrait] = useState(false)
  const [recordTitle, setRecordTitle] = useState('')
  // 3: phone.toggleGroupCallSettings
  const [settingsResetInviteHash, setSettingsResetInviteHash] = useState(false)
  const [settingsJoinMuted, setSettingsJoinMuted] = useState(false)
  const [settingsMessagesEnabled, setSettingsMessagesEnabled] = useState(true)
  const [settingsPaidStars, setSettingsPaidStars] = useState('')
  // 4: phone.sendGroupCallMessage
  const [groupCallMsgText, setGroupCallMsgText] = useState('')
  const [groupCallMsgStars, setGroupCallMsgStars] = useState('')
  const [groupCallMsgSendAs, setGroupCallMsgSendAs] = useState('')
  // 5: phone.sendGroupCallEncryptedMessage
  const [confEncryptedMsg, setConfEncryptedMsg] = useState('')
  // 6: phone.setCallRating
  const [callRatingStars, setCallRatingStars] = useState(5)
  const [callRatingComment, setCallRatingComment] = useState('')
  const [callRatingUserInitiative, setCallRatingUserInitiative] = useState(true)
  // 7: phone.sendSignalingData
  const [signalingDataHex, setSignalingDataHex] = useState('')

  // Microphase 113: Phone Domain Suite Part 7 State
  // 1: phone.toggleGroupCallStartSubscription
  const [startSubscribed, setStartSubscribed] = useState(true)

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

  // Microphase 108: 1. Delete Group Call Messages (phone.deleteGroupCallMessages)
  const handleDeleteGroupCallMessages = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('شناسه تماس گروهی فعال یافت نشد')
      return
    }
    if (!delCallMessagesInput.trim()) {
      setErrorMsg('شناسه پیام‌ها (Message IDs) الزامی است')
      return
    }
    setLoadingOp('del_call_msgs')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const msgs = delCallMessagesInput
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n))
      const res = await api?.phoneDeleteGroupCallMessagesRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        messages: msgs,
        reportSpam: delCallMessagesSpam,
      })
      setLastOpResult(res)
      setSuccessMsg('پیام‌های تماس گروهی با موفقیت حذف شدند (phone.deleteGroupCallMessages)')
      setDelCallMessagesInput('')
    } catch (err: any) {
      console.warn('[GroupCallModal] deleteGroupCallMessages error:', err)
      setErrorMsg(err?.message || 'خطا در حذف پیام‌های تماس گروهی')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 108: 2. Delete Participant Messages (phone.deleteGroupCallParticipantMessages)
  const handleDeleteParticipantMessages = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('شناسه تماس گروهی فعال یافت نشد')
      return
    }
    if (!delPartMsgPeer.trim()) {
      setErrorMsg('شناسه شرکت‌کننده (Participant ID) الزامی است')
      return
    }
    setLoadingOp('del_part_msgs')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneDeleteGroupCallParticipantMessagesRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        participant: delPartMsgPeer.trim(),
        reportSpam: delPartMsgSpam,
      })
      setLastOpResult(res)
      setSuccessMsg(`پیام‌های شرکت‌کننده ${delPartMsgPeer} در تماس حذف شدند (phone.deleteGroupCallParticipantMessages)`)
      setDelPartMsgPeer('')
    } catch (err: any) {
      console.warn('[GroupCallModal] deleteGroupCallParticipantMessages error:', err)
      setErrorMsg(err?.message || 'خطا در حذف پیام‌های شرکت‌کننده تماس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 108: 3. Discard P2P Call (phone.discardCall)
  const handleDiscardCall = async () => {
    if (!accountId || !p2pCallId.trim()) {
      setErrorMsg('شناسه تماس P2P (Call ID) الزامی است')
      return
    }
    setLoadingOp('discard_p2p_call')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneDiscardCallRaw?.(accountId, {
        peer: { id: p2pCallId.trim(), accessHash: p2pAccessHash.trim() || '0' },
        duration: Number(discardP2pDuration || 0),
        reason: discardP2pReason,
        video: discardP2pVideo,
      })
      setLastOpResult(res)
      setSuccessMsg('تماس P2P با موفقیت پایان یافت (phone.discardCall)')
    } catch (err: any) {
      console.warn('[GroupCallModal] discardCall error:', err)
      setErrorMsg(err?.message || 'خطا در پایان دادن به تماس P2P')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 108: 4. Discard Group Call (phone.discardGroupCall)
  const handleDiscardGroupCall = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی فعال برای پایان دادن یافت نشد')
      return
    }
    setLoadingOp('discard_group_call')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneDiscardGroupCallRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
      })
      setLastOpResult(res)
      setSuccessMsg('تماس گروهی با موفقیت خاتمه یافت (phone.discardGroupCall)')
      setCallInfo(null)
      onClose()
    } catch (err: any) {
      console.warn('[GroupCallModal] discardGroupCall error:', err)
      setErrorMsg(err?.message || 'خطا در خاتمه دادن به تماس گروهی')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 108: 5. Edit Group Call Participant (phone.editGroupCallParticipant)
  const handleEditGroupCallParticipant = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی فعال یافت نشد')
      return
    }
    if (!editPartPeerId.trim()) {
      setErrorMsg('شناسه شرکت‌کننده (Participant ID) الزامی است')
      return
    }
    setLoadingOp('edit_participant')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneEditGroupCallParticipantRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        participant: editPartPeerId.trim(),
        muted: editPartMuted,
        volume: Number(editPartVolume || 100),
        raiseHand: editPartRaiseHand,
        videoStopped: editPartVideoStopped,
      })
      setLastOpResult(res)
      setSuccessMsg(`تنظیمات شرکت‌کننده ${editPartPeerId} با موفقیت بروزرسانی شد (phone.editGroupCallParticipant)`)
    } catch (err: any) {
      console.warn('[GroupCallModal] editGroupCallParticipant error:', err)
      setErrorMsg(err?.message || 'خطا در ویرایش تنظیمات شرکت‌کننده')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 108: 6. Edit Group Call Title (phone.editGroupCallTitle)
  const handleEditGroupCallTitle = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی فعال یافت نشد')
      return
    }
    if (!editCallTitleInput.trim()) {
      setErrorMsg('عنوان جدید تماس الزامی است')
      return
    }
    setLoadingOp('edit_call_title')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneEditGroupCallTitleRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        title: editCallTitleInput.trim(),
      })
      setLastOpResult(res)
      setSuccessMsg(`عنوان تماس به "${editCallTitleInput.trim()}" تغییر یافت (phone.editGroupCallTitle)`)
      if (callInfo) {
        setCallInfo({ ...callInfo, title: editCallTitleInput.trim() })
      }
      setEditCallTitleInput('')
    } catch (err: any) {
      console.warn('[GroupCallModal] editGroupCallTitle error:', err)
      setErrorMsg(err?.message || 'خطا در ویرایش عنوان تماس گروهی')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 108: 7. Export Group Call Invite (phone.exportGroupCallInvite)
  const handleExportGroupCallInvite = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی فعال یافت نشد')
      return
    }
    setLoadingOp('export_call_invite')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneExportGroupCallInviteRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        canSelfUnmute: exportCanSelfUnmute,
      })
      setLastOpResult(res)
      const link = res?.link || res?.url || (typeof res === 'string' ? res : JSON.stringify(res))
      setExportedInviteLink(link)
      setSuccessMsg('لینک دعوت تماس با موفقیت صادر شد (phone.exportGroupCallInvite)')
    } catch (err: any) {
      console.warn('[GroupCallModal] exportGroupCallInvite error:', err)
      setErrorMsg(err?.message || 'خطا در صدور لینک دعوت تماس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 109: 1. Get Call Config (phone.getCallConfig)
  const handleGetCallConfig = async () => {
    if (!accountId) {
      setErrorMsg('اکانت فعال یافت نشد')
      return
    }
    setLoadingOp('get_call_config')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneGetCallConfigRaw?.(accountId)
      setLastOpResult(res)
      setCallConfigData(res)
      setSuccessMsg('پیکربندی تماس‌های صوتی و سرورهای رفلکتور دریافت شد (phone.getCallConfig)')
    } catch (err: any) {
      console.warn('[GroupCallModal] getCallConfig error:', err)
      setErrorMsg(err?.message || 'خطا در دریافت کانفیگ تماس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 109: 2. Get Group Call Details (phone.getGroupCall)
  const handleGetGroupCall = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی فعال یافت نشد')
      return
    }
    setLoadingOp('get_group_call')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneGetGroupCallRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        limit: 50,
      })
      setLastOpResult(res)
      setFetchedCallDetails(res)
      if (res?.call) setCallInfo(res.call)
      if (Array.isArray(res?.participants)) setParticipants(res.participants)
      setSuccessMsg('اطلاعات تفصیلی تماس گروهی به‌روزرسانی شد (phone.getGroupCall)')
    } catch (err: any) {
      console.warn('[GroupCallModal] getGroupCall error:', err)
      setErrorMsg(err?.message || 'خطا در استعلام اطلاعات تماس گروهی')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 109: 3. Get Group Call Chain Blocks (phone.getGroupCallChainBlocks)
  const handleGetGroupCallChainBlocks = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی فعال یافت نشد')
      return
    }
    setLoadingOp('get_chain_blocks')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneGetGroupCallChainBlocksRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        subChainId: Number(chainSubChainId || 0),
        offset: 0,
        limit: 10,
      })
      setLastOpResult(res)
      setChainBlocksResult(res)
      setSuccessMsg('بلاک‌های زنجیره تماس گروهی با موفقیت دریافت شدند (phone.getGroupCallChainBlocks)')
    } catch (err: any) {
      console.warn('[GroupCallModal] getGroupCallChainBlocks error:', err)
      setErrorMsg(err?.message || 'خطا در دریافت بلاک‌های زنجیره تماس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 109: 4. Get Group Call Join As Peers (phone.getGroupCallJoinAs)
  const handleGetGroupCallJoinAs = async () => {
    if (!accountId || !chatId) {
      setErrorMsg('چت فعال یافت نشد')
      return
    }
    setLoadingOp('get_join_as')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneGetGroupCallJoinAsRaw?.(accountId, {
        peer: chatId,
      })
      setLastOpResult(res)
      const peers = res?.peers || res?.joinAsPeers || (Array.isArray(res) ? res : [])
      setJoinAsPeersResult(peers)
      setSuccessMsg(`هویت‌های مجاز جهت پیوستن دریافت شد (${peers.length} هویت) (phone.getGroupCallJoinAs)`)
    } catch (err: any) {
      console.warn('[GroupCallModal] getGroupCallJoinAs error:', err)
      setErrorMsg(err?.message || 'خطا در دریافت هویت‌های پیوستن به تماس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 109: 5. Get Group Call Stars (phone.getGroupCallStars)
  const handleGetGroupCallStars = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی فعال یافت نشد')
      return
    }
    setLoadingOp('get_call_stars')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneGetGroupCallStarsRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
      })
      setLastOpResult(res)
      setGroupCallStarsResult(res)
      const starsCount = res?.stars || res?.count || 0
      setSuccessMsg(`موجودی استارز تماس دریافت شد: ${starsCount} Stars (phone.getGroupCallStars)`)
    } catch (err: any) {
      console.warn('[GroupCallModal] getGroupCallStars error:', err)
      setErrorMsg(err?.message || 'خطا در دریافت استارز تماس گروهی')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 109: 6. Get Group Call Stream Channels (phone.getGroupCallStreamChannels)
  const handleGetGroupCallStreamChannels = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی فعال یافت نشد')
      return
    }
    setLoadingOp('get_stream_channels')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneGetGroupCallStreamChannelsRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
      })
      setLastOpResult(res)
      const channels = res?.channels || (Array.isArray(res) ? res : [])
      setStreamChannelsResult(channels)
      setSuccessMsg(`کانال‌های استریم فعال وب‌کال دریافت شدند: ${channels.length} کانال (phone.getGroupCallStreamChannels)`)
    } catch (err: any) {
      console.warn('[GroupCallModal] getGroupCallStreamChannels error:', err)
      setErrorMsg(err?.message || 'خطا در دریافت کانال‌های استریم تماس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 109: 7. Get Group Call Stream RTMP URL (phone.getGroupCallStreamRtmpUrl)
  const handleGetGroupCallStreamRtmpUrl = async () => {
    if (!accountId || !chatId) {
      setErrorMsg('چت فعال یافت نشد')
      return
    }
    setLoadingOp('get_stream_rtmp')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneGetGroupCallStreamRtmpUrlRaw?.(accountId, {
        peer: chatId,
        revoke: rtmpRevoke,
        liveStory: rtmpLiveStory,
      })
      setLastOpResult(res)
      const info = {
        url: res?.url || res?.streamUrl || '',
        key: res?.key || res?.streamKey || '',
      }
      setRtmpStreamInfo(info)
      setSuccessMsg(
        rtmpRevoke
          ? 'آدرس و کلید استریم RTMP بازنشانی (Revoke) شد (phone.getGroupCallStreamRtmpUrl)'
          : 'آدرس و کلید اینجست RTMP با موفقیت دریافت شد (phone.getGroupCallStreamRtmpUrl)'
      )
    } catch (err: any) {
      console.warn('[GroupCallModal] getGroupCallStreamRtmpUrl error:', err)
      setErrorMsg(err?.message || 'خطا در دریافت آدرس اینجست RTMP')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 110: 1. Get Group Participants (phone.getGroupParticipants)
  const handleGetGroupParticipants = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی فعال یافت نشد')
      return
    }
    setLoadingOp('get_group_participants')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const ids = partPeersInput ? partPeersInput.split(',').map((s) => s.trim()).filter(Boolean) : undefined
      const sources = partSourcesInput ? partSourcesInput.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n)) : undefined
      const res = await api?.phoneGetGroupParticipantsRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        ids,
        sources,
        offset: partOffset || '',
        limit: 50,
      })
      setLastOpResult(res)
      setFetchedGroupParticipants(res)
      if (res?.next_offset || res?.nextOffset) {
        setPartOffset(res.next_offset || res.nextOffset)
      }
      if (Array.isArray(res?.participants)) {
        setParticipants(res.participants)
      }
      setSuccessMsg(`لیست شرکت‌کنندگان دریافت شد (${res?.count ?? res?.participants?.length ?? 0} نفر) (phone.getGroupParticipants)`)
    } catch (err: any) {
      console.warn('[GroupCallModal] getGroupParticipants error:', err)
      setErrorMsg(err?.message || 'خطا در دریافت لیست شرکت‌کنندگان')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 110: 2. Invite Conference Call Participant (phone.inviteConferenceCallParticipant)
  const handleInviteConferenceCallParticipant = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی/کنفرانس فعال یافت نشد')
      return
    }
    if (!confInviteUser.trim()) {
      setErrorMsg('شناسه کاربری جهت دعوت به کنفرانس الزامی است')
      return
    }
    setLoadingOp('invite_conf_part')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneInviteConferenceCallParticipantRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        userId: confInviteUser.trim(),
        video: confInviteVideo,
      })
      setLastOpResult(res)
      setSuccessMsg(`کاربر ${confInviteUser.trim()} به کنفرانس دعوت شد (phone.inviteConferenceCallParticipant)`)
      setConfInviteUser('')
    } catch (err: any) {
      console.warn('[GroupCallModal] inviteConferenceCallParticipant error:', err)
      setErrorMsg(err?.message || 'خطا در ارسال دعوت‌نامه کنفرانس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 110: 3. Invite to Group Call (phone.inviteToGroupCall)
  const handleInviteToGroupCall = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی فعال یافت نشد')
      return
    }
    if (!inviteGroupCallUsers.trim()) {
      setErrorMsg('شناسه یا نام کاربری افراد جهت دعوت الزامی است')
      return
    }
    setLoadingOp('invite_group_call')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const users = inviteGroupCallUsers.split(',').map((s) => s.trim()).filter(Boolean)
      const res = await api?.phoneInviteToGroupCallRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        users,
      })
      setLastOpResult(res)
      setSuccessMsg(`دعوت‌نامه برای ${users.length} کاربر ارسال شد (phone.inviteToGroupCall)`)
      setInviteGroupCallUsers('')
    } catch (err: any) {
      console.warn('[GroupCallModal] inviteToGroupCall error:', err)
      setErrorMsg(err?.message || 'خطا در دعوت کاربران به تماس گروهی')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 110: 4. Join Group Call (phone.joinGroupCall)
  const handleCustomJoinGroupCall = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی فعال یافت نشد')
      return
    }
    setLoadingOp('custom_join_group_call')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneJoinGroupCallRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        muted: customJoinMuted,
        videoStopped: customJoinVideoStopped,
        joinAs: customJoinAs.trim() || undefined,
        inviteHash: customJoinInviteHash.trim() || undefined,
      })
      setLastOpResult(res)
      setIsMuted(customJoinMuted)
      setSuccessMsg('با موفقیت به تماس گروهی ملحق شدید (phone.joinGroupCall)')
    } catch (err: any) {
      console.warn('[GroupCallModal] joinGroupCall error:', err)
      setErrorMsg(err?.message || 'خطا در پیوستن به تماس گروهی')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 110: 5. Join Presentation (phone.joinGroupCallPresentation)
  const handleJoinGroupCallPresentation = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی فعال یافت نشد')
      return
    }
    setLoadingOp('join_presentation')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneJoinGroupCallPresentationRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        params: presentationDataPayload.trim() || undefined,
      })
      setLastOpResult(res)
      setIsJoinedPresentation(true)
      setIsScreenSharing(true)
      setSuccessMsg('استریم پرزنتیشن و اسکرین‌شیر آغاز شد (phone.joinGroupCallPresentation)')
    } catch (err: any) {
      console.warn('[GroupCallModal] joinGroupCallPresentation error:', err)
      setErrorMsg(err?.message || 'خطا در آغاز پرزنتیشن تماس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 110: 6. Leave Group Call (phone.leaveGroupCall)
  const handleLeaveGroupCallExplicit = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی فعال یافت نشد')
      return
    }
    setLoadingOp('leave_group_call_explicit')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneLeaveGroupCallRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        source: Number(leaveCallSourceId || 0),
      })
      setLastOpResult(res)
      setSuccessMsg('از تماس گروهی با سورس مشخص خارج شدید (phone.leaveGroupCall)')
    } catch (err: any) {
      console.warn('[GroupCallModal] leaveGroupCall error:', err)
      setErrorMsg(err?.message || 'خطا در خروج از تماس گروهی')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 110: 7. Leave Presentation (phone.leaveGroupCallPresentation)
  const handleLeaveGroupCallPresentation = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی فعال یافت نشد')
      return
    }
    setLoadingOp('leave_presentation')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneLeaveGroupCallPresentationRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
      })
      setLastOpResult(res)
      setIsJoinedPresentation(false)
      setIsScreenSharing(false)
      setSuccessMsg('پرزنتیشن تماس با موفقیت متوقف گردید (phone.leaveGroupCallPresentation)')
    } catch (err: any) {
      console.warn('[GroupCallModal] leaveGroupCallPresentation error:', err)
      setErrorMsg(err?.message || 'خطا در توقف پرزنتیشن تماس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 111: 1. Received Call (phone.receivedCall)
  const handleReceivedCall = async () => {
    if (!accountId) {
      setErrorMsg('اکانت فعال یافت نشد')
      return
    }
    if (!p2pCallId || !p2pAccessHash) {
      setErrorMsg('شناسه و هش دسترسی تماس P2P الزامی است')
      return
    }
    setLoadingOp('received_call')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneReceivedCallRaw?.(accountId, {
        peer: { id: p2pCallId, accessHash: p2pAccessHash },
      })
      setLastOpResult(res)
      setSuccessMsg('دریافت تماس به سرور تلگرام اعلام گردید (phone.receivedCall)')
    } catch (err: any) {
      console.warn('[GroupCallModal] receivedCall error:', err)
      setErrorMsg(err?.message || 'خطا در ثبت دریافت تماس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 111: 2. Request Call (phone.requestCall)
  const handleRequestCall = async () => {
    if (!accountId) {
      setErrorMsg('اکانت فعال یافت نشد')
      return
    }
    if (!requestCallUserId.trim()) {
      setErrorMsg('شناسه کاربری جهت برقراری تماس الزامی است')
      return
    }
    setLoadingOp('request_call')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const randomId = Math.floor(Math.random() * 0x7fffffff)
      const res = await api?.phoneRequestCallRaw?.(accountId, {
        video: requestCallVideo,
        userId: requestCallUserId.trim(),
        randomId,
        gAHash: requestCallGAHash.trim() || undefined,
      })
      setLastOpResult(res)
      if (res?.phone_call?.id || res?.phoneCall?.id) {
        const c = res.phone_call || res.phoneCall
        setP2pCallId(String(c.id))
        if (c.access_hash || c.accessHash) setP2pAccessHash(String(c.access_hash || c.accessHash))
      }
      setSuccessMsg('درخواست برقراری تماس با موفقیت ارسال شد (phone.requestCall)')
    } catch (err: any) {
      console.warn('[GroupCallModal] requestCall error:', err)
      setErrorMsg(err?.message || 'خطا در درخواست برقراری تماس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 111: 3. Save Call Debug (phone.saveCallDebug)
  const handleSaveCallDebug = async () => {
    if (!accountId) {
      setErrorMsg('اکانت فعال یافت نشد')
      return
    }
    if (!p2pCallId || !p2pAccessHash) {
      setErrorMsg('شناسه و هش دسترسی تماس P2P الزامی است')
      return
    }
    setLoadingOp('save_call_debug')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneSaveCallDebugRaw?.(accountId, {
        peer: { id: p2pCallId, accessHash: p2pAccessHash },
        debug: callDebugPayload.trim() || '{}',
      })
      setLastOpResult(res)
      setSuccessMsg('گزارش دیباگ تماس صوتی ارسال گردید (phone.saveCallDebug)')
    } catch (err: any) {
      console.warn('[GroupCallModal] saveCallDebug error:', err)
      setErrorMsg(err?.message || 'خطا در ذخیره دیباگ تماس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 111: 4. Save Call Log (phone.saveCallLog)
  const handleSaveCallLog = async () => {
    if (!accountId) {
      setErrorMsg('اکانت فعال یافت نشد')
      return
    }
    if (!p2pCallId || !p2pAccessHash) {
      setErrorMsg('شناسه و هش دسترسی تماس P2P الزامی است')
      return
    }
    setLoadingOp('save_call_log')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneSaveCallLogRaw?.(accountId, {
        peer: { id: p2pCallId, accessHash: p2pAccessHash },
        file: {
          id: Date.now(),
          parts: 1,
          name: callLogFileName.trim() || 'call_log.txt',
          md5Checksum: '',
        },
      })
      setLastOpResult(res)
      setSuccessMsg('لاگ کیفیت تماس ثبت گردید (phone.saveCallLog)')
    } catch (err: any) {
      console.warn('[GroupCallModal] saveCallLog error:', err)
      setErrorMsg(err?.message || 'خطا در ثبت لاگ تماس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 111: 5. Save Default Group Call Join As (phone.saveDefaultGroupCallJoinAs)
  const handleSaveDefaultGroupCallJoinAs = async () => {
    if (!accountId) {
      setErrorMsg('اکانت فعال یافت نشد')
      return
    }
    if (!defaultJoinAsPeer.trim()) {
      setErrorMsg('شناسه پیر یا کانال پیش‌فرض جهت ورود الزامی است')
      return
    }
    setLoadingOp('save_default_join_as')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneSaveDefaultGroupCallJoinAsRaw?.(accountId, {
        peer: chatId,
        joinAs: defaultJoinAsPeer.trim(),
      })
      setLastOpResult(res)
      setSuccessMsg('هویت پیش‌فرض ورود به تماس گروهی ذخیره شد (phone.saveDefaultGroupCallJoinAs)')
    } catch (err: any) {
      console.warn('[GroupCallModal] saveDefaultGroupCallJoinAs error:', err)
      setErrorMsg(err?.message || 'خطا در ذخیره هویت پیش‌فرض ورود به تماس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 111: 6. Save Default Send As (phone.saveDefaultSendAs)
  const handleSaveDefaultSendAs = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی فعال یافت نشد')
      return
    }
    if (!defaultSendAsPeer.trim()) {
      setErrorMsg('شناسه پیر جهت ارسال کامنت/واکنش الزامی است')
      return
    }
    setLoadingOp('save_default_send_as')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneSaveDefaultSendAsRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        sendAs: defaultSendAsPeer.trim(),
      })
      setLastOpResult(res)
      setSuccessMsg('هویت پیش‌فرض ارسال در لایو/تماس ذخیره شد (phone.saveDefaultSendAs)')
    } catch (err: any) {
      console.warn('[GroupCallModal] saveDefaultSendAs error:', err)
      setErrorMsg(err?.message || 'خطا در ذخیره هویت پیش‌فرض ارسال')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 111: 7. Send Conference Call Broadcast (phone.sendConferenceCallBroadcast)
  const handleSendConferenceCallBroadcast = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی/کنفرانس فعال یافت نشد')
      return
    }
    setLoadingOp('send_conf_broadcast')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneSendConferenceCallBroadcastRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        block: confBroadcastBlock.trim() || '01020304',
      })
      setLastOpResult(res)
      setSuccessMsg('بسته برودکست کنفرانس به کلیه اعضا مخابره شد (phone.sendConferenceCallBroadcast)')
    } catch (err: any) {
      console.warn('[GroupCallModal] sendConferenceCallBroadcast error:', err)
      setErrorMsg(err?.message || 'خطا در ارسال برودکست کنفرانس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 112: 1. Start Scheduled Group Call (phone.startScheduledGroupCall)
  const handleStartScheduledGroupCall = async () => {
    const targetCallId = scheduledStartCallId.trim() || callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('شناسه تماس گروهی زمان‌بندی‌شده الزامی است')
      return
    }
    setLoadingOp('start_scheduled_call')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneStartScheduledGroupCallRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
      })
      setLastOpResult(res)
      setSuccessMsg('تماس زمان‌بندی‌شده با موفقیت فعال شد (phone.startScheduledGroupCall)')
    } catch (err: any) {
      console.warn('[GroupCallModal] startScheduledGroupCall error:', err)
      setErrorMsg(err?.message || 'خطا در فعال‌سازی تماس زمان‌بندی‌شده')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 112: 2. Toggle Group Call Record (phone.toggleGroupCallRecord)
  const handleToggleGroupCallRecord = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی فعال یافت نشد')
      return
    }
    setLoadingOp('toggle_call_record')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneToggleGroupCallRecordRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        start: recordStart,
        video: recordVideo,
        videoPortrait: recordPortrait,
        title: recordTitle.trim() || undefined,
      })
      setLastOpResult(res)
      setSuccessMsg(recordStart ? 'ضبط تماس آغاز گردید (phone.toggleGroupCallRecord)' : 'ضبط تماس متوقف گردید')
    } catch (err: any) {
      console.warn('[GroupCallModal] toggleGroupCallRecord error:', err)
      setErrorMsg(err?.message || 'خطا در تغییر وضعیت ضبط تماس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 112: 3. Toggle Group Call Settings (phone.toggleGroupCallSettings)
  const handleToggleGroupCallSettings = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی فعال یافت نشد')
      return
    }
    setLoadingOp('toggle_call_settings')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneToggleGroupCallSettingsRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        resetInviteHash: settingsResetInviteHash,
        joinMuted: settingsJoinMuted,
        messagesEnabled: settingsMessagesEnabled,
        sendPaidMessagesStars: settingsPaidStars.trim() ? Number(settingsPaidStars.trim()) : undefined,
      })
      setLastOpResult(res)
      setSuccessMsg('تنظیمات تماس گروهی بروزرسانی شد (phone.toggleGroupCallSettings)')
    } catch (err: any) {
      console.warn('[GroupCallModal] toggleGroupCallSettings error:', err)
      setErrorMsg(err?.message || 'خطا در بروزرسانی تنظیمات تماس گروهی')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 112: 4. Send Group Call Message (phone.sendGroupCallMessage)
  const handleSendGroupCallMessage = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس گروهی فعال یافت نشد')
      return
    }
    if (!groupCallMsgText.trim()) {
      setErrorMsg('متن پیام یا ری‌اکشن لایو الزامی است')
      return
    }
    setLoadingOp('send_call_message')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneSendGroupCallMessageRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        message: groupCallMsgText.trim(),
        allowPaidStars: groupCallMsgStars.trim() ? Number(groupCallMsgStars.trim()) : undefined,
        sendAs: groupCallMsgSendAs.trim() || undefined,
      })
      setLastOpResult(res)
      setGroupCallMsgText('')
      setSuccessMsg('پیام با موفقیت در تماس مخابره شد (phone.sendGroupCallMessage)')
    } catch (err: any) {
      console.warn('[GroupCallModal] sendGroupCallMessage error:', err)
      setErrorMsg(err?.message || 'خطا در ارسال پیام به تماس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 112: 5. Send Group Call Encrypted Message (phone.sendGroupCallEncryptedMessage)
  const handleSendGroupCallEncryptedMessage = async () => {
    const targetCallId = callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('تماس یا کنفرانس فعال یافت نشد')
      return
    }
    if (!confEncryptedMsg.trim()) {
      setErrorMsg('پیام یا دیتای رمزنگاری‌شده الزامی است')
      return
    }
    setLoadingOp('send_conf_encrypted_message')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneSendGroupCallEncryptedMessageRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        encryptedMessage: confEncryptedMsg.trim(),
      })
      setLastOpResult(res)
      setConfEncryptedMsg('')
      setSuccessMsg('پیام E2E رمزنگاری‌شده با موفقیت ارسال شد (phone.sendGroupCallEncryptedMessage)')
    } catch (err: any) {
      console.warn('[GroupCallModal] sendGroupCallEncryptedMessage error:', err)
      setErrorMsg(err?.message || 'خطا در ارسال پیام رمزنگاری‌شده')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 112: 6. Set Call Rating (phone.setCallRating)
  const handleSetCallRating = async () => {
    if (!accountId) {
      setErrorMsg('اکانت فعال یافت نشد')
      return
    }
    if (!p2pCallId || !p2pAccessHash) {
      setErrorMsg('شناسه و هش دسترسی تماس P2P الزامی است')
      return
    }
    setLoadingOp('set_call_rating')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneSetCallRatingRaw?.(accountId, {
        peer: { id: p2pCallId, accessHash: p2pAccessHash },
        rating: callRatingStars,
        comment: callRatingComment.trim() || undefined,
        userInitiative: callRatingUserInitiative,
      })
      setLastOpResult(res)
      setSuccessMsg('امتیاز و بازخورد کیفیت تماس ثبت شد (phone.setCallRating)')
    } catch (err: any) {
      console.warn('[GroupCallModal] setCallRating error:', err)
      setErrorMsg(err?.message || 'خطا در ثبت امتیاز تماس')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 112: 7. Send Signaling Data (phone.sendSignalingData)
  const handleSendSignalingData = async () => {
    if (!accountId) {
      setErrorMsg('اکانت فعال یافت نشد')
      return
    }
    if (!p2pCallId || !p2pAccessHash) {
      setErrorMsg('شناسه و هش دسترسی تماس P2P الزامی است')
      return
    }
    if (!signalingDataHex.trim()) {
      setErrorMsg('دیتای باینری یا سیگنالینگ WebRTC الزامی است')
      return
    }
    setLoadingOp('send_signaling_data')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneSendSignalingDataRaw?.(accountId, {
        peer: { id: p2pCallId, accessHash: p2pAccessHash },
        data: signalingDataHex.trim(),
      })
      setLastOpResult(res)
      setSuccessMsg('سیگنالینگ صوتی/تصویری P2P مخابره شد (phone.sendSignalingData)')
    } catch (err: any) {
      console.warn('[GroupCallModal] sendSignalingData error:', err)
      setErrorMsg(err?.message || 'خطا در مخابره داده سیگنالینگ')
    } finally {
      setLoadingOp(null)
    }
  }

  // Microphase 113: 1. Toggle Group Call Start Subscription (phone.toggleGroupCallStartSubscription)
  const handleToggleGroupCallStartSubscription = async () => {
    const targetCallId = scheduledStartCallId.trim() || callInfo?.id || initialCallId
    const targetAccessHash = callInfo?.accessHash || initialAccessHash
    if (!accountId || !targetCallId) {
      setErrorMsg('شناسه تماس گروهی زمان‌بندی‌شده الزامی است')
      return
    }
    setLoadingOp('toggle_start_subscription')
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await api?.phoneToggleGroupCallStartSubscriptionRaw?.(accountId, {
        call: { id: targetCallId, accessHash: targetAccessHash },
        subscribed: startSubscribed,
      })
      setLastOpResult(res)
      setSuccessMsg(startSubscribed ? 'یادآور شروع تماس فعال شد (phone.toggleGroupCallStartSubscription)' : 'یادآور تماس لغو شد')
    } catch (err: any) {
      console.warn('[GroupCallModal] toggleGroupCallStartSubscription error:', err)
      setErrorMsg(err?.message || 'خطا در ثبت یادآور تماس زمان‌بندی‌شده')
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

                  {/* Edit Call Title & Export Invite Link */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-accent-cyan" />
                      <span>عنوان و لینک دعوت (phone.editGroupCallTitle / exportGroupCallInvite)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editCallTitleInput}
                        onChange={(e) => setEditCallTitleInput(e.target.value)}
                        placeholder="عنوان جدید تماس..."
                        className="flex-1 px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleEditGroupCallTitle}
                        disabled={loadingOp === 'edit_call_title'}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {loadingOp === 'edit_call_title' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'تغییر عنوان'}
                      </button>
                    </div>

                    <div className="pt-1 border-t border-white/5 flex items-center justify-between gap-2">
                      <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportCanSelfUnmute}
                          onChange={(e) => setExportCanSelfUnmute(e.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0"
                        />
                        <span>اجازه خروج از میوت (can_self_unmute)</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleExportGroupCallInvite}
                        disabled={loadingOp === 'export_call_invite'}
                        className="px-2.5 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        {loadingOp === 'export_call_invite' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Link className="w-3 h-3" />}
                        <span>صدور لینک دعوت</span>
                      </button>
                    </div>
                    {exportedInviteLink && (
                      <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between gap-2 text-[11px] font-mono text-purple-300">
                        <span className="truncate">{exportedInviteLink}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(exportedInviteLink)
                            setSuccessMsg('لینک دعوت در کلیپ‌بورد کپی شد')
                          }}
                          className="p-1 hover:bg-purple-500/20 rounded cursor-pointer shrink-0"
                          title="کپی"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Discard Call & Participant Moderation */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                        <span>مدیریت شرکت‌کننده و پایان تماس</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleDiscardGroupCall}
                        disabled={loadingOp === 'discard_group_call'}
                        className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        {loadingOp === 'discard_group_call' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <PhoneOff className="w-3 h-3" />}
                        <span>خاتمه تماس (discardGroupCall)</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <input
                        type="text"
                        value={editPartPeerId}
                        onChange={(e) => setEditPartPeerId(e.target.value)}
                        placeholder="شناسه کاربر / شرکت‌کننده (مثلاً @username یا peerId)"
                        className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
                      />
                      <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-300">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editPartMuted}
                            onChange={(e) => setEditPartMuted(e.target.checked)}
                            className="rounded border-white/20 bg-black/40 text-amber-500 focus:ring-0"
                          />
                          <span>Mute</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editPartRaiseHand}
                            onChange={(e) => setEditPartRaiseHand(e.target.checked)}
                            className="rounded border-white/20 bg-black/40 text-amber-500 focus:ring-0"
                          />
                          <span>Raise Hand</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editPartVideoStopped}
                            onChange={(e) => setEditPartVideoStopped(e.target.checked)}
                            className="rounded border-white/20 bg-black/40 text-amber-500 focus:ring-0"
                          />
                          <span>Stop Video</span>
                        </label>
                        <span className="text-neutral-400">ولوم: {editPartVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={editPartVolume}
                        onChange={(e) => setEditPartVolume(Number(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                      <button
                        type="button"
                        onClick={handleEditGroupCallParticipant}
                        disabled={loadingOp === 'edit_participant'}
                        className="w-full py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {loadingOp === 'edit_participant' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <SlidersHorizontal className="w-3.5 h-3.5" />}
                        <span>اعمال تنظیمات شرکت‌کننده (phone.editGroupCallParticipant)</span>
                      </button>
                    </div>
                  </div>

                  {/* Group Call Message Cleansing (Full Width across 2 cols) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2 md:col-span-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                      <span>حذف پیام‌های چت تماس گروهی (phone.deleteGroupCallMessages / ParticipantMessages)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {/* Delete Specific Messages */}
                      <div className="space-y-1.5 p-2 rounded-xl bg-black/20 border border-white/5">
                        <span className="text-[11px] text-neutral-400">حذف پیام‌های مشخص با شناسه:</span>
                        <input
                          type="text"
                          value={delCallMessagesInput}
                          onChange={(e) => setDelCallMessagesInput(e.target.value)}
                          placeholder="شناسه پیام‌ها با کاما (مثلاً: 101, 102)"
                          className="w-full px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                        />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1 text-[11px] text-neutral-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={delCallMessagesSpam}
                              onChange={(e) => setDelCallMessagesSpam(e.target.checked)}
                              className="rounded border-white/20 bg-black/40 text-rose-500 focus:ring-0"
                            />
                            <span>گزارش اسپم</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleDeleteGroupCallMessages}
                            disabled={loadingOp === 'del_call_msgs'}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          >
                            {loadingOp === 'del_call_msgs' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            <span>حذف پیام‌ها</span>
                          </button>
                        </div>
                      </div>

                      {/* Delete Participant Messages */}
                      <div className="space-y-1.5 p-2 rounded-xl bg-black/20 border border-white/5">
                        <span className="text-[11px] text-neutral-400">حذف تمام پیام‌های یک شرکت‌کننده:</span>
                        <input
                          type="text"
                          value={delPartMsgPeer}
                          onChange={(e) => setDelPartMsgPeer(e.target.value)}
                          placeholder="شناسه شرکت‌کننده (مثلاً @user یا ID)"
                          className="w-full px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                        />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1 text-[11px] text-neutral-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={delPartMsgSpam}
                              onChange={(e) => setDelPartMsgSpam(e.target.checked)}
                              className="rounded border-white/20 bg-black/40 text-rose-500 focus:ring-0"
                            />
                            <span>گزارش اسپم</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleDeleteParticipantMessages}
                            disabled={loadingOp === 'del_part_msgs'}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          >
                            {loadingOp === 'del_part_msgs' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <UserX className="w-3 h-3" />}
                            <span>پاکسازی پیام‌های کاربر</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Microphase 109: RTMP Stream Ingest (OBS / Live Streaming) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-accent-cyan" />
                        <span>پخش زنده با نرم‌افزارهای استریمینگ RTMP (phone.getGroupCallStreamRtmpUrl)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rtmpLiveStory}
                            onChange={(e) => setRtmpLiveStory(e.target.checked)}
                            className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0"
                          />
                          <span>استوری زنده (Live Story)</span>
                        </label>
                        <label className="flex items-center gap-1 text-[11px] text-rose-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rtmpRevoke}
                            onChange={(e) => setRtmpRevoke(e.target.checked)}
                            className="rounded border-white/20 bg-black/40 text-rose-500 focus:ring-0"
                          />
                          <span>باطل کردن کلید قبلی (Revoke)</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGetGroupCallStreamRtmpUrl}
                        disabled={loadingOp === 'get_stream_rtmp'}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {loadingOp === 'get_stream_rtmp' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                        <span>دریافت آدرس سرور و کلید استریم</span>
                      </button>
                      <span className="text-[11px] text-neutral-400">
                        مناسب اتصال مستقیم به OBS Studio، Wirecast و پنل‌های استریمینگ
                      </span>
                    </div>
                    {rtmpStreamInfo && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 bg-black/30 p-2.5 rounded-xl border border-white/5">
                        <div className="space-y-1">
                          <span className="text-[10px] text-neutral-400">آدرس سرور استریم (Server URL):</span>
                          <div className="flex items-center gap-1">
                            <input
                              readOnly
                              value={rtmpStreamInfo.url || 'rtmp://...'}
                              className="w-full px-2 py-1 rounded bg-black/50 border border-white/10 text-xs text-neutral-200 font-mono select-all"
                            />
                            <button
                              type="button"
                              onClick={() => navigator.clipboard?.writeText(rtmpStreamInfo.url || '')}
                              className="p-1 rounded bg-white/10 hover:bg-white/20 text-neutral-300"
                              title="کپی آدرس سرور"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-neutral-400">کلید استریم (Stream Key):</span>
                          <div className="flex items-center gap-1">
                            <input
                              readOnly
                              type="password"
                              value={rtmpStreamInfo.key || ''}
                              className="w-full px-2 py-1 rounded bg-black/50 border border-white/10 text-xs text-neutral-200 font-mono select-all"
                            />
                            <button
                              type="button"
                              onClick={() => navigator.clipboard?.writeText(rtmpStreamInfo.key || '')}
                              className="p-1 rounded bg-white/10 hover:bg-white/20 text-neutral-300"
                              title="کپی کلید استریم"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Microphase 109: Stars Balance & Details Refresh */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-400" />
                        <span>استارز و جزئیات تماس (phone.getGroupCallStars & getGroupCall)</span>
                      </div>
                      {groupCallStarsResult && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold">
                          ⭐ {groupCallStarsResult?.stars || groupCallStarsResult?.count || 0} Stars
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleGetGroupCallStars}
                        disabled={loadingOp === 'get_call_stars'}
                        className="flex-1 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {loadingOp === 'get_call_stars' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
                        <span>استعلام Stars</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleGetGroupCall}
                        disabled={loadingOp === 'get_group_call'}
                        className="flex-1 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {loadingOp === 'get_group_call' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        <span>بروزرسانی داده‌ها</span>
                      </button>
                    </div>
                    {fetchedCallDetails && (
                      <div className="text-[11px] text-neutral-400 bg-black/30 p-2 rounded-xl border border-white/5 space-y-0.5">
                        <div>شرکت‌کنندگان در سرور: <span className="text-neutral-200 font-mono">{fetchedCallDetails?.participants_count || fetchedCallDetails?.participants?.length || 0}</span></div>
                        <div>نسخه تماس: <span className="text-neutral-200 font-mono">{fetchedCallDetails?.call?.version || 'نامشخص'}</span></div>
                      </div>
                    )}
                  </div>

                  {/* Microphase 109: Stream Channels & Join As */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>کانال‌های استریم و هویت‌های ورود (StreamChannels & JoinAs)</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleGetGroupCallStreamChannels}
                        disabled={loadingOp === 'get_stream_channels'}
                        className="flex-1 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {loadingOp === 'get_stream_channels' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Layers className="w-3 h-3" />}
                        <span>کانال‌های استریم</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleGetGroupCallJoinAs}
                        disabled={loadingOp === 'get_join_as'}
                        className="flex-1 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {loadingOp === 'get_join_as' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Users className="w-3 h-3" />}
                        <span>هویت‌های ورود</span>
                      </button>
                    </div>
                    {(streamChannelsResult || joinAsPeersResult) && (
                      <div className="text-[11px] text-neutral-400 bg-black/30 p-2 rounded-xl border border-white/5 space-y-1">
                        {streamChannelsResult && (
                          <div>تعداد ترک‌های وب‌کال: <span className="text-neutral-200 font-mono">{streamChannelsResult.length} کانال</span></div>
                        )}
                        {joinAsPeersResult && (
                          <div>هویت‌های قابل انتخاب: <span className="text-emerald-300 font-mono">{joinAsPeersResult.length} پروفایل/کانال</span></div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Microphase 109: Group Call Chain Blocks */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-purple-400" />
                        <span>بلاک‌های زنجیره وضعیت تماس گروهی (phone.getGroupCallChainBlocks)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-neutral-400">Sub-Chain ID:</span>
                        <input
                          type="number"
                          value={chainSubChainId}
                          onChange={(e) => setChainSubChainId(e.target.value)}
                          className="w-16 px-2 py-0.5 rounded bg-black/40 border border-white/10 text-xs text-neutral-200 font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleGetGroupCallChainBlocks}
                          disabled={loadingOp === 'get_chain_blocks'}
                          className="px-3 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        >
                          {loadingOp === 'get_chain_blocks' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Server className="w-3 h-3" />}
                          <span>دریافت بلاک‌های زنجیره</span>
                        </button>
                      </div>
                    </div>
                    {chainBlocksResult && (
                      <div className="text-[11px] text-neutral-300 bg-black/30 p-2 rounded-xl border border-white/5 font-mono">
                        آپدیت‌های زنجیره: {JSON.stringify(chainBlocksResult).slice(0, 160)}...
                      </div>
                    )}
                  </div>

                  {/* Microphase 110: Participants Pagination & Filter (phone.getGroupParticipants) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <span>استعلام صفحه‌بندی‌شده شرکت‌کنندگان (phone.getGroupParticipants)</span>
                      </div>
                      {fetchedGroupParticipants && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                          {fetchedGroupParticipants?.count ?? fetchedGroupParticipants?.participants?.length ?? 0} شرکت‌کننده
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-neutral-400 block mb-0.5">فیلتر شناسه‌های کاربری (اختیاری):</span>
                        <input
                          type="text"
                          value={partPeersInput}
                          onChange={(e) => setPartPeersInput(e.target.value)}
                          placeholder="مثلاً @user1, @user2"
                          className="w-full px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-neutral-200 font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block mb-0.5">فیلتر سورس‌های WebRTC (اختیاری):</span>
                        <input
                          type="text"
                          value={partSourcesInput}
                          onChange={(e) => setPartSourcesInput(e.target.value)}
                          placeholder="مثلاً 1001, 1002"
                          className="w-full px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-neutral-200 font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block mb-0.5">توکن آفست (Offset Token):</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={partOffset}
                            onChange={(e) => setPartOffset(e.target.value)}
                            placeholder="آفست خالی برای صفحه اول"
                            className="w-full px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-neutral-200 font-mono focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleGetGroupParticipants}
                            disabled={loadingOp === 'get_group_participants'}
                            className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                          >
                            {loadingOp === 'get_group_participants' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            <span>دریافت</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Microphase 110: Invite to Group Call (phone.inviteToGroupCall) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                      <span>دعوت کاربران به تماس گروهی (phone.inviteToGroupCall)</span>
                    </div>
                    <input
                      type="text"
                      value={inviteGroupCallUsers}
                      onChange={(e) => setInviteGroupCallUsers(e.target.value)}
                      placeholder="شناسه یا یوزرنیم کاربران (با کاما جدا کنید)"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleInviteToGroupCall}
                      disabled={loadingOp === 'invite_group_call'}
                      className="w-full py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {loadingOp === 'invite_group_call' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                      <span>ارسال دعوت‌نامه تماس گروهی</span>
                    </button>
                  </div>

                  {/* Microphase 110: Custom Join Group Call (phone.joinGroupCall) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-accent-cyan" />
                        <span>پیوستن سفارشی با هویت خاص (phone.joinGroupCall)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={customJoinMuted}
                            onChange={(e) => setCustomJoinMuted(e.target.checked)}
                            className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0"
                          />
                          <span>Muted</span>
                        </label>
                        <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={customJoinVideoStopped}
                            onChange={(e) => setCustomJoinVideoStopped(e.target.checked)}
                            className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0"
                          />
                          <span>No Video</span>
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={customJoinAs}
                        onChange={(e) => setCustomJoinAs(e.target.value)}
                        placeholder="Join As: @channel یا self"
                        className="w-full px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-neutral-200 font-mono focus:outline-none"
                      />
                      <input
                        type="text"
                        value={customJoinInviteHash}
                        onChange={(e) => setCustomJoinInviteHash(e.target.value)}
                        placeholder="Invite Hash (اختیاری)"
                        className="w-full px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-neutral-200 font-mono focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCustomJoinGroupCall}
                      disabled={loadingOp === 'custom_join_group_call'}
                      className="w-full py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {loadingOp === 'custom_join_group_call' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                      <span>پیوستن به تماس با هویت انتخابی</span>
                    </button>
                  </div>

                  {/* Microphase 110: Presentation Control (phone.joinGroupCallPresentation / leaveGroupCallPresentation) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MonitorUp className="w-3.5 h-3.5 text-blue-400" />
                        <span>اشتراک‌گذاری تصویر و پرزنتیشن (Presentation Stream)</span>
                      </div>
                      {isJoinedPresentation && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold animate-pulse">
                          LIVE PRESENTING
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={presentationDataPayload}
                      onChange={(e) => setPresentationDataPayload(e.target.value)}
                      placeholder="JSON دیتای پرزنتیشن (پیش‌فرض webrtc)"
                      className="w-full px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-neutral-200 font-mono focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleJoinGroupCallPresentation}
                        disabled={loadingOp === 'join_presentation'}
                        className="py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {loadingOp === 'join_presentation' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <MonitorUp className="w-3.5 h-3.5" />}
                        <span>شروع پرزنتیشن</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleLeaveGroupCallPresentation}
                        disabled={loadingOp === 'leave_presentation'}
                        className="py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {loadingOp === 'leave_presentation' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <VideoOff className="w-3.5 h-3.5" />}
                        <span>توقف پرزنتیشن</span>
                      </button>
                    </div>
                  </div>

                  {/* Microphase 110: Explicit Leave Group Call (phone.leaveGroupCall) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <PhoneOff className="w-3.5 h-3.5 text-rose-400" />
                      <span>خروج صریح از تماس گروهی (phone.leaveGroupCall)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <span className="text-[10px] text-neutral-400 block mb-0.5">شناسه سورس استریم (Source ID):</span>
                        <input
                          type="number"
                          value={leaveCallSourceId}
                          onChange={(e) => setLeaveCallSourceId(e.target.value)}
                          className="w-full px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-neutral-200 font-mono focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleLeaveGroupCallExplicit}
                        disabled={loadingOp === 'leave_group_call_explicit'}
                        className="mt-4 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                      >
                        {loadingOp === 'leave_group_call_explicit' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PhoneOff className="w-3.5 h-3.5" />}
                        <span>خروج با سورس</span>
                      </button>
                    </div>
                  </div>

                  {/* Microphase 111: Save Default Group Call Join As (phone.saveDefaultGroupCallJoinAs) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span>تنظیم هویت پیش‌فرض ورود به تماس (phone.saveDefaultGroupCallJoinAs)</span>
                    </div>
                    <input
                      type="text"
                      value={defaultJoinAsPeer}
                      onChange={(e) => setDefaultJoinAsPeer(e.target.value)}
                      placeholder="شناسه یا یوزرنیم کانال/پروفایل پیش‌فرض ورود"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSaveDefaultGroupCallJoinAs}
                      disabled={loadingOp === 'save_default_join_as'}
                      className="w-full py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {loadingOp === 'save_default_join_as' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                      <span>ذخیره هویت ورود پیش‌فرض</span>
                    </button>
                  </div>

                  {/* Microphase 111: Save Default Send As (phone.saveDefaultSendAs) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <SendHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                      <span>تنظیم هویت پیش‌فرض ارسال پیام و واکنش (phone.saveDefaultSendAs)</span>
                    </div>
                    <input
                      type="text"
                      value={defaultSendAsPeer}
                      onChange={(e) => setDefaultSendAsPeer(e.target.value)}
                      placeholder="شناسه کانال یا پروفایل جهت ارسال در تماس/لایو"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSaveDefaultSendAs}
                      disabled={loadingOp === 'save_default_send_as'}
                      className="w-full py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {loadingOp === 'save_default_send_as' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <SendHorizontal className="w-3.5 h-3.5" />}
                      <span>ذخیره هویت ارسال پیش‌فرض</span>
                    </button>
                  </div>

                  {/* Microphase 112: Start Scheduled Group Call (phone.startScheduledGroupCall) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-400" />
                      <span>فعال‌سازی تماس زمان‌بندی‌شده (phone.startScheduledGroupCall)</span>
                    </div>
                    <input
                      type="text"
                      value={scheduledStartCallId}
                      onChange={(e) => setScheduledStartCallId(e.target.value)}
                      placeholder="شناسه تماس زمان‌بندی‌شده (پیش‌فرض: تماس جاری)"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleStartScheduledGroupCall}
                      disabled={loadingOp === 'start_scheduled_call'}
                      className="w-full py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {loadingOp === 'start_scheduled_call' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                      <span>شروع فوری تماس زمان‌بندی‌شده</span>
                    </button>
                  </div>

                  {/* Microphase 112: Toggle Group Call Record (phone.toggleGroupCallRecord) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-rose-400" />
                      <span>مدیریت ضبط تماس و لایو استریم (phone.toggleGroupCallRecord)</span>
                    </div>
                    <input
                      type="text"
                      value={recordTitle}
                      onChange={(e) => setRecordTitle(e.target.value)}
                      placeholder="عنوان فایل ذخیره ضبط (اختیاری)"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
                    />
                    <div className="grid grid-cols-3 gap-1.5">
                      <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={recordStart}
                          onChange={(e) => setRecordStart(e.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-rose-500 focus:ring-0"
                        />
                        <span>شروع ضبط</span>
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={recordVideo}
                          onChange={(e) => setRecordVideo(e.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-rose-500 focus:ring-0"
                        />
                        <span>ضبط ویدئویی</span>
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={recordPortrait}
                          onChange={(e) => setRecordPortrait(e.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-rose-500 focus:ring-0"
                        />
                        <span>حالت عمودی</span>
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleGroupCallRecord}
                      disabled={loadingOp === 'toggle_call_record'}
                      className={`w-full py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1 ${
                        recordStart
                          ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                      }`}
                    >
                      {loadingOp === 'toggle_call_record' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                      <span>{recordStart ? 'آغاز ضبط تماس/لایو' : 'توقف فرآیند ضبط'}</span>
                    </button>
                  </div>

                  {/* Microphase 112: Toggle Group Call Settings (phone.toggleGroupCallSettings) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-cyan-400" />
                      <span>تنظیمات پیشرفته و کامنت پولی (phone.toggleGroupCallSettings)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settingsResetInviteHash}
                          onChange={(e) => setSettingsResetInviteHash(e.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0"
                        />
                        <span>ریست لینک</span>
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settingsJoinMuted}
                          onChange={(e) => setSettingsJoinMuted(e.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0"
                        />
                        <span>ورود بی‌صدا</span>
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settingsMessagesEnabled}
                          onChange={(e) => setSettingsMessagesEnabled(e.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0"
                        />
                        <span>ارسال پیام</span>
                      </label>
                    </div>
                    <input
                      type="number"
                      value={settingsPaidStars}
                      onChange={(e) => setSettingsPaidStars(e.target.value)}
                      placeholder="حداقل ستاره مورد نیاز برای ارسال پیام (اختیاری)"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleToggleGroupCallSettings}
                      disabled={loadingOp === 'toggle_call_settings'}
                      className="w-full py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {loadingOp === 'toggle_call_settings' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5" />}
                      <span>اعمال تنظیمات تماس گروهی</span>
                    </button>
                  </div>

                  {/* Microphase 112: Send Group Call Message (phone.sendGroupCallMessage) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <SendHorizontal className="w-3.5 h-3.5 text-amber-400" />
                      <span>ارسال پیام و کامنت با ستاره (phone.sendGroupCallMessage)</span>
                    </div>
                    <input
                      type="text"
                      value={groupCallMsgText}
                      onChange={(e) => setGroupCallMsgText(e.target.value)}
                      placeholder="متن پیام، واکنش یا تشویق در لایو..."
                      className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="number"
                        value={groupCallMsgStars}
                        onChange={(e) => setGroupCallMsgStars(e.target.value)}
                        placeholder="تعداد ستاره حمایتی"
                        className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                      />
                      <input
                        type="text"
                        value={groupCallMsgSendAs}
                        onChange={(e) => setGroupCallMsgSendAs(e.target.value)}
                        placeholder="ارسال با هویت کانال (اختیاری)"
                        className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendGroupCallMessage}
                      disabled={loadingOp === 'send_call_message'}
                      className="w-full py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {loadingOp === 'send_call_message' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <SendHorizontal className="w-3.5 h-3.5" />}
                      <span>ارسال پیام درون لایو/تماس</span>
                    </button>
                  </div>

                  {/* Microphase 113: Toggle Group Call Start Subscription (phone.toggleGroupCallStartSubscription) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-pink-400" />
                      <span>یادآور و اعلان شروع لایو استریم (phone.toggleGroupCallStartSubscription)</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-neutral-400">دریافت نوتیفیکیشن هنگام شروع لایو</span>
                      <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={startSubscribed}
                          onChange={(e) => setStartSubscribed(e.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-pink-500 focus:ring-0"
                        />
                        <span>{startSubscribed ? 'عضویت فعال' : 'غیرفعال'}</span>
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleGroupCallStartSubscription}
                      disabled={loadingOp === 'toggle_start_subscription'}
                      className="w-full py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {loadingOp === 'toggle_start_subscription' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                      <span>{startSubscribed ? 'ثبت یادآور شروع تماس' : 'لغو اشتراک یادآور'}</span>
                    </button>
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

                  {/* Discard P2P Call (Full Width) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2 md:col-span-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <PhoneOff className="w-3.5 h-3.5 text-rose-400" />
                      <span>پایان دادن و ثبت نتیجه تماس (phone.discardCall)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-0.5">مدت تماس (ثانیه):</label>
                        <input
                          type="number"
                          value={discardP2pDuration}
                          onChange={(e) => setDiscardP2pDuration(e.target.value)}
                          min="0"
                          className="w-full px-2 py-1 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-0.5">دلیل پایان تماس:</label>
                        <select
                          value={discardP2pReason}
                          onChange={(e) => setDiscardP2pReason(e.target.value as any)}
                          className="w-full px-2 py-1 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 focus:outline-none"
                        >
                          <option value="hangup">قطع عادی (Hangup)</option>
                          <option value="busy">مشغول (Busy)</option>
                          <option value="missed">بی‌پاسخ (Missed)</option>
                          <option value="disconnect">قطع ناگهانی (Disconnect)</option>
                        </select>
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer pb-1">
                          <input
                            type="checkbox"
                            checked={discardP2pVideo}
                            onChange={(e) => setDiscardP2pVideo(e.target.checked)}
                            className="rounded border-white/20 bg-black/40 text-rose-500 focus:ring-0"
                          />
                          <span>تماس ویدئویی بود</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleDiscardCall}
                          disabled={loadingOp === 'discard_p2p_call'}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {loadingOp === 'discard_p2p_call' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PhoneOff className="w-3.5 h-3.5" />}
                          <span>پایان تماس (discardCall)</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Microphase 109: Call Config Inspector (phone.getCallConfig) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5 text-accent-cyan" />
                        <span>پیکربندی سرورها و رفلکتورهای VoIP تلگرام (phone.getCallConfig)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleGetCallConfig}
                        disabled={loadingOp === 'get_call_config'}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {loadingOp === 'get_call_config' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5" />}
                        <span>استعلام کانفیگ شبکه (phone.getCallConfig)</span>
                      </button>
                    </div>
                    {callConfigData && (
                      <div className="text-[11px] text-neutral-300 bg-black/30 p-2.5 rounded-xl border border-white/5 font-mono space-y-1">
                        <div className="text-neutral-400">تنظیمات JSON رفلکتورها:</div>
                        <pre className="text-[10px] text-cyan-300 overflow-x-auto max-h-24 p-1 bg-black/40 rounded">
                          {typeof callConfigData === 'string'
                            ? callConfigData
                            : JSON.stringify(callConfigData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Microphase 111: Request P2P Call (phone.requestCall) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-400" />
                        <span>برقراری تماس مستقیم صوتی/ویدئویی (phone.requestCall)</span>
                      </div>
                      <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={requestCallVideo}
                          onChange={(e) => setRequestCallVideo(e.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-0"
                        />
                        <span>ویدئو</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={requestCallUserId}
                        onChange={(e) => setRequestCallUserId(e.target.value)}
                        placeholder="شناسه کاربر مقصد (@username / id)"
                        className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                      />
                      <input
                        type="text"
                        value={requestCallGAHash}
                        onChange={(e) => setRequestCallGAHash(e.target.value)}
                        placeholder="g_a_hash (هگز اختیاری)"
                        className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRequestCall}
                      disabled={loadingOp === 'request_call'}
                      className="w-full py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {loadingOp === 'request_call' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PhoneOutgoing className="w-3.5 h-3.5" />}
                      <span>برقراری تماس (requestCall)</span>
                    </button>
                  </div>

                  {/* Microphase 111: Acknowledge Received Call (phone.receivedCall) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <PhoneIncoming className="w-3.5 h-3.5 text-blue-400" />
                      <span>تأیید دریافت تماس ورودی (phone.receivedCall)</span>
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      ثبت رسید تماس دریافتی به سرور تلگرام با شناسه تماس فعال در تب.
                    </div>
                    <button
                      type="button"
                      onClick={handleReceivedCall}
                      disabled={loadingOp === 'received_call'}
                      className="w-full py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {loadingOp === 'received_call' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>ثبت رسید دریافت تماس (receivedCall)</span>
                    </button>
                  </div>

                  {/* Microphase 111: Save Call Debug (phone.saveCallDebug) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <Bug className="w-3.5 h-3.5 text-amber-400" />
                      <span>گزارش دیباگ کیفیت تماس (phone.saveCallDebug)</span>
                    </div>
                    <input
                      type="text"
                      value={callDebugPayload}
                      onChange={(e) => setCallDebugPayload(e.target.value)}
                      placeholder='JSON دیباگ (مثلاً {"jitter": 12, "loss": 0})'
                      className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCallDebug}
                      disabled={loadingOp === 'save_call_debug'}
                      className="w-full py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {loadingOp === 'save_call_debug' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bug className="w-3.5 h-3.5" />}
                      <span>ارسال دیباگ تماس (saveCallDebug)</span>
                    </button>
                  </div>

                  {/* Microphase 111: Save Call Log (phone.saveCallLog) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-purple-400" />
                      <span>بارگذاری فایل لاگ تماس (phone.saveCallLog)</span>
                    </div>
                    <input
                      type="text"
                      value={callLogFileName}
                      onChange={(e) => setCallLogFileName(e.target.value)}
                      placeholder="نام فایل لاگ (مثلاً call_diagnostics.log)"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCallLog}
                      disabled={loadingOp === 'save_call_log'}
                      className="w-full py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {loadingOp === 'save_call_log' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                      <span>ثبت لاگ فایل تماس (saveCallLog)</span>
                    </button>
                  </div>

                  {/* Microphase 112: Set Call Rating (phone.setCallRating) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      <span>ثبت امتیاز و بازخورد تماس (phone.setCallRating)</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setCallRatingStars(star)}
                            className="cursor-pointer transition-transform hover:scale-110"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                star <= callRatingStars ? 'text-amber-400 fill-amber-400' : 'text-neutral-600'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={callRatingUserInitiative}
                          onChange={(e) => setCallRatingUserInitiative(e.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-amber-500 focus:ring-0"
                        />
                        <span>ابتکار کاربر</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={callRatingComment}
                      onChange={(e) => setCallRatingComment(e.target.value)}
                      placeholder="متن بازخورد یا کیفیت صدا/تصویر (اختیاری)"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSetCallRating}
                      disabled={loadingOp === 'set_call_rating'}
                      className="w-full py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {loadingOp === 'set_call_rating' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
                      <span>ثبت امتیاز کیفیت تماس</span>
                    </button>
                  </div>

                  {/* Microphase 112: Send Signaling Data (phone.sendSignalingData) */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-blue-400" />
                      <span>تبادل سیگنالینگ WebRTC (phone.sendSignalingData)</span>
                    </div>
                    <input
                      type="text"
                      value={signalingDataHex}
                      onChange={(e) => setSignalingDataHex(e.target.value)}
                      placeholder="داده سیگنالینگ هگز یا باینری WebRTC (مثلاً a1b2c3d4)"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSendSignalingData}
                      disabled={loadingOp === 'send_signaling_data'}
                      className="w-full py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {loadingOp === 'send_signaling_data' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                      <span>مخابره پکت سیگنالینگ تماس</span>
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

                    {/* Microphase 110: Invite to Conference Call (phone.inviteConferenceCallParticipant) */}
                    <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                          <UserPlus className="w-3.5 h-3.5 text-purple-400" />
                          <span>دعوت اختصاصی به کنفرانس صوتی/تصویری (phone.inviteConferenceCallParticipant)</span>
                        </div>
                        <label className="flex items-center gap-1 text-[11px] text-neutral-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={confInviteVideo}
                            onChange={(e) => setConfInviteVideo(e.target.checked)}
                            className="rounded border-white/20 bg-black/40 text-purple-500 focus:ring-0"
                          />
                          <span>دعوت با ویدئو (Video Call)</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={confInviteUser}
                          onChange={(e) => setConfInviteUser(e.target.value)}
                          placeholder="شناسه یا یوزرنیم کاربر جهت دعوت به کنفرانس (مثلاً @username یا User ID)"
                          className="flex-1 px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleInviteConferenceCallParticipant}
                          disabled={loadingOp === 'invite_conf_part'}
                          className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                        >
                          {loadingOp === 'invite_conf_part' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                          <span>ارسال دعوت کنفرانس</span>
                        </button>
                      </div>
                    </div>

                    {/* Microphase 111: Send Conference Call Broadcast (phone.sendConferenceCallBroadcast) */}
                    <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2 md:col-span-2">
                      <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-indigo-400" />
                        <span>مخابره بسته عمومی به اعضای کنفرانس (phone.sendConferenceCallBroadcast)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={confBroadcastBlock}
                          onChange={(e) => setConfBroadcastBlock(e.target.value)}
                          placeholder="هگز بلاک برودکست (مثلاً 01020304)"
                          className="flex-1 px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleSendConferenceCallBroadcast}
                          disabled={loadingOp === 'send_conf_broadcast'}
                          className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                        >
                          {loadingOp === 'send_conf_broadcast' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                          <span>ارسال برودکست</span>
                        </button>
                      </div>
                    </div>

                    {/* Microphase 112: Send Group Call Encrypted Message (phone.sendGroupCallEncryptedMessage) */}
                    <div className="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2 md:col-span-2">
                      <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>ارسال پیام و داده رمزنگاری‌شده E2E کنفرانس (phone.sendGroupCallEncryptedMessage)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={confEncryptedMsg}
                          onChange={(e) => setConfEncryptedMsg(e.target.value)}
                          placeholder="پیام یا پی‌لود رمزنگاری‌شده سرتاسری (E2E Encrypted Payload)"
                          className="flex-1 px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleSendGroupCallEncryptedMessage}
                          disabled={loadingOp === 'send_conf_encrypted_message'}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                        >
                          {loadingOp === 'send_conf_encrypted_message' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          <span>ارسال پیام امن</span>
                        </button>
                      </div>
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
