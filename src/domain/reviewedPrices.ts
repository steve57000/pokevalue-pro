import data from '../data/reviewedDeltaPrices.json'
import type { MarketPriceQuote, PriceReference } from './pricing'

const byId = new Map(data.cards.map(card => [card.id, card]))
export const reviewedPriceCard = (id: string) => byId.get(id)

/** Reviewed, dated observations. Never transfer prices by name or across languages. */
export function reviewedMarketData(id: string, language: string) {
  const card = byId.get(id)
  if (!card || (language !== 'fr' && language !== 'en')) return undefined
  const observation = card[language]
  const listingUrl = new URL(card.marketUrl)
  listingUrl.searchParams.set('language', language === 'fr' ? '2' : '1')
  listingUrl.searchParams.set('minCondition', '2')
  const validUntil = new Date(Date.parse(observation.updatedAt) + 14 * 86400000).toISOString()
  const quote: MarketPriceQuote = {
    value: observation.value, source: 'cardmarket', aggregator: 'manakodex',
    market: 'cardmarket-europe', currency: 'EUR', catalogLanguage: language,
    printingLanguage: language, identityVerified: true, variant: 'normal', condition: 'near-mint',
    basis: 'listing', aggregation: 'aggregate', metric: 'lowest-nm-offer', primary: true,
    externalProductId: new URL(card.marketUrl).pathname,
    sourceUpdatedAt: observation.updatedAt, observedAt: data.capturedAt,
    sourceUrl: data.sourceUrl, listingUrl: listingUrl.href, validUntil,
  }
  const price: PriceReference = {
    value: quote.value, currency: 'EUR', provider: 'cardmarket', aggregator: 'manakodex',
    label: 'Annonce la moins chère Cardmarket', basis: 'listing', condition: 'near-mint',
    printingLanguage: language, identityVerified: true, updatedAt: quote.sourceUpdatedAt,
    sourceUrl: quote.sourceUrl, listingUrl: quote.listingUrl, validUntil,
  }
  return { price, quotes: [quote], verification: 'verified' as const }
}
