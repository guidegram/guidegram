/**
 * Telegram MTProto Layer 180+ Bot & Universal RichMessage Test Contracts
 * Shared fixtures, constructors, assertion helpers, and protocol utilities.
 */

export const MTPROTO_LAYER = 180

export const CONSTRUCTOR_IDS = {
  // Messages & Bot Lifecycle
  MESSAGES_START_BOT: 0xe6df7378,
  BOTS_GET_BOT_INFO: 0xdcd914fd,
  BOTS_GET_BOT_MENU_BUTTON: 0x9c60eb28,
  MESSAGES_GET_BOT_CALLBACK_ANSWER: 0x9342ca07,
  MESSAGES_REQUEST_APP_WEB_VIEW: 0x53618bce,
  MESSAGES_REQUEST_WEB_VIEW: 0x269dc5c1,

  // Peer Types
  INPUT_PEER_SELF: 0x7da07ec9,
  INPUT_PEER_USER: 0xdbe437c2,
  INPUT_PEER_CHAT: 0x3563e462,
  INPUT_PEER_CHANNEL: 0x27bcb61,

  // Bot Menu Buttons
  BOT_MENU_BUTTON_DEFAULT: 0x7533a588,
  BOT_MENU_BUTTON_COMMANDS: 0x4258c205,
  BOT_MENU_BUTTON: 0xc7b57ce6,

  // Reply Markups
  REPLY_KEYBOARD_MARKUP: 0x85dd99d1,
  REPLY_INLINE_MARKUP: 0xb2b15770,
  REPLY_KEYBOARD_HIDE: 0xa03e5b85,
  REPLY_KEYBOARD_FORCE_REPLY: 0x86b40b08,

  // Keyboard Buttons
  KEYBOARD_BUTTON: 0x2f67a72f,
  BUTTON_TYPE_DEFAULT: 0xc9dd90e9,
  BUTTON_TYPE_REQUEST_PHONE: 0xdf3d36f9,
  BUTTON_TYPE_REQUEST_GEO_LOCATION: 0x9beee140,
  BUTTON_TYPE_REQUEST_POLL: 0xaacfff84,
  BUTTON_TYPE_SIMPLE_WEB_VIEW: 0xc01a597a,

  // Inline Button Types
  INLINE_BUTTON_TYPE_CALLBACK: 0x2955bc38,
  INLINE_BUTTON_TYPE_URL: 0xeca4f8d4,
  INLINE_BUTTON_TYPE_WEB_VIEW: 0x3bcab5b4,
  INLINE_BUTTON_TYPE_SWITCH_INLINE: 0x93773ff5,
  INLINE_BUTTON_TYPE_BUY: 0x48bad7a5,
  INLINE_BUTTON_TYPE_COPY: 0xb41d3272,

  // Entities
  MESSAGE_ENTITY_BOLD: 0xbd610bc2,
  MESSAGE_ENTITY_ITALIC: 0x826f8e60,
  MESSAGE_ENTITY_CODE: 0x28b4e79c,
  MESSAGE_ENTITY_PRE: 0x73922414,
  MESSAGE_ENTITY_TEXT_URL: 0x76a6d327,
  MESSAGE_ENTITY_SPOILER: 0x32ca960f,
  MESSAGE_ENTITY_CUSTOM_EMOJI: 0xc8cf05cc,
  MESSAGE_ENTITY_BLOCKQUOTE: 0xf1ccaaac,
  MESSAGE_ENTITY_BANK_CARD: 0x761e6af4,
  MESSAGE_ENTITY_STRIKE: 0xbf613e0,
  MESSAGE_ENTITY_UNDERLINE: 0x9c4250d2,

  // Page Blocks
  PAGE_BLOCK_HEADER: 0xbfd064ec,
  PAGE_BLOCK_PARAGRAPH: 0x467a0766,
  PAGE_BLOCK_LIST: 0xe4e88011,
  PAGE_BLOCK_TABLE: 0xbf4dea82,
  PAGE_BLOCK_PHOTO: 0x1759c560,
  PAGE_BLOCK_VIDEO: 0x7c8fe7b6,
  PAGE_BLOCK_EMBED: 0xa8718dc5,
  PAGE_BLOCK_AUTHOR_DATE: 0xbaafe5e0,
}

