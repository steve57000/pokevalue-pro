import { migrateMarketObservations } from './domain/collectionExtras'
import { SalesPage } from './components/SalesPage'
import { initializePriceHistory } from './domain/priceHistory'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Search, Heart, Moon, Sun, Sparkles, TrendingUp, ShieldCheck, History,
  SlidersHorizontal, X, ChevronRight, Calculator, BookOpen,
  Library, ArrowUpRight, AlertTriangle, CheckCircle2, Cloud, Menu, Bell, Tag
} from 'lucide-react'
import { buildPokemonTcgImageFallback } from './api/tcgdex'
import { cards, rarities, sets } from './data'
import { CardImage } from './components/CardImage'
import { CatalogueImage } from './components/CatalogueImage'
import { CardIdentifier } from './components/CardIdentifier'
import {CardWorkspace} from './components/CardWorkspace'
import {useModalDialog} from './hooks/useModalDialog'
import { Portfolio } from './components/Portfolio'
import { GradingPage } from './components/GradingPage'
import { CollectionSyncSettings } from './components/CollectionSyncSettings'
import { ScrollToTop } from './components/ScrollToTop'
import { LivePrice } from './components/LivePrice'
import { isAsianCatalogLanguage, selectCardmarketPrice } from './domain/pricing'
import { useCardPrices } from './hooks/useCardPrices'
import { normalizeSearch } from './domain/catalogue'
import { sortFavoritesByPrice } from './domain/favorites'
import { normalizeImageLanguage } from './domain/image'
import type { ScannerCandidate } from './domain/scanner'
import { useLiveCards } from './hooks/useLiveCards'
import { money } from './utils/money'
import { readStoredJson, readStoredString, writeStoredJson, writeStoredString, STORAGE_WARNING_EVENT, STORAGE_RECOVERED_EVENT } from './utils/storage'
import { PRICE_HISTORY_STORAGE_KEY } from './domain/priceHistory'
import type { Card } from './types'
import { collectionUnitPrice, emptyCollection, parseCollection, setIdFromCardId, updateCollectionCard, findCollectionEntry, type CollectionCard, type CollectionDocument } from './domain/collection'
import { useGitHubCollectionSync } from './hooks/useGitHubCollectionSync'
import { useGitHubPriceHistorySync } from './hooks/useGitHubPriceHistorySync'
import { useFavorites } from './hooks/useFavorites'
import { FavoriteButton } from './components/FavoriteButton'
import { PriceHistoryPage } from './components/PriceHistoryPage'
import { PriceAlertsPage } from './components/PriceAlertsPage'
import { SharedChallengePage, WeeklyCollectionChallenge } from './components/WeeklyCollectionChallenge'
import type { FavoriteCard, FavoriteInput } from './domain/favorites'
import './feature-additions.css'

type View = 'collection' | 'featured' | 'scanner' | 'favorites' | 'history' | 'alerts' | 'share' | 'grading' | 'sales' | 'estimator' | 'guide' | 'sync'

const SCANNED_CARDS_STORAGE_KEY = 'pv-scanned-cards-v1'
const PORTFOLIO_STORAGE_KEY = 'pv-portfolio-v1'
const validViews: View[] = ['collection', 'featured', 'scanner', 'favorites', 'history', 'alerts', 'grading', 'sales', 'estimator', 'guide', 'sync']
const routeView = (): View => {
  if (window.location.hash.startsWith('#share=')) return 'share'
  const candidate = window.location.hash.startsWith('#/') ? window.location.hash.slice(2) as View : window.location.hash.slice(1) as View
  if (candidate === 'scanner') return 'featured' // legacy links open the market-search tab
  return validViews.includes(candidate) ? candidate : 'collection'
}

function readRecentScans(): ScannerCandidate[] {
  const stored = readStoredJson<unknown>(SCANNED_CARDS_STORAGE_KEY, [])
  if (!Array.isArray(stored)) return []
  return stored.flatMap((item): ScannerCandidate[] => {
    if (!item || typeof item !== 'object') return []
    const candidate = item as Partial<ScannerCandidate>
    if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') return []
    return [{
      ...candidate,
      fallbackImage: candidate.fallbackImage ?? buildPokemonTcgImageFallback(candidate.id),
    } as ScannerCandidate]
  })
}

