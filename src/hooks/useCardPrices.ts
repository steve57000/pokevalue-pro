import { useEffect, useReducer } from 'react'
import { tcgDexProvider } from '../api/tcgdex'
import { comparablePriceHistory, ensurePriceHistoryReady, getAllPriceHistory, recordPriceSnapshots, snapshotsFromQuotes, type PriceSnapshot } from '../domain/priceHistory'
import { collectMarketPriceQuotes, getPriceStats, selectCardmarketPrice, selectTcgplayerPrice, type CardMarketStats, type MarketPriceQuote, type PriceReference, type TcgPlayerQuote, type TcgPlayerStats } from '../domain/pricing'

export type CardPriceState={status:'loading'|'success'|'error';price?:PriceReference|null;tcgplayerQuote?:TcgPlayerQuote;quotes?:MarketPriceQuote[];cardmarket?:CardMarketStats;tcgplayer?:TcgPlayerStats;tcgplayerHolo?:TcgPlayerStats;tcgplayerReverse?:TcgPlayerStats;language:string;checkedAt?:number;quoteObservedAt?:number;retained?:boolean}
const PRICE_REFRESH_INTERVAL_MS=24*60*60*1000
const cache=new Map<string,CardPriceState>(),listeners=new Set<()=>void>(),queue:{id:string;language:string;force:boolean}[]=[],queued=new Set<string>();let running=0
const CONCURRENCY=7, keyOf=(id:string,language:string)=>`price:${language}:${id}`
export function isCardPriceRefreshDue(checkedAt?:number,now=Date.now()){return checkedAt===undefined||now-checkedAt>=PRICE_REFRESH_INTERVAL_MS}
function notify(){listeners.forEach(x=>x())}
/** A missing response is not a new zero-price observation. */
export function retainKnownPrices(previous:CardPriceState|undefined,next:CardPriceState):CardPriceState {
 const keepGuide=previous?.price?.basis==='guide'&&(next.price?.basis!=='guide'||Boolean(next.retained))
 return {...next,price:keepGuide?previous.price:next.price??previous?.price,tcgplayerQuote:next.tcgplayerQuote??previous?.tcgplayerQuote,
  quoteObservedAt:keepGuide||!next.price?previous?.quoteObservedAt:next.quoteObservedAt,
  retained:next.retained||keepGuide||Boolean((!next.price&&previous?.price)||(!next.tcgplayerQuote&&previous?.tcgplayerQuote))}
}
function restorePrice(point:PriceSnapshot|undefined,language:string):CardPriceState|undefined {
 return point?{status:'loading',language,retained:true,quoteObservedAt:Date.parse(point.recordedAt??point.date),price:{value:point.value,currency:'EUR',provider:'cardmarket',basis:'guide',label:'Tendance Cardmarket',updatedAt:point.sourceUpdatedAt??point.recordedAt??point.date}}:undefined
}
function drain(){
 while(running<CONCURRENCY&&queue.length){
  const task=queue.shift()!,key=keyOf(task.id,task.language),previous=cache.get(key)
  queued.delete(key);running++;cache.set(key,{...previous,status:'loading',language:task.language});notify()
  tcgDexProvider.getCard(task.id,task.language,task.force).then(card=>{
   const observedAt=new Date().toISOString(),stats=getPriceStats(card.pricing),price=selectCardmarketPrice(card.pricing)??null,tcgplayerQuote=selectTcgplayerPrice(card.pricing),quotes=collectMarketPriceQuotes(card.pricing,task.language,observedAt)
   cache.set(key,retainKnownPrices(previous,{status:card.fromStaleCache?'error':'success',price,tcgplayerQuote,quotes,language:task.language,...stats,checkedAt:Date.now(),quoteObservedAt:Date.parse(observedAt),retained:card.fromStaleCache}))
   if(!card.fromStaleCache){try{recordPriceSnapshots(snapshotsFromQuotes(task.id,quotes))}catch(error){console.error('Échec de sauvegarde de l’historique de prix',error)}}
  }).catch(()=>cache.set(key,{...cache.get(key),status:'error',language:task.language,checkedAt:Date.now()})).finally(()=>{running--;notify();drain()})
 }
}
function enqueue(ids:string[],language:string,force=false){
 const saved=new Map<string,PriceSnapshot>()
 if(typeof localStorage!=='undefined'&&ids.some(id=>!cache.has(keyOf(id,language)))){
  for(const point of comparablePriceHistory(getAllPriceHistory()))if(point.language===language)saved.set(point.cardId,point)
 }
 for(const id of ids){
  const key=keyOf(id,language)
  if(!cache.has(key)){const restored=restorePrice(saved.get(id),language);if(restored)cache.set(key,{...restored,status:'success'})}
  const state=cache.get(key)
  const retryDue=state?.status==='error'||!state?.price ? state?.checkedAt===undefined||Date.now()-state.checkedAt>=5*60*1000 : isCardPriceRefreshDue(state.checkedAt)
  if(queued.has(key)||state?.status==='loading'||(!force&&!retryDue))continue
  queued.add(key);queue.push({id,language,force})
 }
 drain()
}
export function refreshCardPrices(cardIds:string[],language='fr'){enqueue([...new Set(cardIds)],language,true)}
export function useCardPrices(cardIds:string[],language='fr'){
 const [,render]=useReducer(x=>x+1,0),ids=[...new Set(cardIds)],key=`${language}|${ids.join('|')}`
 useEffect(()=>{
  const listener=()=>render(),refreshIfVisible=()=>{if(document.visibilityState==='visible')enqueue(ids,language)}
  let active=true
  const restore=()=>{
   if(!active)return
   const requested=new Set(ids)
   const latest=new Map<string,PriceSnapshot>()
   for(const point of comparablePriceHistory(getAllPriceHistory())){
    if(point.language!==language||!requested.has(point.cardId))continue
    latest.set(point.cardId,point)
   }
   for(const point of latest.values()){
    const key=keyOf(point.cardId,language),state=cache.get(key)
    if(!state?.price||Date.parse(point.recordedAt??point.date)>(state.quoteObservedAt??0)){const restored=restorePrice(point,language);if(restored)cache.set(key,{...restored,...state,price:restored.price,quoteObservedAt:restored.quoteObservedAt,retained:true})}
   }
   render()
  }
  window.addEventListener('pv-price-history-updated',restore)
  void ensurePriceHistoryReady().then(restore)
  listeners.add(listener);enqueue(ids,language)
  const timer=window.setInterval(refreshIfVisible,60*1000)
  document.addEventListener('visibilitychange',refreshIfVisible)
  return()=>{active=false;listeners.delete(listener);window.clearInterval(timer);document.removeEventListener('visibilitychange',refreshIfVisible);window.removeEventListener('pv-price-history-updated',restore)}
 },[key])
 const prices:Record<string,CardPriceState>={}
 for(const id of ids)prices[id]=cache.get(keyOf(id,language))??{status:'loading',language}
 return prices
}
export const cardPriceCacheKey=keyOf
