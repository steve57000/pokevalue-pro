import type { ExternalCard } from './cards'
import { collectMarketPriceQuotes, getPriceStats, selectCardmarketPrice, selectTcgplayerPrice, type MarketPriceQuote, type PriceReference, type TcgPlayerQuote } from './pricing'
import { reviewedMarketData } from './reviewedPrices'

type LocalizedMarketData = ReturnType<typeof getPriceStats> & {
  price: PriceReference | null
  tcgplayerQuote?: TcgPlayerQuote
  quotes: MarketPriceQuote[]
  verification: 'verified' | 'unverified'
}

/** A catalogue match supplies an estimate, not proof of the printing language. */
export function localizedMarketData(card: ExternalCard, observedAt = new Date().toISOString(), requested = {id: card.id, language: card.language}): LocalizedMarketData {
  const identityMatches = requested.id === card.id && requested.language === card.language
  const reviewed = identityMatches ? reviewedMarketData(card.id, card.language) : undefined
  if (reviewed) return {...reviewed, tcgplayerQuote: undefined, ...getPriceStats(undefined)}
  const evidence = card.priceVerification
  const verified = requested.id === card.id && requested.language === card.language && evidence?.cardId === card.id && evidence.printingLanguage === card.language
    && evidence.variant === 'normal' && evidence.identityVerified === true
  const supported = ['fr', 'en'].includes(card.language) && !card.id.startsWith('me06-') && !card.id.startsWith('jumbo-')
  const pricing = identityMatches && supported && (!evidence || verified) ? card.pricing : undefined
  const price = selectCardmarketPrice(pricing)
  const tcgplayer = card.language === 'en' ? selectTcgplayerPrice(pricing) : undefined
  return {
    price: price ? {...price, catalogLanguage:card.language, printingLanguage:verified ? evidence!.printingLanguage : 'unknown' as const, identityVerified:verified, aggregator:'tcgdex' as const} : null,
    tcgplayerQuote: tcgplayer ? {...tcgplayer, printingLanguage:verified ? evidence!.printingLanguage : 'unknown' as const, identityVerified:verified} : undefined,
    ...getPriceStats(pricing),
    quotes: collectMarketPriceQuotes(pricing, card.language, observedAt).filter(quote => quote.variant === 'normal' && (quote.source === 'cardmarket' || card.language === 'en')).map(quote => ({...quote, printingLanguage: verified ? evidence!.printingLanguage : 'unknown' as const, identityVerified: verified})),
    verification: verified ? 'verified' as const : 'unverified' as const,
  }
}
export const UNVERIFIED_PRICE_MESSAGE = 'Aucune référence de marché disponible pour cette carte. La prochaine actualisation recherchera une nouvelle cote.'
