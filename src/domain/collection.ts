import { mergeExtras, reconcilePersonalSales, validateCopies, validateExtras, type CollectionExtras, type GradedCopy } from './collectionExtras'
export const COLLECTION_SCHEMA = 1 as const

export type CardCondition = 'mint' | 'near-mint' | 'excellent' | 'good' | 'played' | 'poor'

export type PrintingIdentity = {
  source: 'tcgdex'
  setId: string
  cardId: string
  language: string
  variant: string
}

export type CollectionEntry = PrintingIdentity & {
  key: string
  name: string
  setName: string
  number?: string
  image?: string
  rarity?: string
  quantity: number
  gradedCopies?: GradedCopy[]
  condition: CardCondition
  notes: string
  manualPrice?: number
  priceMode?: 'market' | 'manual'
  updatedAt: string
}

export function collectionUnitPrice(entry: Pick<CollectionEntry, 'manualPrice' | 'priceMode'>, marketPrice?: number): number | undefined {
  const mode = entry.priceMode ?? (entry.manualPrice !== undefined ? 'manual' : 'market')
  return mode === 'manual' ? entry.manualPrice : marketPrice
}

export type CollectionDocument = CollectionExtras & {
  schemaVersion: typeof COLLECTION_SCHEMA
  revision: number
  updatedAt: string
  entries: CollectionEntry[]
}

export const emptyCollection = (): CollectionDocument => ({
  schemaVersion: COLLECTION_SCHEMA, revision: 0, updatedAt: new Date(0).toISOString(), entries: [],
})

export function printingKey(identity: PrintingIdentity): string {
  return [identity.source, identity.setId, identity.cardId, identity.language, identity.variant]
    .map(encodeURIComponent).join(':')
}

export function setIdFromCardId(cardId: string): string {
  const separator = cardId.lastIndexOf('-')
  return separator > 0 ? cardId.slice(0, separator) : 'unknown'
}

export function upsertEntry(document: CollectionDocument, input: Omit<CollectionEntry, 'key' | 'updatedAt'>): CollectionDocument {
  const key = printingKey(input)
  const now = new Date().toISOString()
  const quantity = Math.max(0, Math.floor(input.quantity))
  const entry = { ...input, quantity, gradedCopies: input.gradedCopies?.slice(0, quantity), key, updatedAt: now }
  // Keep zero quantity as a tombstone so a second device cannot resurrect a removal.
  const entries = [...document.entries.filter((item) => item.key !== key), entry]
  return reconcilePersonalSales({ ...document, revision: document.revision + 1, updatedAt: now, entries }, document.entries.find(item => item.key === key))
}

export type CollectionCard = PrintingIdentity & Pick<CollectionEntry, 'name' | 'setName' | 'number' | 'image' | 'rarity'>

export function findCollectionEntry(document: CollectionDocument, identity: PrintingIdentity) {
  const key = printingKey(identity)
  return document.entries.find(entry => entry.key === key)
}

/** Quantity controls must retain the user's condition, notes and price choice. */
export function updateCollectionCard(document: CollectionDocument, card: CollectionCard, changes: Partial<Pick<CollectionEntry, 'quantity' | 'condition' | 'notes' | 'manualPrice' | 'priceMode' | 'gradedCopies'>>) {
  const previous = findCollectionEntry(document, card)
  return upsertEntry(document, {
    ...previous, ...card,
    image: card.image ?? previous?.image, rarity: card.rarity ?? previous?.rarity,
    quantity: previous?.quantity ?? 0, condition: previous?.condition ?? 'near-mint', notes: previous?.notes ?? '',
    ...changes,
  })
}

export function mergeCollections(local: CollectionDocument, remote: CollectionDocument): CollectionDocument {
  const entries = new Map<string, CollectionEntry>()
  for (const entry of [...local.entries, ...remote.entries]) {
    const current = entries.get(entry.key)
    if (!current || entry.updatedAt > current.updatedAt || (entry.updatedAt === current.updatedAt && entry.quantity === 0)) entries.set(entry.key, entry)
  }
  return {
    schemaVersion: COLLECTION_SCHEMA,
    revision: Math.max(local.revision, remote.revision) + 1,
    updatedAt: new Date().toISOString(),
    entries: [...entries.values()],
    ...mergeExtras(local, remote),
  }
}

export function parseCollection(value: unknown): CollectionDocument {
  if (!value || typeof value !== 'object') throw new Error('Fichier de collection invalide')
  const candidate = value as Partial<CollectionDocument>
  if (candidate.schemaVersion !== COLLECTION_SCHEMA || !Array.isArray(candidate.entries)) {
    throw new Error('Version de collection non prise en charge')
  }
  const string = (v: unknown): v is string => typeof v === 'string'
  const validDate = (v: unknown) => string(v) && Number.isFinite(Date.parse(v))
  if (!Number.isInteger(candidate.revision) || candidate.revision! < 0 || !validDate(candidate.updatedAt)) throw new Error('Métadonnées de collection invalides')
  const keys = new Set<string>()
  for (const entry of candidate.entries) {
    if (!entry || typeof entry !== 'object' || entry.source !== 'tcgdex'
      || !['key', 'setId', 'cardId', 'language', 'variant', 'name', 'setName', 'notes'].every(field => string((entry as unknown as Record<string, unknown>)[field]))
      || !entry.setId || !entry.cardId || !entry.language || !entry.variant
      || !Number.isSafeInteger(entry.quantity) || entry.quantity < 0
      || !['mint', 'near-mint', 'excellent', 'good', 'played', 'poor'].includes(entry.condition)
      || !validDate(entry.updatedAt)
      || ['image', 'number', 'rarity'].some(field => { const v = (entry as unknown as Record<string, unknown>)[field]; return v !== undefined && !string(v) })
      || entry.manualPrice !== undefined && (typeof entry.manualPrice !== 'number' || !Number.isFinite(entry.manualPrice) || entry.manualPrice < 0)
      || entry.priceMode !== undefined && entry.priceMode !== 'manual' && entry.priceMode !== 'market'
      || entry.key !== printingKey(entry) || keys.has(entry.key)) throw new Error('Le fichier contient une carte invalide ou en double. Import annulé.')
    validateCopies(entry.gradedCopies, entry.quantity)
    keys.add(entry.key)
  }
  validateExtras(candidate as CollectionDocument)
  return candidate as CollectionDocument
}

export function totalValuesByCurrency(values:{value:number;quantity:number;currency:string}[]):Record<string,number>{
 return values.reduce<Record<string,number>>((totals,item)=>{totals[item.currency]=(totals[item.currency]??0)+item.value*item.quantity;return totals},{})
}
