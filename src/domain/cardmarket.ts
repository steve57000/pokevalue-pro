import {cardImageOverrideById} from '../data/cardImageOverrides'

export type CardmarketCard={id?:string;name:string;localId?:string;printedNumber?:string;englishName?:string;setName?:string}
const SEARCH='https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString='
export function buildCardmarketUrl(card:CardmarketCard):string{
 const override=card.id?cardImageOverrideById.get(card.id):undefined
 if(override?.cardmarket?.directUrl)return override.cardmarket.directUrl
 const identity=override?.cardmarket
 const name=identity?.searchName||card.englishName||card.name
 const number=override?.printedNumber||card.printedNumber||card.localId
 const code=identity?.searchCode
 const terms=[name,number,code].filter((value):value is string=>Boolean(value?.trim()))
 return `${SEARCH}${encodeURIComponent(terms.join(' '))}`
}
