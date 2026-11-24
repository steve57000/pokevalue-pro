import type { PriceSnapshot } from './priceHistory'
import { isValidMarketPrice, isVerifiedLocalQuote, type PriceReference } from './pricing'

export const priceIdentityKey = (cardId: string, language: string) => `${language}:${cardId}`
export const indicativePriceLabel = (point: PriceSnapshot) => point.identityVerified === true ? 'relevé ancien vérifié' : 'édition et langue non vérifiées'

/** Prefer the source observation date; importing a backup does not refresh a price. */
export function priceObservationTime(point: PriceSnapshot) {
  return Date.parse(point.sourceUpdatedAt ?? point.recordedAt ?? point.date)
}

export function isNewerPriceSnapshot(point: PriceSnapshot, previous?: PriceSnapshot) {
  if (!previous) return true
  const time = priceObservationTime(point) - priceObservationTime(previous)
  if (time !== 0) return time > 0
  return JSON.stringify(point).localeCompare(JSON.stringify(previous)) > 0
}

/** Valuation accepts dated offers and sale averages too; chart eligibility is narrower. */
export function latestCollectionReferences(snapshots: PriceSnapshot[], kind: 'verified' | 'indicative' = 'verified') {
  const latest = new Map<string, PriceSnapshot>()
  for (const point of snapshots) {
    if (!['fr', 'en'].includes(point.language) || point.source !== 'cardmarket'
      || point.market !== 'cardmarket-europe' || point.currency !== 'EUR'
      || point.variant !== 'normal' || !isValidMarketPrice(point.value)) continue
    if (kind === 'verified') {
      if (!isVerifiedLocalQuote(point, point.language) || !['guide', 'listing', 'completed-sale'].includes(point.basis)) continue
    } else {
      // The previous Delta feed mapped expensive secret cards to common products.
      // Even an indicative subtotal must not revive those known bad mappings.
      if (point.identityVerified === true || point.printingLanguage !== 'unknown' || point.cardId.startsWith('me06-')
        || !(point.basis === 'guide' || point.basis === 'unknown' && point.metric === 'legacy-reference')) continue
    }
    const key = priceIdentityKey(point.cardId, point.language)
    if (isNewerPriceSnapshot(point, latest.get(key))) latest.set(key, point)
  }
  return latest
}

export function priceReferenceFromSnapshot(point: PriceSnapshot): PriceReference {
  const label: PriceReference['label'] = point.basis === 'listing' ? 'Annonce la moins chère Cardmarket'
    : point.basis === 'completed-sale' ? ({ avg1: 'Moyenne des ventes 1 jour', avg7: 'Moyenne des ventes 7 jours', avg30: 'Moyenne des ventes 30 jours' } as const)[point.metric as 'avg1' | 'avg7' | 'avg30'] ?? 'Prix de vente moyen Cardmarket'
      : 'Tendance Cardmarket'
  return {
    value: point.value, currency: 'EUR', provider: 'cardmarket', label, basis: point.basis,
    identityVerified: point.identityVerified, printingLanguage: point.printingLanguage,
    condition: point.condition === 'near-mint' ? 'near-mint' : 'unknown',
    aggregator: point.aggregator === 'tcgdex' || point.aggregator === 'manakodex' ? point.aggregator : undefined,
    updatedAt: point.sourceUpdatedAt ?? point.recordedAt ?? point.date,
    sourceUrl: point.sourceUrl, listingUrl: point.listingUrl, validUntil: point.validUntil,
  }
}
