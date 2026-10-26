import { useEffect, useState } from 'react'
import { getAllPriceHistory, getHistoryPersistence, initializePriceHistory, PRICE_HISTORY_STORAGE_KEY } from '../domain/priceHistory'

export function usePriceHistory() {
  const [snapshots, setSnapshots] = useState(getAllPriceHistory)
  const [persistence, setPersistence] = useState(getHistoryPersistence)
  useEffect(() => {
    let active = true
    const update = () => { if(active)setSnapshots(getAllPriceHistory()) }
    const status = () => setPersistence(getHistoryPersistence())
    const storage = (event: StorageEvent) => { if (event.key === PRICE_HISTORY_STORAGE_KEY) update() }
    window.addEventListener('pv-price-history-updated', update)
    window.addEventListener('pv-history-persistence', status)
    window.addEventListener('storage', storage)
    void initializePriceHistory().then(update)
    return () => {
      active = false
      window.removeEventListener('pv-price-history-updated', update)
      window.removeEventListener('pv-history-persistence', status)
      window.removeEventListener('storage', storage)
    }
  }, [])
  return { snapshots, persistence }
}
