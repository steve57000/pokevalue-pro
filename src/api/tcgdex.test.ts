import { describe, expect, it } from 'vitest'
import {
  buildPokemonTcgImageFallback,
  buildTcgDexImageUrl,
  buildTcgDexSearchRequests,
  buildTcgDexSearchUrl,
  buildTcgDexSearchUrls,
  getTcgDexSearchLanguages,
} from './tcgdex'

describe('buildTcgDexImageUrl', () => {
  it('construit l’URL low.webp', () => {
    expect(buildTcgDexImageUrl('https://assets.tcgdex.net/fr/base/base1/4', 'low')).toBe('https://assets.tcgdex.net/fr/base/base1/4/low.webp')
  })

  it('construit l’URL high.webp', () => {
    expect(buildTcgDexImageUrl('https://assets.tcgdex.net/fr/base/base1/4', 'high')).toBe('https://assets.tcgdex.net/fr/base/base1/4/high.webp')
  })
})

  it('keeps a complete image URL intact', () => {
    expect(buildTcgDexImageUrl('https://assets.tcgdex.net/fr/base/base1/4/high.png', 'low')).toBe('https://assets.tcgdex.net/fr/base/base1/4/high.png')
  })
describe('buildPokemonTcgImageFallback', () => {
  it('maps dotted TCGdex sets to Pokémon TCG API image identifiers', () => {
    expect(buildPokemonTcgImageFallback('swsh12.5gg-GG70')).toEqual({
      low: 'https://images.pokemontcg.io/swsh12pt5gg/GG70.png',
      high: 'https://images.pokemontcg.io/swsh12pt5gg/GG70_hires.png',
      source: 'Pokémon TCG API',
    })
    expect(buildPokemonTcgImageFallback('sm3.5-78')?.high).toBe(
      'https://images.pokemontcg.io/sm35/78_hires.png',
    )
  })

  it('normalizes Scarlet & Violet set ids and leading zero card numbers', () => {
    expect(buildPokemonTcgImageFallback('sv02-085')?.low).toBe(
      'https://images.pokemontcg.io/sv2/85.png',
    )
  })

  it('rejects an invalid TCGdex id', () => {
    expect(buildPokemonTcgImageFallback('invalid')).toBeUndefined()
  })

  it('does not build a generic card-back URL for the 30th Classic Collection', () => {
    expect(buildPokemonTcgImageFallback('30th-c-001')).toBeUndefined()
  })
  it.each([['sv08.5-161','sv8pt5/161'],['swsh4.5sv-SV062','swsh45sv/SV062']])('maps %s to the actual English provider set', (id,path) => {
    expect(buildPokemonTcgImageFallback(id)?.low).toBe(`https://images.pokemontcg.io/${path}.png`)
  })
  it.each([['me06-138','me6-138'],['me05-115','me5-115'],['30th-152','me55-152'],['30th-R','me55-R']])('uses the published image host and exact identity for %s',(id,providerId)=>{
    expect(buildPokemonTcgImageFallback(id)?.low).toBe(`https://images.scrydex.com/pokemon/${providerId}/small`)
    expect(buildPokemonTcgImageFallback(id)?.high).toBe(`https://images.scrydex.com/pokemon/${providerId}/large`)
  })
  it.each(['unknown-001','mep-096','M6-001','me06-999','30th-c-022'])('does not guess an unsupported English image for %s',id=>{
    expect(buildPokemonTcgImageFallback(id)).toBeUndefined()
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

  it('tries several distinct OCR name hints when no number is readable', () => {
    expect(buildTcgDexSearchUrls({
      rawText: 'Dracaufeu\nDanseflamme',
      nameHints: ['Dracaufeu', 'Danseflamme', 'dracaufeu'],
    }, 'fr')).toEqual([
      'https://api.tcgdex.net/v2/fr/cards?name=Dracaufeu',
      'https://api.tcgdex.net/v2/fr/cards?name=Danseflamme',
    ])
  })

  it('keeps a single number query when OCR reads the printed number', () => {
    expect(buildTcgDexSearchUrls({
      rawText: 'Dracaufeu 4/102',
      nameHints: ['Dracaufeu', 'Danseflamme'],
      localId: '4',
    }, 'fr')).toEqual(['https://api.tcgdex.net/v2/fr/cards?localId=4'])
  })

  it('searches French and English automatically to handle a language mismatch', () => {
    expect(getTcgDexSearchLanguages('auto')).toEqual(['fr', 'en', 'ja', 'zh-tw'])
    const requests = buildTcgDexSearchRequests({
      rawText: 'Omanyte',
      nameHints: ['Omanyte'],
    }, 'auto')
    expect(requests.map((request) => request.language)).toEqual(['fr', 'en', 'ja', 'zh-tw'])
    expect(requests.map((request) => request.url)).toContain('https://api.tcgdex.net/v2/ja/cards?name=Omanyte')
  })

  it('cross-checks both number and name instead of trusting one OCR clue', () => {
    const requests = buildTcgDexSearchRequests({
      rawText: 'Omanyte\n180/165',
      nameHints: ['Omanyte'],
      localId: '180',
      printedTotal: '165',
    }, 'en')
    expect(requests.map((request) => request.url)).toEqual([
      'https://api.tcgdex.net/v2/en/cards?localId=180',
      'https://api.tcgdex.net/v2/en/cards?name=Omanyte',
      'https://api.tcgdex.net/v2/fr/cards?localId=180',
      'https://api.tcgdex.net/v2/fr/cards?name=Omanyte',
      'https://api.tcgdex.net/v2/ja/cards?localId=180',
      'https://api.tcgdex.net/v2/ja/cards?name=Omanyte',
      'https://api.tcgdex.net/v2/zh-tw/cards?localId=180',
      'https://api.tcgdex.net/v2/zh-tw/cards?name=Omanyte',
    ])
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
