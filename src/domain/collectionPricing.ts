import type { PriceSnapshot } from './priceHistory'
import { isValidMarketPrice, isVerifiedLocalQuote, preferPriceReference, type PriceReference } from './pricing'

export const priceIdentityKey = (cardId: string, language: string) => `${language}:${cardId}`
export const indicativePriceLabel = (point: PriceSnapshot) => point.identityVerified === true ? 'dernier relevé connu, à actualiser' : 'estimation Cardmarket multilingue'

/** Prefer the source observation date; importing a backup does not refresh a price. */
export function priceObservationTime(point: PriceSnapshot) {
  return Date.parse(point.sourceUpdatedAt ?? point.recordedAt ?? point.date)
}

export function isNewerPriceSnapshot(point: PriceSnapshot, previous?: PriceSnapshot) {
  return preferPriceReference(priceReferenceFromSnapshot(point), previous ? priceReferenceFromSnapshot(previous) : undefined)
}

/** Valuation accepts dated offers and sale averages too; chart eligibility is narrower. */
export function latestCollectionReferences(snapshots: PriceSnapshot[], kind: 'all' | 'verified' | 'indicative' = 'all') {
  const latest = new Map<string, PriceSnapshot>()
  for (const point of snapshots) {
    if (!['fr', 'en'].includes(point.language) || point.source !== 'cardmarket'
      || point.market !== 'cardmarket-europe' || point.currency !== 'EUR'
      || point.variant !== 'normal' || !isValidMarketPrice(point.value)) continue
    const verified = isVerifiedLocalQuote(point, point.language)
    if (kind === 'verified' && !verified || kind === 'indicative' && verified) continue
    // Known wrong Delta product mappings remain excluded, even as estimates.
    if (!verified && (point.identityVerified === true || point.printingLanguage !== 'unknown' || point.cardId.startsWith('me06-'))) continue
    if (!['guide', 'listing', 'completed-sale'].includes(point.basis) && point.metric !== 'legacy-reference') continue
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
    value: point.value, currency: 'EUR', provider: 'cardmarket', label, basis: point.basis, catalogLanguage: point.language,
    identityVerified: point.identityVerified, printingLanguage: point.printingLanguage,
    condition: point.condition === 'near-mint' ? 'near-mint' : 'unknown',
    aggregator: point.aggregator === 'tcgdex' || point.aggregator === 'manakodex' ? point.aggregator : undefined,
    updatedAt: point.sourceUpdatedAt ?? point.recordedAt ?? point.date,
    sourceUrl: point.sourceUrl, listingUrl: point.listingUrl, validUntil: point.validUntil,
  }
}
