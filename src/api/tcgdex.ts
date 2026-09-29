import type { CardDataProvider, ExternalCard } from '../domain/cards'
import {
  combineScannerScores,
  MIN_TEXT_MATCH_SCORE,
  scoreScannerCandidate,
  type CardLanguage,
  type CardScanClues,
  type ScannerCandidate,
  type ScanLanguage,
} from '../domain/scanner'
import { compareCardImageToCandidates } from '../services/cardVisualMatcher'
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
  set?: {
    name?: string
    cardCount?: {
      official?: number
      total?: number
    }
  }
  updated?: string
  pricing?: ExternalCard['pricing']
}

type TcgDexCardBriefResponse = Pick<TcgDexCardResponse, 'id' | 'name' | 'localId' | 'image'>

type TcgDexSearchRequest = {
  language: CardLanguage
  url: string
}

export type CardSearchOptions = {
  image?: Blob
}

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

export function buildTcgDexSearchUrl(clues: CardScanClues, language: CardLanguage): string | undefined {
  const localId = clues.localId?.trim()
  const name = clues.nameHints.find((hint) => hint.trim().length >= 3)?.trim()
  if (!localId && !name) return undefined

  const params = new URLSearchParams()
  if (localId) params.set('localId', localId)
  else if (name) params.set('name', name)
  return `${BASE_URL}/${language}/cards?${params.toString()}`
}

export function buildTcgDexSearchUrls(clues: CardScanClues, language: CardLanguage): string[] {
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

export function getTcgDexSearchLanguages(language: ScanLanguage): CardLanguage[] {
  if (language === 'fr') return ['fr', 'en', 'ja', 'zh-cn']
  if (language === 'en') return ['en', 'fr', 'ja', 'zh-cn']
  if (language === 'ja') return ['ja', 'en', 'fr', 'zh-cn']
  if (language === 'zh-cn') return ['zh-cn', 'ja', 'en', 'fr']
  return ['fr', 'en', 'ja', 'zh-cn']
}

export function buildTcgDexSearchRequests(
  clues: CardScanClues,
  language: ScanLanguage,
): TcgDexSearchRequest[] {
  const requests: TcgDexSearchRequest[] = []
  for (const cardLanguage of getTcgDexSearchLanguages(language)) {
    if (clues.localId?.trim()) {
      const params = new URLSearchParams({ localId: clues.localId.trim() })
      requests.push({
        language: cardLanguage,
        url: `${BASE_URL}/${cardLanguage}/cards?${params.toString()}`,
      })
    }

    const nameOnlyClues = { ...clues, localId: undefined }
    for (const url of buildTcgDexSearchUrls(nameOnlyClues, cardLanguage)) {
      requests.push({ language: cardLanguage, url })
    }
  }
  return requests
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
      setOfficialCount: data.set?.cardCount?.official,
      setTotalCount: data.set?.cardCount?.total,
      localId: data.localId,
      rarity: data.rarity,
      image: data.image,
      fallbackImage: buildPokemonTcgImageFallback(data.id),
      language,
      updatedAt: normalizeApiDate(data.pricing?.cardmarket?.updatedAt ?? (data.pricing?.cardmarket as { updated?: string } | undefined)?.updated ?? data.updated),
      pricing: data.pricing?.cardmarket ? { ...data.pricing, cardmarket: { ...data.pricing.cardmarket, updatedAt: data.pricing.cardmarket.updatedAt ?? (data.pricing.cardmarket as { updated?: string }).updated } } : data.pricing,
    }
  }
}

export const tcgDexProvider = new TcgDexProvider()

