// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { tcgDexProvider } from '../api/tcgdex'
import { useCardPrices, type CardPriceState } from './useCardPrices'
import { recordPriceSnapshots, snapshotsFromQuotes, getAllPriceHistory } from '../domain/priceHistory'
import { buildStatsRows } from '../domain/collectionStats'
import { reviewedMarketData } from '../domain/reviewedPrices'
import type { ExternalCard } from '../domain/cards'
import { emptyCollection, upsertEntry } from '../domain/collection'

vi.mock('../api/tcgdex', () => ({tcgDexProvider: {getCard: vi.fn()}}))
afterEach(() => { localStorage.clear(); vi.clearAllMocks() })

async function renderPrices(id: string) {
  Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true})
  let state: CardPriceState | undefined
  function Prices() { state = useCardPrices([id], 'fr')[id]; return null }
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(createElement(Prices)))
  return {get: () => state!, unmount: () => act(() => root.unmount())}
}
const offer = (id: string, value = 35) => snapshotsFromQuotes(id, reviewedMarketData('me06-138', 'fr')!.quotes.map(quote => ({...quote, value, validUntil: '2099-12-01'})))

it('restores saved offers with all their restrictions, then retains them after an unverified response and remount', async () => {
  const id = 'restored-offer-001'
  vi.mocked(tcgDexProvider.getCard).mockResolvedValue({id, language: 'fr', name: 'Test', pricing: {cardmarket: {trend: 0.02}}})
  recordPriceSnapshots(offer(id))
  const view = await renderPrices(id)
  expect(view.get()).toMatchObject({verification: 'verified', retained: true, price: {value: 35, basis: 'listing', condition: 'near-mint', aggregator: 'manakodex', validUntil: '2099-12-01'}})
  expect(view.get().price?.listingUrl).toContain('language=2')
  expect(view.get().price?.sourceUrl).toBeTruthy()
  const saved = upsertEntry(emptyCollection(), {source: 'tcgdex', setId: 'restored-offer', cardId: id, name: 'Test', setName: 'Test', language: 'fr', variant: 'normal', quantity: 1, condition: 'near-mint', notes: ''})
  const [row] = buildStatsRows([], saved.entries, [], getAllPriceHistory())
  expect(row.value).toBe(view.get().price?.value)
  expect(row.history.every(point=>point.printingLanguage==='unknown')).toBe(true)
  view.unmount()
  const remounted = await renderPrices(id)
  expect(remounted.get().price?.value).toBe(35)
  remounted.unmount()
})

it('keeps a quote restored by synchronization while an earlier network request is still running', async () => {
  const id = 'synced-offer-002'
  let resolve!: (card: ExternalCard) => void
  vi.mocked(tcgDexProvider.getCard).mockImplementation((id,language) => language==='en' ? Promise.resolve({id,language,name:'Test'}) : new Promise(done => {resolve = done}))
  const view = await renderPrices(id)
  expect(view.get().status).toBe('loading')
  await act(async () => recordPriceSnapshots(offer(id, 48)))
  expect(view.get().price?.value).toBe(48)
  await act(async () => resolve({id, language: 'fr', name: 'Test'}))
  expect(view.get().price?.value).toBe(48)
  view.unmount()
})

it('restores an estimate, bypasses the browser cache and counts a newer automatic quote in the same total',async()=>{
 const {collectMarketPriceQuotes}=await import('../domain/pricing')
 const id='estimated-automatic-003'
 recordPriceSnapshots(snapshotsFromQuotes(id,collectMarketPriceQuotes({cardmarket:{trend:20,updated:'2026-11-20'}},'fr')))
 vi.mocked(tcgDexProvider.getCard).mockResolvedValue({id,language:'fr',name:'Test',pricing:{cardmarket:{trend:24,updated:'2026-11-25',unit:'EUR'}}})
 const view=await renderPrices(id)
 expect(tcgDexProvider.getCard).toHaveBeenCalledWith(id,'fr',true)
 expect(view.get().price).toMatchObject({value:24,identityVerified:false,printingLanguage:'unknown'})
 const saved=upsertEntry(emptyCollection(),{source:'tcgdex',cardId:id,setId:'estimated',name:'Test',setName:'Test',language:'fr',variant:'normal',quantity:3,condition:'near-mint',notes:''})
 const [row]=buildStatsRows([],saved.entries,[],getAllPriceHistory())
 expect(row.value!*row.owned).toBe(72)
 view.unmount()
})

it('uses the same card’s English Cardmarket EUR estimate when the French catalogue has no price',async()=>{
 const id='english-fallback-004'
 vi.mocked(tcgDexProvider.getCard).mockImplementation(async(cardId,language)=>({id:cardId,language:language!,name:'Test',pricing:language==='en'?{cardmarket:{trend:18,unit:'EUR',updated:'2026-11-25'},tcgplayer:{normal:{marketPrice:99}}}:undefined}))
 const view=await renderPrices(id)
 expect(tcgDexProvider.getCard).toHaveBeenCalledWith(id,'en',true)
 expect(view.get().price).toMatchObject({value:18,currency:'EUR',identityVerified:false,printingLanguage:'unknown',catalogLanguage:'fr',sourceUrl:expect.stringContaining('/en/cards/')})
 expect(view.get().tcgplayerQuote).toBeUndefined()
 expect(getAllPriceHistory().find(point=>point.cardId===id)).toMatchObject({language:'fr',currency:'EUR',value:18,printingLanguage:'unknown'})
 view.unmount()
})
