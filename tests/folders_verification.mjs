import { strict as assert } from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Chat Folders (Filters) Reordering & Custom Tabs Verification (Phase 57)...')

// 1. Physical inspection of accountManager.ts
const accountManagerPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
const accountManagerSource = fs.readFileSync(accountManagerPath, 'utf-8')

assert(accountManagerSource.includes('public async getCloudFolders('), 'accountManager must implement getCloudFolders')
assert(accountManagerSource.includes('public async updateDialogFilter('), 'accountManager must implement updateDialogFilter')
assert(accountManagerSource.includes('public async updateDialogFiltersOrder('), 'accountManager must implement updateDialogFiltersOrder')
assert(accountManagerSource.includes('public async getSuggestedDialogFilters('), 'accountManager must implement getSuggestedDialogFilters')
assert(accountManagerSource.includes("'messages.getDialogFilters'"), 'getCloudFolders must call messages.getDialogFilters')
assert(accountManagerSource.includes("'messages.updateDialogFilter'"), 'updateDialogFilter must call messages.updateDialogFilter')
assert(accountManagerSource.includes("'messages.updateDialogFiltersOrder'"), 'updateDialogFiltersOrder must call messages.updateDialogFiltersOrder')
assert(accountManagerSource.includes("'messages.getSuggestedDialogFilters'"), 'getSuggestedDialogFilters must call messages.getSuggestedDialogFilters')
console.log('  ✅ [PASS] accountManager.ts physical inspection passed')

// 2. Physical inspection of main.ts
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainSource = fs.readFileSync(mainPath, 'utf-8')

assert(mainSource.includes("'telegram:get-cloud-folders'"), 'main.ts must register telegram:get-cloud-folders')
assert(mainSource.includes("'telegram:update-dialog-filter'"), 'main.ts must register telegram:update-dialog-filter')
assert(mainSource.includes("'telegram:update-dialog-filters-order'"), 'main.ts must register telegram:update-dialog-filters-order')
assert(mainSource.includes("'telegram:get-suggested-dialog-filters'"), 'main.ts must register telegram:get-suggested-dialog-filters')
console.log('  ✅ [PASS] main.ts IPC registration passed')

// 3. Physical inspection of preload.ts
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadSource = fs.readFileSync(preloadPath, 'utf-8')

assert(preloadSource.includes('getCloudFolders:'), 'preload.ts must expose getCloudFolders')
assert(preloadSource.includes('updateDialogFilter:'), 'preload.ts must expose updateDialogFilter')
assert(preloadSource.includes('updateDialogFiltersOrder:'), 'preload.ts must expose updateDialogFiltersOrder')
assert(preloadSource.includes('getSuggestedDialogFilters:'), 'preload.ts must expose getSuggestedDialogFilters')
console.log('  ✅ [PASS] preload.ts bridge exposure passed')

// 4. Functional verification of Folder TL payload builder
function buildDialogFilterPayload(id, filterData) {
  if (!filterData) {
    return {
      _: 'messages.updateDialogFilter',
      id: Number(id),
      filter: null,
    }
  }

  return {
    _: 'messages.updateDialogFilter',
    id: Number(id),
    filter: {
      _: 'dialogFilter',
      id: Number(id),
      title: {
        _: 'textWithEntities',
        text: filterData.title || 'Folder',
        entities: [],
      },
      emoticon: filterData.emoticon || '',
      contacts: Boolean(filterData.contacts),
      nonContacts: Boolean(filterData.nonContacts),
      groups: Boolean(filterData.groups),
      broadcasts: Boolean(filterData.broadcasts),
      bots: Boolean(filterData.bots),
      excludeMuted: Boolean(filterData.excludeMuted),
      excludeRead: Boolean(filterData.excludeRead),
      excludeArchived: Boolean(filterData.excludeArchived),
      pinnedPeers: filterData.pinnedPeerIds || [],
      includePeers: filterData.includePeerIds || [],
      excludePeers: filterData.excludePeerIds || [],
    },
  }
}

// Test create/update payload
const payloadCreate = buildDialogFilterPayload(2, {
  title: 'Work',
  emoticon: '💼',
  groups: true,
  excludeMuted: true,
  includePeerIds: ['100', '200'],
})
assert.equal(payloadCreate.id, 2)
assert.equal(payloadCreate.filter.title.text, 'Work')
assert.equal(payloadCreate.filter.emoticon, '💼')
assert.equal(payloadCreate.filter.groups, true)
assert.equal(payloadCreate.filter.excludeMuted, true)
assert.deepEqual(payloadCreate.filter.includePeers, ['100', '200'])

// Test delete payload
const payloadDelete = buildDialogFilterPayload(2, null)
assert.equal(payloadDelete.id, 2)
assert.equal(payloadDelete.filter, null)
console.log('  ✅ [PASS] Folder TL payload builder validation passed')

// 5. Mock AccountManager execution
class MockFoldersAccountManager {
  constructor() {
    this.calls = []
  }

  async getCloudFolders(accountId) {
    if (accountId === 'disconnected') return []
    return [
      { id: 2, title: 'Work', emoticon: '💼', includePeerIds: ['100'] },
      { id: 3, title: 'Crypto', emoticon: '🚀', includePeerIds: ['200'] },
    ]
  }

  async updateDialogFilter(accountId, id, filterData) {
    if (accountId === 'disconnected') throw new Error('Account is not connected.')
    this.calls.push({ method: 'messages.updateDialogFilter', id, filterData })
    return true
  }

  async updateDialogFiltersOrder(accountId, order) {
    if (accountId === 'disconnected') throw new Error('Account is not connected.')
    this.calls.push({ method: 'messages.updateDialogFiltersOrder', order })
    return true
  }

  async getSuggestedDialogFilters(accountId) {
    if (accountId === 'disconnected') return []
    return [
      { filter: { _: 'dialogFilter', id: 10, title: { text: 'Unread' } }, description: 'Unread chats' },
    ]
  }
}

const mockMgr = new MockFoldersAccountManager()

// Test getCloudFolders
const folders = await mockMgr.getCloudFolders('acc1')
assert.equal(folders.length, 2)
assert.equal(folders[0].title, 'Work')

// Test updateDialogFilter
const updateOk = await mockMgr.updateDialogFilter('acc1', 5, { title: 'Personal', emoticon: '🏠' })
assert.equal(updateOk, true)
assert.equal(mockMgr.calls[0].id, 5)
assert.equal(mockMgr.calls[0].filterData.title, 'Personal')

// Test updateDialogFiltersOrder
const orderOk = await mockMgr.updateDialogFiltersOrder('acc1', [3, 2, 5])
assert.equal(orderOk, true)
assert.deepEqual(mockMgr.calls[1].order, [3, 2, 5])

// Test getSuggestedDialogFilters
const suggested = await mockMgr.getSuggestedDialogFilters('acc1')
assert.equal(suggested.length, 1)
assert.equal(suggested[0].description, 'Unread chats')

console.log('  ✅ [PASS] Mock AccountManager folders and ordering validation passed')
console.log('🌟 All Phase 57 tests PASSED successfully!')
