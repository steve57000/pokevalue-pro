export type SetSummary = { id: string; name: string; cardCount: { total: number; official: number }; logo?: string }
export type SetCard = { id: string; name: string; localId: string; image?: string }
export type SetDetail = SetSummary & { serie?: { id: string; name: string }; cards: SetCard[] }
const base = 'https://api.tcgdex.net/v2/fr/sets'
async function fetchSet<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Catalogue indisponible (${response.status})`)
  return response.json() as Promise<T>
}
export const listSets = () => fetchSet<SetSummary[]>(base)
export const getSet = (id: string) => fetchSet<SetDetail>(`${base}/${encodeURIComponent(id)}`)
