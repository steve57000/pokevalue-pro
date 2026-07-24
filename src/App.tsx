import { useEffect, useMemo, useState } from 'react'
import {
  Search, Heart, Moon, Sun, Sparkles, TrendingUp, ShieldCheck,
  SlidersHorizontal, X, ChevronRight, Calculator, BookOpen,
  Library, Star, ArrowUpRight, AlertTriangle, CheckCircle2
} from 'lucide-react'
import { cards, rarities, sets } from './data'
import type { Card } from './types'

type View = 'catalogue' | 'favorites' | 'collection' | 'estimator' | 'guide'

const money = (value:number) => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(value)

function App() {
  const [theme, setTheme] = useState<'dark'|'light'>(() => (localStorage.getItem('pv-theme') as 'dark'|'light') || 'dark')
  const [view, setView] = useState<View>('catalogue')
  const [query, setQuery] = useState('')
  const [setFilter, setSetFilter] = useState('Toutes')
  const [rarityFilter, setRarityFilter] = useState('Toutes')
  const [minValue, setMinValue] = useState(0)
  const [selected, setSelected] = useState<Card|null>(null)
  const [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem('pv-favorites') || '[]'))
  const [collection, setCollection] = useState<string[]>(() => JSON.parse(localStorage.getItem('pv-collection') || '[]'))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('pv-theme', theme)
  }, [theme])
  useEffect(() => localStorage.setItem('pv-favorites', JSON.stringify(favorites)), [favorites])
  useEffect(() => localStorage.setItem('pv-collection', JSON.stringify(collection)), [collection])

  const filtered = useMemo(() => cards.filter(card => {
    const matchesText = `${card.name} ${card.pokemon} ${card.set} ${card.number}`.toLowerCase().includes(query.toLowerCase())
    const matchesSet = setFilter === 'Toutes' || card.set === setFilter
    const matchesRarity = rarityFilter === 'Toutes' || card.rarity === rarityFilter
    const matchesValue = card.rawMax >= minValue
    const matchesView = view === 'favorites' ? favorites.includes(card.id) : view === 'collection' ? collection.includes(card.id) : true
    return matchesText && matchesSet && matchesRarity && matchesValue && matchesView
  }), [query, setFilter, rarityFilter, minValue, view, favorites, collection])

  const toggle = (id:string, list:string[], setter:(v:string[])=>void) =>
    setter(list.includes(id) ? list.filter(x=>x!==id) : [...list,id])

  const nav = [
    {id:'catalogue', label:'Catalogue', icon:Search},
    {id:'favorites', label:'Favoris', icon:Heart},
    {id:'collection', label:'Ma collection', icon:Library},
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
              {item.id==='collection' && collection.length>0 && <b>{collection.length}</b>}
            </button>
          })}
        </nav>
        <div className="side-card">
          <Sparkles size={20}/>
          <strong>Mode chineur</strong>
          <p>Repère plus vite les cartes intéressantes dans les lots.</p>
          <button onClick={()=>setView('guide')}>Voir la méthode <ChevronRight size={15}/></button>
        </div>
        <p className="disclaimer">Prix indicatifs de démonstration. Toujours vérifier les ventes récentes avant achat.</p>
      </aside>

      <main>
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark">PV</div><strong>PokéValue</strong></div>
          <div className="global-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un Pokémon, une extension, un numéro…"/></div>
          <button className="icon-btn" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<Sun/>:<Moon/>}</button>
        </header>

        <div className="content">
          {(view==='catalogue' || view==='favorites' || view==='collection') && <>
            <section className="hero">
              <div>
                <span className="eyebrow"><TrendingUp size={15}/> Guide de valeur 2026</span>
                <h1>{view==='catalogue'?'Les cartes Pokémon à surveiller':view==='favorites'?'Tes cartes favorites':'Ta collection'}</h1>
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
                <CardTile key={card.id} card={card} favorite={favorites.includes(card.id)} collected={collection.includes(card.id)}
                  onOpen={()=>setSelected(card)}
                  onFavorite={()=>toggle(card.id,favorites,setFavorites)}
                  onCollect={()=>toggle(card.id,collection,setCollection)}
                />
              )}
            </section>
            {filtered.length===0 && <div className="empty"><Search size={34}/><h3>Aucune carte trouvée</h3><p>Modifie les filtres ou la recherche.</p></div>}
          </>}

          {view==='estimator' && <Estimator />}
          {view==='guide' && <Guide />}
        </div>
      </main>

      <nav className="bottom-nav">
        {nav.map(item=>{const Icon=item.icon;return <button key={item.id} className={view===item.id?'active':''} onClick={()=>setView(item.id)}><Icon size={20}/><span>{item.label.split(' ')[0]}</span></button>})}
      </nav>

      {selected && <Detail card={selected} onClose={()=>setSelected(null)}
        favorite={favorites.includes(selected.id)}
        collected={collection.includes(selected.id)}
        onFavorite={()=>toggle(selected.id,favorites,setFavorites)}
        onCollect={()=>toggle(selected.id,collection,setCollection)}
      />}
    </div>
  )
}

