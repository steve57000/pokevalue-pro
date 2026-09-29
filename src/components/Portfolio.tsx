import { useEffect, useMemo, useRef, useState } from 'react'
import { Cloud, Download, Upload, AlertTriangle } from 'lucide-react'
import { listSets, getSet, type SetDetail, type SetSummary, type SetCard } from '../api/sets'
import { buildTcgDexImageUrl } from '../api/tcgdex'
import { tcgDexProvider } from '../api/tcgdex'
import { selectCardmarketPrice, type PriceReference } from '../domain/pricing'
import type { CollectionDocument, CollectionEntry } from '../domain/collection'
import { emptyCollection, mergeCollections, parseCollection, printingKey, upsertEntry } from '../domain/collection'
import { readRemotePortfolio, writeRemotePortfolio, type GitHubConnection } from '../services/githubSync'

const CONNECTION_KEY = 'pv-github-connection-v1'
const favorites = ['30th', '30th-c', 'me04', 'me05']
function savedConnection(): GitHubConnection {
  try {
    const stored = JSON.parse(localStorage.getItem(CONNECTION_KEY) ?? '{}')
    return { owner: stored.owner ?? '', repo: stored.repo ?? '', token: stored.token ?? '' }
  } catch { return { owner: '', repo: '', token: '' } }
}
const isOwned = (entry: CollectionEntry) => entry.quantity > 0
const cardKey = (card: SetCard) => printingKey({ source: 'tcgdex', setId: card.id.slice(0, card.id.lastIndexOf('-')), cardId: card.id, language: 'fr', variant: 'normal' })
const cardmarketSearch = (card: SetCard, setName: string) => `https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=${encodeURIComponent(`${card.name} ${setName} ${card.localId}`)}`

