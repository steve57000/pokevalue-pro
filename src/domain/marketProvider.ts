import type {CardPriceState} from '../hooks/useCardPrices'
import {tcgDexProvider} from '../api/tcgdex'
import {getPriceStats,selectCardmarketPrice} from './pricing'
export interface MarketPriceProvider{readonly id:string;supportsLanguage(language:string):boolean;getCardPrice(cardId:string,language:string):Promise<CardPriceState>}
export class TCGdexMarketProvider implements MarketPriceProvider{
 readonly id='tcgdex-cardmarket'
 supportsLanguage(language:string){return ['fr','en','ja','zh-tw'].includes(language)}
 async getCardPrice(cardId:string,language:string):Promise<CardPriceState>{const card=await tcgDexProvider.getCard(cardId,language);return {status:'success',language,price:selectCardmarketPrice(card.pricing)??null,...getPriceStats(card.pricing)}}
}
export const tcgDexMarketProvider=new TCGdexMarketProvider()
export const MARKET_PROVIDER_SECURITY_NOTE='Les fournisseurs avec clé (par exemple JustTCG) doivent être appelés par un backend, jamais par une variable VITE publique.'
