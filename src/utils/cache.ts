export type CacheEntry<T> = { version: number; savedAt: number; data: T }

export const CACHE_VERSION = 2
export const LIVE_CARD_TTL_MS = 60 * 60 * 1000
export const STALE_WHILE_REFRESH_MS = 24 * 60 * 60 * 1000

const memoryCache = new Map<string, CacheEntry<unknown>>()

const hasLocalStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
const storageKey = (key: string) => `pokevalue:${CACHE_VERSION}:${key}`

export function getCached<T>(key: string, now = Date.now()): { data: T; isFresh: boolean; isStale: boolean } | undefined {
  const memory = memoryCache.get(key) as CacheEntry<T> | undefined
  const entry = memory ?? readLocal<T>(key)
  if (!entry || entry.version !== CACHE_VERSION) return undefined

  const age = now - entry.savedAt
  if (age <= LIVE_CARD_TTL_MS) return { data: entry.data, isFresh: true, isStale: false }
  if (age <= STALE_WHILE_REFRESH_MS) return { data: entry.data, isFresh: false, isStale: true }
  return undefined
}

export function setCached<T>(key: string, data: T, now = Date.now()): void {
  const entry: CacheEntry<T> = { version: CACHE_VERSION, savedAt: now, data }
  memoryCache.set(key, entry)
  if (!hasLocalStorage()) return
  window.localStorage.setItem(storageKey(key), JSON.stringify(entry))
}

function readLocal<T>(key: string): CacheEntry<T> | undefined {
  if (!hasLocalStorage()) return undefined
  try {
    const raw = window.localStorage.getItem(storageKey(key))
    if (!raw) return undefined
    return JSON.parse(raw) as CacheEntry<T>
  } catch {
    return undefined
  }
}
