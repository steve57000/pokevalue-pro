import { describe, expect, it } from 'vitest'
import { emptyCollection, mergeCollections, printingKey, upsertEntry } from './collection'

const entry = { source:'tcgdex' as const,setId:'sv01',cardId:'sv01-1',language:'fr',variant:'normal',name:'Carte',setName:'Série',quantity:1,condition:'near-mint' as const,notes:'' }
describe('collection portfolio', () => {
  it('keeps provider, set, card, language and variant in the identity', () => expect(printingKey(entry)).toBe('tcgdex:sv01:sv01-1:fr:normal'))
  it('updates quantities without duplicating an impression', () => { const one=upsertEntry(emptyCollection(),entry); const two=upsertEntry(one,{...entry,quantity:3}); expect(two.entries).toHaveLength(1); expect(two.entries[0].quantity).toBe(3) })
  it('merges concurrent documents using the latest entry', () => { const a=upsertEntry(emptyCollection(),entry); const b={...a,entries:[{...a.entries[0],quantity:2,updatedAt:'9999-01-01T00:00:00.000Z'}]}; expect(mergeCollections(a,b).entries[0].quantity).toBe(2) })
})
