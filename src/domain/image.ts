import type { ExternalCard } from './cards'
import {cardImageOverrideById,rgbMewImageByNumber} from '../data/cardImageOverrides'
export function normalizeImageLanguage(language:string='fr'){
 const normalized=language.trim().toLowerCase().replace(/_/g,'-')
 if(normalized==='jp'||normalized==='ja')return 'ja'
 if(normalized==='zh'||normalized==='zh-tw'||normalized==='zh-hant')return 'zh-tw'
 if(normalized==='en')return 'en'
 return 'fr'
}
export type CardImageIdentity={source:'tcgdex';setId:string;cardId:string;language:string;number?:string;name?:string}
export type ResolvedCardImage={url?:string;language:string;quality:'low'|'high';source:'local-override'|'TCGdex'|'Pokémon TCG API'|'promo-archive'|'none';isFallback:boolean;verified:boolean}
export interface CardImageProvider{id:string;resolve(identity:CardImageIdentity,card?:ExternalCard):Promise<ResolvedCardImage|undefined>}
export const setIdFromCardId=(cardId:string)=>cardId.slice(0,cardId.lastIndexOf('-'))
export function isPokemonCardBackUrl(url?:string){
 if(!url)return false
 const normalized=url.toLowerCase().split(/[?#]/,1)[0].replace(/%2f/g,'/').replace(/\\/g,'/')
 return normalized.endsWith('/images/pokemon-card-back.jpg')||normalized.endsWith('/pokemon-card-back.jpg')||normalized.endsWith('/pokemon-card-back.png')||normalized.includes('images.pokemontcg.io/card-back')
}
const frontImage=(image:ResolvedCardImage):ResolvedCardImage=>image.url&&!isPokemonCardBackUrl(image.url)?image:{language:image.language,quality:image.quality,source:'none',isFallback:false,verified:false}
export function resolveCardImage({card,requestedLanguage,quality='low'}:{card:ExternalCard;requestedLanguage:string;quality?:'low'|'high'}):ResolvedCardImage{
 requestedLanguage=normalizeImageLanguage(requestedLanguage)
 const override=cardImageOverrideById.get(card.id)
 if(override?.verified&&override.image)return frontImage({url:override.image.localPath,language:override.image.language,quality,source:'local-override',isFallback:override.image.language!==requestedLanguage,verified:true})
 const number=card.localId?.toUpperCase()
 const cardSetId=setIdFromCardId(card.id).toLowerCase()
 const rgbLetter=number?.[0]
 const isRgbMewSet=cardSetId==='30th'||cardSetId==='m6a'
 const rgbMewImage=isRgbMewSet&&rgbLetter&&['R','G','B'].includes(rgbLetter)?rgbMewImageByNumber[rgbLetter]:undefined
 if(rgbMewImage)return frontImage({url:rgbMewImage.url,language:rgbMewImage.language,quality,source:'local-override',isFallback:rgbMewImage.language!==requestedLanguage,verified:true})
 if(cardSetId==='mee'){
  const energyNumber=Number.parseInt(card.localId??'',10)
  const scan=megaEvolutionEnergyScans[energyNumber]
  if(scan)return frontImage({url:scan,language:'fr',quality,source:'local-override',isFallback:requestedLanguage!=='fr',verified:true})
 }
 if(card.id&&card.image&&!isPokemonCardBackUrl(card.image)){
  const imageLanguage=normalizeImageLanguage(card.language||requestedLanguage)
  return frontImage({url:`${card.image}/${quality}.webp`,language:imageLanguage,quality,source:'TCGdex',isFallback:imageLanguage!==requestedLanguage,verified:true})
 }
 const fallback=card.fallbackImage?.[quality]
 return frontImage({url:fallback,language:'en',quality,source:fallback?'Pokémon TCG API':'none',isFallback:Boolean(fallback),verified:Boolean(fallback)})
}
const megaEvolutionEnergyScans:Readonly<Record<number,string>>={
 1:'https://www.pokepedia.fr/images/c/cf/Carte_M%C3%A9ga-%C3%89volution_%C3%89nergie_de_base_001.png',
 2:'https://www.pokepedia.fr/images/b/bc/Carte_M%C3%A9ga-%C3%89volution_%C3%89nergie_de_base_002.png',
 3:'https://www.pokepedia.fr/images/1/1e/Carte_M%C3%A9ga-%C3%89volution_%C3%89nergie_de_base_003.png',
 4:'https://www.pokepedia.fr/images/f/f7/Carte_M%C3%A9ga-%C3%89volution_%C3%89nergie_de_base_004.png',
 5:'https://www.pokepedia.fr/images/1/1e/Carte_M%C3%A9ga-%C3%89volution_%C3%89nergie_de_base_005.png',
 6:'https://www.pokepedia.fr/images/5/5b/Carte_M%C3%A9ga-%C3%89volution_%C3%89nergie_de_base_006.png',
 7:'https://www.pokepedia.fr/images/6/6e/Carte_M%C3%A9ga-%C3%89volution_%C3%89nergie_de_base_007.png',
 8:'https://www.pokepedia.fr/images/7/76/Carte_M%C3%A9ga-%C3%89volution_%C3%89nergie_de_base_008.png',
 9:'https://www.pokepedia.fr/images/4/45/Carte_M%C3%A9ga-%C3%89volution_%C3%89nergie_de_base_009.png',
 10:'https://www.pokepedia.fr/images/8/80/Carte_M%C3%A9ga-%C3%89volution_%C3%89nergie_de_base_010.png',
 11:'https://www.pokepedia.fr/images/f/fb/Carte_M%C3%A9ga-%C3%89volution_%C3%89nergie_de_base_011.png',
 12:'https://www.pokepedia.fr/images/9/9e/Carte_M%C3%A9ga-%C3%89volution_%C3%89nergie_de_base_012.png',
 13:'https://www.pokepedia.fr/images/6/69/Carte_M%C3%A9ga-%C3%89volution_%C3%89nergie_de_base_013.png',
 14:'https://www.pokepedia.fr/images/3/30/Carte_M%C3%A9ga-%C3%89volution_%C3%89nergie_de_base_014.png',
 15:'https://www.pokepedia.fr/images/0/06/Carte_M%C3%A9ga-%C3%89volution_%C3%89nergie_de_base_015.png',
 16:'https://www.pokepedia.fr/images/1/1a/Carte_M%C3%A9ga-%C3%89volution_%C3%89nergie_de_base_016.png',
}
// MEP promo scans are not consistently present in TCGdex. Bill's Archive
// exposes its English scans using this stable filename convention.
export function buildMepPromoImage(card:Pick<ExternalCard,'id'|'localId'|'name'>){
 if(!/^mep-\d+$/i.test(card.id)||!card.localId||!/^\d{1,3}$/.test(card.localId))return undefined
 const englishSlug=card.name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
 if(!englishSlug)return undefined
 const number=card.localId.padStart(3,'0')
 return `https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/mep/mep-${number}_${englishSlug}.webp`
}
export function isSamePrinting(a:{id:string},b:{id:string}){return a.id===b.id}
