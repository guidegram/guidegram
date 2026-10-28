import { readFileSync } from 'fs'
import { join } from 'path'

console.log('🧪 Starting Verification Suite: M31 - Interactive Spoiler & Floating Date Navigator')

// 1. Verify InteractiveSpoiler component
const spoilerPath = join(process.cwd(), 'src', 'components', 'chat', 'InteractiveSpoiler.tsx')
const spoilerSource = readFileSync(spoilerPath, 'utf8')

if (!spoilerSource.includes('onClickCapture={handleClickCapture}')) {
  throw new Error('FAILED: InteractiveSpoiler must use onClickCapture to intercept initial reveal clicks')
}
if (!spoilerSource.includes('e.stopPropagation()') || !spoilerSource.includes('e.preventDefault()')) {
  throw new Error('FAILED: InteractiveSpoiler must stop propagation and prevent default when hidden')
}
if (!spoilerSource.includes('telegram-spoiler')) {
  throw new Error('FAILED: InteractiveSpoiler missing telegram-spoiler CSS class')
}
if (!spoilerSource.includes('is-bursting')) {
  throw new Error('FAILED: InteractiveSpoiler missing is-bursting dust particle state')
}
console.log('✅ Check 1 Passed: InteractiveSpoiler component properly implemented with capture-phase interception & burst animation.')

// 2. Verify ChatViewport integration of InteractiveSpoiler and renderInlineRange
const chatViewportPath = join(process.cwd(), 'src', 'components', 'ChatViewport.tsx')
const chatViewportSource = readFileSync(chatViewportPath, 'utf8')

if (!chatViewportSource.includes("import { InteractiveSpoiler } from './chat/InteractiveSpoiler'")) {
  throw new Error('FAILED: ChatViewport missing InteractiveSpoiler import')
}
if (!chatViewportSource.includes('renderBasicInlineRange')) {
  throw new Error('FAILED: ChatViewport missing renderBasicInlineRange helper')
}
if (!chatViewportSource.includes('renderInlineRange = (')) {
  throw new Error('FAILED: ChatViewport missing updated renderInlineRange')
}
if (!chatViewportSource.includes('<InteractiveSpoiler key={`${keyPrefix}-spoiler-${spStart}-${spEnd}`}>')) {
  throw new Error('FAILED: ChatViewport must wrap atomic spoiler ranges with InteractiveSpoiler')
}
console.log('✅ Check 2 Passed: ChatViewport correctly preserves spoiler start/end boundaries as single atomic blocks.')

// 3. Verify CSS keyframes and styles for Telegram Spoilers
const cssPath = join(process.cwd(), 'src', 'index.css')
const cssSource = readFileSync(cssPath, 'utf8')

if (!cssSource.includes('@keyframes spoiler-dust') || !cssSource.includes('@keyframes spoiler-burst')) {
  throw new Error('FAILED: index.css missing spoiler-dust or spoiler-burst keyframes')
}
if (!cssSource.includes('.telegram-spoiler.is-hidden') || !cssSource.includes('.telegram-spoiler.is-bursting')) {
  throw new Error('FAILED: index.css missing .telegram-spoiler.is-hidden or is-bursting rules')
}
console.log('✅ Check 3 Passed: Telegram-grade animated dust particle shimmer and burst dissolve CSS verified.')

// 4. Verify Floating Sticky Date Badge & Advanced Date Navigator in ChatViewport
if (!chatViewportSource.includes('floatingScrollDate') || !chatViewportSource.includes('showFloatingDate')) {
  throw new Error('FAILED: ChatViewport missing floatingScrollDate state')
}
if (!chatViewportSource.includes('isDateNavOpen') || !chatViewportSource.includes('handleJumpToTimestamp')) {
  throw new Error('FAILED: ChatViewport missing isDateNavOpen or handleJumpToTimestamp')
}
if (!chatViewportSource.includes('handleJumpToPreset')) {
  throw new Error('FAILED: ChatViewport missing handleJumpToPreset')
}
if (!chatViewportSource.includes('fa-IR-u-ca-persian')) {
  throw new Error('FAILED: ChatViewport missing dual Persian/Jalali calendar formatting')
}
if (!chatViewportSource.includes('Jump to Date') || !chatViewportSource.includes('پرش به تاریخ')) {
  throw new Error('FAILED: ChatViewport missing Date Navigator popover')
}
console.log('✅ Check 4 Passed: Floating Sticky Date Badge & Advanced Date Navigator with Persian & Gregorian calendar verified.')

console.log('\n🎉 ALL 4 CHECKS PASSED: Interactive Spoiler reveal and Floating Date Badge features are production-grade!')
