import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { getSet, type SetDetail, type SetSummary } from '../api/sets'
import { collectionUnitPrice, type CollectionEntry } from '../domain/collection'
import { isAsianCatalogLanguage } from '../domain/pricing'
import type { CardPriceState } from '../hooks/useCardPrices'
import { useCardPrices } from '../hooks/useCardPrices'
import { useModalDialog } from '../hooks/useModalDialog'
import { normalizeSearch } from '../domain/catalogue'
import { money } from '../utils/money'

type Mode = 'collection' | 'market'
type Sort = 'total' | 'collection' | 'progress' | 'average' | 'median' | 'top' | 'count'
type Props = { sets: SetSummary[]; currentSet: string; entries: CollectionEntry[]; prices: Record<string, CardPriceState>; language: string; onClose: () => void }
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.length ? (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.ceil((sorted.length - 1) / 2)]) / 2 : 0
}

export function SeriesComparison({ sets, currentSet, entries, prices, language, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>([currentSet])
  const [sort, setSort] = useState<Sort>('collection')
  const [mode, setMode] = useState<Mode>('collection')
  const [query, setQuery] = useState('')
  const [details, setDetails] = useState<Record<string, SetDetail>>({})
  const dialogRef = useModalDialog(onClose)
  const asian = isAsianCatalogLanguage(language)

  useEffect(() => {
    if (mode !== 'market') return
    let active = true
    for (const id of selected) {
      if (!details[id]) getSet(id, language).then(set => active && setDetails(current => ({ ...current, [id]: set }))).catch(() => {})
    }
    return () => { active = false }
  }, [mode, selected, language, details])

  const marketPrices = useCardPrices(mode === 'market' ? selected.filter(id=>id!=='jumbo').flatMap(id => details[id]?.cards.map(card => card.id) ?? []) : [], language)
  const rows = useMemo(() => selected.map(id => {
    const set = sets.find(item => item.id === id)
    const owned = entries.filter(entry => entry.setId === id && entry.language === language && entry.quantity > 0)
    const catalogue = details[id]?.cards ?? []
    const source = mode === 'market'
      ? catalogue.map(card => ({ name: card.name, id: card.id, quantity: 1, value: asian || id === 'jumbo' || marketPrices[card.id]?.price?.basis !== 'guide' ? undefined : marketPrices[card.id]?.price?.value }))
      : owned.map(entry => ({ name: entry.name, id: entry.cardId, quantity: entry.quantity, value: collectionUnitPrice(entry, asian || id === 'jumbo' || entry.variant !== 'normal' || prices[entry.cardId]?.price?.basis !== 'guide' ? undefined : prices[entry.cardId]?.price?.value) }))
    const valued = source.filter((item): item is typeof item & { value: number } => item.value !== undefined)
    const values = valued.map(item => item.value)
    const top = [...valued].sort((a, b) => b.value - a.value)
    const total = set?.cardCount.total ?? catalogue.length
    return {
      id,
      name: set?.name ?? id,
      total,
      owned: new Set(owned.map(entry=>entry.cardId)).size,
      copies: owned.reduce((count, item) => count + item.quantity, 0),
      progress: total ? Math.min(100,new Set(owned.map(entry=>entry.cardId)).size / total * 100) : 0,
      totalValue: valued.reduce((count, item) => count + item.value * item.quantity, 0),
      average: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      median: median(values),
      top,
      missing: source.length - valued.length,
      loaded: mode === 'market' ? valued.length : source.length,
      valued: valued.length,
    }
  }).sort((a, b) => sort === 'progress' ? b.progress - a.progress
    : sort === 'average' ? b.average - a.average
      : sort === 'median' ? b.median - a.median
        : sort === 'top' ? (b.top[0]?.value ?? 0) - (a.top[0]?.value ?? 0)
          : sort === 'count' ? b.total - a.total
            : b.totalValue - a.totalValue), [selected, sets, entries, language, prices, details, marketPrices, mode, sort, asian])

  const available = sets.filter(item => normalizeSearch(`${item.name} ${item.id}`).includes(normalizeSearch(query))).slice(0, 60)
  const marketNote = asian
    ? 'Aucune cote locale JP / ZH-TW n’est intégrée.'
    : language === 'fr'
      ? 'Les valeurs marché utilisent Cardmarket Europe, toutes langues confondues; ce n’est pas une cote française.'
      : language === 'en'
        ? 'Ce comparatif utilise Cardmarket Europe (EUR); TCGplayer Amérique du Nord (USD) reste séparé dans le classeur.'
        : ''

  return <div className="details-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} className="series-comparison card-details" role="dialog" aria-modal="true" aria-labelledby="comparison-title" aria-describedby="comparison-help">
      <button className="details-close" onClick={onClose} aria-label="Fermer la comparaison"><X /></button>
      <span className="eyebrow">Analyse progressive</span>
      <h2 id="comparison-title">Comparer les séries</h2>
      <p id="comparison-help">Compare jusqu’à 4 extensions. {marketNote}</p>
      <div className="comparison-modes">
        <button className={mode === 'collection' ? 'active' : ''} onClick={() => setMode('collection')}>Ma collection</button>
        <button className={mode === 'market' ? 'active' : ''} onClick={() => setMode('market')}>Marché des extensions</button>
      </div>
      <div className="comparison-selected"><strong>Sélectionnées</strong>{selected.map(id => <button key={id} onClick={() => selected.length > 1 && setSelected(current => current.filter(value => value !== id))}>{sets.find(item => item.id === id)?.name ?? id} ×</button>)}</div>
      <input className="comparison-search" aria-label="Rechercher une extension à comparer" value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher une extension…" />
      <div className="comparison-picker">{available.map(set => <label key={set.id} className={selected.includes(set.id) ? 'selected' : ''}><input type="checkbox" checked={selected.includes(set.id)} disabled={!selected.includes(set.id) && selected.length >= 4} onChange={() => setSelected(current => current.includes(set.id) ? (current.length > 1 ? current.filter(id => id !== set.id) : current) : [...current, set.id])} />{set.name}<small>{set.id}</small></label>)}</div>
      <label className="comparison-sort">Trier par <select value={sort} onChange={event => setSort(event.target.value as Sort)}><option value="total">Valeur totale</option><option value="collection">Valeur de ma collection</option><option value="progress">Progression</option><option value="average">Moyenne</option><option value="median">Médiane</option><option value="top">Top carte</option><option value="count">Nombre de cartes</option></select></label>
      <div className="comparison-grid">{rows.map(row => <article key={row.id}>
        <h3>{row.name}</h3>
        {mode === 'market' ? <>
          <strong>{row.loaded} / {row.total} prix disponibles</strong>
          <span>{row.valued} cartes valorisées · {row.missing} sans prix</span>
          <span>Valeur totale théorique : {money(row.totalValue)}</span>
          <span>Prix moyen : {money(row.average)} · médian : {money(row.median)}</span>
          <span>Prix max : {row.top[0] ? money(row.top[0].value) : 'indisponible'}</span>
          <ol>{row.top.slice(0, 5).map(item => <li key={item.id}>{item.name} · {money(item.value)}</li>)}</ol>
          <small>{asian ? 'Cote locale indisponible.' : `Référence Cardmarket Europe en EUR, non filtrée par langue${language === 'fr' ? ' française' : ''}.`}</small>
        </> : <>
          <strong>{row.owned} / {row.total} cartes · {row.copies} exemplaires</strong>
          <span>{row.progress.toFixed(1)} % complété</span>
          <span>Valeur de mes cartes : {money(row.totalValue)}</span>
          <span>Prix moyen : {money(row.average)}</span>
          <span>Top : {row.top[0] ? `${row.top[0].name} · ${money(row.top[0].value)}` : 'indisponible'}</span>
          <span>{row.missing} carte(s) sans prix</span>
        </>}
      </article>)}</div>
    </section>
  </div>
}
