import assert from 'node:assert/strict'
import { PersianRtlErgonomicsGuard } from '../src/services/persianRtlErgonomicsGuard.ts'

console.log('--- [Phase 4: Persian Typography, BiDi & RTL Ergonomics Verification] ---')

const guard = PersianRtlErgonomicsGuard.getInstance()

// 1. Test Text Direction Detection
console.log('[Test 1] Validating Text Direction Detection (RTL vs LTR)...')
assert.equal(guard.detectDirection('سلام، روزتون بخیر!'), 'rtl', 'Persian greeting must be RTL')
assert.equal(guard.detectDirection('Hello world! Welcome to Guidegram.'), 'ltr', 'English greeting must be LTR')
assert.equal(guard.detectDirection('    این یک تست ترکیبی با چند کلمه English است.'), 'rtl', 'Dominant Persian mixed text must be RTL')
assert.equal(guard.detectDirection('npm run dev --port 3000'), 'ltr', 'Code snippet must be LTR')
console.log('✅ [Test 1 Passed] Direction detector correctly differentiates RTL and LTR scripts.')

// 2. Test BiDi Punctuation Anchoring (Eliminating Trailing Inversion)
console.log('[Test 2] Validating BiDi Trailing Punctuation Anchoring...')
const rawPersianQuestion = 'حالت چطوره؟'
const anchored = guard.anchorBidiPunctuation(rawPersianQuestion)

assert.ok(anchored.endsWith(PersianRtlErgonomicsGuard.RLM), 'Must append RLM to anchor trailing question mark')
assert.equal(anchored, `حالت چطوره؟${PersianRtlErgonomicsGuard.RLM}`, 'Must preserve original text and anchor terminal punctuation')

// Non-RTL should not be modified
const englishText = 'How are you?'
const unchangedEnglish = guard.anchorBidiPunctuation(englishText)
assert.equal(unchangedEnglish, englishText, 'English text must not be modified with RLM')
console.log('✅ [Test 2 Passed] BiDi punctuation anchoring eliminates trailing question mark inversion.')

// 3. Test Persian Typography & Character Normalization
console.log('[Test 3] Validating Arabic-to-Persian character normalization...')
const rawArabicChars = 'كتابخانه ملي'
const normalized = guard.normalizePersianTypography(rawArabicChars)
assert.equal(normalized, 'کتابخانه ملی', 'Must replace Arabic Yeh and Kaf with Persian equivalents')

// Arabic digits normalization
const arabicDigits = 'شماره ۱۲۳۴ و ٥٦٧'
const normalizedDigits = guard.normalizePersianTypography(arabicDigits)
assert.equal(normalizedDigits, 'شماره ۱۲۳۴ و ۵۶۷', 'Must normalize Arabic digits ٥٦٧ to Persian ۵۶۷')
console.log('✅ [Test 3 Passed] Persian typography correctly normalizes Arabic characters and digits.')

// 4. Test Ergonomic Bubble & Font Scale Calculation (#90, #2060)
console.log('[Test 4] Validating Ergonomic Chat Bubble & Font Scaling...')
const styleDefault = guard.computeErgonomicBubbleStyle(1.0, 70)
assert.equal(styleDefault.fontSize, '14px', 'Default font scale should produce 14px')
assert.equal(styleDefault.maxWidth, '70%', 'Default bubble width should be 70%')

const styleLarge = guard.computeErgonomicBubbleStyle(1.2, 85)
assert.equal(styleLarge.fontSize, '17px', '1.2 font scale should produce 17px')
assert.equal(styleLarge.maxWidth, '85%', 'Scaled bubble width should be 85%')
console.log('✅ [Test 4 Passed] Ergonomic bubble and font scaling calculates cleanly.')
console.log('--- ALL PHASE 4 RTL ERGONOMICS CHECKS PASSED (100% GREEN) ---')
