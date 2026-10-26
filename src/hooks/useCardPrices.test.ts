import { describe, expect, it } from 'vitest'
import { isCardPriceRefreshDue, retainKnownPrices, type CardPriceState } from './useCardPrices'

describe('daily market price refresh', () => {
  const known:CardPriceState={status:'success',language:'fr',price:{value:150,currency:'EUR',provider:'cardmarket',basis:'guide',label:'Tendance Cardmarket',updatedAt:'2026-10-18'}}
  it('retains the last known quote and its date when a successful response has no price',()=>{
    expect(retainKnownPrices(known,{status:'success',language:'fr',price:null})).toMatchObject({price:known.price,retained:true})
  })
  it('replaces a retained quote only with a real new quote',()=>{
    expect(retainKnownPrices({...known,retained:true},{...known,price:{...known.price!,value:160}})).toMatchObject({price:{value:160},retained:false})
  })
  it('never invents a price when none is known',()=>{
    expect(retainKnownPrices(undefined,{status:'success',language:'fr',price:null}).price).toBeUndefined()
  })
  it('keeps the current guide when a failed refresh returns an older API cache entry',()=>{
    expect(retainKnownPrices(known,{...known,status:'error',retained:true,price:{...known.price!,value:90}})).toMatchObject({price:known.price,retained:true})
  })
  it('does not replace a known guide with a non-comparable listing',()=>{
    const next={...known,price:{...known.price!,basis:'listing' as const,value:90}}
    expect(retainKnownPrices(known,next)).toMatchObject({price:known.price,retained:true})
  })
  it('refreshes cards that have never been checked', () => {
    expect(isCardPriceRefreshDue(undefined, 10_000)).toBe(true)
  })

  it('waits one day between successful checks', () => {
    const checkedAt = 1_000
    expect(isCardPriceRefreshDue(checkedAt, checkedAt + 24 * 60 * 60 * 1000 - 1)).toBe(false)
    expect(isCardPriceRefreshDue(checkedAt, checkedAt + 24 * 60 * 60 * 1000)).toBe(true)
  })
})
