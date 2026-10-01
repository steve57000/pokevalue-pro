import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSet, getSeries, listSets } from './sets'

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
})
