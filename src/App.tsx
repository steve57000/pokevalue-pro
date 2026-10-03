import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Search, Heart, Moon, Sun, Sparkles, TrendingUp, ShieldCheck, History,
  SlidersHorizontal, X, ChevronRight, Calculator, BookOpen,
  Library, Star, ArrowUpRight, AlertTriangle, CheckCircle2, ScanLine, Cloud, Menu
} from 'lucide-react'
import { buildPokemonTcgImageFallback } from './api/tcgdex'
import { cards, rarities, sets } from './data'
import { CardImage } from './components/CardImage'
import { CatalogueImage } from './components/CatalogueImage'
import { CardIdentifier } from './components/CardIdentifier'
import {CardDetailsModal} from './components/CardDetailsModal'
import { Portfolio } from './components/Portfolio'
import { GradingPage } from './components/GradingPage'
import { CollectionSyncSettings } from './components/CollectionSyncSettings'
import { ScrollToTop } from './components/ScrollToTop'
import { LivePrice } from './components/LivePrice'
import { getPriceStats,selectCardmarketPrice } from './domain/pricing'
import type { ScannerCandidate } from './domain/scanner'
import { useLiveCards } from './hooks/useLiveCards'
import { money } from './utils/money'
import { readStoredJson } from './utils/storage'
import type { Card } from './types'
import { emptyCollection, parseCollection, setIdFromCardId, upsertEntry, type CollectionDocument } from './domain/collection'
import { useGitHubCollectionSync } from './hooks/useGitHubCollectionSync'
import { useFavorites } from './hooks/useFavorites'
import { FavoriteButton } from './components/FavoriteButton'
import { CardShowcase } from './components/CardShowcase'
import { PriceHistoryPage } from './components/PriceHistoryPage'
import type { FavoriteCard, FavoriteInput } from './domain/favorites'

type View = 'collection' | 'featured' | 'scanner' | 'favorites' | 'history' | 'grading' | 'estimator' | 'guide' | 'sync'