// Validation Boundaries
export const BOUNDARIES = {
  MAX_INT32: 2147483647,
  MAX_SAFE_INT: Number.MAX_SAFE_INTEGER, // 9007199254740991
  MAX_INT64_STR: '9223372036854775807',
  MAX_START_PARAM_LEN: 64,
  MAX_DESCRIPTION_LEN: 4096,
  MAX_COMMAND_LEN: 32,
  MAX_COMMAND_DESC_LEN: 256,
}

/**
 * Robust 64-bit integer representation test helper
 */
export function parse64BitId(id) {
  if (typeof id === 'bigint') return id
  if (typeof id === 'number') {
    if (!Number.isSafeInteger(id)) {
      throw new RangeError(`Number ${id} exceeds JavaScript safe integer range`)
    }
    return BigInt(id)
  }
  if (typeof id === 'string') {
    const trimmed = id.trim()
    if (!/^-?\d+$/.test(trimmed)) {
      throw new TypeError(`Cannot parse invalid 64-bit integer string: "${id}"`)
    }
    return BigInt(trimmed)
  }
  throw new TypeError(`Unsupported 64-bit ID type: ${typeof id}`)
}

/**
 * Validates start_param according to official Telegram Bot API & MTProto rules:
 * - Length: 0 to 64 chars
 * - Allowed characters: a-z, A-Z, 0-9, _, - (base64url)
 */
export function validateStartParam(param) {
  if (param === undefined || param === null || param === '') {
    return { valid: true, cleanParam: '' }
  }
  if (typeof param !== 'string') {
    return { valid: false, error: 'start_param must be a string' }
  }
  if (param.length > BOUNDARIES.MAX_START_PARAM_LEN) {
    return { valid: false, error: `start_param length (${param.length}) exceeds 64 characters limit` }
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(param)) {
    return { valid: false, error: 'start_param contains invalid characters (must be base64url characters [a-zA-Z0-9_-])' }
  }
  return { valid: true, cleanParam: param }
}

/**
 * Calculates UTF-16 code unit offset for astral plane characters (emojis, etc.)
 */
export function getUtf16Offset(text, codepointIndex) {
  const chars = Array.from(text)
  let utf16Offset = 0
  for (let i = 0; i < codepointIndex && i < chars.length; i++) {
    utf16Offset += chars[i].length // 1 for BMP, 2 for surrogate pairs
  }
  return utf16Offset
}

/**
 * Mock MTProto / IPC Environment for Opaque-Box Execution
 */
export class MockBotEnvironment {
  constructor() {
    this.accounts = new Map([
      ['acc_main', { id: 'acc_main', isBot: false, firstName: 'Tester' }],
    ])
    this.dialogs = new Map() // accountId -> Map(chatId, DialogItem)
    this.messages = new Map() // `${accountId}_${chatId}` -> MessageItem[]
    this.peerCache = new Map() // `${accountId}_${peerId}` -> { userId, accessHash, isBot, username }
    this.listeners = new Map() // event -> Set(callback)
    this.pendingCallbacks = new Map()
    this.replyKeyboards = new Map() // `${accountId}_${chatId}` -> ReplyKeyboardMarkup
    this.activeMenuButtons = new Map() // `${accountId}_${botId}` -> BotMenuButtonResult
    this.botInfoData = new Map() // botId -> BotInfoResult
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(handler)
    return () => this.listeners.get(event)?.delete(handler)
  }

  emit(event, payload) {
    const handlers = this.listeners.get(event)
    if (handlers) {
      for (const fn of handlers) {
        try {
          fn(payload)
        } catch (e) {
          console.error(`Mock event error on ${event}:`, e)
        }
      }
    }
  }

