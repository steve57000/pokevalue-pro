import { describe, expect, it } from 'vitest'
import { getPriceStats, selectCardmarketPrice, selectTcgplayerPrice } from './pricing'

describe('selectCardmarketPrice', () => {
  it('uses the Cardmarket trend as the European reference', () => {
    expect(selectCardmarketPrice({ cardmarket: { trend: 10, avg7: 11, avg30: 9, low: 5, updatedAt: '2026-10-04' } })).toMatchObject({ value: 10, label: 'Tendance Cardmarket', currency: 'EUR' })
  })

  it('falls back to the most recent available average before the low price', () => {
    expect(selectCardmarketPrice({ cardmarket: { avg7: 7, avg30: 9, low: 5 } })).toMatchObject({ value: 7, label: 'Moyenne 7 jours' })
    expect(selectCardmarketPrice({ cardmarket: { avg30: 9, avg: 8, low: 5 } })).toMatchObject({ value: 9, label: 'Moyenne 30 jours' })
    expect(selectCardmarketPrice({ cardmarket: { avg: 8, low: 5 } })).toMatchObject({ value: 8, label: 'Prix moyen' })
    expect(selectCardmarketPrice({ cardmarket: { low: 5 } })).toMatchObject({ value: 5, label: 'Prix bas Cardmarket' })
  })

  it('ignores null, zero, or invalid values', () => {
    expect(selectCardmarketPrice({ cardmarket: { trend: null, avg7: 0, avg30: -1, avg: Number.NaN, low: 3 } })).toMatchObject({ value: 3, label: 'Prix bas Cardmarket' })
  })

  it('returns undefined when no usable price exists', () => {
    expect(selectCardmarketPrice(undefined)).toBeUndefined()
    expect(selectCardmarketPrice({ cardmarket: null })).toBeUndefined()
    expect(selectCardmarketPrice({ cardmarket: { trend: 0, avg30: null, low: -2 } })).toBeUndefined()
  })
})

describe('TCGdex market pricing shapes', () => {
  const pricing = {
    cardmarket: {
      unit: 'EUR',
      updated: '2026-10-04T00:00:00.000Z',
      trend: 12,
      'trend-holo': 18,
      'avg-holo': 17,
      'low-holo': 10,
    },
    tcgplayer: {
      unit: 'USD',
      updated: '2026-10-04T20:00:00.000Z',
      normal: { lowPrice: 4, midPrice: 5, highPrice: 7, marketPrice: 5.5, directLowPrice: 4.5 },
      holofoil: { marketPrice: 15 },
      'reverse-holofoil': { marketPrice: 9 },
    },
  }

  it('reads TCGplayer nested finish prices and keeps their market separate', () => {
    expect(selectTcgplayerPrice(pricing)).toMatchObject({ value: 5.5, currency: 'USD', provider: 'tcgplayer', region: 'Amérique du Nord' })
    expect(selectTcgplayerPrice(pricing, 'holofoil')?.value).toBe(15)
    expect(selectTcgplayerPrice(pricing, 'reverse-holofoil')?.value).toBe(9)
    expect(selectCardmarketPrice(pricing)?.value).toBe(12)
  })

  it('preserves the provider variants and the European holo data', () => {
    expect(getPriceStats(pricing)).toMatchObject({
      cardmarket: { trend: 12, trendHolo: 18, avgHolo: 17, lowHolo: 10 },
      tcgplayer: { market: 5.5, variant: 'normal', currency: 'USD' },
      tcgplayerHolo: { market: 15, variant: 'holofoil' },
      tcgplayerReverse: { market: 9, variant: 'reverse-holofoil' },
    })
  })

  it('continues to read older flat TCGplayer cache objects', () => {
    expect(selectTcgplayerPrice({ tcgplayer: { marketPrice: 3 } } as never)?.value).toBe(3)
  })

  it('uses the median then the low price when TCGplayer has no market field', () => {
    expect(selectTcgplayerPrice({ tcgplayer: { midPrice: 4.25, lowPrice: 3.5 } } as never)).toMatchObject({ value: 4.25, label: 'Prix intermédiaire TCGplayer', currency: 'USD' })
    expect(selectTcgplayerPrice({ tcgplayer: { lowPrice: 3.5 } } as never)).toMatchObject({ value: 3.5, label: 'Prix bas TCGplayer', currency: 'USD' })
    expect(selectTcgplayerPrice({ tcgplayer: { marketPrice: 0, midPrice: Number.NaN, lowPrice: -2 } } as never)).toBeUndefined()
  })
})

