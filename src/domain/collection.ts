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
  condition: CardCondition
  notes: string
  manualPrice?: number
  updatedAt: string
}

export type CollectionDocument = {
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
  const entry = { ...input, quantity: Math.max(0, Math.floor(input.quantity)), key, updatedAt: now }
  // Keep zero quantity as a tombstone so a second device cannot resurrect a removal.
  const entries = [...document.entries.filter((item) => item.key !== key), entry]
  return { ...document, revision: document.revision + 1, updatedAt: now, entries }
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
  }
}

export function parseCollection(value: unknown): CollectionDocument {
  if (!value || typeof value !== 'object') throw new Error('Fichier de collection invalide')
  const candidate = value as Partial<CollectionDocument>
  if (candidate.schemaVersion !== COLLECTION_SCHEMA || !Array.isArray(candidate.entries)) {
    throw new Error('Version de collection non prise en charge')
  }
  return candidate as CollectionDocument
}

export function totalValuesByCurrency(values:{value:number;quantity:number;currency:string}[]):Record<string,number>{
 return values.reduce<Record<string,number>>((totals,item)=>{totals[item.currency]=(totals[item.currency]??0)+item.value*item.quantity;return totals},{})
}
