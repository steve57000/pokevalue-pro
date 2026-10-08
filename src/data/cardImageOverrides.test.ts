import { describe, expect, it } from 'vitest'
import { cardImageOverrideById } from './cardImageOverrides'

describe('30th Classic Collection scans', () => {
  it('maps every verified reprint to its matching high resolution image', () => {
    const scans = [...cardImageOverrideById.values()].filter(card => card.setId === '30th-c')
    expect(scans).toHaveLength(30)
    expect(scans.every(card => card.verified && card.image?.verified)).toBe(true)
    expect(cardImageOverrideById.get('30th-c-001')?.rarity).toBe('Rare Holo')
    expect(cardImageOverrideById.get('30th-c-001')?.image?.localPath).toBe(
      'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/base1/base1-4_charizard.webp',
    )
    expect(cardImageOverrideById.get('30th-c-022')?.image?.localPath).toBe(
      'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/dp4/dp4-106_palkia.webp',
    )
  })
})
