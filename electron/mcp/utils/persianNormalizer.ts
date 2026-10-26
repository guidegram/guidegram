/**
 * Persian & Arabic text normalizer, cleaner, and fuzzy token matcher.
 * Provides resilient matching for user queries, contact names, and message content.
 */

// Arabic to Persian character mapping
const CHAR_MAP: Record<string, string> = {
  // Yeh variants
  '\u064A': '\u06CC', // Arabic Yeh ي -> Persian Yeh ی
  '\u0649': '\u06CC', // Alef Maksura ى -> Persian Yeh ی
  '\u0626': '\u06CC', // Yeh with Hamza ئ -> Persian Yeh ی
  '\u06D2': '\u06CC', // Urdu Yeh ے -> Persian Yeh ی

  // Kaf variants
  '\u0643': '\u06A9', // Arabic Kaf ك -> Persian Kaf ک
  '\u06AA': '\u06A9', // Swash Kaf -> Persian Kaf ک

  // Teh Marbuta
  '\u0629': '\u0647', // Teh Marbuta ة -> Heh ه

  // Alef variants
  '\u0622': '\u0627', // Alef with Madda آ -> Alef ا
  '\u0623': '\u0627', // Alef with Hamza Above أ -> Alef ا
  '\u0625': '\u0627', // Alef with Hamza Below إ -> Alef ا
  '\u0671': '\u0627', // Alef Wasla ٱ -> Alef ا

  // Waw with Hamza
  '\u0624': '\u0648', // Waw with Hamza ؤ -> Waw و

  // Heh variants
  '\u06C0': '\u0647', // Heh with Yeh above ۀ -> Heh ه
  '\u06C1': '\u0647', // Heh Goal -> Heh ه
}

// Arabic and Persian numerals to English ASCII digits
const DIGIT_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
}

// Common Persian honorifics / titles that can be soft-matched or treated with lower weight
export const PERSIAN_TITLES = new Set([
  'دکتر',
  'خانم',
  'اقای',
  'آقای',
  'مهندس',
  'استاد',
  'سید',
  'سیده',
  'حاج',
  'حاجی',
  'پروفسور',
  'جناب',
  'سرکار',
  'همکار',
])

/**
 * Normalizes Persian and Arabic text by standardizing characters,
 * stripping diacritics, removing half-spaces (ZWNJ), and trimming whitespace.
 */
export function normalizePersian(input?: string | null): string {
  if (!input) return ''
  let text = String(input)

  // 1. Convert characters according to CHAR_MAP
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    result += CHAR_MAP[ch] || DIGIT_MAP[ch] || ch
  }

  // 2. Strip diacritics / harakat (fatha, damma, kasra, tanwin, tashdid, sukun, dagger alif)
  result = result.replace(/[\u064B-\u065F\u0670]/g, '')

  // 3. Strip zero-width characters (ZWNJ \u200c, ZWJ \u200d, directional marks, BOM)
  result = result.replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, ' ')

  // 4. Normalize multiple punctuation and spacing
  result = result.replace(/[\t\r\n]+/g, ' ')
  result = result.replace(/\s+/g, ' ')

  return result.trim().toLowerCase()
}

/**
 * Strips all spaces, half-spaces, and punctuation for ultra-strict compact matching.
 */
export function compactPersian(input?: string | null): string {
  return normalizePersian(input).replace(/[\s\p{P}\p{S}]+/gu, '')
}

/**
 * Tokenizes normalized Persian text into individual words, filtering out empty tokens.
 */
export function tokenizePersian(input?: string | null): string[] {
  const norm = normalizePersian(input)
  if (!norm) return []
  return norm.split(/[\s\p{P}\p{S}]+/gu).filter((t) => t.length > 0)
}

/**
 * Calculates Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Calculates normalized similarity ratio between 0.0 and 1.0.
 */
export function stringSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1.0
  const dist = levenshteinDistance(a, b)
  return 1 - dist / maxLen
}

/**
 * Performs intelligent fuzzy token matching.
 * Solves real-world cases like:
 * - Query: "خانم دکتر غلامی" vs Target: "دکتر غلامی" -> match!
 * - Query: "دکتر غلامی" vs Target: "فاطمه غلامی (پزشک)" -> match!
 * - Query: "کشیک نمازی" vs Target: "کشیک بیمارستان نمازی شیراز" -> match!
 */
export function fuzzyTokenMatch(
  query: string,
  target: string,
  minScore = 0.55
): { matched: boolean; score: number } {
  const normQuery = normalizePersian(query)
  const normTarget = normalizePersian(target)

  if (!normQuery || !normTarget) {
    return { matched: false, score: 0 }
  }

  // Exact or direct inclusion check
  if (normTarget.includes(normQuery) || normQuery.includes(normTarget)) {
    return { matched: true, score: 1.0 }
  }

  // Compact equality check (ignoring all spaces / punctuation)
  const compQuery = compactPersian(query)
  const compTarget = compactPersian(target)
  if (compTarget.includes(compQuery) || compQuery.includes(compTarget)) {
    return { matched: true, score: 0.95 }
  }

  const queryTokens = tokenizePersian(query)
  const targetTokens = tokenizePersian(target)

  if (queryTokens.length === 0 || targetTokens.length === 0) {
    return { matched: false, score: 0 }
  }

  // Filter out standalone common titles for primary scoring to avoid false positives on just "دکتر"
  const substantiveQueryTokens = queryTokens.filter((t) => !PERSIAN_TITLES.has(t))
  const tokensToCheck = substantiveQueryTokens.length > 0 ? substantiveQueryTokens : queryTokens

  let matchedTokensCount = 0
  let totalScore = 0

  for (const qToken of tokensToCheck) {
    let bestTokenScore = 0
    for (const tToken of targetTokens) {
      if (tToken === qToken) {
        bestTokenScore = 1.0
        break
      }
      if (tToken.includes(qToken) || qToken.includes(tToken)) {
        bestTokenScore = Math.max(bestTokenScore, 0.85)
        continue
      }
      const sim = stringSimilarity(qToken, tToken)
      if (sim > bestTokenScore) {
        bestTokenScore = sim
      }
    }

    if (bestTokenScore >= 0.7) {
      matchedTokensCount++
    }
    totalScore += bestTokenScore
  }

  const avgScore = totalScore / tokensToCheck.length

  // If at least one major substantive token matched strongly (e.g. "غلامی" or "نمازی")
  const isMatch = (matchedTokensCount > 0 && avgScore >= minScore) || matchedTokensCount === tokensToCheck.length

  return {
    matched: isMatch,
    score: avgScore,
  }
}
