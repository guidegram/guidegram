import fs from 'fs'
import path from 'path'
import {
  UserOnlineStatusType,
  UserActivitySession,
  UserActivityStats,
  ContactChangeType,
  ContactChangeEvent,
  ActivityLogRetentionPeriod,
  ContactChangeFilter,
  AppConfig,
} from './types'
import { Logger } from './logger'

interface UserStatusRecord {
  timestamp: number
  status: UserOnlineStatusType
  wasOnline?: number
  expires?: number
}

export interface UserSnapshot {
  id: string
  name: string
  username?: string
  phone?: string
  bio?: string
  personalChannelId?: string
  personalChannelTitle?: string
  photoId?: string
  avatarUrl?: string
  isMutualContact?: boolean
  isContact?: boolean
  lastSeen?: number
  updatedAt: number
}

export class ActivityTrackerService {
  private baseDir: string
  private activityDir: string
  private onEventCallback?: (event: string, payload: any) => void
  private getConfig: () => AppConfig

  // In-memory caches per account
  // accountId -> userId -> UserStatusRecord[]
  private statusCache = new Map<string, Record<string, UserStatusRecord[]>>()
  // accountId -> userId -> { startTime: number, status: UserOnlineStatusType }
  private activeSessions = new Map<string, Record<string, { startTime: number; status: UserOnlineStatusType }>>()
  // accountId -> ContactChangeEvent[]
  private changesCache = new Map<string, ContactChangeEvent[]>()
  // accountId -> userId -> UserSnapshot
  private snapshotsCache = new Map<string, Record<string, UserSnapshot>>()

  // Debounced save timers per account
  private saveStatusTimers = new Map<string, NodeJS.Timeout>()
  private saveChangesTimers = new Map<string, NodeJS.Timeout>()
  private saveSnapshotsTimers = new Map<string, NodeJS.Timeout>()
  private uptimeHeartbeatInterval?: NodeJS.Timeout
  private appUptimeIntervals: Array<{ start: number; end: number }> = []

  constructor(
    baseDataDir: string,
    onEvent?: (event: string, payload: any) => void,
    getConfig?: () => AppConfig
  ) {
    this.baseDir = baseDataDir
    this.activityDir = path.join(baseDataDir, 'activity_tracker')
    this.onEventCallback = onEvent
    this.getConfig = getConfig || (() => ({} as AppConfig))
    this.ensureDirectory()
    this.initUptimeTracker()
  }

  private ensureDirectory(): void {
    try {
      if (!fs.existsSync(this.activityDir)) {
        fs.mkdirSync(this.activityDir, { recursive: true })
      }
    } catch (err) {
      Logger.warn('[ActivityTracker] Failed to create directory:', err)
    }
  }

  private getUptimeFilePath(): string {
    return path.join(this.activityDir, 'platform_uptime.json')
  }

  private initUptimeTracker(): void {
    const fp = this.getUptimeFilePath()
    try {
      if (fs.existsSync(fp)) {
        const raw = fs.readFileSync(fp, 'utf-8')
        this.appUptimeIntervals = JSON.parse(raw)
      }
    } catch (err) {
      Logger.warn('[ActivityTracker] Failed to load uptime history:', err)
    }

    const now = Math.floor(Date.now() / 1000)
    // If the last interval was updated within 3 minutes, extend it; otherwise start a new interval
    const last = this.appUptimeIntervals[this.appUptimeIntervals.length - 1]
    if (last && now - last.end < 180) {
      last.end = now
    } else {
      this.appUptimeIntervals.push({ start: now, end: now })
    }

    // Keep up to 30 days of uptime intervals
    const retentionCutoff = now - 30 * 86400
    this.appUptimeIntervals = this.appUptimeIntervals.filter((iv) => iv.end >= retentionCutoff)

    const persistUptime = () => {
      try {
        const curNow = Math.floor(Date.now() / 1000)
        const curLast = this.appUptimeIntervals[this.appUptimeIntervals.length - 1]
        if (curLast) {
          curLast.end = curNow
        }
        fs.writeFileSync(fp, JSON.stringify(this.appUptimeIntervals, null, 2), 'utf-8')
      } catch (err) {
        // Silent fail on write
      }
    }

    persistUptime()
    this.uptimeHeartbeatInterval = setInterval(persistUptime, 30000)
    if (this.uptimeHeartbeatInterval.unref) {
      this.uptimeHeartbeatInterval.unref()
    }
  }