function App() {
  const [theme, setTheme] = useState<'dark'|'light'>(() => readStoredString('pv-theme') === 'light' ? 'light' : 'dark')
  const [view, setView] = useState<View>(routeView)
  const viewRef=useRef<View>(view), scrollByView=useRef<Record<View,number>>({collection:0,featured:0,scanner:0,favorites:0,history:0,alerts:0,share:0,grading:0,sales:0,estimator:0,guide:0,sync:0})
  const [query, setQuery] = useState('')
  const [setFilter, setSetFilter] = useState('Toutes')
  const [rarityFilter, setRarityFilter] = useState('Toutes')
  const [minValue, setMinValue] = useState(0)
  const [selected, setSelected] = useState<Card|null>(null)
  const {favorites,isFavorite,toggleFavorite} = useFavorites(cards)
  const [showcase, setShowcase] = useState<Card|null>(null)
  const [showcaseFavorite, setShowcaseFavorite] = useState<FavoriteInput|null>(null)
  const recoveryRef = useRef(false)
  const [portfolio, setPortfolio] = useState<CollectionDocument>(() => {
    const stored=readStoredJson<unknown>(PORTFOLIO_STORAGE_KEY, emptyCollection())
    try { return migrateMarketObservations(parseCollection(stored)) } catch { recoveryRef.current=true;writeStoredJson('pv-portfolio-recovery-v1',stored); return emptyCollection() }
  })
  const [recentScans] = useState<ScannerCandidate[]>(readRecentScans)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [trendTab,setTrendTab]=useState<'popular'|'market'>(()=>window.location.hash.includes('scanner')?'market':'popular')
  const [storageWarning, setStorageWarning] = useState<string | null>(()=>recoveryRef.current?'collection-recovery':null)
  const { entries: liveCards, retry } = useLiveCards(view === 'featured' ? cards : [])
  const menuRef = useModalDialog(() => setMobileMenuOpen(false), mobileMenuOpen, false)
  const githubSync = useGitHubCollectionSync(portfolio, setPortfolio)
  const priceHistorySync = useGitHubPriceHistorySync(githubSync.activeConnection)
  useEffect(() => { void initializePriceHistory() }, [])

  useEffect(() => {
    const warn = (event: Event) => {
      const key = (event as CustomEvent<{ key?: string }>).detail?.key
      if (key === PORTFOLIO_STORAGE_KEY || key === PRICE_HISTORY_STORAGE_KEY) setStorageWarning(key)
    }
    const recovered = (event: Event) => {
      const key = (event as CustomEvent<{ key?: string }>).detail?.key
      setStorageWarning(current => current === key ? null : current)
    }
    window.addEventListener(STORAGE_WARNING_EVENT, warn)
    window.addEventListener(STORAGE_RECOVERED_EVENT, recovered)
    return () => { window.removeEventListener(STORAGE_WARNING_EVENT, warn); window.removeEventListener(STORAGE_RECOVERED_EVENT, recovered) }
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    writeStoredString('pv-theme', theme)
  }, [theme])
  useEffect(() => { writeStoredJson(PORTFOLIO_STORAGE_KEY, portfolio) }, [portfolio])
  useEffect(() => { writeStoredJson(SCANNED_CARDS_STORAGE_KEY, recentScans) }, [recentScans])
  useEffect(() => {
    const titles: Record<View, string> = {
      collection: 'Collection', featured: trendTab==='market'?'Tendances · Recherche marché':'Tendances', scanner: 'Tendances',
      favorites: 'Favoris', history: 'Statistiques & prix', alerts: 'Alertes de prix', share: 'Défi partagé', grading: 'Gradation', sales: 'Ventes',
      estimator: 'Estimer un lot', guide: 'Guide achat', sync: 'Sauvegarde',
    }
    document.title = `${titles[view]} · PokéValue Pro`
  }, [view,trendTab])
  useEffect(() => {
    const onPopState = () => {
      const next = routeView()
      setTrendTab(window.location.hash.includes('scanner')?'market':'popular')
      if (next === viewRef.current) return
      scrollByView.current[viewRef.current] = window.scrollY
      viewRef.current = next
      setView(next)
      if (next !== 'featured') setQuery('')
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, scrollByView.current[next] ?? 0)))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  useEffect(() => {
    if (!mobileMenuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileMenuOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mobileMenuOpen])

  const filtered = useMemo(() => cards.filter(card => {
    const matchesText = `${card.name} ${card.pokemon} ${card.set} ${card.number}`.toLowerCase().includes(query.toLowerCase())
    const matchesSet = setFilter === 'Toutes' || card.set === setFilter
    const matchesRarity = rarityFilter === 'Toutes' || card.rarity === rarityFilter
    const matchesValue = card.rawMax >= minValue
    return matchesText && matchesSet && matchesRarity && matchesValue
  }), [query, setFilter, rarityFilter, minValue])
  const editorialFavorite=(card:Card):FavoriteInput=>({source:'editorial',cardId:card.id,setId:card.tcgdexId?.slice(0,card.tcgdexId.lastIndexOf('-')),language:normalizeImageLanguage(card.language),name:card.name,setName:card.set,localId:card.number,image:liveCards[card.id]?.data?.image})

  const collectionCard = (card: Card, favorite?: FavoriteInput | null): CollectionCard => ({
    source: 'tcgdex', cardId: card.tcgdexId ?? card.id, setId: favorite?.setId ?? setIdFromCardId(card.tcgdexId ?? card.id),
    language: normalizeImageLanguage(favorite?.language ?? card.language), variant: 'normal', name: card.name, setName: card.set,
    number: card.number, image: favorite?.image ?? liveCards[card.id]?.data?.image, rarity: card.rarity,
  })
  const togglePortfolioCard = (card: Card) => setPortfolio(current => {
    const identity = collectionCard(card), existing = findCollectionEntry(current, identity)
    return updateCollectionCard(current, identity, { quantity: existing?.quantity ? 0 : 1 })
  })

  const navigate=useCallback((next:View)=>{
    const destination:View=next==='scanner'?'featured':next
    if(next==='scanner')setTrendTab('market')
    if(destination===viewRef.current)return
    if(destination!=='featured')setQuery('')
    scrollByView.current[viewRef.current]=window.scrollY
    viewRef.current=destination
    window.history.pushState({pokevalueView:destination}, '', `${window.location.pathname}${window.location.search}#/${destination}`)
    setView(destination)
    requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo(0,scrollByView.current[destination]??0)))
  },[])

  const nav = [
    {id:'collection', label:'Collection', icon:Library,group:'Mon espace'},
    {id:'favorites', label:'Favoris', icon:Heart,group:'Mon espace'},
    {id:'sales', label:'Ventes', icon:Tag,group:'Mon espace'},
    {id:'grading', label:'Gradation', icon:ShieldCheck,group:'Mon espace'},
    {id:'featured', label:'Tendances', icon:TrendingUp,group:'Marché'},
    {id:'history', label:'Stats', icon:History,group:'Marché'},
    {id:'alerts', label:'Alertes prix', icon:Bell,group:'Marché'},
    {id:'estimator', label:'Estimer un lot', icon:Calculator,group:'Outils'},
    {id:'guide', label:'Guide achat', icon:BookOpen,group:'Outils'},
    {id:'sync', label:'Sauvegarde', icon:Cloud,group:'Données'},
  ] as const

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">PV</div>
          <div><strong>PokéValue</strong><span>PRO</span></div>
        </div>
        <nav>
          {nav.map((item,index) => {
            const Icon = item.icon
            const group=item.group,previous=index?nav[index-1].group:''
            return <div className="nav-item" key={item.id}>{group!==previous&&<span className="nav-label">{group}</span>}<button className={view===item.id?'active':''} aria-current={view===item.id?'page':undefined} onClick={()=>navigate(item.id)}>
              <Icon size={19}/><span>{item.label}</span>
              {item.id==='favorites' && favorites.length>0 && <b>{favorites.length}</b>}
              {item.id==='collection' && portfolio.entries.some(e=>e.quantity>0) && <b>{portfolio.entries.filter(e=>e.quantity>0).length}</b>}
            </button></div>
          })}
        </nav>
        <div className="side-card">
          <Sparkles size={20}/>
          <strong>Bien acheter</strong>
          <button onClick={()=>navigate('guide')}>Voir la méthode <ChevronRight size={15}/></button>
        </div>
        <p className="disclaimer">Prix indicatifs · Cardmarket / TCGdex</p>
      </aside>

      <main>
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark">PV</div><strong>PokéValue</strong></div>
          {view==='featured'&&trendTab==='popular'&&<div className="global-search"><Search size={18}/><input aria-label="Rechercher dans les tendances" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher dans les cartes tendance…"/></div>}
          <button className="icon-btn" aria-label={theme==='dark'?'Activer le thème clair':'Activer le thème sombre'} onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<Sun/>:<Moon/>}</button>
        </header>

        {storageWarning&&<div className="storage-warning" role="alert"><span>{storageWarning === 'collection-recovery' ? 'La sauvegarde locale est invalide. Une copie de récupération a été conservée. Importe une sauvegarde valide.' : storageWarning === PRICE_HISTORY_STORAGE_KEY ? 'L’historique n’a pas pu être enregistré sur cet appareil. Exporte une copie ou réessaie la sauvegarde.' : 'La collection n’a pas pu être sauvegardée. Vérifie l’espace disponible ou exporte une copie.'}</span><button onClick={()=>{setStorageWarning(null);navigate('sync')}}>Ouvrir sauvegarde</button><button className="storage-warning-close" aria-label="Fermer" onClick={()=>setStorageWarning(null)}><X size={18}/></button></div>}
        <div className="content" key={view}>
          {view==='collection'&&<Portfolio document={portfolio} onChange={setPortfolio} isFavorite={isFavorite} onFavorite={toggleFavorite} headerExtra={<details className="challenge-disclosure"><summary>Mon défi de collection</summary><WeeklyCollectionChallenge entries={portfolio.entries}/></details>}/>}
          {view==='featured' && <>
            <section className="hero">
              <div>
                <span className="eyebrow"><TrendingUp size={15}/> Marché Pokémon</span>
                <h1>Tendances</h1>
                <p>Une sélection à explorer, des prix à suivre.</p>
              </div>
              <div className="hero-stat">
                <span>Cartes de la sélection</span>
                <strong>{cards.length}</strong>
                <small>avec données de tendance indicatives</small>
              </div>
            </section>

            <nav className="trend-tabs" aria-label="Explorer le marché">
              <button type="button" className={trendTab==='popular'?'active':''} aria-pressed={trendTab==='popular'} onClick={()=>{setTrendTab('popular');setQuery('')}}><TrendingUp size={17}/> Tendances</button>
              <button type="button" className={trendTab==='market'?'active':''} aria-pressed={trendTab==='market'} onClick={()=>setTrendTab('market')}><Search size={17}/> Recherche marché</button>
            </nav>

            {trendTab==='market'?<CardIdentifier document={portfolio} onChange={setPortfolio} isFavorite={isFavorite} onFavorite={toggleFavorite}/>:<>
            <section className="filters">
              <div className="filter-title"><SlidersHorizontal size={17}/> Filtres</div>
              <select aria-label="Filtrer par extension" value={setFilter} onChange={e=>setSetFilter(e.target.value)}><option>Toutes</option>{sets.map(s=><option key={s}>{s}</option>)}</select>
              <select aria-label="Filtrer par rareté" value={rarityFilter} onChange={e=>setRarityFilter(e.target.value)}><option>Toutes</option>{rarities.map(r=><option key={r}>{r}</option>)}</select>
              <select aria-label="Valeur minimale" value={minValue} onChange={e=>setMinValue(Number(e.target.value))}>
                <option value="0">Toute valeur</option><option value="50">50 € et +</option><option value="100">100 € et +</option><option value="250">250 € et +</option><option value="500">500 € et +</option>
              </select>
              {(setFilter!=='Toutes'||rarityFilter!=='Toutes'||minValue>0||query) && <button className="reset" onClick={()=>{setSetFilter('Toutes');setRarityFilter('Toutes');setMinValue(0);setQuery('')}}><X size={15}/> Réinitialiser</button>}
            </section>

            <div className="result-head"><strong>{filtered.length} carte{filtered.length!==1?'s':''}</strong><span>Triées par score d’intérêt</span></div>
            <section className="card-grid">
              {[...filtered].sort((a,b)=>b.score-a.score).map(card =>
                <CardTile key={card.id} card={card} liveEntry={liveCards[card.id]} favorite={isFavorite(editorialFavorite(card))} collected={Boolean(findCollectionEntry(portfolio,collectionCard(card))?.quantity)}
                  onShowcase={()=>{setShowcase(card);setShowcaseFavorite(editorialFavorite(card))}} onOpen={()=>{setShowcaseFavorite(editorialFavorite(card));setSelected(card)}} onRetry={()=>retry(card.id)}
                  onFavorite={()=>toggleFavorite(editorialFavorite(card))}
                  onCollect={()=>togglePortfolioCard(card)}
                />
              )}
            </section>
            {filtered.length===0 && <div className="empty"><Search size={34}/><h3>Aucune carte trouvée</h3><p>Modifie les filtres ou la recherche.</p></div>}
            </>}
          </>}

          {view==='favorites'&&<FavoritesPage document={portfolio} favorites={favorites} editorialCards={cards} onShowcase={favorite=>{const editorial=cards.find(card=>card.id===favorite.cardId);setShowcaseFavorite(favorite);setShowcase(editorial??{id:favorite.cardId,name:favorite.name,pokemon:favorite.name,set:favorite.setName,year:0,number:favorite.localId??'',rarity:'',language:(favorite.language==='ja'?'JP':favorite.language==='en'?'EN':'FR'),rawMin:0,rawMax:0,graded10:0,trend:'stable',score:0,color:'#17233b',accent:'#6384bb',note:'',tcgdexId:favorite.source==='tcgdex'?favorite.cardId:undefined})}} onToggle={toggleFavorite}/>}
          {view==='history'&&<PriceHistoryPage cards={cards} entries={portfolio.entries} favorites={favorites} historySync={priceHistorySync}/>}
          {view==='alerts'&&<PriceAlertsPage cards={cards} entries={portfolio.entries} favorites={favorites}/>}
          {view==='share'&&<SharedChallengePage token={window.location.hash.slice('#share='.length)} onCreateChallenge={()=>navigate('collection')}/>}
          {view==='grading'&&<GradingPage document={portfolio} onChange={setPortfolio} syncLabel={githubSync.status==='saved'?'Synchronisé avec GitHub':githubSync.status==='pending'?'Sauvegarde en cours…':githubSync.status==='error'||githubSync.status==='conflict'?'Sauvegarde à vérifier':'Enregistré sur cet appareil'} onPriceHistory={()=>navigate('history')}/> }


          {view==='sales' && <SalesPage document={portfolio} onChange={setPortfolio} sync={githubSync}/>}
          {view==='estimator' && <Estimator />}
          {view==='guide' && <Guide />}
          {view==='sync' && <CollectionSyncSettings sync={githubSync} document={portfolio} onChange={setPortfolio}/>}
        </div>
      </main>

      <nav className="bottom-nav">
        {(['collection','favorites','featured','history'] as View[]).map(id=>{const item=nav.find(entry=>entry.id===id)!;const Icon=item.icon;return <button key={item.id} className={view===item.id?'active':''} aria-current={view===item.id?'page':undefined} onClick={()=>navigate(item.id)}><Icon size={20}/><span>{item.id==='history'?'Stats':item.id==='featured'?'Tendances':item.label.split(' ')[0]}</span></button>})}
        <button className={['sync','estimator','guide','grading','sales','alerts'].includes(view)?'active':''} aria-expanded={mobileMenuOpen} aria-controls="mobile-more-menu" onClick={()=>setMobileMenuOpen(true)}><Menu size={20}/><span>Plus</span></button>
      </nav>

      {mobileMenuOpen&&<div className="mobile-menu-backdrop" onMouseDown={()=>setMobileMenuOpen(false)}><div ref={menuRef as React.RefObject<HTMLDivElement>} id="mobile-more-menu" className="mobile-menu" role="dialog" aria-modal="true" aria-labelledby="mobile-more-title" onMouseDown={event=>event.stopPropagation()}><div><strong id="mobile-more-title">Plus de services</strong><button aria-label="Fermer le menu" autoFocus onClick={()=>setMobileMenuOpen(false)}><X/></button></div>{nav.filter(item=>['alerts','sync','estimator','guide','grading','sales'].includes(item.id)).map(item=>{const Icon=item.icon;return <button key={item.id} className={view===item.id?'active':''} aria-current={view===item.id?'page':undefined} onClick={()=>{navigate(item.id);setMobileMenuOpen(false)}}><Icon size={20}/>{item.label}</button>})}</div></div>}

      <ScrollToTop hidden={Boolean(selected)||Boolean(showcase)||mobileMenuOpen}/>

      {(showcase||selected)&&<CardWorkspace key={`${(showcase??selected)!.id}:${showcaseFavorite?.setId??''}:${showcaseFavorite?.language??''}`} card={collectionCard((showcase??selected)!,showcaseFavorite)} document={portfolio} onChange={setPortfolio} initialView={showcase?'showcase':'details'} favorite={isFavorite(showcaseFavorite??editorialFavorite((showcase??selected)!))} onFavorite={()=>toggleFavorite(showcaseFavorite??editorialFavorite((showcase??selected)!))} onClose={()=>{setShowcase(null);setSelected(null);setShowcaseFavorite(null)}}/>}

    </div>
  )
}

