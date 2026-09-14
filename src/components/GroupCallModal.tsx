import React, { useState, useEffect, useRef } from 'react'
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
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { GroupCallInfo, GroupCallParticipantItem } from '../types/telegram'
import { useI18n } from '../i18n'

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

  // 2. Fetch Group Call & Participants from Backend
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
    const pollInterval = setInterval(loadCallData, 5000)

    return () => {
      isCancelled = true
      clearInterval(pollInterval)
    }
  }, [isOpen, accountId, chatId, initialCallId, initialAccessHash])

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

  // Handle Leave
  const handleLeave = async () => {
    if (callInfo && window.guidegram?.leaveGroupCall) {
      window.guidegram.leaveGroupCall(accountId, callInfo.id, callInfo.accessHash).catch(() => {})
    }
    if (onLeaveCall) onLeaveCall()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div
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

        {/* Center Stage & Participants Split View */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden bg-gradient-to-b from-dark-900 to-dark-950">
          {/* Main Stage: Active Speaker or Video Feed */}
          <div className="flex-1 relative flex flex-col items-center justify-center p-8 overflow-hidden">
            {/* Concentric Audio Ripples */}
            <div className="relative flex items-center justify-center">
              {!activeSpeaker?.isMuted && (
                <>
                  <div className="absolute w-56 h-56 rounded-full bg-emerald-500/10 animate-ping duration-1000" />
                  <div className="absolute w-44 h-44 rounded-full bg-emerald-500/15 animate-pulse duration-700" />
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

            {/* Video / Screen Share indicator bar if active */}
            {(isVideoOn || isScreenSharing) && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs text-emerald-300">
                {isVideoOn && <Video className="w-3.5 h-3.5" />}
                {isScreenSharing && <Monitor className="w-3.5 h-3.5" />}
                <span>{isScreenSharing ? t('group_call.share_screen') : t('group_call.camera')}</span>
              </div>
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
            onClick={() => setIsVideoOn(!isVideoOn)}
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
            onClick={() => setIsScreenSharing(!isScreenSharing)}
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
      </div>
    </div>
  )
}
