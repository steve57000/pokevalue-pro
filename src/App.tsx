import { useEffect, useMemo, useState } from 'react'
import {
  Search, Heart, Moon, Sun, Sparkles, TrendingUp, ShieldCheck,
  SlidersHorizontal, X, ChevronRight, Calculator, BookOpen,
  Library, Star, ArrowUpRight, AlertTriangle, CheckCircle2, ScanLine, Cloud, Menu
} from 'lucide-react'
import { buildPokemonTcgImageFallback } from './api/tcgdex'
import { cards, rarities, sets } from './data'
import { CardImage } from './components/CardImage'
import { CardScanner } from './components/CardScanner'
import { Portfolio } from './components/Portfolio'
import { CollectionSyncSettings } from './components/CollectionSyncSettings'
import { ScrollToTop } from './components/ScrollToTop'
import { LivePrice } from './components/LivePrice'
import { selectCardmarketPrice } from './domain/pricing'
import type { ScannerCandidate } from './domain/scanner'
import { useLiveCards } from './hooks/useLiveCards'
import { money } from './utils/money'
import { readStoredJson, readStoredStringArray } from './utils/storage'
import type { Card } from './types'
import { emptyCollection, parseCollection, setIdFromCardId, upsertEntry, type CollectionDocument } from './domain/collection'
import { useGitHubCollectionSync } from './hooks/useGitHubCollectionSync'

