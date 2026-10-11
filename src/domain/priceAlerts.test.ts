import { describe, expect, it } from 'vitest'
import { isPriceAlertReached, markReachedPriceAlerts, parsePriceAlerts, priceAlertKey, type PriceAlert } from './priceAlerts'

const alert: PriceAlert = {
  id: 'alert-1', cardId: 'sv01-001', language: 'fr', name: 'Pikachu', setName: 'Étincelles',
  direction: 'below', targetPrice: 20, createdAt: '2026-10-11T08:00:00.000Z',
}

describe('price alerts', () => {
  it('checks upper and lower target directions', () => {
    expect(isPriceAlertReached(alert, 19.99)).toBe(true)
    expect(isPriceAlertReached(alert, 20)).toBe(true)
    expect(isPriceAlertReached(alert, 20.01)).toBe(false)
    expect(isPriceAlertReached({ ...alert, direction: 'above' }, 20.01)).toBe(true)
  })

  it('marks a matching alert once and preserves untriggered alerts', () => {
    const next = markReachedPriceAlerts([alert, { ...alert, id: 'alert-2', triggeredAt: '2026-10-10T08:00:00.000Z' }], new Map([[priceAlertKey(alert), 18]]), new Date('2026-10-11T09:00:00.000Z'))
    expect(next[0].triggeredPrice).toBe(18)
    expect(next[0].triggeredAt).toBe('2026-10-11T09:00:00.000Z')
    expect(next[1].triggeredAt).toBe('2026-10-10T08:00:00.000Z')
  })

  it('ignores invalid saved alert data', () => {
    expect(parsePriceAlerts([alert, { ...alert, targetPrice: -3 }, null])).toEqual([alert])
  })
})
