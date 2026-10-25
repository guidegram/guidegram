import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Briefcase, Clock, MessageSquare, Moon, Sun, Check, X, CheckCheck, Sparkles, MapPin } from 'lucide-react'
import { QuickReplyShortcutItem } from '../../types/telegram'
import { useI18n } from '../../i18n'

interface BusinessSettingsModalProps {
  isOpen: boolean
  accountId: string
  onClose: () => void
}

const DAYS_OF_WEEK = [
  { day: 0, name: 'Monday', short: 'Mon' },
  { day: 1, name: 'Tuesday', short: 'Tue' },
  { day: 2, name: 'Wednesday', short: 'Wed' },
  { day: 3, name: 'Thursday', short: 'Thu' },
  { day: 4, name: 'Friday', short: 'Fri' },
  { day: 5, name: 'Saturday', short: 'Sat' },
  { day: 6, name: 'Sunday', short: 'Sun' },
]

export const BusinessSettingsModal: React.FC<BusinessSettingsModalProps> = ({
  isOpen,
  accountId,
  onClose,
}) => {
  const { t, language } = useI18n()
  const isPersian = language === 'fa'

  const [activeTab, setActiveTab] = useState<'hours' | 'greeting' | 'away'>('hours')
  const [shortcuts, setShortcuts] = useState<QuickReplyShortcutItem[]>([])
  const [isLoadingShortcuts, setIsLoadingShortcuts] = useState(true)

  // Work Hours State
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tehran')
  const [activeDays, setActiveDays] = useState<number[]>([0, 1, 2, 3, 4])
  const [startHour, setStartHour] = useState('09:00')
  const [endHour, setEndHour] = useState('18:00')

  // Greeting Message State
  const [greetingEnabled, setGreetingEnabled] = useState(true)
  const [greetingShortcutId, setGreetingShortcutId] = useState<number>(0)
  const [noActivityDays, setNoActivityDays] = useState(7)

  // Away Message State
  const [awayEnabled, setAwayEnabled] = useState(true)
  const [awayShortcutId, setAwayShortcutId] = useState<number>(0)
  const [awaySchedule, setAwaySchedule] = useState<'outsideHours' | 'always'>('outsideHours')
  const [offlineOnly, setOfflineOnly] = useState(true)

  const [isSaving, setIsSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const fetchShortcuts = async () => {
      setIsLoadingShortcuts(true)
      try {
        if (window.guidegram?.getQuickReplies) {
          const list = await window.guidegram.getQuickReplies(accountId)
          if (isMounted && list) {
            setShortcuts(list)
            if (list.length > 0) {
              setGreetingShortcutId(list[0].shortcutId)
              setAwayShortcutId(list[0].shortcutId)
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load shortcuts:', err)
      } finally {
        if (isMounted) setIsLoadingShortcuts(false)
      }
    }
    if (isOpen) fetchShortcuts()
    return () => {
      isMounted = false
    }
  }, [isOpen, accountId])

  if (!isOpen) return null

  const parseTimeToMinutes = (tStr: string) => {
    const [h, m] = tStr.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setStatusMsg(null)
    try {
      // 1. Save Work Hours
      const weeklyOpen = activeDays.map((d) => {
        const start = d * 1440 + parseTimeToMinutes(startHour)
        const end = d * 1440 + parseTimeToMinutes(endHour)
        return { startMinute: start, endMinute: end }
      })

      if (window.guidegram?.updateBusinessWorkHours) {
        await window.guidegram.updateBusinessWorkHours(accountId, {
          timezoneId: timezone,
          weeklyOpen,
        })
      }

      // 2. Save Greeting Message
      if (window.guidegram?.updateBusinessGreetingMessage) {
        await window.guidegram.updateBusinessGreetingMessage(
          accountId,
          greetingEnabled ? { shortcutId: greetingShortcutId, noActivityDays } : null
        )
      }

      // 3. Save Away Message
      if (window.guidegram?.updateBusinessAwayMessage) {
        await window.guidegram.updateBusinessAwayMessage(
          accountId,
          awayEnabled ? { shortcutId: awayShortcutId, schedule: awaySchedule, offlineOnly } : null
        )
      }

      setStatusMsg(isPersian ? 'تنظیمات بیزینس با موفقیت ذخیره شد' : 'Business settings saved successfully!')
      setTimeout(() => {
        onClose()
      }, 900)
    } catch (err: any) {
      console.warn('Failed to save business settings:', err)
      setStatusMsg(err?.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleDay = (dayIndex: number) => {
    if (activeDays.includes(dayIndex)) {
      setActiveDays(activeDays.filter((d) => d !== dayIndex))
    } else {
      setActiveDays([...activeDays, dayIndex].sort())
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="w-full max-w-lg bg-dark-850 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-cyan/20 text-accent-cyan flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isPersian ? 'تنظیمات تلگرام بیزینس' : 'Telegram Business Settings'}
              </h3>
              <p className="text-[11px] text-gray-400">
                {isPersian ? 'ساعات کاری، پیام خوش‌آمدگویی و پیام عدم حضور' : 'Working hours, greeting & away auto-replies'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-white/5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('hours')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'hours'
                ? 'border-accent-cyan text-accent-cyan'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isPersian ? 'ساعات کاری' : 'Business Hours'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('greeting')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'greeting'
                ? 'border-accent-cyan text-accent-cyan'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{isPersian ? 'پیام خوش‌آمدگویی' : 'Greeting'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('away')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'away'
                ? 'border-accent-cyan text-accent-cyan'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>{isPersian ? 'پیام عدم حضور' : 'Away Message'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {activeTab === 'hours' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-accent-cyan"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-2">Open Days</label>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((d) => {
                    const isActive = activeDays.includes(d.day)
                    return (
                      <button
                        key={d.day}
                        type="button"
                        onClick={() => toggleDay(d.day)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-accent-cyan text-dark-950 shadow-md'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {d.short}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Opening Time</label>
                  <input
                    type="time"
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-accent-cyan"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Closing Time</label>
                  <input
                    type="time"
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-accent-cyan"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'greeting' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Enable Greeting Message</div>
                  <div className="text-[11px] text-gray-400">Automatically greet new chats and returning clients</div>
                </div>
                <button
                  type="button"
                  onClick={() => setGreetingEnabled(!greetingEnabled)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    greetingEnabled ? 'bg-accent-cyan' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-dark-950 absolute top-0.5 transition-transform ${
                      greetingEnabled ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {greetingEnabled && (
                <>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Greeting Shortcut Payload</label>
                    {isLoadingShortcuts ? (
                      <div className="text-xs text-gray-500">Loading shortcuts...</div>
                    ) : shortcuts.length === 0 ? (
                      <div className="text-xs text-amber-400 p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                        No quick reply shortcuts found. Create a shortcut like /hello first!
                      </div>
                    ) : (
                      <select
                        value={greetingShortcutId}
                        onChange={(e) => setGreetingShortcutId(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-dark-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-accent-cyan"
                      >
                        {shortcuts.map((s) => (
                          <option key={s.shortcutId} value={s.shortcutId}>
                            /{s.shortcut} - {s.messages?.[0]?.text?.slice(0, 40) || 'Message'}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Send again after inactivity (days)</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={noActivityDays}
                      onChange={(e) => setNoActivityDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-dark-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-accent-cyan"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'away' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Enable Away Message</div>
                  <div className="text-[11px] text-gray-400">Respond automatically when you are busy or offline</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAwayEnabled(!awayEnabled)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    awayEnabled ? 'bg-accent-cyan' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-dark-950 absolute top-0.5 transition-transform ${
                      awayEnabled ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {awayEnabled && (
                <>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Away Shortcut Payload</label>
                    {shortcuts.length === 0 ? (
                      <div className="text-xs text-amber-400 p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                        No quick reply shortcuts found. Create a shortcut like /away first!
                      </div>
                    ) : (
                      <select
                        value={awayShortcutId}
                        onChange={(e) => setAwayShortcutId(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-dark-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-accent-cyan"
                      >
                        {shortcuts.map((s) => (
                          <option key={s.shortcutId} value={s.shortcutId}>
                            /{s.shortcut} - {s.messages?.[0]?.text?.slice(0, 40) || 'Message'}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Schedule</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAwaySchedule('outsideHours')}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          awaySchedule === 'outsideHours'
                            ? 'border-accent-cyan bg-accent-cyan/15 text-accent-cyan'
                            : 'border-white/10 bg-white/5 text-gray-400'
                        }`}
                      >
                        Outside Work Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => setAwaySchedule('always')}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          awaySchedule === 'always'
                            ? 'border-accent-cyan bg-accent-cyan/15 text-accent-cyan'
                            : 'border-white/10 bg-white/5 text-gray-400'
                        }`}
                      >
                        Always Send
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">Send only when offline</div>
                      <div className="text-[11px] text-gray-400">Do not send if you are actively using Guidegram</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOfflineOnly(!offlineOnly)}
                      className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                        offlineOnly ? 'bg-accent-cyan' : 'bg-gray-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-dark-950 absolute top-0.5 transition-transform ${
                          offlineOnly ? 'right-0.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {statusMsg && (
            <div className="p-2.5 rounded-xl bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 text-xs text-center font-medium">
              {statusMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5 bg-dark-900/40 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            {isPersian ? 'انصراف' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-accent-cyan text-dark-950 font-bold text-xs hover:bg-accent-cyan/90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            <span>{isSaving ? (isPersian ? 'در حال ذخیره...' : 'Saving...') : (isPersian ? 'ذخیره تنظیمات' : 'Save Business Settings')}</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
