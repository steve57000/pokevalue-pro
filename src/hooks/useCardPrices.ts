import { useEffect, useReducer } from 'react'
import { tcgDexProvider } from '../api/tcgdex'
import { recordPriceSnapshot, todayPriceDate } from '../domain/priceHistory'
import { getPriceStats, selectCardmarketPrice, type CardMarketStats, type PriceReference, type TcgPlayerStats } from '../domain/pricing'

export type CardPriceState={status:'loading'|'success'|'error';price?:PriceReference|null;cardmarket?:CardMarketStats;tcgplayer?:TcgPlayerStats;language:string;checkedAt?:number}
const PRICE_REFRESH_INTERVAL_MS=24*60*60*1000
const cache=new Map<string,CardPriceState>(),listeners=new Set<()=>void>(),queue:{id:string;language:string;force:boolean}[]=[],queued=new Set<string>();let running=0
const CONCURRENCY=7, keyOf=(id:string,language:string)=>`price:${language}:${id}`
export function isCardPriceRefreshDue(checkedAt?:number,now=Date.now()){return checkedAt===undefined||now-checkedAt>=PRICE_REFRESH_INTERVAL_MS}
function notify(){listeners.forEach(x=>x())}
function drain(){
 while(running<CONCURRENCY&&queue.length){
  const task=queue.shift()!,key=keyOf(task.id,task.language),previous=cache.get(key)
  queued.delete(key);running++;cache.set(key,{...previous,status:'loading',language:task.language});notify()
  tcgDexProvider.getCard(task.id,task.language,task.force).then(card=>{
   const stats=getPriceStats(card.pricing),price=selectCardmarketPrice(card.pricing)??null
   cache.set(key,{status:'success',price,language:task.language,...stats,checkedAt:Date.now()})
   if(price)recordPriceSnapshot({cardId:task.id,language:task.language,date:todayPriceDate(),value:price.value,source:price.provider})
  }).catch(()=>cache.set(key,{...cache.get(key),status:'error',language:task.language,checkedAt:Date.now()})).finally(()=>{running--;notify();drain()})
 }
}
function enqueue(ids:string[],language:string,force=false){
 for(const id of ids){
  const key=keyOf(id,language),state=cache.get(key)
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
