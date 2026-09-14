import React from 'react'
import { Radio, Users, PhoneCall, Volume2, Mic, MicOff, LogOut } from 'lucide-react'
import { useI18n } from '../i18n'

export interface GroupCallBarProps {
  chatTitle: string
  isBroadcast?: boolean
  participantsCount?: number
  isJoined?: boolean
  isMuted?: boolean
  onJoin: () => void
  onOpen: () => void
  onLeave?: () => void
  onToggleMute?: () => void
}

export const GroupCallBar: React.FC<GroupCallBarProps> = ({
  chatTitle,
  isBroadcast,
  participantsCount = 1,
  isJoined = false,
  isMuted = false,
  onJoin,
  onOpen,
  onLeave,
  onToggleMute,
}) => {
  const { t } = useI18n()

  return (
    <div className="shrink-0 px-4 py-2 bg-gradient-to-r from-emerald-950/80 via-dark-850 to-emerald-900/60 backdrop-blur-md border-b border-emerald-500/30 flex items-center justify-between gap-3 select-none z-10 shadow-lg">
      <div
        onClick={onOpen}
        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
      >
        {/* Animated Equalizer Waveform */}
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center relative shrink-0 shadow-glow border border-emerald-500/40">
          <Radio className="w-4 h-4 animate-pulse" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
              {isBroadcast ? t('group_call.live_stream') : t('group_call.title')}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE</span>
            </span>
          </div>
          <div className="text-[10px] text-gray-400 flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-emerald-400" />
              <span>{participantsCount} {t('group_call.participants')}</span>
            </span>
            <span>•</span>
            <span className="truncate max-w-[200px] text-gray-300">{chatTitle}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {isJoined ? (
          <>
            {onToggleMute && (
              <button
                type="button"
                onClick={onToggleMute}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isMuted
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 shadow-glow'
                }`}
                title={isMuted ? t('group_call.unmute') : t('group_call.mute')}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              type="button"
              onClick={onOpen}
              className="px-3 py-1.5 rounded-xl bg-dark-750 hover:bg-dark-700 text-white font-semibold text-xs border border-white/10 transition-all cursor-pointer"
            >
              Open
            </button>

            {onLeave && (
              <button
                type="button"
                onClick={onLeave}
                className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all cursor-pointer"
                title={t('group_call.leave')}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={onJoin}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-dark-950 font-bold text-xs shadow-glow transition-all cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5 fill-current" />
            <span>{t('group_call.join')}</span>
          </button>
        )}
      </div>
    </div>
  )
}
