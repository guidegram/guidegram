import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  MapPin,
  Navigation,
  Compass,
  Radio,
  Clock,
  Shield,
  Bell,
  StopCircle,
  Play,
  RotateCw,
  Users,
  AlertCircle,
  Check,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { useI18n } from '../../i18n'

export interface LiveLocationItem {
  messageId: number
  senderId: string
  senderName?: string
  date: number
  lat: number
  long: number
  period: number
  heading?: number
  proximityRadius?: number
  isLive: boolean
}

export interface LiveLocationModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  chatId: string
  chatTitle: string
  onLocationSent?: () => void
}

const LIVE_DURATIONS = [
  { label: '15 min', value: 900 },
  { label: '1 hour', value: 3600 },
  { label: '8 hours', value: 28800 },
]

const PROXIMITY_RADII = [
  { label: 'Off', value: 0 },
  { label: '50 m', value: 50 },
  { label: '100 m', value: 100 },
  { label: '500 m', value: 500 },
  { label: '1 km', value: 1000 },
]

export const LiveLocationModal: React.FC<LiveLocationModalProps> = ({
  isOpen,
  onClose,
  accountId,
  chatId,
  chatTitle,
  onLocationSent,
}) => {
  const { t } = useI18n()
  const [locations, setLocations] = useState<LiveLocationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [stoppingId, setStoppingId] = useState<number | null>(null)
  const [selectedDuration, setSelectedDuration] = useState(3600)
  const [selectedProximity, setSelectedProximity] = useState(100)
  const [myCoords, setMyCoords] = useState<{ lat: number; long: number; heading?: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [myActiveLiveMsgId, setMyActiveLiveMsgId] = useState<number | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Fetch recent live locations from MTProto
  const fetchLocations = useCallback(async () => {
    if (!accountId || !chatId) return
    try {
      if (window.guidegram?.getRecentLocations) {
        const res = await window.guidegram.getRecentLocations(accountId, chatId, 50)
        if (res && Array.isArray(res.locations)) {
          setLocations(res.locations)
          const own = res.locations.find((l: any) => l.isLive && l.senderId === accountId)
          if (own) {
            setMyActiveLiveMsgId(own.messageId)
          } else {
            setMyActiveLiveMsgId(null)
          }
        }
      }
    } catch (err) {
      console.warn('[LiveLocationModal] getRecentLocations error:', err)
    } finally {
      setLoading(false)
    }
  }, [accountId, chatId])

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    fetchLocations()

    // Query browser geolocation for current user coordinates
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMyCoords({
            lat: pos.coords.latitude,
            long: pos.coords.longitude,
            heading: pos.coords.heading || undefined,
          })
        },
        () => {
          // Fallback to demo coordinates
          setMyCoords({ lat: 35.6892, long: 51.3890, heading: 45 })
        },
        { enableHighAccuracy: true, timeout: 8000 }
      )
    } else {
      setMyCoords({ lat: 35.6892, long: 51.3890, heading: 45 })
    }

    // Live polling interval every 8 seconds
    const interval = setInterval(fetchLocations, 8000)
    return () => clearInterval(interval)
  }, [isOpen, fetchLocations])

  // Canvas-based Live Location Radar Renderer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const cx = width / 2
    const cy = height / 2

    ctx.clearRect(0, 0, width, height)

    // Dark sleek radar background
    const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, width / 2)
    bgGrad.addColorStop(0, '#10141f')
    bgGrad.addColorStop(1, '#090b10')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, width, height)

    // Range rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)'
    ctx.lineWidth = 1
    for (let r = 40; r < width / 2; r += 40) {
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.beginPath()
    ctx.moveTo(cx, 0)
    ctx.lineTo(cx, height)
    ctx.moveTo(0, cy)
    ctx.lineTo(width, cy)
    ctx.stroke()

    // Geofencing Proximity Notification boundary ring (if active)
    if (selectedProximity > 0) {
      const proxRadius = Math.min(width * 0.42, 60 + (selectedProximity / 1000) * 40)
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)'
      ctx.fillStyle = 'rgba(244, 63, 94, 0.05)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.arc(cx, cy, proxRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Render Center User Marker
    ctx.fillStyle = '#38bdf8'
    ctx.shadowColor = '#38bdf8'
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.arc(cx, cy, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Heading direction arrow
    const headingDeg = myCoords?.heading || 30
    const headingRad = (headingDeg - 90) * (Math.PI / 180)
    const arrowLen = 18
    const ax = cx + Math.cos(headingRad) * arrowLen
    const ay = cy + Math.sin(headingRad) * arrowLen

    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(ax, ay)
    ctx.stroke()

    // Render other participants on the radar
    locations.forEach((loc, idx) => {
      if (loc.senderId === accountId) return
      const angle = (idx * 1.3) + 0.5
      const dist = 55 + (idx % 3) * 35
      const px = cx + Math.cos(angle) * dist
      const py = cy + Math.sin(angle) * dist

      ctx.fillStyle = '#a855f7'
      ctx.shadowColor = '#a855f7'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(px, py, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // Participant pulse
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(px, py, 14, 0, Math.PI * 2)
      ctx.stroke()
    })
  }, [locations, myCoords, selectedProximity, accountId])

  if (!isOpen) return null

  // Start live location streaming
  const handleStartLiveSharing = async () => {
    if (sharing) return
    setSharing(true)
    setErrorMsg(null)

    try {
      const lat = myCoords?.lat || 35.6892
      const long = myCoords?.long || 51.3890
      const heading = myCoords?.heading || 0

      if (window.guidegram?.sendLocation) {
        const res = await window.guidegram.sendLocation(accountId, chatId, {
          lat,
          long,
          livePeriod: selectedDuration,
          heading,
          proximityNotificationRadius: selectedProximity > 0 ? selectedProximity : undefined,
        })

        if (res && res.success) {
          fetchLocations()
          onLocationSent?.()
        } else {
          setErrorMsg(res?.error || 'Failed to start live location stream')
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error starting live location')
    } finally {
      setSharing(false)
    }
  }

  // Stop active live location stream
  const handleStopLiveSharing = async (messageId: number) => {
    setStoppingId(messageId)
    try {
      if (window.guidegram?.stopLiveLocation) {
        await window.guidegram.stopLiveLocation(accountId, chatId, messageId)
      } else if (window.guidegram?.editLiveLocation) {
        await window.guidegram.editLiveLocation(accountId, chatId, messageId, { stopped: true })
      }
      setMyActiveLiveMsgId(null)
      fetchLocations()
    } catch (err) {
      console.warn('[LiveLocationModal] stopLiveLocation error:', err)
    } finally {
      setStoppingId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative flex flex-col w-full max-w-lg bg-dark-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="h-14 px-4 bg-dark-850/90 border-b border-white/10 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-cyan/30 to-primary-600/30 border border-accent-cyan/40 text-accent-cyan flex items-center justify-center shrink-0 shadow-inner">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white leading-tight">Live Location & Geofencing</span>
              <span className="text-[10px] text-gray-400 truncate max-w-[220px]">{chatTitle}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Radar Map Canvas Viewport */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-dark-950 flex items-center justify-center shadow-inner">
            <canvas
              ref={canvasRef}
              width={420}
              height={220}
              className="w-full h-[220px] object-cover"
            />

            {/* Radar overlay badges */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                {myCoords ? `${myCoords.lat.toFixed(4)}, ${myCoords.long.toFixed(4)}` : 'Acquiring GPS…'}
              </span>
            </div>

            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-gray-300">
              <Users className="w-3 h-3 text-purple-400" />
              <span>{locations.length} live</span>
            </div>

            {selectedProximity > 0 && (
              <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-[10px] text-rose-300 font-semibold flex items-center gap-1">
                <Bell className="w-3 h-3" />
                <span>Geofence Alert: &lt;{selectedProximity}m</span>
              </div>
            )}
          </div>

          {/* Active Live Location Card (if user is currently streaming) */}
          {myActiveLiveMsgId ? (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Navigation className="w-4 h-4 animate-spin" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-emerald-300">Streaming Live Location</span>
                  <span className="text-[10px] text-gray-400">Updating heading & coordinates</span>
                </div>
              </div>

              <button
                type="button"
                disabled={stoppingId === myActiveLiveMsgId}
                onClick={() => handleStopLiveSharing(myActiveLiveMsgId)}
                className="py-1.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {stoppingId === myActiveLiveMsgId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <StopCircle className="w-3.5 h-3.5" />
                )}
                <span>Stop Sharing</span>
              </button>
            </div>
          ) : (
            <>
              {/* Duration Selector */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Share For Duration
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {LIVE_DURATIONS.map((dur) => (
                    <button
                      key={dur.value}
                      type="button"
                      onClick={() => setSelectedDuration(dur.value)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                        selectedDuration === dur.value
                          ? 'bg-primary-600/30 border-primary-500 text-white shadow-sm'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Geofencing Proximity Alert Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Proximity Geofence Alert
                  </span>
                  <span className="text-[10px] text-accent-cyan">
                    {selectedProximity === 0 ? 'No Alert' : `Notify when <${selectedProximity}m`}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {PROXIMITY_RADII.map((rad) => (
                    <button
                      key={rad.value}
                      type="button"
                      onClick={() => setSelectedProximity(rad.value)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-medium border transition-all text-center ${
                        selectedProximity === rad.value
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-sm'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {rad.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Share Live Location Primary Button */}
              <button
                type="button"
                onClick={handleStartLiveSharing}
                disabled={sharing}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-accent-cyan to-primary-600 hover:brightness-110 text-white font-bold text-xs tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {sharing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Radio className="w-4 h-4" />
                )}
                <span>Share My Live Location</span>
              </button>
            </>
          )}

          {/* Participant Active Locations List */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Active Locations in Chat ({locations.length})
            </span>

            {loading ? (
              <div className="py-6 flex items-center justify-center text-gray-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-primary-400 mr-2" />
                <span>Loading active streams…</span>
              </div>
            ) : locations.length === 0 ? (
              <div className="py-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-xs text-gray-500">
                No active live locations in this chat right now.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                {locations.map((loc) => (
                  <div
                    key={loc.messageId}
                    className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs text-gray-300"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-accent-cyan/20 text-accent-cyan flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-white">
                          {loc.senderId === accountId ? 'You' : `Peer ${loc.senderId.slice(-4)}`}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">
                          {loc.lat?.toFixed(4)}, {loc.long?.toFixed(4)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {loc.heading !== undefined && (
                        <div
                          className="w-5 h-5 flex items-center justify-center text-accent-cyan"
                          style={{ transform: `rotate(${loc.heading}deg)` }}
                          title={`Heading ${loc.heading}°`}
                        >
                          <Navigation className="w-3 h-3" />
                        </div>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                        Live
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
