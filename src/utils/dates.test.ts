import { describe, expect, it } from 'vitest'
import { normalizeApiDate } from './dates'

describe('normalizeApiDate', () => {
  it('normalise une date API valide', () => {
    expect(normalizeApiDate('2026-07-24T09:00:00.000Z')).toBe('2026-07-24T09:00:00.000Z')
  })

  it('ignore une date absente ou invalide', () => {
    expect(normalizeApiDate(null)).toBeUndefined()
    expect(normalizeApiDate('date-invalide')).toBeUndefined()
  })
})
