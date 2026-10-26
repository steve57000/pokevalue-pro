import {describe,expect,it} from 'vitest'
import {EMPTY_GRADED_MARKET,gradedMarketForCard,mergeGradedMarket,parseGradedMarketFeed,quoteFreshness,type GradedMarketFeed} from './gradedMarket'
const quote={
 cardKey:'tcgdex:swsh3:swsh3-20:fr:normal',provider:'cardstand' as const,
 company:'PSA' as const,grade:'10',finish:'holo',currency:'EUR' as const,
 fetchedAt:'2026-10-20T10:00:00Z',count30:4,median30:250,count90:7,low90:180,high90:330,
 history:[{date:'2026-10-18',averageEur:200,count:2}],
}
const feed=(updates:Partial<GradedMarketFeed>={}):GradedMarketFeed=>({schemaVersion:1,generatedAt:'2026-10-20T10:00:00Z',status:'active',quotes:[quote],...updates})
describe('flux de prix de ventes gradées',()=>{
 it('rejette les faux prix, mélanges de notes et données non sourcées',()=>{
  expect(parseGradedMarketFeed(feed()).quotes).toHaveLength(1)
  expect(()=>parseGradedMarketFeed(feed({quotes:[{...quote,grade:'unknown'}]}))).toThrow()
  expect(()=>parseGradedMarketFeed(feed({quotes:[{...quote,median30:-200}]}))).toThrow()
  expect(()=>parseGradedMarketFeed(feed({quotes:[quote,quote]}))).toThrow(/dupliquée/)
 })
 it('conserve les jours historiques sans combler les jours sans vente',()=>{
  const later=feed({generatedAt:'2026-10-22T10:00:00Z',quotes:[{...quote,fetchedAt:'2026-10-22T10:00:00Z',median30:270,history:[{date:'2026-10-22',averageEur:265,count:1}]}]})
  const combined=mergeGradedMarket(feed(),later)
  expect(combined.quotes[0].history.map(item=>item.date)).toEqual(['2026-10-18','2026-10-22'])
  expect(combined.quotes[0].median30).toBe(270)
  expect(gradedMarketForCard(combined,quote.cardKey)).toHaveLength(1)
 })
 it('ne remplace pas les anciennes observations par un flux inactif',()=>{
  expect(mergeGradedMarket(feed(),EMPTY_GRADED_MARKET).quotes).toHaveLength(1)
  const newer=feed({generatedAt:'2026-10-22T10:00:00Z',quotes:[{...quote,median30:270}]})
  expect(mergeGradedMarket(newer,feed()).quotes[0].median30).toBe(270)
  expect(quoteFreshness(quote,Date.parse('2026-10-27T10:00:00Z'))).toBe('stale')
  expect(quoteFreshness(quote,Date.parse('2026-10-27T09:59:59Z'))).toBe('aging')
  expect(quoteFreshness(quote,Date.parse('2026-10-22T10:00:00Z'))).toBe('aging')
 })
})
