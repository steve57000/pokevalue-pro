import { describe, expect, it } from 'vitest'
import { cardImageOverrideById } from './cardImageOverrides'

describe('30th Classic Collection scans', () => {
  it('keeps the 30 card identities without substituting historical prints', () => {
    const cards = [...cardImageOverrideById.values()].filter(card => card.setId === '30th-c')
    expect(cards).toHaveLength(30)
    expect(cards.every(card => !card.verified && !card.image)).toBe(true)
    expect(cardImageOverrideById.get('30th-c-001')?.rarity).toBe('Rare Holo')
  })
})
