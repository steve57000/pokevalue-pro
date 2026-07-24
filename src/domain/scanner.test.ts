import { describe, expect, it } from 'vitest'
import {
  levenshteinSimilarity,
  normalizeLocalId,
  parseCardScanText,
  scoreScannerCandidate,
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

  it('normalizes leading zeroes without losing promo prefixes', () => {
    expect(normalizeLocalId('074')).toBe('74')
    expect(normalizeLocalId('SVP-074')).toBe('SVP74')
  })

  it('tolerates a small OCR typo in the name', () => {
    expect(levenshteinSimilarity('Dracaufcu', 'Dracaufeu')).toBeGreaterThan(0.75)
  })

  it('scores exact number and detected name above an ambiguous number-only match', () => {
    const clues = parseCardScanText('Dracaufeu\n4/102')
    const exact = scoreScannerCandidate({ name: 'Dracaufeu', localId: '4', image: 'image' }, clues)
    const ambiguous = scoreScannerCandidate({ name: 'Tortank', localId: '4', image: 'image' }, clues)
    expect(exact.score).toBeGreaterThan(ambiguous.score)
    expect(exact.reasons).toEqual(expect.arrayContaining(['numéro exact', 'nom détecté']))
  })
})
