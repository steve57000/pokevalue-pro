import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Bell, BellRing, CheckCircle2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useCardPrices, refreshCardPrices, type CardPriceState } from '../hooks/useCardPrices'
import { createPriceAlert, markReachedPriceAlerts, parsePriceAlerts, priceAlertKey, PRICE_ALERTS_STORAGE_KEY, type PriceAlert } from '../domain/priceAlerts'
import type { CollectionEntry } from '../domain/collection'
import type { FavoriteCard } from '../domain/favorites'
import type { Card } from '../types'
import { readStoredJson, writeStoredJson } from '../utils/storage'
import { money } from '../utils/money'
import { isAsianCatalogLanguage } from '../domain/pricing'

type TrackedCard = { id: string; language: string; name: string; setName: string; number?: string }
type Props = { cards: Card[]; entries: CollectionEntry[]; favorites: FavoriteCard[] }
const languages = ['fr', 'en', 'ja', 'zh-tw'] as const
type SupportedLanguage = typeof languages[number]
const identity = (card: Pick<TrackedCard, 'id' | 'language'>) => `${card.language}:${card.id}`

function normalizeLanguage(value: string): SupportedLanguage {
  const language = value.toLowerCase()
  if (language === 'ja' || language === 'jp') return 'ja'
  if (language === 'zh' || language === 'zh-tw' || language === 'zh_tw') return 'zh-tw'
  return language === 'en' ? 'en' : 'fr'
}

function languageLabel(value: string) {
  return value === 'ja' ? 'JP' : value === 'zh-tw' ? 'ZH' : value.toUpperCase()
}

