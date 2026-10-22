import { useEffect, useReducer } from 'react'
import { tcgDexProvider } from '../api/tcgdex'
import { comparablePriceHistory, getAllPriceHistory, recordPriceSnapshots, snapshotsFromQuotes, type PriceSnapshot } from '../domain/priceHistory'
import { collectMarketPriceQuotes, getPriceStats, selectCardmarketPrice, selectTcgplayerPrice, type CardMarketStats, type MarketPriceQuote, type PriceReference, type TcgPlayerQuote, type TcgPlayerStats } from '../domain/pricing'

export type CardPriceState={status:'loading'|'success'|'error';price?:PriceReference|null;tcgplayerQuote?:TcgPlayerQuote;quotes?:MarketPriceQuote[];cardmarket?:CardMarketStats;tcgplayer?:TcgPlayerStats;tcgplayerHolo?:TcgPlayerStats;tcgplayerReverse?:TcgPlayerStats;language:string;checkedAt?:number;retained?:boolean}
const PRICE_REFRESH_INTERVAL_MS=24*60*60*1000
const cache=new Map<string,CardPriceState>(),listeners=new Set<()=>void>(),queue:{id:string;language:string;force:boolean}[]=[],queued=new Set<string>();let running=0
const CONCURRENCY=7, keyOf=(id:string,language:string)=>`price:${language}:${id}`
export function isCardPriceRefreshDue(checkedAt?:number,now=Date.now()){return checkedAt===undefined||now-checkedAt>=PRICE_REFRESH_INTERVAL_MS}
function notify(){listeners.forEach(x=>x())}
/** A missing response is not a new zero-price observation. */
export function retainKnownPrices(previous:CardPriceState|undefined,next:CardPriceState):CardPriceState {
 return {...next,price:next.price??previous?.price,tcgplayerQuote:next.tcgplayerQuote??previous?.tcgplayerQuote,
  retained:next.retained||Boolean((!next.price&&previous?.price)||(!next.tcgplayerQuote&&previous?.tcgplayerQuote))}
}
function restorePrice(point:PriceSnapshot|undefined,language:string):CardPriceState|undefined {
 return point?{status:'loading',language,retained:true,price:{value:point.value,currency:'EUR',provider:'cardmarket',basis:'guide',label:'Tendance Cardmarket',updatedAt:point.sourceUpdatedAt??point.recordedAt??point.date}}:undefined
}
function drain(){
 while(running<CONCURRENCY&&queue.length){
  const task=queue.shift()!,key=keyOf(task.id,task.language),previous=cache.get(key)
  queued.delete(key);running++;cache.set(key,{...previous,status:'loading',language:task.language});notify()
  tcgDexProvider.getCard(task.id,task.language,task.force).then(card=>{
   const observedAt=new Date().toISOString(),stats=getPriceStats(card.pricing),price=selectCardmarketPrice(card.pricing)??null,tcgplayerQuote=selectTcgplayerPrice(card.pricing),quotes=collectMarketPriceQuotes(card.pricing,task.language,observedAt)
   cache.set(key,retainKnownPrices(previous,{status:card.fromStaleCache?'error':'success',price,tcgplayerQuote,quotes,language:task.language,...stats,checkedAt:Date.now(),retained:card.fromStaleCache}))
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
  if(queued.has(key)||state?.status==='loading'||(!force&&!isCardPriceRefreshDue(state?.checkedAt)))continue
  queued.add(key);queue.push({id,language,force})
 }
 drain()
}
export function refreshCardPrices(cardIds:string[],language='fr'){enqueue([...new Set(cardIds)],language,true)}
export function useCardPrices(cardIds:string[],language='fr'){
 const [,render]=useReducer(x=>x+1,0),ids=[...new Set(cardIds)],key=`${language}|${ids.join('|')}`
 useEffect(()=>{
  const listener=()=>render(),refreshIfVisible=()=>{if(document.visibilityState==='visible')enqueue(ids,language)}
  listeners.add(listener);enqueue(ids,language)
  const timer=window.setInterval(refreshIfVisible,PRICE_REFRESH_INTERVAL_MS)
  document.addEventListener('visibilitychange',refreshIfVisible)
  return()=>{listeners.delete(listener);window.clearInterval(timer);document.removeEventListener('visibilitychange',refreshIfVisible)}
 },[key])
 const prices:Record<string,CardPriceState>={}
 for(const id of ids)prices[id]=cache.get(keyOf(id,language))??{status:'loading',language}
 return prices
}
export const cardPriceCacheKey=keyOf