  // =========================================================================
  // File Paths
  // =========================================================================

  private getStatusFilePath(accountId: string): string {
    return path.join(this.activityDir, `status_${accountId}.json`)
  }

  private getChangesFilePath(accountId: string): string {
    return path.join(this.activityDir, `changes_${accountId}.json`)
  }

  private getSnapshotsFilePath(accountId: string): string {
    return path.join(this.activityDir, `snapshots_${accountId}.json`)
  }

  // =========================================================================
  // Cache Loaders & Disk Persistence
  // =========================================================================

  private loadStatus(accountId: string): Record<string, UserStatusRecord[]> {
    if (this.statusCache.has(accountId)) {
      return this.statusCache.get(accountId)!
    }
    const fp = this.getStatusFilePath(accountId)
    let data: Record<string, UserStatusRecord[]> = {}
    if (fs.existsSync(fp)) {
      try {
        const raw = fs.readFileSync(fp, 'utf-8')
        data = JSON.parse(raw)
      } catch (err) {
        Logger.warn(`[ActivityTracker] Error loading status file for ${accountId}:`, err)
      }
    }
    this.statusCache.set(accountId, data)
    return data
  }

  private loadChanges(accountId: string): ContactChangeEvent[] {
    if (this.changesCache.has(accountId)) {
      return this.changesCache.get(accountId)!
    }
    const fp = this.getChangesFilePath(accountId)
    let data: ContactChangeEvent[] = []
    if (fs.existsSync(fp)) {
      try {
        const raw = fs.readFileSync(fp, 'utf-8')
        data = JSON.parse(raw)
      } catch (err) {
        Logger.warn(`[ActivityTracker] Error loading changes file for ${accountId}:`, err)
      }
    }
    this.changesCache.set(accountId, data)
    return data
  }

  private loadSnapshots(accountId: string): Record<string, UserSnapshot> {
    if (this.snapshotsCache.has(accountId)) {
      return this.snapshotsCache.get(accountId)!
    }
    const fp = this.getSnapshotsFilePath(accountId)
    let data: Record<string, UserSnapshot> = {}
    if (fs.existsSync(fp)) {
      try {
        const raw = fs.readFileSync(fp, 'utf-8')
        data = JSON.parse(raw)
      } catch (err) {
        Logger.warn(`[ActivityTracker] Error loading snapshots file for ${accountId}:`, err)
      }
    }
    this.snapshotsCache.set(accountId, data)
    return data
  }

  private scheduleSaveStatus(accountId: string): void {
    if (this.saveStatusTimers.has(accountId)) return
    const timer = setTimeout(() => {
      this.saveStatusTimers.delete(accountId)
      try {
        const data = this.statusCache.get(accountId)
        if (data) {
          fs.writeFileSync(this.getStatusFilePath(accountId), JSON.stringify(data), 'utf-8')
        }
      } catch (err) {
        Logger.warn(`[ActivityTracker] Failed to save status for ${accountId}:`, err)
      }
    }, 2000)
    this.saveStatusTimers.set(accountId, timer)
  }

  private scheduleSaveChanges(accountId: string): void {
    if (this.saveChangesTimers.has(accountId)) return
    const timer = setTimeout(() => {
      this.saveChangesTimers.delete(accountId)
      try {
        const data = this.changesCache.get(accountId)
        if (data) {
          fs.writeFileSync(this.getChangesFilePath(accountId), JSON.stringify(data), 'utf-8')
        }
      } catch (err) {
        Logger.warn(`[ActivityTracker] Failed to save changes for ${accountId}:`, err)
      }
    }, 1500)
    this.saveChangesTimers.set(accountId, timer)
  }

