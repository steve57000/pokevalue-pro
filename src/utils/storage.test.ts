import { afterEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_RECOVERED_EVENT, STORAGE_WARNING_EVENT, writeStoredJson } from './storage'

function quotaError() {
  const error = new Error('Storage quota exceeded')
  error.name = 'QuotaExceededError'
  return error
}

function createStorage(shouldFail: (key: string, values: Map<string, string>) => boolean) {
  const values = new Map<string, string>()
  const storage: Storage = {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key) },
    setItem: (key, value) => {
      if (shouldFail(key, values)) throw quotaError()
      values.set(key, String(value))
    },
  }
  return { storage, values }
}

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
  else Reflect.deleteProperty(globalThis, 'window')
})

describe('local storage recovery', () => {
  it('evicts disposable catalogue cache and retries a collection save on quota errors', () => {
    const { storage, values } = createStorage((key, current) => key === 'pv-portfolio-v1' && [...current.keys()].some(item => item.startsWith('pokevalue:')))
    values.set('pokevalue:3:sv-01', 'cached catalogue')
    values.set('pv-favorites-v2', '["pikachu"]')
    const dispatchEvent = vi.fn()
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage, dispatchEvent } })

    const document = { schemaVersion: 1, revision: 2, entries: [{ cardId: 'sv01-1' }] }
    expect(writeStoredJson('pv-portfolio-v1', document)).toBe(true)
    expect(JSON.parse(values.get('pv-portfolio-v1')!)).toEqual(document)
    expect(values.has('pokevalue:3:sv-01')).toBe(false)
    expect(values.get('pv-favorites-v2')).toBe('["pikachu"]')
    expect(dispatchEvent.mock.calls.map(([event]) => (event as CustomEvent).type)).toEqual([STORAGE_RECOVERED_EVENT])
  })

  it('reports the key when a durable save still fails after cache eviction', () => {
    const { storage, values } = createStorage(key => key === 'pv-portfolio-v1')
    values.set('pokevalue:3:sv-01', 'cached catalogue')
    const dispatchEvent = vi.fn()
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage, dispatchEvent } })

    expect(writeStoredJson('pv-portfolio-v1', { schemaVersion: 1, revision: 2, entries: [] })).toBe(false)
    expect(values.has('pokevalue:3:sv-01')).toBe(false)
    expect(dispatchEvent).toHaveBeenCalledOnce()
    const event = dispatchEvent.mock.calls[0][0] as CustomEvent<{ key: string }>
    expect(event.type).toBe(STORAGE_WARNING_EVENT)
    expect(event.detail.key).toBe('pv-portfolio-v1')
  })

  it('reports a failed save without silently deleting another card’s history', () => {
    const { storage, values } = createStorage((key, current) => {
      if (key !== 'pv-portfolio-v1') return false
      const history = JSON.parse(current.get('price-history-v1') ?? '[]') as unknown[]
      return history.length > 500
    })
    values.set('price-history-v1', JSON.stringify(Array.from({ length: 800 }, (_, index) => ({ index }))))
    const dispatchEvent = vi.fn()
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage, dispatchEvent } })

    expect(writeStoredJson('pv-portfolio-v1', { schemaVersion: 1, entries: [{ manualPrice: 12.5 }] })).toBe(false)
    expect(JSON.parse(values.get('price-history-v1')!)).toHaveLength(800)
    expect(JSON.parse(values.get('price-history-v1')!)[0]).toEqual({ index: 0 })
    expect(dispatchEvent.mock.calls.map(([event]) => (event as CustomEvent).type)).toEqual([STORAGE_WARNING_EVENT])
  })
})
