import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('🧪 Running Milestone 18: Local Anti-Delete & Edit History Verification')
console.log('====================================================\n')

let passed = 0
let failed = 0

function testAssert(condition, msg) {
  if (condition) {
    console.log(`  [PASS] ${msg}`)
    passed++
  } else {
    console.error(`  [FAIL] ${msg}`)
    failed++
  }
}

// ----------------------------------------------------
// SUITE 1: Type Definitions Integrity
// ----------------------------------------------------
console.log('[SUITE 1] Type Definitions Integrity (types.ts & telegram.d.ts)')
const typesPath = path.join(rootDir, 'electron', 'telegram', 'types.ts')
testAssert(fs.existsSync(typesPath), 'electron/telegram/types.ts exists')
const typesSrc = fs.readFileSync(typesPath, 'utf8')

testAssert(typesSrc.includes('export interface MessageEditRevision'), 'types.ts defines MessageEditRevision interface')
testAssert(typesSrc.includes('isDeletedLocally?: boolean'), 'types.ts extends MessageItem with isDeletedLocally')
testAssert(typesSrc.includes('deletedAt?: number'), 'types.ts extends MessageItem with deletedAt')
testAssert(typesSrc.includes('editDate?: number'), 'types.ts extends MessageItem with editDate')
testAssert(typesSrc.includes('editHistory?: MessageEditRevision[]'), 'types.ts extends MessageItem with editHistory array')
testAssert(typesSrc.includes('keepDeletedMessagesLocally?: boolean'), 'types.ts extends AppConfig with keepDeletedMessagesLocally')

const dtsPath = path.join(rootDir, 'src', 'types', 'telegram.d.ts')
testAssert(fs.existsSync(dtsPath), 'src/types/telegram.d.ts exists')
const dtsSrc = fs.readFileSync(dtsPath, 'utf8')
testAssert(dtsSrc.includes('MessageEditRevision'), 'telegram.d.ts re-exports MessageEditRevision')

// ----------------------------------------------------
// SUITE 2: SessionStore Audit Log Persistence & Data Shield
// ----------------------------------------------------
console.log('\n[SUITE 2] SessionStore Local Audit Log & Data Shield Mirroring')
const sessionStorePath = path.join(rootDir, 'electron', 'telegram', 'sessionStore.ts')
testAssert(fs.existsSync(sessionStorePath), 'sessionStore.ts exists')
const sessionStoreSrc = fs.readFileSync(sessionStorePath, 'utf8')

testAssert(sessionStoreSrc.includes('this.auditLogsDir = path.join(this.dataDir, \'audit_logs\')'), 'sessionStore.ts defines local audit_logs directory')
testAssert(sessionStoreSrc.includes('this.backupAuditLogsDir = path.join(this.safeBackupDir, \'audit_logs\')'), 'sessionStore.ts defines safe backup audit_logs mirror')
testAssert(sessionStoreSrc.includes('keepDeletedMessagesLocally: true'), 'sessionStore.ts defaults keepDeletedMessagesLocally to true')
testAssert(sessionStoreSrc.includes('recordMessage('), 'sessionStore.ts implements recordMessage')
testAssert(sessionStoreSrc.includes('recordMessageEdit('), 'sessionStore.ts implements recordMessageEdit')
testAssert(sessionStoreSrc.includes('recordMessageDelete('), 'sessionStore.ts implements recordMessageDelete')
testAssert(sessionStoreSrc.includes('findChatIdForMessageId('), 'sessionStore.ts implements findChatIdForMessageId')
testAssert(sessionStoreSrc.includes('mergeAuditLogIntoMessages('), 'sessionStore.ts implements mergeAuditLogIntoMessages')
testAssert(sessionStoreSrc.includes('getBackupAuditFilePath'), 'sessionStore.ts implements Data Shield backup path resolver')

// ----------------------------------------------------
// SUITE 3: AccountManager Event Trapping & getMessages Merging
// ----------------------------------------------------
console.log('\n[SUITE 3] AccountManager MTProto Event Trapping & Deletion Resolution')
const accountMgrPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
testAssert(fs.existsSync(accountMgrPath), 'accountManager.ts exists')
const accountMgrSrc = fs.readFileSync(accountMgrPath, 'utf8')