type View = 'collection' | 'featured' | 'scanner' | 'favorites' | 'estimator' | 'guide' | 'sync'

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
  const [query, setQuery] = useState('')
  const [setFilter, setSetFilter] = useState('Toutes')
  const [rarityFilter, setRarityFilter] = useState('Toutes')
  const [minValue, setMinValue] = useState(0)
  const [selected, setSelected] = useState<Card|null>(null)
  const [favorites, setFavorites] = useState<string[]>(() => readStoredStringArray('pv-favorites'))
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
  useEffect(() => localStorage.setItem('pv-favorites', JSON.stringify(favorites)), [favorites])
  useEffect(() => localStorage.setItem('pv-portfolio-v1', JSON.stringify(portfolio)), [portfolio])
  useEffect(() => localStorage.setItem(SCANNED_CARDS_STORAGE_KEY, JSON.stringify(recentScans)), [recentScans])

  const filtered = useMemo(() => cards.filter(card => {
    const matchesText = `${card.name} ${card.pokemon} ${card.set} ${card.number}`.toLowerCase().includes(query.toLowerCase())
    const matchesSet = setFilter === 'Toutes' || card.set === setFilter
    const matchesRarity = rarityFilter === 'Toutes' || card.rarity === rarityFilter
    const matchesValue = card.rawMax >= minValue
    const matchesView = view === 'favorites' ? favorites.includes(card.id) : true
    return matchesText && matchesSet && matchesRarity && matchesValue && matchesView
  }), [query, setFilter, rarityFilter, minValue, view, favorites])

  const toggle = (id:string, list:string[], setter:(v:string[])=>void) =>
    setter(list.includes(id) ? list.filter(x=>x!==id) : [...list,id])

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

  const nav = [
    {id:'collection', label:'Collection', icon:Library},
    {id:'featured', label:'Cartes à surveiller', icon:TrendingUp},
    {id:'scanner', label:'Identifier une carte', icon:ScanLine},
    {id:'favorites', label:'Favoris', icon:Heart},
    {id:'sync', label:'Sauvegarde', icon:Cloud},
    {id:'estimator', label:'Estimer un lot', icon:Calculator},
    {id:'guide', label:'Guide achat', icon:BookOpen},
  ] as const

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">PV</div>
          <div><strong>PokéValue</strong><span>PRO</span></div>
        </div>
        <nav>
          {nav.map(item => {
            const Icon = item.icon
            return <button key={item.id} className={view===item.id?'active':''} onClick={()=>setView(item.id)}>
              <Icon size={19}/><span>{item.label}</span>
              {item.id==='favorites' && favorites.length>0 && <b>{favorites.length}</b>}
              {item.id==='collection' && portfolio.entries.some(e=>e.quantity>0) && <b>{portfolio.entries.filter(e=>e.quantity>0).length}</b>}
            </button>
          })}
        </nav>
        <div className="side-card">
          <Sparkles size={20}/>
          <strong>Mode chineur</strong>
          <p>Repère plus vite les cartes intéressantes dans les lots.</p>
          <button onClick={()=>setView('guide')}>Voir la méthode <ChevronRight size={15}/></button>
        </div>
        <p className="disclaimer">Prix Cardmarket via TCGdex lorsqu’ils sont disponibles. Toujours vérifier les ventes récentes avant achat.</p>
      </aside>

      <main>
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark">PV</div><strong>PokéValue</strong></div>
          <div className="global-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un Pokémon, une extension, un numéro…"/></div>
          <button className="icon-btn" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<Sun/>:<Moon/>}</button>
        </header>

        <div className="content">
          <div style={{display:view==='collection'?'block':'none'}}><Portfolio document={portfolio} onChange={setPortfolio}/></div>
          {(view==='featured' || view==='favorites') && <>
            <section className="hero">
              <div>
                <span className="eyebrow"><TrendingUp size={15}/> Guide de valeur 2026</span>
                <h1>{view==='featured'?'Les cartes Pokémon à surveiller':'Tes cartes favorites'}</h1>
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
                <CardTile key={card.id} card={card} liveEntry={liveCards[card.id]} favorite={favorites.includes(card.id)} collected={portfolio.entries.some(e=>e.cardId===(card.tcgdexId??card.id)&&e.quantity>0)}
                  onOpen={()=>setSelected(card)} onRetry={()=>retry(card.id)}
                  onFavorite={()=>toggle(card.id,favorites,setFavorites)}
                  onCollect={()=>togglePortfolioCard(card)}
                />
              )}
            </section>
            {filtered.length===0 && <div className="empty"><Search size={34}/><h3>Aucune carte trouvée</h3><p>Modifie les filtres ou la recherche.</p></div>}
          </>}

          {view==='scanner' && <CardScanner
            recentCards={recentScans}
            isCollected={isScannedCardCollected}
            onRemember={rememberScannedCard}
            onToggleCollection={toggleScannedCollection}
          />}
          {view==='estimator' && <Estimator />}
          {view==='guide' && <Guide />}
          {view==='sync' && <CollectionSyncSettings sync={githubSync} document={portfolio} onChange={setPortfolio}/>}
        </div>
      </main>

      <nav className="bottom-nav">
        {nav.filter(item=>['collection','featured','scanner','favorites'].includes(item.id)).map(item=>{const Icon=item.icon;return <button key={item.id} className={view===item.id?'active':''} onClick={()=>setView(item.id)}><Icon size={20}/><span>{item.label.split(' ')[0]}</span></button>})}
        <button className={['sync','estimator','guide'].includes(view)?'active':''} onClick={()=>setMobileMenuOpen(true)}><Menu size={20}/><span>Plus</span></button>
      </nav>

      {mobileMenuOpen&&<div className="mobile-menu-backdrop" onMouseDown={()=>setMobileMenuOpen(false)}><div className="mobile-menu" onMouseDown={event=>event.stopPropagation()}><div><strong>Plus de services</strong><button aria-label="Fermer le menu" onClick={()=>setMobileMenuOpen(false)}><X/></button></div>{nav.filter(item=>['sync','estimator','guide'].includes(item.id)).map(item=>{const Icon=item.icon;return <button key={item.id} className={view===item.id?'active':''} onClick={()=>{setView(item.id);setMobileMenuOpen(false)}}><Icon size={20}/>{item.label}</button>})}</div></div>}

      <ScrollToTop hidden={Boolean(selected)||mobileMenuOpen}/>

      {selected && <Detail card={selected} liveEntry={liveCards[selected.id]} onClose={()=>setSelected(null)}
        favorite={favorites.includes(selected.id)}
        collected={portfolio.entries.some(e=>e.cardId===(selected.tcgdexId??selected.id)&&e.quantity>0)}
        onFavorite={()=>toggle(selected.id,favorites,setFavorites)}
        onCollect={()=>togglePortfolioCard(selected)}
      />}
    </div>
  )
}

function Stat({icon,label,value}:{icon:React.ReactNode,label:string,value:string}) {
  return <div className="stat-card"><div>{icon}</div><span>{label}</span><strong>{value}</strong></div>
}