  private scheduleSaveSnapshots(accountId: string): void {
    if (this.saveSnapshotsTimers.has(accountId)) return
    const timer = setTimeout(() => {
      this.saveSnapshotsTimers.delete(accountId)
      try {
        const data = this.snapshotsCache.get(accountId)
        if (data) {
          fs.writeFileSync(this.getSnapshotsFilePath(accountId), JSON.stringify(data), 'utf-8')
        }
      } catch (err) {
        Logger.warn(`[ActivityTracker] Failed to save snapshots for ${accountId}:`, err)
      }
    }, 2500)
    this.saveSnapshotsTimers.set(accountId, timer)
  }

  public flushSync(): void {
    for (const [accountId, data] of this.statusCache.entries()) {
      try {
        fs.writeFileSync(this.getStatusFilePath(accountId), JSON.stringify(data), 'utf-8')
      } catch (_) {}
    }
    for (const [accountId, data] of this.changesCache.entries()) {
      try {
        fs.writeFileSync(this.getChangesFilePath(accountId), JSON.stringify(data), 'utf-8')
      } catch (_) {}
    }
    for (const [accountId, data] of this.snapshotsCache.entries()) {
      try {
        fs.writeFileSync(this.getSnapshotsFilePath(accountId), JSON.stringify(data), 'utf-8')
      } catch (_) {}
    }
  }

  // =========================================================================
  // Status Normalizer & Online/Offline Session Tracking
  // =========================================================================

  public parseUserStatusType(raw: any): {
    status: UserOnlineStatusType
    wasOnline?: number
    expires?: number
  } {
    if (!raw) return { status: 'empty' }
    const typeStr = (raw._ || raw.className || raw.type || '').toString()

    if (typeStr === 'userStatusOnline' || typeStr === 'online') {
      return { status: 'online', expires: Number(raw.expires || 0) }
    }
    if (typeStr === 'userStatusOffline' || typeStr === 'offline') {
      const was = Number(raw.wasOnline ?? raw.was_online ?? 0)
      return { status: 'offline', wasOnline: was > 0 ? was : Math.floor(Date.now() / 1000) }
    }
    if (typeStr === 'userStatusRecently' || typeStr === 'recently') {
      return { status: 'recently' }
    }
    if (typeStr === 'userStatusLastWeek' || typeStr === 'within_week' || typeStr === 'lastWeek') {
      return { status: 'within_week' }
    }
    if (typeStr === 'userStatusLastMonth' || typeStr === 'within_month' || typeStr === 'lastMonth') {
      return { status: 'within_month' }
    }
    if (typeStr === 'userStatusLastQuarter' || typeStr === 'long_time_ago' || typeStr === 'lastQuarter') {
      return { status: 'long_time_ago' }
    }
    return { status: 'empty' }
  }

  public recordUserStatus(
    accountId: string,
    userId: string,
    rawStatus: any,
    meta?: { title?: string; avatarUrl?: string; username?: string }
  ): void {
    const cfg = this.getConfig()
    if (cfg.activityTrackerEnabled === false) return
    if (cfg.ignoredUserTrackingIds?.includes(userId)) return

    const parsed = this.parseUserStatusType(rawStatus)
    const now = Math.floor(Date.now() / 1000)

    const allStatus = this.loadStatus(accountId)
    if (!allStatus[userId]) {
      allStatus[userId] = []
    }
    const history = allStatus[userId]

    // Deduplicate identical last status if within 15 seconds
    const lastRec = history[history.length - 1]
    if (lastRec && lastRec.status === parsed.status && Math.abs(now - lastRec.timestamp) < 15) {
      return
    }

    const newRecord: UserStatusRecord = {
      timestamp: now,
      status: parsed.status,
      wasOnline: parsed.wasOnline,
      expires: parsed.expires,
    }
    history.push(newRecord)

    // Keep memory history bounded (max 500 events per user)
    if (history.length > 500) {
      allStatus[userId] = history.slice(-500)
    }

    // Active session handling
    let accountSessions = this.activeSessions.get(accountId)
    if (!accountSessions) {
      accountSessions = {}
      this.activeSessions.set(accountId, accountSessions)
    }

    if (parsed.status === 'online') {
      if (!accountSessions[userId]) {
        accountSessions[userId] = { startTime: now, status: 'online' }
      }
    } else if (parsed.status === 'offline') {
      if (accountSessions[userId]) {
        delete accountSessions[userId]
      }
    }

    this.scheduleSaveStatus(accountId)

    // Notify renderer
    this.onEventCallback?.('telegram:user-status-changed', {
      accountId,
      userId,
      status: parsed.status,
      wasOnline: parsed.wasOnline,
      timestamp: now,
      meta,
    })
  }

