/** Device-local storage, no account, remote service or backend. */
export async function openPriceHistoryDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pokevalue-prices', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('history')
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => db.close()
      resolve(db)
    }
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Ferme les autres onglets PokéValue pour ouvrir l’historique.'))
  })
}

export function readPriceHistoryDatabase(db: IDBDatabase): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('history', 'readonly')
    const request = transaction.objectStore('history').get('snapshots')
    transaction.oncomplete = () => resolve(request.result)
    transaction.onabort = transaction.onerror = () => reject(transaction.error)
  })
}

/** Merge inside the read/write transaction, so other tabs cannot overwrite newer records. */
export function mergePriceHistoryDatabase<T>(db: IDBDatabase, incoming: T[], merge: (stored: unknown, incoming: T[]) => T[]): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('history', 'readwrite')
    const store = transaction.objectStore('history')
    const request = store.get('snapshots')
    let result: T[]
    request.onsuccess = () => {
      try { result = merge(request.result, incoming); store.put(result, 'snapshots') }
      catch { transaction.abort() }
    }
    transaction.oncomplete = () => resolve(result)
    transaction.onabort = transaction.onerror = () => reject(transaction.error ?? new Error('Historique non enregistré'))
  })
}