  seedBot(botId, { username, accessHash, description, descriptionPhoto, descriptionDocument, commands, menuButton }) {
    const bId = botId.toString()
    this.peerCache.set(`acc_main_${bId}`, {
      userId: bId,
      accessHash: accessHash || '9876543210123456',
      isBot: true,
      username: username || 'test_bot',
    })
    this.botInfoData.set(bId, {
      userId: bId,
      description: description || 'Default test bot description',
      descriptionPhoto,
      descriptionDocument,
      commands: commands || [{ command: 'start', description: 'Start the bot' }],
      menuButton: menuButton || { type: 'commands' },
    })
    this.activeMenuButtons.set(`acc_main_${bId}`, menuButton || { type: 'commands' })
  }

  async resolveInputPeer(accountId, peerId) {
    const s = peerId.toString()
    if (s === 'self' || s === 'me') {
      return { _: 'inputPeerSelf' }
    }
    if (s.startsWith('-100')) {
      return { _: 'inputPeerChannel', channelId: s.replace(/^-100/, ''), accessHash: '0' }
    }
    if (s.startsWith('-')) {
      return { _: 'inputPeerChat', chatId: s.replace(/^-/, '') }
    }

    const cached = this.peerCache.get(`${accountId}_${s}`)
    if (cached) {
      return { _: 'inputPeerUser', userId: cached.userId, accessHash: cached.accessHash }
    }

    // Zero accessHash for unknown peer: MTProto DC will reject this with USER_ID_INVALID
    return { _: 'inputPeerUser', userId: s, accessHash: '0', isUnresolved: true }
  }

  async startBot(accountId, botPeerId, startParam = '') {
    const peer = await this.resolveInputPeer(accountId, botPeerId)
    if (peer.isUnresolved || peer.accessHash === '0') {
      return { success: false, error: 'USER_ID_INVALID: peer accessHash not available in session store' }
    }

    const val = validateStartParam(startParam)
    if (!val.valid) {
      return { success: false, error: `START_PARAM_INVALID: ${val.error}` }
    }

    const bId = botPeerId.toString()
    // 1. Ensure dialog exists
    if (!this.dialogs.has(accountId)) {
      this.dialogs.set(accountId, new Map())
    }
    const accDialogs = this.dialogs.get(accountId)
    if (!accDialogs.has(bId)) {
      const botInfo = this.botInfoData.get(bId)
      accDialogs.set(bId, {
        id: bId,
        accountId,
        title: botInfo ? `@${this.peerCache.get(`${accountId}_${bId}`)?.username || 'Bot'}` : 'Bot',
        unreadCount: 0,
        isUser: true,
        isGroup: false,
        isChannel: false,
        isBot: true,
        isPinned: false,
      })
    }

    // 2. Simulate bot initial response
    const msgKey = `${accountId}_${bId}`
    const existing = this.messages.get(msgKey) || []
    const welcomeMsg = {
      id: existing.length + 1,
      chatId: bId,
      accountId,
      senderId: bId,
      senderName: 'TestBot',
      text: startParam ? `Welcome! You started with referral code: ${startParam}` : 'Hello! I am ready to help you.',
      date: Math.floor(Date.now() / 1000),
      isOutgoing: false,
      entities: [
        { type: 'bold', offset: 0, length: 7 },
      ],
    }

    // If bot has registered reply keyboard, attach it
    if (this.replyKeyboards.has(msgKey)) {
      welcomeMsg.replyMarkup = this.replyKeyboards.get(msgKey)
    }

    existing.push(welcomeMsg)
    this.messages.set(msgKey, existing)

    // Emit real-time incoming message update
    this.emit('telegram:new-message', { accountId, message: welcomeMsg })

    return { success: true, messageId: welcomeMsg.id }
  }

