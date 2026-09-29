import { useEffect, useMemo, useRef, useState } from 'react'
import { Cloud, Download, Upload, AlertTriangle, ChevronDown } from 'lucide-react'
import { listSets, getSet, listSeries, getSeries, type SeriesSummary, type SetDetail, type SetSummary, type SetCard } from '../api/sets'
import { CatalogueImage } from './CatalogueImage'
import { tcgDexProvider } from '../api/tcgdex'
import { selectCardmarketPrice, type PriceReference } from '../domain/pricing'
import type { CollectionDocument, CollectionEntry } from '../domain/collection'
import { emptyCollection, mergeCollections, parseCollection, printingKey, upsertEntry } from '../domain/collection'
import { readRemotePortfolio, writeRemotePortfolio, type GitHubConnection } from '../services/githubSync'
import { CardShowcase } from './CardShowcase'
import { CardEditor } from './CardEditor'

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

type Props = { document: CollectionDocument; onChange: (document: CollectionDocument) => void; mode: 'catalogue' | 'collection' }
export function Portfolio({ document, onChange, mode }: Props) {
  const [filter, setFilter] = useState<'all'|'owned'|'missing'>('all')
  useEffect(() => setFilter(mode === 'collection' ? 'owned' : 'all'), [mode])
  const [connection, setConnection] = useState<GitHubConnection>(savedConnection)
  const [remember, setRemember] = useState(() => Boolean(savedConnection().token))
  const [sha, setSha] = useState<string>()
  const [account, setAccount] = useState('')
  const [sync, setSync] = useState<'local'|'pending'|'saved'|'conflict'|'error'>('local')
  const [message, setMessage] = useState('Collection enregistrée sur cet appareil')
  const [series, setSeries] = useState<SeriesSummary[]>([])
  const [expandedFamily, setExpandedFamily] = useState<string|null>(null)
  const [familySets, setFamilySets] = useState<Record<string, SetSummary[]>>({})
  const [familyError, setFamilyError] = useState('')
  const [sets, setSets] = useState<SetSummary[]>([])
  const [selectedSet, setSelectedSet] = useState('30th')
  const [detail, setDetail] = useState<SetDetail>()
  const [catalogueError, setCatalogueError] = useState('')
  const [search, setSearch] = useState('')
  const [seriesQuery, setSeriesQuery] = useState('')
  const [setPickerOpen, setSetPickerOpen] = useState(false)
  const [spotlight, setSpotlight] = useState<SetCard | null>(null)
  const [editing, setEditing] = useState<SetCard | null>(null)
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
    listSeries().then(data => { if (active) setSeries(data.reverse()) }).catch(error => { if (active) setFamilyError((error as Error).message) })
    listSets().then(data => { if (active) setSets(data) }).catch(error => { if (active) setCatalogueError((error as Error).message) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    let active = true
    setDetail(undefined)
    getSet(selectedSet).then(data => { if (active) { setDetail(data); setCatalogueError('') } }).catch(error => { if (active) setCatalogueError((error as Error).message) })
    return () => { active = false }
  }, [selectedSet])

  useEffect(() => {
    if (!expandedFamily || familySets[expandedFamily]) return
    let active = true
    setFamilyError('')
    getSeries(expandedFamily).then(data => { if (active) setFamilySets(current => ({ ...current, [data.id]: data.sets })) }).catch(error => { if (active) setFamilyError((error as Error).message) })
    return () => { active = false }
  }, [expandedFamily, familySets])

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
  const chooseSet = (id: string) => { setSelectedSet(id); setFilter(mode === 'collection' ? 'owned' : 'all'); setSearch(''); setSetPickerOpen(false); setSeriesQuery('') }
  const editCard = (card: SetCard) => { setSpotlight(null); setEditing(card) }
  return <section className="portfolio-page">
    <div className="portfolio-heading"><div><span className="eyebrow">{mode === 'catalogue' ? 'Catalogue complet des extensions' : 'Classeur numérique'}</span><h1>{mode === 'catalogue' ? 'Toutes les cartes par série' : 'Ma collection'}</h1><p>{mode === 'catalogue' ? 'Choisis une extension et coche les cartes que tu possèdes.' : `${document.entries.filter(isOwned).reduce((sum,e)=>sum+e.quantity,0)} exemplaire(s) · ${document.entries.filter(isOwned).length} impressions possédées`}</p></div>
      <div className={`sync-state ${sync}`}><Cloud size={18}/><strong>{sync === 'saved' ? 'Synchronisé' : sync === 'conflict' ? 'Conflit' : sync === 'pending' ? 'En cours' : 'Local'}</strong><small>{message}</small></div></div>
    {mode === 'collection' && <div className="github-panel"><h2>Sauvegarde GitHub privée</h2><p>Jeton limité au dépôt privé, permission <b>Contents: Read and write</b>. La connexion peut être conservée sur cet appareil : évitez cette option sur un appareil partagé.</p>
      <div className="github-fields"><label>Propriétaire<input value={connection.owner} onChange={e=>setConnection({...connection,owner:e.target.value})}/></label><label>Dépôt privé<input value={connection.repo} onChange={e=>setConnection({...connection,repo:e.target.value})}/></label><label>Jeton<input type="password" autoComplete="off" value={connection.token} onChange={e=>setConnection({...connection,token:e.target.value})}/></label></div>
      <div className="sync-actions"><label><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Rester connecté sur cet appareil</label><button onClick={connect} disabled={!connection.owner||!connection.repo||!connection.token}>Vérifier et charger</button>{account&&<><span>Compte : <b>@{account}</b></span><button onClick={()=>{connectedRef.current=false;hydratedRef.current=false;setAccount('');setConnection({owner:'',repo:'',token:''});setRemember(false);setSync('local');setMessage('Déconnecté')}}>Déconnexion</button></>}</div>
      {sync==='conflict'&&<p className="conflict"><AlertTriangle size={16}/> Une autre session a modifié la sauvegarde. <button onClick={resolveConflict}>Fusionner et réessayer</button></p>}
      {sync==='error'&&account&&<button onClick={()=>void flush()}>Réessayer la sauvegarde</button>}
    </div>}
    {mode === 'collection' && <div className="portfolio-tools"><button onClick={download}><Download size={16}/> Export JSON</button><button onClick={()=>importRef.current?.click()}><Upload size={16}/> Import JSON</button><input hidden ref={importRef} type="file" accept="application/json" onChange={async e=>{const file=e.target.files?.[0];if(file) { try { onChange(parseCollection(JSON.parse(await file.text()))); setMessage('Import chargé localement') } catch(error) { setSync('error'); setMessage((error as Error).message) } }}}/></div>}
    <div className="series-layout"><div className="series-selector"><div><span className="eyebrow">Explorer les extensions</span><h2>{detail?.name ?? 'Choisir une série'}</h2><p>{detail?.serie?.name ?? 'Catalogue français'} · {setEntries.length}/{detail?.cardCount.total ?? '…'} cartes possédées · {detail?.cards.length ?? '…'} cartes au catalogue</p></div>
      <button className="series-picker-trigger" aria-expanded={setPickerOpen} aria-controls="series-picker-list" onClick={()=>setSetPickerOpen(open=>!open)}>Changer de série <ChevronDown size={18} aria-hidden="true"/></button>
      <div className="series-shortcuts">{favorites.map(id=>sets.find(s=>s.id===id)).filter((s):s is SetSummary=>Boolean(s)).map(set=><button key={set.id} className={selectedSet===set.id?'active':''} onClick={()=>chooseSet(set.id)}>{set.name}</button>)}</div>
      {setPickerOpen&&<div className="series-picker" id="series-picker-list">
        <p className="series-picker-help">1. Choisir un bloc · 2. Choisir son extension</p>
        <div className="family-buttons">{series.map(family=><button key={family.id} aria-expanded={expandedFamily===family.id} className={expandedFamily===family.id?'active':''} onClick={()=>{setExpandedFamily(current=>current===family.id?null:family.id);setSeriesQuery('')}}>{family.name}<ChevronDown size={16}/></button>)}</div>
        {familyError&&<p role="alert">{familyError}</p>}
        {expandedFamily&&<div className="family-extensions"><input autoFocus className="series-search" placeholder="Rechercher dans ce bloc…" value={seriesQuery} onChange={e=>setSeriesQuery(e.target.value)}/><div className="series-picker-list series-picker-group">{!familySets[expandedFamily]?<p>Chargement des extensions…</p>:familySets[expandedFamily].filter(set=>set.name.toLocaleLowerCase('fr').includes(seriesQuery.toLocaleLowerCase('fr'))).map(set=><button key={set.id} className={selectedSet===set.id?'active':''} onClick={()=>chooseSet(set.id)}>{set.name}<small>{document.entries.filter(e=>isOwned(e)&&e.setId===set.id).length}/{set.cardCount.total}</small></button>)}</div></div>}
      </div>}
    </div>
      <div className="series-content">
        <div className="series-controls"><input placeholder="Nom ou numéro dans cette série" value={search} onChange={e=>setSearch(e.target.value)}/>{(['all','owned','missing'] as const).map(f=><button className={filter===f?'active':''} onClick={()=>setFilter(f)} key={f}>{f==='all'?'Toutes':f==='owned'?'Possédées':'Manquantes'}</button>)}</div>
        {catalogueError&&<p role="alert">{catalogueError} <button onClick={()=>void getSet(selectedSet).then(setDetail).catch(e=>setCatalogueError((e as Error).message))}>Réessayer</button></p>}
        {!detail&&!catalogueError&&<p>Chargement des cartes…</p>}
        <div className="binder-grid">{shown.map(card=>{const entry=document.entries.find(e=>e.key===cardKey(card));const has=!!entry&&isOwned(entry);return <article key={card.id} className={has?'owned':''}>
          <button className="binder-preview" onClick={()=>setSpotlight(card)} aria-label={`Voir ${card.name} en grand`}><CatalogueImage key={card.id} card={card} className="binder-image"/><span>Voir en grand ↗</span></button>
          <strong>{card.name}</strong><span>{card.localId} · {detail?.name}</span><button aria-pressed={has} onClick={()=>editCard(card)}>{has?'✓ Je possède · Modifier':'Je possède'}</button>
          <a href={cardmarketSearch(card,detail?.name??'')} target="_blank" rel="noopener noreferrer">Rechercher sur Cardmarket ↗</a>
          {has&&entry&&<small className="binder-owned-summary">{entry.quantity} exemplaire{entry.quantity>1?'s':''} · {entry.manualPrice!==undefined?`${entry.manualPrice.toFixed(2)} € manuel`:prices[card.id]?`${prices[card.id]!.value.toFixed(2)} € indicatif`:entry.condition.replace('-', ' ')}</small>}
        </article>})}</div>
      </div></div>
    {spotlight&&<CardShowcase card={spotlight} setName={detail?.name??selectedSet} owned={owned.has(cardKey(spotlight))} onToggle={()=>editCard(spotlight)} onClose={()=>setSpotlight(null)} cardmarketUrl={cardmarketSearch(spotlight,detail?.name??'')}/>}
    {editing&&<CardEditor key={editing.id} card={editing} setName={detail?.name??selectedSet} entry={document.entries.find(e=>e.key===cardKey(editing)&&e.quantity>0)} automaticPrice={prices[editing.id]} onSave={draft=>{setEntry(editing,draft);setEditing(null)}} onRemove={()=>{setEntry(editing,{quantity:0});setEditing(null)}} onClose={()=>setEditing(null)}/>}
  </section>
}
