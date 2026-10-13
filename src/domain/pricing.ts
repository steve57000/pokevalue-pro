import type { TcgDexPricing, TcgPlayerVariantPricing } from './cards'

export type PriceReference = {
  value: number
  currency: 'EUR'
  label: 'Prix bas Cardmarket' | 'Tendance Cardmarket' | 'Moyenne 30 jours' | 'Moyenne 7 jours' | 'Prix moyen'
  provider: 'cardmarket'
  updatedAt?: string
}

export type TcgPlayerQuote = {
  value: number
  currency: 'USD'
  label: 'Prix du marché TCGplayer'
  provider: 'tcgplayer'
  region: 'Amérique du Nord'
  updatedAt?: string
}

const priorities: Array<[keyof NonNullable<TcgDexPricing['cardmarket']>, PriceReference['label']]> = [
  ['trend', 'Tendance Cardmarket'],
  ['avg7', 'Moyenne 7 jours'],
  ['avg30', 'Moyenne 30 jours'],
  ['avg', 'Prix moyen'],
  ['low', 'Prix bas Cardmarket'],
]

export function isValidMarketPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function pricingDate(value: string | number | null | undefined): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value > 1_000_000_000_000 ? value : value * 1000)
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
  }
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

export function selectCardmarketPrice(pricing?: TcgDexPricing | null): PriceReference | undefined {
  const cardmarket = pricing?.cardmarket
  if (!cardmarket) return undefined

  for (const [field, label] of priorities) {
    const value = cardmarket[field]
    if (isValidMarketPrice(value)) {
      return {
        value,
        currency: 'EUR',
        label,
        provider: 'cardmarket',
        updatedAt: pricingDate(cardmarket.updatedAt ?? cardmarket.updated),
      }
    }
  }

  return undefined
}

export function selectTcgplayerPrice(pricing?: TcgDexPricing | null, variant: 'normal' | 'holofoil' | 'reverse-holofoil' = 'normal'): TcgPlayerQuote | undefined {
  const tcgplayer = pricing?.tcgplayer
  if (!tcgplayer) return undefined
  const variantData: TcgPlayerVariantPricing | undefined = variant === 'normal'
    ? tcgplayer.normal ?? tcgplayer
    : variant === 'holofoil'
      ? tcgplayer.holofoil ?? undefined
      : tcgplayer['reverse-holofoil'] ?? tcgplayer.reverse ?? undefined
  const value = variantData?.marketPrice
  if (!isValidMarketPrice(value)) return undefined
  return {
    value,
    currency: 'USD',
    label: 'Prix du marché TCGplayer',
    provider: 'tcgplayer',
    region: 'Amérique du Nord',
    updatedAt: pricingDate(tcgplayer.updatedAt ?? tcgplayer.updated),
  }
}

export function getInternalTrend(pricing?: TcgDexPricing | null): 'up' | 'stable' | 'down' | undefined {
  const cardmarket = pricing?.cardmarket
  if (!isValidMarketPrice(cardmarket?.avg7) || !isValidMarketPrice(cardmarket?.avg30)) return undefined
  const variation = ((cardmarket.avg7 - cardmarket.avg30) / cardmarket.avg30) * 100
  if (variation >= 5) return 'up'
  if (variation <= -5) return 'down'
  return 'stable'
}

export type CardMarketStats = {
  currency: 'EUR'
  source: 'cardmarket'
  updatedAt?: string
  current?: number
  trend?: number
  avg?: number
  avg1?: number
  avg7?: number
  avg30?: number
  low?: number
  trendHolo?: number
  avgHolo?: number
  avg1Holo?: number
  avg7Holo?: number
  avg30Holo?: number
  lowHolo?: number
  reverseHoloTrend?: number
  reverseHoloAvg30?: number
}
export type TcgPlayerStats = {
  currency: 'USD'
  source: 'tcgplayer'
  region: 'Amérique du Nord'
  variant: 'normal' | 'holofoil' | 'reverse-holofoil'
  updatedAt?: string
  low?: number
  mid?: number
  high?: number
  market?: number
  directLow?: number
}

function tcgPlayerVariant(tcgplayer: NonNullable<TcgDexPricing['tcgplayer']>, variant: TcgPlayerStats['variant']): TcgPlayerVariantPricing | undefined {
  if (variant === 'normal') return tcgplayer.normal ?? tcgplayer
  if (variant === 'holofoil') return tcgplayer.holofoil ?? undefined
  return tcgplayer['reverse-holofoil'] ?? tcgplayer.reverse ?? undefined
}

function tcgPlayerStats(tcgplayer: NonNullable<TcgDexPricing['tcgplayer']> | null | undefined, variant: TcgPlayerStats['variant']): TcgPlayerStats | undefined {
  if (!tcgplayer) return undefined
  const prices = tcgPlayerVariant(tcgplayer, variant)
  if (!prices) return undefined
  return {
    currency: 'USD',
    source: 'tcgplayer',
    region: 'Amérique du Nord',
    variant,
    updatedAt: pricingDate(tcgplayer.updatedAt ?? tcgplayer.updated),
    low: prices.lowPrice ?? undefined,
    mid: prices.midPrice ?? undefined,
    high: prices.highPrice ?? undefined,
    market: prices.marketPrice ?? undefined,
    directLow: prices.directLowPrice ?? undefined,
  }
}

export function getPriceStats(pricing?: TcgDexPricing | null): {
  cardmarket?: CardMarketStats
  tcgplayer?: TcgPlayerStats
  tcgplayerHolo?: TcgPlayerStats
  tcgplayerReverse?: TcgPlayerStats
} {
  const cm = pricing?.cardmarket
  const tcgplayer = pricing?.tcgplayer
  const selected = selectCardmarketPrice(pricing)
  return {
    cardmarket: cm ? {
      currency: 'EUR',
      source: 'cardmarket',
      updatedAt: pricingDate(cm.updatedAt ?? cm.updated),
      current: selected?.value,
      trend: cm.trend ?? undefined,
      avg: cm.avg ?? undefined,
      avg1: cm.avg1 ?? undefined,
      avg7: cm.avg7 ?? undefined,
      avg30: cm.avg30 ?? undefined,
      low: cm.low ?? undefined,
      trendHolo: cm['trend-holo'] ?? undefined,
      avgHolo: cm['avg-holo'] ?? undefined,
      avg1Holo: cm['avg1-holo'] ?? undefined,
      avg7Holo: cm['avg7-holo'] ?? undefined,
      avg30Holo: cm['avg30-holo'] ?? undefined,
      lowHolo: cm['low-holo'] ?? undefined,
      reverseHoloTrend: cm.reverseHoloTrend ?? undefined,
      reverseHoloAvg30: cm.reverseHoloAvg30 ?? undefined,
    } : undefined,
    tcgplayer: tcgPlayerStats(tcgplayer, 'normal'),
    tcgplayerHolo: tcgPlayerStats(tcgplayer, 'holofoil'),
    tcgplayerReverse: tcgPlayerStats(tcgplayer, 'reverse-holofoil'),
  }
}
