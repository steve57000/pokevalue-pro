import type { MarketPriceQuote, PriceBasis, PrintingLanguage, QuoteAggregation, QuoteVariant } from './pricing'
import { writeStoredJson } from '../utils/storage'
import { isAsianCatalogLanguage } from './pricing'

/** `language` remains the selected catalog language for backwards compatibility. */
export type PriceMetricSnapshot = {
  value: number
  basis: PriceBasis
  aggregation: QuoteAggregation
  metric: string
  externalProductId?: string
  sourceUpdatedAt?: string
}

export type PriceSnapshot = {
  cardId: string
  language: string
  date: string
  value: number
  source: string
  aggregator: string
  market: string
  currency: string
  printingLanguage: PrintingLanguage
  variant: QuoteVariant
  condition: string
  basis: PriceBasis
  aggregation: QuoteAggregation
  metric: string
  quotes: PriceMetricSnapshot[]
  externalProductId?: string
  sourceUpdatedAt?: string
  recordedAt?: string
}

export type PriceHistoryDocument = { schemaVersion: 2; updatedAt: string; snapshots: PriceSnapshot[] }
export type PriceHistoryStorage = Pick<Storage, 'getItem' | 'setItem'>
export const PRICE_HISTORY_STORAGE_KEY = 'price-history-v1'
const MAX = 20000
const quoteBases = new Set<PriceBasis>(['listing', 'guide', 'completed-sale', 'unknown'])
const quoteAggregations = new Set<QuoteAggregation>(['single', 'aggregate', 'unknown'])
const quoteVariants = new Set<QuoteVariant>(['normal', 'holofoil', 'reverse-holofoil', 'unknown'])
const printLanguages = new Set<PrintingLanguage>(['fr', 'en', 'ja', 'zh-tw', 'unknown'])

function validMetric(value: unknown): value is PriceMetricSnapshot {
  if (!value || typeof value !== 'object') return false
  const metric = value as Partial<PriceMetricSnapshot>
  return typeof metric.value === 'number' && Number.isFinite(metric.value) && metric.value > 0
    && quoteBases.has(metric.basis as PriceBasis) && quoteAggregations.has(metric.aggregation as QuoteAggregation)
    && typeof metric.metric === 'string' && Boolean(metric.metric)
    && (metric.externalProductId === undefined || (typeof metric.externalProductId === 'string' && Boolean(metric.externalProductId)))
    && (metric.sourceUpdatedAt === undefined || validTimestamp(metric.sourceUpdatedAt))
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function validTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function normalizeSnapshot(value: unknown, allowLegacy = true): PriceSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined
  const item = value as Partial<PriceSnapshot>
  if (typeof item.cardId !== 'string' || !item.cardId || typeof item.language !== 'string' || !item.language
    || !validDate(item.date) || typeof item.value !== 'number' || !Number.isFinite(item.value) || item.value <= 0
    || typeof item.source !== 'string' || !item.source) return undefined

  const hasQuoteMetadata = typeof item.aggregator === 'string' && Boolean(item.aggregator)
    && typeof item.market === 'string' && Boolean(item.market)
    && typeof item.currency === 'string' && /^[A-Z]{3}$/.test(item.currency)
    && printLanguages.has(item.printingLanguage as PrintingLanguage)
    && quoteVariants.has(item.variant as QuoteVariant)
    && typeof item.condition === 'string' && Boolean(item.condition)
    && quoteBases.has(item.basis as PriceBasis)
    && quoteAggregations.has(item.aggregation as QuoteAggregation)
    && typeof item.metric === 'string' && Boolean(item.metric)
    && Array.isArray(item.quotes) && item.quotes.length > 0 && item.quotes.every(validMetric)
    && item.quotes.some(metric => metric.value === item.value && metric.basis === item.basis && metric.aggregation === item.aggregation && metric.metric === item.metric)

  if (hasQuoteMetadata) {
    if (item.recordedAt !== undefined && !validTimestamp(item.recordedAt)) return undefined
    if (item.sourceUpdatedAt !== undefined && !validTimestamp(item.sourceUpdatedAt)) return undefined
    if (item.externalProductId !== undefined && (typeof item.externalProductId !== 'string' || !item.externalProductId)) return undefined
    return item as PriceSnapshot
  }
  if (!allowLegacy) return undefined

  // Old local and remote histories only stored the source ID. Retain them as
  // explicitly unverified guide references rather than discarding past work.
  const knownMarket = item.source === 'cardmarket' || item.source === 'tcgplayer'
  const migrated: PriceSnapshot = {
    cardId: item.cardId,
    language: item.language,
    date: item.date,
    value: item.value,
    source: item.source,
    aggregator: knownMarket ? 'tcgdex' : 'unknown',
    market: item.source === 'cardmarket' ? 'cardmarket-europe' : item.source === 'tcgplayer' ? 'tcgplayer-north-america' : 'unknown',
    currency: item.source === 'cardmarket' ? 'EUR' : item.source === 'tcgplayer' ? 'USD' : 'XXX',
    printingLanguage: 'unknown',
    variant: item.source === 'cardmarket' ? 'normal' : 'unknown',
    condition: 'unknown',
    // The legacy row did not retain which price-guide field had been selected.
    basis: 'unknown',
    aggregation: knownMarket ? 'aggregate' : 'unknown',
    metric: 'legacy-reference',
    quotes: [{ value: item.value, basis: 'unknown', aggregation: knownMarket ? 'aggregate' : 'unknown', metric: 'legacy-reference' }],
    ...(validTimestamp(item.recordedAt) ? { recordedAt: item.recordedAt } : {}),
  }
  return migrated
}

