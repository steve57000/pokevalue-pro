export type SetSummary = { id: string; name: string; cardCount: { total: number; official: number }; logo?: string }
export type SetCard = { id: string; name: string; localId: string; image?: string; rarity?: string }
export type SetDetail = SetSummary & { serie?: { id: string; name: string }; cards: SetCard[] }
export type CatalogLanguage = 'fr' | 'en' | 'ja' | 'zh-tw'
const base = (language: string='fr') => `https://api.tcgdex.net/v2/${language}/sets`
async function fetchSet<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Catalogue indisponible (${response.status})`)
  return response.json() as Promise<T>
}
export const listSets = (language: string='fr') => fetchSet<SetSummary[]>(base(language))
export const getSet = (id: string, language: string='fr') => fetchSet<SetDetail>(`${base(language)}/${encodeURIComponent(id)}`)
export type SeriesSummary = { id: string; name: string }
export type SeriesDetail = SeriesSummary & { sets: SetSummary[] }
export const listSeries = (language: string='fr') => fetchSet<SeriesSummary[]>(`https://api.tcgdex.net/v2/${language}/series`)
export const getSeries = (id: string, language: string='fr') => fetchSet<SeriesDetail>(`https://api.tcgdex.net/v2/${language}/series/${encodeURIComponent(id)}`)
