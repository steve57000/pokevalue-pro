import { useEffect, useRef, useState } from 'react'
import { ensurePriceHistoryReady, getAllPriceHistory, mergePriceHistory, replacePriceHistory, samePriceHistory } from '../domain/priceHistory'
import { readRemotePriceHistory, writeRemotePriceHistory, type GitHubConnection } from '../services/githubSync'

export type PriceHistorySyncStatus = 'local' | 'pending' | 'saved' | 'error'
export function useGitHubPriceHistorySync(connection: GitHubConnection | null) {
  const [status, setStatus] = useState<PriceHistorySyncStatus>('local')
  const [message, setMessage] = useState('Historique enregistré sur cet appareil.')
  const [lastSavedAt, setLastSavedAt] = useState<Date>()
  const retryRef = useRef<() => void>(() => {})
  useEffect(() => {
    if (!connection) {
      setStatus('local'); setMessage('Historique enregistré sur cet appareil.')
      retryRef.current = () => {}
      return
    }
    let cancelled = false, running = false, requested = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const sync = async () => {
      requested = true
      if (running || cancelled) return
      running = true
      setStatus('pending'); setMessage('Synchronisation des prix…')
      try {
        await ensurePriceHistoryReady()
        while (requested && !cancelled) {
          requested = false
          for (let attempt = 0; attempt < 3; attempt++) {
            const remote = await readRemotePriceHistory(connection)
            if (cancelled) return
            const merged = mergePriceHistory(getAllPriceHistory(), remote.document?.snapshots ?? [])
            try {
              if (!samePriceHistory(merged, remote.document?.snapshots ?? [])) await writeRemotePriceHistory(connection, merged, remote.sha)
              if (cancelled) return
              replacePriceHistory(merged)
              if (!samePriceHistory(getAllPriceHistory(), merged)) requested = true
              break
            } catch (error) {
              if (cancelled) return
              const code = (error as { status?: number }).status
              if ((code === 409 || code === 422) && attempt < 2) continue
              throw error
            }
          }
        }
        if (!cancelled) { setLastSavedAt(new Date()); setStatus('saved'); setMessage('Historique synchronisé.') }
      } catch (error) {
        if (!cancelled) { setStatus('error'); setMessage((error as Error).message) }
      } finally { running = false }
    }
    const onUpdate = () => {
      if (running) { requested = true; return }
      clearTimeout(timer)
      timer = setTimeout(() => { void sync() }, 1500)
    }
    retryRef.current = () => { clearTimeout(timer); void sync() }
    window.addEventListener('pv-price-history-updated', onUpdate)
    void sync()
    return () => { cancelled = true; clearTimeout(timer); window.removeEventListener('pv-price-history-updated', onUpdate) }
  }, [connection])
  return { status, message, lastSavedAt, retry: () => retryRef.current() }
}
