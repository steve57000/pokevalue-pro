import type { ExternalCard } from './cards'

export type CardLanguage = 'fr' | 'en' | 'ja' | 'zh-tw'
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
  reliability?: 'recognized' | 'ambiguous' | 'unrecognized'
  scoreBreakdown?: ScoreBreakdown
  contradictions?: string[]
}

export type ScoreBreakdown = {
  localId: number
  printedTotal: number
  name: number
  language: number
  category: number
  visual: number
  penalties: number
  total: number
}

export const MIN_TEXT_MATCH_SCORE = 32
export const MIN_FINAL_MATCH_SCORE = 72
export const MIN_BEST_MATCH_GAP = 10

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
  'supporter',
  'stadium',
  'item',
  'グッズ',
  'サポート',
  'スタジアム',
  '训练家',
  '訓練家',
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
    .replace(/[œŒ]/g, 'oe')
    .replace(/[æÆ]/g, 'ae')
    .toLowerCase()
    .replace(/[０-９]/g, (char) => String(char.charCodeAt(0) - 0xff10))
    .replace(/[–—−‐]/g, '-')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export function normalizeLocalId(value: string): string {
  const normalized = value.toUpperCase()
    .replace(/[ＯO]/g, '0')
    .replace(/[ＩIL]/g, '1')
    .replace(/[Ｓ]/g, '5')
    .replace(/[Ｂ]/g, '8')
    .replace(/[Ｚ]/g, '2')
    .replace(/[^A-Z0-9]/g, '')
  const match = normalized.match(/^([A-Z]*)(\d+)$/)
  if (!match) return normalized
  const [, prefix, digits] = match
  return `${prefix}${Number(digits)}`
}

