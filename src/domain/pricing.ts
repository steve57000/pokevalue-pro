import type { TcgDexPricing } from './cards'

export type PriceReference = {
  value: number
  currency: 'EUR'
  label: 'Prix bas Cardmarket' | 'Tendance Cardmarket' | 'Moyenne 30 jours' | 'Moyenne 7 jours' | 'Prix moyen'
  provider: 'cardmarket'
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

export type CardMarketStats = {
  currency:'EUR'; source:'cardmarket'; updatedAt?:string; current?:number; trend?:number; avg?:number; avg1?:number; avg7?:number; avg30?:number; low?:number; reverseHoloTrend?:number; reverseHoloAvg30?:number
}
export type TcgPlayerStats = {currency:'USD';source:'tcgplayer';updatedAt?:string;low?:number;mid?:number;high?:number;market?:number}
export function getPriceStats(pricing?:TcgDexPricing|null):{cardmarket?:CardMarketStats;tcgplayer?:TcgPlayerStats}{
 const cm=pricing?.cardmarket, tp=pricing?.tcgplayer
 return {cardmarket:cm?{currency:'EUR',source:'cardmarket',updatedAt:cm.updatedAt??undefined,current:selectCardmarketPrice(pricing)?.value,trend:cm.trend??undefined,avg:cm.avg??undefined,avg1:cm.avg1??undefined,avg7:cm.avg7??undefined,avg30:cm.avg30??undefined,low:cm.low??undefined,reverseHoloTrend:cm.reverseHoloTrend??undefined,reverseHoloAvg30:cm.reverseHoloAvg30??undefined}:undefined,tcgplayer:tp?{currency:'USD',source:'tcgplayer',updatedAt:tp.updatedAt??undefined,low:tp.lowPrice??undefined,mid:tp.midPrice??undefined,high:tp.highPrice??undefined,market:tp.marketPrice??undefined}:undefined}
}