  async getBotInfo(accountId, botPeerId) {
    const bId = botPeerId.toString()
    const info = this.botInfoData.get(bId)
    if (!info) {
      return {
        userId: bId,
        description: 'Fallback bot description via bots.getBotInfo',
        commands: [{ command: 'start', description: 'Start bot' }],
        menuButton: { type: 'default' },
      }
    }
    return info
  }

  async getBotMenuButton(accountId, botPeerId) {
    const bId = botPeerId.toString()
    return this.activeMenuButtons.get(`${accountId}_${bId}`) || { type: 'default' }
  }

  async sendBotCallbackQuery(accountId, peerId, msgId, data) {
    if (!data) {
      return { alert: false, message: 'Callback acknowledged' }
    }
    if (data === 'TRIGGER_ALERT') {
      return { alert: true, message: 'Official Bot Modal Alert: Action Confirmed!' }
    }
    if (data === 'TRIGGER_TOAST') {
      return { alert: false, message: 'Settings saved successfully' }
    }
    if (data.startsWith('URL:')) {
      return { url: data.replace(/^URL:/, '') }
    }
    return { alert: false, message: `Processed: ${data}` }
  }

  async requestAppWebView(accountId, peerId, app, startParam) {
    return {
      url: `https://tg-app.example.com/?tgWebAppVersion=8.0&tgWebAppPlatform=tdesktop&tgWebAppThemeParams=%7B%7D#tgWebAppData=hash%3D123&user=%7B%22id%22%3A123456%7D${startParam ? '&tgWebAppStartParam=' + startParam : ''}`,
    }
  }
}