function CardTile({card,liveEntry,favorite,collected,onShowcase,onOpen,onRetry,onFavorite,onCollect}:{card:Card,liveEntry?:{status:'idle'|'loading'|'success'|'error';data?:import('./domain/cards').ExternalCard;error?:string},favorite:boolean,collected:boolean,onShowcase:()=>void,onOpen:()=>void,onRetry:()=>void,onFavorite:()=>void,onCollect:()=>void}) {
  const livePrice = selectCardmarketPrice(liveEntry?.data?.pricing)
  const hasLive = liveEntry?.status === 'success' && !!livePrice
  return <article className="poke-card">
    <div className={`card-visual ${card.tcgdexId ? 'with-real-image' : ''}`} onClick={onShowcase} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onShowcase()}}} role="button" tabIndex={0} aria-label={`Voir ${card.name} en 3D`} style={{background:`radial-gradient(circle at 70% 20%, ${card.accent}55, transparent 35%), linear-gradient(135deg, ${card.color}, #111827)`}}>
      <div className="card-number">{liveEntry?.data?.localId ?? card.number}</div>
      {card.tcgdexId ? <CatalogueImage card={{id:card.tcgdexId,name:card.name,localId:card.number}} requestedLanguage={normalizeImageLanguage(card.language)} quality="low"/> : <><div className="fake-orb"></div><div className="pokemon-name">{card.pokemon}</div></>}
      <div className="rarity-pill">{liveEntry?.data?.rarity ?? card.rarity}</div>
      <FavoriteButton className="heart" favorite={favorite} onToggle={onFavorite}/>
    </div>
    <div className="card-body">
      <div className="card-meta"><span>{card.year}</span><span>{card.language}</span><span className={`trend ${card.trend}`}>{card.trend==='up'?'↗':card.trend==='down'?'↘':'→'}</span></div>
      <h3>{card.name}</h3>
      <p>{card.set}</p>
      <div className="source-badge">{hasLive ? 'Référence Cardmarket (langue non filtrée)' : 'Estimation indicative'}</div>
      {liveEntry?.status === 'loading' && <div className="price-skeleton"/>}
      {liveEntry?.status === 'error' && <div className="api-error"><span>Donnée API indisponible</span><button onClick={(e)=>{e.stopPropagation();onRetry()}}>Réessayer</button></div>}
      {hasLive ? <LivePrice live={liveEntry?.data} compact /> : <div className="price-row"><div><small>Brute estimée</small><strong>{money(card.rawMin)} – {money(card.rawMax)}</strong></div><div className="score">{card.score.toFixed(1)}</div></div>}
      <div className="card-actions"><button onClick={onOpen}>Voir la fiche <ArrowUpRight size={15}/></button><button className={collected?'collected':''} onClick={onCollect}>{collected?<CheckCircle2 size={16}/>:<Library size={16}/>}</button></div>
    </div>
  </article>
}

