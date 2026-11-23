import {cardImageOverrideById} from '../data/cardImageOverrides'
import {reviewedPriceCard} from './reviewedPrices'

export type CardmarketCard={id?:string;name:string;localId?:string;printedNumber?:string;englishName?:string;setName?:string;language?:string}
const SEARCH='https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString='
export function buildCardmarketUrl(card:CardmarketCard):string{
 const override=card.id?cardImageOverrideById.get(card.id):undefined
 const lang={fr:'2',en:'1',ja:'7','zh-tw':'11'}[card.language?.toLowerCase()??'']
 const filtered=(url:string)=>lang?url+(url.includes('?')?'&':'?')+'language='+lang:url
 const reviewed=card.id&&['fr','en'].includes(card.language??'')?reviewedPriceCard(card.id):undefined
 if(reviewed)return filtered(reviewed.marketUrl)
 if(override?.cardmarket?.directUrl)return filtered(override.cardmarket.directUrl)
 const identity=override?.cardmarket
 const name=identity?.searchName||card.englishName||card.name
 const number=override?.printedNumber||card.printedNumber||card.localId
 const code=identity?.searchCode
 const terms=[name,number,code].filter((value):value is string=>Boolean(value?.trim()))
 return filtered(`${SEARCH}${encodeURIComponent(terms.join(' '))}`)
}
