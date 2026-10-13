import type { TcgDexPricing, TcgPlayerVariantPricing } from './cards'

export type PriceBasis = 'listing' | 'guide' | 'completed-sale' | 'unknown'
export type QuoteAggregation = 'single' | 'aggregate' | 'unknown'
export type QuoteVariant = 'normal' | 'holofoil' | 'reverse-holofoil' | 'unknown'
export type PrintingLanguage = 'fr' | 'en' | 'ja' | 'zh-tw' | 'unknown'

/** A provider observation. Catalog language is kept separate from the card's actual print language. */
export type MarketPriceQuote = {
  value: number
  source: 'cardmarket' | 'tcgplayer'
  aggregator: 'tcgdex'
  market: 'cardmarket-europe' | 'tcgplayer-north-america'
  currency: string
  catalogLanguage: string
  printingLanguage: PrintingLanguage
  variant: QuoteVariant
  condition: 'unknown'
  basis: PriceBasis
  aggregation: QuoteAggregation
  metric: string
  primary: boolean
  externalProductId?: string
  sourceUpdatedAt?: string
  observedAt: string
}

export type PriceReference = {
  value: number
  currency: 'EUR'
  label: 'Annonce la moins chère Cardmarket' | 'Tendance Cardmarket' | 'Moyenne des ventes 30 jours' | 'Moyenne des ventes 7 jours' | 'Moyenne des ventes 1 jour' | 'Prix de vente moyen Cardmarket'
  provider: 'cardmarket'
  basis?: PriceBasis
  updatedAt?: string
}

export type TcgPlayerQuote = {
  value: number
  currency: 'USD'
  label: 'Marché TCGplayer' | 'Prix intermédiaire TCGplayer' | 'Prix bas TCGplayer'
  provider: 'tcgplayer'
  region: 'Amérique du Nord'
  basis?: PriceBasis
  updatedAt?: string
}

const priorities: Array<[keyof NonNullable<TcgDexPricing['cardmarket']>, PriceReference['label'], PriceBasis]> = [
  ['trend', 'Tendance Cardmarket', 'guide'],
  ['avg7', 'Moyenne des ventes 7 jours', 'completed-sale'],
  ['avg30', 'Moyenne des ventes 30 jours', 'completed-sale'],
  ['avg1', 'Moyenne des ventes 1 jour', 'completed-sale'],
  ['avg', 'Prix de vente moyen Cardmarket', 'completed-sale'],
  ['low', 'Annonce la moins chère Cardmarket', 'listing'],
]

