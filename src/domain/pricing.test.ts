import { describe, expect, it } from 'vitest'
import { selectCardmarketPrice } from './pricing'

describe('selectCardmarketPrice', () => {
  it('utilise la tendance Cardmarket comme prix de référence', () => {
    expect(selectCardmarketPrice({ cardmarket: { trend: 10, avg7: 11, avg30: 9, low: 5, updatedAt: '2026-10-04' } })).toMatchObject({ value: 10, label: 'Tendance Cardmarket', currency: 'EUR' })
  })

  it('retombe sur la moyenne la plus récente disponible avant le prix bas', () => {
    expect(selectCardmarketPrice({ cardmarket: { avg7: 7, avg30: 9, low: 5 } })).toMatchObject({ value: 7, label: 'Moyenne 7 jours' })
    expect(selectCardmarketPrice({ cardmarket: { avg30: 9, avg: 8, low: 5 } })).toMatchObject({ value: 9, label: 'Moyenne 30 jours' })
    expect(selectCardmarketPrice({ cardmarket: { avg: 8, low: 5 } })).toMatchObject({ value: 8, label: 'Prix moyen' })
    expect(selectCardmarketPrice({ cardmarket: { low: 5 } })).toMatchObject({ value: 5, label: 'Prix bas Cardmarket' })
  })

  it('ignore les champs nuls, nuls en valeur ou invalides', () => {
    expect(selectCardmarketPrice({ cardmarket: { trend: null, avg7: 0, avg30: -1, avg: Number.NaN, low: 3 } })).toMatchObject({ value: 3, label: 'Prix bas Cardmarket' })
  })

  it('retourne undefined en absence totale de prix exploitable', () => {
    expect(selectCardmarketPrice(undefined)).toBeUndefined()
    expect(selectCardmarketPrice({ cardmarket: null })).toBeUndefined()
    expect(selectCardmarketPrice({ cardmarket: { trend: 0, avg30: null, low: -2 } })).toBeUndefined()
  })
})