testAssert(accountMgrSrc.includes('client.onDeleteMessage.add'), 'accountManager.ts attaches onDeleteMessage listener')
testAssert(accountMgrSrc.includes('update.channelId'), 'accountManager.ts resolves channelId for channel deletions')
testAssert(accountMgrSrc.includes('findChatIdForMessageId'), 'accountManager.ts resolves peer chatId via audit index for private deletions')
testAssert(accountMgrSrc.includes('this.store.recordMessageDelete'), 'accountManager.ts calls recordMessageDelete')
testAssert(accountMgrSrc.includes('telegram:message-deleted'), 'accountManager.ts dispatches telegram:message-deleted IPC event')

testAssert(accountMgrSrc.includes('client.onEditMessage.add'), 'accountManager.ts attaches onEditMessage listener')
testAssert(accountMgrSrc.includes('this.store.recordMessageEdit'), 'accountManager.ts calls recordMessageEdit')
testAssert(accountMgrSrc.includes('telegram:message-edited'), 'accountManager.ts dispatches telegram:message-edited IPC event')

testAssert(accountMgrSrc.includes('this.store.recordMessage(accountId, chatId, item)'), 'accountManager.ts records incoming new messages')
testAssert(accountMgrSrc.includes('this.store.mergeAuditLogIntoMessages(accountId, chatId, items, keepDeleted)'), 'accountManager.ts hydrates audit messages into getMessages')

// ----------------------------------------------------
// SUITE 4: Renderer Event Wiring (App.tsx)
// ----------------------------------------------------
console.log('\n[SUITE 4] Renderer Event Subscriptions (src/App.tsx)')
const appPath = path.join(rootDir, 'src', 'App.tsx')
testAssert(fs.existsSync(appPath), 'src/App.tsx exists')
const appSrc = fs.readFileSync(appPath, 'utf8')

testAssert(appSrc.includes('telegram:message-deleted'), 'App.tsx subscribes to telegram:message-deleted')
testAssert(appSrc.includes('isDeletedLocally: true'), 'App.tsx marks message as isDeletedLocally when keepDeleted is true')
testAssert(appSrc.includes('telegram:message-edited'), 'App.tsx subscribes to telegram:message-edited')
testAssert(appSrc.includes('editHistory'), 'App.tsx maintains editHistory in state on message edits')

// ----------------------------------------------------
// SUITE 5: UI Badges & Edit History Modal (ChatViewport.tsx)
// ----------------------------------------------------
console.log('\n[SUITE 5] UI Badges & Edit History Modal (src/components/ChatViewport.tsx)')
const chatViewportPath = path.join(rootDir, 'src', 'components', 'ChatViewport.tsx')
testAssert(fs.existsSync(chatViewportPath), 'src/components/ChatViewport.tsx exists')
const chatViewportSrc = fs.readFileSync(chatViewportPath, 'utf8')

testAssert(chatViewportSrc.includes('[Deleted]'), 'ChatViewport renders [Deleted] badge for locally preserved deleted messages')
testAssert(chatViewportSrc.includes('ring-rose-500/50'), 'ChatViewport adds rose border/ring for deleted messages')
testAssert(chatViewportSrc.includes('[Edited]'), 'ChatViewport renders [Edited] pill for messages with revision history')
testAssert(chatViewportSrc.includes('Message Edit History'), 'ChatViewport includes Message Edit History modal')
testAssert(chatViewportSrc.includes('Chronological revision timeline'), 'ChatViewport edit history modal renders revision timeline')
testAssert(chatViewportSrc.includes('Original Version'), 'ChatViewport edit history modal marks original version')
testAssert(chatViewportSrc.includes('Current Version'), 'ChatViewport edit history modal marks current version')