const SCANNED_CARDS_STORAGE_KEY = 'pv-scanned-cards-v1'

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
  const [theme, setTheme] = useState<'dark'|'light'>(() => (localStorage.getItem('pv-theme') as 'dark'|'light') || 'dark')
  const [view, setView] = useState<View>('collection')
  const viewRef=useRef<View>('collection'), scrollByView=useRef<Record<View,number>>({collection:0,featured:0,scanner:0,favorites:0,history:0,grading:0,estimator:0,guide:0,sync:0})
  const [query, setQuery] = useState('')
  const [setFilter, setSetFilter] = useState('Toutes')
  const [rarityFilter, setRarityFilter] = useState('Toutes')
  const [minValue, setMinValue] = useState(0)
  const [selected, setSelected] = useState<Card|null>(null)
  const {favorites,isFavorite,toggleFavorite} = useFavorites(cards)
  const [showcase, setShowcase] = useState<Card|null>(null)
  const [showcaseFavorite, setShowcaseFavorite] = useState<FavoriteInput|null>(null)
  const [portfolio, setPortfolio] = useState<CollectionDocument>(() => {
    try { return parseCollection(readStoredJson<unknown>('pv-portfolio-v1', emptyCollection())) } catch { return emptyCollection() }
  })
  const [recentScans, setRecentScans] = useState<ScannerCandidate[]>(readRecentScans)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { entries: liveCards, retry } = useLiveCards(cards)
  const githubSync = useGitHubCollectionSync(portfolio, setPortfolio)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('pv-theme', theme)
  }, [theme])
  useEffect(() => localStorage.setItem('pv-portfolio-v1', JSON.stringify(portfolio)), [portfolio])
  useEffect(() => localStorage.setItem(SCANNED_CARDS_STORAGE_KEY, JSON.stringify(recentScans)), [recentScans])

  const filtered = useMemo(() => cards.filter(card => {
    const matchesText = `${card.name} ${card.pokemon} ${card.set} ${card.number}`.toLowerCase().includes(query.toLowerCase())
    const matchesSet = setFilter === 'Toutes' || card.set === setFilter
    const matchesRarity = rarityFilter === 'Toutes' || card.rarity === rarityFilter
    const matchesValue = card.rawMax >= minValue
    return matchesText && matchesSet && matchesRarity && matchesValue
  }), [query, setFilter, rarityFilter, minValue])
  const editorialFavorite=(card:Card):FavoriteInput=>({source:'editorial',cardId:card.id,setId:card.tcgdexId?.slice(0,card.tcgdexId.lastIndexOf('-')),language:card.language.toLowerCase(),name:card.name,setName:card.set,localId:card.number,image:liveCards[card.id]?.data?.image})

  const rememberScannedCard = (candidate: ScannerCandidate) => {
    setRecentScans((current) => [candidate, ...current.filter((card) => card.id !== candidate.id)].slice(0, 50))
  }

  const isScannedCardCollected = (tcgdexId: string) => portfolio.entries.some(e => e.cardId === tcgdexId && e.quantity > 0)

  const togglePortfolioCard = (card: Card) => {
    const cardId = card.tcgdexId ?? card.id
    const existing = portfolio.entries.find(entry => entry.cardId === cardId && entry.variant === 'normal' && entry.language === card.language.toLowerCase() && entry.quantity > 0)
    setPortfolio(upsertEntry(portfolio, {
      source: 'tcgdex', setId: setIdFromCardId(cardId), cardId, language: card.language.toLowerCase(), variant: 'normal',
      name: card.name, setName: card.set, number: card.number, rarity: card.rarity,
      quantity: existing ? 0 : 1, condition: 'near-mint', notes: '',
    }))
  }

  const toggleScannedCollection = (candidate: ScannerCandidate) => {
    rememberScannedCard(candidate)
    const existing = portfolio.entries.find(entry => entry.cardId === candidate.id && entry.language === candidate.language && entry.quantity > 0)
    setPortfolio(upsertEntry(portfolio, {
      source: 'tcgdex', setId: setIdFromCardId(candidate.id), cardId: candidate.id, language: candidate.language, variant: 'normal',
      name: candidate.name, setName: candidate.setName ?? 'Série inconnue', number: candidate.localId,
      image: candidate.image, rarity: candidate.rarity, quantity: existing ? 0 : 1, condition: 'near-mint', notes: '',
    }))
  }

  const navigate=useCallback((next:View)=>{if(next===viewRef.current)return;if(next!=='featured')setQuery('');scrollByView.current[viewRef.current]=window.scrollY;viewRef.current=next;setView(next);requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo(0,scrollByView.current[next]??0)))},[])

  const nav = [
    {id:'collection', label:'Collection', icon:Library,group:'Collection'},
    {id:'favorites', label:'Favoris', icon:Heart,group:'Collection'},
    {id:'grading', label:'Gradation', icon:ShieldCheck,group:'Collection'},
    {id:'featured', label:'Cartes à surveiller', icon:TrendingUp,group:'Découvrir'},
    {id:'history', label:'Suivi des prix', icon:History,group:'Découvrir'},
    {id:'scanner', label:'Identifier une carte', icon:ScanLine,group:'Découvrir'},
    {id:'estimator', label:'Estimer un lot', icon:Calculator},
    {id:'guide', label:'Guide achat', icon:BookOpen},
    {id:'sync', label:'Sauvegarde', icon:Cloud},
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
            const navGroups:Record<View,string>={collection:'Collection',favorites:'Collection',grading:'Collection',featured:'Découvrir',history:'Découvrir',scanner:'Découvrir',estimator:'Outils',guide:'Outils',sync:'Données'},group=navGroups[item.id],previous=index?navGroups[nav[index-1].id]:''
            return <div className="nav-item" key={item.id}>{group!==previous&&<span className="nav-label">{group}</span>}<button className={view===item.id?'active':''} onClick={()=>navigate(item.id)}>
              <Icon size={19}/><span>{item.label}</span>
              {item.id==='favorites' && favorites.length>0 && <b>{favorites.length}</b>}
              {item.id==='collection' && portfolio.entries.some(e=>e.quantity>0) && <b>{portfolio.entries.filter(e=>e.quantity>0).length}</b>}
            </button></div>
          })}
        </nav>
        <div className="side-card">
          <Sparkles size={20}/>
          <strong>Mode chineur</strong>
          <p>Repère plus vite les cartes intéressantes dans les lots.</p>
          <button onClick={()=>navigate('guide')}>Voir la méthode <ChevronRight size={15}/></button>
        </div>
        <p className="disclaimer">Prix Cardmarket via TCGdex lorsqu’ils sont disponibles. Toujours vérifier les ventes récentes avant achat.</p>
      </aside>

      <main>
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark">PV</div><strong>PokéValue</strong></div>
          {view==='featured'&&<div className="global-search"><Search size={18}/><input aria-label="Rechercher parmi les cartes à surveiller" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher parmi les cartes à surveiller…"/></div>}
          <button className="icon-btn" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<Sun/>:<Moon/>}</button>
        </header>

        <div className="content">
          {view==='collection'&&<Portfolio document={portfolio} onChange={setPortfolio} isFavorite={isFavorite} onFavorite={toggleFavorite}/>}
          {view==='featured' && <>
            <section className="hero">
              <div>
                <span className="eyebrow"><TrendingUp size={15}/> Guide de valeur 2026</span>
                <h1>Les cartes Pokémon à surveiller</h1>
                <p>Recherche, compare et organise rapidement les cartes qui ont le plus d’intérêt sur le marché.</p>
              </div>
              <div className="hero-stat">
                <span>Valeur brute max du catalogue</span>
                <strong>{money(Math.max(...cards.map(c=>c.rawMax)))}</strong>
                <small>sur une carte non gradée</small>
              </div>
            </section>

            <section className="stats-grid">
              <Stat icon={<Star/>} label="Cartes référencées" value={cards.length.toString()} />
              <Stat icon={<TrendingUp/>} label="Tendance positive" value={cards.filter(c=>c.trend==='up').length.toString()} />
              <Stat icon={<ShieldCheck/>} label="Raretés couvertes" value={new Set(cards.map(c=>c.rarity)).size.toString()} />
              <Stat icon={<Heart/>} label="Favoris enregistrés" value={favorites.length.toString()} />
            </section>

            <section className="filters">
              <div className="filter-title"><SlidersHorizontal size={17}/> Filtres</div>
              <select value={setFilter} onChange={e=>setSetFilter(e.target.value)}><option>Toutes</option>{sets.map(s=><option key={s}>{s}</option>)}</select>
              <select value={rarityFilter} onChange={e=>setRarityFilter(e.target.value)}><option>Toutes</option>{rarities.map(r=><option key={r}>{r}</option>)}</select>
              <select value={minValue} onChange={e=>setMinValue(Number(e.target.value))}>
                <option value="0">Toute valeur</option><option value="50">50 € et +</option><option value="100">100 € et +</option><option value="250">250 € et +</option><option value="500">500 € et +</option>
              </select>
              {(setFilter!=='Toutes'||rarityFilter!=='Toutes'||minValue>0||query) && <button className="reset" onClick={()=>{setSetFilter('Toutes');setRarityFilter('Toutes');setMinValue(0);setQuery('')}}><X size={15}/> Réinitialiser</button>}
            </section>

            <div className="result-head"><strong>{filtered.length} carte{filtered.length!==1?'s':''}</strong><span>Triées par score d’intérêt</span></div>
            <section className="card-grid">
              {[...filtered].sort((a,b)=>b.score-a.score).map(card =>
                <CardTile key={card.id} card={card} liveEntry={liveCards[card.id]} favorite={isFavorite(editorialFavorite(card))} collected={portfolio.entries.some(e=>e.cardId===(card.tcgdexId??card.id)&&e.quantity>0)}
                  onShowcase={()=>{setShowcase(card);setShowcaseFavorite(editorialFavorite(card))}} onOpen={()=>setSelected(card)} onRetry={()=>retry(card.id)}
                  onFavorite={()=>toggleFavorite(editorialFavorite(card))}
                  onCollect={()=>togglePortfolioCard(card)}
                />
              )}
            </section>
            {filtered.length===0 && <div className="empty"><Search size={34}/><h3>Aucune carte trouvée</h3><p>Modifie les filtres ou la recherche.</p></div>}
          </>}

          {view==='favorites'&&<FavoritesPage favorites={favorites} editorialCards={cards} onShowcase={favorite=>{const editorial=cards.find(card=>card.id===favorite.cardId);setShowcaseFavorite(favorite);setShowcase(editorial??{id:favorite.cardId,name:favorite.name,pokemon:favorite.name,set:favorite.setName,year:0,number:favorite.localId??'',rarity:'',language:(favorite.language==='ja'?'JP':favorite.language==='en'?'EN':'FR'),rawMin:0,rawMax:0,graded10:0,trend:'stable',score:0,color:'#17233b',accent:'#6384bb',note:'',tcgdexId:favorite.source==='tcgdex'?favorite.cardId:undefined})}} onToggle={toggleFavorite}/>}
          {view==='history'&&<PriceHistoryPage cards={cards} entries={portfolio.entries} favorites={favorites}/>}
          {view==='grading'&&<GradingPage entries={portfolio.entries} onPriceHistory={()=>navigate('history')}/> }


          {view==='scanner' && <CardIdentifier document={portfolio} onChange={setPortfolio} isFavorite={isFavorite} onFavorite={toggleFavorite}/>}
          {view==='estimator' && <Estimator />}
          {view==='guide' && <Guide />}
          {view==='sync' && <CollectionSyncSettings sync={githubSync} document={portfolio} onChange={setPortfolio}/>}
        </div>
      </main>

      <nav className="bottom-nav">
        {(['collection','favorites','featured','history'] as View[]).map(id=>{const item=nav.find(entry=>entry.id===id)!;const Icon=item.icon;return <button key={item.id} className={view===item.id?'active':''} onClick={()=>navigate(item.id)}><Icon size={20}/><span>{item.id==='history'?'Prix':item.id==='featured'?'Cartes':item.label.split(' ')[0]}</span></button>})}
        <button className={['sync','estimator','guide','scanner'].includes(view)?'active':''} onClick={()=>setMobileMenuOpen(true)}><Menu size={20}/><span>Plus</span></button>
      </nav>

      {mobileMenuOpen&&<div className="mobile-menu-backdrop" onMouseDown={()=>setMobileMenuOpen(false)}><div className="mobile-menu" onMouseDown={event=>event.stopPropagation()}><div><strong>Plus de services</strong><button aria-label="Fermer le menu" onClick={()=>setMobileMenuOpen(false)}><X/></button></div>{nav.filter(item=>['sync','estimator','guide','scanner','grading'].includes(item.id)).map(item=>{const Icon=item.icon;return <button key={item.id} className={view===item.id?'active':''} onClick={()=>{navigate(item.id);setMobileMenuOpen(false)}}><Icon size={20}/>{item.label}</button>})}</div></div>}

      <ScrollToTop hidden={Boolean(selected)||Boolean(showcase)||mobileMenuOpen}/>

      {showcase&&<CardShowcase card={{id:showcase.tcgdexId??showcase.id,name:showcase.name,localId:showcase.number,image:showcaseFavorite?.image??liveCards[showcase.id]?.data?.image}} setName={showcase.set} owned={portfolio.entries.some(e=>e.cardId===(showcase.tcgdexId??showcase.id)&&e.quantity>0)} quantity={portfolio.entries.find(e=>e.cardId===(showcase.tcgdexId??showcase.id)&&e.quantity>0)?.quantity} onToggle={()=>togglePortfolioCard(showcase)} onIncrement={()=>{const id=showcase.tcgdexId??showcase.id,entry=portfolio.entries.find(e=>e.cardId===id&&e.quantity>0);setPortfolio(upsertEntry(portfolio,{source:'tcgdex',setId:setIdFromCardId(id),cardId:id,language:showcase.language.toLowerCase(),variant:'normal',name:showcase.name,setName:showcase.set,number:showcase.number,rarity:showcase.rarity,quantity:(entry?.quantity??0)+1,condition:entry?.condition??'near-mint',notes:entry?.notes??''}))}} favorite={isFavorite(showcaseFavorite??editorialFavorite(showcase))} onFavorite={()=>toggleFavorite(showcaseFavorite??editorialFavorite(showcase))} onDetails={()=>{setShowcase(null);setSelected(showcase)}} onClose={()=>setShowcase(null)}/>}

      {selected && (()=>{const cardId=selected.tcgdexId??selected.id,live=liveCards[selected.id]?.data,entry=portfolio.entries.find(e=>e.cardId===cardId&&e.language===selected.language.toLowerCase()&&e.quantity>0),stats=getPriceStats(live?.pricing),market=selectCardmarketPrice(live?.pricing),favorite=editorialFavorite(selected);const change=(quantity:number)=>setPortfolio(upsertEntry(portfolio,{source:'tcgdex',setId:setIdFromCardId(cardId),cardId,language:selected.language.toLowerCase(),variant:'normal',name:selected.name,setName:selected.set,number:selected.number,rarity:selected.rarity,quantity,condition:entry?.condition??'near-mint',notes:entry?.notes??'',manualPrice:entry?.manualPrice}));return <CardDetailsModal card={{id:cardId,name:selected.name,localId:selected.number,image:live?.image,rarity:selected.rarity}} setName={selected.set} language={selected.language.toLowerCase()} entry={entry} price={{status:liveCards[selected.id]?.status==='error'?'error':'success',language:selected.language.toLowerCase(),price:market,...stats}} favorite={isFavorite(favorite)} onFavorite={()=>toggleFavorite(favorite)} onQuantity={change} onEdit={()=>{}} onShowcase={()=>{setSelected(null);setShowcase(selected);setShowcaseFavorite(favorite)}} onClose={()=>setSelected(null)}/>})()}
    </div>
  )
}

