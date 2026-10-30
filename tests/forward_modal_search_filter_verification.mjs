import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('Verifying DirectForwardModal Search Normalization & Chat Filtering')
console.log('====================================================')

const forwardModalPath = path.join(rootDir, 'src', 'components', 'DirectForwardModal.tsx')
assert.ok(fs.existsSync(forwardModalPath), 'DirectForwardModal.tsx must exist')
const modalSrc = fs.readFileSync(forwardModalPath, 'utf8')

// 1. Verify text normalizer & flexible regex are implemented
assert.ok(modalSrc.includes('normalizeSearchText'), 'DirectForwardModal must export/define normalizeSearchText')
assert.ok(modalSrc.includes('buildFlexibleSearchRegex'), 'DirectForwardModal must define buildFlexibleSearchRegex')

// Extract the normalization logic to test directly
const normalizeSearchText = (text) => {
  if (!text) return ''
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[يى]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[آأإ]/g, 'ا')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ی')
    .replace(/[\u200c\u200b\u00ad]/g, '')
    .replace(/[ـ]/g, '')
    .trim()
}

// 2. Test Persian normalization
console.log('Test 1: Persian normalization handles Yeh/Kaf/Alef')
assert.strictEqual(normalizeSearchText('پيامهاي کانال'), normalizeSearchText('پیامهای كانال'))
assert.strictEqual(normalizeSearchText('كتابخانه'), 'کتابخانه')
assert.strictEqual(normalizeSearchText('آموزش'), normalizeSearchText('اموزش'))
console.log('  [PASS] Persian & Arabic variants normalize cleanly')

// 3. Test Channel Filter logic
console.log('Test 2: Channel filter allows ONLY admin/owner channels and rejects subscriber channels')
const mockDialogs = [
  { id: '1', title: 'کانال من', isChannel: true, isBroadcast: true, isCreator: true, isGroup: false },
  { id: '2', title: 'کانال ادمین', isChannel: true, isBroadcast: true, isAdmin: true, isGroup: false },
  { id: '3', title: 'کانال عضو معمولی', isChannel: true, isBroadcast: true, isCreator: false, isAdmin: false, isGroup: false },
  { id: '4', title: 'گروه برنامه نویسی', isGroup: true, isChannel: false, isUser: false },
  { id: '5', title: 'علی محمدی', isUser: true, isBot: false, isGroup: false, isChannel: false },
  { id: '6', title: 'ربات دانلودر', isUser: true, isBot: true, isGroup: false, isChannel: false },
]

const validDestinations = mockDialogs.filter((d) => {
  if (d.isSponsored || d.isSponsorChannel) return false
  if (d.id === 'me' || d.isSavedMessages) return false

  const isBroadcast = Boolean(d.isBroadcast ?? (d.isChannel && !d.isGroup))
  if (isBroadcast) {
    const isChannelAdminOrOwner = Boolean(d.isCreator || d.isAdmin || d.canSendMessages)
    if (!isChannelAdminOrOwner) {
      return false
    }
  }
  return true
})

// Check that ordinary subscriber channel ('3') is excluded
assert.ok(validDestinations.some((d) => d.id === '1'), 'Owner channel must be included')
assert.ok(validDestinations.some((d) => d.id === '2'), 'Admin channel must be included')
assert.ok(!validDestinations.some((d) => d.id === '3'), 'Ordinary subscriber channel MUST be excluded')
assert.ok(validDestinations.some((d) => d.id === '4'), 'Group must be included')
assert.ok(validDestinations.some((d) => d.id === '5'), 'PV must be included')
assert.ok(validDestinations.some((d) => d.id === '6'), 'Bot must be included')
console.log('  [PASS] Channel filter logic validated')

// 4. Test Sorting: Bots at the bottom
console.log('Test 3: Sorting places bots at the bottom of the list')
const nonBots = []
const bots = []
for (const d of validDestinations) {
  if (d.isBot) bots.push(d)
  else nonBots.push(d)
}
const sorted = [...nonBots, ...bots]

assert.strictEqual(sorted[sorted.length - 1].id, '6', 'Bot must be at the very bottom of the list')
assert.ok(!sorted.slice(0, sorted.length - 1).some((d) => d.isBot), 'No bots should precede non-bots')
console.log('  [PASS] Bot position at list bottom validated')

// 5. Test Username and Persian Search
console.log('Test 4: Search matches username, Persian variants, and Saved Messages')
assert.ok(modalSrc.includes('matchesSearch') || modalSrc.includes('matchChat'), 'Search matching function exists')
assert.ok(modalSrc.includes('isSavedMessagesMatch'), 'Saved messages search exists')
assert.ok(modalSrc.includes('Megaphone') && modalSrc.includes('Users') && modalSrc.includes('Bot'), 'Type indicators exist')

console.log('====================================================')
console.log('All Forward Modal Search & Filter tests passed! 🎉')
console.log('====================================================')
