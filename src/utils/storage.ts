export function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : fallback
  } catch {
    return fallback
  }
}

export function readStoredStringArray(key: string): string[] {
  const value = readStoredJson<unknown>(key, [])
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}
