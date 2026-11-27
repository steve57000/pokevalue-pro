import {afterEach,expect,it,vi} from 'vitest'
import data from '../data/reviewedDeltaPrices.json'
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();vi.resetModules()})
it('refreshes the common public feed without admitting changed identities or older source dates',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-26T12:00:00Z'))
 const {refreshReviewedPrices,reviewedMarketData}=await import('./reviewedPrices')
 const card=data.cards.find(card=>card.id==='me06-138')!
 const updated={...card,fr:{...card.fr,value:450,updatedAt:'2026-11-26T08:00:00Z'}}
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({...data,cards:[updated]})})
 vi.stubGlobal('fetch',fetcher)
 expect(await refreshReviewedPrices()).toBe(true)
 expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('prices/reviewed-delta.json'),expect.objectContaining({cache:'no-store'}))
 expect(reviewedMarketData(card.id,'fr')?.price.value).toBe(450)
 expect(reviewedMarketData(card.id,'en')?.price.value).toBe(card.en.value)
 fetcher.mockResolvedValue({ok:true,json:async()=>({...data,cards:[card]})})
 await refreshReviewedPrices(true)
 expect(reviewedMarketData(card.id,'fr')?.price.value).toBe(450)
 fetcher.mockResolvedValue({ok:true,json:async()=>({...data,cards:[{...updated,marketUrl:'https://example.com/wrong'}]})})
 expect(await refreshReviewedPrices(true)).toBe(false)
 fetcher.mockRejectedValue(new Error('Offline'))
 expect(await refreshReviewedPrices(true)).toBe(false)
 expect(reviewedMarketData(card.id,'fr')?.price.value).toBe(450)
})
