import { useCallback, useEffect, useRef, useState } from 'react'
import { getAllPriceHistory, mergePriceHistory, replacePriceHistory, samePriceHistory } from '../domain/priceHistory'
import type { PriceSnapshot } from '../domain/priceHistory'
import { readRemotePriceHistory, writeRemotePriceHistory, type GitHubConnection } from '../services/githubSync'

export type PriceHistorySyncStatus = 'local' | 'pending' | 'saved' | 'error'

export function useGitHubPriceHistorySync(connection: GitHubConnection | null) {
  const [status, setStatus] = useState<PriceHistorySyncStatus>(connection ? 'pending' : 'local')
  const [message, setMessage] = useState(connection
    ? 'Chargement de l’historique du dépôt privé…'
    : 'Historique local uniquement · relie le dépôt privé dans Sauvegarde pour le retrouver sur tes appareils.')
  const [lastSavedAt, setLastSavedAt] = useState<Date>()
  const runningRef = useRef(false)
  const needsSyncRef = useRef(false)

  const sync = useCallback(async () => {
    if (!connection) {
      setStatus('local')
      setMessage('Historique local uniquement · relie le dépôt privé dans Sauvegarde pour le retrouver sur tes appareils.')
      return
    }
    needsSyncRef.current = true
    if (runningRef.current) return
    runningRef.current = true
    setStatus('pending')
    setMessage('Synchronisation de l’historique des prix…')
    try {
      while (needsSyncRef.current) {
        needsSyncRef.current = false
        let synchronized = false
        for (let attempt = 0; attempt < 3 && !synchronized; attempt += 1) {
          const remote = await readRemotePriceHistory(connection)
          const remoteSnapshots: PriceSnapshot[] = remote.document?.snapshots ?? []
          const localSnapshots = getAllPriceHistory()
          const merged = mergePriceHistory(localSnapshots, remoteSnapshots)
          if (samePriceHistory(merged, remoteSnapshots)) {
            replacePriceHistory(merged)
            synchronized = true
            break
          }
          try {
            await writeRemotePriceHistory(connection, merged, remote.sha)
            replacePriceHistory(merged)
            synchronized = true
          } catch (error) {
            const code = (error as { status?: number }).status
            if ((code === 409 || code === 422) && attempt < 2) continue
            throw error
          }
        }
        if (!synchronized) throw new Error('Conflit GitHub : impossible de fusionner l’historique après trois tentatives.')
      }
      const now = new Date()
      setLastSavedAt(now)
      setStatus('saved')
      setMessage(getAllPriceHistory().length
        ? `Historique sauvegardé dans le dépôt privé · ${now.toLocaleString('fr-FR')}`
        : 'Dépôt privé connecté · le fichier sera créé au premier relevé de prix.')
    } catch (error) {
      setStatus('error')
      setMessage((error as Error).message)
    } finally {
      runningRef.current = false
      if (needsSyncRef.current) void sync()
    }
  }, [connection])

  useEffect(() => {
    if (!connection) {
      setStatus('local')
      setMessage('Historique local uniquement · relie le dépôt privé dans Sauvegarde pour le retrouver sur tes appareils.')
      return
    }
    const onHistoryUpdate = () => { void sync() }
    window.addEventListener('pv-price-history-updated', onHistoryUpdate)
    void sync()
    return () => window.removeEventListener('pv-price-history-updated', onHistoryUpdate)
  }, [connection, sync])

  return { status, message, lastSavedAt, retry: sync }
}
