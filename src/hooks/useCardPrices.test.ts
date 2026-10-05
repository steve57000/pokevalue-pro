import { describe, expect, it } from 'vitest'
import { isCardPriceRefreshDue } from './useCardPrices'

describe('daily market price refresh', () => {
  it('refreshes cards that have never been checked', () => {
    expect(isCardPriceRefreshDue(undefined, 10_000)).toBe(true)
  })

  it('waits one day between successful checks', () => {
    const checkedAt = 1_000
    expect(isCardPriceRefreshDue(checkedAt, checkedAt + 24 * 60 * 60 * 1000 - 1)).toBe(false)
    expect(isCardPriceRefreshDue(checkedAt, checkedAt + 24 * 60 * 60 * 1000)).toBe(true)
  })
})