function CardTile({card,liveEntry,favorite,collected,onOpen,onRetry,onFavorite,onCollect}:{card:Card,liveEntry?:{status:'idle'|'loading'|'success'|'error';data?:import('./domain/cards').ExternalCard;error?:string},favorite:boolean,collected:boolean,onOpen:()=>void,onRetry:()=>void,onFavorite:()=>void,onCollect:()=>void}) {
  const livePrice = selectCardmarketPrice(liveEntry?.data?.pricing)
  const hasLive = liveEntry?.status === 'success' && !!livePrice
  return <article className="poke-card">
    <div className={`card-visual ${card.tcgdexId ? 'with-real-image' : ''}`} style={{background:`radial-gradient(circle at 70% 20%, ${card.accent}55, transparent 35%), linear-gradient(135deg, ${card.color}, #111827)`}}>
      <div className="card-number">{liveEntry?.data?.localId ?? card.number}</div>
      {card.tcgdexId && liveEntry?.status === 'loading' ? <div className="image-skeleton"/> : card.tcgdexId ? <CardImage image={liveEntry?.data?.image} fallbackImage={liveEntry?.data?.fallbackImage} name={liveEntry?.data?.name ?? card.name} quality="low" className="real-card-image"/> : <><div className="fake-orb"></div><div className="pokemon-name">{card.pokemon}</div></>}
      <div className="rarity-pill">{liveEntry?.data?.rarity ?? card.rarity}</div>
      <button className={`heart ${favorite?'filled':''}`} onClick={(e)=>{e.stopPropagation();onFavorite()}}><Heart size={18} fill={favorite?'currentColor':'none'}/></button>
    </div>
    <div className="card-body">
      <div className="card-meta"><span>{card.year}</span><span>{card.language}</span><span className={`trend ${card.trend}`}>{card.trend==='up'?'↗':card.trend==='down'?'↘':'→'}</span></div>
      <h3>{card.name}</h3>
      <p>{card.set}</p>
      <div className="source-badge">{hasLive ? 'Prix marché actualisé' : 'Estimation indicative'}</div>
      {liveEntry?.status === 'loading' && <div className="price-skeleton"/>}
      {liveEntry?.status === 'error' && <div className="api-error"><span>Donnée API indisponible</span><button onClick={(e)=>{e.stopPropagation();onRetry()}}>Réessayer</button></div>}
      {hasLive ? <LivePrice live={liveEntry?.data} compact /> : <div className="price-row"><div><small>Brute estimée</small><strong>{money(card.rawMin)} – {money(card.rawMax)}</strong></div><div className="score">{card.score.toFixed(1)}</div></div>}
      <div className="card-actions"><button onClick={onOpen}>Voir la fiche <ArrowUpRight size={15}/></button><button className={collected?'collected':''} onClick={onCollect}>{collected?<CheckCircle2 size={16}/>:<Library size={16}/>}</button></div>
    </div>
  </article>
}

function Detail({card,liveEntry,onClose,favorite,collected,onFavorite,onCollect}:{card:Card,liveEntry?:{status:'idle'|'loading'|'success'|'error';data?:import('./domain/cards').ExternalCard;error?:string},onClose:()=>void,favorite:boolean,collected:boolean,onFavorite:()=>void,onCollect:()=>void}) {
  const livePrice = selectCardmarketPrice(liveEntry?.data?.pricing)
  const hasLive = liveEntry?.status === 'success' && !!livePrice
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal" onMouseDown={e=>e.stopPropagation()}>
      <button className="modal-close" onClick={onClose}><X/></button>
      <div className={`detail-visual ${card.tcgdexId ? 'with-real-image' : ''}`} style={{background:`radial-gradient(circle at 70% 20%, ${card.accent}66, transparent 35%), linear-gradient(145deg, ${card.color}, #111827)`}}>
        {card.tcgdexId && liveEntry?.status === 'success' ? <CardImage image={liveEntry.data?.image} fallbackImage={liveEntry.data?.fallbackImage} name={liveEntry.data?.name ?? card.name} quality="high" className="real-card-image detail-image"/> : <><div className="fake-orb big"></div><div className="pokemon-name big-name">{card.pokemon}</div></>}<span>{liveEntry?.data?.localId ?? card.number}</span>
      </div>
      <div className="detail-content">
        <span className="eyebrow">{card.rarity}</span>
        <h2>{card.name}</h2>
        <p className="set-line">{card.set} · {card.year} · {card.language}</p>
        <p>{card.note}</p>
        <div className="source-badge detail-badge">{hasLive ? 'Prix marché actualisé' : 'Estimation indicative'}</div>
        {hasLive ? <LivePrice live={liveEntry?.data} /> : <div className="detail-prices">
          <div><small>Brute min. indicative</small><strong>{money(card.rawMin)}</strong></div>
          <div><small>Brute max. indicative</small><strong>{money(card.rawMax)}</strong></div>
          <div><small>Grade 10 indicatif</small><strong>{money(card.graded10)}</strong></div>
        </div>}
        {hasLive && <p className="graded-unavailable">Prix gradé non disponible via TCGdex.</p>}
        <div className="watch-box"><AlertTriangle size={20}/><p><strong>Avant achat :</strong> contrôle le dos, les coins, les rayures, le centrage, la texture et compare plusieurs ventes réellement terminées.</p></div>
        <div className="detail-buttons"><button onClick={onFavorite}><Heart size={18} fill={favorite?'currentColor':'none'}/>{favorite?'Retirer des favoris':'Ajouter aux favoris'}</button><button className="primary" onClick={onCollect}><Library size={18}/>{collected?'Retirer de ma collection':'Ajouter à ma collection'}</button></div>
      </div>
    </div>
  </div>
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
