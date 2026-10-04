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
export const listSets = (language: string='fr') => fetchSet<SetSummary[]>(base(language))
export const getSet = async (id: string, language: string='fr'): Promise<SetDetail> => {
  const set = await fetchSet<SetDetail>(`${base(language)}/${encodeURIComponent(id)}`)
  return rgbMewCards(addMissingAnniversaryMepPromos(set,language), language)
}
export type SeriesSummary = { id: string; name: string }
export type SeriesDetail = SeriesSummary & { sets: SetSummary[] }
export const listSeries = (language: string='fr') => fetchSet<SeriesSummary[]>(`https://api.tcgdex.net/v2/${language}/series`)
export const getSeries = (id: string, language: string='fr') => fetchSet<SeriesDetail>(`https://api.tcgdex.net/v2/${language}/series/${encodeURIComponent(id)}`)
