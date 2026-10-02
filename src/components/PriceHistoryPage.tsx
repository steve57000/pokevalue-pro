import {useEffect,useMemo,useState} from 'react'
import {Activity,CalendarDays,Search,TrendingDown,TrendingUp} from 'lucide-react'
import {useCardPrices} from '../hooks/useCardPrices'
import {getAllPriceHistory,getPriceHistory,type PriceSnapshot} from '../domain/priceHistory'
import type {Card} from '../types'
import type {CollectionEntry} from '../domain/collection'
import type {FavoriteCard} from '../domain/favorites'
import {money} from '../utils/money'

type TrackedCard={id:string;language:string;name:string;setName:string;number?:string}
type Props={cards:Card[];entries:CollectionEntry[];favorites:FavoriteCard[]}
const identity=(card:Pick<TrackedCard,'id'|'language'>)=>`${card.language}:${card.id}`
const cardLanguage=(language:string)=>language==='FR'?'fr':language==='JP'?'ja':language.toLowerCase()

export function PriceHistoryPage({cards,entries,favorites}:Props){
 const [search,setSearch]=useState(''),[range,setRange]=useState<'30'|'90'|'all'>('30'),[selectedKey,setSelectedKey]=useState('')
 const options=useMemo(()=>{const byKey=new Map<string,TrackedCard>();for(const card of cards)if(card.tcgdexId){const value={id:card.tcgdexId,language:cardLanguage(card.language),name:card.name,setName:card.set,number:card.number};byKey.set(identity(value),value)}for(const entry of entries){const value={id:entry.cardId,language:entry.language,name:entry.name,setName:entry.setName,number:entry.number};if(!byKey.has(identity(value)))byKey.set(identity(value),value)}for(const favorite of favorites){const value={id:favorite.cardId,language:favorite.language,name:favorite.name,setName:favorite.setName,number:favorite.localId};if(!byKey.has(identity(value)))byKey.set(identity(value),value)}return [...byKey.values()].sort((a,b)=>a.name.localeCompare(b.name,'fr'))},[cards,entries,favorites])
 const selected=options.find(card=>identity(card)===selectedKey)??options[0]
 const currentPrices=useCardPrices(selected?[selected.id]:[],selected?.language??'fr')
 const livePrice=selected?currentPrices[selected.id]:undefined
 const [history,setHistory]=useState<PriceSnapshot[]>(()=>selected?getPriceHistory(selected.id,selected.language):[])
 useEffect(()=>{setHistory(selected?getPriceHistory(selected.id,selected.language):[])},[selected?.id,selected?.language])
 useEffect(()=>{if(selected&&livePrice?.status==='success')setHistory(getPriceHistory(selected.id,selected.language))},[selected?.id,selected?.language,livePrice?.status])
 const allHistory=getAllPriceHistory(),trackedCount=new Set(allHistory.map(point=>`${point.language}:${point.cardId}`)).size
 const filteredOptions=options.filter(card=>`${card.name} ${card.setName} ${card.number??''} ${card.id}`.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')))
 const visibleHistory=useMemo(()=>{if(range==='all'||history.length<2)return history;const cutoff=Date.now()-Number(range)*24*60*60*1000;return history.filter(point=>new Date(`${point.date}T00:00:00`).getTime()>=cutoff)},[history,range])
 const values=visibleHistory.map(point=>point.value),latest=values[values.length-1],first=values[0],change=latest!==undefined&&first!==undefined?latest-first:undefined,changePercent=change!==undefined&&first?change/first*100:undefined
 return <section className="price-history-page">
  <div className="page-heading"><span className="eyebrow"><Activity size={15}/> Marché & collection</span><h1>Suivi des prix</h1><p>Visualise les relevés Cardmarket de tes cartes. L’historique commence au premier relevé enregistré par l’application.</p></div>
  <div className="history-overview"><article><span>Cartes suivies</span><strong>{trackedCount}</strong><small>avec au moins un relevé</small></article><article><span>Relevés enregistrés</span><strong>{allHistory.length}</strong><small>sur cet appareil</small></article><article><span>Période affichée</span><strong>{range==='all'?'Tout':`${range} jours`}</strong><small>prix en euros</small></article></div>
  <div className="history-controls"><label className="history-search"><Search size={17}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Rechercher une carte ou une extension"/></label><label className="history-card-select"><span>Carte</span><select value={selected?identity(selected):''} onChange={event=>setSelectedKey(event.target.value)}>{filteredOptions.map(card=><option key={identity(card)} value={identity(card)}>{card.name} · {card.number?`nº ${card.number} · `:''}{card.setName} ({card.language.toUpperCase()})</option>)}</select></label><div className="history-range" aria-label="Période du graphique">{(['30','90','all'] as const).map(value=><button key={value} className={range===value?'active':''} onClick={()=>setRange(value)}>{value==='all'?'Tout':`${value} j`}</button>)}</div></div>
  {selected?<article className="history-detail-card"><div className="history-card-heading"><div><span className="eyebrow"><CalendarDays size={14}/> {selected.setName} · {selected.language.toUpperCase()}</span><h2>{selected.name}</h2><p>{selected.number?`Nº ${selected.number} · `:''}{selected.id}</p></div><div className="history-current-price"><small>Dernier prix relevé</small><strong>{latest!==undefined?money(latest):livePrice?.price?money(livePrice.price.value):'—'}</strong>{change!==undefined&&<span className={change>0?'positive':change<0?'negative':''}>{change>0?<TrendingUp size={15}/>:change<0?<TrendingDown size={15}/>:null}{change>0?'+':''}{money(change)}{changePercent!==undefined&&` (${changePercent>0?'+':''}${changePercent.toFixed(1)} %)`}</span>}</div></div>
   {visibleHistory.length>0?<div className="history-chart-wrap"><div className="history-chart-labels"><span>{money(Math.max(...values))}</span><span>{money((Math.max(...values)+Math.min(...values))/2)}</span><span>{money(Math.min(...values))}</span></div><PriceChart points={visibleHistory}/><div className="history-dates"><span>{visibleHistory[0].date}</span><span>{visibleHistory[visibleHistory.length-1].date}</span></div></div>:<div className="history-empty"><Activity size={26}/><strong>{livePrice?.status==='loading'?'Relevé du prix en cours…':'Pas encore assez de données'}</strong><p>{history.length===0?'Un premier prix est enregistré dès que le marché Cardmarket de cette carte est chargé. Les prochains relevés quotidiens formeront la courbe.':'Aucun relevé dans cette période. Essaie une période plus large.'}</p></div>}
   <footer className="history-source">Source : Cardmarket via TCGdex · relevés quotidiens enregistrés localement · ce graphique ne reconstitue pas le passé avant le premier relevé.</footer>
  </article>:<div className="history-empty"><Activity size={26}/><strong>Aucune carte à suivre</strong><p>Ajoute une carte à tes favoris ou à ta collection pour la retrouver ici.</p></div>}
 </section>
}

function PriceChart({points}:{points:PriceSnapshot[]}){
 const values=points.map(point=>point.value),min=Math.min(...values),max=Math.max(...values),span=max-min||Math.max(max*.08,1),coords=points.map((point,index)=>({x:48+(points.length===1?0:index/(points.length-1)*612),y:20+(max-point.value)/span*190})),line=coords.map((point,index)=>`${index?'L':'M'} ${point.x} ${point.y}`).join(' '),last=coords[coords.length-1],area=`${line} L ${last?.x??48} 238 L ${coords[0]?.x??48} 238 Z`
 return <svg className="history-chart" viewBox="0 0 700 260" role="img" aria-label={`Courbe de ${money(points[0].value)} à ${money(points[points.length-1].value)}`}><defs><linearGradient id="price-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".22"/><stop offset="100%" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>{[22,117,212].map(y=><path key={y} className="history-gridline" d={`M48 ${y}H660`}/>)}<path className="history-area" d={area}/><path className="history-line" d={line}/>{coords.map((point,index)=><circle key={`${points[index].date}-${index}`} cx={point.x} cy={point.y} r={index===coords.length-1?5:3}><title>{points[index].date} · {money(points[index].value)}</title></circle>)}</svg>
}
