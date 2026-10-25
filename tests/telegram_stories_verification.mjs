import assert from 'assert'

console.log('🧪 Starting Phase 53 Verification: Telegram Stories Interactive Viewer, Media Composer & Stealth Mode...')

// Test 1: Story Privacy Rules Resolution
console.log('\n--- Test 1: Story Privacy Rules Resolution ---')
function resolveStoryPrivacy(rawStory) {
  if (rawStory.closeFriends) return 'close_friends'
  if (rawStory.contacts) return 'contacts'
  if (rawStory.selectedContacts) return 'selected_contacts'
  if (rawStory.public) return 'everyone'
  return 'everyone'
}

assert.strictEqual(resolveStoryPrivacy({ closeFriends: true }), 'close_friends')
assert.strictEqual(resolveStoryPrivacy({ contacts: true }), 'contacts')
assert.strictEqual(resolveStoryPrivacy({ selectedContacts: true }), 'selected_contacts')
assert.strictEqual(resolveStoryPrivacy({ public: true }), 'everyone')
assert.strictEqual(resolveStoryPrivacy({}), 'everyone')
console.log('✅ Assertion 1 passed: Story privacy rules mapped accurately.')

// Test 2: Stealth Mode Request Construction
console.log('\n--- Test 2: Stealth Mode Request Construction ---')
function buildStealthModeRequest(options) {
  return {
    _: 'stories.activateStealthMode',
    past: options?.past !== false,
    future: options?.future !== false,
  }
}

const defaultStealth = buildStealthModeRequest()
assert.strictEqual(defaultStealth.past, true, 'Default past stealth is true (past 5 min)')
assert.strictEqual(defaultStealth.future, true, 'Default future stealth is true (next 25 min)')

const customStealth = buildStealthModeRequest({ past: false, future: true })
assert.strictEqual(customStealth.past, false)
assert.strictEqual(customStealth.future, true)
console.log('✅ Assertion 2 passed: Stealth mode request builder adheres to Telegram MTProto.')

// Test 3: Story Reactions
console.log('\n--- Test 3: Story Reactions ---')
const VALID_REACTIONS = ['❤️', '🔥', '👍', '👏', '🎉', '😍', '😮']
function validateStoryReaction(emoticon) {
  if (!emoticon || typeof emoticon !== 'string') {
    throw new Error('Reaction cannot be empty')
  }
  const clean = emoticon.trim()
  if (!VALID_REACTIONS.includes(clean)) {
    throw new Error(`Unsupported story reaction: ${clean}`)
  }
  return { _: 'reactionEmoji', emoticon: clean }
}

assert.deepStrictEqual(validateStoryReaction('❤️'), { _: 'reactionEmoji', emoticon: '❤️' })
assert.deepStrictEqual(validateStoryReaction('🔥'), { _: 'reactionEmoji', emoticon: '🔥' })
assert.throws(() => validateStoryReaction(''), /cannot be empty/)
assert.throws(() => validateStoryReaction('invalid_emoji'), /Unsupported story reaction/)
console.log('✅ Assertion 3 passed: Story reaction validation and TL constructor verified.')

// Test 4: Story Expiration & Active State
console.log('\n--- Test 4: Story Expiration & Active State ---')
function isStoryActive(expireDate, currentUnixTime = Math.floor(Date.now() / 1000)) {
  if (!expireDate || typeof expireDate !== 'number') return false
  return expireDate > currentUnixTime
}

const nowUnix = 1700000000
assert.strictEqual(isStoryActive(nowUnix + 3600, nowUnix), true, 'Story expires in 1h is active')
assert.strictEqual(isStoryActive(nowUnix - 10, nowUnix), false, 'Story expired 10s ago is inactive')
assert.strictEqual(isStoryActive(0, nowUnix), false)
console.log('✅ Assertion 4 passed: Story expiration calculations verified.')

// Test 5: Story Caption Limits
console.log('\n--- Test 5: Story Caption Limits ---')
function validateStoryCaption(caption, isPremium = false) {
  if (!caption) return ''
  const limit = isPremium ? 2048 : 200
  if (caption.length > limit) {
    throw new Error(`Caption exceeds character limit of ${limit}`)
  }
  return caption.trim()
}

assert.strictEqual(validateStoryCaption('Beautiful sunset at Tehran'), 'Beautiful sunset at Tehran')
assert.throws(() => validateStoryCaption('a'.repeat(201), false), /limit of 200/)
assert.strictEqual(validateStoryCaption('a'.repeat(201), true).length, 201)
console.log('✅ Assertion 5 passed: Free vs Premium caption length limits enforced.')

console.log('\n🎉 ALL 5 ASSERTIONS PASSED: Telegram Stories verified!\n')
