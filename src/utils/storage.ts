export const STORAGE_WARNING_EVENT = 'pv-storage-warning'
type StorageArea = 'local' | 'session'

function storageFor(area: StorageArea): Storage | undefined {
  if (typeof window === 'undefined') return undefined
  try { return area === 'session' ? window.sessionStorage : window.localStorage } catch { return undefined }
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
    storage.setItem(key, value)
    return true
  } catch {
    if (notifyFailure && area === 'local' && typeof window !== 'undefined') window.dispatchEvent(new Event(STORAGE_WARNING_EVENT))
    return false
  }
}

export function removeStoredValue(key: string): boolean {
  try {
    const storage = storageFor('local')
    if (!storage) throw new Error('Storage unavailable')
    storage.removeItem(key)
    return true
  } catch {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(STORAGE_WARNING_EVENT))
    return false
  }
}

export function writeStoredJson(key: string, value: unknown, area: StorageArea = 'local', notifyFailure = true): boolean {
  try {
    const serialized = JSON.stringify(value)
    if (serialized === undefined) throw new Error('Value is not serializable')
    return writeStoredString(key, serialized, area, notifyFailure)
  } catch {
    if (notifyFailure && area === 'local' && typeof window !== 'undefined') window.dispatchEvent(new Event(STORAGE_WARNING_EVENT))
    return false
  }
}

export function readStoredStringArray(key: string): string[] {
  const value = readStoredJson<unknown>(key, [])
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}