export function parseCardScanText(rawText: string): CardScanClues {
  const compactText = rawText
    .replace(/[|\\]/g, '/')
    .replace(/[０-９]/g, (char) => String(char.charCodeAt(0) - 0xff10))
    .replace(/[OoＯ]/g, '0')
  const numbered = compactText.match(
    /\b((?:SVP|SWSH|SM|XY|BW|TG|GG|SV|RC|SH|SL|DP)?[ \t-]*\d{1,3})[ \t]*\/[ \t]*((?:SVP|SWSH|SM|XY|BW|TG|GG|SV|RC|SH|SL|DP)?[ \t-]*\d{1,3})\b/i,
  )
  const promo = compactText.match(/\b(SVP|SWSH|SM|XY|BW)\s*[- ]?\s*(\d{1,3})\b/i)
  const partialNumber = compactText.match(/\b((?:SVP|SWSH|SM|XY|BW|TG|GG|SV|RC|SH|SL|DP)?[ \t-]*\d{1,3})[ \t]*\//i)

  const nameHints = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/[^\p{L}0-9'’ .-]/gu, ' ').replace(/\s+/g, ' ').trim())
    .filter((line) => {
      const normalized = normalizeScannerText(line)
      if (normalized.length < 3 || normalized.length > 42) return false
      if (!/[\p{L}]/u.test(normalized) || /\d{3,}/.test(normalized)) return false
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
    localId: numbered?.[1]?.replace(/\s|-/g, '') ?? partialNumber?.[1]?.replace(/\s|-/g, '') ?? promo?.[2],
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

export function detectLikelyLanguage(clues: CardScanClues): CardLanguage | undefined {
  if (/[぀-ヿ]/u.test(clues.rawText)) return 'ja'
  if (/[一-鿿]/u.test(clues.rawText)) return 'zh-tw'
  const normalized = normalizeScannerText(clues.rawText)
  if (/\b(pv|faiblesse|retraite|dresseur|evolue)\b/.test(normalized)) return 'fr'
  if (/\b(hp|weakness|retreat|trainer|basic)\b/.test(normalized)) return 'en'
  return undefined
}

export function scoreScannerCandidate(
  candidate: Pick<
    ExternalCard,
    'name' | 'localId' | 'setOfficialCount' | 'setTotalCount' | 'rarity'
  > & { language?: CardLanguage | string },
  clues: CardScanClues,
): { score: number; reasons: string[]; breakdown: ScoreBreakdown; contradictions: string[] } {
  const reasons: string[] = []
  const contradictions: string[] = []
  const breakdown: ScoreBreakdown = { localId: 0, printedTotal: 0, name: 0, language: 0, category: 0, visual: 0, penalties: 0, total: 0 }

  if (clues.localId && candidate.localId) {
    if (normalizeLocalId(clues.localId) === normalizeLocalId(candidate.localId)) {
      breakdown.localId = 54
      reasons.push('numéro exact')
    } else {
      breakdown.penalties -= 42
      contradictions.push(`numéro différent (${candidate.localId})`)
    }
  }

  const normalizedRaw = normalizeScannerText(clues.rawText)
  const normalizedName = normalizeScannerText(candidate.name)
  const exactNameHint = clues.nameHints.some((hint) => normalizeScannerText(hint) === normalizedName)
  if (normalizedName.length >= 3 && (exactNameHint || normalizedRaw.includes(normalizedName))) {
    breakdown.name = 40
    reasons.push('nom détecté')
  } else {
    const bestSimilarity = Math.max(0, ...clues.nameHints.map((hint) => levenshteinSimilarity(hint, candidate.name)))
    if (bestSimilarity >= 0.78) {
      breakdown.name = Math.round(bestSimilarity * 30)
      reasons.push('nom proche')
    } else if (clues.nameHints.length > 0 && clues.localId) {
      breakdown.penalties -= 14
      contradictions.push('nom incompatible')
    }
  }

  if (clues.printedTotal) {
    const printedTotal = normalizeLocalId(clues.printedTotal)
    const counts = [candidate.setOfficialCount, candidate.setTotalCount].filter((count): count is number => Number.isFinite(count))
    const countMatches = counts.some((count) => normalizeLocalId(String(count)) === printedTotal)
    if (countMatches) {
      breakdown.printedTotal = 20
      reasons.push('total extension exact')
    } else if (counts.length > 0) {
      breakdown.penalties -= 34
      contradictions.push(`total extension différent (${counts.join('/')})`)
    }
  }

  const likelyLanguage = detectLikelyLanguage(clues)
  if (likelyLanguage && candidate.language === likelyLanguage) {
    breakdown.language = 6
    reasons.push(`langue ${likelyLanguage}`)
  }

  const rawCategory = normalizedRaw.includes('dresseur') || normalizedRaw.includes('trainer') || /グッズ|サポート|スタジアム|训练家|訓練家/u.test(clues.rawText)
  const candidateTrainer = normalizeScannerText(`${candidate.name} ${candidate.rarity ?? ''}`).includes('trainer') || normalizeScannerText(candidate.name).includes('dresseur')
  if (rawCategory && candidateTrainer) {
    breakdown.category = 8
    reasons.push('catégorie cohérente')
  }

  const positiveEvidence = breakdown.localId + breakdown.printedTotal + breakdown.name
  if (positiveEvidence === 0) {
    breakdown.penalties -= 50
    contradictions.push('aucune preuve textuelle')
  }

  breakdown.total = Math.min(100, Math.max(0, breakdown.localId + breakdown.printedTotal + breakdown.name + breakdown.language + breakdown.category + breakdown.penalties))
  return { score: breakdown.total, reasons, breakdown, contradictions }
}

export function combineScannerScores(
  textScore: number,
  visualScore?: number,
  baseBreakdown?: ScoreBreakdown,
  contradictions: string[] = [],
): { score: number; visualReason?: string; breakdown: ScoreBreakdown; contradictions: string[] } {
  const breakdown = { ...(baseBreakdown ?? { localId: 0, printedTotal: 0, name: textScore, language: 0, category: 0, visual: 0, penalties: 0, total: textScore }) }
  const nextContradictions = [...contradictions]
  if (Number.isFinite(visualScore)) {
    const safeVisualScore = Math.min(100, Math.max(0, visualScore as number))
    if (safeVisualScore >= 84) {
      breakdown.visual = 32
    } else if (safeVisualScore >= 70) {
      breakdown.visual = 22
    } else if (safeVisualScore >= 58) {
      breakdown.visual = 10
    } else if (safeVisualScore < 38) {
      breakdown.penalties -= 22
      nextContradictions.push('illustration très différente')
    }
  }
  const visualReason = breakdown.visual >= 32 ? 'illustration très proche' : breakdown.visual >= 22 ? 'illustration proche' : breakdown.visual >= 10 ? 'illustration possible' : undefined
  breakdown.total = Math.min(100, Math.max(0, breakdown.localId + breakdown.printedTotal + breakdown.name + breakdown.language + breakdown.category + breakdown.visual + breakdown.penalties))
  return { score: breakdown.total, visualReason, breakdown, contradictions: nextContradictions }
}

export function matchStrength(score: number): 'strong' | 'possible' | 'weak' {
  if (score >= 80) return 'strong'
  if (score >= 55) return 'possible'
  return 'weak'
}

export function hasReliableBestMatch(candidates: ScannerCandidate[]): boolean {
  const [first, second] = candidates
  if (!first || first.matchScore < MIN_FINAL_MATCH_SCORE) return false
  if (first.contradictions?.length) return false
  return !second || first.matchScore - second.matchScore >= MIN_BEST_MATCH_GAP
}
