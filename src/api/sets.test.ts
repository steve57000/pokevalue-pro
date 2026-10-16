import { afterEach, describe, expect, it, vi } from 'vitest'
import { chooseAvailableSetId, filterLocalizedSets, getSet, getSeries, listSets, listSeries } from './sets'

afterEach(() => vi.unstubAllGlobals())

describe('localized set catalogue', () => {
  it('requests the selected language for set, series and set list', async () => {
    const fetchMock = vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('/series/') ? { id: 'sv', name: 'Scarlet & Violet', sets: [] } : [] }) as Response)
    vi.stubGlobal('fetch', fetchMock)

    await listSets('ja')
    await getSet('sv01', 'zh-tw')
    await getSeries('sv', 'ja')

    const urls = fetchMock.mock.calls.map(([url]) => url)
    expect(urls).toEqual(expect.arrayContaining([
      'https://api.tcgdex.net/v2/ja/sets',
      'https://api.tcgdex.net/v2/en/sets',
      'https://api.tcgdex.net/v2/zh-tw/sets/sv01',
      'https://api.tcgdex.net/v2/en/sets/sv01',
      'https://api.tcgdex.net/v2/ja/series/sv',
      'https://api.tcgdex.net/v2/en/series/sv',
    ]))
  })

  it('uses matching English artwork when the Traditional Chinese set has no logo', async () => {
    const localized = [{ id: 'SV8a', name: '異度審判', cardCount: { total: 1, official: 1 }, serie: { id: 'SV' } }]
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.includes('/zh-tw/')
        ? localized
        : [{ ...localized[0], id: 'sv8a', logo: 'https://assets.tcgdex.net/en/sv/sv8a/logo.png' }],
    }) as Response)
    vi.stubGlobal('fetch', fetchMock)

    const sets = await listSets('zh-tw')

    expect(sets[0].name).toBe('異度審判')
    expect(sets[0].logo).toBe('https://assets.tcgdex.net/en/sv/sv8a/logo.png')
  })

  it('uses an exact-ID French logo when an English set has no native logo', async () => {
    const english = [{ id: 'sv8a', name: '30th Celebration', cardCount: { total: 1, official: 1 } }]
    const frenchLogo = 'https://assets.tcgdex.net/fr/sv/sv8a/logo.png'
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.includes('/en/')
        ? english
        : [{ id: 'sv8a', name: '30e Anniversaire', logo: frenchLogo }],
    }) as Response)
    vi.stubGlobal('fetch', fetchMock)

    const sets = await listSets('en')

    expect(sets[0].logo).toBe(frenchLogo)
  })

  it('uses an exact-ID French logo when the Asian and English catalogs have none', async () => {
    const local = [{ id: 'SV8a', name: '異度審判', cardCount: { total: 1, official: 1 }, serie: { id: 'SV' } }]
    const frenchLogo = 'https://assets.tcgdex.net/fr/sv/sv8a/logo.png'
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.includes('/zh-tw/')
        ? local
        : url.includes('/en/')
          ? [{ id: 'other-set', name: 'Different expansion', logo: 'https://assets.tcgdex.net/en/sv/other-set/logo.png' }]
          : [{ id: 'sv8a', name: 'Autre traduction', logo: frenchLogo }],
    }) as Response)
    vi.stubGlobal('fetch', fetchMock)

    const sets = await listSets('zh-tw')

    expect(sets[0].logo).toBe(frenchLogo)
  })

  it('matches Japanese series logos when TCGdex capitalizes the localized ID', async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.includes('/ja/')
        ? [{ id: 'SV', name: 'スカーレット&バイオレット' }]
        : [{ id: 'sv', name: 'Scarlet & Violet', logo: 'https://assets.tcgdex.net/en/sv/sv01/logo.png' }],
    }) as Response)
    vi.stubGlobal('fetch', fetchMock)

    const series = await listSeries('ja')

    expect(series[0].name).toBe('スカーレット&バイオレット')
    expect(series[0].logo).toBe('https://assets.tcgdex.net/en/sv/sv01/logo.png')
  })


  it.each([['ja', 'SV5a'], ['zh-tw', 'SV8a']] as const)('uses a lowercase English set logo fallback for %s set IDs', async (language, id) => {
    const logo = `https://assets.tcgdex.net/en/sv/${id.toLowerCase()}/logo.png`
    const localized = { id, name: 'Extension localisée', cardCount: { total: 0, official: 0 }, serie: { id: 'SV', name: 'Série' }, cards: [] }
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.includes('/en/')
        ? { ...localized, id: id.toLowerCase(), logo }
        : localized,
    }) as Response)
    vi.stubGlobal('fetch', fetchMock)

    const set = await getSet(id, language)

    expect(set.logo).toBe(logo)
    expect(fetchMock.mock.calls.map(([url]) => url)).toContain(`https://api.tcgdex.net/v2/en/sets/${id.toLowerCase()}`)
  })

  it('maps Asian Sword & Shield series IDs to the international logo', async () => {
    const logo = 'https://assets.tcgdex.net/en/swsh/swsh1/logo.png'
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.includes('/ja/')
        ? [{ id: 'S', name: '剣と盾' }]
        : [{ id: 'swsh', name: 'Sword & Shield', logo }],
    }) as Response)
    vi.stubGlobal('fetch', fetchMock)

    const series = await listSeries('ja')

    expect(series[0].logo).toBe(logo)
  })


  it('uses exact-ID French artwork when an Asian family still has missing logos', async () => {
    const familyLogo = 'https://assets.tcgdex.net/fr/sv/logo.png'
    const setLogo = 'https://assets.tcgdex.net/fr/sv/sv8a/logo.png'
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.includes('/ja/')
        ? { id: 'SV', name: 'スカーレット&バイオレット', sets: [{ id: 'SV8a', name: '拡張パック', cardCount: { total: 1, official: 1 } }] }
        : url.includes('/en/')
          ? { id: 'sv', name: 'Scarlet & Violet', sets: [{ id: 'other', name: 'Different expansion', cardCount: { total: 1, official: 1 }, logo: 'https://assets.tcgdex.net/en/sv/other/logo.png' }] }
          : { id: 'sv', name: 'Écarlate et Violet', logo: familyLogo, sets: [{ id: 'sv8a', name: 'Extension', cardCount: { total: 1, official: 1 }, logo: setLogo }] },
    }) as Response)
    vi.stubGlobal('fetch', fetchMock)

    const series = await getSeries('SV', 'ja')

    expect(series.logo).toBe(familyLogo)
    expect(series.sets[0].logo).toBe(setLogo)
  })

  it('uses only a family logo for a Japanese series and does not assign an unrelated English set logo', async () => {
    const familyLogo = 'https://assets.tcgdex.net/en/base/logo.png'
    const setLogo = 'https://assets.tcgdex.net/en/base/base1/logo.png'
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.includes('/ja/')
        ? { id: 'PMCG', name: 'ポケットモンスターカードゲーム', sets: [{ id: 'PMCG1', name: '拡張パック', cardCount: { total: 1, official: 1 } }] }
        : { id: 'base', name: 'Base', logo: familyLogo, sets: [{ id: 'base1', name: 'Base Set', cardCount: { total: 1, official: 1 }, logo: setLogo }] },
    }) as Response)
    vi.stubGlobal('fetch', fetchMock)

    const series = await getSeries('PMCG', 'ja')

    expect(fetchMock.mock.calls.map(([url]) => url)).toContain('https://api.tcgdex.net/v2/en/series/base')
    expect(series.logo).toBe(familyLogo)
    expect(series.sets[0].logo).toBeUndefined()
  })
  it('does not promote a set logo to a family or another localized set', async () => {
    const logo = 'https://assets.tcgdex.net/en/swsh/swsh1/logo.png'
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.includes('/zh-tw/')
        ? { id: 'S', name: '劍＆盾', sets: [{ id: 'S1H', name: '無極力量', cardCount: { total: 1, official: 1 } }] }
        : { id: 'swsh', name: 'Sword & Shield', sets: [{ id: 'swsh1', name: 'Darkness Ablaze', cardCount: { total: 1, official: 1 }, logo }] },
    }) as Response)
    vi.stubGlobal('fetch', fetchMock)

    const series = await getSeries('S', 'zh-tw')

    expect(fetchMock.mock.calls.map(([url]) => url)).toContain('https://api.tcgdex.net/v2/en/series/swsh')
    expect(series.logo).toBeUndefined()
    expect(series.sets[0].logo).toBeUndefined()
  })

  it('does not match different localized set logos by guessed series prefixes', async () => {
    const localized = [{ id: 'M3', name: 'ムニキスゼロ', serie: { id: 'me' }, cardCount: { total: 1, official: 1 } }]
    const english = [{ id: 'me3', name: 'Mega Evolution 3', logo: 'https://assets.tcgdex.net/en/me/me3/logo.png', cardCount: { total: 1, official: 1 } }]
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.includes('/ja/') ? localized : english,
    }) as Response)
    vi.stubGlobal('fetch', fetchMock)

    const sets = await listSets('ja')

    expect(sets[0].id).toBe('M3')
    expect(sets[0].logo).toBeUndefined()
  })

  it('ignores English set metadata that returns a different set ID', async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.includes('/ja/')
        ? { id: 'M3', name: 'ムニキスゼロ', cardCount: { total: 1, official: 1 }, cards: [] }
        : { id: 'me3', name: 'Different expansion', logo: 'https://assets.tcgdex.net/en/me/me3/logo.png', cardCount: { total: 1, official: 1 }, cards: [] },
    }) as Response)
    vi.stubGlobal('fetch', fetchMock)

    const set = await getSet('M3', 'ja')

    expect(set.logo).toBeUndefined()
  })

  it('ignores an English family response whose ID differs from the explicit series mapping', async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.includes('/ja/')
        ? { id: 'S', name: '剣と盾', sets: [] }
        : { id: 'swsh2', name: 'Different series', logo: 'https://assets.tcgdex.net/en/swsh/swsh2/logo.png', sets: [] },
    }) as Response)
    vi.stubGlobal('fetch', fetchMock)

    const series = await getSeries('S', 'ja')

    expect(series.logo).toBeUndefined()
  })

  it('removes only the known empty CS catalogue records from Japanese and Traditional Chinese', () => {
    const summaries = [{id:'CS2a',name:'entrée fantôme'}, {id:'SV8a',name:'extension valide'}]
    expect(filterLocalizedSets(summaries, 'ja').map(set => set.id)).toEqual(['SV8a'])
    expect(filterLocalizedSets(summaries, 'zh-tw').map(set => set.id)).toEqual(['SV8a'])
    expect(filterLocalizedSets(summaries, 'fr')).toEqual(summaries)
  })

  it('keeps the current localized set, favors owned cards, then selects a valid localized default', () => {
    const summaries = [{id:'SV8a',name:'A',cardCount:{total:1,official:1}}, {id:'SV9',name:'B',cardCount:{total:1,official:1}}]
    expect(chooseAvailableSetId(summaries, 'SV8a')).toBe('SV8a')
    expect(chooseAvailableSetId(summaries, 'missing', new Map([['SV8a',1],['SV9',3]]))).toBe('SV9')
    expect(chooseAvailableSetId(summaries, 'missing')).toBe('SV8a')
    expect(chooseAvailableSetId([], 'missing')).toBe('')
  })

  it('filters ghost entries from localized set and series responses', async () => {
    const summaries = [{id:'CS2a',name:'entrée vide',cardCount:{total:101,official:101}}, {id:'SV8a',name:'Terastal Fest',cardCount:{total:187,official:187}}]
    const fetchMock = vi.fn(async (url: string) => ({ok:true,json:async()=>url.endsWith('/sets')?summaries:{id:'SV',name:'Série',sets:summaries}}) as Response)
    vi.stubGlobal('fetch', fetchMock)
    expect((await listSets('zh-tw')).map(set=>set.id)).toEqual(['SV8a'])
    expect((await getSeries('SV','ja')).sets.map(set=>set.id)).toEqual(['SV8a'])
  })

  it('uses the current family when a localized set has a different ID and falls back to a localized set otherwise', () => {
    const summaries = [
      {id:'M3',name:'ムニキスゼロ',serie:{id:'me'},cardCount:{total:117,official:80}},
      {id:'SV9',name:'バトルパートナーズ',serie:{id:'sv'},cardCount:{total:100,official:100}},
    ]
    expect(chooseAvailableSetId(summaries, 'M1S', new Map(), 'me')).toBe('M3')
    expect(chooseAvailableSetId(summaries, 'unknown', new Map(), 'missing-family')).toBe('M3')
  })


  it('rebuilds localized series from set summaries when the series index is unavailable', async () => {
    const summaries = [
      {id:'M3',name:'ムニキスゼロ',serie:{id:'me',name:'ポケモンカードゲーム MEGA'},cardCount:{total:117,official:80}},
      {id:'SV9',name:'バトルパートナーズ',serie:{id:'sv',name:'スカーレット&バイオレット'},cardCount:{total:100,official:100}},
    ]
    const fetchMock = vi.fn(async (url:string) => url.endsWith('/series')
      ? ({ok:false,status:503,json:async()=>({})} as Response)
      : ({ok:true,status:200,json:async()=>summaries} as Response))
    vi.stubGlobal('fetch',fetchMock)
    const {listSeries}=await import('./sets')
    expect((await listSeries('ja')).map(family=>[family.id,family.name])).toEqual([
      ['me','ポケモンカードゲーム MEGA'],['sv','スカーレット&バイオレット'],
    ])
  })

  it('turns a stalled catalogue request into a recoverable timeout error', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch',vi.fn((_url:string,{signal}:RequestInit)=>new Promise((_resolve,reject)=>{
      signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')))
    })))
    const request=listSets('ja')
    const rejected=expect(request).rejects.toThrow('met trop de temps')
    await vi.advanceTimersByTimeAsync(12_000)
    await rejected
    vi.useRealTimers()
  })

  it('rebuilds an Asian family from set summaries when the series detail endpoint returns 404', async () => {
    const summaries = [
      {id:'M3',name:'ムニキスゼロ',serie:{id:'me'},cardCount:{total:117,official:80}},
      {id:'SV9',name:'バトルパートナーズ',serie:{id:'sv'},cardCount:{total:100,official:100}},
    ]
    const fetchMock = vi.fn(async (url:string) => url.endsWith('/series/me')
      ? ({ok:false,status:404,json:async()=>({})} as Response)
      : ({ok:true,status:200,json:async()=>summaries} as Response))
    vi.stubGlobal('fetch',fetchMock)
    expect((await getSeries('me','ja')).sets.map(set=>set.id)).toEqual(['M3'])
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

  it('adds the two 30th anniversary jumbo promo visuals to the Jumbo catalog', async () => {
    const jumbo = { id: 'jumbo', name: 'Cartes Jumbo', cardCount: { total: 160, official: 160 }, cards: [] }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => jumbo }) as Response))

    const set = await getSet('jumbo', 'fr')

    expect(set.cards.map(card => [card.id, card.name, card.image])).toEqual([
      ['mep-099', 'Amphinobi-ex', 'https://assets.tcgdex.net/en/me/mep/099'],
      ['mep-100', 'Nymphali-ex', 'https://assets.tcgdex.net/en/me/mep/100'],
    ])
    expect(set.cardCount.total).toBe(160)
  })

  it('lists the announced Delta Reign expansion as upcoming until TCGdex adds it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] }) as Response))

    const sets = await listSets('fr')
    const delta = sets.find(set => set.id === 'me06')

    expect(delta).toMatchObject({ name: 'Méga-Évolution – Règne Delta', upcoming: true, releaseDate: '2026-11-06' })
    expect(delta?.cardCount).toEqual({ total: 135, official: 103 })
  })

  it('keeps the upcoming Delta Reign set selectable as a detail placeholder if TCGdex has no record yet', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) }) as Response))

    const set = await getSet('me06', 'fr')

    expect(set).toMatchObject({ id: 'me06', name: 'Méga-Évolution – Règne Delta', upcoming: true, releaseDate: '2026-11-06', cards: [] })
  })

  it('uses the Japanese Mew name for the Japanese anniversary cards', async () => {
    const baseSet = { id: 'M6a', name: '30th CELEBRATION', cardCount: { total: 165, official: 103 }, cards: [] }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => baseSet }) as Response))

    const set = await getSet('M6a', 'ja')

    expect(set.cards.map(card => card.name)).toEqual(['ミュウ', 'ミュウ', 'ミュウ'])
    expect(set.cardCount.total).toBe(168)
  })
})
