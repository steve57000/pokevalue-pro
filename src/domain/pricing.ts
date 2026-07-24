import type { TcgDexPricing } from './cards'

export type PriceReference = {
  value: number
  currency: 'EUR'
  label: 'Tendance Cardmarket' | 'Moyenne 30 jours' | 'Moyenne 7 jours' | 'Prix moyen' | 'Prix le plus bas observé'
  provider: 'cardmarket'
  updatedAt?: string
}

const priorities: Array<[keyof NonNullable<TcgDexPricing['cardmarket']>, PriceReference['label']]> = [
  ['trend', 'Tendance Cardmarket'],
  ['avg30', 'Moyenne 30 jours'],
  ['avg7', 'Moyenne 7 jours'],
  ['avg', 'Prix moyen'],
  ['low', 'Prix le plus bas observé'],
]

export function isValidMarketPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function selectCardmarketPrice(pricing?: TcgDexPricing | null): PriceReference | undefined {
  const cardmarket = pricing?.cardmarket
  if (!cardmarket) return undefined

  for (const [field, label] of priorities) {
    const value = cardmarket[field]
    if (isValidMarketPrice(value)) {
      return { value, currency: 'EUR', label, provider: 'cardmarket', updatedAt: cardmarket.updatedAt ?? undefined }
    }
  }

  return undefined
}

export function getInternalTrend(pricing?: TcgDexPricing | null): 'up' | 'stable' | 'down' | undefined {
  const cardmarket = pricing?.cardmarket
  if (!isValidMarketPrice(cardmarket?.avg7) || !isValidMarketPrice(cardmarket?.avg30)) return undefined
  const variation = ((cardmarket.avg7 - cardmarket.avg30) / cardmarket.avg30) * 100
  if (variation >= 5) return 'up'
  if (variation <= -5) return 'down'
  return 'stable'
}