function Stat({icon,label,value}:{icon:React.ReactNode,label:string,value:string}) {
  return <div className="stat-card"><div>{icon}</div><span>{label}</span><strong>{value}</strong></div>
}

function CardTile({card,liveEntry,favorite,collected,onShowcase,onOpen,onRetry,onFavorite,onCollect}:{card:Card,liveEntry?:{status:'idle'|'loading'|'success'|'error';data?:import('./domain/cards').ExternalCard;error?:string},favorite:boolean,collected:boolean,onShowcase:()=>void,onOpen:()=>void,onRetry:()=>void,onFavorite:()=>void,onCollect:()=>void}) {
  const livePrice = selectCardmarketPrice(liveEntry?.data?.pricing)
  const hasLive = liveEntry?.status === 'success' && !!livePrice
  return <article className="poke-card">
    <div className={`card-visual ${card.tcgdexId ? 'with-real-image' : ''}`} onClick={onShowcase} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onShowcase()}}} role="button" tabIndex={0} aria-label={`Voir ${card.name} en 3D`} style={{background:`radial-gradient(circle at 70% 20%, ${card.accent}55, transparent 35%), linear-gradient(135deg, ${card.color}, #111827)`}}>
      <div className="card-number">{liveEntry?.data?.localId ?? card.number}</div>
      {card.tcgdexId && liveEntry?.status === 'loading' ? <div className="image-skeleton"/> : card.tcgdexId ? <CardImage image={liveEntry?.data?.image} fallbackImage={liveEntry?.data?.fallbackImage} name={liveEntry?.data?.name ?? card.name} quality="low" className="real-card-image"/> : <><div className="fake-orb"></div><div className="pokemon-name">{card.pokemon}</div></>}
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