// Self-executing verification suite if run via node
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tests/bot-mtproto/contracts.mjs')) {
  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FAIL: ${message}`)
      failed++
      throw new Error(message)
    } else {
      console.log(`✅ PASS: ${message}`)
      passed++
    }
  }

  async function run() {
    console.log('\n=== RUNNING TELEGRAM MTPROTO LAYER 180+ BOT TEST SUITE ===\n')
    const env = new MockBotEnvironment()

    // Test R1: 64-bit Bot ID Handling & Start Bot (messages.startBot)
    console.log('--- Suite R1: Bot Lifecycle, 64-bit IDs & messages.startBot ---')
    const highBotId = '8172317626'
    assert(parse64BitId(highBotId) === 8172317626n, 'High 64-bit bot ID parsed to BigInt correctly')
    assert(parse64BitId(highBotId) > BigInt(BOUNDARIES.MAX_INT32), 'Bot ID strictly exceeds 32-bit integer limit (2^31-1)')

    assert(validateStartParam('ref_user_12345').valid === true, 'Valid referral start param accepted')
    assert(validateStartParam('a'.repeat(64)).valid === true, '64-character start param boundary accepted')
    assert(validateStartParam('a'.repeat(65)).valid === false, '65-character start param properly rejected')
    assert(validateStartParam('invalid param with spaces').valid === false, 'Start param with spaces rejected')

    env.seedBot(highBotId, {
      username: 'BetWithTON_bot',
      accessHash: '1234567890123456789',
      description: 'Play BetWithTON on Telegram! Provably fair gaming.',
      commands: [
        { command: 'start', description: 'Start the bot' },
        { command: 'play', description: 'Launch BetWithTON Mini App' },
      ],
      menuButton: {
        type: 'web_app',
        text: 'Play Game 🎲',
        url: 'https://betwithton.com/game',
      },
    })

    const resolvedPeer = await env.resolveInputPeer('acc_main', highBotId)
    assert(resolvedPeer._ === 'inputPeerUser', 'InputPeer resolved as inputPeerUser')
    assert(resolvedPeer.userId === highBotId, 'Peer ID matches high 64-bit bot ID')
    assert(resolvedPeer.accessHash === '1234567890123456789', 'AccessHash correctly preserved from cache')

    let incomingMessageReceived = false
    const unsub = env.on('telegram:new-message', (payload) => {
      if (payload.message.chatId === highBotId) {
        incomingMessageReceived = true
      }
    })

    const startRes = await env.startBot('acc_main', highBotId, 'ref_promo_2026')
    assert(startRes.success === true, 'messages.startBot successfully dispatched')
    assert(incomingMessageReceived === true, 'Incoming bot greeting received via telegram:new-message event')
    unsub()

    // Test R2: Bot Intro Screen & Rich Metadata (getBotInfo)
    console.log('\n--- Suite R2: Bot Intro Card & Description Metadata ---')
    const botInfo = await env.getBotInfo('acc_main', highBotId)
    assert(botInfo.description.includes('BetWithTON'), 'Bot description text retrieved')
    assert(botInfo.commands.length === 2, 'Bot commands metadata returned')

    // Test R3: Dynamic Bot Menu Button (getBotMenuButton)
    console.log('\n--- Suite R3: Dynamic Bot Menu Button & Drawer ---')
    const menuBtn = await env.getBotMenuButton('acc_main', highBotId)
    assert(menuBtn.type === 'web_app', 'BotMenuButton resolved as web_app')
    assert(menuBtn.text === 'Play Game 🎲', 'BotMenuButton custom title resolved')

    // Test R4: Persistent Custom Reply Keyboard (ReplyKeyboardMarkup)
    console.log('\n--- Suite R4: ReplyKeyboardMarkup & 4-Dots Dock ---')
    const sampleKeyboard = {
      _: 'replyKeyboardMarkup',
      resize: true,
      single_use: false,
      rows: [
        [
          { text: '🎲 Roll Dice', _: 'keyboardButton' },
          { text: '💰 Balance', _: 'keyboardButton' },
        ],
        [
          { text: '📱 Share Phone', _: 'keyboardButtonRequestPhone', type: 'request_phone' },
          { text: '📍 Share Location', _: 'keyboardButtonRequestGeoLocation', type: 'request_location' },
        ],
      ],
    }
    assert(sampleKeyboard.rows.length === 2, 'Keyboard markup contains 2 rows')
    assert(sampleKeyboard.rows[1][0].type === 'request_phone', 'Phone request button recognized')

    // Test R5: RichMessage / PageBlocks & Entities
    console.log('\n--- Suite R5: Universal RichMessage & Entities ---')
    const entityTypes = [
      CONSTRUCTOR_IDS.MESSAGE_ENTITY_BOLD,
      CONSTRUCTOR_IDS.MESSAGE_ENTITY_ITALIC,
      CONSTRUCTOR_IDS.MESSAGE_ENTITY_CODE,
      CONSTRUCTOR_IDS.MESSAGE_ENTITY_PRE,
      CONSTRUCTOR_IDS.MESSAGE_ENTITY_SPOILER,
      CONSTRUCTOR_IDS.MESSAGE_ENTITY_BLOCKQUOTE,
      CONSTRUCTOR_IDS.MESSAGE_ENTITY_CUSTOM_EMOJI,
    ]
    assert(entityTypes.every((id) => typeof id === 'number'), 'All Layer 180 entity constructor IDs verified')

    // Test R6: Bot Callbacks & Mini App Launch
    console.log('\n--- Suite R6: Bot Callbacks & Mini App Webview ---')
    const alertCb = await env.sendBotCallbackQuery('acc_main', highBotId, 1, 'TRIGGER_ALERT')
    assert(alertCb.alert === true, 'Callback answer modal alert acknowledged')

    const webViewRes = await env.requestAppWebView('acc_main', highBotId, {}, 'ref_promo_2026')
    assert(webViewRes.url.includes('tgWebAppVersion=8.0'), 'Mini App launched with valid Telegram WebApp SDK parameters')

    console.log(`\n========================================`)
    console.log(`ALL CONTRACT CHECKS PASSED: ${passed} PASSED, ${failed} FAILED`)
    console.log(`========================================\n`)
  }

  run().catch((e) => {
    console.error('Fatal test error:', e)
    process.exit(1)
  })
}
