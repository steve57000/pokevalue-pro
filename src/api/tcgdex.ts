import type { CardDataProvider, ExternalCard } from '../domain/cards'
import { getCached, setCached } from '../utils/cache'
import { normalizeApiDate } from '../utils/dates'

const BASE_URL = 'https://api.tcgdex.net/v2'
const REQUEST_TIMEOUT_MS = 8000
const pendingRequests = new Map<string, Promise<ExternalCard>>()

export function buildTcgDexImageUrl(image: string | undefined, quality: 'low' | 'high'): string | undefined {
  if (!image) return undefined
  return `${image}/${quality}.webp`
}

type TcgDexCardResponse = {
  id: string
  name: string
  localId?: string
  rarity?: string
  image?: string
  set?: { name?: string }
  updated?: string
  pricing?: ExternalCard['pricing']
}

export class TcgDexProvider implements CardDataProvider {
  async getCard(id: string, language = 'fr'): Promise<ExternalCard> {
    const key = `${language}:card:${id}`
    const cached = getCached<ExternalCard>(key)
    if (cached?.isFresh) return cached.data

    const requestKey = `${language}:${id}`
    const existing = pendingRequests.get(requestKey)
    if (existing) return existing

    const request = this.fetchCard(id, language)
      .then((card) => {
        setCached(key, card)
        return card
      })
      .catch((error) => {
        if (cached?.isStale) return { ...cached.data, fromStaleCache: true }
        throw error
      })
      .finally(() => pendingRequests.delete(requestKey))

    pendingRequests.set(requestKey, request)
    return request
  }

  private async fetchCard(id: string, language: string): Promise<ExternalCard> {
    const controller = new AbortController()
    const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(`${BASE_URL}/${language}/cards/${encodeURIComponent(id)}`, { signal: controller.signal })
      if (!response.ok) throw new Error(`TCGdex a répondu ${response.status}`)
      const data = (await response.json()) as TcgDexCardResponse
      return {
        id: data.id,
        name: data.name,
        setName: data.set?.name,
        localId: data.localId,
        rarity: data.rarity,
        image: data.image,
        language,
        updatedAt: normalizeApiDate(data.pricing?.cardmarket?.updatedAt ?? data.updated),
        pricing: data.pricing,
      }
    } finally {
      globalThis.clearTimeout(timeout)
    }
  }
}

export const tcgDexProvider = new TcgDexProvider()