function FavoritesPage({document,favorites,editorialCards,onShowcase,onToggle}:{document:CollectionDocument;favorites:FavoriteCard[];editorialCards:Card[];onShowcase:(favorite:FavoriteCard)=>void;onToggle:(favorite:FavoriteInput)=>void}) {
  const [sort,setSort]=useState('recent')
  const [language,setLanguage]=useState('all')
  const [search,setSearch]=useState('')
  const identity=(favorite:FavoriteCard)=>{const id=favorite.source==='editorial'?editorialCards.find(card=>card.id===favorite.cardId)?.tcgdexId??favorite.cardId:favorite.cardId;return {source:'tcgdex' as const,cardId:id,setId:favorite.setId??setIdFromCardId(id),language:normalizeImageLanguage(favorite.language),variant:'normal'}}
  const ids=(language:string)=>favorites.filter(favorite=>identity(favorite).language===language&&favorite.setId!=='jumbo').map(favorite=>identity(favorite).cardId)
  const fr=useCardPrices(ids('fr'),'fr'),en=useCardPrices(ids('en'),'en')
  const priceValues=new Map(favorites.map(favorite=>{const card=identity(favorite),entry=findCollectionEntry(document,card),quote=(card.language==='en'?en:fr)[card.cardId]?.price,market=card.setId==='jumbo'||isAsianCatalogLanguage(card.language)||quote?.basis!=='guide'?undefined:quote.value;return [favorite.key,entry?.quantity?collectionUnitPrice(entry,market):market]}))
  const needle=normalizeSearch(search)
  const ordered=sort==='price-asc'||sort==='price-desc'?sortFavoritesByPrice(favorites,priceValues,sort==='price-desc'):[...favorites].sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'fr'):sort==='set'?a.setName.localeCompare(b.setName,'fr'):b.addedAt.localeCompare(a.addedAt))
  const shown=ordered
    .filter(card => (language==='all' || normalizeImageLanguage(card.language)===language) && (!needle || normalizeSearch(`${card.name} ${card.setName} ${card.localId ?? ''}`).includes(needle)))


  return <section className="favorites-page">
    <div className="page-heading">
      <span className="eyebrow"><Heart size={15}/> Collection personnelle</span>
      <h1>Mes favoris</h1>
      <p>Retrouve rapidement les cartes que tu souhaites suivre.</p>
      <strong>{favorites.length} favori{favorites.length===1 ? '' : 's'}</strong>
    </div>
    {favorites.length===0
      ? <div className="empty favorites-empty"><Heart size={42}/><h2>Aucun favori pour le moment</h2><p>Utilise le cœur sur une carte pour la retrouver ici.</p></div>
      : <>
        <div className="favorites-controls">
          <label>Trier<select value={sort} onChange={event=>setSort(event.target.value)}><option value="recent">Ajout récent</option><option value="price-asc">Prix croissant</option><option value="price-desc">Prix décroissant</option><option value="name">Nom</option><option value="set">Extension</option></select></label>
          <label>Langue<select value={language} onChange={event=>setLanguage(event.target.value)}><option value="all">Toutes</option><option value="fr">FR</option><option value="en">EN</option><option value="ja">JP</option><option value="zh-tw">ZH</option></select></label>
          <label className="favorites-search"><Search size={16}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Rechercher un favori" aria-label="Rechercher parmi mes favoris"/></label>
        </div>
        <p className="favorites-result-count">{shown.length} résultat{shown.length===1 ? '' : 's'}</p>
        {shown.length===0
          ? <div className="empty favorites-empty"><Search size={35}/><h2>Aucun favori trouvé</h2><p>Modifie ta recherche ou le filtre de langue.</p></div>
          : <div className="favorites-grid">
            {shown.map(card => {
              const editorial=editorialCards.find(item=>item.id===card.cardId)
              const imageCardId=card.source==='editorial' ? (editorial?.tcgdexId ?? card.cardId) : card.cardId
              return <article key={card.key}>
                <button className="favorite-preview" onClick={()=>onShowcase(card)} aria-label={`Voir ${card.name} en 3D`}>
                  {editorial?.tcgdexId || card.source==='tcgdex'
                    ? <CatalogueImage card={{id:imageCardId,name:card.name,localId:card.localId ?? ''}} requestedLanguage={card.language} quality="low"/>
                    : <CardImage image={card.image} name={card.name} quality="low"/>}
                </button>
                <div><strong>{card.name}</strong><span>{card.localId && `Nº ${card.localId} · `}{card.setName}</span><small>{card.language.toUpperCase()}</small><b className="favorite-value">{priceValues.get(card.key)===undefined?'Prix indisponible':money(priceValues.get(card.key)!)}</b></div>
                <FavoriteButton favorite onToggle={()=>onToggle(card)}/>
              </article>
            })}
          </div>}
      </>}
  </section>
}

