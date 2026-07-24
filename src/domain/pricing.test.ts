import { describe, expect, it } from 'vitest'
import { selectCardmarketPrice } from './pricing'

describe('selectCardmarketPrice', () => {
  it('sélectionne la tendance Cardmarket en priorité', () => {
    expect(selectCardmarketPrice({ cardmarket: { trend: 10, avg30: 9, updatedAt: '2026-07-24' } })).toMatchObject({ value: 10, label: 'Tendance Cardmarket', currency: 'EUR' })
  })

  it('respecte l’ordre de fallback jusqu’au prix le plus bas observé', () => {
    expect(selectCardmarketPrice({ cardmarket: { trend: null, avg30: 8, avg7: 7, avg: 6, low: 5 } })?.label).toBe('Moyenne 30 jours')
    expect(selectCardmarketPrice({ cardmarket: { avg30: null, avg7: 7, avg: 6, low: 5 } })?.label).toBe('Moyenne 7 jours')
    expect(selectCardmarketPrice({ cardmarket: { avg: 6, low: 5 } })?.label).toBe('Prix moyen')
    expect(selectCardmarketPrice({ cardmarket: { low: 5 } })?.label).toBe('Prix le plus bas observé')
  })

  it('ignore les champs null, zéro, négatifs et invalides', () => {
    expect(selectCardmarketPrice({ cardmarket: { trend: null, avg30: 0, avg7: -1, avg: Number.NaN, low: 3 } })).toMatchObject({ value: 3, label: 'Prix le plus bas observé' })
  })

  it('retourne undefined en absence totale de prix exploitable', () => {
    expect(selectCardmarketPrice(undefined)).toBeUndefined()
    expect(selectCardmarketPrice({ cardmarket: null })).toBeUndefined()
    expect(selectCardmarketPrice({ cardmarket: { trend: 0, avg30: null, low: -2 } })).toBeUndefined()
  })
})
