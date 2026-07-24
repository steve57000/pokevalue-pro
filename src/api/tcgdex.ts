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
const MAX_CONCURRENT_REQUESTS = 6
const pendingRequests = new Map<string, Promise<ExternalCard>>()
const requestQueue: Array<() => void> = []
let activeRequests = 0

async function withRequestSlot<T>(request: () => Promise<T>): Promise<T> {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    await new Promise<void>((resolve) => requestQueue.push(resolve))
  }
  activeRequests += 1
  try {
    return await request()
  } finally {
    activeRequests -= 1
    requestQueue.shift()?.()
  }
}

export function buildTcgDexImageUrl(image: string | undefined, quality: 'low' | 'high'): string | undefined {
  if (!image) return undefined
  return `${image}/${quality}.webp`
}

const POKEMON_TCG_SET_IDS: Record<string, string> = {
  'sm3.5': 'sm35',
  'swsh3.5': 'swsh35',
  'swsh12.5': 'swsh12pt5',
  'swsh12.5gg': 'swsh12pt5gg',
  'sv03.5': 'sv3pt5',
}

export function buildPokemonTcgImageFallback(id: string): ExternalCard['fallbackImage'] {
  const separator = id.lastIndexOf('-')
  if (separator <= 0 || separator === id.length - 1) return undefined

  const tcgDexSetId = id.slice(0, separator)
  const rawLocalId = id.slice(separator + 1)
  const setId = POKEMON_TCG_SET_IDS[tcgDexSetId]
    ?? tcgDexSetId.replace(/^sv0+(\d+)$/, 'sv$1')
  const localId = /^\d+$/.test(rawLocalId) ? String(Number(rawLocalId)) : rawLocalId
  if (!setId || !localId) return undefined

  const base = `https://images.pokemontcg.io/${encodeURIComponent(setId)}/${encodeURIComponent(localId)}`
  return {
    low: `${base}.png`,
    high: `${base}_hires.png`,
    source: 'Pokémon TCG API',
  }
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
  return withRequestSlot(async () => {
    const controller = new AbortController()
    const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) throw new Error(`TCGdex a répondu ${response.status}`)
      return (await response.json()) as T
    } finally {
      globalThis.clearTimeout(timeout)
    }
  })
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

export function buildTcgDexSearchUrls(clues: CardScanClues, language: ScanLanguage): string[] {
  if (clues.localId?.trim()) {
    const url = buildTcgDexSearchUrl(clues, language)
    return url ? [url] : []
  }

  const uniqueNames = new Map<string, string>()
  for (const hint of clues.nameHints) {
    const trimmed = hint.trim()
    const normalized = trimmed.toLocaleLowerCase(language)
    if (trimmed.length >= 3 && !uniqueNames.has(normalized)) uniqueNames.set(normalized, trimmed)
    if (uniqueNames.size >= 4) break
  }

  return [...uniqueNames.values()].map((name) => {
    const params = new URLSearchParams({ name })
    return `${BASE_URL}/${language}/cards?${params.toString()}`
  })
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
      fallbackImage: buildPokemonTcgImageFallback(data.id),
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
  const urls = buildTcgDexSearchUrls(clues, language)
  if (urls.length === 0) return []

  const searchResponses = await Promise.allSettled(urls.map((url) => fetchJson<unknown>(url)))
  const validResponses = searchResponses
    .filter((result): result is PromiseFulfilledResult<unknown> => result.status === 'fulfilled')
    .map((result) => result.value)
    .filter(Array.isArray)

  if (validResponses.length === 0) {
    const firstError = searchResponses.find((result): result is PromiseRejectedResult => result.status === 'rejected')
    if (firstError) throw firstError.reason
    throw new Error('Réponse de recherche TCGdex invalide')
  }

  const uniqueBriefs = new Map<string, TcgDexCardBriefResponse>()
  for (const response of validResponses) {
    for (const item of response) {
      if (!item || typeof item !== 'object') continue
      const candidate = item as Partial<TcgDexCardBriefResponse>
      if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') continue
      uniqueBriefs.set(candidate.id, candidate as TcgDexCardBriefResponse)
    }
  }

  const briefs = [...uniqueBriefs.values()]
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
