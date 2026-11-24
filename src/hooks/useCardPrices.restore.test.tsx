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
  expect(row.history).toEqual([])
  view.unmount()
  const remounted = await renderPrices(id)
  expect(remounted.get().price?.value).toBe(35)
  remounted.unmount()
})

it('keeps a quote restored by synchronization while an earlier network request is still running', async () => {
  const id = 'synced-offer-002'
  let resolve!: (card: ExternalCard) => void
  vi.mocked(tcgDexProvider.getCard).mockImplementation(() => new Promise(done => {resolve = done}))
  const view = await renderPrices(id)
  expect(view.get().status).toBe('loading')
  await act(async () => recordPriceSnapshots(offer(id, 48)))
  expect(view.get().price?.value).toBe(48)
  await act(async () => resolve({id, language: 'fr', name: 'Test'}))
  expect(view.get().price?.value).toBe(48)
  view.unmount()
})
