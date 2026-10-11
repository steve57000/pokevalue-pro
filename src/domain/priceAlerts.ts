export type PriceAlertDirection = 'below' | 'above'

export type PriceAlert = {
  id: string
  cardId: string
  language: string
  name: string
  setName: string
  number?: string
  direction: PriceAlertDirection
  targetPrice: number
  createdAt: string
  triggeredAt?: string
  triggeredPrice?: number
}

export type PriceAlertInput = Omit<PriceAlert, 'id' | 'createdAt' | 'triggeredAt' | 'triggeredPrice'>

export const PRICE_ALERTS_STORAGE_KEY = 'pv-price-alerts-v1'

export const priceAlertKey = (alert: Pick<PriceAlert, 'cardId' | 'language'>) =>
  `${alert.language.toLowerCase()}:${alert.cardId}`

export function parsePriceAlerts(value: unknown): PriceAlert[] {
  if (!Array.isArray(value)) return []
  const alerts = new Map<string, PriceAlert>()
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const candidate = item as Partial<PriceAlert>
    if (typeof candidate.id !== 'string' || !candidate.id || typeof candidate.cardId !== 'string' || !candidate.cardId
      || typeof candidate.language !== 'string' || !candidate.language || typeof candidate.name !== 'string'
      || typeof candidate.setName !== 'string' || (candidate.direction !== 'below' && candidate.direction !== 'above')
      || typeof candidate.targetPrice !== 'number' || !Number.isFinite(candidate.targetPrice) || candidate.targetPrice <= 0
      || typeof candidate.createdAt !== 'string' || !Number.isFinite(Date.parse(candidate.createdAt))) continue

    const alert: PriceAlert = {
      id: candidate.id,
      cardId: candidate.cardId,
      language: candidate.language.toLowerCase(),
      name: candidate.name,
      setName: candidate.setName,
      number: typeof candidate.number === 'string' ? candidate.number : undefined,
      direction: candidate.direction,
      targetPrice: candidate.targetPrice,
      createdAt: candidate.createdAt,
      triggeredAt: typeof candidate.triggeredAt === 'string' && Number.isFinite(Date.parse(candidate.triggeredAt)) ? candidate.triggeredAt : undefined,
      triggeredPrice: typeof candidate.triggeredPrice === 'number' && Number.isFinite(candidate.triggeredPrice) ? candidate.triggeredPrice : undefined,
    }
    alerts.set(alert.id, alert)
  }
  return [...alerts.values()]
}

export function createPriceAlert(input: PriceAlertInput, now = new Date()): PriceAlert {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`
  return { ...input, language: input.language.toLowerCase(), id, createdAt: now.toISOString() }
}

export function isPriceAlertReached(alert: Pick<PriceAlert, 'direction' | 'targetPrice'>, currentPrice: number): boolean {
  return alert.direction === 'below' ? currentPrice <= alert.targetPrice : currentPrice >= alert.targetPrice
}

export function markReachedPriceAlerts(alerts: PriceAlert[], currentPrices: Map<string, number>, now = new Date()): PriceAlert[] {
  let changed = false
  const next = alerts.map((alert) => {
    const price = currentPrices.get(priceAlertKey(alert))
    if (alert.triggeredAt || price === undefined || !Number.isFinite(price) || price <= 0 || !isPriceAlertReached(alert, price)) return alert
    changed = true
    return { ...alert, triggeredAt: now.toISOString(), triggeredPrice: price }
  })
  return changed ? next : alerts
}