export function snapshotsFromQuotes(cardId: string, quotes: MarketPriceQuote[], date = todayPriceDate()): PriceSnapshot[] {
  const groups = new Map<string, MarketPriceQuote[]>()
  for (const quote of quotes) {
    const key = [quote.catalogLanguage, quote.source, quote.aggregator, quote.market, quote.currency,
      quote.printingLanguage, quote.variant, quote.condition].join(':')
    groups.set(key, [...(groups.get(key) ?? []), quote])
  }
  return [...groups.values()].map(group => {
    const primary = group.find(quote => quote.primary) ?? group[0]
    return {
      cardId,
      language: primary.catalogLanguage,
      date,
      value: primary.value,
      source: primary.source,
      aggregator: primary.aggregator,
      market: primary.market,
      currency: primary.currency,
      printingLanguage: primary.printingLanguage,
      variant: primary.variant,
      condition: primary.condition,
      basis: primary.basis,
      aggregation: primary.aggregation,
      metric: primary.metric,
      quotes: group.map(quote => ({
        value: quote.value,
        basis: quote.basis,
        aggregation: quote.aggregation,
        metric: quote.metric,
        ...(quote.externalProductId ? { externalProductId: quote.externalProductId } : {}),
        ...(quote.sourceUpdatedAt ? { sourceUpdatedAt: quote.sourceUpdatedAt } : {}),
      })),
      ...(primary.externalProductId ? { externalProductId: primary.externalProductId } : {}),
      ...(primary.sourceUpdatedAt ? { sourceUpdatedAt: primary.sourceUpdatedAt } : {}),
      recordedAt: group.map(quote => quote.observedAt).sort().slice(-1)[0],
    }
  })
}

export function parsePriceHistoryDocument(value: unknown): PriceHistoryDocument {
  if (!value || typeof value !== 'object') throw new Error('Fichier d’historique de prix invalide')
  const candidate = value as { schemaVersion?: number; snapshots?: unknown[]; updatedAt?: string }
  if ((candidate.schemaVersion !== 1 && candidate.schemaVersion !== 2) || !Array.isArray(candidate.snapshots) || typeof candidate.updatedAt !== 'string') {
    throw new Error('Version du fichier d’historique de prix non prise en charge')
  }
  const snapshots = candidate.snapshots.map(snapshot => normalizeSnapshot(snapshot, candidate.schemaVersion === 1))
  if (snapshots.some(snapshot => !snapshot)) throw new Error('Le fichier d’historique contient un relevé invalide')
  return { schemaVersion: 2, updatedAt: candidate.updatedAt, snapshots: mergePriceHistory(snapshots as PriceSnapshot[]) }
}

function snapshotTime(snapshot: PriceSnapshot) { return snapshot.recordedAt ? Date.parse(snapshot.recordedAt) : Date.parse(`${snapshot.date}T00:00:00Z`) }
function historyKey(snapshot: PriceSnapshot) {
  return [snapshot.language, snapshot.cardId, snapshot.date, snapshot.source, snapshot.market, snapshot.currency,
    snapshot.printingLanguage, snapshot.variant, snapshot.condition, snapshot.aggregator, snapshot.externalProductId ?? ''].join(':')
}
function mergeQuoteSnapshots(current: PriceSnapshot, incoming: PriceSnapshot): PriceSnapshot {
  const incomingIsNewer = snapshotTime(incoming) >= snapshotTime(current)
  const ordered = incomingIsNewer ? [current, incoming] : [incoming, current]
  const metrics = new Map<string, PriceMetricSnapshot>()
  for (const snapshot of ordered) for (const metric of snapshot.quotes) {
    metrics.set(`${metric.metric}:${metric.basis}:${metric.aggregation}`, metric)
  }
  const primary = incomingIsNewer ? incoming : current
  const recordedAt = incomingIsNewer ? incoming.recordedAt ?? current.recordedAt : current.recordedAt ?? incoming.recordedAt
  return { ...primary, quotes: [...metrics.values()], ...(recordedAt ? { recordedAt } : {}) }
}

