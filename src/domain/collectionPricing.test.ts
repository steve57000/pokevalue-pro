import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildStatsRows } from './collectionStats'
import { emptyCollection, upsertEntry } from './collection'
import type { PriceSnapshot } from './priceHistory'

const entry = (overrides = {}) => upsertEntry(emptyCollection(), {
  source: 'tcgdex', setId: 'test', cardId: 'test-001', language: 'fr', variant: 'normal',
  name: 'Carte test', setName: 'Extension test', quantity: 3, condition: 'near-mint', notes: '', ...overrides,
}).entries[0]
const point = (overrides: Partial<PriceSnapshot> = {}): PriceSnapshot => ({
  cardId: 'test-001', language: 'fr', date: '2026-11-20', value: 12,
  source: 'cardmarket', aggregator: 'tcgdex', market: 'cardmarket-europe', currency: 'EUR',
  printingLanguage: 'unknown', variant: 'normal', condition: 'unknown', basis: 'guide',
  aggregation: 'aggregate', metric: 'trend', quotes: [], ...overrides,
})
afterEach(() => vi.useRealTimers())

describe('unified collection estimates', () => {
  it('counts archived estimates once in the total without marking them verified', () => {
    const [row] = buildStatsRows([], [entry()], [], [point()])
    expect(row).toMatchObject({owned: 3, value: 12, indicative: {value: 12}})
    expect(row.indicative!.value * row.owned).toBe(36)
  })
  it('uses only the latest source observation once, regardless of backup import order', () => {
    const old = point({value: 8, sourceUpdatedAt: '2026-11-19', recordedAt: '2026-11-24'})
    const recent = point({value: 12, sourceUpdatedAt: '2026-11-20', recordedAt: '2026-11-21'})
    for (const points of [[old, recent], [recent, old]]) {
      expect(buildStatsRows([], [entry()], [], points)[0].indicative?.value).toBe(12)
    }
  })
  it('does not borrow another currency, language, finish, Jumbo price or rejected Delta mapping', () => {
    const unsuitable = [point({currency: 'USD'}), point({language: 'en'}), point({printingLanguage: 'en'}), point({variant: 'reverse-holofoil'}), point({source: 'tcgplayer'})]
    expect(buildStatsRows([], [entry()], [], unsuitable)[0].indicative).toBeUndefined()
    expect(buildStatsRows([], [entry({setId: 'jumbo'})], [], [point()])[0].indicative).toBeUndefined()
    expect(buildStatsRows([], [entry({cardId: 'me06-138', setId: 'me06'})], [], [point({cardId: 'me06-138'})])[0].indicative).toBeUndefined()
  })
  it('prefers a verified quote or explicit personal override without double counting', () => {
    const verified = point({identityVerified: true, printingLanguage: 'fr', value: 20})
    const [row] = buildStatsRows([], [entry()], [], [point(), verified])
    expect(row.value).toBe(20)
    expect(row.indicative).toBeUndefined()
    for (const manualPrice of [0, 15]) {
      const [manual] = buildStatsRows([], [entry({manualPrice, priceMode: 'manual'})], [], [point()])
      expect(manual).toMatchObject({value: manualPrice, manual: true})
      expect(manual.indicative).toBeUndefined()
    }
  })
  it('keeps dormant personal prices visible while respecting the explicit market choice', () => {
    expect(buildStatsRows([], [entry({manualPrice: 17, priceMode: 'market'})], [], [point()])[0])
      .toMatchObject({value: 12, manual: false, savedManualPrice: 17, indicative: {value: 12}})
  })
  it('keeps expired offers in the total while rejecting the wrong condition', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-24T12:00:00Z'))
    const offer = point({identityVerified: true, printingLanguage: 'fr', basis: 'listing', condition: 'near-mint', validUntil: '2026-11-23'})
    expect(buildStatsRows([], [entry()], [], [offer])[0])
      .toMatchObject({value: 12, indicative: {value: 12, identityVerified: true}})
    expect(buildStatsRows([], [entry({condition: 'good'})], [], [{...offer, validUntil: '2026-12-01'}])[0])
      .toMatchObject({value: undefined, indicative: undefined, missingReason: 'condition'})
  })
})
