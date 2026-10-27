import type { CollectionCard, CollectionDocument, CollectionEntry } from './collection'
import { GRADING_SERVICES, parseGradedSales, readGradedSales, type GradedSale, type GradingCompany } from './gradedSales'

export type GradedCopy = { id: string; company: GradingCompany; grade: string; certificate: string }
export type MarketObservation = GradedSale & { updatedAt: string; deletedAt?: string }
export type GradingSettings = { cardKey: string; costs: Partial<Record<GradingCompany, string>>; feePercent: string; updatedAt: string }
export type PersonalSale = {
  id: string; cardKey: string; card: CollectionCard; copyId?: string; company?: GradingCompany; grade?: string; certificate?: string
  quantity: number; status: 'listed' | 'sold'; priceEur?: number; soldAt?: string; url: string; notes: string
  updatedAt: string; deletedAt?: string
}
export type CollectionExtras = { marketObservations?: MarketObservation[]; personalSales?: PersonalSale[]; gradingSettings?: GradingSettings[] }
export const newId = () => typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)
const stamp = () => new Date().toISOString()
const validTime = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value))
export const validGrade = (company: unknown, grade: unknown) => GRADING_SERVICES.some(service => service.id === company && service.grades.some(g => g === grade))
export const validLink = (value: string) => { try { return ['https:', 'http:'].includes(new URL(value).protocol) } catch { return false } }
export function validateCopies(copies: unknown, quantity: number): void {
  if (copies === undefined) return
  if (!Array.isArray(copies) || copies.length > quantity || new Set(copies.map(c => c?.id)).size !== copies.length || copies.some(c => !c || typeof c.id !== 'string' || !c.id || !validGrade(c.company, c.grade) || typeof c.certificate !== 'string')) throw new Error('Exemplaires gradés invalides.')
}
export function validateExtras(doc: CollectionDocument) {
  const checkRows = (rows: unknown, key: string) => {
    if (rows === undefined) return
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row[key] !== 'string' || !row[key] || !validTime(row.updatedAt) || row.deletedAt !== undefined && !validTime(row.deletedAt)) || new Set(rows.map(row => row[key])).size !== rows.length) throw new Error('Données de sauvegarde invalides.')
  }
  checkRows(doc.marketObservations, 'id'); checkRows(doc.personalSales, 'id'); checkRows(doc.gradingSettings, 'cardKey')
  if (doc.marketObservations) parseGradedSales(doc.marketObservations)
  for (const sale of doc.personalSales ?? []) {
    if (!sale.card || typeof sale.cardKey !== 'string' || !['name','setName','cardId','setId','language','variant'].every(k => typeof (sale.card as Record<string, unknown>)[k] === 'string') || sale.card.source !== 'tcgdex'
      || !Number.isSafeInteger(sale.quantity) || sale.quantity < 1 || !['listed','sold'].includes(sale.status)
      || typeof sale.url !== 'string' || sale.url !== '' && !validLink(sale.url) || typeof sale.notes !== 'string'
      || sale.priceEur !== undefined && (!Number.isFinite(sale.priceEur) || sale.priceEur < 0)
      || sale.copyId !== undefined && (typeof sale.copyId !== 'string' || !validGrade(sale.company,sale.grade) || sale.quantity !== 1)
      || sale.status === 'sold' && (sale.priceEur === undefined || !validSaleDate(sale.soldAt))) throw new Error('Une vente personnelle est invalide.')
  }
  for (const setting of doc.gradingSettings ?? []) {
    if (!setting.costs || typeof setting.costs !== 'object' || typeof setting.feePercent !== 'string' || setting.feePercent !== '' && (!Number.isFinite(Number(setting.feePercent)) || Number(setting.feePercent)<0 || Number(setting.feePercent)>100)
      || Object.entries(setting.costs).some(([key, value]) => !GRADING_SERVICES.some(s => s.id === key) || typeof value !== 'string' || value !== '' && (!Number.isFinite(Number(value)) || Number(value)<0))) throw new Error('Frais de gradation invalides.')
  }
}
export function validSaleDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value+'T12:00:00Z')) && new Date(value+'T12:00:00Z').toISOString().slice(0,10) === value && value <= new Date().toISOString().slice(0,10)
}
function mergeRows<T extends { updatedAt: string; deletedAt?: string }>(left: T[] = [], right: T[] = [], key: (row: T) => string): T[] {
  const map = new Map<string, T>()
  for (const row of [...left, ...right]) {
    const previous = map.get(key(row))
    if (!previous || row.updatedAt > previous.updatedAt || row.updatedAt === previous.updatedAt && row.deletedAt) map.set(key(row), row)
  }
  return [...map.values()]
}
export function mergeExtras(local: CollectionExtras, remote: CollectionExtras): CollectionExtras {
  return {
    marketObservations: mergeRows(local.marketObservations, remote.marketObservations, row => row.id),
    personalSales: mergeRows(local.personalSales, remote.personalSales, row => row.id),
    gradingSettings: mergeRows(local.gradingSettings, remote.gradingSettings, row => row.cardKey),
  }
}
export function changeDocument(doc: CollectionDocument, patch: Partial<CollectionDocument>): CollectionDocument {
  return { ...doc, ...patch, revision: doc.revision + 1, updatedAt: stamp() }
}
export function migrateMarketObservations(doc: CollectionDocument, legacy = readGradedSales()): CollectionDocument {
  const known = new Set((doc.marketObservations ?? []).map(row => row.id))
  const additions = legacy.filter(row => !known.has(row.id)).map(row => ({ ...row, updatedAt: new Date(0).toISOString() }))
  return additions.length ? changeDocument(doc, { marketObservations: [...doc.marketObservations ?? [], ...additions] }) : doc
}
export function saveObservations(doc: CollectionDocument, rows: GradedSale[]): CollectionDocument {
  parseGradedSales(rows)
  const now = stamp(), previous = new Map((doc.marketObservations ?? []).map(row => [row.id, row]))
  const kept = new Set(rows.map(row => row.id))
  const updated = rows.map(row => { const old = previous.get(row.id); return old && !old.deletedAt && JSON.stringify({ ...row, updatedAt: old.updatedAt }) === JSON.stringify(old) ? old : { ...row, updatedAt: now, deletedAt: undefined } })
  const deleted = [...previous.values()].filter(row => !kept.has(row.id)).map(row => row.deletedAt ? row : { ...row, updatedAt: now, deletedAt: now })
  return changeDocument(doc, { marketObservations: [...updated, ...deleted] })
}
export function saveGradingSettings(doc: CollectionDocument, setting: Omit<GradingSettings,'updatedAt'>) {
  const normalized = {...setting, feePercent: setting.feePercent === '' ? '' : String(Math.max(0, Math.min(100, Number(setting.feePercent) || 0))), costs: Object.fromEntries(Object.entries(setting.costs).map(([k,v])=>[k,v === '' ? '' : String(Math.max(0, Number(v) || 0))]))}
  return changeDocument(doc, { gradingSettings: [...(doc.gradingSettings ?? []).filter(row => row.cardKey !== setting.cardKey), { ...normalized, updatedAt: stamp() }] })
}
export function rawQuantity(entry: CollectionEntry) { return Math.max(0, entry.quantity - (entry.gradedCopies?.length ?? 0)) }
export function availableQuantity(doc: CollectionDocument, entry: CollectionEntry, copyId?: string, excludeId?: string) {
  const reserved = (doc.personalSales ?? []).filter(row => !row.deletedAt && row.status === 'listed' && row.cardKey === entry.key && row.copyId === copyId && row.id !== excludeId).reduce((n,row) => n + row.quantity, 0)
  return Math.max(0, (copyId ? Number(entry.gradedCopies?.some(copy => copy.id === copyId)) : rawQuantity(entry)) - reserved)
}
export function reconcilePersonalSales(doc: CollectionDocument, previous?: CollectionEntry): CollectionDocument {
  const allocated = new Map<string,number>()
  const reservedCopies = new Set((doc.personalSales ?? []).filter(row => !row.deletedAt && row.status === 'listed' && row.copyId).map(row => row.copyId))
  const sales = (doc.personalSales ?? []).map(original => {
    if (original.deletedAt || original.status === 'sold') return original
    let row = original
    const entry = doc.entries.find(e => e.key === row.cardKey)
    const converting = entry && previous?.key === entry.key && entry.quantity >= previous.quantity
    let copy = entry?.gradedCopies?.find(c => c.id === row.copyId)
    // A format edit must also update its listing; a stock removal may cancel it.
    if (converting && row.copyId && !copy) row = {...row,copyId:undefined,company:undefined,grade:undefined,certificate:undefined,updatedAt:stamp()}
    if (converting && !row.copyId && row.quantity === 1 && rawQuantity(entry) <= (allocated.get(row.cardKey+'|raw') ?? 0)) {
      copy = entry.gradedCopies?.find(c => !previous.gradedCopies?.some(old => old.id === c.id) && !reservedCopies.has(c.id))
      if (copy) { reservedCopies.add(copy.id); row = {...row,copyId:copy.id,company:copy.company,grade:copy.grade,certificate:copy.certificate,updatedAt:stamp()} }
    }
    const key = row.cardKey+'|'+(row.copyId ?? 'raw'), used = allocated.get(key) ?? 0
    const stock = entry ? row.copyId ? Number(Boolean(copy)) : rawQuantity(entry) : 0
    if (stock - used < row.quantity) return { ...row, deletedAt: stamp(), updatedAt: stamp() }
    allocated.set(key, used + row.quantity)
    return copy && (copy.company !== row.company || copy.grade !== row.grade || copy.certificate !== row.certificate) ? { ...row, company: copy.company, grade: copy.grade, certificate: copy.certificate, updatedAt: stamp() } : row
  })
  return { ...doc, personalSales: sales }
}
export function addPersonalSales(doc: CollectionDocument, selections: {cardKey:string;copyId?:string;quantity:number}[]): CollectionDocument {
  let next = doc
  for (const selection of selections) {
    const entry = next.entries.find(row => row.key === selection.cardKey)
    if (!entry || !Number.isSafeInteger(selection.quantity) || selection.quantity < 1 || availableQuantity(next,entry,selection.copyId) < selection.quantity) throw new Error('Quantité indisponible : vérifie les exemplaires déjà à vendre.')
    const copy = entry.gradedCopies?.find(c => c.id === selection.copyId)
    const {source,setId,cardId,language,variant,name,setName,number,image,rarity} = entry
    const sale: PersonalSale = { id:newId(), cardKey:entry.key, card:{source,setId,cardId,language,variant,name,setName,number,image,rarity}, copyId:copy?.id,company:copy?.company,grade:copy?.grade,certificate:copy?.certificate,quantity:selection.quantity,status:'listed',url:'',notes:'',updatedAt:stamp() }
    next = changeDocument(next, {personalSales:[...next.personalSales ?? [], sale]})
  }
  return next
}
export function updatePersonalSale(doc: CollectionDocument, sale: PersonalSale): CollectionDocument {
  const current = doc.personalSales?.find(row => row.id === sale.id && !row.deletedAt)
  if (!current) throw new Error('Cette vente n’existe plus.')
  if (current.status === 'sold' && sale.status !== 'sold') throw new Error('Une vente conclue ne peut pas être remise en stock automatiquement.')
  const next = changeDocument(doc,{personalSales:doc.personalSales!.map(row => row.id === sale.id ? {...sale,updatedAt:stamp()} : row)})
  validateExtras(next)
  if (sale.status === 'listed') {
    const entry = doc.entries.find(row => row.key === sale.cardKey)
    if (!entry || availableQuantity(doc,entry,sale.copyId,sale.id) < sale.quantity) throw new Error('Quantité supérieure au stock disponible.')
  }
  return next
}
export function removePersonalSale(doc: CollectionDocument, id: string) {
  return changeDocument(doc,{personalSales:doc.personalSales?.map(row => row.id === id ? {...row,deletedAt:stamp(),updatedAt:stamp()} : row)})
}
/** Conversion of one reserved physical copy; the collection total is unchanged. */
export function changeListedFormat(doc: CollectionDocument, id: string, grading?: Omit<GradedCopy,'id'>) {
  const sale = doc.personalSales?.find(row => row.id === id && !row.deletedAt && row.status === 'listed')
  const entry = doc.entries.find(row => row.key === sale?.cardKey)
  if (!sale || !entry) throw new Error('Carte indisponible.')
  if (grading && sale.quantity !== 1) throw new Error('Pour grader un exemplaire, règle d’abord la quantité de cette annonce sur 1.')
  if (grading && !validGrade(grading.company,grading.grade)) throw new Error('Note invalide.')
  const copy = grading ? {...grading,id:sale.copyId ?? newId()} : undefined
  const copies = (entry.gradedCopies ?? []).filter(c => c.id !== sale.copyId)
  if (copy) copies.push(copy)
  const next = changeDocument(doc,{
    entries:doc.entries.map(e => e.key === entry.key ? {...e,gradedCopies:copies,updatedAt:stamp()} : e),
    personalSales:doc.personalSales!.map(row => row.id === id ? {...row,copyId:copy?.id,company:copy?.company,grade:copy?.grade,certificate:copy?.certificate,updatedAt:stamp()} : row),
  })
  validateExtras(next)
  return next
}
export function completePersonalSale(doc: CollectionDocument, id: string, priceEur: number, soldAt: string): CollectionDocument {
  const sale = doc.personalSales?.find(row => row.id === id && !row.deletedAt && row.status === 'listed')
  const entry = doc.entries.find(row => row.key === sale?.cardKey)
  if (!sale || !entry || availableQuantity(doc,entry,sale.copyId,sale.id)<sale.quantity) throw new Error('Stock insuffisant ou vente déjà conclue.')
  if (!Number.isFinite(priceEur) || priceEur < 0 || !validSaleDate(soldAt)) throw new Error('Renseigne le prix réel et la date de vente.')
  return changeDocument(doc,{
    entries:doc.entries.map(row => row.key === entry.key ? {...row,quantity:row.quantity-sale.quantity,gradedCopies:(row.gradedCopies ?? []).filter(copy => copy.id !== sale.copyId),updatedAt:stamp()} : row),
    personalSales:doc.personalSales!.map(row => row.id === id ? {...row,status:'sold',priceEur,soldAt,updatedAt:stamp()} : row),
  })
}
