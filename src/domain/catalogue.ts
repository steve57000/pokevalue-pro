import type { CollectionEntry } from './collection'
import type { PriceReference } from './pricing'

import {getGradingInterest} from './grading'
export type CardSort = 'number'|'name-asc'|'name-desc'|'price-asc'|'price-desc'|'owned'|'quantity'|'grading'
export type SortableCard = {id:string;name:string;localId:string;rarity?:string}
export type PriceState = {status:'loading'|'success'|'error';price?:PriceReference|null;cardmarket?:{trend?:number;avg30?:number;avg7?:number;low?:number}}

const cardNumber = (value:string) => Number(value.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER)
export function sortCatalogueCards<T extends SortableCard>(cards:T[], sort:CardSort, prices:Record<string,PriceState>, entries:Map<string,CollectionEntry>):T[] {
  return [...cards].sort((a,b)=>{
    const ea=entries.get(a.id), eb=entries.get(b.id)
    if(sort==='name-asc'||sort==='name-desc') return a.name.localeCompare(b.name,'fr')*(sort==='name-desc'?-1:1)
    if(sort==='owned') return Number(Boolean(eb?.quantity))-Number(Boolean(ea?.quantity)) || cardNumber(a.localId)-cardNumber(b.localId)
    if(sort==='quantity') return (eb?.quantity??0)-(ea?.quantity??0) || cardNumber(a.localId)-cardNumber(b.localId)
    if(sort==='price-asc'||sort==='price-desc') {
      const av=prices[a.id]?.price?.value, bv=prices[b.id]?.price?.value
      if(av===undefined&&bv===undefined)return cardNumber(a.localId)-cardNumber(b.localId)
      if(av===undefined)return 1
      if(bv===undefined)return -1
      return (av-bv)*(sort==='price-desc'?-1:1)
    }
    if(sort==='grading'){
      const interest=(card:T)=>getGradingInterest({rawPrice:prices[card.id]?.price?.value,rarity:card.rarity,...prices[card.id]?.cardmarket})
      const rank={high:3,medium:2,low:1},ai=interest(a),bi=interest(b)
      return rank[bi.level]-rank[ai.level]||(prices[b.id]?.price?.value??-1)-(prices[a.id]?.price?.value??-1)
    }
    return cardNumber(a.localId)-cardNumber(b.localId) || a.localId.localeCompare(b.localId)
  })
}

export function normalizeSearch(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').trim()}