function FavoritesPage({favorites,editorialCards,onShowcase,onToggle}:{favorites:FavoriteCard[];editorialCards:Card[];onShowcase:(favorite:FavoriteCard)=>void;onToggle:(favorite:FavoriteInput)=>void}){
  const [sort,setSort]=useState('recent'),[language,setLanguage]=useState('all'),[search,setSearch]=useState('')
  const needle=search.trim().toLocaleLowerCase('fr'),shown=[...favorites].filter(card=>(language==='all'||card.language===language)&&(!needle||`${card.name} ${card.setName} ${card.localId??''}`.toLocaleLowerCase('fr').includes(needle))).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='set'?a.setName.localeCompare(b.setName):sort==='price-asc'||sort==='price-desc'?0:b.addedAt.localeCompare(a.addedAt))
  return <section className="favorites-page"><div className="page-heading"><span className="eyebrow"><Heart size={15}/> Collection personnelle</span><h1>Mes favoris</h1><p>Retrouve rapidement les cartes que tu souhaites suivre.</p><strong>{favorites.length} favori{favorites.length===1?'':'s'}</strong></div>{favorites.length===0?<div className="empty favorites-empty"><Heart size={42}/><h2>Aucun favori pour le moment</h2><p>Utilise le cœur sur une carte pour la retrouver ici.</p></div>:<><div className="favorites-controls"><label>Trier<select value={sort} onChange={event=>setSort(event.target.value)}><option value="recent">Ajout récent</option><option value="price-asc">Prix croissant</option><option value="price-desc">Prix décroissant</option><option value="name">Nom</option><option value="set">Extension</option></select></label><label>Langue<select value={language} onChange={event=>setLanguage(event.target.value)}><option value="all">Toutes</option><option value="fr">FR</option><option value="en">EN</option><option value="ja">JP</option><option value="zh-tw">ZH</option></select></label><label className="favorites-search"><Search size={16}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Rechercher un favori" aria-label="Rechercher parmi mes favoris"/></label></div><p className="favorites-result-count">{shown.length} résultat{shown.length===1?'':'s'}</p>{shown.length===0?<div className="empty favorites-empty"><Search size={35}/><h2>Aucun favori trouvé</h2><p>Modifie ta recherche ou le filtre de langue.</p></div>:<div className="favorites-grid">{shown.map(card=>{const editorial=editorialCards.find(item=>item.id===card.cardId),imageCardId=card.source==='editorial'?(editorial?.tcgdexId??card.cardId):card.cardId;return <article key={card.key}><button className="favorite-preview" onClick={()=>onShowcase(card)} aria-label={`Voir ${card.name} en 3D`}>{editorial?.tcgdexId||card.source==='tcgdex'?<CatalogueImage card={{id:imageCardId,name:card.name,localId:card.localId??''}} requestedLanguage={card.language} quality="low"/>:<CardImage image={card.image} name={card.name} quality="low"/>}</button><div><strong>{card.name}</strong><span>{card.localId&&`Nº ${card.localId} · `}{card.setName}</span><small>{card.language.toUpperCase()}</small></div><FavoriteButton favorite onToggle={()=>onToggle(card)}/></article>})}</div></>}</section>
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
