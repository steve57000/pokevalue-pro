import type { Card } from '../types'

export type ExternalCard = {
  id: string
  name: string
  setName?: string
  setOfficialCount?: number
  setTotalCount?: number
  localId?: string
  rarity?: string
  image?: string
  fallbackImage?: {
    low: string
    high: string
    source: 'Pokémon TCG API'
  }
  language: string
  updatedAt?: string
  pricing?: TcgDexPricing
  fromStaleCache?: boolean
}

export type TcgDexPricing = {
  cardmarket?: {
    updatedAt?: string | null
    trend?: number | null
    avg30?: number | null
    avg7?: number | null
    avg?: number | null
    low?: number | null
    avg1?: number | null
    reverseHoloTrend?: number | null
    reverseHoloAvg30?: number | null
  } | null
  tcgplayer?: {
    updatedAt?: string | null
    lowPrice?: number | null
    midPrice?: number | null
    highPrice?: number | null
    marketPrice?: number | null
  } | null
}

export interface CardDataProvider {
  getCard(id: string, language?: string): Promise<ExternalCard>
}

export type LiveCardState = {
  card: Card
  live?: ExternalCard
  status: 'idle' | 'loading' | 'success' | 'error'
  error?: string
  fromStaleCache?: boolean
  retry: () => void
}
