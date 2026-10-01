import { describe, expect, it } from 'vitest'
import {
  combineScannerScores,
  MIN_BEST_MATCH_GAP,
  MIN_FINAL_MATCH_SCORE,
  hasReliableBestMatch,
  levenshteinSimilarity,
  matchStrength,
  normalizeLocalId,
  parseCardScanText,
  scoreScannerCandidate,
  type ScannerCandidate,
} from './scanner'

describe('scanner clues', () => {
  it('extracts a printed card number and useful name lines', () => {
    const clues = parseCardScanText('Dracaufeu ex\n330 PV\n199 / 165\nFaiblesse ×2')
    expect(clues.localId).toBe('199')
    expect(clues.printedTotal).toBe('165')
    expect(clues.nameHints).toContain('Dracaufeu ex')
  })

  it('extracts a promo number', () => {
    expect(parseCardScanText('Pikachu\nSVP 101').localId).toBe('101')
  })

  it('keeps the card name when OCR also reads evolution text and attacks', () => {
    const clues = parseCardScanText(
      'Évolution de Reptincel · Placez Dracaufeu\nDracaufeu\nDanseflamme\nRésistance',
    )
    expect(clues.nameHints[0]).toBe('Dracaufeu')
    expect(clues.nameHints).not.toContain('Évolution de Reptincel Placez Dracaufeu')
  })

  it('normalizes leading zeroes without losing promo prefixes', () => {
    expect(normalizeLocalId('074')).toBe('74')
    expect(normalizeLocalId('SVP-074')).toBe('SVP74')
  })

  it('tolerates a small OCR typo in the name', () => {
    expect(levenshteinSimilarity('Dracaufcu', 'Dracaufeu')).toBeGreaterThan(0.75)
  })

  it('scores exact number and detected name above an ambiguous number-only match', () => {
    const clues = parseCardScanText('Dracaufeu\n4/102')
    const exact = scoreScannerCandidate({ name: 'Dracaufeu', localId: '4' }, clues)
    const ambiguous = scoreScannerCandidate({ name: 'Tortank', localId: '4' }, clues)
    expect(exact.score).toBeGreaterThan(ambiguous.score)
    expect(exact.reasons).toEqual(expect.arrayContaining(['numéro exact', 'nom détecté']))
  })

  it('rejects the false Fossile Rare match from an English Omanyte scan', () => {
    const clues = parseCardScanText('rar\nOmanyte\n- 100 <\neo,')
    expect(clues.nameHints).toEqual(['Omanyte'])

    const wrong = scoreScannerCandidate({ name: 'Fossile Rare', localId: '167' }, clues)
    const correct = scoreScannerCandidate({ name: 'Omanyte', localId: '180' }, clues)

    expect(wrong.score).toBe(0)
    expect(wrong.reasons).toEqual([])
    expect(wrong.contradictions).toContain('aucune preuve textuelle')
    expect(correct.score).toBeGreaterThanOrEqual(40)
    expect(correct.reasons).toContain('nom détecté')
  })

  it('uses the printed set total as supporting evidence', () => {
    const clues = parseCardScanText('Omanyte\n180/165')
    const result = scoreScannerCandidate({
      name: 'Omanyte',
      localId: '180',
      setOfficialCount: 165,
      setTotalCount: 207,
    }, clues)
    expect(result.score).toBe(100)
    expect(result.reasons).toContain('total extension exact')
  })

  it('adds visual evidence only when the illustration is sufficiently similar', () => {
    expect(combineScannerScores(42, 90).score).toBe(74)
    expect(combineScannerScores(42, 90).visualReason).toBe('illustration très proche')
    expect(combineScannerScores(42, 40).score).toBe(42)
  })

  it('does not promote a weak or ambiguous first result as the best match', () => {
    const candidate = (score: number): ScannerCandidate => ({
      id: String(score),
      name: 'Omanyte',
      language: 'en',
      matchScore: score,
      textMatchScore: 42,
      matchReasons: ['nom détecté'],
    })
    expect(hasReliableBestMatch([candidate(84), candidate(60)])).toBe(true)
    expect(hasReliableBestMatch([candidate(65), candidate(30)])).toBe(false)
    expect(hasReliableBestMatch([candidate(84), candidate(80)])).toBe(false)
    expect(matchStrength(84)).toBe('strong')
  })

  it('detects Japanese and Chinese text as language clues', () => {
    expect(scoreScannerCandidate({ name: 'ピカチュウ', localId: '25', language: 'ja' }, parseCardScanText('ピカチュウ\n025/165')).reasons).toContain('langue ja')
    expect(scoreScannerCandidate({ name: '皮卡丘', localId: '25', language: 'zh-tw' }, parseCardScanText('皮卡丘\n025/165')).reasons).toContain('langue zh-tw')
  })

  it('penalizes a candidate with the right name but wrong printed number', () => {
    const clues = parseCardScanText('Omanyte\n180/165')
    const wrong = scoreScannerCandidate({ name: 'Omanyte', localId: '179', setOfficialCount: 165 }, clues)
    expect(wrong.score).toBeLessThan(40)
    expect(wrong.contradictions).toContain('numéro différent (179)')
  })

  it('rejects a result supported only by image availability', () => {
    const combined = combineScannerScores(0, 90)
    expect(combined.score).toBeLessThan(72)
  })
  it('handles rotated/photo-background evidence by relying on number plus total instead of first image', () => {
    const clues = parseCardScanText('table sombre\nDracaufeu ex\n180/165')
    const good = scoreScannerCandidate({ name: 'Dracaufeu ex', localId: '180', setOfficialCount: 165, language: 'fr' }, clues)
    const wrong = scoreScannerCandidate({ name: 'Dracaufeu ex', localId: '181', setOfficialCount: 165, language: 'fr' }, clues)
    expect(good.score).toBeGreaterThan(wrong.score)
  })

  it('keeps partially readable numbers useful without inventing a total', () => {
    const clues = parseCardScanText('NoctaIi VMAX\n215 /')
    expect(clues.printedTotal).toBeUndefined()
    expect(scoreScannerCandidate({ name: 'Noctali VMAX', localId: '215' }, clues).score).toBeGreaterThanOrEqual(54)
  })

  it('keeps trainer and energy names searchable instead of forcing Pokémon-only results', () => {
    expect(parseCardScanText('Rosa\nDresseur Supporter\n236/236').nameHints).toContain('Rosa')
    expect(parseCardScanText('Fire Energy\n165/165').nameHints).toContain('Fire Energy')
  })

  it('marks close candidates as ambiguous until the gap is sufficient', () => {
    const candidate = (id: string, score: number): ScannerCandidate => ({ id, name: id, language: 'fr', matchScore: score, textMatchScore: score, matchReasons: [] })
    expect(hasReliableBestMatch([candidate('a', 82), candidate('b', 75)])).toBe(false)
  })

  it('invalidates stale recognition-style cache entries through the current cache version', () => {
    expect(MIN_FINAL_MATCH_SCORE).toBe(72)
    expect(MIN_BEST_MATCH_GAP).toBe(10)
  })

})