  // =========================================================================
  // Contact Profile Changes Auditor
  // =========================================================================

  public recordContactChange(
    accountId: string,
    change: Omit<ContactChangeEvent, 'id' | 'timestamp' | 'accountId'>
  ): void {
    const cfg = this.getConfig()
    if (cfg.profileChangeAuditorEnabled === false) return
    if (cfg.ignoredUserTrackingIds?.includes(change.userId)) return

    const changes = this.loadChanges(accountId)
    const now = Math.floor(Date.now() / 1000)
    const id = `change_${now}_${Math.random().toString(36).substring(2, 8)}`

    // Avoid duplicate event within 10 seconds for same type & user
    const recent = changes.find(
      (c) =>
        c.userId === change.userId &&
        c.changeType === change.changeType &&
        Math.abs(now - c.timestamp) < 10 &&
        c.newValue === change.newValue
    )
    if (recent) return

    const event: ContactChangeEvent = {
      id,
      accountId,
      timestamp: now,
      ...change,
    }

    // Prepend (newest first)
    changes.unshift(event)

    // Bound maximum change history per account to 2000 events
    if (changes.length > 2000) {
      this.changesCache.set(accountId, changes.slice(0, 2000))
    }

    this.scheduleSaveChanges(accountId)

    this.onEventCallback?.('telegram:contact-change-detected', {
      accountId,
      event,
    })
  }

