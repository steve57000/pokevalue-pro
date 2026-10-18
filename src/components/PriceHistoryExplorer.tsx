import { useState } from 'react'
import { Search, TrendingDown, TrendingUp, SlidersHorizontal } from 'lucide-react'
import type { StatsRow } from '../domain/collectionStats'
import { normalizeSearch } from '../domain/catalogue'
import { readStoredJson, writeStoredJson } from '../utils/storage'
import { money } from '../utils/money'
export { currentCollectionPrice } from '../domain/collectionStats'

type Props = { rows: StatsRow[]; selectedKey?: string; onSelect: (key: string) => void }
type Filters = { ownedOnly: boolean; movement: string; min: string; max: string; search: string }
const STORAGE_KEY = 'pv-stats-explorer-filters-v1'
const defaults: Filters = { ownedOnly: true, movement: 'all', min: '', max: '', search: '' }
function readFilters(): Filters {
  const saved = readStoredJson<Partial<Filters> | null>(STORAGE_KEY, null, 'session')
  return { ownedOnly: typeof saved?.ownedOnly === 'boolean' ? saved.ownedOnly : true, movement: ['all', 'changed', 'up', 'down'].includes(saved?.movement ?? '') ? saved!.movement! : 'all', min: typeof saved?.min === 'string' ? saved.min : '', max: typeof saved?.max === 'string' ? saved.max : '', search: typeof saved?.search === 'string' ? saved.search : '' }
}
export function PriceHistoryExplorer({ rows, selectedKey, onSelect }: Props) {
  const [filters, setFilters] = useState(readFilters)
  const [limit, setLimit] = useState(50)
  const update = (next: Filters) => { setFilters(next); setLimit(50); writeStoredJson(STORAGE_KEY, next, 'session') }
  const { ownedOnly, movement, min, max, search } = filters
  const invalidRange = min !== '' && max !== '' && Number(min) > Number(max)
  const shown = rows.filter(row => (!ownedOnly || row.owned > 0)
    && normalizeSearch(`${row.name} ${row.setName} ${row.number ?? ''}`).includes(normalizeSearch(search))
    && (min === '' || row.value !== undefined && row.value >= Number(min))
    && (max === '' || row.value !== undefined && row.value <= Number(max))
    && (movement === 'all' || row.delta !== undefined && (movement === 'changed' ? row.delta !== 0 : movement === 'up' ? row.delta > 0 : row.delta < 0)))
  return <section className="price-explorer" aria-labelledby="price-explorer-title">
    <header className="price-explorer-heading"><div><span className="eyebrow"><SlidersHorizontal size={14}/> Explorer</span><h2 id="price-explorer-title">Mes cartes</h2></div><strong role="status">{shown.length} carte{shown.length === 1 ? '' : 's'}</strong></header>
    <label className="history-search"><Search size={18}/><input aria-label="Rechercher dans les statistiques" placeholder="Pokémon, extension ou numéro…" value={search} onChange={event => update({ ...filters, search: event.target.value })}/></label>
    <div className="price-explorer-filters">
      <label className="price-owned-filter"><input type="checkbox" checked={ownedOnly} onChange={event => update({ ...filters, ownedOnly: event.target.checked })}/>Mes cartes possédées</label>
      <label>Évolution<select value={movement} onChange={event => update({ ...filters, movement: event.target.value })}><option value="all">Toutes</option><option value="changed">Prix modifié</option><option value="up">En hausse</option><option value="down">En baisse</option></select></label>
      <label>Minimum (€)<input type="number" min="0" step="0.01" inputMode="decimal" value={min} placeholder="Aucun" onChange={event => update({ ...filters, min: event.target.value })}/></label>
      <label>Maximum (€)<input type="number" min="0" step="0.01" inputMode="decimal" value={max} placeholder="Aucun" aria-invalid={invalidRange} onChange={event => update({ ...filters, max: event.target.value })}/></label>
    </div>
    {invalidRange && <p role="alert" className="negative">Le maximum doit être supérieur ou égal au minimum.</p>}
    {(!ownedOnly || movement !== 'all' || min || max || search) && <button className="stats-reset" onClick={() => update(defaults)}>Réinitialiser les filtres</button>}
    {!ownedOnly && <p className="stats-hint">Collection, favoris et sélection PokéValue.</p>}
    <div className="price-explorer-list">
      {shown.slice(0, limit).map(row => <button key={row.key} className={`price-explorer-row${selectedKey === row.key ? ' selected' : ''}`} aria-pressed={selectedKey === row.key} onClick={() => onSelect(row.key)}>
        <span><strong>{row.name}</strong><small>{row.setName}{row.number ? ` · nº ${row.number}` : ''} · {row.language.toUpperCase()}{row.variant !== 'normal' ? ` · ${row.variant}` : ''}{row.owned ? ` · ×${row.owned}` : ''}</small></span>
        <span className="price-explorer-values"><strong>{row.value === undefined ? '—' : money(row.value)}</strong>{row.manual && <small>Prix personnel</small>}{row.delta !== undefined && <small className={row.delta > 0 ? 'positive' : row.delta < 0 ? 'negative' : ''}>{row.delta > 0 ? <TrendingUp size={15}/> : row.delta < 0 ? <TrendingDown size={15}/> : null}{row.delta > 0 ? '+' : ''}{money(row.delta)} <span className="sr-only">sur le marché</span></small>}</span>
      </button>)}
    </div>
    {shown.length > limit && <button className="stats-load-more" onClick={() => setLimit(value => value + 50)}>Afficher la suite · {shown.length - limit} restantes</button>}
    {!shown.length && <div className="history-empty"><Search size={24}/><strong>{rows.some(row => row.owned) ? 'Aucune carte avec ces filtres' : 'Ta collection est vide'}</strong><p>{rows.some(row => row.owned) ? 'Élargis ta recherche ou réinitialise les filtres.' : 'Ajoute tes cartes depuis Collection pour les retrouver ici.'}</p></div>}
  </section>
}