function Estimator() {
  const [commons,setCommons]=useState(100), [holos,setHolos]=useState(10), [ultras,setUltras]=useState(2), [premium,setPremium]=useState(0)
  const low = commons*.03 + holos*.25 + ultras*1.5 + premium*20
  const high = commons*.10 + holos*1 + ultras*5 + premium*100
  const maxBuy = low*.55
  return <section className="tool-page">
    <span className="eyebrow"><Calculator size={16}/> Estimation rapide</span><h1>Estimer un lot de cartes</h1><p>Une estimation prudente basée sur la composition du lot, avant vérification carte par carte.</p>
    <div className="estimator-grid">
      <div className="form-card">
        <Counter label="Communes / peu communes" value={commons} set={setCommons}/>
        <Counter label="Holo / reverse" value={holos} set={setHolos}/>
        <Counter label="Ultra rares classiques" value={ultras} set={setUltras}/>
        <Counter label="Cartes premium identifiées" value={premium} set={setPremium}/>
      </div>
      <div className="estimate-card">
        <span>Valeur indicative du lot</span><strong>{money(low)} – {money(high)}</strong>
        <div className="gauge"><i style={{width:`${Math.min(100,(high/300)*100)}%`}}/></div>
        <div className="max-buy"><small>Prix d’achat prudent conseillé</small><b>{money(maxBuy)}</b></div>
        <p><AlertTriangle size={17}/> Cette estimation ne remplace pas l’identification précise des cartes visibles.</p>
      </div>
    </div>
  </section>
}
function Counter({label,value,set}:{label:string,value:number,set:(v:number)=>void}) {
  return <label className="counter"><span>{label}</span><div><button onClick={()=>set(Math.max(0,value-1))}>−</button><input type="number" min="0" value={value} onChange={e=>set(Math.max(0,Number(e.target.value)))}/><button onClick={()=>set(value+1)}>+</button></div></label>
}