function Stat({icon,label,value}:{icon:React.ReactNode,label:string,value:string}) {
  return <div className="stat-card"><div>{icon}</div><span>{label}</span><strong>{value}</strong></div>
}

function CardTile({card,favorite,collected,onOpen,onFavorite,onCollect}:{card:Card,favorite:boolean,collected:boolean,onOpen:()=>void,onFavorite:()=>void,onCollect:()=>void}) {
  return <article className="poke-card">
    <div className="card-visual" style={{background:`radial-gradient(circle at 70% 20%, ${card.accent}55, transparent 35%), linear-gradient(135deg, ${card.color}, #111827)`}}>
      <div className="card-number">{card.number}</div>
      <div className="fake-orb"></div>
      <div className="pokemon-name">{card.pokemon}</div>
      <div className="rarity-pill">{card.rarity}</div>
      <button className={`heart ${favorite?'filled':''}`} onClick={(e)=>{e.stopPropagation();onFavorite()}}><Heart size={18} fill={favorite?'currentColor':'none'}/></button>
    </div>
    <div className="card-body">
      <div className="card-meta"><span>{card.year}</span><span>{card.language}</span><span className={`trend ${card.trend}`}>{card.trend==='up'?'↗':card.trend==='down'?'↘':'→'}</span></div>
      <h3>{card.name}</h3>
      <p>{card.set}</p>
      <div className="price-row"><div><small>Brute estimée</small><strong>{money(card.rawMin)} – {money(card.rawMax)}</strong></div><div className="score">{card.score.toFixed(1)}</div></div>
      <div className="card-actions"><button onClick={onOpen}>Voir la fiche <ArrowUpRight size={15}/></button><button className={collected?'collected':''} onClick={onCollect}>{collected?<CheckCircle2 size={16}/>:<Library size={16}/>}</button></div>
    </div>
  </article>
}

function Detail({card,onClose,favorite,collected,onFavorite,onCollect}:{card:Card,onClose:()=>void,favorite:boolean,collected:boolean,onFavorite:()=>void,onCollect:()=>void}) {
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal" onMouseDown={e=>e.stopPropagation()}>
      <button className="modal-close" onClick={onClose}><X/></button>
      <div className="detail-visual" style={{background:`radial-gradient(circle at 70% 20%, ${card.accent}66, transparent 35%), linear-gradient(145deg, ${card.color}, #111827)`}}>
        <div className="fake-orb big"></div><div className="pokemon-name big-name">{card.pokemon}</div><span>{card.number}</span>
      </div>
      <div className="detail-content">
        <span className="eyebrow">{card.rarity}</span>
        <h2>{card.name}</h2>
        <p className="set-line">{card.set} · {card.year} · {card.language}</p>
        <p>{card.note}</p>
        <div className="detail-prices">
          <div><small>Brute min.</small><strong>{money(card.rawMin)}</strong></div>
          <div><small>Brute max.</small><strong>{money(card.rawMax)}</strong></div>
          <div><small>Grade 10 indicatif</small><strong>{money(card.graded10)}</strong></div>
        </div>
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
