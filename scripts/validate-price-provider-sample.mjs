import { readFile } from 'node:fs/promises'

const sample = JSON.parse(await readFile(new URL('../src/data/priceProviderSample.json', import.meta.url), 'utf8'))
const observedAt = new Date().toISOString()
const results = []
const failures = []

function asIsoDate(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value > 1_000_000_000_000 ? value : value * 1000)
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
  }
  if (typeof value !== 'string' || !value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function productId(value) {
  return value === undefined || value === null || value === '' ? undefined : String(value)
}

function reference({ value, source, market, currency, catalogLanguage, variant, metric, basis, externalProductId, sourceUpdatedAt }) {
  return {
    value,
    source,
    aggregator: 'tcgdex',
    market,
    currency: typeof currency === 'string' && /^[A-Z]{3}$/.test(currency) ? currency : source === 'cardmarket' ? 'EUR' : 'USD',
    catalogLanguage,
    printingLanguage: 'unknown',
    variant,
    condition: 'unknown',
    basis,
    aggregation: 'aggregate',
    metric,
    ...(externalProductId ? { externalProductId } : {}),
    ...(sourceUpdatedAt ? { sourceUpdatedAt } : {}),
    observedAt,
  }
}

function positive(value) { return typeof value === 'number' && Number.isFinite(value) && value > 0 }
function cardmarketReferences(pricing, card) {
  const data = pricing?.cardmarket
  if (!data) return []
  const fields = [
    { variant: 'normal', values: [['trend', data.trend], ['avg7', data.avg7], ['avg30', data.avg30], ['avg1', data.avg1], ['average', data.avg], ['low', data.low]] },
    { variant: 'holofoil', values: [['trend-holo', data['trend-holo']], ['avg7-holo', data['avg7-holo']], ['avg30-holo', data['avg30-holo']], ['avg1-holo', data['avg1-holo']], ['average-holo', data['avg-holo']], ['low-holo', data['low-holo']]] },
    { variant: 'reverse-holofoil', values: [['reverse-holo-trend', data.reverseHoloTrend], ['reverse-holo-average-30d', data.reverseHoloAvg30]] },
  ]
  const sourceUpdatedAt = asIsoDate(data.updatedAt ?? data.updated)
  const externalProductId = productId(data.idProduct)
  const output = []
  for (const item of fields) {
    const selected = item.values.find(([, value]) => positive(value))
    for (const [metric, value] of item.values) {
      if (!positive(value)) continue
      const basis = metric === 'low' || metric === 'low-holo' ? 'listing'
        : metric.startsWith('avg') || metric.startsWith('average') || metric === 'reverse-holo-average-30d' ? 'completed-sale' : 'guide'
      output.push({
        ...reference({ value, source: 'cardmarket', market: 'cardmarket-europe', currency: data.unit ?? 'EUR', catalogLanguage: card.catalogLanguage, variant: item.variant, metric, basis, externalProductId, sourceUpdatedAt }),
        primary: metric === selected?.[0],
      })
    }
  }
  return output
}

function tcgplayerReferences(pricing, card) {
  const data = pricing?.tcgplayer
  if (!data) return []
  const variants = [
    ['normal', data.normal ?? data],
    ['holofoil', data.holofoil],
    ['reverse-holofoil', data['reverse-holofoil'] ?? data.reverse],
  ]
  const sourceUpdatedAt = asIsoDate(data.updatedAt ?? data.updated)
  const output = []
  for (const [variant, prices] of variants) {
    if (!prices) continue
    const fields = [
      ['marketPrice', prices.marketPrice, 'guide'], ['midPrice', prices.midPrice, 'guide'],
      ['lowPrice', prices.lowPrice, 'listing'], ['highPrice', prices.highPrice, 'listing'],
      ['directLowPrice', prices.directLowPrice, 'listing'],
    ]
    const selected = fields.filter(([metric]) => metric !== 'highPrice' && metric !== 'directLowPrice').find(([, value]) => positive(value))
    for (const [metric, value, basis] of fields) {
      if (!positive(value)) continue
      output.push({
        ...reference({ value, source: 'tcgplayer', market: 'tcgplayer-north-america', currency: data.unit ?? 'USD', catalogLanguage: card.catalogLanguage, variant, metric, basis, externalProductId: productId(prices.productId ?? data.productId), sourceUpdatedAt }),
        primary: metric === selected?.[0],
      })
    }
  }
  return output
}

for (const card of sample.cards) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const url = `https://api.tcgdex.net/v2/${card.catalogLanguage}/cards/${encodeURIComponent(card.cardId)}`
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const body = await response.json()
    if (body.id?.toLowerCase() !== card.cardId.toLowerCase()) throw new Error(`ID reçu inattendu : ${body.id ?? 'absent'}`)
    const pricing = body.pricing ?? {}
    const cmId = productId(pricing.cardmarket?.idProduct)
    const tcgId = productId(pricing.tcgplayer?.normal?.productId ?? pricing.tcgplayer?.productId)
    const mapping = {
      cardmarket: cmId === card.cardmarketProductId ? 'matched' : cmId ? `mismatch:${cmId}` : 'id-not-returned',
      tcgplayer: !card.tcgplayerProductId ? 'not-mapped-upstream' : tcgId === card.tcgplayerProductId ? 'matched' : tcgId ? `mismatch:${tcgId}` : 'id-not-returned',
    }
    if (mapping.cardmarket !== 'matched' || (card.tcgplayerProductId && mapping.tcgplayer !== 'matched')) failures.push(`${card.catalogLanguage}/${card.cardId}: correspondance fournisseur non confirmée (${JSON.stringify(mapping)})`)
    const quotes = [...cardmarketReferences(pricing, card), ...tcgplayerReferences(pricing, card)]
    if (!quotes.length) failures.push(`${card.catalogLanguage}/${card.cardId}: aucune mesure numérique disponible`)
    results.push({
      catalogLanguage: card.catalogLanguage,
      cardId: body.id,
      name: body.name,
      sampleExpectedProductIds: { cardmarket: card.cardmarketProductId, tcgplayer: card.tcgplayerProductId ?? null },
      mapping,
      quotes,
    })
  } catch (error) {
    failures.push(`${card.catalogLanguage}/${card.cardId}: ${error.message}`)
    results.push({ catalogLanguage: card.catalogLanguage, cardId: card.cardId, error: error.message, quotes: [] })
  } finally {
    clearTimeout(timeout)
  }
}

const report = {
  provider: 'TCGdex',
  sampledAt: observedAt,
  fixedSample: sample.selection,
  verdict: failures.length ? 'validation-incomplete-or-mapping-mismatch' : 'guide-reference-only',
  rules: 'Chaque valeur est étiquetée selon son champ source. Les moyennes de ventes sont des agrégats, pas des transactions individuelles. La langue d’impression et l’état restent inconnus.',
  cards: results,
  failures,
}
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
if (failures.length) process.exitCode = 1