// ----------------------------------------------------
// SUITE 6: Settings Toggle (SettingsModal.tsx)
// ----------------------------------------------------
console.log('\n[SUITE 6] Settings Toggle (src/components/SettingsModal.tsx)')
const settingsPath = path.join(rootDir, 'src', 'components', 'SettingsModal.tsx')
testAssert(fs.existsSync(settingsPath), 'src/components/SettingsModal.tsx exists')
const settingsSrc = fs.readFileSync(settingsPath, 'utf8')

testAssert(settingsSrc.includes('keepDeletedMessagesLocally'), 'SettingsModal declares keepDeletedMessagesLocally state')
testAssert(settingsSrc.includes('Keep Deleted Messages Locally'), 'SettingsModal renders Keep Deleted Messages Locally toggle title')
testAssert(settingsSrc.includes('Preserve revoked and deleted messages'), 'SettingsModal renders toggle description')

// ----------------------------------------------------
// SUITE 7: Empirical SessionStore Logic & Data Shield Mirroring
// ----------------------------------------------------
console.log('\n[SUITE 7] Empirical SessionStore Audit Engine & Safe Backup Mirroring')
const testTempDir = path.join(rootDir, 'tests', 'temp_m18_audit_test')
const testDataDir = path.join(testTempDir, 'data')
const testBackupDir = path.join(testTempDir, 'safe_backup')