function Guide() {
  const steps = [
    ['1. Identifier','Lis le nom, le numéro de carte et l’extension. Une photo floue ne suffit pas.'],
    ['2. Authentifier','Vérifie le dos, la typographie, la texture, les couleurs et la qualité d’impression.'],
    ['3. Évaluer l’état','Observe les coins, bordures, plis, rayures holo, blanchiment et centrage.'],
    ['4. Comparer','Cherche des ventes réellement terminées dans la même langue et le même état.'],
    ['5. Fixer un prix maximum','Prévois les frais, le risque, le temps de revente et une marge de sécurité.'],
  ]
  return <section className="tool-page">
    <span className="eyebrow"><ShieldCheck size={16}/> Méthode chineur</span><h1>La check-list avant d’acheter</h1><p>Une méthode simple pour éviter les fausses bonnes affaires et les cartes contrefaites.</p>
    <div className="guide-grid">
      {steps.map(([title,text],i)=><article key={title}><div className="step">{i+1}</div><h3>{title}</h3><p>{text}</p></article>)}
    </div>
    <div className="warning-panel"><AlertTriangle size={28}/><div><h3>Attention aux cartes métalliques dorées</h3><p>La majorité des cartes “gold metal” imitant des cartes GX, EX ou VMAX ne sont pas des éditions officielles Pokémon et n’ont qu’une faible valeur décorative.</p></div></div>
  </section>
}

export default App
