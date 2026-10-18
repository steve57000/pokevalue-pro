import type { Card } from '../types'
import { collectionUnitPrice, printingKey, setIdFromCardId, type CollectionEntry } from './collection'
import type { FavoriteCard } from './favorites'
import { comparablePriceHistory, type PriceSnapshot } from './priceHistory'
import { normalizeImageLanguage } from './image'

export type StatsRow = {
  key: string; id: string; setId: string; language: string; variant: string
  name: string; setName: string; number?: string; image?: string
  owned: number; value?: number; manual: boolean; history: PriceSnapshot[]; delta?: number
}

export function currentCollectionPrice(latest: number | undefined, entries: CollectionEntry[]) {
  const owned = entries.filter(entry => entry.quantity > 0)
  const quantity = owned.reduce((sum, entry) => sum + entry.quantity, 0)
  if (!quantity) return { value: latest, manual: false }
  const values = owned.map(entry => collectionUnitPrice(entry, latest))
  return {
    value: values.some(value => value === undefined) ? undefined : values.reduce<number>((sum, value, i) => sum + value! * owned[i].quantity, 0) / quantity,
    manual: owned.some(entry => (entry.priceMode ?? (entry.manualPrice !== undefined ? 'manual' : 'market')) === 'manual'),
  }
}

/** Membership comes from saved identities, never from whichever prices finished loading. */
export function buildStatsRows(cards: Card[], entries: CollectionEntry[], favorites: FavoriteCard[], snapshots: PriceSnapshot[]): StatsRow[] {
  const rows = new Map<string, StatsRow>()
  const add = (input: Omit<StatsRow, 'key' | 'owned' | 'manual' | 'history'>) => {
    const key = printingKey({ source: 'tcgdex', cardId: input.id, ...input })
    const previous = rows.get(key)
    rows.set(key, { ...previous, ...input, key, owned: previous?.owned ?? 0, manual: false, history: [] })
    return key
  }
  for (const card of cards) if (card.tcgdexId) add({ id: card.tcgdexId, setId: setIdFromCardId(card.tcgdexId), language: normalizeImageLanguage(card.language), variant: 'normal', name: card.name, setName: card.set, number: card.number })
  for (const favorite of favorites) {
    const editorial = favorite.source === 'editorial' ? cards.find(card => card.id === favorite.cardId) : undefined
    const id = editorial?.tcgdexId ?? (favorite.source === 'tcgdex' ? favorite.cardId : undefined)
    if (id) add({ id, setId: favorite.setId ?? setIdFromCardId(id), language: normalizeImageLanguage(favorite.language), variant: 'normal', name: favorite.name, setName: favorite.setName, number: favorite.localId, image: favorite.image })
  }
  const ownedByKey = new Map<string, CollectionEntry[]>()
  for (const entry of entries) if (entry.quantity > 0) {
    const key = add({ id: entry.cardId, setId: entry.setId, language: normalizeImageLanguage(entry.language), variant: entry.variant, name: entry.name, setName: entry.setName, number: entry.number, image: entry.image })
    rows.get(key)!.owned += entry.quantity
    ownedByKey.set(key, [...(ownedByKey.get(key) ?? []), entry])
  }
  const histories = new Map<string, PriceSnapshot[]>()
  for (const point of comparablePriceHistory(snapshots)) {
    const key = `${point.language}:${point.cardId}`
    histories.set(key, [...(histories.get(key) ?? []), point])
  }
  for (const row of rows.values()) {
    row.history = row.setId === 'jumbo' || row.variant !== 'normal' ? [] : histories.get(`${row.language}:${row.id}`) ?? []
    const latest = row.history[row.history.length - 1], previous = row.history[row.history.length - 2]
    Object.assign(row, currentCollectionPrice(latest?.value, ownedByKey.get(row.key) ?? []))
    row.delta = latest && previous ? latest.value - previous.value : undefined
  }
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr') || a.setName.localeCompare(b.setName, 'fr') || (a.number ?? '').localeCompare(b.number ?? '', 'fr', { numeric: true }) || a.key.localeCompare(b.key))
}
