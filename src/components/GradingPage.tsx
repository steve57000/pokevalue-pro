import { useMemo, useState } from 'react'
import { GradedSalesComparison } from './GradedSalesComparison'
import { GradedMarketComparison } from './GradedMarketComparison'
import { useGradedMarket } from '../hooks/useGradedMarket'
import { parseGradedSales, readGradedSales, saveGradedSales, type GradedSale } from '../domain/gradedSales'
import { ArrowUpRight, BadgeCheck, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { CatalogueImage } from './CatalogueImage'
import type { CollectionEntry } from '../domain/collection'
import { collectionUnitPrice } from '../domain/collection'
import { getGradingInterest } from '../domain/grading'
import { isAsianCatalogLanguage } from '../domain/pricing'
import { useCardPrices, type CardPriceState } from '../hooks/useCardPrices'
import { money } from '../utils/money'
import './grading.css'

type Props = {
  entries: CollectionEntry[]
  onPriceHistory: () => void
}
const languages = ['fr', 'en', 'ja', 'zh-tw'] as const
type Filter = 'all' | 'priority' | 'review'
const MIN_GRADING_VALUE = 20

export function GradingPage({ entries, onPriceHistory }: Props) {
  const {feed:gradedMarket,status:gradedSourceStatus} = useGradedMarket()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [showAllOwned, setShowAllOwned] = useState(false)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [gradedSales, setGradedSales] = useState<GradedSale[]>(readGradedSales)
  const [saleStorageError, setSaleStorageError] = useState('')
  const persistSales = (next: GradedSale[]) => {
    try {
      saveGradedSales(next)
      setGradedSales(next)
      setSaleStorageError('')
      return true
    } catch {
      setSaleStorageError('Enregistrement impossible : espace de stockage local indisponible ou saturé. Exporte tes ventes avant toute autre modification.')
      return false
    }
  }
  const exportSales = () => {
    const blob = new Blob([JSON.stringify(gradedSales, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'pokevalue-ventes-gradees.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const importSales = async (file?: File) => {
    if (!file) return
    try {
      const imported = parseGradedSales(JSON.parse(await file.text()))
      const knownIds = new Set(gradedSales.map(item => item.id))
      const knownSales = new Set(gradedSales.map(item => [item.cardKey,item.company,item.grade,item.sourceUrl].join('|')))
      const additions = imported.filter(item => {
        const sourceKey = [item.cardKey,item.company,item.grade,item.sourceUrl].join('|')
        if (knownIds.has(item.id) || knownSales.has(sourceKey)) return false
        knownIds.add(item.id)
        knownSales.add(sourceKey)
        return true
      })
      persistSales([...gradedSales, ...additions])
    } catch (caught) {
      setSaleStorageError(caught instanceof Error ? caught.message : 'Import impossible : fichier invalide.')
    }
  }
  const owned = useMemo(() => entries.filter(entry => entry.quantity > 0), [entries])
  const idsByLanguage = Object.fromEntries(languages.map(language => [
    language,
    [...new Set(owned.filter(entry => entry.language === language && entry.setId !== 'jumbo' && entry.variant === 'normal').map(entry => entry.cardId))],
  ])) as Record<typeof languages[number], string[]>
  const fr = useCardPrices(idsByLanguage.fr, 'fr')
  const en = useCardPrices(idsByLanguage.en, 'en')
  // TCGdex has no local graded or raw-market source for these print languages.
  // Fetching every Asian card only adds latency without yielding a compatible reference.
  const ja = useCardPrices([], 'ja')
  const zh = useCardPrices([], 'zh-tw')
  const priceMaps = { fr, en, ja, 'zh-tw': zh }

  const candidates = owned.map(entry => {
    const priceState = priceMaps[entry.language as keyof typeof priceMaps]?.[entry.cardId]
    const asian = isAsianCatalogLanguage(entry.language) || entry.setId === 'jumbo' || entry.variant !== 'normal'
    const marketPrice = asian || priceState?.price?.basis !== 'guide' ? undefined : priceState?.price?.value
    const unitPrice = collectionUnitPrice(entry, marketPrice)
    const interest = getGradingInterest({
      rawPrice: unitPrice,
      rarity: entry.rarity,
      ...(asian ? {} : { trend: priceState?.cardmarket?.trend, avg30: priceState?.cardmarket?.avg30, avg7: priceState?.cardmarket?.avg7, low: priceState?.cardmarket?.low }),
    })
    const poorCondition = entry.condition === 'played' || entry.condition === 'poor'
    const majorRarity = /secret|illustration|ultra|shiny|hyper|gold|special art|alt art|rainbow/i.test(entry.rarity ?? '')
    const needsPriceCheck = unitPrice === undefined
    const recommendation = poorCondition ? 'skip' : interest.level === 'high' ? 'priority' : 'review'
    const reasons = poorCondition
      ? ['État enregistré trop marqué pour une gradation orientée revente.']
      : interest.reasons
    return { entry, priceState, unitPrice, interest, recommendation, reasons, majorRarity, needsPriceCheck, asian }
  }).filter(item =>
    showAllOwned || (item.recommendation !== 'skip'
    && ((item.unitPrice !== undefined && item.unitPrice >= MIN_GRADING_VALUE) || (item.needsPriceCheck && item.majorRarity)))
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
    missingPrice: owned.filter(entry => {
      const usesManual = (entry.priceMode ?? (entry.manualPrice !== undefined ? 'manual' : 'market')) === 'manual'
      return !(usesManual && entry.manualPrice !== undefined) && (isAsianCatalogLanguage(entry.language) || !priceMaps[entry.language as keyof typeof priceMaps]?.[entry.cardId]?.price)
    }).length,
  }

  return <section className="grading-page">
    <header className="grading-heading">
      <span className="eyebrow"><BadgeCheck size={16}/> Atelier de collection</span>
      <h1>Préparer une gradation</h1>
      <p>Compare les notes et les ventes conclues, carte par carte, avant de choisir une société de gradation.</p>
      <button className="grading-history-link" onClick={onPriceHistory}>Ouvrir Stats et prix <ArrowUpRight size={16}/></button>
    </header>

    {gradedSourceStatus!=='unconfigured'&&<section className="grading-source-status" aria-live="polite" aria-label="État des prix gradés">
      <div className="grading-source-indicator">
        <span className="grading-source-dot" data-status={gradedSourceStatus} aria-hidden="true"/>
        <div>
          <strong>{gradedSourceStatus==='loading'?'Vérification des prix gradés…':
            
            gradedSourceStatus==='error'?'Source de prix gradés inaccessible':
            gradedSourceStatus==='cached'?'Derniers prix gradés enregistrés':
            gradedSourceStatus==='empty'?'Source connectée, sans observations':'Prix gradés automatiques disponibles'}</strong>
          <p>{gradedSourceStatus==='error'
              ?'Le flux de données n’a pas pu être lu. Aucun prix n’est inventé ; les ventes que tu as enregistrées sont conservées.'
              :gradedSourceStatus==='cached'
                ?'Le flux actuel ne fournit plus de données. Les dernières observations locales sont conservées et datées ; elles peuvent être anciennes.'
                :gradedSourceStatus==='active'
                  ?gradedMarket.quotes.length+' combinaisons carte / société / note suivies. Les cartes non couvertes restent sans cote.'
                  :gradedSourceStatus==='empty'
                    ?'Le flux répond, mais il ne contient encore aucune cotation gradée.'
                    :'Vérification du fichier de marché en cours.'}</p>
        </div>
      </div>
      <a href="https://github.com/steve57000/pokevalue-pro/blob/main/docs/graded-sales-feed.md" target="_blank" rel="noreferrer">Comprendre la connexion <ArrowUpRight size={15}/></a>
    </section>}
    <div className="grading-summary">
      <article><small>Cartes éligibles</small><strong>{candidates.length}</strong><span>Prix ≥ {money(MIN_GRADING_VALUE)} ou rareté majeure à vérifier</span></article>
      <article className="is-priority"><small>À examiner en priorité</small><strong>{counts.priority}</strong><span>Signaux de marché élevés</span></article>
      <article><small>Prix à vérifier</small><strong>{counts.missingPrice}</strong><span>Référence automatique indisponible</span></article>
    </div>

    <aside className="grading-disclaimer"><ShieldCheck size={20}/><p>Les prix bruts Cardmarket ne sont pas filtrés par langue. Pour les cartes gradées, consulte les liens vers les ventes terminées eBay et les guides externes, puis vérifie la langue, la note exacte et la variante. Aucun prix gradé automatique n'est déduit d'une annonce. La note future n'est jamais garantie.</p></aside>
    <div className="grading-data-actions">
      <button type="button" onClick={exportSales}>Exporter les ventes ({gradedSales.length})</button>
      <label>Importer des ventes (.json)<input type="file" accept=".json,application/json" hidden onChange={event=>{const file=event.currentTarget.files?.[0];event.currentTarget.value='';void importSales(file)}}/></label>
      <p>Sauvegarde locale distincte de ta collection : exporte ce fichier pour conserver les observations.</p>
      {saleStorageError&&<p role="alert" className="grading-data-error">{saleStorageError}</p>}
    </div>

    <section className="grading-candidates">
      <div className="grading-list-heading"><div><h2>Comparer mes cartes</h2><span>{analyzed.length} carte{analyzed.length === 1 ? '' : 's'} · {showAllOwned?'collection complète':'sélection à examiner'}</span></div><label className="grading-search"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nom, extension ou numéro"/></label></div>
      <div className="grading-filters" aria-label="Filtrer les cartes">
        <button type="button" className={showAllOwned ? 'active' : ''} aria-pressed={showAllOwned} onClick={()=>{setShowAllOwned(value=>!value);setFilter('all')}}>{showAllOwned?'Collection complète ✓':'Afficher toute la collection'}</button>
        {([['all','Toutes'],['priority','Prioritaires'],['review','À examiner']] as const).map(([value,label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}{value === 'priority' ? ` · ${counts.priority}` : value === 'review' ? ` · ${counts.review}` : ''}</button>)}
      </div>
      {owned.length === 0 ? <div className="grading-empty"><Sparkles size={24}/><h3>Ta collection est encore vide</h3><p>Ajoute des cartes dans l’onglet Collection : elles apparaîtront ici automatiquement.</p></div>
        : candidates.length === 0 ? <div className="grading-empty"><Sparkles size={24}/><h3>Aucune carte à forte valeur détectée</h3><p>Cette liste retient les cartes possédées dont le prix connu ou manuel atteint {money(MIN_GRADING_VALUE)}, ainsi que les raretés majeures sans prix disponible, à vérifier avant toute décision. Les cartes communes restent exclues sauf si leur valeur franchit le seuil. Un prix absent ne signifie pas qu’une carte vaut ce montant, et « à examiner » ne garantit pas la rentabilité.</p></div>
        : analyzed.length === 0 ? <div className="grading-empty"><Search size={24}/><h3>Aucun résultat</h3><p>Essaie un autre filtre ou une autre recherche.</p></div>
        : <div className="grading-card-grid">{analyzed.map(({ entry, priceState, unitPrice, interest, recommendation, reasons, needsPriceCheck, asian }) => {
          const usesManual = (entry.priceMode ?? (entry.manualPrice !== undefined ? 'manual' : 'market')) === 'manual' && entry.manualPrice !== undefined
          const label = recommendation === 'skip' ? 'État défavorable' : needsPriceCheck ? 'Valeur à vérifier' : recommendation === 'priority' ? 'À examiner en priorité' : 'À examiner'
          const card = { id: entry.cardId, name: entry.name, localId: entry.number ?? '', image: entry.image }
          return <article className={`grading-card ${recommendation}`} key={entry.key}>
            <div className="grading-card-image"><CatalogueImage card={card} requestedLanguage={entry.language} quality="low"/></div>
            <div className="grading-card-content">
              <div className="grading-card-title"><div><span>{entry.setName} · Nº {entry.number ?? '—'}</span><h3>{entry.name}</h3></div><span className={`grading-tag ${recommendation} ${needsPriceCheck ? 'price-check' : ''}`}>{label}</span></div>
              <div className="grading-price-line"><span>{usesManual ? 'Ton prix manuel' : asian ? 'Cote locale indisponible' : 'Référence Cardmarket Europe'}</span><strong>{unitPrice === undefined ? (priceState?.status === 'loading' ? 'Chargement…' : 'Indisponible') : money(unitPrice)}</strong></div>
              <div className="grading-meta"><span>Quantité : ×{entry.quantity}</span><span>État enregistré : {conditionLabel(entry.condition)}</span><span>Score indicatif : {interest.score}/100</span></div>
              <ul>{reasons.slice(0, 3).map(reason => <li key={reason}>{reason}</li>)}</ul>
              {recommendation === 'skip' ? <p className="grading-company-recommendation">État défavorable : la gradation peut rester utile pour protéger une carte, mais la revente est à examiner avec prudence.</p> : <Recommendation price={unitPrice}/>}
              {!usesManual && <small className="grading-price-note">{asian?'Aucune cote locale intégrée.':'Prix Cardmarket Europe non filtré par langue.'} · {entry.language.toUpperCase()}</small>}
              <button type="button" className="grading-compare-toggle" aria-expanded={expandedCard===entry.key} aria-controls={'compare-'+entry.key.replace(/[^a-z0-9_-]/gi,'-')} onClick={()=>setExpandedCard(current=>current===entry.key?null:entry.key)}><ArrowUpRight size={16}/> {expandedCard===entry.key?'Fermer le comparatif':'Comparer les ventes gradées'}{gradedSales.some(row=>row.cardKey===entry.key)?' · '+gradedSales.filter(row=>row.cardKey===entry.key).length+' vente(s)':''}</button>
            </div>
            {expandedCard===entry.key&&<div id={'compare-'+entry.key.replace(/[^a-z0-9_-]/gi,'-')} className="grading-comparison-slot">{gradedMarket.quotes.some(quote=>quote.cardKey===entry.key)&&<GradedMarketComparison entry={entry} feed={gradedMarket}/>}<GradedSalesComparison entry={entry} rawPrice={unitPrice} sales={gradedSales} onAdd={sale=>persistSales([...gradedSales,sale])} onRemove={id=>persistSales(gradedSales.filter(sale=>sale.id!==id))}/></div>}
          </article>
        })}</div>}
    </section>

    <section className="grading-advice">
      <div className="grading-section-title"><span className="eyebrow"><Sparkles size={15}/> Décider sans mauvaise surprise</span><h2>Quel service choisir ?</h2><p>Ce sont des repères de marché, pas une promesse de plus-value. Les frais et délais changent : vérifie toujours les tarifs officiels avant l’envoi.</p></div>
      <div className="grading-service-grid">
        <article><span className="grading-service-mark">PSA</span><h3>Revente et liquidité</h3><p>À privilégier si ton objectif principal est une revente facile et que la carte est recherchée, en excellent état et susceptible d’obtenir une note élevée.</p><small>Repère : carte brute autour de 100 € ou plus, après vérification du coût total et des ventes récentes.</small></article>
        <article><span className="grading-service-mark">PCA</span><h3>Certification française</h3><p>À considérer pour une démarche en France, une protection de collection ou une carte destinée à des acheteurs familiers de PCA. Son échelle comprend notamment 10+ Collector, 10 Neuf Sup’ et 9,5 Neuf.</p><small>Compare la demande pour PCA sur les ventes réellement conclues ; une note PCA ne se convertit pas directement en note PSA.</small></article>
        <article><span className="grading-service-mark">CCC</span><h3>Certification avec GradeReport®</h3><p>CCC distingue notamment 10 Neuf+, 10 Gold Label et 10 Black Label. Il faut comparer séparément chacune de ces étiquettes.</p><small><a href="https://www.cccgrading.com/fr/echelle-notation" target="_blank" rel="noreferrer">Échelle officielle CCC</a> · frais selon la valeur déclarée.</small></article>
        <article><span className="grading-service-mark">CollectAura</span><h3>Perfect et Gem Mint</h3><p>CollectAura propose notamment deux qualifications pour le 10 : Perfect et Gem Mint. Les ventes doivent être rattachées au bon label.</p><small><a href="https://www.collectaura.com/pages/grading-scale" target="_blank" rel="noreferrer">Échelle officielle CollectAura</a> · formules Standard, Subgrades et Advanced.</small></article>
        <article><span className="grading-service-mark">CGC</span><h3>Alternative à comparer</h3><p>À considérer pour une collection personnelle ou si le tarif et le service disponibles sont mieux adaptés à ta carte. Compare la demande locale pour cette société.</p><small>Ne choisis pas uniquement sur le prix annoncé : ajoute envoi, assurance et retour.</small></article>
        <article><span className="grading-service-mark">BGS</span><h3>Cartes premium impeccables</h3><p>À envisager surtout pour une carte haut de gamme dont centrage, surface, coins et bords sont exceptionnels, si tu recherches l’évaluation détaillée BGS.</p><small>Pour une carte très coûteuse, vérifie aussi le niveau de service et la valeur déclarée acceptés.</small></article>
      </div>
      <div className="grading-break-even"><strong>Règle de rentabilité</strong><p>Compare le prix de vente réel d’une carte gradée dans la note plausible avec la vente brute de la même impression et de la même langue. Déduis gradation, transports aller/retour, assurance, frais de vente et risque d’une note plus basse. Si le calcul ne reste pas positif, garde la carte raw.</p></div>
    </section>

    <section className="grading-advice grading-guide">
      <div className="grading-section-title"><span className="eyebrow"><BadgeCheck size={15}/> Le guide de la note</span><h2>Ce que le service examine</h2><p>La gradation combine l’authenticité, l’examen de l’état et la mise sous boîtier. La note dépend des critères propres au service et à l’édition ; elle ne peut pas être prédite à partir d’une photo.</p></div>
      <div className="grading-criteria-grid">
        <article><b>01</b><h3>Centrage</h3><p>Compare les bordures recto et verso. Un décalage visible peut limiter la note, même si la surface est propre. Les tolérances varient selon le service et la carte.</p></article>
        <article><b>02</b><h3>Coins et bords</h3><p>Inspecte les quatre coins, les découpes et les tranches. Points blancs, éclats, usure ou délamination comptent, y compris ceux présents dès l’impression.</p></article>
        <article><b>03</b><h3>Surface</h3><p>À la lumière rasante, cherche rayures, plis, creux, traces, défauts d’impression, taches et marques sur l’holographisme. Ne nettoie pas et ne tente aucune retouche.</p></article>
        <article><b>04</b><h3>Authenticité et altérations</h3><p>Le service peut refuser ou qualifier une carte coupée, recolorée, restaurée, modifiée ou d’authenticité douteuse. La certification n’est pas une réparation.</p></article>
      </div>
      <div className="grading-scale-grid">
        <article><span className="grading-service-mark">PSA</span><h3>Échelle propre à PSA</h3><p>PSA 10 décrit une carte quasiment parfaite selon ses standards : coins nets, mise au point et brillant d’origine, sans tache. Le centrage PSA 10 tolère environ 55/45 au recto et 75/25 au verso ; ces chiffres ne sont pas des règles universelles pour les autres sociétés.</p></article>
        <article><span className="grading-service-mark">PCA</span><h3>Repères PCA</h3><p>PCA distingue notamment 10+ Collector (qualité exceptionnelle), 10 Neuf Sup’ (aspect parfait avec de possibles micro-défauts d’origine) et 9,5 Neuf (aspect neuf avec de très rares défauts visibles à l’inspection). Consulte leur échelle illustrée complète.</p></article>
        <article><span className="grading-service-mark">BGS</span><h3>Sous-notes détaillées</h3><p>Beckett affiche des sous-notes pour le centrage, les coins, les bords et la surface, puis une note globale. Cela aide à comprendre les points forts et faibles ; vérifie les services et options disponibles au moment de soumettre.</p></article>
        <article><span className="grading-service-mark">CCC</span><h3>10 avec labels distincts</h3><p>CCC différencie notamment Neuf+, Gold Label et Black Label ; leur valeur de marché doit être évaluée indépendamment.</p></article>
        <article><span className="grading-service-mark">CollectAura</span><h3>Deux types de 10</h3><p>Perfect et Gem Mint sont deux grades distincts. Ne regroupe jamais leurs ventes pour calculer une médiane.</p></article>
        <article><span className="grading-service-mark">CGC</span><h3>Échelle CGC actuelle</h3><p>CGC utilise une échelle propre sur 10, avec Gem Mint 10 et Pristine 10 au sommet. Les anciennes étiquettes et anciennes notes CGC peuvent relever d’une échelle antérieure : compare toujours le type de certification.</p></article>
      </div>
      <p className="grading-guide-note"><strong>Important :</strong> un 10 chez PCA, PSA, BGS ou CGC n’est pas automatiquement équivalent à un 10 d’une autre société. Pour une revente, compare la même carte, la même langue, le même service et des ventes conclues récentes — pas les prix affichés ni les notes seules.</p>
    </section>

    <section className="grading-advice">
      <div className="grading-section-title"><span className="eyebrow"><ShieldCheck size={15}/> Avant l’envoi</span><h2>Protéger et préparer ses cartes</h2></div>
      <div className="grading-protection-grid">
        <article><b>1</b><h3>Manipuler proprement</h3><p>Mains propres et sèches, surface dégagée. Prends la carte par les bords ; évite de toucher la surface, surtout les zones brillantes.</p></article>
        <article><b>2</b><h3>Rangement quotidien</h3><p>Penny sleeve propre, puis top loader adapté. Insère et retire sans forcer ; évite humidité, chaleur et pression. Le top loader est pratique pour stocker, mais pas accepté par tous les services pour une soumission.</p></article>
        <article><b>3</b><h3>Respecter la consigne du service</h3><p>Pour PSA, utilise la protection souple et le semi-rigide demandés dans son guide, plutôt qu’un top loader. PCA indique une sleeve puis un top loader ou un Card Saver, sans scotcher ni mettre de team bag. Pour BGS et CGC, vérifie la consigne de soumission actuelle.</p></article>
        <article><b>4</b><h3>Emballer le colis</h3><p>Range les cartes dans l’ordre du formulaire, protège le lot entre cartons rigides, immobilise-le dans un carton solide et utilise un suivi avec assurance adaptée à la valeur.</p></article>
      </div>
      <div className="grading-official-links"><span>Références officielles :</span><a href="https://pcagrade.com/fr/ressources" target="_blank" rel="noreferrer">PCA · échelle, FAQ et envoi <ArrowUpRight size={14}/></a><a href="https://www.psacard.com/gradingstandards" target="_blank" rel="noreferrer">PSA · standards <ArrowUpRight size={14}/></a><a href="https://www.psacard.com/en-DE/info/shipguide" target="_blank" rel="noreferrer">PSA · préparation <ArrowUpRight size={14}/></a><a href="https://www.beckett.com/grading/scale" target="_blank" rel="noreferrer">BGS · échelle <ArrowUpRight size={14}/></a><a href="https://www.cgccards.com/card-grading/grading-scale/" target="_blank" rel="noreferrer">CGC · échelle <ArrowUpRight size={14}/></a><a href="https://www.cccgrading.com/fr/echelle-notation" target="_blank" rel="noreferrer">CCC · échelle <ArrowUpRight size={14}/></a><a href="https://www.collectaura.com/pages/grading-scale" target="_blank" rel="noreferrer">CollectAura · échelle <ArrowUpRight size={14}/></a></div>
    </section>
  </section>
}

function analyze(entry: CollectionEntry, prices: Record<string, Record<string, CardPriceState>>) {
  const price = prices[entry.language]?.[entry.cardId]
  const asian = isAsianCatalogLanguage(entry.language) || entry.setId === 'jumbo' || entry.variant !== 'normal'
  return getGradingInterest({ rawPrice: collectionUnitPrice(entry, asian || price?.price?.basis !== 'guide' ? undefined : price?.price?.value), rarity: entry.rarity, ...(asian ? {} : { trend: price?.cardmarket?.trend, avg30: price?.cardmarket?.avg30, avg7: price?.cardmarket?.avg7, low: price?.cardmarket?.low }) })
}

function conditionLabel(value: CollectionEntry['condition']) {
  return ({ mint: 'Mint', 'near-mint': 'Near Mint', excellent: 'Excellent', good: 'Good', played: 'Jouée', poor: 'Abîmée' })[value]
}

function Recommendation({ price }: { price?: number }) {
  if (price === undefined) return <p className="grading-company-recommendation">Prix insuffisant pour recommander un service ; vérifie d’abord le prix local de cette impression.</p>
  if (price >= 250) return <p className="grading-company-recommendation"><strong>À comparer : PSA, PCA ou BGS.</strong> PSA peut convenir si la liquidité est prioritaire ; PCA est à comparer pour une démarche française ; BGS se discute si l’état est exceptionnel. CGC reste une option selon le coût et ton objectif.</p>
  if (price >= 100) return <p className="grading-company-recommendation"><strong>À comparer : PSA en priorité.</strong> Compare aussi PCA et CGC si le coût total correspond mieux à ton objectif ; soumets seulement après examen minutieux.</p>
  if (price >= 20) return <p className="grading-company-recommendation"><strong>À étudier avec prudence.</strong> Compare PSA, PCA et CGC, frais complets compris ; la marge de rentabilité peut être faible à ce niveau.</p>
  return <p className="grading-company-recommendation"><strong>Conservation raw généralement préférable.</strong> À ce niveau de prix, les frais et l’envoi risquent de dépasser l’intérêt financier.</p>
}
