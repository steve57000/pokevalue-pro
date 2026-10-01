import type { ExternalCard } from './cards'
export type ResolvedCardImage={url?:string;language:string;quality:'low'|'high';source:'TCGdex'|'Pokémon TCG API'|'none';isFallback:boolean}
export function resolveCardImage({card,requestedLanguage,quality='low'}:{card:ExternalCard;requestedLanguage:string;quality?:'low'|'high'}):ResolvedCardImage{
  if(card.id && card.image) return {url:`${card.image}/${quality}.webp`,language:card.language||requestedLanguage,quality,source:'TCGdex',isFallback:(card.language||requestedLanguage)!==requestedLanguage}
  const fallback=card.fallbackImage?.[quality]
  return {url:fallback,language:'en',quality,source:fallback?'Pokémon TCG API':'none',isFallback:Boolean(fallback)}
}
export function isSamePrinting(a:{id:string},b:{id:string}){return a.id===b.id}
