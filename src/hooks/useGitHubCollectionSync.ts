import { useCallback, useEffect, useRef, useState } from 'react'
import { emptyCollection, mergeCollections, type CollectionDocument } from '../domain/collection'
import { readRemotePortfolio, writeRemotePortfolio, type GitHubConnection } from '../services/githubSync'
import { readStoredJson, removeStoredValue, writeStoredJson } from '../utils/storage'

const CONNECTION_KEY = 'pv-github-connection-v1'
const blankConnection: GitHubConnection = { owner: '', repo: '', token: '' }

function savedConnection(): GitHubConnection {
  try {
    const value = readStoredJson<Record<string, string>>(CONNECTION_KEY, {})
    return { owner: value.owner ?? '', repo: value.repo ?? '', token: value.token ?? '' }
  } catch { return blankConnection }
}

export type SyncStatus = 'local' | 'pending' | 'saved' | 'conflict' | 'error'

export function useGitHubCollectionSync(document: CollectionDocument, onChange: (value: CollectionDocument) => void) {
  const [connection, setConnection] = useState<GitHubConnection>(savedConnection)
  const [remember, setRemember] = useState(() => Boolean(savedConnection().token))
  const [sha, setSha] = useState<string>()
  const [account, setAccount] = useState('')
  const [status, setStatus] = useState<SyncStatus>('local')
  const [connected, setConnected] = useState(false)
  const [activeConnection, setActiveConnection] = useState<GitHubConnection | null>(null)
  const [message, setMessage] = useState('Collection enregistrée sur cet appareil')
  const [lastSavedAt, setLastSavedAt] = useState<Date>()
  const documentRef = useRef(document)
  const connectionRef = useRef(connection)
  const activeConnectionRef = useRef<GitHubConnection | null>(null)
  const shaRef = useRef(sha)
  const connectedRef = useRef(false)
  const hydratedRef = useRef(false)
  const writingRef = useRef(false)
  const dirtyRef = useRef(false)
  const lastSavedRef = useRef('')
  documentRef.current = document
  connectionRef.current = connection
  shaRef.current = sha

  useEffect(() => {
    if (remember) writeStoredJson(CONNECTION_KEY, connection)
    else removeStoredValue(CONNECTION_KEY)
  }, [connection, remember])

  const connect = useCallback(async () => {
    const candidate = { ...connectionRef.current }
    connectedRef.current = false; hydratedRef.current = false; activeConnectionRef.current = null
    setConnected(false); setActiveConnection(null)
    setStatus('pending'); setMessage('Chargement de la sauvegarde distante…')
    try {
      const remote = await readRemotePortfolio(candidate)
      if (remote.document && documentRef.current.entries.some(e => e.quantity > 0) && JSON.stringify(documentRef.current) !== JSON.stringify(remote.document)) {
        if (!window.confirm('Une collection locale existe. Charger celle de GitHub et remplacer la copie locale ? Exportez-la d’abord si vous souhaitez la conserver.')) {
          setStatus('local'); setMessage('Collection locale conservée ; connexion annulée'); return
        }
      }
      setAccount(remote.login); setSha(remote.sha); shaRef.current = remote.sha
      connectedRef.current = true; hydratedRef.current = true
      activeConnectionRef.current = candidate; setActiveConnection(candidate); setConnected(true)
      const next = remote.document ?? documentRef.current
      lastSavedRef.current = JSON.stringify(next)
      if (remote.document) onChange(remote.document)
      const now = new Date(); setLastSavedAt(remote.document ? now : undefined)
      setStatus(remote.document ? 'saved' : 'local')
      setMessage(remote.document ? `Chargée depuis GitHub · ${now.toLocaleString('fr-FR')}` : 'Aucune sauvegarde distante ; le prochain changement sera enregistré')
    } catch (error) {
      connectedRef.current = false; activeConnectionRef.current = null; setConnected(false); setActiveConnection(null); setStatus('error'); setMessage((error as Error).message)
    }
  }, [onChange])

  const flush = useCallback(async () => {
    if (!connectedRef.current || writingRef.current || !dirtyRef.current) return
    writingRef.current = true; setStatus('pending'); setMessage('Sauvegarde GitHub en cours…')
    try {
      while (dirtyRef.current && connectedRef.current) {
        dirtyRef.current = false
        const snapshot = documentRef.current
        const activeConnection = activeConnectionRef.current
        if (!activeConnection) throw new Error('Reconnecte le dépôt privé avant la sauvegarde.')
        const result = await writeRemotePortfolio(activeConnection, snapshot, shaRef.current)
        shaRef.current = result.content.sha; setSha(result.content.sha)
        lastSavedRef.current = JSON.stringify(snapshot)
        if (JSON.stringify(documentRef.current) !== lastSavedRef.current) dirtyRef.current = true
      }
      const now = new Date(); setLastSavedAt(now); setStatus('saved'); setMessage(`Sauvegardé automatiquement · ${now.toLocaleString('fr-FR')}`)
    } catch (error) {
      dirtyRef.current = true
      const code = (error as { status?: number }).status
      setStatus(code === 409 || code === 422 ? 'conflict' : 'error'); setMessage((error as Error).message)
    } finally { writingRef.current = false }
  }, [])

  useEffect(() => {
    const initial = connectionRef.current
    if (initial.token && initial.owner && initial.repo) void connect()
  }, [connect])
  useEffect(() => {
    if (!hydratedRef.current || !connectedRef.current || JSON.stringify(document) === lastSavedRef.current) return
    dirtyRef.current = true; void flush()
  }, [document, flush])

  const resolveConflict = useCallback(async () => {
    try {
      const activeConnection = activeConnectionRef.current
      if (!activeConnection) throw new Error('Reconnecte le dépôt privé avant la fusion.')
      const remote = await readRemotePortfolio(activeConnection)
      shaRef.current = remote.sha; setSha(remote.sha)
      const merged = mergeCollections(documentRef.current, remote.document ?? emptyCollection())
      dirtyRef.current = true; documentRef.current = merged; onChange(merged); await flush()
    } catch (error) { setStatus('error'); setMessage((error as Error).message) }
  }, [flush, onChange])

  const disconnect = () => {
    connectedRef.current = false; hydratedRef.current = false; activeConnectionRef.current = null; setConnected(false); setActiveConnection(null); setAccount(''); setConnection(blankConnection)
    setRemember(false); setSha(undefined); setStatus('local'); setMessage('Déconnecté')
  }
  const markImport = (text: string) => { setStatus('local'); setMessage(text) }

  return { connection, activeConnection, connected, setConnection, remember, setRemember, sha, account, status, message, lastSavedAt, connect, disconnect, retry: flush, resolveConflict, markImport }
}

export type GitHubCollectionSync = ReturnType<typeof useGitHubCollectionSync>
