import type { CardDataProvider, ExternalCard } from '../domain/cards'
import {
  normalizeLocalId,
  scoreScannerCandidate,
  type CardScanClues,
  type ScannerCandidate,
  type ScanLanguage,
} from '../domain/scanner'
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

type TcgDexCardBriefResponse = Pick<TcgDexCardResponse, 'id' | 'name' | 'localId' | 'image'>

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`TCGdex a répondu ${response.status}`)
    return (await response.json()) as T
  } finally {
    globalThis.clearTimeout(timeout)
  }
}

export function buildTcgDexSearchUrl(clues: CardScanClues, language: ScanLanguage): string | undefined {
  const localId = clues.localId?.trim()
  const name = clues.nameHints.find((hint) => hint.trim().length >= 3)?.trim()
  if (!localId && !name) return undefined

  const params = new URLSearchParams()
  if (localId) params.set('localId', localId)
  else if (name) params.set('name', name)
  return `${BASE_URL}/${language}/cards?${params.toString()}`
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
    const data = await fetchJson<TcgDexCardResponse>(`${BASE_URL}/${language}/cards/${encodeURIComponent(id)}`)
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
  }
}

export const tcgDexProvider = new TcgDexProvider()

export async function searchTcgDexCards(
  clues: CardScanClues,
  language: ScanLanguage = 'fr',
): Promise<ScannerCandidate[]> {
  const url = buildTcgDexSearchUrl(clues, language)
  if (!url) return []

  const response = await fetchJson<unknown>(url)
  if (!Array.isArray(response)) throw new Error('Réponse de recherche TCGdex invalide')

  const briefs = response
    .filter((item): item is TcgDexCardBriefResponse => {
      if (!item || typeof item !== 'object') return false
      const candidate = item as Partial<TcgDexCardBriefResponse>
      return typeof candidate.id === 'string' && typeof candidate.name === 'string'
    })
    .filter((candidate) => {
      if (!clues.localId || !candidate.localId) return true
      return normalizeLocalId(candidate.localId) === normalizeLocalId(clues.localId)
    })
    .map((candidate) => ({
      candidate,
      ...scoreScannerCandidate(candidate, clues),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)

  const detailed = await Promise.allSettled(
    briefs.map(async ({ candidate, score, reasons }) => ({
      ...(await tcgDexProvider.getCard(candidate.id, language)),
      matchScore: score,
      matchReasons: reasons,
    })),
  )

  return detailed
    .filter((result): result is PromiseFulfilledResult<ScannerCandidate> => result.status === 'fulfilled')
    .map((result) => result.value)
}
