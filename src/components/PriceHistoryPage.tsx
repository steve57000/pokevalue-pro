import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, CalendarDays, Library, Layers, RefreshCw, Wallet, TrendingDown, TrendingUp } from 'lucide-react'
import { useCardPrices, refreshCardPrices } from '../hooks/useCardPrices'
import { getAllPriceHistory, type PriceSnapshot } from '../domain/priceHistory'
import { buildStatsRows } from '../domain/collectionStats'
import { isAsianCatalogLanguage } from '../domain/pricing'
import type { Card } from '../types'
import type { CollectionEntry } from '../domain/collection'
import type { FavoriteCard } from '../domain/favorites'
import { money } from '../utils/money'
import { readStoredString, writeStoredString } from '../utils/storage'
import type { PriceHistorySyncStatus } from '../hooks/useGitHubPriceHistorySync'
import { CatalogueImage } from './CatalogueImage'
import { PriceHistoryExplorer } from './PriceHistoryExplorer'

type Props = { cards: Card[]; entries: CollectionEntry[]; favorites: FavoriteCard[]; historySync: { status: PriceHistorySyncStatus; message: string } }
const SELECTION_KEY = 'pv-stats-selected-card-v1'
export function PriceHistoryPage({ cards, entries, favorites, historySync }: Props) {
  const [range, setRange] = useState<'30' | '90' | 'all'>('30')
  const [selectedKey, setSelectedKey] = useState(() => readStoredString(SELECTION_KEY, '', 'session'))
  const [revision, setRevision] = useState(0)
  const detailRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const update = () => setRevision(value => value + 1)
    window.addEventListener('pv-price-history-updated', update)
    return () => window.removeEventListener('pv-price-history-updated', update)
  }, [])
  const rows = useMemo(() => buildStatsRows(cards, entries, favorites, getAllPriceHistory()), [cards, entries, favorites, revision])
  const owned = rows.filter(row => row.owned > 0)
  const selected = rows.find(row => row.key === selectedKey || `${row.language}:${row.id}` === selectedKey) ?? owned[0]
  const ids = (language: string) => [...new Set(rows.filter(row => (row.owned > 0 || row.key === selected?.key) && row.language === language && row.setId !== 'jumbo' && row.variant === 'normal').map(row => row.id))]
  const fr = useCardPrices(ids('fr'), 'fr'), en = useCardPrices(ids('en'), 'en')
  const priceMaps = { fr, en }
  const current = selected ? priceMaps[selected.language as keyof typeof priceMaps]?.[selected.id] : undefined
  const marketAvailable = selected && selected.setId !== 'jumbo' && selected.variant === 'normal' && !isAsianCatalogLanguage(selected.language)
  const history = selected?.history ?? []
  const cutoff = Date.parse(new Date().toISOString().slice(0,10)) - (Number(range) - 1) * 86400000
  const visibleHistory = range === 'all' ? history : history.filter(point => Date.parse(`${point.date}T00:00:00Z`) >= cutoff)
  const first = visibleHistory[0]?.value, latest = visibleHistory[visibleHistory.length - 1]?.value
  const change = first !== undefined && latest !== undefined && visibleHistory.length > 1 ? latest - first : undefined
  const total = owned.reduce((sum, row) => sum + (row.value ?? 0) * row.owned, 0)
  const valued = owned.filter(row => row.value !== undefined).length
  const manualTotal = owned.filter(row=>row.manual).reduce((sum,row)=>sum+(row.value??0)*row.owned,0)
  const lastPoint = history[history.length-1]
  const loading = Object.values(fr).some(price => price.status === 'loading') || Object.values(en).some(price => price.status === 'loading')
  const selectCard = (key: string) => {
    setSelectedKey(key); writeStoredString(SELECTION_KEY, key, 'session')
    requestAnimationFrame(() => requestAnimationFrame(() => {
      detailRef.current?.focus({ preventScroll: true })
      detailRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    }))
  }
  return <section className="price-history-page">
    <div className="page-heading"><span className="eyebrow"><Activity size={15}/> Ma collection</span><h1>Statistiques</h1>{historySync.status === 'error' && <p className="history-sync-note error" role="status">{historySync.message}</p>}</div>
    <div className="history-insight-grid" aria-label="Statistiques de ma collection">
      <article><span><Library size={17}/> Cartes différentes</span><strong>{owned.length}</strong></article>
      <article><span><Layers size={17}/> Exemplaires</span><strong>{owned.reduce((sum, row) => sum + row.owned, 0)}</strong></article>
      <article><span><Wallet size={17}/> {valued < owned.length ? 'Valeur connue' : 'Valeur'} · EUR</span><strong>{owned.length && !valued ? '—' : money(total)}</strong><small>{valued}/{owned.length} valorisées{loading ? ' · actualisation…' : ''}</small></article>
      <article><span><CalendarDays size={17}/> Extensions</span><strong>{new Set(owned.map(row => row.setId)).size}</strong></article>
    </div>
    {owned.length>0 && <details className="stats-source"><summary>Couverture des prix · {owned.length-valued} sans prix</summary><p>Prix personnels : {money(manualTotal)} · Guides marché : {money(total-manualTotal)}. Quantités incluses.</p><p>Les cartes sans cote restent dans la liste. La valeur connue n’est pas une estimation des cartes manquantes.</p><button className="history-refresh" disabled={loading} onClick={()=>{refreshCardPrices(ids('fr'),'fr');refreshCardPrices(ids('en'),'en')}}><RefreshCw size={15} className={loading?'spinning':''}/>{loading?'Actualisation…':'Actualiser les cotes'}</button></details>}
    <PriceHistoryExplorer rows={rows} selectedKey={selected?.key} onSelect={selectCard}/>
    {selected && <article ref={detailRef} tabIndex={-1} className="history-detail-card">
      <div className="history-card-heading">
        <div className="history-selected-preview"><CatalogueImage card={{ id: selected.id, name: selected.name, localId: selected.number ?? '', image: selected.image }} requestedLanguage={selected.language} quality="high"/></div>
        <div><span className="eyebrow">{selected.setName} · {selected.language.toUpperCase()}</span><h2>{selected.name}</h2><p>{selected.number ? `Nº ${selected.number}` : ''}{selected.owned ? ` · ${selected.owned} exemplaire${selected.owned === 1 ? '' : 's'}` : ''}</p></div>
        <div className="history-current-price"><small>{selected.manual ? 'Prix personnel · unitaire' : 'Guide Cardmarket · EUR'}</small><strong>{selected.value === undefined ? '—' : money(selected.value)}</strong>{selected.owned > 1 && selected.value !== undefined && <small>{money(selected.value * selected.owned)} au total</small>}{change !== undefined && <span className={change > 0 ? 'positive' : change < 0 ? 'negative' : ''}>{change > 0 ? <TrendingUp size={15}/> : change < 0 ? <TrendingDown size={15}/> : null}{change > 0 ? '+' : ''}{money(change)}{first ? ` (${change > 0 ? '+' : ''}${(change / first * 100).toFixed(1)} %)` : ''}<small> marché</small></span>}</div>
      </div>
      {!selected.manual && <p className="stats-hint" role="status">{selected.value===undefined ? current?.status==='loading'?'Recherche de cote…':'Aucune cote comparable disponible' : `Dernier prix connu · ${lastPoint?formatDate(lastPoint.date):''}`}{current?.status==='error'?` · actualisation impossible${selected.value!==undefined?', prix conservé':''}`:current?.retained?' · cote conservée':''}</p>}
      <div className="history-actions">
        <div className="history-range" role="group" aria-label="Période du graphique">{(['30', '90', 'all'] as const).map(value => <button key={value} className={range === value ? 'active' : ''} aria-pressed={range === value} onClick={() => setRange(value)}>{value === 'all' ? 'Tout' : `${value} j`}</button>)}</div>
        {marketAvailable && <button className="history-refresh" onClick={() => refreshCardPrices([selected.id], selected.language)} disabled={current?.status === 'loading'}><RefreshCw size={15} className={current?.status === 'loading' ? 'spinning' : ''}/>{current?.status === 'loading' ? 'Actualisation…' : 'Actualiser'}</button>}
      </div>
      {visibleHistory.length > 1 ? <PriceChart points={visibleHistory}/> : <div className="history-empty"><Activity size={26}/><strong>{!marketAvailable ? 'Cote de cette édition indisponible' : current?.status === 'loading' ? 'Actualisation du prix…' : visibleHistory.length === 1 ? 'Premier relevé enregistré' : history.length ? 'Aucun relevé sur cette période' : 'Pas encore de relevé'}</strong><p>{!marketAvailable ? 'Tu peux renseigner ton prix dans les paramètres de la carte.' : visibleHistory.length === 1 ? 'La courbe apparaîtra au prochain relevé quotidien.' : history.length ? 'Choisis une période plus large.' : 'La courbe se construira dès que des prix seront disponibles.'}</p></div>}
      <details className="stats-source"><summary>À propos des prix</summary><p>Valeur de collection : prix personnel si ce mode est choisi, sinon dernier guide Cardmarket Europe connu en euros. Les cartes sans prix restent comptées et ne contribuent pas au total.</p><p>Courbe et variations : guide Cardmarket, finition normale, un relevé par jour. Langue d’impression et état non précisés par TCGdex. Les Jumbo et les éditions asiatiques n’ont pas de cote adaptée ici.</p>{lastPoint && <p>Dernier relevé : {formatDate(lastPoint.date)}.{lastPoint.sourceUpdatedAt ? ` Mise à jour source : ${new Date(lastPoint.sourceUpdatedAt).toLocaleDateString('fr-FR')}.` : ' Date de mise à jour source non fournie.'}</p>}</details>
    </article>}
  </section>
}