export function mergePriceHistory(local: PriceSnapshot[], remote: PriceSnapshot[] = []): PriceSnapshot[] {
  const merged = new Map<string, PriceSnapshot>()
  for (const snapshot of [...remote, ...local]) {
    const key = historyKey(snapshot), current = merged.get(key)
    if (!current) merged.set(key, snapshot)
    else merged.set(key, mergeQuoteSnapshots(current, snapshot))
  }
  return [...merged.values()].sort((a, b) => a.date.localeCompare(b.date) || a.language.localeCompare(b.language)
    || a.cardId.localeCompare(b.cardId) || a.source.localeCompare(b.source) || a.market.localeCompare(b.market)
    || a.currency.localeCompare(b.currency) || a.variant.localeCompare(b.variant) || a.basis.localeCompare(b.basis)
    || a.metric.localeCompare(b.metric) || (a.externalProductId ?? '').localeCompare(b.externalProductId ?? '')).slice(-MAX)
}

export function samePriceHistory(a: PriceSnapshot[], b: PriceSnapshot[]) {
  const left = mergePriceHistory(a), right = mergePriceHistory(b)
  return left.length === right.length && left.every((item, index) => JSON.stringify(item) === JSON.stringify(right[index]))
}

function readHistory(storage: Pick<Storage, 'getItem'>): PriceSnapshot[] {
  try {
    const parsed = JSON.parse(storage.getItem(PRICE_HISTORY_STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.map(snapshot => normalizeSnapshot(snapshot)).filter((snapshot): snapshot is PriceSnapshot => Boolean(snapshot))
  } catch { return [] }
}

function saveHistory(history: PriceSnapshot[], storage: PriceHistoryStorage) {
  const merged = mergePriceHistory(history)
  if (usesBrowserStorage(storage)) {
    if (!writeStoredJson(PRICE_HISTORY_STORAGE_KEY, merged)) throw new Error('Échec de sauvegarde de l’historique de prix local')
    return
  }
  storage.setItem(PRICE_HISTORY_STORAGE_KEY, JSON.stringify(merged))
}
function usesBrowserStorage(storage: PriceHistoryStorage) { return typeof window !== 'undefined' && storage === window.localStorage }
function announceHistoryChange() { if (typeof window !== 'undefined') window.dispatchEvent(new Event('pv-price-history-updated')) }

export function recordPriceSnapshots(snapshots: PriceSnapshot[], storage: PriceHistoryStorage = localStorage) {
  const normalized = snapshots.map(snapshot => normalizeSnapshot(snapshot, false))
  if (normalized.some(snapshot => !snapshot)) throw new Error('Chaque relevé de prix doit contenir une provenance complète et valide')
  if (!normalized.length) return readHistory(storage)
  const before = readHistory(storage)
  const observedAt = new Date().toISOString()
  const recorded = (normalized as PriceSnapshot[]).map(snapshot => ({ ...snapshot, recordedAt: snapshot.recordedAt ?? observedAt }))
  const history = mergePriceHistory(recorded, before)
  if (!samePriceHistory(before, history)) { saveHistory(history, storage); if (usesBrowserStorage(storage)) announceHistoryChange() }
  return history
}

export function recordPriceSnapshot(snapshot: PriceSnapshot, storage: PriceHistoryStorage = localStorage) {
  return recordPriceSnapshots([snapshot], storage)
}

export function replacePriceHistory(history: PriceSnapshot[], storage: PriceHistoryStorage = localStorage, notify = true) {
  const next = mergePriceHistory(history), before = readHistory(storage)
  if (!samePriceHistory(before, next)) { saveHistory(next, storage); if (notify && usesBrowserStorage(storage)) announceHistoryChange() }
}

export function todayPriceDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

/** A comparable observation per card and day: same market, currency and finish. */
export function comparablePriceHistory(snapshots: PriceSnapshot[]): PriceSnapshot[] {
  const daily = new Map<string, PriceSnapshot>()
  for (const point of snapshots) {
    if (isAsianCatalogLanguage(point.language) || point.source !== 'cardmarket' || point.market !== 'cardmarket-europe'
      || point.currency !== 'EUR' || point.variant !== 'normal' || point.basis !== 'guide') continue
    const key = `${point.language}:${point.cardId}:${point.date}`
    const previous = daily.get(key)
    if (!previous || snapshotTime(point) > snapshotTime(previous)
      || (snapshotTime(point) === snapshotTime(previous) && historyKey(point).localeCompare(historyKey(previous)) > 0)) daily.set(key, point)
  }
  return [...daily.values()].sort((a, b) => a.date.localeCompare(b.date) || a.language.localeCompare(b.language) || a.cardId.localeCompare(b.cardId))
}

export function getPriceHistory(cardId: string, language: string, storage: Pick<Storage, 'getItem'> = localStorage): PriceSnapshot[] {
  return comparablePriceHistory(readHistory(storage)).filter(point => point.cardId === cardId && point.language === language)
}

export function getAllPriceHistory(storage: Pick<Storage, 'getItem'> = localStorage): PriceSnapshot[] {
  return readHistory(storage).sort((a, b) => a.date.localeCompare(b.date))
}
