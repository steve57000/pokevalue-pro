import { describe, expect, it } from 'vitest'
import { tcgDexLanguageForCard } from './useLiveCards'

describe('tcgDexLanguageForCard', () => {
  it('loads French catalogue cards from the French endpoint', () => {
    expect(tcgDexLanguageForCard({ language: 'FR' })).toBe('fr')
  })

  it('loads English catalogue cards from the English endpoint', () => {
    expect(tcgDexLanguageForCard({ language: 'EN' })).toBe('en')
  })
})