  public inspectUserSnapshot(
    accountId: string,
    user: any,
    fullUser?: any,
    relation?: { isMutual?: boolean; isContact?: boolean }
  ): void {
    if (!user || !user.id) return
    const userId = String(user.id)
    const cfg = this.getConfig()
    if (cfg.profileChangeAuditorEnabled === false) return
    if (cfg.ignoredUserTrackingIds?.includes(userId)) return

    const snapshots = this.loadSnapshots(accountId)
    const prev = snapshots[userId]
    const now = Math.floor(Date.now() / 1000)

    // Extract current fields safely, respecting partial updates
    const hasNameInfo = user.firstName !== undefined || user.lastName !== undefined || user.title !== undefined
    const nameParts = hasNameInfo
      ? [user.firstName, user.lastName].filter(Boolean).map((s: any) => String(s).trim())
      : []
    const currentName = hasNameInfo
      ? (nameParts.length > 0 ? nameParts.join(' ') : (user.title || user.username || 'User'))
      : (prev?.name || 'User')

    const hasUsernameInfo = user.username !== undefined || user.usernames !== undefined
    const currentUsername = hasUsernameInfo
      ? (user.username
          ? String(user.username).replace(/^@/, '')
          : (Array.isArray(user.usernames) && user.usernames[0]?.username
              ? String(user.usernames[0].username).replace(/^@/, '')
              : undefined))
      : prev?.username

    const hasPhoneInfo = user.phone !== undefined || user.phoneNumber !== undefined
    const currentPhone = hasPhoneInfo ? (user.phone || user.phoneNumber || undefined) : prev?.phone

    const currentBio = fullUser?.about !== undefined ? fullUser.about : undefined
    const currentPersonalChannelId = fullUser?.personalChannelId !== undefined ? String(fullUser.personalChannelId) : undefined
    const currentPersonalChannelTitle = fullUser?.personalChannelTitle !== undefined ? fullUser.personalChannelTitle : undefined

    const isMutual = relation?.isMutual ?? (user.mutualContact !== undefined ? Boolean(user.mutualContact) : prev?.isMutualContact)
    const isContact = relation?.isContact ?? (user.contact !== undefined ? Boolean(user.contact) : prev?.isContact)

    // Robust Photo Extraction
    const hasPhotoInfo = user.photo !== undefined || user.raw?.photo !== undefined
    let photoId: string | null | undefined = undefined // undefined = not checked, null = explicitly empty/deleted, string = photoId

    if (hasPhotoInfo) {
      const p = user.photo ?? user.raw?.photo
      if (!p || p._ === 'userProfilePhotoEmpty' || p._ === 'chatPhotoEmpty') {
        photoId = null
      } else {
        const idVal =
          p.photoId ??
          p.id ??
          (user.raw?.photo as any)?.photoId ??
          (p.big as any)?.fileId ??
          (p.small as any)?.fileId
        photoId = idVal ? String(idVal) : null
      }
    }

    // If this is the very first time we see this user, just record baseline snapshot
    if (!prev) {
      snapshots[userId] = {
        id: userId,
        name: currentName,
        username: currentUsername,
        phone: currentPhone,
        bio: currentBio,
        personalChannelId: currentPersonalChannelId,
        personalChannelTitle: currentPersonalChannelTitle,
        photoId: typeof photoId === 'string' ? photoId : undefined,
        isMutualContact: isMutual,
        isContact,
        updatedAt: now,
      }
      this.scheduleSaveSnapshots(accountId)
      return
    }

    // Diff inspection
    // 1. Name change (only if name was provided in this inspection)
    if (hasNameInfo && prev.name && currentName && prev.name !== currentName) {
      this.recordContactChange(accountId, {
        userId,
        changeType: 'name_change',
        title: 'Name Changed',
        oldValue: prev.name,
        newValue: currentName,
        isMutualContact: isMutual,
        isMyContact: isContact,
        userName: currentName,
        userUsername: currentUsername,
      })
      prev.name = currentName
    }

    // 2. Username change (only if username was provided in this inspection)
    if (hasUsernameInfo && prev.username !== currentUsername) {
      this.recordContactChange(accountId, {
        userId,
        changeType: 'username_change',
        title: 'Username Changed',
        oldValue: prev.username ? `@${prev.username}` : 'None',
        newValue: currentUsername ? `@${currentUsername}` : 'Removed',
        isMutualContact: isMutual,
        isMyContact: isContact,
        userName: currentName,
        userUsername: currentUsername,
      })
      prev.username = currentUsername
    }

    // 3. Bio change
    if (currentBio !== undefined && prev.bio !== currentBio) {
      this.recordContactChange(accountId, {
        userId,
        changeType: 'bio_change',
        title: 'Bio Changed',
        oldValue: prev.bio || 'Empty Bio',
        newValue: currentBio || 'Bio Cleared',
        isMutualContact: isMutual,
        isMyContact: isContact,
        userName: currentName,
        userUsername: currentUsername,
      })
      prev.bio = currentBio
    }

    // 4. Personal channel change
    if (
      currentPersonalChannelId !== undefined &&
      prev.personalChannelId !== currentPersonalChannelId
    ) {
      this.recordContactChange(accountId, {
        userId,
        changeType: 'personal_channel_change',
        title: 'Personal Channel Changed',
        oldValue: prev.personalChannelTitle || prev.personalChannelId ? `Channel: ${prev.personalChannelTitle || prev.personalChannelId}` : 'None',
        newValue: currentPersonalChannelId ? `Channel: ${currentPersonalChannelTitle || currentPersonalChannelId}` : 'Removed',
        isMutualContact: isMutual,
        isMyContact: isContact,
        userName: currentName,
        userUsername: currentUsername,
      })
      prev.personalChannelId = currentPersonalChannelId
      prev.personalChannelTitle = currentPersonalChannelTitle
    }

    // 5. Profile photo change / removal (only if photo was provided in this inspection)
    if (hasPhotoInfo) {
      if (prev.photoId && photoId === null) {
        this.recordContactChange(accountId, {
          userId,
          changeType: 'photo_delete',
          title: 'Profile Photo Deleted',
          oldValue: 'Existing photo',
          newValue: 'Photo removed',
          isMutualContact: isMutual,
          isMyContact: isContact,
          userName: currentName,
          userUsername: currentUsername,
        })
        prev.photoId = undefined
      } else if (typeof photoId === 'string' && prev.photoId !== photoId) {
        this.recordContactChange(accountId, {
          userId,
          changeType: 'photo_change',
          title: 'Profile Photo Changed',
          oldValue: prev.photoId ? 'Previous photo' : 'None',
          newValue: 'New profile photo set',
          isMutualContact: isMutual,
          isMyContact: isContact,
          userName: currentName,
          userUsername: currentUsername,
        })
        prev.photoId = photoId
      }
    }

    // Update contacts status
    if (isMutual !== undefined) prev.isMutualContact = isMutual
    if (isContact !== undefined) prev.isContact = isContact
    if (hasPhoneInfo && currentPhone) prev.phone = currentPhone
    prev.updatedAt = now
    this.scheduleSaveSnapshots(accountId)
  }

