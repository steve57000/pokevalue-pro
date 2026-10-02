import type { ExternalCard } from './cards'
import {cardImageOverrideById,rgbMewImageByNumber} from '../data/cardImageOverrides'
export type CardImageIdentity={source:'tcgdex';setId:string;cardId:string;language:string;number?:string;name?:string}
export type ResolvedCardImage={url?:string;language:string;quality:'low'|'high';source:'local-override'|'TCGdex'|'Pokémon TCG API'|'none';isFallback:boolean;verified:boolean}
export interface CardImageProvider{id:string;resolve(identity:CardImageIdentity,card?:ExternalCard):Promise<ResolvedCardImage|undefined>}
export const setIdFromCardId=(cardId:string)=>cardId.slice(0,cardId.lastIndexOf('-'))
export function isPokemonCardBackUrl(url?:string){
 if(!url)return false
 const normalized=url.toLowerCase().split(/[?#]/,1)[0].replace(/%2f/g,'/').replace(/\\/g,'/')
 return normalized.endsWith('/images/pokemon-card-back.jpg')||normalized.endsWith('/pokemon-card-back.jpg')||normalized.endsWith('/pokemon-card-back.png')||normalized.includes('images.pokemontcg.io/card-back')
}
const frontImage=(image:ResolvedCardImage):ResolvedCardImage=>image.url&&!isPokemonCardBackUrl(image.url)?image:{language:image.language,quality:image.quality,source:'none',isFallback:false,verified:false}
export function resolveCardImage({card,requestedLanguage,quality='low'}:{card:ExternalCard;requestedLanguage:string;quality?:'low'|'high'}):ResolvedCardImage{
 const override=cardImageOverrideById.get(card.id)
 if(override?.verified&&override.image)return frontImage({url:override.image.localPath,language:override.image.language,quality,source:'local-override',isFallback:override.image.language!==requestedLanguage,verified:true})
 const number=card.localId?.toUpperCase()
 const rgbMewImage=card.name.toLowerCase().startsWith('mew')&&number?rgbMewImageByNumber[number]:undefined
 if(rgbMewImage)return frontImage({url:rgbMewImage.url,language:rgbMewImage.language,quality,source:'local-override',isFallback:rgbMewImage.language!==requestedLanguage,verified:true})
 if(card.id&&card.image&&!isPokemonCardBackUrl(card.image))return frontImage({url:`${card.image}/${quality}.webp`,language:card.language||requestedLanguage,quality,source:'TCGdex',isFallback:(card.language||requestedLanguage)!==requestedLanguage,verified:true})
 const fallback=card.fallbackImage?.[quality]
 return frontImage({url:fallback,language:'en',quality,source:fallback?'Pokémon TCG API':'none',isFallback:Boolean(fallback),verified:Boolean(fallback)})
}
export function isSamePrinting(a:{id:string},b:{id:string}){return a.id===b.id}
