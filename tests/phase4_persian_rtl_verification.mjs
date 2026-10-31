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

// 5. Test Unicode Diacritics & Anti-Zalgo Clamping (tdesktop #6362)
console.log('[Test 5] Validating Unicode Diacritics & Anti-Zalgo Clamping (#6362)...')
// Decomposed NFD from macOS (e + combining acute accent)
const nfdSample = 'e\u0301'
const nfcResult = guard.normalizeUnicodeDiacritics(nfdSample)
assert.equal(nfcResult, 'é', 'NFD decomposed character must normalize to NFC composed form')

// Complex combining diacritics (IPA o with double overline: o̿)
const ipaSample = 'o\u033F'
const ipaResult = guard.normalizeUnicodeDiacritics(ipaSample)
assert.equal(ipaResult, 'o\u033F', 'Legitimate IPA combining diacritic must be preserved')

// Arabic harakat (tashdid + fathah on single base)
const arabicHarakat = 'تَشْدِيدٌ'
const harakatResult = guard.normalizeUnicodeDiacritics(arabicHarakat)
assert.equal(harakatResult, 'تَشْدِيدٌ', 'Valid Arabic harakat must be completely preserved')

// Extreme Zalgo attack text (base character + 10 stacked marks)
const zalgoAttack = 'X' + '\u0300\u0301\u0302\u0303\u0304\u0305\u0306\u0307\u0308\u0309'
const clampedZalgo = guard.normalizeUnicodeDiacritics(zalgoAttack, 2)
assert.equal(clampedZalgo, 'X\u0300\u0301', 'Zalgo stacking beyond threshold (2 marks) must be clamped safely')
console.log('✅ [Test 5 Passed] Unicode diacritics preserved and Zalgo text safely bounded without stripping legitimate marks.')

console.log('--- ALL PHASE 4 RTL ERGONOMICS CHECKS PASSED (100% GREEN) ---')
