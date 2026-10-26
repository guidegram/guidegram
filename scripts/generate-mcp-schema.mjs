import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const registryPath = path.join(rootDir, 'electron', 'telegram', 'mtprotoRegistry.ts')
const content = fs.readFileSync(registryPath, 'utf8')
const lines = content.split('\n')
const methods = []
let capturing = false

for (const line of lines) {
  if (line.includes('export const ALL_MTPROTO_METHODS = [')) {
    capturing = true
    continue
  }
  if (capturing) {
    if (line.includes('] as const')) {
      break
    }
    const m = line.match(/"([^"]+)"/)
    if (m) {
      methods.push(m[1])
    }
  }
}

console.log('Total methods extracted:', methods.length)

const PARAM_HINTS = {
  'messages.sendMessage': ['peer', 'message', 'replyTo', 'silent', 'noWebpage'],
  'messages.editMessage': ['peer', 'id', 'message'],
  'messages.deleteMessages': ['id', 'revoke'],
  'messages.forwardMessages': ['fromPeer', 'toPeer', 'id', 'dropAuthor', 'silent'],
  'messages.sendMedia': ['peer', 'media', 'message', 'silent'],
  'messages.sendReaction': ['peer', 'msgId', 'reaction', 'big', 'addToRecent'],
  'messages.search': ['peer', 'q', 'filter', 'minDate', 'maxDate', 'offsetId', 'limit'],
  'messages.searchGlobal': ['q', 'filter', 'minDate', 'maxDate', 'offsetRate', 'offsetPeer', 'offsetId', 'limit'],
  'messages.getHistory': ['peer', 'offsetId', 'offsetDate', 'addOffset', 'limit', 'maxId', 'minId'],
  'messages.getDialogs': ['offsetDate', 'offsetId', 'offsetPeer', 'limit', 'hash'],
  'messages.readHistory': ['peer', 'maxId'],
  'messages.updatePinnedMessage': ['peer', 'id', 'silent', 'pmOneside'],
  'messages.sendVote': ['peer', 'msgId', 'options'],
  'messages.getPollResults': ['peer', 'msgId'],
  'channels.getParticipants': ['channel', 'filter', 'offset', 'limit', 'hash'],
  'channels.getAdminLog': ['channel', 'q', 'eventsFilter', 'admins', 'maxId', 'minId', 'limit'],
  'channels.deleteMessages': ['channel', 'id'],
  'channels.exportMessageLink': ['channel', 'id'],
  'channels.inviteToChannel': ['channel', 'users'],
  'premium.getBoostsStatus': ['peer'],
  'premium.applyBoost': ['peer', 'slots'],
  'premium.getBoostsList': ['peer', 'offset', 'limit'],
  'premium.getMyBoosts': [],
  'contacts.getContacts': ['hash'],
  'contacts.search': ['q', 'limit'],
  'contacts.resolveUsername': ['username'],
  'contacts.resolvePhone': ['phone'],
  'stories.sendStory': ['peer', 'media', 'caption', 'privacyRules'],
  'stories.getPeerStories': ['peer'],
  'stories.sendReaction': ['peer', 'storyId', 'reaction'],
}

const KEYWORD_MAP = {
  boost: ['premium.getBoostsStatus', 'premium.applyBoost', 'premium.getBoostsList', 'premium.getMyBoosts'],
  story: ['stories.sendStory', 'stories.getPeerStories', 'stories.sendReaction', 'stories.getAllStories'],
  reaction: ['messages.sendReaction', 'stories.sendReaction', 'messages.getMessagesReactions'],
  poll: ['messages.sendMedia', 'messages.sendVote', 'messages.getPollResults'],
  forum: ['channels.toggleForum', 'channels.createForumTopic', 'channels.getForumTopics'],
  payment: ['payments.getPaymentForm', 'payments.sendPaymentForm', 'payments.getStarsStatus'],
  contact: ['contacts.getContacts', 'contacts.search', 'contacts.resolveUsername', 'contacts.resolvePhone'],
}

const schema = methods.map((m) => {
  const parts = m.split('.')
  const category = parts.length > 1 ? parts[0] : 'core'
  const action = parts.length > 1 ? parts[1] : parts[0]

  let desc = `MTProto ${category} API: ${action}`
  if (category === 'messages') desc = `Telegram messaging method: ${action}`
  else if (category === 'channels') desc = `Channel and supergroup administration method: ${action}`
  else if (category === 'contacts') desc = `Contact list and user directory method: ${action}`
  else if (category === 'premium') desc = `Telegram Premium and channel boosts method: ${action}`
  else if (category === 'stories') desc = `Telegram Stories method: ${action}`
  else if (category === 'stickers') desc = `Stickers and custom emojis method: ${action}`
  else if (category === 'payments') desc = `Telegram Payments & Stars method: ${action}`
  else if (category === 'bots') desc = `Bot API & Mini Apps method: ${action}`
  else if (category === 'account') desc = `Account settings, profile & privacy method: ${action}`
  else if (category === 'photos') desc = `Photo upload & profile pictures method: ${action}`
  else if (category === 'users') desc = `User profile and identity method: ${action}`
  else if (category === 'phone') desc = `Voice and video calls method: ${action}`

  // Append any specific keywords
  const keywords = [category, action.toLowerCase()]
  for (const [kw, list] of Object.entries(KEYWORD_MAP)) {
    if (list.includes(m)) keywords.push(kw)
  }

  return {
    method: m,
    category,
    action,
    description: desc,
    keywords,
    params: PARAM_HINTS[m] || ['peer', 'id', 'flags', 'q'],
  }
})

const targetDir = path.join(rootDir, 'electron', 'mcp', 'data')
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

const targetPath = path.join(targetDir, 'mtprotoSchemaCompact.json')
fs.writeFileSync(targetPath, JSON.stringify(schema, null, 2), 'utf8')
console.log(`Saved schema with ${schema.length} methods to ${targetPath}`)
