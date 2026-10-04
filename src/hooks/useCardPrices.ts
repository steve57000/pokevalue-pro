import { useEffect, useReducer } from 'react'
import { tcgDexProvider } from '../api/tcgdex'
import { recordPriceSnapshot, todayPriceDate } from '../domain/priceHistory'
import { getPriceStats, selectCardmarketPrice, type CardMarketStats, type PriceReference, type TcgPlayerStats } from '../domain/pricing'

export type CardPriceState={status:'loading'|'success'|'error';price?:PriceReference|null;cardmarket?:CardMarketStats;tcgplayer?:TcgPlayerStats;language:string}
const cache=new Map<string,CardPriceState>(),listeners=new Set<()=>void>(),queue:{id:string;language:string;force:boolean}[]=[],queued=new Set<string>();let running=0
const CONCURRENCY=7, keyOf=(id:string,language:string)=>`price:${language}:${id}`
function notify(){listeners.forEach(x=>x())}
function drain(){while(running<CONCURRENCY&&queue.length){const task=queue.shift()!,key=keyOf(task.id,task.language);queued.delete(key);running++;cache.set(key,{status:'loading',language:task.language});notify();tcgDexProvider.getCard(task.id,task.language,task.force).then(card=>{const stats=getPriceStats(card.pricing),price=selectCardmarketPrice(card.pricing)??null;cache.set(key,{status:'success',price,language:task.language,...stats});if(price)recordPriceSnapshot({cardId:task.id,language:task.language,date:todayPriceDate(),value:price.value,source:price.provider})}).catch(()=>cache.set(key,{status:'error',language:task.language})).finally(()=>{running--;notify();drain()})}}
function enqueue(ids:string[],language:string,force=false){for(const id of ids){const key=keyOf(id,language);if(force)cache.delete(key);if((force||!cache.has(key))&&!queued.has(key)){queued.add(key);queue.push({id,language,force})}}drain()}
export function refreshCardPrices(cardIds:string[],language='fr'){enqueue([...new Set(cardIds)],language,true)}
export function useCardPrices(cardIds:string[],language='fr'){
 const [,render]=useReducer(x=>x+1,0),ids=[...new Set(cardIds)],key=`${language}|${ids.join('|')}`
 useEffect(()=>{const listener=()=>render();listeners.add(listener);enqueue(ids,language);return()=>{listeners.delete(listener)}},[key])
 const prices:Record<string,CardPriceState>={};for(const id of ids)prices[id]=cache.get(keyOf(id,language))??{status:'loading',language};return prices
}
export const cardPriceCacheKey=keyOf
