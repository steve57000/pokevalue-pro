import type { ExternalCard } from './cards'

export type CardLanguage = 'fr' | 'en'
export type ScanLanguage = 'auto' | CardLanguage

export type CardScanClues = {
  rawText: string
  nameHints: string[]
  localId?: string
  printedTotal?: string
}

export type ScannerCandidate = ExternalCard & {
  matchScore: number
  textMatchScore: number
  visualMatchScore?: number
  matchReasons: string[]
}

export const MIN_TEXT_MATCH_SCORE = 30

const CARD_TEXT_NOISE = [
  'basic',
  'base',
  'evolution',
  'evolue',
  'faiblesse',
  'resistance',
  'retraite',
  'illustrateur',
  'pokemon',
  'dresseur',
  'trainer',
  'stage',
  'weakness',
  'resistance',
  'retreat',
]

const OCR_GARBAGE_WORDS = new Set([
  'rar',
  'rare',
  'pv',
  'hp',
  'ex',
  'gx',
  'vmax',
  'vstar',
])

export function normalizeScannerText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function normalizeLocalId(value: string): string {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const match = normalized.match(/^([A-Z]*)(\d+)$/)
  if (!match) return normalized
  const [, prefix, digits] = match
  return `${prefix}${Number(digits)}`
}

export function parseCardScanText(rawText: string): CardScanClues {
  const compactText = rawText.replace(/[|\\]/g, '/')
  const numbered = compactText.match(
    /\b((?:SVP|SWSH|SM|XY|BW|TG|GG|SV|RC|SH|SL|DP)?[ \t-]*\d{1,3})[ \t]*\/[ \t]*((?:SVP|SWSH|SM|XY|BW|TG|GG|SV|RC|SH|SL|DP)?[ \t-]*\d{1,3})\b/i,
  )
  const promo = compactText.match(/\b(SVP|SWSH|SM|XY|BW)\s*[- ]?\s*(\d{1,3})\b/i)

  const nameHints = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/[^\p{L}0-9'’ .-]/gu, ' ').replace(/\s+/g, ' ').trim())
    .filter((line) => {
      const normalized = normalizeScannerText(line)
      if (normalized.length < 3 || normalized.length > 42) return false
      if (!/[a-z]/i.test(normalized) || /\d{3,}/.test(normalized)) return false
      if (OCR_GARBAGE_WORDS.has(normalized)) return false
      return !CARD_TEXT_NOISE.some((word) => normalized === word || normalized.startsWith(`${word} `))
    })
    .sort((left, right) => {
      const leftWords = normalizeScannerText(left).split(' ').length
      const rightWords = normalizeScannerText(right).split(' ').length
      if (leftWords !== rightWords) return leftWords - rightWords
      return left.length - right.length
    })
    .slice(0, 8)

  return {
    rawText,
    nameHints,
    localId: numbered?.[1]?.replace(/\s|-/g, '') ?? promo?.[2],
    printedTotal: numbered?.[2]?.replace(/\s|-/g, ''),
  }
}

export function levenshteinSimilarity(left: string, right: string): number {
  const a = normalizeScannerText(left)
  const b = normalizeScannerText(right)
  if (!a || !b) return 0
  if (a === b) return 1

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  const current = new Array<number>(b.length + 1)

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    previous.splice(0, previous.length, ...current)
  }

  return 1 - previous[b.length] / Math.max(a.length, b.length)
}

export function scoreScannerCandidate(
  candidate: Pick<
    ExternalCard,
    'name' | 'localId' | 'setOfficialCount' | 'setTotalCount'
  >,
  clues: CardScanClues,
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0

  if (clues.localId && candidate.localId && normalizeLocalId(clues.localId) === normalizeLocalId(candidate.localId)) {
    score += 58
    reasons.push('numéro exact')
  }

  const normalizedRaw = normalizeScannerText(clues.rawText)
  const normalizedName = normalizeScannerText(candidate.name)
  const exactNameHint = clues.nameHints.some(
    (hint) => normalizeScannerText(hint) === normalizedName,
  )
  if (normalizedName.length >= 3 && (exactNameHint || normalizedRaw.includes(normalizedName))) {
    score += 42
    reasons.push('nom détecté')
  } else {
    const bestSimilarity = Math.max(0, ...clues.nameHints.map((hint) => levenshteinSimilarity(hint, candidate.name)))
    if (bestSimilarity >= 0.72) {
      score += Math.round(bestSimilarity * 40)
      reasons.push('nom proche')
    }
  }

  if (clues.printedTotal) {
    const printedTotal = normalizeLocalId(clues.printedTotal)
    const countMatches = [candidate.setOfficialCount, candidate.setTotalCount]
      .filter((count): count is number => Number.isFinite(count))
      .some((count) => normalizeLocalId(String(count)) === printedTotal)
    if (countMatches) {
      score += 12
      reasons.push('extension cohérente')
    }
  }

  return { score: Math.min(score, 100), reasons }
}

export function combineScannerScores(
  textScore: number,
  visualScore?: number,
): { score: number; visualReason?: string } {
  if (!Number.isFinite(visualScore)) return { score: Math.min(100, Math.max(0, textScore)) }

  const safeVisualScore = Math.min(100, Math.max(0, visualScore as number))
  if (safeVisualScore >= 82) {
    return {
      score: Math.min(100, textScore + 42),
      visualReason: 'illustration très proche',
    }
  }
  if (safeVisualScore >= 68) {
    return {
      score: Math.min(100, textScore + 26),
      visualReason: 'illustration proche',
    }
  }
  if (safeVisualScore >= 56) {
    return {
      score: Math.min(100, textScore + 12),
      visualReason: 'illustration possible',
    }
  }
  return { score: Math.min(100, Math.max(0, textScore)) }
}

export function matchStrength(score: number): 'strong' | 'possible' | 'weak' {
  if (score >= 80) return 'strong'
  if (score >= 55) return 'possible'
  return 'weak'
}

export function hasReliableBestMatch(candidates: ScannerCandidate[]): boolean {
  const [first, second] = candidates
  if (!first || first.matchScore < 70) return false
  return !second || first.matchScore - second.matchScore >= 8
}
