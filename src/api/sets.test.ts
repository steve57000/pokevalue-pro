import { afterEach, describe, expect, it, vi } from 'vitest'
import { chooseAvailableSetId, filterLocalizedSets, getSet, getSeries, listSets } from './sets'

afterEach(() => vi.unstubAllGlobals())

describe('localized set catalogue', () => {
  it('requests the selected language for set, series and set list', async () => {
    const fetchMock = vi.fn(async (_url: string) => ({ ok: true, json: async () => [] }) as Response)
    vi.stubGlobal('fetch', fetchMock)

    await listSets('ja')
    await getSet('sv01', 'zh-tw')
    await getSeries('sv', 'ja')

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://api.tcgdex.net/v2/ja/sets',
      'https://api.tcgdex.net/v2/zh-tw/sets/sv01',
      'https://api.tcgdex.net/v2/ja/series/sv',
    ])
  })

  it('removes only the known empty CS catalogue records from Japanese and Traditional Chinese', () => {
    const summaries = [{id:'CS2a',name:'entrée fantôme'}, {id:'SV8a',name:'extension valide'}]
    expect(filterLocalizedSets(summaries, 'ja').map(set => set.id)).toEqual(['SV8a'])
    expect(filterLocalizedSets(summaries, 'zh-tw').map(set => set.id)).toEqual(['SV8a'])
    expect(filterLocalizedSets(summaries, 'fr')).toEqual(summaries)
  })

  it('keeps the current localized set or selects the best owned set after a language switch', () => {
    const summaries = [{id:'SV8a',name:'A',cardCount:{total:1,official:1}}, {id:'SV9',name:'B',cardCount:{total:1,official:1}}]
    expect(chooseAvailableSetId(summaries, 'SV8a')).toBe('SV8a')
    expect(chooseAvailableSetId(summaries, 'missing', new Map([['SV8a',1],['SV9',3]]))).toBe('SV9')
    expect(chooseAvailableSetId(summaries, 'missing')).toBe('SV9')
    expect(chooseAvailableSetId([], 'missing')).toBe('')
  })

  it('filters ghost entries from localized set and series responses', async () => {
    const summaries = [{id:'CS2a',name:'entrée vide',cardCount:{total:101,official:101}}, {id:'SV8a',name:'Terastal Fest',cardCount:{total:187,official:187}}]
    const fetchMock = vi.fn(async (url: string) => ({ok:true,json:async()=>url.endsWith('/sets')?summaries:{id:'SV',name:'Série',sets:summaries}}) as Response)
    vi.stubGlobal('fetch', fetchMock)
    expect((await listSets('zh-tw')).map(set=>set.id)).toEqual(['SV8a'])
    expect((await getSeries('SV','ja')).sets.map(set=>set.id)).toEqual(['SV8a'])
  })

  it('rejects a known empty Asian catalogue entry even if opened from stale saved state', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(getSet('CS2a','zh-tw')).rejects.toThrow('entrée vide')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('adds missing 30th-anniversary MEP promos with French names and exact IDs', async () => {
    const baseSet = { id:'mep', name:'MEP Black Star Promos', cardCount:{total:80,official:0}, cards:[] }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok:true, json:async()=>baseSet }) as Response))
    const set=await getSet('mep','fr')
    expect(set.cards.filter(card=>['096','097','099','101'].includes(card.localId)).map(card=>[card.id,card.name,card.rarity])).toEqual([
      ['mep-096','Sulfura','Promo'],['mep-097','Artikodin','Promo'],['mep-099','Amphinobi-ex','Promo'],['mep-101','Nidorina','Promo'],
    ])
    expect(set.cardCount.total).toBe(84)
  })

  it('does not duplicate anniversary MEP promos already supplied by TCGdex', async () => {
    const baseSet={id:'mep',name:'MEP Black Star Promos',cardCount:{total:84,official:0},cards:['096','097','099','101'].map((localId)=>({id:'mep-'+localId,name:'Existing',localId}))}
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>baseSet}) as Response))
    const set=await getSet('mep','fr')
    expect(set.cards).toHaveLength(4)
    expect(set.cardCount.total).toBe(84)
  })

  it('includes all three RGB Mew cards when the anniversary API omits them', async () => {
    const baseSet = {
      id: '30th',
      name: '30e Anniversaire',
      cardCount: { total: 158, official: 128 },
      cards: [{ id: '30th-001', name: 'Pikachu', localId: '001' }],
    }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => baseSet }) as Response))

    const set = await getSet('30th', 'fr')

    expect(set.cards.filter(card => ['R', 'G', 'B'].includes(card.localId)).map(card => [card.id, card.name, card.rarity])).toEqual([
      ['30th-R', 'Mew', 'RGB Rare'],
      ['30th-G', 'Mew', 'RGB Rare'],
      ['30th-B', 'Mew', 'RGB Rare'],
    ])
    expect(set.cardCount.total).toBe(161)
  })

  it('does not duplicate RGB Mew cards already returned by TCGdex', async () => {
    const baseSet = {
      id: '30th',
      name: '30e Anniversaire',
      cardCount: { total: 161, official: 128 },
      cards: ['R', 'G', 'B'].map(localId => ({ id: `30th-${localId}`, name: 'Mew', localId })),
    }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => baseSet }) as Response))

    const set = await getSet('30th', 'en')

    expect(set.cards).toHaveLength(3)
    expect(set.cardCount.total).toBe(161)
  })

  it('uses the Japanese Mew name for the Japanese anniversary cards', async () => {
    const baseSet = { id: 'M6a', name: '30th CELEBRATION', cardCount: { total: 165, official: 103 }, cards: [] }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => baseSet }) as Response))

    const set = await getSet('M6a', 'ja')

    expect(set.cards.map(card => card.name)).toEqual(['ミュウ', 'ミュウ', 'ミュウ'])
    expect(set.cardCount.total).toBe(168)
  })
})
