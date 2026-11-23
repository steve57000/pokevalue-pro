import type { ExternalCard } from './cards'
import { collectMarketPriceQuotes, getPriceStats, selectCardmarketPrice, selectTcgplayerPrice } from './pricing'
import { reviewedMarketData } from './reviewedPrices'

/** TCGdex's translated catalogue is not evidence of the physical printing sold.
 * No connected feed currently verifies both marketplace identity and language.
 * Keep raw responses for diagnostics, but never promote them to a local quote.
 */
export function localizedMarketData(card: ExternalCard, observedAt = new Date().toISOString(), requested = {id: card.id, language: card.language}) {
  const identityMatches = requested.id === card.id && requested.language === card.language
  const reviewed = identityMatches ? reviewedMarketData(card.id, card.language) : undefined
  if (reviewed) return {...reviewed, tcgplayerQuote: undefined, ...getPriceStats(undefined)}
  const evidence = card.priceVerification
  const verified = requested.id === card.id && requested.language === card.language && evidence?.cardId === card.id && evidence.printingLanguage === card.language
    && evidence.variant === 'normal' && evidence.identityVerified === true
  const pricing = verified ? card.pricing : undefined
  const price = selectCardmarketPrice(pricing)
  const tcgplayer = card.language === 'en' ? selectTcgplayerPrice(pricing) : undefined
  return {
    price: price && evidence ? {...price, printingLanguage:evidence.printingLanguage, identityVerified:true} : null,
    tcgplayerQuote: tcgplayer && evidence ? {...tcgplayer, printingLanguage:evidence.printingLanguage, identityVerified:true} : undefined,
    ...getPriceStats(pricing),
    quotes: verified ? collectMarketPriceQuotes(pricing, card.language, observedAt).filter(quote => quote.variant === evidence.variant && (quote.source === 'cardmarket' || card.language === 'en')).map(quote => ({...quote, printingLanguage: evidence.printingLanguage, identityVerified: true as const})) : [],
    verification: verified ? 'verified' as const : 'unverified' as const,
  }
}
export const UNVERIFIED_PRICE_MESSAGE = 'Prix non vérifié pour cette édition et cette langue. Renseigne un prix personnel ou consulte les annonces filtrées.'
