export type SetSummary = { id: string; name: string; cardCount: { total: number; official: number }; logo?: string; symbol?: string; serie?: { id: string; name?: string } }
export type SetCard = { id: string; name: string; localId: string; image?: string; rarity?: string }
export type SetDetail = SetSummary & { serie?: { id: string; name: string }; cards: SetCard[] }
export type CatalogLanguage = 'fr' | 'en' | 'ja' | 'zh-tw'

// These CS* records are incorrectly duplicated as “Triplet Beat” by the
// upstream Asian catalogues: each advertises 101 cards but its detail is empty.
const asianCatalogueGhostIds = new Set([
  'CS1.5','CS1a','CS1b','CS2.5','CS2a','CS2b','CS3.5','CS3a','CS3b',
  'CS3D','CS4','CS4a','CS4b','CS4Da','CSA',
])
export function filterLocalizedSets<T extends Pick<SetSummary, 'id'>>(sets: T[], language: string): T[] {
  if (language !== 'ja' && language !== 'zh-tw') return sets
  return sets.filter(set => !asianCatalogueGhostIds.has(set.id))
}
export function chooseAvailableSetId(
  sets: SetSummary[],
  currentId: string,
  ownedSetCounts: ReadonlyMap<string, number> = new Map(),
  preferredSeriesId?: string,
): string {
  if (sets.some(set => set.id === currentId)) return currentId
  const sameSeries = preferredSeriesId ? sets.filter(set => set.serie?.id === preferredSeriesId) : []
  const candidates = sameSeries.length ? sameSeries : sets
  let preferredId = ''
  let highestOwnedCount = 0
  for (const set of candidates) {
    const ownedCount = ownedSetCounts.get(set.id) ?? 0
    if (ownedCount > highestOwnedCount) {
      preferredId = set.id
      highestOwnedCount = ownedCount
    }
  }
  // Localized catalogs may not share series IDs; open the first valid localized set as a usable fallback.
  return preferredId || sameSeries[0]?.id || sets[0]?.id || ''
}
const base = (language: string='fr') => `https://api.tcgdex.net/v2/${language}/sets`
async function fetchSet<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`Catalogue indisponible (${response.status})`)
    return await response.json() as T
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Le catalogue met trop de temps à répondre. Réessaie dans un instant.')
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
const rgbMewCards = (set: SetDetail, language: string): SetDetail => {
  if (!set?.id || !Array.isArray(set.cards)) return set
  const setId = set.id.toLowerCase()
  if (setId !== '30th' && setId !== 'm6a') return set
  const localizedName = language === 'ja' ? 'ミュウ' : language === 'zh-tw' ? '夢幻' : 'Mew'
  const missing = ['R', 'G', 'B'].filter(localId => !set.cards.some(card => card.localId.toUpperCase() === localId))
  if (!missing.length) return set
  const cards = missing.map(localId => ({
    id: `${set.id}-${localId}`,
    name: localizedName,
    localId,
    rarity: 'RGB Rare',
  }))
  return {
    ...set,
    cardCount: { ...set.cardCount, total: set.cardCount.total + cards.length },
    cards: [...set.cards, ...cards],
  }
}

const anniversaryMepPromos=[
 {localId:'096',names:{fr:'Sulfura',en:'Moltres',ja:'ファイヤー','zh-tw':'火焰鳥'}},
 {localId:'097',names:{fr:'Artikodin',en:'Articuno',ja:'フリーザー','zh-tw':'急凍鳥'}},
 {localId:'099',names:{fr:'Amphinobi-ex',en:'Greninja ex',ja:'ゲッコウガex','zh-tw':'甲賀忍蛙ex'}},
 {localId:'101',names:{fr:'Nidorina',en:'Nidorina',ja:'ニドリーナ','zh-tw':'尼多娜'}},
] as const
const addMissingAnniversaryMepPromos=(set:SetDetail,language:string):SetDetail=>{
 if(!set?.id||set.id.toLowerCase()!=='mep'||!Array.isArray(set.cards))return set
 const missing=anniversaryMepPromos.filter(promo=>!set.cards.some(card=>card.id.toLowerCase()===`mep-${promo.localId}`))
 if(!missing.length)return set
 const cards:SetCard[]=missing.map(promo=>({id:`${set.id}-${promo.localId}`,name:promo.names[language as keyof typeof promo.names]??promo.names.en,localId:promo.localId,rarity:'Promo'}))
 return {...set,cardCount:{...set.cardCount,total:set.cardCount.total+cards.length},cards:[...set.cards,...cards]}
}
export const listSets = async (language: string='fr') => filterLocalizedSets(await fetchSet<SetSummary[]>(base(language)), language)
export const getSet = async (id: string, language: string='fr'): Promise<SetDetail> => {
  if ((language === 'ja' || language === 'zh-tw') && asianCatalogueGhostIds.has(id)) {
    throw new Error(`L’extension ${id} est une entrée vide du catalogue ${language.toUpperCase()}.`)
  }
  const set = await fetchSet<SetDetail>(`${base(language)}/${encodeURIComponent(id)}`)
  return rgbMewCards(addMissingAnniversaryMepPromos(set,language), language)
}
export type SeriesSummary = { id: string; name: string; logo?: string; symbol?: string }
export type SeriesDetail = SeriesSummary & { sets: SetSummary[] }
export const listSeries = async (language: string='fr'): Promise<SeriesSummary[]> => {
  try {
    return await fetchSet<SeriesSummary[]>(`https://api.tcgdex.net/v2/${language}/series`)
  } catch {
    // Rebuild the series index from set summaries if a localized series endpoint fails.
    const sets = await listSets(language)
    const families = new Map<string, SeriesSummary>()
    for (const set of sets) {
      const id = set.serie?.id
      if (id && !families.has(id)) families.set(id, { id, name: set.serie?.name ?? id, logo: set.logo, symbol: set.symbol })
    }
    if (!families.size) throw new Error(`Les séries du catalogue ${language.toUpperCase()} sont temporairement indisponibles.`)
    return [...families.values()]
  }
}
export const getSeries = async (id: string, language: string='fr'): Promise<SeriesDetail> => {
  try {
    const series = await fetchSet<SeriesDetail>(`https://api.tcgdex.net/v2/${language}/series/${encodeURIComponent(id)}`)
    return { ...series, sets: filterLocalizedSets(series.sets ?? [], language) }
  } catch (error) {
    // Rebuild localized family details from set summaries on any endpoint failure.
    const sets = await listSets(language)
    return { id, name: id, sets: sets.filter(set => set.serie?.id === id) }
  }
}
