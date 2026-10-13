import { describe, expect, it } from 'vitest'
import { cardImageOverrideById } from './cardImageOverrides'

describe('30th Classic Collection scans', () => {
  it('mappe les 30 identités vers des rectos anglais exacts et uniques', () => {
    const cards = [...cardImageOverrideById.values()].filter(card => card.setId === '30th-c')
    expect(cards).toHaveLength(30)
    expect(cards.every(card =>
      card.verified
      && card.image?.verified
      && card.image.language === 'en'
      && card.image.source === 'PokemonCard.io / English ME55C front scan'
      && card.image.localPath.startsWith('https://images.pokemoncard.io/images/me55c/me55c-')
    )).toBe(true)
    expect(new Set(cards.map(card => card.image?.localPath)).size).toBe(30)

    const exactIds: Record<string, string> = {
      '30th-c-001': 'me55c-4',
      '30th-c-003': 'me55c-11',
      '30th-c-004': 'me55c-11g',
      '30th-c-022': 'me55c-106p',
      '30th-c-023': 'me55c-106m',
      '30th-c-024': 'me55c-106',
      '30th-c-030': 'me55c-203',
    }
    for (const [cardId, providerId] of Object.entries(exactIds)) {
      expect(cardImageOverrideById.get(cardId)?.image?.localPath)
        .toBe(`https://images.pokemoncard.io/images/me55c/${providerId}.png`)
    }
    expect(cardImageOverrideById.get('30th-c-001')?.rarity).toBe('Rare Holo')
  })
})
