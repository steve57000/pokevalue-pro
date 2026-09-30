import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { listSets, getSet, listSeries, getSeries, type SeriesSummary, type SetDetail, type SetSummary, type SetCard } from '../api/sets'
import { CatalogueImage } from './CatalogueImage'
import type { CollectionDocument, CollectionEntry } from '../domain/collection'
import { printingKey, upsertEntry } from '../domain/collection'
import { CardShowcase } from './CardShowcase'
import { CardEditor } from './CardEditor'
import { useCardPrices } from '../hooks/useCardPrices'
import { money } from '../utils/money'

const favorites = ['30th', '30th-c', 'me04', 'me05']
const isOwned = (entry: CollectionEntry) => entry.quantity > 0
const cardKey = (card: SetCard) => printingKey({ source: 'tcgdex', setId: card.id.slice(0, card.id.lastIndexOf('-')), cardId: card.id, language: 'fr', variant: 'normal' })
const cardmarketSearch = (card: SetCard, setName: string) => `https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=${encodeURIComponent(`${card.name} ${setName} ${card.localId}`)}`

type Props = { document: CollectionDocument; onChange: (document: CollectionDocument) => void }
export function Portfolio({ document, onChange }: Props) {
  const [filter, setFilter] = useState<'all'|'owned'|'missing'>('all')
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
  const documentRef = useRef(document)
  documentRef.current = document

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

  const owned = useMemo(() => new Set(document.entries.filter(isOwned).map(e => e.key)), [document])
  const shown = (detail?.cards ?? []).filter(card => (filter === 'all' || (filter === 'owned' ? owned.has(cardKey(card)) : !owned.has(cardKey(card)))) && `${card.name} ${card.localId}`.toLowerCase().includes(search.toLowerCase()))
  const setEntries = document.entries.filter(e => isOwned(e) && e.setId === selectedSet)
  const ownedEntries = document.entries.filter(isOwned)
  const priceIds = [...new Set([...ownedEntries.map(e=>e.cardId), ...(detail?.cards.map(c=>c.id) ?? [])])]
  const prices = useCardPrices(priceIds)
  const summarize = (entries: CollectionEntry[]) => entries.reduce((result,entry)=>{
    const unit = entry.manualPrice ?? prices[entry.cardId]?.price?.value
    if (unit === undefined || prices[entry.cardId]?.status === 'error' && entry.manualPrice === undefined) result.missing += 1
    else { result.value += unit * entry.quantity; result.valued += 1 }
    return result
  },{value:0,valued:0,missing:0})
  const globalSummary = summarize(ownedEntries)
  const setSummary = summarize(setEntries)
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
  const chooseSet = (id: string) => { setSelectedSet(id); setSearch(''); setSetPickerOpen(false); setSeriesQuery('') }
  const editCard = (card: SetCard) => { setSpotlight(null); setEditing(card) }
  return <section className="portfolio-page">
    <div className="portfolio-heading"><div><span className="eyebrow">Catalogue et classeur numérique</span><h1>Collection</h1><p>Parcours toutes les extensions, ajoute tes cartes et suis leur valeur.</p></div></div>
    <div className="collection-summary"><div><small>Ma collection</small><strong>{ownedEntries.length} cartes différentes</strong><span>{ownedEntries.reduce((sum,e)=>sum+e.quantity,0)} exemplaires</span></div><div><small>Valeur estimée</small><strong>{globalSummary.missing?'≈ ':''}{money(globalSummary.value)}</strong><span>{globalSummary.valued}/{ownedEntries.length} cartes valorisées{globalSummary.missing?` · ${globalSummary.missing} sans prix`:''}</span></div><div><small>Extension actuelle</small><strong>{detail?.name ?? 'Chargement…'}</strong><span>{setSummary.missing?'≈ ':''}{money(setSummary.value)} · {setSummary.valued}/{setEntries.length} valorisées</span></div></div>
    <div className="series-layout"><div className="series-selector"><div><span className="eyebrow">Explorer les extensions</span><h2>{detail?.name ?? 'Choisir une série'}</h2><p>{detail?.serie?.name ?? 'Catalogue français'} · {setEntries.length}/{detail?.cardCount.total ?? '…'} cartes possédées · {detail?.cards.length ?? '…'} cartes au catalogue</p></div>
      <button className="series-picker-trigger" aria-expanded={setPickerOpen} aria-controls="series-picker-list" onClick={()=>setSetPickerOpen(open=>!open)}>Changer de série <ChevronDown size={18} aria-hidden="true"/></button>
      <div className="series-shortcuts">{favorites.map(id=>sets.find(s=>s.id===id)).filter((s):s is SetSummary=>Boolean(s)).map(set=><button key={set.id} className={selectedSet===set.id?'active':''} onClick={()=>chooseSet(set.id)}>{set.name}</button>)}</div>
      {setPickerOpen&&<div className="series-picker" id="series-picker-list">
        <input className="series-search" placeholder="Rechercher une extension…" value={seriesQuery} onChange={e=>setSeriesQuery(e.target.value)}/>
        {seriesQuery&&<div className="series-picker-list global-set-results">{sets.filter(set=>set.name.toLocaleLowerCase('fr').includes(seriesQuery.toLocaleLowerCase('fr'))).slice(0,30).map(set=><button key={set.id} className={selectedSet===set.id?'active':''} onClick={()=>chooseSet(set.id)}>{set.name}</button>)}</div>}
        {!seriesQuery&&<><p className="series-picker-help">Choisir une famille puis une extension</p>
        <div className="family-buttons">{series.map(family=><button key={family.id} aria-expanded={expandedFamily===family.id} className={expandedFamily===family.id?'active':''} onClick={()=>{setExpandedFamily(current=>current===family.id?null:family.id);setSeriesQuery('')}}>{family.name}<ChevronDown size={16}/></button>)}</div>
        {familyError&&<p role="alert">{familyError}</p>}
        {expandedFamily&&<div className="family-extensions"><div className="series-picker-list series-picker-group">{!familySets[expandedFamily]?<p>Chargement des extensions…</p>:familySets[expandedFamily].map(set=><button key={set.id} className={selectedSet===set.id?'active':''} onClick={()=>chooseSet(set.id)}>{set.name}<small>{document.entries.filter(e=>isOwned(e)&&e.setId===set.id).length}/{set.cardCount.total}</small></button>)}</div></div>}</>}
      </div>}
    </div>
      <div className="series-content">
        <div className="series-controls"><input placeholder="Nom ou numéro dans cette série" value={search} onChange={e=>setSearch(e.target.value)}/>{(['all','owned','missing'] as const).map(f=><button className={filter===f?'active':''} onClick={()=>setFilter(f)} key={f}>{f==='all'?'Toutes':f==='owned'?'Possédées':'Manquantes'}</button>)}</div>
        {catalogueError&&<p role="alert">{catalogueError} <button onClick={()=>void getSet(selectedSet).then(setDetail).catch(e=>setCatalogueError((e as Error).message))}>Réessayer</button></p>}
        {!detail&&!catalogueError&&<p>Chargement des cartes…</p>}
        <div className="binder-grid">{shown.map(card=>{const entry=document.entries.find(e=>e.key===cardKey(card));const has=!!entry&&isOwned(entry);return <article key={card.id} className={has?'owned':''}>
          <button className="binder-preview" onClick={()=>setSpotlight(card)} aria-label={`Voir ${card.name} en grand`}><CatalogueImage key={card.id} card={card} className="binder-image"/><span>Voir en grand ↗</span></button>
          <strong>{card.name}</strong><span>{card.localId}/{detail?.cardCount.official ?? detail?.cardCount.total} · {detail?.name}</span><div className="binder-price"><small>Prix marché</small>{prices[card.id]?.status==='loading'?<i className="price-skeleton"/>:prices[card.id]?.price?<strong>{money(prices[card.id].price!.value)}</strong>:<span>Prix indisponible</span>}</div><div className="owned-line"><span>{has?'✓ Possédée':'Non possédée'}</span>{has&&entry!.quantity>1&&<b>×{entry!.quantity}</b>}</div><button aria-pressed={has} onClick={()=>editCard(card)}>{has?'Modifier ma carte':'Ajouter à ma collection'}</button>
          <a href={cardmarketSearch(card,detail?.name??'')} target="_blank" rel="noopener noreferrer">Rechercher sur Cardmarket ↗</a>
          {has&&entry&&<small className="binder-owned-summary">{entry.manualPrice!==undefined?`${entry.manualPrice.toFixed(2)} € manuel`:entry.condition.replace('-', ' ')}</small>}
        </article>})}</div>
      </div></div>
    {spotlight&&<CardShowcase card={spotlight} setName={detail?.name??selectedSet} owned={owned.has(cardKey(spotlight))} onToggle={()=>editCard(spotlight)} onClose={()=>setSpotlight(null)} cardmarketUrl={cardmarketSearch(spotlight,detail?.name??'')}/>}
    {editing&&<CardEditor key={editing.id} card={editing} setName={detail?.name??selectedSet} entry={document.entries.find(e=>e.key===cardKey(editing)&&e.quantity>0)} automaticPrice={prices[editing.id]?.price} onSave={draft=>{setEntry(editing,draft);setEditing(null)}} onRemove={()=>{setEntry(editing,{quantity:0});setEditing(null)}} onClose={()=>setEditing(null)}/>}
  </section>
}
