import { describe, expect, it } from 'vitest'
import { buildStatsRows, currentCollectionPrice } from './collectionStats'
import { emptyCollection, upsertEntry } from './collection'
import { comparablePriceHistory, type PriceSnapshot } from './priceHistory'
import { createFavorite } from './favorites'
import { cards } from '../data'

const saved = (overrides = {}) => upsertEntry(emptyCollection(), { source: 'tcgdex', setId: '30th-c', cardId: '30th-c-4', language: 'fr', variant: 'normal', name: 'Dracaufeu', setName: 'Collection Classique', quantity: 2, condition: 'excellent', notes: 'À conserver', ...overrides }).entries[0]
const point = (overrides: Partial<PriceSnapshot> = {}): PriceSnapshot => ({ cardId: '30th-c-4', language: 'fr', date: '2026-10-18', value: 20, source: 'cardmarket', market: 'cardmarket-europe', currency: 'EUR', variant: 'normal', basis: 'guide', aggregator: 'tcgdex', condition: 'unknown', printingLanguage: 'unknown', aggregation: 'aggregate', metric: 'trend', quotes: [], ...overrides })
describe('collection statistics regressions', () => {
  it('keeps Dracaufeu and Magicarpe before, during and after unrelated price loading', () => {
    const entries = [saved(), saved({cardId: '30th-c-9', name: 'Magicarpe'})]
    const before = buildStatsRows([], entries, [], [])
    const after = buildStatsRows([], entries, [], [point(), point({cardId: 'other-1', value: 900})])
    expect(after.map(row => row.key)).toEqual(before.map(row => row.key))
    expect(after.map(row => row.name)).toEqual(['Dracaufeu', 'Magicarpe'])
    expect(after[1].value).toBeUndefined()
  })
  it('never borrows a standard price or ownership for a Jumbo', () => {
    const rows = buildStatsRows([], [saved(), saved({setId: 'jumbo', setName: 'Jumbo', quantity: 1})], [], [point()])
    expect(rows).toHaveLength(2)
    expect(rows.find(row => row.setId === 'jumbo')).toMatchObject({owned: 1, value: undefined, history: []})
    expect(rows.find(row => row.setId === '30th-c')).toMatchObject({owned: 2, value: 20})
  })
  it('uses the personal value, including zero, without changing market movement', () => {
    const [row] = buildStatsRows([], [saved({manualPrice: 0, priceMode: 'manual'})], [], [point({date: '2026-10-17', value: 15}), point()])
    expect(row).toMatchObject({value: 0, manual: true, delta: 5, owned: 2})
  })
  it('ignores tombstones and keeps unsupported variants without borrowing a quote', () => {
    const rows = buildStatsRows([], [saved({quantity: 0}), saved({variant: 'reverse-holofoil'})], [], [point()])
    expect(rows).toHaveLength(1)
    expect(rows[0].value).toBeUndefined()
  })
  it('resolves editorial favorites to the actual card identity', () => {
    const card = cards.find(card => card.tcgdexId)!
    const favorite = createFavorite({source: 'editorial', cardId: card.id, language: card.language, name: card.name, setName: card.set})
    const rows = buildStatsRows([card], [], [favorite], [])
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(card.tcgdexId)
  })
  it('does not turn a partly unpriced group into a false complete value', () => {
    expect(currentCollectionPrice(undefined, [saved({manualPrice: 40}), saved({cardId:'x'})]).value).toBeUndefined()
  })
  it('compares EUR guide prices only and chooses the latest daily observation deterministically', () => {
    const points = [point({date:'2026-10-17',value:15}), point({recordedAt:'2026-10-18T08:00:00Z'}), point({value:22,recordedAt:'2026-10-18T09:00:00Z',externalProductId:'new'}), point({source:'tcgplayer',market:'tcgplayer-north-america',currency:'USD',value:200}), point({currency:'USD',value:300}), point({variant:'reverse-holofoil',value:400}), point({basis:'listing',value:5}), point({language:'ja',value:800})]
    expect(comparablePriceHistory(points).map(point=>point.value)).toEqual([15,22])
    expect(comparablePriceHistory([...points].reverse())).toEqual(comparablePriceHistory(points))
    expect(buildStatsRows([], [saved()], [], points)[0].delta).toBe(7)
  })
})