function PriceChart({ points }: { points: PriceSnapshot[] }) {
  const values = points.map(point => point.value), min = Math.min(...values), max = Math.max(...values)
  const padding = max === min ? Math.max(max * .08, 1) : (max - min) * .08
  const bottom = Math.max(0, min - padding), top = max + padding, span = top - bottom
  const start = Date.parse(points[0].date), duration = Date.parse(points[points.length - 1]!.date) - start || 1
  const coords = points.map(point => ({ x: 48 + (Date.parse(point.date) - start) / duration * 612, y: 22 + (top - point.value) / span * 190 }))
  const line = coords.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')
  const area = `${line} L ${coords[coords.length - 1]!.x} 238 L ${coords[0].x} 238 Z`
  return <div className="history-chart-wrap"><div className="history-chart-labels"><span>{money(top)}</span><span>{money((top + bottom) / 2)}</span><span>{money(bottom)}</span></div><svg className="history-chart" viewBox="0 0 700 260" role="img" aria-label={`Prix du ${formatDate(points[0].date)} au ${formatDate(points[points.length - 1]!.date)}, de ${money(values[0])} à ${money(values[values.length - 1]!)}`}><defs><linearGradient id="price-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".22"/><stop offset="100%" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>{[22, 117, 212].map(y => <path key={y} className="history-gridline" d={`M48 ${y}H660`}/>)}<path className="history-area" d={area}/><path className="history-line" d={line}/>{coords.map((point, index) => <circle key={points[index].date} cx={point.x} cy={point.y} r={index === coords.length - 1 ? 5 : 3}><title>{formatDate(points[index].date)} · {money(points[index].value)}</title></circle>)}</svg><div className="history-dates"><span>{formatDate(points[0].date)}</span><span>{formatDate(points[points.length - 1]!.date)}</span></div></div>
}
const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
