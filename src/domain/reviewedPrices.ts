import data from '../data/reviewedDeltaPrices.json'
import type { MarketPriceQuote, PriceReference } from './pricing'

const byId = new Map(data.cards.map(card => [card.id, card]))
export const reviewedPriceCard = (id: string) => byId.get(id)
let pending: Promise<boolean> | undefined
let checkedAt = 0

/** Public, shared feed: no collection data or credentials are sent. */
export function refreshReviewedPrices(force = false): Promise<boolean> {
  if (pending) return pending
  if (!force && Date.now() - checkedAt < 24 * 60 * 60 * 1000) return Promise.resolve(false)
  pending = (async () => {
    let changed = false
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}prices/reviewed-delta.json`, {cache:'no-store', signal:AbortSignal.timeout(8000)})
      if (!response.ok) throw new Error('Relevé partagé indisponible')
      const feed = await response.json() as typeof data
      if (feed.schemaVersion !== 1 || feed.sourceUrl !== data.sourceUrl || !Array.isArray(feed.cards)) throw new Error('Relevé partagé invalide')
      for (const card of feed.cards) {
        const known = byId.get(card.id)
        if (!known || card.marketUrl !== known.marketUrl || card.number !== known.number) continue
        const next = {...known}
        for (const language of ['fr','en'] as const) {
          const quote = card[language], time = Date.parse(quote?.updatedAt)
          if (!quote || !Number.isFinite(quote.value) || quote.value <= 0 || quote.offers < 1 || !Number.isFinite(time) || time > Date.now()) continue
          if (time > Date.parse(known[language].updatedAt)) { next[language] = quote; changed = true }
        }
        byId.set(card.id, next)
      }
      checkedAt = Date.now()
    } catch { checkedAt = Date.now() - 24 * 60 * 60 * 1000 + 5 * 60 * 1000 }
    return changed
  })().finally(() => { pending = undefined })
  return pending
}

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
    sourceUpdatedAt: observation.updatedAt, observedAt: observation.updatedAt,
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