  // =========================================================================
  // Queries: User Activity Stats & Sessions Computation
  // =========================================================================

  public getUserActivityStats(accountId: string, userId: string): UserActivityStats {
    const allStatus = this.loadStatus(accountId)
    const history = allStatus[userId] || []
    const cfg = this.getConfig()
    const trackingEnabled =
      cfg.activityTrackerEnabled !== false && !cfg.ignoredUserTrackingIds?.includes(userId)

    const now = Math.floor(Date.now() / 1000)
    const startOfToday = new Date().setHours(0, 0, 0, 0) / 1000
    const startOfWeek = now - 7 * 86400

    let currentStatus: UserOnlineStatusType = 'empty'
    let lastSeenTimestamp: number | undefined = undefined

    // Derive sessions from status events
    const sessions: UserActivitySession[] = []
    let currentSessionStart: number | null = null

    for (let i = 0; i < history.length; i++) {
      const rec = history[i]
      if (rec.status === 'online') {
        currentSessionStart = rec.timestamp
        currentStatus = 'online'
      } else if (rec.status === 'offline') {
        currentStatus = 'offline'
        const offlineTime = rec.wasOnline || rec.timestamp
        lastSeenTimestamp = offlineTime

        if (currentSessionStart != null) {
          const duration = Math.max(30, offlineTime - currentSessionStart)
          sessions.push({
            id: `sess_${currentSessionStart}`,
            startTime: currentSessionStart,
            endTime: offlineTime,
            durationSeconds: duration,
          })
          currentSessionStart = null
        } else if (rec.wasOnline) {
          // If no recorded start, synthesize a standard 3-minute session ending at wasOnline
          const start = Math.max(rec.wasOnline - 180, rec.wasOnline - 300)
          sessions.push({
            id: `sess_${start}`,
            startTime: start,
            endTime: rec.wasOnline,
            durationSeconds: rec.wasOnline - start,
            isApproximate: true,
          })
        }
      } else {
        // recently, within_week, within_month, etc.
        currentStatus = rec.status
      }
    }

    // If currently online and session is open
    if (currentSessionStart != null) {
      sessions.push({
        id: `sess_${currentSessionStart}`,
        startTime: currentSessionStart,
        endTime: now,
        durationSeconds: Math.max(15, now - currentSessionStart),
      })
    }

    // Calculate totals and precise hourly duration (seconds active in each hour today)
    let totalOnlineSecondsToday = 0
    let totalOnlineSecondsWeek = 0
    let totalSessionsToday = 0
    const hourlyDistribution = new Array(24).fill(0)
    const hourlyDurationSeconds = new Array(24).fill(0)

    for (const sess of sessions) {
      if (sess.endTime >= startOfToday) {
        totalOnlineSecondsToday += sess.durationSeconds
        totalSessionsToday++

        // Calculate overlap for each hour of today (0 to 23)
        for (let h = 0; h < 24; h++) {
          const hourStart = startOfToday + h * 3600
          const hourEnd = hourStart + 3600
          const overlapStart = Math.max(sess.startTime, hourStart)
          const overlapEnd = Math.min(sess.endTime, hourEnd)
          if (overlapEnd > overlapStart) {
            hourlyDurationSeconds[h] += (overlapEnd - overlapStart)
            hourlyDistribution[h] = (hourlyDistribution[h] || 0) + 1
          }
        }
      }
      if (sess.endTime >= startOfWeek) {
        totalOnlineSecondsWeek += sess.durationSeconds
      }
    }

    // Clamp hourly duration to maximum 3600 seconds per hour
    for (let h = 0; h < 24; h++) {
      hourlyDurationSeconds[h] = Math.min(3600, hourlyDurationSeconds[h])
    }

    return {
      userId,
      currentStatus,
      lastSeenTimestamp,
      totalOnlineSecondsToday,
      totalOnlineSecondsWeek,
      totalSessionsToday,
      sessions: sessions.slice(-500), // Return up to 500 sessions for multi-day history
      hourlyDistribution,
      hourlyDurationSeconds,
      appUptimeIntervals: this.appUptimeIntervals,
      trackingEnabled,
    }
  }

