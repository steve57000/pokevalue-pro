export const STORAGE_WARNING_EVENT = 'pv-storage-warning'
export const STORAGE_RECOVERED_EVENT = 'pv-storage-recovered'
type StorageArea = 'local' | 'session'
const OPTIONAL_CACHE_PREFIX = 'pokevalue:'
const PRICE_HISTORY_KEY = 'price-history-v1'

/** Price history is derived data; retain recent points when a device is near its quota. */
function compactPriceHistory(storage: Storage, incomingValue?: string, maxSnapshots = 500): string | undefined {
  try {
    const raw = incomingValue ?? storage.getItem(PRICE_HISTORY_KEY) ?? undefined
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as unknown
    const compacted = Array.isArray(parsed)
      ? parsed.slice(-maxSnapshots)
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { snapshots?: unknown }).snapshots)
        ? { ...parsed, snapshots: (parsed as { snapshots: unknown[] }).snapshots.slice(-maxSnapshots) }
        : undefined
    if (compacted === undefined) return undefined
    const serialized = JSON.stringify(compacted)
    if (incomingValue !== undefined) return serialized
    storage.setItem(PRICE_HISTORY_KEY, serialized)
    return serialized
  } catch { return undefined }
}

function isQuotaExceeded(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { name?: string; code?: number }
  return candidate.name === 'QuotaExceededError'
    || candidate.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || candidate.code === 22
    || candidate.code === 1014
}

function removeOptionalCache(storage: Storage): boolean {
  let removed = false
  try {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index)
      if (key?.startsWith(OPTIONAL_CACHE_PREFIX)) {
        storage.removeItem(key)
        removed = true
      }
    }
  } catch {
    return false
  }
  return removed
}

function setStoredValue(storage: Storage, key: string, value: string, area: StorageArea): void {
  let valueToWrite = value
  try {
    storage.setItem(key, valueToWrite)
  } catch (error) {
    // Catalogue responses are disposable. Free their space before giving up on user data.
    if (area !== 'local' || key.startsWith(OPTIONAL_CACHE_PREFIX) || !isQuotaExceeded(error)) throw error
    removeOptionalCache(storage)
    if (key === PRICE_HISTORY_KEY) valueToWrite = compactPriceHistory(storage, value) ?? value
    else compactPriceHistory(storage)
    try { storage.setItem(key, valueToWrite) } catch (retryError) {
      if (!isQuotaExceeded(retryError)) throw retryError
      // A compact recent history still leaves the collection the best chance to save.
      if (key === PRICE_HISTORY_KEY) valueToWrite = compactPriceHistory(storage, valueToWrite, 100) ?? valueToWrite
      else compactPriceHistory(storage, undefined, 100)
      storage.setItem(key, valueToWrite)
    }
  }
}

function notifyStorageFailure(key: string, area: StorageArea): void {
  if (area === 'local' && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STORAGE_WARNING_EVENT, { detail: { key } }))
  }
}

function notifyStorageRecovered(key: string, area: StorageArea): void {
  if (area === 'local' && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STORAGE_RECOVERED_EVENT, { detail: { key } }))
  }
}

function storageFor(area: StorageArea): Storage | undefined {
  try {
    if (typeof window !== 'undefined') return area === 'session' ? window.sessionStorage : window.localStorage
    const root = globalThis as typeof globalThis & { localStorage?: Storage; sessionStorage?: Storage }
    return area === 'session' ? root.sessionStorage : root.localStorage
  } catch { return undefined }
}

export function readStoredJson<T>(key: string, fallback: T, area: StorageArea = 'local'): T {
  try {
    const stored = storageFor(area)?.getItem(key)
    return stored ? (JSON.parse(stored) as T) : fallback
  } catch {
    return fallback
  }
}

export function readStoredString(key: string, fallback = '', area: StorageArea = 'local'): string {
  try { return storageFor(area)?.getItem(key) ?? fallback } catch { return fallback }
}

export function writeStoredString(key: string, value: string, area: StorageArea = 'local', notifyFailure = true): boolean {
  try {
    const storage = storageFor(area)
    if (!storage) throw new Error('Storage unavailable')
    setStoredValue(storage, key, value, area)
    notifyStorageRecovered(key, area)
    return true
  } catch {
    if (notifyFailure) notifyStorageFailure(key, area)
    return false
  }
}

export function removeStoredValue(key: string): boolean {
  try {
    const storage = storageFor('local')
    if (!storage) throw new Error('Storage unavailable')
    storage.removeItem(key)
    notifyStorageRecovered(key, 'local')
    return true
  } catch {
    notifyStorageFailure(key, 'local')
    return false
  }
}

export function writeStoredJson(key: string, value: unknown, area: StorageArea = 'local', notifyFailure = true): boolean {
  try {
    const serialized = JSON.stringify(value)
    if (serialized === undefined) throw new Error('Value is not serializable')
    return writeStoredString(key, serialized, area, notifyFailure)
  } catch {
    if (notifyFailure) notifyStorageFailure(key, area)
    return false
  }
}

export function readStoredStringArray(key: string): string[] {
  const value = readStoredJson<unknown>(key, [])
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}