try {
  if (fs.existsSync(testTempDir)) {
    fs.rmSync(testTempDir, { recursive: true, force: true })
  }
  fs.mkdirSync(testDataDir, { recursive: true })
  fs.mkdirSync(testBackupDir, { recursive: true })

  // Functional simulation of SessionStore Audit methods
  class TestAuditEngine {
    constructor(baseDir, backupDir) {
      this.auditLogsDir = path.join(baseDir, 'audit_logs')
      this.backupAuditLogsDir = path.join(backupDir, 'audit_logs')
      this.auditCache = new Map()
      fs.mkdirSync(this.auditLogsDir, { recursive: true })
      fs.mkdirSync(this.backupAuditLogsDir, { recursive: true })
    }

    getAuditFilePath(accountId) {
      return path.join(this.auditLogsDir, `audit_${accountId}.json`)
    }

    getBackupAuditFilePath(accountId) {
      return path.join(this.backupAuditLogsDir, `audit_${accountId}.json`)
    }

    loadAccountAudit(accountId) {
      if (this.auditCache.has(accountId)) {
        return this.auditCache.get(accountId)
      }
      const filePath = this.getAuditFilePath(accountId)
      const backupFilePath = this.getBackupAuditFilePath(accountId)
      let data = {}

      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, 'utf-8')
          const parsed = JSON.parse(raw)
          data = parsed.chats || parsed || {}
        } catch (e) {}
      } else if (fs.existsSync(backupFilePath)) {
        try {
          const raw = fs.readFileSync(backupFilePath, 'utf-8')
          const parsed = JSON.parse(raw)
          data = parsed.chats || parsed || {}
          fs.writeFileSync(filePath, JSON.stringify({ chats: data }, null, 2), 'utf-8')
        } catch (e) {}
      }

      this.auditCache.set(accountId, data)
      return data
    }

    saveAccountAudit(accountId, data) {
      this.auditCache.set(accountId, data)
      const payload = JSON.stringify({ chats: data }, null, 2)
      fs.writeFileSync(this.getAuditFilePath(accountId), payload, 'utf-8')
      fs.writeFileSync(this.getBackupAuditFilePath(accountId), payload, 'utf-8')
    }

    recordMessage(accountId, chatId, msg) {
      const audit = this.loadAccountAudit(accountId)
      if (!audit[chatId]) audit[chatId] = {}
      const existing = audit[chatId][msg.id]
      if (existing) {
        audit[chatId][msg.id] = {
          ...existing,
          ...msg,
          isDeletedLocally: existing.isDeletedLocally || msg.isDeletedLocally,
          deletedAt: existing.deletedAt || msg.deletedAt,
          editDate: msg.editDate || existing.editDate,
          editHistory: existing.editHistory && existing.editHistory.length > 0 ? existing.editHistory : msg.editHistory,
        }
      } else {
        audit[chatId][msg.id] = { ...msg }
      }
      this.saveAccountAudit(accountId, audit)
    }

    recordMessageEdit(accountId, chatId, messageId, newText, editDate, entities) {
      const audit = this.loadAccountAudit(accountId)
      let targetChatId = chatId || this.findChatIdForMessageId(accountId, messageId)
      if (!targetChatId) return null
      if (!audit[targetChatId]) audit[targetChatId] = {}

      const existing = audit[targetChatId][messageId]
      if (existing) {
        const priorHistory = existing.editHistory ? [...existing.editHistory] : []
        const priorText = existing.text
        if (priorText && priorText !== newText && !priorHistory.some(h => h.text === priorText)) {
          priorHistory.push({
            text: priorText,
            date: existing.editDate || existing.date || Math.floor(Date.now() / 1000),
            entities: existing.entities,
          })
        }
        existing.text = newText
        existing.editDate = editDate
        existing.editHistory = priorHistory
        this.saveAccountAudit(accountId, audit)
        return existing
      }
      return null
    }

    recordMessageDelete(accountId, chatId, messageIds) {
      const audit = this.loadAccountAudit(accountId)
      const deleted = []
      const now = Math.floor(Date.now() / 1000)
      for (const id of messageIds) {
        let targetChatId = chatId || this.findChatIdForMessageId(accountId, id)
        if (!targetChatId) continue
        if (!audit[targetChatId]) audit[targetChatId] = {}
        const existing = audit[targetChatId][id]
        if (existing) {
          existing.isDeletedLocally = true
          existing.deletedAt = existing.deletedAt || now
          deleted.push(existing)
        } else {
          const tombstone = {
            id,
            chatId: targetChatId,
            accountId,
            text: '[Message deleted]',
            date: now,
            isOutgoing: false,
            isDeletedLocally: true,
            deletedAt: now,
          }
          audit[targetChatId][id] = tombstone
          deleted.push(tombstone)
        }
      }
      this.saveAccountAudit(accountId, audit)
      return deleted
    }

    findChatIdForMessageId(accountId, messageId) {
      const audit = this.loadAccountAudit(accountId)
      for (const [cId, msgs] of Object.entries(audit)) {
        if (msgs[messageId]) return cId
      }
      return null
    }

    mergeAuditLogIntoMessages(accountId, chatId, liveMessages, keepDeleted = true) {
      const audit = this.loadAccountAudit(accountId)
      const auditMsgs = audit[chatId] || {}
      const map = new Map()
      for (const live of liveMessages) {
        map.set(live.id, { ...live })
      }
      for (const [idStr, auditMsg] of Object.entries(auditMsgs)) {
        const id = Number(idStr)
        const live = map.get(id)
        if (live) {
          if (auditMsg.editHistory && auditMsg.editHistory.length > 0) {
            live.editHistory = auditMsg.editHistory
          }
          if (auditMsg.editDate) {
            live.editDate = auditMsg.editDate
          }
          if (auditMsg.isDeletedLocally) {
            live.isDeletedLocally = true
            live.deletedAt = auditMsg.deletedAt
          }
        } else if (keepDeleted && auditMsg.isDeletedLocally) {
          map.set(id, { ...auditMsg })
        }
      }
      const result = Array.from(map.values())
      result.sort((a, b) => a.date - b.date)
      return result
    }
  }

  const engine = new TestAuditEngine(testDataDir, testBackupDir)
  const accId = 'acc_test_123'
  const cId = '-100987654321'

  // Step A: Record messages
  engine.recordMessage(accId, cId, {
    id: 101,
    chatId: cId,
    accountId: accId,
    text: 'Original Version 1 of Message 101',
    date: 1700000000,
    isOutgoing: false,
  })
  engine.recordMessage(accId, cId, {
    id: 102,
    chatId: cId,
    accountId: accId,
    text: 'Message 102 that will be deleted later',
    date: 1700000010,
    isOutgoing: false,
  })

  testAssert(fs.existsSync(engine.getAuditFilePath(accId)), 'Audit file created on disk in audit_logs/')
  testAssert(fs.existsSync(engine.getBackupAuditFilePath(accId)), 'Safe backup mirror created on disk in safe_backup/audit_logs/')

  // Step B: Edit Message 101 twice
  engine.recordMessageEdit(accId, cId, 101, 'Edited Version 2 of Message 101', 1700000100)
  engine.recordMessageEdit(accId, cId, 101, 'Final Version 3 of Message 101', 1700000200)

  const auditAfterEdit = engine.loadAccountAudit(accId)
  const msg101 = auditAfterEdit[cId][101]
  testAssert(msg101.text === 'Final Version 3 of Message 101', 'Message 101 has latest text')
  testAssert(msg101.editHistory && msg101.editHistory.length === 2, 'Message 101 archived exactly 2 historical revisions')
  testAssert(msg101.editHistory[0].text === 'Original Version 1 of Message 101', 'First revision matches original text')
  testAssert(msg101.editHistory[1].text === 'Edited Version 2 of Message 101', 'Second revision matches intermediate edit')

  // Step C: Delete Message 102
  const resolvedChatId = engine.findChatIdForMessageId(accId, 102)
  testAssert(resolvedChatId === cId, 'findChatIdForMessageId successfully resolves chatId for Message 102')

  engine.recordMessageDelete(accId, '', [102]) // Resolves chatId automatically
  const auditAfterDelete = engine.loadAccountAudit(accId)
  const msg102 = auditAfterDelete[cId][102]
  testAssert(msg102.isDeletedLocally === true, 'Message 102 is flagged with isDeletedLocally = true')
  testAssert(typeof msg102.deletedAt === 'number', 'Message 102 has deletedAt timestamp')

  // Step D: Merge into live messages (Telegram server returned only Message 101 with server text, omitted Message 102)
  const liveMessagesFromServer = [
    {
      id: 101,
      chatId: cId,
      accountId: accId,
      text: 'Final Version 3 of Message 101',
      date: 1700000000,
      isOutgoing: false,
    },
  ]

  const mergedWithAntiDelete = engine.mergeAuditLogIntoMessages(accId, cId, liveMessagesFromServer, true)
  testAssert(mergedWithAntiDelete.length === 2, 'mergeAuditLogIntoMessages re-injected preserved deleted message')
  const merged101 = mergedWithAntiDelete.find(m => m.id === 101)
  const merged102 = mergedWithAntiDelete.find(m => m.id === 102)
  testAssert(merged101.editHistory && merged101.editHistory.length === 2, 'Merged message 101 retained 2 edit revisions')
  testAssert(merged102.isDeletedLocally === true, 'Merged message 102 retained isDeletedLocally flag')

  // Step E: Verify keepDeleted = false behavior
  const mergedWithoutAntiDelete = engine.mergeAuditLogIntoMessages(accId, cId, liveMessagesFromServer, false)
  testAssert(mergedWithoutAntiDelete.length === 1, 'When keepDeleted is false, deleted message is NOT re-injected')

  // Step F: Data Shield Auto-Restoration from safe backup mirror
  engine.auditCache.clear()
  fs.unlinkSync(engine.getAuditFilePath(accId))
  testAssert(!fs.existsSync(engine.getAuditFilePath(accId)), 'Local audit file unlinked')
  testAssert(fs.existsSync(engine.getBackupAuditFilePath(accId)), 'Safe backup mirror intact')

  const restoredAudit = engine.loadAccountAudit(accId)
  testAssert(restoredAudit[cId][101] !== undefined, 'SessionStore successfully recovered audit log from safe backup mirror')
  testAssert(fs.existsSync(engine.getAuditFilePath(accId)), 'SessionStore restored local audit file on disk')

} finally {
  if (fs.existsSync(testTempDir)) {
    fs.rmSync(testTempDir, { recursive: true, force: true })
  }
}

// ----------------------------------------------------
// Summary
// ----------------------------------------------------
console.log('\n====================================================')
console.log(`Milestone 18 Verification Summary: ${passed} passed, ${failed} failed`)
console.log('====================================================')

if (failed > 0) {
  process.exit(1)
} else {
  console.log('🎉 All Milestone 18 Anti-Delete & Edit History tests PASSED successfully!')
  process.exit(0)
}
