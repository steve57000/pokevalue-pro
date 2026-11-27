import {describe,it,expect,vi,afterEach} from 'vitest'
import {localizedMarketData} from './localizedPricing'
import {reviewedMarketData} from './reviewedPrices'
import {retainKnownPrices} from '../hooks/useCardPrices'
import {buildStatsRows} from './collectionStats'
import {snapshotsFromQuotes,comparablePriceHistory,parsePriceHistoryDocument,mergePriceHistory} from './priceHistory'
import {collectMarketPriceQuotes,collectionMarketValue} from './pricing'
import {buildCardmarketUrl} from './cardmarket'
import {emptyCollection,upsertEntry} from './collection'
import data from '../data/reviewedDeltaPrices.json'
import type {ExternalCard} from './cards'

const response=(language='fr',id='unreviewed-138'):ExternalCard=>({id,name:'Méga-Rayquaza-ex',language,pricing:{cardmarket:{idProduct:918912,unit:'EUR',trend:0.02,avg7:6.72},tcgplayer:{holofoil:{productId:728061,marketPrice:319.52}}}})
afterEach(()=>vi.useRealTimers())
describe('exact printing price policy',()=>{
 for(const language of ['fr','en','ja','zh-tw'])it(`never treats the ${language} catalogue as evidence of sale language`,()=>{
  const result=localizedMarketData(response(language))
  expect(result.verification).toBe('unverified')
  if (language==='fr'||language==='en') {
   expect(result.price).toMatchObject({value:0.02,printingLanguage:'unknown',identityVerified:false,catalogLanguage:language})
   expect(result.quotes.length).toBeGreaterThan(0)
   expect(collectionMarketValue(result.price,language)).toBe(0.02)
  } else {
   expect(result.price).toBeNull(); expect(result.quotes).toEqual([])
  }
 })
 it('replaces the shared 0.02 / 5.69 product with distinct, sourced Rayquaza observations',()=>{
  for(const [id,fr,en] of [['me06-084',1.5,2.5],['me06-138',430,245.81],['me06-141',223,189]] as const){
   for(const [language,value]of [['fr',fr],['en',en]] as const){
    const result=localizedMarketData(response(language,id))
    expect(result.price).toMatchObject({value,printingLanguage:language,basis:'listing',condition:'near-mint',identityVerified:true})
    expect(result.quotes).toHaveLength(1)
    expect(result.quotes[0].externalProductId).toContain(id.slice(-3))
    expect(result.cardmarket?.trend).toBeUndefined()
    expect(result.price?.sourceUrl).toBe(data.sourceUrl)
   }
  }
 })
 it('requires independent evidence for both identity and language for other adapters',()=>{
  const card=response()
  card.priceVerification={cardId:card.id,printingLanguage:'fr',identityVerified:true,variant:'normal'}
  expect(localizedMarketData(card).price?.value).toBe(0.02)
  card.priceVerification.printingLanguage='en'
  expect(localizedMarketData(card).price).toBeNull()
  card.priceVerification.printingLanguage='fr';card.priceVerification.cardId='me06-084'
  expect(localizedMarketData(card).price).toBeNull()
  expect(localizedMarketData(response('fr','me06-138'),undefined,{id:'me06-141',language:'fr'}).price).toBeNull()
 })
 it('never leaks reviewed French/English prices to Asian editions or the rejected energy mapping',()=>{
  for(const language of ['ja','zh-tw'])expect(localizedMarketData(response(language,'me06-138')).price).toBeNull()
  expect(localizedMarketData(response('fr','me06-132')).price).toBeNull()
 })
 it('checks every reviewed number, language, timestamp and distinct external product',()=>{
  expect(data.cards).toHaveLength(140)
  expect(new Set(data.cards.map(card=>card.marketUrl)).size).toBe(140)
  for(const card of data.cards){
   expect(new URL(card.marketUrl).pathname.endsWith('DLR'+card.number)).toBe(true)
   for(const language of ['fr','en']as const){
    const result=reviewedMarketData(card.id,language)!
    expect(result.price.value).toBeGreaterThan(0)
    expect(Date.parse(result.price.updatedAt!)).toBeLessThanOrEqual(Date.parse(data.capturedAt))
    expect(new URL(result.price.listingUrl!).searchParams.get('language')).toBe(language==='fr'?'2':'1')
   }
  }
 })
 it('invalidates unsafe retained history and never lets it override a reviewed listing',()=>{
  const previous={status:'success' as const,language:'fr',price:{value:5.69,currency:'EUR' as const,provider:'cardmarket' as const,basis:'guide' as const,label:'Tendance Cardmarket' as const}}
  expect(retainKnownPrices(previous,{status:'success',language:'fr',...localizedMarketData(response())}).price).toMatchObject({value:0.02,identityVerified:false})
  expect(retainKnownPrices(previous,{status:'success',language:'fr',...localizedMarketData(response('fr','me06-138'))}).price?.value).toBe(430)
 })
 it('preserves old local or remote history for audit but excludes it from values and charts',()=>{
  const snapshots=snapshotsFromQuotes('me06-138',collectMarketPriceQuotes(response().pricing,'fr'),'2026-11-08')
  const restored=parsePriceHistoryDocument({schemaVersion:2,updatedAt:'2026-11-08T10:00:00Z',snapshots}).snapshots
  expect(restored).toHaveLength(2)
  expect(comparablePriceHistory(restored)).toEqual([])
  const entry=upsertEntry(emptyCollection(),{source:'tcgdex',cardId:'me06-138',setId:'me06',name:'Rayquaza',setName:'Delta',language:'fr',variant:'normal',quantity:2,condition:'near-mint',notes:''}).entries[0]
  expect(buildStatsRows([], [entry],[],restored)[0]).toMatchObject({value:undefined,owned:2,history:[]})
  expect(buildStatsRows([], [{...entry,manualPrice:449,priceMode:'manual'}],[],restored)[0]).toMatchObject({value:449,manual:true,owned:2})
  expect(buildStatsRows([], [{...entry,manualPrice:0,priceMode:'manual'}],[],restored)[0].value).toBe(0)
 })
 it('persists the source date without inventing daily price changes and values only suitable copies',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-23T12:00:00Z'))
  const reviewed=reviewedMarketData('me06-138','fr')!
  const first=snapshotsFromQuotes('me06-138',reviewed.quotes,'2026-11-23'),second=snapshotsFromQuotes('me06-138',reviewed.quotes,'2026-11-24')
  const points=parsePriceHistoryDocument({schemaVersion:2,updatedAt:data.capturedAt,snapshots:mergePriceHistory(first,second)}).snapshots
  expect(points).toHaveLength(1)
  expect(points[0]).toMatchObject({date:'2026-11-23',sourceUrl:data.sourceUrl,identityVerified:true,basis:'listing'})
  expect(comparablePriceHistory(points)).toEqual([])
  const entry=upsertEntry(emptyCollection(),{source:'tcgdex',cardId:'me06-138',setId:'me06',name:'Rayquaza',setName:'Delta',language:'fr',variant:'normal',quantity:2,condition:'near-mint',notes:''}).entries[0]
  expect(buildStatsRows([], [entry],[],points)[0]).toMatchObject({value:430,owned:2,history:[]})
  expect(buildStatsRows([], [{...entry,condition:'played'}],[],points)[0].value).toBeUndefined()
  expect(collectionMarketValue(reviewed.price,'en','near-mint')).toBeUndefined()
  expect(collectionMarketValue(reviewed.price,'fr','played')).toBeUndefined()
  vi.setSystemTime(new Date('2026-12-08T00:00:00Z'))
  expect(collectionMarketValue(reviewed.price,'fr','near-mint')).toBe(430)
  expect(buildStatsRows([], [entry],[],points)[0]).toMatchObject({value:430,indicative:{value:430}})
  expect(buildStatsRows([], [{...entry,manualPrice:600,priceMode:'manual'}],[],points)[0].value).toBe(600)
 })
 it('filters Cardmarket searches by physical language, independently of the site interface',()=>{
  for(const [language,id] of [['fr','2'],['en','1'],['ja','7'],['zh-tw','11']]){
   const url=new URL(buildCardmarketUrl({name:'Rayquaza',localId:'138',language}))
   expect(url.searchParams.get('language')).toBe(id)
   expect(url.searchParams.get('searchString')).toContain('138')
  }
 })
})