  // =========================================================================
  // Queries: Contact Changes Timeline & Filtering
  // =========================================================================

  public getContactChanges(
    accountId: string,
    filter?: ContactChangeFilter
  ): ContactChangeEvent[] {
    const changes = this.loadChanges(accountId)
    let result = [...changes]

    if (filter) {
      // 1. Relationship filter
      if (filter.relation === 'mutual') {
        result = result.filter((c) => c.isMutualContact === true)
      } else if (filter.relation === 'my_contacts') {
        result = result.filter((c) => c.isMyContact === true)
      } else if (filter.relation === 'saved') {
        result = result.filter((c) => !c.isMutualContact && !c.isMyContact)
      }

      // 2. Change Type filter
      if (filter.changeType && filter.changeType !== 'all') {
        result = result.filter((c) => c.changeType === filter.changeType)
      }

      // 3. Search query
      if (filter.query && filter.query.trim()) {
        const q = filter.query.trim().toLowerCase()
        result = result.filter(
          (c) =>
            (c.userName && c.userName.toLowerCase().includes(q)) ||
            (c.userUsername && c.userUsername.toLowerCase().includes(q)) ||
            (c.oldValue && c.oldValue.toLowerCase().includes(q)) ||
            (c.newValue && c.newValue.toLowerCase().includes(q)) ||
            (c.title && c.title.toLowerCase().includes(q))
        )
      }
    }

    return result
  }

  public getUserChangeHistory(accountId: string, userId: string): ContactChangeEvent[] {
    const changes = this.loadChanges(accountId)
    return changes.filter((c) => c.userId === userId)
  }

  public getUserSnapshot(accountId: string, userId: string): UserSnapshot | undefined {
    const snapshots = this.loadSnapshots(accountId)
    return snapshots[userId]
  }

  // =========================================================================
  // Per-User Tracking Toggle
  // =========================================================================

  public isUserTrackingEnabled(accountId: string, userId: string): boolean {
    const cfg = this.getConfig()
    if (cfg.activityTrackerEnabled === false) return false
    return !cfg.ignoredUserTrackingIds?.includes(userId)
  }

  // =========================================================================
  // Retention Policy Auto-Pruning
  // =========================================================================