type Props = { document: CollectionDocument; onChange: (document: CollectionDocument) => void }
export function Portfolio({ document, onChange }: Props) {
  const [filter, setFilter] = useState<'all'|'owned'|'missing'>('all')
  const [connection, setConnection] = useState<GitHubConnection>(savedConnection)
  const [remember, setRemember] = useState(() => Boolean(savedConnection().token))
  const [sha, setSha] = useState<string>()
  const [account, setAccount] = useState('')
  const [sync, setSync] = useState<'local'|'pending'|'saved'|'conflict'|'error'>('local')
  const [message, setMessage] = useState('Collection enregistrée sur cet appareil')
  const [sets, setSets] = useState<SetSummary[]>([])
  const [selectedSet, setSelectedSet] = useState('30th')
  const [detail, setDetail] = useState<SetDetail>()
  const [catalogueError, setCatalogueError] = useState('')
  const [search, setSearch] = useState('')
  const [prices, setPrices] = useState<Record<string, PriceReference | null>>({})
  const importRef = useRef<HTMLInputElement>(null)
  const documentRef = useRef(document)
  const shaRef = useRef(sha)
  const connectionRef = useRef(connection)
  const connectedRef = useRef(false)
  const writingRef = useRef(false)
  const dirtyRef = useRef(false)
  const hydratedRef = useRef(false)
  const lastSavedRef = useRef<string>('')
  documentRef.current = document
  shaRef.current = sha
  connectionRef.current = connection

  useEffect(() => {
    let active = true
    listSets().then(data => { if (active) setSets(data) }).catch(error => { if (active) setCatalogueError((error as Error).message) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    let active = true
    setDetail(undefined)
    getSet(selectedSet).then(data => { if (active) { setDetail(data); setCatalogueError('') } }).catch(error => { if (active) setCatalogueError((error as Error).message) })
    return () => { active = false }
  }, [selectedSet])

  const connect = async () => {
    setSync('pending'); setMessage('Chargement de la sauvegarde distante…')
    try {
      const remote = await readRemotePortfolio(connectionRef.current)
      if (remote.document && documentRef.current.entries.some(isOwned) && JSON.stringify(documentRef.current) !== JSON.stringify(remote.document)) {
        if (!window.confirm('Une collection locale existe. Charger celle de GitHub et remplacer la copie locale ? Exportez d’abord la copie locale si vous souhaitez la conserver.')) {
          setSync('local'); setMessage('Collection locale conservée ; connexion annulée'); return
        }
      }
      setAccount(remote.login); setSha(remote.sha); shaRef.current = remote.sha
      connectedRef.current = true
      const next = remote.document ?? documentRef.current
      lastSavedRef.current = JSON.stringify(next)
      hydratedRef.current = true
      if (remote.document) onChange(remote.document)
      setSync(remote.document ? 'saved' : 'local')
      setMessage(remote.document ? `Chargée depuis GitHub · ${new Date().toLocaleString('fr-FR')}` : 'Aucune sauvegarde distante ; le prochain changement sera enregistré')
    } catch (error) { connectedRef.current = false; setSync('error'); setMessage((error as Error).message) }
  }
  useEffect(() => {
    if (connection.token && connection.owner && connection.repo) void connect()
    // Initial restore uses the saved connection only. Editing credentials requires a manual check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (remember) localStorage.setItem(CONNECTION_KEY, JSON.stringify(connection))
    else localStorage.removeItem(CONNECTION_KEY)
  }, [connection, remember])

  async function flush() {
    if (!connectedRef.current || writingRef.current || !dirtyRef.current) return
    writingRef.current = true
    setSync('pending'); setMessage('Sauvegarde GitHub en cours…')
    try {
      while (dirtyRef.current && connectedRef.current) {
        dirtyRef.current = false
        const snapshot = documentRef.current
        const result = await writeRemotePortfolio(connectionRef.current, snapshot, shaRef.current)
        shaRef.current = result.content.sha; setSha(result.content.sha)
        lastSavedRef.current = JSON.stringify(snapshot)
        if (JSON.stringify(documentRef.current) !== lastSavedRef.current) dirtyRef.current = true
      }
      setSync('saved'); setMessage(`Sauvegardé automatiquement · ${new Date().toLocaleString('fr-FR')}`)
    } catch (error) {
      dirtyRef.current = true
      const status = (error as { status?: number }).status
      setSync(status === 409 || status === 422 ? 'conflict' : 'error')
      setMessage((error as Error).message)
    } finally { writingRef.current = false }
  }
  useEffect(() => {
    if (!hydratedRef.current || !connectedRef.current || JSON.stringify(document) === lastSavedRef.current) return
    dirtyRef.current = true
    void flush()
    // Document changes drive the serialized write queue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document])
  const resolveConflict = async () => {
    try {
      const remote = await readRemotePortfolio(connectionRef.current)
      shaRef.current = remote.sha; setSha(remote.sha)
      const merged = mergeCollections(documentRef.current, remote.document ?? emptyCollection())
      dirtyRef.current = true
      documentRef.current = merged; onChange(merged)
      await flush()
    } catch (error) { setSync('error'); setMessage((error as Error).message) }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }))
    const link = Object.assign(window.document.createElement('a'), { href: url, download: 'pokevalue-portfolio.json' }); link.click(); URL.revokeObjectURL(url)
  }
  const owned = useMemo(() => new Set(document.entries.filter(isOwned).map(e => e.key)), [document])
  const shown = (detail?.cards ?? []).filter(card => (filter === 'all' || (filter === 'owned' ? owned.has(cardKey(card)) : !owned.has(cardKey(card)))) && `${card.name} ${card.localId}`.toLowerCase().includes(search.toLowerCase()))
  const setEntries = document.entries.filter(e => isOwned(e) && e.setId === selectedSet)
  useEffect(() => {
    let active = true
    // Only fetch prices for owned cards; the set listing itself stays light.
    Promise.allSettled(setEntries.filter(e => prices[e.cardId] === undefined).map(async e => {
      const card = await tcgDexProvider.getCard(e.cardId, 'fr')
      return [e.cardId, selectCardmarketPrice(card.pricing) ?? null] as const
    })).then(results => {
      if (!active) return
      setPrices(current => ({ ...current, ...Object.fromEntries(results.flatMap(r => r.status === 'fulfilled' ? [r.value] : [])) }))
    })
    return () => { active = false }
    // Changes to ownership trigger a refresh; resolved prices are cached in state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSet, document])
  const families = new Map<string, SetSummary[]>()
  for (const set of sets) {
    const family = set.id.startsWith('me') || set.id.startsWith('30th') ? 'Méga-Évolution' : set.id.startsWith('sv') ? 'Écarlate et Violet' : 'Autres séries'
    families.set(family, [...(families.get(family) ?? []), set])
  }
  const setEntry = (card: SetCard, change: Partial<CollectionEntry> = {}) => {
    const previous = documentRef.current.entries.find(e => e.key === cardKey(card))
    const next = upsertEntry(documentRef.current, {
      source: 'tcgdex', setId: selectedSet, cardId: card.id, language: 'fr', variant: 'normal',
      name: card.name, setName: detail?.name ?? selectedSet, number: card.localId, image: card.image,
      rarity: previous?.rarity, quantity: previous?.quantity ?? 1, condition: previous?.condition ?? 'near-mint',
      notes: previous?.notes ?? '', manualPrice: previous?.manualPrice, ...change,
    })
    documentRef.current = next; onChange(next)
  }
  return <section className="portfolio-page">
    <div className="portfolio-heading"><div><span className="eyebrow">Classeur numérique</span><h1>Ma collection</h1><p>{document.entries.filter(isOwned).reduce((sum,e)=>sum+e.quantity,0)} exemplaire(s) · {document.entries.filter(isOwned).length} impressions possédées</p></div>
      <div className={`sync-state ${sync}`}><Cloud size={18}/><strong>{sync === 'saved' ? 'Synchronisé' : sync === 'conflict' ? 'Conflit' : sync === 'pending' ? 'En cours' : 'Local'}</strong><small>{message}</small></div></div>
    <div className="github-panel"><h2>Sauvegarde GitHub privée</h2><p>Jeton limité au dépôt privé, permission <b>Contents: Read and write</b>. La connexion peut être conservée sur cet appareil : évitez cette option sur un appareil partagé.</p>
      <div className="github-fields"><label>Propriétaire<input value={connection.owner} onChange={e=>setConnection({...connection,owner:e.target.value})}/></label><label>Dépôt privé<input value={connection.repo} onChange={e=>setConnection({...connection,repo:e.target.value})}/></label><label>Jeton<input type="password" autoComplete="off" value={connection.token} onChange={e=>setConnection({...connection,token:e.target.value})}/></label></div>
      <div className="sync-actions"><label><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Rester connecté sur cet appareil</label><button onClick={connect} disabled={!connection.owner||!connection.repo||!connection.token}>Vérifier et charger</button>{account&&<><span>Compte : <b>@{account}</b></span><button onClick={()=>{connectedRef.current=false;hydratedRef.current=false;setAccount('');setConnection({owner:'',repo:'',token:''});setRemember(false);setSync('local');setMessage('Déconnecté')}}>Déconnexion</button></>}</div>
      {sync==='conflict'&&<p className="conflict"><AlertTriangle size={16}/> Une autre session a modifié la sauvegarde. <button onClick={resolveConflict}>Fusionner et réessayer</button></p>}
      {sync==='error'&&account&&<button onClick={()=>void flush()}>Réessayer la sauvegarde</button>}
    </div>
    <div className="portfolio-tools"><button onClick={download}><Download size={16}/> Export JSON</button><button onClick={()=>importRef.current?.click()}><Upload size={16}/> Import JSON</button><input hidden ref={importRef} type="file" accept="application/json" onChange={async e=>{const file=e.target.files?.[0];if(file) { try { onChange(parseCollection(JSON.parse(await file.text()))); setMessage('Import chargé localement') } catch(error) { setSync('error'); setMessage((error as Error).message) } }}}/></div>
    <div className="series-layout"><aside className="series-nav"><h2>Les séries</h2>{[...families].map(([family, group])=><div key={family}><h3>{family}</h3>{group.sort((a,b)=>Number(favorites.includes(b.id))-Number(favorites.includes(a.id))).map(set=><button key={set.id} className={selectedSet===set.id?'active':''} onClick={()=>{setSelectedSet(set.id);setFilter('all');setSearch('')}}>{set.name} <small>{document.entries.filter(e=>isOwned(e)&&e.setId===set.id).length}/{set.cardCount.total}</small></button>)}</div>)}</aside>
      <div className="series-content"><h2>{detail?.serie?.name ?? 'Série'} · {detail?.name ?? selectedSet}</h2><p>{setEntries.length}/{detail?.cardCount.total ?? '…'} cartes possédées · {detail?.cards.length ?? '…'} cartes au catalogue</p>
        <div className="series-controls"><input placeholder="Nom ou numéro dans cette série" value={search} onChange={e=>setSearch(e.target.value)}/>{(['all','owned','missing'] as const).map(f=><button className={filter===f?'active':''} onClick={()=>setFilter(f)} key={f}>{f==='all'?'Toutes':f==='owned'?'Possédées':'Manquantes'}</button>)}</div>
        {catalogueError&&<p role="alert">{catalogueError} <button onClick={()=>void getSet(selectedSet).then(setDetail).catch(e=>setCatalogueError((e as Error).message))}>Réessayer</button></p>}
        {!detail&&!catalogueError&&<p>Chargement des cartes…</p>}
        <div className="binder-grid">{shown.map(card=>{const entry=document.entries.find(e=>e.key===cardKey(card));const has=!!entry&&isOwned(entry);return <article key={card.id} className={has?'owned':''}>
          {card.image ? <img className="binder-image" src={buildTcgDexImageUrl(card.image,'low')} loading="lazy" alt={`Carte ${card.name} ${card.localId}`}/> : <div className="binder-placeholder">Image indisponible</div>}
          <strong>{card.name}</strong><span>{card.localId} · {detail?.name}</span><button aria-pressed={has} onClick={()=>setEntry(card,{quantity:has?0:1})}>{has?'✓ Je possède':'Je possède'}</button>
          <a href={cardmarketSearch(card,detail?.name??'')} target="_blank" rel="noopener noreferrer">Rechercher sur Cardmarket ↗</a>
          {has&&entry&&<div className="copy-editor"><label>Quantité<input type="number" min="0" value={entry.quantity} onChange={e=>setEntry(card,{quantity:Number(e.target.value)})}/></label><label>État<select value={entry.condition} onChange={e=>setEntry(card,{condition:e.target.value as CollectionEntry['condition']})}><option value="mint">Mint</option><option value="near-mint">Near Mint</option><option value="excellent">Excellent</option><option value="good">Bon</option><option value="played">Jouée</option><option value="poor">Abîmée</option></select></label><label>Prix manuel (€)<input type="number" min="0" step="0.01" placeholder="Laisser vide pour le prix automatique" value={entry.manualPrice??''} onChange={e=>setEntry(card,{manualPrice:e.target.value===''?undefined:Number(e.target.value)})}/></label><small>{entry.manualPrice!==undefined?`Prix retenu : ${entry.manualPrice.toFixed(2)} € (manuel)` : prices[card.id] ? `Prix retenu : ${prices[card.id]!.value.toFixed(2)} € (Cardmarket, ${prices[card.id]!.label})` : 'Prix automatique indisponible'}{prices[card.id]?.updatedAt && ` · ${new Date(prices[card.id]!.updatedAt!).toLocaleDateString('fr-FR')}`}</small><label>Notes<input value={entry.notes} onChange={e=>setEntry(card,{notes:e.target.value})}/></label></div>}
        </article>})}</div>
      </div></div>
  </section>
}
