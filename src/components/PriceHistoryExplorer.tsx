import {useMemo,useState} from 'react'
import {TrendingDown,TrendingUp,SlidersHorizontal} from 'lucide-react'
import type {Card} from '../types'
import type {CollectionEntry} from '../domain/collection'
import type {FavoriteCard} from '../domain/favorites'
import {getAllPriceHistory,type PriceSnapshot} from '../domain/priceHistory'
import {money} from '../utils/money'

type Props={cards:Card[];entries:CollectionEntry[];favorites:FavoriteCard[];onSelect:(id:string,language:string)=>void}
const keyOf=(id:string,language:string)=>language+':'+id
type Row={key:string;id:string;language:string;name:string;setName:string;number?:string;owned:number;latest:PriceSnapshot;delta?:number}

export function PriceHistoryExplorer({cards,entries,favorites,onSelect}:Props){
 const [ownedOnly,setOwnedOnly]=useState(true),[movement,setMovement]=useState('all'),[min,setMin]=useState(''),[max,setMax]=useState('')
 const rows=useMemo(()=>{
  const metadata=new Map<string,{id:string;language:string;name:string;setName:string;number?:string;owned:number}>()
  for(const card of cards)if(card.tcgdexId){const language=card.language==='FR'?'fr':card.language==='JP'?'ja':card.language.toLowerCase();metadata.set(keyOf(card.tcgdexId,language),{id:card.tcgdexId,language,name:card.name,setName:card.set,number:card.number,owned:0})}
  for(const entry of entries){const key=keyOf(entry.cardId,entry.language),old=metadata.get(key);metadata.set(key,{id:entry.cardId,language:entry.language,name:entry.name,setName:entry.setName,number:entry.number,owned:(old?.owned??0)+Math.max(0,entry.quantity)})}
  for(const favorite of favorites){const key=keyOf(favorite.cardId,favorite.language);if(!metadata.has(key))metadata.set(key,{id:favorite.cardId,language:favorite.language,name:favorite.name,setName:favorite.setName,number:favorite.localId,owned:0})}
  const histories=new Map<string,PriceSnapshot[]>()
  for(const point of getAllPriceHistory()){const key=keyOf(point.cardId,point.language);histories.set(key,[...(histories.get(key)??[]),point])}
  const minValue=min===''?Number.NEGATIVE_INFINITY:Number(min),maxValue=max===''?Number.POSITIVE_INFINITY:Number(max)
  return [...histories.entries()].map(([key,points])=>{const ordered=points.sort((a,b)=>a.date.localeCompare(b.date)),latest=ordered[ordered.length-1],previous=ordered[ordered.length-2],meta=metadata.get(key);return {key,id:latest.cardId,language:latest.language,name:meta?.name??latest.cardId,setName:meta?.setName??'Extension inconnue',number:meta?.number,owned:meta?.owned??0,latest,delta:previous?latest.value-previous.value:undefined} satisfies Row})
   .filter(row=>(!ownedOnly||row.owned>0)&&row.latest.value>=minValue&&row.latest.value<=maxValue)
   .filter(row=>movement==='all'||(movement==='changed'?row.delta!==undefined&&row.delta!==0:movement==='up'?row.delta!==undefined&&row.delta>0:row.delta!==undefined&&row.delta<0))
   .sort((a,b)=>b.latest.value-a.latest.value)
 },[cards,entries,favorites,ownedOnly,movement,min,max])
 return <section className="price-explorer" aria-labelledby="price-explorer-title">
  <header className="price-explorer-heading"><div><span className="eyebrow"><SlidersHorizontal size={14}/> Explorer</span><h2 id="price-explorer-title">Filtrer les prix de ta collection</h2><p>Variation entre les deux derniers relevés · plage basée sur le dernier prix enregistré.</p></div><strong>{rows.length} carte{rows.length===1?'':'s'}</strong></header>
  <div className="price-explorer-filters"><label className="price-owned-filter"><input type="checkbox" checked={ownedOnly} onChange={event=>setOwnedOnly(event.target.checked)}/>Mes cartes possédées</label><label>Évolution<select value={movement} onChange={event=>setMovement(event.target.value)}><option value="all">Toutes</option><option value="changed">Prix modifié</option><option value="up">En hausse</option><option value="down">En baisse</option></select></label><label>Prix minimum (€)<input type="number" min="0" step="0.01" inputMode="decimal" placeholder="Aucun" value={min} onChange={event=>setMin(event.target.value)}/></label><label>Prix maximum (€)<input type="number" min="0" step="0.01" inputMode="decimal" placeholder="Aucun" value={max} onChange={event=>setMax(event.target.value)}/></label></div>
  <div className="price-explorer-list" aria-live="polite">{rows.length?rows.map(row=><button type="button" className="price-explorer-row" key={row.key} onClick={()=>onSelect(row.id,row.language)}><span><strong>{row.name}</strong><small>{row.setName}{row.number?' · nº '+row.number:''}{row.owned?' · ×'+row.owned:''}</small></span><span className="price-explorer-value">{money(row.latest.value)}{row.delta!==undefined&&<small className={row.delta>0?'positive':row.delta<0?'negative':''}>{row.delta>0?<TrendingUp size={13}/>:row.delta<0?<TrendingDown size={13}/>:null}{row.delta>0?'+':''}{money(row.delta)}</small>}</span></button>):<p className="price-explorer-empty">Aucune carte ne correspond. Élargis la tranche de prix ou désactive « Mes cartes possédées ».</p>}</div>
 </section>
}
