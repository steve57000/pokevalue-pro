import { describe, expect, it } from 'vitest'
import { buildTcgDexImageUrl, buildTcgDexSearchUrl } from './tcgdex'

describe('buildTcgDexImageUrl', () => {
  it('construit l’URL low.webp', () => {
    expect(buildTcgDexImageUrl('https://assets.tcgdex.net/fr/base/base1/4', 'low')).toBe('https://assets.tcgdex.net/fr/base/base1/4/low.webp')
  })

  it('construit l’URL high.webp', () => {
    expect(buildTcgDexImageUrl('https://assets.tcgdex.net/fr/base/base1/4', 'high')).toBe('https://assets.tcgdex.net/fr/base/base1/4/high.webp')
  })
})

import { TcgDexProvider } from './tcgdex'

describe('buildTcgDexSearchUrl', () => {
  it('prioritizes the printed number because it is more discriminating', () => {
    expect(buildTcgDexSearchUrl({
      rawText: 'Dracaufeu 4/102',
      nameHints: ['Dracaufeu'],
      localId: '4',
    }, 'fr')).toBe('https://api.tcgdex.net/v2/fr/cards?localId=4')
  })

  it('falls back to a name when no number was detected', () => {
    expect(buildTcgDexSearchUrl({
      rawText: 'Noctali VMAX',
      nameHints: ['Noctali VMAX'],
    }, 'fr')).toBe('https://api.tcgdex.net/v2/fr/cards?name=Noctali+VMAX')
  })

  it('does not send an empty query', () => {
    expect(buildTcgDexSearchUrl({ rawText: '', nameHints: [] }, 'fr')).toBeUndefined()
  })
})

describe('TcgDexProvider', () => {
  it('rejette une réponse API en erreur', async () => {
    const previousFetch = globalThis.fetch
    globalThis.fetch = async () => ({ ok: false, status: 503 }) as Response
    await expect(new TcgDexProvider().getCard('base1-4', 'fr')).rejects.toThrow('503')
    globalThis.fetch = previousFetch
  })
})
