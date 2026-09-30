import { useEffect, useReducer } from 'react'
import { tcgDexProvider } from '../api/tcgdex'
import { selectCardmarketPrice, type PriceReference } from '../domain/pricing'

type CachedPrice = { status: 'loading' | 'success' | 'error'; price?: PriceReference | null }
const cache = new Map<string, CachedPrice>()
const listeners = new Set<() => void>()
const queue: string[] = []
const queued = new Set<string>()
let running = 0
const CONCURRENCY = 7

function notify() { listeners.forEach(listener => listener()) }
function drain() {
  while (running < CONCURRENCY && queue.length) {
    const id = queue.shift()!; queued.delete(id); running += 1; cache.set(id, { status: 'loading' }); notify()
    tcgDexProvider.getCard(id, 'fr').then(card => cache.set(id, { status: 'success', price: selectCardmarketPrice(card.pricing) ?? null }))
      .catch(() => cache.set(id, { status: 'error' })).finally(() => { running -= 1; notify(); drain() })
  }
}
function enqueue(ids: string[]) {
  for (const id of ids) if (!cache.has(id) && !queued.has(id)) { queued.add(id); queue.push(id) }
  drain()
}

export function useCardPrices(cardIds: string[]) {
  const [, rerender] = useReducer(value => value + 1, 0)
  const key = [...new Set(cardIds)].join('|')
  useEffect(() => { const listener = () => rerender(); listeners.add(listener); enqueue(key ? key.split('|') : []); return () => { listeners.delete(listener) } }, [key])
  const prices: Record<string, CachedPrice> = {}
  for (const id of cardIds) prices[id] = cache.get(id) ?? { status: 'loading' }
  return prices
}