export function PriceAlertsPage({ cards, entries, favorites }: Props) {
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => parsePriceAlerts(readStoredJson<unknown>(PRICE_ALERTS_STORAGE_KEY, [])))
  const [selectedKey, setSelectedKey] = useState('')
  const [direction, setDirection] = useState<'below' | 'above'>('below')
  const [targetPrice, setTargetPrice] = useState('')
  const [message, setMessage] = useState('')

  const trackedCards = useMemo(() => {
    const byKey = new Map<string, TrackedCard>()
    const add = (item: TrackedCard) => byKey.set(identity(item), item)
    for (const card of cards) if (card.tcgdexId) add({ id: card.tcgdexId, language: normalizeLanguage(card.language), name: card.name, setName: card.set, number: card.number })
    for (const entry of entries) if (entry.quantity > 0 && entry.setId !== 'jumbo' && entry.variant === 'normal') add({ id: entry.cardId, language: normalizeLanguage(entry.language), name: entry.name, setName: entry.setName, number: entry.number })
    for (const favorite of favorites) {
      if (favorite.setId === 'jumbo') continue
      const id = favorite.source === 'editorial' ? cards.find(card => card.id === favorite.cardId)?.tcgdexId : favorite.cardId
      if (id) add({ id, language: normalizeLanguage(favorite.language), name: favorite.name, setName: favorite.setName, number: favorite.localId })
    }
    return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr') || a.setName.localeCompare(b.setName, 'fr'))
  }, [cards, entries, favorites])

  const selected = trackedCards.find((card) => identity(card) === selectedKey) ?? trackedCards[0]
  const idsFor = (language: SupportedLanguage) => [...new Set([
    ...alerts.filter((alert) => normalizeLanguage(alert.language) === language).map((alert) => alert.cardId),
    ...(selected && selected.language === language ? [selected.id] : []),
  ])]
  const frPrices = useCardPrices(idsFor('fr'), 'fr')
  const enPrices = useCardPrices(idsFor('en'), 'en')
  const jaPrices = useCardPrices(idsFor('ja'), 'ja')
  const zhPrices = useCardPrices(idsFor('zh-tw'), 'zh-tw')
  const pricesByLanguage: Record<SupportedLanguage, Record<string, CardPriceState>> = { fr: frPrices, en: enPrices, ja: jaPrices, 'zh-tw': zhPrices }
  const getPrice = (id: string, language: string) => pricesByLanguage[normalizeLanguage(language)][id]
  const current = selected ? getPrice(selected.id, selected.language) : undefined

  useEffect(() => { writeStoredJson(PRICE_ALERTS_STORAGE_KEY, alerts) }, [alerts])

  const observedSignature = alerts.map((alert) => {
    const state = getPrice(alert.cardId, alert.language)
    return `${alert.id}:${state?.status ?? 'missing'}:${state?.price?.value ?? ''}:${state?.checkedAt ?? ''}`
  }).join('|')
  useEffect(() => {
    const values = new Map<string, number>()
    for (const alert of alerts) {
      const value = getPrice(alert.cardId, alert.language)?.price?.value
      if (typeof value === 'number') values.set(priceAlertKey(alert), value)
    }
    setAlerts((currentAlerts) => markReachedPriceAlerts(currentAlerts, values))
  // The signature changes only when an alert's market quote changes; using it avoids re-evaluating on unrelated renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observedSignature])

  const activeCount = alerts.filter((alert) => !alert.triggeredAt).length
  const triggeredCount = alerts.length - activeCount

  const addAlert = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    const price = Number(targetPrice.replace(',', '.'))
    if (!Number.isFinite(price) || price <= 0) {
      setMessage('Entre un seuil supérieur à 0 €.')
      return
    }
    const duplicate = alerts.some((alert) => priceAlertKey(alert) === identity(selected) && alert.direction === direction && alert.targetPrice === price && !alert.triggeredAt)
    if (duplicate) {
      setMessage('Cette alerte existe déjà.')
      return
    }
    setAlerts((currentAlerts) => [...currentAlerts, createPriceAlert({ cardId: selected.id, language: selected.language, name: selected.name, setName: selected.setName, number: selected.number, direction, targetPrice: price })])
    setTargetPrice('')
    setMessage(`Alerte créée pour ${selected.name}.`)
  }

  const refreshAll = () => {
    for (const language of languages) {
      const ids = [...new Set(alerts.filter((alert) => normalizeLanguage(alert.language) === language).map((alert) => alert.cardId))]
      if (ids.length) refreshCardPrices(ids, language)
    }
    setMessage('Actualisation des prix Cardmarket lancée.')
  }

  const removeAlert = (id: string) => setAlerts((currentAlerts) => currentAlerts.filter((alert) => alert.id !== id))

  return <section className="price-alerts-page">
    <div className="page-heading"><span className="eyebrow"><Bell size={15}/> Suivi du marché</span><h1>Alertes de prix</h1><p>Choisis une carte de ta collection ou de tes favoris et fixe ton seuil Cardmarket.</p></div>
    <div className="alerts-summary">
      <div><span>Alertes actives</span><strong>{activeCount}</strong></div>
      <div><span>Objectifs atteints</span><strong>{triggeredCount}</strong></div>
      <button type="button" onClick={refreshAll} disabled={alerts.length === 0}><RefreshCw size={16}/> Actualiser les prix</button>
    </div>

    <div className="price-alerts-layout">
      <form className="price-alert-form" onSubmit={addAlert}>
        <span className="eyebrow"><Plus size={14}/> Nouvelle alerte</span>
        <h2>Surveiller une carte</h2>
        {trackedCards.length ? <>
          <label>Carte<select value={selected ? identity(selected) : ''} onChange={(event) => setSelectedKey(event.target.value)}>{trackedCards.map((card) => <option key={identity(card)} value={identity(card)}>{card.name} · {card.setName} ({languageLabel(card.language)})</option>)}</select></label>
          <div className="alert-current-price" role="status">
            <span>Prix Cardmarket Europe · EUR</span>
            <strong>{current?.status === 'success' && current.price ? money(current.price.value) : current?.status === 'error' || current?.status === 'success' ? 'Prix indisponible' : 'Chargement…'}</strong>
            {current?.status === 'success' && !current.price && <small>Aucun prix Cardmarket disponible pour cette carte.</small>}
            {selected && isAsianCatalogLanguage(selected.language) && <small>Référence européenne uniquement; elle ne représente pas le marché local asiatique.</small>}
          </div>
          <div className="alert-threshold-fields">
            <label>Déclencher<select value={direction} onChange={(event) => setDirection(event.target.value as 'below' | 'above')}><option value="below">À ce prix ou moins</option><option value="above">À ce prix ou plus</option></select></label>
            <label>Seuil Cardmarket Europe (€)<input type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="Ex. 25,00" value={targetPrice} onChange={(event) => setTargetPrice(event.target.value)} required/></label>
          </div>
          <button className="feature-primary" type="submit"><BellRing size={17}/> Créer l’alerte</button>
        </> : <p className="alert-no-cards">Ajoute d’abord une carte à ta collection ou à tes favoris pour la surveiller.</p>}
        <p className="alerts-note">Vérification à l’ouverture et à l’actualisation. Les alertes s’affichent dans l’application.</p>
        {message && <p className="feature-feedback" role="status" aria-live="polite">{message}</p>}
      </form>

      <div className="price-alert-list">
        <div className="feature-section-heading"><div><span className="eyebrow"><Bell size={14}/> Mon suivi</span><h2>Mes alertes</h2></div><strong>{alerts.length}</strong></div>
        {alerts.length ? alerts.map((alert) => {
          const state = getPrice(alert.cardId, alert.language), value = state?.price?.value
          return <article className={`price-alert-row${alert.triggeredAt ? ' triggered' : ''}`} key={alert.id}>
            <div className="price-alert-icon">{alert.triggeredAt ? <CheckCircle2 size={20}/> : <Bell size={20}/>}</div>
            <div className="price-alert-copy"><strong>{alert.name}</strong><span>{alert.setName}{alert.number ? ` · nº ${alert.number}` : ''} · {languageLabel(alert.language)}</span><small>{alert.direction === 'below' ? 'Alerte Cardmarket Europe sous' : 'Alerte Cardmarket Europe au-dessus de'} {money(alert.targetPrice)} · {value !== undefined ? `actuellement ${money(value)}` : state?.status === 'loading' ? 'prix en chargement' : 'prix indisponible'}</small>{isAsianCatalogLanguage(alert.language)&&<small>Référence européenne, non locale.</small>}{alert.triggeredAt && <b className="price-alert-hit">Objectif atteint à {money(alert.triggeredPrice ?? alert.targetPrice)} · {new Date(alert.triggeredAt).toLocaleString('fr-FR')}</b>}</div>
            <button className="alert-delete" type="button" aria-label={`Supprimer l’alerte pour ${alert.name}`} onClick={() => removeAlert(alert.id)}><Trash2 size={17}/></button>
          </article>
        }) : <div className="feature-empty"><Bell size={28}/><strong>Aucune alerte pour l’instant</strong><span>Crée un seuil pour voir apparaître ici son suivi.</span></div>}
      </div>
    </div>
    <p className="alerts-disclaimer">Source : prix Cardmarket Europe fournis par TCGdex lorsqu’ils sont disponibles, sans filtre de langue. Les alertes ne sont pas des notifications en arrière-plan ; garde l’application ouverte pour voir les objectifs atteints.</p>
  </section>
}