  public pruneOldRecords(
    accountId: string,
    retentionPeriod?: ActivityLogRetentionPeriod
  ): { prunedStatusCount: number; prunedChangesCount: number } {
    const period = retentionPeriod || this.getConfig().activityRetentionPeriod || '30d'
    if (period === 'forever') {
      return { prunedStatusCount: 0, prunedChangesCount: 0 }
    }

    let cutoffSeconds = 30 * 86400
    if (period === '1d') cutoffSeconds = 86400
    else if (period === '7d') cutoffSeconds = 7 * 86400
    else if (period === '30d') cutoffSeconds = 30 * 86400
    else if (period === '90d') cutoffSeconds = 90 * 86400
    else if (period === '180d') cutoffSeconds = 180 * 86400
    else if (period === '365d') cutoffSeconds = 365 * 86400

    const now = Math.floor(Date.now() / 1000)
    const threshold = now - cutoffSeconds

    let prunedStatusCount = 0
    let prunedChangesCount = 0

    // Prune status
    const allStatus = this.loadStatus(accountId)
    for (const [userId, records] of Object.entries(allStatus)) {
      const beforeLen = records.length
      const filtered = records.filter((r) => r.timestamp >= threshold)
      if (filtered.length < beforeLen) {
        prunedStatusCount += beforeLen - filtered.length
        allStatus[userId] = filtered
      }
    }

    // Prune changes
    const allChanges = this.loadChanges(accountId)
    const beforeChangesLen = allChanges.length
    const filteredChanges = allChanges.filter((c) => c.timestamp >= threshold)
    if (filteredChanges.length < beforeChangesLen) {
      prunedChangesCount += beforeChangesLen - filteredChanges.length
      this.changesCache.set(accountId, filteredChanges)
    }

    this.scheduleSaveStatus(accountId)
    this.scheduleSaveChanges(accountId)

    return { prunedStatusCount, prunedChangesCount }
  }

  // =========================================================================
  // Cleanup / Storage Stats
  // =========================================================================

  public clearData(accountId: string, type: 'all' | 'status' | 'changes'): void {
    if (type === 'all' || type === 'status') {
      this.statusCache.set(accountId, {})
      const fp = this.getStatusFilePath(accountId)
      try {
        if (fs.existsSync(fp)) fs.unlinkSync(fp)
      } catch (_) {}
    }

    if (type === 'all' || type === 'changes') {
      this.changesCache.set(accountId, [])
      const fp = this.getChangesFilePath(accountId)
      try {
        if (fs.existsSync(fp)) fs.unlinkSync(fp)
      } catch (_) {}
    }

    if (type === 'all') {
      this.snapshotsCache.set(accountId, {})
      const fp = this.getSnapshotsFilePath(accountId)
      try {
        if (fs.existsSync(fp)) fs.unlinkSync(fp)
      } catch (_) {}
    }
  }

  public getStorageStats(accountId: string): {
    totalEvents: number
    totalSessions: number
    totalUsersTracked: number
    dataSizeBytes: number
  } {
    const allStatus = this.loadStatus(accountId)
    const allChanges = this.loadChanges(accountId)

    let totalStatusEvents = 0
    let totalUsersTracked = Object.keys(allStatus).length

    for (const recs of Object.values(allStatus)) {
      totalStatusEvents += recs.length
    }

    let dataSizeBytes = 0
    try {
      const p1 = this.getStatusFilePath(accountId)
      if (fs.existsSync(p1)) dataSizeBytes += fs.statSync(p1).size
      const p2 = this.getChangesFilePath(accountId)
      if (fs.existsSync(p2)) dataSizeBytes += fs.statSync(p2).size
      const p3 = this.getSnapshotsFilePath(accountId)
      if (fs.existsSync(p3)) dataSizeBytes += fs.statSync(p3).size
    } catch (_) {}

    return {
      totalEvents: allChanges.length,
      totalSessions: totalStatusEvents,
      totalUsersTracked,
      dataSizeBytes,
    }
  }
}
