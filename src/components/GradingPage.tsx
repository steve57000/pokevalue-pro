import { useMemo, useState } from 'react'
import { ArrowUpRight, BadgeCheck, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { CatalogueImage } from './CatalogueImage'
import type { CollectionEntry } from '../domain/collection'
import { collectionUnitPrice } from '../domain/collection'
import { getGradingInterest } from '../domain/grading'
import { useCardPrices, type CardPriceState } from '../hooks/useCardPrices'
import { money } from '../utils/money'
import './grading.css'

type Props = {
  entries: CollectionEntry[]
  onPriceHistory: () => void
}
const languages = ['fr', 'en', 'ja', 'zh-tw'] as const
type Filter = 'all' | 'priority' | 'review'
const MIN_GRADING_VALUE = 50

export function GradingPage({ entries, onPriceHistory }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const owned = useMemo(() => entries.filter(entry => entry.quantity > 0), [entries])
  const idsByLanguage = Object.fromEntries(languages.map(language => [
    language,
    [...new Set(owned.filter(entry => entry.language === language).map(entry => entry.cardId))],
  ])) as Record<typeof languages[number], string[]>
  const fr = useCardPrices(idsByLanguage.fr, 'fr')
  const en = useCardPrices(idsByLanguage.en, 'en')
  const ja = useCardPrices(idsByLanguage.ja, 'ja')
  const zh = useCardPrices(idsByLanguage['zh-tw'], 'zh-tw')
  const priceMaps = { fr, en, ja, 'zh-tw': zh }

  const candidates = owned.map(entry => {
    const priceState = priceMaps[entry.language as keyof typeof priceMaps]?.[entry.cardId]
    const marketPrice = priceState?.price?.value
    const unitPrice = collectionUnitPrice(entry, marketPrice)
    const interest = getGradingInterest({
      rawPrice: unitPrice,
      rarity: entry.rarity,
      trend: priceState?.cardmarket?.trend,
      avg30: priceState?.cardmarket?.avg30,
      avg7: priceState?.cardmarket?.avg7,
      low: priceState?.cardmarket?.low,
    })
    const poorCondition = entry.condition === 'played' || entry.condition === 'poor'
    const recommendation = poorCondition ? 'skip' : interest.level === 'high' ? 'priority' : interest.level === 'medium' ? 'review' : 'skip'
    const reasons = poorCondition
      ? ['État enregistré trop marqué pour une gradation orientée revente.']
      : interest.reasons
    return { entry, priceState, unitPrice, interest, recommendation, reasons }
  }).filter(item =>
    item.unitPrice !== undefined
    && item.unitPrice >= MIN_GRADING_VALUE
    && item.recommendation !== 'skip'
  )

  const analyzed = candidates.filter(item => {
    const matchesFilter = filter === 'all'
      || (filter === 'priority' && item.recommendation === 'priority')
      || (filter === 'review' && item.recommendation === 'review')
    const needle = query.trim().toLocaleLowerCase()
    const matchesQuery = !needle || `${item.entry.name} ${item.entry.setName} ${item.entry.number ?? ''}`.toLocaleLowerCase().includes(needle)
    return matchesFilter && matchesQuery
  }).sort((a, b) => b.interest.score - a.interest.score || (b.unitPrice ?? 0) - (a.unitPrice ?? 0))

  const counts = {
    priority: candidates.filter(item => item.recommendation === 'priority').length,
    review: candidates.filter(item => item.recommendation === 'review').length,
    missingPrice: owned.filter(entry => !priceMaps[entry.language as keyof typeof priceMaps]?.[entry.cardId]?.price && (entry.priceMode !== 'manual' || entry.manualPrice === undefined)).length,
  }

  return <section className="grading-page">
    <header className="grading-heading">
      <span className="eyebrow"><BadgeCheck size={16}/> Atelier de collection</span>
      <h1>Préparer une gradation</h1>
      <p>Repère les cartes à examiner, compare les options et prépare-les sans confondre potentiel et garantie de note.</p>
      <button className="grading-history-link" onClick={onPriceHistory}>Ouvrir le suivi des prix <ArrowUpRight size={16}/></button>
    </header>

    <div className="grading-summary">
      <article><small>Cartes éligibles</small><strong>{candidates.length}</strong><span>Valeur ≥ {money(MIN_GRADING_VALUE)}</span></article>
      <article className="is-priority"><small>À examiner en priorité</small><strong>{counts.priority}</strong><span>Signaux de marché élevés</span></article>
      <article><small>Prix à vérifier</small><strong>{counts.missingPrice}</strong><span>Référence automatique indisponible</span></article>
    </div>

    <aside className="grading-disclaimer"><ShieldCheck size={20}/><p>La sélection est indicative : les prix Cardmarket de l’application ne sont pas filtrés par langue, et aucune estimation de note PSA/CGC/BGS ni de valeur de revente après gradation n’est disponible. Vérifie la langue, l’état réel, les ventes comparables et le coût total avant d’envoyer une carte.</p></aside>

    <section className="grading-candidates">
      <div className="grading-list-heading"><div><h2>Cartes à valeur significative</h2><span>{analyzed.length} carte{analyzed.length === 1 ? '' : 's'} · prix ≥ {money(MIN_GRADING_VALUE)}</span></div><label className="grading-search"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nom, extension ou numéro"/></label></div>
      <div className="grading-filters" aria-label="Filtrer les cartes">
        {([['all','Toutes'],['priority','Prioritaires'],['review','À examiner']] as const).map(([value,label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}{value === 'priority' ? ` · ${counts.priority}` : value === 'review' ? ` · ${counts.review}` : ''}</button>)}
      </div>
      {owned.length === 0 ? <div className="grading-empty"><Sparkles size={24}/><h3>Ta collection est encore vide</h3><p>Ajoute des cartes dans l’onglet Collection : elles apparaîtront ici automatiquement.</p></div>
        : candidates.length === 0 ? <div className="grading-empty"><Sparkles size={24}/><h3>Aucune carte à forte valeur détectée</h3><p>Cette liste retient les cartes possédées dont le prix connu ou manuel atteint {money(MIN_GRADING_VALUE)}, en état acceptable et avec un intérêt de gradation suffisant. Une carte commune reste une exception si sa valeur franchit ces critères. Les cartes sans prix confirmé ne sont pas affichées.</p></div>
        : analyzed.length === 0 ? <div className="grading-empty"><Search size={24}/><h3>Aucun résultat</h3><p>Essaie un autre filtre ou une autre recherche.</p></div>
        : <div className="grading-card-grid">{analyzed.map(({ entry, priceState, unitPrice, interest, recommendation, reasons }) => {
          const label = recommendation === 'priority' ? 'À examiner en priorité' : recommendation === 'review' ? 'À examiner' : 'Faible intérêt économique'
          const card = { id: entry.cardId, name: entry.name, localId: entry.number ?? '', image: entry.image }
          return <article className={`grading-card ${recommendation}`} key={entry.key}>
            <div className="grading-card-image"><CatalogueImage card={card} requestedLanguage={entry.language} quality="low"/></div>
            <div className="grading-card-content">
              <div className="grading-card-title"><div><span>{entry.setName} · Nº {entry.number ?? '—'}</span><h3>{entry.name}</h3></div><span className={`grading-tag ${recommendation}`}>{label}</span></div>
              <div className="grading-price-line"><span>{entry.priceMode === 'manual' && entry.manualPrice !== undefined ? 'Ton prix manuel' : 'Référence Cardmarket'}</span><strong>{unitPrice === undefined ? (priceState?.status === 'loading' ? 'Chargement…' : 'Indisponible') : money(unitPrice)}</strong></div>
              <div className="grading-meta"><span>Quantité : ×{entry.quantity}</span><span>État enregistré : {conditionLabel(entry.condition)}</span><span>Score indicatif : {interest.score}/100</span></div>
              <ul>{reasons.slice(0, 3).map(reason => <li key={reason}>{reason}</li>)}</ul>
              <Recommendation price={unitPrice}/>
              {entry.priceMode !== 'manual' && <small className="grading-price-note">Prix non filtré par langue · {entry.language.toUpperCase()}</small>}
            </div>
          </article>
        })}</div>}
    </section>

    <section className="grading-advice">
      <div className="grading-section-title"><span className="eyebrow"><Sparkles size={15}/> Décider sans mauvaise surprise</span><h2>Quel service choisir ?</h2><p>Ce sont des repères de marché, pas une promesse de plus-value. Les frais et délais changent : vérifie toujours les tarifs officiels avant l’envoi.</p></div>
      <div className="grading-service-grid">
        <article><span className="grading-service-mark">PSA</span><h3>Revente et liquidité</h3><p>À privilégier si ton objectif principal est une revente facile et que la carte est recherchée, en excellent état et susceptible d’obtenir une note élevée.</p><small>Repère : carte brute autour de 100 € ou plus, après vérification du coût total et des ventes récentes.</small></article>
        <article><span className="grading-service-mark">CGC</span><h3>Alternative à comparer</h3><p>À considérer pour une collection personnelle ou si le tarif et le service disponibles sont mieux adaptés à ta carte. Compare la demande locale pour cette société.</p><small>Ne choisis pas uniquement sur le prix annoncé : ajoute envoi, assurance et retour.</small></article>
        <article><span className="grading-service-mark">BGS</span><h3>Cartes premium impeccables</h3><p>À envisager surtout pour une carte haut de gamme dont centrage, surface, coins et bords sont exceptionnels, si tu recherches l’évaluation détaillée BGS.</p><small>Pour une carte très coûteuse, vérifie aussi le niveau de service et la valeur déclarée acceptés.</small></article>
      </div>
      <div className="grading-break-even"><strong>Règle de rentabilité</strong><p>Compare le prix de vente réel d’une carte gradée dans la note plausible avec la vente brute de la même impression et de la même langue. Déduis gradation, transports aller/retour, assurance, frais de vente et risque d’une note plus basse. Si le calcul ne reste pas positif, garde la carte raw.</p></div>
    </section>

    <section className="grading-advice">
      <div className="grading-section-title"><span className="eyebrow"><ShieldCheck size={15}/> Avant l’envoi</span><h2>Protéger et préparer ses cartes</h2></div>
      <div className="grading-protection-grid">
        <article><b>1</b><h3>Manipuler proprement</h3><p>Mains propres et sèches, surface dégagée. Prends la carte par les bords ; évite de toucher la surface, surtout les zones brillantes.</p></article>
        <article><b>2</b><h3>Rangement quotidien</h3><p>Penny sleeve propre, puis top loader adapté. Insère et retire sans forcer ; évite humidité, chaleur et pression. Le top loader est pratique pour stocker, mais pas accepté par tous les services pour une soumission.</p></article>
        <article><b>3</b><h3>Soumission PSA / BGS</h3><p>Pour l’envoi PSA, la consigne officielle est une sleeve transparente dans un étui semi-rigide type Card Saver ; PSA déconseille les top loaders. Suis toujours la notice propre au service choisi.</p></article>
        <article><b>4</b><h3>Emballer le colis</h3><p>Range les cartes dans l’ordre du formulaire, protège le lot entre cartons rigides, immobilise-le dans un carton solide et utilise un suivi avec assurance adaptée à la valeur.</p></article>
      </div>
      <div className="grading-official-links"><span>Consignes officielles :</span><a href="https://www.psacard.com/en-DE/info/shipguide" target="_blank" rel="noreferrer">PSA · préparation <ArrowUpRight size={14}/></a><a href="https://www.beckett.com/grading/submit" target="_blank" rel="noreferrer">BGS · soumission <ArrowUpRight size={14}/></a><a href="https://www.cgccards.com/submit/how-to-submit/" target="_blank" rel="noreferrer">CGC · soumission <ArrowUpRight size={14}/></a></div>
    </section>
  </section>
}

function analyze(entry: CollectionEntry, prices: Record<string, Record<string, CardPriceState>>) {
  const price = prices[entry.language]?.[entry.cardId]
  return getGradingInterest({ rawPrice: collectionUnitPrice(entry, price?.price?.value), rarity: entry.rarity, trend: price?.cardmarket?.trend, avg30: price?.cardmarket?.avg30, avg7: price?.cardmarket?.avg7, low: price?.cardmarket?.low })
}

function conditionLabel(value: CollectionEntry['condition']) {
  return ({ mint: 'Mint', 'near-mint': 'Near Mint', excellent: 'Excellent', good: 'Good', played: 'Jouée', poor: 'Abîmée' })[value]
}

function Recommendation({ price }: { price?: number }) {
  if (price === undefined) return <p className="grading-company-recommendation">Prix insuffisant pour recommander un service ; vérifie d’abord le prix français de cette impression.</p>
  if (price >= 250) return <p className="grading-company-recommendation"><strong>À comparer : PSA ou BGS.</strong> PSA est un repère pour la liquidité ; BGS se discute si l’état est exceptionnel. CGC reste une option selon le coût et ton objectif.</p>
  if (price >= 100) return <p className="grading-company-recommendation"><strong>À comparer : PSA en priorité.</strong> Envisage CGC si le coût total correspond mieux à ton objectif ; soumets seulement après examen minutieux.</p>
  if (price >= 50) return <p className="grading-company-recommendation"><strong>À étudier au cas par cas.</strong> Compare PSA et CGC, frais complets compris ; la marge de rentabilité peut être faible.</p>
  return <p className="grading-company-recommendation"><strong>Conservation raw généralement préférable.</strong> À ce niveau de prix, les frais et l’envoi risquent de dépasser l’intérêt financier.</p>
}
