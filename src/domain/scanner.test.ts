import { describe, expect, it } from 'vitest'
import {
  combineScannerScores,
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

    expect(wrong).toEqual({ score: 0, reasons: [] })
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
    expect(result.reasons).toContain('extension cohérente')
  })

  it('adds visual evidence only when the illustration is sufficiently similar', () => {
    expect(combineScannerScores(42, 90)).toEqual({
      score: 84,
      visualReason: 'illustration très proche',
    })
    expect(combineScannerScores(42, 40)).toEqual({ score: 42 })
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
})