export const isAsianCatalogLanguage = (language: string) => language === 'ja' || language === 'zh-tw'

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

  for (const [field, label, basis] of priorities) {
    const value = cardmarket[field]
    if (isValidMarketPrice(value)) {
      return {
        value,
        currency: 'EUR',
        label,
        provider: 'cardmarket',
        basis,
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
  const selected = selectTcgplayerMetric(variantData)
  if (!selected || !isValidMarketPrice(selected.value)) return undefined
  return {
    value: selected.value,
    currency: currencyCode(tcgplayer.unit, 'USD') as 'USD',
    label: selected.label,
    provider: 'tcgplayer',
    region: 'Amérique du Nord',
    basis: selected.basis,
    updatedAt: pricingDate(tcgplayer.updatedAt ?? tcgplayer.updated),
  }
}

type TcgPlayerMetric = { value: number; metric: 'marketPrice' | 'midPrice' | 'lowPrice'; label: TcgPlayerQuote['label']; basis: PriceBasis }
function selectTcgplayerMetric(prices?: TcgPlayerVariantPricing | null): TcgPlayerMetric | undefined {
  const candidates: Array<{ value?: number | null; metric: TcgPlayerMetric['metric']; label: TcgPlayerQuote['label']; basis: PriceBasis }> = [
    { value: prices?.marketPrice, metric: 'marketPrice', label: 'Marché TCGplayer', basis: 'guide' },
    { value: prices?.midPrice, metric: 'midPrice', label: 'Prix intermédiaire TCGplayer', basis: 'guide' },
    { value: prices?.lowPrice, metric: 'lowPrice', label: 'Prix bas TCGplayer', basis: 'listing' },
  ]
  const selected = candidates.find(candidate => isValidMarketPrice(candidate.value))
  return selected && isValidMarketPrice(selected.value)
    ? { value: selected.value, metric: selected.metric, label: selected.label, basis: selected.basis }
    : undefined
}

function currencyCode(value: string | null | undefined, fallback: string): string {
  return value && /^[A-Z]{3}$/.test(value) ? value : fallback
}

function externalProductId(value: number | string | null | undefined): string | undefined {
  return value === undefined || value === null || value === '' ? undefined : String(value)
}

function selectCardmarketMetrics(
  cardmarket: NonNullable<TcgDexPricing['cardmarket']> | null | undefined,
  fields: Array<{ field: string; metric: string }>,
): Array<{ value: number; metric: string }> {
  if (!cardmarket) return []
  const values: Array<{ value: number; metric: string }> = []
  for (const candidate of fields) {
    const value = (cardmarket as Record<string, unknown>)[candidate.field]
    if (isValidMarketPrice(value)) values.push({ value, metric: candidate.metric })
  }
  return values
}

function cardmarketMetricBasis(metric: string): PriceBasis {
  if (metric.startsWith('avg') || metric.startsWith('average') || metric === 'reverse-holo-average-30d') return 'completed-sale'
  if (metric === 'low' || metric === 'low-holo') return 'listing'
  return 'guide'
}

/**
 * Returns every numeric provider metric for each available finish. TCGdex
 * supplies summary fields, not individual listing or transaction rows. Current
 * offer summaries, sale-window averages, and guides retain distinct bases.
 */
export function collectMarketPriceQuotes(
  pricing: TcgDexPricing | null | undefined,
  catalogLanguage: string,
  observedAt = new Date().toISOString(),
): MarketPriceQuote[] {
  if (!pricing) return []
  const quotes: MarketPriceQuote[] = []
  const cardmarket = pricing.cardmarket
  const cardmarketVariants: Array<{
    variant: QuoteVariant
    fields: Array<{ field: string; metric: string }>
  }> = [
    { variant: 'normal', fields: [
      { field: 'trend', metric: 'trend' }, { field: 'avg7', metric: 'avg7' },
      { field: 'avg30', metric: 'avg30' }, { field: 'avg1', metric: 'avg1' },
      { field: 'avg', metric: 'average' }, { field: 'low', metric: 'low' },
    ] },
    { variant: 'holofoil', fields: [
      { field: 'trend-holo', metric: 'trend-holo' }, { field: 'avg7-holo', metric: 'avg7-holo' },
      { field: 'avg30-holo', metric: 'avg30-holo' }, { field: 'avg1-holo', metric: 'avg1-holo' },
      { field: 'avg-holo', metric: 'average-holo' }, { field: 'low-holo', metric: 'low-holo' },
    ] },
    { variant: 'reverse-holofoil', fields: [
      { field: 'reverseHoloTrend', metric: 'reverse-holo-trend' },
      { field: 'reverseHoloAvg30', metric: 'reverse-holo-average-30d' },
    ] },
  ]
  for (const { variant, fields } of cardmarketVariants) {
    const metrics = selectCardmarketMetrics(cardmarket, fields)
    metrics.forEach((metric, index) => quotes.push({
      value: metric.value,
      source: 'cardmarket',
      aggregator: 'tcgdex',
      market: 'cardmarket-europe',
      currency: currencyCode(cardmarket?.unit, 'EUR'),
      catalogLanguage,
      printingLanguage: 'unknown',
      variant,
      condition: 'unknown',
      basis: cardmarketMetricBasis(metric.metric),
      aggregation: 'aggregate',
      metric: metric.metric,
      primary: index === 0,
      externalProductId: externalProductId(cardmarket?.idProduct),
      sourceUpdatedAt: pricingDate(cardmarket?.updatedAt ?? cardmarket?.updated),
      observedAt,
    }))
  }

  const tcgplayer = pricing.tcgplayer
  if (tcgplayer) {
    const variantDefinitions: Array<{ name: QuoteVariant; data?: TcgPlayerVariantPricing | null }> = [
      { name: 'normal', data: tcgplayer.normal ?? tcgplayer },
      { name: 'holofoil', data: tcgplayer.holofoil },
      { name: 'reverse-holofoil', data: tcgplayer['reverse-holofoil'] ?? tcgplayer.reverse },
    ]
    for (const { name, data } of variantDefinitions) {
      if (!data) continue
      const primaryMetric = selectTcgplayerMetric(data)?.metric
      const productId = data?.productId ?? tcgplayer.productId
      const candidateMetrics: Array<{ metric: string; value?: number | null; basis: PriceBasis }> = [
        { metric: 'marketPrice', value: data.marketPrice, basis: 'guide' },
        { metric: 'midPrice', value: data.midPrice, basis: 'guide' },
        { metric: 'lowPrice', value: data.lowPrice, basis: 'listing' },
        { metric: 'highPrice', value: data.highPrice, basis: 'listing' },
        { metric: 'directLowPrice', value: data.directLowPrice, basis: 'listing' },
      ]
      candidateMetrics.filter(metric => isValidMarketPrice(metric.value)).forEach(metric => {
        if (!isValidMarketPrice(metric.value)) return
        quotes.push({
          value: metric.value,
          source: 'tcgplayer',
          aggregator: 'tcgdex',
          market: 'tcgplayer-north-america',
          currency: currencyCode(tcgplayer.unit, 'USD'),
          catalogLanguage,
          printingLanguage: 'unknown',
          variant: name,
          condition: 'unknown',
          basis: metric.basis,
          aggregation: 'aggregate',
          metric: metric.metric,
          primary: metric.metric === primaryMetric,
          externalProductId: externalProductId(productId),
          sourceUpdatedAt: pricingDate(tcgplayer.updatedAt ?? tcgplayer.updated),
          observedAt,
        })
      })
    }
  }
  return quotes
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