export async function searchTcgDexCards(
  clues: CardScanClues,
  language: ScanLanguage = 'fr',
  options: CardSearchOptions = {},
): Promise<ScannerCandidate[]> {
  const requests = buildTcgDexSearchRequests(clues, language)
  if (requests.length === 0) return []

  const uniqueRequests = [...new Map(requests.map((request) => [`${request.language}:${request.url}`, request])).values()]

  const searchResponses = await Promise.allSettled(
    uniqueRequests.map(async (request) => ({
      ...request,
      data: await fetchJson<unknown>(request.url),
    })),
  )
  const validResponses = searchResponses
    .filter((result): result is PromiseFulfilledResult<TcgDexSearchRequest & { data: unknown }> =>
      result.status === 'fulfilled')
    .map((result) => result.value)
    .filter((result): result is TcgDexSearchRequest & { data: unknown[] } =>
      Array.isArray(result.data))

  if (validResponses.length === 0) {
    const firstError = searchResponses.find((result): result is PromiseRejectedResult => result.status === 'rejected')
    if (firstError) throw firstError.reason
    throw new Error('Réponse de recherche TCGdex invalide')
  }

  const uniqueBriefs = new Map<string, {
    candidate: TcgDexCardBriefResponse
    language: CardLanguage
    score: number
    reasons: string[]
  }>()
  for (const response of validResponses) {
    for (const item of response.data) {
      if (!item || typeof item !== 'object') continue
      const candidate = item as Partial<TcgDexCardBriefResponse>
      if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') continue
      const typedCandidate = candidate as TcgDexCardBriefResponse
      const textMatch = scoreScannerCandidate(typedCandidate, clues)
      if (textMatch.score < MIN_TEXT_MATCH_SCORE) continue

      const existing = uniqueBriefs.get(typedCandidate.id)
      if (!existing || textMatch.score > existing.score) {
        uniqueBriefs.set(typedCandidate.id, {
          candidate: typedCandidate,
          language: response.language,
          score: textMatch.score,
          reasons: textMatch.reasons,
        })
      }
    }
  }

  const briefs = [...uniqueBriefs.values()]
  if (briefs.length === 0) return []

  let visualMatches = new Map<string, number>()
  if (options.image) {
    try {
      visualMatches = await compareCardImageToCandidates(
        options.image,
        briefs.map(({ candidate }) => ({
          id: candidate.id,
          imageUrl: buildTcgDexImageUrl(candidate.image, 'low'),
        })),
      )
    } catch {
      // OCR and manual confirmation remain available if CORS or canvas blocks comparison.
    }
  }

  const rankedBriefs = briefs
    .map((brief) => {
      const visualScore = visualMatches.get(brief.candidate.id)
      const combined = combineScannerScores(brief.score, visualScore)
      return {
        ...brief,
        visualScore,
        combinedScore: combined.score,
        visualReason: combined.visualReason,
      }
    })
    .sort((left, right) =>
      right.combinedScore - left.combinedScore
      || (right.visualScore ?? -1) - (left.visualScore ?? -1)
      || right.score - left.score)
    .slice(0, 12)

  const detailed = await Promise.allSettled(
    rankedBriefs.map(async ({
      candidate,
      language: candidateLanguage,
      visualScore,
    }) => {
      const card = await tcgDexProvider.getCard(candidate.id, candidateLanguage)
      const textMatch = scoreScannerCandidate(card, clues)
      const combined = combineScannerScores(textMatch.score, visualScore, textMatch.breakdown, textMatch.contradictions)
      return {
        ...card,
        matchScore: combined.score,
        textMatchScore: textMatch.score,
        visualMatchScore: visualScore,
        matchReasons: [
          ...textMatch.reasons,
          ...(combined.visualReason ? [combined.visualReason] : []),
        ],
        scoreBreakdown: combined.breakdown,
        contradictions: combined.contradictions,
        reliability: combined.score >= 72 && combined.contradictions.length === 0 ? 'recognized' as const : 'ambiguous' as const,
      }
    }),
  )

  return detailed
    .flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
    .filter((candidate) => candidate.textMatchScore >= MIN_TEXT_MATCH_SCORE && (candidate.matchScore >= 45 || (candidate.visualMatchScore ?? 0) >= 70))
    .sort((left, right) =>
      right.matchScore - left.matchScore
      || (right.visualMatchScore ?? -1) - (left.visualMatchScore ?? -1)
      || right.textMatchScore - left.textMatchScore)
    .slice(0, 8)
}
