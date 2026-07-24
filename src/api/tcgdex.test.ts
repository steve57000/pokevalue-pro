import { describe, expect, it } from 'vitest'
import { buildTcgDexImageUrl } from './tcgdex'

describe('buildTcgDexImageUrl', () => {
  it('construit l’URL low.webp', () => {
    expect(buildTcgDexImageUrl('https://assets.tcgdex.net/fr/base/base1/4', 'low')).toBe('https://assets.tcgdex.net/fr/base/base1/4/low.webp')
  })

  it('construit l’URL high.webp', () => {
    expect(buildTcgDexImageUrl('https://assets.tcgdex.net/fr/base/base1/4', 'high')).toBe('https://assets.tcgdex.net/fr/base/base1/4/high.webp')
  })
})

import { TcgDexProvider } from './tcgdex'

describe('TcgDexProvider', () => {
  it('rejette une réponse API en erreur', async () => {
    const previousFetch = globalThis.fetch
    globalThis.fetch = async () => ({ ok: false, status: 503 }) as Response
    await expect(new TcgDexProvider().getCard('base1-4', 'fr')).rejects.toThrow('503')
    globalThis.fetch = previousFetch
  })
})
