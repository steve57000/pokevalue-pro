import { describe, expect, it } from 'vitest'
import { cards } from './data'

describe('curated catalogue mappings', () => {
  it('maps every catalogue card to one unique TCGdex card', () => {
    const ids = cards.map((card) => card.tcgdexId)
    expect(ids).toHaveLength(30)
    expect(ids.every(Boolean)).toBe(true)
    expect(new Set(ids).size).toBe(cards.length)
  })

  it('uses the verified identifiers for cards whose set ids are ambiguous', () => {
    expect(cards.find((card) => card.id === 'mew-goldstar')?.tcgdexId).toBe('ex15-101')
    expect(cards.find((card) => card.id === 'arceus-vstar')?.tcgdexId).toBe('swsh12.5gg-GG70')
    expect(cards.find((card) => card.id === 'pikachu-van-gogh')?.tcgdexId).toBe('svp-085')
  })
})
