import type { ExternalCard } from './cards'
import {cardImageOverrideById} from '../data/cardImageOverrides'
export type CardImageIdentity={source:'tcgdex';setId:string;cardId:string;language:string;number?:string;name?:string}
export type ResolvedCardImage={url?:string;language:string;quality:'low'|'high';source:'local-override'|'TCGdex'|'Pokémon TCG API'|'none';isFallback:boolean;verified:boolean}
export interface CardImageProvider{id:string;resolve(identity:CardImageIdentity,card?:ExternalCard):Promise<ResolvedCardImage|undefined>}
export const setIdFromCardId=(cardId:string)=>cardId.slice(0,cardId.lastIndexOf('-'))
export function resolveCardImage({card,requestedLanguage,quality='low'}:{card:ExternalCard;requestedLanguage:string;quality?:'low'|'high'}):ResolvedCardImage{
 const override=cardImageOverrideById.get(card.id)
 if(override?.verified)return{url:override.localPath,language:override.sourceLanguage,quality,source:'local-override',isFallback:override.sourceLanguage!==requestedLanguage,verified:true}
 if(card.id&&card.image)return{url:`${card.image}/${quality}.webp`,language:card.language||requestedLanguage,quality,source:'TCGdex',isFallback:(card.language||requestedLanguage)!==requestedLanguage,verified:true}
 const fallback=card.fallbackImage?.[quality]
 return{url:fallback,language:'en',quality,source:fallback?'Pokémon TCG API':'none',isFallback:Boolean(fallback),verified:Boolean(fallback)}
}
export function isSamePrinting(a:{id:string},b:{id:string}){return a.id===b.id}
